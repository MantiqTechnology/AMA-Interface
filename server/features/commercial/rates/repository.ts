import { randomUUID } from 'node:crypto';
import { and, asc, eq, like, ne, or, type SQL } from 'drizzle-orm';
import type Database from 'better-sqlite3';
import type { AppDatabase } from '../../../db/client';
import {
  rateAuditLogs,
  rateBookingChannels,
  rateCards,
  rateContractLinks
} from '../../../db/schema';
import { getApplicationNow } from '../../../utils/time';
import type {
  CommercialRateDetailDto,
  RateBookingChannelDto,
  RateCardDto,
  RateCardInput,
  RateCardListQuery,
  RateCardOption,
  RateContractDto,
  RateCoverageDto,
  RateHistoryItemDto,
  RateUsageSummaryDto,
  SelectedRateSnapshotDto
} from '../../../../shared/features/commercial/rates';

type RateRow = typeof rateCards.$inferSelect;

export type RateSelectionInput = {
  serviceType: string;
  serviceDate: string;
  originStationId: string;
  destinationStationId: string;
  customerId?: string | null;
  agentId?: string | null;
  contractId?: string | null;
  bookingChannelCode?: string | null;
};

export type SelectedRateRecord = {
  id: string;
  baseRate: number;
  minimumCharge: number | null;
  cargoPriceBasis: string | null;
  rateUnit: string;
  pricingScope: string;
  rateCode: string;
  version: number;
  currencyCode: string;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBasisPoints: number;
  snapshot: SelectedRateSnapshotDto;
};

