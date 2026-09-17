<script setup lang="ts">
//import { ref, computed } from 'vue'

// Data Statis Sementara (Akan dipindah ke Composable nanti)
const qcLogs = ref([
  { id: 'QC-20260822-0045', refNo: 'DRUM-00087', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.795 kg/L', temp: '28.2 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Yohanes (OP-004)', time: '22 Aug 2026 08:15' },
  { id: 'QC-20260822-0044', refNo: 'TK-02', objectType: 'Tangki DPPU', batchNo: 'BATCH-190826-01', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.796 kg/L', temp: '27.8 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Eko (OP-002)', time: '22 Aug 2026 07:40' },
  { id: 'QC-20260821-0043', refNo: 'DRUM-00092', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'Sentani (DJJ)', swdResult: 'FAILED (Suspicious)', density: '0.805 kg/L', temp: '29.1 °C', sealStatus: 'Broken Seal', overallStatus: 'QUARANTINED', statusColor: 'error', inspector: 'Markus (OP-009)', time: '21 Aug 2026 16:30' },
])

const detailById: Record<string, any> = {
  'QC-20260822-0045': {
    id: 'QC-20260822-0045', refNo: 'DRUM-00087 (Drum 200L)', batchNo: 'BATCH-210826-05', coaDocNo: 'CoA-PTM-2026-8891', location: 'DPPU Wamena (WMX)', inspectionTime: '22 Aug 2026 08:15 WIB', overallStatus: 'PASSED / FIT-FOR-FLIGHT', statusColor: 'success', visualCheck: 'Bright & Clear, Free from Solid Matter', swdCapsuleResult: 'PASSED (Kapsul Kuning - Tidak Ada Air Absolut)', obsDensity: '0.795 kg/L', obsTemp: '28.2 °C', convertedDensity15: '0.804 kg/L', densitySpecification: 'Standar JIG: 0.775 - 0.840 kg/L', sealNo: 'SEAL-WMX-99412', sealCondition: 'Segel Utuh, No Tampering', drumBodyCondition: 'Bebas Penyok, Grounding Lug Bekerja', operatorName: 'Yohanes Prasetyo (ID: OP-004)', supervisorName: 'Thomas Novan (ID: SUP-001)', digitalSignTime: '22 Aug 2026 08:18 WIB', gpsCoordinate: '-4.0961, 138.9482 (Wamena Airstrip)'
  },
  'QC-20260822-0044': {
    id: 'QC-20260822-0044', refNo: 'TK-02 (Hub WMX)', batchNo: 'BATCH-190826-01', coaDocNo: 'CoA-PTM-2026-8875', location: 'DPPU Wamena (WMX)', inspectionTime: '22 Aug 2026 07:40 WIB', overallStatus: 'PASSED / FIT-FOR-FLIGHT', statusColor: 'success', visualCheck: 'Bright & Clear', swdCapsuleResult: 'PASSED (Clear)', obsDensity: '0.796 kg/L', obsTemp: '27.8 °C', convertedDensity15: '0.804 kg/L', densitySpecification: 'Standar JIG: 0.775 - 0.840 kg/L', sealNo: 'SEAL-TK02-18291', sealCondition: 'Intact / Verified', drumBodyCondition: 'Tank body normal', operatorName: 'Eko Santoso', supervisorName: 'Thomas Novan', digitalSignTime: '22 Aug 2026 07:44 WIB', gpsCoordinate: '-4.0961, 138.9482'
  },
  'QC-20260821-0043': {
    id: 'QC-20260821-0043', refNo: 'DRUM-00092 (Drum 200L)', batchNo: 'BATCH-210826-05', coaDocNo: 'CoA-PTM-2026-8891', location: 'Sentani (DJJ)', inspectionTime: '21 Aug 2026 16:30 WIB', overallStatus: 'QUARANTINED', statusColor: 'error', visualCheck: 'Visual anomaly detected', swdCapsuleResult: 'FAILED (Suspicious)', obsDensity: '0.805 kg/L', obsTemp: '29.1 °C', convertedDensity15: '0.814 kg/L', densitySpecification: 'Perlu investigasi', sealNo: 'SEAL-DJJ-88721', sealCondition: 'Broken Seal', drumBodyCondition: 'Minor dent', operatorName: 'Markus', supervisorName: 'Pending', digitalSignTime: 'Belum sign-off', gpsCoordinate: '-2.6500, 140.5167'
  }
}

// State Navigasi & Filter
const selectedLogId = ref('QC-20260822-0045')
const dateRange = ref('01 Aug 2026 - 22 Aug 2026')
const selectedLocation = ref('Semua Station')
const selectedQcStatus = ref('Semua Status')
const selectedType = ref('Semua Tipe Sampling')
const searchQuery = ref('')
const page = ref(1)
const itemsPerPage = ref(10)

const locationItems = ['Semua Station', 'DPPU Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)']
const statusItems = ['Semua Status', 'PASSED', 'QUARANTINED', 'PENDING SIGN']
const typeItems = ['Semua Tipe Sampling', 'Drum 200L', 'Tangki DPPU', 'Smart Nozzle']

// Computed Data
const selectedLog = computed(() => detailById[selectedLogId.value] ?? detailById[qcLogs.value[0]?.id])

const filteredLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return qcLogs.value.filter(item => {
    const locMatch = selectedLocation.value === 'Semua Station' || item.location === selectedLocation.value
    const statMatch = selectedQcStatus.value === 'Semua Status' || item.overallStatus === selectedQcStatus.value
    const typeMatch = selectedType.value === 'Semua Tipe Sampling' || item.objectType === selectedType.value
    const searchMatch = !query || [item.id, item.refNo, item.batchNo, item.location].join(' ').toLowerCase().includes(query)
    return locMatch && statMatch && typeMatch && searchMatch
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / itemsPerPage.value)))
const paginatedLogs = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

const displayStart = computed(() => filteredLogs.value.length ? (page.value - 1) * itemsPerPage.value + 1 : 0)
const displayEnd = computed(() => Math.min(page.value * itemsPerPage.value, filteredLogs.value.length))

// Helpers
const selectLog = (id: string) => { selectedLogId.value = id }
const resetFilters = () => {
  dateRange.value = '01 Aug 2026 - 22 Aug 2026'
  selectedLocation.value = 'Semua Station'
  selectedQcStatus.value = 'Semua Status'
  selectedType.value = 'Semua Tipe Sampling'
  searchQuery.value = ''
  page.value = 1
}
const onFilterChange = () => { page.value = 1 }
const getSwdColor = (result: string) => result.includes('PASSED') ? 'success' : (result === 'PENDING' ? 'warning' : 'error')
const getSealColor = (status: string) => status.includes('Intact') ? 'teal' : 'error'
</script>

<template>
  <v-row class="mb-6">
    <!-- Kolom Tabel Kiri -->
    <v-col cols="12" lg="8">
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
        <!-- Header -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Log Inspeksi Quality Control</div>
            <div class="text-caption text-medium-emphasis">Monitoring hasil pemeriksaan mutu dan K3 di station.</div>
          </div>
          <v-chip size="small" color="primary" variant="tonal">{{ filteredLogs.length }} hasil</v-chip>
        </div>

        <!-- Filter Controls -->
        <div class="filter-grid mb-4">
          <v-text-field v-model="dateRange" label="Tanggal Inspeksi" prepend-inner-icon="mdi-calendar-range" variant="outlined" density="compact" hide-details @update:model-value="onFilterChange" />
          <v-select v-model="selectedLocation" :items="locationItems" label="Lokasi / Station" variant="outlined" density="compact" hide-details @update:model-value="onFilterChange" />
          <v-select v-model="selectedQcStatus" :items="statusItems" label="Hasil Inspeksi" variant="outlined" density="compact" hide-details @update:model-value="onFilterChange" />
          <v-select v-model="selectedType" :items="typeItems" label="Objek Sampling" variant="outlined" density="compact" hide-details @update:model-value="onFilterChange" />
          <v-text-field v-model="searchQuery" placeholder="Cari ID / Drum / Batch / Operator" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details class="filter-search" @update:model-value="onFilterChange" />
          <v-btn variant="outlined" color="primary" prepend-icon="mdi-filter-remove-outline" class="text-none filter-reset" @click="resetFilters">Reset</v-btn>
        </div>

        <!-- Data Table -->
        <div class="table-wrapper border rounded-lg">
          <v-table density="comfortable">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID / Tanggal</th>
                <th class="font-weight-bold text-caption">Objek / Batch</th>
                <th class="font-weight-bold text-caption">Station</th>
                <th class="font-weight-bold text-caption">Uji SWD</th>
                <th class="font-weight-bold text-caption">Density & Suhu</th>
                <th class="font-weight-bold text-caption">Segel</th>
                <th class="font-weight-bold text-caption">Status QC</th>
                <th class="font-weight-bold text-caption text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedLogs" :key="item.id" class="log-row" :class="{ 'selected-log-row': selectedLog.id === item.id }" @click="selectLog(item.id)">
                <td>
                  <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.time }}</div>
                </td>
                <td>
                  <div class="font-weight-bold text-body-2">{{ item.refNo }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.batchNo }}</div>
                  <v-chip size="x-small" variant="tonal" class="mt-1">{{ item.objectType }}</v-chip>
                </td>
                <td class="text-body-2">{{ item.location }}</td>
                <td>
                  <v-chip size="x-small" :color="getSwdColor(item.swdResult)" variant="tonal" class="font-weight-medium">{{ item.swdResult }}</v-chip>
                </td>
                <td class="text-caption">
                  <div class="font-weight-bold">{{ item.density }}</div>
                  <div class="text-medium-emphasis">@ {{ item.temp }}</div>
                </td>
                <td>
                  <v-chip size="x-small" :color="getSealColor(item.sealStatus)" variant="outlined" class="font-weight-medium">{{ item.sealStatus }}</v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="item.statusColor" variant="tonal" class="font-weight-bold">{{ item.overallStatus }}</v-chip>
                </td>
                <td class="text-center">
                  <v-btn icon="mdi-file-eye-outline" variant="text" size="small" color="grey-darken-1" @click.stop="selectLog(item.id)" />
                </td>
              </tr>
              <tr v-if="!paginatedLogs.length">
                <td colspan="8" class="text-center py-10">
                  <v-icon icon="mdi-clipboard-search-outline" size="40" color="grey" class="mb-2" />
                  <div class="text-body-2 font-weight-medium">Tidak ada log inspeksi</div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Pagination -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-4">
          <span class="text-caption text-medium-emphasis">Menampilkan {{ displayStart }} - {{ displayEnd }} dari {{ filteredLogs.length }} hasil filter</span>
          <div class="d-flex align-center ga-3">
            <v-pagination v-model="page" :length="totalPages" density="compact" :total-visible="5" />
            <v-select v-model="itemsPerPage" :items="[10, 25, 50]" suffix="/ hlm" variant="outlined" density="compact" hide-details style="width: 120px" @update:model-value="page = 1" />
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- Kolom Detail Kanan -->
    <v-col cols="12" lg="4">
      <v-card v-if="selectedLog" variant="flat" class="border rounded-lg bg-white detail-card">
        <!-- Header Detail -->
        <div class="pa-5 pb-4">
          <div class="d-flex align-start justify-space-between ga-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">{{ selectedLog.id }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ selectedLog.refNo }}</div>
            </div>
            <v-chip size="small" :color="selectedLog.statusColor" variant="tonal" class="font-weight-bold">{{ selectedLog.overallStatus }}</v-chip>
          </div>
          <div class="detail-meta mt-3"><v-icon icon="mdi-clock-outline" size="15" class="mr-1" />{{ selectedLog.inspectionTime }}</div>
          <div class="detail-meta"><v-icon icon="mdi-map-marker-outline" size="15" class="mr-1" />{{ selectedLog.location }}</div>
        </div>
        <v-divider />

        <!-- Detail Sections -->
        <div class="pa-5">
          <!-- Seksi 1: SWD -->
          <div class="detail-section">
            <div class="detail-section-title"><v-icon icon="mdi-flask-outline" color="primary" size="18" class="mr-2" /> 1. Hasil Pengujian Fisik & SWD</div>
            <div class="detail-box">
              <div class="detail-row"><span>Visual Check</span><strong class="text-teal">{{ selectedLog.visualCheck }}</strong></div>
              <div class="detail-row"><span>Uji SWD</span><strong class="text-success">{{ selectedLog.swdCapsuleResult }}</strong></div>
              <div class="detail-row"><span>Density / Temp</span><strong>{{ selectedLog.obsDensity }} @ {{ selectedLog.obsTemp }}</strong></div>
              <div class="detail-row detail-row-highlight"><span>Density Kor. 15°C</span><strong class="text-primary">{{ selectedLog.convertedDensity15 }}</strong></div>
              <div class="detail-spec">{{ selectedLog.densitySpecification }}</div>
            </div>
          </div>

          <!-- Seksi 2: Drum -->
          <div class="detail-section">
            <div class="detail-section-title"><v-icon icon="mdi-seal" color="teal" size="18" class="mr-2" /> 2. Kondisi Fisik & Segel Drum</div>
            <div class="detail-box">
              <div class="detail-row"><span>Nomor Seal</span><strong>{{ selectedLog.sealNo }}</strong></div>
              <div class="detail-row"><span>Status Keutuhan</span><strong class="text-teal">{{ selectedLog.sealCondition }}</strong></div>
              <div class="detail-row"><span>Fisik Drum</span><strong>{{ selectedLog.drumBodyCondition }}</strong></div>
            </div>
          </div>

          <!-- Seksi 3: Batch -->
          <div class="detail-section">
            <div class="detail-section-title"><v-icon icon="mdi-file-certificate-outline" color="warning" size="18" class="mr-2" /> 3. Verifikasi Batch & CoA</div>
            <div class="detail-box">
              <div class="detail-row"><span>Nomor Batch</span><strong>{{ selectedLog.batchNo }}</strong></div>
              <div class="detail-row"><span>No. CoA Pabrik</span><strong class="text-primary">{{ selectedLog.coaDocNo }}</strong></div>
            </div>
          </div>

          <!-- Seksi 4: Sign-off -->
          <div class="detail-section mb-5">
            <div class="detail-section-title"><v-icon icon="mdi-shield-check-outline" color="success" size="18" class="mr-2" /> 4. Digital Sign-off & Audit Trail</div>
            <div class="detail-box">
              <div class="detail-row"><span>Operator</span><strong>{{ selectedLog.operatorName }}</strong></div>
              <div class="detail-row"><span>Supervisor</span><strong>{{ selectedLog.supervisorName }}</strong></div>
              <div class="detail-row"><span>Waktu Sign</span><strong>{{ selectedLog.digitalSignTime }}</strong></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="action-grid">
            <v-btn variant="outlined" color="primary" block prepend-icon="mdi-file-pdf-box" class="text-none font-weight-bold">Cetak QC</v-btn>
            <v-btn color="primary" block prepend-icon="mdi-check-decagram" class="text-none font-weight-bold" :disabled="selectedLog.statusColor !== 'warning'">Validasi Sign</v-btn>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.filter-search { grid-column: span 3; }
