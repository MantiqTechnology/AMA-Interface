<script setup lang="ts">
import { audits, assets, locations, formatDate } from '../../data/assetManagementData';
import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';
import AppSectionTabs from '../../components/layout/AppSectionTabs.vue';
import { assetManagementTabs } from '../../data/assetManagementNav';

definePageMeta({ layout: 'default' });

const search = ref('');
const auditPeriod = ref('Q3 2026');
const locationFilter = ref('All Locations');

const headers = [
  { title: 'Audit ID', key: 'auditId' },
  { title: 'Asset Code', key: 'assetCode' },
  { title: 'Asset Name', key: 'assetName' },
  { title: 'Location', key: 'location' },
  { title: 'System Status', key: 'systemStatus' },
  { title: 'Auditor', key: 'auditor' },
  { title: 'Audit Date', key: 'auditDate' }
];

// ---- data lokal (demo only, tanpa backend) ----
const localAudits = ref([...audits]);

const filtered = computed(() =>
  localAudits.value.filter((a) => {
    const matchesSearch =
      !search.value ||
      a.assetName.toLowerCase().includes(search.value.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(search.value.toLowerCase());
    const matchesLocation =
      locationFilter.value === 'All Locations' || a.location === locationFilter.value;
    return matchesSearch && matchesLocation;
  })
);

const totalChecked = computed(() => localAudits.value.length);
const missingCount = computed(
  () => localAudits.value.filter((a) => a.physicalStatus === 'Missing').length
);
const damagedCount = computed(
  () => localAudits.value.filter((a) => a.physicalStatus === 'Damaged').length
);
const auditProgress = computed(() => Math.round((localAudits.value.length / assets.length) * 100));

// ---- bulk verification (checkbox + verify langsung, tanpa modal) ----
const selected = ref<string[]>([]);
const bulkStatus = ref<string>('Match');

const hasSelection = computed(() => selected.value.length > 0);

function applyBulkVerification() {
  if (!hasSelection.value) return;

  localAudits.value.forEach((a) => {
    if (selected.value.includes(a.auditId)) {
      a.physicalStatus = bulkStatus.value as 'Match' | 'Missing' | 'Damaged' | 'Needs Verification';
      a.auditDate = '2026-07-21';
    }
  });

  selected.value = [];
}

function clearSelection() {
  selected.value = [];
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-4" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Audit</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Physical verification against system records.
        </p>
      </div>
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
          v-model="auditPeriod"
          :items="['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']"
          label="Audit Period"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
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
      </div>
    </VCard>

    <VRow class="mb-2">
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Total Checked"
          :value="String(totalChecked)"
          icon="mdi-clipboard-list-outline"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Missing Assets"
          :value="String(missingCount)"
          icon="mdi-help-circle-outline"
          icon-color="#E5484D"
          icon-bg="#FDECEC"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Damaged Assets"
          :value="String(damagedCount)"
          icon="mdi-alert-outline"
          icon-color="#F5A623"
          icon-bg="#FEF3E2"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <VCard border rounded="lg" elevation="0" class="pa-4">
          <div class="d-flex align-start justify-space-between mb-2">
            <span class="text-body-2 text-medium-emphasis">Audit Progress</span>
            <VIcon icon="mdi-progress-check" color="#22B07D" size="20" />
          </div>
          <div class="text-h5 font-weight-bold mb-2">{{ auditProgress }}%</div>
          <VProgressLinear :model-value="auditProgress" color="success" height="8" rounded />
        </VCard>
      </VCol>
    </VRow>

    <!-- Bulk verification bar: muncul saat ada baris yang dicentang -->
    <VCard v-if="hasSelection" border rounded="lg" elevation="0" class="pa-3 mb-4 bulk-bar">
      <div class="d-flex align-center flex-wrap" style="gap: 12px">
        <span class="text-body-2 font-weight-medium"> {{ selected.length }} asset dipilih </span>
        <VSpacer />
        <VBtn
          color="primary"
          prepend-icon="mdi-check-decagram-outline"
          rounded="lg"
          @click="applyBulkVerification"
        >
          Verify Selected
        </VBtn>
        <VBtn variant="text" @click="clearSelection">Cancel</VBtn>
      </div>
    </VCard>

    <VCard border rounded="lg" elevation="0">
      <VDataTable
        v-model="selected"
        :headers="headers"
        :items="filtered"
        item-value="auditId"
        :items-per-page="10"
        density="comfortable"
        show-select
      >
        <template #[`item.auditDate`]="{ item }">{{ formatDate(item.auditDate) }}</template>
        <template #[`item.systemStatus`]="{ item }">
          <StatusChip :status="item.systemStatus" />
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px 12px;
}

.bulk-bar {
  background-color: #edf0ff;
  border-color: #3b5bff33;
}

@media (max-width: 960px) {
  .page-wrap {
    padding: 12px;
  }
}
</style>
