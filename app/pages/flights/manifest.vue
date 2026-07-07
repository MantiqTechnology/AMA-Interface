<script setup lang="ts">
import type { FlightOperationOverviewDto } from '#shared/contracts/flight-operations';

const search = ref('');
const { data, pending, error, refresh } = await useAsyncData(
  'flight-manifest-worklist',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: { search: search.value, limit: 100 }
    }),
  { watch: [search] }
);

const rows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    [
      'DRAFT',
      'PENDING_READINESS',
      'BLOCKED',
      'READY_FOR_APPROVAL',
      'APPROVED',
      'SCHEDULED',
      'CHECK_IN_OPEN'
    ].includes(flight.currentStatus)
  )
);
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Manifest</h1>
        <p class="text-text-muted">Passenger and cargo manifest worklist per flight.</p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load manifest worklist.
    </VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <VTextField
          v-model="search"
          density="compact"
          hide-details
          label="Search flight/customer"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </VCardText>
    </VCard>

    <VRow>
      <VCol v-for="flight in rows" :key="flight.id" cols="12" lg="6">
        <VCard border>
          <VCardText>
            <div class="mb-3 flex flex-wrap items-start gap-3">
              <div>
                <div class="text-lg font-weight-bold text-text-primary">
                  {{ flight.flightNumber }}
                </div>
                <div class="text-sm text-text-secondary">
                  {{ flight.originStationCode }} -> {{ flight.destinationStationCode }} |
                  {{ flight.flightType }}
                </div>
              </div>
              <VSpacer />
              <FlightsFlightStatusChip :status="flight.currentStatus" />
            </div>
            <VProgressLinear
              color="secondary"
              height="8"
              rounded
              :model-value="flight.readinessPercent"
            />
            <div class="mt-2 text-sm text-text-secondary">{{ flight.readinessSummary }}</div>
          </VCardText>
          <VCardActions>
            <VBtn color="secondary" :to="`/flights/${flight.id}`" variant="tonal">
              Open Manifest Tab
            </VBtn>
            <VBtn
              v-if="['DRAFT', 'BLOCKED', 'REOPENED_FOR_CORRECTION'].includes(flight.currentStatus)"
              :to="`/flights/requests/${flight.id}/edit`"
              variant="text"
            >
              Edit Request
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
      <VCol v-if="!pending && rows.length === 0" cols="12">
        <VCard border>
          <VCardText class="py-8 text-center text-text-secondary">
            No manifest item is open.
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
