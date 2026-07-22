<script setup lang="ts">
import type { AccountingPolicyDto, JournalEntryDto } from '#shared/features/finance/accounting';
import { humanizeAccountingValue, sourceLabel } from '../workbench';

const props = defineProps<{
  items: JournalEntryDto[];
  policies: AccountingPolicyDto[];
  loading: boolean;
  error: string;
  canPost: boolean;
  busyAction: string | null;
}>();

const emit = defineEmits<{
  action: [journal: JournalEntryDto, action: 'submit' | 'approve' | 'post'];
  open: [journalId: string];
  retry: [];
  process: [];
}>();

const headers = [
  { title: 'Event / source', key: 'source' },
  { title: 'Accounting date', key: 'transactionDate' },
  { title: 'Treatment', key: 'treatment' },
  { title: 'Matched policy', key: 'policyCode' },
  { title: 'Validation', key: 'validation' },
  { title: 'Status', key: 'status' },
  { title: 'Action', key: 'actions', sortable: false, align: 'end' as const }
];

function policyFor(journal: JournalEntryDto) {
  return props.policies.find(
    (policy: AccountingPolicyDto) =>
      policy.policyCode === journal.policyCode && policy.version === journal.policyVersion
  );
}

function primaryAction(journal: JournalEntryDto) {
  if (journal.status === 'DRAFT')
    return { key: 'submit' as const, label: 'Submit', icon: 'mdi-send-outline' };
  if (journal.status === 'PENDING_APPROVAL')
    return { key: 'approve' as const, label: 'Review', icon: 'mdi-check-decagram-outline' };
  return { key: 'post' as const, label: 'Post', icon: 'mdi-post-outline' };
}

function date(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}
</script>

<template>
  <section class="tab-panel" aria-labelledby="posting-queue-heading">
    <header class="panel-heading">
      <div>
        <h2 id="posting-queue-heading">Posting Queue</h2>
        <p>Journal proposals awaiting review, approval, or posting.</p>
      </div>
    </header>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      Posting Queue could not be loaded.
      <template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert>
    <VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@5" />
    <div v-else-if="!items.length" class="empty-state">
      <VIcon icon="mdi-inbox-check-outline" size="34" />
      <strong>No journals are waiting for review.</strong>
      <span>Process operational events to create new journal proposals.</span>
      <VBtn
        color="primary"
        prepend-icon="mdi-play-circle-outline"
        variant="tonal"
        @click="emit('process')"
      >
        Process inventory events
      </VBtn>
    </div>
    <VDataTable
      v-else
      :headers="headers"
      :items="items"
      density="comfortable"
      item-value="id"
      :items-per-page="10"
    >
      <template #[`item.source`]="{ item }">
        <button class="record-link" type="button" @click="emit('open', item.id)">
          {{ sourceLabel(item.sourceType, item.sourceId) }}
        </button>
        <div class="secondary-text">{{ item.journalNumber }}</div>
      </template>
      <template #[`item.transactionDate`]="{ item }">{{ date(item.transactionDate) }}</template>
      <template #[`item.treatment`]="{ item }">
        <VChip color="secondary" size="small" variant="tonal">
          {{ humanizeAccountingValue(policyFor(item)?.treatment ?? 'policy resolved') }}
        </VChip>
      </template>
      <template #[`item.policyCode`]="{ item }">
        <strong>{{ policyFor(item)?.policyName ?? item.policyCode }}</strong>
        <div class="secondary-text">{{ item.policyCode }} · v{{ item.policyVersion }}</div>
      </template>
      <template #[`item.validation`]>
        <span class="validation-ok"><VIcon icon="mdi-check-circle-outline" size="17" /> Policy matched</span>
      </template>
      <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
      <template #[`item.actions`]="{ item }">
        <div class="row-actions">
          <DsTooltipIconButton
            :aria-label="`View proposal ${item.journalNumber}`"
            icon="mdi-eye-outline"
            size="small"
            tooltip="View journal proposal"
            variant="text"
            @click="emit('open', item.id)"
          />
          <VBtn
            :disabled="!canPost"
            :loading="busyAction === `${primaryAction(item).key}:${item.id}`"
            size="small"
            :prepend-icon="primaryAction(item).icon"
            variant="tonal"
            @click="emit('action', item, primaryAction(item).key)"
          >
            {{ primaryAction(item).label }}
          </VBtn>
        </div>
      </template>
    </VDataTable>
  </section>
</template>

<style scoped>
.tab-panel {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 10px;
  overflow: hidden;
}
.panel-heading {
  align-items: center;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  display: flex;
  justify-content: space-between;
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
.record-link {
  background: none;
  border: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  padding: 0;
  text-align: left;
}
.record-link:hover {
  text-decoration: underline;
}
.record-link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-info));
  outline-offset: 2px;
}
.secondary-text {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  margin-top: 2px;
}
.validation-ok {
  align-items: center;
  color: rgb(var(--v-theme-success));
  display: inline-flex;
  gap: 5px;
  white-space: nowrap;
}
.row-actions {
  align-items: center;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
.empty-state {
  align-items: center;
  color: rgb(var(--v-theme-text-secondary));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px 16px;
  text-align: center;
}
.empty-state strong {
  color: rgb(var(--v-theme-text-primary));
}
</style>
