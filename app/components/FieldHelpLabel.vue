<script setup lang="ts">
defineProps<{
  label: string;
  help: string;
}>();

const { locale } = useI18n();
const ariaLabel = computed(() => (locale.value === 'id' ? 'Bantuan field' : 'Field help'));
</script>

<template>
  <span class="field-help-label">
    <span>{{ label }}</span>
    <VTooltip :text="help" location="top" max-width="320">
      <template #activator="{ props }">
        <button
          v-bind="props"
          :aria-label="ariaLabel"
          class="field-help-label__button"
          type="button"
        >
          <VIcon class="field-help-label__icon" icon="mdi-help-circle-outline" size="16" />
        </button>
      </template>
    </VTooltip>
  </span>
</template>

<style scoped>
.field-help-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
  vertical-align: middle;
}
.field-help-label__button {
  position: relative;
  z-index: 2;
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--v-theme-text-secondary));
  cursor: help;
  pointer-events: auto;
}
.field-help-label__button:hover,
.field-help-label__button:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-primary));
  outline: none;
}
.field-help-label__icon {
  pointer-events: none;
}
</style>
