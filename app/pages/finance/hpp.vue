<script setup lang="ts">
import type {
  AviationProfitabilityDto,
  AviationProfitabilityUnitDto,
  FinanceReportingPeriodDto
} from '#shared/features/finance/reporting';

useHead({ title: 'Aviation Profitability - PT AMA' });
const selectedPeriod = ref('');
const view = ref<'flights' | 'routes' | 'stations'>('flights');
const search = ref('');
const selected = ref<AviationProfitabilityUnitDto | null>(null);
const { data: periods } = await useAsyncData(
  'aviation-periods',
  () => fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods'),
  { default: () => [] }
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value[0]?.code ?? '';
const query = computed(() => ({ period: selectedPeriod.value }));
const {
  data: report,
  pending,
  error,
  refresh
} = await useAsyncData(
  'aviation-profitability-gl',
  () =>
    fetchApi<AviationProfitabilityDto>('/api/finance/reporting/aviation-profitability', {
      query: query.value
    }),
  { watch: [query] }
);
const periodOptions = computed(() =>
  periods.value.map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);
const rows = computed(() => {
  const source = report.value?.[view.value] ?? [];
  const q = search.value.trim().toLowerCase();
  return q
    ? source.filter(
        (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
      )
    : source;
});
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Aviation Profitability</h1>
        <p class="text-body-2 text-text-secondary">
          Flight, route, and station contribution reconciled to dimensioned posted GL.
        </p>
      </div>
      <VSpacer /><VSelect
        v-model="selectedPeriod"
        hide-details
        :items="periodOptions"
        label="Accounting period"
        style="max-width: 260px"
        variant="outlined"
      />
      <VBtn
        aria-label="Refresh profitability"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh"
      />
    </header>
    <VAlert
      v-if="error"
      class="mb-4"
      color="error"
      title="Profitability unavailable"
      variant="tonal"
    >
      {{ error.message }}
    </VAlert>
    <VSkeletonLoader v-if="pending && !report" type="card, table" />
    <template v-else-if="report">
      <section class="metric-grid mb-5">
        <VCard border class="pa-4" rounded="lg">
          <div class="text-caption">Attributed revenue</div>
          <div class="text-h6 font-weight-bold">{{ money(report.totals.revenueMinor) }}</div>
        </VCard><VCard border class="pa-4" rounded="lg">
          <div class="text-caption">Attributed direct cost</div>
          <div class="text-h6 font-weight-bold">{{ money(report.totals.costMinor) }}</div>
        </VCard><VCard border class="pa-4" rounded="lg">
          <div class="text-caption">Contribution margin</div>
          <div class="text-h6 font-weight-bold">{{ money(report.totals.marginMinor) }}</div>
        </VCard><VCard border class="pa-4" rounded="lg">
          <div class="text-caption">Attribution</div>
          <div class="text-subtitle-1 font-weight-bold">Posted GL dimensions</div>
        </VCard>
      </section>
      <div class="mb-4 d-flex flex-wrap ga-3">
        <VBtnToggle v-model="view" mandatory variant="outlined">
          <VBtn value="flights">Flights</VBtn><VBtn value="routes">Routes</VBtn><VBtn value="stations">Stations</VBtn>
        </VBtnToggle><VTextField
          v-model="search"
          clearable
          hide-details
          label="Search"
          prepend-inner-icon="mdi-magnify"
          style="max-width: 320px"
          variant="outlined"
        />
      </div>
      <VCard v-if="!rows.length" border class="py-10 text-center" rounded="lg">
        <div class="text-text-secondary">No attributed posted GL lines for this view.</div>
      </VCard>
      <VTable v-else class="border rounded-lg">
        <thead>
          <tr>
            <th>Dimension</th>
            <th class="text-right">Revenue</th>
            <th class="text-right">Fuel</th>
            <th class="text-right">Handling</th>
            <th class="text-right">Airport / station</th>
            <th class="text-right">Maintenance</th>
            <th class="text-right">Other</th>
            <th class="text-right">Margin</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.id">
            <td>
              <div class="font-weight-medium">{{ item.label }}</div>
              <div class="text-caption text-text-secondary">
                {{ item.flightIds.length }} flight(s)
              </div>
            </td>
            <td class="text-right">{{ money(item.revenueMinor) }}</td>
            <td class="text-right">{{ money(item.costs.fuelMinor) }}</td>
            <td class="text-right">{{ money(item.costs.handlingMinor) }}</td>
            <td class="text-right">{{ money(item.costs.airportStationMinor) }}</td>
            <td class="text-right">{{ money(item.costs.maintenanceMinor) }}</td>
            <td class="text-right">{{ money(item.costs.otherDirectMinor) }}</td>
            <td class="text-right font-weight-bold">{{ money(item.marginMinor) }}</td>
            <td>
              <VBtn
                aria-label="Open accounting evidence"
                icon="mdi-source-branch"
                variant="text"
                @click="selected = item"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </template>
    <VDialog :model-value="Boolean(selected)" max-width="980" @update:model-value="selected = null">
      <VCard v-if="selected" :title="`${selected.label} accounting evidence`">
        <VCardText>
          <VTable>
            <thead>
              <tr>
                <th>Journal</th>
                <th>Account</th>
                <th>Event / source</th>
                <th class="text-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selected.evidence" :key="item.journalLineId">
                <td>
                  <NuxtLink :to="`/finance/accounting?journal=${item.journalId}`">
                    {{
                      item.journalNumber
                    }}
                  </NuxtLink>
                </td>
                <td>{{ item.accountCode }} · {{ item.accountName }}</td>
                <td>
                  {{ item.eventType }}
                  <div class="text-caption">{{ item.sourceType }} / {{ item.sourceId }}</div>
                </td>
                <td class="text-right">{{ money(item.amountMinor) }}</td>
                <td>
                  <VBtn
                    v-if="item.sourceRoute"
                    :to="item.sourceRoute"
                    aria-label="Open source transaction"
                    icon="mdi-open-in-new"
                    variant="text"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText><VCardActions><VSpacer /><VBtn @click="selected = null">Close</VBtn></VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.metric-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
</style>
