<script setup lang="ts">
import type {
  MaintenanceFacilityDto,
  MaintenanceFacilityOccupancyDto,
  MaintenanceSlotDto
} from '#shared/features/maintenance';

const ui = useMaintenanceUi();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function toLocalInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function timezoneOffsetMinutes(timeZone: string, utcDate: Date) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset'
  })
    .formatToParts(utcDate)
    .find((item) => item.type === 'timeZoneName')?.value;
  const match = part?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/u);
  if (!match) return timeZone === 'Asia/Jayapura' ? 540 : 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function localInputToIso(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u);
  if (!match) return new Date(value).toISOString();
  const utcGuess = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5])
    )
  );
  const offset = timezoneOffsetMinutes(timeZone, utcGuess);
  return new Date(utcGuess.getTime() - offset * 60_000).toISOString();
}

const filters = reactive({
  stationId: '',
  facilityId: '',
  dateFrom: toLocalInput(new Date(Date.now() - 2 * 60 * 60 * 1000)),
  dateTo: toLocalInput(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
  status: ''
});

const { data: facilityData } = await useAsyncData(
  'maintenance-facility-planning-facilities',
  () => fetchApi<MaintenanceFacilityDto[]>('/api/maintenance/facility-planning/facilities'),
  { server: false }
);

const facilities = computed(() => facilityData.value ?? []);
const selectedFacility = computed(
  () => facilities.value.find((facility) => facility.id === filters.facilityId) ?? null
);
const selectedStationFacility = computed(
  () =>
    selectedFacility.value ??
    facilities.value.find((facility) => facility.stationId === filters.stationId) ??
    facilities.value[0] ??
    null
);
const filterTimezone = computed(() => selectedStationFacility.value?.timezone ?? 'Asia/Jayapura');

const occupancyQuery = computed(() => ({
  stationId: filters.stationId || undefined,
  facilityId: filters.facilityId || undefined,
  dateFrom: localInputToIso(filters.dateFrom, filterTimezone.value),
  dateTo: localInputToIso(filters.dateTo, filterTimezone.value),
  status: filters.status || undefined
}));

const { data, pending, error, refresh } = await useAsyncData(
  'maintenance-facility-planning-occupancy',
  () =>
    fetchApi<MaintenanceFacilityOccupancyDto>('/api/maintenance/facility-planning/occupancy', {
      query: occupancyQuery.value
    }),
  { watch: [occupancyQuery], server: false }
);

const stationItems = computed(() => {
  const stations = new Map<string, string>();
  for (const facility of facilities.value) {
    stations.set(facility.stationId, `${facility.stationCode} - ${facility.stationName}`);
  }
  return [...stations.entries()].map(([value, title]) => ({ value, title }));
});
const facilityItems = computed(() =>
  facilities.value
    .filter((facility) => !filters.stationId || facility.stationId === filters.stationId)
    .map((facility) => ({ value: facility.id, title: `${facility.code} - ${facility.name}` }))
);
const statusItems = [
  { title: 'Aktif (Booked / In Progress)', value: '' },
  { title: 'Booked', value: 'BOOKED' },
  { title: 'In Progress', value: 'IN_PROGRESS' },
  { title: 'Completed / Histori', value: 'COMPLETED' },
  { title: 'Cancelled / Histori', value: 'CANCELLED' }
];
const timelineRows = computed(() => {
  const rows = new Map<
    string,
    {
      bayLabel: string;
      facilityLabel: string;
      slots: MaintenanceSlotDto[];
    }
  >();
  for (const facility of facilities.value) {
    if (filters.stationId && facility.stationId !== filters.stationId) continue;
    if (filters.facilityId && facility.id !== filters.facilityId) continue;
    for (const area of facility.areas) {
      for (const bay of area.bays) {
        rows.set(bay.id, {
          bayLabel: `${area.code} / ${bay.code}`,
          facilityLabel: `${facility.code} - ${facility.name}`,
          slots: []
        });
      }
    }
  }
  for (const slot of data.value?.slots ?? []) {
    const row = rows.get(slot.bayId);
    if (row) row.slots.push(slot);
  }
  return [...rows.entries()].map(([bayId, row]) => ({ bayId, ...row }));
});
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const planningStats = computed(() => {
  const slots = data.value?.slots ?? [];
  const activeSlots = slots.filter((slot) => ['BOOKED', 'IN_PROGRESS'].includes(slot.status));
  const inProgress = slots.filter((slot) => slot.status === 'IN_PROGRESS');
  const availableBays = timelineRows.value.filter((row) => row.slots.length === 0);
  return [
    {
      label: 'Active slots',
      value: activeSlots.length,
      helper: `${inProgress.length} in bay`,
      icon: 'mdi-calendar-clock',
      tone: 'primary'
    },
    {
      label: 'Available bays',
      value: availableBays.length,
      helper: `${timelineRows.value.length} total bays`,
      icon: 'mdi-garage-open-variant',
      tone: 'success'
    },
    {
      label: 'Actual custody',
      value:
        data.value?.actualOccupancies?.filter(
          (item) => !['HANDED_BACK', 'CANCELLED'].includes(item.status)
        ).length ?? 0,
      helper: 'movement tracked',
      icon: 'mdi-airplane-marker',
      tone: 'teal'
    },
    {
      label: 'Planning conflicts',
      value: data.value?.operationalConflicts?.length ?? 0,
      helper: 'bay / overrun watch',
      icon: 'mdi-alert-decagram-outline',
      tone: (data.value?.operationalConflicts?.length ?? 0) > 0 ? 'warning' : 'muted'
    }
  ];
});
const planningInsights = computed(() => {
  const nextOpenRow = timelineRows.value.find((row) => row.slots.length === 0);
  const nextSlot = [...(data.value?.slots ?? [])].sort((a, b) =>
    a.plannedStartAt.localeCompare(b.plannedStartAt)
  )[0];
  return [
    {
      title: 'Next open bay',
      value: nextOpenRow?.bayLabel ?? 'No open bay',
      note: nextOpenRow?.facilityLabel ?? 'Adjust filter window to find capacity',
      icon: 'mdi-map-marker-check-outline'
    },
    {
      title: 'Next scheduled movement',
      value: nextSlot?.aircraftRegistrationNumber ?? 'No slot queued',
      note: nextSlot
        ? `${nextSlot.packageNumber} · ${slotTime(nextSlot)}`
        : 'Create slot from work package',
      icon: 'mdi-timeline-clock-outline'
    },
    {
      title: 'Mock planning cue',
      value: 'Stage GSE before move-in',
      note: 'Demo guidance only; validate against resource readiness before execution',
      icon: 'mdi-forklift'
    }
  ];
});
const planningActions = [
  {
    label: 'Book Slot',
    to: '/maintenance/work-packages',
    icon: 'mdi-calendar-plus',
    color: 'primary'
  },
  {
    label: 'Review Conflicts',
    to: '/maintenance/facility-operations',
    icon: 'mdi-alert-outline',
    color: 'warning'
  },
  {
    label: 'Open Facility Operations',
    to: '/maintenance/facility-operations',
    icon: 'mdi-warehouse',
    color: 'teal'
  },
  {
    label: 'Open Work Packages',
    to: '/maintenance/work-packages',
    icon: 'mdi-folder-wrench-outline',
    color: 'secondary'
  }
];

function statusColor(status: string) {
  if (status === 'BOOKED') return 'info';
  if (status === 'IN_PROGRESS') return 'primary';
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'default';
  return 'warning';
}

function stationDateTime(value: string, timezone: string) {
  const formatterKey = timezone || 'UTC';
  let formatter = dateTimeFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: formatterKey
    });
    dateTimeFormatters.set(formatterKey, formatter);
  }
  return formatter.format(new Date(value));
}

