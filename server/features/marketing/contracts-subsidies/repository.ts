import type Database from 'better-sqlite3';
import type {
  CommercialContractPortfolioItemDto,
  ContractSourceMixItemDto,
  ContractSubsidyActivityItemDto,
  ContractSubsidyHistoryItemDto,
  ContractSubsidyOverviewDto,
  ContractSubsidyRenewalItemDto,
  ContractsSubsidiesQuery,
  SubsidyAbsorptionLineDto,
  SubsidyProgramDto
} from '../../../../shared/features/marketing/contracts-subsidies';
import { getApplicationNow } from '../../../utils/time';

const money = (value: number | null | undefined) => String(Math.max(Math.round(value ?? 0), 0));

const sourceLabels: Record<CommercialContractPortfolioItemDto['sourceType'], string> = {
  CUSTOMER_CONTRACT: 'Customer contracts',
  AGENT_CONTRACT: 'Agent contracts',
  RATE_CONTRACT: 'Rate contracts'
};

function resolveSnapshot(query: Partial<ContractsSubsidiesQuery> = {}) {
  return query.to ?? getApplicationNow().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export class ContractsSubsidiesRepository {
  constructor(private readonly sqlite: Database.Database) {}

  overview(query: Partial<ContractsSubsidiesQuery> = {}): ContractSubsidyOverviewDto {
    const snapshot = resolveSnapshot(query);
    const asOf = `${snapshot}T00:00:00.000Z`;
    const contractRow = this.sqlite
      .prepare(
        `SELECT
          SUM(CASE WHEN status = 'ACTIVE'
            AND (effectiveFrom IS NULL OR effectiveFrom <= @snapshot)
            AND (effectiveUntil IS NULL OR effectiveUntil >= @snapshot) THEN 1 ELSE 0 END) AS activeContractCount,
          SUM(CASE WHEN status = 'ACTIVE' AND effectiveUntil >= @snapshot
            AND effectiveUntil <= date(@snapshot, '+60 day') THEN 1 ELSE 0 END) AS expiringContractCount,
          SUM(CASE WHEN status = 'ACTIVE'
            AND renewalStatus IN ('REVIEW_REQUIRED', 'DUE_SOON')
            AND (effectiveFrom IS NULL OR effectiveFrom <= @snapshot)
            AND (effectiveUntil IS NULL OR effectiveUntil >= @snapshot) THEN 1 ELSE 0 END) AS pendingRenewalCount,
          SUM(CASE WHEN status IN ('TERMINATED', 'EXPIRED', 'ARCHIVED')
            AND (effectiveFrom IS NULL OR effectiveFrom <= @snapshot)
            AND (effectiveUntil IS NULL OR effectiveUntil <= @snapshot) THEN 1 ELSE 0 END) AS terminatedContractCount
        FROM (
          SELECT status, effective_from AS effectiveFrom, effective_until AS effectiveUntil, renewal_status AS renewalStatus FROM customer_contracts
          UNION ALL
          SELECT status, effective_from AS effectiveFrom, effective_until AS effectiveUntil, renewal_status AS renewalStatus FROM agent_contracts
          UNION ALL
          SELECT status, effective_from AS effectiveFrom, effective_until AS effectiveUntil, NULL AS renewalStatus FROM rate_contract_links
        ) contracts`
      )
      .get({ snapshot }) as {
      activeContractCount: number | null;
      expiringContractCount: number | null;
      pendingRenewalCount: number | null;
      terminatedContractCount: number | null;
    };
    const subsidyRow = this.sqlite
      .prepare(
        `SELECT
          COUNT(*) AS activeSubsidyProgramCount,
          COALESCE(SUM(program.allocated_budget_minor), 0) AS allocatedBudgetMinor,
          COALESCE((
            SELECT SUM(consumption.amount_minor)
            FROM contract_subsidy_consumptions consumption
            JOIN contract_subsidy_programs program2 ON program2.id = consumption.program_id
            WHERE program2.lifecycle_status = 'ACTIVE'
              AND program2.effective_from <= @snapshot
              AND (program2.effective_until IS NULL OR program2.effective_until >= @snapshot)
              AND consumption.status = 'RECOGNIZED'
              AND consumption.consumed_at < datetime(@snapshot, '+1 day')
          ), 0) AS consumedBudgetMinor
        FROM contract_subsidy_programs program
        WHERE program.lifecycle_status = 'ACTIVE'
          AND program.effective_from <= @snapshot
          AND (program.effective_until IS NULL OR program.effective_until >= @snapshot)`
      )
      .get({ snapshot }) as {
      activeSubsidyProgramCount: number;
      allocatedBudgetMinor: number;
      consumedBudgetMinor: number;
    };
    const remaining = Math.max(subsidyRow.allocatedBudgetMinor - subsidyRow.consumedBudgetMinor, 0);
    return {
      activeContractCount: contractRow.activeContractCount ?? 0,
      expiringContractCount: contractRow.expiringContractCount ?? 0,
      activeSubsidyProgramCount: subsidyRow.activeSubsidyProgramCount,
      allocatedBudgetMinor: money(subsidyRow.allocatedBudgetMinor),
      consumedBudgetMinor: money(subsidyRow.consumedBudgetMinor),
      remainingBudgetMinor: money(remaining),
      absorptionPercent:
        subsidyRow.allocatedBudgetMinor > 0
          ? Math.round((subsidyRow.consumedBudgetMinor / subsidyRow.allocatedBudgetMinor) * 1000) /
            10
          : null,
      pendingRenewalCount: contractRow.pendingRenewalCount ?? 0,
      terminatedContractCount: contractRow.terminatedContractCount ?? 0,
      unbilledExposureMinor: null,
      currencyCode: 'IDR',
      asOf,
      contractSourceMix: this.contractSourceMix(snapshot),
      upcomingRenewals: this.renewals({ ...query, to: snapshot }).slice(0, 5)
    };
  }

  contractSourceMix(snapshot = getApplicationNow().slice(0, 10)): ContractSourceMixItemDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT sourceType, COUNT(*) AS count FROM (
          SELECT 'CUSTOMER_CONTRACT' AS sourceType, status, effective_from AS effectiveFrom, effective_until AS effectiveUntil FROM customer_contracts
          UNION ALL
          SELECT 'AGENT_CONTRACT', status, effective_from, effective_until FROM agent_contracts
          UNION ALL
          SELECT 'RATE_CONTRACT', status, effective_from, effective_until FROM rate_contract_links
        ) contracts
        WHERE status = 'ACTIVE'
          AND (effectiveFrom IS NULL OR effectiveFrom <= @snapshot)
          AND (effectiveUntil IS NULL OR effectiveUntil >= @snapshot)
        GROUP BY sourceType
        ORDER BY CASE sourceType
          WHEN 'CUSTOMER_CONTRACT' THEN 1
          WHEN 'AGENT_CONTRACT' THEN 2
          ELSE 3
        END`
      )
      .all({ snapshot }) as Array<{
      sourceType: CommercialContractPortfolioItemDto['sourceType'];
      count: number;
    }>;
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    if (!total) return [];
    const result = rows.map((row) => ({
      sourceType: row.sourceType,
      label: sourceLabels[row.sourceType],
      count: row.count,
      percentage: Math.round((row.count / total) * 1000) / 10
    }));
    const correction =
      Math.round((100 - result.reduce((sum, row) => sum + row.percentage, 0)) * 10) / 10;
    if (result[0]) result[0].percentage = Math.round((result[0].percentage + correction) * 10) / 10;
    return result;
  }

  renewals(query: Partial<ContractsSubsidiesQuery> = {}): ContractSubsidyRenewalItemDto[] {
    const snapshot = resolveSnapshot(query);
    const contracts = this.contracts({ search: '', status: 'ACTIVE', to: snapshot })
      .filter((item) => item.effectiveUntil && item.effectiveUntil >= snapshot)
      .map((item) => ({
        id: item.id,
        entityType: 'CONTRACT' as const,
        sourceType: item.sourceType,
        code: item.contractNumber,
        name: item.contractNumber,
        counterparty: item.partnerName,
        endDate: item.effectiveUntil!,
        daysLeft: daysBetween(snapshot, item.effectiveUntil!),
        status: item.status,
        renewalStatus: item.renewalStatus
      }));
    const subsidies = this.subsidies({ search: '', status: 'ACTIVE', to: snapshot })
      .filter((item) => item.effectiveUntil && item.effectiveUntil >= snapshot)
      .map((item) => ({
        id: item.id,
        entityType: 'SUBSIDY' as const,
        sourceType: 'SUBSIDY_PROGRAM' as const,
        code: item.programCode,
        name: item.programName,
        counterparty: item.sponsorName,
        endDate: item.effectiveUntil!,
        daysLeft: daysBetween(snapshot, item.effectiveUntil!),
        status: item.lifecycleStatus,
        renewalStatus: item.renewalStatus
      }));
    const needle = (query.search ?? '').trim().toLowerCase();
    return [...contracts, ...subsidies]
      .filter((item) => item.daysLeft >= 0)
      .filter(
        (item) =>
          !needle ||
          item.code.toLowerCase().includes(needle) ||
          item.name.toLowerCase().includes(needle) ||
          item.counterparty?.toLowerCase().includes(needle)
      )
      .sort((left, right) => left.daysLeft - right.daysLeft || left.code.localeCompare(right.code));
  }

  contracts(query: Partial<ContractsSubsidiesQuery> = {}): CommercialContractPortfolioItemDto[] {
    const search = `%${query.search ?? ''}%`;
    const snapshot = resolveSnapshot(query);
    return this.sqlite
      .prepare(
        `SELECT * FROM (
          SELECT
            contract.id,
            'CUSTOMER_CONTRACT' AS sourceType,
            contract.contract_number AS contractNumber,
            customer.account_name AS partnerName,
            contract.contract_type AS contractType,
            contract.effective_from AS effectiveFrom,
            contract.effective_until AS effectiveUntil,
            contract.status,
            contract.renewal_status AS renewalStatus,
            NULL AS linkedRateCode,
            subsidy.program_code AS subsidyProgramCode,
            contract.document_id AS documentId
          FROM customer_contracts contract
          JOIN customers customer ON customer.id = contract.customer_id
          LEFT JOIN contract_subsidy_programs subsidy ON subsidy.contract_number = contract.contract_number
          UNION ALL
          SELECT
            contract.id,
            'AGENT_CONTRACT' AS sourceType,
            contract.contract_number AS contractNumber,
            agent.agent_name AS partnerName,
            contract.contract_type AS contractType,
            contract.effective_from AS effectiveFrom,
            contract.effective_until AS effectiveUntil,
            contract.status,
            contract.renewal_status AS renewalStatus,
            NULL AS linkedRateCode,
            NULL AS subsidyProgramCode,
            contract.document_id AS documentId
          FROM agent_contracts contract
          JOIN agents agent ON agent.id = contract.agent_id
          UNION ALL
          SELECT
            link.id,
            'RATE_CONTRACT' AS sourceType,
            link.contract_number AS contractNumber,
            COALESCE(customer.account_name, link.contract_name) AS partnerName,
            COALESCE(link.rate_scope, 'RATE_AGREEMENT') AS contractType,
            link.effective_from AS effectiveFrom,
            link.effective_until AS effectiveUntil,
            link.status,
            NULL AS renewalStatus,
            rate.rate_code AS linkedRateCode,
            subsidy.program_code AS subsidyProgramCode,
            link.document_id AS documentId
          FROM rate_contract_links link
          JOIN rate_cards rate ON rate.id = link.rate_card_id
          LEFT JOIN customers customer ON customer.id = link.customer_id
          LEFT JOIN contract_subsidy_programs subsidy ON subsidy.contract_number = link.contract_number
        ) contracts
        WHERE (@status IS NULL OR status = @status)
          AND (@type IS NULL OR sourceType = @type)
          AND (effectiveFrom IS NULL OR effectiveFrom <= @snapshot)
          AND (effectiveUntil IS NULL OR effectiveUntil >= @snapshot)
          AND (
            @search = '%%'
            OR contractNumber LIKE @search
            OR partnerName LIKE @search
            OR contractType LIKE @search
            OR linkedRateCode LIKE @search
            OR subsidyProgramCode LIKE @search
          )
        ORDER BY effectiveUntil IS NULL, effectiveUntil ASC, contractNumber ASC`
      )
      .all({
        search,
        status: query.status ?? null,
        type: query.type ?? null,
        snapshot
      }) as CommercialContractPortfolioItemDto[];
  }

  subsidies(query: Partial<ContractsSubsidiesQuery> = {}): SubsidyProgramDto[] {
    const search = `%${query.search ?? ''}%`;
    const snapshot = resolveSnapshot(query);
    return this.sqlite
      .prepare(
        `SELECT
          program.id,
          program.program_code AS programCode,
          program.program_name AS programName,
          program.sponsor_name AS sponsorName,
          program.service_scope AS serviceScope,
          program.route_scope AS routeScope,
          program.contract_number AS contractNumber,
          program.currency_code AS currencyCode,
          program.allocated_budget_minor AS allocatedBudgetMinor,
          COALESCE(SUM(CASE WHEN consumption.status = 'RECOGNIZED' THEN consumption.amount_minor ELSE 0 END), 0) AS consumedBudgetMinor,
          program.effective_from AS effectiveFrom,
          program.effective_until AS effectiveUntil,
          program.lifecycle_status AS lifecycleStatus,
          program.renewal_status AS renewalStatus
        FROM contract_subsidy_programs program
        LEFT JOIN contract_subsidy_consumptions consumption
          ON consumption.program_id = program.id
          AND consumption.consumed_at < datetime(@snapshot, '+1 day')
        WHERE (@status IS NULL OR program.lifecycle_status = @status)
          AND (@type IS NULL OR program.service_scope = @type)
          AND program.effective_from <= @snapshot
          AND (program.effective_until IS NULL OR program.effective_until >= @snapshot)
          AND (
            @search = '%%'
            OR program.program_code LIKE @search
            OR program.program_name LIKE @search
            OR program.sponsor_name LIKE @search
            OR program.contract_number LIKE @search
          )
        GROUP BY program.id
        ORDER BY program.effective_until IS NULL, program.effective_until ASC, program.program_code ASC`
      )
      .all({
        search,
        status: query.status ?? null,
        type: query.type ?? null,
        snapshot
      })
      .map((row) => this.toSubsidy(row as Record<string, unknown>, snapshot));
  }

  absorption(query: Partial<ContractsSubsidiesQuery> = {}): SubsidyAbsorptionLineDto[] {
    return this.sqlite
      .prepare(
        `SELECT
          consumption.id,
          program.program_code AS programCode,
          consumption.source_type AS sourceType,
          consumption.source_id AS sourceId,
          consumption.description,
          consumption.amount_minor AS amountMinor,
          consumption.consumed_at AS consumedAt,
          consumption.status
        FROM contract_subsidy_consumptions consumption
        JOIN contract_subsidy_programs program ON program.id = consumption.program_id
        WHERE (@from IS NULL OR consumption.consumed_at >= @from)
          AND (@to IS NULL OR consumption.consumed_at < datetime(@to, '+1 day'))
          AND (@status IS NULL OR consumption.status = @status)
          AND (@type IS NULL OR consumption.source_type = @type)
        ORDER BY consumption.consumed_at DESC, consumption.id DESC`
      )
      .all({
        from: query.from ?? null,
        to: query.to ?? null,
        status: query.status ?? null,
        type: query.type ?? null
      })
      .map((row) => ({
        ...(row as Omit<SubsidyAbsorptionLineDto, 'amountMinor'> & { amountMinor: number }),
        amountMinor: money((row as { amountMinor: number }).amountMinor)
      }));
  }

  activity(query: Partial<ContractsSubsidiesQuery> = {}): ContractSubsidyActivityItemDto[] {
    return this.sqlite
      .prepare(
        `SELECT * FROM (
          SELECT id, 'SUBSIDY_PROGRAM_CREATED' AS activityType, program_name AS title,
            sponsor_name AS description, 'CONTRACT_SUBSIDY' AS sourceType, id AS sourceId, created_at AS occurredAt
          FROM contract_subsidy_programs
          UNION ALL
          SELECT consumption.id, 'SUBSIDY_ABSORPTION_RECOGNIZED', program.program_code,
            consumption.description, consumption.source_type, consumption.source_id, consumption.consumed_at
          FROM contract_subsidy_consumptions consumption
          JOIN contract_subsidy_programs program ON program.id = consumption.program_id
          UNION ALL
          SELECT id, 'CUSTOMER_CONTRACT_LINKED', contract_number, contract_type, 'CUSTOMER_CONTRACT', id, created_at
          FROM customer_contracts
        ) activity
        WHERE (@from IS NULL OR occurredAt >= @from)
          AND (@to IS NULL OR occurredAt < datetime(@to, '+1 day'))
          AND (@type IS NULL OR sourceType = @type)
        ORDER BY occurredAt DESC
        LIMIT @limit`
      )
      .all({
        from: query.from ?? null,
        to: query.to ?? null,
        type: query.type ?? null,
        limit: query.limit ?? 50
      }) as ContractSubsidyActivityItemDto[];
  }

  history(query: Partial<ContractsSubsidiesQuery> = {}): ContractSubsidyHistoryItemDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT id, action, actor_name AS actorName, changed_fields AS changedFields,
          occurred_at AS occurredAt, request_id AS requestId
        FROM contract_subsidy_audit_logs
        WHERE (@from IS NULL OR occurred_at >= @from)
          AND (@to IS NULL OR occurred_at < datetime(@to, '+1 day'))
        ORDER BY occurred_at DESC, id DESC`
      )
      .all({ from: query.from ?? null, to: query.to ?? null }) as Array<
      Omit<ContractSubsidyHistoryItemDto, 'changedFields'> & { changedFields: string }
    >;
    return rows.map((row) => ({
      ...row,
      changedFields: JSON.parse(row.changedFields) as string[]
    }));
  }

  private toSubsidy(row: Record<string, unknown>, snapshot: string): SubsidyProgramDto {
    const allocated = Number(row.allocatedBudgetMinor ?? 0);
    const consumed = Number(row.consumedBudgetMinor ?? 0);
    const remaining = Math.max(allocated - consumed, 0);
    return {
      id: String(row.id),
      programCode: String(row.programCode),
      programName: String(row.programName),
      sponsorName: String(row.sponsorName),
      serviceScope: String(row.serviceScope),
      routeScope: row.routeScope as string | null,
      contractNumber: row.contractNumber as string | null,
      currencyCode: String(row.currencyCode),
      allocatedBudgetMinor: money(allocated),
      consumedBudgetMinor: money(consumed),
      remainingBudgetMinor: money(remaining),
      absorptionPercent: allocated > 0 ? Math.round((consumed / allocated) * 1000) / 10 : null,
      effectiveFrom: String(row.effectiveFrom),
      effectiveUntil: row.effectiveUntil as string | null,
      lifecycleStatus: String(row.lifecycleStatus),
      renewalStatus: row.renewalStatus as string | null,
      asOf: `${snapshot}T00:00:00.000Z`
    };
  }
}
