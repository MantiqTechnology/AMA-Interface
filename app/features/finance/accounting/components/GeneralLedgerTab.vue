<script setup lang="ts">
import { useDisplay } from 'vuetify';
import type { GeneralLedgerLineDto } from '#shared/features/finance/accounting';
import { groupLedgerLines, lineDimensions, sourceLabel } from '../workbench';

const props = defineProps<{
  items: GeneralLedgerLineDto[];
  loading: boolean;
  error: string;
  journalFilter: string | null;
}>();
const emit = defineEmits<{ open: [journalId: string]; retry: []; clearJournalFilter: [] }>();
const { smAndDown } = useDisplay();
const period = ref('ALL');
const account = ref('ALL');
const searchInput = ref('');
const search = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const station = ref('');
const aircraft = ref('');
const flight = ref('');
const workOrder = ref('');
const sourceType = ref('');
const filtersOpen = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(searchInput, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    search.value = value.trim().toLowerCase();
    page.value = 1;
  }, 250);
});
onBeforeUnmount(() => clearTimeout(searchTimer));

const periodItems = computed(() => [
  { title: 'All periods', value: 'ALL' },
  ...[...new Set<string>(props.items.map((item: GeneralLedgerLineDto) => item.periodCode))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ title: value, value }))
]);
const accountItems = computed(() => [
  { title: 'All accounts', value: 'ALL' },
  ...[
    ...new Map(
      props.items.map((item: GeneralLedgerLineDto) => [
        item.accountCode,
        { title: `${item.accountCode} · ${item.accountName}`, value: item.accountCode }
      ])
    ).values()
  ]
]);
const dateFromItems = computed(() => selectItems(props.items, 'postingDate', 'Earliest date'));
const dateToItems = computed(() => selectItems(props.items, 'postingDate', 'Latest date'));
const aircraftItems = computed(() => selectItems(props.items, 'aircraftId', 'All aircraft'));
const stationItems = computed(() => selectItems(props.items, 'stationId', 'All stations'));
const flightItems = computed(() => selectItems(props.items, 'flightId', 'All flights'));
const workOrderItems = computed(() =>
  selectItems(props.items, 'workOrderReference', 'All work orders')
);
const advancedFilterCount = computed(
  () =>
    [
      dateFrom.value,
      dateTo.value,
      station.value,
      aircraft.value,
      flight.value,
      workOrder.value,
      sourceType.value
    ].filter(Boolean).length
);
const journalScoped = computed(() =>
  props.journalFilter
    ? props.items.filter(
        (item: GeneralLedgerLineDto) => item.journalEntryId === props.journalFilter
      )
    : props.items
);
const filteredLines = computed(() =>
  journalScoped.value.filter((item: GeneralLedgerLineDto) => {
    const haystack =
      `${item.journalNumber} ${item.sourceType} ${item.sourceId} ${item.accountCode} ${item.accountName} ${item.description}`.toLowerCase();
    return (
      (period.value === 'ALL' || item.periodCode === period.value) &&
      (account.value === 'ALL' || item.accountCode === account.value) &&
      (!search.value || haystack.includes(search.value)) &&
      (!dateFrom.value || item.postingDate >= dateFrom.value) &&
      (!dateTo.value || item.postingDate <= dateTo.value) &&
      (!station.value || item.stationId === station.value) &&
      (!aircraft.value || item.aircraftId === aircraft.value) &&
      (!flight.value || item.flightId === flight.value) &&
      (!workOrder.value || item.workOrderReference === workOrder.value) &&
      (!sourceType.value || item.sourceType === sourceType.value)
    );
  })
);
const groups = computed(() => groupLedgerLines(filteredLines.value));
const pageCount = computed(() => Math.max(1, Math.ceil(groups.value.length / itemsPerPage.value)));
const pagedGroups = computed(() =>
  groups.value.slice((page.value - 1) * itemsPerPage.value, page.value * itemsPerPage.value)
);
const totals = computed(() =>
  filteredLines.value.reduce(
    (result: { debit: number; credit: number }, line: GeneralLedgerLineDto) => ({
      debit: result.debit + line.debitMinor,
      credit: result.credit + line.creditMinor
    }),
    { debit: 0, credit: 0 }
  )
);
const openingBalance = computed(() => {
  if (period.value === 'ALL') return 0;
  return journalScoped.value
    .filter((line: GeneralLedgerLineDto) => line.periodCode < period.value)
    .reduce(
      (sum: number, line: GeneralLedgerLineDto) => sum + line.debitMinor - line.creditMinor,
      0
    );
});
const balanced = computed(() => totals.value.debit === totals.value.credit);
const sourceTypes = computed(() => [
  { title: 'All source types', value: '' },
  ...[...new Set<string>(props.items.map((item: GeneralLedgerLineDto) => item.sourceType))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ title: value.replaceAll('_', ' '), value }))
]);
const journalNumbersById = computed(
  () =>
    new Map(
      props.items.map((item: GeneralLedgerLineDto) => [item.journalEntryId, item.journalNumber])
    )
);

