<script setup lang="ts">
const { data: postData, refresh: refreshJobs } = await useAsyncData('public-careers-postings', () =>
  fetchApi<any[]>('/api/hris/recruitment/postings')
);

const { data: departmentsData } = await useAsyncData('public-careers-departments', () =>
  fetchApi<any[]>('/api/hris/departments')
);

const jobsList = computed(() => {
  const all = postData.value ?? [];
  return all.filter((j: any) => j.status === 'OPEN');
});

const departmentsList = computed(() => departmentsData.value ?? []);

const searchQuery = ref('');
const selectedDepartment = ref<string>('ALL');

const filteredJobs = computed(() => {
  return jobsList.value.filter((job: any) => {
    const matchesDept =
      selectedDepartment.value === 'ALL' || job.departmentId === selectedDepartment.value;
    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      job.positionTitle?.toLowerCase().includes(query) ||
      job.departmentName?.toLowerCase().includes(query) ||
      job.description?.toLowerCase().includes(query) ||
      job.requirements?.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });
});

// Apply Dialog Form
const applyDialog = ref(false);
const selectedJob = ref<any>(null);
const submitting = ref(false);
const applySuccess = ref(false);

const applyForm = ref({
  fullName: '',
  email: '',
  phone: '',
  resumeReference: '',
  notes: ''
});

function openApplyDialog(job: any) {
  selectedJob.value = job;
  applyForm.value = {
    fullName: '',
    email: '',
    phone: '',
    resumeReference: '',
    notes: ''
  };
  applySuccess.value = false;
  applyDialog.value = true;
}

