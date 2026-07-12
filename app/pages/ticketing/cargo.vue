<script setup lang="ts">
const { can } = useAuthorization();

// Dialogs
const podDialog = ref(false);
const selectedAwbForPod = ref<any>(null);
const podRecipient = ref('');

// Active flights reference
const { data: flightsData } = await useAsyncData('cargo-flights-list', () =>
  fetchApi<any[]>('/api/flights')
);
const flights = computed(() => flightsData.value || []);

// Load cargo bookings directly from the API
const { data: cargosData, refresh: refreshCargos } = await useAsyncData('cargo-bookings-list', () =>
  fetchApi<any[]>('/api/ticketing/cargo-bookings')
);

const cargos = computed(() => cargosData.value || []);

// Helpers
function getFlightNumber(flightOrderId: string) {
  const flight = flights.value.find((f: any) => f.id === flightOrderId);
  return flight ? flight.flightNumber : '-';
}

function getFlightRouteLabel(flightOrderId: string) {
  const flight = flights.value.find((f: any) => f.id === flightOrderId);
  if (!flight || !flight.route) return '-';
  return `${flight.route.origin?.code} -> ${flight.route.destination?.code}`;
}

// Proof of Delivery Flow
function openPod(awb: any) {
  selectedAwbForPod.value = awb;
  podRecipient.value = '';
  podDialog.value = true;
}

async function confirmPod() {
  if (!selectedAwbForPod.value || !podRecipient.value.trim()) return;
  // Update status to DELIVERED
  try {
    // In mock-up we can fetch a POST route or simply update
    pushToast({
      type: 'success',
      title: 'POD Diserahkan',
      message: `Kargo AWB ${selectedAwbForPod.value.id} berhasil diserahkan kepada ${podRecipient.value}`
    });
    podDialog.value = false;
    await refreshCargos();
  } catch (e) {
    console.error(e);
  }
}

const isCancellingCargo = ref(false);

async function handleCancelCargo(cargoId: string) {
  if (!cargoId) return;
  if (!confirm(`Apakah Anda yakin ingin membatalkan & merefund kargo AWB ${cargoId}?`)) return;

  isCancellingCargo.value = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/refund-cargo', {
      method: 'POST',
      body: { cargoId }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Kargo Dibatalkan',
        message: `Kargo AWB ${cargoId} berhasil dibatalkan dan direfund.`
      });
      await refreshCargos();
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Pembatalan Gagal',
      message: e.data?.message || 'Gagal membatalkan kargo.'
    });
  } finally {
    isCancellingCargo.value = false;
  }
}

async function handleRejectRefundCargo(cargoId: string) {
  if (!cargoId) return;
  if (
    !confirm(
      'Apakah Anda yakin ingin menolak permintaan refund kargo ini? Status pembayaran akan dikembalikan menjadi PAID.'
    )
  )
    return;

  try {
    const res = await fetchApi<any>('/api/ticketing/reject-refund', {
      method: 'POST',
      body: { type: 'cargo', id: cargoId }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Refund Kargo Ditolak',
        message: 'Permintaan refund kargo telah ditolak.'
      });
      await refreshCargos();
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Gagal Memproses',
      message: e.data?.message || 'Terjadi kesalahan saat memproses penolakan.'
    });
  }
}

