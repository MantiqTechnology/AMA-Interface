import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  AllowanceRateInput,
  AllowanceRateUpdate,
  PayrollComponentInput,
  PayrollRunCreate,
  PayrollRunQuery
} from '../../../../shared/features/hris';
import { DomainError, notFound } from '../../../utils/errors';
import { calculatePph21Ter, generateNextNumber, now, num, str, type Row } from './types';

export class PayrollModule {
  constructor(public readonly sqlite: Database.Database) {}

  listPayrollComponents() {
    const rows = this.sqlite
      .prepare(
        'SELECT * FROM hris_payroll_components WHERE is_active = 1 ORDER BY component_type ASC, component_code ASC'
      )
      .all() as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      componentCode: String(r.component_code),
      componentName: String(r.component_name),
      componentType: String(r.component_type),
      isTaxable: Boolean(r.is_taxable),
      isBpjsCalculated: Boolean(r.is_bpjs_calculated),
      defaultAmount: num(r.default_amount)
    }));
  }

  createPayrollComponent(input: PayrollComponentInput & { isBpjsCalculated?: boolean }) {
    const timestamp = now();
    const id = `comp-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_payroll_components
         (id, component_code, component_name, component_type, is_taxable, is_bpjs_calculated, default_amount, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        input.componentCode,
        input.componentName,
        input.componentType,
        input.isTaxable ? 1 : 0,
        input.isBpjsCalculated ? 1 : 0,
        input.defaultAmount ?? 0,
        timestamp,
        timestamp
      );

    return this.listPayrollComponents().find((c) => c.id === id)!;
  }

  updatePayrollComponent(
    id: string,
    input: Partial<PayrollComponentInput> & { isBpjsCalculated?: boolean }
  ) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM hris_payroll_components WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Payroll Component', id);

    this.sqlite
      .prepare(
        `UPDATE hris_payroll_components SET
          component_code = COALESCE(?, component_code),
          component_name = COALESCE(?, component_name),
          component_type = COALESCE(?, component_type),
          is_taxable = COALESCE(?, is_taxable),
          is_bpjs_calculated = COALESCE(?, is_bpjs_calculated),
          default_amount = COALESCE(?, default_amount),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.componentCode ?? null,
        input.componentName ?? null,
        input.componentType ?? null,
        input.isTaxable !== undefined ? (input.isTaxable ? 1 : 0) : null,
        input.isBpjsCalculated !== undefined ? (input.isBpjsCalculated ? 1 : 0) : null,
        input.defaultAmount ?? null,
        timestamp,
        id
      );

    return this.listPayrollComponents().find((c) => c.id === id)!;
  }

  deletePayrollComponent(id: string) {
    this.sqlite.prepare('UPDATE hris_payroll_components SET is_active = 0 WHERE id = ?').run(id);
    return { success: true };
  }

  listAllowanceRates() {
    try {
      this.sqlite.exec('ALTER TABLE hris_allowance_rates ADD COLUMN is_active INTEGER DEFAULT 1');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_allowance_rates ADD COLUMN aircraft_type TEXT');
    } catch {}
    try {
      this.sqlite.exec(
        'ALTER TABLE hris_allowance_rates ADD COLUMN base_monthly_allowance INTEGER DEFAULT 0'
      );
    } catch {}

    const rows = this.sqlite
      .prepare('SELECT * FROM hris_allowance_rates ORDER BY position_title ASC')
      .all() as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      positionTitle: String(r.position_title),
      aircraftType: str(r.aircraft_type ?? r.grade),
      ratePerHour: num(r.rate_per_hour),
      baseMonthlyAllowance: num(r.base_monthly_allowance ?? r.rate_per_month)
    }));
  }

  createAllowanceRate(
    input: AllowanceRateInput & { aircraftType?: string; baseMonthlyAllowance?: number }
  ) {
    const timestamp = now();
    const id = `rate-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_allowance_rates
         (id, component_id, position_title, aircraft_type, rate_per_hour, base_monthly_allowance, effective_date, created_at, updated_at)
         VALUES (?, 'comp-flight', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.positionTitle,
        input.aircraftType ?? null,
        input.ratePerHour ?? 0,
        input.baseMonthlyAllowance ?? 0,
        timestamp.slice(0, 10),
        timestamp,
        timestamp
      );

    return this.listAllowanceRates().find((r) => r.id === id)!;
  }

  updateAllowanceRate(
    id: string,
    input: AllowanceRateUpdate & { aircraftType?: string; baseMonthlyAllowance?: number }
  ) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM hris_allowance_rates WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Allowance Rate', id);

    this.sqlite
      .prepare(
        `UPDATE hris_allowance_rates SET
          position_title = COALESCE(?, position_title),
          aircraft_type = COALESCE(?, aircraft_type),
          rate_per_hour = COALESCE(?, rate_per_hour),
          base_monthly_allowance = COALESCE(?, base_monthly_allowance),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.positionTitle ?? null,
        input.aircraftType ?? null,
        input.ratePerHour ?? null,
        input.baseMonthlyAllowance ?? null,
        timestamp,
        id
      );

    return this.listAllowanceRates().find((r) => r.id === id)!;
  }

  deleteAllowanceRate(id: string) {
    this.sqlite.prepare('UPDATE hris_allowance_rates SET is_active = 0 WHERE id = ?').run(id);
    return { success: true };
  }

  listPayrollRuns(query?: PayrollRunQuery) {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query?.year) {
      where.push('r.period_year = ?');
      params.push(query.year);
    }
    if (query?.status) {
      where.push('r.status = ?');
      params.push(query.status);
    }
    if (query?.runType) {
      where.push('r.run_type = ?');
      params.push(query.runType);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT r.*, app.full_name approved_by_name
         FROM hris_payroll_runs r
         LEFT JOIN employees app ON app.id = r.approved_by
         WHERE ${where.join(' AND ')}
         ORDER BY r.period_year DESC, r.period_month DESC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      runNumber: String(r.run_number),
      periodMonth: num(r.period_month),
      periodYear: num(r.period_year),
      runType: String(r.run_type ?? 'MONTHLY'),
      status: String(r.status),
      employeeCount: num(r.employee_count),
      totalGross: num(r.total_gross),
      totalDeductions: num(r.total_deductions),
      totalNet: num(r.total_net),
      journalId: str(r.journal_id),
      approvedByName: str(r.approved_by_name),
      approvedAt: str(r.approved_at),
      createdAt: String(r.created_at)
    }));
  }

  getPayrollRun(id: string) {
    const run = this.listPayrollRuns().find((r) => r.id === id);
    if (!run) throw notFound('Payroll Run', id);
    return run;
  }

  createPayrollRun(
    input: Partial<PayrollRunCreate> & {
      periodMonth: number;
      periodYear: number;
      runType?: string;
      notes?: string | null;
      employeeIds?: string[];
      saveAsDraft?: boolean;
      status?: string;
    },
    createdBy: string = 'usr-admin'
  ) {
    try {
      this.sqlite.exec('ALTER TABLE hris_payroll_runs ADD COLUMN created_by TEXT');
    } catch {}
    const timestamp = now();
    const runType = input.runType ?? 'MONTHLY';

    const existing = this.sqlite
      .prepare(
        "SELECT id FROM hris_payroll_runs WHERE period_month = ? AND period_year = ? AND run_type = ? AND status != 'CANCELLED'"
      )
      .get(input.periodMonth, input.periodYear, runType) as Row | undefined;

    if (existing) {
      throw new DomainError(
        'DUPLICATE_PAYROLL_RUN',
        `Payroll run for ${runType} ${input.periodMonth}/${input.periodYear} already exists.`,
        400
      );
    }

    const runNum = generateNextNumber(this.sqlite, 'PAYROLL_RUN', 'PAY');
    const id = `pay-${nanoid(10)}`;

    const tx = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO hris_payroll_runs
           (id, run_number, period_month, period_year, run_date, run_type, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`
        )
        .run(
          id,
          runNum,
          input.periodMonth,
          input.periodYear,
          timestamp.slice(0, 10),
          runType,
          createdBy,
          timestamp,
          timestamp
        );

      let employees: Row[];
      if (input.employeeIds && input.employeeIds.length > 0) {
        const placeholders = input.employeeIds.map(() => '?').join(',');
        employees = this.sqlite
          .prepare(
            `SELECT * FROM employees WHERE id IN (${placeholders}) AND employment_status = 'ACTIVE'`
          )
          .all(...input.employeeIds) as Row[];
      } else {
        employees = this.sqlite
          .prepare("SELECT * FROM employees WHERE employment_status = 'ACTIVE'")
          .all() as Row[];
      }

      let grandGross = 0;
      let grandDeductions = 0;
      let grandNet = 0;

      const allowanceRates = this.listAllowanceRates();

      for (const emp of employees) {
        const res = this.generatePayslipForEmployee(
          id,
          emp,
          input.periodMonth,
          input.periodYear,
          runType,
          allowanceRates,
          timestamp
        );
        grandGross += res.grossSalary;
        grandDeductions += res.totalDeductions;
        grandNet += res.netSalary;
      }

      const targetStatus = input.saveAsDraft || input.status === 'DRAFT' ? 'DRAFT' : 'CALCULATED';
      this.sqlite
        .prepare(
          `UPDATE hris_payroll_runs SET
            status = ?, total_gross = ?, total_deductions = ?, total_net = ?,
            employee_count = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(targetStatus, grandGross, grandDeductions, grandNet, employees.length, timestamp, id);
    });

    tx.immediate();
    return this.getPayrollRun(id);
  }

  deletePayrollRun(id: string) {
    const existing = this.sqlite
      .prepare('SELECT id, status FROM hris_payroll_runs WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Payroll Run', id);
    if (String(existing.status) !== 'DRAFT' && String(existing.status) !== 'CALCULATED') {
      throw new DomainError(
        'PAYROLL_RUN_NOT_EDITABLE',
        'Hanya draf atau status kalkulasi payroll yang dapat dihapus.',
        400
      );
    }

    const tx = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          'DELETE FROM hris_payslip_lines WHERE payslip_id IN (SELECT id FROM hris_payslips WHERE payroll_run_id = ?)'
        )
        .run(id);
      this.sqlite.prepare('DELETE FROM hris_payslips WHERE payroll_run_id = ?').run(id);
      try {
        this.sqlite.prepare('DELETE FROM hris_payroll_items WHERE payroll_run_id = ?').run(id);
      } catch {}
      this.sqlite.prepare('DELETE FROM hris_payroll_runs WHERE id = ?').run(id);
    });

    tx.immediate();
    return { success: true };
  }

  removeEmployeeFromPayrollRun(runId: string, employeeId: string) {
    const run = this.getPayrollRun(runId);
    if (run.status !== 'DRAFT' && run.status !== 'CALCULATED') {
      throw new DomainError(
        'PAYROLL_RUN_NOT_EDITABLE',
        'Hanya draf atau status kalkulasi payroll yang dapat diubah.',
        400
      );
    }
    const timestamp = now();
    const tx = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          'DELETE FROM hris_payslip_lines WHERE payslip_id IN (SELECT id FROM hris_payslips WHERE payroll_run_id = ? AND employee_id = ?)'
        )
        .run(runId, employeeId);
      this.sqlite
        .prepare('DELETE FROM hris_payslips WHERE payroll_run_id = ? AND employee_id = ?')
        .run(runId, employeeId);

      const stats = this.sqlite
        .prepare(
          `SELECT COUNT(*) emp_count, COALESCE(SUM(total_earnings), 0) gross, COALESCE(SUM(total_deductions), 0) ded, COALESCE(SUM(net_salary), 0) net
           FROM hris_payslips WHERE payroll_run_id = ?`
        )
        .get(runId) as Row;

      this.sqlite
        .prepare(
          `UPDATE hris_payroll_runs SET employee_count = ?, total_gross = ?, total_deductions = ?, total_net = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          num(stats.emp_count),
          num(stats.gross),
          num(stats.ded),
          num(stats.net),
          timestamp,
          runId
        );
    });

    tx.immediate();
    return this.getPayrollRun(runId);
  }

  addEmployeesToPayrollRun(runId: string, employeeIds: string[]) {
    const runRow = this.sqlite
      .prepare('SELECT * FROM hris_payroll_runs WHERE id = ?')
      .get(runId) as Row | undefined;

    if (!runRow) throw notFound('Payroll Run', runId);

    const status = String(runRow.status);
    if (status !== 'DRAFT' && status !== 'CALCULATED') {
      throw new DomainError(
        'PAYROLL_RUN_NOT_EDITABLE',
        'Hanya draf atau status kalkulasi payroll yang dapat diubah.',
        400
      );
    }

    const timestamp = now();
    const periodMonth = num(runRow.period_month);
    const periodYear = num(runRow.period_year);
    const runType = String(runRow.run_type ?? 'MONTHLY');
    const allowanceRates = this.listAllowanceRates();

    const tx = this.sqlite.transaction(() => {
      for (const empId of employeeIds) {
        const existing = this.sqlite
          .prepare('SELECT id FROM hris_payslips WHERE payroll_run_id = ? AND employee_id = ?')
          .get(runId, empId);

        if (!existing) {
          const emp = this.sqlite.prepare('SELECT * FROM employees WHERE id = ?').get(empId) as
            Row | undefined;
          if (emp) {
            this.generatePayslipForEmployee(
              runId,
              emp,
              periodMonth,
              periodYear,
              runType,
              allowanceRates,
              timestamp
            );
          }
        }
      }

      const stats = this.sqlite
        .prepare(
          `SELECT COUNT(*) emp_count, COALESCE(SUM(total_earnings), 0) gross, COALESCE(SUM(total_deductions), 0) ded, COALESCE(SUM(net_salary), 0) net
           FROM hris_payslips WHERE payroll_run_id = ?`
        )
        .get(runId) as Row;

      this.sqlite
        .prepare(
          `UPDATE hris_payroll_runs SET employee_count = ?, total_gross = ?, total_deductions = ?, total_net = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          num(stats.emp_count),
          num(stats.gross),
          num(stats.ded),
          num(stats.net),
          timestamp,
          runId
        );
    });

    tx.immediate();
    return this.getPayrollRun(runId);
  }

  private generatePayslipForEmployee(
    runId: string,
    emp: Row,
    periodMonth: number,
    periodYear: number,
    runType: string,
    allowanceRates: Array<{
      positionTitle: string;
      baseMonthlyAllowance: number;
      ratePerHour: number;
    }>,
    timestamp: string
  ) {
    const empId = String(emp.id);
    const customBasic =
      emp.basic_salary !== null && emp.basic_salary !== undefined ? num(emp.basic_salary) : null;
    const customPosAllow =
      emp.position_allowance !== null && emp.position_allowance !== undefined
        ? num(emp.position_allowance)
        : null;
    const customFlightRate =
      emp.flight_rate_per_hour !== null && emp.flight_rate_per_hour !== undefined
        ? num(emp.flight_rate_per_hour)
        : null;

    const posTitle = String(emp.position_title ?? '');
    const ptkp = String(emp.ptkp_status ?? 'TK/0');

    let basicSalary = 7500000;
    let ratePerHour = 150000;

    const matchedRate = allowanceRates.find((r) =>
      posTitle.toLowerCase().includes(r.positionTitle.toLowerCase())
    );
    if (matchedRate) {
      basicSalary = matchedRate.baseMonthlyAllowance || basicSalary;
      ratePerHour = matchedRate.ratePerHour || ratePerHour;
    }

    if (customBasic !== null) basicSalary = customBasic;
    if (customPosAllow !== null) basicSalary += customPosAllow;
    if (customFlightRate !== null) ratePerHour = customFlightRate;

    let flightAllowance = 0;
    let overtimeAmount = 0;
    const isThr = runType === 'THR';
    const thrAmount = basicSalary;
    const periodPrefix = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;

    if (!isThr) {
      try {
        const flightHoursRow = this.sqlite
          .prepare(
            `SELECT SUM(COALESCE(fo.block_time_minutes, fo.total_flight_time_minutes, 0)) total_mins
             FROM flight_operations fo
             JOIN flight_crew_assignments fca ON fca.flight_operation_id = fo.id
             WHERE fca.employee_id = ? AND strftime('%Y-%m', fo.flight_date) = ? AND fo.status = 'COMPLETED'`
          )
          .get(empId, periodPrefix) as Row | undefined;

        const totalMins = flightHoursRow ? num(flightHoursRow.total_mins) : 0;
        let blockHours = Math.round((totalMins / 60) * 10) / 10;
        if (
          blockHours === 0 &&
          (posTitle.toLowerCase().includes('captain') ||
            posTitle.toLowerCase().includes('first officer'))
        ) {
          blockHours = 45;
        }

        flightAllowance = Math.round(blockHours * ratePerHour);
      } catch {
        if (
          posTitle.toLowerCase().includes('captain') ||
          posTitle.toLowerCase().includes('first officer')
        ) {
          flightAllowance = Math.round(45 * ratePerHour);
        }
      }

      try {
        const overtimeRows = this.sqlite
          .prepare(
            `SELECT SUM(total_hours) hours FROM hris_overtime_requests
             WHERE employee_id = ? AND status = 'APPROVED' AND strftime('%Y-%m', overtime_date) = ?`
          )
          .get(empId, periodPrefix) as Row | undefined;

        const overtimeHours = overtimeRows ? num(overtimeRows.hours) : 0;
        const overtimeRatePerHour = Math.round(basicSalary / 173);
        overtimeAmount = Math.round(overtimeHours * overtimeRatePerHour * 1.5);
      } catch {}
    }

    const grossSalary = isThr ? thrAmount : basicSalary + flightAllowance + overtimeAmount;

    const bpjsKesEmployee = isThr ? 0 : Math.round(basicSalary * 0.01);
    const bpjsKesCompany = isThr ? 0 : Math.round(basicSalary * 0.04);
    const bpjsTkEmployee = isThr ? 0 : Math.round(basicSalary * 0.03);
    const bpjsTkCompany = isThr ? 0 : Math.round(basicSalary * 0.0624);

    const pph21Amount = calculatePph21Ter(grossSalary, ptkp);

    const totalDeductions = bpjsKesEmployee + bpjsTkEmployee + pph21Amount;
    const netSalary = grossSalary - totalDeductions;

    const payslipId = `ps-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO hris_payslips
         (id, payroll_run_id, employee_id, basic_salary, total_earnings, total_deductions, net_salary,
          pph21_amount, bpjs_kes_employee, bpjs_kes_company, bpjs_tk_employee, bpjs_tk_company,
          flight_allowance, overtime_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payslipId,
        runId,
        empId,
        isThr ? 0 : basicSalary,
        grossSalary,
        totalDeductions,
        netSalary,
        pph21Amount,
        bpjsKesEmployee,
        bpjsKesCompany,
        bpjsTkEmployee,
        bpjsTkCompany,
        flightAllowance,
        overtimeAmount,
        timestamp
      );

    if (isThr) {
      this.insertPayslipLine(payslipId, 'THR', 'Tunjangan Hari Raya (THR)', 'EARNING', thrAmount);
    } else {
      this.insertPayslipLine(payslipId, 'BASIC_SALARY', 'Gaji Pokok', 'EARNING', basicSalary);
      if (flightAllowance > 0)
        this.insertPayslipLine(
          payslipId,
          'FLIGHT_ALLOWANCE',
          'Tunjangan Terbang',
          'EARNING',
          flightAllowance
        );
      if (overtimeAmount > 0)
        this.insertPayslipLine(payslipId, 'OVERTIME', 'Lembur', 'EARNING', overtimeAmount);
    }

    if (pph21Amount > 0)
      this.insertPayslipLine(payslipId, 'PPH21', 'PPh 21 (TER 2024)', 'TAX', pph21Amount);
    if (bpjsKesEmployee > 0)
      this.insertPayslipLine(
        payslipId,
        'BPJS_KES',
        'BPJS Kesehatan Employee',
        'DEDUCTION',
        bpjsKesEmployee
      );
    if (bpjsTkEmployee > 0)
      this.insertPayslipLine(payslipId, 'BPJS_TK', 'BPJS TK Employee', 'DEDUCTION', bpjsTkEmployee);

    return { grossSalary, totalDeductions, netSalary };
  }

  private insertPayslipLine(
    payslipId: string,
    code: string,
    name: string,
    type: string,
    amount: number
  ) {
    const lineId = `line-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO hris_payslip_lines (id, payslip_id, component_code, component_name, component_type, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(lineId, payslipId, code, name, type, amount, now());
  }

  adjustPayslipComponent(
    payslipId: string,
    input: { componentCode: string; amount: number; notes?: string }
  ) {
    const payslip = this.sqlite
      .prepare('SELECT * FROM hris_payslips WHERE id = ?')
      .get(payslipId) as Row | undefined;

    if (!payslip) throw notFound('Payslip', payslipId);

    const empRow = this.sqlite
      .prepare('SELECT ptkp_status FROM employees WHERE id = ?')
      .get(payslip.employee_id) as Row | undefined;
    const ptkp = str(empRow?.ptkp_status) || 'TK/0';

    this.sqlite.transaction(() => {
      const existingLine = this.sqlite
        .prepare('SELECT * FROM hris_payslip_lines WHERE payslip_id = ? AND component_code = ?')
        .get(payslipId, input.componentCode) as Row | undefined;

      if (existingLine) {
        this.sqlite
          .prepare('UPDATE hris_payslip_lines SET amount = ? WHERE id = ?')
          .run(input.amount, existingLine.id);
      } else {
        const comp = this.listPayrollComponents().find(
          (c) => c.componentCode === input.componentCode
        );
        this.insertPayslipLine(
          payslipId,
          input.componentCode,
          comp ? comp.componentName : input.componentCode,
          comp ? comp.componentType : 'EARNING',
          input.amount
        );
      }

      let basicSalary = num(payslip.basic_salary);
      let flightAllowance = num(payslip.flight_allowance);
      let overtimeAmount = num(payslip.overtime_amount);

      if (input.componentCode === 'BASIC_SALARY') basicSalary = input.amount;
      if (input.componentCode === 'FLIGHT_ALLOWANCE') flightAllowance = input.amount;
      if (input.componentCode === 'OVERTIME') overtimeAmount = input.amount;

      const earningsSum = num(
        (
          this.sqlite
            .prepare(
              "SELECT COALESCE(SUM(amount), 0) total FROM hris_payslip_lines WHERE payslip_id = ? AND component_type = 'EARNING'"
            )
            .get(payslipId) as Row
        ).total
      );

      const totalEarnings =
        earningsSum > 0 ? earningsSum : basicSalary + flightAllowance + overtimeAmount;

      const pph21Amount = calculatePph21Ter(totalEarnings, ptkp);

      this.sqlite
        .prepare(
          "UPDATE hris_payslip_lines SET amount = ? WHERE payslip_id = ? AND component_code = 'PPH21'"
        )
        .run(pph21Amount, payslipId);

      const bpjsKes = num(payslip.bpjs_kes_employee);
      const bpjsTk = num(payslip.bpjs_tk_employee);
      const totalDeductions = bpjsKes + bpjsTk + pph21Amount;
      const netSalary = totalEarnings - totalDeductions;

      this.sqlite
        .prepare(
          `UPDATE hris_payslips SET
            basic_salary = ?, flight_allowance = ?, overtime_amount = ?,
            total_earnings = ?, pph21_amount = ?, total_deductions = ?, net_salary = ?
           WHERE id = ?`
        )
        .run(
          basicSalary,
          flightAllowance,
          overtimeAmount,
          totalEarnings,
          pph21Amount,
          totalDeductions,
          netSalary,
          payslipId
        );

      const runId = String(payslip.payroll_run_id);
      const stats = this.sqlite
        .prepare(
          `SELECT COUNT(*) emp_count, COALESCE(SUM(total_earnings), 0) gross, COALESCE(SUM(total_deductions), 0) ded, COALESCE(SUM(net_salary), 0) net
           FROM hris_payslips WHERE payroll_run_id = ?`
        )
        .get(runId) as Row;

      this.sqlite
        .prepare(
          `UPDATE hris_payroll_runs SET total_gross = ?, total_deductions = ?, total_net = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(num(stats.gross), num(stats.ded), num(stats.net), now(), runId);
    })();

    return this.listPayslips(String(payslip.payroll_run_id)).find((p) => p.id === payslipId)!;
  }

  approvePayrollRun(id: string, approverId: string) {
    const run = this.getPayrollRun(id);
    if (run.status !== 'CALCULATED' && run.status !== 'DRAFT') {
      throw new DomainError(
        'INVALID_STATE',
        `Payroll run must be DRAFT or CALCULATED before approval (current: ${run.status}).`,
        400
      );
    }

    const timestamp = now();
    this.sqlite
      .prepare(
        "UPDATE hris_payroll_runs SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
      )
      .run(approverId, timestamp, timestamp, id);

    return this.getPayrollRun(id);
  }

  listPayslips(runId: string) {
    const rows = this.sqlite
      .prepare(
        `SELECT p.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name, e.bank_name, e.bank_account_number
         FROM hris_payslips p
         JOIN employees e ON e.id = p.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE p.payroll_run_id = ?
         ORDER BY e.full_name ASC`
      )
      .all(runId) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      payrollRunId: String(r.payroll_run_id),
      employeeId: String(r.employee_id),
      employeeCode: String(r.employee_code),
      employeeName: String(r.employee_name),
      positionTitle: String(r.position_title),
      departmentName: str(r.department_name),
      bankName: str(r.bank_name),
      bankAccountNumber: str(r.bank_account_number),
      basicSalary: num(r.basic_salary),
      flightAllowance: num(r.flight_allowance),
      overtimeAmount: num(r.overtime_amount),
      totalEarnings: num(r.total_earnings),
      bpjsKesEmployee: num(r.bpjs_kes_employee),
      bpjsTkEmployee: num(r.bpjs_tk_employee),
      pph21Amount: num(r.pph21_amount),
      totalDeductions: num(r.total_deductions),
      netSalary: num(r.net_salary),
      createdAt: String(r.created_at)
    }));
  }

  getPayslip(payslipId: string) {
    const row = this.sqlite
      .prepare(
        `SELECT p.*, e.employee_code, e.full_name employee_name, e.position_title, e.tax_id_number, e.ptkp_status,
                d.department_name, e.bank_name, e.bank_account_number, e.bank_account_name,
                r.period_month, r.period_year, r.run_number
         FROM hris_payslips p
         JOIN employees e ON e.id = p.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         JOIN hris_payroll_runs r ON r.id = p.payroll_run_id
         WHERE p.id = ? OR (p.employee_id = ? AND r.id = ?)`
      )
      .get(payslipId, payslipId, payslipId) as Row | undefined;

    if (!row) throw notFound('Payslip', payslipId);

    return {
      id: String(row.id),
      payrollRunId: String(row.payroll_run_id),
      runNumber: String(row.run_number),
      periodMonth: num(row.period_month),
      periodYear: num(row.period_year),
      employeeId: String(row.employee_id),
      employeeCode: String(row.employee_code),
      employeeName: String(row.employee_name),
      positionTitle: String(row.position_title),
      departmentName: str(row.department_name),
      taxIdNumber: str(row.tax_id_number),
      ptkpStatus: str(row.ptkp_status),
      bankName: str(row.bank_name),
      bankAccountNumber: str(row.bank_account_number),
      bankAccountName: str(row.bank_account_name),
      basicSalary: num(row.basic_salary),
      flightAllowance: num(row.flight_allowance),
      overtimeAmount: num(row.overtime_amount),
      totalEarnings: num(row.total_earnings),
      bpjsKesEmployee: num(row.bpjs_kes_employee),
      bpjsKesCompany: num(row.bpjs_kes_company),
      bpjsTkEmployee: num(row.bpjs_tk_employee),
      bpjsTkCompany: num(row.bpjs_tk_company),
      pph21Amount: num(row.pph21_amount),
      totalDeductions: num(row.total_deductions),
      netSalary: num(row.net_salary),
      createdAt: String(row.created_at)
    };
  }

  postPayrollJournal(runId: string) {
    const run = this.getPayrollRun(runId);
    if (run.status !== 'APPROVED') {
      throw new DomainError(
        'INVALID_STATE',
        'Payroll run must be APPROVED before posting to Finance.',
        400
      );
    }
    if (run.journalId) {
      return { success: true, journalId: run.journalId, alreadyPosted: true };
    }

    const timestamp = now();
    const journalId = `jrn-pay-${nanoid(8)}`;

    const tx = this.sqlite.transaction(() => {
      const tableInfo = this.sqlite.prepare("PRAGMA table_info('journal_entries')").all() as Array<{
        name: string;
      }>;
      if (tableInfo.length > 0) {
        const colNames = tableInfo.map((c) => c.name);
        if (colNames.includes('journal_date')) {
          this.sqlite
            .prepare(
              `INSERT INTO journal_entries
               (id, journal_number, journal_date, description, total_debit, total_credit, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'POSTED', ?, ?)`
            )
            .run(
              journalId,
              `JRN-PAY-${run.periodYear}${String(run.periodMonth).padStart(2, '0')}`,
              timestamp.slice(0, 10),
              `Payroll Expense Period ${run.periodMonth}/${run.periodYear}`,
              run.totalGross,
              run.totalGross,
              timestamp,
              timestamp
            );
        } else if (colNames.includes('transaction_date')) {
          const actEventId = `evt-${journalId}`;
          const periodId = `period-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`;

          this.sqlite
            .prepare(
              "INSERT OR IGNORE INTO accounting_periods (id, period_code, period_name, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', '2026-12-31', 'OPEN', ?, ?)"
            )
            .run(periodId, periodId, `Period ${periodId}`, timestamp, timestamp);
          this.sqlite
            .prepare(
              `INSERT OR IGNORE INTO accounting_events
               (id, event_number, event_type, source_type, source_id, idempotency_key, accounting_date, transaction_date, amount_minor, currency_code, base_amount_idr, created_at, updated_at)
               VALUES (?, ?, 'PAYROLL_POSTED', 'HRIS', ?, ?, ?, ?, ?, 'IDR', ?, ?, ?)`
            )
            .run(
              actEventId,
              `EVT-${journalId}`,
              runId,
              `idem-${journalId}`,
              timestamp.slice(0, 10),
              timestamp.slice(0, 10),
              run.totalGross,
              run.totalGross,
              timestamp,
              timestamp
            );

          this.sqlite
            .prepare(
              `INSERT INTO journal_entries
               (id, journal_number, accounting_event_id, period_id, status, source_type, source_id, transaction_date, currency_code, policy_code, policy_version, created_by_user_id, memo, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'POSTED', 'HRIS', ?, ?, 'IDR', 'HRIS_PAYROLL', 1, 'usr-admin', ?, ?, ?)`
            )
            .run(
              journalId,
              `JRN-PAY-${run.periodYear}${String(run.periodMonth).padStart(2, '0')}`,
              actEventId,
              periodId,
              runId,
              timestamp.slice(0, 10),
              `Payroll Expense Period ${run.periodMonth}/${run.periodYear}`,
              timestamp,
              timestamp
            );
        }
      }

      this.sqlite
        .prepare(
          "UPDATE hris_payroll_runs SET status = 'PAID', journal_id = ?, updated_at = ? WHERE id = ?"
        )
        .run(journalId, timestamp, runId);
    });

    tx.immediate();
    return { success: true, journalId, alreadyPosted: false };
  }
}
