import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { seedMroFoundationData } from '../../server/db/seeds/mro-foundation';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const reporter = { userId: 'USR-001', role: 'OCC' };
const maintenance = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager',
  requestId: 'test-m3-maintenance'
};
const technician = {
  userId: 'USR-MAINTENANCE-TECHNICIAN',
  role: 'Maintenance Technician',
  requestId: 'test-m3-technician'
};
const certifier = {
  userId: 'USR-CERTIFYING-STAFF',
  role: 'Certifying Staff',
  requestId: 'test-m3-certifier'
};

async function reportDemoDefect(aircraftId = 'ac-pk-ama') {
  const env = await createSeededTestServices();
  seedMroFoundationData(env.sqlite, context);
  const before = env.services.aircraftAirworthiness.detail(aircraftId).aircraft;
  const reported = env.services.aircraftAirworthiness.reportDefect(
    aircraftId,
    {
      title: 'LH landing light inoperative',
      description:
        'Pilot report states the LH landing light did not illuminate during pre-flight checks.',
      detectedAt: context.at(0, '08:15'),
      reporterObservation: 'MAY_AFFECT_OPERATION',
      initialSeverity: 'MEDIUM',
      operationalImpact: 'May affect night operations until assessed by maintenance.',
      flightPhase: 'PRE_FLIGHT',
      sourceReference: 'TECHLOG-M3-001',
      evidenceReferences: ['TECHLOG-M3-001'],
      expectedVersion: before.version
    },
    reporter
  );
  return { ...env, before, reported, defectId: reported.defects[0]!.id };
}

