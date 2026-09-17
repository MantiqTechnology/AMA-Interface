<script setup lang="ts">
//import { ref, computed } from 'vue'

// ============================================================
// BREADCRUMBS
// ============================================================

const breadcrumbs = [
  {
    title: 'Avtur Fuel Management',
    disabled: false,
    href: '/avtur-monitoring/dashboard',
  },
  {
    title: 'Rugged Tablet App',
    disabled: true,
    href: '#',
  },
]

// ============================================================
// INTERNAL TAB NAVIGATION
// ============================================================

const activeTab = ref(0)

const tabs = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
  { title: 'Perangkat', icon: 'mdi-tablet-cellphone' },
  { title: 'Mode Keamanan', icon: 'mdi-shield-check-outline' },
  { title: 'Koneksi BLE', icon: 'mdi-bluetooth' },
  { title: 'Penyimpanan & Sinkronisasi', icon: 'mdi-database-sync-outline' },
  { title: 'Pengaturan', icon: 'mdi-cog-outline' },
  { title: 'Audit Log', icon: 'mdi-script-text-outline' },
]

// ============================================================
// NOTIFICATION & PRESENTATION FEEDBACK STATE
// ============================================================

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

function showToast(text: string, color = 'success') {
  snackbar.value = { show: true, text, color }
}

const isRefreshing = ref(false)
const isScanning = ref(false)
const isSyncing = ref(false)

// Dynamic storage & sync metrics state
const localDataCount = ref(2450)
const usedStorageGB = ref(1.6)
const totalStorageGB = ref(8.0)
const pendingSyncCount = ref(12)

// ============================================================
// SETTINGS FORM STATE
// ============================================================

const settings = ref({
  serverUrl: 'https://avtur-api.pertamina.com/v1',
  syncInterval: 5,
  autoSync: true,
  kioskMode: true,
  usbBlock: true,
  screenshotBlock: true,
  airplaneGuard: true,
  geofenceGuard: true,
  requirePasscode: true,
  offlineStorageLimit: 8,
  bleAutoConnect: true,
  logRetentionDays: 30,
})

// ============================================================
// TABLET DEVICES STATE & COMPUTED METRICS
// ============================================================

const tablets = ref([
  {
    id: 'TAB-001',
    sn: 'RTA1A02001',
    name: 'Rugged Tab 01',
    model: 'Samsung Tab Active 5 Pro',
    location: 'Wamena (WMX)',
    status: 'Online',
    mode: 'Airplane Mode',
    battery: 82,
    ipAddress: '192.168.10.101',
    firmware: 'v2.4.1-build88',
    assignedOperator: 'Yohanes (OP-004)',
    batteryHealth: 'Baik (98%)',
    lastSync: '21 Agu 2026 10:28',
    syncAgo: '1 menit lalu',
  },
  {
    id: 'TAB-002',
    sn: 'RTA1A02002',
    name: 'Rugged Tab 02',
    model: 'Samsung Tab Active 5 Pro',
    location: 'Sentani (DJJ)',
    status: 'Online',
    mode: 'Airplane Mode',
    battery: 67,
    ipAddress: '192.168.10.102',
    firmware: 'v2.4.1-build88',
    assignedOperator: 'Budi Santoso (OP-002)',
    batteryHealth: 'Baik (94%)',
    lastSync: '21 Agu 2026 10:26',
    syncAgo: '3 menit lalu',
  },
  {
    id: 'TAB-003',
    sn: 'RTA1A02003',
    name: 'Rugged Tab 03',
    model: 'Samsung Tab Active 5 Pro',
    location: 'Timika (TIM)',
    status: 'Online',
    mode: 'Airplane Mode',
    battery: 74,
    ipAddress: '192.168.10.103',
    firmware: 'v2.4.0-build80',
    assignedOperator: 'Ahmad Dahlan (OP-007)',
    batteryHealth: 'Sangat Baik (100%)',
    lastSync: '21 Agu 2026 10:27',
    syncAgo: '2 menit lalu',
  },
  {
    id: 'TAB-004',
    sn: 'RTA1A02004',
    name: 'Rugged Tab 04',
    model: 'Samsung Tab Active 5 Pro',
    location: 'Dekai (DKI)',
    status: 'Offline',
    mode: 'Airplane Mode',
    battery: 45,
    ipAddress: '192.168.10.104',
    firmware: 'v2.3.9-build75',
    assignedOperator: 'Kornelius (OP-011)',
    batteryHealth: 'Perlu Perhatian (81%)',
    lastSync: '20 Agu 2026 16:05',
    syncAgo: '18 jam lalu',
  },
  {
    id: 'TAB-005',
    sn: 'RTA1A02005',
    name: 'Rugged Tab 05',
    model: 'Samsung Tab Active 5 Pro',
    location: 'Mulia (MII)',
    status: 'Online',
    mode: 'Airplane Mode',
    battery: 88,
    ipAddress: '192.168.10.105',
    firmware: 'v2.4.1-build88',
    assignedOperator: 'Markus (OP-009)',
    batteryHealth: 'Sangat Baik (99%)',
    lastSync: '21 Agu 2026 10:28',
    syncAgo: '1 menit lalu',
  },
])

// Filter & Search State for Tablets Table
const tabletSearch = ref('')
const tabletStatusFilter = ref('Semua')
const tabletLocationFilter = ref('Semua')

const onlineTabletCount = computed(() => tablets.value.filter(t => t.status === 'Online').length)
const offlineTabletCount = computed(() => tablets.value.filter(t => t.status === 'Offline').length)
const totalTabletCount = computed(() => tablets.value.length)

// Dynamic Dashboard Metrics
const metrics = computed(() => [
  {
    title: 'Perangkat Aktif',
    count: `${onlineTabletCount.value}`,
    unit: `dari ${totalTabletCount.value} perangkat`,
    sub: `Online: ${onlineTabletCount.value} • Offline: ${offlineTabletCount.value}`,
    icon: 'mdi-tablet',
    color: 'primary',
  },
  {
    title: 'Mode Keamanan',
    count: settings.value.airplaneGuard ? 'Aktif' : 'Nonaktif',
    unit: 'Airplane Mode Guard',
    sub: settings.value.airplaneGuard ? 'Enforcement Active' : 'Enforcement Disabled',
    icon: 'mdi-shield-check',
    color: settings.value.airplaneGuard ? 'success' : 'warning',
  },
  {
    title: 'Sinkronisasi Terakhir',
    count: '21 Agu 2026 10:28',
    unit: 'Semua perangkat',
    sub: `${pendingSyncCount.value} antrean pending`,
    icon: 'mdi-cloud-check-outline',
    color: 'info',
  },
  {
    title: 'Data Tersimpan Lokal',
    count: localDataCount.value.toLocaleString('id-ID'),
    unit: 'Transaksi',
    sub: 'Terenkripsi AES-256',
    icon: 'mdi-database-outline',
    color: 'purple',
  },
  {
    title: 'Status Penyimpanan',
    count: `${usedStorageGB.value.toFixed(1)} GB / ${totalStorageGB.value} GB`,
    unit: `${Math.round((usedStorageGB.value / totalStorageGB.value) * 100)}% digunakan`,
    sub: '',
    progress: Math.round((usedStorageGB.value / totalStorageGB.value) * 100),
    icon: 'mdi-harddisk',
    color: 'teal',
  },
])

// Filtered Tablets List
const filteredTablets = computed(() => {
  return tablets.value.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(tabletSearch.value.toLowerCase()) ||
      t.id.toLowerCase().includes(tabletSearch.value.toLowerCase()) ||
      t.sn.toLowerCase().includes(tabletSearch.value.toLowerCase())
    const matchesStatus = tabletStatusFilter.value === 'Semua' || t.status === tabletStatusFilter.value
    const matchesLocation = tabletLocationFilter.value === 'Semua' || t.location === tabletLocationFilter.value
    return matchesSearch && matchesStatus && matchesLocation
  })
})

// Modal State: Form Tambah/Edit
const tabletDialog = ref(false)
const isEditMode = ref(false)
const tabletForm = ref({
  id: '',
  sn: '',
  name: '',
  model: 'Samsung Tab Active 5 Pro',
  location: 'Wamena (WMX)',
  status: 'Online',
  mode: 'Airplane Mode',
  battery: 100,
  ipAddress: '192.168.10.100',
  firmware: 'v2.4.1-build88',
  assignedOperator: 'Operator Lapangan',
  batteryHealth: 'Sangat Baik (100%)',
})

