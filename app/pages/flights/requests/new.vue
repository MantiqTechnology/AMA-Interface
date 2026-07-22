<script setup lang="ts">
import AircraftSelect from '../../../features/operations/aircraft/AircraftSelect.vue';
import CustomerSelect from '../../../features/commercial/customers/CustomerSelect.vue';
import FlightCapacityProfileSelect from '../../../features/operations/flight-capacity-profiles/FlightCapacityProfileSelect.vue';
import FlightScheduleTemplateSelect from '../../../features/operations/flight-schedule-templates/FlightScheduleTemplateSelect.vue';
import FuelSupplierSelect from '../../../features/finance/fuel-suppliers/FuelSupplierSelect.vue';
import HandlingParkingSupplierSelect from '../../../features/finance/handling-parking-suppliers/HandlingParkingSupplierSelect.vue';
import PersonnelSelect from '../../../features/operations/personnel/PersonnelSelect.vue';
import RouteSelect from '../../../features/operations/routes/RouteSelect.vue';
import type { CustomerOption } from '#shared/features/commercial/customers';
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { FlightCapacityProfileOption } from '#shared/features/operations/flight-capacity-profiles';
import type { FlightScheduleTemplateOption } from '#shared/features/operations/flight-schedule-templates';
import type { PersonnelOption } from '#shared/features/operations/personnel';
import type { RouteOption } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
import type {
  CreateFlightRequestBody,
  FlightOperationLookupsDto,
  FlightOperationLookupOption,
  FlightPlanningContextDto,
  FlightRatePreviewDto,
  FlightRequestRecord
} from '#shared/contracts/flight-operations';

const router = useRouter();
const step = ref(1);
const submitting = ref(false);
const submitAfterSave = ref(false);
const errorMessage = ref('');
const stepLabels = [
  'Basic Flight Information',
  'Aircraft & Crew',
  'Manifest Setup',
  'Fuel & Station',
  'Review & Submit'
];

