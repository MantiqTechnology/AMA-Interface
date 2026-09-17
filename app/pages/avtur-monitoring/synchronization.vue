<script setup lang="ts">
//import { ref } from 'vue'

// Breadcrumbs
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Store-and-Forward Synchronization', disabled: true, href: '#' },
]

// Tab Navigation
const activeTab = ref(0)
const tabs = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
  { title: 'Queue Transactions', icon: 'mdi-tray-full' },
  { title: 'Sync History', icon: 'mdi-history' },
  { title: 'Conflict / Review', icon: 'mdi-alert-circle-outline' },
  { title: 'Failed Transactions', icon: 'mdi-close-circle-outline' },
  { title: 'Settings', icon: 'mdi-cog-outline' },
]

// Top Summary Metrics
const metrics = [
  { title: 'Total Antrian', count: '128', unit: 'Transaksi', sub: 'Total menunggu sinkronisasi', icon: 'mdi-database', color: 'primary' },
  { title: 'Pending Sync', count: '96', unit: 'Transaksi', sub: 'Menunggu koneksi tersedia', icon: 'mdi-clock-outline', color: 'warning' },
  { title: 'Synced', count: '1,842', unit: 'Transaksi', sub: 'Berhasil disinkronkan', icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'Failed', count: '14', unit: 'Transaksi', sub: 'Gagal sinkronisasi', icon: 'mdi-close-circle-outline', color: 'error' },
  { title: 'Requires Review', count: '8', unit: 'Transaksi', sub: 'Perlu peninjauan', icon: 'mdi-alert-circle-outline', color: 'purple' },
  { title: 'Sinkronisasi Terakhir', count: '21 Agu 2026 10:28', unit: '', sub: '3 menit lalu', icon: 'mdi-sync', color: 'info' },
]

// Device Connectivity Table Data (8 Items Minimal)
const devices = ref([
  { id: 'TAB-001', location: 'Wamena (WMX)', connection: '4G', connColor: 'success', status: 'Online', lastConnected: '1 menit lalu' },
  { id: 'TAB-002', location: 'Sentani (DJJ)', connection: 'Wi-Fi', connColor: 'info', status: 'Online', lastConnected: '2 menit lalu' },
  { id: 'TAB-003', location: 'Timika (TIM)', connection: 'VSAT', connColor: 'purple', status: 'Online', lastConnected: '3 menit lalu' },
  { id: 'TAB-004', location: 'Dekai (DKI)', connection: 'Offline', connColor: 'error', status: 'Offline', lastConnected: '2 jam lalu' },
  { id: 'TAB-005', location: 'Mulia (MII)', connection: '4G', connColor: 'success', status: 'Online', lastConnected: '1 menit lalu' },
  { id: 'TAB-006', location: 'Merauke (MKQ)', connection: 'Wi-Fi', connColor: 'info', status: 'Online', lastConnected: '5 menit lalu' },
  { id: 'TAB-007', location: 'Nabire (NBX)', connection: 'VSAT', connColor: 'purple', status: 'Offline', lastConnected: '4 jam lalu' },
  { id: 'TAB-008', location: 'Biak (BIK)', connection: '4G', connColor: 'success', status: 'Online', lastConnected: 'Just now' },
])

// Pending Sync Table Filters
const filterDevice = ref('Semua Perangkat')
const filterType = ref('Semua Tipe Transaksi')
const filterLocation = ref('Semua Lokasi')
const filterPriority = ref('Semua Prioritas')
const searchQuery = ref('')

// Queue Transactions Data (8 Items Minimal)
const queueTransactions = ref([
  { id: 'TXN-20260821-00128', type: 'Drum to Aircraft', ref: 'PK-FAB / M-2026-081', location: 'Wamena (WMX)', device: 'TAB-001', createdAt: '21 Agu 2026 10:25', status: 'Pending Sync', size: '45 KB' },
  { id: 'TXN-20260821-00127', type: 'DPPU to Drum', ref: 'DRUM-0082', location: 'Wamena (WMX)', device: 'TAB-001', createdAt: '21 Agu 2026 10:24', status: 'Pending Sync', size: '32 KB' },
  { id: 'TXN-20260821-00126', type: 'Drum Transfer', ref: 'WMX -> TIM', location: 'Wamena (WMX)', device: 'TAB-001', createdAt: '21 Agu 2026 10:22', status: 'Pending Sync', size: '28 KB' },
  { id: 'TXN-20260821-00125', type: 'Drum to Aircraft', ref: 'PK-FTY / M-2026-080', location: 'Sentani (DJJ)', device: 'TAB-002', createdAt: '21 Agu 2026 10:21', status: 'Pending Sync', size: '41 KB' },
  { id: 'TXN-20260821-00124', type: 'DPPU to Aircraft', ref: 'PK-FLR / DJJ-5621', location: 'Sentani (DJJ)', device: 'TAB-002', createdAt: '21 Agu 2026 10:20', status: 'Pending Sync', size: '38 KB' },
  { id: 'TXN-20260821-00123', type: 'Drum to Aircraft', ref: 'PK-GAG / TIM-0112', location: 'Timika (TIM)', device: 'TAB-003', createdAt: '21 Agu 2026 10:18', status: 'Pending Sync', size: '44 KB' },
  { id: 'TXN-20260821-00122', type: 'Drum Transfer', ref: 'TIM -> MII', location: 'Timika (TIM)', device: 'TAB-003', createdAt: '21 Agu 2026 10:15', status: 'Pending Sync', size: '29 KB' },
  { id: 'TXN-20260821-00121', type: 'DPPU to Drum', ref: 'DRUM-0099', location: 'Merauke (MKQ)', device: 'TAB-006', createdAt: '21 Agu 2026 10:10', status: 'Pending Sync', size: '35 KB' },
])

