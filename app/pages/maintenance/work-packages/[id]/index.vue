<script setup lang="ts">
import type { MaintenanceErrorPresentation } from '../../../../composables/useMaintenanceUi';
import type {
  MaintenanceAuditPackDto,
  MaintenanceFacilityDto,
  MaintenanceJobCardDto,
  MaintenanceNonRoutineFindingDto,
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto,
  MaintenanceSlotAvailabilityDto,
  MaintenanceTechnicalRecordPackageDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type {
  MaintenanceResourceReadinessDto,
  MaintenanceMaterialRequirementDto,
  MaintenanceInventoryReservationDto,
  MaintenanceMaterialTraceabilityDto,
  MaintenanceAtpResultDto,
  MaintenanceToolRequirementDto,
  MaintenanceToolAllocationV2Dto,
  MaintenanceToolCandidateDto,
  MaintenancePersonnelRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelCandidateDto,
  MaintenanceAmoOrganizationDto,
  MroEligibilityResult,
  MaintenanceResourceDeclarationDto,
  ResourcePlanningType,
  ResourcePlanningDeclaration
} from '#shared/features/maintenance-v21';
import { useResourceV21 } from '../../../../composables/useResourceV21';
import { demoRoleActorIds } from '#shared/types/roles';
import type { InventoryPartDto, InventoryWarehouseDto } from '#shared/features/inventory';

const authorizationWording = 'Lisensi dan wewenang PT AMA terverifikasi.';

const route = useRoute();
const id = computed(() => String(route.params.id));
const session = useDemoSession();
const { can } = useAuthorization();
const format = useLocaleFormat();
const ui = useMaintenanceUi();

function formatDate(value: string | null | undefined) {
  return value ? format.date(value) : '-';
}

function formatDateTime(value: string | null | undefined) {
  return value ? format.dateTime(value) : '-';
}

function timezoneOffsetMinutes(timeZone: string, utcDate: Date) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset'
  })
    .formatToParts(utcDate)
    .find((item) => item.type === 'timeZoneName')?.value;
  const match = part?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/u);
  if (!match) return timeZone === 'Asia/Jayapura' ? 540 : 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function slotTimezone() {
  return selectedFacility.value?.timezone ?? currentSlot.value?.stationTimezone ?? 'Asia/Jayapura';
}

function localSlotInputToUtcIso(value: string, timeZone = slotTimezone()) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) return new Date(value).toISOString();
  const utcGuess = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    )
  );
  const offset = timezoneOffsetMinutes(timeZone, utcGuess);
  return new Date(utcGuess.getTime() - offset * 60_000).toISOString();
}

function slotIsoToLocalInput(value: string, timeZone = slotTimezone()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function formatSlotDateTime(value: string | null | undefined, timeZone = slotTimezone()) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

const actionLoading = ref('');
const actionError = ref<MaintenanceErrorPresentation | null>(null);
const actionSuccess = ref('');
const releaseDialog = ref(false);
const releaseCompleted = ref(false);
const releaseUncertain = ref(false);
const releaseIdempotencyKey = ref('');
const auditPackDialog = ref(false);
const auditPack = ref<MaintenanceAuditPackDto | null>(null);
const technicalRecord = ref<MaintenanceTechnicalRecordPackageDto | null>(null);
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
const nonRoutineDialog = ref(false);
const nonRoutineSourceCard = ref<MaintenanceJobCardDto | null>(null);
const nonRoutineForm = reactive({
  title: '',
  description: '',
  severity: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'AOG',
  location: '',
  ataChapter: '',
  immediateSafetyConcern: false,
  evidenceReferences: ''
});
const nonRoutineAssessmentForms = reactive<
  Record<
    string,
    {
      disposition: 'CORRECTIVE_WORK_REQUIRED' | 'NO_ACTION';
      assessmentNote: string;
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'AOG';
      requiresIndependentInspection: boolean;
      approvedDataRef: string;
    }
  >
>({});
const nonRoutineCorrectiveForms = reactive<
  Record<
    string,
    {
      title: string;
      maintenanceDataRef: string;
      maintenanceDataRevision: string;
      mandatoryFlag: boolean;
      requiresIndependentInspection: boolean;
    }
  >
>({});
const nonRoutineResolutionForms = reactive<Record<string, { note: string; evidence: string }>>({});
const nonRoutineCloseForms = reactive<Record<string, { note: string; evidence: string }>>({});
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
const slotDialog = ref(false);
const slotMode = ref<'BOOK' | 'RESCHEDULE'>('BOOK');
const slotPreview = ref<MaintenanceSlotAvailabilityDto | null>(null);
const slotCancelDialog = ref(false);
const slotCancelReason = ref('');
const slotForm = reactive({
  facilityId: '',
  areaId: '',
  bayId: '',
  plannedStartAt: '',
  plannedEndAt: '',
  reason: ''
});

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
const { data: facilityData } = await useAsyncData(
  'maintenance-facility-options',
  () => fetchApi<MaintenanceFacilityDto[]>('/api/maintenance/facility-planning/facilities'),
  { server: false }
);
const { data: inventoryParts } = await useAsyncData(
  'maintenance-material-part-options',
  () => fetchApi<InventoryPartDto[]>('/api/inventory/parts'),
  { server: false }
);
const { data: inventoryWarehouses } = await useAsyncData(
  'maintenance-material-station-options',
  () => fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses'),
  { server: false }
);

const workPackage = computed(() => data.value);
const currentSlot = computed(() => workPackage.value?.currentMaintenanceSlot ?? null);
const facilities = computed(() => facilityData.value ?? []);
const selectedFacility = computed(
  () => facilities.value.find((facility) => facility.id === slotForm.facilityId) ?? null
);
const selectedArea = computed(
  () => selectedFacility.value?.areas.find((area) => area.id === slotForm.areaId) ?? null
);
const facilityItems = computed(() =>
  facilities.value
    .filter((facility) => facility.active)
    .map((facility) => ({
      title: `${facility.code} - ${facility.name}`,
      value: facility.id
    }))
);
const areaItems = computed(() =>
  (selectedFacility.value?.areas ?? [])
    .filter((area) => area.active)
    .map((area) => ({
      title: `${area.code} - ${area.name}`,
      value: area.id
    }))
);
const bayItems = computed(() =>
  (selectedArea.value?.bays ?? [])
    .filter((bay) => bay.active)
    .map((bay) => ({
      title: `${bay.code} - ${bay.name}`,
      value: bay.id
    }))
);
watch(
  () => slotForm.facilityId,
  () => {
    if (!selectedFacility.value?.areas.some((area) => area.id === slotForm.areaId)) {
      slotForm.areaId = selectedFacility.value?.areas.find((area) => area.active)?.id ?? '';
    }
  }
);
watch(
  () => slotForm.areaId,
  () => {
    if (!selectedArea.value?.bays.some((bay) => bay.id === slotForm.bayId)) {
      slotForm.bayId = selectedArea.value?.bays.find((bay) => bay.active)?.id ?? '';
    }
  }
);
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
const canAssessNonRoutine = computed(() => can('maintenance.defect.assess').allowed);
const canRequestRelease = computed(() => can('maintenance.release.request').allowed);
const canIssueRelease = computed(() => can('maintenance.release.issue').allowed);
const canExportAuditPack = computed(() => can('maintenance.audit_pack.export').allowed);
const canRequestMaterial = computed(() => can('maintenance.material.request').allowed);
const canReserveMaterial = computed(() => can('inventory.material.reserve').allowed);
const canIssueMaterial = computed(() => can('inventory.material.issue').allowed);
const canInstallMaterial = computed(() => can('maintenance.material.install').allowed);
const immutablePackage = computed(() =>
  ['RELEASED', 'CANCELLED'].includes(workPackage.value?.status ?? '')
);
const demoRoleCrewIds: Partial<Record<string, string>> = {
  'Maintenance Manager': 'crew-maintenance-manager',
  'Maintenance Technician': 'crew-maintenance-technician',
  'Certifying Staff': 'crew-certifying-staff'
};

function currentMaintenanceCrewId() {
  return demoRoleCrewIds[session.role.value] ?? null;
}
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
    for (const finding of item?.nonRoutineFindings ?? []) {
      nonRoutineAssessmentForms[finding.id] ??= {
        disposition: 'CORRECTIVE_WORK_REQUIRED',
        assessmentNote: `Assessment maintenance untuk ${finding.findingNumber}.`,
        priority: finding.severity,
        requiresIndependentInspection: true,
        approvedDataRef: finding.approvedDataRef ?? ''
      };
      nonRoutineCorrectiveForms[finding.id] ??= {
        title: `Corrective work - ${finding.title}`,
        maintenanceDataRef: finding.approvedDataRef ?? '',
        maintenanceDataRevision: 'REV-MROV1-2026-08',
        mandatoryFlag: true,
        requiresIndependentInspection: finding.requiresIndependentInspection
      };
      nonRoutineResolutionForms[finding.id] ??= {
        note: `Corrective requirements completed for ${finding.findingNumber}.`,
        evidence: `${finding.findingNumber}-RESOLUTION-EVIDENCE`
      };
      nonRoutineCloseForms[finding.id] ??= {
        note: `Non-routine finding ${finding.findingNumber} closed after controlled resolution.`,
        evidence: `${finding.findingNumber}-CLOSURE-EVIDENCE`
      };
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

function canCreateNonRoutine(card: MaintenanceJobCardDto) {
  return (
    canWork.value &&
    !immutablePackage.value &&
    card.status === 'IN_PROGRESS' &&
    !card.sourceNonRoutineFindingId
  );
}

function correctiveCard(finding: MaintenanceNonRoutineFindingDto) {
  return finding.correctiveJobCardId
    ? (workPackage.value?.jobCards.find((card) => card.id === finding.correctiveJobCardId) ?? null)
    : null;
}

function openNonRoutineDialog(card: MaintenanceJobCardDto) {
  nonRoutineSourceCard.value = card;
  nonRoutineForm.title = '';
  nonRoutineForm.description = '';
  nonRoutineForm.severity = 'NORMAL';
  nonRoutineForm.location = '';
  nonRoutineForm.ataChapter = '';
  nonRoutineForm.immediateSafetyConcern = false;
  nonRoutineForm.evidenceReferences = `${card.cardNumber}-NR-EVIDENCE`;
  nonRoutineDialog.value = true;
}

async function submitNonRoutineFinding() {
  if (!workPackage.value || !nonRoutineSourceCard.value) return;
  const sourceCard = nonRoutineSourceCard.value;
  await runAction('create-nr', async () => {
    await fetchApi(`/api/maintenance/work-packages/${workPackage.value!.id}/non-routine-findings`, {
      method: 'POST',
      body: {
        sourceJobCardId: sourceCard.id,
        title: nonRoutineForm.title,
        description: nonRoutineForm.description,
        severity: nonRoutineForm.severity,
        location: nonRoutineForm.location || null,
        ataChapter: nonRoutineForm.ataChapter || null,
        immediateSafetyConcern: nonRoutineForm.immediateSafetyConcern,
        evidenceReferences: evidenceList(nonRoutineForm.evidenceReferences),
        idempotencyKey: newIdempotencyKey()
      }
    });
    nonRoutineDialog.value = false;
    actionSuccess.value = 'Temuan non-routine tercatat dan menunggu assessment maintenance.';
  });
}

async function assessNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  const form = nonRoutineAssessmentForms[finding.id];
  if (!form) return;
  await runAction(`nr-assess-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/assess`, {
      method: 'POST',
      body: {
        disposition: form.disposition,
        assessmentNote: form.assessmentNote,
        priority: form.priority,
        requiresIndependentInspection: form.requiresIndependentInspection,
        approvedDataRef: form.approvedDataRef || null
      }
    }).then(() => {
      actionSuccess.value = 'Assessment non-routine tersimpan dari backend.';
    })
  );
}

async function createCorrectiveJobCard(finding: MaintenanceNonRoutineFindingDto) {
  if (!workPackage.value) return;
  const form = nonRoutineCorrectiveForms[finding.id];
  if (!form) return;
  await runAction(`nr-corrective-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/corrective-job-card`, {
      method: 'POST',
      body: {
        ...form,
        expectedWorkPackageVersion: workPackage.value!.version
      }
    }).then(() => {
      actionSuccess.value = 'Job Card korektif dibuat dan terhubung ke temuan non-routine.';
    })
  );
}

