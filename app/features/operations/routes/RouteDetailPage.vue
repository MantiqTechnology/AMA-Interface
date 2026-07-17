<script setup lang="ts">
import type {
  RouteOperationalProfileDto,
  RouteReadinessCheckDto
} from '#shared/features/operations/routes';
import RouteFormDialog from './RouteFormDialog.vue';

const pageRoute = useRoute();
const { can } = useAuthorization();
const routeId = computed(() => String(pageRoute.params.id));
const editDialog = ref(false);
const canEdit = computed(() => can('master_data.manage').allowed);
const {
  data: profile,
  pending,
  error,
  refresh
} = await useAsyncData(`route-operational-profile-${routeId.value}`, () =>
  fetchApi<RouteOperationalProfileDto>(
    `/api/master-data/routes/${routeId.value}/operational-profile`
  )
);

const readinessLabel = computed(() => {
  if (profile.value?.readiness.status === 'AVAILABLE') return 'Available';
  if (profile.value?.readiness.status === 'NEEDS_CONFIGURATION') return 'Needs configuration';
  return 'Not available';
});
const readinessColor = computed(() => {
  if (profile.value?.readiness.status === 'AVAILABLE') return 'success';
  if (profile.value?.readiness.status === 'NEEDS_CONFIGURATION') return 'warning';
  return 'error';
});

function errorCode(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const data = Reflect.get(value, 'data');
  const nestedError = data && typeof data === 'object' ? Reflect.get(data, 'error') : null;
  return nestedError && typeof nestedError === 'object' ? Reflect.get(nestedError, 'code') : null;
}

