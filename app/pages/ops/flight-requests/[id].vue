<script setup lang="ts">
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';

const route = useRoute();
const store = useAmaDemoStore();
const { can } = useAuthorization();

const approveDialog = ref(false);
const rejectDialog = ref(false);
const rejectReason = ref('');

const requestId = computed(() => String(route.params.id));
const request = computed(() => store.getRequest(requestId.value));
const routeData = computed(() => store.routeForRequest(request.value));
const origin = computed(() => store.getStation(routeData.value?.originStationId));
const destination = computed(() => store.getStation(routeData.value?.destinationStationId));
const aircraft = computed(() => store.getAircraft(request.value?.assignedAircraftId));
const crew = computed(() => (request.value ? store.getCrew(request.value.assignedCrewIds) : []));
const readiness = computed(() => store.getReadinessForRequest(request.value?.id));
const approval = computed(() => store.getApprovalForRequest(request.value?.id));
const fuel = computed(() => store.getFuelConfirmation(request.value?.fuelPlan.confirmationId));
const originHandling = computed(() =>
  store.getHandlingConfirmation(request.value?.handlingPlan.originHandlingId)
);
const destinationHandling = computed(() =>
  store.getHandlingConfirmation(request.value?.handlingPlan.destinationHandlingId)
);
const bookings = computed(() =>
  request.value
    ? request.value.linkedBookingIds
        .map((bookingId) => store.data.value.bookings.find((booking) => booking.id === bookingId))
        .filter(Boolean)
    : []
);

const actionContext = computed(() => ({
  flightRequest: request.value,
  route: routeData.value,
  readiness: readiness.value
}));

const runDecision = computed(() => can('readiness.run', actionContext.value));
const fuelDecision = computed(() => can('fuel.request', actionContext.value));
const assignAircraftDecision = computed(() => can('flight_request.assign_aircraft', actionContext.value));
const assignCrewDecision = computed(() => can('flight_request.assign_crew', actionContext.value));
const submitDecision = computed(() => can('flight_request.submit', actionContext.value));
const approveDecision = computed(() => can('flight_request.approve', actionContext.value));
const rejectDecision = computed(() =>
  can('flight_request.reject', { ...actionContext.value, note: rejectReason.value || 'Demo rejection' })
);

const authorizationRows = computed(() => [
  { label: 'Run readiness', decision: runDecision.value },
  { label: 'Fuel request mock', decision: fuelDecision.value },
  { label: 'Assign aircraft', decision: assignAircraftDecision.value },
  { label: 'Assign crew', decision: assignCrewDecision.value },
  { label: 'Submit approval', decision: submitDecision.value },
  { label: 'Approve dispatch', decision: approveDecision.value }
]);

const requestAuditEvents = computed(() =>
  request.value
    ? store.data.value.auditEvents.filter((event) => event.entityId === request.value?.id).slice(0, 5)
    : []
);

function routeLabel() {
  return origin.value && destination.value
    ? formatRouteCode(origin.value.code, destination.value.code)
    : '-';
}

function approveRequest() {
  if (!request.value) return;
  store.approveAndCreateFlight(request.value.id);
  approveDialog.value = false;
}

function rejectRequest() {
  if (!request.value) return;
  store.rejectRequest(request.value.id, rejectReason.value);
  rejectDialog.value = false;
  rejectReason.value = '';
}

function confirmDestinationHandling() {
  if (destinationHandling.value) store.confirmHandling(destinationHandling.value.id);
}

