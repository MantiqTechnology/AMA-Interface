import type Database from 'better-sqlite3';
import { AttendanceModule } from './modules/attendance';
import { CertificationModule } from './modules/certification';
import { DashboardModule } from './modules/dashboard';
import { EmployeeModule } from './modules/employee';
import { KpiModule } from './modules/kpi';
import { LeaveModule } from './modules/leave';
import { OrganizationModule } from './modules/organization';
import { OvertimeModule } from './modules/overtime';
import { PayrollModule } from './modules/payroll';
import type { FinanceHandoffService } from '../finance/handoffs/service';
import { RecruitmentModule } from './modules/recruitment';
import { ScheduleModule } from './modules/schedule';

export class HrisService {
  private employeeMod: EmployeeModule;
  private certMod: CertificationModule;
  private attendanceMod: AttendanceModule;
  private leaveMod: LeaveModule;
  private overtimeMod: OvertimeModule;
  private scheduleMod: ScheduleModule;
  private payrollMod: PayrollModule;
  private recruitmentMod: RecruitmentModule;
  private kpiMod: KpiModule;
  private orgMod: OrganizationModule;
  private dashMod: DashboardModule;

  constructor(
    public readonly sqlite: Database.Database,
    financeHandoffs?: FinanceHandoffService
  ) {
    this.employeeMod = new EmployeeModule(sqlite);
    this.certMod = new CertificationModule(sqlite);
    this.attendanceMod = new AttendanceModule(sqlite);
    this.leaveMod = new LeaveModule(sqlite);
    this.overtimeMod = new OvertimeModule(sqlite);
    this.scheduleMod = new ScheduleModule(sqlite);
    this.payrollMod = new PayrollModule(sqlite, financeHandoffs);
    this.recruitmentMod = new RecruitmentModule(sqlite);
    this.kpiMod = new KpiModule(sqlite);
    this.orgMod = new OrganizationModule(sqlite);
    this.dashMod = new DashboardModule(sqlite);
  }

  // ── Employee Module ──────────────────────────────────────────────────
  resolveEmployeeId(actorOrEmpId?: string | null) {
    return this.employeeMod.resolveEmployeeId(actorOrEmpId);
  }
  listDepartments() {
    return this.employeeMod.listDepartments();
  }
  listEmployees(query?: Parameters<EmployeeModule['listEmployees']>[0]) {
    return this.employeeMod.listEmployees(query || {});
  }
  getEmployee(id: string) {
    return this.employeeMod.getEmployee(id);
  }
  createEmployee(input: Parameters<EmployeeModule['createEmployee']>[0]) {
    return this.employeeMod.createEmployee(input);
  }
  updateEmployeeBiodata(id: string, input: Parameters<EmployeeModule['updateEmployeeBiodata']>[1]) {
    return this.employeeMod.updateEmployeeBiodata(id, input);
  }
  importEmployees(rows: Parameters<EmployeeModule['importEmployees']>[0]) {
    return this.employeeMod.importEmployees(rows);
  }
  setEmployeePin(id: string, pin: string) {
    return this.employeeMod.setEmployeePin(id, pin);
  }
  verifyEmployeeLogin(employeeCode: string, pin: string) {
    return this.employeeMod.verifyEmployeeLogin(employeeCode, pin);
  }

  // ── Certification Module ─────────────────────────────────────────────
  listCertifications(query?: Parameters<CertificationModule['listCertifications']>[0]) {
    return this.certMod.listCertifications(query || {});
  }
  createCertification(input: Parameters<CertificationModule['createCertification']>[0]) {
    return this.certMod.createCertification(input);
  }
  updateCertification(
    id: string,
    input: Parameters<CertificationModule['updateCertification']>[1]
  ) {
    return this.certMod.updateCertification(id, input);
  }
  deleteCertification(id: string) {
    return this.certMod.deleteCertification(id);
  }
  notifyEmployeeCertification(id: string) {
    return this.certMod.notifyEmployeeCertification(id);
  }
  getCertificationAlerts() {
    return this.certMod.getCertificationAlerts();
  }

