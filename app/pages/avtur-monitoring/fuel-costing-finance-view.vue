<script setup lang="ts">
//import { computed, reactive, ref } from 'vue'

const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Fuel Costing & Finance Integration', disabled: true, href: '#' },
]

/* =========================================================
 * INTERNAL TAB NAVIGATION
 * ======================================================= */

const activeTab = ref(0)

const tabs = [
  {
    title: 'Ringkasan Biaya & Alokasi HPP',
    icon: 'mdi-calculator',
  },
  {
    title: 'Master Harga Avtur',
    icon: 'mdi-currency-idr',
  },
  {
    title: 'HPP per Block Hour',
    icon: 'mdi-airplane-clock',
  },
  {
    title: 'Jurnal Otomatis GL',
    icon: 'mdi-book-open-page-variant-outline',
  },
  {
    title: 'Cost Center ERP',
    icon: 'mdi-sitemap-outline',
  },
]

/* =========================================================
 * UI & NOTIFICATION STATE
 * ======================================================= */

const isRefreshing = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showNotify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

/* =========================================================
 * MOCK COSTING DATA (REACTIVE)
 * ======================================================= */

const fuelCostLogs = ref([
  {
    id: 'FC-202608-0121',
    flightNo: 'AMA-201',
    aircraftReg: 'PK-AMA (Twin Otter)',
    station: 'Sentani (DJJ)',
    volLiters: '650 L',
    unitCost: 'Rp 12.650',
    totalCost: 'Rp 8.222.500',
    costCenter: 'CC-OPS-PKAMA',
    glStatus: 'Posted GL',
    glStatusColor: 'success',
    journalRef: 'JRN-20260822-0041',
    blockHours: '2,4 Jam',
    method: 'Weighted Average',
  },
  {
    id: 'FC-202608-0122',
    flightNo: 'AMA-204',
    aircraftReg: 'PK-AMB (Caravan)',
    station: 'Wamena (WMX)',
    volLiters: '420 L',
    unitCost: 'Rp 12.800',
    totalCost: 'Rp 5.376.000',
    costCenter: 'CC-OPS-PKAMB',
    glStatus: 'Posted GL',
    glStatusColor: 'success',
    journalRef: 'JRN-20260822-0042',
    blockHours: '1,7 Jam',
    method: 'Weighted Average',
  },
  {
    id: 'FC-202608-0123',
    flightNo: 'AMA-308',
    aircraftReg: 'PK-AMC (Twin Otter)',
    station: 'Airstrip Okbibab',
    volLiters: '380 L',
    unitCost: 'Rp 24.500',
    totalCost: 'Rp 9.310.000',
    costCenter: 'CC-OPS-PKAMC',
    glStatus: 'Draft / Unposted',
    glStatusColor: 'warning',
    journalRef: 'JRN-PENDING-088',
    blockHours: '1,8 Jam',
    method: 'FIFO + Drum Freight',
  },
  {
    id: 'FC-202608-0124',
    flightNo: 'AMA-112',
    aircraftReg: 'PK-AMD (Porter)',
    station: 'Timika (TIM)',
    volLiters: '290 L',
    unitCost: 'Rp 14.200',
    totalCost: 'Rp 4.118.000',
    costCenter: 'CC-OPS-PKAMD',
    glStatus: 'Draft / Unposted',
    glStatusColor: 'warning',
    journalRef: 'JRN-PENDING-089',
    blockHours: '1,3 Jam',
    method: 'Weighted Average',
  },
  {
    id: 'FC-202608-0125',
    flightNo: 'AMA-501',
    aircraftReg: 'PK-AMA (Twin Otter)',
    station: 'Airstrip Boven Digoel',
    volLiters: '500 L',
    unitCost: 'Rp 22.100',
    totalCost: 'Rp 11.050.000',
    costCenter: 'CC-OPS-PKAMA',
    glStatus: 'Failed Sync',
    glStatusColor: 'error',
    journalRef: 'ERR-MAPPING-404',
    blockHours: '2,1 Jam',
    method: 'FIFO + Drum Freight',
  },
])

/* =========================================================
 * TOP METRICS (DYNAMIC COMPUTED)
 * ======================================================= */

const unpostedCount = computed(() =>
  fuelCostLogs.value.filter((i) => i.glStatus !== 'Posted GL').length,
)

const metrics = computed(() => [
  {
    title: 'Total Biaya Avtur',
    count: 'Rp 4,85 M',
    unit: '382.400 Liter Terpakai',
    sub: '38,2% Total HPP Operasional',
    icon: 'mdi-cash-multiple',
    color: 'primary',
  },
  {
    title: 'Harga / Liter — Hub',
    count: 'Rp 12.680 / L',
    unit: 'Sentani & Wamena DPPU',
    sub: 'Mengikuti Price List',
    icon: 'mdi-cash-marker',
    color: 'teal',
  },
  {
    title: 'Harga / Liter — Airstrip',
    count: 'Rp 24.500 / L',
    unit: 'Termasuk Cargo Drum',
    sub: 'Supply Pedalaman',
    icon: 'mdi-truck-cargo-container',
    color: 'warning',
  },
  {
    title: 'HPP / Block Hour',
    count: 'Rp 18,2 Jt',
    unit: 'DHC-6 / Caravan',
    sub: '+1,2% dari Target Budget',
    icon: 'mdi-clock-fast',
    color: 'info',
  },
  {
    title: 'Unposted GL',
    count: `${unpostedCount.value} Jurnal`,
    unit: unpostedCount.value > 0 ? 'Menunggu Closing Harian' : 'Semua Terposting',
    sub: unpostedCount.value > 0 ? 'Perlu Validasi Finance' : '100% GL Synced',
    icon: 'mdi-clock-alert-outline',
    color: unpostedCount.value > 0 ? 'error' : 'success',
  },
  {
    title: 'Cost Center Mapping',
    count: '100% Synced',
    unit: '14 Aircraft Registered',
    sub: 'Terhubung Finance & Accounting',
    icon: 'mdi-check-decagram-outline',
    color: 'purple',
  },
])

/* =========================================================
 * COSTING WORKFLOW
 * ======================================================= */

const costingFlowSteps = [
  {
    step: 1,
    title: 'Refuel & Meter Log',
    desc: 'Volume avtur dicatat dari meter pengisian pada hub maupun airstrip.',
    icon: 'mdi-gas-station',
    color: 'primary',
  },
  {
    step: 2,
    title: 'Rate & Pricing Lookup',
    desc: 'Harga pokok ditentukan berdasarkan lokasi, costing method, dan surcharge.',
    icon: 'mdi-cash-check',
    color: 'teal',
  },
  {
    step: 3,
    title: 'HPP Flight Allocation',
    desc: 'Biaya dialokasikan ke flight, registrasi pesawat, rute, dan block hour.',
    icon: 'mdi-chart-line',
    color: 'warning',
  },
  {
    step: 4,
    title: 'Auto Journal Drafting',
    desc: 'Draft jurnal debit HPP dan kredit persediaan dibentuk otomatis.',
    icon: 'mdi-file-document-edit-outline',
    color: 'purple',
  },
  {
    step: 5,
    title: 'Posting to Finance GL',
    desc: 'Jurnal yang tervalidasi dikirim ke General Ledger ERP.',
    icon: 'mdi-bank-transfer-in',
    color: 'success',
  },
]

