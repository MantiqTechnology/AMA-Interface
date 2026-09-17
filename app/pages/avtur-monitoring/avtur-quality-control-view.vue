<script setup lang="ts">
//import { ref, computed } from 'vue'

// --- NOTIFICATION & SNACKBAR SYSTEM ---
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const snackbarIcon = ref('mdi-check-circle')

const triggerSnackbar = (text: string, color: string = 'success', icon: string = 'mdi-check-circle') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbarIcon.value = icon
  snackbar.value = true
}

// --- NAVIGATION & TABS ---
const activeTab = ref(0)
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'K3 & Quality Control', disabled: true, href: '#' },
]

const tabs = [
  { title: 'Dashboard QC', icon: 'mdi-view-dashboard-outline' },
  { title: 'Log Inspeksi', icon: 'mdi-clipboard-list-outline' },
  { title: 'Form QC Baru', icon: 'mdi-plus-circle-outline' },
  { title: 'Verifikasi Batch / CoA', icon: 'mdi-file-certificate-outline' },
  { title: 'Audit Seal & Drum', icon: 'mdi-seal' },
  { title: 'Laporan K3 & NFPA', icon: 'mdi-shield-account-outline' },
]

const goToTab = (index: number) => {
  activeTab.value = index
}

// --- DATA STORES REAKTIF ---

