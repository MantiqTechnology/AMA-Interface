<template>
  <VCard border class="pa-4 h-100 d-flex flex-column">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ title }}</div>
    <div class="d-flex align-center flex-grow-1">
      <div class="position-relative flex-shrink-0" style="width: 140px; height: 140px">
        <VueApexCharts
          type="donut"
          width="140"
          height="140"
          :options="chartOptions"
          :series="series"
        />
        <div
          class="position-absolute text-center"
          style="top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none"
        >
          <div class="text-h5 font-weight-bold">{{ total }}</div>
          <div class="text-caption text-medium-emphasis">{{ totalLabel }}</div>
        </div>
      </div>
      <div class="flex-grow-1 ml-4">
        <div
          v-for="seg in segments"
          :key="seg.label"
          class="d-flex align-center justify-space-between mb-2"
        >
          <div class="d-flex align-center">
            <span class="legend-dot mr-2" :style="{ background: seg.color }" />
            <span class="text-body-2">{{ seg.label }}</span>
          </div>
          <span class="text-body-2 font-weight-medium">{{ seg.value }} ({{ seg.percent }}%)</span>
        </div>
      </div>
    </div>
    <div v-if="footnote" class="text-caption text-medium-emphasis mt-2">{{ footnote }}</div>
  </VCard>
</template>

<script setup>
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

const props = defineProps({
  title: { type: String, required: true },
  total: { type: [String, Number], required: true },
  totalLabel: { type: String, default: 'Total' },
  // [{ label, value, percent, color }]
  segments: { type: Array, required: true },
  footnote: { type: String, default: null }
});

const series = computed(() => props.segments.map((s) => s.value));

const chartOptions = computed(() => ({
  chart: { sparkline: { enabled: true } },
  labels: props.segments.map((s) => s.label),
  colors: props.segments.map((s) => s.color),
  stroke: { width: 2 },
  dataLabels: { enabled: false },
  legend: { show: false },
  tooltip: { enabled: true },
  plotOptions: { pie: { donut: { size: '70%' } } }
}));
</script>

<style scoped>
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
