<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
const route = useRoute();
const { can } = useAuthorization();
const tabs = computed(() =>
  [
    { label: 'Overview', to: '/asset-management/overview', icon: 'mdi-view-dashboard-outline' },
    {
      label: 'Asset Register',
      to: '/asset-management/register',
      icon: 'mdi-clipboard-list-outline'
    },
    {
      label: 'Assignments',
      to: '/asset-management/assignment',
      icon: 'mdi-account-arrow-right-outline'
    },
    { label: 'Movements', to: '/asset-management/movement', icon: 'mdi-swap-horizontal' },
    {
      label: 'Maintenance Queue',
      to: '/asset-management/maintenance',
      icon: 'mdi-wrench-clock-outline'
    },
    { label: 'Audits', to: '/asset-management/audit', icon: 'mdi-clipboard-check-outline' },
    {
      label: 'Finance',
      to: '/asset-management/finance',
      icon: 'mdi-calculator-variant-outline',
      visible: can('asset.finance.read').allowed
    }
  ].filter((tab) => tab.visible !== false)
);
const active = computed(() => tabs.value.find((tab) => route.path.startsWith(tab.to))?.to ?? null);
</script>

<template>
  <VContainer fluid class="pa-4 pa-md-6">
    <div class="asset-heading d-flex flex-wrap align-end ga-3 mb-4">
      <div>
        <div class="asset-heading__eyebrow">
          <VIcon icon="mdi-radar" size="14" />
          Corporate asset control
        </div>
        <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
        <p v-if="description" class="text-body-2 text-medium-emphasis mb-0">{{ description }}</p>
      </div>
      <VSpacer />
      <slot name="actions" />
    </div>
    <VTabs :model-value="active" class="asset-tabs mb-5" color="primary" show-arrows>
      <VTab v-for="tab in tabs" :key="tab.to" :to="tab.to" :value="tab.to" :prepend-icon="tab.icon">
        {{ tab.label }}
      </VTab>
    </VTabs>
    <slot />
  </VContainer>
</template>

<style scoped>
.asset-heading {
  position: relative;
  padding: 18px 20px;
  overflow: hidden;
  background:
    linear-gradient(100deg, rgba(39, 68, 154, 0.1), transparent 52%), rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.asset-heading::after {
  position: absolute;
  top: -52px;
  right: 8%;
  width: 180px;
  height: 180px;
  content: '';
  background: repeating-radial-gradient(
    circle,
    rgba(52, 86, 209, 0.13) 0 1px,
    transparent 1px 12px
  );
  border-radius: 50%;
  pointer-events: none;
}

.asset-heading__eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.asset-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.asset-tabs :deep(.v-tab) {
  min-width: max-content;
  padding-inline: 14px;
}

.asset-tabs :deep(.v-btn__content) {
  gap: 6px;
}

@media (max-width: 600px) {
  .asset-heading {
    padding: 16px;
  }

  .asset-heading h1 {
    font-size: 1.55rem !important;
  }
}
</style>
