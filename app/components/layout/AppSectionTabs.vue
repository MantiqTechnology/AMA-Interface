<script setup lang="ts">
import type { SectionTabItem } from '../../types/section-tabs';

const props = defineProps<{
  items: SectionTabItem[];
}>();

const route = useRoute();

const activeTab = computed(() => {
  // Berikan tipe SectionTabItem pada parameter 'item'
  const exact = props.items.find((item: SectionTabItem) => item.to === route.path);
  if (exact) return exact.to;

  const prefixMatches = props.items
    .filter((item: SectionTabItem) => route.path.startsWith(`${item.to}/`))
    // Berikan tipe SectionTabItem pada parameter 'a' dan 'b'
    .sort((a: SectionTabItem, b: SectionTabItem) => b.to.length - a.to.length);

  return prefixMatches[0]?.to ?? props.items[0]?.to;
});
</script>

<template>
  <nav class="section-tabs mb-4" aria-label="Section navigation">
    <VTabs
      :model-value="activeTab"
      color="primary"
      density="comfortable"
      show-arrows
      class="section-tabs__tabs"
    >
      <VTab
        v-for="item in items"
        :key="item.to"
        :value="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
      >
        {{ item.label }}
      </VTab>
    </VTabs>
  </nav>
</template>

<style scoped>
.section-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 1));
}

.section-tabs__tabs :deep(.v-tab) {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
  font-size: 0.875rem;
  min-width: auto;
  padding-inline: 16px;
}

.section-tabs__tabs :deep(.v-tab .v-icon) {
  opacity: 0.85;
}
</style>