const notFound = computed(() => errorCode(error.value) === 'NOT_FOUND');
const forbidden = computed(() => errorCode(error.value) === 'FORBIDDEN');

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatFlightTime(value: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function formatWeight(value: number | null) {
  if (value === null) return 'No cargo data';
  return `${new Intl.NumberFormat('en-US').format(value)} kg cargo`;
}

function checkIcon(check: RouteReadinessCheckDto) {
  if (check.status === 'PASS') return 'mdi-check-circle-outline';
  if (check.status === 'FAIL') return 'mdi-close-circle-outline';
  if (check.status === 'WARNING') return 'mdi-alert-outline';
  return 'mdi-progress-question';
}

function checkColor(check: RouteReadinessCheckDto) {
  if (check.status === 'PASS') return 'success';
  if (check.status === 'FAIL') return 'error';
  return 'warning';
}

function serviceSourceLabel(source: string) {
  if (source === 'SCHEDULE_TEMPLATE') return 'Schedule';
  if (source === 'CAPACITY_PROFILE') return 'Capacity';
  return 'Rate';
}
</script>

<template>
  <VContainer class="route-profile px-3 py-5 md:px-5" fluid>
    <VBreadcrumbs
      class="px-0 py-1"
      :items="[
        { title: 'Master Data', disabled: true },
        { title: 'Routes', to: '/master-data/routes' },
        { title: profile?.route.routeCode ?? 'Route' }
      ]"
    />

    <VSkeletonLoader v-if="pending" type="heading, paragraph, actions, table, article" />

    <VAlert v-else-if="error" type="error" variant="tonal">
      <div class="font-weight-bold">
        {{
          notFound
            ? 'Route not found'
            : forbidden
              ? 'Route access is not available for this role'
              : 'Unable to load route operational profile'
        }}
      </div>
      <div class="mt-1 text-body-2">
        {{
          notFound
            ? 'The route may have been removed or the demo database was reset.'
            : forbidden
              ? 'Switch to a role with master data read access.'
              : 'The operational data could not be loaded. Try the request again.'
        }}
      </div>
      <template #append>
        <VBtn v-if="notFound || forbidden" to="/dashboard" variant="text">Dashboard</VBtn>
        <VBtn v-else prepend-icon="mdi-refresh" variant="text" @click="refresh">Retry</VBtn>
      </template>
    </VAlert>

    <template v-else-if="profile">
      <header class="mb-5 d-flex flex-wrap align-start ga-4">
        <div class="min-w-0 flex-grow-1">
          <div class="mb-2 d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-text-primary">
              {{ profile.origin?.stationCode ?? 'Unknown' }} →
              {{ profile.destination?.stationCode ?? 'Unknown' }}
            </h1>
            <VChip
              :color="profile.route.isActive ? 'success' : 'default'"
              size="small"
              variant="tonal"
            >
              {{ profile.route.isActive ? 'Active' : 'Inactive' }}
            </VChip>
            <VChip :color="readinessColor" size="small" variant="tonal">
              {{ readinessLabel }}
            </VChip>
          </div>
          <p class="text-body-1 text-text-secondary">
            {{ profile.origin?.cityOrRegion ?? 'Origin station unavailable' }} to
            {{ profile.destination?.cityOrRegion ?? 'destination station unavailable' }}
          </p>
          <div class="mt-2 d-flex flex-wrap align-center ga-2 text-body-2 text-text-secondary">
            <span>{{ profile.route.routeCode }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ profile.regionLabel ?? 'Region not configured' }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ profile.timezone?.code ?? 'Timezone not configured' }}</span>
          </div>
        </div>

        <div class="d-none d-sm-flex ga-2">
          <VBtn
            prepend-icon="mdi-airplane-search"
            :to="{ path: '/flights', query: { routeId: profile.route.id } }"
            variant="outlined"
          >
            View flights
          </VBtn>
          <VBtn
            v-if="canEdit"
            color="primary"
            prepend-icon="mdi-pencil-outline"
            @click="editDialog = true"
          >
            Edit route
          </VBtn>
        </div>
        <VMenu class="d-sm-none">
          <template #activator="{ props: menuProps }">
            <DsTooltipIconButton
              v-bind="menuProps"
              icon="mdi-dots-vertical"
              tooltip="Route actions"
              variant="text"
            />
          </template>
          <VList density="compact">
            <VListItem
              prepend-icon="mdi-airplane-search"
              :to="{ path: '/flights', query: { routeId: profile.route.id } }"
              title="View flights"
            />
            <VListItem
              v-if="canEdit"
              prepend-icon="mdi-pencil-outline"
              title="Edit route"
              @click="editDialog = true"
            />
          </VList>
        </VMenu>
      </header>

      <VAlert
        v-if="!profile.origin || !profile.destination"
        class="mb-4"
        type="error"
        variant="tonal"
      >
        One or more station relations could not be resolved. This route is unavailable for
        scheduling until the relation is corrected.
      </VAlert>

      <VRow class="mb-2">
        <VCol cols="6" lg="3">
          <DsStatCard label="Distance" :value="`${profile.route.distanceKm} km`" />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard
            label="Block time"
            :value="formatDuration(profile.route.estimatedDurationMinutes)"
          />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard
            label="Active templates"
            :tone="profile.metrics.activeTemplateCount ? 'success' : 'warning'"
            :value="profile.metrics.activeTemplateCount"
          />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard
            label="Next flight"
            :tone="profile.metrics.nextFlightAt ? 'info' : 'warning'"
            :value="
              profile.metrics.nextFlightAt ? formatFlightTime(profile.metrics.nextFlightAt) : 'None'
            "
          />
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" lg="8">
          <VCard border class="mb-4">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
              Route overview
            </VCardTitle>
            <VDivider />
            <VCardText>
              <div class="route-line" role="img" :aria-label="`${profile.route.routeCode} route`">
                <div class="route-station route-station--origin">
                  <div class="route-station__code">{{ profile.origin?.stationCode ?? '?' }}</div>
                  <div class="mt-2 font-weight-bold text-text-primary">
                    {{ profile.origin?.cityOrRegion ?? 'Station unavailable' }}
                  </div>
                  <div class="text-caption text-text-secondary">
                    {{ profile.origin?.stationName ?? 'Origin relation is missing' }}
                  </div>
                </div>
                <div class="route-line__track">
                  <VIcon class="route-line__aircraft" color="primary" icon="mdi-airplane" />
                  <div
                    class="route-line__summary text-caption font-weight-bold text-text-secondary"
                  >
                    {{ profile.route.distanceKm }} km ·
                    {{ formatDuration(profile.route.estimatedDurationMinutes) }}
                  </div>
                </div>
                <div class="route-station route-station--destination">
                  <div class="route-station__code">
                    {{ profile.destination?.stationCode ?? '?' }}
                  </div>
                  <div class="mt-2 font-weight-bold text-text-primary">
                    {{ profile.destination?.cityOrRegion ?? 'Station unavailable' }}
                  </div>
                  <div class="text-caption text-text-secondary">
                    {{ profile.destination?.stationName ?? 'Destination relation is missing' }}
                  </div>
                </div>
              </div>

              <VDivider class="my-5" />
              <div class="d-flex flex-wrap align-center justify-space-between ga-3">
                <div>
                  <div class="text-caption font-weight-bold text-uppercase text-text-secondary">
                    Reverse route
                  </div>
                  <div class="mt-1 text-body-2 text-text-primary">
                    {{ profile.reverseRoute?.routeCode ?? 'Reverse route is not configured.' }}
                  </div>
                </div>
                <VBtn
                  v-if="profile.reverseRoute"
                  append-icon="mdi-arrow-right"
                  :to="`/master-data/routes/${profile.reverseRoute.id}`"
                  variant="text"
                >
                  Open route
                </VBtn>
              </div>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle
              class="d-flex flex-wrap align-center ga-3 text-subtitle-1 font-weight-bold text-text-primary"
            >
              Active schedule templates
              <VSpacer />
              <VBtn
                v-if="canEdit"
                size="small"
                :to="{
                  path: '/master-data/flight-schedule-templates',
                  query: { routeId: profile.route.id }
                }"
                variant="text"
              >
                Manage templates
              </VBtn>
            </VCardTitle>
            <VDivider />
            <div v-if="profile.scheduleTemplates.length" class="overflow-x-auto">
              <VTable>
                <thead>
                  <tr>
                    <th>Days</th>
                    <th>Departure</th>
                    <th>Arrival</th>
                    <th>Service</th>
                    <th>Default aircraft</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="template in profile.scheduleTemplates" :key="template.id">
                    <td>{{ template.operatingDays.join(', ') }}</td>
                    <td>{{ template.departureTimeLocal }} {{ profile.timezone?.code ?? '' }}</td>
                    <td>{{ template.arrivalTimeLocal }} {{ profile.timezone?.code ?? '' }}</td>
                    <td>{{ template.serviceTypeLabel }}</td>
                    <td>{{ template.defaultAircraftRegistration ?? 'Not assigned' }}</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VCardText v-else class="py-8 text-center text-text-secondary">
              <VIcon class="mb-2" icon="mdi-calendar-blank-outline" size="32" />
              <div>No active schedule template is configured.</div>
              <div class="text-caption">Flights can still be created manually when permitted.</div>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
              Aircraft and capacity
            </VCardTitle>
            <VDivider />
            <div v-if="profile.compatibleAircraft.length" class="overflow-x-auto">
              <VTable>
                <thead>
                  <tr>
                    <th>Aircraft</th>
                    <th>Serviceability</th>
                    <th>Service</th>
                    <th>Usable seats</th>
                    <th>Usable cargo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in profile.compatibleAircraft" :key="item.profileId">
                    <td>
                      <div class="font-weight-bold text-text-primary">
                        {{ item.registrationNumber }}
                      </div>
                      <div class="text-caption text-text-secondary">{{ item.aircraftType }}</div>
                    </td>
                    <td><DsStatusBadge :value="item.serviceabilityStatus" /></td>
                    <td>{{ item.serviceTypeLabel }}</td>
                    <td>{{ item.seatCapacity - item.reservedSeatCount }}</td>
                    <td>{{ item.cargoCapacityKg - item.reservedCargoKg }} kg</td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VCardText v-else class="py-8 text-center text-text-secondary">
              <VIcon class="mb-2" icon="mdi-airplane-off" size="32" />
              <div>Aircraft compatibility has not been configured.</div>
              <div class="text-caption">Final assignment is validated during flight readiness.</div>
            </VCardText>
            <VCardText
              v-if="profile.compatibleAircraft.length"
              class="text-caption text-text-secondary"
            >
              Final assignment still depends on serviceability, payload, weather, runway, and
              station readiness.
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
              Upcoming flights
            </VCardTitle>
            <VDivider />
            <div v-if="profile.upcomingFlights.length" class="overflow-x-auto">
              <VTable>
                <thead>
                  <tr>
                    <th>Flight</th>
                    <th>Departure</th>
                    <th>Aircraft</th>
                    <th>Load</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="flight in profile.upcomingFlights" :key="flight.id">
                    <td class="font-weight-bold text-text-primary">{{ flight.flightNumber }}</td>
                    <td>{{ formatFlightTime(flight.scheduledDepartureAt) }}</td>
                    <td>{{ flight.aircraftRegistration ?? 'Not assigned' }}</td>
                    <td>
                      <div>{{ flight.passengerCount }} passengers</div>
                      <div class="text-caption text-text-secondary">
                        {{ formatWeight(flight.cargoWeightKg) }}
                      </div>
                    </td>
                    <td><DsStatusBadge :value="flight.status" /></td>
                    <td class="text-right">
                      <DsTooltipIconButton
                        icon="mdi-open-in-new"
                        :to="`/flights/${flight.id}`"
                        tooltip="Open flight"
                        variant="text"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <VCardText v-else class="py-8 text-center text-text-secondary">
              <VIcon class="mb-2" icon="mdi-airplane-clock" size="32" />
              <div>No upcoming flight is scheduled for this route.</div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border class="mb-4">
            <VCardTitle
              class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold text-text-primary"
            >
              <VIcon :color="readinessColor" icon="mdi-clipboard-check-outline" />
              Route readiness
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VChip :color="readinessColor" variant="tonal">{{ readinessLabel }}</VChip>
              <p class="mt-3 text-body-2 text-text-secondary">
                {{
                  profile.readiness.availableForScheduling
                    ? 'This route can be selected for manual flight scheduling.'
                    : 'This route cannot be scheduled until all blocking conditions are resolved.'
                }}
              </p>
              <VList class="mt-3" density="compact" lines="two">
                <VListItem
                  v-for="check in profile.readiness.checks"
                  :key="check.code"
                  class="px-0"
                  :subtitle="check.message"
                  :title="check.label"
                >
                  <template #prepend>
                    <VIcon class="mr-3" :color="checkColor(check)" :icon="checkIcon(check)" />
                  </template>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>

          <VAlert
            v-if="profile.route.restrictionLevel !== 'NONE'"
            class="mb-4"
            :type="profile.route.restrictionLevel === 'BLOCKING' ? 'error' : 'warning'"
            variant="tonal"
          >
            <div class="font-weight-bold">
              {{
                profile.route.restrictionLevel === 'BLOCKING' ? 'Blocking restriction' : 'Advisory'
              }}
            </div>
            <div class="mt-1">{{ profile.route.restrictionNote }}</div>
          </VAlert>

          <VCard border class="mb-4">
            <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
              Available services
            </VCardTitle>
            <VDivider />
            <VCardText v-if="profile.availableServices.length">
              <div
                v-for="service in profile.availableServices"
                :key="service.serviceTypeId"
                class="mb-4"
              >
                <div class="font-weight-bold text-text-primary">{{ service.serviceTypeLabel }}</div>
                <div class="mt-2 d-flex flex-wrap ga-2">
                  <VChip
                    v-for="source in service.sources"
                    :key="source"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ serviceSourceLabel(source) }}
                  </VChip>
                </div>
              </div>
            </VCardText>
            <VCardText v-else class="text-text-secondary">
              No service configuration is available for this route.
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
              Operational notes
            </VCardTitle>
            <VDivider />
            <VCardText>
              <p class="text-body-2 text-text-primary">
                {{
                  profile.route.operationalNotes ?? 'No route-level operational note is recorded.'
                }}
              </p>
              <VDivider class="my-4" />
              <p class="text-caption text-text-secondary">
                Block time is a standard estimate. Dispatch must still verify weather, payload,
                fuel, runway, and aircraft serviceability before flight release.
              </p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <RouteFormDialog
        v-if="canEdit"
        v-model="editDialog"
        :route="profile.route"
        @saved="refresh"
      />
    </template>
  </VContainer>
