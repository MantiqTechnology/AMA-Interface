<template>
  <VContainer fluid class="pb-4 pt-2">
    <!-- 1. HEADER HALAMAN -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">CAPA Management</h1>
      <div class="text-caption text-medium-emphasis">Corrective & Preventive Action Tracking</div>
    </div>

    <!-- 2. NAV BAR & REFRESH BUTTON (Satu baris sejajar) -->
    <div class="d-flex justify-space-between align-center border-b mb-4 flex-wrap">
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
        <!-- PERBAIKAN: Menghapus font-weight-bold manual agar tidak selalu bold -->
        <VTab value="capa" to="/sms/Capa" class="text-none font-weight-bold">
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

      <div class="d-flex align-center pr-1 pb-1">
        <span class="text-caption text-medium-emphasis mr-3 font-weight-medium">Last updated: {{ lastUpdated }}</span>
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
      </div>
    </div>

    <!-- 3. FILTER TOOLBAR -->
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <VTextField
        v-model="filters.dateRange"
        label="Date Range"
        prepend-inner-icon="mdi-calendar-blank-outline"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 180px"
        class="font-weight-medium bg-white"
      />
      <VSelect
        v-model="filters.station"
        label="Station"
        :items="['All Station']"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 140px"
        class="bg-white"
      />
      <VSelect
        v-model="filters.source"
        label="Source Type"
        :items="['All Source']"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 140px"
        class="bg-white"
      />
      <VSelect
        v-model="filters.riskLevel"
        label="Risk Level"
        :items="['All Risk Level']"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 140px"
        class="bg-white"
      />
      <VSelect
        v-model="filters.status"
        label="Status"
        :items="['All Status']"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 140px"
        class="bg-white"
      />

      <VBtn variant="outlined" density="compact" class="text-none bg-white" height="40">
        <VIcon icon="mdi-filter-variant" class="mr-1" /> More Filters
      </VBtn>
      <VSpacer />
      <VBtn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        class="text-none font-weight-bold"
        height="40"
      >
        New CAPA
      </VBtn>
    </div>

    <!-- 4. KPI SCORECARDS (7 Kolom Berjejer) -->
    <VRow class="mb-4 align-stretch" style="gap: 12px; margin-left: 0; margin-right: 0">
      <SmsKpiCard
        v-for="(kpi, i) in capaKpis"
        :key="i"
        v-bind="kpi"
        style="flex: 1 1 0%; min-width: 0"
        class="elevation-0 border rounded-lg"
      />
    </VRow>

    <VRow>
      <!-- LEFT AREA: Kanban & Table -->
      <VCol cols="12" xl="9" lg="8">
        <!-- Kanban Board Overview -->
        <div class="text-subtitle-1 font-weight-bold mb-3">CAPA Status (Kanban Overview)</div>
        <div class="kanban-container pb-2 mb-4 d-flex ga-4">
          <VSheet
            v-for="col in kanbanData"
            :key="col.id"
            border
            rounded="lg"
            class="kanban-col bg-grey-lighten-4 pa-2 d-flex flex-column elevation-0"
          >
            <div class="d-flex justify-space-between align-center mb-3 pa-1">
              <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">{{
                col.title
              }}</span>
              <VChip
                size="x-small"
                variant="flat"
                color="grey-lighten-2"
                class="font-weight-bold text-black"
              >
                {{ col.count }}
              </VChip>
            </div>

            <div
              class="d-flex flex-column ga-2 flex-grow-1 overflow-y-auto pr-1"
              style="max-height: 280px"
            >
              <VCard
                v-for="card in col.items"
                :key="card.id"
                border
                elevation="0"
                class="pa-3 rounded-lg flex-shrink-0"
              >
                <div class="text-caption font-weight-bold mb-1">{{ card.id }}</div>
                <div
                  class="text-caption text-medium-emphasis mb-3 line-clamp-2"
                  style="min-height: 36px"
                >
                  {{ card.title }}
                </div>
                <div class="d-flex ga-2">
                  <VChip
                    :color="riskColor(card.risk)"
                    size="x-small"
                    variant="tonal"
                    class="font-weight-bold px-2"
                  >
                    {{ card.risk }}
                  </VChip>
                  <span
                    class="text-caption text-medium-emphasis font-weight-medium mt-auto mb-auto"
                  >{{ card.station }}</span>
                </div>
                <div v-if="card.closedAt" class="text-caption text-medium-emphasis mt-2">
                  Closed {{ card.closedAt }}
                </div>
              </VCard>
            </div>

            <VBtn
              variant="text"
              size="small"
              class="text-none mt-2 text-medium-emphasis w-100 justify-start"
              prepend-icon="mdi-plus"
            >
              Add CAPA
            </VBtn>
          </VSheet>
        </div>

        <!-- CAPA Register Table -->
        <VCard border class="h-100 elevation-0 rounded-lg">
          <div class="d-flex align-center justify-space-between pa-3 border-b bg-white">
            <div class="text-subtitle-1 font-weight-bold">CAPA Register</div>
            <div>
              <VBtn
                variant="text"
                prepend-icon="mdi-download"
                density="compact"
                class="text-none text-medium-emphasis mr-2"
              >
                Export
              </VBtn>
              <VBtn
                variant="text"
                prepend-icon="mdi-view-column-outline"
                density="compact"
                class="text-none text-medium-emphasis"
              >
                Columns
              </VBtn>
            </div>
          </div>

          <VTable>
            <thead>
              <tr>
                <th class="text-caption font-weight-bold text-uppercase">CAPA ID</th>
                <th class="text-caption font-weight-bold text-uppercase">Source</th>
                <th class="text-caption font-weight-bold text-uppercase">Related To</th>
                <th class="text-caption font-weight-bold text-uppercase">
                  Subject / Action Required
                </th>
                <th class="text-caption font-weight-bold text-uppercase">Risk</th>
                <th class="text-caption font-weight-bold text-uppercase">Owner</th>
                <th class="text-caption font-weight-bold text-uppercase">Due Date</th>
                <th class="text-caption font-weight-bold text-uppercase">Status</th>
                <th class="text-caption font-weight-bold text-uppercase" style="min-width: 100px">
                  Progress
                </th>
                <th class="text-caption font-weight-bold text-uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in tableCapa" :key="item.id">
                <td class="text-caption font-weight-bold">{{ item.id }}</td>
                <td class="text-caption">{{ item.source }}</td>
                <td class="text-caption text-medium-emphasis">{{ item.relatedTo }}</td>
                <td
                  class="text-caption"
                  style="
                    max-width: 180px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  "
                >
                  {{ item.subject }}
                </td>
                <td>
                  <VChip
                    :color="riskColor(item.risk)"
                    size="x-small"
                    variant="tonal"
                    class="font-weight-bold px-2"
                  >
                    {{ item.risk }}
                  </VChip>
                </td>
                <td class="text-caption">{{ item.owner }}</td>
                <td
                  :class="[
                    'text-caption font-weight-medium',
                    isOverdue(item.dueDate) && item.status !== 'Closed' ? 'text-error' : ''
                  ]"
                >
                  {{ item.dueDate }}
                </td>
                <td>
                  <VChip
                    :color="statusColor(item.status)"
                    size="x-small"
                    variant="outlined"
                    class="font-weight-bold bg-white px-2"
                  >
                    {{ item.status }}
                  </VChip>
                </td>
                <td>
                  <div class="d-flex align-center ga-2">
                    <VProgressLinear
                      :model-value="item.progress"
                      :color="item.progress === 100 ? 'success' : 'primary'"
                      height="6"
                      rounded
                      class="flex-grow-1"
                    />
                    <span class="text-caption" style="min-width: 28px">{{ item.progress }}%</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex justify-center ga-1">
                    <VBtn
                      icon="mdi-eye-outline"
                      variant="text"
                      density="compact"
                      size="small"
                      color="grey-darken-1"
                    />
                    <VBtn
                      icon="mdi-pencil-outline"
                      variant="text"
                      density="compact"
                      size="small"
                      color="grey-darken-1"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>

          <div class="d-flex align-center pa-3 border-t">
            <span class="text-caption text-medium-emphasis">Showing 1 to 6 of 27 results</span>
            <VSpacer />
            <VPagination v-model="page" :length="5" density="compact" active-color="primary" />
          </div>
        </VCard>
      </VCol>

      <!-- RIGHT PANEL: Analytics & Summaries -->
      <VCol cols="12" xl="3" lg="4" class="d-flex flex-column ga-4">
        <VRow density="compact">
          <VCol cols="12" sm="6" lg="12">
            <SmsDonutSummary
              title="CAPA Aging"
              v-bind="capaAging"
              class="h-100 elevation-0 border rounded-lg"
            />
          </VCol>
          <VCol cols="12" sm="6" lg="12" class="mt-lg-4 mt-sm-0">
            <SmsMetricBarList
              title="CAPA by Source"
              v-bind="capaBySource"
              class="h-100 elevation-0 border rounded-lg"
            />
          </VCol>
        </VRow>

        <VCard border class="pa-4 elevation-0 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-4">Effectiveness Review</div>
          <div class="d-flex align-center justify-space-between mb-4">
            <!-- Simplified pure CSS donut -->
            <div
              class="position-relative d-flex align-center justify-center mr-4"
              style="width: 100px; height: 100px"
            >
              <svg
                viewBox="0 0 36 36"
                style="transform: rotate(-90deg); width: 100px; height: 100px"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#E0E0E0"
                  stroke-width="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#43A047"
                  stroke-width="4"
                  stroke-dasharray="100 100"
                  stroke-dashoffset="22"
                />
                <!-- 78% -->
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#FB8C00"
                  stroke-width="4"
                  stroke-dasharray="17 100"
                  stroke-dashoffset="0"
                />
                <!-- 17% -->
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#E53935"
                  stroke-width="4"
                  stroke-dasharray="5 100"
                  stroke-dashoffset="-17"
                />
                <!-- 5% -->
              </svg>
              <div class="position-absolute d-flex flex-column align-center text-center">
                <span class="text-h6 font-weight-bold line-height-1">78%</span>
                <span class="text-caption text-medium-emphasis" style="font-size: 10px !important">Effective</span>
              </div>
            </div>

            <div class="flex-grow-1">
              <div class="d-flex justify-space-between text-caption mb-2">
                <div>
                  <VIcon icon="mdi-circle" color="success" size="12" class="mr-1" /> Effective
                </div>
                <div class="font-weight-bold">14 (78%)</div>
              </div>
              <div class="d-flex justify-space-between text-caption mb-2">
                <div>
                  <VIcon icon="mdi-circle" color="warning" size="12" class="mr-1" /> Partially
                  Effective
                </div>
                <div class="font-weight-bold">3 (17%)</div>
              </div>
              <div class="d-flex justify-space-between text-caption mb-3">
                <div>
                  <VIcon icon="mdi-circle" color="error" size="12" class="mr-1" /> Not Effective
                </div>
                <div class="font-weight-bold">1 (5%)</div>
              </div>
              <div class="text-caption text-medium-emphasis text-center border-t pt-2">
                Total Reviewed: 18
              </div>
            </div>
          </div>
          <VBtn block variant="outlined" color="primary" class="text-none">
            View Effectiveness Review
          </VBtn>
        </VCard>

        <VCard border class="pa-4 elevation-0 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-4">CAPA Performance (MTD)</div>
          <VRow density="compact">
            <VCol cols="4">
              <div class="text-caption text-medium-emphasis">Created</div>
              <div class="text-h5 font-weight-bold">9</div>
              <div class="text-caption text-success mt-1">
                <VIcon icon="mdi-arrow-up-thin" size="14" /> 29%
              </div>
            </VCol>
            <VCol cols="4" class="border-s pl-3">
              <div class="text-caption text-medium-emphasis">Closed</div>
              <div class="text-h5 font-weight-bold">18</div>
              <div class="text-caption text-success mt-1">
                <VIcon icon="mdi-arrow-up-thin" size="14" /> 38%
              </div>
            </VCol>
            <VCol cols="4" class="border-s pl-3">
              <div class="text-caption text-medium-emphasis">Overdue</div>
              <div class="text-h5 font-weight-bold">2</div>
              <div class="text-caption text-success mt-1">
                <VIcon icon="mdi-arrow-down-thin" size="14" /> 33%
              </div>
            </VCol>
          </VRow>
        </VCard>

        <VCard border class="pa-4 elevation-0 rounded-lg flex-grow-1">
          <div class="text-subtitle-2 font-weight-bold mb-3">Upcoming Review / Follow Up</div>
          <div class="d-flex justify-space-between text-caption mb-2 pb-2 border-b">
            <span class="font-weight-medium">CAPA-2026-001</span>
            <span class="text-medium-emphasis">Effectiveness Review</span>
            <span>23 Aug 2026</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-2 pb-2 border-b">
            <span class="font-weight-medium">CAPA-2026-018</span>
            <span class="text-medium-emphasis">Verification</span>
            <span>24 Aug 2026</span>
          </div>
          <div class="d-flex justify-space-between text-caption mb-4">
            <span class="font-weight-medium">CAPA-2026-011</span>
            <span class="text-medium-emphasis">Follow Up</span>
            <span>25 Aug 2026</span>
          </div>
          <div class="text-center mt-auto">
            <a href="#" class="text-caption font-weight-bold text-primary text-decoration-none">View All Follow Ups</a>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Footer Note -->
    <div
      class="d-flex align-center justify-space-between text-caption text-medium-emphasis mt-4 px-2"
    >
      <div class="d-flex align-center">
        <VIcon icon="mdi-information-outline" size="16" class="mr-2" />
        All CAPA actions are tracked until completion and effectiveness is verified.
        <span class="mx-2">|</span>
        CAPA data is confidential and protected under Safety Data Protection policy.
      </div>
      <div>
        Need help? <a href="#" class="text-primary text-decoration-none">See CAPA User Guide</a>
      </div>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
