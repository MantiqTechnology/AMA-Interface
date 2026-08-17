<script setup lang="ts">
import StationSelect from '../../../features/operations/stations/StationSelect.vue';
import type {
  FlightOperationOverviewDto,
  ManifestStatus
} from '#shared/contracts/flight-operations';

const search = ref('');
const route = useRoute();
const manifestStatus = ref<ManifestStatus | null>(
  ['DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED'].includes(String(route.query.status))
    ? (route.query.status as ManifestStatus)
    : null
);
const stationId = ref<string | null>(
  typeof route.query.stationId === 'string' ? route.query.stationId : null
);
const dateFrom = ref(typeof route.query.dateFrom === 'string' ? route.query.dateFrom : '');
const dateTo = ref(typeof route.query.dateTo === 'string' ? route.query.dateTo : '');
const pageOffset = ref(0);
const { data, pending, error, refresh } = await useAsyncData(
  'flight-manifest-worklist',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: {
        search: search.value,
        manifestStatus: manifestStatus.value ?? undefined,
        stationId: stationId.value ?? undefined,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        limit: 100,
        offset: pageOffset.value
      }
    }),
  { watch: [search, manifestStatus, stationId, dateFrom, dateTo, pageOffset] }
);

const rows = computed(() =>
  manifestStatus.value
    ? (data.value?.flights ?? [])
    : (data.value?.flights ?? []).filter((flight) =>
        [
          'DRAFT',
          'PENDING_READINESS',
          'BLOCKED',
          'READY_FOR_APPROVAL',
          'APPROVED',
          'SCHEDULED',
          'CHECK_IN_OPEN',
          'CHECK_IN_CLOSED',
          'READY_FOR_DEPARTURE'
        ].includes(flight.currentStatus)
      )
);
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Manifest Control</h1>
        <p class="text-text-muted">
          Operational load review, DG decision, approval and final lock.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load manifest worklist.
    </VAlert>

    <VCard border class="mb-4">
      <VCardText>
        <VRow density="comfortable">
          <VCol cols="12" md="3">
            <VTextField
              v-model="search"
              density="compact"
              hide-details
              label="Search flight/customer"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="manifestStatus"
              clearable
              density="compact"
              hide-details
              :items="['DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED']"
              label="Manifest status"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="3">
            <StationSelect v-model="stationId" :allow-create="false" label="Station" />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model="dateFrom"
              density="compact"
              hide-details
              label="Date from"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model="dateTo"
              density="compact"
              hide-details
              label="Date to"
              type="date"
              variant="outlined"
            />
          </VCol>
        </VRow>
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
            <VBtn color="secondary" :to="`/flights/${flight.id}/manifest`" variant="tonal">
              Open Manifest Workspace
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
    <div class="mt-4 d-flex justify-end align-center ga-2">
      <span class="text-caption text-text-secondary">
        {{ pageOffset + 1 }}–{{ pageOffset + rows.length }}
      </span>
      <VBtn
        :disabled="pageOffset === 0"
        prepend-icon="mdi-chevron-left"
        variant="text"
        @click="pageOffset = Math.max(0, pageOffset - 100)"
      >
        Previous
      </VBtn>
      <VBtn
        append-icon="mdi-chevron-right"
        :disabled="!data?.pagination.hasMore"
        variant="text"
        @click="pageOffset += 100"
      >
        Next
      </VBtn>
    </div>
  </VContainer>
</template>
