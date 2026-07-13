<script setup lang="ts">
import AircraftSelect from '../../../../features/operations/aircraft/AircraftSelect.vue';
import CustomerSelect from '../../../../features/commercial/customers/CustomerSelect.vue';
import PersonnelSelect from '../../../../features/operations/personnel/PersonnelSelect.vue';
import RouteSelect from '../../../../features/operations/routes/RouteSelect.vue';
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { PersonnelOption } from '#shared/features/operations/personnel';
import type {
  CreateFlightRequestBody,
  FlightOperationLookupsDto,
  FlightOperationLookupOption,
  FlightRequestRecord
} from '#shared/contracts/flight-operations';

const route = useRoute();
const router = useRouter();
const flightId = computed(() => String(route.params.flightId));
const errorMessage = ref('');
const submitting = ref(false);
const submitAfterSave = ref(false);

const form = reactive<CreateFlightRequestBody>({
  flightDate: '',
  flightTypeId: 'flight-type-charter',
  serviceTypeId: 'flight-service-type-charter-cargo',
  routeId: '',
  customerId: null,
  aircraftId: null,
  pilotInCommandId: null,
  coPilotId: null,
  scheduledDepartureAt: null,
  scheduledArrivalAt: null,
  requestSource: 'Corporate Charter Request',
  priorityId: 'flight-priority-normal',
  passengerEstimate: 0,
  cargoWeightEstimateKg: 0,
  cargoCategory: null,
  dangerousGoods: false,
  fuelType: 'AVTUR',
  requestedFuelLitre: 0,
  fuelSupplierId: null,
  handlingSupplierId: null,
  parkingRequired: false,
  destinationHandlingRequired: false,
  billingType: 'CHARTER',
  estimatedRevenue: null,
  remarks: null
});

