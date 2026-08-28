<script setup lang="ts">
import { purchaseRequisitions, sourcingEvents, suppliers } from '../../data/procurement';
import {
  formatProcurementIDRFull,
  statusColor,
  useProcurementSnackbar
} from '../../composables/useProcurement';
import type { SourcingEvent, SourcingType } from '../../types/procurement';

definePageMeta({ title: 'Sourcing & Tender' });

const { notify } = useProcurementSnackbar();

const rows = ref<SourcingEvent[]>(structuredClone(sourcingEvents));
const search = ref('');
const typeFilter = ref('All');
const statusFilter = ref('All');
const isRefreshing = ref(false);

const types = ['All', 'RFQ', 'Direct Purchase', 'Tender', 'Emergency Procurement'];
const statuses = [
  'All',
  'Draft',
  'Invitation Sent',
  'Quotation Received',
  'Evaluation',
  'Awarded',
  'Cancelled'
];

const headers = [
  { title: 'Reference', key: 'reference' },
  { title: 'Source PR', key: 'sourcePr' },
  { title: 'Type', key: 'type' },
  { title: 'Item / Service', key: 'itemService' },
  { title: 'Invited Vendors', key: 'invitedVendors' },
  { title: 'Deadline', key: 'deadline' },
  { title: 'Lowest Quote', key: 'lowestQuote' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    const matchesSearch =
      !search.value ||
      r.reference.toLowerCase().includes(search.value.toLowerCase()) ||
      r.itemService.toLowerCase().includes(search.value.toLowerCase());
    const matchesType = typeFilter.value === 'All' || r.type === typeFilter.value;
    const matchesStatus = statusFilter.value === 'All' || r.status === statusFilter.value;
    return matchesSearch && matchesType && matchesStatus;
  })
);

const selected = ref<SourcingEvent | null>(null);
const dialog = ref(false);

function openDetail(row: SourcingEvent) {
  selected.value = row;
  dialog.value = true;
}

function selectVendor(quoteVendor: string) {
  if (!selected.value) return;
  selected.value.quotations.forEach((q) => (q.selected = q.vendor === quoteVendor));
  selected.value.status = 'Awarded';
  notify(`${quoteVendor} selected as winning vendor for ${selected.value.reference}.`, 'success');
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Sourcing data refreshed.', 'info');
}

// ----------------------------------------------------------------------------
// Top floating success banner (like the CRM "Customer baru berhasil
// ditambahkan" style) — separate from the global bottom-right snackbar.
// Frontend-only: just a local ref that shows/hides with a timeout.
// ----------------------------------------------------------------------------
const showSuccessBanner = ref(false);
const successBannerText = ref('');
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

function flashSuccessBanner(text: string) {
  successBannerText.value = text;
  showSuccessBanner.value = true;

  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    showSuccessBanner.value = false;
  }, 3200);
}

// ----------------------------------------------------------------------------
// Create RFQ / Create Tender — shared dialog, driven by `createType`.
// Frontend-only: no API call, just pushes a new SourcingEvent into local state.
// ----------------------------------------------------------------------------
const createDialog = ref(false);
const createType = ref<'RFQ' | 'Tender'>('RFQ');
const createFormRef = ref();

const prOptions = computed(() => ['-', ...purchaseRequisitions.map((pr) => pr.prNumber)]);
const vendorOptions = computed(() => suppliers.map((s) => s.company));

function emptyCreateForm() {
  return {
    sourcePr: '-',
    itemService: '',
    invitedVendorNames: [] as string[],
    deadline: '' as string,
    estimatedBudget: null as number | null
  };
}

const createForm = ref(emptyCreateForm());

// Date picker state for Deadline
const deadlineMenu = ref(false);
const deadlineDate = ref<Date | null>(null);

