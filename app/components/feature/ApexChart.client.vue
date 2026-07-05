<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts';
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';

defineProps<{
  type: NonNullable<ApexOptions['chart']>['type'];
  options: ApexOptions;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  height?: number | string;
  width?: number | string;
}>();
</script>

<template>
  <VueApexCharts
    :height="height ?? 280"
    :options="options"
    :series="series"
    :type="type"
    :width="width ?? '100%'"
  />
</template>