// INTEGRASI SIDEBAR: Baris ini memastikan halaman dirender menggunakan layout sms (tempat Sidebar Anda berada)
// definePageMeta({ layout: 'sms' });

const activeTab = ref('capa');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');
const page = ref(1);

type CapaBoardCard = {
  id: string;
  title: string;
  risk: string;
  station: string;
  closedAt?: string;
};

type CapaBoardColumn = {
  id: string;
  title: string;
  count: number;
  items: CapaBoardCard[];
};

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  source: 'All Source',
  riskLevel: 'All Risk Level',
  status: 'All Status'
});

const handleRefresh = () => {
  lastUpdated.value =
    new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
};

// KPI Metrics Khusus CAPA
const capaKpis = [
  {
    title: 'Total CAPA',
    value: '27',
    icon: 'mdi-clipboard-text-outline',
    color: 'primary',
    trend: { icon: 'mdi-arrow-up-thin', text: '18% vs last year', tone: 'bad' }
  },
  {
    title: 'Open',
    value: '5',
    icon: 'mdi-folder-open-outline',
    color: 'info',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs last week', tone: 'bad' }
  },
  {
    title: 'Due < 7 Days',
    value: '2',
    icon: 'mdi-clipboard-check-outline',
    color: 'warning',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs last week', tone: 'neutral' }
  },
  {
    title: 'Overdue',
    value: '2',
    icon: 'mdi-clock-alert-outline',
    color: 'error',
    trend: { icon: 'mdi-arrow-down-thin', text: '1 vs last week', tone: 'good' }
  },
  {
    title: 'Closed (This Month)',
    value: '18',
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    trend: { icon: 'mdi-arrow-up-thin', text: '4 vs last month', tone: 'good' }
  },
  {
    title: 'Effectiveness Pending',
    value: '3',
    icon: 'mdi-file-eye-outline',
    color: 'deep-purple-accent-1',
    trend: { icon: 'mdi-minus', text: 'vs last week', tone: 'neutral' }
  },
  {
    title: 'On-Time Completion',
    value: '86%',
    icon: 'mdi-target',
    color: 'info',
    target: 'Target: ≥ 95%'
  }
];

