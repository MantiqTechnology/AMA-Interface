import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceListQuery,
  AttendanceManualInput
} from '../../../../shared/features/hris';
import { DomainError, notFound } from '../../../utils/errors';
import { now, num, str, type Row } from './types';

export class AttendanceModule {
  constructor(public readonly sqlite: Database.Database) {}

  private ensureAttendanceColumns() {
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_in_lat REAL');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_in_lng REAL');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_in_photo TEXT');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_out_lat REAL');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_out_lng REAL');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN check_out_photo TEXT');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_attendances ADD COLUMN work_hours REAL');
    } catch {}
  }

  checkIn(
    employeeId: string,
    input?: Partial<AttendanceCheckInInput> & { lat?: number; lng?: number; photoUrl?: string }
  ) {
    this.ensureAttendanceColumns();
    const today = now().slice(0, 10);
    const timeStr = now().slice(11, 19);

    const emp = this.sqlite.prepare('SELECT id FROM employees WHERE id = ?').get(employeeId) as
      Row | undefined;
    if (!emp) throw notFound('Employee', employeeId);

    const existing = this.sqlite
      .prepare('SELECT * FROM hris_attendances WHERE employee_id = ? AND attendance_date = ?')
      .get(employeeId, today) as Row | undefined;

    if (existing && existing.check_in) {
      throw new DomainError('ALREADY_CHECKED_IN', 'Employee has already checked in today.', 400);
    }

    const isLate = timeStr > '08:00:00';
    const status = isLate ? 'LATE' : 'ON_TIME';

    if (existing) {
      this.sqlite
        .prepare(
          `UPDATE hris_attendances SET
            check_in = ?, check_in_lat = ?, check_in_lng = ?, check_in_photo = ?, status = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          timeStr,
          input?.lat ?? null,
          input?.lng ?? null,
          input?.photoUrl ?? null,
          status,
          now(),
          existing.id
        );
    } else {
      const id = `att-${nanoid(10)}`;
      this.sqlite
        .prepare(
          `INSERT INTO hris_attendances
           (id, employee_id, attendance_date, check_in, check_in_lat, check_in_lng, check_in_photo, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          employeeId,
          today,
          timeStr,
          input?.lat ?? null,
          input?.lng ?? null,
          input?.photoUrl ?? null,
          status,
          now(),
          now()
        );
    }

    return this.listAttendance({ employeeId, date: today })[0];
  }

  checkOut(
    employeeId: string,
    input?: Partial<AttendanceCheckOutInput> & { lat?: number; lng?: number; photoUrl?: string }
  ) {
    this.ensureAttendanceColumns();
    const today = now().slice(0, 10);
    const timeStr = now().slice(11, 19);

    const att = this.sqlite
      .prepare('SELECT * FROM hris_attendances WHERE employee_id = ? AND attendance_date = ?')
      .get(employeeId, today) as Row | undefined;

    if (!att || !att.check_in) {
      throw new DomainError('NOT_CHECKED_IN', 'Employee has not checked in today.', 400);
    }

    let workHours = 0;
    if (att.check_in) {
      const cin = String(att.check_in);
      const [h1, m1] = cin.split(':').map(Number);
      const [h2, m2] = timeStr.split(':').map(Number);
      workHours = Math.max(0, Math.round(((h2 * 60 + m2 - (h1 * 60 + m1)) / 60) * 10) / 10);
    }

    this.sqlite
      .prepare(
        `UPDATE hris_attendances SET
          check_out = ?, check_out_lat = ?, check_out_lng = ?, check_out_photo = ?, work_hours = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        timeStr,
        input?.lat ?? null,
        input?.lng ?? null,
        input?.photoUrl ?? null,
        workHours,
        now(),
        att.id
      );

    return this.listAttendance({ employeeId, date: today })[0];
  }

  recordManualAttendance(
    input: Partial<AttendanceManualInput> & {
      employeeId: string;
      date?: string;
      attendanceDate?: string;
      checkIn?: string | null;
      checkOut?: string | null;
      status: string;
      remarks?: string | null;
      checkInNote?: string | null;
      checkOutNote?: string | null;
    }
  ) {
    const targetDate = input.attendanceDate || input.date || now().slice(0, 10);
    const emp = this.sqlite
      .prepare('SELECT id FROM employees WHERE id = ?')
      .get(input.employeeId) as Row | undefined;
    if (!emp) throw notFound('Employee', input.employeeId);

    const existing = this.sqlite
      .prepare('SELECT id FROM hris_attendances WHERE employee_id = ? AND attendance_date = ?')
      .get(input.employeeId, targetDate) as Row | undefined;

    let workHours = 0;
    if (input.checkIn && input.checkOut) {
      const [h1, m1] = input.checkIn.split(':').map(Number);
      const [h2, m2] = input.checkOut.split(':').map(Number);
      workHours = Math.max(0, Math.round(((h2 * 60 + m2 - (h1 * 60 + m1)) / 60) * 10) / 10);
    }

    if (existing) {
      this.sqlite
        .prepare(
          `UPDATE hris_attendances SET
            check_in = ?, check_out = ?, status = ?, work_hours = ?, remarks = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          input.checkIn ?? null,
          input.checkOut ?? null,
          input.status,
          workHours,
          input.remarks ?? null,
          now(),
          existing.id
        );
    } else {
      const id = `att-${nanoid(10)}`;
      this.sqlite
        .prepare(
          `INSERT INTO hris_attendances
           (id, employee_id, attendance_date, check_in, check_out, status, work_hours, remarks, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.employeeId,
          targetDate,
          input.checkIn ?? null,
          input.checkOut ?? null,
          input.status,
          workHours,
          input.remarks ?? null,
          now(),
          now()
        );
    }

    return this.listAttendance({ employeeId: input.employeeId, date: targetDate })[0];
  }

  listAttendance(
    query?: AttendanceListQuery & {
      employeeId?: string;
      departmentId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ) {
    this.ensureAttendanceColumns();
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query?.employeeId) {
      where.push('a.employee_id = ?');
      params.push(query.employeeId);
    }
    if (query?.departmentId) {
      where.push('e.department_id = ?');
      params.push(query.departmentId);
    }
    if (query?.date) {
      where.push('a.attendance_date = ?');
      params.push(query.date);
    }
    if (query?.startDate) {
      where.push('a.attendance_date >= ?');
      params.push(query.startDate);
    }
    if (query?.endDate) {
      where.push('a.attendance_date <= ?');
      params.push(query.endDate);
    }
    if (query?.status) {
      where.push('a.status = ?');
      params.push(query.status);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT a.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name, s.station_code
         FROM hris_attendances a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN stations s ON s.id = e.base_station_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.attendance_date DESC, a.check_in DESC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      employeeId: String(r.employee_id),
      employeeCode: String(r.employee_code),
      employeeName: String(r.employee_name),
      positionTitle: String(r.position_title),
      departmentName: str(r.department_name),
      stationCode: str(r.station_code) || 'DJJ',
      attendanceDate: String(r.attendance_date),
      checkIn: str(r.check_in),
      checkOut: str(r.check_out),
      checkInPhoto: str(r.check_in_photo),
      checkOutPhoto: str(r.check_out_photo),
      status: String(r.status),
      workHours: num(r.work_hours),
      remarks: str(r.remarks),
      checkInNote: str(r.remarks) || str(r.check_in_note) || str(r.notes),
      source: str(r.source) || str(r.attendance_source) || (r.check_in ? 'MOBILE_APP' : 'MANUAL'),
      updatedAt: String(r.updated_at)
    }));
  }

  getAttendanceSummary(year?: number, month?: number, stationId?: string) {
    this.ensureAttendanceColumns();

    const where: string[] = [
      "(e.employment_status = 'ACTIVE' OR e.employment_status IS NULL OR e.employment_status = 'active')"
    ];
    const params: unknown[] = [];

    let dateJoinCondition = '';
    if (year && month) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      dateJoinCondition = 'AND strftime("%Y-%m", a.attendance_date) = ?';
      params.push(monthStr);
    }

    if (stationId) {
      where.push('e.base_station_id = ?');
      params.push(stationId);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT e.id employee_id, e.employee_code, e.full_name, e.position_title, d.department_name,
                COUNT(a.id) total_days,
                SUM(CASE WHEN a.status = 'ON_TIME' OR a.status = 'PRESENT' THEN 1 ELSE 0 END) on_time_count,
                SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) late_count,
                SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) absent_count,
                SUM(CASE WHEN a.status = 'LEAVE' OR a.status = 'ON_LEAVE' THEN 1 ELSE 0 END) leave_count,
                SUM(COALESCE(a.work_hours, 0)) total_work_hours
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN hris_attendances a ON a.employee_id = e.id ${dateJoinCondition}
         WHERE ${where.join(' AND ')}
         GROUP BY e.id
         ORDER BY e.full_name ASC`
      )
      .all(...params) as Row[];

    const items = rows.map((r) => {
      const onTime = num(r.on_time_count);
      const late = num(r.late_count);
      return {
        employeeId: String(r.employee_id),
        employeeCode: String(r.employee_code),
        employeeName: String(r.full_name),
        positionTitle: String(r.position_title),
        departmentName: str(r.department_name),
        presentCount: onTime + late,
        onTimeCount: onTime,
        lateCount: late,
        absentCount: num(r.absent_count),
        leaveCount: num(r.leave_count),
        totalWorkHours: num(r.total_work_hours)
      };
    });

    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalWorkHours = 0;

    for (const item of items) {
      presentCount += item.presentCount;
      lateCount += item.lateCount;
      leaveCount += item.leaveCount;
      absentCount += item.absentCount;
      totalWorkHours += item.totalWorkHours;
    }

    if (presentCount === 0 && lateCount === 0 && leaveCount === 0 && absentCount === 0) {
      try {
        const counts = this.sqlite
          .prepare(
            `SELECT
               SUM(CASE WHEN status = 'PRESENT' OR status = 'ON_TIME' THEN 1 ELSE 0 END) present_cnt,
               SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) late_cnt,
               SUM(CASE WHEN status = 'LEAVE' OR status = 'ON_LEAVE' THEN 1 ELSE 0 END) leave_cnt,
               SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) absent_cnt
             FROM hris_attendances`
          )
          .get() as Row | undefined;

        if (counts) {
          presentCount = num(counts.present_cnt);
          lateCount = num(counts.late_cnt);
          leaveCount = num(counts.leave_cnt);
          absentCount = num(counts.absent_cnt);
        }
      } catch {}
    }

    return {
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      totalWorkHours,
      items
    };
  }
}
