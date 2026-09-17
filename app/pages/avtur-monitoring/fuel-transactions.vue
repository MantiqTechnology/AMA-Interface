<script setup lang="ts">
//import { ref, computed, reactive, watch } from 'vue'

// --- BREADCRUMBS & NAVIGATION STATE ---
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Fuel Transactions', disabled: true, href: '#' },
]

const activeTab = ref(0)
const tabs = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
  { title: 'Transactions List', icon: 'mdi-format-list-bulleted' },
  { title: 'Create Transaction', icon: 'mdi-plus-circle-outline' },
  { title: 'Transfer / Handover', icon: 'mdi-swap-horizontal' },
  { title: 'Consolidation to ERP', icon: 'mdi-database-export-outline' },
  { title: 'Reports & Audit', icon: 'mdi-file-chart-outline' },
]

// --- GLOBAL NOTIFICATION / SNACKBAR SYSTEM ---
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function notify(message: string, color = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// --- AUDIT TRAIL DATA & LOGGER ---
const auditLogs = ref([
  { time: '21 Aug 2026 10:27', user: 'OP-004 (Yohanes)', action: 'SYNC_ERP', detail: 'Berhasil kirim TXN-20260821-00128 ke ERP Server' },
  { time: '21 Aug 2026 10:18', user: 'OP-002 (Budi)', action: 'CREATE_TXN', detail: 'Input transaksi lokal DRUM-00087 (Offline)' },
  { time: '20 Aug 2026 15:20', user: 'SYSTEM', action: 'FLAG_REVIEW', detail: 'Segel mismatch pada TRF-00044' },
  { time: '20 Aug 2026 14:05', user: 'OP-009 (Lukas)', action: 'QC_FAILED', detail: 'Water test FAILED pada TXN-20260820-00096' }
])

function addAuditLog(action: string, detail: string) {
  const now = new Date()
  const timeStr = `${now.getDate()} Aug 2026 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  auditLogs.value.unshift({
    time: timeStr,
    user: 'OPERATOR (Current)',
    action,
    detail
  })
}

// --- METRICS DATA ---
const metrics = reactive([
  { id: 'total_txn', title: 'Total Transaksi (YTD)', count: '2,845', unit: 'Transaksi', sub: '↗ 18% vs periode lalu', icon: 'mdi-receipt-text-outline', color: 'primary' },
  { id: 'total_vol', title: 'Volume Total (YTD)', count: '1,245,680 L', unit: 'Liter', sub: '↗ 12% vs periode lalu', icon: 'mdi-water-outline', color: 'success' },
  { id: 'today_txn', title: 'Transaksi Hari Ini', count: '28', unit: 'Transaksi', sub: '785,420 L', icon: 'mdi-calendar-today', color: 'warning' },
  { id: 'in_progress', title: 'Open / In Progress', count: '7', unit: 'Transaksi', sub: 'Membutuhkan pengisian', icon: 'mdi-hourglass-small', color: 'orange' },
  { id: 'pending_sync', title: 'Pending Sync Queue', count: '12', unit: 'Transaksi', sub: 'Tersimpan lokal (Offline)', icon: 'mdi-cloud-upload-outline', color: 'purple' },
  { id: 'erpsynced', title: 'Tersinkron ke ERP', count: '2,832', unit: 'Transaksi', sub: '99.5% Success Rate', icon: 'mdi-check-circle-outline', color: 'info' },
])

// --- WORKFLOW STEPS ---
const workflowSteps = [
  { step: 1, title: 'DPPU/Hub ke Pesawat', desc: 'Pengisian langsung dari fasilitas DPPU/Hub ke pesawat utama.', icon: 'mdi-airplane-takeoff', color: 'primary', type: 'DPPU/Hub -> Pesawat' },
  { step: 2, title: 'DPPU/Hub ke Drum 200L', desc: 'Pengisian avtur dari DPPU ke drum 200L untuk pasokan remote.', icon: 'mdi-barrel', color: 'success', type: 'DPPU/Hub -> Drum 200L' },
  { step: 3, title: 'Perpindahan Drum Antar Lokasi', desc: 'Serah-terima / transfer drum antar station & airstrip.', icon: 'mdi-truck-delivery-outline', color: 'warning', type: 'Perpindahan Drum' },
  { step: 4, title: 'Drum ke Pesawat Perintis', desc: 'Refueling dari drum ke pesawat di bandara pedalaman.', icon: 'mdi-airplane', color: 'purple', type: 'Drum -> Pesawat Perintis' },
  { step: 5, title: 'Konsolidasi ke ERP', desc: 'Posting jurnal persediaan & costing otomatis ke ERP HQ.', icon: 'mdi-database-sync-outline', color: 'teal', type: 'Konsolidasi ke ERP' },
]

// --- FILTER & SEARCH STATES ---
const dateRange = ref('01 Aug 2026 - 21 Aug 2026')
const selectedType = ref('Semua')
const selectedOrigin = ref('Semua')
const selectedStatus = ref('Semua Status')
const searchQuery = ref('')
const selectedBatchFilter = ref('Semua Batch')

// --- MASTER DATA TRANSACTIONS LIST ---
interface TransactionItem {
  id: string
  refDoc: string
  type: string
  typeColor: string
  origin: string
  dest: string
  target: string
  volume: number
  status: string
  statusColor: string
  time: string
  aircraft: string
  missionId: string
  operator: string
  density: string
  temp: string
  batchCoa: string
  sealStatus: string
  syncStatus: string
  syncTime: string
  device: string
  connection: string
  syncId: string
  deltaP: string
  waterTest: string
  notes?: string
}

const transactions = ref<TransactionItem[]>([
  {
    id: 'TXN-20260821-00128',
    refDoc: 'PK-FAB / M-2026-081',
    type: 'DPPU/Hub -> Pesawat',
    typeColor: 'primary',
    origin: 'DPPU Wamena (WMX)',
    dest: 'PK-FAB',
    target: 'PK-FAB Mission M-2026-081',
    volume: 1250,
    status: 'Synced',
    statusColor: 'success',
    time: '21 Aug 2026 10:25',
    aircraft: 'PK-FAB',
    missionId: 'M-2026-081',
    operator: 'OP-004 (Yohanes)',
    density: '0.795 kg/L',
    temp: '28.2 °C',
    batchCoa: 'BATCH-210826-05',
    sealStatus: 'OK',
    syncStatus: 'Synced',
    syncTime: '21 Aug 2026 10:27',
    device: 'TAB-001 (Rugged)',
    connection: '4G LTE',
    syncId: 'SYNC-20260821-00071',
    deltaP: '12 PSI',
    waterTest: 'CLEAR (Free Water 0 ppm)',
    notes: 'Pengisian rutin penerbangan kargo logistik.'
  },
  {
    id: 'TXN-20260821-00127',
    refDoc: 'DRUM-00087',
    type: 'DPPU/Hub -> Drum 200L',
    typeColor: 'success',
    origin: 'DPPU Wamena (WMX)',
    dest: 'Drum DRUM-00087',
    target: 'Pengisian Drum 200L',
    volume: 200,
    status: 'Pending Sync',
    statusColor: 'warning',
    time: '21 Aug 2026 10:18',
    aircraft: '-',
    missionId: '-',
    operator: 'OP-002 (Budi)',
    density: '0.798 kg/L',
    temp: '27.8 °C',
    batchCoa: 'BATCH-210826-02',
    sealStatus: 'OK',
    syncStatus: 'Pending Sync',
    syncTime: '-',
    device: 'TAB-001 (Rugged)',
    connection: 'Offline Mode',
    syncId: '-',
    deltaP: '10 PSI',
    waterTest: 'CLEAR',
    notes: 'Persiapan stok drum untuk Airstrip Karubaga.'
  },
  {
    id: 'TXN-20260821-00126',
    refDoc: 'TRF-00045',
    type: 'Perpindahan Drum',
    typeColor: 'warning',
    origin: 'Sentani (DJJ)',
    dest: 'Airstrip Karubaga (KRG)',
    target: 'Transfer 5 Drum Avtur',
    volume: 1000,
    status: 'Synced',
    statusColor: 'success',
    time: '21 Aug 2026 09:45',
    aircraft: '-',
    missionId: 'TRF-WMX-DJJ-09',
    operator: 'OP-011 (Markus)',
    density: '0.796 kg/L',
    temp: '29.0 °C',
    batchCoa: 'BATCH-200826-11',
    sealStatus: 'Verified',
    syncStatus: 'Synced',
    syncTime: '21 Aug 2026 09:50',
    device: 'TAB-002',
    connection: 'Wi-Fi Hub',
    syncId: 'SYNC-20260821-00062',
    deltaP: 'N/A',
    waterTest: 'PASSED',
    notes: 'Angkutan udara via Cessna Caravan.'
  },
  {
    id: 'TXN-20260821-00125',
    refDoc: 'DRUM-00087 / PK-FTP',
    type: 'Drum -> Pesawat Perintis',
    typeColor: 'purple',
    origin: 'Sentani (DJJ)',
    dest: 'PK-FTP',
    target: 'PK-FTP Mission M-2026-082',
    volume: 180,
    status: 'In Progress',
    statusColor: 'info',
    time: '21 Aug 2026 09:32',
    aircraft: 'PK-FTP',
    missionId: 'M-2026-082',
    operator: 'OP-008 (Karel)',
    density: '0.794 kg/L',
    temp: '28.5 °C',
    batchCoa: 'BATCH-210826-01',
    sealStatus: 'OK',
    syncStatus: 'In Progress',
    syncTime: '-',
    device: 'TAB-002',
    connection: 'Wi-Fi Hub',
    syncId: '-',
    deltaP: '14 PSI',
    waterTest: 'CLEAR',
    notes: 'Refueling manual pompa hand-pump.'
  },
  {
    id: 'TXN-20260821-00124',
    refDoc: 'PK-FLR / DJJ-5621',
    type: 'DPPU/Hub -> Pesawat',
    typeColor: 'primary',
    origin: 'DPPU Sentani (DJJ)',
    dest: 'PK-FLR',
    target: 'PK-FLR Flight DJJ-5621',
    volume: 2400,
    status: 'Synced',
    statusColor: 'success',
    time: '21 Aug 2026 08:50',
    aircraft: 'PK-FLR',
    missionId: 'DJJ-5621',
    operator: 'OP-003 (Ahmad)',
    density: '0.797 kg/L',
    temp: '27.5 °C',
    batchCoa: 'BATCH-210826-03',
    sealStatus: 'OK',
    syncStatus: 'Synced',
    syncTime: '21 Aug 2026 08:53',
    device: 'TAB-002',
    connection: '4G LTE',
    syncId: 'SYNC-20260821-00041',
    deltaP: '11 PSI',
    waterTest: 'CLEAR',
    notes: 'Pengisian cepat jadwal reguler.'
  },
  {
    id: 'TXN-20260821-00123',
    refDoc: 'DRUM-00092',
    type: 'DPPU/Hub -> Drum 200L',
    typeColor: 'success',
    origin: 'DPPU Timika (TIM)',
    dest: 'Drum DRUM-00092',
    target: 'Pengisian Drum Refill',
    volume: 200,
    status: 'Pending Sync',
    statusColor: 'warning',
    time: '21 Aug 2026 08:15',
    aircraft: '-',
    missionId: '-',
    operator: 'OP-007 (Daniel)',
    density: '0.796 kg/L',
    temp: '28.0 °C',
    batchCoa: 'BATCH-210826-04',
    sealStatus: 'OK',
    syncStatus: 'Pending Sync',
    syncTime: '-',
    device: 'TAB-003',
    connection: 'VSAT Satellite',
    syncId: '-',
    deltaP: '13 PSI',
    waterTest: 'CLEAR',
    notes: 'Menunggu pemulihan koneksi satelit.'
  },
  {
    id: 'TXN-20260820-00098',
    refDoc: 'CONS-202608-001',
    type: 'Konsolidasi ke ERP',
    typeColor: 'teal',
    origin: 'Multi Station',
    dest: 'ERP System',
    target: 'Batch Sync Harian',
    volume: 45200,
    status: 'Synced',
    statusColor: 'success',
    time: '20 Aug 2026 23:10',
    aircraft: '-',
    missionId: 'CONS-0820',
    operator: 'SYSTEM (Auto)',
    density: '0.795 kg/L',
    temp: '15.0 °C (Std)',
    batchCoa: 'VARIOUS',
    sealStatus: 'N/A',
    syncStatus: 'Synced',
    syncTime: '20 Aug 2026 23:10',
    device: 'SERVER-HQ',
    connection: 'Fiber Direct',
    syncId: 'SYNC-20260820-00999',
    deltaP: 'N/A',
    waterTest: 'PASSED',
    notes: 'Posting jurnal stok harian otomatis.'
  },
  {
    id: 'TXN-20260820-00097',
    refDoc: 'TRF-00044',
    type: 'Perpindahan Drum',
    typeColor: 'warning',
    origin: 'Sentani (DJJ)',
    dest: 'Airstrip Illaga (ILX)',
    target: 'Transfer 2 Drum Avtur',
    volume: 400,
    status: 'Requires Review',
    statusColor: 'purple',
    time: '20 Aug 2026 15:12',
    aircraft: '-',
    missionId: 'TRF-DJJ-TIM-04',
    operator: 'OP-005 (Simon)',
    density: '0.801 kg/L',
    temp: '30.1 °C',
    batchCoa: 'BATCH-200826-08',
    sealStatus: 'Seal Mismatch',
    syncStatus: 'Requires Review',
    syncTime: '20 Aug 2026 15:20',
    device: 'TAB-003',
    connection: '4G LTE',
    syncId: 'SYNC-20260820-00412',
    deltaP: 'N/A',
    waterTest: 'SUSPECT',
    notes: 'Perlu verifikasi ulang nomor segel drum #2.'
  },
  {
    id: 'TXN-20260820-00096',
    refDoc: 'DRUM-00086 / PK-SNM',
    type: 'Drum -> Pesawat Perintis',
    typeColor: 'purple',
    origin: 'DPPU Timika (TIM)',
    dest: 'PK-SNM',
    target: 'PK-SNM Mission M-2026-079',
    volume: 190,
    status: 'Failed',
    statusColor: 'error',
    time: '20 Aug 2026 14:05',
    aircraft: 'PK-SNM',
    missionId: 'M-2026-079',
    operator: 'OP-009 (Lukas)',
    density: '0.794 kg/L',
    temp: '29.2 °C',
    batchCoa: 'BATCH-200826-03',
    sealStatus: 'Broken',
    syncStatus: 'Failed (Timeout)',
    syncTime: '-',
    device: 'TAB-003',
    connection: 'VSAT Satellite',
    syncId: '-',
    deltaP: '18 PSI (High)',
    waterTest: 'FAILED',
    notes: 'Terdeteksi endapan air saat pembacaan capsule.'
  },
  {
    id: 'TXN-20260820-00095',
    refDoc: 'PK-GAG / MKQ-3310',
    type: 'DPPU/Hub -> Pesawat',
    typeColor: 'primary',
    origin: 'DPPU Merauke (MKQ)',
    dest: 'PK-GAG',
    target: 'PK-GAG Mission M-2026-077',
    volume: 1850,
    status: 'Synced',
    statusColor: 'success',
    time: '20 Aug 2026 11:30',
    aircraft: 'PK-GAG',
    missionId: 'M-2026-077',
    operator: 'OP-012 (Hendra)',
    density: '0.796 kg/L',
    temp: '28.0 °C',
    batchCoa: 'BATCH-200826-01',
    sealStatus: 'OK',
    syncStatus: 'Synced',
    syncTime: '20 Aug 2026 11:34',
    device: 'TAB-006',
    connection: 'Wi-Fi Hub',
    syncId: 'SYNC-20260820-00210',
    deltaP: '10 PSI',
    waterTest: 'CLEAR',
    notes: 'Selesai tanpa kendala teknis.'
  },
  {
    id: 'TXN-20260819-00088',
    refDoc: 'PK-GHI / WMX-1092',
    type: 'DPPU/Hub -> Pesawat',
    typeColor: 'primary',
    origin: 'DPPU Wamena (WMX)',
    dest: 'PK-GHI',
    target: 'PK-GHI Flight WMX-1092',
    volume: 3100,
    status: 'Synced',
    statusColor: 'success',
    time: '19 Aug 2026 16:40',
    aircraft: 'PK-GHI',
    missionId: 'WMX-1092',
    operator: 'OP-004 (Yohanes)',
    density: '0.795 kg/L',
    temp: '27.0 °C',
    batchCoa: 'BATCH-190826-02',
    sealStatus: 'OK',
    syncStatus: 'Synced',
    syncTime: '19 Aug 2026 16:45',
    device: 'TAB-001 (Rugged)',
    connection: '4G LTE',
    syncId: 'SYNC-20260819-00102',
    deltaP: '11 PSI',
    waterTest: 'CLEAR',
    notes: 'Pengisian ekstra untuk penerbangan balik.'
  },
  {
    id: 'TXN-20260819-00087',
    refDoc: 'DRUM-00078 / PK-RNT',
    type: 'Drum -> Pesawat Perintis',
    typeColor: 'purple',
    origin: 'Airstrip Dekai (DEC)',
    dest: 'PK-RNT',
    target: 'PK-RNT Mission M-2026-068',
    volume: 200,
    status: 'Synced',
    statusColor: 'success',
    time: '19 Aug 2026 14:10',
    aircraft: 'PK-RNT',
    missionId: 'M-2026-068',
    operator: 'OP-015 (Sefnat)',
    density: '0.798 kg/L',
    temp: '29.5 °C',
    batchCoa: 'BATCH-180826-09',
    sealStatus: 'Verified',
    syncStatus: 'Synced',
    syncTime: '19 Aug 2026 14:18',
    device: 'TAB-008',
    connection: 'VSAT Satellite',
    syncId: 'SYNC-20260819-00088',
    deltaP: '12 PSI',
    waterTest: 'PASSED',
    notes: 'Pencatatan remote station Dekai.'
  }
])

// --- COMPUTED FILTERED TRANSACTIONS ---
const filteredTransactions = computed(() => {
  return transactions.value.filter(item => {
    const matchSearch = searchQuery.value === '' || 
      item.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.refDoc.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.aircraft.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.operator.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.batchCoa.toLowerCase().includes(searchQuery.value.toLowerCase())
      
    const matchType = selectedType.value === 'Semua' || item.type === selectedType.value
    const matchOrigin = selectedOrigin.value === 'Semua' || item.origin.includes(selectedOrigin.value)
    const matchStatus = selectedStatus.value === 'Semua Status' || item.status === selectedStatus.value
    const matchBatch = selectedBatchFilter.value === 'Semua Batch' || item.batchCoa === selectedBatchFilter.value

    return matchSearch && matchType && matchOrigin && matchStatus && matchBatch
  })
})

// --- PAGINATION STATE & LOGIC ---
const page = ref(1)
const itemsPerPage = ref(5)

const totalPages = computed(() => {
  return Math.ceil(filteredTransactions.value.length / itemsPerPage.value) || 1
})

const paginatedTransactions = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTransactions.value.slice(start, end)
})

watch([searchQuery, selectedType, selectedOrigin, selectedStatus, selectedBatchFilter], () => {
  page.value = 1
})

function resetFilters() {
  searchQuery.value = ''
  selectedType.value = 'Semua'
  selectedOrigin.value = 'Semua'
  selectedStatus.value = 'Semua Status'
  selectedBatchFilter.value = 'Semua Batch'
  notify('Semua filter berhasil direset.', 'info')
}

// --- METRICS & WORKFLOW INTERACTION HANDLERS ---
function handleMetricClick(metricId: string) {
  if (metricId === 'pending_sync') {
    activeTab.value = 4 // Transfer/Consolidation Tab
    notify('Beralih ke tab antrean sinkronisasi ERP.', 'info')
  } else if (metricId === 'in_progress') {
    selectedStatus.value = 'In Progress'
    notify('Menampilkan transaksi status In Progress.', 'info')
  } else if (metricId === 'erpsynced') {
    selectedStatus.value = 'Synced'
    notify('Menampilkan transaksi tersinkronisasi.', 'info')
  } else {
    resetFilters()
  }
}

function handleWorkflowClick(step: typeof workflowSteps[0]) {
  if (step.type === 'Konsolidasi ke ERP') {
    activeTab.value = 4
  } else {
    selectedType.value = step.type
    notify(`Filter diterapkan: ${step.type}`, 'info')
  }
}

// --- SELECTED DETAIL STATE & MODALS ---
const selectedTxn = ref<TransactionItem>(transactions.value[0])

function selectTransaction(item: TransactionItem) {
  selectedTxn.value = item
}

const showDetailModal = ref(false)
const showEditModal = ref(false)
const showDeleteDialog = ref(false)
const showSyncModal = ref(false)

function openDetailModal(item: TransactionItem) {
  selectedTxn.value = item
  showDetailModal.value = true
}

// --- EDIT TRANSACTION LOGIC ---
const editForm = reactive({
  id: '',
  refDoc: '',
  volume: 0,
  notes: '',
  status: ''
})

function openEditModal(item: TransactionItem) {
  selectedTxn.value = item
  editForm.id = item.id
  editForm.refDoc = item.refDoc
  editForm.volume = item.volume
  editForm.notes = item.notes || ''
  editForm.status = item.status
  showEditModal.value = true
}

function saveEditTransaction() {
  const index = transactions.value.findIndex(t => t.id === editForm.id)
  if (index !== -1) {
    transactions.value[index].refDoc = editForm.refDoc
    transactions.value[index].volume = Number(editForm.volume)
    transactions.value[index].notes = editForm.notes
    transactions.value[index].status = editForm.status
    if (editForm.status === 'Synced') {
      transactions.value[index].statusColor = 'success'
    } else if (editForm.status === 'Pending Sync') {
      transactions.value[index].statusColor = 'warning'
    } else if (editForm.status === 'Failed') {
      transactions.value[index].statusColor = 'error'
    }
    
    addAuditLog('UPDATE_TXN', `Memperbarui transaksi ${editForm.id} (Status: ${editForm.status})`)
    notify(`Transaksi ${editForm.id} berhasil diperbarui!`, 'success')
  }
  showEditModal.value = false
}

// --- DELETE TRANSACTION LOGIC ---
function confirmDelete(item: TransactionItem) {
  selectedTxn.value = item
  showDeleteDialog.value = true
}

function deleteTransaction() {
  const targetId = selectedTxn.value.id
  transactions.value = transactions.value.filter(t => t.id !== targetId)
  showDeleteDialog.value = false
  if (transactions.value.length > 0) {
    selectedTxn.value = transactions.value[0]
  }
  addAuditLog('DELETE_TXN', `Menghapus transaksi ${targetId} dari memori lokal`)
  notify(`Transaksi ${targetId} telah dihapus.`, 'error')
}

// --- FORM WIZARD STATE (TAB 2 - CREATE TRANSACTION) ---
const createStep = ref(1)
const newTxn = reactive({
  type: 'DPPU/Hub -> Pesawat',
  origin: 'DPPU Wamena (WMX)',
  aircraft: 'PK-FAB',
  missionId: 'M-2026-090',
  initialMeter: 125400,
  finalMeter: 126650,
  grossVolume: 1250,
  tempC: 28.0,
  observedDensity: 0.795,
  batchCoa: 'BATCH-210826-99',
  sealNo: 'SEAL-88912',
  deltaP: 11,
  waterCheck: 'PASSED (Clear)',
  operatorName: 'OP-004 (Yohanes)',
  pilotName: 'Capt. Alan',
  notes: 'Pengisian lancar, kaji kelayakan apron selesai.'
})

const calculatedDensity15C = computed(() => {
  if (!newTxn.observedDensity || !newTxn.tempC) return '0.7950'
  const tempDiff = newTxn.tempC - 15
  const corrected = newTxn.observedDensity + (tempDiff * 0.0007)
  return corrected.toFixed(4)
})

function submitNewTransaction() {
  const generatedId = `TXN-20260821-${Math.floor(10000 + Math.random() * 90000)}`
  const computedVol = newTxn.finalMeter - newTxn.initialMeter
  
  const newItem: TransactionItem = {
    id: generatedId,
    refDoc: `${newTxn.aircraft} / ${newTxn.missionId}`,
    type: newTxn.type,
    typeColor: newTxn.type.includes('Drum') ? 'purple' : 'primary',
    origin: newTxn.origin,
    dest: newTxn.aircraft,
    target: `${newTxn.aircraft} ${newTxn.missionId}`,
    volume: computedVol > 0 ? computedVol : 1000,
    status: 'Pending Sync',
    statusColor: 'warning',
    time: '21 Aug 2026 11:30',
    aircraft: newTxn.aircraft,
    missionId: newTxn.missionId,
    operator: newTxn.operatorName,
    density: `${newTxn.observedDensity} kg/L`,
    temp: `${newTxn.tempC} °C`,
    batchCoa: newTxn.batchCoa,
    sealStatus: 'OK',
    syncStatus: 'Pending Sync',
    syncTime: '-',
    device: 'TAB-001 (Rugged)',
    connection: 'Offline Queue',
    syncId: '-',
    deltaP: `${newTxn.deltaP} PSI`,
    waterTest: newTxn.waterCheck,
    notes: newTxn.notes
  }

  transactions.value.unshift(newItem)
  selectedTxn.value = newItem
  
  addAuditLog('CREATE_TXN', `Membuat transaksi baru ${generatedId}`)
  createStep.value = 1
  activeTab.value = 0
  notify(`Transaksi baru ${generatedId} berhasil dicatat & masuk antrean sync!`, 'success')
}

// --- DRUM HANDOVER STATE (TAB 3) ---
const drumTransfer = reactive({
  transferId: 'TRF-20260821-09',
  fromStation: 'DPPU Wamena (WMX)',
  toStation: 'Airstrip Karubaga (KRG)',
  drumCount: 4,
  transportMethod: 'Air Cargo (Cessna Caravan)',
  driverPilot: 'Capt. Herman',
  sealBarcodes: 'SEAL-8821, SEAL-8822, SEAL-8823, SEAL-8824'
})

const remoteStock = reactive([
  { id: 'krg', station: 'Karubaga (KRG)', fullDrums: 14, emptyDrums: 6, status: 'Aman', color: 'success' },
  { id: 'ilx', station: 'Illaga (ILX)', fullDrums: 3, emptyDrums: 12, status: 'Kritis', color: 'error' },
  { id: 'dec', station: 'Dekai (DEC)', fullDrums: 22, emptyDrums: 2, status: 'Aman', color: 'success' },
  { id: 'wmx', station: 'Wamena (WMX Hub)', fullDrums: 85, emptyDrums: 10, status: 'Melimpah', color: 'info' }
])

function createDrumTransfer() {
  if (drumTransfer.drumCount <= 0) {
    notify('Jumlah drum harus lebih dari 0!', 'warning')
    return
  }
  
  const targetStation = remoteStock.find(s => drumTransfer.toStation.includes(s.station.split(' ')[0]))
  if (targetStation) {
    targetStation.fullDrums += Number(drumTransfer.drumCount)
    if (targetStation.fullDrums > 5) targetStation.status = 'Aman'
  }

  const generatedTxnId = `TXN-TRF-${Math.floor(1000 + Math.random() * 9000)}`
  transactions.value.unshift({
    id: generatedTxnId,
    refDoc: drumTransfer.transferId,
    type: 'Perpindahan Drum',
    typeColor: 'warning',
    origin: drumTransfer.fromStation,
    dest: drumTransfer.toStation,
    target: `Mutasi ${drumTransfer.drumCount} Drum`,
    volume: drumTransfer.drumCount * 200,
    status: 'Pending Sync',
    statusColor: 'warning',
    time: '21 Aug 2026 11:45',
    aircraft: '-',
    missionId: drumTransfer.transferId,
    operator: drumTransfer.driverPilot,
    density: '0.796 kg/L',
    temp: '28.0 °C',
    batchCoa: 'BATCH-210826-TRF',
    sealStatus: 'Verified',
    syncStatus: 'Pending Sync',
    syncTime: '-',
    device: 'TAB-001 (Rugged)',
    connection: 'Offline Mode',
    syncId: '-',
    deltaP: 'N/A',
    waterTest: 'PASSED',
    notes: `Segel: ${drumTransfer.sealBarcodes}`
  })

  addAuditLog('TRANSFER_DRUM', `Manifest Mutasi ${drumTransfer.transferId} (${drumTransfer.drumCount} drum) diterbitkan`)
  notify(`Manifest Mutasi ${drumTransfer.transferId} dibuat! Stok ${drumTransfer.toStation} diperbarui.`, 'success')
  drumTransfer.drumCount = 4
  drumTransfer.transferId = `TRF-20260821-${Math.floor(10 + Math.random() * 90)}`
}

function quickStockReplenish(item: typeof remoteStock[0]) {
  item.fullDrums += 5
  item.emptyDrums = Math.max(0, item.emptyDrums - 5)
  if (item.fullDrums > 5) {
    item.status = 'Aman'
    item.color = 'success'
  }
  addAuditLog('REPLENISH_STOCK', `Pengiriman darurat 5 drum ke ${item.station}`)
  notify(`Pengiriman darurat 5 drum ke ${item.station} telah dicatat!`, 'info')
}

// --- ERP SYNC ACTIONS (TAB 4) ---
function triggerManualSync() {
  showSyncModal.value = true
  setTimeout(() => {
    let syncedCount = 0
    transactions.value.forEach(t => {
      if (t.status === 'Pending Sync' || t.status === 'In Progress' || t.status === 'Failed') {
        t.status = 'Synced'
        t.statusColor = 'success'
        t.syncStatus = 'Synced'
        t.syncTime = '21 Aug 2026 11:50'
        t.syncId = `SYNC-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`
        syncedCount++
      }
    })
    showSyncModal.value = false
    addAuditLog('SYNC_ERP', `SINKRONISASI ERP MANUAL: ${syncedCount} transaksi terunggah`)
    notify(`Berhasil mengunggah & sinkronisasi ${syncedCount} transaksi ke ERP HQ!`, 'success')
  }, 1200)
}

function retrySyncSingle(item: TransactionItem) {
  item.status = 'Synced'
  item.statusColor = 'success'
  item.syncStatus = 'Synced'
  item.syncTime = '21 Aug 2026 11:52'
  item.syncId = `SYNC-RETRY-${Math.floor(1000 + Math.random() * 9000)}`
  addAuditLog('SYNC_RETRY', `Retry sync berhasil untuk ${item.id}`)
  notify(`Transaksi ${item.id} berhasil disinkronkan ulang!`, 'success')
}

// --- REPORT & EXPORT HANDLERS (TAB 5) ---
function printReceipt(item: TransactionItem) {
  notify(`Mencetak nota refueling untuk ${item.id}...`, 'info')
  window.print()
}

function downloadReport(reportTitle: string, format: string) {
  const headers = ['ID Transaksi', 'Ref Doc', 'Tipe', 'Asal', 'Tujuan', 'Volume', 'Status', 'Waktu']
  const rows = filteredTransactions.value.map(t => [
    t.id,
    t.refDoc,
    t.type,
    t.origin,
    t.dest,
    t.volume,
    t.status,
    t.time
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(field => `"${field}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  const ext = format === 'xlsx' ? 'csv' : format
  const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${ext}`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  addAuditLog('EXPORT_REPORT', `Ekspor laporan ${reportTitle} (${format.toUpperCase()})`)
  notify(`File "${filename}" berhasil diunduh!`, 'success')
}
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">
    <!-- Breadcrumbs & Header -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3">
          Fuel Transactions (End-to-End Enterprise)
        </h1>
        <p class="text-caption text-grey-darken-1 mb-0">
          Pencatatan & pemantauan distribusi avtur dari DPPU/Hub, perpindahan drum perintis, hingga jurnal konsolidasi ERP.
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn color="purple" variant="tonal" prepend-icon="mdi-cloud-upload-outline" class="text-none" @click="triggerManualSync">
          Sync Queue ERP ({{ transactions.filter((t: any) => t.status === 'Pending Sync').length }})
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" class="text-none" @click="activeTab = 2">
          Transaksi Baru
        </v-btn>
      </div>
    </div>
    <AvturTopNav/>
    <!-- Category Tabs Navigation -->
    <v-card variant="flat" class="border rounded-lg bg-white mb-6 overflow-hidden">
      <v-tabs v-model="activeTab" color="primary" class="border-b">
        <v-tab v-for="(tab, i) in tabs" :key="i" :value="i" class="text-capitalize font-weight-medium text-body-2">
          <v-icon :icon="tab.icon" class="mr-2" size="small" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- TAB WINDOWS -->
    <v-window v-model="activeTab">
      
      <!-- TAB 0: DASHBOARD & QUICK LIST -->
      <v-window-item :value="0">
        <!-- Top Metrics Row (Interactive) -->
        <v-row class="mb-6">
          <v-col v-for="m in metrics" :key="m.id" cols="12" sm="6" md="2">
            <v-card 
              variant="flat" 
              class="border rounded-lg pa-4 bg-white h-100 style-clickable-card"
              @click="handleMetricClick(m.id)"
            >
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption font-weight-bold text-grey-darken-1">{{ m.title }}</span>
                <v-avatar :color="m.color" variant="tonal" size="32">
                  <v-icon :icon="m.icon" size="18" />
                </v-avatar>
              </div>
              <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">{{ m.count }}</div>
              <div v-if="m.unit" class="text-caption text-grey-darken-1">{{ m.unit }}</div>
              <div v-if="m.sub" class="text-caption text-success font-weight-medium mt-1">{{ m.sub }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Workflow Diagram (Interactive) -->
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">Alur Operasional Pengisian Avtur</div>
          <div class="d-flex align-center justify-space-between flex-wrap gap-4 px-2 py-2">
            <template v-for="(s, index) in workflowSteps" :key="s.step">
              <div 
                class="d-flex flex-column align-center text-center style-step-card pa-3 border rounded-lg bg-grey-lighten-5 style-clickable-card"
                @click="handleWorkflowClick(s)"
              >
                <v-avatar :color="s.color" variant="flat" size="32" class="mb-2 text-caption font-weight-bold text-white">
                  {{ s.step }}
                </v-avatar>
                <div class="font-weight-bold text-body-2 mb-1">{{ s.title }}</div>
                <div class="text-caption text-grey-darken-1 style-step-desc">{{ s.desc }}</div>
              </div>
              <v-icon v-if="Number(index) < workflowSteps.length - 1" icon="mdi-arrow-right" color="grey" class="d-none d-md-block" />
            </template>
          </div>
        </v-card>

        <!-- Main Workspace: Table + Side Drawer Detail -->
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
              <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Pencatatan Transaksi Terbaru
                </div>
                <v-chip size="small" color="primary" variant="tonal">
                  Total: {{ filteredTransactions.length }} Item
                </v-chip>
              </div>

              <!-- Quick Filter Bar -->
              <v-row density="compact" class="mb-4">
                <v-col cols="12" sm="4">
                  <v-text-field v-model="searchQuery" placeholder="Cari ID / Ref / Pesawat / Op" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="selectedType" :items="['Semua', 'DPPU/Hub -> Pesawat', 'DPPU/Hub -> Drum 200L', 'Perpindahan Drum', 'Drum -> Pesawat Perintis']" label="Tipe" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="selectedStatus" :items="['Semua Status', 'Synced', 'Pending Sync', 'In Progress', 'Requires Review', 'Failed']" label="Status" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="2">
                  <v-btn color="grey-lighten-3" variant="flat" block class="text-none" @click="resetFilters">Reset</v-btn>
                </v-col>
              </v-row>

              <!-- Table Data -->
              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID Transaksi</th>
                    <th class="font-weight-bold text-caption">Tipe</th>
                    <th class="font-weight-bold text-caption">Asal -> Tujuan</th>
                    <th class="font-weight-bold text-caption">Vol (L)</th>
                    <th class="font-weight-bold text-caption">Status</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in paginatedTransactions"
                    :key="item.id"
                    :class="{ 'bg-blue-lighten-5': selectedTxn.id === item.id }"
                    style="cursor: pointer;"
                    @click="selectTransaction(item)"
                  >
                    <td>
                      <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                      <div class="text-caption text-grey">{{ item.refDoc }}</div>
                    </td>
                    <td>
                      <v-chip size="x-small" :color="item.typeColor" variant="tonal" class="font-weight-medium">
                        {{ item.type }}
                      </v-chip>
                    </td>
                    <td class="text-body-2">{{ item.origin }} → {{ item.dest }}</td>
                    <td class="text-body-2 font-weight-bold">{{ item.volume.toLocaleString() }}</td>
                    <td>
                      <v-chip size="x-small" :color="item.statusColor" variant="tonal" class="font-weight-medium">
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn icon="mdi-eye-outline" variant="text" size="small" color="grey-darken-1" title="Lihat Detail" @click.stop="openDetailModal(item)" />
                      <v-btn icon="mdi-pencil-outline" variant="text" size="small" color="blue" title="Edit Transaksi" @click.stop="openEditModal(item)" />
                      <v-btn icon="mdi-trash-can-outline" variant="text" size="small" color="red" title="Hapus Data Mockup" @click.stop="confirmDelete(item)" />
                    </td>
                  </tr>
                  <tr v-if="filteredTransactions.length === 0">
                    <td colspan="6" class="text-center py-6 text-grey">
                      Tidak ada transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                </tbody>
              </v-table>
              
              <!-- Dashboard Table Pagination -->
              <div class="d-flex align-center justify-space-between mt-3 flex-wrap gap-2">
                <span class="text-caption text-grey-darken-1">Menampilkan {{ paginatedTransactions.length }} dari {{ filteredTransactions.length }} data</span>
                <v-pagination v-model="page" :length="totalPages" density="compact" />
              </div>
            </v-card>
          </v-col>

          <!-- Right Side Detail Drawer Panel -->
          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 d-flex flex-column justify-space-between">
              <div>
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">{{ selectedTxn.id }}</span>
                  <v-chip size="x-small" :color="selectedTxn.statusColor" variant="tonal" class="font-weight-bold">
                    {{ selectedTxn.status }}
                  </v-chip>
                </div>
                <v-chip size="small" :color="selectedTxn.typeColor" variant="outlined" class="mb-4">
                  {{ selectedTxn.type }}
                </v-chip>

                <v-divider class="mb-4" />

                <!-- Detail Section 1 -->
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3">Informasi Penerbangan & Operator</div>
                <div class="d-flex flex-column gap-2 text-caption mb-4">
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Waktu Transaksi</span><span class="font-weight-medium">{{ selectedTxn.time }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Lokasi Asal</span><span class="font-weight-medium">{{ selectedTxn.origin }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Tujuan / Target</span><span class="font-weight-medium">{{ selectedTxn.dest }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Pesawat</span><span class="font-weight-medium">{{ selectedTxn.aircraft }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Mission / Flight No</span><span class="font-weight-medium">{{ selectedTxn.missionId }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Operator Refueler</span><span class="font-weight-medium">{{ selectedTxn.operator }}</span></div>
                </div>

                <!-- Detail Section 2 -->
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3">Kuantitas & Pengujian Kualitas</div>
                <div class="d-flex flex-column gap-2 text-caption mb-4">
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Total Volume Transaksi</span><span class="font-weight-bold text-body-2 text-primary">{{ selectedTxn.volume.toLocaleString() }} Liter</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Density Observed</span><span class="font-weight-medium">{{ selectedTxn.density }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Suhu BBM (Temp)</span><span class="font-weight-medium">{{ selectedTxn.temp }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Filter Delta P</span><span class="font-weight-medium">{{ selectedTxn.deltaP }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Uji Kandungan Air</span><span class="font-weight-bold text-success">{{ selectedTxn.waterTest }}</span></div>
                </div>

                <!-- Detail Section 3 -->
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3">Integritas & Audit Offline</div>
                <div class="d-flex flex-column gap-2 text-caption mb-6">
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">No. Batch / CoA Avtur</span><span class="font-weight-medium">{{ selectedTxn.batchCoa }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Verifikasi Segel</span><span class="font-weight-bold text-success">{{ selectedTxn.sealStatus }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Perangkat Terminal</span><span class="font-weight-medium">{{ selectedTxn.device }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">Koneksi Saat Input</span><span class="font-weight-medium">{{ selectedTxn.connection }}</span></div>
                  <div class="d-flex justify-space-between"><span class="text-grey-darken-1">ID Sync ERP</span><span class="font-weight-medium">{{ selectedTxn.syncId }}</span></div>
                </div>
              </div>

              <!-- Drawer Action Buttons -->
              <div class="d-flex flex-column gap-2">
                <div class="d-flex gap-2">
                  <v-btn variant="tonal" color="blue" block class="text-none" prepend-icon="mdi-pencil-outline" @click="openEditModal(selectedTxn)">
                    Edit
                  </v-btn>
                  <v-btn variant="tonal" color="red" block class="text-none" prepend-icon="mdi-trash-can-outline" @click="confirmDelete(selectedTxn)">
                    Hapus
                  </v-btn>
                </div>
                <v-btn variant="outlined" color="primary" block prepend-icon="mdi-printer" class="text-none" @click="printReceipt(selectedTxn)">
                  Cetak Nota Refueling
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 1: TRANSACTIONS LIST FULL TABLE VIEW -->
      <v-window-item :value="1">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Tabel Master Seluruh Transaksi Avtur</div>
              <p class="text-caption text-grey-darken-1 mb-0">Eksplorasi data transaksi dengan filter multidimensi dan ekspor laporan.</p>
            </div>
            <div class="d-flex gap-2">
              <v-btn variant="outlined" color="grey-darken-2" prepend-icon="mdi-file-excel" class="text-none" @click="downloadReport('Master Transaksi Avtur', 'xlsx')">Export Excel</v-btn>
              <v-btn variant="outlined" color="grey-darken-2" prepend-icon="mdi-file-pdf-box" class="text-none" @click="downloadReport('Master Transaksi Avtur', 'pdf')">Export PDF</v-btn>
            </div>
          </div>

          <!-- Extended Filter Bar -->
          <v-row density="compact" class="mb-4">
            <v-col cols="12" sm="3">
              <v-text-field v-model="dateRange" label="Rentang Tanggal" prepend-inner-icon="mdi-calendar" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="12" sm="2">
              <v-select v-model="selectedOrigin" :items="['Semua', 'DPPU Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)', 'DPPU Merauke (MKQ)']" label="Station Asal" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="12" sm="3">
              <v-select v-model="selectedType" :items="['Semua', 'DPPU/Hub -> Pesawat', 'DPPU/Hub -> Drum 200L', 'Perpindahan Drum', 'Drum -> Pesawat Perintis', 'Konsolidasi ke ERP']" label="Tipe Transaksi" variant="outlined" density="compact" hide-details />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="searchQuery" label="Pencarian Bebas" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
            </v-col>
            <v-col cols="12" sm="2">
              <v-btn color="grey-lighten-3" variant="flat" block class="text-none" @click="resetFilters">Reset Filter</v-btn>
            </v-col>
          </v-row>

          <!-- Datatable -->
          <v-table density="comfortable" class="border rounded mb-4">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">Waktu</th>
                <th class="font-weight-bold text-caption">ID Transaksi / Ref</th>
                <th class="font-weight-bold text-caption">Tipe Transaksi</th>
                <th class="font-weight-bold text-caption">Asal & Tujuan</th>
                <th class="font-weight-bold text-caption">Refueler / Op</th>
                <th class="font-weight-bold text-caption">Batch / CoA</th>
                <th class="font-weight-bold text-caption">Volume</th>
                <th class="font-weight-bold text-caption">Status Sync</th>
                <th class="font-weight-bold text-caption text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedTransactions" :key="item.id">
                <td class="text-caption">{{ item.time }}</td>
                <td>
                  <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                  <div class="text-caption text-grey">{{ item.refDoc }}</div>
                </td>
                <td><v-chip size="x-small" :color="item.typeColor" variant="tonal">{{ item.type }}</v-chip></td>
                <td class="text-body-2">{{ item.origin }} → {{ item.dest }}</td>
                <td class="text-caption">{{ item.operator }}</td>
                <td class="text-caption font-weight-mono">{{ item.batchCoa }}</td>
                <td class="text-body-2 font-weight-bold">{{ item.volume.toLocaleString() }} L</td>
                <td><v-chip size="x-small" :color="item.statusColor" variant="tonal">{{ item.status }}</v-chip></td>
                <td class="text-center">
                  <v-btn icon="mdi-eye" variant="text" size="small" title="Lihat Detail" @click="openDetailModal(item)" />
                  <v-btn icon="mdi-pencil" variant="text" size="small" color="blue" title="Edit" @click="openEditModal(item)" />
                  <v-btn icon="mdi-trash-can" variant="text" size="small" color="red" title="Hapus" @click="confirmDelete(item)" />
                </td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="9" class="text-center py-6 text-grey">
                  Tidak ada transaksi yang ditemukan.
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Table Pagination -->
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span class="text-caption text-grey-darken-1">Menampilkan {{ paginatedTransactions.length }} dari {{ filteredTransactions.length }} total data</span>
            <v-pagination v-model="page" :length="totalPages" density="compact" />
          </div>
        </v-card>
      </v-window-item>

      <!-- TAB 2: CREATE TRANSACTION (MULTI-STEP WIZARD) -->
      <v-window-item :value="2">
        <v-card variant="flat" class="border rounded-lg pa-6 bg-white">
          <div class="text-subtitle-1 font-weight-bold mb-1 text-grey-darken-3">Input Transaksi Pengisian Avtur Baru</div>
          <p class="text-caption text-grey-darken-1 mb-6">Isi formulir 4 langkah pencatatan volume meter, pengujian mutu, dan tanda tangan digital.</p>

          <!-- Stepper Indicator Header (Interactive) -->
          <div class="d-flex align-center justify-space-between mb-8 px-4 flex-wrap gap-2">
            <div 
              :class="['d-flex align-center gap-2 style-clickable-card pa-1 rounded', createStep >= 1 ? 'text-primary font-weight-bold' : 'text-grey']"
              @click="createStep = 1"
            >
              <v-avatar :color="createStep >= 1 ? 'primary' : 'grey-lighten-2'" size="28" class="text-caption">1</v-avatar>
              <span>Informasi Penerbangan</span>
            </div>
            <v-divider class="mx-2" />
            <div 
              :class="['d-flex align-center gap-2 style-clickable-card pa-1 rounded', createStep >= 2 ? 'text-primary font-weight-bold' : 'text-grey']"
              @click="createStep = 2"
            >
              <v-avatar :color="createStep >= 2 ? 'primary' : 'grey-lighten-2'" size="28" class="text-caption">2</v-avatar>
              <span>Metering & Densitas</span>
            </div>
            <v-divider class="mx-2" />
            <div 
              :class="['d-flex align-center gap-2 style-clickable-card pa-1 rounded', createStep >= 3 ? 'text-primary font-weight-bold' : 'text-grey']"
              @click="createStep = 3"
            >
              <v-avatar :color="createStep >= 3 ? 'primary' : 'grey-lighten-2'" size="28" class="text-caption">3</v-avatar>
              <span>Quality Control & Segel</span>
            </div>
            <v-divider class="mx-2" />
            <div 
              :class="['d-flex align-center gap-2 style-clickable-card pa-1 rounded', createStep >= 4 ? 'text-primary font-weight-bold' : 'text-grey']"
              @click="createStep = 4"
            >
              <v-avatar :color="createStep >= 4 ? 'primary' : 'grey-lighten-2'" size="28" class="text-caption">4</v-avatar>
              <span>Konfirmasi & Simpan</span>
            </div>
          </div>

          <!-- STEP 1: Flight & Header -->
          <div v-if="createStep === 1" style="max-width: 700px;" class="mx-auto">
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-select v-model="newTxn.type" label="Tipe Transaksi" :items="['DPPU/Hub -> Pesawat', 'DPPU/Hub -> Drum 200L', 'Perpindahan Drum', 'Drum -> Pesawat Perintis']" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="newTxn.origin" label="Fasilitas / Station Asal" :items="['DPPU Wamena (WMX)', 'DPPU Sentani (DJJ)', 'DPPU Timika (TIM)', 'DPPU Merauke (MKQ)']" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.aircraft" label="Registrasi Pesawat (Tail No)" placeholder="Contoh: PK-FAB" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.missionId" label="Nomor Misi / Flight ID" placeholder="Contoh: M-2026-090" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" class="text-none" @click="createStep = 2">Lanjut ke Metering →</v-btn>
            </div>
          </div>

          <!-- STEP 2: Metering & Density -->
          <div v-if="createStep === 2" style="max-width: 700px;" class="mx-auto">
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="newTxn.initialMeter" label="Flowmeter Awal (Liter)" type="number" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="newTxn.finalMeter" label="Flowmeter Akhir (Liter)" type="number" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field :model-value="newTxn.finalMeter - newTxn.initialMeter" label="Volume Gross Calculated" suffix="Liter" readonly variant="filled" density="compact" class="font-weight-bold" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="newTxn.tempC" label="Suhu Avtur (°C)" type="number" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="newTxn.observedDensity" label="Observed Density (kg/L)" type="number" step="0.001" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <v-alert type="info" variant="tonal" class="mt-2 text-caption">
              Kalkulasi Standar ASTM D1250: Density pada 15°C diperkirakan = <strong>{{ calculatedDensity15C }} kg/L</strong> (Memenuhi syarat aman penerbangan: 0.775 - 0.840 kg/L).
            </v-alert>
            <div class="d-flex justify-space-between mt-4">
              <v-btn variant="outlined" @click="createStep = 1">← Kembali</v-btn>
              <v-btn color="primary" class="text-none" @click="createStep = 3">Lanjut ke QC & Segel →</v-btn>
            </div>
          </div>

          <!-- STEP 3: Quality Control -->
          <div v-if="createStep === 3" style="max-width: 700px;" class="mx-auto">
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.batchCoa" label="No. Batch / Certificate of Analysis (CoA)" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.sealNo" label="Nomor Barcode Segel Tanki/Drum" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="newTxn.deltaP" label="Filter Differential Pressure (Delta P)" suffix="PSI" type="number" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="newTxn.waterCheck" label="Hasil Uji Water Detector (Shell Capsule)" :items="['PASSED (Clear / No Water)', 'FAILED (Free Water Detected)', 'SUSPECT (Re-test Required)']" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <div class="d-flex justify-space-between mt-4">
              <v-btn variant="outlined" @click="createStep = 2">← Kembali</v-btn>
              <v-btn color="primary" class="text-none" @click="createStep = 4">Lanjut ke Konfirmasi →</v-btn>
            </div>
          </div>

          <!-- STEP 4: Confirmation & Signatures -->
          <div v-if="createStep === 4" style="max-width: 700px;" class="mx-auto">
            <v-card variant="outlined" class="pa-4 mb-4 bg-grey-lighten-5">
              <div class="text-subtitle-2 font-weight-bold mb-2">Ringkasan Transaksi Siap Simpan</div>
              <div class="text-caption d-flex flex-column gap-1">
                <div><strong>Tipe:</strong> {{ newTxn.type }} ({{ newTxn.origin }} → {{ newTxn.aircraft }})</div>
                <div><strong>Total Volume:</strong> {{ newTxn.finalMeter - newTxn.initialMeter }} Liter</div>
                <div><strong>Densitas @15°C:</strong> {{ calculatedDensity15C }} kg/L | <strong>QC Water Test:</strong> {{ newTxn.waterCheck }}</div>
                <div><strong>CoA Batch:</strong> {{ newTxn.batchCoa }} | <strong>Segel:</strong> {{ newTxn.sealNo }}</div>
              </div>
            </v-card>
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.operatorName" label="Nama Operator Refueler" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTxn.pilotName" label="Nama Pilot / Flight Engineer" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="newTxn.notes" label="Catatan Tambahan Lapangan" rows="2" variant="outlined" density="compact" />
              </v-col>
            </v-row>
            <div class="d-flex justify-space-between mt-4">
              <v-btn variant="outlined" @click="createStep = 3">← Kembali</v-btn>
              <v-btn color="success" class="text-none font-weight-bold" prepend-icon="mdi-check-circle" @click="submitNewTransaction">
                Simpan & Rekam Transaksi
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-window-item>

      <!-- TAB 3: TRANSFER / HANDOVER DRUM -->
      <v-window-item :value="3">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="text-subtitle-1 font-weight-bold mb-2 text-grey-darken-3">Pengiriman & Mutasi Drum Avtur (200 Liter)</div>
          <p class="text-caption text-grey-darken-1 mb-4">Kelola rantai pasok drum avtur menuju bandara perintis pedalaman.</p>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4 rounded-lg">
                <div class="text-subtitle-2 font-weight-bold mb-3 text-primary">Formulir Surat Jalan Transfer Drum</div>
                <v-row density="compact">
                  <v-col cols="12" sm="6">
                    <v-text-field v-model="drumTransfer.transferId" label="No. Surat Jalan / Manifest" readonly density="compact" variant="filled" />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field v-model.number="drumTransfer.drumCount" label="Jumlah Drum 200L" type="number" density="compact" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-select v-model="drumTransfer.fromStation" label="Station Asal" :items="['DPPU Wamena (WMX)', 'DPPU Sentani (DJJ)', 'DPPU Timika (TIM)']" density="compact" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-select v-model="drumTransfer.toStation" label="Airstrip Tujuan" :items="['Airstrip Karubaga (KRG)', 'Airstrip Illaga (ILX)', 'Airstrip Dekai (DEC)']" density="compact" variant="outlined" />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field v-model="drumTransfer.sealBarcodes" label="Barcode Segel Drum (Pisahkan koma)" density="compact" variant="outlined" />
                  </v-col>
                  <v-col cols="12">
                    <v-btn color="warning" block class="text-none font-weight-bold" prepend-icon="mdi-truck-check" @click="createDrumTransfer">
                      Terbitkan Manifest Mutasi Drum
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-4 rounded-lg h-100">
                <div class="text-subtitle-2 font-weight-bold mb-3">Status Inventori Drum di Station Remote</div>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-caption font-weight-bold">Lokasi Station</th>
                      <th class="text-caption font-weight-bold">Stok Full (Drum)</th>
                      <th class="text-caption font-weight-bold">Kosong</th>
                      <th class="text-caption font-weight-bold">Status Pasokan</th>
                      <th class="text-caption font-weight-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stk in remoteStock" :key="stk.id">
                      <td class="font-weight-medium text-body-2">{{ stk.station }}</td>
                      <td class="font-weight-bold text-primary">{{ stk.fullDrums }} Drum ({{ (stk.fullDrums * 200).toLocaleString() }}L)</td>
                      <td class="text-grey">{{ stk.emptyDrums }} Drum</td>
                      <td><v-chip size="x-small" :color="stk.color">{{ stk.status }}</v-chip></td>
                      <td class="text-center">
                        <v-btn size="x-small" color="primary" variant="tonal" class="text-none" title="Tambah stok darurat" @click="quickStockReplenish(stk)">+ Stok</v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- TAB 4: CONSOLIDATION TO ERP QUEUE -->
      <v-window-item :value="4">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Monitoring Sinkronisasi Store-and-Forward (ERP)</div>
              <p class="text-caption text-grey-darken-1 mb-0">Antrean pencatatan transaksi offline yang menunggu koneksi internet terhubung untuk push ke ERP HQ.</p>
            </div>
            <v-btn color="primary" prepend-icon="mdi-sync" class="text-none" @click="triggerManualSync">Paksa Sinkronisasi Sekarang</v-btn>
          </div>

          <v-alert type="warning" variant="tonal" icon="mdi-cloud-off-outline" class="mb-4 text-caption">
            Terdapat <strong>{{ transactions.filter((t: any) => t.status === 'Pending Sync').length }} transaksi</strong> tersimpan secara offline di tablet lokal Wamena/Timika karena sinyal terputus.
          </v-alert>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Transaksi</th>
                <th class="font-weight-bold text-caption">Waktu Rekam Lokal</th>
                <th class="font-weight-bold text-caption">Perangkat</th>
                <th class="font-weight-bold text-caption">Status Queue</th>
                <th class="font-weight-bold text-caption">Koneksi</th>
                <th class="font-weight-bold text-caption text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in transactions.filter((t: any) => t.status === 'Pending Sync' || t.status === 'Failed' || t.status === 'In Progress')" :key="item.id">
                <td class="font-weight-bold">
                  <div>{{ item.id }}</div>
                  <div class="text-caption text-grey">{{ item.refDoc }}</div>
                </td>
                <td class="text-caption">{{ item.time }}</td>
                <td class="text-caption">{{ item.device }}</td>
                <td><v-chip size="x-small" :color="item.statusColor">{{ item.status }}</v-chip></td>
                <td class="text-caption">{{ item.connection }}</td>
                <td class="text-center">
                  <v-btn size="x-small" color="primary" variant="tonal" class="text-none" @click="retrySyncSingle(item)">Retry Push</v-btn>
                </td>
              </tr>
              <tr v-if="transactions.filter((t: any) => t.status === 'Pending Sync' || t.status === 'Failed' || t.status === 'In Progress').length === 0">
                <td colspan="6" class="text-center py-6 text-success font-weight-bold">
                  Semua transaksi telah tersinkronisasi sempurna ke database ERP HQ.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 5: REPORTS & AUDIT TRAIL -->
      <v-window-item :value="5">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="text-subtitle-1 font-weight-bold mb-2 text-grey-darken-3">Laporan Rekonsiliasi & Audit Trail</div>
          <p class="text-caption text-grey-darken-1 mb-6">Jejak log aktivitas sistem, modifikasi data, dan rekonsiliasi variansi stok avtur.</p>

          <v-row class="mb-6">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-4 rounded-lg text-center">
                <v-icon icon="mdi-file-pdf-box" size="40" color="red" class="mb-2" />
                <div class="font-weight-bold text-body-2">Laporan Refueling Harian</div>
                <div class="text-caption text-grey mb-3">Format resmi kementerian penerbangan</div>
                <v-btn size="small" color="primary" variant="outlined" block class="text-none" @click="downloadReport('Laporan Refueling Harian', 'pdf')">Unduh PDF</v-btn>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-4 rounded-lg text-center">
                <v-icon icon="mdi-file-excel-box" size="40" color="green" class="mb-2" />
                <div class="font-weight-bold text-body-2">Rekonsiliasi Variansi Stok</div>
                <div class="text-caption text-grey mb-3">Selisih meter vs aktual drum</div>
                <v-btn size="small" color="primary" variant="outlined" block class="text-none" @click="downloadReport('Rekonsiliasi Variansi Stok', 'xlsx')">Unduh Excel</v-btn>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-4 rounded-lg text-center">
                <v-icon icon="mdi-shield-check-outline" size="40" color="purple" class="mb-2" />
                <div class="font-weight-bold text-body-2">Log Audit Segel & QC</div>
                <div class="text-caption text-grey mb-3">Jejak verifikasi segel rusak</div>
                <v-btn size="small" color="primary" variant="outlined" block class="text-none" @click="downloadReport('Log Audit Segel & QC', 'csv')">Cetak Audit Log</v-btn>
              </v-card>
            </v-col>
          </v-row>

          <div class="text-subtitle-2 font-weight-bold mb-3">Catatan Audit Trail Aktivitas Terbaru</div>
          <v-table density="compact" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="text-caption font-weight-bold">Waktu</th>
                <th class="text-caption font-weight-bold">Pengguna / System</th>
                <th class="text-caption font-weight-bold">Aksi</th>
                <th class="text-caption font-weight-bold">Rincian Log</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, idx) in auditLogs" :key="idx">
                <td class="text-caption">{{ log.time }}</td>
                <td class="font-weight-medium text-caption">{{ log.user }}</td>
                <td><v-chip size="x-small" color="primary" variant="tonal">{{ log.action }}</v-chip></td>
                <td class="text-caption">{{ log.detail }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

    </v-window>

    <!-- MODAL DIALOG: DETAIL NOTA TRANSAKSI -->
    <v-dialog v-model="showDetailModal" max-width="600">
      <v-card class="pa-5 rounded-lg">
        <div class="d-flex align-center justify-space-between mb-4 border-b pb-3">
          <div>
            <div class="text-h6 font-weight-bold">Nota Pengisian Bahan Bakar (Avtur)</div>
            <div class="text-caption text-grey">Nomor Ref: {{ selectedTxn.id }}</div>
          </div>
          <v-chip size="small" :color="selectedTxn.statusColor">{{ selectedTxn.status }}</v-chip>
        </div>

        <div class="text-caption d-flex flex-column gap-2 mb-4">
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Tanggal & Waktu</span><strong>{{ selectedTxn.time }}</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Stasiun Asal</span><strong>{{ selectedTxn.origin }}</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Registrasi Pesawat / Mission</span><strong>{{ selectedTxn.aircraft }} ({{ selectedTxn.missionId }})</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Volume Avtur Dituangkan</span><strong class="text-subtitle-1 text-primary">{{ selectedTxn.volume.toLocaleString() }} Liter</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Massa Jenis / Temp</span><strong>{{ selectedTxn.density }} / {{ selectedTxn.temp }}</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>No. Batch CoA / Segel</span><strong>{{ selectedTxn.batchCoa }} (Segel: {{ selectedTxn.sealStatus }})</strong>
          </div>
          <div class="d-flex justify-space-between border-b pb-1">
            <span>Operator Refueler</span><strong>{{ selectedTxn.operator }}</strong>
          </div>
        </div>

        <div class="d-flex justify-end gap-2 mt-2">
          <v-btn variant="outlined" class="text-none" @click="showDetailModal = false">Tutup</v-btn>
          <v-btn color="primary" prepend-icon="mdi-printer" class="text-none" @click="printReceipt(selectedTxn); showDetailModal = false">Cetak Struk</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- MODAL DIALOG: EDIT TRANSAKSI -->
    <v-dialog v-model="showEditModal" max-width="500">
      <v-card class="pa-5 rounded-lg">
        <div class="text-h6 font-weight-bold mb-3">Edit Transaksi ({{ editForm.id }})</div>
        <v-row density="compact">
          <v-col cols="12">
            <v-text-field v-model="editForm.refDoc" label="Ref Document" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model.number="editForm.volume" label="Volume (Liter)" type="number" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="12">
            <v-select v-model="editForm.status" label="Status Sync" :items="['Synced', 'Pending Sync', 'In Progress', 'Requires Review', 'Failed']" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="editForm.notes" label="Catatan Tambahan" rows="2" variant="outlined" density="compact" />
          </v-col>
        </v-row>
        <div class="d-flex justify-end gap-2 mt-3">
          <v-btn variant="outlined" class="text-none" @click="showEditModal = false">Batal</v-btn>
          <v-btn color="primary" class="text-none" @click="saveEditTransaction">Simpan Perubahan</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- MODAL DIALOG: CONFIRM DELETE -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card class="pa-5 rounded-lg">
        <div class="text-h6 font-weight-bold mb-2 text-error">Hapus Transaksi?</div>
        <p class="text-caption text-grey-darken-1 mb-4">
          Apakah kamu yakin ingin menghapus transaksi <strong>{{ selectedTxn.id }}</strong>? Tindakan ini hanya menghapus dari memori lokal mockup.
        </p>
        <div class="d-flex justify-end gap-2">
          <v-btn variant="outlined" class="text-none" @click="showDeleteDialog = false">Batal</v-btn>
          <v-btn color="error" class="text-none" @click="deleteTransaction">Hapus Data</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- MODAL DIALOG: MANUAL SYNC INDICATOR -->
    <v-dialog v-model="showSyncModal" persistent max-width="350">
      <v-card class="pa-5 text-center rounded-lg">
        <v-progress-circular indeterminate color="primary" size="50" class="mb-3 mx-auto" />
        <div class="font-weight-bold text-body-1">Menghubungkan ke Server ERP...</div>
        <div class="text-caption text-grey mt-1">Mengunggah antrean transaksi offline lokal.</div>
      </v-card>
    </v-dialog>

    <!-- GLOBAL SNACKBAR NOTIFICATION -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn color="white" variant="text" size="small" @click="snackbar = false">Tutup</v-btn>
      </template>
    </v-snackbar>

  </div>
</template>

<style scoped>
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.min-vh-100 { min-height: 100vh; }
.style-step-card {
  flex: 1;
  min-width: 160px;
}
.style-step-desc {
  font-size: 11px;
  line-height: 1.3;
}
.font-weight-mono {
  font-family: monospace;
}
.style-clickable-card {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.style-clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}
</style>