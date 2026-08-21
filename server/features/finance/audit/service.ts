import { nanoid } from 'nanoid';
import type Database from 'better-sqlite3';

export type FinanceAuditInput = {
  actorId: string;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  sourceReference?: string | null;
  before?: unknown;
  after?: unknown;
};

export class FinanceAuditService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly now: () => string
  ) {}

  record(input: FinanceAuditInput) {
    const id = `finance-audit-${nanoid(12)}`;
    this.sqlite
      .prepare(
        `INSERT INTO financial_audit_logs (
      id, actor_id, actor_role, action, entity_type, entity_id, reason,
      source_reference, before_json, after_json, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.actorId,
        input.actorRole ?? null,
        input.action,
        input.entityType,
        input.entityId,
        input.reason ?? null,
        input.sourceReference ?? null,
        input.before === undefined ? null : JSON.stringify(input.before),
        input.after === undefined ? null : JSON.stringify(input.after),
        this.now()
      );
    return id;
  }
}
