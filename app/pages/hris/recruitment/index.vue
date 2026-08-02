<script setup lang="ts">
const { data: postData, refresh: refreshPostings } = await useAsyncData(
  'recruitment-postings',
  () => fetchApi<any[]>('/api/hris/recruitment/postings')
);
const postings = computed(() => postData.value ?? []);

const { data: appData, refresh: refreshApps } = await useAsyncData('recruitment-applicants', () =>
  fetchApi<any[]>('/api/hris/recruitment/applicants')
);
const applicants = computed(() => appData.value ?? []);

const { data: departmentsData } = await useAsyncData('recruitment-departments', () =>
  fetchApi<any[]>('/api/hris/departments')
);
const departmentsList = computed(() => departmentsData.value ?? []);

const { data: employeesData } = await useAsyncData('recruitment-interviewers', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);
const employeesList = computed(() => {
  if (Array.isArray(employeesData.value)) return employeesData.value;
  if (employeesData.value && Array.isArray((employeesData.value as any).items))
    return (employeesData.value as any).items;
  return [];
});

const activeTab = ref('postings');

const postingHeaders = [
  { title: 'No. Lowongan', key: 'postingNumber' },
  { title: 'Posisi Lowongan', key: 'positionTitle' },
  { title: 'Departemen', key: 'departmentName' },
  { title: 'Stasiun', key: 'stationCode' },
  { title: 'Tipe', key: 'employmentType' },
  { title: 'Kuota', key: 'vacancies' },
  { title: 'Pelamar', key: 'applicantCount' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

const applicantHeaders = [
  { title: 'No. Pelamar', key: 'applicantNumber' },
  { title: 'Nama Lengkap', key: 'fullName' },
  { title: 'Posisi Dilamar', key: 'positionTitle' },
  { title: 'Kontak', key: 'contact' },
  { title: 'Tahap Pipeline', key: 'stage' },
  { title: 'Interviewer', key: 'interviewerName' },
  { title: 'Aksi Stage & Interview', key: 'actions', sortable: false }
];

// Modal 1: Job Posting CRUD
const postingDialog = ref(false);
const editingPostingId = ref<string | null>(null);
const postingForm = ref({
  positionTitle: '',
  departmentId: '',
  stationId: '' as string | null,
  employmentType: 'PERMANENT',
  vacancies: 1,
  description: '',
  requirements: '',
  status: 'OPEN'
});
const savingPosting = ref(false);

function openNewPostingDialog() {
  editingPostingId.value = null;
  postingForm.value = {
    positionTitle: '',
    departmentId: departmentsList.value[0]?.id || '',
    stationId: null,
    employmentType: 'PERMANENT',
    vacancies: 1,
    description: '',
    requirements: '',
    status: 'OPEN'
  };
  postingDialog.value = true;
}

function openEditPostingDialog(p: any) {
  editingPostingId.value = p.id;
  postingForm.value = {
    positionTitle: p.positionTitle,
    departmentId: p.departmentId,
    stationId: p.stationId || null,
    employmentType: p.employmentType || 'PERMANENT',
    vacancies: p.vacancies || 1,
    description: p.description || '',
    requirements: p.requirements || '',
    status: p.status || 'OPEN'
  };
  postingDialog.value = true;
}

async function handleSavePosting() {
  if (!postingForm.value.positionTitle || !postingForm.value.departmentId) {
    alert('Silakan isi Posisi Lowongan dan Departemen.');
    return;
  }
  savingPosting.value = true;
  try {
    if (editingPostingId.value) {
      await fetchApi(`/api/hris/recruitment/postings/${editingPostingId.value}`, {
        method: 'PUT',
        body: postingForm.value
      });
    } else {
      await fetchApi('/api/hris/recruitment/postings', {
        method: 'POST',
        body: postingForm.value
      });
    }
    postingDialog.value = false;
    refreshPostings();
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan lowongan pekerjaan.');
  } finally {
    savingPosting.value = false;
  }
}

async function handleClosePosting(p: any) {
  if (!confirm(`Tutup lowongan pekerjaan "${p.positionTitle}"?`)) return;
  try {
    await fetchApi(`/api/hris/recruitment/postings/${p.id}`, { method: 'DELETE' });
    refreshPostings();
  } catch (err: any) {
    alert(err.message || 'Gagal menutup lowongan.');
  }
}

// Modal 2: Applicant Stage & Interview Scheduling
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
    refreshPostings();
  } catch (err: any) {
    alert(err.message || 'Gagal mengubah tahap pipeline pelamar.');
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
      return 'Interview User';
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

function refreshAll() {
  refreshPostings();
  refreshApps();
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Rekrutmen & ATS Applicant Pipeline</h1>
        <p class="text-subtitle-1 text-secondary">
          Kelola lowongan pekerjaan, penugasan interviewer, pipeline seleksi pelamar, dan onboarding
          PT. AMA
        </p>
      </div>

      <div class="d-flex ga-2">
        <VBtn
          prepend-icon="mdi-briefcase-search-outline"
          color="success"
          to="/careers"
          target="_blank"
        >
          Portal Karir Publik (Apply)
        </VBtn>
        <VBtn prepend-icon="mdi-briefcase-plus" color="primary" @click="openNewPostingDialog()">
          Buat Lowongan Pekerjaan Baru
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refreshAll()">Refresh</VBtn>
      </div>
    </div>

    <VCard border elevation="1">
      <VTabs v-model="activeTab" color="primary">
        <VTab value="postings" prepend-icon="mdi-briefcase-outline">
          Lowongan Pekerjaan ({{ postings.length }})
        </VTab>
        <VTab value="applicants" prepend-icon="mdi-account-search-outline">
          Pipeline Pelamar ({{ applicants.length }})
        </VTab>
      </VTabs>
      <VDivider />

      <VCardText class="pa-4">
        <VWindow v-model="activeTab">
          <!-- Tab 1: Job Postings -->
          <VWindowItem value="postings">
            <VDataTable :headers="postingHeaders" :items="postings">
              <template #item.postingNumber="{ item }">
                <span class="font-mono font-weight-bold text-primary">{{
                  item.postingNumber
                }}</span>
              </template>

              <template #item.positionTitle="{ item }">
                <NuxtLink
                  :to="`/hris/recruitment/jobs/${item.id}`"
                  class="font-weight-bold text-primary text-decoration-none"
                >
                  {{ item.positionTitle }}
                </NuxtLink>
              </template>

              <template #item.stationCode="{ item }">
                <VChip size="small" variant="outlined">{{ item.stationCode || 'HQ' }}</VChip>
              </template>

              <template #item.vacancies="{ item }">
                <span>{{ item.vacancies }} Orang</span>
              </template>

              <template #item.applicantCount="{ item }">
                <VChip color="info" size="small" variant="flat">
                  {{ item.applicantCount }} Pelamar
                </VChip>
              </template>

              <template #item.status="{ item }">
                <VChip
                  :color="item.status === 'OPEN' ? 'success' : 'secondary'"
                  size="small"
                  variant="flat"
                >
                  {{ item.status }}
                </VChip>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex ga-1">
                  <VBtn
                    size="small"
                    variant="outlined"
                    color="primary"
                    prepend-icon="mdi-eye"
                    :to="`/hris/recruitment/jobs/${item.id}`"
                  >
                    Detail Pipeline
                  </VBtn>
                  <VBtn
                    size="small"
                    variant="text"
                    color="primary"
                    icon="mdi-pencil"
                    @click="openEditPostingDialog(item)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    color="error"
                    icon="mdi-close-circle"
                    title="Tutup Lowongan"
                    @click="handleClosePosting(item)"
                  />
                </div>
              </template>
            </VDataTable>
          </VWindowItem>

          <!-- Tab 2: Applicants Pipeline -->
          <VWindowItem value="applicants">
            <VDataTable :headers="applicantHeaders" :items="applicants">
              <template #item.applicantNumber="{ item }">
                <span class="font-mono font-weight-bold text-primary">{{
                  item.applicantNumber
                }}</span>
              </template>

              <template #item.fullName="{ item }">
                <div class="font-weight-bold">{{ item.fullName }}</div>
                <div v-if="item.resumeReference" class="text-caption text-secondary">
                  CV: {{ item.resumeReference }}
                </div>
              </template>

              <template #item.contact="{ item }">
                <div class="text-caption">{{ item.email || '-' }}</div>
                <div class="text-caption text-secondary">{{ item.phone || '-' }}</div>
              </template>

              <template #item.stage="{ item }">
                <VChip
                  :color="stageColor(item.stage)"
                  size="small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ formatStageLabel(item.stage) }}
                </VChip>
              </template>

              <template #item.interviewerName="{ item }">
                <div v-if="item.interviewerName" class="d-flex align-center ga-1">
                  <VIcon icon="mdi-account-tie" color="primary" size="16" />
                  <span class="text-body-2 font-weight-medium">{{ item.interviewerName }}</span>
                </div>
                <span v-else class="text-caption text-secondary">-</span>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex ga-1">
                  <VBtn
                    size="small"
                    color="primary"
                    variant="outlined"
                    prepend-icon="mdi-format-list-checks"
                    @click="openStageDialog(item)"
                  >
                    Update Stage & Interviewer
                  </VBtn>
                </div>
              </template>
            </VDataTable>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>

    <!-- Modal 1: Job Posting CRUD Dialog -->
    <VDialog v-model="postingDialog" max-width="650" scrollable>
      <VCard :title="editingPostingId ? 'Edit Lowongan Pekerjaan' : 'Buat Lowongan Pekerjaan Baru'">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12" sm="7">
              <VTextField
                v-model="postingForm.positionTitle"
                label="Posisi Lowongan Pekerjaan *"
                placeholder="Captain DHC-6 Twin Otter, FOO, HR Specialist..."
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="5">
              <VSelect
                v-model="postingForm.departmentId"
                label="Departemen Target *"
                :items="departmentsList"
                item-title="departmentName"
                item-value="id"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="4">
              <VSelect
                v-model="postingForm.employmentType"
                label="Status Ikatan Kerja"
                :items="['PERMANENT', 'CONTRACT', 'PROBATION']"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="4">
              <VTextField
                v-model.number="postingForm.vacancies"
                label="Jumlah Kuota"
                type="number"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="4">
              <VSelect
                v-model="postingForm.status"
                label="Status Lowongan *"
                :items="['OPEN', 'DRAFT', 'CLOSED', 'CANCELLED', 'FILLED']"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="postingForm.description"
                label="Deskripsi Pekerjaan (Job Description)"
                rows="3"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="postingForm.requirements"
                label="Kualifikasi & Syarat (Requirements)"
                rows="3"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="postingDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingPosting"
            @click="handleSavePosting()"
          >
            Simpan Lowongan Pekerjaan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal 2: Applicant Stage & Interview Scheduling Dialog -->
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
