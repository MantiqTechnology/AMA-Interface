import type { Ref } from 'vue';
import type {
  MaintenanceJobCardDto,
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import { demoRoleActorIds } from '#shared/types/roles';
import { activeRework, latestInspectionAttempt, signoff } from '../utils/jobCardHelper';

interface WorkForm {
  statement: string;
  certifyingLicenseNumber: string;
}

interface ReworkForm {
  correctiveActionDescription: string;
  approvedDataRef: string;
  statement: string;
  certifyingLicenseNumber: string;
  evidenceReferences: string;
}

interface InspectionForm {
  statement: string;
  certifyingLicenseNumber: string;
  inspectedAt: string;
  evidenceReferences: string;
}

interface UseJobCardWorkflowOptions {
  workPackage: Ref<MaintenanceWorkPackageDto | null | undefined>;
  signerLicenses: Ref<MaintenanceSelectorDataDto['signerLicenses']>;
  /** Called after any mutating action succeeds; parent is responsible for refresh(). */
  onMutated: () => Promise<void> | void;
}

function newIdempotencyKey(prefix: string) {
  if (import.meta.client && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useJobCardWorkflow(options: UseJobCardWorkflowOptions) {
  const { workPackage, signerLicenses, onMutated } = options;

  const session = useDemoSession();
  const { can } = useAuthorization();
  const ui = useMaintenanceUi();
  const { t } = useI18n();

  const canWork = computed(() => can('maintenance.jobcard.work.sign').allowed);
  const canInspect = computed(() => can('maintenance.jobcard.inspect').allowed);

  const actionLoading = ref('');
  const actionError = ref<ReturnType<typeof ui.presentError> | null>(null);
  const actionSuccess = ref('');

  const workForms = reactive<Record<string, WorkForm>>({});
  const reworkForms = reactive<Record<string, ReworkForm>>({});

  const inspectionDialog = ref(false);
  const inspectionCard = ref<MaintenanceJobCardDto | null>(null);
  const inspectionResult = ref<'PASSED' | 'FAILED'>('PASSED');
  const inspectionConfirmed = ref(false);
  const inspectionIdempotencyKey = ref('');
  const inspectionForm = reactive<InspectionForm>({
    statement: '',
    certifyingLicenseNumber: '',
    inspectedAt: '',
    evidenceReferences: ''
  });
  const failedInspectionResult = ref<{
    attemptId: string;
    reworkActionId: string | null;
    packageNumber: string;
  } | null>(null);

  function preferredSignerLicenseNumber() {
    return (
      signerLicenses.value.find((license) => license.isUsableNow)?.licenseNumber ||
      signerLicenses.value[0]?.licenseNumber ||
      ''
    );
  }

  function selectedWorkLicense(card: MaintenanceJobCardDto) {
    const form = workForms[card.id];
    return form
      ? signerLicenses.value.find(
          (license) => license.licenseNumber === form.certifyingLicenseNumber
        )
      : undefined;
  }

  function workLicenseUnusable(card: MaintenanceJobCardDto) {
    const license = selectedWorkLicense(card);
    return Boolean(license) && !license?.isUsableNow;
  }

  function authorizationSummary(action: string, licenseNumber: string) {
    const license = signerLicenses.value.find((item) => item.licenseNumber === licenseNumber);
    if (!license) {
      return t('maintenance.jobCardWorkflow.authorizationMissing');
    }
    return t('maintenance.jobCardWorkflow.authorizationSummary', {
      action,
      scope: license.scopeSummary
    });
  }

  function workSignoffPlaceholder(card: MaintenanceJobCardDto) {
    return t('maintenance.jobCardWorkflow.workSignoffPlaceholder', {
      cardNumber: card.cardNumber,
      maintenanceDataRef: card.maintenanceDataRef
    });
  }

  function canSignCard(card: MaintenanceJobCardDto) {
    return canWork.value && ['READY', 'IN_PROGRESS'].includes(card.status);
  }

  function canSubmitWork(card: MaintenanceJobCardDto) {
    const form = workForms[card.id];
    return Boolean(form && form.statement.trim().length >= 10 && selectedWorkLicense(card));
  }

  function currentActorId() {
    return demoRoleActorIds[session.role.value] ?? null;
  }

  function canInspectCard(card: MaintenanceJobCardDto) {
    const mechanic = signoff(card, 'MECHANIC');
    const rework = activeRework(card);
    const actorId = currentActorId();
    const independentFrom = rework?.mechanicSignoffUserId ?? mechanic?.actorUserId;
    return (
      canInspect.value &&
      card.status === 'INSPECTION_REQUIRED' &&
      Boolean(mechanic) &&
      independentFrom !== actorId &&
      (!rework || rework.status === 'AWAITING_REINSPECTION')
    );
  }

  function selfInspectionBlocked(card: MaintenanceJobCardDto) {
    const mechanic = signoff(card, 'MECHANIC');
    const rework = activeRework(card);
    const actorId = currentActorId();
    const independentFrom = rework?.mechanicSignoffUserId ?? mechanic?.actorUserId;
    return (
      canInspect.value &&
      card.status === 'INSPECTION_REQUIRED' &&
      Boolean(mechanic) &&
      independentFrom === actorId
    );
  }

  async function runAction(name: string, fn: () => Promise<void>) {
    actionLoading.value = name;
    actionError.value = null;
    actionSuccess.value = '';
    try {
      await fn();
      await onMutated();
    } catch (errorValue) {
      actionError.value = ui.presentError(errorValue);
    } finally {
      actionLoading.value = '';
    }
  }

  async function start(card: MaintenanceJobCardDto) {
    await runAction(`start-${card.id}`, () =>
      fetchApi(`/api/maintenance/job-cards/${card.id}/actions/start`, {
        method: 'POST',
        body: { expectedVersion: card.version }
      }).then(() => undefined)
    );
  }

  async function signWork(card: MaintenanceJobCardDto) {
    const form = workForms[card.id];
    if (!form) return;
    await runAction(`sign-${card.id}`, () =>
      fetchApi(`/api/maintenance/job-cards/${card.id}/actions/sign-work`, {
        method: 'POST',
        body: {
          expectedVersion: card.version,
          certifyingLicenseNumber: form.certifyingLicenseNumber,
          statement: form.statement,
          evidenceReferences: [`${card.cardNumber}-MECH-EVIDENCE`]
        }
      }).then(() => {
        form.statement = '';
      })
    );
  }

  // Bug fix (#2): removed dead ternary that always resolved to 'PASSED'.
  function openInspectionDialog(card: MaintenanceJobCardDto) {
    inspectionCard.value = card;
    inspectionResult.value = 'PASSED';
    inspectionConfirmed.value = false;
    failedInspectionResult.value = null;
    inspectionIdempotencyKey.value = newIdempotencyKey('mro-inspection');
    inspectionForm.statement = t('maintenance.jobCardWorkflow.inspectionPassedStatement', {
      cardNumber: card.cardNumber
    });
    inspectionForm.certifyingLicenseNumber =
      inspectionForm.certifyingLicenseNumber || preferredSignerLicenseNumber();
    inspectionForm.inspectedAt = new Date().toISOString();
    inspectionForm.evidenceReferences = `${card.cardNumber}-INSP-EVIDENCE`;
    inspectionDialog.value = true;
  }

  function selectedInspectorLicense() {
    return signerLicenses.value.find(
      (license) => license.licenseNumber === inspectionForm.certifyingLicenseNumber
    );
  }

  function inspectorLicenseUnusable() {
    const license = selectedInspectorLicense();
    return Boolean(license) && !license?.isUsableNow;
  }

  function evidenceList(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Bug fix (#3): removed the redundant clause that duplicated the statement-length
  // check above regardless of PASSED/FAILED — it never changed the outcome.
  const canSubmitInspection = computed(
    () =>
      Boolean(inspectionCard.value) &&
      Boolean(inspectionForm.certifyingLicenseNumber) &&
      Boolean(inspectionForm.inspectedAt) &&
      inspectionForm.statement.trim().length >= 10 &&
      inspectionConfirmed.value
  );

  async function submitInspection() {
    const card = inspectionCard.value;
    if (!card) return;
    await runAction(`inspect-${card.id}`, async () => {
      const updated = await fetchApi<MaintenanceWorkPackageDto>(
        `/api/maintenance/job-cards/${card.id}/actions/inspect`,
        {
          method: 'POST',
          body: {
            expectedVersion: card.version,
            decision: inspectionResult.value,
            statement: inspectionForm.statement,
            certifyingLicenseNumber: inspectionForm.certifyingLicenseNumber,
            inspectedAt: inspectionForm.inspectedAt,
            idempotencyKey: inspectionIdempotencyKey.value,
            evidenceReferences: evidenceList(inspectionForm.evidenceReferences)
          }
        }
      );
      workPackage.value = updated;
      if (inspectionResult.value === 'FAILED') {
        const updatedCard = updated.jobCards.find((item) => item.id === card.id);
        const attempt = updatedCard ? latestInspectionAttempt(updatedCard) : null;
        const rework = updatedCard ? activeRework(updatedCard) : null;
        failedInspectionResult.value = {
          attemptId: attempt?.id ?? card.id,
          reworkActionId: rework?.id ?? null,
          packageNumber: updated.packageNumber
        };
      } else {
        actionSuccess.value =
          activeRework(card) === null
            ? t('maintenance.jobCardWorkflow.independentInspectionPassed')
            : t('maintenance.jobCardWorkflow.reInspectionPassed');
        inspectionDialog.value = false;
      }
    });
  }

  async function signCorrectiveWork(action: MaintenanceReworkActionDto) {
    const form = reworkForms[action.id];
    if (!workPackage.value || !form) return;
    await runAction(`rework-${action.id}`, () =>
      fetchApi(`/api/maintenance/rework-actions/${action.id}/actions/sign-work`, {
        method: 'POST',
        body: {
          expectedVersion: workPackage.value!.version,
          certifyingLicenseNumber: form.certifyingLicenseNumber,
          correctiveActionDescription: form.correctiveActionDescription,
          approvedDataRef: form.approvedDataRef,
          statement: form.statement,
          evidenceReferences: evidenceList(form.evidenceReferences)
        }
      }).then(() => {
        form.statement = '';
      })
    );
  }

  function resetInspectionForm() {
    inspectionCard.value = null;
    inspectionDialog.value = false;
    inspectionConfirmed.value = false;
    failedInspectionResult.value = null;
    Object.assign(inspectionForm, {
      statement: '',
      certifyingLicenseNumber: '',
      inspectedAt: '',
      evidenceReferences: ''
    });
  }

  // Bug fix (#5): workForms / reworkForms / inspectionForm used to live at the parent
  // component scope and were never cleared when navigating between work packages
  // (Vue reuses the route component instance on param change). Clearing them here,
  // keyed off workPackage.id, stops stale data from leaking across aircraft/packages.
  watch(
    () => workPackage.value?.id,
    () => {
      for (const key of Object.keys(workForms)) delete workForms[key];
      for (const key of Object.keys(reworkForms)) delete reworkForms[key];
      resetInspectionForm();
      actionError.value = null;
      actionSuccess.value = '';
    }
  );

  watch(
    workPackage,
    (item) => {
      for (const card of item?.jobCards ?? []) {
        workForms[card.id] ??= {
          certifyingLicenseNumber: preferredSignerLicenseNumber(),
          statement: ''
        };
        for (const action of card.reworkActions) {
          reworkForms[action.id] ??= {
            correctiveActionDescription: action.correctiveActionDescription || '',
            approvedDataRef: action.approvedDataRef || '',
            certifyingLicenseNumber:
              action.mechanicLicenseNumber ||
              signerLicenses.value.find((license) => license.isUsableNow)?.licenseNumber ||
              signerLicenses.value[0]?.licenseNumber ||
              '',
            statement:
              action.mechanicSignoffStatement ||
              `Corrective work completed for ${action.reworkNumber}.`,
            evidenceReferences: `${action.reworkNumber}-CORRECTIVE-EVIDENCE`
          };
        }
      }
    },
    { immediate: true, deep: true }
  );

  watch(
    signerLicenses,
    () => {
      for (const form of Object.values(workForms)) {
        if (!form.certifyingLicenseNumber) {
          form.certifyingLicenseNumber = preferredSignerLicenseNumber();
        }
      }
    },
    { immediate: true }
  );

  return {
    // state
    actionLoading,
    actionError,
    actionSuccess,
    workForms,
    reworkForms,
    inspectionDialog,
    inspectionCard,
    inspectionResult,
    inspectionConfirmed,
    inspectionIdempotencyKey,
    inspectionForm,
    failedInspectionResult,
    canWork,
    canInspect,
    // derived
    canSubmitInspection,
    // functions
    signoff,
    activeRework,
    latestInspectionAttempt,
    canSignCard,
    canSubmitWork,
    canInspectCard,
    selfInspectionBlocked,
    selectedWorkLicense,
    workLicenseUnusable,
    inspectorLicenseUnusable,
    authorizationSummary,
    workSignoffPlaceholder,
    preferredSignerLicenseNumber,
    start,
    signWork,
    openInspectionDialog,
    submitInspection,
    signCorrectiveWork
  };
}
