<script setup lang="ts">
import type {
  MasterDataEntityConfig,
  MasterDataEntityKey,
  MasterDataListResponse,
  MasterDataOption,
  MasterDataRecord,
  MasterDataValue,
  MasterDataDisplayColumn,
  MasterDataFieldConfig
} from '#shared/contracts/master-data';
import type { ApiError, ApiResponse } from '#shared/contracts/api';
import { vendorsMasterDataConfig } from '#shared/contracts/master-data';

type FormState = Record<string, MasterDataValue>;
type ActiveFilter = 'active' | 'inactive' | 'all';

const config: MasterDataEntityConfig = vendorsMasterDataConfig;

const { pushToast } = useDemoToasts();
const activeFilter = ref<ActiveFilter>('active');
const search = ref('');
const dialog = ref(false);
const confirmDialog = ref(false);
const submitting = ref(false);
const serverError = ref('');
const editingRecord = ref<MasterDataRecord | null>(null);
const pendingStatusRecord = ref<MasterDataRecord | null>(null);
const nextStatus = ref(true);
const form = reactive<FormState>({});

const activeFilterOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'All', value: 'all' }
] as const;

const dataKey = computed(() => `master-data-${config.key}`);

const { data, pending, error, refresh } = await useAsyncData(
  dataKey.value,
  () =>
    fetchApi<MasterDataListResponse>(config.apiPath, {
      query: {
        active: activeFilter.value,
        search: search.value
      }
    }),
  {
    watch: [activeFilter, search]
  }
);

const rows = computed(() => data.value?.rows ?? []);
const hasRows = computed(() => rows.value.length > 0);

const displayColumns = computed(() =>
  (config.displayColumns as readonly MasterDataDisplayColumn[]).map(
    (column: MasterDataDisplayColumn) => normalizeColumn(column)
  )
);

function normalizeColumn(column: MasterDataDisplayColumn) {
  if (typeof column !== 'string') return column;

  const field = (config.fields as readonly MasterDataFieldConfig[]).find(
    (item: MasterDataFieldConfig) => item.key === column
  );
  return {
    key: column,
    label: field?.label ?? column.replaceAll('_', ' '),
    type: field?.type === 'boolean' ? 'boolean' : 'text'
  };
}

function defaultValue(field: MasterDataFieldConfig): MasterDataValue {
  if (field.default !== undefined) return field.default;
  if (field.type === 'boolean') return false;
  if (field.nullable || !field.required) return null;
  if (field.type === 'number' || field.type === 'money') return 0;
  return '';
}

function resetForm(record?: MasterDataRecord) {
  serverError.value = '';

  for (const field of config.fields) {
    form[field.key] = record ? (record[field.key] ?? defaultValue(field)) : defaultValue(field);
  }
}

function openCreate() {
  editingRecord.value = null;
  resetForm();
  dialog.value = true;
}

function openEdit(record: MasterDataRecord) {
  editingRecord.value = record;
  resetForm(record);
  dialog.value = true;
}

function requiredRules(field: MasterDataFieldConfig) {
  return [
    (value: MasterDataValue) => {
      if (!field.required) return true;
      return value !== null && value !== '' ? true : `${field.label} is required`;
    },
    (value: MasterDataValue) => {
      if ((field.type !== 'number' && field.type !== 'money') || value === null || value === '')
        return true;
      return Number(value) >= (field.min ?? 0) ? true : `${field.label} cannot be negative`;
    }
  ];
}

function relationOptions(field: MasterDataFieldConfig): MasterDataOption[] {
  if (!field.relation) return [];

  const options = data.value?.lookups[field.relation] ?? [];
  const currentValue = editingRecord.value ? editingRecord.value[field.key] : null;

  return options.filter((option) => option.isActive || option.value === currentValue);
}

function relationLabel(relation: MasterDataEntityKey | undefined, id: MasterDataValue) {
  if (!relation || typeof id !== 'string') return '-';

  const option = data.value?.lookups[relation]?.find((item) => item.value === id);
  return option?.title ?? id;
}

