<template>
  <!-- 1. HEADER & TABS -->
  <VContainer fluid class="pb-0">
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Hazard Reporting</h1>
      <div class="text-caption text-medium-emphasis">
        Safety Management System (SMS) — Hazard Identification & Tracking
      </div>
    </div>

    <!-- Navigasi Tab -->
    <VTabs v-model="activeTab" color="primary">
      <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
      </VTab>
      <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-bold">
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

    <!-- 2. FILTER TOOLBAR -->
    <VCard border class="pa-3 mb-4 mt-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField v-model="filters.dateRange" label="Date Range" prepend-inner-icon="mdi-calendar-range"
          variant="outlined" density="compact" hide-details style="max-width: 200px" />
        <VSelect v-model="filters.station" label="Station" :items="['All Station', 'Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)']"
          variant="outlined" density="compact" hide-details style="max-width: 150px" />
        <VSelect v-model="filters.source" label="Source" :items="['All Source', 'Flight Crew', 'Maintenance', 'Ground Handling']"
          variant="outlined" density="compact" hide-details style="max-width: 150px" />
        <VSelect v-model="filters.riskLevel" label="Risk Level" :items="['All Risk', 'High', 'Medium', 'Low']"
          variant="outlined" density="compact" hide-details style="max-width: 140px" />

        <VBtn variant="outlined" density="compact" class="text-none" @click="handleMoreFilters">
          <VIcon icon="mdi-filter-variant" class="mr-1" /> More Filters
        </VBtn>

        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" @click="handleRefresh"
          class="text-none">Refresh</VBtn>
        <VBtn color="primary" density="compact" prepend-icon="mdi-plus" class="text-none ml-2" @click="openNewReportDialog(false)">
          New Hazard Report
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- 3. KONTEN UTAMA -->
  <VContainer fluid class="pt-0">
    <!-- KPI Row -->
    <VRow class="mb-4">
      <VCol v-for="(kpi, i) in reportingKpis" :key="i" cols="12" sm="6" md="4" lg="2">
        <SmsKpiCard v-bind="kpi" />
      </VCol>
    </VRow>

    <!-- Analytics & Matrix Row -->
    <VRow class="mb-4 align-stretch">
      <VCol cols="12" md="6" lg="3">
        <SmsTrendChart title="Hazard Trend (12 Months)" v-bind="hazardTrend" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsDonutSummary title="Hazard by Risk Level" v-bind="hazardByRiskLevel" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <!-- 5x5 Risk Matrix Section -->
        <VCard border class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-4">Risk Matrix (5x5)</div>
          <div class="risk-matrix-container">
            <div v-for="row in 5" :key="row" class="d-flex ga-1 mb-1">
              <div v-for="col in 5" :key="col" :class="getMatrixColor(6 - row, col)" class="matrix-cell">
                {{ getMatrixValue(6 - row, col) }}
              </div>
            </div>
            <div class="d-flex justify-space-between mt-2 text-caption text-medium-emphasis">
              <span>Likelihood →</span>
            </div>
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsMetricBarList title="Hazard by Source" v-bind="hazardBySource" class="h-100" />
      </VCol>
    </VRow>

    <!-- Table Section -->
    <VRow>
      <VCol cols="12" lg="9">
        <VCard border>
          <div class="d-flex align-center pa-3 border-b overflow-x-auto">
            <VChipGroup v-model="tableFilter" selected-class="text-primary" mandatory density="compact">
              <VChip value="all" variant="outlined">
                All Reports
                <VBadge color="primary" :content="reportsList.length" inline class="ml-1" />
              </VChip>
              <VChip value="open" variant="outlined">
                Open
                <VBadge color="info" :content="countByStatus('Open')" inline class="ml-1" />
              </VChip>
              <VChip value="action" variant="outlined" class="text-error">
                Action Required
                <VBadge color="error" :content="countByStatus('Action Required')" inline class="ml-1" />
              </VChip>
              <VChip value="closed" variant="outlined" class="text-success">
                Closed
                <VBadge color="success" :content="countByStatus('Closed')" inline class="ml-1" />
              </VChip>
            </VChipGroup>
          </div>

          <VTable density="compact" hover>
            <thead>
              <tr>
                <th class="font-weight-bold">ID</th>
                <th class="font-weight-bold">Date</th>
                <th class="font-weight-bold">Subject</th>
                <th class="font-weight-bold">Station</th>
                <th class="font-weight-bold">Risk</th>
                <th class="font-weight-bold">Status</th>
                <th class="font-weight-bold">Reporter</th>
                <th class="font-weight-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedReports" :key="item.id" style="cursor: pointer" @click="openDetail(item)">
                <td class="text-caption font-weight-bold">{{ item.id }}</td>
                <td class="text-caption">{{ item.datetime }}</td>
                <td class="text-caption font-weight-bold" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ item.subject }}
                </td>
                <td class="text-caption">{{ item.station }}</td>
                <td>
                  <VChip :color="riskColor(item.risk)" size="x-small" variant="tonal" class="font-weight-bold">
                    {{ item.risk }}
                  </VChip>
                </td>
                <td>
                  <VChip :color="statusColor(item.status)" size="x-small" variant="flat" :class="item.status === 'Closed' ? 'text-white' : ''">
                    {{ item.status }}
                  </VChip>
                </td>
                <td class="text-caption">{{ item.reporter }}</td>
                <td>
                  <VBtn icon="mdi-eye-outline" variant="text" density="compact" color="primary" @click.stop="openDetail(item)" />
                </td>
              </tr>
              <tr v-if="paginatedReports.length === 0">
                <td colspan="8" class="text-center text-medium-emphasis py-4">Tidak ada laporan yang sesuai dengan filter.</td>
              </tr>
            </tbody>
          </VTable>

          <div class="pa-3 border-t d-flex align-center">
            <span class="text-caption text-medium-emphasis">Page {{ page }} of {{ maxPages }}</span>
            <VSpacer />
            <VPagination v-model="page" :length="maxPages" density="compact" />
          </div>
        </VCard>
      </VCol>

      <!-- Culture & Sidebar Actions -->
      <VCol cols="12" lg="3">
        <VCard border class="pa-4 mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-4">Quick Actions</div>
          <VBtn block color="primary" variant="tonal" prepend-icon="mdi-incognito" class="text-none mb-2" @click="openNewReportDialog(true)">
            Confidential Report
          </VBtn>
          <VBtn block variant="outlined" prepend-icon="mdi-file-download-outline" class="text-none" @click="downloadReportForm">
            Download Report Form
          </VBtn>
        </VCard>

        <VCard border class="pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-2">Reporting Culture</div>
          <div class="text-h4 font-weight-bold">3.2</div>
          <div class="text-caption text-medium-emphasis">reports / 1,000 flight hours</div>
          <VDivider class="my-3" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption">Anonymous Reports</span>
            <span class="font-weight-bold text-success">19%</span>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>

  <!-- DIALOGS -->
  <VDialog v-model="isReportDialogOpen" max-width="600px">
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
        <span>{{ newReport.isConfidential ? 'Confidential Hazard Report' : 'New Hazard Report' }}</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isReportDialogOpen = false" />
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm @submit.prevent="saveReport">
          <VRow>
            <VCol cols="12">
              <VTextField v-model="newReport.subject" label="Subject / Hazard Title" variant="outlined" density="compact" required placeholder="Contoh: Loose FOD at runway threshold" />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.station" label="Station" :items="['Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)', 'Timika (TIM)']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.source" label="Source Category" :items="['Flight Crew', 'Maintenance', 'Ground Handling', 'ATC', 'Safety Audit']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReport.risk" label="Risk Level" :items="['Low', 'Medium', 'High']" variant="outlined" density="compact" required />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField v-model="newReport.reporter" label="Reporter Name" variant="outlined" density="compact" :disabled="newReport.isConfidential" placeholder="Anonymous jika rahasia" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="newReport.description" label="Hazard Details & Description" variant="outlined" density="compact" rows="3" placeholder="Jelaskan secara rinci potensi bahaya yang ditemukan..." />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4 pt-0 d-flex justify-end ga-2">
        <VBtn variant="outlined" color="secondary" @click="isReportDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" variant="elevated" @click="saveReport">Submit Report</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="isDetailDialogOpen" max-width="550px">
    <VCard v-if="selectedReport">
      <VCardTitle class="bg-grey-lighten-4 pa-4 border-b d-flex justify-space-between align-center">
        <span class="font-weight-bold">Report: {{ selectedReport.id }}</span>
        <VChip :color="riskColor(selectedReport.risk)" size="small" class="font-weight-bold">
          {{ selectedReport.risk }} Risk
        </VChip>
      </VCardTitle>

      <VCardText class="pa-4">
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis">Judul / Subjek Bahaya</div>
          <div class="font-weight-bold text-body-1">{{ selectedReport.subject }}</div>
        </div>

        <VRow class="mb-2">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Stasiun</div>
            <div class="font-weight-medium">{{ selectedReport.station }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Tanggal & Waktu</div>
            <div class="font-weight-medium">{{ selectedReport.datetime }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Pelapor (Reporter)</div>
            <div class="font-weight-medium">{{ selectedReport.reporter }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Status Laporan</div>
            <VChip size="x-small" :color="statusColor(selectedReport.status)">{{ selectedReport.status }}</VChip>
          </VCol>
        </VRow>

        <div class="mt-3">
          <div class="text-caption text-medium-emphasis">Deskripsi Temuan</div>
          <div class="text-body-2 text-medium-emphasis border pa-3 rounded bg-grey-lighten-5">
            {{ selectedReport.description || 'Temuan bahaya ini memerlukan verifikasi lapangan serta rencana mitigasi lebih lanjut dari tim Safety Management System.' }}
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
const activeTab = ref('hazard');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');
const tableFilter = ref('all');
const page = ref(1);
const itemsPerPage = 5;

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  source: 'All Source',
  riskLevel: 'All Risk'
});

const { hazardTrend, hazardByRiskLevel, hazardBySource } = useSmsMockData();

const reportingKpis = ref([
  {
    title: 'Total Reports (YTD)',
    value: '42',
    icon: 'mdi-clipboard-text-outline',
    color: 'primary',
    trend: { icon: 'mdi-arrow-up-thin', text: '18% vs last year', tone: 'good' }
  },
  { title: 'Open Hazards', value: '12', icon: 'mdi-folder-open-outline', color: 'info' },
  { title: 'High/Critical Risk', value: '2', icon: 'mdi-alert-outline', color: 'error' },
  { title: 'Investigation', value: '5', icon: 'mdi-magnify', color: 'deep-purple' },
  { title: 'Anonymous', value: '8', icon: 'mdi-incognito', color: 'success' },
  {
    title: 'Avg Closure',
    value: '14.6',
    icon: 'mdi-clock-outline',
    color: 'warning',
    target: 'days'
  }
]);

const reportsList = ref([
  {
    id: 'HZD-041',
    datetime: '21 Aug 09:15',
    subject: 'Airstrip drainage inadequate',
    station: 'Wamena (WMX)',
    source: 'Maintenance',
    risk: 'High',
    status: 'Action Required',
    reporter: 'Anonymous',
    description: 'Saluran air di sekitar area landasan tersumbat material lumpur dan bebatuan kecil.'
  },
  {
    id: 'HZD-040',
    datetime: '20 Aug 14:32',
    subject: 'Fuel handling procedure gap',
    station: 'Dekai (DKI)',
    source: 'Ground Handling',
    risk: 'High',
    status: 'Investigation',
    reporter: 'J. Pattiasina',
    description: 'Prosedur pengisian bahan bakar tidak menyertakan kabel grounding yang terpasang sempurna.'
  },
  {
    id: 'HZD-039',
    datetime: '20 Aug 10:05',
    subject: 'Loose FOD at parking area',
    station: 'Sentani (DJJ)',
    source: 'Flight Crew',
    risk: 'Medium',
    status: 'Open',
    reporter: 'M. Irwanto',
    description: 'Baut-baut bekas pengerjaan perbaikan apron ditemukan berserakan di dekat parking stand #3.'
  },
  {
    id: 'HZD-038',
    datetime: '19 Aug 16:20',
    subject: 'Uncalibrated Torque Wrench in Hangar',
    station: 'Sentani (DJJ)',
    source: 'Maintenance',
    risk: 'Low',
    status: 'Closed',
    reporter: 'R. Hidayat',
    description: 'Kunci torsi telah melewati jadwal kalibrasi tahunan dan langsung ditarik dari area kerja.'
  }
]);

const isReportDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const selectedReport = ref<any>(null);

const newReport = reactive({
  subject: '',
  station: 'Sentani (DJJ)',
  source: 'Flight Crew',
  risk: 'Medium',
  reporter: '',
  description: '',
  isConfidential: false
});

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
});

