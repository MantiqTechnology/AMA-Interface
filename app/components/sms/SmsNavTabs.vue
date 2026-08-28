<!-- file: app/components/sms/SmsNavTabs.vue -->
<template>
  <VTabs :model-value="activeTab" color="primary" class="mb-6 border-b">
    <VTab to="/sms/Dashboard" value="dashboard" class="text-none font-weight-bold">
      <VIcon icon="mdi-view-dashboard-outline" size="18" class="mr-2" /> Overview
    </VTab>
    <VTab to="/sms/Reporting" value="reporting" class="text-none font-weight-medium">
      <VIcon icon="mdi-file-document-edit-outline" size="18" class="mr-2" /> Hazard Reporting
    </VTab>
    <VTab to="/sms/Frat" value="frat" class="text-none font-weight-medium">
      <VIcon icon="mdi-calculator-variant-outline" size="18" class="mr-2" /> Flight Risk (FRAT)
    </VTab>
    <VTab to="/sms/Capa" value="capa" class="text-none font-weight-medium">
      <VIcon icon="mdi-clipboard-check-multiple-outline" size="18" class="mr-2" /> CAPA
    </VTab>
    <VTab to="/sms/EmergencyResponse" value="emergency" class="text-none font-weight-medium">
      <VIcon icon="mdi-ambulance" size="18" class="mr-2" /> Emergency & Response
    </VTab>
    <VTab to="/sms/SafetyAssurance" value="assurance" class="text-none font-weight-medium">
      <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
    </VTab>
    <VTab to="/sms/SpiAnalytics" value="spi" class="text-none font-weight-medium">
      <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
    </VTab>
    <VTab to="/sms/Communication" value="communication" class="text-none font-weight-medium">
      <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
    </VTab>
  </VTabs>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    activeTab?: string;
  }>(),
  {
    activeTab: ''
  }
);
</script>