// Data Log QC (Tab 1)
const qcLogs = ref([
  { id: 'QC-20260822-0045', refNo: 'DRUM-00087', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.795 kg/L', temp: '28.2 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Yohanes (OP-004)', time: '22 Aug 2026 08:15' },
  { id: 'QC-20260822-0044', refNo: 'TK-02', objectType: 'Tangki DPPU', batchNo: 'BATCH-190826-01', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.796 kg/L', temp: '27.8 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Eko (OP-002)', time: '22 Aug 2026 07:40' },
  { id: 'QC-20260821-0043', refNo: 'DRUM-00092', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'Sentani (DJJ)', swdResult: 'FAILED (Suspicious)', density: '0.805 kg/L', temp: '29.1 °C', sealStatus: 'Broken Seal', overallStatus: 'QUARANTINED', statusColor: 'error', inspector: 'Markus (OP-009)', time: '21 Aug 2026 16:30' },
  { id: 'QC-20260821-0042', refNo: 'DRUM-00095', objectType: 'Drum 200L', batchNo: 'BATCH-210826-05', location: 'Timika (TIM)', swdResult: 'PASSED (Clear)', density: '0.794 kg/L', temp: '26.5 °C', sealStatus: 'Intact / OK', overallStatus: 'PENDING SIGN', statusColor: 'warning', inspector: 'Budi (OP-011)', time: '21 Aug 2026 14:10' },
  { id: 'QC-20260820-0041', refNo: 'TK-01', objectType: 'Tangki DPPU', batchNo: 'BATCH-180826-09', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.797 kg/L', temp: '27.0 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Yohanes (OP-004)', time: '20 Aug 2026 11:00' },
  { id: 'QC-20260820-0040', refNo: 'SN-04', objectType: 'Smart Nozzle', batchNo: 'BATCH-190826-01', location: 'Sentani (DJJ)', swdResult: 'PASSED (Clear)', density: '0.795 kg/L', temp: '28.0 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Markus (OP-009)', time: '20 Aug 2026 09:15' },
  { id: 'QC-20260819-0039', refNo: 'DRUM-00088', objectType: 'Drum 200L', batchNo: 'BATCH-180826-09', location: 'DPPU Wamena (WMX)', swdResult: 'PASSED (Clear)', density: '0.796 kg/L', temp: '27.5 °C', sealStatus: 'Intact / OK', overallStatus: 'PASSED', statusColor: 'success', inspector: 'Eko (OP-002)', time: '19 Aug 2026 15:45' },
])

// Data Certificate of Analysis (Tab 3)
const coaList = ref([
  { coaNo: 'CoA-PTM-2026-8891', batch: 'BATCH-210826-05', supplier: 'Pertamina Aviation', date: '21 Aug 2026', status: 'VALIDATED' },
  { coaNo: 'CoA-PTM-2026-8875', batch: 'BATCH-190826-01', supplier: 'Pertamina Aviation', date: '19 Aug 2026', status: 'VALIDATED' },
  { coaNo: 'CoA-PTM-2026-8844', batch: 'BATCH-180826-09', supplier: 'Pertamina Aviation', date: '18 Aug 2026', status: 'PENDING' },
  { coaNo: 'CoA-PTM-2026-8812', batch: 'BATCH-150826-03', supplier: 'Pertamina Aviation', date: '15 Aug 2026', status: 'VALIDATED' },
])

// Data Audit Seal & Drum (Tab 4)
const sealAuditList = ref([
  { drumId: 'DRUM-00087', sealNo: 'SEAL-WMX-99412', bodyCondition: 'Mulus / Tidak Ada Penyok', rustCheck: 'Tidak Ada Karat', leakTest: 'PASSED (Kedap)', status: 'Lolos Audit', color: 'success' },
  { drumId: 'DRUM-00088', sealNo: 'SEAL-WMX-99413', bodyCondition: 'Mulus / Tidak Ada Penyok', rustCheck: 'Tidak Ada Karat', leakTest: 'PASSED (Kedap)', status: 'Lolos Audit', color: 'success' },
  { drumId: 'DRUM-00092', sealNo: 'SEAL-DJJ-88721', bodyCondition: 'Penyok Ringan di Rim Atas', rustCheck: 'Karat Permukaan', leakTest: 'FAILED (Rembes)', status: 'Karantina', color: 'error' },
  { drumId: 'DRUM-00095', sealNo: 'SEAL-TIM-77105', bodyCondition: 'Mulus / Tidak Ada Penyok', rustCheck: 'Tidak Ada Karat', leakTest: 'PASSED (Kedap)', status: 'Lolos Audit', color: 'success' },
  { drumId: 'DRUM-00098', sealNo: 'SEAL-WMX-99418', bodyCondition: 'Goresan Halus Cat', rustCheck: 'Tidak Ada Karat', leakTest: 'PASSED (Kedap)', status: 'Lolos Audit', color: 'success' },
])

// Data Checklist K3 & NFPA 407 (Tab 5)
const k3Checklist = ref([
  { item: 'Sistem Grounding & Bonding Tangki/Bung', standard: 'Tahanan < 10 Ohm', lastCheck: '22 Aug 2026 07:00', result: '8.2 Ohm (Normal)', status: 'SAFE', color: 'success' },
  { item: 'APAR Powder 9kg di Area Handling', standard: 'Tekanan Jarum Hijau / Expiry 2027', lastCheck: '22 Aug 2026 07:00', result: 'Tekanan Sesuai (Ok)', status: 'SAFE', color: 'success' },
  { item: 'Spill Kit & Absorbent Pad', standard: 'Lengkap Min. 2 Set', lastCheck: '21 Aug 2026 18:00', result: 'Restock Pad Diperlukan', status: 'WARNING', color: 'warning' },
  { item: 'Safety Eyewash Station', standard: 'Aliran Air Bersih Min 15 Mnt', lastCheck: '22 Aug 2026 07:00', result: 'Berfungsi Normal', status: 'SAFE', color: 'success' },
  { item: 'Detektor Gas Mudah Terbakar (LEL)', standard: 'Kalibrasi Rutin / 0% LEL Ambient', lastCheck: '20 Aug 2026 08:30', result: 'Sensor Calibrated / 0% LEL', status: 'SAFE', color: 'success' },
])

// --- METRICS DINAMIS (TERHUBUNG KE STATE) ---
const metrics = computed(() => {
  const totalLogs = qcLogs.value.length
  const passedLogs = qcLogs.value.filter(l => l.overallStatus === 'PASSED').length
  const passRate = totalLogs > 0 ? ((passedLogs / totalLogs) * 100).toFixed(1) + '%' : '100%'
  const quarantinedCount = qcLogs.value.filter(l => l.overallStatus === 'QUARANTINED').length + sealAuditList.value.filter(s => s.status === 'Karantina').length
  const pendingCount = qcLogs.value.filter(l => l.overallStatus === 'PENDING SIGN').length
  const waterFreeRate = totalLogs > 0 ? (((totalLogs - qcLogs.value.filter(l => l.swdResult.includes('FAILED')).length) / totalLogs) * 100).toFixed(0) + '%' : '100%'

  return [
    { title: 'Total Inspeksi (Bulan Ini)', count: totalLogs.toString(), unit: 'Pemeriksaan Aktif', sub: '↗ Live Dynamic Data', icon: 'mdi-clipboard-check-outline', color: 'primary' },
    { title: 'Pass Rate Mutu', count: passRate, unit: 'Lolos Uji Standar', sub: 'Standar JIG / CASR', icon: 'mdi-check-decagram-outline', color: 'success' },
    { title: 'Uji SWD / Air', count: waterFreeRate, unit: 'Bebas Kontaminasi', sub: 'Capsule Detector Test', icon: 'mdi-water-check-outline', color: 'info' },
    { title: 'Density @ 15°C Valid', count: (totalLogs > 0 ? totalLogs - 1 : 0).toString(), unit: 'Sampel Tervalidasi', sub: 'Sesuai Spesifikasi CoA', icon: 'mdi-thermometer-lines', color: 'teal' },
    { title: 'Drum / Seal Flagged', count: quarantinedCount.toString(), unit: 'Drum Karantina', sub: 'Segel Rusak / Leak Fail', icon: 'mdi-alert-rhombus-outline', color: 'warning' },
    { title: 'Pending Approval K3', count: pendingCount.toString(), unit: 'Membutuhkan Sign-off', sub: 'Persetujuan Supervisor', icon: 'mdi-clock-outline', color: 'orange' },
  ]
})

const qcWorkflowSteps = [
  { step: 1, title: 'Verifikasi Batch & CoA', desc: 'Pencocokan nomor batch drum/tangki dengan sertifikasi analisis resmi pabrik.', icon: 'mdi-file-certificate-outline', color: 'primary' },
  { step: 2, title: 'Cek Fisik Drum & Seal', desc: 'Inspeksi keutuhan segel tamper-proof, bebas korosi, leak-check, dan label hazard.', icon: 'mdi-barrel', color: 'teal' },
  { step: 3, title: 'Uji Kadar Air (SWD)', desc: 'Pemeriksaan visual dan Shell Water Detector capsule untuk indikasi air/partikel.', icon: 'mdi-water-opacity', color: 'info' },
  { step: 4, title: 'Uji Density & Suhu', desc: 'Pengukuran density dan suhu lapangan dengan konversi ke referensi 15°C.', icon: 'mdi-thermometer', color: 'warning' },
  { step: 5, title: 'Digital Sign-off K3', desc: 'Persetujuan operator dan supervisor sebelum fuel dinyatakan fit-for-flight.', icon: 'mdi-shield-check-outline', color: 'success' },
]

// --- TAB 1: LOG INSPEKSI & PENCARIAN & INTERAKSI ---
const selectedLocation = ref('Semua Station')
const selectedQcStatus = ref('Semua Status')
const selectedType = ref('Semua Tipe Sampling')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(5)

const locationItems = ['Semua Station', 'DPPU Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)']
const statusItems = ['Semua Status', 'PASSED', 'QUARANTINED', 'PENDING SIGN']
const typeItems = ['Semua Tipe Sampling', 'Drum 200L', 'Tangki DPPU', 'Smart Nozzle']

const filteredLogs = computed(() => {
  return qcLogs.value.filter((item) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchSearch =
      !q ||
      item.id.toLowerCase().includes(q) ||
      item.refNo.toLowerCase().includes(q) ||
      item.batchNo.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q)
    const matchLocation = selectedLocation.value === 'Semua Station' || item.location === selectedLocation.value
    const matchStatus = selectedQcStatus.value === 'Semua Status' || item.overallStatus === selectedQcStatus.value
    const matchType = selectedType.value === 'Semua Tipe Sampling' || item.objectType === selectedType.value

    return matchSearch && matchLocation && matchStatus && matchType
  })
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / itemsPerPage.value) || 1
})

