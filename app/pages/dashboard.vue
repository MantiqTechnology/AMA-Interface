<script setup lang="ts">
import type {
  AviationDashboardOperationType,
  AviationManagementDashboardDto,
  AviationOperationsDashboardDto
} from '#shared/contracts/aviation-dashboard';

type DashboardTab = 'operations' | 'management';
type SectionKey =
  | 'attention'
  | 'dailyMetrics'
  | 'readiness'
  | 'fleet'
  | 'flightBoard'
  | 'stations'
  | 'blockers'
  | 'managementMetrics'
  | 'managementCharts'
  | 'managementTables'
  | 'safetyInsights';

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const canViewManagement = computed(() => can('finance.accounting.read').allowed);

function todayInPapua() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jayapura',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function routeString(key: string, fallback: string) {
  return typeof route.query[key] === 'string' ? String(route.query[key]) : fallback;
}

const today = todayInPapua();
const requestedTab = routeString('tab', 'operations');
const activeTab = ref<DashboardTab>(
  requestedTab === 'management' && canViewManagement.value ? 'management' : 'operations'
);
const controlPanelOpen = ref(false);

const operationsFilters = reactive({
  operationDate: routeString('operationDate', ''),
  stationId: routeString('stationId', 'ALL'),
  operationType: routeString('operationType', 'ALL') as AviationDashboardOperationType,
  selectedFlightId: routeString('selectedFlightId', '')
});
const managementDraft = reactive({
  dateFrom: routeString('dateFrom', shiftDate(today, -6)),
  dateTo: routeString('dateTo', today),
  stationId: routeString('stationId', 'ALL'),
  operationType: routeString('operationType', 'ALL') as AviationDashboardOperationType,
  comparison: routeString('comparison', 'PREVIOUS_PERIOD') as 'PREVIOUS_PERIOD' | 'NONE'
});
const managementFilters = reactive({ ...managementDraft });

const sections = reactive<Record<SectionKey, boolean>>({
  attention: true,
  dailyMetrics: true,
  readiness: true,
  fleet: true,
  flightBoard: true,
  stations: true,
  blockers: true,
  managementMetrics: true,
  managementCharts: true,
  managementTables: true,
  safetyInsights: true
});

const sectionControls: Array<{ key: SectionKey; label: string; tab: DashboardTab }> = [
  { key: 'attention', label: 'Attention, actions & freshness', tab: 'operations' },
  { key: 'dailyMetrics', label: "Today's operations", tab: 'operations' },
  { key: 'readiness', label: 'Flight readiness', tab: 'operations' },
  { key: 'fleet', label: 'Fleet & maintenance', tab: 'operations' },
  { key: 'flightBoard', label: 'Live flight operations', tab: 'operations' },
  { key: 'stations', label: 'Station conditions', tab: 'operations' },
  { key: 'blockers', label: 'Current blockers', tab: 'operations' },
  { key: 'managementMetrics', label: 'Performance metrics', tab: 'management' },
  { key: 'managementCharts', label: 'Performance trends', tab: 'management' },
  { key: 'managementTables', label: 'Performance tables', tab: 'management' },
  { key: 'safetyInsights', label: 'Safety & insights', tab: 'management' }
];

const operationOptions = [
  { title: 'All Operations', value: 'ALL' },
  { title: 'Scheduled', value: 'SCHEDULED' },
  { title: 'Charter', value: 'CHARTER' },
  { title: 'Cargo', value: 'CARGO' },
  { title: 'Medevac', value: 'MEDEVAC' }
];
const comparisonOptions = [
  { title: 'Previous period', value: 'PREVIOUS_PERIOD' },
  { title: 'No comparison', value: 'NONE' }
];

const operationsQuery = computed(() => ({
  ...(operationsFilters.operationDate ? { operationDate: operationsFilters.operationDate } : {}),
  ...(operationsFilters.stationId !== 'ALL' ? { stationId: operationsFilters.stationId } : {}),
  operationType: operationsFilters.operationType,
  ...(operationsFilters.selectedFlightId
    ? { selectedFlightId: operationsFilters.selectedFlightId }
    : {})
}));
const managementQuery = computed(() => ({
  dateFrom: managementFilters.dateFrom,
  dateTo: managementFilters.dateTo,
  ...(managementFilters.stationId !== 'ALL' ? { stationId: managementFilters.stationId } : {}),
  operationType: managementFilters.operationType,
  comparison: managementFilters.comparison
}));

