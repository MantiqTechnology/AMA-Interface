<script setup lang="ts">
import { assets, disposals, formatDate, type AssetCategory } from '../../data/assetManagementData';
import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

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

const filteredAssets = computed(() =>
  assets.filter((a) => {
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

const totalAssetValue = computed(() => assets.reduce((sum, a) => sum + a.purchaseValue, 0));
const currentBookValue = computed(() => assets.reduce((sum, a) => sum + a.bookValue, 0));
const monthlyDepreciation = computed(() =>
  assets.reduce((sum, a) => sum + a.monthlyDepreciation, 0)
);
const insuranceCost = computed(() =>
  assets.reduce((sum, a) => sum + (a.insurance?.premium ?? 0), 0)
);

function formatBillions(v: number) {
  if (v >= 1_000_000_000) return `IDR ${(v / 1_000_000_000).toFixed(2)} B`;
  return `IDR ${(v / 1_000_000).toFixed(1)} M`;
}

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
</script>

<template>
  <div class="page-wrap">
    <div class="mb-1">
      <h1 class="text-h5 font-weight-bold mb-1">Asset Finance</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Depreciation, insurance, and disposal in one place.
      </p>
    </div>

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

    <VCard border rounded="lg" elevation="0" class="pa-4 mb-6">
      <div class="text-subtitle-1 font-weight-bold mb-3">Depreciation</div>
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
          {{
            formatBillions(item.purchaseValue)
          }}
        </template>
        <template #[`item.usefulLifeYears`]="{ item }">{{ item.usefulLifeYears }} yrs</template>
        <template #[`item.monthlyDepreciation`]="{ item }">
          {{
            formatBillions(item.monthlyDepreciation)
          }}
        </template>
        <template #[`item.bookValue`]="{ item }">{{ formatBillions(item.bookValue) }}</template>
      </VDataTable>
    </VCard>

    <VCard border rounded="lg" elevation="0" class="pa-4 mb-6">
      <div class="text-subtitle-1 font-weight-bold mb-3">Insurance</div>
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
          {{
            formatBillions(item.insurance!.coverage)
          }}
        </template>
        <template #[`item.premium`]="{ item }">
          {{
            formatBillions(item.insurance!.premium)
          }}
        </template>
        <template #[`item.expiryDate`]="{ item }">
          {{
            formatDate(item.insurance!.expiryDate)
          }}
        </template>
      </VDataTable>
    </VCard>

    <VCard border rounded="lg" elevation="0" class="pa-4">
      <div class="text-subtitle-1 font-weight-bold mb-3">Disposal</div>
      <VDataTable
        :headers="disposalHeaders"
        :items="disposals"
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
          {{
            item.disposalValue > 0 ? formatBillions(item.disposalValue) : '-'
          }}
        </template>
        <template #[`item.approvalStatus`]="{ item }">
          <StatusChip :status="item.approvalStatus" />
        </template>
      </VDataTable>
    </VCard>
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
