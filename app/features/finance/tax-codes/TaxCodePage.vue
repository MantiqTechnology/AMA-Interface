<script setup lang="ts">
import type { TaxCodeDto } from '#shared/features/finance/tax-codes';
import TaxCodeFormDialog from './TaxCodeFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<TaxCodeDto | null>(null);
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'tax-codes-page',
  () =>
    fetchApi<TaxCodeDto[]>('/api/master-data/tax-codes', {
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
function edit(record: TaxCodeDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: TaxCodeDto) {
  await fetchApi<TaxCodeDto>('/api/master-data/tax-codes/' + record.id + '/status', {
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
        <h1 class="text-h4 font-weight-bold">Tax Codes</h1>
        <p class="text-text-secondary">Demo tax configuration for transaction selection.</p>
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
                <th>Tax code</th>
                <th>Tax name</th>
                <th>Tax rate</th>
                <th>Tax type</th>
                <th>Effective from</th>
                <th>Effective to</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>{{ display(record.taxCode) }}</td>
                <td>{{ display(record.taxName) }}</td>
                <td>{{ display(record.taxRateBasisPoints) }}</td>
                <td>{{ display(record.taxType) }}</td>
                <td>{{ display(record.effectiveFrom) }}</td>
                <td>{{ display(record.effectiveTo) }}</td>
                <td>
                  <VChip :color="record.isActive ? 'success' : 'default'" size="small">
                    {{ record.isActive ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <DsTooltipIconButton
                    icon="mdi-open-in-new"
                    :to="'/master-data/tax-codes/' + record.id"
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
    </VCard><TaxCodeFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>
