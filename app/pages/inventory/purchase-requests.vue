<script setup lang="ts">
import type { InventoryPartDto, PurchaseRequestDto } from '#shared/features/inventory';
import type { StationOption } from '#shared/features/operations/stations';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { number, date, errorMessage } = useInventoryUi();
const dialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const search = ref('');
const form = reactive({
  stationId: '',
  requestReason: '',
  lines: [{ partId: '', quantity: 1, requiredAt: new Date().toISOString().slice(0, 10), note: '' }]
});

const { data, pending, error, refresh } = await useAsyncData('inventory-purchase-requests', () =>
  fetchApi<PurchaseRequestDto[]>('/api/inventory/purchase-requests')
);
const { data: parts } = await useAsyncData('inventory-pr-parts', () =>
  fetchApi<InventoryPartDto[]>('/api/inventory/parts')
);
const { data: stations } = await useAsyncData('inventory-pr-stations', () =>
  fetchApi<StationOption[]>('/api/master-data/stations/options')
);

const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((item) =>
    [item.requestNumber, item.stationCode, item.requestReason, item.status].some((value) =>
      value.toLowerCase().includes(query)
    )
  );
});

function openCreate() {
  Object.assign(form, {
    stationId: '',
    requestReason: '',
    lines: [
      { partId: '', quantity: 1, requiredAt: new Date().toISOString().slice(0, 10), note: '' }
    ]
  });
  actionError.value = '';
  dialog.value = true;
}

function addLine() {
  form.lines.push({
    partId: '',
    quantity: 1,
    requiredAt: new Date().toISOString().slice(0, 10),
    note: ''
  });
}

async function createRequest() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/purchase-requests', { method: 'POST', body: form });
    dialog.value = false;
    await refresh();
  } catch (value) {
    actionError.value = errorMessage(value, 'Purchase request could not be created');
  } finally {
    saving.value = false;
  }
}

async function submitRequest(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/purchase-requests/${id}/submit`, { method: 'POST' }).catch(
    (value) => {
      actionError.value = errorMessage(value, 'Purchase request could not be submitted');
      throw value;
    }
  );
  await refresh();
}
</script>

<template>
  <InventoryShell title="Purchase Requests">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.procurement.request').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Create purchase request"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh purchase requests"
        variant="text"
        @click="refresh"
      />
    </template>
    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{
        actionError || 'Purchase requests could not be loaded.'
      }}
    </VAlert>
    <VTextField
      v-model="search"
      class="mb-4"
      clearable
      density="comfortable"
      hide-details
      label="Search purchase requests"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
    />
    <VCard border>
      <VDataTable
        :headers="[
          { title: 'Request', key: 'requestNumber' },
          { title: 'Station', key: 'stationCode' },
          { title: 'Reason', key: 'requestReason' },
          { title: 'Lines', key: 'lines', sortable: false },
          { title: 'Status', key: 'status' },
          { title: 'Created', key: 'createdAt' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="rows"
        :loading="pending"
      >
        <template #[`item.requestNumber`]="{ item }">
          <span class="font-weight-bold text-no-wrap">{{ item.requestNumber }}</span>
        </template>
        <template #[`item.lines`]="{ item }">
          <div v-for="line in item.lines" :key="line.id" class="text-no-wrap text-caption">
            {{ line.partNumber }} · {{ number(line.quantity) }} · {{ date(line.requiredAt) }}
          </div>
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.createdAt`]="{ item }">{{ date(item.createdAt) }}</template>
        <template #[`item.actions`]="{ item }">
          <DsConfirmIconButton
            v-if="can('inventory.procurement.request').allowed && item.status === 'DRAFT'"
            :action="() => submitRequest(item.id)"
            confirm-icon="mdi-send-outline"
            confirm-text="Submit request"
            icon="mdi-send-outline"
            message="This request will become available for purchase-order conversion."
            title="Submit purchase request"
            tone="warning"
            tooltip="Submit purchase request"
            variant="text"
          />
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">No purchase requests found.</div>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="800" persistent>
      <VCard>
        <VCardTitle>Create purchase request</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
          </VAlert>
          <VSelect
            v-model="form.stationId"
            class="mb-3"
            item-title="stationCode"
            item-value="id"
            :items="stations ?? []"
            label="Station"
            variant="outlined"
          />
          <VTextarea
            v-model="form.requestReason"
            class="mb-3"
            label="Request reason"
            rows="2"
            variant="outlined"
          />
          <div class="mb-2 d-flex align-center">
            <div class="text-subtitle-2 font-weight-bold">Requested parts</div>
            <VSpacer /><DsTooltipIconButton
              icon="mdi-plus"
              tooltip="Add part line"
              size="small"
              variant="tonal"
              @click="addLine"
            />
          </div>
          <VRow v-for="(line, index) in form.lines" :key="index" dense>
            <VCol cols="12" md="4">
              <VSelect
                v-model="line.partId"
                item-title="partNumber"
                item-value="id"
                :items="parts ?? []"
                label="Part"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6" md="2">
              <VTextField
                v-model.number="line.quantity"
                label="Quantity"
                min="1"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6" md="3">
              <VTextField
                v-model="line.requiredAt"
                label="Required date"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="10" md="2">
              <VTextField v-model="line.note" label="Note" variant="outlined" />
            </VCol>
            <VCol class="d-flex align-center" cols="2" md="1">
              <DsTooltipIconButton
                :disabled="form.lines.length === 1"
                icon="mdi-delete-outline"
                tooltip="Remove line"
                variant="text"
                @click="form.lines.splice(index, 1)"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer /><VBtn
            :disabled="saving"
            text="Cancel"
            variant="text"
            @click="dialog = false"
          /><VBtn
            :loading="saving"
            prepend-icon="mdi-content-save-outline"
            text="Create request"
            @click="createRequest"
          />
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
