import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { FlightOperationsVerificationService } from '../server/services/flight-operations-verification.service';

describe('Operational Verification and Readiness Assurance', () => {
  let sqlite: Database.Database;
  let service: FlightOperationsVerificationService;

  beforeEach(() => {
    // Create an in-memory SQLite database for testing
    sqlite = new Database(':memory:');

    // Mock the database with basic schema for testing
    sqlite.exec(`
      CREATE TABLE flight_operations (
        id TEXT PRIMARY KEY,
        flight_number TEXT,
        current_status_id TEXT,
        origin_station_id TEXT,
        destination_station_id TEXT,
        flight_date TEXT,
        scheduled_departure_at TEXT,
        aircraft_id TEXT,
        pilot_in_command_id TEXT
      );
      
      CREATE TABLE stations (
        id TEXT PRIMARY KEY,
        station_code TEXT
      );
      
      CREATE TABLE crews (
        id TEXT PRIMARY KEY,
        availability_status TEXT,
        license_expiry_date TEXT,
        medical_expiry_date TEXT
      );
      
      CREATE TABLE aircraft (
        id TEXT PRIMARY KEY,
        serviceability_status TEXT,
        current_station_id TEXT,
        passenger_capacity INTEGER,
        cargo_capacity_kg REAL
      );
      
      CREATE TABLE flight_manifests (
        id TEXT PRIMARY KEY,
        flight_operation_id TEXT,
        status_id TEXT,
        passenger_count INTEGER,
        cargo_weight_kg REAL,
        manifest_type TEXT,
        dangerous_goods_accepted INTEGER
      );
      
      CREATE TABLE manifest_statuses (
        id TEXT PRIMARY KEY,
        code TEXT
      );
      
      CREATE TABLE flight_fuel_requests (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        status_id TEXT
      );
      
      CREATE TABLE fuel_request_statuses (
        id TEXT PRIMARY KEY,
        code TEXT
      );
      
      CREATE TABLE flight_station_tasks (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        station_id TEXT,
        phase TEXT,
        task_code TEXT,
        task_title TEXT,
        status TEXT,
        assigned_role TEXT,
        assigned_user_id TEXT,
        source_record_type TEXT,
        source_record_id TEXT,
        requires_evidence INTEGER,
        notes TEXT,
        rejection_reason TEXT,
        verified_by_user_id TEXT,
        verified_at TEXT,
        version INTEGER,
        created_at TEXT,
        updated_at TEXT
      );
      
      CREATE TABLE flight_station_task_approvals (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        approval_stage TEXT,
        decision TEXT,
        actor_user_id TEXT,
        actor_role TEXT,
        reason TEXT,
        approved_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(task_id, approval_stage)
      );
      
      CREATE TABLE flight_verification_evidence (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        station_task_id TEXT,
        readiness_check_code TEXT,
        upload_id TEXT,
        document_type TEXT,
        file_name TEXT,
        notes TEXT,
        uploaded_by_user_id TEXT,
        uploaded_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      
      CREATE TABLE flight_readiness_checks (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        check_code TEXT,
        check_name TEXT,
        status_id TEXT,
        is_required INTEGER NOT NULL DEFAULT 1,
        evaluated_at TEXT,
        evaluated_by_user_id TEXT,
        result_note TEXT,
        source_reference TEXT,
        classification TEXT,
        calculation_status TEXT,
        verification_status TEXT,
        effective_status TEXT,
        calculated_at TEXT,
        expiry_at TEXT,
        invalidation_reason TEXT,
        source_record_ids TEXT,
        assurance_phase TEXT,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(flight_id, check_code)
      );
      
      CREATE TABLE flight_readiness_verifications (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        check_code TEXT,
        verification_status TEXT,
        verifier_user_id TEXT,
        evidence_references TEXT,
        verified_at TEXT,
        expired_at TEXT,
        invalidated_at TEXT,
        invalidation_reason TEXT,
        source_snapshot TEXT,
        source_hash TEXT,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(flight_id, check_code)
      );
      
      CREATE TABLE flight_operational_audit (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        actor_role TEXT,
        flight_id TEXT,
        station_id TEXT,
        module TEXT,
        action TEXT,
        before_status TEXT,
        after_status TEXT,
        before_version INTEGER,
        after_version INTEGER,
        reason TEXT,
        evidence_ids TEXT,
        request_id TEXT,
        metadata TEXT,
        timestamp TEXT,
        created_at TEXT
      );
      
      CREATE TABLE flight_actual_reconciliations (
        id TEXT PRIMARY KEY,
        flight_id TEXT,
        planned_passengers INTEGER,
        actual_passengers INTEGER,
        planned_cargo_kg REAL,
        actual_cargo_kg REAL,
        no_show_passengers INTEGER,
        offloaded_cargo_kg REAL,
        total_discrepancy_note TEXT,
        reconciled_by_user_id TEXT,
        reconciled_at TEXT,
        version INTEGER,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // Insert some test data
    sqlite.exec(`
      INSERT INTO stations (id, station_code) VALUES 
        ('station-origin', 'DJJ'),
        ('station-dest', 'WMX');
        
      INSERT INTO crews (id, availability_status, license_expiry_date, medical_expiry_date) VALUES 
        ('crew-1', 'AVAILABLE', '2027-12-31', '2027-12-31');
        
      INSERT INTO aircraft (id, serviceability_status, current_station_id, passenger_capacity, cargo_capacity_kg) VALUES 
        ('aircraft-1', 'SERVICEABLE', 'DJJ', 12, 5000);
        
      INSERT INTO manifest_statuses (id, code) VALUES 
        ('status-approved', 'APPROVED'),
        ('status-pending', 'PENDING');
        
      INSERT INTO fuel_request_statuses (id, code) VALUES 
        ('status-confirmed', 'CONFIRMED'),
        ('status-pending', 'PENDING');
        
      INSERT INTO flight_operations (id, flight_number, current_status_id, origin_station_id, destination_station_id, flight_date, scheduled_departure_at, aircraft_id, pilot_in_command_id) VALUES 
        ('flight-1', 'AM001', 'IN_PROGRESS', 'station-origin', 'station-dest', '2026-07-23', '2026-07-23T08:00:00Z', 'aircraft-1', 'crew-1');
    `);

    service = new FlightOperationsVerificationService(sqlite);
  });

  const stationAdminCtx = { userId: 'station-admin', role: 'Station Admin', stationCodes: ['DJJ'] };
  const occCtx = { userId: 'occ-user', role: 'OCC', stationCodes: ['ALL'] };
  const demoAdminCtx = { userId: 'admin-user', role: 'Demo Admin', stationCodes: ['ALL'] };

  it('should create station tasks for active flights', async () => {
    await sqlite.exec(`
      INSERT INTO flight_operations (id, flight_number, current_status_id, origin_station_id, destination_station_id, flight_date, scheduled_departure_at, aircraft_id, pilot_in_command_id) VALUES
        ('test-flight-1', 'AM002', 'IN_PROGRESS', 'station-origin', 'station-dest', '2026-07-23', '2026-07-23T09:00:00Z', 'aircraft-1', 'crew-1')
    `);

    const task = await service.createStationTask(
      {
        flightId: 'test-flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_DOCUMENTS',
        taskTitle: 'Origin documents',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    expect(task).toBeDefined();
    expect(task.flight_id).toBe('test-flight-1');
    expect(task.status).toBe('PENDING');
    expect(task.requires_evidence).toBe(1);
  });

  it('should enforce evidence requirement before verification', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_DOCUMENTS',
        taskTitle: 'Origin documents',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await expect(
      service.verifyStationTask({ taskId: task.id, expectedVersion: task.version }, stationAdminCtx)
    ).rejects.toThrow('This task requires at least one evidence');
  });

  it('should allow verification after adding evidence', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_DOCUMENTS',
        taskTitle: 'Origin documents',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await service.addStationTaskEvidence(
      {
        stationTaskId: task.id,
        expectedVersion: task.version,
        fileName: 'handling-confirmation.pdf'
      },
      stationAdminCtx
    );

    const verifiedTask = await service.verifyStationTask(
      { taskId: task.id, expectedVersion: task.version },
      stationAdminCtx
    );
    expect(verifiedTask.status).toBe('VERIFIED');
    expect(
      sqlite
        .prepare(
          `SELECT verification_status, source_hash, evidence_references
           FROM flight_readiness_verifications
           WHERE flight_id = 'flight-1' AND check_code = 'REQUIRED_DOCUMENTS'`
        )
        .get()
    ).toMatchObject({
      verification_status: 'VERIFIED',
      source_hash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      evidence_references: expect.stringContaining('ev-')
    });
  });

  it('should implement dual approval system', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_STATION_SIGNOFF',
        taskTitle: 'Origin station sign-off',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await service.addStationTaskEvidence(
      { stationTaskId: task.id, expectedVersion: task.version, fileName: 'signoff-evidence.pdf' },
      stationAdminCtx
    );

    const stationVerified = await service.verifyStationTask(
      { taskId: task.id, expectedVersion: task.version },
      stationAdminCtx
    );

    await service.approveStationTask(
      {
        taskId: task.id,
        decision: 'APPROVED',
        stage: 'OCC',
        expectedVersion: stationVerified.version
      },
      occCtx
    );

    const approvals = await service.getTaskApprovals(task.id);
    expect(approvals.length).toBe(2);

    const finalTask = await service.getFlightStationTaskById(task.id);
    expect(finalTask.status).toBe('VERIFIED');
  });

  it('invalidates verified document tasks when a flight document changes', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_DOCUMENTS',
        taskTitle: 'Origin documents',
        requiresEvidence: true
      },
      stationAdminCtx
    );
    await service.addStationTaskEvidence(
      {
        stationTaskId: task.id,
        expectedVersion: task.version,
        fileName: 'origin-documents.pdf'
      },
      stationAdminCtx
    );
    await service.verifyStationTask(
      { taskId: task.id, expectedVersion: task.version },
      stationAdminCtx
    );

    service.invalidateFlightDocumentVerification('flight-1', 'document-user');

    expect(await service.getFlightStationTaskById(task.id)).toMatchObject({
      status: 'PENDING',
      verified_by_user_id: null,
      verified_at: null
    });
    expect(
      sqlite
        .prepare(
          `SELECT verification_status, invalidation_reason
           FROM flight_readiness_verifications
           WHERE flight_id = 'flight-1' AND check_code = 'REQUIRED_DOCUMENTS'`
        )
        .get()
    ).toMatchObject({
      verification_status: 'INVALIDATED',
      invalidation_reason: 'Flight document source changed.'
    });
  });

  it('should block OCC approval before Station Admin approval', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'ORIGIN_STATION_SIGNOFF',
        taskTitle: 'Origin station sign-off',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await service.addStationTaskEvidence(
      { stationTaskId: task.id, expectedVersion: task.version, fileName: 'signoff-evidence.pdf' },
      stationAdminCtx
    );

    await expect(
      service.approveStationTask(
        {
          taskId: task.id,
          decision: 'APPROVED',
          stage: 'OCC',
          expectedVersion: task.version
        },
        { userId: 'occ-user', role: 'OCC', stationCodes: ['ALL'] }
      )
    ).rejects.toThrow('OCC cannot approve before Station Admin');
  });

  it('should handle emergency overrides by Demo Admin', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'CRITICAL_CHECK',
        taskTitle: 'Critical safety check',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await service.addStationTaskEvidence(
      { stationTaskId: task.id, expectedVersion: task.version, fileName: 'override-evidence.pdf' },
      demoAdminCtx
    );
    const overriddenTask = await service.overrideStationTask(
      {
        taskId: task.id,
        expectedVersion: task.version,
        reason: 'Emergency situation requiring immediate departure',
        evidenceIds: []
      },
      demoAdminCtx
    );

    expect(overriddenTask.status).toBe('VERIFIED');
  });

  it('should reject non-Demo Admin override attempts', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'CRITICAL_CHECK',
        taskTitle: 'Critical safety check',
        requiresEvidence: true
      },
      stationAdminCtx
    );

    await expect(
      service.overrideStationTask(
        { taskId: task.id, expectedVersion: task.version, reason: 'Emergency', evidenceIds: [] },
        stationAdminCtx
      )
    ).rejects.toThrow('Emergency override is only available for Demo Admin');
  });

  it('should calculate readiness based on classification', async () => {
    const readinessChecks = [
      {
        checkCode: 'AIRCRAFT_SERVICEABILITY',
        classification: 'SYSTEM_CHECK',
        calculationStatus: 'PASS',
        verificationStatus: 'NOT_REQUIRED',
        effectiveStatus: 'PASSED'
      }
    ];
    const evaluate = vi.spyOn(service, 'evaluate').mockReturnValue({ readinessChecks } as never);

    const checks = await service.calculateVerificationReadiness('flight-1');
    expect(evaluate).toHaveBeenCalledWith('flight-1', 'SYSTEM_VERIFICATION_EVALUATION');
    expect(checks).toEqual(readinessChecks);
  });

  it('should validate closure requirements based on flight type', () => {
    expect(() => service.validateClosureRequirements('flight-1', 'SCHEDULED_PASSENGER')).toThrow();
    expect(() => service.validateClosureRequirements('flight-1', 'POSITIONING')).toThrow();
  });

  it('should run critical readiness checks before departure', async () => {
    const evaluateDepartureAssurance = vi
      .spyOn(service, 'evaluateDepartureAssurance')
      .mockReturnValue({} as never);
    const criticalChecks = [
      'ROUTE_AVAILABILITY',
      'AIRCRAFT_SERVICEABILITY',
      'AIRCRAFT_LOCATION',
      'AIRCRAFT_SCHEDULE',
      'AIRCRAFT_CAPACITY',
      'CREW_AVAILABILITY',
      'CREW_LICENSE_MEDICAL',
      'MANIFEST_LOCKED',
      'DG_ACCEPTANCE',
      'FUEL_CONFIRMED',
      'DEPARTURE_DOCUMENTS',
      'HANDLING_CONFIRMED',
      'SEPARATION_OF_DUTIES',
      'ORIGIN_OPERATIONAL_TASKS',
      'ORIGIN_STATION_SIGNOFF'
    ];
    const insert = sqlite.prepare(
      `INSERT INTO flight_readiness_checks (
         id, flight_id, check_code, check_name, status_id, is_required, classification,
         effective_status, assurance_phase, created_at, updated_at
       ) VALUES (?, 'flight-1', ?, ?, 'status-pass', 1, 'SYSTEM_CHECK',
         'PASSED', 'DEPARTURE', ?, ?)`
    );
    for (const code of criticalChecks) {
      insert.run(
        `critical-${code}`,
        code,
        code,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
    const result = await service.runCriticalReadinessChecksBeforeDeparture('flight-1');
    expect(result).toEqual({ allPassed: true, failedChecks: [] });
    expect(evaluateDepartureAssurance).toHaveBeenCalledWith('flight-1', {
      userId: 'SYSTEM_PRE_DEPARTURE_REVALIDATION',
      role: 'Demo Admin',
      stationCodes: ['ALL']
    });

    const setGate = sqlite.prepare(
      `UPDATE flight_readiness_checks
       SET effective_status = ?, is_required = ?
       WHERE flight_id = 'flight-1' AND check_code = ?`
    );
    for (const code of criticalChecks) {
      setGate.run('BLOCKED', 1, code);
      expect(service.runCriticalReadinessChecksBeforeDeparture('flight-1')).toEqual({
        allPassed: false,
        failedChecks: [code]
      });
      setGate.run('PASSED', 1, code);
    }

    setGate.run('BLOCKED', 0, 'DG_ACCEPTANCE');
    expect(service.runCriticalReadinessChecksBeforeDeparture('flight-1')).toEqual({
      allPassed: true,
      failedChecks: []
    });
  });

  it('should maintain audit trail for all operations', async () => {
    await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'AUDIT_TEST',
        taskTitle: 'Audit test task',
        requiresEvidence: false
      },
      stationAdminCtx
    );

    const auditTrail = await service.getOperationalAuditTrail('flight-1');
    expect(auditTrail).toBeDefined();
    expect(auditTrail.length).toBeGreaterThan(0);
    expect(auditTrail[0].flightId).toBe('flight-1');
    expect(auditTrail[0].action).toBe('CREATE');
  });

  it('should implement optimistic concurrency control', async () => {
    const task = await service.createStationTask(
      {
        flightId: 'flight-1',
        stationId: 'station-origin',
        phase: 'ORIGIN_DEPARTURE',
        taskCode: 'CONCURRENCY_TEST',
        taskTitle: 'Concurrency test task',
        requiresEvidence: false
      },
      stationAdminCtx
    );

    await expect(
      service.verifyStationTask({ taskId: task.id, expectedVersion: 999 }, stationAdminCtx)
    ).rejects.toThrow('Task has been modified by another user');
  });
});
