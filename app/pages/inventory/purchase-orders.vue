<script setup lang="ts">
import type { CurrencyOption } from '#shared/features/finance/currencies';
import type { VendorOption } from '#shared/features/finance/vendors';
import type { PurchaseOrderDto, PurchaseRequestDto } from '#shared/features/inventory';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { can } = useAuthorization();
const { money, number, date, errorMessage } = useInventoryUi();
const dialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const search = ref('');
const rejectReason = ref('');
const form = reactive({
  purchaseRequestId: '',
  vendorId: '',
  currencyId: 'cur-idr',
  exchangeRateToIdrMicros: 1_000_000,
  expectedAt: new Date().toISOString().slice(0, 10),
  lines: [] as Array<{
    purchaseRequestLineId: string;
    partNumber: string;
    quantity: number;
    maximumQuantity: number;
    sourceUnitCostMinor: number;
  }>
});

const { data, pending, error, refresh } = await useAsyncData('inventory-purchase-orders', () =>
  fetchApi<PurchaseOrderDto[]>('/api/inventory/purchase-orders')
);
const { data: requests, refresh: refreshRequests } = await useAsyncData(
  'inventory-po-requests',
  () => fetchApi<PurchaseRequestDto[]>('/api/inventory/purchase-requests')
);
const { data: vendors } = await useAsyncData('inventory-po-vendors', () =>
  fetchApi<VendorOption[]>('/api/master-data/vendors/options')
);
const { data: currencies } = await useAsyncData('inventory-po-currencies', () =>
  fetchApi<CurrencyOption[]>('/api/master-data/currencies/options')
);

const requestOptions = computed(() =>
  (requests.value ?? [])
    .filter((request) => ['SUBMITTED', 'PARTIALLY_ORDERED'].includes(request.status))
    .map((request) => ({
      title: `${request.requestNumber} · ${request.stationCode}`,
      value: request.id
    }))
);
const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((item) =>
    [item.orderNumber, item.vendorName, item.currencyCode, item.status].some((value) =>
      value.toLowerCase().includes(query)
    )
  );
});

watch(
  () => form.purchaseRequestId,
  (id) => {
    const request = (requests.value ?? []).find((item) => item.id === id);
    form.lines =
      request?.lines
        .filter((line) => line.quantity - line.orderedQuantity > 0)
        .map((line) => ({
          purchaseRequestLineId: line.id,
          partNumber: line.partNumber,
          quantity: line.quantity - line.orderedQuantity,
          maximumQuantity: line.quantity - line.orderedQuantity,
          sourceUnitCostMinor: 0
        })) ?? [];
  }
);

function openCreate() {
  Object.assign(form, {
    purchaseRequestId: requestOptions.value[0]?.value ?? '',
    vendorId: '',
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000,
    expectedAt: new Date().toISOString().slice(0, 10),
    lines: []
  });
  actionError.value = '';
  dialog.value = true;
}

async function createOrder() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/purchase-orders', {
      method: 'POST',
      body: {
        purchaseRequestId: form.purchaseRequestId,
        vendorId: form.vendorId,
        currencyId: form.currencyId,
        exchangeRateToIdrMicros: form.exchangeRateToIdrMicros,
        expectedAt: form.expectedAt,
        lines: form.lines.map(({ purchaseRequestLineId, quantity, sourceUnitCostMinor }) => ({
          purchaseRequestLineId,
          quantity,
          sourceUnitCostMinor
        }))
      }
    });
    dialog.value = false;
    await Promise.all([refresh(), refreshRequests()]);
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Purchase order tidak dapat dibuat. Periksa vendor, tanggal, dan line.'
    );
  } finally {
    saving.value = false;
  }
}

async function runAction(id: string, action: 'submit' | 'approve') {
  actionError.value = '';
  await fetchApi(`/api/inventory/purchase-orders/${id}/${action}`, { method: 'POST' }).catch(
    (value) => {
      actionError.value = errorMessage(
        value,
        `Aksi purchase order gagal. Perbarui data lalu coba lagi.`
      );
      throw value;
    }
  );
  await refresh();
}

