<script setup lang="ts">
// Filter States
const searchQuery = ref('')
const selectedSeverity = ref('Semua Severity')
const selectedStatus = ref('Semua Status')

const severityOptions = ['Semua Severity', 'Critical', 'Warning', 'Info']
const statusOptions = ['Semua Status', 'Active', 'Acknowledged', 'Resolved']

// Metrics Summary
const alertMetrics = [
  { title: 'Total Peringatan (24h)', count: '14', icon: 'mdi-bell-ring-outline', color: 'error' },
  { title: 'Critical Alert', count: '2', icon: 'mdi-alert-octagon-outline', color: 'red-darken-2' },
  { title: 'Perlu Tindakan', count: '5', icon: 'mdi-clock-alert-outline', color: 'warning' },
  { title: 'Selesai / Resolved', count: '7', icon: 'mdi-check-circle-outline', color: 'success' },
]

// Mock Alert Data
const alertList = ref([
  { id: 'ALT-001', timestamp: '22 Aug 2026 10:14', station: 'Wamena (WMX)', metric: 'Batas Tekanan Nozzle Eksed', value: '4.2 Bar (Max 3.5 Bar)', severity: 'Critical', status: 'Active' },
  { id: 'ALT-002', timestamp: '22 Aug 2026 09:30', station: 'Timika (TIM)', metric: 'Stok Avtur Drum Minimum', value: '12 Drum (Min 15 Drum)', severity: 'Warning', status: 'Active' },
  { id: 'ALT-003', timestamp: '22 Aug 2026 08:05', station: 'Sentani (DJJ)', metric: 'Transfer Pump Temperature', value: '68°C', severity: 'Warning', status: 'Acknowledged' },
  { id: 'ALT-004', timestamp: '21 Aug 2026 17:40', station: 'Mulia (MII)', metric: 'Offline Sync Delay > 6 Jam', value: '7.5 Jam Offline', severity: 'Critical', status: 'Acknowledged' },
  { id: 'ALT-005', timestamp: '21 Aug 2026 14:10', station: 'Dekai (DKI)', metric: 'Water Detector Threshold', value: 'Normal (< 5 ppm)', severity: 'Info', status: 'Resolved' },
])

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'Critical': return { color: 'error', variant: 'flat' }
    case 'Warning': return { color: 'warning', variant: 'tonal' }
    default: return { color: 'info', variant: 'tonal' }
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Active': return 'error'
    case 'Acknowledged': return 'warning'
    case 'Resolved': return 'success'
    default: return 'grey'
  }
}
</script>

<template>
  <div class="pa-2">
    <!-- Header Title -->
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold text-grey-darken-3">Avtur Alert & Notification Engine</h2>
      <p class="text-caption text-grey-darken-1 mb-0">
        Sistem monitoring pemicu peringatan otomatis, ambang batas keselamatan, dan notifikasi insiden realtime.
      </p>
    </div>

    <!-- Metrics Bar -->
    <v-row class="mb-6">
      <v-col v-for="(m, i) in alertMetrics" :key="i" cols="12" sm="6" md="3">
        <v-card variant="flat" class="border rounded-lg pa-4 bg-white">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1">{{ m.title }}</span>
            <v-avatar :color="m.color" variant="tonal" size="32">
              <v-icon :icon="m.icon" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-grey-darken-4">{{ m.count }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content Table Card -->
    <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
      <!-- Filters Bar -->
      <v-row class="mb-4" density="compact">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari ID Alert / Stasiun / Metric..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="selectedSeverity"
            :items="severityOptions"
            label="Severity"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="selectedStatus"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn color="primary" block variant="tonal" class="text-none">Configure Rules</v-btn>
        </v-col>
      </v-row>

      <!-- Alert Table -->
      <v-table density="comfortable" class="border rounded">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-caption text-grey-darken-2">ID Alert</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Waktu</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Lokasi / Station</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Parameter / Metric</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Nilai Terdeteksi</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Severity</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Status</th>
            <th class="font-weight-bold text-caption text-grey-darken-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in alertList" :key="item.id">
            <td class="font-weight-bold text-body-2 font-mono">{{ item.id }}</td>
            <td class="text-caption">{{ item.timestamp }}</td>
            <td class="text-body-2">{{ item.station }}</td>
            <td class="text-body-2 font-weight-medium">{{ item.metric }}</td>
            <td class="text-body-2 text-error font-weight-bold">{{ item.value }}</td>
            <td>
              <v-chip size="small" :color="getSeverityColor(item.severity).color" :variant="getSeverityColor(item.severity).variant">
                {{ item.severity }}
              </v-chip>
            </td>
            <td>
              <v-badge dot inline :color="getStatusColor(item.status)" class="mr-1" />
              <span class="text-caption font-weight-medium">{{ item.status }}</span>
            </td>
            <td class="text-center">
              <v-btn icon="mdi-check-decagram-outline" variant="text" size="small" color="primary" title="Acknowledge Alert" />
              <v-btn icon="mdi-dots-vertical" variant="text" size="small" color="grey-darken-1" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: monospace;
}
</style>