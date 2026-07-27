<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import {
  assetCategories,
  assetConditionStatuses,
  assetLifecycleStatuses
} from '#shared/features/corporate-assets';
import AssetFormDialog from '../../features/corporate-assets/components/AssetFormDialog.vue';
import AssetMetricCard from '../../features/corporate-assets/components/AssetMetricCard.vue';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';
definePageMeta({ layout: 'default' });
const route = useRoute();
const session = useDemoSession();
const { can } = useAuthorization();
const search = ref('');
const category = ref<string>();
const condition = ref<string>();
const lifecycle = ref<string>();
const stationId = ref(
  typeof route.query.stationId === 'string' ? route.query.stationId : undefined
);
const showCreate = ref(false);
const query = computed(() => ({
  search: search.value || undefined,
  category: category.value,
  conditionStatus: condition.value,
  lifecycleStatus: lifecycle.value,
  stationId: stationId.value
}));
const { data: stations, refresh: refreshStations } = await useFetch<ApiResponse<any[]>>(
  '/api/master-data/stations/options'
);
const stationOptions = computed(() =>
  stations.value?.ok
    ? stations.value.data.map((station: any) => ({
        ...station,
        label: `${station.stationCode} · ${station.stationName}`
      }))
    : []
);
const { data, status, error, refresh } = await useFetch<ApiResponse<any>>(
  '/api/asset-management/assets',
  { query: computed(() => ({ ...query.value, limit: 250 })) }
);
const result = computed(() => (data.value?.ok ? data.value.data : { items: [], total: 0 }));
watch(session.role, async () => {
  data.value = null;
  stations.value = null;
  await Promise.all([refresh(), refreshStations()]);
});
const headers = [
  { title: 'Asset', key: 'assetCode' },
  { title: 'Category', key: 'category' },
  { title: 'Station / location', key: 'stationCode' },
  { title: 'Custodian', key: 'custodianName' },
  { title: 'Lifecycle', key: 'lifecycleStatus' },
  { title: 'Condition', key: 'conditionStatus' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
];
</script>
<template>
  <CorporateAssetsShell
    title="Asset Register"
    description="Persistent register with station scope and server-generated asset codes."
  >
    <template #actions>
      <VBtn
        v-if="can('asset.manage').allowed"
        color="primary"
        prepend-icon="mdi-plus"
        @click="showCreate = true"
      >
        Add asset
      </VBtn>
    </template>
    <VRow dense class="mb-4">
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Matching assets"
          :value="result.total"
          icon="mdi-package-variant"
          detail="Current filter"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Serviceable loaded"
          :value="result.items.filter((item: any) => item.conditionStatus === 'SERVICEABLE').length"
          icon="mdi-check-decagram-outline"
          tone="green"
          detail="Current loaded page"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Assigned loaded"
          :value="result.items.filter((item: any) => item.custodyStatus === 'ASSIGNED').length"
          icon="mdi-account-check-outline"
          tone="blue"
          detail="Current loaded page"
        />
      </VCol>
      <VCol cols="6" md="3">
        <AssetMetricCard
          label="Attention loaded"
          :value="
            result.items.filter((item: any) =>
              ['LIMITED', 'UNSERVICEABLE'].includes(item.conditionStatus)
            ).length
          "
          icon="mdi-alert-outline"
          tone="amber"
          detail="Current loaded page"
        />
      </VCol>
    </VRow>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" lg="4">
            <VTextField
              v-model="search"
              label="Search code, name, or serial"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="2">
            <VSelect
              v-model="category"
              :items="assetCategories"
              label="Category"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="2">
            <VSelect
              v-model="condition"
              :items="assetConditionStatuses"
              label="Condition"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="2">
            <VSelect
              v-model="lifecycle"
              :items="assetLifecycleStatuses"
              label="Lifecycle"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="2">
            <VSelect
              v-model="stationId"
              :items="stationOptions"
              item-title="label"
              item-value="id"
              label="Station"
              clearable
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
        Asset register could not be loaded. Check your permission and retry.
      </VAlert>
      <VDataTable :headers="headers" :items="result.items" :loading="status === 'pending'" hover>
        <template #[`item.assetCode`]="{ item }">
          <NuxtLink
            :to="`/asset-management/assets/${item.id}`"
            class="font-weight-bold text-primary"
          >
            {{ item.assetCode }}
          </NuxtLink>
          <div class="text-caption">{{ item.name }}</div>
        </template>
        <template #[`item.category`]="{ item }">{{ item.category.replaceAll('_', ' ') }}</template>
        <template #[`item.stationCode`]="{ item }">
          <div>{{ item.stationCode ?? 'Unassigned' }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.locationDetail }}</div>
        </template>
        <template #[`item.custodianName`]="{ item }">
          {{ item.custodianName ?? 'Unassigned' }}
        </template>
        <template #[`item.lifecycleStatus`]="{ item }">
          <AssetStatusBadge :value="item.lifecycleStatus" />
        </template>
        <template #[`item.conditionStatus`]="{ item }">
          <AssetStatusBadge :value="item.conditionStatus" />
        </template>
        <template #[`item.actions`]="{ item }">
          <VBtn
            :to="`/asset-management/assets/${item.id}`"
            icon="mdi-arrow-right"
            variant="text"
            size="small"
            :aria-label="`Open ${item.assetCode}`"
          />
        </template>
        <template #no-data>
          <VEmptyState
            title="No matching assets"
            text="Adjust the filters or add a Corporate Asset."
            icon="mdi-package-variant"
          />
        </template>
      </VDataTable>
    </VCard>
    <AssetFormDialog v-model="showCreate" @saved="refresh()" />
  </CorporateAssetsShell>
</template>
