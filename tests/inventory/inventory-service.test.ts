import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InventoryRepository } from '../../server/features/inventory/repository';
import { InventoryService } from '../../server/features/inventory/service';
import { createSeededTestServices } from '../helpers/demo-db';

type SqlRow = Record<string, unknown>;

describe('inventory service', () => {
  let sqlite: Database.Database;
  let inventory: InventoryService;
  let documentDirectory: string;

  beforeEach(async () => {
    const test = await createSeededTestServices();
    sqlite = test.sqlite;
    inventory = new InventoryService(new InventoryRepository(sqlite));
    documentDirectory = mkdtempSync(join(tmpdir(), 'ama-inventory-docs-'));
    process.env.AMA_DOCUMENT_MANIFEST = join(documentDirectory, 'documents.json');
    const timestamp = '2026-07-16T00:00:00.000Z';
    const certificates = [
      ['doc-filter-seed', 'inventory_lot', 'inv-lot-filter-260701', 'ARC-PC6-260701'],
      ['doc-filter-fefo', 'inventory_part', 'inv-part-filter-pc6', 'ARC-FEFO-TEST'],
      ['doc-brake-seed', 'inventory_serial', 'inv-serial-brake-001', 'ARC-BRK-260701'],
      [
        'doc-starter-return',
        'inventory_serial',
        'inv-serial-starter-installed',
        'ARC-RETURN-STARTER-001'
      ]
    ].map(([id, ownerType, ownerId, documentNumber]) => ({
      id,
      ownerType,
      ownerId,
      uploadId: `upload-${id}`,
      documentType: 'AUTHORIZED_RELEASE_CERTIFICATE',
      title: `Certificate ${documentNumber}`,
      documentNumber,
      issuer: 'Inventory test issuer',
      issuedAt: '2026-01-01',
      validFrom: '2026-01-01',
      expiresAt: '2028-12-31',
      verificationStatus: 'VERIFIED',
      visibility: 'INTERNAL',
      version: 1,
      uploadedBy: 'Inventory test',
      uploadedAt: timestamp,
      verifiedBy: 'Inventory test',
      verifiedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    writeFileSync(process.env.AMA_DOCUMENT_MANIFEST, JSON.stringify({ documents: certificates }));
  });

  afterEach(() => {
    sqlite.close();
    rmSync(documentDirectory, { recursive: true, force: true });
    delete process.env.AMA_DOCUMENT_MANIFEST;
  });

  it('picks physical stock by FEFO while valuing the issue by FIFO', async () => {
    const receipt = await inventory.postGoodsReceipt(
      {
        purchaseOrderId: 'inv-po-replenishment-001',
        warehouseId: 'inv-wh-djj-main',
        receivedAt: '2026-07-18T08:00:00.000+09:00',
        documentReference: 'DO-FEFO-TEST',
        lines: [
          {
            purchaseOrderLineId: 'inv-pol-filter',
            binId: 'inv-bin-djj-usable',
            quantity: 1,
            lotNumber: 'LOT-FEFO-FIRST',
            manufacturedAt: '2026-07-01',
            expiresAt: '2027-01-01',
            certificateReference: 'ARC-FEFO-TEST',
            certificateVerified: true,
            serialNumbers: []
          }
        ]
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    const receivedLine = sqlite
      .prepare(`SELECT id, lot_id FROM inventory_movement_lines WHERE movement_id = ?`)
      .get(receipt.movementId) as SqlRow;
    sqlite
      .prepare(
        `UPDATE inventory_cost_layers SET base_unit_cost_idr = 2000000 WHERE source_movement_line_id = ?`
      )
      .run(receivedLine.id);

    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'FEFO and FIFO regression test.',
        lines: [{ partId: 'inv-part-filter-pc6', quantity: 1, serialIds: [], note: null }]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    const issueLine = sqlite
      .prepare(
        `SELECT lot_id, base_unit_cost_idr FROM inventory_movement_lines WHERE movement_id = ?`
      )
      .get(issue.movementId) as SqlRow;

    expect(issueLine.lot_id).toBe(receivedLine.lot_id);
    expect(issueLine.base_unit_cost_idr).toBe(950_000);
  });

  it('rolls back every line when one maintenance issue line is short', async () => {
    const issueCountBefore = sqlite
      .prepare(`SELECT COUNT(*) count FROM maintenance_part_issues`)
      .get() as SqlRow;
    const before = sqlite
      .prepare(
        `SELECT on_hand_quantity quantity FROM inventory_stock_balances WHERE id = 'inv-bal-oil-djj'`
      )
      .get() as SqlRow;

    await expect(
      inventory.issueMaintenanceParts(
        {
          maintenanceHandoffId: null,
          aircraftId: 'ac-pk-ama',
          flightId: null,
          warehouseId: 'inv-wh-djj-main',
          reason: 'Atomic issue rollback test.',
          lines: [
            { partId: 'inv-part-oil', quantity: 2, serialIds: [], note: null },
            { partId: 'inv-part-filter-pc6', quantity: 999, serialIds: [], note: null }
          ]
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/Insufficient eligible stock/u);

    const after = sqlite
      .prepare(
        `SELECT on_hand_quantity quantity FROM inventory_stock_balances WHERE id = 'inv-bal-oil-djj'`
      )
      .get() as SqlRow;
    expect(after.quantity).toBe(before.quantity);
    expect(sqlite.prepare(`SELECT COUNT(*) count FROM maintenance_part_issues`).get()).toEqual(
      issueCountBefore
    );
  });

  it('preserves unit cost on transfer and never creates negative stock', async () => {
    await inventory.transfer(
      {
        partId: 'inv-part-oil',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: 'inv-bin-wmx-usable',
        quantity: 5,
        lotId: null,
        serialIds: [],
        reason: 'Reposition engine oil to WMX.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );

    const destinationLayer = sqlite
      .prepare(
        `SELECT remaining_quantity, base_unit_cost_idr FROM inventory_cost_layers
         WHERE part_id = 'inv-part-oil' AND warehouse_id = 'inv-wh-wmx-main'`
      )
      .get() as SqlRow;
    const balances = sqlite
      .prepare(
        `SELECT MIN(on_hand_quantity) minimum, SUM(on_hand_quantity) total
         FROM inventory_stock_balances WHERE part_id = 'inv-part-oil'`
      )
      .get() as SqlRow;

    expect(destinationLayer).toMatchObject({ remaining_quantity: 5, base_unit_cost_idr: 175_000 });
    expect(balances).toMatchObject({ minimum: 5, total: 30 });
  });

  it('restores quantity and valuation when an issue is reversed', async () => {
    const before = inventory.dashboard(['ALL'], true).fifoValuationIdr;
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Issue reversal regression test.',
        lines: [{ partId: 'inv-part-oil', quantity: 3, serialIds: [], note: null }]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    await inventory.reverseMovement(issue.movementId, 'USR-INVENTORY-CONTROLLER', ['ALL']);

    expect(inventory.dashboard(['ALL'], true).fifoValuationIdr).toBe(before);
    expect(
      sqlite
        .prepare(
          `SELECT on_hand_quantity FROM inventory_stock_balances WHERE id = 'inv-bal-oil-djj'`
        )
        .get()
    ).toMatchObject({ on_hand_quantity: 30 });
  });

  it('completes remove, repair send, serviceable return, and cost capitalization', async () => {
    inventory.removeSerializedPart(
      'inv-serial-starter-installed',
      {
        quarantineBinId: 'inv-bin-djj-quarantine',
        removedAt: '2026-07-16T09:00:00.000+09:00',
        hoursAtRemove: 1500,
        cyclesAtRemove: 2150,
        removalReason: 'Starter generator inspection finding.'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    const order = inventory.createRepairOrder(
      {
        serialId: 'inv-serial-starter-installed',
        vendorId: 'vendor-maintenance',
        reason: 'Bench repair and test.',
        expectedReturnAt: '2026-07-30'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    inventory.sendRepairOrder(order.id, 'USR-MAINTENANCE-MANAGER', ['ALL']);
    await inventory.returnServiceable(
      order.id,
      {
        usableBinId: 'inv-bin-djj-usable',
        returnedAt: '2026-07-28T09:00:00.000+09:00',
        certificateReference: 'ARC-RETURN-STARTER-001',
        certificateVerified: true,
        sourceRepairCostMinor: 750_000,
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    expect(
      sqlite
        .prepare(
          `SELECT condition, bin_id FROM inventory_serialized_parts WHERE id = 'inv-serial-starter-installed'`
        )
        .get()
    ).toMatchObject({ condition: 'SERVICEABLE', bin_id: 'inv-bin-djj-usable' });
    expect(
      sqlite
        .prepare(`SELECT status, base_repair_cost_idr FROM inventory_repair_orders WHERE id = ?`)
        .get(order.id)
    ).toMatchObject({ status: 'CLOSED', base_repair_cost_idr: 750_000 });
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) count, SUM(remaining_quantity) remaining
           FROM inventory_cost_layers WHERE serial_id = 'inv-serial-starter-installed'`
        )
        .get()
    ).toMatchObject({ count: 2, remaining: 1 });
  });

  it('rejects expired or unverified certificate-controlled stock', async () => {
    sqlite
      .prepare(
        `UPDATE inventory_lots SET certificate_verified = 0
         WHERE id = 'inv-lot-filter-260701'`
      )
      .run();
    await expect(
      inventory.issueMaintenanceParts(
        {
          maintenanceHandoffId: null,
          aircraftId: 'ac-pk-ama',
          flightId: null,
          warehouseId: 'inv-wh-djj-main',
          reason: 'Certificate eligibility test.',
          lines: [{ partId: 'inv-part-filter-pc6', quantity: 1, serialIds: [], note: null }]
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/Insufficient eligible stock/u);

    sqlite
      .prepare(
        `UPDATE inventory_lots SET certificate_verified = 1, expires_at = '2020-01-01'
         WHERE id = 'inv-lot-filter-260701'`
      )
      .run();
    await expect(
      inventory.issueMaintenanceParts(
        {
          maintenanceHandoffId: null,
          aircraftId: 'ac-pk-ama',
          flightId: null,
          warehouseId: 'inv-wh-djj-main',
          reason: 'Expiry eligibility test.',
          lines: [{ partId: 'inv-part-filter-pc6', quantity: 1, serialIds: [], note: null }]
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/Insufficient eligible stock/u);
  });

  it('releases quarantine stock only after a matching document is verified', async () => {
    await inventory.postGoodsReceipt(
      {
        purchaseOrderId: 'inv-po-replenishment-001',
        warehouseId: 'inv-wh-djj-main',
        receivedAt: '2026-07-16T08:00:00.000+09:00',
        documentReference: 'DO-QUARANTINE-TEST',
        lines: [
          {
            purchaseOrderLineId: 'inv-pol-filter',
            binId: 'inv-bin-djj-quarantine',
            quantity: 1,
            lotNumber: 'LOT-QUARANTINE-TEST',
            manufacturedAt: '2026-07-01',
            expiresAt: '2028-01-01',
            certificateReference: 'ARC-NOT-VERIFIED',
            certificateVerified: false,
            serialNumbers: []
          }
        ]
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    const lot = sqlite
      .prepare(`SELECT id FROM inventory_lots WHERE lot_number = 'LOT-QUARANTINE-TEST'`)
      .get() as SqlRow;
    const transfer = {
      partId: 'inv-part-filter-pc6',
      fromBinId: 'inv-bin-djj-quarantine',
      toBinId: 'inv-bin-djj-usable',
      quantity: 1,
      lotId: String(lot.id),
      serialIds: [],
      reason: 'Release verified quarantine stock.'
    };

    await expect(inventory.transfer(transfer, 'USR-INVENTORY-CONTROLLER', ['ALL'])).rejects.toThrow(
      /matching verified and unexpired certificate/u
    );

    sqlite
      .prepare(`UPDATE inventory_lots SET certificate_reference = 'ARC-FEFO-TEST' WHERE id = ?`)
      .run(lot.id);
    await inventory.transfer(transfer, 'USR-INVENTORY-CONTROLLER', ['ALL']);

    expect(
      sqlite
        .prepare(
          `SELECT condition, on_hand_quantity FROM inventory_stock_balances
           WHERE part_id = 'inv-part-filter-pc6' AND bin_id = 'inv-bin-djj-usable'
             AND lot_id = ?`
        )
        .get(lot.id)
    ).toMatchObject({ condition: 'SERVICEABLE', on_hand_quantity: 1 });
  });

  it('posts cycle-count variance as an immutable adjustment and accounting event', () => {
    const count = inventory.createCount(
      {
        warehouseId: 'inv-wh-djj-main',
        binId: 'inv-bin-djj-usable',
        reason: 'Scheduled DJJ cycle count.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    const lines = sqlite
      .prepare(
        `SELECT line.stock_balance_id, line.expected_quantity, balance.part_id
         FROM inventory_count_lines line
         JOIN inventory_stock_balances balance ON balance.id = line.stock_balance_id
         WHERE line.count_id = ?`
      )
      .all(count!.id) as SqlRow[];
    inventory.recordCount(
      count!.id,
      {
        lines: lines.map((line) => ({
          stockBalanceId: String(line.stock_balance_id),
          countedQuantity:
            line.part_id === 'inv-part-oil'
              ? Number(line.expected_quantity) - 2
              : Number(line.expected_quantity)
        }))
      },
      ['ALL']
    );
    inventory.postCount(count!.id, 'USR-INVENTORY-CONTROLLER', ['ALL']);

    expect(
      sqlite
        .prepare(
          `SELECT movement_type, reason FROM inventory_movements
           WHERE source_type = 'INVENTORY_COUNT' AND source_id = ?`
        )
        .get(count!.id)
    ).toMatchObject({ movement_type: 'COUNT_VARIANCE', reason: 'Scheduled DJJ cycle count.' });
    expect(
      sqlite
        .prepare(
          `SELECT integration_status FROM inventory_accounting_events
           WHERE source_type = 'INVENTORY_COUNT' AND source_id = ?`
        )
        .get(count!.id)
    ).toMatchObject({ integration_status: 'PENDING_INTEGRATION' });
  });

  it('never releases an expired non-certificate lot from quarantine', async () => {
    sqlite
      .prepare(
        `UPDATE inventory_parts SET certificate_required = 0 WHERE id = 'inv-part-filter-pc6'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2020-01-01' WHERE id = 'inv-lot-filter-260701'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances
         SET bin_id = 'inv-bin-djj-quarantine', condition = 'QUARANTINE'
         WHERE id = 'inv-bal-filter-djj'`
      )
      .run();

    await expect(
      inventory.transfer(
        {
          partId: 'inv-part-filter-pc6',
          fromBinId: 'inv-bin-djj-quarantine',
          toBinId: 'inv-bin-djj-usable',
          quantity: 1,
          lotId: 'inv-lot-filter-260701',
          serialIds: [],
          reason: 'Expired non-certificate quarantine release regression.'
        },
        'USR-INVENTORY-CONTROLLER',
        ['ALL']
      )
    ).rejects.toThrow(/Expired lot/u);
  });

  it('rejects issue reversal after the serialized component is installed', async () => {
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Issue brake assembly for immediate installation.',
        lines: [
          {
            partId: 'inv-part-brake-pc6',
            quantity: 1,
            serialIds: ['inv-serial-brake-001'],
            note: null
          }
        ]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    await inventory.installSerializedPart(
      'inv-serial-brake-001',
      {
        aircraftId: 'ac-pk-ama',
        position: 'LEFT MAIN BRAKE',
        installedAt: '2026-07-16T10:00:00.000+09:00',
        hoursAtInstall: 1510,
        cyclesAtInstall: 2160
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    await expect(
      inventory.reverseMovement(issue.movementId, 'USR-INVENTORY-CONTROLLER', ['ALL'])
    ).rejects.toThrow(/downstream serialized-component activity/u);
    expect(
      sqlite
        .prepare(
          `SELECT condition, bin_id, aircraft_id FROM inventory_serialized_parts
           WHERE id = 'inv-serial-brake-001'`
        )
        .get()
    ).toMatchObject({ condition: 'INSTALLED', bin_id: null, aircraft_id: 'ac-pk-ama' });
  });

  it('requires explicit transfer to the aircraft station before installation', async () => {
    await inventory.transfer(
      {
        partId: 'inv-part-brake-pc6',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: 'inv-bin-wmx-usable',
        quantity: 1,
        lotId: 'inv-lot-brake-260701',
        serialIds: ['inv-serial-brake-001'],
        reason: 'Position spare brake at WMX.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );

    await expect(
      inventory.installSerializedPart(
        'inv-serial-brake-001',
        {
          aircraftId: 'ac-pk-ama',
          position: 'LEFT MAIN BRAKE',
          installedAt: '2026-07-16T10:00:00.000+09:00',
          hoursAtInstall: 1510,
          cyclesAtInstall: 2160
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/aircraft station/u);
  });

  it('preserves FIFO layer chronology for an intra-warehouse bin transfer', async () => {
    sqlite
      .prepare(
        `INSERT INTO inventory_bins
         (id, warehouse_id, bin_code, bin_name, bin_type, is_active, created_at, updated_at)
         VALUES ('inv-bin-djj-usable-2', 'inv-wh-djj-main', 'U-02', 'Secondary Usable',
                 'USABLE', 1, '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z')`
      )
      .run();
    const before = sqlite
      .prepare(
        `SELECT id, remaining_quantity, received_at FROM inventory_cost_layers
         WHERE part_id = 'inv-part-oil' AND warehouse_id = 'inv-wh-djj-main' ORDER BY id`
      )
      .all();

    await inventory.transfer(
      {
        partId: 'inv-part-oil',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: 'inv-bin-djj-usable-2',
        quantity: 5,
        lotId: null,
        serialIds: [],
        reason: 'Move oil to secondary pick face.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );

    expect(
      sqlite
        .prepare(
          `SELECT id, remaining_quantity, received_at FROM inventory_cost_layers
           WHERE part_id = 'inv-part-oil' AND warehouse_id = 'inv-wh-djj-main' ORDER BY id`
        )
        .all()
    ).toEqual(before);
    expect(
      inventory
        .listStock({ warehouseId: 'inv-wh-djj-main', limit: 250, offset: 0 }, ['ALL'])
        .filter((row) => row.partId === 'inv-part-oil')
        .reduce((total, row) => total + (row.fifoValueIdr ?? 0), 0)
    ).toBe(5_250_000);
  });

  it('reports reorder alerts when eligible stock is zero', () => {
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = 0
         WHERE id = 'inv-bal-oil-djj'`
      )
      .run();

    const alert = inventory
      .listStock({ warehouseId: 'inv-wh-djj-main', lowStock: true, limit: 250, offset: 0 }, ['ALL'])
      .find((row) => row.partId === 'inv-part-oil');
    expect(alert).toMatchObject({ availableQuantity: 0, onHandQuantity: 0, lowStock: true });
  });

  it('rejects posting a stale cycle-count snapshot', () => {
    const count = inventory.createCount(
      {
        warehouseId: 'inv-wh-djj-main',
        binId: 'inv-bin-djj-usable',
        reason: 'Stale snapshot regression test.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    )!;
    inventory.recordCount(
      count.id,
      {
        lines: count.lines.map((line) => ({
          stockBalanceId: line.stockBalanceId,
          countedQuantity: line.expectedQuantity
        }))
      },
      ['ALL']
    );
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = on_hand_quantity - 1
         WHERE id = 'inv-bal-oil-djj'`
      )
      .run();

    expect(() => inventory.postCount(count.id, 'USR-INVENTORY-CONTROLLER', ['ALL'])).toThrow(
      /Stock changed after the count snapshot/u
    );
  });

  it('releases rejected purchase-order quantities back to the request', () => {
    const request = inventory.createPurchaseRequest(
      {
        stationId: 'st-djj',
        requestReason: 'Replacement PO regression test.',
        lines: [
          {
            partId: 'inv-part-oil',
            quantity: 4,
            requiredAt: '2026-08-01',
            note: null
          }
        ]
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    inventory.submitPurchaseRequest(request.id, ['ALL']);
    const order = inventory.createPurchaseOrder(
      {
        purchaseRequestId: request.id,
        vendorId: 'vendor-maintenance',
        currencyId: 'cur-idr',
        exchangeRateToIdrMicros: 1_000_000,
        expectedAt: '2026-08-01',
        lines: [
          {
            purchaseRequestLineId: request.lines[0]!.id,
            quantity: 4,
            sourceUnitCostMinor: 200_000
          }
        ]
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    inventory.submitPurchaseOrder(order.id, ['ALL']);
    inventory.rejectPurchaseOrder(order.id, 'Use alternate vendor.', 'USR-DIRECTOR', ['ALL']);

    expect(
      sqlite
        .prepare(
          `SELECT request.status, line.ordered_quantity FROM inventory_purchase_requests request
           JOIN inventory_purchase_request_lines line ON line.purchase_request_id = request.id
           WHERE request.id = ?`
        )
        .get(request.id)
    ).toMatchObject({ status: 'SUBMITTED', ordered_quantity: 0 });
  });

  it('revalidates expiry before a direct serialized-component install', async () => {
    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2020-01-01' WHERE id = 'inv-lot-brake-260701'`
      )
      .run();

    await expect(
      inventory.installSerializedPart(
        'inv-serial-brake-001',
        {
          aircraftId: 'ac-pk-ama',
          position: 'LEFT MAIN BRAKE',
          installedAt: '2026-07-16T10:00:00.000+09:00',
          hoursAtInstall: 1510,
          cyclesAtInstall: 2160
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/Expired serialized stock/u);
  });

  it('allows non-certificate serialized stock to be issued and installed', async () => {
    sqlite
      .prepare(
        `UPDATE inventory_parts SET certificate_required = 0 WHERE id = 'inv-part-brake-pc6'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts
         SET certificate_reference = NULL, certificate_verified = 0
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();

    await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Issue non-certificate repairable component.',
        lines: [
          {
            partId: 'inv-part-brake-pc6',
            quantity: 1,
            serialIds: ['inv-serial-brake-001'],
            note: null
          }
        ]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    await inventory.installSerializedPart(
      'inv-serial-brake-001',
      {
        aircraftId: 'ac-pk-ama',
        position: 'LEFT MAIN BRAKE',
        installedAt: '2026-07-16T10:00:00.000+09:00',
        hoursAtInstall: 1510,
        cyclesAtInstall: 2160
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );

    expect(
      sqlite
        .prepare(
          `SELECT condition, aircraft_id FROM inventory_serialized_parts
           WHERE id = 'inv-serial-brake-001'`
        )
        .get()
    ).toMatchObject({ condition: 'INSTALLED', aircraft_id: 'ac-pk-ama' });
  });

  it('rejects certificate-controlled serial stock without a traceable reference', async () => {
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET certificate_reference = NULL
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_lots SET certificate_reference = NULL WHERE id = 'inv-lot-brake-260701'`
      )
      .run();

    await expect(
      inventory.issueMaintenanceParts(
        {
          maintenanceHandoffId: null,
          aircraftId: 'ac-pk-ama',
          flightId: null,
          warehouseId: 'inv-wh-djj-main',
          reason: 'Attempt untraceable certificate-controlled issue.',
          lines: [
            {
              partId: 'inv-part-brake-pc6',
              quantity: 1,
              serialIds: ['inv-serial-brake-001'],
              note: null
            }
          ]
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/not eligible for issue/u);
  });

  it('cancels an open draft repair order when its quarantined component is scrapped', () => {
    inventory.removeSerializedPart(
      'inv-serial-starter-installed',
      {
        quarantineBinId: 'inv-bin-djj-quarantine',
        removedAt: '2026-07-16T09:00:00.000+09:00',
        hoursAtRemove: 1500,
        cyclesAtRemove: 2150,
        removalReason: 'Terminal damage found during removal.'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    const repair = inventory.createRepairOrder(
      {
        serialId: 'inv-serial-starter-installed',
        vendorId: 'vendor-maintenance',
        reason: 'Evaluate damage before disposition.',
        expectedReturnAt: null
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    )!;

    inventory.scrapSerializedPart(
      'inv-serial-starter-installed',
      'Damage is beyond economical repair.',
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );

    expect(
      sqlite.prepare(`SELECT status FROM inventory_repair_orders WHERE id = ?`).get(repair.id)
    ).toMatchObject({ status: 'CANCELLED' });
  });

  it('rejects receipt reversal after stock moved between bins in the same warehouse', async () => {
    sqlite
      .prepare(
        `INSERT INTO inventory_bins
         (id, warehouse_id, bin_code, bin_name, bin_type, is_active, created_at, updated_at)
         VALUES ('inv-bin-djj-reversal-target', 'inv-wh-djj-main', 'U-REV', 'Reversal Target',
                 'USABLE', 1, '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z')`
      )
      .run();
    await inventory.transfer(
      {
        partId: 'inv-part-oil',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: 'inv-bin-djj-reversal-target',
        quantity: 1,
        lotId: null,
        serialIds: [],
        reason: 'Move receipt stock before reversal attempt.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );

    await expect(
      inventory.reverseMovement('inv-move-receipt-001', 'USR-INVENTORY-CONTROLLER', ['ALL'])
    ).rejects.toThrow(/physical stock has moved/u);
  });

  it('does not restore an issued lot to serviceable stock after it expires', async () => {
    const issue = await inventory.issueMaintenanceParts(
      {
        maintenanceHandoffId: null,
        aircraftId: 'ac-pk-ama',
        flightId: null,
        warehouseId: 'inv-wh-djj-main',
        reason: 'Issue filter before expiry.',
        lines: [{ partId: 'inv-part-filter-pc6', quantity: 1, serialIds: [], note: null }]
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2020-01-01' WHERE id = 'inv-lot-filter-260701'`
      )
      .run();

    await expect(
      inventory.reverseMovement(issue.movementId, 'USR-INVENTORY-CONTROLLER', ['ALL'])
    ).rejects.toThrow(/Expired lot/u);
    expect(
      sqlite.prepare(`SELECT status FROM maintenance_part_issues WHERE id = ?`).get(issue.id)
    ).toMatchObject({ status: 'ISSUED' });
  });

  it('validates standalone flight assignments against the issued aircraft', async () => {
    const issueInput = {
      maintenanceHandoffId: null,
      aircraftId: 'ac-pk-ama',
      warehouseId: 'inv-wh-djj-main',
      reason: 'Validate standalone flight reference.',
      lines: [{ partId: 'inv-part-oil', quantity: 1, serialIds: [], note: null }]
    };

    await expect(
      inventory.issueMaintenanceParts(
        { ...issueInput, flightId: 'fop-does-not-exist' },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/Flight operation/u);
    await expect(
      inventory.issueMaintenanceParts(
        { ...issueInput, flightId: 'fop-blocked-crew-expired' },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/same aircraft/u);
  });

  it('rejects malformed or impossible receipt calendar dates', async () => {
    await expect(
      inventory.postGoodsReceipt(
        {
          purchaseOrderId: 'inv-po-replenishment-001',
          warehouseId: 'inv-wh-djj-main',
          receivedAt: '2026-07-16T08:00:00.000+09:00',
          documentReference: 'DO-INVALID-DATE',
          lines: [
            {
              purchaseOrderLineId: 'inv-pol-filter',
              binId: 'inv-bin-djj-usable',
              quantity: 1,
              lotNumber: 'LOT-INVALID-DATE',
              manufacturedAt: '2026-02-01',
              expiresAt: '2026-02-31',
              certificateReference: 'ARC-FEFO-TEST',
              certificateVerified: true,
              serialNumbers: []
            }
          ]
        },
        'USR-INVENTORY-CONTROLLER',
        ['ALL']
      )
    ).rejects.toThrow(/Expiry date is not a valid calendar date/u);
  });

  it('rejects aggregate over-receipt split across duplicate PO lines', async () => {
    await expect(
      inventory.postGoodsReceipt(
        {
          purchaseOrderId: 'inv-po-replenishment-001',
          warehouseId: 'inv-wh-djj-main',
          receivedAt: '2026-07-16T08:00:00.000+09:00',
          documentReference: 'DO-SPLIT-OVER-RECEIPT',
          lines: [
            {
              purchaseOrderLineId: 'inv-pol-filter',
              binId: 'inv-bin-djj-usable',
              quantity: 5,
              lotNumber: 'LOT-SPLIT-OVER-A',
              manufacturedAt: '2026-07-01',
              expiresAt: '2028-06-30',
              certificateReference: 'ARC-FEFO-TEST',
              certificateVerified: true,
              serialNumbers: []
            },
            {
              purchaseOrderLineId: 'inv-pol-filter',
              binId: 'inv-bin-djj-usable',
              quantity: 5,
              lotNumber: 'LOT-SPLIT-OVER-B',
              manufacturedAt: '2026-07-01',
              expiresAt: '2028-06-30',
              certificateReference: 'ARC-FEFO-TEST',
              certificateVerified: true,
              serialNumbers: []
            }
          ]
        },
        'USR-INVENTORY-CONTROLLER',
        ['ALL']
      )
    ).rejects.toThrow(/exceeds the outstanding PO quantity/u);
  });

  it('requires lot or serial tracking for shelf-life and certificate controls', () => {
    expect(() =>
      inventory.createPart({
        partNumber: 'SP-INVALID-QUANTITY-CONTROL',
        partName: 'Invalid controlled quantity part',
        description: null,
        manufacturer: 'Test Manufacturer',
        manufacturerPartNumber: null,
        unitOfMeasure: 'EA',
        lifecycleType: 'CONSUMABLE',
        trackingType: 'QUANTITY',
        criticality: 'STANDARD',
        certificateRequired: false,
        shelfLifeDays: 365,
        aircraftApplicability: []
      })
    ).toThrow(/require lot or serial tracking/u);
  });

  it('keeps serialized component counters and event chronology monotonic', async () => {
    expect(() =>
      inventory.removeSerializedPart(
        'inv-serial-starter-installed',
        {
          quarantineBinId: 'inv-bin-djj-quarantine',
          removedAt: '2026-07-16T09:00:00.000+09:00',
          hoursAtRemove: 1,
          cyclesAtRemove: 1,
          removalReason: 'Invalid counter regression.'
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).toThrow(/cannot be lower/u);
    expect(() =>
      inventory.removeSerializedPart(
        'inv-serial-starter-installed',
        {
          quarantineBinId: 'inv-bin-djj-quarantine',
          removedAt: '2025-12-01T09:00:00.000+09:00',
          hoursAtRemove: 1500,
          cyclesAtRemove: 2150,
          removalReason: 'Invalid removal chronology.'
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).toThrow(/cannot precede/u);

    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET hours_since_new = 100, cycles_since_new = 100
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    await expect(
      inventory.installSerializedPart(
        'inv-serial-brake-001',
        {
          aircraftId: 'ac-pk-ama',
          position: 'LEFT MAIN BRAKE',
          installedAt: '2026-07-16T10:00:00.000+09:00',
          hoursAtInstall: 50,
          cyclesAtInstall: 50
        },
        'USR-MAINTENANCE-MANAGER',
        ['ALL']
      )
    ).rejects.toThrow(/cannot be lower/u);
  });

  it('blocks generic usable release while a repair is open and hardens repair send', async () => {
    inventory.removeSerializedPart(
      'inv-serial-starter-installed',
      {
        quarantineBinId: 'inv-bin-djj-quarantine',
        removedAt: '2026-07-16T09:00:00.000+09:00',
        hoursAtRemove: 1500,
        cyclesAtRemove: 2150,
        removalReason: 'Repair lifecycle transfer regression.'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    const repair = inventory.createRepairOrder(
      {
        serialId: 'inv-serial-starter-installed',
        vendorId: 'vendor-maintenance',
        reason: 'Open repair must control release.',
        expectedReturnAt: null
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    )!;

    await expect(
      inventory.transfer(
        {
          partId: 'inv-part-starter',
          fromBinId: 'inv-bin-djj-quarantine',
          toBinId: 'inv-bin-djj-usable',
          quantity: 1,
          lotId: null,
          serialIds: ['inv-serial-starter-installed'],
          reason: 'Attempt generic release with open repair.'
        },
        'USR-INVENTORY-CONTROLLER',
        ['ALL']
      )
    ).rejects.toThrow(/active repair order/u);

    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'SERVICEABLE'
         WHERE id = 'inv-serial-starter-installed'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET condition = 'SERVICEABLE'
         WHERE part_id = 'inv-part-starter' AND bin_id = 'inv-bin-djj-quarantine'`
      )
      .run();
    expect(() => inventory.sendRepairOrder(repair.id, 'USR-INVENTORY-CONTROLLER', ['ALL'])).toThrow(
      /quarantined or unserviceable/u
    );
  });

  it('does not promote unserviceable stock through a generic transfer', async () => {
    inventory.removeSerializedPart(
      'inv-serial-starter-installed',
      {
        quarantineBinId: 'inv-bin-djj-quarantine',
        removedAt: '2026-07-16T09:00:00.000+09:00',
        hoursAtRemove: 1500,
        cyclesAtRemove: 2150,
        removalReason: 'Unserviceable release regression.'
      },
      'USR-MAINTENANCE-MANAGER',
      ['ALL']
    );
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'UNSERVICEABLE'
         WHERE id = 'inv-serial-starter-installed'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET condition = 'UNSERVICEABLE'
         WHERE part_id = 'inv-part-starter' AND bin_id = 'inv-bin-djj-quarantine'`
      )
      .run();

    await expect(
      inventory.transfer(
        {
          partId: 'inv-part-starter',
          fromBinId: 'inv-bin-djj-quarantine',
          toBinId: 'inv-bin-djj-usable',
          quantity: 1,
          lotId: null,
          serialIds: ['inv-serial-starter-installed'],
          reason: 'Attempt generic unserviceable release.'
        },
        'USR-INVENTORY-CONTROLLER',
        ['ALL']
      )
    ).rejects.toThrow(/cannot be released/u);
  });

  it('prevents mutation or deletion of finalized movement audit records', () => {
    expect(() =>
      sqlite
        .prepare(
          `UPDATE inventory_movements SET reason = 'Tampered'
           WHERE id = 'inv-move-receipt-001'`
        )
        .run()
    ).toThrow(/immutable/u);
    expect(() =>
      sqlite.prepare(`DELETE FROM inventory_movement_lines WHERE id = 'inv-ml-oil'`).run()
    ).toThrow(/cannot be deleted/u);
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO inventory_movement_lines
           (id, movement_id, part_id, from_bin_id, to_bin_id, quantity, currency_id)
           VALUES ('inv-ml-tamper', 'inv-move-receipt-001', 'inv-part-oil', NULL,
                   'inv-bin-djj-usable', 1, 'cur-idr')`
        )
        .run()
    ).toThrow(/cannot be appended/u);
  });
});
