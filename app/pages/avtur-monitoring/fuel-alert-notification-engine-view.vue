<script setup lang="ts">
//import { ref } from 'vue'

// Toast / Snackbar State
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
  timeout: 3000
})

const showToast = (text: string, color = 'success') => {
  snackbar.value = { show: true, text, color, timeout: 3000 }
}

// Dialog States
const dialogThreshold = ref(false)
const dialogReorder = ref(false)
const dialogQuarantine = ref(false)
const dialogPhoto = ref(false)
const dialogNewRule = ref(false)
const selectedPhotoData = ref<any>(null)

// Form Mock Models
const newRuleForm = ref({
  name: '',
  trigger: '',
  severity: 'Warning',
  targetRole: '',
  slaResponse: '30 Menit'
})

const quarantineForm = ref({
  drumId: '',
  station: '',
  scannedSeal: '',
  note: ''
})

// Breadcrumbs
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Alert & Notification Engine', disabled: true, href: '#' },
]

// Navigation Tabs
const activeTab = ref(0)
const tabs = [
  { title: 'Peringatan Aktif (Active Alerts)', icon: 'mdi-bell-ring-outline', badge: '10' },
  { title: 'Stok Rendah & Variansi Volume', icon: 'mdi-database-alert-outline', badge: '9' },
  { title: 'Verifikasi Segel & Tamper Flag', icon: 'mdi-seal-alert', badge: '9' },
  { title: 'Interlock & Flowmeter Abnormal', icon: 'mdi-gauge-line', badge: '8' },
  { title: 'Kegagalan Sync & Transaksi', icon: 'mdi-cloud-sync-outline', badge: '8' },
  { title: 'Aturan & Routing Notification', icon: 'mdi-cog-transfer-outline', badge: '8' },
]

// ================= TAB 0: PERINGATAN AKTIF (10 Items) =================
const metrics = [
  { title: 'Critical Active Alerts', count: '4 Peringatan', unit: 'Butuh Tindakan Segera', sub: 'Escalated to Safety Manager', icon: 'mdi-alert-decagram', color: 'error' },
  { title: 'Alert Stok Rendah', count: '3 Station', unit: 'Okbibab, BVK, Ilaga', sub: '< 5 Drum Tersedia', icon: 'mdi-barrel-outline', color: 'warning' },
  { title: 'Indikasi Masalah Segel', count: '2 Drum Flagged', unit: 'Segel Rusak / Mismatch', sub: 'Status Quarantined', icon: 'mdi-shield-alert-outline', color: 'orange-darken-2' },
  { title: 'Overfill & Interlock Event', count: '2 Kejadian', unit: 'Safety Cutoff Active', sub: 'Dispenser WMX & NBX', icon: 'mdi-pipe-valve', color: 'purple' },
  { title: 'Kegagalan Sync Data', count: '8 Transaksi', unit: 'Koneksi Terputus', sub: 'Auto-retry background', icon: 'mdi-wifi-off', color: 'info' },
  { title: 'SLA Resolusi Alert', count: '92.4%', unit: 'Rata-rata 38 Menit', sub: 'Target < 1 Jam', icon: 'mdi-check-circle-outline', color: 'success' },
]

const alertEngineSteps = [
  { step: 1, title: 'Deteksi Anomali / Trigger', desc: 'Sistem memantau sensor flowmeter, telemetry, scan segel operator, saldo stok, dan status sync.', icon: 'mdi-radar', color: 'primary' },
  { step: 2, title: 'Kategorisasi & Keparahan', desc: 'Klasifikasi level bahaya (Critical, Warning, Info) berdasarkan ambang batas & standar SMS/JIG.', icon: 'mdi-shield-search', color: 'warning' },
  { step: 3, title: 'Multi-Channel Dispatch', desc: 'Pengiriman notifikasi otomatis via WhatsApp, SMS Satellite, Push Notification, dan Popup ERP.', icon: 'mdi-cellphone-message', color: 'purple' },
  { step: 4, title: 'Acknowledge & Respon', desc: 'Operator / Safety Officer melakukan konfirmasi penerimaan alert dan tindakan korektif di lapangan.', icon: 'mdi-account-check-outline', color: 'teal' },
  { step: 5, title: 'Audit Trail & Closing', desc: 'Pencatatan riwayat penanganan alert ke dalam log audit keselamatan dan penutupan tiket alert.', icon: 'mdi-file-check-outline', color: 'success' },
]

const selectedSeverity = ref('Semua Level Keparahan')
const selectedCategory = ref('Semua Kategori Alert')
const selectedStation = ref('Semua Station / Hub')
const selectedStatus = ref('Semua Status Respon')
const searchQuery = ref('')

const alertLogs = ref([
  { id: 'ALT-20260822-001', category: 'Indikasi Masalah Segel', title: 'Segel Drum Tidak Sesuai Manifest', source: 'Drum #DRUM-00092', station: 'Airstrip Okbibab', triggerTime: '22 Aug 2026 10:15 WIB', severity: 'Critical', severityColor: 'error', status: 'Active (Unresolved)', assignedTo: 'Alex (Ground Ops OKB)', channel: 'WhatsApp + ERP Popup' },
  { id: 'ALT-20260822-002', category: 'Overfill / Abnormal Refuel', title: 'Flowmeter Interlock Cutoff Active', source: 'Dispenser Tanki WMX-02', station: 'Wamena Hub (WMX)', triggerTime: '22 Aug 2026 09:40 WIB', severity: 'Critical', severityColor: 'error', status: 'Acknowledged', assignedTo: 'Budi (Supervisor WMX)', channel: 'ERP Popup + SMS' },
  { id: 'ALT-20260822-003', category: 'Variansi Volume Avtur', title: 'Selisih Penerimaan > 0.5% (-0.88%)', source: 'Ref REC-202608-003', station: 'Timika (TIM)', triggerTime: '22 Aug 2026 08:30 WIB', severity: 'Warning', severityColor: 'warning', status: 'Acknowledged', assignedTo: 'Rian (QC Timika)', channel: 'Email + ERP' },
  { id: 'ALT-20260822-004', category: 'Stok Rendah Airstrip', title: 'Stok Tersisa < 5 Drum (Tersisa 200L)', source: 'Airstrip Depot BVK', station: 'Airstrip Boven Digoel', triggerTime: '21 Aug 2026 18:00 WIB', severity: 'Warning', severityColor: 'warning', status: 'Active (Unresolved)', assignedTo: 'Logistik WMX', channel: 'WhatsApp + Email' },
  { id: 'ALT-20260822-005', category: 'Kegagalan Sync Data', title: '5 Transaksi Refuel Offline Pending Sync', source: 'Tablet Station BVK', station: 'Airstrip Boven Digoel', triggerTime: '21 Aug 2026 17:45 WIB', severity: 'Info', severityColor: 'info', status: 'Auto-Retrying', assignedTo: 'IT System Admin', channel: 'System Notification' },
  { id: 'ALT-20260822-006', category: 'Transaksi Tidak Lengkap', title: 'Sign-off Pilot Belum Diunggah', source: 'Flight AMA-201', station: 'Sentani Hub (DJJ)', triggerTime: '21 Aug 2026 14:10 WIB', severity: 'Info', severityColor: 'info', status: 'Resolved', assignedTo: 'Ops DJJ', channel: 'ERP System' },
  { id: 'ALT-20260822-007', category: 'Suhu Avtur Melebihi Limit', title: 'Suhu Tangki Penerimaan 38°C (>35°C Standard)', source: 'Storage Tank T-02', station: 'Nabire Depot (NBX)', triggerTime: '21 Aug 2026 13:20 WIB', severity: 'Critical', severityColor: 'error', status: 'Active (Unresolved)', assignedTo: 'QC Lead Nabire', channel: 'SMS + WhatsApp' },
  { id: 'ALT-20260822-008', category: 'Filter Separator High DP', title: 'Tekanan Filter Water Separator Abnormal', source: 'Filter Unit F-01', station: 'Merauke Depot (MKQ)', triggerTime: '21 Aug 2026 11:05 WIB', severity: 'Warning', severityColor: 'warning', status: 'Acknowledged', assignedTo: 'Teknisi MKQ', channel: 'ERP Popup' },
  { id: 'ALT-20260822-009', category: 'Stok Rendah Airstrip', title: 'Stok Tersisa 3 Drum (600 Liter)', source: 'Airstrip Depot ILG', station: 'Airstrip Ilaga', triggerTime: '21 Aug 2026 09:30 WIB', severity: 'Warning', severityColor: 'warning', status: 'Active (Unresolved)', assignedTo: 'Dispatch Wamena', channel: 'WhatsApp Group' },
  { id: 'ALT-20260822-010', category: 'Kalibrasi Sensor Expired', title: 'Sensor Flowmeter Melewati Jadwal Tera', source: 'FLM-EOT-01', station: 'Airstrip Enarotali', triggerTime: '20 Aug 2026 16:00 WIB', severity: 'Info', severityColor: 'info', status: 'Resolved', assignedTo: 'Maintenance Lead', channel: 'Email Notification' },
])

