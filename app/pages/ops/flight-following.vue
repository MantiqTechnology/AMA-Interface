<script setup lang="ts">
import StationSelect from '../../features/operations/stations/StationSelect.vue';
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const currentRoute = useRoute();
const date = ref<Date | null>(
  typeof currentRoute.query.date === 'string'
    ? new Date(`${currentRoute.query.date}T00:00:00`)
    : null
);
const dateFrom = ref(
  typeof currentRoute.query.dateFrom === 'string' ? currentRoute.query.dateFrom : ''
);
const dateTo = ref(typeof currentRoute.query.dateTo === 'string' ? currentRoute.query.dateTo : '');
const status = ref<string | null>(
  typeof currentRoute.query.status === 'string' ? currentRoute.query.status : null
);
const stationId = ref<string | null>(
  typeof currentRoute.query.stationId === 'string' ? currentRoute.query.stationId : null
);
const tracking = ref<'LIVE' | 'STALE' | 'UNTRACKED' | null>(
  ['LIVE', 'STALE', 'UNTRACKED'].includes(String(currentRoute.query.tracking))
    ? (currentRoute.query.tracking as 'LIVE' | 'STALE' | 'UNTRACKED')
    : null
);
const statusItems = [
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'IN_PROGRESS',
  'LANDED',
  'DIVERTED',
  'PENDING_CLOSURE',
  'BLOCKED',
  'CLOSED',
  'CANCELLED'
];
const selectedFlightId = ref<string | null>(null);
const autoRefresh = ref(true);
const advancing = ref(false);
const mapRef = ref<{ fitFleet: () => void } | null>(null);
const { can } = useAuthorization();
const query = computed(() => ({
  date: date.value || undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
  stationId: stationId.value || undefined,
  status: status.value || undefined,
  tracking: tracking.value || undefined
}));
const {
  data: flights,
  pending,
  refresh
} = await useAsyncData(
  'flight-following',
  () =>
    fetchApi<OperationalFlightMonitorDto[]>('/api/flight-operations/flight-following', {
      query: query.value
    }),
  { default: () => [], watch: [query] }
);
const selectedFlight = computed(
  () => flights.value.find((flight) => flight.id === selectedFlightId.value) ?? null
);
const trackedCount = computed(() => flights.value.filter((flight) => flight.position).length);
const staleCount = computed(
  () => flights.value.filter((flight) => flight.position?.isStale).length
);

let refreshTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) void refresh();
  }, 15_000);
});
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

async function advanceDemoPosition() {
  if (!selectedFlight.value) return;
  advancing.value = true;
  try {
    await fetchApi(
      `/api/flight-operations/flights/${selectedFlight.value.id}/actions/advance-demo-position`,
      { method: 'POST' }
    );
    await refresh();
  } finally {
    advancing.value = false;
  }
}

function coordinate(value: number) {
  return value.toFixed(5);
}

function positionAge(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}

