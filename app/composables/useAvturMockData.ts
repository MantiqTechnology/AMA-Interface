//import { reactive, ref } from 'vue'

// ---------------------------------------------------------------------
// TYPES DEFINITION
// ---------------------------------------------------------------------
export interface AvturFilter {
  dateRange: string
  station: string
  drumStatus: string
  syncState: string
}

export interface AvturKpi {
  key: string
  title: string
  value: string
  icon: string
  color: string
  trend?: { icon: string; text: string; tone: 'good' | 'bad' | 'neutral' }
  target?: string
}

export interface ChartSegment {
  label: string
  value: number
  percent: number
  color: string
}

export interface ChartRow {
  label: string
  value: number | string
  percent: number
  color: string
}

export interface FuelTransaction {
  id: string
  timestamp: string
  station: string
  aircraftReg: string
  volumeLiters: number
  skidId: string
  flowmeterId: string
  operator: string
  syncStatus: 'Synced' | 'Pending' | 'Conflict'
}

// --- QC TYPES DEFINITION ---
export interface QcMetric {
  title: string
  count: string | number
  unit: string
  sub: string
  icon: string
  color: string
}

export interface QcWorkflowStep {
  step: number
  title: string
  desc: string
  icon: string
  color: string
}

export interface QcLog {
  id: string
  refNo: string
  objectType: 'Drum 200L' | 'Tangki DPPU' | 'Smart Nozzle' | 'Bridger'
  batchNo: string
  location: string
  swdResult: string
  density: string
  temp: string
  sealStatus: string
  overallStatus: 'PASSED' | 'QUARANTINED' | 'PENDING SIGN'
  statusColor: string
  inspector: string
  time: string
}

export interface QcBatch {
  batchNo: string
  coaNo: string
  refinery: string
  productionDate: string
  expiryDate: string
  status: string
  statusColor: string
  totalDrums: number
  specs: {
    density: string
    flashPoint: string
    freezePoint: string
    waterContent: string
  }
  scannedDrums: Array<{ id: string; status: string; time: string }>
}

// ---------------------------------------------------------------------
// MODULE-SCOPE STATE (Shared state across components)
// ---------------------------------------------------------------------
const filters = reactive<AvturFilter>({
  dateRange: '01 – 22 Aug 2026',
  station: 'All Station',
  drumStatus: 'All Status',
  syncState: 'All Sync State',
})

const lastUpdated = ref<string>('22 Aug 2026 11:45 WIB')

const kpis = ref<AvturKpi[]>([
  {
    key: 'totalVolume',
    title: 'Total Dispensed (YTD)',
    value: '1,245,680 L',
    icon: 'mdi-water-percent',
    color: 'primary',
    trend: { icon: 'mdi-arrow-up-thin', text: '12% vs last month', tone: 'good' },
  },
  {
    key: 'activeDrums',
    title: 'Active Drum Stock',
    value: '218 Drums',
    icon: 'mdi-barrel',
    color: 'info',
    target: 'Min Stock: 150 Drums',
  },
  {
    key: 'pendingSync',
    title: 'Pending Sync Queue',
    value: '96',
    icon: 'mdi-sync-alert',
    color: 'warning',
    trend: { icon: 'mdi-arrow-down-thin', text: '24 synced recently', tone: 'good' },
  },
  {
    key: 'hardwareAlerts',
    title: 'Hardware Alerts',
    value: '3',
    icon: 'mdi-alert-circle-outline',
    color: 'error',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 new critical', tone: 'bad' },
  },
  {
    key: 'activeDevices',
    title: 'Online Smart Hardware',
    value: '22 / 28',
    icon: 'mdi-wifi-check',
    color: 'success',
    target: '78.6% Online Rate',
  },
  {
    key: 'qcCompliance',
    title: 'QC Pass Rate (JIG)',
    value: '99.4%',
    icon: 'mdi-shield-check-outline',
    color: 'success',
    target: 'Target: > 99.0%',
  },
])

const fuelConsumptionTrend = ref({
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  series: [
    { name: 'Wamena (WMX)', color: '#1E88E5', data: [120, 135, 128, 142, 150, 165, 158, 180] },
    { name: 'Sentani (DJJ)', color: '#43A047', data: [95, 102, 98, 110, 105, 115, 112, 125] },
    { name: 'Timika (TIM)', color: '#FB8C00', data: [70, 78, 82, 85, 90, 88, 94, 100] },
  ],
})

const stockByStation = ref({
  total: 218,
  totalLabel: 'Total Active Drums',
  footnote: 'Based on current scanned inventory',
  segments: [
    { label: 'Wamena (WMX)', value: 85, percent: 39, color: '#1E88E5' },
    { label: 'Sentani (DJJ)', value: 65, percent: 30, color: '#43A047' },
    { label: 'Timika (TIM)', value: 42, percent: 19, color: '#FB8C00' },
    { label: 'Dekai & Mulia', value: 26, percent: 12, color: '#8E24AA' },
  ] as ChartSegment[],
})

