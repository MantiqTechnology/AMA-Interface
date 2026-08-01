<script setup lang="ts">
import type {
  FlightScheduleTemplateDetailDto,
  FlightScheduleTemplateDto,
  ScheduleOperatingDay,
  ScheduleTemplateHistoryItemDto
} from '#shared/features/operations/flight-schedule-templates';
import FlightScheduleTemplateFormDialog from './FlightScheduleTemplateFormDialog.vue';

const pageRoute = useRoute();
const router = useRouter();
const authorization = useAuthorization();
const canManage = computed(() => authorization.can('platform.module.manage').allowed);
const templateId = computed(() => String(pageRoute.params.id));

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'route', label: 'Route' },
  { value: 'aircraft', label: 'Aircraft' },
  { value: 'operating-days', label: 'Operating Days' },
  { value: 'booking-rules', label: 'Booking Rules' },
  { value: 'notes', label: 'Notes' },
  { value: 'history', label: 'History' }
] as const;

const activeTab = computed({
  get: () => {
    const queryTab = typeof pageRoute.query.tab === 'string' ? pageRoute.query.tab : 'overview';
    return tabs.some((tab) => tab.value === queryTab) ? queryTab : 'overview';
  },
  set: (tab: string) => {
    void router.replace({ query: { ...pageRoute.query, tab } });
  }
});

const {
  data: record,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => 'flight-schedule-templates-detail-' + templateId.value,
  () =>
    fetchApi<FlightScheduleTemplateDetailDto>(
      '/api/master-data/flight-schedule-templates/' + templateId.value
    ),
  { watch: [templateId] }
);

const editOpen = ref(false);
const duplicateOpen = ref(false);
const duplicateSubmitting = ref(false);
const duplicateError = ref('');
const duplicateCode = ref('');
const actionLoading = ref<string | null>(null);

const historyLoaded = ref(false);
const historyPending = ref(false);
const historyError = ref('');
const historyItems = ref<ScheduleTemplateHistoryItemDto[]>([]);

watch(
  () => activeTab.value,
  (tab) => {
    if (tab === 'history') void loadHistory();
  },
  { immediate: true }
);

const subtitle = computed(() => {
  if (!record.value) return '';
  return `${record.value.serviceType.name} · ${routeShortLabel(record.value)}`;
});

const lifecycleColor = computed(() => {
  if (!record.value) return 'default';
  if (record.value.lifecycleStatus === 'ACTIVE') return 'success';
  if (record.value.lifecycleStatus === 'DRAFT') return 'info';
  if (record.value.lifecycleStatus === 'ARCHIVED') return 'default';
  return 'warning';
});

const bookingValid = computed(() => {
  if (!record.value) return true;
  return record.value.bookingOpenMinutesBefore > record.value.bookingCloseMinutesBefore;
});

const enabledDays = computed(() => new Set(record.value?.operatingDays ?? []));
const operatingDayCount = computed(() => record.value?.operatingDays.length ?? 0);