.filter-reset { min-height: 40px; }
.table-wrapper { overflow-x: auto; }
.log-row { cursor: pointer; transition: background-color 0.15s ease; }
.log-row:hover { background: rgb(var(--v-theme-grey-lighten-5)); }
.selected-log-row { background: rgb(var(--v-theme-blue-lighten-5)); }
.detail-card { overflow: hidden; }
.detail-meta { display: flex; align-items: center; color: rgb(var(--v-theme-grey-darken-1)); font-size: 11px; margin-top: 4px; }
.detail-section { margin-bottom: 20px; }
.detail-section-title { display: flex; align-items: center; font-size: 13px; font-weight: 700; color: rgb(var(--v-theme-grey-darken-3)); margin-bottom: 8px; }
.detail-box { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid rgb(var(--v-theme-grey-lighten-2)); border-radius: 8px; background: rgb(var(--v-theme-grey-lighten-5)); }
.detail-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; font-size: 11px; }
.detail-row > span { color: rgb(var(--v-theme-grey-darken-1)); flex: 0 0 auto; }
.detail-row > strong { text-align: right; color: rgb(var(--v-theme-grey-darken-3)); font-weight: 600; }
.detail-row-highlight { border-top: 1px solid rgb(var(--v-theme-grey-lighten-2)); padding-top: 8px; margin-top: 2px; }
.detail-spec { padding-top: 2px; color: rgb(var(--v-theme-grey-darken-1)); font-size: 10px; line-height: 1.4; text-align: right; }
.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

@media (max-width: 960px) {
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-search { grid-column: span 2; }
}
@media (max-width: 700px) {
  .filter-grid, .action-grid { grid-template-columns: 1fr; }
  .filter-search { grid-column: span 1; }
}
</style>