import { and, desc, eq, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { 
  safetyPersonnelCompetencies, 
  corporateRiskRegister, 
  safetyGovernancePolicies, 
  justCultureAssessments,
  crews 
} from '../../../db/schema';
import type { 
  PersonnelCompetencyDto, 
  CorporateRiskDto, 
  SafetyPolicyDto, 
  JustCultureAssessmentDto, 
  CompetencyMatrixQuery,
  CorporateRiskInput,
  JustCultureInput
} from './types';

export class SafetyTrainingRepository {
  constructor(private readonly db: AppDatabase) {}

  // ── 1. Competency Matrix ───────────────────────────────────────────
  async listCompetencies(query: CompetencyMatrixQuery): Promise<PersonnelCompetencyDto[]> {
    const conditions: SQL[] = [];
    if (query.personnelId) conditions.push(eq(safetyPersonnelCompetencies.personnelId, query.personnelId));
    if (query.competencyType) conditions.push(eq(safetyPersonnelCompetencies.competencyType, query.competencyType));
    if (query.status) conditions.push(eq(safetyPersonnelCompetencies.status, query.status));

    const rows = await this.db
      .select({
        competency: safetyPersonnelCompetencies,
        crewName: crews.fullName,
        crewRole: crews.crewRole,
        crewLicense: crews.licenseNumber
      })
      .from(safetyPersonnelCompetencies)
      .leftJoin(crews, eq(safetyPersonnelCompetencies.personnelId, crews.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(safetyPersonnelCompetencies.expiresAt));

    return rows.map((r) => ({
      id: r.competency.id,
      personnelId: r.competency.personnelId,
      personnelName: r.crewName ?? 'Unknown Personnel',
      role: r.crewRole ?? undefined,
      licenseNumber: r.crewLicense ?? undefined,
      competencyType: r.competency.competencyType as PersonnelCompetencyDto['competencyType'],
      certificateNumber: r.competency.certificateNumber,
      issuedAt: r.competency.issuedAt,
      expiresAt: r.competency.expiresAt,
      status: r.competency.status as PersonnelCompetencyDto['status'],
      documentId: r.competency.documentId,
      createdAt: r.competency.createdAt,
      updatedAt: r.competency.updatedAt
    }));
  }

  // ── 2. Corporate Risk Register ─────────────────────────────────────
  async listCorporateRisks(): Promise<CorporateRiskDto[]> {
    const rows = await this.db
      .select()
      .from(corporateRiskRegister)
      .orderBy(desc(corporateRiskRegister.initialRiskLevel));

    return rows.map((row) => ({
      id: row.id,
      riskCode: row.riskCode,
      title: row.title,
      hazardDescription: row.hazardDescription,
      initialSeverity: row.initialSeverity as CorporateRiskDto['initialSeverity'],
      initialLikelihood: row.initialLikelihood as CorporateRiskDto['initialLikelihood'],
      initialRiskIndex: row.initialRiskIndex,
      initialRiskLevel: row.initialRiskLevel as CorporateRiskDto['initialRiskLevel'],
      mitigationBarriers: row.mitigationBarriers,
      residualSeverity: row.residualSeverity as CorporateRiskDto['residualSeverity'],
      residualLikelihood: row.residualLikelihood as CorporateRiskDto['residualLikelihood'],
      residualRiskIndex: row.residualRiskIndex,
      residualRiskLevel: row.residualRiskLevel as CorporateRiskDto['residualRiskLevel'],
      riskOwnerRole: row.riskOwnerRole,
      reviewFrequency: row.reviewFrequency as CorporateRiskDto['reviewFrequency'],
      lastReviewedAt: row.lastReviewedAt,
      status: row.status as CorporateRiskDto['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  async createCorporateRisk(id: string, input: CorporateRiskInput, timestamp: string): Promise<CorporateRiskDto> {
    const row = await this.db
      .insert(corporateRiskRegister)
      .values({
        id,
        riskCode: input.riskCode,
        title: input.title,
        hazardDescription: input.hazardDescription,
        initialSeverity: input.initialSeverity,
        initialLikelihood: input.initialLikelihood,
        initialRiskIndex: input.initialRiskIndex,
        initialRiskLevel: input.initialRiskLevel,
        mitigationBarriers: input.mitigationBarriers,
        residualSeverity: input.residualSeverity,
        residualLikelihood: input.residualLikelihood,
        residualRiskIndex: input.residualRiskIndex,
        residualRiskLevel: input.residualRiskLevel,
        riskOwnerRole: input.riskOwnerRole,
        reviewFrequency: input.reviewFrequency ?? 'QUARTERLY',
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();

    return row as unknown as CorporateRiskDto;
  }

  // ── 3. Safety Governance Policies ──────────────────────────────────
  async listPolicies(): Promise<SafetyPolicyDto[]> {
    const rows = await this.db
      .select()
      .from(safetyGovernancePolicies)
      .orderBy(safetyGovernancePolicies.policyCode);

    return rows.map((row) => ({
      id: row.id,
      policyCode: row.policyCode,
      title: row.title,
      revision: row.revision,
      signeeRole: row.signeeRole,
      effectiveFrom: row.effectiveFrom,
      validUntil: row.validUntil,
      documentId: row.documentId,
      acknowledgementRequired: row.acknowledgementRequired,
      status: row.status as SafetyPolicyDto['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  // ── 4. Just Culture Assessments ────────────────────────────────────
  async listJustCultureAssessments(): Promise<JustCultureAssessmentDto[]> {
    const rows = await this.db
      .select()
      .from(justCultureAssessments)
      .orderBy(desc(justCultureAssessments.assessedAt));

    return rows.map((row) => ({
      id: row.id,
      sourceReportId: row.sourceReportId,
      decisionPath: row.decisionPath as JustCultureAssessmentDto['decisionPath'],
      actionType: row.actionType as JustCultureAssessmentDto['actionType'],
      isNonPunitiveProtected: row.isNonPunitiveProtected,
      justificationNotes: row.justificationNotes,
      assessedByUserId: row.assessedByUserId,
      assessedAt: row.assessedAt,
      createdAt: row.createdAt
    }));
  }

  async createJustCultureAssessment(id: string, input: JustCultureInput, timestamp: string): Promise<JustCultureAssessmentDto> {
    const row = await this.db
      .insert(justCultureAssessments)
      .values({
        id,
        sourceReportId: input.sourceReportId,
        decisionPath: input.decisionPath,
        actionType: input.actionType,
        isNonPunitiveProtected: input.isNonPunitiveProtected ?? true,
        justificationNotes: input.justificationNotes,
        assessedByUserId: input.assessedByUserId,
        assessedAt: timestamp,
        createdAt: timestamp
      })
      .returning()
      .get();

    return row as unknown as JustCultureAssessmentDto;
  }
}