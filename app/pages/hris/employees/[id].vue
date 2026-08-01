<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: employee, refresh } = await useAsyncData(`employee-${id}`, () =>
  fetchApi<any>(`/api/hris/employees/${id}`)
);

const activeTab = ref('biodata');

function formatCurrency(val?: number) {
  if (!val) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

// Form state for biodata update
const editForm = reactive({
  phone: '',
  email: '',
  address: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  taxIdNumber: '',
  bpjsKesehatanNumber: '',
  bpjsTkNumber: '',
  maritalStatus: 'SINGLE',
  numberOfDependents: 0,
  ptkpStatus: 'TK/0',
  basicSalary: 0,
  positionAllowance: 0,
  flightRatePerHour: 0
});

watch(
  employee,
  (val) => {
    if (val) {
      Object.assign(editForm, {
        phone: val.phone || '',
        email: val.email || '',
        address: val.address || '',
        bankName: val.bankName || '',
        bankAccountNumber: val.bankAccountNumber || '',
        bankAccountName: val.bankAccountName || '',
        taxIdNumber: val.taxIdNumber || '',
        bpjsKesehatanNumber: val.bpjsKesehatanNumber || '',
        bpjsTkNumber: val.bpjsTkNumber || '',
        maritalStatus: val.maritalStatus || 'SINGLE',
        numberOfDependents: val.numberOfDependents || 0,
        ptkpStatus: val.ptkpStatus || 'TK/0',
        basicSalary: val.salaryDetails?.basicSalary || 0,
        positionAllowance: val.salaryDetails?.positionAllowance || 0,
        flightRatePerHour: val.salaryDetails?.flightRatePerHour || 0
      });
    }
  },
  { immediate: true }
);

const saving = ref(false);
const saveSuccess = ref(false);

async function saveBiodata() {
  saving.value = true;
  saveSuccess.value = false;
  try {
    await fetchApi(`/api/hris/employees/${id}`, {
      method: 'PUT',
      body: editForm
    });
    saveSuccess.value = true;
    refresh();
  } finally {
    saving.value = false;
  }
}

// PIN setting
const pinVal = ref('');
const settingPin = ref(false);
const pinSuccess = ref(false);

async function savePin() {
  if (pinVal.value.length !== 6) return;
  settingPin.value = true;
  pinSuccess.value = false;
  try {
    await fetchApi(`/api/hris/employees/${id}/pin`, {
      method: 'POST',
      body: { pin: pinVal.value }
    });
    pinSuccess.value = true;
    pinVal.value = '';
  } finally {
    settingPin.value = false;
  }
}
</script>

<template>
  <div v-if="employee" class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div class="d-flex align-center ga-4">
        <VAvatar color="primary" size="64" class="text-h4 font-weight-bold">
          {{ employee.fullName.charAt(0) }}
        </VAvatar>
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">{{ employee.fullName }}</h1>
          <div class="d-flex align-center ga-2 text-subtitle-1 text-secondary">
            <span class="font-mono font-weight-bold">{{ employee.employeeCode }}</span>
            <span>&bull;</span>
            <span>{{ employee.positionTitle }}</span>
            <span>&bull;</span>
            <VChip size="small" variant="outlined">{{ employee.departmentName || 'HQ' }}</VChip>
          </div>
        </div>
      </div>
      <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/employees">
        Kembali ke Daftar
      </VBtn>
    </div>

    <VCard border>
      <VTabs v-model="activeTab" color="primary">
        <VTab value="biodata" prepend-icon="mdi-card-account-details-outline">
          Personal & Kontak
        </VTab>
        <VTab value="payroll" prepend-icon="mdi-bank-outline">Pengaturan Gaji, Bank & Tax</VTab>
        <VTab value="certifications" prepend-icon="mdi-certificate-outline">
          Certifications & Lisensi
        </VTab>
        <VTab value="leave" prepend-icon="mdi-calendar-account-outline">Hak & Saldo Cuti</VTab>
        <VTab value="pin" prepend-icon="mdi-lock-outline">Set Self-Service PIN</VTab>
      </VTabs>
      <VDivider />

      <VCardText class="pa-6">
        <VWindow v-model="activeTab">
          <!-- Tab 1: Biodata -->
          <VWindowItem value="biodata">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="editForm.phone"
                  label="Nomor Telepon / WhatsApp"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="editForm.email"
                  label="Alamat Email"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="editForm.address"
                  label="Alamat Domisili Lengkap"
                  variant="outlined"
                  rows="3"
                />
              </VCol>
            </VRow>
            <div class="d-flex justify-end mt-4">
              <VBtn color="primary" :loading="saving" @click="saveBiodata()">
                Simpan Perubahan Biodata
              </VBtn>
            </div>
          </VWindowItem>

          <!-- Tab 2: Bank, Tax & Salary Management -->
          <VWindowItem value="payroll">
            <!-- Salary & Compensation Management Form -->
            <VCard border class="pa-4 mb-6 bg-surface" elevation="1">
              <h3 class="text-subtitle-1 font-weight-bold text-primary mb-3">
                💵 Pengaturan Komponen Gaji Karyawan (Manage Base Salary)
              </h3>
              <VRow>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model.number="editForm.basicSalary"
                    label="Gaji Pokok (Basic Salary) *"
                    type="number"
                    prefix="Rp"
                    variant="outlined"
                    density="comfortable"
                  />
                </VCol>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model.number="editForm.positionAllowance"
                    label="Tunjangan Jabatan *"
                    type="number"
                    prefix="Rp"
                    variant="outlined"
                    density="comfortable"
                  />
                </VCol>
                <VCol cols="12" sm="4">
                  <VTextField
                    v-model.number="editForm.flightRatePerHour"
                    label="Rate Allowance Terbang / Jam"
                    type="number"
                    prefix="Rp"
                    suffix="/ jam"
                    variant="outlined"
                    density="comfortable"
                  />
                </VCol>
              </VRow>

              <VAlert type="info" variant="tonal" class="mt-2 text-caption">
                Total Gaji Tetap (Basic + Tunjangan Jabatan):
                <span class="font-weight-bold text-primary text-subtitle-2 ml-1">
                  {{
                    formatCurrency((editForm.basicSalary || 0) + (editForm.positionAllowance || 0))
                  }}
                </span>
              </VAlert>
            </VCard>

            <!-- Bank & Tax Details -->
            <VRow>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="editForm.bankName"
                  label="Nama Bank"
                  :items="['Bank Mandiri', 'BCA', 'BRI', 'BNI', 'Bank Papua', 'Lainnya']"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="editForm.bankAccountNumber"
                  label="Nomor Rekening Bank"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="editForm.bankAccountName"
                  label="Nama Pemilik Rekening"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="editForm.taxIdNumber"
                  label="NPWP (Tax ID)"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="editForm.ptkpStatus"
                  label="Kategori PTKP Pajak"
                  :items="['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="editForm.maritalStatus"
                  label="Status Pernikahan"
                  :items="['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="editForm.bpjsKesehatanNumber"
                  label="No. BPJS Kesehatan"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="editForm.bpjsTkNumber"
                  label="No. BPJS Ketenagakerjaan"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
            </VRow>

            <VAlert v-if="saveSuccess" type="success" variant="tonal" class="mt-4">
              Pengaturan gaji, bank, dan pajak karyawan berhasil diperbarui!
            </VAlert>

            <div class="d-flex justify-end mt-4">
              <VBtn
                color="primary"
                size="large"
                prepend-icon="mdi-check-all"
                :loading="saving"
                @click="saveBiodata()"
              >
                Simpan Perubahan Gaji & Bank
              </VBtn>
            </div>
          </VWindowItem>

          <!-- Tab 3: Certifications & Lisensi Penerbangan -->
          <VWindowItem value="certifications">
            <div class="d-flex align-center justify-space-between mb-4">
              <h3 class="text-subtitle-1 font-weight-bold text-primary">
                📜 Lisensi & Sertifikasi Karyawan
              </h3>
              <VBtn size="small" prepend-icon="mdi-plus" color="primary" to="/hris/certifications">
                Kelola Master Sertifikat
              </VBtn>
            </div>

            <VTable border density="comfortable" hover>
              <thead>
                <tr>
                  <th>Tipe Sertifikat</th>
                  <th>Nomor Sertifikat</th>
                  <th>Lembaga Penerbit (Authority)</th>
                  <th>Tanggal Terbit</th>
                  <th>Masa Berlaku (Expiry)</th>
                  <th>Status</th>
                  <th>Dokumen</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in employee.certifications" :key="c.id">
                  <td>
                    <VChip size="small" variant="outlined" color="primary" class="font-weight-bold">
                      {{ c.certificationType }}
                    </VChip>
                  </td>
                  <td class="font-mono font-weight-bold">{{ c.certificateNumber }}</td>
                  <td>{{ c.issuingAuthority || 'DGCA Indonesia' }}</td>
                  <td>{{ c.issuedDate || '-' }}</td>
                  <td>
                    <span :class="c.status === 'EXPIRED' ? 'text-error font-weight-bold' : ''">
                      {{ c.expiryDate || 'Lifetime / Seumur Hidup' }}
                    </span>
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="
                        c.status === 'ACTIVE'
                          ? 'success'
                          : c.status === 'EXPIRING_SOON'
                            ? 'warning'
                            : 'error'
                      "
                      variant="flat"
                    >
                      {{ c.status }}
                    </VChip>
                  </td>
                  <td>
                    <VBtn
                      v-if="c.documentUrl"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      prepend-icon="mdi-file-eye-outline"
                      :href="c.documentUrl"
                      target="_blank"
                    >
                      Lihat File
                    </VBtn>
                    <span v-else class="text-caption text-secondary">Belum ada file</span>
                  </td>
                </tr>
                <tr v-if="!employee.certifications?.length">
                  <td colspan="7" class="text-center py-6 text-secondary">
                    Belum ada data sertifikasi atau lisensi untuk karyawan ini.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VWindowItem>

          <!-- Tab 4: Kuota & Saldo Cuti Karyawan -->
          <VWindowItem value="leave">
            <h3 class="text-subtitle-1 font-weight-bold text-primary mb-4">
              🌴 Hak & Kuota Saldo Cuti
            </h3>

            <VRow v-if="employee.leaveBalances?.length">
              <VCol v-for="b in employee.leaveBalances" :key="b.id" cols="12" sm="6" md="4">
                <VCard
                  border
                  class="pa-4 bg-surface elevation-1 h-100 d-flex flex-column justify-space-between"
                >
                  <div>
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-subtitle-2 font-weight-bold text-primary">{{
                        b.leaveName
                      }}</span>
                      <VChip size="x-small" color="primary" variant="outlined">
                        {{ b.periodYear }}
                      </VChip>
                    </div>
                    <div class="text-h3 font-weight-bold text-success my-2">
                      {{ b.remainingDays }}
                      <span class="text-caption text-secondary font-weight-normal">Hari Sisa</span>
                    </div>
                  </div>

                  <div class="border-t pt-2 mt-2">
                    <div class="d-flex justify-space-between text-caption text-secondary mb-1">
                      <span>Total Hak Cuti:</span>
                      <span class="font-weight-bold text-high-emphasis">{{ b.entitledDays }} Hari</span>
                    </div>
                    <div class="d-flex justify-space-between text-caption text-secondary">
                      <span>Sudah Terpakai:</span>
                      <span class="font-weight-bold text-warning">{{ b.usedDays }} Hari</span>
                    </div>
                  </div>
                </VCard>
              </VCol>
            </VRow>

            <div v-else class="text-center py-6 text-secondary">
              Belum ada data kuota cuti untuk karyawan ini.
            </div>
          </VWindowItem>

          <!-- Tab 5: Set PIN -->
          <VWindowItem value="pin">
            <div class="max-w-md">
              <p class="text-body-2 text-secondary mb-4">
                Configure 6-digit PIN for Employee Portal Self-Service authentication.
              </p>
              <VTextField
                v-model="pinVal"
                label="6-Digit PIN"
                maxlength="6"
                type="password"
                variant="outlined"
                density="comfortable"
              />
              <VAlert v-if="pinSuccess" type="success" variant="tonal" class="my-2">
                PIN saved successfully!
              </VAlert>
              <VBtn
                color="primary"
                class="mt-2"
                :disabled="pinVal.length !== 6"
                :loading="settingPin"
                @click="savePin()"
              >
                Set Employee PIN
              </VBtn>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </div>
</template>
