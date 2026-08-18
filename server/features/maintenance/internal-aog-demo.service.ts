import type Database from 'better-sqlite3';
import type {
  InternalAogDemoDto,
  InternalAogDemoPhase,
  InternalAogDemoTimelineEventDto
} from '../../../shared/features/maintenance';
import type { DemoRole } from '../../../shared/types/roles';
import type { MaintenanceService } from './service';

type SqlRow = Record<string, unknown>;

const workPackageId = 'mroaog-work-package';
const jobCardId = 'mroaog-job-card';
const materialRequirementId = 'mroaog-material-requirement';

const phaseProgress: Record<
  InternalAogDemoPhase,
  {
    step: number;
    role: DemoRole | null;
    label: string | null;
    focus: string | null;
  }
> = {
  MATERIAL_REQUIRED: {
    step: 1,
    role: 'Inventory Controller',
    label: 'Reservasi material',
    focus: `/inventory/maintenance-demand?requirement=${materialRequirementId}`
  },
  MATERIAL_RESERVED: {
    step: 2,
    role: 'Inventory Controller',
    label: 'Issue material ke Work Package',
    focus: `/inventory/maintenance-demand?requirement=${materialRequirementId}`
  },
  READY_FOR_EXECUTION: {
    step: 3,
    role: 'Maintenance Technician',
    label: 'Mulai pekerjaan',
    focus: `/maintenance/work-packages/${workPackageId}?focus=execution`
  },
  WORK_IN_PROGRESS: {
    step: 4,
    role: 'Maintenance Technician',
    label: 'Catat bukti dan sign pekerjaan',
    focus: `/maintenance/work-packages/${workPackageId}?focus=execution`
  },
  INSPECTION_REQUIRED: {
    step: 5,
    role: 'Certifying Staff',
    label: 'Lakukan pemeriksaan independen',
    focus: `/maintenance/work-packages/${workPackageId}?focus=inspection`
  },
  RELEASE_REVIEW_REQUIRED: {
    step: 6,
    role: 'Maintenance Manager',
    label: 'Minta review rilis',
    focus: `/maintenance/work-packages/${workPackageId}?focus=release`
  },
  READY_FOR_RELEASE: {
    step: 7,
    role: 'Certifying Staff',
    label: 'Terbitkan rilis teknis simulasi',
    focus: `/maintenance/work-packages/${workPackageId}?focus=release`
  },
  RELEASED: { step: 8, role: null, label: null, focus: null }
};

function number(value: unknown) {
  return Number(value ?? 0);
}

export class InternalAogDemoService {
  constructor(
    private readonly sqlite: Database.Database,
    private readonly maintenance: MaintenanceService
  ) {}

  snapshot(): InternalAogDemoDto {
    const workPackage = this.maintenance.getWorkPackage(workPackageId);
    const jobCard = workPackage.jobCards.find((card) => card.id === jobCardId);
    if (!jobCard) throw new Error(`Internal AOG job card ${jobCardId} is missing.`);

    const material = this.sqlite
      .prepare(
        `SELECT requirement.id, requirement.status, requirement.required_quantity,
                part.part_number, part.part_name,
                COALESCE(SUM(CASE
                  WHEN reservation.status IN ('ACTIVE', 'PARTIALLY_ISSUED', 'ISSUED')
                  THEN reservation.quantity ELSE 0 END), 0) AS reserved_quantity,
                COALESCE(SUM(reservation.issued_quantity), 0) AS issued_quantity,
                MAX(CASE WHEN reservation.status IN ('ACTIVE', 'PARTIALLY_ISSUED') THEN 1 ELSE 0 END)
                  AS has_active_reservation
         FROM maintenance_work_package_material_requirements requirement
         JOIN inventory_parts part ON part.id = requirement.part_id
         LEFT JOIN maintenance_inventory_reservations reservation
           ON reservation.material_requirement_id = requirement.id
         WHERE requirement.id = ?
         GROUP BY requirement.id`
      )
      .get(materialRequirementId) as SqlRow | undefined;
    if (!material)
      throw new Error(`Internal AOG material requirement ${materialRequirementId} is missing.`);

    const phase = this.phase(
      workPackage.status,
      jobCard.status,
      String(material.status),
      Boolean(number(material.has_active_reservation))
    );
    const progress = phaseProgress[phase];

    return {
      scenarioId: 'INTERNAL_AOG_MATERIAL',
      title: 'Internal AOG · Material Blocker',
      phase,
      currentStep: progress.step,
      totalSteps: 8,
      nextRole: progress.role,
      nextAction:
        progress.label && progress.focus ? { label: progress.label, href: progress.focus } : null,
      aircraft: {
        id: workPackage.aircraftId,
        registrationNumber: workPackage.aircraftRegistrationNumber,
        aog: workPackage.priority === 'AOG' && workPackage.status !== 'RELEASED'
      },
      workPackage: {
        id: workPackage.id,
        packageNumber: workPackage.packageNumber,
        status: workPackage.status,
        version: workPackage.version
      },
      jobCard: {
        id: jobCard.id,
        cardNumber: jobCard.cardNumber,
        status: jobCard.status,
        version: jobCard.version
      },
      materialRequirement: {
        id: String(material.id),
        status: String(material.status),
        partNumber: String(material.part_number),
        partName: String(material.part_name),
        requiredQuantity: number(material.required_quantity),
        reservedQuantity: number(material.reserved_quantity),
        issuedQuantity: number(material.issued_quantity)
      },
      readiness: this.maintenance.getReadinessPanel(workPackageId),
      blocker: this.blocker(phase),
      timeline: this.timeline()
    };
  }

