import type Database from 'better-sqlite3';
import { createAccountingService } from '../../features/finance/accounting';
import { createDemoSeedContext, type DemoSeedContext } from './context';

type Row = Record<string, string | number | null>;

const makerUserId = 'USR-FINANCE-REVIEWER';
const approverUserId = 'USR-DIRECTOR';

function insertIgnore(sqlite: Database.Database, table: string, row: Row) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${keys.map((key) => `@${key}`).join(', ')})`
    )
    .run(row);
}

function previousMonthEnd(date: string) {
  const anchor = new Date(`${date}T00:00:00.000Z`);
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0))
    .toISOString()
    .slice(0, 10);
}

function seedMonthEndPassengerService(sqlite: Database.Database, context: DemoSeedContext) {
  const paidAt = `${previousMonthEnd(context.date(0))}T16:00:00.000+09:00`;
  insertIgnore(sqlite, 'flight_operations', {
    id: 'finance-flight-month-crossing',
    orderNumber: `FO-${context.compactDate(-10)}-FIN-001`,
    flightRequestId: null,
    flightNumber: `AMA-${context.compactDate(-10)}-FIN`,
    flightDate: context.date(-10),
    flightTypeId: 'flight-type-passenger',
    serviceTypeId: 'flight-service-type-scheduled-passenger',
    requestSource: 'Published passenger schedule',
    priorityId: 'flight-priority-normal',
    routeId: 'route-djj-wmx',
    originStationId: 'st-djj',
    destinationStationId: 'st-wmx',
    customerId: 'cust-individual-1',
    aircraftId: 'ac-pk-ama',
    pilotInCommandId: 'crew-pic-valid',
    coPilotId: 'crew-cop-valid',
    scheduledDepartureAt: context.at(-10, '08:00'),
    scheduledArrivalAt: context.at(-10, '08:55'),
    actualDepartureAt: context.at(-10, '08:06'),
    actualArrivalAt: context.at(-10, '09:01'),
    currentStatusId: 'flight-operation-status-closed',
    createdByUserId: 'USR-ADMIN',
    approvedByUserId: 'USR-DIRECTOR',
    remarks: 'Closed scheduled passenger service for cross-period revenue recognition.',
    billingType: 'TICKET',
    estimatedRevenue: 2_100_000,
    currencyCode: 'IDR',
    isLocked: 1,
    blockingReason: null,
    createdAt: paidAt,
    updatedAt: context.at(-10, '09:30')
  });
  insertIgnore(sqlite, 'flight_manifests', {
    id: 'finance-flight-month-crossing-manifest-pax',
    flightOperationId: 'finance-flight-month-crossing',
    manifestTypeId: 'manifest-type-passenger',
    statusId: 'manifest-status-approved',
    approvedByUserId: 'USR-ADMIN',
    approvedAt: context.at(-10, '07:30'),
    lockedAt: context.at(-10, '07:40'),
    createdAt: paidAt,
    updatedAt: context.at(-10, '07:40')
  });
  insertIgnore(sqlite, 'flight_maintenance_handoffs', {
    id: 'finance-flight-month-crossing-maintenance',
    flightId: 'finance-flight-month-crossing',
    aircraftId: 'ac-pk-ama',
    serviceabilityStatusId: 'aircraft-serviceability-status-serviceable',
    workOrderReference: null,
    maintenanceNote: 'Post-flight inspection completed without findings.',
    sparePartReference: null,
    maintenanceCost: 0,
    currencyId: 'cur-idr',
    statusId: 'maintenance-handoff-status-approved',
    recordedByUserId: 'USR-MAINTENANCE-MANAGER',
    approvedByUserId: 'USR-MAINTENANCE-MANAGER',
    approvedAt: context.at(-10, '09:20'),
    createdAt: context.at(-10, '09:10'),
    updatedAt: context.at(-10, '09:20')
  });
  insertIgnore(sqlite, 'passenger_tickets', {
    id: 'finance-ticket-month-end-001',
    flightOperationId: 'finance-flight-month-crossing',
    passengerName: 'Maria Rumbiak',
    documentType: 'KTP',
    documentNumber: 'KTP-917101440001',
    seatNumber: '1A',
    passengerWeightKg: 68,
    baggageWeightKg: 12,
    ticketPrice: 2_100_000,
    rateCardId: 'rate-passenger-djj-wmx',
    taxCodeId: 'tax-non-tax',
    taxCode: 'NON_TAX',
    taxRateBasisPoints: 0,
    taxAmount: 0,
    totalAmount: 2_100_000,
    currencyCode: 'IDR',
    paymentStatus: 'PAID',
    paymentMethod: 'TRANSFER',
    paidAt,
    checkInStatus: 'CHECKED_IN',
    checkedInAt: context.at(-10, '07:20'),
    loyaltyMemberId: null,
    agentId: 'agent-djj-counter',
    ticketStatus: 'ACTIVE',
    createdAt: paidAt,
    updatedAt: context.at(-10, '09:15')
  });
  insertIgnore(sqlite, 'flight_manifest_passengers', {
    id: 'finance-flight-month-crossing-passenger',
    manifestId: 'finance-flight-month-crossing-manifest-pax',
    passengerTicketId: 'finance-ticket-month-end-001',
    fullName: 'Maria Rumbiak',
    identityType: 'KTP',
    identityNumber: 'KTP-917101440001',
    weightKg: 68,
    seatNumber: '1A',
    baggageWeightKg: 12,
    remarks: 'Cross-period revenue recognition passenger.',
    createdAt: paidAt,
    updatedAt: context.at(-10, '07:40')
  });
}

function seedComponentReceipt(sqlite: Database.Database, context: DemoSeedContext) {
  const receivedAt = context.at(-8, '09:00');
  const componentKeys = ['draft', 'approved', 'reversed', 'exception'] as const;

  insertIgnore(sqlite, 'inventory_purchase_requests', {
    id: 'inv-pr-finance-components',
    requestNumber: `PR-${context.compactDate(-8)}-FIN-COMP`,
    stationId: 'st-djj',
    requestReason: 'Procure serialized starter generators for scheduled heavy maintenance.',
    status: 'ORDERED',
    requestedByUserId: 'USR-MAINTENANCE-MANAGER',
    createdAt: context.at(-12, '09:00'),
    updatedAt: context.at(-9, '11:00')
  });
  for (const key of componentKeys) {
    insertIgnore(sqlite, 'inventory_purchase_request_lines', {
      id: `inv-prl-finance-component-${key}`,
      purchaseRequestId: 'inv-pr-finance-components',
      partId: 'inv-part-starter',
      quantity: 1,
      orderedQuantity: 1,
      requiredAt: context.date(-8),
      note: `Serialized component for ${key} accounting scenario.`
    });
  }
  insertIgnore(sqlite, 'inventory_purchase_orders', {
    id: 'inv-po-finance-components',
    orderNumber: `PO-${context.compactDate(-9)}-FIN-COMP`,
    purchaseRequestId: 'inv-pr-finance-components',
    vendorId: 'vendor-maintenance',
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000,
    expectedAt: context.date(-8),
    status: 'RECEIVED',
    rejectionReason: null,
    createdByUserId: 'USR-INVENTORY-CONTROLLER',
    approvedByUserId: 'USR-DIRECTOR',
    approvedAt: context.at(-9, '11:00'),
    createdAt: context.at(-10, '09:00'),
    updatedAt: receivedAt
  });
  for (const key of componentKeys) {
    insertIgnore(sqlite, 'inventory_purchase_order_lines', {
      id: `inv-pol-finance-component-${key}`,
      purchaseOrderId: 'inv-po-finance-components',
      purchaseRequestLineId: `inv-prl-finance-component-${key}`,
      partId: 'inv-part-starter',
      quantity: 1,
      receivedQuantity: 1,
      sourceUnitCostMinor: 25_000_000,
      baseUnitCostIdr: 25_000_000
    });
  }
  insertIgnore(sqlite, 'inventory_movements', {
    id: 'inv-move-finance-component-receipt',
    movementNumber: `MOV-${context.compactDate(-8)}-FIN-RECEIPT`,
    movementType: 'RECEIPT',
    sourceType: 'GOODS_RECEIPT',
    sourceId: 'inv-gr-finance-components',
    stationId: 'st-djj',
    destinationStationId: null,
    aircraftId: null,
    flightId: null,
    reason: 'Receipt of serialized starter generators for heavy maintenance scenarios.',
    status: 'POSTED',
    reversalOfMovementId: null,
    totalBaseValueIdr: 100_000_000,
    isFinalized: 0,
    createdByUserId: 'USR-INVENTORY-CONTROLLER',
    createdAt: receivedAt
  });
  for (const key of componentKeys) {
    const serialId = `inv-serial-starter-${key}`;
    const movementLineId = `inv-ml-finance-component-receipt-${key}`;
    insertIgnore(sqlite, 'inventory_serialized_parts', {
      id: serialId,
      partId: 'inv-part-starter',
      serialNumber: `SG-PC6-${key.toUpperCase()}-001`,
      lotId: null,
      binId: 'inv-bin-djj-usable',
      condition: 'SERVICEABLE',
      aircraftId: null,
      position: null,
      hoursSinceNew: 0,
      cyclesSinceNew: 0,
      certificateReference: `ARC-SG-${context.compactDate(-8)}-${key.toUpperCase()}`,
      certificateVerified: 1,
      createdAt: receivedAt,
      updatedAt: receivedAt
    });
    insertIgnore(sqlite, 'inventory_movement_lines', {
      id: movementLineId,
      movementId: 'inv-move-finance-component-receipt',
      partId: 'inv-part-starter',
      fromBinId: null,
      toBinId: 'inv-bin-djj-usable',
      lotId: null,
      serialId,
      conditionFrom: null,
      conditionTo: 'SERVICEABLE',
      quantity: 1,
      sourceUnitCostMinor: 25_000_000,
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      baseUnitCostIdr: 25_000_000,
      baseValueIdr: 25_000_000
    });
    insertIgnore(sqlite, 'inventory_cost_layers', {
      id: `inv-layer-finance-component-${key}`,
      partId: 'inv-part-starter',
      warehouseId: 'inv-wh-djj-main',
      lotId: null,
      serialId,
      sourceMovementLineId: movementLineId,
      originalQuantity: 1,
      remainingQuantity: 1,
      sourceUnitCostMinor: 25_000_000,
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      baseUnitCostIdr: 25_000_000,
      receivedAt
    });
  }
  sqlite
    .prepare(
      `UPDATE inventory_movements SET is_finalized = 1
       WHERE id = 'inv-move-finance-component-receipt'`
    )
    .run();
  insertIgnore(sqlite, 'inventory_stock_balances', {
    id: 'inv-bal-finance-components',
    partId: 'inv-part-starter',
    binId: 'inv-bin-djj-usable',
    lotKey: 'finance-components',
    lotId: null,
    condition: 'SERVICEABLE',
    onHandQuantity: 4,
    updatedAt: receivedAt
  });
  insertIgnore(sqlite, 'inventory_goods_receipts', {
    id: 'inv-gr-finance-components',
    receiptNumber: `GR-${context.compactDate(-8)}-FIN-COMP`,
    purchaseOrderId: 'inv-po-finance-components',
    warehouseId: 'inv-wh-djj-main',
    documentReference: `DO-FIN-COMP-${context.compactDate(-8)}`,
    receivedAt,
    status: 'POSTED',
    movementId: 'inv-move-finance-component-receipt',
    totalBaseValueIdr: 100_000_000,
    receivedByUserId: 'USR-INVENTORY-CONTROLLER',
    createdAt: receivedAt
  });
  for (const key of componentKeys) {
    insertIgnore(sqlite, 'inventory_goods_receipt_lines', {
      id: `inv-grl-finance-component-${key}`,
      goodsReceiptId: 'inv-gr-finance-components',
      purchaseOrderLineId: `inv-pol-finance-component-${key}`,
      binId: 'inv-bin-djj-usable',
      lotId: null,
      quantity: 1,
      movementLineId: `inv-ml-finance-component-receipt-${key}`
    });
  }
  insertIgnore(sqlite, 'inventory_accounting_events', {
    id: 'inv-ae-finance-component-receipt',
    eventType: 'INVENTORY_RECEIPT',
    sourceType: 'GOODS_RECEIPT',
    sourceId: 'inv-gr-finance-components',
    movementId: 'inv-move-finance-component-receipt',
    stationId: 'st-djj',
    aircraftId: null,
    flightId: null,
    currencyId: 'cur-idr',
    sourceAmountMinor: 100_000_000,
    exchangeRateToIdrMicros: 1_000_000,
    baseAmountIdr: 100_000_000,
    integrationStatus: 'PENDING_INTEGRATION',
    payloadJson: JSON.stringify({
      orderNumber: `PO-${context.compactDate(-9)}-FIN-COMP`,
      receiptNumber: `GR-${context.compactDate(-8)}-FIN-COMP`
    }),
    createdAt: receivedAt
  });
}

type ComponentScenario = {
  key: 'draft' | 'approved' | 'active' | 'reversed' | 'exception';
  amountMinor: number;
  readyOffset: number;
  technicalAcceptanceStatus: 'APPROVED' | 'PENDING';
  partId?: string;
  serialId?: string;
  installationId?: string;
  serialNumber?: string;
  capitalizationThresholdMinor?: number;
};

function seedComponentScenario(
  sqlite: Database.Database,
  context: DemoSeedContext,
  scenario: ComponentScenario
) {
  const { key, amountMinor, readyOffset, technicalAcceptanceStatus } = scenario;
  const partId = scenario.partId ?? 'inv-part-starter';
  const serialId = scenario.serialId ?? `inv-serial-starter-${key}`;
  const installationId = scenario.installationId ?? `inv-install-starter-${key}`;
  const serialNumber = scenario.serialNumber ?? `SG-PC6-${key.toUpperCase()}-001`;
  const componentPosition =
    partId === 'inv-part-brake-pc6'
      ? 'LEFT MAIN GEAR BRAKE'
      : `STARTER GENERATOR ${key.toUpperCase()}`;
  const movementId = `inv-move-component-${key}`;
  const installedAt = context.at(readyOffset, '08:30');

  insertIgnore(sqlite, 'inventory_serialized_parts', {
    id: serialId,
    partId,
    serialNumber,
    lotId: null,
    binId: null,
    condition: 'INSTALLED',
    aircraftId: 'ac-pk-ama',
    position: componentPosition,
    hoursSinceNew: 0,
    cyclesSinceNew: 0,
    certificateReference: `ARC-SG-${context.compactDate(readyOffset)}-${key.toUpperCase()}`,
    certificateVerified: 1,
    createdAt: installedAt,
    updatedAt: installedAt
  });
  sqlite
    .prepare(
      `UPDATE inventory_serialized_parts
       SET bin_id = NULL, condition = 'INSTALLED', aircraft_id = 'ac-pk-ama',
           position = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(componentPosition, installedAt, serialId);
  insertIgnore(sqlite, 'inventory_component_installations', {
    id: installationId,
    serialId,
    aircraftId: 'ac-pk-ama',
    position: componentPosition,
    installedAt,
    removedAt: null,
    hoursAtInstall: 1_480.5,
    cyclesAtInstall: 2_134,
    hoursAtRemove: null,
    cyclesAtRemove: null,
    removalReason: null,
    installedByUserId: 'USR-MAINTENANCE-MANAGER',
    removedByUserId: null
  });
  insertIgnore(sqlite, 'inventory_movements', {
    id: movementId,
    movementNumber: `MOV-${context.compactDate(readyOffset)}-FIN-${key.toUpperCase()}`,
    movementType: 'ISSUE',
    sourceType: 'COMPONENT_INSTALLATION',
    sourceId: installationId,
    stationId: 'st-djj',
    destinationStationId: null,
    aircraftId: 'ac-pk-ama',
    flightId: null,
    reason: `Heavy-maintenance component ready-for-use scenario: ${key}.`,
    status: 'POSTED',
    reversalOfMovementId: null,
    totalBaseValueIdr: amountMinor,
    isFinalized: 0,
    createdByUserId: 'USR-INVENTORY-CONTROLLER',
    createdAt: installedAt
  });
  insertIgnore(sqlite, 'inventory_movement_lines', {
    id: `inv-ml-component-${key}`,
    movementId,
    partId,
    fromBinId: 'inv-bin-djj-usable',
    toBinId: null,
    lotId: null,
    serialId,
    conditionFrom: 'SERVICEABLE',
    conditionTo: 'INSTALLED',
    quantity: 1,
    sourceUnitCostMinor: amountMinor,
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000,
    baseUnitCostIdr: amountMinor,
    baseValueIdr: amountMinor
  });
  sqlite.prepare('UPDATE inventory_movements SET is_finalized = 1 WHERE id = ?').run(movementId);
  insertIgnore(sqlite, 'inventory_accounting_events', {
    id: `inv-ae-component-${key}`,
    eventType: 'INVENTORY_COMPONENT_INSTALL',
    sourceType: 'COMPONENT_INSTALLATION',
    sourceId: serialId,
    movementId,
    stationId: 'st-djj',
    aircraftId: 'ac-pk-ama',
    flightId: null,
    currencyId: 'cur-idr',
    sourceAmountMinor: amountMinor,
    exchangeRateToIdrMicros: 1_000_000,
    baseAmountIdr: amountMinor,
    integrationStatus: 'PENDING_INTEGRATION',
    payloadJson: JSON.stringify({
      workOrderId: `WO-HEAVY-${context.compactDate(readyOffset)}-${key.toUpperCase()}`,
      workOrderCategory: 'HEAVY_MAINTENANCE',
      capitalizationCandidate: true,
      capitalizationThresholdMinor: scenario.capitalizationThresholdMinor ?? 10_000_000,
      expectedBenefitMonths: 60,
      technicalAcceptanceStatus,
      readyForUseDate: context.date(readyOffset)
    }),
    createdAt: installedAt
  });

  sqlite
    .prepare('UPDATE inventory_cost_layers SET remaining_quantity = 0 WHERE serial_id = ?')
    .run(serialId);
  sqlite
    .prepare(
      `UPDATE inventory_stock_balances
       SET on_hand_quantity = on_hand_quantity - 1, updated_at = ?
       WHERE id = ?`
    )
    .run(
      installedAt,
      serialId === 'inv-serial-brake-001' ? 'inv-bal-brake-djj' : 'inv-bal-finance-components'
    );
}

