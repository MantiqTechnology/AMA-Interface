<script setup lang="ts">
import AccountingExceptionsTab from '../../features/finance/accounting/components/AccountingExceptionsTab.vue';
import AccountingPoliciesTab from '../../features/finance/accounting/components/AccountingPoliciesTab.vue';
import AccountingSummaryCards from '../../features/finance/accounting/components/AccountingSummaryCards.vue';
import AccountingTabNavigation from '../../features/finance/accounting/components/AccountingTabNavigation.vue';
import AssetComponentsTab from '../../features/finance/accounting/components/AssetComponentsTab.vue';
import GeneralJournalTab from '../../features/finance/accounting/components/GeneralJournalTab.vue';
import GeneralLedgerTab from '../../features/finance/accounting/components/GeneralLedgerTab.vue';
import JournalDetailDialog from '../../features/finance/accounting/components/JournalDetailDialog.vue';
import PostingQueueTab from '../../features/finance/accounting/components/PostingQueueTab.vue';
import {
  resolveAccountingTab,
  type AccountingTab
} from '../../features/finance/accounting/workbench';
import type {
  AccountingAssetDto,
  AccountingExceptionDto,
  AccountingJournalDetail,
  AccountingPolicyDto,
  GeneralLedgerLineDto,
  InventoryAccountingProcessSummaryDto,
  JournalEntryDto
} from '#shared/features/finance/accounting';

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const activeTab = ref<AccountingTab>(resolveAccountingTab(route.query.tab));
const journalStatusFilter = ref<string>();
const exceptionStatusFilter = ref<string>();
const busyAction = ref<string | null>(null);
const refreshBusy = ref(false);
const actionError = ref('');
const actionMessage = ref('');
const snackbarOpen = ref(false);
const journalTraceOpen = ref(false);
const selectedJournalId = ref<string | null>(null);
const ledgerJournalFilter = ref<string | null>(null);
const assetPreviewOpen = ref(false);
const selectedAssetId = ref<string | null>(null);

const {
  data: journals,
  pending: journalsPending,
  error: journalsError,
  refresh: refreshJournals
} = await useAsyncData('finance-accounting-journals', () =>
  fetchApi<JournalEntryDto[]>('/api/finance/accounting/journals', { query: { limit: 250 } })
);
const {
  data: ledger,
  pending: ledgerPending,
  error: ledgerError,
  refresh: refreshLedger
} = await useAsyncData('finance-accounting-ledger', () =>
  fetchApi<GeneralLedgerLineDto[]>('/api/finance/accounting/general-ledger', {
    query: { limit: 250 }
  })
);
const {
  data: exceptions,
  pending: exceptionsPending,
  error: exceptionsError,
  refresh: refreshExceptions
} = await useAsyncData('finance-accounting-exceptions', () =>
  fetchApi<AccountingExceptionDto[]>('/api/finance/accounting/exceptions', {
    query: { limit: 250 }
  })
);
const {
  data: policies,
  pending: policiesPending,
  error: policiesError,
  refresh: refreshPolicies
} = await useAsyncData('finance-accounting-policies', () =>
  fetchApi<AccountingPolicyDto[]>('/api/finance/accounting/policies', { query: { limit: 250 } })
);
const {
  data: assets,
  pending: assetsPending,
  error: assetsError,
  refresh: refreshAssets
} = await useAsyncData('finance-accounting-assets', () =>
  fetchApi<AccountingAssetDto[]>('/api/finance/accounting/assets', { query: { limit: 250 } })
);

const postingQueue = computed(() =>
  (journals.value ?? []).filter((journal) =>
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(journal.status)
  )
);
const postedJournals = computed(() =>
  (journals.value ?? []).filter((journal) => ['POSTED', 'REVERSED'].includes(journal.status))
);
const postedJournalCount = computed(
  () => postedJournals.value.filter((journal) => journal.status === 'POSTED').length
);
const openExceptions = computed(() =>
  (exceptions.value ?? []).filter((item) => item.status === 'OPEN')
);
const canPost = computed(() => can('finance.accounting.post').allowed);
const selectedAsset = computed(
  () => (assets.value ?? []).find((asset) => asset.id === selectedAssetId.value) ?? null
);
const reversedJournalIds = computed(
  () => new Set((journals.value ?? []).flatMap((journal) => journal.reversalOfJournalEntryId ?? []))
);

watch(
  () => route.query.tab,
  (tab) => {
    const resolved = resolveAccountingTab(tab);
    activeTab.value = resolved;
    if (tab !== resolved) void router.replace({ query: { ...route.query, tab: resolved } });
  },
  { immediate: true }
);