// Data Mock untuk Kanban Board
const kanbanData = ref<CapaBoardColumn[]>([
  {
    id: 'ident',
    title: 'Identified',
    count: 3,
    items: [
      { id: 'CAPA-2026-021', title: 'Fuel handling procedure gap', risk: 'High', station: 'WMX' },
      { id: 'CAPA-2026-022', title: 'Airstrip drainage issue', risk: 'Medium', station: 'DKI' },
      { id: 'CAPA-2026-023', title: 'Toolbox not serviceable', risk: 'Low', station: 'MII' }
    ]
  },
  {
    id: 'assign',
    title: 'Assigned',
    count: 4,
    items: [
      {
        id: 'CAPA-2026-018',
        title: 'Radio communication intermittent',
        risk: 'Medium',
        station: 'TIM'
      },
      { id: 'CAPA-2026-024', title: 'FOD in apron area', risk: 'Low', station: 'DJJ' }
    ]
  },
  {
    id: 'prog',
    title: 'In Progress',
    count: 6,
    items: [
      { id: 'CAPA-2026-011', title: 'Crew fatigue management', risk: 'High', station: 'DJJ' },
      {
        id: 'CAPA-2026-015',
        title: 'Maintenance documentation gap',
        risk: 'Medium',
        station: 'WMX'
      }
    ]
  },
  {
    id: 'verif',
    title: 'Pending Verification',
    count: 5,
    items: [
      {
        id: 'CAPA-2026-007',
        title: 'Bulk fuel filter replacement',
        risk: 'Medium',
        station: 'TIM'
      },
      { id: 'CAPA-2026-010', title: 'Pilot brief not recorded', risk: 'Low', station: 'DJJ' }
    ]
  },
  {
    id: 'eff',
    title: 'Effectiveness Review',
    count: 3,
    items: [
      { id: 'CAPA-2026-001', title: 'Drainage improvement', risk: 'High', station: 'WMX' },
      { id: 'CAPA-2026-003', title: 'Refuelling checklist update', risk: 'Medium', station: 'DJJ' }
    ]
  },
  {
    id: 'closed',
    title: 'Closed',
    count: 6,
    items: [
      {
        id: 'CAPA-2026-002',
        title: 'PPE availability',
        risk: 'Low',
        station: 'WMX',
        closedAt: '10 Aug 2026'
      },
      {
        id: 'CAPA-2026-004',
        title: 'Lighting at parking stand',
        risk: 'Low',
        station: 'DJJ',
        closedAt: '08 Aug 2026'
      }
    ]
  }
]);

