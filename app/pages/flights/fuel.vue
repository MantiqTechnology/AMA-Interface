<script setup lang="ts">
import type { FlightFuelRequestDto } from '#shared/contracts/flight-operations';

const loadingId = ref('');
const actionError = ref('');

const { data, pending, error, refresh } = await useAsyncData('flight-fuel-control', () =>
  fetchApi<FlightFuelRequestDto[]>('/api/flight-operations/fuel')
);

function money(value: number | null) {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

async function fuelAction(
  row: FlightFuelRequestDto,
  action: 'approve' | 'uplift' | 'post' | 'reject'
) {
  loadingId.value = `${row.id}-${action}`;
  actionError.value = '';
  try {
    const body =
      action === 'approve'
        ? { approvedQuantityLitre: row.requestedQuantityLitre }
        : action === 'uplift'
          ? {
              actualUpliftLitre: row.approvedQuantityLitre ?? row.requestedQuantityLitre,
              actualPricePerLitre: row.referencePricePerLitre ?? 0,
              varianceNote: 'Recorded from fuel control worklist.'
            }
          : action === 'reject'
            ? { rejectionReason: 'Rejected from fuel control worklist.' }
            : {};
    await fetchApi(`/api/flight-operations/fuel/${row.id}/actions/${action}`, {
      method: 'POST',
      body
    });
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Fuel action failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Fuel Control</h1>
        <p class="text-text-muted">
          Fuel request, approval, uplift, posting, and finance handoff preview.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load fuel requests.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border>
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Supplier</th>
            <th>Fuel</th>
            <th>Requested</th>
            <th>Approved</th>
            <th>Actual</th>
            <th>Total</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="9" class="py-6 text-center text-text-secondary">
              Loading fuel requests...
            </td>
          </tr>
          <tr v-else-if="(data ?? []).length === 0">
            <td colspan="9" class="py-6 text-center text-text-secondary">No fuel request found.</td>
          </tr>
          <tr v-for="row in data ?? []" v-else :key="row.id">
            <td>{{ row.flightNumber }}</td>
            <td>{{ row.supplierName }}</td>
            <td>{{ row.fuelType }}</td>
            <td>{{ row.requestedQuantityLitre }} L</td>
            <td>{{ row.approvedQuantityLitre ?? '-' }} L</td>
            <td>{{ row.actualUpliftLitre ?? '-' }} L</td>
            <td>{{ money(row.totalCost) }}</td>
            <td><FlightsFlightStatusChip :status="row.status" /></td>
            <td class="text-right">
              <VBtn
                class="mr-1"
                density="comfortable"
                icon="mdi-open-in-new"
                :to="`/flights/${row.flightId}`"
                variant="text"
              />
              <VBtn
                v-if="row.status === 'REQUESTED'"
                class="mr-1"
                color="success"
                density="comfortable"
                icon="mdi-check"
                :loading="loadingId === `${row.id}-approve`"
                variant="tonal"
                @click="fuelAction(row, 'approve')"
              />
              <VBtn
                v-if="row.status === 'APPROVED'"
                class="mr-1"
                density="comfortable"
                icon="mdi-fuel"
                :loading="loadingId === `${row.id}-uplift`"
                variant="tonal"
                @click="fuelAction(row, 'uplift')"
              />
              <VBtn
                v-if="row.status === 'UPLIFTED'"
                color="secondary"
                density="comfortable"
                icon="mdi-file-send-outline"
                :loading="loadingId === `${row.id}-post`"
                variant="flat"
                @click="fuelAction(row, 'post')"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