function readable(value: MasterDataValue) {
  if (value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replaceAll('_', ' ');
}

function formatInteger(value: MasterDataValue) {
  if (typeof value !== 'number') return '-';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function chipColor(value: MasterDataValue) {
  const normalized = String(value).toLowerCase();

  if (['serviceable', 'active', 'valid', 'both', 'handling'].includes(normalized)) return 'success';
  if (['maintenance_due', 'upcoming', 'expiring soon', 'parking'].includes(normalized))
    return 'warning';
  if (['unserviceable', 'expired', 'inactive'].includes(normalized)) return 'error';
  return 'info';
}

function dateStatus(value: MasterDataValue) {
  if (typeof value !== 'string') return 'Not Set';

  const today = new Date();
  const currentDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const expiryDate = new Date(`${value}T00:00:00.000Z`);
  const diffDays = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / 86_400_000);

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 30) return 'Expiring Soon';
  return 'Valid';
}

function effectiveStatus(record: MasterDataRecord) {
  if (!record.is_active) return 'Inactive';

  const today = new Date().toISOString().slice(0, 10);
  const from = typeof record.effective_from === 'string' ? record.effective_from : null;
  const to = typeof record.effective_to === 'string' ? record.effective_to : null;

  if (from && from > today) return 'Upcoming';
  if (to && to < today) return 'Expired';
  return 'Active';
}

function routeLabel(record: MasterDataRecord) {
  return `${stationShortLabel(record.origin_station_id)} → ${stationShortLabel(record.destination_station_id)}`;
}

function stationShortLabel(id: MasterDataValue) {
  return relationLabel('stations', id).split(' - ')[0] ?? '-';
}

function booleanChip(value: MasterDataValue) {
  return Boolean(value) ? 'Yes' : 'No';
}

function detailPath(record: MasterDataRecord) {
  return `${config.routePath}/${encodeURIComponent(record.id)}`;
}

function requestStatusChange(record: MasterDataRecord) {
  pendingStatusRecord.value = record;
  nextStatus.value = !record.is_active;

  if (record.is_active) {
    confirmDialog.value = true;
    return;
  }

  void confirmStatusChange();
}

async function submitApi<T>(
  request: Parameters<typeof $fetch>[0],
  options?: Parameters<typeof $fetch>[1]
) {
  const response = await $fetch<ApiResponse<T>>(request, options);

  if (!response.ok) {
    throw response.error;
  }

  return response.data;
}

