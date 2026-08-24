<script setup lang="ts">
import type { OverviewKpi } from '../../types/procurement';

defineProps<{ kpi: OverviewKpi }>();
</script>

<template>
  <VCard border rounded="lg" elevation="0" class="pa-4 kpi-card" height="100%">
    <div class="d-flex justify-space-between align-start">
      <div class="min-w-0">
        <div class="text-caption text-medium-emphasis mb-1 text-truncate">{{ kpi.label }}</div>
        <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
      </div>
      <div class="kpi-icon" :style="{ background: `${kpi.iconColor}1A`, color: kpi.iconColor }">
        <VIcon :icon="kpi.icon" size="20" />
      </div>
    </div>

    <div v-if="kpi.trend" class="text-caption mt-2 d-flex align-center" style="gap: 4px">
      <span
        class="d-flex align-center font-weight-medium"
        :class="{
          'text-success': kpi.trend.tone === 'positive',
          'text-error': kpi.trend.tone === 'negative',
          'text-medium-emphasis': kpi.trend.tone === 'neutral'
        }"
      >
        <VIcon
          :icon="kpi.trend.direction === 'up' ? 'mdi-arrow-up' : kpi.trend.direction === 'down' ? 'mdi-arrow-down' : 'mdi-minus'"
          size="14"
        />
        {{ kpi.trend.label }}
      </span>
    </div>
  </VCard>
</template>

<style scoped>

.kpi-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.min-w-0 {
  min-width: 0;
}
</style>