/* =========================================================
 * FILTERS
 * ======================================================= */

const datePeriod = ref('Agustus 2026')
const selectedStation = ref('Semua Station / Hub')
const selectedCostCenter = ref('Semua Reg. Pesawat')
const selectedGLStatus = ref('Semua Status Posting')
const searchQuery = ref('')

/* =========================================================
 * SELECTED COSTING & DETAILS (REACTIVE MAP)
 * ======================================================= */

const selectedCostingId = ref('FC-202608-0123')

const costingDetails = reactive<Record<string, any>>({
  'FC-202608-0121': {
    blockHours: '2,4 Jam',
    refuelDate: '22 Aug 2026 08:15 WIB',
    basePricePerLiter: 'Rp 12.650',
    drumFreightSurcharge: 'Rp 0 / Liter',
    finalUnitCost: 'Rp 12.650 / Liter',
    costPerBlockHour: 'Rp 3.426.042 / BH',
    costCenterName: 'Flight Operations - Twin Otter PK-AMA',
    glAccountDebit: '5101-01 — Biaya Bahan Bakar Avtur',
    glAccountCredit: '1301-01 — Persediaan Avtur Hub',
  },

  'FC-202608-0122': {
    blockHours: '1,7 Jam',
    refuelDate: '22 Aug 2026 09:40 WIB',
    basePricePerLiter: 'Rp 12.800',
    drumFreightSurcharge: 'Rp 0 / Liter',
    finalUnitCost: 'Rp 12.800 / Liter',
    costPerBlockHour: 'Rp 3.162.353 / BH',
    costCenterName: 'Flight Operations - Caravan PK-AMB',
    glAccountDebit: '5101-01 — Biaya Bahan Bakar Avtur',
    glAccountCredit: '1301-01 — Persediaan Avtur Hub',
  },

  'FC-202608-0123': {
    blockHours: '1,8 Jam',
    refuelDate: '22 Aug 2026 11:30 WIB',
    basePricePerLiter: 'Rp 12.650',
    drumFreightSurcharge: 'Rp 11.850 / Liter',
    finalUnitCost: 'Rp 24.500 / Liter',
    costPerBlockHour: 'Rp 5.172.222 / BH',
    costCenterName: 'Flight Operations - Twin Otter PK-AMC',
    glAccountDebit: '5101-01 — Biaya Bahan Bakar Avtur',
    glAccountCredit: '1301-04 — Persediaan Avtur Airstrip',
  },

  'FC-202608-0124': {
    blockHours: '1,3 Jam',
    refuelDate: '22 Aug 2026 12:20 WIB',
    basePricePerLiter: 'Rp 12.900',
    drumFreightSurcharge: 'Rp 1.300 / Liter',
    finalUnitCost: 'Rp 14.200 / Liter',
    costPerBlockHour: 'Rp 3.167.692 / BH',
    costCenterName: 'Flight Operations - Porter PK-AMD',
    glAccountDebit: '5101-01 — Biaya Bahan Bakar Avtur',
    glAccountCredit: '1301-02 — Persediaan Avtur Station',
  },

  'FC-202608-0125': {
    blockHours: '2,1 Jam',
    refuelDate: '22 Aug 2026 14:10 WIB',
    basePricePerLiter: 'Rp 12.650',
    drumFreightSurcharge: 'Rp 9.450 / Liter',
    finalUnitCost: 'Rp 22.100 / Liter',
    costPerBlockHour: 'Rp 5.261.905 / BH',
    costCenterName: 'Flight Operations - Twin Otter PK-AMA',
    glAccountDebit: '5101-01 — Biaya Bahan Bakar Avtur',
    glAccountCredit: '1301-05 — Persediaan Avtur Airstrip',
  },
})

const selectedCosting = computed(() => {
  const item = fuelCostLogs.value.find(
    (item) => item.id === selectedCostingId.value,
  )

  if (!item) return null

  const detail = costingDetails[item.id] ?? {}

  return {
    ...item,
    ...detail,
    flightLabel: `${item.flightNo} — ${item.station}`,
  }
})

function selectCosting(item: any) {
  selectedCostingId.value = item.id
}

/* =========================================================
 * FILTERED DATA
 * ======================================================= */

const filteredFuelCostLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return fuelCostLogs.value.filter((item) => {
    const matchStation =
      selectedStation.value === 'Semua Station / Hub' ||
      item.station === selectedStation.value

    const matchCostCenter =
      selectedCostCenter.value === 'Semua Reg. Pesawat' ||
      item.aircraftReg === selectedCostCenter.value

    const matchGL =
      selectedGLStatus.value === 'Semua Status Posting' ||
      item.glStatus === selectedGLStatus.value

    const matchSearch =
      !query ||
      item.id.toLowerCase().includes(query) ||
      item.flightNo.toLowerCase().includes(query) ||
      item.aircraftReg.toLowerCase().includes(query) ||
      item.costCenter.toLowerCase().includes(query) ||
      item.journalRef.toLowerCase().includes(query)

    return matchStation && matchCostCenter && matchGL && matchSearch
  })
})

/* =========================================================
 * MASTER PRICE DATA (REACTIVE)
 * ======================================================= */

const stationPrices = ref([
  {
    station: 'Sentani (DJJ)',
    type: 'DPPU / Hub',
    basePrice: 'Rp 12.650',
    surcharge: 'Rp 0',
    finalPrice: 'Rp 12.650',
    method: 'Weighted Average',
    effective: '01 Aug 2026',
    status: 'Aktif',
    color: 'success',
  },
  {
    station: 'Wamena (WMX)',
    type: 'DPPU / Hub',
    basePrice: 'Rp 12.800',
    surcharge: 'Rp 0',
    finalPrice: 'Rp 12.800',
    method: 'Weighted Average',
    effective: '01 Aug 2026',
    status: 'Aktif',
    color: 'success',
  },
  {
    station: 'Timika (TIM)',
    type: 'Station',
    basePrice: 'Rp 12.900',
    surcharge: 'Rp 1.300',
    finalPrice: 'Rp 14.200',
    method: 'Weighted Average',
    effective: '01 Aug 2026',
    status: 'Aktif',
    color: 'success',
  },
  {
    station: 'Airstrip Okbibab',
    type: 'Airstrip',
    basePrice: 'Rp 12.650',
    surcharge: 'Rp 11.850',
    finalPrice: 'Rp 24.500',
    method: 'FIFO + Freight',
    effective: '18 Aug 2026',
    status: 'Aktif',
    color: 'success',
  },
  {
    station: 'Airstrip Boven Digoel',
    type: 'Airstrip',
    basePrice: 'Rp 12.650',
    surcharge: 'Rp 9.450',
    finalPrice: 'Rp 22.100',
    method: 'FIFO + Freight',
    effective: '18 Aug 2026',
    status: 'Review',
    color: 'warning',
  },
])

