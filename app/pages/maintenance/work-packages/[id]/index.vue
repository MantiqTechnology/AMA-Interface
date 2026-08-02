<script setup lang="ts">
import type { MaintenanceErrorPresentation } from '../../../../composables/useMaintenanceUi';
import type {
  MaintenanceJobCardDto,
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import { demoRoleActorIds } from '#shared/types/roles';

const authorizationWording = 'Licence and PT AMA authorization verified.';

const route = useRoute();
const id = computed(() => String(route.params.id));
const session = useDemoSession();
const { can } = useAuthorization();
const format = useLocaleFormat();
const ui = useMaintenanceUi();

const actionLoading = ref('');
const actionError = ref<MaintenanceErrorPresentation | null>(null);
const actionSuccess = ref('');
const releaseDialog = ref(false);
const releaseCompleted = ref(false);
const releaseUncertain = ref(false);
const releaseIdempotencyKey = ref('');
const inspectionDialog = ref(false);
const inspectionCard = ref<MaintenanceJobCardDto | null>(null);
const inspectionResult = ref<'PASSED' | 'FAILED'>('PASSED');
const inspectionConfirmed = ref(false);
const inspectionIdempotencyKey = ref('');
const failedInspectionResult = ref<{
  attemptId: string;
  reworkActionId: string | null;
  packageNumber: string;
} | null>(null);
const reworkForms = reactive<
  Record<
    string,
    {
      correctiveActionDescription: string;
      approvedDataRef: string;
      statement: string;
      certifyingLicenseNumber: string;
      evidenceReferences: string;
    }
  >
>({});

const jobCardForm = reactive({
  title: '',
  taskType: 'DEFECT_RECTIFICATION',
  maintenanceDataRef: '',
  maintenanceDataRevision: 'REV-MROV1-2026-08',
  mandatoryFlag: true,
  requiresIndependentInspection: true
});
const workStatement = ref('');
const workLicenseNumber = ref('');
const inspectionForm = reactive({
  statement: '',
  certifyingLicenseNumber: '',
  inspectedAt: '',
  evidenceReferences: ''
});

const releaseForm = reactive({
  releaseNumber: '',
  resultingStatus: 'SERVICEABLE' as 'SERVICEABLE' | 'SERVICEABLE_WITH_RESTRICTIONS',
  releaseStatement: '',
  certifyingLicenseNumber: '',
  releasedAt: '',
  evidenceReferences: 'MROV1-TECHNICAL-RELEASE-EVIDENCE'
});
const releaseStatusItems = [
  { title: 'Serviceable', value: 'SERVICEABLE' },
  { title: 'Serviceable With Restrictions', value: 'SERVICEABLE_WITH_RESTRICTIONS' }
];

const { data, pending, error, refresh } = await useAsyncData(
  () => `maintenance-work-package-${id.value}`,
  () => fetchApi<MaintenanceWorkPackageDto>(`/api/maintenance/work-packages/${id.value}`),
  { watch: [id] }
);

const {
  data: selectorData,
  pending: selectorsPending,
  refresh: refreshSelectors
} = await useAsyncData(
  'maintenance-detail-selector-data',
  () => fetchApi<MaintenanceSelectorDataDto>('/api/maintenance/selector-data'),
  { server: false }
);

const workPackage = computed(() => data.value);
const checklist = computed(() => workPackage.value?.releaseChecklist);
const releaseBlockers = computed(() => checklist.value?.blockers ?? []);
const signerLicenses = computed(() => selectorData.value?.signerLicenses ?? []);
const selectedSignerLicense = computed(() =>
  signerLicenses.value.find(
    (license) => license.licenseNumber === releaseForm.certifyingLicenseNumber
  )
);
const selectedWorkLicense = computed(() =>
  signerLicenses.value.find((license) => license.licenseNumber === workLicenseNumber.value)
);

const canManage = computed(() => can('maintenance.jobcard.manage').allowed);
const canWork = computed(() => can('maintenance.jobcard.work.sign').allowed);
const canInspect = computed(() => can('maintenance.jobcard.inspect').allowed);
const canRequestRelease = computed(() => can('maintenance.release.request').allowed);
const canIssueRelease = computed(() => can('maintenance.release.issue').allowed);
const immutablePackage = computed(() =>
  ['RELEASED', 'CANCELLED'].includes(workPackage.value?.status ?? '')
);
const canAddJobCard = computed(
  () => canManage.value && ['OPEN', 'IN_PROGRESS'].includes(workPackage.value?.status ?? '')
);
const packageOwner = computed(() => {
  const item = workPackage.value;
  if (!item) return '-';
  if (item.status === 'READY_FOR_RELEASE') return 'Certifying Staff';
  if (item.status === 'RELEASED') return 'Records Control';
  if (item.jobCards.some((card) => card.status === 'INSPECTION_REQUIRED')) {
    return 'Independent Inspector';
  }
  return 'Maintenance Control';
});
const sourceContextLabel = computed(
  () =>
    workPackage.value?.sourceFlight?.flightNumber ??
    workPackage.value?.primaryDefect?.sourceReference ??
    '-'
);
const primaryJobCard = computed(() => workPackage.value?.jobCards[0] ?? null);
const releasePathSteps = computed(() => {
  const item = workPackage.value;
  const card = primaryJobCard.value;
  const mechanic = card ? signoff(card, 'MECHANIC') : undefined;
  const inspection = card ? signoff(card, 'INDEPENDENT_INSPECTION') : undefined;
  return [
    {
      label: 'Defect',
      title: item?.primaryDefect?.title ?? 'No primary defect linked',
      meta: item?.primaryDefectNumber ?? item?.primaryDefect?.sourceReference ?? '-',
      badge: item?.primaryDefect ? ui.label(item.primaryDefect.status) : 'Missing',
      tone: item?.primaryDefect ? 'success' : 'warning'
    },
    {
      label: 'Work package',
      title: item?.title ?? '-',
      meta: item?.packageNumber ?? '-',
      badge: item?.status ? ui.label(item.status) : 'Missing',
      tone: item ? ui.workPackageStatusColor(item.status) : 'secondary'
    },
    {
      label: 'Job card',
      title: card?.title ?? 'No job card',
      meta: card?.cardNumber ?? '-',
      badge: card ? ui.label(card.status) : 'Missing',
      tone: card ? ui.jobCardStatusColor(card.status) : 'warning'
    },
    {
      label: 'Sign-off',
      title: mechanic ? 'Mechanic work signed' : 'Mechanic sign-off pending',
      meta: mechanic ? `${mechanic.actorRole} / ${format.dateTime(mechanic.signedAt)}` : '-',
      badge: mechanic ? 'Signed' : 'Pending',
      tone: mechanic ? 'success' : 'warning'
    },
    {
      label: 'Inspection',
      title: inspection ? 'Independent inspection passed' : 'Inspection pending',
      meta: inspection ? `${inspection.actorRole} / ${format.dateTime(inspection.signedAt)}` : '-',
      badge: inspection
        ? 'Passed'
        : card?.requiresIndependentInspection
          ? 'Pending'
          : 'Not required',
      tone: inspection ? 'success' : card?.requiresIndependentInspection ? 'warning' : 'secondary'
    },
    {
      label: 'Technical release',
      title:
        item?.release?.releaseNumber ??
        (item?.status === 'READY_FOR_RELEASE' ? 'Ready to issue' : 'Not issued'),
      meta: item?.releasedAt
        ? format.dateTime(item.releasedAt)
        : item?.status
          ? ui.label(item.status)
          : '-',
      badge: item?.release ? 'Issued' : item?.status === 'READY_FOR_RELEASE' ? 'Ready' : 'Pending',
      tone: item?.release
        ? 'success'
        : item?.status === 'READY_FOR_RELEASE'
          ? 'warning'
          : 'secondary'
    },
    {
      label: 'Readiness',
      title: ui.label(item?.aircraftTechnicalState),
      meta: ui.label(item?.aircraftTechnicalEligibility),
      badge: ui.label(item?.aircraftTechnicalState),
      tone: ui.technicalStateColor(item?.aircraftTechnicalState)
    },
    {
      label: 'Audit trail',
      title: `${item?.auditRecords?.length ?? 0} recorded action(s)`,
      meta: item?.auditRecords?.[0] ? format.dateTime(item.auditRecords[0].occurredAt) : '-',
      badge: item?.auditRecords?.length ? 'Recorded' : 'Pending',
      tone: item?.auditRecords?.length ? 'success' : 'warning'
    }
  ];
});

const canSubmitRelease = computed(
  () =>
    canIssueRelease.value &&
    workPackage.value?.status === 'READY_FOR_RELEASE' &&
    releaseForm.releaseNumber.trim().length >= 3 &&
    releaseForm.releaseStatement.trim().length >= 20 &&
    Boolean(selectedSignerLicense.value) &&
    Boolean(releaseForm.releasedAt) &&
    evidenceList(releaseForm.evidenceReferences).length > 0
);
const canSubmitWork = computed(
  () => workStatement.value.trim().length >= 10 && Boolean(selectedWorkLicense.value)
);

const canSubmitInspection = computed(
  () =>
    Boolean(inspectionCard.value) &&
    Boolean(inspectionForm.certifyingLicenseNumber) &&
    Boolean(inspectionForm.inspectedAt) &&
    inspectionForm.statement.trim().length >= 10 &&
    inspectionConfirmed.value &&
    (inspectionResult.value === 'PASSED' || inspectionForm.statement.trim().length >= 10)
);

watch(
  () => [
    releaseForm.releaseNumber,
    releaseForm.resultingStatus,
    releaseForm.releaseStatement,
    releaseForm.certifyingLicenseNumber,
    releaseForm.releasedAt,
    releaseForm.evidenceReferences
  ],
  () => {
    if (releaseDialog.value && !releaseCompleted.value && !releaseUncertain.value) {
      releaseIdempotencyKey.value = newIdempotencyKey();
    }
  }
);

watch(
  signerLicenses,
  (licenses) => {
    if (!workLicenseNumber.value) {
      workLicenseNumber.value =
        licenses.find((license) => license.isUsableNow)?.licenseNumber ||
        licenses[0]?.licenseNumber ||
        '';
    }
  },
  { immediate: true }
);

watch(
  workPackage,
  (item) => {
    for (const card of item?.jobCards ?? []) {
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
  { immediate: true }
);

function newIdempotencyKey() {
  if (import.meta.client && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `mro-release-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newInspectionIdempotencyKey() {
  if (import.meta.client && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `mro-inspection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultReleaseTimestamp() {
  const date = (workPackage.value?.updatedAt ?? new Date().toISOString()).slice(0, 10);
  return `${date}T08:30:00.000Z`;
}

function evidenceList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function signoff(card: MaintenanceJobCardDto, type: 'MECHANIC' | 'INDEPENDENT_INSPECTION') {
  return card.signoffs.find((item) => item.signoffType === type);
}

function authorizationSummary(action: string, licenseNumber: string) {
  const license = signerLicenses.value.find((item) => item.licenseNumber === licenseNumber);
  if (!license) return 'Select a valid licence. Backend authorization is checked again on submit.';
  return `${authorizationWording} Action: ${action}. Scope: ${license.scopeSummary}`;
}

function latestInspectionAttempt(card: MaintenanceJobCardDto) {
  return [...card.inspectionAttempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0] ?? null;
}

function activeRework(card: MaintenanceJobCardDto) {
  return (
    card.reworkActions.find((item) =>
      ['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS', 'AWAITING_REINSPECTION'].includes(
        item.status
      )
    ) ?? null
  );
}

function hasOpenReworkBlocker(item: MaintenanceWorkPackageDto) {
  return item.jobCards.some((card) =>
    card.reworkActions.some((action) =>
      ['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS', 'AWAITING_REINSPECTION'].includes(
        action.status
      )
    )
  );
}

function canSignCard(card: MaintenanceJobCardDto) {
  return canWork.value && ['READY', 'IN_PROGRESS'].includes(card.status);
}

function canInspectCard(card: MaintenanceJobCardDto) {
  const mechanic = signoff(card, 'MECHANIC');
  const rework = activeRework(card);
  const actorId = demoRoleActorIds[session.role.value];
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
  const actorId = demoRoleActorIds[session.role.value];
  const independentFrom = rework?.mechanicSignoffUserId ?? mechanic?.actorUserId;
  return (
    canInspect.value &&
    card.status === 'INSPECTION_REQUIRED' &&
    Boolean(mechanic) &&
    independentFrom === actorId
  );
}

function releaseSnapshotValue(key: string) {
  const snapshot = workPackage.value?.release?.signerAuthorizationSnapshot;
  if (!snapshot && key === 'companyAuthorizationNumber') {
    return 'Legacy record — company authorization snapshot unavailable.';
  }
  const value = snapshot?.[key];
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function signerLicenseTitle(license: MaintenanceSelectorDataDto['signerLicenses'][number]) {
  return `${license.personnelName} / ${license.licenseNumber}`;
}

function releaseSignerName(release: NonNullable<MaintenanceWorkPackageDto['release']>) {
  const name = release.signerAuthorizationSnapshot?.personnelName;
  return typeof name === 'string' ? name : 'Certifying staff';
}

function auditEntityLabel(record: { entityType: string; afterVersion: number | null }) {
  const version =
    record.afterVersion === null ? 'Version unchanged' : `Version ${record.afterVersion}`;
  return `${ui.label(record.entityType)} / ${version}`;
}

function jobCardBlocker(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Work not started.';
  if (card.status === 'IN_PROGRESS') return 'Mechanic sign-off pending.';
  if (card.status === 'REJECTED_FOR_REWORK') return 'Failed inspection requires corrective work.';
  if (card.status === 'INSPECTION_REQUIRED') return 'Independent inspection pending.';
  if (card.status === 'READY_FOR_RELEASE_REVIEW') return 'No job-card blocker.';
  return ui.label(card.status);
}

function jobCardRequiredAction(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Start work and complete the mechanic statement.';
  if (card.status === 'IN_PROGRESS') return 'Complete mechanic sign-off with evidence.';
  if (card.status === 'REJECTED_FOR_REWORK') return 'Complete the linked rework action.';
  if (card.status === 'INSPECTION_REQUIRED') {
    return 'Assign an independent inspector who did not sign the mechanic work.';
  }
  if (card.status === 'READY_FOR_RELEASE_REVIEW') return 'Include in release readiness review.';
  return 'Open audit trail before any further action.';
}

function linkedDefectDisposition() {
  const defect = workPackage.value?.primaryDefect;
  if (!defect) return 'No linked defect.';
  return `${defect.defectNumber}: ${ui.label(defect.status)}`;
}

async function runAction(name: string, fn: () => Promise<void>) {
  actionLoading.value = name;
  actionError.value = null;
  actionSuccess.value = '';
  try {
    await fn();
    await refresh();
  } catch (errorValue) {
    actionError.value = ui.presentError(errorValue);
  } finally {
    actionLoading.value = '';
  }
}

async function addJobCard() {
  if (!workPackage.value) return;
  await runAction('add-card', async () => {
    await fetchApi(`/api/maintenance/work-packages/${workPackage.value!.id}/job-cards`, {
      method: 'POST',
      body: {
        ...jobCardForm,
        expectedWorkPackageVersion: workPackage.value!.version
      }
    });
    jobCardForm.title = '';
    jobCardForm.maintenanceDataRef = '';
  });
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
  await runAction(`sign-${card.id}`, () =>
    fetchApi(`/api/maintenance/job-cards/${card.id}/actions/sign-work`, {
      method: 'POST',
      body: {
        expectedVersion: card.version,
        certifyingLicenseNumber: workLicenseNumber.value,
        statement: workStatement.value,
        evidenceReferences: [`${card.cardNumber}-MECH-EVIDENCE`]
      }
    }).then(() => {
      workStatement.value = '';
    })
  );
}

function openInspectionDialog(card: MaintenanceJobCardDto, result: 'PASSED' | 'FAILED' = 'PASSED') {
  inspectionCard.value = card;
  inspectionResult.value = result;
  inspectionConfirmed.value = false;
  failedInspectionResult.value = null;
  inspectionIdempotencyKey.value = newInspectionIdempotencyKey();
  inspectionForm.statement =
    result === 'FAILED'
      ? ''
      : `Independent inspection passed for ${card.cardNumber} with required evidence.`;
  inspectionForm.certifyingLicenseNumber =
    inspectionForm.certifyingLicenseNumber ||
    signerLicenses.value.find((license) => license.isUsableNow)?.licenseNumber ||
    signerLicenses.value[0]?.licenseNumber ||
    '';
  inspectionForm.inspectedAt = new Date().toISOString();
  inspectionForm.evidenceReferences = `${card.cardNumber}-INSP-EVIDENCE`;
  inspectionDialog.value = true;
}

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
    data.value = updated;
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
          ? 'Independent inspection passed. Release readiness was refreshed from backend state.'
          : 'Re-inspection passed. Release readiness was refreshed from backend state.';
      inspectionDialog.value = false;
    }
    await refreshSelectors();
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

async function requestRelease() {
  if (!workPackage.value) return;
  await runAction('request-release', () =>
    fetchApi(`/api/maintenance/work-packages/${workPackage.value!.id}/actions/request-release`, {
      method: 'POST',
      body: { expectedVersion: workPackage.value!.version }
    }).then(() => undefined)
  );
}

function openReleaseDialog() {
  if (!workPackage.value) return;
  releaseCompleted.value = false;
  releaseUncertain.value = false;
  actionError.value = null;
  actionSuccess.value = '';
  releaseIdempotencyKey.value = newIdempotencyKey();
  releaseForm.releaseNumber =
    releaseForm.releaseNumber ||
    `RTS-${workPackage.value.packageNumber.replace(/^MWP-/u, '')}-${Date.now()
      .toString()
      .slice(-5)}`;
  releaseForm.releasedAt = releaseForm.releasedAt || defaultReleaseTimestamp();
  releaseForm.releaseStatement =
    releaseForm.releaseStatement ||
    `Technical release issued for ${workPackage.value.packageNumber} after review of mandatory work, evidence, and independent inspection records.`;
  releaseForm.certifyingLicenseNumber =
    releaseForm.certifyingLicenseNumber ||
    signerLicenses.value.find((license) => license.isUsableNow)?.licenseNumber ||
    signerLicenses.value[0]?.licenseNumber ||
    '';
  releaseDialog.value = true;
}

async function issueRelease() {
  if (!workPackage.value) return;
  actionLoading.value = 'issue-release';
  actionError.value = null;
  actionSuccess.value = '';
  releaseUncertain.value = false;
  try {
    await fetchApi<MaintenanceWorkPackageDto>(
      `/api/maintenance/work-packages/${workPackage.value.id}/actions/release`,
      {
        method: 'POST',
        body: {
          expectedVersion: workPackage.value.version,
          releaseNumber: releaseForm.releaseNumber,
          resultingStatus: releaseForm.resultingStatus,
          releaseStatement: releaseForm.releaseStatement,
          certifyingLicenseNumber: releaseForm.certifyingLicenseNumber,
          releasedAt: releaseForm.releasedAt,
          evidenceReferences: evidenceList(releaseForm.evidenceReferences),
          idempotencyKey: releaseIdempotencyKey.value
        }
      }
    );
    releaseCompleted.value = true;
    actionSuccess.value =
      'Technical release accepted. Aircraft readiness is refreshed from backend state.';
    await Promise.all([refresh(), refreshSelectors()]);
  } catch (errorValue) {
    actionError.value = ui.presentError(errorValue);
    releaseUncertain.value = actionError.value.code === 'CLIENT_ACTION_FAILED';
  } finally {
    actionLoading.value = '';
  }
}
</script>

<template>
  <VContainer fluid class="maintenance-detail">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <VBtn to="/maintenance" prepend-icon="mdi-arrow-left" variant="text"> Command Center </VBtn>
      <VSpacer />
      <VBtn to="/maintenance/work-packages" variant="text">Work Packages</VBtn>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Unable to load work package.
    </VAlert>
    <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
      <strong>{{ actionError.title }}</strong>
      <div>{{ actionError.impact }}</div>
      <div class="text-caption">Required action: {{ actionError.requiredAction }}</div>
      <div v-if="actionError.referenceId" class="text-caption">
        Reference: {{ actionError.referenceId }}
      </div>
      <div v-if="actionError.requestId" class="text-caption">
        Request: {{ actionError.requestId }}
      </div>
    </VAlert>
    <VAlert v-if="actionSuccess" type="success" variant="tonal" class="mb-4">
      {{ actionSuccess }}
    </VAlert>
    <VAlert v-if="failedInspectionResult" type="warning" variant="tonal" class="mb-4">
      <div class="font-weight-bold">Inspection failed — rework required</div>
      <div>
        The finding has been recorded and technical release is blocked until corrective work is
        completed and the required re-inspection passes.
      </div>
      <div class="d-flex flex-wrap ga-2 mt-3">
        <VBtn
          v-if="failedInspectionResult.reworkActionId"
          size="small"
          variant="tonal"
          :href="`#${failedInspectionResult.reworkActionId}`"
        >
          Open Rework Action
        </VBtn>
        <VBtn
          size="small"
          variant="tonal"
          :to="`/maintenance/records?package=${failedInspectionResult.packageNumber}&search=${failedInspectionResult.attemptId}`"
        >
          View Inspection Record
        </VBtn>
        <VBtn
          size="small"
          variant="tonal"
          :to="`/maintenance/records?package=${failedInspectionResult.packageNumber}`"
        >
          View Audit Trail
        </VBtn>
      </div>
    </VAlert>
    <VProgressLinear v-if="pending" indeterminate class="mb-4" />

    <template v-if="workPackage">
      <VCard border class="mb-4">
        <VCardTitle class="d-flex flex-wrap align-center ga-3">
          <div>
            <h1 class="text-h4 font-weight-bold mb-1">{{ workPackage.title }}</h1>
            <div class="d-flex flex-wrap align-center ga-2 text-body-2 text-medium-emphasis">
              <VChip size="small" variant="tonal">{{ workPackage.packageNumber }}</VChip>
              <span>{{ workPackage.aircraftRegistrationNumber }}</span>
            </div>
          </div>
          <VSpacer />
          <VChip :color="ui.workPackageStatusColor(workPackage.status)" variant="tonal">
            {{ ui.label(workPackage.status) }}
          </VChip>
          <VChip
            :color="ui.technicalStateColor(workPackage.aircraftTechnicalState)"
            variant="tonal"
          >
            {{ ui.label(workPackage.aircraftTechnicalState) }}
          </VChip>
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Aircraft</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ workPackage.aircraftRegistrationNumber }}
              </div>
              <div class="text-caption">
                {{ workPackage.aircraftType ?? '-' }} / {{ workPackage.aircraftModel ?? '-' }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Source defect</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ workPackage.primaryDefect?.title ?? 'No primary defect linked' }}
              </div>
              <div class="text-caption">
                {{
                  workPackage.primaryDefect?.defectNumber ?? workPackage.primaryDefectNumber ?? '-'
                }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Source flight / technical log</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ sourceContextLabel }}
              </div>
              <div class="text-caption">Derived read-only context</div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Execution</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ ui.label(workPackage.executionMode) }}
              </div>
              <div class="text-caption">
                {{ workPackage.vendorName ?? 'Internal execution' }}
              </div>
            </VCol>
          </VRow>
          <VDivider class="my-4" />
          <VRow>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Priority</div>
              <strong>{{ ui.label(workPackage.priority) }}</strong>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Technical impact</div>
              <strong>{{ ui.label(workPackage.aircraftTechnicalState) }}</strong>
              <div class="text-caption">
                {{ ui.label(workPackage.aircraftTechnicalEligibility) }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Version / updated</div>
              <strong>Version {{ workPackage.version }}</strong>
              <div class="text-caption">{{ format.dateTime(workPackage.updatedAt) }}</div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Owner</div>
              <strong>{{ packageOwner }}</strong>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard border class="mb-4">
        <VCardTitle>
          <div class="text-h6">Defect to release path</div>
          <div class="text-body-2 text-medium-emphasis">
            Backend-derived evidence across job card, sign-off, inspection, release, readiness, and
            audit.
          </div>
        </VCardTitle>
        <VCardText>
          <div class="release-path">
            <div v-for="step in releasePathSteps" :key="step.label" class="release-path__step">
              <div class="d-flex align-center justify-space-between ga-2">
                <div class="release-path__label">{{ step.label }}</div>
                <VChip :color="step.tone" size="x-small" variant="tonal">
                  {{ step.badge }}
                </VChip>
              </div>
              <div class="release-path__title">{{ step.title }}</div>
              <div class="release-path__meta">{{ step.meta }}</div>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VRow>
        <VCol cols="12" lg="8">
          <VCard border class="mb-4">
            <VCardTitle>Defect, assessment, and work package</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Defect</div>
                  <strong>{{
                    workPackage.primaryDefect?.title ?? 'No primary defect linked'
                  }}</strong>
                  <div class="text-caption text-medium-emphasis">
                    {{ workPackage.primaryDefectNumber ?? '-' }}
                  </div>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Assessment</div>
                  <strong>{{ ui.label(workPackage.primaryDefect?.assessmentDecision) }}</strong>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Package version</div>
                  <strong>{{ workPackage.version }}</strong>
                </VCol>
              </VRow>
              <VAlert
                v-if="workPackage.primaryDefect?.assessmentNote"
                type="info"
                variant="tonal"
                class="mt-4"
              >
                {{ workPackage.primaryDefect.assessmentNote }}
              </VAlert>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Job cards and immutable sign-offs</VCardTitle>
            <VCardText>
              <VExpansionPanels>
                <VExpansionPanel v-for="card in workPackage.jobCards" :key="card.id">
                  <VExpansionPanelTitle>
                    <div class="d-flex flex-wrap align-center ga-3 w-100">
                      <div>
                        <strong>{{ card.title }}</strong>
                        <div class="text-caption text-medium-emphasis">{{ card.cardNumber }}</div>
                      </div>
                      <VSpacer />
                      <VChip
                        :color="ui.jobCardStatusColor(card.status)"
                        size="small"
                        variant="tonal"
                      >
                        {{ ui.label(card.status) }}
                      </VChip>
                    </div>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <VRow>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Approved data</div>
                        <div class="font-weight-medium">
                          {{ card.maintenanceDataRef }} / {{ card.maintenanceDataRevision }}
                        </div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Mandatory</div>
                        <div>{{ card.mandatoryFlag ? 'Yes' : 'No' }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Independent inspection</div>
                        <div>
                          {{ card.requiresIndependentInspection ? 'Required' : 'Not required' }}
                        </div>
                      </VCol>
                    </VRow>
                    <VRow class="mt-2">
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Performer</div>
                        <div>{{ signoff(card, 'MECHANIC')?.actorRole ?? 'Mechanic pending' }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Execution state</div>
                        <div>{{ ui.label(card.status) }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Blocker</div>
                        <div>{{ jobCardBlocker(card) }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Required action</div>
                        <div>{{ jobCardRequiredAction(card) }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Created</div>
                        <div>{{ format.dateTime(card.createdAt) }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Updated</div>
                        <div>{{ format.dateTime(card.updatedAt) }}</div>
                      </VCol>
                    </VRow>

                    <VRow class="mt-2">
                      <VCol cols="12" md="6">
                        <div class="signoff-panel">
                          <div class="text-subtitle-2">Mechanic sign-off</div>
                          <template v-if="signoff(card, 'MECHANIC')">
                            <div>{{ signoff(card, 'MECHANIC')?.statement }}</div>
                            <div class="text-caption text-medium-emphasis mt-2">
                              {{ signoff(card, 'MECHANIC')?.actorRole }} /
                              {{ format.dateTime(signoff(card, 'MECHANIC')?.signedAt) }}
                            </div>
                          </template>
                          <div v-else class="text-medium-emphasis">Not signed.</div>
                        </div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="signoff-panel">
                          <div class="text-subtitle-2">Independent inspection</div>
                          <template v-if="signoff(card, 'INDEPENDENT_INSPECTION')">
                            <div>{{ signoff(card, 'INDEPENDENT_INSPECTION')?.statement }}</div>
                            <div class="text-caption text-medium-emphasis mt-2">
                              {{ signoff(card, 'INDEPENDENT_INSPECTION')?.actorRole }} /
                              {{
                                format.dateTime(signoff(card, 'INDEPENDENT_INSPECTION')?.signedAt)
                              }}
                            </div>
                          </template>
                          <div v-else class="text-medium-emphasis">Not completed.</div>
                        </div>
                      </VCol>
                    </VRow>

                    <div v-if="card.inspectionAttempts.length" class="mt-4">
                      <div class="text-subtitle-2 mb-2">Inspection attempts</div>
                      <VTable density="compact" class="inspection-table">
                        <thead>
                          <tr>
                            <th>Attempt</th>
                            <th>Cycle</th>
                            <th>Result</th>
                            <th>Finding</th>
                            <th>Inspector</th>
                            <th>Licence</th>
                            <th>Recorded</th>
                            <th>Record</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="attempt in card.inspectionAttempts" :key="attempt.id">
                            <td>{{ attempt.attemptNumber }}</td>
                            <td>{{ attempt.cycleNumber }}</td>
                            <td>
                              <VChip
                                :color="attempt.result === 'PASSED' ? 'success' : 'warning'"
                                size="x-small"
                                variant="tonal"
                              >
                                {{ ui.label(attempt.result) }}
                              </VChip>
                            </td>
                            <td>{{ attempt.finding }}</td>
                            <td>{{ attempt.inspectorRole }}</td>
                            <td>{{ attempt.inspectorLicenseNumber }}</td>
                            <td>{{ format.dateTime(attempt.inspectedAt) }}</td>
                            <td>
                              <VChip size="x-small" variant="tonal">Immutable</VChip>
                            </td>
                          </tr>
                        </tbody>
                      </VTable>
                    </div>

                    <div v-if="card.reworkActions.length" class="mt-4">
                      <div class="text-subtitle-2 mb-2">Rework actions</div>
                      <VCard
                        v-for="rework in card.reworkActions"
                        :id="rework.id"
                        :key="rework.id"
                        border
                        class="mb-3 rework-action"
                      >
                        <VCardText>
                          <div class="d-flex flex-wrap align-center ga-2 mb-3">
                            <strong>{{ rework.reworkNumber }}</strong>
                            <VChip size="x-small" variant="tonal">
                              Cycle {{ rework.cycleNumber }}
                            </VChip>
                            <VChip
                              :color="
                                rework.status === 'REINSPECTION_PASSED' ? 'success' : 'warning'
                              "
                              size="x-small"
                              variant="tonal"
                            >
                              {{ ui.label(rework.status) }}
                            </VChip>
                            <VChip size="x-small" variant="tonal">Immutable source</VChip>
                          </div>
                          <VRow>
                            <VCol cols="12" md="6">
                              <div class="text-caption text-medium-emphasis">Failed finding</div>
                              <div>{{ rework.finding }}</div>
                            </VCol>
                            <VCol cols="12" md="6">
                              <div class="text-caption text-medium-emphasis">Corrective action</div>
                              <div>
                                {{
                                  rework.correctiveActionDescription ||
                                    'Corrective work not signed.'
                                }}
                              </div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">Approved data</div>
                              <div>{{ rework.approvedDataRef || 'Pending' }}</div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">
                                Corrective sign-off
                              </div>
                              <div>
                                {{
                                  rework.mechanicSignoffAt
                                    ? `${rework.mechanicSignoffRole} / ${format.dateTime(
                                      rework.mechanicSignoffAt
                                    )}`
                                    : 'Pending'
                                }}
                              </div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">
                                Re-inspection result
                              </div>
                              <div>
                                {{
                                  rework.reinspectionAttemptId
                                    ? ui.label(rework.status)
                                    : 'Required after corrective sign-off'
                                }}
                              </div>
                            </VCol>
                          </VRow>

                          <div
                            v-if="
                              canWork &&
                                !immutablePackage &&
                                ['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS'].includes(
                                  rework.status
                                ) &&
                                reworkForms[rework.id]
                            "
                            class="mt-4"
                          >
                            <VRow>
                              <VCol cols="12">
                                <VTextarea
                                  v-model="reworkForms[rework.id].correctiveActionDescription"
                                  label="Corrective action description"
                                  rows="2"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSelect
                                  v-model="reworkForms[rework.id].certifyingLicenseNumber"
                                  label="Mechanic licence"
                                  :items="signerLicenses"
                                  item-value="licenseNumber"
                                  :item-title="signerLicenseTitle"
                                  density="compact"
                                  :loading="selectorsPending"
                                  no-data-text="No licence mapped to the active actor"
                                  variant="outlined"
                                />
                                <div class="text-caption text-medium-emphasis mt-1">
                                  {{
                                    authorizationSummary(
                                      'Corrective work sign-off',
                                      reworkForms[rework.id].certifyingLicenseNumber
                                    )
                                  }}
                                </div>
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="reworkForms[rework.id].approvedDataRef"
                                  label="Approved-data reference"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="reworkForms[rework.id].evidenceReferences"
                                  label="Evidence references"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VTextarea
                                  v-model="reworkForms[rework.id].statement"
                                  label="Mechanic sign-off statement"
                                  rows="2"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                            </VRow>
                            <VBtn
                              color="primary"
                              size="small"
                              :loading="actionLoading === `rework-${rework.id}`"
                              :disabled="
                                reworkForms[rework.id].correctiveActionDescription.length < 10 ||
                                  reworkForms[rework.id].approvedDataRef.length < 2 ||
                                  reworkForms[rework.id].statement.length < 10 ||
                                  !reworkForms[rework.id].certifyingLicenseNumber
                              "
                              @click="signCorrectiveWork(rework)"
                            >
                              Sign corrective work
                            </VBtn>
                          </div>
                        </VCardText>
                      </VCard>
                    </div>

                    <VDivider class="my-4" />
                    <div class="d-flex flex-wrap ga-2">
                      <VBtn
                        v-if="canWork && card.status === 'READY'"
                        size="small"
                        :loading="actionLoading === `start-${card.id}`"
                        :disabled="immutablePackage"
                        @click="start(card)"
                      >
                        Start work
                      </VBtn>
                      <VBtn
                        v-if="canSignCard(card)"
                        size="small"
                        color="primary"
                        :disabled="immutablePackage || !canSubmitWork"
                        :loading="actionLoading === `sign-${card.id}`"
                        @click="signWork(card)"
                      >
                        Mechanic sign-off
                      </VBtn>
                      <VBtn
                        v-if="canInspectCard(card)"
                        size="small"
                        color="success"
                        :disabled="immutablePackage"
                        :loading="actionLoading === `inspect-${card.id}`"
                        @click="
                          openInspectionDialog(card, activeRework(card) ? 'PASSED' : 'PASSED')
                        "
                      >
                        {{
                          activeRework(card)
                            ? 'Record re-inspection'
                            : 'Record independent inspection'
                        }}
                      </VBtn>
                      <VAlert
                        v-else-if="selfInspectionBlocked(card)"
                        type="info"
                        variant="tonal"
                        density="compact"
                      >
                        This actor signed the mechanic work, so independent inspection must be
                        performed by another authorized user.
                      </VAlert>
                    </div>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
              <VEmptyState v-if="!workPackage.jobCards.length" title="No job cards yet" />
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard v-if="canAddJobCard" border class="mb-4">
            <VCardTitle>Add job card</VCardTitle>
            <VCardText>
              <VTextField v-model="jobCardForm.title" label="Title" />
              <VTextField
                v-model="jobCardForm.maintenanceDataRef"
                label="Approved maintenance data reference"
              />
              <VTextField v-model="jobCardForm.maintenanceDataRevision" label="Revision snapshot" />
              <VSwitch v-model="jobCardForm.mandatoryFlag" label="Mandatory task" color="primary" />
              <VSwitch
                v-model="jobCardForm.requiresIndependentInspection"
                label="Requires independent inspection"
                color="primary"
              />
              <VBtn
                color="primary"
                :disabled="
                  jobCardForm.title.length < 5 || jobCardForm.maintenanceDataRef.length < 2
                "
                :loading="actionLoading === 'add-card'"
                @click="addJobCard"
              >
                Add job card
              </VBtn>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Action statements</VCardTitle>
            <VCardText>
              <VSelect
                v-model="workLicenseNumber"
                label="Mechanic licence"
                :items="signerLicenses"
                item-value="licenseNumber"
                :item-title="signerLicenseTitle"
                density="compact"
                :loading="selectorsPending"
                no-data-text="No licence mapped to the active actor"
                variant="outlined"
              />
              <VAlert type="success" variant="tonal" density="compact" class="mb-3">
                {{ authorizationSummary('Mechanic sign-off', workLicenseNumber) }}
              </VAlert>
              <VTextarea v-model="workStatement" label="Mechanic statement" rows="3" />
              <VAlert type="info" variant="tonal" density="compact">
                Independent inspection is blocked server-side if performed by the mechanic who
                signed the work.
              </VAlert>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Release checklist</VCardTitle>
            <VCardText>
              <VList density="compact">
                <VListItem title="Mandatory work complete">
                  <template #append>
                    <VIcon :color="checklist?.mandatoryWorkComplete ? 'success' : 'error'">
                      {{
                        checklist?.mandatoryWorkComplete ? 'mdi-check-circle' : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Independent inspections complete">
                  <template #append>
                    <VIcon :color="checklist?.independentInspectionsComplete ? 'success' : 'error'">
                      {{
                        checklist?.independentInspectionsComplete
                          ? 'mdi-check-circle'
                          : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Approved data available">
                  <template #append>
                    <VIcon :color="checklist?.approvedDataAvailable ? 'success' : 'error'">
                      {{
                        checklist?.approvedDataAvailable ? 'mdi-check-circle' : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Mechanic evidence complete">
                  <template #append>
                    <VIcon :color="checklist?.mechanicEvidenceComplete ? 'success' : 'error'">
                      {{
                        checklist?.mechanicEvidenceComplete
                          ? 'mdi-check-circle'
                          : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Linked grounding defect">
                  <template #subtitle>{{ linkedDefectDisposition() }}</template>
                </VListItem>
                <VListItem title="Open failed inspection/rework result">
                  <template #subtitle>
                    {{
                      hasOpenReworkBlocker(workPackage)
                        ? 'Release blocked until corrective work and re-inspection are complete.'
                        : 'No open failed-inspection rework blocker.'
                    }}
                  </template>
                </VListItem>
                <VListItem title="Signer licence required">
                  <template #subtitle>Selected during technical release confirmation.</template>
                </VListItem>
                <VListItem title="Current package version">
                  <template #subtitle>Version {{ workPackage.version }}</template>
                </VListItem>
                <VListItem title="Linked requirement scope">
                  <template #subtitle>
                    {{
                      workPackage.requirementScope?.length
                        ? `${workPackage.requirementScope.length} scoped requirement(s)`
                        : 'No scoped requirement links'
                    }}
                  </template>
                </VListItem>
                <VListItem title="Release eligibility">
                  <template #subtitle>
                    {{ releaseBlockers.length ? 'Release blocked' : 'Eligible for release review' }}
                  </template>
                </VListItem>
              </VList>
              <VAlert v-if="releaseBlockers.length" type="warning" variant="tonal" class="mt-3">
                <div class="font-weight-bold mb-2">Backend blockers</div>
                <ul class="mb-0">
                  <li
                    v-for="blocker in releaseBlockers"
                    :key="`${blocker.code}-${blocker.referenceId}`"
                  >
                    <strong>{{ blocker.message }}</strong>
                    <div class="text-caption">Required action: {{ blocker.requiredAction }}</div>
                  </li>
                </ul>
              </VAlert>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Technical release command</VCardTitle>
            <VCardText>
              <VAlert type="warning" variant="tonal" class="mb-4">
                Release is never automatic. Aircraft readiness is refreshed from backend state only
                after the command returns.
              </VAlert>
              <VBtn
                v-if="canRequestRelease && !immutablePackage"
                block
                class="mb-3"
                color="warning"
                :disabled="workPackage.status === 'READY_FOR_RELEASE'"
                :loading="actionLoading === 'request-release'"
                @click="requestRelease"
              >
                Request release review
              </VBtn>
              <VBtn
                v-if="canIssueRelease && workPackage.status === 'READY_FOR_RELEASE'"
                block
                color="success"
                :disabled="selectorsPending"
                @click="openReleaseDialog"
              >
                Issue technical release
              </VBtn>
              <VAlert v-if="!canIssueRelease" type="info" variant="tonal" density="compact">
                {{ ui.permissionHint(false, 'maintenance.release.issue', session.role.value) }}
              </VAlert>
            </VCardText>
          </VCard>

          <VCard v-if="workPackage.release" border class="mb-4">
            <VCardTitle>Signer authorization snapshot</VCardTitle>
            <VCardText>
              <VList density="compact">
                <VListItem title="Release" :subtitle="workPackage.release.releaseNumber" />
                <VListItem title="Signer" :subtitle="releaseSignerName(workPackage.release)" />
                <VListItem title="Licence" :subtitle="releaseSnapshotValue('licenseNumber')" />
                <VListItem
                  title="Licence status"
                  :subtitle="releaseSnapshotValue('licenseStatus')"
                />
                <VListItem
                  title="Company authorization"
                  :subtitle="releaseSnapshotValue('companyAuthorizationNumber')"
                />
                <VListItem title="Verification" :subtitle="releaseSnapshotValue('basis')" />
              </VList>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard border>
        <VCardTitle>Audit trail</VCardTitle>
        <VCardText>
          <VTimeline density="compact" side="end">
            <VTimelineItem
              v-for="record in workPackage.auditRecords ?? []"
              :key="record.id"
              size="small"
              dot-color="primary"
            >
              <div class="text-subtitle-2">{{ ui.label(record.action) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ record.actorRole }} / {{ format.dateTime(record.occurredAt) }}
              </div>
              <div class="text-caption">
                {{ auditEntityLabel(record) }}
              </div>
            </VTimelineItem>
          </VTimeline>
          <VEmptyState
            v-if="!(workPackage.auditRecords?.length ?? 0)"
            title="No package audit records"
          />
        </VCardText>
      </VCard>

      <VDialog v-model="inspectionDialog" max-width="760" persistent scrollable>
        <VCard>
          <VCardTitle class="d-flex align-start ga-3">
            <div>
              <h2 class="text-h6 mb-0">Independent inspection confirmation</h2>
              <div class="text-body-2 text-medium-emphasis">
                Record a passed inspection or a failed finding that opens corrective rework.
              </div>
            </div>
            <VSpacer />
            <VBtn
              icon="mdi-close"
              variant="text"
              :disabled="actionLoading.startsWith('inspect-')"
              @click="inspectionDialog = false"
            />
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VAlert type="success" variant="tonal" class="mb-4">
              {{
                authorizationSummary(
                  inspectionCard && activeRework(inspectionCard)
                    ? 'Independent re-inspection'
                    : 'Independent inspection',
                  inspectionForm.certifyingLicenseNumber
                )
              }}
            </VAlert>
            <VAlert v-if="failedInspectionResult" type="warning" variant="tonal" class="mb-4">
              <div class="font-weight-bold">Inspection failed — rework required</div>
              <div>
                The finding has been recorded and technical release is blocked until corrective work
                is completed and the required re-inspection passes.
              </div>
            </VAlert>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="inspectionCard?.cardNumber"
                  label="Job card"
                  readonly
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="inspectionIdempotencyKey"
                  label="Idempotency key"
                  readonly
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VBtnToggle
                  v-model="inspectionResult"
                  mandatory
                  divided
                  variant="outlined"
                  color="primary"
                >
                  <VBtn value="PASSED">Passed</VBtn>
                  <VBtn value="FAILED">Failed</VBtn>
                </VBtnToggle>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="inspectionForm.certifyingLicenseNumber"
                  label="Selected inspector licence"
                  :items="signerLicenses"
                  item-value="licenseNumber"
                  :item-title="signerLicenseTitle"
                  density="compact"
                  :loading="selectorsPending"
                  no-data-text="No licence mapped to the active actor"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="inspectionForm.inspectedAt"
                  label="Inspection timestamp"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="inspectionForm.statement"
                  :label="
                    inspectionResult === 'FAILED'
                      ? 'Finding / inspection statement'
                      : 'Inspection statement'
                  "
                  rows="4"
                  auto-grow
                  density="compact"
                  variant="outlined"
                  :hint="
                    inspectionResult === 'FAILED'
                      ? 'Required. A failed result creates or opens a linked rework action.'
                      : 'Required. A passed result closes the inspection blocker.'
                  "
                  persistent-hint
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="inspectionForm.evidenceReferences"
                  label="Evidence references, comma separated"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VCheckbox
                  v-model="inspectionConfirmed"
                  color="primary"
                  label="I confirm this inspection result is intentional and will be recorded as an immutable maintenance record."
                />
              </VCol>
            </VRow>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VSpacer />
            <VBtn
              variant="text"
              :disabled="actionLoading.startsWith('inspect-')"
              @click="inspectionDialog = false"
            >
              Close
            </VBtn>
            <VBtn
              color="primary"
              :loading="inspectionCard ? actionLoading === `inspect-${inspectionCard.id}` : false"
              :disabled="!canSubmitInspection"
              @click="submitInspection"
            >
              Record inspection
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="releaseDialog" max-width="880" persistent scrollable>
        <VCard class="release-dialog-card">
          <VCardTitle class="d-flex align-start ga-3 release-dialog-title">
            <div>
              <h2 class="text-h6 mb-0">Technical release confirmation</h2>
              <div class="text-body-2 text-medium-emphasis">
                Review backend-derived prerequisites before issuing the technical release.
              </div>
            </div>
            <VSpacer />
            <VBtn
              icon="mdi-close"
              variant="text"
              :disabled="actionLoading === 'issue-release'"
              @click="releaseDialog = false"
            />
          </VCardTitle>
          <VDivider />
          <VCardText class="release-dialog-body">
            <VAlert type="info" variant="tonal" class="mb-4">
              {{ authorizationWording }}
            </VAlert>
            <VAlert v-if="releaseCompleted" type="success" variant="tonal" class="mb-4">
              Technical release completed. Readiness and signer snapshot below are backend-derived
              after refresh.
            </VAlert>
            <div v-if="releaseCompleted" class="release-result mb-4">
              <div>
                <div class="text-caption text-medium-emphasis">Release</div>
                <strong>{{
                  workPackage.release?.releaseNumber ?? releaseForm.releaseNumber
                }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Aircraft</div>
                <strong>{{ workPackage.aircraftRegistrationNumber }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Work package</div>
                <strong>{{ workPackage.packageNumber }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Aircraft readiness</div>
                <strong>{{ ui.label(workPackage.aircraftTechnicalState) }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Released at</div>
                <strong>{{ format.dateTime(workPackage.releasedAt) }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Signer snapshot</div>
                <strong>
                  {{
                    workPackage.release
                      ? releaseSignerName(workPackage.release)
                      : selectedSignerLicense?.personnelName
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Selected licence</div>
                <strong>
                  {{
                    workPackage.release?.certifyingLicenseNumber ??
                      releaseForm.certifyingLicenseNumber
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Linked defect disposition</div>
                <strong>{{ linkedDefectDisposition() }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Requirement scope</div>
                <strong>
                  {{
                    workPackage.requirementScope?.length
                      ? `${workPackage.requirementScope.length} scoped`
                      : 'No scoped links'
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Audit reference</div>
                <strong>{{ workPackage.auditRecords?.[0]?.id ?? '-' }}</strong>
              </div>
            </div>
            <VAlert v-if="releaseUncertain" type="warning" variant="tonal" class="mb-4">
              Network/API response was uncertain. Retry only with the same idempotency key or
              refresh before sending a materially different command.
            </VAlert>
            <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
              <strong>{{ actionError.title }}</strong>
              <div>{{ actionError.impact }}</div>
              <div class="text-caption">Required action: {{ actionError.requiredAction }}</div>
              <div v-if="actionError.referenceId" class="text-caption">
                Reference: {{ actionError.referenceId }}
              </div>
            </VAlert>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="workPackage.version"
                  label="Work-package version"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="releaseIdempotencyKey"
                  label="Idempotency key for this command"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="releaseForm.releaseNumber"
                  label="Release number"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.resultingStatus"
                  label="Resulting technical status"
                  :items="releaseStatusItems"
                  density="compact"
                  hide-details
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="releaseForm.releasedAt"
                  label="Released at"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.certifyingLicenseNumber"
                  label="Selected signer licence"
                  :items="signerLicenses"
                  item-value="licenseNumber"
                  :item-title="signerLicenseTitle"
                  density="compact"
                  hide-details
                  :loading="selectorsPending"
                  no-data-text="No licence mapped to the active actor"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="releaseForm.releaseStatement"
                  label="Release statement"
                  auto-grow
                  density="compact"
                  hide-details
                  rows="3"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="releaseForm.evidenceReferences"
                  label="Evidence references, comma separated"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
            </VRow>

            <VRow>
              <VCol cols="12" md="6">
                <VCard variant="tonal">
                  <VCardTitle class="text-subtitle-2">Release prerequisites</VCardTitle>
                  <VCardText>
                    <VList density="compact">
                      <VListItem
                        title="Aircraft"
                        :subtitle="workPackage.aircraftRegistrationNumber"
                      />
                      <VListItem title="Work package" :subtitle="workPackage.packageNumber" />
                      <VListItem title="Package version" :subtitle="String(workPackage.version)" />
                      <VListItem title="Linked defects" :subtitle="linkedDefectDisposition()" />
                      <VListItem
                        title="Mandatory work completion"
                        :subtitle="checklist?.mandatoryWorkComplete ? 'Complete' : 'Blocked'"
                      />
                      <VListItem
                        title="Inspection completion"
                        :subtitle="
                          checklist?.independentInspectionsComplete ? 'Complete' : 'Blocked'
                        "
                      />
                      <VListItem
                        title="Approved-data availability"
                        :subtitle="checklist?.approvedDataAvailable ? 'Available' : 'Missing'"
                      />
                      <VListItem
                        title="Linked defect state"
                        :subtitle="ui.label(workPackage.primaryDefect?.status)"
                      />
                      <VListItem
                        title="Linked requirement scope"
                        :subtitle="
                          workPackage.requirementScope?.length
                            ? `${workPackage.requirementScope.length} scoped requirement(s)`
                            : 'No scoped requirement links'
                        "
                      />
                    </VList>
                  </VCardText>
                </VCard>
              </VCol>
              <VCol cols="12" md="6">
                <VCard variant="tonal">
                  <VCardTitle class="text-subtitle-2">Signer licence</VCardTitle>
                  <VCardText>
                    <template v-if="selectedSignerLicense">
                      <div class="font-weight-bold">{{ selectedSignerLicense.personnelName }}</div>
                      <div>{{ selectedSignerLicense.licenseNumber }}</div>
                      <div class="text-caption">
                        {{ selectedSignerLicense.status }} / valid until
                        {{ selectedSignerLicense.expiryDate ?? '-' }}
                      </div>
                      <div class="text-caption">{{ selectedSignerLicense.scopeSummary }}</div>
                      <VAlert type="success" variant="tonal" density="compact" class="mt-3">
                        {{
                          authorizationSummary(
                            'Technical Release',
                            releaseForm.certifyingLicenseNumber
                          )
                        }}
                      </VAlert>
                      <VAlert
                        v-if="!selectedSignerLicense.isUsableNow"
                        type="warning"
                        variant="tonal"
                        density="compact"
                        class="mt-3"
                      >
                        This licence is not usable at the selected release time. The release command
                        will be rejected.
                      </VAlert>
                    </template>
                    <div v-else class="text-medium-emphasis">
                      Select a licence mapped to the active actor.
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VBtn
              variant="text"
              :disabled="actionLoading === 'issue-release'"
              @click="releaseDialog = false"
            >
              Close
            </VBtn>
            <VSpacer />
            <VBtn
              color="success"
              :loading="actionLoading === 'issue-release'"
              :disabled="!canSubmitRelease || releaseCompleted"
              @click="issueRelease"
            >
              {{ releaseCompleted ? 'Release completed' : 'Issue technical release' }}
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>

<style scoped>
.maintenance-detail {
  --mro-border: rgba(var(--v-border-color), var(--v-border-opacity));
}

.release-dialog-card {
  max-height: calc(100dvh - 32px);
}

.release-dialog-title {
  padding-bottom: 10px;
}

.release-dialog-body {
  padding-top: 16px;
}

.release-path {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 8px;
}

.release-path__step,
.signoff-panel,
.release-result {
  border: 1px solid var(--mro-border);
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
}

.release-path__step {
  min-height: 132px;
  padding: 12px;
}

.release-path__label {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.release-path__title {
  margin-top: 10px;
  font-weight: 700;
  line-height: 1.25;
}

.release-path__meta {
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.78rem;
  line-height: 1.35;
}

.signoff-panel {
  min-height: 144px;
  padding: 14px;
}

.release-result {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
}

@media (max-width: 960px) {
  .release-path,
  .release-result {
    grid-template-columns: 1fr;
  }
}
</style>
