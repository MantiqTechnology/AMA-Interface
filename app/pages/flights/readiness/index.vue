<script setup lang="ts">
import StationSelect from '../../../features/operations/stations/StationSelect.vue';
import type {
  FlightOperationDetailDto,
  FlightOperationOverviewDto,
  OperationalAdvisoryDto
} from '#shared/contracts/flight-operations';

const search = ref('');
const loadingId = ref('');
const actionError = ref('');
const advisoryLoadingId = ref('');
const route = useRoute();
const stationId = ref<string | null>(
  typeof route.query.stationId === 'string' ? route.query.stationId : null
);
const dateFrom = ref(typeof route.query.dateFrom === 'string' ? route.query.dateFrom : '');
const dateTo = ref(typeof route.query.dateTo === 'string' ? route.query.dateTo : '');
const { can } = useAuthorization();

const { data, pending, error, refresh } = await useAsyncData(
  'flight-readiness-worklist',
  () =>
    fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
      query: {
        search: search.value,
        stationId: stationId.value ?? undefined,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        limit: 100
      }
    }),
  { watch: [search, stationId, dateFrom, dateTo] }
);
const { data: advisories, refresh: refreshAdvisories } = await useAsyncData(
  'operational-advisories',
  () =>
    fetchApi<OperationalAdvisoryDto[]>('/api/flight-operations/advisories', {
      query: {
        status: 'ACTIVE',
        stationId: stationId.value ?? undefined,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined
      }
    }),
  { default: () => [], watch: [stationId, dateFrom, dateTo] }
);