/* =========================================================
 * BLOCK HOUR DATA
 * ======================================================= */

const blockHourData = [
  {
    aircraft: 'PK-AMA',
    type: 'DHC-6 Twin Otter',
    flights: 48,
    blockHours: '96,4 BH',
    fuelLiters: '62.850 L',
    fuelCost: 'Rp 794,6 Jt',
    costPerBH: 'Rp 8,24 Jt',
    variance: '+1,4%',
  },
  {
    aircraft: 'PK-AMB',
    type: 'Cessna Caravan',
    flights: 41,
    blockHours: '78,2 BH',
    fuelLiters: '45.620 L',
    fuelCost: 'Rp 583,9 Jt',
    costPerBH: 'Rp 7,47 Jt',
    variance: '+0,8%',
  },
  {
    aircraft: 'PK-AMC',
    type: 'DHC-6 Twin Otter',
    flights: 39,
    blockHours: '82,1 BH',
    fuelLiters: '51.430 L',
    fuelCost: 'Rp 789,8 Jt',
    costPerBH: 'Rp 9,62 Jt',
    variance: '+2,8%',
  },
  {
    aircraft: 'PK-AMD',
    type: 'Pilatus Porter',
    flights: 32,
    blockHours: '54,7 BH',
    fuelLiters: '27.940 L',
    fuelCost: 'Rp 396,7 Jt',
    costPerBH: 'Rp 7,25 Jt',
    variance: '-0,6%',
  },
]

/* =========================================================
 * GL JOURNAL DATA (REACTIVE)
 * ======================================================= */

const glJournalLogs = ref([
  {
    journal: 'JRN-20260822-0041',
    costing: 'FC-202608-0121',
    flight: 'AMA-201',
    date: '22 Aug 2026',
    debit: 'Rp 8.222.500',
    credit: 'Rp 8.222.500',
    account: '5101-01 / 1301-01',
    status: 'Posted',
    color: 'success',
  },
  {
    journal: 'JRN-20260822-0042',
    costing: 'FC-202608-0122',
    flight: 'AMA-204',
    date: '22 Aug 2026',
    debit: 'Rp 5.376.000',
    credit: 'Rp 5.376.000',
    account: '5101-01 / 1301-01',
    status: 'Posted',
    color: 'success',
  },
  {
    journal: 'JRN-PENDING-088',
    costing: 'FC-202608-0123',
    flight: 'AMA-308',
    date: '22 Aug 2026',
    debit: 'Rp 9.310.000',
    credit: 'Rp 9.310.000',
    account: '5101-01 / 1301-04',
    status: 'Draft',
    color: 'warning',
  },
  {
    journal: 'JRN-PENDING-089',
    costing: 'FC-202608-0124',
    flight: 'AMA-112',
    date: '22 Aug 2026',
    debit: 'Rp 4.118.000',
    credit: 'Rp 4.118.000',
    account: '5101-01 / 1301-02',
    status: 'Draft',
    color: 'warning',
  },
  {
    journal: 'ERR-MAPPING-404',
    costing: 'FC-202608-0125',
    flight: 'AMA-501',
    date: '22 Aug 2026',
    debit: 'Rp 11.050.000',
    credit: 'Rp 11.050.000',
    account: '5101-01 / 1301-05',
    status: 'Failed',
    color: 'error',
  },
])

/* =========================================================
 * COST CENTER DATA (REACTIVE)
 * ======================================================= */

const costCenterData = ref([
  {
    code: 'CC-OPS-PKAMA',
    aircraft: 'PK-AMA',
    aircraftType: 'DHC-6 Twin Otter',
    department: 'Flight Operations',
    flights: 48,
    fuelCost: 'Rp 794,6 Jt',
    status: 'Synced',
    color: 'success',
  },
  {
    code: 'CC-OPS-PKAMB',
    aircraft: 'PK-AMB',
    aircraftType: 'Cessna Caravan',
    department: 'Flight Operations',
    flights: 41,
    fuelCost: 'Rp 583,9 Jt',
    status: 'Synced',
    color: 'success',
  },
  {
    code: 'CC-OPS-PKAMC',
    aircraft: 'PK-AMC',
    aircraftType: 'DHC-6 Twin Otter',
    department: 'Flight Operations',
    flights: 39,
    fuelCost: 'Rp 789,8 Jt',
    status: 'Synced',
    color: 'success',
  },
  {
    code: 'CC-OPS-PKAMD',
    aircraft: 'PK-AMD',
    aircraftType: 'Pilatus Porter',
    department: 'Flight Operations',
    flights: 32,
    fuelCost: 'Rp 396,7 Jt',
    status: 'Synced',
    color: 'success',
  },
])

/* =========================================================
 * UI STATE & INTERACTIVE ACTIONS
 * ======================================================= */

const page = ref(1)
const itemsPerPage = ref(10)

function resetFilters() {
  datePeriod.value = 'Agustus 2026'
  selectedStation.value = 'Semua Station / Hub'
  selectedCostCenter.value = 'Semua Reg. Pesawat'
  selectedGLStatus.value = 'Semua Status Posting'
  searchQuery.value = ''
  page.value = 1
  showNotify('Filter berhasil direset.', 'info')
}

function handleRefresh() {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
    showNotify('Data costing dan status ERP berhasil diperbarui!', 'success')
  }, 600)
}

function handleExport() {
  showNotify('Laporan Costing & GL berhasil di-export ke Excel (.xlsx)', 'info')
}

/* Single Post GL Action */
function handlePostGL(costingId?: string) {
  const id = costingId || selectedCostingId.value
  const item = fuelCostLogs.value.find((i) => i.id === id)
  if (!item) return

  if (item.glStatus === 'Posted GL') {
    showNotify(`Jurnal ${item.id} sudah diposting sebelumnya.`, 'warning')
    return
  }

  const generatedJrn = `JRN-20260822-00${Math.floor(43 + Math.random() * 40)}`
  item.glStatus = 'Posted GL'
  item.glStatusColor = 'success'
  item.journalRef = generatedJrn

  // Update or insert into GL Journal logs
  const existingGl = glJournalLogs.value.find((g) => g.costing === item.id)
  if (existingGl) {
    existingGl.status = 'Posted'
    existingGl.color = 'success'
    existingGl.journal = generatedJrn
  } else {
    glJournalLogs.value.unshift({
      journal: generatedJrn,
      costing: item.id,
      flight: item.flightNo,
      date: '22 Aug 2026',
      debit: item.totalCost,
      credit: item.totalCost,
      account: '5101-01 / 1301-01',
      status: 'Posted',
      color: 'success',
    })
  }

  showNotify(`Sukses Posting GL untuk ${item.id} (${item.flightNo})`, 'success')
}

