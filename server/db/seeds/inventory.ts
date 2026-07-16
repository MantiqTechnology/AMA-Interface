import type Database from 'better-sqlite3';

const seedNow = '2026-07-07T09:00:00.000+07:00';

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

export function seedInventoryData(sqlite: Database.Database) {
  const seed = sqlite.transaction(() => {
    const parts = [
      {
        id: 'inv-part-filter-pc6',
        partNumber: 'SP-DEMO-FILTER-01',
        partName: 'PC-6 Engine Oil Filter',
        description: 'Critical scheduled-replacement filter for the PC-6 demo fleet.',
        manufacturer: 'Demo Aviation Components',
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
        partNumber: 'SP-DEMO-BRAKE-01',
        partName: 'PC-6 Brake Assembly',
        description: 'Serialized repairable brake assembly.',
        manufacturer: 'Demo Aviation Components',
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
        partNumber: 'SP-DEMO-OIL-01',
        partName: 'Aviation Engine Oil',
        description: 'General aviation engine oil in one-litre units.',
        manufacturer: 'Demo Lubricants',
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
        partNumber: 'SP-DEMO-STARTER-01',
        partName: 'Starter Generator',
        description: 'Serialized rotable starter generator installed on PK-AMA.',
        manufacturer: 'Demo Aero Electric',
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
      ['inv-app-filter-pc6', 'inv-part-filter-pc6', 'Pilatus PC-6', 'PC-6 Porter Demo'],
      ['inv-app-brake-pc6', 'inv-part-brake-pc6', 'Pilatus PC-6', 'PC-6 Porter Demo'],
      ['inv-app-oil-pc6', 'inv-part-oil', 'Pilatus PC-6', null],
      ['inv-app-starter-pc6', 'inv-part-starter', 'Pilatus PC-6', null]
    ] as const) {
      insertIgnore(sqlite, 'inventory_part_applicabilities', {
        id,
        partId,
        aircraftType: type,
        model,
        note: 'Demo aircraft applicability.'
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
      id: 'inv-pr-demo-001',
      requestNumber: 'PR-2026-0001',
      stationId: 'st-djj',
      requestReason: 'Replenish scheduled maintenance stock for the PC-6 fleet.',
      status: 'ORDERED',
      requestedByUserId: 'USR-MAINTENANCE-MANAGER',
      createdAt: seedNow,
      updatedAt: seedNow
    });

    for (const line of [
      ['inv-prl-filter', 'inv-part-filter-pc6', 20, '2026-07-20'],
      ['inv-prl-brake', 'inv-part-brake-pc6', 1, '2026-07-25'],
      ['inv-prl-oil', 'inv-part-oil', 30, '2026-07-15']
    ] as const) {
      insertIgnore(sqlite, 'inventory_purchase_request_lines', {
        id: line[0],
        purchaseRequestId: 'inv-pr-demo-001',
        partId: line[1],
        quantity: line[2],
        orderedQuantity: line[2],
        requiredAt: line[3],
        note: 'Demo replenishment line.'
      });
    }

    insertIgnore(sqlite, 'inventory_purchase_orders', {
      id: 'inv-po-demo-001',
      orderNumber: 'PO-2026-0001',
      purchaseRequestId: 'inv-pr-demo-001',
      vendorId: 'vendor-maintenance',
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      expectedAt: '2026-07-18',
      status: 'PARTIALLY_RECEIVED',
      rejectionReason: null,
      createdByUserId: 'USR-INVENTORY-CONTROLLER',
      approvedByUserId: 'USR-DIRECTOR',
      approvedAt: '2026-07-07T11:00:00.000+07:00',
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
        purchaseOrderId: 'inv-po-demo-001',
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
      certificateReference: 'ARC-DEMO-PC6-260701',
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
      certificateReference: 'ARC-DEMO-BRAKE-260701',
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
      certificateReference: 'ARC-DEMO-BRAKE-260701',
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
      certificateReference: 'ARC-DEMO-SG-001',
      certificateVerified: 1,
      createdAt: seedNow,
      updatedAt: seedNow
    });
    insertIgnore(sqlite, 'inventory_component_installations', {
      id: 'inv-install-starter-pk-ama',
      serialId: 'inv-serial-starter-installed',
      aircraftId: 'ac-pk-ama',
      position: 'ENGINE STARTER GENERATOR',
      installedAt: '2026-01-15T08:00:00.000+09:00',
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
    const demoMovementExists = sqlite
      .prepare(`SELECT 1 FROM inventory_movements WHERE id = 'inv-move-receipt-demo-001'`)
      .get();
    if (!demoMovementExists) {
      insertIgnore(sqlite, 'inventory_movements', {
        id: 'inv-move-receipt-demo-001',
        movementNumber: 'MOV-2026-0001',
        movementType: 'RECEIPT',
        sourceType: 'GOODS_RECEIPT',
        sourceId: 'inv-gr-demo-001',
        stationId: 'st-djj',
        destinationStationId: null,
        aircraftId: null,
        flightId: null,
        reason: 'Posted receipt for PO-2026-0001.',
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
          movementId: 'inv-move-receipt-demo-001',
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
           WHERE id = 'inv-move-receipt-demo-001' AND is_finalized = 0`
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
      id: 'inv-gr-demo-001',
      receiptNumber: 'GR-2026-0001',
      purchaseOrderId: 'inv-po-demo-001',
      warehouseId: 'inv-wh-djj-main',
      documentReference: 'DO-DEMO-0707-001',
      receivedAt: seedNow,
      status: 'POSTED',
      movementId: 'inv-move-receipt-demo-001',
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
        goodsReceiptId: 'inv-gr-demo-001',
        purchaseOrderLineId: line[1],
        binId: 'inv-bin-djj-usable',
        lotId: line[2],
        quantity: line[3],
        movementLineId: line[4]
      });
    }

    insertIgnore(sqlite, 'inventory_accounting_events', {
      id: 'inv-ae-receipt-demo-001',
      eventType: 'INVENTORY_RECEIPT',
      sourceType: 'GOODS_RECEIPT',
      sourceId: 'inv-gr-demo-001',
      movementId: 'inv-move-receipt-demo-001',
      stationId: 'st-djj',
      aircraftId: null,
      flightId: null,
      currencyId: 'cur-idr',
      sourceAmountMinor: receiptTotal,
      exchangeRateToIdrMicros: 1_000_000,
      baseAmountIdr: receiptTotal,
      integrationStatus: 'PENDING_INTEGRATION',
      payloadJson: JSON.stringify({ orderNumber: 'PO-2026-0001', receiptNumber: 'GR-2026-0001' }),
      createdAt: seedNow
    });
  });

  seed();
}
