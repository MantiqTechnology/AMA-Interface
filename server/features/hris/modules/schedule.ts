import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  CrewScheduleInput,
  CrewScheduleListQuery,
  ShiftPatternInput
} from '../../../../shared/features/hris';
import { DomainError, notFound } from '../../../utils/errors';
import { now, str, type Row } from './types';

export class ScheduleModule {
  constructor(public readonly sqlite: Database.Database) {}

  listShiftPatterns(rosterType?: string) {
    const where: string[] = ['is_active = 1'];
    const params: unknown[] = [];

    if (rosterType) {
      where.push('roster_type = ?');
      params.push(rosterType);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT * FROM hris_shift_patterns WHERE ${where.join(' AND ')} ORDER BY shift_code ASC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      shiftCode: String(r.shift_code),
      shiftName: String(r.shift_name),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      rosterType: String(r.roster_type ?? 'SHIFT'),
      colorCode: String(r.color_code ?? '#1976D2'),
      description: str(r.description)
    }));
  }

  createShiftPattern(
    input: Partial<ShiftPatternInput> & {
      shiftCode: string;
      shiftName: string;
      startTime: string;
      endTime: string;
      description?: string;
      colorCode?: string;
      rosterType?: string;
    }
  ) {
    try {
      this.sqlite.exec('ALTER TABLE hris_shift_patterns ADD COLUMN description TEXT');
    } catch {}
    const timestamp = now();
    const id = `shift-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_shift_patterns
         (id, shift_code, shift_name, start_time, end_time, roster_type, color_code, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        input.shiftCode,
        input.shiftName,
        input.startTime,
        input.endTime,
        input.rosterType ?? 'SHIFT',
        input.colorCode ?? '#1976D2',
        input.description ?? null,
        timestamp,
        timestamp
      );

    return this.listShiftPatterns().find((s) => s.id === id)!;
  }

  updateShiftPattern(
    id: string,
    input: Partial<ShiftPatternInput> & {
      description?: string;
      colorCode?: string;
      rosterType?: string;
    }
  ) {
    const timestamp = now();
    const existing = this.sqlite
      .prepare('SELECT id FROM hris_shift_patterns WHERE id = ?')
      .get(id) as Row | undefined;
    if (!existing) throw notFound('Shift Pattern', id);

    this.sqlite
      .prepare(
        `UPDATE hris_shift_patterns SET
          shift_code = COALESCE(?, shift_code),
          shift_name = COALESCE(?, shift_name),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          roster_type = COALESCE(?, roster_type),
          color_code = COALESCE(?, color_code),
          description = COALESCE(?, description),
          updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.shiftCode ?? null,
        input.shiftName ?? null,
        input.startTime ?? null,
        input.endTime ?? null,
        input.rosterType ?? null,
        input.colorCode ?? null,
        input.description ?? null,
        timestamp,
        id
      );

    return this.listShiftPatterns().find((s) => s.id === id)!;
  }

  deleteShiftPattern(id: string) {
    this.sqlite.prepare('UPDATE hris_shift_patterns SET is_active = 0 WHERE id = ?').run(id);
    return { success: true };
  }

  deleteCrewSchedule(id: string) {
    this.sqlite.prepare('DELETE FROM hris_crew_schedules WHERE id = ?').run(id);
    return { success: true };
  }

  private ensureScheduleColumns() {
    try {
      this.sqlite.exec('ALTER TABLE hris_crew_schedules ADD COLUMN duty_date TEXT');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_crew_schedules ADD COLUMN shift_pattern_id TEXT');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_crew_schedules ADD COLUMN flight_number TEXT');
    } catch {}
    try {
      this.sqlite.exec('ALTER TABLE hris_crew_schedules ADD COLUMN route TEXT');
    } catch {}
  }

  listCrewSchedules(
    query?: CrewScheduleListQuery & {
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      weekStartDate?: string;
    }
  ) {
    this.ensureScheduleColumns();
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query?.employeeId) {
      where.push('cs.employee_id = ?');
      params.push(query.employeeId);
    }
    if (query?.departmentId) {
      where.push('e.department_id = ?');
      params.push(query.departmentId);
    }
    const start = query?.startDate || query?.weekStartDate;
    if (start) {
      where.push('(cs.duty_date >= ? OR cs.schedule_date >= ?)');
      params.push(start, start);
    }
    if (query?.endDate) {
      where.push('(cs.duty_date <= ? OR cs.schedule_date <= ?)');
      params.push(query.endDate, query.endDate);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT cs.*, COALESCE(cs.duty_date, cs.schedule_date) duty_date, COALESCE(cs.shift_pattern_id, cs.shift_id) shift_pattern_id,
                e.employee_code, e.full_name employee_name, e.position_title, d.department_name, s.station_code,
                sp.shift_code, sp.shift_name, sp.start_time, sp.end_time, sp.color_code, sp.roster_type sp_roster_type
         FROM hris_crew_schedules cs
         JOIN employees e ON e.id = cs.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN stations s ON s.id = e.base_station_id
         JOIN hris_shift_patterns sp ON sp.id = COALESCE(cs.shift_pattern_id, cs.shift_id)
         WHERE ${where.join(' AND ')}
         ORDER BY COALESCE(cs.duty_date, cs.schedule_date) ASC`
      )
      .all(...params) as Row[];

    return rows.map((r) => {
      const rosterType = str(r.roster_type) || str(r.sp_roster_type) || 'SHIFT';
      const schedDate = str(r.duty_date) || str(r.schedule_date);
      return {
        id: String(r.id),
        employeeId: String(r.employee_id),
        employeeCode: String(r.employee_code),
        employeeName: String(r.employee_name),
        positionTitle: String(r.position_title),
        departmentName: str(r.department_name),
        stationCode: str(r.station_code) || 'DJJ',
        dutyDate: schedDate,
        scheduleDate: schedDate,
        shiftPatternId: String(r.shift_pattern_id),
        shiftCode: String(r.shift_code),
        shiftName: String(r.shift_name),
        startTime: String(r.start_time),
        endTime: String(r.end_time),
        colorCode: str(r.color_code),
        rosterType: rosterType,
        flightNumber: str(r.flight_number),
        route: str(r.route),
        notes: str(r.notes),
        status: String(r.status)
      };
    });
  }

  assignCrewSchedule(
    input: Partial<CrewScheduleInput> & {
      employeeId?: string;
      employeeIds?: string[];
      dutyDate?: string;
      scheduleDate?: string;
      shiftPatternId?: string | null;
      shiftId?: string | null;
      stationId?: string | null;
      flightOperationId?: string | null;
      flightNumber?: string | null;
      route?: string | null;
      rosterType?: string;
      notes?: string | null;
      status?: string;
    }
  ) {
    this.ensureScheduleColumns();
    const timestamp = now();
    const dutyDate = input.dutyDate || input.scheduleDate;
    const shiftPatternId = input.shiftPatternId || input.shiftId;

    if (!dutyDate || !shiftPatternId) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Duty date and shift pattern ID are required.',
        400
      );
    }

    const targetEmpIds =
      input.employeeIds && input.employeeIds.length > 0
        ? input.employeeIds
        : input.employeeId
          ? [input.employeeId]
          : [];

    if (targetEmpIds.length === 0) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Please select at least 1 employee for schedule assignment.',
        400
      );
    }

    this.sqlite.transaction(() => {
      for (const empId of targetEmpIds) {
        const existing = this.sqlite
          .prepare(
            'SELECT id FROM hris_crew_schedules WHERE employee_id = ? AND (duty_date = ? OR schedule_date = ?)'
          )
          .get(empId, dutyDate, dutyDate) as Row | undefined;

        if (existing) {
          this.sqlite
            .prepare(
              `UPDATE hris_crew_schedules SET
                duty_date = ?, schedule_date = ?, shift_pattern_id = ?, shift_id = ?, flight_number = ?, route = ?, status = COALESCE(?, status), updated_at = ?
               WHERE id = ?`
            )
            .run(
              dutyDate,
              dutyDate,
              shiftPatternId,
              shiftPatternId,
              input.flightNumber ?? null,
              input.route ?? null,
              input.status ?? null,
              timestamp,
              existing.id
            );
        } else {
          const id = `cs-${nanoid(10)}`;
          this.sqlite
            .prepare(
              `INSERT INTO hris_crew_schedules
               (id, employee_id, duty_date, schedule_date, shift_pattern_id, shift_id, flight_number, route, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              id,
              empId,
              dutyDate,
              dutyDate,
              shiftPatternId,
              shiftPatternId,
              input.flightNumber ?? null,
              input.route ?? null,
              input.status ?? 'SCHEDULED',
              timestamp,
              timestamp
            );
        }
      }
    })();

    return this.listCrewSchedules({ startDate: dutyDate, endDate: dutyDate });
  }

  getFlightRoster(date?: string) {
    const dutyDate = date || now().slice(0, 10);
    return this.listCrewSchedules({ startDate: dutyDate, endDate: dutyDate });
  }
}
