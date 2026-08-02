<script setup lang="ts">
const props = defineProps<{ employeeId: string }>();

// Fetch Saldo Cuti
const { data: balancesData, refresh: refreshBalances } = await useAsyncData(
  'portal-leave-balance',
  () => fetchApi<any[]>('/api/hris/self-service/leave-balance')
);
const balances = computed(() => balancesData.value ?? []);

// Fetch Riwayat Request Cuti Karyawan
const { data: requestsData, refresh: refreshRequests } = await useAsyncData(
  'portal-leave-requests',
  () => fetchApi<any[]>('/api/hris/self-service/leave-requests')
);
const myRequests = computed(() => requestsData.value ?? []);

const leaveTypeId = ref('');
const startDate = ref('');
const endDate = ref('');
const totalDays = ref(1);
const reason = ref('');
const submitting = ref(false);
const successMsg = ref(false);
const errorMsg = ref('');

watch([startDate, endDate], () => {
  if (startDate.value && endDate.value) {
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    totalDays.value = diff > 0 ? diff : 1;
  }
});

async function submitLeave() {
  if (!leaveTypeId.value || !startDate.value || !endDate.value) {
    errorMsg.value = 'Silakan pilih jenis cuti dan tanggal pengajuan.';
    return;
  }
  if (!reason.value || !reason.value.trim()) {
    errorMsg.value = 'Alasan pengajuan cuti wajib diisi (Required).';
    return;
  }
  if (reason.value.trim().length < 3) {
    errorMsg.value = 'Alasan pengajuan cuti minimal 3 karakter.';
    return;
  }

  submitting.value = true;
  errorMsg.value = '';
  successMsg.value = false;

  try {
    await fetchApi('/api/hris/leave/requests', {
      method: 'POST',
      body: {
        employeeId: props.employeeId,
        leaveTypeId: leaveTypeId.value,
        startDate: startDate.value,
        endDate: endDate.value,
        totalDays: totalDays.value,
        reason: reason.value
      }
    });

    successMsg.value = true;
    leaveTypeId.value = '';
    startDate.value = '';
    endDate.value = '';
    reason.value = '';

    // Refresh saldo dan list riwayat request
    refreshBalances();
    refreshRequests();
  } catch (err: any) {
    errorMsg.value = err.data?.error?.message || err.message || 'Gagal mengajukan cuti.';
  } finally {
    submitting.value = false;
  }
}

function statusColor(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'error';
  return 'secondary';
}

function statusText(status: string) {
  if (status === 'APPROVED') return 'Disetujui';
  if (status === 'PENDING') return 'Menunggu Approval';
  if (status === 'REJECTED') return 'Ditolak';
  if (status === 'CANCELLED') return 'Dibatalkan';
  return status;
}

const headers = [
  { title: 'No. Pengajuan', key: 'requestNumber' },
  { title: 'Jenis Cuti', key: 'leaveName' },
  { title: 'Tanggal', key: 'dates' },
  { title: 'Durasi', key: 'totalDays' },
  { title: 'Alasan', key: 'reason' },
  { title: 'Status', key: 'status' }
];
</script>

