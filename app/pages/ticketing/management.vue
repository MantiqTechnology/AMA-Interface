<script setup lang="ts">
const { can } = useAuthorization();

// Tab state
const activeTab = ref('routes');

// Load Routes, Stations, and Rate Cards
const { data: stationsData } = await useAsyncData('mgmt-stations', () =>
  fetchApi<any>('/api/master-data/stations')
);
const { data: routesData, refresh: refreshRoutes } = await useAsyncData('mgmt-routes', () =>
  fetchApi<any>('/api/master-data/routes')
);
const { data: rateCardsData } = await useAsyncData('mgmt-rate-cards', () =>
  fetchApi<any>('/api/master-data/rates')
);

// Load flights data for OCC sync checks
const { data: flightsData, refresh: refreshFlights } = await useAsyncData('mgmt-flights', () =>
  fetchApi<any[]>('/api/flights')
);
const { data: occFlightsData, refresh: refreshOccFlights } = await useAsyncData(
  'mgmt-occ-flights',
  () => fetchApi<any>('/api/flight-operations/flights')
);

const stations = computed(() => stationsData.value?.rows || []);
const routes = computed(() => routesData.value?.rows || []);
const rateCards = computed(() => rateCardsData.value?.rows || []);
const occFlights = computed(() => occFlightsData.value?.flights || []);

// Edit Tariff State
const editDialog = ref(false);
const selectedRouteForEdit = ref<any>(null);
const editTicketPrice = ref(1200000);
const editCargoTariff = ref(25000);
const isSubmitting = ref(false);

// Add Route State
const addRouteDialog = ref(false);
const newRouteOrigin = ref('');
const newRouteDest = ref('');
const newRouteDuration = ref(60);
const newRouteDistance = ref(200);
const newRoutePaxPrice = ref(1500000);
const newRouteCargoPrice = ref(30000);
const isAddingRoute = ref(false);

function getStationName(stationId: string) {
  const station = stations.value.find((s: any) => s.id === stationId);
  return station ? `${station.station_name} (${station.station_code})` : '-';
}

function getPassengerPrice(originId: string, destinationId: string) {
  const card = rateCards.value.find(
    (c: any) =>
      c.service_type === 'PASSENGER' &&
      c.origin_station_id === originId &&
      c.destination_station_id === destinationId
  );
  return card ? card.base_rate : null;
}

function getCargoPrice(originId: string, destinationId: string) {
  const card = rateCards.value.find(
    (c: any) =>
      c.service_type === 'CARGO' &&
      c.origin_station_id === originId &&
      c.destination_station_id === destinationId
  );
  return card ? card.base_rate : null;
}

function openEditPricing(route: any) {
  selectedRouteForEdit.value = route;
  editTicketPrice.value =
    getPassengerPrice(route.origin_station_id, route.destination_station_id) || 1200000;
  editCargoTariff.value =
    getCargoPrice(route.origin_station_id, route.destination_station_id) || 25000;
  editDialog.value = true;
}

async function handleSavePricing() {
  if (!selectedRouteForEdit.value) return;
  isSubmitting.value = true;
  try {
    pushToast({
      type: 'success',
      title: 'Tarif Berhasil Disimpan',
      message: `Rute ${getStationName(selectedRouteForEdit.value.origin_station_id)} -> ${getStationName(selectedRouteForEdit.value.destination_station_id)} berhasil diperbarui.`
    });
    editDialog.value = false;
  } catch (e) {
    console.error(e);
  } finally {
    isSubmitting.value = false;
  }
}

function openAddRoute() {
  newRouteOrigin.value = '';
  newRouteDest.value = '';
  newRouteDuration.value = 60;
  newRouteDistance.value = 200;
  newRoutePaxPrice.value = 1500000;
  newRouteCargoPrice.value = 30000;
  addRouteDialog.value = true;
}

async function handleAddRoute() {
  if (!newRouteOrigin.value || !newRouteDest.value) return;
  isAddingRoute.value = true;
  try {
    // Create Route via master-data API
    const originSt = stations.value.find((s: any) => s.id === newRouteOrigin.value);
    const destSt = stations.value.find((s: any) => s.id === newRouteDest.value);
    const routeCode = `${originSt?.station_code || 'XXX'}-${destSt?.station_code || 'YYY'}`;

    await fetchApi<any>('/api/master-data/routes', {
      method: 'POST',
      body: {
        route_code: routeCode,
        origin_station_id: newRouteOrigin.value,
        destination_station_id: newRouteDest.value,
        estimated_duration_minutes: newRouteDuration.value,
        distance_km: newRouteDistance.value
      }
    });

    pushToast({
      type: 'success',
      title: 'Rute Berhasil Ditambahkan',
      message: `Rute ${routeCode} berhasil didaftarkan ke database.`
    });
    addRouteDialog.value = false;
    await refreshRoutes();
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Gagal Menambahkan Rute',
      message: e?.data?.message || 'Terjadi kesalahan pada server.'
    });
  } finally {
    isAddingRoute.value = false;
  }
}

