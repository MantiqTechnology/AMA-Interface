<script setup lang="ts">
import { approvalAuthorityMatrix, approvalQueue, auditTrail, threeWayMatchRows } from '../../data/procurement';
import { formatIDRFull, statusColor, useProcurementActions, useProcurementSnackbar } from '../../composables/useProcurement';

definePageMeta({ title: 'Approval & Control' });

const { notify } = useProcurementSnackbar();
const { approveQueueItem, rejectQueueItem } = useProcurementActions();

const tab = ref('queue');
const isRefreshing = ref(false);
const queueRows = ref(structuredClone(approvalQueue));

const queueHeaders = [
  { title: 'Reference', key: 'reference' },
  { title: 'Type', key: 'type' },
  { title: 'Requester', key: 'requester' },
  { title: 'Amount', key: 'amount' },
  { title: 'Current Approver', key: 'currentApprover' },
  { title: 'Waiting Since', key: 'waitingSince' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const matchHeaders = [
  { title: 'PO', key: 'poNumber' },
  { title: 'Goods Receipt', key: 'grNumber' },
  { title: 'Invoice', key: 'invoiceNumber' },
  { title: 'Vendor', key: 'supplier' },
  { title: 'PO Amount', key: 'poAmount' },
  { title: 'GR Amount', key: 'grAmount' },
  { title: 'Invoice Amount', key: 'invoiceAmount' },
  { title: 'Match Status', key: 'status' }
];

const auditHeaders = [
  { title: 'Timestamp', key: 'timestamp' },
  { title: 'User', key: 'user' },
  { title: 'Module', key: 'module' },
  { title: 'Reference', key: 'reference' },
  { title: 'Action', key: 'action' },
  { title: 'Previous Value', key: 'previousValue' },
  { title: 'New Value', key: 'newValue' }
];

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Approval & control data refreshed.', 'info');
}

// ----------------------------------------------------------------------------
// Top floating action banner (like the CRM "Customer added" style) —
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

function handleApprove(row: (typeof queueRows.value)[number]) {
  approveQueueItem(row);
  flashActionBanner(`${row.reference} berhasil disetujui.`, 'success');
}

function handleReject(row: (typeof queueRows.value)[number]) {
  rejectQueueItem(row);
  flashActionBanner(`${row.reference} telah ditolak.`, 'error');
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
          <VIcon :icon="actionBannerTone === 'error' ? 'mdi-close-circle' : 'mdi-check-circle'" size="18" class="action-banner__icon" />
          <span>{{ actionBannerText }}</span>
          <button class="action-banner__close" @click="showActionBanner = false" aria-label="Tutup notifikasi">
            <VIcon icon="mdi-close" size="16" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <ProcurementPageHeader
      eyebrow="Procurement Control"
      title="Approval & Control"
      subtitle="Manage approval authority, procurement workflow, three-way matching, and audit trail."
    >
      <template #actions>
        <VBtn variant="outlined" :loading="isRefreshing" prepend-icon="mdi-refresh" @click="refreshData">Refresh</VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-5" />

    <VTabs v-model="tab" class="mt-4" color="primary">
      <VTab value="queue">Approval Queue</VTab>
      <VTab value="authority">Approval Authority</VTab>
      <VTab value="match">Three-Way Matching</VTab>
      <VTab value="audit">Audit Trail</VTab>
    </VTabs>
    <VDivider class="mb-4" />

    <VWindow v-model="tab">
      <VWindowItem value="queue">
        <VCard border rounded="lg">
          <VDataTable :headers="queueHeaders" :items="queueRows" item-value="id" :items-per-page="10" density="comfortable">
            <template #item.amount="{ item }">{{ formatIDRFull(item.amount) }}</template>
            <template #item.waitingSince="{ item }">{{ item.waitingSince }} ({{ item.waitingDays }}d)</template>
            <template #item.status="{ item }"><VChip :color="statusColor(item.status)" size="small" variant="tonal">{{ item.status }}</VChip></template>
            <template #item.actions="{ item }">
              <template v-if="item.status === 'Pending'">
                <VBtn size="small" variant="text" color="error" @click="handleReject(item)">Reject</VBtn>
                <VBtn size="small" variant="text" color="primary" @click="handleApprove(item)">Approve</VBtn>
              </template>
            </template>
          </VDataTable>
        </VCard>
      </VWindowItem>

      <VWindowItem value="authority">
        <VCard border rounded="lg">
          <VCardItem>
            <VCardTitle class="section-title">Approval Authority Matrix</VCardTitle>
            <VCardSubtitle class="text-caption">Data dummy demo — bukan kebijakan resmi perusahaan.</VCardSubtitle>
          </VCardItem>
          <VCardText class="pa-0">
            <table class="simple-table">
              <thead><tr><th>Amount Range</th><th>Approver</th></tr></thead>
              <tbody>
                <tr v-for="tier in approvalAuthorityMatrix" :key="tier.range">
                  <td class="font-weight-medium">{{ tier.range }}</td>
                  <td>{{ tier.approver }}</td>
                </tr>
              </tbody>
            </table>
          </VCardText>
        </VCard>
      </VWindowItem>

      <VWindowItem value="match">
        <VCard border rounded="lg">
          <VDataTable :headers="matchHeaders" :items="threeWayMatchRows" item-value="id" :items-per-page="10" density="comfortable">
            <template #item.poAmount="{ item }">{{ formatIDRFull(item.poAmount) }}</template>
            <template #item.grAmount="{ item }">{{ item.grAmount ? formatIDRFull(item.grAmount) : '—' }}</template>
            <template #item.invoiceAmount="{ item }">{{ item.invoiceAmount ? formatIDRFull(item.invoiceAmount) : '—' }}</template>
            <template #item.status="{ item }"><VChip :color="statusColor(item.status)" size="small" variant="tonal">{{ item.status }}</VChip></template>
          </VDataTable>
        </VCard>
      </VWindowItem>

      <VWindowItem value="audit">
        <VCard border rounded="lg">
          <VDataTable :headers="auditHeaders" :items="auditTrail" item-value="timestamp" :items-per-page="10" density="comfortable" />
        </VCard>
      </VWindowItem>
    </VWindow>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.simple-table thead th {
  text-align: left;
  padding: 10px 16px;
  color: #64748b;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid #d9e0e6;
}

.simple-table tbody td {
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
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