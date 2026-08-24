<script setup lang="ts">
interface ProcurementItem {
  label: string;
  value: number;
  target?: number;
  displayValue: string;
  color?: string;
}

const props = defineProps<{
  items: ProcurementItem[];
}>();

const maxValue = computed(() => 
  Math.max(...props.items.map((item: ProcurementItem) => 
    Math.max(item.value, item.target ?? 0)
  )) || 1
);
</script>

<template>
  <div class="bar-list">
    <div v-for="item in items" :key="item.label" class="bar-row">
      <div class="bar-row__top">
        <span class="bar-row__label">{{ item.label }}</span>
        <span class="bar-row__value">{{ item.displayValue }}</span>
      </div>
      <div class="bar-row__track">
        <div
          class="bar-row__fill"
          :style="{ width: `${(item.value / maxValue) * 100}%`, background: item.color ?? '#0F4C81' }"
        />
        <div
          v-if="item.target"
          class="bar-row__target"
          :style="{ left: `${(item.target / maxValue) * 100}%` }"
          :title="`Target: ${item.target}`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-row__top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}

.bar-row__label {
  color: #334155;
  font-weight: 500;
}

.bar-row__value {
  color: #0f172a;
  font-weight: 500;
}

.bar-row__track {
  position: relative;
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: visible;
}

.bar-row__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bar-row__target {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: #dc2626;
}
</style>
