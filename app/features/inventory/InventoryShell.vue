<script setup lang="ts">
defineProps<{
  title: string;
  eyebrow?: string;
  description?: string;
  updatedAt?: string | null;
}>();

const route = useRoute();
const tabs = [
  { label: 'Ringkasan', to: '/inventory', icon: 'mdi-view-dashboard-outline' },
  { label: 'Stok', to: '/inventory/stock', icon: 'mdi-layers-triple-outline' },
  { label: 'Kebutuhan MRO', to: '/inventory/maintenance-demand', icon: 'mdi-airplane-wrench' },
  { label: 'Katalog Part', to: '/inventory/parts', icon: 'mdi-cog-outline' },
  { label: 'Gudang & Bin', to: '/inventory/warehouses', icon: 'mdi-warehouse' },
  { label: 'Karantina', to: '/inventory/quarantine', icon: 'mdi-shield-alert-outline' },
  { label: 'Tool Control', to: '/inventory/tools', icon: 'mdi-wrench-clock-outline' },
  { label: 'Core Returns', to: '/inventory/core-returns', icon: 'mdi-backup-restore' },
  { label: 'NavDB & Software', to: '/inventory/software-navdb', icon: 'mdi-satellite-variant' },
  { label: 'Fly Away Kits', to: '/inventory/fly-away-kits', icon: 'mdi-briefcase-variant-outline' },
  { label: 'Permintaan', to: '/inventory/purchase-requests', icon: 'mdi-clipboard-text-outline' },
  { label: 'Order', to: '/inventory/purchase-orders', icon: 'mdi-file-sign' },
  { label: 'Penerimaan', to: '/inventory/receipts', icon: 'mdi-truck-check-outline' },
  { label: 'Pergerakan', to: '/inventory/movements', icon: 'mdi-swap-horizontal' },
  { label: 'Repairables', to: '/inventory/repairables', icon: 'mdi-wrench-cog-outline' }
];

const activeTab = computed(() => {
  if (route.path === '/inventory') return '/inventory';
  return tabs.find((tab) => tab.to !== '/inventory' && route.path.startsWith(tab.to))?.to;
});
</script>

<template>
  <VContainer class="inventory-shell px-3 py-5 md:px-4" fluid>
    <DsOperationalPageHeader
      class="mb-4"
      :description="description"
      :eyebrow="eyebrow ?? 'Inventory / Spare Part'"
      :title="title"
      :updated-at="updatedAt"
    >
      <template #actions><slot name="actions" /></template>
    </DsOperationalPageHeader>

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
</style>
