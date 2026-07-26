<script setup lang="ts">
import StationSelect from '../../features/operations/stations/StationSelect.vue';
import type { OperationalFlightMonitorDto } from '#shared/contracts/operations-monitoring';

const date = ref<Date | null>(null);
const status = ref<string | null>(null);
const stationId = ref<string | null>(null);
const query = computed(() => ({
  date: date.value || undefined,
  stationId: stationId.value || undefined,
  status: status.value || undefined
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
          Live operational timeline from canonical flight records.
        </p>
      </div>

      <div class="page-header-actions">
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
      </div>
    </VCard>

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
              <tr v-for="flight in flights" :key="flight.id" class="flight-row">
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
