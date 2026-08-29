<script setup lang="ts">
import type {
  GoodsReceiptDto,
  InventoryPartDto,
  InventoryWarehouseDto,
  PurchaseOrderDto
} from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { can } = useAuthorization();
const { money, number, dateTime, errorMessage } = useInventoryUi();
const dialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const form = reactive({
  purchaseOrderId: '',
  warehouseId: '',
  receivedAt: new Date().toISOString().slice(0, 16),
  documentReference: '',
  lines: [] as Array<{
    purchaseOrderLineId: string;
    partId: string;
    partNumber: string;
    trackingType: string;
    certificateRequired: boolean;
    shelfLifeDays: number | null;
    maximumQuantity: number;
    quantity: number;
    binId: string;
    lotNumber: string;
    manufacturedAt: string;
    expiresAt: string;
    certificateReference: string;
    serialNumbersText: string;
  }>
});

const { data, pending, error, refresh } = await useAsyncData('inventory-receipts', () =>
  fetchApi<GoodsReceiptDto[]>('/api/inventory/receipts')
);
const { data: orders, refresh: refreshOrders } = await useAsyncData(
  'inventory-receipt-orders',
  () => fetchApi<PurchaseOrderDto[]>('/api/inventory/purchase-orders')
);
const { data: warehouses, refresh: refreshStock } = await useAsyncData(
  'inventory-receipt-warehouses',
  () => fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: parts } = await useAsyncData('inventory-receipt-parts', () =>
  fetchApi<InventoryPartDto[]>('/api/inventory/parts')
);

const orderOptions = computed(() =>
  (orders.value ?? [])
    .filter((order) => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status))
    .map((order) => ({ title: `${order.orderNumber} · ${order.vendorName}`, value: order.id }))
);
const binOptions = computed(
  () =>
    (warehouses.value ?? [])
      .find((warehouse) => warehouse.id === form.warehouseId)
      ?.bins.map((bin) => ({ title: `${bin.binCode} · ${bin.binType}`, value: bin.id })) ?? []
);

watch(
  () => form.purchaseOrderId,
  (id) => {
    const order = (orders.value ?? []).find((item) => item.id === id);
    form.lines =
      order?.lines
        .filter((line) => line.quantity - line.receivedQuantity > 0)
        .map((line) => {
          const part = (parts.value ?? []).find((item) => item.id === line.partId);
          const maximumQuantity = line.quantity - line.receivedQuantity;
          return {
            purchaseOrderLineId: line.id,
            partId: line.partId,
            partNumber: line.partNumber,
            trackingType: part?.trackingType ?? 'QUANTITY',
            certificateRequired: part?.certificateRequired ?? false,
            shelfLifeDays: part?.shelfLifeDays ?? null,
            maximumQuantity,
            quantity: maximumQuantity,
            binId: '',
            lotNumber: '',
            manufacturedAt: '',
            expiresAt: defaultExpiryDate(part?.shelfLifeDays ?? null),
            certificateReference: '',
            serialNumbersText: ''
          };
        }) ?? [];
  }
);

watch(
  () => form.receivedAt,
  () => {
    for (const line of form.lines) {
      if (line.expiresAt || !line.shelfLifeDays) continue;
      line.expiresAt = defaultExpiryDate(line.shelfLifeDays);
    }
  }
);

function defaultExpiryDate(shelfLifeDays: number | null | undefined) {
  if (!shelfLifeDays || !form.receivedAt) return '';
  const received = new Date(form.receivedAt);
  if (Number.isNaN(received.getTime())) return '';
  received.setDate(received.getDate() + shelfLifeDays);
  return received.toISOString().slice(0, 10);
}

function openCreate() {
  Object.assign(form, {
    purchaseOrderId: orderOptions.value[0]?.value ?? '',
    warehouseId: '',
    receivedAt: new Date().toISOString().slice(0, 16),
    documentReference: '',
    lines: []
  });
  actionError.value = '';
  dialog.value = true;
}

async function postReceipt() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/receipts', {
      method: 'POST',
      body: {
        purchaseOrderId: form.purchaseOrderId,
        warehouseId: form.warehouseId,
        receivedAt: new Date(form.receivedAt).toISOString(),
        documentReference: form.documentReference,
        lines: form.lines.map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId,
          binId: line.binId,
          quantity: line.quantity,
          lotNumber: line.lotNumber || null,
          manufacturedAt: line.manufacturedAt || null,
          expiresAt: line.expiresAt || null,
          certificateReference: line.certificateReference || null,
          serialNumbers: line.serialNumbersText
            .split(/[\n,]/u)
            .map((value) => value.trim())
            .filter(Boolean)
        }))
      }
    });
    dialog.value = false;
    await Promise.all([refresh(), refreshOrders(), refreshStock()]);
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Penerimaan barang tidak dapat diposting. Periksa order, gudang, dan line.'
    );
  } finally {
    saving.value = false;
  }
}

