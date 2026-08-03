<script setup lang="ts">
const route = useRoute();

const tabs = [
  { label: 'Overview', to: '/crm-marketing/dashboard-crm', icon: 'mdi-view-dashboard-outline' },
  { label: 'Leads', to: '/crm-marketing/leads', icon: 'mdi-account-plus-outline' },
  { label: 'Customers', to: '/crm-marketing/customers', icon: 'mdi-domain' },
  { label: 'Tender', to: '/crm-marketing/tender', icon: 'mdi-gavel' },
  { label: 'Promotion', to: '/crm-marketing/promotion', icon: 'mdi-bullhorn-outline' },
  { label: 'Opportunities', to: '/crm-marketing/opportunities', icon: 'mdi-target' },
  { label: 'Activities', to: '/crm-marketing/activities', icon: 'mdi-calendar-check-outline' }
];

const activeTab = computed(() => {
  const found = tabs.find((t) => route.path.startsWith(t.to));
  return found ? found.to : tabs[0].to;
});
</script>

<template>
  <VTabs
    :model-value="activeTab"
    color="primary"
    density="comfortable"
    show-arrows
    class="crm-subnav"
  >
    <VTab
      v-for="tab in tabs"
      :key="tab.to"
      :value="tab.to"
      :to="tab.to"
      :prepend-icon="tab.icon"
      class="text-none"
    >
      {{ tab.label }}
    </VTab>
  </VTabs>
</template>

<style scoped>
.crm-subnav {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
}
</style>
