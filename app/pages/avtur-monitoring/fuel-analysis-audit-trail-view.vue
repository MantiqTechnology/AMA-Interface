<script setup lang="ts">
//import { ref, computed } from 'vue'

// ==========================================
// 1. STATE MANAGEMENT & DIALOG CONTROLLERS
// ==========================================
const activeTab = ref(0)
const page = ref(1)
const itemsPerPage = ref(10)
const isRefreshing = ref(false)

// Dialog Modals State
const showExportDialog = ref(false)
const showVerifyModal = ref(false)
const showNewTransferModal = ref(false)
const showCalibModal = ref(false)

// Dynamic Form Models
const newTransferForm = ref({
  origin: 'Wamena Hub (WMX)',
  dest: 'Airstrip Okbibab',
  qty: '',
  flightNo: ''
})

const newCalibForm = ref({
  toolName: '',
  toolId: '',
  station: 'Sentani Hub (DJJ)',
  nextCalib: ''
})

// Export Models
const selectedExportFormat = ref('CSV Raw Ledger Data')
const includeHashCert = ref(true)

// Global Filters
const datePeriod = ref('Agustus 2026')
const selectedCategory = ref('Semua Kategori Aktivitas')
const selectedStation = ref('Semua Station / Hub')
const selectedUserRole = ref('Semua Role Pengguna')
const searchQuery = ref('')

// Breadcrumb Navigation
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Analytics, Safety Compliance & Immutable Audit Trail', disabled: true, href: '#' },
]

// Tab Navigation Config
const tabs = [
  { title: 'Immutable Audit Trail', icon: 'mdi-shield-check-outline' },
  { title: 'Analitik Operasional & Stok', icon: 'mdi-chart-line' },
  { title: 'Laporan Kepatuhan Kemenhub & JIG', icon: 'mdi-file-certificate-outline' },
  { title: 'Mutasi & Serah-Terima Drum', icon: 'mdi-swap-horizontal' },
  { title: 'Checklist Safety & Kalibrasi', icon: 'mdi-clipboard-check-outline' },
  { title: 'Log Aktivitas Pengguna & Sesi', icon: 'mdi-account-clock-outline' },
]

// ==========================================
// METRICS & AUDIT TRAIL LEDGER DATA
// ==========================================
const metrics = [
  { title: 'Total Audit Logs (Bulan Ini)', count: '14,280 Logs', unit: '100% Cryptographically Signed', sub: 'SHA-256 Hash Valid', icon: 'mdi-lock-check-outline', color: 'primary' },
  { title: 'Tingkat Kepatuhan Regulator', count: '99.8%', unit: 'Standard CASR 135 & JIG 4', sub: 'Siap Audit DKPPU', icon: 'mdi-file-certificate', color: 'teal' },
  { title: 'Serah-Terima & Mutasi Drum', count: '1,240 Event', unit: 'Tracking Barcode & GPS', sub: 'Terverifikasi Digital Sign', icon: 'mdi-barrel-outline', color: 'info' },
  { title: 'Inspeksi & Checklist Safety', count: '380 Form', unit: 'Pemeriksaan Visual & Density', sub: '0 Temuan Critical Violations', icon: 'mdi-clipboard-list-outline', color: 'success' },
  { title: 'Up-Sync Transaksi Pedalaman', count: '99.2%', unit: 'Airstrip Offline-to-Online', sub: 'Auto-reconciled saat online', icon: 'mdi-cloud-sync-outline', color: 'warning' },
  { title: 'Status Keamanan Ledger', count: '0 Modifikasi', unit: 'Pencegahan Manipulasi Data', sub: 'Zero Tampering Detected', icon: 'mdi-security-check', color: 'purple' },
]

const auditTrailSteps = [
  { step: 1, title: 'Event Capture & Time-Stamp', desc: 'Pencatatan real-time atas transaksi refuel, mutasi drum, checklist, dan aktivitas pengguna.', icon: 'mdi-key-change', color: 'primary' },
  { step: 2, title: 'SHA-256 Hash Generation', desc: 'Sistem meretas payload data + timestamp + hash sebelumnya menjadi blok kriptografi.', icon: 'mdi-file-lock-outline', color: 'teal' },
  { step: 3, title: 'Immutable Ledger Storage', desc: 'Penyimpanan log ke database append-only berstempel digital untuk mencegah manipulasi.', icon: 'mdi-database-lock-outline', color: 'purple' },
  { step: 4, title: 'Real-time Safety Analytics', desc: 'Pengolahan otomatis tren operasional, variansi stok, dan indikator keselamatan (SPI).', icon: 'mdi-chart-bell-curve-cumulative', color: 'warning' },
  { step: 5, title: 'Regulatory Compliance Export', desc: 'Penerbitan laporan resmi berbasis standar DKPPU, Pertamina DPPU, dan JIG untuk audit berkala.', icon: 'mdi-printer-check', color: 'success' },
]

