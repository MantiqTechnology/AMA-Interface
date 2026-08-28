<script setup lang="ts">
import { goodsReceipts, vendorClaims } from '../../data/procurement';
import {
  formatProcurementIDRFull,
  statusColor,
  useProcurementSnackbar
} from '../../composables/useProcurement';
import type { GoodsReceipt, VendorClaim } from '../../types/procurement';

interface GoodsReceiptExtended extends GoodsReceipt {
  item: string;
}

interface VendorClaimExtended extends VendorClaim {
  item: string;
  rejectedQuantity: number;
  notes: string;
}

definePageMeta({ title: 'Receiving & Returns' });

const { notify } = useProcurementSnackbar();

const tab = ref('gr');
const grRows = ref<GoodsReceiptExtended[]>(structuredClone(goodsReceipts) as any);
const claimRows = ref<VendorClaimExtended[]>(structuredClone(vendorClaims) as any);
const isRefreshing = ref(false);

// Inspection dihapus dari tabel karena nilainya duplikat dengan kolom Status.
// Kolom Item ditambahkan supaya barang yang dikirim langsung terlihat.
const grHeaders = [
  { title: 'GR Number', key: 'grNumber' },
  { title: 'PO Number', key: 'poNumber' },
  { title: 'Supplier', key: 'supplier' },
  { title: 'Item', key: 'item' },
  { title: 'Received Date', key: 'receivedDate' },
  { title: 'Quantity', key: 'quantity' },
  { title: 'Documentation', key: 'documents' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const claimHeaders = [
  { title: 'Claim Number', key: 'claimNumber' },
  { title: 'PO', key: 'poNumber' },
  { title: 'Supplier', key: 'supplier' },
  { title: 'Item', key: 'item' },
  { title: 'Reason', key: 'reason' },
  { title: 'Claim Value', key: 'claimValue' },
  { title: 'Date', key: 'date' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

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

function acceptReceipt(row: GoodsReceipt) {
  row.inspection = 'Accepted';
  row.status = 'Accepted';
  notify(`${row.grNumber} marked as accepted.`, 'success');
  flashActionBanner(`${row.grNumber} berhasil diterima (accepted).`, 'success');
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Receiving data refreshed.', 'info');
}

// ----------------------------------------------------------------------------
// Documentation viewer — replaces the old stacked-chip cell with a single
// "Lihat Dokumen" button that opens a dialog listing the attached documents.
// ----------------------------------------------------------------------------
const docDialog = ref(false);
const docSelectedGr = ref<GoodsReceipt | null>(null);

function openDocuments(row: GoodsReceipt) {
  docSelectedGr.value = row;
  docDialog.value = true;
}

const rejectDialog = ref(false);
const rejectFormRef = ref();
const rejectTargetGr = ref<GoodsReceiptExtended | null>(null);

const claimStatusOptions = [
  'Open',
  'Submitted to Vendor',
  'Replacement in Progress',
  'Credit Note Issued'
];

function emptyRejectForm(defaultQty: number | null = null) {
  return {
    rejectedQuantity: defaultQty as number | null,
    status: 'Open' as string,
    notes: ''
  };
}

const rejectForm = ref(emptyRejectForm());

// Quantity ditolak tidak boleh kosong, harus > 0, dan tidak boleh melebihi
// quantity yang diterima pada GR terkait.
const rejectedQtyRules = computed(() => {
  const maxQty = rejectTargetGr.value?.quantity ?? Infinity;
  return [
    (v: number | null) => (v !== null && v !== undefined && `${v}` !== '') || 'Wajib diisi',
    (v: number) => v > 0 || 'Harus lebih dari 0',
    (v: number) => v <= maxQty || `Tidak boleh melebihi quantity diterima (${maxQty})`
  ];
});

function openRejectDialog(row: any) {
  rejectTargetGr.value = row as GoodsReceiptExtended;
  rejectForm.value = emptyRejectForm();
  rejectFormRef.value?.resetValidation?.();
  rejectDialog.value = true;
}

function closeRejectDialog() {
  rejectDialog.value = false;
  rejectTargetGr.value = null;
}

function generateClaimNumber() {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const sameDayCount = claimRows.value.filter((c) =>
    c.claimNumber.startsWith(`CLM-AMA-${yy}${mm}${dd}`)
  ).length;
  const seq = String(sameDayCount + 1).padStart(3, '0');
  return `CLM-AMA-${yy}${mm}${dd}-${seq}`;
}

async function submitReject() {
  const { valid } = await rejectFormRef.value.validate();
  if (!valid || !rejectTargetGr.value) return;

  const gr = rejectTargetGr.value;
  gr.inspection = 'Rejected';
  gr.status = 'Rejected';

  const claimNumber = generateClaimNumber();
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const rejectedQuantity = rejectForm.value.rejectedQuantity ?? 0;

  const newClaim: VendorClaimExtended = {
    id: `clm-${Date.now()}`,
    claimNumber,
    poNumber: gr.poNumber,
    supplier: gr.supplier,
    item: gr.item,
    rejectedQuantity,
    notes: rejectForm.value.notes.trim(),
    date: dateLabel,
    status: rejectForm.value.status as any,
    reason: '-' as any,
    claimValue: 0
  };

  claimRows.value.unshift(newClaim);

  const successText = `${gr.grNumber} ditolak (${rejectedQuantity} unit). Klaim ${claimNumber} otomatis dibuat.`;
  rejectDialog.value = false;
  notify(successText, 'error');
  flashActionBanner(successText, 'error');
}

const claimDetailDialog = ref(false);
const claimDetailSelected = ref<VendorClaim | null>(null);

function openClaimDetail(row: VendorClaim) {
  claimDetailSelected.value = row;
  claimDetailDialog.value = true;
}
</script>

<template>
  <div class="proc-page">
    <!-- Top floating action banner (accept = green, reject = red) -->
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
      eyebrow="Receiving Control"
      title="Receiving & Returns"
      subtitle="Manage goods receipt, inspection, aviation documentation, purchase returns, and vendor claims."
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

    <VTabs v-model="tab" class="mt-4" color="primary">
      <VTab value="gr">Goods Receipt</VTab>
      <VTab value="claims">Returns & Claims</VTab>
    </VTabs>
    <VDivider class="mb-4" />

    <VWindow v-model="tab">
      <VWindowItem value="gr">
        <VCard border rounded="lg">
          <VDataTable
            :headers="grHeaders"
            :items="grRows"
            item-value="id"
            :items-per-page="10"
            density="comfortable"
          >
            <template #item.documents="{ item }">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-eye-outline"
                @click="openDocuments(item)"
              >
                Lihat Dokumen
                <span v-if="item.documents.length" class="doc-count">({{ item.documents.length }})</span>
              </VBtn>
            </template>
            <template #item.status="{ item }">
              <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                {{ item.status }}
              </VChip>
            </template>
            <template #item.actions="{ item }">
              <VBtn
                v-if="item.status === 'Pending Inspection'"
                size="small"
                variant="text"
                color="error"
                @click="openRejectDialog(item)"
              >
                Reject
              </VBtn>
              <VBtn
                v-if="item.status === 'Pending Inspection'"
                size="small"
                variant="text"
                color="primary"
                @click="acceptReceipt(item)"
              >
                Accept
              </VBtn>
            </template>
          </VDataTable>
        </VCard>
      </VWindowItem>

      <VWindowItem value="claims">
        <VCard border rounded="lg">
          <VDataTable
            :headers="claimHeaders"
            :items="claimRows"
            item-value="id"
            :items-per-page="10"
            density="comfortable"
          >
            <template #item.reason="{ item }">{{ item.reason || '-' }}</template>
            <template #item.claimValue="{ item }">
              {{ item.claimValue != null ? formatProcurementIDRFull(item.claimValue) : '-' }}
            </template>
            <template #item.status="{ item }">
              <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                {{ item.status }}
              </VChip>
            </template>
            <template #item.actions="{ item }">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-eye-outline"
                @click="openClaimDetail(item)"
              >
                Detail
              </VBtn>
            </template>
          </VDataTable>
        </VCard>
      </VWindowItem>
    </VWindow>

    <!-- Documentation viewer dialog -->
    <VDialog v-model="docDialog" max-width="420">
      <VCard v-if="docSelectedGr" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">
            {{ docSelectedGr.grNumber }}
          </VCardTitle>
          <VCardSubtitle>Dokumen terlampir — {{ docSelectedGr.supplier }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <div v-if="docSelectedGr.documents.length" class="doc-list">
            <div v-for="doc in docSelectedGr.documents" :key="doc" class="doc-list__item">
              <VIcon icon="mdi-file-document-outline" size="18" color="#0F4C81" />
              <span>{{ doc }}</span>
              <VSpacer />
              <VChip size="x-small" color="green" variant="tonal">Attached</VChip>
            </div>
          </div>
          <div v-else class="text-caption text-medium-emphasis text-center py-6">
            Belum ada dokumen yang dilampirkan untuk goods receipt ini.
          </div>
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn variant="text" @click="docDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Reject dialog — claim form (PO/Item auto-filled, quantity ditolak, status, catatan) -->
    <VDialog v-model="rejectDialog" max-width="560" persistent scrollable>
      <VCard v-if="rejectTargetGr" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">
            Reject {{ rejectTargetGr.grNumber }}
          </VCardTitle>
          <VCardSubtitle>
            Lengkapi detail klaim untuk {{ rejectTargetGr.supplier }} — data ini akan otomatis
            muncul di tab Returns &amp; Claims.
          </VCardSubtitle>
        </VCardItem>

        <VDivider />

        <VCardText style="max-height: 60vh">
          <VForm ref="rejectFormRef">
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="rejectTargetGr.poNumber"
                  label="PO Number"
                  variant="outlined"
                  density="comfortable"
                  readonly
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="rejectTargetGr.item"
                  label="Item"
                  variant="outlined"
                  density="comfortable"
                  readonly
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="rejectForm.rejectedQuantity"
                  label="Quantity Ditolak *"
                  type="number"
                  min="1"
                  :max="rejectTargetGr.quantity"
                  variant="outlined"
                  density="comfortable"
                  :rules="rejectedQtyRules"
                  :suffix="`dari ${rejectTargetGr.quantity} diterima`"
                  autofocus
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="rejectForm.status"
                  :items="claimStatusOptions"
                  label="Claim Status"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="rejectForm.notes"
                  label="Catatan Tambahan"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  auto-grow
                  placeholder="Detail temuan inspeksi, foto pendukung, dsb."
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="px-4 py-3">
          <VSpacer />
          <VBtn variant="text" @click="closeRejectDialog">Cancel</VBtn>
          <VBtn
            color="error"
            variant="flat"
            prepend-icon="mdi-close-circle-outline"
            @click="submitReject"
          >
            Reject &amp; Create Claim
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Claim detail dialog — catatan tambahan & quantity ditolak -->
    <VDialog v-model="claimDetailDialog" max-width="420">
      <VCard v-if="claimDetailSelected" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">
            {{ claimDetailSelected.claimNumber }}
          </VCardTitle>
          <VCardSubtitle>Detail klaim — {{ claimDetailSelected.supplier }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <div class="claim-detail__row">
            <span class="claim-detail__label">Quantity Ditolak</span>
            <span class="claim-detail__value">{{ claimDetailSelected.rejectedQuantity }}</span>
          </div>
          <VDivider class="my-3" />
          <div class="claim-detail__label mb-1">Catatan Tambahan</div>
          <p class="text-body-2 text-medium-emphasis claim-detail__notes">
            {{ claimDetailSelected.notes || 'Tidak ada catatan tambahan.' }}
          </p>
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn variant="text" @click="claimDetailDialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
}

.doc-count {
  margin-left: 4px;
  opacity: 0.8;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-row__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #64748b;
  margin-bottom: 4px;
}

.detail-row__value {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.detail-row__notes {
  margin: 0;
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
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
