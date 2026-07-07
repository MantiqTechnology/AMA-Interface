import type Database from 'better-sqlite3';

const seedNow = '2026-07-07T09:00:00.000+07:00';

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

function insertHistory(
  sqlite: Database.Database,
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
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus,
    actionType: input.actionType,
    reasonId: input.reasonId ?? null,
    reasonNote: input.reasonNote ?? null,
    changedByUserId: 'USR-DEMO-ADMIN',
    changedAt: input.changedAt ?? seedNow,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null
  });
}

function seedManifests(sqlite: Database.Database, flightId: string) {
  insertIgnore(sqlite, 'flight_manifests', {
    id: `${flightId}-manifest-pax`,
    flightId,
    manifestType: 'PASSENGER',
    status: 'APPROVED',
    approvedByUserId: 'USR-DEMO-ADMIN',
    approvedAt: seedNow,
    lockedAt: flightId.includes('closed') ? '2026-07-07T10:30:00.000+07:00' : null,
    createdAt: seedNow,
    updatedAt: seedNow
  });
  insertIgnore(sqlite, 'flight_manifests', {
    id: `${flightId}-manifest-cargo`,
    flightId,
    manifestType: 'CARGO',
    status: 'APPROVED',
    approvedByUserId: 'USR-DEMO-ADMIN',
    approvedAt: seedNow,
    lockedAt: flightId.includes('closed') ? '2026-07-07T10:30:00.000+07:00' : null,
    createdAt: seedNow,
    updatedAt: seedNow
  });
}

function seedReadiness(
  sqlite: Database.Database,
  flightId: string,
  overrides: Partial<Record<string, { status: string; note: string }>> = {}
) {
  const checks = [
    ['AIRCRAFT_SERVICEABILITY', 'Aircraft serviceability', 'PASS', 'Aircraft is serviceable'],
    ['CREW_AVAILABILITY', 'Crew availability', 'PASS', 'No demo overlap detected'],
    ['CREW_LICENSE_MEDICAL', 'Crew license and medical', 'PASS', 'Crew licences are valid'],
    ['MANIFEST_APPROVED', 'Manifest approved', 'PASS', 'Passenger and cargo manifests approved'],
    ['DG_ACCEPTANCE', 'Dangerous goods acceptance', 'NOT_APPLICABLE', 'No DG cargo'],
    ['FUEL_CONFIRMED', 'Fuel confirmed', 'PASS', 'Fuel uplift confirmed'],
    ['HANDLING_CONFIRMED', 'Handling confirmed', 'PASS', 'Handling or parking confirmed'],
    ['SEPARATION_OF_DUTIES', 'Separation of duties', 'PASS', 'Creator and approver are different']
  ];

  for (const [code, name, status, note] of checks) {
    const override = overrides[code];
    insertIgnore(sqlite, 'flight_readiness_checks', {
      id: `${flightId}-check-${code.toLowerCase().replaceAll('_', '-')}`,
      flightId,
      checkCode: code,
      checkName: name,
      status: override?.status ?? status,
      isRequired: 1,
      evaluatedAt: seedNow,
      evaluatedByUserId: 'USR-DEMO-ADMIN',
      resultNote: override?.note ?? note,
      sourceReference: 'seed-demo',
      createdAt: seedNow,
      updatedAt: seedNow
    });
  }
}

function seedCrew(sqlite: Database.Database, flightId: string, picId: string, coPilotId: string) {
  insertIgnore(sqlite, 'flight_crew_assignments', {
    id: `${flightId}-crew-pic`,
    flightId,
    crewId: picId,
    assignmentRole: 'PILOT_IN_COMMAND',
    isPrimary: 1,
    createdAt: seedNow,
    updatedAt: seedNow
  });
  insertIgnore(sqlite, 'flight_crew_assignments', {
    id: `${flightId}-crew-cop`,
    flightId,
    crewId: coPilotId,
    assignmentRole: 'CO_PILOT',
    isPrimary: 1,
    createdAt: seedNow,
    updatedAt: seedNow
  });
}

