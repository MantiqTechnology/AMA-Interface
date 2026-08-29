<script setup lang="ts">
import type {
  InventoryCountDto,
  InventoryMovementDto,
  InventoryStockDto,
  InventoryWarehouseDto
} from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

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
    actionError.value = errorMessage(
      value,
      'Cycle count tidak dapat direkam. Periksa gudang, bin, dan alasan.'
    );
  } finally {
    saving.value = false;
  }
}

async function postCount(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/counts/${id}/post`, { method: 'POST' }).catch((value) => {
    actionError.value = errorMessage(
      value,
      'Cycle count tidak dapat diposting. Perbarui data lalu coba lagi.'
    );
    throw value;
  });
  await Promise.all([refreshCounts(), refresh()]);
}

async function reverseMovement(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/movements/${id}/reverse`, { method: 'POST' }).catch((value) => {
    actionError.value = errorMessage(
      value,
      'Pergerakan tidak dapat dibalik. Pastikan reversal masih diperbolehkan.'
    );
    throw value;
  });
  await refresh();
}
</script>

<template>
  <InventoryShell title="Pergerakan & Cycle Count">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.count').allowed"
        color="primary"
        icon="mdi-clipboard-check-outline"
        tooltip="Mulai cycle count"
        variant="flat"
        @click="openCount"
      />
      <DsTooltipIconButton
        href="/api/inventory/reports/movements.csv"
        icon="mdi-download-outline"
        tooltip="Export CSV pergerakan"
        variant="text"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui audit pergerakan"
        variant="text"
        @click="() => refresh()"
      />
    </template>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Audit pergerakan tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
    </VAlert>

    <VBtnToggle v-model="tab" class="mb-4" color="primary" mandatory variant="outlined">
      <VBtn prepend-icon="mdi-swap-horizontal" text="Pergerakan" value="movements" />
      <VBtn prepend-icon="mdi-clipboard-check-outline" text="Cycle count" value="counts" />
    </VBtnToggle>

    <template v-if="tab === 'movements'">
      <InventoryFilterBar label="Filter audit pergerakan">
        <VTextField
          v-model="search"
          clearable
          density="comfortable"
          hide-details
          label="Cari audit pergerakan"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </InventoryFilterBar>
      <InventoryPanel title="Audit Pergerakan">
        <VDataTable
          :headers="[
            { title: 'Pergerakan', key: 'movementNumber' },
            { title: 'Tipe', key: 'movementType' },
            { title: 'Station', key: 'stationId' },
            { title: 'Alasan', key: 'reason' },
            { title: 'Nilai', key: 'totalBaseValueIdr', align: 'end' },
            { title: 'Status', key: 'status' },
            { title: 'Dibuat', key: 'createdAt' },
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
              can('inventory.valuation.read').allowed ? money(item.totalBaseValueIdr) : 'Terbatas'
            }}
          </template>
          <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
          <template #[`item.createdAt`]="{ item }">{{ dateTime(item.createdAt) }}</template>
          <template #[`item.actions`]="{ item }">
            <InventoryTableActions>
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
                confirm-text="Balikkan pergerakan"
                icon="mdi-undo-variant"
                message="Reversal tertaut akan diposting; pergerakan asli tetap tersimpan di audit trail."
                title="Balikkan pergerakan inventory"
                tone="danger"
                tooltip="Balikkan pergerakan"
                variant="text"
              />
            </InventoryTableActions>
          </template>
          <template #no-data>
            <div class="py-10 text-medium-emphasis">Tidak ada pergerakan yang cocok.</div>
          </template>
        </VDataTable>
      </InventoryPanel>
    </template>

    <InventoryPanel v-else title="Cycle Count">
      <VDataTable
        :headers="[
          { title: 'Count', key: 'countNumber' },
          { title: 'Gudang', key: 'warehouseCode' },
          { title: 'Alasan', key: 'reason' },
          { title: 'Status', key: 'status' },
          { title: 'Dibuat', key: 'createdAt' },
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
          <InventoryTableActions>
            <DsConfirmIconButton
              v-if="can('inventory.count').allowed && item.status === 'COUNTED'"
              :action="() => postCount(item.id)"
              confirm-icon="mdi-check-decagram-outline"
              confirm-text="Posting variance"
              icon="mdi-check-decagram-outline"
              message="Setiap variance akan membuat pergerakan penyesuaian immutable."
              title="Posting cycle count"
              tone="warning"
              tooltip="Posting cycle count"
              variant="text"
            />
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Belum ada cycle count.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog v-model="countDialog" max-width="760" persistent scrollable>
      <VCard>
        <VCardTitle>Rekam Cycle Count</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="6">
              <VSelect
                v-model="countForm.warehouseId"
                item-title="warehouseCode"
                item-value="id"
                :items="warehouses ?? []"
                label="Gudang"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="countForm.binId"
                clearable
                :items="binOptions"
                label="Bin (semua jika kosong)"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="countForm.reason"
                label="Alasan count"
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
                {{ row.binCode }} · {{ row.lotNumber ?? 'Tanpa lot' }} · Book
                {{ number(row.onHandQuantity) }}
              </div>
            </div>
            <VTextField
              v-model.number="countForm.quantities[row.id]"
              density="comfortable"
              hide-details
              label="Terhitung"
              min="0"
              style="max-width: 150px"
              type="number"
              variant="outlined"
            />
          </div>
          <VAlert v-if="countForm.warehouseId && !countStock.length" color="info" variant="tonal">
            Tidak ada saldo stok di lokasi yang dipilih.
          </VAlert>
        </VCardText>
        <InventoryDialogActions
          :disabled="!countStock.length || !countForm.reason.trim()"
          :loading="saving"
          submit-icon="mdi-content-save-check-outline"
          submit-text="Rekam count"
          @cancel="countDialog = false"
          @submit="createCount"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
