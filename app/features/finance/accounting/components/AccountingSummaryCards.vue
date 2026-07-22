<script setup lang="ts">
import type { AccountingTab } from '../workbench';

const props = defineProps<{
  pendingReview: number;
  postedJournals: number;
  openExceptions: number;
  assetComponents: number;
}>();

const emit = defineEmits<{ select: [tab: AccountingTab, filter?: string] }>();

const cards = computed(() => [
  {
    label: 'Pending review',
    value: props.pendingReview,
    icon: 'mdi-inbox-arrow-down-outline',
    tone: 'pending',
    tab: 'posting-queue' as const
  },
  {
    label: 'Posted journals',
    value: props.postedJournals,
    icon: 'mdi-check-circle-outline',
    tone: 'posted',
    tab: 'general-journal' as const,
    filter: 'POSTED'
  },
  {
    label: 'Open exceptions',
    value: props.openExceptions,
    icon: 'mdi-alert-outline',
    tone: 'exception',
    tab: 'exceptions' as const,
    filter: 'OPEN'
  },
  {
    label: 'Asset components',
    value: props.assetComponents,
    icon: 'mdi-airplane-cog',
    tone: 'asset',
    tab: 'asset-components' as const
  }
]);
</script>

<template>
  <div class="summary-grid" aria-label="Accounting work summary">
    <button
      v-for="card in cards"
      :key="card.label"
      class="summary-card"
      :class="`summary-card--${card.tone}`"
      type="button"
      @click="emit('select', card.tab, card.filter)"
    >
      <span class="summary-icon" aria-hidden="true"><VIcon :icon="card.icon" size="21" /></span>
      <span class="summary-copy">
        <strong>{{ card.value }}</strong>
        <span>{{ card.label }}</span>
      </span>
      <VIcon class="summary-arrow" icon="mdi-chevron-right" size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.summary-card {
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 10px;
  color: rgb(var(--v-theme-text-primary));
  cursor: pointer;
  display: flex;
  gap: 12px;
  min-height: 82px;
  padding: 12px 14px;
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  width: 100%;
}
.summary-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.38);
  box-shadow: 0 4px 14px rgba(8, 43, 73, 0.07);
  transform: translateY(-1px);
}
.summary-card:focus-visible {
  outline: 3px solid rgba(var(--v-theme-info), 0.3);
  outline-offset: 2px;
}
.summary-icon {
  align-items: center;
  border-radius: 50%;
  display: inline-flex;
  flex: 0 0 40px;
  height: 40px;
  justify-content: center;
}
.summary-card--pending .summary-icon {
  background: rgba(40, 110, 158, 0.12);
  color: #0b2d4d;
}
.summary-card--posted .summary-icon,
.summary-card--asset .summary-icon {
  background: rgba(19, 138, 138, 0.12);
  color: #0d7373;
}
.summary-card--exception .summary-icon {
  background: rgba(242, 181, 68, 0.2);
  color: #8a5a00;
}
.summary-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.summary-copy strong {
  font-size: 1.55rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.summary-copy span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  margin-top: 2px;
}
.summary-arrow {
  color: rgb(var(--v-theme-text-secondary));
}
@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 420px) {
  .summary-card {
    min-height: 74px;
    padding: 10px;
  }
  .summary-icon {
    flex-basis: 36px;
    height: 36px;
  }
}
</style>
