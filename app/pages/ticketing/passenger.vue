<script setup lang="ts">
const store = useAmaDemoStore();
const { can } = useAuthorization();

// Search and manual check-in UI State
const searchTicketId = ref('');
const checkInError = ref('');
const checkInSuccess = ref('');
const isCheckingIn = ref(false);

// Load tickets directly from the API
const { data: ticketsData, refresh: refreshTickets } = await useAsyncData(
  'passenger-tickets-list',
  () => fetchApi<any[]>('/api/ticketing/tickets')
);

// Active flights for manifest reference
const { data: flightsData } = await useAsyncData('mgmt-flights-list', () =>
  fetchApi<any[]>('/api/flights')
);

const tickets = computed(() => ticketsData.value || []);
const flights = computed(() => flightsData.value || []);

// Helper to get Flight details
function getFlightNumber(flightOrderId: string) {
  const flight = flights.value.find((f: any) => f.id === flightOrderId);
  return flight ? flight.flightNumber : flightOrderId;
}

function getFlightRouteLabel(flightOrderId: string) {
  const flight = flights.value.find((f: any) => f.id === flightOrderId);
  if (!flight || !flight.route) return '-';
  return `${flight.route.origin?.code || '?'} → ${flight.route.destination?.code || '?'}`;
}

// Quick check-in action
async function handleCheckIn(ticketId: string) {
  if (!ticketId) return;
  isCheckingIn.value = true;
  checkInError.value = '';
  checkInSuccess.value = '';

  try {
    const res = await store.checkInPassenger(ticketId);
    if (res && res.success) {
      checkInSuccess.value = `Penumpang ${res.ticket.passengerName} (Kursi ${res.ticket.seatNumber}) berhasil check-in!`;
      searchTicketId.value = '';
      pushToast({
        type: 'success',
        title: 'Check-In Sukses',
        message: 'Penumpang masuk manifest!'
      });
      // Refresh ticket list
      await refreshTickets();
    }
  } catch (e: any) {
    checkInError.value = e.data?.message || 'Gagal melakukan check-in tiket.';
  } finally {
    isCheckingIn.value = false;
  }
}

// Refund Dialog States
const refundDialog = ref(false);
const selectedTicketForRefund = ref<any>(null);
const isRefunding = ref(false);

// Reschedule Dialog States
const rescheduleDialog = ref(false);
const selectedTicketForReschedule = ref<any>(null);
const targetFlightId = ref('');
const targetSeat = ref('');
const isRescheduling = ref(false);

const occupiedSeatsForTargetFlight = ref<string[]>([]);
const isLoadingOccupiedSeats = ref(false);

// Seats configuration for Cessna Caravan (12 seats)
const caravanSeats = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

// Get alternative flights for the same route
const alternativeFlights = computed(() => {
  if (!selectedTicketForReschedule.value) return [];
  const currentTicket = selectedTicketForReschedule.value;
  const currentFlight = flights.value.find((f: any) => f.id === currentTicket.flightOrderId);
  if (!currentFlight || !currentFlight.route) return [];

  return flights.value.filter(
    (f: any) =>
      f.route?.id === currentFlight.route.id &&
      f.id !== currentFlight.id &&
      ['scheduled', 'ready'].includes(f.status)
  );
});

// Watch flight selection in reschedule dialog to fetch occupied seats
watch(targetFlightId, async (newVal) => {
  targetSeat.value = '';
  if (!newVal) {
    occupiedSeatsForTargetFlight.value = [];
    return;
  }
  isLoadingOccupiedSeats.value = true;
  try {
    const res = await fetchApi<string[]>(`/api/ticketing/occupied-seats?flightOrderId=${newVal}`);
    occupiedSeatsForTargetFlight.value = res || [];
  } catch (e) {
    console.error('Error fetching occupied seats for reschedule:', e);
    occupiedSeatsForTargetFlight.value = [];
  } finally {
    isLoadingOccupiedSeats.value = false;
  }
});

function openRefundDialog(ticket: any) {
  selectedTicketForRefund.value = ticket;
  refundDialog.value = true;
}

