<script setup lang="ts">
//import { ref, computed, watch, reactive } from 'vue'

/* =========================================================
 * TYPES & INTERFACES
 * ========================================================= */
interface BreadcrumbItem {
  title: string
  disabled: boolean
  href: string
}

interface SubFeatureTab {
  title: string
  icon: string
  badge: string | number | null
}

interface MetricItem {
  title: string
  count: string | number
  unit: string
  sub: string
  icon: string
  color: string
}

interface DeviceItem {
  id: string
  name: string
  sn: string
  type: string
  location: string
  status: string
  connection: string
  lastSeen: string
  icon: string
  model: string
  manufacturer: string
  connectedTo: string
  battery: number
  bleSignal: string
  totalVolume: string
  flowRate: string
  temp: string
  density: string
  totalizerReset: string
  calibrationValid: string
  interlock: string
  overflowProtection: string
  bleConnection: string
  health: string
}

interface AlertLogItem {
  id: string
  device: string
  type: string
  severity: 'High' | 'Medium' | 'Low' | string
  message: string
  time: string
  status: 'Unresolved' | 'Resolved' | string
}

interface CalibrationItem {
  id: string
  device: string
  type: string
  location: string
  lastDate: string
  dueDate: string
  status: string
  inspector: string
}

interface DocumentationItem {
  title: string
  fileType: string
  size: string
  category: string
  date: string
}

interface DeviceHistoryItem {
  timestamp: string
  flowRate: string
  temp: string
  density: string
  status: string
  event: string
}

interface ScannedDevice {
  id: string
  name: string
  sn: string
  type: string
  rssi: string
  model: string
  manufacturer: string
}

/* =========================================================
 * HELPER TIMESTAMP FORMATTER
 * ========================================================= */
