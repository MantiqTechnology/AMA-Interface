<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetMetricCard from '../../features/corporate-assets/components/AssetMetricCard.vue';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
const session = useDemoSession();
const { can } = useAuthorization();
const search = ref('');
const discrepancyOnly = ref(false);
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/audits'
);
const audits = computed(() => (data.value?.ok ? data.value.data : []));
watch(session.role, async () => {
  data.value = null;
  await refresh();
});
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return audits.value.filter(
    (item) =>
      (!discrepancyOnly.value || item.hasDiscrepancy) &&
      (!term ||
        [item.auditNumber, item.assetCode, item.assetName, item.auditorNameSnapshot]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)))
  );
});
const discrepancyCount = computed(() => audits.value.filter((item) => item.hasDiscrepancy).length);
const pendingCount = computed(
  () => audits.value.filter((item) => item.hasDiscrepancy && !item.reconciledAt).length
);
const headers = [
  { title: 'Audit', key: 'auditNumber' },
  { title: 'Asset', key: 'assetCode' },
  { title: 'Station / location', key: 'stationCode' },
  { title: 'Auditor', key: 'auditorNameSnapshot' },
  { title: 'Result', key: 'auditStatus' },
  { title: 'Audited at', key: 'auditedAt' }
];
const displayDate = (value: string) => new Date(value).toLocaleString('id-ID');
</script>

<template>
  <CorporateAssetsShell
    title="Asset Audits"
    description="Verifikasi fisik aset dan antrean discrepancy yang perlu direkonsiliasi."
  >
    <template #actions>
      <VBtn
        v-if="can('asset.audit.manage').allowed"
        to="/asset-management/register"
        color="primary"
        prepend-icon="mdi-clipboard-check-outline"
      >
        Pilih aset untuk audit
      </VBtn>
    </template>
    <VRow class="mb-4">
      <VCol cols="12" sm="4">
        <AssetMetricCard
          label="Audit records"
          :value="audits.length"
          icon="mdi-clipboard-text-clock-outline"
          detail="Recorded inspections"
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AssetMetricCard
          label="Discrepancies"
          :value="discrepancyCount"
          icon="mdi-alert-circle-outline"
          tone="amber"
          detail="Physical mismatches"
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AssetMetricCard
          label="Pending reconciliation"
          :value="pendingCount"
          icon="mdi-clipboard-alert-outline"
          tone="red"
          detail="Requires follow-up"
        />
      </VCol>
    </VRow>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="8">
            <VTextField
              v-model="search"
              label="Cari audit, aset, atau auditor"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSwitch
              v-model="discrepancyOnly"
              label="Hanya discrepancy"
              color="primary"
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
        Audit tidak dapat dimuat.
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
        <template #[`item.stationCode`]="{ item }">
          <div>{{ item.stationCode ?? 'Unassigned' }}</div>
          <div class="text-caption">{{ item.locationSnapshot }}</div>
        </template>
        <template #[`item.auditorNameSnapshot`]="{ item }">
          {{ item.auditorEmployeeName ?? item.auditorNameSnapshot }}
        </template>
        <template #[`item.auditStatus`]="{ item }">
          <AssetStatusBadge
            :value="
              item.hasDiscrepancy ? (item.reconciledAt ? 'RECONCILED' : 'DISCREPANCY') : 'MATCH'
            "
          />
        </template>
        <template #[`item.auditedAt`]="{ item }">{{ displayDate(item.auditedAt) }}</template>
        <template #no-data>
          <VEmptyState
            title="Belum ada audit"
            text="Pilih aset dari register untuk memulai audit."
          />
        </template>
      </VDataTable>
    </VCard>
  </CorporateAssetsShell>
</template>