  // ── Attendance Module ────────────────────────────────────────────────
  checkIn(employeeId: string, input: Parameters<AttendanceModule['checkIn']>[1]) {
    return this.attendanceMod.checkIn(employeeId, input);
  }
  checkOut(employeeId: string, input: Parameters<AttendanceModule['checkOut']>[1]) {
    return this.attendanceMod.checkOut(employeeId, input);
  }
  recordManualAttendance(input: Parameters<AttendanceModule['recordManualAttendance']>[0]) {
    return this.attendanceMod.recordManualAttendance(input);
  }
  listAttendance(query?: Parameters<AttendanceModule['listAttendance']>[0]) {
    return this.attendanceMod.listAttendance(query || {});
  }
  getAttendanceSummary(year?: number, month?: number, stationId?: string) {
    return this.attendanceMod.getAttendanceSummary(year, month, stationId);
  }

  // ── Leave Module ─────────────────────────────────────────────────────
  listLeaveTypes() {
    return this.leaveMod.listLeaveTypes();
  }
  getLeaveBalance(employeeId: string, year?: number) {
    return this.leaveMod.getLeaveBalance(employeeId, year);
  }
  listLeaveRequests(query?: Parameters<LeaveModule['listLeaveRequests']>[0]) {
    return this.leaveMod.listLeaveRequests(query || {});
  }
  createLeaveRequest(input: Parameters<LeaveModule['createLeaveRequest']>[0]) {
    return this.leaveMod.createLeaveRequest(input);
  }
  approveLeaveRequest(id: string, approverId: string) {
    return this.leaveMod.approveLeaveRequest(id, approverId);
  }
  rejectLeaveRequest(id: string, reason: string) {
    return this.leaveMod.rejectLeaveRequest(id, reason);
  }
  cancelLeaveRequest(id: string) {
    return this.leaveMod.cancelLeaveRequest(id);
  }

  // ── Overtime Module ──────────────────────────────────────────────────
  listOvertimeRequests(query?: Parameters<OvertimeModule['listOvertimeRequests']>[0]) {
    return this.overtimeMod.listOvertimeRequests(query || {});
  }
  createOvertimeRequest(input: Parameters<OvertimeModule['createOvertimeRequest']>[0]) {
    return this.overtimeMod.createOvertimeRequest(input);
  }
  approveOvertimeRequest(id: string, approverId: string) {
    return this.overtimeMod.approveOvertimeRequest(id, approverId);
  }

  // ── Schedule Module ──────────────────────────────────────────────────
  listShiftPatterns(rosterType?: string) {
    return this.scheduleMod.listShiftPatterns(rosterType);
  }
  createShiftPattern(input: Parameters<ScheduleModule['createShiftPattern']>[0]) {
    return this.scheduleMod.createShiftPattern(input);
  }
  updateShiftPattern(id: string, input: Parameters<ScheduleModule['updateShiftPattern']>[1]) {
    return this.scheduleMod.updateShiftPattern(id, input);
  }
  deleteShiftPattern(id: string) {
    return this.scheduleMod.deleteShiftPattern(id);
  }
  listCrewSchedules(query?: Parameters<ScheduleModule['listCrewSchedules']>[0]) {
    return this.scheduleMod.listCrewSchedules(query || {});
  }
  assignCrewSchedule(input: Parameters<ScheduleModule['assignCrewSchedule']>[0]) {
    return this.scheduleMod.assignCrewSchedule(input);
  }
  deleteCrewSchedule(id: string) {
    return this.scheduleMod.deleteCrewSchedule(id);
  }
  getFlightRoster(date?: string) {
    return this.scheduleMod.getFlightRoster(date);
  }