function slotTime(slot: MaintenanceSlotDto) {
  return `${stationDateTime(slot.plannedStartAt, slot.stationTimezone)} - ${stationDateTime(
    slot.plannedEndAt,
    slot.stationTimezone
  )}`;
}
</script>

<template>
  <VContainer fluid class="facility-planning-page">
    <div class="facility-planning-header">
      <div>
        <div class="facility-planning-header__eyebrow">Facility Planning</div>
        <h1>Timeline Hangar</h1>
        <p>
          Occupancy fasilitas berasal dari Maintenance Slot, bukan catatan planning Work Package.
        </p>
      </div>
      <div class="facility-planning-header__actions">
        <VBtn prepend-icon="mdi-refresh" variant="tonal" :loading="pending" @click="refresh()">
          Refresh
        </VBtn>
        <VBtn prepend-icon="mdi-calendar-plus" color="primary" to="/maintenance/work-packages">
          Book Slot
        </VBtn>
      </div>
    </div>

    <VAlert v-if="apiError" type="error" variant="tonal" class="mb-4">
      <strong>{{ apiError.title }}</strong>
      <div>{{ apiError.impact }}</div>
      <div class="text-caption">Langkah berikutnya: {{ apiError.requiredAction }}</div>
      <div v-if="apiError.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
    </VAlert>

    <div class="planning-stat-grid">
      <VCard
        v-for="stat in planningStats"
        :key="stat.label"
        border
        elevation="0"
        class="planning-stat-card"
        :class="`planning-stat-card--${stat.tone}`"
      >
        <VCardText>
          <VAvatar rounded="lg" size="42" variant="tonal">
            <VIcon :icon="stat.icon" size="22" />
          </VAvatar>
          <div>
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
            <small>{{ stat.helper }}</small>
          </div>
        </VCardText>
      </VCard>
    </div>

    <VCard border elevation="0" class="planning-filter-card">
      <VCardText>
        <VRow>
          <VCol cols="12" md="3">
            <VSelect v-model="filters.stationId" label="Station" :items="stationItems" clearable />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="filters.facilityId"
              label="Fasilitas Maintenance"
              :items="facilityItems"
              clearable
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect v-model="filters.status" label="Status" :items="statusItems" />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField v-model="filters.dateFrom" label="Dari" type="datetime-local" />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField v-model="filters.dateTo" label="Sampai" type="datetime-local" />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <div class="planning-workspace">
      <VCard border elevation="0">
        <VCardTitle class="planning-section-title">
          <div>
            <h2>Bay Timeline</h2>
            <p>Slot plan, vacancy, dan aircraft custody untuk window filter aktif.</p>
          </div>
          <VChip size="small" variant="tonal">{{ timelineRows.length }} bays</VChip>
        </VCardTitle>
        <VCardText>
          <VAlert v-if="!timelineRows.length" type="info" variant="tonal">
            Belum ada facility/bay yang sesuai filter.
          </VAlert>
          <div v-else class="facility-timeline">
            <div v-for="row in timelineRows" :key="row.bayId" class="facility-timeline__row">
              <div class="facility-timeline__label">
                <strong>{{ row.bayLabel }}</strong>
                <span>{{ row.facilityLabel }}</span>
                <VChip
                  class="mt-2"
                  :color="row.slots.length ? 'primary' : 'success'"
                  size="small"
                  variant="tonal"
                >
                  {{ row.slots.length ? `${row.slots.length} slot` : 'Available' }}
                </VChip>
              </div>
              <div class="facility-timeline__slots">
                <VAlert v-if="!row.slots.length" type="success" variant="tonal" density="compact">
                  Tersedia pada rentang filter.
                </VAlert>
                <VCard
                  v-for="slot in row.slots"
                  :key="slot.id"
                  border
                  elevation="0"
                  class="facility-timeline__slot"
                >
                  <VCardText>
                    <div class="facility-timeline__slot-head">
                      <strong>{{ slot.aircraftRegistrationNumber }}</strong>
                      <VChip :color="statusColor(slot.status)" size="small" variant="tonal">
                        {{ ui.label(slot.status) }}
                      </VChip>
                    </div>
                    <div class="facility-timeline__slot-package">{{ slot.packageNumber }}</div>
                    <div class="text-caption text-medium-emphasis">{{ slotTime(slot) }}</div>
                    <div class="facility-timeline__slot-actions">
                      <VBtn
                        :to="`/maintenance/work-packages/${slot.workPackageId}`"
                        size="small"
                        variant="text"
                      >
                        Open package
                      </VBtn>
                      <VBtn to="/maintenance/facility-operations" size="small" variant="tonal">
                        Operations
                      </VBtn>
                    </div>
                  </VCardText>
                </VCard>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>

      <aside class="planning-side-stack">
        <VCard border elevation="0">
          <VCardTitle class="planning-section-title">
            <div>
              <h2>Planning Actions</h2>
              <p>Kontrol cepat untuk slot dan handoff facility.</p>
            </div>
          </VCardTitle>
          <VCardText class="planning-action-list">
            <VBtn
              v-for="action in planningActions"
              :key="action.label"
              block
              :color="action.color"
              :prepend-icon="action.icon"
              :to="action.to"
              variant="tonal"
            >
              {{ action.label }}
            </VBtn>
          </VCardText>
        </VCard>

        <VCard border elevation="0">
          <VCardTitle class="planning-section-title">
            <div>
              <h2>Conflict Watch</h2>
              <p>Actual occupancy dan slot overrun yang perlu follow-up.</p>
            </div>
          </VCardTitle>
          <VCardText>
            <div v-if="data?.operationalConflicts?.length" class="planning-conflict-list">
              <div v-for="conflict in data.operationalConflicts" :key="conflict.slotId">
                <VIcon color="warning" icon="mdi-alert-decagram-outline" />
                <span>
                  <strong>{{ conflict.bayCode }} · {{ conflict.code.replaceAll('_', ' ') }}</strong>
                  <small>{{ conflict.reason }}</small>
                </span>
              </div>
            </div>
            <VAlert v-else type="success" variant="tonal" density="compact">
              Tidak ada conflict pada window aktif.
            </VAlert>
          </VCardText>
        </VCard>

        <VCard border elevation="0">
          <VCardTitle class="planning-section-title">
            <div>
              <h2>Planning Insights</h2>
              <p>Ringkasan operasional dan mock cue untuk demo.</p>
            </div>
          </VCardTitle>
          <VCardText class="planning-insight-list">
            <div v-for="item in planningInsights" :key="item.title">
              <VAvatar rounded="lg" size="34" variant="tonal">
                <VIcon :icon="item.icon" size="18" />
              </VAvatar>
              <span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.title }} · {{ item.note }}</small>
              </span>
            </div>
          </VCardText>
        </VCard>
      </aside>
    </div>
  </VContainer>