function seedPendingRoutineIssue(sqlite: Database.Database, context: DemoSeedContext) {
  const issuedAt = context.at(-1, '11:00');
  insertIgnore(sqlite, 'inventory_movements', {
    id: 'inv-move-maintenance-oil-pending',
    movementNumber: `MOV-${context.compactDate(-1)}-FIN-ROUTINE`,
    movementType: 'ISSUE',
    sourceType: 'MAINTENANCE_PART_ISSUE',
    sourceId: 'inv-issue-maintenance-oil-pending',
    stationId: 'st-djj',
    destinationStationId: null,
    aircraftId: 'ac-pk-ama',
    flightId: 'fop-landed-maintenance',
    reason: 'Engine oil issued for a routine top-up after inspection.',
    status: 'POSTED',
    reversalOfMovementId: null,
    totalBaseValueIdr: 350_000,
    isFinalized: 0,
    createdByUserId: 'USR-INVENTORY-CONTROLLER',
    createdAt: issuedAt
  });
  insertIgnore(sqlite, 'inventory_movement_lines', {
    id: 'inv-ml-maintenance-oil-pending',
    movementId: 'inv-move-maintenance-oil-pending',
    partId: 'inv-part-oil',
    fromBinId: 'inv-bin-djj-usable',
    toBinId: null,
    lotId: 'inv-lot-oil-260701',
    serialId: null,
    conditionFrom: 'SERVICEABLE',
    conditionTo: null,
    quantity: 2,
    sourceUnitCostMinor: 175_000,
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000,
    baseUnitCostIdr: 175_000,
    baseValueIdr: 350_000
  });
  sqlite
    .prepare(
      `UPDATE inventory_movements SET is_finalized = 1
       WHERE id = 'inv-move-maintenance-oil-pending'`
    )
    .run();
  insertIgnore(sqlite, 'maintenance_part_issues', {
    id: 'inv-issue-maintenance-oil-pending',
    issueNumber: `ISS-${context.compactDate(-1)}-FIN-002`,
    maintenanceHandoffId: 'maintenance-landed-filter-draft',
    targetType: 'AIRCRAFT',
    targetId: 'ac-pk-ama',
    assetMaintenanceWorkOrderId: null,
    aircraftId: 'ac-pk-ama',
    flightId: 'fop-landed-maintenance',
    warehouseId: 'inv-wh-djj-main',
    reason: 'Routine engine-oil top-up.',
    movementId: 'inv-move-maintenance-oil-pending',
    status: 'ISSUED',
    totalPartsValueIdr: 350_000,
    issuedByUserId: 'USR-INVENTORY-CONTROLLER',
    issuedAt
  });
  insertIgnore(sqlite, 'maintenance_part_issue_lines', {
    id: 'inv-issue-line-maintenance-oil-pending',
    issueId: 'inv-issue-maintenance-oil-pending',
    partId: 'inv-part-oil',
    quantity: 2,
    baseValueIdr: 350_000,
    note: 'Pending finance approval scenario.'
  });
  insertIgnore(sqlite, 'inventory_accounting_events', {
    id: 'inv-ae-maintenance-oil-pending',
    eventType: 'INVENTORY_MAINTENANCE_ISSUE',
    sourceType: 'MAINTENANCE_PART_ISSUE',
    sourceId: 'inv-issue-maintenance-oil-pending',
    movementId: 'inv-move-maintenance-oil-pending',
    stationId: 'st-djj',
    aircraftId: 'ac-pk-ama',
    flightId: 'fop-landed-maintenance',
    currencyId: 'cur-idr',
    sourceAmountMinor: 350_000,
    exchangeRateToIdrMicros: 1_000_000,
    baseAmountIdr: 350_000,
    integrationStatus: 'PENDING_INTEGRATION',
    payloadJson: JSON.stringify({
      maintenanceHandoffId: 'maintenance-landed-filter-draft',
      maintenanceCategory: 'ROUTINE'
    }),
    createdAt: issuedAt
  });
  sqlite
    .prepare(
      `UPDATE inventory_stock_balances SET on_hand_quantity = 28, updated_at = ?
       WHERE id = 'inv-bal-oil-djj'`
    )
    .run(issuedAt);
  sqlite
    .prepare(
      `UPDATE inventory_cost_layers SET remaining_quantity = 28
       WHERE id = 'inv-layer-oil'`
    )
    .run();
}

