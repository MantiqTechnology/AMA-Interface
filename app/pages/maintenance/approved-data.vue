<script setup lang="ts">
import type { MaintenanceApprovedDataDocumentDto } from '#shared/features/maintenance';

const format = useLocaleFormat();
const ui = useMaintenanceUi();

const { data, pending, error, refresh } = await useAsyncData('maintenance-approved-data', () =>
  fetchApi<MaintenanceApprovedDataDocumentDto[]>('/api/maintenance/approved-data')
);
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Data Perawatan Terkendali</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">Approved Maintenance Data Registry Lite</p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert type="warning" variant="tonal" class="mb-4">
      Data perawatan ini bersifat fiktif untuk demonstrasi dan bukan approved maintenance data untuk
      pekerjaan nyata.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Registry data perawatan belum dapat dimuat.
    </VAlert>

    <VCard border>
      <VTable>
        <thead>
          <tr>
            <th>Dokumen</th>
            <th>Tipe</th>
            <th>Revisi aktif</th>
            <th>Applicability</th>
            <th>Dipakai job card</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="6">Memuat data perawatan...</td>
          </tr>
          <tr v-for="document in data ?? []" :key="document.id">
            <td>
              <strong>{{ document.documentNumber }}</strong>
              <div class="text-caption text-medium-emphasis">{{ document.title }}</div>
              <div class="text-caption">{{ document.sourceIssuer }}</div>
            </td>
            <td>{{ ui.label(document.documentType) }}</td>
            <td>
              <template v-if="document.activeRevision">
                <VChip color="success" size="small" variant="tonal">
                  {{ document.activeRevision.revision }}
                </VChip>
                <div class="text-caption text-medium-emphasis">
                  Efektif {{ format.date(document.activeRevision.effectiveDate) }}
                </div>
              </template>
              <VChip v-else color="warning" size="small" variant="tonal">Tidak ada</VChip>
            </td>
            <td>{{ document.applicability }}</td>
            <td>{{ document.jobCardUsageCount }}</td>
            <td>
              <VChip :color="document.status === 'ACTIVE' ? 'success' : 'warning'" variant="tonal">
                {{ ui.label(document.status) }}
              </VChip>
              <VChip v-if="document.fictionalDemo" class="ml-2" size="x-small" variant="tonal">
                Demo fiktif
              </VChip>
            </td>
          </tr>
          <tr v-if="!pending && !error && !(data?.length ?? 0)">
            <td colspan="6">Belum ada data perawatan terkendali.</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>