// Check-in and sync helpers
const isOpeningSales = ref<Record<string, boolean>>({});

function isSalesOpen(flightNumber: string) {
  return flightsData.value?.some((f: any) => f.flightNumber === flightNumber) ?? false;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'DISPATCHED':
      return 'info';
    case 'DEPARTED':
      return 'warning';
    case 'ARRIVED':
      return 'success';
    case 'CLOSED':
      return 'grey';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

async function handleOpenTicketSales(flightOpId: string) {
  isOpeningSales.value[flightOpId] = true;
  try {
    const res = await fetchApi<any>('/api/ticketing/open-sales', {
      method: 'POST',
      body: { flightOperationId: flightOpId }
    });
    if (res && res.success) {
      pushToast({
        type: 'success',
        title: 'Penjualan Tiket Dibuka',
        message: `Penerbangan ${res.flightOrder.flightNumber} kini tersedia di portal komersial!`
      });
      await Promise.all([refreshFlights(), refreshOccFlights()]);
    }
  } catch (e: any) {
    pushToast({
      type: 'error',
      title: 'Gagal Membuka Penjualan',
      message: e?.data?.message || 'Terjadi kesalahan pada server.'
    });
  } finally {
    isOpeningSales.value[flightOpId] = false;
  }
}

// Flight details dialog state
const detailDialog = ref(false);
const selectedFlightForDetail = ref<any>(null);

function openFlightDetail(flight: any) {
  selectedFlightForDetail.value = flight;
  detailDialog.value = true;
}

const { pushToast } = useDemoToasts();
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div v-if="!can('booking.update').allowed">
      <VAlert type="error" variant="tonal" class="rounded-lg mb-3">
        Akses Ditolak: Anda tidak memiliki izin untuk mengelola tarif & rute (booking.update).
      </VAlert>
    </div>
    <div v-else>
      <!-- Page Header -->
      <div class="mb-5 d-flex flex-wrap align-end justify-space-between ga-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-text-primary">Manajemen Tarif & Rute</h1>
          <p class="text-text-muted">
            Penyusunan rute penerbangan simulasi perintis PT AMA dan penyesuaian harga tiket
            penumpang & tarif kargo logistik.
          </p>
        </div>
        <div class="d-flex ga-2">
          <VBtn color="accent-cenderawasih" prepend-icon="mdi-plus" @click="openAddRoute">
            Tambah Rute Baru
          </VBtn>
          <VBtn color="primary" prepend-icon="mdi-refresh" variant="tonal" @click="refreshRoutes">
            Refresh
          </VBtn>
        </div>
      </div>

      <!-- Tabs Selector -->
      <VTabs v-model="activeTab" class="border-b mb-5" color="primary">
        <VTab value="routes">
          <VIcon start>mdi-routes</VIcon>
          Tarif & Rute Komersial
        </VTab>
        <VTab value="occ-flights">
          <VIcon start>mdi-airplane-takeoff</VIcon>
          Jadwal Penerbangan OCC
        </VTab>
      </VTabs>

      <VWindow v-model="activeTab">
        <!-- Tab 1: Routes & Tariffs -->
        <VWindowItem value="routes">
          <VRow>
            <VCol cols="12">
              <VCard border rounded="lg">
                <VCardTitle class="text-subtitle-1 font-weight-bold text-primary px-4 py-3">
                  Daftar Rute Aktif & Tarif Komersial
                </VCardTitle>

                <VTable class="w-full">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th>KODE RUTE</th>
                      <th>STASIUN ASAL</th>
                      <th>STASIUN TUJUAN</th>
                      <th>JARAK (KM)</th>
                      <th>DURASI ESTIMASI</th>
                      <th>HARGA TIKET STANDAR</th>
                      <th>TARIF KARGO / KG</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="route in routes" :key="route.id">
                      <td class="font-weight-bold text-primary">{{ route.route_code }}</td>
                      <td>{{ getStationName(route.origin_station_id) }}</td>
                      <td>{{ getStationName(route.destination_station_id) }}</td>
                      <td>{{ route.distance_km }} Km</td>
                      <td>{{ route.estimated_duration_minutes }} Menit</td>
                      <td class="font-weight-bold">
                        <span
                          v-if="
                            getPassengerPrice(route.origin_station_id, route.destination_station_id)
                          "
                        >
                          Rp
                          {{
                            getPassengerPrice(
                              route.origin_station_id,
                              route.destination_station_id
                            )!.toLocaleString('id-ID')
                          }}
                        </span>
                        <span v-else class="text-grey-lighten-1">Belum diatur</span>
                      </td>
                      <td class="font-weight-bold text-secondary">
                        <span
                          v-if="
                            getCargoPrice(route.origin_station_id, route.destination_station_id)
                          "
                        >
                          Rp
                          {{
                            getCargoPrice(
                              route.origin_station_id,
                              route.destination_station_id
                            )!.toLocaleString('id-ID')
                          }}
                        </span>
                        <span v-else class="text-grey-lighten-1">Belum diatur</span>
                      </td>
                      <td>
                        <VBtn
                          size="small"
                          color="primary"
                          variant="tonal"
                          prepend-icon="mdi-pencil"
                          @click="openEditPricing(route)"
                        >
                          Sesuaikan Tarif
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="routes.length === 0">
                      <td colspan="8" class="text-center text-grey py-8">
                        Tidak ada rute komersial yang terdaftar di database.
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <!-- Tab 2: OCC Flight Schedules -->
        <VWindowItem value="occ-flights">
          <VRow>
            <VCol cols="12">
              <VCard border rounded="lg">
                <VCardTitle class="d-flex justify-space-between align-center px-4 py-3">
                  <span class="text-subtitle-1 font-weight-bold text-primary">Jadwal Penerbangan Operasional OCC</span>
                  <VBtn
                    size="small"
                    variant="outlined"
                    color="primary"
                    prepend-icon="mdi-refresh"
                    @click="refreshOccFlights"
                  >
                    Refresh Jadwal
                  </VBtn>
                </VCardTitle>

                <VTable class="w-full">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th>NO PENERBANGAN</th>
                      <th>TIPE</th>
                      <th>RUTE (IATA)</th>
                      <th>JADWAL KEBERANGKATAN</th>
                      <th>PESAWAT</th>
                      <th>PILOT</th>
                      <th>STATUS OPERASI</th>
                      <th>PENJUALAN TIKET</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="flight in occFlights" :key="flight.id">
                      <td class="font-weight-bold text-primary">{{ flight.flightNumber }}</td>
                      <td>
                        <VChip
                          size="x-small"
                          variant="tonal"
                          :color="
                            flight.flightType === 'PASSENGER'
                              ? 'primary'
                              : flight.flightType === 'CARGO'
                                ? 'secondary'
                                : 'default'
                          "
                          class="font-weight-bold"
                        >
                          {{ flight.flightType }}
                        </VChip>
                      </td>
                      <td>{{ flight.originStationCode }} → {{ flight.destinationStationCode }}</td>
                      <td>{{ flight.scheduledDepartureAt || flight.flightDate }}</td>
                      <td>
                        <span v-if="flight.aircraftRegistration">
                          {{ flight.aircraftRegistration }}
                        </span>
                        <span v-else class="text-grey italic text-caption">Belum ditugaskan</span>
                      </td>
                      <td>
                        <span v-if="flight.pilotInCommandName">
                          {{ flight.pilotInCommandName }}
                        </span>
                        <span v-else class="text-grey italic text-caption">Belum ditugaskan</span>
                      </td>
                      <td>
                        <VChip
                          size="small"
                          variant="tonal"
                          :color="getStatusColor(flight.currentStatus)"
                        >
                          {{ flight.currentStatus }}
                        </VChip>
                      </td>
                      <td>
                        <VChip
                          size="small"
                          :color="isSalesOpen(flight.flightNumber) ? 'success' : 'warning'"
                          variant="elevated"
                        >
                          {{ isSalesOpen(flight.flightNumber) ? 'TERBUKA' : 'BELUM AKTIF' }}
                        </VChip>
                      </td>
                      <td>
                        <div class="d-flex ga-2 align-center">
                          <VBtn
                            v-if="!isSalesOpen(flight.flightNumber)"
                            size="small"
                            color="success"
                            :loading="isOpeningSales[flight.id]"
                            :disabled="!flight.aircraftId || !flight.pilotInCommandId"
                            prepend-icon="mdi-ticket-confirmation"
                            @click="handleOpenTicketSales(flight.id)"
                          >
                            Buka Penjualan
                          </VBtn>
                          <div v-else class="text-success text-caption d-flex align-center ga-1">
                            <VIcon size="small">mdi-check-decagram</VIcon> Terbuka
                          </div>

                          <VBtn
                            size="small"
                            color="primary"
                            variant="outlined"
                            prepend-icon="mdi-eye-outline"
                            @click="openFlightDetail(flight)"
                          >
                            Detail
                          </VBtn>
                        </div>
                        <div
                          v-if="
                            (!flight.aircraftId || !flight.pilotInCommandId) &&
                              !isSalesOpen(flight.flightNumber)
                          "
                          class="text-error text-caption mt-1 font-weight-bold"
                        >
                          Pesawat/Pilot belum siap di OCC
                        </div>
                      </td>
                    </tr>
                    <tr v-if="occFlights.length === 0">
                      <td colspan="9" class="text-center text-grey py-8">
                        Belum ada jadwal penerbangan operasional yang dibuat oleh OCC.
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>
      </VWindow>
    </div>

    <!-- EDIT TARIFF DIALOG -->
    <VDialog v-model="editDialog" max-width="500">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-primary font-weight-bold border-b pb-2">
          Sesuaikan Tarif Rute
        </VCardTitle>
        <VCardText v-if="selectedRouteForEdit" class="pt-4">
          <div class="mb-4 text-subtitle-2 text-grey">
            Rute: <strong>{{ getStationName(selectedRouteForEdit.origin_station_id) }}</strong> ->
            <strong>{{ getStationName(selectedRouteForEdit.destination_station_id) }}</strong>
          </div>
          <VTextField
            v-model.number="editTicketPrice"
            label="Harga Tiket Penumpang (Rp)"
            type="number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            required
          />
          <VTextField
            v-model.number="editCargoTariff"
            label="Tarif Kargo per Kilogram (Rp)"
            type="number"
            variant="outlined"
            density="comfortable"
            required
          />
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="editDialog = false">Batal</VBtn>
          <VBtn color="primary" :loading="isSubmitting" @click="handleSavePricing">
            Simpan Perubahan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ADD ROUTE DIALOG -->
    <VDialog v-model="addRouteDialog" max-width="600">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle class="text-primary font-weight-bold border-b pb-2">
          <VIcon start color="primary">mdi-map-marker-plus-outline</VIcon>
          Tambah Rute Penerbangan Baru
        </VCardTitle>
        <VCardText class="pt-4">
          <VRow dense>
            <VCol cols="12" md="6">
              <VSelect
                v-model="newRouteOrigin"
                label="Stasiun Asal"
                :items="stations"
                item-title="station_name"
                item-value="id"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-airplane-takeoff"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="newRouteDest"
                label="Stasiun Tujuan"
                :items="stations"
                item-title="station_name"
                item-value="id"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-airplane-landing"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="newRouteDistance"
                label="Jarak (Km)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="newRouteDuration"
                label="Durasi Estimasi (Menit)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
          </VRow>

          <VDivider class="my-4" />
          <div class="text-subtitle-2 font-weight-bold text-primary mb-3">
            Tarif Standar Rute Baru
          </div>

          <VRow dense>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="newRoutePaxPrice"
                label="Harga Tiket Penumpang (Rp)"
                type="number"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-account"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="newRouteCargoPrice"
                label="Tarif Kargo per Kg (Rp)"
                type="number"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-package-variant"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn variant="text" @click="addRouteDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            :loading="isAddingRoute"
            :disabled="!newRouteOrigin || !newRouteDest || newRouteOrigin === newRouteDest"
            @click="handleAddRoute"
          >
            Daftarkan Rute
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- OCC FLIGHT DETAIL DIALOG -->
    <VDialog v-model="detailDialog" max-width="650">
      <VCard border rounded="xl" class="pa-4">
        <VCardTitle
          class="text-primary font-weight-bold border-b pb-2 d-flex align-center justify-space-between"
        >
          <span>Detail Penerbangan Operasional</span>
          <VChip size="small" variant="tonal" color="primary" class="font-weight-bold">
            {{ selectedFlightForDetail?.flightNumber }}
          </VChip>
        </VCardTitle>

        <VCardText v-if="selectedFlightForDetail" class="pt-4">
          <div
            class="d-flex justify-space-between align-center mb-4 bg-grey-lighten-4 pa-3 rounded-lg"
          >
            <div>
              <div class="text-caption text-grey">Rute Penerbangan</div>
              <div class="text-h6 font-weight-bold text-primary">
                {{ selectedFlightForDetail.originStationCode }} →
                {{ selectedFlightForDetail.destinationStationCode }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-caption text-grey">Tipe & Tanggal</div>
              <div class="font-weight-bold text-uppercase">
                {{ selectedFlightForDetail.flightType }} | {{ selectedFlightForDetail.flightDate }}
              </div>
            </div>
          </div>

          <VRow>
            <!-- Kolom 1 -->
            <VCol cols="12" sm="6">
              <div class="mb-3">
                <div class="text-caption text-grey">Nama Klien / Penumpang</div>
                <div class="font-weight-medium">
                  {{ selectedFlightForDetail.customerName || 'Personal / Umum' }}
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Registrasi Pesawat</div>
                <div class="font-weight-medium">
                  {{ selectedFlightForDetail.aircraftRegistration || 'Belum Ditugaskan' }}
                  <VChip
                    v-if="selectedFlightForDetail.aircraftServiceability"
                    size="x-small"
                    :color="
                      selectedFlightForDetail.aircraftServiceability === 'SERVICEABLE'
                        ? 'success'
                        : 'error'
                    "
                    class="ml-1"
                  >
                    {{ selectedFlightForDetail.aircraftServiceability }}
                  </VChip>
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Pilot in Command (PIC)</div>
                <div class="font-weight-medium">
                  {{ selectedFlightForDetail.pilotInCommandName || 'Belum Ditugaskan' }}
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Second in Command (Co-Pilot)</div>
                <div class="font-weight-medium">
                  {{ selectedFlightForDetail.coPilotName || 'Belum Ditugaskan' }}
                </div>
              </div>
            </VCol>

            <!-- Kolom 2 -->
            <VCol cols="12" sm="6">
              <div class="mb-3">
                <div class="text-caption text-grey">Estimasi Keberangkatan</div>
                <div class="font-weight-medium">
                  {{
                    selectedFlightForDetail.scheduledDepartureAt
                      ? new Date(selectedFlightForDetail.scheduledDepartureAt).toLocaleString(
                        'id-ID'
                      )
                      : '-'
                  }}
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Estimasi Kedatangan</div>
                <div class="font-weight-medium">
                  {{
                    selectedFlightForDetail.scheduledArrivalAt
                      ? new Date(selectedFlightForDetail.scheduledArrivalAt).toLocaleString('id-ID')
                      : '-'
                  }}
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Status Operasi</div>
                <div class="font-weight-medium">
                  <VChip
                    size="small"
                    variant="tonal"
                    :color="getStatusColor(selectedFlightForDetail.currentStatus)"
                  >
                    {{ selectedFlightForDetail.currentStatus }}
                  </VChip>
                </div>
              </div>
              <div class="mb-3">
                <div class="text-caption text-grey">Kesiapan Dokumen & Teknis (Readiness)</div>
                <div class="font-weight-medium d-flex align-center ga-2">
                  <span>{{ selectedFlightForDetail.readinessSummary }}</span>
                  <VProgressLinear
                    :model-value="selectedFlightForDetail.readinessPercent"
                    color="primary"
                    height="8"
                    rounded
                    style="width: 80px"
                  />
                  <span class="text-caption font-weight-bold text-primary">{{ selectedFlightForDetail.readinessPercent }}%</span>
                </div>
              </div>
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <!-- Blockers & Remarks -->
          <div v-if="selectedFlightForDetail.blockingReason" class="mb-3">
            <div class="text-caption text-error font-weight-bold">
              <VIcon start size="small" color="error">mdi-alert-octagon</VIcon>
              Faktor Penghambat (Blocking Reason)
            </div>
            <VAlert
              type="error"
              variant="tonal"
              density="compact"
              class="text-caption mt-1 py-1 px-2 rounded-lg"
            >
              {{ selectedFlightForDetail.blockingReason }}
            </VAlert>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey">Keterangan / Remarks</div>
            <div class="text-body-2 bg-grey-lighten-4 pa-2 rounded-lg mt-1 italic">
              "{{ selectedFlightForDetail.remarks || 'Tidak ada keterangan tambahan.' }}"
            </div>
          </div>
        </VCardText>

        <VCardActions class="border-t pt-3 mt-3">
          <VSpacer />
          <VBtn color="primary" variant="elevated" @click="detailDialog = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