function errorText(error: unknown) {
  return error ? (error instanceof Error ? error.message : String(error)) : '';
}
function setTab(tab: AccountingTab) {
  activeTab.value = tab;
  if (route.query.tab !== tab) void router.push({ query: { ...route.query, tab } });
}
function selectSummary(tab: AccountingTab, filter?: string) {
  if (tab === 'general-journal') journalStatusFilter.value = filter;
  if (tab === 'exceptions') exceptionStatusFilter.value = filter;
  setTab(tab);
}
function openJournalTrace(id: string) {
  selectedJournalId.value = id;
  journalTraceOpen.value = true;
}
function openRelatedJournal(id: string) {
  selectedJournalId.value = id;
}
function viewJournalInGeneralLedger(detail: AccountingJournalDetail) {
  ledgerJournalFilter.value = detail.id;
  journalTraceOpen.value = false;
  setTab('general-ledger');
}
function openAssetPreview(id: string) {
  selectedAssetId.value = id;
  assetPreviewOpen.value = true;
}
function notify(message: string, isError = false) {
  actionMessage.value = isError ? '' : message;
  actionError.value = isError ? message : '';
  snackbarOpen.value = true;
}

async function refreshAll() {
  if (refreshBusy.value) return;
  refreshBusy.value = true;
  try {
    await Promise.all([
      refreshJournals(),
      refreshLedger(),
      refreshExceptions(),
      refreshPolicies(),
      refreshAssets()
    ]);
  } finally {
    refreshBusy.value = false;
  }
}
async function processInventoryEvents() {
  if (busyAction.value) return;
  busyAction.value = 'inventory';
  try {
    const result = await fetchApi<InventoryAccountingProcessSummaryDto>(
      '/api/finance/accounting/process-inventory-events',
      { method: 'POST', body: { batchSize: 25 } }
    );
    const message =
      result.processed === 0 && result.exceptions === 0
        ? 'No pending inventory events were found.'
        : `${result.processed} events processed · ${result.exceptions} exceptions · ${result.duplicates} duplicates`;
    notify(message);
    await Promise.all([refreshJournals(), refreshLedger(), refreshExceptions(), refreshAssets()]);
  } catch (error) {
    notify(errorText(error), true);
  } finally {
    busyAction.value = null;
  }
}
async function journalAction(journal: JournalEntryDto, action: 'submit' | 'approve' | 'post') {
  if (busyAction.value) return;
  busyAction.value = `${action}:${journal.id}`;
  try {
    await fetchApi(`/api/finance/accounting/journals/${journal.id}/${action}`, { method: 'POST' });
    notify(`${journal.journalNumber} ${action} complete.`);
    await Promise.all([refreshJournals(), refreshLedger()]);
  } catch (error) {
    notify(errorText(error), true);
  } finally {
    busyAction.value = null;
  }
}
function canReverseJournal(journal: JournalEntryDto) {
  return (
    journal.status === 'POSTED' &&
    !journal.reversalOfJournalEntryId &&
    !reversedJournalIds.value.has(journal.id)
  );
}
async function reverseJournal(journal: JournalEntryDto) {
  if (busyAction.value || !canReverseJournal(journal)) return;
  busyAction.value = `reverse:${journal.id}`;
  try {
    await fetchApi(`/api/finance/accounting/journals/${journal.id}/reverse`, {
      method: 'POST',
      body: { reason: 'Demo correction from accounting workbench' }
    });
    notify(`${journal.journalNumber} reversed.`);
    await Promise.all([refreshJournals(), refreshLedger(), refreshAssets()]);
  } catch (error) {
    notify(errorText(error), true);
  } finally {
    busyAction.value = null;
  }
}
async function reverseJournalFromDetail(detail: AccountingJournalDetail) {
  const journal = (journals.value ?? []).find((item) => item.id === detail.id);
  if (!journal) return;
  journalTraceOpen.value = false;
  await reverseJournal(journal);
}
function money(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
</script>

<template>
  <section class="accounting-workbench">
    <header class="workbench-header">
      <div>
        <h1>Accounting Workbench</h1>
        <p>Policy-driven accounting from operational events to the General Ledger.</p>
      </div>
      <div class="toolbar-actions">
        <VBtn
          :disabled="refreshBusy || Boolean(busyAction)"
          :loading="refreshBusy"
          prepend-icon="mdi-refresh"
          variant="outlined"
          @click="refreshAll"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          :disabled="!canPost || refreshBusy"
          :loading="busyAction === 'inventory'"
          prepend-icon="mdi-play-circle-outline"
          @click="processInventoryEvents"
        >
          Process inventory events
        </VBtn>
      </div>
    </header>

    <AccountingSummaryCards
      :asset-components="assets?.length ?? 0"
      :open-exceptions="openExceptions.length"
      :pending-review="postingQueue.length"
      :posted-journals="postedJournalCount"
      @select="selectSummary"
    />
    <AccountingTabNavigation
      :asset-count="assets?.length ?? 0"
      :exception-count="openExceptions.length"
      :model-value="activeTab"
      :queue-count="postingQueue.length"
      @update:model-value="setTab"
    />

    <VWindow :model-value="activeTab" class="workbench-window">
      <VWindowItem value="posting-queue">
        <PostingQueueTab
          :busy-action="busyAction"
          :can-post="canPost"
          :error="errorText(journalsError)"
          :items="postingQueue"
          :loading="journalsPending || policiesPending"
          :policies="policies ?? []"
          @action="journalAction"
          @open="openJournalTrace"
          @process="processInventoryEvents"
          @retry="refreshJournals"
        />
      </VWindowItem>
      <VWindowItem value="general-journal">
        <GeneralJournalTab
          :busy-action="busyAction"
          :can-post="canPost"
          :error="errorText(journalsError)"
          :initial-status="journalStatusFilter"
          :items="postedJournals"
          :ledger="ledger ?? []"
          :loading="journalsPending"
          :reversed-journal-ids="[...reversedJournalIds]"
          @open="openJournalTrace"
          @retry="refreshJournals"
          @reverse="reverseJournal"
        />
      </VWindowItem>
      <VWindowItem value="general-ledger">
        <GeneralLedgerTab
          :error="errorText(ledgerError)"
          :items="ledger ?? []"
          :journal-filter="ledgerJournalFilter"
          :loading="ledgerPending"
          @clear-journal-filter="ledgerJournalFilter = null"
          @open="openJournalTrace"
          @retry="refreshLedger"
        />
      </VWindowItem>
      <VWindowItem value="exceptions">
        <AccountingExceptionsTab
          :error="errorText(exceptionsError)"
          :initial-status="exceptionStatusFilter"
          :items="exceptions ?? []"
          :loading="exceptionsPending"
          @retry="refreshExceptions"
        />
      </VWindowItem>
      <VWindowItem value="policies">
        <AccountingPoliciesTab
          :error="errorText(policiesError)"
          :items="policies ?? []"
          :loading="policiesPending"
          @retry="refreshPolicies"
        />
      </VWindowItem>
      <VWindowItem value="asset-components">
        <AssetComponentsTab
          :error="errorText(assetsError)"
          :items="assets ?? []"
          :loading="assetsPending"
          @open-journal="openJournalTrace"
          @preview="openAssetPreview"
          @retry="refreshAssets"
        />
      </VWindowItem>
    </VWindow>

    <JournalDetailDialog
      v-model="journalTraceOpen"
      :can-reverse="canPost"
      :journal-id="selectedJournalId"
      @open-related-journal="openRelatedJournal"
      @reverse="reverseJournalFromDetail"
      @view-general-ledger="viewJournalInGeneralLedger"
    />
    <VDialog v-model="assetPreviewOpen" max-width="720">
      <VCard v-if="selectedAsset" class="preview-dialog">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ selectedAsset.assetNumber }}</span><DsTooltipIconButton
            aria-label="Close depreciation preview"
            icon="mdi-close"
            tooltip="Close depreciation preview"
            variant="text"
            @click="assetPreviewOpen = false"
          />
        </VCardTitle><VDivider /><VCardText>
          <strong>Depreciation preview</strong>
          <p class="text-caption text-medium-emphasis">
            Schedule only; no depreciation journals are posted.
          </p>
          <VTable class="mt-4" density="compact">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedAsset.depreciationPreview" :key="item.periodCode">
                <td>{{ item.periodCode }}</td>
                <td><DsStatusBadge :value="item.status" /></td>
                <td class="money-cell">
                  {{ money(item.depreciationAmountMinor, selectedAsset.currencyCode) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VDialog>
    <VSnackbar
      v-model="snackbarOpen"
      :color="actionError ? 'error' : 'surface'"
      location="bottom end"
      timeout="5000"
    >
      <span :class="actionError ? '' : 'text-text-primary'">{{ actionError || actionMessage }}</span><template #actions>
        <VBtn
          :color="actionError ? 'white' : 'primary'"
          variant="text"
          @click="snackbarOpen = false"
        >
          Dismiss
        </VBtn>
      </template>
    </VSnackbar>
  </section>
</template>

<style scoped>
.accounting-workbench {
  color: rgb(var(--v-theme-text-primary));
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.workbench-header {
  align-items: center;
  display: flex;
  gap: 20px;
  justify-content: space-between;
}
.workbench-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0;
}
.workbench-header p {
  color: rgb(var(--v-theme-text-secondary));
  margin: 4px 0 0;
}
.toolbar-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}
.workbench-window {
  overflow: visible;
}
.preview-dialog {
  max-height: 90vh;
}
.money-cell {
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 760px) {
  .workbench-header {
    align-items: stretch;
    flex-direction: column;
  }
  .toolbar-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .toolbar-actions :deep(.v-btn) {
    min-width: 0;
  }
  .accounting-workbench {
    gap: 12px;
  }
}
@media (max-width: 420px) {
  .toolbar-actions {
    grid-template-columns: 1fr;
  }
}
</style>
