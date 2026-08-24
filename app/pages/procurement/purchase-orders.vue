<script setup lang="ts">
import { purchaseOrders } from '../../data/procurement';
import { formatIDRFull, statusColor, useProcurementActions, useProcurementSnackbar } from '../../composables/useProcurement';
import type { PurchaseOrder } from '../../types/procurement';

definePageMeta({ title: 'Purchase Orders' });

const { notify } = useProcurementSnackbar();
const { approvePO, rejectPO, sendToVendor } = useProcurementActions();

const rows = ref<PurchaseOrder[]>(structuredClone(purchaseOrders));
const search = ref('');
const statusFilter = ref('All');
const isRefreshing = ref(false);

const statuses = ['All', 'Draft', 'Pending Approval', 'Approved', 'Sent to Vendor', 'Partially Received', 'Completed', 'Closed', 'Cancelled'];

const headers = [
  { title: 'PO Number', key: 'poNumber' },
  { title: 'Supplier', key: 'supplier' },
  { title: 'Category', key: 'category' },
  { title: 'PO Date', key: 'poDate' },
  { title: 'Total Amount', key: 'totalAmount' },
  { title: 'Expected Delivery', key: 'expectedDelivery' },
  { title: 'Outstanding', key: 'delivery' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    const matchesSearch = !search.value || r.poNumber.toLowerCase().includes(search.value.toLowerCase()) || r.supplier.toLowerCase().includes(search.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'All' || r.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

const selected = ref<PurchaseOrder | null>(null);
const dialog = ref(false);

function openDetail(row: PurchaseOrder) {
  selected.value = row;
  dialog.value = true;
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Purchase order data refreshed.', 'info');
}

// ----------------------------------------------------------------------------
// Top floating action banner (like the CRM "Customer added" style) —
// separate from the global bottom-right snackbar. Frontend-only.
// tone: success (approve), error (reject), info (send to vendor)
// ----------------------------------------------------------------------------
const showActionBanner = ref(false);
const actionBannerText = ref('');
const actionBannerTone = ref<'success' | 'error' | 'info'>('success');
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

const bannerIcon: Record<'success' | 'error' | 'info', string> = {
  success: 'mdi-check-circle',
  error: 'mdi-close-circle',
  info: 'mdi-send-circle'
};

function flashActionBanner(text: string, tone: 'success' | 'error' | 'info' = 'success') {
  actionBannerText.value = text;
  actionBannerTone.value = tone;
  showActionBanner.value = true;

  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    showActionBanner.value = false;
  }, 3200);
}

onBeforeUnmount(() => {
  if (bannerTimeout) clearTimeout(bannerTimeout);
});

function handleApprove(row: PurchaseOrder) {
  approvePO(row);
  dialog.value = false;
  flashActionBanner(`${row.poNumber} berhasil disetujui.`, 'success');
}

function handleReject(row: PurchaseOrder) {
  rejectPO(row);
  dialog.value = false;
  flashActionBanner(`${row.poNumber} telah ditolak.`, 'error');
}

function handleSendToVendor(row: PurchaseOrder) {
  sendToVendor(row);
  dialog.value = false;
  flashActionBanner(`${row.poNumber} berhasil dikirim ke vendor.`, 'info');
}
</script>

<template>
  <div class="proc-page">
    <!-- Top floating action banner (approve = green, reject = red, send to vendor = blue) -->
    <Teleport to="body">
      <Transition name="banner-fade">
        <div
          v-if="showActionBanner"
          class="action-banner"
          :class="`action-banner--${actionBannerTone}`"
        >
          <VIcon :icon="bannerIcon[actionBannerTone]" size="18" class="action-banner__icon" />
          <span>{{ actionBannerText }}</span>
          <button class="action-banner__close" @click="showActionBanner = false" aria-label="Tutup notifikasi">
            <VIcon icon="mdi-close" size="16" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <ProcurementPageHeader
      eyebrow="Purchase Order Management"
      title="Purchase Orders"
      subtitle="Manage purchase orders, vendor delivery, expected dates, and outstanding quantities."
    >
      <template #actions>
        <VBtn variant="outlined" :loading="isRefreshing" prepend-icon="mdi-refresh" @click="refreshData">Refresh</VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-5" />

    <VRow class="mt-4" dense>
      <VCol cols="12" md="7">
        <VTextField v-model="search" density="compact" variant="outlined" hide-details prepend-inner-icon="mdi-magnify" placeholder="Cari PO / supplier" />
      </VCol>
      <VCol cols="12" md="5">
        <VSelect v-model="statusFilter" :items="statuses" density="compact" variant="outlined" hide-details label="Status" />
      </VCol>
    </VRow>

    <VCard border rounded="lg" class="mt-4">
      <VDataTable :headers="headers" :items="filteredRows" item-value="id" :items-per-page="10" density="comfortable">
        <template #item.totalAmount="{ item }">{{ formatIDRFull(item.totalAmount) }}</template>

        <template #item.delivery="{ item }">
          <div class="delivery-cell">
            <VProgressLinear
              :model-value="(item.delivery.received / item.delivery.ordered) * 100"
              height="6"
              rounded
              :color="item.isOverdue ? 'red' : 'primary'"
            />
            <div class="delivery-cell__meta">
              <span class="text-caption text-medium-emphasis">{{ item.delivery.received }}/{{ item.delivery.ordered }} received</span>
              <VChip v-if="item.isOverdue" color="red" size="x-small" variant="flat" class="delivery-cell__overdue">
                <VIcon icon="mdi-clock-alert-outline" size="12" class="mr-1" />
                Overdue
              </VChip>
            </div>
          </div>
        </template>

        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="tonal">{{ item.status }}</VChip>
        </template>

        <template #item.actions="{ item }">
          <VBtn size="small" variant="text" color="primary" @click="openDetail(item)">View</VBtn>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="640">
      <VCard v-if="selected" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">{{ selected.poNumber }}</VCardTitle>
          <VCardSubtitle>{{ selected.supplier }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow dense>
            <VCol cols="6"><div class="detail-row"><span>Category</span><span>{{ selected.category }}</span></div></VCol>
            <VCol cols="6"><div class="detail-row"><span>Source PR</span><span>{{ selected.sourcePr }}</span></div></VCol>
            <VCol cols="6"><div class="detail-row"><span>Total Amount</span><span>{{ formatIDRFull(selected.totalAmount) }}</span></div></VCol>
            <VCol cols="6"><div class="detail-row"><span>Expected Delivery</span><span>{{ selected.expectedDelivery }}</span></div></VCol>
          </VRow>
          <VDivider class="my-3" />
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption text-medium-emphasis">Delivery Progress</div>
            <VChip v-if="selected.isOverdue" color="red" size="x-small" variant="flat">
              <VIcon icon="mdi-clock-alert-outline" size="12" class="mr-1" />
              Overdue
            </VChip>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span>Ordered: {{ selected.delivery.ordered }}</span>
            <span>Received: {{ selected.delivery.received }}</span>
            <span>Outstanding: {{ selected.delivery.outstanding }}</span>
          </div>
          <VProgressLinear :model-value="(selected.delivery.received / selected.delivery.ordered) * 100" height="8" rounded color="primary" />
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <template v-if="selected.status === 'Pending Approval'">
            <VBtn variant="outlined" color="error" @click="handleReject(selected)">Reject</VBtn>
            <VBtn color="primary" variant="flat" @click="handleApprove(selected)">Approve</VBtn>
          </template>
          <VBtn v-else-if="selected.status === 'Approved'" color="primary" variant="flat" @click="handleSendToVendor(selected)">
            Send to Vendor
          </VBtn>
          <VBtn v-else variant="text" @click="dialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
}

.delivery-cell {
  min-width: 150px;
}

.delivery-cell__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.delivery-cell__overdue {
  flex-shrink: 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
}

.detail-row span:first-child {
  color: #64748b;
}

.detail-row span:last-child {
  color: #0f172a;
  font-weight: 500;
}

/* Top floating action banner — mirrors the CRM "Customer added" style */
.action-banner {
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
  max-width: min(640px, calc(100vw - 48px));
}

.action-banner--success {
  background: #1f8a5c;
}

.action-banner--error {
  background: #d33d3d;
}

.action-banner--info {
  background: #0f4c81;
}

.action-banner__icon {
  flex-shrink: 0;
}

.action-banner__close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-left: 4px;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;
}

.action-banner__close:hover {
  background: rgba(255, 255, 255, 0.15);
}

.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.banner-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}

.banner-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>