const resetFilters = () => {
  searchQuery.value = ''
  selectedLocation.value = 'Semua Station'
  selectedQcStatus.value = 'Semua Status'
  selectedType.value = 'Semua Tipe Sampling'
  currentPage.value = 1
  triggerSnackbar('Semua filter berhasil di-reset!', 'info', 'mdi-refresh')
}

// Dialog Detail Log
const detailDialog = ref(false)
const selectedDetail = ref<any>(null)

const openDetail = (item: any) => {
  selectedDetail.value = {
    id: item.id,
    refNo: `${item.refNo} (${item.objectType})`,
    batchNo: item.batchNo,
    visualCheck: item.overallStatus === 'PASSED' ? 'Bright & Clear (Memenuhi Syarat)' : 'Terdapat Partikel / Keruh',
    swdCapsuleResult: item.swdResult,
    obsDensity: item.density,
    obsTemp: item.temp,
    sealNo: `SEAL-${item.location.substring(5, 8)}-${Math.floor(10000 + Math.random() * 90000)}`,
    sealCondition: item.sealStatus,
    inspector: item.inspector,
    time: item.time,
    overallStatus: item.overallStatus,
  }
  detailDialog.value = true
}

const approveLog = (item: any) => {
  item.overallStatus = 'PASSED'
  item.statusColor = 'success'
  triggerSnackbar(`Inspeksi ${item.id} disetujui & diverifikasi (PASSED)!`, 'success', 'mdi-check-decagram')
}

const quarantineLog = (item: any) => {
  item.overallStatus = 'QUARANTINED'
  item.statusColor = 'error'
  triggerSnackbar(`Inspeksi ${item.id} dialihkan ke status QUARANTINED!`, 'warning', 'mdi-alert')
}

// Dialog Hapus Log
const deleteDialog = ref(false)
const itemToDelete = ref<any>(null)

const confirmDeleteLog = (item: any) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const executeDeleteLog = () => {
  if (itemToDelete.value) {
    const idx = qcLogs.value.findIndex(l => l.id === itemToDelete.value.id)
    if (idx !== -1) {
      qcLogs.value.splice(idx, 1)
      triggerSnackbar(`Data ${itemToDelete.value.id} berhasil dihapus dari log.`, 'error', 'mdi-delete-outline')
    }
  }
  deleteDialog.value = false
}

// --- TAB 2: FORM QC BARU & SUBMISSION DINAMIS ---
const formObject = ref('Drum 200L')
const formBatch = ref('BATCH-210826-05')
const formLocation = ref('DPPU Wamena (WMX)')
const formSwd = ref('PASSED')
const formDensity = ref('0.795')
const formTemp = ref('28.2')
const formNotes = ref('')

const calculatedDensity15C = computed(() => {
  const d = parseFloat(formDensity.value) || 0.795
  const t = parseFloat(formTemp.value) || 15
  const corrected = d + (t - 15) * 0.0007
  return corrected.toFixed(4)
})

const fillSampleForm = () => {
  formObject.value = 'Drum 200L'
  formBatch.value = `BATCH-${Math.floor(100000 + Math.random() * 900000)}`
  formLocation.value = 'Sentani (DJJ)'
  formSwd.value = 'PASSED'
  formDensity.value = '0.798'
  formTemp.value = '27.5'
  formNotes.value = 'Pengujian sampel acak rutin shift pagi oleh operator duty.'
  triggerSnackbar('Formulir diisi dengan data pengujian otomatis!', 'info', 'mdi-auto-fix')
}

