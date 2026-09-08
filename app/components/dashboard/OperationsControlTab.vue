<script setup lang="ts">
import type {
  AviationDashboardTone,
  AviationOperationsDashboardDto,
  DashboardDataState,
  DashboardFreshnessItem,
  ReadinessDomain
} from '#shared/contracts/aviation-dashboard';

const props = defineProps<{
  data: AviationOperationsDashboardDto;
  sections: Record<string, boolean>;
}>();
const emit = defineEmits<{ selectFlight: [flightId: string] }>();

const selectedFlightId = computed({
  get: () => props.data.selectedFlight?.id ?? '',
  set: (value: string) => emit('selectFlight', value)
});
const freshnessExpanded = ref(false);

const attentionItems = computed(() =>
  props.data.attention.items?.length
    ? props.data.attention.items
    : props.data.attention.primary
      ? [props.data.attention.primary]
      : []
);
const healthMetrics = computed(() => {
  const priority = new Map([
    ['BLOCKED', 0],
    ['DELAYED', 1],
    ['ACTIVE', 2],
    ['AVAILABLE', 3],
    ['FLIGHTS', 4],
    ['LIMITED', 5]
  ]);
  return props.data.metrics
    .slice()
    .sort((a, b) => (priority.get(a.key) ?? 9) - (priority.get(b.key) ?? 9));
});
const allFlights = computed(() =>
  props.data.flightBoard
    .flatMap((lane) => lane.flights.map((flight) => ({ ...flight, lifecycle: lane.label })))
    .sort((a, b) => String(a.scheduledDepartureAt).localeCompare(String(b.scheduledDepartureAt)))
);
const compactFlightMode = computed(() => allFlights.value.length <= 8);
const activeLanes = computed(() => props.data.flightBoard.filter((lane) => lane.flights.length));

function dataState(item: DashboardFreshnessItem): DashboardDataState {
  if (item.dataState) return item.dataState;
  if (item.state === 'NOT_CONNECTED') return 'DISCONNECTED';
  if (!item.updatedAt) return 'NO_DATA';
  return item.state === 'STALE' ? 'STALE' : 'FRESH';
}

const dataHealth = computed(() => {
  const states = props.data.freshness.map(dataState);
  return {
    stale: states.filter((state) => state === 'STALE').length,
    disconnected: states.filter((state) => state === 'DISCONNECTED').length,
    noData: states.filter((state) => state === 'NO_DATA').length,
    latest: props.data.freshness.find((item) => item.key === 'FLIGHT_OPERATIONS')?.updatedAt ?? null
  };
});

const domainIcon: Record<ReadinessDomain['key'], string> = {
  AIRCRAFT: 'mdi-airplane',
  CREW: 'mdi-account-group',
  STATION: 'mdi-airport',
  WEATHER: 'mdi-weather-cloudy-alert',
  FUEL: 'mdi-fuel',
  DOCUMENTATION: 'mdi-file-document-check'
};

function toneColor(tone: AviationDashboardTone) {
  return tone === 'neutral' ? 'secondary' : tone;
}

function stateTone(value: string): AviationDashboardTone {
  const normalized = value.toLowerCase();
  if (/blocked|critical|aog|unserviceable|exception|disconnected/u.test(normalized))
    return 'danger';
  if (/limited|warning|watch|stale|maintenance|constrained|landed/u.test(normalized))
    return 'warning';
  if (/ready|available|closed|fresh|completed|active/u.test(normalized)) return 'success';
  return 'info';
}

