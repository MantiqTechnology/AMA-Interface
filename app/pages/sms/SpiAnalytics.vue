<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">SPI & Analytics</h1>
      <div class="text-caption text-medium-emphasis">
        Safety Performance Indicators & Trend Analysis
      </div>
    </div>

    <!-- Sub-menu Navigation (Sudah disesuaikan dengan PascalCase routing Anda) -->
    <VTabs v-model="activeTab" color="primary">
      <VTab
        value="overview"
        to="/sms/Dashboard"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
      </VTab>
      <VTab
        value="hazard"
        to="/sms/Reporting"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
      </VTab>
      <VTab value="frat" to="/sms/Frat" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> Flight Risk (FRAT)
      </VTab>
      <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-clipboard-check-multiple-outline" size="18" class="mr-2" /> CAPA
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
      <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-bold">
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

    <!-- Toolbar & Filter -->
    <VCard border class="pa-3 mb-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VSelect
          v-model="filters.period"
          label="Reporting Period"
          :items="['Q1 2026', 'Q2 2026', 'Q3 2026', 'YTD 2026', '12-Month Rolling']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="filters.fleet"
          label="Fleet Category"
          :items="['All Fleets', 'Cessna 208B (Caravan)', 'Pilatus PC-6', 'Twin Otter']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 220px"
        />
        <VSpacer />
        <span class="text-caption text-medium-emphasis mr-3">Data Refreshed: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          class="text-none font-weight-bold"
          style="background-color: #f0f4ff; border-color: #d0d9f5"
          @click="handleRefresh"
        >
          Refresh Data
        </VBtn>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-download"
          class="text-none mr-2"
        >
          Export Report
        </VBtn>
        <VBtn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-presentation"
          class="text-none font-weight-bold shadow-lg"
          density="compact"
        >
          SRB PRESENTATION
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- Executive KPI Scorecards -->
      <VCol cols="12" md="3">
        <SmsKpiCard
          title="Total Safety Reports"
          value="142"
          icon="mdi-file-chart-outline"
          color="primary"
          :trend="{ icon: 'mdi-arrow-up', text: '+12% vs Last Qtr' }"
        />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard
          title="Incident Rate / 10k Hrs"
          value="1.8"
          icon="mdi-airplane-alert"
          color="warning"
          target="ALoSP Target: < 2.5"
        />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard
          title="Avg CAPA Closure (Days)"
          value="18"
          icon="mdi-timer-sand"
          color="info"
          :trend="{ icon: 'mdi-arrow-down', text: 'Improved (Target 21)' }"
        />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard
          title="Safety Culture Score"
          value="4.2/5"
          icon="mdi-star-circle"
          color="success"
          target="Based on latest survey"
        />
      </VCol>

      <!-- SPI Tracking Table (The Core of ICAO Annex 19) -->
      <VCol cols="12" md="8">
        <VCard border class="h-100 d-flex flex-column">
          <div
            class="pa-4 pb-2 border-b bg-grey-lighten-5 d-flex justify-space-between align-center"
          >
            <div>
              <div class="text-subtitle-2 font-weight-bold">
                Safety Performance Indicators (SPI) Matrix
              </div>
              <div class="text-caption text-medium-emphasis">
                Tracking against Acceptable Level of Safety Performance (ALoSP)
              </div>
            </div>
            <VIcon icon="mdi-help-circle-outline" color="medium-emphasis" size="small" />
          </div>

          <div class="flex-grow-1 overflow-y-auto pa-0">
            <VTable density="compact" class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-caption font-weight-bold text-uppercase px-4">
                    Performance Indicator
                  </th>
                  <th class="text-caption font-weight-bold text-uppercase text-center px-2">
                    Target
                  </th>
                  <th class="text-caption font-weight-bold text-uppercase text-center px-2">
                    Alert Lvl
                  </th>
                  <th class="text-caption font-weight-bold text-uppercase text-center px-2">
                    Current
                  </th>
                  <th class="text-caption font-weight-bold text-uppercase px-4">Status / Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="spi in spiList" :key="spi.id" class="hover-bg">
                  <td class="px-4 py-3">
                    <div class="text-body-2 font-weight-medium">{{ spi.name }}</div>
                    <div class="text-caption text-medium-emphasis">{{ spi.measure }}</div>
                  </td>
                  <td class="text-center px-2 text-caption font-weight-bold">{{ spi.target }}</td>
                  <td class="text-center px-2 text-caption font-weight-bold text-error">
                    {{ spi.alert }}
                  </td>
                  <td class="text-center px-2">
                    <VChip size="small" :color="spi.color" class="font-weight-bold" variant="flat">
                      {{ spi.current }}
                    </VChip>
                  </td>
                  <td class="px-4">
                    <div class="d-flex align-center">
                      <VProgressLinear
                        :model-value="(spi.currentValue / spi.alertValue) * 100"
                        :color="spi.color"
                        height="6"
                        rounded
                        class="mr-2"
                      />
                      <VIcon :icon="spi.trendIcon" :color="spi.trendColor" size="small" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>
      </VCol>

      <!-- Risk Matrix Heatmap Analytics -->
      <VCol cols="12" md="4">
        <VCard border class="h-100 d-flex flex-column pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-1">Residual Risk Profile</div>
          <div class="text-caption text-medium-emphasis mb-4">
            Distribution of reports by Risk Matrix
          </div>

          <div class="flex-grow-1 d-flex flex-column justify-center align-center">
            <!-- Simulated Risk Matrix Grid -->
            <div class="risk-matrix">
              <!-- Y Axis Label -->
              <div class="axis-label-y text-caption text-medium-emphasis text-center">
                Likelihood (Freq)
              </div>
              <!-- Grid -->
              <div class="grid-container">
                <div
                  v-for="cell in riskGrid"
                  :key="cell.id"
                  class="risk-cell d-flex justify-center align-center font-weight-bold"
                  :class="cell.colorClass"
                >
                  {{ cell.count > 0 ? cell.count : '' }}
                </div>
              </div>
              <!-- X Axis Label -->
              <div class="axis-label-x text-caption text-medium-emphasis text-center mt-2">
                Severity (Impact)
              </div>
            </div>
          </div>

          <div class="d-flex justify-space-between mt-4 px-2">
            <div class="d-flex align-center">
              <VIcon icon="mdi-circle" color="success" size="12" class="mr-1" />
              <span class="text-caption">Low (78)</span>
            </div>
            <div class="d-flex align-center">
              <VIcon icon="mdi-circle" color="warning" size="12" class="mr-1" />
              <span class="text-caption">Med (12)</span>
            </div>
            <div class="d-flex align-center">
              <VIcon icon="mdi-circle" color="error" size="12" class="mr-1" />
              <span class="text-caption">High (2)</span>
            </div>
          </div>
        </VCard>
      </VCol>

      <!-- Incident Breakdown by Category -->
      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-4">Top 5 Hazard/Incident Categories</div>

          <div v-for="item in categoryBreakdown" :key="item.name" class="mb-3">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
              <span class="text-caption font-weight-bold">{{ item.value }} ({{ item.percent }}%)</span>
            </div>
            <VProgressLinear :model-value="item.percent" :color="item.color" height="8" rounded />
          </div>
        </VCard>
      </VCol>

      <!-- FRAT Trend Analytics -->
      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100 bg-blue-grey-lighten-5">
          <div class="d-flex align-center mb-4">
            <VIcon
              icon="mdi-calculator-variant-outline"
              color="blue-grey-darken-2"
              size="large"
              class="mr-3"
            />
            <div>
              <div class="text-subtitle-2 font-weight-bold text-blue-grey-darken-3">
                Pre-Flight Risk (FRAT) Anomalies
              </div>
              <div class="text-caption text-medium-emphasis">
                Flights released with High/Red Risk Score (Overridden)
              </div>
            </div>
          </div>

          <VList density="compact" class="bg-transparent pa-0">
            <VListItem
              v-for="frat in overrideTrends"
              :key="frat.route"
              class="px-2 py-2 mb-2 rounded hover-bg bg-white border"
            >
              <template #prepend>
                <VIcon icon="mdi-alert-octagon" color="error" size="small" class="mr-3" />
              </template>
              <VListItemTitle class="text-body-2 font-weight-bold">{{ frat.route }}</VListItemTitle>
              <VListItemSubtitle class="text-caption mt-1">
                Avg Score: <strong>{{ frat.avgScore }}</strong> | Overrides:
                <strong>{{ frat.count }}x</strong>
              </VListItemSubtitle>
              <template #append>
                <div class="text-caption text-right">
                  <div class="text-medium-emphasis">Main Factor</div>
                  <div class="font-weight-bold text-error">{{ frat.factor }}</div>
                </div>
              </template>
            </VListItem>
          </VList>
          <div class="text-center mt-2">
            <VBtn variant="text" size="small" color="primary" class="text-none">
              Analyze FRAT Data
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Nuxt 3 auto-imports

