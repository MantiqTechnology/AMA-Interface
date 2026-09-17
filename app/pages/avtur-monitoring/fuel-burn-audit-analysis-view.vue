<script setup lang="ts">
//import { computed, ref } from 'vue'

/* -------------------------------------------------------------------------- */
/* Breadcrumbs                                                                 */
/* -------------------------------------------------------------------------- */

const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Fuel Burn Analysis', disabled: true, href: '#' },
]

/* -------------------------------------------------------------------------- */
/* Internal Navigation                                                         */
/* -------------------------------------------------------------------------- */

const activeTab = ref(0)

const tabs = [
  { title: 'Dashboard Analisis', icon: 'mdi-chart-box-outline' },
  { title: 'Flight & Fuel Matching', icon: 'mdi-airplane-sync' },
  { title: 'Variance Fuel Burn', icon: 'mdi-file-percent-outline' },
  { title: 'Discrepancy Alerts', icon: 'mdi-alert-circle-outline' },
  { title: 'Rekap Rute & Armada', icon: 'mdi-routes' },
]

/* -------------------------------------------------------------------------- */
/* Interactive Modals & Toast State                                            */
/* -------------------------------------------------------------------------- */

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const showSnackbar = (msg: string, color = 'success') => {
  snackbarText.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// Sync Loading State
const isSyncing = ref(false)
const triggerSync = () => {
  isSyncing.value = true
  setTimeout(() => {
    isSyncing.value = false
    showSnackbar('Data Flight Operations berhasil disinkronkan!')
  }, 1200)
}

// Export Modal
const dialogExport = ref(false)
const exportFormat = ref('PDF')
const exportOptions = ['PDF', 'Excel (.xlsx)', 'CSV']
const handleExport = () => {
  dialogExport.value = false
  showSnackbar(`Laporan berhasil di-export ke format ${exportFormat.value}!`)
}

// Add/Edit Flight Modal
const dialogFlightForm = ref(false)
const isEditMode = ref(false)
const defaultForm = {
  missionId: '',
  tailNo: 'PK-FAB',
  route: 'WMX → DJJ',
  refuelLoc: 'DPPU Wamena (WMX)',
  refuelVol: 1200,
  plannedBurn: 1100,
  actualBurn: 1120,
  pilot: 'Cpt. Hendra',
}
const flightForm = ref({ ...defaultForm })

const openAddDialog = () => {
  isEditMode.value = false
  flightForm.value = {
    ...defaultForm,
    missionId: `M-2026-0${Math.floor(83 + Math.random() * 50)}`,
  }
  dialogFlightForm.value = true
}

const openEditDialog = (item: typeof flightFuelLogs.value[number]) => {
  isEditMode.value = true
  flightForm.value = {
    missionId: item.missionId,
    tailNo: item.tailNo,
    route: item.route,
    refuelLoc: item.refuelLoc,
    refuelVol: parseInt(item.refuelVol.replace(/[^0-9]/g, '')) || 0,
    plannedBurn: parseInt(item.plannedBurn.replace(/[^0-9]/g, '')) || 0,
    actualBurn: parseInt(item.actualBurn.replace(/[^0-9]/g, '')) || 0,
    pilot: item.pilot,
  }
  dialogFlightForm.value = true
}

const saveFlightData = () => {
  const planned = Number(flightForm.value.plannedBurn) || 1
  const actual = Number(flightForm.value.actualBurn) || 0
  const diffPercent = (((actual - planned) / planned) * 100).toFixed(1)
  const numPercent = Math.abs(parseFloat(diffPercent))
  const isHigh = numPercent >= 5

  const newItem = {
    missionId: flightForm.value.missionId,
    tailNo: flightForm.value.tailNo,
    route: flightForm.value.route,
    refuelLoc: flightForm.value.refuelLoc,
    refuelVol: `${Number(flightForm.value.refuelVol).toLocaleString()} L`,
    plannedBurn: `${planned.toLocaleString()} L`,
    actualBurn: `${actual.toLocaleString()} L`,
    varianceVal: `${Number(diffPercent) >= 0 ? '+' : ''}${diffPercent}%`,
    variancePercent: numPercent,
    varianceStatus: isHigh ? 'High Variance' : 'Normal',
    syncStatus: isHigh ? 'Flagged' : 'Matched',
    syncColor: isHigh ? 'error' : 'success',
    pilot: flightForm.value.pilot,
  }

  if (isEditMode.value) {
    const idx = flightFuelLogs.value.findIndex(f => f.missionId === newItem.missionId)
    if (idx !== -1) {
      flightFuelLogs.value[idx] = newItem
    }
    showSnackbar(`Misi ${newItem.missionId} berhasil diperbarui!`)
  } else {
    flightFuelLogs.value.unshift(newItem)
    selectedMissionId.value = newItem.missionId
    showSnackbar(`Misi baru ${newItem.missionId} berhasil ditambahkan!`)
  }

  dialogFlightForm.value = false
}

// Delete Confirmation
const dialogDelete = ref(false)
const targetMissionId = ref<string | null>(null)

const confirmDelete = (missionId: string) => {
  targetMissionId.value = missionId
  dialogDelete.value = true
}

const deleteFlight = () => {
  if (targetMissionId.value) {
    flightFuelLogs.value = flightFuelLogs.value.filter(f => f.missionId !== targetMissionId.value)
    if (selectedMissionId.value === targetMissionId.value && flightFuelLogs.value.length > 0) {
      selectedMissionId.value = flightFuelLogs.value[0].missionId
    }
    showSnackbar(`Misi ${targetMissionId.value} berhasil dihapus!`, 'warning')
  }
  dialogDelete.value = false
}

// Report Dialog
const dialogReport = ref(false)

// Alert Resolution Modal
const dialogAlert = ref(false)
const selectedAlert = ref<any>(null)

const openAlertModal = (alert: any) => {
  selectedAlert.value = alert
  dialogAlert.value = true
}

const resolveAlert = () => {
  if (selectedAlert.value) {
    selectedAlert.value.status = 'Resolved'
    showSnackbar(`Alert ${selectedAlert.value.id} ditandai selesai!`)
  }
  dialogAlert.value = false
}

/* -------------------------------------------------------------------------- */
/* Metrics                                                                     */
/* -------------------------------------------------------------------------- */

const metrics = [
  {
    title: 'Total Misi Penerbangan',
    count: '184',
    unit: 'Misi · Bulan Ini',
    sub: '↗ 5% vs bulan lalu',
    icon: 'mdi-airplane-takeoff',
    color: 'primary',
    subColor: 'success',
  },
  {
    title: 'Match Vol & Tail No',
    count: '97.8%',
    unit: '180 Misi Valid',
    sub: 'Tersinkron otomatis',
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    subColor: 'success',
  },
  {
    title: 'Avg Fuel Burn Variance',
    count: '+1.2%',
    unit: 'vs Flight Plan',
    sub: 'Dalam batas wajar < 5%',
    icon: 'mdi-scale-balance',
    color: 'info',
    subColor: 'success',
  },
  {
    title: 'Discrepancy / High Variance',
    count: '4',
    unit: 'Misi flagged',
    sub: 'Membutuhkan review',
    icon: 'mdi-alert-rhombus-outline',
    color: 'error',
    subColor: 'error',
  },
  {
    title: 'Total Fuel Burn YTD',
    count: '845,200 L',
    unit: 'Liter konsumsi',
    sub: '↗ 9% efficiency',
    icon: 'mdi-fire-circle',
    color: 'teal',
    subColor: 'success',
  },
  {
    title: 'Unmatched Refuel Txn',
    count: '2',
    unit: 'Transaksi on-site',
    sub: 'Pending Mission ID',
    icon: 'mdi-file-question-outline',
    color: 'warning',
    subColor: 'warning',
  },
]

/* -------------------------------------------------------------------------- */
/* Integration Workflow                                                       */
/* -------------------------------------------------------------------------- */

const integrationSteps = [
  {
    step: 1,
    title: 'Tarik Flight Plan',
    desc: 'Tail No, rute, Mission ID dan planned fuel dari Flight Operations.',
    icon: 'mdi-calendar-clock-outline',
    color: 'primary',
  },
  {
    step: 2,
    title: 'Matching Refuel',
    desc: 'Cocokkan Tail No dan lokasi saat transaksi Avtur dicatat.',
    icon: 'mdi-gas-station-outline',
    color: 'info',
  },
  {
    step: 3,
    title: 'Flight Actual',
    desc: 'Catat fuel onboard saat departure dan remaining fuel saat landing.',
    icon: 'mdi-notebook-edit-outline',
    color: 'teal',
  },
  {
    step: 4,
    title: 'Calculate Variance',
    desc: 'Bandingkan planned vs actual fuel burn per misi dan rute.',
    icon: 'mdi-calculator-variant-outline',
    color: 'warning',
  },
  {
    step: 5,
    title: 'Flag Discrepancy',
    desc: 'Flag otomatis untuk variance >5% atau data matching tidak valid.',
    icon: 'mdi-sync-alert',
    color: 'purple',
  },
]

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

const dateRange = ref('01 Aug 2026 - 22 Aug 2026')
const selectedRoute = ref('Semua Rute')
const selectedStatus = ref('Semua Status Sync')
const selectedVariance = ref('Semua Variance')
const searchQuery = ref('')

const routeOptions = [
  'Semua Rute',
  'WMX → DJJ',
  'DJJ → WMX',
  'TIM → WMX',
  'DJJ → TIM',
  'WMX → BVK',
]

const statusOptions = [
  'Semua Status Sync',
  'Matched',
  'Flagged',
  'Unmatched Txn',
]

const varianceOptions = [
  'Semua Variance',
  'Normal (< 5%)',
  'High (> 5%)',
]

/* -------------------------------------------------------------------------- */
/* Flight & Fuel Data                                                          */
/* -------------------------------------------------------------------------- */

const flightFuelLogs = ref([
  {
    missionId: 'M-2026-081',
    tailNo: 'PK-FAB',
    route: 'WMX → DJJ',
    refuelLoc: 'DPPU Wamena (WMX)',
    refuelVol: '1,250 L',
    plannedBurn: '1,100 L',
    actualBurn: '1,120 L',
    varianceVal: '+1.8%',
    variancePercent: 1.8,
    varianceStatus: 'Normal',
    syncStatus: 'Matched',
    syncColor: 'success',
    pilot: 'Cpt. Hendra',
  },
  {
    missionId: 'M-2026-082',
    tailNo: 'PK-FTP',
    route: 'DJJ → WMX',
    refuelLoc: 'Sentani (DJJ)',
    refuelVol: '180 L',
    plannedBurn: '450 L',
    actualBurn: '510 L',
    varianceVal: '+13.3%',
    variancePercent: 13.3,
    varianceStatus: 'High Variance',
    syncStatus: 'Flagged',
    syncColor: 'error',
    pilot: 'Cpt. Ridwan',
  },
  {
    missionId: 'M-2026-079',
    tailNo: 'PK-SNM',
    route: 'TIM → WMX',
    refuelLoc: 'Timika (TIM)',
    refuelVol: '190 L',
    plannedBurn: '600 L',
    actualBurn: '590 L',
    varianceVal: '-1.6%',
    variancePercent: 1.6,
    varianceStatus: 'Normal',
    syncStatus: 'Matched',
    syncColor: 'success',
    pilot: 'Cpt. Yuli',
  },
  {
    missionId: 'M-2026-078',
    tailNo: 'PK-GKF',
    route: 'DJJ → TIM',
    refuelLoc: 'Sentani (DJJ)',
    refuelVol: '850 L',
    plannedBurn: '800 L',
    actualBurn: '805 L',
    varianceVal: '+0.6%',
    variancePercent: 0.6,
    varianceStatus: 'Normal',
    syncStatus: 'Matched',
    syncColor: 'success',
    pilot: 'Cpt. Alex',
  },
  {
    missionId: 'M-2026-075',
    tailNo: 'PK-FAB',
    route: 'WMX → BVK',
    refuelLoc: 'DPPU Wamena (WMX)',
    refuelVol: '400 L',
    plannedBurn: '350 L',
    actualBurn: '355 L',
    varianceVal: '+1.4%',
    variancePercent: 1.4,
    varianceStatus: 'Normal',
    syncStatus: 'Unmatched Txn',
    syncColor: 'warning',
    pilot: 'Cpt. Hendra',
  },
])

/* -------------------------------------------------------------------------- */
/* Tab 2, 3, & 4 Extended Data                                                 */
/* -------------------------------------------------------------------------- */

const varianceData = ref([
  { route: 'WMX → DJJ', flights: 45, avgPlanned: '1,100 L', avgActual: '1,115 L', variance: '+1.3%', status: 'Normal', color: 'success' },
  { route: 'DJJ → WMX', flights: 42, avgPlanned: '450 L', avgActual: '480 L', variance: '+6.6%', status: 'Review', color: 'warning' },
  { route: 'TIM → WMX', flights: 38, avgPlanned: '600 L', avgActual: '595 L', variance: '-0.8%', status: 'Normal', color: 'success' },
  { route: 'DJJ → TIM', flights: 32, avgPlanned: '800 L', avgActual: '805 L', variance: '+0.6%', status: 'Normal', color: 'success' },
])

const discrepancyAlerts = ref([
  { id: 'ALT-001', date: '21 Aug 2026', missionId: 'M-2026-082', tailNo: 'PK-FTP', issue: 'Actual Fuel Burn exceeds 5% variance (+13.3%)', severity: 'High', status: 'Open' },
  { id: 'ALT-002', date: '20 Aug 2026', missionId: 'M-2026-075', tailNo: 'PK-FAB', issue: 'Unmatched Refuel Transaction (TXN-20260820-0091)', severity: 'Medium', status: 'Investigating' },
  { id: 'ALT-003', date: '19 Aug 2026', missionId: 'M-2026-061', tailNo: 'PK-GKF', issue: 'Missing Final FOB on Landing Log', severity: 'Medium', status: 'Open' },
])

const fleetRecap = ref([
  { tailNo: 'PK-FAB', type: 'Cessna Caravan 208B', flights: 84, totalBurn: '72,400 L', efficiency: '94%', status: 'Optimal' },
  { tailNo: 'PK-FTP', type: 'Cessna Caravan 208B', flights: 65, totalBurn: '58,200 L', efficiency: '88%', status: 'Sub-Optimal' },
  { tailNo: 'PK-SNM', type: 'Pilatus PC-6', flights: 35, totalBurn: '18,500 L', efficiency: '96%', status: 'Optimal' },
])

/* -------------------------------------------------------------------------- */
/* Selected Flight                                                             */
/* -------------------------------------------------------------------------- */

const selectedMissionId = ref('M-2026-081')

const selectedFlightRow = computed(() => {
  return (
    flightFuelLogs.value.find(
      item => item.missionId === selectedMissionId.value,
    ) ?? flightFuelLogs.value[0]
  )
})

const selectedFlight = computed(() => {
  const row = selectedFlightRow.value
  if (!row) return null

  return {
    ...row,
    tailDisplay: `${row.tailNo} (Cessna Caravan 208B)`,
    flightNo: 'AMA-810',
    routeDisplay: `${row.route}`,
    date: '21 Aug 2026',
    pilotDisplay: `${row.pilot} / FO Sitorus`,
    refuelTxnId: 'TXN-20260821-00128',
    initialFob: '300 L',
    totalFobOnTakeoff: '1,550 L',
    remainingFobOnLanding: '430 L',
    varianceLiters: '+20 L',
    notes: 'Penerbangan berjalan lancar. Terdapat holding sekitar 5 menit saat mendekati lokasi tujuan.',
  }
})

const selectFlight = (item: typeof flightFuelLogs.value[number]) => {
  selectedMissionId.value = item.missionId
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                   */
/* -------------------------------------------------------------------------- */

const filteredFlightLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return flightFuelLogs.value.filter(item => {
    const matchRoute = selectedRoute.value === 'Semua Rute' || item.route === selectedRoute.value
    const matchStatus = selectedStatus.value === 'Semua Status Sync' || item.syncStatus === selectedStatus.value
    const matchVariance = selectedVariance.value === 'Semua Variance' ||
      (selectedVariance.value === 'Normal (< 5%)' && item.variancePercent < 5) ||
      (selectedVariance.value === 'High (> 5%)' && item.variancePercent >= 5)

    const searchableText = [
      item.missionId, item.tailNo, item.route, item.refuelLoc, item.pilot, item.syncStatus,
    ].join(' ').toLowerCase()

    const matchSearch = !query || searchableText.includes(query)

    return matchRoute && matchStatus && matchVariance && matchSearch
  })
})

