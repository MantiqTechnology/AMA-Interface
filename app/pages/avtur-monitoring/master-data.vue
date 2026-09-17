<script setup lang="ts">
//import { computed, ref, watch } from 'vue'

const breadcrumbs = [
  {
    title: 'Avtur Fuel Management',
    disabled: false,
    href: '/avtur-monitoring/dashboard'
  },
  {
    title: 'Master Data',
    disabled: true,
    href: '#'
  }
]

// ============================================================
// MASTER DATA SUB-TABS
// ============================================================

const activeTab = ref(0)

const tabs = [
  {
    title: 'Ringkasan',
    icon: 'mdi-view-dashboard-outline'
  },
  {
    title: 'Storage / Drum',
    icon: 'mdi-barrel'
  },
  {
    title: 'Portable Refueling Skid',
    icon: 'mdi-gas-station-outline'
  },
  {
    title: 'Transfer Pump',
    icon: 'mdi-pump'
  },
  {
    title: 'Flowmeter',
    icon: 'mdi-gauge'
  },
  {
    title: 'Solenoid Valve / Interlock',
    icon: 'mdi-pipe-valve'
  },
  {
    title: 'Nozzle',
    icon: 'mdi-gas-cylinder'
  },
  {
    title: 'RFID / NFC Tag',
    icon: 'mdi-nfc-variant'
  }
]

// ============================================================
// MASTER DATA METRICS
// ============================================================

const metrics = [
  {
    title: 'Storage / Drum 200L',
    count: '236',
    sub: 'Aktif: 218 • Tidak Aktif: 18',
    icon: 'mdi-barrel',
    color: 'primary'
  },
  {
    title: 'Portable Refueling Skid',
    count: '5',
    sub: 'Aktif: 5 • Tidak Aktif: 0',
    icon: 'mdi-gas-station-outline',
    color: 'success'
  },
  {
    title: 'Transfer Pump',
    count: '12',
    sub: 'Aktif: 11 • Tidak Aktif: 1',
    icon: 'mdi-pump',
    color: 'warning'
  },
  {
    title: 'Digital Flowmeter',
    count: '8',
    sub: 'Aktif: 8 • Tidak Aktif: 0',
    icon: 'mdi-gauge',
    color: 'info'
  },
  {
    title: 'Solenoid Valve / Interlock',
    count: '10',
    sub: 'Aktif: 10 • Tidak Aktif: 0',
    icon: 'mdi-pipe-valve',
    color: 'error'
  },
  {
    title: 'Nozzle',
    count: '14',
    sub: 'Aktif: 14 • Tidak Aktif: 0',
    icon: 'mdi-gas-cylinder',
    color: 'purple'
  },
  {
    title: 'RFID / NFC Tag',
    count: '300',
    sub: 'Terpasang: 236 • Stok: 64',
    icon: 'mdi-nfc-variant',
    color: 'teal'
  }
]

// ============================================================
// FILTER STATE
// ============================================================

const searchQuery = ref('')
const selectedLocation = ref('Semua Lokasi')
const selectedStatus = ref('Semua Status')
const selectedCondition = ref('Semua Kondisi')

const locationOptions = [
  'Semua Lokasi',
  'Wamena (WMX)',
  'Sentani (DJJ)',
  'Timika (TIM)',
  'Dekai (DKI)',
  'Mulia (MII)',
  'Gudang Hub Jayapura'
]

const availableLocations = computed(() =>
  locationOptions.filter((l: string) => l !== 'Semua Lokasi')
)

const statusOptions = [
  'Semua Status',
  'Terpakai',
  'Tersedia',
  'Stok',
  'Aktif',
  'Maintenance',
  'Terpasang',
  'Stok Gudang',
  'Locked (Safe)',
  'Open (Ready)'
]

const conditionOptions = [
  'Semua Kondisi',
  'Baik',
  'Perlu Audit'
]

// ============================================================
// PAGINATION
// ============================================================

const page = ref(1)
const itemsPerPage = ref(10)

watch(
  [
    searchQuery,
    selectedLocation,
    selectedStatus,
    selectedCondition,
    activeTab,
    itemsPerPage
  ],
  () => {
    page.value = 1
  }
)

// ============================================================
// DATA MASTER
// ============================================================

const drumList = ref([
  {
    id: 'DRUM-0001',
    rfid: 'E200 3412 7B19 00A1',
    location: 'Wamena (WMX)',
    status: 'Terpakai',
    condition: 'Baik',
    capacity: '200 L',
    lastUpdate: '21 Aug 2026 09:15'
  },
  {
    id: 'DRUM-0002',
    rfid: 'E200 3412 7B19 00A2',
    location: 'Sentani (DJJ)',
    status: 'Terpakai',
    condition: 'Baik',
    capacity: '200 L',
    lastUpdate: '21 Aug 2026 08:52'
  },
  {
    id: 'DRUM-0003',
    rfid: 'E200 3412 7B19 00A3',
    location: 'Timika (TIM)',
    status: 'Terpakai',
    condition: 'Baik',
    capacity: '200 L',
    lastUpdate: '20 Aug 2026 16:33'
  },
  {
    id: 'DRUM-0004',
    rfid: 'E200 3412 7B19 00A4',
    location: 'Dekai (DKI)',
    status: 'Stok',
    condition: 'Baik',
    capacity: '200 L',
    lastUpdate: '20 Aug 2026 15:11'
  }
])