const activeTab = ref('spi');
const lastUpdated = ref('22 Aug 2026 14:00 WIB');

function handleRefresh() {
  lastUpdated.value =
    new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
}

const filters = reactive({
  period: 'YTD 2026',
  fleet: 'All Fleets'
});

// Data Mock: SPI Matrix (Parameter Wajib ICAO Annex 19)
const spiList = ref([
  {
    id: 'SPI-01',
    name: 'Runway Excursions',
    measure: 'Rate per 10,000 movements',
    target: '0',
    alert: '> 1.0',
    current: '0',
    currentValue: 0,
    alertValue: 1.0,
    color: 'success',
    trendIcon: 'mdi-minus',
    trendColor: 'success'
  },
  {
    id: 'SPI-02',
    name: 'Hard Landings (> 2.0G)',
    measure: 'Rate per 10,000 flight hours',
    target: '< 1.5',
    alert: '> 3.0',
    current: '1.2',
    currentValue: 1.2,
    alertValue: 3.0,
    color: 'success',
    trendIcon: 'mdi-arrow-down-right',
    trendColor: 'success'
  },
  {
    id: 'SPI-03',
    name: 'Bird Strikes (Damaging)',
    measure: 'Rate per 10,000 movements',
    target: '< 2.0',
    alert: '> 5.0',
    current: '3.8',
    currentValue: 3.8,
    alertValue: 5.0,
    color: 'warning',
    trendIcon: 'mdi-arrow-up-right',
    trendColor: 'warning'
  },
  {
    id: 'SPI-04',
    name: 'Unstable Approaches',
    measure: 'Percent of total approaches',
    target: '< 3%',
    alert: '> 5%',
    current: '4.1%',
    currentValue: 4.1,
    alertValue: 5.0,
    color: 'warning',
    trendIcon: 'mdi-minus',
    trendColor: 'warning'
  },
  {
    id: 'SPI-05',
    name: 'Ground Handling Damage',
    measure: 'Incidents per month',
    target: '0',
    alert: '> 2',
    current: '3',
    currentValue: 3,
    alertValue: 2,
    color: 'error',
    trendIcon: 'mdi-arrow-up-bold',
    trendColor: 'error'
  }
]);

