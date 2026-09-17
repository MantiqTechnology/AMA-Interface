<script setup lang="ts">
//import { computed, ref, watch } from 'vue'

// --- Breadcrumbs & Navigation ---
const breadcrumbs = [
  { title: 'Avtur Fuel Management', disabled: false, href: '#' },
  { title: 'Fuel Reconciliation & Variance Analysis', disabled: true, href: '#' },
]

const activeTab = ref(0)

const tabs = [
  { title: 'Dashboard Rekonsiliasi', icon: 'mdi-scale-balance' },
  { title: 'Flowmeter vs Log Manual', icon: 'mdi-gauge' },
  { title: 'Matching Tagihan Vendor', icon: 'mdi-file-document-outline' },
  { title: 'Audit Selisih & Toleransi', icon: 'mdi-alert-circle-outline' },
  { title: 'Jurnal Rekonsiliasi ERP', icon: 'mdi-database-sync-outline' },
]

// --- Metrics Top Overview ---
const metrics = ref([
  {
    title: 'Total Inflow Avtur (Bulan Ini)',
    count: '450,000 L',
    unit: 'Penerimaan Vendor',
    sub: '99.8% Matched Invoice',
    icon: 'mdi-truck-delivery-outline',
    color: 'primary',
    subColor: 'success',
  },
  {
    title: 'Total Outflow Refuel',
    count: '382,400 L',
    unit: 'Pengisian Pesawat',
    sub: '184 Misi Flight Ops',
    icon: 'mdi-gas-station-outline',
    color: 'teal',
    subColor: 'success',
  },
  {
    title: 'Net Volume Variance',
    count: '-0.24%',
    unit: '-1,080 L Selisih Total',
    sub: 'Batas Toleransi Normal (< 0.5%)',
    icon: 'mdi-chart-line-variant',
    color: 'success',
    subColor: 'success',
  },
  {
    title: 'Flowmeter vs Manual Deviation',
    count: '0.12%',
    unit: '12 Pasang Sensor Active',
    sub: 'Sesuai Kalibrasi Metrologi',
    icon: 'mdi-gauge-full',
    color: 'info',
    subColor: 'success',
  },
  {
    title: 'Discrepancy Flagged (> 0.5%)',
    count: '2 Kasus',
    unit: 'DPPU WMX & TIM',
    sub: 'Perlu Investigasi Lapangan',
    icon: 'mdi-alert-rhombus-outline',
    color: 'error',
    subColor: 'error',
  },
  {
    title: 'Pending Approval Reconciliation',
    count: '3 Station',
    unit: 'Closing Period Aug 2026',
    sub: 'Menunggu Sign Manager',
    icon: 'mdi-clock-outline',
    color: 'warning',
    subColor: 'warning',
  },
])

const reconciliationSteps = [
  {
    step: 1,
    title: 'Koleksi Outflow & Inflow',
    desc: 'Pengumpulan data penerimaan vendor, mutasi transfer, dan transaksi refueling pesawat.',
    icon: 'mdi-tray-arrow-down',
    color: 'primary',
  },
  {
    step: 2,
    title: 'Komparasi Meter vs Manual',
    desc: 'Validasi angka Digital Flowmeter dengan Dipstick Manual jika sensor offline.',
    icon: 'mdi-gauge',
    color: 'info',
  },
  {
    step: 3,
    title: 'Matching Tagihan Vendor',
    desc: 'Sinkronisasi Surat Jalan / Invoice dengan fisik Avtur yang diterima.',
    icon: 'mdi-file-certificate-outline',
    color: 'teal',
  },
  {
    step: 4,
    title: 'Analisis Toleransi Selisih',
    desc: 'Kalkulasi selisih volume terhadap batas toleransi yang ditetapkan.',
    icon: 'mdi-calculator-variant',
    color: 'warning',
  },
  {
    step: 5,
    title: 'Closing & Jurnal ERP',
    desc: 'Digital sign-off dan ekspor penyesuaian persediaan ke sistem ERP.',
    icon: 'mdi-check-decagram-outline',
    color: 'purple',
  },
]

// --- State Filters & Search ---
const datePeriod = ref('Agustus 2026')
const selectedStation = ref('Semua Station / Hub')
const selectedVendor = ref('Semua Vendor')
const selectedToleranceStatus = ref('Semua Status Toleransi')
const searchQuery = ref('')

// --- Main Data Store ---
const reconciliationLogs = ref([
  {
    id: 'REC-202608-001',
    period: '15-21 Aug 2026',
    station: 'Wamena Hub (WMX)',
    vendor: 'Pertamina Patra Niaga',
    flowmeterVol: '120,500 L',
    manualDipVol: '120,380 L',
    vendorInvVol: '120,000 L',
    varianceLiters: '+380 L',
    variancePercent: '+0.31%',
    toleranceStatus: 'Pass (Normal)',
    statusColor: 'success',
    method: 'Flowmeter Automatic',
    invoiceNo: 'INV-PTM-WMX-2026-0818',
    deliveryNoteNo: 'SJ-2026-08911',
    approvalStatus: 'Approved',
    erpJournalRef: 'ERP-JRN-202608-441',
    rootCause: 'Selisih berada dalam batas toleransi operasional.',
    investigator: 'Andi Pratama (QC WMX)',
    sensorStatus: 'Normal',
    lastCalibration: '10 Aug 2026',
    disputeStatus: 'Resolved',
  },
  {
    id: 'REC-202608-002',
    period: '15-21 Aug 2026',
    station: 'Sentani Hub (DJJ)',
    vendor: 'Pertamina Patra Niaga',
    flowmeterVol: '185,000 L',
    manualDipVol: '184,820 L',
    vendorInvVol: '185,000 L',
    varianceLiters: '-180 L',
    variancePercent: '-0.09%',
    toleranceStatus: 'Pass (Normal)',
    statusColor: 'success',
    method: 'Flowmeter Automatic',
    invoiceNo: 'INV-PTM-DJJ-2026-0820',
    deliveryNoteNo: 'SJ-2026-08941',
    approvalStatus: 'Approved',
    erpJournalRef: 'ERP-JRN-202608-442',
    rootCause: 'Selisih pengukuran minor pada pemeriksaan fisik.',
    investigator: 'Rizky Mahendra (QC DJJ)',
    sensorStatus: 'Normal',
    lastCalibration: '12 Aug 2026',
    disputeStatus: 'Resolved',
  },
  {
    id: 'REC-202608-003',
    period: '15-21 Aug 2026',
    station: 'Timika (TIM)',
    vendor: 'Pemasok Lokal Perintis',
    flowmeterVol: '45,000 L',
    manualDipVol: '44,600 L',
    vendorInvVol: '45,000 L',
    varianceLiters: '-400 L',
    variancePercent: '-0.88%',
    toleranceStatus: 'Exceeded Threshold',
    statusColor: 'error',
    method: 'Manual Dipstick',
    invoiceNo: 'INV-PTM-TIM-2026-0811',
    deliveryNoteNo: 'SJ-2026-08992',
    approvalStatus: 'Pending Review Operational Manager',
    erpJournalRef: 'ERP-JRN-PENDING',
    rootCause: 'Penguapan saat transit jalan darat + penyusutan suhu 2.5°C saat pembongkaran.',
    investigator: 'Budi Santoso (Supervisor QC TIM)',
    sensorStatus: 'Needs Calibration',
    lastCalibration: '01 Jul 2026',
    disputeStatus: 'Under Dispute',
  },
  {
    id: 'REC-202608-004',
    period: '08-14 Aug 2026',
    station: 'Airstrip Boven Digoel',
    vendor: 'Transfer Internal WMX',
    flowmeterVol: 'N/A (Manual)',
    manualDipVol: '12,000 L',
    vendorInvVol: '12,000 L',
    varianceLiters: '0 L',
    variancePercent: '0.00%',
    toleranceStatus: 'Pass (Normal)',
    statusColor: 'success',
    method: 'Manual Dipstick',
    invoiceNo: 'INT-WMX-BVD-0814',
    deliveryNoteNo: 'DO-TRANSFER-20260814',
    approvalStatus: 'Approved',
    erpJournalRef: 'ERP-JRN-202608-430',
    rootCause: 'Tidak ditemukan selisih pada saat serah-terima.',
    investigator: 'Yusuf Kurniawan (Station BVD)',
    sensorStatus: 'Offline Mode',
    lastCalibration: '15 Jun 2026',
    disputeStatus: 'Resolved',
  },
  {
    id: 'REC-202608-005',
    period: '08-14 Aug 2026',
    station: 'Airstrip Okbibab',
    vendor: 'Transfer Internal DJJ',
    flowmeterVol: 'N/A (Manual)',
    manualDipVol: '8,200 L',
    vendorInvVol: '8,300 L',
    varianceLiters: '-100 L',
    variancePercent: '-1.20%',
    toleranceStatus: 'Exceeded Threshold',
    statusColor: 'error',
    method: 'Manual Dipstick',
    invoiceNo: 'INT-DJJ-OKB-0813',
    deliveryNoteNo: 'DO-TRANSFER-20260813',
    approvalStatus: 'Pending Investigation',
    erpJournalRef: 'ERP-JRN-PENDING-OKB',
    rootCause: 'Perlu verifikasi ulang volume fisik dan dokumen handover.',
    investigator: 'Dimas Wijaya (Station OKB)',
    sensorStatus: 'Offline Mode',
    lastCalibration: '20 May 2026',
    disputeStatus: 'Under Dispute',
  },
])

