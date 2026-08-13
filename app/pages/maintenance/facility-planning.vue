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
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Timeline Hangar</h1>
        <p class="text-medium-emphasis mb-0">
          Occupancy fasilitas berasal dari Maintenance Slot, bukan catatan planning Work Package.
        </p>
      </div>
      <VBtn prepend-icon="mdi-refresh" variant="tonal" :loading="pending" @click="refresh()">
        Refresh
      </VBtn>
    </div>

    <VAlert v-if="apiError" type="error" variant="tonal" class="mb-4">
      {{ apiError.message }}
    </VAlert>

    <VCard border class="mb-4">
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

    <VCard border>
      <VCardText>
        <VAlert v-if="!timelineRows.length" type="info" variant="tonal">
          Belum ada facility/bay yang sesuai filter.
        </VAlert>
        <div v-else class="facility-timeline">
          <div v-for="row in timelineRows" :key="row.bayId" class="facility-timeline__row">
            <div class="facility-timeline__label">
              <strong>{{ row.bayLabel }}</strong>
              <span>{{ row.facilityLabel }}</span>
            </div>
            <div class="facility-timeline__slots">
              <VAlert v-if="!row.slots.length" type="info" variant="tonal" density="compact">
                Tersedia pada rentang filter.
              </VAlert>
              <VCard
                v-for="slot in row.slots"
                :key="slot.id"
                border
                class="facility-timeline__slot"
              >
                <VCardText>
                  <div class="d-flex align-center justify-space-between ga-2">
                    <strong>{{ slot.aircraftRegistrationNumber }}</strong>
                    <VChip :color="statusColor(slot.status)" size="small" variant="tonal">
                      {{ ui.label(slot.status) }}
                    </VChip>
                  </div>
                  <div>{{ slot.packageNumber }}</div>
                  <div class="text-caption text-medium-emphasis">{{ slotTime(slot) }}</div>
                </VCardText>
              </VCard>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
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
}

.facility-timeline__label span {
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.8125rem;
}

.facility-timeline__slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  min-height: 72px;
}

.facility-timeline__slot {
  min-height: 72px;
}

@media (max-width: 800px) {
  .facility-timeline__row {
    grid-template-columns: 1fr;
  }
}
</style>