async function handleRefund() {
  if (!selectedTicketForRefund.value) return;
  isRefunding.value = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/refund-ticket', {
      method: 'POST',
      body: { ticketId: selectedTicketForRefund.value.id }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Refund Berhasil',
        message: `Tiket ${selectedTicketForRefund.value.id} telah direfund dan kursi ${selectedTicketForRefund.value.seatNumber} dibebaskan.`
      });
      refundDialog.value = false;
      await refreshTickets();
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Refund Gagal',
      message: e.data?.message || 'Terjadi kesalahan saat refund.'
    });
  } finally {
    isRefunding.value = false;
  }
}

async function handleRejectRefund(ticketId: string) {
  if (!ticketId) return;
  if (
    !confirm(
      'Apakah Anda yakin ingin menolak permintaan refund ini? Status pembayaran akan dikembalikan menjadi PAID.'
    )
  )
    return;

  try {
    const res = await fetchApi<any>('/api/ticketing/reject-refund', {
      method: 'POST',
      body: { type: 'ticket', id: ticketId }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Refund Ditolak',
        message: 'Permintaan refund telah ditolak dan tiket dikembalikan ke status PAID.'
      });
      await refreshTickets();
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Gagal Memproses',
      message: e.data?.message || 'Terjadi kesalahan saat memproses penolakan.'
    });
  }
}

function openRescheduleDialog(ticket: any) {
  selectedTicketForReschedule.value = ticket;
  targetFlightId.value = '';
  targetSeat.value = '';
  rescheduleDialog.value = true;
}

async function handleReschedule() {
  if (!selectedTicketForReschedule.value || !targetFlightId.value || !targetSeat.value) return;
  isRescheduling.value = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/reschedule-ticket', {
      method: 'POST',
      body: {
        ticketId: selectedTicketForReschedule.value.id,
        newFlightOrderId: targetFlightId.value,
        newSeatNumber: targetSeat.value
      }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Reschedule Berhasil',
        message: `Tiket berhasil dipindahkan ke penerbangan baru dengan kursi ${targetSeat.value}.`
      });
      rescheduleDialog.value = false;
      await refreshTickets();
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Reschedule Gagal',
      message: e.data?.message || 'Terjadi kesalahan saat reschedule.'
    });
  } finally {
    isRescheduling.value = false;
  }
}

