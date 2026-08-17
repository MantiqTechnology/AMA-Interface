<script setup lang="ts">
import type { StationDto } from '#shared/features/operations/stations';
import StationFormDialog from './StationFormDialog.vue';

const active = ref<'active' | 'inactive' | 'all'>('active');
const route = useRoute();
const capability = ref<string | null>(
  typeof route.query.capability === 'string' ? route.query.capability : null
);
const capabilityGap = route.query.capabilityGap === 'true';
const search = ref('');
const dialog = ref(false);
const editing = ref<StationDto | null>(null);
const {
  data: stations,
  pending,
  error,
  refresh
} = await useAsyncData(
  'stations-page',
  () =>
    fetchApi<StationDto[]>('/api/master-data/stations', {
      query: { active: active.value, search: search.value }
    }),
  { default: () => [], watch: [active, search] }
);
const filteredStations = computed(() =>
  stations.value.filter((station) => {
    if (
      capabilityGap &&
      station.hasFuelService &&
      station.hasHandlingService &&
      station.hasParkingService
    )
      return false;
    if (capability.value === 'FUEL') return station.hasFuelService;
    if (capability.value === 'HANDLING') return station.hasHandlingService;
    if (capability.value === 'PARKING') return station.hasParkingService;
    return true;
  })
);
function add() {
  editing.value = null;
  dialog.value = true;
}
function edit(station: StationDto) {
  editing.value = station;
  dialog.value = true;
}
async function toggle(station: StationDto) {
  await fetchApi<StationDto>(`/api/master-data/stations/${station.id}/status`, {
    method: 'PATCH',
    body: { isActive: !station.isActive }
  });
  await refresh();
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Stations & Airports</h1>
        <p class="text-text-secondary">Airports, airstrips, and stations served by operations.</p>
      </div>
      <VSpacer /><VBtn color="primary" prepend-icon="mdi-plus" @click="add">Add data</VBtn>
    </div>
    <VCard border>
      <VCardText>
        <div class="mb-4 d-flex ga-3">
          <VTextField
            v-model="search"
            clearable
            hide-details
            label="Search"
            max-width="360"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          /><VSelect
            v-model="active"
            hide-details
            :items="['active', 'inactive', 'all']"
            label="Status"
            max-width="180"
            variant="outlined"
          />
          <VSelect
            v-model="capability"
            clearable
            hide-details
            :items="[
              { title: 'Fuel', value: 'FUEL' },
              { title: 'Handling', value: 'HANDLING' },
              { title: 'Parking', value: 'PARKING' }
            ]"
            label="Capability"
            max-width="180"
            variant="outlined"
          />
        </div>
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert>
        <VSkeletonLoader v-else-if="pending" type="table" />
        <VTable v-else>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Location</th>
              <th>Type</th>
              <th>Capabilities</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="station in filteredStations" :key="station.id">
              <td>{{ station.stationCode }}</td>
              <td>{{ station.stationName }}</td>
              <td>{{ station.city }}, {{ station.province }}</td>
              <td>{{ station.airportType }}</td>
              <td>
                <VChip v-if="station.hasFuelService" size="small">Fuel</VChip>
                <VChip v-if="station.hasHandlingService" size="small">Handling</VChip>
                <VChip v-if="station.hasParkingService" size="small">Parking</VChip>
              </td>
              <td>
                <VChip :color="station.isActive ? 'success' : 'default'" size="small">
                  {{ station.isActive ? 'Active' : 'Inactive' }}
                </VChip>
              </td>
              <td class="text-right">
                <DsTooltipIconButton
                  icon="mdi-open-in-new"
                  :to="`/master-data/stations/${station.id}`"
                  tooltip="Open details"
                  variant="text"
                />
                <DsTooltipIconButton
                  icon="mdi-pencil-outline"
                  tooltip="Edit"
                  variant="text"
                  @click="edit(station)"
                />
                <DsConfirmIconButton
                  :action="() => toggle(station)"
                  :confirm-icon="
                    station.isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                  "
                  :confirm-text="station.isActive ? 'Deactivate' : 'Activate'"
                  :icon="
                    station.isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                  "
                  :message="
                    station.isActive
                      ? 'This record will be hidden from active lists.'
                      : 'This record will become available in active lists.'
                  "
                  :title="station.isActive ? 'Deactivate record?' : 'Activate record?'"
                  :tone="station.isActive ? 'warning' : 'success'"
                  :tooltip="station.isActive ? 'Deactivate' : 'Activate'"
                  variant="text"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>
    <StationFormDialog v-model="dialog" :station="editing" @saved="refresh" />
  </VContainer>
</template>