</template>

<style scoped>
.route-profile {
  max-width: 1600px;
}

.route-line {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(160px, 2fr) minmax(140px, 1fr);
  align-items: start;
  gap: 20px;
}

.route-station {
  min-width: 0;
}

.route-station--destination {
  text-align: right;
}

.route-station__code {
  display: inline-grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
}

.route-line__track {
  position: relative;
  height: 82px;
  margin-top: 18px;
  border-top: 2px solid rgb(var(--v-theme-outline));
}

.route-line__aircraft {
  position: absolute;
  top: -14px;
  left: 50%;
  padding: 3px;
  background: rgb(var(--v-theme-surface));
  transform: translateX(-50%) rotate(90deg);
}

.route-line__summary {
  position: absolute;
  top: 18px;
  width: 100%;
  text-align: center;
}

@media (max-width: 600px) {
  .route-line {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .route-station--destination {
    text-align: left;
  }

  .route-line__track {
    width: 2px;
    height: 64px;
    margin: 0 0 0 23px;
    border-top: 0;
    border-left: 2px solid rgb(var(--v-theme-outline));
  }

  .route-line__aircraft {
    top: 21px;
    left: -1px;
    transform: translateX(-50%) rotate(180deg);
  }

  .route-line__summary {
    top: 20px;
    left: 28px;
    width: max-content;
    text-align: left;
  }
}
</style>
