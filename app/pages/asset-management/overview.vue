<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetDonutChart from '../../features/corporate-assets/components/AssetDonutChart.vue';
import AssetMetricCard from '../../features/corporate-assets/components/AssetMetricCard.vue';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
type Overview = {
  operational: Record<string, number>;
  insurance: { expired: number; expiringSoon: number };
  financial: null | Record<string, number | string | null>;
};

const session = useDemoSession();
const locationFilter = ref<string>();
const departmentFilter = ref<string>();
const overviewRequest = await useFetch<ApiResponse<Overview>>('/api/asset-management/overview');
const assetsRequest = await useAsyncData('asset-management-overview-assets', async () => {
  const items: any[] = [];
  let offset = 0;
  let total = 0;
  do {
    const response = await $fetch<ApiResponse<any>>('/api/asset-management/assets', {
      query: { limit: 250, offset }
    });
    if (!response.ok) break;
    items.push(...response.data.items);
    total = response.data.total;
    offset += response.data.items.length;
  } while (offset < total);
  return items;
});
const maintenanceRequest = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/maintenance-work-orders'
);
const movementRequest = await useFetch<ApiResponse<any[]>>('/api/asset-management/movements');
const auditRequest = await useFetch<ApiResponse<any[]>>('/api/asset-management/audits');

const overview = computed(() =>
  overviewRequest.data.value?.ok ? overviewRequest.data.value.data : null
);
const assets = computed(() => assetsRequest.data.value ?? []);
const maintenance = computed(() =>
  maintenanceRequest.data.value?.ok ? maintenanceRequest.data.value.data : []
);
const movements = computed(() =>
  movementRequest.data.value?.ok ? movementRequest.data.value.data : []
);
const audits = computed(() => (auditRequest.data.value?.ok ? auditRequest.data.value.data : []));
const stationOptions = computed(() =>
  Array.from(
    new Map(
      assets.value
        .filter((asset: any) => asset.stationCode)
        .map((asset: any) => [asset.stationId, `${asset.stationCode} · ${asset.stationName}`])
    ),
    ([value, title]) => ({ value, title })
  )
);
const departmentOptions = computed(() =>
  Array.from(
    new Map(
      assets.value
        .filter((asset: any) => asset.departmentId)
        .map((asset: any) => [asset.departmentId, asset.departmentName])
    ),
    ([value, title]) => ({ value, title })
  )
);
const filteredAssets = computed(() =>
  assets.value.filter(
    (asset: any) =>
      (!locationFilter.value || asset.stationId === locationFilter.value) &&
      (!departmentFilter.value || asset.departmentId === departmentFilter.value)
  )
);
const filteredAssetIds = computed(
  () => new Set(filteredAssets.value.map((asset: any) => asset.id))
);
const filteredAudits = computed(() =>
  audits.value.filter((audit: any) => filteredAssetIds.value.has(audit.assetId))
);
const filteredMaintenance = computed(() => {
  return maintenance.value.filter((work: any) => filteredAssetIds.value.has(work.assetId));
});
const filteredMovements = computed(() => {
  return movements.value.filter((movement: any) => filteredAssetIds.value.has(movement.assetId));
});
const countBy = (field: string, palette: string[]) => {
  const counts = new Map<string, number>();
  for (const asset of filteredAssets.value) {
    const label = String(asset[field] ?? 'UNASSIGNED');
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, value], index) => ({
    label,
    value,
    color: palette[index % palette.length]
  })).sort((a, b) => b.value - a.value);
};
const categorySegments = computed(() =>
  countBy('category', ['#3456d1', '#168461', '#b66a08', '#596579', '#7a56b3', '#c53b43'])
);
const conditionSegments = computed(() =>
  countBy('conditionStatus', ['#168461', '#b66a08', '#3456d1', '#c53b43'])
);
const stationSegments = computed(() =>
  countBy('stationCode', ['#27449a', '#168461', '#b66a08', '#7a56b3', '#596579'])
);
const liveMaintenance = computed(
  () =>
    filteredMaintenance.value.filter((work: any) =>
      ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'].includes(work.status)
    ).length
);
const maintenanceAttention = computed(() =>
  filteredMaintenance.value.filter((work: any) =>
    ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'].includes(work.status)
  )
);
const discrepancyCount = computed(
  () =>
    filteredAudits.value.filter(
      (audit: any) => Boolean(audit.hasDiscrepancy) && !audit.reconciledAt
    ).length
);
const loading = computed(
  () =>
    overviewRequest.status.value === 'pending' ||
    assetsRequest.status.value === 'pending' ||
    maintenanceRequest.status.value === 'pending' ||
    movementRequest.status.value === 'pending' ||
    auditRequest.status.value === 'pending'
);
const hasError = computed(
  () =>
    overviewRequest.error.value ||
    assetsRequest.error.value ||
    maintenanceRequest.error.value ||
    movementRequest.error.value ||
    auditRequest.error.value
);
const idr = (value: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value ?? 0) / 100);
const displayDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
async function refreshAll() {
  overviewRequest.data.value = null;
  assetsRequest.data.value = null;
  maintenanceRequest.data.value = null;
  movementRequest.data.value = null;
  auditRequest.data.value = null;
  await Promise.all([
    overviewRequest.refresh(),
    assetsRequest.refresh(),
    maintenanceRequest.refresh(),
    movementRequest.refresh(),
    auditRequest.refresh()
  ]);
}
watch(session.role, refreshAll);
</script>

