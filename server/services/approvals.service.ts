import type { DecideApprovalBody } from '../../shared/contracts/approvals';
import type { DemoRole } from '../../shared/types/roles';
import type { Repositories } from '../repositories/interfaces';
import { notFound } from '../utils/errors';
import { mapApproval } from './mappers';

export class ApprovalsService {
  constructor(private readonly repositories: Repositories) {}

  async listApprovals(query: {
    status?: 'pending' | 'approved' | 'rejected';
    roleRequired?: DemoRole;
    limit: number;
    offset: number;
  }) {
    const rows = await this.repositories.approvals.list(query);
    return rows.map(mapApproval);
  }

  async decideApproval(id: string, input: DecideApprovalBody) {
    const updated = await this.repositories.approvals.decide({
      id,
      status: input.decision,
      decidedBy: input.decidedBy,
      decidedAt: new Date().toISOString(),
      reason: input.reason
    });

    if (!updated) {
      throw notFound('Approval', id);
    }

    return mapApproval(updated);
  }
}
