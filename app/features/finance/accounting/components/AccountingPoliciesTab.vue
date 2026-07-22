<script setup lang="ts">
import type { AccountingPolicyDto } from '#shared/features/finance/accounting';
import { humanizeAccountingValue } from '../workbench';
defineProps<{ items: AccountingPolicyDto[]; loading: boolean; error: string }>();
const emit = defineEmits<{ retry: [] }>();
const selected = ref<AccountingPolicyDto | null>(null);
const headers = [
  { title: 'Policy name', key: 'policy' },
  { title: 'Event type', key: 'eventType' },
  { title: 'Treatment', key: 'treatment' },
  { title: 'Version', key: 'version' },
  { title: 'Priority', key: 'priority' },
  { title: 'Effective period', key: 'effective' },
  { title: 'Status', key: 'status' }
];
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
    : 'Open-ended';
}
</script>
<template>
  <section class="policies-panel" aria-labelledby="policies-heading">
    <header class="panel-heading">
      <div>
        <h2 id="policies-heading">Accounting Policies</h2>
        <p>Read-only effective policy versions and account mappings.</p>
      </div>
      <VChip prepend-icon="mdi-lock-outline" size="small" variant="tonal">Read only</VChip>
    </header>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      Accounting policies could not be loaded.<template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert><VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@5" />
    <div v-else-if="!items.length" class="empty-state">
      <strong>No accounting policies are available.</strong>
    </div>
    <VDataTable v-else :headers="headers" :items="items" density="comfortable" :items-per-page="10">
      <template #[`item.policy`]="{ item }">
        <button class="policy-link" type="button" @click="selected = item">
          {{ item.policyName }}
        </button>
        <div class="secondary-text">{{ item.policyCode }}</div>
      </template><template #[`item.eventType`]="{ item }">
        {{ humanizeAccountingValue(item.eventType) }}
      </template><template #[`item.treatment`]="{ item }">
        <VChip
          :color="item.capitalizationCandidate ? 'primary' : 'secondary'"
          size="small"
          variant="tonal"
        >
          {{ humanizeAccountingValue(item.treatment) }}
        </VChip>
      </template><template #[`item.version`]="{ item }">v{{ item.version }}</template><template #[`item.effective`]="{ item }">
        {{ date(item.effectiveFrom) }} – {{ date(item.effectiveTo) }}
      </template><template #[`item.status`]="{ item }">
        <DsStatusBadge :value="item.isActive ? item.approvalStatus : 'INACTIVE'" />
      </template>
    </VDataTable>
    <VNavigationDrawer
      :model-value="Boolean(selected)"
      location="right"
      temporary
      width="440"
      @update:model-value="!$event && (selected = null)"
    >
      <div v-if="selected" class="drawer-content">
        <header>
          <div>
            <span class="eyebrow">ACCOUNTING POLICY</span>
            <h2>{{ selected.policyName }}</h2>
            <p>{{ selected.policyCode }} · Version {{ selected.version }}</p>
          </div>
          <DsTooltipIconButton
            aria-label="Close policy details"
            icon="mdi-close"
            tooltip="Close policy details"
            variant="text"
            @click="selected = null"
          />
        </header>
        <VDivider />
        <section>
          <h3>Policy treatment</h3>
          <dl>
            <dt>Event type</dt>
            <dd>{{ humanizeAccountingValue(selected.eventType) }}</dd>
            <dt>Treatment</dt>
            <dd>{{ humanizeAccountingValue(selected.treatment) }}</dd>
            <dt>Priority</dt>
            <dd>{{ selected.priority }}</dd>
            <dt>Approval</dt>
            <dd>{{ humanizeAccountingValue(selected.approvalStatus) }}</dd>
          </dl>
        </section>
        <section>
          <h3>Journal account mapping</h3>
          <div class="mapping">
            <div>
              <span>Debit</span><strong>{{ selected.debitAccountCode }} · {{ selected.debitAccountName }}</strong>
            </div>
            <VIcon icon="mdi-arrow-down" />
            <div>
              <span>Credit</span><strong>{{ selected.creditAccountCode }} · {{ selected.creditAccountName }}</strong>
            </div>
          </div>
        </section>
        <section>
          <h3>Required dimensions</h3>
          <div class="chips">
            <VChip
              v-for="dimension in selected.requiredDimensions"
              :key="dimension"
              size="small"
              variant="tonal"
            >
              {{ humanizeAccountingValue(dimension) }}
            </VChip><span v-if="!selected.requiredDimensions.length" class="secondary-text">No additional dimensions required.</span>
          </div>
        </section>
        <section>
          <h3>Effective dates</h3>
          <p>{{ date(selected.effectiveFrom) }} – {{ date(selected.effectiveTo) }}</p>
        </section>
      </div>
    </VNavigationDrawer>
  </section>
</template>
<style scoped>
.policies-panel {
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
.panel-heading p,
.secondary-text {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  margin: 3px 0 0;
}
.policy-link {
  background: none;
  border: 0;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0;
  text-align: left;
}
.policy-link:hover {
  text-decoration: underline;
}
.empty-state {
  padding: 48px;
  text-align: center;
}
.drawer-content header {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  padding: 20px;
}
.drawer-content h2 {
  font-size: 1.2rem;
  margin: 3px 0;
}
.drawer-content header p {
  color: rgb(var(--v-theme-text-secondary));
  margin: 0;
}
.eyebrow {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.6875rem;
  font-weight: 700;
}
.drawer-content section {
  border-bottom: 1px solid rgb(var(--v-theme-border-default));
  padding: 18px 20px;
}
.drawer-content h3 {
  font-size: 0.875rem;
  margin: 0 0 12px;
}
.drawer-content dl {
  display: grid;
  gap: 8px 12px;
  grid-template-columns: 110px 1fr;
  margin: 0;
}
.drawer-content dt {
  color: rgb(var(--v-theme-text-secondary));
}
.drawer-content dd {
  font-weight: 600;
  margin: 0;
}
.mapping {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.mapping div {
  background: rgba(40, 110, 158, 0.06);
  border-radius: 7px;
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.mapping span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}
.mapping .v-icon {
  margin-left: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
