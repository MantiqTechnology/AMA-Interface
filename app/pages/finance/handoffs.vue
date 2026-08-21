<script setup lang="ts">
import type { FinanceHandoffDto, FinanceHandoffStatus } from '#shared/features/finance/handoffs';

const { can } = useAuthorization();
const search = ref('');
const sourceModule = ref<string | null>(null);
const status = ref<FinanceHandoffStatus | null>(null);
const page = ref(1);
const pageSize = 25;
const actionError = ref('');

const query = computed(() => ({
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(sourceModule.value ? { sourceModule: sourceModule.value } : {}),
  ...(status.value ? { status: status.value } : {}),
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}));

watch([search, sourceModule, status], () => {
  page.value = 1;
});

const {
  data: handoffs,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-handoff-inbox',
  () => fetchApi<FinanceHandoffDto[]>('/api/finance/handoffs', { query: query.value }),
  { default: (): FinanceHandoffDto[] => [], watch: [query] }
);

const canProcess = computed(() => can('finance.handoff.process').allowed);
const sourceModules = ['FLIGHT_OPERATIONS', 'TICKETING', 'INVENTORY', 'PROCUREMENT', 'FUEL', 'MRO'];
const statuses: FinanceHandoffStatus[] = [
  'RECEIVED',
  'VALIDATING',
  'VALIDATED',
  'ACCEPTED',
  'ACCOUNTING_EVENT_CREATED',
  'JOURNAL_CREATED',
  'POSTED',
  'EXCEPTION',
  'REJECTED'
];

async function bridgeSources() {
  actionError.value = '';
  try {
    await fetchApi('/api/finance/handoffs/bridge', { method: 'POST' });
    await refresh();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function act(item: FinanceHandoffDto, action: 'accept' | 'retry') {
  actionError.value = '';
  try {
    await fetchApi(`/api/finance/handoffs/${item.id}/${action}`, { method: 'POST' });
    await refresh();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Finance Handoff</h1>
        <p class="text-text-secondary">
          Operational transactions awaiting Finance control and accounting.
        </p>
      </div>
      <VSpacer />
      <VBtn
        v-if="canProcess"
        prepend-icon="mdi-source-branch-sync"
        :loading="pending"
        variant="outlined"
        @click="bridgeSources"
      >
        Receive source events
      </VBtn>
      <VBtn
        aria-label="Refresh Finance handoffs"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh()"
      />
    </header>

    <div class="mb-4 d-flex flex-wrap ga-3">
      <VTextField
        v-model="search"
        clearable
        density="comfortable"
        hide-details
        label="Search source or reference"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 360px"
        variant="outlined"
      />
      <VSelect
        v-model="sourceModule"
        clearable
        density="comfortable"
        hide-details
        :items="sourceModules"
        label="Source module"
        style="max-width: 240px"
        variant="outlined"
      />
      <VSelect
        v-model="status"
        clearable
        density="comfortable"
        hide-details
        :items="statuses"
        label="Status"
        style="max-width: 240px"
        variant="outlined"
      />
    </div>

    <VAlert
      v-if="error || actionError"
      class="mb-4"
      color="error"
      title="Unable to process Finance handoffs"
      variant="tonal"
    >
      {{ actionError || error?.message }}
    </VAlert>

    <VSkeletonLoader v-if="pending && !handoffs.length" type="table" />

    <VCard v-else-if="!handoffs.length" border class="py-12 text-center" rounded="lg">
      <VIcon color="text-secondary" icon="mdi-inbox-arrow-down-outline" size="44" />
      <div class="mt-3 text-subtitle-1 font-weight-medium">No Finance handoffs found.</div>
      <div class="text-body-2 text-text-secondary">
        Receive source events or adjust the filters.
      </div>
    </VCard>

    <template v-else>
      <VTable class="border rounded-lg">
        <thead>
          <tr>
            <th>Source</th>
            <th>Transaction</th>
            <th>Dimensions</th>
            <th class="text-right">Amount</th>
            <th>Status / blocker</th>
            <th>Accounting</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in handoffs" :key="item.id">
            <td>
              <div class="font-weight-medium">{{ item.sourceModule }}</div>
              <div class="text-caption text-text-secondary">{{ item.sourceType }}</div>
            </td>
            <td>
              <div>{{ item.sourceId }}</div>
              <div class="text-caption text-text-secondary">
                {{ dateTime(item.transactionDate) }}
              </div>
            </td>
            <td>
              <div class="d-flex flex-wrap ga-1" style="max-width: 300px">
                <VChip
                  v-for="(value, key) in item.dimensions"
                  :key="key"
                  size="x-small"
                  variant="outlined"
                >
                  {{ key }}: {{ value }}
                </VChip>
                <span
                  v-if="!Object.keys(item.dimensions).length"
                  class="text-caption text-text-secondary"
                >-</span>
              </div>
            </td>
            <td class="text-right font-weight-medium">
              {{ money(item.amountMinor, item.currencyCode) }}
            </td>
            <td>
              <DsStatusBadge :value="item.status" />
              <div v-if="item.errorMessage" class="mt-1 text-caption text-error">
                {{ item.errorCode }}: {{ item.errorMessage }}
              </div>
            </td>
            <td>
              <NuxtLink
                v-if="item.journalId"
                class="text-primary"
                :to="`/finance/accounting?tab=general-journal&journal=${item.journalId}`"
              >
                {{ item.journalId }}
              </NuxtLink>
              <span v-else class="text-text-secondary">Not created</span>
            </td>
            <td class="text-right">
              <div v-if="canProcess" class="d-flex justify-end ga-1">
                <DsConfirmIconButton
                  v-if="['RECEIVED', 'VALIDATED'].includes(item.status)"
                  :action="() => act(item, 'accept')"
                  aria-label="Accept Finance handoff"
                  confirm-text="Accept"
                  icon="mdi-check-decagram-outline"
                  :message="`Accept ${item.sourceModule} transaction ${item.sourceId} for accounting.`"
                  title="Accept Finance handoff?"
                  tone="success"
                  tooltip="Accept handoff"
                />
                <DsConfirmIconButton
                  v-if="item.status === 'EXCEPTION'"
                  :action="() => act(item, 'retry')"
                  aria-label="Retry Finance handoff"
                  confirm-text="Retry"
                  icon="mdi-reload"
                  :message="`Retry validation and accounting for ${item.sourceId}.`"
                  title="Retry Finance handoff?"
                  tone="warning"
                  tooltip="Retry handoff"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </VTable>

      <div class="mt-4 d-flex align-center justify-end ga-2">
        <VBtn
          aria-label="Previous handoff page"
          :disabled="page === 1 || pending"
          icon="mdi-chevron-left"
          size="small"
          variant="outlined"
          @click="page -= 1"
        />
        <span class="text-body-2">Page {{ page }}</span>
        <VBtn
          aria-label="Next handoff page"
          :disabled="handoffs.length < pageSize || pending"
          icon="mdi-chevron-right"
          size="small"
          variant="outlined"
          @click="page += 1"
        />
      </div>
    </template>
  </VContainer>
</template>