const { pushToast } = useDemoToasts();
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="!can('booking.read').allowed">
      <VAlert type="error" variant="tonal" class="rounded-lg mb-3">
        Akses Ditolak: Anda tidak memiliki izin untuk melihat modul kargo (booking.read).
      </VAlert>
    </div>
    <div v-else>
      <!-- Page Header -->
      <div class="mb-5 d-flex flex-wrap align-end justify-space-between ga-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-text-primary">Manajemen Kargo Udara (AWB)</h1>
          <p class="text-text-muted">
            Pelacakan status AWB kargo perintis, inspeksi berkala Dangerous Goods (DG), dan
            penyelesaian Proof of Delivery (POD).
          </p>
        </div>
        <div class="d-flex ga-2">
          <VBtn color="primary" prepend-icon="mdi-refresh" @click="refreshCargos">
            Refresh Data
          </VBtn>
        </div>
      </div>

      <!-- Cargo List -->
      <VRow>
        <VCol cols="12">
          <VCard border rounded="lg">
            <VCardTitle class="d-flex justify-space-between align-center px-4 py-3">
              <span class="text-subtitle-1 font-weight-bold text-primary">Manifest Kargo Udara B2B (SQLite Server)</span>
              <span class="text-caption text-grey">Total AWB: {{ cargos.length }}</span>
            </VCardTitle>

            <VTable class="w-full">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th>NOMOR AWB</th>
                  <th>PENGIRIM</th>
                  <th>PENERIMA</th>
                  <th>PENERBANGAN</th>
                  <th>RUTE</th>
                  <th>BERAT</th>
                  <th>DIMENSI (P x L x T)</th>
                  <th>DG</th>
                  <th>TARIF</th>
                  <th>PEMBAYARAN</th>
                  <th>AKSI / POD</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cargo in cargos" :key="cargo.id">
                  <td class="font-weight-bold text-secondary">{{ cargo.id }}</td>
                  <td>{{ cargo.senderName }}</td>
                  <td>{{ cargo.receiverName }}</td>
                  <td>
                    <VChip size="small" variant="tonal">
                      {{ getFlightNumber(cargo.flightOrderId) }}
                    </VChip>
                  </td>
                  <td>{{ getFlightRouteLabel(cargo.flightOrderId) }}</td>
                  <td class="font-weight-bold">{{ cargo.actualWeightKg }} Kg</td>
                  <td>{{ cargo.lengthCm }}x{{ cargo.widthCm }}x{{ cargo.heightCm }} cm</td>
                  <td>
                    <VChip v-if="cargo.isDangerous" size="small" color="warning" variant="elevated">
                      DG - {{ cargo.dgClass }}
                    </VChip>
                    <span v-else class="text-grey-lighten-1">-</span>
                  </td>
                  <td>Rp {{ cargo.totalTariff?.toLocaleString('id-ID') }}</td>
                  <td>
                    <VChip
                      size="small"
                      :color="
                        cargo.paymentStatus === 'PAID'
                          ? 'success'
                          : cargo.paymentStatus === 'REFUND_REQUESTED'
                            ? 'warning'
                            : cargo.paymentStatus === 'REFUNDED'
                              ? 'error'
                              : 'default'
                      "
                      variant="elevated"
                    >
                      {{ cargo.paymentStatus }}
                    </VChip>
                    <div
                      v-if="
                        cargo.paymentStatus === 'REFUND_REQUESTED' &&
                          cargo.status.startsWith('REFUND_REQUESTED:')
                      "
                      class="text-caption text-grey mt-1"
                      style="max-width: 150px; line-height: 1.2"
                    >
                      Reason: "{{ cargo.status.replace('REFUND_REQUESTED: ', '') }}"
                    </div>
                  </td>
                  <td>
                    <div class="d-flex ga-2 align-center">
                      <!-- Normal paid cargo flow: POD and Request/Direct Cancel -->
                      <VBtn
                        v-if="
                          cargo.status !== 'DELIVERED' &&
                            !cargo.status.startsWith('REFUND_REQUESTED') &&
                            cargo.status !== 'CANCELLED'
                        "
                        size="small"
                        color="primary"
                        prepend-icon="mdi-truck-delivery"
                        :disabled="cargo.paymentStatus !== 'PAID'"
                        @click="openPod(cargo)"
                      >
                        Selesaikan POD
                      </VBtn>
                      <div
                        v-else-if="cargo.status === 'DELIVERED'"
                        class="text-success text-caption d-flex align-center ga-1"
                      >
                        <VIcon size="small">mdi-check-decagram</VIcon> Terkirim
                      </div>

                      <VBtn
                        v-if="
                          cargo.status !== 'DELIVERED' &&
                            !cargo.status.startsWith('REFUND_REQUESTED') &&
                            cargo.status !== 'CANCELLED' &&
                            cargo.paymentStatus === 'PAID'
                        "
                        size="small"
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-cancel"
                        @click="handleCancelCargo(cargo.id)"
                      >
                        Batalkan
                      </VBtn>

                      <!-- Admin handling of REFUND_REQUESTED status -->
                      <VBtn
                        v-if="cargo.paymentStatus === 'REFUND_REQUESTED'"
                        size="small"
                        color="success"
                        prepend-icon="mdi-check"
                        @click="handleCancelCargo(cargo.id)"
                      >
                        Approve Refund
                      </VBtn>

                      <VBtn
                        v-if="cargo.paymentStatus === 'REFUND_REQUESTED'"
                        size="small"
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-close"
                        @click="handleRejectRefundCargo(cargo.id)"
                      >
                        Reject
                      </VBtn>

                      <div
                        v-if="cargo.status === 'CANCELLED'"
                        class="text-error text-caption d-flex align-center ga-1"
                      >
                        <VIcon size="small" color="error">mdi-cancel</VIcon> Dibatalkan
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="cargos.length === 0">
                  <td colspan="11" class="text-center text-grey py-8">
                    Belum ada kargo yang terdaftar pada manifest.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- POD DIALOG -->
    <VDialog v-model="podDialog" max-width="500">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-primary font-weight-bold border-b pb-2">
          Penyelesaian Proof of Delivery (POD)
        </VCardTitle>
        <VCardText class="pt-4">
          <p v-if="selectedAwbForPod" class="text-body-2 text-grey mb-4">
            Konfirmasi serah terima kargo untuk AWB: <strong>{{ selectedAwbForPod.id }}</strong>
          </p>
          <VTextField
            v-model="podRecipient"
            label="Nama Penerima Kargo"
            placeholder="Siapa yang menandatangani tanda terima"
            variant="outlined"
            density="comfortable"
            required
          />

          <!-- Digital Signature Signature simulator -->
          <div class="border border-dashed rounded-lg pa-4 my-3 text-center bg-grey-lighten-4">
            <VIcon size="large" color="primary" class="mb-1">mdi-gesture-swipe</VIcon>
            <div class="text-caption font-weight-bold text-primary">
              TANDA TANGAN PENERIMA DIGITAL
            </div>
            <div class="text-caption text-text-secondary">
              Simulasi Tanda Tangan Digital Terverifikasi
            </div>
          </div>

          <!-- Digital photo upload simulator -->
          <div class="border border-dashed rounded-lg pa-4 text-center bg-grey-lighten-4">
            <VIcon size="large" color="primary" class="mb-1">mdi-camera-outline</VIcon>
            <div class="text-caption font-weight-bold text-primary">FOTO BUKTI SERAH TERIMA</div>
            <div class="text-caption text-text-secondary">Simulasi Upload Foto Penerima/Kargo</div>
          </div>
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="podDialog = false">Batal</VBtn>
          <VBtn color="success" :disabled="!podRecipient.trim()" @click="confirmPod">
            Selesaikan Pengiriman
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
