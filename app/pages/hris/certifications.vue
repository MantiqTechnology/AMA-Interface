<script setup lang="ts">
const { data: certsData, refresh: refreshCerts } = await useAsyncData('certifications', () =>
  fetchApi<any[]>('/api/hris/certifications')
);

const { data: alertsData, refresh: refreshAlerts } = await useAsyncData('cert-alerts', () =>
  fetchApi<any[]>('/api/hris/certifications/alerts')
);

const { data: employeesData } = await useAsyncData('cert-active-employees', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);

const certs = computed(() => certsData.value ?? []);
const alerts = computed(() => alertsData.value ?? []);
const employeesList = computed(() => {
  if (Array.isArray(employeesData.value)) return employeesData.value;
  if (employeesData.value && Array.isArray((employeesData.value as any).items))
    return (employeesData.value as any).items;
  return [];
});

const employeeSelectItems = computed(() => {
  return employeesList.value.map((e: any) => ({
    title: `${e.fullName} (${e.employeeCode}) — ${e.positionTitle || 'Staff'}`,
    value: e.id
  }));
});

const searchQuery = ref('');
const typeFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

const filteredCerts = computed(() => {
  return certs.value.filter((item: any) => {
    const matchesType = !typeFilter.value || item.certificationType === typeFilter.value;
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value;

    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.employeeName?.toLowerCase().includes(query) ||
      item.employeeCode?.toLowerCase().includes(query) ||
      item.certificateNumber?.toLowerCase().includes(query) ||
      item.issuingAuthority?.toLowerCase().includes(query) ||
      item.positionTitle?.toLowerCase().includes(query);

    return matchesType && matchesStatus && matchesSearch;
  });
});

