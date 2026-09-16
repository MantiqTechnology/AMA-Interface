<template>
  <!-- Header & Navigasi -->
  <VContainer fluid class="pb-0">
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <h1 class="text-h5 font-weight-bold">Safety Performance Dashboard</h1>
        <div class="text-caption text-medium-emphasis">Safety Management System (SMS) Overview</div>
      </div>

      <!-- Tombol Aksi Utama: Tambah Laporan Baru -->
      <VBtn color="primary" prepend-icon="mdi-plus" class="text-none font-weight-bold" @click="openNewReportDialog">
        Entry Laporan Bahaya (Dummy)
      </VBtn>
    </div>

    <!-- VTabs Navigasi Utama -->
    <VTabs v-model="activeTab" color="primary">
      <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-bold">
        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
      </VTab>
      <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
      </VTab>
      <VTab value="frat" to="/sms/Frat" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> Flight Risk (FRAT)
      </VTab>
      <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-clipboard-check-outline" size="18" class="mr-2" /> CAPA
      </VTab>
      <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency & Response
      </VTab>
      <VTab value="assurance" to="/sms/SafetyAssurance" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
      </VTab>
      <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
      </VTab>
      <VTab value="communication" to="/sms/Communication" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
      <VTab value="regulatory" to="/sms/Regulatory" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-gavel" size="18" class="mr-2" /> Regulatory
      </VTab>
      <VTab value="governance" to="/sms/SafetyTraining" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-school-outline" size="18" class="mr-2" /> Governance
      </VTab>
    </VTabs>

    <!-- Toolbar Filter -->
    <VCard border class="pa-3 mb-4 mt-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField v-model="filters.dateRange" label="Date" prepend-inner-icon="mdi-calendar-range" variant="outlined"
          density="compact" hide-details style="max-width: 200px" />
        <VSelect v-model="filters.station" label="Station" :items="stationOptions" variant="outlined" density="compact"
          hide-details style="max-width: 160px" />
        <VSelect v-model="filters.aircraft" label="Aircraft" :items="aircraftOptions" variant="outlined"
          density="compact" hide-details style="max-width: 160px" />
        <VSelect v-model="filters.riskLevel" label="Risk Level" :items="riskOptions" variant="outlined"
          density="compact" hide-details style="max-width: 160px" />

        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" @click="handleRefresh"
          class="text-none">Refresh Data</VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Konten Utama Dashboard -->
  <VContainer fluid class="pt-0">
    <!-- Row 1: KPI Cards -->
    <VRow class="mb-4">
      <VCol v-for="(kpi, i) in kpiList" :key="i" cols="12" sm="6" md="3" xl="auto" style="flex: 1 1 0%">
        <SmsKpiCard v-bind="kpi" />
      </VCol>
    </VRow>

    <!-- Row 2: Charts -->
    <VRow class="mb-4 align-stretch">
      <VCol cols="12" md="6" lg="3">
        <SmsTrendChart title="Hazard Trend" v-bind="hazardTrend" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsDonutSummary title="Risk Level" v-bind="hazardByRiskLevel" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsMetricBarList title="Hazard Source" v-bind="hazardBySource" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsMetricBarList title="Top Stations" v-bind="hazardByStation" class="h-100" />
      </VCol>
    </VRow>

    <!-- Row 3: SMS Modules Summary -->
    <VRow class="mb-4 align-stretch">
      <VCol cols="12" md="6" lg="3">
        <SmsDonutSummary title="FRAT Summary" v-bind="fratSummary" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsDonutSummary title="CAPA Status" v-bind="capaStatus" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsMetricBarList title="CAPA Aging" v-bind="capaAging" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsMetricBarList title="SPI Indicators" v-bind="spiIndicators" class="h-100" />
      </VCol>
    </VRow>

    <!-- Row 4: Findings Table -->
    <VRow>
      <VCol cols="12">
        <SmsFindingsTable
          :items="findingsList"
          @click:row="handleRowClick"
          @click:view-all="openViewAllDialog"
        >
          <template #actions>
            <VBtn
              variant="tonal"
              color="primary"
              density="compact"
              prepend-icon="mdi-plus"
              class="text-none"
              @click="openNewReportDialog"
            >
              Tambah Finding
            </VBtn>
          </template>
        </SmsFindingsTable>
      </VCol>
    </VRow>
  </VContainer>

  <!-- ==================== DIALOG / POPUPS ==================== -->

  <!-- 1. POPUP FORM ENTRY DUMMY REPORT -->
  <VDialog v-model="isReportDialogOpen" max-width="600px">
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
        <span>Entry Laporan Bahaya Baru (Dummy)</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isReportDialogOpen = false" />
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm ref="reportFormRef" @submit.prevent="saveDummyReport">
          <VRow>
            <VCol cols="12">
              <VTextField v-model="newReport.title" label="Judul Laporan / Temuan Bahaya" variant="outlined" density="compact" required placeholder="Contoh: Oil Leak pada Engine #2 PK-ABC" />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.station" label="Stasiun Bandara" :items="['CGK - Jakarta', 'SUB - Surabaya', 'DPS - Bali', 'TIM - Timika', 'KNO - Medan']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.source" label="Sumber Laporan" :items="['Voluntary Report', 'Mandatory Report', 'Internal Audit', 'Flight Data Monitoring']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.riskLevel" label="Tingkat Risiko" :items="['Low', 'Medium', 'High', 'Extreme']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField v-model="newReport.reporter" label="Pelapor / Reporter" variant="outlined" density="compact" placeholder="Contoh: Capt. Budi / Eng. John" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="newReport.description" label="Deskripsi Kejadian / Bahaya" variant="outlined" density="compact" rows="3" placeholder="Jelaskan detail temuan bahaya..." />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4 pt-0 d-flex justify-end ga-2">
        <VBtn variant="outlined" color="secondary" @click="isReportDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" variant="elevated" @click="saveDummyReport">Simpan Laporan Dummy</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 2. POPUP VIEW ALL REPORTS -->
  <VDialog v-model="isViewAllDialogOpen" max-width="800px">
    <VCard>
      <VCardTitle class="pa-4 border-b d-flex justify-space-between align-center">
        <span>Daftar Seluruh Laporan Keselamatan ({{ findingsList.length }})</span>
        <VBtn icon="mdi-close" variant="text" density="compact" @click="isViewAllDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-0">
        <VTable hover density="compact">
          <thead>
            <tr>
              <th class="text-left">ID</th>
              <th class="text-left">Judul Temuan</th>
              <th class="text-left">Stasiun</th>
              <th class="text-left">Risiko</th>
              <th class="text-left">Tanggal / Due Date</th>
              <th class="text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in findingsList" :key="item.id">
              <td class="font-weight-bold text-caption">{{ item.id }}</td>
              <td>{{ item.finding || item.title }}</td>
              <td>{{ item.station }}</td>
              <td>
                <VChip :color="getRiskColor(item.riskLevel)" size="x-small" class="font-weight-bold">
                  {{ item.riskLevel }}
                </VChip>
              </td>
              <td class="text-caption">{{ item.date || item.dueDate }}</td>
              <td>
                <VBtn size="x-small" color="primary" variant="text" @click="openDetail(item)">Detail</VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn color="secondary" variant="outlined" @click="isViewAllDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 3. POPUP DETAIL FINDING -->
  <VDialog v-model="isDetailDialogOpen" max-width="500px">
    <VCard v-if="selectedFinding">
      <VCardTitle class="bg-grey-lighten-4 pa-4 border-b d-flex justify-space-between align-center">
        <span class="font-weight-bold">Detail Report: {{ selectedFinding.id }}</span>
        <VChip :color="getRiskColor(selectedFinding.riskLevel)" size="small" class="font-weight-bold">
          {{ selectedFinding.riskLevel }}
        </VChip>
      </VCardTitle>
      <VCardText class="pa-4">
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis">Judul Temuan</div>
          <div class="font-weight-bold text-body-1">{{ selectedFinding.finding || selectedFinding.title }}</div>
        </div>
        <VRow class="mb-2">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Stasiun</div>
            <div class="font-weight-medium">{{ selectedFinding.station }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Sumber</div>
            <div class="font-weight-medium">{{ selectedFinding.source || 'Voluntary Report' }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Tanggal / Due Date</div>
            <div class="font-weight-medium">{{ selectedFinding.date || selectedFinding.dueDate }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Status</div>
            <VChip size="x-small" color="primary">{{ selectedFinding.status }}</VChip>
          </VCol>
        </VRow>
        <div class="mt-2">
          <div class="text-caption text-medium-emphasis">Deskripsi Ringkas</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ selectedFinding.description || 'Laporan ini telah ditindaklanjuti oleh tim Safety Officer dan sedang dalam tahap mitigasi risiko.' }}
          </div>
        </div>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn color="primary" variant="tonal" @click="isDetailDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- SNACKBAR NOTIFIKASI -->
  <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
    <VIcon icon="mdi-check-circle" class="mr-2" />
    {{ snackbar.text }}
  </VSnackbar>
</template>

<script setup lang="ts">
const activeTab = ref('overview');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');

// Opsi Dropdown Filter
const stationOptions = ['All Station', 'CGK - Jakarta', 'SUB - Surabaya', 'DPS - Bali', 'TIM - Timika'];
const aircraftOptions = ['All Aircraft', 'B737-800', 'A320-200', 'ATR72-600'];
const riskOptions = ['All Risk', 'Low', 'Medium', 'High', 'Extreme'];

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  aircraft: 'All Aircraft',
  riskLevel: 'All Risk'
});

