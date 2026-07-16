<script setup lang="ts">
import type { RouteDto } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
import RouteFormDialog from './RouteFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<RouteDto | null>(null);
const {
  data: routes,
  pending,
  error,
  refresh
} = await useAsyncData(
  'routes-page',
  () =>
    fetchApi<RouteDto[]>('/api/master-data/routes', {
      query: { active: active.value, search: search.value }
    }),
  { default: () => [], watch: [active, search] }
);
const { data: stations } = await useAsyncData(
  'route-page-stations',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const stationCode = (id: string) =>
  stations.value.find((station) => station.id === id)?.stationCode ?? id;
function add() {
  editing.value = null;
  dialog.value = true;
}
function edit(route: RouteDto) {
  editing.value = route;
  dialog.value = true;
}
async function toggle(route: RouteDto) {
  await fetchApi<RouteDto>(`/api/master-data/routes/${route.id}/status`, {
    method: 'PATCH',
    body: { isActive: !route.isActive }
  });
  await refresh();
}
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Routes</h1>
        <p class="text-text-secondary">Station-to-station route references for flight planning.</p>
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
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert><VSkeletonLoader v-else-if="pending" type="table" /><VTable v-else>
          <thead>
            <tr>
              <th>Route</th>
              <th>Route code</th>
              <th>Duration</th>
              <th>Distance</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="route in routes" :key="route.id">
              <td>
                {{ stationCode(route.originStationId) }} →
                {{ stationCode(route.destinationStationId) }}
              </td>
              <td>{{ route.routeCode }}</td>
              <td>{{ route.estimatedDurationMinutes }} min</td>
              <td>{{ route.distanceKm }} km</td>
              <td>
                <VChip :color="route.isActive ? 'success' : 'default'" size="small">
                  {{ route.isActive ? 'Active' : 'Inactive' }}
                </VChip>
              </td>
              <td class="text-right">
                <DsTooltipIconButton
                  icon="mdi-open-in-new"
                  :to="`/master-data/routes/${route.id}`"
                  tooltip="Open details"
                  variant="text"
                />
                <DsTooltipIconButton
                  icon="mdi-pencil-outline"
                  tooltip="Edit"
                  variant="text"
                  @click="edit(route)"
                />
                <DsConfirmIconButton
                  :action="() => toggle(route)"
                  :confirm-icon="
                    route.isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                  "
                  :confirm-text="route.isActive ? 'Deactivate' : 'Activate'"
                  :icon="
                    route.isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                  "
                  :message="
                    route.isActive
                      ? 'This record will be hidden from active lists.'
                      : 'This record will become available in active lists.'
                  "
                  :title="route.isActive ? 'Deactivate record?' : 'Activate record?'"
                  :tone="route.isActive ? 'warning' : 'success'"
                  :tooltip="route.isActive ? 'Deactivate' : 'Activate'"
                  variant="text"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard><RouteFormDialog v-model="dialog" :route="editing" @saved="refresh" />
  </VContainer>
</template>