const {
  data: operationsData,
  pending: operationsPending,
  error: operationsError,
  refresh: refreshOperations
} = await useAsyncData(
  'unified-aviation-dashboard-operations',
  () =>
    fetchApi<AviationOperationsDashboardDto>('/api/dashboard/operations', {
      query: operationsQuery.value
    }),
  { watch: [operationsQuery] }
);

const {
  data: managementData,
  pending: managementPending,
  error: managementError,
  refresh: refreshManagement
} = await useAsyncData<AviationManagementDashboardDto | null>(
  'unified-aviation-dashboard-management',
  () =>
    canViewManagement.value
      ? fetchApi<AviationManagementDashboardDto>('/api/dashboard/management', {
          query: managementQuery.value
        })
      : Promise.resolve(null),
  { watch: [managementQuery, canViewManagement] }
);

const activeData = computed(() =>
  activeTab.value === 'management' ? managementData.value : operationsData.value
);
const stationOptions = computed(() => [
  { title: 'All Stations', value: 'ALL' },
  ...(activeData.value?.stationOptions ?? []).map((station) => ({
    title: `${station.code} · ${station.name}`,
    value: station.id
  }))
]);
const activePending = computed(() =>
  activeTab.value === 'management' ? managementPending.value : operationsPending.value
);
const visibleControls = computed(() =>
  sectionControls.filter((control) => control.tab === activeTab.value)
);

watch(activeTab, (tab) => {
  if (tab === 'management' && !canViewManagement.value) {
    activeTab.value = 'operations';
    return;
  }
  void syncUrl();
});
watch(
  operationsData,
  (value) => {
    if (!operationsFilters.operationDate && value?.meta.dateFrom) {
      operationsFilters.operationDate = value.meta.dateFrom;
    }
  },
  { immediate: true }
);
watch(operationsQuery, () => {
  if (activeTab.value === 'operations') void syncUrl();
});
watch(
  sections,
  (value) => {
    if (import.meta.client) localStorage.setItem('ama-dashboard-sections', JSON.stringify(value));
  },
  { deep: true }
);

onMounted(() => {
  const saved = localStorage.getItem('ama-dashboard-sections');
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved) as Partial<Record<SectionKey, boolean>>;
    for (const key of Object.keys(sections) as SectionKey[]) {
      if (typeof parsed[key] === 'boolean') sections[key] = parsed[key]!;
    }
  } catch {
    localStorage.removeItem('ama-dashboard-sections');
  }
});

function syncUrl() {
  const query =
    activeTab.value === 'operations'
      ? {
          tab: 'operations',
          ...(operationsFilters.operationDate
            ? { operationDate: operationsFilters.operationDate }
            : {}),
          ...(operationsFilters.stationId !== 'ALL'
            ? { stationId: operationsFilters.stationId }
            : {}),
          ...(operationsFilters.operationType !== 'ALL'
            ? { operationType: operationsFilters.operationType }
            : {}),
          ...(operationsFilters.selectedFlightId
            ? { selectedFlightId: operationsFilters.selectedFlightId }
            : {})
        }
      : {
          tab: 'management',
          dateFrom: managementFilters.dateFrom,
          dateTo: managementFilters.dateTo,
          ...(managementFilters.stationId !== 'ALL'
            ? { stationId: managementFilters.stationId }
            : {}),
          ...(managementFilters.operationType !== 'ALL'
            ? { operationType: managementFilters.operationType }
            : {}),
          ...(managementFilters.comparison !== 'PREVIOUS_PERIOD'
            ? { comparison: managementFilters.comparison }
            : {})
        };
  return router.replace({ path: '/dashboard', query });
}

function applyManagementFilters() {
  Object.assign(managementFilters, managementDraft);
  void syncUrl();
}

function selectFlight(flightId: string) {
  operationsFilters.selectedFlightId = flightId;
}

function refreshActive() {
  return activeTab.value === 'management' ? refreshManagement() : refreshOperations();
}

function resetSections() {
  for (const control of visibleControls.value) sections[control.key] = true;
}

function formatScopeDate() {
  const from =
    activeTab.value === 'management'
      ? managementFilters.dateFrom
      : operationsFilters.operationDate || operationsData.value?.meta.dateFrom || today;
  const to =
    activeTab.value === 'management'
      ? managementFilters.dateTo
      : operationsFilters.operationDate || operationsData.value?.meta.dateTo || today;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
  const start = formatter.format(new Date(`${from}T00:00:00Z`));
  const end = formatter.format(new Date(`${to}T00:00:00Z`));
  return from === to ? start : `${start} – ${end}`;
}
</script>