function getFormattedTimestamp(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[now.getMonth()]
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} ${hours}:${minutes}`
}

/* =========================================================
 * BREADCRUMBS
 * ========================================================= */
const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Hardware Integration', disabled: true, href: '#' },
]

/* =========================================================
 * SYSTEM STATE & TOAST NOTIFICATIONS
 * ========================================================= */
const isRefreshing = ref<boolean>(false)
const isSyncing = ref<boolean>(false)

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success',
  timeout: 3500,
})

function notify(text: string, color: 'success' | 'error' | 'warning' | 'info' = 'success') {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

/* =========================================================
 * NAVBAR SUBFITUR (TABS)
 * ========================================================= */
const activeTab = ref<number>(0)

/* =========================================================
 * DEVICE DATA (REACTIVE STATE)
 * ========================================================= */
const devices = ref<DeviceItem[]>([
  {
    id: 'DRUM-0001',
    name: 'Avtur Drum',
    sn: '7819 00A1',
    type: 'RFID Tag',
    location: 'Wamena (WMX)',
    status: 'Tersedia',
    connection: 'Direct RFID',
    lastSeen: '11 Sep 2026 03:15',
    icon: 'mdi-barrel',
    model: 'RFID Fuel Tag',
    manufacturer: 'RFID System',
    connectedTo: 'FLOW-0001 (Flowmeter BLE)',
    battery: 100,
    bleSignal: 'Terhubung',
    totalVolume: '200 L',
    flowRate: '0.00 L/min',
    temp: '28.1 °C',
    density: '0.798 kg/L',
    totalizerReset: '-',
    calibrationValid: 'N/A',
    interlock: 'N/A',
    overflowProtection: 'Aktif',
    bleConnection: 'Baik',
    health: 'Normal',
  },
  {
    id: 'FLOW-0001',
    name: 'Digital Flowmeter',
    sn: 'F200-782931',
    type: 'Flowmeter BLE',
    location: 'Wamena (WMX)',
    status: 'Online',
    connection: '-58 dBm',
    lastSeen: '11 Sep 2026 03:50',
    icon: 'mdi-gauge',
    model: 'F200 Series',
    manufacturer: 'Promass',
    connectedTo: 'SOL-0001 (Solenoid Valve)',
    battery: 92,
    bleSignal: '-58 dBm (Kuat)',
    totalVolume: '1,250.45 L',
    flowRate: '0.00 L/min',
    temp: '28.4 °C',
    density: '0.798 kg/L',
    totalizerReset: '12 Jul 2026 08:15',
    calibrationValid: '14 Oct 2026',
    interlock: 'OK',
    overflowProtection: 'Aktif',
    bleConnection: 'Baik',
    health: 'Normal',
  },
  {
    id: 'SOL-0001',
    name: 'Solenoid Valve',
    sn: 'SV-ATEX-001',
    type: 'Solenoid Valve',
    location: 'Wamena (WMX)',
    status: 'Online',
    connection: 'Interlock OK',
    lastSeen: '11 Sep 2026 03:48',
    icon: 'mdi-pipe-valve',
    model: 'ATEX Series',
    manufacturer: 'Industrial Valve',
    connectedTo: 'FLOW-0001 (Flowmeter BLE)',
    battery: 100,
    bleSignal: 'Wired Interlock',
    totalVolume: '-',
    flowRate: '-',
    temp: '28.2 °C',
    density: '-',
    totalizerReset: '-',
    calibrationValid: '14 Oct 2026',
    interlock: 'OK',
    overflowProtection: 'Aktif',
    bleConnection: 'Wired',
    health: 'Normal',
  },
  {
    id: 'SKID-0001',
    name: 'Refueling Skid',
    sn: 'SKID-WMX-001',
    type: 'Refueling Skid',
    location: 'Wamena (WMX)',
    status: 'Online',
    connection: 'OK',
    lastSeen: '11 Sep 2026 03:52',
    icon: 'mdi-gas-station-outline',
    model: 'Mobile Refueling Skid',
    manufacturer: 'Industrial Skid',
    connectedTo: 'SOL-0001 (Solenoid Valve)',
    battery: 86,
    bleSignal: 'Gateway OK',
    totalVolume: '1,250.45 L',
    flowRate: '0.00 L/min',
    temp: '28.4 °C',
    density: '0.798 kg/L',
    totalizerReset: '12 Jul 2026 08:15',
    calibrationValid: '14 Oct 2026',
    interlock: 'OK',
    overflowProtection: 'Aktif',
    bleConnection: 'Gateway OK',
    health: 'Normal',
  },
  {
    id: 'NOZZLE-0001',
    name: 'Refueling Nozzle',
    sn: 'NZ-001',
    type: 'Nozzle',
    location: 'Wamena (WMX)',
    status: 'Ready',
    connection: 'Mechanical OK',
    lastSeen: '11 Sep 2026 03:45',
    icon: 'mdi-gas-cylinder',
    model: 'Fuel Nozzle',
    manufacturer: 'Industrial Nozzle',
    connectedTo: 'SKID-0001 (Refueling Skid)',
    battery: 100,
    bleSignal: '-',
    totalVolume: '-',
    flowRate: '0.00 L/min',
    temp: '28.3 °C',
    density: '-',
    totalizerReset: '-',
    calibrationValid: '14 Oct 2026',
    interlock: 'OK',
    overflowProtection: 'Aktif',
    bleConnection: 'N/A',
    health: 'Normal',
  },
  {
    id: 'FLOW-0002',
    name: 'Digital Flowmeter',
    sn: 'F200-782944',
    type: 'Flowmeter BLE',
    location: 'Sentani (DJJ)',
    status: 'Offline',
    connection: 'Disconnected',
    lastSeen: '10 Sep 2026 17:42',
    icon: 'mdi-gauge',
    model: 'F200 Series',
    manufacturer: 'Promass',
    connectedTo: 'SOL-0002 (Solenoid Valve)',
    battery: 18,
    bleSignal: '-',
    totalVolume: '982.20 L',
    flowRate: '-',
    temp: '-',
    density: '-',
    totalizerReset: '01 Jul 2026 09:00',
    calibrationValid: '05 Sep 2026',
    interlock: 'Unknown',
    overflowProtection: 'Aktif',
    bleConnection: 'Terputus',
    health: 'Perlu Pemeriksaan',
  },
])

/* =========================================================
 * ALERT DATA
 * ========================================================= */
const alertLogs = ref<AlertLogItem[]>([
  {
    id: 'ALT-1092',
    device: 'FLOW-0002',
    type: 'Koneksi Terputus',
    severity: 'High',
    message: 'Signal loss BLE selama lebih dari 15 menit pada unit Sentani.',
    time: '10 Sep 2026 17:42',
    status: 'Unresolved',
  },
  {
    id: 'ALT-1088',
    device: 'FLOW-0002',
    type: 'Baterai Lemah',
    severity: 'Medium',
    message: 'Kapasitas baterai tersisa 18%. Diperlukan penggantian baterai.',
    time: '10 Sep 2026 16:30',
    status: 'Unresolved',
  },
  {
    id: 'ALT-1075',
    device: 'SOL-0001',
    type: 'Interlock Warning',
    severity: 'Low',
    message: 'Solenoid valve interlock diset ulang otomatis oleh sistem.',
    time: '09 Sep 2026 11:20',
    status: 'Resolved',
  },
])

/* =========================================================
 * CALIBRATION DATA
 * ========================================================= */
const calibrationSchedules = ref<CalibrationItem[]>([
  {
    id: 'CAL-001',
    device: 'FLOW-0002',
    type: 'Flowmeter BLE',
    location: 'Sentani (DJJ)',
    lastDate: '05 Sep 2025',
    dueDate: '05 Sep 2026',
    status: 'Jatuh Tempo',
    inspector: 'Balai Metrologi',
  },
  {
    id: 'CAL-002',
    device: 'FLOW-0001',
    type: 'Flowmeter BLE',
    location: 'Wamena (WMX)',
    lastDate: '14 Oct 2025',
    dueDate: '14 Oct 2026',
    status: 'Normal',
    inspector: 'Balai Metrologi',
  },
  {
    id: 'CAL-003',
    device: 'SOL-0001',
    type: 'Solenoid Valve',
    location: 'Wamena (WMX)',
    lastDate: '14 Oct 2025',
    dueDate: '14 Oct 2026',
    status: 'Normal',
    inspector: 'Internal Quality QA',
  },
])

/* =========================================================
 * DOCUMENTATION DATA
 * ========================================================= */
const documentationList = ref<DocumentationItem[]>([
  {
    title: 'Manual Penggunaan Flowmeter Promass F200 BLE',
    fileType: 'PDF',
    size: '4.2 MB',
    category: 'User Manual',
    date: '12 Jan 2026',
  },
  {
    title: 'Skema Diagram Topologi Interlock Refueling Skid',
    fileType: 'PDF / CAD',
    size: '12.8 MB',
    category: 'Technical Specs',
    date: '05 Mar 2026',
  },
  {
    title: 'Prosedur SOP Kalibrasi & Sertifikasi Flowmeter Avtur',
    fileType: 'DOCX',
    size: '1.5 MB',
    category: 'Standard Operating Procedure',
    date: '20 May 2026',
  },
])

/* =========================================================
 * BLE SCANNER STATE & AVAILABLE DEVICES
 * ========================================================= */
const scanBleDialog = ref<boolean>(false)
const isScanningBLE = ref<boolean>(false)

const scannedDevices = ref<ScannedDevice[]>([
  { id: 'FLOW-0003', name: 'Digital Flowmeter Unit B', sn: 'F200-881920', type: 'Flowmeter BLE', rssi: '-52 dBm', model: 'F200 Series', manufacturer: 'Promass' },
  { id: 'DRUM-0002', name: 'Avtur Drum Reserve Sentani', sn: '7819 00B2', type: 'RFID Tag', rssi: '-64 dBm', model: 'RFID Fuel Tag', manufacturer: 'RFID System' },
  { id: 'SOL-0002-B', name: 'Solenoid Valve Secondary', sn: 'SV-ATEX-002', type: 'Solenoid Valve', rssi: '-71 dBm', model: 'ATEX Series', manufacturer: 'Industrial Valve' },
  { id: 'NOZZLE-0002', name: 'Smart Nozzle Sensor', sn: 'NZ-002-BLE', type: 'Nozzle', rssi: '-48 dBm', model: 'Wireless Nozzle Tag', manufacturer: 'Industrial Nozzle' }
])

/* =========================================================
 * FILTERS FOR DEVICE TABLE
 * ========================================================= */
const searchQuery = ref<string>('')
const selectedType = ref<string>('Semua Tipe')
const selectedStatus = ref<string>('Semua Status')
const selectedLocation = ref<string>('Semua Lokasi')

const typeOptions: string[] = [
  'Semua Tipe',
  'RFID Tag',
  'Flowmeter BLE',
  'Solenoid Valve',
  'Refueling Skid',
  'Nozzle',
]

const statusOptions: string[] = [
  'Semua Status',
  'Online',
  'Tersedia',
  'Ready',
  'Offline',
]

const locationOptions: string[] = [
  'Semua Lokasi',
  'Wamena (WMX)',
  'Sentani (DJJ)',
  'Timika (TIM)',
]

/* =========================================================
 * COMPUTED DYNAMIC DATA
 * ========================================================= */
const unresolvedAlertCount = computed(() => {
  return alertLogs.value.filter(a => a.status === 'Unresolved').length
})

const dueCalibrationCount = computed(() => {
  return calibrationSchedules.value.filter(c => c.status === 'Jatuh Tempo').length
})

const subFeatureTabs = computed<SubFeatureTab[]>(() => [
  { title: 'Ringkasan', icon: 'mdi-view-dashboard-outline', badge: null },
  { title: 'Perangkat', icon: 'mdi-devices', badge: devices.value.length },
  { title: 'Topologi & Koneksi', icon: 'mdi-sitemap-outline', badge: '2 Site' },
  { title: 'Alert & Event', icon: 'mdi-bell-outline', badge: unresolvedAlertCount.value ? unresolvedAlertCount.value : null },
  { title: 'Kalibrasi & Perawatan', icon: 'mdi-wrench-outline', badge: dueCalibrationCount.value ? dueCalibrationCount.value : null },
  { title: 'Dokumentasi', icon: 'mdi-file-document-outline', badge: null },
])

const metrics = computed<MetricItem[]>(() => {
  const total = devices.value.length
  const online = devices.value.filter(d => d.status === 'Online' || d.status === 'Ready' || d.status === 'Tersedia').length
  const offline = devices.value.filter(d => d.status === 'Offline').length
  const warning = devices.value.filter(d => d.health !== 'Normal' || d.battery < 20).length

  return [
    {
      title: 'Total Perangkat',
      count: total,
      unit: 'Unit Terdaftar',
      sub: `${online} aktif • ${offline} tidak aktif`,
      icon: 'mdi-cube-outline',
      color: 'primary',
    },
    {
      title: 'Perangkat Online',
      count: online,
      unit: `${((online / total) * 100 || 0).toFixed(1)}% dari total`,
      sub: 'Koneksi normal',
      icon: 'mdi-wifi',
      color: 'success',
    },
    {
      title: 'Perangkat Offline',
      count: offline,
      unit: `${((offline / total) * 100 || 0).toFixed(1)}% dari total`,
      sub: 'Perlu pemeriksaan',
      icon: 'mdi-wifi-off',
      color: 'error',
    },
    {
      title: 'Perlu Perhatian',
      count: warning,
      unit: `${((warning / total) * 100 || 0).toFixed(1)}% dari total`,
      sub: 'Perlu tindakan',
      icon: 'mdi-alert-outline',
      color: 'warning',
    },
    {
      title: 'Kalibrasi Jatuh Tempo',
      count: dueCalibrationCount.value,
      unit: `${((dueCalibrationCount.value / total) * 100 || 0).toFixed(1)}% dari total`,
      sub: 'Dalam waktu dekat',
      icon: 'mdi-calendar-clock',
      color: 'purple',
    },
  ]
})

const selectedDeviceId = ref<string>('FLOW-0001')

const selectedDevice = computed<DeviceItem>(() => {
  return (
    devices.value.find(device => device.id === selectedDeviceId.value) ??
    devices.value[0] ?? {
      id: '-',
      name: 'Tidak ada',
      sn: '-',
      type: '-',
      location: '-',
      status: 'Offline',
      connection: '-',
      lastSeen: '-',
      icon: 'mdi-help-circle',
      model: '-',
      manufacturer: '-',
      connectedTo: '-',
      battery: 0,
      bleSignal: '-',
      totalVolume: '0 L',
      flowRate: '0 L/min',
      temp: '0 °C',
      density: '0 kg/L',
      totalizerReset: '-',
      calibrationValid: '-',
      interlock: '-',
      overflowProtection: '-',
      bleConnection: '-',
      health: '-',
    }
  )
})

function selectDevice(id: string) {
  selectedDeviceId.value = id
}

const filteredDevices = computed<DeviceItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return devices.value.filter(device => {
    const matchesSearch =
      !query ||
      device.id.toLowerCase().includes(query) ||
      device.name.toLowerCase().includes(query) ||
      device.type.toLowerCase().includes(query) ||
      device.sn.toLowerCase().includes(query)

    const matchesType =
      selectedType.value === 'Semua Tipe' || device.type === selectedType.value

    const matchesStatus =
      selectedStatus.value === 'Semua Status' ||
      device.status === selectedStatus.value

    const matchesLocation =
      selectedLocation.value === 'Semua Lokasi' ||
      device.location === selectedLocation.value

    return matchesSearch && matchesType && matchesStatus && matchesLocation
  })
})

/* =========================================================
 * PAGINATION
 * ========================================================= */
const page = ref<number>(1)
const itemsPerPage = ref<number>(5)

const pageCount = computed<number>(() => {
  return Math.max(1, Math.ceil(filteredDevices.value.length / itemsPerPage.value))
})

const paginatedDevices = computed<DeviceItem[]>(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredDevices.value.slice(start, end)
})

const displayStart = computed<number>(() => {
  if (!filteredDevices.value.length) return 0
  return (page.value - 1) * itemsPerPage.value + 1
})

const displayEnd = computed<number>(() => {
  return Math.min(page.value * itemsPerPage.value, filteredDevices.value.length)
})

watch(
  [searchQuery, selectedType, selectedStatus, selectedLocation, itemsPerPage],
  () => {
    page.value = 1
  },
)

/* =========================================================
 * DIALOG & FORM STATES
 * ========================================================= */
// Device Dialog
const addDeviceDialog = ref<boolean>(false)
const isEditMode = ref<boolean>(false)

const defaultDeviceForm = {
  id: '',
  name: '',
  sn: '',
  type: 'Flowmeter BLE',
  location: 'Wamena (WMX)',
  status: 'Online',
  model: 'F200 Series',
  manufacturer: 'Promass',
  connectedTo: 'SOL-0001 (Solenoid Valve)',
  battery: 100,
  bleSignal: '-60 dBm',
  totalVolume: '0.00 L',
  flowRate: '0.00 L/min',
  temp: '28.0 °C',
  density: '0.798 kg/L',
  calibrationValid: '31 Dec 2026',
  interlock: 'OK',
  overflowProtection: 'Aktif',
  bleConnection: 'Baik',
  health: 'Normal',
}

const deviceForm = reactive({ ...defaultDeviceForm })

// History Modal
const historyDialog = ref<boolean>(false)
const selectedDeviceHistory = ref<DeviceHistoryItem[]>([])

// Delete Confirmation
const deleteDialog = ref<boolean>(false)
const deviceToDelete = ref<DeviceItem | null>(null)

// Calibration Modal
const calibrationDialog = ref<boolean>(false)
const calibrationForm = reactive({
  device: 'FLOW-0001',
  type: 'Flowmeter BLE',
  location: 'Wamena (WMX)',
  dueDate: '15 Nov 2026',
  inspector: 'Balai Metrologi',
})

// Add Alert Dialog
const addAlertDialog = ref<boolean>(false)
const alertForm = reactive({
  device: 'FLOW-0001',
  type: 'Koneksi Terputus',
  severity: 'Medium',
  message: '',
})

// Upload Document Dialog
const uploadDocDialog = ref<boolean>(false)
const uploadDocForm = reactive({
  title: '',
  category: 'User Manual',
  fileType: 'PDF',
})

/* =========================================================
 * ACTION HANDLERS & BUTTON FUNCTIONS
 * ========================================================= */
function refreshData() {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
    notify('Data perangkat & status telemetri berhasil diperbarui', 'success')
  }, 700)
}

function syncData() {
  isSyncing.value = true
  setTimeout(() => {
    isSyncing.value = false
    notify('Sinkronisasi live sinyal BLE dan sertifikasi selesai', 'info')
  }, 900)
}

/* --- BLE DISCONNECT & RECONNECT HANDLERS --- */
function disconnectBLE(device: DeviceItem) {
  const timeStamp = getFormattedTimestamp()

  device.status = 'Offline'
  device.bleConnection = 'Terputus'
  device.bleSignal = '-'
  device.connection = 'Disconnected'
  device.lastSeen = timeStamp
  device.health = 'Perlu Pemeriksaan'

  // Tambahkan log alert otomatis ketika BLE terputus
  const alertId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`
  alertLogs.value.unshift({
    id: alertId,
    device: device.id,
    type: 'Koneksi Terputus (BLE)',
    severity: 'Medium',
    message: `Koneksi Bluetooth perangkat ${device.id} diputuskan secara manual pada ${timeStamp}.`,
    time: timeStamp,
    status: 'Unresolved',
  })

  notify(`Bluetooth perangkat ${device.id} diputuskan. 'Terakhir Terhubung' diperbarui ke ${timeStamp}`, 'warning')
}

