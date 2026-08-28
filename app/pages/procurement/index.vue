<script setup lang="ts">
import {
  formatProcurementIDRFull,
  statusColor,
  useProcurementOverview,
  useProcurementSnackbar
} from '../../composables/useProcurement';
import type { SpendCategoryBreakdown } from '../../types/procurement';

definePageMeta({ title: 'Procurement Overview' });

const {
  isRefreshing,
  lastUpdated,
  kpis,
  pipeline,
  pendingApprovalItems,
  poBottleneckCount,
  topVendorScores,
  aslCertificateStatus,
  totalAvlVendors,
  leadTimeByCategory,
  deliveryPerformance,
  totalDeliveriesThisWeek,
  totalSpendThisYear,
  totalBudgetThisYear,
  budgetUtilizationPercent,
  spendByCategory,
  topVendorSpend,
  recentActivity,
  refresh
} = useProcurementOverview();

const { notify } = useProcurementSnackbar();

const period = ref<'today' | 'week' | 'month'>('week');
const department = ref('Semua Departemen');
const departments = [
  'Semua Departemen',
  'MRO',
  'Operations',
  'General Affairs',
  'IT',
  'Finance',
  'Ground Handling'
];

const ratingColor: Record<string, string> = {
  Excellent: 'green',
  Good: 'blue',
  Fair: 'amber-darken-2',
  Poor: 'red'
};

const periodMultiplier: Record<'today' | 'week' | 'month', number> = {
  today: 0.16,
  week: 1,
  month: 4.3
};

const periodLabel: Record<'today' | 'week' | 'month', string> = {
  today: 'Hari ini',
  week: 'Minggu ini',
  month: 'Bulan ini'
};

const dateRangeLabel = computed(() => {
  if (period.value === 'today') return '23/08/2026';
  if (period.value === 'month') return '01/08/2026 - 23/08/2026';
  return '17/08/2026 - 23/08/2026';
});

const displayedKpis = computed(() => {
  if (period.value === 'week') return kpis.value;

  const mult = periodMultiplier[period.value];

  return kpis.value.map((kpi) => {
    const numeric = parseInt(String(kpi.value).replace(/\D/g, ''), 10);
    if (Number.isNaN(numeric)) return kpi;
    const scaled = Math.max(1, Math.round(numeric * mult));
    return { ...kpi, value: String(scaled) };
  });
});

const displayedLastUpdated = computed(() => {
  if (period.value === 'today') {
    const timePart = lastUpdated.value.split(',').pop()?.trim() ?? lastUpdated.value;
    return `Hari ini, ${timePart}`;
  }
  if (period.value === 'month') return `Bulan Agustus 2026 · ${lastUpdated.value}`;

  return lastUpdated.value;
});

let isFirstPeriodRun = true;
watch(period, () => {
  if (isFirstPeriodRun) {
    isFirstPeriodRun = false;
    return;
  }
  notify(`Menampilkan data untuk periode: ${periodLabel[period.value]} (simulasi demo).`, 'info');
});

const semanticColor: Record<string, string> = {
  Valid: '#15803D',
  'Expiring ≤ 60 days': '#de3d3d',
  Expired: '#f49237',
  'No Certificate': '#94A3B8',
  'On Time': '#0E9F9A',
  Delayed: '#F59E0B',
  Overdue: '#de3d3d',
  'Aircraft Spare Parts': '#3B82F6',
  Fuel: '#15803D',
  'Maintenance Services': '#de3d3d',
  Rotables: '#A78BFA',
  'General Goods & Services': '#0E9F9A'
};

function withSemanticColor<T extends { label: string; color: string }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, color: semanticColor[item.label] ?? item.color }));
}

const leadTimeBars = computed(() =>
  leadTimeByCategory.map((c) => {
    const avg = Number(c.averageDays);
    const target = Number(c.targetDays);
    return {
      label: c.category,
      value: avg,
      target,
      displayValue: `${avg} days / target ${target} days`,
      color: '#3B82F6'
    };
  })
);

const vendorSpendBars = computed(() =>
  topVendorSpend.map((v) => ({
    label: v.vendor,
    value: v.amount,
    displayValue: `${(v.amount / 1_000_000_000).toFixed(2)} B`,
    color: '#3B82F6'
  }))
);