const selectedRecId = ref('REC-202608-003')

const selectedRec = computed(() => {
  return (
    reconciliationLogs.value.find((item) => item.id === selectedRecId.value) ??
    reconciliationLogs.value[0]
  )
})

// --- Filtering & Pagination ---
const filteredLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return reconciliationLogs.value.filter((item) => {
    const matchStation =
      selectedStation.value === 'Semua Station / Hub' || item.station === selectedStation.value

    const matchVendor =
      selectedVendor.value === 'Semua Vendor' ||
      item.vendor === selectedVendor.value ||
      (selectedVendor.value === 'Transfer Internal' && item.vendor.includes('Transfer Internal'))

    const matchTolerance =
      selectedToleranceStatus.value === 'Semua Status Toleransi' ||
      item.toleranceStatus === selectedToleranceStatus.value

    const matchSearch =
      !query ||
      [item.id, item.period, item.station, item.vendor, item.invoiceNo, item.deliveryNoteNo]
        .join(' ')
        .toLowerCase()
        .includes(query)

    return matchStation && matchVendor && matchTolerance && matchSearch
  })
})

const page = ref(1)
const itemsPerPage = ref(10)

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredLogs.value.length / itemsPerPage.value))
})

const paginatedLogs = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedStation, selectedVendor, selectedToleranceStatus, datePeriod], () => {
  page.value = 1
})

const flaggedLogs = computed(() =>
  reconciliationLogs.value.filter((item) => item.toleranceStatus === 'Exceeded Threshold'),
)

const matchedInvoiceCount = computed(() => {
  return reconciliationLogs.value.filter((item) => item.toleranceStatus === 'Pass (Normal)').length
})

const selectRecord = (item: (typeof reconciliationLogs.value)[number]) => {
  selectedRecId.value = item.id
}

const resetFilters = () => {
  datePeriod.value = 'Agustus 2026'
  selectedStation.value = 'Semua Station / Hub'
  selectedVendor.value = 'Semua Vendor'
  selectedToleranceStatus.value = 'Semua Status Toleransi'
  searchQuery.value = ''
  page.value = 1
  showToast('Filter berhasil dibersihkan', 'info')
}

const getVarianceColor = (value: string) => {
  const numericValue = Number.parseFloat(value.replace('%', '').replace(',', '.'))
  if (Math.abs(numericValue) > 0.5) return 'error'
  if (Math.abs(numericValue) >= 0.25) return 'warning'
  return 'success'
}

// --- Toast Feedback ---
const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

