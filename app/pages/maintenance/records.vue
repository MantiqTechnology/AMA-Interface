<script setup lang="ts">
import type {
  MaintenanceAuditListQuery,
  MaintenanceAuditRecordDto,
  MaintenanceCommandCenterDto
} from '#shared/features/maintenance';

type AuditListResponse = {
  items: MaintenanceAuditRecordDto[];
  total: number;
  limit: number;
  offset: number;
};

const route = useRoute();
const ui = useMaintenanceUi();
const format = useLocaleFormat();
const filters = reactive({
  aircraft: String(route.query.aircraft ?? ''),
  package: String(route.query.package ?? ''),
  entityType: '',
  action: '',
  actorRole: '',
  dateFrom: '',
  dateTo: '',
  search: ''
});
const selectedRecord = ref<MaintenanceAuditRecordDto | null>(null);
const detailDrawer = ref(false);

const query = computed<Partial<MaintenanceAuditListQuery>>(() => ({
  aircraft: filters.aircraft || undefined,
  package: filters.package || undefined,
  entityType: filters.entityType || undefined,
  action: filters.action || undefined,
  actorRole: filters.actorRole || undefined,
  dateFrom: filters.dateFrom || undefined,
  dateTo: filters.dateTo || undefined,
  search: filters.search || undefined,
  limit: 75,
  offset: 0
}));

const { data, pending, error, refresh } = await useAsyncData(
  'maintenance-records-audit',
  () => fetchApi<AuditListResponse>('/api/maintenance/records', { query: query.value }),
  { watch: [query] }
);

