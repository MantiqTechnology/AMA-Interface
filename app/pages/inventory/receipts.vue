<script setup lang="ts">
import type {
  GoodsReceiptDto,
  InventoryPartDto,
  InventoryWarehouseDto,
  PurchaseOrderDto
} from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

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
            maximumQuantity,
            quantity: maximumQuantity,
            binId: '',
            lotNumber: '',
            manufacturedAt: '',
            expiresAt: '',
            certificateReference: '',
            serialNumbersText: ''
          };
        }) ?? [];
  }
);

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
    actionError.value = errorMessage(value, 'Goods receipt could not be posted');
  } finally {
    saving.value = false;
  }
}

async function reverseReceipt(receipt: GoodsReceiptDto) {
  actionError.value = '';
  await fetchApi(`/api/inventory/movements/${receipt.movementId}/reverse`, {
    method: 'POST'
  }).catch((value) => {
    actionError.value = errorMessage(value, 'Receipt reversal failed');
    throw value;
  });
  await Promise.all([refresh(), refreshOrders()]);
}
</script>

<template>
  <InventoryShell title="Goods Receipts">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.receive').allowed"
        color="primary"
        :disabled="!orderOptions.length"
        icon="mdi-plus"
        tooltip="Post goods receipt"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh receipts"
        variant="text"
        @click="refresh"
      />
    </template>
    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{
        actionError || 'Goods receipts could not be loaded.'
      }}
    </VAlert>
    <VCard border>
      <VDataTable
        :headers="[
          { title: 'Receipt', key: 'receiptNumber' },
          { title: 'Purchase Order', key: 'orderNumber' },
          { title: 'Document', key: 'documentReference' },
          { title: 'Received', key: 'receivedAt' },
          { title: 'Value', key: 'totalBaseValueIdr', align: 'end' },
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
          {{
            can('inventory.valuation.read').allowed ? money(item.totalBaseValueIdr) : 'Restricted'
          }}
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <DsConfirmIconButton
            v-if="can('inventory.adjust').allowed && item.status === 'POSTED'"
            :action="() => reverseReceipt(item)"
            confirm-icon="mdi-undo-variant"
            confirm-text="Reverse receipt"
            icon="mdi-undo-variant"
            message="Reversal is only allowed while every received cost layer remains unconsumed."
            title="Reverse goods receipt"
            tone="danger"
            tooltip="Reverse goods receipt"
            variant="text"
          />
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">No receipts have been posted.</div>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="900" persistent scrollable>
      <VCard>
        <VCardTitle>Post goods receipt</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
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
                label="Receiving warehouse"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.receivedAt"
                label="Received at"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.documentReference"
                label="Receipt document reference"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div v-for="line in form.lines" :key="line.purchaseOrderLineId" class="mb-5">
            <div class="mb-2 d-flex align-center">
              <div class="text-subtitle-2 font-weight-bold">{{ line.partNumber }}</div>
              <VSpacer /><VChip size="small" variant="tonal">{{ line.trackingType }}</VChip>
            </div>
            <VRow dense>
              <VCol cols="12" md="3">
                <VTextField
                  v-model.number="line.quantity"
                  :hint="`Outstanding ${number(line.maximumQuantity)}`"
                  label="Quantity"
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
                  label="Destination bin"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="5">
                <VTextField v-model="line.lotNumber" label="Lot number" variant="outlined" />
              </VCol>
              <VCol v-if="line.trackingType === 'SERIAL'" cols="12">
                <VTextarea
                  v-model="line.serialNumbersText"
                  hint="One serial per line or comma separated"
                  label="Serial numbers"
                  persistent-hint
                  rows="2"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="4">
                <VTextField
                  v-model="line.manufacturedAt"
                  label="Manufactured date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.trackingType !== 'QUANTITY'" cols="12" md="4">
                <VTextField
                  v-model="line.expiresAt"
                  label="Expiry date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol v-if="line.certificateRequired" cols="12" md="4">
                <VTextField
                  v-model="line.certificateReference"
                  label="Certificate reference"
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
                  Verified part certificate required
                </VChip>
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer /><VBtn
            :disabled="saving"
            text="Cancel"
            variant="text"
            @click="dialog = false"
          /><VBtn
            :loading="saving"
            prepend-icon="mdi-package-down"
            text="Post receipt"
            @click="postReceipt"
          />
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
