<script setup lang="ts">
const { data: leaveData, refresh } = await useAsyncData('leave-requests', () =>
  fetchApi<any[]>('/api/hris/leave/requests')
);
const requests = computed(() => leaveData.value ?? []);

const headers = [
  { title: 'No. Request', key: 'requestNumber' },
  { title: 'Karyawan', key: 'employeeName' },
  { title: 'Jenis Cuti', key: 'leaveName' },
  { title: 'Mulai', key: 'startDate' },
  { title: 'Selesai', key: 'endDate' },
  { title: 'Durasi', key: 'totalDays' },
  { title: 'Alasan', key: 'reason' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

async function approve(id: string) {
  await fetchApi(`/api/hris/leave/requests/${id}/approve`, { method: 'POST' });
  refresh();
}

async function reject(id: string) {
  const reason = prompt('Masukkan alasan penolakan:');
  if (!reason) return;
  await fetchApi(`/api/hris/leave/requests/${id}/reject`, {
    method: 'POST',
    body: { rejectionReason: reason }
  });
  refresh();
}

function statusColor(s: string) {
  if (s === 'APPROVED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'REJECTED') return 'error';
  return 'secondary';
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Manajemen Cuti & Izin</h1>
        <p class="text-subtitle-1 text-secondary">
          Persetujuan dan pencatatan cuti karyawan PT. AMA
        </p>
      </div>
      <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refresh()">Refresh</VBtn>
    </div>

    <VCard border>
      <VDataTable :headers="headers" :items="requests">
        <template #item.requestNumber="{ item }">
          <span class="font-mono font-weight-bold">{{ item.requestNumber }}</span>
        </template>
        <template #item.employeeName="{ item }">
          <div class="font-weight-medium">{{ item.employeeName }}</div>
          <div class="text-caption text-secondary">{{ item.positionTitle }}</div>
        </template>
        <template #item.leaveName="{ item }">
          <VChip size="small" variant="outlined">{{ item.leaveName }}</VChip>
        </template>
        <template #item.totalDays="{ item }">
          <span class="font-weight-bold">{{ item.totalDays }} Hari</span>
        </template>
        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="flat">
            {{ item.status }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <div v-if="item.status === 'PENDING'" class="d-flex ga-1">
            <VBtn size="small" color="success" variant="flat" @click="approve(item.id)">
              Approve
            </VBtn>
            <VBtn size="small" color="error" variant="outlined" @click="reject(item.id)">
              Reject
            </VBtn>
          </div>
          <span v-else class="text-caption text-secondary">—</span>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
