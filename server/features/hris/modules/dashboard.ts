import type Database from 'better-sqlite3';
import { CertificationModule } from './certification';
import { PayrollModule } from './payroll';
import { now, num, type Row } from './types';

export class DashboardModule {
  private certModule: CertificationModule;
  private payrollModule: PayrollModule;

  constructor(public readonly sqlite: Database.Database) {
    this.certModule = new CertificationModule(sqlite);
    this.payrollModule = new PayrollModule(sqlite);
  }

  getDashboardSummary() {
    const empTotal = num(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) count FROM employees WHERE employment_status = 'ACTIVE'")
          .get() as Row
      ).count
    );
    const certAlerts = this.certModule.getCertificationAlerts().length;

    const todayStr = now().slice(0, 10);
    const attendancesToday = this.sqlite
      .prepare(
        'SELECT status FROM hris_attendances WHERE attendance_date = ? AND check_in IS NOT NULL'
      )
      .all(todayStr) as Row[];

    const todayAttendanceCount = attendancesToday.length;
    const onTimeCount = attendancesToday.filter((a) => a.status === 'ON_TIME').length;
    const lateCount = attendancesToday.filter((a) => a.status === 'LATE').length;
    const attendanceRate = empTotal > 0 ? Math.round((todayAttendanceCount / empTotal) * 100) : 0;

    const pendingLeave = num(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) count FROM hris_leave_requests WHERE status = 'PENDING'")
          .get() as Row
      ).count
    );

    const pendingOvertime = num(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) count FROM hris_overtime_requests WHERE status = 'PENDING'")
          .get() as Row
      ).count
    );

    const openJobs = num(
      (
        this.sqlite
          .prepare("SELECT COUNT(*) count FROM hris_job_postings WHERE status = 'OPEN'")
          .get() as Row
      ).count
    );

    const totalApplicants = num(
      (this.sqlite.prepare('SELECT COUNT(*) count FROM hris_applicants').get() as Row).count
    );

    const departmentsBreakdown = (
      this.sqlite
        .prepare(
          `SELECT d.department_name, d.department_code, COUNT(e.id) count
         FROM departments d
         LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'ACTIVE'
         WHERE d.is_active = 1
         GROUP BY d.id
         ORDER BY count DESC`
        )
        .all() as Row[]
    ).map((r) => ({
      departmentName: String(r.department_name),
      departmentCode: String(r.department_code),
      count: num(r.count),
      percentage: empTotal > 0 ? Math.round((num(r.count) / empTotal) * 100) : 0
    }));

    const employmentTypeBreakdown = (
      this.sqlite
        .prepare(
          `SELECT employment_type, COUNT(*) count
         FROM employees
         WHERE employment_status = 'ACTIVE'
         GROUP BY employment_type`
        )
        .all() as Row[]
    ).map((r) => ({
      employmentType: String(r.employment_type ?? 'PERMANENT'),
      count: num(r.count),
      percentage: empTotal > 0 ? Math.round((num(r.count) / empTotal) * 100) : 0
    }));

    const stationBreakdown = (
      this.sqlite
        .prepare(
          `SELECT COALESCE(s.station_code, 'HQ Jayapura') station_code, COUNT(e.id) count
         FROM employees e
         LEFT JOIN stations s ON s.id = e.base_station_id
         WHERE e.employment_status = 'ACTIVE'
         GROUP BY s.id
         ORDER BY count DESC`
        )
        .all() as Row[]
    ).map((r) => ({
      stationCode: String(r.station_code),
      count: num(r.count),
      percentage: empTotal > 0 ? Math.round((num(r.count) / empTotal) * 100) : 0
    }));

    const lastRun = this.sqlite
      .prepare(
        'SELECT * FROM hris_payroll_runs ORDER BY period_year DESC, period_month DESC LIMIT 1'
      )
      .get() as Row | undefined;

    return {
      totalEmployees: empTotal,
      certificationAlertsCount: certAlerts,
      todayAttendanceCount,
      todayAttendanceRate: attendanceRate,
      onTimeCount,
      lateCount,
      pendingLeaveRequestsCount: pendingLeave,
      pendingOvertimeRequestsCount: pendingOvertime,
      openJobsCount: openJobs,
      totalApplicantsCount: totalApplicants,
      departmentsBreakdown,
      employmentTypeBreakdown,
      stationBreakdown,
      latestPayrollRun: lastRun ? this.payrollModule.getPayrollRun(String(lastRun.id)) : null
    };
  }
}
