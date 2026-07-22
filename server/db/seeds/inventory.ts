import type Database from 'better-sqlite3';
import { createDemoSeedContext, type DemoSeedContext } from './context';

type Row = Record<string, string | number | boolean | null>;

function insertIgnore(sqlite: Database.Database, table: string, row: Row) {
  const keys = Object.keys(row);
  const columns = keys.map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`));
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${keys.map((key) => `@${key}`).join(', ')})`
    )
    .run(row);
}

export function seedInventoryData(
  sqlite: Database.Database,
  context: DemoSeedContext = createDemoSeedContext()
) {
  const seedNow = context.now;
  const purchaseRequestNumber = `PR-${context.compactDate(0)}-001`;
  const purchaseOrderNumber = `PO-${context.compactDate(0)}-001`;
  const movementNumber = `MOV-${context.compactDate(0)}-001`;
  const receiptNumber = `GR-${context.compactDate(0)}-001`;
  const seed = sqlite.transaction(() => {
    const parts = [
      {
        id: 'inv-part-filter-pc6',
        partNumber: 'SP-PC6-FLT-1001',
        partName: 'PC-6 Engine Oil Filter',
        description: 'Critical scheduled-replacement filter for the PC-6 fleet.',
        manufacturer: 'Papua Aero Components',
        manufacturerPartNumber: 'DAC-PC6-OF-01',
        unitOfMeasure: 'EA',
        lifecycleType: 'CONSUMABLE',
        trackingType: 'LOT',
        criticality: 'CRITICAL',
        certificateRequired: 1,
        shelfLifeDays: 730
      },
      {
        id: 'inv-part-brake-pc6',
        partNumber: 'SP-PC6-BRK-2001',
        partName: 'PC-6 Brake Assembly',
        description: 'Serialized repairable brake assembly.',
        manufacturer: 'Papua Aero Components',
        manufacturerPartNumber: 'DAC-PC6-BA-01',
        unitOfMeasure: 'EA',
        lifecycleType: 'REPAIRABLE',
        trackingType: 'SERIAL',
        criticality: 'CRITICAL',
        certificateRequired: 1,
        shelfLifeDays: null
      },
      {
        id: 'inv-part-oil',
        partNumber: 'MAT-LUB-15W50',
        partName: 'Aviation Engine Oil',
        description: 'General aviation engine oil in one-litre units.',
        manufacturer: 'Nusantara Aviation Lubricants',
        manufacturerPartNumber: 'DL-AVI-100',
        unitOfMeasure: 'L',
        lifecycleType: 'CONSUMABLE',
        trackingType: 'LOT',
        criticality: 'ESSENTIAL',
        certificateRequired: 0,
        shelfLifeDays: 1095
      },
      {
        id: 'inv-part-starter',
        partNumber: 'SP-PC6-STG-3001',
        partName: 'Starter Generator',
        description: 'Serialized rotable starter generator installed on PK-AMA.',
        manufacturer: 'Nusantara Aero Electric',
        manufacturerPartNumber: 'DAE-SG-100',
        unitOfMeasure: 'EA',
        lifecycleType: 'ROTABLE',
        trackingType: 'SERIAL',
        criticality: 'CRITICAL',
        certificateRequired: 1,
        shelfLifeDays: null
      }
    ];
    for (const part of parts) {
      insertIgnore(sqlite, 'inventory_parts', {
        ...part,
        isActive: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const [id, partId, type, model] of [
      ['inv-app-filter-pc6', 'inv-part-filter-pc6', 'Pilatus PC-6', 'PC-6 Porter'],
      ['inv-app-brake-pc6', 'inv-part-brake-pc6', 'Pilatus PC-6', 'PC-6 Porter'],
      ['inv-app-oil-pc6', 'inv-part-oil', 'Pilatus PC-6', null],
      ['inv-app-starter-pc6', 'inv-part-starter', 'Pilatus PC-6', null]
    ] as const) {
      insertIgnore(sqlite, 'inventory_part_applicabilities', {
        id,
        partId,
        aircraftType: type,
        model,
        note: 'Approved aircraft applicability.'
      });
    }

    for (const warehouse of [
      ['inv-wh-djj-main', 'st-djj', 'DJJ-MAIN', 'Jayapura Main Stores'],
      ['inv-wh-wmx-main', 'st-wmx', 'WMX-MAIN', 'Wamena Line Stores']
    ] as const) {
      insertIgnore(sqlite, 'inventory_warehouses', {
        id: warehouse[0],
        stationId: warehouse[1],
        warehouseCode: warehouse[2],
        warehouseName: warehouse[3],
        isActive: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const bin of [
      ['inv-bin-djj-usable', 'inv-wh-djj-main', 'USABLE-A', 'Serviceable Stock', 'USABLE'],
      ['inv-bin-djj-quarantine', 'inv-wh-djj-main', 'QUARANTINE', 'Quarantine Hold', 'QUARANTINE'],
      ['inv-bin-djj-repair', 'inv-wh-djj-main', 'REPAIR', 'Repair Control', 'REPAIR'],
      ['inv-bin-djj-transit', 'inv-wh-djj-main', 'TRANSIT', 'Transfer Transit', 'TRANSIT'],
      ['inv-bin-wmx-usable', 'inv-wh-wmx-main', 'USABLE-A', 'Serviceable Stock', 'USABLE'],
      ['inv-bin-wmx-quarantine', 'inv-wh-wmx-main', 'QUARANTINE', 'Quarantine Hold', 'QUARANTINE']
    ] as const) {
      insertIgnore(sqlite, 'inventory_bins', {
        id: bin[0],
        warehouseId: bin[1],
        binCode: bin[2],
        binName: bin[3],
        binType: bin[4],
        isActive: 1,
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    for (const rule of [
      ['inv-rule-filter-djj', 'inv-part-filter-pc6', 'inv-wh-djj-main', 4, 6, 20, 14],
      ['inv-rule-brake-djj', 'inv-part-brake-pc6', 'inv-wh-djj-main', 1, 1, 3, 30],
      ['inv-rule-oil-djj', 'inv-part-oil', 'inv-wh-djj-main', 10, 12, 60, 7],
      ['inv-rule-filter-wmx', 'inv-part-filter-pc6', 'inv-wh-wmx-main', 2, 3, 10, 21]
    ] as const) {
      insertIgnore(sqlite, 'inventory_reorder_rules', {
        id: rule[0],
        partId: rule[1],
        warehouseId: rule[2],
        minimumQuantity: rule[3],
        reorderPoint: rule[4],
        maximumQuantity: rule[5],
        leadTimeDays: rule[6],
        createdAt: seedNow,
        updatedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'inventory_purchase_requests', {
      id: 'inv-pr-replenishment-001',
      requestNumber: purchaseRequestNumber,
      stationId: 'st-djj',
      requestReason: 'Replenish scheduled maintenance stock for the PC-6 fleet.',
      status: 'ORDERED',
      requestedByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const line of [
      ['inv-prl-filter', 'inv-part-filter-pc6', 20, context.date(3)],
      ['inv-prl-brake', 'inv-part-brake-pc6', 1, context.date(8)],
      ['inv-prl-oil', 'inv-part-oil', 30, context.date(1)]
    ] as const) {
      insertIgnore(sqlite, 'inventory_purchase_request_lines', {
        id: line[0],
        purchaseRequestId: 'inv-pr-replenishment-001',
        partId: line[1],
        quantity: line[2],
        orderedQuantity: line[2],
        requiredAt: line[3],
        note: 'Scheduled replenishment requirement.'
      });
    }

    insertIgnore(sqlite, 'inventory_purchase_orders', {
      id: 'inv-po-replenishment-001',
      orderNumber: purchaseOrderNumber,
      purchaseRequestId: 'inv-pr-replenishment-001',
      vendorId: 'vendor-maintenance',
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      expectedAt: context.date(1),
      status: 'PARTIALLY_RECEIVED',
      rejectionReason: null,
      createdByUserId: 'USR-INVENTORY-CONTROLLER',
      approvedByUserId: 'USR-DIRECTOR',
      approvedAt: context.at(-1, '11:00'),
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const line of [
      ['inv-pol-filter', 'inv-prl-filter', 'inv-part-filter-pc6', 20, 12, 950_000],
      ['inv-pol-brake', 'inv-prl-brake', 'inv-part-brake-pc6', 1, 1, 3_200_000],
      ['inv-pol-oil', 'inv-prl-oil', 'inv-part-oil', 30, 30, 175_000]
    ] as const) {
      insertIgnore(sqlite, 'inventory_purchase_order_lines', {
        id: line[0],
        purchaseOrderId: 'inv-po-replenishment-001',
        purchaseRequestLineId: line[1],
        partId: line[2],
        quantity: line[3],
        receivedQuantity: line[4],
        sourceUnitCostMinor: line[5],
        baseUnitCostIdr: line[5]
      });
    }

    insertIgnore(sqlite, 'inventory_lots', {
      id: 'inv-lot-filter-260701',
      partId: 'inv-part-filter-pc6',
      lotNumber: 'LOT-PC6-260701',
      manufacturedAt: '2026-06-20',
      expiresAt: '2028-06-19',
      certificateReference: 'ARC-PC6-260701',
      certificateVerified: 1,
      receiptLineId: 'inv-grl-filter',
      createdAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_lots', {
      id: 'inv-lot-brake-260701',
      partId: 'inv-part-brake-pc6',
      lotNumber: 'LOT-BRAKE-260701',
      manufacturedAt: '2026-05-15',
      expiresAt: null,
      certificateReference: 'ARC-BRK-260701',
      certificateVerified: 1,
      receiptLineId: 'inv-grl-brake',
      createdAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_lots', {
      id: 'inv-lot-oil-260701',
      partId: 'inv-part-oil',
      lotNumber: 'LOT-OIL-260701',
      manufacturedAt: '2026-06-01',
      expiresAt: '2029-05-31',
      certificateReference: null,
      certificateVerified: 0,
      receiptLineId: 'inv-grl-oil',
      createdAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_serialized_parts', {
      id: 'inv-serial-brake-001',
      partId: 'inv-part-brake-pc6',
      serialNumber: 'BRAKE-PC6-0001',
      lotId: 'inv-lot-brake-260701',
      binId: 'inv-bin-djj-usable',
      condition: 'SERVICEABLE',
      aircraftId: null,
      position: null,
      hoursSinceNew: 0,
      cyclesSinceNew: 0,
      certificateReference: 'ARC-BRK-260701',
      certificateVerified: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_serialized_parts', {
      id: 'inv-serial-starter-installed',
      partId: 'inv-part-starter',
      serialNumber: 'SG-PC6-AMA-001',
      lotId: null,
      binId: null,
      condition: 'INSTALLED',
      aircraftId: 'ac-pk-ama',
      position: 'ENGINE STARTER GENERATOR',
      hoursSinceNew: 1480.5,
      cyclesSinceNew: 2134,
      certificateReference: 'ARC-SG-260115',
      certificateVerified: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_component_installations', {
      id: 'inv-install-starter-pk-ama',
      serialId: 'inv-serial-starter-installed',
      aircraftId: 'ac-pk-ama',
      position: 'ENGINE STARTER GENERATOR',
      installedAt: context.at(-180, '08:00'),
      removedAt: null,
      hoursAtInstall: 1200,
      cyclesAtInstall: 1775,
      hoursAtRemove: null,
      cyclesAtRemove: null,
      removalReason: null,
      installedByUserId: 'USR-MAINTENANCE-MANAGER',
      removedByUserId: null
    });

    const receiptTotal = 12 * 950_000 + 3_200_000 + 30 * 175_000;
    const scenarioMovementExists = sqlite
      .prepare(`SELECT 1 FROM inventory_movements WHERE id = 'inv-move-receipt-001'`)
      .get();
    if (!scenarioMovementExists) {
      insertIgnore(sqlite, 'inventory_movements', {
        id: 'inv-move-receipt-001',
        movementNumber,
        movementType: 'RECEIPT',
        sourceType: 'GOODS_RECEIPT',
        sourceId: 'inv-gr-replenishment-001',
        stationId: 'st-djj',
        destinationStationId: null,
        aircraftId: null,
        flightId: null,
        reason: `Posted receipt for ${purchaseOrderNumber}.`,
        status: 'POSTED',
        reversalOfMovementId: null,
        totalBaseValueIdr: receiptTotal,
        isFinalized: 0,
        createdByUserId: 'USR-INVENTORY-CONTROLLER',
        createdAt: seedNow
      });

      for (const line of [
        ['inv-ml-filter', 'inv-part-filter-pc6', 'inv-lot-filter-260701', null, 12, 950_000],
        [
          'inv-ml-brake',
          'inv-part-brake-pc6',
          'inv-lot-brake-260701',
          'inv-serial-brake-001',
          1,
          3_200_000
        ],
        ['inv-ml-oil', 'inv-part-oil', 'inv-lot-oil-260701', null, 30, 175_000]
      ] as const) {
        insertIgnore(sqlite, 'inventory_movement_lines', {
          id: line[0],
          movementId: 'inv-move-receipt-001',
          partId: line[1],
          fromBinId: null,
          toBinId: 'inv-bin-djj-usable',
          lotId: line[2],
          serialId: line[3],
          conditionFrom: null,
          conditionTo: 'SERVICEABLE',
          quantity: line[4],
          sourceUnitCostMinor: line[5],
          currencyId: 'cur-idr',
          exchangeRateToIdrMicros: 1_000_000,
          baseUnitCostIdr: line[5],
          baseValueIdr: line[4] * line[5]
        });
      }
      sqlite
        .prepare(
          `UPDATE inventory_movements SET is_finalized = 1
           WHERE id = 'inv-move-receipt-001' AND is_finalized = 0`
        )
        .run();
    }

    for (const balance of [
      [
        'inv-bal-filter-djj',
        'inv-part-filter-pc6',
        'inv-lot-filter-260701',
        'inv-lot-filter-260701',
        12
      ],
      [
        'inv-bal-brake-djj',
        'inv-part-brake-pc6',
        'inv-lot-brake-260701',
        'inv-lot-brake-260701',
        1
      ],
      ['inv-bal-oil-djj', 'inv-part-oil', 'inv-lot-oil-260701', 'inv-lot-oil-260701', 30]
    ] as const) {
      insertIgnore(sqlite, 'inventory_stock_balances', {
        id: balance[0],
        partId: balance[1],
        binId: 'inv-bin-djj-usable',
        lotKey: balance[2],
        lotId: balance[3],
        condition: 'SERVICEABLE',
        onHandQuantity: balance[4],
        updatedAt: seedNow
      });
    }

    for (const layer of [
      [
        'inv-layer-filter',
        'inv-part-filter-pc6',
        'inv-lot-filter-260701',
        null,
        'inv-ml-filter',
        12,
        950_000
      ],
      [
        'inv-layer-brake',
        'inv-part-brake-pc6',
        'inv-lot-brake-260701',
        'inv-serial-brake-001',
        'inv-ml-brake',
        1,
        3_200_000
      ],
      ['inv-layer-oil', 'inv-part-oil', 'inv-lot-oil-260701', null, 'inv-ml-oil', 30, 175_000]
    ] as const) {
      insertIgnore(sqlite, 'inventory_cost_layers', {
        id: layer[0],
        partId: layer[1],
        warehouseId: 'inv-wh-djj-main',
        lotId: layer[2],
        serialId: layer[3],
        sourceMovementLineId: layer[4],
        originalQuantity: layer[5],
        remainingQuantity: layer[5],
        sourceUnitCostMinor: layer[6],
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000,
        baseUnitCostIdr: layer[6],
        receivedAt: seedNow
      });
    }

    insertIgnore(sqlite, 'inventory_goods_receipts', {
      id: 'inv-gr-replenishment-001',
      receiptNumber,
      purchaseOrderId: 'inv-po-replenishment-001',
      warehouseId: 'inv-wh-djj-main',
      documentReference: 'DO-AMA-0707-001',
      receivedAt: seedNow,
      status: 'POSTED',
      movementId: 'inv-move-receipt-001',
      totalBaseValueIdr: receiptTotal,
      receivedByUserId: 'USR-INVENTORY-CONTROLLER',
      createdAt: seedNow
    });
    for (const line of [
      ['inv-grl-filter', 'inv-pol-filter', 'inv-lot-filter-260701', 12, 'inv-ml-filter'],
      ['inv-grl-brake', 'inv-pol-brake', 'inv-lot-brake-260701', 1, 'inv-ml-brake'],
      ['inv-grl-oil', 'inv-pol-oil', 'inv-lot-oil-260701', 30, 'inv-ml-oil']
    ] as const) {
      insertIgnore(sqlite, 'inventory_goods_receipt_lines', {
        id: line[0],
        goodsReceiptId: 'inv-gr-replenishment-001',
        purchaseOrderLineId: line[1],
        binId: 'inv-bin-djj-usable',
        lotId: line[2],
        quantity: line[3],
        movementLineId: line[4]
      });
    }

    insertIgnore(sqlite, 'inventory_accounting_events', {
      id: 'inv-ae-receipt-001',
      eventType: 'INVENTORY_RECEIPT',
      sourceType: 'GOODS_RECEIPT',
      sourceId: 'inv-gr-replenishment-001',
      movementId: 'inv-move-receipt-001',
      stationId: 'st-djj',
      aircraftId: null,
      flightId: null,
      currencyId: 'cur-idr',
      sourceAmountMinor: receiptTotal,
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: receiptTotal,
      integrationStatus: 'PENDING_INTEGRATION',
      payloadJson: JSON.stringify({
        orderNumber: purchaseOrderNumber,
        receiptNumber
      }),
      createdAt: seedNow
    });

    insertIgnore(sqlite, 'inventory_purchase_requests', {
      id: 'inv-pr-maintenance-002',
      requestNumber: `PR-${context.compactDate(0)}-002`,
      stationId: 'st-djj',
      requestReason: 'Replenish oil filters after the scheduled maintenance issue.',
      status: 'SUBMITTED',
      requestedByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_purchase_request_lines', {
      id: 'inv-prl-maintenance-filter',
      purchaseRequestId: 'inv-pr-maintenance-002',
      partId: 'inv-part-filter-pc6',
      quantity: 8,
      orderedQuantity: 0,
      requiredAt: context.date(7),
      note: 'Required for the next two scheduled PC-6 inspections.'
    });

    insertIgnore(sqlite, 'inventory_purchase_requests', {
      id: 'inv-pr-avionics-003',
      requestNumber: `PR-${context.compactDate(0)}-003`,
      stationId: 'st-djj',
      requestReason: 'Procure a serviceable starter generator for fleet contingency stock.',
      status: 'PARTIALLY_ORDERED',
      requestedByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_purchase_request_lines', {
      id: 'inv-prl-avionics-starter',
      purchaseRequestId: 'inv-pr-avionics-003',
      partId: 'inv-part-starter',
      quantity: 1,
      orderedQuantity: 1,
      requiredAt: context.date(14),
      note: 'Contingency stock for the PC-6 fleet.'
    });
    insertIgnore(sqlite, 'inventory_purchase_orders', {
      id: 'inv-po-avionics-002',
      orderNumber: `PO-${context.compactDate(0)}-002`,
      purchaseRequestId: 'inv-pr-avionics-003',
      vendorId: 'vendor-maintenance',
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      expectedAt: context.date(14),
      status: 'PENDING_APPROVAL',
      rejectionReason: null,
      createdByUserId: 'USR-INVENTORY-CONTROLLER',
      approvedByUserId: null,
      approvedAt: null,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_purchase_order_lines', {
      id: 'inv-pol-avionics-starter',
      purchaseOrderId: 'inv-po-avionics-002',
      purchaseRequestLineId: 'inv-prl-avionics-starter',
      partId: 'inv-part-starter',
      quantity: 1,
      receivedQuantity: 0,
      sourceUnitCostMinor: 28500000,
      baseUnitCostIdr: 28500000
    });

    insertIgnore(sqlite, 'inventory_movements', {
      id: 'inv-move-maintenance-filter-001',
      movementNumber: `MOV-${context.compactDate(-1)}-002`,
      movementType: 'ISSUE',
      sourceType: 'MAINTENANCE_PART_ISSUE',
      sourceId: 'inv-issue-maintenance-filter-001',
      stationId: 'st-djj',
      destinationStationId: null,
      aircraftId: 'ac-pk-ama',
      flightId: 'fop-landed-maintenance',
      reason: 'Oil filter issued against the landed-flight maintenance handoff.',
      status: 'POSTED',
      reversalOfMovementId: null,
      totalBaseValueIdr: 950000,
      isFinalized: 0,
      createdByUserId: 'USR-INVENTORY-CONTROLLER',
      createdAt: context.at(-1, '10:00')
    });
    const maintenanceMovementLineExists = sqlite
      .prepare(`SELECT 1 FROM inventory_movement_lines WHERE id = 'inv-ml-maintenance-filter-001'`)
      .get();
    if (!maintenanceMovementLineExists) {
      insertIgnore(sqlite, 'inventory_movement_lines', {
        id: 'inv-ml-maintenance-filter-001',
        movementId: 'inv-move-maintenance-filter-001',
        partId: 'inv-part-filter-pc6',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: null,
        lotId: 'inv-lot-filter-260701',
        serialId: null,
        conditionFrom: 'SERVICEABLE',
        conditionTo: null,
        quantity: 1,
        sourceUnitCostMinor: 950000,
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000,
        baseUnitCostIdr: 950000,
        baseValueIdr: 950000
      });
    }
    sqlite
      .prepare(
        `UPDATE inventory_movements SET is_finalized = 1
         WHERE id = 'inv-move-maintenance-filter-001' AND is_finalized = 0`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = 11, updated_at = ? WHERE id = 'inv-bal-filter-djj'`
      )
      .run(seedNow);
    sqlite
      .prepare(
        `UPDATE inventory_cost_layers SET remaining_quantity = 11 WHERE id = 'inv-layer-filter'`
      )
      .run();
    insertIgnore(sqlite, 'maintenance_part_issues', {
      id: 'inv-issue-maintenance-filter-001',
      issueNumber: `ISS-${context.compactDate(-1)}-001`,
      maintenanceHandoffId: 'maintenance-landed-filter-draft',
      targetType: 'AIRCRAFT',
      targetId: 'ac-pk-ama',
      assetMaintenanceWorkOrderId: null,
      aircraftId: 'ac-pk-ama',
      flightId: 'fop-landed-maintenance',
      warehouseId: 'inv-wh-djj-main',
      reason: 'Oil-filter replacement after post-flight inspection.',
      movementId: 'inv-move-maintenance-filter-001',
      status: 'ISSUED',
      totalPartsValueIdr: 950000,
      issuedByUserId: 'USR-INVENTORY-CONTROLLER',
      issuedAt: context.at(-1, '10:00')
    });
    insertIgnore(sqlite, 'maintenance_part_issue_lines', {
      id: 'inv-issue-line-maintenance-filter-001',
      issueId: 'inv-issue-maintenance-filter-001',
      partId: 'inv-part-filter-pc6',
      quantity: 1,
      baseValueIdr: 950000,
      note: 'Issued against work order for PK-AMA.'
    });
    insertIgnore(sqlite, 'inventory_accounting_events', {
      id: 'inv-ae-maintenance-filter-001',
      eventType: 'INVENTORY_MAINTENANCE_ISSUE',
      sourceType: 'MAINTENANCE_PART_ISSUE',
      sourceId: 'inv-issue-maintenance-filter-001',
      movementId: 'inv-move-maintenance-filter-001',
      stationId: 'st-djj',
      aircraftId: 'ac-pk-ama',
      flightId: 'fop-landed-maintenance',
      currencyId: 'cur-idr',
      sourceAmountMinor: 950000,
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: 950000,
      integrationStatus: 'PENDING_INTEGRATION',
      payloadJson: JSON.stringify({
        maintenanceHandoffId: 'maintenance-landed-filter-draft',
        maintenanceCategory: 'ROUTINE'
      }),
      createdAt: context.at(-1, '10:00')
    });
  });

  seed();
}