  // ── Payroll Module ───────────────────────────────────────────────────
  listPayrollComponents() {
    return this.payrollMod.listPayrollComponents();
  }
  createPayrollComponent(input: Parameters<PayrollModule['createPayrollComponent']>[0]) {
    return this.payrollMod.createPayrollComponent(input);
  }
  updatePayrollComponent(
    id: string,
    input: Parameters<PayrollModule['updatePayrollComponent']>[1]
  ) {
    return this.payrollMod.updatePayrollComponent(id, input);
  }
  deletePayrollComponent(id: string) {
    return this.payrollMod.deletePayrollComponent(id);
  }
  listAllowanceRates() {
    return this.payrollMod.listAllowanceRates();
  }
  createAllowanceRate(input: Parameters<PayrollModule['createAllowanceRate']>[0]) {
    return this.payrollMod.createAllowanceRate(input);
  }
  updateAllowanceRate(id: string, input: Parameters<PayrollModule['updateAllowanceRate']>[1]) {
    return this.payrollMod.updateAllowanceRate(id, input);
  }
  deleteAllowanceRate(id: string) {
    return this.payrollMod.deleteAllowanceRate(id);
  }
  listPayrollRuns(query?: Parameters<PayrollModule['listPayrollRuns']>[0]) {
    return this.payrollMod.listPayrollRuns(query);
  }
  getPayrollRun(id: string) {
    return this.payrollMod.getPayrollRun(id);
  }
  deletePayrollRun(id: string) {
    return this.payrollMod.deletePayrollRun(id);
  }
  removeEmployeeFromPayrollRun(runId: string, employeeId: string) {
    return this.payrollMod.removeEmployeeFromPayrollRun(runId, employeeId);
  }
  addEmployeesToPayrollRun(runId: string, employeeIds: string[]) {
    return this.payrollMod.addEmployeesToPayrollRun(runId, employeeIds);
  }
  calculatePayrollRun(id: string) {
    return this.payrollMod.getPayrollRun(id);
  }
  createPayrollRun(
    input: Parameters<PayrollModule['createPayrollRun']>[0],
    createdBy: string = 'usr-admin'
  ) {
    return this.payrollMod.createPayrollRun(input, createdBy);
  }
  adjustPayslipComponent(
    payslipId: string,
    input: Parameters<PayrollModule['adjustPayslipComponent']>[1]
  ) {
    return this.payrollMod.adjustPayslipComponent(payslipId, input);
  }
  approvePayrollRun(id: string, approverId: string) {
    return this.payrollMod.approvePayrollRun(id, approverId);
  }
  listPayslips(runId: string) {
    return this.payrollMod.listPayslips(runId);
  }
  getPayslip(payslipId: string) {
    return this.payrollMod.getPayslip(payslipId);
  }
  postPayrollJournal(runId: string) {
    return this.payrollMod.postPayrollJournal(runId);
  }

  // ── Recruitment Module ───────────────────────────────────────────────
  listJobPostings() {
    return this.recruitmentMod.listJobPostings();
  }
  createJobPosting(
    input: Parameters<RecruitmentModule['createJobPosting']>[0],
    createdBy: string = 'usr-admin'
  ) {
    return this.recruitmentMod.createJobPosting(input, createdBy);
  }
  updateJobPosting(id: string, input: Parameters<RecruitmentModule['updateJobPosting']>[1]) {
    return this.recruitmentMod.updateJobPosting(id, input);
  }
  deleteJobPosting(id: string) {
    return this.recruitmentMod.deleteJobPosting(id);
  }
  listApplicants(jobPostingId?: string) {
    return this.recruitmentMod.listApplicants(jobPostingId);
  }
  createApplicant(input: Parameters<RecruitmentModule['createApplicant']>[0]) {
    return this.recruitmentMod.createApplicant(input);
  }
  updateApplicantStage(
    id: string,
    input: Parameters<RecruitmentModule['updateApplicantStage']>[1]
  ) {
    return this.recruitmentMod.updateApplicantStage(id, input);
  }

  // ── KPI Module ───────────────────────────────────────────────────────
  listKpiPeriods() {
    return this.kpiMod.listKpiPeriods();
  }
  createKpiPeriod(input: Parameters<KpiModule['createKpiPeriod']>[0]) {
    return this.kpiMod.createKpiPeriod(input);
  }
  listKpiTemplates(departmentId?: string) {
    return this.kpiMod.listKpiTemplates(departmentId);
  }
  createKpiTemplate(input: Parameters<KpiModule['createKpiTemplate']>[0]) {
    return this.kpiMod.createKpiTemplate(input);
  }
  updateKpiTemplate(id: string, input: Parameters<KpiModule['updateKpiTemplate']>[1]) {
    return this.kpiMod.updateKpiTemplate(id, input);
  }
  deleteKpiTemplate(id: string) {
    return this.kpiMod.deleteKpiTemplate(id);
  }
  deleteKpiAssessment(id: string) {
    return this.kpiMod.deleteKpiAssessment(id);
  }
  listKpiAssessments(periodId?: string, employeeId?: string, departmentId?: string) {
    return this.kpiMod.listKpiAssessments(periodId, employeeId, departmentId);
  }
  createKpiAssessment(input: Parameters<KpiModule['createKpiAssessment']>[0]) {
    return this.kpiMod.createKpiAssessment(input);
  }
  updateKpiAssessment(id: string, input: Parameters<KpiModule['updateKpiAssessment']>[1]) {
    return this.kpiMod.updateKpiAssessment(id, input);
  }

  // ── Organization & Dashboard Modules ────────────────────────────────
  getOrgTree() {
    return this.orgMod.getOrgTree();
  }
  getDashboardSummary() {
    return this.dashMod.getDashboardSummary();
  }
}
