<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

defineProps<{
  title?: string;
  subtitle?: string;
  icon?: string;
}>();
</script>

<template>
  <VCard v-bind="$attrs" border class="inventory-panel">
    <VCardTitle v-if="title || $slots.actions" class="inventory-panel__header">
      <div class="inventory-panel__title-block">
        <div class="inventory-panel__title-row">
          <VIcon v-if="icon" :icon="icon" size="20" />
          <span v-if="title" class="inventory-panel__title">{{ title }}</span>
        </div>
        <p v-if="subtitle" class="inventory-panel__subtitle">{{ subtitle }}</p>
      </div>
      <VSpacer />
      <div v-if="$slots.actions" class="inventory-panel__actions">
        <slot name="actions" />
      </div>
    </VCardTitle>
    <VDivider v-if="title || $slots.actions" />
    <slot />
  </VCard>
</template>

<style scoped>
.inventory-panel {
  overflow: hidden;
  border-radius: 8px;
}

.inventory-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 12px 16px;
}

.inventory-panel__title-block {
  min-width: 0;
}

.inventory-panel__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 1rem;
  font-weight: 750;
  line-height: 1.2;
}

.inventory-panel__title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.inventory-panel__subtitle {
  margin: 3px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.78rem;
  font-weight: 400;
  line-height: 1.35;
}

.inventory-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
</style>
