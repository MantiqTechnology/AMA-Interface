import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { LeaveListQuery, LeaveRequestInput } from '../../../../shared/features/hris';
import { DomainError, notFound } from '../../../utils/errors';
import { generateNextNumber, now, num, str, type Row } from './types';

export class LeaveModule {
  constructor(public readonly sqlite: Database.Database) {}

  listLeaveTypes() {
    const rows = this.sqlite
      .prepare('SELECT * FROM hris_leave_types WHERE is_active = 1 ORDER BY leave_name ASC')
      .all() as Row[];

    return rows.map((r) => {
      const code = str(r.leave_code) || str(r.type_code);
      const name = str(r.leave_name) || str(r.type_name);
      const quota =
        r.default_days !== undefined && r.default_days !== null
          ? num(r.default_days)
          : num(r.default_quota_days);
      return {
        id: String(r.id),
        typeCode: code,
        leaveCode: code,
        typeName: name,
        leaveName: name,
        defaultQuotaDays: quota || 12,
        isPaid: Boolean(r.is_paid),
        requiresDocument: Boolean(r.requires_attachment ?? r.requires_document)
      };
    });
  }

  getLeaveBalance(employeeId: string, year?: number) {
    const emp = this.sqlite.prepare('SELECT id FROM employees WHERE id = ?').get(employeeId) as
      Row | undefined;
    if (!emp) throw notFound('Employee', employeeId);

    const where = ['b.employee_id = ?'];
    const params: unknown[] = [employeeId];
    if (year) {
      where.push('b.period_year = ?');
      params.push(year);
    }

    const rows = this.sqlite
      .prepare(
        `SELECT b.*, COALESCE(t.leave_name, 'Cuti Tahunan') type_name, COALESCE(t.leave_code, 'ANNUAL') type_code, t.is_paid
         FROM hris_leave_balances b
         JOIN hris_leave_types t ON t.id = b.leave_type_id
         WHERE ${where.join(' AND ')}`
      )
      .all(...params) as Row[];

    if (rows.length === 0) {
      const types = this.listLeaveTypes();
      return types.map((t) => ({
        id: `bal-${t.id}`,
        leaveTypeId: t.id,
        leaveCode: t.typeCode || 'ANNUAL',
        leaveTypeCode: t.typeCode || 'ANNUAL',
        leaveName: t.typeName || 'Cuti Tahunan',
        leaveTypeName: t.typeName || 'Cuti Tahunan',
        quotaDays: t.defaultQuotaDays || 12,
        usedDays: 0,
        remainingDays: t.defaultQuotaDays || 12,
        isPaid: t.isPaid
      }));
    }

    return rows.map((r) => {
      const quotaDays =
        r.entitled_days !== undefined && r.entitled_days !== null
          ? num(r.entitled_days)
          : r.quota_days !== undefined && r.quota_days !== null
            ? num(r.quota_days)
            : 12;
      const usedDays = num(r.used_days);
      const code = str(r.type_code) || str(r.leave_code) || 'ANNUAL';
      const name = str(r.type_name) || str(r.leave_name) || 'Cuti Tahunan';
      return {
        id: String(r.id),
        leaveTypeId: String(r.leave_type_id),
        leaveCode: code,
        leaveTypeCode: code,
        leaveName: name,
        leaveTypeName: name,
        quotaDays,
        usedDays,
        remainingDays: quotaDays - usedDays,
        isPaid: Boolean(r.is_paid)
      };
    });
  }

