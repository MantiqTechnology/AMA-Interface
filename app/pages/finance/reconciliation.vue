<script setup lang="ts">
import type { BankStatementDto } from '#shared/features/finance/reconciliation';
type CashAccount = { id: string; accountName: string };
useHead({ title: 'Bank Reconciliation - PT AMA' });
const { can } = useAuthorization();
const canManage = computed(() => can('finance.payment.record').allowed);
const dialog = ref(false);
const actionError = ref('');
const form = reactive({
  cashBankAccountId: 'cash-bank-main',
  statementNumber: '',
  periodStart: '',
  periodEnd: '',
  openingBalanceMinor: 0,
  closingBalanceMinor: 0,
  bookingDate: '',
  reference: '',
  description: '',
  amountMinor: 0,
  balanceMinor: 0
});
const { data: accounts } = await useAsyncData(
  'reconciliation-accounts',
  () => fetchApi<CashAccount[]>('/api/finance/cash-bank/accounts'),
  { default: () => [] }
);
const {
  data: statements,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-bank-statements',
  () => fetchApi<BankStatementDto[]>('/api/finance/bank-statements'),
  { default: () => [] }
);
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
async function createStatement() {
  actionError.value = '';
  try {
    await fetchApi('/api/finance/bank-statements', {
      method: 'POST',
      body: {
        cashBankAccountId: form.cashBankAccountId,
        statementNumber: form.statementNumber,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        openingBalanceMinor: form.openingBalanceMinor,
        closingBalanceMinor: form.closingBalanceMinor,
        lines: [
          {
            bookingDate: form.bookingDate,
            valueDate: null,
            reference: form.reference || null,
            description: form.description,
            amountMinor: form.amountMinor,
            balanceMinor: form.balanceMinor
          }
        ]
      }
    });
    dialog.value = false;
    await refresh();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e);
  }
}
async function autoMatch(id: string) {
  actionError.value = '';
  try {
    await fetchApi(`/api/finance/bank-statements/${id}/auto-match`, { method: 'POST' });
    await refresh();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e);
  }
}
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-4 d-flex align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Bank Reconciliation</h1>
        <p class="text-body-2 text-text-secondary">
          Match external statement lines to immutable posted journal lines.
        </p>
      </div>
      <VSpacer /><VBtn
        v-if="canManage"
        prepend-icon="mdi-file-import-outline"
        @click="dialog = true"
      >
        Manual statement
      </VBtn><VBtn
        aria-label="Refresh statements"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh"
      />
    </header>
    <VAlert
      v-if="error || actionError"
      class="mb-4"
      color="error"
      title="Reconciliation action failed"
      variant="tonal"
    >
      {{ actionError || error?.message }}
    </VAlert>
    <VCard v-for="statement in statements" :key="statement.id" border class="mb-3 pa-4" rounded="lg">
      <div class="d-flex flex-wrap align-center ga-3">
        <div>
          <div class="font-weight-medium">{{ statement.statementNumber }}</div>
          <div class="text-caption text-text-secondary">
            {{ statement.periodStart }} to {{ statement.periodEnd }}
          </div>
        </div>
        <VSpacer /><DsStatusBadge :value="statement.status" />
        <div class="text-right">
          <div class="font-weight-medium">{{ money(statement.closingBalanceMinor) }}</div>
          <div class="text-caption">
            {{ statement.summary.reconciledLines }}/{{ statement.summary.totalLines }} reconciled
          </div>
        </div>
        <DsConfirmIconButton
          v-if="canManage && statement.summary.unmatchedLines"
          :action="() => autoMatch(statement.id)"
          aria-label="Auto-match bank statement"
          confirm-text="Run auto-match"
          icon="mdi-auto-fix"
          :message="`Match statement ${statement.statementNumber} against immutable posted cash and bank journal lines.`"
          title="Run bank auto-match?"
          tooltip="Auto-match statement"
        />
      </div>
      <VTable class="mt-3">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Description</th>
            <th class="text-right">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in statement.lines" :key="line.id">
            <td>{{ line.bookingDate }}</td>
            <td>{{ line.reference || '-' }}</td>
            <td>{{ line.description }}</td>
            <td class="text-right">{{ money(line.amountMinor) }}</td>
            <td><DsStatusBadge :value="line.status" /></td>
          </tr>
        </tbody>
      </VTable>
    </VCard><VCard v-if="!statements.length && !pending" border class="py-12 text-center" rounded="lg">
      <VIcon icon="mdi-bank-check" size="42" />
      <div class="mt-2 text-text-secondary">No bank statements imported.</div>
    </VCard>
    <VDialog v-model="dialog" max-width="720">
      <VCard title="Manual bank statement">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.cashBankAccountId"
                :items="accounts"
                item-title="accountName"
                item-value="id"
                label="Bank account"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField v-model="form.statementNumber" label="Statement number" />
            </VCol><VCol cols="12" md="6">
              <VTextField v-model="form.periodStart" label="Period start" />
            </VCol><VCol cols="12" md="6"><VTextField v-model="form.periodEnd" label="Period end" /></VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="form.openingBalanceMinor"
                label="Opening balance"
                type="number"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="form.closingBalanceMinor"
                label="Closing balance"
                type="number"
              />
            </VCol><VCol cols="12" md="4">
              <VTextField v-model="form.bookingDate" label="Line booking date" />
            </VCol><VCol cols="12" md="4">
              <VTextField v-model="form.reference" label="Line reference" />
            </VCol><VCol cols="12" md="4">
              <VTextField
                v-model.number="form.amountMinor"
                label="Line amount"
                type="number"
              />
            </VCol><VCol cols="12">
              <VTextField
                v-model="form.description"
                label="Line description"
              />
            </VCol>
          </VRow>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="dialog = false">Cancel</VBtn><VBtn @click="createStatement">Import</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
