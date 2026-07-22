<script setup lang="ts">
import { useDisplay } from 'vuetify';
import type { AccountingJournalDetail } from '#shared/features/finance/accounting';

const props = defineProps<{
  modelValue: boolean;
  journalId: string | null;
  canReverse: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'view-general-ledger': [detail: AccountingJournalDetail];
  'open-related-journal': [journalId: string];
  reverse: [detail: AccountingJournalDetail];
}>();

const { smAndDown } = useDisplay();
const activeTab = ref('overview');
const detail = shallowRef<AccountingJournalDetail | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const copiedValue = ref('');
const cache = new Map<string, AccountingJournalDetail>();

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const policyHeading = computed(() => {
  const headings: Record<string, string> = {
    CAPITALIZE: 'Why this was capitalized',
    REVENUE_RECOGNITION: 'Why this was recognized as revenue',
    DEFERRED_REVENUE: 'Why this was deferred',
    EXPENSE: 'Why this was recorded as maintenance expense',
    INVENTORY: 'Why this was recorded as inventory',
    REFUND_REVERSAL: 'Why deferred revenue was reversed'
  };
  return headings[detail.value?.policy?.treatment ?? ''] ?? 'Why this treatment was selected';
});

const matchedConditionChips = computed(
  () => detail.value?.matchedConditions.filter((item) => item.result === 'MATCHED') ?? []
);

function money(value: number, currency = detail.value?.currency ?? 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function date(value: string | null, includeTime = false) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {})
  }).format(new Date(value));
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function statusColor(status: string) {
  if (['POSTED', 'ACTIVE', 'SUCCESS', 'VERIFIED', 'MATCHED'].includes(status)) return 'success';
  if (['PENDING_APPROVAL', 'WARNING', 'AVAILABLE', 'MISSING'].includes(status)) return 'warning';
  if (['REVERSED', 'FAILED', 'NOT_MATCHED'].includes(status)) return 'error';
  if (['APPROVED', 'INFO'].includes(status)) return 'primary';
  return 'secondary';
}

async function loadDetail(force = false) {
  if (!props.journalId) return;
  activeTab.value = 'overview';
  errorMessage.value = '';
  if (!force && cache.has(props.journalId)) {
    detail.value = cache.get(props.journalId) ?? null;
    return;
  }
  loading.value = true;
  detail.value = null;
  try {
    const response = await fetchApi<AccountingJournalDetail>(
      `/api/finance/accounting/journals/${props.journalId}`
    );
    cache.set(props.journalId, response);
    detail.value = response;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Journal details could not be loaded.';
  } finally {
    loading.value = false;
  }
}

async function copy(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  copiedValue.value = label;
  window.setTimeout(() => {
    if (copiedValue.value === label) copiedValue.value = '';
  }, 1800);
}

function close() {
  dialogOpen.value = false;
}

watch(
  () => [props.modelValue, props.journalId] as const,
  ([open, journalId], previous) => {
    if (open && journalId && (!previous || journalId !== previous[1] || !previous[0])) {
      void loadDetail();
    }
  },
  { immediate: true }
);
</script>

