<script setup lang="ts">
import type { AgentDto } from '#shared/features/commercial/agents';
import type { PassengerTicketDto } from '#shared/features/ticketing/passenger';
import type { AvailableTicketingFlightDto } from '#shared/features/ticketing/sales';
import AgentSelect from '../../commercial/agents/AgentSelect.vue';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';
import SeatPicker from './SeatPicker.vue';

const emit = defineEmits<{ booked: [ticket: PassengerTicketDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const originStationId = ref<string | null>(null);
const destinationStationId = ref<string | null>(null);
const occupiedSeats = ref<string[]>([]);
const loadingSeats = ref(false);
const form = reactive({
  flightOrderId: null as string | null,
  passengerName: '',
  documentType: 'KTP' as 'KTP' | 'PASSPORT' | 'OTHER',
  documentNumber: '',
  seatNumber: '',
  passengerWeightKg: 70,
  baggageWeightKg: 0,
  loyaltyMemberId: '',
  agentId: null as string | null
});
const required = (label: string) => (value: unknown) => Boolean(value) || `${label} is required`;

const { data: flights, pending } = await useAsyncData(
  'ticketing-passenger-flights',
  () =>
    fetchApi<AvailableTicketingFlightDto[]>('/api/ticketing/available-flights', {
      query: { serviceType: 'PASSENGER' }
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
  () => form.flightOrderId,
  async (flightOrderId) => {
    form.seatNumber = '';
    occupiedSeats.value = [];
    if (!flightOrderId) return;
    loadingSeats.value = true;
    try {
      occupiedSeats.value = await fetchApi<string[]>(
        `/api/ticketing/flights/${flightOrderId}/occupied-seats`
      );
    } finally {
      loadingSeats.value = false;
    }
  }
);

async function submit() {
  const validation = await formRef.value?.validate();
  if (validation && !validation.valid) return;
  if (!form.flightOrderId || !form.seatNumber) {
    serverError.value = 'Select a flight and an available seat.';
    return;
  }
  submitting.value = true;
  serverError.value = '';
  try {
    const ticket = await fetchApi<PassengerTicketDto>('/api/ticketing/passenger-tickets', {
      method: 'POST',
      body: {
        ...form,
        loyaltyMemberId: form.loyaltyMemberId || null
      }
    });
    emit('booked', ticket);
    form.passengerName = '';
    form.documentNumber = '';
    form.seatNumber = '';
    form.baggageWeightKg = 0;
    form.loyaltyMemberId = '';
    occupiedSeats.value = [...occupiedSeats.value, ticket.seatNumber];
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to create ticket.';
  } finally {
    submitting.value = false;
  }
}

function agentCreated(record: AgentDto) {
  form.agentId = record.id;
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
          v-model="form.passengerName"
          label="Passenger name"
          :rules="[required('Passenger name')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="2">
        <VSelect
          v-model="form.documentType"
          :items="['KTP', 'PASSPORT', 'OTHER']"
          label="Document"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="4">
        <VTextField
          v-model="form.documentNumber"
          label="Document number"
          :rules="[required('Document number')]"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="3">
        <VTextField
          v-model.number="form.passengerWeightKg"
          label="Passenger weight"
          min="1"
          suffix="kg"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="3">
        <VTextField
          v-model.number="form.baggageWeightKg"
          label="Baggage weight"
          min="0"
          suffix="kg"
          type="number"
          variant="outlined"
        />
      </VCol>
      <VCol cols="12" md="3">
        <VTextField v-model="form.loyaltyMemberId" label="Loyalty member" variant="outlined" />
      </VCol>
      <VCol cols="12" md="3">
        <AgentSelect
          v-model="form.agentId"
          :allow-create="false"
          label="Booking agent"
          @created="agentCreated"
        />
      </VCol>
      <VCol v-if="selectedFlight" cols="12" md="6">
        <SeatPicker
          v-model="form.seatNumber"
          :capacity="selectedFlight.passengerCapacity"
          :loading="loadingSeats"
          :occupied-seats="occupiedSeats"
        />
      </VCol>
      <VCol v-if="selectedFlight" cols="12" md="6">
        <div class="border rounded-lg pa-4">
          <div class="text-sm text-text-secondary">Selected flight</div>
          <div class="mt-1 text-lg font-weight-bold">{{ selectedFlight.flightNumber }}</div>
          <div class="mt-1 text-sm">
            {{ selectedFlight.originCode }} -> {{ selectedFlight.destinationCode }}
          </div>
          <div class="mt-1 text-sm">
            {{ formatTicketingDateTime(selectedFlight.scheduledDeparture) }}
          </div>
          <VDivider class="my-3" />
          <div class="text-sm text-text-secondary">Fare</div>
          <div class="text-xl font-weight-bold text-primary">
            {{ formatTicketingCurrency(selectedFlight.baseRate, selectedFlight.currencyCode) }}
          </div>
        </div>
      </VCol>
    </VRow>
    <div class="mt-5 d-flex justify-end">
      <VBtn
        color="primary"
        :loading="submitting"
        prepend-icon="mdi-ticket-confirmation-outline"
        size="large"
        type="submit"
      >
        Book passenger
      </VBtn>
    </div>
  </VForm>
</template>
