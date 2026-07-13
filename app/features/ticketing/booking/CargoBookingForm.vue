<script setup lang="ts">
import type { CargoBookingDto } from '#shared/features/ticketing/cargo';
import type { AvailableTicketingFlightDto } from '#shared/features/ticketing/sales';
import AgentSelect from '../../commercial/agents/AgentSelect.vue';
import DgCategorySelect from '../../cargo/dg-categories/DgCategorySelect.vue';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';

const emit = defineEmits<{ booked: [booking: CargoBookingDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const originStationId = ref<string | null>(null);
const destinationStationId = ref<string | null>(null);
const form = reactive({
  flightOrderId: null as string | null,
  senderName: '',
  receiverName: '',
  description: '',
  actualWeightKg: 10,
  lengthCm: 30,
  widthCm: 30,
  heightCm: 30,
  isDangerous: false,
  dgCategoryId: null as string | null,
  paymentMethod: 'TRANSFER' as 'CASH' | 'TRANSFER' | 'CARD' | 'QRIS',
  agentId: null as string | null
});
const required = (label: string) => (value: unknown) => Boolean(value) || `${label} is required`;

const { data: flights, pending } = await useAsyncData(
  'ticketing-cargo-flights',
  () =>
    fetchApi<AvailableTicketingFlightDto[]>('/api/ticketing/available-flights', {
      query: { serviceType: 'CARGO' }
    }),
  { default: () => [] }
);
const originOptions = computed(() => {
  const options = new Map<string, { id: string; title: string }>();
  for (const flight of flights.value) {
    options.set(flight.originStationId, {
      id: flight.originStationId,
      title: `${flight.originCode} - ${flight.originName}`
    });
  }
  return [...options.values()];
});
const destinationOptions = computed(() => {
  const options = new Map<string, { id: string; title: string }>();
  for (const flight of flights.value.filter(
    (record) => !originStationId.value || record.originStationId === originStationId.value
  )) {
    options.set(flight.destinationStationId, {
      id: flight.destinationStationId,
      title: `${flight.destinationCode} - ${flight.destinationName}`
    });
  }
  return [...options.values()];
});
const flightOptions = computed(() =>
  flights.value.filter(
    (flight) =>
      flight.originStationId === originStationId.value &&
      flight.destinationStationId === destinationStationId.value
  )
);
const selectedFlight = computed(() =>
  flights.value.find((flight) => flight.id === form.flightOrderId)
);
const volumeWeightKg = computed(
  () => Math.round(((form.lengthCm * form.widthCm * form.heightCm) / 6000) * 10) / 10
);
const chargeableWeightKg = computed(() => Math.max(form.actualWeightKg, volumeWeightKg.value));
const pricingWeightKg = computed(() => {
  if (selectedFlight.value?.cargoPriceBasis === 'ACTUAL_WEIGHT') return form.actualWeightKg;
  if (selectedFlight.value?.cargoPriceBasis === 'VOLUME_WEIGHT') return volumeWeightKg.value;
  return chargeableWeightKg.value;
});
const totalTariff = computed(() => {
  if (!selectedFlight.value) return 0;
  return Math.max(
    Math.round(pricingWeightKg.value * selectedFlight.value.baseRate),
    selectedFlight.value.minimumCharge ?? 0
  );
});
function flightTitle(flight: AvailableTicketingFlightDto | string | null | undefined) {
  if (typeof flight === 'string') return flight;
  if (!flight) return '';
  return `${flight.flightNumber} - ${formatTicketingDateTime(flight.scheduledDeparture)}`;
}

watch(originStationId, () => {
  destinationStationId.value = null;
  form.flightOrderId = null;
});
watch(destinationStationId, () => {
  form.flightOrderId = null;
});
watch(
  () => form.isDangerous,
  (dangerous) => {
    if (!dangerous) form.dgCategoryId = null;
  }
);

async function submit() {
  const validation = await formRef.value?.validate();
  if (validation && !validation.valid) return;
  if (!form.flightOrderId) {
    serverError.value = 'Select a cargo flight.';
    return;
  }
  submitting.value = true;
  serverError.value = '';
  try {
    const booking = await fetchApi<CargoBookingDto>('/api/ticketing/cargo-bookings', {
      method: 'POST',
      body: { ...form }
    });
    emit('booked', booking);
    form.senderName = '';
    form.receiverName = '';
    form.description = '';
    form.actualWeightKg = 10;
    form.lengthCm = 30;
    form.widthCm = 30;
    form.heightCm = 30;
    form.isDangerous = false;
    form.dgCategoryId = null;
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to create cargo booking.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VForm ref="formRef" @submit.prevent="submit">
    <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
      {{ serverError }}
    </VAlert>
    <VRow>
      <VCol cols="12" md="4">
        <VAutocomplete
          v-model="originStationId"
          :items="originOptions"
          item-title="title"
          item-value="id"
          label="Origin"
          :loading="pending"
          :rules="[required('Origin')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="4">
        <VAutocomplete
          v-model="destinationStationId"
          :disabled="!originStationId"
          :items="destinationOptions"
          item-title="title"
          item-value="id"
          label="Destination"
          :rules="[required('Destination')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="4">
        <VAutocomplete
          v-model="form.flightOrderId"
          :disabled="!destinationStationId"
          :item-title="flightTitle"
          item-value="id"
          :items="flightOptions"
          label="Flight"
          :rules="[required('Flight')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="form.senderName"
          label="Sender"
          :rules="[required('Sender')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="6">
        <VTextField
          v-model="form.receiverName"
          label="Receiver"
          :rules="[required('Receiver')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12">
        <VTextField
          v-model="form.description"
          label="Cargo description"
          :rules="[required('Cargo description')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="6" md="3">
        <VTextField
          v-model.number="form.actualWeightKg"
          label="Actual weight"
          min="0.1"
          suffix="kg"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="6" md="3">
        <VTextField
          v-model.number="form.lengthCm"
          label="Length"
          min="1"
          suffix="cm"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="6" md="3">
        <VTextField
          v-model.number="form.widthCm"
          label="Width"
          min="1"
          suffix="cm"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="6" md="3">
        <VTextField
          v-model.number="form.heightCm"
          label="Height"
          min="1"
          suffix="cm"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="4">
        <VSwitch v-model="form.isDangerous" color="warning" label="Dangerous goods" />
      </VCol>
      <VCol cols="12" md="4">
        <DgCategorySelect
          v-model="form.dgCategoryId"
          :allow-create="false"
          :disabled="!form.isDangerous"
          label="DG category"
          :required="form.isDangerous"
        />
      </VCol>
      <VCol cols="12" md="4">
        <AgentSelect v-model="form.agentId" :allow-create="false" label="Cargo agent" />
      </VCol>
      <VCol cols="12" md="4">
        <VSelect
          v-model="form.paymentMethod"
          :items="['TRANSFER', 'CASH', 'CARD', 'QRIS']"
          label="Payment method"
          variant="outlined"
        />
      </VCol>
      <VCol v-if="selectedFlight" cols="12" md="8">
        <div class="border rounded-lg pa-4">
          <div class="d-flex flex-wrap justify-space-between ga-4">
            <div>
              <div class="text-sm text-text-secondary">Flight</div>
              <div class="font-weight-bold">{{ selectedFlight.flightNumber }}</div>
              <div class="text-sm">
                {{ selectedFlight.originCode }} -> {{ selectedFlight.destinationCode }} ·
                {{ formatTicketingDateTime(selectedFlight.scheduledDeparture) }}
              </div>
            </div>
            <div>
              <div class="text-sm text-text-secondary">Chargeable weight</div>
              <div class="font-weight-bold">{{ chargeableWeightKg }} kg</div>
              <div class="text-xs text-text-secondary">Volume {{ volumeWeightKg }} kg</div>
            </div>
            <div>
              <div class="text-sm text-text-secondary">Estimated tariff</div>
              <div class="text-xl font-weight-bold text-primary">
                {{ formatTicketingCurrency(totalTariff, selectedFlight.currencyCode) }}
              </div>
            </div>
          </div>
        </div>
      </VCol>
    </VRow>
    <div class="mt-5 d-flex justify-end">
      <VBtn
        color="primary"
        :loading="submitting"
        prepend-icon="mdi-package-variant-closed-plus"
        size="large"
        type="submit"
      >
        Register cargo
      </VBtn>
    </div>
  </VForm>
</template>