// Data Mock: Risk Matrix Heatmap (5x5 grid disederhanakan)
const riskGrid = ref([
  { id: '5A', count: 0, colorClass: 'bg-yellow-lighten-2' },
  { id: '5B', count: 0, colorClass: 'bg-orange-lighten-2' },
  { id: '5C', count: 2, colorClass: 'bg-red-lighten-1 text-white' },
  { id: '4A', count: 5, colorClass: 'bg-light-green-lighten-3' },
  { id: '4B', count: 4, colorClass: 'bg-yellow-lighten-2' },
  { id: '4C', count: 0, colorClass: 'bg-orange-lighten-2' },
  { id: '3A', count: 42, colorClass: 'bg-light-green-lighten-3' },
  { id: '3B', count: 8, colorClass: 'bg-yellow-lighten-2' },
  { id: '3C', count: 0, colorClass: 'bg-orange-lighten-2' },
  { id: '2A', count: 21, colorClass: 'bg-green-lighten-2' },
  { id: '2B', count: 0, colorClass: 'bg-light-green-lighten-3' },
  { id: '2C', count: 0, colorClass: 'bg-yellow-lighten-2' },
  { id: '1A', count: 10, colorClass: 'bg-green-lighten-2' },
  { id: '1B', count: 0, colorClass: 'bg-green-lighten-2' },
  { id: '1C', count: 0, colorClass: 'bg-light-green-lighten-3' }
]);

// Data Mock: Incident Breakdown
const categoryBreakdown = ref([
  { name: 'Weather / Environmental (Windshear, Bird)', value: 45, percent: 38, color: 'info' },
  { name: 'Ground Operations & Cargo Handling', value: 32, percent: 27, color: 'warning' },
  { name: 'Aircraft System / Maintenance Defect', value: 21, percent: 18, color: 'deep-purple' },
  { name: 'Flight Crew / Operational Procedure', value: 14, percent: 12, color: 'error' },
  { name: 'Security / Cabin Load', value: 6, percent: 5, color: 'blue-grey' }
]);

// Data Mock: FRAT Trends
const overrideTrends = ref([
  {
    route: 'Wamena (WMX) - Oksibil (OKS)',
    avgScore: 125,
    count: 14,
    factor: 'Weather (Downdraft)'
  },
  { route: 'Sentani (DJJ) - Dekai (DEX)', avgScore: 110, count: 8, factor: 'Airstrip Condition' },
  {
    route: 'Timika (TIM) - Agats (EWE)',
    avgScore: 105,
    count: 5,
    factor: 'Crew Fatigue / Scheduling'
  }
]);
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

/* Kustomisasi scrollbar untuk tabel */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}

/* CSS Grid untuk Risk Matrix 3x5 (Sederhana) */
.risk-matrix {
  position: relative;
  width: 100%;
  max-width: 250px;
  padding-left: 20px;
}
.axis-label-y {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  white-space: nowrap;
}
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 2px;
  background-color: #eee;
  border: 1px solid #ccc;
}
.risk-cell {
  height: 40px;
  font-size: 0.85rem;
  transition: opacity 0.2s ease;
}
.risk-cell:hover {
  opacity: 0.8;
  cursor: pointer;
}
</style>