/* Batch Post GL Action */
function handleBatchPostGL() {
  const unpostedItems = fuelCostLogs.value.filter((i) => i.glStatus !== 'Posted GL')
  if (unpostedItems.length === 0) {
    showNotify('Tidak ada transaksi jurnal yang pending untuk diposting.', 'info')
    return
  }

  let count = 0
  unpostedItems.forEach((item) => {
    const generatedJrn = `JRN-20260822-00${Math.floor(50 + Math.random() * 40)}`
    item.glStatus = 'Posted GL'
    item.glStatusColor = 'success'
    item.journalRef = generatedJrn

    const existingGl = glJournalLogs.value.find((g) => g.costing === item.id)
    if (existingGl) {
      existingGl.status = 'Posted'
      existingGl.color = 'success'
      existingGl.journal = generatedJrn
    }
    count++
  })

  showNotify(`Berhasil melakukan Batch Posting ${count} jurnal ke Finance GL ERP!`, 'success')
}

/* Dialog Master Price */
const showAddPriceDialog = ref(false)
const newPriceForm = reactive({
  station: '',
  type: 'Station',
  basePrice: '',
  surcharge: 'Rp 0',
  method: 'Weighted Average',
})

function submitAddPriceRule() {
  if (!newPriceForm.station || !newPriceForm.basePrice) {
    showNotify('Harap isi nama station dan harga dasar!', 'error')
    return
  }

  const baseVal = newPriceForm.basePrice.startsWith('Rp') ? newPriceForm.basePrice : `Rp ${newPriceForm.basePrice}`
  const surVal = newPriceForm.surcharge.startsWith('Rp') ? newPriceForm.surcharge : `Rp ${newPriceForm.surcharge}`

  stationPrices.value.unshift({
    station: newPriceForm.station,
    type: newPriceForm.type,
    basePrice: baseVal,
    surcharge: surVal,
    finalPrice: baseVal,
    method: newPriceForm.method,
    effective: '11 Sep 2026',
    status: 'Aktif',
    color: 'success',
  })

  showAddPriceDialog.value = false
  showNotify(`Master harga baru untuk ${newPriceForm.station} berhasil ditambahkan!`, 'success')

  newPriceForm.station = ''
  newPriceForm.basePrice = ''
  newPriceForm.surcharge = 'Rp 0'
}

/* Dialog Edit GL Mapping */
const showEditMappingDialog = ref(false)
const editMappingForm = reactive({
  costCenter: '',
  debitAccount: '',
  creditAccount: '',
})

function openEditMapping() {
  if (!selectedCosting.value) return
  const item = selectedCosting.value
  editMappingForm.costCenter = item.costCenter || ''
  editMappingForm.debitAccount = item.glAccountDebit || '5101-01 — Biaya Bahan Bakar Avtur'
  editMappingForm.creditAccount = item.glAccountCredit || '1301-01 — Persediaan Avtur Hub'
  showEditMappingDialog.value = true
}

function saveMapping() {
  if (!selectedCostingId.value) return
  const item = fuelCostLogs.value.find((i) => i.id === selectedCostingId.value)
  if (item) {
    item.costCenter = editMappingForm.costCenter
    if (costingDetails[item.id]) {
      costingDetails[item.id].glAccountDebit = editMappingForm.debitAccount
      costingDetails[item.id].glAccountCredit = editMappingForm.creditAccount
    }
  }
  showEditMappingDialog.value = false
  showNotify(`Mapping GL & Cost Center untuk ${selectedCostingId.value} berhasil diperbarui.`, 'success')
}

/* Dialog Edit Cost Center */
const showEditCostCenterDialog = ref(false)
const selectedCCItem = ref<any>(null)

function openEditCostCenter(item: any) {
  selectedCCItem.value = { ...item }
  showEditCostCenterDialog.value = true
}

function saveCostCenter() {
  if (!selectedCCItem.value) return
  const idx = costCenterData.value.findIndex((c) => c.code === selectedCCItem.value.code)
  if (idx !== -1) {
    costCenterData.value[idx] = { ...selectedCCItem.value }
  }
  showEditCostCenterDialog.value = false
  showNotify(`Pemetaan Cost Center ${selectedCCItem.value.code} berhasil disimpan!`, 'success')
}

