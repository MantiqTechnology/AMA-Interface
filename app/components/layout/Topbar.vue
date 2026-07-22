<script setup lang="ts">
import { useDisplay } from 'vuetify';
import { useTheme } from 'vuetify';
import type { DashboardDto } from '#shared/contracts/operations-monitoring';

const route = useRoute();
const session = useDemoSession();
const theme = useTheme();
const { mdAndUp } = useDisplay();
const mobileDrawer = useState('ama-sidebar-mobile-open', () => false);

const { data: dashboardOverview } = await useAsyncData('topbar-dashboard-overview', () =>
  fetchApi<DashboardDto>('/api/dashboard')
);
const notifications = computed(() => dashboardOverview.value?.alerts.slice(0, 5) ?? []);

onMounted(() => session.load());

const pageTitle = computed(() => {
  if (route.path.startsWith('/ops/flight-following')) return 'Flight Following';
  if (route.path.startsWith('/ops/flights')) return 'Flight Detail';
  if (route.path.startsWith('/ops/flight-closure')) return 'Flight Closure';
  if (route.path.startsWith('/admin/access-demo')) return 'Access Demo';
  if (route.path.startsWith('/master-data')) return 'Master Data';
  if (route.path.startsWith('/dashboard')) return 'Dashboard';
  if (route.path.startsWith('/flights/requests')) return 'Flight Requests';
  if (/^\/flights\/[^/]+$/u.test(route.path)) {
    return mdAndUp.value ? 'Flight Operations Workspace' : 'Flight';
  }
  if (route.path.startsWith('/flights')) return 'Flight Control';
  if (route.path.startsWith('/finance/accounting')) return 'Finance';
  if (route.path.startsWith('/invoices')) return 'Invoice';
  return 'Dashboard';
});

const isDark = computed(() => theme.global.name.value === 'amaDark');

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'amaLight' : 'amaDark';
}

function openMobileNavigation() {
  mobileDrawer.value = true;
}
</script>

<template>
  <VAppBar border color="surface" flat height="64">
    <div class="flex w-full items-center gap-3 px-4">
      <VBtn
        v-if="!mdAndUp"
        aria-label="Open navigation"
        icon="mdi-menu"
        variant="text"
        @click="openMobileNavigation"
      />

      <div class="min-w-0">
        <div class="text-lg font-semibold text-brand-primary">{{ pageTitle }}</div>
      </div>

      <VSpacer />

      <VBtn
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        @click="toggleTheme"
      />

      <VMenu eager location="bottom end" :close-on-content-click="false">
        <template #activator="{ props }">
          <VBtn v-bind="props" aria-label="Notifications" icon="mdi-bell-outline" variant="text">
            <VBadge
              v-if="notifications.length"
              color="danger"
              :content="notifications.length"
              floating
            >
              <VIcon icon="mdi-bell-outline" />
            </VBadge>
            <VIcon v-else icon="mdi-bell-outline" />
          </VBtn>
        </template>

        <VCard border min-width="360">
          <VCardTitle class="flex items-center justify-between text-brand-primary">
            Notifications
            <VChip color="accent-cenderawasih" size="small" variant="tonal">Demo</VChip>
          </VCardTitle>
          <VDivider />
          <VList v-if="notifications.length" lines="three">
            <VListItem v-for="notification in notifications" :key="notification.id">
              <template #prepend>
                <DsStatusBadge :value="notification.severity" />
              </template>
              <VListItemTitle>{{ notification.title }}</VListItemTitle>
              <VListItemSubtitle>
                {{ notification.message }}
              </VListItemSubtitle>
            </VListItem>
          </VList>
          <VAlert v-else class="ma-4" color="success" variant="tonal">
            No operational alerts.
          </VAlert>
        </VCard>
      </VMenu>

      <VMenu eager location="bottom end">
        <template #activator="{ props }">
          <VBtn v-bind="props" class="px-2" variant="text">
            <VAvatar color="secondary" size="32">
              <VIcon icon="mdi-account-outline" />
            </VAvatar>
            <span class="ml-2 hidden max-w-40 truncate text-sm font-medium md:inline">
              {{ session.currentPersona.value.name }}
            </span>
            <VIcon class="ml-1" icon="mdi-chevron-down" size="18" />
          </VBtn>
        </template>

        <VCard border min-width="280">
          <VCardText>
            <div class="font-semibold text-brand-primary">
              {{ session.currentPersona.value.name }}
            </div>
            <div class="text-sm text-text-secondary">{{ session.role.value }}</div>
          </VCardText>
          <VDivider />
          <VList density="comfortable">
            <VListItem prepend-icon="mdi-account-circle-outline" title="My Profile" />
            <VListItem
              prepend-icon="mdi-shield-key-outline"
              :subtitle="session.currentPersona.value.stationScope.join(', ')"
              title="Station Scope"
            />
          </VList>
        </VCard>
      </VMenu>
    </div>
  </VAppBar>
</template>