<template>
  <CorporateAssetsShell
    title="Asset Control Overview"
    description="Live operational posture across custody, condition, maintenance, audit, and finance."
  >
    <template #actions>
      <VBtn prepend-icon="mdi-refresh" variant="outlined" :loading="loading" @click="refreshAll">
        Refresh
      </VBtn>
    </template>

    <VCard border elevation="0" class="filter-bar mb-5">
      <VCardText>
        <div class="scope-controls d-flex flex-wrap align-center ga-3">
          <div class="filter-title">
            <VIcon icon="mdi-tune-variant" size="18" />
            Scope
          </div>
          <VSelect
            v-model="locationFilter"
            :items="stationOptions"
            label="Station"
            density="compact"
            variant="outlined"
            clearable
            hide-details
            max-width="240"
            class="scope-select"
          />
          <VSelect
            v-model="departmentFilter"
            :items="departmentOptions"
            label="Department"
            density="compact"
            variant="outlined"
            clearable
            hide-details
            max-width="240"
            class="scope-select"
          />
          <VSpacer />
          <div class="scope-count text-caption text-medium-emphasis">
            {{ filteredAssets.length }} of {{ assets.length }} assets in view
          </div>
        </div>
      </VCardText>
    </VCard>

    <VAlert v-if="hasError" type="error" variant="tonal" class="mb-4">
      Some asset-control data could not be loaded.
    </VAlert>
    <VRow v-if="loading && !assets.length">
      <VCol v-for="n in 6" :key="n" cols="12" sm="6" lg="2">
        <VSkeletonLoader type="article" />
      </VCol>
    </VRow>
    <template v-else>
      <VRow dense class="mb-4">
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Assets in scope"
            :value="filteredAssets.length"
            icon="mdi-package-variant-closed"
            detail="Persistent register"
          />
        </VCol>
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Serviceable"
            :value="
              filteredAssets.filter((item: any) => item.conditionStatus === 'SERVICEABLE').length
            "
            icon="mdi-check-decagram-outline"
            tone="green"
            detail="Ready for use"
          />
        </VCol>
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Live maintenance"
            :value="liveMaintenance"
            icon="mdi-wrench-clock-outline"
            tone="amber"
            detail="Open work orders"
          />
        </VCol>
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Unserviceable"
            :value="
              filteredAssets.filter((item: any) => item.conditionStatus === 'UNSERVICEABLE').length
            "
            icon="mdi-alert-octagon-outline"
            tone="red"
            detail="Requires action"
          />
        </VCol>
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Audit exceptions"
            :value="discrepancyCount"
            icon="mdi-clipboard-alert-outline"
            tone="red"
            detail="Pending reconciliation"
          />
        </VCol>
        <VCol cols="6" md="4" lg="2">
          <AssetMetricCard
            label="Portfolio book value"
            :value="overview?.financial ? idr(overview.financial.currentBookValue) : 'Restricted'"
            icon="mdi-calculator-variant-outline"
            tone="slate"
            detail="All permitted assets"
          />
        </VCol>
      </VRow>

      <VRow class="mb-2">
        <VCol cols="12" lg="8">
          <VCard border elevation="0" class="h-100">
            <VCardTitle class="panel-title">Fleet composition</VCardTitle>
            <VCardSubtitle>Persistent register breakdown for the active scope</VCardSubtitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <div class="chart-label">By category</div>
                  <AssetDonutChart
                    :segments="categorySegments"
                    :total="filteredAssets.length"
                    caption="Registered"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <div class="chart-label">By condition</div>
                  <AssetDonutChart
                    :segments="conditionSegments"
                    :total="filteredAssets.length"
                    caption="Condition"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" lg="4">
          <VCard border elevation="0" class="h-100">
            <VCardTitle class="panel-title">Station footprint</VCardTitle>
            <VCardSubtitle>Current custody location</VCardSubtitle>
            <VCardText>
              <AssetDonutChart
                :segments="stationSegments"
                :total="filteredAssets.length"
                caption="In scope"
              />
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" lg="7">
          <VCard border elevation="0" class="h-100">
            <VCardTitle class="d-flex align-center">
              <span class="panel-title">Maintenance attention</span>
              <VSpacer />
              <VBtn to="/asset-management/maintenance" variant="text" append-icon="mdi-arrow-right">
                Open queue
              </VBtn>
            </VCardTitle>
            <VTable density="comfortable">
              <thead>
                <tr>
                  <th>Work order</th>
                  <th>Asset</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="work in maintenanceAttention.slice(0, 5)" :key="work.id">
                  <td>
                    <NuxtLink
                      :to="`/asset-management/assets/${work.assetId}`"
                      class="font-weight-bold text-primary"
                    >
                      {{ work.workOrderNumber }}
                    </NuxtLink>
                  </td>
                  <td>
                    <strong>{{ work.assetCode }}</strong>
                    <div class="text-caption">{{ work.assetName }}</div>
                  </td>
                  <td><AssetStatusBadge :value="work.priority" /></td>
                  <td><AssetStatusBadge :value="work.status" /></td>
                </tr>
              </tbody>
            </VTable>
            <VEmptyState
              v-if="!maintenanceAttention.length"
              title="No maintenance attention needed"
              icon="mdi-check-circle-outline"
            />
          </VCard>
        </VCol>
        <VCol cols="12" lg="5">
          <VCard border elevation="0" class="h-100">
            <VCardTitle class="d-flex align-center">
              <span class="panel-title">Recent custody movement</span>
              <VSpacer />
              <VBtn
                to="/asset-management/movement"
                variant="text"
                icon="mdi-arrow-right"
                aria-label="Open movements"
              />
            </VCardTitle>
            <VList lines="two">
              <VListItem
                v-for="movement in filteredMovements.slice(0, 5)"
                :key="movement.id"
                :to="`/asset-management/assets/${movement.assetId}`"
              >
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" size="36">
                    <VIcon icon="mdi-swap-horizontal" size="18" />
                  </VAvatar>
                </template>
                <VListItemTitle>{{ movement.assetCode }} · {{ movement.assetName }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ movement.fromLocation }} → {{ movement.toLocation }} ·
                  {{ displayDate(movement.movedAt) }}
                </VListItemSubtitle>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!filteredMovements.length"
              title="No movement recorded"
              icon="mdi-map-marker-path"
            />
          </VCard>
        </VCol>
      </VRow>
    </template>
  </CorporateAssetsShell>
</template>

<style scoped>
.filter-bar,
:deep(.v-card) {
  border-radius: 14px;
}

.filter-bar {
  background: rgba(var(--v-theme-primary), 0.035);
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 700;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
}

.chart-label {
  margin-bottom: 18px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@media (max-width: 600px) {
  .scope-controls {
    align-items: stretch !important;
  }

  .filter-title,
  .scope-select,
  .scope-count {
    width: 100%;
    max-width: none !important;
  }

  .scope-count {
    padding-top: 4px;
    text-align: right;
  }
}
</style>
