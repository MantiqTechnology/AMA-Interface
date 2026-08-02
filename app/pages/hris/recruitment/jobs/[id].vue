<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: jobData, refresh: refreshJob } = await useAsyncData(`job-detail-${id}`, () =>
  fetchApi<any>(`/api/hris/recruitment/postings/${id}`)
);

const { data: appData, refresh: refreshApps } = await useAsyncData(`job-applicants-${id}`, () =>
  fetchApi<any[]>('/api/hris/recruitment/applicants', {
    params: { jobPostingId: id }
  })
);

const { data: employeesData } = await useAsyncData('active-interviewers', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);

const job = computed(() => jobData.value);
const applicants = computed(() => appData.value ?? []);
const employeesList = computed(() => {
  if (Array.isArray(employeesData.value)) return employeesData.value;
  if (employeesData.value && Array.isArray((employeesData.value as any).items))
    return (employeesData.value as any).items;
  return [];
});

// Stage Transition & Interview Schedule Dialog
const stageDialog = ref(false);
const selectedApp = ref<any>(null);
const stageForm = ref({
  stage: 'INTERVIEW_HR',
  interviewerEmployeeId: '' as string | null,
  interviewScheduledAt: '',
  notes: ''
});
const savingStage = ref(false);

function openStageDialog(app: any) {
  selectedApp.value = app;
  stageForm.value = {
    stage: app.stage || 'INTERVIEW_HR',
    interviewerEmployeeId: app.interviewerEmployeeId || employeesList.value[0]?.id || null,
    interviewScheduledAt: app.interviewScheduledAt || new Date().toISOString().slice(0, 16),
    notes: app.notes || ''
  };
  stageDialog.value = true;
}

async function handleSaveStage() {
  if (!selectedApp.value) return;
  savingStage.value = true;
  try {
    await fetchApi(`/api/hris/recruitment/applicants/${selectedApp.value.id}/stage`, {
      method: 'PUT',
      body: {
        stage: stageForm.value.stage,
        interviewerEmployeeId: stageForm.value.interviewerEmployeeId || null,
        interviewScheduledAt: stageForm.value.interviewScheduledAt || null,
        notes: stageForm.value.notes
      }
    });
    stageDialog.value = false;
    refreshApps();
    refreshJob();
  } catch (err: any) {
    alert(err.message || 'Gagal merubah tahap pipeline pelamar.');
  } finally {
    savingStage.value = false;
  }
}

function stageColor(s: string) {
  switch (s) {
    case 'ACCEPTED':
      return 'success';
    case 'OFFERING':
    case 'OFFERED':
      return 'info';
    case 'INTERVIEW_HR':
    case 'INTERVIEW_USER':
    case 'INTERVIEW':
      return 'primary';
    case 'FLIGHT_CHECK':
      return 'warning';
    case 'REJECTED':
    case 'WITHDRAWN':
      return 'error';
    default:
      return 'secondary';
  }
}

function formatStageLabel(s: string) {
  switch (s) {
    case 'APPLIED':
      return 'Pelamar Baru';
    case 'SCREENING':
      return 'Seleksi Berkas';
    case 'INTERVIEW_HR':
      return 'Interview HR';
    case 'INTERVIEW_USER':
      return 'Interview User / Tech';
    case 'FLIGHT_CHECK':
      return 'Flight Check / Sim';
    case 'OFFERING':
    case 'OFFERED':
      return 'Offering Letter';
    case 'ACCEPTED':
      return 'Diterima & Onboard';
    case 'REJECTED':
      return 'Ditolak';
    default:
      return s;
  }
}
</script>