function restoreReversedComponentToInventory(sqlite: Database.Database, context: DemoSeedContext) {
  insertIgnore(sqlite, 'inventory_movements', {
    id: 'inv-move-component-reversed-return',
    movementNumber: `MOV-${context.compactDate(0)}-FIN-RETURN`,
    movementType: 'REVERSAL',
    sourceType: 'COMPONENT_INSTALLATION_REVERSAL',
    sourceId: 'inv-install-starter-reversed',
    stationId: 'st-djj',
    destinationStationId: null,
    aircraftId: 'ac-pk-ama',
    flightId: null,
    reason: 'Return component to stores after capitalization reversal.',
    status: 'POSTED',
    reversalOfMovementId: 'inv-move-component-reversed',
    totalBaseValueIdr: 25_000_000,
    isFinalized: 0,
    createdByUserId: 'USR-INVENTORY-CONTROLLER',
    createdAt: context.now
  });
  insertIgnore(sqlite, 'inventory_movement_lines', {
    id: 'inv-ml-component-reversed-return',
    movementId: 'inv-move-component-reversed-return',
    partId: 'inv-part-starter',
    fromBinId: null,
    toBinId: 'inv-bin-djj-usable',
    lotId: null,
    serialId: 'inv-serial-starter-reversed',
    conditionFrom: 'INSTALLED',
    conditionTo: 'SERVICEABLE',
    quantity: 1,
    sourceUnitCostMinor: 25_000_000,
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000,
    baseUnitCostIdr: 25_000_000,
    baseValueIdr: 25_000_000
  });
  sqlite
    .prepare(
      `UPDATE inventory_movements SET is_finalized = 1
       WHERE id = 'inv-move-component-reversed-return'`
    )
    .run();
  sqlite
    .prepare(
      `UPDATE inventory_serialized_parts
       SET bin_id = 'inv-bin-djj-usable', condition = 'SERVICEABLE', aircraft_id = NULL,
           position = NULL, updated_at = ?
       WHERE id = 'inv-serial-starter-reversed'`
    )
    .run(context.now);
  sqlite
    .prepare(
      `UPDATE inventory_component_installations
       SET removed_at = ?, hours_at_remove = hours_at_install,
           cycles_at_remove = cycles_at_install,
           removal_reason = 'Capitalization reversed after cost allocation review',
           removed_by_user_id = 'USR-MAINTENANCE-MANAGER'
       WHERE id = 'inv-install-starter-reversed'`
    )
    .run(context.now);
  sqlite
    .prepare(
      `UPDATE inventory_cost_layers SET remaining_quantity = 1
       WHERE id = 'inv-layer-finance-component-reversed'`
    )
    .run();
  sqlite
    .prepare(
      `UPDATE inventory_stock_balances
       SET on_hand_quantity = on_hand_quantity + 1, updated_at = ?
       WHERE id = 'inv-bal-finance-components'`
    )
    .run(context.now);
}