async function changeAdvisoryStatus(
  advisory: OperationalAdvisoryDto,
  status: 'ACTIVE' | 'RESOLVED'
) {
  advisoryLoadingId.value = advisory.id;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/advisories/${advisory.id}/status`, {
      method: 'PATCH',
      body: {
        status,
        reason:
          status === 'ACTIVE'
            ? 'Demo operational condition activated by OCC.'
            : 'OCC confirmed the operational condition is resolved.'
      }
    });
    await Promise.all([refresh(), refreshAdvisories()]);
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Advisory update failed';
  } finally {
    advisoryLoadingId.value = '';
  }
}

const rows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    [
      'PENDING_READINESS',
      'BLOCKED',
      'READY_FOR_OCC_REVIEW',
      'READY_FOR_APPROVAL',
      'REAPPROVAL_REQUIRED'
    ].includes(flight.currentStatus)
  )
);
const departureRows = computed(() =>
  (data.value?.flights ?? []).filter((flight) =>
    ['CHECK_IN_CLOSED', 'READY_FOR_DEPARTURE'].includes(flight.currentStatus)
  )
);
const filteredAdvisories = computed(() => advisories.value);

async function runAction(id: string, action: 'evaluate' | 'approve') {
  loadingId.value = `${id}-${action}`;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${id}/actions/${action}`,
      {
        method: 'POST'
      }
    );
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Readiness action failed';
  } finally {
    loadingId.value = '';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Operational Assurance</h1>
        <p class="text-text-muted">
          Planning Readiness is separated from the final Departure Assurance gate.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load readiness worklist.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VCard border class="mb-6">
      <VCardTitle class="d-flex align-center">
        <VIcon class="mr-2" icon="mdi-alert-decagram-outline" />
        Operational Advisories
      </VCardTitle>
      <VCardText class="pt-0">
        <VList lines="three">
          <VListItem
            v-for="advisory in filteredAdvisories"
            :key="advisory.id"
            :subtitle="advisory.operationalLimitation ?? advisory.sourceReference ?? undefined"
            :title="advisory.summary"
          >
            <template #prepend>
              <VChip
                class="mr-3"
                :color="advisory.severity === 'BLOCKING' ? 'error' : 'warning'"
                size="small"
              >
                {{ advisory.advisoryType }}
              </VChip>
            </template>
            <template #append>
              <VChip class="mr-3" :color="advisory.status === 'ACTIVE' ? 'error' : 'success'">
                {{ advisory.status }}
              </VChip>
              <VBtn
                v-if="can('flight.advisory.manage').allowed"
                :color="advisory.status === 'ACTIVE' ? 'success' : 'error'"
                :loading="advisoryLoadingId === advisory.id"
                :prepend-icon="
                  advisory.status === 'ACTIVE' ? 'mdi-check-circle-outline' : 'mdi-alert-outline'
                "
                variant="tonal"
                @click="
                  changeAdvisoryStatus(
                    advisory,
                    advisory.status === 'ACTIVE' ? 'RESOLVED' : 'ACTIVE'
                  )
                "
              >
                {{ advisory.status === 'ACTIVE' ? 'Resolve' : 'Activate demo condition' }}
              </VBtn>
            </template>
          </VListItem>
        </VList>
      </VCardText>
    </VCard>

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
        <VRow class="mt-2" density="comfortable">
          <VCol cols="12" md="4">
            <StationSelect v-model="stationId" :allow-create="false" label="Station" />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model="dateFrom"
              density="compact"
              hide-details
              label="Date from"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
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

    <h2 class="text-h6 mb-2">Planning Readiness</h2>
    <p class="mb-3 text-sm text-text-secondary">
      System checks recalculate when aircraft, route, crew, or planning evidence changes. Refresh is
      available for diagnostic retry; approval always performs a final synchronous evaluation.
    </p>
    <VCard border class="mb-6">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>PIC</th>
            <th>Status</th>
            <th>Readiness</th>
            <th>Blocking Reason</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-6 text-center text-text-secondary">Loading readiness...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="py-6 text-center text-text-secondary">
              No readiness item needs action.
            </td>
          </tr>
          <tr v-for="flight in rows" v-else :key="flight.id">
            <td>
              <div class="font-weight-medium">{{ flight.flightNumber }}</div>
              <div class="text-xs text-text-secondary">{{ flight.flightDate }}</div>
            </td>
            <td>{{ flight.originStationCode }} -> {{ flight.destinationStationCode }}</td>
            <td>{{ flight.aircraftRegistration ?? '-' }}</td>
            <td>{{ flight.pilotInCommandName ?? '-' }}</td>
            <td><FlightsFlightStatusChip :status="flight.currentStatus" /></td>
            <td>
              <div class="min-w-36">
                <VProgressLinear
                  color="secondary"
                  height="8"
                  rounded
                  :model-value="flight.readinessPercent"
                />
                <div class="mt-1 text-xs text-text-secondary">{{ flight.readinessSummary }}</div>
              </div>
            </td>
            <td class="max-w-72">{{ flight.blockingReason ?? '-' }}</td>
            <td class="text-right">
              <VBtn
                class="mr-1"
                density="comfortable"
                icon="mdi-open-in-new"
                :to="`/flights/${flight.id}`"
                variant="text"
              />
              <VBtn
                class="mr-1"
                density="comfortable"
                icon="mdi-refresh"
                :loading="loadingId === `${flight.id}-evaluate`"
                variant="tonal"
                @click="runAction(flight.id, 'evaluate')"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <h2 class="text-h6 mb-2">Departure Assurance</h2>
    <p class="mb-3 text-sm text-text-secondary">
      Final manifest lock, DG decision, fuel, origin tasks, documents and dual station sign-off.
    </p>
    <VCard border>
      <VList>
        <VListItem
          v-for="flight in departureRows"
          :key="flight.id"
          :subtitle="`${flight.originStationCode} → ${flight.destinationStationCode} · ${flight.flightDate}`"
          :title="flight.flightNumber"
          :to="`/flights/${flight.id}/manifest`"
        >
          <template #append>
            <FlightsFlightStatusChip :status="flight.currentStatus" />
            <VIcon class="ml-3" icon="mdi-chevron-right" />
          </template>
        </VListItem>
        <VListItem
          v-if="!pending && departureRows.length === 0"
          subtitle="Flights appear here after check-in or load intake is closed."
          title="No departure assurance item"
        />
      </VList>
    </VCard>
  </VContainer>
</template>
