<script setup lang="ts">
import type {
  MaintenanceCommandCenterDto,
  MaintenanceDueInspectionTaskDto,
  MaintenanceDefectSummaryDto,
  MaintenancePriorityBucket,
  MaintenancePriorityWorkPackageDto,
  MaintenanceReleaseReadinessMixDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type { LocalUploadDto } from '#shared/contracts/uploads';
import type { MaintenanceErrorPresentation } from '../../composables/useMaintenanceUi';

const format = useLocaleFormat();
const route = useRoute();
const { can } = useAuthorization();
const ui = useMaintenanceUi();
const { resolveAircraftImageUrl } = useAircraftImageUrl();

const createDialog = ref(false);
const createTab = ref<'info' | 'personnel' | 'material' | 'notes'>('info');
const creating = ref(false);
const createError = ref<MaintenanceErrorPresentation | null>(null);
const prioritySearchInput = ref<{ focus?: () => void } | null>(null);
const attachmentFiles = ref<File[]>([]);
const uploadedAttachments = ref<LocalUploadDto[]>([]);
const uploadingAttachments = ref(false);
const search = ref(String(route.query.search ?? ''));
const priorityFilter = ref<MaintenancePriorityBucket | 'ALL'>(
  isPriorityBucket(String(route.query.priority ?? ''))
    ? (String(route.query.priority) as MaintenancePriorityBucket)
    : 'ALL'
);
const handledCreateQuery = ref('');

watch([search, priorityFilter], () => {
  void navigateTo(
    {
      path: route.path,
      query: {
        ...route.query,
        ...(search.value ? { search: search.value } : { search: undefined }),
        ...(priorityFilter.value !== 'ALL'
          ? { priority: priorityFilter.value }
          : { priority: undefined })
      }
    },
    { replace: true }
  );
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-command-center', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const {
  data: selectorData,
  pending: selectorsPending,
  error: selectorsError,
  refresh: refreshSelectors
} = await useAsyncData(
  'maintenance-selector-data',
  () => fetchApi<MaintenanceSelectorDataDto>('/api/maintenance/selector-data'),
  { server: false }
);

const canPlan = computed(() => can('maintenance.package.plan').allowed);
const canUploadDocument = computed(() => can('document.upload').allowed);
const canUploadSelectedAttachments = computed(
  () =>
    attachmentFiles.value.length > 0 &&
    !creating.value &&
    !uploadingAttachments.value &&
    canUploadDocument.value
);
const canReadMaintenanceDemand = computed(() => can('inventory.maintenance_demand.read').allowed);

const createForm = reactive({
  sourceType: 'TECHNICAL_DEFECT',
  aircraftId: '',
  defectId: '',
  title: '',
  priority: 'HIGH' as 'LOW' | 'NORMAL' | 'HIGH' | 'AOG',
  status: 'IN_PROGRESS',
  executionMode: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL_AMO_VENDOR',
  vendorId: '',
  owner: 'Maintenance Control',
  station: '',
  dueDate: '',
  dueTime: '16:00',
  startDate: '',
  startTime: '10:00',
  endDate: '',
  endTime: '16:00',
  nextAction: '',
  category: '',
  typeEstimate: 'Maintenance',
  location: '',
  planningNote: '',
  jobCardTitle: '',
  maintenanceDataRef: '',
  maintenanceDataRevision: 'REV-MROV1-2026-08',
  requiresIndependentInspection: true,
  evidenceNote: ''
});

const createTabs = [
  { title: 'Informasi', value: 'info', icon: 'mdi-information-outline' },
  { title: 'Personnel', value: 'personnel', icon: 'mdi-account-hard-hat-outline' },
  { title: 'Material', value: 'material', icon: 'mdi-cube-outline' },
  { title: 'Catatan', value: 'notes', icon: 'mdi-note-text-outline' }
] as const;

const aircraftOptions = computed(() => selectorData.value?.aircraft ?? []);
const stationOptions = computed(() => selectorData.value?.stations ?? []);
const selectedAircraft = computed(() =>
  aircraftOptions.value.find((aircraft) => aircraft.id === createForm.aircraftId)
);
const eligibleDefects = computed(() => selectorData.value?.eligibleDefects ?? []);
const defectsForAircraft = computed(() =>
  eligibleDefects.value.filter((defect) => defect.aircraftId === createForm.aircraftId)
);
const selectedDefect = computed(() =>
  eligibleDefects.value.find((defect) => defect.id === createForm.defectId)
);
const selectedVendor = computed(() =>
  (selectorData.value?.vendors ?? []).find((vendor) => vendor.id === createForm.vendorId)
);

const priorityFilterItems = computed(() => {
  const rows = data.value?.priorityWorkPackages ?? [];
  const count = (bucket: MaintenancePriorityBucket | 'ALL') =>
    bucket === 'ALL' ? rows.length : rows.filter((item) => item.bucket === bucket).length;
  return [
    { label: 'Semua', value: 'ALL' as const, color: 'primary', count: count('ALL') },
    { label: 'AOG', value: 'AOG' as const, color: 'error', count: count('AOG') },
    {
      label: 'Release Blocker',
      value: 'RELEASE_BLOCKER' as const,
      color: 'error',
      count: count('RELEASE_BLOCKER')
    },
    { label: 'Overdue', value: 'OVERDUE' as const, color: 'warning', count: count('OVERDUE') },
    {
      label: 'Due Today',
      value: 'DUE_TODAY' as const,
      color: 'warning',
      count: count('DUE_TODAY')
    },
    { label: 'Upcoming', value: 'UPCOMING' as const, color: 'primary', count: count('UPCOMING') }
  ];
});

const filteredPriorityWorkPackages = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value?.priorityWorkPackages ?? []).filter((item) => {
    const matchesQuery =
      !query ||
      [
        item.aircraftRegistrationNumber,
        item.aircraftType,
        item.aircraftModel,
        item.packageNumber,
        item.title,
        formatOperationalText(item.issue),
        formatOperationalText(item.nextAction),
        item.owner
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesPriority = priorityFilter.value === 'ALL' || item.bucket === priorityFilter.value;
    return matchesQuery && matchesPriority;
  });
});

const waitingMaterialPackageCount = computed(
  () => data.value?.releaseReadinessMix.find((item) => item.key === 'WAITING_MATERIAL')?.count ?? 0
);
const priorityMaterialPackageCount = computed(
  () =>
    data.value?.priorityWorkPackages.filter(
      (item) =>
        item.blockerCategories.includes('MATERIAL') &&
        ['AOG', 'RELEASE_BLOCKER', 'OVERDUE'].includes(item.bucket)
    ).length ?? 0
);
const otherMaterialBlockerCount = computed(() =>
  Math.max((data.value?.summary.partsBlockers ?? 0) - priorityMaterialPackageCount.value, 0)
);