// Data Mock untuk Tabel (CAPA Register)
const tableCapa = ref([
  {
    id: 'CAPA-2026-001',
    source: 'Hazard Report',
    relatedTo: 'HZD-2026-041',
    subject: 'Airstrip drainage inadequate — causes water pooling',
    risk: 'High',
    owner: 'Station Manager WMX',
    dueDate: '18 Aug 2026',
    status: 'Effectiveness Review',
    progress: 90
  },
  {
    id: 'CAPA-2026-018',
    source: 'Occurrence Report',
    relatedTo: 'OCC-2026-015',
    subject: 'Radio communication intermittent in final approach',
    risk: 'Medium',
    owner: 'Safety Manager',
    dueDate: '25 Aug 2026',
    status: 'In Progress',
    progress: 60
  },
  {
    id: 'CAPA-2026-022',
    source: 'Inspection Finding',
    relatedTo: 'INS-2026-027',
    subject: 'FOD observed at parking area',
    risk: 'Low',
    owner: 'Ground Handling',
    dueDate: '02 Sep 2026',
    status: 'Assigned',
    progress: 25
  },
  {
    id: 'CAPA-2026-011',
    source: 'FRAT / Risk',
    relatedTo: 'FRAT-2026-034',
    subject: 'Crew fatigue management improvement',
    risk: 'High',
    owner: 'OCC Supervisor',
    dueDate: '15 Aug 2026',
    status: 'In Progress',
    progress: 75
  },
  {
    id: 'CAPA-2026-003',
    source: 'Hazard Report',
    relatedTo: 'HZD-2026-012',
    subject: 'Refuelling checklist update & training',
    risk: 'Medium',
    owner: 'Quality Assurance',
    dueDate: '30 Aug 2026',
    status: 'Effectiveness Review',
    progress: 80
  },
  {
    id: 'CAPA-2026-004',
    source: 'Audit Finding',
    relatedTo: 'AUD-2026-006',
    subject: 'Lighting at parking stand not adequate',
    risk: 'Low',
    owner: 'Engineering',
    dueDate: '12 Aug 2026',
    status: 'Closed',
    progress: 100
  }
]);

