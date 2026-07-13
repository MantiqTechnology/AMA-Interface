<script setup lang="ts">
import type { CargoBookingDto } from '#shared/features/ticketing/cargo';
import type { PassengerTicketDto } from '#shared/features/ticketing/passenger';
import BookingLookup from './BookingLookup.vue';
import CargoBookingForm from './CargoBookingForm.vue';
import PassengerBookingForm from './PassengerBookingForm.vue';
import { downloadCargoWaybill, downloadPassengerTicket } from './ticketDocument';

const activeTab = ref<'passenger' | 'cargo' | 'lookup'>('passenger');
const successOpen = ref(false);
const passengerTicket = ref<PassengerTicketDto | null>(null);
const cargoBooking = ref<CargoBookingDto | null>(null);

function passengerBooked(ticket: PassengerTicketDto) {
  passengerTicket.value = ticket;
  cargoBooking.value = null;
  successOpen.value = true;
}
function cargoBooked(booking: CargoBookingDto) {
  cargoBooking.value = booking;
  passengerTicket.value = null;
  successOpen.value = true;
}
</script>

<template>
  <div class="ticketing-public-shell">
    <header class="ticketing-public-header">
      <div class="mx-auto d-flex h-100 max-w-7xl align-center px-4">
        <NuxtLink class="d-flex align-center ga-3 text-decoration-none" to="/ticketing/booking">
          <VImg
            alt="AMA logo"
            class="rounded"
            height="48"
            src="https://amapapua.com/files/ama-pt-logo-shaded4.png"
            width="68"
          />
          <div>
            <div class="font-weight-bold text-brand-primary">Associated Mission Aviation</div>
            <div class="text-xs text-text-secondary">Passenger & Cargo Booking</div>
          </div>
        </NuxtLink>
        <VSpacer />
        <VBtn prepend-icon="mdi-login" to="/" variant="text">Staff sign in</VBtn>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 py-md-10">
      <div class="mb-6 d-flex flex-column flex-md-row align-md-end justify-space-between ga-4">
        <div>
          <h1 class="text-h3 font-weight-bold text-brand-primary">Book a flight</h1>
          <p class="mt-2 text-text-secondary">
            Scheduled services across Papua for passengers and time-sensitive cargo.
          </p>
        </div>
        <VChip color="success" prepend-icon="mdi-shield-check-outline" variant="tonal">
          OCC manifest synchronized
        </VChip>
      </div>

      <VCard border>
        <VTabs v-model="activeTab" color="primary" show-arrows>
          <VTab prepend-icon="mdi-account-arrow-right-outline" value="passenger">Passenger</VTab>
          <VTab prepend-icon="mdi-package-variant-closed-plus" value="cargo">Cargo</VTab>
          <VTab prepend-icon="mdi-magnify" value="lookup">Check booking</VTab>
        </VTabs>
        <VDivider />
        <VCardText class="pa-4 pa-md-6">
          <VWindow v-model="activeTab">
            <VWindowItem value="passenger">
              <PassengerBookingForm @booked="passengerBooked" />
            </VWindowItem>
            <VWindowItem value="cargo">
              <CargoBookingForm @booked="cargoBooked" />
            </VWindowItem>
            <VWindowItem value="lookup">
              <BookingLookup />
            </VWindowItem>
          </VWindow>
        </VCardText>
      </VCard>

      <section class="ticketing-assurance-grid mt-6">
        <div class="border-s-lg border-primary ps-4">
          <div class="font-weight-bold">Live seat availability</div>
          <div class="text-sm text-text-secondary">
            Seat assignments are protected at database level.
          </div>
        </div>
        <div class="border-s-lg border-info ps-4">
          <div class="font-weight-bold">Operationally connected</div>
          <div class="text-sm text-text-secondary">
            Bookings update the corresponding OCC manifest.
          </div>
        </div>
        <div class="border-s-lg border-success ps-4">
          <div class="font-weight-bold">Server-calculated fares</div>
          <div class="text-sm text-text-secondary">
            Canonical route rates determine every total.
          </div>
        </div>
      </section>
    </main>

    <VDialog v-model="successOpen" max-width="520">
      <VCard>
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon color="success" icon="mdi-check-circle-outline" />
          Booking confirmed
        </VCardTitle>
        <VDivider />
        <VCardText>
          <p>Your booking reference is:</p>
          <div class="my-4 text-h4 font-weight-bold text-primary">
            {{ passengerTicket?.id || cargoBooking?.id }}
          </div>
          <p class="text-text-secondary">
            Use this reference to check status and complete payment.
          </p>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VBtn
            v-if="passengerTicket"
            prepend-icon="mdi-file-pdf-box"
            variant="tonal"
            @click="downloadPassengerTicket(passengerTicket)"
          >
            Ticket PDF
          </VBtn>
          <VBtn
            v-if="cargoBooking"
            prepend-icon="mdi-file-pdf-box"
            variant="tonal"
            @click="downloadCargoWaybill(cargoBooking)"
          >
            AWB PDF
          </VBtn>
          <VSpacer />
          <VBtn color="primary" @click="successOpen = false">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.ticketing-public-shell {
  min-height: 100vh;
  background: #f4f7f8;
}
.ticketing-public-header {
  height: 72px;
  border-bottom: 1px solid #dce3e7;
  background: #ffffff;
}
.ticketing-assurance-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 720px) {
  .ticketing-assurance-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
