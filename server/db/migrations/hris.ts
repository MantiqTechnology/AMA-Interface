export const hrisAlterStatements = [
  // ── Extend employees table ──────────────────────────────────────────
  // Biodata
  `ALTER TABLE employees ADD COLUMN date_of_birth TEXT`,
  `ALTER TABLE employees ADD COLUMN gender TEXT CHECK (gender IN ('MALE', 'FEMALE'))`,
  `ALTER TABLE employees ADD COLUMN identity_number TEXT`,
  `ALTER TABLE employees ADD COLUMN phone TEXT`,
  `ALTER TABLE employees ADD COLUMN email TEXT`,
  `ALTER TABLE employees ADD COLUMN address TEXT`,

  // Employment detail
  `ALTER TABLE employees ADD COLUMN join_date TEXT`,
  `ALTER TABLE employees ADD COLUMN end_date TEXT`,
  `ALTER TABLE employees ADD COLUMN employment_type TEXT DEFAULT 'PERMANENT' CHECK (employment_type IN ('PERMANENT', 'CONTRACT', 'PROBATION'))`,
  `ALTER TABLE employees ADD COLUMN manager_id TEXT REFERENCES employees(id)`,
  `ALTER TABLE employees ADD COLUMN crew_id TEXT REFERENCES crews(id)`,

  // Payroll / Tax
  `ALTER TABLE employees ADD COLUMN tax_id_number TEXT`,
  `ALTER TABLE employees ADD COLUMN bank_name TEXT`,
  `ALTER TABLE employees ADD COLUMN bank_account_number TEXT`,
  `ALTER TABLE employees ADD COLUMN bank_account_name TEXT`,
  `ALTER TABLE employees ADD COLUMN bpjs_kesehatan_number TEXT`,
  `ALTER TABLE employees ADD COLUMN bpjs_tk_number TEXT`,
  `ALTER TABLE employees ADD COLUMN marital_status TEXT DEFAULT 'SINGLE' CHECK (marital_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'))`,
  `ALTER TABLE employees ADD COLUMN number_of_dependents INTEGER DEFAULT 0`,
  `ALTER TABLE employees ADD COLUMN ptkp_status TEXT DEFAULT 'TK/0'`,

  // Self-Service Auth
  `ALTER TABLE employees ADD COLUMN pin_hash TEXT`,
  `ALTER TABLE employees ADD COLUMN avatar_url TEXT`,

  // ── Extend departments table ────────────────────────────────────────
  `ALTER TABLE departments ADD COLUMN parent_department_id TEXT REFERENCES departments(id)`,
  `ALTER TABLE departments ADD COLUMN department_level TEXT DEFAULT 'UNIT' CHECK (department_level IN ('DIRECTORATE', 'DIVISION', 'DEPARTMENT', 'UNIT'))`,
  `ALTER TABLE departments ADD COLUMN head_employee_id TEXT REFERENCES employees(id)`,
  `ALTER TABLE departments ADD COLUMN sort_order INTEGER DEFAULT 0`
];

