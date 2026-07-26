import { randomUUID } from 'node:crypto';
import type {
  DuplicateRateCardInput,
  RateCardInput,
  RateCardListQuery,
  RatePreviewRequestDto
} from '../../../../shared/features/commercial/rates';
import { DomainError, notFound } from '../../../utils/errors';
import { getApplicationNow } from '../../../utils/time';
import { CurrencyRepository } from '../../finance/currencies/repository';
import { TaxCodeRepository } from '../../finance/tax-codes/repository';
import { StationsRepository } from '../../operations/stations/repository';
import { AgentRepository } from '../agents/repository';
import { CustomerRepository } from '../customers/repository';
import { RateCardRepository, type RateSelectionInput } from './repository';

type Actor = { actorId?: string | null; actorName?: string | null; requestId?: string | null };

const routeScoped = new Set(['ROUTE']);
const publicScopes = new Set(['PUBLIC', 'PUBLIC_COUNTER', 'STATION_PAIR', 'INTERNAL']);
const customerScopes = new Set([
  'CUSTOMER_CONTRACT',
  'CORPORATE_CONTRACT',
  'CARGO_CONTRACT',
  'CHARTER_CONTRACT'
]);
const agentScopes = new Set(['AGENT_CONTRACT']);

export class RateCardService {
  constructor(
    private readonly repository: RateCardRepository,
    private readonly stationsRepository: StationsRepository,
    private readonly customersRepository: CustomerRepository,
    private readonly currenciesRepository: CurrencyRepository,
    private readonly taxCodesRepository: TaxCodeRepository,
    private readonly agentRepository?: AgentRepository
  ) {}

  list(query: RateCardListQuery) {
    return this.repository.list(query);
  }

  options() {
    return this.repository.options();
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('RateCard', id);
    return row;
  }

  getDetail(id: string) {
    const detail = this.repository.getDetailById(id);
    if (!detail) throw notFound('RateCard', id);
    return detail;
  }

