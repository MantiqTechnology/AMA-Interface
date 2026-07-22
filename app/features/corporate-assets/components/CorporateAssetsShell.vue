<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
const route = useRoute();
const tabs = [
  { label: 'Overview', to: '/asset-management/overview', icon: 'mdi-view-dashboard-outline' },
  { label: 'Asset Register', to: '/asset-management/register', icon: 'mdi-clipboard-list-outline' },
  {
    label: 'Maintenance Queue',
    to: '/asset-management/maintenance',
    icon: 'mdi-wrench-clock-outline'
  }
];
const active = computed(() => tabs.find((tab) => route.path.startsWith(tab.to))?.to ?? null);
</script>

<template>
  <VContainer fluid class="pa-4 pa-md-6">
    <div class="d-flex flex-wrap align-end ga-3 mb-4">
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">Corporate Assets</div>
        <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
        <p v-if="description" class="text-body-2 text-medium-emphasis mb-0">{{ description }}</p>
      </div>
      <VSpacer />
      <slot name="actions" />
    </div>
    <VTabs :model-value="active" class="mb-5" color="primary" show-arrows>
      <VTab v-for="tab in tabs" :key="tab.to" :to="tab.to" :value="tab.to" :prepend-icon="tab.icon">
        {{ tab.label }}
      </VTab>
    </VTabs>
    <slot />
  </VContainer>
</template>