const filteredAlertLogs = computed(() => {
  return alertLogs.value.filter(item => {
    const matchSeverity = selectedSeverity.value === 'Semua Level Keparahan' || item.severity === selectedSeverity.value
    const matchCategory = selectedCategory.value === 'Semua Kategori Alert' || item.category === selectedCategory.value
    const matchStation = selectedStation.value === 'Semua Station / Hub' || item.station.toLowerCase().includes(selectedStation.value.toLowerCase()) || selectedStation.value.toLowerCase().includes(item.station.toLowerCase())
    const matchStatus = selectedStatus.value === 'Semua Status Respon' || item.status === selectedStatus.value
    const matchQuery = !searchQuery.value ||
      item.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.station.toLowerCase().includes(searchQuery.value.toLowerCase())

    return matchSeverity && matchCategory && matchStation && matchStatus && matchQuery
  })
})

const selectedAlert = ref({
  id: 'ALT-20260822-001',
  category: 'Indikasi Masalah / Ketidaksesuaian Segel',
  title: 'Nomor Segel Fisik Tidak Cocok dengan Manifest Penerimaan',
  severity: 'Critical',
  severityColor: 'error',
  station: 'Airstrip Okbibab (OKB)',
  sourceResource: 'Drum #DRUM-00092 (Batch-210826-05)',
  triggerTime: '22 Aug 2026 10:15 WIB',
  detectedBy: 'Scan QR Barcode Operator On-Site (Mobile App)',
  description: 'Operator menemukan nomor segel fisik (SEAL-OKB-9912) berbeda dengan nomor segel terdaftar di manifest pengiriman WMX (SEAL-WMX-8841). Indikasi tampering / kontaminasi.',
  dispatchChannels: [
    { channel: 'WhatsApp Notification', recipient: 'Safety Manager (+62 811-XXXX-XXXX)', status: 'Delivered', color: 'success' },
    { channel: 'SMS Satellite Urgent', recipient: 'Station Lead Okbibab', status: 'Sent', color: 'success' },
    { channel: 'ERP Critical Modal Popup', recipient: 'All Active QC Supervisors', status: 'Active Display', color: 'warning' },
  ],
  recommendedAction: 'Lakukan karantina mandiri drum (#DRUM-00092), usul sampel uji kejernihan/density (Water Detector Paste), dan terbitkan Berita Acara Ketidaksesuaian Segel.',
  status: 'Active (Unresolved)',
  assignedTo: 'Alex (Ground Ops Okbibab)',
})

const selectAlertItem = (item: any) => {
  selectedAlert.value = {
    id: item.id,
    category: item.category,
    title: item.title,
    severity: item.severity,
    severityColor: item.severityColor,
    station: item.station,
    sourceResource: item.source,
    triggerTime: item.triggerTime,
    detectedBy: 'Sensor Telemetry / Mobile Scan',
    description: `Deskripsi Detail: ${item.title} terdeteksi di ${item.station} (${item.source}).`,
    dispatchChannels: [
      { channel: 'WhatsApp / Push Notification', recipient: item.assignedTo, status: 'Delivered', color: 'success' },
      { channel: 'ERP System Popup', recipient: 'QC Lead & Station Ops', status: 'Active Display', color: 'warning' },
    ],
    recommendedAction: 'Periksa fisik unit, lakukan pengujian ulang, dan perbarui log status penanganan.',
    status: item.status,
    assignedTo: item.assignedTo,
  }
}

const page = ref(1)

// Tab 0 Actions
const refreshRealtime = () => {
  showToast('Data realtime berhasil disinkronkan!', 'primary')
}

const escalateAlert = () => {
  const alertInList = alertLogs.value.find(a => a.id === selectedAlert.value.id)
  if (alertInList) {
    alertInList.status = 'Acknowledged'
    alertInList.severity = 'Critical'
    alertInList.severityColor = 'error'
  }
  selectedAlert.value.status = 'Acknowledged (Escalated)'
  showToast(`Alert ${selectedAlert.value.id} berhasil dieskalasi ke Manager Safety!`, 'warning')
}

const resolveAlert = () => {
  const alertInList = alertLogs.value.find(a => a.id === selectedAlert.value.id)
  if (alertInList) {
    alertInList.status = 'Resolved'
  }
  selectedAlert.value.status = 'Resolved'
  showToast(`Alert ${selectedAlert.value.id} telah ditandai Selesai (Resolved).`, 'success')
}

// ================= TAB 1: STOK RENDAH & VARIANSI VOLUME (9 Items) =================
const stockMetrics = [
  { title: 'Total Station Kritis', val: '3 Depot', color: 'error', sub: 'Stok < Minimum Safety Level' },
  { title: 'Total Variansi Volume Selisih', val: '-1.18%', color: 'warning', sub: 'Toleransi Maksimal 0.5%' },
  { title: 'Pengiriman Supply Pending', val: '24 Drum (4.800 L)', color: 'info', sub: 'Dalam Penerbangan Cargo' },
]

