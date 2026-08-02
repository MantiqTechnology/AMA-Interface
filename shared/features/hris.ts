import { z } from 'zod';

// ── Constants ─────────────────────────────────────────────────────────

export const certificationTypes = [
  'ATPL',
  'CPL',
  'PPL',
  'IR',
  'MEDICAL_CLASS_1',
  'MEDICAL_CLASS_2',
  'TYPE_RATING',
  'CRM',
  'DG_AWARENESS',
  'AME',
  'DGCA_LICENSE',
  'OTHER'
] as const;

export const certificationStatuses = [
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED'
] as const;

export const attendanceStatuses = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
  'ON_DUTY'
] as const;

export const attendanceSources = ['PORTAL', 'MANUAL', 'SYSTEM', 'BIOMETRIC', 'GPS'] as const;

export const leaveRequestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const overtimeRequestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const rosterTypes = [
  'SHIFT',
  'FLIGHT_DUTY',
  'STANDBY',
  'REST_DAY',
  'TRAINING',
  'OFF'
] as const;

export const scheduleStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;

export const payrollComponentTypes = ['EARNING', 'DEDUCTION', 'BENEFIT', 'TAX'] as const;

export const formulaTypes = ['FIXED', 'PERCENTAGE', 'FORMULA', 'HOURS_BASED'] as const;

export const payrollRunStatuses = ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED'] as const;

export const jobPostingStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'FILLED'] as const;

export const applicantStages = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'INTERVIEW_HR',
  'INTERVIEW_USER',
  'FLIGHT_CHECK',
  'ASSESSMENT',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
] as const;

export const kpiGrades = ['A', 'B', 'C', 'D', 'E'] as const;

export const kpiAssessmentStatuses = ['DRAFT', 'SELF_ASSESSED', 'REVIEWED', 'FINALIZED'] as const;

export const employmentTypes = ['PERMANENT', 'CONTRACT', 'PROBATION'] as const;

export const maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const;

export const genders = ['MALE', 'FEMALE'] as const;

export const departmentLevels = ['DIRECTORATE', 'DIVISION', 'DEPARTMENT', 'UNIT'] as const;

// ── Shared Helpers ────────────────────────────────────────────────────

const nullableId = z.string().trim().min(1).nullable().default(null);

// ── Employee Extended ─────────────────────────────────────────────────

export const employeeExtendedUpdateSchema = z.object({
  dateOfBirth: z.string().date().nullable().default(null),
  gender: z.enum(genders).nullable().default(null),
  identityNumber: z.string().trim().max(30).nullable().default(null),
  phone: z.string().trim().max(20).nullable().default(null),
  email: z.string().trim().email().max(120).nullable().default(null),
  address: z.string().trim().max(500).nullable().default(null),
  joinDate: z.string().date().nullable().default(null),
  endDate: z.string().date().nullable().default(null),
  employmentType: z.enum(employmentTypes).default('PERMANENT'),
  managerId: nullableId,
  crewId: nullableId,
  taxIdNumber: z.string().trim().max(30).nullable().default(null),
  bankName: z.string().trim().max(80).nullable().default(null),
  bankAccountNumber: z.string().trim().max(30).nullable().default(null),
  bankAccountName: z.string().trim().max(120).nullable().default(null),
  bpjsKesehatanNumber: z.string().trim().max(20).nullable().default(null),
  bpjsTkNumber: z.string().trim().max(20).nullable().default(null),
  maritalStatus: z.enum(maritalStatuses).default('SINGLE'),
  numberOfDependents: z.coerce.number().int().min(0).max(10).default(0),
  ptkpStatus: z.string().trim().max(10).default('TK/0'),
  basicSalary: z.coerce.number().min(0).nullable().optional(),
  positionAllowance: z.coerce.number().min(0).nullable().optional(),
  flightRatePerHour: z.coerce.number().min(0).nullable().optional()
});

