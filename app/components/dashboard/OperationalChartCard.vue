<script setup lang="ts">
import type { DashboardSource } from '#shared/contracts/operational-dashboards';

defineProps<{
  title: string;
  description: string;
  source: DashboardSource;
  empty?: boolean;
  emptyText?: string;
}>();
</script>

<template>
  <VCard border class="operational-chart-card h-100">
    <div class="operational-chart-card__header">
      <div>
        <h2 class="text-subtitle-1 font-weight-bold">{{ title }}</h2>
        <p class="mt-1 text-caption text-text-secondary">{{ description }}</p>
      </div>
      <slot name="header" />
    </div>
    <VDivider />
    <div v-if="empty" class="operational-chart-card__empty">
      <VIcon icon="mdi-chart-box-outline" size="34" />
      <span>{{ emptyText ?? 'Belum ada data pada periode ini.' }}</span>
    </div>
    <div v-else class="operational-chart-card__body"><slot /></div>
    <VDivider />
    <div class="operational-chart-card__footer">
      <span>Data diperoleh dari record kanonis</span>
      <VBtn
        v-if="source.href"
        append-icon="mdi-open-in-new"
        class="px-0"
        color="secondary"
        size="small"
        :href="source.href"
        variant="text"
      >
        {{ source.label }}
      </VBtn>
      <VChip v-else prepend-icon="mdi-lock-outline" size="small" variant="tonal">
        Source restricted
      </VChip>
    </div>
  </VCard>
</template>

<style scoped>
.operational-chart-card {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
}
.operational-chart-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
}
.operational-chart-card__body {
  min-width: 0;
  padding: 12px 16px 8px;
}
.operational-chart-card__empty {
  min-height: 250px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.82rem;
}
.operational-chart-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 5px 16px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
}
</style>
