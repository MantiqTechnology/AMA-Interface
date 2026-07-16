<script setup lang="ts">
import type {
  FlightOperationLookupsDto,
  FlightRequestOverviewDto,
  FlightRequestRecord
} from '#shared/contracts/flight-operations';

const search = ref('');
const statusId = ref<string | undefined>();
const actionError = ref('');

const { data: lookups } = await useAsyncData('flight-request-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);

const { data, pending, error, refresh } = await useAsyncData(
  'flight-request-board',
  () =>
    fetchApi<FlightRequestOverviewDto>('/api/flight-operations/requests', {
      query: { search: search.value, statusId: statusId.value }
    }),
  { watch: [search, statusId] }
);

const statusOptions = computed(() => lookups.value?.flightRequestStatuses ?? []);

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value.includes('T') ? value : `${value}T00:00:00+09:00`));
}

function canEdit(request: FlightRequestRecord) {
  return ['DRAFT', 'REJECTED'].includes(request.status);
}

async function submitRequest(id: string) {
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/requests/${id}/actions/submit`, { method: 'POST' });
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Unable to submit request';
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-5" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Flight Requests</h1>
        <p class="text-text-secondary">
          Commercial and operational intake before Flight Order creation.
        </p>
      </div>
      <VSpacer />
      <VBtn color="secondary" prepend-icon="mdi-plus" to="/flights/requests/new">
        Create Flight Request
      </VBtn>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load flight requests.
    </VAlert>
    <VAlert v-if="actionError" closable class="mb-4" type="error" variant="tonal">
      {{ actionError }}
    </VAlert>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <VCard
        v-for="item in ['DRAFT', 'SUBMITTED', 'CONVERTED', 'REJECTED'] as const"
        :key="item"
        border
      >
        <VCardText class="flex items-center justify-between">
          <div>
            <div class="text-xs text-text-secondary">{{ item.replaceAll('_', ' ') }}</div>
            <div class="text-h5 font-weight-bold">{{ data?.summary[item] ?? 0 }}</div>
          </div>
          <FlightsFlightStatusChip :status="item" />
        </VCardText>
      </VCard>
    </div>

    <section class="mb-4 border bg-surface pa-4">
      <VRow>
        <VCol cols="12" md="8">
          <VTextField
            v-model="search"
            density="compact"
            hide-details
            label="Search request, customer, or route"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="statusId"
            clearable
            density="compact"
            hide-details
            item-title="title"
            item-value="value"
            label="Status"
            :items="statusOptions"
            variant="outlined"
          />
        </VCol>
      </VRow>
    </section>

    <section class="border bg-surface">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Request</th>
            <th>Date / Route</th>
            <th>Customer</th>
            <th>Aircraft / PIC</th>
            <th>Priority</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="7" class="py-8 text-center">Loading requests...</td>
          </tr>
          <tr v-else-if="!data?.requests.length">
            <td colspan="7" class="py-8 text-center text-text-secondary">
              No request matches this view.
            </td>
          </tr>
          <tr v-for="request in data?.requests ?? []" v-else :key="request.id">
            <td>
              <strong>{{ request.requestNumber }}</strong>
              <div class="text-xs text-text-secondary">
                {{ request.serviceType.replaceAll('_', ' ') }}
              </div>
            </td>
            <td>
              {{ formatDate(request.scheduledDepartureAt ?? request.flightDate) }}
              <div class="text-xs">
                {{ request.originStationCode }} → {{ request.destinationStationCode }}
              </div>
            </td>
            <td>{{ request.customerName ?? '-' }}</td>
            <td>
              {{ request.aircraftRegistration ?? 'Unassigned' }}
              <div class="text-xs">{{ request.pilotInCommandName ?? 'PIC unassigned' }}</div>
            </td>
            <td><FlightsFlightStatusChip :status="request.priority" /></td>
            <td><FlightsFlightStatusChip :status="request.status" /></td>
            <td class="text-right">
              <DsTooltipIconButton
                v-if="canEdit(request)"
                :aria-label="`Edit ${request.requestNumber}`"
                icon="mdi-pencil-outline"
                :to="`/flights/requests/${request.id}/edit`"
                tooltip="Edit request"
                variant="text"
              />
              <DsConfirmIconButton
                v-if="request.status === 'DRAFT'"
                :action="() => submitRequest(request.id)"
                :aria-label="`Submit ${request.requestNumber}`"
                color="secondary"
                confirm-icon="mdi-send-outline"
                confirm-text="Submit"
                icon="mdi-send-outline"
                :message="`Submit ${request.requestNumber} for operational review.`"
                title="Submit flight request?"
                tone="secondary"
                tooltip="Submit request"
                variant="tonal"
              />
              <DsTooltipIconButton
                :aria-label="`Open ${request.requestNumber}`"
                icon="mdi-open-in-new"
                :to="`/flights/requests/${request.id}`"
                tooltip="Open request"
                variant="text"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>
  </VContainer>
</template>