// Modal State: View Details
const detailDialog = ref(false)
const selectedTablet = ref<any>(null)

// Modal State: Security Config
const securityDialog = ref(false)

// Modal State: Add BLE Device
const bleDialog = ref(false)
const bleForm = ref({
  id: '',
  type: 'Digital Flowmeter',
  signal: '-58 dBm',
  status: 'Terhubung',
  macAddress: 'AA:BB:CC:11:22:33',
})

// Modal State: BLE Scan Results Pop-up
const scanDialog = ref(false)
const scannedMockups = ref<any[]>([])

// Modal State: Sync Queue Detail
const syncQueueDialog = ref(false)

// Modal State: Audit Log Detail
const auditDetailDialog = ref(false)
const selectedAuditLog = ref<any>(null)

const locationOptions = ['Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)', 'Dekai (DKI)', 'Mulia (MII)']
const locationFilterOptions = ['Semua', 'Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)', 'Dekai (DKI)', 'Mulia (MII)']
const bleTypeOptions = [
  'Digital Flowmeter',
  'Solenoid Valve (ATEX)',
  'Refueling Skid Controller',
  'RFID Reader',
  'Pressure Sensor',
  'Temperature Probe',
]

// ============================================================
// BLE DEVICES STATE
// ============================================================

const bleDevices = ref([
  {
    id: 'FLOW-001',
    type: 'Digital Flowmeter',
    signal: '-58 dBm',
    status: 'Terhubung',
    macAddress: '88:4A:18:90:AB:01',
    lastConnected: '21 Agu 2026 10:27',
  },
  {
    id: 'SOL-001',
    type: 'Solenoid Valve (ATEX)',
    signal: '-62 dBm',
    status: 'Terhubung',
    macAddress: '88:4A:18:90:AB:02',
    lastConnected: '21 Agu 2026 10:27',
  },
  {
    id: 'SKID-001',
    type: 'Refueling Skid Controller',
    signal: '-55 dBm',
    status: 'Terhubung',
    macAddress: '88:4A:18:90:AB:03',
    lastConnected: '21 Agu 2026 10:27',
  },
  {
    id: 'RFID-READER',
    type: 'RFID Reader',
    signal: '-65 dBm',
    status: 'Terhubung',
    macAddress: '88:4A:18:90:AB:04',
    lastConnected: '21 Agu 2026 10:27',
  },
])

// Mock Sync Queue Pending Transactions
const syncQueueItems = ref([
  { id: 'TX-9901', type: 'Refueling Log', volume: '12,500 L', timestamp: '21 Agu 10:25', status: 'Pending Upload' },
  { id: 'TX-9902', type: 'Refueling Log', volume: '8,200 L', timestamp: '21 Agu 10:20', status: 'Pending Upload' },
  { id: 'TX-9903', type: 'QC Checklist', volume: '-', timestamp: '21 Agu 10:15', status: 'Pending Upload' },
  { id: 'TX-9904', type: 'Refueling Log', volume: '15,000 L', timestamp: '21 Agu 10:10', status: 'Pending Upload' },
  { id: 'TX-9905', type: 'Density Test', volume: '-', timestamp: '21 Agu 10:02', status: 'Pending Upload' },
])

// ============================================================
// AUDIT LOGS DATA & FILTERING
// ============================================================

const auditLogs = ref([
  {
    id: 'LOG-8901',
    timestamp: '21 Agu 2026 10:28:14',
    operator: 'Yohanes (OP-004)',
    device: 'TAB-001',
    action: 'Sinkronisasi Data',
    detail: '12 transaksi berhasil diunggah ke server pusat',
    status: 'Sukses',
    ip: '192.168.10.101',
  },
  {
    id: 'LOG-8900',
    timestamp: '21 Agu 2026 10:25:30',
    operator: 'Sistem Automated',
    device: 'TAB-004',
    action: 'Koneksi Terputus',
    detail: 'Perangkat berpindah ke status Offline karena timeout jaringan',
    status: 'Peringatan',
    ip: '192.168.10.104',
  },
  {
    id: 'LOG-8899',
    timestamp: '21 Agu 2026 10:15:02',
    operator: 'Budi Santoso (OP-002)',
    device: 'TAB-002',
    action: 'Pairing BLE',
    detail: 'Terhubung dengan FLOW-001 (Signal -58 dBm, MAC 88:4A:18:90:AB:01)',
    status: 'Sukses',
    ip: '192.168.10.102',
  },
  {
    id: 'LOG-8898',
    timestamp: '21 Agu 2026 09:40:11',
    operator: 'Admin Keamanan',
    device: 'TAB-003',
    action: 'Perubahan Mode Keamanan',
    detail: 'Memperbarui Airplane Mode Guard Enforcement dan Kiosk Lockdown',
    status: 'Sukses',
    ip: '192.168.10.103',
  },
  {
    id: 'LOG-8897',
    timestamp: '21 Agu 2026 08:12:00',
    operator: 'Yohanes (OP-004)',
    device: 'TAB-001',
    action: 'Login Pengguna',
    detail: 'Sesi login berhasil diverifikasi via RFID Tag ID #883921',
    status: 'Sukses',
    ip: '192.168.10.101',
  },
])

const auditSearch = ref('')
const auditStatusFilter = ref('Semua')

const filteredAuditLogs = computed(() => {
  return auditLogs.value.filter(log => {
    const matchesSearch =
      log.id.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.operator.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.detail.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.device.toLowerCase().includes(auditSearch.value.toLowerCase())
    const matchesStatus = auditStatusFilter.value === 'Semua' || log.status === auditStatusFilter.value
    return matchesSearch && matchesStatus
  })
})

// Pagination for Audit Logs
const auditPage = ref(1)
const auditItemsPerPage = ref(5)

const paginatedAuditLogs = computed(() => {
  const start = (auditPage.value - 1) * auditItemsPerPage.value
  const end = start + auditItemsPerPage.value
  return filteredAuditLogs.value.slice(start, end)
})

const auditPageCount = computed(() => {
  return Math.max(1, Math.ceil(filteredAuditLogs.value.length / auditItemsPerPage.value))
})

// Helper Function for Dynamic Audit Logging
function addAuditLog(
  operator: string,
  device: string,
  action: string,
  detail: string,
  status: 'Sukses' | 'Peringatan' | 'Gagal' = 'Sukses'
) {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  const formattedTime = `Hari Ini ${timeStr}`
  const newId = `LOG-${Math.floor(8902 + Math.random() * 1000)}`

  auditLogs.value.unshift({
    id: newId,
    timestamp: formattedTime,
    operator,
    device,
    action,
    detail,
    status,
    ip: '192.168.10.100',
  })
}

// ============================================================
// PAGINATION FOR TABLETS
// ============================================================

const page = ref(1)
const itemsPerPage = ref(10)

const paginatedTablets = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTablets.value.slice(start, end)
})

const pageCount = computed(() => {
  return Math.max(1, Math.ceil(filteredTablets.value.length / itemsPerPage.value))
})

// ============================================================
// BUTTON ACTIONS & INTERACTIVE HANDLERS
// ============================================================

function refreshTablets() {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
    tablets.value.forEach(t => {
      if (t.status === 'Online') {
        t.syncAgo = 'Baru saja'
      }
    })
    addAuditLog('Operator Sistem', 'SEMUA', 'Refresh Status', 'Memperbarui telemetry seluruh tablet', 'Sukses')
    showToast('Data status tablet berhasil diperbarui dari server!', 'success')
  }, 700)
}

function openAddTabletDialog() {
  isEditMode.value = false
  tabletForm.value = {
    id: `TAB-00${tablets.value.length + 1}`,
    sn: `RTA1A0200${tablets.value.length + 1}`,
    name: `Rugged Tab 0${tablets.value.length + 1}`,
    model: 'Samsung Tab Active 5 Pro',
    location: 'Wamena (WMX)',
    status: 'Online',
    mode: 'Airplane Mode',
    battery: 100,
    ipAddress: `192.168.10.10${tablets.value.length + 1}`,
    firmware: 'v2.4.1-build88',
    assignedOperator: 'Operator Lapangan',
    batteryHealth: 'Sangat Baik (100%)',
  }
  tabletDialog.value = true
}

