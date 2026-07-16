<script setup lang="ts">
import type { StationDto } from '#shared/features/operations/stations';
import StationFormDialog from './StationFormDialog.vue';

const active = ref<'active' | 'inactive' | 'all'>('active');
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
            <tr v-for="station in stations" :key="station.id">
              <td>{{ station.stationCode }}</td>
              <td>{{ station.stationName }}</td>
              <td>{{ station.cityOrRegion }}, {{ station.province }}</td>
              <td>{{ station.airportType }}</td>
              <td>
                <VChip v-if="station.hasFuelService" size="small">Fuel</VChip>
                <VChip v-if="station.hasHandlingService" size="small">Handling</VChip>
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
