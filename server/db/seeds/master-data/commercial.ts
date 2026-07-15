import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../client';
import { customers, agents, rateCards } from '../../schema/commercial';

const referenceNow = '2026-07-07T09:00:00.000+07:00';

export async function seedCommercialMasterData(db: AppDatabase) {
  await db
    .insert(customers)
    .values([
      {
        id: 'cust-papua-logistics',
        accountCode: 'PAPUA_LOGISTICS_DEMO',
        accountName: 'PT Papua Logistics Demo',
        accountType: 'CORPORATE',
        contactPerson: 'Lukas Demo',
        phone: '+62-812-0000-1001',
        email: 'ops@papua-logistics.demo',
        billingAddress: 'Jayapura demo billing address',
        paymentTermId: 'term-net-14',
        creditLimit: 500000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-mission-air',
        accountCode: 'MISSION_AIR_DEMO',
        accountName: 'PT Mission Air Support Demo',
        accountType: 'CORPORATE',
        contactPerson: 'Maria Demo',
        phone: '+62-812-0000-1002',
        email: 'finance@mission-air.demo',
        billingAddress: 'Wamena demo billing address',
        paymentTermId: 'term-net-30',
        creditLimit: 750000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-government',
        accountCode: 'GOV_DEMO',
        accountName: 'Instansi Pemerintah Demo',
        accountType: 'GOVERNMENT',
        contactPerson: 'Desk Pemerintah Demo',
        phone: '+62-812-0000-1003',
        email: 'desk@government.demo',
        billingAddress: 'Papua government demo address',
        paymentTermId: 'term-net-14',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-cargo-partner',
        accountCode: 'CARGO_PARTNER_DEMO',
        accountName: 'Cargo Partner Demo',
        accountType: 'AGENCY',
        contactPerson: 'Cargo Desk Demo',
        phone: '+62-812-0000-1004',
        email: 'cargo@partner.demo',
        billingAddress: 'Cargo partner demo address',
        paymentTermId: 'term-net-7',
        creditLimit: 150000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-individual-1',
        accountCode: 'IND_PASSENGER_001',
        accountName: 'Maya Rumbiak Demo',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Maya Rumbiak Demo',
        phone: '+62-812-0000-1005',
        email: 'maya.passenger@example.demo',
        billingAddress: 'Individual demo address 1',
        paymentTermId: 'term-cod',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cust-individual-2',
        accountCode: 'IND_PASSENGER_002',
        accountName: 'Jonas Kogoya Demo',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Jonas Kogoya Demo',
        phone: '+62-812-0000-1006',
        email: 'jonas.passenger@example.demo',
        billingAddress: 'Individual demo address 2',
        paymentTermId: 'term-cod',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(agents)
    .values([
      {
        id: 'agent-djj-counter',
        agentCode: 'DJJ_COUNTER_DEMO',
        agentName: 'Jayapura Counter Demo',
        agentType: 'STATION_COUNTER',
        stationId: 'st-djj',
        commissionBasisPoints: 0,
        contactPerson: 'Jayapura Counter Desk',
        phone: '+62-812-0000-2001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-wmx-counter',
        agentCode: 'WMX_COUNTER_DEMO',
        agentName: 'Wamena Counter Demo',
        agentType: 'STATION_COUNTER',
        stationId: 'st-wmx',
        commissionBasisPoints: 0,
        contactPerson: 'Wamena Counter Desk',
        phone: '+62-812-0000-2002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-papua-cargo',
        agentCode: 'PAPUA_CARGO_AGENT',
        agentName: 'Papua Cargo Agent Demo',
        agentType: 'CARGO_AGENT',
        stationId: 'st-djj',
        commissionBasisPoints: 500,
        contactPerson: 'Cargo Agent Desk',
        phone: '+62-812-0000-2003',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-traveloka',
        agentCode: 'TRAVELOKA',
        agentName: 'Traveloka',
        agentType: 'OTA',
        stationId: null,
        commissionBasisPoints: 500,
        contactPerson: 'Traveloka Support',
        phone: '+62-21-2977-5800',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'agent-tiket-com',
        agentCode: 'TIKET_COM',
        agentName: 'Tiket.com',
        agentType: 'OTA',
        stationId: null,
        commissionBasisPoints: 500,
        contactPerson: 'Tiket.com Support',
        phone: '+62-21-3973-0888',
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
        effectiveFrom: '2026-07-01',
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
        effectiveFrom: '2026-07-01',
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
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
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
        effectiveFrom: '2026-07-01',
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
        demoUsageNote: 'Public passenger fare for the DJJ-TIM ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        taxCodeId: 'tax-ppn-demo',
        baseRate: 38000,
        rateUnit: 'PER_KG',
        pricingScope: 'CARGO_CONTRACT',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the DJJ-TIM ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        demoUsageNote: 'Public passenger fare for the TIM-WMX ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        taxCodeId: 'tax-ppn-demo',
        baseRate: 34000,
        rateUnit: 'PER_KG',
        pricingScope: 'CARGO_CONTRACT',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the TIM-WMX ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        demoUsageNote: 'Public passenger fare for the WMX-OKS ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        taxCodeId: 'tax-ppn-demo',
        baseRate: 22000,
        rateUnit: 'PER_KG',
        pricingScope: 'CARGO_CONTRACT',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the WMX-OKS ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        demoUsageNote: 'Public passenger fare for the DJJ-NBX ticketing demo.',
        effectiveFrom: '2026-07-01',
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
        taxCodeId: 'tax-ppn-demo',
        baseRate: 36000,
        rateUnit: 'PER_KG',
        pricingScope: 'CARGO_CONTRACT',
        bookingChannel: 'CARGO',
        passengerType: null,
        cargoPriceBasis: 'CHARGEABLE_WEIGHT',
        ratePriority: 40,
        minimumCharge: 250000,
        demoUsageNote: 'Public cargo rate for the DJJ-NBX ticketing demo.',
        effectiveFrom: '2026-07-01',
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
      demoUsageNote: 'Corporate charter reference for Flight Order revenue and finance demo.'
    },
    {
      id: 'rate-passenger-djj-wmx',
      pricingScope: 'PUBLIC_COUNTER',
      bookingChannel: 'COUNTER',
      passengerType: 'ADULT',
      cargoPriceBasis: null,
      ratePriority: 50,
      minimumCharge: null,
      demoUsageNote: 'Passenger fare for station counter/ticketing demo visibility.'
    },
    {
      id: 'rate-cargo-djj-wmx',
      pricingScope: 'CARGO_CONTRACT',
      bookingChannel: 'CARGO',
      passengerType: null,
      cargoPriceBasis: 'CHARGEABLE_WEIGHT',
      ratePriority: 40,
      minimumCharge: 250000,
      demoUsageNote: 'Cargo per-kg reference for future cargo booking/AWB demo.'
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
    { id: 'rate-charter-djj-wmx', taxCodeId: 'tax-ppn-demo' },
    { id: 'rate-passenger-djj-wmx', taxCodeId: 'tax-non-tax' },
    { id: 'rate-cargo-djj-wmx', taxCodeId: 'tax-ppn-demo' },
    { id: 'rate-charter-tim-wmx', taxCodeId: 'tax-ppn-demo' }
  ]) {
    await db
      .update(rateCards)
      .set({ taxCodeId: rateTax.taxCodeId, updatedAt: referenceNow })
      .where(eq(rateCards.id, rateTax.id));
  }
}