const skidList = ref([
  {
    id: 'SKID-01',
    name: 'Portable Skid Pioneer WMX-01',
    location: 'Wamena (WMX)',
    flowrate: '120 LPM',
    status: 'Aktif',
    condition: 'Baik',
    lastCal: '10 Jun 2026'
  },
  {
    id: 'SKID-02',
    name: 'Portable Skid Mobile DJJ-02',
    location: 'Sentani (DJJ)',
    flowrate: '150 LPM',
    status: 'Aktif',
    condition: 'Baik',
    lastCal: '15 Jul 2026'
  },
  {
    id: 'SKID-03',
    name: 'Portable Skid Timika-01',
    location: 'Timika (TIM)',
    flowrate: '120 LPM',
    status: 'Maintenance',
    condition: 'Perlu Audit',
    lastCal: '01 May 2026'
  }
])

const pumpList = ref([
  {
    id: 'PUMP-WMX-01',
    type: 'Centrifugal Explosion Proof',
    power: '5.5 HP',
    location: 'Wamena (WMX)',
    status: 'Aktif',
    condition: 'Baik'
  },
  {
    id: 'PUMP-DJJ-01',
    type: 'Positive Displacement',
    power: '7.5 HP',
    location: 'Sentani (DJJ)',
    status: 'Aktif',
    condition: 'Baik'
  },
  {
    id: 'PUMP-TIM-01',
    type: 'Centrifugal Explosion Proof',
    power: '5.5 HP',
    location: 'Timika (TIM)',
    status: 'Maintenance',
    condition: 'Perlu Audit'
  }
])

const flowmeterList = ref([
  {
    id: 'FM-DIGI-01',
    model: 'TCS Rotary Disc Digital',
    serial: 'TCS-99281',
    location: 'Wamena (WMX)',
    comm: 'RS-485 / BLE 5.0',
    status: 'Aktif'
  },
  {
    id: 'FM-DIGI-02',
    model: 'TCS Rotary Disc Digital',
    serial: 'TCS-99282',
    location: 'Sentani (DJJ)',
    comm: 'RS-485 / BLE 5.0',
    status: 'Aktif'
  },
  {
    id: 'FM-DIGI-03',
    model: 'Turbine Flowmeter Flowatch',
    serial: 'FLW-11024',
    location: 'Timika (TIM)',
    comm: 'RS-485',
    status: 'Aktif'
  }
])

const valveList = ref([
  {
    id: 'VALVE-INT-01',
    type: 'Solenoid Interlock Grounding',
    location: 'Wamena (WMX)',
    safetyStatus: 'Locked (Safe)',
    control: 'Auto PLC'
  },
  {
    id: 'VALVE-INT-02',
    type: 'Emergency Shut-Off Valve (ESDV)',
    location: 'Sentani (DJJ)',
    safetyStatus: 'Open (Ready)',
    control: 'Manual / Auto'
  },
  {
    id: 'VALVE-INT-03',
    type: 'Solenoid Interlock Grounding',
    location: 'Timika (TIM)',
    safetyStatus: 'Locked (Safe)',
    control: 'Auto PLC'
  }
])

const nozzleList = ref([
  {
    id: 'NOZ-AV-01',
    type: 'Overwing Aviation Nozzle 1.5"',
    brand: 'ELAFLEX ZV 40',
    location: 'Wamena (WMX)',
    status: 'Terpakai'
  },
  {
    id: 'NOZ-AV-02',
    type: 'Overwing Aviation Nozzle 1.5"',
    brand: 'ELAFLEX ZV 40',
    location: 'Sentani (DJJ)',
    status: 'Terpakai'
  },
  {
    id: 'NOZ-AV-03',
    type: 'Bottom Loading Aviation Nozzle',
    brand: 'OPW 295UI',
    location: 'Timika (TIM)',
    status: 'Tersedia'
  }
])

const rfidList = ref([
  {
    tagId: 'EPC-9821-AAAA',
    type: 'NFC Heavy Duty Sticker',
    boundTo: 'DRUM-0001',
    location: 'Wamena (WMX)',
    status: 'Terpasang'
  },
  {
    tagId: 'EPC-9821-AAAB',
    type: 'NFC Heavy Duty Sticker',
    boundTo: 'DRUM-0002',
    location: 'Sentani (DJJ)',
    status: 'Terpasang'
  },
  {
    tagId: 'EPC-9821-AAAC',
    type: 'RFID Hard Tag Metal Mount',
    boundTo: 'Belum Ditautkan',
    location: 'Gudang Hub Jayapura',
    status: 'Stok Gudang'
  }
])

