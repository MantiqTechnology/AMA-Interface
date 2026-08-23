<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Safety Assurance</h1>
      <div class="text-caption text-medium-emphasis">Audits, Inspections, Management of Change (MOC) & Continuous Improvement</div>
    </div>

    <!-- Sub-menu Navigation -->
    <VTabs v-model="activeTab" color="primary">
        <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
        </VTab>
        <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
        </VTab>
        <VTab value="frat" to="/sms/Frat" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> Flight Risk (FRAT)
        </VTab>
        <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-clipboard-check-multiple-outline" size="18" class="mr-2" /> CAPA
        </VTab>
        <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency & Response
        </VTab>
        <VTab value="assurance" to="/sms/SafetyAssurance" class="text-none font-weight-bold">
          <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
        </VTab>
        <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
        </VTab>
        <VTab value="communication" to="/sms/Communication" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
        </VTab>
      </VTabs>

    <!-- Filter & Toolbar -->
    <VCard border class="pa-3 mb-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField
          v-model="filters.dateRange"
          label="Audit/MOC Date"
          prepend-inner-icon="mdi-calendar-range"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 220px"
        />
        <VSelect
          v-model="filters.department"
          label="Department / Station"
          :items="['All', 'Flight Ops', 'MRO', 'Ground Handling', 'Sentani (DJJ)', 'Wamena (WMX)']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="filters.status"
          label="Status"
          :items="['All', 'Scheduled', 'In Progress', 'Completed', 'Action Required']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
        <VSpacer />
        
        <span class="text-caption text-medium-emphasis mr-3">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          @click="handleRefresh"
          class="text-none font-weight-bold"
          style="background-color: #f0f4ff; border-color: #d0d9f5"
        >
          Refresh Data
        </VBtn>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-magnify" class="text-none mr-2">
          Search
        </VBtn>
        <VBtn color="primary" variant="elevated" prepend-icon="mdi-plus" class="text-none font-weight-bold shadow-lg" density="compact">
          NEW AUDIT / MOC
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- KPI Top Row -->
      <VCol cols="12" md="3">
        <SmsKpiCard title="Active MOC" value="4" icon="mdi-source-branch" color="deep-purple-accent-2" target="Management of Change" />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard title="Scheduled Audits" value="6" icon="mdi-clipboard-text-clock-outline" color="info" trend="{ icon: 'mdi-arrow-up', text: 'Q3 Schedule' }" />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard title="Open Findings" value="12" icon="mdi-clipboard-alert-outline" color="warning" target="Pending Corrections" />
      </VCol>
      <VCol cols="12" md="3">
        <SmsKpiCard title="Compliance Rate" value="98.5%" icon="mdi-shield-check" color="success" target="Target: 100%" />
      </VCol>

      <!-- Middle Row: Audits vs MOCs -->
      <VCol cols="12" md="7">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 d-flex justify-space-between align-center border-b bg-grey-lighten-5">
            <div>
              <div class="text-subtitle-2 font-weight-bold">Safety Audits & Inspections</div>
              <div class="text-caption text-medium-emphasis">Internal & External (DGCA) Regulatory Checks</div>
            </div>
            <VBtn size="small" variant="text" color="primary" class="text-none" prepend-icon="mdi-calendar">View Schedule</VBtn>
          </div>
          
          <div class="flex-grow-1 overflow-y-auto" style="max-height: 380px;">
            <VTable density="compact" class="bg-transparent">
              <thead>
                <tr>
                  <th class="text-caption font-weight-bold text-uppercase px-4">Audit Ref</th>
                  <th class="text-caption font-weight-bold text-uppercase px-2">Subject / Scope</th>
                  <th class="text-caption font-weight-bold text-uppercase px-2">Date</th>
                  <th class="text-caption font-weight-bold text-uppercase px-2">Status</th>
                  <th class="text-caption font-weight-bold text-uppercase text-center px-4">Findings</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="audit in audits" :key="audit.id" class="hover-bg">
                  <td class="text-caption font-weight-bold px-4" style="white-space: nowrap;">{{ audit.id }}</td>
                  <td class="px-2 py-2">
                    <div class="text-body-2 font-weight-medium">{{ audit.subject }}</div>
                    <div class="text-caption text-medium-emphasis">{{ audit.auditor }}</div>
                  </td>
                  <td class="text-caption px-2" style="white-space: nowrap;">{{ audit.date }}</td>
                  <td class="px-2">
                    <VChip size="x-small" :color="audit.statusColor" variant="tonal" class="font-weight-bold">
                      {{ audit.status }}
                    </VChip>
                  </td>
                  <td class="text-center px-4">
                    <VChip v-if="audit.findings > 0" size="x-small" color="error" variant="flat" class="font-weight-bold">
                      {{ audit.findings }}
                    </VChip>
                    <VIcon v-else icon="mdi-check" color="success" size="small" />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="5">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 d-flex justify-space-between align-center border-b bg-deep-purple-lighten-5">
            <div>
              <div class="text-subtitle-2 font-weight-bold text-deep-purple-darken-2">Management of Change (MOC)</div>
              <div class="text-caption text-medium-emphasis">Operational & Organizational Change Tracking</div>
            </div>
            <VBtn icon="mdi-plus" variant="text" color="deep-purple" size="small" density="comfortable" />
          </div>
          
          <div class="flex-grow-1 overflow-y-auto pa-2" style="max-height: 380px;">
            <VList density="compact" class="pa-0">
              <VListItem v-for="moc in mocs" :key="moc.id" class="px-2 py-2 mb-2 rounded hover-bg border">
                <template v-slot:prepend>
                  <VIcon icon="mdi-source-branch" :color="moc.statusColor" class="mr-3" />
                </template>
                <VListItemTitle class="text-body-2 font-weight-bold">{{ moc.title }}</VListItemTitle>
                <VListItemSubtitle class="text-caption text-medium-emphasis mt-1">{{ moc.id }} | Sponsor: {{ moc.sponsor }}</VListItemSubtitle>
                
                <div class="mt-2 d-flex align-center">
                  <VProgressLinear :model-value="moc.progress" :color="moc.statusColor" height="6" rounded class="flex-grow-1 mr-3" />
                  <span class="text-caption font-weight-bold" :class="`text-${moc.statusColor}`">{{ moc.status }}</span>
                </div>
              </VListItem>
            </VList>
          </div>
        </VCard>
      </VCol>

      <!-- Bottom Row: Findings Distribution vs Continuous Improvement -->
      <VCol cols="12" md="5">
        <VCard border class="h-100 pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-4">Open Findings by Category</div>
          
          <div v-for="(item, i) in findingsDistribution" :key="item.category" class="mb-3">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-caption font-weight-medium">{{ item.category }}</span>
              <span class="text-caption font-weight-bold">{{ item.count }}</span>
            </div>
            <VProgressLinear :model-value="(item.count / 12) * 100" :color="item.color" height="8" rounded />
          </div>
          
          <VDivider class="my-4" />
          <div class="d-flex justify-space-between align-center">
            <div class="text-caption text-medium-emphasis">Total Open Findings: <strong>12</strong></div>
            <VBtn size="small" variant="outlined" color="warning" class="text-none">Generate CAPA</VBtn>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="7">
        <VCard border class="h-100 pa-4 bg-green-lighten-5 border-success">
          <div class="d-flex align-center mb-4">
            <VIcon icon="mdi-trending-up" color="success" size="x-large" class="mr-3" />
            <div>
              <div class="text-subtitle-1 font-weight-bold text-success-darken-2">Continuous Improvement & Safety Surveys</div>
              <div class="text-caption text-medium-emphasis">Proactive Safety Culture Initiatives</div>
            </div>
          </div>
          
          <VRow dense>
            <VCol v-for="survey in surveys" :key="survey.title" cols="12" sm="6">
              <VCard border elevation="0" class="pa-3 bg-white h-100">
                <div class="text-body-2 font-weight-bold mb-1">{{ survey.title }}</div>
                <div class="text-caption text-medium-emphasis mb-3">{{ survey.desc }}</div>
                <div class="d-flex justify-space-between align-center text-caption mb-1">
                  <span>Progress</span>
                  <span class="font-weight-bold text-success">{{ survey.progress }}%</span>
                </div>
                <VProgressLinear :model-value="survey.progress" color="success" height="6" rounded />
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VCol>

    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Nuxt 3 auto-imports

