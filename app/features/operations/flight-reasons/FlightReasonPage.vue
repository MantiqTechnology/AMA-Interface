<script setup lang="ts">
import type { FlightReasonDto } from '#shared/features/operations/flight-reasons';
import type { DataTableHeader } from 'vuetify';
import ExpandedTable from '../../../components/common/table/Expanded.vue';
import FlightReasonFormDialog from './FlightReasonFormDialog.vue';

const active = ref<'active' | 'inactive' | 'all'>('active');
const search = ref('');
const dialog = ref(false);
const editing = ref<FlightReasonDto | null>(null);
const headers: DataTableHeader[] = [
  { title: '', key: 'data-table-expand', width: 48, sortable: false },
  { title: 'Reason code', key: 'reasonCode', width: 150 },
  { title: 'Reason name', key: 'reasonName', minWidth: 220 },
  { title: 'Reason type', key: 'reasonType', width: 150 },
  { title: 'Category', key: 'category', width: 160 },
  { title: 'Status', key: 'isActive', width: 120, sortable: false },
  { title: '', key: 'actions', width: 152, sortable: false, align: 'end' }
];
const {
  data: records,
  pending,
  error,
  refresh
} = await useAsyncData(
  'flight-reasons-page',
  () =>
    fetchApi<FlightReasonDto[]>('/api/master-data/flight-reasons', {
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

const fetchDetail = (record: FlightReasonDto) =>
  fetchApi<FlightReasonDto>('/api/master-data/flight-reasons/' + record.id);

function add() {
  editing.value = null;
  dialog.value = true;
}
function edit(record: FlightReasonDto) {
  editing.value = record;
  dialog.value = true;
}
async function toggle(record: FlightReasonDto) {
  await fetchApi<FlightReasonDto>('/api/master-data/flight-reasons/' + record.id + '/status', {
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
        <h1 class="text-h4 font-weight-bold">Flight Reasons</h1>
        <p class="text-text-secondary">
          Standard reasons for delay, cancellation, diversion, and correction reopening.
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
        <VAlert v-if="error" color="error">{{ error.message }}</VAlert>
        <ExpandedTable
          v-else
          class="flight-reasons-table"
          :fetch-detail="fetchDetail"
          :headers="headers"
          :items="records"
          :items-length="records.length"
          :loading="pending"
          no-data-text="No flight reasons found"
        >
          <template #[`item.reasonCode`]="{ item }">
            <span class="font-weight-medium">{{ display(item.reasonCode) }}</span>
          </template>
          <template #[`item.reasonType`]="{ item }">
            <span class="text-capitalize">{{ display(item.reasonType) }}</span>
          </template>
          <template #[`item.isActive`]="{ item }">
            <VChip :color="item.isActive ? 'success' : 'default'" size="small">
              {{ item.isActive ? 'Active' : 'Inactive' }}
            </VChip>
          </template>
          <template #[`item.actions`]="{ item }">
            <div class="d-flex justify-end">
              <VTooltip location="top" text="Open details">
                <template #activator="{ props: tooltipProps }">
                  <VBtn
                    v-bind="tooltipProps"
                    aria-label="Open flight reason"
                    icon="mdi-open-in-new"
                    size="small"
                    :to="'/master-data/flight-reasons/' + item.id"
                    variant="text"
                  />
                </template>
              </VTooltip>
              <VTooltip location="top" text="Edit">
                <template #activator="{ props: tooltipProps }">
                  <VBtn
                    v-bind="tooltipProps"
                    aria-label="Edit flight reason"
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    @click="edit(item)"
                  />
                </template>
              </VTooltip>
              <VTooltip location="top" :text="item.isActive ? 'Deactivate' : 'Activate'">
                <template #activator="{ props: tooltipProps }">
                  <VBtn
                    v-bind="tooltipProps"
                    :aria-label="
                      item.isActive ? 'Deactivate flight reason' : 'Activate flight reason'
                    "
                    :icon="
                      item.isActive ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                    "
                    size="small"
                    variant="text"
                    @click="toggle(item)"
                  />
                </template>
              </VTooltip>
            </div>
          </template>
          <template #detail="{ item, detail }">
            <div class="flight-reason-detail">
              <div class="flight-reason-detail__description">
                <div class="text-caption text-medium-emphasis">Description</div>
                <div>{{ display(detail?.description ?? item.description) }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Operator note required</div>
                <div>{{ display(detail?.requiresNote ?? item.requiresNote) }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Affects operational KPI</div>
                <div>
                  {{ display(detail?.affectsOperationalKpi ?? item.affectsOperationalKpi) }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Finance review</div>
                <div>{{ display(detail?.affectsFinanceReview ?? item.affectsFinanceReview) }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Dashboard severity</div>
                <div class="text-capitalize">
                  {{ display(detail?.dashboardSeverity ?? item.dashboardSeverity) }}
                </div>
              </div>
            </div>
          </template>
        </ExpandedTable>
      </VCardText>
    </VCard><FlightReasonFormDialog v-model="dialog" :record="editing" @saved="refresh" />
  </VContainer>
</template>

<style scoped>
.flight-reason-detail {
  display: grid;
  gap: 16px 24px;
  grid-template-columns: minmax(180px, 2fr) repeat(4, minmax(140px, 1fr));
}

.flight-reason-detail__description {
  min-width: 0;
}

@media (max-width: 1100px) {
  .flight-reason-detail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flight-reason-detail__description {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .flight-reason-detail {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
