import { ApiClientError } from './useApiEnvelope';

export type MaintenanceErrorPresentation = {
  code: string;
  title: string;
  impact: string;
  requiredAction: string;
  referenceId: string | null;
  requestId: string | null;
};

function label(value: string | null | undefined) {
  if (!value) return '-';
  if (value === 'LEGACY_NEXT_MAINTENANCE') return 'Next maintenance due';
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replaceAll(/\b[a-z]/gu, (letter) => letter.toUpperCase());
}

function errorDetails(error: ApiClientError) {
  return error.details && typeof error.details === 'object' && !Array.isArray(error.details)
    ? (error.details as Record<string, unknown>)
    : {};
}

export function useMaintenanceUi() {
  const companyAuthorizationTitles: Record<string, string> = {
    COMPANY_AUTHORIZATION_REQUIRED: 'PT AMA authorization required',
    COMPANY_AUTHORIZATION_INACTIVE: 'PT AMA authorization inactive',
    COMPANY_AUTHORIZATION_EXPIRED: 'PT AMA authorization expired',
    COMPANY_AUTHORIZATION_ACTION_NOT_PERMITTED: 'Action not authorized by PT AMA',
    COMPANY_AUTHORIZATION_AIRCRAFT_SCOPE_MISMATCH: 'Aircraft scope not authorized',
    COMPANY_AUTHORIZATION_LICENCE_MISMATCH: 'Selected licence is not eligible'
  };

  function workPackageStatusColor(status: string | null | undefined) {
    if (status === 'RELEASED') return 'success';
    if (status === 'READY_FOR_RELEASE') return 'warning';
    if (status === 'CANCELLED') return 'error';
    if (status === 'IN_PROGRESS') return 'info';
    return 'secondary';
  }

  function jobCardStatusColor(status: string | null | undefined) {
    if (status === 'READY_FOR_RELEASE_REVIEW') return 'success';
    if (status === 'INSPECTION_REQUIRED') return 'warning';
    if (status === 'REJECTED_FOR_REWORK' || status === 'CANCELLED') return 'error';
    if (status === 'IN_PROGRESS') return 'info';
    return 'secondary';
  }

  function technicalStateColor(status: string | null | undefined) {
    if (status === 'SERVICEABLE') return 'success';
    if (status === 'SERVICEABLE_WITH_RESTRICTIONS' || status === 'RESTRICTED') return 'warning';
    if (status === 'UNSERVICEABLE' || status === 'BLOCKED') return 'error';
    return 'secondary';
  }

  function permissionHint(allowed: boolean, permission: string, role: string) {
    const labels: Record<string, string> = {
      'maintenance.release.issue': 'issue technical releases',
      'maintenance.package.plan': 'create work packages',
      'maintenance.jobcard.manage': 'manage job cards',
      'maintenance.jobcard.work.sign': 'sign mechanic work',
      'maintenance.jobcard.inspect': 'perform independent inspection'
    };
    return allowed
      ? 'Action available for this role.'
      : `${role} cannot ${labels[permission] ?? 'perform this action'}.`;
  }

  function presentError(errorValue: unknown): MaintenanceErrorPresentation {
    if (errorValue instanceof ApiClientError) {
      const details = errorDetails(errorValue);
      return {
        code: errorValue.code,
        title: companyAuthorizationTitles[errorValue.code] ?? errorValue.message,
        impact:
          typeof details.impact === 'string' ? details.impact : 'The command was not applied.',
        requiredAction:
          typeof details.requiredAction === 'string'
            ? details.requiredAction
            : 'Refresh the record, resolve blockers, and retry.',
        referenceId:
          typeof details.referenceId === 'string'
            ? details.referenceId
            : typeof details.correlationId === 'string'
              ? details.correlationId
              : null,
        requestId: errorValue.requestId ?? null
      };
    }
    return {
      code: 'CLIENT_ACTION_FAILED',
      title: errorValue instanceof Error ? errorValue.message : 'Maintenance action failed.',
      impact: 'The UI could not confirm that the command was applied.',
      requiredAction: 'Refresh the page and verify the backend state before retrying.',
      referenceId: null,
      requestId: null
    };
  }

  return {
    jobCardStatusColor,
    label,
    permissionHint,
    presentError,
    technicalStateColor,
    workPackageStatusColor
  };
}