watch(
  [
    period,
    account,
    dateFrom,
    dateTo,
    station,
    aircraft,
    flight,
    workOrder,
    sourceType,
    () => props.journalFilter
  ],
  () => {
    page.value = 1;
  }
);
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});

function resetFilters() {
  period.value = 'ALL';
  account.value = 'ALL';
  searchInput.value = '';
  search.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  station.value = '';
  aircraft.value = '';
  flight.value = '';
  workOrder.value = '';
  sourceType.value = '';
  page.value = 1;
}
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
function date(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}
function selectItems(
  items: GeneralLedgerLineDto[],
  key: keyof Pick<
    GeneralLedgerLineDto,
    'postingDate' | 'aircraftId' | 'stationId' | 'flightId' | 'workOrderReference'
  >,
  allTitle: string
) {
  const values = [
    ...new Set(items.map((item) => item[key]).filter((value): value is string => Boolean(value)))
  ].sort((left, right) => left.localeCompare(right));
  return [
    { title: allTitle, value: '' },
    ...values.map((value) => ({
      title: key === 'postingDate' ? date(value) : value,
      value
    }))
  ];
}
function displaySource(sourceType: string, sourceId: string) {
  if (sourceType === 'JOURNAL_ENTRY') {
    return `Journal reversal · ${journalNumbersById.value.get(sourceId) ?? 'Related journal'}`;
  }
  return sourceLabel(sourceType, sourceId);
}
function exportLedger() {
  const rows: string[][] = [
    ['Posting date', 'Journal', 'Account', 'Source', 'Debit', 'Credit', 'Dimensions'],
    ...filteredLines.value.map((line: GeneralLedgerLineDto) => [
      line.postingDate,
      line.journalNumber,
      `${line.accountCode} ${line.accountName}`,
      displaySource(line.sourceType, line.sourceId),
      String(line.debitMinor),
      String(line.creditMinor),
      lineDimensions(line).join(' | ')
    ])
  ];
  const csv = rows
    .map((row: string[]) => row.map((cell: string) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = 'general-ledger.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
</script>

<template>
  <section class="ledger-panel" aria-labelledby="general-ledger-heading">
    <header class="panel-heading">
      <div>
        <h2 id="general-ledger-heading">General Ledger</h2>
        <p>Posted journal lines grouped by double-entry journal.</p>
      </div>
    </header>
    <VAlert
      v-if="journalFilter"
      class="journal-filter"
      color="info"
      density="compact"
      variant="tonal"
    >
      Showing one journal in the General Ledger.<template #append>
        <VBtn size="small" variant="text" @click="emit('clearJournalFilter')"> Clear </VBtn>
      </template>
    </VAlert>
    <div class="filter-toolbar">
      <VSelect
        v-model="period"
        bg-color="surface"
        class="ledger-control"
        color="primary"
        density="compact"
        hide-details
        :items="periodItems"
        item-title="title"
        item-value="value"
        label="Period"
        variant="outlined"
      />
      <VSelect
        v-model="account"
        bg-color="surface"
        class="ledger-control"
        color="primary"
        density="compact"
        hide-details
        :items="accountItems"
        label="Account"
        variant="outlined"
      />
      <VTextField
        v-model="searchInput"
        bg-color="surface"
        class="ledger-control"
        color="primary"
        clearable
        density="compact"
        hide-details
        label="Search journal or source"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
      <VMenu
        v-model="filtersOpen"
        :close-on-content-click="false"
        location="bottom end"
        max-width="620"
      >
        <template #activator="{ props: menuProps }">
          <VBtn v-bind="menuProps" prepend-icon="mdi-filter-variant" variant="outlined">
            More filters<VBadge
              v-if="advancedFilterCount"
              class="ml-2"
              color="primary"
              :content="advancedFilterCount"
              inline
            />
          </VBtn>
        </template>
        <VCard class="advanced-filter-card">
          <VCardTitle class="text-subtitle-1">More filters</VCardTitle><VCardText class="advanced-filter-grid">
            <VSelect
              v-model="dateFrom"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="dateFromItems"
              label="Date from"
              variant="outlined"
            /><VSelect
              v-model="dateTo"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="dateToItems"
              label="Date to"
              variant="outlined"
            />
            <VSelect
              v-model="aircraft"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="aircraftItems"
              label="Aircraft"
              variant="outlined"
            /><VSelect
              v-model="station"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="stationItems"
              label="Station"
              variant="outlined"
            />
            <VSelect
              v-model="flight"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="flightItems"
              label="Flight"
              variant="outlined"
            /><VSelect
              v-model="workOrder"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="workOrderItems"
              label="Work order"
              variant="outlined"
            />
            <VSelect
              v-model="sourceType"
              bg-color="surface"
              class="ledger-control"
              color="primary"
              density="compact"
              hide-details
              :items="sourceTypes"
              label="Source type"
              variant="outlined"
            />
          </VCardText><VCardActions>
            <VBtn variant="text" @click="resetFilters">Reset all</VBtn><VSpacer /><VBtn
              color="primary"
              variant="tonal"
              @click="filtersOpen = false"
            >
              Apply
            </VBtn>
          </VCardActions>
        </VCard>
      </VMenu>
      <VBtn
        prepend-icon="mdi-download-outline"
        variant="outlined"
        :disabled="!filteredLines.length"
        @click="exportLedger"
      >
        Export
      </VBtn>
    </div>
    <div class="ledger-summary" aria-label="Filtered General Ledger summary">
      <div>
        <span>Opening balance</span><strong>{{ money(openingBalance) }}</strong>
      </div>
      <div>
        <span>Total debit</span><strong>{{ money(totals.debit) }}</strong>
      </div>
      <div>
        <span>Total credit</span><strong>{{ money(totals.credit) }}</strong>
      </div>
      <div>
        <span>Net movement</span><strong :class="{ 'text-warning': !balanced }">{{
          money(totals.debit - totals.credit)
        }}</strong>
      </div>
    </div>
    <VAlert v-if="!balanced" class="mx-4 mt-3" color="warning" density="compact" variant="tonal">
      Filtered debit and credit totals differ by
      {{ money(Math.abs(totals.debit - totals.credit)) }}.
    </VAlert>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      General Ledger could not be loaded.<template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert>
    <VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@6" />
    <div v-else-if="!groups.length" class="empty-state">
      <VIcon icon="mdi-book-search-outline" size="34" /><strong>No posted journal lines match these filters.</strong><VBtn size="small" variant="text" @click="resetFilters">Reset filters</VBtn>
    </div>
    <div v-else-if="smAndDown" class="ledger-cards">
      <article v-for="group in pagedGroups" :key="group.journalEntryId" class="ledger-card">
        <header>
          <div>
            <button type="button" @click="emit('open', group.journalEntryId)">
              {{ group.journalNumber }}
            </button><span>{{ date(group.postingDate) }}</span>
          </div>
          <VTooltip location="top">
            <template #activator="{ props: tipProps }">
              <small v-bind="tipProps">{{ displaySource(group.sourceType, group.sourceId) }}</small>
            </template>
            Source reference: {{ group.sourceId }}
          </VTooltip>
        </header>
        <div v-for="line in group.lines" :key="line.journalLineId" class="mobile-line">
          <div>
            <strong>{{ line.accountCode }} · {{ line.accountName }}</strong>
            <div class="dimension-list">
              <VChip
                v-for="dimension in lineDimensions(line).slice(0, 2)"
                :key="dimension"
                size="x-small"
                variant="tonal"
              >
                {{ dimension }}
              </VChip><VChip v-if="lineDimensions(line).length > 2" size="x-small">
                +{{ lineDimensions(line).length - 2 }}
              </VChip>
            </div>
          </div>
          <span class="money">{{
            line.debitMinor ? `Dr ${money(line.debitMinor)}` : `Cr ${money(line.creditMinor)}`
          }}</span>
        </div>
      </article>
    </div>
    <div v-else class="ledger-table-wrap">
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Posting date</th>
            <th>Journal</th>
            <th>Account</th>
            <th>Source</th>
            <th class="amount-heading">Debit</th>
            <th class="amount-heading">Credit</th>
            <th>Dimensions</th>
          </tr>
        </thead>
        <tbody v-for="group in pagedGroups" :key="group.journalEntryId" class="journal-group">
          <tr v-for="(line, index) in group.lines" :key="line.journalLineId">
            <td>
              <span v-if="index === 0">{{ date(group.postingDate) }}</span><span v-else class="sr-only">Same posting date: {{ date(group.postingDate) }}</span>
            </td>
            <td>
              <button
                v-if="index === 0"
                class="journal-link"
                type="button"
                @click="emit('open', group.journalEntryId)"
              >
                {{ group.journalNumber }}
              </button><span v-else class="group-connector" aria-hidden="true" />
            </td>
            <td>
              <strong>{{ line.accountCode }}</strong> · {{ line.accountName }}
            </td>
            <td>
              <VTooltip v-if="index === 0" location="top">
                <template #activator="{ props: tipProps }">
                  <span v-bind="tipProps">{{
                    displaySource(group.sourceType, group.sourceId)
                  }}</span>
                </template>
                Source reference: {{ group.sourceId }}
              </VTooltip><span v-else class="sr-only">Same source: {{ displaySource(group.sourceType, group.sourceId) }}</span>
            </td>
            <td class="money">{{ line.debitMinor ? money(line.debitMinor) : '—' }}</td>
            <td class="money">{{ line.creditMinor ? money(line.creditMinor) : '—' }}</td>
            <td>
              <div class="dimension-list">
                <VChip
                  v-for="dimension in lineDimensions(line).slice(0, 2)"
                  :key="dimension"
                  size="x-small"
                  variant="tonal"
                >
                  {{ dimension }}
                </VChip><VTooltip v-if="lineDimensions(line).length > 2" location="top">
                  <template #activator="{ props: tipProps }">
                    <VChip
                      v-bind="tipProps"
                      size="x-small"
                      :aria-label="`${lineDimensions(line).length - 2} more dimensions`"
                    >
                      +{{ lineDimensions(line).length - 2 }}
                    </VChip>
                  </template>{{ lineDimensions(line).slice(2).join(' · ') }}
                </VTooltip>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer v-if="groups.length" class="pagination-footer">
      <VSelect
        v-model="itemsPerPage"
        density="compact"
        hide-details
        :items="[10, 20, 50]"
        label="Items per page"
        style="max-width: 150px"
        variant="outlined"
      /><span>{{ (page - 1) * itemsPerPage + 1 }}–{{ Math.min(page * itemsPerPage, groups.length) }} of
        {{ groups.length }}</span>
      <div>
        <DsTooltipIconButton
          aria-label="Previous page"
          :disabled="page <= 1"
          icon="mdi-chevron-left"
          tooltip="Previous page"
          variant="text"
          @click="page--"
        /><DsTooltipIconButton
          aria-label="Next page"
          :disabled="page >= pageCount"
          icon="mdi-chevron-right"
          tooltip="Next page"
          variant="text"
          @click="page++"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.ledger-panel {
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
.journal-filter {
  margin: 12px 14px 0;
}
.filter-toolbar {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 150px minmax(210px, 0.8fr) minmax(240px, 1fr) auto auto;
  padding: 14px 16px;
}
.ledger-control :deep(.v-field) {
  color: rgb(var(--v-theme-text-primary));
}
.ledger-control :deep(.v-field__input),
.ledger-control :deep(.v-select__selection-text) {
  color: rgb(var(--v-theme-text-primary));
  opacity: 1;
}
.ledger-control :deep(.v-field-label) {
  color: rgb(var(--v-theme-text-secondary));
  opacity: 1;
}
.advanced-filter-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  box-shadow: 0 18px 42px rgba(14, 28, 36, 0.18);
  color: rgb(var(--v-theme-text-primary));
  width: min(620px, calc(100vw - 32px));
}
.advanced-filter-card :deep(.v-card-title),
.advanced-filter-card :deep(.v-card-actions) {
  color: rgb(var(--v-theme-text-primary));
}
.advanced-filter-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.ledger-summary {
  background: rgba(40, 110, 158, 0.045);
  border-block: 1px solid rgb(var(--v-theme-border-default));
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.ledger-summary > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 18px;
}
.ledger-summary > div + div {
  border-left: 1px solid rgb(var(--v-theme-border-default));
}
.ledger-summary span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.ledger-summary strong {
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}
.ledger-table-wrap {
  overflow-x: auto;
}
.ledger-table {
  border-collapse: collapse;
  font-size: 0.8125rem;
  min-width: 1050px;
  width: 100%;
}
.ledger-table th {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
  padding: 12px;
  text-align: left;
}
.ledger-table td {
  border-top: 1px solid rgba(var(--v-theme-border-default), 0.7);
  padding: 11px 12px;
  vertical-align: top;
}
.journal-group {
  background: rgba(40, 110, 158, 0.025);
  transition: background 0.15s ease;
}
.journal-group:hover {
  background: rgba(40, 110, 158, 0.07);
}
.journal-group + .journal-group tr:first-child td {
  border-top: 2px solid rgb(var(--v-theme-border-default));
}
.amount-heading,
.money {
  font-variant-numeric: tabular-nums;
  text-align: right !important;
  white-space: nowrap;
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
.group-connector {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.2);
  display: block;
  height: 28px;
  margin-left: 8px;
}
.dimension-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  max-width: 220px;
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
.pagination-footer {
  align-items: center;
  border-top: 1px solid rgb(var(--v-theme-border-default));
  color: rgb(var(--v-theme-text-secondary));
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  padding: 10px 14px;
}
.ledger-cards {
  display: grid;
  gap: 10px;
  padding: 12px;
}
.ledger-card {
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  overflow: hidden;
}
.ledger-card header {
  background: rgba(40, 110, 158, 0.06);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}
.ledger-card header div {
  display: flex;
  justify-content: space-between;
}
.ledger-card header button {
  background: none;
  border: 0;
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  padding: 0;
}
.ledger-card header span,
.ledger-card header small {
  color: rgb(var(--v-theme-text-secondary));
}
.mobile-line {
  align-items: flex-start;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 11px 12px;
}
.mobile-line + .mobile-line {
  border-top: 1px solid rgb(var(--v-theme-border-default));
}
.mobile-line strong {
  font-size: 0.8125rem;
}
.sr-only {
  clip: rect(0, 0, 0, 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  width: 1px;
}
@media (max-width: 1100px) {
  .filter-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .filter-toolbar > :nth-child(3) {
    grid-column: 1 / -1;
  }
}
@media (max-width: 600px) {
  .filter-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .filter-toolbar > :nth-child(-n + 3) {
    grid-column: 1 / -1;
  }
  .advanced-filter-grid {
    grid-template-columns: 1fr;
  }
  .ledger-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  .ledger-summary > div:nth-child(3) {
    border-left: 0;
    border-top: 1px solid rgb(var(--v-theme-border-default));
  }
  .ledger-summary > div:nth-child(4) {
    border-top: 1px solid rgb(var(--v-theme-border-default));
  }
  .pagination-footer {
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
  }
}
</style>