async function handleSubmitApplication() {
  if (!applyForm.value.fullName || (!applyForm.value.email && !applyForm.value.phone)) {
    alert('Silakan lengkapi Nama Lengkap dan Kontak Email/Telepon.');
    return;
  }

  submitting.value = true;
  applySuccess.value = false;
  try {
    await fetchApi('/api/hris/recruitment/applicants', {
      method: 'POST',
      body: {
        jobPostingId: selectedJob.value.id,
        fullName: applyForm.value.fullName,
        email: applyForm.value.email || null,
        phone: applyForm.value.phone || null,
        resumeReference: applyForm.value.resumeReference || 'Uploaded Online Resume',
        notes: applyForm.value.notes || null
      }
    });

    applySuccess.value = true;
    setTimeout(() => {
      applyDialog.value = false;
      refreshJobs();
    }, 2000);
  } catch (err: any) {
    alert(err.message || 'Gagal mengirim lamaran pekerjaan.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="pa-6" style="max-width: 1200px; margin: 0 auto">
    <!-- Hero Header Banner -->
    <VCard
      color="primary"
      variant="flat"
      class="pa-8 mb-6 text-center text-white rounded-lg elevation-2"
    >
      <VIcon icon="mdi-airplane-takeoff" size="48" class="mb-3" />
      <h1 class="text-h3 font-weight-bold mb-2">Portal Karir & Kesempatan Bergabung</h1>
      <p class="text-subtitle-1 max-w-2xl mx-auto" style="opacity: 0.9">
        Mari terbang bersama PT. Associate Mission Aviation (AMA) melayani masyarakat Papua. Temukan
        peluang karir terbaik penerbangan perintis & operasional penerbangan.
      </p>

      <div class="mt-6 d-flex justify-center ga-3 flex-wrap">
        <VBtn
          color="white"
          variant="flat"
          class="text-primary font-weight-bold"
          prepend-icon="mdi-magnify"
          to="#job-openings"
        >
          Lihat Lowongan Tersedia ({{ jobsList.length }})
        </VBtn>
        <VBtn
          variant="outlined"
          color="white"
          prepend-icon="mdi-shield-account-outline"
          to="/hris/recruitment"
        >
          Dashboard Recruitment HR
        </VBtn>
      </div>
    </VCard>

    <!-- Search & Filter Controls -->
    <VCard id="job-openings" border class="pa-4 mb-6">
      <VRow>
        <VCol cols="12" sm="7">
          <VTextField
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari posisi pekerjaan (Captain, Technicians, FOO, HR...)..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>

        <VCol cols="12" sm="5">
          <VSelect
            v-model="selectedDepartment"
            label="Filter Departemen"
            :items="[
              { title: 'Semua Departemen', value: 'ALL' },
              ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
      </VRow>
    </VCard>

    <!-- Job Postings List Grid -->
    <VRow v-if="filteredJobs.length">
      <VCol v-for="job in filteredJobs" :key="job.id" cols="12" md="6">
        <VCard
          border
          class="pa-5 h-100 d-flex flex-column justify-space-between rounded-lg hover-elevation"
        >
          <div>
            <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
              <VChip size="small" color="primary" variant="flat" class="font-weight-bold">
                {{ job.departmentName || 'General' }}
              </VChip>

              <div class="d-flex ga-1">
                <VChip size="x-small" variant="outlined" color="info">
                  Stasiun {{ job.stationCode || 'HQ' }}
                </VChip>
                <VChip size="x-small" variant="tonal" color="success">
                  {{ job.employmentType }}
                </VChip>
              </div>
            </div>

            <h2 class="text-h5 font-weight-bold text-primary mb-2">{{ job.positionTitle }}</h2>

            <div class="text-caption text-secondary mb-3 d-flex align-center ga-3">
              <span>No: <strong class="font-mono">{{ job.postingNumber }}</strong></span>
              <span>&bull;</span>
              <span>Kuota: <strong class="text-primary">{{ job.vacancies }} Orang</strong></span>
              <span>&bull;</span>
              <span>Pelamar saat ini: <strong>{{ job.applicantCount }}</strong></span>
            </div>

            <VDivider class="my-3" />

            <div class="mb-3">
              <div class="text-caption font-weight-bold text-secondary mb-1">DESKRIPSI TUGAS:</div>
              <p class="text-body-2 text-high-emphasis whitespace-pre-wrap line-clamp-3">
                {{
                  job.description ||
                    'Bertanggung jawab atas operasional dan keselamatan tugas penerbangan PT. AMA.'
                }}
              </p>
            </div>

            <div v-if="job.requirements" class="mb-4">
              <div class="text-caption font-weight-bold text-secondary mb-1">
                KUALIFIKASI KUNCI:
              </div>
              <p class="text-body-2 text-secondary whitespace-pre-wrap line-clamp-2">
                {{ job.requirements }}
              </p>
            </div>
          </div>

          <div class="border-t pt-3 d-flex align-center justify-space-between">
            <span class="text-caption text-secondary">Diposting: {{ job.createdAt?.slice(0, 10) }}</span>
            <VBtn
              color="primary"
              size="small"
              prepend-icon="mdi-send-outline"
              class="font-weight-bold"
              @click="openApplyDialog(job)"
            >
              Lamar Pekerjaan Ini
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <div v-else class="text-center py-12 text-secondary">
      <VIcon icon="mdi-briefcase-search-outline" size="64" color="secondary" class="mb-3" />
      <div class="text-h6 font-weight-bold">Tidak ada lowongan terbuka saat ini</div>
      <p class="text-body-2 text-secondary">
        Silakan periksa kembali nanti atau gunakan kata kunci pencarian lain.
      </p>
    </div>

    <!-- Modal Form Apply Lowongan -->
    <VDialog v-model="applyDialog" max-width="600" scrollable>
      <VCard :title="`Formulir Lamaran: ${selectedJob?.positionTitle}`">
        <VDivider />
        <VCardText class="pa-4">
          <VAlert v-if="applySuccess" type="success" variant="tonal" class="mb-4">
            🎉 Lamaran pekerjaan Anda telah berhasil dikirim! Tim HR PT. AMA akan segera menghubungi
            Anda.
          </VAlert>

          <div v-else>
            <div class="pa-3 border rounded bg-primary-lighten-5 mb-4">
              <div class="font-weight-bold text-subtitle-2 text-primary">
                {{ selectedJob?.positionTitle }}
              </div>
              <div class="text-caption text-secondary">
                {{ selectedJob?.departmentName }} &bull; Kuota: {{ selectedJob?.vacancies }} Orang
              </div>
            </div>

            <VRow density="comfortable">
              <VCol cols="12">
                <VTextField
                  v-model="applyForm.fullName"
                  label="Nama Lengkap Pelamar *"
                  placeholder="Contoh: Captain Michael Wanggai"
                  variant="outlined"
                />
              </VCol>

              <VCol cols="12" sm="6">
                <VTextField
                  v-model="applyForm.email"
                  label="Alamat Email *"
                  placeholder="applicant@email.com"
                  type="email"
                  variant="outlined"
                />
              </VCol>

              <VCol cols="12" sm="6">
                <VTextField
                  v-model="applyForm.phone"
                  label="Nomor Telepon / WhatsApp *"
                  placeholder="08123456789"
                  variant="outlined"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="applyForm.resumeReference"
                  label="Link / Referensi Resume CV Online"
                  placeholder="https://linkedin.com/in/username atau file PDF drive link"
                  variant="outlined"
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="applyForm.notes"
                  label="Surat Lamaran / Ringkasan Pengalaman Kerja"
                  placeholder="Tuliskan pengalaman penerbangan/teknikal dan alasan ingin bergabung..."
                  rows="3"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="applyDialog = false">Batal</VBtn>
          <VBtn
            v-if="!applySuccess"
            color="primary"
            prepend-icon="mdi-send"
            :loading="submitting"
            @click="handleSubmitApplication()"
          >
            Kirim Lamaran Pekerjaan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.hover-elevation:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
  transition: box-shadow 0.2s ease-in-out;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