function confirmOriginHandling() {
  if (originHandling.value) store.confirmHandling(originHandling.value.id);
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <VAlert v-if="!request" color="warning" variant="tonal">Flight Request tidak ditemukan.</VAlert>

    <template v-else>
      <div class="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">{{ request.requestNumber }}</h1>
          <p class="text-text-muted">{{ request.title }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <DsStatusBadge :value="request.status" />
            <DsStatusBadge :value="request.priority" />
            <VChip color="secondary" size="small" variant="tonal">{{ routeLabel() }}</VChip>
          </div>
        </div>
        <VSpacer />
        <VBtn color="primary" prepend-icon="mdi-arrow-left" to="/ops/flight-requests" variant="text">
          Back
        </VBtn>
        <VBtn color="primary" prepend-icon="mdi-refresh" @click="store.resetDemo">
          Reset Demo
        </VBtn>
      </div>

      <VRow>
        <VCol cols="12" lg="8">
          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Operational Plan</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="4">
                  <div class="text-sm text-text-muted">Route</div>
                  <div class="font-semibold">{{ routeLabel() }}</div>
                  <div class="text-sm text-text-muted">
                    Block {{ routeData?.plannedBlockMinutes ?? 0 }} min
                  </div>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-sm text-text-muted">Departure</div>
                  <div class="font-semibold">{{ formatJayapuraDateTime(request.plannedDepartureAt) }}</div>
                </VCol>
                <VCol cols="12" md="4">
                  <div class="text-sm text-text-muted">Arrival</div>
                  <div class="font-semibold">{{ formatJayapuraDateTime(request.plannedArrivalAt) }}</div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <VRow>
            <VCol cols="12" md="6">
              <VCard border class="h-full">
                <VCardTitle class="text-text-primary">Aircraft</VCardTitle>
                <VCardText>
                  <div class="text-xl font-semibold">{{ aircraft?.registration ?? '-' }}</div>
                  <div class="text-text-muted">
                    {{ aircraft?.manufacturer }} {{ aircraft?.model }}
                  </div>
                  <DsStatusBadge class="mt-3" :value="aircraft?.operationalStatus ?? 'PENDING'" />
                  <div class="mt-4 text-sm text-text-muted">
                    Payload limit {{ aircraft?.syntheticConfiguration.maxPayloadKg ?? 0 }} kg
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <VCol cols="12" md="6">
              <VCard border class="h-full">
                <VCardTitle class="text-text-primary">Crew</VCardTitle>
                <VList density="compact">
                  <VListItem v-for="member in crew" :key="member.id">
                    <VListItemTitle>{{ member.name }}</VListItemTitle>
                    <VListItemSubtitle>
                      {{ member.role }} | duty remaining {{ member.flightDuty.remainingMinutes }} min
                    </VListItemSubtitle>
                  </VListItem>
                </VList>
              </VCard>
            </VCol>
          </VRow>

          <VCard border class="mt-4">
            <VCardTitle class="text-text-primary">Readiness Checklist</VCardTitle>
            <VDataTable
              density="comfortable"
              hide-default-footer
              :items="readiness?.items ?? []"
              :headers="[
                { title: 'Check', key: 'label' },
                { title: 'Result', key: 'state' },
                { title: 'Message', key: 'message' }
              ]"
            >
              <template #[`item.state`]="{ item }">
                <DsStatusBadge :value="item.state" />
              </template>
            </VDataTable>
          </VCard>

          <VCard border class="mt-4">
            <VCardTitle class="text-text-primary">Linked Bookings</VCardTitle>
            <VList density="compact">
              <VListItem v-for="booking in bookings" :key="booking.id">
                <VListItemTitle>{{ booking.bookingCode }} - {{ booking.customerName }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ booking.source }} | Pax {{ booking.passengerCount }} | Cargo
                  {{ booking.cargoWeightKg }} kg
                </VListItemSubtitle>
              </VListItem>
            </VList>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Actions</VCardTitle>
            <VCardText class="flex flex-col gap-3">
              <VBtn
                block
                color="secondary"
                prepend-icon="mdi-clipboard-check"
                :disabled="!runDecision.allowed"
                @click="store.runReadiness(request.id)"
              >
                Run / Re-run Readiness
              </VBtn>
              <FeaturePermissionHint :decision="runDecision" />

              <VBtn
                block
                color="secondary"
                prepend-icon="mdi-fuel"
                :disabled="!fuelDecision.allowed"
                @click="store.requestFuelConfirmation(request.id)"
              >
                Request Fuel Confirmation
              </VBtn>

              <VBtn
                block
                color="primary"
                prepend-icon="mdi-airplane-cog"
                :disabled="!assignAircraftDecision.allowed"
                @click="store.assignAlternateAircraft(request.id)"
              >
                Assign Alternate Aircraft
              </VBtn>

              <VBtn
                block
                color="primary"
                prepend-icon="mdi-account-switch"
                :disabled="!assignCrewDecision.allowed"
                @click="store.assignAlternatePilot(request.id)"
              >
                Assign Alternate Pilot
              </VBtn>

              <VBtn
                block
                color="secondary"
                prepend-icon="mdi-send"
                :disabled="!submitDecision.allowed"
                @click="store.submitForApproval(request.id)"
              >
                Submit For Approval
              </VBtn>

              <VBtn
                block
                color="success"
                prepend-icon="mdi-check-decagram"
                :disabled="!approveDecision.allowed"
                @click="approveDialog = true"
              >
                Approve & Create Flight
              </VBtn>
              <FeaturePermissionHint :decision="approveDecision" />

              <VBtn color="danger" prepend-icon="mdi-close-circle" variant="tonal" @click="rejectDialog = true">
                Reject Request
              </VBtn>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Provider Mock</VCardTitle>
            <VList density="compact">
              <VListItem>
                <VListItemTitle>Fuel</VListItemTitle>
                <VListItemSubtitle>
                  {{ fuel?.provider ?? '-' }} | {{ fuel?.confirmedLiters ?? 0 }} /
                  {{ request.fuelPlan.requiredLiters }} L
                </VListItemSubtitle>
                <template #append>
                  <DsStatusBadge :value="fuel?.status ?? 'PENDING'" />
                </template>
              </VListItem>
              <VListItem @click="confirmOriginHandling">
                <VListItemTitle>Origin handling</VListItemTitle>
                <VListItemSubtitle>{{ origin?.code }} | {{ originHandling?.providerReference }}</VListItemSubtitle>
                <template #append>
                  <DsStatusBadge :value="originHandling?.status ?? 'PENDING'" />
                </template>
              </VListItem>
              <VListItem @click="confirmDestinationHandling">
                <VListItemTitle>Destination handling</VListItemTitle>
                <VListItemSubtitle>
                  {{ destination?.code }} | {{ destinationHandling?.providerReference }}
                </VListItemSubtitle>
                <template #append>
                  <DsStatusBadge :value="destinationHandling?.status ?? 'PENDING'" />
                </template>
              </VListItem>
            </VList>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Approval</VCardTitle>
            <VCardText>
              <div class="mb-2 flex items-center justify-between gap-3">
                <span>{{ approval?.type ?? 'DISPATCH_APPROVAL' }}</span>
                <DsStatusBadge :value="approval?.status ?? 'PENDING'" />
              </div>
              <div class="text-sm text-text-muted">
                Approver: {{ store.getUser(approval?.assignedApproverUserId)?.name ?? 'Chief of Pilot' }}
              </div>
              <div class="text-sm text-text-muted">
                Requested: {{ formatJayapuraDateTime(approval?.requestedAt) }}
              </div>
            </VCardText>
          </VCard>

          <VCard border class="mb-4">
            <VCardTitle class="text-text-primary">Authorization</VCardTitle>
            <VCardText>
              <div class="mb-3 text-sm text-text-muted">
                Actor: <strong>{{ store.currentUser.value.name }}</strong>
                <br>
                Persona: {{ store.currentUser.value.demoPersona }}
                <br>
                Station scope: {{ store.currentUser.value.stationScopeIds.join(', ') }}
              </div>
              <div v-for="row in authorizationRows" :key="row.label" class="mb-3">
                <div class="flex items-center justify-between gap-3">
                  <span>{{ row.label }}</span>
                  <DsStatusBadge :value="row.decision.allowed ? 'allowed' : 'denied'" />
                </div>
                <div class="text-sm text-text-muted">{{ row.decision.message }}</div>
              </div>
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="text-text-primary">Audit Preview</VCardTitle>
            <VList density="compact" lines="two">
              <VListItem
                v-for="event in requestAuditEvents"
                :key="event.id"
              >
                <VListItemTitle>{{ event.action }}</VListItemTitle>
                <VListItemSubtitle>{{ event.summary }}</VListItemSubtitle>
              </VListItem>
            </VList>
          </VCard>
        </VCol>
      </VRow>
    </template>

    <VDialog v-model="approveDialog" max-width="460">
      <VCard>
        <VCardTitle>Approve dispatch?</VCardTitle>
        <VCardText>
          Flight akan dibuat dari request ini dan assignment terkunci dalam simulasi lokal.
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="approveDialog = false">Cancel</VBtn>
          <VBtn color="success" @click="approveRequest">Approve</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="rejectDialog" max-width="520">
      <VCard>
        <VCardTitle>Reject request</VCardTitle>
        <VCardText>
          <VTextarea v-model="rejectReason" label="Reason" rows="3" variant="outlined" />
          <FeaturePermissionHint :decision="rejectDecision" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rejectDialog = false">Cancel</VBtn>
          <VBtn color="danger" :disabled="!rejectReason.trim()" @click="rejectRequest">Reject</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
