<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';

const ui = useMaintenanceUi();
const format = useLocaleFormat();
const route = useRoute();
const filters = reactive({
  search: String(route.query.search ?? ''),
  aircraft: '',
  signer: '',
  result: '',
  dateFrom: '',
  dateTo: ''
});
const releaseDrawer = ref(false);
const selectedRelease = ref<MaintenanceCommandCenterDto['technicalReleases'][number] | null>(null);

const { data, pending, error, refresh } = await useAsyncData('maintenance-technical-releases', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const aircraftItems = computed(() => [
  ...new Set(
    (data.value?.technicalReleases ?? []).map((release) => release.aircraftRegistrationNumber)
  )
]);
const signerItems = computed(() => [
  ...new Set((data.value?.technicalReleases ?? []).map((release) => releaseSignerName(release)))
]);
const resultItems = computed(() => [
  ...new Set((data.value?.technicalReleases ?? []).map((release) => release.resultingStatus))
]);
const hasFilters = computed(() =>
  Boolean(
    filters.search.trim() ||
    filters.aircraft ||
    filters.signer ||
    filters.result ||
    filters.dateFrom ||
    filters.dateTo
  )
);
const releases = computed(() => {
  const query = filters.search.trim().toLowerCase();
  return (data.value?.technicalReleases ?? []).filter((release) => {
    const matchesQuery =
      !query ||
      [
        release.releaseNumber,
        release.aircraftRegistrationNumber,
        release.workOrderReference,
        release.certifyingLicenseNumber,
        releaseSignerName(release)
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesAircraft =
      !filters.aircraft || release.aircraftRegistrationNumber === filters.aircraft;
    const matchesSigner = !filters.signer || releaseSignerName(release) === filters.signer;
    const matchesResult = !filters.result || release.resultingStatus === filters.result;
    const matchesDateFrom = !filters.dateFrom || release.releasedAt >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || release.releasedAt <= filters.dateTo;
    return (
      matchesQuery &&
      matchesAircraft &&
      matchesSigner &&
      matchesResult &&
      matchesDateFrom &&
      matchesDateTo
    );
  });
});

function releaseSignerName(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  const name = release.signerAuthorizationSnapshot?.personnelName;
  return typeof name === 'string' ? name : 'Certifying staff';
}

function linkedPackage(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  return (data.value?.workPackages ?? []).find(
    (item) => item.packageNumber === release.workOrderReference
  );
}

function linkedDefectDisposition(
  release: MaintenanceCommandCenterDto['technicalReleases'][number]
) {
  const defects = (data.value?.defects ?? []).filter((defect) =>
    release.defectIds.includes(defect.id)
  );
  if (!defects.length) return 'No linked defect in current register scope.';
  return defects.map((defect) => `${defect.defectNumber}: ${ui.label(defect.status)}`).join(', ');
}

function snapshotValue(
  release: MaintenanceCommandCenterDto['technicalReleases'][number],
  key: string
) {
  if (!release.signerAuthorizationSnapshot && key === 'companyAuthorizationNumber') {
    return 'Legacy record — company authorization snapshot unavailable.';
  }
  const value = release.signerAuthorizationSnapshot?.[key];
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function openRelease(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  selectedRelease.value = release;
  releaseDrawer.value = true;
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Technical Releases</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Signed aircraft maintenance releases with immutable signer-authorization snapshots.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Access restricted.</strong>
      <div>Operational impact: release records cannot be displayed for this role.</div>
      <div>Required action: switch to a role with maintenance read permission.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Unable to load technical release records.</strong>
      <div>
        Operational impact: signed release and authorization snapshot review is unavailable.
      </div>
      <div>Required action: retry the authoritative maintenance query.</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Retry</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Search release, aircraft, signer, or work package"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="360"
          />
          <VSelect
            v-model="filters.aircraft"
            label="Aircraft"
            :items="aircraftItems"
            clearable
            density="compact"
            hide-details
            max-width="200"
          />
          <VSelect
            v-model="filters.signer"
            label="Signer"
            :items="signerItems"
            clearable
            density="compact"
            hide-details
            max-width="240"
          />
          <VSelect
            v-model="filters.result"
            label="Result"
            :items="resultItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VTextField
            v-model="filters.dateFrom"
            label="Date from"
            density="compact"
            hide-details
            max-width="160"
          />
          <VTextField
            v-model="filters.dateTo"
            label="Date to"
            density="compact"
            hide-details
            max-width="160"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ releases.length }} result(s)</VChip>
        </div>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--releases">
            <thead>
              <tr>
                <th>Release</th>
                <th>Aircraft / work package</th>
                <th>Resulting Technical State</th>
                <th>Signer / licence</th>
                <th>Snapshot / released</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Loading technical releases...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Access restricted for the active role.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">
                  Technical release data is unavailable until the API request succeeds.
                </td>
              </tr>
              <template v-else>
                <tr v-for="release in releases" :key="release.id">
                  <td class="sticky-identifier">
                    <button class="release-link" type="button" @click="openRelease(release)">
                      {{ release.releaseNumber }}
                    </button>
                  </td>
                  <td>
                    <div>{{ release.aircraftRegistrationNumber }}</div>
                    <div>
                      <VBtn
                        v-if="linkedPackage(release)"
                        :to="`/maintenance/work-packages/${linkedPackage(release)?.id}`"
                        variant="text"
                        size="small"
                      >
                        {{ release.workOrderReference }}
                      </VBtn>
                      <span v-else>{{ release.workOrderReference }}</span>
                    </div>
                  </td>
                  <td>
                    <VChip
                      :color="ui.technicalStateColor(release.resultingStatus)"
                      size="small"
                      variant="tonal"
                    >
                      {{ ui.label(release.resultingStatus) }}
                    </VChip>
                  </td>
                  <td>
                    <div>{{ releaseSignerName(release) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ release.certifyingLicenseNumber }}
                    </div>
                  </td>
                  <td>
                    <span v-if="release.signerAuthorizationSnapshot">Captured</span>
                    <span v-else>Legacy record - authorization snapshot unavailable.</span>
                    <div class="text-caption text-medium-emphasis">
                      {{ format.dateTime(release.releasedAt) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="data && !releases.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? 'No technical releases match the current filters.'
                        : 'No technical releases recorded.'
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>

    <VNavigationDrawer v-model="releaseDrawer" location="right" temporary width="520">
      <template v-if="selectedRelease">
        <div class="pa-4">
          <div class="d-flex align-center ga-3 mb-4">
            <div>
              <h2 class="text-h6 mb-0">{{ selectedRelease.releaseNumber }}</h2>
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedRelease.aircraftRegistrationNumber }} /
                {{ selectedRelease.workOrderReference }}
              </div>
            </div>
            <VSpacer />
            <VBtn icon="mdi-close" variant="text" @click="releaseDrawer = false" />
          </div>
          <VAlert type="info" variant="tonal" class="mb-4">{{ authorizationWording }}</VAlert>
          <VList density="compact" border rounded class="mb-4">
            <VListItem
              title="Released at"
              :subtitle="format.dateTime(selectedRelease.releasedAt)"
            />
            <VListItem title="Signer" :subtitle="releaseSignerName(selectedRelease)" />
            <VListItem
              title="Selected licence"
              :subtitle="selectedRelease.certifyingLicenseNumber"
            />
            <VListItem
              title="Resulting technical state"
              :subtitle="ui.label(selectedRelease.resultingStatus)"
            />
            <VListItem
              title="Linked defect disposition"
              :subtitle="linkedDefectDisposition(selectedRelease)"
            />
          </VList>
          <VAlert
            v-if="!selectedRelease.signerAuthorizationSnapshot"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            Legacy record — company authorization snapshot unavailable.
          </VAlert>
          <VList v-else density="compact" border rounded class="mb-4">
            <VListSubheader>Authorization snapshot</VListSubheader>
            <VListItem
              title="Personnel"
              :subtitle="snapshotValue(selectedRelease, 'personnelName')"
            />
            <VListItem
              title="Licence status"
              :subtitle="snapshotValue(selectedRelease, 'licenseStatus')"
            />
            <VListItem
              title="Aircraft scope"
              :subtitle="snapshotValue(selectedRelease, 'aircraftScope')"
            />
            <VListItem
              title="Company authorization"
              :subtitle="snapshotValue(selectedRelease, 'companyAuthorizationNumber')"
            />
            <VListItem title="Verification" :subtitle="snapshotValue(selectedRelease, 'basis')" />
          </VList>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-if="linkedPackage(selectedRelease)"
              :to="`/maintenance/work-packages/${linkedPackage(selectedRelease)?.id}`"
              color="primary"
              variant="tonal"
            >
              Open Work Package
            </VBtn>
            <VBtn
              :to="`/maintenance/records?package=${selectedRelease.workOrderReference}`"
              variant="text"
            >
              View Audit
            </VBtn>
          </div>
        </div>
      </template>
    </VNavigationDrawer>
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

.maintenance-table--releases :deep(th:nth-child(1)),
.maintenance-table--releases :deep(td:nth-child(1)) {
  width: 190px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.release-link {
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.maintenance-table--releases :deep(th:nth-child(2)),
.maintenance-table--releases :deep(td:nth-child(2)) {
  width: 180px;
}

.maintenance-table--releases :deep(th:nth-child(3)),
.maintenance-table--releases :deep(td:nth-child(3)) {
  width: 170px;
}

.maintenance-table--releases :deep(th:nth-child(4)),
.maintenance-table--releases :deep(td:nth-child(4)) {
  width: 180px;
}

.maintenance-table--releases :deep(th:nth-child(5)),
.maintenance-table--releases :deep(td:nth-child(5)) {
  width: 300px;
}
</style>
