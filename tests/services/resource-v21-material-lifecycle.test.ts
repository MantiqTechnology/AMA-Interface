import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { seedDemoData } from '../../server/db/seed';
import { seedFlightOperationsData } from '../../server/db/seed-flight-operations';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedInventoryData } from '../../server/db/seeds/inventory';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { seedMroV21Foundation } from '../../server/db/seeds/mro-v21-foundation';
import { seedTicketingData } from '../../server/db/seeds/ticketing';
import { createServices } from '../../server/services';
import { createSeededTestServices } from '../helpers/demo-db';

const actor = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager'
};

async function createResourceFixture() {
  const fixture = await createSeededTestServices();
  const context = createDemoSeedContext();
  seedMroFoundationData(fixture.sqlite);
  seedMroV21Foundation(fixture.sqlite, context);
  return fixture;
}

async function createFileResourceFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ama-m2-race-'));
  const dbPath = join(dir, 'race.sqlite');
  const client = createDbClient(dbPath);
  dropDemoDatabase(client.sqlite);
  runMigrations(client.sqlite);
  await seedDemoData(client.db);
  seedFlightOperationsData(client.sqlite);
  seedTicketingData(client.sqlite);
  seedInventoryData(client.sqlite);
  const context = createDemoSeedContext();
  seedMroFoundationData(client.sqlite);
  seedMroV21Foundation(client.sqlite, context);
  return {
    dir,
    dbPath,
    client,
    services: createServices(client.sqlite)
  };
}

type RaceWorkerInput = {
  dbPath: string;
  gatePath: string;
  workPackageId: string;
  materialRequirementId: string;
  inventoryItemId: string;
  serializedPartId?: string;
  quantity: number;
  unit: string;
  stationId: string;
  inventoryLocationId?: string;
  idempotencyKey: string;
};

type RaceWorkerResult = {
  ok: boolean;
  reservationId?: string;
  status?: string;
  code?: string;
  statusCode?: number | null;
  message?: string;
};