const filteredReports = computed(() => {
  return reportsList.value.filter(item => {
    if (tableFilter.value === 'open' && item.status !== 'Open') return false;
    if (tableFilter.value === 'action' && item.status !== 'Action Required') return false;
    if (tableFilter.value === 'closed' && item.status !== 'Closed') return false;

    if (filters.station !== 'All Station' && !item.station.includes(filters.station.split(' ')[0])) return false;
    if (filters.source !== 'All Source' && item.source !== filters.source) return false;
    if (filters.riskLevel !== 'All Risk' && item.risk !== filters.riskLevel) return false;

    return true;
  });
});

const maxPages = computed(() => Math.max(1, Math.ceil(filteredReports.value.length / itemsPerPage)));

const paginatedReports = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredReports.value.slice(start, start + itemsPerPage);
});

const countByStatus = (statusName: string) => {
  return reportsList.value.filter(r => r.status === statusName).length;
};

const handleRefresh = () => {
  lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
  snackbar.text = 'Data Hazard Reporting berhasil diperbarui!';
  snackbar.color = 'info';
  snackbar.show = true;
};

const handleMoreFilters = () => {
  snackbar.text = 'Filter lanjutan diaktifkan!';
  snackbar.color = 'primary';
  snackbar.show = true;
};

const openNewReportDialog = (confidential = false) => {
  newReport.subject = '';
  newReport.description = '';
  newReport.isConfidential = confidential;
  newReport.reporter = confidential ? 'Anonymous' : '';
  isReportDialogOpen.value = true;
};