function journalId(sqlite: Database.Database, sourceType: string, sourceId: string) {
  const row = sqlite
    .prepare(
      `SELECT id FROM journal_entries
       WHERE source_type = ? AND source_id = ?
       ORDER BY journal_number DESC LIMIT 1`
    )
    .get(sourceType, sourceId) as { id: string } | undefined;
  if (!row) throw new Error(`Accounting scenario journal is missing for ${sourceType}:${sourceId}`);
  return row.id;
}

export function seedAccountingScenarioData(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const completed = sqlite
    .prepare(
      `SELECT 1 FROM accounting_events
       WHERE event_type = 'PASSENGER_SERVICE_FULFILLED'
         AND source_id = 'finance-ticket-month-end-001'
         AND posting_status = 'POSTED'`
    )
    .get();
  if (completed) return;

  const seed = sqlite.transaction(() => {
    seedMonthEndPassengerService(sqlite, context);
    seedComponentReceipt(sqlite, context);
    seedPendingRoutineIssue(sqlite, context);
    for (const scenario of [
      {
        key: 'draft',
        amountMinor: 25_000_000,
        readyOffset: -5,
        technicalAcceptanceStatus: 'APPROVED'
      },
      {
        key: 'approved',
        amountMinor: 25_000_000,
        readyOffset: -6,
        technicalAcceptanceStatus: 'APPROVED'
      },
      {
        key: 'active',
        amountMinor: 3_200_000,
        readyOffset: -4,
        technicalAcceptanceStatus: 'APPROVED',
        partId: 'inv-part-brake-pc6',
        serialId: 'inv-serial-brake-001',
        installationId: 'inv-install-brake-active',
        serialNumber: 'BRAKE-PC6-0001',
        capitalizationThresholdMinor: 2_000_000
      },
      {
        key: 'reversed',
        amountMinor: 25_000_000,
        readyOffset: -3,
        technicalAcceptanceStatus: 'APPROVED'
      },
      {
        key: 'exception',
        amountMinor: 25_000_000,
        readyOffset: -2,
        technicalAcceptanceStatus: 'PENDING'
      }
    ] satisfies ComponentScenario[]) {
      seedComponentScenario(sqlite, context, scenario);
    }

    const accounting = createAccountingService(sqlite, () => context.now);
    accounting.processInventoryEvents({ batchSize: 100 }, makerUserId);

    for (const receiptId of ['inv-gr-finance-components', 'inv-gr-replenishment-001']) {
      const receiptJournalId = journalId(sqlite, 'GOODS_RECEIPT', receiptId);
      accounting.submitJournal(receiptJournalId, makerUserId);
      accounting.approveJournal(receiptJournalId, approverUserId);
      accounting.postJournal(receiptJournalId, makerUserId);
    }

    const routineJournalId = journalId(
      sqlite,
      'MAINTENANCE_PART_ISSUE',
      'inv-issue-maintenance-filter-001'
    );
    accounting.submitJournal(routineJournalId, makerUserId);
    accounting.approveJournal(routineJournalId, approverUserId);
    accounting.postJournal(routineJournalId, makerUserId);

    const pendingRoutineJournalId = journalId(
      sqlite,
      'MAINTENANCE_PART_ISSUE',
      'inv-issue-maintenance-oil-pending'
    );
    accounting.submitJournal(pendingRoutineJournalId, makerUserId);

    const approvedJournalId = journalId(
      sqlite,
      'COMPONENT_INSTALLATION',
      'inv-install-starter-approved'
    );
    accounting.submitJournal(approvedJournalId, makerUserId);
    accounting.approveJournal(approvedJournalId, approverUserId);

    const activeJournalId = journalId(sqlite, 'COMPONENT_INSTALLATION', 'inv-install-brake-active');
    accounting.submitJournal(activeJournalId, makerUserId);
    accounting.approveJournal(activeJournalId, approverUserId);
    accounting.postJournal(activeJournalId, makerUserId);

    const reversedJournalId = journalId(
      sqlite,
      'COMPONENT_INSTALLATION',
      'inv-install-starter-reversed'
    );
    accounting.submitJournal(reversedJournalId, makerUserId);
    accounting.approveJournal(reversedJournalId, approverUserId);
    accounting.postJournal(reversedJournalId, makerUserId);
    accounting.reverseJournal(
      reversedJournalId,
      {
        reason: 'Technical review identified an incorrect component cost allocation.',
        postingDate: context.date(0)
      },
      approverUserId
    );
    restoreReversedComponentToInventory(sqlite, context);

    accounting.postDemoEvents({ source: 'ticketing' }, makerUserId);
    accounting.fulfillPassengerServicesForFlight('finance-flight-month-crossing', makerUserId);
  });
  seed.immediate();
}