async function resolveNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  const form = nonRoutineResolutionForms[finding.id];
  if (!form) return;
  await runAction(`nr-resolve-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/resolve`, {
      method: 'POST',
      body: {
        resolutionNote: form.note,
        evidenceReferences: evidenceList(form.evidence)
      }
    }).then(() => {
      actionSuccess.value = 'Temuan non-routine resolved setelah validasi backend.';
    })
  );
}

async function closeNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  const form = nonRoutineCloseForms[finding.id];
  if (!form) return;
  await runAction(`nr-close-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/close`, {
      method: 'POST',
      body: {
        closureNote: form.note,
        evidenceReferences: evidenceList(form.evidence)
      }
    }).then(() => {
      actionSuccess.value = 'Temuan non-routine ditutup dan tetap tersedia sebagai history.';
    })
  );
}

function linkedDefectDisposition() {
  const defect = workPackage.value?.primaryDefect;
  if (!defect) return 'Tidak ada temuan terkait.';
  return `${defect.defectNumber}: ${ui.label(defect.status)}`;
}

function readinessStatusColor(status: string) {
  if (status === 'SIAP') return 'success';
  if (status === 'TERBLOKIR') return 'error';
  if (status === 'PERLU_TINDAKAN') return 'warning';
  return 'secondary';
}

function readinessStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SIAP: 'Siap',
    TERBLOKIR: 'Terblokir',
    PERLU_TINDAKAN: 'Perlu tindakan',
    TIDAK_DIPERLUKAN: 'Tidak diperlukan'
  };
  return labels[status] ?? ui.label(status);
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

function slotStatusColor(status: string | null | undefined) {
  if (status === 'BOOKED') return 'info';
  if (status === 'IN_PROGRESS') return 'primary';
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'default';
  return 'warning';
}

function resetSlotSelectionFromFacility() {
  const firstFacility = facilities.value.find((facility) => facility.active);
  slotForm.facilityId = currentSlot.value?.facilityId ?? firstFacility?.id ?? '';
  const facility =
    facilities.value.find((item) => item.id === slotForm.facilityId) ?? firstFacility;
  const firstArea = facility?.areas.find((area) => area.active);
  slotForm.areaId = currentSlot.value?.areaId ?? firstArea?.id ?? '';
  const area = facility?.areas.find((item) => item.id === slotForm.areaId) ?? firstArea;
  slotForm.bayId = currentSlot.value?.bayId ?? area?.bays.find((bay) => bay.active)?.id ?? '';
}

function openSlotDialog(mode: 'BOOK' | 'RESCHEDULE') {
  slotMode.value = mode;
  slotPreview.value = null;
  resetSlotSelectionFromFacility();
  const start =
    currentSlot.value?.plannedStartAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const end =
    currentSlot.value?.plannedEndAt ?? new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString();
  slotForm.plannedStartAt = slotIsoToLocalInput(start);
  slotForm.plannedEndAt = slotIsoToLocalInput(end);
  slotForm.reason = mode === 'RESCHEDULE' ? 'Jadwal ulang slot maintenance oleh planner.' : '';
  slotDialog.value = true;
}

function slotPayload() {
  return {
    facilityId: slotForm.facilityId,
    areaId: slotForm.areaId,
    bayId: slotForm.bayId,
    plannedStartAt: localSlotInputToUtcIso(slotForm.plannedStartAt),
    plannedEndAt: localSlotInputToUtcIso(slotForm.plannedEndAt)
  };
}

async function previewSlotAvailability() {
  if (!workPackage.value) return;
  await runAction('slot-preview', async () => {
    slotPreview.value = await fetchApi<MaintenanceSlotAvailabilityDto>(
      `/api/maintenance/work-packages/${workPackage.value!.id}/maintenance-slots/availability`,
      {
        method: 'POST',
        body: slotPayload()
      }
    );
  });
}

async function submitSlot() {
  if (!workPackage.value) return;
  await runAction(slotMode.value === 'BOOK' ? 'slot-book' : 'slot-reschedule', async () => {
    if (slotMode.value === 'BOOK') {
      await fetchApi(`/api/maintenance/work-packages/${workPackage.value!.id}/maintenance-slots`, {
        method: 'POST',
        body: {
          ...slotPayload(),
          idempotencyKey: `slot-${workPackage.value!.id}-${Date.now()}`
        }
      });
      actionSuccess.value = 'Slot maintenance berhasil dibooking.';
    } else if (currentSlot.value) {
      await fetchApi(`/api/maintenance/maintenance-slots/${currentSlot.value.id}`, {
        method: 'PATCH',
        body: {
          ...slotPayload(),
          reason: slotForm.reason
        }
      });
      actionSuccess.value = 'Slot maintenance berhasil dijadwalkan ulang.';
    }
    slotDialog.value = false;
    slotPreview.value = null;
  });
}

function openCancelSlotDialog() {
  slotCancelReason.value = 'Slot maintenance dibatalkan oleh planner.';
  slotCancelDialog.value = true;
}

