import { describe, expect, it } from 'vitest';
import { createSeededTestServices } from '../helpers/demo-db';
import { InventoryRepository } from '../../server/features/inventory/repository';
import { InventoryService } from '../../server/features/inventory/service';

describe('Aviation Inventory Standards & Extensions', () => {
  it('enforces Digital Quarantine Lock & Quarantine Release workflow', async () => {
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

    const result = await service.releaseQuarantineItem(
      {
        serialId: 'inv-serial-brake-001',
        targetBinId: 'inv-bin-djj-usable',
        certificateReference: 'FAA-8130-2026-RELEASE-001'
      },
      'USR-CERTIFYING-STAFF',
      ['DJJ']
    );

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
