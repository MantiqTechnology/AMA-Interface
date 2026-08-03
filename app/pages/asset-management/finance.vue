<script setup lang="ts">
import { assets, disposals, formatDate, type AssetCategory } from '../../data/assetManagementData';
import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';
import AppSectionTabs from '../../components/layout/AppSectionTabs.vue';
import { assetManagementTabs } from '../../data/assetManagementNav';

definePageMeta({ layout: 'default' });

const search = ref('');
const fiscalYear = ref('2026');
const categoryFilter = ref('All Categories');

const categories: AssetCategory[] = [
  'Vehicle',
  'GSE',
  'IT Equipment',
  'Building',
  'Machinery',
  'Furniture & Fixture'
];

// ---- data lokal (demo only, tanpa backend) ----
const localAssets = ref(structuredClone(assets));
const localDisposals = ref(structuredClone(disposals));

const filteredAssets = computed(() =>
  localAssets.value.filter((a) => {
    const matchesSearch =
      !search.value ||
      a.name.toLowerCase().includes(search.value.toLowerCase()) ||
      a.code.toLowerCase().includes(search.value.toLowerCase());
    const matchesCategory =
      categoryFilter.value === 'All Categories' || a.category === categoryFilter.value;
    return matchesSearch && matchesCategory;
  })
);

const insuredAssets = computed(() => filteredAssets.value.filter((a) => a.insurance));

const totalAssetValue = computed(() =>
  localAssets.value.reduce((sum, a) => sum + a.purchaseValue, 0)
);
const currentBookValue = computed(() => localAssets.value.reduce((sum, a) => sum + a.bookValue, 0));
const monthlyDepreciation = computed(() =>
  localAssets.value.reduce((sum, a) => sum + a.monthlyDepreciation, 0)
);
const insuranceCost = computed(() =>
  localAssets.value.reduce((sum, a) => sum + (a.insurance?.premium ?? 0), 0)
);

function formatBillions(v: number) {
  if (v >= 1_000_000_000) return `IDR ${(v / 1_000_000_000).toFixed(2)} B`;
  return `IDR ${(v / 1_000_000).toFixed(1)} M`;
}

const assetOptions = computed(() =>
  localAssets.value.map((a) => ({ title: `${a.code} - ${a.name}`, value: a.code }))
);

const rules = {
  required: (v: unknown) => (v !== null && v !== '' && v !== undefined) || 'Wajib diisi'
};

const depreciationHeaders = [
  { title: 'Asset', key: 'name' },
  { title: 'Purchase Value', key: 'purchaseValue' },
  { title: 'Useful Life', key: 'usefulLifeYears' },
  { title: 'Monthly Depreciation', key: 'monthlyDepreciation' },
  { title: 'Current Book Value', key: 'bookValue' }
];

const insuranceHeaders = [
  { title: 'Asset', key: 'name' },
  { title: 'Insurance Company', key: 'company' },
  { title: 'Policy Number', key: 'policyNumber' },
  { title: 'Coverage', key: 'coverage' },
  { title: 'Premium', key: 'premium' },
  { title: 'Expiry Date', key: 'expiryDate' }
];

const disposalHeaders = [
  { title: 'Asset', key: 'assetName' },
  { title: 'Disposal Type', key: 'disposalType' },
  { title: 'Disposal Date', key: 'disposalDate' },
  { title: 'Disposal Value', key: 'disposalValue' },
  { title: 'Approval Status', key: 'approvalStatus' }
];

// =====================================================
// ---- modal "Add Depreciation" ----
// Purchase Value read-only (auto dari asset), Useful Life diisi user,
// Monthly Depreciation dihitung otomatis (read-only)
// =====================================================
const depDialogOpen = ref(false);
const depFormRef = ref();

const depForm = ref({
  assetCode: null as string | null,
  usefulLifeYears: null as number | null
});

const depSelectedAsset = computed(() =>
  localAssets.value.find((a) => a.code === depForm.value.assetCode)
);