// ============================================================
// FORM DIALOG STATES & MODAL HANDLERS
// ============================================================

const isDialogOpen = ref(false)

const drumForm = ref({
  id: '',
  rfid: '',
  location: 'Wamena (WMX)',
  capacity: '200 L',
  status: 'Tersedia',
  condition: 'Baik'
})

const skidForm = ref({
  id: '',
  name: '',
  location: 'Wamena (WMX)',
  flowrate: '120 LPM',
  status: 'Aktif',
  condition: 'Baik',
  lastCal: ''
})

const pumpForm = ref({
  id: '',
  type: 'Centrifugal Explosion Proof',
  power: '5.5 HP',
  location: 'Wamena (WMX)',
  status: 'Aktif',
  condition: 'Baik'
})

const flowmeterForm = ref({
  id: '',
  model: 'TCS Rotary Disc Digital',
  serial: '',
  location: 'Wamena (WMX)',
  comm: 'RS-485 / BLE 5.0',
  status: 'Aktif'
})

const valveForm = ref({
  id: '',
  type: 'Solenoid Interlock Grounding',
  location: 'Wamena (WMX)',
  safetyStatus: 'Locked (Safe)',
  control: 'Auto PLC'
})

const nozzleForm = ref({
  id: '',
  type: 'Overwing Aviation Nozzle 1.5"',
  brand: 'ELAFLEX ZV 40',
  location: 'Wamena (WMX)',
  status: 'Tersedia'
})

const rfidForm = ref({
  tagId: '',
  type: 'NFC Heavy Duty Sticker',
  boundTo: 'Belum Ditautkan',
  location: 'Gudang Hub Jayapura',
  status: 'Stok Gudang'
})

function openAddModal() {
  if (activeTab.value === 0) {
    activeTab.value = 1
  }

  const nextNum = (len: number) => String(len + 1).padStart(2, '0')
  const nextNumLong = (len: number) => String(len + 1).padStart(4, '0')

  switch (activeTab.value) {
    case 1:
      drumForm.value = {
        id: `DRUM-${nextNumLong(drumList.value.length)}`,
        rfid: `E200 3412 7B19 00A${drumList.value.length + 1}`,
        location: 'Wamena (WMX)',
        capacity: '200 L',
        status: 'Tersedia',
        condition: 'Baik'
      }
      break
    case 2:
      skidForm.value = {
        id: `SKID-${nextNum(skidList.value.length)}`,
        name: '',
        location: 'Wamena (WMX)',
        flowrate: '120 LPM',
        status: 'Aktif',
        condition: 'Baik',
        lastCal: 'Baru saja'
      }
      break
    case 3:
      pumpForm.value = {
        id: `PUMP-WMX-${nextNum(pumpList.value.length)}`,
        type: 'Centrifugal Explosion Proof',
        power: '5.5 HP',
        location: 'Wamena (WMX)',
        status: 'Aktif',
        condition: 'Baik'
      }
      break
    case 4:
      flowmeterForm.value = {
        id: `FM-DIGI-${nextNum(flowmeterList.value.length)}`,
        model: 'TCS Rotary Disc Digital',
        serial: `TCS-${Math.floor(10000 + Math.random() * 90000)}`,
        location: 'Wamena (WMX)',
        comm: 'RS-485 / BLE 5.0',
        status: 'Aktif'
      }
      break
    case 5:
      valveForm.value = {
        id: `VALVE-INT-${nextNum(valveList.value.length)}`,
        type: 'Solenoid Interlock Grounding',
        location: 'Wamena (WMX)',
        safetyStatus: 'Locked (Safe)',
        control: 'Auto PLC'
      }
      break
    case 6:
      nozzleForm.value = {
        id: `NOZ-AV-${nextNum(nozzleList.value.length)}`,
        type: 'Overwing Aviation Nozzle 1.5"',
        brand: 'ELAFLEX ZV 40',
        location: 'Wamena (WMX)',
        status: 'Tersedia'
      }
      break
    case 7:
      rfidForm.value = {
        tagId: `EPC-9821-AA0${rfidList.value.length + 1}`,
        type: 'NFC Heavy Duty Sticker',
        boundTo: 'Belum Ditautkan',
        location: 'Gudang Hub Jayapura',
        status: 'Stok Gudang'
      }
      break
  }

  isDialogOpen.value = true
}

function handleSaveData() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const fullDateStr = `${dateStr} ${timeStr}`

  switch (activeTab.value) {
    case 1:
      drumList.value.unshift({
        ...drumForm.value,
        lastUpdate: fullDateStr
      })
      break
    case 2:
      skidList.value.unshift({
        ...skidForm.value,
        lastCal: dateStr
      })
      break
    case 3:
      pumpList.value.unshift({ ...pumpForm.value })
      break
    case 4:
      flowmeterList.value.unshift({ ...flowmeterForm.value })
      break
    case 5:
      valveList.value.unshift({ ...valveForm.value })
      break
    case 6:
      nozzleList.value.unshift({ ...nozzleForm.value })
      break
    case 7:
      rfidList.value.unshift({ ...rfidForm.value })
      break
  }

  isDialogOpen.value = false
}

