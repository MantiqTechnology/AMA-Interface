<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: 'Filter inventory'
  }
);
</script>

<template>
  <VCard border class="inventory-filter-bar mb-4" :aria-label="label">
    <VCardText class="inventory-filter-bar__body">
      <slot />
    </VCardText>
  </VCard>
</template>

<style scoped>
.inventory-filter-bar {
  border-radius: 8px;
}

.inventory-filter-bar__body {
  padding: 14px 16px;
}
</style>
