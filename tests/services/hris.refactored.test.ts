import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { hrisStatements } from '../../server/db/migrations/hris';
import { HrisService } from '../../server/features/hris/service';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS number_sequences (
      sequence_type TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      station_code TEXT NOT NULL UNIQUE,
      station_name TEXT NOT NULL
    );
    INSERT INTO stations (id, station_code, station_name) VALUES ('stn-djj', 'DJJ', 'Jayapura Base');

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      position_title TEXT NOT NULL,
      department_id TEXT,
      base_station_id TEXT,
      phone TEXT,
      email TEXT,
      employment_status TEXT DEFAULT 'ACTIVE',
      employment_type TEXT DEFAULT 'PERMANENT',
      basic_salary INTEGER,
      position_allowance INTEGER,
      flight_rate_per_hour INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      department_code TEXT NOT NULL UNIQUE,
      department_name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
    INSERT INTO departments (id, department_code, department_name) VALUES ('dept-ops', 'OPS', 'Flight Operations');
  `);

  hrisStatements.forEach((sql) => {
    try {
      sqlite.exec(sql);
    } catch {}
  });

  return sqlite;
}

describe('Modular Refactored HrisService Suite', () => {
  let sqlite: Database.Database;
  let service: HrisService;

  beforeEach(() => {
    sqlite = createTestDb();
    service = new HrisService(sqlite);
  });

  it('correctly handles employee CRUD, salary management, and login verification', () => {
    const emp = service.createEmployee({
      fullName: 'Captain Jonathan Vance',
      positionTitle: 'Captain DHC-6',
      departmentId: 'dept-ops',
      baseStationId: 'stn-djj',
      basicSalary: 15000000,
      positionAllowance: 3000000,
      flightRatePerHour: 200000
    });

    expect(emp.id).toBeDefined();
    expect(emp.fullName).toBe('Captain Jonathan Vance');
    expect(emp.basicSalary).toBe(15000000);
    expect(emp.flightRatePerHour).toBe(200000);

    service.setEmployeePin(emp.id, '654321');
    const verified = service.verifyEmployeeLogin(emp.employeeCode, '654321');
    expect(verified.id).toBe(emp.id);
  });

  it('correctly handles certification CRUD and expiry 90-day alert calculations', () => {
    const emp = service.createEmployee({
      fullName: 'First Officer Ahmad',
      positionTitle: 'First Officer'
    });

    const cert = service.createCertification({
      employeeId: emp.id,
      certificationType: 'ATPL',
      certificateNumber: 'DGCA-8899',
      issuingAuthority: 'Kemenhub RI',
      issuedDate: '2025-01-01',
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'ACTIVE'
    });

    expect(cert.id).toBeDefined();

    const alerts = service.getCertificationAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].alertLevel).toBe('CRITICAL_30');
  });

  it('correctly handles shift patterns, crew schedules, and flight roster', () => {
    const pattern = service.createShiftPattern({
      shiftCode: 'FLT_MORNING',
      shiftName: 'Morning Flight Duty',
      startTime: '05:00',
      endTime: '13:00',
      rosterType: 'FLIGHT_DUTY',
      colorCode: '#4CAF50'
    });

    expect(pattern.shiftCode).toBe('FLT_MORNING');

    const emp = service.createEmployee({
      fullName: 'FO Budi',
      positionTitle: 'First Officer'
    });

    const today = new Date().toISOString().slice(0, 10);
    const assigned = service.assignCrewSchedule({
      employeeIds: [emp.id],
      dutyDate: today,
      shiftPatternId: pattern.id,
      flightNumber: 'AMA-201',
      route: 'DJJ-WMX-DJJ'
    });

    expect(assigned.length).toBe(1);
    expect(assigned[0].flightNumber).toBe('AMA-201');

    const roster = service.getFlightRoster(today);
    expect(roster.length).toBe(1);
  });

  it('correctly handles job posting CRUD, career application, and ATS pipeline stage transition', () => {
    const job = service.createJobPosting(
      {
        positionTitle: 'Avionics Maintenance Engineer',
        departmentId: 'dept-ops',
        employmentType: 'PERMANENT',
        vacancies: 2,
        description: 'Engine maintenance Specialist',
        requirements: 'AME License holders'
      },
      'usr-hr'
    );

    expect(job.postingNumber).toBeDefined();
    expect(job.status).toBe('OPEN');

    const applicant = service.createApplicant({
      jobPostingId: job.id,
      fullName: 'Rian Prasetyo',
      email: 'rian@email.com',
      phone: '08123456789',
      resumeReference: 'https://cv.link/rian',
      notes: 'Ingin bergabung tim AMA Papua'
    });

    expect(applicant.stage).toBe('APPLIED');

    const updatedApp = service.updateApplicantStage(applicant.id, {
      stage: 'ACCEPTED',
      notes: 'Kandidat memenuhi kualifikasi penuh'
    });

    expect(updatedApp.stage).toBe('ACCEPTED');
    expect(updatedApp.convertedEmployeeId).toBeDefined();
  });

  it('correctly returns department organization tree and dashboard analytics summary', () => {
    const tree = service.getOrgTree();
    expect(Array.isArray(tree)).toBe(true);

    const summary = service.getDashboardSummary();
    expect(summary.totalEmployees).toBeGreaterThanOrEqual(0);
    expect(summary.departmentsBreakdown).toBeDefined();
  });
});
