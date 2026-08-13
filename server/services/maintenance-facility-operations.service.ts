import type Database from 'better-sqlite3';
import type {
  MaintenanceAircraftCustodyDto,
  MaintenanceEligibilityBlockerDto,
  MaintenanceOperationalAvailabilityDto,
  MaintenanceSlotDto
} from '../../shared/features/maintenance';
import { getApplicationNow } from '../utils/time';

type SqlRow = Record<string, string | number | bigint | Buffer | null>;

function nullableText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function custodySelectSql() {
  return `SELECT custody.*, wp.package_number,
                 aircraft.registration_number AS aircraft_registration_number,
                 facility.name AS facility_name,
                 area.name AS area_name,
                 bay.code AS bay_code
          FROM maintenance_aircraft_custodies custody
          JOIN maintenance_work_packages wp ON wp.id = custody.work_package_id
          JOIN aircraft ON aircraft.id = custody.aircraft_id
          JOIN maintenance_facilities facility ON facility.id = custody.facility_id
          JOIN maintenance_facility_areas area ON area.id = custody.area_id
          JOIN maintenance_facility_bays bay ON bay.id = custody.bay_id`;
}

function slotSelectSql() {
  return `SELECT slot.*, wp.package_number, aircraft.registration_number AS aircraft_registration_number,
                 station.station_code, station.station_name,
                 COALESCE(NULLIF(facility.timezone, ''), station.timezone) AS station_timezone,
                 facility.code AS facility_code, facility.name AS facility_name,
                 area.code AS area_code, area.name AS area_name, area.area_type,
                 bay.code AS bay_code, bay.name AS bay_name
          FROM maintenance_slots slot
          JOIN maintenance_work_packages wp ON wp.id = slot.work_package_id
          JOIN aircraft ON aircraft.id = slot.aircraft_id
          JOIN stations station ON station.id = slot.station_id
          JOIN maintenance_facilities facility ON facility.id = slot.facility_id
          JOIN maintenance_facility_areas area ON area.id = slot.area_id
          JOIN maintenance_facility_bays bay ON bay.id = slot.bay_id`;
}

