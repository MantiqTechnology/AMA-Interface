import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createDbClient } from '../../server/db/client';
import { dropDemoDatabase, runMigrations } from '../../server/db/migrate';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedScenarioDatabase } from '../../server/db/seeds/scenario-database';
import { createServices, type Services } from '../../server/services';

const inventoryActor = {
  userId: 'USR-INVENTORY-CONTROLLER',
  role: 'Inventory Controller',
  requestId: 'test-internal-aog-inventory'
};
const technicianActor = {
  userId: 'USR-MAINTENANCE-TECHNICIAN',
  role: 'Maintenance Technician',
  requestId: 'test-internal-aog-technician'
};
const managerActor = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-internal-aog-manager'
};
const certifierActor = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-internal-aog-certifier'
};

describe('Internal AOG scenario projection', () => {
  let sqlite: Database.Database;
  let services: Services;

  beforeEach(async () => {
    const client = createDbClient(':memory:');
    sqlite = client.sqlite;
    dropDemoDatabase(sqlite);
    runMigrations(sqlite);
    await seedScenarioDatabase(client, {
      context: createDemoSeedContext('2026-08-01'),
      resetDocuments: false
    });
    services = createServices(sqlite);
  });

  afterEach(() => sqlite.close());

  it('identifies Inventory as the owner of the initial persisted material blocker', () => {
    expect(services.internalAogDemo.snapshot()).toMatchObject({
      scenarioId: 'INTERNAL_AOG_MATERIAL',
      phase: 'MATERIAL_REQUIRED',
      currentStep: 1,
      totalSteps: 8,
      nextRole: 'Inventory Controller',
      aircraft: { id: 'ac-pk-amd', registrationNumber: 'PK-AMD', aog: true },
      workPackage: { id: 'mroaog-work-package', packageNumber: 'MWP-AOG-INT-001' },
      materialRequirement: {
        id: 'mroaog-material-requirement',
        status: 'REQUESTED',
        issuedQuantity: 0
      },
      blocker: {
        owner: 'Inventory Controller',
        impact: expect.stringContaining('rilis')
      }
    });
  });

  it('advances only after canonical reservation and issue records persist', () => {
    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: 'mroaog-material-requirement',
        inventoryItemId: 'inv-bal-tire-c208-reserve',
        lotNumber: 'LOT-C208-TIR-RES-01',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-bik',
        inventoryLocationId: 'inv-bin-bik-mro-usable',
        certificateReference: 'ARC-C208-TIR-RES-01',
        idempotencyKey: 'test-mroaog-reserve'
      },
      inventoryActor,
      'mroaog-work-package'
    );

    expect(services.internalAogDemo.snapshot()).toMatchObject({
      phase: 'MATERIAL_RESERVED',
      nextRole: 'Inventory Controller',
      materialRequirement: { status: 'RESERVED', reservedQuantity: 1, issuedQuantity: 0 }
    });

    services.resourceV21.issueMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        idempotencyKey: 'test-mroaog-issue'
      },
      inventoryActor,
      'mroaog-work-package'
    );

    const issued = services.internalAogDemo.snapshot();
    expect(issued).toMatchObject({
      phase: 'READY_FOR_EXECUTION',
      nextRole: 'Maintenance Technician',
      materialRequirement: { status: 'ISSUED', reservedQuantity: 1, issuedQuantity: 1 }
    });
    expect(issued.timeline.map((event) => event.title)).toEqual(
      expect.arrayContaining(['Material direservasi', 'Material diterbitkan ke Work Package'])
    );
    expect(issued.timeline.map((event) => event.occurredAt)).toEqual(
      [...issued.timeline].map((event) => event.occurredAt).sort()
    );
  });

  it('projects canonical execution, inspection, release review, and release phases', () => {
    const reservation = services.resourceV21.reserveMaterial(
      {
        materialRequirementId: 'mroaog-material-requirement',
        inventoryItemId: 'inv-bal-tire-c208-reserve',
        lotNumber: 'LOT-C208-TIR-RES-01',
        quantity: 1,
        unit: 'EA',
        stationId: 'st-bik',
        inventoryLocationId: 'inv-bin-bik-mro-usable',
        certificateReference: 'ARC-C208-TIR-RES-01',
        idempotencyKey: 'test-mroaog-full-reserve'
      },
      inventoryActor,
      'mroaog-work-package'
    );
    services.resourceV21.issueMaterial(
      {
        reservationId: reservation.id,
        quantity: 1,
        idempotencyKey: 'test-mroaog-full-issue'
      },
      inventoryActor,
      'mroaog-work-package'
    );
    services.resourceV21.installMaterial(
      {
        reservationId: reservation.id,
        jobCardId: 'mroaog-job-card',
        quantity: 1,
        position: 'MAIN WHEEL',
        idempotencyKey: 'test-mroaog-full-install'
      },
      technicianActor,
      'mroaog-work-package'
    );

    services.maintenance.startJobCard('mroaog-job-card', { expectedVersion: 1 }, technicianActor);
    expect(services.internalAogDemo.snapshot().phase).toBe('WORK_IN_PROGRESS');

    services.maintenance.signWork(
      'mroaog-job-card',
      {
        expectedVersion: 2,
        certifyingLicenseNumber: 'AME-TECH-MRO-001',
        statement: 'Main wheel tire replacement completed using the controlled task data.',
        evidenceReferences: ['MROAOG-MECH-EVIDENCE']
      },
      technicianActor
    );
    expect(services.internalAogDemo.snapshot().phase).toBe('INSPECTION_REQUIRED');

    services.maintenance.inspectJobCard(
      'mroaog-job-card',
      {
        expectedVersion: 3,
        decision: 'PASSED',
        statement: 'Independent inspection passed with installation and torque evidence verified.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        inspectedAt: new Date().toISOString(),
        idempotencyKey: 'test-mroaog-full-inspection',
        evidenceReferences: ['MROAOG-INSPECTION-EVIDENCE']
      },
      certifierActor
    );
    expect(services.internalAogDemo.snapshot().phase).toBe('RELEASE_REVIEW_REQUIRED');

    services.maintenance.requestRelease(
      'mroaog-work-package',
      { expectedVersion: 2 },
      managerActor
    );
    expect(services.internalAogDemo.snapshot().phase).toBe('READY_FOR_RELEASE');

    services.maintenance.releaseWorkPackage(
      'mroaog-work-package',
      {
        expectedVersion: 3,
        releaseNumber: 'RTS-AOG-INT-001',
        resultingStatus: 'SERVICEABLE',
        releaseStatement:
          'Technical release simulation issued after required work and independent inspection.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        releasedAt: new Date().toISOString(),
        evidenceReferences: ['MROAOG-RELEASE-EVIDENCE'],
        idempotencyKey: 'test-mroaog-full-release'
      },
      certifierActor
    );
    expect(services.internalAogDemo.snapshot()).toMatchObject({
      phase: 'RELEASED',
      currentStep: 8,
      nextRole: null,
      nextAction: null,
      aircraft: { aog: false }
    });
  });
});
