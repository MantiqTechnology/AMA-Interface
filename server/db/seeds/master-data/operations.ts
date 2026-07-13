import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../client';
import {
  stations,
  aircraft,
  crews,
  routes,
  flightScheduleTemplates,
  flightCapacityProfiles,
  flightReasons
} from '../../schema/operations';

const referenceNow = '2026-07-07T09:00:00.000+07:00';

export async function seedOperationsMasterData(db: AppDatabase) {
  await db
    .insert(stations)
    .values([
      {
        id: 'st-djj',
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
        id: 'st-wmx',
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
        id: 'st-tim',
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
        id: 'st-nbx',
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
        id: 'st-oks',
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
        id: 'st-dex',
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
      },
      {
        id: 'st-mkq',
        stationCode: 'MKQ',
        stationName: 'Merauke Demo Station',
        cityOrRegion: 'Merauke',
        province: 'Papua Selatan',
        airportType: 'AIRPORT',
        hasFuelService: true,
        hasHandlingService: true,
        hasParkingService: true,
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
        id: 'ac-pk-ama',
        registrationNumber: 'PK-AMA',
        serialNumber: 'PC6-AMA-DEMO',
        aircraftType: 'Pilatus PC-6',
        manufacturer: 'Pilatus',
        model: 'PC-6 Porter Demo',
        fleetCode: 'PC6-01',
        passengerCapacity: 10,
        cargoCapacityKg: 1200,
        fuelType: 'AVTUR',
        operationalStatus: 'ACTIVE',
        serviceabilityStatus: 'SERVICEABLE',
        baseStationId: 'st-djj',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ac-pk-amb',
        registrationNumber: 'PK-AMB',
        serialNumber: '208B-AMB-DEMO',
        aircraftType: 'Cessna Caravan 208B',
        manufacturer: 'Cessna',
        model: 'Caravan 208B Demo',
        fleetCode: 'CVN-01',
        passengerCapacity: 12,
        cargoCapacityKg: 1400,
        fuelType: 'AVTUR',
        operationalStatus: 'ACTIVE',
        serviceabilityStatus: 'SERVICEABLE',
        baseStationId: 'st-djj',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'ac-pk-amc',
        registrationNumber: 'PK-AMC',
        serialNumber: 'PAC-AMC-DEMO',
        aircraftType: 'PAC 750XL',
        manufacturer: 'Pacific Aerospace',
        model: 'PAC 750XL Demo',
        fleetCode: 'PAC-01',
        passengerCapacity: 9,
        cargoCapacityKg: 1000,
        fuelType: 'AVTUR',
        operationalStatus: 'ACTIVE',
        serviceabilityStatus: 'UNSERVICEABLE',
        baseStationId: 'st-wmx',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(crews)
    .values([
      {
        id: 'crew-pic-valid',
        employeeCode: 'AMA-PIC-001',
        fullName: 'Daniel Waromi Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-001',
        licenseExpiryDate: '2027-01-07',
        medicalExpiryDate: '2026-12-07',
        baseStationId: 'st-djj',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-pic-expiring',
        employeeCode: 'AMA-PIC-002',
        fullName: 'Mikael Kogoya Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-002',
        licenseExpiryDate: '2026-07-27',
        medicalExpiryDate: '2026-08-02',
        baseStationId: 'st-wmx',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-pic-expired',
        employeeCode: 'AMA-PIC-003',
        fullName: 'Yohanis Tabuni Demo',
        crewRole: 'PILOT_IN_COMMAND',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-PIC-003',
        licenseExpiryDate: '2026-06-25',
        medicalExpiryDate: '2026-06-30',
        baseStationId: 'st-tim',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-cop-valid',
        employeeCode: 'AMA-COP-001',
        fullName: 'Maria Numberi Demo',
        crewRole: 'CO_PILOT',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-COP-001',
        licenseExpiryDate: '2026-12-18',
        medicalExpiryDate: '2026-11-22',
        baseStationId: 'st-djj',
        unit: 'Flight Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-cop-valid-2',
        employeeCode: 'AMA-COP-002',
        fullName: 'Agus Yikwa Demo',
        crewRole: 'CO_PILOT',
        licenseType: 'CPL',
        licenseNumber: 'LIC-DEMO-COP-002',
        licenseExpiryDate: '2027-03-14',
        medicalExpiryDate: '2027-02-14',
        baseStationId: 'st-wmx',
        unit: 'Flight Operations',
        employmentStatus: 'CONTRACT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-ground-001',
        employeeCode: 'AMA-GRD-001',
        fullName: 'Rina Kambu Demo',
        crewRole: 'GROUND_CREW',
        licenseType: null,
        licenseNumber: null,
        licenseExpiryDate: null,
        medicalExpiryDate: null,
        baseStationId: 'st-djj',
        unit: 'Ground Operations',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'crew-ops-001',
        employeeCode: 'AMA-OPS-001',
        fullName: 'Samuel Itlay Demo',
        crewRole: 'FLIGHT_OPERATIONS',
        licenseType: null,
        licenseNumber: null,
        licenseExpiryDate: null,
        medicalExpiryDate: null,
        baseStationId: 'st-tim',
        unit: 'OCC',
        employmentStatus: 'PERMANENT',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(routes)
    .values([
      {
        id: 'route-djj-wmx',
        routeCode: 'DJJ-WMX',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        estimatedDurationMinutes: 55,
        distanceKm: 250,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-djj-tim',
        routeCode: 'DJJ-TIM',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        estimatedDurationMinutes: 95,
        distanceKm: 456,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-tim-wmx',
        routeCode: 'TIM-WMX',
        originStationId: 'st-tim',
        destinationStationId: 'st-wmx',
        estimatedDurationMinutes: 70,
        distanceKm: 318,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-wmx-oks',
        routeCode: 'WMX-OKS',
        originStationId: 'st-wmx',
        destinationStationId: 'st-oks',
        estimatedDurationMinutes: 35,
        distanceKm: 118,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-djj-nbx',
        routeCode: 'DJJ-NBX',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        estimatedDurationMinutes: 80,
        distanceKm: 390,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-tim-dex',
        routeCode: 'TIM-DEX',
        originStationId: 'st-tim',
        destinationStationId: 'st-dex',
        estimatedDurationMinutes: 85,
        distanceKm: 360,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-nbx-wmx',
        routeCode: 'NBX-WMX',
        originStationId: 'st-nbx',
        destinationStationId: 'st-wmx',
        estimatedDurationMinutes: 75,
        distanceKm: 285,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'route-mkq-djj',
        routeCode: 'MKQ-DJJ',
        originStationId: 'st-mkq',
        destinationStationId: 'st-djj',
        estimatedDurationMinutes: 125,
        distanceKm: 650,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(flightScheduleTemplates)
    .values([
      {
        id: 'schedule-djj-wmx-mwf',
        templateCode: 'SCH_DJJ_WMX_MWF',
        routeId: 'route-djj-wmx',
        serviceTypeId: 'flight-service-type-scheduled-passenger',
        defaultAircraftId: 'ac-pk-ama',
        operatingDays: 'MON,WED,FRI',
        departureTimeLocal: '07:30',
        arrivalTimeLocal: '08:25',
        bookingOpenHoursBefore: 168,
        bookingCloseMinutesBefore: 90,
        scheduleNote: 'Passenger-heavy morning rotation for counter/ticketing preview.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'schedule-tim-dex-tuethu',
        templateCode: 'SCH_TIM_DEX_TUE_THU',
        routeId: 'route-tim-dex',
        serviceTypeId: 'flight-service-type-charter-cargo',
        defaultAircraftId: 'ac-pk-amb',
        operatingDays: 'TUE,THU',
        departureTimeLocal: '09:15',
        arrivalTimeLocal: '10:40',
        bookingOpenHoursBefore: 96,
        bookingCloseMinutesBefore: 120,
        scheduleNote: 'Cargo-heavy STOL support template for future cargo demo.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'schedule-nbx-wmx-sat',
        templateCode: 'SCH_NBX_WMX_SAT',
        routeId: 'route-nbx-wmx',
        serviceTypeId: 'flight-service-type-charter-passenger',
        defaultAircraftId: 'ac-pk-amc',
        operatingDays: 'SAT',
        departureTimeLocal: '11:00',
        arrivalTimeLocal: '12:15',
        bookingOpenHoursBefore: 72,
        bookingCloseMinutesBefore: 60,
        scheduleNote: 'Weekend charter passenger template for readiness preview.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'schedule-mkq-djj-sun',
        templateCode: 'SCH_MKQ_DJJ_SUN',
        routeId: 'route-mkq-djj',
        serviceTypeId: 'flight-service-type-positioning',
        defaultAircraftId: 'ac-pk-amb',
        operatingDays: 'SUN',
        departureTimeLocal: '13:45',
        arrivalTimeLocal: '15:50',
        bookingOpenHoursBefore: 48,
        bookingCloseMinutesBefore: 45,
        scheduleNote: 'Positioning return template for operations visibility only.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(flightCapacityProfiles)
    .values([
      {
        id: 'cap-pilatus-djj-wmx-pax',
        profileCode: 'CAP_PC6_DJJ_WMX_PAX',
        profileName: 'Pilatus DJJ-WMX Passenger Standard',
        aircraftId: 'ac-pk-ama',
        routeId: 'route-djj-wmx',
        serviceTypeId: 'flight-service-type-scheduled-passenger',
        seatCapacity: 8,
        cargoCapacityKg: 250,
        reservedSeatCount: 1,
        reservedCargoKg: 50,
        capacityNote: 'Passenger-heavy profile with one operational seat reserved.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cap-caravan-tim-dex-cargo',
        profileCode: 'CAP_C208_TIM_DEX_CARGO',
        profileName: 'Caravan TIM-DEX Cargo Heavy',
        aircraftId: 'ac-pk-amb',
        routeId: 'route-tim-dex',
        serviceTypeId: 'flight-service-type-charter-cargo',
        seatCapacity: 4,
        cargoCapacityKg: 1050,
        reservedSeatCount: 1,
        reservedCargoKg: 150,
        capacityNote: 'Cargo-heavy profile for STOL station supply runs.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'cap-pac-nbx-wmx-charter',
        profileCode: 'CAP_PAC_NBX_WMX_CHARTER',
        profileName: 'PAC NBX-WMX Charter Balanced',
        aircraftId: 'ac-pk-amc',
        routeId: 'route-nbx-wmx',
        serviceTypeId: 'flight-service-type-charter-passenger',
        seatCapacity: 9,
        cargoCapacityKg: 450,
        reservedSeatCount: 0,
        reservedCargoKg: 75,
        capacityNote: 'Balanced charter profile for passenger and light cargo.',
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      }
    ])
    .onConflictDoNothing();

  await db
    .insert(flightReasons)
    .values([
      {
        id: 'reason-weather',
        reasonCode: 'WEATHER',
        reasonName: 'Weather below minimum',
        reasonType: 'DELAY',
        category: 'Operational',
        description: 'Weather below demo operating minimum.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-technical',
        reasonCode: 'TECHNICAL',
        reasonName: 'Technical inspection required',
        reasonType: 'DELAY',
        category: 'Maintenance',
        description: 'Technical inspection or rectification required.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-crew',
        reasonCode: 'CREW_UNAVAILABLE',
        reasonName: 'Crew unavailable',
        reasonType: 'CANCELLED',
        category: 'Crew',
        description: 'Required crew member unavailable for duty.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-airport',
        reasonCode: 'AIRPORT_RESTRICTION',
        reasonName: 'Station restriction',
        reasonType: 'DIVERTED',
        category: 'Station',
        description: 'Origin or destination station restriction.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-operational',
        reasonCode: 'OPERATIONAL',
        reasonName: 'Operational sequencing issue',
        reasonType: 'DELAY',
        category: 'Operational',
        description: 'Operational sequencing or resource constraint.',
        requiresNote: false,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-customer-request',
        reasonCode: 'CUSTOMER_REQUEST',
        reasonName: 'Customer requested change',
        reasonType: 'CANCELLED',
        category: 'Commercial',
        description: 'Customer requested cancellation or movement change.',
        requiresNote: true,
        isActive: true,
        createdAt: referenceNow,
        updatedAt: referenceNow
      },
      {
        id: 'reason-data-correction',
        reasonCode: 'DATA_CORRECTION',
        reasonName: 'Record correction',
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

  for (const station of [
    {
      id: 'st-djj',
      stationPicName: 'OCC Jayapura Demo',
      stationPicPhone: '+62-812-0000-2001',
      operationalNotes: 'Primary hub for demo dispatch, fuel, counter, and handling coordination.',
      isRemoteStation: false,
      lowConnectivityMode: false
    },
    {
      id: 'st-wmx',
      stationPicName: 'Wamena Station Lead Demo',
      stationPicPhone: '+62-812-0000-2002',
      operationalNotes: 'Highland station with weather and payload review before dispatch.',
      isRemoteStation: true,
      lowConnectivityMode: true
    },
    {
      id: 'st-tim',
      stationPicName: 'Timika Ops Desk Demo',
      stationPicPhone: '+62-812-0000-2003',
      operationalNotes: 'Secondary hub for passenger, cargo, and mission support demo flow.',
      isRemoteStation: false,
      lowConnectivityMode: false
    },
    {
      id: 'st-nbx',
      stationPicName: 'Nabire Counter Demo',
      stationPicPhone: '+62-812-0000-2004',
      operationalNotes: 'Counter and handling available; fuel service requires planning.',
      isRemoteStation: true,
      lowConnectivityMode: true
    },
    {
      id: 'st-oks',
      stationPicName: 'Oksibil Field PIC Demo',
      stationPicPhone: '+62-812-0000-2005',
      operationalNotes:
        'Remote airstrip for readiness blocker and low-connectivity demo scenarios.',
      isRemoteStation: true,
      lowConnectivityMode: true
    },
    {
      id: 'st-dex',
      stationPicName: 'Dekai Field PIC Demo',
      stationPicPhone: '+62-812-0000-2006',
      operationalNotes: 'STOL airfield with manual confirmation and limited station services.',
      isRemoteStation: true,
      lowConnectivityMode: true
    },
    {
      id: 'st-mkq',
      stationPicName: 'Merauke Station Lead Demo',
      stationPicPhone: '+62-812-0000-2007',
      operationalNotes: 'Southern Papua station available for future P0 route expansion.',
      isRemoteStation: false,
      lowConnectivityMode: false
    }
  ]) {
    await db
      .update(stations)
      .set({
        stationPicName: station.stationPicName,
        stationPicPhone: station.stationPicPhone,
        operationalNotes: station.operationalNotes,
        isRemoteStation: station.isRemoteStation,
        lowConnectivityMode: station.lowConnectivityMode,
        updatedAt: referenceNow
      })
      .where(eq(stations.id, station.id));
  }

  for (const aircraftRecord of [
    {
      id: 'ac-pk-ama',
      currentStationId: 'st-djj',
      lastMaintenanceCheckAt: '2026-07-01',
      nextMaintenanceDueAt: '2026-08-15',
      serviceabilityNote: 'Serviceable and positioned at DJJ for the main Flight Order happy path.'
    },
    {
      id: 'ac-pk-amb',
      currentStationId: 'st-tim',
      lastMaintenanceCheckAt: '2026-06-28',
      nextMaintenanceDueAt: '2026-07-20',
      serviceabilityNote:
        'Serviceable; current station differs from DJJ to demonstrate positioning review.'
    },
    {
      id: 'ac-pk-amc',
      currentStationId: 'st-wmx',
      lastMaintenanceCheckAt: '2026-06-14',
      nextMaintenanceDueAt: '2026-07-06',
      serviceabilityNote: 'Unserviceable demo aircraft for maintenance blocker scenarios.'
    }
  ]) {
    await db
      .update(aircraft)
      .set({
        currentStationId: aircraftRecord.currentStationId,
        lastMaintenanceCheckAt: aircraftRecord.lastMaintenanceCheckAt,
        nextMaintenanceDueAt: aircraftRecord.nextMaintenanceDueAt,
        serviceabilityNote: aircraftRecord.serviceabilityNote,
        updatedAt: referenceNow
      })
      .where(eq(aircraft.id, aircraftRecord.id));
  }

  for (const crew of [
    {
      id: 'crew-pic-valid',
      availabilityStatus: 'AVAILABLE',
      dutyStationId: 'st-djj',
      readinessNote: 'Available PIC for the main DJJ readiness pass scenario.'
    },
    {
      id: 'crew-pic-expiring',
      availabilityStatus: 'AVAILABLE',
      dutyStationId: 'st-wmx',
      readinessNote: 'Available but based at WMX; positioning review may be needed.'
    },
    {
      id: 'crew-pic-expired',
      availabilityStatus: 'UNAVAILABLE',
      dutyStationId: 'st-tim',
      readinessNote: 'Unavailable because license and medical documents are expired.'
    },
    {
      id: 'crew-cop-valid',
      availabilityStatus: 'AVAILABLE',
      dutyStationId: 'st-djj',
      readinessNote: 'Available co-pilot for the main DJJ readiness pass scenario.'
    },
    {
      id: 'crew-cop-valid-2',
      availabilityStatus: 'ON_DUTY',
      dutyStationId: 'st-wmx',
      readinessNote: 'On duty at WMX to demonstrate crew availability blocker when selected.'
    },
    {
      id: 'crew-ground-001',
      availabilityStatus: 'AVAILABLE',
      dutyStationId: 'st-djj',
      readinessNote: 'Ground crew available for station support.'
    },
    {
      id: 'crew-ops-001',
      availabilityStatus: 'AVAILABLE',
      dutyStationId: 'st-tim',
      readinessNote: 'OCC personnel available for operational coordination.'
    }
  ]) {
    await db
      .update(crews)
      .set({
        availabilityStatus: crew.availabilityStatus,
        dutyStationId: crew.dutyStationId,
        readinessNote: crew.readinessNote,
        updatedAt: referenceNow
      })
      .where(eq(crews.id, crew.id));
  }

  for (const reason of [
    {
      id: 'reason-weather',
      affectsOperationalKpi: true,
      affectsFinanceReview: false,
      dashboardSeverity: 'WARNING'
    },
    {
      id: 'reason-technical',
      affectsOperationalKpi: true,
      affectsFinanceReview: true,
      dashboardSeverity: 'CRITICAL'
    },
    {
      id: 'reason-crew',
      affectsOperationalKpi: true,
      affectsFinanceReview: true,
      dashboardSeverity: 'CRITICAL'
    },
    {
      id: 'reason-airport',
      affectsOperationalKpi: true,
      affectsFinanceReview: false,
      dashboardSeverity: 'WARNING'
    },
    {
      id: 'reason-operational',
      affectsOperationalKpi: true,
      affectsFinanceReview: false,
      dashboardSeverity: 'WARNING'
    },
    {
      id: 'reason-customer-request',
      affectsOperationalKpi: false,
      affectsFinanceReview: true,
      dashboardSeverity: 'INFO'
    },
    {
      id: 'reason-data-correction',
      affectsOperationalKpi: false,
      affectsFinanceReview: false,
      dashboardSeverity: 'INFO'
    }
  ]) {
    await db
      .update(flightReasons)
      .set({
        affectsOperationalKpi: reason.affectsOperationalKpi,
        affectsFinanceReview: reason.affectsFinanceReview,
        dashboardSeverity: reason.dashboardSeverity,
        updatedAt: referenceNow
      })
      .where(eq(flightReasons.id, reason.id));
  }
}