export const employeeListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  departmentId: z.string().trim().min(1).optional(),
  stationId: z.string().trim().min(1).optional(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  employmentType: z.enum(employmentTypes).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

// ── Employee Import ───────────────────────────────────────────────────

export const employeeImportRowSchema = z.object({
  employeeCode: z.string().trim().min(2).max(30),
  fullName: z.string().trim().min(2).max(160),
  departmentCode: z.string().trim().min(1).max(20).optional(),
  positionTitle: z.string().trim().min(2).max(120),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  employmentType: z.enum(employmentTypes).default('PERMANENT'),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(genders).optional(),
  identityNumber: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(120).optional(),
  joinDate: z.string().date().optional(),
  bankName: z.string().trim().max(80).optional(),
  bankAccountNumber: z.string().trim().max(30).optional(),
  bankAccountName: z.string().trim().max(120).optional(),
  taxIdNumber: z.string().trim().max(30).optional()
});

export const employeeCreateSchema = z.object({
  employeeCode: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2).max(160),
  departmentId: nullableId,
  positionTitle: z.string().trim().min(2).max(120),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  employmentType: z.enum(employmentTypes).default('PERMANENT'),
  dateOfBirth: z.string().date().nullable().optional(),
  gender: z.enum(genders).nullable().optional(),
  identityNumber: z.string().trim().max(30).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().max(120).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  joinDate: z.string().date().nullable().optional(),
  taxIdNumber: z.string().trim().max(30).nullable().optional(),
  bankName: z.string().trim().max(80).nullable().optional(),
  bankAccountNumber: z.string().trim().max(30).nullable().optional(),
  bankAccountName: z.string().trim().max(120).nullable().optional(),
  bpjsKesehatanNumber: z.string().trim().max(30).nullable().optional(),
  bpjsTkNumber: z.string().trim().max(30).nullable().optional(),
  maritalStatus: z.enum(maritalStatuses).default('SINGLE'),
  numberOfDependents: z.coerce.number().int().min(0).default(0),
  ptkpStatus: z.string().trim().max(10).optional().default('TK/0'),
  basicSalary: z.coerce.number().min(0).nullable().optional(),
  positionAllowance: z.coerce.number().min(0).nullable().optional(),
  flightRatePerHour: z.coerce.number().min(0).nullable().optional()
});

export const employeeImportSchema = z.object({
  rows: z.array(employeeImportRowSchema).min(1).max(500)
});

// ── Certifications ────────────────────────────────────────────────────

export const certificationInputSchema = z.object({
  employeeId: z.string().trim().min(1),
  certificationType: z.enum(certificationTypes),
  certificateNumber: z.string().trim().min(1).max(60),
  issuingAuthority: z.string().trim().min(2).max(120),
  issuedDate: z.string().date(),
  expiryDate: z.string().date().nullable().default(null),
  status: z.enum(certificationStatuses).default('ACTIVE'),
  remarks: z.string().trim().max(500).nullable().default(null),
  documentUrl: z.string().trim().max(300).nullable().optional().default(null)
});

export const certificationUpdateSchema = certificationInputSchema.partial();

export const certificationListQuerySchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  certificationType: z.enum(certificationTypes).optional(),
  status: z.enum(certificationStatuses).optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional()
});

// ── Attendance ────────────────────────────────────────────────────────

export const attendanceCheckInSchema = z.object({
  stationId: z.string().trim().min(1),
  note: z.string().trim().max(500).nullable().default(null),
  checkInTime: z.string().trim().optional()
});

export const attendanceCheckOutSchema = z.object({
  note: z.string().trim().max(500).nullable().default(null),
  checkOutTime: z.string().trim().optional()
});

export const attendanceManualSchema = z.object({
  employeeId: z.string().trim().min(1),
  attendanceDate: z.string().date(),
  stationId: z.string().trim().min(1),
  checkIn: z.string().trim().optional(),
  checkOut: z.string().trim().optional(),
  status: z.enum(attendanceStatuses),
  source: z.enum(attendanceSources).default('MANUAL'),
  checkInNote: z.string().trim().max(500).nullable().default(null),
  checkOutNote: z.string().trim().max(500).nullable().default(null)
});

export const attendanceListQuerySchema = z.object({
  stationId: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2040).optional()
});

// ── Leave ─────────────────────────────────────────────────────────────

export const leaveRequestInputSchema = z.object({
  employeeId: z.string().trim().min(1),
  leaveTypeId: z.string().trim().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  totalDays: z.coerce.number().positive(),
  reason: z.string().trim().max(500).nullable().default(null)
});

export const leaveRejectSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(500)
});

export const leaveListQuerySchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  status: z.enum(leaveRequestStatuses).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional()
});

// ── Overtime ──────────────────────────────────────────────────────────

export const overtimeRequestInputSchema = z.object({
  employeeId: z.string().trim().min(1),
  overtimeDate: z.string().date(),
  startTime: z.string().trim().min(5),
  endTime: z.string().trim().min(5),
  totalHours: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(500)
});

