import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';

describe('HrisService Unit & Engine Tests', () => {
  it('correctly calculates payroll run with PPh 21 TER, BPJS, and Flight Allowances', async () => {
    const { services } = await createSeededTestServices();
    const hris = services.hris;

    // Create a new draft run for month 8/2026
    const run = hris.createPayrollRun({
      periodMonth: 8,
      periodYear: 2026,
      notes: 'Test Payroll Calculation'
    });

    expect(run.status).toBe('CALCULATED');

    // Perform calculation
    const calculated = hris.calculatePayrollRun(run.id);
    expect(calculated.status).toBe('CALCULATED');
    expect(calculated.employeeCount).toBeGreaterThan(0);
    expect(calculated.totalGross).toBeGreaterThan(0);
    expect(calculated.totalDeductions).toBeGreaterThan(0);
    expect(calculated.totalNet).toBe(calculated.totalGross - calculated.totalDeductions);

    // List payslips
    const payslips = hris.listPayslips(run.id);
    expect(payslips.length).toBe(calculated.employeeCount);

    // Check Captain Budi Santoso (has flight allowance)
    const captainPayslip = payslips.find((p) => p.employeeName.includes('Budi Santoso'));
    expect(captainPayslip).toBeDefined();
    expect(captainPayslip!.basicSalary).toBeGreaterThan(0);
    expect(captainPayslip!.pph21Amount).toBeGreaterThanOrEqual(0);
    expect(captainPayslip!.bpjsKesEmployee).toBeGreaterThan(0);
    expect(captainPayslip!.bpjsTkEmployee).toBeGreaterThan(0);

    // Approve run
    const approved = hris.approvePayrollRun(run.id, 'emp-004');
    expect(approved.status).toBe('APPROVED');

    // Post journal to Finance
    const journalRes = hris.postPayrollJournal(run.id);
    expect(journalRes.success).toBe(true);
    expect(journalRes.journalId).toContain('jrn-pay-');

    const paidRun = hris.getPayrollRun(run.id);
    expect(paidRun.status).toBe('PAID');
  });

  it('correctly detects expiring pilot certifications', async () => {
    const { services } = await createSeededTestServices();
    const hris = services.hris;

    const alerts = hris.getCertificationAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const expiredOrExpiring = alerts.filter(
      (a) =>
        a.alertLevel === 'EXPIRED' ||
        a.alertLevel === 'CRITICAL_30' ||
        a.alertLevel === 'WARNING_60'
    );
    expect(expiredOrExpiring.length).toBeGreaterThan(0);
  });

  it('handles employee self-service login verification and PIN management', async () => {
    const { services } = await createSeededTestServices();
    const hris = services.hris;

    // Verify default seeded PIN 123456 for EMP-0001
    const session = hris.verifyEmployeeLogin('EMP-0001', '123456');
    expect(session.employeeCode).toBe('EMP-0001');
    expect(session.fullName).toBe('Captain Budi Santoso');

    // Set new PIN
    hris.setEmployeePin(session.employeeId, '654321');

    // Login with new PIN
    const newSession = hris.verifyEmployeeLogin('EMP-0001', '654321');
    expect(newSession.employeeId).toBe(session.employeeId);

    // Wrong PIN should throw
    expect(() => hris.verifyEmployeeLogin('EMP-0001', '000000')).toThrowError('Invalid PIN');
  });

  it('handles 3-step attendance check-in and check-out flow', async () => {
    const { services } = await createSeededTestServices();
    const hris = services.hris;

    const empId = 'emp-001';
    const checkIn = hris.checkIn(empId, { stationId: 'st-djj', note: 'Sentani Hub Duty' });
    expect(checkIn.employeeId).toBe(empId);
    expect(checkIn.stationCode).toBe('DJJ');
    expect(checkIn.checkIn).toBeDefined();

    // Check-out
    const checkOut = hris.checkOut(empId, { note: 'Shift Completed' });
    expect(checkOut.checkOut).toBeDefined();
  });

  it('handles leave request lifecycle: request, approve, and balance deduction', async () => {
    const { services } = await createSeededTestServices();
    const hris = services.hris;

    const empId = 'emp-001';
    const currentYear = new Date().getFullYear();
    const initialBalances = hris.getLeaveBalance(empId, currentYear);
    const annualInitial = initialBalances.find((b) => b.leaveCode === 'ANNUAL')!;

    const req = hris.createLeaveRequest({
      employeeId: empId,
      leaveTypeId: annualInitial.leaveTypeId,
      startDate: `${currentYear}-08-10`,
      endDate: `${currentYear}-08-12`,
      totalDays: 3,
      reason: 'Liburan Keluarga'
    });

    expect(req.status).toBe('PENDING');

    const approved = hris.approveLeaveRequest(req.id, 'emp-004');
    expect(approved.status).toBe('APPROVED');

    const updatedBalances = hris.getLeaveBalance(empId, currentYear);
    const annualUpdated = updatedBalances.find((b) => b.leaveCode === 'ANNUAL')!;
    expect(annualUpdated.usedDays).toBe(annualInitial.usedDays + 3);
  });
});
