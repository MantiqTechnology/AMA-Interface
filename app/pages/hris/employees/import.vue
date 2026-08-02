<script setup lang="ts">
const csvText = ref('');
const loading = ref(false);
const result = ref<{ imported: number; updated: number; total: number } | null>(null);
const errorMessage = ref('');

function parseCsv(text: string) {
  const lines = text.trim().split('\n');
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length < 3) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    if (row.employeeCode && row.fullName && row.positionTitle) {
      rows.push({
        employeeCode: row.employeeCode,
        fullName: row.fullName,
        positionTitle: row.positionTitle,
        departmentCode: row.departmentCode || undefined,
        employmentType: (row.employmentType as any) || 'PERMANENT',
        employmentStatus: (row.employmentStatus as any) || 'ACTIVE',
        phone: row.phone || undefined,
        email: row.email || undefined
      });
    }
  }

  return rows;
}

async function handleImport() {
  if (!csvText.value.trim()) return;
  loading.value = true;
  errorMessage.value = '';
  result.value = null;

  try {
    const rows = parseCsv(csvText.value);
    if (rows.length === 0) {
      errorMessage.value =
        'Format CSV tidak valid. Pastikan ada header employeeCode, fullName, positionTitle.';
      loading.value = false;
      return;
    }

    const res = await fetchApi<{ imported: number; updated: number; total: number }>(
      '/api/hris/employees/import',
      {
        method: 'POST',
        body: { rows }
      }
    );

    result.value = res;
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mengimpor data karyawan.';
  } finally {
    loading.value = false;
  }
}

const sampleCsv = `employeeCode,fullName,positionTitle,departmentCode,employmentType,employmentStatus,phone,email
EMP-0101,Ahmad Yani,Captain Pilot,FLIGHT_OPS,PERMANENT,ACTIVE,081234567890,ahmad@amapapua.com
EMP-0102,Dewi Lestari,HR Officer,HR_DEPT,PERMANENT,ACTIVE,081298765432,dewi@amapapua.com
EMP-0103,Rian Hidayat,Station Staff,STATION_OPS,CONTRACT,ACTIVE,081311223344,rian@amapapua.com`;

function loadSample() {
  csvText.value = sampleCsv;
}
</script>

<template>
  <div class="pa-6 max-w-4xl mx-auto">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Import Data Karyawan</h1>
        <p class="text-subtitle-1 text-secondary">
          Impor masal data karyawan dari format CSV / Excel
        </p>
      </div>
      <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/employees">Kembali</VBtn>
    </div>

    <VAlert type="info" variant="tonal" class="mb-6">
      Standard kolom CSV:
      <strong>employeeCode, fullName, positionTitle, departmentCode, employmentType, employmentStatus,
        phone, email</strong>
    </VAlert>

    <VCard border class="pa-6 mb-6">
      <div class="d-flex justify-space-between align-center mb-2">
        <label class="font-weight-bold">Tempel Data CSV di bawah ini:</label>
        <VBtn size="small" variant="text" color="primary" @click="loadSample()">
          Gunakan Format Contoh
        </VBtn>
      </div>

      <VTextarea
        v-model="csvText"
        rows="10"
        variant="outlined"
        placeholder="employeeCode,fullName,positionTitle..."
        class="font-mono text-body-2"
      />

      <VAlert v-if="errorMessage" type="error" variant="tonal" class="mt-4">
        {{ errorMessage }}
      </VAlert>

      <VAlert v-if="result" type="success" variant="tonal" class="mt-4">
        Berhasil mengimpor <strong>{{ result.imported }}</strong> karyawan baru dan memperbarui
        <strong>{{ result.updated }}</strong> data karyawan.
      </VAlert>

      <div class="d-flex justify-end mt-4">
        <VBtn
          color="primary"
          size="large"
          prepend-icon="mdi-upload"
          :loading="loading"
          @click="handleImport()"
        >
          Proses Import Now
        </VBtn>
      </div>
    </VCard>
  </div>
</template>
