<script setup lang="ts">
const todayStr = new Date().toISOString().slice(0, 10);
const nowTimeStr = new Date().toTimeString().slice(0, 5);

// Fetch Session
const { data: sessionData } = await useAsyncData('portal-employee-session-ovr', () =>
  fetchApi<any>('/api/auth/employee-session')
);
const employee = computed(() => sessionData.value);

// Fetch Regular Attendance History to check if checked out today
const { data: attendanceData, refresh: refreshAttendance } = await useAsyncData(
  'portal-ovr-attendance-history',
  () => fetchApi<any[]>('/api/hris/self-service/attendance-history')
);

// Fetch Employee Overtime Requests History
const { data: overtimeData, refresh: refreshOvertime } = await useAsyncData(
  'portal-employee-overtime-history',
  () => {
    if (!employee.value?.id) return Promise.resolve([]);
    return fetchApi<any[]>(`/api/hris/overtime?employeeId=${employee.value.id}`);
  }
);

const attendanceList = computed(() => attendanceData.value ?? []);
const overtimeList = computed(() => {
  if (Array.isArray(overtimeData.value)) return overtimeData.value;
  if (overtimeData.value && Array.isArray((overtimeData.value as any).items))
    return (overtimeData.value as any).items;
  return [];
});

// Today's regular shift attendance check
const todayAttendance = computed(() =>
  attendanceList.value.find((a: any) => a.attendanceDate === todayStr)
);

const checkInVal = computed(
  () => todayAttendance.value?.checkIn || todayAttendance.value?.checkInTime
);
const checkOutVal = computed(
  () => todayAttendance.value?.checkOut || todayAttendance.value?.checkOutTime
);

const hasCheckedIn = computed(() => Boolean(checkInVal.value));
const hasCheckedOut = computed(() => Boolean(checkOutVal.value));

// Form State
const overtimeDate = ref(todayStr);
const startTime = ref(nowTimeStr);
const endTime = ref('19:00');
const reason = ref('');
const submitting = ref(false);
const submitError = ref('');
const submitSuccess = ref(false);

const totalHours = computed(() => {
  if (!startTime.value || !endTime.value) return 0;
  const [h1, m1] = startTime.value.split(':').map(Number);
  const [h2, m2] = endTime.value.split(':').map(Number);
  const startMins = h1 * 60 + m1;
  const endMins = h2 * 60 + m2;
  const diff = (endMins - startMins) / 60;
  return diff > 0 ? Number(diff.toFixed(1)) : 0;
});

async function handleSubmitOvertime() {
  if (!employee.value?.id) return;
  if (!hasCheckedOut.value) {
    submitError.value =
      'Karyawan harus melakukan Absen Masuk dan Absen Keluar reguler terlebih dahulu!';
    return;
  }
  if (totalHours.value <= 0) {
    submitError.value = 'Jam selesai lembur harus lebih besar dari jam mulai!';
    return;
  }

  submitting.value = true;
  submitError.value = '';
  submitSuccess.value = false;

  try {
    await fetchApi('/api/hris/overtime', {
      method: 'POST',
      body: {
        employeeId: employee.value.id,
        overtimeDate: overtimeDate.value,
        startTime: startTime.value,
        endTime: endTime.value,
        totalHours: totalHours.value,
        reason: reason.value
      }
    });

    submitSuccess.value = true;
    reason.value = '';
    await refreshOvertime();
    await refreshAttendance();
  } catch (err: any) {
    submitError.value = err.message || 'Gagal mengajukan presensi lembur.';
  } finally {
    submitting.value = false;
  }
}

function statusColor(s: string) {
  if (s === 'APPROVED') return 'success';
  if (s === 'PENDING') return 'warning';
  return 'error';
}
</script>