function encodeRaceInput(input: RaceWorkerInput) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function runRaceWorker(input: RaceWorkerInput): Promise<RaceWorkerResult> {
  const workerPath = join(process.cwd(), 'tests/helpers/resource-v21-reservation-worker.ts');
  const child = spawn(process.execPath, ['--import', 'tsx', workerPath, encodeRaceInput(input)], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', () => {
      const line = stdout.trim().split('\n').filter(Boolean).at(-1);
      if (!line) {
        reject(new Error(`Race worker produced no JSON output. stderr=${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(line) as RaceWorkerResult);
      } catch (error) {
        reject(
          new Error(
            `Race worker JSON parse failed: ${String(error)} stdout=${stdout} stderr=${stderr}`
          )
        );
      }
    });
  });
}

function expectDomainCode(error: unknown, pattern: RegExp) {
  const detail = error as { code?: string; message?: string };
  expect(`${detail.code ?? ''} ${detail.message ?? ''}`).toMatch(pattern);
}

describe('Resource-v21 M2 material lifecycle', () => {
  it('plays the serialized hard reservation, issue, install, and traceability golden path', async () => {
    const { services, sqlite } = await createResourceFixture();

    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov1-active',
        jobCardId: 'mjc-mrov1-active-001',
        partId: 'inv-part-brake-pc6',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-djj',
        reason: 'M2 golden path serialized brake requirement'
      },
      actor
    );
    const atpBefore = services.resourceV21.calculateAtp('inv-part-brake-pc6', 'st-djj');
    expect(atpBefore.availableToPromise).toBeGreaterThanOrEqual(1);
    expect(atpBefore.serializedAvailability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serializedPartId: 'inv-serial-brake-001', available: true })
      ])
    );

    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-brake-djj',
        serializedPartId: 'inv-serial-brake-001',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-djj',
        inventoryLocationId: 'inv-bin-djj-usable',
        idempotencyKey: 'm2-golden-reserve'
      },
      actor,
      'mwp-mrov1-active'
    );
    expect(reservation.status).toBe('ACTIVE');
    expect(() =>
      services.resourceV21.issueMaterial(
        { reservationId: reservation.id, quantity: 0.5, idempotencyKey: 'm2-golden-partial-issue' },
        actor,
        'mwp-mrov1-active'
      )
    ).toThrow(/partial|full reserved quantity/i);

    const competingRequirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov21-conflict',
        partId: 'inv-part-brake-pc6',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-djj',
        reason: 'M2 competing serialized brake requirement'
      },
      actor
    );
    expect(() =>
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: competingRequirement.id,
          inventoryItemId: 'inv-bal-brake-djj',
          serializedPartId: 'inv-serial-brake-001',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-djj',
          inventoryLocationId: 'inv-bin-djj-usable',
          idempotencyKey: 'm2-golden-conflict'
        },
        actor,
        'mwp-mrov21-conflict'
      )
    ).toThrow(/reserved|conflict|insufficient|available/i);

    const issued = services.resourceV21.issueMaterial(
      { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm2-golden-issue' },
      actor,
      'mwp-mrov1-active'
    );
    expect(issued.status).toBe('ISSUED');
    expect(issued.issueId).toBeTruthy();
    const issuedReplay = services.resourceV21.issueMaterial(
      { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm2-golden-issue' },
      actor,
      'mwp-mrov1-active'
    );
    expect(issuedReplay.issueId).toBe(issued.issueId);
    expect(() =>
      services.resourceV21.issueMaterial(
        { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm2-golden-issue-again' },
        actor,
        'mwp-mrov1-active'
      )
    ).toThrow(/already.*issued/i);

    expect(() =>
      services.resourceV21.installMaterial(
        {
          reservationId: reservation.id,
          quantity: 1,
          jobCardId: 'mjc-mrov1-release-001',
          position: 'LEFT MAIN BRAKE',
          idempotencyKey: 'm2-golden-install-wrong-job-card'
        },
        actor,
        'mwp-mrov1-active'
      )
    ).toThrow(/job card|material link|work package/i);

    const installed = services.resourceV21.installMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        jobCardId: 'mjc-mrov1-active-001',
        position: 'LEFT MAIN BRAKE',
        idempotencyKey: 'm2-golden-install'
      },
      actor,
      'mwp-mrov1-active'
    );
    expect(installed.serializedPartId).toBe('inv-serial-brake-001');
    expect(installed.inventoryComponentInstallationId).toBeTruthy();
    const installedReplay = services.resourceV21.installMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        jobCardId: 'mjc-mrov1-active-001',
        position: 'LEFT MAIN BRAKE',
        idempotencyKey: 'm2-golden-install'
      },
      actor,
      'mwp-mrov1-active'
    );
    expect(installedReplay.id).toBe(installed.id);
    expect(() =>
      services.resourceV21.installMaterial(
        {
          reservationId: reservation.id,
          quantity: 1,
          jobCardId: 'mjc-mrov1-active-001',
          position: 'LEFT MAIN BRAKE',
          idempotencyKey: 'm2-golden-install-again'
        },
        actor,
        'mwp-mrov1-active'
      )
    ).toThrow(/already installed/i);

    const [trace] = services.resourceV21.listMaterialTraceability(
      'mwp-mrov1-active',
      requirement.id
    );
    expect(trace).toMatchObject({
      traceComplete: true,
      materialRequirementId: requirement.id
    });
    expect(trace?.installations[0]).toMatchObject({
      reservationId: reservation.id,
      issueId: issued.issueId,
      aircraftId: 'ac-pk-amc',
      partId: 'inv-part-brake-pc6',
      serializedPartId: 'inv-serial-brake-001'
    });
    const lifecycle = services.resourceV21
      .listMaterialRequirements('mwp-mrov1-active')
      .find((item) => item.id === requirement.id);
    expect(lifecycle).toMatchObject({
      lifecycleStatus: 'INSTALLED',
      satisfied: true,
      reservedQuantity: 0,
      issuedQuantity: 1,
      installedQuantity: 1
    });

    sqlite.close();
  });

  it('prevents non-serialized quantity over-reservation and restores availability after release', async () => {
    const { services, sqlite } = await createResourceFixture();
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov21-conflict',
        partId: 'inv-part-tire-c208-reserve',
        requiredQuantity: 4,
        unit: 'EA',
        requestedStationId: 'st-bik',
        reason: 'M2 quantity reservation test'
      },
      actor
    );

    const first = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-tire-c208-reserve',
        quantity: 4,
        unit: 'EA',
        stationId: 'st-bik',
        inventoryLocationId: 'inv-bin-bik-mro-usable',
        idempotencyKey: 'm2-quantity-reserve'
      },
      actor,
      'mwp-mrov21-conflict'
    );
    expect(first.status).toBe('ACTIVE');

    const secondRequirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov1-active',
        partId: 'inv-part-tire-c208-reserve',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-bik',
        reason: 'M2 quantity over-reservation test'
      },
      actor
    );
    expect(() =>
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: secondRequirement.id,
          inventoryItemId: 'inv-bal-tire-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          inventoryLocationId: 'inv-bin-bik-mro-usable',
          idempotencyKey: 'm2-quantity-over-reserve'
        },
        actor,
        'mwp-mrov1-active'
      )
    ).toThrow(/insufficient|available/i);

    services.resourceV21.releaseReservation(
      {
        reservationId: first.id,
        reason: 'Release before issue for M2 availability test.',
        idempotencyKey: 'm2-quantity-release'
      },
      actor,
      'mwp-mrov21-conflict'
    );
    const afterRelease = services.resourceV21.calculateAtp('inv-part-tire-c208-reserve', 'st-bik');
    expect(afterRelease.availableToPromise).toBe(4);

    sqlite.close();
  });

  it('returns issued but uninstalled material to stock with an immutable event', async () => {
    const { services, sqlite } = await createResourceFixture();
    const inventoryActor = { userId: 'USR-INVENTORY-CONTROLLER', role: 'Inventory Controller' };
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov1-active',
        jobCardId: 'mjc-mrov1-active-001',
        partId: 'inv-part-oil',
        requiredQuantity: 2,
        unit: 'L',
        requestedStationId: 'st-djj',
        reason: 'Return lifecycle regression test'
      },
      actor
    );
    const before = services.resourceV21.calculateAtp('inv-part-oil', 'st-djj');
    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-oil-djj',
        quantity: 2,
        unit: 'L',
        stationId: 'st-djj',
        inventoryLocationId: 'inv-bin-djj-usable',
        idempotencyKey: 'return-regression-reserve'
      },
      inventoryActor
    );
    services.resourceV21.issueMaterial(
      { reservationId: reservation.id, quantity: 2, idempotencyKey: 'return-regression-issue' },
      inventoryActor
    );
    const returned = services.resourceV21.returnMaterial(
      {
        reservationId: reservation.id,
        quantity: 2,
        condition: 'SERVICEABLE',
        reason: 'Work scope changed before installation.',
        idempotencyKey: 'return-regression-return'
      },
      inventoryActor
    );
    expect(returned.status).toBe('RELEASED');
    expect(services.resourceV21.calculateAtp('inv-part-oil', 'st-djj').serviceableOnHand).toBe(
      before.serviceableOnHand
    );
    expect(
      sqlite
        .prepare(
          `SELECT COUNT(*) count FROM maintenance_reservation_events
           WHERE reservation_id = ? AND event_type = 'RETURNED'`
        )
        .get(reservation.id)
    ).toMatchObject({ count: 1 });
    expect(
      services.resourceV21.returnMaterial(
        {
          reservationId: reservation.id,
          quantity: 2,
          condition: 'SERVICEABLE',
          reason: 'Work scope changed before installation.',
          idempotencyKey: 'return-regression-return'
        },
        inventoryActor
      ).status
    ).toBe('RELEASED');
    sqlite.close();
  });

  it('prevents true parallel serialized reservation with a file-backed database', async () => {
    const fixture = await createFileResourceFixture();
    try {
      const { dbPath, dir, services, client } = fixture;
      const reqA = services.resourceV21.createMaterialRequirement(
        {
          workPackageId: 'mwp-mrov1-active',
          jobCardId: 'mjc-mrov1-active-001',
          partId: 'inv-part-brake-pc6',
          requiredQuantity: 1,
          unit: 'EA',
          requestedStationId: 'st-djj',
          reason: 'M2 serialized race A'
        },
        actor
      );
      const reqB = services.resourceV21.createMaterialRequirement(
        {
          workPackageId: 'mwp-mrov21-conflict',
          partId: 'inv-part-brake-pc6',
          requiredQuantity: 1,
          unit: 'EA',
          requestedStationId: 'st-djj',
          reason: 'M2 serialized race B'
        },
        actor
      );
      client.sqlite.close();

      const gatePath = join(dir, 'serialized-go');
      const attempts = [
        runRaceWorker({
          dbPath,
          gatePath,
          workPackageId: 'mwp-mrov1-active',
          materialRequirementId: reqA.id,
          inventoryItemId: 'inv-bal-brake-djj',
          serializedPartId: 'inv-serial-brake-001',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-djj',
          inventoryLocationId: 'inv-bin-djj-usable',
          idempotencyKey: 'm2-race-serial-a'
        }),
        runRaceWorker({
          dbPath,
          gatePath,
          workPackageId: 'mwp-mrov21-conflict',
          materialRequirementId: reqB.id,
          inventoryItemId: 'inv-bal-brake-djj',
          serializedPartId: 'inv-serial-brake-001',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-djj',
          inventoryLocationId: 'inv-bin-djj-usable',
          idempotencyKey: 'm2-race-serial-b'
        })
      ];
      writeFileSync(gatePath, 'go');
      const results = await Promise.all(attempts);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      const conflict = results.find((result) => !result.ok);
      expect(`${conflict?.code ?? ''} ${conflict?.message ?? ''}`).toMatch(
        /SERIAL_ALREADY_RESERVED|CONCURRENT_RESERVATION_CONFLICT|reserved|conflict/i
      );

      const verify = createDbClient(dbPath);
      const active = verify.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
           FROM maintenance_inventory_reservations
           WHERE serialized_part_id = 'inv-serial-brake-001'
             AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
        )
        .get() as { count: number };
      expect(Number(active.count)).toBe(1);
      verify.sqlite.close();
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it('prevents true parallel non-serialized quantity over-reservation with a file-backed database', async () => {
    const fixture = await createFileResourceFixture();
    try {
      const { dbPath, dir, services, client } = fixture;
      client.sqlite
        .prepare(
          `UPDATE inventory_stock_balances SET on_hand_quantity = 1 WHERE id = 'inv-bal-tire-c208-reserve'`
        )
        .run();
      const reqA = services.resourceV21.createMaterialRequirement(
        {
          workPackageId: 'mwp-mrov1-active',
          partId: 'inv-part-tire-c208-reserve',
          requiredQuantity: 1,
          unit: 'EA',
          requestedStationId: 'st-bik',
          reason: 'M2 quantity race A'
        },
        actor
      );
      const reqB = services.resourceV21.createMaterialRequirement(
        {
          workPackageId: 'mwp-mrov21-conflict',
          partId: 'inv-part-tire-c208-reserve',
          requiredQuantity: 1,
          unit: 'EA',
          requestedStationId: 'st-bik',
          reason: 'M2 quantity race B'
        },
        actor
      );
      client.sqlite.close();

      const gatePath = join(dir, 'quantity-go');
      const attempts = [
        runRaceWorker({
          dbPath,
          gatePath,
          workPackageId: 'mwp-mrov1-active',
          materialRequirementId: reqA.id,
          inventoryItemId: 'inv-bal-tire-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          inventoryLocationId: 'inv-bin-bik-mro-usable',
          idempotencyKey: 'm2-race-qty-a'
        }),
        runRaceWorker({
          dbPath,
          gatePath,
          workPackageId: 'mwp-mrov21-conflict',
          materialRequirementId: reqB.id,
          inventoryItemId: 'inv-bal-tire-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          inventoryLocationId: 'inv-bin-bik-mro-usable',
          idempotencyKey: 'm2-race-qty-b'
        })
      ];
      writeFileSync(gatePath, 'go');
      const results = await Promise.all(attempts);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      const conflict = results.find((result) => !result.ok);
      expect(`${conflict?.code ?? ''} ${conflict?.message ?? ''}`).toMatch(
        /MATERIAL_INSUFFICIENT_ATP|INSUFFICIENT_AVAILABLE_QUANTITY|available|insufficient/i
      );

      const verify = createDbClient(dbPath);
      const active = verify.sqlite
        .prepare(
          `SELECT COALESCE(SUM(quantity), 0) AS quantity
           FROM maintenance_inventory_reservations
           WHERE part_id = 'inv-part-tire-c208-reserve'
             AND station_id = 'st-bik'
             AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
        )
        .get() as { quantity: number };
      expect(Number(active.quantity)).toBeLessThanOrEqual(1);
      expect(Number(active.quantity)).toBe(1);
      verify.sqlite.close();
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it('rejects unserviceable material at reserve, issue, and install boundaries', async () => {
    const { services, sqlite } = await createResourceFixture();
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov1-active',
        jobCardId: 'mjc-mrov1-active-001',
        partId: 'inv-part-brake-pc6',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-djj',
        reason: 'M2 unserviceable guard'
      },
      actor
    );
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'UNSERVICEABLE' WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    try {
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: requirement.id,
          inventoryItemId: 'inv-bal-brake-djj',
          serializedPartId: 'inv-serial-brake-001',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-djj',
          inventoryLocationId: 'inv-bin-djj-usable',
          idempotencyKey: 'm2-unserviceable-reserve'
        },
        actor,
        'mwp-mrov1-active'
      );
      throw new Error('Expected unserviceable reserve to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_UNSERVICEABLE/i);
    }

    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'SERVICEABLE' WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-brake-djj',
        serializedPartId: 'inv-serial-brake-001',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-djj',
        inventoryLocationId: 'inv-bin-djj-usable',
        idempotencyKey: 'm2-unserviceable-reserve-valid'
      },
      actor,
      'mwp-mrov1-active'
    );
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'UNSERVICEABLE' WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    try {
      services.resourceV21.issueMaterial(
        { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm2-unserviceable-issue' },
        actor,
        'mwp-mrov1-active'
      );
      throw new Error('Expected unserviceable issue to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_UNSERVICEABLE/i);
    }

    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'SERVICEABLE' WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    services.resourceV21.issueMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        idempotencyKey: 'm2-unserviceable-issue-valid'
      },
      actor,
      'mwp-mrov1-active'
    );
    sqlite
      .prepare(
        `UPDATE inventory_serialized_parts SET condition = 'UNSERVICEABLE' WHERE id = 'inv-serial-brake-001'`
      )
      .run();
    try {
      services.resourceV21.installMaterial(
        {
          reservationId: reservation.id,
          quantity: 1,
          jobCardId: 'mjc-mrov1-active-001',
          position: 'LEFT MAIN BRAKE',
          idempotencyKey: 'm2-unserviceable-install'
        },
        actor,
        'mwp-mrov1-active'
      );
      throw new Error('Expected unserviceable install to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_UNSERVICEABLE/i);
    }
    sqlite.close();
  });

  it('rejects expired shelf-life stock before reserve and before install', async () => {
    const { services, sqlite } = await createResourceFixture();
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov21-conflict',
        partId: 'inv-part-filter-c208-reserve',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-bik',
        reason: 'M2 expired shelf-life guard'
      },
      actor
    );
    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2020-01-01' WHERE id = 'inv-lot-filter-c208-reserve'`
      )
      .run();
    try {
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: requirement.id,
          inventoryItemId: 'inv-bal-filter-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          inventoryLocationId: 'inv-bin-bik-mro-usable',
          idempotencyKey: 'm2-expired-reserve'
        },
        actor,
        'mwp-mrov21-conflict'
      );
      throw new Error('Expected expired reserve to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_SHELF_LIFE_EXPIRED/i);
    }

    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2028-06-19' WHERE id = 'inv-lot-filter-c208-reserve'`
      )
      .run();
    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: requirement.id,
        inventoryItemId: 'inv-bal-filter-c208-reserve',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-bik',
        inventoryLocationId: 'inv-bin-bik-mro-usable',
        idempotencyKey: 'm2-expired-reserve-valid'
      },
      actor,
      'mwp-mrov21-conflict'
    );
    services.resourceV21.issueMaterial(
      { reservationId: reservation.id, quantity: 1, idempotencyKey: 'm2-expired-issue-valid' },
      actor,
      'mwp-mrov21-conflict'
    );
    sqlite
      .prepare(
        `UPDATE inventory_lots SET expires_at = '2020-01-01' WHERE id = 'inv-lot-filter-c208-reserve'`
      )
      .run();
    try {
      services.resourceV21.installMaterial(
        {
          reservationId: reservation.id,
          quantity: 1,
          idempotencyKey: 'm2-expired-install'
        },
        actor,
        'mwp-mrov21-conflict'
      );
      throw new Error('Expected expired install to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_SHELF_LIFE_EXPIRED/i);
    }
    sqlite.close();
  });

  it('prevents certificate-required material from satisfying without a valid certificate record', async () => {
    const { services, sqlite } = await createResourceFixture();
    const requirement = services.resourceV21.createMaterialRequirement(
      {
        workPackageId: 'mwp-mrov21-conflict',
        partId: 'inv-part-filter-c208-reserve',
        requiredQuantity: 1,
        unit: 'EA',
        requestedStationId: 'st-bik',
        reason: 'M2 certificate guard'
      },
      actor
    );
    sqlite
      .prepare(
        `UPDATE inventory_lots
         SET certificate_verified = 0, certificate_reference = NULL
         WHERE id = 'inv-lot-filter-c208-reserve'`
      )
      .run();
    try {
      services.resourceV21.reserveMaterial(
        {
          materialRequirementId: requirement.id,
          inventoryItemId: 'inv-bal-filter-c208-reserve',
          quantity: 1,
          unit: 'EA',
          stationId: 'st-bik',
          inventoryLocationId: 'inv-bin-bik-mro-usable',
          idempotencyKey: 'm2-cert-missing-reserve'
        },
        actor,
        'mwp-mrov21-conflict'
      );
      throw new Error('Expected missing certificate reserve to fail');
    } catch (error) {
      expectDomainCode(error, /MATERIAL_CERTIFICATE_MISSING/i);
    }
    const lifecycle = services.resourceV21
      .listMaterialRequirements('mwp-mrov21-conflict')
      .find((item) => item.id === requirement.id);
    expect(lifecycle).toMatchObject({
      lifecycleStatus: 'REQUESTED',
      satisfied: false
    });
    sqlite.close();
  });
});
