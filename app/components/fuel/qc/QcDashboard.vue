<script setup lang="ts">
// Nantinya data ini bisa dipanggil dari useAvturMockData.ts
const metrics = [
  { title: 'Total Inspeksi (Bulan Ini)', count: '412', unit: 'Pemeriksaan', sub: '↗ 8% vs bulan lalu', icon: 'mdi-clipboard-check-outline', color: 'primary' },
  { title: 'Pass Rate Mutu', count: '99.2%', unit: 'Lolos Uji', sub: 'Standar JIG / CASR', icon: 'mdi-check-decagram-outline', color: 'success' },
  { title: 'Uji SWD / Air', count: '100%', unit: 'Bebas Air', sub: '0 Kasus Kontaminasi', icon: 'mdi-water-check-outline', color: 'info' },
  { title: 'Density @ 15°C Valid', count: '410', unit: 'Sampel Tervalidasi', sub: 'Sesuai Spesifikasi CoA', icon: 'mdi-thermometer-lines', color: 'teal' },
  { title: 'Drum / Seal Flagged', count: '2', unit: 'Drum Karantina', sub: 'Segel Rusak / Penyok', icon: 'mdi-alert-rhombus-outline', color: 'warning' },
  { title: 'Pending Approval K3', count: '3', unit: 'Membutuhkan Sign-off', sub: 'Shift Pagi', icon: 'mdi-clock-outline', color: 'orange' },
]

const qcWorkflowSteps = [
  { step: 1, title: 'Verifikasi Batch & CoA', desc: 'Pencocokan nomor batch drum/tangki dengan sertifikasi analisis.', icon: 'mdi-file-certificate-outline', color: 'primary' },
  { step: 2, title: 'Cek Fisik Drum & Seal', desc: 'Inspeksi keutuhan segel tamper-proof, bebas korosi, dan leak-check.', icon: 'mdi-barrel', color: 'teal' },
  { step: 3, title: 'Uji Kadar Air (SWD)', desc: 'Pemeriksaan visual dan Shell Water Detector capsule untuk indikasi air.', icon: 'mdi-water-opacity', color: 'info' },
  { step: 4, title: 'Uji Density & Suhu', desc: 'Pengukuran density lapangan dengan konversi ke referensi 15°C.', icon: 'mdi-thermometer', color: 'warning' },
  { step: 5, title: 'Digital Sign-off K3', desc: 'Persetujuan operator dan supervisor sebelum fuel dinyatakan siap.', icon: 'mdi-shield-check-outline', color: 'success' },
]
</script>

<template>
  <div>
    <!-- Metrics Grid -->
    <div class="metrics-grid mb-6">
      <v-card v-for="(m, idx) in metrics" :key="idx" variant="flat" class="border rounded-lg pa-4 bg-white metric-card">
        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-caption font-weight-bold text-medium-emphasis">{{ m.title }}</span>
          <v-avatar :color="m.color" variant="tonal" size="34">
            <v-icon :icon="m.icon" size="18" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold text-grey-darken-4 mb-1">{{ m.count }}</div>
        <div class="text-caption text-medium-emphasis">{{ m.unit }}</div>
        <div class="text-caption font-weight-medium mt-1" :class="m.color === 'error' ? 'text-error' : 'text-success'">
          {{ m.sub }}
        </div>
      </v-card>
    </div>

    <!-- Workflow Panel -->
    <v-card variant="flat" class="border rounded-lg pa-5 bg-white mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">Tahapan Checklist Digital Mutu Avtur</div>
          <div class="text-caption text-medium-emphasis">Alur pemeriksaan dari verifikasi batch hingga digital sign-off.</div>
        </div>
        <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-shield-check-outline">
          Quality Workflow
        </v-chip>
      </div>

      <div class="workflow-grid">
        <template v-for="s in qcWorkflowSteps" :key="s.step">
          <div class="workflow-item">
            <v-avatar :color="s.color" variant="tonal" size="38" class="mb-3">
              <v-icon :icon="s.icon" size="20" />
            </v-avatar>
            <div class="workflow-number">STEP {{ s.step }}</div>
            <div class="font-weight-bold text-body-2 mb-1">{{ s.title }}</div>
            <div class="text-caption text-medium-emphasis workflow-desc">{{ s.desc }}</div>
          </div>
          <div v-if="s.step < qcWorkflowSteps.length" class="workflow-connector">
            <v-icon icon="mdi-chevron-right" size="20" color="grey" />
          </div>
        </template>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}
.metric-card { min-width: 0; }
.workflow-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;
}
.workflow-item {
  min-width: 0;
  padding: 16px 12px;
  border: 1px solid rgb(var(--v-theme-grey-lighten-2));
  border-radius: 10px;
  background: rgb(var(--v-theme-grey-lighten-5));
  text-align: center;
}
.workflow-number {
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.workflow-desc { line-height: 1.4; }
.workflow-connector { display: flex; align-items: center; justify-content: center; }

@media (max-width: 1400px) {
  .metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .workflow-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .workflow-connector { display: none; }
}
@media (max-width: 700px) {
  .metrics-grid, .workflow-grid { grid-template-columns: 1fr; }
}
</style>