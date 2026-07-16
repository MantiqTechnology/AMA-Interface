<script setup lang="ts">
import type {
  InventoryCountDto,
  InventoryMovementDto,
  InventoryStockDto,
  InventoryWarehouseDto
} from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { money, number, dateTime, errorMessage } = useInventoryUi();
const tab = ref<'movements' | 'counts'>('movements');
const search = ref('');
const countDialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const countForm = reactive({
  warehouseId: '',
  binId: '',
  reason: '',
  quantities: {} as Record<string, number>
});

const { data, pending, error, refresh } = await useAsyncData('inventory-movements', () =>
  fetchApi<InventoryMovementDto[]>('/api/inventory/movements')
);
const { data: counts, refresh: refreshCounts } = await useAsyncData('inventory-counts', () =>
  fetchApi<InventoryCountDto[]>('/api/inventory/counts')
);
const { data: warehouses } = await useAsyncData('inventory-count-warehouses', () =>
  fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: stock } = await useAsyncData('inventory-count-stock', () =>
  fetchApi<InventoryStockDto[]>('/api/inventory/stock')
);

const movementRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((item) =>
    [item.movementNumber, item.movementType, item.reason, item.status].some((value) =>
      value.toLowerCase().includes(query)
    )
  );
});
const binOptions = computed(
  () =>
    (warehouses.value ?? [])
      .find((warehouse) => warehouse.id === countForm.warehouseId)
      ?.bins.map((bin) => ({ title: `${bin.binCode} · ${bin.binType}`, value: bin.id })) ?? []
);
const countStock = computed(() =>
  (stock.value ?? []).filter(
    (item) =>
      item.warehouseId === countForm.warehouseId &&
      (!countForm.binId || item.binId === countForm.binId) &&
      !item.id.startsWith('reorder:')
  )
);

watch(countStock, (rows) => {
  countForm.quantities = Object.fromEntries(rows.map((row) => [row.id, row.onHandQuantity]));
});

function openCount() {
  Object.assign(countForm, { warehouseId: '', binId: '', reason: '', quantities: {} });
  actionError.value = '';
  countDialog.value = true;
}

async function createCount() {
  saving.value = true;
  actionError.value = '';
  try {
    const created = await fetchApi<InventoryCountDto>('/api/inventory/counts', {
      method: 'POST',
      body: {
        warehouseId: countForm.warehouseId,
        binId: countForm.binId || null,
        reason: countForm.reason
      }
    });
    if (created.lines.length) {
      await fetchApi(`/api/inventory/counts/${created.id}/record`, {
        method: 'POST',
        body: {
          lines: created.lines.map((line) => ({
            stockBalanceId: line.stockBalanceId,
            countedQuantity: countForm.quantities[line.stockBalanceId] ?? line.expectedQuantity
          }))
        }
      });
    }
    countDialog.value = false;
    tab.value = 'counts';
    await refreshCounts();
  } catch (value) {
    actionError.value = errorMessage(value, 'Cycle count could not be recorded');
  } finally {
    saving.value = false;
  }
}

async function postCount(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/counts/${id}/post`, { method: 'POST' }).catch((value) => {
    actionError.value = errorMessage(value, 'Cycle count posting failed');
    throw value;
  });
  await Promise.all([refreshCounts(), refresh()]);
}

async function reverseMovement(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/movements/${id}/reverse`, { method: 'POST' }).catch((value) => {
    actionError.value = errorMessage(value, 'Movement reversal failed');
    throw value;
  });
  await refresh();
}
</script>

