import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { FlightOperationsService } from './flight-operations.service';
import type { FlightOperationDetailDto } from '#shared/contracts/flight-operations';
import { DomainError } from '../utils/errors';
import { getApplicationNow } from '../utils/time';

type SqlValue = string | number | boolean | null;
type SqlRow = Record<string, SqlValue>;

export type ActorContext = {
  userId: string;
  role: string;
  stationCodes: string[];
  requestId?: string;
};

export type ClosureRequirementResult = {
  code: string;
  category: string;
  label: string;
  status: 'PASSED' | 'BLOCKED' | 'NOT_REQUIRED';
  satisfied: boolean;
  required: boolean;
  reason?: string;
  note?: string;
  actionHref?: string;
};

function isDemoAdmin(ctx: ActorContext) {
  return ctx.role === 'Demo Admin';
}

function readinessCodeForTask(taskCode: string) {
  if (taskCode === 'ORIGIN_HANDLING') return 'HANDLING_CONFIRMED';
  if (taskCode === 'ORIGIN_DOCUMENTS') return 'REQUIRED_DOCUMENTS';
  return taskCode;
}

export class FlightOperationsVerificationService extends FlightOperationsService {
  invalidateFlightDocumentVerification(flightId: string, actorUserId: string) {
    this.invalidateStationVerification(flightId, 'Flight document source changed.', actorUserId, [
      'ORIGIN_DOCUMENTS',
      'ORIGIN_STATION_SIGNOFF',
      'DESTINATION_DOCUMENTS',
      'DESTINATION_STATION_SIGNOFF'
    ]);
  }

  constructor(sqlite: Database.Database, routesService?: any) {
    super(sqlite, routesService);
  }

  private getStationCodeById(stationId: string): string | null {
    const station = this.sqlite
      .prepare('SELECT station_code FROM stations WHERE id = ?')
      .get(stationId) as { station_code: string } | undefined;
    return station?.station_code ?? null;
  }

  private validateStationScope(stationId: string, ctx: ActorContext) {
    if (!ctx.stationCodes.includes('ALL')) {
      const stationCode = this.getStationCodeById(stationId);
      if (!stationCode || !ctx.stationCodes.includes(stationCode)) {
        throw new DomainError(
          'FLIGHT_STATION_FORBIDDEN',
          `${ctx.role} cannot perform this action for station ${stationCode ?? stationId}.`,
          403
        );
      }
    }
  }

  assertActorStationScope(stationId: string, ctx: ActorContext) {
    this.validateStationScope(stationId, ctx);
  }

  assertFlightStationScope(flightId: string, ctx: ActorContext) {
    if (ctx.stationCodes.includes('ALL')) return;
    const flight = this.sqlite
      .prepare(
        `SELECT origin.station_code AS origin_code, destination.station_code AS destination_code
         FROM flight_operations flight
         JOIN stations origin ON origin.id = flight.origin_station_id
         JOIN stations destination ON destination.id = flight.destination_station_id
         WHERE flight.id = ?`
      )
      .get(flightId) as { origin_code: string; destination_code: string } | undefined;
    if (!flight) throw new DomainError('NOT_FOUND', `Flight ${flightId} not found.`, 404);
    if (
      ![flight.origin_code, flight.destination_code].some((code) => ctx.stationCodes.includes(code))
    ) {
      throw new DomainError(
        'FLIGHT_STATION_FORBIDDEN',
        `${ctx.role} cannot access operational assurance for this flight.`,
        403,
        { flightId, scope: ctx.stationCodes }
      );
    }
  }

  filterStationScoped<T extends { stationCode: string }>(rows: T[], ctx: ActorContext): T[] {
    if (ctx.stationCodes.includes('ALL')) return rows;
    return rows.filter((row) => ctx.stationCodes.includes(row.stationCode));
  }

  // NEW METHODS FOR OPERATIONAL VERIFICATION AND READINESS ASSURANCE