async function reject(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/purchase-orders/${id}/reject`, {
    method: 'POST',
    body: { reason: rejectReason.value }
  }).catch((value) => {
    actionError.value = errorMessage(
      value,
      'Purchase order tidak dapat ditolak. Isi alasan lalu coba lagi.'
    );
    throw value;
  });
  await refresh();
}
</script>

<template>
  <InventoryShell title="Purchase Order">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.procurement.manage').allowed"
        color="primary"
        :disabled="!requestOptions.length"
        icon="mdi-plus"
        tooltip="Buat purchase order"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui purchase order"
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
      {{ actionError || 'Purchase order tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
    </VAlert>
    <InventoryFilterBar label="Filter purchase order">
      <VTextField
        v-model="search"
        clearable
        density="comfortable"
        hide-details
        label="Cari purchase order"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
    </InventoryFilterBar>
    <InventoryPanel title="Daftar Purchase Order">
      <VDataTable
        :headers="[
          { title: 'Order', key: 'orderNumber' },
          { title: 'Vendor', key: 'vendorName' },
          { title: 'Lines', key: 'lines', sortable: false },
          { title: 'Estimasi', key: 'expectedAt' },
          { title: 'Status', key: 'status' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="rows"
        :loading="pending"
      >
        <template #[`item.orderNumber`]="{ item }">
          <div class="font-weight-bold text-no-wrap">{{ item.orderNumber }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.currencyCode }}</div>
        </template>
        <template #[`item.lines`]="{ item }">
          <div v-for="line in item.lines" :key="line.id" class="text-caption text-no-wrap">
            {{ line.partNumber }} · {{ number(line.quantity) }} ·
            {{
              can('inventory.valuation.read').allowed
                ? money(line.sourceUnitCostMinor, item.currencyCode)
                : 'Terbatas'
            }}
          </div>
        </template>
        <template #[`item.expectedAt`]="{ item }">{{ date(item.expectedAt) }}</template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <InventoryTableActions>
            <DsConfirmIconButton
              v-if="can('inventory.procurement.manage').allowed && item.status === 'DRAFT'"
              :action="() => runAction(item.id, 'submit')"
              confirm-icon="mdi-send-outline"
              confirm-text="Ajukan order"
              icon="mdi-send-outline"
              message="Order ini akan dikunci untuk review Director."
              title="Ajukan purchase order"
              tone="warning"
              tooltip="Ajukan order"
              variant="text"
            />
            <DsConfirmIconButton
              v-if="can('inventory.po.approve').allowed && item.status === 'PENDING_APPROVAL'"
              :action="() => runAction(item.id, 'approve')"
              confirm-icon="mdi-check-circle-outline"
              confirm-text="Setujui order"
              icon="mdi-check-circle-outline"
              message="Order yang disetujui akan tersedia untuk proses penerimaan barang."
              title="Setujui purchase order"
              tone="success"
              tooltip="Setujui order"
              variant="text"
            />
            <DsConfirmIconButton
              v-if="can('inventory.po.approve').allowed && item.status === 'PENDING_APPROVAL'"
              :action="() => reject(item.id)"
              :confirm-disabled="rejectReason.trim().length < 3"
              confirm-icon="mdi-close-circle-outline"
              confirm-text="Tolak order"
              icon="mdi-close-circle-outline"
              max-width="520"
              persistent
              title="Tolak purchase order"
              tone="danger"
              tooltip="Tolak order"
              variant="text"
              @click="rejectReason = ''"
            >
              <VTextarea
                v-model="rejectReason"
                autofocus
                label="Alasan penolakan"
                rows="3"
                variant="outlined"
              />
            </DsConfirmIconButton>
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Tidak ada purchase order yang cocok.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog v-model="dialog" max-width="800" persistent>
      <VCard>
        <VCardTitle>Buat Purchase Order</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VSelect
            v-model="form.purchaseRequestId"
            class="mb-3"
            :items="requestOptions"
            label="Permintaan pembelian"
            variant="outlined"
          />
          <VRow dense>
            <VCol cols="12" md="5">
              <VSelect
                v-model="form.vendorId"
                item-title="vendorName"
                item-value="id"
                :items="vendors ?? []"
                label="Vendor"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.currencyId"
                item-title="currencyCode"
                item-value="id"
                :items="currencies ?? []"
                label="Currency"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="form.exchangeRateToIdrMicros"
                label="Kurs ke IDR (micros)"
                min="1"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="5">
              <VDateInput
                v-model="form.expectedAt"
                prepend-icon=""
                prepend-inner-icon="mdi-calendar"
                label="Tanggal estimasi"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div v-for="line in form.lines" :key="line.purchaseRequestLineId" class="mb-3">
            <div class="mb-2 text-subtitle-2 font-weight-bold">{{ line.partNumber }}</div>
            <VRow dense>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="line.quantity"
                  :hint="`Maximum ${line.maximumQuantity}`"
                  label="Jumlah order"
                  :max="line.maximumQuantity"
                  min="1"
                  persistent-hint
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="line.sourceUnitCostMinor"
                  label="Biaya unit (minor units)"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-text="Buat order"
          @cancel="dialog = false"
          @submit="createOrder"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
