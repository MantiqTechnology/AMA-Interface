<script setup lang="ts">
import { provideStationOperationsContext } from '../../features/station-operations/composables/useStationOperationsContext';

const route = useRoute();
const isNetworkDashboard = computed(() => route.path === '/flights/station-operations/network');
const context = await provideStationOperationsContext({ syncRoute: !isNetworkDashboard.value });

const legacyTabRoutes: Record<string, string> = {
  flights: '/flights/station-operations/flights',
  services: '/flights/station-operations/services',
  verification: '/flights/station-operations/verification',
  'actual-closure': '/flights/station-operations/actual-closure',
  maintenance: '/flights/station-operations/maintenance',
  costs: '/flights/station-operations/costs',
  reports: '/flights/station-operations/reports',
  audit: '/flights/station-operations/audit'
};

if (route.path === '/flights/station-operations') {
  if (typeof route.query.flightId === 'string') {
    const query = { ...route.query };
    const flightId = route.query.flightId;
    delete query.flightId;
    await navigateTo({ path: `/flights/station-operations/${flightId}`, query }, { replace: true });
  } else if (typeof route.query.tab === 'string' && legacyTabRoutes[route.query.tab]) {
    const query = { ...route.query };
    const target = legacyTabRoutes[route.query.tab];
    delete query.tab;
    await navigateTo({ path: target, query }, { replace: true });
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <NuxtPage v-if="isNetworkDashboard" />
    <template v-else>
      <ShellStationOperationsHeader
        :station-code="context.selectedStationCode.value"
        :operational-date="context.operationalDateModel.value"
        :station-options="context.stationOptions.value"
        :selected-station-label="context.selectedStationLabel.value"
        :can-change-station="context.canChangeStation.value"
        :can-read-assets="context.canReadAssets.value"
        :last-updated="context.lastUpdated.value"
        :refreshing="context.refreshing.value"
        @update:station-code="context.selectedStationCode.value = $event"
        @update:operational-date="context.operationalDateModel.value = $event"
        @refresh="context.refreshCurrentPage"
      />

      <ShellStationOperationsTabs
        :station-code="context.selectedStationCode.value"
        :operational-date="context.operationalDateIso.value"
      />

      <ShellStationOperationsFeedback
        :error="context.error.value"
        :action-error="context.actionError.value"
        :action-success="context.actionSuccess.value"
        @retry="context.refreshCurrentPage"
        @clear-action-error="context.actionError.value = ''"
        @update:action-success="context.actionSuccess.value = $event"
      />

      <NuxtPage />
    </template>
  </VContainer>
</template>
