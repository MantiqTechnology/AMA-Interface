import type { AuthorizationContext, AuthorizationResult } from '#shared/types/authz';
import type {
  AppUser,
  DemoDatabase,
  Flight,
  FlightRequest,
  FlightStatus,
  PermissionCatalogItem,
  Role,
  Route
} from '#shared/types/ops-demo';
import { readinessHasBlocker } from './readiness';

type PolicyData = Pick<
  DemoDatabase,
  | 'appUsers'
  | 'roles'
  | 'routes'
  | 'tenantModules'
  | 'permissionCatalog'
  | 'accessControl'
  | 'stations'
>;

export function allow(message = 'Aksi diizinkan.'): AuthorizationResult {
  return { allowed: true, message };
}

export function deny(
  reason: NonNullable<AuthorizationResult['reason']>,
  message: string,
  policyId?: string,
  missingRequirements?: string[]
): AuthorizationResult {
  return { allowed: false, reason, message, policyId, missingRequirements };
}

function byId<T extends { id: string }>(items: T[], id: string | undefined) {
  return id ? items.find((item) => item.id === id) : undefined;
}

function getUserRoles(data: PolicyData, user: AppUser) {
  return user.roleIds.map((roleId) => byId(data.roles, roleId)).filter((role): role is Role => Boolean(role));
}

function getPermission(data: PolicyData, permissionId: string) {
  return data.permissionCatalog.find((permission) => permission.id === permissionId);
}

function isModuleActive(data: PolicyData, moduleKey: string) {
  return data.tenantModules.some(
    (module) => module.moduleKey === moduleKey && module.status === 'ACTIVE'
  );
}

function hasPermission(roles: Role[], permissionId: string) {
  return roles.some((role) => role.permissionIds.includes(permissionId));
}

function hasAllStationScope(roles: Role[]) {
  return roles.some((role) => role.scopeDefault === 'ALL_STATIONS');
}

function routeTouchesUserScope(user: AppUser, roles: Role[], route?: Route) {
  if (!route) return false;
  if (hasAllStationScope(roles)) return true;
  return [route.originStationId, route.destinationStationId].some((stationId) =>
    user.stationScopeIds.includes(stationId)
  );
}

function flightRoute(data: PolicyData, flight?: Flight) {
  return flight ? data.routes.find((route) => route.id === flight.routeId) : undefined;
}

function requestRoute(data: PolicyData, request?: FlightRequest) {
  return request ? data.routes.find((route) => route.id === request.routeId) : undefined;
}

function stationInScope(user: AppUser, roles: Role[], stationId?: string) {
  if (!stationId) return false;
  return hasAllStationScope(roles) || user.stationScopeIds.includes(stationId);
}

function routeDestinationInScope(user: AppUser, roles: Role[], route?: Route) {
  return stationInScope(user, roles, route?.destinationStationId);
}

function editableRequestStatuses(status: FlightRequest['status']) {
  return ['DRAFT', 'SUBMITTED', 'PLANNING', 'BLOCKED'].includes(status);
}

function validFlightTransition(data: PolicyData, flight: Flight, nextStatus?: FlightStatus) {
  if (!nextStatus) return false;
  return data.accessControl.flightTransitionMatrix[flight.status]?.includes(nextStatus) ?? false;
}

function gateRecordScope(
  data: PolicyData,
  user: AppUser,
  roles: Role[],
  permission: PermissionCatalogItem,
  context: AuthorizationContext
) {
  if (permission.id === 'handling.confirm') {
    const stationId = context.stationId ?? context.handling?.stationId;
    if (!stationInScope(user, roles, stationId)) {
      return deny(
        'OUTSIDE_STATION_SCOPE',
        'Anda hanya dapat mengonfirmasi handling di station dalam scope Anda.',
        'POL-004'
      );
    }
  }

  if (permission.resource.startsWith('flight_request')) {
    const route = context.route ?? requestRoute(data, context.flightRequest);
    if (!routeTouchesUserScope(user, roles, route)) {
      return deny(
        'OUTSIDE_STATION_SCOPE',
        'Flight Request berada di luar scope station persona aktif.',
        'POL-004'
      );
    }
  }

  if (permission.id === 'flight_request.approve' || permission.id === 'dispatch.release') {
    if (!hasAllStationScope(roles)) {
      return deny(
        'OUTSIDE_STATION_SCOPE',
        'Dispatch approval membutuhkan role dengan all-station scope.',
        'POL-DISPATCH-SCOPE'
      );
    }
  }

  if (permission.resource.startsWith('flight')) {
    const route = context.route ?? flightRoute(data, context.flight);
    if (permission.id === 'flight.closure.create') {
      if (!routeDestinationInScope(user, roles, route)) {
        return deny(
          'OUTSIDE_STATION_SCOPE',
          'Flight closure hanya tersedia untuk destination station atau all-station scope.',
          'POL-004'
        );
      }
    } else if (!routeTouchesUserScope(user, roles, route)) {
      return deny(
        'OUTSIDE_STATION_SCOPE',
        'Flight berada di luar scope station persona aktif.',
        'POL-004'
      );
    }
  }

  return allow();
}

