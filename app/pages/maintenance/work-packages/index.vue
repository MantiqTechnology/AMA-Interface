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
const { t } = useI18n();
const { resolveAircraftImageUrl } = useAircraftImageUrl();
const filters = reactive({
  search: '',
  status: ''
});
const statusFilterItems = computed(() => [
  { title: ui.label('OPEN'), value: 'OPEN' },
  { title: ui.label('IN_PROGRESS'), value: 'IN_PROGRESS' },
  { title: ui.label('READY_FOR_RELEASE'), value: 'READY_FOR_RELEASE' },
  { title: ui.label('RELEASED'), value: 'RELEASED' },
  { title: ui.label('CANCELLED'), value: 'CANCELLED' }
]);

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
  if (!total) return t('maintenance.workPackagesList.noMandatoryJobCards');
  return t('maintenance.workPackagesList.mandatoryJobCardsComplete', { complete, total });
}

function inspectionStateText(item: MaintenanceWorkPackageDto) {
  const required = mandatoryCards(item).filter((card) => card.requiresIndependentInspection);
  if (!required.length) return t('maintenance.workPackagesList.noIndependentInspectionRequired');
  const passed = required.filter((card) =>
    card.signoffs.some(
      (signoff) => signoff.signoffType === 'INDEPENDENT_INSPECTION' && signoff.decision === 'PASSED'
    )
  ).length;
  return t('maintenance.workPackagesList.inspectionPassedCount', {
    passed,
    total: required.length
  });
}

function releaseEligibilityText(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return ui.label('RELEASED');
  if (item.status === 'CANCELLED') return ui.label('CANCELLED');
  return item.releaseChecklist?.blockers.length
    ? t('maintenance.workPackagesList.releaseBlocked')
    : t('maintenance.workPackagesList.readyForTechnicalRelease');
}

function releaseEligibilityColor(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'success';
  if (item.status === 'CANCELLED') return 'error';
  return item.releaseChecklist?.blockers.length ? 'warning' : 'success';
}

function firstBlocker(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return t('maintenance.workPackagesList.technicalReleaseIssued');
  if (item.status === 'CANCELLED') return t('maintenance.workPackagesList.workPackageCancelled');
  return item.releaseChecklist?.blockers[0]?.message
    ? ui.operationalAction(item.releaseChecklist.blockers[0].message)
    : t('maintenance.workPackagesList.noReleaseBlocker');
}