export const hrisStatements = [
  // ── Certifications & Licenses ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS employee_certifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    certification_type TEXT NOT NULL CHECK (certification_type IN (
      'ATPL', 'CPL', 'PPL', 'IR', 'MEDICAL_CLASS_1', 'MEDICAL_CLASS_2',
      'TYPE_RATING', 'CRM', 'DG_AWARENESS', 'AME', 'OTHER'
    )),
    certificate_number TEXT NOT NULL,
    issuing_authority TEXT NOT NULL,
    issued_date TEXT NOT NULL,
    expiry_date TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
      'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'REVOKED', 'SUSPENDED'
    )),
    remarks TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cert_employee ON employee_certifications(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cert_expiry ON employee_certifications(expiry_date, status)`,

  // ── Attendance / Absensi ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_attendances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    attendance_date TEXT NOT NULL,
    station_id TEXT REFERENCES stations(id),
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN (
      'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ON_DUTY'
    )),
    source TEXT DEFAULT 'PORTAL' CHECK (source IN (
      'PORTAL', 'MANUAL', 'SYSTEM', 'BIOMETRIC', 'GPS'
    )),
    check_in_note TEXT,
    check_out_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (employee_id, attendance_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_date ON hris_attendances(attendance_date)`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_station ON hris_attendances(station_id, attendance_date)`,

  // ── Leave Types ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_leave_types (
    id TEXT PRIMARY KEY,
    leave_code TEXT NOT NULL UNIQUE,
    leave_name TEXT NOT NULL,
    max_days_per_year INTEGER,
    is_paid INTEGER NOT NULL DEFAULT 1,
    requires_approval INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Leave Balances ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_leave_balances (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    leave_type_id TEXT NOT NULL REFERENCES hris_leave_types(id),
    period_year INTEGER NOT NULL,
    entitled_days REAL NOT NULL DEFAULT 0,
    used_days REAL NOT NULL DEFAULT 0,
    carried_forward REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (employee_id, leave_type_id, period_year)
  )`,

  // ── Leave Requests ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_leave_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    leave_type_id TEXT NOT NULL REFERENCES hris_leave_types(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_days REAL NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
      'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    )),
    approved_by TEXT REFERENCES employees(id),
    approved_at TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leave_req_employee ON hris_leave_requests(employee_id, status)`,

  // ── Overtime Requests ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_overtime_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    overtime_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    total_hours REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
      'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    )),
    approved_by TEXT REFERENCES employees(id),
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_overtime_employee ON hris_overtime_requests(employee_id, status)`,

  // ── Shift Patterns ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_shift_patterns (
    id TEXT PRIMARY KEY,
    shift_code TEXT NOT NULL UNIQUE,
    shift_name TEXT NOT NULL,
    roster_type TEXT NOT NULL DEFAULT 'SHIFT',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_duration_minutes INTEGER DEFAULT 60,
    is_night_shift INTEGER NOT NULL DEFAULT 0,
    color_code TEXT DEFAULT '#1976D2',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Crew Schedules / Roster ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_crew_schedules (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    schedule_date TEXT NOT NULL,
    shift_id TEXT REFERENCES hris_shift_patterns(id),
    station_id TEXT REFERENCES stations(id),
    flight_operation_id TEXT,
    roster_type TEXT NOT NULL DEFAULT 'SHIFT' CHECK (roster_type IN (
      'SHIFT', 'FLIGHT_DUTY', 'STANDBY', 'REST_DAY', 'TRAINING', 'OFF'
    )),
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
      'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'
    )),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (employee_id, schedule_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_crew_schedule_date ON hris_crew_schedules(schedule_date, station_id)`,

  // ── Payroll Components ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_payroll_components (
    id TEXT PRIMARY KEY,
    component_code TEXT NOT NULL UNIQUE,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL CHECK (component_type IN (
      'EARNING', 'DEDUCTION', 'BENEFIT', 'TAX'
    )),
    is_taxable INTEGER NOT NULL DEFAULT 1,
    is_fixed INTEGER NOT NULL DEFAULT 1,
    formula_type TEXT DEFAULT 'FIXED' CHECK (formula_type IN (
      'FIXED', 'PERCENTAGE', 'FORMULA', 'HOURS_BASED'
    )),
    default_amount INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Allowance Rates (per position/grade) ────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_allowance_rates (
    id TEXT PRIMARY KEY,
    component_id TEXT NOT NULL REFERENCES hris_payroll_components(id),
    position_title TEXT NOT NULL,
    grade TEXT,
    rate_per_hour INTEGER DEFAULT 0,
    rate_per_month INTEGER DEFAULT 0,
    effective_date TEXT NOT NULL,
    end_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (component_id, position_title, effective_date)
  )`,

  // ── Employee Salary ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_employee_salary (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    component_id TEXT NOT NULL REFERENCES hris_payroll_components(id),
    amount INTEGER NOT NULL DEFAULT 0,
    effective_date TEXT NOT NULL,
    end_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (employee_id, component_id, effective_date)
  )`,

  // ── Payroll Runs ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_payroll_runs (
    id TEXT PRIMARY KEY,
    run_number TEXT NOT NULL UNIQUE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL,
    run_date TEXT NOT NULL,
    run_type TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (run_type IN ('MONTHLY', 'THR')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED'
    )),
    total_gross INTEGER NOT NULL DEFAULT 0,
    total_deductions INTEGER NOT NULL DEFAULT 0,
    total_net INTEGER NOT NULL DEFAULT 0,
    employee_count INTEGER NOT NULL DEFAULT 0,
    approved_by TEXT REFERENCES employees(id),
    approved_at TEXT,
    notes TEXT,
    journal_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (period_month, period_year)
  )`,

  // ── Payslips ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_payslips (
    id TEXT PRIMARY KEY,
    payroll_run_id TEXT NOT NULL REFERENCES hris_payroll_runs(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    basic_salary INTEGER NOT NULL DEFAULT 0,
    total_earnings INTEGER NOT NULL DEFAULT 0,
    total_deductions INTEGER NOT NULL DEFAULT 0,
    net_salary INTEGER NOT NULL DEFAULT 0,
    pph21_amount INTEGER NOT NULL DEFAULT 0,
    bpjs_kes_employee INTEGER NOT NULL DEFAULT 0,
    bpjs_kes_company INTEGER NOT NULL DEFAULT 0,
    bpjs_tk_employee INTEGER NOT NULL DEFAULT 0,
    bpjs_tk_company INTEGER NOT NULL DEFAULT 0,
    flight_allowance INTEGER NOT NULL DEFAULT 0,
    overtime_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_payslip_run ON hris_payslips(payroll_run_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payslip_employee ON hris_payslips(employee_id)`,

  // ── Payslip Lines ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_payslip_lines (
    id TEXT PRIMARY KEY,
    payslip_id TEXT NOT NULL REFERENCES hris_payslips(id),
    component_id TEXT REFERENCES hris_payroll_components(id),
    component_code TEXT NOT NULL,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    calculation_note TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
  )`,

  // ── Job Postings ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_job_postings (
    id TEXT PRIMARY KEY,
    posting_number TEXT NOT NULL UNIQUE,
    position_title TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id),
    station_id TEXT REFERENCES stations(id),
    employment_type TEXT NOT NULL DEFAULT 'PERMANENT',
    description TEXT,
    requirements TEXT,
    vacancies INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'FILLED'
    )),
    posted_at TEXT,
    closed_at TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Applicants ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_applicants (
    id TEXT PRIMARY KEY,
    applicant_number TEXT NOT NULL UNIQUE,
    job_posting_id TEXT NOT NULL REFERENCES hris_job_postings(id),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    resume_reference TEXT,
    stage TEXT NOT NULL DEFAULT 'APPLIED' CHECK (stage IN (
      'APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT',
      'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'
    )),
    notes TEXT,
    converted_employee_id TEXT REFERENCES employees(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── KPI Periods ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_kpi_periods (
    id TEXT PRIMARY KEY,
    period_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── KPI Templates ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_kpi_templates (
    id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── KPI Indicators ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_kpi_indicators (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES hris_kpi_templates(id),
    indicator_name TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 0,
    target_value TEXT,
    unit TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`,

  // ── KPI Assessments ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_kpi_assessments (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES hris_kpi_periods(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    assessor_id TEXT REFERENCES employees(id),
    template_id TEXT NOT NULL REFERENCES hris_kpi_templates(id),
    overall_score REAL,
    overall_grade TEXT CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'E')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'SELF_ASSESSED', 'REVIEWED', 'FINALIZED'
    )),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (period_id, employee_id)
  )`,

  // ── KPI Scores ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_kpi_scores (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES hris_kpi_assessments(id),
    indicator_id TEXT NOT NULL REFERENCES hris_kpi_indicators(id),
    actual_value TEXT,
    score REAL,
    notes TEXT
  )`,

  // ── HRIS Number Sequences ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS hris_number_sequences (
    sequence_type TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL CHECK (current_value >= 0)
  )`
];

export const hrisDropStatements = [
  'DROP TABLE IF EXISTS hris_kpi_scores',
  'DROP TABLE IF EXISTS hris_kpi_assessments',
  'DROP TABLE IF EXISTS hris_kpi_indicators',
  'DROP TABLE IF EXISTS hris_kpi_templates',
  'DROP TABLE IF EXISTS hris_kpi_periods',
  'DROP TABLE IF EXISTS hris_applicants',
  'DROP TABLE IF EXISTS hris_job_postings',
  'DROP TABLE IF EXISTS hris_payslip_lines',
  'DROP TABLE IF EXISTS hris_payslips',
  'DROP TABLE IF EXISTS hris_payroll_runs',
  'DROP TABLE IF EXISTS hris_employee_salary',
  'DROP TABLE IF EXISTS hris_allowance_rates',
  'DROP TABLE IF EXISTS hris_payroll_components',
  'DROP TABLE IF EXISTS hris_crew_schedules',
  'DROP TABLE IF EXISTS hris_shift_patterns',
  'DROP TABLE IF EXISTS hris_overtime_requests',
  'DROP TABLE IF EXISTS hris_leave_requests',
  'DROP TABLE IF EXISTS hris_leave_balances',
  'DROP TABLE IF EXISTS hris_leave_types',
  'DROP TABLE IF EXISTS hris_attendances',
  'DROP TABLE IF EXISTS employee_certifications',
  'DROP TABLE IF EXISTS hris_number_sequences'
];