</template>

<style scoped>
.facility-planning-page {
  --facility-navy: #082b49;
  --facility-teal: #0e8c8a;
  --facility-orange: #f47a1f;
  --facility-muted: rgba(var(--v-theme-on-surface), 0.64);
  background:
    linear-gradient(180deg, rgba(14, 140, 138, 0.06), transparent 320px),
    rgb(var(--v-theme-background));
}

.facility-planning-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.facility-planning-header h1 {
  color: var(--facility-navy);
  font-size: clamp(1.45rem, 2vw, 1.95rem);
  font-weight: 850;
  letter-spacing: 0;
  line-height: 1.12;
}

.facility-planning-header p {
  margin: 6px 0 0;
  color: var(--facility-muted);
}

.facility-planning-header__eyebrow {
  color: var(--facility-teal);
  font-size: 0.78rem;
  font-weight: 800;
}

.facility-planning-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.planning-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.planning-stat-card {
  border-radius: 8px;
}

.planning-stat-card :deep(.v-card-text) {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
}

.planning-stat-card span,
.planning-stat-card small,
.planning-section-title p {
  color: var(--facility-muted);
  font-size: 0.78rem;
}

.planning-stat-card strong {
  display: block;
  color: var(--facility-navy);
  font-size: 1.55rem;
  font-weight: 850;
  line-height: 1;
}

