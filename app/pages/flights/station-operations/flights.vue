<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import {
  formatDateDisplay,
  numberFormat
} from '../../../features/station-operations/utils/stationOperationsFormatters';
import { type StationFlightRow } from '../../../features/station-operations/types/stationOperations';

const { context, pending, dataset } = useStationOperationsPageData();
const search = ref('');
const direction = ref('ALL');
const status = ref('ALL');
const readiness = ref('ALL');

const filteredFlights = computed<StationFlightRow[]>(() => {
  const term = search.value.trim().toLowerCase();
  const flights: StationFlightRow[] = dataset.value.flights;

  return flights.filter((flight: StationFlightRow) => {
    const matchesSearch =
      !term ||
      flight.flightNumber.toLowerCase().includes(term) ||
      `${flight.origin} ${flight.destination}`.toLowerCase().includes(term) ||
      flight.aircraftType.toLowerCase().includes(term);

    return (
      matchesSearch &&
      (direction.value === 'ALL' || flight.direction === direction.value) &&
      (status.value === 'ALL' || flight.status === status.value) &&
      (readiness.value === 'ALL' || flight.readiness === readiness.value)
    );
  });
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Flights</h2>
        <p class="text-caption text-text-secondary">
          {{ context.selectedStationLabel.value }} ·
          {{ formatDateDisplay(context.operationalDateIso.value) }}
        </p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <VTextField
          v-model="search"
          label="Search flight"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="direction"
          :items="['ALL', 'INBOUND', 'OUTBOUND']"
          label="Direction"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="status"
          :items="['ALL', 'SCHEDULED', 'BOARDING', 'ARRIVING', 'LANDED', 'DELAYED', 'DEPARTED']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="readiness"
          :items="['ALL', 'READY', 'CHECK', 'NOT_READY']"
          label="Readiness"
          density="compact"
          hide-details
          variant="outlined"
        />
      </div>
    </div>
    <VDivider />
    <div class="overflow-x-auto">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Time</th>
            <th>Flight</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>Type</th>
            <th>Status</th>
            <th>Readiness</th>
            <th>Pax</th>
            <th>Cargo</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="10" class="py-8 text-center">
              <VProgressCircular indeterminate size="22" class="mr-2" />Loading flights...
            </td>
          </tr>
          <tr v-else-if="filteredFlights.length === 0">
            <td colspan="10" class="py-8 text-center text-text-secondary">
              No flight matches the current filter.
            </td>
          </tr>
          <tr v-for="row in filteredFlights" v-else :key="row.id">
            <td>
              <div class="font-weight-medium">{{ row.scheduledTime }}</div>
              <div class="text-caption text-text-secondary">{{ row.actualTime }}</div>
            </td>
            <td class="font-weight-medium">{{ row.flightNumber }}</td>
            <td>{{ row.origin }} → {{ row.destination }}</td>
            <td>{{ row.aircraftType }}</td>
            <td>{{ row.type }}</td>
            <td><DsStatusBadge :value="row.status" /></td>
            <td><DsStatusBadge :value="row.readiness" /></td>
            <td>{{ row.paxOnboard }} / {{ row.paxTotal }}</td>
            <td>{{ numberFormat(row.cargoWeightKg) }} kg</td>
            <td class="text-right">
              <DsTooltipIconButton
                icon="mdi-open-in-new"
                tooltip="Open flight workspace"
                variant="text"
                :to="`/flights/station-operations/${row.flightId}`"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VCard>
</template>
