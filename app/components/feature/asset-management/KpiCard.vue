<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon: string;
  iconColor: string;
  iconBg: string;
  trendValue?: string;
  trendUp?: boolean;
}>();
</script>

<template>
  <VCard border rounded="lg" elevation="0" class="pa-4 kpi-card" height="100%">
    <div class="d-flex justify-space-between align-start">
      <div class="min-w-0">
        <div class="text-caption text-medium-emphasis mb-1 text-truncate">{{ label }}</div>
        <div class="text-h5 font-weight-bold">{{ value }}</div>
      </div>
      <div class="kpi-icon" :style="{ background: iconBg, color: iconColor }">
        <VIcon :icon="icon" size="20" />
      </div>
    </div>

    <div v-if="trendValue" class="text-caption mt-2 d-flex align-center" style="gap: 4px">
      <span class="text-medium-emphasis">vs last month</span>
      <span
        class="d-flex align-center font-weight-medium"
        :class="trendUp ? 'text-success' : 'text-error'"
      >
        <VIcon :icon="trendUp ? 'mdi-arrow-up' : 'mdi-arrow-down'" size="14" />
        {{ trendValue }}
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