function requiredAction(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return t('maintenance.workPackagesList.releaseHistory');
  if (item.status === 'CANCELLED') return t('maintenance.workPackagesList.cancellationHistory');
  if (item.status === 'READY_FOR_RELEASE')
    return t('maintenance.workPackagesList.certifyingStaffIssue');
  return (
    (item.releaseChecklist?.blockers[0]?.requiredAction
      ? ui.operationalAction(item.releaseChecklist.blockers[0].requiredAction)
      : null) ?? t('maintenance.workPackagesList.openPackageForNextAction')
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
  if (item.primaryDefectNumber) {
    return t('maintenance.workPackagesList.sourceDefect', {
      defectNumber: item.primaryDefectNumber
    });
  }
  if (item.sourceFlight?.flightNumber) {
    return t('maintenance.workPackagesList.sourceFlight', {
      flightNumber: item.sourceFlight.flightNumber
    });
  }
  return t('maintenance.workPackagesList.sourceMaintenance');
}

function providerLabel(item: MaintenanceWorkPackageDto) {
  return item.executionMode === 'EXTERNAL_AMO_VENDOR'
    ? (item.vendorName ?? t('maintenance.workPackagesList.externalProvider'))
    : t('maintenance.workPackagesList.internalMaintenance');
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">{{ t('maintenance.workPackagesList.title') }}</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('maintenance.workPackagesList.description') }}
        </p>
      </div>
      <VSpacer />
      <VBtn to="/maintenance" color="primary" prepend-icon="mdi-plus">
        {{ t('maintenance.workPackagesList.createFromContext') }}
      </VBtn>
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending"
        :aria-label="t('maintenance.workPackagesList.reloadAria')"
        @click="refresh()"
      />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>{{ t('maintenance.workPackagesList.restrictedTitle') }}</strong>
      <div>{{ t('maintenance.workPackagesList.restrictedImpact') }}</div>
      <div>{{ t('maintenance.workPackagesList.restrictedNextAction') }}</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>{{ t('maintenance.workPackagesList.loadErrorTitle') }}</strong>
      <div>{{ t('maintenance.workPackagesList.loadErrorImpact') }}</div>
      <div>{{ t('maintenance.workPackagesList.loadErrorNextAction') }}</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">
          {{ t('maintenance.workPackagesList.retry') }}
        </VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex flex-wrap align-center ga-3">
        <div>
          <div class="text-h6">{{ t('maintenance.workPackagesList.queueTitle') }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ t('maintenance.workPackagesList.queueSubtitle') }}
          </div>
        </div>
        <VSpacer />
        <VChip variant="tonal" size="small">
          {{ t('maintenance.workPackagesList.results', { count: data?.total ?? 0 }) }}
        </VChip>
        <VChip color="info" variant="tonal" size="small">
          {{ t('maintenance.workPackagesList.active', { count: activeCount }) }}
        </VChip>
        <VChip color="warning" variant="tonal" size="small">
          {{ t('maintenance.workPackagesList.inProgress', { count: inProgressCount }) }}
        </VChip>
        <VChip color="success" variant="tonal" size="small">
          {{ t('maintenance.workPackagesList.awaitingRelease', { count: releaseReadyCount }) }}
        </VChip>
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="8">
            <VTextField
              v-model="filters.search"
              :label="t('maintenance.workPackagesList.searchLabel')"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.status"
              :label="t('maintenance.common.status')"
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
                <th>{{ t('maintenance.workPackagesList.tableWorkPackage') }}</th>
                <th>{{ t('maintenance.workPackagesList.tableAircraftSource') }}</th>
                <th>{{ t('maintenance.workPackagesList.tablePriorityStage') }}</th>
                <th>{{ t('maintenance.workPackagesList.tableProgressRelease') }}</th>
                <th>{{ t('maintenance.workPackagesList.tableOwner') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">{{ t('maintenance.workPackagesList.loading') }}</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">{{ t('maintenance.workPackagesList.accessRestricted') }}</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">{{ t('maintenance.workPackagesList.requestFailed') }}</td>
              </tr>
              <template v-else>
                <tr v-for="item in workPackages" :key="item.id">
                  <td class="sticky-identifier">
                    <VBtn
                      :to="`/maintenance/work-packages/${item.id}`"
                      class="mro-action-btn"
                      color="primary"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-briefcase-eye-outline"
                    >
                      {{
                        t('maintenance.workPackagesList.openPackage', {
                          packageNumber: item.packageNumber
                        })
                      }}
                    </VBtn>
                    <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
                  </td>
                  <td>
                    <div class="d-flex align-center ga-2">
                      <VAvatar rounded="lg" size="40">
                        <VImg
                          v-if="resolveAircraftImageUrl(item.aircraftImageUrl)"
                          :alt="`${item.aircraftRegistrationNumber} aircraft image`"
                          cover
                          :src="resolveAircraftImageUrl(item.aircraftImageUrl) ?? undefined"
                        />
                        <VIcon v-else icon="mdi-airplane" size="22" />
                      </VAvatar>
                      <VBtn
                        :to="`/master-data/aircraft/${item.aircraftId}`"
                        class="mro-action-btn"
                        color="secondary"
                        size="small"
                        variant="outlined"
                      >
                        {{ item.aircraftRegistrationNumber }}
                      </VBtn>
                    </div>
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
                      {{ t('maintenance.workPackagesList.nextActionPrefix') }}
                      {{ requiredAction(item) }}
                    </div>
                  </td>
                  <td>
                    <div>{{ ownerForPackage(item) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t('maintenance.workPackagesList.version', { version: item.version }) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{
                        t('maintenance.workPackagesList.updated', {
                          date: format.dateTime(item.updatedAt)
                        })
                      }}
                    </div>
                    <VBtn
                      :to="`/maintenance/work-packages/${item.id}`"
                      class="mt-2 mro-action-btn"
                      color="primary"
                      size="small"
                      variant="outlined"
                      prepend-icon="mdi-arrow-right-circle-outline"
                    >
                      {{ t('maintenance.workPackagesList.openDetail') }}
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="!workPackages.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? t('maintenance.workPackagesList.noFiltered')
                        : t('maintenance.workPackagesList.noScope')
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

.mro-action-btn {
  min-width: max-content;
  font-weight: 700;
}
</style>