const saveQcForm = () => {
  const isPassed = formSwd.value === 'PASSED'
  const newId = `QC-20260822-${String(qcLogs.value.length + 46).padStart(4, '0')}`
  const newLog = {
    id: newId,
    refNo: formObject.value === 'Drum 200L' ? `DRUM-00${qcLogs.value.length + 95}` : formObject.value === 'Tangki DPPU' ? 'TK-04' : 'SN-08',
    objectType: formObject.value,
    batchNo: formBatch.value,
    location: formLocation.value,
    swdResult: `${formSwd.value} (${isPassed ? 'Clear' : 'Suspicious'})`,
    density: `${formDensity.value} kg/L`,
    temp: `${formTemp.value} °C`,
    sealStatus: isPassed ? 'Intact / OK' : 'Flagged Audit',
    overallStatus: isPassed ? 'PASSED' : 'QUARANTINED',
    statusColor: isPassed ? 'success' : 'error',
    inspector: 'Operator Duty (Anda)',
    time: 'Hari Ini, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  qcLogs.value.unshift(newLog)
  triggerSnackbar(`Hasil Uji Mutu QC ${newId} Berhasil Disimpan!`, 'success', 'mdi-file-document-check-outline')
  
  formNotes.value = ''
  goToTab(1)
}

// --- TAB 3: VERIFIKASI COA ACTIONS & DIALOG ---
const coaDialog = ref(false)
const newCoaNo = ref('')
const newCoaBatch = ref('')
const newCoaSupplier = ref('Pertamina Aviation')

const openAddCoaDialog = () => {
  newCoaNo.value = `CoA-PTM-2026-${Math.floor(8000 + Math.random() * 1000)}`
  newCoaBatch.value = `BATCH-${Math.floor(100000 + Math.random() * 900000)}`
  coaDialog.value = true
}

const saveCoa = () => {
  coaList.value.unshift({
    coaNo: newCoaNo.value,
    batch: newCoaBatch.value,
    supplier: newCoaSupplier.value,
    date: 'Hari Ini',
    status: 'VALIDATED'
  })
  coaDialog.value = false
  triggerSnackbar(`Sertifikat CoA Baru ${newCoaNo.value} Terverifikasi!`, 'success', 'mdi-certificate')
}

const toggleCoaStatus = (item: any) => {
  item.status = item.status === 'VALIDATED' ? 'PENDING' : 'VALIDATED'
  triggerSnackbar(`Status CoA ${item.coaNo} diubah menjadi ${item.status}`, 'info', 'mdi-sync')
}

// --- TAB 4: AUDIT SEAL & DRUM DIALOG & ACTIONS ---
const sealDialog = ref(false)
const newDrumId = ref('')
const newSealNo = ref('')
const newBodyCond = ref('Mulus / Tidak Ada Penyok')
const newRustCheck = ref('Tidak Ada Karat')
const newLeakTest = ref('PASSED (Kedap)')
const newSealStatus = ref('Lolos Audit')

const openSealDialog = () => {
  newDrumId.value = `DRUM-00${Math.floor(100 + Math.random() * 900)}`
  newSealNo.value = `SEAL-WMX-${Math.floor(10000 + Math.random() * 90000)}`
  sealDialog.value = true
}

const saveSealAudit = () => {
  const isPassed = newSealStatus.value === 'Lolos Audit'
  sealAuditList.value.unshift({
    drumId: newDrumId.value,
    sealNo: newSealNo.value,
    bodyCondition: newBodyCond.value,
    rustCheck: newRustCheck.value,
    leakTest: newLeakTest.value,
    status: newSealStatus.value,
    color: isPassed ? 'success' : 'error'
  })
  sealDialog.value = false
  triggerSnackbar(`Audit Drum ${newDrumId.value} berhasil dicatat!`, isPassed ? 'success' : 'warning', 'mdi-shield-check')
}

const markDrumQuarantine = (item: any) => {
  item.status = 'Karantina'
  item.color = 'error'
  triggerSnackbar(`Drum ${item.drumId} dipindahkan ke status Karantina!`, 'error', 'mdi-alert-octagon')
}

const markDrumPassed = (item: any) => {
  item.status = 'Lolos Audit'
  item.color = 'success'
  triggerSnackbar(`Drum ${item.drumId} dinyatakan Lolos Audit!`, 'success', 'mdi-check-bold')
}

// --- TAB 5: K3 & NFPA 407 DIALOG & EXPORT ---
const k3Dialog = ref(false)
const newK3Item = ref('')
const newK3Standard = ref('Standar NFPA 407 Compliance')
const newK3Result = ref('')
const newK3Status = ref('SAFE')
const isExporting = ref(false)

const openK3Dialog = () => {
  newK3Item.value = ''
  newK3Standard.value = 'Standar NFPA 407 Compliance'
  newK3Result.value = ''
  newK3Status.value = 'SAFE'
  k3Dialog.value = true
}

const saveK3Check = () => {
  k3Checklist.value.unshift({
    item: newK3Item.value || 'Pemeriksaan K3 Tambahan',
    standard: newK3Standard.value,
    lastCheck: 'Hari Ini',
    result: newK3Result.value || 'Sesuai Standar',
    status: newK3Status.value,
    color: newK3Status.value === 'SAFE' ? 'success' : 'warning'
  })
  k3Dialog.value = false
  triggerSnackbar('Item Inspeksi K3 Berhasil Ditambahkan!', 'success', 'mdi-shield-plus')
}

const resolveK3Warning = (item: any) => {
  item.status = 'SAFE'
  item.color = 'success'
  item.result = 'Telah Dibereskan / Normal'
  item.lastCheck = 'Baru Saja'
  triggerSnackbar(`Peringatan K3 untuk "${item.item}" telah diselesaikan!`, 'success', 'mdi-check-decagram')
}

const downloadNfpaReport = () => {
  isExporting.value = true
  setTimeout(() => {
    isExporting.value = false
    triggerSnackbar('Laporan Resmi K3 & NFPA 407 berhasil di-export ke PDF!', 'success', 'mdi-file-pdf-box')
  }, 1200)
}

const getSwdColor = (result: string) => (result.includes('PASSED') ? 'success' : 'error')
const lolosAuditCount = computed(() => {
  return sealAuditList.value.filter(s => s.status === 'Lolos Audit').length
})

const karantinaCount = computed(() => {
  return sealAuditList.value.filter(s => s.status === 'Karantina').length
})
</script>

<template>
  <div class="pa-4 pa-md-6 bg-grey-lighten-4 min-vh-100">
    <!-- Header & Breadcrumb -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />

    <div class="mb-5">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <div>
          <h1 class="text-h5 font-weight-bold text-grey-darken-3 mb-1">Checklist Digital K3 & Kontrol Mutu Avtur</h1>
          <p class="text-caption text-medium-emphasis mb-0">Avtur Fuel Management &gt; On-Site Quality Control & Safety Verification</p>
        </div>
        <div class="d-flex ga-2">
          <v-btn color="secondary" variant="outlined" prepend-icon="mdi-export-variant" class="text-none" @click="downloadNfpaReport" :loading="isExporting">Export Laporan</v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" class="text-none" elevation="1" @click="goToTab(2)">Form QC Baru</v-btn>
        </div>
      </div>
    </div>

    <AvturTopNav/>

    <!-- Navigation Tabs -->
    <v-card variant="flat" class="border rounded-lg mb-6 bg-white overflow-x-auto">
      <v-tabs v-model="activeTab" color="primary" show-arrows>
        <v-tab v-for="(tab, i) in tabs" :key="i" :value="i" class="text-none text-body-2">
          <v-icon :icon="tab.icon" size="18" class="mr-2" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- TAB 0: Dashboard QC Dinamis -->
    <template v-if="activeTab === 0">
      <v-row class="mb-4">
        <v-col v-for="(m, idx) in metrics" :key="idx" cols="12" sm="6" md="4" lg="2">
          <v-card variant="flat" class="border rounded-lg pa-4 bg-white h-100">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-medium-emphasis">{{ m.title }}</span>
              <v-avatar :color="m.color" variant="tonal" size="32"><v-icon :icon="m.icon" size="16" /></v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">{{ m.count }}</div>
            <div class="text-caption text-medium-emphasis">{{ m.unit }}</div>
            <div class="text-caption text-primary font-weight-medium mt-1">{{ m.sub }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Panel Aksi Cepat Dashboard -->
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-1">Standard Operating Procedure (SOP) Inspeksi QC</div>
            <div class="text-caption text-medium-emphasis mb-4">Tahapan wajib verifikasi fisik dan pengujian mutu Avtur sebelum distribusi.</div>
            <v-row>
              <v-col v-for="step in qcWorkflowSteps" :key="step.step" cols="12" sm="6" md="2" class="flex-grow-1">
                <v-card variant="outlined" class="pa-3 rounded-lg h-100 bg-grey-lighten-5">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-avatar :color="step.color" size="24" class="text-caption font-weight-bold text-white">{{ step.step }}</v-avatar>
                    <v-icon :icon="step.icon" :color="step.color" size="20" />
                  </div>
                  <div class="text-subtitle-2 font-weight-bold mb-1">{{ step.title }}</div>
                  <div class="text-caption text-medium-emphasis line-clamp-3">{{ step.desc }}</div>
                </v-card>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-2">Aksi Cepat Pengujian</div>
            <div class="text-caption text-medium-emphasis mb-4">Akses pintas untuk verifikasi dan alur inspeksi harian.</div>
            <div class="d-flex flex-column ga-2">
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus-box" class="justify-start text-none" @click="goToTab(2)">Input Hasil Uji Baru</v-btn>
              <v-btn color="teal" variant="tonal" prepend-icon="mdi-shield-search" class="justify-start text-none" @click="goToTab(4)">Jalankan Audit Drum & Segel</v-btn>
              <v-btn color="warning" variant="tonal" prepend-icon="mdi-file-certificate" class="justify-start text-none" @click="goToTab(3)">Verifikasi CoA Pertamina</v-btn>
              <v-btn color="info" variant="tonal" prepend-icon="mdi-clipboard-text-search-outline" class="justify-start text-none" @click="goToTab(1)">Lihat Semua Log Inspeksi</v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- TAB 1: Log Inspeksi Interaktif (Filter & Aksi Tabel Fully Functional) -->
    <template v-else-if="activeTab === 1">
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div class="text-subtitle-1 font-weight-bold">Filter Log Inspeksi Mutu</div>
          <v-btn color="grey-darken-1" size="small" variant="outlined" prepend-icon="mdi-refresh" class="text-none" @click="resetFilters">Reset Filter</v-btn>
        </div>
        <v-row density="comfortable">
          <v-col cols="12" sm="6" md="3">
            <v-text-field v-model="searchQuery" label="Cari ID, Batch, Inspector..." variant="outlined" density="compact" prepend-inner-icon="mdi-magnify" clearable hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select v-model="selectedLocation" :items="locationItems" label="Station" variant="outlined" density="compact" hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select v-model="selectedQcStatus" :items="statusItems" label="Status QC" variant="outlined" density="compact" hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select v-model="selectedType" :items="typeItems" label="Tipe Sampling" variant="outlined" density="compact" hide-details />
          </v-col>
        </v-row>
      </v-card>

      <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="text-subtitle-1 font-weight-bold">Daftar Log Inspeksi Mutu Avtur</div>
          <div class="text-caption text-medium-emphasis">Menampilkan {{ filteredLogs.length }} dari {{ qcLogs.length }} total log</div>
        </div>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th>ID / Tanggal</th>
              <th>Objek / Batch</th>
              <th>Station</th>
              <th>Uji SWD</th>
              <th>Density & Suhu</th>
              <th>Status QC</th>
              <th class="text-center">Aksi Penuh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedLogs" :key="item.id">
              <td><strong>{{ item.id }}</strong><br><small class="text-medium-emphasis">{{ item.time }}</small></td>
              <td>{{ item.refNo }}<br><small class="text-medium-emphasis">{{ item.batchNo }}</small></td>
              <td>{{ item.location }}</td>
              <td><v-chip size="x-small" :color="getSwdColor(item.swdResult)" variant="tonal" class="font-weight-bold">{{ item.swdResult }}</v-chip></td>
              <td class="text-caption">{{ item.density }}<br><span class="text-medium-emphasis">@ {{ item.temp }}</span></td>
              <td><v-chip size="x-small" :color="item.statusColor" variant="tonal" class="font-weight-bold">{{ item.overallStatus }}</v-chip></td>
              <td class="text-center">
                <div class="d-flex align-center justify-center ga-1">
                  <v-btn size="small" variant="text" color="primary" icon="mdi-eye-outline" title="Detail Inspeksi" @click="openDetail(item)" />
                  <v-btn size="small" variant="text" color="success" icon="mdi-check-circle-outline" title="Approve / Loloskan" @click="approveLog(item)" />
                  <v-btn size="small" variant="text" color="warning" icon="mdi-alert-octagon-outline" title="Set Karantina" @click="quarantineLog(item)" />
                  <v-btn size="small" variant="text" color="error" icon="mdi-delete-outline" title="Hapus Log" @click="confirmDeleteLog(item)" />
                </div>
              </td>
            </tr>
            <tr v-if="filteredLogs.length === 0">
              <td colspan="7" class="text-center text-medium-emphasis py-6">Data inspeksi tidak ditemukan sesuai filter.</td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex justify-end align-center mt-4">
          <v-pagination v-model="currentPage" :length="totalPages" total-visible="5" density="compact" color="primary" />
        </div>
      </v-card>
    </template>

    <!-- TAB 2: Form QC Baru (Simulasi Input & Pre-fill) -->
    <template v-else-if="activeTab === 2">
      <v-card variant="flat" class="border rounded-lg pa-6 bg-white">
        <div class="d-flex align-center justify-space-between mb-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Formulir Input Uji Mutu Avtur</div>
            <div class="text-caption text-medium-emphasis">Masukkan data hasil pengujian visual, SWD, serta pengukuran fisik density dan suhu.</div>
          </div>
          <v-btn color="purple" variant="tonal" size="small" prepend-icon="mdi-auto-fix" class="text-none" @click="fillSampleForm">Isi Contoh Valid</v-btn>
        </div>

        <v-row class="mt-2">
          <v-col cols="12" md="4">
            <v-select v-model="formObject" :items="['Drum 200L', 'Tangki DPPU', 'Smart Nozzle']" label="Objek Sampling" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="formBatch" label="Nomor Batch" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="formLocation" :items="['DPPU Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)']" label="Station" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="formSwd" :items="['PASSED', 'FAILED']" label="Hasil SWD (Capsule Test)" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="formDensity" label="Density Observasi (kg/L)" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="formTemp" label="Suhu Pengukuran (°C)" variant="outlined" density="comfortable" />
          </v-col>
          <v-col cols="12">
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
              Hasil Estimasi Density Konversi @ 15°C: <strong>{{ calculatedDensity15C }} kg/L</strong> (Batas Standar CASR: 0.775 - 0.840 kg/L)
            </v-alert>
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="formNotes" label="Catatan Tambahan Inspeksi (Opsional)" variant="outlined" rows="2" density="comfortable" hide-details />
          </v-col>
        </v-row>

        <div class="d-flex justify-end ga-3 mt-6">
          <v-btn variant="outlined" class="text-none" @click="goToTab(1)">Batal</v-btn>
          <v-btn color="primary" class="text-none" prepend-icon="mdi-content-save-check" @click="saveQcForm">Simpan Hasil Uji</v-btn>
        </div>
      </v-card>
    </template>

    <!-- TAB 3: Verifikasi Batch / CoA -->
    <template v-else-if="activeTab === 3">
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Verifikasi Certificate of Analysis (CoA)</div>
            <div class="text-caption text-medium-emphasis">Pencocokan dokumen resmi spesifikasi teknis kilang dengan batch fisik di lapangan.</div>
          </div>
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" class="text-none" @click="openAddCoaDialog">Unggah CoA Baru</v-btn>
        </div>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th>Nomor CoA</th>
              <th>Nomor Batch</th>
              <th>Supplier / Refinery</th>
              <th>Tanggal Penerbitan</th>
              <th>Status Verifikasi</th>
              <th class="text-center">Aksi Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in coaList" :key="i">
              <td class="font-weight-bold text-primary">{{ c.coaNo }}</td>
              <td>{{ c.batch }}</td>
              <td>{{ c.supplier }}</td>
              <td>{{ c.date }}</td>
              <td>
                <v-chip size="x-small" :color="c.status === 'VALIDATED' ? 'success' : 'warning'" variant="tonal" class="font-weight-bold">{{ c.status }}</v-chip>
              </td>
              <td class="text-center">
                <v-btn size="small" variant="tonal" :color="c.status === 'VALIDATED' ? 'warning' : 'success'" class="text-none" @click="toggleCoaStatus(c)">
                  {{ c.status === 'VALIDATED' ? 'Set Pending' : 'Validasi CoA' }}
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- TAB 4: Audit Seal & Drum -->
    <template v-else-if="activeTab === 4">
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Audit Keutuhan Segel & Physical Drum</div>
            <div class="text-caption text-medium-emphasis">Verifikasi integritas segel tamper-proof, kebocoran, dan kondisi fisik drum.</div>
          </div>
          <v-btn color="teal" size="small" prepend-icon="mdi-shield-search" class="text-none" @click="openSealDialog">Mulai Audit Baru</v-btn>
        </div>

        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-3 bg-teal-lighten-5 border-teal">
              <div class="text-caption font-weight-bold text-teal-darken-3">Total Drum Terverifikasi</div>
              <div class="text-h6 font-weight-bold text-teal-darken-4">{{ sealAuditList.length }} Drum</div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-3 bg-green-lighten-5 border-green">
              <div class="text-caption font-weight-bold text-green-darken-3">Segel Utuh (Intact)</div>
              <div class="text-h6 font-weight-bold text-green-darken-4">{{ lolosAuditCount }} Drum</div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-3 bg-red-lighten-5 border-red">
              <div class="text-caption font-weight-bold text-red-darken-3">Segel Indikasi Tampering / Kebocoran</div>
              <div class="text-h6 font-weight-bold text-red-darken-4">{{ karantinaCount }} Drum (Karantina)</div>
            </v-card>
          </v-col>
        </v-row>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold">ID Drum</th>
              <th class="font-weight-bold">Nomor Segel (Seal No.)</th>
              <th class="font-weight-bold">Kondisi Body Drum</th>
              <th class="font-weight-bold">Inspeksi Korosi</th>
              <th class="font-weight-bold">Uji Leak / Presisi Bung</th>
              <th class="font-weight-bold">Status Audit</th>
              <th class="text-center">Ubah Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in sealAuditList" :key="idx">
              <td class="font-weight-bold">{{ item.drumId }}</td>
              <td class="text-caption"><code>{{ item.sealNo }}</code></td>
              <td class="text-body-2">{{ item.bodyCondition }}</td>
              <td class="text-body-2">{{ item.rustCheck }}</td>
              <td class="text-body-2">{{ item.leakTest }}</td>
              <td>
                <v-chip size="x-small" :color="item.color" variant="tonal" class="font-weight-bold">{{ item.status }}</v-chip>
              </td>
              <td class="text-center">
                <v-btn v-if="item.status === 'Lolos Audit'" size="small" variant="text" color="error" class="text-none" @click="markDrumQuarantine(item)">Karantina</v-btn>
                <v-btn v-else size="small" variant="text" color="success" class="text-none" @click="markDrumPassed(item)">Loloskan</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- TAB 5: Laporan K3 & NFPA 407 -->
    <template v-else-if="activeTab === 5">
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Pemeriksaan K3 & Compliance NFPA 407</div>
            <div class="text-caption text-medium-emphasis">Standar Keselamatan Refueling, Grounding Bonding, dan Peralatan Proteksi Kebakaran.</div>
          </div>
          <div class="d-flex ga-2">
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" class="text-none" @click="openK3Dialog">Tambah Cek K3</v-btn>
            <v-chip color="success" size="small" variant="tonal" prepend-icon="mdi-check-decagram">K3 Compliant</v-chip>
          </div>
        </div>

        <v-table density="comfortable" class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="font-weight-bold">Item Alat Safety / Proteksi</th>
              <th class="font-weight-bold">Standar Rujukan (NFPA 407)</th>
              <th class="font-weight-bold">Pengecekan Terakhir</th>
              <th class="font-weight-bold">Hasil Pengukuran / Kondisi</th>
              <th class="font-weight-bold">Status K3</th>
              <th class="text-center">Aksi Respon</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(k, idx) in k3Checklist" :key="idx">
              <td class="font-weight-bold">{{ k.item }}</td>
              <td class="text-caption text-medium-emphasis">{{ k.standard }}</td>
              <td class="text-caption">{{ k.lastCheck }}</td>
              <td class="text-body-2">{{ k.result }}</td>
              <td>
                <v-chip size="x-small" :color="k.color" variant="tonal" class="font-weight-bold">{{ k.status }}</v-chip>
              </td>
              <td class="text-center">
                <v-btn v-if="k.status === 'WARNING'" size="small" color="warning" variant="tonal" class="text-none" @click="resolveK3Warning(k)">Bereskan Restock</v-btn>
                <span v-else class="text-caption text-medium-emphasis">OK</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- DIALOG DETAIL LOG INSPEKSI -->
    <v-dialog v-model="detailDialog" max-width="600">
      <v-card v-if="selectedDetail" class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-grey-lighten-4 border-b">
          <span class="text-subtitle-1 font-weight-bold">Detail Inspeksi: {{ selectedDetail.id }}</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="detailDialog = false" />
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row density="compact">
            <v-col cols="6"><strong>Objek Sampling:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.refNo }}</p></v-col>
            <v-col cols="6"><strong>Nomor Batch:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.batchNo }}</p></v-col>
            <v-col cols="6"><strong>Visual Check:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.visualCheck }}</p></v-col>
            <v-col cols="6"><strong>Uji SWD:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.swdCapsuleResult }}</p></v-col>
            <v-col cols="6"><strong>Density Observasi:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.obsDensity }}</p></v-col>
            <v-col cols="6"><strong>Suhu Lapangan:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.obsTemp }}</p></v-col>
            <v-col cols="6"><strong>Nomor Segel:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.sealNo }}</p></v-col>
            <v-col cols="6"><strong>Kondisi Segel:</strong><p class="text-caption text-medium-emphasis mb-2">{{ selectedDetail.sealCondition }}</p></v-col>
            <v-col cols="6"><strong>Inspector / Duty:</strong><p class="text-caption text-medium-emphasis mb-0">{{ selectedDetail.inspector }}</p></v-col>
            <v-col cols="6"><strong>Waktu Pemeriksaan:</strong><p class="text-caption text-medium-emphasis mb-0">{{ selectedDetail.time }}</p></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="justify-end pa-4 bg-grey-lighten-5 border-t">
          <v-btn color="primary" variant="tonal" class="text-none" @click="detailDialog = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG CONFIRM DELETE LOG -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="rounded-lg pa-2">
        <v-card-title class="text-subtitle-1 font-weight-bold">Konfirmasi Hapus</v-card-title>
        <v-card-text>Apakah kamu yakin ingin menghapus data log inspeksi <strong>{{ itemToDelete?.id }}</strong>?</v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" class="text-none" @click="deleteDialog = false">Batal</v-btn>
          <v-btn color="error" variant="flat" class="text-none" @click="executeDeleteLog">Hapus</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG UNGGAH COA BARU -->
    <v-dialog v-model="coaDialog" max-width="500">
      <v-card class="rounded-lg pa-4">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-4">Input Certificate of Analysis (CoA)</v-card-title>
        <v-card-text class="pa-0">
          <v-text-field v-model="newCoaNo" label="Nomor CoA" variant="outlined" density="comfortable" />
          <v-text-field v-model="newCoaBatch" label="Nomor Batch Fuel" variant="outlined" density="comfortable" />
          <v-text-field v-model="newCoaSupplier" label="Supplier / Kilang" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions class="justify-end pa-0 mt-2">
          <v-btn variant="text" class="text-none" @click="coaDialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none" @click="saveCoa">Simpan CoA</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG AUDIT SEAL BARU -->
    <v-dialog v-model="sealDialog" max-width="500">
      <v-card class="rounded-lg pa-4">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-4">Catat Audit Drum & Segel</v-card-title>
        <v-card-text class="pa-0">
          <v-text-field v-model="newDrumId" label="ID Drum" variant="outlined" density="comfortable" />
          <v-text-field v-model="newSealNo" label="Nomor Segel (Seal No.)" variant="outlined" density="comfortable" />
          <v-select v-model="newBodyCond" :items="['Mulus / Tidak Ada Penyok', 'Penyok Ringan di Rim Atas', 'Penyok Berat / Tergores']" label="Kondisi Body" variant="outlined" density="comfortable" />
          <v-select v-model="newRustCheck" :items="['Tidak Ada Karat', 'Karat Permukaan', 'Karat Parah']" label="Pengecekan Karat" variant="outlined" density="comfortable" />
          <v-select v-model="newLeakTest" :items="['PASSED (Kedap)', 'FAILED (Rembes)']" label="Uji Kebocoran" variant="outlined" density="comfortable" />
          <v-select v-model="newSealStatus" :items="['Lolos Audit', 'Karantina']" label="Status Audit" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions class="justify-end pa-0 mt-2">
          <v-btn variant="text" class="text-none" @click="sealDialog = false">Batal</v-btn>
          <v-btn color="teal" class="text-none" @click="saveSealAudit">Simpan Audit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOG TAMBAH CEK K3 -->
    <v-dialog v-model="k3Dialog" max-width="500">
      <v-card class="rounded-lg pa-4">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-0 mb-4">Tambah Checklist K3 / NFPA 407</v-card-title>
        <v-card-text class="pa-0">
          <v-text-field v-model="newK3Item" label="Nama Peralatan / Item Safety" variant="outlined" density="comfortable" />
          <v-text-field v-model="newK3Standard" label="Standar Rujukan (NFPA 407)" variant="outlined" density="comfortable" />
          <v-text-field v-model="newK3Result" label="Hasil Pengukuran / Kondisi" variant="outlined" density="comfortable" />
          <v-select v-model="newK3Status" :items="['SAFE', 'WARNING']" label="Status Keselamatan" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions class="justify-end pa-0 mt-2">
          <v-btn variant="text" class="text-none" @click="k3Dialog = false">Batal</v-btn>
          <v-btn color="primary" class="text-none" @click="saveK3Check">Simpan Check K3</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- GLOBAL SNACKBAR NOTIFIKASI -->
    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor" rounded="pill">
      <div class="d-flex align-center ga-2">
        <v-icon :icon="snackbarIcon" />
        <span>{{ snackbarText }}</span>
      </div>
    </v-snackbar>
  </div>
</template>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cursor-pointer {
  cursor: pointer;
}
</style>