const activeTab = ref('assurance')
const lastUpdated = ref('22 Aug 2026 13:45 WIB')

const filters = reactive({
  dateRange: '01 Jan – 22 Aug 2026',
  department: 'All',
  status: 'All'
})

// Data Mock: Safety Audits & Inspections (Internal & Eksternal)
const audits = ref([
  { id: 'AUD-26-045', subject: 'DGCA AOC Renewal Audit (Base)', auditor: 'External (DKUPPU)', date: '15-18 Aug 2026', status: 'Completed', statusColor: 'success', findings: 2 },
  { id: 'AUD-26-044', subject: 'Line Operations Safety Audit (LOSA)', auditor: 'Internal Safety Dept', date: '01-10 Aug 2026', status: 'Action Required', statusColor: 'error', findings: 5 },
  { id: 'AUD-26-043', subject: 'Fuel Farm Inspection - Wamena', auditor: 'QA Inspector', date: '28 Jul 2026', status: 'Completed', statusColor: 'success', findings: 0 },
  { id: 'AUD-26-042', subject: 'Ramp Safety & Handling Audit - DJJ', auditor: 'Safety Officer', date: '15 Jul 2026', status: 'Action Required', statusColor: 'error', findings: 3 },
  { id: 'AUD-26-041', subject: 'Dangerous Goods (DG) Compliance', auditor: 'Internal Compliance', date: '10 Jul 2026', status: 'Completed', statusColor: 'success', findings: 0 },
  { id: 'AUD-26-046', subject: 'Annual ISO 9001/45001 Surveillance', auditor: 'External (SGS)', date: '05-09 Sep 2026', status: 'Scheduled', statusColor: 'info', findings: 0 },
  { id: 'AUD-26-047', subject: 'Maintenance Facility Check - Timika', auditor: 'QA Manager', date: '12 Sep 2026', status: 'Scheduled', statusColor: 'info', findings: 0 },
])

