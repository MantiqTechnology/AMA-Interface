<script setup lang="ts">
import type { GeneralLedgerLineDto, JournalEntryDto } from '#shared/features/finance/accounting';
import { humanizeAccountingValue, sourceLabel } from '../workbench';

const props = defineProps<{
  items: JournalEntryDto[];
  ledger: GeneralLedgerLineDto[];
  loading: boolean;
  error: string;
  canPost: boolean;
  busyAction: string | null;
  reversedJournalIds: string[];
  initialStatus?: string;
}>();
const emit = defineEmits<{ open: [id: string]; reverse: [journal: JournalEntryDto]; retry: [] }>();
const status = ref(props.initialStatus ?? 'ALL');
const journalType = ref('ALL');
const dateFrom = ref('');
const dateTo = ref('');
const search = ref('');

watch(
  () => props.initialStatus,
  (value) => {
    if (value) status.value = value;
  }
);

const totals = computed(() => {
  const map = new Map<string, number>();
  for (const line of props.ledger)
    map.set(line.journalEntryId, (map.get(line.journalEntryId) ?? 0) + line.debitMinor);
  return map;
});
const filtered = computed(() =>
  props.items.filter((item: JournalEntryDto) => {
    const type = item.reversalOfJournalEntryId ? 'REVERSAL' : 'SYSTEM';
    const term = search.value.trim().toLowerCase();
    return (
      (status.value === 'ALL' || item.status === status.value) &&
      (journalType.value === 'ALL' || type === journalType.value) &&
      (!dateFrom.value || (item.postingDate ?? item.transactionDate) >= dateFrom.value) &&
      (!dateTo.value || (item.postingDate ?? item.transactionDate) <= dateTo.value) &&
      (!term ||
        `${item.journalNumber} ${item.sourceType} ${item.sourceId} ${item.policyCode}`
          .toLowerCase()
          .includes(term))
    );
  })
);
const headers = [
  { title: 'Journal', key: 'journalNumber' },
  { title: 'Posting date', key: 'postingDate' },
  { title: 'Type', key: 'type' },
  { title: 'Source', key: 'source' },
  { title: 'Policy', key: 'policyCode' },
  { title: 'Status', key: 'status' },
  { title: 'Total', key: 'total', align: 'end' as const },
  { title: 'Action', key: 'actions', sortable: false, align: 'end' as const }
];
function money(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
    : '—';
}
function typeOf(item: JournalEntryDto) {
  return item.reversalOfJournalEntryId ? 'REVERSAL' : 'SYSTEM';
}
function canReverse(item: JournalEntryDto) {
  return (
    item.status === 'POSTED' &&
    !item.reversalOfJournalEntryId &&
    !props.reversedJournalIds.includes(item.id)
  );
}
</script>

<template>
  <section class="journal-panel" aria-labelledby="general-journal-heading">
    <header class="panel-heading">
      <div>
        <h2 id="general-journal-heading">General Journal</h2>
        <p>Header-level journal records with posting and reversal status.</p>
      </div>
    </header>
    <div class="journal-filters">
      <VSelect
        v-model="status"
        density="compact"
        hide-details
        :items="['ALL', 'POSTED', 'REVERSED']"
        label="Status"
        variant="outlined"
      />
      <VSelect
        v-model="journalType"
        density="compact"
        hide-details
        :items="['ALL', 'SYSTEM', 'REVERSAL']"
        label="Journal type"
        variant="outlined"
      />
      <VTextField
        v-model="dateFrom"
        density="compact"
        hide-details
        label="Date from"
        type="date"
        variant="outlined"
      />
      <VTextField
        v-model="dateTo"
        density="compact"
        hide-details
        label="Date to"
        type="date"
        variant="outlined"
      />
      <VTextField
        v-model="search"
        clearable
        density="compact"
        hide-details
        label="Search journals"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
    </div>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      General Journal could not be loaded.<template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert>
    <VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@5" />
    <div v-else-if="!filtered.length" class="empty-state">
      <VIcon icon="mdi-file-search-outline" size="34" /><strong>No journals match these filters.</strong><VBtn
        size="small"
        variant="text"
        @click="
          status = 'ALL';
          journalType = 'ALL';
          dateFrom = '';
          dateTo = '';
          search = '';
        "
      >
        Reset filters
      </VBtn>
    </div>
    <VDataTable
      v-else
      :headers="headers"
      :items="filtered"
      density="comfortable"
      :items-per-page="10"
    >
      <template #[`item.journalNumber`]="{ item }">
        <button class="journal-link" type="button" @click="emit('open', item.id)">
          {{ item.journalNumber }}
        </button>
      </template>
      <template #[`item.postingDate`]="{ item }">{{ date(item.postingDate) }}</template>
      <template #[`item.type`]="{ item }">{{ humanizeAccountingValue(typeOf(item)) }}</template>
      <template #[`item.source`]="{ item }">
        <span>{{ sourceLabel(item.sourceType, item.sourceId) }}</span>
      </template>
      <template #[`item.policyCode`]="{ item }">
        <strong>{{ item.policyCode }}</strong>
        <div class="secondary-text">Version {{ item.policyVersion }}</div>
      </template>
      <template #[`item.status`]="{ item }">
        <DsStatusBadge :value="item.status" /><span class="sr-only">{{
          humanizeAccountingValue(item.status)
        }}</span>
      </template>
      <template #[`item.total`]="{ item }">
        <span class="money">{{
          totals.has(item.id) ? money(totals.get(item.id) ?? 0, item.currencyCode) : '—'
        }}</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <DsTooltipIconButton
          v-if="canReverse(item)"
          :aria-label="`Reverse ${item.journalNumber}`"
          :disabled="!canPost"
          :loading="busyAction === `reverse:${item.id}`"
          icon="mdi-undo-variant"
          size="small"
          tooltip="Reverse posted journal"
          variant="text"
          @click="emit('reverse', item)"
        />
      </template>
    </VDataTable>
  </section>
</template>

<style scoped>
.journal-panel {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 10px;
  overflow: hidden;
}
.panel-heading {
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  padding: 16px 18px;
}
.panel-heading h2 {
  font-size: 1rem;
  margin: 0;
}
.panel-heading p {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  margin: 3px 0 0;
}
.journal-filters {
  display: grid;
  gap: 10px;
  grid-template-columns: 150px 160px 150px 150px minmax(190px, 1fr);
  padding: 14px 16px;
}
.journal-link {
  background: none;
  border: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0;
}
.journal-link:hover {
  text-decoration: underline;
}
.money {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.secondary-text {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.empty-state {
  align-items: center;
  color: rgb(var(--v-theme-text-secondary));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px 16px;
}
.empty-state strong {
  color: rgb(var(--v-theme-text-primary));
}
.sr-only {
  clip: rect(0, 0, 0, 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  width: 1px;
}
@media (max-width: 1100px) {
  .journal-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .journal-filters {
    grid-template-columns: 1fr;
  }
}
</style>