// ============================================================
// SECTION META
// ============================================================

const currentSectionMeta = computed(() => {
  switch (activeTab.value) {
    case 0:
      return {
        title: 'Ringkasan Master Data Fasilitas',
        desc: 'Overview keseluruhan aset dan perangkat keras penunjang distribusi Avtur.'
      }

    case 1:
      return {
        title: 'Daftar Storage / Drum 200L',
        desc: 'Kelola data drum Avtur 200L beserta identitas RFID/NFC Tag dan status penggunaannya.'
      }

    case 2:
      return {
        title: 'Portable Refueling Skid',
        desc: 'Daftar unit skid pengisian bahan bakar portabel di wilayah operasional.'
      }

    case 3:
      return {
        title: 'Transfer Pump (Pompa Transfer)',
        desc: 'Monitoring spesifikasi teknis dan status kelayakan pompa transfer Avtur.'
      }

    case 4:
      return {
        title: 'Digital Flowmeter & Telemetri',
        desc: 'Pengelolaan sensor flowmeter digital dan modul komunikasi telemetri.'
      }

    case 5:
      return {
        title: 'Solenoid Valve / Interlock System',
        desc: 'Pengendalian perangkat katup pengaman dan sistem interlock operasional.'
      }

    case 6:
      return {
        title: 'Nozzle Avtur',
        desc: 'Inventarisasi nozzle overwing dan bottom loading.'
      }

    case 7:
      return {
        title: 'RFID / NFC Tag Registry',
        desc: 'Database penautan tag identifikasi digital pada aset drum dan fasilitas.'
      }

    default:
      return {
        title: 'Manajemen Aset',
        desc: 'Kelola fasilitas dan perangkat pendukung operasional Avtur.'
      }
  }
})

// ============================================================
// STATUS HELPERS
// ============================================================

function getStatusColor(status: string) {
  switch (status) {
    case 'Terpakai':
    case 'Aktif':
    case 'Terpasang':
    case 'Locked (Safe)':
      return {
        color: 'success',
        variant: 'tonal' as const
      }

    case 'Tersedia':
    case 'Open (Ready)':
      return {
        color: 'info',
        variant: 'tonal' as const
      }

    case 'Stok':
    case 'Stok Gudang':
      return {
        color: 'grey',
        variant: 'tonal' as const
      }

    case 'Maintenance':
    case 'Perlu Audit':
      return {
        color: 'warning',
        variant: 'tonal' as const
      }

    default:
      return {
        color: 'grey',
        variant: 'tonal' as const
      }
  }
}

// ============================================================
// FILTER
// ============================================================

function matchesFilter(item: Record<string, unknown>) {
  const keyword = searchQuery.value.trim().toLowerCase()

  const searchableText = Object.values(item)
    .join(' ')
    .toLowerCase()

  const matchesSearch =
    !keyword || searchableText.includes(keyword)

  const matchesLocation =
    selectedLocation.value === 'Semua Lokasi' ||
    item.location === selectedLocation.value

  const statusFields = [
    item.status,
    item.safetyStatus
  ]

  const matchesStatus =
    selectedStatus.value === 'Semua Status' ||
    statusFields.includes(selectedStatus.value)

  const matchesCondition =
    selectedCondition.value === 'Semua Kondisi' ||
    item.condition === selectedCondition.value

  return (
    matchesSearch &&
    matchesLocation &&
    matchesStatus &&
    matchesCondition
  )
}

// ============================================================
// CURRENT DATASET
// ============================================================

const currentData = computed(() => {
  switch (activeTab.value) {
    case 1:
      return drumList.value

    case 2:
      return skidList.value

    case 3:
      return pumpList.value

    case 4:
      return flowmeterList.value

    case 5:
      return valveList.value

    case 6:
      return nozzleList.value

    case 7:
      return rfidList.value

    default:
      return []
  }
})

const filteredData = computed(() => {
  return currentData.value.filter(matchesFilter)
})

const paginatedData = computed(() => {
  const start =
    (page.value - 1) * itemsPerPage.value

  const end =
    start + itemsPerPage.value

  return filteredData.value.slice(start, end)
})

const pageCount = computed(() => {
  return Math.max(
    1,
    Math.ceil(
      filteredData.value.length /
        itemsPerPage.value
    )
  )
})

// ============================================================
// RESET FILTER
// ============================================================

function resetFilters() {
  searchQuery.value = ''
  selectedLocation.value = 'Semua Lokasi'
  selectedStatus.value = 'Semua Status'
  selectedCondition.value = 'Semua Kondisi'
  page.value = 1
}
</script>