function getVarianceColor(variance: string) {
  const numeric = Number(
    variance.replace('%', '').replace(',', '.').replace('+', ''),
  )

  if (numeric > 2) return 'error'
  if (numeric > 1) return 'warning'
  return 'success'
}
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">

    <!-- Breadcrumb -->
    <v-breadcrumbs
      :items="breadcrumbs"
      class="px-0 py-1 text-caption"
    />

    <!-- Page Header -->
    <div class="d-flex flex-wrap align-start justify-space-between mb-4 gap-3">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3 mb-1">
          Fuel Costing & Pengintegrasian Finance ERP
        </h1>

        <p class="text-caption text-medium-emphasis mb-0">
          Operational costing, flight HPP allocation, cost center mapping,
          dan automatic General Ledger posting.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <v-chip
          color="success"
          variant="tonal"
          size="small"
          prepend-icon="mdi-database-check-outline"
        >
          Finance ERP Connected
        </v-chip>

        <v-btn
          variant="outlined"
          color="primary"
          size="small"
          prepend-icon="mdi-refresh"
          class="text-none"
          :loading="isRefreshing"
          @click="handleRefresh"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- GLOBAL AVTUR NAVIGATION -->
    <AvturTopNav />

    <!-- INTERNAL COSTING NAVIGATION -->
    <v-card
      variant="flat"
      class="border rounded-lg bg-white mb-6"
    >
      <v-tabs
        v-model="activeTab"
        color="primary"
        show-arrows
        class="costing-tabs"
      >
        <v-tab
          v-for="(tab, i) in tabs"
          :key="i"
          :value="i"
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

    <!-- =====================================================
         TAB 0 — SUMMARY
         =================================================== -->
    <template v-if="activeTab === 0">

      <!-- Metrics -->
      <v-row class="mb-5">
        <v-col
          v-for="(m, idx) in metrics"
          :key="idx"
          cols="12"
          sm="6"
          md="4"
          lg="2"
        >
          <v-card
            variant="flat"
            class="border rounded-lg pa-4 bg-white h-100 metric-card"
          >
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-medium-emphasis">
                {{ m.title }}
              </span>

              <v-avatar
                :color="m.color"
                variant="tonal"
                size="34"
              >
                <v-icon
                  :icon="m.icon"
                  size="18"
                />
              </v-avatar>
            </div>

            <div class="text-h6 font-weight-bold text-grey-darken-4 mb-1">
              {{ m.count }}
            </div>

            <div class="text-caption text-medium-emphasis">
              {{ m.unit }}
            </div>

            <div
              class="text-caption font-weight-medium mt-1"
              :class="`text-${m.color}`"
            >
              {{ m.sub }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Workflow -->
      <v-card
        variant="flat"
        class="border rounded-lg pa-5 bg-white mb-6"
      >
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
              Alur Fuel Costing → Finance GL
            </div>

            <div class="text-caption text-medium-emphasis">
              Pipeline pembentukan biaya avtur sampai jurnal General Ledger.
            </div>
          </div>

          <v-chip
            size="small"
            color="primary"
            variant="tonal"
          >
            5 Stage Pipeline
          </v-chip>
        </div>

        <div class="costing-flow">
          <template
            v-for="s in costingFlowSteps"
            :key="s.step"
          >
            <div class="flow-item">
              <v-avatar
                :color="s.color"
                size="38"
                variant="tonal"
                class="mb-2"
              >
                <v-icon
                  :icon="s.icon"
                  size="19"
                />
              </v-avatar>

              <div class="flow-number">
                {{ s.step }}
              </div>

              <div class="font-weight-bold text-body-2 mb-1">
                {{ s.title }}
              </div>

              <div class="text-caption text-medium-emphasis flow-desc">
                {{ s.desc }}
              </div>
            </div>

            <v-icon
              v-if="s.step < costingFlowSteps.length"
              icon="mdi-chevron-right"
              color="grey"
              size="22"
              class="flow-arrow"
            />
          </template>
        </div>
      </v-card>

      <!-- Main Table + Detail -->
      <v-row class="mb-6">

        <!-- Table -->
        <v-col
          cols="12"
          lg="8"
        >
          <v-card
            variant="flat"
            class="border rounded-lg bg-white pa-5 h-100"
          >
            <div class="d-flex align-center justify-space-between mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Fuel Costing Transactions
                </div>

                <div class="text-caption text-medium-emphasis">
                  Alokasi biaya avtur berdasarkan flight dan cost center.
                </div>
              </div>

              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-download-outline"
                class="text-none"
                @click="handleExport"
              >
                Export
              </v-btn>
            </div>

            <!-- Filters -->
            <v-row
              density="compact"
              class="mb-3"
            >
              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <v-select
                  v-model="datePeriod"
                  :items="['Agustus 2026', 'Juli 2026', 'Juni 2026']"
                  label="Periode"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <v-select
                  v-model="selectedStation"
                  :items="[
                    'Semua Station / Hub',
                    'Sentani (DJJ)',
                    'Wamena (WMX)',
                    'Timika (TIM)',
                    'Airstrip Okbibab',
                    'Airstrip Boven Digoel'
                  ]"
                  label="Lokasi Refuel"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <v-select
                  v-model="selectedCostCenter"
                  :items="[
                    'Semua Reg. Pesawat',
                    'PK-AMA (Twin Otter)',
                    'PK-AMB (Caravan)',
                    'PK-AMC (Twin Otter)',
                    'PK-AMD (Porter)'
                  ]"
                  label="Pesawat"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
                md="3"
              >
                <v-select
                  v-model="selectedGLStatus"
                  :items="[
                    'Semua Status Posting',
                    'Posted GL',
                    'Draft / Unposted',
                    'Failed Sync'
                  ]"
                  label="Status GL"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="searchQuery"
                  placeholder="Cari ID costing, flight, registrasi, cost center, atau jurnal..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end mb-3">
              <v-btn
                variant="text"
                size="small"
                color="grey-darken-1"
                prepend-icon="mdi-filter-remove-outline"
                class="text-none"
                @click="resetFilters"
              >
                Reset Filter
              </v-btn>

              <v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-cash-register"
                class="text-none ml-2"
                @click="handleBatchPostGL"
              >
                Batch Post GL
              </v-btn>
            </div>

            <!-- Table -->
            <div class="table-wrapper">
              <v-table
                density="comfortable"
                class="border rounded"
              >
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">
                      ID & Flight
                    </th>
                    <th class="font-weight-bold text-caption">
                      Pesawat
                    </th>
                    <th class="font-weight-bold text-caption">
                      Station
                    </th>
                    <th class="font-weight-bold text-caption">
                      Volume
                    </th>
                    <th class="font-weight-bold text-caption">
                      Total Biaya
                    </th>
                    <th class="font-weight-bold text-caption">
                      GL
                    </th>
                    <th class="font-weight-bold text-caption text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in filteredFuelCostLogs"
                    :key="item.id"
                    :class="{
                      'selected-row': selectedCostingId === item.id
                    }"
                    class="costing-row"
                    @click="selectCosting(item)"
                  >
                    <td>
                      <div class="font-weight-bold text-body-2">
                        {{ item.id }}
                      </div>
                      <div class="text-caption text-primary font-weight-bold">
                        {{ item.flightNo }}
                      </div>
                    </td>

                    <td>
                      <div class="text-caption font-weight-medium">
                        {{ item.aircraftReg }}
                      </div>
                      <v-chip
                        size="x-small"
                        color="grey-darken-2"
                        variant="tonal"
                        class="mt-1"
                      >
                        {{ item.costCenter }}
                      </v-chip>
                    </td>

                    <td class="text-caption">
                      {{ item.station }}
                    </td>

                    <td class="text-caption font-weight-bold">
                      {{ item.volLiters }}
                    </td>

                    <td class="text-body-2 font-weight-bold">
                      {{ item.totalCost }}
                    </td>

                    <td>
                      <v-chip
                        size="x-small"
                        :color="item.glStatusColor"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        {{ item.glStatus }}
                      </v-chip>
                    </td>

                    <td
                      class="text-center"
                      @click.stop
                    >
                      <v-btn
                        icon="mdi-book-open-outline"
                        variant="text"
                        size="small"
                        color="grey-darken-1"
                        title="Pilih Detail"
                        @click="selectCosting(item)"
                      />

                      <v-menu location="bottom end">
                        <template #activator="{ props }">
                          <v-btn
                            icon="mdi-dots-vertical"
                            variant="text"
                            size="small"
                            color="grey-darken-1"
                            v-bind="props"
                          />
                        </template>

                        <v-list density="compact">
                          <v-list-item
                            prepend-icon="mdi-send-check"
                            title="Post ke GL"
                            :disabled="item.glStatus === 'Posted GL'"
                            @click="handlePostGL(item.id)"
                          />
                          <v-list-item
                            prepend-icon="mdi-pencil-outline"
                            title="Edit Mapping"
                            @click="selectCosting(item); openEditMapping()"
                          />
                        </v-list>
                      </v-menu>
                    </td>
                  </tr>

                  <tr v-if="!filteredFuelCostLogs.length">
                    <td
                      colspan="7"
                      class="text-center py-8"
                    >
                      <v-icon
                        icon="mdi-file-search-outline"
                        size="32"
                        color="grey"
                        class="mb-2"
                      />
                      <div class="text-body-2 font-weight-medium">
                        Tidak ada transaksi costing
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Sesuaikan filter atau kata pencarian.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div class="d-flex align-center justify-space-between mt-4 flex-wrap gap-3">
              <span class="text-caption text-medium-emphasis">
                Menampilkan
                <strong>{{ filteredFuelCostLogs.length }}</strong>
                transaksi costing.
              </span>

              <div class="d-flex align-center">
                <v-pagination
                  v-model="page"
                  :length="4"
                  density="compact"
                />

                <v-select
                  v-model="itemsPerPage"
                  :items="[10, 25, 50]"
                  suffix="/ hlm"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="ml-3"
                  style="width: 120px"
                />
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Detail Panel -->
        <v-col
          cols="12"
          lg="4"
        >
          <v-card
            v-if="selectedCosting"
            variant="flat"
            class="border rounded-lg bg-white pa-5 h-100"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                {{ selectedCosting.id }}
              </span>

              <v-chip
                size="x-small"
                :color="selectedCosting.glStatusColor"
                variant="tonal"
                class="font-weight-bold"
              >
                {{ selectedCosting.glStatus }}
              </v-chip>
            </div>

            <div class="text-caption text-medium-emphasis mb-4">
              Flight:
              <span class="font-weight-bold text-grey-darken-3">
                {{ selectedCosting.flightNo }}
              </span>
            </div>

            <v-divider class="mb-4" />

            <!-- Operational -->
            <div class="detail-section-title">
              <v-icon
                icon="mdi-airplane"
                color="primary"
                size="18"
              />
              Informasi Operasional & Refuel
            </div>

            <div class="detail-box mb-4">
              <div class="detail-row">
                <span>Registrasi Pesawat</span>
                <strong>{{ selectedCosting.aircraftReg }}</strong>
              </div>

              <div class="detail-row">
                <span>Lokasi Station</span>
                <strong>{{ selectedCosting.station }}</strong>
              </div>

              <div class="detail-row">
                <span>Waktu Refuel</span>
                <strong>{{ selectedCosting.refuelDate }}</strong>
              </div>

              <div class="detail-row">
                <span>Block Hours</span>
                <strong class="text-primary">
                  {{ selectedCosting.blockHours }}
                </strong>
              </div>
            </div>

            <!-- Costing -->
            <div class="detail-section-title">
              <v-icon
                icon="mdi-calculator"
                color="teal"
                size="18"
              />
              Breakdown Komponen Biaya
            </div>

            <div class="detail-box mb-4">
              <div class="detail-row">
                <span>Volume Refuel</span>
                <strong>{{ selectedCosting.volLiters }}</strong>
              </div>

              <div class="detail-row">
                <span>Harga Dasar / Liter</span>
                <strong>{{ selectedCosting.basePricePerLiter }}</strong>
              </div>

              <div class="detail-row">
                <span>Drum Freight / Surcharge</span>
                <strong class="text-warning">
                  {{ selectedCosting.drumFreightSurcharge }}
                </strong>
              </div>

              <div class="detail-row detail-total">
                <span>Tarif Akhir / Liter</span>
                <strong class="text-teal">
                  {{ selectedCosting.finalUnitCost }}
                </strong>
              </div>

              <div class="detail-row detail-total">
                <span>Total Biaya</span>
                <strong class="text-body-2">
                  {{ selectedCosting.totalCost }}
                </strong>
              </div>

              <div class="detail-row">
                <span>HPP / Block Hour</span>
                <strong class="text-primary">
                  {{ selectedCosting.costPerBlockHour }}
                </strong>
              </div>
            </div>

            <!-- GL -->
            <div class="detail-section-title">
              <v-icon
                icon="mdi-book-open-page-variant"
                color="purple"
                size="18"
              />
              Preview Jurnal Finance
            </div>

            <div class="detail-box mb-5">
              <div class="detail-row">
                <span>Cost Center</span>
                <strong class="text-purple">
                  {{ selectedCosting.costCenter }}
                </strong>
              </div>

              <div class="detail-row">
                <span>Journal Reference</span>
                <strong>{{ selectedCosting.journalRef }}</strong>
              </div>

              <div class="journal-preview">
                <div class="text-caption font-weight-bold mb-2">
                  Double-Entry Accounting
                </div>

                <div class="journal-line text-error">
                  <span>
                    (DR) {{ selectedCosting.glAccountDebit }}
                  </span>
                  <strong>
                    {{ selectedCosting.totalCost }}
                  </strong>
                </div>

                <div class="journal-line text-success">
                  <span>
                    (CR) {{ selectedCosting.glAccountCredit }}
                  </span>
                  <strong>
                    {{ selectedCosting.totalCost }}
                  </strong>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                variant="outlined"
                color="primary"
                block
                prepend-icon="mdi-pencil-outline"
                class="text-none font-weight-bold"
                @click="openEditMapping"
              >
                Edit Mapping
              </v-btn>

              <v-btn
                color="primary"
                block
                prepend-icon="mdi-send-check"
                class="text-none font-weight-bold"
                :disabled="selectedCosting.glStatus === 'Posted GL'"
                @click="handlePostGL()"
              >
                Post to GL
              </v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>

    </template>

    <!-- =====================================================
         TAB 1 — MASTER PRICE
         =================================================== -->
    <template v-else-if="activeTab === 1">

      <v-card
        variant="flat"
        class="border rounded-lg bg-white pa-5"
      >
        <div class="d-flex align-center justify-space-between mb-5">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
              Master Harga Avtur per Station
            </div>

            <div class="text-caption text-medium-emphasis">
              Referensi harga dasar, surcharge, dan metode costing yang digunakan
              dalam perhitungan HPP.
            </div>
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            class="text-none"
            @click="showAddPriceDialog = true"
          >
            Tambah Price Rule
          </v-btn>
        </div>

        <v-table class="border rounded">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">Station</th>
              <th class="font-weight-bold text-caption">Tipe</th>
              <th class="font-weight-bold text-caption">Harga Dasar</th>
              <th class="font-weight-bold text-caption">Surcharge</th>
              <th class="font-weight-bold text-caption">Harga Akhir</th>
              <th class="font-weight-bold text-caption">Costing Method</th>
              <th class="font-weight-bold text-caption">Effective</th>
              <th class="font-weight-bold text-caption">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in stationPrices"
              :key="item.station"
            >
              <td class="font-weight-bold text-body-2">
                {{ item.station }}
              </td>

              <td>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  color="grey-darken-1"
                >
                  {{ item.type }}
                </v-chip>
              </td>

              <td class="text-caption">
                {{ item.basePrice }}
              </td>

              <td class="text-caption text-warning font-weight-medium">
                {{ item.surcharge }}
              </td>

              <td class="font-weight-bold text-teal">
                {{ item.finalPrice }}
              </td>

              <td class="text-caption">
                {{ item.method }}
              </td>

              <td class="text-caption">
                {{ item.effective }}
              </td>

              <td>
                <v-chip
                  size="x-small"
                  :color="item.color"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ item.status }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

    </template>

    <!-- =====================================================
         TAB 2 — BLOCK HOUR
         =================================================== -->
    <template v-else-if="activeTab === 2">

      <v-row class="mb-5">
        <v-col
          cols="12"
          md="4"
        >
          <v-card
            variant="flat"
            class="border rounded-lg pa-5 bg-white h-100"
          >
            <div class="text-caption text-medium-emphasis mb-2">
              Average HPP / Block Hour
            </div>

            <div class="text-h5 font-weight-bold mb-1">
              Rp 18,2 Jt
            </div>

            <div class="text-caption text-success">
              +1,2% terhadap budget
            </div>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          md="4"
        >
          <v-card
            variant="flat"
            class="border rounded-lg pa-5 bg-white h-100"
          >
            <div class="text-caption text-medium-emphasis mb-2">
              Total Block Hours
            </div>

            <div class="text-h5 font-weight-bold mb-1">
              311,4 BH
            </div>

            <div class="text-caption text-medium-emphasis">
              160 flight mission
            </div>
          </v-card>
        </v-col>

        <v-col
          cols="12"
          md="4"
        >
          <v-card
            variant="flat"
            class="border rounded-lg pa-5 bg-white h-100"
          >
            <div class="text-caption text-medium-emphasis mb-2">
              Highest Cost / BH
            </div>

            <div class="text-h5 font-weight-bold mb-1">
              PK-AMC
            </div>

            <div class="text-caption text-warning">
              Rp 9,62 Jt / BH
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card
        variant="flat"
        class="border rounded-lg bg-white pa-5"
      >
        <div class="text-subtitle-1 font-weight-bold mb-1">
          HPP Penerbangan per Block Hour
        </div>

        <div class="text-caption text-medium-emphasis mb-4">
          Perbandingan konsumsi avtur dan biaya terhadap jam operasi pesawat.
        </div>

        <v-table class="border rounded">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">Pesawat</th>
              <th class="font-weight-bold text-caption">Tipe</th>
              <th class="font-weight-bold text-caption">Flight</th>
              <th class="font-weight-bold text-caption">Block Hour</th>
              <th class="font-weight-bold text-caption">Fuel</th>
              <th class="font-weight-bold text-caption">Fuel Cost</th>
              <th class="font-weight-bold text-caption">HPP / BH</th>
              <th class="font-weight-bold text-caption">Variance</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in blockHourData"
              :key="item.aircraft"
            >
              <td class="font-weight-bold">
                {{ item.aircraft }}
              </td>

              <td class="text-caption">
                {{ item.type }}
              </td>

              <td class="text-caption">
                {{ item.flights }}
              </td>

              <td class="text-caption font-weight-bold">
                {{ item.blockHours }}
              </td>

              <td class="text-caption">
                {{ item.fuelLiters }}
              </td>

              <td class="text-caption font-weight-bold">
                {{ item.fuelCost }}
              </td>

              <td class="font-weight-bold text-primary">
                {{ item.costPerBH }}
              </td>

              <td>
                <v-chip
                  size="x-small"
                  :color="getVarianceColor(item.variance)"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ item.variance }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

    </template>

    <!-- =====================================================
         TAB 3 — GL JOURNAL
         =================================================== -->
    <template v-else-if="activeTab === 3">

      <v-card
        variant="flat"
        class="border rounded-lg bg-white pa-5"
      >
        <div class="d-flex align-center justify-space-between mb-5">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
              Log Jurnal Otomatis General Ledger
            </div>

            <div class="text-caption text-medium-emphasis">
              Monitoring draft, posting, dan kegagalan sinkronisasi jurnal
              dari transaksi fuel costing.
            </div>
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-cash-register"
            class="text-none"
            @click="handleBatchPostGL"
          >
            Batch Post GL
          </v-btn>
        </div>

        <v-row class="mb-4">
          <v-col
            cols="12"
            sm="4"
          >
            <div class="summary-box">
              <div class="text-caption text-medium-emphasis">
                Posted
              </div>

              <div class="text-h6 font-weight-bold text-success">
                {{ glJournalLogs.filter((g : any) => g.status === 'Posted').length }}
              </div>
            </div>
          </v-col>

          <v-col
            cols="12"
            sm="4"
          >
            <div class="summary-box">
              <div class="text-caption text-medium-emphasis">
                Draft / Unposted
              </div>

              <div class="text-h6 font-weight-bold text-warning">
                {{ glJournalLogs.filter((g : any) => g.status === 'Draft').length }}
              </div>
            </div>
          </v-col>

          <v-col
            cols="12"
            sm="4"
          >
            <div class="summary-box">
              <div class="text-caption text-medium-emphasis">
                Failed Sync
              </div>

              <div class="text-h6 font-weight-bold text-error">
                {{ glJournalLogs.filter((g : any) => g.status === 'Failed').length }}
              </div>
            </div>
          </v-col>
        </v-row>

        <v-table class="border rounded">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">Journal</th>
              <th class="font-weight-bold text-caption">Costing</th>
              <th class="font-weight-bold text-caption">Flight</th>
              <th class="font-weight-bold text-caption">Tanggal</th>
              <th class="font-weight-bold text-caption">Debit</th>
              <th class="font-weight-bold text-caption">Credit</th>
              <th class="font-weight-bold text-caption">Account</th>
              <th class="font-weight-bold text-caption">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in glJournalLogs"
              :key="item.journal"
            >
              <td class="font-weight-bold text-caption">
                {{ item.journal }}
              </td>

              <td class="text-caption">
                {{ item.costing }}
              </td>

              <td class="text-caption text-primary font-weight-bold">
                {{ item.flight }}
              </td>

              <td class="text-caption">
                {{ item.date }}
              </td>

              <td class="text-caption">
                {{ item.debit }}
              </td>

              <td class="text-caption">
                {{ item.credit }}
              </td>

              <td class="text-caption">
                {{ item.account }}
              </td>

              <td>
                <v-chip
                  size="x-small"
                  :color="item.color"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ item.status }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

    </template>

    <!-- =====================================================
         TAB 4 — COST CENTER
         =================================================== -->
    <template v-else-if="activeTab === 4">

      <v-card
        variant="flat"
        class="border rounded-lg bg-white pa-5"
      >
        <div class="d-flex align-center justify-space-between mb-5">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
              Pemetaan Cost Center ERP
            </div>

            <div class="text-caption text-medium-emphasis">
              Mapping registrasi pesawat terhadap cost center Flight Operations
              dan akun biaya avtur.
            </div>
          </div>

          <v-chip
            color="success"
            variant="tonal"
            prepend-icon="mdi-check-decagram-outline"
          >
            100% Synced
          </v-chip>
        </div>

        <v-table class="border rounded">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">Cost Center</th>
              <th class="font-weight-bold text-caption">Aircraft</th>
              <th class="font-weight-bold text-caption">Type</th>
              <th class="font-weight-bold text-caption">Department</th>
              <th class="font-weight-bold text-caption">Flight</th>
              <th class="font-weight-bold text-caption">Fuel Cost</th>
              <th class="font-weight-bold text-caption">ERP Status</th>
              <th class="font-weight-bold text-caption text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in costCenterData"
              :key="item.code"
            >
              <td>
                <div class="font-weight-bold text-body-2">
                  {{ item.code }}
                </div>

                <div class="text-caption text-medium-emphasis">
                  Flight Operations
                </div>
              </td>

              <td class="font-weight-bold">
                {{ item.aircraft }}
              </td>

              <td class="text-caption">
                {{ item.aircraftType }}
              </td>

              <td class="text-caption">
                {{ item.department }}
              </td>

              <td class="text-caption">
                {{ item.flights }}
              </td>

              <td class="text-caption font-weight-bold">
                {{ item.fuelCost }}
              </td>

              <td>
                <v-chip
                  size="x-small"
                  :color="item.color"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ item.status }}
                </v-chip>
              </td>

              <td class="text-center">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  @click="openEditCostCenter(item)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

    </template>

    <!-- Accounting Banner -->
    <v-alert
      type="success"
      variant="tonal"
      density="comfortable"
      icon="mdi-bank-check"
      class="rounded-lg border border-green-lighten-3 mt-6"
    >
      <template #title>
        <span class="text-subtitle-2 font-weight-bold">
          Standar Costing & Pengakuan Biaya Operasional
        </span>
      </template>

      <span class="text-caption">
        Sistem mockup ini menggambarkan alokasi biaya pemakaian avtur ke
        Cost Center masing-masing registrasi pesawat berdasarkan harga pokok
        yang berlaku di lokasi refuel, termasuk Weighted Average atau FIFO
        serta surcharge distribusi drum untuk airstrip. Hasil costing menjadi
        dasar HPP penerbangan, analisis biaya per Block Hour, dan pembentukan
        jurnal Finance & Accounting.
      </span>
    </v-alert>

    <!-- =====================================================
         MODAL DIALOGS FOR MOCKUP ACTIONS
         =================================================== -->

    <!-- Modal: Edit Mapping -->
    <v-dialog
      v-model="showEditMappingDialog"
      max-width="500px"
    >
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4 border-b">
          Edit Mapping GL & Cost Center
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="mb-3 text-caption text-medium-emphasis">
            Mengubah pemetaan akun General Ledger dan Cost Center untuk ID: <strong>{{ selectedCostingId }}</strong>
          </div>

          <v-text-field
            v-model="editMappingForm.costCenter"
            label="Cost Center Code"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="editMappingForm.debitAccount"
            label="Akun Debit (HPP / Biaya)"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="editMappingForm.creditAccount"
            label="Akun Kredit (Persediaan)"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0 justify-end">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-none"
            @click="showEditMappingDialog = false"
          >
            Batal
          </v-btn>

          <v-btn
            color="primary"
            class="text-none"
            @click="saveMapping"
          >
            Simpan Mapping
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal: Tambah Price Rule -->
    <v-dialog
      v-model="showAddPriceDialog"
      max-width="500px"
    >
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4 border-b">
          Tambah Rule Harga Avtur Baru
        </v-card-title>

        <v-card-text class="pa-4">
          <v-text-field
            v-model="newPriceForm.station"
            label="Nama Station / Lokasi"
            placeholder="misal: Airstrip Illaga"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-select
            v-model="newPriceForm.type"
            :items="['DPPU / Hub', 'Station', 'Airstrip']"
            label="Tipe Lokasi"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="newPriceForm.basePrice"
            label="Harga Dasar / Liter"
            placeholder="13.500"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="newPriceForm.surcharge"
            label="Surcharge / Freight Drum"
            placeholder="8.500"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-select
            v-model="newPriceForm.method"
            :items="['Weighted Average', 'FIFO + Freight', 'LIFO']"
            label="Costing Method"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0 justify-end">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-none"
            @click="showAddPriceDialog = false"
          >
            Batal
          </v-btn>

          <v-btn
            color="primary"
            class="text-none"
            @click="submitAddPriceRule"
          >
            Tambah Price Rule
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal: Edit Cost Center ERP -->
    <v-dialog
      v-model="showEditCostCenterDialog"
      max-width="480px"
    >
      <v-card
        v-if="selectedCCItem"
        class="rounded-lg"
      >
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4 border-b">
          Edit Cost Center ERP — {{ selectedCCItem.code }}
        </v-card-title>

        <v-card-text class="pa-4">
          <v-text-field
            v-model="selectedCCItem.code"
            label="Kode Cost Center"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="selectedCCItem.aircraft"
            label="Registrasi Pesawat"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-text-field
            v-model="selectedCCItem.department"
            label="Departemen ERP"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-select
            v-model="selectedCCItem.status"
            :items="['Synced', 'Unsynced', 'Review']"
            label="ERP Sync Status"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="pa-4 pt-0 justify-end">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-none"
            @click="showEditCostCenterDialog = false"
          >
            Batal
          </v-btn>

          <v-btn
            color="primary"
            class="text-none"
            @click="saveCostCenter"
          >
            Simpan Pemetaan
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- GLOBAL TOAST NOTIFICATION -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="top right"
    >
      {{ snackbarText }}

      <template #actions>
        <v-btn
          variant="text"
          color="white"
          @click="snackbar = false"
        >
          Tutup
        </v-btn>
      </template>
    </v-snackbar>

  </div>
