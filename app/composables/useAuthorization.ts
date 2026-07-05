import type { AuthorizationContext } from '#shared/types/authz';
import type { Flight, FlightStatus } from '#shared/types/ops-demo';
import { authorizeOperation, canTransitionFlight } from '#operations/policies';

export function useAuthorization() {
  const store = useAmaDemoStore();

  function can(permissionId: string, context: AuthorizationContext = {}) {
    return authorizeOperation(store.data.value, store.currentUserId.value, permissionId, context);
  }

  function explain(permissionId: string, context: AuthorizationContext = {}) {
    return can(permissionId, context).message;
  }

  function visibleModules() {
    const userRoles = store.currentRoles.value;
    const permissionIds = new Set(userRoles.flatMap((role) => role.permissionIds));

    return store.data.value.moduleCatalog
      .filter((module) =>
        store.data.value.tenantModules.some(
          (tenantModule) => tenantModule.moduleKey === module.key && tenantModule.status === 'ACTIVE'
        )
      )
      .filter((module) =>
        store.data.value.permissionCatalog.some(
          (permission) => permission.moduleKey === module.key && permissionIds.has(permission.id)
        )
      );
  }

  function canAccessRecord(entityType: string, record: unknown) {
    if (entityType === 'flightRequest') {
      return can('flight_request.read', { flightRequest: record as AuthorizationContext['flightRequest'] });
    }
    if (entityType === 'flight') {
      return can('flight.read', { flight: record as AuthorizationContext['flight'] });
    }
    return can('platform.dashboard.view');
  }

  function canTransition(flight: Flight, nextStatus: FlightStatus) {
    const workflowAllowed = canTransitionFlight(store.data.value, flight, nextStatus);
    if (!workflowAllowed) {
      return {
        allowed: false,
        message: 'Status flight tidak dapat melompati tahapan operasi.',
        reason: 'INVALID_TRANSITION' as const
      };
    }
    return can('flight.following.update', { flight, nextStatus });
  }

  return {
    can,
    canAccessRecord,
    canTransitionFlight: canTransition,
    explain,
    visibleModules
  };
}
