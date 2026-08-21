<script setup lang="ts">
import type { JournalEntryDto } from '#shared/features/finance/accounting';
import type {
  FinanceTraceabilityDto,
  FinancialExportSummaryDto,
  FinancialReportType
} from '#shared/features/finance/governance';
import type { FinanceReportingPeriodDto } from '#shared/features/finance/reporting';
import { ApiClientError } from '../../composables/useApiEnvelope';

type AuditRow = {
  id: string;
  actorId: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  sourceReference: string | null;
  occurredAt: string;
};
type ExportResult = {
  id: string;
  filename: string;
  mimeType: string;
  content: string;
  rowCount: number;
  createdAt: string;
};
useHead({ title: 'Finance Audit & Export - PT AMA' });
const { can } = useAuthorization();
const canExport = computed(() => can('finance.audit.export').allowed);
const selectedPeriod = ref('');
const reportType = ref<FinancialReportType>('GENERAL_LEDGER');
const journalId = ref('');
const trace = ref<FinanceTraceabilityDto | null>(null);
const exportError = ref('');
const traceError = ref('');
const busy = ref(false);
const tracing = ref(false);
const reportTypes: FinancialReportType[] = [
  'JOURNAL',
  'GENERAL_LEDGER',
  'TRIAL_BALANCE',
  'AR',
  'AP',
  'BANK_RECONCILIATION',
  'PROFIT_LOSS',
  'BALANCE_SHEET'
];
const { data: periods } = await useAsyncData(
  'audit-periods',
  () => fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods'),
  { default: () => [] }
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value[0]?.code ?? '';
const {
  data: audit,
  pending,
  error,
  refresh: refreshAuditData
} = await useAsyncData(
  'finance-audit-log',
  () => fetchApi<AuditRow[]>('/api/finance/governance/audit'),
  { default: () => [] }
);
const {
  data: exports,
  pending: exportsPending,
  error: exportsLoadError,
  refresh: refreshExports
} = await useAsyncData(
  'finance-export-history',
  () =>
    fetchApi<FinancialExportSummaryDto[]>('/api/finance/governance/exports', {
      query: { limit: 50 }
    }),
  { default: () => [] }
);
const {
  data: journals,
  pending: journalsPending,
  error: journalsError,
  refresh: refreshJournals
} = await useAsyncData(
  'finance-audit-journals',
  () =>
    fetchApi<JournalEntryDto[]>('/api/finance/accounting/journals', {
      query: { status: 'POSTED', limit: 100 }
    }),
  { default: () => [] }
);
const periodOptions = computed(() =>
  periods.value.map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);
const journalOptions = computed(() =>
  journals.value.map((journal) => ({
    title: `${journal.journalNumber} · ${journal.sourceType} · ${journal.id}`,
    value: journal.id
  }))
);
if (!journalId.value) journalId.value = journals.value[0]?.id ?? '';
function actionMessage(cause: unknown) {
  if (cause instanceof ApiClientError) {
    const reference = [cause.code, cause.requestId ? `Request ${cause.requestId}` : '']
      .filter(Boolean)
      .join(' · ');
    return reference ? `${cause.message} (${reference})` : cause.message;
  }
  return cause instanceof Error ? cause.message : String(cause);
}
async function refreshAll() {
  exportError.value = '';
  traceError.value = '';
  await Promise.all([refreshAuditData(), refreshExports(), refreshJournals()]);
}
async function exportCsv() {
  exportError.value = '';
  busy.value = true;
  try {
    const result = await fetchApi<ExportResult>('/api/finance/governance/exports', {
      method: 'POST',
      body: { reportType: reportType.value, period: selectedPeriod.value }
    });
    const url = URL.createObjectURL(new Blob([result.content], { type: result.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    await Promise.all([refreshAuditData(), refreshExports()]);
  } catch (cause) {
    exportError.value = actionMessage(cause);
  } finally {
    busy.value = false;
  }
}
async function traceJournal() {
  traceError.value = '';
  trace.value = null;
  tracing.value = true;
  try {
    trace.value = await fetchApi<FinanceTraceabilityDto>('/api/finance/governance/traceability', {
      query: { journalId: journalId.value }
    });
  } catch (cause) {
    traceError.value = actionMessage(cause);
  } finally {
    tracing.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Finance Audit & Export</h1>
        <p class="text-body-2 text-text-secondary">
          Critical action history, controlled report export, and bidirectional accounting lineage.
        </p>
      </div>
      <VSpacer /><VBtn
        aria-label="Refresh audit"
        icon="mdi-refresh"
        :loading="pending || exportsPending || journalsPending"
        variant="tonal"
        @click="refreshAll"
      />
    </header>
    <VAlert
      v-if="error || exportsLoadError || journalsError"
      class="mb-4"
      color="error"
      title="Governance data unavailable"
      variant="tonal"
    >
      {{ error?.message || exportsLoadError?.message || journalsError?.message }}
    </VAlert>
    <VRow class="mb-5">
      <VCol cols="12" lg="6">
        <VCard border class="pa-4" height="100%" rounded="lg">
          <h2 class="text-subtitle-1 font-weight-bold">Controlled export</h2>
          <div class="mt-4 d-flex flex-wrap ga-3">
            <VSelect
              v-model="reportType"
              hide-details
              :items="reportTypes"
              label="Report"
              style="min-width: 220px"
              variant="outlined"
            /><VSelect
              v-model="selectedPeriod"
              hide-details
              :items="periodOptions"
              label="Period"
              style="min-width: 220px"
              variant="outlined"
            /><VBtn v-if="canExport" prepend-icon="mdi-download" :loading="busy" @click="exportCsv">
              Export CSV
            </VBtn>
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" lg="6">
        <VCard border class="pa-4" height="100%" rounded="lg">
          <h2 class="text-subtitle-1 font-weight-bold">Trace journal</h2>
          <div class="mt-4 d-flex ga-3">
            <VAutocomplete
              v-model="journalId"
              clearable
              hide-details
              :items="journalOptions"
              label="Posted journal"
              :loading="journalsPending"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            /><VBtn
              :disabled="!journalId"
              :loading="tracing"
              prepend-icon="mdi-source-branch"
              @click="traceJournal"
            >
              Trace
            </VBtn>
          </div>
          <VAlert
            v-if="traceError"
            class="mt-3"
            color="error"
            density="compact"
            title="Trace failed"
            variant="tonal"
          >
            {{ traceError }}
          </VAlert>
        </VCard>
      </VCol>
    </VRow>
    <VAlert v-if="exportError" class="mb-4" color="error" title="Export failed" variant="tonal">
      {{
        exportError
      }}
    </VAlert>
    <VCard v-if="trace" border class="mb-5" rounded="lg">
      <VCardTitle>Accounting lineage</VCardTitle><VCardText>
        <div class="lineage-grid">
          <div>
            <div class="text-caption">Source</div>
            <div class="font-weight-medium">{{ trace.source.type }} / {{ trace.source.id }}</div>
          </div>
          <div>
            <div class="text-caption">Handoff</div>
            <div class="font-weight-medium">{{ trace.handoff?.id || '-' }}</div>
          </div>
          <div>
            <div class="text-caption">Accounting event</div>
            <div class="font-weight-medium">{{ trace.accountingEvent?.id || '-' }}</div>
          </div>
          <div>
            <div class="text-caption">Journal</div>
            <div class="font-weight-medium">{{ trace.journal?.journalNumber || '-' }}</div>
          </div>
        </div>
        <div class="mt-4 d-flex flex-wrap ga-2">
          <VBtn
            v-if="trace.source.route"
            :to="trace.source.route"
            prepend-icon="mdi-open-in-new"
            variant="outlined"
          >
            Source
          </VBtn><VBtn
            v-for="link in trace.reportLinks"
            :key="link"
            :to="link"
            prepend-icon="mdi-file-chart-outline"
            variant="outlined"
          >
            Report
          </VBtn>
        </div>
      </VCardText>
    </VCard>
    <VCard border class="mb-5" rounded="lg">
      <VCardTitle>Recent controlled exports</VCardTitle><VSkeletonLoader v-if="exportsPending && !exports.length" type="table" /><VCardText
        v-else-if="!exports.length"
        class="py-10 text-center text-text-secondary"
      >
        No controlled exports.
      </VCardText><VTable v-else>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Report</th>
            <th>Period</th>
            <th>Requested by</th>
            <th class="text-right">Rows</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in exports" :key="item.id">
            <td>{{ new Date(item.createdAt).toLocaleString('id-ID') }}</td>
            <td><DsStatusBadge :value="item.reportType" /></td>
            <td>{{ item.periodCode || 'All' }}</td>
            <td>
              {{ item.requestedBy }}
              <div class="text-caption">{{ item.requestedRole }}</div>
            </td>
            <td class="text-right">{{ item.rowCount }}</td>
            <td>{{ item.filename }}</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
    <VCard border rounded="lg">
      <VCardTitle>Financial audit trail</VCardTitle><VSkeletonLoader v-if="pending && !audit.length" type="table" /><VCardText
        v-else-if="!audit.length"
        class="py-10 text-center text-text-secondary"
      >
        No financial audit records.
      </VCardText><VTable v-else>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Reference / reason</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in audit" :key="item.id">
            <td>{{ new Date(item.occurredAt).toLocaleString('id-ID') }}</td>
            <td>
              {{ item.actorId }}
              <div class="text-caption">{{ item.actorRole || '-' }}</div>
            </td>
            <td><DsStatusBadge :value="item.action" /></td>
            <td>
              {{ item.entityType }}
              <div class="text-caption">{{ item.entityId }}</div>
            </td>
            <td>{{ item.sourceReference || item.reason || '-' }}</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </VContainer>
</template>

<style scoped>
.lineage-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}
</style>
