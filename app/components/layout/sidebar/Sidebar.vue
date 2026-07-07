<script setup lang="ts">
import { useDisplay } from 'vuetify';
import {
  agentsMasterDataConfig,
  aircraftMasterDataConfig,
  chartOfAccountsMasterDataConfig,
  costCategoriesMasterDataConfig,
  crewMasterDataConfig,
  currenciesMasterDataConfig,
  customersMasterDataConfig,
  dgCategoriesMasterDataConfig,
  flightReasonsMasterDataConfig,
  fuelSuppliersMasterDataConfig,
  handlingParkingSuppliersMasterDataConfig,
  paymentTermsMasterDataConfig,
  rateCardsMasterDataConfig,
  routesMasterDataConfig,
  stationsMasterDataConfig,
  taxCodesMasterDataConfig,
  vendorsMasterDataConfig
} from '#shared/contracts/master-data';

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
          label: stationsMasterDataConfig.shortTitle,
          to: stationsMasterDataConfig.routePath,
          icon: 'mdi-airport',
          visible: masterDataVisible.value
        },
        {
          label: routesMasterDataConfig.shortTitle,
          to: routesMasterDataConfig.routePath,
          icon: 'mdi-map-marker-path',
          visible: masterDataVisible.value
        },
        {
          label: 'Personnel',
          to: crewMasterDataConfig.routePath,
          icon: 'mdi-account-group-outline',
          visible: masterDataVisible.value
        },
        {
          label: flightReasonsMasterDataConfig.shortTitle,
          to: flightReasonsMasterDataConfig.routePath,
          icon: 'mdi-alert-circle-outline',
          visible: masterDataVisible.value
        }
      ].filter((child) => child.visible)
    },
    {
      label: 'Flights',
      icon: 'mdi-airplane',
      visible: true,
      children: [
        {
          label: 'Overview',
          to: '/flights',
          icon: 'mdi-earth',
          visible: true
        },
        {
          label: aircraftMasterDataConfig.shortTitle,
          icon: 'mdi-airplane',
          to: aircraftMasterDataConfig.routePath,
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
          label: customersMasterDataConfig.shortTitle,
          to: customersMasterDataConfig.routePath,
          icon: 'mdi-domain',
          visible: masterDataVisible.value
        },
        {
          label: agentsMasterDataConfig.shortTitle,
          to: agentsMasterDataConfig.routePath,
          icon: 'mdi-storefront-outline',
          visible: masterDataVisible.value
        },
        {
          label: rateCardsMasterDataConfig.shortTitle,
          to: rateCardsMasterDataConfig.routePath,
          icon: 'mdi-cash-multiple',
          visible: masterDataVisible.value
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
          label: vendorsMasterDataConfig.shortTitle,
          to: vendorsMasterDataConfig.routePath,
          icon: 'mdi-truck-outline',
          visible: masterDataVisible.value
        },
        {
          label: fuelSuppliersMasterDataConfig.shortTitle,
          to: fuelSuppliersMasterDataConfig.routePath,
          icon: 'mdi-fuel',
          visible: masterDataVisible.value
        },
        {
          label: handlingParkingSuppliersMasterDataConfig.shortTitle,
          to: handlingParkingSuppliersMasterDataConfig.routePath,
          icon: 'mdi-warehouse',
          visible: masterDataVisible.value
        },
        {
          label: costCategoriesMasterDataConfig.shortTitle,
          to: costCategoriesMasterDataConfig.routePath,
          icon: 'mdi-shape-outline',
          visible: masterDataVisible.value
        },
        {
          label: chartOfAccountsMasterDataConfig.shortTitle,
          to: chartOfAccountsMasterDataConfig.routePath,
          icon: 'mdi-file-tree-outline',
          visible: masterDataVisible.value
        },
        {
          label: taxCodesMasterDataConfig.shortTitle,
          to: taxCodesMasterDataConfig.routePath,
          icon: 'mdi-percent-outline',
          visible: masterDataVisible.value
        },
        {
          label: paymentTermsMasterDataConfig.shortTitle,
          to: paymentTermsMasterDataConfig.routePath,
          icon: 'mdi-calendar-clock',
          visible: masterDataVisible.value
        },
        {
          label: currenciesMasterDataConfig.shortTitle,
          to: currenciesMasterDataConfig.routePath,
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
          label: dgCategoriesMasterDataConfig.shortTitle,
          to: dgCategoriesMasterDataConfig.routePath,
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

function groupKey(item: NavItem) {
  return `nav-${item.label.toLowerCase().replaceAll(' ', '-')}`;
}

function isActiveGroup(item: NavItem) {
  return item.children?.some((child) => isActiveTop(child.to)) ?? false;
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
              :active="isActiveTop(child.to)"
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
