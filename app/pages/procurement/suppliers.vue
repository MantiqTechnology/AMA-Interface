<script setup lang="ts">
import { suppliers as supplierData } from '../../data/procurement';
import {
  formatProcurementIDR,
  statusColor,
  useProcurementSnackbar
} from '../../composables/useProcurement';
import type { ProcurementCategory, Supplier } from '../../types/procurement';

definePageMeta({ title: 'Suppliers & Vendors' });

const { notify } = useProcurementSnackbar();

const search = ref('');
const categoryFilter = ref('All');
const avlFilter = ref('All');
const isRefreshing = ref(false);

const categories = ['All', ...new Set(supplierData.map((s) => s.category))];
const avlStatuses = ['All', 'Approved', 'Conditional', 'Pending Review', 'Suspended'];

// Options reused by the Add Supplier form (dropdowns should stay within the
// same vocabulary as the existing dummy dataset).
const categoryOptions = [...new Set(supplierData.map((s) => s.category))];
const avlStatusOptions = ['Approved', 'Conditional', 'Pending Review', 'Suspended'];
const statusOptions = ['Active', 'Inactive'];
const paymentTermsOptions = ['Net 14', 'Net 21', 'Net 30', 'Net 45'];

const headers = [
  { title: 'Vendor Code', key: 'vendorCode' },
  { title: 'Company', key: 'company' },
  { title: 'Category', key: 'category' },
  { title: 'Contact', key: 'contactName' },
  { title: 'Lead Time', key: 'leadTimeDays' },
  { title: 'AVL Status', key: 'avlStatus' },
  { title: 'Performance', key: 'performanceScore' },
  { title: 'Certificate Expiry', key: 'certificateExpiry' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'actions', sortable: false }
];

const rows = ref<Supplier[]>(structuredClone(supplierData));

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    const matchesSearch =
      !search.value ||
      r.company.toLowerCase().includes(search.value.toLowerCase()) ||
      r.vendorCode.toLowerCase().includes(search.value.toLowerCase());
    const matchesCategory = categoryFilter.value === 'All' || r.category === categoryFilter.value;
    const matchesAvl = avlFilter.value === 'All' || r.avlStatus === avlFilter.value;
    return matchesSearch && matchesCategory && matchesAvl;
  })
);

const selectedSupplier = ref<Supplier | null>(null);
const drawer = ref(false);

function openDetail(row: Supplier) {
  selectedSupplier.value = row;
  drawer.value = true;
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Supplier data refreshed.', 'info');
}

function exportCsv() {
  const header = 'Vendor Code,Company,Category,AVL Status,Performance,Certificate Expiry\n';
  const body = filteredRows.value
    .map(
      (r) =>
        `${r.vendorCode},${r.company},${r.category},${r.avlStatus},${r.performanceScore},${r.certificateExpiry}`
    )
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suppliers-export.csv';
  a.click();
  URL.revokeObjectURL(url);
  notify('Export CSV berhasil dibuat.', 'success');
}

// ----------------------------------------------------------------------------
// Top floating success banner (like the CRM "Customer added" style) —
// separate from the global bottom-right snackbar. Frontend-only.
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

onBeforeUnmount(() => {
  if (bannerTimeout) clearTimeout(bannerTimeout);
});

// ----------------------------------------------------------------------------
// Add Supplier — full form matching every column shown in the table.
// ----------------------------------------------------------------------------
const addDialog = ref(false);
const addFormRef = ref();

function emptySupplierForm() {
  return {
    company: '',
    category: null as ProcurementCategory | null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    leadTimeDays: null as number | null,
    avlStatus: '' as string,
    performanceScore: null as number | null,
    certificateName: '',
    certificateExpiry: '' as string, // display string e.g. "14 Feb 2027"
    businessLicense: '',
    paymentTerms: '' as string,
    status: 'Active' as string,
    address: ''
  };
}

const newSupplier = ref(emptySupplierForm());

// Date picker state for Certificate Expiry
const expiryMenu = ref(false);
const expiryDate = ref<Date | null>(null);