function openEditTabletDialog(item: any) {
  isEditMode.value = true
  tabletForm.value = { ...item }
  tabletDialog.value = true
}

function saveTablet() {
  if (!tabletForm.value.name || !tabletForm.value.id) {
    showToast('Harap isi ID dan Nama Perangkat', 'error')
    return
  }

  if (isEditMode.value) {
    const index = tablets.value.findIndex(t => t.id === tabletForm.value.id)
    if (index !== -1) {
      tablets.value[index] = { ...tablets.value[index], ...tabletForm.value }
      addAuditLog(
        'Admin Keamanan',
        tabletForm.value.id,
        'Edit Perangkat',
        `Memperbarui konfigurasi ${tabletForm.value.name}`,
        'Sukses'
      )
      showToast(`Data perangkat ${tabletForm.value.id} berhasil diperbarui`)
    }
  } else {
    tablets.value.unshift({
      ...tabletForm.value,
      lastSync: 'Baru Saja',
      syncAgo: '0 menit lalu',
    })
    addAuditLog(
      'Admin Keamanan',
      tabletForm.value.id,
      'Registrasi Perangkat',
      `Perangkat ${tabletForm.value.name} terdaftar`,
      'Sukses'
    )
    showToast(`Perangkat ${tabletForm.value.id} berhasil ditambahkan`)
  }
  tabletDialog.value = false
}

function deleteTablet(id: string) {
  tablets.value = tablets.value.filter(t => t.id !== id)
  addAuditLog('Admin Keamanan', id, 'Hapus Perangkat', `Perangkat ${id} dihapus dari daftar registrasi`, 'Peringatan')
  showToast(`Perangkat ${id} berhasil dihapus dari sistem`, 'warning')
}

function toggleDeviceStatus(tablet: any) {
  tablet.status = tablet.status === 'Online' ? 'Offline' : 'Online'
  const newStatus = tablet.status
  addAuditLog(
    'Operator Lapangan',
    tablet.id,
    'Ubah Status',
    `Status perangkat diubah menjadi ${newStatus}`,
    newStatus === 'Online' ? 'Sukses' : 'Peringatan'
  )
  showToast(`Status ${tablet.id} diubah menjadi ${newStatus}`, newStatus === 'Online' ? 'success' : 'warning')
}

function viewTabletDetails(tablet: any) {
  selectedTablet.value = tablet
  detailDialog.value = true
}

// BLE SCANNER POPUP HANDLER
function scanBleDevices() {
  isScanning.value = true
  scannedMockups.value = []
  
  setTimeout(() => {
    isScanning.value = false
    scannedMockups.value = [
      { id: 'PRESS-001', type: 'Pressure Sensor (ATEX)', signal: '-52 dBm', macAddress: '88:4A:18:90:FF:11' },
      { id: 'TEMP-002', type: 'Temperature Probe', signal: '-61 dBm', macAddress: '88:4A:18:90:FF:22' },
      { id: 'DENS-003', type: 'Density Sensor (Avtur)', signal: '-48 dBm', macAddress: '88:4A:18:90:FF:33' },
    ]
    scanDialog.value = true
    addAuditLog(
      'Sistem BLE',
      'LOCAL-BT',
      'Pemindaian BLE',
      `Ditemukan ${scannedMockups.value.length} perangkat BLE nirkabel baru`,
      'Sukses'
    )
  }, 1200)
}

function connectDiscoveredDevice(device: any) {
  const exists = bleDevices.value.some(d => d.id === device.id)
  if (exists) {
    showToast(`Perangkat ${device.id} sudah terhubung sebelumnya`, 'warning')
    return
  }

  bleDevices.value.unshift({
    id: device.id,
    type: device.type,
    signal: device.signal,
    status: 'Terhubung',
    macAddress: device.macAddress,
    lastConnected: 'Baru Saja',
  })

  addAuditLog(
    'Operator Lapangan',
    device.id,
    'Koneksi BLE Hasil Scan',
    `Perangkat BLE ${device.id} (${device.type}) terhubung via scanner`,
    'Sukses'
  )

  scanDialog.value = false
  showToast(`Berhasil terhubung dengan ${device.id}!`, 'success')
}

function openAddBleDialog() {
  bleForm.value = {
    id: `BLE-00${bleDevices.value.length + 1}`,
    type: 'Digital Flowmeter',
    signal: '-58 dBm',
    status: 'Terhubung',
    macAddress: '88:4A:18:90:AB:05',
  }
  bleDialog.value = true
}

function saveBleDevice() {
  if (!bleForm.value.id) {
    showToast('Harap isi ID Perangkat BLE', 'error')
    return
  }
  bleDevices.value.unshift({
    id: bleForm.value.id,
    type: bleForm.value.type,
    signal: bleForm.value.signal,
    status: bleForm.value.status,
    macAddress: bleForm.value.macAddress,
    lastConnected: 'Baru Saja',
  })
  addAuditLog(
    'Operator Lapangan',
    bleForm.value.id,
    'Pairing BLE Baru',
    `Periferal BLE ${bleForm.value.id} (${bleForm.value.type}) dipasangkan`,
    'Sukses'
  )
  showToast(`Perangkat BLE ${bleForm.value.id} berhasil ditambahkan!`, 'success')
  bleDialog.value = false
}

function toggleBleConnection(device: any) {
  if (device.status === 'Terhubung') {
    device.status = 'Terputus'
    addAuditLog('Operator Lapangan', device.id, 'Putus Koneksi BLE', `Koneksi ke ${device.type} diputuskan`, 'Peringatan')
    showToast(`Koneksi BLE ${device.id} diputuskan`, 'warning')
  } else {
    device.status = 'Terhubung'
    device.lastConnected = 'Baru Saja'
    addAuditLog(
      'Operator Lapangan',
      device.id,
      'Hubungkan BLE',
      `Koneksi ke ${device.type} berhasil terhubung`,
      'Sukses'
    )
    showToast(`Koneksi BLE ${device.id} terhubung kembali`, 'success')
  }
}

function clearLocalCache() {
  if (usedStorageGB.value > 1.4) {
    usedStorageGB.value = 1.4
    showToast('Cache lokal berhasil dibersihkan. Memori 0.2 GB dipulihkan.', 'success')
    addAuditLog('Sistem Pembersihan', 'LOCAL-SYS', 'Bersihkan Cache', 'Pembersihan memori temporary 0.2 GB', 'Sukses')
  } else {
    showToast('Cache lokal sudah bersih.', 'info')
  }
}

function forceSync() {
  isSyncing.value = true
  setTimeout(() => {
    isSyncing.value = false
    const syncedCount = pendingSyncCount.value
    pendingSyncCount.value = 0
    syncQueueItems.value = []
    localDataCount.value += syncedCount > 0 ? syncedCount : 12

    addAuditLog(
      'Manual Presenter',
      'TAB-001',
      'Paksa Sinkronisasi',
      `${syncedCount > 0 ? syncedCount : 12} transaksi lokal berhasil diunggah`,
      'Sukses'
    )
    showToast(
      `${syncedCount > 0 ? syncedCount : 12} Transaksi lokal berhasil disinkronkan ke server pusat!`,
      'success'
    )
  }, 1000)
}

function viewAuditDetail(log: any) {
  selectedAuditLog.value = log
  auditDetailDialog.value = true
}

function saveSecurityConfig() {
  addAuditLog(
    'Admin Keamanan',
    'GLOBAL-SEC',
    'Update Parameter Keamanan',
    `Airplane Guard: ${settings.value.airplaneGuard ? 'Aktif' : 'Nonaktif'}, Geofence Guard: ${settings.value.geofenceGuard ? 'Aktif' : 'Nonaktif'}, BLE Auto-connect: ${settings.value.bleAutoConnect ? 'Aktif' : 'Nonaktif'}`,
    'Sukses'
  )
  securityDialog.value = false
  showToast('Kebijakan dan parameter keamanan berhasil diperbarui!', 'success')
}

