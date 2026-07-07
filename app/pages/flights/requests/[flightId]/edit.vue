<script setup lang="ts">
import type {
  CreateFlightOperationBody,
  FlightOperationDetailDto,
  FlightOperationLookupsDto,
  FlightType
} from '#shared/contracts/flight-operations';

const route = useRoute();
const router = useRouter();
const flightId = computed(() => String(route.params.flightId));
const errorMessage = ref('');
const submitting = ref(false);
const submitAfterSave = ref(false);
const flightTypeItems: FlightType[] = ['CHARTER', 'PASSENGER', 'CARGO'];

const form = reactive<CreateFlightOperationBody>({
  flightDate: '',
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

const { data: lookups } = await useAsyncData('flight-request-edit-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);

const {
  data: flight,
  pending,
  error
} = await useAsyncData(`flight-request-edit-${flightId.value}`, () =>
  fetchApi<FlightOperationDetailDto>(`/api/flight-operations/flights/${flightId.value}`)
);

watch(
  flight,
  (value) => {
    if (!value) return;
    form.flightDate = value.flightDate;
    form.flightType = value.flightType;
    form.routeId = value.routeId;
    form.customerId = value.customerId;
    form.aircraftId = value.aircraftId;
    form.pilotInCommandId = value.pilotInCommandId;
    form.coPilotId = value.coPilotId;
    form.scheduledDepartureAt = toLocalInput(value.scheduledDepartureAt);
    form.scheduledArrivalAt = toLocalInput(value.scheduledArrivalAt);
    form.remarks = value.remarks;
  },
  { immediate: true }
);

const canEdit = computed(() =>
  ['DRAFT', 'BLOCKED', 'REOPENED_FOR_CORRECTION'].includes(flight.value?.currentStatus ?? '')
);
const selectedAircraft = computed(() =>
  lookups.value?.aircraft.find((aircraft) => aircraft.value === form.aircraftId)
);
const selectedPic = computed(() =>
  lookups.value?.crews.find((crew) => crew.value === form.pilotInCommandId)
);

function toLocalInput(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function isoFromInput(value: string | null | undefined) {
  if (!value) return null;
  return value.includes('T') && !value.endsWith('Z') ? new Date(value).toISOString() : value;
}

async function saveDraft(thenSubmit = false) {
  errorMessage.value = '';
  submitting.value = true;
  submitAfterSave.value = thenSubmit;
  try {
    const updated = await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flightId.value}`,
      {
        method: 'PUT',
        body: {
          ...form,
          scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt),
          scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt)
        }
      }
    );
    if (thenSubmit) {
      await fetchApi<FlightOperationDetailDto>(
        `/api/flight-operations/flights/${updated.id}/actions/submit`,
        {
          method: 'POST'
        }
      );
    }
    await router.push(`/flights/${updated.id}`);
  } catch (errorValue) {
    errorMessage.value =
      errorValue instanceof Error ? errorValue.message : 'Unable to update flight request';
  } finally {
    submitting.value = false;
    submitAfterSave.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold text-text-primary">Edit Flight Request</h1>
      <p class="text-text-muted">
        Update draft or blocked request before it enters approval and flight execution.
      </p>
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load flight request.
    </VAlert>
    <VAlert v-if="errorMessage" class="mb-4" type="error" variant="tonal">
      {{
        errorMessage
      }}
    </VAlert>
    <VAlert v-if="flight && !canEdit" class="mb-4" type="warning" variant="tonal">
      This request is {{ flight.currentStatus.replaceAll('_', ' ') }} and can no longer be edited
      from request workflow.
    </VAlert>

    <VCard border :loading="pending">
      <template #title>
        <div class="flex flex-wrap items-center gap-3">
          <span>{{ flight?.flightNumber ?? 'Flight request' }}</span>
          <FlightsFlightStatusChip v-if="flight" :status="flight.currentStatus" />
        </div>
      </template>
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <VTextField
              v-model="form.flightDate"
              :disabled="!canEdit"
              label="Flight date"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="form.flightType"
              :disabled="!canEdit"
              label="Flight type"
              :items="flightTypeItems"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="form.routeId"
              :disabled="!canEdit"
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
              :disabled="!canEdit"
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
              :disabled="!canEdit"
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
              :disabled="!canEdit"
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
              :disabled="!canEdit"
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
              :disabled="!canEdit"
              label="Scheduled departure"
              type="datetime-local"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.scheduledArrivalAt"
              :disabled="!canEdit"
              label="Scheduled arrival"
              type="datetime-local"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="form.remarks"
              :disabled="!canEdit"
              label="Operational remarks"
              rows="3"
              variant="outlined"
            />
          </VCol>
        </VRow>

        <VAlert
          v-if="selectedAircraft && selectedAircraft.serviceabilityStatus !== 'SERVICEABLE'"
          class="mt-2"
          type="warning"
          variant="tonal"
        >
          Aircraft is {{ selectedAircraft.serviceabilityStatus }} and readiness will fail until
          fixed.
        </VAlert>
        <VAlert
          v-if="selectedPic?.licenseExpiryDate && selectedPic.licenseExpiryDate < form.flightDate"
          class="mt-2"
          type="warning"
          variant="tonal"
        >
          PIC license expires before the selected flight date.
        </VAlert>
      </VCardText>
      <VCardActions>
        <VBtn variant="text" to="/flights/requests">Back</VBtn>
        <VSpacer />
        <VBtn
          :disabled="!canEdit"
          :loading="submitting && !submitAfterSave"
          variant="tonal"
          @click="saveDraft(false)"
        >
          Save Draft
        </VBtn>
        <VBtn
          :disabled="!canEdit"
          color="secondary"
          :loading="submitting && submitAfterSave"
          @click="saveDraft(true)"
        >
          Save & Submit
        </VBtn>
      </VCardActions>
    </VCard>
  </VContainer>
</template>
