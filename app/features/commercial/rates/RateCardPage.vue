<script setup lang="ts">
import type { RateCardDto } from '#shared/features/commercial/rates';
import RateCardFormDialog from './RateCardFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<RateCardDto | null>(null);
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'rates-page',
  () =>
    fetchApi<RateCardDto[]>('/api/master-data/rates', {
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
function edit(record: RateCardDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: RateCardDto) {
  await fetchApi<RateCardDto>('/api/master-data/rates/' + record.id + '/status', {
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
        <h1 class="text-h4 font-weight-bold">Fare & Rate Cards</h1>
        <p class="text-text-secondary">
          Demo passenger, cargo, and charter rates for future billing references.
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
                <th>Rate code</th>
                <th>Service type</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Customer</th>
                <th>Aircraft type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>{{ display(record.rateCode) }}</td>
                <td>{{ display(record.serviceType) }}</td>
                <td>{{ display(record.originStationId) }}</td>
                <td>{{ display(record.destinationStationId) }}</td>
                <td>{{ display(record.customerId) }}</td>
                <td>{{ display(record.aircraftType) }}</td>
                <td>
                  <VChip :color="record.isActive ? 'success' : 'default'" size="small">
                    {{ record.isActive ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <DsTooltipIconButton
                    icon="mdi-open-in-new"
                    :to="'/master-data/rates/' + record.id"
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
    </VCard><RateCardFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>