function saveSettings() {
  addAuditLog(
    'System Admin',
    'GLOBAL-CFG',
    'Simpan Pengaturan',
    `Interval: ${settings.value.syncInterval}m, Kiosk Mode: ${settings.value.kioskMode}`,
    'Sukses'
  )
  showToast('Pengaturan konfigurasi tablet berhasil disimpan.', 'success')
}

function handleKioskToggle(val: boolean) {
  addAuditLog('System Admin', 'KIOSK-SYS', 'Toggle Kiosk Mode', `Kiosk Single-App Lock diubah ke ${val ? 'ON' : 'OFF'}`, 'Sukses')
  showToast(`Kiosk Mode ${val ? 'Diaktifkan' : 'Dinonaktifkan'}`, val ? 'success' : 'warning')
}

function handleUsbBlockToggle(val: boolean) {
  settings.value.usbBlock = val
  addAuditLog('Admin Keamanan', 'PORT-SEC', 'Toggle USB Block', `Akses USB Port Lock diubah ke ${val ? 'ON' : 'OFF'}`, 'Sukses')
  showToast(`Blokir Port USB ${val ? 'Diaktifkan' : 'Dinonaktifkan'}`, val ? 'success' : 'warning')
}

function handleScreenshotToggle(val: boolean) {
  settings.value.screenshotBlock = val
  addAuditLog('Admin Keamanan', 'SEC-DISP', 'Toggle Screenshot Guard', `Proteksi Tangkapan Layar diubah ke ${val ? 'ON' : 'OFF'}`, 'Sukses')
  showToast(`Pembatasan Tangkapan Layar ${val ? 'Diaktifkan' : 'Dinonaktifkan'}`, val ? 'success' : 'warning')
}

function clearAuditLogs() {
  auditLogs.value = []
  showToast('Seluruh riwayat audit log telah dibersihkan', 'warning')
}