// Conflict / Review Data (8 Items Minimal)
const conflictSearch = ref('')
const conflictTransactions = ref([
  {
    id: 'TXN-20260821-00102',
    type: 'Drum to Aircraft',
    ref: 'PK-FLR / M-2026-079',
    device: 'TAB-002',
    location: 'Sentani (DJJ)',
    detectedAt: '21 Agu 2026 09:50',
    conflictType: 'Volume Mismatch',
    localData: 'Volume Refuel: 450 Litres',
    serverData: 'Stok Terdaftar: 400 Litres',
    description: 'Volume pengisian di tablet melebihi sisa stok drum yang dicatat pada server.'
  },
  {
    id: 'TXN-20260821-00095',
    type: 'DPPU to Drum',
    ref: 'DRUM-0077',
    device: 'TAB-001',
    location: 'Wamena (WMX)',
    detectedAt: '21 Agu 2026 09:30',
    conflictType: 'Timestamp Sequence Fault',
    localData: 'Waktu Pengisian: 10:15 WIT',
    serverData: 'Status Drum: Kosong sejak 10:10 WIT',
    description: 'Urutan waktu pengisian bertabrakan dengan status penerimaan drum server.'
  },
  {
    id: 'TXN-20260821-00091',
    type: 'Drum to Aircraft',
    ref: 'PK-FAB / M-2026-074',
    device: 'TAB-003',
    location: 'Timika (TIM)',
    detectedAt: '21 Agu 2026 09:15',
    conflictType: 'Meter Reading Out of Range',
    localData: 'Meter Awal: 12,450 L',
    serverData: 'Meter Terakhir: 12,100 L',
    description: 'Angka meteran pengisian lokal melompat terlalu jauh dari rekaman terakhir server.'
  },
  {
    id: 'TXN-20260821-00089',
    type: 'Drum Transfer',
    ref: 'WMX -> DKI',
    device: 'TAB-004',
    location: 'Dekai (DKI)',
    detectedAt: '21 Agu 2026 09:02',
    conflictType: 'Duplicate Hash',
    localData: 'Hash: 0x8f2a...e91',
    serverData: 'Hash Terdaftar: 0x8f2a...e91',
    description: 'Hash transaksi terdeteksi pernah diunggah oleh tablet TAB-001 sebelumnya.'
  },
  {
    id: 'TXN-20260821-00084',
    type: 'DPPU to Drum',
    ref: 'DRUM-0065',
    device: 'TAB-005',
    location: 'Mulia (MII)',
    detectedAt: '21 Agu 2026 08:40',
    conflictType: 'Density Deviation Fault',
    localData: 'Massa Jenis: 0.798 g/ml',
    serverData: 'Massa Jenis Standard: 0.805 g/ml',
    description: 'Hasil pengujian massa jenis di tablet di luar deviasi toleransi standar server.'
  },
  {
    id: 'TXN-20260821-00078',
    type: 'Drum to Aircraft',
    ref: 'PK-RJT / BIK-1102',
    device: 'TAB-008',
    location: 'Biak (BIK)',
    detectedAt: '21 Agu 2026 08:12',
    conflictType: 'Invalid Digital Signature',
    localData: 'Signer: Pilot PK-RJT',
    serverData: 'Signature Key Mismatch',
    description: 'Tanda tangan digital penerima avtur tidak terverifikasi oleh server sertifikat.'
  },
  {
    id: 'TXN-20260821-00072',
    type: 'DPPU to Aircraft',
    ref: 'PK-YAS / MKQ-4411',
    device: 'TAB-006',
    location: 'Merauke (MKQ)',
    detectedAt: '21 Agu 2026 07:55',
    conflictType: 'Expired Batch Conflict',
    localData: 'Batch ID: BATCH-2025-12',
    serverData: 'Batch Status: Expired (1 Ags 2026)',
    description: 'Nomor batch avtur yang diisikan terdeteksi sudah kedaluwarsa pada basis data pusat.'
  },
  {
    id: 'TXN-20260821-00069',
    type: 'Drum Transfer',
    ref: 'TIM -> NBX',
    device: 'TAB-007',
    location: 'Nabire (NBX)',
    detectedAt: '21 Agu 2026 07:20',
    conflictType: 'Seal Status Unverified',
    localData: 'Segel: Broken (Rusak)',
    serverData: 'Segel Origin: Intact (Utuh)',
    description: 'Status segel drum saat diterima berbeda dari status segel saat pengiriman dari Timika.'
  }
])

