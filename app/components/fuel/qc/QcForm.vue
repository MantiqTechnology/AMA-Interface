<script setup lang="ts">
//import { ref } from 'vue'

const emit = defineEmits(['change-tab'])

// Form State
const isSubmitting = ref(false)
const formValid = ref(false)

const formData = ref({
  objectType: null,
  refNo: '',
  batchNo: '',
  location: null,
  visualCheck: '',
  swdResult: null,
  obsDensity: '',
  obsTemp: '',
  sealNo: '',
  sealStatus: null,
  drumCondition: '',
  notes: ''
})

// Opsi Dropdown
const objectTypes = ['Drum 200L', 'Tangki DPPU', 'Smart Nozzle', 'Bridger']
const locations = ['DPPU Wamena (WMX)', 'Sentani (DJJ)', 'Timika (TIM)', 'Nabire (NBX)']
const swdResults = ['PASSED (Clear / Negatif Air)', 'FAILED (Suspicious / Kapsul Berubah Warna)', 'PENDING (Uji Ulang)']
const sealStatuses = ['Intact / OK', 'Broken Seal', 'Missing', 'Tampered (Curiga)']

// Validation Rules (Typed)
const rules = {
  required: (msg: string) => (v: any) => !!v || msg
}

const submitForm = () => {
  if (!formValid.value) return
  isSubmitting.value = true
  
  // Simulasi proses simpan API
  setTimeout(() => {
    isSubmitting.value = false
    alert('Log Inspeksi QC berhasil disimpan dan menunggu Sign-off Supervisor.')
    emit('change-tab', 1) 
  }, 1000)
}

const cancelForm = () => {
  emit('change-tab', 1)
}
</script>

<template>
  <v-card variant="flat" class="border rounded-lg bg-white">
    <div class="pa-5 border-b bg-grey-lighten-5">
      <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Input Log Inspeksi Baru</div>
      <div class="text-caption text-medium-emphasis">Catat hasil pengecekan fisik, SWD, dan density untuk drum atau tangki avtur.</div>
    </div>

    <v-form v-model="formValid" @submit.prevent="submitForm" class="pa-5">
      <!-- Seksi 1: Data Identifikasi -->
      <div class="form-section-title"><v-icon icon="mdi-tag-outline" class="mr-2" color="primary" size="20" /> 1. Data Identifikasi Objek</div>
      <v-row class="mb-2">
        <v-col cols="12" md="6">
          <v-select v-model="formData.objectType" :items="objectTypes" label="Tipe Objek (Wajib)" variant="outlined" density="comfortable" :rules="[rules.required('Tipe Objek harus diisi')]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="formData.location" :items="locations" label="Lokasi / Station (Wajib)" variant="outlined" density="comfortable" :rules="[rules.required('Lokasi harus diisi')]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.refNo" label="Nomor Referensi (ID Drum/Tangki)" placeholder="Contoh: DRUM-00123" variant="outlined" density="comfortable" :rules="[rules.required('Nomor Referensi wajib diisi')]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.batchNo" label="Nomor Batch / Pengiriman" placeholder="Contoh: BATCH-210826-05" variant="outlined" density="comfortable" />
        </v-col>
      </v-row>

      <v-divider class="mb-5" />

      <!-- Seksi 2: Hasil Uji Kualitas -->
      <div class="form-section-title"><v-icon icon="mdi-flask-outline" class="mr-2" color="teal" size="20" /> 2. Hasil Pengujian Fisik & Mutu</div>
      <v-row class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.visualCheck" label="Pemeriksaan Visual" placeholder="Contoh: Bright & Clear, Free from Solid" variant="outlined" density="comfortable" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="formData.swdResult" :items="swdResults" label="Hasil Uji SWD (Shell Water Detector)" variant="outlined" density="comfortable" :rules="[rules.required('Hasil SWD wajib diisi')]" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.obsDensity" label="Observed Density (kg/L)" type="number" step="0.001" placeholder="0.795" variant="outlined" density="comfortable" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.obsTemp" label="Observed Temperature (°C)" type="number" step="0.1" placeholder="28.2" variant="outlined" density="comfortable" />
        </v-col>
      </v-row>

      <v-divider class="mb-5" />

      <!-- Seksi 3: Kondisi Fisik -->
      <div class="form-section-title"><v-icon icon="mdi-seal" class="mr-2" color="warning" size="20" /> 3. Kondisi Fisik & Segel</div>
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field v-model="formData.sealNo" label="Nomor Segel (Seal Number)" placeholder="Masukkan kode segel" variant="outlined" density="comfortable" />
        </v-col>
        <v-col cols="12" md="6">
          <v-select v-model="formData.sealStatus" :items="sealStatuses" label="Status Keutuhan Segel" variant="outlined" density="comfortable" />
        </v-col>
        <v-col cols="12">
          <v-textarea v-model="formData.notes" label="Catatan Tambahan (Kondisi Drum, Anomali, dll)" rows="3" variant="outlined" density="comfortable" hide-details />
        </v-col>
      </v-row>

      <!-- Action Buttons -->
      <div class="d-flex align-center justify-end ga-3 pt-4 border-t mt-6">
        <v-btn variant="text" color="grey-darken-1" class="text-none font-weight-bold" @click="cancelForm">Batal</v-btn>
        <v-btn variant="outlined" color="primary" class="text-none font-weight-bold">Simpan Draft</v-btn>
        <v-btn type="submit" color="primary" prepend-icon="mdi-check-decagram" class="text-none font-weight-bold" :loading="isSubmitting" :disabled="!formValid">Simpan & Request Sign</v-btn>
      </div>
    </v-form>
  </v-card>
</template>

<style scoped>
.form-section-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: rgb(var(--v-theme-grey-darken-3));
  margin-bottom: 16px;
}
</style>