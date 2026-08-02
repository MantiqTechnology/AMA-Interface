<script setup lang="ts">
import type { MaintenanceListQuery, MaintenanceWorkPackageDto } from '#shared/features/maintenance';

type WorkPackageListResponse = {
  items: MaintenanceWorkPackageDto[];
  total: number;
  limit: number;
  offset: number;
};

const ui = useMaintenanceUi();
const format = useLocaleFormat();
const filters = reactive({
  search: '',
  status: ''
});
const statusFilterItems = [
  { title: 'Open', value: 'OPEN' },
  { title: 'In Progress', value: 'IN_PROGRESS' },
  { title: 'Ready For Release', value: 'READY_FOR_RELEASE' },
  { title: 'Released', value: 'RELEASED' },
  { title: 'Cancelled', value: 'CANCELLED' }
];

const query = computed<Partial<MaintenanceListQuery>>(() => ({
  search: filters.search || undefined,
  status: (filters.status || undefined) as MaintenanceListQuery['status'],
  limit: 50,
  offset: 0
}));

const { data, pending, error, refresh } = await useAsyncData(
  'maintenance-work-package-list',
  () => fetchApi<WorkPackageListResponse>('/api/maintenance/work-packages', { query: query.value }),
  { watch: [query] }
);

const workPackages = computed(() => data.value?.items ?? []);
const hasFilters = computed(() => Boolean(filters.search.trim() || filters.status));
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const activeCount = computed(
  () =>
    workPackages.value.filter((item) =>
      ['OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE'].includes(item.status)
    ).length
);
const releaseReadyCount = computed(
  () => workPackages.value.filter((item) => item.status === 'READY_FOR_RELEASE').length
);
const inProgressCount = computed(
  () => workPackages.value.filter((item) => item.status === 'IN_PROGRESS').length
);

function mandatoryCards(item: MaintenanceWorkPackageDto) {
  return item.jobCards.filter((card) => card.mandatoryFlag);
}

function completedMandatoryCards(item: MaintenanceWorkPackageDto) {
  return mandatoryCards(item).filter((card) => card.status === 'READY_FOR_RELEASE_REVIEW');
}

function jobCardProgressText(item: MaintenanceWorkPackageDto) {
  const total = mandatoryCards(item).length;
  const complete = completedMandatoryCards(item).length;
  if (!total) return 'No mandatory job card';
  return `${complete} of ${total} mandatory job card${total === 1 ? '' : 's'} complete`;
}

function inspectionStateText(item: MaintenanceWorkPackageDto) {
  const required = mandatoryCards(item).filter((card) => card.requiresIndependentInspection);
  if (!required.length) return 'No independent inspection required';
  const passed = required.filter((card) =>
    card.signoffs.some(
      (signoff) => signoff.signoffType === 'INDEPENDENT_INSPECTION' && signoff.decision === 'PASSED'
    )
  ).length;
  return `${passed} of ${required.length} inspection${required.length === 1 ? '' : 's'} passed`;
}

function releaseEligibilityText(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Released';
  if (item.status === 'CANCELLED') return 'Cancelled';
  return item.releaseChecklist?.blockers.length ? 'Release blocked' : 'Eligible for release review';
}

function releaseEligibilityColor(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'success';
  if (item.status === 'CANCELLED') return 'error';
  return item.releaseChecklist?.blockers.length ? 'warning' : 'success';
}

function firstBlocker(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Technical release issued.';
  if (item.status === 'CANCELLED') return 'Package cancelled.';
  return item.releaseChecklist?.blockers[0]?.message ?? 'No release blocker recorded.';
}

function requiredAction(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Review release and audit records.';
  if (item.status === 'CANCELLED') return 'Open audit trail if cancellation context is required.';
  if (item.status === 'READY_FOR_RELEASE') return 'Certifying Staff to issue technical release.';
  return (
    item.releaseChecklist?.blockers[0]?.requiredAction ??
    'Open package detail for the next controlled maintenance action.'
  );
}

function ownerForPackage(item: MaintenanceWorkPackageDto) {
  if (item.status === 'READY_FOR_RELEASE') return 'Certifying Staff';
  if (item.status === 'RELEASED') return 'Records Control';
  if (item.status === 'CANCELLED') return 'Maintenance Control';
  if (item.jobCards.some((card) => card.status === 'INSPECTION_REQUIRED')) {
    return 'Independent Inspector';
  }
  return 'Maintenance Control';
}

function sourceLabel(item: MaintenanceWorkPackageDto) {
  if (item.primaryDefectNumber) return `Defect ${item.primaryDefectNumber}`;
  if (item.sourceFlight?.flightNumber) return `Flight ${item.sourceFlight.flightNumber}`;
  return 'Maintenance scope';
}

