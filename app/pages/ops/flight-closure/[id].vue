<script setup lang="ts">
import { formatJayapuraDateTime, formatRouteCode } from '#operations/formatters';

const route = useRoute();
const store = useAmaDemoStore();
const { can } = useAuthorization();

const flightId = computed(() => String(route.params.id));
const flight = computed(() => store.getFlight(flightId.value));
const routeData = computed(() => store.routeForFlight(flight.value));
const origin = computed(() => store.getStation(routeData.value?.originStationId));
const destination = computed(() => store.getStation(routeData.value?.destinationStationId));

const form = reactive({
  fuelUsedLiters: 455,
  delayMinutes: 0,
  incidentReported: false,
  operationalRemark: ''
});

const closeDecision = computed(() =>
  can('flight.closure.create', {
    flight: flight.value,
    route: routeData.value,
    note: form.operationalRemark
  })
);

function routeLabel() {
  return origin.value && destination.value
    ? formatRouteCode(origin.value.code, destination.value.code)
    : '-';
}

function closeFlight() {
  if (!flight.value) return;
  store.closeFlight(flight.value.id, form);
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <VAlert v-if="!flight" color="warning" variant="tonal">Flight tidak ditemukan.</VAlert>

    <template v-else>
      <div class="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 class="text-3xl font-bold text-text-primary">Flight Closure</h1>
          <p class="text-text-muted">{{ flight.flightNumber }} | {{ routeLabel() }}</p>
        </div>
        <VSpacer />
        <VBtn color="primary" :to="`/ops/flights/${flight.id}`" variant="text">Flight Detail</VBtn>
      </div>

      <VRow>
        <VCol cols="12" md="5">
          <VCard border>
            <VCardTitle class="text-text-primary">Actuals</VCardTitle>
            <VCardText>
              <div class="mb-4">
                <div class="text-sm text-text-muted">Status</div>
                <DsStatusBadge :value="flight.status" />
              </div>
              <div class="mb-4">
                <div class="text-sm text-text-muted">Actual departure</div>
                <div class="font-semibold">{{ formatJayapuraDateTime(flight.actualDepartureAt) }}</div>
              </div>
              <div class="mb-4">
                <div class="text-sm text-text-muted">Actual arrival</div>
                <div class="font-semibold">{{ formatJayapuraDateTime(flight.actualArrivalAt) }}</div>
              </div>
              <div class="mb-4">
                <div class="text-sm text-text-muted">Delay</div>
                <div class="font-semibold">{{ flight.delay.minutes }} min</div>
                <div class="text-sm text-text-muted">{{ flight.delay.reasonText }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard v-if="flight.status !== 'CLOSED'" border>
            <VCardTitle class="text-text-primary">Closure Form</VCardTitle>
            <VCardText class="grid gap-4">
              <VTextField
                v-model.number="form.fuelUsedLiters"
                label="Fuel used liters"
                min="0"
                type="number"
                variant="outlined"
              />
              <VTextField
                v-model.number="form.delayMinutes"
                label="Delay minutes"
                min="0"
                type="number"
                variant="outlined"
              />
              <VSwitch v-model="form.incidentReported" color="danger" label="Incident reported" />
              <VTextarea v-model="form.operationalRemark" label="Operational remark" rows="4" variant="outlined" />
              <FeaturePermissionHint :decision="closeDecision" />
            </VCardText>
            <VCardActions>
              <VSpacer />
              <VBtn color="success" :disabled="!closeDecision.allowed" @click="closeFlight">
                Close Flight
              </VBtn>
            </VCardActions>
          </VCard>

          <VCard v-else-if="flight.closure" border>
            <VCardTitle class="text-text-primary">Closed Handoff</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <div class="text-sm text-text-muted">Finance</div>
                  <DsStatusBadge :value="flight.closure.financeHandoffStatus" />
                  <p class="mt-3">Fuel used {{ flight.closure.fuelUsedLiters }} L.</p>
                  <p>Delay {{ flight.closure.delayMinutes }} min.</p>
                </VCol>
                <VCol cols="12" md="6">
                  <div class="text-sm text-text-muted">Maintenance</div>
                  <DsStatusBadge :value="flight.closure.maintenanceHandoffStatus" />
                  <p class="mt-3">Incident: {{ flight.closure.incidentReported ? 'Yes' : 'No' }}</p>
                  <p>{{ flight.closure.operationalRemark }}</p>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>
  </VContainer>
</template>
