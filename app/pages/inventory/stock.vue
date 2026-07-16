<script setup lang="ts">
import type {
  InventorySerializedPartDto,
  InventoryStockDto,
  InventoryWarehouseDto
} from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { money, number, date, errorMessage } = useInventoryUi();
const search = ref('');
const warehouseId = ref('');
const lowStockOnly = ref(false);
const actionError = ref('');
const actionMessage = ref('');
const selected = ref<InventoryStockDto | null>(null);
const transfer = reactive({ toBinId: '', quantity: 1, serialIds: [] as string[], reason: '' });
const adjustment = reactive({ quantityDelta: 0, reason: '', sourceUnitCostMinor: 0 });

const { data, pending, error, refresh } = await useAsyncData('inventory-stock', () =>
  fetchApi<InventoryStockDto[]>('/api/inventory/stock')
);
const { data: warehouses } = await useAsyncData('inventory-stock-warehouses', () =>
  fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: serialized } = await useAsyncData('inventory-stock-serialized', () =>
  fetchApi<InventorySerializedPartDto[]>('/api/inventory/repairables')
);

const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter(
    (row) =>
      (!query ||
        [row.partNumber, row.partName, row.binCode, row.lotNumber, row.stationCode].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(query)
        )) &&
      (!warehouseId.value || row.warehouseId === warehouseId.value) &&
      (!lowStockOnly.value || row.lowStock)
  );
});

const warehouseOptions = computed(() =>
  (warehouses.value ?? []).map((item) => ({
    title: `${item.warehouseCode} · ${item.stationCode}`,
    value: item.id
  }))
);
const destinationBins = computed(() =>
  (warehouses.value ?? []).flatMap((warehouse) =>
    warehouse.bins
      .filter((bin) => bin.id !== selected.value?.binId)
      .map((bin) => ({
        title: `${warehouse.warehouseCode} / ${bin.binCode} · ${bin.binType}`,
        value: bin.id
      }))
  )
);
const serialOptions = computed(() =>
  (serialized.value ?? [])
    .filter(
      (serial) => serial.partId === selected.value?.partId && serial.binId === selected.value?.binId
    )
    .map((serial) => ({ title: serial.serialNumber, value: serial.id }))
);

function selectTransfer(row: InventoryStockDto) {
  selected.value = row;
  transfer.toBinId = '';
  transfer.quantity = 1;
  transfer.serialIds = [];
  transfer.reason = '';
}

function selectAdjustment(row: InventoryStockDto) {
  selected.value = row;
  adjustment.quantityDelta = 0;
  adjustment.reason = '';
  adjustment.sourceUnitCostMinor = 0;
}

async function postTransfer() {
  if (!selected.value) return;
  actionError.value = '';
  await fetchApi('/api/inventory/transfers', {
    method: 'POST',
    body: {
      partId: selected.value.partId,
      fromBinId: selected.value.binId,
      toBinId: transfer.toBinId,
      quantity: transfer.quantity,
      lotId: selected.value.lotId,
      serialIds: transfer.serialIds,
      reason: transfer.reason
    }
  }).catch((value) => {
    actionError.value = errorMessage(value, 'Transfer failed');
    throw value;
  });
  actionMessage.value = 'Inventory transfer posted.';
  await refresh();
}

async function postAdjustment() {
  if (!selected.value) return;
  actionError.value = '';
  await fetchApi('/api/inventory/adjustments', {
    method: 'POST',
    body: {
      partId: selected.value.partId,
      binId: selected.value.binId,
      quantityDelta: adjustment.quantityDelta,
      sourceUnitCostMinor: adjustment.sourceUnitCostMinor,
      currencyId: 'cur-idr',
      exchangeRateToIdrMicros: 1_000_000,
      reason: adjustment.reason
    }
  }).catch((value) => {
    actionError.value = errorMessage(value, 'Adjustment failed');
    throw value;
  });
  actionMessage.value = 'Stock adjustment posted.';
  await refresh();
}
</script>