function exportAuditLogs() {
  if (auditLogs.value.length === 0) {
    showToast('Tidak ada data audit log untuk diekspor', 'warning')
    return
  }

  const headers = ['ID Log', 'Waktu', 'Operator', 'Perangkat', 'Aksi', 'Detail Aktivitas', 'Status', 'IP Address']
  const rows = auditLogs.value.map(log => [
    log.id,
    `"${log.timestamp}"`,
    `"${log.operator}"`,
    `"${log.device}"`,
    `"${log.action}"`,
    `"${log.detail.replace(/"/g, '""')}"`,
    log.status,
    log.ip || '192.168.10.100',
  ])

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `Audit_Log_Rugged_Tablet_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  addAuditLog('System Admin', 'LOG-EXP', 'Ekspor CSV', 'Mengunduh file audit log format CSV', 'Sukses')
  showToast('Audit Log berhasil diekspor ke format CSV.', 'info')
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

function getBatteryIcon(battery: number) {
  if (battery > 75) return 'mdi-battery-high'
  if (battery > 40) return 'mdi-battery-medium'
  return 'mdi-battery-low'
}

function getBatteryColor(battery: number) {
  if (battery > 50) return 'success'
  return 'warning'
}

function getDeviceStatusColor(status: string) {
  return status === 'Online' ? 'success' : 'error'
}

function getDeviceStatusIcon(status: string) {
  return status === 'Online' ? 'mdi-circle' : 'mdi-circle-outline'
}

function getLogStatusColor(status: string) {
  if (status === 'Sukses') return 'success'
  if (status === 'Peringatan') return 'warning'
  return 'error'
}
</script>

<template>
  <div class="page-shell pa-6 bg-grey-lighten-4">

    <!-- BREADCRUMBS -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />

    <!-- PAGE HEADER -->
    <div class="mb-5">
      <h1 class="text-h5 font-weight-bold text-grey-darken-3">
        Rugged Tablet App
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
        Monitoring perangkat operasional, keamanan, BLE, penyimpanan lokal, dan sinkronisasi data lapangan.
      </p>
    </div>

    <!-- MAIN AVTUR NAVIGATION -->
    <AvturTopNav />

    <!-- INTERNAL PAGE NAVIGATION -->
    <v-card variant="flat" class="border rounded-lg bg-white mb-6 overflow-hidden">
      <v-tabs v-model="activeTab" color="primary" show-arrows class="rugged-tabs">
        <v-tab
          v-for="(tab, index) in tabs"
          :key="index"
          :value="index"
          class="text-none font-weight-medium"
        >
          <v-icon :icon="tab.icon" size="18" class="mr-2" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- TAB CONTENT WINDOWS -->
    <v-window v-model="activeTab">

      <!-- TAB 0: DASHBOARD -->
      <v-window-item :value="0">
        <v-row class="mb-6">
          <v-col
            v-for="(metric, index) in metrics"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            lg="4"
            xl="2"
            class="metric-col"
          >
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 metric-card">
              <div class="d-flex align-center justify-space-between mb-3">
                <span class="text-caption font-weight-bold text-grey-darken-1">
                  {{ metric.title }}
                </span>
                <v-avatar :color="metric.color" variant="tonal" size="36">
                  <v-icon :icon="metric.icon" size="19" />
                </v-avatar>
              </div>

              <div
                class="font-weight-bold text-grey-darken-4 mb-1"
                :class="metric.count.length > 12 ? 'text-subtitle-1' : 'text-h5'"
              >
                {{ metric.count }}
              </div>

              <div class="text-caption text-grey-darken-1">
                {{ metric.unit }}
              </div>

              <v-progress-linear
                v-if="metric.progress !== undefined"
                :model-value="metric.progress"
                :color="metric.color"
                height="6"
                rounded
                class="mt-3"
              />

              <div v-else-if="metric.sub" class="text-caption text-medium-emphasis mt-1">
                {{ metric.sub }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-6">
          <v-col cols="12" md="6">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
              <div class="d-flex align-center justify-space-between mb-4">
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Ringkasan Perangkat Aktif
                </div>
                <v-btn variant="text" color="primary" size="small" class="text-none" @click="activeTab = 1">
                  Lihat Semua
                </v-btn>
              </div>

              <div class="d-flex flex-column ga-3">
                <div
                  v-for="tabIn in tablets.slice(0, 3)"
                  :key="tabIn.id"
                  class="d-flex align-center justify-space-between pa-3 rounded-lg border bg-grey-lighten-5"
                >
                  <div class="d-flex align-center ga-3">
                    <v-avatar color="primary" variant="tonal" size="36">
                      <v-icon icon="mdi-tablet" size="18" />
                    </v-avatar>
                    <div>
                      <div class="font-weight-bold text-body-2">{{ tabIn.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ tabIn.location }}</div>
                    </div>
                  </div>

                  <v-chip size="small" :color="getDeviceStatusColor(tabIn.status)" variant="tonal">
                    {{ tabIn.status }}
                  </v-chip>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
              <div class="d-flex align-center justify-space-between mb-4">
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Status Keamanan & Sistem
                </div>
                <v-chip
                  size="small"
                  :color="settings.airplaneGuard ? 'success' : 'warning'"
                  variant="tonal"
                >
                  {{ settings.airplaneGuard ? 'Proteksi On' : 'Proteksi Terbatas' }}
                </v-chip>
              </div>

              <div class="security-banner pa-4 rounded-lg mb-4">
                <div class="d-flex align-start ga-3">
                  <v-avatar color="primary" variant="tonal" size="40">
                    <v-icon icon="mdi-shield-check" size="22" />
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold">Airplane Mode Guard</div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      Seluruh tablet terkunci dalam mode aman operasional fueling.
                    </div>
                  </div>
                </div>
              </div>

              <div class="d-flex justify-space-between align-center text-caption pt-2">
                <span class="text-medium-emphasis">Koneksi BLE Terhubung</span>
                <span class="font-weight-bold text-success">{{ bleDevices.filter((b: any) => b.status === 'Terhubung').length }} Perangkat</span>
              </div>
              <v-divider class="my-2" />
              <div class="d-flex justify-space-between align-center text-caption">
                <span class="text-medium-emphasis">Penyimpanan Terpakai</span>
                <span class="font-weight-bold">{{ usedStorageGB.toFixed(1) }} GB / {{ totalStorageGB }} GB</span>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-alert
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-information-outline"
          class="rounded-lg border"
        >
          <template #title>
            <span class="text-subtitle-2 font-weight-bold">
              Arsitektur Offline-First
            </span>
          </template>
          <span class="text-caption">
            Aplikasi dirancang untuk tetap dapat digunakan pada lingkungan dengan konektivitas terbatas.
            Data transaksi, checklist, dan informasi operasional disimpan secara lokal pada perangkat dan akan disinkronisasikan ketika koneksi tersedia.
          </span>
        </v-alert>
      </v-window-item>

      <!-- TAB 1: PERANGKAT -->
      <v-window-item :value="1">
        <v-card variant="flat" class="border rounded-lg bg-white mb-6">
          <div class="pa-5 pb-3">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Status & Manajemen Perangkat Tablet
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Daftar seluruh unit tablet rugged yang terdaftar dalam sistem pengisian avtur.
                </div>
              </div>

              <div class="d-flex align-center ga-2">
                <v-btn
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-refresh"
                  :loading="isRefreshing"
                  class="text-none"
                  @click="refreshTablets"
                >
                  Refresh
                </v-btn>

                <v-btn
                  variant="flat"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                  class="text-none font-weight-bold"
                  @click="openAddTabletDialog"
                >
                  Tambah Tablet
                </v-btn>
              </div>
            </div>

            <!-- FILTER & SEARCH BAR -->
            <v-row density="compact" class="mt-4">
              <v-col cols="12" sm="4" md="5">
                <v-text-field
                  v-model="tabletSearch"
                  placeholder="Cari ID, Nama, atau SN Tablet..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" sm="4" md="3.5">
                <v-select
                  v-model="tabletStatusFilter"
                  :items="['Semua', 'Online', 'Offline']"
                  label="Filter Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="6" sm="4" md="3.5">
                <v-select
                  v-model="tabletLocationFilter"
                  :items="locationFilterOptions"
                  label="Filter Lokasi Bandara"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

          <div class="table-wrapper">
            <v-table density="comfortable" class="rugged-table">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="font-weight-bold text-caption">ID Perangkat</th>
                  <th class="font-weight-bold text-caption">Nama Perangkat</th>
                  <th class="font-weight-bold text-caption">Lokasi</th>
                  <th class="font-weight-bold text-caption">Status</th>
                  <th class="font-weight-bold text-caption">Mode Keamanan</th>
                  <th class="font-weight-bold text-caption">Baterai</th>
                  <th class="font-weight-bold text-caption">Sinkronisasi</th>
                  <th class="font-weight-bold text-caption text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="filteredTablets.length === 0">
                  <td colspan="8" class="text-center py-6 text-caption text-medium-emphasis">
                    Tidak ada data tablet yang sesuai dengan filter pencarian.
                  </td>
                </tr>
                <tr v-for="tablet in paginatedTablets" :key="tablet.id">
                  <td>
                    <div class="d-flex align-center ga-2">
                      <v-avatar color="primary" variant="tonal" size="32">
                        <v-icon icon="mdi-tablet" size="17" />
                      </v-avatar>
                      <div>
                        <div class="font-weight-bold text-body-2">{{ tablet.id }}</div>
                        <div class="text-caption text-medium-emphasis">SN: {{ tablet.sn }}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div class="font-weight-medium text-body-2">{{ tablet.name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ tablet.model }}</div>
                  </td>

                  <td class="text-body-2">{{ tablet.location }}</td>

                  <td>
                    <v-chip size="small" :color="getDeviceStatusColor(tablet.status)" variant="tonal">
                      <v-icon :icon="getDeviceStatusIcon(tablet.status)" size="8" class="mr-1" />
                      {{ tablet.status }}
                    </v-chip>
                  </td>

                  <td>
                    <v-chip size="x-small" color="primary" variant="outlined" prepend-icon="mdi-airplane">
                      {{ tablet.mode }}
                    </v-chip>
                  </td>

                  <td>
                    <div class="d-flex align-center ga-2">
                      <v-icon
                        :icon="getBatteryIcon(tablet.battery)"
                        :color="getBatteryColor(tablet.battery)"
                        size="18"
                      />
                      <span class="text-body-2 font-weight-medium">{{ tablet.battery }}%</span>
                    </div>
                  </td>

                  <td>
                    <div class="text-body-2 font-weight-medium">{{ tablet.lastSync }}</div>
                    <div class="text-caption text-medium-emphasis">{{ tablet.syncAgo }}</div>
                  </td>

                  <td class="text-center">
                    <v-btn
                      icon="mdi-eye-outline"
                      variant="text"
                      size="small"
                      color="grey-darken-1"
                      aria-label="Lihat perangkat"
                      @click="viewTabletDetails(tablet)"
                    />

                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-dots-vertical"
                          variant="text"
                          size="small"
                          color="grey-darken-1"
                        />
                      </template>
                      <v-list density="compact" class="py-1">
                        <v-list-item prepend-icon="mdi-pencil-outline" @click="openEditTabletDialog(tablet)">
                          <v-list-item-title class="text-body-2">Edit Data</v-list-item-title>
                        </v-list-item>
                        <v-list-item prepend-icon="mdi-toggle-switch-outline" @click="toggleDeviceStatus(tablet)">
                          <v-list-item-title class="text-body-2">
                            Set {{ tablet.status === 'Online' ? 'Offline' : 'Online' }}
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item prepend-icon="mdi-sync" @click="forceSync">
                          <v-list-item-title class="text-body-2">Trigger Sync</v-list-item-title>
                        </v-list-item>
                        <v-divider class="my-1" />
                        <v-list-item prepend-icon="mdi-delete-outline" color="error" @click="deleteTablet(tablet.id)">
                          <v-list-item-title class="text-body-2 text-error">Hapus Perangkat</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex align-center justify-space-between pa-4 flex-wrap ga-3">
            <span class="text-caption text-medium-emphasis">
              Menampilkan {{ filteredTablets.length ? 1 : 0 }} - {{ Math.min(itemsPerPage, filteredTablets.length) }} dari {{ filteredTablets.length }} perangkat
            </span>

            <div class="d-flex align-center ga-2">
              <v-pagination v-model="page" :length="pageCount" density="compact" :total-visible="3" />
              <v-select
                v-model="itemsPerPage"
                :items="[10, 25]"
                suffix="/ halaman"
                variant="outlined"
                density="compact"
                hide-details
                style="width: 130px"
              />
            </div>
          </div>
        </v-card>
      </v-window-item>

      <!-- TAB 2: MODE KEAMANAN -->
      <v-window-item :value="2">
        <v-row class="mb-6" align="stretch">
          <v-col cols="12" md="6" class="d-flex flex-column">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 d-flex flex-column">
              <div>
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                      Airplane Mode Guard
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      Proteksi jaringan di area rawan ledakan / apron.
                    </div>
                  </div>
                  <v-chip
                    size="small"
                    :color="settings.airplaneGuard ? 'success' : 'warning'"
                    variant="tonal"
                    prepend-icon="mdi-shield-check"
                  >
                    {{ settings.airplaneGuard ? 'Aktif' : 'Nonaktif' }}
                  </v-chip>
                </div>

                <div class="security-banner pa-4 rounded-lg mb-4">
                  <div class="d-flex align-start ga-3">
                    <v-avatar color="primary" variant="tonal" size="40">
                      <v-icon icon="mdi-airplane-takeoff" size="22" />
                    </v-avatar>
                    <div>
                      <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">
                        Kebijakan Keamanan Aktif
                      </div>
                      <div class="text-caption text-medium-emphasis mt-1">
                        Mode penerbangan dipaksa aktif selama proses refueling berlangsung.
                      </div>
                    </div>
                  </div>
                </div>

                <div class="d-flex flex-column ga-2">
                  <div class="detail-row py-1">
                    <span>Enforcement Status</span>
                    <span class="font-weight-bold" :class="settings.airplaneGuard ? 'text-success' : 'text-warning'">
                      {{ settings.airplaneGuard ? 'Mandatory (Wajib)' : 'Opsional' }}
                    </span>
                  </div>
                  <v-divider />
                  <div class="detail-row py-1">
                    <span>Sinyal Seluler (LTE/5G)</span>
                    <span class="font-weight-bold text-error">Nonaktif</span>
                  </div>
                  <v-divider />
                  <div class="detail-row py-1">
                    <span>Wi-Fi Status</span>
                    <span class="font-weight-bold text-warning">Terbatas (Satu Arah)</span>
                  </div>
                  <v-divider />
                  <div class="detail-row py-1">
                    <span>BLE (Bluetooth Low Energy)</span>
                    <span class="font-weight-bold text-success">Izinkan</span>
                  </div>
                  <v-divider />
                  <div class="detail-row py-1">
                    <span>Geofence Apron Guard</span>
                    <span class="font-weight-bold" :class="settings.geofenceGuard ? 'text-success' : 'text-grey'">
                      {{ settings.geofenceGuard ? 'Aktif (GPS Terkunci)' : 'Nonaktif' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-auto pt-5">
                <v-btn
                  variant="outlined"
                  color="primary"
                  block
                  height="40"
                  prepend-icon="mdi-shield-cog-outline"
                  class="text-none font-weight-bold"
                  @click="securityDialog = true"
                >
                  Konfigurasi Parameter Keamanan
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="6" class="d-flex flex-column">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 d-flex flex-column">
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">
                  Kiosk Mode & App Locking
                </div>
                <div class="text-caption text-medium-emphasis mb-4">
                  Membatasi penggunaan tablet hanya untuk aplikasi Avtur Monitoring.
                </div>

                <v-list density="comfortable" class="bg-transparent pa-0">
                  <v-list-item class="px-1 py-2">
                    <template #prepend>
                      <v-avatar color="grey-lighten-4" size="36" class="mr-3">
                        <v-icon icon="mdi-lock-outline" color="primary" size="20" />
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-bold">
                      Kiosk Single-App Lock
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption text-medium-emphasis">
                      Mencegah operator keluar dari aplikasi
                    </v-list-item-subtitle>
                    <template #append>
                      <div class="pr-2">
                        <v-switch
                          v-model="settings.kioskMode"
                          color="primary"
                          hide-details
                          density="compact"
                          @update:model-value="handleKioskToggle"
                        />
                      </div>
                    </template>
                  </v-list-item>

                  <v-divider />

                  <v-list-item class="px-1 py-2">
                    <template #prepend>
                      <v-avatar color="grey-lighten-4" size="36" class="mr-3">
                        <v-icon icon="mdi-usb-port" color="primary" size="20" />
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-bold">
                      Blokir Port USB
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption text-medium-emphasis">
                      Kunci transfer data melalui kabel USB
                    </v-list-item-subtitle>
                    <template #append>
                      <div class="pr-2">
                        <v-switch
                          v-model="settings.usbBlock"
                          color="primary"
                          hide-details
                          density="compact"
                          @update:model-value="handleUsbBlockToggle"
                        />
                      </div>
                    </template>
                  </v-list-item>

                  <v-divider />

                  <v-list-item class="px-1 py-2">
                    <template #prepend>
                      <v-avatar color="grey-lighten-4" size="36" class="mr-3">
                        <v-icon icon="mdi-camera-off-outline" color="primary" size="20" />
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-bold">
                      Pembatasan Tangkapan Layar
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption text-medium-emphasis">
                      Cegah screenshot data sensitif
                    </v-list-item-subtitle>
                    <template #append>
                      <div class="pr-2">
                        <v-switch
                          v-model="settings.screenshotBlock"
                          color="primary"
                          hide-details
                          density="compact"
                          @update:model-value="handleScreenshotToggle"
                        />
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </div>

              <div class="mt-auto pt-5">
                <v-btn
                  variant="outlined"
                  color="primary"
                  block
                  height="40"
                  prepend-icon="mdi-lock-reset"
                  class="text-none font-weight-bold"
                  @click="saveSettings"
                >
                  Simpan Kebijakan Kiosk
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 3: KONEKSI BLE -->
      <v-window-item :value="3">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Konektivitas Bluetooth Low Energy (BLE)
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Perangkat periferal dan sensor lapangan yang terhubung secara nirkabel.
              </div>
            </div>

            <div class="d-flex align-center ga-2">
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
                class="text-none"
                @click="openAddBleDialog"
              >
                Pasang Device BLE
              </v-btn>

              <v-btn
                variant="flat"
                color="primary"
                size="small"
                prepend-icon="mdi-bluetooth-audio"
                :loading="isScanning"
                class="text-none font-weight-bold"
                @click="scanBleDevices"
              >
                Pindai Perangkat Baru
              </v-btn>
            </div>
          </div>

          <v-row class="mt-2">
            <v-col v-for="device in bleDevices" :key="device.id" cols="12" md="6">
              <div class="ble-device-row pa-4 rounded-lg border">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center ga-3">
                    <v-avatar :color="device.status === 'Terhubung' ? 'primary' : 'grey'" variant="tonal" size="40">
                      <v-icon icon="mdi-bluetooth-connect" size="20" />
                    </v-avatar>
                    <div>
                      <div class="text-body-1 font-weight-bold">{{ device.id }}</div>
                      <div class="text-caption text-medium-emphasis">{{ device.type }}</div>
                    </div>
                  </div>

                  <v-chip size="small" :color="device.status === 'Terhubung' ? 'success' : 'error'" variant="tonal">
                    {{ device.status }}
                  </v-chip>
                </div>

                <v-divider class="my-3" />

                <div class="d-flex align-center justify-space-between text-caption">
                  <span class="text-medium-emphasis">Kekuatan Sinyal (RSSI)</span>
                  <span class="font-weight-bold" :class="device.status === 'Terhubung' ? 'text-success' : 'text-medium-emphasis'">
                    {{ device.status === 'Terhubung' ? device.signal : 'N/A' }}
                  </span>
                </div>

                <div class="d-flex align-center justify-space-between text-caption mt-1">
                  <span class="text-medium-emphasis">MAC Address</span>
                  <span class="font-weight-mono text-caption">{{ device.macAddress || '88:4A:18:90:AB:00' }}</span>
                </div>

                <div class="d-flex align-center justify-space-between text-caption mt-1">
                  <span class="text-medium-emphasis">Terakhir Terhubung</span>
                  <span class="font-weight-medium">{{ device.lastConnected }}</span>
                </div>

                <div class="mt-3 text-right">
                  <v-btn
                    size="x-small"
                    variant="tonal"
                    :color="device.status === 'Terhubung' ? 'error' : 'success'"
                    class="text-none"
                    @click="toggleBleConnection(device)"
                  >
                    {{ device.status === 'Terhubung' ? 'Putuskan Koneksi' : 'Hubungkan Kembali' }}
                  </v-btn>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- TAB 4: PENYIMPANAN & SINKRONISASI -->
      <v-window-item :value="4">
        <v-row class="mb-6">
          <v-col cols="12" md="6">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">
                Kapasitas Penyimpanan Lokal
              </div>
              <div class="text-caption text-medium-emphasis mb-5">
                Penggunaan memori internal tablet untuk data offline.
              </div>

              <div class="d-flex align-center ga-5 mb-5">
                <v-progress-circular
                  :model-value="Math.round((usedStorageGB / totalStorageGB) * 100)"
                  :size="96"
                  :width="12"
                  color="primary"
                >
                  <span class="text-subtitle-2 font-weight-bold">
                    {{ Math.round((usedStorageGB / totalStorageGB) * 100) }}%
                  </span>
                </v-progress-circular>

                <div class="d-flex flex-column ga-2 flex-grow-1">
                  <div class="d-flex justify-space-between text-caption">
                    <span class="text-medium-emphasis">Total Memori</span>
                    <span class="font-weight-bold">{{ totalStorageGB.toFixed(1) }} GB</span>
                  </div>
                  <div class="d-flex justify-space-between text-caption">
                    <span>
                      <v-icon icon="mdi-circle" size="8" color="primary" class="mr-1" />
                      Data Transaksi
                    </span>
                    <span class="font-weight-medium">1.1 GB</span>
                  </div>
                  <div class="d-flex justify-space-between text-caption">
                    <span>
                      <v-icon icon="mdi-circle" size="8" color="warning" class="mr-1" />
                      Lampiran & Foto
                    </span>
                    <span class="font-weight-medium">0.3 GB</span>
                  </div>
                  <div class="d-flex justify-space-between text-caption">
                    <span>
                      <v-icon icon="mdi-circle" size="8" color="teal" class="mr-1" />
                      System Cache
                    </span>
                    <span class="font-weight-medium">{{ (usedStorageGB - 1.4).toFixed(1) }} GB</span>
                  </div>
                </div>
              </div>

              <v-btn
                variant="outlined"
                color="primary"
                block
                prepend-icon="mdi-broom"
                class="text-none"
                @click="clearLocalCache"
              >
                Bersihkan Cache Lokal
              </v-btn>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Status Antrean Sinkronisasi
                </div>
                <v-btn
                  variant="text"
                  size="x-small"
                  color="primary"
                  class="text-none"
                  @click="syncQueueDialog = true"
                >
                  Lihat Detail Antrean
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mb-5">
                Data lokal yang siap diunggah ke server saat online.
              </div>

              <div class="sync-status-box pa-4 rounded-lg mb-4">
                <div class="d-flex align-center ga-2 mb-2">
                  <v-icon icon="mdi-sync" color="primary" size="20" />
                  <span class="text-body-2 font-weight-bold">{{ pendingSyncCount }} Transaksi Menunggu</span>
                </div>
                <div class="text-caption text-medium-emphasis">
                  Data tersimpan secara aman di penyimpanan lokal terenkripsi AES-256.
                </div>
              </div>

              <div class="d-flex flex-column ga-2 text-caption mb-5">
                <div class="d-flex justify-space-between">
                  <span>Terakhir Sinkronisasi Berhasil</span>
                  <span class="font-weight-bold">21 Agu 2026 10:28</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span>Kecepatan Upload Rata-rata</span>
                  <span class="font-weight-bold">1.2 Mbps</span>
                </div>
              </div>

              <v-btn
                variant="flat"
                color="primary"
                block
                prepend-icon="mdi-cloud-upload"
                :loading="isSyncing"
                class="text-none font-weight-bold"
                @click="forceSync"
              >
                Paksa Sinkronisasi Sekarang
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 5: PENGATURAN -->
      <v-window-item :value="5">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">
            Pengaturan Aplikasi Tablet
          </div>
          <div class="text-caption text-medium-emphasis mb-6">
            Konfigurasi koneksi API server, interval sinkronisasi, dan batas penyimpanan lokal.
          </div>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="settings.serverUrl"
                label="URL Server Utama"
                variant="outlined"
                density="compact"
                class="mb-3"
              />

              <v-select
                v-model="settings.syncInterval"
                :items="[1, 5, 10, 15, 30]"
                label="Interval Auto-Sync (menit)"
                variant="outlined"
                density="compact"
                class="mb-3"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="settings.logRetentionDays"
                :items="[7, 14, 30, 60, 90]"
                label="Retensi Audit Log (hari)"
                variant="outlined"
                density="compact"
                class="mb-3"
              />

              <v-switch
                v-model="settings.autoSync"
                label="Otomatis Sinkronisasi Saat Network Online"
                color="primary"
                hide-details
              />
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div class="d-flex justify-end ga-2">
            <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="showToast('Perubahan dibatalkan', 'info')">
              Batal
            </v-btn>
            <v-btn color="primary" class="text-none font-weight-bold" @click="saveSettings">
              Simpan Pengaturan
            </v-btn>
          </div>
        </v-card>
      </v-window-item>

      <!-- TAB 6: AUDIT LOG -->
      <v-window-item :value="6">
        <v-card variant="flat" class="border rounded-lg bg-white mb-6">
          <div class="pa-5 pb-3">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Audit Log Aktivitas Tablet
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Riwayat transaksi, sinkronisasi, dan event keamanan sistem.
                </div>
              </div>

              <div class="d-flex align-center ga-2">
                <v-btn
                  variant="outlined"
                  color="error"
                  size="small"
                  prepend-icon="mdi-trash-can-outline"
                  class="text-none"
                  @click="clearAuditLogs"
                >
                  Bersihkan Log
                </v-btn>

                <v-btn
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-download"
                  class="text-none"
                  @click="exportAuditLogs"
                >
                  Ekspor Log (CSV)
                </v-btn>
              </div>
            </div>

            <!-- AUDIT LOG FILTER BAR -->
            <v-row density="compact" class="mt-4">
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="auditSearch"
                  placeholder="Cari kata kunci, ID Log, Operator, Perangkat, Aksi..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="auditStatusFilter"
                  :items="['Semua', 'Sukses', 'Peringatan', 'Gagal']"
                  label="Filter Status Log"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

          <div class="table-wrapper">
            <v-table density="comfortable" class="rugged-table">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="font-weight-bold text-caption">ID Log</th>
                  <th class="font-weight-bold text-caption">Waktu</th>
                  <th class="font-weight-bold text-caption">Operator</th>
                  <th class="font-weight-bold text-caption">Perangkat</th>
                  <th class="font-weight-bold text-caption">Aksi</th>
                  <th class="font-weight-bold text-caption">Detail Aktivitas</th>
                  <th class="font-weight-bold text-caption">Status</th>
                  <th class="font-weight-bold text-caption text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                <tr v-if="filteredAuditLogs.length === 0">
                  <td colspan="8" class="text-center py-6 text-caption text-medium-emphasis">
                    Belum ada entri audit log.
                  </td>
                </tr>
                <tr v-for="log in paginatedAuditLogs" :key="log.id">
                  <td class="font-weight-bold text-caption">{{ log.id }}</td>
                  <td class="text-caption">{{ log.timestamp }}</td>
                  <td class="text-body-2 font-weight-medium">{{ log.operator }}</td>
                  <td class="text-caption">{{ log.device }}</td>
                  <td class="text-body-2 font-weight-medium">{{ log.action }}</td>
                  <td class="text-caption text-medium-emphasis">{{ log.detail }}</td>
                  <td>
                    <v-chip size="x-small" :color="getLogStatusColor(log.status)" variant="tonal">
                      {{ log.status }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-btn
                      icon="mdi-information-outline"
                      variant="text"
                      size="small"
                      color="grey-darken-1"
                      @click="viewAuditDetail(log)"
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex align-center justify-space-between pa-4 flex-wrap ga-3">
            <span class="text-caption text-medium-emphasis">
              Menampilkan {{ filteredAuditLogs.length ? 1 : 0 }} - {{ Math.min(auditItemsPerPage, filteredAuditLogs.length) }} dari {{ filteredAuditLogs.length }} entri log
            </span>

            <div class="d-flex align-center ga-2">
              <v-pagination v-model="auditPage" :length="auditPageCount" density="compact" :total-visible="3" />
            </div>
          </div>
        </v-card>
      </v-window-item>

    </v-window>

    <!-- ======================================================
         DIALOG: POP-UP HASIL PINDAI BLE (DISCOVERED DEVICES)
    ======================================================= -->
    <v-dialog v-model="scanDialog" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-bluetooth-audio" color="primary" />
            <span>Perangkat BLE Ditemukan</span>
          </div>
          <v-chip size="x-small" color="primary" variant="tonal">
            {{ scannedMockups.length }} Perangkat Terdeteksi
          </v-chip>
        </v-card-title>
        
        <v-card-text class="pa-4">
          <div v-if="scannedMockups.length === 0" class="text-center py-6 text-caption text-medium-emphasis">
            Tidak ada perangkat BLE baru di dekat lokasi tablet.
          </div>
          <v-list v-else density="comfortable" class="pa-0">
            <v-list-item
              v-for="item in scannedMockups"
              :key="item.id"
              class="border rounded-lg mb-2 pa-3"
            >
              <template #prepend>
                <v-avatar color="primary" variant="tonal" size="36" class="mr-3">
                  <v-icon icon="mdi-radio-handheld" size="18" />
                </v-avatar>
              </template>
              
              <v-list-item-title class="font-weight-bold text-body-2">
                {{ item.id }}
              </v-list-item-title>
              
              <v-list-item-subtitle class="text-caption text-medium-emphasis mt-1">
                {{ item.type }} • Sinyal: <span class="text-success font-weight-bold">{{ item.signal }}</span>
                <br />
                <span class="text-caption text-disabled">MAC: {{ item.macAddress }}</span>
              </v-list-item-subtitle>
              
              <template #append>
                <v-btn
                  size="small"
                  color="primary"
                  variant="flat"
                  class="text-none font-weight-bold"
                  @click="connectDiscoveredDevice(item)"
                >
                  Hubungkan
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="scanDialog = false">
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: TAMBAH / EDIT TABLET
    ======================================================= -->
    <v-dialog v-model="tabletDialog" max-width="550px">
      <v-card class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b">
          {{ isEditMode ? 'Edit Perangkat Tablet' : 'Tambah Tablet Baru' }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row density="compact">
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.id" label="ID Perangkat" variant="outlined" density="compact" :disabled="isEditMode" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.sn" label="Serial Number" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.name" label="Nama Perangkat" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.model" label="Model Hardware" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="tabletForm.location" :items="locationOptions" label="Lokasi Bandara" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="tabletForm.status" :items="['Online', 'Offline']" label="Status" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.ipAddress" label="IP Address Lokal" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="tabletForm.assignedOperator" label="Operator Ditugaskan" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="tabletDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="saveTablet">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: DETAIL TABLET
    ======================================================= -->
    <v-dialog v-model="detailDialog" max-width="500px">
      <v-card v-if="selectedTablet" class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b d-flex align-center justify-space-between">
          <span>Detail {{ selectedTablet.id }}</span>
          <v-chip size="small" :color="getDeviceStatusColor(selectedTablet.status)" variant="tonal">
            {{ selectedTablet.status }}
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="d-flex flex-column ga-2 text-body-2">
            <div class="detail-row"><span>Nama Perangkat:</span> <span class="font-weight-bold">{{ selectedTablet.name }}</span></div>
            <div class="detail-row"><span>Model Hardware:</span> <span>{{ selectedTablet.model }}</span></div>
            <div class="detail-row"><span>Serial Number:</span> <span>{{ selectedTablet.sn }}</span></div>
            <div class="detail-row"><span>IP Address:</span> <span>{{ selectedTablet.ipAddress || '192.168.10.100' }}</span></div>
            <div class="detail-row"><span>Operator Penanggungjawab:</span> <span>{{ selectedTablet.assignedOperator || 'Utama' }}</span></div>
            <div class="detail-row"><span>Kesehatan Baterai:</span> <span class="text-success font-weight-bold">{{ selectedTablet.batteryHealth || 'Baik (95%)' }}</span></div>
            <div class="detail-row"><span>Lokasi Bandara:</span> <span>{{ selectedTablet.location }}</span></div>
            <div class="detail-row"><span>Level Baterai:</span> <span class="font-weight-bold">{{ selectedTablet.battery }}%</span></div>
            <div class="detail-row"><span>Terakhir Sync:</span> <span>{{ selectedTablet.lastSync }}</span></div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-space-between">
          <v-btn
            size="small"
            variant="tonal"
            :color="selectedTablet.status === 'Online' ? 'warning' : 'success'"
            class="text-none"
            @click="toggleDeviceStatus(selectedTablet)"
          >
            Ubah ke {{ selectedTablet.status === 'Online' ? 'Offline' : 'Online' }}
          </v-btn>

          <v-btn color="primary" class="text-none font-weight-bold" @click="detailDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: DETAIL ANTREAN SINKRONISASI
    ======================================================= -->
    <v-dialog v-model="syncQueueDialog" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b d-flex align-center justify-space-between">
          <span>Antrean Transaksi Offline</span>
          <v-chip size="small" color="primary" variant="tonal">
            {{ syncQueueItems.length }} Item Menunggu
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list density="compact" class="pa-0">
            <v-list-item v-for="item in syncQueueItems" :key="item.id" class="border rounded-lg mb-2 pa-2">
              <v-list-item-title class="font-weight-bold text-body-2">
                {{ item.id }} - {{ item.type }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption text-medium-emphasis">
                Volume: {{ item.volume }} • Waktu: {{ item.timestamp }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="x-small" color="warning" variant="tonal">
                  {{ item.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="syncQueueDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: TAMBAH PERANGKAT BLE
    ======================================================= -->
    <v-dialog v-model="bleDialog" max-width="450px">
      <v-card class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b">
          Pasang Perangkat BLE Baru
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row density="compact">
            <v-col cols="12">
              <v-text-field v-model="bleForm.id" label="ID Perangkat BLE" placeholder="Misal: SENSOR-001" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-select v-model="bleForm.type" :items="bleTypeOptions" label="Tipe Perangkat" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="bleForm.macAddress" label="MAC Address" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="bleForm.signal" label="Signal Strength (RSSI)" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="bleDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="saveBleDevice">Pasangkan Device</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: KONFIGURASI KEAMANAN
    ======================================================= -->
    <v-dialog v-model="securityDialog" max-width="480px">
      <v-card class="rounded-lg pa-2">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-3">Konfigurasi Security Guard</v-card-title>
        <v-card-text class="pa-3">
          <v-switch v-model="settings.airplaneGuard" label="Paksa Airplane Mode di Apron" color="primary" hide-details class="mb-2" />
          <v-switch v-model="settings.geofenceGuard" label="Geofence Locking (Hanya di Bandara)" color="primary" hide-details class="mb-2" />
          <v-switch v-model="settings.bleAutoConnect" label="Izinkan Nirkabel BLE Terverifikasi" color="primary" hide-details class="mb-2" />
          <v-switch v-model="settings.requirePasscode" label="Wajibkan Passcode PIN Supervisor" color="primary" hide-details />
        </v-card-text>
        <v-card-actions class="justify-end pa-3">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none mr-2" @click="securityDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="saveSecurityConfig">Terapkan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         DIALOG: DETAIL AUDIT LOG
    ======================================================= -->
    <v-dialog v-model="auditDetailDialog" max-width="480px">
      <v-card v-if="selectedAuditLog" class="rounded-lg">
        <v-card-title class="font-weight-bold text-subtitle-1 pa-4 border-b d-flex align-center justify-space-between">
          <span>Detail Log {{ selectedAuditLog.id }}</span>
          <v-chip size="small" :color="getLogStatusColor(selectedAuditLog.status)" variant="tonal">
            {{ selectedAuditLog.status }}
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="d-flex flex-column ga-2 text-body-2">
            <div class="detail-row"><span>Waktu Transaksi:</span> <span>{{ selectedAuditLog.timestamp }}</span></div>
            <div class="detail-row"><span>Operator:</span> <span class="font-weight-bold">{{ selectedAuditLog.operator }}</span></div>
            <div class="detail-row"><span>Perangkat:</span> <span>{{ selectedAuditLog.device }}</span></div>
            <div class="detail-row"><span>IP Address:</span> <span>{{ selectedAuditLog.ip || '192.168.10.100' }}</span></div>
            <div class="detail-row"><span>Aksi Sistem:</span> <span class="font-weight-bold">{{ selectedAuditLog.action }}</span></div>
            <v-divider class="my-2" />
            <div>
              <div class="text-caption text-medium-emphasis mb-1">Rincian Aktivitas:</div>
              <div class="pa-3 bg-grey-lighten-4 rounded text-caption border font-weight-medium">
                {{ selectedAuditLog.detail }}
              </div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn color="primary" class="text-none font-weight-bold" @click="auditDetailDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ======================================================
         SNACKBAR FEEDBACK PRESENTASI
    ======================================================= -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top right">
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-check-circle-outline" size="20" />
        <span class="text-body-2">{{ snackbar.text }}</span>
      </div>
    </v-snackbar>

  </div>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
}

.rugged-tabs :deep(.v-tab) {
  min-height: 48px;
}

.metric-card {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.table-wrapper {
  overflow-x: auto;
}

.rugged-table {
  min-width: 1050px;
}

.rugged-table :deep(th),
.rugged-table :deep(td) {
  white-space: nowrap;
}

.security-banner {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.08), rgba(33, 150, 243, 0.02));
  border: 1px solid rgba(33, 150, 243, 0.14);
}

.ble-device-row {
  background: #fafafa;
  transition: background 0.15s ease;
}

.ble-device-row:hover {
  background: #f5f7fa;
}

.sync-status-box {
  background: rgba(33, 150, 243, 0.05);
  border: 1px solid rgba(33, 150, 243, 0.1);
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.8125rem;
}

.detail-row > span:first-child {
  color: rgba(0, 0, 0, 0.6);
}

@media (max-width: 960px) {
  .metric-col {
    flex: 0 0 50%;
    max-width: 50%;
  }
}

@media (max-width: 600px) {
  .page-shell {
    padding: 16px !important;
  }

  .metric-col {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .detail-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
}
</style>