// Mengambil data awal dari mock composable
const mockData = useSmsMockData();

const {
  hazardTrend,
  hazardByRiskLevel,
  hazardBySource,
  hazardByStation,
  fratSummary,
  capaStatus,
  capaAging,
  spiIndicators
} = mockData;

const safeUnwrap = (target: any) => {
  const res = unref(target);
  return Array.isArray(res) ? res : [];
};

const findingsList = ref([...safeUnwrap(mockData.findings)]);
const kpiList = ref([...safeUnwrap(mockData.kpis)]);

// State Modals / Dialogs
const isReportDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const isViewAllDialogOpen = ref(false);
const selectedFinding = ref<any>(null);

// Form data laporan baru
const newReport = reactive({
  title: '',
  station: 'CGK - Jakarta',
  source: 'Voluntary Report',
  riskLevel: 'Medium',
  reporter: '',
  description: ''
});

// Toast / Notification
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
});

// Helper Warna Risk Level
const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': case 'extreme': return 'purple';
    case 'high': case 'high risk': return 'error';
    case 'medium': case 'medium risk': return 'warning';
    case 'low': case 'low risk': return 'success';
    default: return 'grey';
  }
};

// Actions
const handleRefresh = () => {
  lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
  snackbar.text = 'Data dasbor berhasil diperbarui!';
  snackbar.color = 'info';
  snackbar.show = true;
};