function providerLabel(item: MaintenanceWorkPackageDto) {
  return item.executionMode === 'EXTERNAL_AMO_VENDOR'
    ? (item.vendorName ?? 'External provider')
    : 'Internal maintenance';
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Work Packages</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Controlled MRO package list. Create new contextual packages from the Command Center.
        </p>
      </div>
      <VSpacer />
      <VBtn to="/maintenance" color="primary" prepend-icon="mdi-plus">Create from context</VBtn>
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending"
        aria-label="Refresh work packages"
        @click="refresh()"
      />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Access restricted.</strong>
      <div>Operational impact: work-package data cannot be displayed for this role.</div>
      <div>Required action: switch to a role with maintenance package read permission.</div>
      <div v-if="apiError?.requestId" class="text-caption">Reference: {{ apiError.requestId }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Unable to load work packages.</strong>
      <div>Operational impact: package progress and release blockers cannot be confirmed.</div>
      <div>Required action: preserve the filters and retry the authoritative query.</div>
      <div v-if="apiError?.requestId" class="text-caption">Reference: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Retry</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex flex-wrap align-center ga-3">
        <div>
          <div class="text-h6">Package control queue</div>
          <div class="text-body-2 text-medium-emphasis">
            Work packages grouped for maintenance control, inspection, and release action.
          </div>
        </div>
        <VSpacer />
        <VChip variant="tonal" size="small"> {{ data?.total ?? 0 }} result(s) </VChip>
        <VChip color="info" variant="tonal" size="small"> {{ activeCount }} active </VChip>
        <VChip color="warning" variant="tonal" size="small">
          {{ inProgressCount }} in progress
        </VChip>
        <VChip color="success" variant="tonal" size="small">
          {{ releaseReadyCount }} ready for release
        </VChip>
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="8">
            <VTextField
              v-model="filters.search"
              label="Search package, aircraft, or title"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.status"
              label="Status"
              clearable
              :items="statusFilterItems"
              item-title="title"
              item-value="value"
            />
          </VCol>
        </VRow>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--packages">
            <thead>
              <tr>
                <th>Work package</th>
                <th>Aircraft and source</th>
                <th>Priority / stage</th>
                <th>Progress and release readiness</th>
                <th>Owner and updated</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Loading work packages...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Access restricted for the active role.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Work-package data is unavailable until retry succeeds.</td>
              </tr>
              <template v-else>
                <tr v-for="item in workPackages" :key="item.id">
                  <td class="sticky-identifier">
                    <NuxtLink
                      class="font-weight-bold"
                      :to="`/maintenance/work-packages/${item.id}`"
                    >
                      {{ item.packageNumber }}
                    </NuxtLink>
                    <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
                  </td>
                  <td>
                    <NuxtLink
                      class="font-weight-medium"
                      :to="`/master-data/aircraft/${item.aircraftId}`"
                    >
                      {{ item.aircraftRegistrationNumber }}
                    </NuxtLink>
                    <div>{{ sourceLabel(item) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ providerLabel(item) }}</div>
                  </td>
                  <td>
                    <div class="mb-1">
                      <VChip
                        size="small"
                        variant="tonal"
                        :color="item.priority === 'AOG' ? 'error' : 'secondary'"
                      >
                        {{ ui.label(item.priority) }}
                      </VChip>
                    </div>
                    <VChip
                      :color="ui.workPackageStatusColor(item.status)"
                      size="small"
                      variant="tonal"
                    >
                      {{ ui.label(item.status) }}
                    </VChip>
                  </td>
                  <td>
                    <div>{{ jobCardProgressText(item) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ inspectionStateText(item) }}
                    </div>
                    <div class="mt-2 mb-1">
                      <VChip size="small" variant="tonal" :color="releaseEligibilityColor(item)">
                        {{ releaseEligibilityText(item) }}
                      </VChip>
                    </div>
                    <div>{{ firstBlocker(item) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Required action: {{ requiredAction(item) }}
                    </div>
                  </td>
                  <td>
                    <div>{{ ownerForPackage(item) }}</div>
                    <div class="text-caption text-medium-emphasis">Version {{ item.version }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Updated: {{ format.dateTime(item.updatedAt) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="!workPackages.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? 'No work packages match the current filters.'
                        : 'No work packages exist in the current maintenance scope.'
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
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
}

.maintenance-table--packages :deep(th:nth-child(1)),
.maintenance-table--packages :deep(td:nth-child(1)) {
  width: 220px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--packages :deep(th:nth-child(2)),
.maintenance-table--packages :deep(td:nth-child(2)) {
  width: 220px;
}

.maintenance-table--packages :deep(th:nth-child(3)),
.maintenance-table--packages :deep(td:nth-child(3)) {
  width: 140px;
}

.maintenance-table--packages :deep(th:nth-child(4)),
.maintenance-table--packages :deep(td:nth-child(4)) {
  width: 320px;
}

.maintenance-table--packages :deep(th:nth-child(5)),
.maintenance-table--packages :deep(td:nth-child(5)) {
  width: 190px;
}
</style>