const depPurchaseValue = computed(() => depSelectedAsset.value?.purchaseValue ?? 0);

const depMonthlyDepreciation = computed(() => {
  if (!depForm.value.usefulLifeYears || depForm.value.usefulLifeYears <= 0) return 0;
  return depPurchaseValue.value / (depForm.value.usefulLifeYears * 12);
});

function openDepDialog() {
  depForm.value = { assetCode: null, usefulLifeYears: null };
  depDialogOpen.value = true;
}

async function submitDepForm() {
  const { valid } = await depFormRef.value?.validate();
  if (!valid) return;

  const target = localAssets.value.find((a) => a.code === depForm.value.assetCode);
  if (target) {
    target.usefulLifeYears = Number(depForm.value.usefulLifeYears);
    target.monthlyDepreciation = depMonthlyDepreciation.value;
  }

  depDialogOpen.value = false;
}

// =====================================================
// ---- modal "Add Insurance" ----
// =====================================================
const insDialogOpen = ref(false);
const insFormRef = ref();

const defaultInsForm = () => ({
  assetCode: null as string | null,
  company: '',
  policyNumber: '',
  coverage: null as number | null,
  premium: null as number | null,
  expiryDate: '2026-12-31'
});

const insForm = ref(defaultInsForm());

const insSelectedAsset = computed(() =>
  localAssets.value.find((a) => a.code === insForm.value.assetCode)
);

function openInsDialog() {
  insForm.value = defaultInsForm();
  insDialogOpen.value = true;
}

async function submitInsForm() {
  const { valid } = await insFormRef.value?.validate();
  if (!valid) return;

  const target = localAssets.value.find((a) => a.code === insForm.value.assetCode);
  if (target) {
    target.insurance = {
      company: insForm.value.company,
      policyNumber: insForm.value.policyNumber,
      coverage: Number(insForm.value.coverage ?? 0),
      premium: Number(insForm.value.premium ?? 0),
      expiryDate: insForm.value.expiryDate
    };
  }

  insDialogOpen.value = false;
}

// =====================================================
// ---- modal "Add Disposal" ----
// =====================================================
const disposalTypes = ['Sold', 'Scrapped', 'Donated', 'Write-off'];
const approvalStatuses = ['Pending', 'Approved', 'Rejected'];

const dspDialogOpen = ref(false);
const dspFormRef = ref();

const defaultDspForm = () => ({
  assetCode: null as string | null,
  disposalType: 'Sold' as string,
  disposalDate: '2026-07-21',
  disposalValue: null as number | null,
  approvalStatus: 'Pending' as string
});

const dspForm = ref(defaultDspForm());

const dspSelectedAsset = computed(() =>
  localAssets.value.find((a) => a.code === dspForm.value.assetCode)
);

function openDspDialog() {
  dspForm.value = defaultDspForm();
  dspDialogOpen.value = true;
}

async function submitDspForm() {
  const { valid } = await dspFormRef.value?.validate();
  if (!valid) return;

  const asset = localAssets.value.find((a) => a.code === dspForm.value.assetCode);

  localDisposals.value.unshift({
    assetCode: dspForm.value.assetCode ?? '',
    assetName: asset?.name ?? '',
    disposalType: dspForm.value.disposalType as 'Sold' | 'Scrapped' | 'Donated',
    disposalDate: dspForm.value.disposalDate,
    disposalValue: Number(dspForm.value.disposalValue ?? 0),
    approvalStatus: dspForm.value.approvalStatus as 'Pending' | 'Approved' | 'Rejected'
  });

  dspDialogOpen.value = false;
}
</script>

