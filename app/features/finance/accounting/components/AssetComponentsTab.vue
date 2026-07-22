<script setup lang="ts">
import type { AccountingAssetDto } from '#shared/features/finance/accounting';
defineProps<{ items: AccountingAssetDto[]; loading: boolean; error: string }>();
const emit = defineEmits<{ retry: []; openJournal: [id: string]; preview: [id: string] }>();
const headers = [
  { title: 'Asset', key: 'assetNumber' },
  { title: 'Component', key: 'component' },
  { title: 'Aircraft', key: 'aircraftId' },
  { title: 'Capitalization date', key: 'acquisitionDate' },
  { title: 'Acquisition cost', key: 'costMinor', align: 'end' as const },
  { title: 'Useful life', key: 'usefulLifeMonths' },
  { title: 'Status', key: 'status' },
  { title: 'Preview', key: 'actions', sortable: false, align: 'end' as const }
];
function money(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
function date(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}
</script>
<template>
  <section class="assets-panel" aria-labelledby="assets-heading">
    <header class="panel-heading">
      <div>
        <h2 id="assets-heading">Asset Components</h2>
        <p>Capitalized aircraft components and depreciation previews.</p>
      </div>
    </header>
    <VAlert v-if="error" class="ma-4" color="error" density="compact" variant="tonal">
      Asset components could not be loaded.<template #append>
        <VBtn size="small" variant="text" @click="emit('retry')">Retry</VBtn>
      </template>
    </VAlert><VSkeletonLoader v-else-if="loading" class="pa-4" type="table-heading, table-row@4" />
    <div v-else-if="!items.length" class="empty-state">
      <VIcon icon="mdi-airplane-cog" size="34" /><strong>No capitalized asset components.</strong>
    </div>
    <VDataTable v-else :headers="headers" :items="items" density="comfortable" :items-per-page="10">
      <template #[`item.assetNumber`]="{ item }">
        <strong>{{ item.assetNumber }}</strong>
      </template><template #[`item.component`]="{ item }">
        <strong>{{ item.assetName }}</strong>
        <div class="secondary-text">
          {{ item.componentSerialId ?? 'No component serial' }}
        </div>
      </template><template #[`item.aircraftId`]="{ item }">{{ item.aircraftId ?? '—' }}</template><template #[`item.acquisitionDate`]="{ item }">{{ date(item.acquisitionDate) }}</template><template #[`item.costMinor`]="{ item }">
        <span class="money">{{ money(item.costMinor, item.currencyCode) }}</span>
      </template><template #[`item.usefulLifeMonths`]="{ item }">{{ item.usefulLifeMonths }} months</template><template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template><template #[`item.actions`]="{ item }">
        <div class="actions">
          <DsTooltipIconButton
            :aria-label="`View source journal for ${item.assetNumber}`"
            icon="mdi-book-open-variant"
            size="small"
            tooltip="View source journal"
            variant="text"
            @click="emit('openJournal', item.sourceJournalEntryId)"
          /><DsTooltipIconButton
            :aria-label="`View depreciation preview for ${item.assetNumber}`"
            icon="mdi-calendar-month-outline"
            size="small"
            tooltip="Depreciation preview"
            variant="text"
            @click="emit('preview', item.id)"
          />
        </div>
      </template>
    </VDataTable>
  </section>
</template>
<style scoped>
.assets-panel {
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
.panel-heading p,
.secondary-text {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
  margin: 3px 0 0;
}
.money {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.empty-state {
  align-items: center;
  color: rgb(var(--v-theme-text-secondary));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 48px;
}
.empty-state strong {
  color: rgb(var(--v-theme-text-primary));
}
</style>