<template>
  <InventoryShell title="Movements & Cycle Counts">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.count').allowed"
        color="primary"
        icon="mdi-clipboard-check-outline"
        tooltip="Start cycle count"
        variant="flat"
        @click="openCount"
      />
      <DsTooltipIconButton
        href="/api/inventory/reports/movements.csv"
        icon="mdi-download-outline"
        tooltip="Export movement CSV"
        variant="text"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh movement audit"
        variant="text"
        @click="refresh"
      />
    </template>
    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{
        actionError || 'Movement audit could not be loaded.'
      }}
    </VAlert>

    <VBtnToggle v-model="tab" class="mb-4" color="primary" mandatory variant="outlined">
      <VBtn prepend-icon="mdi-swap-horizontal" text="Movements" value="movements" />
      <VBtn prepend-icon="mdi-clipboard-check-outline" text="Cycle counts" value="counts" />
    </VBtnToggle>

    <template v-if="tab === 'movements'">
      <VTextField
        v-model="search"
        class="mb-4"
        clearable
        density="comfortable"
        hide-details
        label="Search movement audit"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
      <VCard border>
        <VDataTable
          :headers="[
            { title: 'Movement', key: 'movementNumber' },
            { title: 'Type', key: 'movementType' },
            { title: 'Station', key: 'stationId' },
            { title: 'Reason', key: 'reason' },
            { title: 'Value', key: 'totalBaseValueIdr', align: 'end' },
            { title: 'Status', key: 'status' },
            { title: 'Created', key: 'createdAt' },
            { title: '', key: 'actions', sortable: false, align: 'end' }
          ]"
          :items="movementRows"
          :loading="pending"
        >
          <template #[`item.movementNumber`]="{ item }">
            <span class="font-weight-bold text-no-wrap">{{ item.movementNumber }}</span>
          </template>
          <template #[`item.movementType`]="{ item }">
            <DsStatusBadge :value="item.movementType" />
          </template>
          <template #[`item.totalBaseValueIdr`]="{ item }">
            {{
              can('inventory.valuation.read').allowed ? money(item.totalBaseValueIdr) : 'Restricted'
            }}
          </template>
          <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
          <template #[`item.createdAt`]="{ item }">{{ dateTime(item.createdAt) }}</template>
          <template #[`item.actions`]="{ item }">
            <DsConfirmIconButton
              v-if="
                can('inventory.adjust').allowed &&
                  item.status === 'POSTED' &&
                  ['RECEIPT', 'ISSUE', 'ADJUSTMENT_GAIN', 'ADJUSTMENT_LOSS'].includes(
                    item.movementType
                  )
              "
              :action="() => reverseMovement(item.id)"
              confirm-icon="mdi-undo-variant"
              confirm-text="Reverse movement"
              icon="mdi-undo-variant"
              message="A linked reversal will be posted; the original movement remains in the audit trail."
              title="Reverse inventory movement"
              tone="danger"
              tooltip="Reverse movement"
              variant="text"
            />
          </template>
          <template #no-data>
            <div class="py-10 text-medium-emphasis">No movements found.</div>
          </template>
        </VDataTable>
      </VCard>
    </template>

    <VCard v-else border>
      <VDataTable
        :headers="[
          { title: 'Count', key: 'countNumber' },
          { title: 'Warehouse', key: 'warehouseCode' },
          { title: 'Reason', key: 'reason' },
          { title: 'Status', key: 'status' },
          { title: 'Created', key: 'createdAt' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="counts ?? []"
      >
        <template #[`item.countNumber`]="{ item }">
          <span class="font-weight-bold">{{ item.countNumber }}</span>
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.createdAt`]="{ item }">{{ dateTime(item.createdAt) }}</template>
        <template #[`item.actions`]="{ item }">
          <DsConfirmIconButton
            v-if="can('inventory.count').allowed && item.status === 'COUNTED'"
            :action="() => postCount(item.id)"
            confirm-icon="mdi-check-decagram-outline"
            confirm-text="Post variances"
            icon="mdi-check-decagram-outline"
            message="Every variance will create an immutable adjustment movement."
            title="Post cycle count"
            tone="warning"
            tooltip="Post cycle count"
            variant="text"
          />
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">No cycle counts found.</div>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="countDialog" max-width="760" persistent scrollable>
      <VCard>
        <VCardTitle>Record cycle count</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="6">
              <VSelect
                v-model="countForm.warehouseId"
                item-title="warehouseCode"
                item-value="id"
                :items="warehouses ?? []"
                label="Warehouse"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="countForm.binId"
                clearable
                :items="binOptions"
                label="Bin (all when empty)"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="countForm.reason"
                label="Count reason"
                rows="2"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div
            v-for="row in countStock"
            :key="row.id"
            class="mb-3 d-flex flex-wrap align-center ga-3"
          >
            <div class="min-w-0 flex-grow-1">
              <div class="font-weight-bold">{{ row.partNumber }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ row.binCode }} · {{ row.lotNumber ?? 'No lot' }} · Book
                {{ number(row.onHandQuantity) }}
              </div>
            </div>
            <VTextField
              v-model.number="countForm.quantities[row.id]"
              density="comfortable"
              hide-details
              label="Counted"
              min="0"
              style="max-width: 150px"
              type="number"
              variant="outlined"
            />
          </div>
          <VAlert v-if="countForm.warehouseId && !countStock.length" color="info" variant="tonal">
            No stock balances in the selected location.
          </VAlert>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer /><VBtn
            :disabled="saving"
            text="Cancel"
            variant="text"
            @click="countDialog = false"
          /><VBtn
            :disabled="!countStock.length || !countForm.reason.trim()"
            :loading="saving"
            prepend-icon="mdi-content-save-check-outline"
            text="Record count"
            @click="createCount"
          />
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
