<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
const session = useDemoSession();
const { can } = useAuthorization();
const search = ref('');
const statusFilter = ref<string>();
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/assignments'
);
const assignments = computed(() => (data.value?.ok ? data.value.data : []));
watch(session.role, async () => {
  data.value = null;
  await refresh();
});
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return assignments.value.filter((item) => {
    const active = item.endedAt ? 'RETURNED' : 'ASSIGNED';
    return (
      (!statusFilter.value || active === statusFilter.value) &&
      (!term ||
        [item.assignmentNumber, item.assetCode, item.assetName, item.custodianNameSnapshot]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)))
    );
  });
});
const headers = [
  { title: 'Assignment', key: 'assignmentNumber' },
  { title: 'Asset', key: 'assetCode' },
  { title: 'Custodian', key: 'custodianNameSnapshot' },
  { title: 'Department / station', key: 'departmentName' },
  { title: 'Started', key: 'startedAt' },
  { title: 'Status', key: 'assignmentStatus' }
];
const displayDate = (value: string) => new Date(value).toLocaleString('id-ID');
</script>

<template>
  <CorporateAssetsShell
    title="Asset Assignments"
    description="Riwayat serah terima aset yang tersimpan dan dibatasi sesuai station scope."
  >
    <template #actions>
      <VBtn
        v-if="can('asset.assign').allowed"
        to="/asset-management/register"
        color="primary"
        prepend-icon="mdi-account-arrow-right-outline"
      >
        Pilih aset untuk assign
      </VBtn>
    </template>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="8">
            <VTextField
              v-model="search"
              label="Cari assignment, aset, atau custodian"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="statusFilter"
              :items="['ASSIGNED', 'RETURNED']"
              label="Status"
              clearable
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
        Assignment tidak dapat dimuat.
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
        <template #[`item.custodianNameSnapshot`]="{ item }">
          {{ item.employeeName ?? item.custodianNameSnapshot }}
        </template>
        <template #[`item.departmentName`]="{ item }">
          <div>{{ item.departmentName ?? '—' }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.stationCode ?? 'Unassigned' }}
          </div>
        </template>
        <template #[`item.startedAt`]="{ item }">{{ displayDate(item.startedAt) }}</template>
        <template #[`item.assignmentStatus`]="{ item }">
          <AssetStatusBadge :value="item.endedAt ? 'RETURNED' : 'ASSIGNED'" />
        </template>
        <template #no-data>
          <VEmptyState
            title="Belum ada assignment"
            text="Pilih aset dari register untuk melakukan assignment."
          />
        </template>
      </VDataTable>
    </VCard>
  </CorporateAssetsShell>
</template>
