<script setup lang="ts">
//import { ref, computed, reactive } from 'vue'

/* ========================================================================== */
/* TypeScript Interfaces & Types                                             */
/* ========================================================================== */

export type StockStatus = 'Normal' | 'Ready for Transit' | 'In Use' | 'In-Transit' | 'Low Stock' | 'Quarantined'
export type SyncStatus = 'Synced' | 'Pending Sync' | 'Failed'
export type ContainerType = 'Tangki DPPU' | 'Drum 200L'
export type TransferStatus = 'Preparing' | 'In-Transit' | 'Completed' | 'Cancelled'
export type HandoverStatus = 'Signed & Verified' | 'Awaiting Receipt' | 'Rejected'

export interface BreadcrumbItem {
  title: string
  disabled: boolean
  href: string
}

export interface MetricCard {
  title: string
  count: string
  unit: string
  sub: string
  icon: string
  color: string
  subColor: string
}

export interface StockFlowStep {
  step: number
  title: string
  desc: string
  icon: string
  color: string
}

export interface StockItem {
  id: string
  name: string
  type: ContainerType
  station: string
  qty: string
  capacity: string
  percentage: number
  status: StockStatus
  statusColor: string
  lastUpdate: string
  syncStatus: SyncStatus
  batchNumber?: string
  sealNumber?: string
  notes?: string
}

export interface MutasiTransferItem {
  manifestNo: string
  origin: string
  destination: string
  qty: string
  drumCount: number
  volumeLiter: number
  carrier: string
  driverOrPilot: string
  date: string
  status: TransferStatus
  color: string
  sealNumbers: string[]
  notes?: string
}

export interface SerahTerimaItem {
  baNo: string
  manifestRef: string
  location: string
  receiver: string
  sealCheck: string
  date: string
  status: HandoverStatus
  color: string
  inspectorNotes?: string
}

export interface RekonsiliasiErpItem {
  syncId: string
  type: string
  station: string
  erpRef: string
  volume: string
  status: SyncStatus
  color: string
  timestamp: string
}

/* ========================================================================== */
/* Navigation & Page Layout State                                            */
/* ========================================================================== */

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Avtur Fuel Management',
    disabled: false,
    href: '/avtur-monitoring/dashboard',
  },
  {
    title: 'Stock Monitoring & Transfer',
    disabled: true,
    href: '#',
  },
]

const activeTab = ref<number>(0)

const tabs = [
  { title: 'Ringkasan Stok', icon: 'mdi-chart-pie-outline', badge: null },
  { title: 'Tangki Hub / DPPU', icon: 'mdi-fuel', badge: '2' },
  { title: 'Inventaris Drum', icon: 'mdi-barrel', badge: '312' },
  { title: 'Mutasi & Transfer', icon: 'mdi-swap-horizontal-bold', badge: 'Live' },
  { title: 'Serah-Terima', icon: 'mdi-handshake-outline', badge: null },
  { title: 'Rekonsiliasi ERP', icon: 'mdi-database-sync-outline', badge: 'Sync' },
]

/* ========================================================================== */
/* Dashboard Summary Metrics                                                  */
/* ========================================================================== */

const metrics = reactive<MetricCard[]>([
  {
    title: 'Total Saldo Avtur',
    count: '284,500 L',
    unit: 'Liter terdata',
    sub: '98.5% tersinkron ERP',
    icon: 'mdi-water-percent',
    color: 'primary',
    subColor: 'success',
  },
  {
    title: 'Stok Tangki Hub',
    count: '210,000 L',
    unit: 'WMX / DJJ',
    sub: '75% kapasitas terpakai',
    icon: 'mdi-fuel',
    color: 'teal',
    subColor: 'success',
  },
  {
    title: 'Stok Drum Airstrip',
    count: '312 Drum',
    unit: '62,400 L tersebar',
    sub: '8 airstrip perintis',
    icon: 'mdi-barrel-outline',
    color: 'success',
    subColor: 'success',
  },
  {
    title: 'Drum Dalam Transit',
    count: '45 Drum',
    unit: '9,000 L',
    sub: 'Penerbangan / cargo',
    icon: 'mdi-truck-cargo-container',
    color: 'warning',
    subColor: 'warning',
  },
  {
    title: 'Alert Low Stock',
    count: '2 Station',
    unit: 'Boven Digoel & Okbibab',
    sub: '< 5 drum tersisa',
    icon: 'mdi-alert-decagram-outline',
    color: 'error',
    subColor: 'error',
  },
  {
    title: 'Pending Sync',
    count: '5 Mutasi',
    unit: 'Transaksi offline',
    sub: 'Menunggu koneksi',
    icon: 'mdi-cloud-upload-outline',
    color: 'purple',
    subColor: 'warning',
  },
])

/* ========================================================================== */
/* Stock Lifecycle Flow Steps                                                 */
/* ========================================================================== */

const stockFlowSteps: StockFlowStep[] = [
  {
    step: 1,
    title: 'Inflow Tanker',
    desc: 'Penerimaan Avtur dari supplier ke tangki utama Hub / DPPU.',
    icon: 'mdi-truck-delivery-outline',
    color: 'teal',
  },
  {
    step: 2,
    title: 'Drum Filling',
    desc: 'Pengisian drum 200L, verifikasi batch dan pemasangan seal.',
    icon: 'mdi-barrel',
    color: 'primary',
  },
  {
    step: 3,
    title: 'Dispatch',
    desc: 'Pengiriman drum menggunakan manifest menuju airstrip tujuan.',
    icon: 'mdi-airplane-takeoff',
    color: 'warning',
  },
  {
    step: 4,
    title: 'Handover',
    desc: 'Konfirmasi penerimaan, pemeriksaan fisik dan scan seal.',
    icon: 'mdi-handshake',
    color: 'success',
  },
  {
    step: 5,
    title: 'Refuel & Reconcile',
    desc: 'Pemakaian dicatat dan saldo direkonsiliasi ke ERP.',
    icon: 'mdi-database-check-outline',
    color: 'purple',
  },
]

/* ========================================================================== */
/* Filter Options & Master Data                                               */
/* ========================================================================== */

const stationOptions = [
  'Semua Station / Hub',
  'Wamena Hub (WMX)',
  'Sentani Hub (DJJ)',
  'Timika (TIM)',
  'Airstrip Okbibab',
  'Airstrip Boven Digoel',
  'Airstrip Dekai',
  'Airstrip Oksibil',
]

const carrierOptions = [
  'PK-AMA (Cessna Caravan 208B)',
  'PK-AMB (Short Skyvan SC.7)',
  'PK-AMC (Helicopter Bell 412)',
  'PK-AMD (Cessna Caravan 208B)',
  'Truck Land Cruiser Hardtop',
  'Truk Tangki Hub Pertamina',
]

const typeOptions = [
  'Semua Tipe Wadah',
  'Tangki DPPU',
  'Drum 200L',
]

const statusOptions = [
  'Semua Status',
  'Normal',
  'Ready for Transit',
  'In Use',
  'In-Transit',
  'Low Stock',
  'Quarantined',
]

/* ========================================================================== */
/* Inventory Main Reactive State                                             */
/* ========================================================================== */

