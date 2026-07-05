<script setup lang="ts">
const rail = useState('ama-sidebar-rail', () => false);
const { can } = useAuthorization();

const navItems = computed(() =>
  [
    { label: 'Dashboard', to: '/dashboard', icon: 'mdi-view-dashboard-outline', visible: true },
    {
      label: 'Ops Center',
      to: '/ops/command-center',
      icon: 'mdi-airport',
      visible: can('ops.command_center.view').allowed
    },
    {
      label: 'Requests',
      to: '/ops/flight-requests',
      icon: 'mdi-clipboard-list-outline',
      visible: can('flight_request.read').allowed
    },
    {
      label: 'Following',
      to: '/ops/flight-following',
      icon: 'mdi-radar',
      visible: can('flight.read').allowed
    },
    { label: 'Flights', to: '/flights', icon: 'mdi-airplane', visible: true },
    { label: 'Invoice', to: '/invoices/inv-001', icon: 'mdi-file-document-outline', visible: true },
    {
      label: 'Access',
      to: '/admin/access-demo',
      icon: 'mdi-shield-account-outline',
      visible: can('platform.module.manage').allowed
    }
  ].filter((item) => item.visible)
);

function toggleRail() {
  rail.value = !rail.value;
}
</script>

<template>
  <VNavigationDrawer
    border
    class="bg-surface"
    color="surface"
    permanent
    :rail="rail"
    rail-width="72"
    width="272"
  >
    <div class="flex h-full flex-col">
      <div
        :class="
          rail
            ? 'flex min-h-23 flex-col items-center justify-center gap-1 px-2'
            : 'flex min-h-18 items-center gap-3 px-4'
        "
      >
        <NuxtLink
          :class="
            rail
              ? 'grid h-10 w-10 place-items-center text-decoration-none'
              : 'flex min-w-0 flex-1 items-center gap-3 text-decoration-none'
          "
          to="/dashboard"
        >
          <div
            :class="
              rail
            "
          >
            <vImg :width="68" cover src="https://amapapua.com/files/ama-pt-logo-shaded4.png"></vImg>
          </div>
          <div v-if="!rail" class="min-w-0">
            <div class="text-lg font-bold leading-5 text-brand-primary">AMA</div>
            <div class="text-xs font-semibold uppercase tracking-normal text-text-secondary">
              Ops Interface
            </div>
          </div>
        </NuxtLink>

        <VBtn
          :aria-label="rail ? 'Expand navigation' : 'Minimize navigation'"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          density="comfortable"
          size="small"
          variant="text"
          @click="toggleRail"
        />
      </div>

      <VDivider />

      <VList class="px-2 py-4" density="comfortable" nav>
        <VListItem
          v-for="item in navItems"
          :key="item.to"
          color="primary"
          :prepend-icon="item.icon"
          rounded="lg"
          :title="item.label"
          :to="item.to"
        />
      </VList>

      <div class="mt-auto border-t border-border-default p-3">
        <template v-if="!rail">
          <div class="mb-2 text-xs font-semibold uppercase text-text-secondary">
            Demo Persona
          </div>
          <FeatureDemoPersonaSwitcher />
        </template>

        <VBtn
          v-else
          aria-label="Expand to switch demo persona"
          block
          color="primary"
          icon="mdi-account-switch-outline"
          variant="text"
          @click="rail = false"
        />
      </div>
    </div>
  </VNavigationDrawer>
</template>
