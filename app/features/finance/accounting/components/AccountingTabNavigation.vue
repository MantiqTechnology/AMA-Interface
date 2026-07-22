<script setup lang="ts">
import type { AccountingTab } from '../workbench';

const props = defineProps<{
  modelValue: AccountingTab;
  queueCount: number;
  exceptionCount: number;
  assetCount: number;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: AccountingTab] }>();

const tabs = [
  {
    value: 'posting-queue',
    label: 'Posting Queue',
    icon: 'mdi-inbox-arrow-down-outline',
    count: 'queue'
  },
  { value: 'general-journal', label: 'General Journal', icon: 'mdi-file-edit-outline' },
  { value: 'general-ledger', label: 'General Ledger', icon: 'mdi-book-open-page-variant-outline' },
  { value: 'exceptions', label: 'Exceptions', icon: 'mdi-alert-outline', count: 'exceptions' },
  { value: 'policies', label: 'Policies', icon: 'mdi-shield-check-outline' },
  {
    value: 'asset-components',
    label: 'Asset Components',
    icon: 'mdi-airplane-cog',
    count: 'assets'
  }
] as const;

function countFor(key?: string) {
  if (key === 'queue') return props.queueCount;
  if (key === 'exceptions') return props.exceptionCount;
  if (key === 'assets') return props.assetCount;
  return null;
}
</script>

<template>
  <nav class="tab-rail" aria-label="Accounting workbench sections">
    <VTabs
      :model-value="modelValue"
      color="primary"
      show-arrows
      @update:model-value="emit('update:modelValue', $event as AccountingTab)"
    >
      <VTab v-for="tab in tabs" :key="tab.value" class="workbench-tab" :value="tab.value">
        <VIcon :icon="tab.icon" size="18" />
        <span>{{ tab.label }}</span>
        <span
          v-if="countFor(tab.count) !== null"
          class="tab-count"
          :class="{ 'tab-count--warning': tab.value === 'exceptions' && exceptionCount > 0 }"
          :aria-label="`${countFor(tab.count)} items`"
        >{{ countFor(tab.count) }}</span>
      </VTab>
    </VTabs>
  </nav>
</template>

<style scoped>
.tab-rail {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 10px;
  overflow: hidden;
}
.tab-rail :deep(.v-tabs) {
  min-height: 54px;
}
.tab-rail :deep(.v-slide-group__content) {
  gap: 4px;
  padding: 5px 6px 0;
}
.workbench-tab {
  border-radius: 7px 7px 0 0;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0;
  min-height: 48px;
  padding-inline: 14px;
  text-transform: none;
}
.workbench-tab :deep(.v-btn__content) {
  gap: 7px;
}
.workbench-tab.v-tab--selected {
  background: rgba(40, 110, 158, 0.1);
  color: #0b2d4d;
}
.tab-rail :deep(.v-tab__slider) {
  height: 3px;
}
.tab-count {
  align-items: center;
  background: rgba(8, 43, 73, 0.1);
  border-radius: 9px;
  color: #0b2d4d;
  display: inline-flex;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  height: 18px;
  justify-content: center;
  min-width: 18px;
  padding: 0 5px;
}
.tab-count--warning {
  background: rgba(242, 181, 68, 0.25);
  color: #775000;
}
</style>
