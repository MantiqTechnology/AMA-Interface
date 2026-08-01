import type Database from 'better-sqlite3';
import { getDbClient, type AppDatabase } from '../client';
import type { DemoSeedContext } from './context';

export async function seedHrisData(db: AppDatabase, ctx: DemoSeedContext) {
  const sqlite = (db as unknown as { $client: Database.Database }).$client ?? getDbClient().sqlite;
  const now = ctx.now;

  // 1. Departments Hierarchy & Head mapping
  const depts = [
    { id: 'dept-dir', code: 'DIR', name: 'Direksi & Manajemen', level: 'DIRECTORATE', order: 1 },
    {
      id: 'dept-flight-ops',
      code: 'FLIGHT_OPS',
      name: 'Divisi Flight Operations',
      level: 'DIVISION',
      parentId: 'dept-dir',
      order: 2
    },
    {
      id: 'dept-ocs',
      code: 'OCS',
      name: 'Operations Control Center (OCC)',
      level: 'DEPARTMENT',
      parentId: 'dept-flight-ops',
      order: 3
    },
    {
      id: 'dept-station-ops',
      code: 'STATION_OPS',
      name: 'Stasiun & Base Operations',
      level: 'DEPARTMENT',
      parentId: 'dept-flight-ops',
      order: 4
    },
    {
      id: 'dept-ppc',
      code: 'PPC',
      name: 'Payload & Flight Planning (PPC)',
      level: 'DEPARTMENT',
      parentId: 'dept-flight-ops',
      order: 5
    },
    {
      id: 'dept-hr',
      code: 'HR',
      name: 'Human Resource & GA',
      level: 'DIVISION',
      parentId: 'dept-dir',
      order: 6
    },
    {
      id: 'dept-fin',
      code: 'FINANCE',
      name: 'Finance, Accounting & Billing',
      level: 'DIVISION',
      parentId: 'dept-dir',
      order: 7
    },
    {
      id: 'dept-eng',
      code: 'ENGINEERING',
      name: 'Aircraft Maintenance & Engineering',
      level: 'DIVISION',
      parentId: 'dept-dir',
      order: 8
    }
  ];

  for (const d of depts) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO departments (id, department_code, department_name, department_level, parent_department_id, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(d.id, d.code, d.name, d.level, d.parentId ?? null, d.order, now, now);
  }

  // 2. Sample ~60 Employees across positions
  const employeeData = [
    // Executive / Managers
    {
      id: 'emp-001',
      code: 'EMP-0001',
      name: 'Captain Budi Santoso',
      pos: 'Chief of Pilot',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2026-08-15'
    },
    {
      id: 'emp-002',
      code: 'EMP-0002',
      name: 'Captain Hendra Wijaya',
      pos: 'Deputy Chief of Pilot',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2026-09-30'
    },
    {
      id: 'emp-003',
      code: 'EMP-0003',
      name: 'Lukas Papua',
      pos: 'Chief of OCS',
      dept: 'dept-ocs',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-004',
      code: 'EMP-0004',
      name: 'Siti Aminah',
      pos: 'HR Manager',
      dept: 'dept-hr',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-005',
      code: 'EMP-0005',
      name: 'Bambang Tri',
      pos: 'Finance Manager',
      dept: 'dept-fin',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-006',
      code: 'EMP-0006',
      name: 'Ir. Agus Pratama',
      pos: 'Engineering Manager',
      dept: 'dept-eng',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'AME',
      exp: '2027-01-10'
    },
    {
      id: 'emp-007',
      code: 'EMP-0007',
      name: 'Markus Wanamu',
      pos: 'Chief of Station DJJ',
      dept: 'dept-station-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },

    // Captains (Pilot)
    {
      id: 'emp-010',
      code: 'EMP-0010',
      name: 'Captain Rian Hidayat',
      pos: 'Captain',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2026-08-01'
    },
    {
      id: 'emp-011',
      code: 'EMP-0011',
      name: 'Captain Daniel Waker',
      pos: 'Captain',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2026-11-20'
    },
    {
      id: 'emp-012',
      code: 'EMP-0012',
      name: 'Captain Yoseph Kogoya',
      pos: 'Captain',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2026-07-28'
    }, // expiring super soon!
    {
      id: 'emp-013',
      code: 'EMP-0013',
      name: 'Captain Michael Tan',
      pos: 'Captain',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'ATPL',
      exp: '2027-03-15'
    },

    // First Officers
    {
      id: 'emp-020',
      code: 'EMP-0020',
      name: 'FO David Tabuni',
      pos: 'First Officer',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'CPL',
      exp: '2026-10-10'
    },
    {
      id: 'emp-021',
      code: 'EMP-0021',
      name: 'FO Samuel Wandik',
      pos: 'First Officer',
      dept: 'dept-flight-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'CPL',
      exp: '2026-08-25'
    },
    {
      id: 'emp-022',
      code: 'EMP-0022',
      name: 'FO Andrew Perkasa',
      pos: 'First Officer',
      dept: 'dept-flight-ops',
      type: 'CONTRACT',
      pin: 'PIN-123456',
      cert: 'CPL',
      exp: '2026-07-30'
    },
    {
      id: 'emp-023',
      code: 'EMP-0023',
      name: 'FO Gabriel Matuan',
      pos: 'First Officer',
      dept: 'dept-flight-ops',
      type: 'PROBATION',
      pin: 'PIN-123456',
      cert: 'CPL',
      exp: '2026-12-05'
    },

    // Engineers & Technicians
    {
      id: 'emp-030',
      code: 'EMP-0030',
      name: 'Joko Susilo',
      pos: 'Flight Engineer',
      dept: 'dept-eng',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'AME',
      exp: '2026-09-01'
    },
    {
      id: 'emp-031',
      code: 'EMP-0031',
      name: 'Ferry Kurniadi',
      pos: 'Avionics Technician',
      dept: 'dept-eng',
      type: 'PERMANENT',
      pin: 'PIN-123456',
      cert: 'AME',
      exp: '2026-08-10'
    },
    {
      id: 'emp-032',
      code: 'EMP-0032',
      name: 'Rahmat Hidayat',
      pos: 'Mechanic Technician',
      dept: 'dept-eng',
      type: 'CONTRACT',
      pin: 'PIN-123456'
    },

    // OCS Staff & Flight Coordinators
    {
      id: 'emp-040',
      code: 'EMP-0040',
      name: 'Maya Indah',
      pos: 'Flight Coordinator',
      dept: 'dept-ocs',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-041',
      code: 'EMP-0041',
      name: 'Eko Prasetyo',
      pos: 'Flight Dispatcher',
      dept: 'dept-ocs',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-042',
      code: 'EMP-0042',
      name: 'Nita Sari',
      pos: 'Radio Operator',
      dept: 'dept-ocs',
      type: 'CONTRACT',
      pin: 'PIN-123456'
    },

    // Station Staff (Wamena, Merauke, Sentani)
    {
      id: 'emp-050',
      code: 'EMP-0050',
      name: 'Yulius Enumbi',
      pos: 'Station Officer WMX',
      dept: 'dept-station-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-051',
      code: 'EMP-0051',
      name: 'Petrus Yoman',
      pos: 'Cargo Handler WMX',
      dept: 'dept-station-ops',
      type: 'CONTRACT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-052',
      code: 'EMP-0052',
      name: 'Maria Haluk',
      pos: 'Ticketing Counter WMX',
      dept: 'dept-station-ops',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },

    // HR & Finance Staff
    {
      id: 'emp-060',
      code: 'EMP-0060',
      name: 'Dewi Anggraini',
      pos: 'HR Officer',
      dept: 'dept-hr',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-061',
      code: 'EMP-0061',
      name: 'Tini Wardhani',
      pos: 'Payroll Specialist',
      dept: 'dept-hr',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    },
    {
      id: 'emp-070',
      code: 'EMP-0700',
      name: 'Andi Wijaya',
      pos: 'Senior Accountant',
      dept: 'dept-fin',
      type: 'PERMANENT',
      pin: 'PIN-123456'
    }
  ];

  for (const e of employeeData) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO employees
         (id, employee_code, full_name, position_title, department_id, employment_status, employment_type, pin_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`
      )
      .run(e.id, e.code, e.name, e.pos, e.dept, e.type, e.pin, now, now);

    // Certifications for pilots/engineers
    if (e.cert) {
      const certId = `cert-seed-${e.id}`;
      const status = e.exp && e.exp <= '2026-08-30' ? 'EXPIRING_SOON' : 'ACTIVE';
      sqlite
        .prepare(
          `INSERT OR REPLACE INTO employee_certifications
           (id, employee_id, certification_type, certificate_number, issuing_authority, issued_date, expiry_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'DGCA Indonesia', '2024-01-01', ?, ?, ?, ?)`
        )
        .run(certId, e.id, e.cert, `LIC-${e.code}`, e.exp, status, now, now);

      // Add Medical Class 1 for pilots
      if (e.cert === 'ATPL' || e.cert === 'CPL') {
        const medId = `med-seed-${e.id}`;
        sqlite
          .prepare(
            `INSERT OR REPLACE INTO employee_certifications
             (id, employee_id, certification_type, certificate_number, issuing_authority, issued_date, expiry_date, status, created_at, updated_at)
             VALUES (?, ?, 'MEDICAL_CLASS_1', ?, 'Balai Kesehatan Penerbangan', '2025-06-01', '2026-09-01', 'ACTIVE', ?, ?)`
          )
          .run(medId, e.id, `MED-${e.code}`, now, now);
      }
    }
  }

  // 3. Leave Types
  const leaveTypes = [
    { id: 'lt-annual', code: 'ANNUAL', name: 'Cuti Tahunan', days: 12, paid: 1 },
    { id: 'lt-sick', code: 'SICK', name: 'Cuti Sakit', days: 14, paid: 1 },
    { id: 'lt-maternity', code: 'MATERNITY', name: 'Cuti Melahirkan', days: 90, paid: 1 },
    {
      id: 'lt-paternity',
      code: 'PATERNITY',
      name: 'Cuti Ayah (Istri Melahirkan)',
      days: 3,
      paid: 1
    },
    { id: 'lt-special', code: 'SPECIAL', name: 'Izin Khusus', days: 5, paid: 1 }
  ];

  for (const t of leaveTypes) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_leave_types (id, leave_code, leave_name, max_days_per_year, is_paid, requires_approval, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`
      )
      .run(t.id, t.code, t.name, t.days, t.paid, now, now);
  }

  // 4. Shift Patterns
  const shiftPatterns = [
    {
      id: 'sp-morning',
      code: 'MORNING',
      name: 'Shift Pagi (Operational)',
      start: '06:00',
      end: '14:00',
      night: 0
    },
    {
      id: 'sp-afternoon',
      code: 'AFTERNOON',
      name: 'Shift Siang',
      start: '14:00',
      end: '22:00',
      night: 0
    },
    {
      id: 'sp-night',
      code: 'NIGHT',
      name: 'Shift Malam (Standby/Occ)',
      start: '22:00',
      end: '06:00',
      night: 1
    },
    {
      id: 'sp-normal',
      code: 'OFFICE',
      name: 'Jam Kerja Office (HQ)',
      start: '08:00',
      end: '17:00',
      night: 0
    }
  ];

  for (const s of shiftPatterns) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_shift_patterns (id, shift_code, shift_name, start_time, end_time, break_duration_minutes, is_night_shift, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 60, ?, 1, ?, ?)`
      )
      .run(s.id, s.code, s.name, s.start, s.end, s.night, now, now);
  }

  // 5. Payroll Components & Allowance Rates per Position
  const payrollComponents = [
    {
      id: 'pc-basic',
      code: 'BASIC_SALARY',
      name: 'Gaji Pokok',
      type: 'EARNING',
      taxable: 1,
      fixed: 1,
      formula: 'FIXED'
    },
    {
      id: 'pc-flight',
      code: 'FLIGHT_ALLOWANCE',
      name: 'Tunjangan Terbang',
      type: 'EARNING',
      taxable: 1,
      fixed: 0,
      formula: 'HOURS_BASED'
    },
    {
      id: 'pc-position',
      code: 'POSITION_ALLOWANCE',
      name: 'Tunjangan Jabatan',
      type: 'EARNING',
      taxable: 1,
      fixed: 1,
      formula: 'FIXED'
    },
    {
      id: 'pc-overtime',
      code: 'OVERTIME',
      name: 'Lembur',
      type: 'EARNING',
      taxable: 1,
      fixed: 0,
      formula: 'HOURS_BASED'
    },
    {
      id: 'pc-pph21',
      code: 'PPH21',
      name: 'PPh 21 (TER 2024)',
      type: 'TAX',
      taxable: 0,
      fixed: 0,
      formula: 'FORMULA'
    },
    {
      id: 'pc-bpjs-kes',
      code: 'BPJS_KES',
      name: 'BPJS Kesehatan',
      type: 'DEDUCTION',
      taxable: 0,
      fixed: 0,
      formula: 'PERCENTAGE'
    },
    {
      id: 'pc-bpjs-tk',
      code: 'BPJS_TK',
      name: 'BPJS Ketenagakerjaan',
      type: 'DEDUCTION',
      taxable: 0,
      fixed: 0,
      formula: 'PERCENTAGE'
    }
  ];

  for (const c of payrollComponents) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_payroll_components (id, component_code, component_name, component_type, is_taxable, is_fixed, formula_type, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(c.id, c.code, c.name, c.type, c.taxable, c.fixed, c.formula, now, now);
  }

  // Allowance Rates per Position (Tunjangan Terbang)
  const allowanceRates = [
    { id: 'alw-captain', title: 'Captain', ratePerHour: 500000 },
    { id: 'alw-chief-pilot', title: 'Chief of Pilot', ratePerHour: 600000 },
    { id: 'alw-deputy-chief', title: 'Deputy Chief of Pilot', ratePerHour: 550000 },
    { id: 'alw-fo', title: 'First Officer', ratePerHour: 350000 },
    { id: 'alw-fe', title: 'Flight Engineer', ratePerHour: 250000 }
  ];

  for (const a of allowanceRates) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_allowance_rates (id, component_id, position_title, rate_per_hour, effective_date, created_at, updated_at)
         VALUES (?, 'pc-flight', ?, ?, '2025-01-01', ?, ?)`
      )
      .run(a.id, a.title, a.ratePerHour, now, now);
  }

  // 6. Sample Payroll Run (Bulan Ini)
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO hris_payroll_runs
       (id, run_number, period_month, period_year, run_date, status, total_gross, total_deductions, total_net, employee_count, created_at, updated_at)
       VALUES ('pay-run-seed-01', 'PAY-202607-0001', 7, 2026, '2026-07-25', 'CALCULATED', 185000000, 24500000, 160500000, 20, ?, ?)`
    )
    .run(now, now);

  // 7. Job Postings & Applicants
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO hris_job_postings
       (id, posting_number, position_title, department_id, employment_type, description, vacancies, status, posted_at, created_by, created_at, updated_at)
       VALUES ('job-seed-01', 'JOB-202607-0001', 'First Officer DHC-6 Twin Otter', 'dept-flight-ops', 'PERMANENT', 'Lowongan Pilot First Officer untuk penerbangan perintis Papua.', 2, 'OPEN', '2026-07-01', 'EMP-0004', ?, ?)`
    )
    .run(now, now);

  sqlite
    .prepare(
      `INSERT OR REPLACE INTO hris_applicants
       (id, applicant_number, job_posting_id, full_name, email, phone, stage, created_at, updated_at)
       VALUES ('app-seed-01', 'APP-202607-0001', 'job-seed-01', 'Kevin Sanjaya', 'kevin@gmail.com', '081299887766', 'INTERVIEW', ?, ?)`
    )
    .run(now, now);

  // 8. KPI Period, Templates & Assessments per Department
  sqlite
    .prepare(
      `INSERT OR REPLACE INTO hris_kpi_periods (id, period_name, start_date, end_date, status, created_at, updated_at)
       VALUES ('kpip-seed-01', 'KPI Q2 2026', '2026-04-01', '2026-06-30', 'ACTIVE', ?, ?)`
    )
    .run(now, now);

  const kpiTemplates = [
    { id: 'kpit-flight-ops', name: 'Flight Operations & Crew KPI', deptId: 'dept-flight-ops' },
    { id: 'kpit-eng', name: 'Aircraft Maintenance & Quality KPI', deptId: 'dept-eng' },
    { id: 'kpit-hr', name: 'Human Capital & Organization KPI', deptId: 'dept-hr' },
    { id: 'kpit-fin', name: 'Financial Control & Accounting KPI', deptId: 'dept-fin' },
    { id: 'kpit-station-ops', name: 'Station & Ground Operations KPI', deptId: 'dept-station-ops' }
  ];

  for (const t of kpiTemplates) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_kpi_templates (id, template_name, department_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(t.id, t.name, t.deptId, now, now);
  }

  const kpiAssessments = [
    { id: 'kpia-seed-01', empId: 'emp-001', tmplId: 'kpit-flight-ops', score: 94.5, grade: 'A' },
    { id: 'kpia-seed-02', empId: 'emp-002', tmplId: 'kpit-flight-ops', score: 88.0, grade: 'B' },
    { id: 'kpia-seed-03', empId: 'emp-006', tmplId: 'kpit-eng', score: 92.0, grade: 'A' },
    { id: 'kpia-seed-04', empId: 'emp-004', tmplId: 'kpit-hr', score: 95.0, grade: 'A' },
    { id: 'kpia-seed-05', empId: 'emp-005', tmplId: 'kpit-fin', score: 93.5, grade: 'A' },
    { id: 'kpia-seed-06', empId: 'emp-007', tmplId: 'kpit-station-ops', score: 89.5, grade: 'B' }
  ];

  for (const a of kpiAssessments) {
    sqlite
      .prepare(
        `INSERT OR REPLACE INTO hris_kpi_assessments (id, period_id, employee_id, template_id, overall_score, overall_grade, status, created_at, updated_at)
         VALUES (?, 'kpip-seed-01', ?, ?, ?, ?, 'FINALIZED', ?, ?)`
      )
      .run(a.id, a.empId, a.tmplId, a.score, a.grade, now, now);
  }
}
