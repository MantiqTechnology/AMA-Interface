// server/features/sms/safety-assurance/service.ts

import { SafetyAssuranceRepository } from './repository';

export class SafetyAssuranceService {
  constructor(private readonly repository: SafetyAssuranceRepository) {}

  async getDashboardData() {
    // Jalankan query secara paralel agar lebih cepat (Performa tinggi)
    const [audits, mocs] = await Promise.all([
      this.repository.getRecentAudits(),
      this.repository.getActiveMocs()
    ]);

    // Kalkulasi total temuan (findings) yang butuh aksi
    const totalOpenFindings = audits
      .filter(
        (a) =>
          a.status === 'ACTION_REQUIRED' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED'
      )
      .reduce((sum, audit) => sum + audit.findingsCount, 0);

    const scheduledAuditsCount = audits.filter((a) => a.status === 'SCHEDULED').length;

    return {
      audits,
      mocs,
      summary: {
        activeMocs: mocs.length,
        scheduledAudits: scheduledAuditsCount,
        openFindings: totalOpenFindings,
        complianceRate: 98.5 // Target KPI (Bisa dikalkulasi dinamis di masa depan)
      }
    };
  }
}
