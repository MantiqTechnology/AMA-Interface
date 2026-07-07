<script setup lang="ts">
import type {
  CreateFlightOperationBody,
  FlightOperationDetailDto,
  FlightOperationLookupsDto,
  FlightType
} from '#shared/contracts/flight-operations';

const router = useRouter();
const errorMessage = ref('');
const submitting = ref(false);
const submitAfterSave = ref(false);
const flightTypeItems: FlightType[] = ['CHARTER', 'PASSENGER', 'CARGO'];
const form = reactive<CreateFlightOperationBody>({
  flightDate: new Date().toISOString().slice(0, 10),
  flightType: 'CHARTER',
  routeId: '',
  customerId: null,
  aircraftId: null,
  pilotInCommandId: null,
  coPilotId: null,
  scheduledDepartureAt: null,
  scheduledArrivalAt: null,
  remarks: null
});

const { data: lookups } = await useAsyncData('flight-request-new-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);

const selectedRoute = computed(() =>
  lookups.value?.routes.find((route) => route.value === form.routeId)
);
const selectedAircraft = computed(() =>
  lookups.value?.aircraft.find((aircraft) => aircraft.value === form.aircraftId)
);
const selectedPic = computed(() =>
  lookups.value?.crews.find((crew) => crew.value === form.pilotInCommandId)
);

function isoFromInput(value: string | null | undefined) {
  if (!value) return null;
  return value.includes('T') && !value.endsWith('Z') ? new Date(value).toISOString() : value;
}

async function saveDraft(thenSubmit = false) {
  errorMessage.value = '';
  submitting.value = true;
  submitAfterSave.value = thenSubmit;
  try {
    const created = await fetchApi<FlightOperationDetailDto>('/api/flight-operations/flights', {
      method: 'POST',
      body: {
        ...form,
        scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt),
        scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt)
      }
    });
    if (thenSubmit) {
      await fetchApi<FlightOperationDetailDto>(
        `/api/flight-operations/flights/${created.id}/actions/submit`,
        {
          method: 'POST'
        }
      );
    }
    await router.push(`/flights/${created.id}`);
  } catch (errorValue) {
    errorMessage.value =
      errorValue instanceof Error ? errorValue.message : 'Unable to save flight request';
  } finally {
    submitting.value = false;
    submitAfterSave.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold text-text-primary">Create Flight Request</h1>
      <p class="text-text-muted">
        Full-page workflow for basic flight, assignment, preparation, and submit.
      </p>
    </div>
    <VAlert v-if="errorMessage" class="mb-4" type="error" variant="tonal">
      {{
        errorMessage
      }}
    </VAlert>

    <VRow>
      <VCol cols="12" lg="8">
        <VCard border>
          <VCardText>
            <VRow>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="form.flightDate"
                  label="Flight date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.flightType"
                  label="Flight type"
                  :items="flightTypeItems"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.routeId"
                  item-title="title"
                  item-value="value"
                  label="Route"
                  :items="lookups?.routes ?? []"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.customerId"
                  clearable
                  item-title="title"
                  item-value="value"
                  label="Customer"
                  :items="lookups?.customers ?? []"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.aircraftId"
                  clearable
                  item-title="title"
                  item-value="value"
                  label="Aircraft"
                  :items="lookups?.aircraft ?? []"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.pilotInCommandId"
                  clearable
                  item-title="title"
                  item-value="value"
                  label="PIC"
                  :items="lookups?.crews ?? []"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.coPilotId"
                  clearable
                  item-title="title"
                  item-value="value"
                  label="Co-pilot"
                  :items="lookups?.crews ?? []"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.scheduledDepartureAt"
                  label="Scheduled departure"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.scheduledArrivalAt"
                  label="Scheduled arrival"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.remarks"
                  label="Operational remarks"
                  rows="3"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </VCardText>
          <VCardActions>
            <VBtn variant="text" to="/flights/requests">Cancel</VBtn>
            <VSpacer />
            <VBtn
              :loading="submitting && !submitAfterSave"
              variant="tonal"
              @click="saveDraft(false)"
            >
              Save Draft
            </VBtn>
            <VBtn
              color="secondary"
              :loading="submitting && submitAfterSave"
              @click="saveDraft(true)"
            >
              Save & Submit
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
      <VCol cols="12" lg="4">
        <VCard border>
          <VCardTitle>Review & Warnings</VCardTitle>
          <VCardText>
            <VAlert class="mb-3" type="info" variant="tonal">
              Flight number is generated automatically after save.
            </VAlert>
            <div>Route: {{ selectedRoute?.title ?? 'Not selected' }}</div>
            <div>Aircraft: {{ selectedAircraft?.title ?? 'Not selected' }}</div>
            <div>PIC: {{ selectedPic?.title ?? 'Not selected' }}</div>
            <VAlert
              v-if="selectedAircraft && selectedAircraft.serviceabilityStatus !== 'SERVICEABLE'"
              class="mt-3"
              type="warning"
              variant="tonal"
            >
              Aircraft is {{ selectedAircraft.serviceabilityStatus }} and readiness will fail.
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