export const overtimeListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  employeeId: z.string().trim().min(1).optional(),
  status: z.enum(overtimeRequestStatuses).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2040).optional()
});

// ── Shift & Roster ────────────────────────────────────────────────────

export const shiftPatternInputSchema = z.object({
  shiftCode: z.string().trim().min(2).max(20),
  shiftName: z.string().trim().min(2).max(60),
  rosterType: z.enum(rosterTypes).optional().default('SHIFT'),
  startTime: z.string().trim().min(5),
  endTime: z.string().trim().min(5),
  breakDurationMinutes: z.coerce.number().int().min(0).max(120).default(60),
  isNightShift: z.boolean().default(false),
  colorCode: z.string().trim().max(20).optional().default('#1976D2')
});

export const crewScheduleInputSchema = z.object({
  employeeId: z.string().trim().min(1).optional(),
  employeeIds: z.array(z.string().trim().min(1)).optional(),
  scheduleDate: z.string().date(),
  shiftId: nullableId,
  stationId: nullableId,
  flightOperationId: nullableId,
  rosterType: z.enum(rosterTypes),
  notes: z.string().trim().max(500).nullable().default(null)
});

export const crewScheduleListQuerySchema = z.object({
  weekStartDate: z.string().date().optional(),
  stationId: z.string().trim().min(1).optional(),
  employeeId: z.string().trim().min(1).optional(),
  rosterType: z.enum(rosterTypes).optional()
});

// ── Payroll ───────────────────────────────────────────────────────────

export const payrollComponentInputSchema = z.object({
  componentCode: z.string().trim().min(2).max(40),
  componentName: z.string().trim().min(2).max(80),
  componentType: z.enum(payrollComponentTypes),
  isTaxable: z.boolean().default(true),
  isFixed: z.boolean().default(true),
  formulaType: z.enum(formulaTypes).default('FIXED'),
  defaultAmount: z.coerce.number().int().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0).default(0)
});

export const payrollComponentUpdateSchema = payrollComponentInputSchema.partial();

export const allowanceRateInputSchema = z.object({
  componentId: z.string().trim().min(1),
  positionTitle: z.string().trim().min(2).max(120),
  grade: z.string().trim().max(20).nullable().default(null),
  ratePerHour: z.coerce.number().int().min(0).default(0),
  ratePerMonth: z.coerce.number().int().min(0).default(0),
  effectiveDate: z.string().date(),
  endDate: z.string().date().nullable().default(null)
});

export const allowanceRateUpdateSchema = allowanceRateInputSchema
  .omit({ componentId: true })
  .partial();

export const payrollRunCreateSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2040),
  runType: z.enum(['MONTHLY', 'THR']).optional().default('MONTHLY'),
  employeeIds: z.array(z.string()).optional(),
  notes: z.string().trim().max(500).nullable().default(null)
});

export const payrollRunQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: z.enum(payrollRunStatuses).optional(),
  runType: z.enum(['MONTHLY', 'THR']).optional(),
  year: z.coerce.number().int().min(2020).max(2040).optional()
});

export const payslipAdjustmentSchema = z.object({
  componentCode: z.string().trim().min(2).max(40),
  amount: z.coerce.number(),
  notes: z.string().trim().max(200).optional()
});

// ── Recruitment ───────────────────────────────────────────────────────

export const jobPostingInputSchema = z.object({
  positionTitle: z.string().trim().min(2).max(120),
  departmentId: z.string().trim().min(1),
  stationId: nullableId,
  employmentType: z.enum(employmentTypes).default('PERMANENT'),
  description: z.string().trim().max(2000).nullable().default(null),
  requirements: z.string().trim().max(2000).nullable().default(null),
  vacancies: z.coerce.number().int().min(1).max(50).default(1),
  status: z.enum(jobPostingStatuses).optional().default('OPEN')
});

export const applicantInputSchema = z.object({
  jobPostingId: z.string().trim().min(1),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(120).nullable().default(null),
  phone: z.string().trim().max(20).nullable().default(null),
  resumeReference: z.string().trim().max(240).nullable().default(null),
  notes: z.string().trim().max(1000).nullable().default(null)
});

export const applicantStageUpdateSchema = z.object({
  stage: z.enum(applicantStages),
  interviewerEmployeeId: nullableId.optional(),
  interviewScheduledAt: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().default(null)
});

// ── KPI ───────────────────────────────────────────────────────────────

