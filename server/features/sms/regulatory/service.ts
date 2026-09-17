import { SmsRegulatoryRepository } from './repository';
import type { RegulatoryDashboardSummary } from './types';

export class SmsRegulatoryService {
  constructor(private readonly repo: SmsRegulatoryRepository = new SmsRegulatoryRepository()) {}

  async getDashboardSummary(): Promise<RegulatoryDashboardSummary> {
    const [reports, companyCertificates, manuals, upcomingDeadlines, authorityInbox] = await Promise.all([
      this.repo.getRegulatoryReports(),
      this.repo.getCompanyCertificates(),
      this.repo.getOperationsManuals(),
      this.repo.getUpcomingDeadlines(),
      this.repo.getAuthorityInbox(),
    ]);

    // Kalkulasi agregasi bisnis
    const morPendingCount = reports.filter(r => r.status === 'Draft' || r.status === 'Pending Approval').length;
    const manualApprovalsPending = manuals.filter(m => m.status === 'Pending DKUPPU').length;

    return {
      aocDaysRemaining: 284,
      aocExpiryDate: '04 Jun 2027',
      morFiledYtd: 24,
      morPendingCount,
      avgSubmissionHours: 38,
      manualApprovalsPending,
      reports,
      companyCertificates,
      manuals,
      upcomingDeadlines,
      authorityInbox
    };
  }
}