<template>
  <VContainer class="dashboard-page px-3 py-3 md:px-4" fluid>
    <header class="page-header">
      <div>
        <h1>PT AMA Aviation Dashboard</h1>
        <div class="page-subtitle">
          <span>{{ formatScopeDate() }}</span><VChip color="secondary" size="small" variant="tonal">
            Demo Mode · Canonical Operations Data
          </VChip>
        </div>
      </div>
      <div class="page-actions">
        <VBtn
          :aria-label="activePending ? 'Refreshing dashboard' : 'Refresh dashboard'"
          icon="mdi-refresh"
          :loading="activePending"
          size="small"
          variant="text"
          @click="refreshActive"
        />
        <VBtn
          color="primary"
          prepend-icon="mdi-tune-vertical"
          size="small"
          variant="tonal"
          @click="controlPanelOpen = true"
        >
          View controls
        </VBtn>
      </div>
    </header>

    <VCard border class="filter-card">
      <div v-if="activeTab === 'operations'" class="filter-grid filter-grid--operations">
        <VTextField
          v-model="operationsFilters.operationDate"
          density="comfortable"
          hide-details
          label="Operation date"
          prepend-inner-icon="mdi-calendar"
          type="date"
          variant="outlined"
        />
        <VSelect
          v-model="operationsFilters.stationId"
          density="comfortable"
          hide-details
          item-title="title"
          item-value="value"
          :items="stationOptions"
          label="Station"
          variant="outlined"
        />
        <VSelect
          v-model="operationsFilters.operationType"
          density="comfortable"
          hide-details
          item-title="title"
          item-value="value"
          :items="operationOptions"
          label="Operation type"
          variant="outlined"
        />
      </div>
      <div v-else class="filter-grid filter-grid--management">
        <div class="date-range-fields">
          <VTextField
            v-model="managementDraft.dateFrom"
            density="comfortable"
            hide-details
            label="Date from"
            prepend-inner-icon="mdi-calendar"
            type="date"
            variant="outlined"
          /><VTextField
            v-model="managementDraft.dateTo"
            density="comfortable"
            hide-details
            label="Date to"
            type="date"
            variant="outlined"
          />
        </div>
        <VSelect
          v-model="managementDraft.stationId"
          density="comfortable"
          hide-details
          item-title="title"
          item-value="value"
          :items="stationOptions"
          label="Station"
          variant="outlined"
        />
        <VSelect
          v-model="managementDraft.operationType"
          density="comfortable"
          hide-details
          item-title="title"
          item-value="value"
          :items="operationOptions"
          label="Operation type"
          variant="outlined"
        />
        <VSelect
          v-model="managementDraft.comparison"
          density="comfortable"
          hide-details
          item-title="title"
          item-value="value"
          :items="comparisonOptions"
          label="Compared to"
          variant="outlined"
        />
        <VBtn color="primary" height="48" @click="applyManagementFilters">Apply</VBtn>
      </div>
    </VCard>

    <VAlert
      border="start"
      class="capability-preview-banner"
      color="info"
      density="compact"
      icon="mdi-radar"
      variant="tonal"
    >
      Operational resilience and compliance concepts remain available in Capability Preview.
      <template #append>
        <VBtn color="info" size="x-small" to="/capability-preview" variant="flat">
          Open preview
        </VBtn>
      </template>
    </VAlert>

    <VTabs v-model="activeTab" class="dashboard-tabs" color="primary" density="comfortable">
      <VTab value="operations">Operations Control</VTab>
      <VTab v-if="canViewManagement" value="management">Management Performance</VTab>
    </VTabs>

    <VWindow v-model="activeTab" :touch="false">
      <VWindowItem value="operations">
        <div
          v-if="operationsPending && !operationsData"
          class="dashboard-skeleton"
          aria-label="Loading operations dashboard"
        >
          <VSkeletonLoader v-for="index in 6" :key="index" type="card" />
        </div>
        <VAlert
          v-else-if="operationsError"
          class="my-4"
          color="danger"
          title="Operations dashboard could not be loaded"
          variant="tonal"
        >
          <template #append>
            <VBtn color="danger" size="small" variant="flat" @click="refreshOperations">
              Retry
            </VBtn>
          </template>
        </VAlert>
        <DashboardOperationsControlTab
          v-else-if="operationsData"
          :data="operationsData"
          :sections="sections"
          @select-flight="selectFlight"
        />
      </VWindowItem>
      <VWindowItem v-if="canViewManagement" value="management">
        <div
          v-if="managementPending && !managementData"
          class="dashboard-skeleton"
          aria-label="Loading management dashboard"
        >
          <VSkeletonLoader v-for="index in 6" :key="index" type="card" />
        </div>
        <VAlert
          v-else-if="managementError"
          class="my-4"
          color="danger"
          title="Management dashboard could not be loaded"
          variant="tonal"
        >
          <template #append>
            <VBtn color="danger" size="small" variant="flat" @click="refreshManagement">
              Retry
            </VBtn>
          </template>
        </VAlert>
        <DashboardManagementPerformanceTab
          v-else-if="managementData"
          :data="managementData"
          :sections="sections"
        />
      </VWindowItem>
    </VWindow>

    <VNavigationDrawer
      v-model="controlPanelOpen"
      border
      class="dashboard-control-drawer"
      location="right"
      temporary
      width="360"
    >
      <div class="drawer-header">
        <div>
          <strong>Dashboard Controls</strong>
          <p>
            Show or hide sections in
            {{ activeTab === 'operations' ? 'Operations Control' : 'Management Performance' }}
          </p>
        </div>
        <VBtn
          aria-label="Close dashboard controls"
          icon="mdi-close"
          size="small"
          variant="text"
          @click="controlPanelOpen = false"
        />
      </div>
      <VDivider />
      <div class="drawer-content">
        <div v-for="control in visibleControls" :key="control.key" class="control-row">
          <span>{{ control.label }}</span><VSwitch
            v-model="sections[control.key]"
            :aria-label="`Show ${control.label}`"
            color="primary"
            density="compact"
            hide-details
          />
        </div>
        <VBtn
          block
          class="mt-4"
          color="primary"
          prepend-icon="mdi-restore"
          variant="tonal"
          @click="resetSections"
        >
          Reset view
        </VBtn>
      </div>
    </VNavigationDrawer>
  </VContainer>
