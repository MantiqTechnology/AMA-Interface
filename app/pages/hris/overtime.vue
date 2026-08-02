<script setup lang="ts">
const searchQuery = ref('');
const selectedStatus = ref<string>('ALL');

const { data: ovrData, refresh } = await useAsyncData(
  'overtime-requests-list',
  () => {
    const params = new URLSearchParams();
    if (searchQuery.value) params.set('search', searchQuery.value);
    if (selectedStatus.value !== 'ALL') params.set('status', selectedStatus.value);
    return fetchApi<any[]>(`/api/hris/overtime?${params.toString()}`);
  },
  { watch: [searchQuery, selectedStatus] }
);

const requests = computed(() => {
  if (Array.isArray(ovrData.value)) return ovrData.value;
  if (ovrData.value && Array.isArray((ovrData.value as any).items))
    return (ovrData.value as any).items;
  return [];
});

onMounted(() => {
  refresh();
});

const headers = [
  { title: 'No. Request', key: 'requestNumber' },
  { title: 'Karyawan', key: 'employeeName' },
  { title: 'Tanggal Lembur', key: 'overtimeDate' },
  { title: 'Jam Operasional', key: 'times' },
  { title: 'Total Jam', key: 'totalHours' },
  { title: 'Alasan / Pekerjaan', key: 'reason' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

async function approve(id: string) {
  try {
    await fetchApi(`/api/hris/overtime/${id}/approve`, { method: 'POST' });
    refresh();
  } catch (err: any) {
    alert(err.message || 'Gagal menyetujui pengajuan lembur.');
  }
}

function statusColor(s: string) {
  if (s === 'APPROVED') return 'success';
  if (s === 'PENDING') return 'warning';
  return 'error';
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Manajemen Lembur</h1>
        <p class="text-subtitle-1 text-secondary">
          Pengajuan, penyaringan, dan persetujuan kerja lembur karyawan
        </p>
      </div>
      <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refresh()">Refresh</VBtn>
    </div>

    <!-- Filter & Search Toolbar -->
    <VCard border class="mb-4 pa-4">
      <VRow density="compact" align="center">
        <VCol cols="12" sm="7" md="8">
          <VTextField
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            label="Cari Pengajuan Lembur..."
            placeholder="Cari nama karyawan, NIP, no. request, alasan..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="12" sm="5" md="4">
          <VSelect
            v-model="selectedStatus"
            label="Filter Status"
            :items="[
              { title: 'Semua Status', value: 'ALL' },
              { title: 'Menunggu (Pending)', value: 'PENDING' },
              { title: 'Disetujui (Approved)', value: 'APPROVED' },
              { title: 'Ditolak (Rejected)', value: 'REJECTED' }
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
      </VRow>
    </VCard>

    <VCard border>
      <VDataTable :headers="headers" :items="requests">
        <template #item.requestNumber="{ item }">
          <span class="font-mono font-weight-bold text-primary">{{ item.requestNumber }}</span>
        </template>
        <template #item.employeeName="{ item }">
          <div class="font-weight-medium">{{ item.employeeName }}</div>
          <div class="text-caption text-secondary">
            {{ item.positionTitle }} • {{ item.employeeCode }}
          </div>
        </template>
        <template #item.times="{ item }">
          <span class="font-mono">{{ item.startTime }} - {{ item.endTime }}</span>
        </template>
        <template #item.totalHours="{ item }">
          <span class="font-weight-bold">{{ item.totalHours }} Jam</span>
        </template>
        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="flat">
            {{ item.status }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <VBtn
            v-if="item.status === 'PENDING'"
            size="small"
            color="success"
            variant="flat"
            @click="approve(item.id)"
          >
            Approve
          </VBtn>
          <span v-else class="text-caption text-secondary">—</span>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
