import type Database from 'better-sqlite3';
import { createDemoSeedContext, type DemoSeedContext } from './seeds/context';

type Row = Record<string, string | number | boolean | null>;

function insertIgnore(sqlite: Database.Database, table: string, row: Row) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
  const placeholders = keys.map((key) => `@${key}`);
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
    )
    .run(row);
}

function lookupId(prefix: string, code: string) {
  return `${prefix}-${code.toLowerCase().replaceAll('_', '-')}`;
}

function insertHistory(
  sqlite: Database.Database,
  context: DemoSeedContext,
  input: {
    id: string;
    flightId: string;
    fromStatus?: string | null;
    toStatus: string;
    actionType: string;
    reasonId?: string | null;
    reasonNote?: string | null;
    changedAt?: string;
    metadata?: Record<string, unknown> | null;
  }
) {
  insertIgnore(sqlite, 'flight_status_histories', {
    id: input.id,
    flightId: input.flightId,
    fromStatusId: input.fromStatus ? lookupId('flight-operation-status', input.fromStatus) : null,
    toStatusId: lookupId('flight-operation-status', input.toStatus),
    actionTypeId: lookupId('flight-action-type', input.actionType),
    reasonId: input.reasonId ?? null,
    reasonNote: input.reasonNote ?? null,
    changedByUserId: 'USR-ADMIN',
    changedAt: input.changedAt ?? context.now,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null
  });
}

function seedManifests(sqlite: Database.Database, context: DemoSeedContext, flightId: string) {
  insertIgnore(sqlite, 'flight_manifests', {
    id: `${flightId}-manifest-pax`,
    flightOperationId: flightId,
    manifestTypeId: 'manifest-type-passenger',
    statusId: 'manifest-status-approved',
    approvedByUserId: 'USR-ADMIN',
    approvedAt: context.now,
    lockedAt: flightId.includes('closed') ? context.at(-10, '10:30') : null,
    createdAt: context.now,
    updatedAt: context.now
  });
  insertIgnore(sqlite, 'flight_manifests', {
    id: `${flightId}-manifest-cargo`,
    flightOperationId: flightId,
    manifestTypeId: 'manifest-type-cargo',
    statusId: 'manifest-status-approved',
    approvedByUserId: 'USR-ADMIN',
    approvedAt: context.now,
    lockedAt: flightId.includes('closed') ? context.at(-10, '10:30') : null,
    createdAt: context.now,
    updatedAt: context.now
  });
}

function seedReadiness(
  sqlite: Database.Database,
  context: DemoSeedContext,
  flightId: string,
  overrides: Partial<Record<string, { status: string; note: string }>> = {}
) {
  const checks = [
    ['AIRCRAFT_SERVICEABILITY', 'Aircraft serviceability', 'PASS', 'Aircraft is serviceable'],
    ['AIRCRAFT_LOCATION', 'Aircraft location', 'PASS', 'Aircraft is at departure station'],
    ['AIRCRAFT_CAPACITY', 'Aircraft capacity', 'PASS', 'Manifest load is within capacity'],
    ['CREW_AVAILABILITY', 'Crew availability', 'PASS', 'No conflicting crew assignment detected'],
    ['CREW_LICENSE_MEDICAL', 'Crew license and medical', 'PASS', 'Crew licences are valid'],
    [
      'CREW_QUALIFICATION',
      'Crew operational qualification',
      'PASS',
      'Crew qualifications are valid'
    ],
    ['MANIFEST_APPROVED', 'Manifest approved', 'PASS', 'Passenger and cargo manifests approved'],
    ['DG_ACCEPTANCE', 'Dangerous goods acceptance', 'NOT_APPLICABLE', 'No DG cargo'],
    ['FUEL_CONFIRMED', 'Fuel confirmed', 'PASS', 'Fuel uplift confirmed'],
    ['HANDLING_CONFIRMED', 'Handling confirmed', 'PASS', 'Handling or parking confirmed'],
    ['FINANCE_INITIALIZED', 'Finance tracking initialized', 'PASS', 'Billing tracking initialized'],
    ['REQUIRED_DOCUMENTS', 'Required documents', 'PASS', 'Core documents available'],
    ['SEPARATION_OF_DUTIES', 'Separation of duties', 'PASS', 'Creator and approver are different']
  ];

  for (const [code, name, status, note] of checks) {
    const override = overrides[code];
    insertIgnore(sqlite, 'flight_readiness_checks', {
      id: `${flightId}-check-${code.toLowerCase().replaceAll('_', '-')}`,
      flightId,
      checkCode: code,
      checkName: name,
      statusId: lookupId('readiness-status', override?.status ?? status),
      isRequired: 1,
      evaluatedAt: context.now,
      evaluatedByUserId: 'USR-ADMIN',
      resultNote: override?.note ?? note,
      sourceReference: 'seed-scenario',
      createdAt: context.now,
      updatedAt: context.now
    });
  }
}

function seedCrew(
  sqlite: Database.Database,
  context: DemoSeedContext,
  flightId: string,
  picId: string,
  coPilotId: string
) {
  insertIgnore(sqlite, 'flight_crew_assignments', {
    id: `${flightId}-crew-pic`,
    flightId,
    crewId: picId,
    assignmentRoleId: 'crew-assignment-role-pilot-in-command',
    isPrimary: 1,
    createdAt: context.now,
    updatedAt: context.now
  });
  insertIgnore(sqlite, 'flight_crew_assignments', {
    id: `${flightId}-crew-cop`,
    flightId,
    crewId: coPilotId,
    assignmentRoleId: 'crew-assignment-role-co-pilot',
    isPrimary: 1,
    createdAt: context.now,
    updatedAt: context.now
  });
}

function seedFinance(
  sqlite: Database.Database,
  context: DemoSeedContext,
  flightId: string,
  status: string
) {
  insertIgnore(sqlite, 'flight_finance_handoffs', {
    id: `${flightId}-handoff-fuel`,
    flightId,
    sourceType: 'fuel',
    sourceId: `${flightId}-fuel`,
    eventTypeId: 'finance-event-type-fuel-cost-draft',
    statusId: lookupId('finance-handoff-status', status),
    summary: 'Fuel uplift cost preview for finance handoff.',
    amount: 9250000,
    currencyId: 'cur-idr',
    createdAt: context.now,
    updatedAt: context.now
  });
  insertIgnore(sqlite, 'flight_finance_handoffs', {
    id: `${flightId}-handoff-station`,
    flightId,
    sourceType: 'station_cost',
    sourceId: `${flightId}-station-cost`,
    eventTypeId: 'finance-event-type-station-cost-draft',
    statusId: lookupId('finance-handoff-status', status),
    summary: 'Station handling and parking cost preview.',
    amount: 2750000,
    currencyId: 'cur-idr',
    createdAt: context.now,
    updatedAt: context.now
  });
}

function seedApprovedStationCostHandoff(
  sqlite: Database.Database,
  context: DemoSeedContext,
  flightId: string,
  costId: string,
  amount: number
) {
  insertIgnore(sqlite, 'flight_finance_handoffs', {
    id: `${costId}-handoff`,
    flightId,
    sourceType: 'station_cost',
    sourceId: costId,
    eventTypeId: 'finance-event-type-station-cost-draft',
    statusId: 'finance-handoff-status-ready',
    summary: 'Approved Station Cost is ready for Finance Handoff.',
    amount,
    currencyId: 'cur-idr',
    createdAt: context.now,
    updatedAt: context.now
  });
}

