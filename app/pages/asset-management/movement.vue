<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetMetricCard from '../../features/corporate-assets/components/AssetMetricCard.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
const session = useDemoSession();
const { can } = useAuthorization();
const search = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/movements'
);
const movements = computed(() => (data.value?.ok ? data.value.data : []));
const movementSummary = computed(() => ({
  total: movements.value.length,
  crossStation: movements.value.filter((item: any) => item.fromStationId !== item.toStationId)
    .length,
  custodianChanges: movements.value.filter(
    (item: any) => item.newEmployeeId || item.newCustodianNameSnapshot
  ).length,
  assets: new Set(movements.value.map((item: any) => item.assetId)).size
}));
watch(session.role, async () => {
  data.value = null;
  await refresh();
});
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return movements.value.filter(
    (item) =>
      (!term ||
        [item.movementNumber, item.assetCode, item.assetName, item.fromLocation, item.toLocation]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))) &&
      (!dateFrom.value || item.movedAt.slice(0, 10) >= dateFrom.value) &&
      (!dateTo.value || item.movedAt.slice(0, 10) <= dateTo.value)
  );
});
const headers = [
  { title: 'Movement', key: 'movementNumber' },
  { title: 'Asset', key: 'assetCode' },
  { title: 'From', key: 'fromLocation' },
  { title: 'To', key: 'toLocation' },
  { title: 'New custodian', key: 'newCustodianNameSnapshot' },
  { title: 'Moved at', key: 'movedAt' }
];
const displayDate = (value: string) => new Date(value).toLocaleString('id-ID');
</script>

<template>
  <CorporateAssetsShell
    title="Asset Movements"
    description="Jejak perpindahan lokasi dan custody aset, termasuk perpindahan antar-station."
  >
    <template #actions>
      <VBtn
        v-if="can('asset.move').allowed"
        to="/asset-management/register"
        color="primary"
        prepend-icon="mdi-swap-horizontal"
      >
        Pilih aset untuk dipindah
      </VBtn>
    </template>
    <VRow dense class="mb-4">
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Movements"
          :value="movementSummary.total"
          icon="mdi-map-marker-path"
          detail="Recorded transfers"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Cross-station"
          :value="movementSummary.crossStation"
          icon="mdi-airplane-marker"
          tone="amber"
          detail="Station handovers"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Custodian changes"
          :value="movementSummary.custodianChanges"
          icon="mdi-account-switch-outline"
          tone="blue"
          detail="Movement with reassignment"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Assets moved"
          :value="movementSummary.assets"
          icon="mdi-package-variant"
          tone="slate"
          detail="Unique assets"
        />
      </VCol>
    </VRow>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="search"
              label="Cari movement, aset, atau lokasi"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VDateInput
              v-model="dateFrom"
              prepend-icon=""
              prepend-inner-icon="mdi-calendar"
              label="Dari tanggal"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VDateInput
              v-model="dateTo"
              prepend-icon=""
              prepend-inner-icon="mdi-calendar"
              label="Sampai tanggal"
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
        Movement tidak dapat dimuat.
        <VBtn variant="text" @click="refresh()">Coba lagi</VBtn>
      </VAlert>
      <VDataTable :headers="headers" :items="filtered" :loading="status === 'pending'" hover>
        <template #[`item.assetCode`]="{ item }">
          <NuxtLink
            :to="`/asset-management/assets/${item.assetId}`"
            class="font-weight-bold text-primary"
          >
            {{ item.assetCode }}
          </NuxtLink>
          <div class="text-caption">{{ item.assetName }}</div>
        </template>
        <template #[`item.fromLocation`]="{ item }">
          <div>{{ item.fromLocation }}</div>
          <div class="text-caption">{{ item.fromStationCode ?? 'External' }}</div>
        </template>
        <template #[`item.toLocation`]="{ item }">
          <div>{{ item.toLocation }}</div>
          <div class="text-caption">{{ item.toStationCode ?? 'External' }}</div>
        </template>
        <template #[`item.newCustodianNameSnapshot`]="{ item }">
          {{ item.newEmployeeName ?? item.newCustodianNameSnapshot ?? 'Unchanged' }}
        </template>
        <template #[`item.movedAt`]="{ item }">{{ displayDate(item.movedAt) }}</template>
        <template #no-data>
          <VEmptyState
            title="Belum ada movement"
            text="Pilih aset dari register untuk merekam perpindahan."
          />
        </template>
      </VDataTable>
    </VCard>
  </CorporateAssetsShell>
</template>
