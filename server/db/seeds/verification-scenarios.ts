import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { getApplicationNow } from '../../utils/time';

function now() {
  return getApplicationNow();
}

function insertIgnore(
  sqlite: Database.Database,
  table: string,
  row: Record<string, string | number | boolean | null>
) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
  const placeholders = keys.map((key) => `@${key}`);
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
    )
    .run(row);
}

function findTasksForFlight(sqlite: Database.Database, flightId: string) {
  return sqlite
    .prepare(
      `SELECT id, task_code, station_id, status FROM flight_station_tasks WHERE flight_id = ?`
    )
    .all(flightId) as Array<{ id: string; task_code: string; station_id: string; status: string }>;
}

function ensureDestinationTasks(
  sqlite: Database.Database,
  flightId: string,
  destinationStationId: string
) {
  const existing = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM flight_station_tasks WHERE flight_id = ? AND station_id = ?`
    )
    .get(flightId, destinationStationId) as { count: number };
  if (existing.count > 0) return;

  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO flight_station_tasks (
      id, flight_id, station_id, phase, task_code, task_title, status,
      assigned_role, requires_evidence, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasks = [
    {
      code: 'DESTINATION_HANDLING',
      title: 'Destination station handling confirmation'
    },
    {
      code: 'DESTINATION_DOCUMENTS',
      title: 'Destination required documents verification'
    }
  ];

  for (const task of tasks) {
    insert.run(
      `stask-${flightId}-${task.code.toLowerCase()}`,
      flightId,
      destinationStationId,
      'DESTINATION_ARRIVAL',
      task.code,
      task.title,
      'PENDING',
      'Station Admin',
      1,
      1,
      now(),
      now()
    );
  }
}

function addEvidence(
  sqlite: Database.Database,
  flightId: string,
  stationTaskId: string,
  fileName: string,
  uploadedBy: string,
  notes?: string
) {
  insertIgnore(sqlite, 'flight_verification_evidence', {
    id: `evid-${nanoid(10)}`,
    flightId,
    stationTaskId,
    uploadId: `upload-${nanoid(10)}`,
    documentType: 'VERIFICATION_EVIDENCE',
    fileName,
    notes: notes ?? null,
    uploadedByUserId: uploadedBy,
    uploadedAt: now(),
    createdAt: now(),
    updatedAt: now()
  });
}

function addTaskApproval(
  sqlite: Database.Database,
  taskId: string,
  stage: 'STATION' | 'OCC',
  decision: 'APPROVED' | 'REJECTED',
  actorUserId: string,
  actorRole: string,
  reason?: string
) {
  insertIgnore(sqlite, 'flight_station_task_approvals', {
    id: `tapprove-${nanoid(10)}`,
    taskId,
    approvalStage: stage,
    decision,
    actorUserId,
    actorRole,
    reason: reason ?? null,
    approvedAt: now(),
    createdAt: now(),
    updatedAt: now()
  });
}

function addAuditEntry(
  sqlite: Database.Database,
  input: {
    flightId: string;
    stationId?: string;
    module: string;
    action: string;
    beforeStatus?: string;
    afterStatus?: string;
    reason?: string;
    actorUserId?: string;
    actorRole?: string;
  }
) {
  insertIgnore(sqlite, 'flight_operational_audit', {
    id: `audit-${nanoid(10)}`,
    actorUserId: input.actorUserId ?? 'USR-STATION-ADMIN',
    actorRole: input.actorRole ?? 'Station Admin',
    flightId: input.flightId,
    stationId: input.stationId ?? null,
    module: input.module,
    action: input.action,
    beforeStatus: input.beforeStatus ?? null,
    afterStatus: input.afterStatus ?? null,
    reason: input.reason ?? null,
    evidenceIds: null,
    requestId: null,
    metadata: null,
    timestamp: now(),
    createdAt: now()
  });
}

function updateTaskStatus(
  sqlite: Database.Database,
  taskId: string,
  status: string,
  verifiedBy?: string
) {
  sqlite
    .prepare(
      `UPDATE flight_station_tasks
       SET status = ?, verified_by_user_id = ?, verified_at = ?, version = version + 1, updated_at = ?
       WHERE id = ?`
    )
    .run(status, verifiedBy ?? null, verifiedBy ? now() : null, now(), taskId);
}

function addReconciliation(
  sqlite: Database.Database,
  flightId: string,
  plannedPassengers: number,
  actualPassengers: number,
  plannedCargoKg: number,
  actualCargoKg: number
) {
  insertIgnore(sqlite, 'flight_actual_reconciliations', {
    id: `recon-${nanoid(10)}`,
    flightId,
    plannedPassengers,
    actualPassengers,
    plannedCargoKg,
    actualCargoKg,
    noShowPassengers: Math.max(0, plannedPassengers - actualPassengers),
    offloadedCargoKg: 0,
    totalDiscrepancyNote:
      plannedPassengers === actualPassengers && plannedCargoKg === actualCargoKg
        ? 'No discrepancy'
        : 'Minor discrepancy within tolerance',
    reconciledByUserId: 'USR-OCC',
    reconciledAt: now(),
    version: 1,
    createdAt: now(),
    updatedAt: now()
  });
}

export function seedVerificationScenarios(sqlite: Database.Database) {
  const timestamp = now();

  // ---------------------------------------------------------------------------
  // fop-in-progress: departed WMX -> OKS, origin tasks completed
  // ---------------------------------------------------------------------------
  const inProgressTasks = findTasksForFlight(sqlite, 'fop-in-progress');
  for (const task of inProgressTasks.filter((t) => t.station_id === 'st-wmx')) {
    addEvidence(
      sqlite,
      'fop-in-progress',
      task.id,
      'origin-handling-evidence.pdf',
      'USR-STATION-ADMIN'
    );
    updateTaskStatus(sqlite, task.id, 'VERIFIED', 'USR-STATION-ADMIN');
    if (task.task_code.endsWith('STATION_SIGNOFF')) {
      addTaskApproval(sqlite, task.id, 'STATION', 'APPROVED', 'USR-STATION-ADMIN', 'Station Admin');
      addTaskApproval(sqlite, task.id, 'OCC', 'APPROVED', 'USR-001', 'OCC');
    }
    addAuditEntry(sqlite, {
      flightId: 'fop-in-progress',
      stationId: 'st-wmx',
      module: 'STATION_TASK',
      action: 'COMPLETE',
      beforeStatus: 'PENDING',
      afterStatus: 'VERIFIED',
      reason: `Origin ${task.task_code} completed before departure`
    });
  }

  // ---------------------------------------------------------------------------
  // fop-pending-closure: DJJ -> TIM landed, destination tasks verified, awaiting OCC
  // ---------------------------------------------------------------------------
  ensureDestinationTasks(sqlite, 'fop-pending-closure', 'st-tim');
  const pendingClosureTasks = findTasksForFlight(sqlite, 'fop-pending-closure');
  for (const task of pendingClosureTasks.filter((t) => t.station_id === 'st-djj')) {
    addEvidence(
      sqlite,
      'fop-pending-closure',
      task.id,
      'origin-documents.pdf',
      'USR-STATION-ADMIN'
    );
    updateTaskStatus(sqlite, task.id, 'VERIFIED', 'USR-STATION-ADMIN');
    if (task.task_code.endsWith('STATION_SIGNOFF')) {
      addTaskApproval(sqlite, task.id, 'STATION', 'APPROVED', 'USR-STATION-ADMIN', 'Station Admin');
      addTaskApproval(sqlite, task.id, 'OCC', 'APPROVED', 'USR-001', 'OCC');
    }
  }
  for (const task of pendingClosureTasks.filter((t) => t.station_id === 'st-tim')) {
    addEvidence(
      sqlite,
      'fop-pending-closure',
      task.id,
      'destination-handling-evidence.pdf',
      'USR-STATION-ADMIN'
    );
    updateTaskStatus(sqlite, task.id, 'VERIFIED', 'USR-STATION-ADMIN');
    if (task.task_code.endsWith('STATION_SIGNOFF')) {
      addTaskApproval(sqlite, task.id, 'STATION', 'APPROVED', 'USR-STATION-ADMIN', 'Station Admin');
    }
    // OCC approval pending - demonstrates dual approval gate
  }
  addReconciliation(sqlite, 'fop-pending-closure', 12, 11, 120, 118);
  addAuditEntry(sqlite, {
    flightId: 'fop-pending-closure',
    module: 'RECONCILIATION',
    action: 'CREATE',
    afterStatus: 'VERIFIED'
  });

  // ---------------------------------------------------------------------------
  // fop-landed-maintenance: WMX -> OKS, destination handling pending
  // ---------------------------------------------------------------------------
  ensureDestinationTasks(sqlite, 'fop-landed-maintenance', 'st-oks');
  const landedTasks = findTasksForFlight(sqlite, 'fop-landed-maintenance');
  for (const task of landedTasks.filter((t) => t.station_id === 'st-wmx')) {
    addEvidence(
      sqlite,
      'fop-landed-maintenance',
      task.id,
      'origin-handling-signed.pdf',
      'USR-STATION-ADMIN'
    );
    updateTaskStatus(sqlite, task.id, 'VERIFIED', 'USR-STATION-ADMIN');
    if (task.task_code.endsWith('STATION_SIGNOFF')) {
      addTaskApproval(sqlite, task.id, 'STATION', 'APPROVED', 'USR-STATION-ADMIN', 'Station Admin');
      addTaskApproval(sqlite, task.id, 'OCC', 'APPROVED', 'USR-001', 'OCC');
    }
  }
  addReconciliation(sqlite, 'fop-landed-maintenance', 0, 0, 650, 640);

  // ---------------------------------------------------------------------------
  // fop-ticketing-passenger: scheduled DJJ -> WMX, origin tasks pending with no evidence
  // ---------------------------------------------------------------------------
  // Leave tasks in PENDING to show fresh workbench state.

  // ---------------------------------------------------------------------------
  // fop-dg-pending: cargo with dangerous goods, origin handling rejected then overridden
  // ---------------------------------------------------------------------------
  const dgTasks = findTasksForFlight(sqlite, 'fop-dg-pending');
  const dgHandlingTask = dgTasks.find((t) => t.task_code === 'ORIGIN_HANDLING');
  if (dgHandlingTask) {
    addEvidence(
      sqlite,
      'fop-dg-pending',
      dgHandlingTask.id,
      'dg-cargo-manifest.pdf',
      'USR-STATION-ADMIN',
      'DG cargo attached'
    );
    updateTaskStatus(sqlite, dgHandlingTask.id, 'REJECTED', 'USR-STATION-ADMIN');
    sqlite
      .prepare(`UPDATE flight_station_tasks SET rejection_reason = ?, updated_at = ? WHERE id = ?`)
      .run('DG acceptance pending - cannot verify handling', timestamp, dgHandlingTask.id);
    addAuditEntry(sqlite, {
      flightId: 'fop-dg-pending',
      stationId: 'st-djj',
      module: 'STATION_TASK',
      action: 'REJECT',
      beforeStatus: 'PENDING',
      afterStatus: 'REJECTED',
      reason: 'DG acceptance pending - cannot verify handling'
    });
    // Emergency override by authorized system administrator
    updateTaskStatus(sqlite, dgHandlingTask.id, 'VERIFIED', 'USR-ADMIN');
    sqlite
      .prepare(`UPDATE flight_station_tasks SET notes = ?, updated_at = ? WHERE id = ?`)
      .run(
        'Emergency override: customer-confirmed DG will be accepted before uplift',
        timestamp,
        dgHandlingTask.id
      );
    addAuditEntry(sqlite, {
      flightId: 'fop-dg-pending',
      stationId: 'st-djj',
      module: 'STATION_TASK',
      action: 'OVERRIDE',
      beforeStatus: 'REJECTED',
      afterStatus: 'VERIFIED',
      reason: 'Customer-confirmed DG will be accepted before uplift',
      actorUserId: 'USR-ADMIN',
      actorRole: 'System Administrator'
    });
  }

  // ---------------------------------------------------------------------------
  // fop-closed-djj-wmx: legacy closed flight marker already handled by migration,
  // add reconciliation for completeness
  // ---------------------------------------------------------------------------
  addReconciliation(sqlite, 'fop-closed-djj-wmx', 2, 2, 640, 640);

  console.log('Verification scenarios seeded');
}
