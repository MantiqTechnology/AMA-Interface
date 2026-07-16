<script setup lang="ts">
import type { FlightCapacityProfileDto } from '#shared/features/operations/flight-capacity-profiles';
import FlightCapacityProfileFormDialog from './FlightCapacityProfileFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<FlightCapacityProfileDto | null>(null);
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'flight-capacity-profiles-page',
  () =>
    fetchApi<FlightCapacityProfileDto[]>('/api/master-data/flight-capacity-profiles', {
      query: { active: active.value, search: search.value }
    }),
  { default: () => [], watch: [active, search] }
);
const display = (value: unknown) =>
  Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : (value ?? '-');
function add() {
  editing.value = null;
  dialog.value = true;
}
function edit(record: FlightCapacityProfileDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: FlightCapacityProfileDto) {
  await fetchApi<FlightCapacityProfileDto>(
    '/api/master-data/flight-capacity-profiles/' + record.id + '/status',
    { method: 'PATCH', body: { isActive: !record.isActive } }
  );
  await refresh();
}
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Flight Capacity Profiles</h1>
        <p class="text-text-secondary">
          Demo seat and cargo allocation profiles by aircraft, route, and service type.
        </p>
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
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert><VSkeletonLoader v-else-if="pending" type="table" />
        <div v-else class="overflow-x-auto">
          <VTable>
            <thead>
              <tr>
                <th>Profile code</th>
                <th>Profile name</th>
                <th>Aircraft</th>
                <th>Route</th>
                <th>Operation type</th>
                <th>Total seats</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>{{ display(record.profileCode) }}</td>
                <td>{{ display(record.profileName) }}</td>
                <td>{{ display(record.aircraftId) }}</td>
                <td>{{ display(record.routeId) }}</td>
                <td>{{ display(record.serviceTypeId) }}</td>
                <td>{{ display(record.seatCapacity) }}</td>
                <td>
                  <VChip :color="record.isActive ? 'success' : 'default'" size="small">
                    {{ record.isActive ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <DsTooltipIconButton
                    icon="mdi-open-in-new"
                    :to="'/master-data/flight-capacity-profiles/' + record.id"
                    tooltip="Open details"
                    variant="text"
                  />
                  <DsTooltipIconButton
                    icon="mdi-pencil-outline"
                    tooltip="Edit"
                    variant="text"
                    @click="edit(record)"
                  />
                  <DsConfirmIconButton
                    :action="() => toggle(record)"
                    :confirm-icon="
                      record.isActive
                        ? 'mdi-toggle-switch-off-outline'
                        : 'mdi-toggle-switch-outline'
                    "
                    :confirm-text="record.isActive ? 'Deactivate' : 'Activate'"
                    :icon="
                      record.isActive
                        ? 'mdi-toggle-switch-off-outline'
                        : 'mdi-toggle-switch-outline'
                    "
                    :message="
                      record.isActive
                        ? 'This record will be hidden from active lists.'
                        : 'This record will become available in active lists.'
                    "
                    :title="record.isActive ? 'Deactivate record?' : 'Activate record?'"
                    :tone="record.isActive ? 'warning' : 'success'"
                    :tooltip="record.isActive ? 'Deactivate' : 'Activate'"
                    variant="text"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard><FlightCapacityProfileFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>