const stationStockList = ref([
  { location: 'Airstrip Okbibab (OKB)', stockPct: 15, currentStock: '3 Drum (600 L)', minThreshold: '10 Drum (2.000 L)', variance: '-1.25%', status: 'Kritis', statusColor: 'error', action: 'Flight Dispatch Urgent' },
  { location: 'Airstrip Boven Digoel (BVK)', stockPct: 20, currentStock: '4 Drum (800 L)', minThreshold: '8 Drum (1.600 L)', variance: '-0.88%', status: 'Warning', statusColor: 'warning', action: 'Jadwal Delivery Besok' },
  { location: 'Airstrip Ilaga (ILG)', stockPct: 18, currentStock: '3 Drum (600 L)', minThreshold: '10 Drum (2.000 L)', variance: '-1.05%', status: 'Kritis', statusColor: 'error', action: 'Flight Dispatch Urgent' },
  { location: 'Airstrip Enarotali (EOT)', stockPct: 30, currentStock: '6 Drum (1.200 L)', minThreshold: '8 Drum (1.600 L)', variance: '-0.40%', status: 'Warning', statusColor: 'warning', action: 'Jadwal Delivery Besok' },
  { location: 'Airstrip Oksibil (OKS)', stockPct: 45, currentStock: '9 Drum (1.800 L)', minThreshold: '8 Drum (1.600 L)', variance: '-0.20%', status: 'Normal Aman', statusColor: 'success', action: 'Monitoring Routine' },
  { location: 'Depot Dekai / Yahukimo (DKI)', stockPct: 60, currentStock: '12 Drum (2.400 L)', minThreshold: '10 Drum (2.000 L)', variance: '+0.10%', status: 'Normal Aman', statusColor: 'success', action: 'Monitoring Routine' },
  { location: 'Nabire Depot (NBX)', stockPct: 50, currentStock: '15.000 Liter', minThreshold: '10.000 Liter', variance: '+0.08%', status: 'Normal Aman', statusColor: 'success', action: 'Refill Hub Normal' },
  { location: 'Wamena Hub Depot (WMX)', stockPct: 82, currentStock: '32.800 Liter', minThreshold: '10.000 Liter', variance: '+0.05%', status: 'Optimal', statusColor: 'success', action: 'Refill Hub Cargo' },
  { location: 'Timika Hub Depot (TIM)', stockPct: 75, currentStock: '45.000 Liter', minThreshold: '15.000 Liter', variance: '+0.12%', status: 'Optimal', statusColor: 'success', action: 'Normal Operation' },
])

const handleStockAction = (item: any) => {
  showToast(`Tindakan "${item.action}" diproses untuk ${item.location}`, 'info')
}

const submitReorder = () => {
  dialogReorder.value = false
  showToast('Reorder Manifest berhasil dibuat dan diteruskan ke Tim Logistik Hub!', 'success')
}

// ================= TAB 2: VERIFIKASI SEGEL & TAMPER FLAG (9 Items) =================
const sealMetrics = [
  { title: 'Total Drum Verified', val: '215 Drum', icon: 'mdi-check-all', color: 'success' },
  { title: 'Segel Mismatch Flag', val: '2 Drum', icon: 'mdi-seal-alert', color: 'error' },
  { title: 'Segel Rusak / Putus', val: '1 Drum', icon: 'mdi-close-octagon-outline', color: 'grey-darken-1' },
]

const sealAuditLogs = ref([
  { drumId: 'DRUM-00092', station: 'Airstrip Okbibab', scannedSeal: 'SEAL-OKB-9912', manifestSeal: 'SEAL-WMX-8841', operator: 'Alex (OKB)', photoProof: true, status: 'Tamper Flagged', statusColor: 'error', note: 'Nomor fisik beda dengan manifest pengiriman WMX' },
  { drumId: 'DRUM-00104', station: 'Sentani Hub', scannedSeal: 'SEAL-DJJ-1022', manifestSeal: 'SEAL-DJJ-1022', operator: 'Rudi (DJJ)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Kondisi segel utuh & sesuai' },
  { drumId: 'DRUM-00118', station: 'Timika Hub', scannedSeal: 'SEAL-TIM-5541', manifestSeal: 'SEAL-TIM-5541', operator: 'Hendra (TIM)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Kondisi segel utuh & sesuai' },
  { drumId: 'DRUM-00120', station: 'Wamena Hub', scannedSeal: 'SEAL-WMX-3301', manifestSeal: 'SEAL-WMX-3301', operator: 'Budi (WMX)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Kondisi segel utuh & sesuai' },
  { drumId: 'DRUM-00135', station: 'Airstrip Ilaga', scannedSeal: 'SEAL-ILG-0021 (BROKEN)', manifestSeal: 'SEAL-WMX-9012', operator: 'Yonas (ILG)', photoProof: true, status: 'Segel Rusak', statusColor: 'error', note: 'Kawat segel putus & terlepas saat unloading' },
  { drumId: 'DRUM-00142', station: 'Airstrip Oksibil', scannedSeal: 'SEAL-OKS-4410', manifestSeal: 'SEAL-OKS-4410', operator: 'Markus (OKS)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Segel fisik cocok & rapat' },
  { drumId: 'DRUM-00150', station: 'Airstrip Enarotali', scannedSeal: 'SEAL-EOT-8821', manifestSeal: 'SEAL-NBX-1102', operator: 'Ferdinand (EOT)', photoProof: true, status: 'Tamper Flagged', statusColor: 'error', note: 'Mismatch nomor urut batch pengiriman Nabire' },
  { drumId: 'DRUM-00161', station: 'Airstrip Boven Digoel', scannedSeal: 'SEAL-BVK-2290', manifestSeal: 'SEAL-BVK-2290', operator: 'Daniel (BVK)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Verifikasi barcode lolos' },
  { drumId: 'DRUM-00178', station: 'Depot Dekai', scannedSeal: 'SEAL-DKI-7712', manifestSeal: 'SEAL-DKI-7712', operator: 'Lukas (DKI)', photoProof: true, status: 'Verified Valid', statusColor: 'success', note: 'Segel fisik sesuai manifest' },
])

const openPhotoModal = (seal: any) => {
  selectedPhotoData.value = seal
  dialogPhoto.value = true
}

const submitQuarantine = () => {
  if (quarantineForm.value.drumId) {
    sealAuditLogs.value.unshift({
      drumId: quarantineForm.value.drumId,
      station: quarantineForm.value.station || 'Airstrip Field',
      scannedSeal: quarantineForm.value.scannedSeal || 'UNKNOWN',
      manifestSeal: 'MAN-UNKN-00',
      operator: 'Current User',
      photoProof: true,
      status: 'Tamper Flagged',
      statusColor: 'error',
      note: quarantineForm.value.note || 'Diinput manual via form karantina'
    })
    showToast(`Form karantina untuk ${quarantineForm.value.drumId} berhasil disimpan!`, 'error')
    quarantineForm.value = { drumId: '', station: '', scannedSeal: '', note: '' }
    dialogQuarantine.value = false
  }
}

