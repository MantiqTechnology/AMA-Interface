<script setup lang="ts">
import type { MaintenanceQualityFindingDto } from '#shared/features/maintenance';

const format = useLocaleFormat();
const ui = useMaintenanceUi();

const { data, pending, error, refresh } = await useAsyncData('maintenance-quality-demo', () =>
  fetchApi<MaintenanceQualityFindingDto[]>('/api/maintenance/quality')
);
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Simulasi Quality & Safety</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">Quality/CAPA/SDR Demo Lite</p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert type="warning" variant="tonal" class="mb-4">
      Simulasi pelaporan internal. Bukan laporan resmi kepada regulator.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Data Quality demo belum dapat dimuat.
    </VAlert>

    <VRow>
      <VCol v-for="finding in data ?? []" :key="finding.id" cols="12" lg="6">
        <VCard border height="100%">
          <VCardTitle class="d-flex align-center ga-2">
            <div>
              <div class="text-h6">{{ finding.reference }}</div>
              <div class="text-caption text-medium-emphasis">{{ finding.classification }}</div>
            </div>
            <VSpacer />
            <VChip color="warning" variant="tonal">{{ ui.label(finding.status) }}</VChip>
          </VCardTitle>
          <VCardText>
            <p>{{ finding.description }}</p>
            <VList density="compact">
              <VListItem title="Owner" :subtitle="finding.owner" />
              <VListItem
                title="Due date"
                :subtitle="finding.dueDate ? format.date(finding.dueDate) : '-'"
              />
              <VListItem title="Source" :subtitle="`${finding.sourceType} / ${finding.sourceId}`" />
            </VList>
            <VDivider class="my-3" />
            <div class="text-subtitle-2 mb-2">CAPA</div>
            <VList density="compact">
              <VListItem
                v-for="capa in finding.capaActions"
                :key="capa.id"
                :title="capa.description"
                :subtitle="`${capa.owner} / ${ui.label(capa.status)}`"
              />
            </VList>
            <VDivider class="my-3" />
            <div class="text-subtitle-2 mb-2">Occurrence/SDR Assessment Demo</div>
            <VAlert v-if="finding.sdrAssessment" type="info" variant="tonal" density="compact">
              <strong>{{ finding.sdrAssessment.reportabilityStatus }}</strong>
              <div>{{ finding.sdrAssessment.assessment }}</div>
              <div class="text-caption">
                Simulated due:
                {{
                  finding.sdrAssessment.simulatedDueAt
                    ? format.date(finding.sdrAssessment.simulatedDueAt)
                    : '-'
                }}
              </div>
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VEmptyState
      v-if="!pending && !error && !(data?.length ?? 0)"
      title="Belum ada temuan Quality demo"
    />
  </VContainer>
</template>