const aslSegments = computed(() => withSemanticColor(aslCertificateStatus));
const deliverySegments = computed(() => withSemanticColor(deliveryPerformance));
const spendSegments = computed(() =>
  withSemanticColor(
    spendByCategory.map((item: SpendCategoryBreakdown) => ({
      label: item.category,
      value: item.amount,
      percent: item.percent,
      color: item.color
    }))
  )
);

const aslLegendItems = computed(() =>
  aslSegments.value.map((s: any) => ({
    label: s.label,
    value: `${s.value} (${s.percent}%)`,
    color: s.color
  }))
);

const deliveryLegendItems = computed(() =>
  deliverySegments.value.map((s: any) => ({
    label: s.label,
    value: `${s.value} (${s.percent}%)`,
    color: s.color
  }))
);

const spendByCategoryLegend = computed(() =>
  spendSegments.value.map((s: any) => ({
    label: s.label,
    value: `${(s.value / 1_000_000_000).toFixed(1)}B (${s.percent}%)`,
    color: s.color
  }))
);

function exportCsv() {
  const header = 'Reference,Type,Supplier/Department,Amount,Date,Status\n';
  const rows = recentActivity
    .map((r) => `${r.reference},${r.type},${r.counterparty},${r.amount},${r.date},${r.status}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'procurement-overview-export.csv';
  a.click();
  URL.revokeObjectURL(url);
  notify('Export CSV berhasil dibuat.', 'success');
}
</script>

<template>
  <div class="proc-page">
    <ProcurementPageHeader
      eyebrow="Procurement Overview"
      title="Procurement"
      subtitle="Real-time overview of procurement activities and performance."
    >
      <template #actions>
        <VBtnToggle
          v-model="period"
          density="compact"
          mandatory
          color="primary"
          class="period-toggle"
        >
          <VBtn value="today" size="small">Hari ini</VBtn>
          <VBtn value="week" size="small">Minggu ini</VBtn>
          <VBtn value="month" size="small">Bulan ini</VBtn>
        </VBtnToggle>

        <VTextField
          :model-value="dateRangeLabel"
          readonly
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-calendar-range"
          style="max-width: 220px"
        />

        <VSelect
          v-model="department"
          :items="departments"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 190px"
        />

        <VBtn
          color="primary"
          variant="flat"
          :loading="isRefreshing"
          prepend-icon="mdi-refresh"
          @click="refresh"
        >
          Refresh
        </VBtn>

        <VBtn variant="outlined" prepend-icon="mdi-tray-arrow-down" @click="exportCsv">Export</VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-8" />

    <div class="text-caption text-medium-emphasis mt-3 mb-1">
      Last updated: {{ displayedLastUpdated }}
    </div>

    <div class="section-spacing">
      <ProcurementGuideBanner />
    </div>

    <!-- KPI strip: CSS grid supaya rapi 1-2 baris, bukan VCol lebar acak -->
    <div class="kpi-grid">
      <ProcurementKpi v-for="kpi in displayedKpis" :key="kpi.label" :kpi="kpi" />
    </div>

    <!-- PO Approval Pipeline + Bottleneck table -->
    <VRow class="mt-4" dense align="start">
      <VCol cols="12" lg="7">
        <VCard border rounded="lg">
          <VCardItem>
            <VCardTitle class="section-title">PO Approval Pipeline</VCardTitle>
          </VCardItem>
          <VCardText>
            <div class="pipeline">
              <template v-for="(stage, index) in pipeline" :key="stage.status">
                <div class="pipeline__stage">
                  <div
                    class="pipeline__icon"
                    :style="{ background: `${stage.color}1A`, color: stage.color }"
                  >
                    <VIcon :icon="stage.icon" size="20" />
                  </div>
                  <div class="pipeline__label">{{ stage.status }}</div>
                  <div class="pipeline__count">{{ stage.count }}</div>
                </div>
                <VIcon
                  v-if="Number(index) < pipeline.length - 1"
                  icon="mdi-arrow-right"
                  size="18"
                  class="pipeline__arrow"
                />
              </template>
            </div>

            <div class="bottleneck-alert">
              <VIcon icon="mdi-alert-outline" size="18" color="#B45309" />
              <span>{{ poBottleneckCount }} PO tertahan di tahap approval lebih dari 2 hari</span>
              <VSpacer />
              <NuxtLink to="/procurement/approval-control" class="link">
                Lihat detail bottleneck →
              </NuxtLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="5">
        <VCard border rounded="lg" class="h-100 d-flex flex-column">
          <VCardItem>
            <VCardTitle class="section-title">PO Tertahan Approval</VCardTitle>
          </VCardItem>
          <VCardText class="pa-0 flex-grow-1">
            <div class="table-scroll">
              <table class="simple-table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Amount (IDR)</th>
                    <th>Submitted Date</th>
                    <th>Pending (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pendingApprovalItems" :key="row.poNumber">
                    <td>{{ row.poNumber }}</td>
                    <td>{{ row.supplier }}</td>
                    <td>{{ formatProcurementIDRFull(row.amount) }}</td>
                    <td>{{ row.submittedDate }}</td>
                    <td class="danger-text">{{ row.pendingDays }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VCardText>
          <VCardActions class="px-4 pb-3">
            <NuxtLink to="/procurement/purchase-orders" class="link">
              Lihat semua PO tertahan →
            </NuxtLink>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-2" dense>
      <VCol cols="12" lg="3" md="6">
        <NuxtLink to="/procurement/vendor-performance" class="card-link">
          <VCard border rounded="lg" class="h-100 clickable-card">
            <VCardItem>
              <VCardTitle class="section-title">Top 5 Vendor Performance (Score)</VCardTitle>
            </VCardItem>
            <VCardText class="pa-0">
              <table class="simple-table simple-table--compact">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in topVendorScores" :key="v.vendor">
                    <td>{{ v.vendor }}</td>
                    <td>
                      <VChip
                        :color="ratingColor[v.rating]"
                        size="x-small"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        {{ v.overallScore }}/100
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </table>
            </VCardText>
            <VCardActions class="px-4 pb-3">
              <NuxtLink to="/procurement/vendor-performance" class="link">
                Lihat semua vendor performance →
              </NuxtLink>
            </VCardActions>
          </VCard>
        </NuxtLink>
      </VCol>

      <VCol cols="12" lg="3" md="6">
        <NuxtLink to="/procurement/vendor-performance" class="card-link">
          <VCard border rounded="lg" class="h-100 clickable-card">
            <VCardItem>
              <VCardTitle class="section-title">ASL Certificate Status</VCardTitle>
            </VCardItem>
            <VCardText>
              <div class="chart-with-legend">
                <ProcurementDonutChart
                  :segments="aslSegments"
                  :center-value="String(totalAvlVendors)"
                  center-label="Total Vendor"
                />
                <ProcurementChartLegend :items="aslLegendItems" />
              </div>
            </VCardText>
            <VCardActions class="px-4 pb-3">
              <NuxtLink to="/procurement/vendor-performance" class="link">
                Lihat semua ASL Status →
              </NuxtLink>
            </VCardActions>
          </VCard>
        </NuxtLink>
      </VCol>

      <VCol cols="12" lg="3" md="6">
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Lead Time by Category</VCardTitle>
          </VCardItem>
          <VCardText style="margin-top: 10px">
            <ProcurementBarList :items="leadTimeBars" />
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="3" md="6">
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Delivery Performance</VCardTitle>
          </VCardItem>
          <VCardText>
            <div class="chart-with-legend">
              <ProcurementDonutChart
                :segments="deliverySegments"
                :center-value="String(totalDeliveriesThisWeek)"
                center-label="Total Delivery"
              />
              <ProcurementChartLegend :items="deliveryLegendItems" />
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Spend Analysis -->
    <VRow class="mt-2" dense>
      <VCol cols="12" lg="4">
        <!-- Spend vs Budget -->
        <VCard border rounded="lg" class="h-100 d-flex flex-column">
          <VCardItem>
            <VCardTitle class="section-title">Spend vs Budget (This Year)</VCardTitle>
          </VCardItem>
          <VCardText class="flex-grow-1 mt-15">
            <div class="spend-summary-3col">
              <div class="spend-col">
                <div class="spend-col__value">
                  IDR {{ (totalSpendThisYear / 1_000_000_000).toFixed(2) }} B
                </div>
                <div class="spend-col__label">Total Spend</div>
              </div>
              <div class="spend-col spend-col--center">
                <div class="spend-col__value spend-col__value--accent">
                  {{ budgetUtilizationPercent }}%
                </div>
                <div class="spend-col__label">Budget Realization</div>
              </div>
              <div class="spend-col spend-col--right">
                <div class="spend-col__value">
                  IDR {{ (totalBudgetThisYear / 1_000_000_000).toFixed(2) }} B
                </div>
                <div class="spend-col__label">Total Budget</div>
              </div>
            </div>

            <div class="spend-progress">
              <VProgressLinear
                :model-value="budgetUtilizationPercent"
                height="8"
                rounded
                color="primary"
              />
            </div>
          </VCardText>
          <VCardActions class="px-4 pb-3">
            <NuxtLink to="/procurement/purchase-orders" class="link">
              Lihat detail budget realization →
            </NuxtLink>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <!-- Spend by Category -->
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Spend by Category</VCardTitle>
          </VCardItem>
          <VCardText>
            <div class="chart-with-legend">
              <ProcurementDonutChart
                :segments="spendSegments"
                :center-value="`${(totalSpendThisYear / 1_000_000_000).toFixed(1)}B`"
                center-label="Total Spend"
              />
              <ProcurementChartLegend :items="spendByCategoryLegend" />
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <!-- Top Vendor Spend -->
        <NuxtLink to="/procurement/purchase-orders" class="card-link">
          <VCard border rounded="lg" class="h-100 clickable-card">
            <VCardItem>
              <VCardTitle class="section-title">Top Vendor by Spend</VCardTitle>
              <template #append>
                <VIcon icon="mdi-chevron-right" size="16" color="#94A3B8" />
              </template>
            </VCardItem>
            <VCardText style="margin-top: 10px">
              <ProcurementBarList :items="vendorSpendBars" />
            </VCardText>
            <VCardActions class="px-4 pb-3">
              <NuxtLink to="/procurement/purchase-orders" class="link">
                Lihat semua vendor →
              </NuxtLink>
            </VCardActions>
          </VCard>
        </NuxtLink>
      </VCol>
    </VRow>

    <!-- Recent Activity -->
    <VRow class="mt-2" dense>
      <VCol cols="12">
        <VCard border rounded="lg">
          <VCardItem>
            <VCardTitle class="section-title">Recent Activity</VCardTitle>
          </VCardItem>
          <VCardText class="pa-0">
            <div class="table-scroll">
              <table class="simple-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Counterparty</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in recentActivity" :key="row.reference">
                    <td>{{ row.reference }}</td>
                    <td>{{ row.type }}</td>
                    <td>{{ row.counterparty }}</td>
                    <td>{{ formatProcurementIDRFull(row.amount) }}</td>
                    <td>
                      <VChip :color="statusColor(row.status)" size="x-small" variant="tonal">
                        {{ row.status }}
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
}

.period-toggle {
  border: 1px solid #d9e0e6;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.link {
  font-size: 12.5px;
  font-weight: 600;
  color: #0f4c81;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

/* Jarak atas-bawah untuk guide banner */
.section-spacing {
  margin: 20px 0;
}

/* KPI grid — rapi, 4 kolom di desktop, otomatis turun ke 2 baris */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1279px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}

/* Pipeline: padding lebih rapi & tidak ada whitespace berlebih */
.pipeline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 4px 16px;
}

.pipeline__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 84px;
}

.pipeline__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.pipeline__label {
  font-size: 14px;
  color: #64748b;
  text-align: center;
  font-weight: 600;
}

.pipeline__count {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.pipeline__arrow {
  color: #cbd5e1;
  margin-bottom: 26px;
}

.bottleneck-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fef3e2;
  border: 1px solid #fcd9a4;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: #92400e;
  font-weight: 600;
}

/* Scrollable table wrapper dengan scrollbar tipis */
.table-scroll {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.table-scroll::-webkit-scrollbar {
  height: 6px;
}

.table-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.table-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 640px;
}

.simple-table thead th {
  text-align: left;
  padding: 10px 16px;
  color: #64748b;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid #d9e0e6;
  white-space: nowrap;
}

.simple-table tbody td {
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  white-space: nowrap;
}

.simple-table--compact {
  min-width: 0;
}

.danger-text {
  color: #dc2626;
  font-weight: 700;
}

/* Chart + legend: legend selalu di bawah, judul tetap di atas card */
.chart-with-legend {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* Card yang bisa diklik menuju halaman lain */
.card-link {
  text-decoration: none;
  display: block;
  height: 100%;
}

.clickable-card {
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.clickable-card:hover {
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  border-color: #94a3b8;
}

/* Spend vs Budget — 3 kolom seperti referensi desain */
.spend-summary-3col {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}

.spend-col--center {
  text-align: center;
  flex: 1;
}

.spend-col--right {
  text-align: right;
}

.spend-col__value {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.spend-col__value--accent {
  color: #15803d;
  font-size: 24px;
}

.spend-col__label {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.spend-progress {
  margin-top: 18px;
}
</style>
