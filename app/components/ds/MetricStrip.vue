<script setup lang="ts">
export type OperationalMetric = {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  icon?: string;
  to?: string;
  detail?: string;
};

defineProps<{ items: OperationalMetric[] }>();
</script>

<template>
  <div class="metric-strip">
    <component
      :is="item.to ? 'a' : 'div'"
      v-for="item in items"
      :key="item.label"
      class="metric-strip__item"
      :class="`metric-strip__item--${item.tone ?? 'neutral'}`"
      :href="item.to"
    >
      <div class="metric-strip__label">
        <VIcon v-if="item.icon" :icon="item.icon" size="17" />
        {{ item.label }}
      </div>
      <strong class="metric-strip__value">{{ item.value }}</strong>
      <span v-if="item.detail" class="metric-strip__detail">{{ item.detail }}</span>
    </component>
  </div>
</template>

<style scoped>
.metric-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.metric-strip__item {
  min-width: 0;
  padding: 14px 16px;
  border-left: 3px solid transparent;
  color: inherit;
  text-decoration: none;
}
.metric-strip__item + .metric-strip__item {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.metric-strip__item--success {
  border-left-color: rgb(var(--v-theme-success));
}
.metric-strip__item--warning {
  border-left-color: rgb(var(--v-theme-warning));
}
.metric-strip__item--danger {
  border-left-color: rgb(var(--v-theme-error));
}
.metric-strip__label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.76rem;
  font-weight: 700;
}
.metric-strip__value {
  display: block;
  margin-top: 7px;
  font-size: 1.45rem;
  font-variant-numeric: tabular-nums;
}
.metric-strip__detail {
  display: block;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
  line-height: 1.35;
}
@media (min-width: 700px) {
  .metric-strip__item + .metric-strip__item {
    border-top: 0;
    border-inline-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
