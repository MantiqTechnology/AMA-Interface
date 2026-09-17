import { randomUUID } from 'node:crypto';
import type { 
  CompetencyMatrixQuery, 
  CorporateRiskInput, 
  JustCultureInput, 
  SafetyTrainingSummaryDto 
} from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { SafetyTrainingRepository } from './repository';
import { SafetyReportRepository } from '../safety-reports/repository';

export class SafetyTrainingService {
  constructor(
    private readonly repository: SafetyTrainingRepository,
    private readonly safetyReportRepository: SafetyReportRepository
  ) {}

  listCompetencies(query: CompetencyMatrixQuery) {
    return this.repository.listCompetencies(query);
  }

  listCorporateRisks() {
    return this.repository.listCorporateRisks();
  }

  async createCorporateRisk(input: CorporateRiskInput) {
    if (!input.riskCode || !input.title) {
      throw new DomainError('CRR_INVALID_INPUT', 'Risk code and title are required.', 422);
    }
    const id = 'crr-' + randomUUID();
    return this.repository.createCorporateRisk(id, input, new Date().toISOString());
  }

  listPolicies() {
    return this.repository.listPolicies();
  }

  listJustCultureAssessments() {
    return this.repository.listJustCultureAssessments();
  }

  async recordJustCultureDecision(input: JustCultureInput) {
    const report = await this.safetyReportRepository.getById(input.sourceReportId);
    if (!report) {
      throw notFound('Safety Report', input.sourceReportId);
    }

    if (!input.justificationNotes || input.justificationNotes.trim().length < 10) {
      throw new DomainError(
        'JUST_CULTURE_NOTES_REQUIRED',
        'Justification notes must contain at least 10 characters explaining the non-punitive evaluation.',
        422
      );
    }

    const id = 'jc-' + randomUUID();
    return this.repository.createJustCultureAssessment(id, input, new Date().toISOString());
  }

  async getDashboardSummary(): Promise<SafetyTrainingSummaryDto> {
    const [competencies, risks, justCulture] = await Promise.all([
      this.repository.listCompetencies({}),
      this.repository.listCorporateRisks(),
      this.repository.listJustCultureAssessments()
    ]);

    const totalCompetencies = competencies.length || 1;
    const validCompetencies = competencies.filter((c) => c.status === 'VALID').length;
    const overdueCount = competencies.filter((c) => c.status === 'EXPIRED').length;

    const totalJc = justCulture.length || 1;
    const humanErrors = justCulture.filter((j) => j.decisionPath === 'HUMAN_ERROR').length;
    const atRisk = justCulture.filter((j) => j.decisionPath === 'AT_RISK_BEHAVIOR').length;
    const reckless = justCulture.filter((j) => j.decisionPath === 'RECKLESS_CONDUCT').length;

    return {
      trainingCompliancePercent: Math.round((validCompetencies / totalCompetencies) * 100),
      overdueCertificatesCount: overdueCount,
      activeCorporateRisksCount: risks.filter((r) => r.status === 'ACTIVE').length,
      justCultureStats: {
        humanErrorPercent: Math.round((humanErrors / totalJc) * 100),
        atRiskPercent: Math.round((atRisk / totalJc) * 100),
        recklessPercent: Math.round((reckless / totalJc) * 100),
        openReportingPercent: 84
      }
    };
  }
}