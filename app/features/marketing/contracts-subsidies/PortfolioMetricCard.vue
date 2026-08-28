<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
}>();
</script>

<template>
  <VCard class="metric-card h-100" border flat>
    <VCardText class="d-flex align-start ga-4 pa-4">
      <div
        class="metric-card__icon"
        :style="{ color, backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)` }"
      >
        <VIcon :icon="icon" size="25" />
      </div>
      <div class="min-w-0">
        <div class="text-body-2 text-medium-emphasis">{{ label }}</div>
        <div class="metric-card__value mt-1 text-h6 font-weight-bold">{{ value }}</div>
        <div class="mt-1 text-caption" :style="{ color }">{{ detail }}</div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.metric-card {
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 3%);
}
.metric-card__icon {
  display: grid;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 9px;
}
.metric-card__value {
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
</style>