// Data Mock: Management of Change (MOC)
const mocs = ref([
  { id: 'MOC-26-012', title: 'Operasional Rute Baru: Oksibil (OKS) - Borme (BME)', sponsor: 'Commercial Dept', progress: 40, status: 'Risk Assessment', statusColor: 'warning' },
  { id: 'MOC-26-011', title: 'Transisi Vendor Avtur Utama di Dekai (DKI)', sponsor: 'Procurement', progress: 85, status: 'Implementation', statusColor: 'primary' },
  { id: 'MOC-26-010', title: 'Pergantian Posisi Chief of Pilot', sponsor: 'HR & Flight Ops', progress: 100, status: 'Closed', statusColor: 'success' },
  { id: 'MOC-26-013', title: 'Pengenalan Electronic Flight Bag (EFB) Fase 2', sponsor: 'Flight Ops', progress: 15, status: 'Initiated', statusColor: 'info' },
  { id: 'MOC-26-009', title: 'Modifikasi Prosedur Load & Balance Cessna 208B', sponsor: 'Engineering', progress: 100, status: 'Closed', statusColor: 'success' },
])

// Data Mock: Temuan Ketidakpatuhan Berdasarkan Kategori
const findingsDistribution = ref([
  { category: 'Documentation & Records', count: 4, color: 'blue-grey' },
  { category: 'Ground Support Equipment (GSE)', count: 3, color: 'orange' },
  { category: 'Flight Crew Procedures (SOP)', count: 3, color: 'info' },
  { category: 'Facility & Environment', count: 2, color: 'error' },
])

// Data Mock: Inisiatif Peningkatan Berkelanjutan (Surveys)
const surveys = ref([
  { title: 'Annual Safety Culture Survey 2026', desc: 'Survei anonim untuk mengukur tingkat adopsi Just Culture di kalangan kru dan teknisi.', progress: 82 },
  { title: 'Fatigue Risk Management Review', desc: 'Pengumpulan data kualitatif mengenai pola tidur kru saat bertugas di stasiun pedalaman.', progress: 45 },
  { title: 'Customer Baggage Handling Feedback', desc: 'Evaluasi prosedur penimbangan kargo dan penanganan barang penumpang perintis.', progress: 100 },
  { title: 'New ERP Protocol Familiarization', desc: 'Drill table-top dan kuis pemahaman mengenai sistem One-Click ERP yang baru.', progress: 60 }
])
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

/* Kustomisasi scrollbar yang elegan */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #E0E0E0;
  border-radius: 4px;
}
</style>