const summaryCards = computed(() => [
  {
    label: 'Total Fleet',
    value: data.value?.summary.fleetTotal ?? '-',
    icon: 'mdi-airplane',
    color: 'primary',
    helper: `${data.value?.summary.serviceable ?? 0} Serviceable`,
    secondary: `${data.value?.summary.unserviceable ?? 0} Unserviceable`,
    secondaryColor: 'error'
  },
  {
    label: 'Work Package',
    value: data.value?.summary.activeWorkPackages ?? '-',
    icon: 'mdi-folder-outline',
    color: 'primary',
    helper: `${data.value?.summary.overdue ?? 0} Overdue`,
    helperColor: 'warning'
  },
  {
    label: 'Material Blocker',
    value: data.value?.summary.partsBlockers ?? '-',
    icon: 'mdi-cube-outline',
    color: 'purple',
    helper: `${waitingMaterialPackageCount.value} paket menunggu`,
    helperColor: 'warning'
  },
  {
    label: 'Inspection Overdue',
    value: data.value?.summary.overdue ?? '-',
    icon: 'mdi-calendar-alert',
    color: 'warning',
    helper: 'Due-control overdue',
    helperColor: 'error'
  },
  {
    label: 'Siap Rilis',
    value: data.value?.summary.readyForRelease ?? '-',
    icon: 'mdi-shield-check-outline',
    color: 'success',
    helper: 'Menunggu rilis teknis'
  },
  {
    label: 'On-time Performance',
    value:
      typeof data.value?.onTimePerformancePct === 'number'
        ? `${data.value.onTimePerformancePct.toFixed(1)}%`
        : '-',
    icon: 'mdi-target',
    color: 'primary',
    helper: 'Due-control adherence'
  }
]);

const topPriority = computed(() => data.value?.topPriorityItem ?? null);
const dueInspectionTasks = computed(() => data.value?.dueInspectionTasks ?? []);
const releaseReadinessReady = computed(
  () => data.value?.releaseReadinessMix.find((item) => item.key === 'READY_TO_RELEASE')?.count ?? 0
);
const releaseReadinessTotal = computed(() =>
  (data.value?.releaseReadinessMix ?? []).reduce((sum, item) => sum + item.count, 0)
);
const releaseReadinessSeries = computed(() => {
  if (!releaseReadinessTotal.value) return [1];
  return (data.value?.releaseReadinessMix ?? []).map((item) => item.count);
});
const releaseReadinessOptions = computed(() => ({
  chart: { sparkline: { enabled: true } },
  labels: releaseReadinessTotal.value
    ? (data.value?.releaseReadinessMix ?? []).map((item) => item.label)
    : ['Tidak ada antrian'],
  colors: releaseReadinessTotal.value ? ['#94A3B8', '#2563EB', '#F59E0B', '#22C55E'] : ['#CBD5E1'],
  dataLabels: { enabled: false },
  legend: { show: false },
  stroke: { width: 0 },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: { show: false }
      }
    }
  }
}));

const stale = computed(() => {
  if (!data.value?.generatedAt) return false;
  return Date.now() - new Date(data.value.generatedAt).getTime() > 10 * 60 * 1000;
});

const creationWarnings = computed(() => {
  const warnings: string[] = [];
  if (!selectedAircraft.value) warnings.push('Pilih pesawat.');
  if (!selectedDefect.value) warnings.push('Pilih temuan terbuka yang dapat dipaketkan.');
  if (selectedDefect.value && selectedDefect.value.assessmentDecision !== 'GROUND') {
    warnings.push('Temuan ini tidak ditandai grounding; pastikan konteks planning sudah benar.');
  }
  if (createForm.executionMode === 'EXTERNAL_AMO_VENDOR' && !selectedVendor.value) {
    warnings.push('Pekerjaan eksternal perlu provider maintenance.');
  }
  if (!createForm.maintenanceDataRef.trim() || !createForm.maintenanceDataRevision.trim()) {
    warnings.push('Kartu kerja wajib perlu referensi approved maintenance data dan revisi.');
  }
  if (!createForm.evidenceNote.trim()) {
    warnings.push('Isi bukti/catatan planning sebelum membuat paket pekerjaan.');
  }
  return warnings;
});

const canCreatePackage = computed(
  () =>
    canPlan.value &&
    Boolean(createForm.aircraftId) &&
    Boolean(createForm.defectId) &&
    createForm.title.trim().length >= 5 &&
    createForm.jobCardTitle.trim().length >= 5 &&
    createForm.maintenanceDataRef.trim().length >= 2 &&
    createForm.maintenanceDataRevision.trim().length >= 1 &&
    createForm.evidenceNote.trim().length >= 10 &&
    (createForm.executionMode === 'INTERNAL' || Boolean(createForm.vendorId))
);

watch(
  () => createForm.aircraftId,
  () => {
    if (selectedDefect.value?.aircraftId !== createForm.aircraftId) {
      createForm.defectId = '';
    }
    createForm.station = selectedAircraft.value?.currentStationCode ?? '';
  }
);

watch(
  () => createForm.defectId,
  () => {
    const defect = selectedDefect.value;
    if (!defect) return;
    createForm.aircraftId = defect.aircraftId;
    if (!createForm.title.trim()) createForm.title = `${defect.defectNumber} rectification`;
    if (!createForm.jobCardTitle.trim()) createForm.jobCardTitle = defect.title;
    if (!createForm.nextAction.trim()) {
      createForm.nextAction = `Tindaklanjuti ${defect.defectNumber}: ${defect.title}`;
    }
    if (!createForm.category.trim()) createForm.category = 'Defect Rectification';
    if (!createForm.dueDate) createForm.dueDate = defect.detectedAt.slice(0, 10);
    if (!createForm.startDate) createForm.startDate = defect.detectedAt.slice(0, 10);
    if (!createForm.endDate) createForm.endDate = defect.detectedAt.slice(0, 10);
    if (!createForm.station.trim()) {
      createForm.station = selectedAircraft.value?.currentStationCode ?? '';
    }
    if (!createForm.planningNote.trim()) {
      createForm.planningNote = `Temuan sumber ${defect.defectNumber}: ${defect.assessmentNote ?? defect.title}`;
    }
  }
);

watch(
  () => createForm.executionMode,
  (mode) => {
    if (mode === 'INTERNAL') createForm.vendorId = '';
  }
);