<template>
  <div>
    <!-- Regular Shift Validation Status Banner -->
    <VCard border class="mb-6 pa-4">
      <div class="d-flex align-center ga-3">
        <VIcon
          :icon="hasCheckedOut ? 'mdi-check-circle' : 'mdi-alert-circle'"
          :color="hasCheckedOut ? 'success' : 'warning'"
          size="36"
        />
        <div>
          <div class="font-weight-bold text-h6">
            {{
              hasCheckedOut ? 'Absen Reguler Selesai (Siap Absen Lembur)' : 'Absen Lembur Terkunci'
            }}
          </div>
          <div class="text-subtitle-2 text-secondary">
            <template v-if="hasCheckedOut">
              Status Shift Reguler Hari Ini ({{ todayStr }}):
              <span class="text-success font-weight-bold">CHECK OUT at {{ checkOutVal }}</span>. Anda memenuhi syarat untuk melakukan presensi lembur.
            </template>
            <template v-else-if="hasCheckedIn">
              Status Shift Reguler Hari Ini ({{ todayStr }}):
              <span class="text-warning font-weight-bold">CHECK IN at {{ checkInVal }} (Belum Check Out)</span>. Anda wajib Check Out shift reguler terlebih dahulu sebelum absen lembur.
            </template>
            <template v-else>
              Status Shift Reguler Hari Ini ({{ todayStr }}):
              <span class="text-error font-weight-bold">Belum Absen Masuk Reguler</span>. Anda harus
              menyelesaikan absen masuk & keluar shift harian reguler terlebih dahulu.
            </template>
          </div>
        </div>
      </div>
    </VCard>

    <VRow class="mb-6">
      <!-- Overtime Check-In Form -->
      <VCol cols="12" md="6">
        <VCard border title="Form Presensi & Pengajuan Lembur">
          <VCardText class="pa-4">
            <VAlert
              v-if="submitError"
              type="error"
              variant="tonal"
              class="mb-4 text-caption"
              closable
            >
              {{ submitError }}
            </VAlert>

            <VAlert
              v-if="submitSuccess"
              type="success"
              variant="tonal"
              class="mb-4 text-caption"
              closable
            >
              Presensi lembur berhasil diajukan dan menunggu persetujuan supervisor/HR.
            </VAlert>

            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="overtimeDate"
                  label="Tanggal Lembur"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </VCol>

              <VCol cols="6">
                <VTextField
                  v-model="startTime"
                  label="Jam Mulai Lembur"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </VCol>

              <VCol cols="6">
                <VTextField
                  v-model="endTime"
                  label="Jam Selesai Lembur"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </VCol>

              <VCol cols="12">
                <div
                  class="d-flex align-center justify-space-between bg-grey-lighten-4 pa-3 rounded mb-3"
                >
                  <span class="text-caption font-weight-bold text-secondary">ESTIMASI TOTAL JAM LEMBUR</span>
                  <span class="text-h6 font-weight-bold text-primary">{{ totalHours }} Jam</span>
                </div>
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="reason"
                  label="Alasan / Rincian Pekerjaan Lembur"
                  placeholder="Instruksi lembur penerbangan darurat, maintenance pesawat..."
                  variant="outlined"
                  rows="3"
                  density="compact"
                />
              </VCol>
            </VRow>

            <VBtn
              block
              color="primary"
              size="large"
              prepend-icon="mdi-clock-plus-outline"
              :loading="submitting"
              :disabled="!hasCheckedOut"
              @click="handleSubmitOvertime()"
            >
              Submit Presensi Lembur
            </VBtn>

            <div
              v-if="!hasCheckedOut"
              class="text-center text-caption text-error mt-2 font-weight-medium"
            >
              * Tombol terkunci karena Anda belum menyelesaikan Check Out shift reguler hari ini.
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Employee Overtime History Table -->
      <VCol cols="12" md="6">
        <VCard border title="Riwayat Absen & Pengajuan Lembur Saya">
          <VTable density="compact" hover>
            <thead>
              <tr>
                <th>No. Request</th>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in overtimeList" :key="item.id">
                <td class="font-mono text-caption font-weight-bold">{{ item.requestNumber }}</td>
                <td class="text-caption">{{ item.overtimeDate }}</td>
                <td class="text-caption font-mono">{{ item.startTime }} - {{ item.endTime }}</td>
                <td class="text-caption font-weight-bold">{{ item.totalHours }} Jam</td>
                <td>
                  <VChip :color="statusColor(item.status)" size="x-small" variant="flat">
                    {{ item.status }}
                  </VChip>
                </td>
              </tr>
              <tr v-if="overtimeList.length === 0">
                <td colspan="5" class="text-center text-secondary py-4">
                  Belum ada riwayat pengajuan lembur.
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
