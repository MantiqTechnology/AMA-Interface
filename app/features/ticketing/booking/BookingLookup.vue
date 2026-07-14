<script setup lang="ts">
import type { CargoBookingDto } from '#shared/features/ticketing/cargo';
import type { PassengerTicketDto } from '#shared/features/ticketing/passenger';
import type { TicketRefundRequestDto } from '#shared/features/ticketing/refunds';
import { formatTicketingCurrency, formatTicketingDateTime } from '../formatters';
import PassengerRescheduleDialog from '../passenger/PassengerRescheduleDialog.vue';
import { downloadCargoWaybill, downloadPassengerTicket } from './ticketDocument';

const mode = ref<'PASSENGER' | 'CARGO'>('PASSENGER');
const referenceNumber = ref('');
const passengerTicket = ref<PassengerTicketDto | null>(null);
const cargoBooking = ref<CargoBookingDto | null>(null);
const paymentMethod = ref<'CASH' | 'TRANSFER' | 'CARD' | 'QRIS'>('TRANSFER');
const loading = ref(false);
const paying = ref(false);
const errorMessage = ref('');
const refundOpen = ref(false);
const refundSubject = ref<'PASSENGER' | 'CARGO'>('PASSENGER');
const refundReason = ref('');
const refundSubmitting = ref(false);
const rescheduleOpen = ref(false);

const canRequestPassengerRefund = computed(
  () =>
    passengerTicket.value?.ticketStatus === 'ACTIVE' &&
    passengerTicket.value.paymentStatus === 'PAID' &&
    passengerTicket.value.checkInStatus === 'PENDING' &&
    !['REQUESTED', 'APPROVED'].includes(passengerTicket.value.refundRequest?.status ?? '')
);
const canRequestCargoRefund = computed(
  () =>
    cargoBooking.value?.paymentStatus === 'PAID' &&
    cargoBooking.value.status === 'BOOKED' &&
    !['REQUESTED', 'APPROVED'].includes(cargoBooking.value.refundRequest?.status ?? '')
);

watch(mode, () => {
  passengerTicket.value = null;
  cargoBooking.value = null;
  errorMessage.value = '';
});