watch(
  () => [selectorData.value?.generatedAt, route.query.defect],
  () => {
    const defectReference = String(route.query.defect ?? '');
    if (!defectReference || handledCreateQuery.value === defectReference) return;
    const defect = eligibleDefects.value.find((item) => item.defectNumber === defectReference);
    if (!defect) return;
    openCreateDialog(defect.defectNumber);
    handledCreateQuery.value = defectReference;
  },
  { immediate: true }
);

function resetCreateForm() {
  createTab.value = 'info';
  createError.value = null;
  const today = new Date().toISOString().slice(0, 10);
  Object.assign(createForm, {
    sourceType: 'TECHNICAL_DEFECT',
    aircraftId: '',
    defectId: '',
    title: '',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    executionMode: 'INTERNAL',
    vendorId: '',
    owner: 'Maintenance Control',
    station: '',
    dueDate: today,
    dueTime: '16:00',
    startDate: today,
    startTime: '10:00',
    endDate: today,
    endTime: '16:00',
    nextAction: '',
    category: '',
    typeEstimate: 'Maintenance',
    location: '',
    planningNote: '',
    jobCardTitle: '',
    maintenanceDataRef: '',
    maintenanceDataRevision: 'REV-MROV1-2026-08',
    requiresIndependentInspection: true,
    evidenceNote: ''
  });
  attachmentFiles.value = [];
  uploadedAttachments.value = [];
  uploadingAttachments.value = false;
}

function seedCreateFormFromDefect(defectNumber: string) {
  const defect = eligibleDefects.value.find((item) => item.defectNumber === defectNumber);
  if (!defect) return;
  createForm.aircraftId = defect.aircraftId;
  createForm.defectId = defect.id;
  createForm.title = `${defect.defectNumber} rectification`;
  createForm.jobCardTitle = defect.title;
  createForm.planningNote = `Temuan sumber ${defect.defectNumber}: ${defect.assessmentNote ?? defect.title}`;
  createForm.nextAction = `Tindaklanjuti ${defect.defectNumber}: ${defect.title}`;
  createForm.category = 'Defect Rectification';
}

function openCreateDialog(defectNumber?: string) {
  resetCreateForm();
  if (defectNumber) {
    seedCreateFormFromDefect(defectNumber);
  }
  createDialog.value = true;
}

function sourceFlightText(defect: MaintenanceDefectSummaryDto | null | undefined) {
  if (!defect) return 'Select a defect first.';
  if (defect.derivedSourceFlightNumber) return defect.derivedSourceFlightNumber;
  return defect.sourceReference ?? 'No linked flight record in the current backend.';
}

function formatOperationalText(value: string | null | undefined) {
  if (!value) return '-';
  return value.replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (token) =>
    token
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')
  );
}

function isPriorityBucket(value: string): value is MaintenancePriorityBucket {
  return ['AOG', 'RELEASE_BLOCKER', 'OVERDUE', 'DUE_TODAY', 'UPCOMING', 'NORMAL'].includes(value);
}

function bucketLabel(bucket: MaintenancePriorityBucket) {
  const labels: Record<MaintenancePriorityBucket, string> = {
    AOG: 'AOG',
    RELEASE_BLOCKER: 'Release Blocker',
    OVERDUE: 'Overdue',
    DUE_TODAY: 'Due Today',
    UPCOMING: 'Upcoming',
    NORMAL: 'Normal'
  };
  return labels[bucket];
}

function bucketColor(bucket: MaintenancePriorityBucket) {
  const colors: Record<MaintenancePriorityBucket, string> = {
    AOG: 'error',
    RELEASE_BLOCKER: 'deep-orange',
    OVERDUE: 'warning',
    DUE_TODAY: 'warning',
    UPCOMING: 'primary',
    NORMAL: 'grey'
  };
  return colors[bucket];
}

function statusColor(status: MaintenancePriorityWorkPackageDto['status']) {
  const colors: Record<MaintenancePriorityWorkPackageDto['status'], string> = {
    OPEN: 'error',
    IN_PROGRESS: 'primary',
    READY_FOR_RELEASE: 'success',
    RELEASED: 'success',
    CANCELLED: 'grey'
  };
  return colors[status];
}

function stationItemTitle(item: MaintenanceSelectorDataDto['stations'][number]) {
  return `${item.stationCode} — ${item.stationName}`;
}

function dueStatusColor(status: MaintenanceDueInspectionTaskDto['status']) {
  if (status === 'OVERDUE') return 'error';
  if (status === 'DUE') return 'warning';
  if (status === 'DUE_SOON') return 'success';
  return 'primary';
}

function formatShortDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return format.dateTime(value);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '-';
  return format.date(value);
}

function formatDueDateLabel(task: MaintenanceDueInspectionTaskDto) {
  return task.dueAt ? formatShortDate(task.dueAt) : task.dueBasisLabel;
}

function auditTitle(action: string) {
  return ui.label(action);
}

function readinessColor(item: MaintenanceReleaseReadinessMixDto) {
  const colors: Record<MaintenanceReleaseReadinessMixDto['key'], string> = {
    WAITING_TECHNICAL: 'grey',
    WAITING_DOCUMENT: 'primary',
    WAITING_MATERIAL: 'warning',
    READY_TO_RELEASE: 'success'
  };
  return colors[item.key];
}

function focusPriorityFilter() {
  prioritySearchInput.value?.focus?.();
}