  async getStationOperations(
    query: {
      stationId?: string;
      stationCode?: string;
      operationalDate?: string;
      flightId?: string;
      phase?: string;
    },
    ctx: ActorContext
  ) {
    if (query.stationId) this.validateStationScope(query.stationId, ctx);
    if (
      query.stationCode &&
      !ctx.stationCodes.includes('ALL') &&
      !ctx.stationCodes.includes(query.stationCode)
    ) {
      throw new DomainError(
        'FLIGHT_STATION_FORBIDDEN',
        `${ctx.role} cannot access Station Operations for ${query.stationCode}.`,
        403,
        { stationCode: query.stationCode, scope: ctx.stationCodes }
      );
    }
    let sql = `
      SELECT
        f.id as flight_id,
        f.flight_number,
        f.flight_date,
        f.aircraft_id,
        ac.aircraft_type,
        origin.station_code as origin_station_code,
        origin.id as origin_station_id,
        dest.station_code as destination_station_code,
        dest.id as destination_station_id,
        f.scheduled_departure_at,
        f.actual_departure_at,
        f.actual_arrival_at,
        f.current_status_id,
        s.label as current_status_name,
        s.code as current_status_code,
        ft.code as flight_type_code,
        fst.code as service_type_code,
        f.estimated_revenue,
        COALESCE((
          SELECT COUNT(*)
          FROM flight_manifest_passengers passenger
          JOIN flight_manifests manifest ON manifest.id = passenger.manifest_id
          JOIN manifest_statuses manifest_status ON manifest_status.id = manifest.status_id
          WHERE manifest.flight_operation_id = f.id
            AND manifest_status.code IN ('APPROVED', 'LOCKED')
        ), 0) AS passenger_total,
        COALESCE((
          SELECT actual_passengers FROM flight_actual_reconciliations reconciliation
          WHERE reconciliation.flight_id = f.id
          ORDER BY reconciliation.updated_at DESC LIMIT 1
        ), 0) AS passenger_actual,
        COALESCE((
          SELECT actual_cargo_kg FROM flight_actual_reconciliations reconciliation
          WHERE reconciliation.flight_id = f.id
          ORDER BY reconciliation.updated_at DESC LIMIT 1
        ), (
          SELECT SUM(item.actual_weight_kg)
          FROM flight_manifest_cargo_items item
          JOIN flight_manifests manifest ON manifest.id = item.manifest_id
          JOIN manifest_statuses manifest_status ON manifest_status.id = manifest.status_id
          WHERE manifest.flight_operation_id = f.id
            AND manifest_status.code IN ('APPROVED', 'LOCKED')
        ), 0) AS cargo_weight_kg,
        f.created_at,
        f.updated_at
      FROM flight_operations f
      JOIN stations origin ON origin.id = f.origin_station_id
      JOIN stations dest ON dest.id = f.destination_station_id
      JOIN flight_operation_statuses s ON s.id = f.current_status_id
      LEFT JOIN aircraft ac ON ac.id = f.aircraft_id
      LEFT JOIN flight_types ft ON ft.id = f.flight_type_id
      LEFT JOIN flight_service_types fst ON fst.id = f.service_type_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (query.stationId) {
      sql += ` AND (f.origin_station_id = ? OR f.destination_station_id = ?)`;
      params.push(query.stationId, query.stationId);
    }

    if (query.stationCode) {
      sql += ` AND (origin.station_code = ? OR dest.station_code = ?)`;
      params.push(query.stationCode, query.stationCode);
    }

    if (query.operationalDate) {
      sql += ` AND f.flight_date = ?`;
      params.push(query.operationalDate);
    }

    if (query.flightId) {
      sql += ` AND f.id = ?`;
      params.push(query.flightId);
    }

    if (!ctx.stationCodes.includes('ALL')) {
      const placeholders = ctx.stationCodes.map(() => '?').join(', ');
      sql += ` AND (origin.station_code IN (${placeholders}) OR dest.station_code IN (${placeholders}))`;
      params.push(...ctx.stationCodes, ...ctx.stationCodes);
    }

    sql += ` ORDER BY f.scheduled_departure_at`;

    const rows = this.sqlite.prepare(sql).all(...params) as SqlRow[];

    const results: any[] = [];

    for (const row of rows) {
      const flightId = String(row.flight_id);

      // Get tasks for this flight
      const tasks = (await this.getFlightStationTasks(flightId, ctx)).filter(
        (task) =>
          (!query.phase || task.phase === query.phase) &&
          (!query.stationId || task.station_id === query.stationId) &&
          (!query.stationCode || task.station_code === query.stationCode)
      );

      // Get services for this flight
      const services = (await this.getFlightStationServices(flightId)).filter(
        (service) =>
          (!query.stationId || service.stationId === query.stationId) &&
          (!query.stationCode || service.stationCode === query.stationCode) &&
          (ctx.stationCodes.includes('ALL') || ctx.stationCodes.includes(service.stationCode))
      );

      // Get costs for this flight
      const costs = (await this.getFlightStationCosts(flightId)).filter(
        (cost) =>
          (!query.stationId || cost.stationId === query.stationId) &&
          (!query.stationCode || cost.stationCode === query.stationCode) &&
          (ctx.stationCodes.includes('ALL') || ctx.stationCodes.includes(cost.stationCode))
      );
      const audit = (await this.getOperationalAuditTrail(flightId)).slice(0, 10);

      results.push({
        id: String(row.flight_id),
        flightId: String(row.flight_id),
        flightNumber: String(row.flight_number),
        flightDate: String(row.flight_date),
        aircraftId: String(row.aircraft_id ?? ''),
        aircraftType: String(row.aircraft_type ?? ''),
        originStationId: String(row.origin_station_id),
        originStationCode: String(row.origin_station_code),
        destinationStationId: String(row.destination_station_id),
        destinationStationCode: String(row.destination_station_code),
        scheduledDepartureAt: String(row.scheduled_departure_at),
        actualDepartureAt: row.actual_departure_at ? String(row.actual_departure_at) : null,
        actualArrivalAt: row.actual_arrival_at ? String(row.actual_arrival_at) : null,
        currentStatus: String(row.current_status_name),
        currentStatusCode: String(row.current_status_code ?? ''),
        flightTypeCode: String(row.flight_type_code ?? ''),
        serviceTypeCode: String(row.service_type_code ?? ''),
        estimatedRevenue: row.estimated_revenue ? Number(row.estimated_revenue) : null,
        passengerTotal: Number(row.passenger_total ?? 0),
        passengerActual: Number(row.passenger_actual ?? 0),
        cargoWeightKg: Number(row.cargo_weight_kg ?? 0),
        dangerousGoods: false,
        tasks: tasks.map((t) => ({
          id: t.id,
          stationId: String(t.station_id),
          stationCode: String(t.station_code),
          taskCode: t.task_code,
          taskTitle: t.task_title,
          status: t.status,
          phase: t.phase,
          requiresEvidence: Boolean(t.requires_evidence),
          notes: t.notes ?? null,
          verifiedBy: t.verified_by_user_id ?? null,
          verifiedAt: t.verified_at ?? null,
          assignedTo: t.assigned_user_id ?? null,
          rejectionReason: t.rejection_reason ?? null,
          version: Number(t.version),
          evidenceCount: Number(t.evidence_count ?? 0),
          stationDecision: t.station_decision ?? null,
          occDecision: t.occ_decision ?? null
        })),
        services: services,
        costs: costs,
        audit,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at)
      });
    }

    return results;
  }

  async getFlightStationTasks(flightId: string, ctx?: ActorContext) {
    const sql = `
      SELECT fst.*, station.station_code,
        (SELECT COUNT(*) FROM flight_verification_evidence evidence
         WHERE evidence.station_task_id = fst.id) AS evidence_count,
        (SELECT decision FROM flight_station_task_approvals approval
         WHERE approval.task_id = fst.id AND approval.approval_stage = 'STATION') AS station_decision,
        (SELECT decision FROM flight_station_task_approvals approval
         WHERE approval.task_id = fst.id AND approval.approval_stage = 'OCC') AS occ_decision
      FROM flight_station_tasks fst
      JOIN stations station ON station.id = fst.station_id
      WHERE fst.flight_id = ?
      ORDER BY fst.created_at
    `;

    const tasks = this.sqlite.prepare(sql).all(flightId) as any[];
    if (!ctx || ctx.stationCodes.includes('ALL')) return tasks;
    return tasks.filter((task) => ctx.stationCodes.includes(String(task.station_code)));
  }

  async createStationTask(input: any, ctx: ActorContext) {
    this.validateStationScope(input.stationId, ctx);
    const flight = this.sqlite
      .prepare(
        `SELECT origin_station_id, destination_station_id
         FROM flight_operations WHERE id = ?`
      )
      .get(input.flightId) as
      { origin_station_id: string; destination_station_id: string } | undefined;
    if (!flight) throw new DomainError('NOT_FOUND', `Flight ${input.flightId} not found.`, 404);
    const expectedStationId = String(input.phase).startsWith('ORIGIN')
      ? flight.origin_station_id
      : flight.destination_station_id;
    if (input.stationId !== expectedStationId) {
      throw new DomainError(
        'TASK_STATION_PHASE_MISMATCH',
        'Task station must match the flight station for its operational phase.',
        422
      );
    }

    const id = `stask-${nanoid(10)}`;
    const now = timestamp();

    const insertSql = `
      INSERT INTO flight_station_tasks (
        id, flight_id, station_id, phase, task_code, task_title, status,
        assigned_role, assigned_user_id, source_record_type, source_record_id,
        requires_evidence, notes, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.sqlite
      .prepare(insertSql)
      .run(
        id,
        input.flightId,
        input.stationId,
        input.phase,
        input.taskCode,
        input.taskTitle,
        'PENDING',
        input.assignedRole,
        input.assignedUserId,
        input.sourceRecordType,
        input.sourceRecordId,
        1,
        input.notes,
        input.version || 1,
        now,
        now
      );

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: input.flightId,
      stationId: input.stationId,
      module: 'STATION_TASK',
      action: 'CREATE',
      beforeStatus: null,
      afterStatus: 'PENDING',
      reason: `Created station task: ${input.taskTitle}`
    });

