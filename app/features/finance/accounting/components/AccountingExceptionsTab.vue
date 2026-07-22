<script setup lang="ts">
import type { AccountingExceptionDto } from '#shared/features/finance/accounting';
import { humanizeAccountingValue, sourceLabel } from '../workbench';

const props = defineProps<{
  items: AccountingExceptionDto[];
  loading: boolean;
  error: string;
  initialStatus?: string;
}>();
const emit = defineEmits<{ retry: [] }>();
const status = ref(props.initialStatus ?? 'OPEN');
const selected = ref<AccountingExceptionDto | null>(null);
watch(
  () => props.initialStatus,
  (value) => {
    if (value) status.value = value;
  }
);
const filtered = computed(() =>
  props.items.filter(
    (item: AccountingExceptionDto) => status.value === 'ALL' || item.status === status.value
  )
);
const headers = [
  { title: 'Reason', key: 'reason' },
  { title: 'Source', key: 'source' },
  { title: 'Event type', key: 'eventType' },
  { title: 'Created', key: 'createdAt' },
  { title: 'Status', key: 'status' },
  { title: 'Action', key: 'actions', sortable: false, align: 'end' as const }
];
const reasonLabels: Record<string, string> = {
  MISSING_CONTEXT: 'Missing required accounting context',
  AMBIGUOUS_POLICY: 'Ambiguous accounting policy',
  CLOSED_PERIOD: 'Accounting period closed',
  MANUAL_REVIEW_REQUIRED: 'Manual review required',
  NO_MATCHING_POLICY: 'No matching accounting policy',
  INVALID_ACCOUNT: 'Invalid journal account',
  UNBALANCED_JOURNAL: 'Journal proposal is not balanced'
};
function date(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}
</script>

<template>
  <section class="exceptions-panel" aria-labelledby="exceptions-heading">
    <header class="panel-heading">
      <div>
        <h2 id="exceptions-heading">Accounting Exceptions</h2>
        <p>Policy evaluation issues requiring context review.</p>
      </div>
      <VSelect
        v-model="status"
        density="compact"
        hide-details
        :items="['ALL', 'OPEN', 'RESOLVED']"
        label="Status"
        style="max-width: 160px"
        variant="outlined"
      />
    </header>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      Accounting exceptions could not be loaded.<template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert>
    <VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@4" />
    <div v-else-if="!filtered.length" class="empty-state">
      <VIcon color="success" icon="mdi-check-circle-outline" size="34" /><strong>No open accounting exceptions.</strong><span>Policy evaluation is clear for the selected status.</span>
    </div>
    <VDataTable
      v-else
      :headers="headers"
      :items="filtered"
      density="comfortable"
      :items-per-page="10"
    >
      <template #[`item.reason`]="{ item }">
        <strong>{{
          reasonLabels[item.reasonCode] ?? humanizeAccountingValue(item.reasonCode)
        }}</strong>
        <div class="secondary-text">{{ item.reasonCode }}</div>
      </template>
      <template #[`item.source`]="{ item }">
        {{ sourceLabel(item.sourceType, item.sourceId) }}
      </template>
      <template #[`item.eventType`]="{ item }">
        {{ humanizeAccountingValue(item.eventType) }}
      </template>
      <template #[`item.createdAt`]="{ item }">{{ date(item.createdAt) }}</template>
      <template #[`item.status`]="{ item }">
        <VChip :color="item.status === 'OPEN' ? 'warning' : 'success'" size="small" variant="tonal">
          {{ item.status }}
        </VChip>
      </template>
      <template #[`item.actions`]="{ item }">
        <DsTooltipIconButton
          :aria-label="`Review ${item.reasonCode}`"
          icon="mdi-text-box-search-outline"
          size="small"
          tooltip="Review exception context"
          variant="text"
          @click="selected = item"
        />
      </template>
    </VDataTable>
    <VDialog
      :model-value="Boolean(selected)"
      max-width="620"
      @update:model-value="!$event && (selected = null)"
    >
      <VCard v-if="selected">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Exception context</span><DsTooltipIconButton
            aria-label="Close exception context"
            icon="mdi-close"
            tooltip="Close"
            variant="text"
            @click="selected = null"
          />
        </VCardTitle><VDivider /><VCardText class="detail-grid">
          <span>Reason</span><strong>{{
            reasonLabels[selected.reasonCode] ?? humanizeAccountingValue(selected.reasonCode)
          }}</strong><span>Code</span><code>{{ selected.reasonCode }}</code><span>Source</span><strong>{{ sourceLabel(selected.sourceType, selected.sourceId) }}</strong><span>Event</span><strong>{{ humanizeAccountingValue(selected.eventType) }}</strong><span>Detail</span>
          <p>{{ selected.message }}</p>
        </VCardText>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.exceptions-panel {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 10px;
  overflow: hidden;
}
.panel-heading {
  align-items: center;
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 16px 18px;
}
.panel-heading h2 {
  font-size: 1rem;
  margin: 0;
}
.panel-heading p,
.secondary-text {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  margin: 3px 0 0;
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
.detail-grid {
  display: grid;
  gap: 12px 18px;
  grid-template-columns: 110px 1fr;
}
.detail-grid > span {
  color: rgb(var(--v-theme-text-secondary));
}
.detail-grid p {
  margin: 0;
}
</style>