// Failed Transactions Data (8 Items Minimal)
const failedSearch = ref('')
const failedErrorFilter = ref('Semua Jenis Error')
const failedTransactions = ref([
  {
    id: 'TXN-20260821-00088',
    type: 'Drum to Aircraft',
    ref: 'PK-FAB / M-2026-078',
    device: 'TAB-004',
    location: 'Dekai (DKI)',
    failedAt: '21 Agu 2026 09:12',
    errorCode: 'ERR_NET_TIMEOUT',
    errorMessage: 'Koneksi terputus saat pengiriman payload (HTTP 504 Timeout)',
    retryCount: 3,
    payload: '{\n  "txn_id": "TXN-20260821-00088",\n  "drum_id": "DRUM-1042",\n  "volume_liters": 200,\n  "aircraft_reg": "PK-FAB"\n}'
  },
  {
    id: 'TXN-20260821-00082',
    type: 'DPPU to Drum',
    ref: 'DRUM-0090',
    device: 'TAB-004',
    location: 'Dekai (DKI)',
    failedAt: '21 Agu 2026 08:45',
    errorCode: 'ERR_VAL_INVALID_BATCH',
    errorMessage: 'Nomor batch drum (DRUM-0090) tidak terdaftar pada ERP Server',
    retryCount: 2,
    payload: '{\n  "txn_id": "TXN-20260821-00082",\n  "drum_id": "DRUM-0090",\n  "volume_liters": 200\n}'
  },
  {
    id: 'TXN-20260820-00155',
    type: 'Drum Transfer',
    ref: 'WMX -> DKI',
    device: 'TAB-001',
    location: 'Wamena (WMX)',
    failedAt: '20 Agu 2026 17:30',
    errorCode: 'ERR_DUP_UUID',
    errorMessage: 'UUID transaksi terdeteksi duplikat pada database pusat',
    retryCount: 5,
    payload: '{\n  "txn_id": "TXN-20260820-00155",\n  "origin": "WMX",\n  "destination": "DKI"\n}'
  },
  {
    id: 'TXN-20260820-00140',
    type: 'Drum to Aircraft',
    ref: 'PK-FTY / M-2026-075',
    device: 'TAB-003',
    location: 'Timika (TIM)',
    failedAt: '20 Agu 2026 15:10',
    errorCode: 'ERR_AUTH_EXPIRED_TOKEN',
    errorMessage: 'Token otentikasi tablet kedaluwarsa saat sinkronisasi',
    retryCount: 1,
    payload: '{\n  "txn_id": "TXN-20260820-00140",\n  "aircraft": "PK-FTY"\n}'
  },
  {
    id: 'TXN-20260820-00132',
    type: 'DPPU to Drum',
    ref: 'DRUM-0104',
    device: 'TAB-005',
    location: 'Mulia (MII)',
    failedAt: '20 Agu 2026 14:22',
    errorCode: 'ERR_STORAGE_FULL',
    errorMessage: 'Kapasitas penyimpanan server staging penuh saat menulis log audit',
    retryCount: 4,
    payload: '{\n  "txn_id": "TXN-20260820-00132",\n  "drum_id": "DRUM-0104"\n}'
  },
  {
    id: 'TXN-20260820-00128',
    type: 'Drum to Aircraft',
    ref: 'PK-RJT / NBX-0098',
    device: 'TAB-007',
    location: 'Nabire (NBX)',
    failedAt: '20 Agu 2026 12:05',
    errorCode: 'ERR_GPS_STALE_DATA',
    errorMessage: 'Koordinat GPS pengisian di tablet lebih tua dari rentang toleransi 30 menit',
    retryCount: 2,
    payload: '{\n  "txn_id": "TXN-20260820-00128",\n  "lat": "-3.3662",\n  "lng": "135.4972"\n}'
  },
  {
    id: 'TXN-20260820-00115',
    type: 'DPPU to Aircraft',
    ref: 'PK-GAG / MKQ-3310',
    device: 'TAB-006',
    location: 'Merauke (MKQ)',
    failedAt: '20 Agu 2026 10:40',
    errorCode: 'ERR_SERVER_500_INTERNAL',
    errorMessage: 'Internal Server Error pada Microservice Inventory Avtur',
    retryCount: 6,
    payload: '{\n  "txn_id": "TXN-20260820-00115",\n  "status": "FAILED_SERVICE"\n}'
  },
  {
    id: 'TXN-20260820-00101',
    type: 'Drum Transfer',
    ref: 'BIK -> WMX',
    device: 'TAB-008',
    location: 'Biak (BIK)',
    failedAt: '20 Agu 2026 08:15',
    errorCode: 'ERR_PAYLOAD_CORRUPTED',
    errorMessage: 'Gagal melakukan verifikasi checksum SHA-256 pada payload paket data',
    retryCount: 3,
    payload: '{\n  "txn_id": "TXN-20260820-00101",\n  "checksum": "INVALID_HASH_881"\n}'
  }
])

