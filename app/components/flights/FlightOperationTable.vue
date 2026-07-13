<script setup lang="ts">
import type { FlightOperationRecord } from '#shared/contracts/flight-operations';

defineProps<{
  flights: FlightOperationRecord[];
  loading?: boolean;
}>();

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(new Date(value.includes('T') ? value : `${value}T00:00:00.000+07:00`));
}
</script>

<template>
  <VTable density="comfortable" hover>
    <thead>
      <tr>
        <th>Order / Flight</th>
        <th>Date</th>
        <th>Route</th>
        <th>Type</th>
        <th>Aircraft</th>
        <th>PIC</th>
        <th>Status</th>
        <th>Readiness</th>
        <th>Schedule</th>
        <th class="text-right">Action</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading">
        <td colspan="10" class="py-6 text-center text-text-secondary">Loading flights...</td>
      </tr>
      <tr v-else-if="flights.length === 0">
        <td colspan="10" class="py-6 text-center text-text-secondary">
          No flights match this view.
        </td>
      </tr>
      <tr v-for="flight in flights" v-else :key="flight.id">
        <td>
          <div class="font-weight-medium text-text-primary">{{ flight.flightNumber }}</div>
          <div class="text-xs text-text-secondary">{{ flight.orderNumber }}</div>
          <div class="text-xs text-text-secondary">{{ flight.customerName ?? 'No customer' }}</div>
        </td>
        <td>{{ formatDate(flight.flightDate) }}</td>
        <td>{{ flight.originStationCode }} → {{ flight.destinationStationCode }}</td>
        <td>{{ flight.serviceType.replaceAll('_', ' ') }}</td>
        <td>
          <div class="font-weight-medium">{{ flight.aircraftRegistration ?? '-' }}</div>
          <div class="text-xs text-text-secondary">
            Station {{ flight.aircraftCurrentStationCode ?? 'unknown' }}
          </div>
          <div class="text-xs text-text-secondary">
            Maint. due {{ flight.aircraftNextMaintenanceDueAt ?? '-' }}
          </div>
        </td>
        <td>
          <div>{{ flight.pilotInCommandName ?? '-' }}</div>
          <div class="mt-1 flex flex-wrap gap-1">
            <VChip
              v-if="flight.pilotInCommandAvailabilityStatus"
              size="x-small"
              :color="
                flight.pilotInCommandAvailabilityStatus === 'AVAILABLE' ? 'success' : 'warning'
              "
              variant="tonal"
            >
              PIC {{ flight.pilotInCommandAvailabilityStatus }}
            </VChip>
            <VChip
              v-if="flight.coPilotAvailabilityStatus"
              size="x-small"
              :color="flight.coPilotAvailabilityStatus === 'AVAILABLE' ? 'success' : 'warning'"
              variant="tonal"
            >
              COP {{ flight.coPilotAvailabilityStatus }}
            </VChip>
          </div>
        </td>
        <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
        <td>
          <div class="min-w-28">
            <VProgressLinear
              color="secondary"
              height="8"
              rounded
              :model-value="flight.readinessPercent"
            />
            <div class="mt-1 text-xs text-text-secondary">{{ flight.readinessSummary }}</div>
          </div>
        </td>
        <td>{{ formatDate(flight.scheduledDepartureAt) }}</td>
        <td class="text-right">
          <VBtn
            density="comfortable"
            icon="mdi-open-in-new"
            :to="`/flights/${flight.id}`"
            variant="text"
          />
        </td>
      </tr>
    </tbody>
  </VTable>
</template>