const selectedStation = ref<string>('Semua Station / Hub')
const selectedType = ref<string>('Semua Tipe Wadah')
const selectedStatus = ref<string>('Semua Status')
const searchQuery = ref<string>('')

const stockItems = ref<StockItem[]>([
  {
    id: 'HUB-WMX-TK01',
    name: 'Tangki Utama 1 (WMX)',
    type: 'Tangki DPPU',
    station: 'Wamena Hub (WMX)',
    qty: '120,000 L',
    capacity: '150,000 L',
    percentage: 80,
    status: 'Normal',
    statusColor: 'success',
    lastUpdate: '22 Aug 2026 09:10',
    syncStatus: 'Synced',
    batchNumber: 'B-2026-HUB-01',
    notes: 'Kondisi tangki baik, telah melalui inspeksi berkala.',
  },
  {
    id: 'HUB-DJJ-TK02',
    name: 'Tangki Utama 2 (DJJ)',
    type: 'Tangki DPPU',
    station: 'Sentani Hub (DJJ)',
    qty: '90,000 L',
    capacity: '120,000 L',
    percentage: 75,
    status: 'Normal',
    statusColor: 'success',
    lastUpdate: '22 Aug 2026 08:45',
    syncStatus: 'Synced',
    batchNumber: 'B-2026-HUB-02',
    notes: 'Suplai penerimaan tanker kapal tanggal 19 Aug.',
  },
  {
    id: 'DRUM-00087',
    name: 'Batch-210826-05 / Drum #87',
    type: 'Drum 200L',
    station: 'Sentani Hub (DJJ)',
    qty: '200 L',
    capacity: '200 L',
    percentage: 100,
    status: 'Ready for Transit',
    statusColor: 'info',
    lastUpdate: '22 Aug 2026 08:15',
    syncStatus: 'Synced',
    sealNumber: 'SEAL-DJJ-9921',
  },
  {
    id: 'DRUM-00086',
    name: 'Batch-180826-09 / Drum #86',
    type: 'Drum 200L',
    station: 'Timika (TIM)',
    qty: '140 L',
    capacity: '200 L',
    percentage: 70,
    status: 'In Use',
    statusColor: 'primary',
    lastUpdate: '21 Aug 2026 14:05',
    syncStatus: 'Synced',
    sealNumber: 'SEAL-TIM-4420',
  },
  {
    id: 'DRUM-00092',
    name: 'Batch-210826-05 / Drum #92',
    type: 'Drum 200L',
    station: 'Airstrip Okbibab',
    qty: '200 L',
    capacity: '200 L',
    percentage: 100,
    status: 'Quarantined',
    statusColor: 'error',
    lastUpdate: '21 Aug 2026 16:30',
    syncStatus: 'Synced',
    sealNumber: 'SEAL-OKB-1102',
    notes: 'Terindikasi kontaminasi air pada sampling awal.',
  },
  {
    id: 'DRUM-00078',
    name: 'Batch-150826-03 / Drum #78',
    type: 'Drum 200L',
    station: 'In-Transit (WMX → BVK)',
    qty: '200 L',
    capacity: '200 L',
    percentage: 100,
    status: 'In-Transit',
    statusColor: 'warning',
    lastUpdate: '21 Aug 2026 11:20',
    syncStatus: 'Pending Sync',
    sealNumber: 'SEAL-WMX-8831',
  },
  {
    id: 'DRUM-00065',
    name: 'Batch-120826-01 / Drum #65',
    type: 'Drum 200L',
    station: 'Airstrip Boven Digoel',
    qty: '20 L',
    capacity: '200 L',
    percentage: 10,
    status: 'Low Stock',
    statusColor: 'error',
    lastUpdate: '20 Aug 2026 18:00',
    syncStatus: 'Synced',
    sealNumber: 'SEAL-BVK-0021',
  },
])

/* ========================================================================== */
/* Mutasi & Transfer Data & State                                            */
/* ========================================================================== */

const transferSearchQuery = ref<string>('')
const transferStatusFilter = ref<string>('Semua Status')

const mutasiTransferItems = ref<MutasiTransferItem[]>([
  {
    manifestNo: 'MNF-2026-0801',
    origin: 'Wamena Hub (WMX)',
    destination: 'Airstrip Okbibab',
    qty: '10 Drum (2,000 L)',
    drumCount: 10,
    volumeLiter: 2000,
    carrier: 'PK-AMA (Cessna Caravan 208B)',
    driverOrPilot: 'Capt. Herman / FO Danang',
    date: '22 Aug 2026 07:30',
    status: 'In-Transit',
    color: 'warning',
    sealNumbers: ['SL-8801', 'SL-8802', 'SL-8803', 'SL-8804', 'SL-8805', 'SL-8806', 'SL-8807', 'SL-8808', 'SL-8809', 'SL-8810'],
    notes: 'Pengiriman darurat persediaan helikopter perintis.',
  },
  {
    manifestNo: 'MNF-2026-0800',
    origin: 'Sentani Hub (DJJ)',
    destination: 'Timika (TIM)',
    qty: '20 Drum (4,000 L)',
    drumCount: 20,
    volumeLiter: 4000,
    carrier: 'PK-AMB (Short Skyvan SC.7)',
    driverOrPilot: 'Capt. Budi Utomo',
    date: '21 Aug 2026 13:10',
    status: 'Completed',
    color: 'success',
    sealNumbers: ['SL-7701', 'SL-7702', 'SL-7703', 'SL-7704'],
    notes: 'Serah terima ramp disaksikan oleh Team Lead Timika.',
  },
  {
    manifestNo: 'MNF-2026-0798',
    origin: 'Wamena Hub (WMX)',
    destination: 'Airstrip Boven Digoel',
    qty: '5 Drum (1,000 L)',
    carrier: 'PK-AMC (Helicopter Bell 412)',
    driverOrPilot: 'Capt. Richard',
    date: '20 Aug 2026 09:45',
    drumCount: 5,
    volumeLiter: 1000,
    status: 'Completed',
    color: 'success',
    sealNumbers: ['SL-6601', 'SL-6602', 'SL-6603', 'SL-6604', 'SL-6605'],
    notes: 'Kondisi drum rapat, seal utuh.',
  },
  {
    manifestNo: 'MNF-2026-0802',
    origin: 'Sentani Hub (DJJ)',
    destination: 'Airstrip Dekai',
    qty: '12 Drum (2,400 L)',
    drumCount: 12,
    volumeLiter: 2400,
    carrier: 'PK-AMD (Cessna Caravan 208B)',
    driverOrPilot: 'Capt. Erick',
    date: '22 Aug 2026 10:00',
    status: 'Preparing',
    color: 'info',
    sealNumbers: ['SL-9901', 'SL-9902', 'SL-9903'],
    notes: 'Sedang tahap staging dan penimbangan weight & balance.',
  },
])

/* ========================================================================== */
/* Serah-Terima Data                                                         */
/* ========================================================================== */