const hardwareStatus = ref({
  footnote: 'Connected IoT devices & flowmeters',
  rows: [
    { label: 'Digital Flowmeters', value: 12, percent: 100, color: '#1E88E5' },
    { label: 'Ultrasonic Sensors', value: 8, percent: 67, color: '#43A047' },
    { label: 'Rugged Tablets', value: 5, percent: 42, color: '#FB8C00' },
    { label: 'Smart Nozzles', value: 3, percent: 25, color: '#8E24AA' },
  ] as ChartRow[],
})

const recentTransactions = ref<FuelTransaction[]>([
  {
    id: 'TX-20260822-001',
    timestamp: '22 Aug 2026 10:15',
    station: 'Wamena (WMX)',
    aircraftReg: 'PK-AMA',
    volumeLiters: 180,
    skidId: 'SKID-WMX-01',
    flowmeterId: 'FM-DIG-002',
    operator: 'Ahmad S.',
    syncStatus: 'Synced',
  },
  {
    id: 'TX-20260822-002',
    timestamp: '22 Aug 2026 09:40',
    station: 'Dekai (DKI)',
    aircraftReg: 'PK-AMB',
    volumeLiters: 240,
    skidId: 'SKID-DKI-02',
    flowmeterId: 'FM-DIG-005',
    operator: 'Lukas M.',
    syncStatus: 'Pending',
  },
  {
    id: 'TX-20260822-003',
    timestamp: '22 Aug 2026 08:20',
    station: 'Timika (TIM)',
    aircraftReg: 'PK-AMC',
    volumeLiters: 310,
    skidId: 'SKID-TIM-01',
    flowmeterId: 'FM-DIG-001',
    operator: 'Budi T.',
    syncStatus: 'Synced',
  },
])

// --- QC STATE ---
const qcMetrics = ref<QcMetric[]>([
  { title: 'Total Inspeksi (Bulan Ini)', count: '412', unit: 'Pemeriksaan', sub: '↗ 8% vs bulan lalu', icon: 'mdi-clipboard-check-outline', color: 'primary' },
  { title: 'Pass Rate Mutu', count: '99.2%', unit: 'Lolos Uji', sub: 'Standar JIG / CASR', icon: 'mdi-check-decagram-outline', color: 'success' },
  { title: 'Uji SWD / Air', count: '100%', unit: 'Bebas Air', sub: '0 Kasus Kontaminasi', icon: 'mdi-water-check-outline', color: 'info' },
  { title: 'Density @ 15°C Valid', count: '410', unit: 'Sampel Tervalidasi', sub: 'Sesuai Spesifikasi CoA', icon: 'mdi-thermometer-lines', color: 'teal' },
  { title: 'Drum / Seal Flagged', count: '2', unit: 'Drum Karantina', sub: 'Segel Rusak / Penyok', icon: 'mdi-alert-rhombus-outline', color: 'warning' },
  { title: 'Pending Approval K3', count: '3', unit: 'Membutuhkan Sign-off', sub: 'Shift Pagi', icon: 'mdi-clock-outline', color: 'orange' },
])

const qcWorkflowSteps = ref<QcWorkflowStep[]>([
  { step: 1, title: 'Verifikasi Batch & CoA', desc: 'Pencocokan nomor batch drum/tangki dengan sertifikasi analisis.', icon: 'mdi-file-certificate-outline', color: 'primary' },
  { step: 2, title: 'Cek Fisik Drum & Seal', desc: 'Inspeksi keutuhan segel tamper-proof, bebas korosi, dan leak-check.', icon: 'mdi-barrel', color: 'teal' },
  { step: 3, title: 'Uji Kadar Air (SWD)', desc: 'Pemeriksaan visual dan Shell Water Detector capsule untuk indikasi air.', icon: 'mdi-water-opacity', color: 'info' },
  { step: 4, title: 'Uji Density & Suhu', desc: 'Pengukuran density lapangan dengan konversi ke referensi 15°C.', icon: 'mdi-thermometer', color: 'warning' },
  { step: 5, title: 'Digital Sign-off K3', desc: 'Persetujuan operator dan supervisor sebelum fuel dinyatakan siap.', icon: 'mdi-shield-check-outline', color: 'success' },
])

