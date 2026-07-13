<script setup lang="ts">
import type {
  PassengerRescheduleOptionDto,
  PassengerTicketDto
} from '#shared/features/ticketing/passenger';
import { formatTicketingDateTime } from '../formatters';

const props = defineProps<{
  modelValue: boolean;
  ticket: PassengerTicketDto | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  rescheduled: [ticket: PassengerTicketDto];
}>();

const options = ref<PassengerRescheduleOptionDto[]>([]);
const selectedFlightOrderId = ref('');
const selectedSeatNumber = ref('');
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const selectedFlight = computed(
  () => options.value.find((flight) => flight.flightOrderId === selectedFlightOrderId.value) ?? null
);
const flightItems = computed(() =>
  options.value.map((flight) => ({
    title: `${flight.flightNumber} | ${flight.originCode} -> ${flight.destinationCode} | ${formatTicketingDateTime(flight.scheduledDeparture)}`,
    value: flight.flightOrderId
  }))
);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.ticket) return;
    options.value = [];
    selectedFlightOrderId.value = '';
    selectedSeatNumber.value = '';
    errorMessage.value = '';
    loading.value = true;
    try {
      options.value = await fetchApi<PassengerRescheduleOptionDto[]>(
        `/api/ticketing/passenger-tickets/${props.ticket.id}/reschedule-options`
      );
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load flights.';
    } finally {
      loading.value = false;
    }
  }
);

watch(selectedFlightOrderId, () => {
  selectedSeatNumber.value = '';
});

async function submit() {
  if (!props.ticket || !selectedFlightOrderId.value || !selectedSeatNumber.value) return;
  submitting.value = true;
  errorMessage.value = '';
  try {
    const ticket = await fetchApi<PassengerTicketDto>(
      `/api/ticketing/passenger-tickets/${props.ticket.id}/reschedule`,
      {
        method: 'POST',
        body: {
          flightOrderId: selectedFlightOrderId.value,
          seatNumber: selectedSeatNumber.value
        }
      }
    );
    emit('rescheduled', ticket);
    emit('update:modelValue', false);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to reschedule ticket.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="680"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>Reschedule passenger ticket</VCardTitle>
      <VDivider />
      <VCardText>
        <p class="mb-4 text-text-secondary">
          {{ ticket?.id }} · {{ ticket?.passengerName }} · current seat {{ ticket?.seatNumber }}
        </p>
        <VAlert v-if="errorMessage" class="mb-4" color="error" variant="tonal">
          {{ errorMessage }}
        </VAlert>
        <VSkeletonLoader v-if="loading" type="list-item-two-line, list-item" />
        <template v-else>
          <VAlert v-if="options.length === 0" color="info" variant="tonal">
            No eligible replacement flight is currently available on this route.
          </VAlert>
          <template v-else>
            <VSelect
              v-model="selectedFlightOrderId"
              item-title="title"
              item-value="value"
              :items="flightItems"
              label="Replacement flight"
              variant="outlined"
            />
            <VSelect
              v-model="selectedSeatNumber"
              :disabled="!selectedFlight"
              :items="selectedFlight?.availableSeats ?? []"
              label="New seat"
              variant="outlined"
            />
          </template>
        </template>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn
          color="primary"
          :disabled="!selectedFlightOrderId || !selectedSeatNumber"
          :loading="submitting"
          prepend-icon="mdi-calendar-sync"
          @click="submit"
        >
          Confirm reschedule
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
