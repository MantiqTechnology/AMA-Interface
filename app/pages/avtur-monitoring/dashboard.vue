<script setup lang="ts">
const breadcrumbs = [
  {
    title: 'Dashboard Analytics',
    disabled: true,
    href: '#'
  }
];

// ============================================================
// EXECUTIVE KPI
// ============================================================

const summaryKpi = [
  {
    title: 'Total Volume Avtur (YTD)',
    value: '1,245,680 L',
    trend: '+12%',
    sub: 'vs periode sebelumnya',
    color: 'primary',
    icon: 'mdi-water-percent'
  },
  {
    title: 'Total Transaksi',
    value: '2,845',
    trend: '+18%',
    sub: 'vs periode sebelumnya',
    color: 'success',
    icon: 'mdi-swap-horizontal'
  },
  {
    title: 'Perangkat Online',
    value: '22 / 28',
    sub: '78.6% perangkat aktif',
    color: 'info',
    icon: 'mdi-wifi-check'
  },
  {
    title: 'Pending Synchronization',
    value: '96',
    sub: '128 total antrean',
    color: 'warning',
    icon: 'mdi-sync-alert'
  }
];

// ============================================================
// OPERATIONAL OVERVIEW
// ============================================================

const operationalOverview = [
  {
    title: 'Stock Monitoring',
    value: '280,200 L',
    description: 'Total stok terpantau',
    icon: 'mdi-water-check-outline',
    color: 'primary'
  },
  {
    title: 'Fuel Burn Analysis',
    value: '4.82 L/min',
    description: 'Rata-rata konsumsi',
    icon: 'mdi-fire',
    color: 'deep-orange'
  },
  {
    title: 'Costing & Finance',
    value: 'Rp 18.4 M',
    description: 'Nilai transaksi YTD',
    icon: 'mdi-cash-multiple',
    color: 'success'
  },
  {
    title: 'Reconciliation',
    value: '98.7%',
    description: 'Kesesuaian transaksi',
    icon: 'mdi-scale-balance',
    color: 'indigo'
  },
  {
    title: 'Quality Control',
    value: '96.4%',
    description: 'Hasil QC memenuhi',
    icon: 'mdi-shield-check-outline',
    color: 'teal'
  },
  {
    title: 'Alert Notifications',
    value: '7',
    description: 'Alert perlu perhatian',
    icon: 'mdi-bell-alert-outline',
    color: 'warning'
  }
];

// ============================================================
// STATION STATUS
// ============================================================

const stationStatusList = [
  {
    code: 'WMX',
    name: 'Wamena Station',
    stock: '45,200 L',
    capacity: '85%',
    telemetry: 'Online',
    lastSync: '2 menit lalu',
    color: 'success'
  },
  {
    code: 'DJJ',
    name: 'Jayapura Hub',
    stock: '128,500 L',
    capacity: '92%',
    telemetry: 'Online',
    lastSync: 'Baru saja',
    color: 'success'
  },
  {
    code: 'TIM',
    name: 'Timika Depo',
    stock: '94,100 L',
    capacity: '74%',
    telemetry: 'Warning (BLE)',
    lastSync: '15 menit lalu',
    color: 'warning'
  },
  {
    code: 'OTM',
    name: 'Oksibil Airstrip',
    stock: '12,400 L',
    capacity: '45%',
    telemetry: 'Offline (Sat)',
    lastSync: '3 jam lalu',
    color: 'error'
  }
];

// ============================================================
// RECENT FUEL TRANSACTIONS
// ============================================================

const recentSensorLogs = [
  {
    id: 'TRX-9821',
    station: 'WMX',
    operator: 'Yonas',
    volume: '1,200 L',
    nozzle: 'Smart Nozzle #02',
    time: '10:42 WIT'
  },
  {
    id: 'TRX-9820',
    station: 'DJJ',
    operator: 'Alno',
    volume: '3,500 L',
    nozzle: 'Flowmeter Main-01',
    time: '09:15 WIT'
  },
  {
    id: 'TRX-9819',
    station: 'TIM',
    operator: 'Markus',
    volume: '850 L',
    nozzle: 'Smart Nozzle #01',
    time: '08:30 WIT'
  },
  {
    id: 'TRX-9818',
    station: 'WMX',
    operator: 'Petrus',
    volume: '980 L',
    nozzle: 'Smart Nozzle #03',
    time: '07:52 WIT'
  }
];

// ============================================================
// SYSTEM ALERTS
// ============================================================

