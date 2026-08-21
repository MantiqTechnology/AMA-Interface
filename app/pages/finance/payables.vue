<script setup lang="ts">
import type { PaymentRequestDto, SupplierInvoiceDto } from '#shared/features/finance/transactions';
useHead({ title: 'Accounts Payable - PT AMA' });
const { can } = useAuthorization();
const canRecordPayment = computed(() => can('finance.payment.record').allowed);
const canPostAccounting = computed(() => can('finance.accounting.post').allowed);
const dialog = ref(false);
const errorMessage = ref('');
const form = reactive({
  supplierId: 'vendor-maintenance',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  currencyCode: 'IDR',
  subtotalMinor: 0,
  taxMinor: 0,
  sourceType: 'PURCHASE_ORDER' as 'PURCHASE_ORDER' | 'NON_PO',
  purchaseOrderId: '',
  goodsReceiptId: '',
  expenseAccountId: 'coa-5500'
});
const {
  data: invoices,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-ap-invoices',
  () => fetchApi<SupplierInvoiceDto[]>('/api/finance/supplier-invoices'),
  { default: () => [] }
);
const { data: requests, refresh: refreshRequests } = await useAsyncData(
  'finance-ap-requests',
  () => fetchApi<PaymentRequestDto[]>('/api/finance/payment-requests'),
  { default: () => [] }
);
function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
async function createInvoice() {
  errorMessage.value = '';
  try {
    await fetchApi('/api/finance/supplier-invoices', {
      method: 'POST',
      body: {
        ...form,
        totalMinor: form.subtotalMinor + form.taxMinor,
        purchaseOrderId: form.sourceType === 'PURCHASE_ORDER' ? form.purchaseOrderId : null,
        goodsReceiptId: form.sourceType === 'PURCHASE_ORDER' ? form.goodsReceiptId : null,
        expenseAccountId: form.sourceType === 'NON_PO' ? form.expenseAccountId : null
      }
    });
    dialog.value = false;
    await refresh();
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
  }
}
async function runAction(action: () => Promise<void>) {
  errorMessage.value = '';
  try {
    await action();
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e);
    throw e;
  }
}
async function postInvoice(id: string) {
  await runAction(async () => {
    await fetchApi(`/api/finance/supplier-invoices/${id}/post`, { method: 'POST' });
    await refresh();
  });
}
async function requestPayment(invoice: SupplierInvoiceDto) {
  await runAction(async () => {
    await fetchApi('/api/finance/payment-requests', {
      method: 'POST',
      body: {
        supplierInvoiceId: invoice.id,
        amountMinor: invoice.outstandingAmount,
        currencyCode: invoice.currencyCode,
        cashBankAccountId: 'cash-bank-main'
      }
    });
    await refreshRequests();
  });
}
async function requestAction(id: string, action: 'submit' | 'approve' | 'execute') {
  await runAction(async () => {
    await fetchApi(`/api/finance/payment-requests/${id}/${action}`, {
      method: 'POST',
      ...(action === 'approve' ? { body: { exchangeRateToIdrMicros: 1_000_000 } } : {})
    });
    await Promise.all([refresh(), refreshRequests()]);
  });
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-4 d-flex align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Accounts Payable</h1>
        <p class="text-body-2 text-text-secondary">
          PO matching, AP posting, approval, and settlement.
        </p>
      </div>
      <VSpacer /><VBtn v-if="canRecordPayment" prepend-icon="mdi-plus" @click="dialog = true">
        Supplier invoice
      </VBtn><VBtn
        aria-label="Refresh payables"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh"
      />
    </header>
    <VAlert
      v-if="error || errorMessage"
      class="mb-4"
      color="error"
      title="Payables action failed"
      variant="tonal"
    >
      {{ errorMessage || error?.message }}
    </VAlert>
    <VCard border rounded="lg">
      <VTable>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Source / Match</th>
            <th>Status</th>
            <th class="text-right">Outstanding</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in invoices" :key="invoice.id">
            <td>{{ invoice.invoiceNumber }}</td>
            <td>{{ invoice.sourceType }}<br><DsStatusBadge :value="invoice.matchStatus" /></td>
            <td><DsStatusBadge :value="invoice.settlementStatus" /></td>
            <td class="text-right">{{ money(invoice.outstandingAmount) }}</td>
            <td class="text-right">
              <div class="d-flex justify-end ga-1">
                <DsConfirmIconButton
                  v-if="
                    canPostAccounting &&
                      invoice.lifecycleStatus === 'DRAFT' &&
                      invoice.matchStatus === 'MATCHED'
                  "
                  :action="() => postInvoice(invoice.id)"
                  aria-label="Post supplier invoice"
                  confirm-text="Post"
                  icon="mdi-book-check-outline"
                  :message="`Post supplier invoice ${invoice.invoiceNumber} to Accounts Payable and the General Ledger.`"
                  title="Post supplier invoice?"
                  tone="warning"
                  tooltip="Post invoice"
                /><DsConfirmIconButton
                  v-if="
                    canRecordPayment &&
                      invoice.lifecycleStatus === 'AP_OPEN' &&
                      invoice.outstandingAmount > 0
                  "
                  :action="() => requestPayment(invoice)"
                  aria-label="Create payment request"
                  confirm-text="Create request"
                  icon="mdi-cash-clock"
                  :message="`Create a payment request for ${money(invoice.outstandingAmount)}.`"
                  title="Create payment request?"
                  tooltip="Request payment"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!invoices.length">
            <td class="py-10 text-center text-text-secondary" colspan="5">No supplier invoices.</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
    <h2 class="mb-2 mt-6 text-subtitle-1 font-weight-bold">Payment Requests</h2>
    <VCard border rounded="lg">
      <VTable>
        <thead>
          <tr>
            <th>Request</th>
            <th>Status</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in requests" :key="item.id">
            <td>{{ item.requestNumber }}</td>
            <td><DsStatusBadge :value="item.status" /></td>
            <td class="text-right">{{ money(item.amountMinor) }}</td>
            <td class="text-right">
              <div class="d-flex justify-end ga-1">
                <DsConfirmIconButton
                  v-if="canRecordPayment && item.status === 'DRAFT'"
                  :action="() => requestAction(item.id, 'submit')"
                  aria-label="Submit payment request"
                  confirm-text="Submit"
                  icon="mdi-send"
                  :message="`Submit ${item.requestNumber} for approval.`"
                  title="Submit payment request?"
                  tooltip="Submit request"
                /><DsConfirmIconButton
                  v-if="canPostAccounting && item.status === 'SUBMITTED'"
                  :action="() => requestAction(item.id, 'approve')"
                  aria-label="Approve payment request"
                  confirm-text="Approve"
                  icon="mdi-check-decagram-outline"
                  :message="`Approve ${item.requestNumber} under the applicable authority threshold.`"
                  title="Approve payment request?"
                  tone="success"
                  tooltip="Approve request"
                /><DsConfirmIconButton
                  v-if="canRecordPayment && item.status === 'APPROVED'"
                  :action="() => requestAction(item.id, 'execute')"
                  aria-label="Execute supplier payment"
                  confirm-text="Execute"
                  icon="mdi-bank-transfer-out"
                  :message="`Execute ${item.requestNumber}. This creates the posted AP settlement journal.`"
                  title="Execute supplier payment?"
                  tone="warning"
                  tooltip="Execute payment"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!requests.length">
            <td class="py-8 text-center text-text-secondary" colspan="4">No payment requests.</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
    <VDialog v-model="dialog" max-width="680">
      <VCard title="New supplier invoice">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="form.invoiceNumber" label="Invoice number" />
            </VCol><VCol cols="12" md="6">
              <VTextField v-model="form.supplierId" label="Supplier ID" />
            </VCol><VCol cols="12" md="6">
              <VSelect
                v-model="form.sourceType"
                :items="['PURCHASE_ORDER', 'NON_PO']"
                label="Source type"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField v-model="form.dueDate" label="Due date (YYYY-MM-DD)" />
            </VCol><VCol v-if="form.sourceType === 'PURCHASE_ORDER'" cols="12" md="6">
              <VTextField v-model="form.purchaseOrderId" label="Purchase order ID" />
            </VCol><VCol v-if="form.sourceType === 'PURCHASE_ORDER'" cols="12" md="6">
              <VTextField v-model="form.goodsReceiptId" label="Goods receipt ID" />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="form.subtotalMinor"
                label="Subtotal (IDR)"
                type="number"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="form.taxMinor"
                label="Tax (IDR)"
                type="number"
              />
            </VCol>
          </VRow>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="dialog = false">Cancel</VBtn><VBtn @click="createInvoice">Create</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