const { data: commandCenter } = await useAsyncData('maintenance-records-reference-data', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const records = computed(() => data.value?.items ?? []);
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const hasFilters = computed(() =>
  Boolean(
    filters.aircraft ||
    filters.package ||
    filters.entityType ||
    filters.action ||
    filters.actorRole ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search.trim()
  )
);
const packageItems = computed(() => [
  ...new Set((commandCenter.value?.workPackages ?? []).map((item) => item.packageNumber))
]);
const aircraftItems = computed(() => [
  ...new Set((commandCenter.value?.fleet ?? []).map((item) => item.registrationNumber))
]);
const entityItems = computed(() => [...new Set(records.value.map((record) => record.entityType))]);
const actionItems = computed(() => [...new Set(records.value.map((record) => record.action))]);
const actorItems = computed(() => [...new Set(records.value.map((record) => record.actorRole))]);
const auditSummaryCards = computed(() => {
  const packageLinked = records.value.filter((record) => packageForRecord(record)).length;
  const releaseEvents = records.value.filter(
    (record) =>
      record.entityType.includes('RELEASE') ||
      record.action.includes('RELEASE') ||
      typeof record.metadata.releaseNumber === 'string'
  ).length;
  return [
    {
      label: 'Audit events',
      value: data.value?.total ?? records.value.length,
      helper: `${records.value.length} loaded`,
      icon: 'mdi-history',
      color: 'primary'
    },
    {
      label: 'Linked packages',
      value: packageLinked,
      helper: 'traceable to work package',
      icon: 'mdi-folder-wrench-outline',
      color: 'teal'
    },
    {
      label: 'Release records',
      value: releaseEvents,
      helper: 'technical release evidence',
      icon: 'mdi-certificate-outline',
      color: 'success'
    },
    {
      label: 'Permanent log',
      value: records.value.length,
      helper: 'immutable event rows',
      icon: 'mdi-lock-check-outline',
      color: 'warning'
    }
  ];
});
const quickRecordFilters = [
  { label: 'Semua', entityType: '', icon: 'mdi-view-list-outline' },
  { label: 'Work Package', entityType: 'WORK_PACKAGE', icon: 'mdi-folder-wrench-outline' },
  { label: 'Job Card', entityType: 'JOB_CARD', icon: 'mdi-clipboard-text-outline' },
  { label: 'Defect', entityType: 'DEFECT', icon: 'mdi-alert-outline' },
  { label: 'Release', entityType: 'TECHNICAL_RELEASE', icon: 'mdi-certificate-outline' }
];
const auditStream = computed(() => records.value.slice(0, 8));

function workPackages() {
  return commandCenter.value?.workPackages ?? [];
}

function packageById(id: string) {
  return workPackages().find((item) => item.id === id);
}

function packageByNumber(packageNumber: string) {
  return workPackages().find((item) => item.packageNumber === packageNumber);
}

function jobCardById(id: string) {
  for (const workPackage of workPackages()) {
    const card = workPackage.jobCards.find((candidate) => candidate.id === id);
    if (card) return { card, workPackage };
  }
  return null;
}

function defectById(id: string) {
  return (commandCenter.value?.defects ?? []).find((defect) => defect.id === id);
}

function packageForRecord(record: MaintenanceAuditRecordDto) {
  if (record.entityType === 'WORK_PACKAGE') return packageById(record.entityId);
  if (record.entityType === 'JOB_CARD') return jobCardById(record.entityId)?.workPackage ?? null;
  if (record.entityType === 'DEFECT') {
    const defect = defectById(record.entityId);
    const packageNumber = record.metadata.packageNumber;
    return (
      workPackages().find((item) => item.primaryDefectId === defect?.id) ??
      (typeof packageNumber === 'string' ? packageByNumber(packageNumber) : null)
    );
  }
  const packageNumber = record.metadata.packageNumber;
  return typeof packageNumber === 'string' ? packageByNumber(packageNumber) : null;
}

function aircraftForRecord(record: MaintenanceAuditRecordDto) {
  const workPackage = packageForRecord(record);
  if (workPackage) return workPackage.aircraftRegistrationNumber;
  const defect = defectById(record.entityId);
  return defect?.aircraftRegistrationNumber ?? '-';
}

function entityReference(record: MaintenanceAuditRecordDto) {
  if (record.entityType === 'WORK_PACKAGE') {
    return packageById(record.entityId)?.packageNumber ?? ui.label(record.entityType);
  }
  if (record.entityType === 'JOB_CARD') {
    return jobCardById(record.entityId)?.card.cardNumber ?? ui.label(record.entityType);
  }
  if (record.entityType === 'DEFECT') {
    const defectNumber = record.metadata.defectNumber;
    return (
      defectById(record.entityId)?.defectNumber ??
      (typeof defectNumber === 'string' ? defectNumber : ui.label(record.entityType))
    );
  }
  const releaseNumber = record.metadata.releaseNumber;
  if (typeof releaseNumber === 'string') return releaseNumber;
  return ui.label(record.entityType);
}

function description(record: MaintenanceAuditRecordDto) {
  const packageRecord = packageForRecord(record);
  const packageText = packageRecord ? ` untuk ${packageRecord.packageNumber}` : '';
  return `${ui.label(record.action)} - ${ui.label(record.entityType)}${packageText}.`;
}

function metadataJson(record: MaintenanceAuditRecordDto) {
  return JSON.stringify(record.metadata, null, 2);
}

function openRecord(record: MaintenanceAuditRecordDto) {
  selectedRecord.value = record;
  detailDrawer.value = true;
}

function applyQuickRecordFilter(entityType: string) {
  filters.entityType = entityType;
}
</script>

<template>
  <VContainer fluid class="records-page">
    <div class="records-header">
      <div>
        <div class="records-header__eyebrow">Maintenance Audit</div>
        <h1>Riwayat Aktivitas</h1>
        <p>
          Jejak aktivitas maintenance berdasarkan pesawat, paket, aktor, tindakan, dan referensi.
          <span class="text-caption">Records & Audit</span>
        </p>
      </div>
      <div class="records-header__actions">
        <VBtn prepend-icon="mdi-refresh" variant="tonal" :loading="pending" @click="refresh()">
          Refresh
        </VBtn>
        <VBtn
          prepend-icon="mdi-folder-wrench-outline"
          color="primary"
          to="/maintenance/work-packages"
        >
          Work Packages
        </VBtn>
      </div>
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: riwayat aktivitas tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role dengan izin membaca audit maintenance.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Riwayat aktivitas belum dapat dimuat.</strong>
      <div>Dampak: traceability belum dapat dikonfirmasi dari UI.</div>
      <div>Langkah berikutnya: pertahankan filter dan coba muat ulang audit.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Coba lagi</VBtn>
      </template>
    </VAlert>

    <div class="records-summary-grid">
      <VCard
        v-for="card in auditSummaryCards"
        :key="card.label"
        border
        elevation="0"
        class="records-summary-card"
        :class="`records-summary-card--${card.color}`"
      >
        <VCardText>
          <VAvatar rounded="lg" size="42" variant="tonal">
            <VIcon :icon="card.icon" size="22" />
          </VAvatar>
          <div>
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.helper }}</small>
          </div>
        </VCardText>
      </VCard>
    </div>

    <div class="records-workspace">
      <VCard border elevation="0" class="records-table-card">
        <VCardText>
          <div class="records-filter-bar">
            <div class="records-quick-filter">
              <VBtn
                v-for="filter in quickRecordFilters"
                :key="filter.label"
                :color="filters.entityType === filter.entityType ? 'primary' : undefined"
                :prepend-icon="filter.icon"
                size="small"
                :variant="filters.entityType === filter.entityType ? 'flat' : 'tonal'"
                @click="applyQuickRecordFilter(filter.entityType)"
              >
                {{ filter.label }}
              </VBtn>
            </div>
            <VDivider class="records-filter-bar__divider" />
            <VSelect
              v-model="filters.aircraft"
              label="Pesawat"
              :items="aircraftItems"
              clearable
              density="compact"
              hide-details
              max-width="190"
            />
            <VSelect
              v-model="filters.package"
              label="Paket"
              :items="packageItems"
              clearable
              density="compact"
              hide-details
              max-width="230"
            />
            <VSelect
              v-model="filters.entityType"
              label="Jenis catatan"
              :items="entityItems"
              clearable
              density="compact"
              hide-details
              max-width="190"
            />
            <VSelect
              v-model="filters.action"
              label="Tindakan"
              :items="actionItems"
              clearable
              density="compact"
              hide-details
              max-width="220"
            />
            <VSelect
              v-model="filters.actorRole"
              label="Aktor"
              :items="actorItems"
              clearable
              density="compact"
              hide-details
              max-width="220"
            />
            <VTextField
              v-model="filters.dateFrom"
              label="Tanggal dari"
              density="compact"
              hide-details
              max-width="160"
            />
            <VTextField
              v-model="filters.dateTo"
              label="Tanggal sampai"
              density="compact"
              hide-details
              max-width="160"
            />
            <VTextField
              v-model="filters.search"
              label="Korelasi atau referensi"
              prepend-inner-icon="mdi-magnify"
              clearable
              density="compact"
              hide-details
              max-width="280"
            />
            <VChip class="records-result-chip" variant="tonal" size="small">
              {{ data?.total ?? 0 }} hasil
            </VChip>
          </div>

          <div class="maintenance-table-wrap">
            <VTable class="maintenance-table maintenance-table--audit">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aktor / tindakan</th>
                  <th>Catatan</th>
                  <th>Konteks terkait</th>
                  <th>Penjelasan</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pending">
                  <td colspan="6">Memuat riwayat aktivitas...</td>
                </tr>
                <tr v-else-if="accessRestricted">
                  <td colspan="6">Akses dibatasi untuk role aktif.</td>
                </tr>
                <tr v-else-if="error">
                  <td colspan="6">Data audit belum tersedia sampai permintaan berhasil.</td>
                </tr>
                <template v-else>
                  <tr v-for="record in records" :key="record.id">
                    <td class="sticky-identifier">{{ format.dateTime(record.occurredAt) }}</td>
                    <td>
                      <div>{{ record.actorRole }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ ui.label(record.action) }}
                      </div>
                    </td>
                    <td>
                      <div>{{ ui.label(record.entityType) }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ entityReference(record) }}
                      </div>
                    </td>
                    <td>
                      <div>{{ aircraftForRecord(record) }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ packageForRecord(record)?.packageNumber ?? '-' }}
                      </div>
                    </td>
                    <td>{{ description(record) }}</td>
                    <td>
                      <VChip size="small" color="success" variant="tonal">Catatan permanen</VChip>
                      <div>
                        <VBtn size="small" variant="text" @click="openRecord(record)">Buka</VBtn>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!records.length">
                    <td colspan="6">
                      {{
                        hasFilters
                          ? 'Tidak ada riwayat sesuai filter.'
                          : 'Belum ada riwayat aktivitas maintenance.'
                      }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </VTable>
          </div>
        </VCardText>
      </VCard>

      <aside class="records-side-stack">
        <VCard border elevation="0">
          <VCardTitle class="records-section-title">
            <div>
              <h2>Activity Stream</h2>
              <p>Event terbaru dengan konteks pesawat dan package.</p>
            </div>
          </VCardTitle>
          <VCardText>
            <div v-if="auditStream.length" class="records-stream">
              <button
                v-for="record in auditStream"
                :key="record.id"
                type="button"
                @click="openRecord(record)"
              >
                <VAvatar rounded="lg" size="32" variant="tonal">
                  <VIcon icon="mdi-history" size="16" />
                </VAvatar>
                <span>
                  <strong>{{ ui.label(record.action) }}</strong>
                  <small>
                    {{ aircraftForRecord(record) }} · {{ entityReference(record) }} ·
                    {{ format.dateTime(record.occurredAt) }}
                  </small>
                </span>
              </button>
            </div>
            <VAlert v-else density="compact" type="info" variant="tonal">
              Tidak ada event pada filter aktif.
            </VAlert>
          </VCardText>
        </VCard>

        <VCard border elevation="0">
          <VCardTitle class="records-section-title">
            <div>
              <h2>Trace Actions</h2>
              <p>Jalur cepat untuk audit drill-down.</p>
            </div>
          </VCardTitle>
          <VCardText class="records-action-list">
            <VBtn
              block
              prepend-icon="mdi-certificate-outline"
              to="/maintenance/releases"
              variant="tonal"
            >
              Technical Releases
            </VBtn>
            <VBtn
              block
              prepend-icon="mdi-file-document-check-outline"
              to="/maintenance/approved-data"
              variant="tonal"
            >
              Approved Data
            </VBtn>
            <VBtn
              block
              prepend-icon="mdi-warehouse"
              to="/maintenance/facility-operations"
              variant="tonal"
            >
              Facility Operations
            </VBtn>
          </VCardText>
        </VCard>
      </aside>
    </div>

    <VNavigationDrawer v-model="detailDrawer" location="right" temporary width="560">
      <template v-if="selectedRecord">
        <div class="pa-4">
          <div class="d-flex align-center ga-3 mb-4">
            <div>
              <h2 class="text-h6 mb-0">{{ ui.label(selectedRecord.action) }}</h2>
              <div class="text-body-2 text-medium-emphasis">
                {{ entityReference(selectedRecord) }} /
                {{ format.dateTime(selectedRecord.occurredAt) }}
              </div>
            </div>
            <VSpacer />
            <VBtn icon="mdi-close" variant="text" @click="detailDrawer = false" />
          </div>
          <VList density="compact" border rounded class="mb-4">
            <VListItem title="Referensi event" :subtitle="selectedRecord.id" />
            <VListItem title="Correlation ID" :subtitle="selectedRecord.requestId ?? '-'" />
            <VListItem title="Aktor" :subtitle="selectedRecord.actorRole" />
            <VListItem title="Sumber" subtitle="Maintenance API" />
            <VListItem title="Jenis catatan" :subtitle="ui.label(selectedRecord.entityType)" />
            <VListItem title="Referensi catatan" :subtitle="entityReference(selectedRecord)" />
            <VListItem
              title="Versi catatan"
              :subtitle="
                selectedRecord.afterVersion === null
                  ? 'Versi tidak berubah'
                  : `Versi ${selectedRecord.afterVersion}`
              "
            />
            <VListItem
              title="Before / after"
              :subtitle="`${selectedRecord.beforeVersion ?? '-'} / ${selectedRecord.afterVersion ?? '-'}`"
            />
            <VListItem title="Pesawat terkait" :subtitle="aircraftForRecord(selectedRecord)" />
            <VListItem
              title="Paket terkait"
              :subtitle="packageForRecord(selectedRecord)?.packageNumber ?? '-'"
            />
          </VList>
          <div class="text-subtitle-2 mb-2">Detail teknis</div>
          <pre class="audit-metadata">{{ metadataJson(selectedRecord) }}</pre>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <VBtn
              v-if="packageForRecord(selectedRecord)"
              :to="`/maintenance/work-packages/${packageForRecord(selectedRecord)?.id}`"
              color="primary"
              variant="tonal"
            >
              Buka Paket Pekerjaan
            </VBtn>
          </div>
        </div>
      </template>
    </VNavigationDrawer>
  </VContainer>
</template>

<style scoped>
.records-page {
  --records-navy: #082b49;
  --records-teal: #0e8c8a;
  --records-orange: #f47a1f;
  --records-muted: rgba(var(--v-theme-on-surface), 0.64);
  background:
    linear-gradient(180deg, rgba(244, 122, 31, 0.05), transparent 340px),
    rgb(var(--v-theme-background));
}

.records-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.records-header h1 {
  color: var(--records-navy);
  font-size: clamp(1.45rem, 2vw, 1.95rem);
  font-weight: 850;
  letter-spacing: 0;
  line-height: 1.12;
}

.records-header p {
  margin: 6px 0 0;
  color: var(--records-muted);
}

.records-header__eyebrow {
  color: var(--records-orange);
  font-size: 0.78rem;
  font-weight: 800;
}

.records-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.records-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.records-summary-card,
.records-table-card,
.records-side-stack :deep(.v-card) {
  border-radius: 8px;
}

.records-summary-card :deep(.v-card-text) {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  align-items: center;
}

.records-summary-card span,
.records-summary-card small,
.records-section-title p,
.records-stream small {
  color: var(--records-muted);
  font-size: 0.78rem;
}

.records-summary-card strong {
  display: block;
  color: var(--records-navy);
  font-size: 1.55rem;
  font-weight: 850;
  line-height: 1;
}

.records-summary-card--teal :deep(.v-avatar) {
  color: var(--records-teal);
}

.records-summary-card--warning :deep(.v-avatar) {
  color: var(--records-orange);
}

.records-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.records-side-stack {
  display: grid;
  gap: 16px;
}

.records-section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.records-section-title h2 {
  color: var(--records-navy);
  font-size: 1rem;
  font-weight: 800;
}

.records-section-title p {
  margin: 3px 0 0;
}

.records-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid rgba(8, 43, 73, 0.1);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(14, 140, 138, 0.06), rgba(244, 122, 31, 0.05));
}

