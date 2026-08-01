import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../client';
import { createDemoSeedContext, type DemoSeedContext } from '../context';
import {
  agents,
  agentContacts,
  agentCommissionRules,
  agentContracts,
  agentNotes,
  contractSubsidyAuditLogs,
  contractSubsidyConsumptions,
  contractSubsidyPrograms,
  customerContacts,
  customerContracts,
  customerNotes,
  customers,
  rateBookingChannels,
  rateCards,
  rateContractLinks
} from '../../schema/commercial';

export async function seedCommercialMasterData(
  db: AppDatabase,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const referenceNow = context.now;
  await db
    .insert(customers)
    .values([
      {
        id: 'cust-papua-logistics',
        accountCode: 'PAPUA_LOGISTICS',
        accountName: 'PT Papua Logistics',
        accountType: 'CORPORATE',
        contactPerson: 'Lukas',
        phone: '+62-812-0000-1001',
        email: 'ops@papua-logistics.example',
        billingAddress: 'Jayapura operations billing address',
        paymentTermId: 'term-net-14',
        creditLimit: 500000000,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'NORMAL',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-papua-logistics',
        commercialNote: 'Preferred charter and cargo customer for DJJ operations.',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-mission-air',
        accountCode: 'MISSION_AIR',
        accountName: 'PT Mission Air Support',
        accountType: 'CORPORATE',
        contactPerson: 'Maria',
        phone: '+62-812-0000-1002',
        email: 'finance@mission-air.example',
        billingAddress: 'Wamena operations billing address',
        paymentTermId: 'term-net-30',
        creditLimit: 750000000,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'NORMAL',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-mission-air',
        commercialNote: 'Mission support account with charter pricing.',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-government',
        accountCode: 'GOV',
        accountName: 'Instansi Pemerintah',
        accountType: 'GOVERNMENT',
        contactPerson: 'Desk Pemerintah',
        phone: '+62-812-0000-1003',
        email: 'desk@government.example',
        billingAddress: 'Papua government registered address',
        paymentTermId: 'term-net-14',
        creditLimit: null,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'REVIEW_REQUIRED',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-government',
        commercialNote: null,
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-cargo-partner',
        accountCode: 'CARGO_PARTNER',
        accountName: 'Cargo Partner',
        accountType: 'AGENCY',
        contactPerson: 'Cargo Desk',
        phone: '+62-812-0000-1004',
        email: 'cargo@partner.example',
        billingAddress: 'Cargo partner registered address',
        paymentTermId: 'term-net-7',
        creditLimit: 150000000,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'NORMAL',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-cargo-partner',
        commercialNote: 'Cargo desk account for agency bookings and rate agreements.',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-individual-1',
        accountCode: 'IND_PASSENGER_001',
        accountName: 'Maya Rumbiak',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Maya Rumbiak',
        phone: '+62-812-0000-1005',
        email: 'maya.passenger@example.example',
        billingAddress: 'Individual registered address 1',
        paymentTermId: 'term-cod',
        creditLimit: null,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'CASH_ONLY',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-individual-1',
        commercialNote: null,
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-individual-2',
        accountCode: 'IND_PASSENGER_002',
        accountName: 'Jonas Kogoya',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Jonas Kogoya',
        phone: '+62-812-0000-1006',
        email: 'jonas.passenger@example.example',
        billingAddress: 'Individual registered address 2',
        paymentTermId: 'term-cod',
        creditLimit: null,
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        creditStatus: 'CASH_ONLY',
        defaultCurrencyCode: 'IDR',
        primaryContactId: 'customer-contact-cust-individual-2',
        commercialNote: null,
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customerContacts)
    .values([
      {
        id: 'customer-contact-cust-papua-logistics',
        customerId: 'cust-papua-logistics',
        contactName: 'Lukas',
        roleTitle: 'Operations Desk',
        email: 'ops@papua-logistics.example',
        phone: '+62-812-0000-1001',
        contactType: 'OPERATIONS',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-mission-air',
        customerId: 'cust-mission-air',
        contactName: 'Maria',
        roleTitle: 'Finance Coordinator',
        email: 'finance@mission-air.example',
        phone: '+62-812-0000-1002',
        contactType: 'FINANCE',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-government',
        customerId: 'cust-government',
        contactName: 'Desk Pemerintah',
        roleTitle: 'Government Liaison',
        email: 'desk@government.example',
        phone: '+62-812-0000-1003',
        contactType: 'PRIMARY',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-cargo-partner',
        customerId: 'cust-cargo-partner',
        contactName: 'Cargo Desk',
        roleTitle: 'Agency Cargo Desk',
        email: 'cargo@partner.example',
        phone: '+62-812-0000-1004',
        contactType: 'CARGO',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-cargo-partner-billing',
        customerId: 'cust-cargo-partner',
        contactName: 'Billing Desk',
        roleTitle: 'Accounts Payable',
        email: 'billing@partner.example',
        phone: '+62-812-0000-1014',
        contactType: 'BILLING',
        isPrimary: false,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-individual-1',
        customerId: 'cust-individual-1',
        contactName: 'Maya Rumbiak',
        roleTitle: null,
        email: 'maya.passenger@example.example',
        phone: '+62-812-0000-1005',
        contactType: 'PRIMARY',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'customer-contact-cust-individual-2',
        customerId: 'cust-individual-2',
        contactName: 'Jonas Kogoya',
        roleTitle: null,
        email: 'jonas.passenger@example.example',
        phone: '+62-812-0000-1006',
        contactType: 'PRIMARY',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customerContracts)
    .values([
      {
        id: 'customer-contract-cargo-partner-2026',
        customerId: 'cust-cargo-partner',
        contractNumber: 'CP-AMA-2026-001',
        contractType: 'CARGO_RATE_AGREEMENT',
        effectiveFrom: context.date(-16),
        effectiveUntil: context.date(180),
        status: 'ACTIVE',
        signedDate: context.date(-20),
        documentId: null,
        renewalStatus: 'NOT_DUE',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customerNotes)
    .values([
      {
        id: 'customer-note-cargo-partner-commercial',
        customerId: 'cust-cargo-partner',
        noteType: 'COMMERCIAL',
        visibility: 'INTERNAL',
        note: 'Use agency cargo rate agreement where available.',
        authorId: 'USR-ADMIN',
        authorName: 'System Administrator',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(contractSubsidyPrograms)
    .values([
      {
        id: 'subsidy-pso-mimika-agats-2026',
        programCode: 'PSO_MIMIKA_AGATS_2026',
        programName: 'Mimika-Agats passenger PSO',
        sponsorName: 'Pemerintah Kab. Mimika',
        serviceScope: 'PASSENGER',
        routeScope: 'TIM -> DEX',
        customerId: 'cust-government',
        contractNumber: 'PSO-MIMIKA-2026-001',
        currencyCode: 'IDR',
        allocatedBudgetMinor: 12000000000,
        effectiveFrom: '2026-01-01',
        effectiveUntil: '2026-12-31',
        lifecycleStatus: 'ACTIVE',
        renewalStatus: 'REVIEW_REQUIRED',
        notes: 'Passenger public service obligation for remote community access.',
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'subsidy-cargo-nabire-2026',
        programCode: 'CARGO_NABIRE_2026',
        programName: 'Nabire essential cargo support',
        sponsorName: 'Pemda Nabire',
        serviceScope: 'CARGO',
        routeScope: 'DJJ -> NBX',
        customerId: 'cust-cargo-partner',
        contractNumber: 'CP-AMA-2026-001',
        currencyCode: 'IDR',
        allocatedBudgetMinor: 8500000000,
        effectiveFrom: '2026-01-01',
        effectiveUntil: '2026-09-15',
        lifecycleStatus: 'ACTIVE',
        renewalStatus: 'NOT_DUE',
        notes: 'Cargo support program for essential supply lanes.',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(contractSubsidyConsumptions)
    .values([
      {
        id: 'subsidy-consumption-mimika-q1',
        programId: 'subsidy-pso-mimika-agats-2026',
        sourceType: 'FINANCE_READ_MODEL',
        sourceId: null,
        description: 'Recognized passenger PSO absorption through Q1 review.',
        amountMinor: 4200000000,
        currencyCode: 'IDR',
        status: 'RECOGNIZED',
        consumedAt: '2026-03-31T00:00:00.000Z',
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'subsidy-consumption-mimika-q2',
        programId: 'subsidy-pso-mimika-agats-2026',
        sourceType: 'FINANCE_READ_MODEL',
        sourceId: null,
        description: 'Recognized passenger PSO absorption through Q2 review.',
        amountMinor: 6000000000,
        currencyCode: 'IDR',
        status: 'RECOGNIZED',
        consumedAt: '2026-06-30T00:00:00.000Z',
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'subsidy-consumption-nabire-h1',
        programId: 'subsidy-cargo-nabire-2026',
        sourceType: 'FINANCE_READ_MODEL',
        sourceId: null,
        description: 'Recognized cargo subsidy absorption through H1 review.',
        amountMinor: 5440000000,
        currencyCode: 'IDR',
        status: 'RECOGNIZED',
        consumedAt: '2026-06-30T00:00:00.000Z',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(contractSubsidyAuditLogs)
    .values([
      {
        id: 'subsidy-audit-mimika-created',
        programId: 'subsidy-pso-mimika-agats-2026',
        action: 'SUBSIDY_PROGRAM_CREATED',
        actorId: 'USR-ADMIN',
        actorName: 'System Administrator',
        changedFields: JSON.stringify(['programCode', 'allocatedBudgetMinor']),
        metadata: null,
        requestId: null,
        occurredAt: referenceNow
      },
      {
        id: 'subsidy-audit-nabire-created',
        programId: 'subsidy-cargo-nabire-2026',
        action: 'SUBSIDY_PROGRAM_CREATED',
        actorId: 'USR-ADMIN',
        actorName: 'System Administrator',
        changedFields: JSON.stringify(['programCode', 'allocatedBudgetMinor']),
        metadata: null,
        requestId: null,
        occurredAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(agents)
    .values([
      {
        id: 'agent-djj-counter',
        agentCode: 'DJJ_COUNTER',
        agentName: 'Jayapura Counter',
        agentType: 'STATION_COUNTER',
        stationId: 'st-djj',
        customerAccountId: null,
        responsiblePersonnelId: null,
        primaryContactId: 'agent-contact-agent-djj-counter',
        bookingChannelCode: 'COUNTER',
        defaultCurrencyCode: 'IDR',
        operationalNote: 'Internal counter for Jayapura station ticket and cargo sales.',
        commissionBasisPoints: 0,
        contactPerson: 'Jayapura Counter Desk',
        phone: '+62-812-0000-2001',
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-wmx-counter',
        agentCode: 'WMX_COUNTER',
        agentName: 'Wamena Counter',
        agentType: 'STATION_COUNTER',
        stationId: 'st-wmx',
        customerAccountId: null,
        responsiblePersonnelId: null,
        primaryContactId: 'agent-contact-agent-wmx-counter',
        bookingChannelCode: 'COUNTER',
        defaultCurrencyCode: 'IDR',
        operationalNote: 'Internal counter for Wamena station ticket and cargo sales.',
        commissionBasisPoints: 0,
        contactPerson: 'Wamena Counter Desk',
        phone: '+62-812-0000-2002',
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-papua-cargo',
        agentCode: 'PAPUA_CARGO_AGENT',
        agentName: 'Papua Cargo Agent',
        agentType: 'CARGO_AGENT',
        stationId: 'st-djj',
        customerAccountId: 'cust-cargo-partner',
        responsiblePersonnelId: null,
        primaryContactId: 'agent-contact-agent-papua-cargo',
        bookingChannelCode: 'CARGO',
        defaultCurrencyCode: 'IDR',
        operationalNote: 'External cargo channel for agency cargo bookings.',
        commissionBasisPoints: 500,
        contactPerson: 'Cargo Agent Desk',
        phone: '+62-812-0000-2003',
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-papua-travel',
        agentCode: 'PAPUA_TRAVEL',
        agentName: 'Papua Travel Network',
        agentType: 'OTA',
        stationId: null,
        customerAccountId: null,
        responsiblePersonnelId: null,
        primaryContactId: 'agent-contact-agent-papua-travel',
        bookingChannelCode: 'AGENT',
        defaultCurrencyCode: 'IDR',
        operationalNote: 'External travel network channel.',
        commissionBasisPoints: 500,
        contactPerson: 'Papua Travel Network Support',
        phone: '+62-21-2977-5800',
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-nusantara-booking',
        agentCode: 'NUSANTARA_BOOKING',
        agentName: 'Nusantara Booking',
        agentType: 'OTA',
        stationId: null,
        customerAccountId: null,
        responsiblePersonnelId: null,
        primaryContactId: 'agent-contact-agent-nusantara-booking',
        bookingChannelCode: 'AGENT',
        defaultCurrencyCode: 'IDR',
        operationalNote: 'External online booking channel.',
        commissionBasisPoints: 500,
        contactPerson: 'Nusantara Booking Support',
        phone: '+62-21-3973-0888',
        isActive: true,
        lifecycleStatus: 'ACTIVE',
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(agentContacts)
    .values([
      {
        id: 'agent-contact-agent-djj-counter',
        agentId: 'agent-djj-counter',
        contactName: 'Jayapura Counter Desk',
        roleTitle: 'Station Counter',
        department: 'Commercial',
        email: 'djj.counter@ama.example',
        phone: '+62-812-0000-2001',
        contactType: 'BOOKING',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-contact-agent-wmx-counter',
        agentId: 'agent-wmx-counter',
        contactName: 'Wamena Counter Desk',
        roleTitle: 'Station Counter',
        department: 'Commercial',
        email: 'wmx.counter@ama.example',
        phone: '+62-812-0000-2002',
        contactType: 'BOOKING',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-contact-agent-papua-cargo',
        agentId: 'agent-papua-cargo',
        contactName: 'Cargo Agent Desk',
        roleTitle: 'Cargo Sales',
        department: 'Cargo',
        email: 'cargo.agent@papua-cargo.example',
        phone: '+62-812-0000-2003',
        contactType: 'SALES',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-contact-agent-papua-travel',
        agentId: 'agent-papua-travel',
        contactName: 'Papua Travel Network Support',
        roleTitle: 'Agency Support',
        department: 'Sales',
        email: 'support@papua-travel.example',
        phone: '+62-21-2977-5800',
        contactType: 'SALES',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-contact-agent-nusantara-booking',
        agentId: 'agent-nusantara-booking',
        contactName: 'Nusantara Booking Support',
        roleTitle: 'Online Channel Support',
        department: 'Sales',
        email: 'support@nusantara-booking.example',
        phone: '+62-21-3973-0888',
        contactType: 'SALES',
        isPrimary: true,
        isActive: true,
        notes: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(agentCommissionRules)
    .values(
      [
        ['agent-djj-counter', 0, 'BASE_FARE'],
        ['agent-wmx-counter', 0, 'BASE_FARE'],
        ['agent-papua-cargo', 500, 'CARGO_CHARGE'],
        ['agent-papua-travel', 500, 'BASE_FARE'],
        ['agent-nusantara-booking', 500, 'BASE_FARE']
      ].map(([agentId, basisPoints, basisType]) => ({
        id: `agent-commission-rule-${agentId}`,
        agentId: String(agentId),
        commissionType: 'PERCENTAGE',
        percentageBasisPoints: Number(basisPoints),
        fixedAmountMinor: null,
        currencyCode: 'IDR',
        basisType: String(basisType),
        serviceTypeId: null,
        routeId: null,
        rateAgreementId: null,
        effectiveFrom: context.date(-16),
        effectiveUntil: null,
        lifecycleStatus: 'ACTIVE',
        priority: 100,
        version: 1,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(agentContracts)
    .values([
      {
        id: 'agent-contract-papua-cargo-2026',
        agentId: 'agent-papua-cargo',
        contractNumber: 'AGT-PAPUA-CARGO-2026',
        contractType: 'COMMISSION_AGREEMENT',
        effectiveFrom: context.date(-16),
        effectiveUntil: context.date(180),
        status: 'ACTIVE',
        signedDate: context.date(-20),
        documentId: null,
        renewalStatus: 'NOT_DUE',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(agentNotes)
    .values([
      {
        id: 'agent-note-djj-counter',
        agentId: 'agent-djj-counter',
        noteType: 'OPERATIONS',
        visibility: 'INTERNAL',
        note: 'Internal station counter; no commission payable.',
        authorId: 'USR-ADMIN',
        authorName: 'System Administrator',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(rateCards)
    .values([
      {
        id: 'rate-charter-djj-wmx',
        rateCode: 'CHARTER_DJJ_WMX',
        serviceType: 'CHARTER',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-papua-logistics',
        aircraftType: 'Pilatus PC-6',
        currencyId: 'cur-idr',
        taxCodeId: null,
        baseRate: 78500000,
        rateUnit: 'PER_FLIGHT',
        bookingChannel: 'CHARTER',
        passengerType: null,
        cargoPriceBasis: null,
        ratePriority: 10,
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-passenger-djj-wmx',
        rateCode: 'PAX_DJJ_WMX',
        serviceType: 'PASSENGER',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: null,
        baseRate: 1800000,
        rateUnit: 'PER_PASSENGER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 50,
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-djj-wmx',
        rateCode: 'CARGO_DJJ_WMX_KG',
        serviceType: 'CARGO',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: null,
        baseRate: 32000,
        rateUnit: 'PER_KG',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-djj-nbx',
        rateCode: 'CARGO_DJJ_NBX_KG',
        rateName: 'DJJ to NBX cargo per kilogram',
        serviceType: 'CARGO',
        lifecycleStatus: 'ACTIVE',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        routeId: 'route-djj-nbx',
        customerId: null,
        agentId: null,
        contractId: null,
        aircraftType: null,
        aircraftTypeId: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 36000,
        rateUnit: 'PER_KG',
        pricingScope: 'CARGO_CONTRACT',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for DJJ-NBX cargo desk bookings.',
        publicNote: 'Cargo desk published rate.',
        internalPricingNote: 'Minimum charge applies before tax. No surcharge model is configured.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        rateFamilyId: 'rate-cargo-djj-nbx',
        supersedesRateId: null,
        version: 1,
        createdBy: 'USR-ADMIN',
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-partner-djj-wmx',
        rateCode: 'CARGO_PARTNER_DJJ_WMX_KG',
        serviceType: 'CARGO',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-cargo-partner',
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 30000,
        rateUnit: 'PER_KG',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 15,
        minimumCharge: 200000,
        demoUsageNote: 'Customer-specific cargo agreement for Cargo Partner.',
        effectiveFrom: context.date(-16),
        effectiveTo: context.date(180),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-charter-tim-wmx',
        rateCode: 'CHARTER_TIM_WMX',
        serviceType: 'CHARTER',
        originStationId: 'st-tim',
        destinationStationId: 'st-wmx',
        customerId: 'cust-mission-air',
        aircraftType: 'Cessna Caravan 208B',
        currencyId: 'cur-idr',
        taxCodeId: null,
        baseRate: 92000000,
        rateUnit: 'PER_FLIGHT',
        bookingChannel: 'CORPORATE',
        passengerType: null,
        cargoPriceBasis: null,
        ratePriority: 20,
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(rateCards)
    .values([
      {
        id: 'rate-passenger-djj-tim',
        rateCode: 'PAX_DJJ_TIM',
        serviceType: 'PASSENGER',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-non-tax',
        baseRate: 2200000,
        rateUnit: 'PER_PASSENGER',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 50,
        minimumCharge: null,
        demoUsageNote: 'Public passenger fare for the DJJ-TIM ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-djj-tim',
        rateCode: 'CARGO_DJJ_TIM_KG',
        serviceType: 'CARGO',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 38000,
        rateUnit: 'PER_KG',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the DJJ-TIM ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-passenger-tim-wmx',
        rateCode: 'PAX_TIM_WMX',
        serviceType: 'PASSENGER',
        originStationId: 'st-tim',
        destinationStationId: 'st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-non-tax',
        baseRate: 1900000,
        rateUnit: 'PER_PASSENGER',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 50,
        minimumCharge: null,
        demoUsageNote: 'Public passenger fare for the TIM-WMX ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-tim-wmx',
        rateCode: 'CARGO_TIM_WMX_KG',
        serviceType: 'CARGO',
        originStationId: 'st-tim',
        destinationStationId: 'st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 34000,
        rateUnit: 'PER_KG',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the TIM-WMX ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-passenger-wmx-oks',
        rateCode: 'PAX_WMX_OKS',
        serviceType: 'PASSENGER',
        originStationId: 'st-wmx',
        destinationStationId: 'st-oks',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-non-tax',
        baseRate: 1200000,
        rateUnit: 'PER_PASSENGER',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 50,
        minimumCharge: null,
        demoUsageNote: 'Public passenger fare for the WMX-OKS ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-wmx-oks',
        rateCode: 'CARGO_WMX_OKS_KG',
        serviceType: 'CARGO',
        originStationId: 'st-wmx',
        destinationStationId: 'st-oks',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 22000,
        rateUnit: 'PER_KG',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the WMX-OKS ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-passenger-djj-nbx',
        rateCode: 'PAX_DJJ_NBX',
        serviceType: 'PASSENGER',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-non-tax',
        baseRate: 2100000,
        rateUnit: 'PER_PASSENGER',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 50,
        minimumCharge: null,
        demoUsageNote: 'Public passenger fare for the DJJ-NBX ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-cargo-djj-nbx',
        rateCode: 'CARGO_DJJ_NBX_KG',
        serviceType: 'CARGO',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 36000,
        rateUnit: 'PER_KG',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the DJJ-NBX ticketing workflow.',
        effectiveFrom: context.date(-16),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(rateCards)
    .values([
      {
        id: 'rate-passenger-djj-wmx-expired',
        rateCode: 'PAX_DJJ_WMX_PREVIOUS',
        serviceType: 'PASSENGER',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'cur-idr',
        taxCodeId: 'tax-non-tax',
        baseRate: 1650000,
        rateUnit: 'PER_PASSENGER',
        pricingScope: 'PUBLIC_COUNTER',
        bookingChannel: 'COUNTER',
        passengerType: 'ADULT',
        cargoPriceBasis: null,
        ratePriority: 80,
        minimumCharge: null,
        demoUsageNote: 'Previous passenger tariff retained for historical comparison.',
        effectiveFrom: context.date(-120),
        effectiveTo: context.date(-30),
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'rate-charter-djj-nbx-future',
        rateCode: 'CHARTER_DJJ_NBX_FUTURE',
        serviceType: 'CHARTER',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        customerId: 'cust-government',
        aircraftType: 'Cessna Caravan 208B',
        currencyId: 'cur-idr',
        taxCodeId: 'tax-ppn',
        baseRate: 84000000,
        rateUnit: 'PER_FLIGHT',
        pricingScope: 'CORPORATE_CONTRACT',
        bookingChannel: 'CORPORATE',
        passengerType: null,
        cargoPriceBasis: null,
        ratePriority: 20,
        minimumCharge: 84000000,
        demoUsageNote: 'Approved charter tariff scheduled for the next commercial period.',
        effectiveFrom: context.date(30),
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  for (const rate of [
    {
      id: 'rate-charter-djj-wmx',
      pricingScope: 'CHARTER_CONTRACT',
      bookingChannel: 'CHARTER',
      passengerType: null,
      cargoPriceBasis: null,
      ratePriority: 10,
      minimumCharge: 78500000,
      demoUsageNote: 'Corporate charter reference for Flight Order revenue and finance handoff.'
    },
    {
      id: 'rate-passenger-djj-wmx',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'COUNTER',
      passengerType: 'ADULT',
      cargoPriceBasis: null,
      ratePriority: 50,
      minimumCharge: null,
      demoUsageNote: 'Passenger fare for station counter/ticketing workflow visibility.'
    },
    {
      id: 'rate-cargo-djj-wmx',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'CARGO',
      passengerType: null,
      cargoPriceBasis: 'CHARGEABLE_WEIGHT',
      ratePriority: 40,
      minimumCharge: 250000,
      demoUsageNote: 'Cargo per-kg reference for future cargo booking/AWB workflow.'
    },
    {
      id: 'rate-cargo-djj-nbx',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'CARGO',
      passengerType: null,
      cargoPriceBasis: 'CHARGEABLE_WEIGHT',
      ratePriority: 40,
      minimumCharge: 250000,
      demoUsageNote: 'Public cargo rate for DJJ-NBX cargo desk bookings.'
    },
    {
      id: 'rate-charter-tim-wmx',
      pricingScope: 'CORPORATE_CONTRACT',
      bookingChannel: 'CORPORATE',
      passengerType: null,
      cargoPriceBasis: null,
      ratePriority: 20,
      minimumCharge: 92000000,
      demoUsageNote: 'Corporate route rate for charter comparison in P0 master data.'
    }
  ]) {
    await db
      .update(rateCards)
      .set({
        pricingScope: rate.pricingScope,
        bookingChannel: rate.bookingChannel,
        passengerType: rate.passengerType,
        cargoPriceBasis: rate.cargoPriceBasis,
        ratePriority: rate.ratePriority,
        minimumCharge: rate.minimumCharge,
        demoUsageNote: rate.demoUsageNote,
        updatedAt: referenceNow
      })
      .where(eq(rateCards.id, rate.id));
  }

  for (const rateTax of [
    { id: 'rate-charter-djj-wmx', taxCodeId: 'tax-ppn' },
    { id: 'rate-passenger-djj-wmx', taxCodeId: 'tax-non-tax' },
    { id: 'rate-cargo-djj-wmx', taxCodeId: 'tax-ppn' },
    { id: 'rate-cargo-djj-nbx', taxCodeId: 'tax-ppn' },
    { id: 'rate-charter-tim-wmx', taxCodeId: 'tax-ppn' }
  ]) {
    await db
      .update(rateCards)
      .set({ taxCodeId: rateTax.taxCodeId, updatedAt: referenceNow })
      .where(eq(rateCards.id, rateTax.id));
  }

  await db
    .insert(rateBookingChannels)
    .values(
      [
        ['rate-charter-djj-wmx', 'CHARTER'],
        ['rate-passenger-djj-wmx', 'COUNTER'],
        ['rate-cargo-djj-wmx', 'CARGO'],
        ['rate-cargo-djj-nbx', 'CARGO'],
        ['rate-cargo-partner-djj-wmx', 'CARGO'],
        ['rate-charter-tim-wmx', 'CORPORATE']
      ].map(([rateCardId, channel]) => ({
        id: `rate-booking-channel-${rateCardId}`,
        rateCardId: String(rateCardId),
        bookingChannelCode: String(channel),
        effectiveFrom: context.date(-16),
        effectiveUntil: null,
        status: 'ACTIVE',
        createdAt: referenceNow,
        updatedAt: referenceNow
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(rateContractLinks)
    .values([
      {
        id: 'rate-contract-link-cargo-partner-djj-wmx',
        rateCardId: 'rate-cargo-partner-djj-wmx',
        customerId: 'cust-cargo-partner',
        contractNumber: 'CP-AMA-2026-001',
        contractName: 'Cargo Partner 2026 Rate Agreement',
        effectiveFrom: context.date(-16),
        effectiveUntil: context.date(180),
        status: 'ACTIVE',
        rateScope: 'CARGO_CONTRACT',
        documentId: null,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();
}