const serahTerimaItems = ref<SerahTerimaItem[]>([
  {
    baNo: 'BA-ST-2026/08/012',
    manifestRef: 'MNF-2026-0800',
    location: 'Timika (TIM)',
    receiver: 'Budi Santoso (Ground Officer)',
    sealCheck: 'Valid (20/20 Seal Ok)',
    date: '21 Aug 2026 15:30',
    status: 'Signed & Verified',
    color: 'success',
    inspectorNotes: 'Pemeriksaan density 0.801 kg/L. Tidak ditemukan air.',
  },
  {
    baNo: 'BA-ST-2026/08/011',
    manifestRef: 'MNF-2026-0798',
    location: 'Airstrip Boven Digoel',
    receiver: 'Yohanes (Site Manager)',
    sealCheck: 'Valid (5/5 Seal Ok)',
    date: '20 Aug 2026 11:20',
    status: 'Signed & Verified',
    color: 'success',
    inspectorNotes: 'Penerimaan utuh tanpa kebocoran.',
  },
  {
    baNo: 'BA-ST-2026/08/013',
    manifestRef: 'MNF-2026-0801',
    location: 'Airstrip Okbibab',
    receiver: 'Petrus (Field Rep)',
    sealCheck: 'Pending Physical Scan',
    date: '22 Aug 2026 --:--',
    status: 'Awaiting Receipt',
    color: 'warning',
    inspectorNotes: 'Menunggu pesawat mendarat di Okbibab.',
  },
])

/* ========================================================================== */
/* Rekonsiliasi ERP Data                                                      */
/* ========================================================================== */

const rekonsiliasiErpItems = ref<RekonsiliasiErpItem[]>([
  {
    syncId: 'SYNC-8801',
    type: 'Pemakaian Fuel Aircraft',
    station: 'Wamena Hub (WMX)',
    erpRef: 'SAP-INV-99201',
    volume: '450 L',
    status: 'Synced',
    color: 'success',
    timestamp: '22 Aug 2026 09:00',
  },
  {
    syncId: 'SYNC-8802',
    type: 'Penerimaan Inflow Supplier',
    station: 'Sentani Hub (DJJ)',
    erpRef: 'SAP-GR-11029',
    volume: '15,000 L',
    status: 'Synced',
    color: 'success',
    timestamp: '22 Aug 2026 08:30',
  },
  {
    syncId: 'SYNC-8803',
    type: 'Mutasi Drum Outflow',
    station: 'Airstrip Boven Digoel',
    erpRef: 'PENDING-OFFLINE-QUEUE',
    volume: '200 L',
    status: 'Pending Sync',
    color: 'warning',
    timestamp: '21 Aug 2026 17:40',
  },
  {
    syncId: 'SYNC-8804',
    type: 'Koreksi Selisih Susut',
    station: 'Timika (TIM)',
    erpRef: 'SAP-ADJ-44102',
    volume: '-15 L',
    status: 'Synced',
    color: 'success',
    timestamp: '20 Aug 2026 16:15',
  },
])

/* ========================================================================== */
/* Dialog Controls & Form States                                             */
/* ========================================================================== */

// 1. Modal Tambah Stok
const isDialogOpen = ref<boolean>(false)
const form = ref({
  id: '',
  name: '',
  type: 'Drum 200L' as ContainerType,
  station: 'Wamena Hub (WMX)',
  qtyNumber: 200,
  capacityNumber: 200,
  status: 'Ready for Transit' as StockStatus,
  syncStatus: 'Synced' as SyncStatus,
})

// 2. Modal Manifest Transfer (THE REQUESTED FUNCTIONALITY)
const isManifestDialogOpen = ref<boolean>(false)
const manifestForm = reactive({
  manifestNo: '',
  origin: 'Wamena Hub (WMX)',
  destination: 'Airstrip Okbibab',
  drumCount: 10,
  literPerDrum: 200,
  carrier: 'PK-AMA (Cessna Caravan 208B)',
  driverOrPilot: '',
  date: new Date().toISOString().substring(0, 10),
  time: '08:00',
  sealPrefix: 'SL-2026-',
  notes: '',
})

// 3. Modal Detail Manifest View
const isDetailManifestOpen = ref<boolean>(false)
const selectedManifestDetail = ref<MutasiTransferItem | null>(null)

// 4. Global Snackbar / Notification
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success',
})

const showToast = (message: string, color = 'success') => {
  snackbar.text = message
  snackbar.color = color
  snackbar.show = true
}

/* ========================================================================== */
/* Handlers & Action Functions                                               */
/* ========================================================================== */

const openManifestDialog = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  manifestForm.manifestNo = `MNF-2026-${randomNum}`
  manifestForm.driverOrPilot = 'Capt. Aviator'
  manifestForm.notes = ''
  isManifestDialogOpen.value = true
}

const submitManifest = () => {
  if (!manifestForm.origin || !manifestForm.destination) {
    showToast('Silakan pilih lokasi asal dan tujuan transfer!', 'error')
    return
  }

  if (manifestForm.origin === manifestForm.destination) {
    showToast('Lokasi asal dan tujuan tidak boleh sama!', 'warning')
    return
  }

  const totalLiter = manifestForm.drumCount * manifestForm.literPerDrum
  const formattedQty = `${manifestForm.drumCount} Drum (${totalLiter.toLocaleString()} L)`

  // Generate Dummy Seal Barcode Numbers
  const generatedSeals: string[] = []
  for (let i = 1; i <= manifestForm.drumCount; i++) {
    const padIndex = String(i).padStart(3, '0')
    generatedSeals.push(`${manifestForm.sealPrefix}${padIndex}`)
  }

  const newManifest: MutasiTransferItem = {
    manifestNo: manifestForm.manifestNo,
    origin: manifestForm.origin,
    destination: manifestForm.destination,
    qty: formattedQty,
    drumCount: manifestForm.drumCount,
    volumeLiter: totalLiter,
    carrier: manifestForm.carrier,
    driverOrPilot: manifestForm.driverOrPilot || 'N/A',
    date: `${manifestForm.date} ${manifestForm.time}`,
    status: 'Preparing',
    color: 'info',
    sealNumbers: generatedSeals,
    notes: manifestForm.notes || 'Manifest transfer dibuat melalui sistem web.',
  }

  // Tambahkan ke bagian paling atas list
  mutasiTransferItems.value.unshift(newManifest)

  // Buat entri otomatis ke Serah-Terima (Awaiting Receipt)
  const newBA: SerahTerimaItem = {
    baNo: `BA-ST-2026/08/${Math.floor(100 + Math.random() * 900)}`,
    manifestRef: newManifest.manifestNo,
    location: newManifest.destination,
    receiver: 'Petugas Airstrip lapangan',
    sealCheck: `Pending (${manifestForm.drumCount} Seal)`,
    date: `${newManifest.date}`,
    status: 'Awaiting Receipt',
    color: 'warning',
    inspectorNotes: 'Menunggu konfirmasi kedatangan armada.',
  }
  serahTerimaItems.value.unshift(newBA)

  isManifestDialogOpen.value = false
  showToast(`Manifest ${newManifest.manifestNo} berhasil diterbitkan dan masuk ke antrean transfer.`, 'success')

  // Otomatis pindah ke Tab 3 (Mutasi & Transfer) agar user melihat hasilnya
  activeTab.value = 3
}

const openDetailManifest = (item: MutasiTransferItem) => {
  selectedManifestDetail.value = item
  isDetailManifestOpen.value = true
}

