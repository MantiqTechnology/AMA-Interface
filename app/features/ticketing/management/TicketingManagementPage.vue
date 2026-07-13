<script setup lang="ts">
import type { RateCardDto } from '#shared/features/commercial/rates';
import type { RouteDto } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
import type {
  TicketingOccFlightDto,
  TicketingSalesOpeningDto
} from '#shared/features/ticketing/sales';
import RouteFormDialog from '../../operations/routes/RouteFormDialog.vue';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';

const activeTab = ref<'tariffs' | 'sales'>('tariffs');
const routeDialog = ref(false);
const openingId = ref('');
const actionError = ref('');
const { data: routes, refresh: refreshRoutes } = await useAsyncData(
  'ticketing-management-routes',
  () => fetchApi<RouteDto[]>('/api/master-data/routes', { query: { active: 'active' } }),
  { default: () => [] }
);
const { data: stations } = await useAsyncData(
  'ticketing-management-stations',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const { data: rates, refresh: refreshRates } = await useAsyncData(
  'ticketing-management-rates',
  () => fetchApi<RateCardDto[]>('/api/master-data/rates', { query: { active: 'all' } }),
  { default: () => [] }
);
const {
  data: occFlights,
  pending: salesPending,
  refresh: refreshSales
} = await useAsyncData(
  'ticketing-management-sales',
  () => fetchApi<TicketingOccFlightDto[]>('/api/ticketing/sales'),
  { default: () => [] }
);

function station(id: string) {
  return stations.value.find((record) => record.id === id);
}
function routeRate(route: RouteDto, serviceType: 'PASSENGER' | 'CARGO') {
  return rates.value.find(
    (rate) =>
      rate.isActive &&
      rate.serviceType === serviceType &&
      rate.originStationId === route.originStationId &&
      rate.destinationStationId === route.destinationStationId &&
      !rate.customerId
  );
}
const blockerLabels: Record<string, string> = {
  SALES_ALREADY_OPEN: 'Sales already open',
  AIRCRAFT_NOT_ASSIGNED: 'Aircraft not assigned',
  PILOT_NOT_ASSIGNED: 'PIC not assigned',
  PILOT_UNAVAILABLE: 'PIC unavailable',
  PILOT_QUALIFICATION_EXPIRED: 'PIC licence or medical expired',
  CUSTOMER_NOT_ASSIGNED: 'Customer not assigned',
  SCHEDULE_INCOMPLETE: 'Schedule incomplete',
  AIRCRAFT_UNAVAILABLE: 'Aircraft unavailable',
  FLIGHT_STATUS_NOT_ELIGIBLE: 'Flight status not eligible',
  RATE_NOT_CONFIGURED: 'Rate not configured'
};

async function openSales(flight: TicketingOccFlightDto) {
  openingId.value = flight.flightOperationId;
  actionError.value = '';
  try {
    await fetchApi<TicketingSalesOpeningDto>('/api/ticketing/sales/open', {
      method: 'POST',
      body: { flightOperationId: flight.flightOperationId }
    });
    await refreshSales();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Unable to open ticket sales.';
  } finally {
    openingId.value = '';
  }
}

async function routeSaved() {
  await Promise.all([refreshRoutes(), refreshRates()]);
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Ticketing Management</h1>
        <p class="text-text-secondary">Commercial route tariffs and OCC flight sales activation.</p>
      </div>
      <VSpacer />
      <VBtn prepend-icon="mdi-cash-multiple" to="/master-data/rates" variant="tonal">
        Manage rate cards
      </VBtn>
    </div>
    <VAlert v-if="actionError" class="mb-4" color="error" variant="tonal">{{ actionError }}</VAlert>
    <VCard border>
      <VTabs v-model="activeTab" color="primary">
        <VTab prepend-icon="mdi-map-marker-path" value="tariffs">Routes & tariffs</VTab>
        <VTab prepend-icon="mdi-airplane-clock" value="sales">OCC flight sales</VTab>
      </VTabs>
      <VDivider />
      <VCardText>
        <VWindow v-model="activeTab">
          <VWindowItem value="tariffs">
            <div class="mb-4 d-flex justify-end">
              <VBtn color="primary" prepend-icon="mdi-plus" @click="routeDialog = true">
                Add route
              </VBtn>
            </div>
            <VTable class="management-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Code</th>
                  <th>Duration</th>
                  <th>Passenger fare</th>
                  <th>Cargo rate</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="route in routes" :key="route.id">
                  <td>
                    <strong>{{ station(route.originStationId)?.stationCode }} ->
                      {{ station(route.destinationStationId)?.stationCode }}</strong>
                    <div class="text-xs text-text-secondary">
                      {{ station(route.originStationId)?.stationName }} to
                      {{ station(route.destinationStationId)?.stationName }}
                    </div>
                  </td>
                  <td>{{ route.routeCode }}</td>
                  <td>{{ route.estimatedDurationMinutes }} min</td>
                  <td>
                    <template v-if="routeRate(route, 'PASSENGER')">
                      {{ formatTicketingCurrency(routeRate(route, 'PASSENGER')!.baseRate) }}
                      <div class="text-xs text-text-secondary">per passenger</div>
                    </template>
                    <VChip v-else color="warning" size="small" variant="tonal">
                      Not configured
                    </VChip>
                  </td>
                  <td>
                    <template v-if="routeRate(route, 'CARGO')">
                      {{ formatTicketingCurrency(routeRate(route, 'CARGO')!.baseRate) }}
                      <div class="text-xs text-text-secondary">per kg</div>
                    </template>
                    <VChip v-else color="warning" size="small" variant="tonal">
                      Not configured
                    </VChip>
                  </td>
                  <td class="text-right text-no-wrap">
                    <VBtn
                      v-if="routeRate(route, 'PASSENGER')"
                      aria-label="Edit passenger rate"
                      icon="mdi-account-cash-outline"
                      :to="`/master-data/rates/${routeRate(route, 'PASSENGER')!.id}`"
                      variant="text"
                    />
                    <VBtn
                      v-if="routeRate(route, 'CARGO')"
                      aria-label="Edit cargo rate"
                      icon="mdi-package-variant-closed-edit"
                      :to="`/master-data/rates/${routeRate(route, 'CARGO')!.id}`"
                      variant="text"
                    />
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VWindowItem>

          <VWindowItem value="sales">
            <VSkeletonLoader v-if="salesPending" type="table" />
            <VTable v-else class="sales-table">
              <thead>
                <tr>
                  <th>OCC flight</th>
                  <th>Route</th>
                  <th>Schedule</th>
                  <th>Aircraft / PIC</th>
                  <th>Type</th>
                  <th>Readiness</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="flight in occFlights" :key="flight.flightOperationId">
                  <td>
                    <strong>{{ flight.flightNumber }}</strong>
                    <div class="text-xs text-text-secondary">
                      {{ flight.orderNumber }} · {{ flight.operationStatus }}
                    </div>
                  </td>
                  <td>
                    {{ flight.originCode }} -> {{ flight.destinationCode }}
                    <div class="text-xs text-text-secondary">
                      {{ flight.customerName || 'No customer' }}
                    </div>
                  </td>
                  <td>{{ formatTicketingDateTime(flight.scheduledDeparture) }}</td>
                  <td>
                    {{ flight.aircraftRegistration || '-' }}
                    <div class="text-xs text-text-secondary">
                      {{ flight.pilotInCommandName || 'PIC not assigned' }}
                    </div>
                  </td>
                  <td>
                    <VChip size="small" variant="tonal">{{ flight.ticketingServiceType }}</VChip>
                  </td>
                  <td>
                    <VChip v-if="flight.sales" color="success" size="small">Sales open</VChip>
                    <div v-else-if="flight.blockers.length" class="d-flex flex-wrap ga-1">
                      <VChip
                        v-for="blocker in flight.blockers"
                        :key="blocker"
                        color="warning"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ blockerLabels[blocker] || blocker }}
                      </VChip>
                    </div>
                    <VChip v-else color="success" size="small" variant="tonal">Ready</VChip>
                  </td>
                  <td class="text-right">
                    <VBtn
                      v-if="!flight.sales"
                      color="primary"
                      :disabled="!flight.canOpenSales"
                      :loading="openingId === flight.flightOperationId"
                      prepend-icon="mdi-store-check-outline"
                      size="small"
                      @click="openSales(flight)"
                    >
                      Open sales
                    </VBtn>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
    <RouteFormDialog v-model="routeDialog" @saved="routeSaved" />
  </VContainer>
</template>

<style scoped>
.management-table {
  min-width: 940px;
}
.sales-table {
  min-width: 1180px;
}
</style>
