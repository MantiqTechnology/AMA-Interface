<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const filters = reactive({
  search: '',
  station: '',
  serviceability: '',
  eligibility: '',
  dueState: ''
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-aircraft-status', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const stationItems = computed(() => [
  ...new Set(
    (data.value?.fleet ?? []).map((aircraft) => aircraft.currentStationCode).filter(Boolean)
  )
]);
const serviceabilityItems = computed(() => [
  ...new Set((data.value?.fleet ?? []).map((aircraft) => aircraft.serviceabilityStatus))
]);
const eligibilityItems = computed(() => [
  ...new Set((data.value?.fleet ?? []).map((aircraft) => aircraft.technicalEligibility))
]);
const dueStateItems = [
  { title: 'Due or blocked', value: 'DUE' },
  { title: 'No due blocker', value: 'CLEAR' }
];
const hasFilters = computed(() =>
  Boolean(
    filters.search.trim() ||
    filters.station ||
    filters.serviceability ||
    filters.eligibility ||
    filters.dueState
  )
);
const filteredAircraft = computed(() => {
  const query = filters.search.trim().toLowerCase();
  return (data.value?.fleet ?? []).filter((aircraft) => {
    const matchesQuery =
      !query ||
      [aircraft.registrationNumber, aircraft.aircraftType, aircraft.model]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesStation = !filters.station || aircraft.currentStationCode === filters.station;
    const matchesServiceability =
      !filters.serviceability || aircraft.serviceabilityStatus === filters.serviceability;
    const matchesEligibility =
      !filters.eligibility || aircraft.technicalEligibility === filters.eligibility;
    const matchesDue =
      !filters.dueState ||
      (filters.dueState === 'DUE' ? aircraft.maintenanceDue : !aircraft.maintenanceDue);
    return (
      matchesQuery && matchesStation && matchesServiceability && matchesEligibility && matchesDue
    );
  });
});

function eligibilityLabel(value: string) {
  if (value === 'ELIGIBLE') return 'Serviceable';
  if (value === 'RESTRICTED') return 'Restricted';
  if (value === 'BLOCKED') return 'Release blocked';
  return ui.label(value);
}