const auditLogs = ref([
  { id: 'LOG-20260822-0941', category: 'Checklist Safety', eventName: 'Inspeksi Kualitas Avtur (Water Detector)', station: 'Airstrip Okbibab', user: 'Alex (Ground Ops OKB)', timestamp: '22 Aug 2026 10:15:02 WIB', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260822-0940', category: 'Mutasi Drum', eventName: 'Serah-Terima 10 Drum Avtur (WMX -> OKB)', station: 'Wamena Hub (WMX)', user: 'Budi Santoso (Supervisor WMX)', timestamp: '22 Aug 2026 09:30:11 WIB', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260822-0939', category: 'Transaksi Refuel', eventName: 'Refueling Flight AMA-308 (380 Liter)', station: 'Airstrip Okbibab', user: 'Capt. Hendra (Pilot Twin Otter)', timestamp: '22 Aug 2026 08:45:50 WIB', hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260822-0938', category: 'Perubahan Status / Flag', eventName: 'Quarantine Drum #DRUM-00092 (Segel Rusak)', station: 'Airstrip Okbibab', user: 'Alex (Ground Ops OKB)', timestamp: '22 Aug 2026 08:20:15 WIB', hash: '7c9e6679b4d32a0c8c7f3299a9b7068d87870377a06c592182b8f888f4c2c549', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260822-0937', category: 'Sinkronisasi Data', eventName: 'Offline-Sync Reconciled (5 Tx Pending)', station: 'Airstrip Boven Digoel', user: 'System Auto-Sync Engine', timestamp: '22 Aug 2026 07:10:04 WIB', hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260822-0936', category: 'Aktivitas Pengguna', eventName: 'User Login & Certificate Verification', station: 'Sentani Hub (DJJ)', user: 'Diva (Finance Manager)', timestamp: '22 Aug 2026 07:00:00 WIB', hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260821-0812', category: 'Transaksi Refuel', eventName: 'Refueling Flight PK-RBA (450 Liter)', station: 'Sentani Hub (DJJ)', user: 'Rahmat (Refuel Operator)', timestamp: '21 Aug 2026 16:20:00 WIB', hash: '9c884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1599a1', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260821-0755', category: 'Checklist Safety', eventName: 'Kalibrasi Hydrometer & Thermometer Test', station: 'Wamena Hub (WMX)', user: 'Budi Santoso (Supervisor WMX)', timestamp: '21 Aug 2026 14:10:22 WIB', hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', status: 'Verified Valid', statusColor: 'success' },
  { id: 'LOG-20260821-0610', category: 'Mutasi Drum', eventName: 'Penerimaan Supplier Pertamina (100 Drum)', station: 'Sentani Hub (DJJ)', user: 'Diva (Finance Manager)', timestamp: '21 Aug 2026 09:15:33 WIB', hash: '3f4e5d6c7b8a90123456789abcdef0123456789abcdef0123456789abcdef012', status: 'Verified Valid', statusColor: 'success' },
])

const selectedLog = ref({
  id: 'LOG-20260822-0941',
  category: 'Checklist Safety & Pengujian Kualitas',
  eventName: 'Inspeksi Kualitas Avtur via Water Detector Paste',
  station: 'Airstrip Okbibab (OKB)',
  user: 'Alex (Ground Ops OKB - ID #EMP-8821)',
  userDevice: 'Rugged Tablet Android - IMEI 86921004912903',
  ipAddress: '102.168.42.10 (Satellite Network Link)',
  timestamp: '22 Aug 2026 10:15:02 WIB (UTC+9)',
  payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  previousHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
  signatureAlgorithm: 'SHA-256 with RSA-2048 Digital Key',
  ledgerStatus: 'Immutable Block #104,982 (Verified Unaltered)',
  detailsData: {
    drumID: '#DRUM-00092',
    waterTestResult: 'Pass (Clear / Undetected Water Content)',
    densityObserved: '0.795 g/cm³ @ 15°C (Standard Limits: 0.775 - 0.840)',
    visualCheck: 'Clear, Bright & Free From Solid Particles',
    supervisorSign: 'Signed Electronically by Alex (Biometric Auth)',
  },
})

// ANALYTICS & STOCK DATA
const stationStockData = ref([
  { id: 'ST-01', name: 'Sentani Hub (DJJ)', mainTank: '48,500 L', drumCount: 140, totalVol: '76,500 L', status: 'Optimal', color: 'success', capacity: 85, burnRate: '4,200 L/Hari', daysLeft: '18 Hari', minSafetyLevel: '15,000 L' },
  { id: 'ST-02', name: 'Wamena Hub (WMX)', mainTank: '24,000 L', drumCount: 310, totalVol: '86,000 L', status: 'Optimal', color: 'success', capacity: 78, burnRate: '5,800 L/Hari', daysLeft: '14 Hari', minSafetyLevel: '20,000 L' },
  { id: 'ST-03', name: 'Airstrip Okbibab (OKB)', mainTank: 'N/A (Drum)', drumCount: 42, totalVol: '8,400 L', status: 'Rendah (Reorder)', color: 'warning', capacity: 32, burnRate: '1,100 L/Hari', daysLeft: '7 Hari', minSafetyLevel: '5,000 L' },
  { id: 'ST-04', name: 'Airstrip Boven Digoel', mainTank: 'N/A (Drum)', drumCount: 68, totalVol: '13,600 L', status: 'Normal', color: 'info', capacity: 54, burnRate: '950 L/Hari', daysLeft: '14 Hari', minSafetyLevel: '4,000 L' },
  { id: 'ST-05', name: 'Airstrip Oksibil (OKL)', mainTank: 'N/A (Drum)', drumCount: 88, totalVol: '17,600 L', status: 'Normal', color: 'info', capacity: 62, burnRate: '1,200 L/Hari', daysLeft: '14 Hari', minSafetyLevel: '6,000 L' },
  { id: 'ST-06', name: 'Timika Hub (TIM)', mainTank: '60,000 L', drumCount: 200, totalVol: '100,000 L', status: 'Optimal', color: 'success', capacity: 91, burnRate: '7,500 L/Hari', daysLeft: '22 Hari', minSafetyLevel: '25,000 L' },
])

const weeklyConsumptionChartData = [
  { day: 'Sen', flightVolume: 12400, forecast: 11800 },
  { day: 'Sel', flightVolume: 14200, forecast: 13500 },
  { day: 'Rab', flightVolume: 11800, forecast: 12000 },
  { day: 'Kam', flightVolume: 15600, forecast: 14800 },
  { day: 'Jum', flightVolume: 16800, forecast: 16000 },
  { day: 'Sab', flightVolume: 18200, forecast: 17500 },
  { day: 'Ming', flightVolume: 9400, forecast: 10000 },
]

// COMPLIANCE & REGULATORY DATA
const complianceReports = ref([
  { title: 'Laporan Kepatuhan CASR Part 135 Refueling Operations', certNo: 'CERT-DKPPU-2026-08', status: 'Compliant (100%)', date: '15 Aug 2026', inspector: 'Tim Inspektur DKPPU Kemenhub', expiry: '15 Aug 2027', category: 'Kelaikan Udara' },
  { title: 'Sertifikat Uji Kalibrasi Density Meter & Flowmeter Batch #12', certNo: 'CAL-JIG-2026-081', status: 'Valid', date: '01 Aug 2026', inspector: 'Pertamina Quality Ops', expiry: '01 Nov 2026', category: 'Kalibrasi Tool' },
  { title: 'Log Inspeksi Visual & Water Detector Drum Pedalaman', certNo: 'QC-DRUM-2026-08B', status: 'Verified Pass', date: '20 Aug 2026', inspector: 'Internal QC Officer (Diva)', expiry: '20 Sep 2026', category: 'Quality Control' },
  { title: 'Audit Auditability Kriptografis Ledger SHA-256', certNo: 'AUD-SEC-2026-004', status: 'Zero Tampering', date: '18 Aug 2026', inspector: 'Cybersecurity Auditor', expiry: '18 Aug 2027', category: 'Keamanan Data' },
  { title: 'Sertifikat Bebas Kontaminasi Tangki Induk DJJ', certNo: 'PERT-DJJ-2026-88', status: 'Compliant', date: '10 Aug 2026', inspector: 'Lab Quality Pertamina Sentani', expiry: '10 Feb 2027', category: 'Kualitas Avtur' },
  { title: 'Pemeriksaan System Grounding & Static Discharge WMX', certNo: 'SAF-WMX-2026-11', status: 'Approved', date: '05 Aug 2026', inspector: 'Aviation Safety Inspector', expiry: '05 Aug 2027', category: 'Safety Facility' },
])

const regulatoryTimeline = [
  { date: '15 Agustus 2026', title: 'Audit Tahunan Kelaikan DKPPU', desc: 'Pemeriksaan langsung fasilitas refuel di Sentani & Wamena Hub.', status: 'Lolos Tanpa Catatan' },
  { date: '01 Agustus 2026', title: 'Kalibrasi Uji Petik Alat Ukur Density', desc: 'Rekalibrasi 12 unit hydrometer dan thermometer standar ASTM D1298.', status: 'Sertifikat Diterbitkan' },
  { date: '25 Juli 2026', title: 'Uji Banding Laboratorium Pertamina DPPU', desc: 'Sampel Avtur Airstrip Okbibab memenuhi spesifikasi Def Stan 91-091.', status: 'Sesuai Spesifikasi' },
]

// DRUM TRANSFER & MUTATION TRACKING
const drumTransfers = ref([
  { transferId: 'TRF-202608-088', origin: 'Wamena Hub', dest: 'Airstrip Okbibab', qty: '20 Drum (4,000 L)', status: 'Dalam Penerbangan', date: '22 Aug 2026 09:00', sign: 'Menunggu TTD Penerima', flightNo: 'Flight AMA-308' },
  { transferId: 'TRF-202608-085', origin: 'Sentani Hub', dest: 'Wamena Hub', qty: '50 Drum (10,000 L)', status: 'Diterima & Sesuai', date: '21 Aug 2026 14:30', sign: 'Budi Santoso', flightNo: 'Flight AMA-102' },
  { transferId: 'TRF-202608-081', origin: 'Wamena Hub', dest: 'Boven Digoel', qty: '15 Drum (3,000 L)', status: 'Diterima & Sesuai', date: '19 Aug 2026 11:15', sign: 'Hendra (Ops BVD)', flightNo: 'Flight Trigana-22' },
  { transferId: 'TRF-202608-079', origin: 'Sentani Hub', dest: 'Airstrip Oksibil', qty: '30 Drum (6,000 L)', status: 'Diterima & Sesuai', date: '18 Aug 2026 08:45', sign: 'Markus (Ground Oksibil)', flightNo: 'Flight AMA-201' },
  { transferId: 'TRF-202608-074', origin: 'Wamena Hub', dest: 'Airstrip Okbibab', qty: '10 Drum (2,000 L)', status: 'Diterima & Sesuai', date: '15 Aug 2026 13:20', sign: 'Alex (Ops OKB)', flightNo: 'Flight AMA-304' },
])

const quarantineDrums = ref([
  { drumId: 'DRUM-00092', location: 'Airstrip Okbibab', reason: 'Segel fisik terkelupas saat bongkar muatan', date: '22 Aug 2026', status: 'In Quarantine', inspector: 'Alex' },
  { drumId: 'DRUM-00104', location: 'Wamena Hub', reason: 'Terdeteksi mikro-partikel pada uji visual', date: '20 Aug 2026', status: 'Pending Re-filtration', inspector: 'Budi Santoso' },
  { drumId: 'DRUM-00041', location: 'Sentani Hub', reason: 'Penyok pada penyangga bawah drum', date: '14 Aug 2026', status: 'Rejected for Refill', inspector: 'Diva QC' },
])

// SAFETY CHECKLISTS & CALIBRATION
const safetyChecklists = ref([
  { id: 'CHK-20260822-01', location: 'Okbibab Airstrip', testType: 'Water Detector Paste & Density Test', result: 'PASS (0.795 g/cm³)', officer: 'Alex', status: 'Approved', note: 'Warna pasta tetap merah muda (bebas air)' },
  { id: 'CHK-20260822-02', location: 'Wamena Hub', testType: 'Filter Separator Differential Pressure', result: 'PASS (12 PSI)', officer: 'Budi Santoso', status: 'Approved', note: 'Di bawah ambang batas maksimum 15 PSI' },
  { id: 'CHK-20260821-04', location: 'Sentani Hub', testType: 'Conductivity & Micro-Separometer (MSEP)', result: 'PASS (350 pS/m)', officer: 'Diva QC', status: 'Approved', note: 'Daya hantar listrik stabil' },
  { id: 'CHK-20260821-01', location: 'Boven Digoel', testType: 'Visual Clear & Bright Inspection', result: 'PASS (Clean)', officer: 'Hendra', status: 'Approved', note: 'Bebas endapan dan gelembung melayang' },
  { id: 'CHK-20260820-09', location: 'Airstrip Oksibil', testType: 'Density Test @ 15°C Standard', result: 'PASS (0.798 g/cm³)', officer: 'Markus', status: 'Approved', note: 'Sesuai kurva ASTM D1298' },
])

const calibrationTools = ref([
  { toolName: 'Hydrometer Standar ASTM D1298', toolId: 'HYD-01', station: 'Sentani Hub', lastCalib: '01 Aug 2026', nextCalib: '01 Nov 2026', status: 'Valid', color: 'success' },
  { toolName: 'Thermometer Presisi Avtur', toolId: 'THM-04', station: 'Wamena Hub', lastCalib: '01 Aug 2026', nextCalib: '01 Nov 2026', status: 'Valid', color: 'success' },
  { toolName: 'Digital Differential Pressure Gauge', toolId: 'DPG-02', station: 'Sentani Hub', lastCalib: '15 May 2026', nextCalib: '15 Nov 2026', status: 'Valid', color: 'success' },
  { toolName: 'Flowmeter Counter Refueler Truck', toolId: 'FLM-01', station: 'Wamena Hub', lastCalib: '10 Feb 2026', nextCalib: '10 Sep 2026', status: 'Jadwal Segera', color: 'warning' },
])

// USER ACTIVITY & SESSION LOGS
const userSessions = ref([
  { user: 'Alex (Ground Ops)', role: 'Field Operator', device: 'Android Rugged Tab #01', ip: '102.168.42.10 (Satellite Link)', action: 'Perform Water Test & Digital Sign', time: '22 Aug 2026 10:15', status: 'Active' },
  { user: 'Budi Santoso', role: 'Supervisor WMX', device: 'Desktop Station WMX-02', ip: '182.253.12.88 (VSAT Wamena)', action: 'Approved Drum Transfer TRF-202608-088', time: '22 Aug 2026 09:30', status: 'Active' },
  { user: 'Capt. Hendra', role: 'Pilot Twin Otter', device: 'Mobile EFB App', ip: '102.168.42.15 (Satellite Link)', action: 'Signed Refuel Receipt #RF-9912', time: '22 Aug 2026 08:45', status: 'Logged Out' },
  { user: 'Diva', role: 'Finance Manager', device: 'MacBook Pro DJJ-Fin', ip: '180.252.19.102 (FIBER Sentani)', action: 'Exported Compliance PDF Certificate', time: '22 Aug 2026 07:00', status: 'Active' },
  { user: 'System Auto-Sync', role: 'System Engine', device: 'Core Backend Server', ip: '127.0.0.1 (Internal Service)', action: 'Reconciled 5 Offline Refuel Records', time: '22 Aug 2026 06:00', status: 'Background Job' },
])

const securityEvents = ref([
  { event: 'Biometric Authentication Success', user: 'Alex', time: '22 Aug 2026 10:14:58', risk: 'Low Risk', riskColor: 'success' },
  { event: 'Offline Database Cryptographic Hash Check', user: 'System', time: '22 Aug 2026 06:00:01', risk: 'Low Risk', riskColor: 'success' },
  { event: 'Attempted Unsigned Log Edit (Blocked by Ledger)', user: 'Unknown IP 102.168.42.99', time: '19 Aug 2026 22:11:04', risk: 'Threat Blocked', riskColor: 'error' },
])

// Filter & Dynamic Logic
const filteredLogs = computed(() => {
  return auditLogs.value.filter((item) => {
    const matchSearch = searchQuery.value === '' || 
      item.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.eventName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.user.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.hash.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchCat = selectedCategory.value === 'Semua Kategori Aktivitas' || item.category.includes(selectedCategory.value)
    const matchStation = selectedStation.value === 'Semua Station / Hub' || item.station.includes(selectedStation.value)
    const matchRole = selectedUserRole.value === 'Semua Role Pengguna' || item.user.toLowerCase().includes(selectedUserRole.value.toLowerCase())
    
    return matchSearch && matchCat && matchStation && matchRole
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / itemsPerPage.value)))

const paginatedLogs = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

// ==========================================
// REAL FILE DOWNLOAD ENGINE (BLOB BASED)
// ==========================================
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download Laporan dari Modal Export
const executeDownloadReport = () => {
  const timeStampStr = new Date().toISOString().replace(/[:.]/g, '-')
  
  if (selectedExportFormat.value.includes('CSV')) {
    let csvData = 'Log ID,Timestamp,Kategori,Nama Event,Station,User,SHA-256 Hash,Status\n'
    filteredLogs.value.forEach(item => {
      csvData += `"${item.id}","${item.timestamp}","${item.category}","${item.eventName}","${item.station}","${item.user}","${item.hash}","${item.status}"\n`
    })
    downloadFile(csvData, `Audit_Ledger_${timeStampStr}.csv`, 'text/csv;charset=utf-8;')
  } else {
    // Generate text/PDF summary report blob file
    let reportText = `=========================================================\n`
    reportText += `   LAPORAN RESMI AUDIT KRIPTOGRAFI & KEPATUHAN CASR 135\n`
    reportText += `=========================================================\n\n`
    reportText += `Periode Audit    : ${datePeriod.value}\n`
    reportText += `Kategori Filter  : ${selectedCategory.value}\n`
    reportText += `Station          : ${selectedStation.value}\n`
    reportText += `Total Record     : ${filteredLogs.value.length} Logs\n`
    reportText += `Cert Hash Included: ${includeHashCert.value ? 'YES' : 'NO'}\n\n`
    reportText += `------------------ DAFTAR AUDIT LOG ---------------------\n`
    filteredLogs.value.forEach((item, index) => {
      reportText += `[${index + 1}] ID: ${item.id} | ${item.timestamp}\n`
      reportText += `    Event: ${item.eventName} (${item.category})\n`
      reportText += `    User : ${item.user} @ ${item.station}\n`
      if (includeHashCert.value) {
        reportText += `    Hash : SHA-256:${item.hash}\n`
      }
      reportText += `---------------------------------------------------------\n`
    })

    const ext = selectedExportFormat.value.includes('PDF') ? 'txt' : 'txt'
    downloadFile(reportText, `Laporan_Kepatuhan_${timeStampStr}.${ext}`, 'text/plain;charset=utf-8;')
  }
  
  showExportDialog.value = false
}

// Download Sertifikat Tunggal (Single Log)
const downloadSingleLogCert = () => {
  const log = selectedLog.value
  let cert = `=========================================================\n`
  cert += `     DIGITAL CERTIFICATE OF IMMUTABLE AUDIT LOG\n`
  cert += `=========================================================\n\n`
  cert += `LOG IDENTIFIER  : ${log.id}\n`
  cert += `TIMESTAMP       : ${log.timestamp}\n`
  cert += `CATEGORY        : ${log.category}\n`
  cert += `EVENT NAME      : ${log.eventName}\n`
  cert += `LOCATION        : ${log.station}\n`
  cert += `EXECUTED BY     : ${log.user}\n`
  cert += `DEVICE / IP     : ${log.userDevice} (${log.ipAddress})\n`
  cert += `---------------------------------------------------------\n`
  cert += `CRYPTOGRAPHIC PROOF & INTEGRITY DATA\n`
  cert += `---------------------------------------------------------\n`
  cert += `PAYLOAD HASH    : ${log.payloadHash}\n`
  cert += `PREVIOUS HASH   : ${log.previousHash}\n`
  cert += `ALGORITHM       : ${log.signatureAlgorithm}\n`
  cert += `LEDGER STATUS   : ${log.ledgerStatus}\n`
  cert += `---------------------------------------------------------\n`
  cert += `PAYLOAD DETAILS :\n`
  cert += ` - Drum ID      : ${log.detailsData.drumID}\n`
  cert += ` - Water Test   : ${log.detailsData.waterTestResult}\n`
  cert += ` - Density      : ${log.detailsData.densityObserved}\n`
  cert += ` - Visual Check : ${log.detailsData.visualCheck}\n`
  cert += ` - Sign Status  : ${log.detailsData.supervisorSign}\n`
  cert += `=========================================================\n`

  downloadFile(cert, `Certificate_${log.id}.txt`, 'text/plain;charset=utf-8;')
}

// Download Dokumen Kepatuhan Spesifik
const downloadComplianceReport = (report: any) => {
  let doc = `=========================================================\n`
  doc += `       DOCUMENT CERTIFICATE OF COMPLIANCE REPORT\n`
  doc += `=========================================================\n\n`
  doc += `NAMA DOKUMEN  : ${report.title}\n`
  doc += `NO. SERTIFIKAT : ${report.certNo}\n`
  doc += `KATEGORI      : ${report.category}\n`
  doc += `STATUS AUDIT  : ${report.status}\n`
  doc += `TGL VERIFIKASI: ${report.date}\n`
  doc += `BERLAKU S.D.  : ${report.expiry}\n`
  doc += `INSPEKTUR     : ${report.inspector}\n`
  doc += `=========================================================\n`

  downloadFile(doc, `${report.certNo}.txt`, 'text/plain;charset=utf-8;')
}

// Interactive Handlers
const refreshStockData = () => {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
  }, 600)
}