// Data Grafis Kanan (Didaur ulang untuk komponen SmsKpi)
const capaAging = {
  total: 10,
  totalLabel: 'Open CAPA',
  segments: [
    { label: '0 – 7 days', value: 2, percent: 20, color: '#43A047' },
    { label: '8 – 30 days', value: 4, percent: 40, color: '#FFCA28' },
    { label: '31 – 60 days', value: 2, percent: 20, color: '#FB8C00' },
    { label: '> 60 days', value: 2, percent: 20, color: '#E53935' }
  ]
};

const capaBySource = {
  rows: [
    { label: 'Hazard Report', value: 9, percent: 100, color: '#1E88E5' },
    { label: 'Occurrence Report', value: 6, percent: 66, color: '#43A047' },
    { label: 'Inspection Finding', value: 4, percent: 44, color: '#FFCA28' },
    { label: 'Audit Finding', value: 3, percent: 33, color: '#8E24AA' },
    { label: 'FRAT / Risk Assessment', value: 2, percent: 22, color: '#00ACC1' },
    { label: 'Other', value: 1, percent: 11, color: '#757575' }
  ]
};

// Helpers pewarnaan
function riskColor(level: string) {
  return { Low: 'success', Medium: 'warning', High: 'error' }[level] || 'grey';
}

function statusColor(status: string) {
  return (
    {
      Identified: 'grey',
      Assigned: 'warning',
      'In Progress': 'info',
      'Pending Verification': 'deep-purple-accent-1',
      'Effectiveness Review': 'deep-purple-accent-1',
      Closed: 'success'
    }[status] || 'grey'
  );
}

// Simulasi logic sederhana untuk Overdue text color merah
function isOverdue(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length < 3) return false;
  const day = parseInt(parts[0]);
  const month = parts[1];
  if (month === 'Aug' && day < 21) return true;
  return false;
}
</script>

<style scoped>
/* Membuat Kanban Board responsif dan dapat di-scroll horizontal secara mulus */
.kanban-container {
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: thin;
}
.kanban-container::-webkit-scrollbar {
  height: 6px;
}
.kanban-container::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}
.kanban-col {
  min-width: 250px;
  flex: 1 1 0%;
  max-width: 300px;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Scrollbar table */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}
</style>