watch(expiryDate, (val) => {
  if (!val) {
    newSupplier.value.certificateExpiry = '';
    return;
  }
  newSupplier.value.certificateExpiry = val.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

const nameRule = [(v: string) => !!v?.trim() || 'Wajib diisi'];
const emailRule = [(v: string) => !v || /.+@.+\..+/.test(v) || 'Format email tidak valid'];

function resetAddForm() {
  newSupplier.value = emptySupplierForm();
  expiryDate.value = null;
  addFormRef.value?.resetValidation?.();
}

async function addSupplier() {
  const { valid } = await addFormRef.value.validate();
  if (!valid) return;

  const companyName = newSupplier.value.company.trim();

  rows.value.unshift({
    id: `sup-${Date.now()}`,
    vendorCode: `SUP-${String(rows.value.length + 1).padStart(3, '0')}`,
    company: companyName,
    category: 'Aircraft Spare Parts' as Supplier['category'],
    contactName: newSupplier.value.contactName || '-',
    contactEmail: newSupplier.value.contactEmail || '-',
    contactPhone: newSupplier.value.contactPhone || '-',
    leadTimeDays: newSupplier.value.leadTimeDays ?? 0,
    avlStatus: (newSupplier.value.avlStatus || 'Pending Review') as Supplier['avlStatus'],
    performanceScore: newSupplier.value.performanceScore ?? 0,
    certificateName: newSupplier.value.certificateName || '-',
    certificateExpiry: newSupplier.value.certificateExpiry || '-',
    businessLicense: newSupplier.value.businessLicense || '-',
    paymentTerms: newSupplier.value.paymentTerms || '-',
    status: newSupplier.value.status as Supplier['status'],
    address: newSupplier.value.address || '-',
    procurementHistoryCount: 0,
    totalSpend: 0
  });

  const successText = `Supplier baru "${companyName}" berhasil ditambahkan.`;

  addDialog.value = false;
  resetAddForm();
  flashSuccessBanner(successText);
  notify(successText, 'success');
}

function closeAddDialog() {
  addDialog.value = false;
  resetAddForm();
}
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
      eyebrow="Supplier Management"
      title="Suppliers & Vendors"
      subtitle="Manage supplier qualification, certification, AVL status, and vendor master data."
    >
      <template #actions>
        <VBtn color="primary" variant="flat" prepend-icon="mdi-plus" @click="addDialog = true">
          Add Supplier
        </VBtn>
        <VBtn
          variant="outlined"
          :loading="isRefreshing"
          prepend-icon="mdi-refresh"
          @click="refreshData"
        >
          Refresh
        </VBtn>
        <VBtn variant="outlined" prepend-icon="mdi-tray-arrow-down" @click="exportCsv">Export</VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-5" />

    <VRow class="mt-4" dense>
      <VCol cols="12" md="4">
        <VTextField
          v-model="search"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          placeholder="Cari vendor / kode"
        />
      </VCol>
      <VCol cols="6" md="4">
        <VSelect
          v-model="categoryFilter"
          :items="categories"
          density="compact"
          variant="outlined"
          hide-details
          label="Vendor Category"
        />
      </VCol>
      <VCol cols="6" md="4">
        <VSelect
          v-model="avlFilter"
          :items="avlStatuses"
          density="compact"
          variant="outlined"
          hide-details
          label="AVL Status"
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
        <template #item.performanceScore="{ item }">
          <div class="d-flex align-center" style="gap: 8px; min-width: 110px">
            <VProgressLinear
              :model-value="item.performanceScore"
              height="6"
              rounded
              color="teal"
              style="max-width: 70px"
            />
            <span class="text-caption font-weight-bold">{{ item.performanceScore }}</span>
          </div>
        </template>
        <template #item.leadTimeDays="{ item }">{{ item.leadTimeDays }} days</template>
        <template #item.avlStatus="{ item }">
          <VChip :color="statusColor(item.avlStatus)" size="small" variant="tonal">
            {{ item.avlStatus }}
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

    <VNavigationDrawer v-model="drawer" location="right" width="420" temporary>
      <div v-if="selectedSupplier" class="pa-5">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <div class="text-caption text-medium-emphasis">{{ selectedSupplier.vendorCode }}</div>
            <div class="text-h6 font-weight-bold">{{ selectedSupplier.company }}</div>
          </div>
          <VBtn icon="mdi-close" variant="text" size="small" @click="drawer = false" />
        </div>

        <VChip
          :color="statusColor(selectedSupplier.avlStatus)"
          size="small"
          variant="tonal"
          class="mb-4"
        >
          {{ selectedSupplier.avlStatus }}
        </VChip>

        <div class="detail-block">
          <div class="detail-block__title">General Information</div>
          <div class="detail-row">
            <span>Category</span><span>{{ selectedSupplier.category }}</span>
          </div>
          <div class="detail-row">
            <span>Business License</span><span>{{ selectedSupplier.businessLicense }}</span>
          </div>
          <div class="detail-row">
            <span>Address</span><span>{{ selectedSupplier.address }}</span>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-block__title">Contact</div>
          <div class="detail-row">
            <span>Name</span><span>{{ selectedSupplier.contactName }}</span>
          </div>
          <div class="detail-row">
            <span>Email</span><span>{{ selectedSupplier.contactEmail }}</span>
          </div>
          <div class="detail-row">
            <span>Phone</span><span>{{ selectedSupplier.contactPhone }}</span>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-block__title">Aviation Certification</div>
          <div class="detail-row">
            <span>Certificate</span><span>{{ selectedSupplier.certificateName }}</span>
          </div>
          <div class="detail-row">
            <span>Expiry</span><span>{{ selectedSupplier.certificateExpiry }}</span>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-block__title">Commercial</div>
          <div class="detail-row">
            <span>Payment Terms</span><span>{{ selectedSupplier.paymentTerms }}</span>
          </div>
          <div class="detail-row">
            <span>Lead Time</span><span>{{ selectedSupplier.leadTimeDays }} days</span>
          </div>
          <div class="detail-row">
            <span>Performance Score</span><span>{{ selectedSupplier.performanceScore }}/100</span>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-block__title">Procurement History</div>
          <div class="detail-row">
            <span>Transactions</span><span>{{ selectedSupplier.procurementHistoryCount }}</span>
          </div>
          <div class="detail-row">
            <span>Total Spend</span><span>{{ formatProcurementIDR(selectedSupplier.totalSpend) }}</span>
          </div>
        </div>
      </div>
    </VNavigationDrawer>

    <!-- Add Supplier: full form, 2 columns per row max -->
    <VDialog v-model="addDialog" max-width="640" persistent scrollable>
      <VCard rounded="lg">
        <VCardItem>
          <VCardTitle class="text-subtitle-1 font-weight-bold">Add Supplier</VCardTitle>
          <VCardSubtitle>Lengkapi data vendor sesuai kolom Supplier Master.</VCardSubtitle>
        </VCardItem>

        <VDivider />

        <VCardText style="max-height: 60vh">
          <VForm ref="addFormRef">
            <div class="form-section-title">General Information</div>
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="newSupplier.company"
                  label="Company Name *"
                  variant="outlined"
                  density="comfortable"
                  :rules="nameRule"
                  autofocus
                />
              </VCol>
              <VCol cols="12">
                <VSelect
                  v-model="newSupplier.category"
                  :items="categoryOptions"
                  label="Vendor Category"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="newSupplier.businessLicense"
                  label="Business License (NIB)"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="newSupplier.status"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="newSupplier.address"
                  label="Address"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  auto-grow
                />
              </VCol>
            </VRow>

            <div class="form-section-title">Contact</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="newSupplier.contactName"
                  label="Contact Name"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="newSupplier.contactPhone"
                  label="Contact Phone"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model="newSupplier.contactEmail"
                  label="Contact Email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  :rules="emailRule"
                />
              </VCol>
            </VRow>

            <div class="form-section-title">Aviation Certification</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="newSupplier.certificateName"
                  label="Certificate Name"
                  variant="outlined"
                  density="comfortable"
                  placeholder="e.g. CASR 145 Supplier Certificate"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VMenu v-model="expiryMenu" :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props: menuProps }">
                    <VTextField
                      v-bind="menuProps"
                      v-model="newSupplier.certificateExpiry"
                      label="Certificate Expiry"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      placeholder="Pilih tanggal"
                      prepend-inner-icon="mdi-calendar"
                    />
                  </template>
                  <VDatePicker v-model="expiryDate" @update:model-value="expiryMenu = false" />
                </VMenu>
              </VCol>
            </VRow>

            <div class="form-section-title">Commercial &amp; Performance</div>
            <VRow dense>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="newSupplier.paymentTerms"
                  :items="paymentTermsOptions"
                  label="Payment Terms"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="newSupplier.leadTimeDays"
                  label="Lead Time (days)"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSelect
                  v-model="newSupplier.avlStatus"
                  :items="avlStatusOptions"
                  label="AVL Status"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="newSupplier.performanceScore"
                  label="Performance Score (0-100)"
                  type="number"
                  min="0"
                  max="100"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="px-4 py-3">
          <VSpacer />
          <VBtn variant="text" @click="closeAddDialog">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="addSupplier">Save</VBtn>
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

.detail-block {
  margin-bottom: 18px;
}

.detail-block__title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 5px 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-row span:first-child {
  color: #64748b;
}

.detail-row span:last-child {
  color: #0f172a;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
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
