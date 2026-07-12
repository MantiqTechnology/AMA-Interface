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
                      {{
                        getFlightNumber(ticket.flightOrderId)
                      }}
                    </VChip>
                  </td>
                  <td>{{ getFlightRouteLabel(ticket.flightOrderId) }}</td>
                  <td class="font-weight-bold text-center">{{ ticket.seatNumber }}</td>
                  <td>Rp {{ ticket.ticketPrice?.toLocaleString('id-ID') }}</td>
                  <td>
                    <VChip
                      size="small"
                      :color="ticket.paymentStatus === 'PAID' ? 'success' : 'warning'"
                      variant="elevated"
                    >
                      {{ ticket.paymentStatus }}
                    </VChip>
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
                    <VBtn
                      v-if="ticket.checkInStatus !== 'CHECKED_IN'"
                      size="small"
                      color="success"
                      prepend-icon="mdi-account-check"
                      :disabled="ticket.paymentStatus !== 'PAID'"
                      @click="handleCheckIn(ticket.id)"
                    >
                      Check-In
                    </VBtn>
                    <div v-else class="text-success text-caption d-flex align-center ga-1">
                      <VIcon size="small">mdi-check-decagram</VIcon> Boarded
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
  </VContainer>
</template>