  listLeaveRequests(query?: LeaveListQuery & { departmentId?: string; year?: number }) {
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    if (query?.employeeId) {
      where.push('l.employee_id = ?');
      params.push(query.employeeId);
    }
    if (query?.departmentId) {
      where.push('e.department_id = ?');
      params.push(query.departmentId);
    }
    if (query?.status) {
      where.push('l.status = ?');
      params.push(query.status);
    }
    if (query?.year) {
      where.push('strftime("%Y", l.start_date) = ?');
      params.push(String(query.year));
    }

    const rows = this.sqlite
      .prepare(
        `SELECT l.*, e.employee_code, e.full_name employee_name, e.position_title, d.department_name,
                COALESCE(t.leave_name, 'Cuti Tahunan') type_name, COALESCE(t.leave_code, 'ANNUAL') type_code, app.full_name approver_name
         FROM hris_leave_requests l
         JOIN employees e ON e.id = l.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         JOIN hris_leave_types t ON t.id = l.leave_type_id
         LEFT JOIN employees app ON app.id = l.approved_by
         WHERE ${where.join(' AND ')}
         ORDER BY l.created_at DESC`
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
      leaveTypeId: String(r.leave_type_id),
      leaveCode: String(r.type_code),
      leaveTypeCode: String(r.type_code),
      leaveName: String(r.type_name),
      leaveTypeName: String(r.type_name),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      totalDays: num(r.total_days),
      reason: String(r.reason),
      documentUrl: str(r.document_url),
      status: String(r.status),
      approverName: str(r.approver_name),
      approvedAt: str(r.approved_at),
      createdAt: String(r.created_at)
    }));
  }

  createLeaveRequest(input: LeaveRequestInput & { documentUrl?: string }) {
    try {
      this.sqlite.exec('ALTER TABLE hris_leave_requests ADD COLUMN document_url TEXT');
    } catch {}
    const timestamp = now();

    const d1 = new Date(input.startDate);
    const d2 = new Date(input.endDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const currentYear = Number(input.startDate.slice(0, 4));
    const balance = this.getLeaveBalance(input.employeeId, currentYear).find(
      (b) => b.leaveTypeId === input.leaveTypeId
    );

    if (balance && balance.remainingDays < totalDays) {
      throw new DomainError(
        'INSUFFICIENT_LEAVE_BALANCE',
        `Leave quota insufficient. Available: ${balance.remainingDays} days, Requested: ${totalDays} days.`,
        400
      );
    }

    const reqNum = generateNextNumber(this.sqlite, 'LEAVE_REQUEST', 'LV');
    const id = `lvr-${nanoid(10)}`;

    this.sqlite
      .prepare(
        `INSERT INTO hris_leave_requests
         (id, request_number, employee_id, leave_type_id, start_date, end_date, total_days, reason, document_url, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
      )
      .run(
        id,
        reqNum,
        input.employeeId,
        input.leaveTypeId,
        input.startDate,
        input.endDate,
        totalDays,
        input.reason,
        input.documentUrl ?? null,
        timestamp,
        timestamp
      );

    return this.listLeaveRequests({ employeeId: input.employeeId }).find((r) => r.id === id)!;
  }

  approveLeaveRequest(id: string, approverId: string) {
    const req = this.listLeaveRequests({}).find((r) => r.id === id);
    if (!req) throw notFound('Leave Request', id);
    if (req.status !== 'PENDING') {
      throw new DomainError(
        'INVALID_STATE',
        `Leave request cannot be approved (current status: ${req.status}).`,
        400
      );
    }

    const timestamp = now();
    const currentYear = Number(req.startDate.slice(0, 4));

    const tx = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          "UPDATE hris_leave_requests SET status = 'APPROVED', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?"
        )
        .run(approverId, timestamp, timestamp, id);

      const res = this.sqlite
        .prepare(
          `UPDATE hris_leave_balances SET used_days = used_days + ?, updated_at = ?
           WHERE employee_id = ? AND leave_type_id = ?`
        )
        .run(req.totalDays, timestamp, req.employeeId, req.leaveTypeId);

      if (res.changes === 0) {
        const balId = `bal-${nanoid(10)}`;
        try {
          this.sqlite
            .prepare(
              `INSERT INTO hris_leave_balances
               (id, employee_id, leave_type_id, period_year, entitled_days, used_days, created_at, updated_at)
               VALUES (?, ?, ?, ?, 12, ?, ?, ?)`
            )
            .run(
              balId,
              req.employeeId,
              req.leaveTypeId,
              currentYear,
              req.totalDays,
              timestamp,
              timestamp
            );
        } catch {
          try {
            this.sqlite
              .prepare(
                `INSERT INTO hris_leave_balances
                 (id, employee_id, leave_type_id, year, quota_days, used_days, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 12, ?, ?, ?)`
              )
              .run(
                balId,
                req.employeeId,
                req.leaveTypeId,
                currentYear,
                req.totalDays,
                timestamp,
                timestamp
              );
          } catch {}
        }
      }
    });

    tx.immediate();
    return this.listLeaveRequests({}).find((r) => r.id === id)!;
  }

  rejectLeaveRequest(id: string, reason: string) {
    const req = this.listLeaveRequests({}).find((r) => r.id === id);
    if (!req) throw notFound('Leave Request', id);

    const timestamp = now();
    this.sqlite
      .prepare(
        "UPDATE hris_leave_requests SET status = 'REJECTED', rejection_reason = ?, updated_at = ? WHERE id = ?"
      )
      .run(reason, timestamp, id);

    return this.listLeaveRequests({}).find((r) => r.id === id)!;
  }

  cancelLeaveRequest(id: string) {
    const req = this.listLeaveRequests({}).find((r) => r.id === id);
    if (!req) throw notFound('Leave Request', id);

    const timestamp = now();
    if (req.status === 'APPROVED') {
      const currentYear = Number(req.startDate.slice(0, 4));
      this.sqlite
        .prepare(
          `UPDATE hris_leave_balances SET used_days = MAX(0, used_days - ?), updated_at = ?
           WHERE employee_id = ? AND leave_type_id = ? AND year = ?`
        )
        .run(req.totalDays, timestamp, req.employeeId, req.leaveTypeId, currentYear);
    }

    this.sqlite
      .prepare("UPDATE hris_leave_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?")
      .run(timestamp, id);
    return { success: true };
  }
}
