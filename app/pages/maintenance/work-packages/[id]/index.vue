<script setup lang="ts">
import type { MaintenanceErrorPresentation } from '../../../../composables/useMaintenanceUi';
import type {
  MaintenanceJobCardDto,
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import { demoRoleActorIds } from '#shared/types/roles';

const authorizationWording = 'Lisensi dan wewenang PT AMA terverifikasi.';

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
  { title: 'Serviceable dengan pembatasan', value: 'SERVICEABLE_WITH_RESTRICTIONS' }
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
      label: 'Temuan',
      title: item?.primaryDefect?.title ?? 'Tidak ada temuan utama',
      meta: item?.primaryDefectNumber ?? item?.primaryDefect?.sourceReference ?? '-',
      badge: item?.primaryDefect ? ui.label(item.primaryDefect.status) : 'Belum ada',
      tone: item?.primaryDefect ? 'success' : 'warning'
    },
    {
      label: 'Paket kerja',
      title: item?.title ?? '-',
      meta: item?.packageNumber ?? '-',
      badge: item?.status ? ui.label(item.status) : 'Belum ada',
      tone: item ? ui.workPackageStatusColor(item.status) : 'secondary'
    },
    {
      label: 'Kartu kerja',
      title: card?.title ?? 'Belum ada kartu kerja',
      meta: card?.cardNumber ?? '-',
      badge: card ? ui.label(card.status) : 'Belum ada',
      tone: card ? ui.jobCardStatusColor(card.status) : 'warning'
    },
    {
      label: 'Pengesahan',
      title: mechanic ? 'Pekerjaan teknisi sudah disahkan' : 'Menunggu pengesahan teknisi',
      meta: mechanic ? `${mechanic.actorRole} / ${format.dateTime(mechanic.signedAt)}` : '-',
      badge: mechanic ? 'Selesai' : 'Menunggu',
      tone: mechanic ? 'success' : 'warning'
    },
    {
      label: 'Pemeriksaan',
      title: inspection ? 'Pemeriksaan independen lulus' : 'Menunggu pemeriksaan',
      meta: inspection ? `${inspection.actorRole} / ${format.dateTime(inspection.signedAt)}` : '-',
      badge: inspection
        ? 'Lulus'
        : card?.requiresIndependentInspection
          ? 'Menunggu'
          : 'Tidak wajib',
      tone: inspection ? 'success' : card?.requiresIndependentInspection ? 'warning' : 'secondary'
    },
    {
      label: 'Rilis teknis',
      title:
        item?.release?.releaseNumber ??
        (item?.status === 'READY_FOR_RELEASE' ? 'Siap diterbitkan' : 'Belum diterbitkan'),
      meta: item?.releasedAt
        ? format.dateTime(item.releasedAt)
        : item?.status
          ? ui.label(item.status)
          : '-',
      badge: item?.release ? 'Terbit' : item?.status === 'READY_FOR_RELEASE' ? 'Siap' : 'Menunggu',
      tone: item?.release
        ? 'success'
        : item?.status === 'READY_FOR_RELEASE'
          ? 'warning'
          : 'secondary'
    },
    {
      label: 'Kesiapan',
      title: ui.label(item?.aircraftTechnicalState),
      meta: ui.label(item?.aircraftTechnicalEligibility),
      badge: ui.label(item?.aircraftTechnicalState),
      tone: ui.technicalStateColor(item?.aircraftTechnicalState)
    },
    {
      label: 'Riwayat',
      title: `${item?.auditRecords?.length ?? 0} tindakan tercatat`,
      meta: item?.auditRecords?.[0] ? format.dateTime(item.auditRecords[0].occurredAt) : '-',
      badge: item?.auditRecords?.length ? 'Tercatat' : 'Menunggu',
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
  if (!license) {
    return 'Pilih lisensi personel yang valid. Sistem akan memeriksa ulang lisensi dan wewenang saat tindakan dikirim.';
  }
  return `${authorizationWording} Tindakan: ${action}. Scope: ${license.scopeSummary}`;
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
    return 'Catatan lama - snapshot wewenang PT AMA tidak tersedia.';
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
    record.afterVersion === null ? 'Versi tidak berubah' : `Versi ${record.afterVersion}`;
  return `${ui.label(record.entityType)} / ${version}`;
}