function toDto(row: RateRow): RateCardDto {
  return {
    id: row.id,
    rateCode: row.rateCode,
    rateName: row.rateName,
    serviceType: row.serviceType,
    lifecycleStatus: row.lifecycleStatus,
    pricingScope: row.pricingScope,
    originStationId: row.originStationId,
    destinationStationId: row.destinationStationId,
    routeId: row.routeId,
    customerId: row.customerId,
    agentId: row.agentId,
    contractId: row.contractId,
    aircraftType: row.aircraftType,
    aircraftTypeId: row.aircraftTypeId,
    currencyId: row.currencyId,
    taxCodeId: row.taxCodeId,
    baseRate: row.baseRate,
    rateUnit: row.rateUnit,
    bookingChannel: row.bookingChannel,
    passengerType: row.passengerType,
    cargoPriceBasis: row.cargoPriceBasis,
    ratePriority: row.ratePriority,
    minimumCharge: row.minimumCharge,
    demoUsageNote: row.demoUsageNote,
    publicNote: row.publicNote,
    internalPricingNote: row.internalPricingNote,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    isActive: row.isActive,
    rateFamilyId: row.rateFamilyId,
    supersedesRateId: row.supersedesRateId,
    version: row.version,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function normalizeInput(input: RateCardInput) {
  const publicNote = input.publicNote ?? input.demoUsageNote ?? null;
  return {
    rateCode: input.rateCode,
    rateName: input.rateName ?? null,
    serviceType: input.serviceType,
    pricingScope: input.pricingScope,
    originStationId: input.originStationId ?? '',
    destinationStationId: input.destinationStationId ?? '',
    routeId: input.routeId ?? null,
    customerId: input.customerId ?? null,
    agentId: input.agentId ?? null,
    contractId: input.contractId ?? null,
    aircraftType: input.aircraftType ?? null,
    aircraftTypeId: input.aircraftTypeId ?? null,
    currencyId: input.currencyId,
    taxCodeId: input.taxCodeId ?? null,
    baseRate: input.baseRate,
    rateUnit: input.rateUnit,
    bookingChannel: input.bookingChannel,
    passengerType: input.passengerType ?? null,
    cargoPriceBasis: input.cargoPriceBasis ?? null,
    ratePriority: input.ratePriority,
    minimumCharge: input.minimumCharge ?? null,
    demoUsageNote: input.demoUsageNote ?? null,
    publicNote,
    internalPricingNote: input.internalPricingNote ?? null,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null
  };
}

export class RateCardRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly sqlite?: Database.Database
  ) {}

  async list(query: RateCardListQuery): Promise<RateCardDto[]> {
    const conditions: SQL[] = [];
    if (query.active === 'active') conditions.push(ne(rateCards.lifecycleStatus, 'ARCHIVED'));
    if (query.active === 'inactive') conditions.push(eq(rateCards.lifecycleStatus, 'INACTIVE'));
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          like(rateCards.rateCode, term),
          like(rateCards.rateName, term),
          like(rateCards.serviceType, term),
          like(rateCards.aircraftType, term),
          like(rateCards.pricingScope, term),
          like(rateCards.bookingChannel, term),
          like(rateCards.passengerType, term),
          like(rateCards.cargoPriceBasis, term),
          like(rateCards.demoUsageNote, term),
          like(rateCards.publicNote, term)
        ) as SQL
      );
    }
    const rows = await this.db
      .select()
      .from(rateCards)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(rateCards.rateCode));
    return rows.map(toDto);
  }

  async getById(id: string): Promise<RateCardDto | null> {
    const row = await this.db.select().from(rateCards).where(eq(rateCards.id, id)).get();
    return row ? toDto(row) : null;
  }

  getDetailById(id: string): CommercialRateDetailDto | null {
    const sqlite = this.requireSqlite();
    const row = sqlite
      .prepare(
        `SELECT
          rc.*,
          origin.station_code AS origin_code,
          origin.station_name AS origin_name,
          destination.station_code AS destination_code,
          destination.station_name AS destination_name,
          route.route_code AS route_code,
          route_origin.station_code AS route_origin_code,
          route_destination.station_code AS route_destination_code,
          customer.account_code AS customer_code,
          customer.account_name AS customer_name,
          agent.agent_code AS agent_code,
          agent.agent_name AS agent_name,
          aircraft.registration_number AS aircraft_registration,
          aircraft.aircraft_type AS aircraft_type_code,
          aircraft.model AS aircraft_model,
          currency.currency_code AS currency_code,
          currency.currency_name AS currency_name,
          currency.decimal_places AS currency_minor_unit,
          tax.tax_code AS tax_code,
          tax.tax_name AS tax_name,
          tax.tax_rate_basis_points AS tax_rate_basis_points
        FROM rate_cards rc
        JOIN stations origin ON origin.id = rc.origin_station_id
        JOIN stations destination ON destination.id = rc.destination_station_id
        LEFT JOIN routes route ON route.id = rc.route_id
        LEFT JOIN stations route_origin ON route_origin.id = route.origin_station_id
        LEFT JOIN stations route_destination ON route_destination.id = route.destination_station_id
        LEFT JOIN customers customer ON customer.id = rc.customer_id
        LEFT JOIN agents agent ON agent.id = rc.agent_id
        LEFT JOIN aircraft aircraft ON aircraft.id = rc.aircraft_type_id
        JOIN currencies currency ON currency.id = rc.currency_id
        LEFT JOIN tax_codes tax ON tax.id = rc.tax_code_id
        WHERE rc.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.toDetail(row);
  }

  async create(id: string, input: RateCardInput, timestamp: string, actorId: string | null = null) {
    const values = normalizeInput(input);
    const row = await this.db
      .insert(rateCards)
      .values({
        id,
        ...values,
        lifecycleStatus: input.lifecycleStatus ?? 'DRAFT',
        isActive: input.lifecycleStatus ? input.lifecycleStatus === 'ACTIVE' : true,
        rateFamilyId: id,
        version: 1,
        createdBy: actorId,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    await this.ensureBookingChannel(
      row.id,
      row.bookingChannel,
      row.effectiveFrom,
      row.effectiveTo,
      timestamp
    );
    return toDto(row);
  }

  async update(id: string, input: RateCardInput, timestamp: string) {
    const values = normalizeInput(input);
    const row = await this.db
      .update(rateCards)
      .set({
        ...values,
        lifecycleStatus: input.lifecycleStatus,
        isActive: input.lifecycleStatus ? input.lifecycleStatus === 'ACTIVE' : undefined,
        version: input.expectedVersion ? input.expectedVersion + 1 : undefined,
        updatedAt: timestamp
      })
      .where(eq(rateCards.id, id))
      .returning()
      .get();
    if (row)
      await this.ensureBookingChannel(
        row.id,
        row.bookingChannel,
        row.effectiveFrom,
        row.effectiveTo,
        timestamp
      );
    return row ? toDto(row) : null;
  }

  async createVersion(
    source: RateCardDto,
    input: RateCardInput,
    timestamp: string,
    actorId: string | null
  ) {
    const id = `rate-cards-${randomUUID()}`;
    const values = normalizeInput(input);
    const row = await this.db
      .insert(rateCards)
      .values({
        id,
        ...values,
        lifecycleStatus: 'DRAFT',
        isActive: false,
        rateFamilyId: source.rateFamilyId ?? source.id,
        supersedesRateId: source.id,
        version: source.version + 1,
        createdBy: actorId,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    await this.ensureBookingChannel(
      row.id,
      row.bookingChannel,
      row.effectiveFrom,
      row.effectiveTo,
      timestamp
    );
    return toDto(row);
  }

  async duplicate(
    source: RateCardDto,
    rateCode: string,
    effectiveFrom: string,
    timestamp: string,
    actorId: string | null
  ) {
    const row = await this.db
      .insert(rateCards)
      .values({
        ...source,
        id: `rate-cards-${randomUUID()}`,
        rateCode,
        originStationId: source.originStationId ?? '',
        destinationStationId: source.destinationStationId ?? '',
        effectiveFrom,
        lifecycleStatus: 'DRAFT',
        isActive: false,
        rateFamilyId: null,
        supersedesRateId: null,
        version: 1,
        createdBy: actorId,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning()
      .get();
    await this.db.update(rateCards).set({ rateFamilyId: row.id }).where(eq(rateCards.id, row.id));
    await this.ensureBookingChannel(
      row.id,
      row.bookingChannel,
      row.effectiveFrom,
      row.effectiveTo,
      timestamp
    );
    return { ...toDto(row), rateFamilyId: row.id };
  }

  async setLifecycle(id: string, lifecycleStatus: string, timestamp: string) {
    const row = await this.db
      .update(rateCards)
      .set({
        lifecycleStatus,
        isActive: lifecycleStatus === 'ACTIVE',
        updatedAt: timestamp
      })
      .where(eq(rateCards.id, id))
      .returning()
      .get();
    return row ? toDto(row) : null;
  }

  async options(): Promise<RateCardOption[]> {
    return await this.db
      .select({
        id: rateCards.id,
        rateCode: rateCards.rateCode,
        serviceType: rateCards.serviceType
      })
      .from(rateCards)
      .where(eq(rateCards.lifecycleStatus, 'ACTIVE'))
      .orderBy(asc(rateCards.rateCode));
  }

  getSelectedRate(input: RateSelectionInput): SelectedRateRecord | null {
    const candidates = this.findSelectionCandidates(input);
    if (candidates.length === 0) return null;
    const best = candidates[0];
    const ambiguous = candidates[1];
    if (
      ambiguous &&
      Number(ambiguous.specificity) === Number(best.specificity) &&
      Number(ambiguous.rate_priority) === Number(best.rate_priority)
    ) {
      throw new Error('RATE_SELECTION_AMBIGUOUS');
    }
    return this.toSelected(best);
  }

  findSelectionCandidates(input: RateSelectionInput): Array<Record<string, unknown>> {
    const sqlite = this.requireSqlite();
    return sqlite
      .prepare(
        `SELECT
          rc.*,
          currency.currency_code,
          tax.tax_code,
          COALESCE(tax.tax_rate_basis_points, 0) AS tax_rate_basis_points,
          (
            CASE WHEN rc.contract_id IS NOT NULL AND rc.contract_id = @contractId THEN 64 ELSE 0 END +
            CASE WHEN rc.customer_id IS NOT NULL AND rc.customer_id = @customerId THEN 32 ELSE 0 END +
            CASE WHEN rc.agent_id IS NOT NULL AND rc.agent_id = @agentId THEN 16 ELSE 0 END +
            CASE WHEN rc.route_id IS NOT NULL THEN 8 ELSE 0 END +
            CASE WHEN rc.origin_station_id = @originStationId AND rc.destination_station_id = @destinationStationId THEN 4 ELSE 0 END +
            CASE WHEN rc.booking_channel = @bookingChannelCode THEN 2 ELSE 0 END
          ) AS specificity
        FROM rate_cards rc
        JOIN currencies currency ON currency.id = rc.currency_id
        LEFT JOIN tax_codes tax ON tax.id = rc.tax_code_id
        WHERE rc.service_type = @serviceType
          AND rc.lifecycle_status = 'ACTIVE'
          AND rc.is_active = 1
          AND rc.effective_from <= @serviceDate
          AND (rc.effective_to IS NULL OR rc.effective_to >= @serviceDate)
          AND rc.origin_station_id = @originStationId
          AND rc.destination_station_id = @destinationStationId
          AND (rc.customer_id IS NULL OR rc.customer_id = @customerId)
          AND (rc.agent_id IS NULL OR rc.agent_id = @agentId)
          AND (rc.contract_id IS NULL OR rc.contract_id = @contractId)
          AND (@bookingChannelCode IS NULL OR rc.booking_channel = @bookingChannelCode OR rc.booking_channel IN ('COUNTER', 'CARGO'))
        ORDER BY specificity DESC, rc.rate_priority ASC, rc.effective_from DESC, rc.version DESC`
      )
      .all({
        serviceType: input.serviceType,
        serviceDate: input.serviceDate,
        originStationId: input.originStationId,
        destinationStationId: input.destinationStationId,
        customerId: input.customerId ?? null,
        agentId: input.agentId ?? null,
        contractId: input.contractId ?? null,
        bookingChannelCode: input.bookingChannelCode ?? null
      }) as Array<Record<string, unknown>>;
  }

  hasUsage(id: string): boolean {
    const sqlite = this.requireSqlite();
    const row = sqlite
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM passenger_tickets WHERE rate_card_id = ?) +
          (SELECT COUNT(*) FROM cargo_bookings WHERE rate_card_id = ?) AS count`
      )
      .get(id, id) as { count: number };
    return row.count > 0;
  }

  getUsageSummary(id: string): RateUsageSummaryDto {
    const sqlite = this.requireSqlite();
    const row = sqlite
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM rate_contract_links WHERE rate_card_id = ? AND status = 'ACTIVE') AS activeContractCount,
          (SELECT COUNT(*) FROM rate_booking_channels WHERE rate_card_id = ? AND status = 'ACTIVE') AS linkedBookingChannelCount,
          (
            SELECT COUNT(*) FROM (
              SELECT id, created_at FROM passenger_tickets WHERE rate_card_id = ?
              UNION ALL
              SELECT id, created_at FROM cargo_bookings WHERE rate_card_id = ?
            )
          ) AS appliedTransactionCount,
          (
            SELECT MAX(created_at) FROM (
              SELECT created_at FROM passenger_tickets WHERE rate_card_id = ?
              UNION ALL
              SELECT created_at FROM cargo_bookings WHERE rate_card_id = ?
            )
          ) AS lastAppliedAt`
      )
      .get(id, id, id, id, id, id) as {
      activeContractCount: number;
      linkedBookingChannelCount: number;
      appliedTransactionCount: number;
      lastAppliedAt: string | null;
    };
    return { ...row, asOf: getApplicationNow() };
  }

  async listBookingChannels(id: string): Promise<RateBookingChannelDto[]> {
    return await this.db
      .select({
        id: rateBookingChannels.id,
        bookingChannelCode: rateBookingChannels.bookingChannelCode,
        effectiveFrom: rateBookingChannels.effectiveFrom,
        effectiveUntil: rateBookingChannels.effectiveUntil,
        status: rateBookingChannels.status
      })
      .from(rateBookingChannels)
      .where(eq(rateBookingChannels.rateCardId, id))
      .orderBy(asc(rateBookingChannels.bookingChannelCode));
  }

  async listContracts(id: string): Promise<RateContractDto[]> {
    return await this.db
      .select({
        id: rateContractLinks.id,
        contractNumber: rateContractLinks.contractNumber,
        customerName: rateContractLinks.contractName,
        effectiveFrom: rateContractLinks.effectiveFrom,
        effectiveUntil: rateContractLinks.effectiveUntil,
        status: rateContractLinks.status,
        rateScope: rateContractLinks.rateScope,
        documentId: rateContractLinks.documentId
      })
      .from(rateContractLinks)
      .where(eq(rateContractLinks.rateCardId, id))
      .orderBy(asc(rateContractLinks.contractNumber));
  }

  async listHistory(id: string): Promise<RateHistoryItemDto[]> {
    const rows = await this.db
      .select()
      .from(rateAuditLogs)
      .where(eq(rateAuditLogs.rateCardId, id))
      .orderBy(asc(rateAuditLogs.occurredAt));
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      changedFields: JSON.parse(row.changedFields) as string[],
      occurredAt: row.occurredAt,
      requestId: row.requestId
    }));
  }

  async audit(
    rateCardId: string,
    action: string,
    changedFields: string[],
    actor: { actorId?: string | null; actorName?: string | null; requestId?: string | null } = {},
    metadata: unknown = null
  ) {
    await this.db.insert(rateAuditLogs).values({
      id: `rate-audit-${randomUUID()}`,
      rateCardId,
      action,
      actorId: actor.actorId ?? null,
      actorName: actor.actorName ?? null,
      changedFields: JSON.stringify(changedFields),
      metadata: metadata ? JSON.stringify(metadata) : null,
      requestId: actor.requestId ?? null,
      occurredAt: getApplicationNow()
    });
  }

  getCoverage(id: string): RateCoverageDto | null {
    const detail = this.getDetailById(id);
    if (!detail) return null;
    const sectors = detail.route
      ? [detail.route.displayName]
      : detail.origin && detail.destination
        ? [`${detail.origin.stationCode} -> ${detail.destination.stationCode}`]
        : [];
    return {
      origin: detail.origin,
      destination: detail.destination,
      route: detail.route,
      applicableSectors: sectors,
      aircraftType: detail.aircraftTypeSummary,
      serviceType: detail.serviceType,
      customer: detail.customer,
      agent: detail.agent,
      contract: detail.contract,
      bookingChannelCode: detail.bookingChannel,
      effectiveFrom: detail.effectiveFrom,
      effectiveTo: detail.effectiveTo
    };
  }

  private async ensureBookingChannel(
    rateCardId: string,
    bookingChannelCode: string,
    effectiveFrom: string,
    effectiveUntil: string | null,
    timestamp: string
  ) {
    await this.db
      .insert(rateBookingChannels)
      .values({
        id: `rate-booking-channel-${rateCardId}`,
        rateCardId,
        bookingChannelCode,
        effectiveFrom,
        effectiveUntil,
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .onConflictDoNothing();
  }

  private toDetail(row: Record<string, unknown>): CommercialRateDetailDto {
    const dto = toDto({
      id: String(row.id),
      rateCode: String(row.rate_code),
      rateName: row.rate_name as string | null,
      serviceType: String(row.service_type),
      lifecycleStatus: String(row.lifecycle_status),
      pricingScope: String(row.pricing_scope),
      originStationId: String(row.origin_station_id),
      destinationStationId: String(row.destination_station_id),
      routeId: row.route_id as string | null,
      customerId: row.customer_id as string | null,
      agentId: row.agent_id as string | null,
      contractId: row.contract_id as string | null,
      aircraftType: row.aircraft_type as string | null,
      aircraftTypeId: row.aircraft_type_id as string | null,
      currencyId: String(row.currency_id),
      taxCodeId: row.tax_code_id as string | null,
      baseRate: Number(row.base_rate),
      rateUnit: String(row.rate_unit),
      bookingChannel: String(row.booking_channel),
      passengerType: row.passenger_type as string | null,
      cargoPriceBasis: row.cargo_price_basis as string | null,
      ratePriority: Number(row.rate_priority),
      minimumCharge: row.minimum_charge === null ? null : Number(row.minimum_charge),
      demoUsageNote: row.demo_usage_note as string | null,
      publicNote: row.public_note as string | null,
      internalPricingNote: row.internal_pricing_note as string | null,
      effectiveFrom: String(row.effective_from),
      effectiveTo: row.effective_to as string | null,
      isActive: Boolean(row.is_active),
      rateFamilyId: row.rate_family_id as string | null,
      supersedesRateId: row.supersedes_rate_id as string | null,
      version: Number(row.version),
      createdBy: row.created_by as string | null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    });
    const routeLabel =
      row.route_code && row.route_origin_code && row.route_destination_code
        ? `${row.route_origin_code} -> ${row.route_destination_code}`
        : row.route_code;
    return {
      ...dto,
      origin: {
        id: dto.originStationId ?? '',
        stationCode: String(row.origin_code),
        stationName: String(row.origin_name)
      },
      destination: {
        id: dto.destinationStationId ?? '',
        stationCode: String(row.destination_code),
        stationName: String(row.destination_name)
      },
      route: row.route_id
        ? {
            id: String(row.route_id),
            routeCode: String(row.route_code),
            displayName: String(routeLabel)
          }
        : null,
      customer: row.customer_id
        ? {
            id: String(row.customer_id),
            accountCode: String(row.customer_code),
            accountName: String(row.customer_name)
          }
        : null,
      agent: row.agent_id
        ? {
            id: String(row.agent_id),
            agentCode: String(row.agent_code),
            agentName: String(row.agent_name)
          }
        : null,
      contract: row.contract_id
        ? {
            id: String(row.contract_id),
            contractNumber: String(row.contract_id),
            contractName: null,
            status: 'LINKED'
          }
        : null,
      aircraftTypeSummary: row.aircraft_type_id
        ? {
            id: String(row.aircraft_type_id),
            typeCode: String(row.aircraft_type_code ?? row.aircraft_registration),
            typeName: String(row.aircraft_model ?? row.aircraft_type)
          }
        : dto.aircraftType
          ? { id: dto.aircraftType, typeCode: dto.aircraftType, typeName: dto.aircraftType }
          : null,
      currency: {
        code: String(row.currency_code),
        name: String(row.currency_name),
        minorUnit: Number(row.currency_minor_unit)
      },
      taxRule: row.tax_code_id
        ? {
            id: String(row.tax_code_id),
            code: String(row.tax_code),
            name: String(row.tax_name),
            rateBasisPoints: Number(row.tax_rate_basis_points ?? 0)
          }
        : null,
      quickSummary: this.getUsageSummary(dto.id)
    };
  }

  private toSelected(row: Record<string, unknown>): SelectedRateRecord {
    const taxCode = (row.tax_code as string | null) ?? null;
    const snapshot: SelectedRateSnapshotDto = {
      rateCardId: String(row.id),
      rateVersion: Number(row.version),
      rateCodeSnapshot: String(row.rate_code),
      currencySnapshot: String(row.currency_code),
      baseRateSnapshot: Number(row.base_rate),
      minimumChargeSnapshot: row.minimum_charge === null ? null : Number(row.minimum_charge),
      rateUnitSnapshot: String(row.rate_unit),
      priceBasisSnapshot: row.cargo_price_basis as string | null,
      taxRuleSnapshot: taxCode,
      pricingScopeSnapshot: String(row.pricing_scope),
      taxRateBasisPoints: Number(row.tax_rate_basis_points ?? 0)
    };
    return {
      id: snapshot.rateCardId,
      baseRate: snapshot.baseRateSnapshot,
      minimumCharge: snapshot.minimumChargeSnapshot,
      cargoPriceBasis: snapshot.priceBasisSnapshot,
      rateUnit: snapshot.rateUnitSnapshot,
      pricingScope: snapshot.pricingScopeSnapshot,
      rateCode: snapshot.rateCodeSnapshot,
      version: snapshot.rateVersion,
      currencyCode: snapshot.currencySnapshot,
      taxCodeId: row.tax_code_id as string | null,
      taxCode,
      taxRateBasisPoints: snapshot.taxRateBasisPoints,
      snapshot
    };
  }

  private requireSqlite() {
    if (!this.sqlite) throw new Error('RateCardRepository requires sqlite for read models.');
    return this.sqlite;
  }
}
