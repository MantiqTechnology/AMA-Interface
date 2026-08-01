<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import VueApexCharts from 'vue3-apexcharts';

type ChartSeries = ApexOptions['series'];

withDefaults(
  defineProps<{
    type: 'area' | 'bar' | 'donut' | 'line' | 'pie' | 'radialBar';
    options: ApexOptions;
    series: ChartSeries;
    height?: string | number;
    width?: string | number;
  }>(),
  {
    height: 300,
    width: '100%'
  }
);
</script>

<template>
  <VueApexCharts :height="height" :options="options" :series="series" :type="type" :width="width" />
</template>