function jobCardBlocker(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Pekerjaan belum dimulai.';
  if (card.status === 'IN_PROGRESS') return 'Menunggu pengesahan teknisi.';
  if (card.status === 'REJECTED_FOR_REWORK') {
    return 'Pemeriksaan tidak lulus dan membutuhkan perbaikan ulang.';
  }
  if (card.status === 'INSPECTION_REQUIRED') return 'Menunggu pemeriksaan independen.';
  if (card.status === 'READY_FOR_RELEASE_REVIEW') return 'Tidak ada penghambat kartu kerja.';
  return ui.label(card.status);
}

function jobCardRequiredAction(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Mulai pekerjaan dan isi pernyataan teknisi.';
  if (card.status === 'IN_PROGRESS') return 'Selesaikan pengesahan teknisi dengan bukti.';
  if (card.status === 'REJECTED_FOR_REWORK') return 'Selesaikan perbaikan ulang yang terkait.';
  if (card.status === 'INSPECTION_REQUIRED') {
    return 'Tugaskan inspector independen yang bukan teknisi pengesah pekerjaan.';
  }
  if (card.status === 'READY_FOR_RELEASE_REVIEW') return 'Masukkan ke pemeriksaan kesiapan rilis.';
  return 'Buka riwayat aktivitas sebelum tindakan lanjutan.';
}

