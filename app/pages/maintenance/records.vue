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
  const packageText = packageRecord ? ` for ${packageRecord.packageNumber}` : '';
  return `${ui.label(record.action)} ${ui.label(record.entityType)}${packageText}.`;
}

function metadataJson(record: MaintenanceAuditRecordDto) {
  return JSON.stringify(record.metadata, null, 2);
}

function openRecord(record: MaintenanceAuditRecordDto) {
  selectedRecord.value = record;
  detailDrawer.value = true;
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Records & Audit</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Maintenance audit explorer with package, aircraft, actor, action, and reference filters.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Access restricted.</strong>
      <div>Operational impact: audit records cannot be displayed for this role.</div>
      <div>Required action: switch to a role with maintenance audit read permission.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Unable to load maintenance audit records.</strong>
      <div>Operational impact: traceability cannot be confirmed from the UI.</div>
      <div>Required action: preserve the filters and retry the audit query.</div>
      <div v-if="apiError?.requestId" class="text-caption">Reference: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Retry</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VSelect
            v-model="filters.aircraft"
            label="Aircraft"
            :items="aircraftItems"
            clearable
            density="compact"
            hide-details
            max-width="190"
          />
          <VSelect
            v-model="filters.package"
            label="Package"
            :items="packageItems"
            clearable
            density="compact"
            hide-details
            max-width="230"
          />
          <VSelect
            v-model="filters.entityType"
            label="Entity type"
            :items="entityItems"
            clearable
            density="compact"
            hide-details
            max-width="190"
          />
          <VSelect
            v-model="filters.action"
            label="Action"
            :items="actionItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VSelect
            v-model="filters.actorRole"
            label="Actor"
            :items="actorItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VTextField
            v-model="filters.dateFrom"
            label="Date from"
            density="compact"
            hide-details
            max-width="160"
          />
          <VTextField
            v-model="filters.dateTo"
            label="Date to"
            density="compact"
            hide-details
            max-width="160"
          />
          <VTextField
            v-model="filters.search"
            label="Correlation or reference"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="280"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ data?.total ?? 0 }} result(s)</VChip>
        </div>

        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--audit">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / action</th>
                <th>Entity</th>
                <th>Related context</th>
                <th>Description</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="6">Loading audit records...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="6">Access restricted for the active role.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="6">Audit data is unavailable until the API request succeeds.</td>
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
                    <VChip size="small" color="success" variant="tonal">Immutable record</VChip>
                    <div>
                      <VBtn size="small" variant="text" @click="openRecord(record)">Open</VBtn>
                    </div>
                  </td>
                </tr>
                <tr v-if="!records.length">
                  <td colspan="6">
                    {{
                      hasFilters
                        ? 'No audit records match the current filters.'
                        : 'No maintenance audit records.'
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>

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
            <VListItem title="Event reference" :subtitle="selectedRecord.id" />
            <VListItem title="Correlation ID" :subtitle="selectedRecord.requestId ?? '-'" />
            <VListItem title="Actor" :subtitle="selectedRecord.actorRole" />
            <VListItem title="Source" subtitle="Maintenance API" />
            <VListItem title="Entity type" :subtitle="ui.label(selectedRecord.entityType)" />
            <VListItem title="Entity reference" :subtitle="entityReference(selectedRecord)" />
            <VListItem
              title="Entity version"
              :subtitle="
                selectedRecord.afterVersion === null
                  ? 'Version unchanged'
                  : `Version ${selectedRecord.afterVersion}`
              "
            />
            <VListItem
              title="Before / after"
              :subtitle="`${selectedRecord.beforeVersion ?? '-'} / ${selectedRecord.afterVersion ?? '-'}`"
            />
            <VListItem title="Related aircraft" :subtitle="aircraftForRecord(selectedRecord)" />
            <VListItem
              title="Related package"
              :subtitle="packageForRecord(selectedRecord)?.packageNumber ?? '-'"
            />
          </VList>
          <div class="text-subtitle-2 mb-2">Technical metadata</div>
          <pre class="audit-metadata">{{ metadataJson(selectedRecord) }}</pre>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <VBtn
              v-if="packageForRecord(selectedRecord)"
              :to="`/maintenance/work-packages/${packageForRecord(selectedRecord)?.id}`"
              color="primary"
              variant="tonal"
            >
              Open Work Package
            </VBtn>
          </div>
        </div>
      </template>
    </VNavigationDrawer>
  </VContainer>
</template>

<style scoped>
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
</style>
