<template>
  <!-- Bagian Header & Navigasi: Dibuat sama persis dengan Frat.vue -->
  <VContainer fluid class="pb-0">
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Safety Performance Dashboard</h1>
      <div class="text-caption text-medium-emphasis">Safety Management System (SMS) Overview</div>
    </div>

    <!-- VTabs yang sama persis konfigurasinya dengan Frat.vue -->
    <VTabs v-model="activeTab" color="primary">
      <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-bold">
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

    <!-- Toolbar Filter -->
    <VCard border class="pa-3 mb-4 mt-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField
          v-model="filters.dateRange"
          label="Date"
          prepend-inner-icon="mdi-calendar-range"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="filters.station"
          label="Station"
          :items="['All Station']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <VSelect
          v-model="filters.aircraft"
          label="Aircraft"
          :items="['All Aircraft']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <VSelect
          v-model="filters.riskLevel"
          label="Risk Level"
          :items="['All Risk']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />

        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          @click="handleRefresh"
          class="text-none"
          >Refresh Data</VBtn
        >
      </div>
    </VCard>
  </VContainer>

  <!-- Konten Utama Dashboard -->
  <VContainer fluid class="pt-0">
    <!-- Row 1: KPI Cards -->
    <VRow class="mb-4">
      <VCol
        v-for="(kpi, i) in kpis"
        :key="i"
        cols="12"
        sm="6"
        md="3"
        xl="auto"
        style="flex: 1 1 0%"
      >
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
        <VCard border>
          <div class="pa-4 border-b d-flex justify-space-between align-center">
            <div class="font-weight-bold">Top Safety Findings</div>
            <VBtn variant="text" color="primary" class="text-none">View All Reports</VBtn>
          </div>
          <SmsFindingsTable :items="findings" />
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Tidak butuh definePageMeta karena layout sudah terdeteksi otomatis seperti Frat.vue

const activeTab = ref('overview');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');

const filters = reactive({
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  aircraft: 'All Aircraft',
  riskLevel: 'All Risk Level'
});

// Mengambil data mockup
const {
  kpis,
  hazardTrend,
  hazardByRiskLevel,
  hazardBySource,
  hazardByStation,
  fratSummary,
  capaStatus,
  capaAging,
  spiIndicators,
  findings
} = useSmsMockData();

const handleRefresh = () => {
  lastUpdated.value =
    new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
};
</script>

<style scoped>
.h-100 {
  height: 100% !important;
}
</style>