describe('M3 defect control and deferred lifecycle', () => {
  it('records reporter observation without making a final airworthiness decision', async () => {
    const { sqlite, before, reported, defectId } = await reportDemoDefect();

    expect(reported.aircraft.serviceabilityStatus).toBe(before.serviceabilityStatus);
    expect(reported.aircraft.technicalEligibility).toBe('BLOCKED');
    expect(reported.defects[0]).toMatchObject({
      id: defectId,
      status: 'OPEN',
      reporterObservation: 'MAY_AFFECT_OPERATION',
      initialSeverity: 'MEDIUM'
    });
    const stored = sqlite
      .prepare(
        `SELECT detected_by_user_id, reporter_observation, operational_impact
         FROM aircraft_defects WHERE id = ?`
      )
      .get(defectId) as {
      detected_by_user_id: string;
      reporter_observation: string;
      operational_impact: string;
    };
    expect(stored.detected_by_user_id).toBe(reporter.userId);
    expect(stored.reporter_observation).toBe('MAY_AFFECT_OPERATION');
    expect(stored.operational_impact).toContain('night operations');

    sqlite.close();
  });

  it('rejects assessment by a reporter without maintenance assessment permission', async () => {
    const { services, sqlite, defectId } = await reportDemoDefect();

    expect(() =>
      services.maintenance.assessDefect(
        defectId,
        {
          assessmentDecision: 'GROUND',
          assessmentNote: 'Reporter attempts to make a maintenance airworthiness decision.'
        },
        reporter
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_PERMISSION_REQUIRED' }));

    sqlite.close();
  });

  it('applies NO-GO assessment as a real aircraft blocking consequence and WP source', async () => {
    const { services, sqlite, defectId } = await reportDemoDefect();

    services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'GROUND',
        assessmentNote:
          'Maintenance Control assessment confirms aircraft is not allowed to operate before rectification.'
      },
      maintenance
    );

    expect(services.aircraftAirworthiness.detail('ac-pk-ama').aircraft).toMatchObject({
      serviceabilityStatus: 'UNSERVICEABLE',
      technicalEligibility: 'BLOCKED'
    });
    const workPackage = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-ama',
        primaryDefectId: defectId,
        title: 'Rectify LH landing light defect',
        priority: 'HIGH',
        executionMode: 'INTERNAL'
      },
      maintenance
    );
    expect(workPackage.primaryDefectId).toBe(defectId);
    expect(() =>
      services.maintenance.createWorkPackage(
        {
          aircraftId: 'ac-pk-amf',
          primaryDefectId: defectId,
          title: 'Invalid cross-aircraft defect package',
          priority: 'HIGH',
          executionMode: 'INTERNAL'
        },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'AIRCRAFT_DEFECT_NOT_FOUND' }));

    sqlite.close();
  });

  it('creates controlled deferment from DEFER assessment and prevents duplicate deferment', async () => {
    const { services, sqlite, defectId } = await reportDemoDefect();

    const assessment = services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'DEFER',
        assessmentNote:
          'Maintenance Control defers the landing light defect with operational limitation.',
        deferment: {
          defermentType: 'MEL',
          referenceCode: 'DEMO-REF-33-40-01',
          category: 'C',
          operationalLimitations: 'Day VFR only until LH landing light is rectified.',
          maintenanceProcedure: 'Placard landing light switch and brief crew.',
          operationsProcedure: 'Dispatch only during daylight VFR demo operations.',
          effectiveAt: context.at(0, '09:00'),
          expiresAt: context.at(7, '09:00'),
          targetRectificationAt: context.at(5, '09:00'),
          authorizationReference: 'M3-DEMO-APPROVAL-001',
          applicableRouteIds: [],
          applicableServiceTypeCodes: ['POSITIONING']
        }
      },
      maintenance
    );

    expect(assessment.assessmentDecision).toBe('DEFER');
    const detail = services.aircraftAirworthiness.detail('ac-pk-ama');
    expect(detail.aircraft).toMatchObject({
      serviceabilityStatus: 'SERVICEABLE',
      technicalEligibility: 'RESTRICTED',
      activeRestrictionCount: 1
    });
    expect(detail.defects[0]).toMatchObject({ id: defectId, status: 'DEFERRED' });
    expect(detail.deferments[0]).toMatchObject({
      defectId,
      status: 'ACTIVE',
      referenceCode: 'DEMO-REF-33-40-01',
      operationalLimitations: 'Day VFR only until LH landing light is rectified.',
      targetRectificationAt: context.at(5, '09:00')
    });
    expect(() =>
      services.maintenance.assessDefect(
        defectId,
        {
          assessmentDecision: 'DEFER',
          assessmentNote: 'Duplicate deferred assessment should not create another deferment.',
          deferment: {
            defermentType: 'MEL',
            referenceCode: 'DEMO-DUPLICATE',
            operationalLimitations: 'Duplicate limitation.',
            effectiveAt: context.at(0, '09:30'),
            expiresAt: context.at(7, '09:30'),
            authorizationReference: 'M3-DUP'
          }
        },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'MAINTENANCE_DEFECT_ALREADY_ASSESSED' }));

    const count = sqlite
      .prepare('SELECT COUNT(*) AS count FROM aircraft_deferments WHERE defect_id = ?')
      .get(defectId) as { count: number };
    expect(count.count).toBe(1);

    sqlite.close();
  });

  it('requires released rectification evidence before closing a deferred defect', async () => {
    const { services, sqlite, defectId } = await reportDemoDefect('ac-pk-amf');
    services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'DEFER',
        assessmentNote: 'Maintenance Control defers the defect pending controlled rectification.',
        deferment: {
          defermentType: 'MEL',
          referenceCode: 'DEMO-REF-33-40-02',
          operationalLimitations: 'Day VFR only until rectification.',
          effectiveAt: context.at(0, '09:00'),
          expiresAt: context.at(7, '09:00'),
          targetRectificationAt: context.at(5, '09:00'),
          authorizationReference: 'M3-DEMO-APPROVAL-002'
        }
      },
      maintenance
    );
    const workPackage = services.maintenance.createWorkPackage(
      {
        aircraftId: 'ac-pk-amf',
        primaryDefectId: defectId,
        title: 'Deferred landing light rectification',
        priority: 'NORMAL',
        executionMode: 'INTERNAL',
        initialJobCard: {
          title: 'Rectify deferred landing light',
          taskType: 'DEFECT_RECTIFICATION',
          maintenanceDataRef: 'AMM DEMO 33-40',
          maintenanceDataRevision: 'REV-DEMO-2026-08',
          mandatoryFlag: true,
          requiresIndependentInspection: false
        }
      },
      maintenance
    );

    expect(() =>
      services.maintenance.closeDeferredDefect(
        defectId,
        {
          closureNote: 'Attempted close before rectification evidence is available.',
          evidenceReferences: ['M3-CLOSE-BLOCKED']
        },
        maintenance
      )
    ).toThrowError(expect.objectContaining({ code: 'RECTIFICATION_REQUIRED' }));

    let activePackage = workPackage;
    let jobCard = activePackage.jobCards[0]!;
    activePackage = services.maintenance.startJobCard(
      jobCard.id,
      { expectedVersion: jobCard.version },
      maintenance
    );
    jobCard = activePackage.jobCards[0]!;
    activePackage = services.maintenance.signWork(
      jobCard.id,
      {
        expectedVersion: jobCard.version,
        certifyingLicenseNumber: 'AME-TECH-MRO-001',
        statement: 'Deferred landing light rectification completed with maintenance evidence.',
        evidenceReferences: ['M3-DEFERRED-RECTIFICATION-WORK']
      },
      technician
    );
    activePackage = services.maintenance.requestRelease(
      activePackage.id,
      { expectedVersion: activePackage.version },
      maintenance
    );
    activePackage = services.maintenance.releaseWorkPackage(
      activePackage.id,
      {
        expectedVersion: activePackage.version,
        releaseNumber: 'RTS-M3-DEFERRED-CLOSE-001',
        resultingStatus: 'SERVICEABLE',
        releaseStatement:
          'Aircraft released to service after controlled deferred defect rectification evidence.',
        certifyingLicenseNumber: 'AME-CERT-MRO-001',
        releasedAt: context.at(1, '11:00'),
        evidenceReferences: ['M3-DEFERRED-RECTIFICATION-RELEASE'],
        idempotencyKey: 'm3-deferred-close-release-001'
      },
      certifier
    );
    expect(activePackage.status).toBe('RELEASED');
    expect(
      sqlite.prepare('SELECT status FROM aircraft_defects WHERE id = ?').get(defectId)
    ).toMatchObject({
      status: 'RECTIFIED'
    });
    expect(
      sqlite.prepare('SELECT status FROM aircraft_deferments WHERE defect_id = ?').get(defectId)
    ).toMatchObject({ status: 'ACTIVE' });
    expect(
      services.maintenance.commandCenter().defects.find((item) => item.id === defectId)
    ).toMatchObject({
      id: defectId,
      status: 'RECTIFIED',
      defermentStatus: 'ACTIVE'
    });

    services.maintenance.closeDeferredDefect(
      defectId,
      {
        closureNote: 'Deferred defect closed after released rectification work package.',
        evidenceReferences: [workPackage.packageNumber]
      },
      maintenance
    );

    expect(
      sqlite
        .prepare('SELECT status, closed_by_user_id FROM aircraft_deferments WHERE defect_id = ?')
        .get(defectId)
    ).toMatchObject({ status: 'CLOSED', closed_by_user_id: maintenance.userId });
    expect(
      sqlite.prepare('SELECT status FROM aircraft_defects WHERE id = ?').get(defectId)
    ).toMatchObject({ status: 'CLOSED' });
    expect(
      services.maintenance.commandCenter().defects.find((item) => item.id === defectId)
    ).toBeUndefined();

    sqlite.close();
  });

  it('records NO_IMPACT without grounding the aircraft and preserves audit history', async () => {
    const { services, sqlite, before, defectId } = await reportDemoDefect();

    services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'NO_IMPACT',
        assessmentNote:
          'Maintenance Control records no immediate maintenance impact for monitoring.'
      },
      maintenance
    );

    expect(services.aircraftAirworthiness.detail('ac-pk-ama').aircraft.serviceabilityStatus).toBe(
      before.serviceabilityStatus
    );
    expect(
      sqlite.prepare('SELECT status FROM aircraft_defects WHERE id = ?').get(defectId)
    ).toMatchObject({
      status: 'CLOSED'
    });
    const audit = sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM maintenance_audit_logs
         WHERE entity_type = 'DEFECT' AND entity_id = ? AND action IN ('ASSESS', 'NO_IMPACT_CLOSED')`
      )
      .get(defectId) as { count: number };
    expect(audit.count).toBe(2);

    sqlite.close();
  });
});
