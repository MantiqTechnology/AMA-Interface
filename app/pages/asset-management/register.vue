<script setup lang="ts">
import {
  assets as initialAssets,
  type Asset,
  type AssetCategory,
  type AssetStatus,
  locations,
  formatDate
} from '../../data/assetManagementData';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';
import AssetDetailDialog from '../../components/feature/asset-management/AssetDetailDialog.vue';
import AssetFormDialog from '../../components/feature/asset-management/AssetFormDialog.vue';
import AssetQrDialog from '../../components/feature/asset-management/AssetQrDialog.vue';

definePageMeta({ layout: 'default' });

const assetList = reactive<Asset[]>(initialAssets.map((a) => ({ ...a })));

const search = ref('');
const categoryFilter = ref<AssetCategory | 'All Categories'>('All Categories');
const locationFilter = ref('All Locations');
const statusFilter = ref<AssetStatus | 'All Status'>('All Status');

const categories: AssetCategory[] = [
  'Vehicle',
  'GSE',
  'IT Equipment',
  'Building',
  'Machinery',
  'Furniture & Fixture'
];
const statuses: AssetStatus[] = ['Active', 'Maintenance', 'Idle', 'Disposed'];

const headers = [
  { title: 'Asset Code', key: 'code' },
  { title: 'Asset Name', key: 'name' },
  { title: 'Category', key: 'category' },
  { title: 'Brand', key: 'brand' },
  { title: 'Model', key: 'model' },
  { title: 'Serial Number', key: 'serialNumber' },
  { title: 'Location', key: 'location' },
  { title: 'Department', key: 'department' },
  { title: 'PIC', key: 'pic' },
  { title: 'Purchase Date', key: 'purchaseDate' },
  { title: 'Asset Value', key: 'purchaseValue' },
  { title: 'Status', key: 'status' },
  { title: 'Action', key: 'actions', sortable: false, align: 'end' as const }
];

const filteredAssets = computed(() =>
  assetList.filter((a) => {
    const matchesSearch =
      !search.value ||
      a.code.toLowerCase().includes(search.value.toLowerCase()) ||
      a.name.toLowerCase().includes(search.value.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.value.toLowerCase());
    const matchesCategory =
      categoryFilter.value === 'All Categories' || a.category === categoryFilter.value;
    const matchesLocation =
      locationFilter.value === 'All Locations' || a.location === locationFilter.value;
    const matchesStatus = statusFilter.value === 'All Status' || a.status === statusFilter.value;
    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  })
);

function formatIdr(v: number) {
  if (v >= 1_000_000_000) return `IDR ${(v / 1_000_000_000).toFixed(2)} B`;
  return `IDR ${(v / 1_000_000).toFixed(0)} M`;
}

// ---- dialog state ----
const detailOpen = ref(false);
const formOpen = ref(false);
const qrOpen = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const selectedAsset = ref<Asset | null>(null);

const snackbar = ref(false);
const snackbarText = ref('');

function openView(asset: Asset) {
  selectedAsset.value = asset;
  detailOpen.value = true;
}

function openEdit(asset: Asset) {
  selectedAsset.value = asset;
  formMode.value = 'edit';
  detailOpen.value = false;
  formOpen.value = true;
}

function openCreate() {
  selectedAsset.value = null;
  formMode.value = 'create';
  formOpen.value = true;
}

function openQr(asset: Asset) {
  selectedAsset.value = asset;
  detailOpen.value = false;
  qrOpen.value = true;
}

function handleSave(payload: Asset) {
  if (formMode.value === 'create') {
    assetList.unshift(payload);
    snackbarText.value = `Asset "${payload.name}" berhasil ditambahkan (demo).`;
  } else {
    const index = assetList.findIndex((a) => a.code === payload.code);
    if (index !== -1) assetList[index] = payload;
    snackbarText.value = `Asset "${payload.name}" berhasil diperbarui (demo).`;
  }
  snackbar.value = true;
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Register</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">Master list of all company assets.</p>
      </div>
      <VBtn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openCreate">
        Add Asset
      </VBtn>
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
          v-model="categoryFilter"
          :items="['All Categories', ...categories]"
          label="Category"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="locationFilter"
          :items="['All Locations', ...locations]"
          label="Location"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
        <VSelect
          v-model="statusFilter"
          :items="['All Status', ...statuses]"
          label="Status"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
      </div>
    </VCard>

    <VCard border rounded="lg" elevation="0">
      <VDataTable
        :headers="headers"
        :items="filteredAssets"
        item-value="code"
        :items-per-page="10"
        density="comfortable"
      >
        <template #[`item.purchaseDate`]="{ item }">{{ formatDate(item.purchaseDate) }}</template>
        <template #[`item.purchaseValue`]="{ item }">{{ formatIdr(item.purchaseValue) }}</template>
        <template #[`item.status`]="{ item }"><StatusChip :status="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-end" style="gap: 4px">
            <VBtn
              icon="mdi-eye-outline"
              variant="text"
              size="small"
              density="comfortable"
              @click="openView(item)"
            />
            <VBtn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              density="comfortable"
              @click="openEdit(item)"
            />
            <VBtn
              icon="mdi-qrcode"
              variant="text"
              size="small"
              density="comfortable"
              @click="openQr(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <AssetDetailDialog
      v-model="detailOpen"
      :asset="selectedAsset"
      @edit="openEdit"
      @qrcode="openQr"
    />
    <AssetFormDialog
      v-model="formOpen"
      :mode="formMode"
      :asset="selectedAsset"
      @save="handleSave"
    />
    <AssetQrDialog v-model="qrOpen" :asset="selectedAsset" />

    <VSnackbar v-model="snackbar" timeout="3000" color="success">{{ snackbarText }}</VSnackbar>
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
