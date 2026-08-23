<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Flight Risk Matrix (FRAT)</h1>
      <div class="text-caption text-medium-emphasis">Pre-flight Risk Assessment & Fatigue Management</div>
    </div>

    <VTabs v-model="activeTab" color="primary">
        <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
        </VTab>
        <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
        </VTab>
        <VTab value="frat" to="/sms/Frat" class="text-none font-weight-bold">
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
      </VTabs>

    <!-- Filter Toolbar -->
    <VCard border class="pa-3 mb-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField v-model="filters.dateRange" label="Date" prepend-inner-icon="mdi-calendar-range" variant="outlined" density="compact" hide-details style="max-width: 180px" />
        <VSelect v-model="filters.station" label="Station" :items="['All Station']" variant="outlined" density="compact" hide-details style="max-width: 140px" />
        <VSelect v-model="filters.aircraft" label="Aircraft" :items="['All Aircraft']" variant="outlined" density="compact" hide-details style="max-width: 140px" />
        <VSelect v-model="filters.operation" label="Operation Type" :items="['All Types']" variant="outlined" density="compact" hide-details style="max-width: 140px" />
        <VSelect v-model="filters.riskLevel" label="Risk Level" :items="['All Risk']" variant="outlined" density="compact" hide-details style="max-width: 140px" />
        <VSelect v-model="filters.status" label="FRAT Status" :items="['All Status']" variant="outlined" density="compact" hide-details style="max-width: 140px" />
        
        <VBtn variant="outlined" density="compact" class="text-none mt-1">
          <VIcon icon="mdi-filter-variant" class="mr-1" /> More Filters
        </VBtn>
        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" class="text-none">Refresh Data</VBtn>
        <VBtn color="primary" density="compact" prepend-icon="mdi-plus" class="text-none ml-2">New FRAT Assessment</VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- KPI Cards (8 Custom Metrics for FRAT) -->
      <VCol v-for="(kpi, i) in fratKpis" :key="i" cols="12" sm="6" md="3" xl="auto" style="flex: 1 1 0%;">
        <SmsKpiCard v-bind="kpi" />
      </VCol>
    </VRow>

    <VRow>
      <!-- Matrix -->
      <VCol cols="12" lg="4">
        <VCard border class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-4">Flight Risk Matrix (Severity vs Likelihood)</div>
          <div class="d-flex align-stretch">
            <div class="d-flex flex-column justify-space-between mr-2 text-caption text-medium-emphasis pb-6 text-center">
              <div>5<br>Catastrophic</div>
              <div>4<br>Major</div>
              <div>3<br>Moderate</div>
              <div>2<br>Minor</div>
              <div>1<br>Negligible</div>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex flex-column ga-1">
                <!-- Row 5 -->
                <div class="d-flex ga-1">
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">0</div>
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">0</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">1</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                </div>
                <!-- Row 4 -->
                <div class="d-flex ga-1">
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">0</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                </div>
                <!-- Row 3 -->
                <div class="d-flex ga-1">
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">0</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">2</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                </div>
                <!-- Row 2 -->
                <div class="d-flex ga-1">
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">2</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">3</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">0</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                </div>
                <!-- Row 1 -->
                <div class="d-flex ga-1">
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">4</div>
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">5</div>
                  <div class="bg-success text-center py-2 flex-grow-1 font-weight-bold rounded-sm">2</div>
                  <div class="bg-warning text-center py-2 flex-grow-1 font-weight-bold rounded-sm">1</div>
                  <div class="bg-error text-center py-2 flex-grow-1 font-weight-bold rounded-sm text-white">0</div>
                </div>
              </div>
              <div class="d-flex justify-space-between mt-2 text-caption text-medium-emphasis">
                <div class="text-center px-1">1<br>Rare</div>
                <div class="text-center px-1">2<br>Unlikely</div>
                <div class="text-center px-1">3<br>Possible</div>
                <div class="text-center px-1">4<br>Likely</div>
                <div class="text-center px-1">5<br>Almost Certain</div>
              </div>
            </div>
          </div>
          <div class="text-caption text-medium-emphasis mt-4 italic">Klik pada sel matrix untuk melihat detail flight</div>
        </VCard>
      </VCol>

      <!-- Distribution & Trend -->
      <VCol cols="12" md="6" lg="3">
        <SmsDonutSummary title="Risk Distribution" v-bind="riskDistribution" class="h-100" />
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <SmsTrendChart title="FRAT Score Trend (7 Days)" v-bind="fratTrend" class="h-100" />
      </VCol>

      <!-- Right Panel: Fatigue & Compliance -->
      <VCol cols="12" lg="2" class="d-flex flex-column ga-4">
        <SmsDonutSummary title="Fatigue Status" v-bind="fatigueSummary" />
        <VCard border class="pa-4 flex-grow-1">
          <div class="text-subtitle-2 font-weight-bold mb-2">FRAT Compliance</div>
          <div class="d-flex align-center mt-2">
            <VIcon icon="mdi-shield-check-outline" color="success" size="36" class="mr-3" />
            <div>
              <div class="text-h4 font-weight-bold">100%</div>
              <div class="text-caption text-medium-emphasis">24 / 24 Flights</div>
            </div>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">Target: 100%</div>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <!-- Main Table -->
      <VCol cols="12" lg="9">
        <VCard border class="h-100">
          <div class="d-flex align-center pa-3 border-b">
            <VChipGroup v-model="tableFilter" selected-class="text-primary" mandatory density="compact">
              <VChip value="all" variant="outlined">All Flights <VBadge color="primary" content="24" inline class="ml-1" /></VChip>
              <VChip value="low" variant="outlined" class="text-success border-success">Low Risk <VBadge color="success" content="18" inline class="ml-1" /></VChip>
              <VChip value="medium" variant="outlined" class="text-warning border-warning">Medium Risk <VBadge color="warning" content="4" inline class="ml-1" /></VChip>
              <VChip value="high" variant="outlined" class="text-error border-error">High Risk <VBadge color="error" content="2" inline class="ml-1" /></VChip>
              <VChip value="blocked" variant="outlined">Blocked <VBadge color="error" content="1" inline class="ml-1" /></VChip>
              <VChip value="override" variant="outlined">Override <VBadge color="deep-purple-accent-1" content="1" inline class="ml-1" /></VChip>
            </VChipGroup>
            <VSpacer />
            <VBtn variant="text" prepend-icon="mdi-download" density="compact" class="text-none text-medium-emphasis mr-2">Export</VBtn>
            <VBtn variant="text" prepend-icon="mdi-view-column-outline" density="compact" class="text-none text-medium-emphasis">Column Settings</VBtn>
          </div>

          <VTable>
            <thead>
              <tr>
                <th class="text-subtitle-2 font-weight-bold">Flight ID</th>
                <th class="text-subtitle-2 font-weight-bold">Date / Time (Local)</th>
                <th class="text-subtitle-2 font-weight-bold">Station</th>
                <th class="text-subtitle-2 font-weight-bold">Aircraft</th>
                <th class="text-subtitle-2 font-weight-bold">Route</th>
                <th class="text-subtitle-2 font-weight-bold">FRAT Score</th>
                <th class="text-subtitle-2 font-weight-bold">Risk Level</th>
                <th class="text-subtitle-2 font-weight-bold">Fatigue Status</th>
                <th class="text-subtitle-2 font-weight-bold">FRAT Status</th>
                <th class="text-subtitle-2 font-weight-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="flight in tableFlights" :key="flight.id">
                <td class="text-body-2 font-weight-bold">{{ flight.id }}</td>
                <td class="text-body-2">{{ flight.datetime }}</td>
                <td class="text-body-2">{{ flight.station }}</td>
                <td class="text-body-2">{{ flight.aircraft }}</td>
                <td class="text-body-2">{{ flight.route }}</td>
                <td :class="['font-weight-bold text-center', textRiskColor(flight.risk)]">{{ flight.score }}</td>
                <td><VChip :color="riskColor(flight.risk)" size="small" variant="outlined" class="font-weight-bold bg-white">{{ flight.risk }}</VChip></td>
                <td><VChip :color="fatigueColor(flight.fatigue)" size="small" variant="tonal" class="font-weight-bold">{{ flight.fatigue }}</VChip></td>
                <td><VChip :color="fratStatusColor(flight.status)" size="small" variant="flat" :class="flight.status === 'Released' ? 'text-white' : ''">{{ flight.status }}</VChip></td>
                <td>
                  <div class="d-flex ga-1">
                    <VBtn icon="mdi-eye-outline" variant="text" density="comfortable" size="small" color="grey-darken-1" />
                    <VBtn icon="mdi-pencil-outline" variant="text" density="comfortable" size="small" color="grey-darken-1" />
                    <VBtn icon="mdi-dots-vertical" variant="text" density="comfortable" size="small" color="grey-darken-1" />
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
          
          <div class="d-flex align-center pa-3 border-t">
            <span class="text-caption text-medium-emphasis">Showing 1 to 6 of 24 results</span>
            <VSpacer />
            <VPagination v-model="page" :length="4" density="compact" active-color="primary" />
          </div>
        </VCard>
      </VCol>

      <!-- Selected Flight Details -->
      <VCol cols="12" lg="3">
        <VCard border class="pa-4 h-100">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-bold">Selected Flight</div>
            <a href="#" class="text-caption text-primary text-decoration-none font-weight-medium">View Full Details</a>
          </div>
          
          <div class="d-flex align-center mb-1">
            <div class="text-h5 font-weight-bold">AMA1264</div>
            <VChip size="x-small" color="deep-purple-accent-1" variant="tonal" class="ml-2 font-weight-bold">Override</VChip>
          </div>
          <div class="text-caption text-medium-emphasis mb-5">Wamena (WMX) – Mulia (MII)<br>21 Aug 2026 08:00 Local</div>

          <VRow dense class="mb-5">
            <VCol cols="6">
              <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center">
                <div class="text-caption text-medium-emphasis">FRAT Score</div>
                <div class="text-subtitle-1 font-weight-bold text-error">6.7 <span class="text-caption text-medium-emphasis">/ 10</span></div>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center">
                <div class="text-caption text-medium-emphasis">Risk Level</div>
                <div class="text-subtitle-1 font-weight-bold text-error">High</div>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center">
                <div class="text-caption text-medium-emphasis">Fatigue Status</div>
                <div class="text-caption font-weight-bold text-warning">Fatigue Elevated</div>
              </div>
            </VCol>
            <VCol cols="6">
              <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center">
                <div class="text-caption text-medium-emphasis">FRAT Status</div>
                <div class="text-caption font-weight-bold text-deep-purple-accent-2">Released (Override)</div>
              </div>
            </VCol>
          </VRow>

          <div class="text-caption font-weight-bold mb-3">Risk Factors (Top 5)</div>
          <div class="d-flex justify-space-between text-caption mb-2">
            <span class="text-medium-emphasis">1. Weather Condition (WX)</span><span class="font-weight-medium">2.0</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-2">
            <span class="text-medium-emphasis">2. Airstrip Condition</span><span class="font-weight-medium">1.8</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-2">
            <span class="text-medium-emphasis">3. Fatigue Risk Score</span><span class="font-weight-medium">1.5</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-2">
            <span class="text-medium-emphasis">4. Maintenance Status</span><span class="font-weight-medium">0.8</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-6">
            <span class="text-medium-emphasis">5. Operational Pressure</span><span class="font-weight-medium">0.6</span>
          </div>
          
          <VBtn block variant="outlined" color="primary" class="text-none">View FRAT Assessment</VBtn>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Tidak ada import manual! Nuxt 3 auto-imports ref, reactive, dan komponen.

