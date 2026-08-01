<script setup lang="ts">
const activeTab = ref('booking');
const step = ref(1);

const stations = [
  {
    id: 'st-djj',
    code: 'DJJ',
    name: 'Jayapura / Sentani Airport',
    type: 'HUB',
    icon: 'mdi-airplane-takeoff'
  },
  { id: 'st-wmx', code: 'WMX', name: 'Wamena Airport', type: 'STATION', icon: 'mdi-airport' },
  { id: 'st-mkq', code: 'MKQ', name: 'Merauke Airport', type: 'STATION', icon: 'mdi-airport' },
  { id: 'st-nbx', code: 'NBX', name: 'Nabire Airport', type: 'STATION', icon: 'mdi-airport' },
  { id: 'st-djj', code: 'HQ', name: 'AMA Headquarters Sentani', type: 'OFFICE', icon: 'mdi-domain' }
];

const selectedStation = ref(stations[0]);
const note = ref('');
const loading = ref(false);
const attendanceResult = ref<any>(null);
const errorMsg = ref('');

// Fetch Riwayat Presensi Saya
const { data: historyData, refresh: refreshHistory } = await useAsyncData(
  'portal-attendance-history',
  () => fetchApi<any[]>('/api/hris/self-service/attendance-history')
);

const historyList = computed(() => historyData.value ?? []);

// Check status presensi hari ini
const todayStr = new Date().toISOString().slice(0, 10);
const todayAttendance = computed(() =>
  historyList.value.find((h: any) => h.attendanceDate === todayStr)
);

function selectStation(stn: any) {
  selectedStation.value = stn;
  step.value = 2;
}

async function confirmCheckIn() {
  loading.value = true;
  errorMsg.value = '';
  const nowClock = new Date().toTimeString().slice(0, 5);
  try {
    const res = await fetchApi<any>('/api/hris/attendance/check-in', {
      method: 'POST',
      body: {
        stationId: selectedStation.value.id,
        note: note.value,
        checkInTime: nowClock
      }
    });
    attendanceResult.value = res;
    step.value = 3;
    refreshHistory();
  } catch (err: any) {
    errorMsg.value = err.data?.error?.message || err.message || 'Gagal melakukan check-in.';
  } finally {
    loading.value = false;
  }
}

async function confirmCheckOut() {
  loading.value = true;
  errorMsg.value = '';
  const nowClock = new Date().toTimeString().slice(0, 5);
  try {
    const res = await fetchApi<any>('/api/hris/attendance/check-out', {
      method: 'POST',
      body: {
        note: note.value,
        checkOutTime: nowClock
      }
    });
    attendanceResult.value = res;
    refreshHistory();
    alert('Check-out berhasil dicatat!');
  } catch (err: any) {
    errorMsg.value = err.data?.error?.message || err.message || 'Gagal melakukan check-out.';
  } finally {
    loading.value = false;
  }
}

function statusColor(status: string) {
  if (status === 'PRESENT') return 'success';
  if (status === 'LATE') return 'warning';
  if (status === 'ABSENT') return 'error';
  return 'info';
}

function statusText(status: string) {
  if (status === 'PRESENT') return 'Hadir Tepat Waktu';
  if (status === 'LATE') return 'Terlambat';
  if (status === 'ABSENT') return 'Alfa';
  if (status === 'ON_LEAVE') return 'Cuti / Izin';
  return status;
}

const headers = [
  { title: 'Tanggal', key: 'attendanceDate' },
  { title: 'Stasiun Presensi', key: 'stationCode' },
  { title: 'Jam Masuk (Clock-In)', key: 'checkIn' },
  { title: 'Jam Keluar (Clock-Out)', key: 'checkOut' },
  { title: 'Status', key: 'status' },
  { title: 'Catatan', key: 'checkInNote' }
];
</script>