function reconnectBLE(device: DeviceItem) {
  const timeStamp = getFormattedTimestamp()

  device.status = 'Online'
  device.bleConnection = 'Baik'
  device.bleSignal = '-55 dBm (Kuat)'
  device.connection = '-55 dBm'
  device.lastSeen = timeStamp
  device.health = 'Normal'

  notify(`Koneksi Bluetooth ${device.id} berhasil terhubung kembali!`, 'success')
}

/* --- BLE SCANNER DIALOG HANDLERS --- */
function openBleScanModal() {
  scanBleDialog.value = true
  isScanningBLE.value = true
  setTimeout(() => {
    isScanningBLE.value = false
    notify('Pemindaian selesai. Beberapa perangkat BLE ditemukan di sekitar.', 'info')
  }, 1200)
}

function rescanBLE() {
  isScanningBLE.value = true
  setTimeout(() => {
    isScanningBLE.value = false
    notify('Daftar sinyal BLE di sekitar telah diperbarui', 'info')
  }, 1000)
}

function connectScannedDevice(item: ScannedDevice) {
  const timeStamp = getFormattedTimestamp()

  const existingIdx = devices.value.findIndex(d => d.id === item.id)
  if (existingIdx !== -1) {
    devices.value[existingIdx].status = 'Online'
    devices.value[existingIdx].bleConnection = 'Baik'
    devices.value[existingIdx].bleSignal = `${item.rssi} (Kuat)`
    devices.value[existingIdx].connection = item.rssi
    devices.value[existingIdx].lastSeen = timeStamp
    devices.value[existingIdx].health = 'Normal'
    selectedDeviceId.value = item.id
    notify(`Perangkat ${item.id} tersambung kembali via BLE!`, 'success')
  } else {
    const iconMap: Record<string, string> = {
      'RFID Tag': 'mdi-barrel',
      'Flowmeter BLE': 'mdi-gauge',
      'Solenoid Valve': 'mdi-pipe-valve',
      'Refueling Skid': 'mdi-gas-station-outline',
      'Nozzle': 'mdi-gas-cylinder',
    }
    const newDev: DeviceItem = {
      id: item.id,
      name: item.name,
      sn: item.sn,
      type: item.type,
      location: 'Wamena (WMX)',
      status: 'Online',
      connection: item.rssi,
      lastSeen: timeStamp,
      icon: iconMap[item.type] || 'mdi-cube-outline',
      model: item.model,
      manufacturer: item.manufacturer,
      connectedTo: 'SKID-0001 (Refueling Skid)',
      battery: 100,
      bleSignal: `${item.rssi} (Kuat)`,
      totalVolume: '0.00 L',
      flowRate: '0.00 L/min',
      temp: '28.0 °C',
      density: '0.798 kg/L',
      totalizerReset: timeStamp,
      calibrationValid: '31 Dec 2026',
      interlock: 'OK',
      overflowProtection: 'Aktif',
      bleConnection: 'Baik',
      health: 'Normal',
    }
    devices.value.unshift(newDev)
    selectedDeviceId.value = newDev.id
    notify(`Perangkat BLE baru ${item.id} berhasil ditambahkan dan terhubung!`, 'success')
  }
  scanBleDialog.value = false
}

function exportToCSV() {
  if (!filteredDevices.value.length) {
    notify('Tidak ada data perangkat untuk diexport', 'warning')
    return
  }

  const headers = ['ID', 'Nama', 'Serial Number', 'Tipe', 'Lokasi', 'Status', 'Baterai', 'Sinyal BLE', 'Total Volume', 'Last Seen']
  const rows = filteredDevices.value.map(d => [
    d.id,
    `"${d.name}"`,
    `"${d.sn}"`,
    `"${d.type}"`,
    `"${d.location}"`,
    d.status,
    `${d.battery}%`,
    `"${d.bleSignal}"`,
    `"${d.totalVolume}"`,
    `"${d.lastSeen}"`,
  ])

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `hardware_devices_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  notify('Data perangkat berhasil di-export ke CSV', 'success')
}

function resetFilters() {
  searchQuery.value = ''
  selectedType.value = 'Semua Tipe'
  selectedStatus.value = 'Semua Status'
  selectedLocation.value = 'Semua Lokasi'
  notify('Filter pencarian telah direset', 'info')
}

function openAddDeviceModal() {
  isEditMode.value = false
  Object.assign(deviceForm, defaultDeviceForm)
  const nextNum = devices.value.length + 1
  deviceForm.id = `FLOW-000${nextNum}`
  addDeviceDialog.value = true
}

function openEditDeviceModal(item: DeviceItem) {
  isEditMode.value = true
  Object.assign(deviceForm, item)
  addDeviceDialog.value = true
}

function saveDevice() {
  if (!deviceForm.id || !deviceForm.name || !deviceForm.sn) {
    notify('Mohon isi field Wajib (ID, Nama, Serial Number)', 'warning')
    return
  }

  const iconMap: Record<string, string> = {
    'RFID Tag': 'mdi-barrel',
    'Flowmeter BLE': 'mdi-gauge',
    'Solenoid Valve': 'mdi-pipe-valve',
    'Refueling Skid': 'mdi-gas-station-outline',
    'Nozzle': 'mdi-gas-cylinder',
  }

  const icon = iconMap[deviceForm.type] || 'mdi-cube-outline'

  if (isEditMode.value) {
    const idx = devices.value.findIndex(d => d.id === deviceForm.id)
    if (idx !== -1) {
      devices.value[idx] = { 
        ...devices.value[idx], 
        ...deviceForm, 
        icon 
      }
      notify(`Perangkat ${deviceForm.id} berhasil diperbarui`, 'success')
    }
  } else {
    if (devices.value.some(d => d.id === deviceForm.id)) {
      notify(`ID Perangkat ${deviceForm.id} sudah ada dalam database!`, 'error')
      return
    }
    const timeStamp = getFormattedTimestamp()
    const newDev: DeviceItem = {
      ...deviceForm,
      icon,
      connection: deviceForm.type.includes('BLE') ? deviceForm.bleSignal : 'OK',
      lastSeen: timeStamp,
      totalizerReset: '-',
    }
    devices.value.unshift(newDev)
    selectedDeviceId.value = newDev.id
    notify(`Perangkat ${newDev.id} berhasil ditambahkan`, 'success')
  }

  addDeviceDialog.value = false
}

function confirmDeleteDevice(item: DeviceItem) {
  deviceToDelete.value = item
  deleteDialog.value = true
}

function deleteDevice() {
  if (!deviceToDelete.value) return
  const id = deviceToDelete.value.id
  devices.value = devices.value.filter(d => d.id !== id)
  if (selectedDeviceId.value === id && devices.value.length) {
    selectedDeviceId.value = devices.value[0].id
  }
  deleteDialog.value = false
  notify(`Perangkat ${id} telah dihapus dari sistem`, 'info')
}

function resetTotalizer(item: DeviceItem) {
  const dateStr = getFormattedTimestamp()
  item.totalVolume = '0.00 L'
  item.totalizerReset = dateStr
  notify(`Totalizer ${item.id} berhasil di-reset ke 0.00 L (${dateStr})`, 'success')
}

function openHistoryModal(device: DeviceItem) {
  selectDevice(device.id)
  const timeNow = getFormattedTimestamp()
  selectedDeviceHistory.value = [
    { timestamp: timeNow, flowRate: device.flowRate, temp: device.temp, density: device.density, status: device.status, event: 'Telemetry Ping OK' },
    { timestamp: '11 Sep 2026 02:15', flowRate: '45.20 L/min', temp: '28.5 °C', density: '0.798 kg/L', status: 'Refueling', event: 'Refueling Transaksi Active' },
    { timestamp: '11 Sep 2026 01:50', flowRate: '48.10 L/min', temp: '28.3 °C', density: '0.799 kg/L', status: 'Refueling', event: 'Refueling Start' },
    { timestamp: '10 Sep 2026 23:30', flowRate: '0.00 L/min', temp: '28.0 °C', density: '0.798 kg/L', status: 'Idle', event: 'Totalizer Snapshot' },
    { timestamp: '10 Sep 2026 20:00', flowRate: '0.00 L/min', temp: '27.8 °C', density: '0.797 kg/L', status: 'Online', event: 'System Diagnostics OK' },
  ]
  historyDialog.value = true
}

/* --- ALERT LOG HANDLERS --- */
function resolveAlert(log: AlertLogItem) {
  log.status = 'Resolved'
  notify(`Alert ${log.id} (${log.type}) telah diselesaikan`, 'success')
}

function clearResolvedAlerts() {
  alertLogs.value = alertLogs.value.filter(a => a.status === 'Unresolved')
  notify('Seluruh log alert yang telah selesai dibersihkan', 'info')
}

function openAddAlertModal() {
  alertForm.message = ''
  addAlertDialog.value = true
}

function saveManualAlert() {
  if (!alertForm.message) {
    notify('Mohon isi pesan detail alert', 'warning')
    return
  }
  const timeStamp = getFormattedTimestamp()
  const nextId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`
  alertLogs.value.unshift({
    id: nextId,
    device: alertForm.device,
    type: alertForm.type,
    severity: alertForm.severity,
    message: alertForm.message,
    time: timeStamp,
    status: 'Unresolved',
  })
  addAlertDialog.value = false
  notify(`Log alert manual ${nextId} berhasil dibuat`, 'success')
}

