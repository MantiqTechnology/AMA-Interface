<script setup lang="ts">
import { useTheme } from 'vuetify';

const route = useRoute();
const store = useAmaDemoStore();
const theme = useTheme();

const notifications = [
  {
    id: 'NOTIF-001',
    title: 'Medevac request blocked',
    message: 'FR-20260706-002 masih memiliki blocker fuel dan duty time.',
    tone: 'danger',
    at: '2 min ago'
  },
  {
    id: 'NOTIF-002',
    title: 'Dispatch approval waiting',
    message: 'FR-20260706-001 siap direview Chief of Pilot.',
    tone: 'warning',
    at: '12 min ago'
  },
  {
    id: 'NOTIF-003',
    title: 'AMA702 airborne',
    message: 'Manual following update mencatat delay 13 menit.',
    tone: 'info',
    at: '28 min ago'
  }
] as const;

const pageTitle = computed(() => {
  if (route.path.startsWith('/ops/command-center')) return 'Operations Command Center';
  if (route.path.startsWith('/ops/flight-requests')) return 'Flight Requests';
  if (route.path.startsWith('/ops/flight-following')) return 'Flight Following';
  if (route.path.startsWith('/ops/flights')) return 'Flight Detail';
  if (route.path.startsWith('/ops/flight-closure')) return 'Flight Closure';
  if (route.path.startsWith('/admin/access-demo')) return 'Access Demo';
  if (route.path.startsWith('/dashboard')) return 'Dashboard';
  if (route.path.startsWith('/flights')) return 'Flights';
  if (route.path.startsWith('/invoices')) return 'Invoice';
  return 'Dashboard';
});

const isDark = computed(() => theme.global.name.value === 'amaDark');

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'amaLight' : 'amaDark';
}
</script>

<template>
  <VAppBar border color="surface" flat height="64">
    <div class="flex w-full items-center gap-3 px-4">
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
            <VBadge color="danger" content="3" floating>
              <VIcon icon="mdi-bell-outline" />
            </VBadge>
          </VBtn>
        </template>

        <VCard border min-width="360">
          <VCardTitle class="flex items-center justify-between text-brand-primary">
            Notifications
            <VChip color="accent-cenderawasih" size="small" variant="tonal">Demo</VChip>
          </VCardTitle>
          <VDivider />
          <VList lines="three">
            <VListItem v-for="notification in notifications" :key="notification.id">
              <template #prepend>
                <DsStatusBadge :value="notification.tone" />
              </template>
              <VListItemTitle>{{ notification.title }}</VListItemTitle>
              <VListItemSubtitle>
                {{ notification.message }}
                <div class="mt-1 text-xs text-text-secondary">{{ notification.at }}</div>
              </VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>
      </VMenu>

      <VMenu eager location="bottom end">
        <template #activator="{ props }">
          <VBtn v-bind="props" class="px-2" variant="text">
            <VAvatar color="secondary" size="32">
              <VIcon icon="mdi-account-outline" />
            </VAvatar>
            <span class="ml-2 hidden max-w-[160px] truncate text-sm font-medium md:inline">
              {{ store.currentUser.value.name }}
            </span>
            <VIcon class="ml-1" icon="mdi-chevron-down" size="18" />
          </VBtn>
        </template>

        <VCard border min-width="280">
          <VCardText>
            <div class="font-semibold text-brand-primary">{{ store.currentUser.value.name }}</div>
            <div class="text-sm text-text-secondary">{{ store.currentUser.value.demoPersona }}</div>
          </VCardText>
          <VDivider />
          <VList density="comfortable">
            <VListItem prepend-icon="mdi-account-circle-outline" title="My Profile" />
            <VListItem
              prepend-icon="mdi-shield-key-outline"
              :subtitle="store.currentUser.value.stationScopeIds.join(', ')"
              title="Station Scope"
            />
          </VList>
        </VCard>
      </VMenu>
    </div>
  </VAppBar>
</template>
