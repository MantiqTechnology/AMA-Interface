import type Database from 'better-sqlite3';
import type {
  CommercialContractPortfolioItemDto,
  ContractSubsidyActivityItemDto,
  ContractSubsidyHistoryItemDto,
  ContractSubsidyOverviewDto,
  ContractsSubsidiesQuery,
  SubsidyAbsorptionLineDto,
  SubsidyProgramDto
} from '../../../../shared/features/marketing/contracts-subsidies';
import { getApplicationNow } from '../../../utils/time';

const money = (value: number | null | undefined) => String(Math.max(Math.round(value ?? 0), 0));

export class ContractsSubsidiesRepository {
  constructor(private readonly sqlite: Database.Database) {}

  overview(): ContractSubsidyOverviewDto {
    const asOf = getApplicationNow();
    const date = asOf.slice(0, 10);
    const contractRow = this.sqlite
      .prepare(
        `SELECT
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeContractCount,
          SUM(CASE WHEN effectiveUntil IS NOT NULL AND effectiveUntil <= date(@date, '+60 day') THEN 1 ELSE 0 END) AS expiringContractCount,
          SUM(CASE WHEN renewalStatus IN ('REVIEW_REQUIRED', 'DUE_SOON') THEN 1 ELSE 0 END) AS pendingRenewalCount
        FROM (
          SELECT status, effective_until AS effectiveUntil, renewal_status AS renewalStatus FROM customer_contracts
          UNION ALL
          SELECT status, effective_until AS effectiveUntil, renewal_status AS renewalStatus FROM agent_contracts
          UNION ALL
          SELECT status, effective_until AS effectiveUntil, NULL AS renewalStatus FROM rate_contract_links
        ) contracts`
      )
      .get({ date }) as {
      activeContractCount: number | null;
      expiringContractCount: number | null;
      pendingRenewalCount: number | null;
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
            WHERE program2.lifecycle_status = 'ACTIVE' AND consumption.status = 'RECOGNIZED'
          ), 0) AS consumedBudgetMinor
        FROM contract_subsidy_programs program
        WHERE program.lifecycle_status = 'ACTIVE'`
      )
      .get() as {
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
      unbilledExposureMinor: null,
      currencyCode: 'IDR',
      asOf
    };
  }

  contracts(query: ContractsSubsidiesQuery): CommercialContractPortfolioItemDto[] {
    const search = `%${query.search ?? ''}%`;
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
      .all({ search, status: query.status ?? null }) as CommercialContractPortfolioItemDto[];
  }

  subsidies(query: ContractsSubsidiesQuery): SubsidyProgramDto[] {
    const search = `%${query.search ?? ''}%`;
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
        LEFT JOIN contract_subsidy_consumptions consumption ON consumption.program_id = program.id
        WHERE (@status IS NULL OR program.lifecycle_status = @status)
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
      .all({ search, status: query.status ?? null })
      .map((row) => this.toSubsidy(row as Record<string, unknown>));
  }

  absorption(): SubsidyAbsorptionLineDto[] {
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
        ORDER BY consumption.consumed_at DESC, consumption.id DESC`
      )
      .all()
      .map((row) => ({
        ...(row as Omit<SubsidyAbsorptionLineDto, 'amountMinor'> & { amountMinor: number }),
        amountMinor: money((row as { amountMinor: number }).amountMinor)
      }));
  }

  activity(): ContractSubsidyActivityItemDto[] {
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
        ORDER BY occurredAt DESC
        LIMIT 50`
      )
      .all() as ContractSubsidyActivityItemDto[];
  }

  history(): ContractSubsidyHistoryItemDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT id, action, actor_name AS actorName, changed_fields AS changedFields,
          occurred_at AS occurredAt, request_id AS requestId
        FROM contract_subsidy_audit_logs
        ORDER BY occurred_at DESC, id DESC`
      )
      .all() as Array<
      Omit<ContractSubsidyHistoryItemDto, 'changedFields'> & { changedFields: string }
    >;
    return rows.map((row) => ({
      ...row,
      changedFields: JSON.parse(row.changedFields) as string[]
    }));
  }

  private toSubsidy(row: Record<string, unknown>): SubsidyProgramDto {
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
      asOf: getApplicationNow()
    };
  }
}