function time(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function urgencyColor(urgency: OperationalFlightMonitorDto['urgency']) {
  if (urgency === 'critical') return 'error';
  if (urgency === 'warning') return 'warning';
  return 'success';
}
</script>
<template>
  <VContainer class="flight-following-page" fluid>
    <section class="page-header">
      <div>
        <h1 class="text-h5 font-weight-bold text-text-primary">Operational flights</h1>

        <p class="page-description text-body-2 text-text-secondary">
          SIMULATED FLIGHT TRACKING from canonical flight records and manual demo positions.
        </p>
      </div>

      <div class="page-header-actions">
        <VChip color="warning" size="small" variant="tonal">DEMO ENVIRONMENT</VChip>
        <VChip prepend-icon="mdi-clock-outline" size="small" variant="tonal"> Asia/Jayapura </VChip>

        <VTooltip text="Refresh flight following">
          <template #activator="{ props }">
            <VBtn
              v-bind="props"
              aria-label="Refresh flight following"
              icon="mdi-refresh"
              :loading="pending"
              size="small"
              variant="tonal"
              @click="refresh"
            />
          </template>
        </VTooltip>
      </div>
    </section>

    <VCard class="filter-card" border flat>
      <div class="filter-header">
        <div>
          <div class="text-subtitle-2 font-weight-bold">Flight filters</div>

          <div class="text-caption text-text-secondary">
            Filter operational flights by date, status, or station.
          </div>
        </div>
      </div>
      <div class="filter-grid">
        <div class="filter-field">
          <VDateInput
            v-model="date"
            clearable
            density="compact"
            hide-actions
            hide-details
            label="Flight date"
            variant="outlined"
          />
        </div>

        <div class="filter-field">
          <VSelect
            v-model="status"
            clearable
            density="compact"
            hide-details
            :items="statusItems"
            label="Status"
            variant="outlined"
          />
        </div>

        <div class="filter-field station-filter">
          <StationSelect
            v-model="stationId"
            :allow-create="false"
            clearable
            hide-details
            label="Station"
          />
        </div>
        <div class="filter-field">
          <VSelect
            v-model="tracking"
            clearable
            density="compact"
            hide-details
            :items="[
              { title: 'Live', value: 'LIVE' },
              { title: 'Stale > 15 menit', value: 'STALE' },
              { title: 'Belum terlacak', value: 'UNTRACKED' }
            ]"
            label="Tracking health"
            variant="outlined"
          />
        </div>
      </div>
      <VAlert v-if="dateFrom || dateTo" class="mt-3" density="compact" type="info" variant="tonal">
        Drill-down dashboard: {{ dateFrom || 'awal data' }} sampai {{ dateTo || 'akhir data' }}.
        <VBtn
          class="ml-2"
          size="x-small"
          variant="text"
          @click="
            dateFrom = '';
            dateTo = '';
          "
        >
          Hapus rentang
        </VBtn>
      </VAlert>
    </VCard>

    <section class="tracking-surface">
      <div class="tracking-toolbar">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Fleet position monitor</div>
          <div class="text-caption text-text-secondary">
            {{ trackedCount }} aircraft tracked · {{ staleCount }} stale report{{
              staleCount === 1 ? '' : 's'
            }}
          </div>
        </div>
        <div class="tracking-actions">
          <VSwitch
            v-model="autoRefresh"
            color="secondary"
            density="compact"
            hide-details
            inset
            label="Auto refresh"
          />
          <VTooltip text="Fit all tracked flights">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                aria-label="Fit all tracked flights"
                icon="mdi-crosshairs-gps"
                size="small"
                variant="tonal"
                @click="mapRef?.fitFleet()"
              />
            </template>
          </VTooltip>
        </div>
      </div>

      <div class="tracking-layout">
        <div class="map-shell">
          <OperationsFlightFollowingMap
            ref="mapRef"
            :flights="flights"
            :selected-flight-id="selectedFlightId"
            @select="selectedFlightId = $event"
          />
          <div class="map-legend">
            <span><i class="legend-dot is-live" /> Live</span>
            <span><i class="legend-dot is-stale" /> Stale &gt; 15 min</span>
            <span><i class="legend-line" /> Planned route</span>
          </div>
        </div>

        <aside class="tracking-detail">
          <template v-if="selectedFlight?.position">
            <div class="detail-heading">
              <div>
                <div class="text-overline text-text-secondary">Selected aircraft</div>
                <div class="aircraft-detail-registration">
                  {{ selectedFlight.aircraftRegistration ?? 'Unassigned' }}
                </div>
                <div class="text-body-2 text-text-secondary">
                  {{ selectedFlight.flightNumber }} · {{ selectedFlight.originCode }} →
                  {{ selectedFlight.destinationCode }}
                </div>
              </div>
              <VBtn
                aria-label="Close aircraft detail"
                icon="mdi-close"
                size="x-small"
                variant="text"
                @click="selectedFlightId = null"
              />
            </div>

            <div class="position-state">
              <VChip
                :color="selectedFlight.position.isStale ? 'warning' : 'success'"
                size="small"
                variant="tonal"
              >
                {{ selectedFlight.position.isStale ? 'Stale telemetry' : 'Position current' }}
              </VChip>
              <span class="text-caption text-text-secondary">
                {{ positionAge(selectedFlight.position.recordedAt) }}
              </span>
            </div>

            <div class="progress-block">
              <div class="progress-label">
                <span>Operation progress</span>
                <strong>{{ selectedFlight.position.progressPercent ?? 0 }}%</strong>
              </div>
              <VProgressLinear
                color="accent-cenderawasih"
                height="8"
                :model-value="selectedFlight.position.progressPercent ?? 0"
                rounded
              />
            </div>

            <dl class="telemetry-grid">
              <div>
                <dt>Latitude</dt>
                <dd>{{ coordinate(selectedFlight.position.latitude) }}</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>{{ coordinate(selectedFlight.position.longitude) }}</dd>
              </div>
              <div>
                <dt>Altitude</dt>
                <dd>
                  {{
                    selectedFlight.position.altitudeFt === null
                      ? '-'
                      : `${selectedFlight.position.altitudeFt.toLocaleString('id-ID')} ft`
                  }}
                </dd>
              </div>
              <div>
                <dt>Ground speed</dt>
                <dd>
                  {{
                    selectedFlight.position.groundSpeedKt === null
                      ? '-'
                      : `${selectedFlight.position.groundSpeedKt} kt`
                  }}
                </dd>
              </div>
              <div>
                <dt>Heading</dt>
                <dd>
                  {{
                    selectedFlight.position.headingDeg === null
                      ? '-'
                      : `${Math.round(selectedFlight.position.headingDeg)}°`
                  }}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{{ selectedFlight.position.source.replaceAll('_', ' ') }}</dd>
              </div>
            </dl>

            <VBtn
              v-if="
                selectedFlight.currentStatus === 'IN_PROGRESS' &&
                  can('flight.movement.update').allowed
              "
              block
              color="secondary"
              :loading="advancing"
              prepend-icon="mdi-airplane-clock"
              variant="flat"
              @click="advanceDemoPosition"
            >
              Advance demo position
            </VBtn>
            <p class="demo-disclaimer">
              Simulated operational telemetry for demonstration, not certified surveillance or
              navigation data.
            </p>
          </template>
          <div v-else class="detail-empty">
            <VIcon icon="mdi-radar" size="40" />
            <div class="text-subtitle-2 font-weight-bold">Select an aircraft</div>
            <div class="text-body-2 text-text-secondary">
              Choose a marker to inspect its latest coordinate and operation progress.
            </div>
          </div>
        </aside>
      </div>
    </section>

    <VCard class="flight-table-card" border flat>
      <div class="table-toolbar">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Flight monitor</div>

          <div class="text-caption text-text-secondary">
            {{ flights.length }} operational flight{{ flights.length === 1 ? '' : 's' }}
          </div>
        </div>
      </div>

      <VDivider />

      <div class="table-scroll">
        <VTable class="following-table" density="comfortable">
          <thead>
            <tr>
              <th class="flight-column">Flight</th>

              <th class="route-column">Route</th>

              <th class="time-column">
                <div>Departure</div>
                <div class="column-caption">STD / ATD</div>
              </th>

              <th class="time-column">
                <div>Arrival</div>
                <div class="column-caption">STA / ATA</div>
              </th>

              <th class="aircraft-column">Aircraft</th>

              <th class="status-column">Status</th>

              <th class="delay-column">Delay</th>

              <th class="readiness-column">Readiness</th>

              <th class="next-action-column">Next action</th>

              <th class="open-column" aria-label="Open flight" />
            </tr>
          </thead>

          <tbody>
            <template v-if="pending">
              <tr v-for="row in 6" :key="`loading-${row}`">
                <td v-for="column in 10" :key="column">
                  <VSkeletonLoader type="text" />
                </td>
              </tr>
            </template>

            <tr v-else-if="!flights.length">
              <td class="empty-cell" colspan="10">
                <div class="empty-state">
                  <VIcon icon="mdi-airplane-search" size="42" />

                  <div>
                    <div class="text-subtitle-1 font-weight-bold">No flights found</div>

                    <div class="text-body-2 text-text-secondary">
                      Adjust the selected date, status, or station.
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <template v-else>
              <tr
                v-for="flight in flights"
                :key="flight.id"
                class="flight-row"
                :class="{ 'is-selected': flight.id === selectedFlightId }"
                @click="flight.position && (selectedFlightId = flight.id)"
              >
                <td class="flight-column">
                  <div class="flight-number">
                    {{ flight.flightNumber }}
                  </div>

                  <div class="flight-date text-caption text-text-secondary">
                    {{ flight.flightDate }}
                  </div>
                </td>

                <td class="route-column">
                  <div class="route-main">
                    <span>{{ flight.originCode }}</span>

                    <VIcon icon="mdi-arrow-right" size="15" />

                    <span>{{ flight.plannedDestinationCode }}</span>
                  </div>

                  <div
                    v-if="flight.actualArrivalStationCode"
                    class="route-actual text-caption text-text-secondary"
                  >
                    Actual:
                    <span class="font-weight-medium">
                      {{ flight.actualArrivalStationCode }}
                    </span>
                  </div>
                </td>

                <td class="time-column">
                  <div class="time-list">
                    <div class="time-item">
                      <span class="time-label">STD</span>

                      <span class="time-value">
                        {{ time(flight.scheduledDepartureAt) }}
                      </span>
                    </div>

                    <div class="time-item">
                      <span class="time-label">ATD</span>

                      <span
                        class="time-value"
                        :class="{ 'text-text-secondary': !flight.actualDepartureAt }"
                      >
                        {{ time(flight.actualDepartureAt) }}
                      </span>
                    </div>
                  </div>
                </td>

                <td class="time-column">
                  <div class="time-list">
                    <div class="time-item">
                      <span class="time-label">STA</span>

                      <span class="time-value">
                        {{ time(flight.scheduledArrivalAt) }}
                      </span>
                    </div>

                    <div class="time-item">
                      <span class="time-label">ATA</span>

                      <span
                        class="time-value"
                        :class="{ 'text-text-secondary': !flight.actualArrivalAt }"
                      >
                        {{ time(flight.actualArrivalAt) }}
                      </span>
                    </div>
                  </div>
                </td>

                <td class="aircraft-column">
                  <span class="aircraft-registration">
                    {{ flight.aircraftRegistration ?? '-' }}
                  </span>
                </td>

                <td class="status-column">
                  <FlightsFlightStatusChip :status="flight.currentStatus" />
                </td>

                <td class="delay-column">
                  <VChip :color="urgencyColor(flight.urgency)" size="small" variant="tonal">
                    {{ flight.delayMinutes > 0 ? `${flight.delayMinutes} min` : 'On time' }}
                  </VChip>
                </td>

                <td class="readiness-column">
                  <div class="readiness-content">
                    <div class="readiness-header">
                      <span class="text-caption text-text-secondary"> Completion </span>

                      <span class="readiness-percent"> {{ flight.readinessPercent }}% </span>
                    </div>

                    <VProgressLinear
                      color="secondary"
                      height="7"
                      :model-value="flight.readinessPercent"
                      rounded
                    />
                  </div>
                </td>

                <td class="next-action-column">
                  <div class="action-content">
                    <div
                      class="action-title"
                      :class="{ 'text-text-secondary': !flight.nextAction }"
                    >
                      {{ flight.nextAction ?? 'No pending action' }}
                    </div>

                    <div
                      v-if="flight.blockingReason"
                      class="blocking-reason text-caption text-error"
                    >
                      <VIcon icon="mdi-alert-circle-outline" size="14" />

                      <span>{{ flight.blockingReason }}</span>
                    </div>
                  </div>
                </td>

                <td class="open-column">
                  <VTooltip text="Open flight detail">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        aria-label="Open flight detail"
                        icon="mdi-chevron-right"
                        size="small"
                        :to="`/flights/${flight.id}`"
                        variant="text"
                      />
                    </template>
                  </VTooltip>
                </td>
              </tr>
            </template>
          </tbody>
        </VTable>
      </div>
    </VCard>
  </VContainer>