export const kpiPeriodInputSchema = z.object({
  periodName: z.string().trim().min(2).max(80),
  startDate: z.string().date(),
  endDate: z.string().date()
});

export const kpiIndicatorInputSchema = z.object({
  indicatorName: z.string().trim().min(2).max(120),
  weight: z.coerce.number().min(0).max(100).default(0),
  targetValue: z.string().trim().max(100).nullable().default(null),
  unit: z.string().trim().max(40).nullable().default(null)
});

export const kpiTemplateInputSchema = z.object({
  templateName: z.string().trim().min(2).max(120),
  departmentId: nullableId,
  indicators: z.array(kpiIndicatorInputSchema).optional().default([])
});

export const kpiAssignMultiSchema = z.object({
  periodId: z.string().trim().min(1),
  templateId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1).optional(),
  employeeIds: z.array(z.string().trim().min(1)).optional(),
  assessorId: nullableId,
  notes: z.string().trim().max(1000).nullable().default(null)
});

export const kpiAssessmentInputSchema = kpiAssignMultiSchema;

export const kpiAssessmentUpdateSchema = z.object({
  overallScore: z.coerce.number().min(0).max(100).optional(),
  overallGrade: z.enum(kpiGrades).optional(),
  status: z.enum(kpiAssessmentStatuses).optional(),
  notes: z.string().trim().max(1000).nullable().default(null),
  scores: z
    .array(
      z.object({
        indicatorId: z.string().trim().min(1),
        actualValue: z.string().trim().max(120).nullable().default(null),
        score: z.coerce.number().min(0).max(100).optional(),
        notes: z.string().trim().max(500).nullable().default(null)
      })
    )
    .optional()
});

// ── Employee Auth ─────────────────────────────────────────────────────

export const employeeLoginSchema = z.object({
  employeeCode: z.string().trim().min(2).max(30),
  pin: z.string().trim().length(6)
});

export const employeeSetPinSchema = z.object({
  pin: z.string().trim().length(6)
});

// ── Type Exports ──────────────────────────────────────────────────────

export type EmployeeExtendedUpdate = z.infer<typeof employeeExtendedUpdateSchema>;
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;
export type CertificationInput = z.infer<typeof certificationInputSchema>;
export type CertificationUpdate = z.infer<typeof certificationUpdateSchema>;
export type CertificationListQuery = z.infer<typeof certificationListQuerySchema>;
export type AttendanceCheckInInput = z.infer<typeof attendanceCheckInSchema>;
export type AttendanceCheckOutInput = z.infer<typeof attendanceCheckOutSchema>;
export type AttendanceManualInput = z.infer<typeof attendanceManualSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestInputSchema>;
export type LeaveRejectInput = z.infer<typeof leaveRejectSchema>;
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;
export type OvertimeRequestInput = z.infer<typeof overtimeRequestInputSchema>;
export type OvertimeListQuery = z.infer<typeof overtimeListQuerySchema>;
export type ShiftPatternInput = z.infer<typeof shiftPatternInputSchema>;
export type CrewScheduleInput = z.infer<typeof crewScheduleInputSchema>;
export type CrewScheduleListQuery = z.infer<typeof crewScheduleListQuerySchema>;
export type PayrollComponentInput = z.infer<typeof payrollComponentInputSchema>;
export type AllowanceRateInput = z.infer<typeof allowanceRateInputSchema>;
export type AllowanceRateUpdate = z.infer<typeof allowanceRateUpdateSchema>;
export type PayrollRunCreate = z.input<typeof payrollRunCreateSchema>;
export type PayrollRunQuery = z.infer<typeof payrollRunQuerySchema>;
export type PayslipAdjustmentInput = z.infer<typeof payslipAdjustmentSchema>;
export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;
export type ApplicantInput = z.infer<typeof applicantInputSchema>;
export type ApplicantStageUpdate = z.infer<typeof applicantStageUpdateSchema>;
export type KpiPeriodInput = z.infer<typeof kpiPeriodInputSchema>;
export type KpiIndicatorInput = z.infer<typeof kpiIndicatorInputSchema>;
export type KpiTemplateInput = z.infer<typeof kpiTemplateInputSchema>;
export type KpiAssignMultiInput = z.infer<typeof kpiAssignMultiSchema>;
export type KpiAssessmentInput = z.infer<typeof kpiAssessmentInputSchema>;
export type KpiAssessmentUpdate = z.infer<typeof kpiAssessmentUpdateSchema>;
export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>;