const saveReport = () => {
  if (!newReport.subject) {
    snackbar.text = 'Mohon isi subjek laporan bahaya!';
    snackbar.color = 'error';
    snackbar.show = true;
    return;
  }

  const createdItem = {
    id: `HZD-0${Math.floor(42 + Math.random() * 50)}`,
    datetime: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    subject: newReport.subject,
    station: newReport.station,
    source: newReport.source,
    risk: newReport.risk,
    status: 'Open',
    reporter: newReport.isConfidential ? 'Anonymous' : (newReport.reporter || 'Operator SMS'),
    description: newReport.description
  };

  reportsList.value.unshift(createdItem);
  
  const totalKpi = reportingKpis.value.find(k => k.title.includes('Total Reports'));
  if (totalKpi) totalKpi.value = String(parseInt(totalKpi.value) + 1);

  isReportDialogOpen.value = false;
  snackbar.text = `Laporan bahaya (${createdItem.id}) berhasil ditambahkan!`;
  snackbar.color = 'success';
  snackbar.show = true;
};

const openDetail = (item: any) => {
  selectedReport.value = item;
  isDetailDialogOpen.value = true;
};

// MODIFIKASI: Fungsi untuk generate dan mengunduh berkas template formulir
const downloadReportForm = () => {
  const formTemplateText = `=================================================================
                  HAZARD REPORTING INPUT FORM
                 Safety Management System (SMS)
=================================================================

1. GENERAL INFORMATION
-----------------------------------------------------------------
Date & Time       : _____________________________________________
Station / Location: [ ] DJJ  [ ] WMX  [ ] DKI  [ ] Other: _______
Source / Dept     : [ ] Flight Crew  [ ] Maintenance  [ ] Ground Ops

2. HAZARD DETAILS
-----------------------------------------------------------------
Subject / Title   : _____________________________________________
Risk Level Assessment:
  [ ] LOW        (Acceptable, no immediate action needed)
  [ ] MEDIUM     (Review required, monitor status)
  [ ] HIGH       (Critical action required immediately)

Detailed Description:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

3. REPORTER DETAILS (OPTIONAL)
-----------------------------------------------------------------
Reporter Name     : _____________________________________________
Contact Number    : _____________________________________________
Check if Anonymous: [ ] (Keep identity strictly confidential)

=================================================================
Please submit completed paper forms to SMS Safety Officer.
=================================================================`;

  const blob = new Blob([formTemplateText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Hazard_Report_Form_Template.txt');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  snackbar.text = 'Formulir Hazard Report (Template) berhasil diunduh!';
  snackbar.color = 'success';
  snackbar.show = true;
};

const riskColor = (l: string) => ({ Low: 'success', Medium: 'warning', High: 'error' })[l] || 'grey';
const statusColor = (s: string) => ({ Open: 'info', Investigation: 'deep-purple', Closed: 'success', 'Action Required': 'error' })[s] || 'grey';

const getMatrixColor = (s: number, l: number) => {
  if (s * l >= 15) return 'bg-error text-white';
  if (s * l >= 8) return 'bg-warning';
  return 'bg-success text-white';
};
const getMatrixValue = (s: number, l: number) => (s + l > 6 ? '1' : '0');
</script>

<style scoped>
.h-100 {
  height: 100% !important;
}

.matrix-cell {
  flex: 1;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  border-radius: 2px;
}
</style>