const { pushToast } = useDemoToasts();
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="!can('booking.read').allowed">
      <VAlert type="error" variant="tonal" class="rounded-lg mb-3">
        Akses Ditolak: Anda tidak memiliki izin untuk melihat data manifes penumpang (booking.read).
      </VAlert>
    </div>
    <div v-else>
      <!-- Page Header -->
      <div class="mb-5 d-flex flex-wrap align-end justify-space-between ga-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-text-primary">Manajemen Tiket Penumpang</h1>
          <p class="text-text-muted">
            Daftar manifest tiket penumpang perintis komersial, pencatatan check-in cepat, dan
            integrasi manifest penerbangan.
          </p>
        </div>
        <div class="d-flex ga-2">
          <VBtn color="primary" prepend-icon="mdi-refresh" @click="refreshTickets">
            Refresh Data
          </VBtn>
        </div>
      </div>

      <!-- Quick Check-In Section -->
      <VCard border class="mb-5 pa-4" rounded="lg">
        <VCardTitle class="text-primary font-weight-bold pa-0 mb-3 text-subtitle-1">
          <VIcon start color="primary">mdi-account-check-outline</VIcon>
          Check-In Cepat Penumpang (Quick Check-In)
        </VCardTitle>
        <VCardText class="pa-0">
          <div class="d-flex flex-wrap ga-3">
            <div class="d-flex ga-2 align-center flex-grow-1" style="max-width: 500px">
              <VTextField
                v-model="searchTicketId"
                label="Masukkan ID Tiket (TKT-XXXXXX atau mn-XXX-X)"
                variant="outlined"
                density="comfortable"
                hide-details
              />
              <VBtn
                color="success"
                prepend-icon="mdi-check"
                height="48"
                :loading="isCheckingIn"
                :disabled="!searchTicketId.trim()"
                @click="handleCheckIn(searchTicketId.trim())"
              >
                Check-In
              </VBtn>
            </div>
          </div>
          <VAlert v-if="checkInError" type="error" variant="tonal" class="rounded-lg mt-3 py-2">
            {{ checkInError }}
          </VAlert>
          <VAlert v-if="checkInSuccess" type="success" variant="tonal" class="rounded-lg mt-3 py-2">
            {{ checkInSuccess }}
          </VAlert>
        </VCardText>
      </VCard>

      <!-- Tickets Manifest Table -->
      <VRow>
        <VCol cols="12">
          <VCard border rounded="lg">
            <VCardTitle class="d-flex justify-space-between align-center px-4 py-3">
              <span class="text-subtitle-1 font-weight-bold text-primary">Manifest Tiket Terdaftar (SQLite Server)</span>
              <span class="text-caption text-grey">Total Tiket: {{ tickets.length }}</span>
            </VCardTitle>

            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>ID TIKET</th>
                  <th>NAMA PENUMPANG</th>
                  <th>IDENTITAS</th>
                  <th>PENERBANGAN</th>
                  <th>RUTE</th>
                  <th>KURSI</th>
                  <th>HARGA</th>
                  <th>PEMBAYARAN</th>
                  <th>STATUS</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ticket in tickets" :key="ticket.id">
                  <td class="font-weight-bold text-primary">{{ ticket.id }}</td>
                  <td>{{ ticket.passengerName }}</td>
                  <td>{{ ticket.documentNumber }}</td>
                  <td>
                    <VChip size="small" variant="tonal">
                      {{ getFlightNumber(ticket.flightOrderId) }}
                    </VChip>
                  </td>
                  <td>{{ getFlightRouteLabel(ticket.flightOrderId) }}</td>
                  <td class="font-weight-bold text-center">{{ ticket.seatNumber }}</td>
                  <td>Rp {{ ticket.ticketPrice?.toLocaleString('id-ID') }}</td>
                  <td>
                    <VChip
                      size="small"
                      :color="
                        ticket.paymentStatus === 'PAID'
                          ? 'success'
                          : ticket.paymentStatus === 'REFUND_REQUESTED'
                            ? 'warning'
                            : ticket.paymentStatus === 'REFUNDED'
                              ? 'error'
                              : 'default'
                      "
                      variant="elevated"
                    >
                      {{ ticket.paymentStatus }}
                    </VChip>
                    <div
                      v-if="ticket.paymentStatus === 'REFUND_REQUESTED' && ticket.refundReason"
                      class="text-caption text-grey mt-1"
                      style="max-width: 150px; line-height: 1.2"
                    >
                      Reason: "{{ ticket.refundReason }}"
                    </div>
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="ticket.checkInStatus === 'CHECKED_IN' ? 'success' : 'default'"
                    >
                      {{ ticket.checkInStatus }}
                    </VChip>
                  </td>
                  <td>
                    <div class="d-flex ga-2 align-center">
                      <!-- Normal paid ticket flow: Check-In, Reschedule, Refund Request -->
                      <VBtn
                        v-if="
                          ticket.checkInStatus !== 'CHECKED_IN' && ticket.paymentStatus === 'PAID'
                        "
                        size="small"
                        color="success"
                        prepend-icon="mdi-account-check"
                        @click="handleCheckIn(ticket.id)"
                      >
                        Check-In
                      </VBtn>

                      <VBtn
                        v-if="
                          ticket.paymentStatus === 'PAID' && ticket.checkInStatus !== 'CHECKED_IN'
                        "
                        size="small"
                        color="warning"
                        variant="outlined"
                        prepend-icon="mdi-calendar-edit"
                        @click="openRescheduleDialog(ticket)"
                      >
                        Reschedule
                      </VBtn>

                      <VBtn
                        v-if="
                          ticket.paymentStatus === 'PAID' && ticket.checkInStatus !== 'CHECKED_IN'
                        "
                        size="small"
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-cash-refund"
                        @click="openRefundDialog(ticket)"
                      >
                        Refund
                      </VBtn>

                      <!-- Admin handling of REFUND_REQUESTED status -->
                      <VBtn
                        v-if="ticket.paymentStatus === 'REFUND_REQUESTED'"
                        size="small"
                        color="success"
                        prepend-icon="mdi-check"
                        @click="openRefundDialog(ticket)"
                      >
                        Approve Refund
                      </VBtn>

                      <VBtn
                        v-if="ticket.paymentStatus === 'REFUND_REQUESTED'"
                        size="small"
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-close"
                        @click="handleRejectRefund(ticket.id)"
                      >
                        Reject
                      </VBtn>

                      <!-- Terminal display status -->
                      <div
                        v-else-if="ticket.checkInStatus === 'CHECKED_IN'"
                        class="text-success text-caption d-flex align-center ga-1"
                      >
                        <VIcon size="small">mdi-check-decagram</VIcon> Boarded
                      </div>

                      <div
                        v-if="ticket.paymentStatus === 'REFUNDED'"
                        class="text-error text-caption d-flex align-center ga-1"
                      >
                        <VIcon size="small" color="error">mdi-cancel</VIcon> Refunded
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="tickets.length === 0">
                  <td colspan="10" class="text-center text-grey py-8">
                    Belum ada manifest tiket penumpang yang didaftarkan.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- REFUND DIALOG -->
    <VDialog v-model="refundDialog" max-width="450">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-error font-weight-bold border-b pb-2">
          Refund Tiket Penumpang
        </VCardTitle>
        <VCardText v-if="selectedTicketForRefund" class="pt-4">
          Apakah Anda yakin ingin membatalkan (refund) tiket untuk
          <strong>{{ selectedTicketForRefund.passengerName }}</strong>?
          <div class="mt-3 text-caption text-grey">
            - Tiket (ID: {{ selectedTicketForRefund.id }}) akan ditandai REFUNDED.<br>
            - Kursi <strong>{{ selectedTicketForRefund.seatNumber }}</strong> akan dibebaskan
            kembali.<br>
            - Pembukuan otomatis akan mencatat pengeluaran pengembalian dana.
          </div>
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="refundDialog = false">Batal</VBtn>
          <VBtn color="error" :loading="isRefunding" @click="handleRefund">Confirm Refund</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- RESCHEDULE DIALOG -->
    <VDialog v-model="rescheduleDialog" max-width="500">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-warning font-weight-bold border-b pb-2">
          Reschedule Penerbangan
        </VCardTitle>
        <VCardText v-if="selectedTicketForReschedule" class="pt-4">
          <div class="mb-4">
            Reschedule tiket untuk: <strong>{{ selectedTicketForReschedule.passengerName }}</strong><br>
            Penerbangan saat ini:
            <strong>{{ getFlightNumber(selectedTicketForReschedule.flightOrderId) }}</strong>
            (Kursi: {{ selectedTicketForReschedule.seatNumber }})
          </div>

          <!-- Select New Flight -->
          <VSelect
            v-model="targetFlightId"
            :items="alternativeFlights"
            item-title="flightNumber"
            item-value="id"
            label="Pilih Penerbangan Alternatif (Rute Sama)"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            no-data-text="Tidak ada penerbangan alternatif dengan rute ini"
          />

          <!-- Select New Seat -->
          <div v-if="targetFlightId">
            <div class="text-subtitle-2 font-weight-bold mb-2">Pilih Kursi Baru:</div>
            <div class="d-grid ga-2" style="display: grid; grid-template-columns: repeat(4, 1fr)">
              <VBtn
                v-for="seat in caravanSeats"
                :key="seat"
                size="small"
                :color="targetSeat === seat ? 'warning' : 'default'"
                :disabled="occupiedSeatsForTargetFlight.includes(seat)"
                variant="outlined"
                @click="targetSeat = seat"
              >
                {{ seat }}
              </VBtn>
            </div>
            <div v-if="isLoadingOccupiedSeats" class="text-caption text-grey mt-2 text-center">
              Memuat status kursi...
            </div>
          </div>
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="rescheduleDialog = false">Batal</VBtn>
          <VBtn
            color="warning"
            :disabled="!targetFlightId || !targetSeat"
            :loading="isRescheduling"
            @click="handleReschedule"
          >
            Confirm Reschedule
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