watch(deadlineDate, (val) => {
  if (!val) {
    createForm.value.deadline = '';
    return;
  }
  createForm.value.deadline = val.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

const itemServiceRule = [(v: string) => !!v?.trim() || 'Wajib diisi'];
const vendorRule = [(v: string[]) => v.length > 0 || 'Pilih minimal 1 vendor'];
const deadlineRule = [(v: string) => !!v || 'Wajib dipilih'];

function openCreateDialog(type: 'RFQ' | 'Tender') {
  createType.value = type;
  createForm.value = emptyCreateForm();
  deadlineDate.value = null;
  createFormRef.value?.resetValidation?.();
  createDialog.value = true;
}

function closeCreateDialog() {
  createDialog.value = false;
}

function generateReference(type: 'RFQ' | 'Tender') {
  const prefix = type === 'RFQ' ? 'RFQ' : 'TND';
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const sameDayCount = rows.value.filter((r) =>
    r.reference.startsWith(`${prefix}-AMA-${yy}${mm}${dd}`)
  ).length;
  const seq = String(sameDayCount + 1).padStart(3, '0');
  return `${prefix}-AMA-${yy}${mm}${dd}-${seq}`;
}

async function submitCreate() {
  const { valid } = await createFormRef.value.validate();
  if (!valid) return;

  const reference = generateReference(createType.value);

  const newEvent: SourcingEvent = {
    id: `src-${Date.now()}`,
    reference,
    sourcePr: createForm.value.sourcePr === '-' ? '-' : createForm.value.sourcePr,
    type: createType.value as SourcingType,
    itemService: createForm.value.itemService.trim(),
    invitedVendors: createForm.value.invitedVendorNames.length,
    deadline: createForm.value.deadline || '-',
    lowestQuote: createForm.value.estimatedBudget ?? 0,
    status: 'Invitation Sent',
    quotations: []
  };

  rows.value.unshift(newEvent);

  const successText =
    createType.value === 'RFQ'
      ? `RFQ ${reference} berhasil dibuat dan undangan terkirim ke ${newEvent.invitedVendors} vendor.`
      : `Tender ${reference} berhasil dipublikasikan ke ${newEvent.invitedVendors} vendor.`;

  createDialog.value = false;
  flashSuccessBanner(successText);
  notify(successText, 'success');
}

onBeforeUnmount(() => {
  if (bannerTimeout) clearTimeout(bannerTimeout);
});
</script>

<template>
  <div class="proc-page">
    <!-- Top floating success banner (matches CRM-style alert) -->
    <Teleport to="body">
      <Transition name="banner-fade">
        <div v-if="showSuccessBanner" class="success-banner">
          <VIcon icon="mdi-check-circle" size="18" class="success-banner__icon" />
          <span>{{ successBannerText }}</span>
          <button
            class="success-banner__close"
            aria-label="Tutup notifikasi"
            @click="showSuccessBanner = false"
          >
            <VIcon icon="mdi-close" size="16" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <ProcurementPageHeader
      eyebrow="Procurement Sourcing"
      title="Sourcing & Tender"
      subtitle="Manage RFQ, quotation comparison, vendor evaluation, and vendor selection."
    >
      <template #actions>
        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="openCreateDialog('RFQ')"
        >
          Create RFQ
        </VBtn>
        <VBtn variant="outlined" prepend-icon="mdi-gavel" @click="openCreateDialog('Tender')">
          Create Tender
        </VBtn>
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
      <VCol cols="12" md="5">
        <VTextField
          v-model="search"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari reference / item"
        />
      </VCol>
      <VCol cols="6" md="3.5">
        <VSelect
          v-model="typeFilter"
          :items="types"
          density="compact"
          variant="outlined"
          hide-details
          label="Type"
        />
      </VCol>
      <VCol cols="6" md="3.5">
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
        <template #item.lowestQuote="{ item }">
          {{ formatProcurementIDRFull(item.lowestQuote) }}
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

    <!-- Detail / Price Comparison dialog (existing) -->
    <VDialog v-model="dialog" max-width="760">
      <VCard v-if="selected" rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">{{ selected.reference }}</VCardTitle>
          <VCardSubtitle>{{ selected.itemService }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <div class="text-caption text-medium-emphasis mb-2">Price Comparison</div>
          <table class="simple-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Quoted Price</th>
                <th>Lead Time</th>
                <th>Payment Terms</th>
                <th>Warranty</th>
                <th>Documents</th>
                <th>Score</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="q in selected.quotations"
                :key="q.vendor"
                :class="{ 'row-highlight': q.selected }"
              >
                <td>{{ q.vendor }}</td>
                <td>{{ formatProcurementIDRFull(q.quotedPrice) }}</td>
                <td>{{ q.leadTimeDays }} days</td>
                <td>{{ q.paymentTerms }}</td>
                <td>{{ q.warranty }}</td>
                <td>{{ q.documentCompliance }}</td>
                <td class="font-weight-bold">{{ q.score }}</td>
                <td>
                  <VBtn
                    v-if="!q.selected"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    @click="selectVendor(q.vendor)"
                  >
                    Select
                  </VBtn>
                  <VChip v-else size="x-small" color="green" variant="tonal">Selected</VChip>
                </td>
              </tr>
              <tr v-if="!selected.quotations.length">
                <td colspan="8" class="text-center text-medium-emphasis py-4">
                  No quotations submitted yet.
                </td>
              </tr>
            </tbody>
          </table>
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn variant="text" @click="dialog = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Create RFQ / Create Tender dialog -->
    <VDialog v-model="createDialog" max-width="640" persistent scrollable>
      <VCard rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">
            Create {{ createType === 'RFQ' ? 'RFQ' : 'Tender' }}
          </VCardTitle>
          <VCardSubtitle>
            {{
              createType === 'RFQ'
                ? 'Buat Request for Quotation baru dan undang vendor untuk memberikan penawaran.'
                : 'Buat Tender baru untuk pengadaan bernilai besar atau kontrak jangka panjang.'
            }}
          </VCardSubtitle>
        </VCardItem>

        <VDivider />

        <VCardText style="max-height: 60vh">
          <VForm ref="createFormRef">
            <div class="form-section-title">Sourcing Information</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField
                  :model-value="createType"
                  label="Type"
                  variant="outlined"
                  density="comfortable"
                  readonly
                  :prepend-inner-icon="
                    createType === 'RFQ' ? 'mdi-file-document-edit-outline' : 'mdi-gavel'
                  "
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="createForm.sourcePr"
                  :items="prOptions"
                  label="Source PR"
                  variant="outlined"
                  density="comfortable"
                  hint="Opsional — hubungkan ke Purchase Requisition terkait"
                  persistent-hint
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="createForm.itemService"
                  label="Item / Service *"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  auto-grow
                  :rules="itemServiceRule"
                  placeholder="e.g. Aircraft Components — Brake Assembly"
                />
              </VCol>
            </VRow>

            <div class="form-section-title">Vendor & Timeline</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="createForm.invitedVendorNames"
                  :items="vendorOptions"
                  label="Invited Vendors *"
                  variant="outlined"
                  density="comfortable"
                  multiple
                  chips
                  closable-chips
                  :rules="vendorRule"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VMenu
                  v-model="deadlineMenu"
                  :close-on-content-click="false"
                  location="bottom start"
                >
                  <template #activator="{ props: menuProps }">
                    <VTextField
                      v-bind="menuProps"
                      v-model="createForm.deadline"
                      label="Deadline *"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      placeholder="Pilih tanggal"
                      prepend-inner-icon="mdi-calendar"
                      :rules="deadlineRule"
                    />
                  </template>
                  <VDatePicker v-model="deadlineDate" @update:model-value="deadlineMenu = false" />
                </VMenu>
              </VCol>
            </VRow>

            <div class="form-section-title">Budget Reference</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="createForm.estimatedBudget"
                  label="Estimated Budget (IDR)"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                  prefix="IDR"
                  hint="Opsional — dipakai sebagai acuan lowest quote awal"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="px-4 py-3">
          <VSpacer />
          <VBtn variant="text" @click="closeCreateDialog">Cancel</VBtn>
          <VBtn
            color="primary"
            variant="flat"
            :prepend-icon="createType === 'RFQ' ? 'mdi-send-outline' : 'mdi-gavel'"
            @click="submitCreate"
          >
            {{ createType === 'RFQ' ? 'Send RFQ' : 'Publish Tender' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
}

.form-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 700;
  margin: 18px 0 10px;
}

.form-section-title:first-of-type {
  margin-top: 0;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.simple-table thead th {
  text-align: left;
  padding: 8px 10px;
  color: #64748b;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid #d9e0e6;
}

.simple-table tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.row-highlight {
  background: #ecfdf5;
}

/* Top floating success banner — mirrors the CRM "Customer added" style */
.success-banner {
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1f8a5c;
  color: #ffffff;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
  max-width: min(640px, calc(100vw - 48px));
}

.success-banner__icon {
  flex-shrink: 0;
}

.success-banner__close {
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

.success-banner__close:hover {
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
