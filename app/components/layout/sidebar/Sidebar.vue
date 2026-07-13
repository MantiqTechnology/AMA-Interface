<script setup lang="ts">
import { useDisplay } from 'vuetify';

const rail = useState('ama-sidebar-rail', () => false);
const mobileDrawer = useState('ama-sidebar-mobile-open', () => false);
const { can } = useAuthorization();
const route = useRoute();
const { mdAndUp } = useDisplay();

const openedGroups = ref<string[]>([]);

const drawerOpen = computed({
  get: () => mdAndUp.value || mobileDrawer.value,
  set: (value: boolean) => {
    mobileDrawer.value = value;
  }
});

type NavChild = {
  label: string;
  to: string;
  icon: string;
  visible: boolean;
};

type NavItem = {
  label: string;
  to?: string;
  icon: string;
  visible: boolean;
  children?: NavChild[];
};

const masterDataVisible = computed(() => can('platform.module.manage').allowed);

const navItems = computed<NavItem[]>(() =>
  [
    { label: 'Dashboard', to: '/dashboard', icon: 'mdi-view-dashboard-outline', visible: true },
    {
      label: 'Ops',
      icon: 'mdi-airport',
      visible:
        can('ops.command_center.view').allowed ||
        can('flight_request.read').allowed ||
        can('flight.read').allowed ||
        masterDataVisible.value,
      children: [
        {
          label: 'Command Center',
          to: '/ops/command-center',
          icon: 'mdi-monitor-dashboard',
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
        {
          label: 'Stations',
          to: '/master-data/stations',
          icon: 'mdi-airport',
          visible: masterDataVisible.value
        },
        {
          label: 'Routes',
          to: '/master-data/routes',
          icon: 'mdi-map-marker-path',
          visible: masterDataVisible.value
        },
        {
          label: 'Schedule Templates',
          to: '/master-data/flight-schedule-templates',
          icon: 'mdi-calendar-clock',
          visible: masterDataVisible.value
        },
        {
          label: 'Capacity Profiles',
          to: '/master-data/flight-capacity-profiles',
          icon: 'mdi-seat-passenger',
          visible: masterDataVisible.value
        },
        {
          label: 'Personnel',
          to: '/master-data/personnel',
          icon: 'mdi-account-group-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Flight Reasons',
          to: '/master-data/flight-reasons',
          icon: 'mdi-alert-circle-outline',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Flight Control',
      icon: 'mdi-airplane',
      visible: true,
      children: [
        {
          label: 'Flight Orders',
          to: '/flights',
          icon: 'mdi-airplane-marker',
          visible: true
        },
        {
          label: 'Flight Requests',
          to: '/flights/requests',
          icon: 'mdi-clipboard-plus-outline',
          visible: true
        },
        {
          label: 'Readiness',
          to: '/flights/readiness',
          icon: 'mdi-clipboard-pulse-outline',
          visible: true
        },
        {
          label: 'Manifest',
          to: '/flights/manifest',
          icon: 'mdi-account-box-multiple-outline',
          visible: true
        },
        {
          label: 'Fuel Control',
          to: '/flights/fuel',
          icon: 'mdi-fuel',
          visible: true
        },
        {
          label: 'Station Ops',
          to: '/flights/station-operations',
          icon: 'mdi-airport',
          visible: true
        },
        {
          label: 'Actual & Closure',
          to: '/flights/actual-closure',
          icon: 'mdi-airplane-check',
          visible: true
        },
        {
          label: 'Maintenance',
          to: '/flights/maintenance',
          icon: 'mdi-wrench-clock',
          visible: true
        },
        {
          label: 'Aircraft',
          icon: 'mdi-airplane',
          to: '/master-data/aircraft',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Commercial',
      icon: 'mdi-handshake-outline',
      visible: masterDataVisible.value,
      children: [
        {
          label: 'Customers',
          to: '/master-data/customers',
          icon: 'mdi-domain',
          visible: masterDataVisible.value
        },
        {
          label: 'Agents',
          to: '/master-data/agents',
          icon: 'mdi-storefront-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Rates',
          to: '/master-data/rates',
          icon: 'mdi-cash-multiple',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Ticketing',
      icon: 'mdi-ticket-confirmation-outline',
      visible: true,
      children: [
        {
          label: 'Passenger Manifest',
          to: '/ticketing/passenger',
          icon: 'mdi-account-multiple-outline',
          visible: true
        },
        {
          label: 'Cargo Tracking',
          to: '/ticketing/cargo',
          icon: 'mdi-package-variant',
          visible: true
        },
        {
          label: 'Sales Management',
          to: '/ticketing/management',
          icon: 'mdi-store-cog-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Station Ledger',
          to: '/ticketing/finance',
          icon: 'mdi-cash-register',
          visible: true
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Finance',
      icon: 'mdi-cash-register',
      visible: true,
      children: [
        {
          label: 'Invoice',
          to: '/invoices/inv-001',
          icon: 'mdi-file-document-outline',
          visible: true
        },
        {
          label: 'Vendors',
          to: '/master-data/vendors',
          icon: 'mdi-truck-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Fuel Suppliers',
          to: '/master-data/fuel-suppliers',
          icon: 'mdi-fuel',
          visible: masterDataVisible.value
        },
        {
          label: 'Handling & Parking',
          to: '/master-data/handling-parking-suppliers',
          icon: 'mdi-warehouse',
          visible: masterDataVisible.value
        },
        {
          label: 'Cost Categories',
          to: '/master-data/cost-categories',
          icon: 'mdi-shape-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Chart of Accounts',
          to: '/master-data/chart-of-accounts',
          icon: 'mdi-file-tree-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Tax Codes',
          to: '/master-data/tax-codes',
          icon: 'mdi-percent-outline',
          visible: masterDataVisible.value
        },
        {
          label: 'Payment Terms',
          to: '/master-data/payment-terms',
          icon: 'mdi-calendar-clock',
          visible: masterDataVisible.value
        },
        {
          label: 'Currencies',
          to: '/master-data/currencies',
          icon: 'mdi-currency-usd',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Cargo',
      icon: 'mdi-package-variant',
      visible: masterDataVisible.value,
      children: [
        {
          label: 'DG Categories',
          to: '/master-data/dg-categories',
          icon: 'mdi-package-variant-closed',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    { label: 'Uploads', to: '/uploads', icon: 'mdi-file-upload-outline', visible: true },
    {
      label: 'Access',
      to: '/admin/access-demo',
      icon: 'mdi-shield-account-outline',
      visible: can('platform.module.manage').allowed
    }
  ].filter((item) => item.visible && (item.to || item.children?.length))
);

const isActiveTop = (to: string) => route.path === to || route.path.startsWith(`${to}/`);

const flightModulePaths = [
  '/flights/requests',
  '/flights/readiness',
  '/flights/manifest',
  '/flights/fuel',
  '/flights/station-operations',
  '/flights/actual-closure',
  '/flights/maintenance'
];

function isActiveChild(to: string) {
  if (to !== '/flights') return isActiveTop(to);
  if (route.path === '/flights') return true;
  return route.path.startsWith('/flights/') && !flightModulePaths.some((path) => isActiveTop(path));
}

function groupKey(item: NavItem) {
  return `nav-${item.label.toLowerCase().replaceAll(' ', '-')}`;
}

function isActiveGroup(item: NavItem) {
  return item.children?.some((child) => isActiveChild(child.to)) ?? false;
}

function firstChildPath(item: NavItem) {
  return item.children?.[0]?.to ?? item.to ?? '/dashboard';
}

watch(
  () => route.path,
  () => {
    const nextGroups = new Set(openedGroups.value);
    for (const item of navItems.value) {
      if (!item.children?.length) continue;
      const key = groupKey(item);
      if (isActiveGroup(item)) {
        nextGroups.add(key);
      }
    }
    openedGroups.value = [...nextGroups];
  },
  { immediate: true }
);

function toggleRail() {
  rail.value = !rail.value;
}

function closeMobileOnNavigate() {
  if (!mdAndUp.value) {
    mobileDrawer.value = false;
  }
}
</script>

<template>
  <VNavigationDrawer
    v-model="drawerOpen"
    border
    class="bg-surface"
    color="surface"
    :permanent="mdAndUp"
    :rail="mdAndUp && rail"
    rail-width="72"
    :temporary="!mdAndUp"
    width="272"
  >
    <div class="flex flex-col">
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
          @click="closeMobileOnNavigate"
        >
          <div class="rounded-lg overflow-hidden">
            <VImg :width="68" cover src="https://amapapua.com/files/ama-pt-logo-shaded4.png" />
          </div>
          <div v-if="!rail" class="min-w-0">
            <div class="text-lg font-bold leading-5 text-brand-primary">AMA</div>
            <div class="text-xs font-semibold uppercase tracking-normal text-text-secondary">
              Ops Interface
            </div>
          </div>
        </NuxtLink>

        <VBtn
          v-if="mdAndUp"
          :aria-label="rail ? 'Expand navigation' : 'Minimize navigation'"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          density="comfortable"
          size="small"
          variant="tonal"
          @click="toggleRail"
        />
      </div>

      <VDivider />

      <VList v-model:opened="openedGroups" class="px-2 py-4 nav-list" density="comfortable" nav>
        <template v-for="item in navItems" :key="item.to ?? item.label">
          <!-- Item WITH children -->
          <VListGroup v-if="item.children?.length && !(mdAndUp && rail)" :value="groupKey(item)">
            <template #activator="{ props, isOpen }">
              <VListItem
                v-bind="props"
                class="nav-item mb-1"
                color="primary"
                :prepend-icon="item.icon"
                rounded="lg"
                :title="item.label"
              >
                <template #append>
                  <VIcon
                    class="transition-transform"
                    :class="{ 'rotate-180': isOpen }"
                    icon="mdi-chevron-down"
                    size="18"
                  />
                </template>
              </VListItem>
            </template>

            <VListItem
              v-for="child in item.children"
              :key="child.to"
              :active="isActiveChild(child.to)"
              class="nav-item nav-child mb-1"
              color="primary"
              :prepend-icon="child.icon"
              rounded="lg"
              :title="child.label"
              :to="child.to"
              @click="closeMobileOnNavigate"
            />
          </VListGroup>

          <!-- Item WITHOUT children (or collapsed rail: fall back to first child link) -->
          <VListItem
            v-else-if="item.to"
            :active="isActiveTop(item.to)"
            class="nav-item mb-1"
            color="primary"
            :prepend-icon="item.icon"
            rounded="lg"
            :title="item.label"
            :to="item.to"
            @click="closeMobileOnNavigate"
          />
          <VListItem
            v-else-if="item.children?.length"
            :active="isActiveGroup(item)"
            class="nav-item mb-1"
            color="primary"
            :prepend-icon="item.icon"
            rounded="lg"
            :title="item.label"
            :to="firstChildPath(item)"
            @click="closeMobileOnNavigate"
          />
        </template>
      </VList>

      <div class="mt-auto border-t border-border-default p-3">
        <template v-if="!rail">
          <div class="mb-2 text-xs font-semibold uppercase text-text-secondary">Demo Persona</div>
          <FeatureDemoPersonaSwitcher />
        </template>

        <VBtn
          v-else
          aria-label="Expand to switch demo persona"
          block
          color="primary"
          icon="mdi-account-switch-outline"
          variant="tonal"
          @click="rail = false"
        />
      </div>
    </div>
  </VNavigationDrawer>
</template>

<style scoped>
.nav-item {
  transition: background-color 0.15s ease;
}

.nav-child {
  margin-left: 8px;
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>
