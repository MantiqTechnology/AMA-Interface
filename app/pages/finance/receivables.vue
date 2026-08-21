<script setup lang="ts">
import type { InvoiceSummaryDto } from '#shared/features/finance/invoices';
import type { CustomerReceiptDto } from '#shared/features/finance/transactions';

type CashAccount = { id: string; accountName: string; currencyCode: string };
type AllocationResult = { status: string; exceptionCode?: string; exceptionMessage?: string };

useHead({ title: 'Accounts Receivable - PT AMA' });
const { can } = useAuthorization();
const canRecord = computed(() => can('finance.payment.record').allowed);
const search = ref('');
const actionError = ref('');
const receiptDialog = ref(false);
const receiptConfirmOpen = ref(false);
const allocationDialog = ref(false);
const allocationConfirmOpen = ref(false);
const selectedReceipt = ref<CustomerReceiptDto | null>(null);
const receiptForm = reactive({
  invoiceId: '',
  customerId: '',
  receiptDate: new Date().toISOString().slice(0, 16),
  currencyCode: 'IDR',
  amountMinor: 0,
  paymentMethod: 'BANK_TRANSFER',
  cashBankAccountId: 'cash-bank-main',
  reference: '',
  allocateNow: true
});
const allocationForm = reactive({ invoiceId: '', amountMinor: 0 });

const {
  data: invoices,
  pending: invoicePending,
  error: invoiceError,
  refresh: refreshInvoices
} = await useAsyncData(
  'finance-ar-invoices',
  () =>
    fetchApi<InvoiceSummaryDto[]>('/api/invoices', {
      query: { limit: 100, offset: 0, due: 'all' }
    }),
  { default: () => [] }
);
const {
  data: receipts,
  pending: receiptPending,
  error: receiptError,
  refresh: refreshReceipts
} = await useAsyncData(
  'finance-ar-receipts',
  () => fetchApi<CustomerReceiptDto[]>('/api/finance/receipts'),
  { default: () => [] }
);
const { data: cashAccounts } = await useAsyncData(
  'finance-ar-cash-accounts',
  () => fetchApi<CashAccount[]>('/api/finance/cash-bank/accounts'),
  { default: () => [] }
);

const receivableInvoices = computed(() =>
  invoices.value.filter(
    (invoice) => invoice.recognitionMode === 'AR_ON_ISSUE' && invoice.outstandingAmount > 0
  )
);
const filtered = computed(() =>
  invoices.value.filter(
    (invoice) =>
      invoice.recognitionMode === 'AR_ON_ISSUE' &&
      `${invoice.invoiceNumber} ${invoice.customer.name}`
        .toLowerCase()
        .includes(search.value.toLowerCase())
  )
);
const invoiceOptions = computed(() =>
  receivableInvoices.value.map((invoice) => ({
    title: `${invoice.invoiceNumber} - ${invoice.customer.name} (${money(invoice.outstandingAmount, invoice.currency)})`,
    value: invoice.id
  }))
);
const customerOptions = computed(() => [
  ...new Map(
    receivableInvoices.value.map((invoice) => [
      invoice.customer.id,
      { title: invoice.customer.name, value: invoice.customer.id }
    ])
  ).values()
]);
const allocationInvoiceOptions = computed(() =>
  receivableInvoices.value
    .filter(
      (invoice) =>
        invoice.customer.id === selectedReceipt.value?.customerId &&
        invoice.currency === selectedReceipt.value?.currencyCode
    )
    .map((invoice) => ({
      title: `${invoice.invoiceNumber} (${money(invoice.outstandingAmount, invoice.currency)})`,
      value: invoice.id
    }))
);
const receiptReady = computed(
  () =>
    receiptForm.amountMinor > 0 &&
    receiptForm.reference.trim().length >= 2 &&
    Boolean(receiptForm.customerId && receiptForm.cashBankAccountId) &&
    (!receiptForm.allocateNow || Boolean(receiptForm.invoiceId))
);
const allocationReady = computed(
  () => allocationForm.amountMinor > 0 && Boolean(allocationForm.invoiceId)
);

watch(
  () => receiptForm.invoiceId,
  (invoiceId) => {
    if (!invoiceId) return;
    const invoice = invoices.value.find((item) => item.id === invoiceId);
    if (!invoice) return;
    receiptForm.customerId = invoice.customer.id;
    receiptForm.currencyCode = invoice.currency;
    receiptForm.amountMinor = invoice.outstandingAmount;
  }
);