function linkedDefectDisposition() {
  const defect = workPackage.value?.primaryDefect;
  if (!defect) return 'Tidak ada temuan terkait.';
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
      : `Pemeriksaan independen lulus untuk ${card.cardNumber} dengan bukti yang diperlukan.`;
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
          ? 'Pemeriksaan independen lulus. Kesiapan rilis diperbarui dari status backend.'
          : 'Pemeriksaan ulang lulus. Kesiapan rilis diperbarui dari status backend.';
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
    `Rilis teknis diterbitkan untuk ${workPackage.value.packageNumber} setelah pekerjaan wajib, bukti, dan catatan pemeriksaan independen diperiksa.`;
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
    actionSuccess.value = 'Rilis teknis diterima. Kesiapan pesawat diperbarui dari status backend.';
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
      <VBtn to="/maintenance" prepend-icon="mdi-arrow-left" variant="text">
        Ringkasan Maintenance
      </VBtn>
      <VSpacer />
      <VBtn to="/maintenance/work-packages" variant="text">Paket Pekerjaan</VBtn>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Paket pekerjaan belum dapat dimuat.
    </VAlert>
    <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
      <strong>{{ actionError.title }}</strong>
      <div>{{ actionError.impact }}</div>
      <div class="text-caption">Langkah berikutnya: {{ actionError.requiredAction }}</div>
      <div v-if="actionError.referenceId" class="text-caption">
        Referensi: {{ actionError.referenceId }}
      </div>
      <div v-if="actionError.requestId" class="text-caption">
        Request: {{ actionError.requestId }}
      </div>
    </VAlert>
    <VAlert v-if="actionSuccess" type="success" variant="tonal" class="mb-4">
      {{ actionSuccess }}
    </VAlert>
    <VAlert v-if="failedInspectionResult" type="warning" variant="tonal" class="mb-4">
      <div class="font-weight-bold">Pemeriksaan tidak lulus - perbaikan ulang diperlukan</div>
      <div>
        Temuan pemeriksaan sudah dicatat. Rilis teknis diblokir sampai perbaikan ulang selesai dan
        pemeriksaan ulang dinyatakan lulus.
      </div>
      <div class="d-flex flex-wrap ga-2 mt-3">
        <VBtn
          v-if="failedInspectionResult.reworkActionId"
          size="small"
          variant="tonal"
          :href="`#${failedInspectionResult.reworkActionId}`"
        >
          Buka Perbaikan Ulang
        </VBtn>
        <VBtn
          size="small"
          variant="tonal"
          :to="`/maintenance/records?package=${failedInspectionResult.packageNumber}&search=${failedInspectionResult.attemptId}`"
        >
          Lihat Catatan Pemeriksaan
        </VBtn>
        <VBtn
          size="small"
          variant="tonal"
          :to="`/maintenance/records?package=${failedInspectionResult.packageNumber}`"
        >
          Lihat Riwayat Aktivitas
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
              <div class="text-caption text-medium-emphasis">Pesawat</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ workPackage.aircraftRegistrationNumber }}
              </div>
              <div class="text-caption">
                {{ workPackage.aircraftType ?? '-' }} / {{ workPackage.aircraftModel ?? '-' }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Sumber temuan</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ workPackage.primaryDefect?.title ?? 'Tidak ada temuan utama' }}
              </div>
              <div class="text-caption">
                {{
                  workPackage.primaryDefect?.defectNumber ?? workPackage.primaryDefectNumber ?? '-'
                }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Sumber flight / technical log</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ sourceContextLabel }}
              </div>
              <div class="text-caption">Konteks read-only dari sistem</div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Pelaksanaan</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ ui.label(workPackage.executionMode) }}
              </div>
              <div class="text-caption">
                {{ workPackage.vendorName ?? 'Pelaksanaan internal' }}
              </div>
            </VCol>
          </VRow>
          <VDivider class="my-4" />
          <VRow>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Prioritas</div>
              <strong>{{ ui.label(workPackage.priority) }}</strong>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Dampak teknis</div>
              <strong>{{ ui.label(workPackage.aircraftTechnicalState) }}</strong>
              <div class="text-caption">
                {{ ui.label(workPackage.aircraftTechnicalEligibility) }}
              </div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Versi / diperbarui</div>
              <strong>Versi {{ workPackage.version }}</strong>
              <div class="text-caption">{{ format.dateTime(workPackage.updatedAt) }}</div>
            </VCol>
            <VCol cols="12" md="3">
              <div class="text-caption text-medium-emphasis">Penanggung jawab</div>
              <strong>{{ packageOwner }}</strong>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard border class="mb-4">
        <VCardTitle>
          <div class="text-h6">Alur temuan sampai rilis</div>
          <div class="text-body-2 text-medium-emphasis">
            Bukti dari backend untuk kartu kerja, pengesahan, pemeriksaan, rilis, kesiapan, dan
            riwayat aktivitas.
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
            <VCardTitle>Temuan, penilaian, dan paket pekerjaan</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Temuan</div>
                  <strong>{{
                    workPackage.primaryDefect?.title ?? 'Tidak ada temuan utama'
                  }}</strong>
                  <div class="text-caption text-medium-emphasis">
                    {{ workPackage.primaryDefectNumber ?? '-' }}
                  </div>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Penilaian</div>
                  <strong>{{ ui.label(workPackage.primaryDefect?.assessmentDecision) }}</strong>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-caption text-medium-emphasis">Versi paket</div>
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
            <VCardTitle>Kartu kerja dan pengesahan permanen</VCardTitle>
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
                        <div class="text-caption text-medium-emphasis">
                          Approved maintenance data
                        </div>
                        <div class="font-weight-medium">
                          {{ card.maintenanceDataRef }} / {{ card.maintenanceDataRevision }}
                        </div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Wajib</div>
                        <div>{{ card.mandatoryFlag ? 'Ya' : 'Tidak' }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Pemeriksaan independen</div>
                        <div>
                          {{ card.requiresIndependentInspection ? 'Wajib' : 'Tidak wajib' }}
                        </div>
                      </VCol>
                    </VRow>
                    <VRow class="mt-2">
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Pelaksana</div>
                        <div>
                          {{ signoff(card, 'MECHANIC')?.actorRole ?? 'Menunggu teknisi' }}
                        </div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Status pekerjaan</div>
                        <div>{{ ui.label(card.status) }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Penghambat</div>
                        <div>{{ jobCardBlocker(card) }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Langkah berikutnya</div>
                        <div>{{ jobCardRequiredAction(card) }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Dibuat</div>
                        <div>{{ format.dateTime(card.createdAt) }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Diperbarui</div>
                        <div>{{ format.dateTime(card.updatedAt) }}</div>
                      </VCol>
                    </VRow>

                    <VRow class="mt-2">
                      <VCol cols="12" md="6">
                        <div class="signoff-panel">
                          <div class="text-subtitle-2">Pengesahan teknisi</div>
                          <template v-if="signoff(card, 'MECHANIC')">
                            <div>{{ signoff(card, 'MECHANIC')?.statement }}</div>
                            <div class="text-caption text-medium-emphasis mt-2">
                              {{ signoff(card, 'MECHANIC')?.actorRole }} /
                              {{ format.dateTime(signoff(card, 'MECHANIC')?.signedAt) }}
                            </div>
                          </template>
                          <div v-else class="text-medium-emphasis">Belum disahkan.</div>
                        </div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="signoff-panel">
                          <div class="text-subtitle-2">Pemeriksaan independen</div>
                          <template v-if="signoff(card, 'INDEPENDENT_INSPECTION')">
                            <div>{{ signoff(card, 'INDEPENDENT_INSPECTION')?.statement }}</div>
                            <div class="text-caption text-medium-emphasis mt-2">
                              {{ signoff(card, 'INDEPENDENT_INSPECTION')?.actorRole }} /
                              {{
                                format.dateTime(signoff(card, 'INDEPENDENT_INSPECTION')?.signedAt)
                              }}
                            </div>
                          </template>
                          <div v-else class="text-medium-emphasis">Belum selesai.</div>
                        </div>
                      </VCol>
                    </VRow>

                    <div v-if="card.inspectionAttempts.length" class="mt-4">
                      <div class="text-subtitle-2 mb-2">Riwayat pemeriksaan</div>
                      <VTable density="compact" class="inspection-table">
                        <thead>
                          <tr>
                            <th>Attempt</th>
                            <th>Siklus</th>
                            <th>Hasil</th>
                            <th>Temuan</th>
                            <th>Inspector</th>
                            <th>Lisensi</th>
                            <th>Dicatat</th>
                            <th>Catatan</th>
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
                              <VChip size="x-small" variant="tonal">Permanen</VChip>
                            </td>
                          </tr>
                        </tbody>
                      </VTable>
                    </div>

                    <div v-if="card.reworkActions.length" class="mt-4">
                      <div class="text-subtitle-2 mb-2">Perbaikan ulang</div>
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
                              Siklus {{ rework.cycleNumber }}
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
                            <VChip size="x-small" variant="tonal">Sumber permanen</VChip>
                          </div>
                          <VRow>
                            <VCol cols="12" md="6">
                              <div class="text-caption text-medium-emphasis">
                                Temuan tidak lulus
                              </div>
                              <div>{{ rework.finding }}</div>
                            </VCol>
                            <VCol cols="12" md="6">
                              <div class="text-caption text-medium-emphasis">
                                Tindakan perbaikan
                              </div>
                              <div>
                                {{
                                  rework.correctiveActionDescription ||
                                    'Perbaikan ulang belum disahkan.'
                                }}
                              </div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">
                                Approved maintenance data
                              </div>
                              <div>{{ rework.approvedDataRef || 'Menunggu' }}</div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">
                                Pengesahan perbaikan
                              </div>
                              <div>
                                {{
                                  rework.mechanicSignoffAt
                                    ? `${rework.mechanicSignoffRole} / ${format.dateTime(
                                      rework.mechanicSignoffAt
                                    )}`
                                    : 'Menunggu'
                                }}
                              </div>
                            </VCol>
                            <VCol cols="12" md="4">
                              <div class="text-caption text-medium-emphasis">
                                Hasil pemeriksaan ulang
                              </div>
                              <div>
                                {{
                                  rework.reinspectionAttemptId
                                    ? ui.label(rework.status)
                                    : 'Wajib setelah pengesahan perbaikan'
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
                                  label="Deskripsi tindakan perbaikan"
                                  rows="2"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSelect
                                  v-model="reworkForms[rework.id].certifyingLicenseNumber"
                                  label="Lisensi teknisi"
                                  :items="signerLicenses"
                                  item-value="licenseNumber"
                                  :item-title="signerLicenseTitle"
                                  density="compact"
                                  :loading="selectorsPending"
                                  no-data-text="Tidak ada lisensi untuk aktor aktif"
                                  variant="outlined"
                                />
                                <div class="text-caption text-medium-emphasis mt-1">
                                  {{
                                    authorizationSummary(
                                      'Pengesahan perbaikan ulang',
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
                                  label="Referensi bukti"
                                  density="compact"
                                  variant="outlined"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VTextarea
                                  v-model="reworkForms[rework.id].statement"
                                  label="Pernyataan pengesahan teknisi"
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
                              Sahkan perbaikan ulang
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
                        Mulai pekerjaan
                      </VBtn>
                      <VBtn
                        v-if="canSignCard(card)"
                        size="small"
                        color="primary"
                        :disabled="immutablePackage || !canSubmitWork"
                        :loading="actionLoading === `sign-${card.id}`"
                        @click="signWork(card)"
                      >
                        Sahkan pekerjaan
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
                            ? 'Catat pemeriksaan ulang'
                            : 'Catat pemeriksaan independen'
                        }}
                      </VBtn>
                      <VAlert
                        v-else-if="selfInspectionBlocked(card)"
                        type="info"
                        variant="tonal"
                        density="compact"
                      >
                        Aktor ini mengesahkan pekerjaan teknisi, sehingga pemeriksaan independen
                        harus dilakukan oleh personel berwenang yang berbeda.
                      </VAlert>
                    </div>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
              <VEmptyState v-if="!workPackage.jobCards.length" title="Belum ada kartu kerja" />
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard v-if="canAddJobCard" border class="mb-4">
            <VCardTitle>Tambah kartu kerja</VCardTitle>
            <VCardText>
              <VTextField v-model="jobCardForm.title" label="Judul" />
              <VTextField
                v-model="jobCardForm.maintenanceDataRef"
                label="Approved maintenance data reference"
              />
              <VTextField v-model="jobCardForm.maintenanceDataRevision" label="Revision snapshot" />
              <VSwitch
                v-model="jobCardForm.mandatoryFlag"
                label="Pekerjaan wajib"
                color="primary"
              />
              <VSwitch
                v-model="jobCardForm.requiresIndependentInspection"
                label="Wajib pemeriksaan independen"
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
                Tambah kartu kerja
              </VBtn>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Pernyataan tindakan</VCardTitle>
            <VCardText>
              <VSelect
                v-model="workLicenseNumber"
                label="Lisensi teknisi"
                :items="signerLicenses"
                item-value="licenseNumber"
                :item-title="signerLicenseTitle"
                density="compact"
                :loading="selectorsPending"
                no-data-text="Tidak ada lisensi untuk aktor aktif"
                variant="outlined"
              />
              <VAlert type="success" variant="tonal" density="compact" class="mb-3">
                {{ authorizationSummary('Pengesahan pekerjaan teknisi', workLicenseNumber) }}
              </VAlert>
              <VTextarea v-model="workStatement" label="Pernyataan teknisi" rows="3" />
              <VAlert type="info" variant="tonal" density="compact">
                Pemeriksaan independen akan ditolak oleh backend bila dilakukan oleh teknisi yang
                mengesahkan pekerjaan.
              </VAlert>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Kesiapan rilis</VCardTitle>
            <VCardText>
              <VList density="compact">
                <VListItem title="Seluruh pekerjaan wajib selesai">
                  <template #append>
                    <VIcon :color="checklist?.mandatoryWorkComplete ? 'success' : 'error'">
                      {{
                        checklist?.mandatoryWorkComplete ? 'mdi-check-circle' : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Pemeriksaan independen selesai">
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
                <VListItem title="Approved data tersedia">
                  <template #append>
                    <VIcon :color="checklist?.approvedDataAvailable ? 'success' : 'error'">
                      {{
                        checklist?.approvedDataAvailable ? 'mdi-check-circle' : 'mdi-alert-circle'
                      }}
                    </VIcon>
                  </template>
                </VListItem>
                <VListItem title="Bukti teknisi lengkap">
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
                <VListItem title="Temuan grounding terkait">
                  <template #subtitle>{{ linkedDefectDisposition() }}</template>
                </VListItem>
                <VListItem title="Pemeriksaan tidak lulus / rework terbuka">
                  <template #subtitle>
                    {{
                      hasOpenReworkBlocker(workPackage)
                        ? 'Rilis diblokir sampai perbaikan ulang dan pemeriksaan ulang selesai.'
                        : 'Tidak ada blocker rework dari pemeriksaan tidak lulus.'
                    }}
                  </template>
                </VListItem>
                <VListItem title="Lisensi signer wajib">
                  <template #subtitle>Dipilih saat konfirmasi rilis teknis.</template>
                </VListItem>
                <VListItem title="Versi paket saat ini">
                  <template #subtitle>Versi {{ workPackage.version }}</template>
                </VListItem>
                <VListItem title="Scope requirement terkait">
                  <template #subtitle>
                    {{
                      workPackage.requirementScope?.length
                        ? `${workPackage.requirementScope.length} requirement terkait`
                        : 'Tidak ada requirement terkait'
                    }}
                  </template>
                </VListItem>
                <VListItem title="Kelayakan rilis">
                  <template #subtitle>
                    {{ releaseBlockers.length ? 'Rilis terblokir' : 'Layak untuk review rilis' }}
                  </template>
                </VListItem>
              </VList>
              <VAlert v-if="releaseBlockers.length" type="warning" variant="tonal" class="mt-3">
                <div class="font-weight-bold mb-2">Penghambat dari sistem</div>
                <ul class="mb-0">
                  <li
                    v-for="blocker in releaseBlockers"
                    :key="`${blocker.code}-${blocker.referenceId}`"
                  >
                    <strong>{{ blocker.message }}</strong>
                    <div class="text-caption">
                      Langkah berikutnya: {{ ui.operationalAction(blocker.requiredAction) }}
                    </div>
                  </li>
                </ul>
              </VAlert>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle>Perintah rilis teknis</VCardTitle>
            <VCardText>
              <VAlert type="warning" variant="tonal" class="mb-4">
                Rilis tidak pernah otomatis. Kesiapan pesawat hanya diperbarui dari backend setelah
                perintah berhasil.
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
                Ajukan review rilis
              </VBtn>
              <VBtn
                v-if="canIssueRelease && workPackage.status === 'READY_FOR_RELEASE'"
                block
                color="success"
                :disabled="selectorsPending"
                @click="openReleaseDialog"
              >
                Terbitkan rilis teknis
              </VBtn>
              <VAlert v-if="!canIssueRelease" type="info" variant="tonal" density="compact">
                {{ ui.permissionHint(false, 'maintenance.release.issue', session.role.value) }}
              </VAlert>
            </VCardText>
          </VCard>

          <VCard v-if="workPackage.release" border class="mb-4">
            <VCardTitle>Snapshot wewenang signer</VCardTitle>
            <VCardText>
              <VList density="compact">
                <VListItem title="Rilis" :subtitle="workPackage.release.releaseNumber" />
                <VListItem title="Signer" :subtitle="releaseSignerName(workPackage.release)" />
                <VListItem title="Lisensi" :subtitle="releaseSnapshotValue('licenseNumber')" />
                <VListItem
                  title="Status lisensi"
                  :subtitle="releaseSnapshotValue('licenseStatus')"
                />
                <VListItem
                  title="Wewenang PT AMA"
                  :subtitle="releaseSnapshotValue('companyAuthorizationNumber')"
                />
                <VListItem title="Verifikasi" :subtitle="releaseSnapshotValue('basis')" />
              </VList>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard border>
        <VCardTitle>Riwayat aktivitas</VCardTitle>
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
            title="Belum ada riwayat paket"
          />
        </VCardText>
      </VCard>

      <VDialog v-model="inspectionDialog" max-width="760" persistent scrollable>
        <VCard>
          <VCardTitle class="d-flex align-start ga-3">
            <div>
              <h2 class="text-h6 mb-0">Konfirmasi pemeriksaan independen</h2>
              <div class="text-body-2 text-medium-emphasis">
                Catat pemeriksaan lulus, atau temuan tidak lulus yang membuka perbaikan ulang.
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
              <div class="font-weight-bold">
                Pemeriksaan tidak lulus - perbaikan ulang diperlukan
              </div>
              <div>
                Temuan sudah dicatat. Rilis teknis diblokir sampai perbaikan ulang selesai dan
                pemeriksaan ulang lulus.
              </div>
            </VAlert>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="inspectionCard?.cardNumber"
                  label="Kartu kerja"
                  readonly
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="inspectionIdempotencyKey"
                  label="Referensi teknis perintah"
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
                  <VBtn value="PASSED">Lulus</VBtn>
                  <VBtn value="FAILED">Tidak lulus</VBtn>
                </VBtnToggle>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="inspectionForm.certifyingLicenseNumber"
                  label="Lisensi inspector"
                  :items="signerLicenses"
                  item-value="licenseNumber"
                  :item-title="signerLicenseTitle"
                  density="compact"
                  :loading="selectorsPending"
                  no-data-text="Tidak ada lisensi untuk aktor aktif"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="inspectionForm.inspectedAt"
                  label="Waktu pemeriksaan"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="inspectionForm.statement"
                  :label="
                    inspectionResult === 'FAILED'
                      ? 'Temuan / pernyataan pemeriksaan'
                      : 'Pernyataan pemeriksaan'
                  "
                  rows="4"
                  auto-grow
                  density="compact"
                  variant="outlined"
                  :hint="
                    inspectionResult === 'FAILED'
                      ? 'Wajib. Hasil tidak lulus akan membuat atau membuka perbaikan ulang terkait.'
                      : 'Wajib. Hasil lulus menutup blocker pemeriksaan.'
                  "
                  persistent-hint
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="inspectionForm.evidenceReferences"
                  label="Referensi bukti, pisahkan dengan koma"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VCheckbox
                  v-model="inspectionConfirmed"
                  color="primary"
                  label="Saya mengonfirmasi hasil pemeriksaan ini benar dan akan dicatat permanen."
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
              Tutup
            </VBtn>
            <VBtn
              color="primary"
              :loading="inspectionCard ? actionLoading === `inspect-${inspectionCard.id}` : false"
              :disabled="!canSubmitInspection"
              @click="submitInspection"
            >
              Catat pemeriksaan
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="releaseDialog" max-width="880" persistent scrollable>
        <VCard class="release-dialog-card">
          <VCardTitle class="d-flex align-start ga-3 release-dialog-title">
            <div>
              <h2 class="text-h6 mb-0">Konfirmasi rilis teknis pesawat</h2>
              <div class="text-body-2 text-medium-emphasis">
                Periksa prasyarat dari backend sebelum menerbitkan rilis teknis.
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
              Rilis teknis selesai. Kesiapan pesawat dan snapshot signer di bawah ini berasal dari
              backend setelah refresh.
            </VAlert>
            <div v-if="releaseCompleted" class="release-result mb-4">
              <div>
                <div class="text-caption text-medium-emphasis">Rilis</div>
                <strong>{{
                  workPackage.release?.releaseNumber ?? releaseForm.releaseNumber
                }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Pesawat</div>
                <strong>{{ workPackage.aircraftRegistrationNumber }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Paket pekerjaan</div>
                <strong>{{ workPackage.packageNumber }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Kesiapan pesawat</div>
                <strong>{{ ui.label(workPackage.aircraftTechnicalState) }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Waktu rilis</div>
                <strong>{{ format.dateTime(workPackage.releasedAt) }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Snapshot signer</div>
                <strong>
                  {{
                    workPackage.release
                      ? releaseSignerName(workPackage.release)
                      : selectedSignerLicense?.personnelName
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Lisensi dipilih</div>
                <strong>
                  {{
                    workPackage.release?.certifyingLicenseNumber ??
                      releaseForm.certifyingLicenseNumber
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Status temuan terkait</div>
                <strong>{{ linkedDefectDisposition() }}</strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Scope requirement</div>
                <strong>
                  {{
                    workPackage.requirementScope?.length
                      ? `${workPackage.requirementScope.length} terkait`
                      : 'Tidak ada scope terkait'
                  }}
                </strong>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Referensi audit</div>
                <strong>{{ workPackage.auditRecords?.[0]?.id ?? '-' }}</strong>
              </div>
            </div>
            <VAlert v-if="releaseUncertain" type="warning" variant="tonal" class="mb-4">
              Respons jaringan/API belum pasti. Ulangi hanya dengan referensi teknis perintah yang
              sama, atau refresh sebelum mengirim perintah yang berbeda.
            </VAlert>
            <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
              <strong>{{ actionError.title }}</strong>
              <div>{{ actionError.impact }}</div>
              <div class="text-caption">Langkah berikutnya: {{ actionError.requiredAction }}</div>
              <div v-if="actionError.referenceId" class="text-caption">
                Referensi: {{ actionError.referenceId }}
              </div>
            </VAlert>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="workPackage.version"
                  label="Versi paket pekerjaan"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="releaseIdempotencyKey"
                  label="Referensi teknis perintah"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="releaseForm.releaseNumber"
                  label="Nomor rilis"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.resultingStatus"
                  label="Status teknis setelah rilis"
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
                  label="Waktu rilis"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.certifyingLicenseNumber"
                  label="Lisensi signer"
                  :items="signerLicenses"
                  item-value="licenseNumber"
                  :item-title="signerLicenseTitle"
                  density="compact"
                  hide-details
                  :loading="selectorsPending"
                  no-data-text="Tidak ada lisensi untuk aktor aktif"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="releaseForm.releaseStatement"
                  label="Pernyataan rilis"
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
                  label="Referensi bukti, pisahkan dengan koma"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </VCol>
            </VRow>

            <VRow>
              <VCol cols="12" md="6">
                <VCard variant="tonal">
                  <VCardTitle class="text-subtitle-2">Prasyarat rilis</VCardTitle>
                  <VCardText>
                    <VList density="compact">
                      <VListItem
                        title="Pesawat"
                        :subtitle="workPackage.aircraftRegistrationNumber"
                      />
                      <VListItem title="Paket pekerjaan" :subtitle="workPackage.packageNumber" />
                      <VListItem title="Versi paket" :subtitle="String(workPackage.version)" />
                      <VListItem title="Temuan terkait" :subtitle="linkedDefectDisposition()" />
                      <VListItem
                        title="Pekerjaan wajib"
                        :subtitle="checklist?.mandatoryWorkComplete ? 'Lengkap' : 'Terblokir'"
                      />
                      <VListItem
                        title="Pemeriksaan"
                        :subtitle="
                          checklist?.independentInspectionsComplete ? 'Lengkap' : 'Terblokir'
                        "
                      />
                      <VListItem
                        title="Approved-data"
                        :subtitle="checklist?.approvedDataAvailable ? 'Tersedia' : 'Belum lengkap'"
                      />
                      <VListItem
                        title="Status temuan"
                        :subtitle="ui.label(workPackage.primaryDefect?.status)"
                      />
                      <VListItem
                        title="Scope requirement"
                        :subtitle="
                          workPackage.requirementScope?.length
                            ? `${workPackage.requirementScope.length} requirement terkait`
                            : 'Tidak ada requirement terkait'
                        "
                      />
                    </VList>
                  </VCardText>
                </VCard>
              </VCol>
              <VCol cols="12" md="6">
                <VCard variant="tonal">
                  <VCardTitle class="text-subtitle-2">Lisensi signer</VCardTitle>
                  <VCardText>
                    <template v-if="selectedSignerLicense">
                      <div class="font-weight-bold">{{ selectedSignerLicense.personnelName }}</div>
                      <div>{{ selectedSignerLicense.licenseNumber }}</div>
                      <div class="text-caption">
                        {{ selectedSignerLicense.status }} / berlaku sampai
                        {{ selectedSignerLicense.expiryDate ?? '-' }}
                      </div>
                      <div class="text-caption">{{ selectedSignerLicense.scopeSummary }}</div>
                      <VAlert type="success" variant="tonal" density="compact" class="mt-3">
                        {{
                          authorizationSummary(
                            'Rilis teknis pesawat',
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
                        Lisensi ini tidak dapat digunakan pada waktu rilis yang dipilih. Perintah
                        rilis akan ditolak.
                      </VAlert>
                    </template>
                    <div v-else class="text-medium-emphasis">
                      Pilih lisensi yang terhubung dengan aktor aktif.
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
              Tutup
            </VBtn>
            <VSpacer />
            <VBtn
              color="success"
              :loading="actionLoading === 'issue-release'"
              :disabled="!canSubmitRelease || releaseCompleted"
              @click="issueRelease"
            >
              {{ releaseCompleted ? 'Rilis selesai' : 'Terbitkan rilis teknis' }}
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