</template>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.costing-tabs {
  min-height: 48px;
}

.metric-card {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.metric-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06) !important;
}

/* =========================================================
 * COSTING FLOW
 * ======================================================= */

.costing-flow {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr)
    auto
    minmax(140px, 1fr)
    auto
    minmax(140px, 1fr)
    auto
    minmax(140px, 1fr)
    auto
    minmax(140px, 1fr);

  align-items: stretch;
  gap: 10px;
}

.flow-item {
  position: relative;
  min-width: 0;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid rgb(var(--v-theme-grey-lighten-2));
  border-radius: 10px;
  background: rgb(var(--v-theme-grey-lighten-5));
}

.flow-number {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-weight: 700;
  color: rgb(var(--v-theme-grey-darken-1));
}

.flow-desc {
  font-size: 11px;
  line-height: 1.35;
}

.flow-arrow {
  align-self: center;
}

/* =========================================================
 * TABLE
 * ======================================================= */

.table-wrapper {
  overflow-x: auto;
}

.costing-row {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.costing-row:hover {
  background: rgb(var(--v-theme-grey-lighten-5));
}

.selected-row {
  background: rgb(var(--v-theme-blue-lighten-5)) !important;
}

/* =========================================================
 * DETAIL PANEL
 * ======================================================= */

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-grey-darken-3));
}

