<script setup lang="ts">
import type { InternalAogDemoDto } from '#shared/features/maintenance';

defineProps<{ readiness: InternalAogDemoDto['readiness'] }>();

const statusPresentation = {
  SIAP: { label: 'Siap', color: 'success', icon: 'mdi-check-circle' },
  PERLU_TINDAKAN: { label: 'Perlu tindakan', color: 'warning', icon: 'mdi-alert-circle' },
  TERBLOKIR: { label: 'Terblokir', color: 'error', icon: 'mdi-close-octagon' },
  TIDAK_DIPERLUKAN: { label: 'Tidak diperlukan', color: 'grey', icon: 'mdi-minus-circle' }
} as const;
</script>

<template>
  <VCard border elevation="0" data-testid="internal-aog-readiness">
    <VCardTitle class="d-flex align-center ga-2">
      <VIcon icon="mdi-shield-check-outline" />
      Matriks kesiapan
    </VCardTitle>
    <VCardText>
      <div class="readiness-grid">
        <div v-for="section in readiness.sections" :key="section.key" class="readiness-gate">
          <div class="d-flex align-center justify-space-between ga-2">
            <span class="font-weight-medium">{{ section.label }}</span>
            <VChip
              :color="statusPresentation[section.status].color"
              :prepend-icon="statusPresentation[section.status].icon"
              size="small"
              variant="tonal"
            >
              {{ statusPresentation[section.status].label }}
            </VChip>
          </div>
          <div v-if="section.blockers[0]" class="text-body-2 text-error mt-2">
            {{ section.blockers[0].message }}
          </div>
          <div v-else-if="section.warnings[0]" class="text-body-2 text-warning mt-2">
            {{ section.warnings[0].message }}
          </div>
          <div v-else class="text-body-2 text-medium-emphasis mt-2">
            Tidak ada penghambat aktif.
          </div>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.readiness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.readiness-gate {
  min-height: 96px;
  padding: 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}
</style>
