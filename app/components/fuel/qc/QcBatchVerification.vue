<script setup lang="ts">
//import { ref } from 'vue'

const searchBatchQuery = ref('BATCH-210826-05')
const isSearching = ref(false)
const verifiedBatch = ref<any>(null)

// Data Mock Spesifik Batch
const mockBatchDatabase: Record<string, any> = {
  'BATCH-210826-05': {
    batchNo: 'BATCH-210826-05',
    coaNo: 'CoA-PTM-2026-8891',
    refinery: 'Kilang Pertamina RU IV Cilacap',
    productionDate: '10 Aug 2026',
    expiryDate: '10 Feb 2027',
    status: 'VERIFIED',
    statusColor: 'success',
    totalDrums: 45,
    specs: {
      density: '0.795 - 0.805 kg/L',
      flashPoint: 'Min 38 °C',
      freezePoint: 'Max -47 °C',
      waterContent: 'Max 30 ppm'
    },
    scannedDrums: [
      { id: 'DRUM-00087', status: 'PASSED', time: '22 Aug 2026 08:15' },
      { id: 'DRUM-00088', status: 'PASSED', time: '22 Aug 2026 08:20' },
      { id: 'DRUM-00092', status: 'QUARANTINED', time: '21 Aug 2026 16:30' },
    ]
  }
}

const searchBatch = () => {
  if (!searchBatchQuery.value) return
  isSearching.value = true
  verifiedBatch.value = null

  // Simulasi delay pencarian
  setTimeout(() => {
    isSearching.value = false
    verifiedBatch.value = mockBatchDatabase[searchBatchQuery.value.trim()] || null
  }, 600)
}

// Inisiasi pencarian default untuk mockup
searchBatch()
</script>

<template>
  <v-card variant="flat" class="border rounded-lg bg-white">
    <!-- Header -->
    <div class="pa-5 border-b bg-grey-lighten-5">
      <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Verifikasi Batch & CoA</div>
      <div class="text-caption text-medium-emphasis">Validasi sertifikat analisis (Certificate of Analysis) pabrik untuk batch penerimaan avtur.</div>
    </div>

    <div class="pa-5">
      <!-- Search Bar -->
      <div class="d-flex align-center ga-3 mb-6">
        <v-text-field v-model="searchBatchQuery" label="Masukkan Nomor Batch / CoA" placeholder="Contoh: BATCH-210826-05" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-barcode-scan" class="flex-grow-1" @keyup.enter="searchBatch" />
        <v-btn color="primary" class="text-none font-weight-bold" height="40" :loading="isSearching" @click="searchBatch">Verifikasi Dokumen</v-btn>
      </div>

      <!-- Hasil Pencarian Kosong -->
      <div v-if="!verifiedBatch && !isSearching && searchBatchQuery" class="text-center py-10 border rounded-lg bg-grey-lighten-5">
        <v-icon icon="mdi-file-hidden" size="40" color="grey" class="mb-3" />
        <div class="text-body-2 font-weight-medium">Dokumen tidak ditemukan</div>
        <div class="text-caption text-medium-emphasis">Pastikan nomor batch atau CoA diketik dengan benar.</div>
      </div>

      <!-- Detail Batch (Jika Ditemukan) -->
      <v-row v-if="verifiedBatch">
        <!-- Info Dokumen -->
        <v-col cols="12" md="7">
          <v-card variant="outlined" class="rounded-lg h-100">
            <div class="d-flex align-center justify-space-between pa-4 border-b bg-grey-lighten-5">
              <div class="d-flex align-center ga-2">
                <v-icon icon="mdi-file-certificate" color="teal" />
                <span class="font-weight-bold">Informasi Sertifikat (CoA)</span>
              </div>
              <v-chip size="small" :color="verifiedBatch.statusColor" variant="flat" class="font-weight-bold text-white">{{ verifiedBatch.status }}</v-chip>
            </div>
            
            <div class="pa-4">
              <v-row dense>
                <v-col cols="4"><div class="text-caption text-medium-emphasis">Nomor CoA</div></v-col>
                <v-col cols="8"><div class="text-body-2 font-weight-bold text-primary">{{ verifiedBatch.coaNo }}</div></v-col>
                
                <v-col cols="4"><div class="text-caption text-medium-emphasis">Kilang Asal</div></v-col>
                <v-col cols="8"><div class="text-body-2 font-weight-medium">{{ verifiedBatch.refinery }}</div></v-col>

                <v-col cols="4"><div class="text-caption text-medium-emphasis">Tgl Produksi</div></v-col>
                <v-col cols="8"><div class="text-body-2">{{ verifiedBatch.productionDate }}</div></v-col>

                <v-col cols="4"><div class="text-caption text-medium-emphasis">Expired Date</div></v-col>
                <v-col cols="8"><div class="text-body-2 text-error font-weight-medium">{{ verifiedBatch.expiryDate }}</div></v-col>
              </v-row>

              <v-divider class="my-3" />
              
              <div class="text-caption font-weight-bold mb-2">Spesifikasi Rujukan Utama:</div>
              <div class="spec-grid">
                <div class="spec-item"><span>Density 15°C</span><strong>{{ verifiedBatch.specs.density }}</strong></div>
                <div class="spec-item"><span>Flash Point</span><strong>{{ verifiedBatch.specs.flashPoint }}</strong></div>
                <div class="spec-item"><span>Freeze Point</span><strong>{{ verifiedBatch.specs.freezePoint }}</strong></div>
                <div class="spec-item"><span>Water Content</span><strong>{{ verifiedBatch.specs.waterContent }}</strong></div>
              </div>

              <div class="mt-4">
                <v-btn variant="tonal" color="primary" prepend-icon="mdi-file-pdf-box" class="text-none" block>Lihat Dokumen CoA (PDF)</v-btn>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Daftar Drum / Status Fisik -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" class="rounded-lg h-100 d-flex flex-column">
            <div class="pa-4 border-b bg-grey-lighten-5">
              <div class="font-weight-bold"><v-icon icon="mdi-barrel" class="mr-2" color="primary" />Log Inspeksi Drum</div>
              <div class="text-caption text-medium-emphasis mt-1">Total drum di batch ini: <strong>{{ verifiedBatch.totalDrums }}</strong></div>
            </div>
            
            <div class="flex-grow-1 overflow-auto pa-0" style="max-height: 280px;">
              <v-table density="compact">
                <tbody>
                  <tr v-for="drum in verifiedBatch.scannedDrums" :key="drum.id">
                    <td class="text-caption font-weight-bold">{{ drum.id }}</td>
                    <td class="text-caption text-medium-emphasis">{{ drum.time }}</td>
                    <td class="text-right">
                      <v-chip size="x-small" :color="drum.status === 'PASSED' ? 'success' : 'error'" variant="tonal">{{ drum.status }}</v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div class="pa-3 border-t bg-grey-lighten-5 text-center">
              <v-btn variant="text" size="small" color="primary" class="text-none">Lihat Semua Drum</v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>

<style scoped>
.spec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.spec-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: rgb(var(--v-theme-grey-lighten-5));
  border: 1px solid rgb(var(--v-theme-grey-lighten-3));
  border-radius: 6px;
}
.spec-item span { font-size: 10px; color: rgb(var(--v-theme-grey-darken-1)); }
.spec-item strong { font-size: 12px; color: rgb(var(--v-theme-grey-darken-4)); }
</style>