function seedGovernance(
  sqlite: Database.Database,
  context: DemoSeedContext,
  flightId: string,
  currentStatus: string
) {
  const approvalRows = [
    {
      type: 'READINESS_APPROVAL',
      status: currentStatus === 'BLOCKED' ? 'PENDING' : 'APPROVED',
      role: 'OCC Checker'
    },
    {
      type: 'FLIGHT_APPROVAL',
      status: ['DRAFT', 'PENDING_READINESS', 'BLOCKED'].includes(currentStatus)
        ? 'NOT_STARTED'
        : 'APPROVED',
      role: 'Director'
    },
    {
      type: 'CLOSURE_APPROVAL',
      status: currentStatus === 'CLOSED' ? 'APPROVED' : 'NOT_STARTED',
      role: 'Operation Manager / Finance Reviewer'
    }
  ];
  for (const approval of approvalRows) {
    insertIgnore(sqlite, 'flight_operation_approvals', {
      id: `${flightId}-approval-${approval.type.toLowerCase()}`,
      flightId,
      approvalTypeId: lookupId('flight-approval-type', approval.type),
      statusId: lookupId('flight-approval-status', approval.status),
      requestedByUserId: 'USR-001',
      assignedRole: approval.role,
      decidedByUserId:
        approval.status === 'APPROVED'
          ? approval.type === 'READINESS_APPROVAL'
            ? 'USR-OCC-CHECKER'
            : approval.type === 'FLIGHT_APPROVAL'
              ? 'USR-DIRECTOR'
              : 'USR-ADMIN'
          : null,
      requestedAt: context.now,
      decidedAt: approval.status === 'APPROVED' ? context.now : null,
      reason: null,
      affectedSection: null,
      requiredCorrection: null,
      createdAt: context.now,
      updatedAt: context.now
    });
  }

  for (const [documentType, fileName, status] of [
    ['CHARTER_REQUEST', 'Charter request document.pdf', 'AVAILABLE'],
    ['FLIGHT_INSTRUCTION', 'Flight instruction.pdf', 'AVAILABLE'],
    [
      'FUEL_EVIDENCE',
      'Fuel request evidence.pdf',
      currentStatus === 'CLOSED' ? 'AVAILABLE' : 'PENDING'
    ],
    ['CARGO_DOCUMENT', 'Cargo manifest.pdf', 'AVAILABLE'],
    [
      'CLOSURE_REPORT',
      'Flight closure report.pdf',
      currentStatus === 'CLOSED' ? 'AVAILABLE' : 'PENDING'
    ]
  ]) {
    insertIgnore(sqlite, 'flight_operation_attachments', {
      id: `${flightId}-attachment-${documentType.toLowerCase()}`,
      flightId,
      documentType,
      fileName,
      statusId: lookupId('flight-attachment-status', status),
      uploadedAt: status === 'AVAILABLE' ? context.now : null,
      createdAt: context.now,
      updatedAt: context.now
    });
  }
}

