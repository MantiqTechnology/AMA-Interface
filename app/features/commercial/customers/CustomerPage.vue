<script setup lang="ts">
import type { CustomerDto } from '#shared/features/commercial/customers';
import CustomerFormDialog from './CustomerFormDialog.vue';
const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<CustomerDto | null>(null);
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'customers-page',
  () =>
    fetchApi<CustomerDto[]>('/api/master-data/customers', {
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
function edit(record: CustomerDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: CustomerDto) {
  await fetchApi<CustomerDto>('/api/master-data/customers/' + record.id + '/status', {
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
        <h1 class="text-h4 font-weight-bold">Customers & Corporate Accounts</h1>
        <p class="text-text-secondary">
          Individual, corporate, government, and agency customer accounts.
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
                <th>Account type</th>
                <th>Account code</th>
                <th>Account name</th>
                <th>Primary contact person</th>
                <th>Phone</th>
                <th>Primary email</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>{{ display(record.accountType) }}</td>
                <td>{{ display(record.accountCode) }}</td>
                <td>{{ display(record.accountName) }}</td>
                <td>{{ display(record.contactPerson) }}</td>
                <td>{{ display(record.phone) }}</td>
                <td>{{ display(record.email) }}</td>
                <td>
                  <VChip :color="record.isActive ? 'success' : 'default'" size="small">
                    {{ record.isActive ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <DsTooltipIconButton
                    icon="mdi-open-in-new"
                    :to="'/master-data/customers/' + record.id"
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
    </VCard><CustomerFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>