function gateContextualPolicy(
  data: PolicyData,
  user: AppUser,
  permissionId: string,
  context: AuthorizationContext
) {
  const request = context.flightRequest;
  const flight = context.flight;

  if (
    ['flight_request.update', 'flight_request.assign_aircraft', 'flight_request.assign_crew'].includes(
      permissionId
    ) &&
    request &&
    !editableRequestStatuses(request.status)
  ) {
    return deny(
      'INVALID_WORKFLOW_STATE',
      'Request sudah terkunci dan tidak bisa diedit.',
      'POL-FR-EDITABLE'
    );
  }

  if (permissionId === 'flight_request.submit') {
    if (!request?.assignedAircraftId || !request.assignedCrewIds.length || !request.routeId) {
      return deny(
        'MISSING_REQUIRED_DATA',
        'Aircraft, crew, route, dan planned departure wajib lengkap sebelum submit.',
        'POL-FR-SUBMIT'
      );
    }
  }

  if (permissionId === 'readiness.run' && request) {
    if (!request.assignedAircraftId || !request.assignedCrewIds.length || !request.routeId) {
      return deny(
        'MISSING_REQUIRED_DATA',
        'Readiness membutuhkan route, aircraft, dan crew assignment.',
        'POL-RDC-RUN'
      );
    }
  }

  if (permissionId === 'flight_request.approve' || permissionId === 'dispatch.release') {
    if (!request) {
      return deny('MISSING_REQUIRED_DATA', 'Flight Request tidak ditemukan.', 'POL-DISPATCH-APPROVE');
    }

    if (request.status !== 'READY_FOR_APPROVAL') {
      return deny(
        'INVALID_WORKFLOW_STATE',
        'Approval hanya tersedia untuk request READY_FOR_APPROVAL.',
        'POL-DISPATCH-APPROVE'
      );
    }

    if (request.createdByUserId === user.id) {
      return deny(
        'SELF_APPROVAL_FORBIDDEN',
        'Tidak dapat approve request yang Anda buat sendiri.',
        'POL-001'
      );
    }

    if (readinessHasBlocker(context.readiness)) {
      return deny(
        'READINESS_BLOCKER',
        'Dispatch terkunci karena masih ada readiness blocker.',
        'POL-002'
      );
    }
  }

  if (permissionId === 'flight_request.reject' && !context.note?.trim()) {
    return deny('MISSING_REQUIRED_DATA', 'Alasan rejection wajib diisi.', 'POL-005');
  }

  if ((permissionId === 'flight.status.update' || permissionId === 'flight.following.update') && flight) {
    if (!validFlightTransition(data, flight, context.nextStatus)) {
      return deny(
        'INVALID_TRANSITION',
        'Status flight tidak dapat melompati tahapan operasi.',
        'POL-003'
      );
    }
  }

  if (permissionId === 'flight.closure.create') {
    if (!flight || flight.status !== 'LANDED') {
      return deny(
        'INVALID_WORKFLOW_STATE',
        'Flight hanya bisa ditutup setelah status LANDED.',
        'POL-FLIGHT-CLOSE'
      );
    }

    if (!flight.actualArrivalAt) {
      return deny(
        'MISSING_REQUIRED_DATA',
        'Actual arrival wajib ada sebelum flight closure.',
        'POL-FLIGHT-CLOSE'
      );
    }

    if (!context.note?.trim()) {
      return deny('MISSING_REQUIRED_DATA', 'Closure note wajib diisi.', 'POL-005');
    }
  }

  if (
    ['finance_handoff.review', 'maintenance_handoff.review'].includes(permissionId) &&
    flight?.status !== 'CLOSED'
  ) {
    return deny(
      'INVALID_WORKFLOW_STATE',
      'Handoff Finance/Maintenance baru tersedia setelah flight CLOSED.',
      'POL-HANDOFF-CLOSED'
    );
  }

  return allow();
}

export function authorizeOperation(
  data: PolicyData,
  userId: string,
  permissionId: string,
  context: AuthorizationContext = {}
): AuthorizationResult {
  const user = context.user ?? byId(data.appUsers, userId);
  if (!user || user.status !== 'ACTIVE') {
    return deny('INACTIVE_USER', 'Persona demo tidak aktif atau tidak ditemukan.');
  }

  const permission = getPermission(data, permissionId);
  if (!permission) {
    return deny('MISSING_PERMISSION', `Permission ${permissionId} belum terdaftar.`);
  }

  if (!isModuleActive(data, permission.moduleKey)) {
    return deny('MODULE_DISABLED', `Module ${permission.moduleKey} belum aktif.`);
  }

  const roles = getUserRoles(data, user);
  if (!hasPermission(roles, permissionId)) {
    return deny(
      'MISSING_PERMISSION',
      `${user.demoPersona} tidak memiliki permission ${permissionId}.`
    );
  }

  const scopeDecision = gateRecordScope(data, user, roles, permission, context);
  if (!scopeDecision.allowed) return scopeDecision;

  const policyDecision = gateContextualPolicy(data, user, permissionId, context);
  if (!policyDecision.allowed) return policyDecision;

  return allow('Aksi diizinkan untuk persona aktif.');
}

export function canTransitionFlight(data: PolicyData, flight: Flight, nextStatus: FlightStatus) {
  return data.accessControl.flightTransitionMatrix[flight.status]?.includes(nextStatus) ?? false;
}