export function toMaintenanceAircraftCustodyDto(row: SqlRow): MaintenanceAircraftCustodyDto {
  return {
    id: String(row.id),
    slotId: String(row.slot_id),
    workPackageId: String(row.work_package_id),
    packageNumber: String(row.package_number),
    aircraftId: String(row.aircraft_id),
    aircraftRegistrationNumber: String(row.aircraft_registration_number),
    facilityId: String(row.facility_id),
    facilityName: String(row.facility_name),
    areaId: String(row.area_id),
    areaName: String(row.area_name),
    bayId: String(row.bay_id),
    bayCode: String(row.bay_code),
    status: String(row.status) as MaintenanceAircraftCustodyDto['status'],
    actualStartAt: nullableText(row.actual_start_at),
    inBayAt: nullableText(row.in_bay_at),
    readyForMoveOutAt: nullableText(row.ready_for_move_out_at),
    movingOutAt: nullableText(row.moving_out_at),
    handedBackAt: nullableText(row.handed_back_at),
    note: nullableText(row.note),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function toMaintenanceSlotDtoFromRow(row: SqlRow): MaintenanceSlotDto {
  return {
    id: String(row.id),
    workPackageId: String(row.work_package_id),
    packageNumber: String(row.package_number),
    aircraftId: String(row.aircraft_id),
    aircraftRegistrationNumber: String(row.aircraft_registration_number),
    stationId: String(row.station_id),
    stationCode: String(row.station_code),
    stationName: String(row.station_name),
    stationTimezone: String(row.station_timezone),
    facilityId: String(row.facility_id),
    facilityCode: String(row.facility_code),
    facilityName: String(row.facility_name),
    areaId: String(row.area_id),
    areaCode: String(row.area_code),
    areaName: String(row.area_name),
    areaType: String(row.area_type) as MaintenanceSlotDto['areaType'],
    bayId: String(row.bay_id),
    bayCode: String(row.bay_code),
    bayName: String(row.bay_name),
    plannedStartAt: String(row.planned_start_at),
    plannedEndAt: String(row.planned_end_at),
    actualStartAt: nullableText(row.actual_start_at),
    actualEndAt: nullableText(row.actual_end_at),
    status: String(row.status) as MaintenanceSlotDto['status'],
    createdByUserId: String(row.created_by_user_id),
    createdAt: String(row.created_at),
    updatedByUserId: nullableText(row.updated_by_user_id),
    updatedAt: String(row.updated_at),
    cancelledByUserId: nullableText(row.cancelled_by_user_id),
    cancelledAt: nullableText(row.cancelled_at),
    cancellationReason: nullableText(row.cancellation_reason)
  };
}

export function evaluateMaintenanceOperationalAvailability(
  sqlite: Database.Database,
  aircraftId: string,
  options: { at?: string } = {}
): MaintenanceOperationalAvailabilityDto {
  const evaluatedAt = options.at ?? getApplicationNow();
  try {
    const currentCustody = sqlite
      .prepare(
        `${custodySelectSql()} WHERE custody.aircraft_id = ?
        AND custody.status IN ('MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING')
        ORDER BY custody.updated_at DESC
        LIMIT 1`
      )
      .get(aircraftId) as SqlRow | undefined;

    if (currentCustody) {
      const custody = toMaintenanceAircraftCustodyDto(currentCustody);
      const handbackPending = ['READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING'].includes(
        custody.status
      );
      const blocker: MaintenanceEligibilityBlockerDto = {
        code: handbackPending ? 'MAINTENANCE_HANDBACK_PENDING' : 'AIRCRAFT_IN_MAINTENANCE_FACILITY',
        category: 'AIRCRAFT_CONFIGURATION',
        severity: 'BLOCKING',
        title: handbackPending ? 'Maintenance handback pending' : 'Aircraft in maintenance custody',
        message: handbackPending
          ? 'Aircraft has technical release/move-out progress but maintenance custody has not been handed back to Operations.'
          : 'Aircraft is physically under Maintenance facility custody.',
        sourceType: 'MAINTENANCE_CUSTODY',
        sourceId: custody.id,
        nextAction:
          'Complete move-out and handback to Operations before Flight can use the aircraft.'
      };
      return {
        aircraftId,
        status: handbackPending ? 'HANDBACK_PENDING' : 'IN_MAINTENANCE_FACILITY',
        available: false,
        evaluatedAt,
        blockers: [blocker],
        warnings: [],
        currentCustody: custody,
        plannedSlot: null
      };
    }

    const planned = sqlite
      .prepare(
        `${slotSelectSql()} WHERE slot.aircraft_id = ?
        AND slot.status = 'BOOKED'
        AND slot.planned_end_at >= ?
        ORDER BY slot.planned_start_at ASC
        LIMIT 1`
      )
      .get(aircraftId, evaluatedAt) as SqlRow | undefined;

    if (planned) {
      const slot = toMaintenanceSlotDtoFromRow(planned);
      return {
        aircraftId,
        status: 'PLANNED_MAINTENANCE',
        available: true,
        evaluatedAt,
        blockers: [],
        warnings: [
          {
            code: 'FUTURE_MAINTENANCE_SLOT',
            category: 'AIRCRAFT_CONFIGURATION',
            severity: 'WARNING',
            title: 'Future maintenance slot',
            message:
              'Aircraft has a planned maintenance slot. Booking alone does not mean aircraft is in bay.',
            sourceType: 'MAINTENANCE_SLOT',
            sourceId: slot.id,
            nextAction: 'Review planned maintenance timing during operations planning.'
          }
        ],
        currentCustody: null,
        plannedSlot: slot
      };
    }

    return {
      aircraftId,
      status: 'AVAILABLE',
      available: true,
      evaluatedAt,
      blockers: [],
      warnings: [],
      currentCustody: null,
      plannedSlot: null
    };
  } catch {
    return {
      aircraftId,
      status: 'UNKNOWN',
      available: false,
      evaluatedAt,
      blockers: [
        {
          code: 'MAINTENANCE_OPERATIONAL_STATUS_UNKNOWN',
          category: 'AIRCRAFT_CONFIGURATION',
          severity: 'BLOCKING',
          title: 'Maintenance operational availability unknown',
          message: 'Aircraft maintenance custody status could not be verified.',
          sourceType: 'AIRCRAFT',
          sourceId: aircraftId,
          nextAction: 'Refresh maintenance facility operations and verify aircraft custody records.'
        }
      ],
      warnings: [],
      currentCustody: null,
      plannedSlot: null
    };
  }
}