const activeTab = ref('frat')
const lastUpdated = ref('21 Aug 2026 10:30 WIB')
const tableFilter = ref('all')
const page = ref(1)

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  aircraft: 'All Aircraft',
  operation: 'All Types',
  riskLevel: 'All Risk',
  status: 'All Status'
})

// STATE LOKAL KHUSUS FRAT (Mencegah useSmsMockData.ts kelebihan beban)
const fratKpis = [
  { title: 'Total Flights', value: '24', icon: 'mdi-airplane-takeoff', color: 'primary', trend: { icon: 'mdi-arrow-up-thin', text: '14% vs yesterday', tone: 'good' } },
  { title: 'FRAT Completed', value: '24', icon: 'mdi-clipboard-check-outline', color: 'success', target: 'Target: 100%' },
  { title: 'Low Risk', value: '18', icon: 'mdi-shield-check-outline', color: 'success', trend: { icon: 'mdi-arrow-down-thin', text: '2 vs yesterday', tone: 'good' } },
  { title: 'Medium Risk', value: '4', icon: 'mdi-alert-circle-outline', color: 'warning', trend: { icon: 'mdi-arrow-down-thin', text: '1 vs yesterday', tone: 'good' } },
  { title: 'High Risk', value: '2', icon: 'mdi-alert-outline', color: 'error', trend: { icon: 'mdi-arrow-up-thin', text: '1 vs yesterday', tone: 'bad' } },
  { title: 'Blocked (Not Released)', value: '1', icon: 'mdi-cancel', color: 'error', trend: { icon: 'mdi-arrow-up-thin', text: '1 vs yesterday', tone: 'bad' } },
  { title: 'Special Override', value: '1', icon: 'mdi-shield-key-outline', color: 'deep-purple-accent-1', trend: { icon: 'mdi-minus', text: 'vs yesterday', tone: 'neutral' } },
  { title: 'Avg FRAT Score', value: '6.2', icon: 'mdi-calculator-variant-outline', color: 'info', target: 'Target: ≤ 5.0' },
]

