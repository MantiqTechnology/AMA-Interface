<script setup lang="ts">
import type { InvoiceDetailDto } from '#shared/features/finance/invoices';
import { demoRoleActorIds } from '#shared/types/roles';

const route = useRoute();
const session = useDemoSession();
const { can } = useAuthorization();
const id = computed(() => String(route.params.id));
const approvalOpen = ref(false);
const approving = ref(false);
const actionError = ref('');

const {
  data: invoice,
  pending,
  error,
  refresh
} = await useAsyncData(`invoice-${id.value}`, () =>
  fetchApi<InvoiceDetailDto>(`/api/invoices/${id.value}`)
);

onMounted(() => session.load());

const currentActorId = computed(() => demoRoleActorIds[session.role.value]);
const mayApprove = computed(
  () =>
    Boolean(invoice.value) &&
    invoice.value?.status === 'draft' &&
    can('finance.invoice.approve').allowed
);
const selfApproval = computed(() => invoice.value?.createdByUserId === currentActorId.value);

function money(value: number, currency = invoice.value?.currency ?? 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function dateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '-';
}

async function approveInvoice() {
  if (!invoice.value || selfApproval.value) return;
  approving.value = true;
  actionError.value = '';
  try {
    await fetchApi<InvoiceDetailDto>(`/api/invoices/${id.value}/actions/approve`, {
      method: 'POST',
      body: {}
    });
    approvalOpen.value = false;
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Invoice approval failed.';
  } finally {
    approving.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-4">
      <VBtn prepend-icon="mdi-arrow-left" to="/invoices" variant="text">Invoices</VBtn>
    </div>

    <VSkeletonLoader v-if="pending" type="article, table" />
    <VAlert
      v-else-if="error || !invoice"
      color="error"
      title="Invoice is unavailable"
      variant="tonal"
    >
      <p>{{ error?.message || 'The requested invoice could not be found.' }}</p>
      <VBtn class="mt-3" prepend-icon="mdi-arrow-left" to="/invoices" variant="text">
        Back to invoices
      </VBtn>
    </VAlert>

    <template v-else>
      <div class="mb-5 d-flex flex-wrap align-end ga-4">
        <div>
          <div class="mb-1 d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-text-primary">{{ invoice.invoiceNumber }}</h1>
            <DsStatusBadge :value="invoice.status" />
          </div>
          <p class="text-text-secondary">
            {{ invoice.customer.name }} · {{ invoice.flight.flightNumber }} ·
            {{ invoice.flight.originCode }} -> {{ invoice.flight.destinationCode }}
          </p>
        </div>
        <VSpacer />
        <VBtn
          v-if="mayApprove"
          color="primary"
          :disabled="selfApproval"
          prepend-icon="mdi-check-decagram-outline"
          @click="approvalOpen = true"
        >
          Approve Invoice
        </VBtn>
      </div>

      <VAlert v-if="selfApproval && mayApprove" class="mb-4" color="warning" variant="tonal">
        This invoice was created by the active persona. Switch to another Finance Reviewer to
        approve it.
      </VAlert>
      <VAlert v-if="actionError" class="mb-4" color="error" variant="tonal">
        {{ actionError }}
      </VAlert>

      <VRow>
        <VCol cols="6" lg="3">
          <DsStatCard label="Revenue" :value="money(invoice.finance.totalRevenue)" />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard
            label="Operational Cost"
            :value="money(invoice.finance.totalOperationalCost)"
            tone="warning"
          />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard
            label="Gross Margin"
            :value="money(invoice.finance.grossMargin)"
            tone="success"
          />
        </VCol>
        <VCol cols="6" lg="3">
          <DsStatCard label="Balance Due" :value="money(invoice.balanceDue)" tone="warning" />
        </VCol>
      </VRow>

      <VRow class="mt-1">
        <VCol cols="12" lg="8">
          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold">Revenue Lines</VCardTitle>
            <VDivider />
            <div class="overflow-x-auto">
              <VTable class="invoice-lines" density="comfortable">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Base</th>
                    <th>Tax</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in invoice.lineItems" :key="line.id">
                    <td>
                      <VChip size="small" variant="tonal">
                        {{
                          line.sourceType.replaceAll('_', ' ')
                        }}
                      </VChip>
                    </td>
                    <td>
                      {{ line.description }}
                      <div class="text-xs text-text-secondary">{{ line.sourceId }}</div>
                    </td>
                    <td class="text-right">{{ line.quantity }}</td>
                    <td class="text-right">{{ money(line.subtotal) }}</td>
                    <td>
                      {{ line.taxCode || 'No tax code' }}
                      <div class="text-xs text-text-secondary">
                        {{ (line.taxRateBasisPoints / 100).toFixed(2) }}% ·
                        {{ money(line.taxAmount) }}
                      </div>
                    </td>
                    <td class="text-right font-weight-bold">{{ money(line.total) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" class="text-right">Invoice Total</td>
                    <td class="text-right font-weight-bold">{{ money(invoice.total) }}</td>
                  </tr>
                </tfoot>
              </VTable>
            </div>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border class="mb-4">
            <VCardTitle class="text-subtitle-1 font-weight-bold">Operational Cost</VCardTitle>
            <VDivider />
            <VList density="comfortable">
              <VListItem title="Fuel" :subtitle="money(invoice.finance.fuelCost)" />
              <VListItem title="Station" :subtitle="money(invoice.finance.stationCost)" />
              <VListItem title="Maintenance" :subtitle="money(invoice.finance.maintenanceCost)" />
            </VList>
            <VDivider />
            <VCardText class="d-flex justify-space-between font-weight-bold">
              <span>Total cost</span><span>{{ money(invoice.finance.totalOperationalCost) }}</span>
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold">Billing</VCardTitle>
            <VDivider />
            <VList density="comfortable">
              <VListItem title="Subtotal" :subtitle="money(invoice.subtotal)" />
              <VListItem title="Tax" :subtitle="money(invoice.tax)" />
              <VListItem title="Paid" :subtitle="money(invoice.paidAmount)" />
              <VListItem title="Issued" :subtitle="dateTime(invoice.issuedAt)" />
              <VListItem title="Due" :subtitle="dateTime(invoice.dueAt)" />
            </VList>
          </VCard>
        </VCol>
      </VRow>

      <VRow class="mt-1">
        <VCol cols="12" lg="7">
          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold">
              Finance Handoff Timeline
            </VCardTitle>
            <VDivider />
            <VTimeline v-if="invoice.handoffs.length" align="start" density="compact" side="end">
              <VTimelineItem
                v-for="handoff in invoice.handoffs"
                :key="handoff.id"
                dot-color="primary"
                size="small"
              >
                <div class="d-flex flex-wrap align-center ga-2">
                  <strong>{{ handoff.eventType.replaceAll('_', ' ') }}</strong>
                  <DsStatusBadge :value="handoff.status" />
                </div>
                <div class="text-sm text-text-secondary">{{ handoff.summary }}</div>
                <div class="text-xs text-text-secondary">
                  {{ handoff.sourceType }} · {{ dateTime(handoff.updatedAt) }}
                  <template v-if="handoff.amount !== null">
                    ·
                    {{ money(handoff.amount, handoff.currencyCode || invoice.currency) }}
                  </template>
                </div>
              </VTimelineItem>
            </VTimeline>
            <VCardText v-else class="text-text-secondary">No finance handoff events.</VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" lg="5">
          <VCard border>
            <VCardTitle class="text-subtitle-1 font-weight-bold">Payments</VCardTitle>
            <VDivider />
            <VTable v-if="invoice.payments.length" density="comfortable">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in invoice.payments" :key="payment.id">
                  <td>{{ payment.reference }}</td>
                  <td>{{ dateTime(payment.paidAt) }}</td>
                  <td class="text-right">{{ money(payment.amount, payment.currency) }}</td>
                </tr>
              </tbody>
            </VTable>
            <VCardText v-else class="text-text-secondary">No payment recorded.</VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>

    <VDialog v-model="approvalOpen" max-width="520">
      <VCard>
        <VCardTitle>Approve Invoice</VCardTitle>
        <VDivider />
        <VCardText>
          <p>Issue {{ invoice?.invoiceNumber }} for {{ money(invoice?.total ?? 0) }}?</p>
          <p class="mt-2 text-sm text-text-secondary">
            The due date will follow the customer's payment term, with a 14-day fallback.
          </p>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="approvalOpen = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :loading="approving"
            prepend-icon="mdi-check-decagram-outline"
            @click="approveInvoice"
          >
            Approve Invoice
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.invoice-lines {
  min-width: 820px;
}
</style>