const updateTransferStatus = (item: MutasiTransferItem, newStatus: TransferStatus) => {
  item.status = newStatus
  if (newStatus === 'Completed') {
    item.color = 'success'
  } else if (newStatus === 'In-Transit') {
    item.color = 'warning'
  } else if (newStatus === 'Cancelled') {
    item.color = 'error'
  }
  showToast(`Status manifest ${item.manifestNo} diubah menjadi ${newStatus}.`, 'info')
}

const submitStock = () => {
  const qtyVal = Number(form.value.qtyNumber) || 0
  const capacityVal = Number(form.value.capacityNumber) || 200
  const percentage = Math.min(100, Math.round((qtyVal / capacityVal) * 100))

  const statusColorMap: Record<string, string> = {
    'Normal': 'success',
    'Ready for Transit': 'info',
    'In Use': 'primary',
    'In-Transit': 'warning',
    'Low Stock': 'error',
    'Quarantined': 'error',
  }

  const generatedId = form.value.id.trim() || `DRUM-${Math.floor(10000 + Math.random() * 90000)}`
  const generatedName = form.value.name.trim() || `Batch-${new Date().getDate()}${new Date().getMonth() + 1}26 / Auto`

  const newItem: StockItem = {
    id: generatedId,
    name: generatedName,
    type: form.value.type,
    station: form.value.station,
    qty: `${qtyVal.toLocaleString()} L`,
    capacity: `${capacityVal.toLocaleString()} L`,
    percentage: percentage,
    status: form.value.status,
    statusColor: statusColorMap[form.value.status] || 'primary',
    lastUpdate: 'Barusan',
    syncStatus: form.value.syncStatus,
  }

  stockItems.value.unshift(newItem)
  selectedStockId.value = newItem.id

  isDialogOpen.value = false
  showToast(`Inventaris ${newItem.id} berhasil ditambahkan!`, 'success')

  form.value = {
    id: '',
    name: '',
    type: 'Drum 200L',
    station: 'Wamena Hub (WMX)',
    qtyNumber: 200,
    capacityNumber: 200,
    status: 'Ready for Transit',
    syncStatus: 'Synced',
  }
}

/* ========================================================================== */
/* Selected Inventory Logic & Computeds                                      */
/* ========================================================================== */

const selectedStockId = ref<string>('DRUM-00086')

const selectedStock = computed(() => {
  return stockItems.value.find(item => item.id === selectedStockId.value) ?? stockItems.value[0]
})

const selectStock = (item: StockItem) => {
  selectedStockId.value = item.id
}

const filteredStockItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return stockItems.value.filter(item => {
    const matchStation =
      selectedStation.value === 'Semua Station / Hub' ||
      item.station.includes(selectedStation.value.replace('Airstrip ', ''))

    const matchType =
      selectedType.value === 'Semua Tipe Wadah' ||
      item.type === selectedType.value

    const matchStatus =
      selectedStatus.value === 'Semua Status' ||
      item.status === selectedStatus.value

    const searchableText = [
      item.id,
      item.name,
      item.type,
      item.station,
      item.status,
      item.syncStatus,
    ]
      .join(' ')
      .toLowerCase()

    const matchSearch = !query || searchableText.includes(query)

    return matchStation && matchType && matchStatus && matchSearch
  })
})

const filteredTransferItems = computed(() => {
  const q = transferSearchQuery.value.trim().toLowerCase()
  return mutasiTransferItems.value.filter(item => {
    const matchStatus = transferStatusFilter.value === 'Semua Status' || item.status === transferStatusFilter.value
    const matchQuery = !q || item.manifestNo.toLowerCase().includes(q) || item.origin.toLowerCase().includes(q) || item.destination.toLowerCase().includes(q) || item.carrier.toLowerCase().includes(q)
    return matchStatus && matchQuery
  })
})

const hubTanks = computed(() => stockItems.value.filter(item => item.type === 'Tangki DPPU'))
const drumInventory = computed(() => stockItems.value.filter(item => item.type === 'Drum 200L'))

/* ========================================================================== */
/* Pagination & Helper Methods                                                */
/* ========================================================================== */

const page = ref<number>(1)
const itemsPerPage = ref<number>(10)
const totalInventory = computed(() => stockItems.value.length + 305)

const paginationLength = computed(() =>
  Math.max(1, Math.ceil(totalInventory.value / itemsPerPage.value)),
)

const resetFilters = () => {
  selectedStation.value = 'Semua Station / Hub'
  selectedType.value = 'Semua Tipe Wadah'
  selectedStatus.value = 'Semua Status'
  searchQuery.value = ''
  page.value = 1
}

const getProgressColor = (percentage: number) => {
  if (percentage < 20) return 'error'
  if (percentage < 50) return 'warning'
  return 'teal'
}

const printManifestDoc = () => {
  showToast('Mencetak dokumen Manifest Transfer...', 'info')
}
</script>