function exportPriorityCsv() {
  if (!import.meta.client) return;
  const headers = [
    'Priority',
    'Work Package',
    'Aircraft',
    'Issue',
    'Status',
    'Owner',
    'Due',
    'Next Action'
  ];
  const rows = filteredPriorityWorkPackages.value.map((item) => [
    bucketLabel(item.bucket),
    item.packageNumber,
    item.aircraftRegistrationNumber,
    formatOperationalText(item.issue),
    ui.label(item.status),
    item.owner,
    formatShortDateTime(item.dueAt),
    formatOperationalText(item.nextAction)
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mro-priority-work-packages.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

async function uploadAttachments() {
  if (!attachmentFiles.value.length) return true;
  if (!canUploadDocument.value) return false;
  uploadingAttachments.value = true;
  createError.value = null;
  try {
    const uploads: LocalUploadDto[] = [];
    for (const file of attachmentFiles.value) {
      const form = new FormData();
      form.append('file', file);
      uploads.push(
        await fetchApi<LocalUploadDto>('/api/uploads', {
          method: 'POST',
          body: form
        })
      );
    }
    uploadedAttachments.value = [...uploadedAttachments.value, ...uploads];
    attachmentFiles.value = [];
    return true;
  } catch (errorValue) {
    createError.value = ui.presentError(errorValue);
    return false;
  } finally {
    uploadingAttachments.value = false;
  }
}

function attachmentReferenceText() {
  if (!uploadedAttachments.value.length) return null;
  return [
    'Lampiran upload:',
    ...uploadedAttachments.value.map(
      (upload) =>
        `- ${upload.originalName} (${upload.id}) — view: ${upload.viewUrl}; download: ${upload.downloadUrl}`
    )
  ].join('\n');
}

async function createPackage() {
  if (!canCreatePackage.value) return;
  creating.value = true;
  createError.value = null;
  try {
    if (attachmentFiles.value.length) {
      const uploaded = await uploadAttachments();
      if (!uploaded) return;
    }
    const planningNote = [
      createForm.planningNote,
      `Owner: ${createForm.owner}`,
      `Status request: ${createForm.status}`,
      createForm.station ? `Station: ${createForm.station}` : null,
      createForm.category ? `Planning category: ${createForm.category}` : null,
      createForm.typeEstimate ? `Planning type estimate: ${createForm.typeEstimate}` : null,
      createForm.location ? `Location: ${createForm.location}` : null,
      createForm.dueDate ? `Due/SLA: ${createForm.dueDate} ${createForm.dueTime}` : null,
      createForm.startDate
        ? `Start estimate: ${createForm.startDate} ${createForm.startTime}`
        : null,
      createForm.endDate ? `End estimate: ${createForm.endDate} ${createForm.endTime}` : null,
      createForm.nextAction ? `Next action: ${createForm.nextAction}` : null,
      attachmentReferenceText(),
      `Bukti perencanaan: ${createForm.evidenceNote}`
    ]
      .filter(Boolean)
      .join('\n');
    const created = await fetchApi<MaintenanceWorkPackageDto>('/api/maintenance/work-packages', {
      method: 'POST',
      body: {
        aircraftId: createForm.aircraftId,
        primaryDefectId: createForm.defectId,
        sourceFlightId: selectedDefect.value?.derivedSourceFlightId ?? null,
        title: createForm.title,
        priority: createForm.priority,
        executionMode: createForm.executionMode,
        vendorId: createForm.executionMode === 'EXTERNAL_AMO_VENDOR' ? createForm.vendorId : null,
        planningNote,
        initialJobCard: {
          title: createForm.jobCardTitle,
          taskType: 'DEFECT_RECTIFICATION',
          maintenanceDataRef: createForm.maintenanceDataRef,
          maintenanceDataRevision: createForm.maintenanceDataRevision,
          mandatoryFlag: true,
          requiresIndependentInspection: createForm.requiresIndependentInspection
        }
      }
    });

    createDialog.value = false;
    await Promise.all([refresh(), refreshSelectors()]);
    await navigateTo(`/maintenance/work-packages/${created.id}`);
  } catch (errorValue) {
    createError.value = ui.presentError(errorValue);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <VContainer fluid class="maintenance-command-center">
    <div class="mro-header">
      <div>
        <p class="mro-header__eyebrow">Maintenance Control Center</p>
        <h1>Pusat Kendali MRO</h1>
      </div>
      <div class="mro-header__actions">
        <VChip color="primary" size="small" variant="tonal">Local Demo · Synthetic Data</VChip>
        <VDivider vertical class="d-none d-md-block" />
        <div class="mro-updated">
          <VIcon icon="mdi-sync" size="16" />
          <span>Diperbarui {{ data?.generatedAt ? format.dateTime(data.generatedAt) : '-' }}</span>
        </div>
        <VBtn
          icon="mdi-refresh"
          variant="text"
          :loading="pending"
          aria-label="Perbarui dashboard MRO"
          @click="refresh()"
        />
      </div>
    </div>

    <VAlert v-if="stale" type="warning" variant="tonal" class="mb-4">
      Data ringkasan lebih lama dari 10 menit. Muat ulang sebelum melakukan tindakan teknis.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Data maintenance dari backend belum dapat dimuat.
    </VAlert>

    <div class="mro-kpi-grid mb-4">
      <VCard
        v-for="card in summaryCards"
        :key="card.label"
        border
        elevation="0"
        class="mro-kpi-card"
      >
        <VCardText>
          <div class="mro-kpi-card__icon" :class="`mro-kpi-card__icon--${card.color}`">
            <VIcon :icon="card.icon" size="28" />
          </div>
          <div>
            <div class="mro-kpi-card__label">{{ card.label }}</div>
            <div class="mro-kpi-card__value">{{ card.value }}</div>
            <div class="mro-kpi-card__meta">
              <span :class="card.helperColor ? `text-${card.helperColor}` : undefined">
                {{ card.helper }}
              </span>
              <span
                v-if="card.secondary"
                :class="card.secondaryColor ? `text-${card.secondaryColor}` : undefined"
              >
                {{ card.secondary }}
              </span>
            </div>
          </div>
        </VCardText>
      </VCard>
    </div>

    <div class="mro-dashboard-grid">
      <main class="mro-main-stack">
        <VCard
          v-if="topPriority"
          border
          elevation="0"
          class="mro-priority-card"
          data-testid="internal-aog-spotlight"
        >
          <div class="mro-priority-card__bar">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-alert" size="18" />
              <span>Prioritas Tertinggi (AOG / Release Blocker)</span>
            </div>
            <VChip :color="bucketColor(topPriority.bucket)" size="small" variant="outlined">
              {{ bucketLabel(topPriority.bucket) }}
            </VChip>
          </div>
          <VCardText>
            <div class="mro-priority-card__body">
              <VAvatar class="mro-priority-card__photo" rounded="lg">
                <VImg
                  v-if="resolveAircraftImageUrl(topPriority.aircraftImageUrl)"
                  :alt="`${topPriority.aircraftRegistrationNumber} aircraft image`"
                  cover
                  :src="resolveAircraftImageUrl(topPriority.aircraftImageUrl) ?? undefined"
                />
                <VIcon v-else icon="mdi-airplane" size="42" />
              </VAvatar>
              <div class="mro-priority-card__identity">
                <h2>{{ topPriority.aircraftRegistrationNumber }}</h2>
                <p>{{ topPriority.aircraftModel ?? topPriority.aircraftType ?? '-' }}</p>
                <p>{{ topPriority.stationCode ?? 'Station belum ditetapkan' }}</p>
              </div>
              <div>
                <span class="mro-field-label">Ringkasan Issue</span>
                <p>{{ formatOperationalText(topPriority.issue) }}</p>
              </div>
              <div>
                <span class="mro-field-label">Work Package</span>
                <NuxtLink :to="`/maintenance/work-packages/${topPriority.id}`">
                  {{ topPriority.packageNumber }}
                </NuxtLink>
                <p class="text-medium-emphasis">{{ topPriority.owner }}</p>
              </div>
              <div>
                <span class="mro-field-label">Due / Estimasi</span>
                <p>{{ formatShortDateTime(topPriority.dueAt) }}</p>
                <p class="text-error">{{ topPriority.slaLabel }}</p>
              </div>
              <div>
                <span class="mro-field-label">Aksi Berikutnya</span>
                <p>{{ formatOperationalText(topPriority.nextAction) }}</p>
              </div>
            </div>
          </VCardText>
        </VCard>

        <VCard border elevation="0" class="mro-panel">
          <VCardTitle class="mro-panel__title">
            <div>
              <h2>Work Package by Priority</h2>
              <p>Urutan kerja dari AOG, blocker, overdue, due today, hingga upcoming.</p>
            </div>
            <div class="mro-panel__actions">
              <VTextField
                ref="prioritySearchInput"
                v-model="search"
                density="compact"
                hide-details
                clearable
                label="Cari work package"
                prepend-inner-icon="mdi-magnify"
              />
              <VBtn
                prepend-icon="mdi-filter-variant"
                variant="outlined"
                @click="focusPriorityFilter"
              >
                Filter
              </VBtn>
              <VBtn
                prepend-icon="mdi-tray-arrow-down"
                variant="outlined"
                @click="exportPriorityCsv"
              >
                Export
              </VBtn>
              <VBtn
                v-if="canPlan"
                color="primary"
                prepend-icon="mdi-plus"
                :disabled="selectorsPending || Boolean(selectorsError)"
                @click="openCreateDialog"
              >
                Buat Work Package
              </VBtn>
            </div>
          </VCardTitle>
          <VCardText>
            <div class="mro-chip-row">
              <VChip
                v-for="item in priorityFilterItems"
                :key="item.value"
                :color="priorityFilter === item.value ? item.color : undefined"
                :variant="priorityFilter === item.value ? 'flat' : 'outlined'"
                size="small"
                @click="priorityFilter = item.value"
              >
                {{ item.label }}
                <span class="ml-2">{{ item.count }}</span>
              </VChip>
            </div>

            <div class="maintenance-table-wrap">
              <VTable class="maintenance-table maintenance-table--priority">
                <thead>
                  <tr>
                    <th>Prioritas</th>
                    <th>Work Package</th>
                    <th>Aircraft / Station</th>
                    <th>Issue / Task</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Due / SLA</th>
                    <th>Next Action</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="9">Memuat work package...</td>
                  </tr>
                  <tr v-for="item in filteredPriorityWorkPackages" :key="item.id">
                    <td>
                      <VChip :color="bucketColor(item.bucket)" size="small" variant="tonal">
                        {{ bucketLabel(item.bucket) }}
                      </VChip>
                    </td>
                    <td>
                      <NuxtLink :to="`/maintenance/work-packages/${item.id}`">
                        {{ item.packageNumber }}
                      </NuxtLink>
                    </td>
                    <td>
                      <strong>{{ item.aircraftRegistrationNumber }}</strong>
                      <div class="text-caption text-medium-emphasis">
                        {{ item.stationCode ?? '-' }}
                      </div>
                    </td>
                    <td>{{ formatOperationalText(item.issue) }}</td>
                    <td>
                      <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                        {{ ui.label(item.status) }}
                      </VChip>
                    </td>
                    <td>{{ item.owner }}</td>
                    <td>
                      <div>{{ formatShortDateTime(item.dueAt) }}</div>
                      <div class="text-caption text-error">{{ item.slaLabel }}</div>
                    </td>
                    <td>{{ formatOperationalText(item.nextAction) }}</td>
                    <td>
                      <VBtn
                        :to="`/maintenance/work-packages/${item.id}`"
                        icon="mdi-dots-vertical"
                        size="small"
                        variant="text"
                        :aria-label="`Buka ${item.packageNumber}`"
                      />
                    </td>
                  </tr>
                  <tr v-if="!pending && data && !filteredPriorityWorkPackages.length">
                    <td colspan="9">Tidak ada work package sesuai filter.</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VBtn
              to="/maintenance/work-packages"
              class="mt-3"
              color="primary"
              append-icon="mdi-arrow-right"
              variant="text"
            >
              Lihat semua work package
            </VBtn>
          </VCardText>
        </VCard>

        <VCard border elevation="0" class="mro-panel">
          <VCardTitle class="mro-panel__title">
            <div>
              <h2>Due Inspection & Maintenance Task (7 Hari ke Depan)</h2>
              <p>Due control aktif yang membutuhkan planning atau monitoring.</p>
            </div>
            <div class="mro-panel__actions">
              <VSelect
                density="compact"
                hide-details
                label="Rentang"
                model-value="7"
                :items="[{ title: '7 Hari', value: '7' }]"
              />
              <VBtn to="/maintenance/due-control" prepend-icon="mdi-calendar" variant="outlined">
                Lihat Kalender
              </VBtn>
            </div>
          </VCardTitle>
          <VCardText>
            <div class="maintenance-table-wrap">
              <VTable class="maintenance-table maintenance-table--due">
                <thead>
                  <tr>
                    <th>Tanggal Due</th>
                    <th>Aircraft / Station</th>
                    <th>Tipe Task</th>
                    <th>Deskripsi</th>
                    <th>Jam / Siklus</th>
                    <th>SLA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="7">Memuat due task...</td>
                  </tr>
                  <tr v-for="task in dueInspectionTasks" :key="task.id">
                    <td>
                      {{ formatDueDateLabel(task) }}
                      <div class="text-caption text-medium-emphasis">{{ task.dueBasisLabel }}</div>
                    </td>
                    <td>
                      <strong>{{ task.aircraftRegistrationNumber }}</strong>
                      <div class="text-caption text-medium-emphasis">
                        {{ task.stationCode ?? task.taskCode }}
                      </div>
                    </td>
                    <td>{{ task.taskType }}</td>
                    <td>{{ task.taskTitle }}</td>
                    <td class="text-medium-emphasis">{{ task.usageLabel }}</td>
                    <td>
                      <VChip :color="dueStatusColor(task.status)" size="small" variant="tonal">
                        {{ task.remainingLabel }}
                      </VChip>
                    </td>
                    <td>
                      <VChip color="primary" size="small" variant="tonal">
                        {{ ui.label(task.planningStatus) }}
                      </VChip>
                    </td>
                  </tr>
                  <tr v-if="!pending && data && !dueInspectionTasks.length">
                    <td colspan="7">Tidak ada due task dalam 7 hari ke depan.</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VBtn
              to="/maintenance/due-control"
              class="mt-3"
              color="primary"
              append-icon="mdi-arrow-right"
              variant="text"
            >
              Lihat semua due task
            </VBtn>
          </VCardText>
        </VCard>
      </main>

      <aside class="mro-side-stack">
        <VCard border elevation="0" class="mro-side-card">
          <VCardTitle class="mro-side-card__title">
            <span>Release Readiness</span>
            <VBtn to="/maintenance/releases" size="small" variant="text">Lihat semua</VBtn>
          </VCardTitle>
          <VCardText>
            <div class="mro-donut">
              <ClientOnly>
                <FeatureApexChart
                  type="donut"
                  :height="150"
                  :options="releaseReadinessOptions"
                  :series="releaseReadinessSeries"
                />
              </ClientOnly>
              <div class="mro-donut__center">
                <strong>{{ releaseReadinessReady }}</strong>
                <span>Siap Rilis</span>
              </div>
            </div>
            <div class="mro-readiness-list">
              <div
                v-for="item in data?.releaseReadinessMix ?? []"
                :key="item.key"
                class="mro-readiness-list__item"
              >
                <span>
                  <VIcon :color="readinessColor(item)" icon="mdi-circle" size="8" />
                  {{ item.label }}
                </span>
                <strong>{{ item.count }}</strong>
              </div>
            </div>
          </VCardText>
        </VCard>

        <VCard border elevation="0" class="mro-side-card">
          <VCardTitle class="mro-side-card__title">
            <span>Work Card Menunggu</span>
            <VBtn to="/maintenance/my-work" size="small" variant="text">Lihat semua</VBtn>
          </VCardTitle>
          <VCardText>
            <div class="mro-side-metric">{{ data?.summary.jobCardsAwaitingExecution ?? 0 }}</div>
            <div class="mro-split-row">
              <span>Prioritas Tinggi</span>
              <strong>{{ data?.summary.reworkRequired ?? 0 }}</strong>
            </div>
            <div class="mro-split-row">
              <span>Menunggu &gt; 24 jam</span>
              <strong>{{ data?.summary.inspectionsAwaitingAction ?? 0 }}</strong>
            </div>
          </VCardText>
        </VCard>

        <VCard border elevation="0" class="mro-side-card">
          <VCardTitle class="mro-side-card__title">
            <span>Material Blocker</span>
            <VBtn
              v-if="canReadMaintenanceDemand"
              to="/inventory/maintenance-demand"
              size="small"
              variant="text"
            >
              Lihat semua
            </VBtn>
            <VChip v-else color="grey" size="x-small" variant="tonal"> Akses terbatas </VChip>
          </VCardTitle>
          <VCardText>
            <div class="mro-side-metric">{{ data?.summary.partsBlockers ?? 0 }}</div>
            <div class="mro-split-row">
              <span>Paket prioritas</span>
              <strong>{{ priorityMaterialPackageCount }}</strong>
            </div>
            <div class="mro-split-row">
              <span>Blocker lainnya</span>
              <strong>{{ otherMaterialBlockerCount }}</strong>
            </div>
          </VCardText>
        </VCard>

        <VCard border elevation="0" class="mro-side-card">
          <VCardTitle class="mro-side-card__title">
            <span>Aktivitas Terakhir</span>
            <VBtn to="/maintenance/records" size="small" variant="text">Lihat semua</VBtn>
          </VCardTitle>
          <VCardText>
            <VList class="mro-activity-list" density="compact">
              <VListItem
                v-for="record in data?.recentAuditRecords.slice(0, 5) ?? []"
                :key="record.id"
                :title="auditTitle(record.action)"
                :subtitle="`${record.actorRole} · ${format.dateTime(record.occurredAt)}`"
              >
                <template #prepend>
                  <VAvatar color="primary" size="28" variant="tonal">
                    <VIcon icon="mdi-history" size="16" />
                  </VAvatar>
                </template>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.recentAuditRecords.length ?? 0)"
              title="Belum ada aktivitas teknis"
            />
          </VCardText>
        </VCard>
      </aside>
    </div>

    <VDialog
      v-model="createDialog"
      aria-label="Assign Work Package"
      max-width="980"
      persistent
      scrollable
    >
      <VCard class="mro-assign-dialog">
        <VCardTitle class="mro-dialog-title">
          <div class="d-flex align-center ga-3">
            <VAvatar color="primary" rounded="lg" variant="tonal">
              <VIcon icon="mdi-clipboard-plus-outline" />
            </VAvatar>
            <h2>Assign Work Package</h2>
          </div>
          <VBtn
            icon="mdi-close"
            variant="text"
            :disabled="creating"
            aria-label="Tutup assign work package"
            @click="createDialog = false"
          />
        </VCardTitle>
        <VTabs v-model="createTab" color="primary" density="comfortable">
          <VTab v-for="tab in createTabs" :key="tab.value" :value="tab.value">
            <VIcon :icon="tab.icon" start />
            {{ tab.title }}
          </VTab>
        </VTabs>
        <VDivider />
        <VCardText>
          <VAlert v-if="createError" type="error" variant="tonal" class="mb-4">
            <strong>{{ createError.title }}</strong>
            <div>{{ createError.impact }}</div>
            <div class="text-caption">Langkah berikutnya: {{ createError.requiredAction }}</div>
            <div v-if="createError.referenceId" class="text-caption">
              Referensi: {{ createError.referenceId }}
            </div>
          </VAlert>

          <VWindow v-model="createTab">
            <VWindowItem value="info">
              <div class="mro-dialog-grid">
                <VTextField label="Work Package ID" model-value="Auto-generated" readonly />
                <VSelect
                  v-model="createForm.owner"
                  label="Owner / Responsible"
                  :items="['Maintenance Control', 'Certifying Staff', 'Inventory Controller']"
                />
                <VAutocomplete
                  v-model="createForm.aircraftId"
                  label="Aircraft"
                  :items="aircraftOptions"
                  item-value="id"
                  item-title="registrationNumber"
                  :loading="selectorsPending"
                  no-data-text="Tidak ada pesawat tersedia"
                />
                <VAutocomplete
                  v-model="createForm.station"
                  label="Station"
                  :items="stationOptions"
                  item-value="stationCode"
                  :item-title="stationItemTitle"
                  :loading="selectorsPending"
                  clearable
                  no-data-text="Tidak ada station tersedia"
                />
                <VAutocomplete
                  v-model="createForm.defectId"
                  label="Issue / Task"
                  :items="defectsForAircraft"
                  item-value="id"
                  item-title="defectNumber"
                  :disabled="!createForm.aircraftId"
                  no-data-text="Tidak ada temuan terbuka untuk pesawat ini"
                />
                <div class="mro-inline-fields">
                  <VTextField v-model="createForm.dueDate" label="SLA / Due Date" type="date" />
                  <VTextField v-model="createForm.dueTime" label="Time" type="time" />
                </div>
                <VTextarea v-model="createForm.title" label="Work package title" rows="2" />
                <VTextarea v-model="createForm.nextAction" label="Next Action" rows="2" />
                <VSelect
                  v-model="createForm.priority"
                  label="Priority"
                  :items="['AOG', 'HIGH', 'NORMAL', 'LOW']"
                />
                <VSelect
                  v-model="createForm.status"
                  label="Status awal (catatan planning)"
                  :items="['OPEN', 'IN_PROGRESS']"
                />
                <VSelect
                  v-model="createForm.category"
                  label="Work Package Category"
                  :items="[
                    'AOG - Aircraft on Ground',
                    'Release Blocker',
                    'Scheduled Maintenance',
                    'Defect Rectification'
                  ]"
                />
                <VSelect
                  v-model="createForm.typeEstimate"
                  label="Type Estimate"
                  :items="['Maintenance', 'Inspection', 'Material', 'Line Maintenance']"
                />
                <div class="mro-inline-fields">
                  <VTextField v-model="createForm.startDate" label="Start Estimate" type="date" />
                  <VTextField v-model="createForm.startTime" label="Time" type="time" />
                </div>
                <div class="mro-inline-fields">
                  <VTextField v-model="createForm.endDate" label="End Estimate" type="date" />
                  <VTextField v-model="createForm.endTime" label="Time" type="time" />
                </div>
                <VTextField v-model="createForm.location" label="Location" />
                <div class="mro-attachment-uploader">
                  <VIcon icon="mdi-cloud-upload-outline" size="28" />
                  <span>Attachment (opsional)</span>
                  <small>
                    Unggah file ke storage dokumen. Referensi upload akan dicatat otomatis di
                    planning note paket kerja.
                  </small>
                  <VFileInput
                    v-model="attachmentFiles"
                    class="w-100"
                    density="compact"
                    label="Pilih lampiran"
                    prepend-icon=""
                    prepend-inner-icon="mdi-paperclip"
                    show-size
                    multiple
                    :disabled="creating || uploadingAttachments || !canUploadDocument"
                    hide-details
                  />
                  <VBtn
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-cloud-upload-outline"
                    :loading="uploadingAttachments"
                    :disabled="!canUploadSelectedAttachments"
                    @click="uploadAttachments"
                  >
                    Upload lampiran
                  </VBtn>
                  <small v-if="!canUploadDocument" class="text-error">
                    Role ini tidak memiliki izin document.upload.
                  </small>
                  <div v-if="uploadedAttachments.length" class="mro-attachment-list">
                    <VChip
                      v-for="upload in uploadedAttachments"
                      :key="upload.id"
                      color="success"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-check-circle-outline"
                    >
                      {{ upload.originalName }}
                    </VChip>
                  </div>
                </div>
              </div>
            </VWindowItem>

            <VWindowItem value="personnel">
              <div class="mro-dialog-grid">
                <VSelect
                  v-model="createForm.executionMode"
                  label="Mode pelaksanaan"
                  :items="[
                    { title: 'Maintenance internal', value: 'INTERNAL' },
                    { title: 'Provider eksternal / AMO', value: 'EXTERNAL_AMO_VENDOR' }
                  ]"
                  item-title="title"
                  item-value="value"
                />
                <VAutocomplete
                  v-if="createForm.executionMode === 'EXTERNAL_AMO_VENDOR'"
                  v-model="createForm.vendorId"
                  label="Provider maintenance"
                  :items="selectorData?.vendors ?? []"
                  item-value="id"
                  item-title="vendorName"
                  no-data-text="Tidak ada provider aktif"
                />
                <VSwitch
                  v-model="createForm.requiresIndependentInspection"
                  color="primary"
                  label="Wajib pemeriksaan independen"
                />
                <VAlert
                  v-if="createForm.executionMode === 'EXTERNAL_AMO_VENDOR' && !selectedVendor"
                  type="warning"
                  variant="tonal"
                  density="compact"
                >
                  Pilih provider maintenance aktif untuk pelaksanaan eksternal.
                </VAlert>
              </div>
            </VWindowItem>

            <VWindowItem value="material">
              <div class="mro-dialog-grid">
                <VTextField
                  v-model="createForm.maintenanceDataRef"
                  label="Approved maintenance data reference"
                />
                <VTextField
                  v-model="createForm.maintenanceDataRevision"
                  label="Approved data revision snapshot"
                />
                <VTextField v-model="createForm.jobCardTitle" label="Judul kartu kerja" />
                <VAlert type="info" variant="tonal">
                  Requirement material dan tooling detail tetap dikelola dari work package setelah
                  paket dibuat.
                </VAlert>
              </div>
            </VWindowItem>

            <VWindowItem value="notes">
              <div class="mro-dialog-grid">
                <VTextarea v-model="createForm.planningNote" label="Catatan rencana" rows="4" />
                <VTextarea
                  v-model="createForm.evidenceNote"
                  label="Bukti atau alasan perencanaan"
                  rows="3"
                  hint="Disimpan sebagai catatan paket dan riwayat aktivitas maintenance."
                  persistent-hint
                />
                <VTextField
                  :model-value="sourceFlightText(selectedDefect)"
                  label="Referensi flight / technical log dari sistem"
                  readonly
                />
                <VAlert v-if="creationWarnings.length" type="warning" variant="tonal">
                  <div class="font-weight-bold mb-2">Penghambat dan peringatan review</div>
                  <ul class="mb-0">
                    <li v-for="warning in creationWarnings" :key="warning">{{ warning }}</li>
                  </ul>
                </VAlert>
              </div>
            </VWindowItem>
          </VWindow>
        </VCardText>
        <VDivider />
        <VCardActions class="mro-dialog-actions">
          <VSpacer />
          <VBtn variant="outlined" :disabled="creating" @click="createDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            :loading="creating"
            :disabled="!canCreatePackage"
            @click="createPackage"
          >
            Simpan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.maintenance-command-center {
  --mro-border: rgba(var(--v-border-color), var(--v-border-opacity));
  --mro-navy: #0b2f68;
  --mro-blue: #1d64d8;
  --mro-red: #dc2626;
  --mro-muted: rgba(var(--v-theme-on-surface), 0.62);
  background:
    linear-gradient(180deg, rgba(29, 100, 216, 0.04), transparent 360px),
    rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-surface));
}