</template>

<style scoped>
.dashboard-page {
  --dashboard-body-size: 0.875rem;
  --dashboard-caption-size: 0.75rem;
  --dashboard-heading-size: 1.0625rem;
  --dashboard-gap: 16px;
  max-width: 1920px;
  min-width: 0;
  margin-inline: auto;
  color: rgb(var(--v-theme-text-primary));
  font-size: var(--dashboard-body-size);
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.page-header h1 {
  color: rgb(var(--v-theme-primary));
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.015em;
}
.page-subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 7px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: var(--dashboard-body-size);
}
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-card {
  margin-bottom: 10px;
  border-color: rgb(var(--v-theme-border-default));
}
.filter-grid {
  display: grid;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.filter-grid--operations {
  grid-template-columns: repeat(3, 1fr);
}
.filter-grid--management {
  grid-template-columns: 1.35fr 1fr 1fr 0.85fr 96px;
}
.date-range-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.filter-grid :deep(.v-field__input),
.filter-grid :deep(.v-label) {
  font-size: var(--dashboard-body-size);
}
.capability-preview-banner {
  margin: 10px 0;
  font-size: var(--dashboard-caption-size);
  line-height: 1.45;
}
.dashboard-tabs {
  min-height: 46px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.dashboard-tabs :deep(.v-tab) {
  min-width: auto;
  min-height: 46px;
  padding-inline: 20px;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}
.dashboard-skeleton {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--dashboard-gap);
}
.dashboard-control-drawer {
  top: 64px !important;
  height: calc(100dvh - 64px) !important;
}
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
}
.drawer-header strong {
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
}
.drawer-header p {
  margin-top: 5px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: var(--dashboard-caption-size);
  line-height: 1.4;
}
.drawer-content {
  padding: 14px 20px;
}
.control-row {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  font-size: var(--dashboard-body-size);
}
@media (max-width: 1199px) {
  .filter-grid--management {
    grid-template-columns: repeat(2, 1fr);
  }
  .filter-grid--management .v-btn {
    grid-column: 2;
  }
  .dashboard-skeleton {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 767px) {
  .page-header {
    align-items: center;
  }
  .page-header h1 {
    font-size: 1.25rem;
  }
  .page-actions .v-btn:last-child {
    min-width: 44px;
    min-height: 44px;
    padding: 0;
  }
  .page-actions .v-btn:last-child :deep(.v-btn__content) {
    font-size: 0;
  }
  .filter-grid--operations,
  .filter-grid--management {
    grid-template-columns: 1fr;
  }
  .filter-grid--management .v-btn {
    grid-column: 1;
  }
  .capability-preview-banner :deep(.v-alert__append) {
    display: none;
  }
  .dashboard-skeleton {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .dashboard-page {
    padding-inline: 8px !important;
  }
  .page-subtitle > span {
    width: 100%;
  }
  .dashboard-control-drawer {
    width: 100vw !important;
  }
}
</style>