<template>
  <div class="avtur-stock-monitoring-view">
    <!-- Breadcrumb -->
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

    <!-- Page Header -->
    <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3 mb-1">
          Pemantauan Stok Avtur & Transfer Manifest
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Real-time inventory, drum lifecycle, transfer tracking, dan rekonsiliasi stok.
        </p>
      </div>
      <AvturTopNav/>
      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          class="text-none"
          @click="showToast('Data stok & manifest berhasil diperbarui!', 'success')"
        >
          Refresh Data
        </v-btn>

        <!-- Dynamic Trigger Button -->
        <v-btn
          color="primary"
          prepend-icon="mdi-swap-horizontal-bold"
          class="text-none"
          @click="openManifestDialog"
        >
          Buat Manifest Transfer
        </v-btn>
      </div>
    </div>

    <!-- Internal Stock Monitoring Tabs -->
    <v-card
      variant="flat"
      class="border rounded-lg bg-white mb-6 overflow-hidden"
    >
      <v-tabs
        v-model="activeTab"
        color="primary"
        show-arrows
      >
        <v-tab
          v-for="(tab, index) in tabs"
          :key="index"
          :value="index"
          class="text-none font-weight-medium"
        >
          <v-icon
            :icon="tab.icon"
            size="18"
            class="mr-2"
          />
          {{ tab.title }}
          <v-chip
            v-if="tab.badge"
            size="x-small"
            color="primary"
            variant="tonal"
            class="ml-2 font-weight-bold"
          >
            {{ tab.badge }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Dynamic Window Content Based On Selected Tab -->
    <v-window v-model="activeTab">
      <!-- TAB 0: Ringkasan Stok -->
      <v-window-item :value="0">
        <!-- Metrics -->
        <div class="metrics-grid mb-6">
          <v-card
            v-for="metric in metrics"
            :key="metric.title"
            variant="flat"
            class="border rounded-lg pa-4 bg-white metric-card"
          >
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-medium-emphasis">
                {{ metric.title }}
              </span>

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
            </div>

            <div class="text-h5 font-weight-bold text-grey-darken-4">
              {{ metric.count }}
            </div>

            <div class="text-caption text-medium-emphasis mt-1">
              {{ metric.unit }}
            </div>

            <div
              class="text-caption font-weight-medium mt-2"
              :class="`text-${metric.subColor}`"
            >
              {{ metric.sub }}
            </div>
          </v-card>
        </div>

        <!-- Stock Lifecycle -->
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Siklus Stok & Mutasi Avtur
              </div>

              <div class="text-caption text-medium-emphasis mt-1">
                Dari penerimaan Hub hingga penggunaan di airstrip perintis.
              </div>
            </div>

            <v-chip
              size="small"
              color="success"
              variant="tonal"
              prepend-icon="mdi-check-circle-outline"
            >
              Lifecycle Tracking Active
            </v-chip>
          </div>

          <div class="flow-grid">
            <template
              v-for="step in stockFlowSteps"
              :key="step.step"
            >
              <div class="flow-item">
                <div class="flow-icon-wrapper">
                  <v-avatar
                    :color="step.color"
                    variant="tonal"
                    size="42"
                  >
                    <v-icon
                      :icon="step.icon"
                      size="21"
                    />
                  </v-avatar>

                  <span class="flow-number">
                    {{ step.step }}
                  </span>
                </div>

                <div class="font-weight-bold text-body-2 text-grey-darken-3 mt-3">
                  {{ step.title }}
                </div>

                <div class="text-caption text-medium-emphasis mt-1 flow-desc">
                  {{ step.desc }}
                </div>
              </div>

              <v-icon
                v-if="step.step < stockFlowSteps.length"
                icon="mdi-chevron-right"
                size="22"
                color="grey-lighten-1"
                class="flow-arrow"
              />
            </template>
          </div>
        </v-card>

        <!-- Main Inventory Area -->
        <v-row class="mb-6">
          <v-col
            cols="12"
            xl="8"
            lg="7"
          >
            <v-card
              variant="flat"
              class="border rounded-lg bg-white h-100"
            >
              <div class="pa-5 pb-3">
                <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                      Inventory Wadah & Tangki
                    </div>

                    <div class="text-caption text-medium-emphasis mt-1">
                      Daftar saldo aktual seluruh storage yang terdaftar.
                    </div>
                  </div>

                  <div class="d-flex ga-2">
                    <v-btn
                      size="small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      class="text-none"
                      @click="isDialogOpen = true"
                    >
                      Tambah Drum
                    </v-btn>
                    <v-chip
                      size="small"
                      variant="tonal"
                      color="primary"
                    >
                      {{ stockItems.length }} Unit Terdaftar
                    </v-chip>
                  </div>
                </div>
              </div>

              <v-divider />

              <!-- Filters -->
              <div class="pa-5 pb-4">
                <v-row density="compact">
                  <v-col
                    cols="12"
                    sm="6"
                    md="4"
                  >
                    <v-select
                      v-model="selectedStation"
                      :items="stationOptions"
                      label="Lokasi / Station"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>

                  <v-col
                    cols="6"
                    sm="3"
                    md="3"
                  >
                    <v-select
                      v-model="selectedType"
                      :items="typeOptions"
                      label="Tipe Wadah"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>

                  <v-col
                    cols="6"
                    sm="3"
                    md="3"
                  >
                    <v-select
                      v-model="selectedStatus"
                      :items="statusOptions"
                      label="Status"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>

                  <v-col
                    cols="12"
                    md="2"
                    class="d-flex"
                  >
                    <v-btn
                      variant="text"
                      color="primary"
                      prepend-icon="mdi-filter-off-outline"
                      class="text-none px-2"
                      block
                      @click="resetFilters"
                    >
                      Reset
                    </v-btn>
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="searchQuery"
                      placeholder="Cari ID wadah, batch, lokasi, status, atau nomor seal..."
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      hide-details
                      clearable
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- Table -->
              <div class="inventory-table-wrapper">
                <v-table
                  density="comfortable"
                  class="inventory-table"
                >
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th class="font-weight-bold text-caption">
                        ID Wadah / Nama
                      </th>
                      <th class="font-weight-bold text-caption">
                        Tipe & Lokasi
                      </th>
                      <th
                        class="font-weight-bold text-caption"
                        style="min-width: 170px;"
                      >
                        Saldo / Kapasitas
                      </th>
                      <th class="font-weight-bold text-caption">
                        Status
                      </th>
                      <th class="font-weight-bold text-caption">
                        Update
                      </th>
                      <th
                        class="font-weight-bold text-caption text-center"
                        style="width: 90px;"
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr
                      v-for="item in filteredStockItems"
                      :key="item.id"
                      class="inventory-row"
                      :class="{
                        'selected-row': selectedStock?.id === item.id,
                      }"
                      @click="selectStock(item)"
                    >
                      <td>
                        <div class="font-weight-bold text-body-2">
                          {{ item.id }}
                        </div>
                        <div class="text-caption text-medium-emphasis mt-1">
                          {{ item.name }}
                        </div>
                      </td>

                      <td>
                        <div class="text-body-2 font-weight-medium">
                          {{ item.station }}
                        </div>
                        <v-chip
                          size="x-small"
                          color="grey"
                          variant="tonal"
                          class="mt-1"
                        >
                          {{ item.type }}
                        </v-chip>
                      </td>

                      <td>
                        <div class="d-flex align-center justify-space-between mb-1">
                          <span class="text-caption font-weight-bold text-primary">
                            {{ item.qty }}
                          </span>
                          <span class="text-caption text-medium-emphasis">
                            / {{ item.capacity }}
                          </span>
                        </div>
                        <v-progress-linear
                          :model-value="item.percentage"
                          :color="getProgressColor(item.percentage)"
                          height="6"
                          rounded
                        />
                        <div class="text-caption text-medium-emphasis mt-1">
                          {{ item.percentage }}% terisi
                        </div>
                      </td>

                      <td>
                        <v-chip
                          size="x-small"
                          :color="item.statusColor"
                          variant="tonal"
                          class="font-weight-bold"
                        >
                          {{ item.status }}
                        </v-chip>
                      </td>

                      <td>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.lastUpdate }}
                        </div>
                        <div
                          class="text-caption font-weight-medium mt-1"
                          :class="item.syncStatus === 'Synced' ? 'text-success' : 'text-warning'"
                        >
                          <v-icon
                            :icon="item.syncStatus === 'Synced' ? 'mdi-check-circle-outline' : 'mdi-cloud-upload-outline'"
                            size="13"
                            class="mr-1"
                          />
                          {{ item.syncStatus }}
                        </div>
                      </td>

                      <td class="text-center">
                        <v-btn
                          icon="mdi-history"
                          variant="text"
                          size="small"
                          color="grey-darken-1"
                          @click.stop="showToast(`Riwayat ${item.id} dimuat`, 'info')"
                        />
                        <v-btn
                          icon="mdi-dots-vertical"
                          variant="text"
                          size="small"
                          color="grey-darken-1"
                          @click.stop
                        />
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <!-- Pagination -->
              <div class="d-flex align-center justify-space-between flex-wrap ga-3 pa-4">
                <span class="text-caption text-medium-emphasis">
                  Menampilkan <strong>{{ filteredStockItems.length }}</strong> data dari <strong>{{ totalInventory }}</strong> unit inventaris
                </span>

                <div class="d-flex align-center ga-3">
                  <v-pagination
                    v-model="page"
                    :length="paginationLength"
                    density="compact"
                    total-visible="5"
                  />
                  <v-select
                    v-model="itemsPerPage"
                    :items="[10, 25, 50]"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="width: 105px;"
                  />
                </div>
              </div>
            </v-card>
          </v-col>

          <!-- Detail Panel Section -->
          <v-col
            cols="12"
            xl="4"
            lg="5"
          >
            <v-card
              variant="flat"
              class="border rounded-lg bg-white h-100"
            >
              <div class="pa-5">
                <div class="d-flex align-center justify-space-between mb-1">
                  <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                    Detail Inventaris
                  </div>
                  <v-chip
                    v-if="selectedStock"
                    size="x-small"
                    :color="selectedStock.statusColor"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    {{ selectedStock.status }}
                  </v-chip>
                </div>
                <div
                  v-if="selectedStock"
                  class="text-caption text-medium-emphasis"
                >
                  {{ selectedStock.id }}
                </div>
              </div>

              <v-divider />

              <div
                v-if="selectedStock"
                class="pa-5"
              >
                <!-- Balance -->
                <div class="detail-balance pa-4 rounded-lg border mb-5">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-caption font-weight-bold text-grey-darken-2">
                      Saldo Real-Time
                    </span>
                    <span class="text-body-2 font-weight-bold text-primary">
                      {{ selectedStock.percentage }}%
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="selectedStock.percentage"
                    :color="getProgressColor(selectedStock.percentage)"
                    height="11"
                    rounded
                    class="mb-3"
                  />
                  <div class="d-flex justify-space-between">
                    <div>
                      <div class="text-caption text-medium-emphasis">
                        Saldo
                      </div>
                      <div class="text-body-2 font-weight-bold">
                        {{ selectedStock.qty }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-medium-emphasis">
                        Kapasitas
                      </div>
                      <div class="text-body-2 font-weight-bold">
                        {{ selectedStock.capacity }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Identity -->
                <div class="detail-section">
                  <div class="detail-section-title">
                    <v-icon
                      icon="mdi-map-marker-outline"
                      color="primary"
                      size="18"
                    />
                    Lokasi & Identitas
                  </div>
                  <div class="detail-list">
                    <div>
                      <span>Nama Wadah</span>
                      <strong>{{ selectedStock.name }}</strong>
                    </div>
                    <div>
                      <span>Tipe</span>
                      <strong>{{ selectedStock.type }}</strong>
                    </div>
                    <div>
                      <span>Station</span>
                      <strong>{{ selectedStock.station }}</strong>
                    </div>
                    <div>
                      <span>Update Terakhir</span>
                      <strong>{{ selectedStock.lastUpdate }}</strong>
                    </div>
                    <div v-if="selectedStock.sealNumber">
                      <span>No. Seal</span>
                      <strong class="text-teal">{{ selectedStock.sealNumber }}</strong>
                    </div>
                  </div>
                </div>

                <v-divider class="my-5" />

                <!-- Operational Status -->
                <div class="detail-section">
                  <div class="detail-section-title">
                    <v-icon
                      icon="mdi-shield-check-outline"
                      color="teal"
                      size="18"
                    />
                    Status Operasional
                  </div>
                  <div class="detail-status-card">
                    <div class="d-flex align-center ga-3">
                      <v-avatar
                        :color="selectedStock.statusColor"
                        variant="tonal"
                        size="38"
                      >
                        <v-icon
                          icon="mdi-fuel"
                          size="19"
                        />
                      </v-avatar>
                      <div>
                        <div class="text-body-2 font-weight-bold">
                          {{ selectedStock.status }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          Kondisi inventaris saat ini
                        </div>
                      </div>
                    </div>
                    <v-chip
                      size="x-small"
                      :color="selectedStock.statusColor"
                      variant="tonal"
                    >
                      Active
                    </v-chip>
                  </div>
                </div>

                <v-divider class="my-5" />

                <!-- Sync -->
                <div class="detail-section">
                  <div class="detail-section-title">
                    <v-icon
                      icon="mdi-database-sync-outline"
                      color="purple"
                      size="18"
                    />
                    ERP & Synchronization
                  </div>
                  <div class="detail-list">
                    <div>
                      <span>Sync Status</span>
                      <strong :class="selectedStock.syncStatus === 'Synced' ? 'text-success' : 'text-warning'">
                        {{ selectedStock.syncStatus }}
                      </strong>
                    </div>
                    <div>
                      <span>Mode</span>
                      <strong>
                        {{ selectedStock.syncStatus === 'Synced' ? 'Online / Auto Sync' : 'Offline Queue' }}
                      </strong>
                    </div>
                  </div>
                </div>

                <div class="d-flex ga-2 mt-6">
                  <v-btn
                    variant="outlined"
                    color="primary"
                    block
                    prepend-icon="mdi-swap-horizontal"
                    class="text-none"
                    @click="openManifestDialog"
                  >
                    Transfer
                  </v-btn>
                  <v-btn
                    color="primary"
                    block
                    prepend-icon="mdi-qrcode-scan"
                    class="text-none"
                    @click="showToast('Pemindai Barcode / QR Code aktif.', 'info')"
                  >
                    Scan
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 1: Tangki Hub / DPPU -->
      <v-window-item :value="1">
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-2">
            Status Tangki Utama DPPU / Hub
          </div>
          <div class="text-body-2 text-medium-emphasis mb-5">
            Daftar tangki penampung Avtur di Wamena (WMX) & Sentani (DJJ).
          </div>

          <v-row>
            <v-col
              v-for="tank in hubTanks"
              :key="tank.id"
              cols="12"
              md="6"
            >
              <v-card
                variant="outlined"
                class="pa-4 rounded-lg"
              >
                <div class="d-flex justify-space-between align-center mb-3">
                  <div>
                    <div class="font-weight-bold text-subtitle-2">
                      {{ tank.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ tank.id }} — {{ tank.station }}
                    </div>
                  </div>
                  <v-chip
                    size="small"
                    color="teal"
                    variant="tonal"
                  >
                    {{ tank.status }}
                  </v-chip>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>Kapasitas Isi</span>
                  <span class="font-weight-bold">{{ tank.qty }} / {{ tank.capacity }}</span>
                </div>
                <v-progress-linear
                  :model-value="tank.percentage"
                  color="teal"
                  height="10"
                  rounded
                />
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- TAB 2: Inventaris Drum -->
      <v-window-item :value="2">
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-2">
            Inventaris Drum 200 Litres
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Total {{ drumInventory.length }} Drum terdaftar di sistem.
          </div>

          <v-table density="comfortable">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th>ID Drum</th>
                <th>Batch / Ref</th>
                <th>Lokasi</th>
                <th>Volume</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="drum in drumInventory"
                :key="drum.id"
              >
                <td class="font-weight-bold">
                  {{ drum.id }}
                </td>
                <td>{{ drum.name }}</td>
                <td>{{ drum.station }}</td>
                <td>{{ drum.qty }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="drum.statusColor"
                    variant="tonal"
                  >
                    {{ drum.status }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 3: Mutasi & Transfer (Primary Focus) -->
      <v-window-item :value="3">
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Riwayat Mutasi & Manifest Transfer
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Pencatatan pengiriman drum & transfer Avtur antar-station/airstrip perintis.
              </div>
            </div>

            <!-- BUTTON WORKING IN TAB 3 -->
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              class="text-none"
              @click="openManifestDialog"
            >
              Buat Manifest Transfer
            </v-btn>
          </div>

          <!-- Transfer Filters -->
          <v-row
            density="compact"
            class="mb-4"
          >
            <v-col
              cols="12"
              sm="6"
              md="4"
            >
              <v-text-field
                v-model="transferSearchQuery"
                placeholder="Cari No. Manifest, asal, tujuan, pesawat..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="3"
            >
              <v-select
                v-model="transferStatusFilter"
                :items="['Semua Status', 'Preparing', 'In-Transit', 'Completed', 'Cancelled']"
                label="Filter Status Transfer"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <v-table density="comfortable">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th>No. Manifest</th>
                <th>Asal</th>
                <th>Tujuan</th>
                <th>Volume / Jumlah</th>
                <th>Armada / Carrier</th>
                <th>Waktu Transfer</th>
                <th>Status</th>
                <th class="text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredTransferItems"
                :key="item.manifestNo"
              >
                <td class="font-weight-bold text-primary">
                  {{ item.manifestNo }}
                </td>
                <td>{{ item.origin }}</td>
                <td>{{ item.destination }}</td>
                <td class="font-weight-bold">
                  {{ item.qty }}
                </td>
                <td>{{ item.carrier }}</td>
                <td class="text-caption text-medium-emphasis">
                  {{ item.date }}
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
                    icon="mdi-eye-outline"
                    variant="text"
                    size="small"
                    color="primary"
                    @click="openDetailManifest(item)"
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
                        title="Ubah Status -> In-Transit"
                        prepend-icon="mdi-truck-delivery-outline"
                        @click="updateTransferStatus(item, 'In-Transit')"
                      />
                      <v-list-item
                        title="Ubah Status -> Selesai"
                        prepend-icon="mdi-check-circle-outline"
                        @click="updateTransferStatus(item, 'Completed')"
                      />
                      <v-list-item
                        title="Cetak Manifest"
                        prepend-icon="mdi-printer"
                        @click="printManifestDoc"
                      />
                    </v-list>
                  </v-menu>
                </td>
              </tr>
              <tr v-if="filteredTransferItems.length === 0">
                <td
                  colspan="8"
                  class="text-center text-medium-emphasis pa-4"
                >
                  Tidak ada data manifest transfer ditemukan.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 4: Serah-Terima -->
      <v-window-item :value="4">
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">
            Dokumen Serah-Terima Handover
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Verifikasi tanda tangan digital & scan barcode drum saat tiba di airstrip perintis.
          </div>

          <v-table density="comfortable">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th>No. Berita Acara</th>
                <th>Ref. Manifest</th>
                <th>Lokasi Receipt</th>
                <th>Penerima</th>
                <th>Verifikasi Seal</th>
                <th>Waktu Tiba</th>
                <th>Status Handover</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in serahTerimaItems"
                :key="item.baNo"
              >
                <td class="font-weight-bold">
                  {{ item.baNo }}
                </td>
                <td class="text-caption font-weight-medium text-primary">
                  {{ item.manifestRef }}
                </td>
                <td>{{ item.location }}</td>
                <td>{{ item.receiver }}</td>
                <td class="text-caption font-weight-bold text-teal">
                  <v-icon
                    icon="mdi-shield-check-outline"
                    size="14"
                    class="mr-1"
                  />
                  {{ item.sealCheck }}
                </td>
                <td class="text-caption text-medium-emphasis">
                  {{ item.date }}
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
      </v-window-item>

      <!-- TAB 5: Rekonsiliasi ERP -->
      <v-window-item :value="5">
        <v-card
          variant="flat"
          class="border rounded-lg bg-white pa-5 mb-6"
        >
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">
            Rekonsiliasi Jurnal ERP
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Pengsinkronan transaksi stok lokal dengan master ledger pusat.
          </div>

          <v-table density="comfortable">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th>ID Sinkronisasi</th>
                <th>Jenis Transaksi</th>
                <th>Station</th>
                <th>Ref Ledger ERP</th>
                <th>Volume</th>
                <th>Waktu Sync</th>
                <th>Status Jurnal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in rekonsiliasiErpItems"
                :key="item.syncId"
              >
                <td class="font-weight-bold">
                  {{ item.syncId }}
                </td>
                <td>{{ item.type }}</td>
                <td>{{ item.station }}</td>
                <td class="font-mono text-caption text-primary">
                  {{ item.erpRef }}
                </td>
                <td class="font-weight-bold">
                  {{ item.volume }}
                </td>
                <td class="text-caption text-medium-emphasis">
                  {{ item.timestamp }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="item.color"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    <v-icon
                      :icon="item.status === 'Synced' ? 'mdi-check-circle-outline' : 'mdi-cloud-upload-outline'"
                      size="12"
                      class="mr-1"
                    />
                    {{ item.status }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- ==================================================================== -->
    <!-- DIALOG 1: MODAL BUAT MANIFEST TRANSFER (FEATURE IMPLEMENTATION)      -->
    <!-- ==================================================================== -->
    <v-dialog
      v-model="isManifestDialogOpen"
      max-width="700"
      persistent
    >
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-swap-horizontal-bold" />
            <span class="text-h6 font-weight-bold">Buat Manifest Transfer Avtur</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            color="white"
            @click="isManifestDialogOpen = false"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <v-form @submit.prevent="submitManifest">
            <v-row density="compact">
              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model="manifestForm.manifestNo"
                  label="No. Manifest"
                  variant="outlined"
                  density="compact"
                  hint="Otomatis terisi"
                  persistent-hint
                  required
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="manifestForm.carrier"
                  :items="carrierOptions"
                  label="Armada Pengangkut / Carrier"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="manifestForm.origin"
                  :items="stationOptions.filter((s: string) => s !== 'Semua Station / Hub')"
                  label="Station Asal (Origin)"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="manifestForm.destination"
                  :items="stationOptions.filter((s: string) => s !== 'Semua Station / Hub')"
                  label="Station / Airstrip Tujuan"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>

              <v-col
                cols="12"
                sm="4"
              >
                <v-text-field
                  v-model.number="manifestForm.drumCount"
                  label="Jumlah Drum"
                  type="number"
                  min="1"
                  variant="outlined"
                  density="compact"
                  required
                />
              </v-col>

              <v-col
                cols="12"
                sm="4"
              >
                <v-text-field
                  v-model.number="manifestForm.literPerDrum"
                  label="Volume per Drum (Liter)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  readonly
                />
              </v-col>

              <v-col
                cols="12"
                sm="4"
              >
                <v-text-field
                  :model-value="manifestForm.drumCount * manifestForm.literPerDrum + ' Liter'"
                  label="Total Volume Liter"
                  variant="outlined"
                  density="compact"
                  readonly
                  bg-color="grey-lighten-4"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model="manifestForm.driverOrPilot"
                  label="Nama Pilot / Driver Pengangkut"
                  placeholder="misal: Capt. Aviator"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="3"
              >
                <v-text-field
                  v-model="manifestForm.date"
                  label="Tanggal Kirim"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="3"
              >
                <v-text-field
                  v-model="manifestForm.time"
                  label="Jam Kirim"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="manifestForm.sealPrefix"
                  label="Prefix Barcode Seal Drum"
                  hint="Sistem akan membuat nomor urut seal otomatis berdasarkan jumlah drum"
                  persistent-hint
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="manifestForm.notes"
                  label="Catatan Pengiriman / Instuksi Khusus"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  placeholder="Contoh: Pengiriman prioritas untuk helikopter SAR..."
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-none"
            @click="isManifestDialogOpen = false"
          >
            Batal
          </v-btn>
          <v-btn
            color="primary"
            class="text-none px-5"
            prepend-icon="mdi-check"
            @click="submitManifest"
          >
            Terbitkan Manifest
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ==================================================================== -->
    <!-- DIALOG 2: MODAL DETAIL MANIFEST TRANSFER                             -->
    <!-- ==================================================================== -->
    <v-dialog
      v-model="isDetailManifestOpen"
      max-width="650"
    >
      <v-card
        v-if="selectedManifestDetail"
        class="rounded-lg"
      >
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-grey-lighten-4">
          <div>
            <span class="text-h6 font-weight-bold">Detail Manifest Transfer</span>
            <div class="text-caption text-primary font-weight-bold">
              {{ selectedManifestDetail.manifestNo }}
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="isDetailManifestOpen = false"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4">
            <v-chip
              :color="selectedManifestDetail.color"
              variant="tonal"
              class="font-weight-bold"
            >
              Status: {{ selectedManifestDetail.status }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">
              Waktu: {{ selectedManifestDetail.date }}
            </span>
          </div>

          <v-row density="compact">
            <v-col
              cols="6"
              class="border-right"
            >
              <div class="text-caption text-medium-emphasis">
                Station Asal
              </div>
              <div class="text-body-2 font-weight-bold">
                {{ selectedManifestDetail.origin }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">
                Station Tujuan
              </div>
              <div class="text-body-2 font-weight-bold">
                {{ selectedManifestDetail.destination }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">
              Armada & Pilot / Pengangkut
            </div>
            <div class="text-body-2 font-weight-medium">
              {{ selectedManifestDetail.carrier }}
            </div>
            <div class="text-caption font-weight-bold text-teal mt-1">
              {{ selectedManifestDetail.driverOrPilot }}
            </div>
          </div>

          <div class="mb-3 pa-3 rounded bg-grey-lighten-4 border">
            <div class="text-caption text-medium-emphasis">
              Rincian Kargo
            </div>
            <div class="text-body-1 font-weight-bold text-primary">
              {{ selectedManifestDetail.qty }}
            </div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">
              Daftar Barcode Seal Drum ({{ selectedManifestDetail.sealNumbers.length }} unit)
            </div>
            <div class="d-flex flex-wrap ga-1">
              <v-chip
                v-for="seal in selectedManifestDetail.sealNumbers"
                :key="seal"
                size="x-small"
                variant="outlined"
                color="teal"
              >
                {{ seal }}
              </v-chip>
            </div>
          </div>

          <div>
            <div class="text-caption text-medium-emphasis">
              Catatan
            </div>
            <div class="text-caption">
              {{ selectedManifestDetail.notes || '-' }}
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-printer"
            class="text-none"
            @click="printManifestDoc"
          >
            Cetak Dokumen
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            class="text-none"
            @click="isDetailManifestOpen = false"
          >
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ==================================================================== -->
    <!-- DIALOG 3: MODAL INPUT STOK BIASA                                     -->
    <!-- ==================================================================== -->
    <v-dialog
      v-model="isDialogOpen"
      max-width="600"
      persistent
    >
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-grey-lighten-4">
          <span class="text-h6 font-weight-bold">Tambah / Catat Stok Avtur</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="isDialogOpen = false"
          />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-form @submit.prevent="submitStock">
            <v-row density="compact">
              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model="form.id"
                  label="ID Wadah / Batch"
                  placeholder="misal: DRUM-00099"
                  variant="outlined"
                  density="compact"
                  hint="Otomatis di-generate jika dikosongkan"
                  persistent-hint
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model="form.name"
                  label="Nama / Deskripsi Batch"
                  placeholder="misal: Batch-220826-01"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="form.type"
                  :items="['Tangki DPPU', 'Drum 200L']"
                  label="Tipe Wadah"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="form.station"
                  :items="stationOptions.filter((s: string) => s !== 'Semua Station / Hub')"
                  label="Lokasi / Station"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model.number="form.qtyNumber"
                  label="Jumlah Saldo (Liter)"
                  type="number"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-text-field
                  v-model.number="form.capacityNumber"
                  label="Kapasitas Maksimal (Liter)"
                  type="number"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="form.status"
                  :items="statusOptions.filter((s: string) => s !== 'Semua Status')"
                  label="Status Operasional"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col
                cols="12"
                sm="6"
              >
                <v-select
                  v-model="form.syncStatus"
                  :items="['Synced', 'Pending Sync']"
                  label="Status Sinkronisasi ERP"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-none"
            @click="isDialogOpen = false"
          >
            Batal
          </v-btn>
          <v-btn
            color="primary"
            class="text-none px-4"
            @click="submitStock"
          >
            Simpan ke Tabel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Toast Notification -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="top right"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn
          color="white"
          variant="text"
          @click="snackbar.show = false"
        >
          Tutup
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Compliance / Offline First Alert -->
    <v-alert
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-shield-sync-outline"
      class="rounded-lg border mt-6"
    >
      <template #title>
        <span class="text-subtitle-2 font-weight-bold">
          Multi-Station Inventory & Transfer Manifest System Active
        </span>
      </template>

      <span class="text-caption">
        Sistem mengintegrasikan pembuatan manifest transfer penerbangan perintis dengan pencatatan seal drum,
        penerimaan berita acara (handover), dan otomatisasi pembuatan queue transaksi offline jika terputus jaringan.
      </span>
    </v-alert>
  </div>
</template>

<style scoped>
.avtur-stock-monitoring-view {
  width: 100%;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  min-height: 150px;
}

.flow-grid {
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
  align-items: center;
  gap: 10px;
}

.flow-item {
  min-width: 0;
  text-align: center;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}

.flow-icon-wrapper {
  position: relative;
  display: inline-flex;
}

.flow-number {
  position: absolute;
  right: -5px;
  bottom: -3px;
  width: 19px;
  height: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  font-size: 10px;
  font-weight: 700;
}

.flow-desc {
  line-height: 1.35;
}

.flow-arrow {
  flex-shrink: 0;
}

.inventory-table-wrapper {
  overflow-x: auto;
}

.inventory-table {
  min-width: 850px;
}

.inventory-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.inventory-row:hover {
  background: rgba(var(--v-theme-primary), 0.035);
}

.selected-row {
  background: rgba(var(--v-theme-primary), 0.075);
}

.detail-balance {
  background: rgba(var(--v-theme-primary), 0.035);
}

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}

.detail-list > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
}

.detail-list span {
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.detail-list strong {
  max-width: 62%;
  text-align: right;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.detail-status-card {
  display: flex;
  align-items: center;
  justify-content:space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
}

@media (max-width: 1400px) {
  .metrics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .flow-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .flow-arrow {
    display: none;
  }
}

@media (max-width: 700px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-grid {
    grid-template-columns: 1fr;
  }

  .flow-item {
    text-align: left;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .flow-item > .flow-icon-wrapper {
    flex-shrink: 0;
  }

  .flow-item > .flow-desc {
    margin-top: 2px;
  }
}

@media (max-width: 500px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>