function seedFinance(sqlite: Database.Database, flightId: string, status: string) {
  insertIgnore(sqlite, 'flight_finance_handoffs', {
    id: `${flightId}-handoff-fuel`,
    flightId,
    sourceType: 'fuel',
    sourceId: `${flightId}-fuel`,
    eventType: 'FUEL_COST_DRAFT',
    status,
    summary: 'Fuel uplift cost preview for finance handoff.',
    amount: 9250000,
    currencyId: 'ref-cur-idr',
    createdAt: seedNow,
    updatedAt: seedNow
  });
  insertIgnore(sqlite, 'flight_finance_handoffs', {
    id: `${flightId}-handoff-station`,
    flightId,
    sourceType: 'station_cost',
    sourceId: `${flightId}-station-cost`,
    eventType: 'STATION_COST_DRAFT',
    status,
    summary: 'Station handling and parking cost preview.',
    amount: 2750000,
    currencyId: 'ref-cur-idr',
    createdAt: seedNow,
    updatedAt: seedNow
  });
}

export function seedFlightOperationsData(sqlite: Database.Database) {
  const transaction = sqlite.transaction(() => {
    const flights = [
      {
        id: 'fop-closed-djj-wmx',
        flightNumber: 'AMA-20260707-001',
        flightDate: '2026-07-07',
        flightType: 'CHARTER',
        routeId: 'ref-route-djj-wmx',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: 'ref-cust-papua-logistics',
        aircraftId: 'ref-ac-pk-ama',
        pilotInCommandId: 'ref-crew-pic-valid',
        coPilotId: 'ref-crew-cop-valid',
        scheduledDepartureAt: '2026-07-07T08:00:00.000+07:00',
        scheduledArrivalAt: '2026-07-07T08:55:00.000+07:00',
        actualDepartureAt: '2026-07-07T08:08:00.000+07:00',
        actualArrivalAt: '2026-07-07T09:02:00.000+07:00',
        currentStatus: 'CLOSED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-DEMO-ADMIN',
        remarks: 'Closed end-to-end demo flight with finance handoff preview.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-blocked-crew-expired',
        flightNumber: 'AMA-20260707-002',
        flightDate: '2026-07-07',
        flightType: 'PASSENGER',
        routeId: 'ref-route-djj-wmx',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: 'ref-cust-individual-1',
        aircraftId: 'ref-ac-pk-ama',
        pilotInCommandId: 'ref-crew-pic-expired',
        coPilotId: 'ref-crew-cop-valid',
        scheduledDepartureAt: '2026-07-07T11:00:00.000+07:00',
        scheduledArrivalAt: '2026-07-07T11:55:00.000+07:00',
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'BLOCKED',
        createdByUserId: 'USR-001',
        approvedByUserId: null,
        remarks: 'Blocked by expired pilot licence/medical.',
        isLocked: 0,
        blockingReason: 'PIC licence or medical has expired.'
      },
      {
        id: 'fop-cancelled-fuel',
        flightNumber: 'AMA-20260707-003',
        flightDate: '2026-07-07',
        flightType: 'CHARTER',
        routeId: 'ref-route-djj-tim',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-tim',
        customerId: 'ref-cust-mission-air',
        aircraftId: 'ref-ac-pk-amb',
        pilotInCommandId: 'ref-crew-pic-valid',
        coPilotId: 'ref-crew-cop-valid-2',
        scheduledDepartureAt: '2026-07-07T13:00:00.000+07:00',
        scheduledArrivalAt: '2026-07-07T14:35:00.000+07:00',
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'CANCELLED',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-DEMO-ADMIN',
        remarks: 'Cancelled after fuel request was drafted.',
        isLocked: 1,
        blockingReason: null
      },
      {
        id: 'fop-dg-pending',
        flightNumber: 'AMA-20260707-004',
        flightDate: '2026-07-07',
        flightType: 'CARGO',
        routeId: 'ref-route-djj-wmx',
        originStationId: 'ref-st-djj',
        destinationStationId: 'ref-st-wmx',
        customerId: 'ref-cust-cargo-partner',
        aircraftId: 'ref-ac-pk-ama',
        pilotInCommandId: 'ref-crew-pic-valid',
        coPilotId: 'ref-crew-cop-valid',
        scheduledDepartureAt: '2026-07-07T15:00:00.000+07:00',
        scheduledArrivalAt: '2026-07-07T15:55:00.000+07:00',
        actualDepartureAt: null,
        actualArrivalAt: null,
        currentStatus: 'PENDING_READINESS',
        createdByUserId: 'USR-001',
        approvedByUserId: null,
        remarks: 'DG cargo is pending acceptance.',
        isLocked: 0,
        blockingReason: null
      },
      {
        id: 'fop-in-progress',
        flightNumber: 'AMA-20260707-005',
        flightDate: '2026-07-07',
        flightType: 'PASSENGER',
        routeId: 'ref-route-wmx-oks',
        originStationId: 'ref-st-wmx',
        destinationStationId: 'ref-st-oks',
        customerId: 'ref-cust-individual-2',
        aircraftId: 'ref-ac-pk-amb',
        pilotInCommandId: 'ref-crew-pic-expiring',
        coPilotId: 'ref-crew-cop-valid',
        scheduledDepartureAt: '2026-07-07T09:30:00.000+07:00',
        scheduledArrivalAt: '2026-07-07T10:05:00.000+07:00',
        actualDepartureAt: '2026-07-07T09:36:00.000+07:00',
        actualArrivalAt: null,
        currentStatus: 'IN_PROGRESS',
        createdByUserId: 'USR-001',
        approvedByUserId: 'USR-DEMO-ADMIN',
        remarks: 'Manual following demo flight.',
        isLocked: 0,
        blockingReason: null
      }
    ];

    for (const flight of flights) {
      insertIgnore(sqlite, 'flight_operations', {
        ...flight,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      seedCrew(sqlite, flight.id, flight.pilotInCommandId, flight.coPilotId);
      seedManifests(sqlite, flight.id);
      insertHistory(sqlite, {
        id: `${flight.id}-history-create`,
        flightId: flight.id,
        toStatus: 'DRAFT',
        actionType: 'CREATE',
        changedAt: '2026-07-07T07:00:00.000+07:00'
      });
      insertHistory(sqlite, {
        id: `${flight.id}-history-current`,
        flightId: flight.id,
        fromStatus: flight.currentStatus === 'CLOSED' ? 'PENDING_CLOSURE' : 'DRAFT',
        toStatus: flight.currentStatus,
        actionType: flight.currentStatus === 'CANCELLED' ? 'CANCEL' : 'READINESS_EVALUATED',
        reasonId: flight.currentStatus === 'CANCELLED' ? 'ref-reason-customer-request' : null,
        reasonNote:
          flight.currentStatus === 'CANCELLED' ? 'Customer requested movement change.' : null,
        changedAt: seedNow
      });
    }

    seedReadiness(sqlite, 'fop-closed-djj-wmx');
    seedReadiness(sqlite, 'fop-blocked-crew-expired', {
      CREW_LICENSE_MEDICAL: { status: 'FAIL', note: 'PIC licence or medical is expired.' },
      FUEL_CONFIRMED: { status: 'PENDING', note: 'Fuel request not confirmed.' },
      HANDLING_CONFIRMED: { status: 'PENDING', note: 'Handling not confirmed.' }
    });
    seedReadiness(sqlite, 'fop-cancelled-fuel', {
      FUEL_CONFIRMED: { status: 'PENDING', note: 'Fuel request voided by cancellation.' }
    });
    seedReadiness(sqlite, 'fop-dg-pending', {
      DG_ACCEPTANCE: { status: 'PENDING', note: 'DG cargo item requires acceptance.' },
      FUEL_CONFIRMED: { status: 'PENDING', note: 'Fuel request not yet posted.' },
      HANDLING_CONFIRMED: { status: 'PENDING', note: 'Handling confirmation pending.' }
    });
    seedReadiness(sqlite, 'fop-in-progress');

    insertIgnore(sqlite, 'flight_manifest_passengers', {
      id: 'fop-closed-pax-1',
      manifestId: 'fop-closed-djj-wmx-manifest-pax',
      fullName: 'Maria Demo Passenger',
      identityType: 'KTP',
      identityNumber: 'DEMO-001',
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
      description: 'Battery equipment demo cargo',
      senderName: 'Cargo Partner Demo',
      receiverName: 'Wamena Field Team',
      actualWeightKg: 84,
      volumeWeightKg: 92,
      chargeableWeightKg: 92,
      dgCategoryId: 'ref-dg-bat',
      dgAcceptanceStatus: 'PENDING',
      remarks: 'DG acceptance required before readiness pass.',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const flightId of ['fop-closed-djj-wmx', 'fop-cancelled-fuel', 'fop-in-progress']) {
      insertIgnore(sqlite, 'flight_fuel_requests', {
        id: `${flightId}-fuel`,
        flightId,
        fuelSupplierId:
          flightId === 'fop-in-progress' ? 'ref-fuel-pertamina-wmx' : 'ref-fuel-pertamina-djj',
        fuelType: 'AVTUR',
        requestedQuantityLitre: 500,
        approvedQuantityLitre: 500,
        actualUpliftLitre: flightId === 'fop-cancelled-fuel' ? null : 500,
        referencePricePerLitre: 18500,
        actualPricePerLitre: flightId === 'fop-cancelled-fuel' ? null : 18500,
        taxCodeId: 'ref-tax-non-tax',
        taxAmount: flightId === 'fop-cancelled-fuel' ? null : 0,
        totalCost: flightId === 'fop-cancelled-fuel' ? null : 9250000,
        status: flightId === 'fop-cancelled-fuel' ? 'REJECTED' : 'POSTED',
        rejectionReason: flightId === 'fop-cancelled-fuel' ? 'Flight cancelled.' : null,
        varianceNote: null,
        requestedByUserId: 'USR-001',
        approvedByUserId: 'USR-DEMO-ADMIN',
        upliftRecordedByUserId: 'USR-DEMO-ADMIN',
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const flightId of ['fop-closed-djj-wmx', 'fop-in-progress']) {
      insertIgnore(sqlite, 'flight_station_service_requests', {
        id: `${flightId}-handling`,
        flightId,
        stationId: flightId === 'fop-in-progress' ? 'ref-st-wmx' : 'ref-st-djj',
        serviceSupplierId:
          flightId === 'fop-in-progress' ? 'ref-hp-angkasa-tim' : 'ref-hp-angkasa-djj',
        serviceType: 'HANDLING',
        status: 'CONFIRMED',
        referenceRate: 2750000,
        confirmedAt: seedNow,
        confirmedByUserId: 'USR-DEMO-ADMIN',
        rejectionNote: null,
        createdAt: seedNow,
        updatedAt: seedNow
      });
      insertIgnore(sqlite, 'flight_station_costs', {
        id: `${flightId}-station-cost`,
        flightId,
        stationId: flightId === 'fop-in-progress' ? 'ref-st-wmx' : 'ref-st-djj',
        vendorId: 'ref-vendor-transport-wmx',
        costCategoryId: 'ref-cost-handling',
        amount: 2750000,
        currencyId: 'ref-cur-idr',
        description: 'Mock handling cost generated from confirmed station service.',
        status: 'APPROVED',
        submittedByUserId: 'USR-DEMO-ADMIN',
        approvedByUserId: 'USR-DEMO-ADMIN',
        approvedAt: seedNow,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'flight_maintenance_handoffs', {
      id: 'fop-closed-maintenance',
      flightId: 'fop-closed-djj-wmx',
      aircraftId: 'ref-ac-pk-ama',
      serviceabilityStatus: 'SERVICEABLE',
      workOrderReference: 'WO-DEMO-0707-001',
      maintenanceNote: 'Post-flight inspection clear.',
      sparePartReference: null,
      maintenanceCost: 0,
      currencyId: 'ref-cur-idr',
      status: 'APPROVED',
      recordedByUserId: 'USR-DEMO-ADMIN',
      approvedByUserId: 'USR-DEMO-ADMIN',
      approvedAt: seedNow,
      createdAt: seedNow,
      updatedAt: seedNow
    });

    seedFinance(sqlite, 'fop-closed-djj-wmx', 'READY');
    insertIgnore(sqlite, 'flight_finance_handoffs', {
      id: 'fop-closed-djj-wmx-handoff-invoice',
      flightId: 'fop-closed-djj-wmx',
      sourceType: 'flight',
      sourceId: 'fop-closed-djj-wmx',
      eventType: 'FLIGHT_CLOSED_ELIGIBLE_FOR_INVOICE',
      status: 'READY',
      summary: 'Closed flight is eligible for invoice generation in finance module.',
      amount: null,
      currencyId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    seedFinance(sqlite, 'fop-cancelled-fuel', 'VOID');
    insertIgnore(sqlite, 'flight_finance_handoffs', {
      id: 'fop-cancelled-fuel-void',
      flightId: 'fop-cancelled-fuel',
      sourceType: 'flight',
      sourceId: 'fop-cancelled-fuel',
      eventType: 'FLIGHT_CANCELLED_VOID_REQUEST',
      status: 'VOID',
      summary: 'Cancellation marks related draft finance handoff as void.',
      amount: null,
      currencyId: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
  });

  transaction();
}
