import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type {
  AssetAssignInput,
  AssetAuditInput,
  AssetInput,
  AssetListQuery,
  AssetMoveInput,
  AssetUpdate,
  DepartmentInput,
  DepartmentUpdate,
  EmployeeInput,
  InsuranceInput,
  MaintenanceCompleteInput,
  MaintenanceWorkOrderInput,
  ReconcileAssetInput
} from '../../../shared/features/corporate-assets';
import { DomainError, notFound } from '../../utils/errors';
import { getApplicationNow } from '../../utils/time';

type Row = Record<string, unknown>;
const now = getApplicationNow;
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));
const num = (value: unknown) => Number(value ?? 0);

export class CorporateAssetService {
  constructor(public readonly sqlite: Database.Database) {}

  listDepartments(activeOnly = false) {
    return (
      this.sqlite
        .prepare(
          `SELECT * FROM departments ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY department_name`
        )
        .all() as Row[]
    ).map((row) => ({
      id: String(row.id),
      departmentCode: String(row.department_code),
      departmentName: String(row.department_name),
      isActive: Boolean(row.is_active),
      updatedAt: String(row.updated_at)
    }));
  }

  createDepartment(input: DepartmentInput) {
    const timestamp = now();
    const id = `dept-${nanoid(10)}`;
    try {
      this.sqlite
        .prepare(
          `INSERT INTO departments
        (id, department_code, department_name, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)`
        )
        .run(id, input.departmentCode, input.departmentName, timestamp, timestamp);
    } catch (error) {
      this.uniqueError(error, 'DEPARTMENT_CODE_EXISTS', 'Department code already exists.');
    }
    return this.listDepartments().find((item) => item.id === id)!;
  }

  getDepartment(id: string) {
    const item = this.listDepartments().find((department) => department.id === id);
    if (!item) throw notFound('Department', id);
    return item;
  }

  updateDepartment(id: string, input: DepartmentUpdate) {
    this.getDepartment(id);
    try {
      this.sqlite
        .prepare(
          `UPDATE departments SET department_code = ?, department_name = ?, is_active = ?, updated_at = ? WHERE id = ?`
        )
        .run(input.departmentCode, input.departmentName, input.isActive ? 1 : 0, now(), id);
    } catch (error) {
      this.uniqueError(error, 'DEPARTMENT_CODE_EXISTS', 'Department code already exists.');
    }
    return this.getDepartment(id);
  }

  listEmployees(activeOnly = false) {
    return (
      this.sqlite
        .prepare(
          `SELECT e.*, d.department_name, s.station_code
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN stations s ON s.id = e.base_station_id
      ${activeOnly ? "WHERE e.employment_status = 'ACTIVE'" : ''}
      ORDER BY e.full_name`
        )
        .all() as Row[]
    ).map((row) => ({
      id: String(row.id),
      employeeCode: String(row.employee_code),
      fullName: String(row.full_name),
      departmentId: str(row.department_id),
      departmentName: str(row.department_name),
      baseStationId: str(row.base_station_id),
      stationCode: str(row.station_code),
      positionTitle: String(row.position_title),
      employmentStatus: String(row.employment_status),
      demoActorId: str(row.demo_actor_id),
      updatedAt: String(row.updated_at)
    }));
  }

  createEmployee(input: EmployeeInput) {
    this.assertReference('departments', input.departmentId, 'Department');
    this.assertReference('stations', input.baseStationId, 'Station');
    const timestamp = now();
    const id = `emp-${nanoid(10)}`;
    try {
      this.sqlite
        .prepare(
          `INSERT INTO employees
        (id, employee_code, full_name, department_id, base_station_id, position_title,
         employment_status, demo_actor_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.employeeCode,
          input.fullName,
          input.departmentId,
          input.baseStationId,
          input.positionTitle,
          input.employmentStatus,
          input.demoActorId,
          timestamp,
          timestamp
        );
    } catch (error) {
      this.uniqueError(error, 'EMPLOYEE_CODE_EXISTS', 'Employee code already exists.');
    }
    return this.listEmployees().find((item) => item.id === id)!;
  }

  getEmployee(id: string) {
    const item = this.listEmployees().find((employee) => employee.id === id);
    if (!item) throw notFound('Employee', id);
    return item;
  }

  updateEmployee(id: string, input: EmployeeInput) {
    this.getEmployee(id);
    this.assertReference('departments', input.departmentId, 'Department');
    this.assertReference('stations', input.baseStationId, 'Station');
    try {
      this.sqlite
        .prepare(
          `UPDATE employees SET employee_code = ?, full_name = ?, department_id = ?,
        base_station_id = ?, position_title = ?, employment_status = ?, demo_actor_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.employeeCode,
          input.fullName,
          input.departmentId,
          input.baseStationId,
          input.positionTitle,
          input.employmentStatus,
          input.demoActorId,
          now(),
          id
        );
    } catch (error) {
      this.uniqueError(error, 'EMPLOYEE_CODE_EXISTS', 'Employee code already exists.');
    }
    return this.getEmployee(id);
  }