<template>
  <InventoryShell title="Stock Availability">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh stock"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{ actionError || 'Stock availability could not be loaded.' }}
    </VAlert>
    <VAlert v-if="actionMessage" closable class="mb-4" type="success" variant="tonal">
      {{ actionMessage }}
    </VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="search"
              clearable
              density="comfortable"
              hide-details
              label="Search part, lot, bin, or station"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="warehouseId"
              clearable
              density="comfortable"
              hide-details
              :items="warehouseOptions"
              label="Warehouse"
              variant="outlined"
            />
          </VCol>
          <VCol class="d-flex align-center" cols="12" md="2">
            <VSwitch v-model="lowStockOnly" color="warning" hide-details label="Low stock" />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard border>
      <VDataTable
        :headers="[
          { title: 'Part', key: 'partNumber' },
          { title: 'Location', key: 'warehouseCode' },
          { title: 'Lot / Expiry', key: 'lotNumber' },
          { title: 'Condition', key: 'condition' },
          { title: 'On Hand', key: 'onHandQuantity', align: 'end' },
          { title: 'Available', key: 'availableQuantity', align: 'end' },
          { title: 'FIFO Value', key: 'fifoValueIdr', align: 'end' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="rows"
        :loading="pending"
      >
        <template #[`item.partNumber`]="{ item }">
          <div class="py-2">
            <div class="font-weight-bold">{{ item.partNumber }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.partName }}</div>
          </div>
        </template>
        <template #[`item.warehouseCode`]="{ item }">
          <div>{{ item.stationCode }} / {{ item.warehouseCode }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.binCode }} · {{ item.binType }}
          </div>
        </template>
        <template #[`item.lotNumber`]="{ item }">
          <div>{{ item.lotNumber ?? '-' }}</div>
          <div
            v-if="item.expiresAt"
            class="text-caption"
            :class="item.availableQuantity ? '' : 'text-error'"
          >
            {{ date(item.expiresAt) }}
          </div>
        </template>
        <template #[`item.condition`]="{ item }">
          <DsStatusBadge :value="item.condition" />
        </template>
        <template #[`item.onHandQuantity`]="{ item }">
          {{ number(item.onHandQuantity) }} {{ item.unitOfMeasure }}
        </template>
        <template #[`item.availableQuantity`]="{ item }">
          <span :class="item.lowStock ? 'text-warning font-weight-bold' : 'font-weight-bold'">
            {{ number(item.availableQuantity) }}
          </span>
        </template>
        <template #[`item.fifoValueIdr`]="{ item }">
          {{ can('inventory.valuation.read').allowed ? money(item.fifoValueIdr) : 'Restricted' }}
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end ga-1">
            <DsConfirmIconButton
              v-if="can('inventory.transfer').allowed && item.onHandQuantity > 0"
              :action="postTransfer"
              :confirm-disabled="
                !transfer.toBinId ||
                  transfer.quantity <= 0 ||
                  transfer.quantity > (selected?.onHandQuantity ?? 0) ||
                  !transfer.reason.trim() ||
                  (selected?.trackingType === 'SERIAL' &&
                    transfer.serialIds.length !== transfer.quantity)
              "
              confirm-icon="mdi-swap-horizontal"
              confirm-text="Post transfer"
              icon="mdi-swap-horizontal"
              max-width="560"
              persistent
              title="Post inventory transfer"
              tone="warning"
              tooltip="Transfer stock"
              variant="text"
              @click="selectTransfer(item)"
            >
              <div class="mb-4 text-body-2">
                {{ selected?.partNumber }} from {{ selected?.warehouseCode }} /
                {{ selected?.binCode }}
              </div>
              <VSelect
                v-model="transfer.toBinId"
                class="mb-3"
                density="comfortable"
                :items="destinationBins"
                label="Destination bin"
                variant="outlined"
              />
              <VTextField
                v-model.number="transfer.quantity"
                class="mb-3"
                density="comfortable"
                label="Quantity"
                min="1"
                type="number"
                variant="outlined"
              />
              <VSelect
                v-if="selected?.trackingType === 'SERIAL'"
                v-model="transfer.serialIds"
                class="mb-3"
                chips
                density="comfortable"
                :items="serialOptions"
                label="Serial numbers"
                multiple
                variant="outlined"
              />
              <VTextarea v-model="transfer.reason" label="Reason" rows="2" variant="outlined" />
            </DsConfirmIconButton>

            <DsConfirmIconButton
              v-if="can('inventory.adjust').allowed && item.trackingType === 'QUANTITY'"
              :action="postAdjustment"
              :confirm-disabled="adjustment.quantityDelta === 0 || !adjustment.reason.trim()"
              confirm-icon="mdi-scale-balance"
              confirm-text="Post adjustment"
              icon="mdi-scale-balance"
              max-width="520"
              persistent
              title="Post stock adjustment"
              tone="danger"
              tooltip="Adjust stock"
              variant="text"
              @click="selectAdjustment(item)"
            >
              <div class="mb-4 text-body-2">
                {{ selected?.partNumber }} · {{ selected?.binCode }}
              </div>
              <VTextField
                v-model.number="adjustment.quantityDelta"
                class="mb-3"
                density="comfortable"
                label="Quantity variance"
                type="number"
                variant="outlined"
              />
              <VTextField
                v-if="adjustment.quantityDelta > 0"
                v-model.number="adjustment.sourceUnitCostMinor"
                class="mb-3"
                density="comfortable"
                label="Unit cost IDR"
                min="0"
                type="number"
                variant="outlined"
              />
              <VTextarea v-model="adjustment.reason" label="Reason" rows="2" variant="outlined" />
            </DsConfirmIconButton>
          </div>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">No stock matches the current filters.</div>
        </template>
      </VDataTable>
    </VCard>
  </InventoryShell>
</template>
