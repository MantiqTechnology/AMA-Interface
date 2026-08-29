<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    icon?: string;
  }>(),
  {
    description: '',
    icon: 'mdi-package-variant-closed-check'
  }
);
</script>

<template>
  <VCard border class="inventory-empty-state">
    <VCardText class="inventory-empty-state__body">
      <VIcon class="mb-3" :icon="icon" size="38" />
      <h2 class="inventory-empty-state__title">{{ title }}</h2>
      <p v-if="description" class="inventory-empty-state__description">{{ description }}</p>
      <div v-if="$slots.actions" class="mt-4">
        <slot name="actions" />
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.inventory-empty-state {
  border-radius: 8px;
}

.inventory-empty-state__body {
  padding: 42px 20px;
  text-align: center;
}

.inventory-empty-state__title {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 750;
  line-height: 1.25;
  text-wrap: balance;
}

.inventory-empty-state__description {
  max-width: 56ch;
  margin: 8px auto 0;
  color: rgba(var(--v-theme-on-surface), 0.64);
  line-height: 1.45;
}
</style>
