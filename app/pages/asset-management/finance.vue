<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import AssetStatusBadge from '../../features/corporate-assets/components/AssetStatusBadge.vue';
import CorporateAssetsShell from '../../features/corporate-assets/components/CorporateAssetsShell.vue';

definePageMeta({ layout: 'default' });
const session = useDemoSession();
const search = ref('');
const category = ref<string>();
const { data, status, error, refresh } = await useFetch<ApiResponse<any[]>>(
  '/api/asset-management/finance'
);
const rows = computed(() => (data.value?.ok ? data.value.data : []));
watch(session.role, async () => {
  data.value = null;
  await refresh();
});
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  return rows.value.filter(
    (item) =>
      (!category.value || item.category === category.value) &&
      (!term ||
        [item.assetCode, item.assetName, item.assetNumber, item.policyNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)))
  );
});
const categories = computed(() =>
  Array.from(new Set(rows.value.map((item: any) => String(item.category))))
);
const totalsByCurrency = computed(() => {
  const totals = new Map<string, { acquisition: number; book: number }>();
  for (const item of rows.value) {
    if (!item.assetNumber) continue;
    const currency = String(item.currencyCode);
    const current = totals.get(currency) ?? { acquisition: 0, book: 0 };
    current.acquisition += Number(item.acquisitionValueMinor ?? 0);
    current.book += Number(item.currentBookValueMinor ?? 0);
    totals.set(currency, current);
  }
  return Array.from(totals, ([currency, values]) => ({ currency, ...values }));
});
const totalPremium = computed(() =>
  rows.value.reduce((sum, item) => sum + Number(item.premiumMinor ?? 0), 0)
);
const money = (value: unknown, currency = 'IDR') =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0) / 100);
const headers = [
  { title: 'Asset', key: 'assetCode' },
  { title: 'Accounting register', key: 'assetNumber' },
  { title: 'Acquisition', key: 'acquisitionValueMinor', align: 'end' as const },
  { title: 'Book value', key: 'currentBookValueMinor', align: 'end' as const },
  { title: 'Insurance', key: 'policyNumber' },
  { title: 'As of', key: 'asOfDate' }
];
</script>

<template>
  <CorporateAssetsShell
    title="Asset Finance"
    description="Proyeksi read-only dari Accounting dan polis asuransi Corporate Assets."
  >
    <VAlert type="info" variant="tonal" class="mb-4">
      Nilai depresiasi berasal dari Accounting. Corporate Assets tidak menghitung atau memposting
      jurnal sendiri.
    </VAlert>
    <VRow class="mb-4">
      <VCol cols="12" md="4">
        <VCard border elevation="0">
          <VCardText>
            <div class="text-caption">Acquisition value</div>
            <div class="text-h6 font-weight-bold">
              <span v-for="total in totalsByCurrency" :key="total.currency" class="d-block">
                {{ money(total.acquisition, total.currency) }}
              </span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border elevation="0">
          <VCardText>
            <div class="text-caption">Current book value</div>
            <div class="text-h6 font-weight-bold">
              <span v-for="total in totalsByCurrency" :key="total.currency" class="d-block">
                {{ money(total.book, total.currency) }}
              </span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border elevation="0">
          <VCardText>
            <div class="text-caption">Insurance premium</div>
            <div class="text-h6 font-weight-bold">{{ money(totalPremium) }}</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VCard border elevation="0">
      <VCardText>
        <VRow dense>
          <VCol cols="12" md="8">
            <VTextField
              v-model="search"
              label="Cari aset, accounting ID, atau policy"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="category"
              :items="categories"
              label="Category"
              clearable
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
        Data finance tidak dapat dimuat atau role tidak memiliki akses.
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
          <div class="text-caption">
            {{ item.assetName }} · {{ item.stationCode ?? 'Unassigned' }}
          </div>
        </template>
        <template #[`item.assetNumber`]="{ item }">
          <div>{{ item.assetNumber ?? 'Not capitalized' }}</div>
          <AssetStatusBadge :value="item.financialStatus" />
        </template>
        <template #[`item.acquisitionValueMinor`]="{ item }">
          {{ item.assetNumber ? money(item.acquisitionValueMinor, item.currencyCode) : '—' }}
        </template>
        <template #[`item.currentBookValueMinor`]="{ item }">
          {{ item.assetNumber ? money(item.currentBookValueMinor, item.currencyCode) : '—' }}
        </template>
        <template #[`item.policyNumber`]="{ item }">
          <div>{{ item.policyNumber ?? 'No policy' }}</div>
          <div class="text-caption">{{ item.insurer ?? '—' }}</div>
        </template>
        <template #[`item.asOfDate`]="{ item }">{{ item.asOfDate ?? '—' }}</template>
        <template #no-data>
          <VEmptyState
            title="Tidak ada data finance"
            text="Tidak ada aset yang cocok dengan filter."
          />
        </template>
      </VDataTable>
    </VCard>
  </CorporateAssetsShell>
</template>