<template>
  <div class="leave-portal-shell">
    <!-- Section 1: Saldo Cuti Cards -->
    <div class="d-flex align-center justify-space-between mb-3">
      <h3 class="text-h6 font-weight-bold text-primary">Sisa Saldo Cuti Anda</h3>
      <VBtn
        prepend-icon="mdi-refresh"
        variant="text"
        size="small"
        @click="
          refreshBalances();
          refreshRequests();
        "
      >
        Refresh Data
      </VBtn>
    </div>

    <VRow class="mb-6">
      <VCol v-for="b in balances" :key="b.leaveTypeId" cols="12" sm="6" md="4">
        <VCard border class="pa-4 bg-surface" elevation="1">
          <div class="text-caption text-secondary font-weight-bold text-uppercase">
            {{ b.leaveName }}
          </div>
          <div class="text-h3 font-weight-bold text-primary my-1">
            {{ b.remainingDays }}
            <span class="text-subtitle-2 text-secondary font-weight-normal">Hari</span>
          </div>
          <div class="text-caption text-secondary">
            Terpakai: <strong>{{ b.usedDays }}</strong> dari {{ b.entitledDays }} hari hak cuti
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <!-- Section 2: Form Pengajuan Cuti -->
      <VCol cols="12" lg="5">
        <VCard border class="pa-6" elevation="1">
          <div class="d-flex align-center ga-2 mb-4">
            <VAvatar color="primary" variant="tonal" size="36">
              <VIcon icon="mdi-calendar-plus" size="20" />
            </VAvatar>
            <h3 class="text-h6 font-weight-bold text-primary">Form Pengajuan Cuti / Izin</h3>
          </div>

          <VAlert
            v-if="successMsg"
            type="success"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="successMsg = false"
          >
            Pengajuan cuti berhasil dikirim! Menunggu persetujuan atasan.
          </VAlert>

          <VAlert
            v-if="errorMsg"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="errorMsg = ''"
          >
            {{ errorMsg }}
          </VAlert>

          <VForm @submit.prevent="submitLeave()">
            <VSelect
              v-model="leaveTypeId"
              label="Jenis Cuti / Izin"
              :items="
                balances.map((b: any) => ({
                  title: `${b.leaveName} (Sisa ${b.remainingDays} hari)`,
                  value: b.leaveTypeId
                }))
              "
              variant="outlined"
              density="comfortable"
              class="mb-3"
              required
            />

            <VRow>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="startDate"
                  label="Tanggal Mulai"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="endDate"
                  label="Tanggal Selesai"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  required
                />
              </VCol>
            </VRow>

            <VTextField
              :model-value="`${totalDays} Hari`"
              label="Total Hari Cuti"
              readonly
              variant="filled"
              density="comfortable"
              class="mb-3 font-weight-bold"
            />

            <VTextarea
              v-model="reason"
              label="Alasan Cuti *"
              rows="3"
              variant="outlined"
              class="mb-4"
              placeholder="Misal: Urusan keluarga, acara di Wamena..."
              :rules="[(v: string) => !!(v && v.trim()) || 'Alasan pengajuan cuti wajib diisi!']"
              required
            />

            <VBtn
              type="submit"
              color="primary"
              block
              size="large"
              :loading="submitting"
              prepend-icon="mdi-send-outline"
            >
              Kirim Pengajuan Cuti
            </VBtn>
          </VForm>
        </VCard>
      </VCol>

      <!-- Section 3: Status & Riwayat Request Leave -->
      <VCol cols="12" lg="7">
        <VCard border title="Status & Riwayat Pengajuan Cuti Saya" elevation="1">
          <template #prepend>
            <VAvatar color="info" variant="tonal" size="36">
              <VIcon icon="mdi-history" size="20" />
            </VAvatar>
          </template>

          <VDivider />

          <VDataTable :headers="headers" :items="myRequests" density="comfortable">
            <template #item.requestNumber="{ item }">
              <span class="font-mono font-weight-bold text-primary">{{ item.requestNumber }}</span>
              <div class="text-caption text-secondary">{{ item.createdAt.slice(0, 10) }}</div>
            </template>

            <template #item.leaveName="{ item }">
              <VChip size="small" variant="outlined" color="primary">{{ item.leaveName }}</VChip>
            </template>

            <template #item.dates="{ item }">
              <div class="font-weight-medium text-body-2">
                {{ item.startDate }} s/d {{ item.endDate }}
              </div>
            </template>

            <template #item.totalDays="{ item }">
              <span class="font-weight-bold">{{ item.totalDays }} Hari</span>
            </template>

            <template #item.reason="{ item }">
              <div class="text-body-2 max-w-xs text-truncate" :title="item.reason">
                {{ item.reason || '-' }}
              </div>
              <div v-if="item.rejectionReason" class="text-caption text-error font-weight-bold">
                Alasan Penolakan: {{ item.rejectionReason }}
              </div>
            </template>

            <template #item.status="{ item }">
              <VChip :color="statusColor(item.status)" size="small" variant="flat">
                {{ statusText(item.status) }}
              </VChip>
              <div v-if="item.approvedByName" class="text-caption text-secondary mt-1">
                Oleh: {{ item.approvedByName }}
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-6 text-secondary">
                <VIcon icon="mdi-calendar-blank-outline" size="40" class="mb-2 text-secondary" />
                <div>Belum ada riwayat pengajuan cuti.</div>
              </div>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
