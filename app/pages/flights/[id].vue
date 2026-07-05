<script setup lang="ts">
import type { FlightDetailDto } from '#shared/contracts/flights';

const route = useRoute();
const id = computed(() => String(route.params.id));

const { data: flight, refresh } = await useAsyncData(`flight-${id.value}`, () =>
  fetchApi<FlightDetailDto>(`/api/flights/${id.value}`)
);

async function dispatchFlight() {
  await fetchApi<FlightDetailDto>(`/api/flights/${id.value}/actions/dispatch`, {
    method: 'POST'
  });
  await refresh();
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="flight" class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">{{ flight.flightNumber }}</h1>
        <p class="text-text-muted">{{ flight.purpose }}</p>
      </div>
      <VSpacer />
      <VBtn color="secondary" @click="dispatchFlight">
        Dispatch
      </VBtn>
    </div>

    <template v-if="flight">
      <VRow>
        <VCol cols="12" md="4">
          <VCard border>
            <VCardTitle class="text-text-primary">Route</VCardTitle>
            <VCardText>
              <p>{{ flight.route.origin.name }} -> {{ flight.route.destination.name }}</p>
              <p class="text-text-muted">{{ flight.route.distanceNm }} NM</p>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="4">
          <VCard border>
            <VCardTitle class="text-text-primary">Aircraft</VCardTitle>
            <VCardText>
              <p>{{ flight.aircraft.tailNumber }}</p>
              <p class="text-text-muted">{{ flight.aircraft.displayName }}</p>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="4">
          <VCard border>
            <VCardTitle class="text-text-primary">Status</VCardTitle>
            <VCardText>
              <DsStatusBadge :value="flight.status" />
              <p class="mt-2 text-text-muted">
                {{ new Date(flight.scheduledDeparture).toLocaleString('id-ID') }}
              </p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard border class="mt-4">
        <VCardTitle class="text-text-primary">Manifest</VCardTitle>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Seat</th>
              <th>Name</th>
              <th>Document</th>
              <th>Weight</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="passenger in flight.manifest" :key="passenger.id">
              <td>{{ passenger.seatNumber }}</td>
              <td>{{ passenger.passengerName }}</td>
              <td>{{ passenger.documentNumber }}</td>
              <td>{{ passenger.weightKg }} kg</td>
              <td>{{ passenger.remarks ?? '-' }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </template>
  </VContainer>
</template>
