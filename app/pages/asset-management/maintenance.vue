<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';
definePageMeta({ layout: 'default' });
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/maintenance-work-orders'
);
const items = computed(() => (data.value?.ok ? data.value.data : []));
const headers = [
  { title: 'Work order', key: 'workOrderNumber' },
  { title: 'Asset', key: 'assetCode' },
  { title: 'Station', key: 'stationCode' },
  { title: 'Priority', key: 'priority' },
  { title: 'Status', key: 'status' },
  { title: 'Summary', key: 'summary' }
];
</script>
<template>
  <CorporateAssetsShell
    title="Maintenance Queue"
    description="Corporate Asset work orders; stock is consumed only through Inventory part issue."
  >
    <template #actions>
      <VBtn
        prepend-icon="mdi-refresh"
        variant="outlined"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        Refresh
      </VBtn>
    </template>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Maintenance queue could not be loaded.
    </VAlert>
    <VCard border elevation="0">
      <VDataTable :headers="headers" :items="items" :loading="status === 'pending'">
        <template #[`item.workOrderNumber`]="{ item }">
          <NuxtLink
            :to="`/asset-management/assets/${item.assetId}`"
            class="font-weight-bold text-primary"
          >
            {{ item.workOrderNumber }}
          </NuxtLink>
        </template>
        <template #[`item.assetCode`]="{ item }">
          <strong>{{ item.assetCode }}</strong>
          <div class="text-caption">{{ item.assetName }}</div>
        </template>
        <template #[`item.priority`]="{ item }">
          <AssetStatusBadge :value="item.priority" />
        </template><template #[`item.status`]="{ item }"><AssetStatusBadge :value="item.status" /></template>
        <template #no-data>
          <VEmptyState
            title="Maintenance queue is empty"
            text="Open a work order from an asset detail page."
            icon="mdi-wrench-outline"
          />
        </template>
      </VDataTable>
    </VCard>
  </CorporateAssetsShell>
</template>
