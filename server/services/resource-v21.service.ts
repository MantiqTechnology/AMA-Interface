import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { DomainError } from '#server/utils/errors';
import type {
  MaintenanceAtpResultDto,
  MaintenanceResourceDeclarationDto,
  MaintenanceMaterialRequirementDto,
  MaintenanceInventoryReservationDto,
  MaintenanceToolRequirementDto,
  MaintenanceToolAllocationV2Dto,
  MaintenanceToolCandidateDto,
  MaintenancePersonnelRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelCandidateDto,
  MaintenanceAmoOrganizationDto,
  MaintenanceAmoScopeDto,
  MaintenanceResourceReadinessDto,
  MaintenanceFlightMroLinkDto,
  MroEligibilityResult,
  MroEligibilityBlocker,
  MroEligibilitySection,
  MroEligibilitySectionKey,
  FlightMroReadinessDto,
  PersonnelEligibilitySnapshot,
  DeclareResourceInput,
  CreateMaterialRequirementInput,
  ReserveMaterialInput,
  IssueMaterialInput,
  ReleaseMaterialReservationInput,
  InstallMaterialInput,
  ConsumeMaterialInput,
  ReturnMaterialInput,
  CreateToolRequirementInput,
  AllocateToolInput,
  AssignToolCustodyInput,
  ReturnToolInput,
  CreatePersonnelRequirementInput,
  AssignPersonnelInput,
  LinkFlightMroInput,
  UnlinkFlightMroInput,
  ResourcePlanningType,
  ResourcePlanningDeclaration,
  MaterialRequirementStatus,
  ReservationStatus,
  ToolRequirementStatus,
  ToolAllocationStatus,
  PersonnelRoleType,
  PersonnelRequirementStatus,
  PersonnelAssignmentStatus,
  PersonnelEligibilityStatus,
  FlightMroLinkStatus,
  MaintenanceMaterialInstallationDto,
  MaintenanceMaterialTraceabilityDto,
  ResourceAvailabilityStatus
} from '#shared/features/maintenance-v21';

type SqlRow = Record<string, string | number | bigint | Buffer | null>;

type AuditActor = {
  userId: string;
  role: string;
  requestId?: string;
};

type ResourceSlotWindow = {
  workPackageId: string;
  aircraftId: string;
  plannedStartAt: string;
  plannedEndAt: string;
};

type PersonnelEligibilityEvaluation = {
  snapshot: PersonnelEligibilitySnapshot;
  reasons: string[];
  availabilityStatus: ResourceAvailabilityStatus;
  conflictingWorkPackageId: string | null;
  conflictingAssignmentId: string | null;
  eligible: boolean;
};

type ToolEligibilityEvaluation = {
  reasons: string[];
  availabilityStatus: ResourceAvailabilityStatus;
  conflictingWorkPackageId: string | null;
  conflictingAllocationId: string | null;
  eligible: boolean;
  scheduleValidated: boolean;
  calibrationExpiresAt: string | null;
};

function now() {
  return new Date().toISOString();
}