</template>
<style scoped>
.flight-following-page {
  display: grid;
  gap: 16px;
  padding: 20px 16px 32px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.page-description {
  margin-top: 3px;
  margin-bottom: 0;
}

.page-header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.filter-card,
.flight-table-card {
  border-radius: 10px;
}

.tracking-surface {
  overflow: hidden;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.tracking-toolbar {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tracking-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tracking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  min-height: 460px;
}

.map-shell {
  position: relative;
  min-width: 0;
  min-height: 460px;
}

.map-legend {
  position: absolute;
  z-index: 2;
  top: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 7px 10px;
  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 6px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 8px rgb(18 33 31 / 10%);
  color: #334846;
  font-size: 0.7rem;
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.is-live {
  background: #0e8c8a;
}

.legend-dot.is-stale {
  background: #7a8586;
}

.legend-line {
  display: inline-block;
  width: 17px;
  border-top: 2px dashed #286e9e;
}

.tracking-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.detail-heading,
.position-state,
.progress-label {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.aircraft-detail-registration {
  font-size: 1.45rem;
  font-weight: 800;
}

.position-state {
  align-items: center;
}

.progress-block {
  display: grid;
  gap: 8px;
}

.progress-label {
  align-items: center;
  font-size: 0.8rem;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.telemetry-grid > div {
  min-width: 0;
  padding: 10px;
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.telemetry-grid dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.68rem;
}

.telemetry-grid dd {
  overflow: hidden;
  margin: 3px 0 0;
  font-size: 0.78rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-disclaimer {
  margin: -10px 0 0;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.68rem;
  line-height: 1.45;
}

.detail-empty {
  display: grid;
  flex: 1;
  place-content: center;
  gap: 8px;
  text-align: center;
}

.filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 16px;
}

.filter-header {
  flex: 1 1 auto;
  min-width: 180px;
}

.filter-grid {
  display: grid;
  grid-template-columns:
    minmax(170px, 190px)
    minmax(200px, 240px)
    minmax(220px, 260px);
  flex: 0 1 auto;
  gap: 10px;
  align-items: center;
}

.filter-control,
.station-filter {
  min-width: 0;
}

.station-filter :deep(.v-input) {
  width: 100%;
}

.station-filter :deep(.v-field) {
  min-height: 40px;
}

.station-filter :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.table-toolbar {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.following-table {
  min-width: 1320px;
}

.following-table :deep(table) {
  table-layout: fixed;
}

.following-table :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 52px;
  padding: 9px 12px;
  background: rgb(var(--v-theme-surface));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  vertical-align: middle;
  white-space: nowrap;
}

.following-table :deep(tbody td) {
  height: 76px;
  padding: 11px 12px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: middle;
}

.following-table :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.flight-row {
  transition: background-color 140ms ease;
}

.flight-row:hover td {
  background: rgba(var(--v-theme-on-surface), 0.025);
}

.flight-row.is-selected td {
  background: rgba(var(--v-theme-secondary), 0.08);
}

.column-caption {
  margin-top: 1px;
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: normal;
  opacity: 0.65;
}

.flight-column {
  width: 132px;
}

.route-column {
  width: 115px;
}

.time-column {
  width: 108px;
}

.aircraft-column {
  width: 90px;
}

.status-column {
  width: 180px;
}

.delay-column {
  width: 88px;
}

.readiness-column {
  width: 165px;
}

.next-action-column {
  width: 255px;
}

.open-column {
  position: sticky;
  right: 0;
  z-index: 1;
  width: 50px;
  min-width: 50px;
  padding-right: 8px !important;
  padding-left: 8px !important;
  background: rgb(var(--v-theme-surface));
  text-align: center;
}

@media (max-width: 960px) {
  .filter-card {
    display: grid;
  }

  .filter-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .tracking-layout {
    grid-template-columns: 1fr;
  }

  .tracking-detail {
    border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-left: 0;
  }
}

@media (max-width: 600px) {
  .tracking-toolbar {
    align-items: flex-start;
  }

  .tracking-actions {
    align-items: flex-end;
  }

  .tracking-actions :deep(.v-label) {
    display: none;
  }

  .map-shell,
  .tracking-layout {
    min-height: 380px;
  }

  .map-legend {
    right: 12px;
  }
}

.following-table :deep(thead .open-column) {
  z-index: 3;
}

.flight-number,
.flight-date,
.route-main,
.time-value,
.aircraft-registration,
.readiness-percent {
  font-variant-numeric: tabular-nums;
}

.flight-number {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flight-date {
  margin-top: 3px;
}

.route-main {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  white-space: nowrap;
}

.route-actual {
  margin-top: 4px;
  white-space: nowrap;
}

.time-list {
  display: grid;
  gap: 5px;
}

.time-item {
  display: grid;
  grid-template-columns: 27px minmax(0, 1fr);
  align-items: baseline;
  gap: 5px;
}

.time-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0.62;
}

.time-value {
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
}

.aircraft-registration {
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-column :deep(.v-chip) {
  max-width: 100%;
}

.status-column :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.readiness-content {
  display: grid;
  gap: 7px;
}

.readiness-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.readiness-percent {
  font-size: 0.72rem;
  font-weight: 700;
}

.action-content {
  min-width: 0;
}

.action-title {
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blocking-reason {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.blocking-reason .v-icon {
  margin-right: 3px;
  vertical-align: -2px;
}

.empty-cell {
  height: 270px !important;
  text-align: center;
}

.empty-state {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

@media (max-width: 1100px) {
  .filter-card {
    display: grid;
  }

  .filter-grid {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .flight-following-page {
    padding: 16px 12px 24px;
  }

  .page-header {
    align-items: center;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-header {
    display: none;
  }
}
</style>