function stateIcon(value: string) {
  const tone = stateTone(value);
  return tone === 'danger'
    ? 'mdi-alert-circle'
    : tone === 'warning'
      ? 'mdi-alert'
      : tone === 'success'
        ? 'mdi-check-circle'
        : 'mdi-information';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No data';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}
</script>

<template>
  <div class="operations-dashboard">
    <section
      v-if="sections.attention"
      class="data-health"
      aria-label="Operational context and data health"
    >
      <div class="data-health__context">
        <VIcon color="info" icon="mdi-radar" size="21" />
        <strong>{{ data.meta.dateFrom }}</strong>
        <span>{{ data.meta.stationLabel }}</span>
        <span>{{
          data.meta.operationType === 'ALL' ? 'All operations' : data.meta.operationType
        }}</span>
      </div>
      <div class="data-health__summary">
        <VIcon
          :color="
            dataHealth.disconnected || dataHealth.stale || dataHealth.noData ? 'warning' : 'success'
          "
          :icon="
            dataHealth.disconnected || dataHealth.stale || dataHealth.noData
              ? 'mdi-database-alert'
              : 'mdi-database-check'
          "
          size="20"
        />
        <strong>Data health</strong>
        <span v-if="dataHealth.stale || dataHealth.disconnected || dataHealth.noData">
          {{ dataHealth.stale }} stale · {{ dataHealth.disconnected }} disconnected ·
          {{ dataHealth.noData }} no data
        </span>
        <span v-else>All connected sources are fresh</span>
        <small>Last operational sync {{ formatTime(dataHealth.latest) }}</small>
        <VBtn
          :aria-expanded="freshnessExpanded"
          :append-icon="freshnessExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          size="small"
          variant="text"
          @click="freshnessExpanded = !freshnessExpanded"
        >
          {{ freshnessExpanded ? 'Hide details' : 'View details' }}
        </VBtn>
      </div>
      <VExpandTransition>
        <div v-if="freshnessExpanded" class="data-health__details">
          <NuxtLink v-for="item in data.freshness" :key="item.key" :to="item.href || undefined">
            <span>{{ item.label }}</span>
            <DashboardStateBadge
              compact
              :icon="stateIcon(dataState(item))"
              :label="dataState(item).replaceAll('_', ' ')"
              :tone="stateTone(dataState(item))"
            />
            <time>{{
              item.updatedAt ? formatDateTime(item.updatedAt) : 'Update unavailable'
            }}</time>
          </NuxtLink>
        </div>
      </VExpandTransition>
    </section>

    <div v-if="sections.attention" class="top-grid">
      <VCard border class="panel-card attention-panel">
        <div class="panel-heading panel-heading--danger">
          <VIcon color="danger" icon="mdi-alert" size="25" />
          <div>
            <h2>Operational Attention</h2>
            <p>What requires intervention now</p>
          </div>
          <span class="updated-label">Updated {{ formatTime(data.meta.generatedAt) }}</span>
        </div>
        <div class="attention-counts">
          <div class="attention-count attention-count--critical">
            <VIcon color="danger" icon="mdi-alert-circle" /><strong>{{
              data.attention.counts.critical
            }}</strong><span>Critical</span>
          </div>
          <div class="attention-count">
            <VIcon color="warning" icon="mdi-alert" /><strong>{{
              data.attention.counts.warning
            }}</strong><span>Attention</span>
          </div>
          <div class="attention-count">
            <VIcon color="warning" icon="mdi-timer-alert-outline" /><strong>{{
              data.attention.counts.constraints
            }}</strong><span>Constraints</span>
          </div>
          <div class="attention-count attention-count--stable">
            <VIcon color="success" icon="mdi-check-circle" /><strong>{{
              data.attention.counts.stable
            }}</strong><span>Stable</span>
          </div>
        </div>
        <div v-if="attentionItems.length" class="issue-list">
          <DashboardOperationalIssueCard
            v-for="(item, index) in attentionItems"
            :key="item.id"
            :item="item"
            :primary="index === 0"
          />
        </div>
        <div v-else class="panel-empty panel-empty--positive">
          <VIcon color="success" icon="mdi-check-circle-outline" />
          <div>
            <strong>No blocked or critical flights</strong><span>All currently monitored flights are operationally clear.</span>
          </div>
        </div>
      </VCard>

      <VCard border class="panel-card actions-panel">
        <div class="panel-heading panel-heading--info">
          <VIcon color="info" icon="mdi-account-check-outline" size="24" />
          <div>
            <h2>My Actions</h2>
            <p>Decisions assigned to your current role</p>
          </div>
          <VChip color="info" size="small" variant="tonal">{{ data.actions.length }}</VChip>
        </div>
        <div v-if="data.actions.length" class="action-list">
          <article v-for="item in data.actions.slice(0, 4)" :key="item.id" class="action-row">
            <div class="action-row__top">
              <DashboardStateBadge
                compact
                :icon="stateIcon(item.severity)"
                :label="item.severity === 'critical' ? 'HIGH' : 'MEDIUM'"
                :tone="item.severity === 'critical' ? 'danger' : 'warning'"
              />
              <strong>{{ item.flightNumber }}</strong><span>{{ item.route }}</span>
            </div>
            <p>{{ item.requiredAction ?? item.issue }}</p>
            <div class="action-row__meta">
              <span><VIcon icon="mdi-clock-outline" size="15" />{{ formatDateTime(item.dueAt) }}</span><span><VIcon icon="mdi-account-outline" size="15" />{{ item.owner }}</span>
            </div>
            <VBtn
              append-icon="mdi-arrow-right"
              color="info"
              size="small"
              :to="item.href"
              variant="tonal"
            >
              {{ item.actionLabel ?? 'Review decision' }}
            </VBtn>
          </article>
        </div>
        <div v-else class="panel-empty panel-empty--positive">
          <VIcon color="success" icon="mdi-check-all" />
          <div>
            <strong>No decisions currently waiting for this role</strong><span>Assigned operational work will appear here.</span>
          </div>
        </div>
      </VCard>
    </div>

    <div class="dashboard-grid">
      <VCard v-if="sections.dailyMetrics" border class="panel-card span-12">
        <div class="panel-heading">
          <VIcon color="info" icon="mdi-airplane" size="24" />
          <div>
            <h2>Today's Operational Health</h2>
            <p>Exceptions are emphasized before normal operating volume</p>
          </div>
        </div>
        <div class="metric-strip">
          <NuxtLink
            v-for="metric in healthMetrics"
            :key="metric.key"
            class="metric-cell"
            :class="`metric-cell--${metric.tone}`"
            :to="metric.href || undefined"
          >
            <VIcon :color="toneColor(metric.tone)" :icon="metric.icon" size="27" />
            <div>
              <strong>{{ metric.value }}</strong><span>{{ metric.label }}</span><small>{{ metric.detail }}</small>
            </div>
          </NuxtLink>
        </div>
      </VCard>

      <VCard v-if="sections.readiness" border class="panel-card span-12 readiness-card">
        <div class="panel-heading panel-heading--split">
          <div class="panel-heading__title">
            <VIcon color="info" icon="mdi-vector-polyline" size="24" />
            <div>
              <h2>Cross-Domain Flight Readiness</h2>
              <p>Completion, release state, risk, and data availability are evaluated separately</p>
            </div>
          </div>
          <VSelect
            v-if="data.flightOptions.length"
            v-model="selectedFlightId"
            aria-label="Change selected flight"
            class="flight-select"
            density="comfortable"
            hide-details
            item-title="flightNumber"
            item-value="id"
            :items="data.flightOptions"
            variant="outlined"
          />
        </div>
        <div v-if="data.selectedFlight" class="readiness-body">
          <aside
            class="readiness-verdict"
            :class="`readiness-verdict--${stateTone(data.readinessVerdict?.releaseState ?? data.selectedFlight.currentStatus)}`"
          >
            <div class="readiness-verdict__flight">
              <strong>{{ data.selectedFlight.flightNumber }}</strong><span>{{ data.selectedFlight.route }}</span><small>STD {{ formatTime(data.selectedFlight.scheduledDepartureAt) }} ·
                {{ data.selectedFlight.aircraftRegistration ?? 'Aircraft unassigned' }}</small>
            </div>
            <div class="readiness-verdict__state">
              <span>Flight readiness</span><strong>{{
                data.readinessVerdict?.releaseState ?? data.selectedFlight.currentStatus
              }}</strong><small>{{
                data.readinessVerdict?.completionPercent ?? data.selectedFlight.readinessPercent
              }}% checks complete ·
                {{
                  data.readinessVerdict?.operationalRisk ?? data.selectedFlight.urgency
                }}
                risk</small>
            </div>
            <dl v-if="data.readinessVerdict?.primaryBlocker">
              <div>
                <dt>Primary blocker</dt>
                <dd>{{ data.readinessVerdict.primaryBlocker }}</dd>
              </div>
              <div>
                <dt>Operational impact</dt>
                <dd>{{ data.readinessVerdict.operationalImpact }}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{{ data.readinessVerdict.owner }}</dd>
              </div>
              <div>
                <dt>Required action</dt>
                <dd>{{ data.readinessVerdict.requiredAction }}</dd>
              </div>
            </dl>
            <VBtn
              v-if="data.readinessVerdict?.href"
              append-icon="mdi-arrow-right"
              :color="toneColor(stateTone(data.readinessVerdict.releaseState))"
              size="small"
              :to="data.readinessVerdict.href"
            >
              {{ data.readinessVerdict.actionLabel ?? 'Review readiness' }}
            </VBtn>
          </aside>
          <div class="readiness-chain">
            <NuxtLink
              v-for="domain in data.readinessDomains"
              :key="domain.key"
              class="readiness-node"
              :class="`readiness-node--${stateTone(domain.state)}`"
              :to="domain.href || undefined"
            >
              <VIcon
                :color="toneColor(stateTone(domain.state))"
                :icon="domainIcon[domain.key]"
                size="23"
              />
              <span>{{ domain.label }}</span><strong>{{ domain.value }}</strong>
              <DashboardStateBadge
                compact
                :icon="stateIcon(domain.state)"
                :label="domain.state.replaceAll('_', ' ')"
                :tone="stateTone(domain.state)"
              />
              <small>{{ domain.detail }}</small>
            </NuxtLink>
          </div>
        </div>
        <div v-else class="panel-empty">
          <VIcon icon="mdi-airplane-off" />No flight is available in the selected scope.
        </div>
      </VCard>

      <VCard v-if="sections.fleet" border class="panel-card span-12">
        <div class="panel-heading">
          <VIcon color="info" icon="mdi-tools" size="23" />
          <div>
            <h2>Fleet & Maintenance Control</h2>
            <p>Technical state, operational effect, and recovery visibility</p>
          </div>
        </div>
        <div class="mini-summary">
          <div v-for="point in data.fleetSummary" :key="point.key">
            <DashboardStateBadge
              compact
              :icon="stateIcon(point.label)"
              :label="point.label"
              :tone="stateTone(point.label)"
            /><strong>{{ point.value }}</strong>
          </div>
        </div>
        <div class="compact-table-wrap">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Type</th>
                <th>Station</th>
                <th>Technical status</th>
                <th>Operational effect</th>
                <th>Reason</th>
                <th>Maintenance / RTS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="aircraft in data.fleet.slice(0, 8)" :key="aircraft.id">
                <td>
                  <NuxtLink :to="aircraft.href">
                    <strong>{{ aircraft.registration }}</strong>
                  </NuxtLink>
                </td>
                <td>{{ aircraft.type }}</td>
                <td>{{ aircraft.currentStation ?? 'No data' }}</td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="stateIcon(aircraft.status)"
                    :label="aircraft.status"
                    :tone="stateTone(aircraft.status)"
                  />
                </td>
                <td>{{ aircraft.operationalEffect ?? 'No current flight impact' }}</td>
                <td>{{ aircraft.reason }}</td>
                <td>
                  <span>Due
                    {{
                      aircraft.nextMaintenanceDueAt
                        ? formatDateTime(aircraft.nextMaintenanceDueAt)
                        : 'not recorded'
                    }}</span><small>RTS:
                    {{
                      aircraft.estimatedReturnToServiceAt
                        ? formatDateTime(aircraft.estimatedReturnToServiceAt)
                        : 'No estimate available'
                    }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>

      <VCard v-if="sections.flightBoard" border class="panel-card span-7 flight-operations-card">
        <div class="panel-heading panel-heading--split">
          <div class="panel-heading__title">
            <VIcon color="info" icon="mdi-airplane-marker" size="23" />
            <div>
              <h2>Live Flight Operations</h2>
              <p>
                {{
                  compactFlightMode ? 'Chronological operational list' : 'Adaptive lifecycle view'
                }}
              </p>
            </div>
          </div>
          <VBtn
            append-icon="mdi-arrow-right"
            color="info"
            size="small"
            to="/flights"
            variant="tonal"
          >
            View all flights
          </VBtn>
        </div>
        <div class="lifecycle-counts">
          <span
            v-for="lane in data.flightBoard"
            :key="lane.key"
            :class="{ 'lifecycle-count--exception': lane.key === 'EXCEPTION' }"
          >{{ lane.label }} <strong>{{ lane.flights.length }}</strong></span>
        </div>
        <div v-if="compactFlightMode" class="flight-list">
          <NuxtLink v-for="flight in allFlights" :key="flight.id" :to="flight.href">
            <time>{{ formatTime(flight.actualDepartureAt ?? flight.scheduledDepartureAt) }}</time>
            <div>
              <strong>{{ flight.flightNumber }}</strong><span>{{ flight.route }}</span><small>{{ flight.aircraftRegistration ?? 'Unassigned' }} · {{ flight.readinessPercent }}%
                ready</small>
            </div>
            <DashboardStateBadge
              compact
              :icon="stateIcon(flight.lifecycle)"
              :label="flight.lifecycle"
              :tone="stateTone(flight.lifecycle)"
            /><span
              v-if="flight.actualDepartureAt && (flight.delayMinutes ?? 0) > 0"
              class="flight-delay"
            >+{{ flight.delayMinutes }} min</span>
          </NuxtLink>
          <div v-if="!allFlights.length" class="panel-empty panel-empty--positive">
            <VIcon color="success" icon="mdi-check-circle-outline" />No monitored flights in this
            scope.
          </div>
        </div>
        <div v-else class="flight-board">
          <section v-for="lane in activeLanes" :key="lane.key" class="flight-lane">
            <header>
              <span>{{ lane.label }}</span><strong>{{ lane.flights.length }}</strong>
            </header>
            <NuxtLink
              v-for="flight in lane.flights.slice(0, 4)"
              :key="flight.id"
              class="flight-ticket"
              :to="flight.href"
            >
              <div>
                <strong>{{ flight.flightNumber }}</strong><DashboardStateBadge
                  v-if="flight.urgency !== 'normal'"
                  compact
                  :icon="stateIcon(flight.urgency)"
                  :label="flight.urgency"
                  :tone="stateTone(flight.urgency)"
                />
              </div>
              <span>{{ flight.route }}</span><small>{{ formatTime(flight.actualDepartureAt ?? flight.scheduledDepartureAt) }} ·
                {{ flight.aircraftRegistration ?? 'Unassigned' }}</small><small>{{ flight.readinessPercent }}% ready<span
                v-if="flight.actualDepartureAt && (flight.delayMinutes ?? 0) > 0"
              >
                · +{{ flight.delayMinutes }} min</span></small>
            </NuxtLink>
          </section>
        </div>
      </VCard>

      <VCard v-if="sections.stations" border class="panel-card span-5">
        <div class="panel-heading">
          <VIcon color="info" icon="mdi-airport" size="23" />
          <div>
            <h2>Station Operational Conditions</h2>
            <p>Fast scan of service and reporting conditions</p>
          </div>
        </div>
        <div class="compact-table-wrap">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Fuel</th>
                <th>Handling</th>
                <th>Weather</th>
                <th>Last report</th>
                <th>Alerts</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="station in data.stations.slice(0, 8)" :key="station.id">
                <td>
                  <NuxtLink :to="station.href">
                    <strong>{{ station.code }}</strong>
                  </NuxtLink>
                </td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="stateIcon(station.fuel)"
                    :label="station.fuel"
                    :tone="stateTone(station.fuel)"
                  />
                </td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="stateIcon(station.handling)"
                    :label="station.handling"
                    :tone="stateTone(station.handling)"
                  />
                </td>
                <td>
                  <DashboardStateBadge
                    compact
                    icon="mdi-weather-cloudy-alert"
                    label="No feed"
                    tone="neutral"
                  />
                </td>
                <td>{{ station.lastReportAt ? formatTime(station.lastReportAt) : 'No data' }}</td>
                <td>
                  <DashboardStateBadge
                    compact
                    :icon="station.issues ? 'mdi-alert' : 'mdi-check-circle'"
                    :label="station.issues ? `${station.issues} alerts` : 'Clear'"
                    :tone="station.issues ? 'warning' : 'success'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>

      <VCard v-if="sections.blockers" border class="panel-card span-12 blocker-panel">
        <div class="panel-heading">
          <VIcon color="danger" icon="mdi-alert" size="23" />
          <div>
            <h2>Current Blockers</h2>
            <p>Operational impact is prioritized before blocker count</p>
          </div>
          <VBtn
            append-icon="mdi-arrow-right"
            color="danger"
            size="small"
            to="/flights/readiness"
            variant="tonal"
          >
            View all blockers
          </VBtn>
        </div>
        <div class="blocker-layout">
          <div class="blocker-grid">
            <NuxtLink v-for="point in data.blockers" :key="point.key" :to="point.href || undefined">
              <span>{{ point.label }}</span><strong>{{ point.value }}</strong><i><b :style="{ width: `${Math.min(100, point.value * 22)}%` }" /></i>
            </NuxtLink>
          </div>
          <div class="blocker-list">
            <article v-for="item in data.blockerItems ?? []" :key="item.id">
              <div>
                <DashboardStateBadge
                  compact
                  :icon="stateIcon(item.severity)"
                  :label="item.domain"
                  :tone="item.severity === 'critical' ? 'danger' : 'warning'"
                /><strong>{{ item.flightNumber }}</strong><span>{{ item.route }}</span>
              </div>
              <p>{{ item.issue }}</p>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{{ item.owner }}</dd>
                </div>
                <div>
                  <dt>STD</dt>
                  <dd>{{ formatDateTime(item.scheduledDepartureAt) }}</dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>{{ item.impact }}</dd>
                </div>
              </dl>
              <VBtn
                append-icon="mdi-arrow-right"
                color="danger"
                size="small"
                :to="item.href"
                variant="text"
              >
                {{ item.actionLabel }}
              </VBtn>
            </article>
            <div v-if="!data.blockerItems?.length" class="panel-empty panel-empty--positive">
              <VIcon color="success" icon="mdi-check-circle-outline" />
              <div>
                <strong>No blocked flights</strong><span>All monitored flights are operationally clear.</span>
              </div>
            </div>
          </div>
        </div>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.operations-dashboard {
  display: grid;
  gap: 16px;
  min-width: 0;
  font-size: 0.875rem;
}
.top-grid,
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}
.top-grid {
  align-items: start;
}
.panel-card {
  overflow: hidden;
  border-color: rgb(var(--v-theme-border-default));
  box-shadow: 0 2px 8px rgba(8, 43, 73, 0.035);
}
.attention-panel {
  grid-column: span 8;
}
.actions-panel {
  grid-column: span 4;
}
.span-5 {
  grid-column: span 5;
}
.span-7 {
  grid-column: span 7;
}
.span-12 {
  grid-column: 1 / -1;
}
.panel-heading {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.panel-heading > .v-btn:last-child {
  margin-left: auto;
}
.panel-heading h2 {
  color: rgb(var(--v-theme-primary));
  font-size: 1.0625rem;
  font-weight: 750;
  line-height: 1.25;
}
.panel-heading p {
  margin-top: 3px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  line-height: 1.35;
}
.panel-heading--danger {
  background: rgba(var(--v-theme-danger), 0.055);
}
.panel-heading--info {
  background: rgba(var(--v-theme-info), 0.045);
}
.panel-heading--split {
  justify-content: space-between;
}
.panel-heading__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.updated-label {
  margin-left: auto;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  white-space: nowrap;
}
.data-health {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.data-health__context,
.data-health__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 8px 14px;
}
.data-health__context span,
.data-health__summary span,
.data-health__summary small {
  color: rgb(var(--v-theme-text-secondary));
}
.data-health__context span + span {
  padding-left: 10px;
  border-left: 1px solid rgb(var(--v-theme-border-default));
}
.data-health__summary {
  border-left: 1px solid rgb(var(--v-theme-border-default));
}
.data-health__summary small {
  font-size: 0.75rem;
}
.data-health__details {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-top: 1px solid rgb(var(--v-theme-border-default));
}
.data-health__details a {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.data-health__details a:last-child {
  border-right: 0;
}
.data-health__details time {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.attention-counts {
  display: grid;
  grid-template-columns: 1.2fr repeat(3, 1fr);
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.attention-count {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: center;
  gap: 4px 8px;
  padding: 13px 8px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
}
.attention-count:last-child {
  border-right: 0;
}
.attention-count strong {
  font-size: 1.375rem;
  line-height: 1;
}
.attention-count span {
  grid-column: 1 / -1;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  text-align: center;
}
.attention-count--critical {
  background: rgba(var(--v-theme-danger), 0.06);
}
.attention-count--critical strong {
  color: rgb(var(--v-theme-danger));
  font-size: 1.65rem;
}
.attention-count--stable {
  opacity: 0.76;
}
.issue-list,
.action-list {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.action-row {
  display: grid;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.action-row:last-child {
  border-bottom: 0;
}
.action-row__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}
.action-row__top span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.action-row p {
  font-weight: 650;
  line-height: 1.4;
}
.action-row__meta {
  display: grid;
  gap: 4px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.action-row__meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.action-row .v-btn {
  justify-self: start;
}
.metric-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.metric-cell {
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: center;
  gap: 11px;
  min-height: 132px;
  padding: 18px 15px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.metric-cell:last-child {
  border-right: 0;
}
.metric-cell strong {
  display: block;
  font-size: 1.65rem;
  font-variant-numeric: tabular-nums;
}
.metric-cell span {
  display: block;
  margin-top: 5px;
  font-size: 0.875rem;
  font-weight: 700;
}
.metric-cell small {
  display: block;
  margin-top: 4px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  line-height: 1.35;
}
.metric-cell--danger {
  box-shadow: inset 0 4px rgb(var(--v-theme-danger));
  background: rgba(var(--v-theme-danger), 0.035);
}
.metric-cell--warning {
  box-shadow: inset 0 3px rgb(var(--v-theme-warning));
}
.flight-select {
  width: 210px;
}
.readiness-body {
  display: grid;
  grid-template-columns: minmax(300px, 1.05fr) minmax(0, 2fr);
}
.readiness-verdict {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 18px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
  border-left: 5px solid rgb(var(--v-theme-info));
}
.readiness-verdict--danger {
  border-left-color: rgb(var(--v-theme-danger));
  background: rgba(var(--v-theme-danger), 0.025);
}
.readiness-verdict--warning {
  border-left-color: rgb(var(--v-theme-warning));
}
.readiness-verdict--success {
  border-left-color: rgb(var(--v-theme-success));
}
.readiness-verdict__flight {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px;
}
.readiness-verdict__flight strong {
  color: rgb(var(--v-theme-primary));
  font-size: 1.125rem;
}
.readiness-verdict__flight small {
  width: 100%;
  color: rgb(var(--v-theme-text-secondary));
}
.readiness-verdict__state span,
.readiness-verdict dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.readiness-verdict__state strong {
  display: block;
  margin: 4px 0;
  font-size: 1.5rem;
}
.readiness-verdict__state small {
  color: rgb(var(--v-theme-text-secondary));
}
.readiness-verdict dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.readiness-verdict dd {
  margin: 3px 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
}
.readiness-verdict .v-btn {
  justify-self: start;
}
.readiness-chain {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 1px;
  background: rgb(var(--v-theme-border-default));
}
.readiness-node {
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: start;
  gap: 6px 9px;
  min-width: 0;
  padding: 15px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}
.readiness-node > span {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}
.readiness-node > strong {
  grid-column: 1 / -1;
  font-size: 1.125rem;
}
.readiness-node > .v-chip {
  grid-column: 1 / -1;
  justify-self: start;
}
.readiness-node > small {
  grid-column: 1 / -1;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  line-height: 1.35;
}
.readiness-node--danger {
  box-shadow: inset 3px 0 rgb(var(--v-theme-danger));
}
.readiness-node--warning {
  box-shadow: inset 3px 0 rgb(var(--v-theme-warning));
}
.mini-summary {
  display: flex;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.mini-summary > div {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 120px;
  padding: 12px 16px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
}
.mini-summary strong {
  font-size: 1.35rem;
}
.compact-table-wrap {
  overflow-x: auto;
}
.compact-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
.compact-table th,
.compact-table td {
  padding: 12px 13px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  font-size: 0.8125rem;
  text-align: left;
  vertical-align: middle;
}
.compact-table th {
  background: rgba(var(--v-theme-primary), 0.035);
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  white-space: nowrap;
}
.compact-table td small {
  display: block;
  margin-top: 4px;
  color: rgb(var(--v-theme-text-secondary));
}
.compact-table a {
  color: rgb(var(--v-theme-info));
  text-decoration: none;
}
.lifecycle-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.lifecycle-counts span {
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(var(--v-theme-primary), 0.055);
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.lifecycle-counts strong {
  margin-left: 4px;
  color: rgb(var(--v-theme-text-primary));
}
.lifecycle-count--exception {
  background: rgba(var(--v-theme-danger), 0.075) !important;
  color: rgb(var(--v-theme-danger)) !important;
}
.flight-list > a {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 10px 14px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.flight-list time {
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}
.flight-list div > span,
.flight-list div > small {
  display: block;
  color: rgb(var(--v-theme-text-secondary));
}
.flight-list div > span {
  font-size: 0.8125rem;
}
.flight-list div > small {
  margin-top: 2px;
  font-size: 0.75rem;
}
.flight-delay {
  color: rgb(var(--v-theme-warning));
  font-size: 0.75rem;
  font-weight: 750;
}
.flight-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 8px;
  padding: 10px;
  overflow-x: auto;
}
.flight-lane {
  min-width: 170px;
  padding: 8px;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 7px;
  background: rgba(var(--v-theme-primary), 0.02);
}
.flight-lane header {
  display: flex;
  justify-content: space-between;
  padding: 3px 3px 9px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
}
.flight-ticket {
  display: grid;
  gap: 4px;
  margin-bottom: 7px;
  padding: 10px;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  font-size: 0.8125rem;
  text-decoration: none;
}
.flight-ticket > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
.flight-ticket small {
  color: rgb(var(--v-theme-text-secondary));
}
.blocker-layout {
  display: grid;
  grid-template-columns: minmax(250px, 0.8fr) minmax(0, 2fr);
}
.blocker-grid {
  display: grid;
  align-content: start;
  border-right: 1px solid rgb(var(--v-theme-border-default));
}
.blocker-grid a {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  padding: 11px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  color: inherit;
  text-decoration: none;
}
.blocker-grid span {
  font-weight: 650;
}
.blocker-grid strong {
  color: rgb(var(--v-theme-danger));
  font-size: 1.1rem;
}
.blocker-grid i {
  grid-column: 1 / -1;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.08);
}
.blocker-grid b {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-danger));
}
.blocker-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 14px;
  padding: 13px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
}
.blocker-list article > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.blocker-list article > div span {
  color: rgb(var(--v-theme-text-secondary));
}
.blocker-list p {
  grid-column: 1;
  font-weight: 650;
}
.blocker-list dl {
  grid-column: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.blocker-list dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.blocker-list dd {
  margin: 2px 0 0;
  font-size: 0.75rem;
}
.blocker-list .v-btn {
  grid-column: 2;
  grid-row: 1 / span 3;
}
.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 86px;
  padding: 18px;
  color: rgb(var(--v-theme-text-secondary));
}
.panel-empty--positive {
  justify-content: flex-start;
}
.panel-empty--positive div {
  display: grid;
  gap: 2px;
}
.panel-empty--positive strong {
  color: rgb(var(--v-theme-text-primary));
}
.panel-empty--positive span {
  font-size: 0.8125rem;
}
@media (max-width: 1199px) {
  .attention-panel {
    grid-column: span 7;
  }
  .actions-panel {
    grid-column: span 5;
  }
  .data-health {
    grid-template-columns: 1fr;
  }
  .data-health__summary {
    border-top: 1px solid rgb(var(--v-theme-border-default));
    border-left: 0;
  }
  .data-health__details {
    grid-template-columns: repeat(3, 1fr);
  }
  .metric-strip {
    grid-template-columns: repeat(3, 1fr);
  }
  .metric-cell:nth-child(3) {
    border-right: 0;
  }
  .metric-cell:nth-child(-n + 3) {
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
  .readiness-body {
    grid-template-columns: 1fr;
  }
  .readiness-verdict {
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
  .readiness-chain {
    grid-template-columns: repeat(6, minmax(155px, 1fr));
    overflow-x: auto;
  }
  .blocker-layout {
    grid-template-columns: 1fr;
  }
  .blocker-grid {
    grid-template-columns: repeat(3, 1fr);
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
}
@media (max-width: 959px) {
  .top-grid > *,
  .dashboard-grid > * {
    grid-column: 1 / -1;
  }
  .data-health__details {
    grid-template-columns: repeat(2, 1fr);
  }
  .readiness-chain {
    grid-template-columns: repeat(6, minmax(170px, 1fr));
  }
  .flight-board {
    grid-template-columns: repeat(3, minmax(175px, 1fr));
  }
  .blocker-list article {
    grid-template-columns: 1fr;
  }
  .blocker-list .v-btn {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
  }
}
@media (max-width: 599px) {
  .operations-dashboard,
  .top-grid,
  .dashboard-grid {
    gap: 12px;
  }
  .panel-heading {
    min-height: 58px;
    padding: 11px 12px;
  }
  .panel-heading--split {
    align-items: flex-start;
    flex-direction: column;
  }
  .panel-heading > .v-btn:last-child {
    margin-left: 0;
  }
  .updated-label {
    display: none;
  }
  .data-health__context,
  .data-health__summary {
    flex-wrap: wrap;
  }
  .data-health__summary small {
    width: 100%;
  }
  .data-health__details {
    grid-template-columns: 1fr;
  }
  .data-health__details a {
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
  .attention-counts {
    grid-template-columns: repeat(2, 1fr);
  }
  .attention-count:nth-child(2) {
    border-right: 0;
  }
  .attention-count:nth-child(-n + 2) {
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
  .metric-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .metric-cell {
    min-height: 122px;
  }
  .metric-cell:nth-child(3) {
    border-right: 1px solid rgb(var(--v-theme-border-default));
  }
  .metric-cell:nth-child(even) {
    border-right: 0;
  }
  .metric-cell:nth-child(-n + 4) {
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
  .flight-select {
    width: 100%;
  }
  .readiness-verdict dl {
    grid-template-columns: 1fr;
  }
  .mini-summary {
    overflow-x: auto;
  }
  .flight-list > a {
    grid-template-columns: 48px 1fr auto;
  }
  .flight-list > a > .flight-delay {
    grid-column: 2;
  }
  .blocker-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .blocker-list dl {
    grid-template-columns: 1fr;
  }
}
</style>