  listAssets(query: AssetListQuery, scope: readonly string[]) {
    const where = ['1 = 1'];
    const params: unknown[] = [];
    if (!scope.includes('ALL')) {
      where.push(`s.station_code IN (${scope.map(() => '?').join(', ')})`);
      params.push(...scope);
    }
    if (query.search) {
      where.push('(a.asset_code LIKE ? OR a.name LIKE ? OR a.serial_number LIKE ?)');
      const search = `%${query.search}%`;
      params.push(search, search, search);
    }
    const filters: Array<[unknown, string]> = [
      [query.category, 'a.category'],
      [query.stationId, 'a.station_id'],
      [query.departmentId, 'a.department_id'],
      [query.lifecycleStatus, 'a.lifecycle_status'],
      [query.conditionStatus, 'a.condition_status']
    ];
    for (const [value, column] of filters) {
      if (value) {
        where.push(`${column} = ?`);
        params.push(value);
      }
    }
    const sortColumns = {
      assetCode: 'a.asset_code',
      name: 'a.name',
      category: 'a.category',
      updatedAt: 'a.updated_at'
    } as const;
    const total = num(
      (
        this.sqlite
          .prepare(
            `SELECT COUNT(*) count FROM managed_assets a
      LEFT JOIN stations s ON s.id = a.station_id WHERE ${where.join(' AND ')}`
          )
          .get(...params) as Row
      ).count
    );
    const rows = this.sqlite
      .prepare(
        `${this.assetSelect()}
      WHERE ${where.join(' AND ')} ORDER BY ${sortColumns[query.sortBy]} ${query.sortDirection.toUpperCase()}
      LIMIT ? OFFSET ?`
      )
      .all(...params, query.limit, query.offset) as Row[];
    return {
      items: rows.map((row) => this.mapAsset(row)),
      total,
      limit: query.limit,
      offset: query.offset
    };
  }

  getAsset(id: string, scope: readonly string[], includeFinancial = false) {
    const row = this.sqlite.prepare(`${this.assetSelect()} WHERE a.id = ?`).get(id) as
      Row | undefined;
    if (!row) throw notFound('Corporate asset', id);
    this.assertRowScope(row, scope);
    const asset = this.mapAsset(row);
    const assignments = this.sqlite
      .prepare(
        `SELECT aa.*, e.full_name employee_name, d.department_name
      FROM asset_assignments aa LEFT JOIN employees e ON e.id = aa.employee_id
      LEFT JOIN departments d ON d.id = aa.department_id
      WHERE aa.asset_id = ? ORDER BY aa.started_at DESC`
      )
      .all(id) as Row[];
    const movements = this.sqlite
      .prepare(
        `SELECT m.*, fs.station_code from_station_code, ts.station_code to_station_code
      FROM asset_custody_movements m LEFT JOIN stations fs ON fs.id = m.from_station_id
      LEFT JOIN stations ts ON ts.id = m.to_station_id WHERE m.asset_id = ? ORDER BY m.moved_at DESC`
      )
      .all(id) as Row[];
    const maintenance = this.sqlite
      .prepare(
        `SELECT * FROM asset_maintenance_work_orders
      WHERE asset_id = ? ORDER BY created_at DESC`
      )
      .all(id) as Row[];
    const audits = this.sqlite
      .prepare(`SELECT * FROM asset_audits WHERE asset_id = ? ORDER BY audited_at DESC`)
      .all(id) as Row[];
    const insurance = this.sqlite
      .prepare(
        `SELECT * FROM asset_insurance_policies WHERE asset_id = ? ORDER BY expiry_date DESC`
      )
      .all(id) as Row[];
    const history = this.sqlite
      .prepare(`SELECT * FROM asset_action_history WHERE asset_id = ? ORDER BY created_at DESC`)
      .all(id) as Row[];
    const financial = includeFinancial
      ? (this.sqlite.prepare('SELECT * FROM asset_register WHERE managed_asset_id = ?').get(id) as
          Row | undefined)
      : undefined;
    return {
      ...asset,
      assignments: assignments.map((item) => this.camel(item)),
      movements: movements.map((item) => this.camel(item)),
      maintenance: maintenance.map((item) => this.camel(item)),
      audits: audits.map((item) => this.camel(item)),
      insurance: insurance.map((item) => this.camel(item)),
      history: history.map((item) => ({
        ...this.camel(item),
        before: JSON.parse(String(item.before_json)),
        after: JSON.parse(String(item.after_json))
      })),
      financial: includeFinancial
        ? financial
          ? this.camel(financial)
          : { financialStatus: 'NOT_CAPITALIZED' }
        : null
    };
  }

