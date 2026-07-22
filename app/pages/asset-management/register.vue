<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import { assetCategories, assetConditionStatuses } from '#shared/features/corporate-assets';
import AssetFormDialog from '../../features/corporate-assets/components/AssetFormDialog.vue';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';
definePageMeta({ layout: 'default' });
const route = useRoute();
const { can } = useAuthorization();
const search = ref('');
const category = ref<string>();
const condition = ref<string>();
const stationId = ref(
  typeof route.query.stationId === 'string' ? route.query.stationId : undefined
);
const showCreate = ref(false);
const query = computed(() => ({
  search: search.value || undefined,
  category: category.value,
  conditionStatus: condition.value,
  stationId: stationId.value
}));
const { data, status, error, refresh } = await useFetch<ApiResponse<any>>(
  '/api/asset-management/assets',
  { query }
);
const result = computed(() => (data.value?.ok ? data.value.data : { items: [], total: 0 }));
const headers = [
  { title: 'Asset', key: 'assetCode' },
  { title: 'Category', key: 'category' },
  { title: 'Station / location', key: 'stationCode' },
  { title: 'Custodian', key: 'custodianName' },
  { title: 'Condition', key: 'conditionStatus' },
  { title: 'Version', key: 'version', align: 'end' as const }
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
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="search"
              label="Search code, name, or serial"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="3">
            <VSelect
              v-model="category"
              :items="assetCategories"
              label="Category"
              clearable
              hide-details
            />
          </VCol><VCol cols="6" md="3">
            <VSelect
              v-model="condition"
              :items="assetConditionStatuses"
              label="Condition"
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
          {{
            item.custodianName ?? 'Unassigned'
          }}
        </template>
        <template #[`item.conditionStatus`]="{ item }">
          <AssetStatusBadge :value="item.conditionStatus" />
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
