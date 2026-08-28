<template>
  <!-- 1. HEADER & TABS (Konsisten dengan Dashboard & Frat) -->
  <VContainer fluid class="pb-0">
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Hazard Reporting</h1>
      <div class="text-caption text-medium-emphasis">
        Safety Management System (SMS) — Hazard Identification & Tracking
      </div>
    </div>

    <!-- Navigasi Tab: Identik dengan halaman SMS lainnya -->
    <VTabs v-model="activeTab" color="primary">
      <VTab
        value="overview"
        to="/sms/Dashboard"
        class="text-none font-weight-medium text-medium-emphasis"
      >
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
      <VTab
        value="emergency"
        to="/sms/EmergencyResponse"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency & Response
      </VTab>
      <VTab
        value="assurance"
        to="/sms/SafetyAssurance"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
      </VTab>
      <VTab
        value="spi"
        to="/sms/SpiAnalytics"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
      </VTab>
      <VTab
        value="communication"
        to="/sms/Communication"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
    </VTabs>

    <!-- 2. FILTER TOOLBAR -->
    <VCard border class="pa-3 mb-4 mt-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField
          v-model="filters.dateRange"
          label="Date Range"
          prepend-inner-icon="mdi-calendar-range"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="filters.station"
          label="Station"
          :items="['All Station', 'Sentani (DJJ)', 'Wamena (WMX)']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <VSelect
          v-model="filters.source"
          label="Source"
          :items="['All Source', 'Flight Crew', 'Maintenance']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <VSelect
          v-model="filters.riskLevel"
          label="Risk Level"
          :items="['All Risk', 'High', 'Medium', 'Low']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />

        <VBtn variant="outlined" density="compact" class="text-none">
          <VIcon icon="mdi-filter-variant" class="mr-1" /> More Filters
        </VBtn>

        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          class="text-none"
          @click="handleRefresh"
        >
          Refresh
        </VBtn>
        <VBtn color="primary" density="compact" prepend-icon="mdi-plus" class="text-none ml-2">
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
            <!-- Row 5-1 -->
            <div v-for="row in 5" :key="row" class="d-flex ga-1 mb-1">
              <div
                v-for="col in 5"
                :key="col"
                :class="getMatrixColor(6 - row, col)"
                class="matrix-cell"
              >
                {{ getMatrixValue(6 - row, col) }}
              </div>
            </div>
            <!-- X-Axis Label -->
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
            <VChipGroup
              v-model="tableFilter"
              selected-class="text-primary"
              mandatory
              density="compact"
            >
              <VChip value="all" variant="outlined">
                All Reports <VBadge color="primary" content="42" inline class="ml-1" />
              </VChip>
              <VChip value="open" variant="outlined">
                Open <VBadge color="info" content="12" inline class="ml-1" />
              </VChip>
              <VChip value="action" variant="outlined" class="text-error">
                Action Required <VBadge color="error" content="3" inline class="ml-1" />
              </VChip>
              <VChip value="closed" variant="outlined" class="text-success">
                Closed <VBadge color="success" content="22" inline class="ml-1" />
              </VChip>
            </VChipGroup>
          </div>

          <VTable density="compact">
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
              <tr v-for="item in reportsTable" :key="item.id">
                <td class="text-caption font-weight-bold">{{ item.id }}</td>
                <td class="text-caption">{{ item.datetime }}</td>
                <td
                  class="text-caption font-weight-bold"
                  style="
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                >
                  {{ item.subject }}
                </td>
                <td class="text-caption">{{ item.station }}</td>
                <td>
                  <VChip
                    :color="riskColor(item.risk)"
                    size="x-small"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    {{ item.risk }}
                  </VChip>
                </td>
                <td>
                  <VChip
                    :color="statusColor(item.status)"
                    size="x-small"
                    variant="flat"
                    :class="item.status === 'Closed' ? 'text-white' : ''"
                  >
                    {{ item.status }}
                  </VChip>
                </td>
                <td class="text-caption">{{ item.reporter }}</td>
                <td>
                  <VBtn icon="mdi-eye-outline" variant="text" density="compact" />
                </td>
              </tr>
            </tbody>
          </VTable>
          <div class="pa-3 border-t d-flex align-center">
            <span class="text-caption text-medium-emphasis">Page {{ page }} of 5</span>
            <VSpacer />
            <VPagination v-model="page" :length="5" density="compact" />
          </div>
        </VCard>
      </VCol>

      <!-- Culture & Sidebar Actions -->
      <VCol cols="12" lg="3">
        <VCard border class="pa-4 mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-4">Quick Actions</div>
          <VBtn
            block
            color="primary"
            variant="tonal"
            prepend-icon="mdi-incognito"
            class="text-none mb-2"
          >
            Confidential Report
          </VBtn>
          <VBtn block variant="outlined" prepend-icon="mdi-file-download-outline" class="text-none">
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
</template>

<script setup lang="ts">
// Logic & State
const activeTab = ref('hazard');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');
const tableFilter = ref('all');
const page = ref(1);

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  source: 'All Source',
  riskLevel: 'All Risk Level',
  status: 'All Status'
});

// Data dari composable
const { hazardTrend, hazardByRiskLevel, hazardBySource } = useSmsMockData();

const reportingKpis = [
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
];

const reportsTable = [
  {
    id: 'HZD-041',
    datetime: '21 Aug 09:15',
    subject: 'Airstrip drainage inadequate',
    station: 'Wamena (WMX)',
    risk: 'High',
    status: 'Action Required',
    reporter: 'Anonymous'
  },
  {
    id: 'HZD-040',
    datetime: '20 Aug 14:32',
    subject: 'Fuel handling procedure gap',
    station: 'Dekai (DKI)',
    risk: 'High',
    status: 'Investigation',
    reporter: 'J. Pattiasina'
  },
  {
    id: 'HZD-039',
    datetime: '20 Aug 10:05',
    subject: 'Loose FOD at parking area',
    station: 'Sentani (DJJ)',
    risk: 'Medium',
    status: 'Open',
    reporter: 'M. Irwanto'
  }
];

// Helper Functions
const handleRefresh = () => {
  lastUpdated.value = new Date().toLocaleTimeString();
};
const riskColor = (l: string) =>
  ({ Low: 'success', Medium: 'warning', High: 'error' })[l] || 'grey';
const statusColor = (s: string) =>
  ({ Open: 'info', Investigation: 'deep-purple', Closed: 'success', 'Action Required': 'error' })[
    s
  ] || 'grey';

// Matrix Helpers (Dummy logic untuk visual)
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
