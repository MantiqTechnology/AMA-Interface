<script setup lang="ts">
const search = ref('');
const statusFilter = ref<string | null>(null);

const { data: empData, refresh } = await useAsyncData(
  'employees-list',
  () =>
    fetchApi<any>('/api/hris/employees', {
      params: {
        search: search.value || undefined,
        employmentStatus: statusFilter.value || undefined
      }
    }),
  { watch: [search, statusFilter] }
);

const { data: departmentsData } = await useAsyncData('active-departments-employees', () =>
  fetchApi<any[]>('/api/hris/departments')
);

const employees = computed(() => empData.value?.items ?? []);
const departmentsList = computed(() => departmentsData.value ?? []);

const headers = [
  { title: 'NIP / Kode', key: 'employeeCode' },
  { title: 'Nama Lengkap', key: 'fullName' },
  { title: 'Divisi / Departemen', key: 'departmentName' },
  { title: 'Stasiun Utama', key: 'stationCode' },
  { title: 'Jabatan', key: 'positionTitle' },
  { title: 'Tipe', key: 'employmentType' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

// Single Employee Creation Modal
const createDialog = ref(false);
const savingEmp = ref(false);
const empForm = ref({
  employeeCode: '',
  fullName: '',
  departmentId: '',
  positionTitle: '',
  employmentStatus: 'ACTIVE',
  employmentType: 'PERMANENT',
  phone: '',
  email: '',
  joinDate: new Date().toISOString().slice(0, 10),
  bankName: 'Bank Mandiri',
  bankAccountNumber: '',
  bankAccountName: '',
  taxIdNumber: '',
  bpjsKesehatanNumber: '',
  bpjsTkNumber: ''
});

function openCreateEmployeeDialog() {
  empForm.value = {
    employeeCode: '',
    fullName: '',
    departmentId: departmentsList.value[0]?.id || '',
    positionTitle: '',
    employmentStatus: 'ACTIVE',
    employmentType: 'PERMANENT',
    phone: '',
    email: '',
    joinDate: new Date().toISOString().slice(0, 10),
    bankName: 'Bank Mandiri',
    bankAccountNumber: '',
    bankAccountName: '',
    taxIdNumber: '',
    bpjsKesehatanNumber: '',
    bpjsTkNumber: ''
  };
  createDialog.value = true;
}

async function handleSaveSingleEmployee() {
  if (!empForm.value.fullName || !empForm.value.positionTitle) {
    alert('Silakan isi Nama Lengkap dan Jabatan.');
    return;
  }
  savingEmp.value = true;
  try {
    if (!empForm.value.bankAccountName) {
      empForm.value.bankAccountName = empForm.value.fullName;
    }
    await fetchApi('/api/hris/employees', {
      method: 'POST',
      body: empForm.value
    });
    createDialog.value = false;
    refresh();
  } catch (err: any) {
    alert(err.message || 'Gagal menambahkan karyawan baru.');
  } finally {
    savingEmp.value = false;
  }
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Database Karyawan</h1>
        <p class="text-subtitle-1 text-secondary">
          Kelola data karyawan PT. AMA seluruh divisi dan stasiun
        </p>
      </div>
      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-account-plus" color="primary" @click="openCreateEmployeeDialog()">
          Tambah Karyawan Baru
        </VBtn>
        <VBtn prepend-icon="mdi-file-upload-outline" variant="outlined" to="/hris/employees/import">
          Import CSV / Excel
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="text" @click="refresh()">Refresh</VBtn>
      </div>
    </div>

    <VCard border class="pa-4 mb-4">
      <VRow>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            v-model="search"
            density="compact"
            hide-details
            label="Cari nama, NIP, atau jabatan"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VSelect
            v-model="statusFilter"
            density="compact"
            hide-details
            label="Status Karyawan"
            :items="[
              { title: 'Semua Status', value: null },
              { title: 'Aktif', value: 'ACTIVE' },
              { title: 'Non-Aktif', value: 'INACTIVE' }
            ]"
            variant="outlined"
          />
        </VCol>
      </VRow>
    </VCard>

    <VCard border>
      <VDataTable :headers="headers" :items="employees" :search="search">
        <template #item.employeeCode="{ item }">
          <span class="font-mono font-weight-bold text-primary">{{ item.employeeCode }}</span>
        </template>

        <template #item.fullName="{ item }">
          <div class="font-weight-medium text-body-1">{{ item.fullName }}</div>
          <div v-if="item.crewLicenseType" class="text-caption text-primary">
            <VIcon icon="mdi-airplane" size="14" class="mr-1" />{{ item.crewLicenseType }} ({{
              item.crewLicenseNumber
            }})
          </div>
        </template>

        <template #item.departmentName="{ item }">
          <VChip size="small" variant="tonal" color="primary">
            {{ item.departmentName || 'General' }}
          </VChip>
        </template>

        <template #item.stationCode="{ item }">
          <VChip size="small" variant="outlined">{{ item.stationCode || 'HQ' }}</VChip>
        </template>

        <template #item.employmentType="{ item }">
          <VChip size="small" color="info" variant="tonal">{{ item.employmentType }}</VChip>
        </template>

        <template #item.status="{ item }">
          <VChip
            :color="item.employmentStatus === 'ACTIVE' ? 'success' : 'error'"
            size="small"
            variant="flat"
          >
            {{ item.employmentStatus }}
          </VChip>
        </template>

        <template #item.actions="{ item }">
          <VBtn
            size="small"
            variant="outlined"
            color="primary"
            prepend-icon="mdi-eye"
            :to="`/hris/employees/${item.id}`"
          >
            Detail Karyawan
          </VBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal Form Create Single Employee -->
    <VDialog v-model="createDialog" max-width="700" scrollable>
      <VCard title="Tambah Karyawan Baru">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.fullName"
                label="Nama Lengkap Karyawan *"
                placeholder="Captain Daniel Waker, Eko Prasetyo..."
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.employeeCode"
                label="NIP / Kode Karyawan"
                placeholder="EMP-0071 (Auto generate jika kosong)"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VSelect
                v-model="empForm.departmentId"
                label="Departemen / Divisi *"
                :items="departmentsList"
                item-title="departmentName"
                item-value="id"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.positionTitle"
                label="Jabatan / Position *"
                placeholder="Captain, First Officer, Avionics Engineer..."
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VSelect
                v-model="empForm.employmentType"
                label="Status Ikatan Kerja"
                :items="['PERMANENT', 'CONTRACT', 'PROBATION']"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.joinDate"
                label="Tanggal Bergabung (Join Date)"
                type="date"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.phone"
                label="Nomor Telepon / WhatsApp"
                placeholder="08123456789"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.email"
                label="Email Address"
                placeholder="employee@ama.co.id"
                variant="outlined"
              />
            </VCol>

            <!-- Bank & Tax Details -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="text-caption font-weight-bold text-secondary mb-2">
                REKENING BANK, NPWP & BPJS
              </div>
            </VCol>

            <VCol cols="12" sm="4">
              <VSelect
                v-model="empForm.bankName"
                label="Nama Bank"
                :items="['Bank Mandiri', 'BCA', 'BRI', 'BNI', 'Bank Papua', 'Lainnya']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="4">
              <VTextField
                v-model="empForm.bankAccountNumber"
                label="Nomor Rekening Bank"
                placeholder="1370019284711"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="4">
              <VTextField
                v-model="empForm.taxIdNumber"
                label="NPWP (Tax ID)"
                placeholder="09.234.567.8-012.000"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.bpjsKesehatanNumber"
                label="No. BPJS Kesehatan"
                placeholder="0001928471625"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="empForm.bpjsTkNumber"
                label="No. BPJS Ketenagakerjaan"
                placeholder="21098471625"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="createDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingEmp"
            @click="handleSaveSingleEmployee()"
          >
            Simpan Data Karyawan
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
