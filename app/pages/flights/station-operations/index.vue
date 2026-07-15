<script setup lang="ts">
import type {
  FlightStationCostDto,
  FlightStationServiceDto
} from '#shared/contracts/flight-operations';

const activeTab = ref('services');
const loadingId = ref('');
const actionError = ref('');

const {
  data: services,
  pending: servicesPending,
  error: servicesError,
  refresh: refreshServices
} = await useAsyncData('flight-station-services', () =>
  fetchApi<FlightStationServiceDto[]>('/api/flight-operations/station-services')
);
const {
  data: costs,
  pending: costsPending,
  error: costsError,
  refresh: refreshCosts
} = await useAsyncData('flight-station-costs', () =>
  fetchApi<FlightStationCostDto[]>('/api/flight-operations/station-costs')
);

function money(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

async function confirmService(row: FlightStationServiceDto) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-services/${row.id}/actions/confirm`, {
      method: 'POST'
    });
    await refreshServices();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Station service action failed';
  } finally {
    loadingId.value = '';
  }
}

async function approveCost(row: FlightStationCostDto) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/station-costs/${row.id}/actions/approve`, {
      method: 'POST'
    });
    await refreshCosts();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Station cost action failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Station Operations</h1>
        <p class="text-text-muted">
          Handling, parking, and station cost approvals by flight and station.
        </p>
      </div>
      <VSpacer />
      <VBtn
        icon="mdi-refresh"
        variant="text"
        @click="
          refreshServices();
          refreshCosts();
        "
      />
    </div>

    <VAlert v-if="servicesError || costsError" class="mb-4" type="error" variant="tonal">
      Unable to load station operations.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border>
      <VTabs v-model="activeTab">
        <VTab value="services">Services</VTab>
        <VTab value="costs">Costs</VTab>
      </VTabs>
      <VDivider />
      <VWindow v-model="activeTab">
        <VWindowItem value="services">
          <VTable density="comfortable" hover>
            <thead>
              <tr>
                <th>Flight</th>
                <th>Station</th>
                <th>Supplier</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="servicesPending">
                <td colspan="7" class="py-6 text-center text-text-secondary">
                  Loading services...
                </td>
              </tr>
              <tr v-else-if="(services ?? []).length === 0">
                <td colspan="7" class="py-6 text-center text-text-secondary">
                  No station service found.
                </td>
              </tr>
              <tr v-for="row in services ?? []" v-else :key="row.id">
                <td>{{ row.flightNumber }}</td>
                <td>{{ row.stationCode }}</td>
                <td>{{ row.supplierName }}</td>
                <td>{{ row.serviceType }}</td>
                <td>{{ row.referenceRate ?? '-' }}</td>
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
                    color="success"
                    density="comfortable"
                    icon="mdi-check"
                    :loading="loadingId === row.id"
                    variant="tonal"
                    @click="confirmService(row)"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>
        <VWindowItem value="costs">
          <VTable density="comfortable" hover>
            <thead>
              <tr>
                <th>Flight</th>
                <th>Station</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="costsPending">
                <td colspan="8" class="py-6 text-center text-text-secondary">Loading costs...</td>
              </tr>
              <tr v-else-if="(costs ?? []).length === 0">
                <td colspan="8" class="py-6 text-center text-text-secondary">
                  No station cost found.
                </td>
              </tr>
              <tr v-for="row in costs ?? []" v-else :key="row.id">
                <td>{{ row.flightNumber ?? '-' }}</td>
                <td>{{ row.stationCode }}</td>
                <td>{{ row.vendorName ?? '-' }}</td>
                <td>{{ row.costCategoryName }}</td>
                <td>{{ row.description }}</td>
                <td>{{ money(row.amount, row.currencyCode) }}</td>
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
                    @click="approveCost(row)"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>
      </VWindow>
    </VCard>
  </VContainer>
</template>