const alertList = [
  {
    title: 'Telemetry Oksibil Airstrip offline',
    description: 'Tidak ada sinkronisasi selama 3 jam.',
    time: '3 jam lalu',
    icon: 'mdi-wifi-off',
    color: 'error'
  },
  {
    title: 'Timika membutuhkan sinkronisasi',
    description: 'Perangkat lapangan menggunakan koneksi BLE.',
    time: '15 menit lalu',
    icon: 'mdi-sync-alert',
    color: 'warning'
  },
  {
    title: 'Stock Jayapura mendekati kapasitas',
    description: 'Level tangki berada pada 92%.',
    time: '28 menit lalu',
    icon: 'mdi-water-alert-outline',
    color: 'warning'
  }
];
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">

    <!-- ====================================================== -->
    <!-- BREADCRUMBS -->
    <!-- ====================================================== -->

    <v-breadcrumbs
      :items="breadcrumbs"
      class="px-0 py-1 text-caption"
    />

    <!-- ====================================================== -->
    <!-- HEADER -->
    <!-- ====================================================== -->

    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3">
          Avtur Fuel Analytics & Operations Dashboard
        </h1>

        <p class="text-caption text-grey-darken-1 mb-0">
          Ringkasan operasional distribusi Avtur, kondisi stok,
          perangkat lapangan, transaksi, sinkronisasi, dan kontrol operasional.
        </p>
      </div>

      <v-btn
        color="primary"
        prepend-icon="mdi-refresh"
        variant="flat"
        class="text-none font-weight-bold"
      >
        Refresh Data
      </v-btn>
    </div>

    <!-- ====================================================== -->
    <!-- AVTUR TOP NAVIGATION -->
    <!-- ====================================================== -->

    <AvturTopNav />

    <!-- ====================================================== -->
    <!-- KPI SUMMARY -->
    <!-- ====================================================== -->

    <v-row class="mb-6">
      <v-col
        v-for="(kpi, i) in summaryKpi"
        :key="i"
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          variant="flat"
          class="border rounded-lg pa-4 bg-white h-100"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1">
              {{ kpi.title }}
            </span>

            <v-avatar
              :color="kpi.color"
              variant="tonal"
              size="36"
            >
              <v-icon
                :icon="kpi.icon"
                size="20"
              />
            </v-avatar>
          </div>

          <div class="text-h4 font-weight-bold text-grey-darken-4 mb-1">
            {{ kpi.value }}
          </div>

          <div class="text-caption text-grey-darken-1">
            <span
              v-if="kpi.trend"
              class="text-success font-weight-bold mr-1"
            >
              {{ kpi.trend }}
            </span>

            <span>{{ kpi.sub }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ====================================================== -->
    <!-- OPERATIONAL OVERVIEW -->
    <!-- ====================================================== -->

    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-3">
      Operational Overview
    </div>

    <v-row class="mb-6">
      <v-col
        v-for="(item, i) in operationalOverview"
        :key="i"
        cols="12"
        sm="6"
        md="4"
        lg="2"
      >
        <v-card
          variant="flat"
          class="border rounded-lg pa-4 bg-white h-100"
        >
          <div class="d-flex align-center mb-3">
            <v-avatar
              :color="item.color"
              variant="tonal"
              size="34"
              class="mr-3"
            >
              <v-icon
                :icon="item.icon"
                size="19"
              />
            </v-avatar>

            <div class="text-caption font-weight-bold text-grey-darken-2">
              {{ item.title }}
            </div>
          </div>

          <div class="text-h6 font-weight-bold text-grey-darken-4">
            {{ item.value }}
          </div>

          <div class="text-caption text-grey-darken-1 mt-1">
            {{ item.description }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ====================================================== -->
    <!-- ANALYTICS -->
    <!-- ====================================================== -->

    <v-row class="mb-6">

      <!-- Consumption Trend -->
      <v-col cols="12" md="8">
        <v-card
          variant="flat"
          class="border rounded-lg pa-5 bg-white h-100"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Tren Konsumsi & Volume Avtur
              </div>

              <div class="text-caption text-grey-darken-1">
                Pergerakan volume distribusi selama 7 hari terakhir
              </div>
            </div>

            <v-chip
              size="small"
              color="primary"
              variant="tonal"
            >
              7 Hari
            </v-chip>
          </div>

          <div class="mt-4" style="min-height: 300px; position: relative;">
            <AvturTrendChart />
          </div>
        </v-card>
      </v-col>

      <!-- Stock / Facility -->
      <v-col cols="12" md="4">
        <v-card
          variant="flat"
          class="border rounded-lg pa-5 bg-white h-100"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Kondisi Fasilitas
              </div>

              <div class="text-caption text-grey-darken-1">
                Status perangkat dan fasilitas
              </div>
            </div>

            <v-icon
              icon="mdi-chart-donut"
              size="20"
              class="text-grey"
            />
          </div>

          <div class="mt-4">
            <AvturDonutSummary />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ====================================================== -->
    <!-- STATION STATUS + ALERT -->
    <!-- ====================================================== -->

    <v-row class="mb-6">

      <!-- Station Status -->
      <v-col cols="12" md="7">
        <v-card
          variant="flat"
          class="border rounded-lg pa-5 bg-white h-100"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Status Stasiun & Level Tangki Avtur
              </div>

              <div class="text-caption text-grey-darken-1">
                Kondisi stok dan telemetri stasiun yang terpantau
              </div>
            </div>

            <v-btn
              to="/avtur-monitoring/avtur-stock-monitoring-view"
              variant="text"
              color="primary"
              size="small"
              class="text-none font-weight-bold"
            >
              Lihit Monitoring
            </v-btn>
          </div>

          <v-table
            density="comfortable"
            class="text-caption"
          >
            <thead>
              <tr>
                <th class="font-weight-bold">Stasiun</th>
                <th class="font-weight-bold">Stok Avtur</th>
                <th class="font-weight-bold">Kapasitas</th>
                <th class="font-weight-bold">Telemetri</th>
                <th class="font-weight-bold">Sync</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="station in stationStatusList"
                :key="station.code"
              >
                <td>
                  <div class="font-weight-bold text-grey-darken-4">
                    {{ station.code }}
                  </div>
                  <div class="text-grey-darken-1" style="font-size: 11px;">
                    {{ station.name }}
                  </div>
                </td>
                <td class="font-weight-medium">
                  {{ station.stock }}
                </td>
                <td>
                  <div class="d-flex align-center gap-2">
                    <span>{{ station.capacity }}</span>
                  </div>
                </td>
                <td>
                  <v-chip
                    :color="station.color"
                    size="x-small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ station.telemetry }}
                  </v-chip>
                </td>
                <td class="text-grey-darken-1">
                  {{ station.lastSync }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <!-- Alerts -->
      <v-col cols="12" md="5">
        <v-card
          variant="flat"
          class="border rounded-lg pa-5 bg-white h-100"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Alert & Attention
              </div>

              <div class="text-caption text-grey-darken-1">
                Kondisi yang membutuhkan perhatian operator
              </div>
            </div>

            <v-chip
              size="small"
              color="warning"
              variant="tonal"
            >
              7 Active
            </v-chip>
          </div>

          <div class="d-flex flex-column gap-3">
            <div
              v-for="(alert, i) in alertList"
              :key="i"
              class="pa-3 border rounded-lg bg-grey-lighten-5"
            >
              <div class="d-flex align-start">
                <v-avatar
                  :color="alert.color"
                  variant="tonal"
                  size="34"
                  class="mr-3"
                >
                  <v-icon
                    :icon="alert.icon"
                    size="18"
                  />
                </v-avatar>

                <div class="flex-grow-1">
                  <div class="text-caption font-weight-bold text-grey-darken-4">
                    {{ alert.title }}
                  </div>

                  <div class="text-caption text-grey-darken-1 mt-1">
                    {{ alert.description }}
                  </div>

                  <div class="text-grey mt-1" style="font-size: 10px;">
                    {{ alert.time }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ====================================================== -->
    <!-- RECENT TRANSACTIONS -->
    <!-- ====================================================== -->

    <v-row>
      <v-col cols="12">
        <v-card
          variant="flat"
          class="border rounded-lg pa-5 bg-white"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Aktivitas Fuel Transaction Terbaru
              </div>

              <div class="text-caption text-grey-darken-1">
                Transaksi pengisian dan perpindahan Avtur terbaru yang tercatat
              </div>
            </div>

            <v-btn
              to="/avtur-monitoring/fuel-transactions"
              variant="text"
              color="primary"
              size="small"
              class="text-none font-weight-bold"
            >
              Lihat Semua
            </v-btn>
          </div>

          <v-table
            density="comfortable"
            class="text-caption"
          >
            <thead>
              <tr>
                <th class="font-weight-bold">Transaction ID</th>
                <th class="font-weight-bold">Station</th>
                <th class="font-weight-bold">Perangkat</th>
                <th class="font-weight-bold">Volume</th>
                <th class="font-weight-bold">Operator</th>
                <th class="font-weight-bold">Waktu</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="log in recentSensorLogs"
                :key="log.id"
              >
                <td>
                  <span class="font-weight-bold text-grey-darken-4">
                    {{ log.id }}
                  </span>
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    color="indigo"
                    class="font-weight-bold"
                  >
                    {{ log.station }}
                  </v-chip>
                </td>
                <td>{{ log.nozzle }}</td>
                <td class="font-weight-bold text-success">{{ log.volume }}</td>
                <td>{{ log.operator }}</td>
                <td class="text-grey-darken-2">{{ log.time }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

  </div>
</template>

<style scoped>
.gap-3 {
  gap: 12px;
}

.gap-2 {
  gap: 8px;
}
/* .chart-placeholder dan .border-dashed sudah dihapus karena tidak dipakai lagi */
</style>