<script setup lang="ts">
//import { ref } from 'vue';

const series = ref([
  {
    name: 'Wamena Station',
    data: [1240, 1320, 1150, 1400, 1550, 1600, 1450]
  },
  {
    name: 'Jayapura Hub',
    data: [2100, 2300, 2250, 2400, 2150, 2600, 2800]
  }
]);

const chartOptions = ref({
  chart: {
    type: 'area',
    height: 280,
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false }
  },
  colors: ['#1867C0', '#4CAF50'], // Sesuai warna primary dan success Vuetify
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 90, 100]
    }
  },
  xaxis: {
    categories: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: { colors: '#9e9e9e', fontSize: '12px' }
    }
  },
  yaxis: {
    labels: {
      style: { colors: '#9e9e9e', fontSize: '12px' },
      formatter: (value: number) => {
        return value + ' L';
      }
    }
  },
  grid: {
    borderColor: '#f5f5f5',
    strokeDashArray: 4,
    yaxis: { lines: { show: true } }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right'
  }
});
</script>

<template>
  <!-- ClientOnly sangat penting di Nuxt 3 untuk ApexCharts agar tidak error hydration SSR -->
  <ClientOnly>
    <apexchart
      type="area"
      height="280"
      :options="chartOptions"
      :series="series"
    />
    <template #fallback>
      <div class="d-flex align-center justify-center" style="height: 280px;">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>
    </template>
  </ClientOnly>
</template>