<template>
  <div v-if="job" class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <div class="d-flex align-center ga-2 mb-1">
          <VChip size="small" color="primary" variant="flat">{{ job.postingNumber }}</VChip>
          <VChip
            size="small"
            :color="job.status === 'OPEN' ? 'success' : 'secondary'"
            variant="tonal"
          >
            {{ job.status }}
          </VChip>
        </div>
        <h1 class="text-h4 font-weight-bold text-primary">{{ job.positionTitle }}</h1>
        <p class="text-subtitle-1 text-secondary">
          Departemen {{ job.departmentName }} &bull; Stasiun {{ job.stationCode || 'HQ' }} &bull;
          Kuota: {{ job.vacancies }} Orang
        </p>
      </div>

      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/recruitment">
          Kembali ke Rekrutmen
        </VBtn>
        <VBtn
          prepend-icon="mdi-refresh"
          variant="text"
          @click="
            refreshJob();
            refreshApps();
          "
        >
          Refresh
        </VBtn>
      </div>
    </div>

    <!-- Job Description & Detail Overview Card -->
    <VRow class="mb-6">
      <VCol cols="12" md="8">
        <VCard border class="pa-4 h-100">
          <h3 class="text-subtitle-1 font-weight-bold text-primary mb-2">
            Deskripsi & Syarat Pekerjaan
          </h3>
          <div class="mb-4">
            <div class="text-caption font-weight-bold text-secondary">DESKRIPSI TUGAS:</div>
            <div class="text-body-2 text-high-emphasis whitespace-pre-wrap">
              {{ job.description || 'Tidak ada deskripsi rinci.' }}
            </div>
          </div>

          <div>
            <div class="text-caption font-weight-bold text-secondary">KUALIFIKASI & SYARAT:</div>
            <div class="text-body-2 text-high-emphasis whitespace-pre-wrap">
              {{ job.requirements || 'Tidak ada syarat khusus.' }}
            </div>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard border class="pa-4 h-100 bg-surface">
          <h3 class="text-subtitle-1 font-weight-bold text-primary mb-3">
            Statistik Pipeline Lowongan
          </h3>
          <div class="d-flex justify-space-between align-center mb-2 pb-2 border-b">
            <span class="text-body-2 text-secondary">Total Pelamar:</span>
            <span class="font-weight-bold text-h6 text-primary">{{ applicants.length }} Pelamar</span>
          </div>
          <div class="d-flex justify-space-between align-center mb-2 pb-2 border-b">
            <span class="text-body-2 text-secondary">Kuota Karyawan:</span>
            <span class="font-weight-bold text-body-1 text-high-emphasis">{{ job.vacancies }} Orang</span>
          </div>
          <div class="d-flex justify-space-between align-center">
            <span class="text-body-2 text-secondary">Tipe Pekerjaan:</span>
            <VChip size="small" color="info" variant="tonal">{{ job.employmentType }}</VChip>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Applicant Pipeline Table for this Job -->
    <VCard border>
      <VCardTitle class="pa-4 border-b d-flex align-center justify-space-between">
        <span class="text-h6 font-weight-bold text-primary">Daftar Pipeline Pelamar Lowongan Ini</span>
        <VChip size="small" color="primary" variant="flat">{{ applicants.length }} Candidat</VChip>
      </VCardTitle>

      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>No. Pelamar</th>
            <th>Nama Pelamar</th>
            <th>Kontak Email & Telepon</th>
            <th>Tahap Pipeline</th>
            <th>Interviewer Ditugaskan</th>
            <th>Jadwal Interview</th>
            <th>Aksi Stage</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in applicants" :key="app.id">
            <td class="font-mono font-weight-bold text-primary">{{ app.applicantNumber }}</td>
            <td>
              <div class="font-weight-bold text-body-1">{{ app.fullName }}</div>
              <div v-if="app.resumeReference" class="text-caption text-secondary">
                CV: {{ app.resumeReference }}
              </div>
            </td>
            <td>
              <div class="text-body-2">{{ app.email || '-' }}</div>
              <div class="text-caption text-secondary">{{ app.phone || '-' }}</div>
            </td>
            <td>
              <VChip
                size="small"
                :color="stageColor(app.stage)"
                variant="flat"
                class="font-weight-bold"
              >
                {{ formatStageLabel(app.stage) }}
              </VChip>
            </td>
            <td>
              <div v-if="app.interviewerName" class="d-flex align-center ga-1">
                <VIcon icon="mdi-account-tie" color="primary" size="16" />
                <span class="text-body-2 font-weight-medium">{{ app.interviewerName }}</span>
              </div>
              <span v-else class="text-caption text-secondary">Belum diapplikasikan</span>
            </td>
            <td>
              <span
                v-if="app.interviewScheduledAt"
                class="text-caption font-weight-bold text-primary"
              >
                📅 {{ app.interviewScheduledAt.replace('T', ' ') }}
              </span>
              <span v-else class="text-caption text-secondary">-</span>
            </td>
            <td>
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-format-list-checks"
                @click="openStageDialog(app)"
              >
                Update Stage & Interview
              </VBtn>
            </td>
          </tr>
          <tr v-if="!applicants.length">
            <td colspan="7" class="text-center py-6 text-secondary">
              Belum ada pelamar yang mendaftar pada lowongan ini.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <!-- Dialog: Update Stage & Assign Interviewer -->
    <VDialog v-model="stageDialog" max-width="600">
      <VCard :title="`Update Stage Pipeline: ${selectedApp?.fullName}`">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">TAHAP PIPELINE BARU *</label>
              <VSelect
                v-model="stageForm.stage"
                :items="[
                  { title: '1. Pelamar Baru (APPLIED)', value: 'APPLIED' },
                  { title: '2. Seleksi Berkas (SCREENING)', value: 'SCREENING' },
                  { title: '3. Interview HR (INTERVIEW_HR)', value: 'INTERVIEW_HR' },
                  { title: '4. Interview User / Tech (INTERVIEW_USER)', value: 'INTERVIEW_USER' },
                  { title: '5. Flight Check / Simulator (FLIGHT_CHECK)', value: 'FLIGHT_CHECK' },
                  { title: '6. Penawaran Kerja (OFFERING)', value: 'OFFERING' },
                  { title: '7. Diterima & Onboard (ACCEPTED)', value: 'ACCEPTED' },
                  { title: '8. Ditolak (REJECTED)', value: 'REJECTED' }
                ]"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">ASSIGN INTERVIEWER / PENGUJI</label>
              <VSelect
                v-model="stageForm.interviewerEmployeeId"
                label="Pilih Karyawan / Manager Penguji"
                :items="[
                  { title: 'Belum Menugaskan Interviewer', value: null },
                  ...employeesList.map((e: any) => ({
                    title: `${e.fullName} (${e.positionTitle})`,
                    value: e.id
                  }))
                ]"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="stageForm.interviewScheduledAt"
                label="Jadwal Waktu Interview"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="stageForm.notes"
                label="Catatan Hasil Evaluasi / Interview"
                rows="3"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="stageDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingStage"
            @click="handleSaveStage()"
          >
            Simpan & Update Stage
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