    return await this.getFlightStationTaskById(id);
  }

  async getFlightStationTaskById(taskId: string) {
    const sql = `SELECT * FROM flight_station_tasks WHERE id = ?`;
    return this.sqlite.prepare(sql).get(taskId) as any;
  }

  async startStationTask(taskId: string, expectedVersion: number, ctx: ActorContext) {
    const now = timestamp();
    const task = await this.getFlightStationTaskById(taskId);
    if (!task) {
      throw new DomainError('NOT_FOUND', `Station task with id ${taskId} not found`, 404);
    }
    this.validateStationScope(String(task.station_id), ctx);
    if (Number(task.version) !== expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409,
        { currentVersion: Number(task.version) }
      );
    }

    if (task.status !== 'PENDING') {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Cannot start task from status ${task.status}`,
        409
      );
    }

    const updateSql = `
      UPDATE flight_station_tasks
      SET status = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `;

    const result = this.sqlite.prepare(updateSql).run('IN_PROGRESS', now, taskId, expectedVersion);
    if (result.changes === 0) {
      throw new DomainError('NOT_FOUND', `Station task with id ${taskId} not found`, 404);
    }

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(task.flight_id),
      stationId: String(task.station_id),
      module: 'STATION_TASK',
      action: 'START',
      beforeStatus: 'PENDING',
      afterStatus: 'IN_PROGRESS',
      reason: `Started station task: ${String(task.task_title)}`
    });

    return await this.getFlightStationTaskById(taskId);
  }

  async verifyStationTask(input: any, ctx: ActorContext) {
    const now = timestamp();
    const currentTask = await this.getFlightStationTaskById(input.taskId);
    if (!currentTask) {
      throw new DomainError('NOT_FOUND', `Station task with id ${input.taskId} not found`, 404);
    }
    this.validateStationScope(String(currentTask.station_id), ctx);

    if (ctx.role !== 'Station Admin' && ctx.role !== 'Demo Admin') {
      throw new DomainError('FORBIDDEN', 'Only Station Admin can verify station tasks.', 403);
    }

    if (Number(currentTask.version) !== input.expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409
      );
    }

    if (currentTask.status !== 'PENDING' && currentTask.status !== 'IN_PROGRESS') {
      throw new DomainError(
        'INVALID_TRANSITION',
        `Cannot verify task from status ${currentTask.status}`,
        409
      );
    }
    if (Boolean(currentTask.requires_evidence)) {
      const evidenceCount = this.sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM flight_verification_evidence
           WHERE station_task_id = ? AND uploaded_at >= ?`
        )
        .get(input.taskId, currentTask.updated_at) as { count: number };

      if (evidenceCount.count === 0) {
        throw new DomainError(
          'EVIDENCE_REQUIRED',
          'This task requires at least one evidence to be verified.',
          422
        );
      }
    }

    if (String(currentTask.task_code).endsWith('STATION_SIGNOFF')) {
      const taskPrefix = String(currentTask.task_code).startsWith('ORIGIN_')
        ? 'ORIGIN_%'
        : 'DESTINATION_%';
      const incomplete = this.sqlite
        .prepare(
          `SELECT task_code FROM flight_station_tasks
           WHERE flight_id = ? AND station_id = ? AND task_code LIKE ?
             AND id <> ? AND status <> 'VERIFIED'`
        )
        .all(currentTask.flight_id, currentTask.station_id, taskPrefix, input.taskId) as Array<{
        task_code: string;
      }>;
      if (incomplete.length) {
        throw new DomainError(
          'DEPENDENT_TASKS_INCOMPLETE',
          'Complete all station tasks for this station side before station sign-off.',
          422,
          { taskCodes: incomplete.map((task) => task.task_code) }
        );
      }
    }
    if (currentTask.task_code === 'ORIGIN_HANDLING') {
      const handling = this.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM flight_station_service_requests request
           JOIN station_service_types type ON type.id = request.service_type_id
           JOIN station_service_statuses status ON status.id = request.status_id
           WHERE request.flight_id = ? AND request.station_id = ?
             AND type.code = 'HANDLING' AND status.code IN ('CONFIRMED','COMPLETED')`
        )
        .get(currentTask.flight_id, currentTask.station_id) as { count: number };
      if (!handling.count) {
        throw new DomainError(
          'SOURCE_CONDITION_NOT_MET',
          'Confirm the origin handling service before verifying this task.',
          422
        );
      }
    }

    const updateSql = `
      UPDATE flight_station_tasks
      SET status = ?, verified_by_user_id = ?, verified_at = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `;

    const result = this.sqlite
      .prepare(updateSql)
      .run('VERIFIED', ctx.userId, now, now, input.taskId, input.expectedVersion);
    if (result.changes === 0) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409
      );
    }

    if (String(currentTask.task_code).endsWith('STATION_SIGNOFF')) {
      this.sqlite
        .prepare(
          `INSERT OR IGNORE INTO flight_station_task_approvals (
             id, task_id, approval_stage, decision, actor_user_id, actor_role,
             reason, approved_at, created_at, updated_at
           ) VALUES (?, ?, 'STATION', 'APPROVED', ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `stask-app-${nanoid(10)}`,
          input.taskId,
          ctx.userId,
          ctx.role,
          input.reason || 'Station sign-off verified with evidence.',
          now,
          now,
          now
        );
    }

    this.persistReadinessVerification(input.taskId, ctx);

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(currentTask.flight_id),
      stationId: String(currentTask.station_id),
      module: 'STATION_TASK',
      action: 'VERIFY',
      beforeStatus: String(currentTask.status),
      afterStatus: 'VERIFIED',
      reason: input.reason || `Verified station task: ${String(currentTask.task_title)}`
    });

    return await this.getFlightStationTaskById(input.taskId);
  }

  async rejectStationTask(input: any, ctx: ActorContext) {
    const now = timestamp();
    const currentTask = await this.getFlightStationTaskById(input.taskId);
    if (!currentTask) {
      throw new DomainError('NOT_FOUND', `Station task with id ${input.taskId} not found`, 404);
    }
    this.validateStationScope(String(currentTask.station_id), ctx);

    if (ctx.role !== 'Station Admin' && ctx.role !== 'Demo Admin') {
      throw new DomainError('FORBIDDEN', 'Only Station Admin can reject station tasks.', 403);
    }

    if (Number(currentTask.version) !== input.expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409
      );
    }

    if (!input.rejectionReason || input.rejectionReason.trim().length === 0) {
      throw new DomainError('REASON_REQUIRED', 'Rejection reason is required.', 422);
    }

    const updateSql = `
      UPDATE flight_station_tasks
      SET status = ?, rejection_reason = ?, verified_by_user_id = ?, verified_at = ?,
          version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `;

    const result = this.sqlite
      .prepare(updateSql)
      .run(
        'REJECTED',
        input.rejectionReason,
        ctx.userId,
        now,
        now,
        input.taskId,
        input.expectedVersion
      );
    if (result.changes === 0) {
      throw new DomainError('NOT_FOUND', `Station task with id ${input.taskId} not found`, 404);
    }

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(currentTask.flight_id),
      stationId: String(currentTask.station_id),
      module: 'STATION_TASK',
      action: 'REJECT',
      beforeStatus: String(currentTask.status),
      afterStatus: 'REJECTED',
      reason: input.rejectionReason
    });

    return await this.getFlightStationTaskById(input.taskId);
  }

  async approveStationTask(input: any, ctx: ActorContext) {
    const now = timestamp();
    const task = await this.getFlightStationTaskById(input.taskId);
    if (!task) {
      throw new DomainError('NOT_FOUND', `Station task with id ${input.taskId} not found`, 404);
    }
    this.validateStationScope(String(task.station_id), ctx);
    if (!String(task.task_code).endsWith('STATION_SIGNOFF')) {
      throw new DomainError(
        'SIGNOFF_TASK_REQUIRED',
        'Dual approval is only available for station sign-off tasks.',
        422
      );
    }
    if (Number(task.version) !== input.expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409,
        { currentVersion: Number(task.version) }
      );
    }

    const stage = input.stage || 'STATION';
    if (stage !== 'STATION' && stage !== 'OCC') {
      throw new DomainError('INVALID_STAGE', 'Approval stage must be STATION or OCC.', 422);
    }

    if (stage === 'STATION' && ctx.role !== 'Station Admin' && ctx.role !== 'Demo Admin') {
      throw new DomainError('FORBIDDEN', 'Only Station Admin can perform station sign-off.', 403);
    }
    if (stage === 'OCC' && ctx.role !== 'OCC' && ctx.role !== 'Demo Admin') {
      throw new DomainError('FORBIDDEN', 'Only OCC can perform OCC approval.', 403);
    }

    const existingApprovals = await this.getTaskApprovals(input.taskId);
    const existingStage = existingApprovals.find((a) => a.approval_stage === stage);
    if (existingStage) {
      if (existingStage.decision === input.decision) return task;
      throw new DomainError('DUPLICATE_APPROVAL', `Stage ${stage} is already decided.`, 409);
    }

    const hasStationApproval = existingApprovals.some(
      (a) => a.approval_stage === 'STATION' && a.decision === 'APPROVED'
    );
    if (stage === 'OCC' && !hasStationApproval) {
      throw new DomainError(
        'MISSING_STATION_APPROVAL',
        'OCC cannot approve before Station Admin has approved.',
        409
      );
    }

    if (stage === 'STATION' && task.status !== 'VERIFIED') {
      throw new DomainError(
        'TASK_NOT_VERIFIED',
        'Station Admin cannot sign-off a task that has not been verified.',
        409
      );
    }

    const newStatus = input.decision === 'REJECTED' ? 'REJECTED' : String(task.status);
    this.sqlite
      .transaction(() => {
        const update = this.sqlite
          .prepare(
            `UPDATE flight_station_tasks
           SET status = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND version = ?`
          )
          .run(newStatus, now, input.taskId, input.expectedVersion);
        if (!update.changes) {
          throw new DomainError(
            'STALE_VERSION',
            'Task has been modified by another user. Please refresh and try again.',
            409
          );
        }
        this.sqlite
          .prepare(
            `INSERT INTO flight_station_task_approvals (
             id, task_id, approval_stage, decision, actor_user_id, actor_role,
             reason, approved_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `stask-app-${nanoid(10)}`,
            input.taskId,
            stage,
            input.decision,
            ctx.userId,
            ctx.role,
            input.reason || null,
            now,
            now,
            now
          );
      })
      .immediate();

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(task.flight_id),
      stationId: String(task.station_id),
      module: 'STATION_TASK_APPROVAL',
      action: input.decision === 'APPROVED' ? 'APPROVE' : 'REJECT_APPROVAL',
      beforeStatus: String(task.status),
      afterStatus: newStatus,
      reason: input.reason || `${stage} ${input.decision.toLowerCase()} task`
    });

    return await this.getFlightStationTaskById(input.taskId);
  }

  async getTaskApprovals(taskId: string) {
    const sql = `
      SELECT * FROM flight_station_task_approvals
      WHERE task_id = ?
      ORDER BY created_at
    `;

    return this.sqlite.prepare(sql).all(taskId) as any[];
  }

  async overrideStationTask(input: any, ctx: ActorContext) {
    if (!isDemoAdmin(ctx)) {
      throw new DomainError(
        'FORBIDDEN',
        'Emergency override is only available for Demo Admin.',
        403
      );
    }

    const task = await this.getFlightStationTaskById(input.taskId);
    if (!task) {
      throw new DomainError('NOT_FOUND', `Station task with id ${input.taskId} not found`, 404);
    }
    this.validateStationScope(String(task.station_id), ctx);
    if (Number(task.version) !== input.expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409,
        { currentVersion: Number(task.version) }
      );
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new DomainError('REASON_REQUIRED', 'Override reason is required.', 422);
    }
    const evidenceCount = this.sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM flight_verification_evidence WHERE station_task_id = ?`
      )
      .get(input.taskId) as { count: number };
    const suppliedEvidenceIds = Array.isArray(input.evidenceIds) ? input.evidenceIds : [];
    const validSuppliedEvidence =
      suppliedEvidenceIds.length === 0
        ? 0
        : (
            this.sqlite
              .prepare(
                `SELECT COUNT(*) AS count FROM flight_verification_evidence
                 WHERE flight_id = ? AND id IN (${suppliedEvidenceIds.map(() => '?').join(', ')})`
              )
              .get(task.flight_id, ...suppliedEvidenceIds) as { count: number }
          ).count;
    if (evidenceCount.count === 0 && validSuppliedEvidence === 0) {
      throw new DomainError('EVIDENCE_REQUIRED', 'Emergency override requires evidence.', 422);
    }

    const now = timestamp();
    const updateSql = `
      UPDATE flight_station_tasks
      SET status = ?, verified_by_user_id = ?, verified_at = ?, version = version + 1,
          notes = COALESCE(notes, '') || '\nOVERRIDE: ' || ?, updated_at = ?
      WHERE id = ? AND version = ?
    `;

    const result = this.sqlite
      .prepare(updateSql)
      .run('VERIFIED', ctx.userId, now, input.reason, now, input.taskId, input.expectedVersion);
    if (result.changes === 0) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409
      );
    }

    if (validSuppliedEvidence > 0) {
      for (const evidenceId of suppliedEvidenceIds) {
        this.sqlite
          .prepare(
            `UPDATE flight_verification_evidence SET station_task_id = ?
             WHERE id = ? AND flight_id = ?`
          )
          .run(input.taskId, evidenceId, task.flight_id);
      }
    }
    for (const stage of ['STATION', 'OCC']) {
      this.sqlite
        .prepare(
          `INSERT INTO flight_station_task_approvals (
             id, task_id, approval_stage, decision, actor_user_id, actor_role,
             reason, approved_at, created_at, updated_at
           ) VALUES (?, ?, ?, 'OVERRIDDEN', ?, ?, ?, ?, ?, ?)
           ON CONFLICT(task_id, approval_stage) DO UPDATE SET
             decision = excluded.decision, actor_user_id = excluded.actor_user_id,
             actor_role = excluded.actor_role, reason = excluded.reason,
             approved_at = excluded.approved_at, updated_at = excluded.updated_at`
        )
        .run(
          `stask-app-${nanoid(10)}`,
          input.taskId,
          stage,
          ctx.userId,
          ctx.role,
          input.reason,
          now,
          now,
          now
        );
    }
    this.persistReadinessVerification(input.taskId, ctx, input.reason);

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(task.flight_id),
      stationId: String(task.station_id),
      module: 'STATION_TASK',
      action: 'OVERRIDE',
      beforeStatus: String(task.status),
      afterStatus: 'VERIFIED',
      reason: input.reason,
      evidenceIds: input.evidenceIds
    });

    return await this.getFlightStationTaskById(input.taskId);
  }

  async addStationTaskEvidence(input: any, ctx: ActorContext) {
    const task = await this.getFlightStationTaskById(input.stationTaskId);
    if (!task) {
      throw new DomainError(
        'NOT_FOUND',
        `Station task with id ${input.stationTaskId} not found`,
        404
      );
    }
    this.validateStationScope(String(task.station_id), ctx);
    if (Number(task.version) !== input.expectedVersion) {
      throw new DomainError(
        'STALE_VERSION',
        'Task has been modified by another user. Please refresh and try again.',
        409,
        { currentVersion: Number(task.version) }
      );
    }

    const id = `ev-${nanoid(10)}`;
    const now = timestamp();

    const insertSql = `
      INSERT INTO flight_verification_evidence (
        id, flight_id, station_task_id, upload_id, document_type,
        file_name, notes, uploaded_by_user_id, uploaded_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.sqlite
      .prepare(insertSql)
      .run(
        id,
        task.flight_id,
        input.stationTaskId,
        input.uploadId || null,
        input.documentType || null,
        input.fileName,
        input.notes || null,
        ctx.userId,
        now,
        now,
        now
      );

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: String(task.flight_id),
      stationId: String(task.station_id),
      module: 'STATION_EVIDENCE',
      action: 'ADD',
      reason: `Added evidence: ${input.fileName}`
    });

    return await this.getEvidenceById(id);
  }

  async getEvidenceById(evidenceId: string) {
    const sql = `SELECT * FROM flight_verification_evidence WHERE id = ?`;
    return this.sqlite.prepare(sql).get(evidenceId) as any;
  }

  private persistReadinessVerification(taskId: string, ctx: ActorContext, reason?: string) {
    const task = this.sqlite
      .prepare(
        `SELECT id, flight_id, station_id, task_code, status, source_record_type,
                source_record_id, version, verified_at
         FROM flight_station_tasks WHERE id = ?`
      )
      .get(taskId) as
      | {
          id: string;
          flight_id: string;
          station_id: string;
          task_code: string;
          status: string;
          source_record_type: string | null;
          source_record_id: string | null;
          version: number;
          verified_at: string | null;
        }
      | undefined;
    if (!task) return;
    const evidenceIds = (
      this.sqlite
        .prepare(
          `SELECT id FROM flight_verification_evidence
           WHERE station_task_id = ? ORDER BY uploaded_at, id`
        )
        .all(taskId) as Array<{ id: string }>
    ).map((evidence) => evidence.id);
    const snapshot = JSON.stringify({
      taskId,
      stationId: task.station_id,
      taskCode: task.task_code,
      taskStatus: task.status,
      taskVersion: task.version,
      sourceRecordType: task.source_record_type,
      sourceRecordId: task.source_record_id,
      evidenceIds,
      reason: reason ?? null
    });
    const now = timestamp();
    this.sqlite
      .prepare(
        `INSERT INTO flight_readiness_verifications (
           id, flight_id, check_code, verification_status, verifier_user_id,
           evidence_references, verified_at, source_snapshot, source_hash,
           created_at, updated_at
         ) VALUES (?, ?, ?, 'VERIFIED', ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(flight_id, check_code) DO UPDATE SET
           verification_status = 'VERIFIED',
           verifier_user_id = excluded.verifier_user_id,
           evidence_references = excluded.evidence_references,
           verified_at = excluded.verified_at,
           expired_at = NULL,
           invalidated_at = NULL,
           invalidation_reason = NULL,
           source_snapshot = excluded.source_snapshot,
           source_hash = excluded.source_hash,
           updated_at = excluded.updated_at`
      )
      .run(
        `rverify-${nanoid(10)}`,
        task.flight_id,
        readinessCodeForTask(task.task_code),
        ctx.userId,
        JSON.stringify(evidenceIds),
        task.verified_at ?? now,
        snapshot,
        createHash('sha256').update(snapshot).digest('hex'),
        now,
        now
      );
  }

  async reconcileFlightActuals(input: any, ctx: ActorContext) {
    const flight = this.requireFlight(input.flightId);
    if (
      !['LANDED', 'DIVERTED', 'PENDING_CLOSURE', 'REOPENED_FOR_CORRECTION'].includes(
        flight.currentStatus
      )
    ) {
      throw new DomainError(
        'RECONCILIATION_NOT_AVAILABLE',
        'Actual reconciliation is only available after landing or diversion.',
        409
      );
    }
    const existing = this.sqlite
      .prepare(`SELECT id, version FROM flight_actual_reconciliations WHERE flight_id = ?`)
      .get(input.flightId) as { id: string; version: number } | undefined;
    const currentVersion = existing?.version ?? 0;
    if (input.expectedVersion !== currentVersion) {
      throw new DomainError(
        'RECONCILIATION_VERSION_CONFLICT',
        'Reconciliation has changed. Refresh before saving.',
        409,
        { currentVersion }
      );
    }
    const id = existing?.id ?? `rec-${nanoid(10)}`;
    const now = timestamp();

    const insertSql = `
      INSERT INTO flight_actual_reconciliations (
        id, flight_id, planned_passengers, actual_passengers, planned_cargo_kg, actual_cargo_kg,
        no_show_passengers, offloaded_cargo_kg, total_discrepancy_note,
        reconciled_by_user_id, reconciled_at, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(flight_id) DO UPDATE SET
        planned_passengers = excluded.planned_passengers,
        actual_passengers = excluded.actual_passengers,
        planned_cargo_kg = excluded.planned_cargo_kg,
        actual_cargo_kg = excluded.actual_cargo_kg,
        no_show_passengers = excluded.no_show_passengers,
        offloaded_cargo_kg = excluded.offloaded_cargo_kg,
        total_discrepancy_note = excluded.total_discrepancy_note,
        reconciled_by_user_id = excluded.reconciled_by_user_id,
        reconciled_at = excluded.reconciled_at,
        version = flight_actual_reconciliations.version + 1,
        updated_at = excluded.updated_at
    `;

    this.sqlite
      .prepare(insertSql)
      .run(
        id,
        input.flightId,
        input.plannedPassengers,
        input.actualPassengers,
        input.plannedCargoKg,
        input.actualCargoKg,
        input.noShowPassengers ?? 0,
        input.offloadedCargoKg ?? 0,
        input.totalDiscrepancyNote || null,
        ctx.userId,
        now,
        1,
        now,
        now
      );

    await this.logAudit({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      requestId: ctx.requestId,
      flightId: input.flightId,
      module: 'FLIGHT_RECONCILIATION',
      action: 'RECONCILE',
      reason: 'Reconciled actual vs planned passenger and cargo numbers'
    });

    return {
      id,
      ...input,
      reconciledByUserId: ctx.userId,
      reconciledAt: now,
      version: existing ? existing.version + 1 : 1
    };
  }

  async getOperationalAuditTrail(flightId: string) {
    const sql = `
      SELECT * FROM flight_operational_audit
      WHERE flight_id = ?
      ORDER BY timestamp DESC
    `;

    const rows = this.sqlite.prepare(sql).all(flightId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      actorUserId: String(row.actor_user_id),
      actorRole: String(row.actor_role),
      flightId: String(row.flight_id),
      stationId: row.station_id ? String(row.station_id) : null,
      module: String(row.module),
      action: String(row.action),
      beforeStatus: row.before_status ? String(row.before_status) : null,
      afterStatus: row.after_status ? String(row.after_status) : null,
      reason: row.reason ? String(row.reason) : null,
      evidenceIds: row.evidence_ids ? JSON.parse(String(row.evidence_ids)) : null,
      requestId: row.request_id ? String(row.request_id) : null,
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
      timestamp: String(row.timestamp),
      createdAt: String(row.created_at)
    }));
  }

  // Methods for readiness calculation and verification
  async calculateVerificationReadiness(flightId: string) {
    return this.evaluate(flightId, 'SYSTEM_VERIFICATION_EVALUATION').readinessChecks;
  }

  // Method to run critical readiness checks before departure
  runCriticalReadinessChecksBeforeDeparture(flightId: string) {
    const criticalChecks = [
      'ROUTE_AVAILABILITY',
      'AIRCRAFT_SERVICEABILITY',
      'AIRCRAFT_LOCATION',
      'AIRCRAFT_SCHEDULE',
      'AIRCRAFT_CAPACITY',
      'CREW_AVAILABILITY',
      'CREW_LICENSE_MEDICAL',
      'MANIFEST_APPROVED',
      'DG_ACCEPTANCE',
      'FUEL_CONFIRMED',
      'REQUIRED_DOCUMENTS',
      'HANDLING_CONFIRMED',
      'SEPARATION_OF_DUTIES',
      'ORIGIN_STATION_SIGNOFF'
    ];

    this.evaluate(flightId, 'SYSTEM_PRE_DEPARTURE_REVALIDATION');

    const failedChecks: string[] = [];
    const rows = this.sqlite
      .prepare(
        `
      SELECT check_code, effective_status, classification
      FROM flight_readiness_checks
      WHERE flight_id = ? AND check_code IN (${criticalChecks.map(() => '?').join(',')})
    `
      )
      .all(flightId, ...criticalChecks) as any[];

    for (const row of rows) {
      if (row.effective_status !== 'PASSED' && row.effective_status !== 'NOT_APPLICABLE') {
        failedChecks.push(row.check_code);
      }
    }

    for (const checkCode of criticalChecks) {
      if (!rows.some((r) => r.check_code === checkCode)) {
        failedChecks.push(checkCode);
      }
    }

    return {
      allPassed: failedChecks.length === 0,
      failedChecks
    };
  }

  departWithCriticalRevalidation(
    flightId: string,
    body: Parameters<FlightOperationsService['depart']>[1],
    actorUserId: string
  ) {
    return this.sqlite
      .transaction(() => {
        const critical = this.runCriticalReadinessChecksBeforeDeparture(flightId);
        if (!critical.allPassed) {
          throw new DomainError(
            'DEPARTURE_BLOCKED',
            `Cannot depart: critical readiness checks failed: ${critical.failedChecks.join(', ')}`,
            409,
            { failedChecks: critical.failedChecks }
          );
        }
        return super.depart(flightId, body, actorUserId);
      })
      .immediate();
  }

  // Method to validate closure requirements based on flight type
  validateClosureRequirements(
    flightId: string,
    flightTypeCode: string,
    throwOnFailure = true
  ): ClosureRequirementResult[] {
    const flight = this.getFlightById(flightId);
    if (!flight) {
      throw new DomainError('NOT_FOUND', `Flight with id ${flightId} not found`, 404);
    }

    const serviceType = String(flightTypeCode);
    const results: ClosureRequirementResult[] = [];
    const add = (
      code: string,
      label: string,
      required: boolean,
      satisfied: boolean,
      reason?: string,
      actionHref?: string
    ) => {
      results.push({
        code,
        category: code,
        label,
        required,
        satisfied: required ? satisfied : true,
        status: required ? (satisfied ? 'PASSED' : 'BLOCKED') : 'NOT_REQUIRED',
        reason,
        note: reason,
        actionHref
      });
    };

    add(
      'ACTUAL_TIMES',
      'Actual departure and arrival',
      true,
      Boolean(flight.actual_departure_at && flight.actual_arrival_at),
      'Record both actual departure and arrival before closure.',
      `/flights/${flightId}`
    );

    // Common: destination station sign-off
    const destSignOff = this.hasCompletedStationSignOff(flightId, 'DESTINATION');
    add(
      'DESTINATION_STATION_SIGNOFF',
      'Destination station sign-off',
      true,
      destSignOff,
      'Complete Station Admin verification and OCC approval at destination.',
      `/flights/station-operations?flightId=${flightId}&phase=DESTINATION_CLOSURE`
    );

    // Common: reconciliation
    const reconciliation = this.hasCompletedReconciliation(flightId);
    add(
      'RECONCILIATION',
      'Actual manifest reconciliation',
      true,
      reconciliation,
      'Reconcile planned and actual passenger/cargo totals.',
      `/flights/${flightId}`
    );

    // Common: maintenance handoff only if issues exist
    const unresolvedMaintenance = this.hasUnresolvedMaintenanceIssues(flightId);
    add(
      'MAINTENANCE_HANDOFF',
      'Maintenance issue resolution',
      unresolvedMaintenance,
      !unresolvedMaintenance,
      'Resolve submitted maintenance handoffs before closure.',
      `/flights/${flightId}`
    );

    // Type-specific checks
    const isCommercialPassenger =
      serviceType === 'SCHEDULED_PASSENGER' || serviceType === 'CHARTER_PASSENGER';
    const isCargo = serviceType === 'CHARTER_CARGO';
    const isMedevac = serviceType === 'MEDEVAC';
    const isPositioning = serviceType === 'POSITIONING';

    if (isCommercialPassenger || isCargo) {
      const manifestOk = isCargo
        ? this.hasApprovedCargoManifest(flightId)
        : this.hasApprovedManifest(flightId);
      add(
        isCargo ? 'CARGO_MANIFEST' : 'PASSENGER_MANIFEST',
        isCargo ? 'Final cargo manifest' : 'Final passenger manifest',
        true,
        manifestOk,
        `Approve or lock the final ${isCargo ? 'cargo' : 'passenger'} manifest.`,
        `/flights/${flightId}`
      );

      if (isCargo && this.hasDangerousGoods(flightId)) {
        const dgOk = this.hasDGAcceptance(flightId);
        add(
          'DG_ACCEPTANCE',
          'Dangerous goods acceptance',
          true,
          dgOk,
          'Accept every dangerous-goods cargo item.',
          `/flights/${flightId}`
        );
      }

      const customerOk = Boolean(flight.customer_id);
      add('CUSTOMER', 'Billing customer', true, customerOk, 'Assign a billing customer.');
      add(
        'REVENUE',
        'Revenue',
        true,
        this.hasRevenue(flightId, flight.estimated_revenue),
        'Record estimated revenue or paid passenger/cargo revenue.',
        `/flights/${flightId}`
      );
    }

    if (isMedevac) {
      const hasBillingContext = Boolean(flight.customer_id);
      add(
        'MEDEVAC_BILLING',
        'Medevac billing',
        hasBillingContext,
        !hasBillingContext || this.hasRevenue(flightId, flight.estimated_revenue),
        'Record revenue when a medevac customer is present.',
        `/flights/${flightId}`
      );
    }

    if (isPositioning) {
      add(
        'CUSTOMER_REVENUE',
        'Customer and revenue',
        false,
        true,
        'Not required for positioning flights.'
      );
      add('MANIFEST', 'Final manifest', false, true, 'Not required for positioning flights.');
    }

    const hasFuelRequest = this.hasFuelRequest(flightId);
    add(
      'FUEL',
      'Fuel completion',
      hasFuelRequest,
      !hasFuelRequest || this.hasValidFuelRecords(flightId),
      'Complete the fuel workflow or record the no-uplift policy reason.',
      `/flights/${flightId}`
    );

    const hasCosts = this.hasStationCosts(flightId);
    add(
      'STATION_COST',
      'Station cost approval',
      hasCosts,
      !hasCosts || this.hasApprovedStationCosts(flightId),
      'Submit and approve every recorded station cost. This does not replace station sign-off.',
      `/flights/station-operations?flightId=${flightId}`
    );

    const failedRequired = results.filter((r) => r.required && !r.satisfied);
    if (throwOnFailure && failedRequired.length > 0) {
      const summary = failedRequired
        .map((r) => `${r.code}: ${r.reason || 'not satisfied'}`)
        .join('; ');
      throw new DomainError(
        'CLOSURE_VALIDATION_FAILED',
        `Closure validation failed: ${summary}`,
        409,
        { requirements: results }
      );
    }

    return results;
  }

  override detail(id: string): FlightOperationDetailDto {
    const detail = super.detail(id);
    if (
      detail.currentStatus !== 'PENDING_CLOSURE' ||
      !this.hasVerificationRecords(id) ||
      this.isLegacyClosedFlight(id)
    ) {
      return detail;
    }
    return {
      ...detail,
      operationalClosureRequirements: this.validateClosureRequirements(
        id,
        detail.serviceTypeCode,
        false
      )
    };
  }

  private hasApprovedManifest(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_manifests 
      WHERE flight_operation_id = ? AND status_id IN (
        SELECT id FROM manifest_statuses WHERE code IN ('APPROVED', 'LOCKED')
      )
    `
      )
      .get(flightId) as any;

    return result.count > 0;
  }

  private hasApprovedCargoManifest(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_manifests
      JOIN manifest_types ON flight_manifests.manifest_type_id = manifest_types.id
      WHERE flight_manifests.flight_operation_id = ? AND flight_manifests.status_id IN (
        SELECT id FROM manifest_statuses WHERE code IN ('APPROVED', 'LOCKED')
      ) AND manifest_types.code = 'CARGO'
    `
      )
      .get(flightId) as any;

    return result.count > 0;
  }

  private hasDangerousGoods(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) AS count
      FROM flight_manifest_cargo_items item
      JOIN flight_manifests manifest ON manifest.id = item.manifest_id
      WHERE manifest.flight_operation_id = ? AND item.dg_category_id IS NOT NULL
    `
      )
      .get(flightId) as { count: number };
    return result.count > 0;
  }

  private hasDGAcceptance(flightId: string): boolean {
    // Every DG item on the final cargo manifest must be accepted.
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_manifest_cargo_items
      JOIN flight_manifests ON flight_manifest_cargo_items.manifest_id = flight_manifests.id
      JOIN dg_acceptance_statuses ON flight_manifest_cargo_items.dg_acceptance_status_id = dg_acceptance_statuses.id
      WHERE flight_manifests.flight_operation_id = ?
        AND flight_manifests.status_id IN (
          SELECT id FROM manifest_statuses WHERE code IN ('APPROVED', 'LOCKED')
        )
        AND flight_manifest_cargo_items.dg_category_id IS NOT NULL
        AND dg_acceptance_statuses.code <> 'ACCEPTED'
    `
      )
      .get(flightId) as any;

    return result.count === 0;
  }

  private hasValidFuelRecords(flightId: string): boolean {
    // A rejected request is closure-safe only when it carries the recorded
    // no-uplift/policy reason; a bare rejection must not become a false pass.
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_fuel_requests
      JOIN fuel_workflow_statuses status ON status.id = flight_fuel_requests.status_id
      WHERE flight_id = ? AND (
        status.code IN ('UPLIFTED', 'POSTED')
        OR (status.code = 'REJECTED' AND TRIM(COALESCE(rejection_reason, '')) <> '')
      )
    `
      )
      .get(flightId) as any;

    return result.count > 0;
  }

  private hasCompletedStationSignOff(
    flightId: string,
    signOffType: 'ORIGIN' | 'DESTINATION'
  ): boolean {
    const checkCode =
      signOffType === 'ORIGIN' ? 'ORIGIN_STATION_SIGNOFF' : 'DESTINATION_STATION_SIGNOFF';

    const task = this.sqlite
      .prepare(
        `
      SELECT id FROM flight_station_tasks
      WHERE flight_id = ? AND task_code = ? AND status = 'VERIFIED'
    `
      )
      .get(flightId, checkCode) as { id: string } | undefined;

    if (!task) return false;

    const approvals = this.sqlite
      .prepare(
        `
      SELECT approval_stage, decision FROM flight_station_task_approvals
      WHERE task_id = ?
    `
      )
      .all(task.id) as Array<{ approval_stage: string; decision: string }>;

    const hasStation = approvals.some(
      (a) => a.approval_stage === 'STATION' && ['APPROVED', 'OVERRIDDEN'].includes(a.decision)
    );
    const hasOCC = approvals.some(
      (a) => a.approval_stage === 'OCC' && ['APPROVED', 'OVERRIDDEN'].includes(a.decision)
    );
    return hasStation && hasOCC;
  }

  private hasUnresolvedMaintenanceIssues(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_maintenance_handoffs
      WHERE flight_id = ? AND status_id IN (
        SELECT id FROM maintenance_handoff_statuses WHERE code IN ('DRAFT', 'SUBMITTED')
      )
    `
      )
      .get(flightId) as any;
    return result.count > 0;
  }

  private hasCompletedReconciliation(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_actual_reconciliations
      WHERE flight_id = ?
    `
      )
      .get(flightId) as any;
    return result.count > 0;
  }

  private hasFuelRequest(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_fuel_requests
      WHERE flight_id = ?
    `
      )
      .get(flightId) as any;
    return result.count > 0;
  }

  private hasStationCosts(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_station_costs
      WHERE flight_id = ?
    `
      )
      .get(flightId) as any;
    return result.count > 0;
  }

  private hasApprovedStationCosts(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) AS count
      FROM flight_station_costs cost
      JOIN station_cost_statuses status ON status.id = cost.status_id
      WHERE cost.flight_id = ? AND status.code <> 'APPROVED'
    `
      )
      .get(flightId) as { count: number };
    return result.count === 0;
  }

  private hasRevenue(flightId: string, estimatedRevenue: unknown): boolean {
    if (estimatedRevenue !== null && estimatedRevenue !== undefined) return true;
    const result = this.sqlite
      .prepare(
        `
      SELECT EXISTS (
        SELECT 1 FROM passenger_tickets ticket
        WHERE ticket.flight_operation_id = ?
          AND ticket.ticket_status = 'ACTIVE' AND ticket.payment_status = 'PAID'
        UNION ALL
        SELECT 1 FROM cargo_bookings booking
        WHERE booking.flight_operation_id = ?
          AND booking.payment_status = 'PAID'
          AND booking.status IN ('BOOKED', 'DELIVERED')
      ) AS has_revenue
    `
      )
      .get(flightId, flightId) as { has_revenue: number };
    return Boolean(result.has_revenue);
  }

  // Override the closeFlight method to include verification-aware validation when
  // verification records exist; otherwise preserve the existing closure behavior.
  override closeFlight(id: string, actorUserId: string): FlightOperationDetailDto {
    return this.closeFlightWithRequirements(id, actorUserId).flight;
  }

  closeFlightWithRequirements(id: string, actorUserId: string) {
    const close = this.sqlite.transaction(() => {
      const flight = this.detail(id);

      if (flight.currentStatus === 'CLOSED') {
        return {
          flight,
          requirements: [] as ClosureRequirementResult[],
          invoice: null,
          accounting: null,
          alreadyClosed: true
        };
      }

      if (flight.currentStatus !== 'PENDING_CLOSURE') {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Only a flight pending closure can be closed.',
          409
        );
      }

      // Use the original closure readiness checks unless this flight has been
      // enrolled in the operational verification workbench (has station tasks
      // or reconciliation records). This keeps existing tests and legacy
      // flights working while applying the stricter assurance gates to flights
      // that actually use the verification flow.
      const verificationAware = this.hasVerificationRecords(id) && !this.isLegacyClosedFlight(id);
      let requirements: ClosureRequirementResult[] = [];

      if (verificationAware) {
        requirements = this.validateClosureRequirements(id, flight.serviceTypeCode);
      } else {
        const { missing } = flight.closureReadiness;
        if (missing.length) {
          throw new DomainError(
            'CLOSURE_REQUIREMENTS_INCOMPLETE',
            `Flight cannot be closed. Complete: ${missing.join(', ')}.`,
            422,
            { missing }
          );
        }
      }

      this.sqlite
        .prepare(
          `UPDATE flight_operation_approvals
           SET status_id = 'flight-approval-status-approved', requested_by_user_id = COALESCE(requested_by_user_id, ?),
               requested_at = COALESCE(requested_at, ?), decided_by_user_id = ?,
               decided_at = ?, updated_at = ?
           WHERE flight_id = ? AND approval_type_id = 'flight-approval-type-closure-approval'`
        )
        .run(actorUserId, timestamp(), actorUserId, timestamp(), timestamp(), id);

      // Base transition owns the single atomic invoice/accounting finalization path.
      const closedFlight = super.transition(id, 'CLOSED', actorUserId);

      return {
        flight: closedFlight,
        requirements,
        alreadyClosed: false
      };
    });
    return close.immediate();
  }

  private hasVerificationRecords(flightId: string): boolean {
    const stationTasks = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_station_tasks WHERE flight_id = ?
    `
      )
      .get(flightId) as { count: number };

    const reconciliations = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_actual_reconciliations WHERE flight_id = ?
    `
      )
      .get(flightId) as { count: number };

    return stationTasks.count > 0 || reconciliations.count > 0;
  }

  // Method to identify if a flight was closed under the old system (legacy)
  private isLegacyClosedFlight(flightId: string): boolean {
    const result = this.sqlite
      .prepare(
        `
      SELECT COUNT(*) as count FROM flight_operational_audit
      WHERE flight_id = ? AND module = 'LEGACY_ASSURANCE' AND action = 'LEGACY_CLOSED_MARKER'
    `
      )
      .get(flightId) as any;
    return result.count > 0;
  }

  override reopen(id: string, body: any, actorUserId: string) {
    const flight = this.requireFlight(id);
    if (flight.currentStatus !== 'CLOSED') {
      throw new DomainError('REOPEN_ONLY_CLOSED', 'Only closed flights can be reopened.', 409);
    }

    this.validateReason(body);

    const reopened = super.reopen(id, body, actorUserId);
    this.ensureOperationalVerificationTasks(id);
    this.sqlite
      .prepare(
        `DELETE FROM flight_station_task_approvals
         WHERE task_id IN (
           SELECT id FROM flight_station_tasks
           WHERE flight_id = ? AND task_code IN ('ORIGIN_STATION_SIGNOFF','DESTINATION_STATION_SIGNOFF')
         )`
      )
      .run(id);
    this.sqlite
      .prepare(
        `UPDATE flight_station_tasks
         SET status = 'PENDING', verified_by_user_id = NULL, verified_at = NULL,
             rejection_reason = NULL, version = version + 1, updated_at = ?
         WHERE flight_id = ?`
      )
      .run(timestamp(), id);
    this.sqlite
      .prepare(
        `DELETE FROM flight_operational_audit
         WHERE flight_id = ? AND action = 'LEGACY_CLOSED_MARKER'`
      )
      .run(id);

    // Invalidate flight-level verifications that are affected by reopening.
    // Origin and destination sign-offs, and any manual attestations, must be re-evaluated.
    const now = timestamp();
    const affectedCodes = ['ORIGIN_STATION_SIGNOFF', 'DESTINATION_STATION_SIGNOFF'];
    for (const checkCode of affectedCodes) {
      const existing = this.sqlite
        .prepare(
          `SELECT id FROM flight_readiness_verifications
           WHERE flight_id = ? AND check_code = ? AND verification_status = 'VERIFIED'`
        )
        .get(id, checkCode) as { id: string } | undefined;
      if (existing) {
        this.sqlite
          .prepare(
            `UPDATE flight_readiness_verifications
             SET verification_status = 'INVALIDATED', invalidated_at = ?, invalidation_reason = ?,
                 updated_at = ?
             WHERE id = ?`
          )
          .run(now, 'Flight reopened; sign-off must be re-verified.', now, existing.id);
      }
    }

    this.logAudit({
      actorUserId,
      actorRole: 'OCC',
      flightId: id,
      module: 'FLIGHT',
      action: 'REOPEN',
      beforeStatus: 'CLOSED',
      afterStatus: 'REOPENED_FOR_CORRECTION',
      reason: body.reasonNote || 'Flight reopened for correction'
    });

    return reopened;
  }

  private async evaluateSystemCheck(
    flightId: string,
    checkCode: string
  ): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // This would evaluate the system check based on source data
    // Implementation depends on the specific check type
    switch (checkCode) {
      case 'ROUTE_AVAILABILITY':
        // Check if route is available and not restricted
        return await this.evaluateRouteAvailability(flightId);
      case 'AIRCRAFT_SERVICEABILITY':
        // Check if aircraft is serviceable
        return await this.evaluateAircraftServiceability(flightId);
      case 'AIRCRAFT_LOCATION':
        // Check if aircraft is at the origin station
        return await this.evaluateAircraftLocation(flightId);
      case 'AIRCRAFT_SCHEDULE':
        // Check if aircraft schedule is clear
        return await this.evaluateAircraftSchedule(flightId);
      case 'AIRCRAFT_CAPACITY':
        // Check if aircraft has sufficient capacity
        return await this.evaluateAircraftCapacity(flightId);
      case 'CREW_AVAILABILITY':
        // Check if crew is available
        return await this.evaluateCrewAvailability(flightId);
      case 'CREW_LICENSE_MEDICAL':
        // Check if crew licenses and medicals are valid
        return await this.evaluateCrewLicenseMedical(flightId);
      case 'MANIFEST_APPROVED':
        // Check if manifest is approved
        return await this.evaluateManifestApproved(flightId);
      case 'FUEL_CONFIRMED':
        // Check if fuel is confirmed
        return await this.evaluateFuelConfirmed(flightId);
      default:
        // For other checks, default to PENDING
        return 'PENDING';
    }
  }

  private async evaluateRouteAvailability(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check route availability
    // Would check if the route is unrestricted and available
    const flight = this.getFlightById(flightId);
    if (!flight) return 'FAIL';

    // For demo purposes, assume route is available if it exists
    return 'PASS';
  }

  private async evaluateAircraftServiceability(
    flightId: string
  ): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check aircraft serviceability
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.aircraft_id) return 'PENDING';

    // Check aircraft serviceability status
    const aircraft = this.sqlite
      .prepare(
        `
      SELECT serviceability_status FROM aircraft WHERE id = ?
    `
      )
      .get(flight.aircraft_id) as any;

    if (!aircraft) return 'PENDING';

    return aircraft.serviceability_status === 'SERVICEABLE' ? 'PASS' : 'FAIL';
  }

  private async evaluateAircraftLocation(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check if aircraft is at origin station
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.aircraft_id || !flight.origin_station_id) return 'PENDING';

    const aircraft = this.sqlite
      .prepare(
        `
      SELECT current_station_id FROM aircraft WHERE id = ?
    `
      )
      .get(flight.aircraft_id) as any;

    if (!aircraft) return 'PENDING';

    return aircraft.current_station_id === flight.origin_station_id ? 'PASS' : 'FAIL';
  }

  private async evaluateAircraftSchedule(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check aircraft schedule conflicts
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.aircraft_id || !flight.scheduled_departure_at) return 'PENDING';

    // Check for schedule conflicts with the same aircraft
    const conflict = this.sqlite
      .prepare(
        `
      SELECT id FROM flight_operations 
      WHERE aircraft_id = ? 
      AND id != ?
      AND current_status_id NOT IN ('CLOSED', 'CANCELLED')
      AND (
        (scheduled_departure_at < ? AND scheduled_arrival_at > ?) OR
        (scheduled_departure_at < ? AND ? < scheduled_arrival_at)
      )
    `
      )
      .get(
        flight.aircraft_id,
        flightId,
        flight.scheduled_departure_at,
        flight.scheduled_departure_at,
        flight.scheduled_arrival_at,
        flight.scheduled_departure_at
      ) as any;

    return conflict ? 'FAIL' : 'PASS';
  }

  private async evaluateAircraftCapacity(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check aircraft capacity against planned load
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.aircraft_id) return 'PENDING';

    // Get aircraft capacity
    const aircraft = this.sqlite
      .prepare(
        `
      SELECT passenger_capacity, cargo_capacity_kg FROM aircraft WHERE id = ?
    `
      )
      .get(flight.aircraft_id) as any;

    if (!aircraft) return 'PENDING';

    // Get planned load from manifests
    const manifestStats = this.sqlite
      .prepare(
        `
      SELECT 
        SUM(passenger_count) as total_passengers,
        SUM(cargo_weight_kg) as total_cargo
      FROM flight_manifests 
      WHERE flight_operation_id = ? AND status_id IN (SELECT id FROM manifest_statuses WHERE code = 'APPROVED')
    `
      )
      .get(flightId) as any;

    const passengers = manifestStats?.total_passengers || 0;
    const cargo = manifestStats?.total_cargo || 0;

    const passengerOk = passengers <= aircraft.passenger_capacity;
    const cargoOk = cargo <= aircraft.cargo_capacity_kg;

    return passengerOk && cargoOk ? 'PASS' : 'FAIL';
  }

  private async evaluateCrewAvailability(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check if required crew is available
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.pilot_in_command_id) return 'PENDING';

    // Check PIC availability
    const pic = this.sqlite
      .prepare(
        `
      SELECT availability_status FROM crews WHERE id = ?
    `
      )
      .get(flight.pilot_in_command_id) as any;

    if (!pic) return 'PENDING';

    return pic.availability_status === 'AVAILABLE' ? 'PASS' : 'FAIL';
  }

  private async evaluateCrewLicenseMedical(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Implementation to check if crew licenses and medicals are valid
    const flight = this.getFlightById(flightId);
    if (!flight || !flight.pilot_in_command_id) return 'PENDING';

    // Check PIC license and medical validity
    const pic = this.sqlite
      .prepare(
        `
      SELECT license_expiry_date, medical_expiry_date FROM crews WHERE id = ?
    `
      )
      .get(flight.pilot_in_command_id) as any;

    if (!pic) return 'PENDING';

    const today = new Date();

    if (pic.license_expiry_date) {
      const licenseExp = new Date(pic.license_expiry_date);
      if (licenseExp < today) return 'FAIL';
    }

    if (pic.medical_expiry_date) {
      const medicalExp = new Date(pic.medical_expiry_date);
      if (medicalExp < today) return 'FAIL';
    }

    return 'PASS';
  }

  private async evaluateManifestApproved(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Check if flight manifest is approved
    const manifest = this.sqlite
      .prepare(
        `
      SELECT m.id FROM flight_manifests m
      JOIN manifest_statuses ms ON ms.id = m.status_id
      WHERE m.flight_operation_id = ? AND ms.code = 'APPROVED'
    `
      )
      .get(flightId) as any;

    return manifest ? 'PASS' : 'FAIL';
  }

  private async evaluateFuelConfirmed(flightId: string): Promise<'PASS' | 'FAIL' | 'PENDING'> {
    // Check if fuel request is confirmed
    const fuelRequest = this.sqlite
      .prepare(
        `
      SELECT fr.id FROM flight_fuel_requests fr
      JOIN fuel_request_statuses frs ON frs.id = fr.status_id
      WHERE fr.flight_id = ? AND frs.code = 'CONFIRMED'
    `
      )
      .get(flightId) as any;

    return fuelRequest ? 'PASS' : 'FAIL';
  }

  private getFlightById(flightId: string) {
    return this.sqlite
      .prepare(
        `
      SELECT * FROM flight_operations WHERE id = ?
    `
      )
      .get(flightId) as any;
  }

  private async getFlightStationServices(flightId: string) {
    const sql = `
      SELECT
        fsr.id,
        fsr.station_id,
        s.station_code,
        fsr.service_supplier_id,
        sup.supplier_name,
        fsr.service_type_id,
        st.code as service_type,
        ss.code as status,
        fsr.reference_rate,
        fsr.confirmed_at,
        fsr.confirmed_by_user_id,
        fsr.rejection_note,
        fsr.version
      FROM flight_station_service_requests fsr
      JOIN station_service_types st ON st.id = fsr.service_type_id
      JOIN station_service_statuses ss ON ss.id = fsr.status_id
      JOIN stations s ON s.id = fsr.station_id
      JOIN station_service_suppliers sup ON sup.id = fsr.service_supplier_id
      WHERE fsr.flight_id = ?
    `;

    const rows = this.sqlite.prepare(sql).all(flightId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      serviceSupplierId: String(row.service_supplier_id),
      supplierName: String(row.supplier_name),
      serviceTypeId: String(row.service_type_id),
      serviceType: String(row.service_type),
      status: String(row.status),
      referenceRate: row.reference_rate ? Number(row.reference_rate) : null,
      confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
      confirmedByUserId: row.confirmed_by_user_id ? String(row.confirmed_by_user_id) : null,
      rejectionNote: row.rejection_note ? String(row.rejection_note) : null,
      version: Number(row.version)
    }));
  }

  private async getFlightStationCosts(flightId: string) {
    const sql = `
      SELECT
        fc.id,
        fc.station_id,
        s.station_code,
        fc.vendor_id,
        v.vendor_name,
        fc.cost_category_id,
        cc.category_name as cost_category_name,
        fc.amount,
        fc.currency_id,
        cur.currency_code,
        fc.description,
        scs.code as status,
        fc.submitted_by_user_id,
        fc.approved_by_user_id,
        fc.approved_at,
        fc.version
      FROM flight_station_costs fc
      JOIN station_cost_statuses scs ON scs.id = fc.status_id
      JOIN stations s ON s.id = fc.station_id
      LEFT JOIN vendors v ON v.id = fc.vendor_id
      JOIN cost_categories cc ON cc.id = fc.cost_category_id
      JOIN currencies cur ON cur.id = fc.currency_id
      WHERE fc.flight_id = ?
    `;

    const rows = this.sqlite.prepare(sql).all(flightId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      stationId: String(row.station_id),
      stationCode: String(row.station_code),
      vendorId: row.vendor_id ? String(row.vendor_id) : null,
      vendorName: row.vendor_name ? String(row.vendor_name) : null,
      costCategoryId: String(row.cost_category_id),
      costCategoryName: String(row.cost_category_name),
      amount: Number(row.amount),
      currencyId: String(row.currency_id),
      currencyCode: String(row.currency_code),
      description: String(row.description),
      status: String(row.status),
      submittedByUserId: row.submitted_by_user_id ? String(row.submitted_by_user_id) : null,
      approvedByUserId: row.approved_by_user_id ? String(row.approved_by_user_id) : null,
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      version: Number(row.version)
    }));
  }

  private async logAudit(input: any): Promise<void> {
    const id = `audit-${nanoid(10)}`;

    const insertSql = `
      INSERT INTO flight_operational_audit (
        id, actor_user_id, actor_role, flight_id, station_id, module, action,
        before_status, after_status, reason, evidence_ids, request_id, metadata, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.sqlite
      .prepare(insertSql)
      .run(
        id,
        input.actorUserId,
        input.actorRole,
        input.flightId,
        input.stationId || null,
        input.module,
        input.action,
        input.beforeStatus || null,
        input.afterStatus || null,
        input.reason || null,
        input.evidenceIds ? JSON.stringify(input.evidenceIds) : null,
        input.requestId || null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.timestamp || timestamp(),
        timestamp()
      );
  }
}

function timestamp() {
  return getApplicationNow();
}