const showToast = (text: string, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

// --- Helper Download CSV/Excel File ---
const downloadCSVFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// --- Global Header Actions ---
const isSyncing = ref(false)
const syncAllSensorData = () => {
  isSyncing.value = true
  setTimeout(() => {
    isSyncing.value = false
    showToast('Berhasil sinkronisasi 12 sensor Flowmeter & ERP!', 'success')
  }, 1200)
}

const exportDataExcel = () => {
  let csv = 'ID,Periode,Station,Vendor,Flowmeter,Manual,Invoice,Selisih(%),Status,Approval\n'
  filteredLogs.value.forEach((row) => {
    csv += `"${row.id}","${row.period}","${row.station}","${row.vendor}","${row.flowmeterVol}","${row.manualDipVol}","${row.vendorInvVol}","${row.variancePercent}","${row.toleranceStatus}","${row.approvalStatus}"\n`
  })
  downloadCSVFile(csv, `Laporan_Rekonsiliasi_Avtur_${datePeriod.value.replace(' ', '_')}.csv`)
  showToast('Berkas CSV/Excel berhasil diunduh!', 'success')
}

// --- Dialog 1: Pop-up BAS (Berita Acara Selisih) ---
const isBasDialogOpen = ref(false)
const targetBasItem = ref<(typeof reconciliationLogs.value)[number] | null>(null)

const openBasModal = (item?: (typeof reconciliationLogs.value)[number]) => {
  targetBasItem.value = item || selectedRec.value
  isBasDialogOpen.value = true
}

const printBasDocument = () => {
  const item = targetBasItem.value
  if (!item) return
  const docContent = `BERITA ACARA SELISIH (BAS) AVTUR\nID: ${item.id}\nStation: ${item.station}\nVendor: ${item.vendor}\nSelisih Volume: ${item.varianceLiters} (${item.variancePercent})\nPenyebab: ${item.rootCause}\nPetugas QC: ${item.investigator}\nStatus: ${item.approvalStatus}`
  downloadCSVFile(docContent, `BAS_${item.id}.txt`)
  showToast(`Dokumen BAS ${item.id} berhasil diunduh & siap dicetak!`, 'success')
  isBasDialogOpen.value = false
}

// --- Dialog 2: Quick View Detail Pop-up ---
const isDetailDialogOpen = ref(false)
const openDetailModal = (item: (typeof reconciliationLogs.value)[number]) => {
  selectRecord(item)
  isDetailDialogOpen.value = true
}

// --- Dialog 3: Input Log Rekonsiliasi Baru ---
const isNewRecDialogOpen = ref(false)
const newRecForm = ref({
  station: 'Wamena Hub (WMX)',
  vendor: 'Pertamina Patra Niaga',
  flowmeterVol: 50000,
  manualDipVol: 49850,
  vendorInvVol: 50000,
  invoiceNo: 'INV-NEW-2026-001',
  deliveryNoteNo: 'SJ-NEW-001',
  investigator: 'Andi Pratama',
  rootCause: 'Pengukuran operasional rutin',
})

const openNewRecModal = () => {
  isNewRecDialogOpen.value = true
}

const saveNewRec = () => {
  const diffLiters = newRecForm.value.manualDipVol - newRecForm.value.vendorInvVol
  const diffPercent = ((diffLiters / newRecForm.value.vendorInvVol) * 100).toFixed(2)
  const isPass = Math.abs(Number(diffPercent)) <= 0.5

  const newId = `REC-202608-00${reconciliationLogs.value.length + 1}`

  reconciliationLogs.value.unshift({
    id: newId,
    period: '22-28 Aug 2026',
    station: newRecForm.value.station,
    vendor: newRecForm.value.vendor,
    flowmeterVol: `${newRecForm.value.flowmeterVol.toLocaleString()} L`,
    manualDipVol: `${newRecForm.value.manualDipVol.toLocaleString()} L`,
    vendorInvVol: `${newRecForm.value.vendorInvVol.toLocaleString()} L`,
    varianceLiters: `${diffLiters >= 0 ? '+' : ''}${diffLiters} L`,
    variancePercent: `${diffPercent}%`,
    toleranceStatus: isPass ? 'Pass (Normal)' : 'Exceeded Threshold',
    statusColor: isPass ? 'success' : 'error',
    method: 'Manual Dipstick',
    invoiceNo: newRecForm.value.invoiceNo,
    deliveryNoteNo: newRecForm.value.deliveryNoteNo,
    approvalStatus: isPass ? 'Approved' : 'Pending Review Operational Manager',
    erpJournalRef: isPass ? `ERP-JRN-202608-${Math.floor(100 + Math.random() * 900)}` : 'ERP-JRN-PENDING',
    rootCause: newRecForm.value.rootCause,
    investigator: newRecForm.value.investigator,
    sensorStatus: 'Normal',
    lastCalibration: 'Hari ini',
    disputeStatus: isPass ? 'Resolved' : 'Under Dispute',
  })

  showToast(`Log rekonsiliasi ${newId} berhasil ditambahkan!`, 'success')
  isNewRecDialogOpen.value = false
}

// --- Dialog 4: Kalibrasi Sensor Flowmeter (Tab 1) ---
const isCalibrationDialogOpen = ref(false)
const calibrationTarget = ref<(typeof reconciliationLogs.value)[number] | null>(null)
const calibrationNotes = ref('')

const openCalibrationModal = (item: (typeof reconciliationLogs.value)[number]) => {
  calibrationTarget.value = item
  calibrationNotes.value = `Kalibrasi metrologi ulang untuk unit di ${item.station}`
  isCalibrationDialogOpen.value = true
}

const saveCalibration = () => {
  if (calibrationTarget.value) {
    calibrationTarget.value.sensorStatus = 'Normal'
    calibrationTarget.value.lastCalibration = 'Hari ini (Disetujui)'
    showToast(`Sensor di ${calibrationTarget.value.station} berhasil dikalibrasi!`, 'success')
  }
  isCalibrationDialogOpen.value = false
}

// --- Dialog 5: Upload Invoice Vendor (Tab 2) ---
const isInvoiceUploadDialogOpen = ref(false)
const selectedFile = ref<File | null>(null)
const openUploadInvoiceModal = () => {
  selectedFile.value = null
  isInvoiceUploadDialogOpen.value = true
}
const handleInvoiceUpload = () => {
  showToast('File Invoice & Surat Jalan berhasil diunggah dan dicocokkan!', 'success')
  isInvoiceUploadDialogOpen.value = false
}

// --- Dialog 6: Form Resolusi Dispute Vendor (Tab 2) ---
const isDisputeDialogOpen = ref(false)
const disputeTarget = ref<(typeof reconciliationLogs.value)[number] | null>(null)
const disputeActionNote = ref('')

const openDisputeModal = (item: (typeof reconciliationLogs.value)[number]) => {
  disputeTarget.value = item
  disputeActionNote.value = 'Negosiasi penyesuaian tagihan sesuai berita acara selisih.'
  isDisputeDialogOpen.value = true
}

const resolveDispute = () => {
  if (disputeTarget.value) {
    disputeTarget.value.disputeStatus = 'Resolved'
    disputeTarget.value.statusColor = 'success'
    showToast(`Dispute tagihan untuk ${disputeTarget.value.id} berhasil diselesaikan!`, 'success')
  }
  isDisputeDialogOpen.value = false
}

// --- Dialog 7: Form Investigasi Lapangan (Tab 3) ---
const isInvestigationDialogOpen = ref(false)
const investigationTarget = ref<(typeof reconciliationLogs.value)[number] | null>(null)
const customRootCause = ref('')

const openInvestigationModal = (item: (typeof reconciliationLogs.value)[number]) => {
  investigationTarget.value = item
  customRootCause.value = item.rootCause
  isInvestigationDialogOpen.value = true
}

const saveInvestigation = () => {
  if (investigationTarget.value) {
    investigationTarget.value.rootCause = customRootCause.value
    showToast(`Hasil investigasi ${investigationTarget.value.id} berhasil diperbarui!`, 'success')
  }
  isInvestigationDialogOpen.value = false
}

// --- Dialog 8: Inspection Payload ERP & Sync Manual (Tab 4) ---
const isErpPayloadDialogOpen = ref(false)
const erpTarget = ref<(typeof reconciliationLogs.value)[number] | null>(null)

const openErpPayloadModal = (item: (typeof reconciliationLogs.value)[number]) => {
  erpTarget.value = item
  isErpPayloadDialogOpen.value = true
}

const postToErp = () => {
  if (erpTarget.value) {
    erpTarget.value.approvalStatus = 'Approved'
    erpTarget.value.erpJournalRef = `ERP-JRN-202608-${Math.floor(100 + Math.random() * 900)}`
    showToast(`Jurnal ${erpTarget.value.id} berhasil di-posted ke sistem ERP!`, 'success')
  }
  isErpPayloadDialogOpen.value = false
}

// --- Row Direct Approval Action ---
const handleApproveAndSync = (item: (typeof reconciliationLogs.value)[number]) => {
  item.approvalStatus = 'Approved'
  item.erpJournalRef = `ERP-JRN-202608-${Math.floor(100 + Math.random() * 900)}`
  showToast(`Rekonsiliasi ${item.id} berhasil disetujui & dikirim ke ERP!`, 'success')
}

const reviewFlaggedRecord = (item: (typeof reconciliationLogs.value)[number]) => {
  selectRecord(item)
  activeTab.value = 0
  showToast(`Membuka detail rekonsiliasi ${item.id}`, 'info')
}
</script>

<template>
  <div class="pa-6 bg-grey-lighten-4 min-vh-100">
    <!-- Breadcrumb -->
    <v-breadcrumbs :items="breadcrumbs" class="px-0 py-1 text-caption" />

    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1 text-grey-darken-3">
          Rekonsiliasi Bahan Bakar & Analisis Variansi
        </h1>
        <p class="text-caption text-grey-darken-1 mb-0">
          Avtur Fuel Management &gt; Cross-Source Fuel Reconciliation & Vendor Billing Verification
        </p>
      </div>

      <div class="d-flex align-center gap-2 flex-wrap">
        <v-btn
          color="success"
          prepend-icon="mdi-plus"
          class="text-none font-weight-bold"
          @click="openNewRecModal"
        >
          Input Rekonsiliasi
        </v-btn>

        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-sync"
          :loading="isSyncing"
          class="text-none font-weight-bold"
          @click="syncAllSensorData"
        >
          Sync Sensor Data
        </v-btn>

        <v-btn
          color="primary"
          prepend-icon="mdi-file-excel-outline"
          class="text-none font-weight-bold"
          @click="exportDataExcel"
        >
          Ekspor CSV / Excel
        </v-btn>
      </div>
    </div>

    <AvturTopNav />

    <!-- Navigation Tabs -->
    <v-card variant="flat" class="border rounded-lg bg-white mb-6">
      <v-tabs v-model="activeTab" color="primary" show-arrows>
        <v-tab
          v-for="(tab, i) in tabs"
          :key="i"
          :value="i"
          class="text-none font-weight-medium"
        >
          <v-icon :icon="tab.icon" size="18" class="mr-2" />
          {{ tab.title }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Metrics Grid -->
    <div class="metrics-grid mb-6">
      <v-card
        v-for="(m, idx) in metrics"
        :key="idx"
        variant="flat"
        class="border rounded-lg pa-4 bg-white h-100 shadow-sm"
      >
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-grey-darken-1">
            {{ m.title }}
          </span>
          <v-avatar :color="m.color" variant="tonal" size="34">
            <v-icon :icon="m.icon" size="18" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">
          {{ m.count }}
        </div>
        <div class="text-caption text-grey-darken-1">
          {{ m.unit }}
        </div>
        <div class="text-caption font-weight-medium mt-1" :class="`text-${m.subColor}`">
          {{ m.sub }}
        </div>
      </v-card>
    </div>

    <!-- ============================================== -->
    <!-- TAB 0 : DASHBOARD -->
    <!-- ============================================== -->
    <template v-if="activeTab === 0">
      <!-- Workflow -->
      <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
        <div class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-3">
          Alur Rekonsiliasi Volume Avtur & Penanganan Selisih
        </div>
        <div class="workflow-grid">
          <template v-for="s in reconciliationSteps" :key="s.step">
            <div class="workflow-card pa-3 border rounded-lg bg-grey-lighten-5">
              <div class="d-flex align-center mb-2">
                <v-avatar :color="s.color" variant="tonal" size="34" class="mr-3">
                  <span class="font-weight-bold text-caption">{{ s.step }}</span>
                </v-avatar>
                <v-icon :icon="s.icon" :color="s.color" size="20" />
              </div>
              <div class="font-weight-bold text-body-2 mb-1">{{ s.title }}</div>
              <div class="text-caption text-medium-emphasis workflow-desc">{{ s.desc }}</div>
            </div>
          </template>
        </div>
      </v-card>

      <!-- Main Table & Detail View -->
      <v-row>
        <v-col cols="12" lg="8">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="d-flex align-center justify-space-between mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Rekonsiliasi Multi-Source
                </div>
                <div class="text-caption text-medium-emphasis">
                  Flowmeter, pengukuran fisik, dan dokumen vendor
                </div>
              </div>
              <v-chip size="small" color="primary" variant="tonal">
                {{ filteredLogs.length }} Data
              </v-chip>
            </div>

            <!-- Filters -->
            <v-row density="compact" class="mb-3">
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="datePeriod"
                  :items="['Agustus 2026', 'Juli 2026', 'Juni 2026']"
                  label="Periode Closing"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="selectedStation"
                  :items="[
                    'Semua Station / Hub',
                    'Wamena Hub (WMX)',
                    'Sentani Hub (DJJ)',
                    'Timika (TIM)',
                    'Airstrip Boven Digoel',
                    'Airstrip Okbibab',
                  ]"
                  label="Station / Hub"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="selectedVendor"
                  :items="[
                    'Semua Vendor',
                    'Pertamina Patra Niaga',
                    'Pemasok Lokal Perintis',
                    'Transfer Internal',
                  ]"
                  label="Pemasok / Source"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="selectedToleranceStatus"
                  :items="['Semua Status Toleransi', 'Pass (Normal)', 'Exceeded Threshold']"
                  label="Status Selisih"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <div class="d-flex gap-2">
                  <v-text-field
                    v-model="searchQuery"
                    placeholder="Cari ID rekonsiliasi / invoice / station / vendor..."
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="flex-grow-1"
                  />
                  <v-btn
                    variant="outlined"
                    color="grey-darken-1"
                    prepend-icon="mdi-filter-off-outline"
                    class="text-none"
                    @click="resetFilters"
                  >
                    Reset
                  </v-btn>
                </div>
              </v-col>
            </v-row>

            <!-- Table -->
            <div class="table-scroll">
              <v-table density="comfortable" class="border rounded">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="font-weight-bold text-caption">ID / Periode</th>
                    <th class="font-weight-bold text-caption">Station & Vendor</th>
                    <th class="font-weight-bold text-caption">Flowmeter</th>
                    <th class="font-weight-bold text-caption">Manual / Fisik</th>
                    <th class="font-weight-bold text-caption">Tagihan Vendor</th>
                    <th class="font-weight-bold text-caption">Variansi</th>
                    <th class="font-weight-bold text-caption">Status</th>
                    <th class="font-weight-bold text-caption text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in paginatedLogs"
                    :key="item.id"
                    class="transaction-row"
                    :class="{ 'bg-blue-lighten-5': selectedRec.id === item.id }"
                    @click="selectRecord(item)"
                  >
                    <td>
                      <div class="font-weight-bold text-body-2">{{ item.id }}</div>
                      <div class="text-caption text-medium-emphasis">{{ item.period }}</div>
                    </td>
                    <td>
                      <div class="font-weight-medium text-body-2">{{ item.station }}</div>
                      <div class="text-caption text-medium-emphasis">{{ item.vendor }}</div>
                    </td>
                    <td class="text-caption font-weight-medium">{{ item.flowmeterVol }}</td>
                    <td class="text-caption font-weight-medium">{{ item.manualDipVol }}</td>
                    <td class="text-caption font-weight-bold">{{ item.vendorInvVol }}</td>
                    <td>
                      <div
                        class="font-weight-bold text-body-2"
                        :class="`text-${getVarianceColor(item.variancePercent)}`"
                      >
                        {{ item.variancePercent }}
                      </div>
                      <div class="text-caption text-medium-emphasis">{{ item.varianceLiters }}</div>
                    </td>
                    <td>
                      <v-chip
                        size="x-small"
                        :color="item.statusColor"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        {{ item.toleranceStatus }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn
                        icon="mdi-eye-outline"
                        variant="text"
                        size="small"
                        color="primary"
                        @click.stop="openDetailModal(item)"
                      />
                      <v-menu location="bottom end">
                        <template #activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon="mdi-dots-vertical"
                            variant="text"
                            size="small"
                            color="grey-darken-1"
                            @click.stop
                          />
                        </template>
                        <v-list density="compact">
                          <v-list-item
                            prepend-icon="mdi-eye-outline"
                            title="Lihat Detail Pop-up"
                            @click="openDetailModal(item)"
                          />
                          <v-list-item
                            prepend-icon="mdi-file-pdf-box"
                            title="Cetak BAS (Pop-up)"
                            @click="openBasModal(item)"
                          />
                          <v-list-item
                            prepend-icon="mdi-check-decagram"
                            title="Approve & Sync ERP"
                            @click="handleApproveAndSync(item)"
                          />
                        </v-list>
                      </v-menu>
                    </td>
                  </tr>
                  <tr v-if="filteredLogs.length === 0">
                    <td colspan="8" class="text-center py-8 text-medium-emphasis">
                      <v-icon icon="mdi-database-search-outline" size="32" class="mb-2" />
                      <div class="text-body-2 font-weight-medium">Tidak ada data rekonsiliasi</div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <!-- Pagination -->
            <div class="d-flex align-center justify-space-between mt-4 flex-wrap gap-2">
              <span class="text-caption text-medium-emphasis">
                Menampilkan {{ paginatedLogs.length }} dari {{ filteredLogs.length }} data rekonsiliasi
              </span>
              <div class="d-flex align-center gap-2">
                <v-pagination v-model="page" :length="totalPages" density="compact" :total-visible="5" />
                <v-select
                  v-model="itemsPerPage"
                  :items="[5, 10, 25, 50]"
                  suffix="/ hlm"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="width: 120px"
                />
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Right Side Detail Card -->
        <v-col cols="12" lg="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white detail-card">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-1 font-weight-bold text-grey-darken-3">
                {{ selectedRec.id }}
              </span>
              <v-chip size="x-small" :color="selectedRec.statusColor" variant="flat" class="font-weight-bold">
                {{ selectedRec.toleranceStatus }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis mb-4">
              Lokasi: <span class="font-weight-bold text-grey-darken-3">{{ selectedRec.station }}</span>
            </div>
            <v-divider class="mb-4" />

            <div class="section-title">
              <v-icon icon="mdi-scale" color="primary" size="18" />
              <span>1. Perbandingan Volume Multi-Source</span>
            </div>
            <div class="detail-box">
              <div class="detail-row">
                <span>Tagihan Vendor</span><strong>{{ selectedRec.vendorInvVol }}</strong>
              </div>
              <div class="detail-row">
                <span>Fisik Diterima</span><strong class="text-primary">{{ selectedRec.manualDipVol }}</strong>
              </div>
              <div class="detail-row">
                <span>Flowmeter</span><strong>{{ selectedRec.flowmeterVol }}</strong>
              </div>
              <div class="detail-row detail-row-border">
                <span>Metode Pengukuran</span><strong class="text-teal">{{ selectedRec.method }}</strong>
              </div>
            </div>

            <div class="section-title">
              <v-icon icon="mdi-calculator-variant" color="warning" size="18" />
              <span>2. Analisis Toleransi Variansi</span>
            </div>
            <div class="detail-box">
              <div class="detail-row">
                <span>Batas Toleransi</span><strong>± 0.50%</strong>
              </div>
              <div class="detail-row">
                <span>Selisih Aktual</span>
                <strong :class="`text-${selectedRec.statusColor}`">{{ selectedRec.varianceLiters }}</strong>
              </div>
              <div class="variance-highlight">
                <div class="text-caption text-medium-emphasis">Persentase Variansi</div>
                <div class="text-h6 font-weight-bold" :class="`text-${selectedRec.statusColor}`">
                  {{ selectedRec.variancePercent }}
                </div>
              </div>
            </div>

            <div class="section-title">
              <v-icon icon="mdi-file-document-edit-outline" color="purple" size="18" />
              <span>3. Dokumen & Investigasi</span>
            </div>
            <div class="detail-box">
              <div class="detail-row">
                <span>No. Invoice</span><strong>{{ selectedRec.invoiceNo }}</strong>
              </div>
              <div class="detail-row">
                <span>No. Surat Jalan</span><strong>{{ selectedRec.deliveryNoteNo }}</strong>
              </div>
              <div class="detail-row">
                <span>Petugas QC</span><strong>{{ selectedRec.investigator }}</strong>
              </div>
              <div class="mt-2 border-t pt-2">
                <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
                  Penyebab Selisih
                </div>
                <div class="note-box">{{ selectedRec.rootCause }}</div>
              </div>
            </div>

            <div class="section-title">
              <v-icon icon="mdi-check-decagram" color="success" size="18" />
              <span>4. Approval & ERP Journal</span>
            </div>
            <div class="detail-box mb-5">
              <div class="detail-row">
                <span>Status Approval</span>
                <v-chip
                  size="x-small"
                  :color="selectedRec.approvalStatus.includes('Approved') ? 'success' : 'warning'"
                  variant="tonal"
                >
                  {{ selectedRec.approvalStatus }}
                </v-chip>
              </div>
              <div class="detail-row">
                <span>No. Jurnal ERP</span><strong>{{ selectedRec.erpJournalRef }}</strong>
              </div>
            </div>

            <v-row density="compact">
              <v-col cols="6">
                <v-btn
                  variant="outlined"
                  color="primary"
                  block
                  prepend-icon="mdi-file-pdf-box"
                  class="text-none font-weight-bold"
                  @click="openBasModal(selectedRec)"
                >
                  Cetak BAS
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn
                  color="primary"
                  block
                  prepend-icon="mdi-check-all"
                  class="text-none font-weight-bold"
                  @click="handleApproveAndSync(selectedRec)"
                >
                  Approve & Sync
                </v-btn>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- ============================================== -->
    <!-- TAB 1 : FLOWMETER VS MANUAL -->
    <!-- ============================================== -->
    <template v-else-if="activeTab === 1">
      <v-card variant="flat" class="border rounded-lg bg-white">
        <div class="pa-5 border-b d-flex align-center justify-space-between flex-wrap gap-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
              Flowmeter Digital vs Pengukuran Manual
            </div>
            <div class="text-caption text-medium-emphasis">
              Validasi pembacaan sensor terhadap hasil pengukuran fisik dipstick.
            </div>
          </div>
          <v-btn color="info" prepend-icon="mdi-tune" class="text-none font-weight-bold" @click="openNewRecModal">
            Input Dipstick Manual
          </v-btn>
        </div>

        <v-row class="pa-5">
          <v-col cols="12" md="4">
            <div class="stat-panel">
              <div class="text-caption text-medium-emphasis">Average Deviation</div>
              <div class="text-h4 font-weight-bold text-info">0.12%</div>
              <v-progress-linear model-value="24" color="info" rounded class="mt-3" />
              <div class="text-caption text-success mt-2">Di bawah batas monitoring 0.50%</div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="stat-panel">
              <div class="text-caption text-medium-emphasis">Sensor Active Status</div>
              <div class="text-h4 font-weight-bold text-success">12 / 12</div>
              <div class="d-flex align-center mt-2">
                <v-icon icon="mdi-check-circle" color="success" size="18" class="mr-1" />
                <span class="text-caption text-success">Semua sensor terpantau online</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="stat-panel">
              <div class="text-caption text-medium-emphasis">Manual Fallback Required</div>
              <div class="text-h4 font-weight-bold text-warning">2 Station</div>
              <div class="text-caption text-warning mt-2">TIM & Airstrip Remote</div>
            </div>
          </v-col>
        </v-row>

        <div class="px-5 pb-5 table-scroll">
          <v-table class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">Station / Hub</th>
                <th class="font-weight-bold text-caption">Flowmeter</th>
                <th class="font-weight-bold text-caption">Manual Dipstick</th>
                <th class="font-weight-bold text-caption">Deviation</th>
                <th class="font-weight-bold text-caption">Status Sensor</th>
                <th class="font-weight-bold text-caption">Tgl Kalibrasi</th>
                <th class="font-weight-bold text-caption text-center">Aksi Kalibrasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reconciliationLogs" :key="item.id">
                <td class="font-weight-medium">{{ item.station }}</td>
                <td>{{ item.flowmeterVol }}</td>
                <td>{{ item.manualDipVol }}</td>
                <td class="font-weight-bold" :class="`text-${getVarianceColor(item.variancePercent)}`">
                  {{ item.variancePercent }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="item.sensorStatus === 'Normal' ? 'success' : 'warning'"
                  >
                    {{ item.sensorStatus }}
                  </v-chip>
                </td>
                <td class="text-caption">{{ item.lastCalibration }}</td>
                <td class="text-center">
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    prepend-icon="mdi-wrench-outline"
                    @click="openCalibrationModal(item)"
                  >
                    Kalibrasi
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>
    </template>

    <!-- ============================================== -->
    <!-- TAB 2 : VENDOR BILLING MATCHING -->
    <!-- ============================================== -->
    <template v-else-if="activeTab === 2">
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
            <div class="text-caption text-medium-emphasis">Invoice Matched</div>
            <div class="text-h4 font-weight-bold text-success mt-1">99.8%</div>
            <v-progress-linear model-value="99.8" color="success" rounded class="my-3" />
            <div class="text-caption">Mayoritas dokumen vendor telah terverifikasi.</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
            <div class="text-caption text-medium-emphasis">Invoice Pending Review</div>
            <div class="text-h4 font-weight-bold text-warning mt-1">3 Document</div>
            <div class="text-caption text-medium-emphasis mt-2">Menunggu pencocokan fisik.</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white h-100">
            <div class="text-caption text-medium-emphasis">Invoice Under Dispute</div>
            <div class="text-h4 font-weight-bold text-error mt-1">2 Document</div>
            <div class="text-caption text-error mt-2">Membutuhkan penyesuaian klaim.</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="flat" class="border rounded-lg bg-white">
        <div class="pa-5 border-b d-flex align-center justify-space-between flex-wrap gap-2">
          <div>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Vendor Billing Matching</div>
            <div class="text-caption text-medium-emphasis">Pencocokan invoice, surat jalan, dan penerimaan fisik.</div>
          </div>
          <v-btn color="primary" prepend-icon="mdi-upload" class="text-none font-weight-bold" @click="openUploadInvoiceModal">
            Upload Tagihan Vendor
          </v-btn>
        </div>

        <div class="pa-5 table-scroll">
          <v-table class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">No Invoice</th>
                <th class="font-weight-bold text-caption">Vendor</th>
                <th class="font-weight-bold text-caption">Station</th>
                <th class="font-weight-bold text-caption">Vol Invoice</th>
                <th class="font-weight-bold text-caption">Vol Fisik</th>
                <th class="font-weight-bold text-caption">Status Dispute</th>
                <th class="font-weight-bold text-caption text-center">Aksi Dispute</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reconciliationLogs" :key="item.id">
                <td class="font-weight-bold">{{ item.invoiceNo }}</td>
                <td>{{ item.vendor }}</td>
                <td>{{ item.station }}</td>
                <td>{{ item.vendorInvVol }}</td>
                <td>{{ item.manualDipVol }}</td>
                <td>
                  <v-chip size="x-small" :color="item.disputeStatus === 'Resolved' ? 'success' : 'error'" variant="tonal">
                    {{ item.disputeStatus }}
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-btn
                    size="small"
                    variant="tonal"
                    :color="item.disputeStatus === 'Resolved' ? 'grey' : 'error'"
                    class="text-none"
                    @click="openDisputeModal(item)"
                  >
                    Resolusi Dispute
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>
    </template>

    <!-- ============================================== -->
    <!-- TAB 3 : TOLERANCE AUDIT -->
    <!-- ============================================== -->
    <template v-else-if="activeTab === 3">
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="text-caption text-medium-emphasis">Dalam Toleransi</div>
            <div class="text-h4 font-weight-bold text-success">{{ matchedInvoiceCount }}</div>
            <div class="text-caption mt-1">Periode terverifikasi</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="text-caption text-medium-emphasis">Exceeded Threshold</div>
            <div class="text-h4 font-weight-bold text-error">{{ flaggedLogs.length }}</div>
            <div class="text-caption text-error mt-1">Membutuhkan investigasi</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="text-caption text-medium-emphasis">Batas Toleransi</div>
            <div class="text-h4 font-weight-bold">±0.50%</div>
            <div class="text-caption mt-1">Threshold monitoring</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="text-caption text-medium-emphasis">Pending Sign-off</div>
            <div class="text-h4 font-weight-bold text-warning">3</div>
            <div class="text-caption text-warning mt-1">Operational Manager</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="flat" class="border rounded-lg bg-white">
        <div class="pa-5 border-b">
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Audit Selisih Melebihi Toleransi</div>
          <div class="text-caption text-medium-emphasis">Daftar rekonsiliasi yang membutuhkan investigasi dan sign-off.</div>
        </div>

        <div class="pa-5">
          <v-alert type="error" variant="tonal" density="comfortable" icon="mdi-alert-rhombus-outline" class="mb-4">
            <template #title>
              <span class="text-subtitle-2 font-weight-bold">{{ flaggedLogs.length }} kasus membutuhkan perhatian</span>
            </template>
            <span class="text-caption">
              Record dengan selisih di atas threshold tidak dapat langsung ditutup sebelum investigasi dan approval selesai.
            </span>
          </v-alert>

          <v-table class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">ID</th>
                <th class="font-weight-bold text-caption">Station</th>
                <th class="font-weight-bold text-caption">Variansi</th>
                <th class="font-weight-bold text-caption">Penyebab / Root Cause</th>
                <th class="font-weight-bold text-caption">Status Approval</th>
                <th class="font-weight-bold text-caption text-center">Aksi Investigasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in flaggedLogs" :key="item.id">
                <td class="font-weight-bold">{{ item.id }}</td>
                <td>{{ item.station }}</td>
                <td>
                  <div class="font-weight-bold text-error">{{ item.variancePercent }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.varianceLiters }}</div>
                </td>
                <td class="text-caption">{{ item.rootCause }}</td>
                <td>
                  <v-chip size="x-small" color="warning" variant="tonal">{{ item.approvalStatus }}</v-chip>
                </td>
                <td class="text-center">
                  <div class="d-flex justify-center gap-1">
                    <v-btn
                      size="small"
                      variant="outlined"
                      color="warning"
                      class="text-none"
                      prepend-icon="mdi-magnify-expand"
                      @click="openInvestigationModal(item)"
                    >
                      Investigasi
                    </v-btn>

                    <v-btn
                      size="small"
                      variant="flat"
                      color="primary"
                      class="text-none"
                      prepend-icon="mdi-file-document-outline"
                      @click="openBasModal(item)"
                    >
                      Form BAS
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table >
        </div>
      </v-card>
    </template>

    <!-- ============================================== -->
    <!-- TAB 4 : ERP JOURNAL -->
    <!-- ============================================== -->
    <template v-else>
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption text-medium-emphasis">Journal Posted</span>
              <v-icon icon="mdi-check-circle" color="success" />
            </div>
            <div class="text-h4 font-weight-bold mt-2">25</div>
            <div class="text-caption text-success">Successfully synchronized</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption text-medium-emphasis">Pending Journal</span>
              <v-icon icon="mdi-clock-alert-outline" color="warning" />
            </div>
            <div class="text-h4 font-weight-bold mt-2">3</div>
            <div class="text-caption text-warning">Waiting manager sign-off</div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="flat" class="border rounded-lg pa-5 bg-white">
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption text-medium-emphasis">Sync Status ERP</span>
              <v-icon icon="mdi-database-check-outline" color="primary" />
            </div>
            <div class="text-h4 font-weight-bold mt-2">Online</div>
            <div class="text-caption text-primary">SAP ERP Connected</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card variant="flat" class="border rounded-lg bg-white">
        <div class="pa-5 border-b">
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Jurnal Rekonsiliasi ERP</div>
          <div class="text-caption text-medium-emphasis">Status pembentukan dan sinkronisasi jurnal penyesuaian stok.</div>
        </div>

        <div class="pa-5 table-scroll">
          <v-table class="border rounded">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold text-caption">Reconciliation ID</th>
                <th class="font-weight-bold text-caption">Station</th>
                <th class="font-weight-bold text-caption">ERP Journal Ref</th>
                <th class="font-weight-bold text-caption">Variansi</th>
                <th class="font-weight-bold text-caption">Approval Status</th>
                <th class="font-weight-bold text-caption text-center">Aksi Jurnal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reconciliationLogs" :key="item.id">
                <td class="font-weight-bold">{{ item.id }}</td>
                <td>{{ item.station }}</td>
                <td class="text-caption font-weight-medium">{{ item.erpJournalRef }}</td>
                <td class="font-weight-bold" :class="`text-${getVarianceColor(item.variancePercent)}`">
                  {{ item.variancePercent }}
                </td>
                <td>
                  <v-chip
                    size="x-small"
                    :color="item.approvalStatus.includes('Approved') ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ item.approvalStatus }}
                  </v-chip>
                </td>
                <td class="text-center">
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="text-none"
                    prepend-icon="mdi-code-json"
                    @click="openErpPayloadModal(item)"
                  >
                    Inspect Payload
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card>
    </template>

    <!-- Bottom Compliance Banner -->
    <v-alert
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-alert-circle-outline"
      class="rounded-lg border border-orange-lighten-3 mt-6"
    >
      <template #title>
        <span class="text-subtitle-2 font-weight-bold">Batas Toleransi Selisih Volume Avtur</span>
      </template>
      <span class="text-caption">
        Selisih volume antara tagihan vendor/surat jalan dan fisik yang diterima ditoleransi maksimum ±0.5%. Apabila selisih melebihi batas toleransi, sistem mewajibkan penerbitan Berita Acara Selisih (BAS) serta konfirmasi dari Operational Manager sebelum jurnal penyesuaian stok diterbitkan ke ERP.
      </span>
    </v-alert>

    <!-- ============================================== -->
    <!-- MODAL POP-UPS AREA (ALL FUNCTIONAL) -->
    <!-- ============================================== -->

    <!-- Modal Pop-up 1: Cetak BAS -->
    <v-dialog v-model="isBasDialogOpen" max-width="600px">
      <v-card v-if="targetBasItem" class="rounded-lg">
        <v-card-title class="bg-primary text-white font-weight-bold text-subtitle-1 pa-4">
          <v-icon icon="mdi-file-document-edit" class="mr-2" /> Preview Berita Acara Selisih (BAS)
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="text-body-2 mb-3"><strong>ID Rekonsiliasi:</strong> {{ targetBasItem.id }}</div>
          <div class="text-body-2 mb-3"><strong>Station / Hub:</strong> {{ targetBasItem.station }}</div>
          <div class="text-body-2 mb-3"><strong>Vendor:</strong> {{ targetBasItem.vendor }}</div>
          <div class="text-body-2 mb-3">
            <strong>Variansi Volume:</strong>
            <span class="text-error font-weight-bold"> {{ targetBasItem.varianceLiters }} ({{ targetBasItem.variancePercent }})</span>
          </div>
          <div class="text-body-2 mb-3"><strong>Petugas QC:</strong> {{ targetBasItem.investigator }}</div>
          <v-divider class="my-3" />
          <div class="text-caption text-medium-emphasis">
            Dokumen ini secara otomatis akan menyertakan data pengujian manual dipstick, flowmeter digital, dan tanda tangan digital penanggung jawab.
          </div>
        </v-card-text>
        <v-card-actions class="justify-end pa-4 bg-grey-lighten-4">
          <v-btn variant="text" @click="isBasDialogOpen = false">Batal</v-btn>
          <v-btn color="primary" prepend-icon="mdi-download" @click="printBasDocument">
            Download & Cetak Dokumen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 2: Detail Rekonsiliasi Pop-up -->
    <v-dialog v-model="isDetailDialogOpen" max-width="700px">
      <v-card class="rounded-lg">
        <v-card-title class="bg-grey-darken-3 text-white font-weight-bold text-subtitle-1 pa-4 d-flex justify-space-between align-center">
          <span>Detail Rekonsiliasi - {{ selectedRec.id }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="isDetailDialogOpen = false" />
        </v-card-title>
        <v-card-text class="pa-5">
          <v-row density="compact">
            <v-col cols="6"><strong>Station:</strong> {{ selectedRec.station }}</v-col>
            <v-col cols="6"><strong>Vendor:</strong> {{ selectedRec.vendor }}</v-col>
            <v-col cols="6"><strong>Vol Invoice:</strong> {{ selectedRec.vendorInvVol }}</v-col>
            <v-col cols="6"><strong>Vol Manual:</strong> {{ selectedRec.manualDipVol }}</v-col>
            <v-col cols="6"><strong>Vol Flowmeter:</strong> {{ selectedRec.flowmeterVol }}</v-col>
            <v-col cols="6"><strong>Variansi:</strong> {{ selectedRec.variancePercent }} ({{ selectedRec.varianceLiters }})</v-col>
            <v-col cols="12" class="mt-2">
              <div class="text-caption font-weight-bold">Penyebab Selisih:</div>
              <div class="bg-grey-lighten-4 pa-3 rounded text-caption mt-1">{{ selectedRec.rootCause }}</div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn color="primary" @click="isDetailDialogOpen = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 3: Form Input Rekonsiliasi Baru -->
    <v-dialog v-model="isNewRecDialogOpen" max-width="650px">
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white font-weight-bold text-subtitle-1 pa-4">
          Form Input Data Rekonsiliasi Baru
        </v-card-title>
        <v-card-text class="pa-5">
          <v-row density="compact">
            <v-col cols="12" md="6">
              <v-select
                v-model="newRecForm.station"
                :items="['Wamena Hub (WMX)', 'Sentani Hub (DJJ)', 'Timika (TIM)', 'Airstrip Boven Digoel', 'Airstrip Okbibab']"
                label="Station / Hub"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="newRecForm.vendor"
                :items="['Pertamina Patra Niaga', 'Pemasok Lokal Perintis', 'Transfer Internal WMX']"
                label="Vendor Pemasok"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="newRecForm.vendorInvVol" label="Vol Tagihan (L)" type="number" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="newRecForm.manualDipVol" label="Vol Dipstick (L)" type="number" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="newRecForm.flowmeterVol" label="Vol Flowmeter (L)" type="number" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="newRecForm.invoiceNo" label="No Invoice Vendor" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="newRecForm.deliveryNoteNo" label="No Surat Jalan" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="newRecForm.rootCause" label="Catatan Selisih / Root Cause" rows="2" variant="outlined" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isNewRecDialogOpen = false">Batal</v-btn>
          <v-btn color="success" prepend-icon="mdi-check" @click="saveNewRec">Simpan & Hitung Variansi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 4: Form Kalibrasi Sensor -->
    <v-dialog v-model="isCalibrationDialogOpen" max-width="500px">
      <v-card class="rounded-lg" v-if="calibrationTarget">
        <v-card-title class="bg-info text-white font-weight-bold text-subtitle-1 pa-4">
          Kalibrasi Sensor Flowmeter Digital
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="text-body-2 mb-2"><strong>Station:</strong> {{ calibrationTarget.station }}</div>
          <div class="text-body-2 mb-4"><strong>Status Terakhir:</strong> {{ calibrationTarget.sensorStatus }}</div>
          <v-textarea v-model="calibrationNotes" label="Catatan Hasil Kalibrasi Metrologi" rows="3" variant="outlined" />
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isCalibrationDialogOpen = false">Batal</v-btn>
          <v-btn color="info" prepend-icon="mdi-wrench" @click="saveCalibration">Konfirmasi Kalibrasi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 5: Upload Invoice Vendor -->
    <v-dialog v-model="isInvoiceUploadDialogOpen" max-width="500px">
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white font-weight-bold text-subtitle-1 pa-4">
          Upload Invoice & Surat Jalan
        </v-card-title>
        <v-card-text class="pa-5">
          <v-file-input v-model="selectedFile" label="Pilih File Invoice (PDF/Excel)" variant="outlined" prepend-icon="mdi-paperclip" />
          <div class="text-caption text-medium-emphasis">
            Sistem OCR akan membaca otomatis Nomor Invoice, Volume Avtur, dan Nilai Tagihan.
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isInvoiceUploadDialogOpen = false">Batal</v-btn>
          <v-btn color="primary" prepend-icon="mdi-cloud-upload" @click="handleInvoiceUpload">Proses & Match</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 6: Form Resolusi Dispute Tagihan Vendor -->
    <v-dialog v-model="isDisputeDialogOpen" max-width="500px">
      <v-card class="rounded-lg" v-if="disputeTarget">
        <v-card-title class="bg-error text-white font-weight-bold text-subtitle-1 pa-4">
          Form Resolusi Dispute Tagihan Vendor
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="text-body-2 mb-2"><strong>No. Invoice:</strong> {{ disputeTarget.invoiceNo }}</div>
          <div class="text-body-2 mb-3"><strong>Variansi Selisih:</strong> {{ disputeTarget.variancePercent }}</div>
          <v-textarea v-model="disputeActionNote" label="Hasil Kesepakatan Dispute dengan Vendor" rows="3" variant="outlined" />
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isDisputeDialogOpen = false">Batal</v-btn>
          <v-btn color="success" prepend-icon="mdi-check-circle" @click="resolveDispute">Selesaikan Dispute</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 7: Form Investigasi Audit -->
    <v-dialog v-model="isInvestigationDialogOpen" max-width="550px">
      <v-card class="rounded-lg" v-if="investigationTarget">
        <v-card-title class="bg-warning text-white font-weight-bold text-subtitle-1 pa-4">
          Investigasi Audit Lapangan - {{ investigationTarget.id }}
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="text-body-2 mb-2"><strong>Station:</strong> {{ investigationTarget.station }}</div>
          <div class="text-body-2 mb-3"><strong>Selisih:</strong> {{ investigationTarget.varianceLiters }} ({{ investigationTarget.variancePercent }})</div>
          <v-textarea v-model="customRootCause" label="Laporan Temuan Hasil Investigasi QC" rows="3" variant="outlined" />
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isInvestigationDialogOpen = false">Batal</v-btn>
          <v-btn color="warning" prepend-icon="mdi-content-save" @click="saveInvestigation">Simpan Hasil Investigasi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Pop-up 8: Inspect Payload JSON & Post ERP -->
    <v-dialog v-model="isErpPayloadDialogOpen" max-width="600px">
      <v-card class="rounded-lg" v-if="erpTarget">
        <v-card-title class="bg-grey-darken-3 text-white font-weight-bold text-subtitle-1 pa-4">
          ERP Integration Payload Inspector
        </v-card-title>
        <v-card-text class="pa-5">
          <div class="text-caption font-weight-bold mb-1">Payload JSON ke SAP ERP:</div>
          <pre class="bg-grey-darken-4 text-green-lighten-3 pa-3 rounded text-caption" style="overflow-x: auto;">
{
  "reconciliation_id": "{{ erpTarget.id }}",
  "station_code": "{{ erpTarget.station }}",
  "vendor": "{{ erpTarget.vendor }}",
  "inventory_adjustment_liters": "{{ erpTarget.varianceLiters }}",
  "journal_reference": "{{ erpTarget.erpJournalRef }}",
  "status": "{{ erpTarget.approvalStatus }}"
}
          </pre>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="isErpPayloadDialogOpen = false">Tutup</v-btn>
          <v-btn color="primary" prepend-icon="mdi-database-sync" @click="postToErp">Post / Resync Ke ERP</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Toast Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Tutup</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}

.shadow-sm {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.workflow-card {
  min-width: 0;
  transition: 0.2s ease;
}

.workflow-card:hover {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgb(var(--v-theme-primary), 0.025) !important;
}

.workflow-desc {
  font-size: 11px;
  line-height: 1.4;
}

.table-scroll {
  overflow-x: auto;
}

.table-scroll :deep(table) {
  min-width: 900px;
}

.transaction-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.transaction-row:hover {
  background: rgb(var(--v-theme-primary), 0.04);
}

.detail-card {
  position: sticky;
  top: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: rgb(55, 65, 81);
  margin-bottom: 8px;
}

.detail-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 18px;
  background: rgb(248, 249, 250);
  border: 1px solid rgb(229, 231, 235);
  border-radius: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 11px;
}

.detail-row > span {
  color: rgb(107, 114, 128);
}

.detail-row > strong {
  text-align: right;
  color: rgb(55, 65, 81);
}

.detail-row-border {
  border-top: 1px solid rgb(229, 231, 235);
  padding-top: 8px;
  margin-top: 2px;
}

.variance-highlight {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  margin-top: 4px;
  background: white;
  border: 1px solid rgb(229, 231, 235);
  border-radius: 7px;
}

.note-box {
  padding: 9px;
  background: white;
  border: 1px solid rgb(229, 231, 235);
  border-radius: 6px;
  color: rgb(55, 65, 81);
  font-size: 11px;
  line-height: 1.45;
}

.stat-panel {
  height: 100%;
  padding: 18px;
  background: rgb(248, 249, 250);
  border: 1px solid rgb(229, 231, 235);
  border-radius: 10px;
}

.border-t {
  border-top: 1px solid rgb(229, 231, 235);
}

.border-b {
  border-bottom: 1px solid rgb(229, 231, 235);
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .workflow-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workflow-grid {
    grid-template-columns: 1fr;
  }
  .detail-card {
    position: static;
  }
}

@media (max-width: 560px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>