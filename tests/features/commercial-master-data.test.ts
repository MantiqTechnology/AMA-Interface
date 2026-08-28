import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RateCardInput } from '../../shared/features/commercial/rates';
import type { createDbClient } from '../../server/db/client';
import { CustomerRepository } from '../../server/features/commercial/customers/repository';
import { CustomerService } from '../../server/features/commercial/customers/service';
import { AgentRepository } from '../../server/features/commercial/agents/repository';
import { AgentService } from '../../server/features/commercial/agents/service';
import { RateCardRepository } from '../../server/features/commercial/rates/repository';
import { RateCardService } from '../../server/features/commercial/rates/service';
import { ContractsSubsidiesRepository } from '../../server/features/marketing/contracts-subsidies/repository';
import { PaymentTermRepository } from '../../server/features/finance/payment-terms/repository';
import { CurrencyRepository } from '../../server/features/finance/currencies/repository';
import { TaxCodeRepository } from '../../server/features/finance/tax-codes/repository';
import { StationsRepository } from '../../server/features/operations/stations/repository';
import { createSeededMasterDataDb } from '../helpers/master-data-db';

const validRate: RateCardInput = {
  rateCode: 'SERVICE-TEST-RATE',
  rateName: null,
  serviceType: 'CHARTER',
  lifecycleStatus: 'DRAFT',
  originStationId: 'st-oks',
  destinationStationId: 'st-nbx',
  routeId: null,
  customerId: null,
  agentId: null,
  contractId: null,
  aircraftType: null,
  aircraftTypeId: null,
  currencyId: 'cur-idr',
  taxCodeId: 'tax-ppn',
  baseRate: 1_000_000,
  rateUnit: 'PER_FLIGHT',
  pricingScope: 'PUBLIC_COUNTER',
  bookingChannel: 'COUNTER',
  passengerType: null,
  cargoPriceBasis: null,
  ratePriority: 100,
  minimumCharge: null,
  demoUsageNote: null,
  publicNote: null,
  internalPricingNote: null,
  effectiveFrom: '2026-07-13',
  effectiveTo: null
};

