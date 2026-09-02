<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';
import type { StationOption } from '#shared/features/operations/stations';
import StationSelect from '../../features/operations/stations/StationSelect.vue';

const ui = useMaintenanceUi();
type FleetAircraft = MaintenanceCommandCenterDto['fleet'][number];
type TechnicalEligibility = FleetAircraft['technicalEligibility'];

const filters = reactive({
  search: '',
  stationId: '' as string | null,
  serviceability: '',
  eligibility: null as TechnicalEligibility | null,
  dueState: ''
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-aircraft-status', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

// Fetch ringan khusus untuk mapping id -> kode station (StationSelect bind by id,
// sedangkan data aircraft di fleet hanya punya currentStationCode).
const { data: stationOptions } = await useAsyncData(
  'station-options-for-aircraft-status-filter',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);

const stationCodeById = computed(() => {
  const map = new Map<string, string>();
  for (const option of stationOptions.value ?? []) map.set(option.id, option.stationCode);
  return map;
});

const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');

const fleet = computed(() => data.value?.fleet ?? []);

const serviceabilityItems = computed(() => [
  ...new Set(fleet.value.map((aircraft) => aircraft.serviceabilityStatus))
]);
const eligibilityItems = computed(() => [
  ...new Set(fleet.value.map((aircraft) => aircraft.technicalEligibility))
]);
const dueStateItems = [
  { title: 'Ada due atau blocker', value: 'DUE' },
  { title: 'Tidak ada due blocker', value: 'CLEAR' }
];

const hasFilters = computed(() =>
  Boolean(
    filters.search.trim() ||
    filters.stationId ||
    filters.serviceability ||
    filters.eligibility ||
    filters.dueState
  )
);

const filteredFleet = computed(() => {
  const query = filters.search.trim().toLowerCase();
  const selectedStationCode = filters.stationId
    ? stationCodeById.value.get(filters.stationId)
    : null;

  return fleet.value.filter((aircraft) => {
    const matchesQuery =
      !query ||
      [aircraft.registrationNumber, aircraft.aircraftType, aircraft.model]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesStation =
      !filters.stationId || aircraft.currentStationCode === selectedStationCode;
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
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Status Teknis Pesawat</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Serviceability, due state, pembatasan, dan paket MRO aktif dari backend.
          <span class="text-caption">Aircraft Technical Status</span>
        </p>
      </div>
      <VSpacer />
      <VBtn to="/maintenance" variant="text" prepend-icon="mdi-arrow-left">
        Ringkasan Maintenance
      </VBtn>
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending"
        aria-label="Muat ulang status maintenance"
        @click="refresh()"
      />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: status teknis pesawat tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role dengan izin membaca maintenance.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Status teknis pesawat belum dapat dimuat.</strong>
      <div>Dampak: eligibility rilis dan due blocker belum dapat dipastikan.</div>
      <div>Langkah berikutnya: coba muat ulang status maintenance.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Coba lagi</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Cari registrasi, tipe, atau fleet"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            style="max-width: 320px"
          />
          <div style="width: 220px">
            <StationSelect
              v-model="filters.stationId"
              label="Station"
              :allow-create="false"
              hide-details
            />
          </div>
          <VSelect
            v-model="filters.serviceability"
            label="Serviceability"
            :items="serviceabilityItems"
            clearable
            density="compact"
            hide-details
            style="max-width: 220px"
          />
          <VSelect
            v-model="filters.eligibility"
            label="Kesiapan rilis"
            :items="eligibilityItems"
            clearable
            density="compact"
            hide-details
            style="max-width: 220px"
          />
          <VSelect
            v-model="filters.dueState"
            label="Status due"
            :items="dueStateItems"
            clearable
            density="compact"
            hide-details
            style="max-width: 190px"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ filteredFleet.length }} hasil</VChip>
        </div>

        <MaintenanceAircraftStatusTable
          v-if="!accessRestricted"
          :fleet="filteredFleet"
          :defects="data?.defects ?? []"
          :releases="data?.technicalReleases ?? []"
          :loading="pending"
        />

        <div
          v-if="!pending && data && !filteredFleet.length"
          class="text-body-2 text-medium-emphasis pa-4"
        >
          {{
            hasFilters
              ? 'Tidak ada pesawat sesuai filter.'
              : 'Tidak ada pesawat dari query backend.'
          }}
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>
