<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  updatedAt?: string | null;
}>();
</script>

<template>
  <header class="operational-header">
    <div class="operational-header__copy">
      <div v-if="eyebrow" class="operational-header__eyebrow">{{ eyebrow }}</div>
      <h1 class="operational-header__title">{{ title }}</h1>
      <p v-if="description" class="operational-header__description">{{ description }}</p>
    </div>
    <div class="operational-header__controls">
      <slot name="context" />
      <div class="operational-header__actions"><slot name="actions" /></div>
      <div v-if="updatedAt" class="operational-header__updated" aria-live="polite">
        <VIcon icon="mdi-clock-outline" size="16" />
        Diperbarui {{ updatedAt }}
      </div>
    </div>
  </header>
</template>

<style scoped>
.operational-header {
  display: grid;
  gap: 20px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: 4px solid rgb(var(--v-theme-secondary));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.operational-header__copy {
  min-width: 0;
}
.operational-header__eyebrow {
  color: rgb(var(--v-theme-secondary));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.operational-header__title {
  margin: 3px 0 0;
  font-size: clamp(1.45rem, 2vw, 2rem);
  font-weight: 750;
  line-height: 1.15;
}
.operational-header__description {
  max-width: 68ch;
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  line-height: 1.5;
}
.operational-header__controls {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.operational-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.operational-header__updated {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
}
@media (min-width: 1280px) {
  .operational-header {
    grid-template-columns: minmax(0, 1fr) minmax(460px, auto);
    align-items: center;
  }
  .operational-header__controls {
    justify-items: end;
  }
}
</style>