/* --- CALIBRATION HANDLERS --- */
function openCalibrationModal() {
  calibrationDialog.value = true
}

function scheduleCalibration() {
  if (!calibrationForm.device || !calibrationForm.dueDate) {
    notify('Lengkapi parameter jadwal kalibrasi', 'warning')
    return
  }

  const nextId = `CAL-00${calibrationSchedules.value.length + 1}`
  const todayStr = getFormattedTimestamp().slice(0, 11)

  calibrationSchedules.value.unshift({
    id: nextId,
    device: calibrationForm.device,
    type: calibrationForm.type,
    location: calibrationForm.location,
    lastDate: todayStr,
    dueDate: calibrationForm.dueDate,
    status: 'Normal',
    inspector: calibrationForm.inspector,
  })

  // Synchronize device calibration status
  const targetDev = devices.value.find(d => d.id === calibrationForm.device)
  if (targetDev) {
    targetDev.calibrationValid = calibrationForm.dueDate
  }

  calibrationDialog.value = false
  notify(`Jadwal kalibrasi untuk ${calibrationForm.device} berhasil dibuat`, 'success')
}

function markCalibrated(item: CalibrationItem) {
  const todayStr = getFormattedTimestamp().slice(0, 11)
  item.status = 'Normal'
  item.lastDate = todayStr
  const dev = devices.value.find(d => d.id === item.device)
  if (dev) {
    dev.calibrationValid = item.dueDate
  }
  notify(`Perangkat ${item.device} telah selesai dikalibrasi! Status diperbarui.`, 'success')
}

