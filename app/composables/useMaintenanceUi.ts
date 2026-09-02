import { ApiClientError } from './useApiEnvelope';

export type MaintenanceErrorPresentation = {
  code: string;
  title: string;
  impact: string;
  requiredAction: string;
  referenceId: string | null;
  requestId: string | null;
};

function fallbackLabel(value: string | null | undefined) {
  if (!value) return '-';
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
  const { t } = useI18n();

  const companyAuthorizationTitleKeys: Record<string, string> = {
    COMPANY_AUTHORIZATION_REQUIRED: 'maintenance.errors.companyAuthorizationRequired',
    COMPANY_AUTHORIZATION_INACTIVE: 'maintenance.errors.companyAuthorizationInactive',
    COMPANY_AUTHORIZATION_EXPIRED: 'maintenance.errors.companyAuthorizationExpired',
    COMPANY_AUTHORIZATION_ACTION_NOT_PERMITTED:
      'maintenance.errors.companyAuthorizationActionNotPermitted',
    COMPANY_AUTHORIZATION_AIRCRAFT_SCOPE_MISMATCH:
      'maintenance.errors.companyAuthorizationAircraftScopeMismatch',
    COMPANY_AUTHORIZATION_LICENCE_MISMATCH: 'maintenance.errors.companyAuthorizationLicenceMismatch'
  };

  const permissionActionKeys: Record<string, string> = {
    'maintenance.release.issue': 'maintenance.permissionActions.releaseIssue',
    'maintenance.package.plan': 'maintenance.permissionActions.packagePlan',
    'maintenance.jobcard.manage': 'maintenance.permissionActions.jobCardManage',
    'maintenance.jobcard.work.sign': 'maintenance.permissionActions.jobCardWorkSign',
    'maintenance.jobcard.inspect': 'maintenance.permissionActions.jobCardInspect'
  };

  function label(value: string | null | undefined) {
    if (!value) return '-';
    const key = `maintenance.status.${value}`;
    const localized = t(key);
    return localized === key ? fallbackLabel(value) : localized;
  }

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
    const action = t(permissionActionKeys[permission] ?? 'maintenance.permissionActions.fallback');
    return allowed
      ? t('maintenance.permission.available')
      : t('maintenance.permission.denied', { role, action });
  }

  function operationalAction(value: string | null | undefined) {
    if (!value) return '-';
    return value
      .replace('Backend blockers', t('maintenance.operationalActions.backendBlockers'))
      .replace('Required action:', t('maintenance.operationalActions.requiredAction'))
      .replace(
        'Technical release cannot proceed.',
        t('maintenance.operationalActions.technicalReleaseCannotProceed')
      )
      .replace(
        'Technical release is blocked.',
        t('maintenance.operationalActions.technicalReleaseBlocked')
      )
      .replace(
        'Complete independent inspection with evidence.',
        t('maintenance.operationalActions.completeIndependentInspection')
      )
      .replace(
        'Complete corrective work and submit the required re-inspection.',
        t('maintenance.operationalActions.completeCorrectiveWork')
      )
      .replace(
        'Complete mechanic work and required inspection.',
        t('maintenance.operationalActions.completeMechanicWork')
      )
      .replace(
        'Record the approved data reference and revision snapshot.',
        t('maintenance.operationalActions.recordApprovedData')
      );
  }

  function presentError(errorValue: unknown): MaintenanceErrorPresentation {
    if (errorValue instanceof ApiClientError) {
      const details = errorDetails(errorValue);
      return {
        code: errorValue.code,
        title: companyAuthorizationTitleKeys[errorValue.code]
          ? t(companyAuthorizationTitleKeys[errorValue.code])
          : errorValue.message,
        impact:
          typeof details.impact === 'string'
            ? operationalAction(details.impact)
            : t('maintenance.errors.systemDidNotApplyAction'),
        requiredAction:
          typeof details.requiredAction === 'string'
            ? operationalAction(details.requiredAction)
            : t('maintenance.errors.reloadResolveBlockerRetry'),
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
      title:
        errorValue instanceof Error
          ? errorValue.message
          : t('maintenance.errors.clientActionFailed'),
      impact: t('maintenance.errors.uiCannotConfirmAction'),
      requiredAction: t('maintenance.errors.reloadAndCheckBackend'),
      referenceId: null,
      requestId: null
    };
  }

  return {
    jobCardStatusColor,
    label,
    operationalAction,
    permissionHint,
    presentError,
    technicalStateColor,
    workPackageStatusColor
  };
}
