<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import type { ContractSourceMixItemDto } from '#shared/features/marketing/contracts-subsidies';

const props = defineProps<{ items: ContractSourceMixItemDto[] }>();
const colors = ['#0874de', '#69a8ee', '#24a766'];
const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0));
const series = computed(() => props.items.map((item) => item.count));
const options = computed<ApexOptions>(() => ({
  chart: { animations: { enabled: false }, sparkline: { enabled: true } },
  colors: colors.slice(0, props.items.length),
  labels: props.items.map((item) => item.label),
  dataLabels: { enabled: false },
  legend: { show: false },
  stroke: { width: 0 },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          name: { show: true, offsetY: 18, fontSize: '11px', color: '#64748b' },
          value: { show: true, offsetY: -8, fontSize: '20px', fontWeight: 700, color: '#111827' },
          total: {
            show: true,
            label: 'Contracts',
            formatter: () => String(total.value)
          }
        }
      }
    }
  },
  tooltip: { y: { formatter: (value) => `${value} contract${value === 1 ? '' : 's'}` } }
}));
</script>

<template>
  <div v-if="items.length" class="source-mix">
    <div class="source-mix__chart">
      <FeatureApexChart height="150" :options="options" :series="series" type="donut" />
    </div>
    <div class="source-mix__legend">
      <div class="source-mix__legend-head text-caption text-medium-emphasis">
        <span>Source</span><span>%</span>
      </div>
      <div v-for="(item, index) in items" :key="item.sourceType" class="source-mix__legend-row">
        <span class="d-flex align-center ga-2 min-w-0">
          <i :style="{ backgroundColor: colors[index] }" />
          <span class="text-truncate">{{ item.label }}</span>
        </span>
        <strong>{{ item.percentage.toFixed(1) }}%</strong>
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-body-2 text-medium-emphasis">
    No active contracts at this snapshot.
  </div>
</template>

<style scoped>
.source-mix {
  display: grid;
  grid-template-columns: minmax(145px, 0.8fr) minmax(180px, 1.2fr);
  gap: 18px;
  align-items: center;
}
.source-mix__chart {
  min-width: 0;
}
.source-mix__legend {
  min-width: 0;
}
.source-mix__legend-head,
.source-mix__legend-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-block: 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.55);
}
.source-mix__legend-row {
  font-size: 12px;
}
.source-mix__legend-row:last-child {
  border-bottom: 0;
}
.source-mix__legend-row i {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}
.source-mix__legend-row strong {
  font-variant-numeric: tabular-nums;
}
@media (max-width: 520px) {
  .source-mix {
    grid-template-columns: 1fr;
  }
}
</style>