<template>
  <VDialog
    v-model="dialogOpen"
    aria-describedby="journal-detail-description"
    aria-labelledby="journal-detail-title"
    :fullscreen="smAndDown"
    max-width="980"
    scrollable
  >
    <VCard class="journal-detail-dialog">
      <header class="dialog-header">
        <div class="min-w-0">
          <div class="text-caption font-weight-bold text-text-secondary">JOURNAL ENTRY</div>
          <div class="journal-title-row">
            <h2 id="journal-detail-title" class="journal-title">
              {{ detail?.journalNumber ?? 'Journal details' }}
            </h2>
            <VChip
              v-if="detail"
              :color="statusColor(detail.status)"
              size="small"
              :variant="detail.status === 'PENDING_APPROVAL' ? 'flat' : 'tonal'"
            >
              {{ detail.status }}
            </VChip>
            <VChip
              v-if="detail?.reversal?.reversalJournalNumber"
              color="error"
              size="small"
              variant="tonal"
            >
              REVERSED BY {{ detail.reversal.reversalJournalNumber }}
            </VChip>
          </div>
          <p id="journal-detail-description" class="dialog-description">
            {{ detail?.description ?? 'Policy decision, accounting impact, and audit evidence.' }}
          </p>
        </div>

        <div class="header-actions">
          <VBtn
            v-if="detail?.event?.sourceRoute"
            :to="detail.event.sourceRoute"
            prepend-icon="mdi-open-in-new"
            size="small"
            variant="tonal"
          >
            Open source
          </VBtn>
          <VMenu v-if="detail">
            <template #activator="{ props: menuProps }">
              <DsTooltipIconButton
                v-bind="menuProps"
                icon="mdi-dots-vertical"
                tooltip="More journal actions"
                variant="text"
              />
            </template>
            <VList density="compact">
              <VListItem
                prepend-icon="mdi-content-copy"
                title="Copy journal number"
                @click="copy(detail.journalNumber, 'Journal number copied')"
              />
              <VListItem
                v-if="detail.event"
                prepend-icon="mdi-identifier"
                title="Copy event ID"
                @click="copy(detail.event.id, 'Event ID copied')"
              />
              <VListItem
                v-if="detail.actions.canViewGeneralLedger"
                prepend-icon="mdi-book-open-page-variant-outline"
                title="View in General Ledger"
                @click="emit('view-general-ledger', detail)"
              />
              <VListItem
                v-if="detail.reversal?.originalJournalId"
                prepend-icon="mdi-undo-variant"
                title="View original journal"
                @click="emit('open-related-journal', detail.reversal!.originalJournalId!)"
              />
              <VListItem
                v-if="detail.reversal?.reversalJournalId"
                prepend-icon="mdi-swap-horizontal"
                title="View reversal journal"
                @click="emit('open-related-journal', detail.reversal!.reversalJournalId!)"
              />
              <VListItem
                v-if="detail.actions.canReverse && canReverse"
                base-color="error"
                prepend-icon="mdi-undo-variant"
                title="Reverse journal"
                @click="emit('reverse', detail)"
              />
            </VList>
          </VMenu>
          <DsTooltipIconButton
            icon="mdi-close"
            tooltip="Close journal details"
            variant="text"
            @click="close"
          />
        </div>
      </header>

      <VTabs v-if="detail" v-model="activeTab" class="dialog-tabs" color="primary" grow>
        <VTab value="overview">Overview</VTab>
        <VTab value="policy">Policy & Evidence</VTab>
        <VTab value="audit">Audit Trail</VTab>
      </VTabs>
      <VDivider />

      <VCardText class="dialog-body">
        <div v-if="loading" aria-label="Loading journal details">
          <VSkeletonLoader type="heading, paragraph, table, article" />
        </div>
        <VAlert v-else-if="errorMessage" color="error" variant="tonal">
          <div class="font-weight-bold">Journal details could not be loaded.</div>
          <div class="mt-1">{{ errorMessage }}</div>
          <template #append>
            <VBtn size="small" variant="text" @click="loadDetail(true)">Retry</VBtn>
          </template>
        </VAlert>

        <VWindow v-else-if="detail" v-model="activeTab">
          <VWindowItem value="overview">
            <section class="detail-section">
              <h3>Journal context</h3>
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span>Posting date</span><strong>{{ date(detail.postingDate) }}</strong>
                </div>
                <div class="metadata-item">
                  <span>Accounting event</span><strong>{{ detail.event?.eventLabel ?? 'Not recorded' }}</strong>
                  <VTooltip v-if="detail.event" :text="detail.event.eventType">
                    <template #activator="{ props: tooltipProps }">
                      <small v-bind="tooltipProps" class="technical-value">{{
                        detail.event.eventType
                      }}</small>
                    </template>
                  </VTooltip>
                </div>
                <div class="metadata-item">
                  <span>Source</span><strong>{{ detail.event?.sourceLabel ?? 'Not recorded' }}</strong>
                  <small v-if="detail.event" class="technical-value">{{
                    detail.event.sourceType
                  }}</small>
                </div>
                <div class="metadata-item">
                  <span>Aircraft</span><strong>{{ detail.dimensions.aircraft?.label ?? 'Not recorded' }}</strong>
                </div>
                <div class="metadata-item">
                  <span>Work order</span><strong>{{ detail.dimensions.workOrder?.label ?? 'Not recorded' }}</strong>
                </div>
                <div class="metadata-item">
                  <span>Station</span><strong>{{ detail.dimensions.station?.label ?? 'Not recorded' }}</strong>
                </div>
                <div class="metadata-item metadata-wide">
                  <span>Event ID</span>
                  <VTooltip :text="detail.event?.id ?? 'Not recorded'">
                    <template #activator="{ props: tooltipProps }">
                      <strong v-bind="tooltipProps" class="technical-value truncate-value">{{
                        detail.event?.id ?? 'Not recorded'
                      }}</strong>
                    </template>
                  </VTooltip>
                </div>
                <div class="metadata-item">
                  <span>Component serial</span><strong>{{ detail.dimensions.component?.label ?? 'Not recorded' }}</strong>
                </div>
              </div>
            </section>

            <section class="detail-section policy-summary">
              <h3>{{ policyHeading }}</h3>
              <template v-if="detail.policy">
                <div class="policy-title-row">
                  <strong>{{ detail.policy.name }}</strong>
                  <VChip color="primary" size="x-small" variant="tonal">
                    v{{ detail.policy.version }}
                  </VChip>
                </div>
                <div class="technical-value">{{ detail.policy.code }}</div>
                <div class="condition-chips">
                  <VChip
                    v-for="item in matchedConditionChips"
                    :key="item.id"
                    color="success"
                    prepend-icon="mdi-check"
                    size="small"
                    variant="tonal"
                  >
                    {{ item.label }}: {{ item.actual }}
                  </VChip>
                </div>
                <div class="treatment-result">
                  <span>Treatment</span><strong>{{ humanize(detail.policy.treatment) }}</strong>
                </div>
              </template>
              <VAlert v-else color="warning" variant="tonal">
                Policy snapshot was not recorded for this journal.
              </VAlert>
            </section>

            <section class="detail-section">
              <div class="section-heading-row">
                <h3>Accounting impact</h3>
                <VChip
                  :color="detail.totals.balanced ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ detail.totals.balanced ? 'Balanced' : 'Unbalanced' }}
                </VChip>
              </div>
              <VAlert v-if="!detail.totals.balanced" class="mb-3" color="error" variant="tonal">
                Debit and credit totals do not balance. Posting review is required.
              </VAlert>
              <div class="journal-table-wrap">
                <VTable class="journal-lines" density="comfortable">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th class="text-right">Debit</th>
                      <th class="text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in detail.lines" :key="line.id">
                      <td>
                        <strong>{{ line.accountCode }} · {{ line.accountName }}</strong>
                        <small v-if="line.description" class="line-description">{{
                          line.description
                        }}</small>
                        <div class="line-dimensions">
                          <VChip
                            v-for="item in line.dimensions"
                            :key="`${line.id}:${item.id}`"
                            size="x-small"
                            variant="outlined"
                          >
                            {{ item.label }}
                          </VChip>
                        </div>
                      </td>
                      <td class="amount-cell">
                        {{ line.debitMinor ? money(line.debitMinor) : '—' }}
                      </td>
                      <td class="amount-cell">
                        {{ line.creditMinor ? money(line.creditMinor) : '—' }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Total</th>
                      <th class="amount-cell">{{ money(detail.totals.debitMinor) }}</th>
                      <th class="amount-cell">{{ money(detail.totals.creditMinor) }}</th>
                    </tr>
                  </tfoot>
                </VTable>
              </div>
            </section>

            <section class="detail-section">
              <h3>Lifecycle summary</h3>
              <div class="lifecycle-strip">
                <div
                  v-for="item in detail.auditTrail.slice(0, 5)"
                  :key="item.id"
                  class="lifecycle-step"
                >
                  <VIcon
                    :color="statusColor(item.status)"
                    :icon="
                      item.status === 'WARNING'
                        ? 'mdi-alert-circle-outline'
                        : 'mdi-check-circle-outline'
                    "
                    size="20"
                  />
                  <div>
                    <strong>{{ item.label }}</strong><span>{{ date(item.timestamp, true) }} ·
                      {{ item.actor?.label ?? humanize(item.source) }}</span>
                  </div>
                </div>
              </div>
            </section>
          </VWindowItem>

          <VWindowItem value="policy">
            <section class="detail-section">
              <h3>Policy identity</h3>
              <template v-if="detail.policy">
                <div class="policy-detail-grid">
                  <div>
                    <span>Policy name</span><strong>{{ detail.policy.name }}</strong>
                  </div>
                  <div>
                    <span>Version</span><strong>{{ detail.policy.version }}</strong>
                  </div>
                  <div>
                    <span>Policy code</span><strong class="technical-value">{{ detail.policy.code }}</strong>
                  </div>
                  <div>
                    <span>Priority</span><strong>{{ detail.policy.priority ?? 'Not recorded' }}</strong>
                  </div>
                  <div>
                    <span>Effective period</span><strong>{{ date(detail.policy.effectiveFrom) }} –
                      {{
                        detail.policy.effectiveTo ? date(detail.policy.effectiveTo) : 'Open ended'
                      }}</strong>
                  </div>
                  <div>
                    <span>Treatment</span><strong>{{ humanize(detail.policy.treatment) }}</strong>
                  </div>
                  <div>
                    <span>Account mapping</span><strong>{{ detail.policy.debitAccountCode ?? '?' }} →
                      {{ detail.policy.creditAccountCode ?? '?' }}</strong>
                  </div>
                  <div>
                    <span>Approval required</span><strong>{{ detail.policy.approvalRequired ? 'Yes' : 'No' }}</strong>
                  </div>
                </div>
                <VAlert class="mt-4" color="info" icon="mdi-history" variant="tonal">
                  <strong>Historical snapshot.</strong> This journal uses the policy snapshot
                  captured when the proposal was created. Later policy changes do not alter its
                  treatment.
                </VAlert>
              </template>
              <p v-else class="empty-copy">No policy snapshot was recorded for this journal.</p>
            </section>

            <section class="detail-section">
              <h3>Matched conditions</h3>
              <div v-if="detail.matchedConditions.length" class="journal-table-wrap">
                <VTable density="comfortable">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Operator</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in detail.matchedConditions" :key="item.id">
                      <td>
                        <strong>{{ item.label }}</strong><small class="technical-value">{{ item.field }}</small>
                      </td>
                      <td>{{ item.operator }}</td>
                      <td>{{ item.expected }}</td>
                      <td>{{ item.actual }}</td>
                      <td>
                        <VChip :color="statusColor(item.result)" size="x-small" variant="tonal">
                          {{ humanize(item.result) }}
                        </VChip>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
              <p v-else class="empty-copy">
                No condition evaluation can be derived from the captured context.
              </p>
            </section>

            <section class="detail-section">
              <h3>Supporting evidence</h3>
              <VList v-if="detail.evidence.length" class="evidence-list" lines="three">
                <VListItem v-for="item in detail.evidence" :key="`${item.type}:${item.reference}`">
                  <template #prepend>
                    <VIcon
                      :color="statusColor(item.status)"
                      :icon="
                        item.status === 'MISSING'
                          ? 'mdi-alert-circle-outline'
                          : 'mdi-file-check-outline'
                      "
                    />
                  </template>
                  <VListItemTitle>{{ item.label }}</VListItemTitle>
                  <VListItemSubtitle>
                    {{ item.reference ?? 'Evidence not recorded' }} ·
                    {{ date(item.recordedAt, true)
                    }}<template v-if="item.recordedBy"> · {{ item.recordedBy.label }} </template>
                  </VListItemSubtitle>
                  <template #append>
                    <VChip :color="statusColor(item.status)" size="x-small" variant="tonal">
                      {{ humanize(item.status) }}
                    </VChip>
                    <DsTooltipIconButton
                      v-if="item.sourceRoute"
                      :to="item.sourceRoute"
                      icon="mdi-open-in-new"
                      tooltip="Open evidence"
                      variant="text"
                    />
                  </template>
                </VListItem>
              </VList>
              <p v-else class="empty-copy">No supporting evidence was recorded for this journal.</p>
            </section>

            <section v-if="detail.costBasis" class="detail-section">
              <h3>{{ detail.costBasis.heading }}</h3>
              <div class="cost-basis-amount">
                <span>{{ detail.costBasis.amountLabel }}</span><strong>{{
                  money(detail.costBasis.amountMinor, detail.costBasis.currency)
                }}</strong>
              </div>
              <div class="policy-detail-grid mt-4">
                <div v-for="item in detail.costBasis.items" :key="item.label">
                  <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>
          </VWindowItem>

          <VWindowItem value="audit">
            <section class="detail-section">
              <h3>Journal audit trail</h3>
              <VTimeline v-if="detail.auditTrail.length" align="start" density="compact" side="end">
                <VTimelineItem
                  v-for="item in detail.auditTrail"
                  :key="item.id"
                  :dot-color="statusColor(item.status)"
                  size="small"
                >
                  <div class="audit-item">
                    <div class="section-heading-row">
                      <strong>{{ item.label }}</strong><VChip :color="statusColor(item.status)" size="x-small" variant="tonal">
                        {{ item.status }}
                      </VChip>
                    </div>
                    <div class="audit-meta">
                      {{ date(item.timestamp, true) }} ·
                      {{ item.actor?.label ?? humanize(item.source) }}
                    </div>
                    <p v-if="item.description">{{ item.description }}</p>
                    <VBtn
                      v-if="item.relatedResource?.type === 'JOURNAL'"
                      size="small"
                      variant="text"
                      @click="emit('open-related-journal', item.relatedResource.id)"
                    >
                      {{ item.relatedResource.label }}
                    </VBtn>
                  </div>
                </VTimelineItem>
              </VTimeline>
              <p v-else class="empty-copy">
                No audit lifecycle data was recorded for this journal.
              </p>
            </section>
          </VWindowItem>
        </VWindow>
      </VCardText>

      <VDivider />
      <VCardActions class="dialog-footer">
        <span v-if="copiedValue" aria-live="polite" class="copy-feedback">{{ copiedValue }}</span>
        <VSpacer />
        <VBtn variant="text" @click="close">Close</VBtn>
        <VBtn
          v-if="detail?.actions.canViewGeneralLedger"
          color="primary"
          prepend-icon="mdi-book-open-page-variant-outline"
          variant="flat"
          @click="emit('view-general-ledger', detail)"
        >
          View in General Ledger
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.journal-detail-dialog {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.dialog-header {
  align-items: flex-start;
  background: rgb(var(--v-theme-surface));
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding: 20px 24px 14px;
}
.journal-title-row,
.header-actions,
.policy-title-row,
.section-heading-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.journal-title {
  font-size: 1.5rem;
  line-height: 1.25;
  margin: 2px 0 0;
}
.dialog-description {
  color: rgb(var(--v-theme-text-secondary));
  margin: 5px 0 0;
  max-width: 680px;
  overflow-wrap: anywhere;
}
.header-actions {
  flex-shrink: 0;
}
.dialog-tabs {
  background: rgb(var(--v-theme-surface));
  flex: 0 0 auto;
}
.dialog-body {
  background: rgb(var(--v-theme-background));
  overflow-x: hidden;
  padding: 0;
}
.detail-section {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  padding: 22px 24px;
}
.detail-section:last-child {
  border-bottom: 0;
}
.detail-section h3 {
  font-size: 1rem;
  margin: 0 0 16px;
}
.metadata-grid,
.policy-detail-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.metadata-item,
.policy-detail-grid > div {
  min-width: 0;
}
.metadata-item span,
.policy-detail-grid span,
.treatment-result span,
.cost-basis-amount span {
  color: rgb(var(--v-theme-text-secondary));
  display: block;
  font-size: 0.75rem;
}
.metadata-item strong,
.policy-detail-grid strong {
  display: block;
  margin-top: 3px;
  overflow-wrap: anywhere;
}
.metadata-wide {
  grid-column: span 2;
}
.technical-value {
  color: rgb(var(--v-theme-text-secondary));
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  margin-top: 3px;
  overflow-wrap: anywhere;
}
.truncate-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.condition-chips,
.line-dimensions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.treatment-result {
  border-left: 3px solid rgb(var(--v-theme-primary));
  margin-top: 16px;
  padding: 8px 12px;
}
.journal-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}
.journal-lines {
  min-width: 650px;
}
.line-description {
  color: rgb(var(--v-theme-text-secondary));
  display: block;
  margin-top: 3px;
}
.amount-cell {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.lifecycle-strip {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.lifecycle-step {
  align-items: flex-start;
  display: flex;
  gap: 8px;
  min-width: 0;
}
.lifecycle-step strong,
.lifecycle-step span {
  display: block;
}
.lifecycle-step span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.72rem;
  margin-top: 2px;
}
.evidence-list {
  background: transparent;
}
.cost-basis-amount strong {
  display: block;
  font-size: 1.35rem;
  margin-top: 3px;
}
.audit-item {
  min-width: 0;
  padding-bottom: 10px;
}
.audit-item p {
  margin: 7px 0 0;
  overflow-wrap: anywhere;
}
.audit-meta,
.empty-copy,
.copy-feedback {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
}
.dialog-footer {
  background: rgb(var(--v-theme-surface));
  flex: 0 0 auto;
  padding: 12px 20px;
}

@media (max-width: 960px) {
  .metadata-grid,
  .policy-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dialog-header {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .journal-detail-dialog {
    height: 100%;
    max-height: none;
  }
  .dialog-header {
    padding: 16px;
  }
  .header-actions {
    justify-content: flex-end;
  }
  .header-actions > :first-child {
    margin-right: auto;
  }
  .dialog-tabs :deep(.v-tab) {
    font-size: 0.75rem;
    min-width: 0;
    padding-inline: 8px;
  }
  .detail-section {
    padding: 18px 16px;
  }
  .metadata-grid,
  .policy-detail-grid {
    grid-template-columns: 1fr;
  }
  .metadata-wide {
    grid-column: auto;
  }
  .dialog-footer {
    padding: 10px 12px;
  }
  .dialog-footer :deep(.v-btn__content) {
    white-space: normal;
  }
}
</style>