  async create(input: RateCardInput, actor: Actor = {}) {
    await this.validate(input);
    if (input.lifecycleStatus === 'ACTIVE') await this.ensureNoAmbiguity(input);
    const timestamp = getApplicationNow();
    try {
      const row = await this.repository.create(
        'rate-cards-' + randomUUID(),
        input,
        timestamp,
        actor.actorId ?? null
      );
      await this.repository.audit(row.id, 'RATE_CREATED', ['rateCode'], actor);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: string, input: RateCardInput, actor: Actor = {}) {
    const existing = await this.get(id);
    if (input.expectedVersion !== undefined && input.expectedVersion !== existing.version) {
      throw new DomainError('RATE_VERSION_CONFLICT', 'Rate card was changed by another user.', 409);
    }
    await this.validate(input);
    const timestamp = getApplicationNow();
    const changedFields = this.changedFields(existing, input);
    if (existing.lifecycleStatus === 'ACTIVE' && this.repository.hasUsage(id)) {
      const created = await this.repository.createVersion(
        existing,
        input,
        timestamp,
        actor.actorId ?? null
      );
      await this.repository.audit(id, 'RATE_VERSION_CREATED', changedFields, actor, {
        newRateCardId: created.id,
        newVersion: created.version
      });
      await this.repository.audit(created.id, 'RATE_CREATED_FROM_VERSION', ['version'], actor, {
        supersedesRateId: id
      });
      return created;
    }
    await this.ensureNoAmbiguity(input, id);
    try {
      const row = await this.repository.update(id, input, timestamp);
      if (!row) throw notFound('RateCard', id);
      await this.repository.audit(id, 'RATE_UPDATED', changedFields, actor);
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async setActive(id: string, isActive: boolean, actor: Actor = {}) {
    return isActive ? this.activate(id, actor) : this.deactivate(id, actor);
  }

  async activate(id: string, actor: Actor = {}) {
    const rate = await this.get(id);
    if (rate.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError('RATE_ARCHIVED', 'Archived rate cannot be activated.', 409);
    }
    const input = this.dtoToInput(rate, 'ACTIVE');
    await this.validate(input);
    await this.ensureNoAmbiguity(input, id);
    const row = await this.repository.setLifecycle(id, 'ACTIVE', getApplicationNow());
    if (!row) throw notFound('RateCard', id);
    await this.repository.audit(id, 'RATE_ACTIVATED', ['lifecycleStatus'], actor);
    return row;
  }

  async deactivate(id: string, actor: Actor = {}) {
    await this.get(id);
    const row = await this.repository.setLifecycle(id, 'INACTIVE', getApplicationNow());
    if (!row) throw notFound('RateCard', id);
    await this.repository.audit(id, 'RATE_DEACTIVATED', ['lifecycleStatus'], actor);
    return row;
  }

  async archive(id: string, actor: Actor = {}) {
    await this.get(id);
    const row = await this.repository.setLifecycle(id, 'ARCHIVED', getApplicationNow());
    if (!row) throw notFound('RateCard', id);
    await this.repository.audit(id, 'RATE_ARCHIVED', ['lifecycleStatus'], actor);
    return row;
  }

  async duplicate(id: string, input: DuplicateRateCardInput, actor: Actor = {}) {
    const source = await this.get(id);
    const effectiveFrom = input.effectiveFrom ?? source.effectiveFrom;
    try {
      const row = await this.repository.duplicate(
        source,
        input.rateCode,
        effectiveFrom,
        getApplicationNow(),
        actor.actorId ?? null
      );
      await this.repository.audit(row.id, 'RATE_DUPLICATED', ['rateCode'], actor, {
        sourceRateCardId: id
      });
      return row;
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async createVersion(id: string, input: RateCardInput, actor: Actor = {}) {
    const source = await this.get(id);
    await this.validate(input);
    if (input.lifecycleStatus === 'ACTIVE') await this.ensureNoAmbiguity(input);
    const row = await this.repository.createVersion(
      source,
      input,
      getApplicationNow(),
      actor.actorId ?? null
    );
    await this.repository.audit(id, 'RATE_VERSION_CREATED', ['version'], actor, {
      newRateCardId: row.id,
      newVersion: row.version
    });
    return row;
  }

  listContracts(id: string) {
    return this.repository.listContracts(id);
  }

  listBookingChannels(id: string) {
    return this.repository.listBookingChannels(id);
  }

  getCoverage(id: string) {
    const coverage = this.repository.getCoverage(id);
    if (!coverage) throw notFound('RateCard', id);
    return coverage;
  }

  listHistory(id: string) {
    return this.repository.listHistory(id);
  }

  getUsageSummary(id: string) {
    void this.get(id);
    return this.repository.getUsageSummary(id);
  }

  selectRate(input: RateSelectionInput) {
    const selected = this.repository.getSelectedRate(input);
    if (!selected) throw notFound('RateCard', 'active matching rate');
    return selected;
  }

  preview(id: string, input: RatePreviewRequestDto) {
    const rate = this.getDetail(id);
    if (rate.lifecycleStatus === 'ARCHIVED') {
      throw new DomainError('RATE_ARCHIVED', 'Archived rate cannot be used for preview.', 409);
    }
    if (
      rate.originStationId !== input.originStationId ||
      rate.destinationStationId !== input.destinationStationId
    ) {
      throw new DomainError(
        'RATE_PREVIEW_ROUTE_MISMATCH',
        'Preview route does not match this rate.',
        422
      );
    }
    if (
      input.serviceDate < rate.effectiveFrom ||
      (rate.effectiveTo && input.serviceDate > rate.effectiveTo)
    ) {
      throw new DomainError(
        'RATE_PREVIEW_DATE_OUTSIDE_EFFECTIVE_PERIOD',
        'Service date is outside the effective period.',
        422
      );
    }

    const trace = [
      `Rate ${rate.rateCode} v${rate.version}`,
      'Money calculation uses integer minor units.',
      'Tax uses the linked tax rule basis points.'
    ];
    let chargeableWeightGrams: number | null = null;
    let variableCharge = BigInt(rate.baseRate);
    if (rate.serviceType === 'CARGO') {
      if (!input.cargo) {
        throw new DomainError(
          'RATE_PREVIEW_CARGO_REQUIRED',
          'Cargo preview requires cargo weights.',
          422
        );
      }
      chargeableWeightGrams = input.cargo.chargeableWeightGrams;
      variableCharge = this.roundDivide(
        BigInt(chargeableWeightGrams) * BigInt(rate.baseRate),
        1000n
      );
      trace.push('Cargo charge = chargeable grams x rate per kg / 1000.');
    }
    const minimum = rate.minimumCharge === null ? null : BigInt(rate.minimumCharge);
    const appliedBaseCharge =
      minimum === null || variableCharge > minimum ? variableCharge : minimum;
    const subtotal = appliedBaseCharge;
    const tax = this.roundDivide(subtotal * BigInt(rate.taxRule?.rateBasisPoints ?? 0), 10_000n);
    const total = subtotal + tax;
    return {
      rateCardId: rate.id,
      rateVersion: rate.version,
      currencyCode: rate.currency.code,
      chargeableWeightGrams,
      baseRateMinor: String(rate.baseRate),
      variableChargeMinor: String(variableCharge),
      minimumChargeMinor: rate.minimumCharge === null ? null : String(rate.minimumCharge),
      appliedBaseChargeMinor: String(appliedBaseCharge),
      surchargeLines: [],
      subtotalMinor: String(subtotal),
      taxMinor: String(tax),
      totalMinor: String(total),
      calculationTrace: trace
    };
  }

  private async validate(input: RateCardInput) {
    if (
      !input.originStationId ||
      !(await this.stationsRepository.getById(input.originStationId))?.isActive
    ) {
      throw new DomainError(
        'RATE_ORIGIN_STATION_INVALID',
        'Origin must reference an active station.',
        422
      );
    }
    if (
      !input.destinationStationId ||
      !(await this.stationsRepository.getById(input.destinationStationId))?.isActive
    ) {
      throw new DomainError(
        'RATE_DESTINATION_STATION_INVALID',
        'Destination must reference an active station.',
        422
      );
    }
    if (input.originStationId === input.destinationStationId) {
      throw new DomainError(
        'RATE_STATIONS_MATCH',
        'Origin and destination cannot be the same.',
        422
      );
    }
    if (input.customerId && !(await this.customersRepository.getById(input.customerId))?.isActive) {
      throw new DomainError(
        'RATE_CUSTOMER_INVALID',
        'Customer must reference an active customer.',
        422
      );
    }
    if (
      input.agentId &&
      this.agentRepository &&
      !(await this.agentRepository.getById(input.agentId))?.isActive
    ) {
      throw new DomainError('RATE_AGENT_INVALID', 'Agent must reference an active agent.', 422);
    }
    if (!(await this.currenciesRepository.getById(input.currencyId))?.isActive) {
      throw new DomainError(
        'RATE_CURRENCY_INVALID',
        'Currency must reference an active currency.',
        422
      );
    }
    if (input.taxCodeId) {
      const tax = await this.taxCodesRepository.getById(input.taxCodeId);
      if (!tax?.isActive) {
        throw new DomainError(
          'RATE_TAX_INVALID',
          'Tax rule must reference an active tax rule.',
          422
        );
      }
      if (tax.effectiveTo && tax.effectiveTo < input.effectiveFrom) {
        throw new DomainError(
          'RATE_TAX_OUTSIDE_EFFECTIVE_PERIOD',
          'Tax rule is not effective for this rate.',
          422
        );
      }
    }
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
      throw new DomainError(
        'INVALID_EFFECTIVE_DATE',
        'Effective end date cannot be before start date.',
        422
      );
    }
    if (input.baseRate < 0 || (input.minimumCharge !== null && input.minimumCharge < 0)) {
      throw new DomainError('RATE_MONEY_INVALID', 'Rate money values cannot be negative.', 422);
    }
    if (input.serviceType === 'PASSENGER' && input.rateUnit !== 'PER_PASSENGER') {
      throw new DomainError(
        'RATE_PASSENGER_UNIT_INVALID',
        'Passenger rates must use PER_PASSENGER.',
        422
      );
    }
    if (input.serviceType === 'PASSENGER' && input.cargoPriceBasis) {
      throw new DomainError(
        'RATE_PASSENGER_BASIS_INVALID',
        'Passenger rates cannot use cargo price basis.',
        422
      );
    }
    if (input.serviceType === 'CARGO' && input.rateUnit === 'PER_KG' && !input.cargoPriceBasis) {
      throw new DomainError(
        'RATE_CARGO_BASIS_REQUIRED',
        'Cargo PER_KG rates require a cargo price basis.',
        422
      );
    }
    if (input.rateUnit === 'PER_KG' && !['CARGO'].includes(input.serviceType)) {
      throw new DomainError(
        'RATE_PER_KG_SERVICE_INVALID',
        'PER_KG rates are only valid for cargo service.',
        422
      );
    }
    if (
      input.serviceType === 'CHARTER' &&
      input.rateUnit !== 'PER_FLIGHT' &&
      input.rateUnit !== 'FLAT'
    ) {
      throw new DomainError(
        'RATE_CHARTER_UNIT_INVALID',
        'Charter rates must use PER_FLIGHT or FLAT.',
        422
      );
    }
    if (routeScoped.has(input.pricingScope) && !input.routeId) {
      throw new DomainError(
        'RATE_ROUTE_REQUIRED',
        'Route-scoped rates require a route reference.',
        422
      );
    }
    if (publicScopes.has(input.pricingScope) && (input.customerId || input.contractId)) {
      throw new DomainError(
        'RATE_PUBLIC_SCOPE_INVALID',
        'Public rates cannot be restricted to a customer or contract.',
        422
      );
    }
    if (customerScopes.has(input.pricingScope) && !input.customerId && !input.contractId) {
      throw new DomainError(
        'RATE_CUSTOMER_SCOPE_REQUIRED',
        'Customer or contract is required for customer/contract rates.',
        422
      );
    }
    if (agentScopes.has(input.pricingScope) && !input.agentId) {
      throw new DomainError(
        'RATE_AGENT_SCOPE_REQUIRED',
        'Agent contract rates require an agent.',
        422
      );
    }
  }

  private async ensureNoAmbiguity(input: RateCardInput, excludeId?: string) {
    const candidates = this.repository.findSelectionCandidates({
      serviceType: input.serviceType,
      serviceDate: input.effectiveFrom,
      originStationId: input.originStationId ?? '',
      destinationStationId: input.destinationStationId ?? '',
      customerId: input.customerId,
      agentId: input.agentId,
      contractId: input.contractId,
      bookingChannelCode: input.bookingChannel
    });
    const matching = candidates.filter((candidate) => candidate.id !== excludeId);
    const sameRank = matching.find(
      (candidate) =>
        Number(candidate.rate_priority) === input.ratePriority &&
        String(candidate.pricing_scope) === input.pricingScope &&
        (candidate.customer_id ?? null) === (input.customerId ?? null) &&
        (candidate.agent_id ?? null) === (input.agentId ?? null) &&
        (candidate.contract_id ?? null) === (input.contractId ?? null)
    );
    if (sameRank) {
      throw new DomainError(
        'RATE_SELECTION_AMBIGUOUS',
        'Another active rate has the same applicability and priority.',
        409
      );
    }
  }

  private changedFields(
    existing: Awaited<ReturnType<RateCardService['get']>>,
    input: RateCardInput
  ) {
    const fields: string[] = [];
    for (const key of [
      'rateCode',
      'rateName',
      'serviceType',
      'pricingScope',
      'originStationId',
      'destinationStationId',
      'customerId',
      'agentId',
      'contractId',
      'currencyId',
      'taxCodeId',
      'baseRate',
      'minimumCharge',
      'rateUnit',
      'cargoPriceBasis',
      'ratePriority',
      'effectiveFrom',
      'effectiveTo'
    ] as const) {
      if (existing[key] !== input[key]) fields.push(key);
    }
    return fields.length ? fields : ['updatedAt'];
  }

  private dtoToInput(
    rate: Awaited<ReturnType<RateCardService['get']>>,
    lifecycleStatus = rate.lifecycleStatus
  ): RateCardInput {
    return {
      expectedVersion: rate.version,
      rateCode: rate.rateCode,
      rateName: rate.rateName,
      serviceType: rate.serviceType as RateCardInput['serviceType'],
      lifecycleStatus: lifecycleStatus as RateCardInput['lifecycleStatus'],
      originStationId: rate.originStationId,
      destinationStationId: rate.destinationStationId,
      routeId: rate.routeId,
      customerId: rate.customerId,
      agentId: rate.agentId,
      contractId: rate.contractId,
      aircraftType: rate.aircraftType,
      aircraftTypeId: rate.aircraftTypeId,
      currencyId: rate.currencyId,
      taxCodeId: rate.taxCodeId,
      baseRate: rate.baseRate,
      rateUnit: rate.rateUnit as RateCardInput['rateUnit'],
      pricingScope: rate.pricingScope as RateCardInput['pricingScope'],
      bookingChannel: rate.bookingChannel as RateCardInput['bookingChannel'],
      passengerType: rate.passengerType as RateCardInput['passengerType'],
      cargoPriceBasis: rate.cargoPriceBasis as RateCardInput['cargoPriceBasis'],
      ratePriority: rate.ratePriority,
      minimumCharge: rate.minimumCharge,
      demoUsageNote: rate.demoUsageNote,
      publicNote: rate.publicNote,
      internalPricingNote: rate.internalPricingNote,
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo
    };
  }

  private roundDivide(numerator: bigint, denominator: bigint) {
    return (numerator + denominator / 2n) / denominator;
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError(
        'RATE_CARDS_DUPLICATE',
        'RateCard code or unique combination already exists.',
        409
      );
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new DomainError('RATE_CARDS_RELATION_INVALID', 'A related record is invalid.', 422);
    }
    if (message.includes('RATE_SELECTION_AMBIGUOUS')) {
      throw new DomainError('RATE_SELECTION_AMBIGUOUS', 'Rate selection is ambiguous.', 409);
    }
    throw error;
  }
}