.planning-stat-card--teal :deep(.v-avatar),
.planning-stat-card--success :deep(.v-avatar) {
  color: var(--facility-teal);
}

.planning-stat-card--warning :deep(.v-avatar) {
  color: var(--facility-orange);
}

.planning-filter-card {
  margin-bottom: 18px;
  border-radius: 8px;
}

.planning-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.planning-side-stack {
  display: grid;
  gap: 16px;
}

.planning-section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.planning-section-title h2 {
  color: var(--facility-navy);
  font-size: 1rem;
  font-weight: 800;
}

.planning-section-title p {
  margin: 3px 0 0;
}

.facility-timeline {
  display: grid;
  gap: 12px;
}

.facility-timeline__row {
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  gap: 12px;
  align-items: stretch;
}

.facility-timeline__label {
  display: grid;
  align-content: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(8, 43, 73, 0.04), rgba(14, 140, 138, 0.04));
}

.facility-timeline__label span {
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.8125rem;
}

.facility-timeline__slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  min-height: 72px;
}

.facility-timeline__slot {
  min-height: 118px;
  border-radius: 8px;
}

.facility-timeline__slot-head,
.facility-timeline__slot-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.facility-timeline__slot-package {
  margin-top: 6px;
  color: var(--facility-navy);
  font-weight: 750;
}

.facility-timeline__slot-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 10px;
}

.planning-action-list {
  display: grid;
  gap: 8px;
}

.planning-action-list :deep(.v-btn__content) {
  justify-content: flex-start;
}

.planning-conflict-list,
.planning-insight-list {
  display: grid;
  gap: 10px;
}

.planning-conflict-list > div,
.planning-insight-list > div {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.planning-conflict-list span,
.planning-insight-list span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.planning-conflict-list strong,
.planning-insight-list strong {
  color: var(--facility-navy);
  font-size: 0.84rem;
}

.planning-conflict-list small,
.planning-insight-list small {
  color: var(--facility-muted);
  font-size: 0.76rem;
  line-height: 1.35;
}

@media (max-width: 1200px) {
  .planning-workspace {
    grid-template-columns: 1fr;
  }

  .planning-side-stack {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .facility-planning-header {
    flex-direction: column;
  }

  .facility-planning-header__actions {
    justify-content: flex-start;
  }

  .planning-stat-grid,
  .planning-side-stack {
    grid-template-columns: 1fr;
  }

  .facility-timeline__row {
    grid-template-columns: 1fr;
  }
}
</style>
