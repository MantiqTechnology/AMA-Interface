<template>
  <VCard border class="pa-4 h-100 d-flex flex-column">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ title }}</div>
    <div class="flex-grow-1">
      <div v-for="row in rows" :key="row.label" class="mb-3">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-body-2">{{ row.label }}</span>
          <span class="text-body-2 font-weight-medium">{{ row.value }}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: row.percent + '%', background: row.color }" />
        </div>
      </div>
    </div>
    <div v-if="footnote" class="text-caption text-medium-emphasis mt-1">{{ footnote }}</div>
  </VCard>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  // [{ label, value, percent, color }]
  rows: { type: Array, required: true },
  footnote: { type: String, default: null }
});
</script>

<style scoped>
.bar-track {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>
