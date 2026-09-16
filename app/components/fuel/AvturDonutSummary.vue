<script setup lang="ts">
//import { ref } from 'vue';

// Berdasarkan data dummy mockup: 218 Aktif, 18 Maintenance
const series = ref([218, 18]);

const chartOptions = ref({
  chart: {
    type: 'donut',
    height: 280,
    fontFamily: 'inherit',
  },
  labels: ['Aktif', 'Maintenance'],
  colors: ['#4CAF50', '#FFB300'], // Success (Green), Warning (Amber)
  plotOptions: {
    pie: {
      donut: {
        size: '75%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '14px',
            color: '#757575'
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#212121'
          },
          total: {
            show: true,
            showAlways: true,
            label: 'Total Perangkat',
            fontSize: '12px',
            color: '#9E9E9E',
            formatter: function (w: any) {
              return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            }
          }
        }
      }
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    colors: ['transparent'],
    width: 2
  },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    markers: { radius: 12 }
  },
  tooltip: {
    enabled: true,
    theme: 'light'
  }
});
</script>

<template>
  <ClientOnly>
    <apexchart
      type="donut"
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