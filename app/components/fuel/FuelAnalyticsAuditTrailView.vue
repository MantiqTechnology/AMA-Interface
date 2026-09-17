<script setup lang="ts">
// Audit Trail Filters
const searchQuery = ref('')
const selectedModule = ref('Semua Modul')
const selectedActor = ref('Semua Aktor')

const moduleOptions = ['Semua Modul', 'Refueling Transaction', 'Master Data', 'Quality Control', 'Hardware Config']
const actorOptions = ['Semua Aktor', 'System Admin', 'Field Technician', 'System Sync Engine']

// Mock Audit Log Data
const auditLogs = ref([
  { id: 'LOG-8801', timestamp: '22 Aug 2026 10:20:11', actor: 'Ahmad (Technician)', module: 'Refueling Transaction', action: 'CREATE_TRANSACTION', target: 'TX-20260822-004', details: 'Pengisian 180L Avtur ke PK-AMA pada Skid 02', ip: '192.168.1.45' },
  { id: 'LOG-8802', timestamp: '22 Aug 2026 09:45:00', actor: 'System Sync Engine', module: 'Store-and-Forward', action: 'SYNC_OFFLINE_BATCH', target: 'Batch #1042', details: 'Sinkronisasi 24 record transaksi dari Rugged Tablet WMX', ip: '10.0.4.12' },
  { id: 'LOG-8803', timestamp: '22 Aug 2026 08:30:15', actor: 'Budi (Supervisor)', module: 'Master Data', action: 'UPDATE_DRUM_STATUS', target: 'DRUM-0007', details: 'Mengubah status drum menjadi Maintenance (Perlu Audit)', ip: '192.168.1.10' },
  { id: 'LOG-8804', timestamp: '21 Aug 2026 16:15:22', actor: 'System Admin', module: 'Hardware Config', action: 'CALIBRATE_FLOWMETER', target: 'FM-DIG-002', details: 'Update faktor kalibrasi K-factor flowmeter skid 01', ip: '192.168.1.2' },
])
</script>

<template>
  <div class="pa-2">
    <!-- Header Title -->
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold text-grey-darken-3">Fuel Operational Audit Trail & Logs</h2>
      <p class="text-caption text-grey-darken-1 mb-0">
        Jejak audit sistem tidak terubah (immutable) untuk kepatuhan regulasi penerbangan dan pelacakan transaksi bahan bakar.
      </p>
    </div>

    <!-- Main Content Table Card -->
    <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
      <!-- Search & Filter Controls -->
      <v-row class="mb-4" density="compact">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            placeholder="Cari Log ID / Target / Detail..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="selectedModule"
            :items="moduleOptions"
            label="Modul Operational"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-select
            v-model="selectedActor"
            :items="actorOptions"
            label="Pengguna / Aktor"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn variant="outlined" color="grey-darken-2" prepend-icon="mdi-download" block class="text-none">
            Export Logs
          </v-btn>
        </v-col>
      </v-row>

      <!-- Audit Logs Table -->
      <v-table density="comfortable" class="border rounded">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-caption text-grey-darken-2">Log ID</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Timestamp</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Aktor</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Modul</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Aksi</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Target Ref ID</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">Detail Perubahan</th>
            <th class="font-weight-bold text-caption text-grey-darken-2">IP Address</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in auditLogs" :key="log.id">
            <td class="font-weight-bold text-caption font-mono text-grey-darken-3">{{ log.id }}</td>
            <td class="text-caption">{{ log.timestamp }}</td>
            <td class="text-body-2 font-weight-medium">{{ log.actor }}</td>
            <td class="text-caption"><v-chip size="x-small" variant="tonal" color="primary">{{ log.module }}</v-chip></td>
            <td class="text-caption font-mono font-weight-bold text-indigo">{{ log.action }}</td>
            <td class="text-caption font-mono">{{ log.target }}</td>
            <td class="text-body-2">{{ log.details }}</td>
            <td class="text-caption font-mono text-grey-medium">{{ log.ip }}</td>
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