const { data: lookups } = await useAsyncData('flight-request-edit-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);
const { data: aircraftOptions } = await useAsyncData(
  'aircraft-options',
  () => fetchApi<AircraftOption[]>('/api/master-data/aircraft/options'),
  { default: () => [] }
);
const { data: personnelOptions } = await useAsyncData(
  'personnel-options',
  () => fetchApi<PersonnelOption[]>('/api/master-data/personnel/options'),
  { default: () => [] }
);

const {
  data: request,
  pending,
  error
} = await useAsyncData(`flight-request-edit-${flightId.value}`, () =>
  fetchApi<FlightRequestRecord>(`/api/flight-operations/requests/${flightId.value}`)
);

watch(
  request,
  (value) => {
    if (!value) return;
    form.flightDate = value.flightDate;
    form.flightTypeId = value.flightTypeId;
    form.serviceTypeId = value.serviceTypeId;
    form.routeId = value.routeId;
    form.customerId = value.customerId;
    form.aircraftId = value.aircraftId;
    form.pilotInCommandId = value.pilotInCommandId;
    form.coPilotId = value.coPilotId;
    form.scheduledDepartureAt = toLocalInput(value.scheduledDepartureAt);
    form.scheduledArrivalAt = toLocalInput(value.scheduledArrivalAt);
    form.requestSource = value.requestSource;
    form.priorityId = value.priorityId;
    form.passengerEstimate = value.passengerEstimate;
    form.cargoWeightEstimateKg = value.cargoWeightEstimateKg;
    form.cargoCategory = value.cargoCategory;
    form.dangerousGoods = value.dangerousGoods;
    form.fuelType = value.fuelType;
    form.requestedFuelLitre = value.requestedFuelLitre;
    form.fuelSupplierId = value.fuelSupplierId;
    form.handlingSupplierId = value.handlingSupplierId;
    form.parkingRequired = value.parkingRequired;
    form.destinationHandlingRequired = value.destinationHandlingRequired;
    form.billingType = value.billingType;
    form.estimatedRevenue = value.estimatedRevenue;
    form.remarks = value.remarks;
  },
  { immediate: true }
);

const canEdit = computed(() => ['DRAFT', 'REJECTED'].includes(request.value?.status ?? ''));
const defaultFlightTypeOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-type-charter',
    id: 'flight-type-charter',
    code: 'CHARTER',
    label: 'Charter',
    title: 'Charter',
    sortOrder: 1
  },
  {
    value: 'flight-type-passenger',
    id: 'flight-type-passenger',
    code: 'PASSENGER',
    label: 'Passenger',
    title: 'Passenger',
    sortOrder: 2
  },
  {
    value: 'flight-type-cargo',
    id: 'flight-type-cargo',
    code: 'CARGO',
    label: 'Cargo',
    title: 'Cargo',
    sortOrder: 3
  }
];
const defaultServiceTypeOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-service-type-charter-cargo',
    id: 'flight-service-type-charter-cargo',
    code: 'CHARTER_CARGO',
    label: 'Charter Cargo',
    title: 'Charter Cargo',
    sortOrder: 1
  },
  {
    value: 'flight-service-type-charter-passenger',
    id: 'flight-service-type-charter-passenger',
    code: 'CHARTER_PASSENGER',
    label: 'Charter Passenger',
    title: 'Charter Passenger',
    sortOrder: 2
  },
  {
    value: 'flight-service-type-scheduled-passenger',
    id: 'flight-service-type-scheduled-passenger',
    code: 'SCHEDULED_PASSENGER',
    label: 'Scheduled Passenger',
    title: 'Scheduled Passenger',
    sortOrder: 3
  },
  {
    value: 'flight-service-type-medevac',
    id: 'flight-service-type-medevac',
    code: 'MEDEVAC',
    label: 'Medevac',
    title: 'Medevac',
    sortOrder: 4
  },
  {
    value: 'flight-service-type-positioning',
    id: 'flight-service-type-positioning',
    code: 'POSITIONING',
    label: 'Positioning',
    title: 'Positioning',
    sortOrder: 5
  }
];
const defaultPriorityOptions: FlightOperationLookupOption[] = [
  {
    value: 'flight-priority-normal',
    id: 'flight-priority-normal',
    code: 'NORMAL',
    label: 'Normal',
    title: 'Normal',
    sortOrder: 1
  },
  {
    value: 'flight-priority-high',
    id: 'flight-priority-high',
    code: 'HIGH',
    label: 'High',
    title: 'High',
    sortOrder: 2
  },
  {
    value: 'flight-priority-emergency',
    id: 'flight-priority-emergency',
    code: 'EMERGENCY',
    label: 'Emergency',
    title: 'Emergency',
    sortOrder: 3
  }
];
const flightTypeOptions = computed(() => lookups.value?.flightTypes ?? defaultFlightTypeOptions);
const serviceTypeOptions = computed(
  () => lookups.value?.flightServiceTypes ?? defaultServiceTypeOptions
);
const priorityOptions = computed(() => lookups.value?.flightPriorities ?? defaultPriorityOptions);
const selectedAircraft = computed(() =>
  aircraftOptions.value.find((aircraft) => aircraft.id === form.aircraftId)
);
const selectedPic = computed(() =>
  personnelOptions.value.find((crew) => crew.id === form.pilotInCommandId)
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
    const updated = await fetchApi<FlightRequestRecord>(
      `/api/flight-operations/requests/${flightId.value}`,
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
      await fetchApi<FlightRequestRecord>(
        `/api/flight-operations/requests/${updated.id}/actions/submit`,
        {
          method: 'POST'
        }
      );
    }
    await router.push(`/flights/requests/${updated.id}`);
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
      {{ errorMessage }}
    </VAlert>
    <VAlert v-if="request && !canEdit" class="mb-4" type="warning" variant="tonal">
      This request is {{ request.status.replaceAll('_', ' ') }} and can no longer be edited from
      request workflow.
    </VAlert>

    <VCard border :loading="pending">
      <template #title>
        <div class="flex flex-wrap items-center gap-3">
          <span>{{ request?.requestNumber ?? 'Flight request' }}</span>
          <FlightsFlightStatusChip v-if="request" :status="request.status" />
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
              v-model="form.flightTypeId"
              :disabled="!canEdit"
              label="Flight type"
              item-title="title"
              item-value="value"
              :items="flightTypeOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="form.serviceTypeId"
              :disabled="!canEdit"
              label="Service type"
              item-title="title"
              item-value="value"
              :items="serviceTypeOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="form.priorityId"
              :disabled="!canEdit"
              label="Priority"
              item-title="title"
              item-value="value"
              :items="priorityOptions"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <RouteSelect
              v-model="form.routeId"
              :allow-create="true"
              :disabled="!canEdit"
              label="Route"
              :required="true"
            />
          </VCol>
          <VCol cols="12" md="6">
            <CustomerSelect
              v-model="form.customerId"
              clearable
              :allow-create="true"
              :disabled="!canEdit"
              label="Customer"
            />
          </VCol>
          <VCol cols="12" md="6">
            <AircraftSelect
              v-model="form.aircraftId"
              clearable
              :allow-create="true"
              :disabled="!canEdit"
              label="Aircraft"
            />
          </VCol>
          <VCol cols="12" md="6">
            <PersonnelSelect
              v-model="form.pilotInCommandId"
              clearable
              :allow-create="true"
              :disabled="!canEdit"
              label="PIC"
            />
          </VCol>
          <VCol cols="12" md="6">
            <PersonnelSelect
              v-model="form.coPilotId"
              clearable
              :allow-create="true"
              :disabled="!canEdit"
              label="Co-pilot"
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