<template>
  <div class="master-data-page">

    <!-- ======================================================
         BREADCRUMB
    ======================================================= -->
    <v-breadcrumbs
      :items="breadcrumbs"
      class="px-0 pt-0 pb-3"
    >
      <template #divider>
        <v-icon
          icon="mdi-chevron-right"
          size="16"
        />
      </template>
    </v-breadcrumbs>

    <!-- ======================================================
         PAGE HEADER
    ======================================================= -->
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
      <div>
        <div class="d-flex align-center ga-3 mb-2">
          <v-avatar
            color="primary"
            variant="tonal"
            size="42"
          >
            <v-icon
              icon="mdi-database-cog-outline"
              size="22"
            />
          </v-avatar>

          <div>
            <h1 class="text-h5 font-weight-bold">
              Master Data
            </h1>

            <div class="text-body-2 text-medium-emphasis">
              Manajemen fasilitas, perangkat, dan identitas aset Avtur.
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-download-outline"
          class="text-none"
        >
          Export
        </v-btn>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="openAddModal"
        >
          Tambah Data
        </v-btn>
      </div>
    </div>

    <!-- ======================================================
         AVTUR MAIN NAVIGATION
    ======================================================= -->
    <AvturTopNav />

    <!-- ======================================================
         MASTER DATA SUB NAVIGATION
    ======================================================= -->
    <v-card
      variant="flat"
      class="border rounded-lg mb-6 bg-white overflow-hidden"
    >
      <v-tabs
        v-model="activeTab"
        color="primary"
        show-arrows
        class="master-tabs"
      >
        <v-tab
          v-for="(tab, index) in tabs"
          :key="tab.title"
          :value="index"
          class="text-none"
        >
          <v-icon
            :icon="tab.icon"
            size="18"
            class="mr-2"
          />

          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- ======================================================
         RINGKASAN
    ======================================================= -->
    <template v-if="activeTab === 0">

      <div class="section-heading mb-4">
        <h2 class="text-h6 font-weight-bold mb-1">
          {{ currentSectionMeta.title }}
        </h2>

        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ currentSectionMeta.desc }}
        </p>
      </div>

      <!-- METRICS -->
      <v-row class="mb-2">
        <v-col
          v-for="metric in metrics"
          :key="metric.title"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            variant="flat"
            class="border rounded-lg h-100"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-start justify-space-between">
                <div>
                  <div class="text-caption text-medium-emphasis mb-1">
                    {{ metric.title }}
                  </div>

                  <div class="text-h5 font-weight-bold">
                    {{ metric.count }}
                  </div>

                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ metric.sub }}
                  </div>
                </div>

                <v-avatar
                  :color="metric.color"
                  variant="tonal"
                  size="42"
                >
                  <v-icon
                    :icon="metric.icon"
                    size="21"
                  />
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- MASTER DATA OVERVIEW -->
      <v-row class="mt-2">
        <v-col
          cols="12"
          lg="8"
        >
          <v-card
            variant="flat"
            class="border rounded-lg h-100"
          >
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Distribusi Master Data
              </v-card-title>

              <v-card-subtitle>
                Komposisi aset dan perangkat yang terdaftar dalam sistem.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div
                v-for="(metric, index) in metrics"
                :key="metric.title"
                class="overview-row"
                :class="{ 'overview-row-last': index === metrics.length - 1 }"
              >
                <div class="d-flex align-center ga-3">
                  <v-avatar
                    :color="metric.color"
                    variant="tonal"
                    size="34"
                  >
                    <v-icon
                      :icon="metric.icon"
                      size="18"
                    />
                  </v-avatar>

                  <div>
                    <div class="text-body-2 font-weight-medium">
                      {{ metric.title }}
                    </div>

                    <div class="text-caption text-medium-emphasis">
                      {{ metric.sub }}
                    </div>
                  </div>
                </div>

                <div class="text-body-1 font-weight-bold">
                  {{ metric.count }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          lg="4"
        >
          <v-card
            variant="flat"
            class="border rounded-lg h-100"
          >
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Kondisi Data
              </v-card-title>

              <v-card-subtitle>
                Indikator administrasi aset.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="status-summary success-summary mb-3">
                <div>
                  <div class="text-body-2 font-weight-medium">
                    Data Terdaftar
                  </div>

                  <div class="text-caption text-medium-emphasis">
                    Aset telah memiliki identitas master data.
                  </div>
                </div>

                <v-icon
                  icon="mdi-check-circle-outline"
                  color="success"
                />
              </div>

              <div class="status-summary warning-summary mb-3">
                <div>
                  <div class="text-body-2 font-weight-medium">
                    Perlu Audit
                  </div>

                  <div class="text-caption text-medium-emphasis">
                    Beberapa perangkat membutuhkan pemeriksaan.
                  </div>
                </div>

                <v-icon
                  icon="mdi-alert-circle-outline"
                  color="warning"
                />
              </div>

              <div class="status-summary info-summary">
                <div>
                  <div class="text-body-2 font-weight-medium">
                    Identitas Digital
                  </div>

                  <div class="text-caption text-medium-emphasis">
                    RFID/NFC digunakan untuk identifikasi aset.
                  </div>
                </div>

                <v-icon
                  icon="mdi-nfc-variant"
                  color="info"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

    </template>

    <!-- ======================================================
         DETAIL DATASET
    ======================================================= -->
    <template v-else>

      <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
        <div>
          <h2 class="text-h6 font-weight-bold mb-1">
            {{ currentSectionMeta.title }}
          </h2>

          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ currentSectionMeta.desc }}
          </p>
        </div>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="openAddModal"
        >
          Tambah Data
        </v-btn>
      </div>

      <!-- FILTER -->
      <v-card
        variant="flat"
        class="border rounded-lg mb-5"
      >
        <v-card-text class="pa-4">
          <v-row
            align="center"
            class="filter-row"
          >
            <v-col
              cols="12"
              md="4"
              lg="4"
            >
              <v-text-field
                v-model="searchQuery"
                label="Cari data"
                placeholder="ID, nama, serial, RFID..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
              />
            </v-col>

            <v-col
              cols="12"
              sm="6"
              md="2.5"
            >
              <v-select
                v-model="selectedLocation"
                :items="locationOptions"
                label="Lokasi"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>

            <v-col
              cols="12"
              sm="6"
              md="2.5"
            >
              <v-select
                v-model="selectedStatus"
                :items="statusOptions"
                label="Status"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>

            <v-col
              cols="12"
              sm="6"
              md="2"
            >
              <v-select
                v-model="selectedCondition"
                :items="conditionOptions"
                label="Kondisi"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>

            <v-col
              cols="12"
              sm="6"
              md="auto"
              class="d-flex align-center"
            >
              <v-btn
                variant="text"
                prepend-icon="mdi-filter-remove-outline"
                class="text-none"
                @click="resetFilters"
              >
                Reset
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- DATA TABLES -->
      <v-card
        variant="flat"
        class="border rounded-lg overflow-hidden"
      >

        <!-- DRUM -->
        <template v-if="activeTab === 1">
          <v-data-table
            :headers="[
              { title: 'ID Drum', key: 'id', sortable: true },
              { title: 'RFID / NFC', key: 'rfid' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Kapasitas', key: 'capacity' },
              { title: 'Status', key: 'status' },
              { title: 'Kondisi', key: 'condition' },
              { title: 'Update Terakhir', key: 'lastUpdate' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.rfid="{ item }">
              <span class="font-mono text-caption">
                {{ item.rfid }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.condition="{ item }">
              <v-chip
                :color="getStatusColor(item.condition).color"
                :variant="getStatusColor(item.condition).variant"
                size="small"
              >
                {{ item.condition }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- SKID -->
        <template v-else-if="activeTab === 2">
          <v-data-table
            :headers="[
              { title: 'ID', key: 'id' },
              { title: 'Nama Unit', key: 'name' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Flowrate', key: 'flowrate' },
              { title: 'Status', key: 'status' },
              { title: 'Kondisi', key: 'condition' },
              { title: 'Kalibrasi Terakhir', key: 'lastCal' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.condition="{ item }">
              <v-chip
                :color="getStatusColor(item.condition).color"
                :variant="getStatusColor(item.condition).variant"
                size="small"
              >
                {{ item.condition }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- PUMP -->
        <template v-else-if="activeTab === 3">
          <v-data-table
            :headers="[
              { title: 'ID Pump', key: 'id' },
              { title: 'Tipe', key: 'type' },
              { title: 'Power', key: 'power' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Status', key: 'status' },
              { title: 'Kondisi', key: 'condition' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.condition="{ item }">
              <v-chip
                :color="getStatusColor(item.condition).color"
                :variant="getStatusColor(item.condition).variant"
                size="small"
              >
                {{ item.condition }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- FLOWMETER -->
        <template v-else-if="activeTab === 4">
          <v-data-table
            :headers="[
              { title: 'ID Flowmeter', key: 'id' },
              { title: 'Model', key: 'model' },
              { title: 'Serial Number', key: 'serial' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Komunikasi', key: 'comm' },
              { title: 'Status', key: 'status' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.comm="{ item }">
              <v-chip
                color="info"
                variant="tonal"
                size="small"
                prepend-icon="mdi-connection"
              >
                {{ item.comm }}
              </v-chip>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- VALVE -->
        <template v-else-if="activeTab === 5">
          <v-data-table
            :headers="[
              { title: 'ID Valve', key: 'id' },
              { title: 'Tipe / Fungsi', key: 'type' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Safety Status', key: 'safetyStatus' },
              { title: 'Control Mode', key: 'control' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.safetyStatus="{ item }">
              <v-chip
                :color="getStatusColor(item.safetyStatus).color"
                :variant="getStatusColor(item.safetyStatus).variant"
                size="small"
              >
                <v-icon
                  :icon="item.safetyStatus === 'Locked (Safe)'
                    ? 'mdi-lock-check-outline'
                    : 'mdi-lock-open-outline'"
                  size="15"
                  start
                />

                {{ item.safetyStatus }}
              </v-chip>
            </template>

            <template #item.control="{ item }">
              <span class="text-body-2">
                {{ item.control }}
              </span>
            </template>
          </v-data-table>
        </template>

        <!-- NOZZLE -->
        <template v-else-if="activeTab === 6">
          <v-data-table
            :headers="[
              { title: 'ID Nozzle', key: 'id' },
              { title: 'Tipe', key: 'type' },
              { title: 'Brand / Model', key: 'brand' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Status', key: 'status' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.id="{ item }">
              <span class="font-weight-bold text-primary">
                {{ item.id }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- RFID -->
        <template v-else-if="activeTab === 7">
          <v-data-table
            :headers="[
              { title: 'Tag ID', key: 'tagId' },
              { title: 'Jenis Tag', key: 'type' },
              { title: 'Terikat Ke', key: 'boundTo' },
              { title: 'Lokasi', key: 'location' },
              { title: 'Status', key: 'status' }
            ]"
            :items="paginatedData"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.tagId="{ item }">
              <div class="d-flex align-center ga-2">
                <v-icon
                  icon="mdi-nfc-variant"
                  size="18"
                  color="primary"
                />

                <span class="font-mono text-caption font-weight-medium">
                  {{ item.tagId }}
                </span>
              </div>
            </template>

            <template #item.boundTo="{ item }">
              <span
                :class="item.boundTo === 'Belum Ditautkan'
                  ? 'text-warning font-weight-medium'
                  : 'font-weight-medium'"
              >
                {{ item.boundTo }}
              </span>
            </template>

            <template #item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status).color"
                :variant="getStatusColor(item.status).variant"
                size="small"
              >
                {{ item.status }}
              </v-chip>
            </template>
          </v-data-table>
        </template>

        <!-- EMPTY STATE -->
        <template v-if="filteredData.length === 0">
          <div class="empty-state pa-10 text-center">
            <v-avatar
              color="grey"
              variant="tonal"
              size="56"
              class="mb-3"
            >
              <v-icon
                icon="mdi-database-search-outline"
                size="28"
              />
            </v-avatar>

            <div class="text-subtitle-1 font-weight-bold mb-1">
              Data tidak ditemukan
            </div>

            <div class="text-body-2 text-medium-emphasis mb-4">
              Tidak ada data yang sesuai dengan filter yang dipilih.
            </div>

            <v-btn
              variant="outlined"
              class="text-none"
              prepend-icon="mdi-filter-remove-outline"
              @click="resetFilters"
            >
              Reset Filter
            </v-btn>
          </div>
        </template>

        <!-- TABLE FOOTER -->
        <div
          v-if="filteredData.length > 0"
          class="table-footer px-4 py-3"
        >
          <div class="text-caption text-medium-emphasis">
            Menampilkan
            {{ (page - 1) * itemsPerPage + 1 }}
            –
            {{ Math.min(page * itemsPerPage, filteredData.length) }}
            dari {{ filteredData.length }} data contoh
          </div>

          <div class="d-flex align-center ga-3">
            <v-select
              v-model="itemsPerPage"
              :items="[5, 10, 25]"
              label="Per halaman"
              variant="outlined"
              density="compact"
              hide-details
              class="pagination-size"
            />

            <v-pagination
              v-model="page"
              :length="pageCount"
              total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </div>
      </v-card>

      <!-- INFORMATION -->
      <v-alert
        type="info"
        variant="tonal"
        class="mt-5"
        icon="mdi-information-outline"
      >
        <div class="font-weight-medium mb-1">
          Master Data sebagai referensi operasional
        </div>

        <div class="text-body-2">
          Data fasilitas dan perangkat pada halaman ini menjadi referensi
          identitas aset dalam proses monitoring, transaksi bahan bakar,
          integrasi perangkat, dan audit operasional.
        </div>
      </v-alert>

    </template>

    <!-- ======================================================
         MODAL FORM DIALOG (DINAMIS SAMA SUB-TAB)
    ======================================================= -->
    <v-dialog
      v-model="isDialogOpen"
      max-width="520px"
      persistent
    >
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 border-b">
          <span class="text-h6 font-weight-bold">
            Tambah {{ tabs[activeTab]?.title }}
          </span>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="isDialogOpen = false"
          />
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- FORM 1: DRUM -->
          <v-row v-if="activeTab === 1" density="comfortable">
            <v-col cols="12">
              <v-text-field
                v-model="drumForm.id"
                label="ID Drum"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="drumForm.rfid"
                label="RFID / NFC Tag ID"
                placeholder="E200 XXXX XXXX XXXX"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="drumForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="drumForm.capacity"
                label="Kapasitas"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="drumForm.status"
                :items="['Tersedia', 'Terpakai', 'Stok']"
                label="Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="drumForm.condition"
                :items="['Baik', 'Perlu Audit']"
                label="Kondisi"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 2: PORTABLE SKID -->
          <v-row v-else-if="activeTab === 2" density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="skidForm.id"
                label="ID Skid"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="skidForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="skidForm.name"
                label="Nama Unit Skid"
                placeholder="Contoh: Portable Skid Mobile DJJ-03"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="skidForm.flowrate"
                label="Flowrate (LPM)"
                placeholder="120 LPM"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="skidForm.status"
                :items="['Aktif', 'Maintenance']"
                label="Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="skidForm.condition"
                :items="['Baik', 'Perlu Audit']"
                label="Kondisi"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 3: TRANSFER PUMP -->
          <v-row v-else-if="activeTab === 3" density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="pumpForm.id"
                label="ID Pompa"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="pumpForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="pumpForm.type"
                label="Tipe Pompa"
                placeholder="Contoh: Centrifugal Explosion Proof"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="pumpForm.power"
                label="Daya (Power)"
                placeholder="5.5 HP"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="pumpForm.status"
                :items="['Aktif', 'Maintenance']"
                label="Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="pumpForm.condition"
                :items="['Baik', 'Perlu Audit']"
                label="Kondisi"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 4: FLOWMETER -->
          <v-row v-else-if="activeTab === 4" density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="flowmeterForm.id"
                label="ID Flowmeter"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="flowmeterForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="flowmeterForm.model"
                label="Model Perangkat"
                placeholder="TCS Rotary Disc Digital"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="flowmeterForm.serial"
                label="Serial Number"
                placeholder="TCS-XXXXX"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="flowmeterForm.comm"
                label="Jalur Komunikasi"
                placeholder="RS-485 / BLE 5.0"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 5: SOLENOID VALVE / INTERLOCK -->
          <v-row v-else-if="activeTab === 5" density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="valveForm.id"
                label="ID Valve"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="valveForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="valveForm.type"
                label="Tipe / Fungsi Katup"
                placeholder="Solenoid Interlock Grounding"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="valveForm.safetyStatus"
                :items="['Locked (Safe)', 'Open (Ready)']"
                label="Safety Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="valveForm.control"
                :items="['Auto PLC', 'Manual / Auto', 'Manual']"
                label="Mode Kontrol"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 6: NOZZLE -->
          <v-row v-else-if="activeTab === 6" density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="nozzleForm.id"
                label="ID Nozzle"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="nozzleForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="nozzleForm.type"
                label="Tipe Nozzle"
                placeholder="Overwing Aviation Nozzle 1.5&quot;"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="nozzleForm.brand"
                label="Brand / Model"
                placeholder="ELAFLEX ZV 40"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="nozzleForm.status"
                :items="['Tersedia', 'Terpakai']"
                label="Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- FORM 7: RFID / NFC TAG -->
          <v-row v-else-if="activeTab === 7" density="comfortable">
            <v-col cols="12">
              <v-text-field
                v-model="rfidForm.tagId"
                label="Tag ID Hex"
                placeholder="EPC-9821-XXXX"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="rfidForm.type"
                :items="['NFC Heavy Duty Sticker', 'RFID Hard Tag Metal Mount', 'NFC Card']"
                label="Jenis Tag"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="rfidForm.location"
                :items="availableLocations"
                label="Lokasi"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="rfidForm.boundTo"
                label="Terikat Ke (Aset ID)"
                placeholder="Belum Ditautkan / DRUM-0001"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="rfidForm.status"
                :items="['Terpasang', 'Stok Gudang']"
                label="Status Tag"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-4 border-t justify-end ga-2">
          <v-btn
            variant="outlined"
            class="text-none"
            @click="isDialogOpen = false"
          >
            Batal
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="text-none"
            @click="handleSaveData"
          >
            Simpan Data
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<style scoped>
.master-data-page {
  width: 100%;
}

.master-tabs :deep(.v-tab) {
  min-width: auto;
  padding-inline: 16px;
}

.section-heading {
  max-width: 900px;
}

.overview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.overview-row-last {
  border-bottom: 0;
}

.status-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 10px;
}

.success-summary {
  background: rgba(var(--v-theme-success), 0.06);
}

.warning-summary {
  background: rgba(var(--v-theme-warning), 0.08);
}

.info-summary {
  background: rgba(var(--v-theme-info), 0.06);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.pagination-size {
  width: 125px;
}

.font-mono {
  font-family:
    'Roboto Mono',
    'SFMono-Regular',
    Consolas,
    monospace;
}

.empty-state {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

@media (max-width: 960px) {
  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .table-footer > .d-flex {
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .master-tabs :deep(.v-tab) {
    padding-inline: 12px;
  }

  .overview-row {
    align-items: flex-start;
  }

  .table-footer > .d-flex {
    flex-wrap: wrap;
  }
}
</style>