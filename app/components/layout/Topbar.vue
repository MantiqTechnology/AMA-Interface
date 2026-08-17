<script setup lang="ts">
import { useDisplay } from 'vuetify';
import { useTheme } from 'vuetify';
import type { DashboardDto } from '#shared/contracts/operations-monitoring';
import { AMA_THEME_HEX } from '../../constants/themeColors';

const route = useRoute();
const session = useDemoSession();
const theme = useTheme();
const { mdAndUp } = useDisplay();
const mobileDrawer = useState('ama-sidebar-mobile-open', () => false);
const { locale, setLocale, t } = useI18n();

const { data: dashboardOverview } = await useAsyncData('topbar-dashboard-overview', () =>
  fetchApi<DashboardDto>('/api/dashboard')
);

const demoNotifications = computed(() => [
  {
    id: 'ntf-001',
    severity: 'critical',
    title: locale.value === 'id' ? 'GA204 Terlambat 45 Menit' : 'GA204 Delayed 45 Minutes',
    message:
      locale.value === 'id'
        ? 'Keberangkatan tertunda akibat cuaca buruk di CGK. ETD baru 14:35 WIB.'
        : 'Departure is delayed due to bad weather at CGK. New ETD is 14:35 WIB.',
    time: locale.value === 'id' ? '2m lalu' : '2m ago'
  },
  {
    id: 'ntf-002',
    severity: 'warning',
    title: locale.value === 'id' ? 'Perubahan Gate - QZ512' : 'Gate Change - QZ512',
    message:
      locale.value === 'id'
        ? 'Gate dipindahkan dari B12 ke C04. Ground staff sudah diinformasikan.'
        : 'Gate moved from B12 to C04. Ground staff have been informed.',
    time: locale.value === 'id' ? '10m lalu' : '10m ago'
  },
  {
    id: 'ntf-003',
    severity: 'critical',
    title: locale.value === 'id' ? 'FOD Terdeteksi di Runway 07' : 'FOD Detected on Runway 07',
    message:
      locale.value === 'id'
        ? 'Inspeksi runway sedang berlangsung, keberangkatan sementara ditahan.'
        : 'Runway inspection is in progress, departures are temporarily held.',
    time: locale.value === 'id' ? '18m lalu' : '18m ago'
  },
  {
    id: 'ntf-004',
    severity: 'warning',
    title: 'GSE Maintenance Due',
    message:
      locale.value === 'id'
        ? 'Belt Loader BL-01 (SUB - Surabaya) dijadwalkan maintenance dalam 2 hari.'
        : 'Belt Loader BL-01 (SUB - Surabaya) is due for maintenance in 2 days.',
    time: locale.value === 'id' ? '32m lalu' : '32m ago'
  },
  {
    id: 'ntf-005',
    severity: 'info',
    title: locale.value === 'id' ? 'Flight Closure Selesai' : 'Flight Closure Completed',
    message:
      locale.value === 'id'
        ? 'Flight closure untuk JT-682 telah selesai diproses dan diarsipkan.'
        : 'Flight closure for JT-682 has been processed and archived.',
    time: locale.value === 'id' ? '1j lalu' : '1h ago'
  }
]);

