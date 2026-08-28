<script setup lang="ts">
import { purchaseRequisitions } from '../../data/procurement';
import {
  formatProcurementIDRFull,
  priorityColor,
  statusColor,
  useProcurementActions,
  useProcurementSnackbar
} from '../../composables/useProcurement';
import type { PurchaseRequisition } from '../../types/procurement';

definePageMeta({ title: 'Purchase Requisition' });

const { notify } = useProcurementSnackbar();
const { approvePR, rejectPR } = useProcurementActions();

const rows = ref<PurchaseRequisition[]>(structuredClone(purchaseRequisitions));
const search = ref('');
const statusFilter = ref('All');
const isRefreshing = ref(false);

const statuses = ['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted'];

const headers = [
  { title: 'PR Number', key: 'prNumber' },
  { title: 'Date', key: 'date' },
  { title: 'Requester', key: 'requester' },
  { title: 'Department', key: 'department' },
  { title: 'Item / Service', key: 'itemService' },
  { title: 'Estimated Value', key: 'estimatedValue' },
  { title: 'Required Date', key: 'requiredDate' },
  { title: 'Priority', key: 'priority' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    const matchesSearch =
      !search.value ||
      r.prNumber.toLowerCase().includes(search.value.toLowerCase()) ||
      r.itemService.toLowerCase().includes(search.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'All' || r.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

const kpi = computed(() => ({
  open: rows.value.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length,
  pending: rows.value.filter((r) => r.status === 'Under Review').length,
  approved: rows.value.filter((r) => r.status === 'Approved' || r.status === 'Converted').length,
  urgent: rows.value.filter((r) => r.priority === 'Urgent').length
}));

const selected = ref<PurchaseRequisition | null>(null);
const dialog = ref(false);

function openDetail(row: PurchaseRequisition) {
  selected.value = row;
  dialog.value = true;
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Purchase requisition data refreshed.', 'info');
}

// ----------------------------------------------------------------------------
// Top floating success/reject banner (like the CRM "Customer added" style) —
// separate from the global bottom-right snackbar. Frontend-only.
// ----------------------------------------------------------------------------
const showActionBanner = ref(false);
const actionBannerText = ref('');
const actionBannerTone = ref<'success' | 'error'>('success');
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

function flashActionBanner(text: string, tone: 'success' | 'error' = 'success') {
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

function handleApprove(row: PurchaseRequisition) {
  approvePR(row);
  dialog.value = false;
  flashActionBanner(`${row.prNumber} berhasil disetujui.`, 'success');
}

function handleReject(row: PurchaseRequisition) {
  rejectPR(row);
  dialog.value = false;
  flashActionBanner(`${row.prNumber} telah ditolak.`, 'error');
}
</script>

<template>
  <div class="proc-page">
    <!-- Top floating action banner (approve = green, reject = red) -->
    <Teleport to="body">
      <Transition name="banner-fade">
        <div
          v-if="showActionBanner"
          class="action-banner"
          :class="actionBannerTone === 'error' ? 'action-banner--error' : 'action-banner--success'"
        >
          <VIcon
            :icon="actionBannerTone === 'error' ? 'mdi-close-circle' : 'mdi-check-circle'"
            size="18"
            class="action-banner__icon"
          />
          <span>{{ actionBannerText }}</span>
          <button
            class="action-banner__close"
            aria-label="Tutup notifikasi"
            @click="showActionBanner = false"
          >
            <VIcon icon="mdi-close" size="16" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <ProcurementPageHeader
      eyebrow="Purchasing Request"
      title="Purchase Requisition"
      subtitle="Manage purchase requests, budget checks, and approval workflow."
    >
      <template #actions>
        <VBtn
          variant="outlined"
          :loading="isRefreshing"
          prepend-icon="mdi-refresh"
          @click="refreshData"
        >
          Refresh
        </VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-5" />

    <VRow class="mt-4" dense>
      <VCol cols="6" sm="3">
        <ProcurementKpi
          :kpi="{
            id: 'open',
            label: 'Open PR',
            value: String(kpi.open),
            icon: 'mdi-clipboard-text-outline',
            iconColor: '#0F4C81'
          }"
        />
      </VCol>
      <VCol cols="6" sm="3">
        <ProcurementKpi
          :kpi="{
            id: 'pending',
            label: 'Pending Review',
            value: String(kpi.pending),
            icon: 'mdi-clock-outline',
            iconColor: '#B45309'
          }"
        />
      </VCol>
      <VCol cols="6" sm="3">
        <ProcurementKpi
          :kpi="{
            id: 'approved',
            label: 'Approved',
            value: String(kpi.approved),
            icon: 'mdi-check-circle-outline',
            iconColor: '#15803D'
          }"
        />
      </VCol>
      <VCol cols="6" sm="3">
        <ProcurementKpi
          :kpi="{
            id: 'urgent',
            label: 'Urgent',
            value: String(kpi.urgent),
            icon: 'mdi-alert-outline',
            iconColor: '#DC2626'
          }"
        />
      </VCol>
    </VRow>

    <VRow class="mt-2" dense>
      <VCol cols="12" md="6">
        <VTextField
          v-model="search"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari PR / item"
        />
      </VCol>
      <VCol cols="12" md="4">
        <VSelect
          v-model="statusFilter"
          :items="statuses"
          density="compact"
          variant="outlined"
          hide-details
          label="Status"
        />
      </VCol>
    </VRow>

    <VCard border rounded="lg" class="mt-4">
      <VDataTable
        :headers="headers"
        :items="filteredRows"
        item-value="id"
        :items-per-page="10"
        density="comfortable"
      >
        <template #item.estimatedValue="{ item }">
          {{ formatProcurementIDRFull(item.estimatedValue) }}
        </template>
        <template #item.priority="{ item }">
          <VChip :color="priorityColor(item.priority)" size="small" variant="tonal">
            {{ item.priority }}
          </VChip>
        </template>
        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <VBtn size="small" variant="text" color="primary" @click="openDetail(item)">View</VBtn>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="640">
      <VCard v-if="selected" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">{{ selected.prNumber }}</VCardTitle>
          <VCardSubtitle>{{ selected.itemService }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow dense>
            <VCol cols="6">
              <div class="detail-row">
                <span>Requester</span><span>{{ selected.requester }}</span>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="detail-row">
                <span>Department</span><span>{{ selected.department }}</span>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="detail-row">
                <span>Estimated Value</span><span>{{ formatProcurementIDRFull(selected.estimatedValue) }}</span>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="detail-row">
                <span>Required Date</span><span>{{ selected.requiredDate }}</span>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="detail-row">
                <span>Priority</span><span>{{ selected.priority }}</span>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="detail-row">
                <span>Budget Check</span><span>{{ selected.budgetCheck }}</span>
              </div>
            </VCol>
          </VRow>
          <VDivider class="my-3" />
          <div class="text-caption text-medium-emphasis mb-1">Requested Items</div>
          <div v-for="(item, i) in selected.items" :key="i" class="detail-row">
            <span>{{ item.name }} ({{ item.quantity }} {{ item.unit }})</span>
            <span>{{ formatProcurementIDRFull(item.estimatedUnitPrice) }}</span>
          </div>
          <VDivider class="my-3" />
          <div class="text-caption text-medium-emphasis mb-1">Next Action</div>
          <div class="text-body-2">{{ selected.nextAction }}</div>
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn
            v-if="selected.status === 'Submitted' || selected.status === 'Under Review'"
            variant="outlined"
            color="error"
            @click="handleReject(selected)"
          >
            Reject
          </VBtn>
          <VBtn
            v-if="selected.status === 'Submitted' || selected.status === 'Under Review'"
            color="primary"
            variant="flat"
            @click="handleApprove(selected)"
          >
            Approve
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
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
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