function todayDateInput() {
  const today = new Date();
  const timezoneOffsetMs = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

const form = reactive<CreateFlightRequestBody>({
  flightDate: todayDateInput(),
  flightTypeId: 'flight-type-cargo',
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
  cargoCategory: null,
  cargoWeightEstimateKg: 0,
  fuelType: 'AVTUR',
  dangerousGoods: false,
  requestedFuelLitre: 0,
  fuelSupplierId: null,
  handlingSupplierId: null,
  parkingRequired: false,
  destinationHandlingRequired: false,
  billingType: 'CHARTER',
  estimatedRevenue: null,
  remarks: null
});

const { data: lookups } = await useAsyncData('new-flight-request-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);
const { data: routeOptions } = await useAsyncData(
  'route-options',
  () => fetchApi<RouteOption[]>('/api/master-data/routes/options'),
  { default: () => [] }
);
const { data: stationOptions } = await useAsyncData(
  'station-options',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const { data: scheduleTemplateOptions } = await useAsyncData(
  'flight-schedule-templates-options',
  () =>
    fetchApi<FlightScheduleTemplateOption[]>('/api/master-data/flight-schedule-templates/options'),
  { default: () => [] }
);
const { data: capacityProfileOptions } = await useAsyncData(
  'flight-capacity-profiles-options',
  () =>
    fetchApi<FlightCapacityProfileOption[]>('/api/master-data/flight-capacity-profiles/options'),
  { default: () => [] }
);
const { data: customerOptions } = await useAsyncData(
  'customers-options',
  () => fetchApi<CustomerOption[]>('/api/master-data/customers/options'),
  { default: () => [] }
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
const selectedScheduleTemplateId = ref<string | null>(null);
const selectedCapacityProfileId = ref<string | null>(null);
const ratePreview = ref<FlightRatePreviewDto | null>(null);
const ratePreviewPending = ref(false);
const planningQuery = computed(() => ({
  routeId: form.routeId,
  flightDate: form.flightDate,
  serviceTypeId: form.serviceTypeId,
  scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt) ?? undefined,
  scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt) ?? undefined,
  passengerEstimate: form.passengerEstimate,
  cargoWeightEstimateKg: form.cargoWeightEstimateKg
}));
const {
  data: planningContext,
  pending: planningPending,
  error: planningError
} = await useAsyncData(
  'new-flight-request-planning-context',
  () =>
    form.routeId
      ? fetchApi<FlightPlanningContextDto>('/api/flight-operations/planning-context', {
          query: planningQuery.value
        })
      : Promise.resolve(null),
  { default: () => null, watch: [planningQuery] }
);

const requestSourceOptions = [
  'Corporate Charter Request',
  'Scheduled Service Plan',
  'Cargo Booking',
  'Medevac Request',
  'Positioning Instruction',
  'Ops Recovery'
];
const cargoCategoryOptions = [
  'General Cargo',
  'Perishable',
  'Medical Supplies',
  'AOG Parts',
  'Dangerous Goods',
  'Mail',
  'Baggage'
];
const fuelTypeOptions = ['AVTUR', 'Jet A-1', 'No Uplift Required'];
const billingTypeOptions = [
  'CHARTER',
  'SCHEDULED_PASSENGER',
  'CARGO',
  'INTERNAL_POSITIONING',
  'NON_REVENUE'
];

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

const selectedRoute = computed(() => routeOptions.value.find((item) => item.id === form.routeId));
const selectedFlightType = computed(() =>
  flightTypeOptions.value.find((item) => item.value === form.flightTypeId)
);
const selectedServiceType = computed(() =>
  serviceTypeOptions.value.find((item) => item.value === form.serviceTypeId)
);
const commercialService = computed(() =>
  ['CHARTER_CARGO', 'CHARTER_PASSENGER', 'SCHEDULED_PASSENGER'].includes(
    selectedServiceType.value?.code ?? ''
  )
);
const picCandidates = computed(() =>
  (planningContext.value?.crewCandidates ?? []).filter(
    (candidate) => candidate.crewRole === 'PILOT_IN_COMMAND'
  )
);
const coPilotCandidates = computed(() =>
  (planningContext.value?.crewCandidates ?? []).filter(
    (candidate) => candidate.crewRole === 'CO_PILOT'
  )
);
const planningBlockers = computed(() => planningContext.value?.routeReadiness.blockers ?? []);
const planningWarnings = computed(() => planningContext.value?.routeReadiness.warnings ?? []);
const selectedAircraftCandidate = computed(() =>
  planningContext.value?.aircraftCandidates.find((item) => item.id === form.aircraftId)
);
const selectedPicCandidate = computed(() =>
  picCandidates.value.find((item) => item.id === form.pilotInCommandId)
);
const selectedCoPilotCandidate = computed(() =>
  coPilotCandidates.value.find((item) => item.id === form.coPilotId)
);
const hasPlanningBlocker = computed(
  () =>
    planningBlockers.value.length > 0 ||
    selectedAircraftCandidate.value?.available === false ||
    selectedPicCandidate.value?.available === false ||
    selectedCoPilotCandidate.value?.available === false ||
    Boolean(capacityWarning.value)
);
const selectedScheduleTemplate = computed(() =>
  scheduleTemplateOptions.value.find((item) => item.id === selectedScheduleTemplateId.value)
);
const selectedCapacityProfile = computed(() =>
  capacityProfileOptions.value.find((item) => item.id === selectedCapacityProfileId.value)
);
const selectedCustomer = computed(() =>
  customerOptions.value.find((item) => item.id === form.customerId)
);
const selectedAircraft = computed(() =>
  aircraftOptions.value.find((item) => item.id === form.aircraftId)
);
const selectedPic = computed(() =>
  personnelOptions.value.find((item) => item.id === form.pilotInCommandId)
);
const selectedCoPilot = computed(() =>
  personnelOptions.value.find((item) => item.id === form.coPilotId)
);
const selectedAircraftStation = computed(() => {
  const stationId =
    selectedAircraft.value?.currentStationId ?? selectedAircraft.value?.baseStationId;
  return stationOptions.value.find((item) => item.id === stationId) ?? null;
});
const capacityLimit = computed(() => {
  const profile = selectedCapacityProfile.value;
  if (profile) {
    return {
      passengerCapacity: Math.max(0, profile.seatCapacity - profile.reservedSeatCount),
      cargoCapacityKg: Math.max(0, profile.cargoCapacityKg - profile.reservedCargoKg),
      label: profile.profileCode
    };
  }

  if (!selectedAircraft.value) return null;
  return {
    passengerCapacity: selectedAircraft.value.passengerCapacity,
    cargoCapacityKg: selectedAircraft.value.cargoCapacityKg,
    label: selectedAircraft.value.registrationNumber
  };
});
const capacityWarning = computed(() => {
  if (!capacityLimit.value) return '';
  if (form.passengerEstimate > capacityLimit.value.passengerCapacity) {
    return `Passenger estimate exceeds ${capacityLimit.value.label} available capacity.`;
  }
  if (form.cargoWeightEstimateKg > capacityLimit.value.cargoCapacityKg) {
    return `Cargo estimate exceeds ${capacityLimit.value.label} available capacity.`;
  }
  return '';
});
const assignmentWarnings = computed(() => {
  const warnings: string[] = [];
  const aircraftStationId =
    selectedAircraft.value?.currentStationId ?? selectedAircraft.value?.baseStationId;
  if (
    aircraftStationId &&
    selectedRoute.value &&
    ![selectedRoute.value.originStationId, selectedRoute.value.destinationStationId].includes(
      aircraftStationId
    )
  ) {
    warnings.push('Aircraft positioning review is required.');
  }
  if (selectedAircraft.value?.serviceabilityStatus !== 'SERVICEABLE' && selectedAircraft.value) {
    warnings.push('Selected aircraft is not serviceable.');
  }
  if (
    selectedPic.value?.licenseExpiryDate &&
    selectedPic.value.licenseExpiryDate < form.flightDate
  ) {
    warnings.push('PIC licence expires before the flight date.');
  }
  if (
    selectedPic.value?.availabilityStatus &&
    selectedPic.value.availabilityStatus !== 'AVAILABLE'
  ) {
    warnings.push(`PIC availability is ${selectedPic.value.availabilityStatus}.`);
  }
  if (
    selectedCoPilot.value?.availabilityStatus &&
    selectedCoPilot.value.availabilityStatus !== 'AVAILABLE'
  ) {
    warnings.push(`Co-pilot availability is ${selectedCoPilot.value.availabilityStatus}.`);
  }
  if (form.pilotInCommandId && form.pilotInCommandId === form.coPilotId) {
    warnings.push('PIC and co-pilot must be different people.');
  }
  for (const candidate of [
    selectedAircraftCandidate.value,
    selectedPicCandidate.value,
    selectedCoPilotCandidate.value
  ]) {
    if (candidate) warnings.push(...candidate.warnings, ...candidate.blockers);
  }
  return warnings;
});

function isoFromInput(value: string | null | undefined) {
  if (!value) return null;
  return value.endsWith('Z') ? value : new Date(value).toISOString();
}

function localDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

function applyScheduleTemplate() {
  const template = selectedScheduleTemplate.value;
  if (!template) return;

  form.routeId = template.routeId;
  form.serviceTypeId = template.serviceTypeId;
  const serviceTypeCode = serviceTypeOptions.value.find(
    (item) => item.value === template.serviceTypeId
  )?.code;
  if (serviceTypeCode) form.flightTypeId = flightTypeIdFromServiceTypeCode(serviceTypeCode);
  if (template.defaultAircraftId) {
    form.aircraftId = template.defaultAircraftId;
  }
  form.scheduledDepartureAt = localDateTime(form.flightDate, template.departureTimeLocal);
  form.scheduledArrivalAt = localDateTime(form.flightDate, template.arrivalTimeLocal);
}

function flightTypeCodeFromServiceType(serviceType: string) {
  if (serviceType === 'SCHEDULED_PASSENGER') return 'PASSENGER';
  if (serviceType === 'CHARTER_CARGO') return 'CARGO';
  return 'CHARTER';
}

function flightTypeIdFromServiceTypeCode(serviceType: string) {
  const code = flightTypeCodeFromServiceType(serviceType);
  return flightTypeOptions.value.find((item) => item.code === code)?.value ?? form.flightTypeId;
}

function syncCapacityProfile() {
  if (selectedCapacityProfile.value) {
    const stillMatches =
      selectedCapacityProfile.value.routeId === form.routeId &&
      selectedCapacityProfile.value.aircraftId === form.aircraftId &&
      selectedCapacityProfile.value.serviceTypeId === form.serviceTypeId;
    if (stillMatches) return;
  }

  const match = capacityProfileOptions.value.find((profile) => {
    return (
      profile.routeId === form.routeId &&
      profile.aircraftId === form.aircraftId &&
      profile.serviceTypeId === form.serviceTypeId
    );
  });
  selectedCapacityProfileId.value = match?.id ?? null;
}

function ratePreviewQuantity() {
  if (selectedFlightType.value?.code === 'PASSENGER')
    return Math.max(1, form.passengerEstimate || 1);
  if (selectedFlightType.value?.code === 'CARGO')
    return Math.max(1, form.cargoWeightEstimateKg || 1);
  return 1;
}

function ratePreviewChannel() {
  if (selectedFlightType.value?.code === 'PASSENGER') return 'COUNTER';
  if (selectedFlightType.value?.code === 'CARGO') return 'CARGO';
  return undefined;
}

async function refreshRatePreview() {
  if (!form.routeId) {
    ratePreview.value = null;
    return;
  }

  ratePreviewPending.value = true;
  try {
    const preview = await fetchApi<FlightRatePreviewDto>('/api/flight-operations/rates/preview', {
      query: {
        routeId: form.routeId,
        flightTypeId: form.flightTypeId,
        serviceTypeId: form.serviceTypeId,
        bookingChannel: ratePreviewChannel(),
        passengerType: selectedFlightType.value?.code === 'PASSENGER' ? 'ADULT' : undefined,
        cargoPriceBasis:
          selectedFlightType.value?.code === 'CARGO' ? 'CHARGEABLE_WEIGHT' : undefined,
        customerId: form.customerId ?? undefined,
        aircraftType: selectedAircraft.value?.aircraftType,
        quantity: ratePreviewQuantity(),
        date: form.flightDate
      }
    });
    ratePreview.value = preview;
    if (preview.estimatedTotal > 0) {
      form.estimatedRevenue = preview.estimatedTotal;
    }
  } finally {
    ratePreviewPending.value = false;
  }
}

watch(selectedScheduleTemplateId, () => applyScheduleTemplate());
watch(
  () => form.serviceTypeId,
  () => {
    const code = selectedServiceType.value?.code;
    if (code) form.flightTypeId = flightTypeIdFromServiceTypeCode(code);
  }
);
watch(
  () => form.flightDate,
  () => {
    if (selectedScheduleTemplateId.value) applyScheduleTemplate();
  }
);
watch(
  [() => form.routeId, () => form.aircraftId, () => form.serviceTypeId, capacityProfileOptions],
  () => {
    syncCapacityProfile();
  },
  { immediate: true }
);
watch(
  [
    () => form.routeId,
    () => form.flightTypeId,
    () => form.serviceTypeId,
    () => form.customerId,
    () => selectedAircraft.value?.aircraftType,
    () => form.passengerEstimate,
    () => form.cargoWeightEstimateKg,
    () => form.flightDate
  ],
  () => {
    void refreshRatePreview();
  },
  { immediate: true }
);

function nextStep() {
  errorMessage.value = '';
  if (
    step.value === 1 &&
    (!form.routeId ||
      (commercialService.value && !form.customerId) ||
      !form.scheduledDepartureAt ||
      !form.scheduledArrivalAt)
  ) {
    errorMessage.value = commercialService.value
      ? 'Route, customer, ETD, and ETA are required before continuing.'
      : 'Route, ETD, and ETA are required before continuing.';
    return;
  }
  if (step.value === 1 && planningBlockers.value.length) {
    errorMessage.value = planningBlockers.value.join(' ');
    return;
  }
  if (step.value === 2 && (!form.aircraftId || !form.pilotInCommandId)) {
    errorMessage.value = 'Aircraft and PIC assignment are required before continuing.';
    return;
  }
  step.value = Math.min(5, step.value + 1);
}

async function saveRequest(thenSubmit: boolean) {
  if (submitting.value) return;

  errorMessage.value = '';
  submitting.value = true;
  submitAfterSave.value = thenSubmit;
  try {
    const created = await fetchApi<FlightRequestRecord>('/api/flight-operations/requests', {
      method: 'POST',
      body: {
        ...form,
        scheduledDepartureAt: isoFromInput(form.scheduledDepartureAt),
        scheduledArrivalAt: isoFromInput(form.scheduledArrivalAt)
      }
    });
    if (thenSubmit) {
      await fetchApi(`/api/flight-operations/requests/${created.id}/actions/submit`, {
        method: 'POST'
      });
    }
    await router.push(`/flights/requests/${created.id}`);
  } catch (errorValue) {
    errorMessage.value =
      errorValue instanceof Error ? errorValue.message : 'Unable to save flight request';
  } finally {
    submitting.value = false;
    submitAfterSave.value = false;
  }
}

function money(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
</script>

<template>
  <VContainer class="request-create px-3 py-5 md:px-5" fluid>
    <VBreadcrumbs
      class="px-0 py-1"
      :items="[{ title: 'Flight Requests', to: '/flights/requests' }, { title: 'Create Request' }]"
    />
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold">Create Flight Request</h1>
      <p class="text-text-secondary">
        Prepare the operational request before Flight Order approval.
      </p>
    </div>

    <div class="stepper mb-5">
      <button
        v-for="(label, index) in stepLabels"
        :key="label"
        :class="{ active: step === Number(index) + 1, complete: step > Number(index) + 1 }"
        type="button"
        @click="step = Number(index) + 1"
      >
        <span>{{ Number(index) + 1 }}</span>
        <strong>{{ label }}</strong>
      </button>
    </div>

    <VAlert v-if="errorMessage" closable class="mb-4" type="error" variant="tonal">
      {{ errorMessage }}
    </VAlert>
    <VAlert v-if="planningError" class="mb-4" type="error" variant="tonal">
      Planning availability could not be refreshed. Review the selected route and schedule.
    </VAlert>
    <VAlert
      v-for="blocker in planningBlockers"
      :key="blocker"
      class="mb-3"
      type="error"
      variant="tonal"
    >
      {{ blocker }}
    </VAlert>
    <VAlert
      v-for="warning in planningWarnings"
      :key="warning"
      class="mb-3"
      type="warning"
      variant="tonal"
    >
      {{ warning }}
    </VAlert>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="border bg-surface pa-5">
        <VWindow v-model="step">
          <VWindowItem :value="1">
            <div class="section-title">
              <VIcon icon="mdi-airplane-plus" />
              <div>
                <h2>Basic Flight Information</h2>
                <span>Request identity, route, customer, and schedule</span>
              </div>
            </div>
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
                  v-model="form.flightTypeId"
                  label="Flight category"
                  item-title="title"
                  item-value="value"
                  :items="flightTypeOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.serviceTypeId"
                  label="Service type"
                  item-title="title"
                  item-value="value"
                  :items="serviceTypeOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <FlightScheduleTemplateSelect
                  v-model="selectedScheduleTemplateId"
                  :allow-create="true"
                  :candidates="planningContext?.scheduleTemplates ?? null"
                  clearable
                  label="Schedule template"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <RouteSelect
                  v-model="form.routeId"
                  :allow-create="true"
                  label="Route"
                  :required="true"
                />
              </VCol>
              <VCol cols="12" md="6">
                <CustomerSelect
                  v-model="form.customerId"
                  :allow-create="true"
                  label="Customer / corporate account"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.scheduledDepartureAt"
                  label="Estimated departure"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.scheduledArrivalAt"
                  label="Estimated arrival"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.requestSource"
                  :items="requestSourceOptions"
                  label="Request source"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.priorityId"
                  label="Priority"
                  item-title="title"
                  item-value="value"
                  :items="priorityOptions"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.remarks"
                  label="Operational notes"
                  rows="3"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem :value="2">
            <div class="section-title">
              <VIcon icon="mdi-account-switch-outline" />
              <div>
                <h2>Aircraft & Crew Assignment</h2>
                <span>Initial assignment with serviceability and eligibility preview</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12">
                <AircraftSelect
                  v-model="form.aircraftId"
                  :allow-create="true"
                  :candidates="planningContext?.aircraftCandidates ?? null"
                  label="Aircraft"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <PersonnelSelect
                  v-model="form.pilotInCommandId"
                  :allow-create="true"
                  :candidates="picCandidates"
                  label="Pilot in command"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <PersonnelSelect
                  v-model="form.coPilotId"
                  clearable
                  :allow-create="true"
                  :candidates="coPilotCandidates"
                  label="Co-pilot"
                  :loading="planningPending"
                />
              </VCol>
            </VRow>
            <div v-if="selectedAircraft" class="aircraft-preview">
              <div>
                <span>Registration</span>
                <strong>{{ selectedAircraft.registrationNumber }}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{{ selectedAircraft.aircraftType }}</strong>
              </div>
              <div>
                <span>Station</span>
                <strong>{{ selectedAircraftStation?.stationCode ?? '-' }}</strong>
              </div>
              <div>
                <span>Capacity</span>
                <strong>
                  {{ selectedAircraft.passengerCapacity }} pax /
                  {{ selectedAircraft.cargoCapacityKg }} kg
                </strong>
              </div>
              <div>
                <span>Status</span>
                <FlightsFlightStatusChip :status="selectedAircraft.serviceabilityStatus" />
              </div>
            </div>
            <VAlert
              v-for="warning in assignmentWarnings"
              :key="warning"
              class="mt-3"
              type="warning"
              variant="tonal"
            >
              {{ warning }}
            </VAlert>
          </VWindowItem>

          <VWindowItem :value="3">
            <div class="section-title">
              <VIcon icon="mdi-clipboard-text-outline" />
              <div>
                <h2>Manifest Setup</h2>
                <span>Initial passenger and cargo planning</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12">
                <FlightCapacityProfileSelect
                  v-model="selectedCapacityProfileId"
                  :allow-create="true"
                  :candidates="planningContext?.capacityProfiles ?? null"
                  clearable
                  label="Capacity profile"
                  :loading="planningPending"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model.number="form.passengerEstimate"
                  label="Passenger estimate"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model.number="form.cargoWeightEstimateKg"
                  label="Cargo estimate (kg)"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.cargoCategory"
                  clearable
                  :items="cargoCategoryOptions"
                  label="Cargo category"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VSwitch
                  v-model="form.dangerousGoods"
                  color="warning"
                  inset
                  label="Dangerous Goods review required"
                />
              </VCol>
            </VRow>
            <div v-if="capacityLimit" class="capacity-preview mb-4">
              <div>
                <span>Capacity source</span>
                <strong>{{ capacityLimit.label }}</strong>
              </div>
              <div>
                <span>Available seats</span>
                <strong>{{ capacityLimit.passengerCapacity }}</strong>
              </div>
              <div>
                <span>Available cargo</span>
                <strong>{{ capacityLimit.cargoCapacityKg }} kg</strong>
              </div>
              <div v-if="selectedCapacityProfile">
                <span>Reserved</span>
                <strong>
                  {{ selectedCapacityProfile.reservedSeatCount }} seats /
                  {{ selectedCapacityProfile.reservedCargoKg }} kg
                </strong>
              </div>
            </div>
            <VAlert v-if="capacityWarning" type="error" variant="tonal">
              {{ capacityWarning }}
            </VAlert>
          </VWindowItem>

          <VWindowItem :value="4">
            <div class="section-title">
              <VIcon icon="mdi-fuel" />
              <div>
                <h2>Fuel & Station Preparation</h2>
                <span>Mock supplier and ground-service requests</span>
              </div>
            </div>
            <VRow>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="form.fuelType"
                  :items="fuelTypeOptions"
                  label="Fuel type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model.number="form.requestedFuelLitre"
                  label="Requested fuel (L)"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <FuelSupplierSelect
                  v-model="form.fuelSupplierId"
                  clearable
                  :allow-create="true"
                  label="Fuel supplier"
                />
              </VCol>
              <VCol cols="12">
                <HandlingParkingSupplierSelect
                  v-model="form.handlingSupplierId"
                  clearable
                  :allow-create="true"
                  label="Handling provider"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="form.parkingRequired"
                  color="secondary"
                  inset
                  label="Parking required"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="form.destinationHandlingRequired"
                  color="secondary"
                  inset
                  label="Destination handling required"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.billingType"
                  :items="billingTypeOptions"
                  label="Billing type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="form.estimatedRevenue"
                  label="Estimated revenue (IDR)"
                  min="0"
                  type="number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VAlert :type="ratePreview?.matchedRateId ? 'info' : 'warning'" variant="tonal">
                  <div class="rate-preview-line">
                    <span>
                      Rate preview:
                      <strong>{{ ratePreview?.rateCode ?? 'No matching rate' }}</strong>
                    </span>
                    <span>
                      {{ money(ratePreview?.estimatedTotal ?? 0) }}
                      <template v-if="ratePreview?.rateUnit">
                        / {{ ratePreview.rateUnit.replace('PER_', '').toLowerCase() }}
                      </template>
                    </span>
                  </div>
                  <small>
                    {{
                      ratePreviewPending
                        ? 'Refreshing rate preview...'
                        : (ratePreview?.note ?? 'Select route to preview estimated revenue.')
                    }}
                  </small>
                </VAlert>
              </VCol>
            </VRow>
          </VWindowItem>

          <VWindowItem :value="5">
            <div class="section-title">
              <VIcon icon="mdi-check-decagram-outline" />
              <div>
                <h2>Review & Submit</h2>
                <span>Operational request summary and readiness preview</span>
              </div>
            </div>
            <div class="review-grid">
              <div>
                <span>Service</span>
                <strong>{{ selectedServiceType?.label ?? '-' }}</strong>
              </div>
              <div>
                <span>Route</span>
                <strong>
                  {{
                    selectedRoute
                      ? `${selectedRoute.routeCode} (${selectedRoute.originStationCode} -> ${selectedRoute.destinationStationCode})`
                      : '-'
                  }}
                </strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{{ selectedCustomer?.accountName ?? '-' }}</strong>
              </div>
              <div>
                <span>Schedule</span>
                <strong>
                  {{ form.scheduledDepartureAt ?? '-' }} → {{ form.scheduledArrivalAt ?? '-' }}
                </strong>
              </div>
              <div>
                <span>Schedule template</span>
                <strong>{{ selectedScheduleTemplate?.templateCode ?? '-' }}</strong>
              </div>
              <div>
                <span>Aircraft</span>
                <strong>{{ selectedAircraft?.registrationNumber ?? '-' }}</strong>
              </div>
              <div>
                <span>Capacity profile</span>
                <strong>{{ selectedCapacityProfile?.profileName ?? '-' }}</strong>
              </div>
              <div>
                <span>PIC / Co-pilot</span>
                <strong>
                  {{ selectedPic?.fullName ?? '-' }} / {{ selectedCoPilot?.fullName ?? '-' }}
                </strong>
              </div>
              <div>
                <span>Manifest estimate</span>
                <strong>
                  {{ form.passengerEstimate }} pax / {{ form.cargoWeightEstimateKg }} kg
                </strong>
              </div>
              <div>
                <span>Fuel request</span>
                <strong>{{ form.requestedFuelLitre }} L {{ form.fuelType }}</strong>
              </div>
              <div>
                <span>Estimated revenue</span>
                <strong>{{ money(form.estimatedRevenue) }}</strong>
              </div>
              <div>
                <span>Matched rate</span>
                <strong>{{ ratePreview?.rateCode ?? '-' }}</strong>
              </div>
            </div>
            <VAlert
              v-if="assignmentWarnings.length || capacityWarning || planningWarnings.length"
              class="mt-4"
              type="warning"
              variant="tonal"
            >
              This request contains
              {{ assignmentWarnings.length + planningWarnings.length + (capacityWarning ? 1 : 0) }}
              readiness warning(s). The Flight Order will require resolution before approval.
            </VAlert>
          </VWindowItem>
        </VWindow>

        <div class="mt-5 flex items-center border-t pt-4">
          <VBtn v-if="step > 1" prepend-icon="mdi-arrow-left" variant="text" @click="step--">
            Back
          </VBtn>
          <VBtn v-else to="/flights/requests" variant="text">Cancel</VBtn>
          <VSpacer />
          <VBtn v-if="step < 5" append-icon="mdi-arrow-right" color="secondary" @click="nextStep">
            Continue
          </VBtn>
          <template v-else>
            <VBtn
              :disabled="submitting || planningBlockers.length > 0 || planningPending"
              :loading="submitting && !submitAfterSave"
              variant="tonal"
              @click="saveRequest(false)"
            >
              Save as Draft
            </VBtn>
            <VBtn
              class="ml-2"
              color="secondary"
              :disabled="submitting || hasPlanningBlocker || planningPending"
              :loading="submitting && submitAfterSave"
              prepend-icon="mdi-send-outline"
              @click="saveRequest(true)"
            >
              Submit Request
            </VBtn>
          </template>
        </div>
      </section>

      <aside class="border bg-surface pa-4 self-start">
        <div class="section-title">
          <VIcon icon="mdi-clipboard-pulse-outline" />
          <div>
            <h2>Readiness Preview</h2>
            <span>Current request inputs</span>
          </div>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.routeId ? 'success' : 'warning'"
            :icon="form.routeId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>Route and schedule</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.aircraftId ? 'success' : 'warning'"
            :icon="form.aircraftId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>Aircraft assignment</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.pilotInCommandId ? 'success' : 'warning'"
            :icon="form.pilotInCommandId ? 'mdi-check-circle' : 'mdi-clock-outline'"
          />
          <span>PIC assignment</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="form.requestedFuelLitre > 0 ? 'success' : 'warning'"
            :icon="form.requestedFuelLitre > 0 ? 'mdi-check-circle' : 'mdi-clock-outline'"
          /><span>Fuel planning</span>
        </div>
        <div class="preview-item">
          <VIcon
            :color="!capacityWarning ? 'success' : 'error'"
            :icon="!capacityWarning ? 'mdi-check-circle' : 'mdi-alert-circle'"
          />
          <span>Capacity validation</span>
        </div>
      </aside>
    </div>
  </VContainer>
</template>

<style scoped>
.request-create {
  max-width: 1500px;
}
.stepper {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
}
.stepper button {
  position: relative;
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 9px;
  border-right: 1px solid rgb(var(--v-theme-border));
  padding: 10px 14px;
  color: rgb(var(--v-theme-text-secondary));
  text-align: left;
}
.stepper button:last-child {
  border-right: 0;
}
.stepper button span {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 50%;
  font-size: 11px;
}
.stepper button strong {
  font-size: 11px;
}
.stepper button.active {
  border-bottom: 3px solid rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-brand-primary));
}
.stepper button.complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
  color: white;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.section-title h2 {
  font-size: 15px;
  font-weight: 700;
}
.section-title span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.aircraft-preview,
.capacity-preview,
.review-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-background));
  padding: 14px;
}
.aircraft-preview > div,
.capacity-preview > div,
.review-grid > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.aircraft-preview span,
.capacity-preview span,
.review-grid span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 10px;
  text-transform: uppercase;
}
.aircraft-preview strong,
.capacity-preview strong,
.review-grid strong {
  overflow-wrap: anywhere;
  font-size: 12px;
}
.review-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.capacity-preview {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.rate-preview-line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.preview-item {
  display: flex;
  align-items: center;
  gap: 9px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 11px 0;
  font-size: 12px;
}
@media (max-width: 900px) {
  .stepper {
    grid-template-columns: 1fr;
  }
  .stepper button {
    min-height: 44px;
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-border));
  }
  .aircraft-preview,
  .capacity-preview,
  .review-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
