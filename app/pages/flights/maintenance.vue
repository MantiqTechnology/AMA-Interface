<script setup lang="ts">
import type { FlightMaintenanceHandoffDto } from '#shared/contracts/flight-operations';

const loadingId = ref('');
const actionError = ref('');

const { data, pending, error, refresh } = await useAsyncData('flight-maintenance-handoffs', () =>
  fetchApi<FlightMaintenanceHandoffDto[]>('/api/flight-operations/maintenance')
);

function money(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

async function approve(row: FlightMaintenanceHandoffDto) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/maintenance/${row.id}/actions/approve`, {
      method: 'POST'
    });
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Maintenance approval failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Maintenance Handoff</h1>
        <p class="text-text-muted">
          Aircraft serviceability notes, work order references, and maintenance cost handoff.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load maintenance handoffs.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border>
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Aircraft</th>
            <th>Serviceability</th>
            <th>Work Order</th>
            <th>Note</th>
            <th>Cost</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              Loading maintenance handoffs...
            </td>
          </tr>
          <tr v-else-if="(data ?? []).length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              No maintenance handoff found.
            </td>
          </tr>
          <tr v-for="row in data ?? []" v-else :key="row.id">
            <td>{{ row.flightNumber ?? '-' }}</td>
            <td>{{ row.aircraftRegistration }}</td>
            <td>{{ row.serviceabilityStatus }}</td>
            <td>{{ row.workOrderReference ?? '-' }}</td>
            <td class="max-w-80">{{ row.maintenanceNote ?? '-' }}</td>
            <td>{{ money(row.maintenanceCost, row.currencyCode) }}</td>
            <td><FlightsFlightStatusChip :status="row.status" /></td>
            <td class="text-right">
              <VBtn
                v-if="row.flightId"
                class="mr-1"
                density="comfortable"
                icon="mdi-open-in-new"
                :to="`/flights/${row.flightId}`"
                variant="text"
              />
              <VBtn
                v-if="row.status !== 'APPROVED'"
                color="success"
                density="comfortable"
                icon="mdi-check-decagram-outline"
                :loading="loadingId === row.id"
                variant="tonal"
                @click="approve(row)"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