function dueSummary(aircraft: MaintenanceCommandCenterDto['fleet'][number]) {
  if (!aircraft.maintenanceDue) return 'No due blocker';
  const reason = aircraft.dueReasons[0] ?? 'Maintenance due';
  return reason.replaceAll(/([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)/gu, (token) => ui.label(token));
}

function dueAction(aircraft: MaintenanceCommandCenterDto['fleet'][number]) {
  if (!aircraft.maintenanceDue) return 'No due action required.';
  return 'Review the aircraft technical profile and scope an authoritative maintenance action.';
}

function groundingDefect(aircraftId: string) {
  return (data.value?.defects ?? []).find(
    (defect) => defect.aircraftId === aircraftId && defect.assessmentDecision === 'GROUND'
  );
}

function latestRelease(aircraftId: string) {
  return (data.value?.technicalReleases ?? []).find((release) => release.aircraftId === aircraftId);
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Aircraft Technical Status</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Authoritative aircraft serviceability, due state, restrictions, and active MRO package.
        </p>
      </div>
      <VSpacer />
      <VBtn to="/maintenance" variant="text" prepend-icon="mdi-arrow-left">Command Center</VBtn>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Access restricted.</strong>
      <div>Operational impact: aircraft technical status cannot be displayed for this role.</div>
      <div>Required action: switch to a role with maintenance read permission.</div>
      <div v-if="apiError?.requestId" class="text-caption">Reference: {{ apiError.requestId }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Unable to load aircraft technical status.</strong>
      <div>Operational impact: release eligibility and due blockers cannot be confirmed.</div>
      <div>Required action: retry the authoritative maintenance status query.</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Retry</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Search registration, type, or fleet"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="320"
          />
          <VSelect
            v-model="filters.station"
            label="Station"
            :items="stationItems"
            clearable
            density="compact"
            hide-details
            max-width="180"
          />
          <VSelect
            v-model="filters.serviceability"
            label="Serviceability"
            :items="serviceabilityItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VSelect
            v-model="filters.eligibility"
            label="Release eligibility"
            :items="eligibilityItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VSelect
            v-model="filters.dueState"
            label="Due state"
            :items="dueStateItems"
            clearable
            density="compact"
            hide-details
            max-width="190"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ filteredAircraft.length }} result(s)</VChip>
        </div>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--aircraft">
            <thead>
              <tr>
                <th>Aircraft</th>
                <th>Station and technical state</th>
                <th>Defects / restrictions</th>
                <th>Due and required action</th>
                <th>Package, grounding, release</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Loading aircraft technical status...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Access restricted for the active role.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">
                  Aircraft technical data is unavailable until the API request succeeds.
                </td>
              </tr>
              <template v-else>
                <tr v-for="aircraft in filteredAircraft" :key="aircraft.aircraftId">
                  <td class="sticky-identifier">
                    <NuxtLink
                      class="font-weight-bold"
                      :to="`/master-data/aircraft/${aircraft.aircraftId}`"
                    >
                      {{ aircraft.registrationNumber }}
                    </NuxtLink>
                    <div class="text-caption text-medium-emphasis">
                      {{ aircraft.aircraftType }} / {{ aircraft.model }}
                    </div>
                  </td>
                  <td>
                    <div>{{ aircraft.currentStationCode ?? '-' }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ ui.label(aircraft.operationalStatus) }}
                    </div>
                    <div class="mt-2 mb-1">
                      <VChip
                        :color="ui.technicalStateColor(aircraft.serviceabilityStatus)"
                        size="small"
                        variant="tonal"
                      >
                        {{ ui.label(aircraft.serviceabilityStatus) }}
                      </VChip>
                    </div>
                    <VChip
                      :color="ui.technicalStateColor(aircraft.technicalEligibility)"
                      size="small"
                      variant="tonal"
                    >
                      {{ eligibilityLabel(aircraft.technicalEligibility) }}
                    </VChip>
                  </td>
                  <td>
                    <div>{{ aircraft.openDefectCount }} open defect(s)</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ aircraft.activeRestrictionCount }} active restriction(s)
                    </div>
                  </td>
                  <td>
                    <div>{{ dueSummary(aircraft) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Required action: {{ dueAction(aircraft) }}
                    </div>
                  </td>
                  <td>
                    <div>
                      Active:
                      <VBtn
                        v-if="aircraft.activeWorkPackageId"
                        :to="`/maintenance/work-packages/${aircraft.activeWorkPackageId}`"
                        variant="text"
                        size="small"
                      >
                        {{ aircraft.activeWorkPackageNumber }}
                      </VBtn>
                      <span v-else>-</span>
                    </div>
                    <div>
                      Grounding:
                      <VBtn
                        v-if="groundingDefect(aircraft.aircraftId)?.activeWorkPackageId"
                        :to="`/maintenance/work-packages/${groundingDefect(aircraft.aircraftId)?.activeWorkPackageId}`"
                        variant="text"
                        size="small"
                      >
                        {{ groundingDefect(aircraft.aircraftId)?.defectNumber }}
                      </VBtn>
                      <span v-else>
                        {{ groundingDefect(aircraft.aircraftId)?.defectNumber ?? '-' }}
                      </span>
                    </div>
                    <div>
                      Release:
                      <VBtn
                        v-if="latestRelease(aircraft.aircraftId)"
                        :to="`/maintenance/releases?search=${latestRelease(aircraft.aircraftId)?.releaseNumber}`"
                        variant="text"
                        size="small"
                      >
                        {{ latestRelease(aircraft.aircraftId)?.releaseNumber }}
                      </VBtn>
                      <span v-else>-</span>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Updated: {{ format.dateTime(aircraft.updatedAt) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="data && !filteredAircraft.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? 'No aircraft match the current filters.'
                        : 'No aircraft returned by the authoritative query.'
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
  min-width: 1100px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
}

.maintenance-table--aircraft :deep(th:nth-child(1)),
.maintenance-table--aircraft :deep(td:nth-child(1)) {
  width: 220px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--aircraft :deep(th:nth-child(2)),
.maintenance-table--aircraft :deep(td:nth-child(2)) {
  width: 220px;
}

.maintenance-table--aircraft :deep(th:nth-child(3)),
.maintenance-table--aircraft :deep(td:nth-child(3)) {
  width: 170px;
}

.maintenance-table--aircraft :deep(th:nth-child(4)),
.maintenance-table--aircraft :deep(td:nth-child(4)) {
  width: 260px;
}

.maintenance-table--aircraft :deep(th:nth-child(5)),
.maintenance-table--aircraft :deep(td:nth-child(5)) {
  width: 230px;
}
</style>
