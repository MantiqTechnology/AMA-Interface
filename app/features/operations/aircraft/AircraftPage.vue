<script setup lang="ts">
import type { AircraftDto } from '#shared/features/operations/aircraft';
import AircraftFormDialog from './AircraftFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<AircraftDto | null>(null);
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'aircraft-page',
  () =>
    fetchApi<AircraftDto[]>('/api/master-data/aircraft', {
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
function edit(record: AircraftDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: AircraftDto) {
  await fetchApi<AircraftDto>('/api/master-data/aircraft/' + record.id + '/status', {
    method: 'PATCH',
    body: { isActive: !record.isActive }
  });
  await refresh();
}
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Aircraft</h1>
        <p class="text-text-secondary">
          Aircraft reference used for Flight Control assignment and readiness checks.
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
                <th>Registration number</th>
                <th>Serial number / MSN</th>
                <th>Aircraft type</th>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Fleet code</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>{{ display(record.registrationNumber) }}</td>
                <td>{{ display(record.serialNumber) }}</td>
                <td>{{ display(record.aircraftType) }}</td>
                <td>{{ display(record.manufacturer) }}</td>
                <td>{{ display(record.model) }}</td>
                <td>{{ display(record.fleetCode) }}</td>
                <td>
                  <VChip :color="record.isActive ? 'success' : 'default'" size="small">
                    {{ record.isActive ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <VBtn
                    icon="mdi-open-in-new"
                    :to="'/master-data/aircraft/' + record.id"
                    variant="text"
                  /><VBtn icon="mdi-pencil-outline" variant="text" @click="edit(record)" /><VBtn
                    :icon="
                      record.isActive
                        ? 'mdi-toggle-switch-off-outline'
                        : 'mdi-toggle-switch-outline'
                    "
                    variant="text"
                    @click="toggle(record)"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard><AircraftFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>