// ================= TAB 3: INTERLOCK & FLOWMETER ABNORMAL (8 Items) =================
const flowmeterList = ref([
  { deviceId: 'FLM-WMX-02', name: 'Flowmeter Dispenser Tanki 02', station: 'Wamena Hub', currentFlow: '185 L/min', maxSafeFlow: '150 L/min', pressure: '4.2 PSI', interlockState: 'SAFETY CUTOFF TRIGGERED', stateColor: 'error', lastCalibrated: '10 Aug 2026' },
  { deviceId: 'FLM-DJJ-01', name: 'Flowmeter High-Flow Dispenser', station: 'Sentani Hub', currentFlow: '120 L/min', maxSafeFlow: '150 L/min', pressure: '3.1 PSI', interlockState: 'NORMAL / ACTIVE', stateColor: 'success', lastCalibrated: '01 Jul 2026' },
  { deviceId: 'FLM-TIM-03', name: 'Flowmeter Mobile Refueler 03', station: 'Timika Hub', currentFlow: '0 L/min (Idle)', maxSafeFlow: '150 L/min', pressure: '0.0 PSI', interlockState: 'STANDBY', stateColor: 'info', lastCalibrated: '15 May 2026' },
  { deviceId: 'FLM-NBX-01', name: 'Flowmeter Dispenser Main Tank', station: 'Nabire Depot', currentFlow: '148 L/min', maxSafeFlow: '150 L/min', pressure: '5.8 PSI', interlockState: 'PRESSURE HIGH WARNING', stateColor: 'warning', lastCalibrated: '20 Jun 2026' },
  { deviceId: 'FLM-ILG-01', name: 'Flowmeter Portable Drum Pump 01', station: 'Airstrip Ilaga', currentFlow: '45 L/min', maxSafeFlow: '60 L/min', pressure: '1.8 PSI', interlockState: 'NORMAL / ACTIVE', stateColor: 'success', lastCalibrated: '12 Jan 2026' },
  { deviceId: 'FLM-OKB-01', name: 'Flowmeter Manual Pump Digital', station: 'Airstrip Okbibab', currentFlow: '12 L/min', maxSafeFlow: '60 L/min', pressure: '0.8 PSI', interlockState: 'SENSOR DRIFT ALERT', stateColor: 'warning', lastCalibrated: '05 Mar 2026' },
  { deviceId: 'FLM-WMX-01', name: 'Flowmeter Dispenser Tanki 01', station: 'Wamena Hub', currentFlow: '110 L/min', maxSafeFlow: '150 L/min', pressure: '2.9 PSI', interlockState: 'NORMAL / ACTIVE', stateColor: 'success', lastCalibrated: '10 Aug 2026' },
  { deviceId: 'FLM-TIM-01', name: 'Flowmeter Hydrant Dispenser 01', station: 'Timika Hub', currentFlow: '135 L/min', maxSafeFlow: '150 L/min', pressure: '3.0 PSI', interlockState: 'NORMAL / ACTIVE', stateColor: 'success', lastCalibrated: '18 Jul 2026' },
])

const resetInterlock = (f: any) => {
  f.interlockState = 'NORMAL / ACTIVE'
  f.stateColor = 'success'
  f.currentFlow = '0 L/min (Standby)'
  showToast(`Interlock cutoff pada ${f.deviceId} berhasil di-reset ke kondisi NORMAL.`, 'success')
}

// ================= TAB 4: KEGAGALAN SYNC & TRANSAKSI (8 Items) =================
const syncQueueList = ref([
  { txId: 'TX-OFF-20260822-09', station: 'Airstrip Boven Digoel', device: 'Tablet Field BVK-01', offlineRecords: 5, unsyncedVol: '1.000 L', offlineDuration: '6 Jam 15 Menit', commsChannel: 'Satellite Iridium', status: 'Auto-Retrying', statusColor: 'warning' },
  { txId: 'TX-OFF-20260822-12', station: 'Airstrip Okbibab', device: 'Tablet Field OKB-02', offlineRecords: 2, unsyncedVol: '400 L', offlineDuration: '2 Jam 40 Menit', commsChannel: 'Cellular 2G / Edge', status: 'Queued', statusColor: 'info' },
  { txId: 'TX-OFF-20260821-04', station: 'Airstrip Kiwirok', device: 'Tablet Field KWK-01', offlineRecords: 1, unsyncedVol: '200 L', offlineDuration: '12 Jam 05 Menit', commsChannel: 'No Signal / Manual', status: 'Failed Sync (Timeout)', statusColor: 'error' },
  { txId: 'TX-OFF-20260822-15', station: 'Airstrip Ilaga', device: 'Tablet Field ILG-01', offlineRecords: 4, unsyncedVol: '800 L', offlineDuration: '4 Jam 10 Menit', commsChannel: 'Satellite Iridium', status: 'Queued', statusColor: 'info' },
  { txId: 'TX-OFF-20260822-18', station: 'Airstrip Enarotali', device: 'Tablet Field EOT-01', offlineRecords: 3, unsyncedVol: '600 L', offlineDuration: '1 Jam 50 Menit', commsChannel: 'Cellular 3G', status: 'Auto-Retrying', statusColor: 'warning' },
  { txId: 'TX-OFF-20260821-10', station: 'Airstrip Moanamani', device: 'Tablet Field MOA-01', offlineRecords: 6, unsyncedVol: '1.200 L', offlineDuration: '18 Jam 30 Menit', commsChannel: 'No Signal / Manual', status: 'Failed Sync (Checksum Error)', statusColor: 'error' },
  { txId: 'TX-OFF-20260822-20', station: 'Airstrip Oksibil', device: 'Tablet Field OKS-02', offlineRecords: 2, unsyncedVol: '400 L', offlineDuration: '0 Jam 45 Menit', commsChannel: 'Cellular 4G', status: 'Syncing (45%)', statusColor: 'success' },
  { txId: 'TX-OFF-20260822-22', station: 'Depot Dekai', device: 'Tablet Field DKI-01', offlineRecords: 1, unsyncedVol: '200 L', offlineDuration: '3 Jam 15 Menit', commsChannel: 'Satellite Iridium', status: 'Queued', statusColor: 'info' },
])

const retrySync = (item: any) => {
  item.status = 'Sync Completed'
  item.statusColor = 'success'
  showToast(`Sinkronisasi paksa untuk ${item.txId} (${item.station}) BERHASIL!`, 'success')
}

const syncAllDevices = () => {
  syncQueueList.value.forEach(s => {
    s.status = 'Sync Completed'
    s.statusColor = 'success'
  })
  showToast('Proses Auto-Sync ke seluruh perangkat remote telah dipicu!', 'primary')
}

// ================= TAB 5: ATURAN NOTIFIKASI (8 Items) =================
const notificationRules = ref([
  { id: 'RULE-01', name: 'Escalation Mismatch Segel & Tamper Flag', trigger: 'Segel Fisik != Manifest OR Status Tamper', severity: 'Critical', channels: ['WhatsApp Urgent', 'SMS Satellite', 'ERP Critical Popup'], targetRole: 'Safety Manager, Quality Control Lead', slaResponse: '15 Menit', active: true },
  { id: 'RULE-02', name: 'Warning Stok Kritis Airstrip Pedalaman', trigger: 'Sisa Stok Drum < 5 Drum Level', severity: 'Warning', channels: ['WhatsApp Group', 'Email Dispatch'], targetRole: 'Logistics Supervisor Wamena', slaResponse: '2 Jam', active: true },
  { id: 'RULE-03', name: 'Flowmeter Safety Interlock Overfill Cutoff', trigger: 'Flow Rate > 150 L/min OR Sensor Pressure High', severity: 'Critical', channels: ['ERP System Popup', 'SMS Alert'], targetRole: 'Station Supervisor, Maintenance Engineer', slaResponse: '10 Menit', active: true },
  { id: 'RULE-04', name: 'Eskalasi Transaksi Offline > 12 Jam', trigger: 'Device Offline Timeout > 12 Jam', severity: 'Info', channels: ['Email Summary', 'System Notification'], targetRole: 'IT Support Administrator', slaResponse: '6 Jam', active: false },
  { id: 'RULE-05', name: 'Anomali Suhu Avtur Di Luar Standard JIG', trigger: 'Suhu Tangki Penerimaan > 35°C', severity: 'Critical', channels: ['WhatsApp Urgent', 'ERP System Popup'], targetRole: 'QC Lead, Station Manager', slaResponse: '20 Menit', active: true },
  { id: 'RULE-06', name: 'Filter Water Separator High Pressure Alert', trigger: 'Differential Pressure (DP) > 15 PSI', severity: 'Warning', channels: ['ERP Popup', 'Email Maintenance'], targetRole: 'Teknisi Depot, Maintenance Lead', slaResponse: '1 Jam', active: true },
  { id: 'RULE-07', name: 'Variansi Selisih Volume Penerimaan > 0.5%', trigger: 'Selisih Volume Manifest vs Fisik > 0.5%', severity: 'Warning', channels: ['Email Dispatch', 'WhatsApp Group'], targetRole: 'Auditor Logistik, QC Supervisor', slaResponse: '4 Jam', active: true },
  { id: 'RULE-08', name: 'Jadwal Rekalibrasi Sensor Flowmeter Expired', trigger: 'Masa Berlaku Tera Flowmeter < 7 Hari', severity: 'Info', channels: ['Email Summary'], targetRole: 'Maintenance Lead Admin', slaResponse: '24 Jam', active: true },
])