async function reverseReceipt(receipt: GoodsReceiptDto) {
  actionError.value = '';
  await fetchApi(`/api/inventory/movements/${receipt.movementId}/reverse`, {
    method: 'POST'
  }).catch((value) => {
    actionError.value = errorMessage(
      value,
      'Penerimaan tidak dapat dibalik. Pastikan layer biaya belum digunakan.'
    );
    throw value;
  });
  await Promise.all([refresh(), refreshOrders()]);
}
</script>

<template>
  <InventoryShell title="Penerimaan Barang">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.receive').allowed"
        color="primary"
        :disabled="!orderOptions.length"
        icon="mdi-plus"
        tooltip="Posting penerimaan barang"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui penerimaan"
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
      {{ actionError || 'Penerimaan barang tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
    </VAlert>
    <InventoryPanel title="Daftar Penerimaan Barang">
      <VDataTable
        :headers="[
          { title: 'Penerimaan', key: 'receiptNumber' },
          { title: 'Purchase Order', key: 'orderNumber' },
          { title: 'Dokumen', key: 'documentReference' },
          { title: 'Diterima', key: 'receivedAt' },
          { title: 'Nilai', key: 'totalBaseValueIdr', align: 'end' },
          { title: 'Status', key: 'status' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="data ?? []"
        :loading="pending"
      >
        <template #[`item.receiptNumber`]="{ item }">
          <span class="font-weight-bold text-no-wrap">{{ item.receiptNumber }}</span>
        </template>
        <template #[`item.receivedAt`]="{ item }">{{ dateTime(item.receivedAt) }}</template>
        <template #[`item.totalBaseValueIdr`]="{ item }">
          {{ can('inventory.valuation.read').allowed ? money(item.totalBaseValueIdr) : 'Terbatas' }}
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <InventoryTableActions>
            <DsConfirmIconButton
              v-if="can('inventory.adjust').allowed && item.status === 'POSTED'"
              :action="() => reverseReceipt(item)"
              confirm-icon="mdi-undo-variant"
              confirm-text="Balikkan penerimaan"
              icon="mdi-undo-variant"
              message="Reversal hanya bisa dilakukan saat semua layer biaya penerimaan belum digunakan."
              title="Balikkan penerimaan barang"
              tone="danger"
              tooltip="Balikkan penerimaan"
              variant="text"
            />
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Belum ada penerimaan barang yang diposting.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog v-model="dialog" max-width="900" persistent scrollable>
      <VCard>
        <VCardTitle>Posting Penerimaan Barang</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.purchaseOrderId"
                :items="orderOptions"
                label="Purchase order"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.warehouseId"
                item-title="warehouseCode"
                item-value="id"
                :items="warehouses ?? []"
                label="Gudang penerima"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.receivedAt"
                label="Waktu diterima"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.documentReference"
                label="Referensi dokumen penerimaan"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div v-for="line in form.lines" :key="line.purchaseOrderLineId" class="mb-5">
            <div class="mb-2 d-flex align-center">
              <div class="text-subtitle-2 font-weight-bold">{{ line.partNumber }}</div>
              <VSpacer />
              <VChip v-if="line.shelfLifeDays" class="me-2" size="small" variant="tonal">
                Shelf life {{ number(line.shelfLifeDays, 0) }} hari
              </VChip>
              <VChip size="small" variant="tonal">{{ line.trackingType }}</VChip>
            </div>
            <VRow dense>
              <VCol cols="12" md="3">
                <VTextField
                  v-model.number="line.quantity"
                  :hint="`Outstanding ${number(line.maximumQuantity)}`"
                  label="Jumlah"
                  :max="line.maximumQuantity"
                  min="1"
                  persistent-hint
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="line.binId"
                  :items="binOptions"
                  label="Bin tujuan"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="5">
                <VTextField v-model="line.lotNumber" label="Nomor lot" variant="outlined" />
              </VCol>
              <VCol v-if="line.trackingType === 'SERIAL'" cols="12">
                <VTextarea
                  v-model="line.serialNumbersText"
                  hint="Satu nomor seri per baris atau dipisah koma"
                  label="Nomor seri"
                  persistent-hint
                  rows="2"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="4">
                <VDateInput
                  v-model="line.manufacturedAt"
                  prepend-icon=""
                  prepend-inner-icon="mdi-calendar"
                  label="Tanggal produksi"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="4">
                <VDateInput
                  v-model="line.expiresAt"
                  prepend-icon=""
                  prepend-inner-icon="mdi-calendar"
                  :hint="
                    line.shelfLifeDays
                      ? `Default countdown mulai dari tanggal diterima + ${number(line.shelfLifeDays, 0)} hari`
                      : undefined
                  "
                  label="Tanggal expiry"
                  persistent-hint
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.certificateRequired" cols="12" md="4">
                <VTextField
                  v-model="line.certificateReference"
                  label="Referensi sertifikat"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.certificateRequired" class="d-flex align-center" cols="12" md="4">
                <VChip
                  color="warning"
                  prepend-icon="mdi-certificate-outline"
                  size="small"
                  variant="tonal"
                >
                  Sertifikat part wajib diverifikasi
                </VChip>
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-icon="mdi-package-down"
          submit-text="Posting penerimaan"
          @cancel="dialog = false"
          @submit="postReceipt"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