const riskDistribution = {
  total: 24,
  totalLabel: 'Total Flights',
  segments: [
    { label: 'Low', value: 18, percent: 75, color: '#43A047' },
    { label: 'Medium', value: 4, percent: 17, color: '#FB8C00' },
    { label: 'High', value: 2, percent: 8, color: '#E53935' },
    { label: 'Blocked', value: 1, percent: 4, color: '#B71C1C' },
  ]
}

const fratTrend = {
  categories: ['15 Aug', '16 Aug', '17 Aug', '18 Aug', '19 Aug', '20 Aug', '21 Aug'],
  series: [
    { name: 'Average Score', color: '#1E88E5', data: [5.1, 4.8, 5.6, 6.4, 6.1, 5.9, 6.2] }
  ]
}

const fatigueSummary = {
  total: 24,
  totalLabel: 'Crew Assessed',
  segments: [
    { label: 'Fit for Duty', value: 19, percent: 79, color: '#43A047' },
    { label: 'Fatigue Elevated', value: 3, percent: 13, color: '#FB8C00' },
    { label: 'Fatigue High', value: 1, percent: 4, color: '#E53935' },
    { label: 'Not Assessed', value: 1, percent: 4, color: '#757575' },
  ]
}

const tableFlights = [
  { id: 'AMA1263', datetime: '21 Aug 2026 07:15', station: 'Sentani (DJJ)', aircraft: 'DHC6-400 PK-AMA', route: 'DJJ - WMX', score: 4.2, risk: 'Low', fatigue: 'Fit for Duty', status: 'Released' },
  { id: 'AMA1264', datetime: '21 Aug 2026 08:00', station: 'Wamena (WMX)', aircraft: 'DHC6-400 PK-AMB', route: 'WMX - MII', score: 6.7, risk: 'High', fatigue: 'Fatigue Elevated', status: 'Released (Override)' },
  { id: 'AMA1265', datetime: '21 Aug 2026 09:30', station: 'Dekai (DKI)', aircraft: 'C208B PK-AMC', route: 'DKI - MUL', score: 3.8, risk: 'Medium', fatigue: 'Fit for Duty', status: 'Released' },
  { id: 'AMA1266', datetime: '21 Aug 2026 10:45', station: 'Timika (TIM)', aircraft: 'DHC6-400 PK-AMD', route: 'TIM - DJJ', score: 7.3, risk: 'High', fatigue: 'Fatigue High', status: 'Blocked' },
  { id: 'AMA1267', datetime: '21 Aug 2026 11:20', station: 'Mulia (MII)', aircraft: 'C208B PK-AME', route: 'MII - TIM', score: 2.9, risk: 'Low', fatigue: 'Fit for Duty', status: 'Released' },
  { id: 'AMA1268', datetime: '21 Aug 2026 13:05', station: 'Sentani (DJJ)', aircraft: 'DHC6-300 PK-AMF', route: 'DJJ - OKS', score: 5.1, risk: 'Medium', fatigue: 'Fatigue Elevated', status: 'Released' }
]

function riskColor(level: string) { return { Low: 'success', Medium: 'warning', High: 'error', Blocked: 'error' }[level] || 'grey' }
function textRiskColor(level: string) { return { Low: 'text-success', Medium: 'text-warning', High: 'text-error', Blocked: 'text-error' }[level] || 'text-grey' }
function fatigueColor(status: string) { return { 'Fit for Duty': 'success', 'Fatigue Elevated': 'warning', 'Fatigue High': 'error' }[status] || 'grey' }
function fratStatusColor(status: string) { return { 'Released': 'success', 'Released (Override)': 'deep-purple-accent-1', 'Blocked': 'error' }[status] || 'grey' }
</script>