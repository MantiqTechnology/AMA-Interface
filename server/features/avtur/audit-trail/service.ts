import { AvturAuditTrailRepository } from './repository';

export class AvturAuditTrailService {
  constructor(private readonly repository: AvturAuditTrailRepository) {}

  getLogs(limit?: number) {
    return this.repository.getRecentLogs(limit);
  }
}