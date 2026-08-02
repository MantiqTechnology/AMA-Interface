import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── Certifications ────────────────────────────────────────────────────
export const employeeCertifications = sqliteTable('employee_certifications', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  certificationType: text('certification_type').notNull(),
  certificateNumber: text('certificate_number').notNull(),
  issuingAuthority: text('issuing_authority').notNull(),
  issuedDate: text('issued_date').notNull(),
  expiryDate: text('expiry_date'),
  status: text('status').notNull().default('ACTIVE'),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Attendance ────────────────────────────────────────────────────────
export const hrisAttendances = sqliteTable(
  'hris_attendances',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    attendanceDate: text('attendance_date').notNull(),
    stationId: text('station_id'),
    checkIn: text('check_in'),
    checkOut: text('check_out'),
    status: text('status').notNull().default('PRESENT'),
    source: text('source').default('PORTAL'),
    checkInNote: text('check_in_note'),
    checkOutNote: text('check_out_note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('idx_hris_attendance_unique').on(table.employeeId, table.attendanceDate)]
);

// ── Leave Types ───────────────────────────────────────────────────────
export const hrisLeaveTypes = sqliteTable('hris_leave_types', {
  id: text('id').primaryKey(),
  leaveCode: text('leave_code').notNull().unique(),
  leaveName: text('leave_name').notNull(),
  maxDaysPerYear: integer('max_days_per_year'),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(true),
  requiresApproval: integer('requires_approval', { mode: 'boolean' }).notNull().default(true),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Leave Balances ────────────────────────────────────────────────────
export const hrisLeaveBalances = sqliteTable(
  'hris_leave_balances',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    leaveTypeId: text('leave_type_id').notNull(),
    periodYear: integer('period_year').notNull(),
    entitledDays: real('entitled_days').notNull().default(0),
    usedDays: real('used_days').notNull().default(0),
    carriedForward: real('carried_forward').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_hris_leave_balance_unique').on(
      table.employeeId,
      table.leaveTypeId,
      table.periodYear
    )
  ]
);

// ── Leave Requests ────────────────────────────────────────────────────
export const hrisLeaveRequests = sqliteTable('hris_leave_requests', {
  id: text('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  employeeId: text('employee_id').notNull(),
  leaveTypeId: text('leave_type_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  totalDays: real('total_days').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('PENDING'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Overtime Requests ─────────────────────────────────────────────────
export const hrisOvertimeRequests = sqliteTable('hris_overtime_requests', {
  id: text('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  employeeId: text('employee_id').notNull(),
  overtimeDate: text('overtime_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  totalHours: real('total_hours').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('PENDING'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Shift Patterns ────────────────────────────────────────────────────
export const hrisShiftPatterns = sqliteTable('hris_shift_patterns', {
  id: text('id').primaryKey(),
  shiftCode: text('shift_code').notNull().unique(),
  shiftName: text('shift_name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  breakDurationMinutes: integer('break_duration_minutes').default(60),
  isNightShift: integer('is_night_shift', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Crew Schedules ────────────────────────────────────────────────────
export const hrisCrewSchedules = sqliteTable(
  'hris_crew_schedules',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    scheduleDate: text('schedule_date').notNull(),
    shiftId: text('shift_id'),
    stationId: text('station_id'),
    flightOperationId: text('flight_operation_id'),
    rosterType: text('roster_type').notNull().default('SHIFT'),
    status: text('status').notNull().default('SCHEDULED'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('idx_hris_crew_schedule_unique').on(table.employeeId, table.scheduleDate)]
);

// ── Payroll Components ────────────────────────────────────────────────
export const hrisPayrollComponents = sqliteTable('hris_payroll_components', {
  id: text('id').primaryKey(),
  componentCode: text('component_code').notNull().unique(),
  componentName: text('component_name').notNull(),
  componentType: text('component_type').notNull(),
  isTaxable: integer('is_taxable', { mode: 'boolean' }).notNull().default(true),
  isFixed: integer('is_fixed', { mode: 'boolean' }).notNull().default(true),
  formulaType: text('formula_type').default('FIXED'),
  defaultAmount: integer('default_amount').default(0),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Allowance Rates ───────────────────────────────────────────────────
export const hrisAllowanceRates = sqliteTable(
  'hris_allowance_rates',
  {
    id: text('id').primaryKey(),
    componentId: text('component_id').notNull(),
    positionTitle: text('position_title').notNull(),
    grade: text('grade'),
    ratePerHour: integer('rate_per_hour').default(0),
    ratePerMonth: integer('rate_per_month').default(0),
    effectiveDate: text('effective_date').notNull(),
    endDate: text('end_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_hris_allowance_rate_unique').on(
      table.componentId,
      table.positionTitle,
      table.effectiveDate
    )
  ]
);

// ── Employee Salary ───────────────────────────────────────────────────
export const hrisEmployeeSalary = sqliteTable(
  'hris_employee_salary',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    componentId: text('component_id').notNull(),
    amount: integer('amount').notNull().default(0),
    effectiveDate: text('effective_date').notNull(),
    endDate: text('end_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_hris_emp_salary_unique').on(
      table.employeeId,
      table.componentId,
      table.effectiveDate
    )
  ]
);

// ── Payroll Runs ──────────────────────────────────────────────────────
export const hrisPayrollRuns = sqliteTable(
  'hris_payroll_runs',
  {
    id: text('id').primaryKey(),
    runNumber: text('run_number').notNull().unique(),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    runDate: text('run_date').notNull(),
    status: text('status').notNull().default('DRAFT'),
    totalGross: integer('total_gross').notNull().default(0),
    totalDeductions: integer('total_deductions').notNull().default(0),
    totalNet: integer('total_net').notNull().default(0),
    employeeCount: integer('employee_count').notNull().default(0),
    approvedBy: text('approved_by'),
    approvedAt: text('approved_at'),
    notes: text('notes'),
    journalId: text('journal_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('idx_hris_payroll_period').on(table.periodMonth, table.periodYear)]
);

// ── Payslips ──────────────────────────────────────────────────────────
export const hrisPayslips = sqliteTable('hris_payslips', {
  id: text('id').primaryKey(),
  payrollRunId: text('payroll_run_id').notNull(),
  employeeId: text('employee_id').notNull(),
  basicSalary: integer('basic_salary').notNull().default(0),
  totalEarnings: integer('total_earnings').notNull().default(0),
  totalDeductions: integer('total_deductions').notNull().default(0),
  netSalary: integer('net_salary').notNull().default(0),
  pph21Amount: integer('pph21_amount').notNull().default(0),
  bpjsKesEmployee: integer('bpjs_kes_employee').notNull().default(0),
  bpjsKesCompany: integer('bpjs_kes_company').notNull().default(0),
  bpjsTkEmployee: integer('bpjs_tk_employee').notNull().default(0),
  bpjsTkCompany: integer('bpjs_tk_company').notNull().default(0),
  flightAllowance: integer('flight_allowance').notNull().default(0),
  overtimeAmount: integer('overtime_amount').notNull().default(0),
  createdAt: text('created_at').notNull()
});

// ── Payslip Lines ─────────────────────────────────────────────────────
export const hrisPayslipLines = sqliteTable('hris_payslip_lines', {
  id: text('id').primaryKey(),
  payslipId: text('payslip_id').notNull(),
  componentId: text('component_id').notNull(),
  componentType: text('component_type').notNull(),
  amount: integer('amount').notNull().default(0),
  calculationNote: text('calculation_note'),
  sortOrder: integer('sort_order').default(0)
});

// ── Job Postings ──────────────────────────────────────────────────────
export const hrisJobPostings = sqliteTable('hris_job_postings', {
  id: text('id').primaryKey(),
  postingNumber: text('posting_number').notNull().unique(),
  positionTitle: text('position_title').notNull(),
  departmentId: text('department_id').notNull(),
  stationId: text('station_id'),
  employmentType: text('employment_type').notNull().default('PERMANENT'),
  description: text('description'),
  requirements: text('requirements'),
  vacancies: integer('vacancies').notNull().default(1),
  status: text('status').notNull().default('DRAFT'),
  postedAt: text('posted_at'),
  closedAt: text('closed_at'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── Applicants ────────────────────────────────────────────────────────
export const hrisApplicants = sqliteTable('hris_applicants', {
  id: text('id').primaryKey(),
  applicantNumber: text('applicant_number').notNull().unique(),
  jobPostingId: text('job_posting_id').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  resumeReference: text('resume_reference'),
  stage: text('stage').notNull().default('APPLIED'),
  notes: text('notes'),
  convertedEmployeeId: text('converted_employee_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── KPI Periods ───────────────────────────────────────────────────────
export const hrisKpiPeriods = sqliteTable('hris_kpi_periods', {
  id: text('id').primaryKey(),
  periodName: text('period_name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── KPI Templates ─────────────────────────────────────────────────────
export const hrisKpiTemplates = sqliteTable('hris_kpi_templates', {
  id: text('id').primaryKey(),
  templateName: text('template_name').notNull(),
  departmentId: text('department_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// ── KPI Indicators ────────────────────────────────────────────────────
export const hrisKpiIndicators = sqliteTable('hris_kpi_indicators', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  indicatorName: text('indicator_name').notNull(),
  weight: real('weight').notNull().default(0),
  targetValue: text('target_value'),
  unit: text('unit'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull()
});

// ── KPI Assessments ───────────────────────────────────────────────────
export const hrisKpiAssessments = sqliteTable(
  'hris_kpi_assessments',
  {
    id: text('id').primaryKey(),
    periodId: text('period_id').notNull(),
    employeeId: text('employee_id').notNull(),
    assessorId: text('assessor_id'),
    templateId: text('template_id').notNull(),
    overallScore: real('overall_score'),
    overallGrade: text('overall_grade'),
    status: text('status').notNull().default('DRAFT'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('idx_hris_kpi_assessment_unique').on(table.periodId, table.employeeId)]
);

// ── KPI Scores ────────────────────────────────────────────────────────
export const hrisKpiScores = sqliteTable('hris_kpi_scores', {
  id: text('id').primaryKey(),
  assessmentId: text('assessment_id').notNull(),
  indicatorId: text('indicator_id').notNull(),
  actualValue: text('actual_value'),
  score: real('score'),
  notes: text('notes')
});

// ── HRIS Number Sequences ─────────────────────────────────────────────
export const hrisNumberSequences = sqliteTable('hris_number_sequences', {
  sequenceType: text('sequence_type').primaryKey(),
  currentValue: integer('current_value').notNull().default(0)
});
