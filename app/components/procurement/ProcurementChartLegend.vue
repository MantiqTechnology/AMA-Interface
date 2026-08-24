<script setup lang="ts">
defineProps<{
  items: { label: string; value: string; color: string }[];
}>();
</script>

<template>
  <ul class="legend">
    <li v-for="item in items" :key="item.label" class="legend__item">
      <span class="legend__dot" :style="{ background: item.color }" />
      <span class="legend__label">{{ item.label }}</span>
      <span class="legend__value">{{ item.value }}</span>
    </li>
  </ul>
</template>

<style scoped>
.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 16px;
  width: 100%;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend__label {
  color: #334155;
}

.legend__value {
  color: #0f172a;
  font-weight: 600;
}
</style>