.mro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.mro-header h1 {
  color: var(--mro-navy);
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.15;
}

.mro-header__eyebrow {
  margin: 0 0 4px;
  color: var(--mro-muted);
  font-size: 0.86rem;
  font-weight: 600;
}

.mro-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.mro-updated {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--mro-muted);
  font-size: 0.78rem;
  line-height: 1.25;
}

.mro-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(156px, 1fr));
  gap: 14px;
}

.mro-kpi-card,
.mro-priority-card,
.mro-panel,
.mro-side-card,
.mro-assign-dialog {
  border-radius: 8px;
}

.mro-kpi-card :deep(.v-card-text) {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  min-height: 104px;
  padding: 14px;
}

.mro-kpi-card__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 8px;
  color: white;
}

.mro-kpi-card__icon--primary {
  background: linear-gradient(135deg, #1d64d8, #0b4aa3);
}

.mro-kpi-card__icon--purple {
  background: linear-gradient(135deg, #9333ea, #6d28d9);
}

.mro-kpi-card__icon--warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.mro-kpi-card__icon--success {
  background: linear-gradient(135deg, #16a34a, #059669);
}

.mro-kpi-card__label {
  color: var(--mro-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.mro-kpi-card__value {
  color: var(--mro-navy);
  font-size: 1.8rem;
  font-weight: 850;
  line-height: 1.15;
}

.mro-kpi-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  color: var(--mro-muted);
  font-size: 0.75rem;
}

.mro-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
}

.mro-main-stack,
.mro-side-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mro-priority-card {
  overflow: hidden;
  border-color: rgba(220, 38, 38, 0.45) !important;
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.92), rgb(var(--v-theme-surface)) 58%);
}

.mro-priority-card__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(220, 38, 38, 0.18);
  color: var(--mro-red);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
}

