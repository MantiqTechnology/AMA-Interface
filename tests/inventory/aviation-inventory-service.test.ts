import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  inventoryToolInputSchema,
  inventoryToolReturnSchema
} from '../../shared/features/inventory';
import { createSeededTestServices } from '../helpers/demo-db';
import { InventoryRepository } from '../../server/features/inventory/repository';
import { InventoryService } from '../../server/features/inventory/service';

describe('Aviation Inventory Standards & Extensions', () => {
  let documentDirectory: string | null = null;

  afterEach(() => {
    if (documentDirectory) rmSync(documentDirectory, { recursive: true, force: true });
    documentDirectory = null;
    delete process.env.AMA_DOCUMENT_MANIFEST;
  });

  it('enforces Digital Quarantine Lock & Quarantine Release workflow', async () => {
    documentDirectory = mkdtempSync(join(tmpdir(), 'ama-aviation-inventory-docs-'));
    process.env.AMA_DOCUMENT_MANIFEST = join(documentDirectory, 'documents.json');
    const timestamp = '2026-08-17T00:00:00.000Z';
    writeFileSync(
      process.env.AMA_DOCUMENT_MANIFEST,
      JSON.stringify({
        documents: [
          {
            id: 'doc-quarantine-release',
            ownerType: 'inventory_serial',
            ownerId: 'inv-serial-brake-001',
            uploadId: 'upload-quarantine-release',
            documentType: 'AUTHORIZED_RELEASE_CERTIFICATE',
            title: 'Quarantine release certificate',
            documentNumber: 'FAA-8130-2026-RELEASE-001',
            issuer: 'FAA',
            issuedAt: '2026-08-01',
            validFrom: '2026-08-01',
            expiresAt: '2028-08-01',
            verificationStatus: 'VERIFIED',
            visibility: 'INTERNAL',
            version: 1,
            uploadedBy: 'Inventory test',
            uploadedAt: timestamp,
            verifiedBy: 'Inventory test',
            verifiedAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ]
      })
    );
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts
         SET bin_id = 'inv-bin-djj-quarantine', condition = 'QUARANTINE',
             lifecycle_status = 'QUARANTINE', tag_color = 'ORANGE_QUARANTINE',
             quarantine_reason = 'Certificate inspection pending'
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = 0
         WHERE id = 'inv-bal-brake-djj'`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO inventory_stock_balances
         (id, part_id, bin_id, lot_key, lot_id, condition, on_hand_quantity, updated_at)
         VALUES ('test-quarantine-balance', 'inv-part-brake-pc6', 'inv-bin-djj-quarantine',
                 'inv-lot-brake-260701', 'inv-lot-brake-260701', 'QUARANTINE', 1, ?)`
      )
      .run(new Date().toISOString());

    await expect(
      service.releaseQuarantineItem(
        {
          serialId: 'inv-serial-brake-001',
          targetBinId: 'inv-bin-djj-usable',
          certificateReference: 'UNVERIFIED-CERTIFICATE'
        },
        'USR-CERTIFYING-STAFF',
        ['DJJ']
      )
    ).rejects.toThrow(/verified and unexpired certificate/u);

    const releaseInput = {
      serialId: 'inv-serial-brake-001',
      targetBinId: 'inv-bin-djj-usable',
      certificateReference: 'FAA-8130-2026-RELEASE-001',
      notes: 'QA inspection completed.'
    };
    const result = await service.releaseQuarantineItem(releaseInput, 'USR-CERTIFYING-STAFF', [
      'DJJ'
    ]);

    expect(result.item.condition).toBe('SERVICEABLE');
    expect(result.movement?.sourceType).toBe('QUARANTINE_RELEASE');
    expect(
      sqlite
        .prepare(
          `SELECT on_hand_quantity quantity FROM inventory_stock_balances
           WHERE part_id = 'inv-part-brake-pc6' AND bin_id = 'inv-bin-djj-usable'
             AND lot_key = 'inv-lot-brake-260701' AND condition = 'SERVICEABLE'`
        )
        .get()
    ).toMatchObject({ quantity: 1 });
    expect(result.movement?.reason).toContain(releaseInput.certificateReference);
    await expect(
      service.releaseQuarantineItem(releaseInput, 'USR-CERTIFYING-STAFF', ['DJJ'])
    ).rejects.toThrow(/physically held in quarantine/u);
    sqlite.close();
  });

  it('blocks tool check-out if calibration is EXPIRED', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    // Create an expired tool
    const expiredTool = service.createTool({
      toolNumber: 'TL-EXPIRED-99',
      serialNumber: 'SN-EXP-999',
      toolName: 'Expired Torque Wrench',
      calibrationIntervalDays: 180,
      lastCalibratedAt: '2025-01-01',
      nextCalibrationDue: '2025-07-01',
      certificateNumber: 'OLD-CERT-01',
      restrictedUse: true
    })!;

    expect(expiredTool.isExpired).toBe(true);

    // Attempt checkout should throw error
    expect(() =>
      service.checkoutTool({
        toolId: expiredTool.id,
        userId: 'USR-TECH-01'
      })
    ).toThrow();
  });

  it('allows tool check-out and check-in for valid calibrated tools', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    const validTool = service.createTool({
      toolNumber: 'TL-VALID-01',
      serialNumber: 'SN-VAL-101',
      toolName: 'Calibrated Multimeter',
      calibrationIntervalDays: 365,
      lastCalibratedAt: '2026-01-01',
      nextCalibrationDue: '2027-01-01',
      certificateNumber: 'CERT-2026-VAL'
    })!;

    expect(validTool.isExpired).toBe(false);

    // Checkout
    const checkedOut = service.checkoutTool({
      toolId: validTool.id,
      userId: 'USR-TECH-01',
      workOrderId: 'WO-2026-001'
    })!;
    expect(checkedOut.status).toBe('CHECKED_OUT');

    // Return
    const returned = service.returnTool({
      toolId: validTool.id,
      conditionOnReturn: 'SERVICEABLE'
    })!;
    expect(returned.status).toBe('AVAILABLE');
  });

  it('requires initial calibration and preserves checked-out tool custody', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));
    const uncalibrated = service.createTool({
      toolNumber: 'TL-UNCALIBRATED-01',
      serialNumber: 'SN-UNCALIBRATED-01',
      toolName: 'Uncalibrated Gauge',
      calibrationIntervalDays: 365,
      nextCalibrationDue: '2027-08-17'
    })!;

    expect(() => service.checkoutTool({ toolId: uncalibrated.id, userId: 'USR-TECH-01' })).toThrow(
      /complete calibration evidence/u
    );

    const calibrated = service.createTool({
      toolNumber: 'TL-CUSTODY-01',
      serialNumber: 'SN-CUSTODY-01',
      toolName: 'Custody Torque Wrench',
      calibrationIntervalDays: 365,
      lastCalibratedAt: '2026-01-01',
      nextCalibrationDue: '2027-01-01',
      certificateNumber: 'CERT-CUSTODY-01'
    })!;
    service.checkoutTool({ toolId: calibrated.id, userId: 'USR-TECH-01' });

    expect(() =>
      service.calibrateTool({
        toolId: calibrated.id,
        calibratedAt: '2026-08-17',
        nextCalibrationDue: '2027-08-17',
        certificateNumber: 'CERT-CUSTODY-02'
      })
    ).toThrow(/must be returned/u);
    expect(service.listTools(['ALL']).find((tool) => tool.id === calibrated.id)?.status).toBe(
      'CHECKED_OUT'
    );
    expect(
      sqlite
        .prepare(
          'SELECT COUNT(*) count FROM inventory_tool_logs WHERE tool_id = ? AND returned_at IS NULL'
        )
        .get(calibrated.id)
    ).toMatchObject({ count: 1 });
  });

  it('rejects arbitrary tool return conditions', () => {
    expect(
      inventoryToolReturnSchema.safeParse({ toolId: 'tool-1', conditionOnReturn: 'DAMAGED' })
        .success
    ).toBe(false);
    expect(
      inventoryToolInputSchema.safeParse({
        toolNumber: 'TL-PARTIAL-CAL',
        serialNumber: 'SN-PARTIAL-CAL',
        toolName: 'Partial Calibration Tool',
        nextCalibrationDue: '2027-08-17'
      }).success
    ).toBe(false);
  });

  it('prevents generic transfer from bypassing quarantine approval', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts
         SET bin_id = 'inv-bin-djj-quarantine', condition = 'QUARANTINE',
             lifecycle_status = 'QUARANTINE', is_suspected_unapproved = 1
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    sqlite
      .prepare(
        `UPDATE inventory_stock_balances SET on_hand_quantity = 0 WHERE id = 'inv-bal-brake-djj'`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO inventory_stock_balances
         (id, part_id, bin_id, lot_key, lot_id, condition, on_hand_quantity, updated_at)
         VALUES ('test-transfer-quarantine-balance', 'inv-part-brake-pc6',
                 'inv-bin-djj-quarantine', 'inv-lot-brake-260701',
                 'inv-lot-brake-260701', 'QUARANTINE', 1, ?)`
      )
      .run(new Date().toISOString());

    await expect(
      service.transfer(
        {
          partId: 'inv-part-brake-pc6',
          fromBinId: 'inv-bin-djj-quarantine',
          toBinId: 'inv-bin-djj-usable',
          quantity: 1,
          lotId: 'inv-lot-brake-260701',
          serialIds: ['inv-serial-brake-001'],
          reason: 'Attempt generic quarantine bypass.'
        },
        'USR-INVENTORY-CONTROLLER',
        ['DJJ']
      )
    ).rejects.toThrow(/requires Certifying Staff/u);
    expect(
      sqlite
        .prepare('SELECT condition FROM inventory_serialized_parts WHERE id = ?')
        .get('inv-serial-brake-001')
    ).toMatchObject({ condition: 'QUARANTINE' });
  });

  it('revalidates SUP status after asynchronous transfer checks', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));
    sqlite
      .prepare(
        `UPDATE inventory_parts SET certificate_required = 0
         WHERE id = 'inv-part-brake-pc6'`
      )
      .run();

    const transfer = service.transfer(
      {
        partId: 'inv-part-brake-pc6',
        fromBinId: 'inv-bin-djj-usable',
        toBinId: 'inv-bin-wmx-usable',
        quantity: 1,
        lotId: 'inv-lot-brake-260701',
        serialIds: ['inv-serial-brake-001'],
        reason: 'Concurrent SUP status regression.'
      },
      'USR-INVENTORY-CONTROLLER',
      ['ALL']
    );
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET is_suspected_unapproved = 1
         WHERE id = 'inv-serial-brake-001'`
      )
      .run();

    await expect(transfer).rejects.toThrow(/requires Certifying Staff/u);
    expect(
      sqlite
        .prepare(
          `SELECT bin_id AS binId, condition, is_suspected_unapproved AS isSup
           FROM inventory_serialized_parts WHERE id = 'inv-serial-brake-001'`
        )
        .get()
    ).toMatchObject({ binId: 'inv-bin-djj-usable', condition: 'SERVICEABLE', isSup: 1 });
  });

  it('tracks vendor Core Returns & updates status', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    const core = service.createCoreReturn({
      stationId: 'st-djj',
      vendorId: 'vendor-maintenance',
      partId: 'inv-part-brake-pc6',
      serialId: 'inv-serial-brake-001',
      coreDueDate: '2026-09-01',
      depositAmountIdr: 10_000_000,
      notes: 'Starter generator core exchange'
    })!;

    expect(core.returnNumber).toMatch(/^CR-/);
    expect(core.status).toBe('PENDING_RETURN');

    const updated = service.updateCoreReturnStatus(
      core.id,
      { status: 'SHIPPED', notes: 'Shipped via Express Cargo' },
      ['DJJ']
    );
    expect(updated?.status).toBe('SHIPPED');
    expect(updated?.shippedAt).toBeDefined();
    const accepted = service.updateCoreReturnStatus(
      core.id,
      { status: 'ACCEPTED_BY_VENDOR', notes: 'Vendor accepted the core' },
      ['DJJ']
    );
    expect(accepted?.status).toBe('ACCEPTED_BY_VENDOR');
    expect(() =>
      service.updateCoreReturnStatus(core.id, { status: 'ACCEPTED_BY_VENDOR', notes: 'Replay' }, [
        'DJJ'
      ])
    ).toThrow(/cannot transition/u);
  });

  it('manages Part Interchangeability (Cross-reference P/N)', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    const interchangeability = service.createInterchangeability({
      partId: 'inv-part-filter-pc6',
      alternatePartId: 'inv-part-brake-pc6',
      interchangeabilityType: 'TWO_WAY',
      notes: 'Equivalent filter specification'
    })!;

    expect(interchangeability.interchangeabilityType).toBe('TWO_WAY');

    const list = service.listInterchangeabilities('inv-part-filter-pc6');
    expect(list.some((item) => item.id === interchangeability.id)).toBe(true);
  });

  it('tracks Avionics Software & AIRAC 28-day NavDB cycles', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    const navdb = service.upsertSoftwareNavdb({
      softwareName: 'Garmin G1000 NXi AIRAC 2609',
      systemType: 'FMS / GPS',
      version: 'AIRAC 2609 v1.0',
      airacCycle: 'AIRAC 2609',
      effectiveDate: '2026-09-01',
      expirationDate: '2026-09-29'
    })!;

    expect(navdb.status).toBe('ACTIVE');

    const list = service.listSoftwareNavdb();
    expect(list.some((item) => item.id === navdb.id)).toBe(true);
  });

  it('manages Fly Away Kits (FAK) for pioneer aircraft', async () => {
    const { sqlite } = await createSeededTestServices();
    const service = new InventoryService(new InventoryRepository(sqlite));

    const kit = service.createFlyAwayKit({
      kitNumber: 'FAK-TEST-01',
      aircraftId: 'ac-pk-ama',
      items: [
        {
          partId: 'inv-part-filter-pc6',
          requiredQuantity: 2,
          currentQuantity: 2,
          condition: 'SERVICEABLE'
        }
      ]
    })!;

    expect(kit.kitNumber).toBe('FAK-TEST-01');
    expect(kit.isComplete).toBe(true);
  });
});
