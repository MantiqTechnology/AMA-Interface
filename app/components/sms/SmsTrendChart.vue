<template>
  <VCard border class="pa-4 h-100">
    <div class="text-subtitle-1 font-weight-bold mb-1">{{ title }}</div>
    <VueApexCharts type="line" height="260" :options="chartOptions" :series="apexSeries" />
    <div v-if="footnote" class="text-caption text-medium-emphasis mt-1">{{ footnote }}</div>
  </VCard>
</template>

<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  title: { type: String, required: true },
  categories: { type: Array, required: true },
  // [{ name, color, data }]
  series: { type: Array, required: true },
  footnote: { type: String, default: null },
})

const apexSeries = computed(() => props.series.map((s) => ({ name: s.name, data: s.data })))

const chartOptions = computed(() => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  colors: props.series.map((s) => s.color),
  stroke: { curve: 'smooth', width: 2 },
  markers: { size: 4 },
  xaxis: { categories: props.categories },
  legend: { position: 'top', horizontalAlign: 'left' },
  grid: { borderColor: 'rgba(0,0,0,0.06)' },
  dataLabels: { enabled: false },
}))
</script>