describe('commercial master data services', () => {
  let client: ReturnType<typeof createDbClient>;
  let rates: RateCardService;
  let customers: CustomerService;
  let agents: AgentService;
  let contractsSubsidies: ContractsSubsidiesRepository;

  beforeEach(async () => {
    client = await createSeededMasterDataDb();
    const customerRepository = new CustomerRepository(client.db, client.sqlite);
    customers = new CustomerService(customerRepository, new PaymentTermRepository(client.db));
    const agentRepository = new AgentRepository(client.db, client.sqlite);
    agents = new AgentService(
      agentRepository,
      new StationsRepository(client.db),
      customerRepository,
      new CurrencyRepository(client.db)
    );
    rates = new RateCardService(
      new RateCardRepository(client.db, client.sqlite),
      new StationsRepository(client.db),
      customerRepository,
      new CurrencyRepository(client.db),
      new TaxCodeRepository(client.db),
      agentRepository
    );
    contractsSubsidies = new ContractsSubsidiesRepository(client.sqlite);
  });

  afterEach(() => client.sqlite.close());

  it('owns rate CRUD state, search, duplicates, and service-specific units', async () => {
    const created = await rates.create(validRate);
    expect(await rates.list({ active: 'active', search: 'SERVICE-TEST' })).toHaveLength(1);

    await rates.setActive(created.id, false);
    expect(await rates.list({ active: 'inactive', search: 'SERVICE-TEST' })).toHaveLength(1);

    await expect(rates.create(validRate)).rejects.toMatchObject({ code: 'RATE_CARDS_DUPLICATE' });
    await expect(
      rates.create({
        ...validRate,
        rateCode: 'INVALID-PASSENGER-RATE',
        serviceType: 'PASSENGER',
        rateUnit: 'PER_FLIGHT'
      })
    ).rejects.toMatchObject({ code: 'RATE_PASSENGER_UNIT_INVALID' });
    await expect(
      rates.create({
        ...validRate,
        rateCode: 'INVALID-CARGO-RATE',
        serviceType: 'CARGO',
        rateUnit: 'PER_KG',
        cargoPriceBasis: null
      })
    ).rejects.toMatchObject({ code: 'RATE_CARGO_BASIS_REQUIRED' });
  });

  it('returns rate detail with human-readable relation summaries and usage projection', () => {
    const detail = rates.getDetail('rate-cargo-djj-nbx');

    expect(detail.origin).toMatchObject({
      stationCode: 'DJJ',
      stationName: 'Sentani / Jayapura Station'
    });
    expect(detail.destination).toMatchObject({ stationCode: 'NBX' });
    expect(detail.currency).toMatchObject({ code: 'IDR', name: 'Indonesian Rupiah' });
    expect(detail.taxRule).toMatchObject({ code: 'PPN_11' });
    expect(detail.baseRate).toBe(36_000);
    expect(detail.minimumCharge).toBe(250_000);
    expect(detail.quickSummary?.asOf).toBeTruthy();
  });

  it('selects rates deterministically and rejects ambiguous matching rates', async () => {
    const selected = rates.selectRate({
      serviceType: 'CARGO',
      serviceDate: '2026-07-20',
      originStationId: 'st-djj',
      destinationStationId: 'st-nbx',
      bookingChannelCode: 'CARGO'
    });
    expect(selected.rateCode).toBe('CARGO_DJJ_NBX_KG');
    expect(selected.snapshot).toMatchObject({
      rateVersion: 1,
      rateCodeSnapshot: 'CARGO_DJJ_NBX_KG'
    });

    const first = await rates.create({
      ...validRate,
      rateCode: 'AMBIGUOUS_DJJ_NBX_A',
      serviceType: 'CARGO',
      originStationId: 'st-djj',
      destinationStationId: 'st-nbx',
      rateUnit: 'PER_KG',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'CARGO',
      cargoPriceBasis: 'CHARGEABLE_WEIGHT',
      ratePriority: 44,
      effectiveFrom: '2026-07-20',
      minimumCharge: 100_000,
      lifecycleStatus: 'DRAFT'
    });
    await rates.activate(first.id);
    const second = await rates.create({
      ...validRate,
      rateCode: 'AMBIGUOUS_DJJ_NBX_B',
      serviceType: 'CARGO',
      originStationId: 'st-djj',
      destinationStationId: 'st-nbx',
      rateUnit: 'PER_KG',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'CARGO',
      cargoPriceBasis: 'CHARGEABLE_WEIGHT',
      ratePriority: 44,
      effectiveFrom: '2026-07-20',
      minimumCharge: 100_000,
      lifecycleStatus: 'DRAFT'
    });
    await expect(rates.activate(second.id)).rejects.toMatchObject({
      code: 'RATE_SELECTION_AMBIGUOUS'
    });
  });

  it('previews cargo pricing with minimum charge and tax without creating usage', () => {
    const preview = rates.preview('rate-cargo-djj-nbx', {
      serviceDate: '2026-07-20',
      originStationId: 'st-djj',
      destinationStationId: 'st-nbx',
      customerId: null,
      agentId: null,
      contractId: null,
      bookingChannelCode: 'CARGO',
      cargo: {
        actualWeightGrams: 1000,
        volumetricWeightGrams: 1000,
        chargeableWeightGrams: 1000
      }
    });

    expect(preview).toMatchObject({
      rateCardId: 'rate-cargo-djj-nbx',
      baseRateMinor: '36000',
      variableChargeMinor: '36000',
      minimumChargeMinor: '250000',
      appliedBaseChargeMinor: '250000',
      taxMinor: '27500',
      totalMinor: '277500'
    });
    expect(rates.getUsageSummary('rate-cargo-djj-nbx').appliedTransactionCount).toBe(0);
  });

  it('creates a new version when an active used rate is edited', async () => {
    client.sqlite.pragma('foreign_keys = OFF');
    client.sqlite
      .prepare(
        `INSERT INTO passenger_tickets (
          id, flight_operation_id, passenger_name, document_type, document_number, seat_number,
          passenger_weight_kg, baggage_weight_kg, ticket_price, rate_card_id, total_amount,
          currency_code, ticket_status, payment_status, check_in_status, created_at, updated_at
        ) VALUES (
          'TKT-RATE-VERSION', ?, 'Rate Version Passenger', 'KTP', 'KTP-RATE-VERSION',
          'ZZ', 70, 5, 1800000, 'rate-passenger-djj-wmx', 1800000, 'IDR',
          'ACTIVE', 'UNPAID', 'PENDING', ?, ?
        )`
      )
      .run('flight-rate-version-fixture', '2026-07-20T00:00:00.000Z', '2026-07-20T00:00:00.000Z');
    client.sqlite.pragma('foreign_keys = ON');
    expect(rates.getUsageSummary('rate-passenger-djj-wmx').appliedTransactionCount).toBeGreaterThan(
      0
    );
    const source = rates.getDetail('rate-passenger-djj-wmx');
    const updated = await rates.update('rate-passenger-djj-wmx', {
      rateCode: 'PAX_DJJ_WMX_V2',
      rateName: source.rateName,
      serviceType: source.serviceType as RateCardInput['serviceType'],
      lifecycleStatus: source.lifecycleStatus as RateCardInput['lifecycleStatus'],
      originStationId: source.originStationId,
      destinationStationId: source.destinationStationId,
      routeId: source.routeId,
      customerId: source.customerId,
      agentId: source.agentId,
      contractId: source.contractId,
      aircraftType: source.aircraftType,
      aircraftTypeId: source.aircraftTypeId,
      currencyId: source.currencyId,
      taxCodeId: source.taxCodeId,
      rateUnit: source.rateUnit as RateCardInput['rateUnit'],
      pricingScope: source.pricingScope as RateCardInput['pricingScope'],
      bookingChannel: source.bookingChannel as RateCardInput['bookingChannel'],
      passengerType: source.passengerType as RateCardInput['passengerType'],
      cargoPriceBasis: null,
      ratePriority: source.ratePriority,
      minimumCharge: source.minimumCharge,
      demoUsageNote: source.demoUsageNote,
      publicNote: source.publicNote,
      internalPricingNote: source.internalPricingNote,
      expectedVersion: source.version,
      baseRate: 1_900_000,
      effectiveFrom: '2026-08-01',
      effectiveTo: source.effectiveTo
    });

    expect(updated.id).not.toBe('rate-passenger-djj-wmx');
    expect(updated.version).toBe(2);
    expect(updated.supersedesRateId).toBe('rate-passenger-djj-wmx');
    expect(rates.getDetail('rate-passenger-djj-wmx').baseRate).toBe(1_800_000);
  });

  it('returns customer detail with relation summaries and financial permission boundary', async () => {
    const detail = await customers.getDetail('cust-cargo-partner', true);

    expect(detail.accountType).toBe('AGENCY');
    expect(detail.paymentTerm).toMatchObject({ id: 'term-net-7', name: 'Net 7', dueDays: 7 });
    expect(detail.primaryContact).toMatchObject({
      contactName: 'Cargo Desk',
      roleTitle: 'Agency Cargo Desk'
    });
    expect(detail.creditConfiguration).toMatchObject({
      creditLimitMinor: '150000000',
      currencyCode: 'IDR'
    });
    expect(detail.financialSummary?.availableCreditMinor).toBe('150000000');

    const restricted = await customers.getDetail('cust-cargo-partner', false);
    expect(restricted.financialSummary).toBeNull();
  });

  it('persists contacts, keeps one primary contact, and audits the changes', async () => {
    const added = await customers.createContact(
      'cust-cargo-partner',
      {
        contactName: 'Operations Backup',
        roleTitle: 'Cargo Operations',
        email: 'ops.backup@partner.example',
        phone: '+62-812-0000-1050',
        contactType: 'OPERATIONS',
        isPrimary: true,
        isActive: true,
        notes: null
      },
      { actorId: 'USR-TEST', actorName: 'Test Actor' }
    );

    const contacts = await customers.listContacts('cust-cargo-partner');
    expect(contacts.filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(contacts.find((contact) => contact.isPrimary)?.id).toBe(added.id);

    const history = await customers.listHistory('cust-cargo-partner');
    expect(history.some((item) => item.action === 'CUSTOMER_CONTACT_ADDED')).toBe(true);
  });

  it('requires a reason for credit hold commands and records the audited state', async () => {
    await expect(
      customers.placeCreditHold('cust-cargo-partner', { reason: '' }, { actorId: 'USR-TEST' })
    ).rejects.toBeTruthy();

    await customers.placeCreditHold(
      'cust-cargo-partner',
      { reason: 'Overdue review required.' },
      { actorId: 'USR-TEST', actorName: 'Test Actor' }
    );

    const detail = await customers.getDetail('cust-cargo-partner', true);
    expect(detail.creditStatus).toBe('ON_HOLD');
    expect(
      (await customers.listActivity('cust-cargo-partner')).some(
        (item) => item.title === 'Credit hold placed'
      )
    ).toBe(true);
    expect(
      (await customers.listHistory('cust-cargo-partner')).some(
        (item) => item.action === 'CUSTOMER_CREDIT_HOLD_PLACED'
      )
    ).toBe(true);
  });

  it('exposes customer-specific rates from commercial rates, not component data', async () => {
    const customerRates = await customers.listRates('cust-cargo-partner');

    expect(customerRates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rateCode: 'CARGO_PARTNER_DJJ_WMX_KG',
          originStation: 'DJJ · Sentani / Jayapura Station',
          destinationStation: 'WMX · Wamena Station'
        })
      ])
    );
  });

  it('returns agent detail with station, primary contact, commission, and quick summary', async () => {
    const detail = await agents.getDetail('agent-djj-counter');

    expect(detail.agentType).toBe('STATION_COUNTER');
    expect(detail.station).toMatchObject({
      stationCode: 'DJJ',
      stationName: 'Sentani / Jayapura Station'
    });
    expect(detail.primaryContact).toMatchObject({ contactName: 'Jayapura Counter Desk' });
    expect(detail.defaultCommission).toMatchObject({
      commissionType: 'PERCENTAGE',
      percentageBasisPoints: 0
    });
    expect(detail.quickSummary?.asOf).toBeTruthy();
  });

  it('validates station counter station and preserves one active primary contact', async () => {
    await expect(
      agents.create({
        agentCode: 'NO_STATION',
        agentName: 'No Station Counter',
        agentType: 'STATION_COUNTER',
        stationId: null,
        customerAccountId: null,
        responsiblePersonnelId: null,
        primaryContactId: null,
        bookingChannelCode: 'COUNTER',
        defaultCurrencyCode: 'IDR',
        operationalNote: null,
        commissionBasisPoints: 0,
        contactPerson: null,
        phone: null
      })
    ).rejects.toMatchObject({ code: 'AGENT_STATION_REQUIRED' });

    const added = await agents.createContact('agent-djj-counter', {
      contactName: 'Backup Desk',
      roleTitle: 'Counter Backup',
      department: 'Commercial',
      email: 'backup.djj@ama.example',
      phone: '+62-812-0000-2999',
      contactType: 'BOOKING',
      isPrimary: true,
      isActive: true,
      notes: null
    });
    const contacts = await agents.listContacts('agent-djj-counter');
    expect(contacts.filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(contacts.find((contact) => contact.isPrimary)?.id).toBe(added.id);
  });

  it('uses basis points for commission rules and blocks overlapping active periods', async () => {
    await expect(
      agents.createCommissionRule('agent-papua-cargo', {
        commissionType: 'PERCENTAGE',
        percentageBasisPoints: 750,
        fixedAmountMinor: null,
        currencyCode: 'IDR',
        basisType: 'CARGO_CHARGE',
        serviceTypeId: null,
        routeId: null,
        rateAgreementId: null,
        effectiveFrom: '2026-07-13',
        effectiveUntil: null,
        lifecycleStatus: 'ACTIVE',
        priority: 10
      })
    ).rejects.toMatchObject({ code: 'AGENT_COMMISSION_RULE_OVERLAP' });

    const snapshot = new AgentRepository(client.db, client.sqlite).getCommissionSnapshot(
      'agent-papua-cargo',
      1_000_000,
      'IDR'
    );
    expect(snapshot).toMatchObject({
      agentCodeSnapshot: 'PAPUA_CARGO_AGENT',
      commissionBasisAmount: 1_000_000,
      commissionAmount: 50_000,
      commissionCurrency: 'IDR'
    });
  });

  it('audits lifecycle changes and requires suspend reason', async () => {
    await expect(agents.suspend('agent-djj-counter', {})).rejects.toMatchObject({
      code: 'AGENT_SUSPEND_REASON_REQUIRED'
    });

    await agents.suspend(
      'agent-djj-counter',
      { reason: 'Commercial review.' },
      { actorId: 'USR-TEST', actorName: 'Test Actor' }
    );

    const detail = await agents.getDetail('agent-djj-counter');
    expect(detail.lifecycleStatus).toBe('SUSPENDED');
    expect(
      (await agents.listHistory('agent-djj-counter')).some(
        (item) => item.action === 'AGENT_SUSPENDED'
      )
    ).toBe(true);
  });

  it('aggregates contract subsidy portfolio from persistent contract and subsidy records', () => {
    const overview = contractsSubsidies.overview();

    expect(overview.activeSubsidyProgramCount).toBe(2);
    expect(overview.allocatedBudgetMinor).toBe('20500000000');
    expect(overview.consumedBudgetMinor).toBe('15640000000');
    expect(overview.remainingBudgetMinor).toBe('4860000000');
    expect(overview.absorptionPercent).toBe(76.3);

    const programs = contractsSubsidies.subsidies({ search: 'MIMIKA', status: undefined });
    expect(programs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          programCode: 'PSO_MIMIKA_AGATS_2026',
          remainingBudgetMinor: '1800000000'
        })
      ])
    );

    const contracts = contractsSubsidies.contracts({ search: 'CP-AMA', status: undefined });
    expect(contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractNumber: 'CP-AMA-2026-001',
          subsidyProgramCode: 'CARGO_NABIRE_2026'
        })
      ])
    );
  });

  it('evaluates the portfolio at a snapshot and returns real contract-source and renewal data', () => {
    const historical = contractsSubsidies.overview({
      search: '',
      from: '2026-03-01',
      to: '2026-04-01'
    });
    const overview = contractsSubsidies.overview();

    expect(historical.consumedBudgetMinor).toBe('4200000000');
    expect(overview.contractSourceMix.reduce((sum, item) => sum + item.percentage, 0)).toBeCloseTo(
      100,
      5
    );
    expect(overview.contractSourceMix.every((item) => item.count > 0)).toBe(true);
    expect(overview.upcomingRenewals).toEqual(
      [...overview.upcomingRenewals].sort(
        (left, right) => left.daysLeft - right.daysLeft || left.code.localeCompare(right.code)
      )
    );
    expect(overview.upcomingRenewals.every((item) => item.daysLeft >= 0)).toBe(true);
  });

  it('applies inclusive date boundaries to absorption, activity, and history feeds', () => {
    const range = { search: '', from: '2026-06-30', to: '2026-06-30' };

    expect(contractsSubsidies.absorption(range)).toHaveLength(2);
    expect(contractsSubsidies.activity(range)).toHaveLength(2);
    expect(contractsSubsidies.activity({ ...range, limit: 1 })).toHaveLength(1);
    expect(contractsSubsidies.history(range)).toEqual([]);
  });

  it('filters snapshot lists by status and business type', () => {
    const contracts = contractsSubsidies.contracts({
      search: '',
      status: 'ACTIVE',
      type: 'CUSTOMER_CONTRACT'
    });
    const subsidies = contractsSubsidies.subsidies({
      search: '',
      status: 'ACTIVE',
      type: 'PASSENGER'
    });

    expect(contracts).not.toHaveLength(0);
    expect(contracts.every((item) => item.sourceType === 'CUSTOMER_CONTRACT')).toBe(true);
    expect(subsidies).not.toHaveLength(0);
    expect(subsidies.every((item) => item.serviceScope === 'PASSENGER')).toBe(true);
  });
});