<template>
  <div class="page-wrap">
    <div class="mb-4">
      <h1 class="text-h5 font-weight-bold mb-1">Asset Finance</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Depreciation, insurance, and disposal in one place.
      </p>
    </div>

    <AppSectionTabs :items="assetManagementTabs" />

    <VCard border rounded="lg" elevation="0" class="pa-4 mt-4 mb-6">
      <div class="d-flex align-end flex-wrap" style="gap: 16px">
        <VTextField
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 260px"
        />
        <VSelect
          v-model="fiscalYear"
          :items="['2024', '2025', '2026']"
          label="Fiscal Year"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 160px"
        />
        <VSelect
          v-model="categoryFilter"
          :items="['All Categories', ...categories]"
          label="Asset Category"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />
      </div>
    </VCard>

    <VRow class="mb-2">
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Total Asset Value"
          :value="formatBillions(totalAssetValue)"
          icon="mdi-briefcase-outline"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Current Book Value"
          :value="formatBillions(currentBookValue)"
          icon="mdi-book-open-variant"
          icon-color="#22B07D"
          icon-bg="#E7F8F1"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Monthly Depreciation"
          :value="formatBillions(monthlyDepreciation)"
          icon="mdi-chart-line"
          icon-color="#F5A623"
          icon-bg="#FEF3E2"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Insurance Cost"
          :value="formatBillions(insuranceCost)"
          icon="mdi-shield-check-outline"
          icon-color="#8B5CF6"
          icon-bg="#F1EDFE"
        />
      </VCol>
    </VRow>

    <!-- Depreciation -->
    <VCard border rounded="lg" elevation="0" class="pa-4 mb-6">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-1 font-weight-bold">Depreciation</div>
        <VBtn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          rounded="lg"
          @click="openDepDialog"
        >
          Add Depreciation
        </VBtn>
      </div>
      <VDataTable
        :headers="depreciationHeaders"
        :items="filteredAssets"
        item-value="code"
        :items-per-page="8"
        density="comfortable"
      >
        <template #[`item.name`]="{ item }">
          <div class="font-weight-medium">{{ item.code }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.name }}</div>
        </template>
        <template #[`item.purchaseValue`]="{ item }">
          {{ formatBillions(item.purchaseValue) }}
        </template>
        <template #[`item.usefulLifeYears`]="{ item }">{{ item.usefulLifeYears }} yrs</template>
        <template #[`item.monthlyDepreciation`]="{ item }">
          {{ formatBillions(item.monthlyDepreciation) }}
        </template>
        <template #[`item.bookValue`]="{ item }">{{ formatBillions(item.bookValue) }}</template>
      </VDataTable>
    </VCard>

    <!-- Insurance -->
    <VCard border rounded="lg" elevation="0" class="pa-4 mb-6">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-1 font-weight-bold">Insurance</div>
        <VBtn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          rounded="lg"
          @click="openInsDialog"
        >
          Add Insurance
        </VBtn>
      </div>
      <VDataTable
        :headers="insuranceHeaders"
        :items="insuredAssets"
        item-value="code"
        :items-per-page="8"
        density="comfortable"
      >
        <template #[`item.name`]="{ item }">
          <div class="font-weight-medium">{{ item.code }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.name }}</div>
        </template>
        <template #[`item.company`]="{ item }">{{ item.insurance!.company }}</template>
        <template #[`item.policyNumber`]="{ item }">{{ item.insurance!.policyNumber }}</template>
        <template #[`item.coverage`]="{ item }">
          {{ formatBillions(item.insurance!.coverage) }}
        </template>
        <template #[`item.premium`]="{ item }">
          {{ formatBillions(item.insurance!.premium) }}
        </template>
        <template #[`item.expiryDate`]="{ item }">
          {{ formatDate(item.insurance!.expiryDate) }}
        </template>
      </VDataTable>
    </VCard>

    <!-- Disposal -->
    <VCard border rounded="lg" elevation="0" class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-1 font-weight-bold">Disposal</div>
        <VBtn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          rounded="lg"
          @click="openDspDialog"
        >
          Add Disposal
        </VBtn>
      </div>
      <VDataTable
        :headers="disposalHeaders"
        :items="localDisposals"
        item-value="assetCode"
        :items-per-page="8"
        density="comfortable"
      >
        <template #[`item.assetName`]="{ item }">
          <div class="font-weight-medium">{{ item.assetCode }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.assetName }}</div>
        </template>
        <template #[`item.disposalDate`]="{ item }">{{ formatDate(item.disposalDate) }}</template>
        <template #[`item.disposalValue`]="{ item }">
          {{ item.disposalValue > 0 ? formatBillions(item.disposalValue) : '-' }}
        </template>
        <template #[`item.approvalStatus`]="{ item }">
          <StatusChip :status="item.approvalStatus" />
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal: Add Depreciation -->
    <VDialog v-model="depDialogOpen" max-width="520">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Add Depreciation</span>
          <VBtn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="depDialogOpen = false"
          />
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VForm ref="depFormRef">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="depForm.assetCode"
                  :items="assetOptions"
                  label="Asset"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  :model-value="depSelectedAsset ? formatBillions(depPurchaseValue) : ''"
                  label="Purchase Value"
                  variant="outlined"
                  density="compact"
                  readonly
                  hint="Otomatis dari data asset"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="depForm.usefulLifeYears"
                  type="number"
                  label="Useful Life (Years)"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  :model-value="
                    depForm.usefulLifeYears ? formatBillions(depMonthlyDepreciation) : ''
                  "
                  label="Monthly Depreciation"
                  variant="outlined"
                  density="compact"
                  readonly
                  hint="Purchase Value ÷ (Useful Life × 12)"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="depDialogOpen = false">Cancel</VBtn>
          <VBtn color="primary" @click="submitDepForm">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal: Add Insurance -->
    <VDialog v-model="insDialogOpen" max-width="560">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Add Insurance</span>
          <VBtn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="insDialogOpen = false"
          />
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VForm ref="insFormRef">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="insForm.assetCode"
                  :items="assetOptions"
                  label="Asset"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol v-if="insSelectedAsset" cols="12">
                <VTextField
                  :model-value="formatBillions(insSelectedAsset.purchaseValue)"
                  label="Asset Purchase Value"
                  variant="outlined"
                  density="compact"
                  readonly
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="insForm.company"
                  label="Insurance Company"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="insForm.policyNumber"
                  label="Policy Number"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="insForm.coverage"
                  type="number"
                  label="Coverage (IDR)"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="insForm.premium"
                  type="number"
                  label="Premium (IDR)"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="insForm.expiryDate"
                  type="date"
                  label="Expiry Date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="insDialogOpen = false">Cancel</VBtn>
          <VBtn color="primary" @click="submitInsForm">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal: Add Disposal -->
    <VDialog v-model="dspDialogOpen" max-width="560">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Add Disposal</span>
          <VBtn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="dspDialogOpen = false"
          />
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VForm ref="dspFormRef">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="dspForm.assetCode"
                  :items="assetOptions"
                  label="Asset"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol v-if="dspSelectedAsset" cols="12">
                <VTextField
                  :model-value="formatBillions(dspSelectedAsset.bookValue)"
                  label="Current Book Value"
                  variant="outlined"
                  density="compact"
                  readonly
                  hint="Referensi nilai buku saat ini"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="dspForm.disposalType"
                  :items="disposalTypes"
                  label="Disposal Type"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="dspForm.disposalDate"
                  type="date"
                  label="Disposal Date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="dspForm.disposalValue"
                  type="number"
                  label="Disposal Value (IDR)"
                  variant="outlined"
                  density="compact"
                  hint="Kosongkan / 0 jika tidak ada nilai jual"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="dspForm.approvalStatus"
                  :items="approvalStatuses"
                  label="Approval Status"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="dspDialogOpen = false">Cancel</VBtn>
          <VBtn color="primary" @click="submitDspForm">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px 12px;
}

@media (max-width: 960px) {
  .page-wrap {
    padding: 12px;
  }
}
</style>
