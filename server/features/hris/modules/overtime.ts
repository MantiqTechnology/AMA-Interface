import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { OvertimeListQuery, OvertimeRequestInput } from '../../../../shared/features/hris';
import { notFound } from '../../../utils/errors';
import { generateNextNumber, now, num, str, type Row } from './types';

export class OvertimeModule {
  constructor(public readonly sqlite: Database.Database) {}

  listOvertimeRequests(query: OvertimeListQuery) {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query.employeeId) {
      where.push('o.employee_id = ?');
      params.push(query.employeeId);
    }
    if (query.status) {
      where.push('o.status = ?');
      params.push(query.status);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT o.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name,
                app.full_name approver_name
         FROM hris_overtime_requests o
         JOIN employees e ON e.id = o.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN employees app ON app.id = o.approved_by
         WHERE ${where.join(' AND ')}
         ORDER BY o.overtime_date DESC`
      )
      .all(...params) as Row[];

    return rows.map((r) => ({
      id: String(r.id),
      requestNumber: String(r.request_number),
      employeeId: String(r.employee_id),
      employeeCode: String(r.employee_code),
      employeeName: String(r.employee_name),
      positionTitle: String(r.position_title),
      departmentName: str(r.department_name),
      overtimeDate: String(r.overtime_date),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      totalHours: num(r.total_hours),
      reason: String(r.reason),
      status: String(r.status),
      approverName: str(r.approver_name),
      approvedAt: str(r.approved_at),
      createdAt: String(r.created_at)
    }));
  }

  createOvertimeRequest(input: OvertimeRequestInput) {
    const timestamp = now();
    const reqNum = generateNextNumber(this.sqlite, 'OVERTIME_REQUEST', 'OVT');
    const id = `ovt-${nanoid(10)}`;

    const [h1, m1] = input.startTime.split(':').map(Number);
    const [h2, m2] = input.endTime.split(':').map(Number);
    const totalHours = Math.max(0.5, Math.round(((h2 * 60 + m2 - (h1 * 60 + m1)) / 60) * 10) / 10);

    this.sqlite
      .prepare(
        `INSERT INTO hris_overtime_requests
         (id, request_number, employee_id, overtime_date, start_time, end_time, total_hours, reason, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
      )
      .run(
        id,
        reqNum,
        input.employeeId,
        input.overtimeDate,
        input.startTime,
        input.endTime,
        totalHours,
        input.reason,
        timestamp,
        timestamp
      );

    return this.listOvertimeRequests({ employeeId: input.employeeId }).find((r) => r.id === id)!;
  }

  approveOvertimeRequest(id: string, approverId: string) {
    const req = this.listOvertimeRequests({}).find((r) => r.id === id);
    if (!req) throw notFound('Overtime Request', id);

    const timestamp = now();
    this.sqlite
      .prepare(
        "UPDATE hris_overtime_requests SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
      )
      .run(approverId, timestamp, timestamp, id);

    return this.listOvertimeRequests({}).find((r) => r.id === id)!;
  }
}
