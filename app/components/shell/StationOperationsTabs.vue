<script setup lang="ts">
import { stationOperationsTabs } from '../../features/station-operations/constants/stationOperationsTabs';

const props = defineProps<{
  stationCode: string;
  operationalDate: string;
}>();

function tabTarget(path: string) {
  return {
    path,
    query: {
      stationCode: props.stationCode,
      date: props.operationalDate
    }
  };
}
</script>

<template>
  <VCard border class="mb-5 overflow-hidden">
    <VTabs color="primary" show-arrows>
      <VTab v-for="tab in stationOperationsTabs" :key="tab.to" :to="tabTarget(tab.to)" exact>
        <VIcon :icon="tab.icon" start />
        {{ tab.label }}
      </VTab>
    </VTabs>
  </VCard>
</template>