const resetFilters = () => {
  dateRange.value = '01 Aug 2026 - 22 Aug 2026'
  selectedRoute.value = 'Semua Rute'
  selectedStatus.value = 'Semua Status Sync'
  selectedVariance.value = 'Semua Variance'
  searchQuery.value = ''
  page.value = 1
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

const page = ref(1)
const itemsPerPage = ref(10)
const totalFlights = computed(() => flightFuelLogs.value.length)
const paginationLength = computed(() => Math.max(1, Math.ceil(totalFlights.value / itemsPerPage.value)))
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">
    <!-- Breadcrumb -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />

    <!-- Page Header -->
    <div class="d-flex align-start justify-space-between flex-wrap ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3 mb-1">
          Integrasi Flight Operations & Fuel Burn Analysis
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Validasi konsumsi Avtur terhadap flight plan, actual fuel burn,
          dan efisiensi setiap misi penerbangan.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-download-outline"
          class="text-none"
          @click="dialogExport = true"
        >
          Export Analysis
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-sync"
          class="text-none"
          :loading="isSyncing"
          @click="triggerSync"
        >
          Sync Flight Data
        </v-btn>
      </div>
    </div>

    <!-- Main Avtur Navigation Placeholder -->
    <AvturTopNav />

    <!-- Internal Navigation -->
    <v-card variant="flat" class="border rounded-lg bg-white mb-6">
      <v-tabs v-model="activeTab" color="primary" show-arrows>
        <v-tab v-for="(tab, index) in tabs" :key="index" :value="index" class="text-none">
          <v-icon :icon="tab.icon" size="18" class="mr-2" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Tab Contents Container -->
    <v-window v-model="activeTab" class="mb-6">
      
      <!-- TAB 0: Dashboard Analisis -->
      <v-window-item :value="0">
        <!-- Metrics -->
        <div class="metrics-grid mb-6">
          <v-card v-for="metric in metrics" :key="metric.title" variant="flat" class="border rounded-lg pa-4 bg-white metric-card">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-medium-emphasis">
                {{ metric.title }}
              </span>
              <v-avatar :color="metric.color" variant="tonal" size="34">
                <v-icon :icon="metric.icon" size="18" />
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-grey-darken-4">
              {{ metric.count }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ metric.unit }}
            </div>
            <div class="text-caption font-weight-medium mt-2" :class="`text-${metric.subColor}`">
              {{ metric.sub }}
            </div>
          </v-card>
        </div>

        <!-- Workflow -->
        <v-card variant="flat" class="border rounded-lg bg-white pa-5">
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Alur Integrasi Flight Operations → Fuel Management
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Mekanisme matching dan validasi konsumsi Avtur per misi.
              </div>
            </div>
            <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle-outline">
              Auto Validation Active
            </v-chip>
          </div>

          <div class="flow-grid">
            <template v-for="step in integrationSteps" :key="step.step">
              <div class="flow-item">
                <v-avatar :color="step.color" variant="tonal" size="42">
                  <v-icon :icon="step.icon" size="21" />
                </v-avatar>
                <div class="flow-number">{{ step.step }}</div>
                <div class="font-weight-bold text-body-2 text-grey-darken-3 mt-3">
                  {{ step.title }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1 flow-desc">
                  {{ step.desc }}
                </div>
              </div>
              <v-icon v-if="step.step < integrationSteps.length" icon="mdi-chevron-right" size="22" color="grey-lighten-1" class="flow-arrow" />
            </template>
          </div>
        </v-card>
      </v-window-item>

      <!-- TAB 1: Flight & Fuel Matching -->
      <v-window-item :value="1">
        <v-row>
          <!-- Flight Table -->
          <v-col cols="12" xl="8" lg="7">
            <v-card variant="flat" class="border rounded-lg bg-white h-100">
              <div class="pa-5 pb-3">
                <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                      Flight & Fuel Matching
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      Validasi hubungan antara misi penerbangan dan transaksi Avtur.
                    </div>
                  </div>
                  <div class="d-flex align-center ga-2">
                    <v-btn
                      color="primary"
                      size="small"
                      prepend-icon="mdi-plus"
                      class="text-none"
                      @click="openAddDialog"
                    >
                      Tambah Misi
                    </v-btn>
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ totalFlights }} Misi
                    </v-chip>
                  </div>
                </div>
              </div>
              <v-divider />

              <!-- Filters -->
              <div class="pa-5 pb-4">
                <v-row density="compact">
                  <v-col cols="12" md="4">
                    <v-text-field v-model="dateRange" label="Periode Penerbangan" prepend-inner-icon="mdi-calendar-range" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="6" md="4">
                    <v-select v-model="selectedRoute" :items="routeOptions" label="Rute" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="6" md="4">
                    <v-select v-model="selectedStatus" :items="statusOptions" label="Status Sync" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select v-model="selectedVariance" :items="varianceOptions" label="Variance" variant="outlined" density="compact" hide-details />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="searchQuery" placeholder="Cari Mission ID, Tail Number, pilot..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
                  </v-col>
                  <v-col cols="12" md="2" class="d-flex">
                    <v-btn variant="text" color="primary" prepend-icon="mdi-filter-off-outline" block class="text-none" @click="resetFilters">
                      Reset
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <!-- Table -->
              <div class="table-wrapper">
                <v-table density="comfortable" class="analysis-table">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th class="font-weight-bold text-caption">Mission / Tail</th>
                      <th class="font-weight-bold text-caption">Rute / Pilot</th>
                      <th class="font-weight-bold text-caption">Refuel</th>
                      <th class="font-weight-bold text-caption">Planned</th>
                      <th class="font-weight-bold text-caption">Actual</th>
                      <th class="font-weight-bold text-caption">Variance</th>
                      <th class="font-weight-bold text-caption">Sync</th>
                      <th class="font-weight-bold text-caption text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in filteredFlightLogs" :key="item.missionId" class="flight-row" :class="{ 'selected-row': selectedFlight?.missionId === item.missionId }" @click="selectFlight(item)">
                      <td>
                        <div class="text-body-2 font-weight-bold">{{ item.missionId }}</div>
                        <div class="text-caption text-primary font-weight-medium">{{ item.tailNo }}</div>
                      </td>
                      <td>
                        <div class="text-body-2 font-weight-medium">{{ item.route }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.pilot }}</div>
                      </td>
                      <td>
                        <div class="text-body-2 font-weight-bold">{{ item.refuelVol }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.refuelLoc }}</div>
                      </td>
                      <td class="text-body-2">{{ item.plannedBurn }}</td>
                      <td class="text-body-2 font-weight-medium">{{ item.actualBurn }}</td>
                      <td>
                        <v-chip size="x-small" :color="item.varianceStatus === 'Normal' ? 'success' : 'error'" variant="tonal" class="font-weight-bold">
                          {{ item.varianceVal }}
                        </v-chip>
                      </td>
                      <td>
                        <v-chip size="x-small" :color="item.syncColor" variant="tonal" class="font-weight-bold">
                          {{ item.syncStatus }}
                        </v-chip>
                      </td>
                      <td class="text-center" @click.stop>
                        <v-btn icon="mdi-eye-outline" variant="text" size="small" color="grey-darken-1" @click="selectFlight(item)" />
                        
                        <!-- Row Action Menu -->
                        <v-menu location="bottom end">
                          <template #activator="{ props }">
                            <v-btn icon="mdi-dots-vertical" variant="text" size="small" color="grey-darken-1" v-bind="props" />
                          </template>
                          <v-list density="compact" class="rounded-lg">
                            <v-list-item prepend-icon="mdi-pencil-outline" title="Edit Data" @click="openEditDialog(item)" />
                            <v-list-item prepend-icon="mdi-delete-outline" title="Hapus Data" class="text-error" @click="confirmDelete(item.missionId)" />
                          </v-list>
                        </v-menu>
                      </td>
                    </tr>
                    <tr v-if="filteredFlightLogs.length === 0">
                      <td colspan="8" class="text-center py-10">
                        <v-icon icon="mdi-airplane-search" size="42" color="grey-lighten-1" />
                        <div class="text-body-2 font-weight-medium mt-2">Data penerbangan tidak ditemukan</div>
                        <div class="text-caption text-medium-emphasis">Coba ubah filter atau kata pencarian.</div>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <!-- Pagination -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-3 pa-4">
                <span class="text-caption text-medium-emphasis">
                  Menampilkan <strong>{{ filteredFlightLogs.length }}</strong> data dari <strong>{{ totalFlights }}</strong> misi
                </span>
                <div class="d-flex align-center ga-3">
                  <v-pagination v-model="page" :length="paginationLength" density="compact" total-visible="5" />
                  <v-select v-model="itemsPerPage" :items="[10, 25, 50]" variant="outlined" density="compact" hide-details style="width: 105px" />
                </div>
              </div>
            </v-card>
          </v-col>

          <!-- Detail Panel -->
          <v-col cols="12" xl="4" lg="5">
            <v-card variant="flat" class="border rounded-lg bg-white h-100">
              <div v-if="selectedFlight" class="pa-5">
                <div class="d-flex align-center justify-space-between mb-1">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">{{ selectedFlight.missionId }}</div>
                    <div class="text-caption text-medium-emphasis">{{ selectedFlight.flightNo }}</div>
                  </div>
                  <v-chip size="x-small" :color="selectedFlight.syncColor" variant="tonal" class="font-weight-bold">
                    {{ selectedFlight.syncStatus }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">{{ selectedFlight.tailDisplay }}</div>
                <v-divider class="my-4" />

                <!-- Detail List -->
                <div class="detail-section-title"><v-icon icon="mdi-airplane" color="primary" size="18" /> Flight Operations</div>
                <div class="detail-list">
                  <div><span>Tanggal</span><strong>{{ selectedFlight.date }}</strong></div>
                  <div><span>Rute</span><strong class="text-primary">{{ selectedFlight.routeDisplay }}</strong></div>
                  <div><span>Pilot / Crew</span><strong>{{ selectedFlight.pilotDisplay }}</strong></div>
                </div>

                <div class="detail-section-title mt-5"><v-icon icon="mdi-gas-station" color="teal" size="18" /> Transaksi Avtur On-Site</div>
                <div class="detail-list">
                  <div><span>Fuel Txn ID</span><strong>{{ selectedFlight.refuelTxnId }}</strong></div>
                  <div><span>Lokasi</span><strong>{{ selectedFlight.refuelLoc }}</strong></div>
                  <div><span>Volume Refuel</span><strong class="text-teal">{{ selectedFlight.refuelVol }}</strong></div>
                  <div><span>FOB Sebelum Refuel</span><strong>{{ selectedFlight.initialFob }}</strong></div>
                  <div><span>FOB Takeoff</span><strong>{{ selectedFlight.totalFobOnTakeoff }}</strong></div>
                </div>

                <div class="detail-section-title mt-5"><v-icon icon="mdi-calculator-variant-outline" color="warning" size="18" /> Fuel Burn Analysis</div>
                <div class="burn-comparison mb-4">
                  <div><span>Planned Burn</span><strong>{{ selectedFlight.plannedBurn }}</strong></div>
                  <div><span>Actual Burn</span><strong>{{ selectedFlight.actualBurn }}</strong></div>
                  <div class="variance-result">
                    <span>Variance</span>
                    <strong :class="selectedFlight.variancePercent < 5 ? 'text-success' : 'text-error'">
                      {{ selectedFlight.varianceLiters }} ({{ selectedFlight.varianceVal }})
                    </strong>
                  </div>
                  <div><span>FOB Landing</span><strong class="text-primary">{{ selectedFlight.remainingFobOnLanding }}</strong></div>
                </div>

                <div class="text-caption">
                  <div class="font-weight-bold text-grey-darken-3 mb-1">Flight Log Notes</div>
                  <div class="note-box">{{ selectedFlight.notes }}</div>
                </div>

                <div class="d-flex ga-2 mt-5">
                  <v-btn variant="outlined" color="primary" block prepend-icon="mdi-file-chart-outline" class="text-none" @click="dialogReport = true">Laporan Misi</v-btn>
                  <v-btn color="primary" block prepend-icon="mdi-sync" class="text-none" :loading="isSyncing" @click="triggerSync">Re-Sync</v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 2: Variance Fuel Burn -->
      <v-window-item :value="2">
        <v-card variant="flat" class="border rounded-lg bg-white mb-4 pa-5">
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-4">
            Analisis Variance per Rute
          </div>
          <v-table density="comfortable" class="border rounded-lg">
            <thead class="bg-grey-lighten-4">
              <tr>
                <th class="text-caption font-weight-bold">Rute Penerbangan</th>
                <th class="text-caption font-weight-bold">Total Misi</th>
                <th class="text-caption font-weight-bold">Avg Planned Burn</th>
                <th class="text-caption font-weight-bold">Avg Actual Burn</th>
                <th class="text-caption font-weight-bold">Avg Variance</th>
                <th class="text-caption font-weight-bold">Status Indikator</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in varianceData" :key="item.route">
                <td class="font-weight-medium text-body-2">{{ item.route }}</td>
                <td class="text-body-2">{{ item.flights }}</td>
                <td class="text-body-2">{{ item.avgPlanned }}</td>
                <td class="text-body-2">{{ item.avgActual }}</td>
                <td class="text-body-2">
                  <span :class="`text-${item.color} font-weight-bold`">{{ item.variance }}</span>
                </td>
                <td>
                  <v-chip size="x-small" :color="item.color" variant="tonal" class="font-weight-bold">
                    {{ item.status }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 3: Discrepancy Alerts -->
      <v-window-item :value="3">
        <v-card variant="flat" class="border rounded-lg bg-white pa-5">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Discrepancy Alerts (Butuh Review)</div>
            <v-chip color="error" variant="flat" size="small">{{ discrepancyAlerts.filter((a : any) => a.status !== 'Resolved').length }} Kasus Aktif</v-chip>
          </div>
          
          <v-list lines="two" class="bg-transparent pa-0">
            <v-list-item v-for="alert in discrepancyAlerts" :key="alert.id" class="border rounded-lg mb-3 pa-3">
              <template #prepend>
                <v-avatar :color="alert.severity === 'High' ? 'error' : 'warning'" variant="tonal" class="mr-3">
                  <v-icon :icon="alert.severity === 'High' ? 'mdi-alert' : 'mdi-alert-circle-outline'"></v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-body-2">{{ alert.issue }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption mt-1">
                {{ alert.date }} • Mission: <strong>{{ alert.missionId }}</strong> • Tail No: {{ alert.tailNo }}
              </v-list-item-subtitle>
              <template #append>
                <div class="d-flex align-center ga-3">
                  <v-chip size="x-small" :color="alert.status === 'Resolved' ? 'success' : (alert.status === 'Open' ? 'error' : 'warning')" variant="outlined">{{ alert.status }}</v-chip>
                  <v-btn size="small" color="primary" variant="outlined" class="text-none" :disabled="alert.status === 'Resolved'" @click="openAlertModal(alert)">
                    {{ alert.status === 'Resolved' ? 'Selesai' : 'Tindak Lanjut' }}
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-window-item>

      <!-- TAB 4: Rekap Rute & Armada -->
      <v-window-item :value="4">
        <v-row>
          <v-col cols="12" md="4" v-for="fleet in fleetRecap" :key="fleet.tailNo">
            <v-card variant="flat" class="border rounded-lg bg-white pa-4">
              <div class="d-flex justify-space-between align-center mb-3">
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-primary">{{ fleet.tailNo }}</div>
                  <div class="text-caption text-medium-emphasis">{{ fleet.type }}</div>
                </div>
                <v-chip size="x-small" :color="fleet.efficiency >= '90%' ? 'success' : 'warning'" variant="tonal" class="font-weight-bold">
                  {{ fleet.status }}
                </v-chip>
              </div>
              <v-divider class="mb-3"></v-divider>
              <div class="d-flex justify-space-between text-body-2 mb-2">
                <span class="text-medium-emphasis">Total Flights MTD</span>
                <strong class="text-grey-darken-3">{{ fleet.flights }}</strong>
              </div>
              <div class="d-flex justify-space-between text-body-2 mb-2">
                <span class="text-medium-emphasis">Total Fuel Burn</span>
                <strong class="text-grey-darken-3">{{ fleet.totalBurn }}</strong>
              </div>
              <div class="d-flex justify-space-between text-body-2">
                <span class="text-medium-emphasis">Fuel Efficiency Rate</span>
                <strong :class="fleet.efficiency >= '90%' ? 'text-success' : 'text-warning'">
                  {{ fleet.efficiency }}
                </strong>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Validation Rule Alert -->
    <v-alert type="info" variant="tonal" density="comfortable" icon="mdi-sync-circle" class="rounded-lg border">
      <template #title>
        <span class="text-subtitle-2 font-weight-bold">Aturan Validasi Lintas Modul</span>
      </template>
      <span class="text-caption">
        Data Flight Operations dicocokkan dengan Aircraft Tail Number,
        Mission ID, lokasi refueling, dan volume pengisian Avtur.
        Variance Actual Fuel Burn di atas 5% akan ditandai sebagai
        discrepancy untuk dilakukan review lebih lanjut.
      </span>
    </v-alert>

    <!-- MODAL 1: Export Dialog -->
    <v-dialog v-model="dialogExport" max-width="420">
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">Export Analysis Data</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-select v-model="exportFormat" :items="exportOptions" label="Pilih Format File" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dialogExport = false">Batal</v-btn>
          <v-btn color="primary" class="text-none" @click="handleExport">Download</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL 2: Add / Edit Flight Dialog -->
    <v-dialog v-model="dialogFlightForm" max-width="550" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
          {{ isEditMode ? 'Edit Data Misi Penerbangan' : 'Tambah Misi Baru' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-row density="compact">
            <v-col cols="6">
              <v-text-field v-model="flightForm.missionId" label="Mission ID" variant="outlined" density="compact" :disabled="isEditMode" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="flightForm.tailNo" label="Tail Number" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="flightForm.route" label="Rute (e.g. WMX → DJJ)" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="flightForm.pilot" label="Nama Pilot" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="flightForm.refuelLoc" label="Lokasi Refuel" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="flightForm.refuelVol" label="Refuel (L)" type="number" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="flightForm.plannedBurn" label="Planned Burn (L)" type="number" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model="flightForm.actualBurn" label="Actual Burn (L)" type="number" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dialogFlightForm = false">Batal</v-btn>
          <v-btn color="primary" class="text-none" @click="saveFlightData">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL 3: Delete Confirmation Dialog -->
    <v-dialog v-model="dialogDelete" max-width="400">
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">Konfirmasi Hapus</v-card-title>
        <v-card-text class="pa-4 pt-0 text-body-2">
          Apakah kamu yakin ingin menghapus data misi <strong>{{ targetMissionId }}</strong>? Tindakan ini tidak bisa dibatalkan secara statis.
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dialogDelete = false">Batal</v-btn>
          <v-btn color="error" class="text-none" @click="deleteFlight">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL 4: Flight Report Dialog -->
    <v-dialog v-model="dialogReport" max-width="600">
      <v-card class="rounded-lg pa-2" v-if="selectedFlight">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-subtitle-1 font-weight-bold">Laporan Misi {{ selectedFlight.missionId }}</span>
          <v-chip color="primary" size="small">{{ selectedFlight.flightNo }}</v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div class="mb-3"><strong>Armada:</strong> {{ selectedFlight.tailDisplay }}</div>
          <div class="mb-3"><strong>Rute Flight:</strong> {{ selectedFlight.routeDisplay }}</div>
          <div class="mb-3"><strong>Pilot / Crew:</strong> {{ selectedFlight.pilotDisplay }}</div>
          <div class="mb-3"><strong>Konsumsi Avtur:</strong> Planned {{ selectedFlight.plannedBurn }} vs Actual {{ selectedFlight.actualBurn }}</div>
          <div class="mb-3"><strong>Status Match:</strong> {{ selectedFlight.syncStatus }} (Variance {{ selectedFlight.varianceVal }})</div>
          <div class="note-box mt-3">{{ selectedFlight.notes }}</div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn color="primary" class="text-none" @click="dialogReport = false">Tutup Laporan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL 5: Alert Resolution Dialog -->
    <v-dialog v-model="dialogAlert" max-width="480">
      <v-card class="rounded-lg" v-if="selectedAlert">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">Tindak Lanjut Alert {{ selectedAlert.id }}</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div class="text-body-2 mb-2"><strong>Isu:</strong> {{ selectedAlert.issue }}</div>
          <div class="text-caption text-medium-emphasis mb-4">
            Misi: {{ selectedAlert.missionId }} | Tail No: {{ selectedAlert.tailNo }} | Tanggal: {{ selectedAlert.date }}
          </div>
          <v-textarea label="Catatan Penanganan / Investigasi" rows="3" variant="outlined" density="compact" placeholder="Tuliskan tindakan koreksi yang telah dilakukan..." />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dialogAlert = false">Batal</v-btn>
          <v-btn color="success" class="text-none" @click="resolveAlert">Tandai Selesai</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Universal Toast Snackbar Feedback -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="2500" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" size="small" icon="mdi-close" @click="snackbar = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.min-vh-100 { min-height: 100vh; }
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}
.metric-card { min-height: 150px; }
.flow-grid {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) auto minmax(140px, 1fr) auto minmax(140px, 1fr) auto minmax(140px, 1fr) auto minmax(140px, 1fr);
  align-items: center;
  gap: 10px;
}
.flow-item {
  position: relative;
  min-width: 0;
  text-align: center;
  padding: 14px 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}
.flow-number {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  font-size: 10px;
  font-weight: 700;
}
.flow-desc { line-height: 1.35; }
.flow-arrow { flex-shrink: 0; }
.table-wrapper { overflow-x: auto; }
.analysis-table { min-width: 1000px; }
.flight-row {
  cursor: pointer;
  transition: background 0.15s ease;
}
.flight-row:hover { background: rgba(var(--v-theme-primary), 0.035); }
.selected-row { background: rgba(var(--v-theme-primary), 0.075); }
.detail-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.82);
  margin-bottom: 10px;
}
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}
.detail-list > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
}
.detail-list span, .burn-comparison span { color: rgba(var(--v-theme-on-surface), 0.58); }
.detail-list strong {
  max-width: 65%;
  text-align: right;
  color: rgba(var(--v-theme-on-surface), 0.82);
}
.burn-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.burn-comparison > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgb(var(--v-theme-surface));
}
.burn-comparison strong {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.82);
}
.variance-result { background: rgba(var(--v-theme-primary), 0.035) !important; }
.note-box {
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 11px;
  line-height: 1.45;
}

@media (max-width: 1400px) { .metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1100px) {
  .flow-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .flow-arrow { display: none; }
}
@media (max-width: 700px) {
  .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .flow-grid { grid-template-columns: 1fr; }
  .flow-item {
    text-align: left;
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 12px;
    align-items: center;
  }
  .flow-item > .flow-desc { grid-column: 2; margin-top: 0; }
  .flow-number { top: 8px; left: 34px; right: auto; }
  .burn-comparison { grid-template-columns: 1fr; }
}
@media (max-width: 500px) { .metrics-grid { grid-template-columns: 1fr; } }
</style>