function money(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

async function refreshAll() {
  await Promise.all([refreshInvoices(), refreshReceipts()]);
}

function openReceiptDialog() {
  actionError.value = '';
  Object.assign(receiptForm, {
    invoiceId: '',
    customerId: '',
    receiptDate: new Date().toISOString().slice(0, 16),
    currencyCode: 'IDR',
    amountMinor: 0,
    paymentMethod: 'BANK_TRANSFER',
    cashBankAccountId: cashAccounts.value[0]?.id ?? 'cash-bank-main',
    reference: '',
    allocateNow: true
  });
  receiptDialog.value = true;
}

async function createReceipt() {
  actionError.value = '';
  try {
    const receipt = await fetchApi<CustomerReceiptDto>('/api/finance/receipts', {
      method: 'POST',
      body: {
        customerId: receiptForm.customerId,
        receiptDate: new Date(receiptForm.receiptDate).toISOString(),
        currencyCode: receiptForm.currencyCode,
        amountMinor: receiptForm.amountMinor,
        paymentMethod: receiptForm.paymentMethod,
        cashBankAccountId: receiptForm.cashBankAccountId,
        reference: receiptForm.reference
      }
    });
    if (receiptForm.allocateNow) {
      const result = await fetchApi<AllocationResult>(
        `/api/finance/receipts/${receipt.id}/allocate`,
        {
          method: 'POST',
          body: { invoiceId: receiptForm.invoiceId, amountMinor: receiptForm.amountMinor }
        }
      );
      if (result.status !== 'POSTED')
        throw new Error(
          `${result.exceptionCode || 'ACCOUNTING_EXCEPTION'}: ${result.exceptionMessage || 'Receipt accounting was not posted.'}`
        );
    }
    receiptConfirmOpen.value = false;
    receiptDialog.value = false;
    await refreshAll();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
    receiptConfirmOpen.value = false;
    await refreshAll();
  }
}

function openAllocation(receipt: CustomerReceiptDto) {
  selectedReceipt.value = receipt;
  allocationForm.invoiceId = '';
  allocationForm.amountMinor = receipt.unallocatedAmount;
  allocationDialog.value = true;
}

async function allocateReceipt() {
  if (!selectedReceipt.value) return;
  actionError.value = '';
  try {
    const result = await fetchApi<AllocationResult>(
      `/api/finance/receipts/${selectedReceipt.value.id}/allocate`,
      {
        method: 'POST',
        body: { invoiceId: allocationForm.invoiceId, amountMinor: allocationForm.amountMinor }
      }
    );
    if (result.status !== 'POSTED')
      throw new Error(
        `${result.exceptionCode || 'ACCOUNTING_EXCEPTION'}: ${result.exceptionMessage || 'Receipt accounting was not posted.'}`
      );
    allocationConfirmOpen.value = false;
    allocationDialog.value = false;
    await refreshAll();
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
    allocationConfirmOpen.value = false;
    await refreshAll();
  }
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-4 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Accounts Receivable</h1>
        <p class="text-body-2 text-text-secondary">
          Outstanding is derived from posted receipt allocations.
        </p>
      </div>
      <VSpacer />
      <VTextField
        v-model="search"
        hide-details
        label="Search invoice or customer"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 320px"
        variant="outlined"
      />
      <VBtn v-if="canRecord" prepend-icon="mdi-bank-transfer-in" @click="openReceiptDialog">
        New receipt
      </VBtn>
      <VBtn
        aria-label="Refresh receivables"
        icon="mdi-refresh"
        :loading="invoicePending || receiptPending"
        variant="tonal"
        @click="refreshAll"
      />
    </header>
    <VAlert
      v-if="invoiceError || receiptError || actionError"
      class="mb-4"
      color="error"
      title="Receivables action failed"
      variant="tonal"
    >
      {{ actionError || invoiceError?.message || receiptError?.message }}
    </VAlert>
    <VSkeletonLoader v-if="invoicePending && !invoices.length" type="table" />
    <VCard v-else border rounded="lg">
      <VTable>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Status</th>
            <th class="text-right">Total</th>
            <th class="text-right">Outstanding</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in filtered" :key="invoice.id">
            <td>{{ invoice.invoiceNumber }}</td>
            <td>{{ invoice.customer.name }}</td>
            <td><DsStatusBadge :value="invoice.settlementStatus" /></td>
            <td class="text-right">{{ money(invoice.total, invoice.currency) }}</td>
            <td class="text-right font-weight-medium">
              {{ money(invoice.outstandingAmount, invoice.currency) }}
            </td>
            <td class="text-right">
              <VBtn icon="mdi-open-in-new" :to="`/invoices/${invoice.id}`" variant="text" />
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td class="py-10 text-center text-text-secondary" colspan="6">
              No receivable invoices found.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <h2 class="mb-2 mt-6 text-subtitle-1 font-weight-bold">Receipts</h2>
    <VCard border rounded="lg">
      <VTable>
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Reference</th>
            <th>Status</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Unallocated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="receipt in receipts" :key="receipt.id">
            <td>{{ receipt.receiptNumber }}</td>
            <td>{{ receipt.reference }}</td>
            <td><DsStatusBadge :value="receipt.status" /></td>
            <td class="text-right">{{ money(receipt.amountMinor, receipt.currencyCode) }}</td>
            <td class="text-right">{{ money(receipt.unallocatedAmount, receipt.currencyCode) }}</td>
            <td class="text-right">
              <VBtn
                v-if="canRecord && receipt.unallocatedAmount > 0"
                aria-label="Allocate receipt"
                icon="mdi-link-variant"
                variant="text"
                @click="openAllocation(receipt)"
              />
            </td>
          </tr>
          <tr v-if="!receipts.length">
            <td class="py-8 text-center text-text-secondary" colspan="6">No receipts recorded.</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <VDialog v-model="receiptDialog" max-width="680">
      <VCard title="New customer receipt">
        <VCardText>
          <VRow>
            <VCol cols="12">
              <VSelect
                v-model="receiptForm.invoiceId"
                clearable
                :items="invoiceOptions"
                label="Allocate to invoice"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="receiptForm.customerId"
                :disabled="Boolean(receiptForm.invoiceId)"
                :items="customerOptions"
                label="Customer"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="receiptForm.cashBankAccountId"
                :items="cashAccounts"
                item-title="accountName"
                item-value="id"
                label="Cash / bank account"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="receiptForm.receiptDate"
                label="Receipt date"
                type="datetime-local"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="receiptForm.amountMinor"
                label="Amount"
                min="1"
                type="number"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="receiptForm.paymentMethod"
                :items="['BANK_TRANSFER', 'CASH', 'CARD']"
                label="Payment method"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="receiptForm.reference" label="Bank / receipt reference" />
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="receiptForm.allocateNow"
                color="primary"
                hide-details
                label="Post and allocate now"
              />
            </VCol>
          </VRow>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="receiptDialog = false">Cancel</VBtn><VBtn :disabled="!receiptReady" @click="receiptConfirmOpen = true">
            Continue
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="receiptConfirmOpen" max-width="460">
      <VCard title="Record customer receipt?">
        <VCardText>
          {{
            receiptForm.allocateNow
              ? `Post ${money(receiptForm.amountMinor, receiptForm.currencyCode)} to Cash/Bank and Accounts Receivable.`
              : `Record ${money(receiptForm.amountMinor, receiptForm.currencyCode)} as an unallocated receipt.`
          }}
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="receiptConfirmOpen = false">Cancel</VBtn><VBtn color="primary" prepend-icon="mdi-bank-transfer-in" @click="createReceipt">
            Confirm receipt
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="allocationDialog" max-width="560">
      <VCard title="Allocate receipt">
        <VCardText>
          <VSelect
            v-model="allocationForm.invoiceId"
            :items="allocationInvoiceOptions"
            label="Receivable invoice"
          /><VTextField
            v-model.number="allocationForm.amountMinor"
            label="Allocation amount"
            min="1"
            :max="selectedReceipt?.unallocatedAmount"
            type="number"
          /><VAlert v-if="!allocationInvoiceOptions.length" color="warning" variant="tonal">
            No open invoice matches this receipt customer and currency.
          </VAlert>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="allocationDialog = false">Cancel</VBtn><VBtn :disabled="!allocationReady" @click="allocationConfirmOpen = true">
            Continue
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="allocationConfirmOpen" max-width="460">
      <VCard title="Post receipt allocation?">
        <VCardText>
          Post {{ money(allocationForm.amountMinor, selectedReceipt?.currencyCode) }} to Cash/Bank
          and reduce Accounts Receivable. Posted accounting will remain immutable.
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="allocationConfirmOpen = false">Cancel</VBtn><VBtn color="primary" prepend-icon="mdi-link-variant" @click="allocateReceipt">
            Post allocation
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