.mro-priority-card__body {
  display: grid;
  grid-template-columns: 112px 180px repeat(4, minmax(130px, 1fr));
  gap: 14px;
  align-items: center;
}

.mro-priority-card__photo {
  width: 112px !important;
  height: 78px !important;
}

.mro-priority-card__identity h2 {
  color: var(--mro-navy);
  font-size: 1.55rem;
  font-weight: 850;
  line-height: 1.1;
}

.mro-priority-card__identity p,
.mro-priority-card__body p {
  margin: 3px 0 0;
  font-size: 0.82rem;
}

.mro-field-label {
  display: block;
  margin-bottom: 4px;
  color: var(--mro-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.mro-panel__title,
.mro-side-card__title,
.mro-dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.mro-panel__title h2,
.mro-dialog-title h2 {
  color: var(--mro-navy);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}

.mro-panel__title p {
  margin: 4px 0 0;
  color: var(--mro-muted);
  font-size: 0.78rem;
}

.mro-panel__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.mro-panel__actions :deep(.v-field) {
  min-width: 180px;
}

.mro-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.mro-side-card__title {
  color: var(--mro-navy);
  font-size: 0.94rem;
  font-weight: 800;
}

.mro-side-metric {
  color: var(--mro-blue);
  font-size: 2rem;
  font-weight: 850;
  line-height: 1;
}

.mro-split-row,
.mro-readiness-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: var(--mro-muted);
  font-size: 0.82rem;
}

.mro-readiness-list__item span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mro-readiness-list__item strong,
.mro-split-row strong {
  color: rgb(var(--v-theme-on-surface));
}

.mro-donut {
  position: relative;
  display: grid;
  min-height: 158px;
  place-items: center;
}

.mro-donut__center {
  position: absolute;
  display: grid;
  inset: 0;
  place-content: center;
  text-align: center;
  pointer-events: none;
}

.mro-donut__center strong {
  color: var(--mro-navy);
  font-size: 1.45rem;
  font-weight: 850;
  line-height: 1;
}

.mro-donut__center span {
  margin-top: 4px;
  color: var(--mro-muted);
  font-size: 0.75rem;
}

.mro-activity-list :deep(.v-list-item) {
  padding-inline: 0;
}

.maintenance-table-wrap {
  overflow-x: auto;
}

.maintenance-table :deep(table) {
  min-width: 980px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
  font-size: 0.8rem;
}

.maintenance-table :deep(th) {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
}

.maintenance-table--priority :deep(table) {
  min-width: 1040px;
}

.maintenance-table--due :deep(table) {
  min-width: 920px;
}

.mro-dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.mro-inline-fields {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 10px;
}

.mro-attachment-uploader {
  display: grid;
  min-height: 94px;
  gap: 10px;
  place-items: center;
  padding: 12px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.24);
  border-radius: 6px;
  color: var(--mro-navy);
  text-align: center;
}