const notifications = computed(() => {
  const apiAlerts = dashboardOverview.value?.alerts ?? [];
  return apiAlerts.length ? apiAlerts.slice(0, 5) : demoNotifications.value;
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
  critical: AMA_THEME_HEX.danger,
  warning: AMA_THEME_HEX.warning,
  info: AMA_THEME_HEX.info
};

onMounted(() => session.load());

const pageTitle = computed(() => {
  if (route.path === '/ops') return t('topbar.page.opsOverview');
  if (route.path === '/flights/dashboard') return t('topbar.page.flightControlOverview');
  if (route.path.startsWith('/ops/flight-following')) return t('topbar.page.flightFollowing');
  if (route.path.startsWith('/ops/flights')) return t('topbar.page.flightDetail');
  if (route.path.startsWith('/ops/flight-closure')) return t('topbar.page.flightClosure');
  if (route.path.startsWith('/admin/access-demo')) return t('topbar.page.accessDemo');
  if (route.path.startsWith('/master-data')) return t('topbar.page.masterData');
  if (route.path.startsWith('/dashboard')) return t('topbar.page.dashboard');
  if (route.path.startsWith('/flights/requests')) return t('topbar.page.flightRequests');
  if (
    route.path.startsWith('/flights/station-operations') ||
    route.path.startsWith('/flights/actual-closure') ||
    route.path.startsWith('/flights/maintenance')
  ) {
    return t('topbar.page.stationOperations');
  }
  if (route.path.startsWith('/maintenance')) return t('topbar.page.maintenanceOperations');
  if (/^\/flights\/[^/]+$/u.test(route.path)) {
    return mdAndUp.value ? t('topbar.page.flightOperationsWorkspace') : t('topbar.page.flight');
  }
  if (route.path.startsWith('/flights')) return t('topbar.page.flightControl');
  if (route.path.startsWith('/finance/accounting')) return t('topbar.page.finance');
  if (route.path.startsWith('/invoices')) return t('topbar.page.invoice');
  return t('topbar.page.dashboard');
});

const isDark = computed(() => theme.global.name.value === 'amaDark');
const localeItems = computed(() => [
  { title: t('common.english'), value: 'en' },
  { title: t('common.indonesian'), value: 'id' }
]);
const localeLabel = computed(() => locale.value.toUpperCase());

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
        :aria-label="t('actions.openNavigation')"
        icon="mdi-menu"
        variant="text"
        @click="openMobileNavigation"
      />

      <div class="min-w-0 flex-1">
        <div class="truncate text-lg font-semibold text-brand-primary">{{ pageTitle }}</div>
      </div>

      <VBtn
        :aria-label="isDark ? t('actions.switchToLightMode') : t('actions.switchToDarkMode')"
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        @click="toggleTheme"
      />

      <VMenu eager location="bottom end">
        <template #activator="{ props }">
          <VBtn
            v-bind="props"
            :aria-label="t('common.language')"
            class="locale-menu-button"
            :icon="!mdAndUp"
            variant="tonal"
          >
            <VIcon v-if="!mdAndUp" icon="mdi-translate" />
            <template v-else>
              <VIcon class="mr-1" icon="mdi-translate" />
              {{ localeLabel }}
            </template>
          </VBtn>
        </template>
        <VList density="comfortable" min-width="180">
          <VListItem
            v-for="item in localeItems"
            :key="item.value"
            :active="locale === item.value"
            :title="item.title"
            @click="setLocale(item.value)"
          />
        </VList>
      </VMenu>

      <VMenu eager location="bottom end" :close-on-content-click="false">
        <template #activator="{ props }">
          <VBtn v-bind="props" :aria-label="t('topbar.notifications')" icon variant="text">
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
              <span>{{ t('topbar.notifications') }}</span>
              <VChip v-if="criticalCount" color="error" size="x-small" variant="flat">
                {{ criticalCount }} {{ t('topbar.critical') }}
              </VChip>
            </div>
            <VChip color="accent-cenderawasih" size="small" variant="tonal">
              {{ t('common.demo') }}
            </VChip>
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
            {{ t('topbar.noOperationalAlerts') }}
          </VAlert>
          <VDivider />
          <VCardActions class="justify-center py-2">
            <VBtn variant="text" size="small" color="primary" append-icon="mdi-arrow-right">
              {{ t('actions.viewAllNotifications') }}
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
            <VListItem prepend-icon="mdi-account-circle-outline" :title="t('topbar.myProfile')" />
            <VListItem
              prepend-icon="mdi-shield-key-outline"
              :subtitle="session.currentPersona.value.stationScope.join(', ')"
              :title="t('topbar.stationScope')"
            />
          </VList>
        </VCard>
      </VMenu>
    </div>
  </VAppBar>
</template>

<style scoped>
.notif-item + .notif-item {
  border-top: 1px solid rgba(var(--v-theme-border-default), 0.7);
}
.locale-menu-button {
  min-width: 78px;
}
@media (max-width: 959px) {
  .locale-menu-button {
    min-width: 40px;
  }
}
</style>
