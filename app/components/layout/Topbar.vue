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

const demoNotifications = [
  {
    id: 'ntf-001',
    severity: 'critical',
    title: 'GA204 Delayed 45 Minutes',
    message: 'Keberangkatan tertunda akibat cuaca buruk di CGK. ETD baru 14:35 WIB.',
    time: '2m ago'
  },
  {
    id: 'ntf-002',
    severity: 'warning',
    title: 'Gate Change - QZ512',
    message: 'Gate dipindahkan dari B12 ke C04. Ground staff sudah diinformasikan.',
    time: '10m ago'
  },
  {
    id: 'ntf-003',
    severity: 'critical',
    title: 'FOD Terdeteksi di Runway 07',
    message: 'Inspeksi runway sedang berlangsung, keberangkatan sementara ditahan.',
    time: '18m ago'
  },
  {
    id: 'ntf-004',
    severity: 'warning',
    title: 'GSE Maintenance Due',
    message: 'Belt Loader BL-01 (SUB - Surabaya) dijadwalkan maintenance dalam 2 hari.',
    time: '32m ago'
  },
  {
    id: 'ntf-005',
    severity: 'info',
    title: 'Flight Closure Completed',
    message: 'Flight closure untuk JT-682 telah selesai diproses dan diarsipkan.',
    time: '1h ago'
  }
];

const notifications = computed(() => {
  const apiAlerts = dashboardOverview.value?.alerts ?? [];
  return apiAlerts.length ? apiAlerts.slice(0, 5) : demoNotifications;
});

const criticalCount = computed(
  () => notifications.value.filter((n) => n.severity === 'critical').length
);
const bellColor = computed(() => (criticalCount.value > 0 ? 'error' : 'warning'));

const severityIcon: Record<string, string> = {
  critical: 'mdi-alert-circle',
  warning: 'mdi-alert',
  info: 'mdi-information-outline'
};
const severityColor: Record<string, string> = {
  critical: '#E5484D',
  warning: '#F5A623',
  info: '#3B5BFF'
};

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
          <VBtn v-bind="props" aria-label="Notifications" icon variant="text">
            <VBadge
              v-if="notifications.length"
              :color="bellColor"
              :content="notifications.length"
              floating
            >
              <VIcon icon="mdi-bell-outline" />
            </VBadge>
            <VIcon v-else icon="mdi-bell-outline" />
          </VBtn>
        </template>

        <VCard border min-width="380" max-width="380">
          <VCardTitle class="d-flex align-center justify-space-between text-brand-primary pa-4">
            <div class="d-flex align-center" style="gap: 8px">
              <span>Notifications</span>
              <VChip v-if="criticalCount" color="error" size="x-small" variant="flat">
                {{ criticalCount }} critical
              </VChip>
            </div>
            <VChip color="accent-cenderawasih" size="small" variant="tonal">Demo</VChip>
          </VCardTitle>
          <VDivider />
          <VList v-if="notifications.length" lines="three" density="comfortable" class="py-0">
            <VListItem
              v-for="notification in notifications"
              :key="notification.id"
              class="notif-item"
            >
              <template #prepend>
                <VAvatar :color="severityColor[notification.severity] + '22'" size="36">
                  <VIcon
                    :color="severityColor[notification.severity]"
                    :icon="severityIcon[notification.severity]"
                    size="20"
                  />
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">{{ notification.title }}</VListItemTitle>
              <VListItemSubtitle class="text-wrap">
                {{ notification.message }}
              </VListItemSubtitle>
              <template #append>
                <span class="text-caption text-medium-emphasis" style="white-space: nowrap">{{
                  notification.time
                }}</span>
              </template>
            </VListItem>
          </VList>
          <VAlert v-else class="ma-4" color="success" variant="tonal">
            No operational alerts.
          </VAlert>
          <VDivider />
          <VCardActions class="justify-center py-2">
            <VBtn variant="text" size="small" color="primary" append-icon="mdi-arrow-right">
              View all notifications
            </VBtn>
          </VCardActions>
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

<style scoped>
.notif-item + .notif-item {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