export function seedFlightOperationsData(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const seedNow = context.now;
  const transaction = sqlite.transaction(() => {
    insertIgnore(sqlite, 'operational_advisories', {
      id: 'advisory-djj-wmx-runway-condition',
      advisoryType: 'RUNWAY',
      severity: 'BLOCKING',
      routeId: 'route-djj-wmx',
      stationId: null,
      status: 'RESOLVED',
      validFrom: context.at(-1, '00:00'),
      validUntil: context.at(30, '23:59'),
      summary: 'WMX runway condition requires operational confirmation',
      operationalLimitation:
        'Dispatch is prohibited until OCC confirms the runway condition report.',
      sourceReference: 'OPS-NOTAM-WMX-01',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_requests', {
      id: 'fr-2026-00124',
      requestNumber: `FR-${context.compactDate(0)}-001`,
      statusId: 'flight-request-status-converted',
      flightDate: context.date(2),
      flightTypeId: 'flight-type-cargo',
      serviceTypeId: 'flight-service-type-charter-cargo',
      routeId: 'route-djj-wmx',
      customerId: 'cust-papua-logistics',
      aircraftId: 'ac-pk-ama',
      pilotInCommandId: 'crew-pic-valid',
      coPilotId: 'crew-cop-valid',
      scheduledDepartureAt: context.at(2, '08:30'),
      scheduledArrivalAt: context.at(2, '09:45'),
      requestSource: 'Corporate Charter Request',
      priorityId: 'flight-priority-normal',
      passengerEstimate: 2,
      cargoWeightEstimateKg: 640,
      cargoCategory: 'General Cargo',
      dangerousGoods: 0,
      fuelType: 'AVTUR',
      requestedFuelLitre: 850,
      fuelSupplierId: 'fuel-pertamina-djj',
      handlingSupplierId: 'hp-angkasa-djj',
      parkingRequired: 1,
      destinationHandlingRequired: 1,
      billingType: 'CHARTER',
      estimatedRevenue: 28000000,
      currencyCode: 'IDR',
      remarks: 'Corporate charter cargo request for PT Papua Logistik.',
      convertedFlightId: 'fop-dg-pending',
      createdByUserId: 'USR-001',
      approvedByUserId: 'USR-ADMIN',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const request of [
      {
        id: 'fr-charter-draft',
        sequence: '002',
        status: 'draft',
        dateOffset: 5,
        source: 'Corporate Account Desk',
        remarks: 'Draft charter request awaiting payload confirmation.'
      },
      {
        id: 'fr-government-submitted',
        sequence: '003',
        status: 'submitted',
        dateOffset: 6,
        source: 'Government Liaison Desk',
        remarks: 'Medical transport request submitted for director approval.'
      },
      {
        id: 'fr-cargo-approved',
        sequence: '004',
        status: 'approved',
        dateOffset: 4,
        source: 'Cargo Account Desk',
        remarks: 'Approved logistics charter ready for flight conversion.'
      },
      {
        id: 'fr-passenger-rejected',
        sequence: '005',
        status: 'rejected',
        dateOffset: 2,
        source: 'Station Counter',
        remarks: 'Request rejected because the customer withdrew the movement.'
      }
    ] as const) {
      insertIgnore(sqlite, 'flight_requests', {
        id: request.id,
        requestNumber: `FR-${context.compactDate(0)}-${request.sequence}`,
        statusId: `flight-request-status-${request.status}`,
        flightDate: context.date(request.dateOffset),
        flightTypeId: 'flight-type-charter',
        serviceTypeId: 'flight-service-type-charter-passenger',
        routeId: 'route-djj-wmx',
        customerId:
          request.id === 'fr-government-submitted' ? 'cust-government' : 'cust-mission-air',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(request.dateOffset, '10:00'),
        scheduledArrivalAt: context.at(request.dateOffset, '10:55'),
        requestSource: request.source,
        priorityId:
          request.id === 'fr-government-submitted'
            ? 'flight-priority-high'
            : 'flight-priority-normal',
        passengerEstimate: 6,
        cargoWeightEstimateKg: 120,
        cargoCategory: 'Personal baggage',
        dangerousGoods: 0,
        fuelType: 'AVTUR',
        requestedFuelLitre: 600,
        fuelSupplierId: 'fuel-pertamina-djj',
        handlingSupplierId: 'hp-angkasa-djj',
        parkingRequired: 0,
        destinationHandlingRequired: 1,
        billingType: 'CHARTER',
        estimatedRevenue: 78500000,
        currencyCode: 'IDR',
        remarks: request.remarks,
        convertedFlightId: null,
        createdByUserId: 'USR-001',
        approvedByUserId: request.status === 'approved' ? 'USR-DIRECTOR' : null,
        approvedAt: request.status === 'approved' ? seedNow : null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    const flights = [
      {
        id: 'fop-closed-djj-wmx',
        flightNumber: `AMA-${context.compactDate(-10)}-001`,
        flightDate: context.date(-10),
        flightType: 'CHARTER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(-10, '08:00'),
        scheduledArrivalAt: context.at(-10, '08:55'),
        actualDepartureAt: context.at(-10, '08:08'),
        actualArrivalAt: context.at(-10, '09:02'),
        currentStatus: 'CLOSED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Closed charter flight with complete finance handoff.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-blocked-crew-expired',
        flightNumber: `AMA-${context.compactDate(0)}-002`,
        flightDate: context.date(0),
        flightType: 'PASSENGER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-amc',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(0, '11:00'),
        scheduledArrivalAt: context.at(0, '11:55'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'BLOCKED',
        createdByUserId: 'USR-001',
        approvedByUserId: null,
        remarks: 'Blocked by an unserviceable aircraft requiring certifying staff action.',
        isLocked: 0,
        blockingReason:
          'Assigned aircraft is unserviceable and requires an electronic maintenance release.'
      },
      {
        id: 'fop-cancelled-fuel',
        flightNumber: `AMA-${context.compactDate(-5)}-003`,
        flightDate: context.date(-5),
        flightType: 'CHARTER',
        routeId: 'route-djj-tim',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: 'cust-mission-air',
        aircraftId: 'ac-pk-amc',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(-5, '13:00'),
        scheduledArrivalAt: context.at(-5, '14:35'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'CANCELLED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Cancelled after fuel request was drafted.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-dg-pending',
        flightNumber: `AMA-${context.compactDate(2)}-004`,
        flightDate: context.date(2),
        flightType: 'CARGO',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-cargo-partner',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(2, '08:30'),
        scheduledArrivalAt: context.at(2, '09:45'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'PENDING_READINESS',
        createdByUserId: 'USR-001',
        approvedByUserId: null,
        remarks: 'Charter cargo for PT Papua Logistik; fuel and destination handling pending.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-in-progress',
        flightNumber: `AMA-${context.compactDate(0)}-005`,
        flightDate: context.date(0),
        flightType: 'PASSENGER',
        routeId: 'route-wmx-oks',
        originStationId: 'st-wmx',
        destinationStationId: 'st-oks',
        customerId: 'cust-individual-2',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-expiring',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(0, '09:30'),
        scheduledArrivalAt: context.at(0, '10:05'),
        actualDepartureAt: context.at(0, '09:36'),
        actualArrivalAt: null,
        currentStatus: 'IN_PROGRESS',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Remote flight under active operational following.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-ticketing-passenger',
        flightNumber: `AMA-${context.compactDate(1)}-006`,
        flightDate: context.date(1),
        flightType: 'PASSENGER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(1, '08:00'),
        scheduledArrivalAt: context.at(1, '08:55'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'SCHEDULED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Scheduled passenger service open for ticket sales.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-ticketing-cargo',
        flightNumber: `AMA-${context.compactDate(2)}-007`,
        flightDate: context.date(2),
        flightType: 'CARGO',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-cargo-partner',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(2, '11:30'),
        scheduledArrivalAt: context.at(2, '12:25'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'SCHEDULED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Scheduled cargo service open for bookings.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-ticketing-passenger-later',
        flightNumber: `AMA-${context.compactDate(4)}-008`,
        flightDate: context.date(4),
        flightType: 'PASSENGER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(4, '08:00'),
        scheduledArrivalAt: context.at(4, '08:55'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'SCHEDULED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Later passenger service available for ticket rescheduling.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-route-profile-djj-nbx',
        flightNumber: `AMA-${context.compactDate(3)}-009`,
        flightDate: context.date(3),
        flightType: 'PASSENGER',
        routeId: 'route-djj-nbx',
        originStationId: 'st-djj',
        destinationStationId: 'st-nbx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(3, '10:00'),
        scheduledArrivalAt: context.at(3, '11:20'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'SCHEDULED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Scheduled DJJ-NBX passenger flight for route operational profile preview.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-ready-approval',
        flightNumber: `AMA-${context.compactDate(0)}-010`,
        flightDate: context.date(0),
        flightType: 'CHARTER',
        routeId: 'route-djj-tim',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: 'cust-government',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(0, '14:00'),
        scheduledArrivalAt: context.at(0, '15:35'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'READY_FOR_APPROVAL',
        createdByUserId: 'USR-001',
        approvedByUserId: null,
        remarks: 'Priority government charter with complete readiness evidence.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-checkin-open',
        flightNumber: `AMA-${context.compactDate(0)}-011`,
        flightDate: context.date(0),
        flightType: 'PASSENGER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(0, '16:00'),
        scheduledArrivalAt: context.at(0, '16:55'),
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'CHECK_IN_OPEN',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Passenger service with check-in currently open.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-diverted-weather',
        flightNumber: `AMA-${context.compactDate(-1)}-012`,
        flightDate: context.date(-1),
        flightType: 'CHARTER',
        routeId: 'route-tim-wmx',
        originStationId: 'st-tim',
        destinationStationId: 'st-wmx',
        customerId: 'cust-mission-air',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(-1, '12:00'),
        scheduledArrivalAt: context.at(-1, '13:10'),
        actualDepartureAt: context.at(-1, '12:08'),
        actualArrivalAt: context.at(-1, '13:35'),
        currentStatus: 'DIVERTED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Diverted to Jayapura after weather deteriorated at Wamena.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-landed-maintenance',
        flightNumber: `AMA-${context.compactDate(-1)}-013`,
        flightDate: context.date(-1),
        flightType: 'CARGO',
        routeId: 'route-wmx-oks',
        originStationId: 'st-wmx',
        destinationStationId: 'st-oks',
        customerId: 'cust-cargo-partner',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-expiring',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(-1, '08:00'),
        scheduledArrivalAt: context.at(-1, '08:35'),
        actualDepartureAt: context.at(-1, '08:06'),
        actualArrivalAt: context.at(-1, '08:42'),
        currentStatus: 'LANDED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Landed with an oil-filter replacement recorded for maintenance review.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-pending-closure',
        flightNumber: `AMA-${context.compactDate(-1)}-014`,
        flightDate: context.date(-1),
        flightType: 'PASSENGER',
        routeId: 'route-djj-tim',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: 'cust-individual-2',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(-1, '09:00'),
        scheduledArrivalAt: context.at(-1, '10:35'),
        actualDepartureAt: context.at(-1, '09:04'),
        actualArrivalAt: context.at(-1, '10:31'),
        currentStatus: 'PENDING_CLOSURE',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Operational and maintenance records complete; Station Cost remains in draft.',
        isLocked: 0,
        blockingReason: 'Existing Station Cost requires approval plus Finance Handoff, or voiding.'
      },
      {
        id: 'fop-closed-pax-revenue',
        flightNumber: `AMA-${context.compactDate(-7)}-016`,
        flightDate: context.date(-7),
        flightType: 'PASSENGER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-individual-1',
        aircraftId: 'ac-pk-amb',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid-2',
        scheduledDepartureAt: context.at(-7, '07:30'),
        scheduledArrivalAt: context.at(-7, '08:25'),
        actualDepartureAt: context.at(-7, '07:34'),
        actualArrivalAt: context.at(-7, '08:28'),
        currentStatus: 'CLOSED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Closed scheduled passenger service with ticket revenue.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-closed-cargo-revenue',
        flightNumber: `AMA-${context.compactDate(-3)}-017`,
        flightDate: context.date(-3),
        flightType: 'CARGO',
        routeId: 'route-djj-tim',
        originStationId: 'st-djj',
        destinationStationId: 'st-tim',
        customerId: 'cust-cargo-partner',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(-3, '10:00'),
        scheduledArrivalAt: context.at(-3, '11:35'),
        actualDepartureAt: context.at(-3, '10:06'),
        actualArrivalAt: context.at(-3, '11:40'),
        currentStatus: 'CLOSED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Closed cargo charter with cargo booking revenue.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-reopened-correction',
        flightNumber: `AMA-${context.compactDate(-9)}-015`,
        flightDate: context.date(-9),
        flightType: 'CHARTER',
        routeId: 'route-djj-wmx',
        originStationId: 'st-djj',
        destinationStationId: 'st-wmx',
        customerId: 'cust-papua-logistics',
        aircraftId: 'ac-pk-ama',
        pilotInCommandId: 'crew-pic-valid',
        coPilotId: 'crew-cop-valid',
        scheduledDepartureAt: context.at(-9, '07:00'),
        scheduledArrivalAt: context.at(-9, '07:55'),
        actualDepartureAt: context.at(-9, '07:05'),
        actualArrivalAt: context.at(-9, '08:01'),
        currentStatus: 'REOPENED_FOR_CORRECTION',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        remarks: 'Reopened to correct a station-cost document reference.',
        isLocked: 0,
        blockingReason: 'Station-cost evidence requires correction.'
      }
    ];

    for (const flight of flights) {
      const { flightType, currentStatus, ...flightRow } = flight;
      insertIgnore(sqlite, 'flight_operations', {
        ...flightRow,
        actualDepartureStationId: flight.actualDepartureAt ? flight.originStationId : null,
        actualArrivalStationId: flight.actualArrivalAt
          ? flight.id === 'fop-diverted-weather'
            ? 'st-djj'
            : flight.destinationStationId
          : null,
        orderNumber: `FO-${flight.flightNumber.replace('AMA-', '')}`,
        flightRequestId: flight.id === 'fop-dg-pending' ? 'fr-2026-00124' : null,
        flightTypeId: lookupId('flight-type', flightType),
        serviceTypeId:
          flight.id === 'fop-ticketing-passenger' ||
          flight.id === 'fop-ticketing-passenger-later' ||
          flight.id === 'fop-route-profile-djj-nbx'
            ? 'flight-service-type-scheduled-passenger'
            : flightType === 'PASSENGER'
              ? 'flight-service-type-charter-passenger'
              : 'flight-service-type-charter-cargo',
        requestSource: 'Corporate Charter Request',
        priorityId:
          flight.id === 'fop-dg-pending' ? 'flight-priority-high' : 'flight-priority-normal',
        currentStatusId: lookupId('flight-operation-status', currentStatus),
        billingType: 'CHARTER',
        estimatedRevenue: flight.id === 'fop-closed-djj-wmx' ? 28000000 : 18500000,
        currencyCode: 'IDR',
        createdAt: seedNow,
        updatedAt: seedNow
      });
      seedCrew(sqlite, context, flight.id, flight.pilotInCommandId, flight.coPilotId);
      seedManifests(sqlite, context, flight.id);
      seedGovernance(sqlite, context, flight.id, currentStatus);
      insertHistory(sqlite, context, {
        id: `${flight.id}-history-create`,
        flightId: flight.id,
        toStatus: 'DRAFT',
        actionType: 'CREATE',
        changedAt: flight.scheduledDepartureAt
      });
      insertHistory(sqlite, context, {
        id: `${flight.id}-history-current`,
        flightId: flight.id,
        fromStatus: currentStatus === 'CLOSED' ? 'PENDING_CLOSURE' : 'DRAFT',
        toStatus: currentStatus,
        actionType: currentStatus === 'CANCELLED' ? 'CANCEL' : 'READINESS_EVALUATED',
        reasonId: currentStatus === 'CANCELLED' ? 'reason-customer-request' : null,
        reasonNote: currentStatus === 'CANCELLED' ? 'Customer requested movement change.' : null,
        changedAt: seedNow
      });
    }
    const demoPositions = [
      {
        id: 'apos-in-progress-01',
        latitude: -4.245,
        longitude: 139.132,
        altitudeFt: 10_500,
        groundSpeedKt: 148,
        headingDeg: 146,
        recordedAt: context.at(0, '09:42')
      },
      {
        id: 'apos-in-progress-02',
        latitude: -4.435,
        longitude: 139.355,
        altitudeFt: 11_500,
        groundSpeedKt: 154,
        headingDeg: 146,
        recordedAt: context.now
      }
    ];
    for (const position of demoPositions) {
      insertIgnore(sqlite, 'aircraft_position_reports', {
        ...position,
        aircraftId: 'ac-pk-amb',
        flightId: 'fop-in-progress',
        positionStatus: 'AIRBORNE',
        source: 'MANUAL',
        reportedByUserId: 'USR-ADMIN',
        createdAt: seedNow
      });
    }
    insertIgnore(sqlite, 'aircraft_current_positions', {
      aircraftId: 'ac-pk-amb',
      reportId: 'apos-in-progress-02',
      flightId: 'fop-in-progress',
      latitude: -4.435,
      longitude: 139.355,
      positionStatus: 'AIRBORNE',
      altitudeFt: 11_500,
      groundSpeedKt: 154,
      headingDeg: 146,
      source: 'MANUAL',
      recordedAt: context.now,
      version: 2,
      updatedAt: seedNow
    });
    sqlite.prepare("UPDATE aircraft SET current_station_id = NULL WHERE id = 'ac-pk-amb'").run();
    sqlite
      .prepare(
        `UPDATE flight_operations SET
          order_number = ?,
          flight_request_id = 'fr-2026-00124',
          flight_number = ?,
          flight_date = ?,
          flight_type_id = 'flight-type-cargo',
          service_type_id = 'flight-service-type-charter-cargo',
          request_source = 'Corporate Charter Request',
          priority_id = 'flight-priority-normal',
          customer_id = 'cust-papua-logistics',
          scheduled_departure_at = ?,
          scheduled_arrival_at = ?,
          billing_type = 'CHARTER',
          estimated_revenue = 28000000,
          currency_code = 'IDR',
          remarks = 'Charter cargo for PT Papua Logistik; fuel and destination handling pending.',
          updated_at = ?
         WHERE id = 'fop-dg-pending'`
      )
      .run(
        `FO-${context.compactDate(2)}-004`,
        `AMA-${context.compactDate(2)}-004`,
        context.date(2),
        context.at(2, '08:30'),
        context.at(2, '09:45'),
        seedNow
      );

    seedReadiness(sqlite, context, 'fop-closed-djj-wmx');
    seedReadiness(sqlite, context, 'fop-blocked-crew-expired', {
      AIRCRAFT_SERVICEABILITY: {
        status: 'FAIL',
        note: 'Aircraft PK-AMC is unserviceable and requires a certifying staff release.'
      }
    });
    seedReadiness(sqlite, context, 'fop-cancelled-fuel', {
      AIRCRAFT_SERVICEABILITY: {
        status: 'FAIL',
        note: 'Aircraft PK-AMC is currently unserviceable.'
      },
      AIRCRAFT_LOCATION: {
        status: 'FAIL',
        note: 'Aircraft PK-AMC is positioned at WMX, not departure station DJJ.'
      },
      FUEL_CONFIRMED: { status: 'PENDING', note: 'Fuel request voided by cancellation.' }
    });
    seedReadiness(sqlite, context, 'fop-dg-pending', {
      CREW_AVAILABILITY: {
        status: 'FAIL',
        note: 'Co-pilot has another flight inside the minimum turnaround buffer.'
      },
      MANIFEST_APPROVED: { status: 'PENDING', note: 'Cargo manifest is still in draft.' },
      DG_ACCEPTANCE: { status: 'PENDING', note: 'DG cargo item requires acceptance.' },
      FUEL_CONFIRMED: { status: 'PENDING', note: 'Fuel supplier confirmation is pending.' },
      HANDLING_CONFIRMED: {
        status: 'PENDING',
        note: 'Destination handling confirmation is pending.'
      }
    });
    for (const [checkCode, status, note] of [
      [
        'CREW_AVAILABILITY',
        'FAIL',
        'Co-pilot has another flight inside the minimum turnaround buffer.'
      ],
      ['MANIFEST_APPROVED', 'PENDING', 'Cargo manifest is still in draft.'],
      ['DG_ACCEPTANCE', 'PENDING', 'DG cargo item requires acceptance.'],
      ['FUEL_CONFIRMED', 'PENDING', 'Fuel supplier confirmation is pending.'],
      ['HANDLING_CONFIRMED', 'PENDING', 'Destination handling confirmation is pending.']
    ]) {
      sqlite
        .prepare(
          `UPDATE flight_readiness_checks
           SET status_id = ?, result_note = ?, updated_at = ?
           WHERE flight_id = 'fop-dg-pending' AND check_code = ?`
        )
        .run(lookupId('readiness-status', status), note, seedNow, checkCode);
    }
    seedReadiness(sqlite, context, 'fop-in-progress');
    seedReadiness(sqlite, context, 'fop-ticketing-passenger-later');
    for (const flightId of [
      'fop-ready-approval',
      'fop-checkin-open',
      'fop-diverted-weather',
      'fop-landed-maintenance',
      'fop-pending-closure',
      'fop-reopened-correction'
    ]) {
      seedReadiness(sqlite, context, flightId);
    }

    insertIgnore(sqlite, 'flight_manifest_passengers', {
      id: 'fop-closed-pax-1',
      manifestId: 'fop-closed-djj-wmx-manifest-pax',
      fullName: 'Maria Rumbiak',
      identityType: 'KTP',
      identityNumber: 'KTP-917101440001',
      weightKg: 68,
      seatNumber: '1A',
      baggageWeightKg: 12,
      remarks: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_manifest_cargo_items', {
      id: 'fop-dg-cargo-1',
      manifestId: 'fop-dg-pending-manifest-cargo',
      description: 'Lithium battery communication equipment',
      senderName: 'PT Papua Kargo Mandiri',
      receiverName: 'Wamena Field Team',
      actualWeightKg: 84,
      volumeWeightKg: 92,
      chargeableWeightKg: 92,
      dgCategoryId: 'dg-bat',
      dgAcceptanceStatusId: 'dg-acceptance-status-pending',
      remarks: 'DG acceptance required before readiness pass.',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_manifest_cargo_items', {
      id: 'fop-dg-cargo-2',
      manifestId: 'fop-dg-pending-manifest-cargo',
      description: 'General logistics cargo',
      senderName: 'PT Papua Logistik',
      receiverName: 'Wamena Operations',
      actualWeightKg: 556,
      volumeWeightKg: 560,
      chargeableWeightKg: 560,
      dgCategoryId: null,
      dgAcceptanceStatusId: 'dg-acceptance-status-not-applicable',
      remarks: 'Three mock AWB consolidated for the charter.',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    for (const [id, name, seat, baggage] of [
      ['fop-dg-pax-1', 'Rian Wenda', '1A', 18],
      ['fop-dg-pax-2', 'Yohanes Kogoya', '1B', 14]
    ] satisfies Array<[string, string, string, number]>) {
      insertIgnore(sqlite, 'flight_manifest_passengers', {
        id,
        manifestId: 'fop-dg-pending-manifest-pax',
        fullName: name,
        identityType: 'KTP',
        identityNumber: `KTP-${id.replaceAll('fop-', '').toUpperCase()}`,
        weightKg: 72,
        seatNumber: seat,
        baggageWeightKg: baggage,
        remarks: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'flight_fuel_requests', {
      id: 'fop-dg-pending-fuel',
      flightId: 'fop-dg-pending',
      fuelSupplierId: 'fuel-pertamina-djj',
      fuelType: 'AVTUR',
      requestedQuantityLitre: 850,
      approvedQuantityLitre: null,
      actualUpliftLitre: null,
      referencePricePerLitre: 18500,
      actualPricePerLitre: null,
      taxCodeId: 'tax-non-tax',
      taxAmount: null,
      totalCost: null,
      currencyId: 'cur-idr',
      statusId: 'fuel-workflow-status-requested',
      rejectionReason: null,
      varianceNote: null,
      requestedByUserId: 'USR-001',
      approvedByUserId: null,
      upliftRecordedByUserId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_fuel_requests', {
      id: 'fop-ticketing-passenger-later-fuel',
      flightId: 'fop-ticketing-passenger-later',
      fuelSupplierId: 'fuel-pertamina-djj',
      fuelType: 'AVTUR',
      requestedQuantityLitre: 600,
      approvedQuantityLitre: 600,
      actualUpliftLitre: 600,
      referencePricePerLitre: 18500,
      actualPricePerLitre: 18500,
      taxCodeId: 'tax-non-tax',
      taxAmount: 0,
      totalCost: 11100000,
      currencyId: 'cur-idr',
      statusId: 'fuel-workflow-status-posted',
      rejectionReason: null,
      varianceNote: 'Prepared destination-change scenario.',
      requestedByUserId: 'USR-001',
      approvedByUserId: 'USR-STATION-ADMIN-ORIGIN',
      upliftRecordedByUserId: 'USR-STATION-ADMIN-ORIGIN',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    for (const preparedService of [
      {
        id: 'fop-ticketing-passenger-later-origin-handling',
        stationId: 'st-djj',
        serviceSupplierId: 'hp-angkasa-djj',
        statusId: 'station-service-status-verified'
      },
      {
        id: 'fop-ticketing-passenger-later-destination-handling',
        stationId: 'st-wmx',
        serviceSupplierId: 'hp-wmx-ground-services',
        statusId: 'station-service-status-confirmed'
      }
    ]) {
      const verified = preparedService.statusId === 'station-service-status-verified';
      insertIgnore(sqlite, 'flight_station_service_requests', {
        ...preparedService,
        flightId: 'fop-ticketing-passenger-later',
        serviceTypeId: 'station-service-type-handling',
        referenceRate: preparedService.stationId === 'st-djj' ? 2750000 : 1500000,
        referenceCurrencyId: 'cur-idr',
        creationSource: 'PLANNING_ASSIGNMENT',
        creationReason: 'Explicit supplier selected for destination-change preparation.',
        createdByUserId: 'USR-001',
        confirmedAt: seedNow,
        confirmedByUserId: 'USR-STATION-ADMIN-ORIGIN',
        completionRecord: verified ? 'Origin handling completed before route change review.' : null,
        completionEvidenceReference: verified ? 'SYS-PREPARED-ORIGIN-HANDLING' : null,
        completedAt: verified ? seedNow : null,
        completedByUserId: verified ? 'USR-STATION-ADMIN-ORIGIN' : null,
        verifiedAt: verified ? seedNow : null,
        verifiedByUserId: verified ? 'USR-STATION-ADMIN-ORIGIN' : null,
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }
    for (const preparedCost of [
      {
        id: 'fop-ticketing-passenger-later-origin-cost',
        stationId: 'st-djj',
        supplierId: 'hp-angkasa-djj',
        sourceServiceId: 'fop-ticketing-passenger-later-origin-handling',
        amount: 2750000,
        statusId: 'station-cost-status-approved'
      },
      {
        id: 'fop-ticketing-passenger-later-destination-cost',
        stationId: 'st-wmx',
        supplierId: 'hp-wmx-ground-services',
        sourceServiceId: 'fop-ticketing-passenger-later-destination-handling',
        amount: 1500000,
        statusId: 'station-cost-status-draft'
      }
    ]) {
      const approved = preparedCost.statusId === 'station-cost-status-approved';
      insertIgnore(sqlite, 'flight_station_costs', {
        id: preparedCost.id,
        flightId: 'fop-ticketing-passenger-later',
        stationId: preparedCost.stationId,
        serviceSupplierId: preparedCost.supplierId,
        sourceServiceId: preparedCost.sourceServiceId,
        vendorId: preparedCost.stationId === 'st-wmx' ? 'vendor-transport-wmx' : null,
        costCategoryId: 'cost-handling',
        amount: preparedCost.amount,
        estimatedAmount: preparedCost.amount,
        actualAmount: approved ? preparedCost.amount : null,
        currencyId: 'cur-idr',
        description: approved
          ? 'Prepared origin handling actual cost.'
          : 'REFERENCE ESTIMATE for destination handling before route change.',
        vendorReference: approved ? 'INV-PREPARED-DJJ' : null,
        evidenceReference: approved ? 'RECEIPT-PREPARED-DJJ' : null,
        submittedByUserId: approved ? 'USR-STATION-ADMIN-ORIGIN' : null,
        submittedAt: approved ? seedNow : null,
        approvedByUserId: approved ? 'USR-FINANCE-REVIEWER' : null,
        approvedAt: approved ? seedNow : null,
        statusId: preparedCost.statusId,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }
    insertIgnore(sqlite, 'flight_finance_handoffs', {
      id: 'fop-ticketing-passenger-later-origin-cost-handoff',
      flightId: 'fop-ticketing-passenger-later',
      sourceType: 'station_cost',
      sourceId: 'fop-ticketing-passenger-later-origin-cost',
      eventTypeId: 'finance-event-type-station-cost-draft',
      statusId: 'finance-handoff-status-ready',
      summary: 'Prepared origin handling cost ready for finance.',
      amount: 2750000,
      currencyId: 'cur-idr',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    for (const service of [
      {
        id: 'fop-dg-departure-handling',
        stationId: 'st-djj',
        serviceTypeId: 'station-service-type-handling',
        statusId: 'station-service-status-confirmed'
      },
      {
        id: 'fop-dg-departure-parking',
        stationId: 'st-djj',
        serviceTypeId: 'station-service-type-parking',
        statusId: 'station-service-status-confirmed'
      },
      {
        id: 'fop-dg-destination-handling',
        stationId: 'st-wmx',
        serviceTypeId: 'station-service-type-handling',
        statusId: 'station-service-status-requested'
      }
    ]) {
      insertIgnore(sqlite, 'flight_station_service_requests', {
        ...service,
        flightId: 'fop-dg-pending',
        serviceSupplierId:
          service.stationId === 'st-wmx' ? 'hp-wmx-ground-services' : 'hp-angkasa-djj',
        referenceRate: 2500000,
        confirmedAt: service.statusId === 'station-service-status-confirmed' ? seedNow : null,
        confirmedByUserId:
          service.statusId === 'station-service-status-confirmed' ? 'USR-STATION-ADMIN' : null,
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }
    for (const service of [
      {
        id: 'fop-dg-departure-handling',
        categoryId: 'cost-handling',
        amount: 2500000
      },
      {
        id: 'fop-dg-departure-parking',
        categoryId: 'cost-parking',
        amount: 2500000
      }
    ]) {
      insertIgnore(sqlite, 'flight_station_costs', {
        id: `${service.id}-cost`,
        flightId: 'fop-dg-pending',
        stationId: 'st-djj',
        vendorId: null,
        serviceSupplierId: 'hp-angkasa-djj',
        sourceServiceId: service.id,
        costCategoryId: service.categoryId,
        amount: service.amount,
        estimatedAmount: service.amount,
        actualAmount: null,
        currencyId: 'cur-idr',
        description: 'REFERENCE ESTIMATE generated from confirmed Station Service.',
        statusId: 'station-cost-status-draft',
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }
    sqlite
      .prepare(
        `UPDATE flight_manifests SET status_id = 'manifest-status-draft', approved_by_user_id = NULL,
          approved_at = NULL, updated_at = ? WHERE id = 'fop-dg-pending-manifest-cargo'`
      )
      .run(seedNow);

    for (const flightId of [
      'fop-closed-djj-wmx',
      'fop-cancelled-fuel',
      'fop-in-progress',
      'fop-blocked-crew-expired',
      'fop-ready-approval',
      'fop-checkin-open',
      'fop-reopened-correction'
    ]) {
      insertIgnore(sqlite, 'flight_fuel_requests', {
        id: `${flightId}-fuel`,
        flightId,
        fuelSupplierId:
          flightId === 'fop-in-progress' ? 'fuel-pertamina-wmx' : 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 500,
        approvedQuantityLitre: 500,
        actualUpliftLitre: flightId === 'fop-cancelled-fuel' ? null : 500,
        referencePricePerLitre: 18500,
        actualPricePerLitre: flightId === 'fop-cancelled-fuel' ? null : 18500,
        taxCodeId: 'tax-non-tax',
        taxAmount: flightId === 'fop-cancelled-fuel' ? null : 0,
        totalCost: flightId === 'fop-cancelled-fuel' ? null : 9250000,
        currencyId: 'cur-idr',
        statusId:
          flightId === 'fop-cancelled-fuel'
            ? 'fuel-workflow-status-rejected'
            : 'fuel-workflow-status-posted',
        rejectionReason: flightId === 'fop-cancelled-fuel' ? 'Flight cancelled.' : null,
        varianceNote: null,
        requestedByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        upliftRecordedByUserId: 'USR-ADMIN',
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const flightId of ['fop-closed-djj-wmx', 'fop-in-progress']) {
      insertIgnore(sqlite, 'flight_station_service_requests', {
        id: `${flightId}-handling`,
        flightId,
        stationId: flightId === 'fop-in-progress' ? 'st-wmx' : 'st-djj',
        serviceSupplierId:
          flightId === 'fop-in-progress' ? 'hp-wmx-ground-services' : 'hp-angkasa-djj',
        serviceTypeId: 'station-service-type-handling',
        statusId: 'station-service-status-confirmed',
        referenceRate: 2750000,
        confirmedAt: seedNow,
        confirmedByUserId: 'USR-ADMIN',
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_costs', {
        id: `${flightId}-station-cost`,
        flightId,
        stationId: flightId === 'fop-in-progress' ? 'st-wmx' : 'st-djj',
        vendorId: flightId === 'fop-in-progress' ? 'vendor-transport-wmx' : null,
        serviceSupplierId:
          flightId === 'fop-in-progress' ? 'hp-wmx-ground-services' : 'hp-angkasa-djj',
        sourceServiceId: `${flightId}-handling`,
        costCategoryId: 'cost-handling',
        amount: 2750000,
        currencyId: 'cur-idr',
        description: 'Mock handling cost generated from confirmed station service.',
        statusId: 'station-cost-status-approved',
        submittedByUserId: 'USR-STATION-ADMIN',
        submittedAt: seedNow,
        approvedByUserId: 'USR-ADMIN',
        approvedAt: seedNow,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      if (flightId === 'fop-in-progress') {
        seedApprovedStationCostHandoff(
          sqlite,
          context,
          flightId,
          `${flightId}-station-cost`,
          2750000
        );
      }
    }

    for (const operation of [
      {
        flightId: 'fop-diverted-weather',
        stationId: 'st-djj',
        supplierId: 'hp-angkasa-djj',
        amount: 4200000
      },
      {
        flightId: 'fop-landed-maintenance',
        stationId: 'st-wmx',
        supplierId: 'hp-wmx-ground-services',
        amount: 1800000
      },
      {
        flightId: 'fop-pending-closure',
        stationId: 'st-djj',
        supplierId: 'hp-angkasa-djj',
        amount: 2750000
      }
    ] as const) {
      insertIgnore(sqlite, 'flight_fuel_requests', {
        id: `${operation.flightId}-fuel`,
        flightId: operation.flightId,
        fuelSupplierId:
          operation.flightId === 'fop-diverted-weather'
            ? 'fuel-pertamina-tim'
            : operation.stationId === 'st-djj'
              ? 'fuel-pertamina-djj'
              : 'fuel-pertamina-wmx',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 500,
        approvedQuantityLitre: 500,
        actualUpliftLitre: 500,
        referencePricePerLitre: 18500,
        actualPricePerLitre: 18500,
        taxCodeId: 'tax-non-tax',
        taxAmount: 0,
        totalCost: 9250000,
        currencyId: 'cur-idr',
        statusId: 'fuel-workflow-status-posted',
        rejectionReason: null,
        varianceNote: null,
        requestedByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        upliftRecordedByUserId: 'USR-ADMIN',
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_service_requests', {
        id: `${operation.flightId}-handling`,
        flightId: operation.flightId,
        stationId: operation.stationId,
        serviceSupplierId: operation.supplierId,
        serviceTypeId: 'station-service-type-handling',
        statusId:
          operation.flightId === 'fop-pending-closure'
            ? 'station-service-status-verified'
            : 'station-service-status-confirmed',
        referenceRate:
          operation.flightId === 'fop-landed-maintenance' ? 8_000_000 : operation.amount,
        confirmedAt: seedNow,
        confirmedByUserId: 'USR-STATION-ADMIN',
        completionRecord:
          operation.flightId === 'fop-pending-closure'
            ? 'Destination handling checklist completed.'
            : null,
        completionEvidenceReference:
          operation.flightId === 'fop-pending-closure' ? 'SYS-PENDING-CLOSURE-HANDLING' : null,
        completedAt: operation.flightId === 'fop-pending-closure' ? seedNow : null,
        completedByUserId:
          operation.flightId === 'fop-pending-closure' ? 'USR-STATION-ADMIN' : null,
        verifiedAt: operation.flightId === 'fop-pending-closure' ? seedNow : null,
        verifiedByUserId: operation.flightId === 'fop-pending-closure' ? 'USR-STATION-ADMIN' : null,
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_costs', {
        id: `${operation.flightId}-station-cost`,
        flightId: operation.flightId,
        stationId: operation.stationId,
        vendorId: operation.stationId === 'st-wmx' ? 'vendor-transport-wmx' : null,
        serviceSupplierId: operation.supplierId,
        sourceServiceId: `${operation.flightId}-handling`,
        costCategoryId: 'cost-handling',
        amount: operation.flightId === 'fop-landed-maintenance' ? 8_750_000 : operation.amount,
        estimatedAmount:
          operation.flightId === 'fop-landed-maintenance' ? 8_000_000 : operation.amount,
        actualAmount:
          operation.flightId === 'fop-pending-closure'
            ? null
            : operation.flightId === 'fop-landed-maintenance'
              ? 8_750_000
              : operation.amount,
        currencyId: 'cur-idr',
        description:
          operation.flightId === 'fop-pending-closure'
            ? 'REFERENCE ESTIMATE pending actual amount and invoice evidence.'
            : operation.flightId === 'fop-landed-maintenance'
              ? 'Wamena handling actual awaiting Finance review.'
              : 'Confirmed handling and station support cost.',
        vendorReference: operation.flightId === 'fop-landed-maintenance' ? 'INV-WMX-8750000' : null,
        evidenceReference:
          operation.flightId === 'fop-landed-maintenance' ? 'RECEIPT-WMX-001' : null,
        statusId:
          operation.flightId === 'fop-pending-closure'
            ? 'station-cost-status-draft'
            : operation.flightId === 'fop-landed-maintenance'
              ? 'station-cost-status-submitted'
              : 'station-cost-status-approved',
        submittedByUserId:
          operation.flightId === 'fop-pending-closure' ? null : 'USR-STATION-ADMIN',
        submittedAt: operation.flightId === 'fop-pending-closure' ? null : seedNow,
        approvedByUserId: ['fop-pending-closure', 'fop-landed-maintenance'].includes(
          operation.flightId
        )
          ? null
          : 'USR-ADMIN',
        approvedAt: ['fop-pending-closure', 'fop-landed-maintenance'].includes(operation.flightId)
          ? null
          : seedNow,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      if (!['fop-pending-closure', 'fop-landed-maintenance'].includes(operation.flightId)) {
        seedApprovedStationCostHandoff(
          sqlite,
          context,
          operation.flightId,
          `${operation.flightId}-station-cost`,
          operation.amount
        );
      }
    }

    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-closed-maintenance',
      flightId: 'fop-closed-djj-wmx',
      aircraftId: 'ac-pk-ama',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: 'WO-AMA-0707-001',
      maintenanceNote: 'Post-flight inspection clear.',
      sparePartReference: null,
      maintenanceCost: 0,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-ADMIN',
      approvedByUserId: 'USR-ADMIN',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-in-progress-maintenance-draft',
      flightId: 'fop-in-progress',
      aircraftId: 'ac-pk-amb',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable-with-restrictions',
      workOrderReference: null,
      maintenanceNote: 'Transit inspection note is still being consolidated by maintenance.',
      sparePartReference: null,
      maintenanceCost: 1250000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-draft',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: null,
      approvedAt: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-blocked-maintenance-due',
      flightId: 'fop-blocked-crew-expired',
      aircraftId: 'ac-pk-amc',
      serviceabilityStatusId: 'aircraft-serviceability-status-unserviceable',
      workOrderReference: 'WO-AMA-0707-002',
      maintenanceNote: 'Aircraft is unserviceable; readiness must remain blocked.',
      sparePartReference: 'SP-PC6-FLT-1001',
      maintenanceCost: 950000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-CERTIFYING-STAFF',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-cancelled-maintenance-unserviceable',
      flightId: 'fop-cancelled-fuel',
      aircraftId: 'ac-pk-amc',
      serviceabilityStatusId: 'aircraft-serviceability-status-unserviceable',
      workOrderReference: 'WO-AMA-0707-003',
      maintenanceNote: 'Aircraft marked unserviceable after cancellation review.',
      sparePartReference: 'SP-PC6-BRK-2001',
      maintenanceCost: 3200000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-rejected',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: null,
      approvedAt: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-ticketing-cargo-maintenance-approved',
      flightId: 'fop-ticketing-cargo',
      aircraftId: 'ac-pk-amb',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: 'WO-AMA-0716-001',
      maintenanceNote: 'Pre-flight inspection clear for cargo service.',
      sparePartReference: null,
      maintenanceCost: 1750000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'maintenance-landed-filter-draft',
      flightId: 'fop-landed-maintenance',
      aircraftId: 'ac-pk-ama',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable-with-restrictions',
      workOrderReference: `WO-AMA-${context.compactDate(-1)}-004`,
      maintenanceNote: 'Oil-filter replacement recorded; release evidence awaits review.',
      sparePartReference: 'SP-PC6-FLT-1001',
      maintenanceCost: 950000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-draft',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: null,
      approvedAt: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'maintenance-pending-closure-submitted',
      flightId: 'fop-pending-closure',
      aircraftId: 'ac-pk-amb',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: `WO-AMA-${context.compactDate(-1)}-005`,
      maintenanceNote: 'Post-flight inspection approved for closure handoff.',
      sparePartReference: null,
      maintenanceCost: 750000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-CERTIFYING-STAFF',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'maintenance-reopened-approved',
      flightId: 'fop-reopened-correction',
      aircraftId: 'ac-pk-ama',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: `WO-AMA-${context.compactDate(-9)}-006`,
      maintenanceNote:
        'Post-flight inspection remains approved; finance evidence requires correction.',
      sparePartReference: null,
      maintenanceCost: 0,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    seedFinance(sqlite, context, 'fop-closed-djj-wmx', 'READY');
    insertIgnore(sqlite, 'flight_finance_handoffs', {
      id: 'fop-closed-djj-wmx-handoff-invoice',
      flightId: 'fop-closed-djj-wmx',
      sourceType: 'flight',
      sourceId: 'fop-closed-djj-wmx',
      eventTypeId: 'finance-event-type-flight-closed-eligible-for-invoice',
      statusId: 'finance-handoff-status-ready',
      summary: 'Closed flight is eligible for invoice generation in finance module.',
      amount: null,
      currencyId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'invoices', {
      id: 'inv-closed-djj-wmx',
      customerId: 'cust-papua-logistics',
      flightOperationId: 'fop-closed-djj-wmx',
      invoiceNumber: `AMA-INV-${context.compactDate(-10)}-001`,
      status: 'partially_paid',
      subtotal: 28000000,
      tax: 3080000,
      total: 31080000,
      currency: 'IDR',
      createdByUserId: 'USR-001',
      approvedByUserId: 'USR-FINANCE-REVIEWER',
      approvedAt: context.at(-10, '11:00'),
      issuedAt: context.at(-10, '11:00'),
      dueAt: context.at(4, '23:59'),
      createdAt: seedNow,
      updatedAt: context.at(-9, '09:00')
    });
    insertIgnore(sqlite, 'invoice_line_items', {
      id: 'invoice-line-closed-djj-wmx-charter',
      invoiceId: 'inv-closed-djj-wmx',
      sourceType: 'CHARTER',
      sourceId: 'fop-closed-djj-wmx',
      description: `Charter AMA-${context.compactDate(-10)}-001 DJJ -> WMX`,
      quantity: 1,
      unitPrice: 28000000,
      subtotal: 28000000,
      rateCardId: 'rate-charter-djj-wmx',
      taxCodeId: 'tax-ppn',
      taxCode: 'PPN_11',
      taxRateBasisPoints: 1100,
      taxAmount: 3080000,
      total: 31080000
    });
    insertIgnore(sqlite, 'invoice_finance_snapshots', {
      id: 'invoice-snapshot-closed-djj-wmx',
      invoiceId: 'inv-closed-djj-wmx',
      flightOperationId: 'fop-closed-djj-wmx',
      ticketRevenue: 0,
      cargoRevenue: 0,
      charterRevenue: 28000000,
      totalRevenue: 28000000,
      fuelCost: 9250000,
      stationCost: 2750000,
      maintenanceCost: 0,
      totalOperationalCost: 12000000,
      taxAmount: 3080000,
      invoiceTotal: 31080000,
      grossMargin: 16000000,
      currencyCode: 'IDR',
      capturedAt: context.at(-10, '11:00')
    });
    insertIgnore(sqlite, 'payments', {
      id: 'pay-closed-djj-wmx',
      invoiceId: 'inv-closed-djj-wmx',
      amount: 10000000,
      currency: 'IDR',
      paidAt: context.at(-9, '09:00'),
      method: 'bank_transfer',
      reference: `BPD-TRF-${context.compactDate(-9)}-001`
    });
    sqlite
      .prepare(
        `UPDATE flight_finance_handoffs
         SET status_id = 'finance-handoff-status-posted', updated_at = ?
         WHERE id = 'fop-closed-djj-wmx-handoff-invoice'`
      )
      .run(seedNow);
    // === New CLOSED flights: readiness, fuel, station, maintenance, then finance ===
    seedReadiness(sqlite, context, 'fop-closed-pax-revenue');
    seedReadiness(sqlite, context, 'fop-closed-cargo-revenue');

    for (const closedId of ['fop-closed-pax-revenue', 'fop-closed-cargo-revenue']) {
      insertIgnore(sqlite, 'flight_finance_handoffs', {
        id: `${closedId}-handoff-invoice`,
        flightId: closedId,
        sourceType: 'flight',
        sourceId: closedId,
        eventTypeId: 'finance-event-type-flight-closed-eligible-for-invoice',
        statusId: 'finance-handoff-status-posted',
        summary: 'Closed flight is eligible for invoice generation in finance module.',
        amount: null,
        currencyId: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    // Fuel and station services for new closed flights
    for (const [flightId, stationId, supplierId] of [
      ['fop-closed-pax-revenue', 'st-djj', 'hp-angkasa-djj'],
      ['fop-closed-cargo-revenue', 'st-djj', 'hp-angkasa-djj']
    ] as const) {
      insertIgnore(sqlite, 'flight_fuel_requests', {
        id: `${flightId}-fuel`,
        flightId,
        fuelSupplierId: 'fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 500,
        approvedQuantityLitre: 500,
        actualUpliftLitre: 500,
        referencePricePerLitre: 18500,
        actualPricePerLitre: 18500,
        taxCodeId: 'tax-non-tax',
        taxAmount: 0,
        totalCost: 9250000,
        currencyId: 'cur-idr',
        statusId: 'fuel-workflow-status-posted',
        rejectionReason: null,
        varianceNote: null,
        requestedByUserId: 'USR-001',
        approvedByUserId: 'USR-ADMIN',
        upliftRecordedByUserId: 'USR-ADMIN',
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_service_requests', {
        id: `${flightId}-handling`,
        flightId,
        stationId,
        serviceSupplierId: supplierId,
        serviceTypeId: 'station-service-type-handling',
        statusId: 'station-service-status-confirmed',
        referenceRate: 2750000,
        confirmedAt: seedNow,
        confirmedByUserId: 'USR-ADMIN',
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_costs', {
        id: `${flightId}-station-cost`,
        flightId,
        stationId,
        vendorId: null,
        serviceSupplierId: supplierId,
        sourceServiceId: `${flightId}-handling`,
        costCategoryId: 'cost-handling',
        amount: 2750000,
        estimatedAmount: 2750000,
        actualAmount: 2750000,
        currencyId: 'cur-idr',
        description: 'Confirmed handling and station support cost.',
        vendorReference: `INV-${flightId.toUpperCase()}`,
        evidenceReference: `RECEIPT-${flightId.toUpperCase()}`,
        statusId: 'station-cost-status-approved',
        submittedByUserId: 'USR-STATION-ADMIN',
        submittedAt: seedNow,
        approvedByUserId: 'USR-FINANCE-REVIEWER',
        approvedAt: seedNow,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    // Maintenance handoffs for new closed flights
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-closed-pax-maintenance',
      flightId: 'fop-closed-pax-revenue',
      aircraftId: 'ac-pk-amb',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: `WO-AMA-${context.compactDate(-7)}-007`,
      maintenanceNote: 'Post-flight inspection clear for passenger service.',
      sparePartReference: null,
      maintenanceCost: 450000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-closed-cargo-maintenance',
      flightId: 'fop-closed-cargo-revenue',
      aircraftId: 'ac-pk-ama',
      serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
      workOrderReference: `WO-AMA-${context.compactDate(-3)}-008`,
      maintenanceNote: 'Post-flight inspection clear for cargo service.',
      sparePartReference: null,
      maintenanceCost: 800000,
      currencyId: 'cur-idr',
      statusId: 'maintenance-handoff-status-approved',
      recordedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedByUserId: 'USR-MAINTENANCE-MANAGER',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    // Now seed finance handoffs (fuel and station records exist at this point)
    seedFinance(sqlite, context, 'fop-closed-pax-revenue', 'READY');
    seedFinance(sqlite, context, 'fop-closed-cargo-revenue', 'READY');

    // Passenger flight invoice & snapshot
    insertIgnore(sqlite, 'invoices', {
      id: 'inv-closed-pax-revenue',
      customerId: 'cust-individual-1',
      flightOperationId: 'fop-closed-pax-revenue',
      invoiceNumber: `AMA-INV-${context.compactDate(-7)}-002`,
      status: 'paid',
      subtotal: 15400000,
      tax: 1694000,
      total: 17094000,
      currency: 'IDR',
      createdByUserId: 'USR-001',
      approvedByUserId: 'USR-FINANCE-REVIEWER',
      approvedAt: context.at(-7, '10:00'),
      issuedAt: context.at(-7, '10:00'),
      dueAt: context.at(-3, '23:59'),
      createdAt: seedNow,
      updatedAt: context.at(-5, '09:00')
    });
    insertIgnore(sqlite, 'invoice_line_items', {
      id: 'invoice-line-closed-pax-ticket',
      invoiceId: 'inv-closed-pax-revenue',
      sourceType: 'PASSENGER_TICKET',
      sourceId: 'fop-closed-pax-revenue',
      description: `Passenger tickets AMA-${context.compactDate(-7)}-016 DJJ -> WMX`,
      quantity: 4,
      unitPrice: 3850000,
      subtotal: 15400000,
      rateCardId: 'rate-passenger-djj-wmx',
      taxCodeId: 'tax-ppn',
      taxCode: 'PPN_11',
      taxRateBasisPoints: 1100,
      taxAmount: 1694000,
      total: 17094000
    });
    insertIgnore(sqlite, 'invoice_finance_snapshots', {
      id: 'invoice-snapshot-closed-pax-revenue',
      invoiceId: 'inv-closed-pax-revenue',
      flightOperationId: 'fop-closed-pax-revenue',
      ticketRevenue: 15400000,
      cargoRevenue: 0,
      charterRevenue: 0,
      totalRevenue: 15400000,
      fuelCost: 9250000,
      stationCost: 2750000,
      maintenanceCost: 450000,
      totalOperationalCost: 12450000,
      taxAmount: 1694000,
      invoiceTotal: 17094000,
      grossMargin: 2950000,
      currencyCode: 'IDR',
      capturedAt: context.at(-7, '10:00')
    });
    insertIgnore(sqlite, 'payments', {
      id: 'pay-closed-pax-revenue',
      invoiceId: 'inv-closed-pax-revenue',
      amount: 17094000,
      currency: 'IDR',
      paidAt: context.at(-5, '09:00'),
      method: 'bank_transfer',
      reference: `BPD-TRF-${context.compactDate(-5)}-002`
    });

    // Cargo flight invoice & snapshot
    insertIgnore(sqlite, 'invoices', {
      id: 'inv-closed-cargo-revenue',
      customerId: 'cust-cargo-partner',
      flightOperationId: 'fop-closed-cargo-revenue',
      invoiceNumber: `AMA-INV-${context.compactDate(-3)}-003`,
      status: 'issued',
      subtotal: 22000000,
      tax: 2420000,
      total: 24420000,
      currency: 'IDR',
      createdByUserId: 'USR-001',
      approvedByUserId: 'USR-FINANCE-REVIEWER',
      approvedAt: context.at(-3, '14:00'),
      issuedAt: context.at(-3, '14:00'),
      dueAt: context.at(4, '23:59'),
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'invoice_line_items', {
      id: 'invoice-line-closed-cargo-booking',
      invoiceId: 'inv-closed-cargo-revenue',
      sourceType: 'CARGO_BOOKING',
      sourceId: 'fop-closed-cargo-revenue',
      description: `Cargo bookings AMA-${context.compactDate(-3)}-017 DJJ -> TIM`,
      quantity: 1,
      unitPrice: 22000000,
      subtotal: 22000000,
      rateCardId: 'rate-cargo-djj-tim',
      taxCodeId: 'tax-ppn',
      taxCode: 'PPN_11',
      taxRateBasisPoints: 1100,
      taxAmount: 2420000,
      total: 24420000
    });
    insertIgnore(sqlite, 'invoice_finance_snapshots', {
      id: 'invoice-snapshot-closed-cargo-revenue',
      invoiceId: 'inv-closed-cargo-revenue',
      flightOperationId: 'fop-closed-cargo-revenue',
      ticketRevenue: 0,
      cargoRevenue: 22000000,
      charterRevenue: 0,
      totalRevenue: 22000000,
      fuelCost: 9250000,
      stationCost: 3200000,
      maintenanceCost: 800000,
      totalOperationalCost: 13250000,
      taxAmount: 2420000,
      invoiceTotal: 24420000,
      grossMargin: 8750000,
      currencyCode: 'IDR',
      capturedAt: context.at(-3, '14:00')
    });

    seedFinance(sqlite, context, 'fop-cancelled-fuel', 'VOID');
    insertIgnore(sqlite, 'flight_finance_handoffs', {
      id: 'fop-cancelled-fuel-void',
      flightId: 'fop-cancelled-fuel',
      sourceType: 'flight',
      sourceId: 'fop-cancelled-fuel',
      eventTypeId: 'finance-event-type-flight-cancelled-void-request',
      statusId: 'finance-handoff-status-void',
      summary: 'Cancellation marks related draft finance handoff as void.',
      amount: null,
      currencyId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    sqlite.exec(`UPDATE flight_station_costs
      SET approved_amount = COALESCE(approved_amount, actual_amount, amount),
          approved_currency_id = COALESCE(approved_currency_id, currency_id),
          approval_snapshot_json = COALESCE(
            approval_snapshot_json,
            json_object(
              'sourceType', 'STATION_COST',
              'sourceId', id,
              'snapshotSource', 'SCENARIO_SEED_BACKFILL',
              'approvedAmount', COALESCE(actual_amount, amount),
              'currencyId', currency_id,
              'approvedBy', approved_by_user_id,
              'approvedAt', approved_at
            )
          )
      WHERE status_id = 'station-cost-status-approved'`);
  });

  transaction();
}