.records-filter-bar :deep(.v-input) {
  flex: 1 1 160px;
  min-width: 150px;
}

.records-quick-filter {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  gap: 8px;
}

.records-filter-bar__divider {
  flex: 1 1 100%;
}

.records-result-chip {
  margin-inline-start: auto;
}

.records-stream {
  display: grid;
  gap: 4px;
}

.records-stream button {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
}

.records-stream span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.records-stream strong {
  color: var(--records-navy);
  font-size: 0.84rem;
}

.records-stream small {
  line-height: 1.35;
}

.records-action-list {
  display: grid;
  gap: 8px;
}

.records-action-list :deep(.v-btn__content) {
  justify-content: flex-start;
}

.maintenance-table-wrap {
  overflow-x: auto;
}

.maintenance-table :deep(table) {
  min-width: 1120px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
  overflow-wrap: anywhere;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--audit :deep(th:nth-child(1)),
.maintenance-table--audit :deep(td:nth-child(1)) {
  width: 170px;
}

.maintenance-table--audit :deep(th:nth-child(2)),
.maintenance-table--audit :deep(td:nth-child(2)),
.maintenance-table--audit :deep(th:nth-child(3)),
.maintenance-table--audit :deep(td:nth-child(3)),
.maintenance-table--audit :deep(th:nth-child(4)),
.maintenance-table--audit :deep(td:nth-child(4)) {
  width: 160px;
}

.maintenance-table--audit :deep(th:nth-child(5)),
.maintenance-table--audit :deep(td:nth-child(5)) {
  width: 300px;
}

.maintenance-table--audit :deep(th:nth-child(6)),
.maintenance-table--audit :deep(td:nth-child(6)) {
  width: 170px;
}

.audit-metadata {
  max-height: 280px;
  overflow: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 12px;
  font-size: 0.78rem;
  white-space: pre-wrap;
}

@media (max-width: 1200px) {
  .records-workspace {
    grid-template-columns: 1fr;
  }

  .records-side-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .records-header {
    flex-direction: column;
  }

  .records-header__actions {
    justify-content: flex-start;
  }

  .records-summary-grid,
  .records-side-stack {
    grid-template-columns: 1fr;
  }

  .records-result-chip {
    margin-inline-start: 0;
  }
}
</style>
