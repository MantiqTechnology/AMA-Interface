<script setup lang="ts">
defineProps<{
  title: string;
  eyebrow?: string;
}>();

const route = useRoute();
const tabs = [
  { label: 'Overview', to: '/inventory', icon: 'mdi-view-dashboard-outline' },
  { label: 'Stock', to: '/inventory/stock', icon: 'mdi-layers-triple-outline' },
  { label: 'Parts', to: '/inventory/parts', icon: 'mdi-cog-outline' },
  { label: 'Warehouses', to: '/inventory/warehouses', icon: 'mdi-warehouse' },
  { label: 'Requests', to: '/inventory/purchase-requests', icon: 'mdi-clipboard-text-outline' },
  { label: 'Orders', to: '/inventory/purchase-orders', icon: 'mdi-file-sign' },
  { label: 'Receipts', to: '/inventory/receipts', icon: 'mdi-truck-check-outline' },
  { label: 'Movements', to: '/inventory/movements', icon: 'mdi-swap-horizontal' },
  { label: 'Repairables', to: '/inventory/repairables', icon: 'mdi-wrench-cog-outline' }
];

const activeTab = computed(() => {
  if (route.path === '/inventory') return '/inventory';
  return tabs.find((tab) => tab.to !== '/inventory' && route.path.startsWith(tab.to))?.to;
});
</script>

<template>
  <VContainer class="inventory-shell px-3 py-5 md:px-4" fluid>
    <div class="mb-4 d-flex flex-wrap align-end ga-3">
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">
          {{ eyebrow ?? 'Inventory / Spare Parts' }}
        </div>
        <h1 class="text-h4 font-weight-bold text-text-primary">{{ title }}</h1>
      </div>
      <VSpacer />
      <slot name="actions" />
    </div>

    <VTabs
      :model-value="activeTab"
      class="mb-5 inventory-tabs"
      color="primary"
      density="comfortable"
      show-arrows
    >
      <VTab
        v-for="tab in tabs"
        :key="tab.to"
        :prepend-icon="tab.icon"
        :text="tab.label"
        :to="tab.to"
        :value="tab.to"
      />
    </VTabs>

    <slot />
  </VContainer>
</template>

<style scoped>
.inventory-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 600px) {
  .inventory-shell {
    overflow-x: hidden;
  }
}
</style>