// Modal Detail State & Action Handlers
const showDetailModal = ref(false)
const selectedTxn = ref<any>(null)

function openDetail(txn: any) {
  selectedTxn.value = txn
  showDetailModal.value = true
}

function handleRetrySingle(id: string) {
  alert(`Memulai retry sinkronisasi untuk ID: ${id}`)
}

function handleRetryAll() {
  alert('Memulai retry sinkronisasi untuk semua 8 transaksi gagal...')
}

function handleResolveConflict(id: string, choice: 'local' | 'server') {
  alert(`Konflik ${id} diselesaikan menggunakan data versi ${choice}`)
}

const page = ref(1)
const itemsPerPage = ref(5)
const isSyncing = ref(false)

function handleSyncNow() {
  isSyncing.value = true
  setTimeout(() => {
    isSyncing.value = false
  }, 2000)
}
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">
    <!-- Header & Breadcrumbs -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />
    <h1 class="text-h5 font-weight-bold mb-1 text-grey-darken-3">
      Store-and-Forward Synchronization
    </h1>
    <p class="text-caption text-grey-darken-1 mb-4">
      Monitor antrean data dari rugged tablet dan proses sinkronisasi ke ERP website ketika koneksi internet tersedia
    </p>

    <!-- Navigation Bar Utama -->
    <AvturTopNav class="mb-4" />

    <!-- Tab Navigation -->
    <v-card variant="flat" class="border rounded-lg bg-white mb-6 overflow-hidden">
      <v-tabs v-model="activeTab" color="primary" class="border-b">
        <v-tab
          v-for="(tab, i) in tabs"
          :key="i"
          :value="i"
          class="text-capitalize font-weight-medium text-body-2"
        >
          <v-icon :icon="tab.icon" class="mr-2" size="small" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Tab Content Window Container -->
    <v-window v-model="activeTab">
      
      <!-- TAB 0: DASHBOARD -->
      <v-window-item :value="0">
        <!-- Top Metrics Row -->
        <v-row class="mb-6">
          <v-col v-for="(m, idx) in metrics" :key="idx" cols="12" sm="6" md="2">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption font-weight-bold text-grey-darken-1">{{ m.title }}</span>
                <v-avatar :color="m.color" variant="tonal" size="32">
                  <v-icon :icon="m.icon" size="18" />
                </v-avatar>
              </div>
              <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">{{ m.count }}</div>
              <div v-if="m.unit" class="text-caption text-grey-darken-1">{{ m.unit }}</div>
              <div class="text-caption text-grey-medium mt-1">{{ m.sub }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Middle Row: Queue Overview + Device Connectivity -->
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
              <v-row>
                <!-- Queue Overview Donut Chart -->
                <v-col cols="12" md="5" class="border-e-md">
                  <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">Queue Overview</div>
                  <div class="d-flex align-center justify-space-around py-2">
                    <div class="position-relative d-flex align-center justify-center">
                      <v-progress-circular :model-value="75" :size="120" :width="14" color="warning">
                        <div class="text-center">
                          <div class="text-h6 font-weight-bold">128</div>
                          <div class="text-caption text-grey-medium">Total</div>
                        </div>
                      </v-progress-circular>
                    </div>
                    <div class="d-flex flex-column gap-2 text-caption">
                      <div class="d-flex align-center gap-2">
                        <v-icon icon="mdi-circle" color="warning" size="10" />
                        <span>Pending Sync</span>
                        <span class="font-weight-bold ml-auto">96 (75%)</span>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <v-icon icon="mdi-circle" color="success" size="10" />
                        <span>Synced</span>
                        <span class="font-weight-bold ml-auto">1,842 (20%)</span>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <v-icon icon="mdi-circle" color="error" size="10" />
                        <span>Failed</span>
                        <span class="font-weight-bold ml-auto">14 (3%)</span>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <v-icon icon="mdi-circle" color="purple" size="10" />
                        <span>Requires Review</span>
                        <span class="font-weight-bold ml-auto">8 (2%)</span>
                      </div>
                    </div>
                  </div>
                </v-col>

                <!-- Trend Chart -->
                <v-col cols="12" md="7">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Tren Sinkronisasi (7 Hari Terakhir)</div>
                    <v-select
                      model-value="7 Hari Terakhir"
                      :items="['7 Hari Terakhir', '30 Hari Terakhir']"
                      variant="outlined"
                      density="compact"
                      hide-details
                      style="max-width: 140px;"
                    />
                  </div>

                  <div class="d-flex align-center gap-4 text-caption mb-3">
                    <span class="d-flex align-center gap-1"><v-icon icon="mdi-circle" color="success" size="8" /> Synced</span>
                    <span class="d-flex align-center gap-1"><v-icon icon="mdi-circle" color="error" size="8" /> Failed</span>
                    <span class="d-flex align-center gap-1"><v-icon icon="mdi-circle" color="purple" size="8" /> Requires Review</span>
                  </div>

                  <div class="pa-2 bg-grey-lighten-5 rounded border">
                    <svg viewBox="0 0 500 120" class="w-100" style="height: 110px;">
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#e0e0e0" stroke-dasharray="3 3" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="#e0e0e0" stroke-dasharray="3 3" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="#e0e0e0" stroke-dasharray="3 3" />

                      <polyline fill="none" stroke="#4CAF50" stroke-width="2" points="20,70 90,50 160,30 230,80 300,70 370,60 450,50" />
                      <polyline fill="none" stroke="#F44336" stroke-width="2" points="20,100 90,90 160,80 230,95 300,90 370,90 450,95" />
                      <polyline fill="none" stroke="#9C27B0" stroke-width="2" points="20,110 90,105 160,100 230,110 300,108 370,108 450,110" />

                      <circle cx="450" cy="50" r="4" fill="#4CAF50" />
                      <circle cx="450" cy="95" r="4" fill="#F44336" />
                      <circle cx="450" cy="110" r="4" fill="#9C27B0" />
                    </svg>

                    <div class="d-flex justify-space-between text-caption text-grey-medium px-2 mt-1">
                      <span>15 Agu</span><span>16 Agu</span><span>17 Agu</span><span>18 Agu</span><span>19 Agu</span><span>20 Agu</span><span>21 Agu</span>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card>
          </v-col>

          <!-- Device Connectivity Table -->
          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 d-flex flex-column justify-space-between">
              <div>
                <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">Konektivitas Perangkat</div>

                <v-table density="compact" class="border rounded mb-3 text-caption">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th class="font-weight-bold">Perangkat</th>
                      <th class="font-weight-bold">Lokasi</th>
                      <th class="font-weight-bold">Koneksi</th>
                      <th class="font-weight-bold">Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in devices" :key="d.id">
                      <td class="font-weight-bold">{{ d.id }}</td>
                      <td>{{ d.location }}</td>
                      <td>
                        <div class="d-flex align-center gap-1">
                          <v-chip size="x-small" :color="d.connColor" variant="tonal" class="font-weight-medium">{{ d.connection }}</v-chip>
                          <v-chip size="x-small" :color="d.status === 'Online' ? 'success' : 'error'" variant="tonal">{{ d.status }}</v-chip>
                        </div>
                      </td>
                      <td class="text-grey-darken-1">{{ d.lastConnected }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-btn variant="outlined" color="primary" block prepend-icon="mdi-tablet-dashboard" class="text-none font-weight-bold">
                Lihat Semua Perangkat
              </v-btn>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bottom Alert -->
        <v-alert
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-information-outline"
          class="rounded-lg border border-blue-lighten-4"
        >
          <template #title>
            <span class="text-subtitle-2 font-weight-bold">Tentang Store-and-Forward</span>
          </template>
          <span class="text-caption">
            Data transaksi disimpan secara lokal dan dienkripsi di rugged tablet. Ketika koneksi internet tersedia melalui 4G/Wi-Fi/VSAT, sistem akan mengirimkan data secara otomatis sesuai urutan waktu (FIFO) dan menjaga integritas data.
            <a href="#" class="text-primary font-weight-bold text-decoration-none ml-1">Pelajari lebih lanjut</a>
          </span>
        </v-alert>
      </v-window-item>

      <!-- TAB 1: QUEUE TRANSACTIONS -->
      <v-window-item :value="1">
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
              <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">
                Queue Transactions (Pending Sync)
              </div>

              <!-- Filter Controls -->
              <v-row density="compact" class="mb-4">
                <v-col cols="12" sm="3">
                  <v-select v-model="filterDevice" :items="['Semua Perangkat', 'TAB-001', 'TAB-002', 'TAB-003', 'TAB-006']" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-select v-model="filterType" :items="['Semua Tipe Transaksi', 'Drum to Aircraft', 'DPPU to Drum', 'Drum Transfer']" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-select v-model="filterLocation" :items="['Semua Lokasi', 'Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)', 'Merauke (MKQ)']" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-select v-model="filterPriority" :items="['Semua Prioritas', 'High', 'Normal']" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="9" class="mt-2">
                  <v-text-field
                    v-model="searchQuery"
                    placeholder="Cari ID Transaksi / Referensi / Pesawat"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="3" class="mt-2">
                  <v-btn color="primary" variant="outlined" block prepend-icon="mdi-filter-outline" class="text-none">Filter</v-btn>
                </v-col>
              </v-row>

              <!-- Table -->
              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID Transaksi</th>
                    <th class="font-weight-bold text-caption">Tipe Transaksi</th>
                    <th class="font-weight-bold text-caption">Referensi</th>
                    <th class="font-weight-bold text-caption">Lokasi</th>
                    <th class="font-weight-bold text-caption">Perangkat</th>
                    <th class="font-weight-bold text-caption">Waktu Dibuat</th>
                    <th class="font-weight-bold text-caption">Status</th>
                    <th class="font-weight-bold text-caption">Ukuran</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in queueTransactions" :key="item.id">
                    <td class="font-weight-bold text-body-2">{{ item.id }}</td>
                    <td class="text-body-2">{{ item.type }}</td>
                    <td class="text-body-2 font-weight-medium text-grey-darken-3">{{ item.ref }}</td>
                    <td class="text-body-2">{{ item.location }}</td>
                    <td class="text-body-2 font-weight-bold">{{ item.device }}</td>
                    <td class="text-body-2 text-grey-darken-1">{{ item.createdAt }}</td>
                    <td>
                      <v-chip size="x-small" color="warning" variant="tonal" class="font-weight-medium">
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td class="text-body-2">{{ item.size }}</td>
                    <td class="text-center">
                      <v-btn icon="mdi-eye-outline" variant="text" size="small" color="grey-darken-1" />
                      <v-btn icon="mdi-dots-vertical" variant="text" size="small" color="grey-darken-1" />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Pagination -->
              <div class="d-flex align-center justify-space-between mt-4">
                <span class="text-caption text-grey-darken-1">Menampilkan 1 - 8 dari 96 transaksi</span>
                <div class="d-flex align-center gap-2">
                  <v-pagination v-model="page" :length="12" total-visible="4" density="compact" />
                  <v-select v-model="itemsPerPage" :items="[8, 15, 25]" suffix="/ halaman" variant="outlined" density="compact" hide-details style="width: 130px;" />
                </div>
              </div>
            </v-card>
          </v-col>

          <!-- Detail Sinkronisasi Panel -->
          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 d-flex flex-column justify-space-between">
              <div>
                <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">Detail Sinkronisasi</div>

                <div class="d-flex flex-column gap-3 text-caption">
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-grey-darken-1">Status Sinkronisasi</span>
                    <span class="text-primary font-weight-bold d-flex align-center gap-1">
                      Berjalan <v-icon icon="mdi-sync" size="small" class="mdi-spin" />
                    </span>
                  </div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Mode</span><span class="font-weight-medium">Store-and-Forward</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Koneksi Aktif</span><span class="font-weight-medium">Wi-Fi (20 Mbps)</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Perangkat Aktif</span><span class="font-weight-medium">6 dari 8 perangkat</span></div>

                  <div class="mt-2">
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-grey-darken-1">Transaksi Sedang Diproses</span>
                      <span class="font-weight-bold">12 / 128 (9%)</span>
                    </div>
                    <v-progress-linear model-value="9" color="primary" height="6" rounded />
                  </div>

                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Kecepatan Upload</span><span class="font-weight-medium">1.2 MB/s</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Waktu Mulai</span><span class="font-weight-medium">21 Agu 2026 10:26</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Estimasi Selesai</span><span class="font-weight-medium">21 Agu 2026 10:31</span></div>
                </div>
              </div>

              <v-btn
                color="primary"
                variant="outlined"
                block
                prepend-icon="mdi-sync"
                :loading="isSyncing"
                class="text-none font-weight-bold mt-6"
                @click="handleSyncNow"
              >
                Sinkronisasi Sekarang
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 2: SYNC HISTORY -->
      <v-window-item :value="2">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="text-subtitle-1 font-weight-bold mb-2 text-grey-darken-3">
            Riwayat Sinkronisasi (Sync History)
          </div>
          <p class="text-caption text-grey-darken-1 mb-4">
            Daftar transaksi yang telah berhasil tersinkronisasi ke server pusat.
          </p>
          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Transaksi</th>
                <th class="font-weight-bold text-caption">Tipe Transaksi</th>
                <th class="font-weight-bold text-caption">Lokasi</th>
                <th class="font-weight-bold text-caption">Waktu Sync</th>
                <th class="font-weight-bold text-caption">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-weight-bold text-body-2">TXN-20260821-00120</td>
                <td class="text-body-2">Drum to Aircraft</td>
                <td class="text-body-2">Wamena (WMX)</td>
                <td class="text-body-2 text-grey-darken-1">21 Agu 2026 10:20</td>
                <td><v-chip size="x-small" color="success" variant="tonal">Synced</v-chip></td>
              </tr>
              <tr>
                <td class="font-weight-bold text-body-2">TXN-20260821-00119</td>
                <td class="text-body-2">DPPU to Drum</td>
                <td class="text-body-2">Sentani (DJJ)</td>
                <td class="text-body-2 text-grey-darken-1">21 Agu 2026 10:15</td>
                <td><v-chip size="x-small" color="success" variant="tonal">Synced</v-chip></td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 3: CONFLICT / REVIEW -->
      <v-window-item :value="3">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Konflik & Peninjauan Data</div>
              <p class="text-caption text-grey-darken-1 mb-0">
                Data transaksi yang memerlukan verifikasi manual akibat perbedaan data lokal tablet dan server ERP.
              </p>
            </div>
            <v-chip color="purple" variant="tonal" class="font-weight-bold">
              8 Perlu Peninjauan
            </v-chip>
          </div>

          <v-row density="compact" class="my-3">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="conflictSearch"
                placeholder="Cari ID Transaksi / jenis konflik..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Transaksi</th>
                <th class="font-weight-bold text-caption">Perangkat & Lokasi</th>
                <th class="font-weight-bold text-caption">Jenis Konflik</th>
                <th class="font-weight-bold text-caption">Perbandingan Data (Lokal vs Server)</th>
                <th class="font-weight-bold text-caption">Waktu Terdeteksi</th>
                <th class="font-weight-bold text-caption text-center">Aksi Resolusi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in conflictTransactions" :key="item.id">
                <td class="font-weight-bold text-body-2">
                  {{ item.id }}
                  <div class="text-caption text-grey-medium">{{ item.type }} ({{ item.ref }})</div>
                </td>
                <td class="text-body-2">
                  <div class="font-weight-medium">{{ item.device }}</div>
                  <div class="text-caption text-grey-darken-1">{{ item.location }}</div>
                </td>
                <td>
                  <v-chip color="purple" size="x-small" variant="tonal" class="font-weight-bold">
                    {{ item.conflictType }}
                  </v-chip>
                </td>
                <td class="py-2">
                  <div class="text-caption">
                    <span class="text-error font-weight-medium">Lokal:</span> {{ item.localData }}
                  </div>
                  <div class="text-caption">
                    <span class="text-info font-weight-medium">Server:</span> {{ item.serverData }}
                  </div>
                </td>
                <td class="text-body-2 text-grey-darken-1">{{ item.detectedAt }}</td>
                <td class="text-center">
                  <div class="d-flex align-center justify-center gap-1">
                    <v-btn
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="text-none"
                      @click="handleResolveConflict(item.id, 'local')"
                    >
                      Pilih Lokal
                    </v-btn>
                    <v-btn
                      size="x-small"
                      color="secondary"
                      variant="tonal"
                      class="text-none"
                      @click="handleResolveConflict(item.id, 'server')"
                    >
                      Pilih Server
                    </v-btn>
                    <v-btn
                      icon="mdi-eye-outline"
                      variant="text"
                      size="small"
                      color="grey-darken-1"
                      @click="openDetail(item)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 4: FAILED TRANSACTIONS -->
      <v-window-item :value="4">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Transaksi Gagal Sinkronisasi
              </div>
              <p class="text-caption text-grey-darken-1 mb-0">
                Rincian transaksi yang mengalami kegagalan beserta kode error, log detail, dan aksi perbaikan.
              </p>
            </div>
            <v-btn
              color="error"
              variant="flat"
              prepend-icon="mdi-refresh"
              class="text-none font-weight-bold"
              @click="handleRetryAll"
            >
              Coba Ulang Semua (8 Gagal)
            </v-btn>
          </div>

          <!-- Alert Ringkasan Error -->
          <v-alert
            type="error"
            variant="tonal"
            density="comfortable"
            icon="mdi-alert-circle-outline"
            class="rounded-lg border border-red-lighten-4 mb-4"
          >
            <div class="text-caption">
              <strong>8 transaksi gagal terkirim.</strong> Mayoritas error disebabkan timeout koneksi satelit (40%) dan ketidaksesuaian ID Batch Drum (30%). Kamu bisa memeriksa log payload JSON untuk audit atau melakukan sinkron ulang.
            </div>
          </v-alert>

          <!-- Filter & Search -->
          <v-row density="compact" class="mb-4">
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="failedSearch"
                placeholder="Cari ID / Kode Error / Device..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-select
                v-model="failedErrorFilter"
                :items="['Semua Jenis Error', 'ERR_NET_TIMEOUT', 'ERR_VAL_INVALID_BATCH', 'ERR_DUP_UUID', 'ERR_AUTH_EXPIRED_TOKEN', 'ERR_STORAGE_FULL', 'ERR_GPS_STALE_DATA', 'ERR_SERVER_500_INTERNAL', 'ERR_PAYLOAD_CORRUPTED']"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Tabel Rincian Gagal -->
          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Transaksi</th>
                <th class="font-weight-bold text-caption">Perangkat & Lokasi</th>
                <th class="font-weight-bold text-caption">Jenis Transaksi</th>
                <th class="font-weight-bold text-caption">Kode Error</th>
                <th class="font-weight-bold text-caption">Pesan / Alasan Kegagalan</th>
                <th class="font-weight-bold text-caption text-center">Retry</th>
                <th class="font-weight-bold text-caption">Waktu Gagal</th>
                <th class="font-weight-bold text-caption text-center">Aksi Pelacakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in failedTransactions" :key="item.id">
                <td class="font-weight-bold text-body-2">
                  {{ item.id }}
                  <div class="text-caption text-grey-medium">{{ item.ref }}</div>
                </td>
                <td class="text-body-2">
                  <div class="font-weight-medium">{{ item.device }}</div>
                  <div class="text-caption text-grey-darken-1">{{ item.location }}</div>
                </td>
                <td class="text-body-2">{{ item.type }}</td>
                <td>
                  <v-chip color="error" size="x-small" variant="flat" class="font-weight-bold">
                    {{ item.errorCode }}
                  </v-chip>
                </td>
                <td class="text-caption text-grey-darken-3" style="max-width: 260px;">
                  {{ item.errorMessage }}
                </td>
                <td class="text-center font-weight-bold text-body-2">
                  <v-chip size="x-small" color="grey" variant="tonal">
                    {{ item.retryCount }}x
                  </v-chip>
                </td>
                <td class="text-caption text-grey-darken-1">{{ item.failedAt }}</td>
                <td class="text-center">
                  <div class="d-flex align-center justify-center gap-1">
                    <v-tooltip text="Lihat Detail Log & Payload JSON" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-code-json"
                          variant="text"
                          size="small"
                          color="primary"
                          @click="openDetail(item)"
                        />
                      </template>
                    </v-tooltip>
                    <v-tooltip text="Coba Ulang Sinkronisasi" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-refresh"
                          variant="text"
                          size="small"
                          color="success"
                          @click="handleRetrySingle(item.id)"
                        />
                      </template>
                    </v-tooltip>
                    <v-tooltip text="Hapus / Abaikan" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-trash-can-outline"
                          variant="text"
                          size="small"
                          color="error"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 5: SETTINGS -->
      <v-window-item :value="5">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="text-subtitle-1 font-weight-bold mb-2 text-grey-darken-3">
            Pengaturan Sinkronisasi (Store-and-Forward)
          </div>
          <p class="text-caption text-grey-darken-1 mb-4">
            Konfigurasi interval waktu, batas payload, dan mode jaringan otomatis.
          </p>
          <v-row density="compact" style="max-width: 500px;">
            <v-col cols="12">
              <v-switch label="Otomatis Sinkronisasi saat Online" color="primary" model-value="true" hide-details />
            </v-col>
            <v-col cols="12" class="mt-2">
              <v-select
                label="Interval Auto-Sync"
                :items="['Setiap 5 Menit', 'Setiap 15 Menit', 'Setiap Jam']"
                model-value="Setiap 5 Menit"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

    </v-window>

    <!-- Modal Detail Log & Payload JSON Inspector -->
    <v-dialog v-model="showDetailModal" max-width="650">
      <v-card rounded="lg" class="pa-4" v-if="selectedTxn">
        <v-card-title class="d-flex align-center justify-space-between text-subtitle-1 font-weight-bold px-0 pt-0">
          <span>Detail Audit & Payload: {{ selectedTxn.id }}</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="showDetailModal = false" />
        </v-card-title>
        <v-divider class="mb-4" />
        <v-card-text class="pa-0">
          <div class="mb-3">
            <span class="text-caption font-weight-bold text-grey-darken-2">Pesan Error / Deskripsi:</span>
            <div class="pa-3 bg-red-lighten-5 rounded border border-red-lighten-3 text-caption font-weight-medium text-error mt-1">
              [{{ selectedTxn.errorCode || selectedTxn.conflictType || 'LOG_INFO' }}] {{ selectedTxn.errorMessage || selectedTxn.description }}
            </div>
          </div>

          <div class="mb-3">
            <span class="text-caption font-weight-bold text-grey-darken-2">Payload JSON Transaksi:</span>
            <pre class="pa-3 bg-grey-darken-4 text-green-lighten-3 rounded text-caption mt-1 overflow-x-auto"><code>{{ selectedTxn.payload || JSON.stringify(selectedTxn, null, 2) }}</code></pre>
          </div>
        </v-card-text>
        <v-card-actions class="justify-end px-0 pb-0 mt-4">
          <v-btn color="grey" variant="text" @click="showDetailModal = false" class="text-none">Tutup</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-pencil" class="text-none font-weight-bold">Edit Payload</v-btn>
          <v-btn color="success" variant="flat" prepend-icon="mdi-refresh" @click="handleRetrySingle(selectedTxn.id)" class="text-none font-weight-bold">Coba Ulang</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.min-vh-100 { min-height: 100vh; }
.mdi-spin {
  animation: spin 1.5s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>