const submitNewTransfer = () => {
  if (!newTransferForm.value.qty || !newTransferForm.value.flightNo) return
  const genId = `TRF-202608-${Math.floor(100 + Math.random() * 900)}`
  drumTransfers.value.unshift({
    transferId: genId,
    origin: newTransferForm.value.origin,
    dest: newTransferForm.value.dest,
    qty: newTransferForm.value.qty,
    status: 'Dalam Penerbangan',
    date: '22 Aug 2026 11:00',
    sign: 'Menunggu TTD Penerima',
    flightNo: newTransferForm.value.flightNo
  })
  showNewTransferModal.value = false
  newTransferForm.value = { origin: 'Wamena Hub (WMX)', dest: 'Airstrip Okbibab', qty: '', flightNo: '' }
}

const submitNewCalib = () => {
  if (!newCalibForm.value.toolName || !newCalibForm.value.toolId) return
  calibrationTools.value.unshift({
    toolName: newCalibForm.value.toolName,
    toolId: newCalibForm.value.toolId,
    station: newCalibForm.value.station,
    lastCalib: '22 Aug 2026',
    nextCalib: newCalibForm.value.nextCalib || '22 Nov 2026',
    status: 'Valid',
    color: 'success'
  })
  showCalibModal.value = false
  newCalibForm.value = { toolName: '', toolId: '', station: 'Sentani Hub (DJJ)', nextCalib: '' }
}
</script>