const qcLogs = ref<QcLog[]>([
  { id: 'QC-20260822-0045', refNo: 'DRUM-00087', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.795 kg/L', temp: '28.2 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Yohanes (OP-004)', time: '22 Aug 2026 08:15' },
  { id: 'QC-20260822-0044', refNo: 'TK-02', objectType: 'Tangki DPPU', batchNo: 'BATCH-190826-01', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.796 kg/L', temp: '27.8 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Eko (OP-002)', time: '22 Aug 2026 07:40' },
  { id: 'QC-20260821-0043', refNo: 'DRUM-00092', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'Sentani (DJJ)', swdResult: 'FAILED (Suspicious)', density: '0.805 kg/L', temp: '29.1 °C', sealStatus: 'Broken Seal', overallStatus: 'QUARANTINED', statusColor: 'error', inspector: 'Markus (OP-009)', time: '21 Aug 2026 16:30' },
])

const qcDetailById = ref<Record<string, any>>({
  'QC-20260822-0045': { id: 'QC-20260822-0045', refNo: 'DRUM-00087 (Drum 200L)', batchNo: 'BATCH-210826-05', coaDocNo: 'CoA-PTM-2026-8891', location: 'DPPU Wamena (WMX)', inspectionTime: '22 Aug 2026 08:15 WIB', overallStatus: 'PASSED / FIT-FOR-FLIGHT', statusColor: 'success', visualCheck: 'Bright & Clear, Free from Solid Matter', swdCapsuleResult: 'PASSED (Kapsul Kuning - Tidak Ada Air Absolut)', obsDensity: '0.795 kg/L', obsTemp: '28.2 °C', convertedDensity15: '0.804 kg/L', densitySpecification: 'Standar JIG: 0.775 - 0.840 kg/L', sealNo: 'SEAL-WMX-99412', sealCondition: 'Segel Utuh, No Tampering', drumBodyCondition: 'Bebas Penyok, Grounding Lug Bekerja', operatorName: 'Yohanes Prasetyo (ID: OP-004)', supervisorName: 'Thomas Novan (ID: SUP-001)', digitalSignTime: '22 Aug 2026 08:18 WIB', gpsCoordinate: '-4.0961, 138.9482' },
  'QC-20260822-0044': { id: 'QC-20260822-0044', refNo: 'TK-02 (Hub WMX)', batchNo: 'BATCH-190826-01', coaDocNo: 'CoA-PTM-2026-8875', location: 'DPPU Wamena (WMX)', inspectionTime: '22 Aug 2026 07:40 WIB', overallStatus: 'PASSED / FIT-FOR-FLIGHT', statusColor: 'success', visualCheck: 'Bright & Clear', swdCapsuleResult: 'PASSED (Clear)', obsDensity: '0.796 kg/L', obsTemp: '27.8 °C', convertedDensity15: '0.804 kg/L', densitySpecification: 'Standar JIG: 0.775 - 0.840 kg/L', sealNo: 'SEAL-TK02-18291', sealCondition: 'Intact / Verified', drumBodyCondition: 'Tank body normal', operatorName: 'Eko Santoso', supervisorName: 'Thomas Novan', digitalSignTime: '22 Aug 2026 07:44 WIB', gpsCoordinate: '-4.0961, 138.9482' },
  'QC-20260821-0043': { id: 'QC-20260821-0043', refNo: 'DRUM-00092 (Drum 200L)', batchNo: 'BATCH-210826-05', coaDocNo: 'CoA-PTM-2026-8891', location: 'Sentani (DJJ)', inspectionTime: '21 Aug 2026 16:30 WIB', overallStatus: 'QUARANTINED', statusColor: 'error', visualCheck: 'Visual anomaly detected', swdCapsuleResult: 'FAILED (Suspicious)', obsDensity: '0.805 kg/L', obsTemp: '29.1 °C', convertedDensity15: '0.814 kg/L', densitySpecification: 'Perlu investigasi', sealNo: 'SEAL-DJJ-88721', sealCondition: 'Broken Seal', drumBodyCondition: 'Minor dent', operatorName: 'Markus', supervisorName: 'Pending', digitalSignTime: 'Belum sign-off', gpsCoordinate: '-2.6500, 140.5167' }
})

const qcBatchDatabase = ref<Record<string, QcBatch>>({
  'BATCH-210826-05': {
    batchNo: 'BATCH-210826-05', coaNo: 'CoA-PTM-2026-8891', refinery: 'Kilang Pertamina RU IV Cilacap', productionDate: '10 Aug 2026', expiryDate: '10 Feb 2027', status: 'VERIFIED', statusColor: 'success', totalDrums: 45,
    specs: { density: '0.795 - 0.805 kg/L', flashPoint: 'Min 38 °C', freezePoint: 'Max -47 °C', waterContent: 'Max 30 ppm' },
    scannedDrums: [
      { id: 'DRUM-00087', status: 'PASSED', time: '22 Aug 2026 08:15' },
      { id: 'DRUM-00088', status: 'PASSED', time: '22 Aug 2026 08:20' },
      { id: 'DRUM-00092', status: 'QUARANTINED', time: '21 Aug 2026 16:30' },
    ]
  }
})

// ---------------------------------------------------------------------
// COMPOSABLE EXPORT
// ---------------------------------------------------------------------
export function useAvturMockData() {
  function refresh() {
    lastUpdated.value =
      new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
  }

  return {
    // Existing Exports
    filters,
    lastUpdated,
    kpis,
    fuelConsumptionTrend,
    stockByStation,
    hardwareStatus,
    recentTransactions,
    refresh,

    // QC Exports
    qcMetrics,
    qcWorkflowSteps,
    qcLogs,
    qcDetailById,
    qcBatchDatabase,
  }
}