function downloadCalibrationCert(item: CalibrationItem) {
  const fileContent = `SERTIFIKAT KALIBRASI & METROLOGI AVTUR\nID Perangkat: ${item.device}\nTipe: ${item.type}\nLokasi: ${item.location}\nTanggal Inspeksi: ${item.lastDate}\nBerlaku Hingga: ${item.dueDate}\nInspektor: ${item.inspector}\nStatus: Lulus Pengujian Presisi.`
  const blob = new Blob([fileContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Sertifikat_Kalibrasi_${item.device}_${item.id}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  notify(`Sertifikat kalibrasi ${item.device} berhasil diunduh`, 'info')
}

/* --- DOCUMENTATION HANDLERS --- */
function downloadDoc(doc: DocumentationItem) {
  const fileContent = `Dokumen Teknis Avtur\nJudul: ${doc.title}\nKategori: ${doc.category}\nFormat: ${doc.fileType}\nTanggal Rilis: ${doc.date}\nStatus: Avtur Verified Technical Manual.`
  const blob = new Blob([fileContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${doc.fileType.toLowerCase().split(' ')[0]}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  notify(`Mengunduh berkas: ${doc.title}`, 'info')
}

function openUploadDocModal() {
  uploadDocForm.title = ''
  uploadDocDialog.value = true
}

function uploadDoc() {
  if (!uploadDocForm.title) {
    notify('Mohon masukkan judul dokumen', 'warning')
    return
  }
  const todayStr = getFormattedTimestamp().slice(0, 11)
  documentationList.value.unshift({
    title: uploadDocForm.title,
    fileType: uploadDocForm.fileType,
    size: '2.4 MB',
    category: uploadDocForm.category,
    date: todayStr,
  })
  uploadDocDialog.value = false
  notify(`Dokumen "${uploadDocForm.title}" berhasil diunggah`, 'success')
}

/* --- TOPOLOGY TEST ACTIONS --- */
function pingTopologyNodes() {
  notify('Pengujian sinyal telemetri seluruh node topologi... Semua node merespons (0.4ms)', 'success')
}

function simulateTopologyDisconnect() {
  const dev = devices.value.find(d => d.id === 'FLOW-0001')
  if (dev) {
    disconnectBLE(dev)
  }
}

/* =========================================================
 * UI STYLING HELPERS
 * ========================================================= */
function getStatusBadge(status: string) {
  switch (status) {
    case 'Online':
      return { color: 'success', variant: 'tonal' as const }
    case 'Tersedia':
      return { color: 'info', variant: 'tonal' as const }
    case 'Ready':
      return { color: 'teal', variant: 'tonal' as const }
    case 'Offline':
      return { color: 'error', variant: 'tonal' as const }
    default:
      return { color: 'grey', variant: 'tonal' as const }
  }
}

function getDeviceTypeColor(type: string) {
  switch (type) {
    case 'RFID Tag':
      return 'primary'
    case 'Flowmeter BLE':
      return 'info'
    case 'Solenoid Valve':
      return 'deep-orange'
    case 'Refueling Skid':
      return 'warning'
    case 'Nozzle':
      return 'teal'
    default:
      return 'grey'
  }
}

function getAlertSeverityBadge(severity: string) {
  switch (severity) {
    case 'High':
      return { color: 'error', variant: 'flat' as const }
    case 'Medium':
      return { color: 'warning', variant: 'tonal' as const }
    case 'Low':
      return { color: 'info', variant: 'tonal' as const }
    default:
      return { color: 'grey', variant: 'tonal' as const }
  }
}
</script>

<template>
  <div class="hardware-page bg-grey-lighten-4 min-vh-100 pa-6">

    <!-- TOAST NOTIFICATION SNACKBAR -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
      elevation="4"
    >
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-information-outline" size="20" />
        <span class="font-weight-medium text-body-2">{{ snackbar.text }}</span>
      </div>
      <template #actions>
        <v-btn variant="text" size="small" icon="mdi-close" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- BREADCRUMBS & PAGE HEADER -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 pt-0 pb-2 text-caption" />

    <div class="d-flex align-center justify-space-between flex-wrap mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-4 mb-1">
          Integrasi & Manajemen Hardware
        </h1>
        <div class="text-body-2 text-medium-emphasis">
          Monitoring perangkat BLE, flowmeter, valve interlock, dan kesehatan hardware operasional avtur.
        </div>
      </div>
      <AvturTopNav/>
      <div class="d-flex align-center ga-2 mt-3 mt-md-0">
        <v-chip color="success" variant="tonal" size="small" prepend-icon="mdi-circle">
          Sistem Normal
        </v-chip>
        <v-btn
          variant="outlined"
          color="primary"
          size="small"
          prepend-icon="mdi-bluetooth-connect"
          class="text-none font-weight-bold"
          @click="openBleScanModal"
        >
          Pindai Perangkat BLE
        </v-btn>
        <v-btn
          variant="outlined"
          color="grey-darken-3"
          size="small"
          prepend-icon="mdi-refresh"
          class="text-none"
          :loading="isRefreshing"
          @click="refreshData"
        >
          Refresh Data
        </v-btn>
      </div>
    </div>

    <!-- NAVBAR SUBFITUR (TABS) -->
    <nav class="subfeature-navbar bg-white border rounded-lg px-4 py-1 elevation-1 mb-5">
      <div class="d-flex align-center justify-space-between flex-wrap">
        <v-tabs
          v-model="activeTab"
          color="primary"
          align-tabs="start"
          density="comfortable"
          show-arrows
        >
          <v-tab
            v-for="(tab, i) in subFeatureTabs"
            :key="i"
            :value="i"
            class="text-none text-body-2 font-weight-medium px-4"
          >
            <v-icon :icon="tab.icon" size="18" class="mr-2" />
            {{ tab.title }}
            <v-chip
              v-if="tab.badge"
              size="x-small"
              class="ml-2 px-1"
              color="primary"
              variant="tonal"
            >
              {{ tab.badge }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <div class="d-none d-md-flex align-center ga-2 py-1">
          <v-btn
            variant="text"
            color="grey-darken-1"
            size="small"
            prepend-icon="mdi-sync"
            class="text-none text-caption"
            :loading="isSyncing"
            @click="syncData"
          >
            Live Sync
          </v-btn>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            class="text-none font-weight-bold"
            @click="openAddDeviceModal"
          >
            Tambah Perangkat
          </v-btn>
        </div>
      </div>
    </nav>

    <!-- TAB 0: RINGKASAN -->
    <div v-if="activeTab === 0">
      
      <!-- METRICS SUMMARY -->
      <v-row class="mb-5">
        <v-col
          v-for="(metric, index) in metrics"
          :key="index"
          cols="12"
          sm="6"
          md="4"
          lg="2.4"
        >
          <v-card variant="flat" class="metric-card border rounded-lg pa-4 bg-white h-100">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-medium-emphasis">
                {{ metric.title }}
              </span>
              <v-avatar :color="metric.color" variant="tonal" size="36">
                <v-icon :icon="metric.icon" size="19" />
              </v-avatar>
            </div>
            <div class="text-h4 font-weight-bold text-grey-darken-4">
              {{ metric.count }}
            </div>
            <div class="text-caption text-grey-darken-1 mt-1">
              {{ metric.unit }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ metric.sub }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- QUICK ACTION BAR -->
      <v-card variant="flat" class="border rounded-lg bg-white pa-4 mb-5">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-flash-outline" color="amber-darken-3" />
            <span class="font-weight-bold text-body-2">Aksi Cepat Modul Hardware:</span>
          </div>
          <div class="d-flex align-center flex-wrap ga-2">
            <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-bluetooth-transfer" class="text-none" @click="openBleScanModal">
              Pindai Perangkat BLE
            </v-btn>
            <v-btn size="small" variant="tonal" color="info" prepend-icon="mdi-file-export-outline" class="text-none" @click="exportToCSV">
              Export Data CSV
            </v-btn>
            <v-btn size="small" variant="tonal" color="purple" prepend-icon="mdi-calendar-plus" class="text-none" @click="openCalibrationModal">
              Jadwalkan Kalibrasi
            </v-btn>
            <v-btn size="small" variant="tonal" color="error" prepend-icon="mdi-bell-plus-outline" class="text-none" @click="openAddAlertModal">
              Buat Alert Manual
            </v-btn>
          </div>
        </div>
      </v-card>

      <!-- SYSTEM TOPOLOGY CARD (RINGKASAN SITE WAMENA) -->
      <v-card variant="flat" class="border rounded-lg bg-white mb-5">
        <div class="pa-5 pb-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6 font-weight-bold text-grey-darken-3">
                Ringkasan Topologi Utama - Wamena (WMX)
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Alur singkat koneksi hardware aktif di lokasi utama Wamena.
              </div>
            </div>
            <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle-outline">
              Semua koneksi normal
            </v-chip>
          </div>
        </div>

        <v-divider />

        <div class="topology-container pa-5">
          <div class="topology-flow">
            <div class="topology-node">
              <v-avatar color="primary" variant="tonal" size="46">
                <v-icon icon="mdi-barrel" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">DRUM-0001</div>
              <div class="text-caption text-medium-emphasis">RFID Fuel Tag</div>
              <v-chip size="x-small" color="info" variant="tonal" class="mt-2">Tersedia</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-bluetooth" color="primary" size="20" />
              <div class="connector-line connector-bluetooth" />
              <span>Bluetooth</span>
            </div>

            <div class="topology-node topology-node-active">
              <v-avatar color="info" variant="tonal" size="46">
                <v-icon icon="mdi-gauge" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">FLOW-0001</div>
              <div class="text-caption text-medium-emphasis">Digital Flowmeter</div>
              <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-shield-link-variant-outline" color="grey-darken-1" size="20" />
              <div class="connector-line" />
              <span>Interlock</span>
            </div>

            <div class="topology-node">
              <v-avatar color="deep-orange" variant="tonal" size="46">
                <v-icon icon="mdi-pipe-valve" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">SOL-0001</div>
              <div class="text-caption text-medium-emphasis">Solenoid Valve</div>
              <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-arrow-right-thin" color="primary" size="22" />
              <div class="connector-line connector-data" />
              <span>Data Flow</span>
            </div>

            <div class="topology-stack">
              <div class="topology-node">
                <v-avatar color="warning" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-station-outline" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">SKID-0001</div>
                <div class="text-caption text-medium-emphasis">Refueling Skid</div>
                <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
              </div>

              <v-icon icon="mdi-arrow-down" color="grey-darken-1" size="20" class="my-2" />

              <div class="topology-node">
                <v-avatar color="teal" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-cylinder" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">NOZZLE-0001</div>
                <div class="text-caption text-medium-emphasis">Refueling Nozzle</div>
                <v-chip size="x-small" color="teal" variant="tonal" class="mt-2">Ready</v-chip>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </div>

    <!-- TAB 1: PERANGKAT -->
    <div v-else-if="activeTab === 1">
      <v-row class="align-start">
        
        <!-- DEVICE TABLE -->
        <v-col cols="12" lg="8">
          <v-card variant="flat" class="border rounded-lg bg-white">
            <div class="pa-5 pb-4">
              <div class="d-flex align-center justify-space-between mb-1">
                <div>
                  <div class="text-h6 font-weight-bold text-grey-darken-3">
                    Daftar Perangkat
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Registry perangkat hardware yang terhubung dengan sistem.
                  </div>
                </div>
                <div class="d-flex align-center ga-2">
                  <v-btn
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-bluetooth-connect"
                    size="small"
                    class="text-none font-weight-bold"
                    @click="openBleScanModal"
                  >
                    Pindai Perangkat
                  </v-btn>
                  <v-btn
                    variant="outlined"
                    color="primary"
                    prepend-icon="mdi-tray-arrow-down"
                    size="small"
                    class="text-none"
                    @click="exportToCSV"
                  >
                    Export
                  </v-btn>
                </div>
              </div>
            </div>

            <v-divider />

            <!-- FILTERS -->
            <div class="pa-5 pb-3">
              <v-row density="compact" class="ma-0">
                <v-col cols="12" md="4" class="pa-1">
                  <v-text-field
                    v-model="searchQuery"
                    placeholder="Cari ID, serial number, perangkat..."
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                  />
                </v-col>
                <v-col cols="4" md="2.3" class="pa-1">
                  <v-select v-model="selectedType" :items="typeOptions" label="Tipe" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="4" md="2.3" class="pa-1">
                  <v-select v-model="selectedStatus" :items="statusOptions" label="Status" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="4" md="2.4" class="pa-1">
                  <v-select v-model="selectedLocation" :items="locationOptions" label="Lokasi" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" class="pa-1 text-right" v-if="searchQuery || selectedType !== 'Semua Tipe' || selectedStatus !== 'Semua Status' || selectedLocation !== 'Semua Lokasi'">
                  <v-btn variant="text" color="error" size="x-small" class="text-none" @click="resetFilters">
                    Reset Filter
                  </v-btn>
                </v-col>
              </v-row>
            </div>

            <!-- TABLE -->
            <div class="px-5">
              <v-table density="comfortable" class="border rounded-lg">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">Perangkat</th>
                    <th class="font-weight-bold text-caption">Tipe</th>
                    <th class="font-weight-bold text-caption">Lokasi</th>
                    <th class="font-weight-bold text-caption">Status</th>
                    <th class="font-weight-bold text-caption">Koneksi</th>
                    <th class="font-weight-bold text-caption">Last Seen</th>
                    <th class="font-weight-bold text-caption text-center" style="width: 100px;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in paginatedDevices"
                    :key="item.id"
                    class="device-row"
                    :class="{ 'device-row-selected': selectedDevice?.id === item.id }"
                    @click="selectDevice(item.id)"
                  >
                    <td>
                      <div class="d-flex align-center ga-3 py-1">
                        <v-avatar :color="getDeviceTypeColor(item.type)" variant="tonal" size="34">
                          <v-icon :icon="item.icon" size="18" />
                        </v-avatar>
                        <div>
                          <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                          <div class="text-caption text-medium-emphasis">SN: {{ item.sn }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip size="x-small" variant="tonal" :color="getDeviceTypeColor(item.type)">
                        {{ item.type }}
                      </v-chip>
                    </td>
                    <td class="text-body-2">{{ item.location }}</td>
                    <td>
                      <v-chip
                        size="small"
                        :color="getStatusBadge(item.status).color"
                        :variant="getStatusBadge(item.status).variant"
                        class="font-weight-medium"
                      >
                        <span class="status-dot mr-1" :class="`status-${item.status.toLowerCase()}`" />
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td class="text-body-2">
                      <span v-if="item.status === 'Online' && item.bleConnection === 'Baik'" class="d-flex align-center ga-1 text-primary">
                        <v-icon icon="mdi-bluetooth-connect" color="primary" size="15" />
                        {{ item.connection }}
                      </span>
                      <span v-else-if="item.connection.includes('Interlock')" class="text-success font-weight-medium">
                        ✓ {{ item.connection }}
                      </span>
                      <span v-else-if="item.status === 'Offline' || item.bleConnection === 'Terputus'" class="text-error font-weight-medium">
                        Terputus
                      </span>
                      <span v-else class="text-medium-emphasis">{{ item.connection }}</span>
                    </td>
                    <td class="text-caption font-weight-medium text-grey-darken-2">{{ item.lastSeen }}</td>
                    <td class="text-center" @click.stop>
                      <v-menu location="bottom end">
                        <template #activator="{ props }">
                          <v-btn icon="mdi-dots-vertical" variant="text" size="small" color="grey-darken-1" v-bind="props" />
                        </template>
                        <v-list density="compact" class="rounded-lg">
                          <v-list-item prepend-icon="mdi-eye-outline" title="Detail & History" @click="openHistoryModal(item)" />
                          <v-list-item prepend-icon="mdi-pencil-outline" title="Edit Perangkat" @click="openEditDeviceModal(item)" />
                          <v-list-item prepend-icon="mdi-counter" title="Reset Totalizer" @click="resetTotalizer(item)" />
                          <v-divider />
                          <v-list-item
                            v-if="item.status === 'Online'"
                            prepend-icon="mdi-bluetooth-off"
                            title="Putuskan Bluetooth"
                            class="text-warning"
                            @click="disconnectBLE(item)"
                          />
                          <v-list-item
                            v-else
                            prepend-icon="mdi-bluetooth-connect"
                            title="Hubungkan Bluetooth"
                            class="text-success"
                            @click="reconnectBLE(item)"
                          />
                          <v-divider />
                          <v-list-item prepend-icon="mdi-delete-outline" title="Hapus" class="text-error" @click="confirmDeleteDevice(item)" />
                        </v-list>
                      </v-menu>
                    </td>
                  </tr>

                  <tr v-if="!paginatedDevices.length">
                    <td colspan="7" class="text-center py-8">
                      <v-icon icon="mdi-database-search-outline" size="36" color="grey-lighten-1" class="mb-2" />
                      <div class="text-body-2 text-medium-emphasis">
                        Tidak ada perangkat yang sesuai dengan filter.
                      </div>
                      <v-btn variant="text" color="primary" size="small" class="mt-2 text-none" @click="resetFilters">
                        Reset Filter
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <!-- FOOTER -->
            <div class="d-flex align-center justify-space-between flex-wrap pa-5">
              <span class="text-caption text-medium-emphasis">
                Menampilkan <strong>{{ displayStart }}–{{ displayEnd }}</strong> dari <strong>{{ filteredDevices.length }}</strong> perangkat
              </span>
              <div class="d-flex align-center ga-3 mt-3 mt-sm-0">
                <v-pagination v-model="page" :length="pageCount" :total-visible="4" density="compact" />
                <v-select v-model="itemsPerPage" :items="[5, 10, 25]" variant="outlined" density="compact" hide-details style="width: 105px;" />
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- DEVICE DETAIL PANEL -->
        <v-col cols="12" lg="4">
          <v-card variant="flat" class="border rounded-lg bg-white device-detail">
            <div class="pa-5">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-avatar color="info" variant="tonal" size="46">
                    <v-icon :icon="selectedDevice.icon" size="24" />
                  </v-avatar>
                  <div>
                    <div class="d-flex align-center ga-2">
                      <span class="text-subtitle-1 font-weight-bold">{{ selectedDevice.id }}</span>
                      <v-chip size="x-small" color="info" variant="tonal">{{ selectedDevice.type }}</v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ selectedDevice.name }}</div>
                  </div>
                </div>
                <v-chip size="small" :color="getStatusBadge(selectedDevice.status).color" :variant="getStatusBadge(selectedDevice.status).variant" class="font-weight-bold">
                  {{ selectedDevice.status }}
                </v-chip>
              </div>
            </div>

            <v-divider />

            <!-- DEVICE INFO -->
            <div class="pa-5 pb-3">
              <div class="section-label mb-3">INFORMASI PERANGKAT</div>
              <div class="info-list">
                <div class="info-row"><span>Serial Number</span><strong>{{ selectedDevice.sn }}</strong></div>
                <div class="info-row"><span>Model</span><strong>{{ selectedDevice.model }}</strong></div>
                <div class="info-row"><span>Manufacturer</span><strong>{{ selectedDevice.manufacturer }}</strong></div>
                <div class="info-row"><span>Lokasi</span><strong>{{ selectedDevice.location }}</strong></div>
                <div class="info-row"><span>Terhubung ke</span><strong class="text-primary">{{ selectedDevice.connectedTo }}</strong></div>
                <div class="info-row align-center">
                  <span>Daya Baterai</span>
                  <div class="d-flex align-center ga-2">
                    <strong>{{ selectedDevice.battery }}%</strong>
                    <v-progress-linear :model-value="selectedDevice.battery" :color="selectedDevice.battery < 20 ? 'error' : 'success'" height="6" rounded style="width: 55px;" />
                  </div>
                </div>
                <div class="info-row"><span>Sinyal BLE</span><strong :class="selectedDevice.status === 'Online' ? 'text-success' : 'text-error'">{{ selectedDevice.bleSignal }}</strong></div>
                <div class="info-row"><span>Terakhir Terhubung</span><strong class="text-primary font-weight-bold">{{ selectedDevice.lastSeen }}</strong></div>
              </div>
            </div>

            <!-- MEASUREMENT -->
            <div class="px-5 pb-4">
              <div class="measurement-card pa-4 rounded-lg">
                <div class="section-label mb-3">PARAMETER PENGUKURAN</div>
                <div class="measurement-main">
                  <div class="text-caption text-medium-emphasis">Total Volume</div>
                  <div class="text-h5 font-weight-bold text-grey-darken-4">{{ selectedDevice.totalVolume }}</div>
                </div>
                <v-row density="compact" class="mt-2">
                  <v-col cols="6"><div class="measurement-item"><span>Flow Rate</span><strong>{{ selectedDevice.flowRate }}</strong></div></v-col>
                  <v-col cols="6"><div class="measurement-item"><span>Suhu</span><strong>{{ selectedDevice.temp }}</strong></div></v-col>
                  <v-col cols="6"><div class="measurement-item"><span>Density</span><strong>{{ selectedDevice.density }}</strong></div></v-col>
                  <v-col cols="6"><div class="measurement-item"><span>Totalizer Reset</span><strong>{{ selectedDevice.totalizerReset }}</strong></div></v-col>
                </v-row>
              </div>
            </div>

            <!-- HEALTH -->
            <div class="px-5 pb-5">
              <div class="section-label mb-3">STATUS & HEALTH</div>
              <div class="health-list">
                <div class="health-row"><span>Kalibrasi Berlaku</span><span class="health-ok"><v-icon icon="mdi-check-circle" size="15" />{{ selectedDevice.calibrationValid }}</span></div>
                <div class="health-row"><span>Interlock</span><span class="health-ok"><v-icon icon="mdi-check-circle" size="15" />{{ selectedDevice.interlock }}</span></div>
                <div class="health-row"><span>Overflow Protection</span><span class="health-ok"><v-icon icon="mdi-check-circle" size="15" />{{ selectedDevice.overflowProtection }}</span></div>
                <div class="health-row">
                  <span>Koneksi Bluetooth</span>
                  <span :class="selectedDevice.bleConnection === 'Baik' ? 'health-ok' : 'text-error font-weight-bold'">
                    <v-icon :icon="selectedDevice.bleConnection === 'Baik' ? 'mdi-check-circle' : 'mdi-close-circle'" size="15" />
                    {{ selectedDevice.bleConnection }}
                  </span>
                </div>
                <div class="health-row"><span>Kesehatan Perangkat</span><span class="health-ok"><v-icon icon="mdi-check-circle" size="15" />{{ selectedDevice.health }}</span></div>
              </div>
            </div>

            <!-- ACTION BUTTONS IN DETAIL PANEL -->
            <div class="px-5 pb-5 d-flex flex-column ga-2">
              <v-btn
                v-if="selectedDevice.status === 'Online'"
                variant="flat"
                color="warning"
                block
                prepend-icon="mdi-bluetooth-off"
                class="text-none font-weight-bold"
                @click="disconnectBLE(selectedDevice)"
              >
                Putuskan Bluetooth
              </v-btn>
              <v-btn
                v-else
                variant="flat"
                color="success"
                block
                prepend-icon="mdi-bluetooth-connect"
                class="text-none font-weight-bold"
                @click="reconnectBLE(selectedDevice)"
              >
                Hubungkan Bluetooth
              </v-btn>

              <div class="d-flex ga-2">
                <v-btn
                  variant="outlined"
                  color="grey-darken-2"
                  class="flex-grow-1 text-none"
                  size="small"
                  prepend-icon="mdi-counter"
                  @click="resetTotalizer(selectedDevice)"
                >
                  Reset Totalizer
                </v-btn>
                <v-btn
                  variant="outlined"
                  color="primary"
                  class="flex-grow-1 text-none font-weight-bold"
                  size="small"
                  prepend-icon="mdi-history"
                  @click="openHistoryModal(selectedDevice)"
                >
                  Riwayat
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>

      </v-row>
    </div>

    <!-- TAB 2: TOPOLOGI & KONEKSI -->
    <div v-else-if="activeTab === 2">
      
      <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
        <div>
          <div class="text-h6 font-weight-bold text-grey-darken-3">Topologi Network & Koneksi Hardware</div>
          <div class="text-caption text-medium-emphasis">Visualisasi realtime alur data sensor BLE, valve interlock, dan gateway.</div>
        </div>
        <div class="d-flex ga-2">
          <v-btn variant="outlined" color="primary" size="small" prepend-icon="mdi-network-outline" class="text-none" @click="pingTopologyNodes">
            Tes Sinyal Telemetri
          </v-btn>
          <v-btn variant="tonal" color="warning" size="small" prepend-icon="mdi-flash-alert-outline" class="text-none" @click="simulateTopologyDisconnect">
            Simulasi Putus BLE
          </v-btn>
        </div>
      </div>

      <!-- DIAGRAM 1: SITE WAMENA (WMX) -->
      <v-card variant="flat" class="border rounded-lg bg-white mb-5">
        <div class="pa-5 pb-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6 font-weight-bold text-grey-darken-3">
                Diagram 1: Topologi System Refueling Skid Wamena (WMX)
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Jalur integrasi sensor BLE, flowmeter, solenoid interlock, dan nozzle di Wamena.
              </div>
            </div>
            <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle-outline">
              Status Online Normal
            </v-chip>
          </div>
        </div>

        <v-divider />

        <div class="topology-container pa-5">
          <div class="topology-flow">
            <div class="topology-node">
              <v-avatar color="primary" variant="tonal" size="46">
                <v-icon icon="mdi-barrel" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">DRUM-0001</div>
              <div class="text-caption text-medium-emphasis">RFID Fuel Tag</div>
              <v-chip size="x-small" color="info" variant="tonal" class="mt-2">Tersedia</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-bluetooth" color="primary" size="20" />
              <div class="connector-line connector-bluetooth" />
              <span>Bluetooth</span>
            </div>

            <div class="topology-node topology-node-active">
              <v-avatar color="info" variant="tonal" size="46">
                <v-icon icon="mdi-gauge" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">FLOW-0001</div>
              <div class="text-caption text-medium-emphasis">Digital Flowmeter</div>
              <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-shield-link-variant-outline" color="grey-darken-1" size="20" />
              <div class="connector-line" />
              <span>Interlock</span>
            </div>

            <div class="topology-node">
              <v-avatar color="deep-orange" variant="tonal" size="46">
                <v-icon icon="mdi-pipe-valve" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">SOL-0001</div>
              <div class="text-caption text-medium-emphasis">Solenoid Valve</div>
              <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-arrow-right-thin" color="primary" size="22" />
              <div class="connector-line connector-data" />
              <span>Data Flow</span>
            </div>

            <div class="topology-stack">
              <div class="topology-node">
                <v-avatar color="warning" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-station-outline" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">SKID-0001</div>
                <div class="text-caption text-medium-emphasis">Refueling Skid</div>
                <v-chip size="x-small" color="success" variant="tonal" class="mt-2">Online</v-chip>
              </div>

              <v-icon icon="mdi-arrow-down" color="grey-darken-1" size="20" class="my-2" />

              <div class="topology-node">
                <v-avatar color="teal" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-cylinder" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">NOZZLE-0001</div>
                <div class="text-caption text-medium-emphasis">Refueling Nozzle</div>
                <v-chip size="x-small" color="teal" variant="tonal" class="mt-2">Ready</v-chip>
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <!-- DIAGRAM 2: SITE SENTANI (DJJ) -->
      <v-card variant="flat" class="border rounded-lg bg-white mb-5">
        <div class="pa-5 pb-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6 font-weight-bold text-grey-darken-3">
                Diagram 2: Topologi System Refueling Skid Sentani (DJJ)
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                Jalur integrasi hardware di lokasi Sentani (Mendapat peringatan koneksi terputus).
              </div>
            </div>
            <v-chip size="small" color="error" variant="tonal" prepend-icon="mdi-alert-circle-outline">
              Perlu Pemeriksaan
            </v-chip>
          </div>
        </div>

        <v-divider />

        <div class="topology-container pa-5">
          <div class="topology-flow">
            <div class="topology-node">
              <v-avatar color="primary" variant="tonal" size="46">
                <v-icon icon="mdi-barrel" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">DRUM-0002</div>
              <div class="text-caption text-medium-emphasis">RFID Fuel Tag</div>
              <v-chip size="x-small" color="info" variant="tonal" class="mt-2">Tersedia</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-bluetooth-off" color="error" size="20" />
              <div class="connector-line connector-disconnected" />
              <span class="text-error">BLE Off</span>
            </div>

            <div class="topology-node topology-node-offline">
              <v-avatar color="error" variant="tonal" size="46">
                <v-icon icon="mdi-gauge text-error" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">FLOW-0002</div>
              <div class="text-caption text-medium-emphasis">Digital Flowmeter</div>
              <v-chip size="x-small" color="error" variant="tonal" class="mt-2">Offline</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-shield-alert-outline" color="warning" size="20" />
              <div class="connector-line connector-warning" />
              <span class="text-warning">Interlock Warning</span>
            </div>

            <div class="topology-node">
              <v-avatar color="deep-orange" variant="tonal" size="46">
                <v-icon icon="mdi-pipe-valve" size="24" />
              </v-avatar>
              <div class="font-weight-bold text-body-2 mt-2">SOL-0002</div>
              <div class="text-caption text-medium-emphasis">Solenoid Valve</div>
              <v-chip size="x-small" color="warning" variant="tonal" class="mt-2">Standby</v-chip>
            </div>

            <div class="topology-connector">
              <v-icon icon="mdi-arrow-right-thin" color="grey" size="22" />
              <div class="connector-line" />
              <span>Data Flow</span>
            </div>

            <div class="topology-stack">
              <div class="topology-node">
                <v-avatar color="warning" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-station-outline" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">SKID-0002</div>
                <div class="text-caption text-medium-emphasis">Refueling Skid</div>
                <v-chip size="x-small" color="warning" variant="tonal" class="mt-2">Idle</v-chip>
              </div>

              <v-icon icon="mdi-arrow-down" color="grey-darken-1" size="20" class="my-2" />

              <div class="topology-node">
                <v-avatar color="teal" variant="tonal" size="46">
                  <v-icon icon="mdi-gas-cylinder" size="24" />
                </v-avatar>
                <div class="font-weight-bold text-body-2 mt-2">NOZZLE-0002</div>
                <div class="text-caption text-medium-emphasis">Refueling Nozzle</div>
                <v-chip size="x-small" color="teal" variant="tonal" class="mt-2">Ready</v-chip>
              </div>
            </div>
          </div>
        </div>
      </v-card>

    </div>

    <!-- TAB 3: ALERT & EVENT -->
    <div v-else-if="activeTab === 3">
      <v-card variant="flat" class="border rounded-lg bg-white pa-5">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div>
            <div class="text-h6 font-weight-bold text-grey-darken-3">Log Peringatan Hardware</div>
            <div class="text-caption text-medium-emphasis">Daftar alert dan event error konektivitas maupun baterai.</div>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip color="error" variant="tonal" size="small" prepend-icon="mdi-alert-circle">
              {{ unresolvedAlertCount }} Unresolved Alert
            </v-chip>
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-plus"
              class="text-none font-weight-bold"
              @click="openAddAlertModal"
            >
              Buat Alert Manual
            </v-btn>
            <v-btn
              v-if="alertLogs.some((a: any) => a.status === 'Resolved')"
              variant="outlined"
              color="grey-darken-1"
              size="small"
              class="text-none"
              @click="clearResolvedAlerts"
            >
              Bersihkan Resolved
            </v-btn>
          </div>
        </div>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">ID Event</th>
              <th class="font-weight-bold text-caption">Perangkat</th>
              <th class="font-weight-bold text-caption">Tipe Event</th>
              <th class="font-weight-bold text-caption">Tingkat Keparahan</th>
              <th class="font-weight-bold text-caption">Pesan Detail</th>
              <th class="font-weight-bold text-caption">Waktu</th>
              <th class="font-weight-bold text-caption">Status</th>
              <th class="font-weight-bold text-caption text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in alertLogs" :key="log.id">
              <td class="font-weight-bold text-body-2">{{ log.id }}</td>
              <td class="text-primary font-weight-bold text-body-2">{{ log.device }}</td>
              <td class="text-body-2">{{ log.type }}</td>
              <td>
                <v-chip size="x-small" :color="getAlertSeverityBadge(log.severity).color" :variant="getAlertSeverityBadge(log.severity).variant">
                  {{ log.severity }}
                </v-chip>
              </td>
              <td class="text-body-2">{{ log.message }}</td>
              <td class="text-caption text-medium-emphasis">{{ log.time }}</td>
              <td>
                <v-chip size="x-small" :color="log.status === 'Unresolved' ? 'error' : 'success'" variant="tonal">
                  {{ log.status }}
                </v-chip>
              </td>
              <td class="text-center">
                <v-btn
                  v-if="log.status === 'Unresolved'"
                  variant="tonal"
                  color="success"
                  size="x-small"
                  class="text-none font-weight-bold"
                  @click="resolveAlert(log)"
                >
                  Tandai Selesai
                </v-btn>
                <span v-else class="text-caption text-medium-emphasis">Selesai</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- TAB 4: KALIBRASI & PERAWATAN -->
    <div v-else-if="activeTab === 4">
      <v-card variant="flat" class="border rounded-lg bg-white pa-5">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div>
            <div class="text-h6 font-weight-bold text-grey-darken-3">Jadwal Kalibrasi Hardware</div>
            <div class="text-caption text-medium-emphasis">Status sertifikasi dan kalibrasi rutin meteran avtur & valve.</div>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-calendar-plus"
            class="text-none font-weight-bold"
            @click="openCalibrationModal"
          >
            Jadwalkan Kalibrasi
          </v-btn>
        </div>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold text-caption">ID Perangkat</th>
              <th class="font-weight-bold text-caption">Tipe</th>
              <th class="font-weight-bold text-caption">Lokasi</th>
              <th class="font-weight-bold text-caption">Kalibrasi Terakhir</th>
              <th class="font-weight-bold text-caption">Jatuh Tempo</th>
              <th class="font-weight-bold text-caption">Inspektur / Lembaga</th>
              <th class="font-weight-bold text-caption">Status</th>
              <th class="font-weight-bold text-caption text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in calibrationSchedules" :key="item.id">
              <td class="font-weight-bold text-body-2">{{ item.device }}</td>
              <td class="text-body-2">{{ item.type }}</td>
              <td class="text-body-2">{{ item.location }}</td>
              <td class="text-caption">{{ item.lastDate }}</td>
              <td class="text-caption font-weight-bold" :class="{ 'text-error': item.status === 'Jatuh Tempo' }">{{ item.dueDate }}</td>
              <td class="text-body-2">{{ item.inspector }}</td>
              <td>
                <v-chip size="x-small" :color="item.status === 'Jatuh Tempo' ? 'error' : 'success'" variant="tonal">
                  {{ item.status }}
                </v-chip>
              </td>
              <td class="text-center">
                <div class="d-flex align-center justify-center ga-1">
                  <v-btn
                    variant="outlined"
                    color="primary"
                    size="x-small"
                    class="text-none"
                    @click="markCalibrated(item)"
                  >
                    Selesaikan Kalibrasi
                  </v-btn>
                  <v-btn
                    variant="text"
                    icon="mdi-download"
                    size="x-small"
                    color="grey-darken-1"
                    @click="downloadCalibrationCert(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- TAB 5: DOKUMENTASI -->
    <div v-else-if="activeTab === 5">
      <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
        <div>
          <div class="text-h6 font-weight-bold text-grey-darken-3">Dokumentasi Teknis & SOP</div>
          <div class="text-caption text-medium-emphasis">Manual book, wiring diagram, dan sertifikasi operasional.</div>
        </div>
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-upload"
          class="text-none font-weight-bold"
          @click="openUploadDocModal"
        >
          Unggah Dokumen Baru
        </v-btn>
      </div>

      <v-row>
        <v-col v-for="(doc, idx) in documentationList" :key="idx" cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg bg-white pa-4 h-100 d-flex flex-column justify-space-between">
            <div>
              <div class="d-flex align-center justify-space-between mb-3">
                <v-avatar color="primary" variant="tonal" size="38">
                  <v-icon icon="mdi-file-document-outline" size="20" />
                </v-avatar>
                <v-chip size="x-small" color="grey" variant="tonal">{{ doc.fileType }}</v-chip>
              </div>
              <div class="font-weight-bold text-body-2 mb-1">{{ doc.title }}</div>
              <div class="text-caption text-medium-emphasis mb-3">{{ doc.category }} • {{ doc.size }}</div>
            </div>
            <v-btn
              variant="outlined"
              color="primary"
              block
              size="small"
              prepend-icon="mdi-download-outline"
              class="text-none font-weight-bold"
              @click="downloadDoc(doc)"
            >
              Unduh Berkas
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- MODAL: PINDAI PERANGKAT BLE BARU (POP-UP SCENARIO) -->
    <v-dialog v-model="scanBleDialog" max-width="600px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-bluetooth-connect" />
            <span class="font-weight-bold text-subtitle-1">Pindai & Sambungkan BLE</span>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="scanBleDialog = false" />
        </v-card-title>

        <v-card-text class="pa-5">
          <div v-if="isScanningBLE" class="text-center py-6">
            <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
            <div class="text-body-2 font-weight-medium text-grey-darken-3">
              Mencari sinyal perangkat Bluetooth Avtur di sekitar lokasi...
            </div>
            <div class="text-caption text-medium-emphasis mt-1">Pastikan Bluetooth pada sensor/flowmeter aktif</div>
          </div>

          <div v-else>
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-grey-darken-2">PERANGKAT TERSEDIA DI SEKITAR:</span>
              <v-btn variant="text" size="x-small" color="primary" prepend-icon="mdi-refresh" class="text-none" @click="rescanBLE">
                Pindai Ulang
              </v-btn>
            </div>

            <v-list density="comfortable" class="border rounded-lg">
              <template v-for="(item, index) in scannedDevices" :key="item.id">
                <v-list-item class="py-2">
                  <template #prepend>
                    <v-avatar color="info" variant="tonal" size="36">
                      <v-icon icon="mdi-bluetooth-signal" size="20" />
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-2">
                    {{ item.id }} — {{ item.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    SN: {{ item.sn }} | RSSI: <strong class="text-success">{{ item.rssi }}</strong> | Tipe: {{ item.type }}
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                      color="primary"
                      size="small"
                      variant="tonal"
                      class="text-none font-weight-bold"
                      prepend-icon="mdi-link-variant"
                      @click="connectScannedDevice(item)"
                    >
                      Hubungkan
                    </v-btn>
                  </template>
                </v-list-item>
                <v-divider v-if="Number(index) < scannedDevices.length - 1" />
              </template>
            </v-list>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="scanBleDialog = false">
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: TAMBAH / EDIT PERANGKAT -->
    <v-dialog v-model="addDeviceDialog" max-width="650px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center justify-space-between">
          <span class="font-weight-bold text-subtitle-1">
            {{ isEditMode ? 'Edit Perangkat' : 'Tambah Perangkat Baru' }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="addDeviceDialog = false" />
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-5">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field v-model="deviceForm.id" label="ID Perangkat *" variant="outlined" density="compact" :disabled="isEditMode" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="deviceForm.sn" label="Serial Number *" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="deviceForm.name" label="Nama Perangkat *" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="deviceForm.type" :items="typeOptions.filter((t: string) => t !== 'Semua Tipe')" label="Tipe Perangkat" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="deviceForm.location" :items="locationOptions.filter((l: string) => l !== 'Semua Lokasi')" label="Lokasi Bandara" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="deviceForm.status" :items="statusOptions.filter((s: string) => s !== 'Semua Status')" label="Status Operasional" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="deviceForm.model" label="Model Hardware" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="deviceForm.manufacturer" label="Produsen / Merk" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="deviceForm.connectedTo" label="Terhubung Ke (Parent Device)" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="addDeviceDialog = false">
            Batal
          </v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="saveDevice">
            {{ isEditMode ? 'Simpan Perubahan' : 'Tambah Perangkat' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: BUAT ALERT MANUAL -->
    <v-dialog v-model="addAlertDialog" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center justify-space-between">
          <span class="font-weight-bold text-subtitle-1">Buat Log Alert Baru</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="addAlertDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row density="comfortable">
            <v-col cols="12">
              <v-select v-model="alertForm.device" :items="devices.map((d: any) => d.id)" label="Pilih Perangkat" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="alertForm.type" :items="['Koneksi Terputus', 'Baterai Lemah', 'Suhu Tinggi', 'Interlock Warning', 'Sensor Abnormal']" label="Tipe Event" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="alertForm.severity" :items="['High', 'Medium', 'Low']" label="Tingkat Keparahan" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="alertForm.message" label="Pesan / Catatan Detail" variant="outlined" density="compact" rows="3" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="addAlertDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="saveManualAlert">Simpan Alert</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: JADWAL KALIBRASI -->
    <v-dialog v-model="calibrationDialog" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center justify-space-between">
          <span class="font-weight-bold text-subtitle-1">Jadwalkan Kalibrasi Baru</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="calibrationDialog = false" />
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-5">
          <v-row density="comfortable">
            <v-col cols="12">
              <v-select
                v-model="calibrationForm.device"
                :items="devices.map((d: any) => d.id)"
                label="Pilih Perangkat"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="calibrationForm.dueDate" label="Tanggal Jatuh Tempo Kalibrasi" placeholder="misal: 15 Nov 2026" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="calibrationForm.inspector" label="Inspektur / Lembaga Metrologi" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="calibrationDialog = false">
            Batal
          </v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="scheduleCalibration">
            Simpan Jadwal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: UNGGAH DOKUMEN -->
    <v-dialog v-model="uploadDocDialog" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center justify-space-between">
          <span class="font-weight-bold text-subtitle-1">Unggah Dokumen Teknis</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="uploadDocDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row density="comfortable">
            <v-col cols="12">
              <v-text-field v-model="uploadDocForm.title" label="Judul Dokumen *" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="uploadDocForm.category" :items="['User Manual', 'Technical Specs', 'Standard Operating Procedure', 'Sertifikasi Metrologi']" label="Kategori" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="uploadDocForm.fileType" :items="['PDF', 'DOCX', 'PDF / CAD', 'XLSX']" label="Format Berkas" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="uploadDocDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none font-weight-bold" @click="uploadDoc">Unggah</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: RIWAYAT & TELEMETRI LOG -->
    <v-dialog v-model="historyDialog" max-width="700px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center justify-space-between">
          <div>
            <div class="font-weight-bold text-subtitle-1">Riwayat Telemetri {{ selectedDevice?.id }}</div>
            <div class="text-caption text-medium-emphasis">{{ selectedDevice?.name }} (SN: {{ selectedDevice?.sn }})</div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="historyDialog = false" />
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-5">
          <v-table density="comfortable" class="border rounded-lg">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="text-caption font-weight-bold">Waktu</th>
                <th class="text-caption font-weight-bold">Flow Rate</th>
                <th class="text-caption font-weight-bold">Suhu</th>
                <th class="text-caption font-weight-bold">Density</th>
                <th class="text-caption font-weight-bold">Event Log</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(h, idx) in selectedDeviceHistory" :key="idx">
                <td class="text-caption font-weight-bold">{{ h.timestamp }}</td>
                <td class="text-body-2">{{ h.flowRate }}</td>
                <td class="text-body-2">{{ h.temp }}</td>
                <td class="text-body-2">{{ h.density }}</td>
                <td class="text-caption text-primary font-weight-medium">{{ h.event }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="primary" variant="tonal" class="text-none font-weight-bold" @click="historyDialog = false">
            Tutup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL: HAPUS PERANGKAT -->
    <v-dialog v-model="deleteDialog" max-width="420px">
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-red-lighten-5 text-error d-flex align-center ga-2">
          <v-icon icon="mdi-alert-circle" color="error" />
          <span class="font-weight-bold text-subtitle-1">Konfirmasi Hapus</span>
        </v-card-title>
        <v-card-text class="pa-5 text-body-2">
          Apakah Anda yakin ingin menghapus perangkat <strong>{{ deviceToDelete?.id }}</strong> ({{ deviceToDelete?.name }})? Tindakan ini tidak dapat dibatalkan.
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end ga-2">
          <v-btn variant="outlined" color="grey-darken-1" class="text-none" @click="deleteDialog = false">
            Batal
          </v-btn>
          <v-btn color="error" class="text-none font-weight-bold" @click="deleteDevice">
            Ya, Hapus
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<style scoped>
.hardware-page {
  min-height: 100vh;
}

.metric-card {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06) !important;
}

/* TOPOLOGY STYLING */
.topology-container {
  overflow-x: auto;
}

.topology-flow {
  min-width: 980px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.topology-node {
  width: 155px;
  min-width: 155px;
  padding: 16px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #ffffff;
  text-align: center;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.topology-node:hover {
  border-color: #bdbdbd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.topology-node-active {
  border-color: rgba(25, 118, 210, 0.35);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.05);
}

.topology-node-offline {
  border-color: rgba(211, 47, 47, 0.35);
  background: #fff8f8;
}

.topology-connector {
  min-width: 88px;
  text-align: center;
  color: #757575;
  font-size: 11px;
}

.connector-line {
  width: 64px;
  margin: 5px auto;
  border-top: 2px solid #9e9e9e;
}

.connector-bluetooth {
  border-top-style: dashed;
  border-top-color: #1976d2;
}

.connector-disconnected {
  border-top-style: dotted;
  border-top-color: #d32f2f;
}

.connector-warning {
  border-top-style: dashed;
  border-top-color: #ed6c02;
}

.connector-data {
  border-top-color: #1976d2;
}

.topology-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* DEVICE TABLE STYLING */
.device-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.device-row:hover {
  background: #fafafa;
}

.device-row-selected {
  background: #eef5ff !important;
}

.device-row td {
  border-bottom: 1px solid #eeeeee;
}

.status-dot {
  width: 6px;
  height: 6px;
  display: inline-block;
  border-radius: 50%;
}

.status-online { background: #2e7d32; }
.status-offline { background: #c62828; }
.status-ready { background: #00897b; }
.status-tersedia { background: #1976d2; }

/* DETAIL PANEL */
.device-detail {
  position: sticky;
  top: 20px;
}

.section-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #757575;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
}

.info-row > span:first-child {
  color: #757575;
}

.info-row strong {
  max-width: 62%;
  text-align: right;
  color: #424242;
  font-weight: 600;
}

.measurement-card {
  background: #f7f9fb;
  border: 1px solid #edf0f2;
}

.measurement-main {
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7e9;
}

.measurement-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.measurement-item span {
  font-size: 10px;
  color: #757575;
}

.measurement-item strong {
  font-size: 12px;
  color: #424242;
}

.health-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.health-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.health-row > span:first-child {
  color: #757575;
}

.health-ok {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #2e7d32;
  font-weight: 600;
}

@media (max-width: 1279px) {
  .device-detail {
    position: static;
  }
}

@media (max-width: 768px) {
  .topology-flow {
    justify-content: flex-start;
  }

  .info-row {
    flex-direction: column;
    gap: 3px;
  }

  .info-row strong {
    max-width: 100%;
    text-align: left;
  }
}
</style>