  createAsset(input: AssetInput, actorUserId: string, scope: readonly string[]) {
    this.assertInputReferences(input);
    this.assertStationScope(input.stationId, scope);
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      const id = `asset-${nanoid(10)}`;
      const assetCode = this.nextNumber(
        input.category,
        input.category === 'IT_EQUIPMENT' ? 'IT' : input.category.slice(0, 3)
      );
      try {
        this.sqlite
          .prepare(
            `INSERT INTO managed_assets
          (id, asset_code, name, category, brand, model, serial_number, station_id, location_type,
           location_detail, department_id, current_custodian_employee_id, custodian_name_snapshot,
           acquisition_date, acquisition_reference, lifecycle_status, condition_status, version,
           created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
          )
          .run(
            id,
            assetCode,
            input.name,
            input.category,
            input.brand,
            input.model,
            input.serialNumber,
            input.stationId,
            input.locationType,
            input.locationDetail,
            input.departmentId,
            input.currentCustodianEmployeeId,
            input.custodianNameSnapshot,
            input.acquisitionDate,
            input.acquisitionReference,
            input.lifecycleStatus,
            input.conditionStatus,
            timestamp,
            timestamp
          );
      } catch (error) {
        this.uniqueError(error, 'ASSET_DUPLICATE', 'Asset code or serial number already exists.');
      }
      if (input.currentCustodianEmployeeId || input.custodianNameSnapshot) {
        this.sqlite
          .prepare(
            `INSERT INTO asset_assignments
          (id, assignment_number, asset_id, employee_id, custodian_name_snapshot, department_id,
           station_id, location_snapshot, reason, started_at, created_by_user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `asg-${nanoid(10)}`,
            this.nextNumber('ASSIGNMENT', 'ASG'),
            id,
            input.currentCustodianEmployeeId,
            this.resolveCustodianName(
              input.currentCustodianEmployeeId,
              input.custodianNameSnapshot
            ),
            input.departmentId,
            input.stationId,
            input.locationDetail,
            'Initial custody recorded with asset creation.',
            timestamp,
            actorUserId,
            timestamp
          );
      }
      this.recordHistory(id, 'ASSET_CREATED', actorUserId, 'Corporate asset created.', {}, input);
      return id;
    });
    return this.getAsset(transaction.immediate(), scope);
  }

  updateAsset(id: string, input: AssetUpdate, actorUserId: string, scope: readonly string[]) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    this.assertInputReferences(input);
    this.assertStationScope(input.stationId, scope);
    if (
      input.lifecycleStatus !== before.lifecycle_status ||
      input.stationId !== before.station_id ||
      input.locationType !== before.location_type ||
      input.locationDetail !== before.location_detail ||
      input.currentCustodianEmployeeId !== before.current_custodian_employee_id ||
      input.custodianNameSnapshot !== before.custodian_name_snapshot ||
      input.conditionStatus !== before.condition_status
    ) {
      throw new DomainError(
        'ASSET_COMMAND_REQUIRED',
        'Lifecycle, condition, custody, and location changes require their dedicated command.',
        422
      );
    }
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      try {
        const result = this.sqlite
          .prepare(
            `UPDATE managed_assets SET name = ?, category = ?, brand = ?, model = ?,
          serial_number = ?, station_id = ?, location_type = ?, location_detail = ?, department_id = ?,
          current_custodian_employee_id = ?, custodian_name_snapshot = ?, acquisition_date = ?,
          acquisition_reference = ?, lifecycle_status = ?, condition_status = ?, version = version + 1,
          updated_at = ? WHERE id = ? AND version = ?`
          )
          .run(
            input.name,
            input.category,
            input.brand,
            input.model,
            input.serialNumber,
            input.stationId,
            input.locationType,
            input.locationDetail,
            input.departmentId,
            input.currentCustodianEmployeeId,
            input.custodianNameSnapshot,
            input.acquisitionDate,
            input.acquisitionReference,
            input.lifecycleStatus,
            input.conditionStatus,
            timestamp,
            id,
            input.expectedVersion
          );
        if (!result.changes) this.versionConflict(before);
      } catch (error) {
        if (error instanceof DomainError) throw error;
        this.uniqueError(error, 'ASSET_DUPLICATE', 'Asset serial number already exists.');
      }
      this.recordHistory(
        id,
        'ASSET_UPDATED',
        actorUserId,
        'Corporate asset updated.',
        this.camel(before),
        input
      );
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  assignAsset(id: string, input: AssetAssignInput, actorUserId: string, scope: readonly string[]) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    this.assertReference('employees', input.employeeId, 'Employee');
    this.assertReference('departments', input.departmentId, 'Department');
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      this.sqlite
        .prepare(
          'UPDATE asset_assignments SET ended_at = ? WHERE asset_id = ? AND ended_at IS NULL'
        )
        .run(input.startedAt, id);
      this.sqlite
        .prepare(
          `INSERT INTO asset_assignments
        (id, assignment_number, asset_id, employee_id, custodian_name_snapshot, department_id,
         station_id, location_snapshot, reason, started_at, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `asg-${nanoid(10)}`,
          this.nextNumber('ASSIGNMENT', 'ASG'),
          id,
          input.employeeId,
          input.custodianNameSnapshot,
          input.departmentId,
          before.station_id,
          before.location_detail,
          input.reason,
          input.startedAt,
          actorUserId,
          timestamp
        );
      this.bumpAsset(
        id,
        input.expectedVersion,
        'current_custodian_employee_id = ?, custodian_name_snapshot = ?, department_id = ?',
        [input.employeeId, input.custodianNameSnapshot, input.departmentId]
      );
      this.recordHistory(
        id,
        'ASSET_ASSIGNED',
        actorUserId,
        input.reason,
        this.camel(before),
        input
      );
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  moveAsset(
    id: string,
    input: AssetMoveInput,
    actorUserId: string,
    scope: readonly string[],
    allowCrossStation: boolean
  ) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    this.assertReference('stations', input.toStationId, 'Station');
    this.assertReference('employees', input.newEmployeeId, 'Employee');
    this.assertLocation(input.toStationId, input.toLocationType);
    if (!scope.includes('ALL') && !input.toStationId) {
      throw new DomainError(
        'ASSET_DESTINATION_SCOPE_REQUIRED',
        'Station-scoped users must keep the asset assigned to their station.',
        403
      );
    }
    if (!allowCrossStation && input.toStationId && input.toStationId !== before.station_id) {
      throw new DomainError(
        'ASSET_CROSS_STATION_FORBIDDEN',
        'Cross-station movement requires Demo Admin.',
        403
      );
    }
    const transaction = this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO asset_custody_movements
        (id, movement_number, asset_id, from_station_id, to_station_id, from_location, to_location,
         to_location_type, new_employee_id, new_custodian_name_snapshot, reason, moved_by_user_id, moved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `amv-${nanoid(10)}`,
          this.nextNumber('MOVEMENT', 'AMV'),
          id,
          before.station_id,
          input.toStationId,
          before.location_detail,
          input.toLocation,
          input.toLocationType,
          input.newEmployeeId,
          input.newCustodianNameSnapshot,
          input.reason,
          actorUserId,
          input.movedAt
        );
      this.sqlite
        .prepare(
          'UPDATE asset_assignments SET ended_at = ? WHERE asset_id = ? AND ended_at IS NULL'
        )
        .run(input.movedAt, id);
      if (input.newEmployeeId || input.newCustodianNameSnapshot) {
        const employee = input.newEmployeeId
          ? (this.sqlite
              .prepare('SELECT department_id FROM employees WHERE id = ?')
              .get(input.newEmployeeId) as Row | undefined)
          : undefined;
        this.sqlite
          .prepare(
            `INSERT INTO asset_assignments
          (id, assignment_number, asset_id, employee_id, custodian_name_snapshot, department_id,
           station_id, location_snapshot, reason, started_at, created_by_user_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `asg-${nanoid(10)}`,
            this.nextNumber('ASSIGNMENT', 'ASG'),
            id,
            input.newEmployeeId,
            this.resolveCustodianName(input.newEmployeeId, input.newCustodianNameSnapshot),
            str(employee?.department_id) ?? str(before.department_id),
            input.toStationId,
            input.toLocation,
            input.reason,
            input.movedAt,
            actorUserId,
            now()
          );
      }
      this.bumpAsset(
        id,
        input.expectedVersion,
        'station_id = ?, location_type = ?, location_detail = ?, current_custodian_employee_id = ?, custodian_name_snapshot = ?',
        [
          input.toStationId,
          input.toLocationType,
          input.toLocation,
          input.newEmployeeId,
          input.newCustodianNameSnapshot
        ]
      );
      this.recordHistory(id, 'ASSET_MOVED', actorUserId, input.reason, this.camel(before), input);
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  openMaintenance(
    id: string,
    input: MaintenanceWorkOrderInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    const active = this.sqlite
      .prepare(
        "SELECT id FROM asset_maintenance_work_orders WHERE asset_id = ? AND status IN ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS')"
      )
      .get(id) as Row | undefined;
    if (active) {
      throw new DomainError(
        'ASSET_MAINTENANCE_ACTIVE',
        'The asset already has an active maintenance work order.',
        422
      );
    }
    const workOrderId = `amw-${nanoid(10)}`;
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      this.sqlite
        .prepare(
          `INSERT INTO asset_maintenance_work_orders
        (id, work_order_number, asset_id, maintenance_type, priority, status, condition_before,
         summary, scheduled_at, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?)`
        )
        .run(
          workOrderId,
          this.nextNumber('WORK_ORDER', 'AMW'),
          id,
          input.maintenanceType,
          input.priority,
          before.condition_status,
          input.summary,
          input.scheduledAt,
          actorUserId,
          timestamp,
          timestamp
        );
      this.bumpAsset(id, input.expectedVersion, 'condition_status = ?', ['UNDER_MAINTENANCE']);
      this.recordHistory(
        id,
        'ASSET_SENT_TO_MAINTENANCE',
        actorUserId,
        input.summary,
        this.camel(before),
        { workOrderId }
      );
    });
    transaction.immediate();
    return this.requireWorkOrder(workOrderId);
  }

  completeMaintenance(
    workOrderId: string,
    input: MaintenanceCompleteInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const workOrder = this.requireWorkOrder(workOrderId);
    const before = this.requireAssetRow(String(workOrder.asset_id), scope);
    this.assertVersion(before, input.expectedVersion);
    if (workOrder.status === 'COMPLETED' || workOrder.status === 'CANCELLED') {
      throw new DomainError('ASSET_MAINTENANCE_TERMINAL', 'Work order is already terminal.', 422);
    }
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      this.sqlite
        .prepare(
          `UPDATE asset_maintenance_work_orders SET status = 'COMPLETED',
        condition_after = ?, completion_result = ?, completion_evidence_reference = ?, completed_at = ?, completed_by_user_id = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.conditionAfter,
          input.completionResult,
          input.evidenceReference,
          timestamp,
          actorUserId,
          timestamp,
          workOrderId
        );
      this.bumpAsset(String(workOrder.asset_id), input.expectedVersion, 'condition_status = ?', [
        input.conditionAfter
      ]);
      this.recordHistory(
        String(workOrder.asset_id),
        'ASSET_MAINTENANCE_COMPLETED',
        actorUserId,
        input.reason,
        this.camel(before),
        { workOrderId, conditionAfter: input.conditionAfter }
      );
    });
    transaction.immediate();
    return this.getAsset(String(workOrder.asset_id), scope);
  }

  recordAudit(id: string, input: AssetAuditInput, actorUserId: string, scope: readonly string[]) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    const auditId = `audit-${nanoid(10)}`;
    const hasDiscrepancy = input.lines.some(
      (line) => line.expectedValue !== line.actualValue || line.discrepancyType
    );
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      this.sqlite
        .prepare(
          `INSERT INTO asset_audits
        (id, audit_number, asset_id, auditor_employee_id, auditor_name_snapshot, audited_at,
         notes, has_discrepancy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          auditId,
          this.nextNumber('AUDIT', 'AUD'),
          id,
          input.auditorEmployeeId,
          input.auditorNameSnapshot,
          input.auditedAt,
          input.notes,
          hasDiscrepancy ? 1 : 0,
          timestamp
        );
      const insert = this.sqlite.prepare(`INSERT INTO asset_audit_lines
        (id, audit_id, field_name, expected_value, actual_value, discrepancy_type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const line of input.lines)
        insert.run(
          `audit-line-${nanoid(10)}`,
          auditId,
          line.fieldName,
          line.expectedValue,
          line.actualValue,
          line.discrepancyType,
          line.notes
        );
      this.bumpAsset(id, input.expectedVersion, '', []);
      this.recordHistory(
        id,
        hasDiscrepancy ? 'ASSET_AUDIT_DISCREPANCY' : 'ASSET_AUDITED',
        actorUserId,
        input.notes,
        this.camel(before),
        { auditId, hasDiscrepancy }
      );
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  reconcileAsset(
    id: string,
    input: ReconcileAssetInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    const audit = this.sqlite
      .prepare('SELECT * FROM asset_audits WHERE id = ? AND asset_id = ?')
      .get(input.auditId, id) as Row | undefined;
    if (!audit) throw notFound('Asset audit', input.auditId);
    if (!Boolean(audit.has_discrepancy)) {
      throw new DomainError(
        'ASSET_AUDIT_NO_DISCREPANCY',
        'Audit has no discrepancy to reconcile.',
        422
      );
    }
    if (audit.reconciled_at) {
      throw new DomainError('ASSET_AUDIT_RECONCILED', 'Audit has already been reconciled.', 422);
    }
    this.assertReference('stations', input.stationId, 'Station');
    this.assertStationScope(input.stationId, scope);
    this.assertLocation(input.stationId, input.locationType);
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      this.bumpAsset(
        id,
        input.expectedVersion,
        'station_id = ?, location_type = ?, location_detail = ?, condition_status = ?',
        [input.stationId, input.locationType, input.locationDetail, input.conditionStatus]
      );
      const result = this.sqlite
        .prepare(
          `UPDATE asset_audits SET reconciled_at = ?, reconciled_by_user_id = ?, reconciliation_reason = ?
           WHERE id = ? AND reconciled_at IS NULL AND has_discrepancy = 1`
        )
        .run(timestamp, actorUserId, input.reason, input.auditId);
      if (!result.changes) {
        throw new DomainError('ASSET_AUDIT_RECONCILED', 'Audit has already been reconciled.', 409);
      }
      this.recordHistory(
        id,
        'ASSET_RECONCILED',
        actorUserId,
        input.reason,
        this.camel(before),
        input
      );
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  upsertInsurance(
    id: string,
    input: InsuranceInput,
    actorUserId: string,
    scope: readonly string[]
  ) {
    const before = this.requireAssetRow(id, scope);
    this.assertVersion(before, input.expectedVersion);
    const transaction = this.sqlite.transaction(() => {
      const timestamp = now();
      const existing = this.sqlite
        .prepare('SELECT id FROM asset_insurance_policies WHERE asset_id = ? AND policy_number = ?')
        .get(id, input.policyNumber) as Row | undefined;
      if (existing) {
        this.sqlite
          .prepare(
            `UPDATE asset_insurance_policies SET insurer = ?, coverage_minor = ?, premium_minor = ?,
          effective_date = ?, expiry_date = ?, status = ?, updated_at = ? WHERE id = ?`
          )
          .run(
            input.insurer,
            input.coverageMinor,
            input.premiumMinor,
            input.effectiveDate,
            input.expiryDate,
            input.status,
            timestamp,
            existing.id
          );
      } else {
        this.sqlite
          .prepare(
            `INSERT INTO asset_insurance_policies
          (id, asset_id, insurer, policy_number, coverage_minor, premium_minor, effective_date,
           expiry_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `policy-${nanoid(10)}`,
            id,
            input.insurer,
            input.policyNumber,
            input.coverageMinor,
            input.premiumMinor,
            input.effectiveDate,
            input.expiryDate,
            input.status,
            timestamp,
            timestamp
          );
      }
      this.bumpAsset(id, input.expectedVersion, '', []);
      this.recordHistory(
        id,
        'ASSET_INSURANCE_UPDATED',
        actorUserId,
        input.policyNumber,
        this.camel(before),
        input
      );
    });
    transaction.immediate();
    return this.getAsset(id, scope);
  }

  overview(scope: readonly string[], includeFinancial: boolean) {
    const scopeSql = scope.includes('ALL')
      ? ''
      : `WHERE s.station_code IN (${scope.map(() => '?').join(', ')})`;
    const rows = this.sqlite
      .prepare(
        `SELECT a.* FROM managed_assets a LEFT JOIN stations s ON s.id = a.station_id ${scopeSql}`
      )
      .all(...(scope.includes('ALL') ? [] : scope)) as Row[];
    const ids = rows.map((row) => String(row.id));
    const discrepancyCount = ids.length
      ? num(
          (
            this.sqlite
              .prepare(
                `SELECT COUNT(*) count FROM asset_audits
      WHERE has_discrepancy = 1 AND reconciled_at IS NULL AND asset_id IN (${ids.map(() => '?').join(',')})`
              )
              .get(...ids) as Row
          ).count
        )
      : 0;
    const date = new Date(now());
    const soon = new Date(date.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
    const today = date.toISOString().slice(0, 10);
    const insurance = ids.length
      ? (this.sqlite
          .prepare(
            `SELECT expiry_date FROM asset_insurance_policies
      WHERE status = 'ACTIVE' AND asset_id IN (${ids.map(() => '?').join(',')})`
          )
          .all(...ids) as Row[])
      : [];
    const financialRows =
      includeFinancial && ids.length
        ? (this.sqlite
            .prepare(
              `SELECT * FROM asset_register
      WHERE managed_asset_id IN (${ids.map(() => '?').join(',')})`
            )
            .all(...ids) as Row[])
        : [];
    return {
      operational: {
        totalAssets: rows.length,
        activeAssets: rows.filter((row) => row.lifecycle_status === 'ACTIVE').length,
        serviceableAssets: rows.filter((row) => row.condition_status === 'SERVICEABLE').length,
        underMaintenance: rows.filter((row) => row.condition_status === 'UNDER_MAINTENANCE').length,
        unserviceableAssets: rows.filter((row) => row.condition_status === 'UNSERVICEABLE').length,
        auditDiscrepancies: discrepancyCount
      },
      insurance: {
        expired: insurance.filter((row) => String(row.expiry_date) < today).length,
        expiringSoon: insurance.filter(
          (row) => String(row.expiry_date) >= today && String(row.expiry_date) <= soon
        ).length
      },
      financial: includeFinancial
        ? {
            capitalizedAssets: financialRows.length,
            notCapitalizedAssets: rows.length - financialRows.length,
            acquisitionValue: financialRows.reduce(
              (sum, row) => sum + num(row.acquisition_value_minor),
              0
            ),
            currentBookValue: financialRows.reduce(
              (sum, row) => sum + num(row.current_book_value_minor),
              0
            ),
            depreciationMtd: 0,
            asOf:
              financialRows
                .map((row) => String(row.as_of_date))
                .sort()
                .at(-1) ?? null,
            source: 'Accounting'
          }
        : null
    };
  }

  listMaintenance(scope: readonly string[]) {
    const scoped = !scope.includes('ALL');
    return (
      this.sqlite
        .prepare(
          `SELECT work.*, asset.asset_code, asset.name asset_name,
      asset.version asset_version, station.station_code
      FROM asset_maintenance_work_orders work
      JOIN managed_assets asset ON asset.id = work.asset_id
      LEFT JOIN stations station ON station.id = asset.station_id
      ${scoped ? `WHERE station.station_code IN (${scope.map(() => '?').join(',')})` : ''}
      ORDER BY CASE work.status WHEN 'IN_PROGRESS' THEN 1 WHEN 'WAITING_PARTS' THEN 2 WHEN 'OPEN' THEN 3 ELSE 4 END,
      work.created_at DESC`
        )
        .all(...(scoped ? scope : [])) as Row[]
    ).map((row) => this.camel(row));
  }

  requireWorkOrder(id: string) {
    const row = this.sqlite
      .prepare('SELECT * FROM asset_maintenance_work_orders WHERE id = ?')
      .get(id) as Row | undefined;
    if (!row) throw notFound('Corporate asset work order', id);
    return row;
  }

  private assetSelect() {
    return `SELECT a.*, s.station_code, s.station_name, d.department_name,
      e.full_name custodian_employee_name,
      CASE WHEN aa.id IS NULL THEN 'UNASSIGNED' ELSE 'ASSIGNED' END custody_status,
      CASE WHEN ar.id IS NULL THEN 'NOT_CAPITALIZED' ELSE 'CAPITALIZED' END financial_status
      FROM managed_assets a
      LEFT JOIN stations s ON s.id = a.station_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN employees e ON e.id = a.current_custodian_employee_id
      LEFT JOIN asset_assignments aa ON aa.asset_id = a.id AND aa.ended_at IS NULL
      LEFT JOIN asset_register ar ON ar.managed_asset_id = a.id`;
  }

  private mapAsset(row: Row) {
    return {
      id: String(row.id),
      assetCode: String(row.asset_code),
      name: String(row.name),
      category: String(row.category),
      brand: str(row.brand),
      model: str(row.model),
      serialNumber: str(row.serial_number),
      stationId: str(row.station_id),
      stationCode: str(row.station_code),
      stationName: str(row.station_name),
      locationType: String(row.location_type),
      locationDetail: String(row.location_detail),
      departmentId: str(row.department_id),
      departmentName: str(row.department_name),
      currentCustodianEmployeeId: str(row.current_custodian_employee_id),
      custodianName: str(row.custodian_employee_name) ?? str(row.custodian_name_snapshot),
      acquisitionDate: str(row.acquisition_date),
      acquisitionReference: str(row.acquisition_reference),
      lifecycleStatus: String(row.lifecycle_status),
      conditionStatus: String(row.condition_status),
      custodyStatus: String(row.custody_status),
      financialStatus: String(row.financial_status),
      version: num(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private requireAssetRow(id: string, scope: readonly string[]) {
    const row = this.sqlite
      .prepare(
        `SELECT a.*, s.station_code FROM managed_assets a LEFT JOIN stations s ON s.id = a.station_id WHERE a.id = ?`
      )
      .get(id) as Row | undefined;
    if (!row) throw notFound('Corporate asset', id);
    this.assertRowScope(row, scope);
    return row;
  }

  private assertRowScope(row: Row, scope: readonly string[]) {
    const code = str(row.station_code);
    if (!scope.includes('ALL') && (!code || !scope.includes(code))) {
      throw new DomainError(
        'ASSET_STATION_FORBIDDEN',
        'Corporate asset is outside the active station scope.',
        403,
        { stationCode: code, scope }
      );
    }
  }

  private assertStationScope(stationId: string | null, scope: readonly string[]) {
    if (scope.includes('ALL')) return;
    const row = stationId
      ? (this.sqlite.prepare('SELECT station_code FROM stations WHERE id = ?').get(stationId) as
          Row | undefined)
      : undefined;
    if (!row || !scope.includes(String(row.station_code))) {
      throw new DomainError(
        'ASSET_STATION_FORBIDDEN',
        'Station is outside the active role scope.',
        403,
        { stationId, scope }
      );
    }
  }

  private assertInputReferences(input: AssetInput) {
    this.assertReference('stations', input.stationId, 'Station');
    this.assertReference('departments', input.departmentId, 'Department');
    this.assertReference('employees', input.currentCustodianEmployeeId, 'Employee');
    this.assertLocation(input.stationId, input.locationType);
  }

  private assertLocation(stationId: string | null, locationType: string) {
    if (
      !stationId &&
      !['TRANSIT', 'VENDOR', 'UNASSIGNED', 'RETIRED', 'LOST'].includes(locationType)
    ) {
      throw new DomainError(
        'ASSET_LOCATION_INVALID',
        'A station is required for this location type.',
        422
      );
    }
  }

  private assertReference(table: string, id: string | null, label: string) {
    if (!id) return;
    if (!this.sqlite.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id))
      throw notFound(label, id);
  }

  private resolveCustodianName(employeeId: string | null, snapshot: string | null) {
    if (snapshot) return snapshot;
    const employee = employeeId
      ? (this.sqlite.prepare('SELECT full_name FROM employees WHERE id = ?').get(employeeId) as
          Row | undefined)
      : undefined;
    if (employee?.full_name) return String(employee.full_name);
    throw new DomainError(
      'ASSET_CUSTODIAN_NAME_REQUIRED',
      'A custodian name is required when custody is assigned.',
      422
    );
  }

  private assertVersion(row: Row, expected: number) {
    if (num(row.version) !== expected) this.versionConflict(row);
  }

  private versionConflict(row: Row): never {
    throw new DomainError(
      'ASSET_VERSION_CONFLICT',
      'Corporate asset changed on the server. Refresh before retrying.',
      409,
      {
        currentVersion: num(row.version),
        currentUpdatedAt: String(row.updated_at)
      }
    );
  }

  private bumpAsset(id: string, version: number, assignments: string, values: unknown[]) {
    const set = assignments ? `${assignments}, ` : '';
    const result = this.sqlite
      .prepare(
        `UPDATE managed_assets SET ${set}version = version + 1, updated_at = ? WHERE id = ? AND version = ?`
      )
      .run(...values, now(), id, version);
    if (!result.changes) {
      const row = this.sqlite.prepare('SELECT * FROM managed_assets WHERE id = ?').get(id) as Row;
      this.versionConflict(row);
    }
  }

  private nextNumber(type: string, prefix: string) {
    this.sqlite
      .prepare(
        `INSERT INTO asset_number_sequences (sequence_type, current_value) VALUES (?, 0)
      ON CONFLICT(sequence_type) DO NOTHING`
      )
      .run(type);
    this.sqlite
      .prepare(
        'UPDATE asset_number_sequences SET current_value = current_value + 1 WHERE sequence_type = ?'
      )
      .run(type);
    const row = this.sqlite
      .prepare('SELECT current_value FROM asset_number_sequences WHERE sequence_type = ?')
      .get(type) as Row;
    return `${prefix}-${String(row.current_value).padStart(5, '0')}`;
  }

  private recordHistory(
    assetId: string,
    action: string,
    actor: string,
    reason: string | null | undefined,
    before: unknown,
    after: unknown
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO asset_action_history
      (id, asset_id, action_type, actor_user_id, reason, before_json, after_json, request_context_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?)`
      )
      .run(
        `asset-history-${nanoid(10)}`,
        assetId,
        action,
        actor,
        reason ?? null,
        JSON.stringify(before ?? {}),
        JSON.stringify(after ?? {}),
        now()
      );
  }

  private uniqueError(error: unknown, code: string, message: string): never {
    if (error instanceof Error && /UNIQUE constraint failed/u.test(error.message)) {
      throw new DomainError(code, message, 409);
    }
    throw error;
  }

  private camel(row: Row) {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase()),
        value
      ])
    );
  }
}