async function cancelCurrentSlot() {
  if (!currentSlot.value) return;
  await runAction('slot-cancel', async () => {
    await fetchApi(`/api/maintenance/maintenance-slots/${currentSlot.value!.id}/actions/cancel`, {
      method: 'POST',
      body: { reason: slotCancelReason.value }
    });
    actionSuccess.value = 'Slot maintenance berhasil dibatalkan.';
    slotCancelDialog.value = false;
  });
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

async function openAuditPack() {
  if (!workPackage.value) return;
  await runAction('audit-pack', async () => {
    const workPackageId = workPackage.value!.id;
    const [audit, record] = await Promise.all([
      fetchApi<MaintenanceAuditPackDto>(
        `/api/maintenance/work-packages/${workPackageId}/audit-pack`
      ),
      fetchApi<MaintenanceTechnicalRecordPackageDto>(
        `/api/maintenance/work-packages/${workPackageId}/technical-record`
      )
    ]);
    auditPack.value = audit;
    technicalRecord.value = record;
    auditPackDialog.value = true;
  });
}

function printAuditPack() {
  if (import.meta.client) window.print();
}

// ========== Demo-v2.1 Resource Management ==========
const resourceTab = ref('summary');
const resourceReadiness = ref<MaintenanceResourceReadinessDto | null>(null);
const resourceDeclarations = ref<MaintenanceResourceDeclarationDto[]>([]);
const materialRequirements = ref<MaintenanceMaterialRequirementDto[]>([]);
const materialReservations = ref<MaintenanceInventoryReservationDto[]>([]);
const materialTraceability = ref<MaintenanceMaterialTraceabilityDto[]>([]);
const toolRequirements = ref<MaintenanceToolRequirementDto[]>([]);
const toolAllocations = ref<MaintenanceToolAllocationV2Dto[]>([]);
const toolCandidates = ref<Record<string, MaintenanceToolCandidateDto[]>>({});
const personnelRequirements = ref<MaintenancePersonnelRequirementDto[]>([]);
const personnelAssignments = ref<MaintenancePersonnelAssignmentDto[]>([]);
const personnelCandidates = ref<Record<string, MaintenancePersonnelCandidateDto[]>>({});
const amoOrganization = ref<MaintenanceAmoOrganizationDto | null>(null);
const mroEligibility = ref<MroEligibilityResult | null>(null);
const atpResults = ref<Record<string, MaintenanceAtpResultDto>>({});
const resourceLoading = ref(false);
const resourceError = ref<string | null>(null);

const resource = useResourceV21(computed(() => workPackage.value?.id || ''));
const materialRequirementDialog = ref(false);
const materialRequirementForm = reactive({
  partId: '',
  requestedStationId: '',
  requiredQuantity: 1,
  requiredBy: '',
  reason: '',
  notes: ''
});
const materialPartOptions = computed(() =>
  (inventoryParts.value ?? [])
    .filter((part) => part.isActive)
    .map((part) => ({
      title: `${part.partNumber} - ${part.partName}`,
      value: part.id,
      unit: part.unitOfMeasure
    }))
);
const materialStationOptions = computed(() => {
  const seen = new Set<string>();
  return (inventoryWarehouses.value ?? []).flatMap((warehouse) => {
    if (seen.has(warehouse.stationId)) return [];
    seen.add(warehouse.stationId);
    return [{ title: warehouse.stationCode, value: warehouse.stationId }];
  });
});

async function createMaterialRequirement() {
  const selectedPart = (inventoryParts.value ?? []).find(
    (part) => part.id === materialRequirementForm.partId
  );
  if (!selectedPart || !workPackage.value) return;
  await runResourceMutation(async () => {
    await resource.createMaterialRequirement({
      workPackageId: workPackage.value!.id,
      partId: selectedPart.id,
      requiredQuantity: materialRequirementForm.requiredQuantity,
      unit: selectedPart.unitOfMeasure,
      requestedStationId: materialRequirementForm.requestedStationId,
      requiredBy: materialRequirementForm.requiredBy || undefined,
      reason: materialRequirementForm.reason || undefined,
      notes: materialRequirementForm.notes || undefined
    });
    materialRequirementDialog.value = false;
    Object.assign(materialRequirementForm, {
      partId: '',
      requestedStationId: '',
      requiredQuantity: 1,
      requiredBy: '',
      reason: '',
      notes: ''
    });
    await loadResourceData();
  });
}

async function loadResourceData() {
  if (!workPackage.value?.id) return;
  resourceLoading.value = true;
  resourceError.value = null;
  try {
    const [
      readiness,
      declarations,
      materials,
      reservations,
      traceability,
      tools,
      allocations,
      personnel,
      assignments,
      amo,
      eligibility
    ] = await Promise.all([
      resource.fetchResourceReadiness(),
      resource.fetchDeclarations(),
      resource.fetchMaterialRequirements(),
      resource.fetchMaterialReservations(),
      resource.fetchMaterialTraceability(),
      resource.fetchToolRequirements(),
      resource.fetchToolAllocations(),
      resource.fetchPersonnelRequirements(),
      resource.fetchPersonnelAssignments(),
      resource.fetchAmoOrganization(),
      resource.fetchMroEligibility()
    ]);
    resourceReadiness.value = readiness;
    resourceDeclarations.value = declarations;
    materialRequirements.value = materials;
    materialReservations.value = reservations;
    materialTraceability.value = traceability;
    toolRequirements.value = tools;
    toolAllocations.value = allocations;
    personnelRequirements.value = personnel;
    personnelAssignments.value = assignments;
    amoOrganization.value = amo;
    mroEligibility.value = eligibility;
  } catch (err: any) {
    resourceError.value = err?.data?.message || err?.message || 'Failed to load resource data';
  } finally {
    resourceLoading.value = false;
  }
}

async function checkAtp(materialReq: MaintenanceMaterialRequirementDto) {
  if (!materialReq.partId || !materialReq.requestedStationId) return;
  try {
    const atp = await resource.fetchAtp(materialReq.partId, materialReq.requestedStationId);
    atpResults.value[materialReq.id] = atp;
  } catch (err: any) {
    console.error('Failed to fetch ATP:', err);
  }
}

function newResourceActionKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function reservationForRequirement(requirementId: string, statuses: string[]) {
  return materialReservations.value.find(
    (reservation) =>
      reservation.materialRequirementId === requirementId && statuses.includes(reservation.status)
  );
}

function traceForRequirement(requirementId: string) {
  return materialTraceability.value.find((trace) => trace.materialRequirementId === requirementId);
}

async function runResourceMutation(action: () => Promise<void>) {
  resourceLoading.value = true;
  resourceError.value = null;
  try {
    await action();
  } catch (err: any) {
    resourceError.value = err?.data?.message || err?.message || 'Gagal menjalankan aksi resource.';
  } finally {
    resourceLoading.value = false;
  }
}

async function loadToolCandidates(req: MaintenanceToolRequirementDto) {
  await runResourceMutation(async () => {
    toolCandidates.value[req.id] = await resource.fetchToolCandidates(req.id);
  });
}

async function allocateToolCandidate(
  req: MaintenanceToolRequirementDto,
  candidate: MaintenanceToolCandidateDto
) {
  await runResourceMutation(async () => {
    await resource.allocateTool({
      toolRequirementId: req.id,
      toolId: candidate.toolId,
      idempotencyKey: newResourceActionKey('mro-tool-allocate')
    });
    await loadResourceData();
    toolCandidates.value[req.id] = await resource.fetchToolCandidates(req.id);
  });
}

async function checkoutTool(allocation: MaintenanceToolAllocationV2Dto) {
  await runResourceMutation(async () => {
    const custodianPersonnelId = allocation.custodianPersonnelId || currentMaintenanceCrewId();
    if (!custodianPersonnelId) {
      throw new Error('Role aktif tidak memiliki persona maintenance untuk custody tool.');
    }
    await resource.assignToolCustody({
      allocationId: allocation.id,
      custodianPersonnelId
    });
    await loadResourceData();
  });
}

async function returnToolAllocation(allocation: MaintenanceToolAllocationV2Dto) {
  await runResourceMutation(async () => {
    await resource.returnTool({
      allocationId: allocation.id,
      returnCondition: 'SERVICEABLE',
      returnNote: 'Tool returned from Work Package resource tab.',
      idempotencyKey: newResourceActionKey('mro-tool-return')
    });
    await loadResourceData();
  });
}

async function loadPersonnelCandidates(req: MaintenancePersonnelRequirementDto) {
  await runResourceMutation(async () => {
    personnelCandidates.value[req.id] = await resource.fetchPersonnelCandidates(req.id);
  });
}

async function assignPersonnelCandidate(
  req: MaintenancePersonnelRequirementDto,
  candidate: MaintenancePersonnelCandidateDto
) {
  await runResourceMutation(async () => {
    await resource.assignPersonnel({
      personnelRequirementId: req.id,
      personnelId: candidate.personnelId,
      idempotencyKey: newResourceActionKey('mro-personnel-assign')
    });
    await loadResourceData();
    personnelCandidates.value[req.id] = await resource.fetchPersonnelCandidates(req.id);
  });
}

async function confirmPersonnel(assignment: MaintenancePersonnelAssignmentDto) {
  await runResourceMutation(async () => {
    await resource.confirmPersonnelAssignment({
      assignmentId: assignment.id,
      idempotencyKey: newResourceActionKey('mro-personnel-confirm')
    });
    await loadResourceData();
  });
}

async function releasePersonnelAssignment(assignment: MaintenancePersonnelAssignmentDto) {
  await runResourceMutation(async () => {
    await resource.releasePersonnel({
      assignmentId: assignment.id,
      reason: 'Released from Work Package resource tab.',
      idempotencyKey: newResourceActionKey('mro-personnel-release')
    });
    await loadResourceData();
  });
}

async function reserveMaterialRequirement(materialReq: MaintenanceMaterialRequirementDto) {
  if (!materialReq.partId || !materialReq.requestedStationId) return;
  await runResourceMutation(async () => {
    const atp =
      atpResults.value[materialReq.id] ||
      (await resource.fetchAtp(materialReq.partId!, materialReq.requestedStationId!));
    atpResults.value[materialReq.id] = atp;
    const remaining = Math.max(0, materialReq.requiredQuantity - materialReq.reservedQuantity);
    const serial = atp.serializedAvailability.find((item) => item.available);
    await resource.reserveMaterial({
      materialRequirementId: materialReq.id,
      inventoryItemId: materialReq.partId!,
      serializedPartId: serial?.serializedPartId,
      quantity: serial ? 1 : remaining || materialReq.requiredQuantity,
      unit: materialReq.unit,
      stationId: materialReq.requestedStationId!,
      idempotencyKey: newResourceActionKey('mro-material-reserve')
    });
    await loadResourceData();
  });
}

async function issueMaterialRequirement(materialReq: MaintenanceMaterialRequirementDto) {
  const reservation = reservationForRequirement(materialReq.id, ['ACTIVE', 'PARTIALLY_ISSUED']);
  if (!reservation) return;
  await runResourceMutation(async () => {
    await resource.issueMaterial({
      reservationId: reservation.id,
      quantity: reservation.quantity,
      idempotencyKey: newResourceActionKey('mro-material-issue')
    });
    await loadResourceData();
  });
}

async function releaseMaterialRequirement(materialReq: MaintenanceMaterialRequirementDto) {
  const reservation = reservationForRequirement(materialReq.id, ['ACTIVE', 'PARTIALLY_ISSUED']);
  if (!reservation) return;
  await runResourceMutation(async () => {
    await resource.releaseMaterialReservation({
      reservationId: reservation.id,
      reason: 'Released from Work Package material tab before issue.',
      idempotencyKey: newResourceActionKey('mro-material-release')
    });
    await loadResourceData();
  });
}

async function installMaterialRequirement(materialReq: MaintenanceMaterialRequirementDto) {
  const reservation = reservationForRequirement(materialReq.id, ['ISSUED']);
  if (!reservation) return;
  await runResourceMutation(async () => {
    await resource.installMaterial({
      reservationId: reservation.id,
      quantity: reservation.issuedQuantity || reservation.quantity,
      jobCardId: materialReq.jobCardId ?? reservation.jobCardId ?? undefined,
      position: materialReq.partNumber
        ? `${materialReq.partNumber} DEMO POSITION`
        : 'MRO DEMO POSITION',
      idempotencyKey: newResourceActionKey('mro-material-install')
    });
    await loadResourceData();
  });
}

async function declareResourceType(
  resourceType: ResourcePlanningType,
  declaration: ResourcePlanningDeclaration,
  reason?: string
) {
  try {
    await resource.declareResource({
      resourceType,
      declaration,
      reason
    });
    await loadResourceData();
  } catch (err: any) {
    throw err;
  }
}

function toolCalibrationState(allocation: MaintenanceToolAllocationV2Dto) {
  if (!allocation.calibrationRequired) return 'NOT_REQUIRED';
  if (!allocation.calibrationExpiresAt) return 'UNKNOWN';
  return new Date(allocation.calibrationExpiresAt) >= new Date() ? 'CURRENT' : 'EXPIRED';
}

watch(
  () => workPackage.value?.id,
  (newId) => {
    if (newId) {
      loadResourceData();
    }
  },
  { immediate: true }
);
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
      <!-- Demo-v2.1 Resource Management Tabs -->
      <VCard border class="mb-4">
        <VTabs v-model="resourceTab" color="primary" grow>
          <VTab value="summary">Summary</VTab>
          <VTab value="material">Material</VTab>
          <VTab value="tool">Tool</VTab>
          <VTab value="personnel">Personnel</VTab>
          <VTab value="amo">AMO Scope</VTab>
          <VTab value="eligibility">MRO Eligibility</VTab>
        </VTabs>
      </VCard>

      <VWindow v-model="resourceTab">
        <VWindowItem value="summary">
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
                      workPackage.primaryDefect?.defectNumber ??
                        workPackage.primaryDefectNumber ??
                        '-'
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
              <VAlert
                v-if="workPackage.sourceDueRequirementId"
                type="info"
                variant="tonal"
                class="mt-4"
              >
                <div class="font-weight-bold">Dibuat dari Maintenance Requirement</div>
                <div>
                  {{ workPackage.sourceDueRequirementCode }} -
                  {{ workPackage.sourceDueRequirementTitle }}
                </div>
                <div class="text-caption">
                  Source status: {{ workPackage.sourceDueStatusId }}. Compliance baru dicatat saat
                  Work Package berhasil dirilis secara teknis.
                </div>
              </VAlert>
              <VCard border class="mt-4">
                <VCardText>
                  <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
                    <div>
                      <div class="text-caption text-medium-emphasis">Maintenance Planning</div>
                      <div class="text-subtitle-1 font-weight-bold">Slot Maintenance</div>
                    </div>
                    <div class="d-flex flex-wrap ga-2">
                      <VBtn
                        v-if="!currentSlot"
                        color="primary"
                        prepend-icon="mdi-calendar-plus"
                        :disabled="!can('maintenance.package.plan').allowed || !facilities.length"
                        @click="openSlotDialog('BOOK')"
                      >
                        Atur Slot
                      </VBtn>
                      <template v-else>
                        <VBtn
                          variant="tonal"
                          prepend-icon="mdi-calendar-edit"
                          :disabled="
                            currentSlot.status !== 'BOOKED' ||
                              !can('maintenance.package.plan').allowed
                          "
                          @click="openSlotDialog('RESCHEDULE')"
                        >
                          Jadwal Ulang
                        </VBtn>
                        <VBtn
                          color="error"
                          variant="tonal"
                          prepend-icon="mdi-calendar-remove"
                          :disabled="
                            currentSlot.status !== 'BOOKED' ||
                              !can('maintenance.package.plan').allowed
                          "
                          @click="openCancelSlotDialog"
                        >
                          Batalkan Slot
                        </VBtn>
                      </template>
                    </div>
                  </div>

                  <VAlert v-if="!facilities.length" type="warning" variant="tonal">
                    Data fasilitas maintenance belum tersedia.
                  </VAlert>
                  <VAlert v-else-if="!currentSlot" type="info" variant="tonal">
                    Belum ada slot maintenance. Booking slot hanya menentukan lokasi dan waktu
                    perencanaan, bukan konfirmasi aircraft sudah berada di bay.
                  </VAlert>
                  <VRow v-else>
                    <VCol cols="12" md="3">
                      <div class="text-caption text-medium-emphasis">Station</div>
                      <strong>{{ currentSlot.stationCode }}</strong>
                      <div class="text-caption">{{ currentSlot.stationName }}</div>
                    </VCol>
                    <VCol cols="12" md="3">
                      <div class="text-caption text-medium-emphasis">Fasilitas</div>
                      <strong>{{ currentSlot.facilityName }}</strong>
                      <div class="text-caption">{{ currentSlot.areaName }}</div>
                    </VCol>
                    <VCol cols="12" md="3">
                      <div class="text-caption text-medium-emphasis">Bay / Spot</div>
                      <strong>{{ currentSlot.bayCode }}</strong>
                      <div class="text-caption">{{ currentSlot.bayName }}</div>
                    </VCol>
                    <VCol cols="12" md="3">
                      <div class="text-caption text-medium-emphasis">Status</div>
                      <VChip
                        :color="slotStatusColor(currentSlot.status)"
                        variant="tonal"
                        size="small"
                      >
                        {{ ui.label(currentSlot.status) }}
                      </VChip>
                      <div class="text-caption mt-1">
                        {{
                          formatSlotDateTime(
                            currentSlot.plannedStartAt,
                            currentSlot.stationTimezone
                          )
                        }}
                        -
                        {{
                          formatSlotDateTime(currentSlot.plannedEndAt, currentSlot.stationTimezone)
                        }}
                      </div>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
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

          <VCard border class="mb-4">
            <VCardTitle class="d-flex flex-wrap align-center ga-3">
              <div>
                <div class="text-h6">Kesiapan Pekerjaan</div>
                <div class="text-body-2 text-medium-emphasis">
                  Panel ini berasal dari eligibility engine backend, termasuk Data Perawatan, Jatuh
                  Tempo, Material, Peralatan, Personel, dan Rilis Teknis.
                </div>
              </div>
              <VSpacer />
              <VChip
                :color="workPackage.releaseEligibility?.eligible ? 'success' : 'error'"
                variant="tonal"
              >
                {{
                  workPackage.releaseEligibility?.eligible
                    ? 'Layak rilis teknis'
                    : 'Rilis teknis terblokir'
                }}
              </VChip>
            </VCardTitle>
            <VCardText>
              <VRow>
                <VCol
                  v-for="section in workPackage.readinessPanel?.sections ?? []"
                  :key="section.key"
                  cols="12"
                  md="6"
                  xl="4"
                >
                  <div class="readiness-card">
                    <div class="d-flex align-center ga-2 mb-2">
                      <strong>{{ section.label }}</strong>
                      <VSpacer />
                      <VChip
                        :color="readinessStatusColor(section.status)"
                        size="small"
                        variant="tonal"
                      >
                        {{ readinessStatusLabel(section.status) }}
                      </VChip>
                    </div>
                    <div
                      v-if="!section.blockers.length && !section.warnings.length"
                      class="text-body-2 text-medium-emphasis"
                    >
                      Tidak ada blocker backend untuk section ini.
                    </div>
                    <VAlert
                      v-for="blocker in section.blockers"
                      :key="`${section.key}-${blocker.code}-${blocker.sourceId}`"
                      type="error"
                      variant="tonal"
                      density="compact"
                      class="mb-2"
                    >
                      <strong>{{ blocker.title }}</strong>
                      <div>{{ blocker.message }}</div>
                      <div class="text-caption">Tindakan berikutnya: {{ blocker.nextAction }}</div>
                      <div class="text-caption">Code: {{ blocker.code }}</div>
                    </VAlert>
                    <VAlert
                      v-for="warning in section.warnings"
                      :key="`${section.key}-${warning.code}-${warning.sourceId}`"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mb-2"
                    >
                      <strong>{{ warning.title }}</strong>
                      <div>{{ warning.message }}</div>
                      <div class="text-caption">Tindakan berikutnya: {{ warning.nextAction }}</div>
                      <div class="text-caption">Code: {{ warning.code }}</div>
                    </VAlert>
                  </div>
                </VCol>
              </VRow>
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
                <VCardTitle>Temuan Non-Routine</VCardTitle>
                <VCardText>
                  <VEmptyState
                    v-if="!workPackage.nonRoutineFindings?.length"
                    title="Belum ada temuan non-routine"
                    text="Temuan dicatat dari Job Card aktif saat pekerjaan berlangsung."
                  />
                  <div
                    v-for="finding in workPackage.nonRoutineFindings"
                    :key="finding.id"
                    class="non-routine-item mb-4"
                  >
                    <div class="d-flex flex-wrap align-center ga-2 mb-3">
                      <strong>{{ finding.findingNumber }}</strong>
                      <VChip size="x-small" variant="tonal">
                        {{ finding.sourceJobCardNumber }}
                      </VChip>
                      <VChip
                        :color="finding.status === 'CLOSED' ? 'success' : 'warning'"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ ui.label(finding.workflowState) }}
                      </VChip>
                      <VSpacer />
                      <span class="text-caption text-medium-emphasis">
                        {{ finding.nextAction }}
                      </span>
                    </div>
                    <VRow>
                      <VCol cols="12" md="6">
                        <div class="text-caption text-medium-emphasis">Temuan</div>
                        <div class="font-weight-medium">{{ finding.title }}</div>
                        <div class="text-body-2">{{ finding.description }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Prioritas</div>
                        <div>{{ ui.label(finding.severity) }}</div>
                      </VCol>
                      <VCol cols="12" md="3">
                        <div class="text-caption text-medium-emphasis">Corrective Job Card</div>
                        <div>
                          {{ finding.correctiveJobCardNumber ?? 'Belum dibuat' }}
                        </div>
                      </VCol>
                    </VRow>

                    <div
                      v-if="
                        canAssessNonRoutine &&
                          finding.workflowState === 'WAITING_ASSESSMENT' &&
                          nonRoutineAssessmentForms[finding.id]
                      "
                      class="mt-3"
                    >
                      <VRow>
                        <VCol cols="12" md="4">
                          <VSelect
                            v-model="nonRoutineAssessmentForms[finding.id].disposition"
                            label="Disposition"
                            :items="[
                              {
                                title: 'Corrective Work Required',
                                value: 'CORRECTIVE_WORK_REQUIRED'
                              },
                              { title: 'No Action', value: 'NO_ACTION' }
                            ]"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="4">
                          <VSelect
                            v-model="nonRoutineAssessmentForms[finding.id].priority"
                            label="Prioritas"
                            :items="['LOW', 'NORMAL', 'HIGH', 'AOG']"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="4">
                          <VSwitch
                            v-model="
                              nonRoutineAssessmentForms[finding.id].requiresIndependentInspection
                            "
                            label="Wajib inspeksi independen"
                            color="primary"
                            hide-details
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="nonRoutineAssessmentForms[finding.id].approvedDataRef"
                            label="Approved-data reference"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12">
                          <VTextarea
                            v-model="nonRoutineAssessmentForms[finding.id].assessmentNote"
                            label="Assessment maintenance"
                            rows="2"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                      </VRow>
                      <VBtn
                        color="primary"
                        size="small"
                        :loading="actionLoading === `nr-assess-${finding.id}`"
                        :disabled="
                          nonRoutineAssessmentForms[finding.id].assessmentNote.trim().length < 10
                        "
                        @click="assessNonRoutine(finding)"
                      >
                        Simpan Assessment
                      </VBtn>
                    </div>

                    <div
                      v-if="
                        canManage &&
                          finding.workflowState === 'CORRECTIVE_WORK_REQUIRED' &&
                          nonRoutineCorrectiveForms[finding.id]
                      "
                      class="mt-3"
                    >
                      <VRow>
                        <VCol cols="12">
                          <VTextField
                            v-model="nonRoutineCorrectiveForms[finding.id].title"
                            label="Judul Job Card korektif"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="nonRoutineCorrectiveForms[finding.id].maintenanceDataRef"
                            label="Approved maintenance data reference"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="nonRoutineCorrectiveForms[finding.id].maintenanceDataRevision"
                            label="Revision snapshot"
                            density="compact"
                            variant="outlined"
                          />
                        </VCol>
                      </VRow>
                      <VBtn
                        color="primary"
                        size="small"
                        :loading="actionLoading === `nr-corrective-${finding.id}`"
                        :disabled="
                          nonRoutineCorrectiveForms[finding.id].title.trim().length < 5 ||
                            nonRoutineCorrectiveForms[finding.id].maintenanceDataRef.trim().length < 2
                        "
                        @click="createCorrectiveJobCard(finding)"
                      >
                        Buat Job Card Korektif
                      </VBtn>
                    </div>

                    <VAlert
                      v-if="finding.workflowState === 'IN_RECTIFICATION' && correctiveCard(finding)"
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mt-3"
                    >
                      Lanjutkan {{ correctiveCard(finding)?.cardNumber }} memakai kontrol Job Card,
                      Material, Sign-off, dan Inspection yang sama.
                    </VAlert>

                    <div
                      v-if="
                        canAssessNonRoutine &&
                          finding.workflowState === 'READY_TO_RESOLVE' &&
                          nonRoutineResolutionForms[finding.id]
                      "
                      class="mt-3"
                    >
                      <VTextarea
                        v-model="nonRoutineResolutionForms[finding.id].note"
                        label="Catatan resolusi"
                        rows="2"
                        density="compact"
                        variant="outlined"
                      />
                      <VTextField
                        v-model="nonRoutineResolutionForms[finding.id].evidence"
                        label="Evidence resolusi"
                        density="compact"
                        variant="outlined"
                      />
                      <VBtn
                        color="primary"
                        size="small"
                        :loading="actionLoading === `nr-resolve-${finding.id}`"
                        @click="resolveNonRoutine(finding)"
                      >
                        Resolve Temuan
                      </VBtn>
                    </div>

                    <div
                      v-if="
                        canAssessNonRoutine &&
                          finding.workflowState === 'RESOLVED' &&
                          nonRoutineCloseForms[finding.id]
                      "
                      class="mt-3"
                    >
                      <VTextarea
                        v-model="nonRoutineCloseForms[finding.id].note"
                        label="Catatan closure"
                        rows="2"
                        density="compact"
                        variant="outlined"
                      />
                      <VTextField
                        v-model="nonRoutineCloseForms[finding.id].evidence"
                        label="Evidence closure"
                        density="compact"
                        variant="outlined"
                      />
                      <VBtn
                        color="success"
                        size="small"
                        :loading="actionLoading === `nr-close-${finding.id}`"
                        @click="closeNonRoutine(finding)"
                      >
                        Tutup Temuan
                      </VBtn>
                    </div>
                  </div>
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
                            <div class="text-caption text-medium-emphasis">
                              {{ card.cardNumber }}
                            </div>
                            <div
                              v-if="card.sourceNonRoutineFindingNumber"
                              class="text-caption text-medium-emphasis"
                            >
                              Source: {{ card.sourceNonRoutineFindingNumber }}
                            </div>
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
                            <div class="text-caption text-medium-emphasis">
                              Pemeriksaan independen
                            </div>
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
                                    format.dateTime(
                                      signoff(card, 'INDEPENDENT_INSPECTION')?.signedAt
                                    )
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
                                    reworkForms[rework.id].correctiveActionDescription.length <
                                      10 ||
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
                          <VBtn
                            v-if="canCreateNonRoutine(card)"
                            size="small"
                            color="warning"
                            variant="tonal"
                            :loading="actionLoading === 'create-nr'"
                            @click="openNonRoutineDialog(card)"
                          >
                            Catat Temuan
                          </VBtn>
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
                  <VTextField
                    v-model="jobCardForm.maintenanceDataRevision"
                    label="Revision snapshot"
                  />
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
                    Pemeriksaan independen akan ditolak oleh backend bila dilakukan oleh teknisi
                    yang mengesahkan pekerjaan.
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
                            checklist?.mandatoryWorkComplete
                              ? 'mdi-check-circle'
                              : 'mdi-alert-circle'
                          }}
                        </VIcon>
                      </template>
                    </VListItem>
                    <VListItem title="Pemeriksaan independen selesai">
                      <template #append>
                        <VIcon
                          :color="checklist?.independentInspectionsComplete ? 'success' : 'error'"
                        >
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
                            checklist?.approvedDataAvailable
                              ? 'mdi-check-circle'
                              : 'mdi-alert-circle'
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
                        {{
                          releaseBlockers.length ? 'Rilis terblokir' : 'Layak untuk review rilis'
                        }}
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
                    Rilis tidak pernah otomatis. Kesiapan pesawat hanya diperbarui dari backend
                    setelah perintah berhasil.
                  </VAlert>
                  <VBtn
                    v-if="canRequestRelease && !immutablePackage"
                    block
                    class="mb-3"
                    color="warning"
                    prepend-icon="mdi-clipboard-check-outline"
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
                    prepend-icon="mdi-certificate-outline"
                    :disabled="selectorsPending"
                    @click="openReleaseDialog"
                  >
                    Terbitkan rilis teknis
                  </VBtn>
                  <VBtn
                    v-if="canExportAuditPack"
                    block
                    class="mt-3"
                    color="primary"
                    variant="outlined"
                    prepend-icon="mdi-file-export-outline"
                    :loading="actionLoading === 'audit-pack'"
                    @click="openAuditPack"
                  >
                    Tampilkan Rekam Teknis
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

          <VDialog v-model="slotDialog" max-width="760" persistent scrollable>
            <VCard>
              <VCardTitle>
                {{
                  slotMode === 'BOOK' ? 'Atur Slot Maintenance' : 'Jadwal Ulang Slot Maintenance'
                }}
              </VCardTitle>
              <VCardText>
                <VAlert type="info" variant="tonal" class="mb-4">
                  Slot maintenance adalah rencana lokasi dan waktu. Status BOOKED belum berarti
                  aircraft sudah berada fisik di bay.
                </VAlert>
                <VRow>
                  <VCol cols="12" md="6">
                    <VSelect
                      v-model="slotForm.facilityId"
                      label="Fasilitas Maintenance"
                      :items="facilityItems"
                      :disabled="actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VSelect
                      v-model="slotForm.areaId"
                      label="Hangar / Area"
                      :items="areaItems"
                      :disabled="!slotForm.facilityId || actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VSelect
                      v-model="slotForm.bayId"
                      label="Bay / Spot"
                      :items="bayItems"
                      :disabled="!slotForm.areaId || actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      :model-value="selectedFacility?.timezone ?? 'Asia/Jayapura'"
                      label="Timezone station"
                      readonly
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="slotForm.plannedStartAt"
                      label="Waktu Mulai"
                      type="datetime-local"
                      :disabled="actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="slotForm.plannedEndAt"
                      label="Perkiraan Selesai"
                      type="datetime-local"
                      :disabled="actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                  <VCol v-if="slotMode === 'RESCHEDULE'" cols="12">
                    <VTextarea
                      v-model="slotForm.reason"
                      label="Alasan jadwal ulang"
                      rows="2"
                      :disabled="actionLoading.startsWith('slot-')"
                    />
                  </VCol>
                </VRow>
                <VAlert
                  v-if="slotPreview"
                  :type="slotPreview.available ? 'success' : 'error'"
                  variant="tonal"
                  class="mt-2"
                >
                  <div class="font-weight-bold">
                    {{ slotPreview.available ? 'Tersedia' : 'Bentrok Jadwal' }}
                  </div>
                  <div v-if="slotPreview.available">
                    Bay tersedia pada rentang waktu yang dipilih.
                  </div>
                  <div v-else>
                    <div
                      v-for="conflict in slotPreview.conflicts"
                      :key="`${conflict.conflictType}-${conflict.slotId}`"
                    >
                      {{ ui.label(conflict.conflictType) }}:
                      {{ conflict.aircraftRegistrationNumber }} / {{ conflict.packageNumber }} ({{
                        formatSlotDateTime(conflict.plannedStartAt)
                      }}
                      - {{ formatSlotDateTime(conflict.plannedEndAt) }})
                    </div>
                  </div>
                </VAlert>
              </VCardText>
              <VCardActions>
                <VSpacer />
                <VBtn
                  variant="text"
                  :disabled="actionLoading.startsWith('slot-')"
                  @click="slotDialog = false"
                >
                  Batal
                </VBtn>
                <VBtn
                  variant="tonal"
                  prepend-icon="mdi-calendar-search"
                  :loading="actionLoading === 'slot-preview'"
                  :disabled="!slotForm.facilityId || !slotForm.areaId || !slotForm.bayId"
                  @click="previewSlotAvailability"
                >
                  Preview Availability
                </VBtn>
                <VBtn
                  color="primary"
                  prepend-icon="mdi-calendar-check"
                  :loading="actionLoading === 'slot-book' || actionLoading === 'slot-reschedule'"
                  :disabled="
                    !slotForm.facilityId ||
                      !slotForm.areaId ||
                      !slotForm.bayId ||
                      (slotMode === 'RESCHEDULE' && slotForm.reason.trim().length < 5)
                  "
                  @click="submitSlot"
                >
                  {{ slotMode === 'BOOK' ? 'Book Slot' : 'Simpan Jadwal Ulang' }}
                </VBtn>
              </VCardActions>
            </VCard>
          </VDialog>

          <VDialog v-model="slotCancelDialog" max-width="560">
            <VCard>
              <VCardTitle>Batalkan Slot Maintenance</VCardTitle>
              <VCardText>
                <VTextarea v-model="slotCancelReason" label="Alasan pembatalan" rows="3" />
              </VCardText>
              <VCardActions>
                <VSpacer />
                <VBtn
                  variant="text"
                  :disabled="actionLoading === 'slot-cancel'"
                  @click="slotCancelDialog = false"
                >
                  Batal
                </VBtn>
                <VBtn
                  color="error"
                  :loading="actionLoading === 'slot-cancel'"
                  :disabled="slotCancelReason.trim().length < 5"
                  @click="cancelCurrentSlot"
                >
                  Batalkan Slot
                </VBtn>
              </VCardActions>
            </VCard>
          </VDialog>

          <VDialog v-model="nonRoutineDialog" max-width="760" persistent scrollable>
            <VCard>
              <VCardTitle class="d-flex align-start ga-3">
                <div>
                  <h2 class="text-h6 mb-0">Catat Temuan Non-Routine</h2>
                  <div class="text-body-2 text-medium-emphasis">
                    Source: {{ nonRoutineSourceCard?.cardNumber ?? '-' }}
                  </div>
                </div>
                <VSpacer />
                <VBtn
                  icon="mdi-close"
                  variant="text"
                  :disabled="actionLoading === 'create-nr'"
                  @click="nonRoutineDialog = false"
                />
              </VCardTitle>
              <VCardText>
                <VRow>
                  <VCol cols="12">
                    <VTextField
                      v-model="nonRoutineForm.title"
                      label="Judul temuan"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VTextarea
                      v-model="nonRoutineForm.description"
                      label="Deskripsi temuan"
                      rows="4"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="4">
                    <VSelect
                      v-model="nonRoutineForm.severity"
                      label="Prioritas"
                      :items="['LOW', 'NORMAL', 'HIGH', 'AOG']"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="4">
                    <VTextField
                      v-model="nonRoutineForm.location"
                      label="Lokasi/System"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="4">
                    <VTextField
                      v-model="nonRoutineForm.ataChapter"
                      label="ATA"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VTextField
                      v-model="nonRoutineForm.evidenceReferences"
                      label="Evidence reference"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VSwitch
                      v-model="nonRoutineForm.immediateSafetyConcern"
                      label="Ada concern keselamatan langsung"
                      color="warning"
                    />
                  </VCol>
                </VRow>
              </VCardText>
              <VCardActions>
                <VSpacer />
                <VBtn
                  variant="text"
                  :disabled="actionLoading === 'create-nr'"
                  @click="nonRoutineDialog = false"
                >
                  Batal
                </VBtn>
                <VBtn
                  color="primary"
                  :loading="actionLoading === 'create-nr'"
                  :disabled="
                    nonRoutineForm.title.trim().length < 5 ||
                      nonRoutineForm.description.trim().length < 10
                  "
                  @click="submitNonRoutineFinding"
                >
                  Simpan Temuan
                </VBtn>
              </VCardActions>
            </VCard>
          </VDialog>

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
                  :loading="
                    inspectionCard ? actionLoading === `inspect-${inspectionCard.id}` : false
                  "
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
                  Rilis teknis selesai. Kesiapan pesawat dan snapshot signer di bawah ini berasal
                  dari backend setelah refresh.
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
                  Respons jaringan/API belum pasti. Ulangi hanya dengan referensi teknis perintah
                  yang sama, atau refresh sebelum mengirim perintah yang berbeda.
                </VAlert>
                <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
                  <strong>{{ actionError.title }}</strong>
                  <div>{{ actionError.impact }}</div>
                  <div class="text-caption">
                    Langkah berikutnya: {{ actionError.requiredAction }}
                  </div>
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
                          <VListItem
                            title="Paket pekerjaan"
                            :subtitle="workPackage.packageNumber"
                          />
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
                            :subtitle="
                              checklist?.approvedDataAvailable ? 'Tersedia' : 'Belum lengkap'
                            "
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
                          <div class="font-weight-bold">
                            {{ selectedSignerLicense.personnelName }}
                          </div>
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
                            Lisensi ini tidak dapat digunakan pada waktu rilis yang dipilih.
                            Perintah rilis akan ditolak.
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

          <VDialog v-model="auditPackDialog" max-width="1060" scrollable>
            <VCard>
              <VCardTitle class="d-flex align-start ga-3">
                <div>
                  <h2 class="text-h6 mb-0">Rekam Teknis Work Package</h2>
                  <div class="text-body-2 text-medium-emphasis">
                    Evidence package backend untuk release readiness dan histori technical release.
                  </div>
                </div>
                <VSpacer />
                <VBtn icon="mdi-close" variant="text" @click="auditPackDialog = false" />
              </VCardTitle>
              <VDivider />
              <VCardText>
                <VAlert type="warning" variant="tonal" class="mb-4">
                  {{ auditPack?.disclaimer }}
                </VAlert>
                <div class="audit-pack">
                  <header class="audit-pack__header">
                    <div>
                      <div class="text-caption">PT AMA Demo Environment</div>
                      <h3>{{ workPackage.packageNumber }}</h3>
                      <div>
                        {{ workPackage.aircraftRegistrationNumber }} / {{ workPackage.title }}
                      </div>
                    </div>
                    <div>
                      <div class="text-caption">Page ID / Manifest Hash</div>
                      <strong>{{ auditPack?.manifestHash }}</strong>
                    </div>
                  </header>
                  <section class="audit-pack__section">
                    <h4>Aircraft</h4>
                    <VTable density="compact">
                      <tbody>
                        <tr>
                          <td>Registration</td>
                          <td>{{ workPackage.aircraftRegistrationNumber }}</td>
                        </tr>
                        <tr>
                          <td>Model</td>
                          <td>{{ workPackage.aircraftModel ?? '-' }}</td>
                        </tr>
                        <tr>
                          <td>Serviceability</td>
                          <td>{{ ui.label(workPackage.aircraftTechnicalState) }}</td>
                        </tr>
                      </tbody>
                    </VTable>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Source & Planning Context</h4>
                    <VTable density="compact">
                      <tbody>
                        <tr>
                          <td>Source Defect</td>
                          <td>{{ technicalRecord?.evidence.source.primaryDefectNumber ?? '-' }}</td>
                        </tr>
                        <tr>
                          <td>Due Requirement</td>
                          <td>
                            {{
                              technicalRecord?.evidence.source.sourceDueRequirementCode
                                ? `${technicalRecord.evidence.source.sourceDueRequirementCode} - ${technicalRecord.evidence.source.sourceDueRequirementTitle ?? ''}`
                                : '-'
                            }}
                          </td>
                        </tr>
                        <tr>
                          <td>Facility Slot</td>
                          <td>
                            <template v-if="technicalRecord?.evidence.facilityContext">
                              {{ technicalRecord.evidence.facilityContext.facilityName }} /
                              {{ technicalRecord.evidence.facilityContext.bayCode }}
                              ({{ ui.label(technicalRecord.evidence.facilityContext.status) }})
                            </template>
                            <template v-else>-</template>
                          </td>
                        </tr>
                      </tbody>
                    </VTable>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Job Cards dan Inspection</h4>
                    <VTable density="compact">
                      <thead>
                        <tr>
                          <th>Kartu</th>
                          <th>Data</th>
                          <th>Mechanic</th>
                          <th>Inspection</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="card in workPackage.jobCards" :key="card.id">
                          <td>
                            <strong>{{ card.cardNumber }}</strong>
                            <div class="text-caption">{{ card.title }}</div>
                          </td>
                          <td>
                            {{ card.maintenanceDataRef }} / {{ card.maintenanceDataRevision }}
                          </td>
                          <td>
                            {{
                              signoff(card, 'MECHANIC')
                                ? format.dateTime(signoff(card, 'MECHANIC')?.signedAt)
                                : '-'
                            }}
                          </td>
                          <td>
                            {{ card.inspectionAttempts.length }} attempt /
                            {{ ui.label(signoff(card, 'INDEPENDENT_INSPECTION')?.decision) }}
                          </td>
                        </tr>
                      </tbody>
                    </VTable>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Materials, Personnel, Tools</h4>
                    <VRow>
                      <VCol cols="12" md="4">
                        <VList density="compact" lines="two">
                          <VListSubheader>Material Traceability</VListSubheader>
                          <VListItem
                            v-for="item in technicalRecord?.evidence.materialTraceability ?? []"
                            :key="String(item.id)"
                            :title="String(item.part_number ?? item.installation_number ?? '-')"
                            :subtitle="`Serial ${String(item.serial_number ?? '-')} / Installed ${formatDateTime(String(item.installed_at ?? ''))}`"
                          />
                          <VListItem
                            v-if="!technicalRecord?.evidence.materialTraceability.length"
                            title="Tidak ada installation record"
                          />
                        </VList>
                      </VCol>
                      <VCol cols="12" md="4">
                        <VList density="compact" lines="two">
                          <VListSubheader>Personnel Evidence</VListSubheader>
                          <VListItem
                            v-for="item in technicalRecord?.evidence.personnelEvidence ?? []"
                            :key="String(item.id)"
                            :title="String(item.personnel_name ?? item.personnel_id ?? '-')"
                            :subtitle="`${String(item.role_type ?? '-')} / ${String(item.status ?? '-')}`"
                          />
                          <VListItem
                            v-if="!technicalRecord?.evidence.personnelEvidence.length"
                            title="Tidak ada assignment personnel"
                          />
                        </VList>
                      </VCol>
                      <VCol cols="12" md="4">
                        <VList density="compact" lines="two">
                          <VListSubheader>Tool Evidence</VListSubheader>
                          <VListItem
                            v-for="item in technicalRecord?.evidence.toolEvidence ?? []"
                            :key="String(item.id)"
                            :title="String(item.tool_code ?? item.tool_id ?? '-')"
                            :subtitle="`${String(item.allocation_status ?? '-')} / Returned ${formatDateTime(String(item.returned_at ?? ''))}`"
                          />
                          <VListItem
                            v-if="!technicalRecord?.evidence.toolEvidence.length"
                            title="Tidak ada tool allocation"
                          />
                        </VList>
                      </VCol>
                    </VRow>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Release Eligibility</h4>
                    <VAlert
                      :type="technicalRecord?.releaseEligibility.eligible ? 'success' : 'error'"
                      variant="tonal"
                    >
                      {{
                        technicalRecord?.releaseEligibility.eligible
                          ? 'Eligibility backend lulus saat preview terakhir.'
                          : 'Eligibility backend masih memiliki blocker.'
                      }}
                    </VAlert>
                    <ul class="mt-3">
                      <li
                        v-for="blocker in technicalRecord?.releaseEligibility.blockers ?? []"
                        :key="`${blocker.code}-${blocker.sourceId}`"
                      >
                        {{ blocker.title }} - {{ blocker.code }}
                      </li>
                    </ul>
                    <VAlert
                      v-if="technicalRecord?.releaseSnapshot"
                      type="success"
                      variant="tonal"
                      class="mt-3"
                    >
                      Snapshot immutable tersimpan pada
                      {{ formatDateTime(technicalRecord.releaseSnapshot.createdAt) }}
                      untuk release {{ technicalRecord.releaseSnapshot.releaseId ?? '-' }}.
                    </VAlert>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Audit Timeline</h4>
                    <ol>
                      <li v-for="record in workPackage.auditRecords ?? []" :key="record.id">
                        {{ format.dateTime(record.occurredAt) }} - {{ record.actorRole }} -
                        {{ ui.label(record.action) }}
                      </li>
                    </ol>
                  </section>
                  <section class="audit-pack__section">
                    <h4>Manifest JSON</h4>
                    <pre>{{ JSON.stringify(auditPack?.manifest, null, 2) }}</pre>
                  </section>
                </div>
              </VCardText>
              <VDivider />
              <VCardActions>
                <VBtn variant="text" @click="auditPackDialog = false">Tutup</VBtn>
                <VSpacer />
                <VBtn prepend-icon="mdi-printer" color="primary" @click="printAuditPack">
                  Print / Export
                </VBtn>
              </VCardActions>
            </VCard>
          </VDialog>
        </VWindowItem>

        <!-- Material Tab -->
        <VWindowItem value="material">
          <VCard border class="mb-4">
            <VCardTitle class="d-flex align-center">
              <div>
                <span>Kebutuhan material</span>
                <div class="text-caption text-medium-emphasis">
                  MRO menentukan kebutuhan dan pemasangan; Inventory mengendalikan reservasi, issue,
                  serta return.
                </div>
              </div>
              <VSpacer />
              <VBtn
                v-if="canRequestMaterial"
                prepend-icon="mdi-plus"
                size="small"
                text="Tambah kebutuhan"
                variant="tonal"
                @click="materialRequirementDialog = true"
              />
            </VCardTitle>
            <VCardText>
              <VAlert v-if="resourceError" type="error" variant="tonal" class="mb-4">
                {{ resourceError }}
              </VAlert>

              <VProgressLinear v-if="resourceLoading" indeterminate class="mb-4" />
              <VAlert class="mb-4" type="info" variant="tonal">
                Status reservasi dan issue bersifat read-only untuk role MRO.
                <VBtn
                  class="ml-2"
                  size="small"
                  text="Buka antrean Inventory"
                  to="/inventory/maintenance-demand"
                  variant="text"
                />
              </VAlert>

              <!-- Resource Declaration -->
              <VCard
                v-if="!resourceDeclarations.find((d: any) => d.resourceType === 'MATERIAL')"
                border
                class="mb-4"
              >
                <VCardText>
                  <div class="text-subtitle-1 mb-2">Material Planning Declaration</div>
                  <div class="d-flex gap-2">
                    <VBtn color="primary" @click="declareResourceType('MATERIAL', 'REQUIRED')">
                      Declare Required
                    </VBtn>
                    <VBtn variant="outlined" disabled> Not Required </VBtn>
                  </div>
                </VCardText>
              </VCard>

              <VAlert
                v-else-if="
                  resourceDeclarations.find((d: any) => d.resourceType === 'MATERIAL')
                    ?.declaration === 'NOT_REQUIRED'
                "
                type="info"
                variant="tonal"
                class="mb-4"
              >
                <strong>Material declared as NOT REQUIRED</strong>
                <div
                  v-if="
                    resourceDeclarations.find((d: any) => d.resourceType === 'MATERIAL')?.reason
                  "
                >
                  Reason:
                  {{ resourceDeclarations.find((d: any) => d.resourceType === 'MATERIAL')?.reason }}
                </div>
              </VAlert>

              <!-- Blockers -->
              <VAlert
                v-for="blocker in mroEligibility?.sections?.material?.blockers || []"
                :key="blocker.code"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ blocker.title }}</div>
                <div>{{ blocker.message }}</div>
                <div v-if="blocker.suggestedAction" class="text-caption mt-1">
                  Suggested: {{ blocker.suggestedAction }}
                </div>
              </VAlert>

              <VAlert
                v-for="warning in mroEligibility?.sections?.material?.warnings || []"
                :key="warning.code"
                type="warning"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ warning.title }}</div>
                <div>{{ warning.message }}</div>
              </VAlert>

              <!-- Material Requirements Table -->
              <VTable v-if="materialRequirements.length" density="compact" hover>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Part Name</th>
                    <th>Qty Required</th>
                    <th>Reserved</th>
                    <th>Issued</th>
                    <th>Installed</th>
                    <th>Station</th>
                    <th>Status</th>
                    <th>ATP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="req in materialRequirements" :key="req.id">
                    <td>{{ req.partNumber || req.partId || '-' }}</td>
                    <td>{{ req.partName || '-' }}</td>
                    <td>{{ req.requiredQuantity }} {{ req.unit }}</td>
                    <td>{{ req.reservedQuantity }}</td>
                    <td>{{ req.issuedQuantity }}</td>
                    <td>{{ req.installedQuantity }}</td>
                    <td>{{ req.requestedStationId || '-' }}</td>
                    <td>
                      <VChip :color="req.satisfied ? 'success' : 'warning'" size="small">
                        {{ req.lifecycleStatus }}
                      </VChip>
                    </td>
                    <td>
                      <VBtn
                        v-if="req.partId && req.requestedStationId"
                        size="x-small"
                        variant="text"
                        @click="checkAtp(req)"
                      >
                        Check
                      </VBtn>
                      <div v-if="atpResults[req.id]" class="text-caption">
                        Available: {{ atpResults[req.id].availableToPromise }}
                      </div>
                    </td>
                    <td>
                      <div class="d-flex flex-wrap ga-1">
                        <VBtn
                          v-if="
                            canReserveMaterial &&
                              req.lifecycleStatus === 'REQUESTED' &&
                              req.partId &&
                              req.requestedStationId
                          "
                          size="x-small"
                          color="primary"
                          :loading="resourceLoading"
                          @click="reserveMaterialRequirement(req)"
                        >
                          Reserve
                        </VBtn>
                        <VBtn
                          v-if="canIssueMaterial && req.lifecycleStatus === 'RESERVED'"
                          size="x-small"
                          color="primary"
                          :loading="resourceLoading"
                          @click="issueMaterialRequirement(req)"
                        >
                          Issue
                        </VBtn>
                        <VBtn
                          v-if="canReserveMaterial && req.lifecycleStatus === 'RESERVED'"
                          size="x-small"
                          variant="text"
                          :loading="resourceLoading"
                          @click="releaseMaterialRequirement(req)"
                        >
                          Release
                        </VBtn>
                        <VBtn
                          v-if="canInstallMaterial && req.lifecycleStatus === 'ISSUED'"
                          size="x-small"
                          color="primary"
                          :loading="resourceLoading"
                          @click="installMaterialRequirement(req)"
                        >
                          Install
                        </VBtn>
                        <VChip v-if="req.satisfied" size="x-small" color="success">
                          Trace complete
                        </VChip>
                      </div>
                      <div
                        v-if="traceForRequirement(req.id)?.installations.length"
                        class="text-caption text-medium-emphasis mt-1"
                      >
                        {{ traceForRequirement(req.id)?.installations[0]?.installationNumber }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </VTable>

              <VAlert v-else type="info" variant="tonal">
                Belum ada kebutuhan material untuk paket pekerjaan ini.
              </VAlert>

              <VDialog v-model="materialRequirementDialog" max-width="680" persistent>
                <VCard title="Tambah kebutuhan material">
                  <VCardText>
                    <VAutocomplete
                      v-model="materialRequirementForm.partId"
                      class="mb-3"
                      :items="materialPartOptions"
                      label="Part"
                      variant="outlined"
                    />
                    <VSelect
                      v-model="materialRequirementForm.requestedStationId"
                      class="mb-3"
                      :items="materialStationOptions"
                      label="Station pemenuhan"
                      variant="outlined"
                    />
                    <VTextField
                      v-model.number="materialRequirementForm.requiredQuantity"
                      class="mb-3"
                      label="Jumlah"
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <VTextField
                      v-model="materialRequirementForm.requiredBy"
                      class="mb-3"
                      label="Diperlukan sebelum"
                      type="date"
                      variant="outlined"
                    />
                    <VTextarea
                      v-model="materialRequirementForm.reason"
                      label="Alasan kebutuhan"
                      rows="3"
                      variant="outlined"
                    />
                  </VCardText>
                  <VCardActions>
                    <VSpacer /><VBtn
                      text="Batal"
                      variant="text"
                      @click="materialRequirementDialog = false"
                    /><VBtn
                      :disabled="
                        !materialRequirementForm.partId ||
                          !materialRequirementForm.requestedStationId ||
                          materialRequirementForm.requiredQuantity <= 0
                      "
                      :loading="resourceLoading"
                      text="Kirim ke Inventory"
                      @click="createMaterialRequirement"
                    />
                  </VCardActions>
                </VCard>
              </VDialog>

              <!-- Reservations -->
              <VCard v-if="materialReservations.length" border class="mt-4">
                <VCardTitle class="text-subtitle-1">Reservations</VCardTitle>
                <VCardText>
                  <VTable density="compact" hover>
                    <thead>
                      <tr>
                        <th>Reservation #</th>
                        <th>Part</th>
                        <th>Lot/Serial</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Station</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="res in materialReservations" :key="res.id">
                        <td>{{ res.reservationNumber }}</td>
                        <td>{{ res.partNumber || res.partId }}</td>
                        <td>{{ res.lotNumber || res.serialNumber || '-' }}</td>
                        <td>{{ res.quantity }} {{ res.unit }}</td>
                        <td>
                          <VChip size="x-small">{{ res.status }}</VChip>
                        </td>
                        <td>{{ res.stationId }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </VCardText>
          </VCard>
        </VWindowItem>

        <!-- Tool Tab -->
        <VWindowItem value="tool">
          <VCard border class="mb-4">
            <VCardTitle class="d-flex align-center">
              <span>Tool Requirements</span>
              <VSpacer />
            </VCardTitle>
            <VCardText>
              <VAlert v-if="resourceError" type="error" variant="tonal" class="mb-4">
                {{ resourceError }}
              </VAlert>

              <VProgressLinear v-if="resourceLoading" indeterminate class="mb-4" />

              <!-- Resource Declaration -->
              <VCard
                v-if="!resourceDeclarations.find((d: any) => d.resourceType === 'TOOL')"
                border
                class="mb-4"
              >
                <VCardText>
                  <div class="text-subtitle-1 mb-2">Tool Planning Declaration</div>
                  <div class="d-flex gap-2">
                    <VBtn color="primary" @click="declareResourceType('TOOL', 'REQUIRED')">
                      Declare Required
                    </VBtn>
                    <VBtn variant="outlined" disabled> Not Required </VBtn>
                  </div>
                </VCardText>
              </VCard>

              <VAlert
                v-else-if="
                  resourceDeclarations.find((d: any) => d.resourceType === 'TOOL')?.declaration ===
                    'NOT_REQUIRED'
                "
                type="info"
                variant="tonal"
                class="mb-4"
              >
                <strong>Tool declared as NOT REQUIRED</strong>
                <div
                  v-if="resourceDeclarations.find((d: any) => d.resourceType === 'TOOL')?.reason"
                >
                  Reason:
                  {{ resourceDeclarations.find((d: any) => d.resourceType === 'TOOL')?.reason }}
                </div>
              </VAlert>

              <!-- Blockers -->
              <VAlert
                v-for="blocker in mroEligibility?.sections?.tool?.blockers || []"
                :key="blocker.code"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ blocker.title }}</div>
                <div>{{ blocker.message }}</div>
                <div v-if="blocker.suggestedAction" class="text-caption mt-1">
                  Suggested: {{ blocker.suggestedAction }}
                </div>
              </VAlert>

              <VAlert
                v-for="warning in mroEligibility?.sections?.tool?.warnings || []"
                :key="warning.code"
                type="warning"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ warning.title }}</div>
                <div>{{ warning.message }}</div>
              </VAlert>

              <!-- Tool Requirements Table -->
              <VTable v-if="toolRequirements.length" density="compact" hover>
                <thead>
                  <tr>
                    <th>Tool Code</th>
                    <th>Tool Name</th>
                    <th>Qty Required</th>
                    <th>Station</th>
                    <th>Required From</th>
                    <th>Required Until</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="req in toolRequirements" :key="req.id">
                    <tr>
                      <td>{{ req.toolCode || req.toolMasterId || req.toolType || '-' }}</td>
                      <td>{{ req.toolName || req.toolType || '-' }}</td>
                      <td>{{ req.quantity }}</td>
                      <td>{{ req.requiredStationId }}</td>
                      <td>{{ formatDate(req.requiredFrom) }}</td>
                      <td>{{ formatDate(req.requiredUntil) }}</td>
                      <td>
                        <VChip
                          :color="req.status === 'ALLOCATED' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ req.status }}
                        </VChip>
                      </td>
                      <td>
                        <VBtn
                          size="small"
                          variant="tonal"
                          prepend-icon="mdi-toolbox-outline"
                          :loading="resourceLoading"
                          @click="loadToolCandidates(req)"
                        >
                          Kandidat
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="toolCandidates[req.id]?.length">
                      <td colspan="8">
                        <VTable density="compact" class="bg-transparent">
                          <thead>
                            <tr>
                              <th>Tool</th>
                              <th>Serial</th>
                              <th>Kalibrasi</th>
                              <th>Ketersediaan</th>
                              <th>Eligibility</th>
                              <th>Alasan</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="candidate in toolCandidates[req.id]" :key="candidate.toolId">
                              <td>{{ candidate.toolCode }} / {{ candidate.toolName }}</td>
                              <td>{{ candidate.serialNumber || '-' }}</td>
                              <td>
                                {{
                                  candidate.calibrationExpiresAt
                                    ? formatDate(candidate.calibrationExpiresAt)
                                    : 'Tidak ada'
                                }}
                              </td>
                              <td>
                                <VChip
                                  :color="
                                    candidate.availabilityStatus === 'AVAILABLE'
                                      ? 'success'
                                      : candidate.availabilityStatus === 'NOT_SCHEDULE_VALIDATED'
                                        ? 'warning'
                                        : 'error'
                                  "
                                  size="x-small"
                                >
                                  {{ candidate.availabilityStatus }}
                                </VChip>
                              </td>
                              <td>
                                <VChip
                                  :color="
                                    candidate.eligibilityStatus === 'ELIGIBLE' ? 'success' : 'error'
                                  "
                                  size="x-small"
                                >
                                  {{ candidate.eligibilityStatus }}
                                </VChip>
                              </td>
                              <td class="text-caption">
                                {{ candidate.reasons.join(', ') || '-' }}
                              </td>
                              <td>
                                <VBtn
                                  size="small"
                                  color="primary"
                                  :disabled="candidate.eligibilityStatus !== 'ELIGIBLE'"
                                  :loading="resourceLoading"
                                  @click="allocateToolCandidate(req, candidate)"
                                >
                                  Allocate
                                </VBtn>
                              </td>
                            </tr>
                          </tbody>
                        </VTable>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </VTable>

              <VAlert v-else type="info" variant="tonal">
                No tool requirements found for this work package.
              </VAlert>

              <!-- Tool Allocations -->
              <VCard v-if="toolAllocations.length" border class="mt-4">
                <VCardTitle class="text-subtitle-1">Tool Allocations</VCardTitle>
                <VCardText>
                  <VTable density="compact" hover>
                    <thead>
                      <tr>
                        <th>Tool</th>
                        <th>Serial #</th>
                        <th>Calibration Status</th>
                        <th>Custodian</th>
                        <th>Status</th>
                        <th>Allocated At</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="alloc in toolAllocations" :key="alloc.id">
                        <td>{{ alloc.toolCode || alloc.toolId }}</td>
                        <td>{{ alloc.toolSerialNumber || '-' }}</td>
                        <td>
                          <VChip
                            :color="toolCalibrationState(alloc) === 'EXPIRED' ? 'error' : 'success'"
                            size="x-small"
                          >
                            {{ toolCalibrationState(alloc) }}
                          </VChip>
                        </td>
                        <td>{{ alloc.custodianName || alloc.custodianPersonnelId || '-' }}</td>
                        <td>
                          <VChip size="x-small">{{ alloc.status }}</VChip>
                        </td>
                        <td>{{ formatDate(alloc.allocatedAt) }}</td>
                        <td>
                          <div class="d-flex flex-wrap ga-2">
                            <VBtn
                              v-if="alloc.status === 'ALLOCATED'"
                              size="x-small"
                              variant="tonal"
                              :loading="resourceLoading"
                              @click="checkoutTool(alloc)"
                            >
                              Check Out
                            </VBtn>
                            <VBtn
                              v-if="alloc.status === 'IN_USE'"
                              size="x-small"
                              color="primary"
                              :loading="resourceLoading"
                              @click="returnToolAllocation(alloc)"
                            >
                              Return
                            </VBtn>
                            <span
                              v-if="!['ALLOCATED', 'IN_USE'].includes(alloc.status)"
                              class="text-caption text-medium-emphasis"
                            >
                              Riwayat
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </VCardText>
          </VCard>
        </VWindowItem>

        <!-- Personnel Tab -->
        <VWindowItem value="personnel">
          <VCard border class="mb-4">
            <VCardTitle class="d-flex align-center">
              <span>Personnel Requirements</span>
              <VSpacer />
            </VCardTitle>
            <VCardText>
              <VAlert v-if="resourceError" type="error" variant="tonal" class="mb-4">
                {{ resourceError }}
              </VAlert>

              <VProgressLinear v-if="resourceLoading" indeterminate class="mb-4" />

              <!-- Resource Declaration -->
              <VCard
                v-if="!resourceDeclarations.find((d: any) => d.resourceType === 'PERSONNEL')"
                border
                class="mb-4"
              >
                <VCardText>
                  <div class="text-subtitle-1 mb-2">Personnel Planning Declaration</div>
                  <div class="d-flex gap-2">
                    <VBtn color="primary" @click="declareResourceType('PERSONNEL', 'REQUIRED')">
                      Declare Required
                    </VBtn>
                    <VBtn variant="outlined" disabled> Not Required </VBtn>
                  </div>
                </VCardText>
              </VCard>

              <VAlert
                v-else-if="
                  resourceDeclarations.find((d: any) => d.resourceType === 'PERSONNEL')
                    ?.declaration === 'NOT_REQUIRED'
                "
                type="info"
                variant="tonal"
                class="mb-4"
              >
                <strong>Personnel declared as NOT REQUIRED</strong>
                <div
                  v-if="
                    resourceDeclarations.find((d: any) => d.resourceType === 'PERSONNEL')?.reason
                  "
                >
                  Reason:
                  {{
                    resourceDeclarations.find((d: any) => d.resourceType === 'PERSONNEL')?.reason
                  }}
                </div>
              </VAlert>

              <!-- Blockers -->
              <VAlert
                v-for="blocker in mroEligibility?.sections?.personnel?.blockers || []"
                :key="blocker.code"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ blocker.title }}</div>
                <div>{{ blocker.message }}</div>
                <div v-if="blocker.suggestedAction" class="text-caption mt-1">
                  Suggested: {{ blocker.suggestedAction }}
                </div>
              </VAlert>

              <VAlert
                v-for="warning in mroEligibility?.sections?.personnel?.warnings || []"
                :key="warning.code"
                type="warning"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ warning.title }}</div>
                <div>{{ warning.message }}</div>
              </VAlert>

              <!-- Personnel Requirements Table -->
              <VTable v-if="personnelRequirements.length" density="compact" hover>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>License Type</th>
                    <th>Qty Required</th>
                    <th>Qty Assigned</th>
                    <th>Station</th>
                    <th>Required From</th>
                    <th>Required Until</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="req in personnelRequirements" :key="req.id">
                    <tr>
                      <td>{{ req.roleType }}</td>
                      <td>{{ req.requiredLicenceType || '-' }}</td>
                      <td>{{ req.requiredCount }}</td>
                      <td>{{ req.assignedCount }}</td>
                      <td>{{ req.dutyStationId }}</td>
                      <td>{{ formatDate(req.requiredFrom) }}</td>
                      <td>{{ formatDate(req.requiredUntil) }}</td>
                      <td>
                        <VChip
                          :color="req.status === 'FULFILLED' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ req.status }}
                        </VChip>
                      </td>
                      <td>
                        <VBtn
                          size="small"
                          variant="tonal"
                          prepend-icon="mdi-account-search-outline"
                          :loading="resourceLoading"
                          @click="loadPersonnelCandidates(req)"
                        >
                          Kandidat
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="personnelCandidates[req.id]?.length">
                      <td colspan="9">
                        <VTable density="compact" class="bg-transparent">
                          <thead>
                            <tr>
                              <th>Personel</th>
                              <th>Lisensi</th>
                              <th>PT AMA Auth</th>
                              <th>Ketersediaan</th>
                              <th>Eligibility</th>
                              <th>Alasan</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="candidate in personnelCandidates[req.id]"
                              :key="candidate.personnelId"
                            >
                              <td>{{ candidate.personnelName }}</td>
                              <td>{{ candidate.licenceReference || '-' }}</td>
                              <td>{{ candidate.authorizationReference || '-' }}</td>
                              <td>
                                <VChip
                                  :color="
                                    candidate.availabilityStatus === 'AVAILABLE'
                                      ? 'success'
                                      : candidate.availabilityStatus === 'NOT_SCHEDULE_VALIDATED'
                                        ? 'warning'
                                        : 'error'
                                  "
                                  size="x-small"
                                >
                                  {{ candidate.availabilityStatus }}
                                </VChip>
                              </td>
                              <td>
                                <VChip
                                  :color="
                                    candidate.eligibilityStatus === 'ELIGIBLE' ? 'success' : 'error'
                                  "
                                  size="x-small"
                                >
                                  {{ candidate.eligibilityStatus }}
                                </VChip>
                              </td>
                              <td class="text-caption">
                                {{ candidate.reasons.join(', ') || '-' }}
                              </td>
                              <td>
                                <VBtn
                                  size="small"
                                  color="primary"
                                  :disabled="candidate.eligibilityStatus !== 'ELIGIBLE'"
                                  :loading="resourceLoading"
                                  @click="assignPersonnelCandidate(req, candidate)"
                                >
                                  Assign
                                </VBtn>
                              </td>
                            </tr>
                          </tbody>
                        </VTable>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </VTable>

              <VAlert v-else type="info" variant="tonal">
                No personnel requirements found for this work package.
              </VAlert>

              <!-- Personnel Assignments -->
              <VCard v-if="personnelAssignments.length" border class="mt-4">
                <VCardTitle class="text-subtitle-1">Personnel Assignments</VCardTitle>
                <VCardText>
                  <VTable density="compact" hover>
                    <thead>
                      <tr>
                        <th>Personnel</th>
                        <th>Role</th>
                        <th>License</th>
                        <th>Eligibility</th>
                        <th>Status</th>
                        <th>Assigned At</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="assign in personnelAssignments" :key="assign.id">
                        <td>{{ assign.personnelName || assign.personnelId }}</td>
                        <td>{{ assign.roleType }}</td>
                        <td>{{ assign.licenseNumber || '-' }}</td>
                        <td>
                          <VChip
                            :color="assign.eligibilityStatus === 'ELIGIBLE' ? 'success' : 'error'"
                            size="x-small"
                          >
                            {{ assign.eligibilityStatus || 'PENDING' }}
                          </VChip>
                        </td>
                        <td>
                          <VChip size="x-small">{{ assign.status }}</VChip>
                        </td>
                        <td>{{ formatDate(assign.assignedAt) }}</td>
                        <td>
                          <div class="d-flex flex-wrap ga-2">
                            <VBtn
                              v-if="assign.status === 'ASSIGNED'"
                              size="x-small"
                              variant="tonal"
                              :disabled="assign.eligibilityStatus !== 'ELIGIBLE'"
                              :loading="resourceLoading"
                              @click="confirmPersonnel(assign)"
                            >
                              Confirm
                            </VBtn>
                            <VBtn
                              v-if="['ASSIGNED', 'CONFIRMED'].includes(assign.status)"
                              size="x-small"
                              color="error"
                              variant="tonal"
                              :loading="resourceLoading"
                              @click="releasePersonnelAssignment(assign)"
                            >
                              Release
                            </VBtn>
                            <span
                              v-if="!['ASSIGNED', 'CONFIRMED'].includes(assign.status)"
                              class="text-caption text-medium-emphasis"
                            >
                              Riwayat
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </VCardText>
          </VCard>
        </VWindowItem>

        <!-- AMO Scope Tab -->
        <VWindowItem value="amo">
          <VCard border class="mb-4">
            <VCardTitle>AMO Organization & Scope</VCardTitle>
            <VCardText>
              <VAlert v-if="resourceError" type="error" variant="tonal" class="mb-4">
                {{ resourceError }}
              </VAlert>

              <VProgressLinear v-if="resourceLoading" indeterminate class="mb-4" />

              <!-- Blockers -->
              <VAlert
                v-for="blocker in mroEligibility?.sections?.amoScope?.blockers || []"
                :key="blocker.code"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ blocker.title }}</div>
                <div>{{ blocker.message }}</div>
                <div v-if="blocker.suggestedAction" class="text-caption mt-1">
                  Suggested: {{ blocker.suggestedAction }}
                </div>
              </VAlert>

              <VAlert
                v-for="warning in mroEligibility?.sections?.amoScope?.warnings || []"
                :key="warning.code"
                type="warning"
                variant="tonal"
                class="mb-3"
              >
                <div class="font-weight-bold">{{ warning.title }}</div>
                <div>{{ warning.message }}</div>
              </VAlert>

              <template v-if="amoOrganization">
                <VCard border class="mb-4">
                  <VCardTitle class="text-subtitle-1">Organization Details</VCardTitle>
                  <VCardText>
                    <VRow>
                      <VCol cols="12" md="6">
                        <div class="text-caption">Organization Name</div>
                        <div class="text-body-1 font-weight-medium">
                          {{ amoOrganization.organizationName }}
                        </div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption">Organization Code</div>
                        <div class="text-body-1">{{ amoOrganization.organizationCode }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption">AMO Certificate</div>
                        <div class="text-body-1">
                          {{ amoOrganization.approvalReference || '-' }}
                        </div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption">Status</div>
                        <VChip
                          :color="amoOrganization.status === 'ACTIVE' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ amoOrganization.status }}
                        </VChip>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption">Valid From</div>
                        <div class="text-body-1">{{ formatDate(amoOrganization.validFrom) }}</div>
                      </VCol>
                      <VCol cols="12" md="6">
                        <div class="text-caption">Valid Until</div>
                        <div class="text-body-1">{{ formatDate(amoOrganization.validUntil) }}</div>
                      </VCol>
                    </VRow>
                  </VCardText>
                </VCard>

                <VCard v-if="amoOrganization.scopes && amoOrganization.scopes.length" border>
                  <VCardTitle class="text-subtitle-1">Applicable Scopes</VCardTitle>
                  <VCardText>
                    <VTable density="compact" hover>
                      <thead>
                        <tr>
                          <th>Aircraft Type</th>
                          <th>Work Type</th>
                          <th>Rating</th>
                          <th>Limitations</th>
                          <th>Valid From</th>
                          <th>Valid Until</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="scope in amoOrganization.scopes" :key="scope.id">
                          <td>{{ scope.aircraftType }}</td>
                          <td>{{ scope.maintenanceAction }}</td>
                          <td>{{ scope.rating || '-' }}</td>
                          <td>{{ scope.limitation || '-' }}</td>
                          <td>{{ formatDate(scope.validFrom) }}</td>
                          <td>{{ formatDate(scope.validUntil) }}</td>
                          <td>
                            <VChip
                              :color="scope.status === 'ACTIVE' ? 'success' : 'warning'"
                              size="x-small"
                            >
                              {{ scope.status }}
                            </VChip>
                          </td>
                        </tr>
                      </tbody>
                    </VTable>
                  </VCardText>
                </VCard>
              </template>

              <VAlert v-else type="info" variant="tonal">
                No AMO organization assigned to this work package.
              </VAlert>
            </VCardText>
          </VCard>
        </VWindowItem>

        <!-- MRO Execution Resource Readiness Tab -->
        <VWindowItem value="eligibility">
          <VCard border class="mb-4">
            <VCardTitle>Execution Resource Readiness</VCardTitle>
            <VCardText>
              <VAlert v-if="resourceError" type="error" variant="tonal" class="mb-4">
                {{ resourceError }}
              </VAlert>

              <VProgressLinear v-if="resourceLoading" indeterminate class="mb-4" />

              <template v-if="mroEligibility">
                <!-- Overall Eligibility -->
                <VAlert
                  :type="mroEligibility.eligible ? 'success' : 'error'"
                  variant="tonal"
                  class="mb-4"
                >
                  <div class="font-weight-bold">
                    {{
                      mroEligibility.eligible
                        ? 'Resource readiness terpenuhi'
                        : 'Resource readiness belum terpenuhi'
                    }}
                  </div>
                  <div v-if="mroEligibility.evaluatedAt" class="text-caption mt-1">
                    Evaluated at: {{ formatDateTime(mroEligibility.evaluatedAt) }}
                  </div>
                  <div class="text-caption mt-1">
                    Status ini untuk kesiapan eksekusi material, personel, dan tool. Technical
                    Release memakai panel Release Readiness backend.
                  </div>
                </VAlert>

                <!-- Resource Summary -->
                <VCard v-if="mroEligibility.resourceSummary" border class="mb-4">
                  <VCardTitle class="text-subtitle-1">Resource Summary</VCardTitle>
                  <VCardText>
                    <VRow>
                      <VCol cols="12" md="4">
                        <div class="text-caption">Material</div>
                        <div class="text-body-1">
                          {{ mroEligibility.resourceSummary.materialReserved }} /
                          {{ mroEligibility.resourceSummary.materialRequirements }} requirements
                          reserved
                        </div>
                      </VCol>
                      <VCol cols="12" md="4">
                        <div class="text-caption">Tool</div>
                        <div class="text-body-1">
                          {{ mroEligibility.resourceSummary.toolsAllocated }} /
                          {{ mroEligibility.resourceSummary.toolRequirements }} tools allocated
                        </div>
                      </VCol>
                      <VCol cols="12" md="4">
                        <div class="text-caption">Personnel</div>
                        <div class="text-body-1">
                          {{ mroEligibility.resourceSummary.personnelEligible }} /
                          {{ mroEligibility.resourceSummary.personnelRequirements }} personnel
                          eligible
                        </div>
                      </VCol>
                    </VRow>
                  </VCardText>
                </VCard>

                <!-- All Blockers -->
                <VCard
                  v-if="mroEligibility.blockers && mroEligibility.blockers.length"
                  border
                  class="mb-4"
                >
                  <VCardTitle class="text-subtitle-1">All Blockers</VCardTitle>
                  <VCardText>
                    <VAlert
                      v-for="blocker in mroEligibility.blockers"
                      :key="blocker.code"
                      type="error"
                      variant="tonal"
                      class="mb-3"
                    >
                      <div class="font-weight-bold">{{ blocker.title }}</div>
                      <div>{{ blocker.message }}</div>
                      <div v-if="blocker.suggestedAction" class="text-caption mt-1">
                        Suggested: {{ blocker.suggestedAction }}
                      </div>
                      <div v-if="blocker.section" class="text-caption mt-1">
                        Section: {{ blocker.section }}
                      </div>
                    </VAlert>
                  </VCardText>
                </VCard>

                <!-- All Warnings -->
                <VCard
                  v-if="mroEligibility.warnings && mroEligibility.warnings.length"
                  border
                  class="mb-4"
                >
                  <VCardTitle class="text-subtitle-1">All Warnings</VCardTitle>
                  <VCardText>
                    <VAlert
                      v-for="warning in mroEligibility.warnings"
                      :key="warning.code"
                      type="warning"
                      variant="tonal"
                      class="mb-3"
                    >
                      <div class="font-weight-bold">{{ warning.title }}</div>
                      <div>{{ warning.message }}</div>
                      <div v-if="warning.suggestedAction" class="text-caption mt-1">
                        Suggested: {{ warning.suggestedAction }}
                      </div>
                    </VAlert>
                  </VCardText>
                </VCard>

                <!-- Section-by-Section Breakdown -->
                <VCard border>
                  <VCardTitle class="text-subtitle-1">Section Breakdown</VCardTitle>
                  <VCardText>
                    <VExpansionPanels>
                      <VExpansionPanel v-for="(section, key) in mroEligibility.sections" :key="key">
                        <VExpansionPanelTitle>
                          <div class="d-flex align-center justify-space-between w-100">
                            <span class="font-weight-medium">{{ key }}</span>
                            <VChip
                              :color="section.status === 'SIAP' ? 'success' : 'error'"
                              size="small"
                              class="ml-2"
                            >
                              {{ section.status }}
                            </VChip>
                          </div>
                        </VExpansionPanelTitle>
                        <VExpansionPanelText>
                          <div v-if="section.blockers && section.blockers.length" class="mb-3">
                            <div class="text-subtitle-2 mb-2">Blockers</div>
                            <VAlert
                              v-for="blocker in section.blockers"
                              :key="blocker.code"
                              type="error"
                              variant="tonal"
                              density="compact"
                              class="mb-2"
                            >
                              <div class="font-weight-bold">{{ blocker.title }}</div>
                              <div>{{ blocker.message }}</div>
                            </VAlert>
                          </div>
                          <div v-if="section.warnings && section.warnings.length">
                            <div class="text-subtitle-2 mb-2">Warnings</div>
                            <VAlert
                              v-for="warning in section.warnings"
                              :key="warning.code"
                              type="warning"
                              variant="tonal"
                              density="compact"
                              class="mb-2"
                            >
                              <div class="font-weight-bold">{{ warning.title }}</div>
                              <div>{{ warning.message }}</div>
                            </VAlert>
                          </div>
                          <div
                            v-if="!section.blockers?.length && !section.warnings?.length"
                            class="text-medium-emphasis"
                          >
                            No blockers or warnings for this section.
                          </div>
                        </VExpansionPanelText>
                      </VExpansionPanel>
                    </VExpansionPanels>
                  </VCardText>
                </VCard>

                <!-- Link to Technical Release -->
                <div v-if="mroEligibility.eligible && canRequestRelease" class="mt-4">
                  <VBtn color="success" size="large" block @click="openReleaseDialog">
                    Proceed to Technical Release
                  </VBtn>
                </div>
              </template>

              <VAlert v-else type="info" variant="tonal">
                MRO eligibility data not available.
              </VAlert>
            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>
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
.readiness-card,
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

.readiness-card {
  min-height: 180px;
  padding: 14px;
}

.audit-pack {
  margin: 0 auto;
  max-width: 820px;
  color: #111;
  background: #fff;
}

.audit-pack__header,
.audit-pack__section {
  border: 1px solid #999;
  padding: 14px;
}

.audit-pack__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.audit-pack__section {
  border-top: 0;
  page-break-inside: avoid;
}

.audit-pack pre {
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
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

@media print {
  body * {
    visibility: hidden;
  }

  .audit-pack,
  .audit-pack * {
    visibility: visible;
  }

  .audit-pack {
    position: absolute;
    inset: 0;
    max-width: none;
    padding: 0;
  }
}
</style>