.detail-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgb(var(--v-theme-grey-lighten-2));
  border-radius: 8px;
  background: rgb(var(--v-theme-grey-lighten-5));
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
}

.detail-row > span {
  color: rgb(var(--v-theme-grey-darken-1));
}

.detail-row > strong {
  max-width: 60%;
  text-align: right;
  color: rgb(var(--v-theme-grey-darken-3));
}

.detail-total {
  padding-top: 7px;
  margin-top: 2px;
  border-top: 1px solid rgb(var(--v-theme-grey-lighten-2));
}

.journal-preview {
  margin-top: 7px;
  padding: 10px;
  border: 1px solid rgb(var(--v-theme-grey-lighten-2));
  border-radius: 7px;
  background: white;
}

.journal-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  font-size: 10px;
}

.journal-line span {
  max-width: 75%;
}

/* =========================================================
 * SUMMARY BOX
 * ======================================================= */

.summary-box {
  padding: 16px;
  border: 1px solid rgb(var(--v-theme-grey-lighten-2));
  border-radius: 8px;
  background: rgb(var(--v-theme-grey-lighten-5));
}

/* =========================================================
 * RESPONSIVE
 * ======================================================= */

@media (max-width: 1100px) {
  .costing-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-arrow {
    display: none;
  }
}

@media (max-width: 700px) {
  .costing-flow {
    grid-template-columns: 1fr;
  }

  .flow-item {
    text-align: left;
  }

  .detail-row {
    flex-direction: column;
    gap: 2px;
  }

  .detail-row > strong {
    max-width: 100%;
    text-align: left;
  }

  .journal-line {
    flex-direction: column;
    gap: 2px;
  }

  .journal-line span {
    max-width: 100%;
  }
}
</style>