.mro-attachment-uploader small {
  color: var(--mro-muted);
}

.mro-attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.mro-dialog-actions {
  padding: 14px 20px;
}

.mro-action-btn {
  min-width: max-content;
  font-weight: 700;
}

@media (max-width: 1399px) {
  .mro-kpi-grid {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }

  .mro-dashboard-grid {
    grid-template-columns: 1fr;
  }

  .mro-side-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mro-priority-card__body {
    grid-template-columns: 112px minmax(180px, 1fr) repeat(2, minmax(160px, 1fr));
  }
}

@media (max-width: 899px) {
  .mro-header,
  .mro-panel__title,
  .mro-dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .mro-header__actions,
  .mro-panel__actions {
    justify-content: flex-start;
    width: 100%;
    flex-wrap: wrap;
  }

  .mro-kpi-grid,
  .mro-side-stack {
    grid-template-columns: 1fr;
  }

  .mro-priority-card__body,
  .mro-dialog-grid {
    grid-template-columns: 1fr;
  }

  .mro-priority-card__photo {
    width: 100% !important;
    height: 140px !important;
  }
}

@media (max-width: 599px) {
  .maintenance-command-center {
    padding-inline: 10px;
  }

  .mro-kpi-card :deep(.v-card-text) {
    min-height: auto;
  }

  .mro-inline-fields {
    grid-template-columns: 1fr;
  }
}
</style>