const headers = [
  { title: 'Pemilik Sertifikat (Karyawan)', key: 'employeeName' },
  { title: 'Tipe Sertifikasi', key: 'certificationType' },
  { title: 'No. Sertifikat & Penerbit', key: 'certificateNumber' },
  { title: 'Tgl Terbit & Expiry', key: 'expiryDate' },
  { title: 'Dokumen', key: 'documentUrl', sortable: false },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

// Notify Employee Function
const notifyingId = ref<string | null>(null);

async function handleNotifyEmployee(certItem: any) {
  notifyingId.value = certItem.id;
  try {
    const res = await fetchApi<any>(`/api/hris/certifications/${certItem.id}/notify`, {
      method: 'POST'
    });
    alert(res.message || `Notifikasi berhasil dikirimkan ke ${certItem.employeeName}!`);
  } catch (err: any) {
    alert(err.message || 'Gagal mengirim notifikasi.');
  } finally {
    notifyingId.value = null;
  }
}

// Create / Edit Modal State
const certDialog = ref(false);
const editingCertId = ref<string | null>(null);
const certForm = ref({
  employeeId: '',
  certificationType: 'ATPL',
  certificateNumber: '',
  issuingAuthority: 'DGCA Indonesia',
  issuedDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  status: 'ACTIVE',
  remarks: '',
  documentUrl: ''
});
const savingCert = ref(false);

function openNewCertDialog() {
  editingCertId.value = null;
  certForm.value = {
    employeeId: employeesList.value[0]?.id || '',
    certificationType: 'ATPL',
    certificateNumber: '',
    issuingAuthority: 'DGCA Indonesia',
    issuedDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    status: 'ACTIVE',
    remarks: '',
    documentUrl: ''
  };
  certDialog.value = true;
}

function openEditCertDialog(item: any) {
  editingCertId.value = item.id;
  certForm.value = {
    employeeId: item.employeeId,
    certificationType: item.certificationType || 'ATPL',
    certificateNumber: item.certificateNumber || '',
    issuingAuthority: item.issuingAuthority || 'DGCA Indonesia',
    issuedDate: item.issuedDate || new Date().toISOString().slice(0, 10),
    expiryDate: item.expiryDate || '',
    status: item.status || 'ACTIVE',
    remarks: item.remarks || '',
    documentUrl: item.documentUrl || ''
  };
  certDialog.value = true;
}

async function handleSaveCert() {
  if (
    !certForm.value.employeeId ||
    !certForm.value.certificateNumber ||
    !certForm.value.issuedDate
  ) {
    alert('Silakan lengkapi karyawan, nomor sertifikat, dan tanggal terbit.');
    return;
  }

  savingCert.value = true;
  try {
    if (editingCertId.value) {
      await fetchApi(`/api/hris/certifications/${editingCertId.value}`, {
        method: 'PUT',
        body: certForm.value
      });
    } else {
      await fetchApi('/api/hris/certifications', {
        method: 'POST',
        body: certForm.value
      });
    }
    certDialog.value = false;
    refreshAll();
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan sertifikat.');
  } finally {
    savingCert.value = false;
  }
}

async function handleDeleteCert(item: any) {
  if (
    !confirm(
      `Hapus sertifikat ${item.certificationType} (${item.certificateNumber}) milik ${item.employeeName}?`
    )
  )
    return;
  try {
    await fetchApi(`/api/hris/certifications/${item.id}`, { method: 'DELETE' });
    refreshAll();
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus sertifikat.');
  }
}

function refreshAll() {
  refreshCerts();
  refreshAlerts();
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Lisensi & Sertifikasi Pilot/Crew</h1>
        <p class="text-subtitle-1 text-secondary">
          Manajemen sertifikat penerbangan (ATPL, CPL, Medical Class, AME, dll), upload dokumen, dan
          notifikasi pengingat perpanjangan
        </p>
      </div>
      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-certificate-plus" color="primary" @click="openNewCertDialog()">
          Tambah / Upload Sertifikat
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refreshAll()">Refresh</VBtn>
      </div>
    </div>

    <!-- Alert Cards Summary Collapsible Dropdown -->
    <VExpansionPanels v-if="alerts.length" class="mb-6">
      <VExpansionPanel border elevation="0" style="background-color: #fff8e1">
        <VExpansionPanelTitle class="py-2">
          <div class="d-flex align-center ga-3">
            <VIcon color="warning" icon="mdi-alert-circle-outline" size="24" />
            <div>
              <span class="font-weight-bold text-subtitle-1 text-warning-darken-3">
                Perhatian! Ada {{ alerts.length }} sertifikasi yang membutuhkan perpanjangan segera
              </span>
              <span class="text-caption text-secondary d-block">
                Klik untuk melihat rincian sertifikat & kirim notifikasi pengingat ke karyawan
              </span>
            </div>
          </div>
        </VExpansionPanelTitle>

        <VExpansionPanelText>
          <div class="d-flex flex-wrap ga-2 pt-2">
            <div
              v-for="a in alerts"
              :key="a.id"
              class="pa-2 border rounded bg-surface d-flex align-center justify-space-between ga-3"
              style="min-width: 320px; flex: 1 1 320px"
            >
              <div>
                <div class="font-weight-bold text-body-2">{{ a.employeeName }}</div>
                <div class="text-caption text-secondary">
                  {{ a.certificationType }} • Exp:
                  <span class="font-weight-bold text-error">{{ a.expiryDate }}</span>
                </div>
              </div>

              <VBtn
                size="x-small"
                color="warning"
                variant="flat"
                prepend-icon="mdi-bell-ring-outline"
                :loading="notifyingId === a.id"
                @click="handleNotifyEmployee(a)"
              >
                Notify Employee
              </VBtn>
            </div>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Filters & Search Bar -->
    <VCard border class="pa-4 mb-4">
      <VRow>
        <VCol cols="12" sm="4">
          <VTextField
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari nama karyawan, NIP, no sertifikat..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>

        <VCol cols="12" sm="4">
          <VSelect
            v-model="typeFilter"
            density="compact"
            hide-details
            label="Filter Tipe Sertifikasi"
            :items="[
              { title: 'Semua Tipe', value: null },
              'ATPL',
              'CPL',
              'PPL',
              'IR',
              'MEDICAL_CLASS_1',
              'MEDICAL_CLASS_2',
              'TYPE_RATING',
              'CRM',
              'DG_AWARENESS',
              'AME',
              'OTHER'
            ]"
            variant="outlined"
          />
        </VCol>

        <VCol cols="12" sm="4">
          <VSelect
            v-model="statusFilter"
            density="compact"
            hide-details
            label="Filter Status"
            :items="[
              { title: 'Semua Status', value: null },
              'ACTIVE',
              'EXPIRING_SOON',
              'EXPIRED',
              'SUSPENDED'
            ]"
            variant="outlined"
          />
        </VCol>
      </VRow>
    </VCard>

    <!-- Certifications Table -->
    <VCard border>
      <VDataTable :headers="headers" :items="filteredCerts">
        <!-- Pemilik Sertifikat (Karyawan) -->
        <template #item.employeeName="{ item }">
          <div>
            <div class="font-weight-bold text-body-1 text-primary">{{ item.employeeName }}</div>
            <div class="text-caption text-secondary">
              {{ item.positionTitle }} • <span class="font-mono">{{ item.employeeCode }}</span>
            </div>
            <VChip size="x-small" variant="tonal" color="primary" class="mt-1">
              {{ item.departmentName || 'General' }}
            </VChip>
          </div>
        </template>

        <!-- Tipe Sertifikasi -->
        <template #item.certificationType="{ item }">
          <VChip size="small" color="primary" variant="outlined" class="font-weight-bold">
            {{ item.certificationType }}
          </VChip>
        </template>

        <!-- No Sertifikat & Penerbit -->
        <template #item.certificateNumber="{ item }">
          <div>
            <div class="font-mono font-weight-bold text-body-2">{{ item.certificateNumber }}</div>
            <div class="text-caption text-secondary">{{ item.issuingAuthority }}</div>
          </div>
        </template>

        <!-- Tanggal Terbit & Expiry -->
        <template #item.expiryDate="{ item }">
          <div>
            <div class="text-caption text-secondary">Terbit: {{ item.issuedDate }}</div>
            <div
              :class="
                item.status === 'EXPIRED'
                  ? 'text-error font-weight-bold'
                  : item.status === 'EXPIRING_SOON'
                    ? 'text-warning font-weight-bold'
                    : 'font-weight-medium'
              "
            >
              Exp: {{ item.expiryDate || 'Seumur Hidup' }}
            </div>
          </div>
        </template>

        <!-- Dokumen Upload -->
        <template #item.documentUrl="{ item }">
          <VBtn
            v-if="item.documentUrl"
            size="x-small"
            variant="tonal"
            color="info"
            prepend-icon="mdi-file-document-outline"
            :href="item.documentUrl"
            target="_blank"
          >
            Lihat Dokumen
          </VBtn>
          <span v-else class="text-caption text-secondary italic">Belum Upload</span>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="
              item.status === 'ACTIVE'
                ? 'success'
                : item.status === 'EXPIRING_SOON'
                  ? 'warning'
                  : item.status === 'EXPIRED'
                    ? 'error'
                    : 'grey'
            "
            size="small"
            variant="flat"
          >
            {{ item.status }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              size="small"
              variant="outlined"
              color="warning"
              icon="mdi-bell-ring-outline"
              title="Kirim Notifikasi Remind Ke Karyawan"
              :loading="notifyingId === item.id"
              @click="handleNotifyEmployee(item)"
            />
            <VBtn
              size="small"
              variant="outlined"
              color="primary"
              icon="mdi-pencil"
              title="Edit Sertifikat & Pemilik"
              @click="openEditCertDialog(item)"
            />
            <VBtn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              title="Hapus Sertifikat"
              @click="handleDeleteCert(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal Upload / Create / Edit Certification -->
    <VDialog v-model="certDialog" max-width="600">
      <VCard
        :title="editingCertId ? 'Edit Sertifikat Karyawan' : 'Upload / Tambah Sertifikat Baru'"
      >
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <!-- Select Employee Owner -->
            <VCol cols="12">
              <VSelect
                v-model="certForm.employeeId"
                label="Pilih Karyawan / Pemilik Sertifikat *"
                :items="employeeSelectItems"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VSelect
                v-model="certForm.certificationType"
                label="Tipe Sertifikasi *"
                :items="[
                  'ATPL',
                  'CPL',
                  'PPL',
                  'IR',
                  'MEDICAL_CLASS_1',
                  'MEDICAL_CLASS_2',
                  'TYPE_RATING',
                  'CRM',
                  'DG_AWARENESS',
                  'AME',
                  'OTHER'
                ]"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VTextField
                v-model="certForm.certificateNumber"
                label="Nomor Sertifikat *"
                placeholder="CPL-99210, MED-2026..."
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextField
                v-model="certForm.issuingAuthority"
                label="Lembaga Penerbit *"
                placeholder="DGCA Indonesia, Kemenhub, dll"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VTextField
                v-model="certForm.issuedDate"
                label="Tanggal Terbit *"
                type="date"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VTextField
                v-model="certForm.expiryDate"
                label="Tanggal Kadaluarsa (Expiry)"
                type="date"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VSelect
                v-model="certForm.status"
                label="Status Sertifikat"
                :items="['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED']"
                variant="outlined"
              />
            </VCol>

            <VCol cols="6">
              <VTextField
                v-model="certForm.documentUrl"
                label="URL / Link Dokumen Upload"
                placeholder="https://... atau /uploads/cert.pdf"
                variant="outlined"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="certForm.remarks"
                label="Catatan Sertifikat"
                placeholder="Catatan tambahan sertifikasi..."
                rows="2"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="certDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingCert"
            @click="handleSaveCert()"
          >
            Simpan Sertifikat
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