const openNewReportDialog = () => {
  newReport.title = '';
  newReport.description = '';
  newReport.reporter = '';
  isReportDialogOpen.value = true;
};

const openViewAllDialog = () => {
  isViewAllDialogOpen.value = true;
};

const saveDummyReport = () => {
  if (!newReport.title) {
    snackbar.text = 'Mohon isi judul temuan!';
    snackbar.color = 'error';
    snackbar.show = true;
    return;
  }

  let mappedRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (newReport.riskLevel === 'Extreme') mappedRisk = 'Critical';
  else if (['Low', 'Medium', 'High'].includes(newReport.riskLevel)) {
    mappedRisk = newReport.riskLevel as 'Low' | 'Medium' | 'High';
  }

  const createdItem = {
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    finding: newReport.title,
    title: newReport.title,
    station: newReport.station,
    priority: 'Medium' as const,
    riskLevel: mappedRisk,
    owner: newReport.reporter || 'Safety Officer',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: 'Open' as const,
    source: newReport.source,
    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    description: newReport.description || 'Laporan bahaya baru dimasukkan melalui simulasi data dummy.'
  };

  findingsList.value.unshift(createdItem);

  if (kpiList.value.length > 0 && kpiList.value[0].value !== undefined) {
    const currentVal = parseInt(String(kpiList.value[0].value)) || 0;
    kpiList.value[0].value = String(currentVal + 1);
  }

  isReportDialogOpen.value = false;
  snackbar.text = `Laporan Dummy (${createdItem.id}) berhasil ditambahkan!`;
  snackbar.color = 'success';
  snackbar.show = true;
};

const openDetail = (item: any) => {
  selectedFinding.value = item;
  isDetailDialogOpen.value = true;
};

const handleRowClick = (item: any) => {
  openDetail(item);
};
</script>

<style scoped>
.h-100 {
  height: 100% !important;
}
</style>