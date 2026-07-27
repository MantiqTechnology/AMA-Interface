<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetMetricCard from '../../features/corporate-assets/components/AssetMetricCard.vue';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';
definePageMeta({ layout: 'default' });
const session = useDemoSession();
const search = ref('');
const workStatus = ref<string>();
const priority = ref<string>();
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/maintenance-work-orders'
);
const items = computed(() => (data.value?.ok ? data.value.data : []));
watch(session.role, async () => {
  data.value = null;
  await refresh();
});
const liveStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'];
const maintenanceSummary = computed(() => {
  const live = items.value.filter((item: any) => liveStatuses.includes(item.status));
  return {
    live: live.length,
    critical: live.filter((item: any) => item.priority === 'CRITICAL').length,
    waitingParts: live.filter((item: any) => item.status === 'WAITING_PARTS').length,
    completed: items.value.filter((item: any) => item.status === 'COMPLETED').length
  };
});
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return items.value.filter(
    (item) =>
      (!workStatus.value || item.status === workStatus.value) &&
      (!priority.value || item.priority === priority.value) &&
      (!term ||
        [item.workOrderNumber, item.assetCode, item.assetName, item.summary]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)))
  );
});
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
    <VRow dense class="mb-4">
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Live work orders"
          :value="maintenanceSummary.live"
          icon="mdi-wrench-clock-outline"
          tone="amber"
          detail="Active queue"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Critical priority"
          :value="maintenanceSummary.critical"
          icon="mdi-alert-octagon-outline"
          tone="red"
          detail="Immediate attention"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Waiting parts"
          :value="maintenanceSummary.waitingParts"
          icon="mdi-package-variant-closed-clock"
          tone="blue"
          detail="Inventory dependency"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Completed"
          :value="maintenanceSummary.completed"
          icon="mdi-check-circle-outline"
          tone="green"
          detail="Maintenance history"
        />
      </VCol>
    </VRow>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Maintenance queue could not be loaded.
    </VAlert>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="search"
              label="Search work order, asset, or summary"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model="workStatus"
              :items="['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED']"
              label="Status"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model="priority"
              :items="['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']"
              label="Priority"
              clearable
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VDataTable :headers="headers" :items="filtered" :loading="status === 'pending'">
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
