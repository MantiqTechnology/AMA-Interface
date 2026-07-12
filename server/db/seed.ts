import { sql } from 'drizzle-orm';
import type { AppDatabase } from './client';
import {
  aircraft,
  alerts,
  approvals,
  customers,
  flightOrders,
  fuelRequests,
  fuelUplifts,
  invoices,
  maintenanceWorkOrders,
  manifests,
  payments,
  refAircraft,
  refAgents,
  refChartOfAccounts,
  refCostCategories,
  refCrews,
  refCurrencies,
  refCustomers,
  refDgCategories,
  refFlightReasons,
  refFuelSuppliers,
  refPaymentTerms,
  refRateCards,
  refRoutes,
  refStationServiceSuppliers,
  refStations,
  refTaxCodes,
  refVendors,
  routes,
  serializedParts,
  stationExpenses,
  stations,
  cargoBookings
} from './schema';

const now = '2026-07-04T09:00:00.000+07:00';
const referenceNow = '2026-07-07T09:00:00.000+07:00';

export async function seedDemoData(db: AppDatabase) {
  await db
    .insert(refCurrencies)
    .values([
      {
        id: 'ref-cur-idr',
        currencyCode: 'IDR',
        currencyName: 'Indonesian Rupiah',
        symbol: 'Rp',
        decimalPlaces: 0,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cur-usd',
        currencyCode: 'USD',
        currencyName: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refPaymentTerms)
    .values([
      {
        id: 'ref-term-cod',
        termCode: 'COD',
        termName: 'Cash on Delivery',
        dueDays: 0,
        description: 'Payment due immediately for demo cash transactions.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-term-net-7',
        termCode: 'NET_7',
        termName: 'Net 7',
        dueDays: 7,
        description: 'Payment due seven days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-term-net-14',
        termCode: 'NET_14',
        termName: 'Net 14',
        dueDays: 14,
        description: 'Payment due fourteen days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-term-net-30',
        termCode: 'NET_30',
        termName: 'Net 30',
        dueDays: 30,
        description: 'Payment due thirty days after invoice date.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refStations)
    .values([
      {
        id: 'ref-st-djj',
        stationCode: 'DJJ',
        stationName: 'Sentani / Jayapura Demo Station',
        cityOrRegion: 'Jayapura',
        province: 'Papua',
        airportType: 'AIRPORT',
        hasFuelService: true,
        hasHandlingService: true,
        hasParkingService: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-st-wmx',
        stationCode: 'WMX',
        stationName: 'Wamena Demo Station',
        cityOrRegion: 'Wamena',
        province: 'Papua Pegunungan',
        airportType: 'AIRPORT',
        hasFuelService: true,
        hasHandlingService: true,
        hasParkingService: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-st-tim',
        stationCode: 'TIM',
        stationName: 'Timika Demo Station',
        cityOrRegion: 'Timika',
        province: 'Papua Tengah',
        airportType: 'AIRPORT',
        hasFuelService: true,
        hasHandlingService: true,
        hasParkingService: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-st-nbx',
        stationCode: 'NBX',
        stationName: 'Nabire Demo Station',
        cityOrRegion: 'Nabire',
        province: 'Papua Tengah',
        airportType: 'AIRPORT',
        hasFuelService: false,
        hasHandlingService: true,
        hasParkingService: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-st-oks',
        stationCode: 'OKS',
        stationName: 'Oksibil Demo Airstrip',
        cityOrRegion: 'Oksibil',
        province: 'Papua Pegunungan',
        airportType: 'AIRSTRIP',
        hasFuelService: false,
        hasHandlingService: true,
        hasParkingService: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-st-dex',
        stationCode: 'DEX',
        stationName: 'Dekai Demo Airstrip',
        cityOrRegion: 'Dekai',
        province: 'Papua Pegunungan',
        airportType: 'STOL_AIRFIELD',
        hasFuelService: false,
        hasHandlingService: false,
        hasParkingService: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refChartOfAccounts)
    .values([
      {
        id: 'ref-coa-1000',
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-1100',
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        accountType: 'ASSET',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-2100',
        accountCode: '2100',
        accountName: 'Tax Payable',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-4100',
        accountCode: '4100',
        accountName: 'Charter Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-4200',
        accountCode: '4200',
        accountName: 'Passenger Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-4300',
        accountCode: '4300',
        accountName: 'Cargo Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-5100',
        accountCode: '5100',
        accountName: 'Fuel Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-5200',
        accountCode: '5200',
        accountName: 'Handling Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-5300',
        accountCode: '5300',
        accountName: 'Parking Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-5400',
        accountCode: '5400',
        accountName: 'Maintenance Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-coa-5500',
        accountCode: '5500',
        accountName: 'Station Operational Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: null,
        isPostable: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refCostCategories)
    .values([
      {
        id: 'ref-cost-fuel',
        categoryCode: 'FUEL',
        categoryName: 'Fuel',
        costGroup: 'Station Operations',
        defaultCoaId: 'ref-coa-5100',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-handling',
        categoryCode: 'HANDLING',
        categoryName: 'Handling',
        costGroup: 'Station Operations',
        defaultCoaId: 'ref-coa-5200',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-parking',
        categoryCode: 'PARKING',
        categoryName: 'Parking',
        costGroup: 'Station Operations',
        defaultCoaId: 'ref-coa-5300',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-accommodation',
        categoryCode: 'ACCOMMODATION',
        categoryName: 'Accommodation',
        costGroup: 'Crew Support',
        defaultCoaId: 'ref-coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-transport',
        categoryCode: 'TRANSPORT',
        categoryName: 'Transport',
        costGroup: 'Crew Support',
        defaultCoaId: 'ref-coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-maintenance',
        categoryCode: 'MAINTENANCE',
        categoryName: 'Maintenance',
        costGroup: 'Maintenance',
        defaultCoaId: 'ref-coa-5400',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-emergency',
        categoryCode: 'EMERGENCY',
        categoryName: 'Emergency',
        costGroup: 'Irregular Operations',
        defaultCoaId: 'ref-coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cost-other',
        categoryCode: 'OTHER',
        categoryName: 'Other',
        costGroup: 'Other',
        defaultCoaId: 'ref-coa-5500',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refAircraft)
    .values([
      {
        id: 'ref-ac-pk-ama',
        registrationNumber: 'PK-AMA',
        aircraftType: 'Pilatus PC-6',
        manufacturer: 'Pilatus',
        model: 'PC-6 Porter Demo',
        passengerCapacity: 10,
        cargoCapacityKg: 1200,
        fuelType: 'AVTUR',
        serviceabilityStatus: 'SERVICEABLE',
        baseStationId: 'ref-st-djj',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-ac-pk-amb',
        registrationNumber: 'PK-AMB',
        aircraftType: 'Cessna Caravan 208B',
        manufacturer: 'Cessna',
        model: 'Caravan 208B Demo',
        passengerCapacity: 12,
        cargoCapacityKg: 1400,
        fuelType: 'AVTUR',
        serviceabilityStatus: 'SERVICEABLE',
        baseStationId: 'ref-st-djj',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-ac-pk-amc',
        registrationNumber: 'PK-AMC',
        aircraftType: 'PAC 750XL',
        manufacturer: 'Pacific Aerospace',
        model: 'PAC 750XL Demo',
        passengerCapacity: 9,
        cargoCapacityKg: 1000,
        fuelType: 'AVTUR',
        serviceabilityStatus: 'UNSERVICEABLE',
        baseStationId: 'ref-st-wmx',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refCrews)
    .values([
      {
        id: 'ref-crew-pic-valid',
        employeeCode: 'AMA-PIC-001',
        fullName: 'Daniel Waromi Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-001',
        licenseExpiryDate: '2027-01-07',
        medicalExpiryDate: '2026-12-07',
        baseStationId: 'ref-st-djj',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-pic-expiring',
        employeeCode: 'AMA-PIC-002',
        fullName: 'Mikael Kogoya Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-002',
        licenseExpiryDate: '2026-07-27',
        medicalExpiryDate: '2026-08-02',
        baseStationId: 'ref-st-wmx',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-pic-expired',
        employeeCode: 'AMA-PIC-003',
        fullName: 'Yohanis Tabuni Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-003',
        licenseExpiryDate: '2026-06-25',
        medicalExpiryDate: '2026-06-30',
        baseStationId: 'ref-st-tim',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-cop-valid',
        employeeCode: 'AMA-COP-001',
        fullName: 'Maria Numberi Demo',
        crewRole: 'CO_PILOT',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-COP-001',
        licenseExpiryDate: '2026-12-18',
        medicalExpiryDate: '2026-11-22',
        baseStationId: 'ref-st-djj',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-cop-valid-2',
        employeeCode: 'AMA-COP-002',
        fullName: 'Agus Yikwa Demo',
        crewRole: 'CO_PILOT',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-COP-002',
        licenseExpiryDate: '2027-03-14',
        medicalExpiryDate: '2027-02-14',
        baseStationId: 'ref-st-wmx',
        unit: 'Flight Operations',
        employmentStatus: 'CONTRACT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-ground-001',
        employeeCode: 'AMA-GRD-001',
        fullName: 'Rina Kambu Demo',
        crewRole: 'GROUND_CREW',
        licenseType: null,
        licenseNumber: null,
        licenseExpiryDate: null,
        medicalExpiryDate: null,
        baseStationId: 'ref-st-djj',
        unit: 'Ground Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-crew-ops-001',
        employeeCode: 'AMA-OPS-001',
        fullName: 'Samuel Itlay Demo',
        crewRole: 'FLIGHT_OPERATIONS',
        licenseType: null,
        licenseNumber: null,
        licenseExpiryDate: null,
        medicalExpiryDate: null,
        baseStationId: 'ref-st-tim',
        unit: 'OCC',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refRoutes)
    .values([
      {
        id: 'ref-route-djj-wmx',
        routeCode: 'DJJ-WMX',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        estimatedDurationMinutes: 55,
        distanceKm: 250,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-route-djj-tim',
        routeCode: 'DJJ-TIM',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-tim',
        estimatedDurationMinutes: 95,
        distanceKm: 456,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-route-tim-wmx',
        routeCode: 'TIM-WMX',
        originStationId: 'ref-st-tim',
        destinationStationId: 'ref-st-wmx',
        estimatedDurationMinutes: 70,
        distanceKm: 318,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-route-wmx-oks',
        routeCode: 'WMX-OKS',
        originStationId: 'ref-st-wmx',
        destinationStationId: 'ref-st-oks',
        estimatedDurationMinutes: 35,
        distanceKm: 118,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-route-djj-nbx',
        routeCode: 'DJJ-NBX',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-nbx',
        estimatedDurationMinutes: 80,
        distanceKm: 390,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refFlightReasons)
    .values([
      {
        id: 'ref-reason-weather',
        reasonCode: 'WEATHER',
        reasonType: 'DELAY',
        category: 'Operational',
        description: 'Weather below demo operating minimum.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-technical',
        reasonCode: 'TECHNICAL',
        reasonType: 'DELAY',
        category: 'Maintenance',
        description: 'Technical inspection or rectification required.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-crew',
        reasonCode: 'CREW_UNAVAILABLE',
        reasonType: 'CANCELLED',
        category: 'Crew',
        description: 'Required crew member unavailable for duty.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-airport',
        reasonCode: 'AIRPORT_RESTRICTION',
        reasonType: 'DIVERTED',
        category: 'Station',
        description: 'Origin or destination station restriction.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-operational',
        reasonCode: 'OPERATIONAL',
        reasonType: 'DELAY',
        category: 'Operational',
        description: 'Operational sequencing or resource constraint.',
        requiresNote: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-customer-request',
        reasonCode: 'CUSTOMER_REQUEST',
        reasonType: 'CANCELLED',
        category: 'Commercial',
        description: 'Customer requested cancellation or movement change.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-reason-data-correction',
        reasonCode: 'DATA_CORRECTION',
        reasonType: 'REOPENED_FOR_CORRECTION',
        category: 'Data Quality',
        description: 'Record reopened for correction after review.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refCustomers)
    .values([
      {
        id: 'ref-cust-papua-logistics',
        accountCode: 'PAPUA_LOGISTICS_DEMO',
        accountName: 'PT Papua Logistics Demo',
        accountType: 'CORPORATE',
        contactPerson: 'Lukas Demo',
        phone: '+62-812-0000-1001',
        email: 'ops@papua-logistics.demo',
        billingAddress: 'Jayapura demo billing address',
        paymentTermId: 'ref-term-net-14',
        creditLimit: 500000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cust-mission-air',
        accountCode: 'MISSION_AIR_DEMO',
        accountName: 'PT Mission Air Support Demo',
        accountType: 'CORPORATE',
        contactPerson: 'Maria Demo',
        phone: '+62-812-0000-1002',
        email: 'finance@mission-air.demo',
        billingAddress: 'Wamena demo billing address',
        paymentTermId: 'ref-term-net-30',
        creditLimit: 750000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cust-government',
        accountCode: 'GOV_DEMO',
        accountName: 'Instansi Pemerintah Demo',
        accountType: 'GOVERNMENT',
        contactPerson: 'Desk Pemerintah Demo',
        phone: '+62-812-0000-1003',
        email: 'desk@government.demo',
        billingAddress: 'Papua government demo address',
        paymentTermId: 'ref-term-net-14',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cust-cargo-partner',
        accountCode: 'CARGO_PARTNER_DEMO',
        accountName: 'Cargo Partner Demo',
        accountType: 'AGENCY',
        contactPerson: 'Cargo Desk Demo',
        phone: '+62-812-0000-1004',
        email: 'cargo@partner.demo',
        billingAddress: 'Cargo partner demo address',
        paymentTermId: 'ref-term-net-7',
        creditLimit: 150000000,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cust-individual-1',
        accountCode: 'IND_PASSENGER_001',
        accountName: 'Maya Rumbiak Demo',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Maya Rumbiak Demo',
        phone: '+62-812-0000-1005',
        email: 'maya.passenger@example.demo',
        billingAddress: 'Individual demo address 1',
        paymentTermId: 'ref-term-cod',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-cust-individual-2',
        accountCode: 'IND_PASSENGER_002',
        accountName: 'Jonas Kogoya Demo',
        accountType: 'INDIVIDUAL',
        contactPerson: 'Jonas Kogoya Demo',
        phone: '+62-812-0000-1006',
        email: 'jonas.passenger@example.demo',
        billingAddress: 'Individual demo address 2',
        paymentTermId: 'ref-term-cod',
        creditLimit: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refAgents)
    .values([
      {
        id: 'ref-agent-djj-counter',
        agentCode: 'DJJ_COUNTER_DEMO',
        agentName: 'Jayapura Counter Demo',
        agentType: 'STATION_COUNTER',
        stationId: 'ref-st-djj',
        commissionBasisPoints: 0,
        contactPerson: 'Jayapura Counter Desk',
        phone: '+62-812-0000-2001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-agent-wmx-counter',
        agentCode: 'WMX_COUNTER_DEMO',
        agentName: 'Wamena Counter Demo',
        agentType: 'STATION_COUNTER',
        stationId: 'ref-st-wmx',
        commissionBasisPoints: 0,
        contactPerson: 'Wamena Counter Desk',
        phone: '+62-812-0000-2002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-agent-papua-cargo',
        agentCode: 'PAPUA_CARGO_AGENT',
        agentName: 'Papua Cargo Agent Demo',
        agentType: 'CARGO_AGENT',
        stationId: 'ref-st-djj',
        commissionBasisPoints: 500,
        contactPerson: 'Cargo Agent Desk',
        phone: '+62-812-0000-2003',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refVendors)
    .values([
      {
        id: 'ref-vendor-accommodation-djj',
        vendorCode: 'VEND_ACCOM_DJJ',
        vendorName: 'Vendor Akomodasi Jayapura Demo',
        vendorType: 'ACCOMMODATION',
        stationId: 'ref-st-djj',
        contactPerson: 'Hotel Desk Demo',
        phone: '+62-812-0000-3001',
        email: 'hotel@jayapura.demo',
        paymentTermId: 'ref-term-net-14',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-vendor-transport-wmx',
        vendorCode: 'VEND_TRANSPORT_WMX',
        vendorName: 'Vendor Transport Wamena Demo',
        vendorType: 'TRANSPORT',
        stationId: 'ref-st-wmx',
        contactPerson: 'Transport Desk Demo',
        phone: '+62-812-0000-3002',
        email: 'transport@wamena.demo',
        paymentTermId: 'ref-term-net-7',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-vendor-maintenance',
        vendorCode: 'VEND_MAINT_SUPPORT',
        vendorName: 'Vendor Maintenance Support Demo',
        vendorType: 'MAINTENANCE',
        stationId: null,
        contactPerson: 'Maintenance Desk Demo',
        phone: '+62-812-0000-3003',
        email: 'maintenance@support.demo',
        paymentTermId: 'ref-term-net-30',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refFuelSuppliers)
    .values([
      {
        id: 'ref-fuel-pertamina-djj',
        supplierCode: 'FUEL_DJJ_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - DJJ',
        stationId: 'ref-st-djj',
        fuelType: 'AVTUR',
        referencePricePerLitre: 18500,
        currencyId: 'ref-cur-idr',
        contactPerson: 'Fuel Desk DJJ Demo',
        phone: '+62-812-0000-4001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-fuel-pertamina-tim',
        supplierCode: 'FUEL_TIM_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - TIM',
        stationId: 'ref-st-tim',
        fuelType: 'AVTUR',
        referencePricePerLitre: 19200,
        currencyId: 'ref-cur-idr',
        contactPerson: 'Fuel Desk TIM Demo',
        phone: '+62-812-0000-4002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-fuel-pertamina-wmx',
        supplierCode: 'FUEL_WMX_MOCK',
        supplierName: 'Pertamina Aviation Fuel Mock - WMX',
        stationId: 'ref-st-wmx',
        fuelType: 'AVTUR',
        referencePricePerLitre: 20500,
        currencyId: 'ref-cur-idr',
        contactPerson: 'Fuel Desk WMX Demo',
        phone: '+62-812-0000-4003',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refStationServiceSuppliers)
    .values([
      {
        id: 'ref-hp-angkasa-djj',
        supplierCode: 'HANDLING_DJJ_MOCK',
        supplierName: 'Angkasa Pura Handling Mock - DJJ',
        stationId: 'ref-st-djj',
        serviceType: 'BOTH',
        referenceRate: 2750000,
        currencyId: 'ref-cur-idr',
        contactPerson: 'Handling Desk DJJ Demo',
        phone: '+62-812-0000-5001',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-hp-angkasa-tim',
        supplierCode: 'HANDLING_TIM_MOCK',
        supplierName: 'Angkasa Pura Handling Mock - TIM',
        stationId: 'ref-st-tim',
        serviceType: 'HANDLING',
        referenceRate: 3100000,
        currencyId: 'ref-cur-idr',
        contactPerson: 'Handling Desk TIM Demo',
        phone: '+62-812-0000-5002',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refRateCards)
    .values([
      {
        id: 'ref-rate-charter-djj-wmx',
        rateCode: 'CHARTER_DJJ_WMX',
        serviceType: 'CHARTER',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: 'ref-cust-papua-logistics',
        aircraftType: 'Pilatus PC-6',
        currencyId: 'ref-cur-idr',
        baseRate: 78500000,
        rateUnit: 'PER_FLIGHT',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-passenger-djj-wmx',
        rateCode: 'PAX_DJJ_WMX',
        serviceType: 'PASSENGER',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 1800000,
        rateUnit: 'PER_PASSENGER',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-cargo-djj-wmx',
        rateCode: 'CARGO_DJJ_WMX_KG',
        serviceType: 'CARGO',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 32000,
        rateUnit: 'PER_KG',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-passenger-djj-tim',
        rateCode: 'PAX_DJJ_TIM',
        serviceType: 'PASSENGER',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-tim',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 2200000,
        rateUnit: 'PER_PASSENGER',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-cargo-djj-tim',
        rateCode: 'CARGO_DJJ_TIM_KG',
        serviceType: 'CARGO',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-tim',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 38000,
        rateUnit: 'PER_KG',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-passenger-tim-wmx',
        rateCode: 'PAX_TIM_WMX',
        serviceType: 'PASSENGER',
        originStationId: 'ref-st-tim',
        destinationStationId: 'ref-st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 1900000,
        rateUnit: 'PER_PASSENGER',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-cargo-tim-wmx',
        rateCode: 'CARGO_TIM_WMX_KG',
        serviceType: 'CARGO',
        originStationId: 'ref-st-tim',
        destinationStationId: 'ref-st-wmx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 34000,
        rateUnit: 'PER_KG',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-passenger-wmx-oks',
        rateCode: 'PAX_WMX_OKS',
        serviceType: 'PASSENGER',
        originStationId: 'ref-st-wmx',
        destinationStationId: 'ref-st-oks',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 1200000,
        rateUnit: 'PER_PASSENGER',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-cargo-wmx-oks',
        rateCode: 'CARGO_WMX_OKS_KG',
        serviceType: 'CARGO',
        originStationId: 'ref-st-wmx',
        destinationStationId: 'ref-st-oks',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 22000,
        rateUnit: 'PER_KG',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-passenger-djj-nbx',
        rateCode: 'PAX_DJJ_NBX',
        serviceType: 'PASSENGER',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-nbx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 2100000,
        rateUnit: 'PER_PASSENGER',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-cargo-djj-nbx',
        rateCode: 'CARGO_DJJ_NBX_KG',
        serviceType: 'CARGO',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-nbx',
        customerId: null,
        aircraftType: null,
        currencyId: 'ref-cur-idr',
        baseRate: 36000,
        rateUnit: 'PER_KG',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-rate-charter-tim-wmx',
        rateCode: 'CHARTER_TIM_WMX',
        serviceType: 'CHARTER',
        originStationId: 'ref-st-tim',
        destinationStationId: 'ref-st-wmx',
        customerId: 'ref-cust-mission-air',
        aircraftType: 'Cessna Caravan 208B',
        currencyId: 'ref-cur-idr',
        baseRate: 92000000,
        rateUnit: 'PER_FLIGHT',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refTaxCodes)
    .values([
      {
        id: 'ref-tax-non-tax',
        taxCode: 'NON_TAX',
        taxName: 'Non Tax Demo',
        taxRateBasisPoints: 0,
        taxType: 'NON_TAX',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-tax-ppn-demo',
        taxCode: 'PPN_DEMO',
        taxName: 'PPN Demo Placeholder',
        taxRateBasisPoints: 1100,
        taxType: 'VAT',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-tax-withholding-demo',
        taxCode: 'WITHHOLDING_DEMO',
        taxName: 'Withholding Demo Placeholder',
        taxRateBasisPoints: 200,
        taxType: 'WITHHOLDING',
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(refDgCategories)
    .values([
      {
        id: 'ref-dg-gen',
        dgCode: 'DG-GEN',
        dgClass: 'GENERAL',
        description: 'General dangerous goods demo category.',
        handlingInstruction: 'Demo review required before acceptance.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-dg-bat',
        dgCode: 'DG-BAT',
        dgClass: 'BATTERY',
        description: 'Battery cargo demo category.',
        handlingInstruction: 'Confirm packaging and state of charge in demo manifest.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-dg-fl',
        dgCode: 'DG-FL',
        dgClass: 'FLAMMABLE',
        description: 'Flammable goods demo category.',
        handlingInstruction: 'Hold for simulated DG approval.',
        requiresSpecialApproval: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ref-dg-med',
        dgCode: 'DG-MED',
        dgClass: 'MEDICAL',
        description: 'Medical cargo demo category.',
        handlingInstruction: 'Validate demo documentation before loading.',
        requiresSpecialApproval: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(aircraft)
    .values([
      {
        id: 'ac-pilatus-001',
        tailNumber: 'PK-LUM',
        type: 'Pilatus PC-6 Porter',
        displayName: 'Pilatus PC-6 Porter placeholder',
        capacity: 10,
        status: 'available'
      },
      {
        id: 'ac-caravan-001',
        tailNumber: 'PK-AMA',
        type: 'Cessna 208B Grand Caravan',
        displayName: 'Caravan placeholder',
        capacity: 12,
        status: 'available'
      },
      {
        id: 'ac-pac-001',
        tailNumber: 'PK-RMB',
        type: 'PAC P-750 XSTOL',
        displayName: 'PAC placeholder',
        capacity: 9,
        status: 'in_maintenance'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(stations)
    .values([
      {
        id: 'st-sentani',
        code: 'WAJJ',
        name: 'Sentani Station',
        province: 'Papua',
        isActive: true
      },
      {
        id: 'st-wamena',
        code: 'WAVV',
        name: 'Wamena Station',
        province: 'Papua Pegunungan',
        isActive: true
      },
      {
        id: 'st-timika',
        code: 'WABP',
        name: 'Timika Station',
        province: 'Papua Tengah',
        isActive: true
      },
      {
        id: 'st-merauke',
        code: 'WAKK',
        name: 'Merauke Station',
        province: 'Papua Selatan',
        isActive: true
      },
      {
        id: 'st-sorong',
        code: 'WASS',
        name: 'Sorong Station',
        province: 'Papua Barat Daya',
        isActive: true
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(routes)
    .values([
      {
        id: 'rt-sentani-wamena',
        originStationId: 'st-sentani',
        destinationStationId: 'st-wamena',
        distanceNm: 136,
        estimatedBlockMinutes: 55
      },
      {
        id: 'rt-wamena-sentani',
        originStationId: 'st-wamena',
        destinationStationId: 'st-sentani',
        distanceNm: 136,
        estimatedBlockMinutes: 58
      },
      {
        id: 'rt-timika-merauke',
        originStationId: 'st-timika',
        destinationStationId: 'st-merauke',
        distanceNm: 342,
        estimatedBlockMinutes: 135
      },
      {
        id: 'rt-sorong-sentani',
        originStationId: 'st-sorong',
        destinationStationId: 'st-sentani',
        distanceNm: 615,
        estimatedBlockMinutes: 210
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(customers)
    .values([
      {
        id: 'cu-yayasan-lentera',
        name: 'Yayasan Lentera Papua',
        type: 'charter',
        contactEmail: 'ops@y-lentera.example'
      },
      {
        id: 'cu-dinkes-mamberamo',
        name: 'Dinas Kesehatan Mamberamo',
        type: 'medevac',
        contactEmail: 'dispatch@dinkes-mamberamo.example'
      },
      {
        id: 'cu-pt-kargo-timur',
        name: 'PT Kargo Timur Mandiri',
        type: 'cargo',
        contactEmail: 'accounting@kargotimur.example'
      },
      {
        id: 'cu-bpbd-papua',
        name: 'BPBD Papua Support Desk',
        type: 'government',
        contactEmail: 'airdesk@bpbd-papua.example'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(flightOrders)
    .values([
      {
        id: 'fo-ama-260704-001',
        flightNumber: 'AMA401',
        orderNumber: 'AMA-FO-2026-0704-001',
        customerId: 'cu-yayasan-lentera',
        routeId: 'rt-sentani-wamena',
        aircraftId: 'ac-caravan-001',
        status: 'completed',
        scheduledDeparture: '2026-07-04T10:15:00.000+07:00',
        scheduledArrival: '2026-07-04T11:10:00.000+07:00',
        purpose: 'Community supply and passenger charter',
        quotedAmount: 78500000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260704-002',
        flightNumber: 'AMA217',
        orderNumber: 'AMA-FO-2026-0704-002',
        customerId: 'cu-dinkes-mamberamo',
        routeId: 'rt-wamena-sentani',
        aircraftId: 'ac-pilatus-001',
        status: 'completed',
        scheduledDeparture: '2026-07-04T12:40:00.000+07:00',
        scheduledArrival: '2026-07-04T13:38:00.000+07:00',
        purpose: 'Medevac return leg with clinical escort',
        quotedAmount: 62000000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260705-003',
        flightNumber: 'AMA688',
        orderNumber: 'AMA-FO-2026-0705-003',
        customerId: 'cu-pt-kargo-timur',
        routeId: 'rt-timika-merauke',
        aircraftId: 'ac-caravan-001',
        status: 'completed',
        scheduledDeparture: '2026-07-05T08:30:00.000+07:00',
        scheduledArrival: '2026-07-05T10:45:00.000+07:00',
        purpose: 'High-priority cargo movement',
        quotedAmount: 112000000,
        currency: 'IDR'
      },
      {
        id: 'fo-ama-260703-004',
        flightNumber: 'AMA909',
        orderNumber: 'AMA-FO-2026-0703-004',
        customerId: 'cu-bpbd-papua',
        routeId: 'rt-sorong-sentani',
        aircraftId: 'ac-pilatus-001',
        status: 'completed',
        scheduledDeparture: '2026-07-03T07:20:00.000+07:00',
        scheduledArrival: '2026-07-03T10:50:00.000+07:00',
        purpose: 'Relief coordination flight',
        quotedAmount: 148000000,
        currency: 'IDR'
      }
    ])
    .onConflictDoUpdate({
      target: flightOrders.id,
      set: { status: sql`excluded.status` }
    });

  await db
    .insert(manifests)
    .values([
      {
        id: 'mn-001-a',
        flightOrderId: 'fo-ama-260704-001',
        passengerName: 'Maya Rumbiak',
        documentNumber: 'KTP-927101-001',
        seatNumber: '1A',
        weightKg: 62,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"PAID","checkInStatus":"CHECKED_IN","createdAt":"2026-07-04T09:00:00.000Z"}'
      },
      {
        id: 'mn-001-b',
        flightOrderId: 'fo-ama-260704-001',
        passengerName: 'Jonas Kogoya',
        documentNumber: 'KTP-950201-332',
        seatNumber: '1B',
        weightKg: 74,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"UNPAID","checkInStatus":"PENDING","createdAt":"2026-07-04T09:00:00.000Z"}'
      },
      {
        id: 'mn-002-a',
        flightOrderId: 'fo-ama-260704-002',
        passengerName: 'Patient MED-2407',
        documentNumber: 'MED-CASE-2407',
        seatNumber: 'MED',
        weightKg: 58,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"PAID","checkInStatus":"PENDING","createdAt":"2026-07-04T09:00:00.000Z"}'
      },
      {
        id: 'mn-002-b',
        flightOrderId: 'fo-ama-260704-002',
        passengerName: 'Nurse Adelina Waromi',
        documentNumber: 'STR-77822',
        seatNumber: '2A',
        weightKg: 55,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"PAID","checkInStatus":"CHECKED_IN","createdAt":"2026-07-04T09:00:00.000Z"}'
      },
      {
        id: 'TKT-DEMO12',
        flightOrderId: 'fo-ama-260704-001',
        passengerName: 'Sarah Wenda',
        documentNumber: 'KTP-930401-443',
        seatNumber: '2B',
        weightKg: 65,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"PAID","checkInStatus":"PENDING","createdAt":"2026-07-04T09:10:00.000Z"}'
      },
      {
        id: 'TKT-DEMO34',
        flightOrderId: 'fo-ama-260704-002',
        passengerName: 'Alex Giai',
        documentNumber: 'KTP-912201-112',
        seatNumber: '3C',
        weightKg: 78,
        remarks:
          '{"ticketPrice":1800000,"paymentStatus":"UNPAID","checkInStatus":"PENDING","createdAt":"2026-07-04T09:15:00.000Z"}'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(cargoBookings)
    .values([
      {
        id: 'AWB-100200',
        senderName: 'Koperasi Kopi Wamena',
        receiverName: 'Toko Kopi Sentani',
        flightOrderId: 'fo-ama-260704-001',
        actualWeightKg: 45,
        lengthCm: 40,
        widthCm: 40,
        heightCm: 40,
        isDangerous: false,
        dgClass: null,
        paymentMethod: 'TRANSFER',
        paymentStatus: 'PAID',
        agentId: 'ref-ag-papua-cargo',
        totalTariff: 1440000,
        status: 'BOOKED',
        createdAt: '2026-07-04T09:00:00.000Z'
      },
      {
        id: 'AWB-300400',
        senderName: 'CV Papua Logistik Mandiri',
        receiverName: 'Ibu Maria Jayapura',
        flightOrderId: 'fo-ama-260704-002',
        actualWeightKg: 12,
        lengthCm: 30,
        widthCm: 30,
        heightCm: 30,
        isDangerous: true,
        dgClass: 'Class 9 - Lithium Batteries',
        paymentMethod: 'CASH',
        paymentStatus: 'UNPAID',
        agentId: null,
        totalTariff: 384000,
        status: 'BOOKED',
        createdAt: '2026-07-04T09:30:00.000Z'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(fuelRequests)
    .values([
      {
        id: 'fr-001',
        flightOrderId: 'fo-ama-260704-001',
        stationId: 'st-sentani',
        aircraftId: 'ac-caravan-001',
        requestedLiters: 780,
        status: 'approved',
        requestedBy: 'OCC Desk',
        requiredAt: '2026-07-04T09:45:00.000+07:00',
        notes: 'Top-off before mountain sector'
      },
      {
        id: 'fr-002',
        flightOrderId: 'fo-ama-260704-002',
        stationId: 'st-wamena',
        aircraftId: 'ac-pilatus-001',
        requestedLiters: 420,
        status: 'requested',
        requestedBy: 'Wamena Station Admin',
        requiredAt: '2026-07-04T12:00:00.000+07:00',
        notes: 'Supplier confirmation pending'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(fuelUplifts)
    .values([
      {
        id: 'fu-001',
        fuelRequestId: 'fr-001',
        supplier: 'PT Avtur Papua Sentani',
        liters: 760,
        unitPrice: 18350,
        total: 13946000,
        currency: 'IDR',
        upliftedAt: '2026-07-04T09:30:00.000+07:00',
        receiptPath: '/uploads/mock-receipts/sentani-fuel-fr-001.txt'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(stationExpenses)
    .values([
      {
        id: 'se-001',
        stationId: 'st-wamena',
        flightOrderId: 'fo-ama-260704-002',
        category: 'handling',
        description: 'Ground handling and stretcher positioning support',
        amount: 2750000,
        currency: 'IDR',
        status: 'submitted',
        receiptPath: '/uploads/mock-receipts/wamena-handling-se-001.txt',
        incurredAt: '2026-07-04T11:15:00.000+07:00',
        submittedBy: 'Wamena Station Admin'
      },
      {
        id: 'se-002',
        stationId: 'st-sentani',
        flightOrderId: 'fo-ama-260704-001',
        category: 'catering',
        description: 'Crew meal packs for delayed departure window',
        amount: 640000,
        currency: 'IDR',
        status: 'approved',
        receiptPath: null,
        incurredAt: '2026-07-04T08:25:00.000+07:00',
        submittedBy: 'Sentani Station Admin'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(maintenanceWorkOrders)
    .values([
      {
        id: 'mwo-001',
        aircraftId: 'ac-pac-001',
        title: 'Prop governor vibration inspection',
        description:
          'Pilot reported vibration during taxi run. Inspect governor and mounting hardware.',
        priority: 'high',
        status: 'in_progress',
        openedAt: '2026-07-03T15:40:00.000+07:00',
        closedAt: null,
        dueAt: '2026-07-05T18:00:00.000+07:00'
      },
      {
        id: 'mwo-002',
        aircraftId: 'ac-caravan-001',
        title: '50-hour cabin and tire inspection',
        description: 'Routine inspection before next cargo rotation.',
        priority: 'normal',
        status: 'open',
        openedAt: '2026-07-04T07:00:00.000+07:00',
        closedAt: null,
        dueAt: '2026-07-06T17:00:00.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(serializedParts)
    .values([
      {
        id: 'sp-001',
        aircraftId: 'ac-pac-001',
        partNumber: 'PT6A-FCU-014',
        serialNumber: 'FCU-P750-8821',
        description: 'Fuel control unit',
        status: 'quarantined',
        installedAt: null,
        workOrderId: 'mwo-001'
      },
      {
        id: 'sp-002',
        aircraftId: 'ac-caravan-001',
        partNumber: 'C208-TIRE-6006',
        serialNumber: 'TIRE-C208-4410',
        description: 'Main tire assembly',
        status: 'available',
        installedAt: null,
        workOrderId: 'mwo-002'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(invoices)
    .values([
      {
        id: 'inv-001',
        customerId: 'cu-yayasan-lentera',
        flightOrderId: 'fo-ama-260704-001',
        invoiceNumber: 'AMA-INV-2026-0704-001',
        status: 'issued',
        subtotal: 78500000,
        tax: 8635000,
        total: 87135000,
        currency: 'IDR',
        issuedAt: '2026-07-04T08:00:00.000+07:00',
        dueAt: '2026-07-18T23:59:59.000+07:00'
      },
      {
        id: 'inv-002',
        customerId: 'cu-bpbd-papua',
        flightOrderId: 'fo-ama-260703-004',
        invoiceNumber: 'AMA-INV-2026-0703-004',
        status: 'partially_paid',
        subtotal: 148000000,
        tax: 16280000,
        total: 164280000,
        currency: 'IDR',
        issuedAt: '2026-07-03T13:30:00.000+07:00',
        dueAt: '2026-07-17T23:59:59.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(payments)
    .values([
      {
        id: 'pay-001',
        invoiceId: 'inv-002',
        amount: 64000000,
        currency: 'IDR',
        paidAt: '2026-07-04T08:45:00.000+07:00',
        method: 'bank_transfer',
        reference: 'BPD-TRF-0704-8841'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(approvals)
    .values([
      {
        id: 'ap-001',
        domainEntity: 'fuel_request',
        entityId: 'fr-002',
        requestedBy: 'Wamena Station Admin',
        roleRequired: 'Director',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
        reason: null,
        createdAt: '2026-07-04T08:50:00.000+07:00'
      },
      {
        id: 'ap-002',
        domainEntity: 'station_expense',
        entityId: 'se-001',
        requestedBy: 'Wamena Station Admin',
        roleRequired: 'Director',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
        reason: null,
        createdAt: '2026-07-04T08:55:00.000+07:00'
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(alerts)
    .values([
      {
        id: 'al-001',
        severity: 'warning',
        title: 'Fuel approval pending',
        message: 'Wamena uplift request FR-002 needs director approval before noon.',
        entityType: 'fuel_request',
        entityId: 'fr-002',
        isRead: false,
        createdAt: now
      },
      {
        id: 'al-002',
        severity: 'critical',
        title: 'PAC aircraft in maintenance',
        message: 'PK-RMB remains unavailable until prop governor inspection is cleared.',
        entityType: 'maintenance_work_order',
        entityId: 'mwo-001',
        isRead: false,
        createdAt: '2026-07-04T08:20:00.000+07:00'
      },
      {
        id: 'al-003',
        severity: 'info',
        title: 'Invoice issued',
        message: 'AMA-INV-2026-0704-001 sent to Yayasan Lentera Papua.',
        entityType: 'invoice',
        entityId: 'inv-001',
        isRead: false,
        createdAt: '2026-07-04T08:05:00.000+07:00'
      }
    ])
    .onConflictDoNothing();
}