  private phase(
    workPackageStatus: string,
    jobCardStatus: string,
    materialStatus: string,
    hasActiveReservation: boolean
  ): InternalAogDemoPhase {
    if (workPackageStatus === 'RELEASED') return 'RELEASED';
    if (workPackageStatus === 'READY_FOR_RELEASE') return 'READY_FOR_RELEASE';
    if (jobCardStatus === 'READY_FOR_RELEASE_REVIEW') return 'RELEASE_REVIEW_REQUIRED';
    if (jobCardStatus === 'INSPECTION_REQUIRED') return 'INSPECTION_REQUIRED';
    if (jobCardStatus === 'IN_PROGRESS') return 'WORK_IN_PROGRESS';
    if (materialStatus === 'ISSUED') return 'READY_FOR_EXECUTION';
    if (hasActiveReservation) return 'MATERIAL_RESERVED';
    return 'MATERIAL_REQUIRED';
  }

  private blocker(phase: InternalAogDemoPhase): InternalAogDemoDto['blocker'] {
    if (phase === 'MATERIAL_REQUIRED') {
      return {
        reason: 'Material wajib belum direservasi.',
        owner: 'Inventory Controller',
        impact: 'Pekerjaan dan rilis teknis tetap terblokir.'
      };
    }
    if (phase === 'MATERIAL_RESERVED') {
      return {
        reason: 'Material sudah direservasi tetapi belum diterbitkan ke Work Package.',
        owner: 'Inventory Controller',
        impact: 'Gate material belum siap dan rilis teknis tetap terblokir.'
      };
    }
    return null;
  }

  private timeline(): InternalAogDemoTimelineEventDto[] {
    const auditRows = this.sqlite
      .prepare(
        `SELECT id, action, actor_role, occurred_at
         FROM maintenance_audit_logs
         WHERE entity_id IN (?, ?, 'mroaog-defect')
            OR json_extract(metadata_json, '$.workPackageId') = ?`
      )
      .all(workPackageId, jobCardId, workPackageId) as SqlRow[];
    const auditTitles: Record<string, string> = {
      DEFECT_REPORTED: 'Defect AOG dicatat',
      WORK_PACKAGE_CREATED: 'Work Package dibuat',
      READINESS_EVALUATED: 'Kesiapan awal dievaluasi',
      STARTED: 'Pekerjaan dimulai',
      WORK_SIGNED: 'Pekerjaan ditandatangani',
      INSPECTED: 'Pemeriksaan independen dicatat',
      RELEASE_REQUESTED: 'Review rilis diminta',
      RELEASED: 'Rilis teknis simulasi diterbitkan'
    };
    const events: InternalAogDemoTimelineEventDto[] = auditRows.map((row) => ({
      id: String(row.id),
      occurredAt: String(row.occurred_at),
      domain: 'MRO',
      title: auditTitles[String(row.action)] ?? String(row.action).replaceAll('_', ' '),
      detail: `Aktivitas ${String(row.action).replaceAll('_', ' ').toLowerCase()}.`,
      actorRole: row.actor_role ? String(row.actor_role) : null
    }));

    const reservationRows = this.sqlite
      .prepare(
        `SELECT event.id, event.event_type, event.quantity, event.actor_role, event.occurred_at,
                reservation.reservation_number
         FROM maintenance_reservation_events event
         JOIN maintenance_inventory_reservations reservation ON reservation.id = event.reservation_id
         WHERE reservation.work_package_id = ?`
      )
      .all(workPackageId) as SqlRow[];
    for (const row of reservationRows) {
      const issued = String(row.event_type) === 'ISSUED';
      events.push({
        id: String(row.id),
        occurredAt: String(row.occurred_at),
        domain: 'INVENTORY',
        title: issued ? 'Material diterbitkan ke Work Package' : 'Material direservasi',
        detail: `${number(row.quantity)} EA · ${String(row.reservation_number)}`,
        actorRole: row.actor_role ? String(row.actor_role) : null
      });
    }

    return events.sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)
    );
  }
}