<template>
  <div class="attendance-portal-shell">
    <VCard border class="mb-6">
      <VTabs v-model="activeTab" color="primary">
        <VTab value="booking" prepend-icon="mdi-clock-fast">Form Clock-In / Presensi Masuk</VTab>
        <VTab value="history" prepend-icon="mdi-calendar-clock">
          Riwayat & Jam Absen Saya ({{ historyList.length }})
        </VTab>
      </VTabs>

      <VDivider />

      <VCardText class="pa-4 pa-md-6">
        <VWindow v-model="activeTab">
          <!-- Tab 1: Check-in Booking Flow -->
          <VWindowItem value="booking">
            <div class="attendance-booking-shell">
              <!-- Stepper indicator -->
              <div class="d-flex align-center justify-center ga-3 mb-6">
                <div :class="['step-badge', step >= 1 ? 'active' : '']">1. Pilih Stasiun</div>
                <VIcon icon="mdi-chevron-right" color="secondary" />
                <div :class="['step-badge', step >= 2 ? 'active' : '']">2. Konfirmasi Presensi</div>
                <VIcon icon="mdi-chevron-right" color="secondary" />
                <div :class="['step-badge', step >= 3 ? 'active' : '']">3. Bukti Check-In</div>
              </div>

              <!-- Status Card Hari Ini -->
              <VCard
                v-if="todayAttendance?.checkIn"
                border
                class="pa-4 mb-6 bg-success-lighten-5"
                elevation="1"
              >
                <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                  <div class="d-flex align-center ga-3">
                    <VAvatar color="success" size="44">
                      <VIcon icon="mdi-check-decagram" size="28" color="white" />
                    </VAvatar>
                    <div>
                      <div class="font-weight-bold text-success text-subtitle-1">
                        Anda Sudah Check-In Hari Ini ({{ todayAttendance.attendanceDate }})
                      </div>
                      <div class="text-caption text-secondary">
                        Jam Masuk:
                        <strong class="text-success font-mono">{{ todayAttendance.checkIn }} WIT</strong>
                        &bull; Stasiun: <strong>{{ todayAttendance.stationCode }}</strong>
                      </div>
                    </div>
                  </div>

                  <div v-if="!todayAttendance.checkOut" class="d-flex align-center ga-2">
                    <VBtn
                      color="info"
                      prepend-icon="mdi-clock-out"
                      :loading="loading"
                      @click="confirmCheckOut()"
                    >
                      Presensi Keluar (Clock-Out Now)
                    </VBtn>
                  </div>
                  <VChip v-else color="primary" size="small" variant="flat">
                    Sudah Clock-Out ({{ todayAttendance.checkOut }} WIT)
                  </VChip>
                </div>
              </VCard>

              <!-- Step 1: Select Station -->
              <div v-if="step === 1">
                <h3 class="text-h5 font-weight-bold text-primary mb-2">
                  📍 Pilih Lokasi Stasiun Presensi
                </h3>
                <p class="text-body-2 text-secondary mb-6">
                  Pilih stasiun / bandara keberadaan Anda saat ini untuk presensi absensi harian.
                </p>

                <VRow>
                  <VCol v-for="stn in stations" :key="stn.id" cols="12" sm="6" md="4">
                    <VCard
                      border
                      class="pa-4 station-select-card text-center cursor-pointer"
                      hover
                      @click="selectStation(stn)"
                    >
                      <VAvatar color="primary" variant="tonal" size="56" class="mb-3">
                        <VIcon :icon="stn.icon" size="32" />
                      </VAvatar>
                      <div class="text-h5 font-weight-bold text-primary mb-1">{{ stn.code }}</div>
                      <div class="text-subtitle-2 font-weight-medium mb-1">{{ stn.name }}</div>
                      <VChip size="x-small" color="info" variant="outlined">{{ stn.type }}</VChip>
                    </VCard>
                  </VCol>
                </VRow>
              </div>

              <!-- Step 2: Confirm Shift -->
              <div v-if="step === 2" class="max-w-md mx-auto">
                <VCard border class="pa-6">
                  <h3 class="text-h5 font-weight-bold text-primary mb-4">
                    ⏰ Konfirmasi Clock-In Presensi
                  </h3>

                  <VAlert v-if="errorMsg" type="error" variant="tonal" class="mb-4">
                    {{ errorMsg }}
                  </VAlert>

                  <VList border density="comfortable" class="rounded mb-4">
                    <VListItem title="Stasiun Presensi">
                      <template #subtitle>
                        <span class="font-weight-bold text-primary">{{ selectedStation.code }} — {{ selectedStation.name }}</span>
                      </template>
                    </VListItem>
                    <VListItem title="Waktu Presensi">
                      <template #subtitle>
                        <span class="font-mono font-weight-bold text-success">{{ new Date().toLocaleTimeString('id-ID') }} WIT</span>
                      </template>
                    </VListItem>
                    <VListItem title="Status Tugas">
                      <template #subtitle>
                        <VChip color="success" size="small">ON SHIFT ACTIVE</VChip>
                      </template>
                    </VListItem>
                  </VList>

                  <VTextField
                    v-model="note"
                    label="Catatan Presensi (Opsional)"
                    placeholder="Misal: Tugas penerbangan Sentani - Wamena..."
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                  />

                  <div class="d-flex ga-2">
                    <VBtn variant="outlined" @click="step = 1">Ganti Lokasi</VBtn>
                    <VBtn
                      color="success"
                      block
                      size="large"
                      :loading="loading"
                      prepend-icon="mdi-check-circle"
                      @click="confirmCheckIn()"
                    >
                      Konfirmasi Check-In
                    </VBtn>
                  </div>
                </VCard>
              </div>

              <!-- Step 3: Success Card with QR Badge -->
              <div v-if="step === 3" class="max-w-md mx-auto">
                <VCard border class="pa-6 text-center" color="success-lighten-5">
                  <VAvatar color="success" size="72" class="mb-4">
                    <VIcon icon="mdi-check-decagram" size="48" color="white" />
                  </VAvatar>

                  <h2 class="text-h4 font-weight-bold text-success mb-1">Check-In Berhasil!</h2>
                  <p class="text-body-2 text-secondary mb-4">
                    Jam masuk presensi Anda telah tercatat resmi di database HRIS PT. AMA.
                  </p>

                  <VCard border class="pa-4 bg-white text-start mb-6">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption text-secondary">REF PRESENSI:</span>
                      <span class="font-mono font-weight-bold text-primary">{{
                        attendanceResult?.id || 'ATT-2026'
                      }}</span>
                    </div>
                    <VDivider class="my-2" />
                    <div class="d-flex justify-space-between text-body-2 py-1">
                      <span>Stasiun Presensi:</span>
                      <strong class="text-primary">{{ selectedStation.code }}</strong>
                    </div>
                    <div class="d-flex justify-space-between text-body-2 py-1">
                      <span>Jam Masuk (Clock-In):</span>
                      <strong class="text-success font-mono">{{ attendanceResult?.checkIn || '06:15' }} WIT</strong>
                    </div>
                    <div class="d-flex justify-space-between text-body-2 py-1">
                      <span>Status Presensi:</span>
                      <VChip size="small" color="success" variant="flat">
                        {{ attendanceResult?.status || 'PRESENT' }}
                      </VChip>
                    </div>
                  </VCard>

                  <VBtn
                    color="primary"
                    block
                    size="large"
                    @click="
                      step = 1;
                      activeTab = 'history';
                    "
                  >
                    Lihat Riwayat Presensi
                  </VBtn>
                </VCard>
              </div>
            </div>
          </VWindowItem>

          <!-- Tab 2: Riwayat Presensi Saya -->
          <VWindowItem value="history">
            <div class="d-flex align-center justify-space-between mb-4">
              <h3 class="text-h6 font-weight-bold text-primary">
                Riwayat & Detail Jam Absen Presensi Saya
              </h3>
              <VBtn
                prepend-icon="mdi-refresh"
                variant="text"
                size="small"
                @click="refreshHistory()"
              >
                Refresh
              </VBtn>
            </div>

            <VDataTable :headers="headers" :items="historyList" density="comfortable">
              <template #item.attendanceDate="{ item }">
                <span class="font-weight-bold text-body-2">{{ item.attendanceDate }}</span>
              </template>

              <template #item.stationCode="{ item }">
                <VChip size="small" variant="outlined" color="primary">
                  <VIcon icon="mdi-map-marker" size="14" class="mr-1" />
                  {{ item.stationCode || 'HQ' }}
                </VChip>
              </template>

              <template #item.checkIn="{ item }">
                <VChip
                  v-if="item.checkIn"
                  color="success"
                  size="small"
                  variant="tonal"
                  class="font-mono font-weight-bold"
                >
                  <VIcon icon="mdi-clock-in" size="14" class="mr-1" />
                  {{ item.checkIn }} WIT
                </VChip>
                <span v-else class="text-caption text-secondary font-italic">-</span>
              </template>

              <template #item.checkOut="{ item }">
                <VChip
                  v-if="item.checkOut"
                  color="info"
                  size="small"
                  variant="tonal"
                  class="font-mono font-weight-bold"
                >
                  <VIcon icon="mdi-clock-out" size="14" class="mr-1" />
                  {{ item.checkOut }} WIT
                </VChip>
                <span v-else class="text-caption text-secondary font-italic">Belum Keluar</span>
              </template>

              <template #item.status="{ item }">
                <VChip :color="statusColor(item.status)" size="small" variant="flat">
                  {{ statusText(item.status) }}
                </VChip>
              </template>

              <template #item.checkInNote="{ item }">
                <span class="text-body-2 text-secondary">{{ item.checkInNote || '-' }}</span>
              </template>

              <template #no-data>
                <div class="text-center py-6 text-secondary">
                  Belum ada catatan riwayat presensi.
                </div>
              </template>
            </VDataTable>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.step-badge {
  padding: 6px 16px;
  border-radius: 20px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
  font-size: 0.875rem;
}
.step-badge.active {
  background: #082b49;
  color: #ffffff;
}
.station-select-card:hover {
  border-color: #082b49 !important;
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
</style>