function empty(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function routeShortLabel(item: FlightScheduleTemplateDetailDto) {
  return `${item.route.origin.stationCode} → ${item.route.destination.stationCode}`;
}

function routeLongLabel(item: FlightScheduleTemplateDetailDto) {
  return `${item.route.origin.stationName} → ${item.route.destination.stationName}`;
}

function aircraftLabel(item: FlightScheduleTemplateDetailDto) {
  if (!item.defaultAircraft) return '—';
  return [item.defaultAircraft.registration, item.defaultAircraft.aircraftTypeName]
    .filter(Boolean)
    .join(' · ');
}

function capacityProfileLabel(item: FlightScheduleTemplateDetailDto) {
  if (!item.capacityProfile) return '—';
  return `${item.capacityProfile.code} · ${item.capacityProfile.name}`;
}

function formatDurationFromMinutes(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (remainingMinutes)
    parts.push(`${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`);
  return parts.join(' ') || '0 minutes';
}

function primaryDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

function effectivePeriod(item: FlightScheduleTemplateDetailDto) {
  if (!item.effectiveFrom && !item.effectiveUntil) return '—';
  return `${empty(item.effectiveFrom)} → ${empty(item.effectiveUntil)}`;
}

function dayIsEnabled(day: ScheduleOperatingDay) {
  return enabledDays.value.has(day);
}

function openDuplicate() {
  if (!record.value) return;
  duplicateCode.value = `${record.value.templateCode}_COPY`;
  duplicateError.value = '';
  duplicateOpen.value = true;
}

async function submitDuplicate() {
  if (!record.value || !duplicateCode.value.trim()) return;
  duplicateSubmitting.value = true;
  duplicateError.value = '';
  try {
    const duplicated = await fetchApi<FlightScheduleTemplateDto>(
      `/api/master-data/flight-schedule-templates/${record.value.id}/duplicate`,
      { method: 'POST', body: { templateCode: duplicateCode.value } }
    );
    duplicateOpen.value = false;
    await router.push('/master-data/flight-schedule-templates/' + duplicated.id);
  } catch (caught) {
    duplicateError.value =
      caught instanceof Error ? caught.message : 'Unable to duplicate schedule template.';
  } finally {
    duplicateSubmitting.value = false;
  }
}

async function runLifecycle(action: 'activate' | 'deactivate' | 'archive') {
  if (!record.value) return;
  actionLoading.value = action;
  try {
    await fetchApi(`/api/master-data/flight-schedule-templates/${record.value.id}/${action}`, {
      method: 'POST'
    });
    await refresh();
    if (historyLoaded.value) await loadHistory(true);
  } finally {
    actionLoading.value = null;
  }
}

async function loadHistory(force = false) {
  if (!record.value || (historyLoaded.value && !force)) return;
  historyPending.value = true;
  historyError.value = '';
  try {
    historyItems.value = await fetchApi<ScheduleTemplateHistoryItemDto[]>(
      `/api/master-data/flight-schedule-templates/${record.value.id}/history`
    );
    historyLoaded.value = true;
  } catch (caught) {
    historyError.value = caught instanceof Error ? caught.message : 'Unable to load history.';
  } finally {
    historyPending.value = false;
  }
}

function onSaved() {
  void refresh();
  if (historyLoaded.value) void loadHistory(true);
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <VBtn
      class="mb-3"
      prepend-icon="mdi-arrow-left"
      size="small"
      to="/master-data/flight-schedule-templates"
      variant="text"
    >
      Schedule Templates
    </VBtn>

    <template v-if="pending">
      <div class="d-flex justify-space-between align-start mb-4">
        <div class="w-50">
          <VSkeletonLoader type="heading, text" />
        </div>
        <VSkeletonLoader type="button" width="220" />
      </div>
      <VSkeletonLoader class="mb-4" type="card" />
      <VSkeletonLoader type="article, actions" />
    </template>

    <VCard v-else-if="error" border flat>
      <VCardText class="py-8">
        <div class="text-h6 mb-1">Unable to load schedule template</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          The schedule template could not be retrieved.
        </div>
        <div class="d-flex ga-2 flex-wrap">
          <VBtn prepend-icon="mdi-refresh" variant="tonal" @click="refresh">Retry</VBtn>
          <VBtn to="/master-data/flight-schedule-templates" variant="text">
            Back to Schedule Templates
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VCard v-else-if="!record" border flat>
      <VCardText class="py-8">
        <div class="text-h6 mb-1">Schedule template not found</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          The requested schedule template may have been removed or is no longer available.
        </div>
        <VBtn to="/master-data/flight-schedule-templates" variant="tonal">
          Back to Schedule Templates
        </VBtn>
      </VCardText>
    </VCard>

    <template v-else>
      <div class="schedule-template-header mb-4">
        <div class="min-w-0">
          <div class="d-flex align-center ga-2 flex-wrap">
            <h1 class="text-h4 font-weight-bold text-truncate mb-0">{{ record.templateCode }}</h1>
            <VChip :color="lifecycleColor" size="small" variant="tonal">
              {{ record.lifecycleStatus }}
            </VChip>
            <VChip size="small" variant="outlined">v{{ record.version }}</VChip>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">{{ subtitle }}</div>
        </div>

        <div class="d-flex ga-2 flex-wrap justify-end">
          <VBtn v-if="canManage" prepend-icon="mdi-pencil" variant="tonal" @click="editOpen = true">
            Edit
          </VBtn>
          <VBtn
            v-if="canManage"
            prepend-icon="mdi-content-copy"
            variant="outlined"
            @click="openDuplicate"
          >
            Duplicate
          </VBtn>
          <VMenu>
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                aria-label="More schedule template actions"
                icon="mdi-dots-vertical"
                variant="text"
              />
            </template>
            <VList density="compact">
              <VListItem
                v-if="
                  canManage &&
                    record.lifecycleStatus !== 'ACTIVE' &&
                    record.lifecycleStatus !== 'ARCHIVED'
                "
                prepend-icon="mdi-play-circle-outline"
                title="Activate"
                @click="runLifecycle('activate')"
              />
              <VListItem
                v-if="canManage && record.lifecycleStatus === 'ACTIVE'"
                prepend-icon="mdi-pause-circle-outline"
                title="Deactivate"
                @click="runLifecycle('deactivate')"
              />
              <VListItem
                v-if="canManage && record.lifecycleStatus !== 'ARCHIVED'"
                prepend-icon="mdi-archive-outline"
                title="Archive"
                @click="runLifecycle('archive')"
              />
              <VListItem
                prepend-icon="mdi-history"
                title="View history"
                @click="activeTab = 'history'"
              />
            </VList>
          </VMenu>
        </div>
      </div>

      <VCard border flat class="mb-4">
        <VCardText>
          <div class="summary-grid">
            <div class="summary-column">
              <div class="summary-item">
                <div class="summary-label">Template Code</div>
                <div class="summary-value">{{ record.templateCode }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Service Type</div>
                <div class="summary-value">{{ record.serviceType.name }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Operating Days</div>
                <div class="d-flex ga-1 flex-wrap">
                  <VChip
                    v-for="day in record.operatingDays"
                    :key="day"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ day }}
                  </VChip>
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Arrival Local</div>
                <div class="summary-value numeric">{{ record.arrivalTimeLocal }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Booking Closes Before</div>
                <div class="summary-value">
                  {{ primaryDuration(record.bookingCloseMinutesBefore) }}
                  <span class="text-medium-emphasis">· {{ formatDurationFromMinutes(record.bookingCloseMinutesBefore) }}</span>
                </div>
              </div>
            </div>
            <div class="summary-column">
              <div class="summary-item">
                <div class="summary-label">Route</div>
                <div class="summary-value">{{ routeShortLabel(record) }}</div>
                <div class="text-caption text-medium-emphasis">{{ routeLongLabel(record) }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Default Aircraft</div>
                <div class="summary-value">{{ aircraftLabel(record) }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Departure Local</div>
                <div class="summary-value numeric">{{ record.departureTimeLocal }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Booking Opens Before</div>
                <div class="summary-value">
                  {{ primaryDuration(record.bookingOpenMinutesBefore) }}
                  <span class="text-medium-emphasis">· {{ formatDurationFromMinutes(record.bookingOpenMinutesBefore) }}</span>
                </div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Schedule Note</div>
                <div class="summary-value note">{{ empty(record.scheduleNote) }}</div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VCard border flat>
        <VTabs v-model="activeTab" show-arrows>
          <VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">
            {{ tab.label }}
          </VTab>
        </VTabs>
        <VDivider />
        <VCardText>
          <VWindow v-model="activeTab">
            <VWindowItem value="overview">
              <div class="overview-grid">
                <VCard border flat>
                  <VCardTitle class="text-subtitle-1">Template Information</VCardTitle>
                  <VDivider />
                  <VList density="compact" lines="two">
                    <VListItem
                      prepend-icon="mdi-identifier"
                      title="Template Code"
                      :subtitle="record.templateCode"
                    />
                    <VListItem
                      prepend-icon="mdi-airplane-clock"
                      title="Service Type"
                      :subtitle="record.serviceType.name"
                    />
                    <VListItem
                      prepend-icon="mdi-airplane"
                      title="Default Aircraft"
                      :subtitle="aircraftLabel(record)"
                    />
                    <VListItem
                      prepend-icon="mdi-map-marker-path"
                      title="Route"
                      :subtitle="routeShortLabel(record)"
                    />
                    <VListItem
                      prepend-icon="mdi-calendar-week"
                      title="Operating Days"
                      :subtitle="record.operatingDays.join(', ')"
                    />
                    <VListItem
                      prepend-icon="mdi-clock-start"
                      title="Departure Local Time"
                      :subtitle="record.departureTimeLocal"
                    />
                    <VListItem
                      prepend-icon="mdi-clock-end"
                      title="Arrival Local Time"
                      :subtitle="`${record.arrivalTimeLocal} +${record.arrivalDayOffset}d`"
                    />
                    <VListItem
                      prepend-icon="mdi-ticket-confirmation"
                      title="Booking Opens Before"
                      :subtitle="`${primaryDuration(record.bookingOpenMinutesBefore)} (${formatDurationFromMinutes(record.bookingOpenMinutesBefore)})`"
                    />
                    <VListItem
                      prepend-icon="mdi-ticket-outline"
                      title="Booking Closes Before"
                      :subtitle="`${primaryDuration(record.bookingCloseMinutesBefore)} (${formatDurationFromMinutes(record.bookingCloseMinutesBefore)})`"
                    />
                    <VListItem
                      prepend-icon="mdi-note-text-outline"
                      title="Schedule Note"
                      :subtitle="empty(record.scheduleNote)"
                    />
                  </VList>
                </VCard>

                <div class="d-flex flex-column ga-4">
                  <VCard border flat>
                    <VCardTitle class="text-subtitle-1">Route Summary</VCardTitle>
                    <VCardText>
                      <div class="route-summary">
                        <div>
                          <div class="text-h5 font-weight-bold">
                            {{ record.route.origin.stationCode }}
                          </div>
                          <div class="text-body-2 text-medium-emphasis">
                            {{ record.route.origin.stationName }}
                          </div>
                        </div>
                        <VIcon icon="mdi-airplane" />
                        <div class="text-end">
                          <div class="text-h5 font-weight-bold">
                            {{ record.route.destination.stationCode }}
                          </div>
                          <div class="text-body-2 text-medium-emphasis">
                            {{ record.route.destination.stationName }}
                          </div>
                        </div>
                      </div>
                      <div class="d-flex ga-2 flex-wrap mt-4">
                        <VChip size="small" variant="outlined">
                          {{ record.route.estimatedDurationMinutes }} min
                        </VChip>
                        <VChip size="small" variant="outlined">
                          {{ record.route.distanceKm }} km
                        </VChip>
                        <VChip size="small" variant="outlined">{{ record.route.status }}</VChip>
                      </div>
                      <VBtn
                        class="mt-4"
                        :to="`/master-data/routes/${record.route.id}`"
                        prepend-icon="mdi-open-in-new"
                        size="small"
                        variant="text"
                      >
                        Open Route
                      </VBtn>
                    </VCardText>
                  </VCard>

                  <VCard border flat>
                    <VCardTitle class="text-subtitle-1">Booking Window</VCardTitle>
                    <VCardText>
                      <VAlert v-if="!bookingValid" class="mb-3" color="warning" variant="tonal">
                        Booking open offset must be greater than booking close offset.
                      </VAlert>
                      <div class="metric-grid">
                        <div>
                          <div class="text-caption text-medium-emphasis">
                            Opens Before Departure
                          </div>
                          <div class="text-subtitle-1 font-weight-bold numeric">
                            {{ primaryDuration(record.bookingOpenMinutesBefore) }}
                          </div>
                          <div class="text-caption">
                            {{ formatDurationFromMinutes(record.bookingOpenMinutesBefore) }}
                          </div>
                        </div>
                        <div>
                          <div class="text-caption text-medium-emphasis">
                            Closes Before Departure
                          </div>
                          <div class="text-subtitle-1 font-weight-bold numeric">
                            {{ primaryDuration(record.bookingCloseMinutesBefore) }}
                          </div>
                          <div class="text-caption">
                            {{ formatDurationFromMinutes(record.bookingCloseMinutesBefore) }}
                          </div>
                        </div>
                      </div>
                    </VCardText>
                  </VCard>

                  <VCard border flat>
                    <VCardTitle class="text-subtitle-1">Operating Days</VCardTitle>
                    <VCardText>
                      <div class="d-flex ga-2 flex-wrap">
                        <VChip
                          v-for="day in ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']"
                          :key="day"
                          :prepend-icon="
                            dayIsEnabled(day as ScheduleOperatingDay) ? 'mdi-check' : undefined
                          "
                          :variant="
                            dayIsEnabled(day as ScheduleOperatingDay) ? 'tonal' : 'outlined'
                          "
                          :class="{
                            'font-weight-bold': dayIsEnabled(day as ScheduleOperatingDay),
                            'opacity-60': !dayIsEnabled(day as ScheduleOperatingDay)
                          }"
                          size="small"
                        >
                          {{ day }}
                        </VChip>
                      </div>
                    </VCardText>
                  </VCard>
                </div>
              </div>

              <VCard border flat class="mt-4">
                <VCardTitle class="text-subtitle-1">Template Summary</VCardTitle>
                <VCardText>
                  <div class="metrics-wrap">
                    <div>
                      <span>Service Type</span><strong>{{ record.serviceType.name }}</strong>
                    </div>
                    <div>
                      <span>Route</span><strong>{{ routeShortLabel(record) }}</strong>
                    </div>
                    <div>
                      <span>Default Aircraft</span><strong>{{ aircraftLabel(record) }}</strong>
                    </div>
                    <div>
                      <span>Operating Days</span><strong>{{ operatingDayCount }} days</strong>
                    </div>
                    <div>
                      <span>Booking Window</span><strong>{{ record.bookingOpenMinutesBefore / 60 }}h →
                        {{ record.bookingCloseMinutesBefore / 60 }}h</strong>
                    </div>
                    <div>
                      <span>Status</span><strong>{{ record.lifecycleStatus }}</strong>
                    </div>
                    <div>
                      <span>Effective Period</span><strong>{{ effectivePeriod(record) }}</strong>
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VWindowItem>

            <VWindowItem value="route">
              <VCard border flat>
                <VCardText>
                  <div class="text-h6 mb-1">{{ record.route.routeCode }}</div>
                  <div class="text-body-2 text-medium-emphasis mb-4">
                    {{ routeLongLabel(record) }}
                  </div>
                  <div class="metrics-wrap">
                    <div>
                      <span>Origin</span><strong>{{ record.route.origin.stationCode }} ·
                        {{ record.route.origin.stationName }}</strong>
                    </div>
                    <div>
                      <span>Destination</span><strong>{{ record.route.destination.stationCode }} ·
                        {{ record.route.destination.stationName }}</strong>
                    </div>
                    <div>
                      <span>Route Status</span><strong>{{ record.route.isActive ? 'Active' : 'Inactive' }}</strong>
                    </div>
                    <div>
                      <span>Distance</span><strong>{{ record.route.distanceKm }} km</strong>
                    </div>
                    <div>
                      <span>Estimated Duration</span><strong>{{ record.route.estimatedDurationMinutes }} min</strong>
                    </div>
                    <div>
                      <span>Timezone</span><strong>{{ record.route.origin.timezone }} →
                        {{ record.route.destination.timezone }}</strong>
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VWindowItem>

            <VWindowItem value="aircraft">
              <VAlert class="mb-4" color="info" variant="tonal">
                Default planning aircraft. Actual aircraft assignment may change during flight
                planning.
              </VAlert>
              <VCard border flat>
                <VCardText>
                  <div v-if="record.defaultAircraft" class="metrics-wrap">
                    <div>
                      <span>Registration</span><strong>{{ record.defaultAircraft.registration }}</strong>
                    </div>
                    <div>
                      <span>Aircraft Type</span><strong>{{ record.defaultAircraft.aircraftTypeName }}</strong>
                    </div>
                    <div>
                      <span>Model</span><strong>{{ record.defaultAircraft.model }}</strong>
                    </div>
                    <div>
                      <span>Passenger Capacity</span><strong>{{ record.defaultAircraft.passengerCapacity }}</strong>
                    </div>
                    <div>
                      <span>Cargo Capacity</span><strong>{{ record.defaultAircraft.cargoCapacityKg }} kg</strong>
                    </div>
                    <div>
                      <span>Operational Status</span><strong>{{ record.defaultAircraft.operationalStatus }}</strong>
                    </div>
                    <div>
                      <span>Serviceability</span><strong>{{ record.defaultAircraft.serviceabilityStatus }}</strong>
                    </div>
                  </div>
                  <div v-else class="text-medium-emphasis">No default aircraft configured.</div>
                </VCardText>
              </VCard>
            </VWindowItem>

            <VWindowItem value="operating-days">
              <VCard border flat>
                <VCardText>
                  <div class="metrics-wrap mb-4">
                    <div>
                      <span>Departure Local</span><strong>{{ record.departureTimeLocal }} ·
                        {{ record.route.origin.timezone }}</strong>
                    </div>
                    <div>
                      <span>Arrival Local</span><strong>{{ record.arrivalTimeLocal }} ·
                        {{ record.route.destination.timezone }}</strong>
                    </div>
                    <div>
                      <span>Arrival Day Offset</span><strong>+{{ record.arrivalDayOffset }} day</strong>
                    </div>
                    <div>
                      <span>Effective Period</span><strong>{{ effectivePeriod(record) }}</strong>
                    </div>
                  </div>
                  <div class="d-flex ga-2 flex-wrap">
                    <VChip
                      v-for="day in ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']"
                      :key="day"
                      :prepend-icon="
                        dayIsEnabled(day as ScheduleOperatingDay) ? 'mdi-check' : undefined
                      "
                      :variant="dayIsEnabled(day as ScheduleOperatingDay) ? 'tonal' : 'outlined'"
                      size="small"
                    >
                      {{ day }}
                    </VChip>
                  </div>
                </VCardText>
              </VCard>
            </VWindowItem>

            <VWindowItem value="booking-rules">
              <VCard border flat>
                <VCardText>
                  <div class="metrics-wrap">
                    <div>
                      <span>Booking Opens</span><strong>{{ primaryDuration(record.bookingOpenMinutesBefore) }} ·
                        {{ formatDurationFromMinutes(record.bookingOpenMinutesBefore) }}</strong>
                    </div>
                    <div>
                      <span>Booking Closes</span><strong>{{ primaryDuration(record.bookingCloseMinutesBefore) }} ·
                        {{ formatDurationFromMinutes(record.bookingCloseMinutesBefore) }}</strong>
                    </div>
                    <div>
                      <span>Capacity Profile</span><strong>{{ capacityProfileLabel(record) }}</strong>
                    </div>
                    <div>
                      <span>Validation</span><strong>{{ bookingValid ? 'Valid' : 'Invalid' }}</strong>
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VWindowItem>

            <VWindowItem value="notes">
              <div class="overview-grid">
                <VCard border flat>
                  <VCardTitle class="text-subtitle-1">Public Schedule Note</VCardTitle>
                  <VCardText class="note">{{ empty(record.scheduleNote) }}</VCardText>
                </VCard>
                <VCard border flat>
                  <VCardTitle class="text-subtitle-1">Internal Operational Note</VCardTitle>
                  <VCardText class="note">{{ empty(record.internalOperationalNote) }}</VCardText>
                </VCard>
              </div>
            </VWindowItem>

            <VWindowItem value="history">
              <VCard border flat>
                <VCardText>
                  <VSkeletonLoader v-if="historyPending" type="list-item-three-line@3" />
                  <VAlert v-else-if="historyError" color="error" variant="tonal">
                    {{ historyError }}
                  </VAlert>
                  <div v-else-if="!historyItems.length" class="text-medium-emphasis">
                    No audit history recorded yet.
                  </div>
                  <VTimeline v-else density="compact" side="end">
                    <VTimelineItem
                      v-for="item in historyItems"
                      :key="item.id"
                      dot-color="primary"
                      size="small"
                    >
                      <div class="font-weight-medium">{{ item.action }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ item.actorName ?? 'System' }} ·
                        {{ new Date(item.occurredAt).toLocaleString() }}
                      </div>
                      <div class="text-body-2 mt-1">
                        Changed fields:
                        {{ item.changedFields.length ? item.changedFields.join(', ') : '—' }}
                      </div>
                    </VTimelineItem>
                  </VTimeline>
                </VCardText>
              </VCard>
            </VWindowItem>
          </VWindow>
        </VCardText>
      </VCard>

      <FlightScheduleTemplateFormDialog v-model="editOpen" :record="record" @saved="onSaved" />

      <VDialog v-model="duplicateOpen" max-width="520">
        <VCard>
          <VCardTitle>Duplicate schedule template</VCardTitle>
          <VDivider />
          <VCardText>
            <VAlert v-if="duplicateError" class="mb-4" color="error" variant="tonal">
              {{ duplicateError }}
            </VAlert>
            <VTextField
              v-model="duplicateCode"
              autofocus
              label="New template code"
              variant="outlined"
            />
            <div class="text-caption text-medium-emphasis">
              The duplicate starts as Draft and does not copy audit history or generated flight
              references.
            </div>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="duplicateOpen = false">Cancel</VBtn>
            <VBtn :loading="duplicateSubmitting" color="primary" @click="submitDuplicate">
              Duplicate
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>

<style scoped>
.schedule-template-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.summary-grid,
.overview-grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-grid {
  grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.9fr);
}

.summary-column {
  display: grid;
  gap: 14px;
}

.summary-label,
.metrics-wrap span {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}

.summary-value,
.metrics-wrap strong {
  overflow-wrap: anywhere;
}

.numeric {
  font-variant-numeric: tabular-nums;
}

.note {
  white-space: pre-wrap;
}

.route-summary,
.metric-grid,
.metrics-wrap {
  display: grid;
  gap: 16px;
}

.route-summary {
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metrics-wrap {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.metrics-wrap div {
  display: grid;
  gap: 2px;
}

@media (max-width: 960px) {
  .schedule-template-header {
    flex-direction: column;
  }

  .summary-grid,
  .overview-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