<template>
  <div class="bg-grey-lighten-4 min-vh-100 pa-4">
    
    <!-- Breadcrumbs & Dynamic Header Title -->
    <div class="d-flex align-center justify-space-between mb-3 bg-white pa-4 rounded-lg border shadow-sm">
      <div>
        <v-breadcrumbs :items="breadcrumbs" class="px-0 py-0 text-caption mb-1" />
        <h1 class="text-h6 font-weight-bold text-grey-darken-3 mb-0" style="line-height: 1.2;">
          Dashboard Analitik, Kepatuhan Keselamatan, & Immutable Audit Trail
        </h1>
        <div class="text-caption text-grey-darken-1">
          Avtur Fuel Management &bull; Real-time Operations Analytics, CASR/JIG Compliance Reports & Cryptographic Append-Only Audit Trail
        </div>
      </div>
      <div class="d-none d-sm-flex gap-2">
        <v-btn color="primary" variant="outlined" density="compact" prepend-icon="mdi-printer" @click="showExportDialog = true" class="text-none font-weight-bold">
          Cetak Laporan
        </v-btn>
        <v-btn color="primary" density="compact" prepend-icon="mdi-shield-search" @click="showVerifyModal = true" class="text-none font-weight-bold">
          Verifikasi Ledger
        </v-btn>
      </div>
    </div>

    <AvturTopNav class="mb-3" />

    <!-- Compact Navigation Tabs -->
    <v-tabs
      v-model="activeTab"
      bg-color="white"
      color="primary"
      density="compact"
      class="mb-4 rounded-lg border shadow-sm"
    >
      <v-tab v-for="(tab, i) in tabs" :key="i" class="text-capitalize font-weight-medium text-caption">
        <v-icon :icon="tab.icon" class="mr-1" size="x-small" />
        {{ tab.title }}
      </v-tab>
    </v-tabs>

    <!-- TAB CONTENT WINDOW SYSTEM -->
    <v-window v-model="activeTab">
      
      <!-- TAB 0: IMMUTABLE AUDIT TRAIL -->
      <v-window-item :value="0">
        <v-row class="mb-4" density="compact">
          <v-col v-for="(m, idx) in metrics" :key="idx" cols="12" sm="6" md="2">
            <v-card variant="flat" class="border rounded-lg pa-3 bg-white h-100 shadow-sm">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-caption font-weight-bold text-grey-darken-1 style-sub-text">{{ m.title }}</span>
                <v-avatar :color="m.color" variant="tonal" size="28">
                  <v-icon :icon="m.icon" size="16" />
                </v-avatar>
              </div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0">{{ m.count }}</div>
              <div v-if="m.unit" class="text-caption text-grey-darken-1 style-sub-text">{{ m.unit }}</div>
              <div v-if="m.sub" class="text-caption text-success font-weight-medium mt-1 style-sub-text">{{ m.sub }}</div>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="border rounded-lg pa-4 bg-white mb-4 shadow-sm">
          <div class="text-subtitle-2 font-weight-bold mb-3 text-grey-darken-3">
            Arsitektur Keamanan Audit Trail Kriptografis (Cryptographic Immutable Ledger)
          </div>
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 px-1">
            <template v-for="(s, index) in auditTrailSteps" :key="s.step">
              <div class="d-flex flex-column align-center text-center style-flow-card pa-2 border rounded bg-grey-lighten-5">
                <v-avatar :color="s.color" variant="flat" size="28" class="mb-1 text-caption font-weight-bold">
                  {{ s.step }}
                </v-avatar>
                <div class="font-weight-bold text-caption mb-1">{{ s.title }}</div>
                <div class="text-caption text-grey-darken-1 style-flow-desc">{{ s.desc }}</div>
              </div>
              <v-icon v-if="Number(index) < auditTrailSteps.length - 1" icon="mdi-chevron-right" color="grey" class="d-none d-md-block" />
            </template>
          </div>
        </v-card>

        <v-row class="mb-4">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white shadow-sm">
              <v-row density="compact" class="mb-3">
                <v-col cols="12" sm="3">
                  <v-select v-model="datePeriod" :items="['Agustus 2026', 'Juli 2026', 'Juni 2026']" label="Periode Audit" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="selectedCategory" :items="['Semua Kategori Aktivitas', 'Transaksi Refuel', 'Mutasi Drum', 'Serah-Terima Stok', 'Checklist Safety', 'Perubahan Status / Flag', 'Sinkronisasi Data', 'Aktivitas Pengguna']" label="Kategori Aktivitas" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="selectedStation" :items="['Semua Station / Hub', 'Wamena Hub (WMX)', 'Sentani Hub (DJJ)', 'Timika (TIM)', 'Airstrip Okbibab', 'Airstrip Boven Digoel']" label="Station / Location" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-select v-model="selectedUserRole" :items="['Semua Role Pengguna', 'Pilot / Flight Crew', 'Ground Ops / Operator', 'Quality Control (QC)', 'Finance / Management']" label="Role Pengguna" variant="outlined" density="compact" hide-details />
                </v-col>
                <v-col cols="12" sm="9" class="mt-2">
                  <v-text-field v-model="searchQuery" placeholder="Cari Log ID / SHA-256 Hash / Nama User / Drum ID / Flight No" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
                </v-col>
                <v-col cols="12" sm="3" class="mt-2">
                  <v-btn color="primary" block prepend-icon="mdi-file-export-outline" density="compact" class="text-none font-weight-bold" @click="showExportDialog = true">
                    Export Audit PDF/CSV
                  </v-btn>
                </v-col>
              </v-row>

              <v-table density="compact" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">Log ID & Waktu</th>
                    <th class="font-weight-bold text-caption">Kategori & Aktivitas</th>
                    <th class="font-weight-bold text-caption">Station & Pengguna</th>
                    <th class="font-weight-bold text-caption">SHA-256 Hash Signature</th>
                    <th class="font-weight-bold text-caption">Integritas</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in paginatedLogs" :key="item.id" :class="{ 'bg-blue-lighten-5': selectedLog.id === item.id }" style="cursor: pointer;" @click="selectedLog = { ...selectedLog, id: item.id, payloadHash: item.hash }">
                    <td>
                      <div class="font-weight-bold text-caption">{{ item.id }}</div>
                      <div class="text-caption text-grey-darken-1 style-sub-text">{{ item.timestamp }}</div>
                    </td>
                    <td>
                      <div class="font-weight-bold text-caption text-grey-darken-3">{{ item.eventName }}</div>
                      <v-chip size="x-small" color="primary" variant="tonal">{{ item.category }}</v-chip>
                    </td>
                    <td>
                      <div class="font-weight-medium text-caption">{{ item.station }}</div>
                      <div class="text-caption text-grey-darken-1 style-sub-text">{{ item.user }}</div>
                    </td>
                    <td>
                      <div class="text-caption font-monospace text-truncate style-hash-col" :title="item.hash">{{ item.hash }}</div>
                    </td>
                    <td>
                      <v-chip size="x-small" :color="item.statusColor" variant="flat" class="font-weight-bold">{{ item.status }}</v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn icon="mdi-shield-search-outline" variant="text" size="x-small" color="grey-darken-1" @click.stop="showVerifyModal = true" />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div class="d-flex align-center justify-space-between mt-3">
                <span class="text-caption text-grey-darken-1">Menampilkan {{ paginatedLogs.length }} dari {{ filteredLogs.length }} log terdaftar</span>
                <div class="d-flex align-center gap-2">
                  <v-pagination v-model="page" :length="totalPages" density="compact" size="small" />
                  <v-select v-model="itemsPerPage" :items="[10, 25, 50]" suffix="/ hlm" variant="outlined" density="compact" hide-details style="width: 100px;" />
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white shadow-sm">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-subtitle-2 font-weight-bold text-grey-darken-3">{{ selectedLog.id }}</span>
                <v-chip size="x-small" color="success" variant="flat" class="font-weight-bold">Ledger Verified</v-chip>
              </div>
              <div class="text-caption text-grey-darken-1 mb-3">
                Kategori: <span class="font-weight-bold text-grey-darken-3">{{ selectedLog.category }}</span>
              </div>
              <v-divider class="mb-3" />

              <div class="text-caption font-weight-bold mb-1 text-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-account-key-outline" color="primary" class="mr-1" size="x-small" />
                1. Metadata Pengguna & Sesi Perangkat
              </div>
              <div class="d-flex flex-column gap-1 text-caption mb-3 bg-grey-lighten-5 pa-2 rounded border">
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Nama Pengguna:</span>
                  <span class="font-weight-bold text-grey-darken-3">{{ selectedLog.user }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Lokasi Station:</span>
                  <span class="font-weight-medium">{{ selectedLog.station }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Perangkat:</span>
                  <span class="font-weight-medium text-grey-darken-2">{{ selectedLog.userDevice }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Network IP / Link:</span>
                  <span class="font-weight-medium text-teal">{{ selectedLog.ipAddress }}</span>
                </div>
              </div>

              <div class="text-caption font-weight-bold mb-1 text-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-lock-pattern" color="purple" class="mr-1" size="x-small" />
                2. Verifikasi Hash Kriptografi (Immutable Proof)
              </div>
              <div class="d-flex flex-column gap-1 text-caption mb-3 bg-grey-lighten-5 pa-2 rounded border">
                <div>
                  <span class="text-grey-darken-1 font-weight-bold">Current SHA-256 Hash:</span>
                  <div class="text-caption font-monospace bg-white pa-1 rounded border text-break style-sub-text">{{ selectedLog.payloadHash }}</div>
                </div>
                <div class="d-flex justify-space-between border-t pt-1 mt-1">
                  <span class="text-grey-darken-1">Blok Ledger:</span>
                  <span class="font-weight-bold text-purple">{{ selectedLog.ledgerStatus }}</span>
                </div>
              </div>

              <div class="text-caption font-weight-bold mb-1 text-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-code-json" color="teal" class="mr-1" size="x-small" />
                3. Payload Data Hasil Input / Checklist
              </div>
              <div class="d-flex flex-column gap-1 text-caption mb-4 bg-grey-lighten-5 pa-2 rounded border">
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Ref ID Drum:</span>
                  <span class="font-weight-bold">{{ selectedLog.detailsData.drumID }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Water Test:</span>
                  <span class="font-weight-bold text-success">{{ selectedLog.detailsData.waterTestResult }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Massa Jenis / Density:</span>
                  <span class="font-weight-medium">{{ selectedLog.detailsData.densityObserved }}</span>
                </div>
              </div>

              <v-row density="compact">
                <v-col cols="6">
                  <v-btn variant="outlined" color="primary" block density="compact" class="text-none font-weight-bold" @click="downloadSingleLogCert">
                    Sertifikat Log
                  </v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn color="primary" block density="compact" class="text-none font-weight-bold" @click="showVerifyModal = true">
                    Verify Chain
                  </v-btn>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 1: ANALITIK OPERASIONAL & STOK -->
      <v-window-item :value="1">
        <v-row class="mb-4" density="compact">
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Total Stok Avtur Aktif Wilayah</span>
              <div class="text-h5 font-weight-bold text-primary my-1">302,100 L</div>
              <span class="text-caption text-success font-weight-medium"><v-icon icon="mdi-arrow-up" size="x-small"/> +4.2% persediaan stabil</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Rata-Rata Daily Consumption Rate</span>
              <div class="text-h5 font-weight-bold text-grey-darken-4 my-1">20,550 L/Hari</div>
              <span class="text-caption text-grey-darken-1">Estimasi bertahan: ~14.7 Hari Operasional</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Stok Drum Pedalaman (Airstrip)</span>
              <v-badge color="warning" content="Alert OKB" class="float-right mt-1" />
              <div class="text-h5 font-weight-bold text-info my-1">848 Drum</div>
              <span class="text-caption text-grey-darken-1">Tersebar di 5 Airstrip Perintis</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Status Reorder Safety Alert</span>
              <div class="text-h5 font-weight-bold text-warning my-1">1 Station</div>
              <span class="text-caption text-warning font-weight-bold">Airstrip Okbibab (&lt; 35% Capacity)</span>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-4 shadow-sm">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Grafik Konsumsi Avtur Mingguan vs Proyeksi Kebutuhan Refueling</div>
              <div class="text-caption text-grey-darken-1">Analisis tren pemakaian harian di Wamena, Sentani, Timika & Airstrip Pedalaman</div>
            </div>
            <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">Agustus 2026</v-chip>
          </div>

          <div class="pa-2 bg-grey-lighten-5 rounded border mb-3">
            <div class="d-flex justify-space-between align-end style-chart-container px-4 pt-4">
              <div v-for="(item, idx) in weeklyConsumptionChartData" :key="idx" class="d-flex flex-column align-center flex-grow-1">
                <div class="d-flex align-end gap-1 mb-2" style="height: 120px;">
                  <div class="bg-primary rounded-t" :style="{ height: `${(item.flightVolume / 20000) * 100}%`, width: '18px' }" :title="`Aktual: ${item.flightVolume} L`"></div>
                  <div class="bg-teal-lighten-2 rounded-t" :style="{ height: `${(item.forecast / 20000) * 100}%`, width: '18px' }" :title="`Proyeksi: ${item.forecast} L`"></div>
                </div>
                <span class="text-caption font-weight-bold text-grey-darken-2">{{ item.day }}</span>
              </div>
            </div>
          </div>
          <div class="d-flex justify-center gap-4 text-caption">
            <div class="d-flex align-center gap-1">
              <div class="bg-primary rounded-circle" style="width: 10px; height: 10px;"></div>
              <span>Konsumsi Real-time (L)</span>
            </div>
            <div class="d-flex align-center gap-1">
              <div class="bg-teal-lighten-2 rounded-circle" style="width: 10px; height: 10px;"></div>
              <span>Proyeksi Penerbangan (L)</span>
            </div>
          </div>
        </v-card>

        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6 shadow-sm">
          <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">Monitoring Level Tangki Utama & Stok Drum Per Station</span>
            <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-refresh" :loading="isRefreshing" @click="refreshStockData">Refresh Data Stok Real-time</v-btn>
          </div>

          <v-row density="compact">
            <v-col v-for="(st, i) in stationStockData" :key="i" cols="12" md="6" lg="4">
              <v-card variant="outlined" class="pa-4 rounded-lg bg-white">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="font-weight-bold text-subtitle-2 text-grey-darken-3">{{ st.name }}</span>
                  <v-chip :color="st.color" size="x-small" class="font-weight-bold">{{ st.status }}</v-chip>
                </div>
                <v-divider class="my-2" />
                <div class="d-flex justify-space-between text-caption text-grey-darken-1 mb-1">
                  <span>Main Storage Tank:</span>
                  <span class="font-weight-bold text-grey-darken-3">{{ st.mainTank }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption text-grey-darken-1 mb-1">
                  <span>Stok Cadangan Drum:</span>
                  <span class="font-weight-bold text-teal">{{ st.drumCount }} Drum ({{ st.totalVol }})</span>
                </div>
                <div class="d-flex justify-space-between text-caption text-grey-darken-1 mb-2">
                  <span>Daily Burn Rate:</span>
                  <span class="font-weight-medium">{{ st.burnRate }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                  <span>Kapasitas Stok Tersedia</span>
                  <span :class="`text-${st.color}`">{{ st.capacity }}% (Est. {{ st.daysLeft }})</span>
                </div>
                <v-progress-linear :model-value="st.capacity" :color="st.color" height="10" rounded />
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- TAB 2: LAPORAN KEPATUHAN -->
      <v-window-item :value="2">
        <v-row class="mb-4" density="compact">
          <v-col cols="12" md="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white text-center shadow-sm">
              <v-progress-circular :model-value="99.8" size="75" width="8" color="teal" class="mb-2">
                <span class="font-weight-bold text-caption text-grey-darken-3">99.8%</span>
              </v-progress-circular>
              <div class="font-weight-bold text-subtitle-2 text-grey-darken-3">Indeks Kepatuhan CASR Part 135</div>
              <div class="text-caption text-grey-darken-1">Memenuhi standar kelaikan udara DKPPU Kemenhub</div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white text-center shadow-sm">
              <v-progress-circular :model-value="100" size="75" width="8" color="success" class="mb-2">
                <span class="font-weight-bold text-caption text-grey-darken-3">100%</span>
              </v-progress-circular>
              <div class="font-weight-bold text-subtitle-2 text-grey-darken-3">Sertifikasi Alat Ukur & Kalibrasi</div>
              <div class="text-caption text-grey-darken-1">Flowmeter, Hydrometer & Differential Pressure Gauges</div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white text-center shadow-sm">
              <v-progress-circular :model-value="0" size="75" width="8" color="error" class="mb-2">
                <span class="font-weight-bold text-caption text-grey-darken-3">0</span>
              </v-progress-circular>
              <div class="font-weight-bold text-subtitle-2 text-grey-darken-3">Temuan Critical Violation</div>
              <div class="text-caption text-grey-darken-1">Zero Non-Conformity Report (NCR) periode 2026</div>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white shadow-sm">
              <div class="text-subtitle-1 font-weight-bold mb-1 text-grey-darken-3">Sertifikasi & Laporan Kepatuhan Keselamatan (DKPPU / JIG 4)</div>
              <p class="text-caption text-grey-darken-1 mb-4">Dokumen terverifikasi kriptografis dan siap diunduh untuk kebutuhan audit kelaikan penerbangan.</p>

              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">Nama Dokumen Kepatuhan</th>
                    <th class="font-weight-bold text-caption">No. Sertifikat</th>
                    <th class="font-weight-bold text-caption">Status Audit</th>
                    <th class="font-weight-bold text-caption">Tgl Verifikasi</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(rep, i) in complianceReports" :key="i">
                    <td>
                      <div class="font-weight-bold text-caption text-grey-darken-3">{{ rep.title }}</div>
                      <v-chip size="x-small" color="primary" variant="tonal">{{ rep.category }}</v-chip>
                    </td>
                    <td class="text-caption font-monospace style-sub-text">{{ rep.certNo }}</td>
                    <td><v-chip size="x-small" color="success" variant="flat">{{ rep.status }}</v-chip></td>
                    <td class="text-caption style-sub-text">{{ rep.date }}</td>
                    <td class="text-center">
                      <v-btn icon="mdi-download" variant="text" size="small" color="primary" @click="downloadComplianceReport(rep)" />
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 shadow-sm">
              <div class="text-subtitle-2 font-weight-bold mb-3 text-grey-darken-3">Riwayat Audit Regulator Terbaru</div>
              <v-timeline density="compact" align="start">
                <v-timeline-item v-for="(t, idx) in regulatoryTimeline" :key="idx" dot-color="teal" size="x-small">
                  <div class="text-caption font-weight-bold text-primary">{{ t.date }}</div>
                  <div class="font-weight-bold text-caption text-grey-darken-3">{{ t.title }}</div>
                  <div class="text-caption text-grey-darken-1 style-sub-text">{{ t.desc }}</div>
                  <v-chip size="x-small" color="success" variant="tonal" class="mt-1">{{ t.status }}</v-chip>
                </v-timeline-item>
              </v-timeline>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 3: MUTASI & SERAH TERIMA DRUM -->
      <v-window-item :value="3">
        <v-row class="mb-4" density="compact">
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-3 bg-white shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Total Drum Aktif Terdaftar</span>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-4">1,240 Drum</div>
              <span class="text-caption text-success style-sub-text">Barcode ID Verified</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-3 bg-white shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Dalam Transit Flight Perintis</span>
              <div class="text-subtitle-1 font-weight-bold text-warning">35 Drum (7,000 L)</div>
              <span class="text-caption text-warning style-sub-text">In-Transit Status</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-3 bg-white shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Dalam Status Karantina / QC Flag</span>
              <div class="text-subtitle-1 font-weight-bold text-error">3 Drum</div>
              <span class="text-caption text-error style-sub-text">Segel / Visual Flag</span>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="flat" class="border rounded-lg pa-3 bg-white shadow-sm">
              <span class="text-caption text-grey-darken-1 font-weight-bold">Drum Kosong Siap Refill</span>
              <div class="text-subtitle-1 font-weight-bold text-success">522 Drum</div>
              <span class="text-caption text-grey-darken-1 style-sub-text">At Sentani Main Hub</span>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white shadow-sm">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">Pelacakan Mutasi & Serah-Terima Drum Avtur</span>
                  <div class="text-caption text-grey-darken-1">Surat jalan pengiriman drum via penerbangan perintis di wilayah Papua</div>
                </div>
                <v-btn color="primary" size="small" prepend-icon="mdi-plus" class="text-none font-weight-bold" @click="showNewTransferModal = true">
                  Buat Surat Jalan Drum
                </v-btn>
              </div>

              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID Transfer & Flight</th>
                    <th class="font-weight-bold text-caption">Rute Pengiriman</th>
                    <th class="font-weight-bold text-caption">Jumlah & Vol</th>
                    <th class="font-weight-bold text-caption">Status</th>
                    <th class="font-weight-bold text-caption">Penerima / Digital Sign</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(tr, i) in drumTransfers" :key="i">
                    <td>
                      <div class="font-weight-bold text-body-2">{{ tr.transferId }}</div>
                      <div class="text-caption text-primary style-sub-text font-weight-medium">{{ tr.flightNo }}</div>
                    </td>
                    <td class="text-body-2">
                      {{ tr.origin }} <v-icon icon="mdi-arrow-right" size="x-small" /> {{ tr.dest }}
                    </td>
                    <td class="font-weight-bold text-teal">{{ tr.qty }}</td>
                    <td>
                      <v-chip size="x-small" :color="tr.status.includes('Dalam') ? 'warning' : 'success'" variant="tonal" class="font-weight-bold">
                        {{ tr.status }}
                      </v-chip>
                    </td>
                    <td class="text-caption font-weight-medium">{{ tr.sign }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 shadow-sm">
              <div class="d-flex align-center justify-space-between mb-3">
                <span class="text-subtitle-2 font-weight-bold text-grey-darken-3">Daftar Drum Dalam Karantina (QC Flag)</span>
                <v-badge color="error" :content="quarantineDrums.length" />
              </div>
              <div v-for="(q, idx) in quarantineDrums" :key="idx" class="pa-3 border rounded-lg bg-red-lighten-5 mb-3">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="font-weight-bold text-caption text-red-darken-4">{{ q.drumId }}</span>
                  <v-chip size="x-small" color="error" variant="flat">{{ q.status }}</v-chip>
                </div>
                <div class="text-caption text-grey-darken-3 mb-1 font-weight-medium">{{ q.reason }}</div>
                <div class="d-flex justify-space-between text-caption text-grey-darken-1 style-sub-text">
                  <span>Lokasi: {{ q.location }}</span>
                  <span>Petugas: {{ q.inspector }}</span>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 4: SAFETY CHECKLISTS & KALIBRASI -->
      <v-window-item :value="4">
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white shadow-sm">
              <div class="text-subtitle-1 font-weight-bold mb-1 text-grey-darken-3">Formulir Safety Checklist & Hasil Pengujian Quality Control (QC)</div>
              <div class="text-caption text-grey-darken-1 mb-4">Pemeriksaan visual, water detector paste, dan massa jenis (density test) sebelum pengisian</div>

              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID Checklist</th>
                    <th class="font-weight-bold text-caption">Lokasi & Petugas</th>
                    <th class="font-weight-bold text-caption">Jenis Pengujian QC</th>
                    <th class="font-weight-bold text-caption">Hasil Pengukuran</th>
                    <th class="font-weight-bold text-caption">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sc, i) in safetyChecklists" :key="i">
                    <td class="font-weight-bold text-body-2">{{ sc.id }}</td>
                    <td>
                      <div class="text-body-2 font-weight-medium">{{ sc.location }}</div>
                      <div class="text-caption text-grey-darken-1 style-sub-text">{{ sc.officer }}</div>
                    </td>
                    <td>
                      <div class="text-caption font-weight-medium text-grey-darken-3">{{ sc.testType }}</div>
                      <div class="text-caption text-grey-darken-1 style-sub-text">{{ sc.note }}</div>
                    </td>
                    <td class="text-caption font-weight-bold text-success">{{ sc.result }}</td>
                    <td><v-chip size="x-small" color="success">{{ sc.status }}</v-chip></td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 shadow-sm">
              <div class="d-flex align-center justify-space-between mb-3">
                <span class="text-subtitle-2 font-weight-bold text-grey-darken-3">Jadwal Kalibrasi Tool Standar</span>
                <v-btn icon="mdi-plus" variant="text" size="x-small" @click="showCalibModal = true" />
              </div>
              <div v-for="(tool, idx) in calibrationTools" :key="idx" class="pa-3 border rounded-lg bg-grey-lighten-5 mb-3">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="font-weight-bold text-caption text-grey-darken-3">{{ tool.toolName }}</span>
                  <v-chip size="x-small" :color="tool.color" variant="flat">{{ tool.status }}</v-chip>
                </div>
                <div class="text-caption text-grey-darken-1 mb-1 style-sub-text">ID: {{ tool.toolId }} &bull; Station: {{ tool.station }}</div>
                <div class="d-flex justify-space-between text-caption text-grey-darken-2 style-sub-text">
                  <span>Kalibrasi Terakhir: {{ tool.lastCalib }}</span>
                  <span class="font-weight-bold text-primary">Jatuh Tempo: {{ tool.nextCalib }}</span>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 5: LOG AKTIVITAS PENGGUNA -->
      <v-window-item :value="5">
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white shadow-sm">
              <div class="text-subtitle-1 font-weight-bold mb-1 text-grey-darken-3">Audit Sesi Log Pengguna, Network IP & Digital Signature</div>
              <div class="text-caption text-grey-darken-1 mb-4">Sesi login aktif dan riwayat autentikasi pengguna pada perangkat Android Rugged Tablet dan Desktop Station</div>

              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">Pengguna & Role</th>
                    <th class="font-weight-bold text-caption">Perangkat & IP Network</th>
                    <th class="font-weight-bold text-caption">Aktivitas Terakhir</th>
                    <th class="font-weight-bold text-caption">Waktu Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(us, i) in userSessions" :key="i">
                    <td>
                      <div class="font-weight-bold text-body-2">{{ us.user }}</div>
                      <v-chip size="x-small" color="primary" variant="tonal">{{ us.role }}</v-chip>
                    </td>
                    <td>
                      <div class="text-caption font-weight-medium">{{ us.device }}</div>
                      <div class="text-caption font-monospace text-teal style-sub-text">{{ us.ip }}</div>
                    </td>
                    <td class="text-caption font-weight-medium text-grey-darken-3">{{ us.action }}</td>
                    <td class="text-caption style-sub-text">{{ us.time }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100 shadow-sm">
              <div class="text-subtitle-2 font-weight-bold mb-3 text-grey-darken-3">Log Keamanan & Penolakan Akses</div>
              <div v-for="(sec, idx) in securityEvents" :key="idx" class="pa-3 border rounded-lg bg-grey-lighten-5 mb-3">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="font-weight-bold text-caption text-grey-darken-3">{{ sec.event }}</span>
                  <v-chip size="x-small" :color="sec.riskColor" variant="flat">{{ sec.risk }}</v-chip>
                </div>
                <div class="d-flex justify-space-between text-caption text-grey-darken-1 style-sub-text">
                  <span>Pengguna: {{ sec.user }}</span>
                  <span>{{ sec.time }}</span>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

    </v-window>

    <!-- Bottom Compliance Disclaimer Banner -->
    <v-alert
      type="info"
      variant="tonal"
      density="compact"
      icon="mdi-shield-certificate-outline"
      class="rounded-lg border border-blue-lighten-3 mt-4"
    >
      <template #title>
        <span class="text-caption font-weight-bold">Kepatuhan Standar Regulator Penerbangan (CASR Part 135 & DKPPU Audit Readiness)</span>
      </template>
      <span class="text-caption style-sub-text">
        Seluruh log transaksi bahan bakar, mutasi stok, pemeriksaan keselamatan, dan aktivitas pengguna disegel menggunakan stempel kriptografi SHA-256 yang bersifat <strong>Immutable (Append-Only)</strong>.
      </span>
    </v-alert>

    <!-- MODAL DIALOGS -->
    <v-dialog v-model="showExportDialog" max-width="500px">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Export Laporan Kepatuhan & Ledger</v-card-title>
        <v-card-text class="text-caption text-grey-darken-1">
          Pilih format dokumen resmi untuk kebutuhan audit DKPPU Kemenhub atau laporan internal manajemen.
          <v-select
            v-model="selectedExportFormat"
            :items="['PDF Audit Report (Digitally Signed)', 'CSV Raw Ledger Data', 'Excel Analytics Summary']"
            label="Format Dokumen"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
          <v-checkbox v-model="includeHashCert" label="Sertakan SHA-256 Hash Signature Certificate" density="compact" hide-details />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" size="small" @click="showExportDialog = false">Batal</v-btn>
          <v-btn color="primary" size="small" @click="executeDownloadReport">Unduh Laporan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showVerifyModal" max-width="600px">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold text-teal">Verifikasi Integritas Chain Kriptografi</v-card-title>
        <v-card-text class="text-caption">
          Sistem sedang memverifikasi susunan blok SHA-256 secara urut untuk memastikan tidak ada data yang dimanipulasi.
          <div class="pa-3 bg-grey-lighten-4 rounded font-monospace my-3 style-sub-text">
            Status: 100% Verified Valid<br />
            Block Count: 104,982 Blocks<br />
            Integrity Status: ZERO TAMPERING DETECTED
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn color="teal" size="small" @click="showVerifyModal = false">Tutup Verifikasi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showNewTransferModal" max-width="500px">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Buat Surat Jalan Mutasi Drum</v-card-title>
        <v-card-text>
          <v-select v-model="newTransferForm.origin" :items="['Sentani Hub (DJJ)', 'Wamena Hub (WMX)']" label="Origin Station" variant="outlined" density="compact" class="mb-2" />
          <v-select v-model="newTransferForm.dest" :items="['Airstrip Okbibab', 'Airstrip Boven Digoel', 'Airstrip Oksibil']" label="Destination Airstrip" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="newTransferForm.qty" label="Jumlah Drum & Volume (Liter)" placeholder="Contoh: 20 Drum (4,000 L)" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="newTransferForm.flightNo" label="Nomor Penerbangan / Aircraft ID" placeholder="Contoh: Flight AMA-308" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" size="small" @click="showNewTransferModal = false">Batal</v-btn>
          <v-btn color="primary" size="small" @click="submitNewTransfer">Terbitkan Surat Jalan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCalibModal" max-width="450px">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Tambah Jadwal Kalibrasi Tool</v-card-title>
        <v-card-text>
          <v-text-field v-model="newCalibForm.toolName" label="Nama Alat Ukur" placeholder="Contoh: Hydrometer ASTM D1298" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="newCalibForm.toolId" label="ID Peralatan" placeholder="Contoh: HYD-05" variant="outlined" density="compact" class="mb-2" />
          <v-select v-model="newCalibForm.station" :items="['Sentani Hub (DJJ)', 'Wamena Hub (WMX)', 'Timika Hub (TIM)']" label="Lokasi Station" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="newCalibForm.nextCalib" label="Jatuh Tempo Kalibrasi" placeholder="Contoh: 15 Dec 2026" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" size="small" @click="showCalibModal = false">Batal</v-btn>
          <v-btn color="primary" size="small" @click="submitNewCalib">Simpan Alat</v-btn>
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

.style-flow-card {
  flex: 1;
  min-width: 130px;
}
.style-flow-desc {
  font-size: 10px;
  line-height: 1.2;
}
.style-hash-col {
  max-width: 120px;
  font-size: 10px;
}
.style-sub-text {
  font-size: 11px !important;
}
.style-chart-container {
  height: 160px;
}
.shadow-sm {
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
}
</style>