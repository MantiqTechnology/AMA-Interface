<script setup lang="ts">
import type { FlightRequestRecord } from '#shared/contracts/flight-operations';

const route = useRoute();
const id = computed(() => String(route.params.id));
const decisionDialog = ref(false);
const decision = ref<'APPROVE' | 'REJECT' | 'REQUEST_REVISION'>('APPROVE');
const reason = ref('');
const actionError = ref('');
const actionLoading = ref(false);
const {
  data: request,
  pending,
  error,
  refresh
} = await useAsyncData(`flight-request-${id.value}`, () =>
  fetchApi<FlightRequestRecord>(`/api/flight-operations/requests/${id.value}`)
);

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function openDecision(value: typeof decision.value) {
  decision.value = value;
  reason.value = '';
  decisionDialog.value = true;
}

async function decide() {
  actionLoading.value = true;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/requests/${id.value}/actions/decision`, {
      method: 'POST',
      body: { decision: decision.value, reason: reason.value || undefined }
    });
    decisionDialog.value = false;
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Decision failed';
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <VContainer class="request-detail px-3 py-5 md:px-5" fluid>
    <VBreadcrumbs
      class="px-0 py-1"
      :items="[
        { title: 'Flight Requests', to: '/flights/requests' },
        { title: request?.requestNumber ?? 'Request' }
      ]"
    />
    <VAlert v-if="error" type="error" variant="tonal">Unable to load flight request.</VAlert>
    <VAlert v-if="actionError" closable class="mb-4" type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VSkeletonLoader v-if="pending" type="heading, paragraph, table" />

    <template v-else-if="request">
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-h4 font-weight-bold">{{ request.requestNumber }}</h1>
            <FlightsFlightStatusChip :status="request.status" />
          </div>
          <p class="text-text-secondary">
            {{ request.originStationCode }} → {{ request.destinationStationCode }} ·
            {{ request.serviceType.replaceAll('_', ' ') }}
          </p>
        </div>
        <VSpacer />
        <VBtn
          v-if="['DRAFT', 'REJECTED'].includes(request.status)"
          prepend-icon="mdi-pencil-outline"
          :to="`/flights/requests/${request.id}/edit`"
          variant="tonal"
        >
          Edit Request
        </VBtn>
        <VBtn
          v-if="request.status === 'SUBMITTED'"
          color="error"
          prepend-icon="mdi-close-circle-outline"
          variant="tonal"
          @click="openDecision('REJECT')"
        >
          Reject
        </VBtn>
        <VBtn
          v-if="request.status === 'SUBMITTED'"
          prepend-icon="mdi-file-edit-outline"
          variant="tonal"
          @click="openDecision('REQUEST_REVISION')"
        >
          Request Revision
        </VBtn>
        <VBtn
          v-if="request.status === 'SUBMITTED'"
          color="success"
          prepend-icon="mdi-check-decagram-outline"
          @click="openDecision('APPROVE')"
        >
          Approve & Create Order
        </VBtn>
        <VBtn
          v-if="request.convertedFlightId"
          color="secondary"
          prepend-icon="mdi-airplane"
          :to="`/flights/${request.convertedFlightId}`"
        >
          Open Flight Order
        </VBtn>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="space-y-4">
          <section class="detail-panel">
            <div class="panel-title">
              <VIcon icon="mdi-airplane-marker" />
              <h2>Flight Information</h2>
            </div>
            <div class="detail-grid">
              <div>
                <span>Flight date</span>
                <strong>{{ request.flightDate }}</strong>
              </div>
              <div>
                <span>Route</span>
                <strong>{{ request.routeCode }}</strong>
              </div>
              <div>
                <span>Priority</span> <FlightsFlightStatusChip :status="request.priority" />
              </div>
              <div>
                <span>ETD</span>
                <strong>{{ formatDate(request.scheduledDepartureAt) }}</strong>
              </div>
              <div>
                <span>ETA</span>
                <strong>{{ formatDate(request.scheduledArrivalAt) }}</strong>
              </div>
              <div>
                <span>Request source</span>
                <strong>{{ request.requestSource }}</strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{{ request.customerName ?? '-' }}</strong>
              </div>
              <div>
                <span>Billing type</span>
                <strong>{{ request.billingType }}</strong>
              </div>
              <div>
                <span>Estimated revenue</span>
                <strong>{{
                  new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: request.currencyCode,
                    maximumFractionDigits: 0
                  }).format(request.estimatedRevenue ?? 0)
                }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-panel">
            <div class="panel-title">
              <VIcon icon="mdi-account-group-outline" />
              <h2>Assignment & Preparation</h2>
            </div>
            <div class="detail-grid">
              <div>
                <span>Aircraft</span>
                <strong>{{ request.aircraftRegistration ?? '-' }}</strong>
              </div>
              <div>
                <span>PIC</span>
                <strong>{{ request.pilotInCommandName ?? '-' }}</strong>
              </div>
              <div>
                <span>Co-pilot</span>
                <strong>{{ request.coPilotName ?? '-' }}</strong>
              </div>
              <div>
                <span>Passenger estimate</span>
                <strong>{{ request.passengerEstimate }} pax</strong>
              </div>
              <div>
                <span>Cargo estimate</span>
                <strong>{{ request.cargoWeightEstimateKg }} kg</strong>
              </div>
              <div>
                <span>Dangerous Goods</span>
                <strong>{{ request.dangerousGoods ? 'Review required' : 'No' }}</strong>
              </div>
              <div>
                <span>Fuel request</span>
                <strong>{{ request.requestedFuelLitre }} L {{ request.fuelType }}</strong>
              </div>
              <div>
                <span>Parking</span>
                <strong>{{ request.parkingRequired ? 'Required' : 'Not required' }}</strong>
              </div>
              <div>
                <span>Destination handling</span>
                <strong>{{
                  request.destinationHandlingRequired ? 'Required' : 'Not required'
                }}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          <section class="detail-panel">
            <div class="panel-title">
              <VIcon icon="mdi-source-branch" />
              <h2>Request Flow</h2>
            </div>
            <div
              v-for="state in ['DRAFT', 'SUBMITTED', 'APPROVED', 'CONVERTED']"
              :key="state"
              class="flow-row"
              :class="{
                active: request.status === state,
                complete:
                  ['CONVERTED'].includes(request.status) ||
                  (request.status === 'SUBMITTED' && state === 'DRAFT')
              }"
            >
              <span /><strong>{{ state }}</strong>
            </div>
          </section>
          <VAlert v-if="request.status === 'SUBMITTED'" type="info" variant="tonal">
            Approval creates a separate Flight Order. Operational readiness, manifest, fuel
            confirmation, and closure continue on that order.
          </VAlert>
          <section class="detail-panel">
            <div class="panel-title">
              <VIcon icon="mdi-note-text-outline" />
              <h2>Operational Notes</h2>
            </div>
            <p class="text-sm">{{ request.remarks ?? 'No operational note.' }}</p>
          </section>
        </aside>
      </div>

      <VDialog v-model="decisionDialog" max-width="520">
        <VCard>
          <VCardTitle>{{ decision.replaceAll('_', ' ') }}</VCardTitle>
          <VCardText>
            <VAlert v-if="decision === 'APPROVE'" class="mb-4" type="info" variant="tonal">
              A new Flight Order will be created and linked to this request.
            </VAlert>
            <VTextarea
              v-model="reason"
              :label="decision === 'APPROVE' ? 'Approval note' : 'Reason and required correction'"
              rows="4"
              variant="outlined"
            />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="decisionDialog = false">Back</VBtn>
            <VBtn
              :color="decision === 'APPROVE' ? 'success' : 'error'"
              :loading="actionLoading"
              @click="decide"
            >
              Confirm
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>

<style scoped>
.request-detail {
  max-width: 1500px;
}
.detail-panel {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  padding: 16px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
}
.panel-title h2 {
  font-size: 14px;
  font-weight: 700;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.detail-grid > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.detail-grid span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 10px;
  text-transform: uppercase;
}
.detail-grid strong {
  overflow-wrap: anywhere;
  font-size: 12px;
}
.flow-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  min-height: 36px;
  color: rgb(var(--v-theme-text-secondary));
}
.flow-row span {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border: 2px solid rgb(var(--v-theme-border));
  border-radius: 50%;
}
.flow-row:not(:last-child) span::after {
  display: block;
  width: 1px;
  height: 27px;
  margin: 7px 0 0 2px;
  background: rgb(var(--v-theme-border));
  content: '';
}
.flow-row.complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
}
.flow-row.active {
  color: rgb(var(--v-theme-secondary));
}
.flow-row.active span {
  border-color: rgb(var(--v-theme-secondary));
}
@media (max-width: 700px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
