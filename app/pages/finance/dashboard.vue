<script setup lang="ts">
import type {
  FinanceDashboardDto,
  FinanceReportingPeriodDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Finance Dashboard - PT AMA' });
const selectedPeriod = ref<string>();
const {
  data: periods,
  pending: periodsPending,
  error: periodsError
} = await useAsyncData('finance-periods', () =>
  fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods')
);
watchEffect(() => {
  if (!selectedPeriod.value && periods.value?.[0]) selectedPeriod.value = periods.value[0].code;
});
const query = computed(() => (selectedPeriod.value ? { period: selectedPeriod.value } : {}));
const {
  data: dashboard,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-phase-one-dashboard',
  () => fetchApi<FinanceDashboardDto>('/api/finance/reporting/dashboard', { query: query.value }),
  { watch: [query] }
);
const periodOptions = computed(() =>
  (periods.value ?? []).map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);
const icons: Record<string, string> = {
  REVENUE: 'mdi-chart-line',
  EXPENSE: 'mdi-chart-timeline-variant-shimmer',
  NET_INCOME: 'mdi-scale-balance',
  CASH: 'mdi-bank-outline',
  AR: 'mdi-account-cash-outline',
  AP: 'mdi-file-document-arrow-right-outline'
};
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
function toneColor(tone: string) {
  if (tone === 'SUCCESS') return 'success';
  if (tone === 'DANGER') return 'error';
  if (tone === 'WARNING') return 'warning';
  return 'primary';
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Finance Dashboard</h1>
        <p class="text-body-2 text-text-secondary">
          Posted GL, canonical subledgers, and Finance control exceptions.
        </p>
      </div>
      <VSpacer />
      <VSelect
        v-model="selectedPeriod"
        :disabled="periodsPending"
        hide-details
        :items="periodOptions"
        label="Accounting period"
        style="max-width: 260px"
        variant="outlined"
      />
      <VBtn
        aria-label="Refresh Finance dashboard"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh()"
      />
    </header>

    <VAlert
      v-if="error || periodsError"
      class="mb-4"
      color="error"
      title="Finance dashboard unavailable"
      variant="tonal"
    >
      {{ error?.message || periodsError?.message }}
    </VAlert>
    <VSkeletonLoader v-if="pending && !dashboard" type="card, card, card" />

    <template v-else-if="dashboard">
      <section class="metric-grid mb-5" aria-label="Finance Phase 1 metrics">
        <VCard
          v-for="metric in dashboard.metrics"
          :key="metric.key"
          border
          class="pa-4"
          rounded="lg"
        >
          <div class="d-flex align-start ga-3">
            <VAvatar :color="toneColor(metric.tone)" rounded="lg" variant="tonal">
              <VIcon :icon="icons[metric.key] ?? 'mdi-finance'" />
            </VAvatar>
            <div class="min-w-0">
              <div class="text-caption text-text-secondary">{{ metric.label }}</div>
              <div class="text-h6 font-weight-bold text-truncate">
                {{ money(metric.valueMinor) }}
              </div>
              <div class="text-caption text-text-secondary">{{ metric.caption }}</div>
            </div>
          </div>
        </VCard>
      </section>

      <VCard border class="pa-4" rounded="lg">
        <h2 class="text-subtitle-1 font-weight-bold">Accounting Controls</h2>
        <p class="mb-4 text-caption text-text-secondary">
          Current backend workflow and ledger state.
        </p>
        <VRow>
          <VCol v-for="control in dashboard.controls" :key="control.label" cols="12" md="3" sm="6">
            <component
              :is="control.route ? resolveComponent('NuxtLink') : 'div'"
              class="control-link"
              :to="control.route"
            >
              <div class="text-caption text-text-secondary">{{ control.label }}</div>
              <div class="d-flex align-center justify-space-between ga-2">
                <span class="font-weight-medium">{{ control.value }}</span>
                <DsStatusBadge :value="control.status" />
              </div>
            </component>
          </VCol>
        </VRow>
      </VCard>

      <VCard v-if="dashboard.actions.length" border class="mt-5 pa-4" rounded="lg">
        <h2 class="text-subtitle-1 font-weight-bold">Requires Attention</h2>
        <VList lines="two">
          <VListItem
            v-for="item in dashboard.actions"
            :key="item.id"
            :subtitle="item.detail"
            :title="item.title"
            :to="item.route"
          >
            <template #append><DsStatusBadge :value="item.value" /></template>
          </VListItem>
        </VList>
      </VCard>
      <p class="mt-4 text-right text-caption text-text-secondary">
        As of
        {{
          new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(dashboard.asOf)
          )
        }}
      </p>
    </template>
  </VContainer>
</template>

<style scoped>
.metric-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.min-w-0 {
  min-width: 0;
}
.control-link {
  display: block;
  height: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
}
</style>