function number(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function jsonStringArray(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export class ResourceV21Service {
  constructor(private readonly sqlite: Database.Database) {}

  private currentResourceSlot(workPackageId: string): ResourceSlotWindow | null {
    const row = this.sqlite
      .prepare(
        `SELECT work_package_id, aircraft_id, planned_start_at, planned_end_at
         FROM maintenance_slots
         WHERE work_package_id = ? AND status IN ('BOOKED', 'IN_PROGRESS')
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(workPackageId) as SqlRow | undefined;

    return row
      ? {
          workPackageId: String(row.work_package_id),
          aircraftId: String(row.aircraft_id),
          plannedStartAt: String(row.planned_start_at),
          plannedEndAt: String(row.planned_end_at)
        }
      : null;
  }

  private resourceWindow(
    workPackageId: string,
    fallbackStart: string,
    fallbackEnd: string
  ): { start: string; end: string; scheduleValidated: boolean } {
    const slot = this.currentResourceSlot(workPackageId);
    if (slot) {
      return {
        start: slot.plannedStartAt,
        end: slot.plannedEndAt,
        scheduleValidated: true
      };
    }
    return { start: fallbackStart, end: fallbackEnd, scheduleValidated: false };
  }

  private activeWindowOverlapSql(alias: string) {
    return `${alias}.planned_start_at < ? AND ${alias}.planned_end_at > ?`;
  }

  // =============================================================================
  // ATP (Available-to-Promise)
  // =============================================================================

  calculateAtp(partId: string, stationId: string): MaintenanceAtpResultDto {
    const evaluatedAt = now();

    const part = this.sqlite
      .prepare(
        `SELECT id, part_number, part_name, unit_of_measure, lifecycle_type, tracking_type
         FROM inventory_parts
         WHERE id = ?`
      )
      .get(partId) as SqlRow | undefined;

    if (!part) {
      throw new DomainError('PART_NOT_FOUND', `Part ${partId} not found`, 404);
    }

    // Get station details
    const station = this.sqlite
      .prepare(`SELECT id, station_code AS code FROM stations WHERE id = ?`)
      .get(stationId) as SqlRow | undefined;

    if (!station) {
      throw new DomainError('STATION_NOT_FOUND', `Station ${stationId} not found`, 404);
    }

    const stockBalance = this.sqlite
      .prepare(
        `SELECT
            COALESCE(SUM(CASE WHEN stock.condition = 'SERVICEABLE' THEN stock.on_hand_quantity ELSE 0 END), 0) AS serviceable_on_hand,
            COALESCE(SUM(CASE WHEN stock.condition = 'QUARANTINE' THEN stock.on_hand_quantity ELSE 0 END), 0) AS quarantined,
            COALESCE(SUM(CASE WHEN stock.condition NOT IN ('SERVICEABLE', 'QUARANTINE') THEN stock.on_hand_quantity ELSE 0 END), 0) AS restricted
         FROM inventory_stock_balances stock
         JOIN inventory_bins bin ON bin.id = stock.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         WHERE stock.part_id = ? AND warehouse.station_id = ?`
      )
      .get(partId, stationId) as SqlRow;

    const serviceableOnHand = number(stockBalance.serviceable_on_hand);
    const quarantinedQuantity = number(stockBalance.quarantined);
    const restrictedQuantity = number(stockBalance.restricted);

    // Get active reservations
    const activeReservations = this.sqlite
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) AS total_reserved
         FROM maintenance_inventory_reservations
         WHERE part_id = ? AND station_id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
      )
      .get(partId, stationId) as SqlRow;

    const activeReservationQty = number(activeReservations.total_reserved);

    const serializedParts = this.sqlite
      .prepare(
        `SELECT sp.id AS serialized_part_id,
                sp.serial_number,
                sp.condition,
                COALESCE(r.id, '') AS reservation_id,
                r.work_package_id
         FROM inventory_serialized_parts sp
         JOIN inventory_bins bin ON bin.id = sp.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         LEFT JOIN maintenance_inventory_reservations r
           ON r.serialized_part_id = sp.id
           AND r.status IN ('ACTIVE', 'PARTIALLY_ISSUED')
         WHERE sp.part_id = ? AND warehouse.station_id = ?
         ORDER BY sp.serial_number`
      )
      .all(partId, stationId) as SqlRow[];

    const serializedAvailability = serializedParts.map((row) => ({
      serializedPartId: String(row.serialized_part_id),
      serialNumber: String(row.serial_number),
      condition: String(row.condition),
      available: String(row.condition) === 'SERVICEABLE' && !row.reservation_id,
      reservedByPackageId: nullableText(row.work_package_id)
    }));

    const availableToPromise = Math.max(0, serviceableOnHand - activeReservationQty);

    return {
      partId,
      partNumber: String(part.part_number),
      partName: String(part.part_name),
      stationId,
      stationCode: String(station.code),
      serviceableOnHand,
      activeReservations: activeReservationQty,
      quarantinedQuantity,
      restrictedQuantity,
      availableToPromise,
      unit: String(part.unit_of_measure),
      serializedAvailability,
      evaluatedAt
    };
  }

  // =============================================================================
  // Resource Planning Declarations
  // =============================================================================

  declareResource(
    workPackageId: string,
    input: DeclareResourceInput,
    actor: AuditActor
  ): MaintenanceResourceDeclarationDto {
    const timestamp = now();
    const workPackage = this.requireWorkPackage(workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    const id = `mrdecl-${nanoid(12)}`;

    try {
      this.sqlite.transaction(() => {
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_resource_planning_declarations (
              id, work_package_id, resource_type, declaration, reason, evidence_document_id,
              declared_by, declared_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(work_package_id, resource_type) DO UPDATE SET
              declaration = excluded.declaration,
              reason = excluded.reason,
              evidence_document_id = excluded.evidence_document_id,
              declared_by = excluded.declared_by,
              declared_at = excluded.declared_at,
              updated_at = excluded.updated_at`
          )
          .run(
            id,
            workPackageId,
            input.resourceType,
            input.declaration,
            input.reason ?? null,
            input.evidenceDocumentId ?? null,
            actor.userId,
            timestamp,
            timestamp
          );

        this.audit('RESOURCE_DECLARATION', id, 'DECLARED', actor, {
          workPackageId,
          resourceType: input.resourceType,
          declaration: input.declaration
        });
      })();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'RESOURCE_DECLARATION_EXISTS',
          'Resource declaration already exists for this type',
          409
        );
      }
      throw error;
    }

    return this.getResourceDeclaration(workPackageId, input.resourceType);
  }

  private getResourceDeclaration(
    workPackageId: string,
    resourceType: ResourcePlanningType
  ): MaintenanceResourceDeclarationDto {
    const row = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_resource_planning_declarations
         WHERE work_package_id = ? AND resource_type = ?`
      )
      .get(workPackageId, resourceType) as SqlRow;

    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      resourceType: String(row.resource_type) as ResourcePlanningType,
      declaration: String(row.declaration) as ResourcePlanningDeclaration,
      reason: nullableText(row.reason),
      evidenceDocumentId: nullableText(row.evidence_document_id),
      declaredBy: String(row.declared_by),
      declaredAt: String(row.declared_at),
      updatedAt: String(row.updated_at)
    };
  }

  // =============================================================================
  // Material Requirements
  // =============================================================================

  createMaterialRequirement(
    input: CreateMaterialRequirementInput,
    actor: AuditActor
  ): MaintenanceMaterialRequirementDto {
    const timestamp = now();
    const workPackage = this.requireWorkPackage(input.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);
    this.assertJobCardBelongsToWorkPackage(input.jobCardId ?? null, input.workPackageId);

    // Validate part_id OR serialized_part_id (not both, not neither)
    if (input.partId && input.serializedPartId) {
      throw new DomainError(
        'INVALID_INPUT',
        'Cannot specify both partId and serializedPartId',
        400
      );
    }
    if (!input.partId && !input.serializedPartId) {
      throw new DomainError('INVALID_INPUT', 'Must specify either partId or serializedPartId', 400);
    }

    // Validate quantity
    if (input.requiredQuantity <= 0) {
      throw new DomainError('INVALID_INPUT', 'Required quantity must be greater than zero', 400);
    }

    const id = `mmreq-${nanoid(12)}`;

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_work_package_material_requirements (
	            id, work_package_id, job_card_id, part_id, serialized_part_id, required_quantity,
	            unit, requested_station_id, required_by, reason, status, source,
	            notes, created_by, created_at, updated_at
	          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', 'MANUAL', ?, ?, ?, ?)`
        )
        .run(
          id,
          input.workPackageId,
          input.jobCardId ?? null,
          input.partId ?? null,
          input.serializedPartId ?? null,
          input.requiredQuantity,
          input.unit,
          input.requestedStationId,
          input.requiredBy ?? null,
          input.reason ?? null,
          input.notes ?? null,
          actor.userId,
          timestamp,
          timestamp
        );

      this.audit('MATERIAL_REQUIREMENT', id, 'CREATED', actor, {
        workPackageId: input.workPackageId,
        partId: input.partId ?? null,
        serializedPartId: input.serializedPartId ?? null,
        quantity: input.requiredQuantity
      });
    })();

    return this.getMaterialRequirement(id);
  }

  private getMaterialRequirement(id: string): MaintenanceMaterialRequirementDto {
    const row = this.sqlite
      .prepare(
        `SELECT mr.*,
	                p.part_number, p.part_name, p.lifecycle_type, p.tracking_type,
	                p.certificate_required AS part_certificate_required,
	                COALESCE(SUM(CASE WHEN r.status IN ('ACTIVE', 'PARTIALLY_ISSUED') THEN r.quantity ELSE 0 END), 0) AS reserved_quantity,
	                COALESCE(SUM(CASE WHEN r.status = 'ISSUED' THEN COALESCE(r.issued_quantity, r.quantity) ELSE 0 END), 0) AS issued_quantity,
	                COALESCE((
	                  SELECT SUM(inst.quantity)
	                  FROM maintenance_material_installations inst
	                  WHERE inst.material_requirement_id = mr.id AND inst.status = 'INSTALLED'
	                ), 0) AS installed_quantity,
	                0 AS consumed_quantity,
	                0 AS returned_quantity
         FROM maintenance_work_package_material_requirements mr
         LEFT JOIN inventory_parts p ON p.id = mr.part_id
         LEFT JOIN maintenance_inventory_reservations r ON r.material_requirement_id = mr.id
         WHERE mr.id = ?
         GROUP BY mr.id`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError(
        'MATERIAL_REQUIREMENT_NOT_FOUND',
        `Material requirement ${id} not found`,
        404
      );
    }

    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      partId: nullableText(row.part_id),
      serializedPartId: nullableText(row.serialized_part_id),
      requiredQuantity: number(row.required_quantity),
      unit: String(row.unit),
      requestedStationId: nullableText(row.requested_station_id),
      requiredBy: nullableText(row.required_by),
      status: String(row.status) as MaterialRequirementStatus,
      reason: nullableText(row.reason),
      source: 'MANUAL',
      notes: nullableText(row.notes),
      createdBy: nullableText(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      reservedQuantity: number(row.reserved_quantity),
      issuedQuantity: number(row.issued_quantity),
      consumedQuantity: number(row.consumed_quantity),
      returnedQuantity: number(row.returned_quantity),
      installedQuantity: number(row.installed_quantity),
      lifecycleStatus: this.materialLifecycleStatus(
        number(row.required_quantity),
        number(row.reserved_quantity),
        number(row.issued_quantity),
        number(row.installed_quantity)
      ),
      satisfied: number(row.installed_quantity) >= number(row.required_quantity),
      partNumber: nullableText(row.part_number),
      partName: nullableText(row.part_name),
      partLifecycleType: nullableText(row.lifecycle_type),
      partTrackingType: nullableText(row.tracking_type),
      partCertificateRequired: Boolean(row.part_certificate_required)
    };
  }

  // =============================================================================
  // Material Reservation (ATOMIC with concurrency control)
  // =============================================================================

  reserveMaterial(
    input: ReserveMaterialInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceInventoryReservationDto {
    const timestamp = now();
    const materialRequirement = this.getMaterialRequirement(input.materialRequirementId);
    const workPackage = this.requireWorkPackage(materialRequirement.workPackageId);
    this.assertResourceWorkPackage(expectedWorkPackageId, materialRequirement.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    // Use IMMEDIATE transaction for concurrency control
    let reservation: MaintenanceInventoryReservationDto | null = null;

    try {
      this.sqlite
        .transaction(() => {
          const replay = this.sqlite
            .prepare(
              `SELECT id FROM maintenance_inventory_reservations
	             WHERE reserve_idempotency_key = ? AND material_requirement_id = ?`
            )
            .get(input.idempotencyKey, input.materialRequirementId) as SqlRow | undefined;
          if (replay) {
            reservation = this.getReservation(String(replay.id));
            return;
          }
          if (input.serializedPartId) {
            const existingReservation = this.sqlite
              .prepare(
                `SELECT id FROM maintenance_inventory_reservations
               WHERE serialized_part_id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
              )
              .get(input.serializedPartId) as SqlRow | undefined;

            if (existingReservation) {
              throw new DomainError(
                'SERIAL_ALREADY_RESERVED',
                `Serialized part ${input.serializedPartId} is already reserved`,
                409
              );
            }
          }

          // Check ATP
          const atp = this.calculateAtp(materialRequirement.partId!, input.stationId);
          if (atp.availableToPromise < input.quantity) {
            throw new DomainError(
              'MATERIAL_INSUFFICIENT_ATP',
              `Insufficient ATP: requested ${input.quantity}, available ${atp.availableToPromise}`,
              409,
              { requested: input.quantity, available: atp.availableToPromise }
            );
          }

          // Check serialized part not already reserved
          if (input.serializedPartId) {
            const existingReservation = this.sqlite
              .prepare(
                `SELECT id FROM maintenance_inventory_reservations
               WHERE serialized_part_id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
              )
              .get(input.serializedPartId) as SqlRow | undefined;

            if (existingReservation) {
              throw new DomainError(
                'SERIAL_ALREADY_RESERVED',
                `Serialized part ${input.serializedPartId} is already reserved`,
                409
              );
            }
          }

          // Check part serviceability, expiry, certificate
          if (input.serializedPartId) {
            const serializedPart = this.sqlite
              .prepare(`SELECT * FROM inventory_serialized_parts WHERE id = ?`)
              .get(input.serializedPartId) as SqlRow | undefined;

            if (!serializedPart) {
              throw new DomainError(
                'SERIALIZED_PART_NOT_FOUND',
                `Serialized part ${input.serializedPartId} not found`,
                404
              );
            }

            if (String(serializedPart.condition) !== 'SERVICEABLE') {
              throw new DomainError(
                'MATERIAL_UNSERVICEABLE',
                `Serialized part is not serviceable: ${serializedPart.condition}`,
                409
              );
            }

            const lotExpiry = this.sqlite
              .prepare(
                `SELECT lot.expires_at
               FROM inventory_serialized_parts serial
               JOIN inventory_lots lot ON lot.id = serial.lot_id
               WHERE serial.id = ? AND lot.expires_at IS NOT NULL`
              )
              .get(input.serializedPartId) as SqlRow | undefined;

            if (lotExpiry?.expires_at && new Date(String(lotExpiry.expires_at)) < new Date()) {
              throw new DomainError(
                'MATERIAL_SHELF_LIFE_EXPIRED',
                'Serialized part lot has expired',
                409
              );
            }
          }

          this.assertReserveInputSourceEligibility(materialRequirement, input);

          const id = `mres-${nanoid(12)}`;
          const reservationNumber = `RES-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;

          this.sqlite
            .prepare(
              `INSERT INTO maintenance_inventory_reservations (
	              id, reservation_number, material_requirement_id, work_package_id, job_card_id,
	              aircraft_id, flight_order_id, inventory_item_id, part_id, serialized_part_id,
	              lot_number, station_id, inventory_location_id, quantity, unit,
	              expiry_at, certificate_reference, certificate_document_id,
	              status, reserve_idempotency_key, reserved_by, reserved_at, version, created_at, updated_at
	            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, ?, ?)`
            )
            .run(
              id,
              reservationNumber,
              input.materialRequirementId,
              materialRequirement.workPackageId,
              materialRequirement.jobCardId,
              workPackage.aircraft_id,
              null,
              input.inventoryItemId,
              materialRequirement.partId,
              input.serializedPartId ?? null,
              input.lotNumber ?? null,
              input.stationId,
              input.inventoryLocationId ?? null,
              input.quantity,
              input.unit,
              null,
              input.certificateReference ?? null,
              input.certificateDocumentId ?? null,
              input.idempotencyKey,
              actor.userId,
              timestamp,
              timestamp,
              timestamp
            );

          // Insert reservation event
          const eventId = `mresev-${nanoid(12)}`;
          this.sqlite
            .prepare(
              `INSERT INTO maintenance_reservation_events (
              id, reservation_id, event_type, quantity, actor_user_id, actor_role,
              reason, before_snapshot_json, after_snapshot_json, idempotency_key, occurred_at, created_at
            ) VALUES (?, ?, 'RESERVED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              eventId,
              id,
              input.quantity,
              actor.userId,
              actor.role,
              null,
              JSON.stringify({ status: 'NONE' }),
              JSON.stringify({
                status: 'ACTIVE',
                quantity: input.quantity,
                reservationNumber
              }),
              input.idempotencyKey,
              timestamp,
              timestamp
            );

          // Update material requirement status
          this.sqlite
            .prepare(
              `UPDATE maintenance_work_package_material_requirements
             SET status = CASE
               WHEN required_quantity <= (
                 SELECT COALESCE(SUM(quantity), 0)
                 FROM maintenance_inventory_reservations
                 WHERE material_requirement_id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')
               ) THEN 'RESERVED'
               ELSE 'REQUESTED'
             END,
             updated_at = ?
             WHERE id = ?`
            )
            .run(input.materialRequirementId, timestamp, input.materialRequirementId);

          this.audit('INVENTORY_RESERVATION', id, 'RESERVED', actor, {
            reservationNumber,
            quantity: input.quantity,
            partId: materialRequirement.partId,
            serializedPartId: input.serializedPartId ?? null
          });

          reservation = this.getReservation(id);
        })
        .immediate();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'CONCURRENT_RESERVATION_CONFLICT',
          'Concurrent reservation conflict detected',
          409
        );
      }
      throw error;
    }

    return reservation!;
  }

  private getReservation(id: string): MaintenanceInventoryReservationDto {
    const row = this.sqlite
      .prepare(
        `SELECT r.*,
                sp.serial_number,
                bin.bin_name AS inventory_location_name
         FROM maintenance_inventory_reservations r
         LEFT JOIN inventory_serialized_parts sp ON sp.id = r.serialized_part_id
         LEFT JOIN inventory_bins bin ON bin.id = r.inventory_location_id
         WHERE r.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError('RESERVATION_NOT_FOUND', `Reservation ${id} not found`, 404);
    }

    return {
      id: String(row.id),
      reservationNumber: String(row.reservation_number),
      materialRequirementId: String(row.material_requirement_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      aircraftId: String(row.aircraft_id),
      flightOrderId: nullableText(row.flight_order_id),
      inventoryItemId: String(row.inventory_item_id),
      partId: String(row.part_id),
      serializedPartId: nullableText(row.serialized_part_id),
      lotNumber: nullableText(row.lot_number),
      serialNumber: nullableText(row.serial_number),
      stationId: String(row.station_id),
      inventoryLocationId: nullableText(row.inventory_location_id),
      quantity: number(row.quantity),
      unit: String(row.unit),
      expiryAt: nullableText(row.expiry_at),
      certificateReference: nullableText(row.certificate_reference),
      certificateDocumentId: nullableText(row.certificate_document_id),
      status: String(row.status) as ReservationStatus,
      reservedBy: String(row.reserved_by),
      reservedAt: String(row.reserved_at),
      releasedBy: nullableText(row.released_by),
      releasedAt: nullableText(row.released_at),
      releaseReason: nullableText(row.release_reason),
      issueId: nullableText(row.issue_id),
      issueMovementId: nullableText(row.issue_movement_id),
      issuedQuantity: number(row.issued_quantity),
      issuedBy: nullableText(row.issued_by),
      issuedAt: nullableText(row.issued_at),
      version: number(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  // =============================================================================
  // Material Lifecycle
  // =============================================================================

  issueMaterial(
    input: IssueMaterialInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceInventoryReservationDto {
    const timestamp = now();
    const reservation = this.getReservation(input.reservationId);
    this.assertResourceWorkPackage(expectedWorkPackageId, reservation.workPackageId);
    const workPackage = this.requireWorkPackage(reservation.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    if (reservation.status === 'ISSUED' && reservation.issueId) {
      const replay = this.sqlite
        .prepare(
          `SELECT issue_idempotency_key FROM maintenance_inventory_reservations WHERE id = ?`
        )
        .get(input.reservationId) as SqlRow | undefined;
      if (String(replay?.issue_idempotency_key ?? '') === input.idempotencyKey) {
        return this.getReservation(input.reservationId);
      }
      throw new DomainError('MATERIAL_ALREADY_ISSUED', 'Material has already been issued.', 409);
    }
    if (!['ACTIVE', 'PARTIALLY_ISSUED'].includes(reservation.status)) {
      throw new DomainError(
        'MATERIAL_NOT_RESERVED',
        'Material must be reserved before issue.',
        409
      );
    }
    if (input.quantity > reservation.quantity) {
      throw new DomainError(
        'ISSUE_QUANTITY_EXCEEDS_RESERVED',
        'Issue quantity cannot exceed the reserved quantity.',
        409
      );
    }
    if (Math.abs(input.quantity - reservation.quantity) > 0.000001) {
      throw new DomainError(
        'PARTIAL_ISSUE_NOT_SUPPORTED',
        'M2 material issue requires the full reserved quantity.',
        409
      );
    }

    let updatedReservation: MaintenanceInventoryReservationDto | null = null;
    this.sqlite
      .transaction(() => {
        const source = this.requireReservationSource(reservation);
        const issueId = `inv-issue-mro-${nanoid(10)}`;
        const movementId = `inv-move-mro-${nanoid(10)}`;
        const issueNumber = `ISS-MRO-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
        const movementNumber = `MOV-MRO-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;

        this.sqlite
          .prepare(
            `UPDATE maintenance_inventory_reservations
           SET status = 'ISSUED',
               issued_quantity = ?, issued_by = ?, issued_at = ?,
               issue_idempotency_key = ?, version = version + 1, updated_at = ?
           WHERE id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')`
          )
          .run(
            input.quantity,
            actor.userId,
            timestamp,
            input.idempotencyKey,
            timestamp,
            input.reservationId
          );

        const claimed = this.sqlite
          .prepare(
            `SELECT status, issue_id, issue_idempotency_key
           FROM maintenance_inventory_reservations
           WHERE id = ?`
          )
          .get(input.reservationId) as SqlRow | undefined;
        if (
          claimed &&
          String(claimed.status) === 'ISSUED' &&
          String(claimed.issue_idempotency_key ?? '') === input.idempotencyKey
        ) {
          if (claimed.issue_id && String(claimed.issue_id) !== issueId) {
            updatedReservation = this.getReservation(input.reservationId);
            return;
          }
        } else {
          throw new DomainError(
            'MATERIAL_ALREADY_ISSUED',
            'Material has already been issued.',
            409
          );
        }

        this.assertReservableSourceEligibility(reservation, source);
        this.decrementIssuedStock(source, input.quantity, reservation.serializedPartId);

        this.sqlite
          .prepare(
            `INSERT INTO inventory_movements (
            id, movement_number, movement_type, source_type, source_id, station_id,
            aircraft_id, reason, status, total_base_value_idr, is_finalized, created_by_user_id, created_at
		          ) VALUES (?, ?, 'ISSUE', 'MAINTENANCE_PART_ISSUE', ?, ?, ?, ?, 'POSTED', 0, 0, ?, ?)`
          )
          .run(
            movementId,
            movementNumber,
            issueId,
            reservation.stationId,
            reservation.aircraftId,
            `Issue reserved material ${reservation.reservationNumber}.`,
            actor.userId,
            timestamp
          );

        this.sqlite
          .prepare(
            `INSERT INTO inventory_movement_lines (
		            id, movement_id, part_id, from_bin_id, to_bin_id, lot_id, serial_id,
		            condition_from, condition_to, quantity
		          ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'SERVICEABLE', NULL, ?)`
          )
          .run(
            `inv-move-line-mro-${nanoid(10)}`,
            movementId,
            reservation.partId,
            source.binId,
            source.lotId,
            reservation.serializedPartId,
            input.quantity
          );

        this.sqlite
          .prepare(`UPDATE inventory_movements SET is_finalized = 1 WHERE id = ?`)
          .run(movementId);

        this.sqlite
          .prepare(
            `INSERT INTO maintenance_part_issues (
		            id, issue_number, target_type, target_id, asset_maintenance_work_order_id,
		            maintenance_handoff_id, aircraft_id, flight_id, warehouse_id, work_package_id,
		            job_card_id, reason, movement_id, status, total_parts_value_idr, issued_by_user_id, issued_at
		          ) VALUES (?, ?, 'AIRCRAFT', ?, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?, 'ISSUED', 0, ?, ?)`
          )
          .run(
            issueId,
            issueNumber,
            reservation.aircraftId,
            reservation.aircraftId,
            source.warehouseId,
            reservation.workPackageId,
            reservation.jobCardId,
            `Issue reserved material ${reservation.reservationNumber}.`,
            movementId,
            actor.userId,
            timestamp
          );

        this.sqlite
          .prepare(
            `INSERT INTO maintenance_part_issue_lines (
		            id, issue_id, part_id, quantity, base_value_idr, note
		          ) VALUES (?, ?, ?, ?, 0, ?)`
          )
          .run(
            `inv-issue-line-mro-${nanoid(10)}`,
            issueId,
            reservation.partId,
            input.quantity,
            `Reservation ${reservation.reservationNumber}`
          );

        this.sqlite
          .prepare(
            `UPDATE maintenance_inventory_reservations
           SET issue_id = ?, issue_movement_id = ?, updated_at = ?
           WHERE id = ? AND status = 'ISSUED' AND issue_id IS NULL AND issue_idempotency_key = ?`
          )
          .run(issueId, movementId, timestamp, input.reservationId, input.idempotencyKey);

        if (reservation.serializedPartId) {
          this.sqlite
            .prepare(
              `UPDATE inventory_serialized_parts SET bin_id = NULL, updated_at = ? WHERE id = ?`
            )
            .run(timestamp, reservation.serializedPartId);
        }

        this.insertReservationEvent(
          input.reservationId,
          'ISSUED',
          input.quantity,
          actor,
          `Issued as ${issueNumber}`,
          { status: reservation.status },
          { status: 'ISSUED', issueId, movementId },
          input.idempotencyKey,
          timestamp
        );
        this.audit('INVENTORY_RESERVATION', input.reservationId, 'ISSUED', actor, {
          issueId,
          movementId,
          quantity: input.quantity
        });
        this.recalculateMaterialRequirementStatus(reservation.materialRequirementId, timestamp);
        updatedReservation = this.getReservation(input.reservationId);
      })
      .immediate();

    return updatedReservation!;
  }

  installMaterial(
    input: InstallMaterialInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceMaterialInstallationDto {
    const timestamp = now();
    const installedAt = input.installedAt ?? timestamp;
    const reservation = this.getReservation(input.reservationId);
    this.assertResourceWorkPackage(expectedWorkPackageId, reservation.workPackageId);
    const workPackage = this.requireWorkPackage(reservation.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);
    if (reservation.status !== 'ISSUED' || !reservation.issueId) {
      throw new DomainError(
        'MATERIAL_NOT_ISSUED',
        'Part must be issued before it can be recorded as installed.',
        409
      );
    }
    if (input.quantity > (reservation.issuedQuantity ?? reservation.quantity)) {
      throw new DomainError(
        'INSTALL_QUANTITY_EXCEEDS_ISSUED',
        'Install quantity cannot exceed issued quantity.',
        409
      );
    }
    const jobCardId = input.jobCardId ?? reservation.jobCardId;
    this.assertJobCardBelongsToWorkPackage(jobCardId, reservation.workPackageId);

    const existing = this.sqlite
      .prepare(
        `SELECT id FROM maintenance_material_installations
	         WHERE reservation_id = ? AND idempotency_key = ? AND status = 'INSTALLED'`
      )
      .get(input.reservationId, input.idempotencyKey) as SqlRow | undefined;
    if (existing) return this.getMaterialInstallation(String(existing.id));

    let installation: MaintenanceMaterialInstallationDto | null = null;
    this.sqlite
      .transaction(() => {
        const alreadyInstalled = this.installedQuantityForReservation(input.reservationId);
        if (
          alreadyInstalled + input.quantity >
          (reservation.issuedQuantity ?? reservation.quantity)
        ) {
          throw new DomainError(
            'MATERIAL_ALREADY_INSTALLED',
            'Issued material is already installed.',
            409
          );
        }
        this.assertInstallSourceEligibility(reservation);
        const source = this.requireReservationSource(reservation, false);
        let componentInstallationId: string | null = null;
        if (reservation.serializedPartId) {
          componentInstallationId = this.installIssuedSerializedPart(
            reservation,
            input,
            actor,
            installedAt,
            timestamp
          );
        }

        const id = `mmat-install-${nanoid(12)}`;
        const installationNumber = `MINST-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_material_installations (
	            id, installation_number, material_requirement_id, reservation_id, issue_id,
	            inventory_component_installation_id, work_package_id, job_card_id, aircraft_id,
	            part_id, serialized_part_id, source_warehouse_id, source_bin_id, lot_number,
	            serial_number, certificate_reference, quantity, unit, position, status,
	            installed_by, installed_at, idempotency_key, created_at, updated_at
	          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INSTALLED', ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            installationNumber,
            reservation.materialRequirementId,
            reservation.id,
            reservation.issueId,
            componentInstallationId,
            reservation.workPackageId,
            jobCardId,
            reservation.aircraftId,
            reservation.partId,
            reservation.serializedPartId,
            source.warehouseId,
            source.binId,
            reservation.lotNumber,
            reservation.serialNumber,
            reservation.certificateReference,
            input.quantity,
            reservation.unit,
            input.position ?? null,
            actor.userId,
            installedAt,
            input.idempotencyKey,
            timestamp,
            timestamp
          );

        this.audit('MATERIAL_INSTALLATION', id, 'INSTALLED', actor, {
          reservationId: reservation.id,
          issueId: reservation.issueId,
          workPackageId: reservation.workPackageId,
          aircraftId: reservation.aircraftId,
          quantity: input.quantity,
          serializedPartId: reservation.serializedPartId
        });
        installation = this.getMaterialInstallation(id);
      })
      .immediate();

    return installation!;
  }

  listMaterialTraceability(
    workPackageId: string,
    materialRequirementId?: string
  ): MaintenanceMaterialTraceabilityDto[] {
    this.requireWorkPackage(workPackageId);
    const requirements = this.listMaterialRequirements(workPackageId).filter((req) =>
      materialRequirementId ? req.id === materialRequirementId : true
    );
    return requirements.map((requirement) => {
      const reservations = this.listReservations(workPackageId).filter(
        (reservation) => reservation.materialRequirementId === requirement.id
      );
      const installations = this.listMaterialInstallations(workPackageId, requirement.id);
      return {
        workPackageId,
        materialRequirementId: requirement.id,
        requirement,
        reservations,
        installations,
        traceComplete: requirement.satisfied && installations.length > 0
      };
    });
  }

  consumeMaterial(
    input: ConsumeMaterialInput,
    actor: AuditActor
  ): MaintenanceInventoryReservationDto {
    void actor;
    throw new DomainError(
      'RESOURCE_CONFLICT',
      'Material consumption is outside M1. Issue/install/consume will be handled in the material lifecycle milestone.',
      409,
      { reservationId: input.reservationId }
    );
  }

  returnMaterial(
    input: ReturnMaterialInput,
    actor: AuditActor
  ): MaintenanceInventoryReservationDto {
    void actor;
    throw new DomainError(
      'RESOURCE_CONFLICT',
      'Material return is outside M1. Return handling will be implemented with material lifecycle controls.',
      409,
      { reservationId: input.reservationId, condition: input.condition }
    );
  }

  releaseReservation(
    input: ReleaseMaterialReservationInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceInventoryReservationDto {
    const timestamp = now();
    const { reservationId, reason } = input;
    const reservation = this.getReservation(reservationId);
    this.assertResourceWorkPackage(expectedWorkPackageId, reservation.workPackageId);

    if (!['ACTIVE', 'PARTIALLY_ISSUED'].includes(reservation.status)) {
      throw new DomainError(
        'RESERVATION_NOT_RELEASABLE',
        'Reservation can only be released before material is issued.',
        409
      );
    }

    let updatedReservation: MaintenanceInventoryReservationDto | null = null;

    this.sqlite
      .transaction(() => {
        // Update reservation
        this.sqlite
          .prepare(
            `UPDATE maintenance_inventory_reservations
           SET status = 'RELEASED', released_by = ?, released_at = ?, release_reason = ?,
               version = version + 1, updated_at = ?
           WHERE id = ? AND version = ?`
          )
          .run(actor.userId, timestamp, reason, timestamp, reservationId, reservation.version);

        // Insert event
        const eventId = `mresev-${nanoid(12)}`;
        this.sqlite
          .prepare(
            `INSERT INTO maintenance_reservation_events (
            id, reservation_id, event_type, quantity, actor_user_id, actor_role,
            reason, before_snapshot_json, after_snapshot_json, occurred_at, created_at
          ) VALUES (?, ?, 'RELEASED', ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            eventId,
            reservationId,
            reservation.quantity,
            actor.userId,
            actor.role,
            reason,
            JSON.stringify({ status: reservation.status }),
            JSON.stringify({ status: 'RELEASED' }),
            timestamp,
            timestamp
          );

        this.audit('INVENTORY_RESERVATION', reservationId, 'RELEASED', actor, { reason });

        this.recalculateMaterialRequirementStatus(reservation.materialRequirementId, timestamp);

        updatedReservation = this.getReservation(reservationId);
      })
      .immediate();

    return updatedReservation!;
  }

  // =============================================================================
  // Tool Requirements & Allocation
  // =============================================================================

  createToolRequirement(
    input: CreateToolRequirementInput,
    actor: AuditActor
  ): MaintenanceToolRequirementDto {
    const timestamp = now();
    const workPackage = this.requireWorkPackage(input.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    const id = `mtreq-${nanoid(12)}`;

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_tool_requirements (
            id, work_package_id, job_card_id, tool_master_id, tool_type,
            quantity, required_station_id, required_from, required_until,
            status, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUIRED', ?, ?, ?)`
        )
        .run(
          id,
          input.workPackageId,
          input.jobCardId ?? null,
          input.toolMasterId ?? null,
          input.toolType ?? null,
          input.quantity,
          input.requiredStationId,
          input.requiredFrom,
          input.requiredUntil,
          actor.userId,
          timestamp,
          timestamp
        );

      this.audit('TOOL_REQUIREMENT', id, 'CREATED', actor, {
        workPackageId: input.workPackageId,
        toolMasterId: input.toolMasterId ?? null,
        quantity: input.quantity
      });
    })();

    return this.getToolRequirement(id);
  }

  private getToolRequirement(id: string): MaintenanceToolRequirementDto {
    const row = this.sqlite
      .prepare(
        `SELECT tr.*,
                tm.tool_code, tm.name AS tool_name, tm.serial_number AS tool_serial_number
         FROM maintenance_tool_requirements tr
         LEFT JOIN maintenance_tool_masters tm ON tm.id = tr.tool_master_id
         WHERE tr.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError('TOOL_REQUIREMENT_NOT_FOUND', `Tool requirement ${id} not found`, 404);
    }

    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      toolMasterId: nullableText(row.tool_master_id),
      toolType: nullableText(row.tool_type),
      quantity: number(row.quantity),
      requiredStationId: String(row.required_station_id),
      requiredFrom: String(row.required_from),
      requiredUntil: String(row.required_until),
      status: String(row.status) as ToolRequirementStatus,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      toolCode: nullableText(row.tool_code),
      toolName: nullableText(row.tool_name),
      toolSerialNumber: nullableText(row.tool_serial_number)
    };
  }

  listToolCandidates(
    toolRequirementId: string,
    expectedWorkPackageId?: string
  ): MaintenanceToolCandidateDto[] {
    const requirement = this.getToolRequirement(toolRequirementId);
    this.assertResourceWorkPackage(expectedWorkPackageId, requirement.workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_tool_masters
         WHERE (? IS NULL OR id = ?)
           AND (? IS NULL OR category = ?)
         ORDER BY tool_code`
      )
      .all(
        requirement.toolMasterId,
        requirement.toolMasterId,
        requirement.toolMasterId ? null : requirement.toolType,
        requirement.toolMasterId ? null : requirement.toolType
      ) as SqlRow[];

    return rows.map((tool) => {
      const evaluation = this.evaluateToolEligibility(tool, requirement);
      return {
        toolId: String(tool.id),
        toolCode: String(tool.tool_code),
        toolName: String(tool.name),
        serialNumber: nullableText(tool.serial_number),
        status: String(tool.status),
        stationId: nullableText(tool.station_id),
        calibrationRequired: Boolean(tool.calibration_required),
        calibrationExpiresAt: evaluation.calibrationExpiresAt,
        availabilityStatus: evaluation.availabilityStatus,
        eligibilityStatus: evaluation.eligible ? 'ELIGIBLE' : 'INELIGIBLE',
        reasons: evaluation.reasons,
        conflictingWorkPackageId: evaluation.conflictingWorkPackageId,
        conflictingAllocationId: evaluation.conflictingAllocationId,
        scheduleValidated: evaluation.scheduleValidated
      };
    });
  }

  private evaluateToolEligibility(
    tool: SqlRow,
    requirement: MaintenanceToolRequirementDto
  ): ToolEligibilityEvaluation {
    const reasons: string[] = [];
    const window = this.resourceWindow(
      requirement.workPackageId,
      requirement.requiredFrom,
      requirement.requiredUntil
    );
    let availabilityStatus: ResourceAvailabilityStatus = window.scheduleValidated
      ? 'AVAILABLE'
      : 'NOT_SCHEDULE_VALIDATED';
    let conflictingWorkPackageId: string | null = null;
    let conflictingAllocationId: string | null = null;

    if (requirement.toolMasterId && String(tool.id) !== requirement.toolMasterId) {
      reasons.push('WRONG_TOOL');
    }
    if (
      !requirement.toolMasterId &&
      requirement.toolType &&
      String(tool.category) !== requirement.toolType
    ) {
      reasons.push('WRONG_TOOL_TYPE');
    }
    if (['OUT_OF_SERVICE'].includes(String(tool.status))) {
      reasons.push('TOOL_NOT_SERVICEABLE');
    }
    if (String(tool.status) === 'CALIBRATION_EXPIRED') {
      reasons.push('TOOL_CALIBRATION_EXPIRED');
    }
    if (tool.station_id && String(tool.station_id) !== requirement.requiredStationId) {
      reasons.push('TOOL_STATION_MISMATCH');
    }

    const calibrationExpiresAt = this.toolCalibrationExpiresAt(String(tool.id), tool);
    if (Boolean(tool.calibration_required)) {
      const validationInstant = window.scheduleValidated ? window.end : now();
      if (!calibrationExpiresAt && String(tool.status) !== 'CALIBRATION_EXPIRED') {
        reasons.push('TOOL_CALIBRATION_MISSING');
      } else if (
        calibrationExpiresAt &&
        new Date(calibrationExpiresAt) <= new Date(validationInstant)
      ) {
        reasons.push('TOOL_CALIBRATION_EXPIRED');
      }
    }

    const activeCustody = this.sqlite
      .prepare(
        `SELECT id, work_package_id
         FROM maintenance_tool_allocations_v2
         WHERE tool_id = ?
           AND status = 'IN_USE'
           AND work_package_id <> ?
         LIMIT 1`
      )
      .get(String(tool.id), requirement.workPackageId) as SqlRow | undefined;
    if (activeCustody) {
      reasons.push('TOOL_ALREADY_IN_CUSTODY');
      availabilityStatus = 'NOT_AVAILABLE';
      conflictingAllocationId = String(activeCustody.id);
      conflictingWorkPackageId = String(activeCustody.work_package_id);
    }

    if (window.scheduleValidated) {
      const conflict = this.sqlite
        .prepare(
          `SELECT ta.id, ta.work_package_id
           FROM maintenance_tool_allocations_v2 ta
           JOIN maintenance_slots slot ON slot.work_package_id = ta.work_package_id
            AND slot.status IN ('BOOKED', 'IN_PROGRESS')
           WHERE ta.tool_id = ?
             AND ta.status IN ('REQUESTED', 'ALLOCATED', 'IN_USE')
             AND ta.work_package_id <> ?
             AND slot.planned_start_at < ?
             AND slot.planned_end_at > ?
           LIMIT 1`
        )
        .get(String(tool.id), requirement.workPackageId, window.end, window.start) as
        SqlRow | undefined;
      if (conflict) {
        reasons.push('TOOL_SCHEDULE_CONFLICT');
        availabilityStatus = 'NOT_AVAILABLE';
        conflictingAllocationId = String(conflict.id);
        conflictingWorkPackageId = String(conflict.work_package_id);
      }
    }

    return {
      reasons,
      availabilityStatus,
      conflictingWorkPackageId,
      conflictingAllocationId,
      eligible: reasons.length === 0,
      scheduleValidated: window.scheduleValidated,
      calibrationExpiresAt
    };
  }

  private toolCalibrationExpiresAt(toolId: string, tool: SqlRow): string | null {
    const direct = nullableText(tool.calibration_expires_at);
    if (direct) return direct;
    const record = this.sqlite
      .prepare(
        `SELECT expires_at
         FROM maintenance_tool_calibration_records
         WHERE tool_id = ? AND status = 'CURRENT'
         ORDER BY expires_at DESC
         LIMIT 1`
      )
      .get(toolId) as SqlRow | undefined;
    return nullableText(record?.expires_at);
  }

  private currentEligibleToolAllocationCount(requirement: MaintenanceToolRequirementDto) {
    const allocations = this.sqlite
      .prepare(
        `SELECT ta.id AS allocation_id,
                tm.id, tm.tool_code, tm.name, tm.serial_number, tm.category, tm.status,
                tm.station_id, tm.calibration_required, tm.calibration_expires_at
         FROM maintenance_tool_allocations_v2 ta
         JOIN maintenance_tool_masters tm ON tm.id = ta.tool_id
         WHERE ta.tool_requirement_id = ?
           AND ta.status IN ('ALLOCATED', 'IN_USE')`
      )
      .all(requirement.id) as SqlRow[];

    return allocations.filter((tool) => this.evaluateToolEligibility(tool, requirement).eligible)
      .length;
  }

  allocateTool(
    input: AllocateToolInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceToolAllocationV2Dto {
    const timestamp = now();
    const toolRequirement = this.getToolRequirement(input.toolRequirementId);
    const workPackage = this.requireWorkPackage(toolRequirement.workPackageId);
    this.assertResourceWorkPackage(expectedWorkPackageId, toolRequirement.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    let allocation: MaintenanceToolAllocationV2Dto | null = null;

    try {
      this.sqlite
        .transaction(() => {
          const replay = this.sqlite
            .prepare(
              `SELECT id
             FROM maintenance_tool_allocations_v2
             WHERE work_package_id = ? AND create_idempotency_key = ?
             LIMIT 1`
            )
            .get(toolRequirement.workPackageId, input.idempotencyKey) as SqlRow | undefined;
          if (replay) {
            allocation = this.getToolAllocation(String(replay.id));
            return;
          }

          const tool = this.sqlite
            .prepare(`SELECT * FROM maintenance_tool_masters WHERE id = ?`)
            .get(input.toolId) as SqlRow | undefined;
          if (!tool) {
            throw new DomainError('TOOL_NOT_FOUND', `Tool ${input.toolId} not found`, 404);
          }

          const duplicate = this.sqlite
            .prepare(
              `SELECT id
             FROM maintenance_tool_allocations_v2
             WHERE tool_requirement_id = ?
               AND tool_id = ?
               AND status IN ('REQUESTED', 'ALLOCATED', 'IN_USE')
             LIMIT 1`
            )
            .get(input.toolRequirementId, input.toolId) as SqlRow | undefined;
          if (duplicate) {
            throw new DomainError(
              'TOOL_ALREADY_ALLOCATED',
              'Tool is already allocated to this requirement',
              409
            );
          }

          const evaluation = this.evaluateToolEligibility(tool, toolRequirement);
          if (!evaluation.eligible) {
            const code = evaluation.reasons[0] ?? 'TOOL_NOT_ELIGIBLE';
            throw new DomainError(
              code,
              `Tool is not eligible: ${evaluation.reasons.join(', ')}`,
              409,
              {
                reasons: evaluation.reasons,
                conflictingWorkPackageId: evaluation.conflictingWorkPackageId,
                conflictingAllocationId: evaluation.conflictingAllocationId
              }
            );
          }

          const id = `mtalloc-${nanoid(12)}`;

          this.sqlite
            .prepare(
              `INSERT INTO maintenance_tool_allocations_v2 (
            id, tool_requirement_id, tool_id, work_package_id, job_card_id,
            aircraft_id, station_id, status, allocated_by, allocated_at,
            create_idempotency_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ALLOCATED', ?, ?, ?, ?, ?)`
            )
            .run(
              id,
              input.toolRequirementId,
              input.toolId,
              toolRequirement.workPackageId,
              toolRequirement.jobCardId,
              workPackage.aircraft_id,
              toolRequirement.requiredStationId,
              actor.userId,
              timestamp,
              input.idempotencyKey,
              timestamp,
              timestamp
            );

          // Insert allocation event
          const eventId = `mtallocev-${nanoid(12)}`;
          this.sqlite
            .prepare(
              `INSERT INTO maintenance_tool_allocation_events (
            id, allocation_id, event_type, actor_user_id, actor_role,
            reason, before_snapshot_json, after_snapshot_json, occurred_at, created_at
          ) VALUES (?, ?, 'ALLOCATED', ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              eventId,
              id,
              actor.userId,
              actor.role,
              null,
              JSON.stringify({ status: 'NONE' }),
              JSON.stringify({ status: 'ALLOCATED', toolId: input.toolId }),
              timestamp,
              timestamp
            );

          this.audit('TOOL_ALLOCATION', id, 'ALLOCATED', actor, {
            toolId: input.toolId,
            toolRequirementId: input.toolRequirementId
          });

          allocation = this.getToolAllocation(id);
        })
        .immediate();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'TOOL_SCHEDULE_CONFLICT',
          'Concurrent tool allocation conflict detected',
          409
        );
      }
      throw error;
    }

    return allocation!;
  }

  assignToolCustody(
    input: AssignToolCustodyInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceToolAllocationV2Dto {
    const timestamp = now();
    const allocation = this.getToolAllocation(input.allocationId);
    this.assertResourceWorkPackage(expectedWorkPackageId, allocation.workPackageId);

    if (allocation.status !== 'ALLOCATED') {
      throw new DomainError(
        'TOOL_NOT_ALLOCATED',
        'Tool must be allocated before custody assignment',
        409
      );
    }

    const custodian = this.sqlite
      .prepare(`SELECT id FROM crews WHERE id = ?`)
      .get(input.custodianPersonnelId) as SqlRow | undefined;
    if (!custodian) {
      throw new DomainError('PERSONNEL_NOT_FOUND', 'Custodian personnel was not found', 404);
    }

    let updatedAllocation: MaintenanceToolAllocationV2Dto | null = null;

    try {
      this.sqlite
        .transaction(() => {
          const activeCustody = this.sqlite
            .prepare(
              `SELECT id FROM maintenance_tool_allocations_v2
           WHERE tool_id = ? AND status = 'IN_USE' AND id <> ?
           LIMIT 1`
            )
            .get(allocation.toolId, input.allocationId) as SqlRow | undefined;
          if (activeCustody) {
            throw new DomainError(
              'TOOL_ALREADY_IN_CUSTODY',
              'Tool is already in custody for another allocation',
              409
            );
          }

          // Update allocation
          this.sqlite
            .prepare(
              `UPDATE maintenance_tool_allocations_v2
           SET custodian_personnel_id = ?, custody_started_at = ?, status = 'IN_USE', updated_at = ?
           WHERE id = ?`
            )
            .run(input.custodianPersonnelId, timestamp, timestamp, input.allocationId);

          // Insert event
          const eventId = `mtallocev-${nanoid(12)}`;
          this.sqlite
            .prepare(
              `INSERT INTO maintenance_tool_allocation_events (
            id, allocation_id, event_type, actor_user_id, actor_role,
            reason, before_snapshot_json, after_snapshot_json, occurred_at, created_at
          ) VALUES (?, ?, 'CUSTODY_ASSIGNED', ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              eventId,
              input.allocationId,
              actor.userId,
              actor.role,
              null,
              JSON.stringify({ status: allocation.status }),
              JSON.stringify({
                status: 'IN_USE',
                custodianPersonnelId: input.custodianPersonnelId
              }),
              timestamp,
              timestamp
            );

          this.audit('TOOL_ALLOCATION', input.allocationId, 'CUSTODY_ASSIGNED', actor, {
            custodianPersonnelId: input.custodianPersonnelId
          });

          updatedAllocation = this.getToolAllocation(input.allocationId);
        })
        .immediate();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'TOOL_ALREADY_IN_CUSTODY',
          'Concurrent tool custody conflict detected',
          409
        );
      }
      throw error;
    }

    return updatedAllocation!;
  }

  returnTool(
    input: ReturnToolInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenanceToolAllocationV2Dto {
    const timestamp = now();
    const allocation = this.getToolAllocation(input.allocationId);
    this.assertResourceWorkPackage(expectedWorkPackageId, allocation.workPackageId);

    if (allocation.status === 'RETURNED' || allocation.status === 'RELEASED') {
      return allocation;
    }
    if (allocation.status !== 'IN_USE') {
      throw new DomainError(
        'TOOL_NOT_IN_CUSTODY',
        'Tool must be checked out before it can be returned',
        409
      );
    }

    let updatedAllocation: MaintenanceToolAllocationV2Dto | null = null;

    this.sqlite.transaction(() => {
      // Update allocation
      this.sqlite
        .prepare(
          `UPDATE maintenance_tool_allocations_v2
           SET status = 'RETURNED', returned_by = ?, returned_at = ?,
               return_condition = ?, return_note = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          actor.userId,
          timestamp,
          input.returnCondition,
          input.returnNote ?? null,
          timestamp,
          input.allocationId
        );

      // Insert event
      const eventId = `mtallocev-${nanoid(12)}`;
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_tool_allocation_events (
            id, allocation_id, event_type, actor_user_id, actor_role,
            reason, before_snapshot_json, after_snapshot_json, occurred_at, created_at
          ) VALUES (?, ?, 'RETURNED', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          eventId,
          input.allocationId,
          actor.userId,
          actor.role,
          null,
          JSON.stringify({ status: allocation.status }),
          JSON.stringify({
            status: 'RETURNED',
            returnCondition: input.returnCondition
          }),
          timestamp,
          timestamp
        );

      const returnedStatus = ['UNSERVICEABLE', 'OUT_OF_SERVICE'].includes(
        input.returnCondition.toUpperCase()
      )
        ? 'OUT_OF_SERVICE'
        : 'AVAILABLE';

      this.sqlite
        .prepare(
          `UPDATE maintenance_tool_masters
           SET status = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(returnedStatus, timestamp, allocation.toolId);

      this.audit('TOOL_ALLOCATION', input.allocationId, 'RETURNED', actor, {
        returnCondition: input.returnCondition
      });

      updatedAllocation = this.getToolAllocation(input.allocationId);
    })();

    return updatedAllocation!;
  }

  private getToolAllocation(id: string): MaintenanceToolAllocationV2Dto {
    const row = this.sqlite
      .prepare(
        `SELECT ta.*,
                tm.tool_code, tm.name AS tool_name, tm.serial_number AS tool_serial_number,
                tm.calibration_required, tm.calibration_expires_at,
                crew.full_name AS custodian_name
         FROM maintenance_tool_allocations_v2 ta
         LEFT JOIN maintenance_tool_masters tm ON tm.id = ta.tool_id
         LEFT JOIN crews crew ON crew.id = ta.custodian_personnel_id
         WHERE ta.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError('TOOL_ALLOCATION_NOT_FOUND', `Tool allocation ${id} not found`, 404);
    }

    return {
      id: String(row.id),
      toolRequirementId: nullableText(row.tool_requirement_id),
      toolId: String(row.tool_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      aircraftId: String(row.aircraft_id),
      stationId: String(row.station_id),
      status: String(row.status) as ToolAllocationStatus,
      allocatedBy: String(row.allocated_by),
      allocatedAt: String(row.allocated_at),
      custodianPersonnelId: nullableText(row.custodian_personnel_id),
      custodyStartedAt: nullableText(row.custody_started_at),
      returnedBy: nullableText(row.returned_by),
      returnedAt: nullableText(row.returned_at),
      returnCondition: nullableText(row.return_condition),
      returnNote: nullableText(row.return_note),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      toolCode: String(row.tool_code),
      toolName: String(row.tool_name),
      toolSerialNumber: nullableText(row.tool_serial_number),
      calibrationRequired: Boolean(row.calibration_required),
      calibrationExpiresAt: nullableText(row.calibration_expires_at),
      custodianName: nullableText(row.custodian_name)
    };
  }

  // =============================================================================
  // Personnel Requirements & Assignment
  // =============================================================================

  createPersonnelRequirement(
    input: CreatePersonnelRequirementInput,
    actor: AuditActor
  ): MaintenancePersonnelRequirementDto {
    const timestamp = now();
    const workPackage = this.requireWorkPackage(input.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    const id = `mpreq-${nanoid(12)}`;

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_personnel_requirements (
            id, work_package_id, job_card_id, role_type, required_count,
            required_licence_type, required_qualification, required_authorization,
            aircraft_type, duty_station_id, required_from, required_until,
            status, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUIRED', ?, ?, ?)`
        )
        .run(
          id,
          input.workPackageId,
          input.jobCardId ?? null,
          input.roleType,
          input.requiredCount,
          input.requiredLicenceType ?? null,
          input.requiredQualification ?? null,
          input.requiredAuthorization ?? null,
          input.aircraftType ?? null,
          input.dutyStationId,
          input.requiredFrom,
          input.requiredUntil,
          actor.userId,
          timestamp,
          timestamp
        );

      this.audit('PERSONNEL_REQUIREMENT', id, 'CREATED', actor, {
        workPackageId: input.workPackageId,
        roleType: input.roleType,
        requiredCount: input.requiredCount
      });
    })();

    return this.getPersonnelRequirement(id);
  }

  private getPersonnelRequirement(id: string): MaintenancePersonnelRequirementDto {
    const row = this.sqlite
      .prepare(
        `SELECT pr.*,
                (SELECT COUNT(*) FROM maintenance_personnel_assignments pa
                 WHERE pa.personnel_requirement_id = pr.id AND pa.status IN ('ASSIGNED', 'CONFIRMED')
                ) AS assigned_count
         FROM maintenance_personnel_requirements pr
         WHERE pr.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError(
        'PERSONNEL_REQUIREMENT_NOT_FOUND',
        `Personnel requirement ${id} not found`,
        404
      );
    }

    return {
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      roleType: String(row.role_type) as PersonnelRoleType,
      requiredCount: number(row.required_count),
      requiredLicenceType: nullableText(row.required_licence_type),
      requiredQualification: nullableText(row.required_qualification),
      requiredAuthorization: nullableText(row.required_authorization),
      aircraftType: nullableText(row.aircraft_type),
      dutyStationId: String(row.duty_station_id),
      requiredFrom: String(row.required_from),
      requiredUntil: String(row.required_until),
      status: String(row.status) as PersonnelRequirementStatus,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      assignedCount: number(row.assigned_count)
    };
  }

  listPersonnelCandidates(
    personnelRequirementId: string,
    expectedWorkPackageId?: string
  ): MaintenancePersonnelCandidateDto[] {
    const requirement = this.getPersonnelRequirement(personnelRequirementId);
    this.assertResourceWorkPackage(expectedWorkPackageId, requirement.workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT *
         FROM crews
         WHERE is_active = 1
           AND lifecycle_status = 'ACTIVE'
         ORDER BY full_name`
      )
      .all() as SqlRow[];

    return rows.map((personnel) => {
      const evaluation = this.evaluatePersonnelEligibility(String(personnel.id), requirement);
      return {
        personnelId: String(personnel.id),
        personnelName: String(personnel.full_name),
        personnelCode: nullableText(personnel.employee_code),
        role: String(personnel.crew_role),
        dutyStationId: nullableText(personnel.duty_station_id),
        licenceReference: evaluation.snapshot.licenceReference,
        licenceValid: evaluation.snapshot.licenceValid,
        licenceExpiry: evaluation.snapshot.licenceExpiry,
        authorizationReference: evaluation.snapshot.authorizationReference,
        authorizationValid: evaluation.snapshot.authorizationValid,
        authorizationExpiry: evaluation.snapshot.authorizationExpiry,
        availabilityStatus: evaluation.availabilityStatus,
        eligibilityStatus: evaluation.eligible ? 'ELIGIBLE' : 'INELIGIBLE',
        reasons: evaluation.reasons,
        conflictingWorkPackageId: evaluation.conflictingWorkPackageId,
        conflictingAssignmentId: evaluation.conflictingAssignmentId,
        scheduleValidated: evaluation.availabilityStatus !== 'NOT_SCHEDULE_VALIDATED',
        snapshot: evaluation.snapshot
      };
    });
  }

  assignPersonnel(
    input: AssignPersonnelInput,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenancePersonnelAssignmentDto {
    const timestamp = now();
    const personnelRequirement = this.getPersonnelRequirement(input.personnelRequirementId);
    const workPackage = this.requireWorkPackage(personnelRequirement.workPackageId);
    this.assertResourceWorkPackage(expectedWorkPackageId, personnelRequirement.workPackageId);
    this.assertWorkPackageNotReleased(workPackage);

    let assignment: MaintenancePersonnelAssignmentDto | null = null;

    try {
      this.sqlite
        .transaction(() => {
          const replay = this.sqlite
            .prepare(
              `SELECT id
             FROM maintenance_personnel_assignments
             WHERE work_package_id = ? AND create_idempotency_key = ?
             LIMIT 1`
            )
            .get(personnelRequirement.workPackageId, input.idempotencyKey) as SqlRow | undefined;
          if (replay) {
            assignment = this.getPersonnelAssignment(String(replay.id));
            return;
          }

          const personnel = this.sqlite
            .prepare(`SELECT * FROM crews WHERE id = ?`)
            .get(input.personnelId) as SqlRow | undefined;
          if (!personnel) {
            throw new DomainError(
              'PERSONNEL_NOT_FOUND',
              `Personnel ${input.personnelId} not found`,
              404
            );
          }

          const duplicate = this.sqlite
            .prepare(
              `SELECT id
             FROM maintenance_personnel_assignments
             WHERE personnel_requirement_id = ?
               AND personnel_id = ?
               AND status IN ('ASSIGNED', 'CONFIRMED')
             LIMIT 1`
            )
            .get(input.personnelRequirementId, input.personnelId) as SqlRow | undefined;
          if (duplicate) {
            throw new DomainError(
              'PERSONNEL_ALREADY_ASSIGNED',
              'Personnel is already assigned to this requirement',
              409
            );
          }

          const evaluation = this.evaluatePersonnelEligibility(
            input.personnelId,
            personnelRequirement
          );
          if (!evaluation.eligible) {
            const code = evaluation.reasons[0] ?? 'PERSONNEL_NOT_ELIGIBLE';
            throw new DomainError(
              code,
              `Personnel is not eligible: ${evaluation.reasons.join(', ')}`,
              409,
              {
                reasons: evaluation.reasons,
                conflictingWorkPackageId: evaluation.conflictingWorkPackageId,
                conflictingAssignmentId: evaluation.conflictingAssignmentId
              }
            );
          }

          const id = `mpassign-${nanoid(12)}`;

          this.sqlite
            .prepare(
              `INSERT INTO maintenance_personnel_assignments (
            id, personnel_requirement_id, personnel_id, work_package_id, job_card_id,
            role_type, status, eligibility_status, eligibility_snapshot_json,
            assigned_by, assigned_at, create_idempotency_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              id,
              input.personnelRequirementId,
              input.personnelId,
              personnelRequirement.workPackageId,
              personnelRequirement.jobCardId,
              personnelRequirement.roleType,
              'ELIGIBLE',
              JSON.stringify(evaluation.snapshot),
              actor.userId,
              timestamp,
              input.idempotencyKey,
              timestamp,
              timestamp
            );

          // Insert eligibility event
          const eventId = `mpeligev-${nanoid(12)}`;
          this.sqlite
            .prepare(
              `INSERT INTO maintenance_personnel_eligibility_events (
            id, assignment_id, event_type, eligibility_status, snapshot_json,
            evaluated_by, evaluated_at, created_at
          ) VALUES (?, ?, 'EVALUATED', ?, ?, ?, ?, ?)`
            )
            .run(
              eventId,
              id,
              'ELIGIBLE',
              JSON.stringify(evaluation.snapshot),
              actor.userId,
              timestamp,
              timestamp
            );

          this.recalculatePersonnelRequirementStatus(input.personnelRequirementId, timestamp);

          this.audit('PERSONNEL_ASSIGNMENT', id, 'ASSIGNED', actor, {
            personnelId: input.personnelId,
            personnelRequirementId: input.personnelRequirementId
          });

          assignment = this.getPersonnelAssignment(id);
        })
        .immediate();
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) {
        throw new DomainError(
          'PERSONNEL_SCHEDULE_CONFLICT',
          'Concurrent personnel assignment conflict detected',
          409
        );
      }
      throw error;
    }

    return assignment!;
  }

  private evaluatePersonnelEligibility(
    personnelId: string,
    requirement: MaintenancePersonnelRequirementDto,
    excludeAssignmentId?: string
  ): PersonnelEligibilityEvaluation {
    const evaluatedAt = now();
    const reasons: string[] = [];

    // Get personnel licences
    const licences = this.sqlite
      .prepare(
        `SELECT * FROM personnel_licenses
         WHERE personnel_id = ? AND status = 'ACTIVE'`
      )
      .all(personnelId) as SqlRow[];

    const licence = requirement.requiredLicenceType
      ? (licences.find((item) => String(item.license_type) === requirement.requiredLicenceType) ??
        null)
      : (licences[0] ?? null);
    const licenceTypeMatch = !requirement.requiredLicenceType || Boolean(licence);
    const licenceValid = licence
      ? !licence.expiry_date || new Date(String(licence.expiry_date)) > new Date()
      : false;
    if (!licence && licences.length === 0) {
      reasons.push('LICENCE_MISSING');
    } else if (!licenceTypeMatch) {
      reasons.push('LICENCE_TYPE_MISMATCH');
    } else if (!licenceValid) {
      reasons.push('LICENCE_EXPIRED');
    }

    // Get authorizations
    const authorizations = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_company_authorizations
         WHERE personnel_id = ?
           AND status = 'ACTIVE'
           AND (? IS NULL OR license_id = ?)
         ORDER BY valid_until DESC`
      )
      .all(
        personnelId,
        licence ? String(licence.id) : null,
        licence ? String(licence.id) : null
      ) as SqlRow[];

    const authorization = authorizations.length > 0 ? authorizations[0] : null;
    const authorizationValid = authorization
      ? !authorization.valid_until || new Date(String(authorization.valid_until)) > new Date()
      : false;
    if (!authorization) {
      reasons.push('COMPANY_AUTHORIZATION_MISSING');
    } else if (!authorizationValid) {
      reasons.push('AUTHORIZATION_EXPIRED');
    }
    if (
      requirement.requiredAuthorization &&
      authorization &&
      !jsonStringArray(authorization.permitted_actions_json).includes(
        requirement.requiredAuthorization
      )
    ) {
      reasons.push('AUTHORIZATION_SCOPE_MISMATCH');
    }

    // Check aircraft type match
    const aircraftTypeValues = jsonStringArray(authorization?.aircraft_type_scope_json);
    const aircraftTypeMatch =
      !requirement.aircraftType ||
      aircraftTypeValues.length === 0 ||
      aircraftTypeValues.includes(requirement.aircraftType);
    if (!aircraftTypeMatch) reasons.push('AIRCRAFT_SCOPE_MISMATCH');

    // Check duty station match
    const personnel = this.sqlite
      .prepare(`SELECT duty_station_id FROM crews WHERE id = ?`)
      .get(personnelId) as SqlRow | undefined;
    const dutyStationMatch =
      !personnel?.duty_station_id ||
      String(personnel.duty_station_id) === requirement.dutyStationId;
    if (!dutyStationMatch) reasons.push('DUTY_STATION_MISMATCH');

    const window = this.resourceWindow(
      requirement.workPackageId,
      requirement.requiredFrom,
      requirement.requiredUntil
    );
    const conflictingAssignment = window.scheduleValidated
      ? (this.sqlite
          .prepare(
            `SELECT pa.id, pa.work_package_id
             FROM maintenance_personnel_assignments pa
             JOIN maintenance_slots slot ON slot.work_package_id = pa.work_package_id
              AND slot.status IN ('BOOKED', 'IN_PROGRESS')
             WHERE pa.personnel_id = ?
               AND pa.status IN ('ASSIGNED', 'CONFIRMED')
               AND (? IS NULL OR pa.id <> ?)
               AND slot.planned_start_at < ?
               AND slot.planned_end_at > ?
             LIMIT 1`
          )
          .get(
            personnelId,
            excludeAssignmentId ?? null,
            excludeAssignmentId ?? null,
            window.end,
            window.start
          ) as SqlRow | undefined)
      : undefined;

    const assignmentConflict = Boolean(conflictingAssignment);
    if (assignmentConflict) reasons.push('PERSONNEL_SCHEDULE_CONFLICT');
    const availabilityResult = !assignmentConflict;
    const availabilityStatus: ResourceAvailabilityStatus = !window.scheduleValidated
      ? 'NOT_SCHEDULE_VALIDATED'
      : assignmentConflict
        ? 'NOT_AVAILABLE'
        : 'AVAILABLE';

    // Check role separation (mechanic != inspector for same job)
    const roleSeparationResult = !assignmentConflict;

    const snapshot = {
      licenceReference: licence ? String(licence.license_number) : null,
      licenceValid,
      licenceExpiry: licence ? nullableText(licence.expiry_date) : null,
      licenceTypeMatch,
      qualification: nullableText(requirement.requiredQualification),
      qualificationMatch: true,
      authorizationReference: authorization ? String(authorization.authorization_number) : null,
      authorizationValid,
      authorizationExpiry: authorization ? nullableText(authorization.valid_until) : null,
      aircraftTypeMatch,
      dutyStationMatch,
      availabilityResult,
      assignmentConflict,
      roleSeparationResult,
      roleSeparationDetails: assignmentConflict
        ? 'Personnel has an overlapping maintenance assignment.'
        : null,
      evaluatedAt,
      evaluatedByVersion: 'v2.1'
    };

    return {
      snapshot,
      reasons,
      availabilityStatus,
      conflictingWorkPackageId: conflictingAssignment
        ? String(conflictingAssignment.work_package_id)
        : null,
      conflictingAssignmentId: conflictingAssignment ? String(conflictingAssignment.id) : null,
      eligible: reasons.length === 0
    };
  }

  confirmAssignment(
    assignmentId: string,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenancePersonnelAssignmentDto {
    const timestamp = now();
    const assignment = this.getPersonnelAssignment(assignmentId);
    this.assertResourceWorkPackage(expectedWorkPackageId, assignment.workPackageId);

    if (assignment.status !== 'ASSIGNED') {
      throw new DomainError(
        'ASSIGNMENT_NOT_PENDING',
        'Assignment must be in ASSIGNED status to confirm',
        409
      );
    }
    if (assignment.eligibilityStatus !== 'ELIGIBLE') {
      throw new DomainError(
        'PERSONNEL_NOT_ELIGIBLE',
        'Only eligible personnel assignments can be confirmed',
        409
      );
    }
    const requirement = this.getPersonnelRequirement(assignment.personnelRequirementId);
    const currentEligibility = this.evaluatePersonnelEligibility(
      assignment.personnelId,
      requirement,
      assignment.id
    );
    if (!currentEligibility.eligible) {
      throw new DomainError(
        currentEligibility.reasons[0] ?? 'PERSONNEL_NOT_ELIGIBLE',
        `Personnel is no longer eligible: ${currentEligibility.reasons.join(', ')}`,
        409,
        {
          reasons: currentEligibility.reasons,
          conflictingWorkPackageId: currentEligibility.conflictingWorkPackageId,
          conflictingAssignmentId: currentEligibility.conflictingAssignmentId
        }
      );
    }

    let updatedAssignment: MaintenancePersonnelAssignmentDto | null = null;

    this.sqlite.transaction(() => {
      // Update assignment
      this.sqlite
        .prepare(
          `UPDATE maintenance_personnel_assignments
           SET status = 'CONFIRMED', confirmed_at = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(timestamp, timestamp, assignmentId);

      this.recalculatePersonnelRequirementStatus(assignment.personnelRequirementId, timestamp);

      this.audit('PERSONNEL_ASSIGNMENT', assignmentId, 'CONFIRMED', actor, {});

      updatedAssignment = this.getPersonnelAssignment(assignmentId);
    })();

    return updatedAssignment!;
  }

  releaseAssignment(
    assignmentId: string,
    actor: AuditActor,
    expectedWorkPackageId?: string
  ): MaintenancePersonnelAssignmentDto {
    const timestamp = now();
    const assignment = this.getPersonnelAssignment(assignmentId);
    this.assertResourceWorkPackage(expectedWorkPackageId, assignment.workPackageId);

    if (assignment.status === 'RELEASED' || assignment.status === 'CANCELLED') {
      throw new DomainError(
        'ASSIGNMENT_ALREADY_RELEASED',
        'Assignment is already released or cancelled',
        409
      );
    }

    let updatedAssignment: MaintenancePersonnelAssignmentDto | null = null;

    this.sqlite.transaction(() => {
      // Update assignment
      this.sqlite
        .prepare(
          `UPDATE maintenance_personnel_assignments
           SET status = 'RELEASED', released_at = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(timestamp, timestamp, assignmentId);

      this.recalculatePersonnelRequirementStatus(assignment.personnelRequirementId, timestamp);

      this.audit('PERSONNEL_ASSIGNMENT', assignmentId, 'RELEASED', actor, {});

      updatedAssignment = this.getPersonnelAssignment(assignmentId);
    })();

    return updatedAssignment!;
  }

  private recalculatePersonnelRequirementStatus(requirementId: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_personnel_requirements
         SET status = CASE
           WHEN required_count <= (
             SELECT COUNT(DISTINCT personnel_id)
             FROM maintenance_personnel_assignments
             WHERE personnel_requirement_id = ?
               AND status = 'CONFIRMED'
               AND eligibility_status = 'ELIGIBLE'
           ) THEN 'FULFILLED'
           WHEN 0 < (
             SELECT COUNT(*)
             FROM maintenance_personnel_assignments
             WHERE personnel_requirement_id = ?
               AND status IN ('ASSIGNED', 'CONFIRMED')
           ) THEN 'PARTIALLY_FULFILLED'
           ELSE 'REQUIRED'
         END,
         updated_at = ?
         WHERE id = ?`
      )
      .run(requirementId, requirementId, timestamp, requirementId);
  }

  private currentConfirmedEligiblePersonnelCount(requirement: MaintenancePersonnelRequirementDto) {
    const assignments = this.sqlite
      .prepare(
        `SELECT *
         FROM maintenance_personnel_assignments
         WHERE personnel_requirement_id = ?
           AND status = 'CONFIRMED'`
      )
      .all(requirement.id) as SqlRow[];

    return new Set(
      assignments
        .filter(
          (assignment) =>
            this.evaluatePersonnelEligibility(
              String(assignment.personnel_id),
              requirement,
              String(assignment.id)
            ).eligible
        )
        .map((assignment) => String(assignment.personnel_id))
    ).size;
  }

  private getPersonnelAssignment(id: string): MaintenancePersonnelAssignmentDto {
    const row = this.sqlite
      .prepare(
        `SELECT pa.*,
	                crew.full_name AS personnel_name, crew.employee_code AS personnel_code,
                pl.license_number, pl.license_type
         FROM maintenance_personnel_assignments pa
         LEFT JOIN crews crew ON crew.id = pa.personnel_id
         LEFT JOIN personnel_licenses pl ON pl.personnel_id = pa.personnel_id AND pl.status = 'ACTIVE'
         WHERE pa.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError(
        'PERSONNEL_ASSIGNMENT_NOT_FOUND',
        `Personnel assignment ${id} not found`,
        404
      );
    }

    const eligibilitySnapshot = jsonObject(
      row.eligibility_snapshot_json
    ) as PersonnelEligibilitySnapshot | null;

    return {
      id: String(row.id),
      personnelRequirementId: String(row.personnel_requirement_id),
      personnelId: String(row.personnel_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      roleType: String(row.role_type) as PersonnelRoleType,
      status: String(row.status) as PersonnelAssignmentStatus,
      eligibilityStatus: String(row.eligibility_status) as PersonnelEligibilityStatus,
      eligibilitySnapshot: eligibilitySnapshot || {
        licenceReference: null,
        licenceValid: false,
        licenceExpiry: null,
        licenceTypeMatch: false,
        qualification: null,
        qualificationMatch: false,
        authorizationReference: null,
        authorizationValid: false,
        authorizationExpiry: null,
        aircraftTypeMatch: false,
        dutyStationMatch: false,
        availabilityResult: false,
        assignmentConflict: false,
        roleSeparationResult: false,
        roleSeparationDetails: null,
        evaluatedAt: now(),
        evaluatedByVersion: 'v2.1'
      },
      assignedBy: String(row.assigned_by),
      assignedAt: String(row.assigned_at),
      confirmedAt: nullableText(row.confirmed_at),
      releasedAt: nullableText(row.released_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      personnelName: row.personnel_name ? String(row.personnel_name) : undefined,
      personnelCode: optionalText(row.personnel_code),
      licenceNumber: optionalText(row.license_number),
      licenceType: optionalText(row.license_type)
    };
  }

  // =============================================================================
  // AMO Scope Validation
  // =============================================================================

  validateAmoScope(workPackageId: string): { valid: boolean; blockers: MroEligibilityBlocker[] } {
    const workPackage = this.requireWorkPackage(workPackageId);
    const blockers: MroEligibilityBlocker[] = [];

    // Check work package has amo_organization_id
    if (!workPackage.amo_organization_id) {
      blockers.push({
        code: 'AMO_ORGANIZATION_MISSING',
        category: 'AMO',
        severity: 'BLOCKING',
        title: 'AMO organization not assigned',
        message: 'Work package must have an AMO organization assigned',
        sourceType: 'WORK_PACKAGE',
        sourceId: workPackageId,
        suggestedAction: 'Assign an AMO organization to the work package'
      });
      return { valid: false, blockers };
    }

    // Get organization
    const organization = this.sqlite
      .prepare(`SELECT * FROM maintenance_amo_organizations WHERE id = ?`)
      .get(String(workPackage.amo_organization_id)) as SqlRow | undefined;

    if (!organization) {
      blockers.push({
        code: 'AMO_ORGANIZATION_MISSING',
        category: 'AMO',
        severity: 'BLOCKING',
        title: 'AMO organization not found',
        message: 'Assigned AMO organization does not exist',
        sourceType: 'WORK_PACKAGE',
        sourceId: workPackageId,
        suggestedAction: 'Assign a valid AMO organization'
      });
      return { valid: false, blockers };
    }

    // Check organization status = ACTIVE
    if (String(organization.status) !== 'ACTIVE') {
      blockers.push({
        code: 'AMO_APPROVAL_EXPIRED',
        category: 'AMO',
        severity: 'BLOCKING',
        title: 'AMO organization not active',
        message: `AMO organization status is ${organization.status}`,
        sourceType: 'AMO_ORGANIZATION',
        sourceId: String(organization.id),
        suggestedAction: 'Contact AMO organization to activate approval'
      });
    }

    // Check organization not expired
    if (organization.valid_until && new Date(String(organization.valid_until)) < new Date()) {
      blockers.push({
        code: 'AMO_APPROVAL_EXPIRED',
        category: 'AMO',
        severity: 'BLOCKING',
        title: 'AMO organization approval expired',
        message: 'AMO organization approval has expired',
        sourceType: 'AMO_ORGANIZATION',
        sourceId: String(organization.id),
        suggestedAction: 'Renew AMO organization approval'
      });
    }

    // Get aircraft type
    const aircraft = this.sqlite
      .prepare(`SELECT aircraft_type FROM aircraft WHERE id = ?`)
      .get(String(workPackage.aircraft_id)) as SqlRow | undefined;

    const aircraftType = aircraft ? String(aircraft.aircraft_type) : null;

    // Check scope exists for (aircraft_type, maintenance_action)
    if (aircraftType) {
      const scope = this.sqlite
        .prepare(
          `SELECT * FROM maintenance_amo_scopes
           WHERE amo_organization_id = ?
             AND aircraft_type = ?
             AND status = 'ACTIVE'
             AND (valid_until IS NULL OR valid_until > ?)
           LIMIT 1`
        )
        .get(String(organization.id), aircraftType, now()) as SqlRow | undefined;

      if (!scope) {
        blockers.push({
          code: 'AMO_SCOPE_MISMATCH',
          category: 'AMO',
          severity: 'BLOCKING',
          title: 'AMO scope does not cover aircraft type',
          message: `AMO organization does not have active scope for aircraft type ${aircraftType}`,
          sourceType: 'AMO_ORGANIZATION',
          sourceId: String(organization.id),
          suggestedAction: 'Verify AMO scope covers this aircraft type'
        });
      }
    }

    return {
      valid: blockers.length === 0,
      blockers
    };
  }

  getAmoOrganization(workPackageId: string): MaintenanceAmoOrganizationDto | null {
    const workPackage = this.requireWorkPackage(workPackageId);
    if (!workPackage.amo_organization_id) return null;

    const organization = this.sqlite
      .prepare(`SELECT * FROM maintenance_amo_organizations WHERE id = ?`)
      .get(String(workPackage.amo_organization_id)) as SqlRow | undefined;

    if (!organization) return null;

    const scopes = this.sqlite
      .prepare(
        `SELECT scope.*, station.station_code
         FROM maintenance_amo_scopes scope
         LEFT JOIN stations station ON station.id = scope.station_id
         WHERE scope.amo_organization_id = ?
         ORDER BY scope.aircraft_type, scope.maintenance_action`
      )
      .all(String(organization.id)) as SqlRow[];

    return {
      id: String(organization.id),
      organizationCode: String(organization.organization_code),
      organizationName: String(organization.organization_name),
      organizationType: String(
        organization.organization_type
      ) as MaintenanceAmoOrganizationDto['organizationType'],
      approvalReference: String(organization.approval_reference),
      approvalDocumentId: nullableText(organization.approval_document_id),
      approvalAuthority: String(organization.approval_authority),
      validFrom: String(organization.valid_from),
      validUntil: String(organization.valid_until),
      status: String(organization.status) as MaintenanceAmoOrganizationDto['status'],
      fictionalDemo: Boolean(organization.fictional_demo),
      createdAt: String(organization.created_at),
      updatedAt: String(organization.updated_at),
      scopes: scopes.map((scope) => ({
        id: String(scope.id),
        amoOrganizationId: String(scope.amo_organization_id),
        aircraftType: String(scope.aircraft_type),
        aircraftRegistration: nullableText(scope.aircraft_registration),
        maintenanceAction: String(scope.maintenance_action),
        rating: String(scope.rating),
        limitation: nullableText(scope.limitation),
        stationId: nullableText(scope.station_id),
        validFrom: String(scope.valid_from),
        validUntil: String(scope.valid_until),
        approvalDocumentId: nullableText(scope.approval_document_id),
        status: String(scope.status) as MaintenanceAmoScopeDto['status'],
        fictionalDemo: Boolean(scope.fictional_demo),
        createdAt: String(scope.created_at),
        updatedAt: String(scope.updated_at),
        organizationName: String(organization.organization_name),
        organizationCode: String(organization.organization_code),
        stationCode: nullableText(scope.station_code)
      }))
    };
  }

  getResourceReadiness(workPackageId: string): MaintenanceResourceReadinessDto {
    const evaluatedAt = now();
    const declarations = this.listResourceDeclarations(workPackageId);
    const materialRequirements = this.listMaterialRequirements(workPackageId);
    const materialReservations = this.listReservations(workPackageId);
    const toolRequirements = this.listToolRequirements(workPackageId);
    const toolAllocations = this.listToolAllocations(workPackageId);
    const personnelRequirements = this.listPersonnelRequirements(workPackageId);
    const personnelAssignments = this.listPersonnelAssignments(workPackageId);
    const amoOrganization = this.getAmoOrganization(workPackageId);
    const eligibility = this.evaluateMroEligibility(workPackageId);

    const declarationFor = (resourceType: ResourcePlanningType) =>
      declarations.find((item) => item.resourceType === resourceType)?.declaration ?? null;

    const materialDeclaration = declarationFor('MATERIAL');
    const toolDeclaration = declarationFor('TOOL');
    const personnelDeclaration = declarationFor('PERSONNEL');

    return {
      workPackageId,
      evaluatedAt,
      declarations,
      material: {
        declared: materialDeclaration !== null,
        declaration: materialDeclaration,
        requirements: materialRequirements,
        reservations: materialReservations,
        totalRequired: materialRequirements.reduce((sum, item) => sum + item.requiredQuantity, 0),
        totalReserved: materialRequirements.reduce((sum, item) => sum + item.reservedQuantity, 0),
        totalIssued: materialRequirements.reduce((sum, item) => sum + item.issuedQuantity, 0),
        totalConsumed: materialRequirements.reduce((sum, item) => sum + item.consumedQuantity, 0),
        totalReturned: materialRequirements.reduce((sum, item) => sum + item.returnedQuantity, 0),
        ready: eligibility.sections.material.blockers.length === 0,
        blockers: eligibility.sections.material.blockers
      },
      tools: {
        declared: toolDeclaration !== null,
        declaration: toolDeclaration,
        requirements: toolRequirements,
        allocations: toolAllocations,
        totalRequired: toolRequirements.reduce((sum, item) => sum + item.quantity, 0),
        totalAllocated: toolAllocations.filter((item) =>
          ['ALLOCATED', 'IN_USE'].includes(item.status)
        ).length,
        totalReturned: toolAllocations.filter((item) => item.status === 'RETURNED').length,
        ready: eligibility.sections.tools.blockers.length === 0,
        blockers: eligibility.sections.tools.blockers
      },
      personnel: {
        declared: personnelDeclaration !== null,
        declaration: personnelDeclaration,
        requirements: personnelRequirements,
        assignments: personnelAssignments,
        totalRequired: personnelRequirements.reduce((sum, item) => sum + item.requiredCount, 0),
        totalAssigned: personnelAssignments.filter((item) => item.status === 'CONFIRMED').length,
        totalEligible: personnelAssignments.filter(
          (item) => item.status === 'CONFIRMED' && item.eligibilityStatus === 'ELIGIBLE'
        ).length,
        ready: eligibility.sections.personnel.blockers.length === 0,
        blockers: eligibility.sections.personnel.blockers
      },
      amoScope: {
        organizationId: amoOrganization?.id ?? null,
        organizationName: amoOrganization?.organizationName ?? null,
        scope: amoOrganization?.scopes[0] ?? null,
        ready: eligibility.sections.amoScope.blockers.length === 0,
        blockers: eligibility.sections.amoScope.blockers
      }
    };
  }

  // =============================================================================
  // Centralized MRO Eligibility Engine
  // =============================================================================

  evaluateMroEligibility(workPackageId: string, flightOrderId?: string): MroEligibilityResult {
    const evaluatedAt = now();
    const workPackage = this.requireWorkPackage(workPackageId);
    const blockers: MroEligibilityBlocker[] = [];
    const warnings: MroEligibilityBlocker[] = [];

    const sections: Record<MroEligibilitySectionKey, MroEligibilitySection> = {
      package: {
        key: 'package',
        label: 'Work Package',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      approvedData: {
        key: 'approvedData',
        label: 'Approved Data',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      dueControl: {
        key: 'dueControl',
        label: 'Due Control',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      material: {
        key: 'material',
        label: 'Material',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      tools: {
        key: 'tools',
        label: 'Tools',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      personnel: {
        key: 'personnel',
        label: 'Personnel',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      amoScope: {
        key: 'amoScope',
        label: 'AMO Scope',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      jobCards: {
        key: 'jobCards',
        label: 'Job Cards',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      inspections: {
        key: 'inspections',
        label: 'Inspections',
        status: 'SIAP',
        blockers: [],
        warnings: []
      },
      release: {
        key: 'release',
        label: 'Release',
        status: 'SIAP',
        blockers: [],
        warnings: []
      }
    };

    // Material evaluation
    const materialRequirements = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_work_package_material_requirements
         WHERE work_package_id = ?`
      )
      .all(workPackageId) as SqlRow[];

    const materialDeclarations = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_resource_planning_declarations
         WHERE work_package_id = ? AND resource_type = 'MATERIAL'`
      )
      .get(workPackageId) as SqlRow | undefined;

    if (!materialDeclarations && materialRequirements.length > 0) {
      sections.material.blockers.push({
        code: 'MATERIAL_PLANNING_UNDECLARED',
        category: 'MATERIAL',
        severity: 'BLOCKING',
        title: 'Material planning not declared',
        message: 'Material resource planning must be declared',
        sourceType: 'WORK_PACKAGE',
        sourceId: workPackageId,
        suggestedAction: 'Declare material resource planning'
      });
    }

    for (const req of materialRequirements) {
      const reservations = this.sqlite
        .prepare(
          `SELECT * FROM maintenance_inventory_reservations
	           WHERE material_requirement_id = ?`
        )
        .all(String(req.id)) as SqlRow[];

      const totalActiveReserved = reservations
        .filter((r) => ['ACTIVE', 'PARTIALLY_ISSUED'].includes(String(r.status)))
        .reduce((sum, r) => sum + number(r.quantity), 0);
      const totalIssued = reservations
        .filter((r) => String(r.status) === 'ISSUED')
        .reduce((sum, r) => sum + number(r.issued_quantity ?? r.quantity), 0);
      const installed = this.sqlite
        .prepare(
          `SELECT COALESCE(SUM(quantity), 0) AS total
	           FROM maintenance_material_installations
	           WHERE material_requirement_id = ? AND status = 'INSTALLED'`
        )
        .get(String(req.id)) as SqlRow;
      const totalInstalled = number(installed.total);
      const totalReserved = totalActiveReserved + totalIssued + totalInstalled;

      if (totalReserved < number(req.required_quantity)) {
        sections.material.blockers.push({
          code: 'MATERIAL_NOT_RESERVED',
          category: 'MATERIAL',
          severity: 'BLOCKING',
          title: 'Material not fully reserved',
          message: `Requirement ${req.id} not fully reserved`,
          sourceType: 'MATERIAL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Reserve required materials'
        });
        continue;
      }
      if (totalIssued < number(req.required_quantity)) {
        sections.material.blockers.push({
          code: 'MATERIAL_NOT_ISSUED',
          category: 'MATERIAL',
          severity: 'BLOCKING',
          title: 'Material not issued',
          message: `Requirement ${req.id} has not been issued from store`,
          sourceType: 'MATERIAL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Issue reserved material'
        });
        continue;
      }
      if (totalInstalled < number(req.required_quantity)) {
        sections.material.blockers.push({
          code: 'MATERIAL_NOT_INSTALLED',
          category: 'MATERIAL',
          severity: 'BLOCKING',
          title: 'Material not installed',
          message: `Requirement ${req.id} has not been recorded as installed`,
          sourceType: 'MATERIAL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Install issued material and verify traceability'
        });
      }
    }

    // Tool evaluation
    const toolRequirements = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_tool_requirements
         WHERE work_package_id = ?`
      )
      .all(workPackageId) as SqlRow[];

    const toolDeclarations = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_resource_planning_declarations
         WHERE work_package_id = ? AND resource_type = 'TOOL'`
      )
      .get(workPackageId) as SqlRow | undefined;

    if (!toolDeclarations && toolRequirements.length > 0) {
      sections.tools.blockers.push({
        code: 'TOOL_PLANNING_UNDECLARED',
        category: 'TOOL',
        severity: 'BLOCKING',
        title: 'Tool planning not declared',
        message: 'Tool resource planning must be declared',
        sourceType: 'WORK_PACKAGE',
        sourceId: workPackageId,
        suggestedAction: 'Declare tool resource planning'
      });
    }

    for (const req of toolRequirements) {
      const requirement = this.getToolRequirement(String(req.id));
      const totalAllocated = this.currentEligibleToolAllocationCount(requirement);

      if (totalAllocated < number(req.quantity)) {
        sections.tools.blockers.push({
          code: 'TOOL_NOT_ALLOCATED',
          category: 'TOOL',
          severity: 'BLOCKING',
          title: 'Tools not fully allocated',
          message: `Requirement ${req.id} not fully allocated`,
          sourceType: 'TOOL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Allocate required tools'
        });
      }
    }

    // Personnel evaluation
    const personnelRequirements = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_personnel_requirements
         WHERE work_package_id = ?`
      )
      .all(workPackageId) as SqlRow[];

    const personnelDeclarations = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_resource_planning_declarations
         WHERE work_package_id = ? AND resource_type = 'PERSONNEL'`
      )
      .get(workPackageId) as SqlRow | undefined;

    if (!personnelDeclarations && personnelRequirements.length > 0) {
      sections.personnel.blockers.push({
        code: 'PERSONNEL_PLANNING_UNDECLARED',
        category: 'PERSONNEL',
        severity: 'BLOCKING',
        title: 'Personnel planning not declared',
        message: 'Personnel resource planning must be declared',
        sourceType: 'WORK_PACKAGE',
        sourceId: workPackageId,
        suggestedAction: 'Declare personnel resource planning'
      });
    }

    for (const req of personnelRequirements) {
      const requirement = this.getPersonnelRequirement(String(req.id));
      const assignments = this.sqlite
        .prepare(
          `SELECT * FROM maintenance_personnel_assignments
           WHERE personnel_requirement_id = ? AND status IN ('ASSIGNED', 'CONFIRMED')`
        )
        .all(String(req.id)) as SqlRow[];

      const confirmedEligibleCount = this.currentConfirmedEligiblePersonnelCount(requirement);

      if (confirmedEligibleCount < number(req.required_count)) {
        sections.personnel.blockers.push({
          code: 'PERSONNEL_REQUIREMENT_UNFULFILLED',
          category: 'PERSONNEL',
          severity: 'BLOCKING',
          title: 'Personnel requirement not fulfilled',
          message: `Requirement ${req.id} not fully confirmed by eligible personnel`,
          sourceType: 'PERSONNEL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Assign and confirm required eligible personnel'
        });
      }

      const ineligibleAssignments = assignments.filter(
        (a) => String(a.eligibility_status) === 'INELIGIBLE'
      );
      if (ineligibleAssignments.length > 0) {
        sections.personnel.blockers.push({
          code: 'PERSONNEL_ASSIGNMENT_INELIGIBLE',
          category: 'PERSONNEL',
          severity: 'BLOCKING',
          title: 'Ineligible personnel assigned',
          message: `${ineligibleAssignments.length} ineligible assignments for requirement ${req.id}`,
          sourceType: 'PERSONNEL_REQUIREMENT',
          sourceId: String(req.id),
          suggestedAction: 'Review and replace ineligible assignments'
        });
      }
    }

    // AMO scope evaluation
    const amoValidation = this.validateAmoScope(workPackageId);
    sections.amoScope.blockers.push(...amoValidation.blockers);

    // Update section statuses
    for (const key of Object.keys(sections) as MroEligibilitySectionKey[]) {
      const section = sections[key];
      if (section.blockers.length > 0) {
        section.status = 'TERBLOKIR';
      } else if (section.warnings.length > 0) {
        section.status = 'PERLU_TINDAKAN';
      }
      blockers.push(...section.blockers);
      warnings.push(...section.warnings);
    }

    return {
      eligible: blockers.length === 0,
      evaluatedAt,
      workPackageId,
      aircraftId: String(workPackage.aircraft_id),
      flightOrderId: flightOrderId ?? null,
      blockers,
      warnings,
      sections,
      resourceSummary: {
        materialRequirements: materialRequirements.length,
        materialReserved: materialRequirements.filter((req) => {
          const reservations = this.sqlite
            .prepare(
              `SELECT COALESCE(SUM(CASE
	                 WHEN status IN ('ACTIVE', 'PARTIALLY_ISSUED') THEN quantity
	                 WHEN status = 'ISSUED' THEN COALESCE(issued_quantity, quantity)
	                 ELSE 0
	               END), 0) AS total
	               FROM maintenance_inventory_reservations
	               WHERE material_requirement_id = ?`
            )
            .get(String(req.id)) as SqlRow;
          return number(reservations.total) >= number(req.required_quantity);
        }).length,
        materialIssued: materialRequirements.filter((req) => {
          const reservations = this.sqlite
            .prepare(
              `SELECT COALESCE(SUM(COALESCE(issued_quantity, quantity)), 0) AS total
	               FROM maintenance_inventory_reservations
	               WHERE material_requirement_id = ? AND status = 'ISSUED'`
            )
            .get(String(req.id)) as SqlRow;
          return number(reservations.total) >= number(req.required_quantity);
        }).length,
        toolRequirements: toolRequirements.length,
        toolsAllocated: toolRequirements.filter((req) => {
          const allocations = this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
               FROM maintenance_tool_allocations_v2
               WHERE tool_requirement_id = ? AND status IN ('ALLOCATED', 'IN_USE')`
            )
            .get(String(req.id)) as SqlRow;
          return number(allocations.count) >= number(req.quantity);
        }).length,
        toolsReturned: toolRequirements.filter((req) => {
          const allocations = this.sqlite
            .prepare(
              `SELECT COUNT(*) AS count
               FROM maintenance_tool_allocations_v2
               WHERE tool_requirement_id = ? AND status = 'RETURNED'`
            )
            .get(String(req.id)) as SqlRow;
          return number(allocations.count) >= number(req.quantity);
        }).length,
        personnelRequirements: personnelRequirements.length,
        personnelAssigned: personnelRequirements.filter((req) => {
          const assignments = this.sqlite
            .prepare(
              `SELECT COUNT(DISTINCT personnel_id) AS count
               FROM maintenance_personnel_assignments
               WHERE personnel_requirement_id = ?
                 AND status = 'CONFIRMED'
                 AND eligibility_status = 'ELIGIBLE'`
            )
            .get(String(req.id)) as SqlRow;
          return number(assignments.count) >= number(req.required_count);
        }).length,
        personnelEligible: personnelRequirements.filter((req) => {
          const assignments = this.sqlite
            .prepare(
              `SELECT COUNT(DISTINCT personnel_id) AS count
               FROM maintenance_personnel_assignments
               WHERE personnel_requirement_id = ?
                 AND status = 'CONFIRMED'
                 AND eligibility_status = 'ELIGIBLE'`
            )
            .get(String(req.id)) as SqlRow;
          return number(assignments.count) >= number(req.required_count);
        }).length
      }
    };
  }

  // =============================================================================
  // Flight-MRO Linking
  // =============================================================================

  linkFlightMro(input: LinkFlightMroInput, actor: AuditActor): MaintenanceFlightMroLinkDto {
    const timestamp = now();
    const workPackage = this.requireWorkPackage(input.workPackageId);

    // Get flight order
    const flightOrder = this.sqlite
      .prepare(`SELECT * FROM flight_orders WHERE id = ?`)
      .get(input.flightOrderId) as SqlRow | undefined;

    if (!flightOrder) {
      throw new DomainError(
        'FLIGHT_ORDER_NOT_FOUND',
        `Flight order ${input.flightOrderId} not found`,
        404
      );
    }

    // Validate aircraft match
    if (String(flightOrder.aircraft_id) !== String(workPackage.aircraft_id)) {
      throw new DomainError(
        'FLIGHT_AIRCRAFT_MRO_MISMATCH',
        'Flight order aircraft does not match work package aircraft',
        409
      );
    }

    const id = `mfmlink-${nanoid(12)}`;

    this.sqlite.transaction(() => {
      this.sqlite
        .prepare(
          `INSERT INTO maintenance_flight_mro_links (
            id, flight_order_id, work_package_id, aircraft_id,
            affects_serviceability, link_reason, status,
            linked_by, linked_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`
        )
        .run(
          id,
          input.flightOrderId,
          input.workPackageId,
          workPackage.aircraft_id,
          input.affectsServiceability ? 1 : 0,
          input.linkReason,
          actor.userId,
          timestamp,
          timestamp,
          timestamp
        );

      this.audit('FLIGHT_MRO_LINK', id, 'LINKED', actor, {
        flightOrderId: input.flightOrderId,
        workPackageId: input.workPackageId,
        affectsServiceability: input.affectsServiceability
      });
    })();

    return this.getFlightMroLink(id);
  }

  unlinkFlightMro(input: UnlinkFlightMroInput, actor: AuditActor): MaintenanceFlightMroLinkDto {
    const timestamp = now();
    const link = this.getFlightMroLink(input.linkId);

    if (link.status !== 'ACTIVE') {
      throw new DomainError('LINK_NOT_ACTIVE', 'Link is not active', 409);
    }

    let updatedLink: MaintenanceFlightMroLinkDto | null = null;

    this.sqlite.transaction(() => {
      // Update link
      this.sqlite
        .prepare(
          `UPDATE maintenance_flight_mro_links
           SET status = 'CANCELLED', unlinked_by = ?, unlinked_at = ?,
               unlink_reason = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(actor.userId, timestamp, input.reason, timestamp, input.linkId);

      this.audit('FLIGHT_MRO_LINK', input.linkId, 'UNLINKED', actor, { reason: input.reason });

      updatedLink = this.getFlightMroLink(input.linkId);
    })();

    return updatedLink!;
  }

  getFlightMroReadiness(flightOrderId: string): FlightMroReadinessDto {
    const evaluatedAt = now();

    // Get flight order
    const flightOrder = this.sqlite
      .prepare(
        `SELECT fo.*, aircraft.registration_number
         FROM flight_orders fo
         JOIN aircraft ON aircraft.id = fo.aircraft_id
         WHERE fo.id = ?`
      )
      .get(flightOrderId) as SqlRow | undefined;

    if (!flightOrder) {
      throw new DomainError(
        'FLIGHT_ORDER_NOT_FOUND',
        `Flight order ${flightOrderId} not found`,
        404
      );
    }

    // Get linked packages
    const links = this.sqlite
      .prepare(
        `SELECT l.*, wp.package_number, wp.title, wp.status
         FROM maintenance_flight_mro_links l
         JOIN maintenance_work_packages wp ON wp.id = l.work_package_id
         WHERE l.flight_order_id = ? AND l.status = 'ACTIVE'`
      )
      .all(flightOrderId) as SqlRow[];

    const blockers: MroEligibilityBlocker[] = [];
    const warnings: MroEligibilityBlocker[] = [];

    const linkedPackages = links.map((link) => {
      const eligibility = this.evaluateMroEligibility(String(link.work_package_id), flightOrderId);

      // Check if has technical release
      const release = this.sqlite
        .prepare(
          `SELECT release_number FROM aircraft_releases
           WHERE work_order_reference = ?
           ORDER BY released_at DESC
           LIMIT 1`
        )
        .get(String(link.work_package_id)) as SqlRow | undefined;

      if (!release && link.affects_serviceability) {
        blockers.push({
          code: 'TECHNICAL_RELEASE_REQUIRED',
          category: 'RELEASE',
          severity: 'BLOCKING',
          title: 'Technical release required',
          message: `Work package ${link.package_number} affects serviceability but has no technical release`,
          sourceType: 'WORK_PACKAGE',
          sourceId: String(link.work_package_id),
          suggestedAction: 'Issue technical release for work package'
        });
      }

      return {
        linkId: String(link.id),
        workPackageId: String(link.work_package_id),
        workPackageNumber: String(link.package_number),
        workPackageTitle: String(link.title),
        workPackageStatus: String(link.status),
        affectsServiceability: Boolean(link.affects_serviceability),
        linkStatus: String(link.status) as FlightMroLinkStatus,
        eligibility,
        hasTechnicalRelease: Boolean(release),
        releaseNumber: release ? String(release.release_number) : null
      };
    });

    // Check for unlinked serviceability packages
    const unlinkedPackages = this.sqlite
      .prepare(
        `SELECT wp.id, wp.package_number, wp.title, wp.status
         FROM maintenance_work_packages wp
         LEFT JOIN maintenance_flight_mro_links l
           ON l.work_package_id = wp.id AND l.flight_order_id = ? AND l.status = 'ACTIVE'
         WHERE wp.aircraft_id = ?
           AND wp.status IN ('IN_PROGRESS', 'READY_FOR_RELEASE', 'RELEASED')
           AND l.id IS NULL`
      )
      .all(flightOrderId, String(flightOrder.aircraft_id)) as SqlRow[];

    const unlinkedServiceabilityPackages = unlinkedPackages.map((pkg) => ({
      workPackageId: String(pkg.id),
      workPackageNumber: String(pkg.package_number),
      workPackageTitle: String(pkg.title),
      workPackageStatus: String(pkg.status)
    }));

    return {
      flightOrderId,
      flightOrderNumber: String(flightOrder.order_number),
      aircraftId: String(flightOrder.aircraft_id),
      aircraftRegistration: String(flightOrder.registration_number),
      evaluatedAt,
      ready: blockers.length === 0,
      linkedPackages,
      blockers,
      warnings,
      unlinkedServiceabilityPackages,
      legacyHandoffStatus: null
    };
  }

  private getFlightMroLink(id: string): MaintenanceFlightMroLinkDto {
    const row = this.sqlite
      .prepare(
        `SELECT l.*,
                wp.package_number, wp.title, wp.status AS work_package_status,
                fo.order_number AS flight_order_number,
                aircraft.registration_number
         FROM maintenance_flight_mro_links l
         JOIN maintenance_work_packages wp ON wp.id = l.work_package_id
         JOIN flight_orders fo ON fo.id = l.flight_order_id
         JOIN aircraft ON aircraft.id = l.aircraft_id
         WHERE l.id = ?`
      )
      .get(id) as SqlRow;

    if (!row) {
      throw new DomainError('FLIGHT_MRO_LINK_NOT_FOUND', `Flight-MRO link ${id} not found`, 404);
    }

    return {
      id: String(row.id),
      flightOrderId: String(row.flight_order_id),
      workPackageId: String(row.work_package_id),
      aircraftId: String(row.aircraft_id),
      affectsServiceability: Boolean(row.affects_serviceability),
      linkReason: String(row.link_reason),
      status: String(row.status) as FlightMroLinkStatus,
      linkedBy: String(row.linked_by),
      linkedAt: String(row.linked_at),
      unlinkedBy: nullableText(row.unlinked_by),
      unlinkedAt: nullableText(row.unlinked_at),
      unlinkReason: nullableText(row.unlink_reason),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      workPackageNumber: String(row.package_number),
      workPackageTitle: String(row.title),
      workPackageStatus: String(row.work_package_status),
      flightOrderNumber: String(row.flight_order_number),
      aircraftRegistration: String(row.registration_number)
    };
  }

  // =============================================================================
  // List / Query Methods
  // =============================================================================

  listResourceDeclarations(workPackageId: string): MaintenanceResourceDeclarationDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_resource_planning_declarations
         WHERE work_package_id = ?
         ORDER BY resource_type`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      resourceType: String(row.resource_type) as ResourcePlanningType,
      declaration: String(row.declaration) as ResourcePlanningDeclaration,
      reason: nullableText(row.reason),
      evidenceDocumentId: nullableText(row.evidence_document_id),
      declaredBy: String(row.declared_by),
      declaredAt: String(row.declared_at),
      updatedAt: String(row.updated_at)
    }));
  }

  listMaterialRequirements(workPackageId: string): MaintenanceMaterialRequirementDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT mr.*,
	                p.part_number, p.part_name, p.lifecycle_type, p.tracking_type,
	                p.certificate_required AS part_certificate_required,
	                COALESCE(SUM(CASE WHEN r.status IN ('ACTIVE', 'PARTIALLY_ISSUED') THEN r.quantity ELSE 0 END), 0) AS reserved_quantity,
	                COALESCE(SUM(CASE WHEN r.status = 'ISSUED' THEN COALESCE(r.issued_quantity, r.quantity) ELSE 0 END), 0) AS issued_quantity,
	                COALESCE((
	                  SELECT SUM(inst.quantity)
	                  FROM maintenance_material_installations inst
	                  WHERE inst.material_requirement_id = mr.id AND inst.status = 'INSTALLED'
	                ), 0) AS installed_quantity,
	                0 AS consumed_quantity,
	                0 AS returned_quantity
         FROM maintenance_work_package_material_requirements mr
         LEFT JOIN inventory_parts p ON p.id = mr.part_id
         LEFT JOIN maintenance_inventory_reservations r ON r.material_requirement_id = mr.id
         WHERE mr.work_package_id = ?
         GROUP BY mr.id
         ORDER BY mr.created_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      partId: nullableText(row.part_id),
      serializedPartId: nullableText(row.serialized_part_id),
      requiredQuantity: number(row.required_quantity),
      unit: String(row.unit),
      requestedStationId: nullableText(row.requested_station_id),
      requiredBy: nullableText(row.required_by),
      status: String(row.status) as MaterialRequirementStatus,
      reason: nullableText(row.reason),
      source: 'MANUAL',
      notes: nullableText(row.notes),
      createdBy: nullableText(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      reservedQuantity: number(row.reserved_quantity),
      issuedQuantity: number(row.issued_quantity),
      consumedQuantity: number(row.consumed_quantity),
      returnedQuantity: number(row.returned_quantity),
      installedQuantity: number(row.installed_quantity),
      lifecycleStatus: this.materialLifecycleStatus(
        number(row.required_quantity),
        number(row.reserved_quantity),
        number(row.issued_quantity),
        number(row.installed_quantity)
      ),
      satisfied: number(row.installed_quantity) >= number(row.required_quantity),
      partNumber: nullableText(row.part_number),
      partName: nullableText(row.part_name),
      partLifecycleType: nullableText(row.lifecycle_type),
      partTrackingType: nullableText(row.tracking_type),
      partCertificateRequired: Boolean(row.part_certificate_required)
    }));
  }

  listReservations(workPackageId: string): MaintenanceInventoryReservationDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT r.*,
                sp.serial_number,
                bin.bin_name AS inventory_location_name
         FROM maintenance_inventory_reservations r
         LEFT JOIN inventory_serialized_parts sp ON sp.id = r.serialized_part_id
         LEFT JOIN inventory_bins bin ON bin.id = r.inventory_location_id
         WHERE r.work_package_id = ?
         ORDER BY r.reserved_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      reservationNumber: String(row.reservation_number),
      materialRequirementId: String(row.material_requirement_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      aircraftId: String(row.aircraft_id),
      flightOrderId: nullableText(row.flight_order_id),
      inventoryItemId: String(row.inventory_item_id),
      partId: String(row.part_id),
      serializedPartId: nullableText(row.serialized_part_id),
      lotNumber: nullableText(row.lot_number),
      serialNumber: nullableText(row.serial_number),
      stationId: String(row.station_id),
      inventoryLocationId: nullableText(row.inventory_location_id),
      quantity: number(row.quantity),
      unit: String(row.unit),
      expiryAt: nullableText(row.expiry_at),
      certificateReference: nullableText(row.certificate_reference),
      certificateDocumentId: nullableText(row.certificate_document_id),
      status: String(row.status) as ReservationStatus,
      reservedBy: String(row.reserved_by),
      reservedAt: String(row.reserved_at),
      releasedBy: nullableText(row.released_by),
      releasedAt: nullableText(row.released_at),
      releaseReason: nullableText(row.release_reason),
      issueId: nullableText(row.issue_id),
      issueMovementId: nullableText(row.issue_movement_id),
      issuedQuantity: number(row.issued_quantity),
      issuedBy: nullableText(row.issued_by),
      issuedAt: nullableText(row.issued_at),
      version: number(row.version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  listToolRequirements(workPackageId: string): MaintenanceToolRequirementDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT tr.*,
                tm.tool_code, tm.name AS tool_name, tm.serial_number AS tool_serial_number
         FROM maintenance_tool_requirements tr
         LEFT JOIN maintenance_tool_masters tm ON tm.id = tr.tool_master_id
         WHERE tr.work_package_id = ?
         ORDER BY tr.created_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      toolMasterId: nullableText(row.tool_master_id),
      toolType: nullableText(row.tool_type),
      quantity: number(row.quantity),
      requiredStationId: String(row.required_station_id),
      requiredFrom: String(row.required_from),
      requiredUntil: String(row.required_until),
      status: String(row.status) as ToolRequirementStatus,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      toolCode: nullableText(row.tool_code),
      toolName: nullableText(row.tool_name),
      toolSerialNumber: nullableText(row.tool_serial_number)
    }));
  }

  listToolAllocations(workPackageId: string): MaintenanceToolAllocationV2Dto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT ta.*,
                tm.tool_code, tm.name AS tool_name, tm.serial_number AS tool_serial_number,
                tm.calibration_required, tm.calibration_expires_at,
                crew.full_name AS custodian_name
         FROM maintenance_tool_allocations_v2 ta
         LEFT JOIN maintenance_tool_masters tm ON tm.id = ta.tool_id
         LEFT JOIN crews crew ON crew.id = ta.custodian_personnel_id
         WHERE ta.work_package_id = ?
         ORDER BY ta.allocated_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      toolRequirementId: nullableText(row.tool_requirement_id),
      toolId: String(row.tool_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      aircraftId: String(row.aircraft_id),
      stationId: String(row.station_id),
      status: String(row.status) as ToolAllocationStatus,
      allocatedBy: String(row.allocated_by),
      allocatedAt: String(row.allocated_at),
      custodianPersonnelId: nullableText(row.custodian_personnel_id),
      custodyStartedAt: nullableText(row.custody_started_at),
      returnedBy: nullableText(row.returned_by),
      returnedAt: nullableText(row.returned_at),
      returnCondition: nullableText(row.return_condition),
      returnNote: nullableText(row.return_note),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      toolCode: String(row.tool_code),
      toolName: String(row.tool_name),
      toolSerialNumber: nullableText(row.tool_serial_number),
      calibrationRequired: Boolean(row.calibration_required),
      calibrationExpiresAt: nullableText(row.calibration_expires_at),
      custodianName: nullableText(row.custodian_name)
    }));
  }

  listPersonnelRequirements(workPackageId: string): MaintenancePersonnelRequirementDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT pr.*,
                (SELECT COUNT(*) FROM maintenance_personnel_assignments pa
                 WHERE pa.personnel_requirement_id = pr.id AND pa.status IN ('ASSIGNED', 'CONFIRMED')
                ) AS assigned_count
         FROM maintenance_personnel_requirements pr
         WHERE pr.work_package_id = ?
         ORDER BY pr.created_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      roleType: String(row.role_type) as PersonnelRoleType,
      requiredCount: number(row.required_count),
      requiredLicenceType: nullableText(row.required_licence_type),
      requiredQualification: nullableText(row.required_qualification),
      requiredAuthorization: nullableText(row.required_authorization),
      aircraftType: nullableText(row.aircraft_type),
      dutyStationId: String(row.duty_station_id),
      requiredFrom: String(row.required_from),
      requiredUntil: String(row.required_until),
      status: String(row.status) as PersonnelRequirementStatus,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      assignedCount: number(row.assigned_count)
    }));
  }

  listPersonnelAssignments(workPackageId: string): MaintenancePersonnelAssignmentDto[] {
    this.requireWorkPackage(workPackageId);
    const rows = this.sqlite
      .prepare(
        `SELECT pa.*,
	                crew.full_name AS personnel_name, crew.employee_code AS personnel_code,
                pl.license_number, pl.license_type
         FROM maintenance_personnel_assignments pa
         LEFT JOIN crews crew ON crew.id = pa.personnel_id
         LEFT JOIN personnel_licenses pl ON pl.personnel_id = pa.personnel_id AND pl.status = 'ACTIVE'
         WHERE pa.work_package_id = ?
         ORDER BY pa.assigned_at`
      )
      .all(workPackageId) as SqlRow[];

    return rows.map((row) => {
      const eligibilitySnapshot = jsonObject(
        row.eligibility_snapshot_json
      ) as PersonnelEligibilitySnapshot | null;
      return {
        id: String(row.id),
        personnelRequirementId: String(row.personnel_requirement_id),
        personnelId: String(row.personnel_id),
        workPackageId: String(row.work_package_id),
        jobCardId: nullableText(row.job_card_id),
        roleType: String(row.role_type) as PersonnelRoleType,
        status: String(row.status) as PersonnelAssignmentStatus,
        eligibilityStatus: String(row.eligibility_status) as PersonnelEligibilityStatus,
        eligibilitySnapshot: eligibilitySnapshot || {
          licenceReference: null,
          licenceValid: false,
          licenceExpiry: null,
          licenceTypeMatch: false,
          qualification: null,
          qualificationMatch: false,
          authorizationReference: null,
          authorizationValid: false,
          authorizationExpiry: null,
          aircraftTypeMatch: false,
          dutyStationMatch: false,
          availabilityResult: false,
          assignmentConflict: false,
          roleSeparationResult: false,
          roleSeparationDetails: null,
          evaluatedAt: now(),
          evaluatedByVersion: 'v2.1'
        },
        assignedBy: String(row.assigned_by),
        assignedAt: String(row.assigned_at),
        confirmedAt: nullableText(row.confirmed_at),
        releasedAt: nullableText(row.released_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        personnelName: optionalText(row.personnel_name),
        personnelCode: optionalText(row.personnel_code),
        licenceNumber: optionalText(row.license_number),
        licenceType: optionalText(row.license_type)
      };
    });
  }

  listFlightMroLinks(flightOrderId: string): MaintenanceFlightMroLinkDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT l.*,
                wp.package_number, wp.title, wp.status AS work_package_status,
                fo.order_number AS flight_order_number,
                aircraft.registration_number
         FROM maintenance_flight_mro_links l
         JOIN maintenance_work_packages wp ON wp.id = l.work_package_id
         JOIN flight_orders fo ON fo.id = l.flight_order_id
         JOIN aircraft ON aircraft.id = l.aircraft_id
         WHERE l.flight_order_id = ?
         ORDER BY l.linked_at`
      )
      .all(flightOrderId) as SqlRow[];

    return rows.map((row) => ({
      id: String(row.id),
      flightOrderId: String(row.flight_order_id),
      workPackageId: String(row.work_package_id),
      aircraftId: String(row.aircraft_id),
      affectsServiceability: Boolean(row.affects_serviceability),
      linkReason: String(row.link_reason),
      status: String(row.status) as FlightMroLinkStatus,
      linkedBy: String(row.linked_by),
      linkedAt: String(row.linked_at),
      unlinkedBy: nullableText(row.unlinked_by),
      unlinkedAt: nullableText(row.unlinked_at),
      unlinkReason: nullableText(row.unlink_reason),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      workPackageNumber: String(row.package_number),
      workPackageTitle: String(row.title),
      workPackageStatus: String(row.work_package_status),
      flightOrderNumber: String(row.flight_order_number),
      aircraftRegistration: String(row.registration_number)
    }));
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  private requireWorkPackage(id: string): SqlRow {
    const row = this.sqlite
      .prepare(`SELECT * FROM maintenance_work_packages WHERE id = ?`)
      .get(id) as SqlRow | undefined;

    if (!row) {
      throw new DomainError('WORK_PACKAGE_NOT_FOUND', `Work package ${id} not found`, 404);
    }

    return row;
  }

  private assertWorkPackageNotReleased(workPackage: SqlRow) {
    if (String(workPackage.status) === 'RELEASED') {
      throw new DomainError('WORK_PACKAGE_RELEASED', 'Cannot modify released work package', 409);
    }
  }

  private assertResourceWorkPackage(
    expectedWorkPackageId: string | undefined,
    actualWorkPackageId: string
  ) {
    if (expectedWorkPackageId && expectedWorkPackageId !== actualWorkPackageId) {
      throw new DomainError(
        'RESOURCE_WORK_PACKAGE_MISMATCH',
        'Resource does not belong to the requested work package.',
        409,
        { expectedWorkPackageId, actualWorkPackageId }
      );
    }
  }

  private assertJobCardBelongsToWorkPackage(jobCardId: string | null, workPackageId: string) {
    if (!jobCardId) return;
    const row = this.sqlite
      .prepare(`SELECT work_package_id FROM maintenance_job_cards WHERE id = ?`)
      .get(jobCardId) as SqlRow | undefined;
    if (!row) {
      throw new DomainError('JOB_CARD_NOT_FOUND', `Job card ${jobCardId} not found`, 404);
    }
    if (String(row.work_package_id) !== workPackageId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Job card does not belong to the material work package.',
        409,
        { jobCardId, workPackageId, actualWorkPackageId: String(row.work_package_id) }
      );
    }
  }

  private materialLifecycleStatus(
    requiredQuantity: number,
    reservedQuantity: number,
    issuedQuantity: number,
    installedQuantity: number
  ): MaintenanceMaterialRequirementDto['lifecycleStatus'] {
    if (installedQuantity >= requiredQuantity) return 'INSTALLED';
    if (issuedQuantity >= requiredQuantity) return 'ISSUED';
    if (reservedQuantity >= requiredQuantity) return 'RESERVED';
    return 'REQUESTED';
  }

  private recalculateMaterialRequirementStatus(requirementId: string, timestamp: string) {
    this.sqlite
      .prepare(
        `UPDATE maintenance_work_package_material_requirements
	         SET status = CASE
	           WHEN required_quantity <= (
	             SELECT COALESCE(SUM(COALESCE(issued_quantity, quantity)), 0)
	             FROM maintenance_inventory_reservations
	             WHERE material_requirement_id = ? AND status = 'ISSUED'
	           ) THEN 'ISSUED'
	           WHEN required_quantity <= (
	             SELECT COALESCE(SUM(quantity), 0)
	             FROM maintenance_inventory_reservations
	             WHERE material_requirement_id = ? AND status IN ('ACTIVE', 'PARTIALLY_ISSUED')
	           ) THEN 'RESERVED'
	           ELSE 'REQUESTED'
	         END,
	         updated_at = ?
	         WHERE id = ?`
      )
      .run(requirementId, requirementId, timestamp, requirementId);
  }

  private insertReservationEvent(
    reservationId: string,
    eventType:
      | 'RESERVED'
      | 'PARTIALLY_ISSUED'
      | 'ISSUED'
      | 'RELEASED'
      | 'RETURNED'
      | 'CANCELLED'
      | 'EXPIRED',
    quantity: number,
    actor: AuditActor,
    reason: string | null,
    beforeSnapshot: Record<string, unknown>,
    afterSnapshot: Record<string, unknown>,
    idempotencyKey: string | null,
    timestamp: string
  ) {
    this.sqlite
      .prepare(
        `INSERT INTO maintenance_reservation_events (
	          id, reservation_id, event_type, quantity, actor_user_id, actor_role,
	          reason, before_snapshot_json, after_snapshot_json, idempotency_key, occurred_at, created_at
	        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `mresev-${nanoid(12)}`,
        reservationId,
        eventType,
        quantity,
        actor.userId,
        actor.role,
        reason,
        JSON.stringify(beforeSnapshot),
        JSON.stringify(afterSnapshot),
        idempotencyKey,
        timestamp,
        timestamp
      );
  }

  private assertReserveInputSourceEligibility(
    materialRequirement: MaintenanceMaterialRequirementDto,
    input: ReserveMaterialInput
  ) {
    if (!materialRequirement.partId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Material requirement is not linked to a part.',
        409
      );
    }

    const selectedBalance = this.sqlite
      .prepare(
        `SELECT balance.id AS stock_balance_id, balance.part_id, balance.condition,
                balance.on_hand_quantity, bin.id AS bin_id, warehouse.station_id,
                lot.expires_at, lot.certificate_verified AS lot_certificate_verified,
                part.certificate_required
         FROM inventory_stock_balances balance
         JOIN inventory_bins bin ON bin.id = balance.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         JOIN inventory_parts part ON part.id = balance.part_id
         LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
         WHERE balance.id = ?`
      )
      .get(input.inventoryItemId) as SqlRow | undefined;

    const source =
      selectedBalance ??
      (this.sqlite
        .prepare(
          `SELECT balance.id AS stock_balance_id, balance.part_id, balance.condition,
                balance.on_hand_quantity, bin.id AS bin_id, warehouse.station_id,
                lot.expires_at, lot.certificate_verified AS lot_certificate_verified,
                part.certificate_required
         FROM inventory_stock_balances balance
         JOIN inventory_bins bin ON bin.id = balance.bin_id
         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
         JOIN inventory_parts part ON part.id = balance.part_id
         LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
         WHERE balance.part_id = ?
           AND warehouse.station_id = ?
           AND (? IS NULL OR balance.bin_id = ?)
         ORDER BY CASE WHEN balance.condition = 'SERVICEABLE' THEN 0 ELSE 1 END,
                  balance.on_hand_quantity DESC
         LIMIT 1`
        )
        .get(
          materialRequirement.partId,
          input.stationId,
          input.inventoryLocationId ?? null,
          input.inventoryLocationId ?? null
        ) as SqlRow | undefined);

    if (!source) {
      throw new DomainError(
        'MATERIAL_SOURCE_NOT_FOUND',
        'Reserved source stock is no longer available.',
        409
      );
    }
    if (String(source.part_id) !== materialRequirement.partId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Selected inventory source does not match the requirement part.',
        409
      );
    }
    if (String(source.station_id) !== input.stationId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Selected inventory source does not match the requested station.',
        409
      );
    }
    if (input.inventoryLocationId && String(source.bin_id) !== input.inventoryLocationId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Selected inventory source does not match the requested bin.',
        409
      );
    }
    if (String(source.condition) !== 'SERVICEABLE') {
      throw new DomainError('MATERIAL_UNSERVICEABLE', 'Part tidak berstatus serviceable.', 409);
    }
    if (number(source.on_hand_quantity) < input.quantity) {
      throw new DomainError(
        'INSUFFICIENT_AVAILABLE_QUANTITY',
        'Jumlah stok tersedia tidak mencukupi.',
        409
      );
    }
    if (source.expires_at && new Date(String(source.expires_at)) <= new Date()) {
      throw new DomainError('MATERIAL_SHELF_LIFE_EXPIRED', 'Masa simpan part telah berakhir.', 409);
    }
    if (
      Boolean(source.certificate_required) &&
      !Boolean(source.lot_certificate_verified) &&
      !input.certificateReference
    ) {
      throw new DomainError(
        'MATERIAL_CERTIFICATE_MISSING',
        'Dokumen traceability yang diperlukan belum tersedia.',
        409
      );
    }
  }

  private assertInstallSourceEligibility(reservation: MaintenanceInventoryReservationDto) {
    if (reservation.serializedPartId) {
      const row = this.sqlite
        .prepare(
          `SELECT serial.condition, serial.certificate_verified AS serial_certificate_verified,
                  serial.certificate_reference AS serial_certificate_reference,
                  lot.expires_at, lot.certificate_verified AS lot_certificate_verified,
                  part.certificate_required
           FROM inventory_serialized_parts serial
           JOIN inventory_parts part ON part.id = serial.part_id
           LEFT JOIN inventory_lots lot ON lot.id = serial.lot_id
           WHERE serial.id = ?`
        )
        .get(reservation.serializedPartId) as SqlRow | undefined;
      if (!row)
        throw new DomainError('SERIALIZED_PART_NOT_FOUND', 'Serialized part not found.', 404);
      if (String(row.condition) !== 'SERVICEABLE') {
        throw new DomainError('MATERIAL_UNSERVICEABLE', 'Part tidak berstatus serviceable.', 409);
      }
      if (row.expires_at && new Date(String(row.expires_at)) <= new Date()) {
        throw new DomainError(
          'MATERIAL_SHELF_LIFE_EXPIRED',
          'Masa simpan part telah berakhir.',
          409
        );
      }
      if (
        Boolean(row.certificate_required) &&
        !Boolean(row.serial_certificate_verified) &&
        !Boolean(row.lot_certificate_verified) &&
        !reservation.certificateReference
      ) {
        throw new DomainError(
          'MATERIAL_CERTIFICATE_MISSING',
          'Dokumen traceability yang diperlukan belum tersedia.',
          409
        );
      }
      return;
    }

    const source = this.requireReservationSource(reservation, false);
    if (String(source.stationId) !== reservation.stationId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Reservation source station does not match.',
        409
      );
    }
    if (source.expiresAt && new Date(String(source.expiresAt)) <= new Date()) {
      throw new DomainError('MATERIAL_SHELF_LIFE_EXPIRED', 'Masa simpan part telah berakhir.', 409);
    }
    if (source.certificateRequired && !source.certificateVerified) {
      throw new DomainError(
        'MATERIAL_CERTIFICATE_MISSING',
        'Dokumen traceability yang diperlukan belum tersedia.',
        409
      );
    }
  }

  private requireReservationSource(
    reservation: MaintenanceInventoryReservationDto,
    requireServiceableStock = true
  ) {
    const source = this.sqlite
      .prepare(
        `SELECT balance.id AS stock_balance_id, balance.bin_id, balance.lot_id,
	                balance.condition, balance.on_hand_quantity,
	                bin.warehouse_id, warehouse.station_id,
	                lot.expires_at, lot.certificate_reference AS lot_certificate_reference,
	                lot.certificate_verified AS lot_certificate_verified,
	                part.certificate_required,
	                serial.condition AS serial_condition,
	                serial.bin_id AS serial_bin_id,
	                serial.lot_id AS serial_lot_id,
	                serial.certificate_reference AS serial_certificate_reference,
	                serial.certificate_verified AS serial_certificate_verified
	         FROM inventory_stock_balances balance
	         JOIN inventory_bins bin ON bin.id = balance.bin_id
	         JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
	         JOIN inventory_parts part ON part.id = balance.part_id
	         LEFT JOIN inventory_lots lot ON lot.id = balance.lot_id
	         LEFT JOIN inventory_serialized_parts serial ON serial.id = ?
	         WHERE balance.part_id = ?
	           AND balance.condition = 'SERVICEABLE'
	           AND (? IS NULL OR balance.bin_id = ?)
	           AND (? IS NULL OR balance.id = ? OR ? = balance.part_id)
	           AND (? IS NULL OR balance.lot_key = ? OR lot.lot_number = ?)
	         ORDER BY CASE WHEN balance.id = ? THEN 0 ELSE 1 END, balance.on_hand_quantity DESC
	         LIMIT 1`
      )
      .get(
        reservation.serializedPartId,
        reservation.partId,
        reservation.inventoryLocationId,
        reservation.inventoryLocationId,
        reservation.inventoryItemId,
        reservation.inventoryItemId,
        reservation.inventoryItemId,
        reservation.lotNumber,
        reservation.lotNumber,
        reservation.lotNumber,
        reservation.inventoryItemId
      ) as SqlRow | undefined;

    if (!source) {
      const selected = this.sqlite
        .prepare(
          `SELECT condition FROM inventory_stock_balances
           WHERE id = ? AND part_id = ?`
        )
        .get(reservation.inventoryItemId, reservation.partId) as SqlRow | undefined;
      if (selected && String(selected.condition) !== 'SERVICEABLE') {
        throw new DomainError('MATERIAL_UNSERVICEABLE', 'Part tidak berstatus serviceable.', 409);
      }
      if (!requireServiceableStock && reservation.inventoryLocationId) {
        const bin = this.sqlite
          .prepare(
            `SELECT bin.id AS bin_id, bin.warehouse_id, warehouse.station_id
	             FROM inventory_bins bin
	             JOIN inventory_warehouses warehouse ON warehouse.id = bin.warehouse_id
	             WHERE bin.id = ?`
          )
          .get(reservation.inventoryLocationId) as SqlRow | undefined;
        if (bin) {
          return {
            stockBalanceId: null as string | null,
            binId: String(bin.bin_id),
            warehouseId: String(bin.warehouse_id),
            stationId: String(bin.station_id),
            lotId: null as string | null,
            expiresAt: null as string | null,
            certificateRequired: false,
            certificateVerified: true,
            onHandQuantity: 0,
            serialCondition: null as string | null
          };
        }
      }
      throw new DomainError(
        'MATERIAL_SOURCE_NOT_FOUND',
        'Reserved source stock is no longer available.',
        409
      );
    }

    return {
      stockBalanceId: String(source.stock_balance_id),
      binId: String(source.bin_id),
      warehouseId: String(source.warehouse_id),
      stationId: String(source.station_id),
      lotId: nullableText(source.lot_id),
      expiresAt: nullableText(source.expires_at),
      certificateRequired: Boolean(source.certificate_required),
      certificateVerified:
        Boolean(source.lot_certificate_verified) ||
        Boolean(source.serial_certificate_verified) ||
        Boolean(reservation.certificateReference),
      onHandQuantity: number(source.on_hand_quantity),
      serialCondition: nullableText(source.serial_condition),
      serialBinId: nullableText(source.serial_bin_id),
      serialLotId: nullableText(source.serial_lot_id)
    };
  }

  private assertReservableSourceEligibility(
    reservation: MaintenanceInventoryReservationDto,
    source: ReturnType<ResourceV21Service['requireReservationSource']>
  ) {
    if (String(source.stationId) !== reservation.stationId) {
      throw new DomainError(
        'INVALID_MATERIAL_LINK',
        'Reservation source station does not match.',
        409
      );
    }
    if (source.onHandQuantity < reservation.quantity) {
      throw new DomainError(
        'INSUFFICIENT_AVAILABLE_QUANTITY',
        'Jumlah stok tersedia tidak mencukupi.',
        409
      );
    }
    if (reservation.serializedPartId && source.serialCondition !== 'SERVICEABLE') {
      throw new DomainError('MATERIAL_UNSERVICEABLE', 'Part tidak berstatus serviceable.', 409);
    }
    if (source.expiresAt && new Date(String(source.expiresAt)) <= new Date()) {
      throw new DomainError('MATERIAL_SHELF_LIFE_EXPIRED', 'Masa simpan part telah berakhir.', 409);
    }
    if (source.certificateRequired && !source.certificateVerified) {
      throw new DomainError(
        'MATERIAL_CERTIFICATE_MISSING',
        'Dokumen traceability yang diperlukan belum tersedia.',
        409
      );
    }
  }

  private decrementIssuedStock(
    source: ReturnType<ResourceV21Service['requireReservationSource']>,
    quantity: number,
    serializedPartId: string | null
  ) {
    const updated = this.sqlite
      .prepare(
        `UPDATE inventory_stock_balances
	         SET on_hand_quantity = on_hand_quantity - ?, updated_at = ?
	         WHERE id = ? AND condition = 'SERVICEABLE' AND on_hand_quantity >= ?`
      )
      .run(quantity, now(), source.stockBalanceId, quantity);
    if (!updated.changes) {
      throw new DomainError(
        'INSUFFICIENT_AVAILABLE_QUANTITY',
        'Jumlah stok tersedia tidak mencukupi.',
        409
      );
    }
    if (serializedPartId) {
      this.sqlite
        .prepare(`UPDATE inventory_serialized_parts SET bin_id = NULL, updated_at = ? WHERE id = ?`)
        .run(now(), serializedPartId);
    }
  }

  private installedQuantityForReservation(reservationId: string): number {
    const row = this.sqlite
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) AS total
	         FROM maintenance_material_installations
	         WHERE reservation_id = ? AND status = 'INSTALLED'`
      )
      .get(reservationId) as SqlRow;
    return number(row.total);
  }

  private installIssuedSerializedPart(
    reservation: MaintenanceInventoryReservationDto,
    input: InstallMaterialInput,
    actor: AuditActor,
    installedAt: string,
    timestamp: string
  ): string {
    if (!input.position) {
      throw new DomainError('INSTALL_POSITION_REQUIRED', 'Installation position is required.', 422);
    }
    const existing = this.sqlite
      .prepare(
        `SELECT id FROM inventory_component_installations
	         WHERE serial_id = ? AND removed_at IS NULL`
      )
      .get(reservation.serializedPartId) as SqlRow | undefined;
    if (existing) {
      throw new DomainError(
        'MATERIAL_ALREADY_INSTALLED',
        'Serialized part is already installed.',
        409
      );
    }
    const serial = this.sqlite
      .prepare(`SELECT * FROM inventory_serialized_parts WHERE id = ?`)
      .get(reservation.serializedPartId) as SqlRow | undefined;
    if (!serial)
      throw new DomainError('SERIALIZED_PART_NOT_FOUND', 'Serialized part not found.', 404);
    if (String(serial.condition) !== 'SERVICEABLE') {
      throw new DomainError('MATERIAL_UNSERVICEABLE', 'Part tidak berstatus serviceable.', 409);
    }

    const movementId = `inv-move-mro-install-${nanoid(10)}`;
    const movementNumber = `MOV-MRO-${timestamp.slice(0, 10).replaceAll('-', '')}-${nanoid(5).toUpperCase()}`;
    this.sqlite
      .prepare(
        `INSERT INTO inventory_movements (
	          id, movement_number, movement_type, source_type, source_id, station_id,
	          aircraft_id, reason, status, total_base_value_idr, is_finalized, created_by_user_id, created_at
	        ) VALUES (?, ?, 'INSTALL', 'COMPONENT_INSTALLATION', ?, ?, ?, ?, 'POSTED', 0, 1, ?, ?)`
      )
      .run(
        movementId,
        movementNumber,
        reservation.serializedPartId,
        reservation.stationId,
        reservation.aircraftId,
        `Install reserved serial ${reservation.serialNumber ?? reservation.serializedPartId}.`,
        actor.userId,
        timestamp
      );

    const componentInstallationId = `inv-install-${nanoid(10)}`;
    this.sqlite
      .prepare(
        `INSERT INTO inventory_component_installations (
	          id, serial_id, aircraft_id, position, installed_at, removed_at,
	          hours_at_install, cycles_at_install, hours_at_remove, cycles_at_remove,
	          removal_reason, installed_by_user_id, removed_by_user_id
	        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, NULL)`
      )
      .run(
        componentInstallationId,
        reservation.serializedPartId,
        reservation.aircraftId,
        input.position,
        installedAt,
        input.hoursAtInstall ?? number(serial.hours_since_new),
        input.cyclesAtInstall ?? number(serial.cycles_since_new),
        actor.userId
      );

    this.sqlite
      .prepare(
        `UPDATE inventory_serialized_parts
	         SET condition = 'INSTALLED', aircraft_id = ?, position = ?, updated_at = ?
	         WHERE id = ?`
      )
      .run(reservation.aircraftId, input.position, timestamp, reservation.serializedPartId);
    return componentInstallationId;
  }

  private getMaterialInstallation(id: string): MaintenanceMaterialInstallationDto {
    const row = this.sqlite
      .prepare(`SELECT * FROM maintenance_material_installations WHERE id = ?`)
      .get(id) as SqlRow | undefined;
    if (!row)
      throw new DomainError(
        'MATERIAL_INSTALLATION_NOT_FOUND',
        'Material installation not found.',
        404
      );
    return this.toMaterialInstallationDto(row);
  }

  private listMaterialInstallations(
    workPackageId: string,
    materialRequirementId: string
  ): MaintenanceMaterialInstallationDto[] {
    const rows = this.sqlite
      .prepare(
        `SELECT * FROM maintenance_material_installations
	         WHERE work_package_id = ? AND material_requirement_id = ?
	         ORDER BY installed_at`
      )
      .all(workPackageId, materialRequirementId) as SqlRow[];
    return rows.map((row) => this.toMaterialInstallationDto(row));
  }

  private toMaterialInstallationDto(row: SqlRow): MaintenanceMaterialInstallationDto {
    return {
      id: String(row.id),
      installationNumber: String(row.installation_number),
      materialRequirementId: String(row.material_requirement_id),
      reservationId: String(row.reservation_id),
      issueId: nullableText(row.issue_id),
      inventoryComponentInstallationId: nullableText(row.inventory_component_installation_id),
      workPackageId: String(row.work_package_id),
      jobCardId: nullableText(row.job_card_id),
      aircraftId: String(row.aircraft_id),
      partId: String(row.part_id),
      serializedPartId: nullableText(row.serialized_part_id),
      sourceWarehouseId: nullableText(row.source_warehouse_id),
      sourceBinId: nullableText(row.source_bin_id),
      lotNumber: nullableText(row.lot_number),
      serialNumber: nullableText(row.serial_number),
      certificateReference: nullableText(row.certificate_reference),
      quantity: number(row.quantity),
      unit: String(row.unit),
      position: nullableText(row.position),
      status: String(row.status) as MaintenanceMaterialInstallationDto['status'],
      installedBy: String(row.installed_by),
      installedAt: String(row.installed_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private audit(
    entityType: string,
    entityId: string,
    action: string,
    actor: AuditActor,
    metadata: Record<string, unknown>
  ) {
    const timestamp = now();
    const id = `maudit-${nanoid(12)}`;

    this.sqlite
      .prepare(
        `INSERT INTO maintenance_audit_logs (
	          id, entity_type, entity_id, action, actor_user_id, actor_role,
	          request_id, before_version, after_version, metadata_json, occurred_at
	        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        entityType,
        entityId,
        action,
        actor.userId,
        actor.role,
        actor.requestId ?? null,
        null,
        null,
        JSON.stringify(metadata),
        timestamp
      );
  }
}