function apiErrorMessage(error: unknown) {
  const apiError = error as Partial<ApiError>;

  if (typeof apiError.message === 'string') {
    return apiError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected master data error.';
}

async function submit() {
  submitting.value = true;
  serverError.value = '';

  const body = (config.fields as readonly MasterDataFieldConfig[]).reduce<FormState>(
    (payload: FormState, field: MasterDataFieldConfig) => {
      payload[field.key] = form[field.key];
      return payload;
    },
    {}
  );

  try {
    if (editingRecord.value) {
      await submitApi<MasterDataRecord>(`${config.apiPath}/${editingRecord.value.id}`, {
        method: 'PUT',
        body
      });
      pushToast({ type: 'success', title: 'Master data updated', message: config.title });
    } else {
      await submitApi<MasterDataRecord>(config.apiPath, {
        method: 'POST',
        body
      });
      pushToast({ type: 'success', title: 'Master data created', message: config.title });
    }

    dialog.value = false;
    await refresh();
  } catch (submitError) {
    serverError.value = apiErrorMessage(submitError);
  } finally {
    submitting.value = false;
  }
}

async function confirmStatusChange() {
  if (!pendingStatusRecord.value) return;

  submitting.value = true;
  serverError.value = '';

  try {
    await submitApi<MasterDataRecord>(`${config.apiPath}/${pendingStatusRecord.value.id}/status`, {
      method: 'PATCH',
      body: { is_active: nextStatus.value }
    });
    pushToast({
      type: 'success',
      title: nextStatus.value ? 'Master data activated' : 'Master data deactivated',
      message: config.title
    });
    confirmDialog.value = false;
    await refresh();
  } catch (statusError) {
    serverError.value = apiErrorMessage(statusError);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <div class="mb-1 d-flex flex-wrap align-center ga-2">
          <VBtn density="comfortable" icon="mdi-arrow-left" to="/dashboard" variant="text" />
          <h1 class="text-h4 font-weight-bold text-text-primary">{{ config.title }}</h1>
        </div>
        <p class="text-text-secondary">{{ config.description }}</p>
      </div>
      <VSpacer />
      <VBtn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add data</VBtn>
    </div>

    <VAlert v-if="config.disclaimer" class="mb-4" color="info" variant="tonal">
      {{ config.disclaimer }}
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="mb-4 d-flex flex-wrap align-center ga-3">
          <VTextField
            v-model="search"
            clearable
            density="compact"
            hide-details
            label="Search"
            max-width="360"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <VSelect
            v-model="activeFilter"
            density="compact"
            hide-details
            item-title="title"
            item-value="value"
            :items="activeFilterOptions"
            label="Status"
            max-width="180"
            variant="outlined"
          />
          <VSpacer />
          <VBtn :loading="pending" prepend-icon="mdi-refresh" variant="text" @click="refresh()">
            Refresh
          </VBtn>
        </div>

        <VAlert
          v-if="error"
          class="mb-4"
          color="error"
          title="Unable to load master data"
          variant="tonal"
        >
          {{ error.message }}
        </VAlert>

        <VSkeletonLoader v-if="pending && !hasRows" type="table" />

        <VAlert
          v-else-if="!hasRows && !error"
          color="info"
          icon="mdi-database-search-outline"
          title="No master data records found"
          variant="tonal"
        >
          Adjust the filter or add the first record for this master data module.
        </VAlert>

        <div v-else class="overflow-x-auto">
          <VTable class="min-w-[960px]" density="comfortable">
            <thead>
              <tr>
                <th v-for="column in displayColumns" :key="column.key" class="text-left">
                  {{ column.label }}
                </th>
                <th class="text-left">Active</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td v-for="column in displayColumns" :key="column.key">
                  <template v-if="column.type === 'relation'">
                    {{ relationLabel(column.relation, row[column.key]) }}
                  </template>
                  <template v-else-if="column.type === 'route'">
                    {{ routeLabel(row) }}
                  </template>
                  <template v-else-if="column.type === 'facilities'">
                    <div class="flex flex-wrap gap-1">
                      <VChip
                        v-if="row.has_fuel_service"
                        color="success"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                      >
                        Fuel
                      </VChip>
                      <VChip
                        v-if="row.has_handling_service"
                        color="info"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                      >
                        Handling
                      </VChip>
                      <VChip
                        v-if="row.has_parking_service"
                        color="secondary"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                      >
                        Parking
                      </VChip>
                    </div>
                  </template>
                  <template v-else-if="column.type === 'status'">
                    <VChip :color="chipColor(row[column.key])" size="small" variant="tonal">
                      {{ readable(row[column.key]) }}
                    </VChip>
                  </template>
                  <template v-else-if="column.type === 'expiry'">
                    <VChip
                      :color="chipColor(dateStatus(row[column.key]))"
                      size="small"
                      variant="tonal"
                    >
                      {{ dateStatus(row[column.key]) }}
                    </VChip>
                    <div class="text-xs text-text-secondary">{{ readable(row[column.key]) }}</div>
                  </template>
                  <template v-else-if="column.type === 'rate_status'">
                    <VChip :color="chipColor(effectiveStatus(row))" size="small" variant="tonal">
                      {{ effectiveStatus(row) }}
                    </VChip>
                  </template>
                  <template v-else-if="column.type === 'money'">
                    {{ formatInteger(row[column.key]) }}
                  </template>
                  <template v-else-if="column.type === 'boolean'">
                    <VChip
                      :color="row[column.key] ? 'success' : 'default'"
                      size="small"
                      variant="tonal"
                    >
                      {{ booleanChip(row[column.key]) }}
                    </VChip>
                  </template>
                  <template v-else-if="column.type === 'mock_badge'">
                    <VChip color="warning" size="small" variant="tonal">Mock Integration</VChip>
                  </template>
                  <template v-else>
                    {{ readable(row[column.key]) }}
                  </template>
                </td>
                <td>
                  <VChip
                    :color="row.is_active ? 'success' : 'default'"
                    size="small"
                    variant="tonal"
                  >
                    {{ row.is_active ? 'Active' : 'Inactive' }}
                  </VChip>
                </td>
                <td class="text-right">
                  <VBtn
                    v-if="detailPath(row)"
                    aria-label="Open detail"
                    density="comfortable"
                    icon="mdi-open-in-new"
                    :to="detailPath(row) ?? undefined"
                    size="small"
                    variant="text"
                  />
                  <VBtn
                    aria-label="Edit"
                    density="comfortable"
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    @click="openEdit(row)"
                  />
                  <VBtn
                    :aria-label="row.is_active ? 'Deactivate' : 'Activate'"
                    density="comfortable"
                    :icon="
                      row.is_active ? 'mdi-toggle-switch-off-outline' : 'mdi-toggle-switch-outline'
                    "
                    size="small"
                    variant="text"
                    @click="requestStatusChange(row)"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>

    <VDialog v-model="dialog" max-width="900" persistent>
      <VCard>
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon icon="mdi-database-edit-outline" />
          {{ editingRecord ? 'Edit' : 'Add' }} {{ config.title }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
            {{ serverError }}
          </VAlert>

          <VForm @submit.prevent="submit">
            <VRow>
              <VCol
                v-for="field in config.fields"
                :key="field.key"
                cols="12"
                :md="field.formWidth === 'full' ? 12 : 6"
              >
                <VSwitch
                  v-if="field.type === 'boolean'"
                  v-model="form[field.key]"
                  color="primary"
                  density="comfortable"
                  hide-details
                  :label="field.label"
                />
                <VTextarea
                  v-else-if="field.type === 'textarea'"
                  v-model="form[field.key]"
                  auto-grow
                  density="compact"
                  :label="field.label"
                  :rules="requiredRules(field)"
                  variant="outlined"
                />
                <VSelect
                  v-else-if="field.type === 'select'"
                  v-model="form[field.key]"
                  density="compact"
                  :items="field.options ?? []"
                  :label="field.label"
                  :rules="requiredRules(field)"
                  variant="outlined"
                />
                <VAutocomplete
                  v-else-if="field.type === 'relation'"
                  v-model="form[field.key]"
                  clearable
                  density="compact"
                  item-title="title"
                  item-value="value"
                  :items="relationOptions(field)"
                  :label="field.label"
                  :rules="requiredRules(field)"
                  variant="outlined"
                >
                  <template #item="{ props: itemProps, item }">
                    <VListItem v-bind="itemProps">
                      <template #append>
                        <VChip
                          v-if="!item.raw.isActive"
                          color="default"
                          size="x-small"
                          variant="tonal"
                        >
                          Inactive
                        </VChip>
                      </template>
                    </VListItem>
                  </template>
                </VAutocomplete>
                <VTextField
                  v-else
                  v-model="form[field.key]"
                  density="compact"
                  :label="field.label"
                  :rules="requiredRules(field)"
                  :type="
                    field.type === 'number' || field.type === 'money'
                      ? 'number'
                      : field.type === 'date'
                        ? 'date'
                        : field.type === 'email'
                          ? 'email'
                          : 'text'
                  "
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="dialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :loading="submitting"
            prepend-icon="mdi-content-save"
            @click="submit"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="confirmDialog" max-width="460">
      <VCard>
        <VCardTitle>Deactivate master data?</VCardTitle>
        <VCardText>
          Existing records can still read this master data, but it will no longer appear for new
          selections.
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="confirmDialog = false">Cancel</VBtn>
          <VBtn color="error" :loading="submitting" @click="confirmStatusChange">Deactivate</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