async function lookup() {
  if (!referenceNumber.value.trim()) return;
  loading.value = true;
  errorMessage.value = '';
  passengerTicket.value = null;
  cargoBooking.value = null;
  try {
    if (mode.value === 'PASSENGER') {
      passengerTicket.value = await fetchApi<PassengerTicketDto>(
        `/api/ticketing/passenger-tickets/${encodeURIComponent(referenceNumber.value.trim())}`
      );
    } else {
      cargoBooking.value = await fetchApi<CargoBookingDto>(
        `/api/ticketing/cargo-bookings/${encodeURIComponent(referenceNumber.value.trim())}`
      );
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Booking was not found.';
  } finally {
    loading.value = false;
  }
}

async function pay() {
  paying.value = true;
  errorMessage.value = '';
  try {
    if (passengerTicket.value) {
      passengerTicket.value = await fetchApi<PassengerTicketDto>(
        `/api/ticketing/passenger-tickets/${passengerTicket.value.id}/payment`,
        { method: 'PATCH', body: { paymentMethod: paymentMethod.value } }
      );
    }
    if (cargoBooking.value) {
      cargoBooking.value = await fetchApi<CargoBookingDto>(
        `/api/ticketing/cargo-bookings/${cargoBooking.value.id}/payment`,
        { method: 'PATCH', body: { paymentMethod: paymentMethod.value } }
      );
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Payment failed.';
  } finally {
    paying.value = false;
  }
}

function openRefund(subject: 'PASSENGER' | 'CARGO') {
  refundSubject.value = subject;
  refundReason.value = '';
  errorMessage.value = '';
  refundOpen.value = true;
}

async function requestRefund() {
  const id =
    refundSubject.value === 'PASSENGER' ? passengerTicket.value?.id : cargoBooking.value?.id;
  if (!id || refundReason.value.trim().length < 10) return;
  refundSubmitting.value = true;
  errorMessage.value = '';
  try {
    const resource = refundSubject.value === 'PASSENGER' ? 'passenger-tickets' : 'cargo-bookings';
    await fetchApi<TicketRefundRequestDto>(`/api/ticketing/${resource}/${id}/refund-request`, {
      method: 'POST',
      body: { reason: refundReason.value }
    });
    refundOpen.value = false;
    await lookup();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to submit refund request.';
  } finally {
    refundSubmitting.value = false;
  }
}

function onRescheduled(ticket: PassengerTicketDto) {
  passengerTicket.value = ticket;
}
</script>

<template>
  <div>
    <VBtnToggle v-model="mode" class="mb-5" color="primary" divided mandatory variant="outlined">
      <VBtn value="PASSENGER" prepend-icon="mdi-ticket-confirmation-outline">Ticket</VBtn>
      <VBtn value="CARGO" prepend-icon="mdi-package-variant">Cargo AWB</VBtn>
    </VBtnToggle>
    <div class="d-flex flex-column flex-sm-row ga-3">
      <VTextField
        v-model="referenceNumber"
        hide-details
        :label="mode === 'PASSENGER' ? 'Ticket number' : 'AWB number'"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @keyup.enter="lookup"
      />
      <VBtn color="primary" :loading="loading" min-width="128" size="large" @click="lookup">
        Find booking
      </VBtn>
    </div>
    <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
      {{ errorMessage }}
    </VAlert>

    <div v-if="passengerTicket" class="mt-6 border rounded-lg pa-5">
      <div class="d-flex flex-wrap align-start justify-space-between ga-4">
        <div>
          <div class="text-sm text-text-secondary">Passenger ticket</div>
          <h2 class="text-h5 font-weight-bold">{{ passengerTicket.id }}</h2>
          <div class="mt-1">{{ passengerTicket.passengerName }}</div>
        </div>
        <div class="d-flex ga-2">
          <VChip :color="passengerTicket.paymentStatus === 'PAID' ? 'success' : 'warning'">
            {{ passengerTicket.paymentStatus }}
          </VChip>
          <VChip :color="passengerTicket.checkInStatus === 'CHECKED_IN' ? 'info' : undefined">
            {{ passengerTicket.checkInStatus }}
          </VChip>
          <VChip
            v-if="passengerTicket.refundRequest"
            :color="passengerTicket.refundRequest.status === 'REJECTED' ? 'error' : 'warning'"
          >
            REFUND {{ passengerTicket.refundRequest.status }}
          </VChip>
        </div>
      </div>
      <VAlert
        v-if="passengerTicket.refundRequest"
        class="mt-4"
        :color="passengerTicket.refundRequest.status === 'REJECTED' ? 'error' : 'info'"
        variant="tonal"
      >
        Refund {{ passengerTicket.refundRequest.status.toLowerCase() }}:
        {{ passengerTicket.refundRequest.reason }}
      </VAlert>
      <VRow class="mt-3">
        <VCol cols="6" md="3"><strong>Flight</strong><br>{{ passengerTicket.flightNumber }}</VCol>
        <VCol cols="6" md="3">
          <strong>Route</strong><br>{{ passengerTicket.originCode }} ->
          {{ passengerTicket.destinationCode }}
        </VCol>
        <VCol cols="6" md="3">
          <strong>Departure</strong><br>{{
            formatTicketingDateTime(passengerTicket.scheduledDeparture)
          }}
        </VCol>
        <VCol cols="6" md="3"><strong>Seat</strong><br>{{ passengerTicket.seatNumber }}</VCol>
      </VRow>
      <VDivider class="my-4" />
      <div class="d-flex flex-wrap align-center justify-space-between ga-4">
        <div class="text-xl font-weight-bold">
          {{ formatTicketingCurrency(passengerTicket.totalAmount, passengerTicket.currencyCode) }}
          <div class="text-xs font-weight-regular text-text-secondary">
            Base
            {{ formatTicketingCurrency(passengerTicket.ticketPrice, passengerTicket.currencyCode) }}
            · {{ passengerTicket.taxCode || 'No tax code' }}
            {{ formatTicketingCurrency(passengerTicket.taxAmount, passengerTicket.currencyCode) }}
          </div>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <VSelect
            v-if="passengerTicket.paymentStatus === 'UNPAID'"
            v-model="paymentMethod"
            density="compact"
            hide-details
            :items="['TRANSFER', 'CASH', 'CARD', 'QRIS']"
            label="Payment method"
            min-width="180"
            variant="outlined"
          />
          <VBtn
            v-if="passengerTicket.paymentStatus === 'UNPAID'"
            color="success"
            :loading="paying"
            prepend-icon="mdi-credit-card-check-outline"
            @click="pay"
          >
            Pay
          </VBtn>
          <VBtn
            v-if="canRequestPassengerRefund"
            prepend-icon="mdi-cash-refund"
            variant="tonal"
            @click="openRefund('PASSENGER')"
          >
            Request refund
          </VBtn>
          <VBtn
            v-if="canRequestPassengerRefund"
            prepend-icon="mdi-calendar-sync"
            variant="tonal"
            @click="rescheduleOpen = true"
          >
            Reschedule
          </VBtn>
          <VBtn
            prepend-icon="mdi-file-pdf-box"
            variant="tonal"
            @click="downloadPassengerTicket(passengerTicket)"
          >
            PDF
          </VBtn>
        </div>
      </div>
    </div>

    <div v-if="cargoBooking" class="mt-6 border rounded-lg pa-5">
      <div class="d-flex flex-wrap align-start justify-space-between ga-4">
        <div>
          <div class="text-sm text-text-secondary">Cargo air waybill</div>
          <h2 class="text-h5 font-weight-bold">{{ cargoBooking.id }}</h2>
          <div class="mt-1">{{ cargoBooking.senderName }} -> {{ cargoBooking.receiverName }}</div>
        </div>
        <div class="d-flex ga-2">
          <VChip :color="cargoBooking.paymentStatus === 'PAID' ? 'success' : 'warning'">
            {{ cargoBooking.paymentStatus }}
          </VChip>
          <VChip :color="cargoBooking.status === 'DELIVERED' ? 'success' : 'info'">
            {{ cargoBooking.status }}
          </VChip>
          <VChip
            v-if="cargoBooking.refundRequest"
            :color="cargoBooking.refundRequest.status === 'REJECTED' ? 'error' : 'warning'"
          >
            REFUND {{ cargoBooking.refundRequest.status }}
          </VChip>
        </div>
      </div>
      <VAlert
        v-if="cargoBooking.refundRequest"
        class="mt-4"
        :color="cargoBooking.refundRequest.status === 'REJECTED' ? 'error' : 'info'"
        variant="tonal"
      >
        Refund {{ cargoBooking.refundRequest.status.toLowerCase() }}:
        {{ cargoBooking.refundRequest.reason }}
      </VAlert>
      <VRow class="mt-3">
        <VCol cols="6" md="3"><strong>Flight</strong><br>{{ cargoBooking.flightNumber }}</VCol>
        <VCol cols="6" md="3">
          <strong>Route</strong><br>{{ cargoBooking.originCode }} ->
          {{ cargoBooking.destinationCode }}
        </VCol>
        <VCol cols="6" md="3">
          <strong>Weight</strong><br>{{ cargoBooking.chargeableWeightKg }} kg
        </VCol>
        <VCol cols="6" md="3">
          <strong>DG</strong><br>{{ cargoBooking.dgCategoryCode || 'No' }}
        </VCol>
      </VRow>
      <VDivider class="my-4" />
      <div class="d-flex flex-wrap align-center justify-space-between ga-4">
        <div class="text-xl font-weight-bold">
          {{ formatTicketingCurrency(cargoBooking.totalAmount, cargoBooking.currencyCode) }}
          <div class="text-xs font-weight-regular text-text-secondary">
            Base
            {{ formatTicketingCurrency(cargoBooking.totalTariff, cargoBooking.currencyCode) }} ·
            {{ cargoBooking.taxCode || 'No tax code' }}
            {{ formatTicketingCurrency(cargoBooking.taxAmount, cargoBooking.currencyCode) }}
          </div>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <VSelect
            v-if="cargoBooking.paymentStatus === 'UNPAID'"
            v-model="paymentMethod"
            density="compact"
            hide-details
            :items="['TRANSFER', 'CASH', 'CARD', 'QRIS']"
            label="Payment method"
            min-width="180"
            variant="outlined"
          />
          <VBtn
            v-if="cargoBooking.paymentStatus === 'UNPAID'"
            color="success"
            :loading="paying"
            prepend-icon="mdi-credit-card-check-outline"
            @click="pay"
          >
            Pay
          </VBtn>
          <VBtn
            v-if="canRequestCargoRefund"
            prepend-icon="mdi-cash-refund"
            variant="tonal"
            @click="openRefund('CARGO')"
          >
            Request refund
          </VBtn>
          <VBtn
            prepend-icon="mdi-file-pdf-box"
            variant="tonal"
            @click="downloadCargoWaybill(cargoBooking)"
          >
            PDF
          </VBtn>
        </div>
      </div>
    </div>

    <VDialog v-model="refundOpen" max-width="580">
      <VCard>
        <VCardTitle>
          Request {{ refundSubject === 'PASSENGER' ? 'ticket' : 'cargo' }} refund
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VTextarea
            v-model="refundReason"
            counter="500"
            label="Reason for refund"
            :rules="[
              (value: string) => value.trim().length >= 10 || 'Enter at least 10 characters.'
            ]"
            variant="outlined"
          />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="refundOpen = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="refundReason.trim().length < 10"
            :loading="refundSubmitting"
            prepend-icon="mdi-send-outline"
            @click="requestRefund"
          >
            Submit request
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <PassengerRescheduleDialog
      v-model="rescheduleOpen"
      :ticket="passengerTicket"
      @rescheduled="onRescheduled"
    />
  </div>
</template>
