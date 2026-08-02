<script setup lang="ts">
const search = ref('');
const dateFilter = ref('');

const { data: attData, refresh } = await useAsyncData(
  'attendances',
  () =>
    fetchApi<any[]>('/api/hris/attendance', {
      params: {
        date: dateFilter.value || undefined
      }
    }),
  { watch: [dateFilter] }
);
const attendances = computed(() => attData.value ?? []);

const { data: summary } = await useAsyncData('att-summary', () =>
  fetchApi<any>('/api/hris/attendance/summary')
);

const headers = [
  { title: 'Tanggal', key: 'attendanceDate' },
  { title: 'Karyawan / NIP', key: 'employeeName' },
  { title: 'Stasiun', key: 'stationCode' },
  { title: 'Jam Masuk (Clock-In)', key: 'checkIn' },
  { title: 'Jam Keluar (Clock-Out)', key: 'checkOut' },
  { title: 'Catatan Presensi', key: 'checkInNote' },
  { title: 'Sumber', key: 'source' },
  { title: 'Status', key: 'status' }
];

function statusColor(status: string) {
  if (status === 'PRESENT') return 'success';
  if (status === 'LATE') return 'warning';
  if (status === 'ABSENT') return 'error';
  return 'info';
}

function statusText(status: string) {
  if (status === 'PRESENT') return 'Hadir Tepat Waktu';
  if (status === 'LATE') return 'Terlambat';
  if (status === 'ABSENT') return 'Alfa / No Show';
  if (status === 'ON_LEAVE') return 'Cuti / Izin';
  return status;
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">
          Management Presensi & Jam Absen Karyawan
        </h1>
        <p class="text-subtitle-1 text-secondary">
          Monitoring detail jam masuk, jam keluar, dan lokasi stasiun presensi seluruh karyawan PT.
          AMA
        </p>
      </div>
      <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refresh()">Refresh Data</VBtn>
    </div>

    <!-- Summary Widgets -->
    <VRow v-if="summary" class="mb-6">
      <VCol cols="12" sm="3">
        <VCard border class="pa-4 text-center" elevation="1">
          <div class="text-caption text-secondary font-weight-bold">TOTAL HADIR</div>
          <div class="text-h3 font-weight-bold text-success mt-1">{{ summary.presentCount }}</div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4 text-center" elevation="1">
          <div class="text-caption text-secondary font-weight-bold">TERLAMBAT</div>
          <div class="text-h3 font-weight-bold text-warning mt-1">{{ summary.lateCount }}</div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4 text-center" elevation="1">
          <div class="text-caption text-secondary font-weight-bold">CUTI / IZIN</div>
          <div class="text-h3 font-weight-bold text-info mt-1">{{ summary.leaveCount }}</div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4 text-center" elevation="1">
          <div class="text-caption text-secondary font-weight-bold">ALFA</div>
          <div class="text-h3 font-weight-bold text-error mt-1">{{ summary.absentCount }}</div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Filters -->
    <VCard border class="pa-4 mb-4" elevation="1">
      <VRow>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            v-model="search"
            density="compact"
            hide-details
            label="Cari nama karyawan / NIP / stasiun"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model="dateFilter"
            density="compact"
            hide-details
            label="Filter Tanggal"
            type="date"
            variant="outlined"
            clearable
          />
        </VCol>
      </VRow>
    </VCard>

    <VCard border elevation="1">
      <VDataTable :headers="headers" :items="attendances" :search="search">
        <template #item.attendanceDate="{ item }">
          <span class="font-weight-bold text-body-2">{{ item.attendanceDate }}</span>
        </template>

        <template #item.employeeName="{ item }">
          <div class="font-weight-medium">{{ item.employeeName }}</div>
          <div class="text-caption text-secondary font-mono">
            {{ item.employeeCode || '-' }} &bull; {{ item.positionTitle }}
          </div>
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
          <span v-else class="text-caption text-secondary font-italic">Belum Masuk</span>
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

        <template #item.checkInNote="{ item }">
          <span class="text-body-2 text-secondary">{{ item.checkInNote || '-' }}</span>
        </template>

        <template #item.source="{ item }">
          <VChip size="x-small" variant="tonal">{{ item.source }}</VChip>
        </template>

        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="flat">
            {{ statusText(item.status) }}
          </VChip>
        </template>

        <template #no-data>
          <div class="text-center py-6 text-secondary">
            Belum ada data presensi untuk kriteria terpilih.
          </div>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
