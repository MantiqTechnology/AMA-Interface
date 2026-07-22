<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
type Overview = {
  operational: Record<string, number>;
  insurance: { expired: number; expiringSoon: number };
  financial: null | Record<string, number | string | null>;
};
const { data, status, error, refresh } = await useFetch<ApiResponse<Overview>>(
  '/api/asset-management/overview'
);
const overview = computed(() => (data.value?.ok ? data.value.data : null));
const cards = computed(() =>
  overview.value
    ? [
        ['Total assets', overview.value.operational.totalAssets, 'mdi-package-variant-closed'],
        ['Serviceable', overview.value.operational.serviceableAssets, 'mdi-check-decagram-outline'],
        [
          'Under maintenance',
          overview.value.operational.underMaintenance,
          'mdi-wrench-clock-outline'
        ],
        [
          'Audit discrepancies',
          overview.value.operational.auditDiscrepancies,
          'mdi-alert-circle-outline'
        ]
      ]
    : []
);
const idr = (value: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0) / 100);
</script>

<template>
  <CorporateAssetsShell
    title="Overview"
    description="Operational status and Accounting-sourced financial projection."
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
      Corporate Assets overview could not be loaded.
    </VAlert>
    <VRow v-if="status === 'pending' && !overview">
      <VCol v-for="n in 4" :key="n" cols="12" sm="6" lg="3">
        <VSkeletonLoader type="article" />
      </VCol>
    </VRow>
    <template v-else-if="overview">
      <VRow>
        <VCol v-for="card in cards" :key="String(card[0])" cols="12" sm="6" lg="3">
          <VCard border elevation="0">
            <VCardText class="d-flex align-center ga-4">
              <VAvatar color="primary" variant="tonal"><VIcon :icon="String(card[2])" /></VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">{{ card[0] }}</div>
                <div class="text-h5 font-weight-bold">{{ card[1] }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
      <VRow class="mt-1">
        <VCol cols="12" md="6">
          <VCard title="Insurance watch" border elevation="0">
            <VCardText>
              <div class="d-flex justify-space-between mb-3">
                <span>Expiring within 30 days</span><AssetStatusBadge :value="String(overview.insurance.expiringSoon)" />
              </div>
              <div class="d-flex justify-space-between">
                <span>Expired policies</span><span class="font-weight-bold text-error">{{ overview.insurance.expired }}</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard
            title="Financial view"
            subtitle="Read-only projection from Accounting"
            border
            elevation="0"
          >
            <VCardText v-if="overview.financial">
              <div class="d-flex justify-space-between mb-2">
                <span>Capitalized assets</span><strong>{{ overview.financial.capitalizedAssets }}</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Acquisition value</span><strong>{{ idr(overview.financial.acquisitionValue) }}</strong>
              </div>
              <div class="d-flex justify-space-between">
                <span>Current book value</span><strong>{{ idr(overview.financial.currentBookValue) }}</strong>
              </div>
            </VCardText><VCardText v-else class="text-medium-emphasis">
              Financial values require <code>asset.finance.read</code>.
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>
    <VEmptyState
      v-else
      title="No Corporate Asset data"
      text="Run the deterministic demo seed or add the first asset."
      icon="mdi-package-variant"
    />
  </CorporateAssetsShell>
</template>