const toggleRule = (rule: any) => {
  const statusStr = rule.active ? 'diaktifkan' : 'dinonaktifkan'
  showToast(`Aturan ${rule.id} (${rule.name}) berhasil ${statusStr}.`, rule.active ? 'success' : 'warning')
}

const saveNewRule = () => {
  if (newRuleForm.value.name && newRuleForm.value.trigger) {
    const nextId = `RULE-0${notificationRules.value.length + 1}`
    notificationRules.value.push({
      id: nextId,
      name: newRuleForm.value.name,
      trigger: newRuleForm.value.trigger,
      severity: newRuleForm.value.severity,
      channels: ['ERP Popup', 'Email Dispatch'],
      targetRole: newRuleForm.value.targetRole || 'Station Manager',
      slaResponse: newRuleForm.value.slaResponse,
      active: true
    })
    showToast(`Aturan Baru ${nextId} berhasil ditambahkan!`, 'success')
    newRuleForm.value = { name: '', trigger: '', severity: 'Warning', targetRole: '', slaResponse: '30 Menit' }
    dialogNewRule.value = false
  }
}
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">
    <!-- Header & Breadcrumbs -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />
    
    <div class="d-flex align-center justify-space-between flex-wrap mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-3 mb-1">
          Alert & Notification Engine Operasional Avtur
        </h1>
        <p class="text-caption text-grey-darken-1 mb-0">
          Avtur Fuel Management > Real-time Automated Anomaly Detection, Multi-channel Routing & Safety Protocol Escalation
        </p>
      </div>
      <div class="d-flex align-center ga-2 mt-2 mt-sm-0">
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-refresh"
          class="text-none font-weight-bold"
          @click="refreshRealtime"
        >
          Refresh Realtime
        </v-btn>
      </div>
    </div>

    <!-- Avtur Main Navigation Component -->
    <AvturTopNav/>

    <!-- Navigation Tabs -->
    <v-tabs v-model="activeTab" bg-color="white" color="primary" class="mb-6 rounded-lg border elevation-1">
      <v-tab v-for="(tab, i) in tabs" :key="i" class="text-none font-weight-bold text-body-2 px-4">
        <v-icon :icon="tab.icon" class="mr-2" size="small" />
        {{ tab.title }}
        <v-chip v-if="tab.badge" size="x-small" color="error" class="ml-2 px-1 font-weight-bold">
          {{ tab.badge }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- MAIN DYNAMIC CONTENT WINDOW -->
    <v-window v-model="activeTab">
      
      <!-- TAB 0: PERINGATAN AKTIF (ACTIVE ALERTS) -->
      <v-window-item :value="0">
        <!-- Top Metrics -->
        <v-row class="mb-6">
          <v-col v-for="(m, idx) in metrics" :key="idx" cols="12" sm="6" md="2">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100 shadow-sm">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption font-weight-bold text-grey-darken-1">{{ m.title }}</span>
                <v-avatar :color="m.color" variant="tonal" size="32">
                  <v-icon :icon="m.icon" size="18" />
                </v-avatar>
              </div>
              <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">{{ m.count }}</div>
              <div v-if="m.unit" class="text-caption text-grey-darken-1">{{ m.unit }}</div>
              <div v-if="m.sub" class="text-caption font-weight-medium mt-1" :class="m.color === 'error' ? 'text-error' : 'text-success'">
                {{ m.sub }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Workflow Steps Card -->
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">
            Mekanisme kerja Alert Engine: Deteksi Anomali -> Eskalasi Multi-Channel -> Resolusi
          </div>

          <div class="d-flex align-center justify-space-between flex-wrap gap-4 px-2 py-2">
            <template v-for="(s, index) in alertEngineSteps" :key="s.step">
              <div class="d-flex flex-column align-center text-center style-flow-card pa-3 border rounded-lg bg-grey-lighten-5">
                <v-avatar :color="s.color" variant="flat" size="32" class="mb-2 text-caption font-weight-bold">
                  {{ s.step }}
                </v-avatar>
                <div class="font-weight-bold text-body-2 mb-1">{{ s.title }}</div>
                <div class="text-caption text-grey-darken-1 style-flow-desc">{{ s.desc }}</div>
              </div>

              <v-icon v-if="Number(index) < alertEngineSteps.length - 1" icon="mdi-chevron-right" color="grey" class="d-none d-md-block" />
            </template>
          </div>
        </v-card>

        <!-- Main Content Area -->
        <v-row class="mb-6">
          <!-- Left Column: Table & Filters -->
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
              <v-row density="compact" class="mb-4">
                <v-col cols="12" sm="3">
                  <v-select
                    v-model="selectedSeverity"
                    :items="['Semua Level Keparahan', 'Critical', 'Warning', 'Info']"
                    label="Severity Level"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select
                    v-model="selectedCategory"
                    :items="['Semua Kategori Alert', 'Indikasi Masalah Segel', 'Overfill / Abnormal Refuel', 'Variansi Volume Avtur', 'Stok Rendah Airstrip', 'Kegagalan Sync Data']"
                    label="Kategori Peringatan"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select
                    v-model="selectedStation"
                    :items="['Semua Station / Hub', 'Wamena Hub (WMX)', 'Sentani Hub (DJJ)', 'Timika (TIM)', 'Airstrip Okbibab', 'Airstrip Boven Digoel']"
                    label="Station / Hub"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-select
                    v-model="selectedStatus"
                    :items="['Semua Status Respon', 'Active (Unresolved)', 'Acknowledged', 'Auto-Retrying', 'Resolved']"
                    label="Status Respon"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="9" class="mt-2">
                  <v-text-field
                    v-model="searchQuery"
                    placeholder="Cari ID Alert / Judul / Sumber Drum / Flowmeter / Station"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" sm="3" class="mt-2">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    block
                    prepend-icon="mdi-cog-outline"
                    class="text-none font-weight-bold"
                    @click="dialogThreshold = true"
                  >
                    Atur Ambang Batas
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Alert Logs Table -->
              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID & Severity</th>
                    <th class="font-weight-bold text-caption">Kategori & Peringatan</th>
                    <th class="font-weight-bold text-caption">Sumber & Station</th>
                    <th class="font-weight-bold text-caption">Waktu Kejadian</th>
                    <th class="font-weight-bold text-caption">Status Respon</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredAlertLogs"
                    :key="item.id"
                    :class="{ 'bg-red-lighten-5': selectedAlert.id === item.id && item.severity === 'Critical', 'bg-blue-lighten-5': selectedAlert.id === item.id && item.severity !== 'Critical' }"
                    style="cursor: pointer;"
                    @click="selectAlertItem(item)"
                  >
                    <td>
                      <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                      <v-chip size="x-small" :color="item.severityColor" variant="flat" class="font-weight-bold mt-1">
                        {{ item.severity }}
                      </v-chip>
                    </td>
                    <td>
                      <div class="font-weight-bold text-body-2 text-grey-darken-3">{{ item.title }}</div>
                      <div class="text-caption text-primary font-weight-medium">{{ item.category }}</div>
                    </td>
                    <td>
                      <div class="font-weight-medium text-body-2">{{ item.station }}</div>
                      <div class="text-caption text-grey-darken-1">{{ item.source }}</div>
                    </td>
                    <td class="text-caption text-grey-darken-1">
                      {{ item.triggerTime }}
                    </td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="item.status === 'Resolved' ? 'success' : item.status === 'Acknowledged' ? 'warning' : 'error'"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        {{ item.status }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn
                        icon="mdi-shield-search"
                        variant="text"
                        size="small"
                        color="grey-darken-1"
                        @click.stop="selectAlertItem(item)"
                      />
                    </td>
                  </tr>
                  <tr v-if="filteredAlertLogs.length === 0">
                    <td colspan="6" class="text-center py-4 text-grey">
                      Tidak ada data peringatan yang sesuai filter pencarian.
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div class="d-flex align-center justify-space-between mt-4">
                <span class="text-caption text-grey-darken-1">Menampilkan {{ filteredAlertLogs.length }} dari {{ alertLogs.length }} peringatan terdeteksi</span>
                <div class="d-flex align-center gap-2">
                  <v-pagination v-model="page" :length="3" density="compact" />
                </div>
              </div>
            </v-card>
          </v-col>

          <!-- Right Column: Alert Detail Panel -->
          <v-col cols="12" lg="4">
            <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">{{ selectedAlert.id }}</span>
                <v-chip size="x-small" :color="selectedAlert.severityColor" variant="flat" class="font-weight-bold">
                  {{ selectedAlert.severity }}
                </v-chip>
              </div>

              <div class="text-caption text-grey-darken-1 mb-4">
                Kategori: <span class="font-weight-bold text-grey-darken-3">{{ selectedAlert.category }}</span>
              </div>

              <v-divider class="mb-4" />

              <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-alert-circle-outline" color="error" class="mr-1" size="small" />
                1. Detail Ringkasan Anomali
              </div>
              <div class="d-flex flex-column gap-2 text-caption mb-4 bg-grey-lighten-5 pa-3 rounded border">
                <div class="font-weight-bold text-grey-darken-4 text-body-2 mb-1">
                  {{ selectedAlert.title }}
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Station Terkait:</span>
                  <span class="font-weight-bold text-grey-darken-3">{{ selectedAlert.station }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-grey-darken-1">Sumber / Resource:</span>
                  <span class="font-weight-bold text-primary">{{ selectedAlert.sourceResource }}</span>
                </div>
                <div class="mt-2 bg-white pa-2 rounded border style-desc-box">
                  {{ selectedAlert.description }}
                </div>
              </div>

              <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-send-check-outline" color="purple" class="mr-1" size="small" />
                2. Status Notifikasi Multi-Channel
              </div>
              <div class="d-flex flex-column gap-2 text-caption mb-4 bg-grey-lighten-5 pa-3 rounded border">
                <div
                  v-for="(ch, cIdx) in selectedAlert.dispatchChannels"
                  :key="cIdx"
                  class="d-flex align-center justify-space-between bg-white pa-2 rounded border"
                >
                  <div>
                    <div class="font-weight-bold text-grey-darken-3">{{ ch.channel }}</div>
                    <div class="text-caption text-grey-darken-1 style-recipient">{{ ch.recipient }}</div>
                  </div>
                  <v-chip size="x-small" :color="ch.color" variant="tonal" class="font-weight-bold">
                    {{ ch.status }}
                  </v-chip>
                </div>
              </div>

              <v-row density="compact">
                <v-col cols="6">
                  <v-btn
                    variant="outlined"
                    color="warning"
                    block
                    prepend-icon="mdi-account-arrow-right"
                    class="text-none font-weight-bold"
                    @click="escalateAlert"
                  >
                    Eskalasi Alert
                  </v-btn>
                </v-col>
                <v-col cols="6">
                  <v-btn
                    color="primary"
                    block
                    prepend-icon="mdi-check-decagram"
                    class="text-none font-weight-bold"
                    @click="resolveAlert"
                  >
                    Resolve Alert
                  </v-btn>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 1: STOK RENDAH & VARIANSI VOLUME -->
      <v-window-item :value="1">
        <v-row class="mb-4">
          <v-col v-for="(sm, i) in stockMetrics" :key="i" cols="12" md="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white">
              <div class="text-caption text-grey-darken-1 font-weight-bold">{{ sm.title }}</div>
              <div class="text-h4 font-weight-bold my-1" :class="`text-${sm.color}`">{{ sm.val }}</div>
              <div class="text-caption text-grey-darken-1">{{ sm.sub }}</div>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Monitoring Stok Minimal Airstrip & Selisih Toleransi Volume
              </div>
              <div class="text-caption text-grey-darken-1">
                Sistem memberikan alert otomatis jika persediaan drum kurang dari batas aman atau variansi selisih > 0.5%
              </div>
            </div>
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-truck-delivery-outline"
              class="text-none font-weight-bold mt-2 mt-sm-0"
              @click="dialogReorder = true"
            >
              Buat Reorder Manifest
            </v-btn>
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">Lokasi Depot / Airstrip</th>
                <th class="font-weight-bold text-caption" style="width: 200px;">Kapasitas Stok Level</th>
                <th class="font-weight-bold text-caption">Stok Saat Ini</th>
                <th class="font-weight-bold text-caption">Safety Threshold</th>
                <th class="font-weight-bold text-caption">Variansi Selisih</th>
                <th class="font-weight-bold text-caption">Status</th>
                <th class="font-weight-bold text-caption text-center">Tindakan Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in stationStockList" :key="idx">
                <td>
                  <div class="font-weight-bold text-body-2">{{ s.location }}</div>
                </td>
                <td>
                  <div class="d-flex align-center gap-2">
                    <v-progress-linear
                      :model-value="s.stockPct"
                      :color="s.statusColor"
                      height="8"
                      rounded
                    />
                    <span class="text-caption font-weight-bold">{{ s.stockPct }}%</span>
                  </div>
                </td>
                <td class="font-weight-bold text-body-2">{{ s.currentStock }}</td>
                <td class="text-caption text-grey-darken-1">{{ s.minThreshold }}</td>
                <td :class="s.variance.includes('-') && s.variance !== '-0.20%' ? 'text-error font-weight-bold' : 'text-success'">
                  {{ s.variance }}
                </td>
                <td>
                  <v-chip size="x-small" :color="s.statusColor" variant="flat" class="font-weight-bold">
                    {{ s.status }}
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-btn
                    size="small"
                    :color="s.statusColor"
                    variant="tonal"
                    class="text-none font-weight-bold"
                    @click="handleStockAction(s)"
                  >
                    {{ s.action }}
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 2: VERIFIKASI SEGEL & TAMPER FLAG -->
      <v-window-item :value="2">
        <v-row class="mb-4">
          <v-col v-for="(sm, i) in sealMetrics" :key="i" cols="12" md="4">
            <v-card variant="flat" class="border rounded-lg pa-4 bg-white d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-grey-darken-1 font-weight-bold">{{ sm.title }}</div>
                <div class="text-h4 font-weight-bold my-1" :class="`text-${sm.color}`">{{ sm.val }}</div>
              </div>
              <v-avatar :color="sm.color" variant="tonal" size="42">
                <v-icon :icon="sm.icon" size="24" />
              </v-avatar>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Audit Trail Verifikasi Segel Barcode Drum & Indikasi Tampering
              </div>
              <div class="text-caption text-grey-darken-1">
                Validasi kesesuaian antara nomor segel fisik drum yang di-scan operator dengan data manifest pengiriman dari Hub
              </div>
            </div>
            <v-btn
              color="error"
              variant="flat"
              size="small"
              prepend-icon="mdi-shield-lock"
              class="text-none font-weight-bold"
              @click="dialogQuarantine = true"
            >
              Input Form Karantina Drum
            </v-btn>
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Drum</th>
                <th class="font-weight-bold text-caption">Station Ground Ops</th>
                <th class="font-weight-bold text-caption">Segel Fisik (Scanned)</th>
                <th class="font-weight-bold text-caption">Segel Manifest (System)</th>
                <th class="font-weight-bold text-caption">Operator Auditor</th>
                <th class="font-weight-bold text-caption">Bukti Foto</th>
                <th class="font-weight-bold text-caption">Status Audit</th>
                <th class="font-weight-bold text-caption">Catatan Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(seal, idx) in sealAuditLogs" :key="idx">
                <td class="font-weight-bold text-body-2">{{ seal.drumId }}</td>
                <td>{{ seal.station }}</td>
                <td class="font-weight-bold" :class="seal.statusColor === 'error' ? 'text-error' : ''">{{ seal.scannedSeal }}</td>
                <td class="text-grey-darken-1">{{ seal.manifestSeal }}</td>
                <td class="text-caption">{{ seal.operator }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="outlined"
                    prepend-icon="mdi-camera"
                    style="cursor: pointer;"
                    @click="openPhotoModal(seal)"
                  >
                    Lihat Foto
                  </v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="seal.statusColor" variant="flat" class="font-weight-bold">
                    {{ seal.status }}
                  </v-chip>
                </td>
                <td class="text-caption text-grey-darken-1">{{ seal.note }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 3: INTERLOCK & FLOWMETER ABNORMAL -->
      <v-window-item :value="3">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Telemetry Realtime Flowmeter & Auto Safety Interlock Cutoff
              </div>
              <div class="text-caption text-grey-darken-1">
                Monitoring debit pengisian (flow rate L/min) dan sistem katup otomatis untuk mencegah overfill atau kavitasi
              </div>
            </div>
            <v-chip color="purple" variant="tonal" class="font-weight-bold">
              Telemetry Online (BLE/IoT)
            </v-chip>
          </div>

          <v-row class="mb-2">
            <v-col v-for="(f, idx) in flowmeterList" :key="idx" cols="12" md="4" lg="3">
              <v-card variant="flat" class="border rounded-lg pa-4" :class="f.stateColor === 'error' ? 'bg-red-lighten-5 border-red' : 'bg-grey-lighten-5'">
                <div class="d-flex align-center justify-space-between mb-2">
                  <span class="font-weight-bold text-subtitle-2">{{ f.deviceId }}</span>
                  <v-chip size="x-small" :color="f.stateColor" variant="flat" class="font-weight-bold">
                    {{ f.interlockState }}
                  </v-chip>
                </div>
                <div class="text-caption text-grey-darken-2 font-weight-medium mb-3">{{ f.name }} - {{ f.station }}</div>
                
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>Flow Rate:</span>
                  <span class="font-weight-bold" :class="f.stateColor === 'error' ? 'text-error' : ''">{{ f.currentFlow }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>Batas Aman:</span>
                  <span class="font-weight-medium">{{ f.maxSafeFlow }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption mb-3">
                  <span>Tekanan (Pressure):</span>
                  <span class="font-weight-medium">{{ f.pressure }}</span>
                </div>

                <v-divider class="mb-3" />

                <div class="d-flex align-center justify-space-between">
                  <span class="text-caption text-grey-darken-1">Kalibrasi: {{ f.lastCalibrated }}</span>
                  <v-btn
                    size="x-small"
                    :color="f.stateColor === 'error' ? 'error' : 'primary'"
                    variant="tonal"
                    class="text-none font-weight-bold"
                    @click="resetInterlock(f)"
                  >
                    Reset Interlock
                  </v-btn>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>

      <!-- TAB 4: KEGAGALAN SYNC & TRANSAKSI -->
      <v-window-item :value="4">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Antrean Sinkronisasi Transaksi Offline Ground Ops Pedalaman
              </div>
              <div class="text-caption text-grey-darken-1">
                Data pengisian avtur di airstrip tanpa koneksi internet akan disimpan lokal dan disinkronkan otomatis saat terhubung
              </div>
            </div>
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-sync"
              class="text-none font-weight-bold mt-2 mt-sm-0"
              @click="syncAllDevices"
            >
              Paksa Auto-Sync Semua Perangkat
            </v-btn>
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID Transaksi Offline</th>
                <th class="font-weight-bold text-caption">Station / Depot</th>
                <th class="font-weight-bold text-caption">Perangkat Tablet</th>
                <th class="font-weight-bold text-caption">Trans Pending</th>
                <th class="font-weight-bold text-caption">Volume Unsynced</th>
                <th class="font-weight-bold text-caption">Terputus Sejak</th>
                <th class="font-weight-bold text-caption">Kanal Komunikasi</th>
                <th class="font-weight-bold text-caption">Status Queue</th>
                <th class="font-weight-bold text-caption text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sync, idx) in syncQueueList" :key="idx">
                <td class="font-weight-bold text-body-2">{{ sync.txId }}</td>
                <td>{{ sync.station }}</td>
                <td class="text-caption font-weight-medium">{{ sync.device }}</td>
                <td class="font-weight-bold text-warning">{{ sync.offlineRecords }} Data</td>
                <td class="font-weight-bold">{{ sync.unsyncedVol }}</td>
                <td class="text-caption text-grey-darken-1">{{ sync.offlineDuration }}</td>
                <td>
                  <v-chip size="x-small" variant="outlined" color="grey-darken-3">
                    {{ sync.commsChannel }}
                  </v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="sync.statusColor" variant="tonal" class="font-weight-bold">
                    {{ sync.status }}
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-btn
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    class="text-none font-weight-bold"
                    @click="retrySync(sync)"
                  >
                    Retry Sync
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- TAB 5: ATURAN & ROUTING NOTIFICATION -->
      <v-window-item :value="5">
        <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
            <div>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                Matriks Aturan Pemicu Alert & Dynamic Multi-Channel Escalation
              </div>
              <div class="text-caption text-grey-darken-1">
                Konfigurasi syarat pemicu (trigger criteria), kanal pengiriman notifikasi, dan target penerima berdasarkan level keparahan
              </div>
            </div>
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              class="text-none font-weight-bold mt-2 mt-sm-0"
              @click="dialogNewRule = true"
            >
              Buat Aturan Alert Baru
            </v-btn>
          </div>

          <v-table density="comfortable" class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID & Nama Aturan</th>
                <th class="font-weight-bold text-caption">Syarat Pemicu (Trigger Condition)</th>
                <th class="font-weight-bold text-caption">Severity</th>
                <th class="font-weight-bold text-caption">Kanal Dispatch</th>
                <th class="font-weight-bold text-caption">Penerima Eskalasi</th>
                <th class="font-weight-bold text-caption">Target SLA</th>
                <th class="font-weight-bold text-caption text-center">Status Aturan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, idx) in notificationRules" :key="idx">
                <td>
                  <div class="font-weight-bold text-body-2">{{ rule.name }}</div>
                  <div class="text-caption text-grey-darken-1 font-mono">{{ rule.id }}</div>
                </td>
                <td class="text-caption font-weight-medium text-grey-darken-3 style-desc-box">{{ rule.trigger }}</td>
                <td>
                  <v-chip size="x-small" :color="rule.severity === 'Critical' ? 'error' : rule.severity === 'Warning' ? 'warning' : 'info'" variant="flat" class="font-weight-bold">
                    {{ rule.severity }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex flex-wrap ga-1">
                    <v-chip v-for="(ch, cI) in rule.channels" :key="cI" size="x-small" variant="tonal" color="purple">
                      {{ ch }}
                    </v-chip>
                  </div>
                </td>
                <td class="text-caption font-weight-bold text-grey-darken-3">{{ rule.targetRole }}</td>
                <td class="text-caption font-weight-bold text-teal">{{ rule.slaResponse }}</td>
                <td class="text-center">
                  <v-switch
                    v-model="rule.active"
                    color="success"
                    hide-details
                    density="compact"
                    class="d-inline-flex"
                    @change="toggleRule(rule)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

    </v-window>

    <!-- Bottom Compliance Alert Banner -->
    <v-alert
      type="error"
      variant="tonal"
      density="comfortable"
      icon="mdi-shield-alert-outline"
      class="rounded-lg border border-red-lighten-3 mt-6"
    >
      <template #title>
        <span class="text-subtitle-2 font-weight-bold">Protokol Eskalasi Keselamatan Penerbangan (Aviation Safety Management System / SMS)</span>
      </template>
      <span class="text-caption">
        Setiap alert kategori <strong>Critical</strong> (seperti ketidaksesuaian segel drum, overfill/interlock cutoff, dan variansi selisih volume di atas toleransi) secara otomatis mewajibkan tindakan penanganan teknis di lapangan serta verifikasi langsung oleh Safety Manager sebelum operasional pengisian bahan bakar ke pesawat diizinkan berlanjut.
      </span>
    </v-alert>

    <!-- DIALOG: ATUR AMBANG BATAS -->
    <v-dialog v-model="dialogThreshold" max-width="500">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold px-0">Pengaturan Ambang Batas Alert Engine</v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field label="Minimum Drum Level (Airstrip)" model-value="5 Drum" variant="outlined" density="compact" class="mb-3" />
          <v-text-field label="Toleransi Variansi Volume (%)" model-value="0.5%" variant="outlined" density="compact" class="mb-3" />
          <v-text-field label="Flow Rate Cutoff Limit (L/min)" model-value="150 L/min" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialogThreshold = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" @click="dialogThreshold = false; showToast('Ambang batas berhasil diperbarui!', 'success')">Simpan Aturan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: BUAT REORDER MANIFEST -->
    <v-dialog v-model="dialogReorder" max-width="500">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold px-0">Buat Order Supply Avtur Baru</v-card-title>
        <v-card-text class="px-0 py-2">
          <v-select :items="['Airstrip Okbibab', 'Airstrip Ilaga', 'Airstrip Boven Digoel']" label="Pilih Airstrip Tujuan" variant="outlined" density="compact" class="mb-3" />
          <v-text-field label="Jumlah Drum Avtur (200L)" type="number" model-value="10" variant="outlined" density="compact" class="mb-3" />
          <v-select :items="['Wamena Hub (WMX)', 'Timika (TIM)', 'Nabire (NBX)']" label="Supply Hub / Source" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialogReorder = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" @click="submitReorder">Kirim Request Supply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: INPUT KARANTINA DRUM -->
    <v-dialog v-model="dialogQuarantine" max-width="500">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold px-0 text-error">Formulir Karantina Drum (Tamper Flag)</v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field v-model="quarantineForm.drumId" label="ID / Barcode Drum" placeholder="Misal: DRUM-00201" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="quarantineForm.station" label="Lokasi Station / Airstrip" placeholder="Misal: Airstrip Okbibab" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="quarantineForm.scannedSeal" label="Nomor Segel Fisik (Scanned)" placeholder="Misal: SEAL-ERR-001" variant="outlined" density="compact" class="mb-3" />
          <v-textarea v-model="quarantineForm.note" label="Alasan Karantina & Catatan" rows="3" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialogQuarantine = false">Batal</v-btn>
          <v-btn color="error" variant="flat" @click="submitQuarantine">Simpan Status Karantina</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: FOTO SEGEL DRUM -->
    <v-dialog v-model="dialogPhoto" max-width="400">
      <v-card class="pa-4 rounded-lg text-center" v-if="selectedPhotoData">
        <v-card-title class="text-subtitle-2 font-weight-bold px-0 mb-2">
          Bukti Foto Segel {{ selectedPhotoData.drumId }}
        </v-card-title>
        <div class="bg-grey-lighten-3 rounded pa-6 my-2 border d-flex flex-column align-center justify-center" style="min-height: 200px;">
          <v-icon icon="mdi-camera" size="48" color="grey-darken-1" />
          <span class="text-caption text-grey-darken-2 mt-2">Pratinjau Foto Segel (File: {{ selectedPhotoData.scannedSeal }}.jpg)</span>
        </div>
        <div class="text-caption text-left text-grey-darken-2 mt-2">
          <strong>Station:</strong> {{ selectedPhotoData.station }}<br>
          <strong>Auditor:</strong> {{ selectedPhotoData.operator }}<br>
          <strong>Status:</strong> {{ selectedPhotoData.status }}
        </div>
        <v-card-actions class="px-0 mt-3">
          <v-spacer />
          <v-btn color="primary" block variant="flat" @click="dialogPhoto = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG: BUAT ATURAN BARU -->
    <v-dialog v-model="dialogNewRule" max-width="500">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold px-0">Tambah Aturan Notification Routing</v-card-title>
        <v-card-text class="px-0 py-2">
          <v-text-field v-model="newRuleForm.name" label="Nama Aturan Alert" placeholder="Misal: Alert High Water Content" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="newRuleForm.trigger" label="Syarat Pemicu (Trigger)" placeholder="Misal: Water content > 15 ppm" variant="outlined" density="compact" class="mb-3" />
          <v-select v-model="newRuleForm.severity" :items="['Critical', 'Warning', 'Info']" label="Severity Level" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="newRuleForm.targetRole" label="Target Penerima Notifikasi" placeholder="Misal: Lead QC, Safety Officer" variant="outlined" density="compact" class="mb-3" />
          <v-text-field v-model="newRuleForm.slaResponse" label="Target SLA Resolusi" placeholder="Misal: 30 Menit" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn variant="text" @click="dialogNewRule = false">Batal</v-btn>
          <v-btn color="primary" variant="flat" @click="saveNewRule">Simpan Aturan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- GLOBAL SNACKBAR NOTIFICATION -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout" location="top right">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" size="small" icon="mdi-close" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
.min-vh-100 { min-height: 100vh; }

.style-flow-card {
  flex: 1;
  min-width: 160px;
}
.style-flow-desc {
  font-size: 11px;
  line-height: 1.3;
}
.style-desc-box {
  font-size: 11px;
  line-height: 1.4;
}
.style-recipient {
  font-size: 10px;
}
.shadow-sm {
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
}
.font-mono {
  font-family: monospace;
}
</style>