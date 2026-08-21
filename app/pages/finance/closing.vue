<script setup lang="ts">
import type {
  FinanceAdjustmentDto,
  PeriodClosingRunDto,
  PeriodReopenRequestDto
} from '#shared/features/finance/closing';
import type { FinanceReportingPeriodDto } from '#shared/features/finance/reporting';

useHead({ title: 'Period Closing - PT AMA' });
const { can } = useAuthorization();
const session = useDemoSession();
const canPost = computed(() => can('finance.accounting.post').allowed);
const canApproveReopen = computed(() => ['Demo Admin', 'Director'].includes(session.role.value));
const selectedPeriod = ref('');
const actionError = ref('');
const busy = ref(false);
const accrualDialog = ref(false);
const prepaymentDialog = ref(false);
const reopenDialog = ref(false);
const reopenReason = ref('');
const today = new Date().toISOString().slice(0, 10);
const accrual = reactive({
  accountingDate: today,
  amountMinor: 0,
  currencyCode: 'IDR',
  description: '',
  evidenceReference: '',
  stationId: null as string | null,
  flightId: null as string | null,
  aircraftId: null as string | null,
  costCenterId: null as string | null
});
const prepayment = reactive({
  paymentDate: today,
  amountMinor: 0,
  currencyCode: 'IDR',
  description: '',
  cashBankAccountId: 'cash-bank-main',
  recognitionStartDate: today,
  recognitionPeriods: 1,
  evidenceReference: '',
  costCenterId: null as string | null
});

const { data: periods, refresh: refreshPeriods } = await useAsyncData(
  'closing-periods',
  () => fetchApi<FinanceReportingPeriodDto[]>('/api/finance/reporting/periods'),
  { default: () => [] }
);
if (!selectedPeriod.value) selectedPeriod.value = periods.value[0]?.code ?? '';
const {
  data: runs,
  pending,
  error,
  refresh: refreshRuns
} = await useAsyncData(
  'closing-runs',
  () => fetchApi<PeriodClosingRunDto[]>('/api/finance/closing'),
  { default: () => [] }
);
const { data: adjustments, refresh: refreshAdjustments } = await useAsyncData(
  'finance-adjustments',
  () => fetchApi<FinanceAdjustmentDto[]>('/api/finance/adjustments'),
  { default: () => [] }
);
const { data: reopenRequests, refresh: refreshReopenRequests } = await useAsyncData(
  'finance-period-reopen-requests',
  () => fetchApi<PeriodReopenRequestDto[]>('/api/finance/period-reopen'),
  { default: () => [] }
);
const activeRun = computed(
  () =>
    runs.value.find(
      (run) => run.periodCode === selectedPeriod.value && run.status === 'IN_PROGRESS'
    ) ??
    runs.value.find((run) => run.periodCode === selectedPeriod.value) ??
    null
);
const selectedReopenRequests = computed(() =>
  reopenRequests.value.filter((request) => request.periodCode === selectedPeriod.value)
);
const pendingReopenRequest = computed(
  () => selectedReopenRequests.value.find((request) => request.status === 'REQUESTED') ?? null
);
const periodOptions = computed(() =>
  periods.value.map((period) => ({
    title: `${period.name} (${period.status})`,
    value: period.code
  }))
);

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}
async function perform(action: () => Promise<unknown>) {
  actionError.value = '';
  busy.value = true;
  try {
    await action();
    await Promise.all([
      refreshPeriods(),
      refreshRuns(),
      refreshAdjustments(),
      refreshReopenRequests()
    ]);
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    busy.value = false;
  }
}
async function startClosing() {
  await perform(() =>
    fetchApi(`/api/finance/closing/${selectedPeriod.value}/start`, { method: 'POST' })
  );
}
async function review(itemCode: string) {
  if (!activeRun.value) return;
  await perform(() =>
    fetchApi(`/api/finance/closing/${activeRun.value!.id}/review`, {
      method: 'POST',
      body: {
        itemCode,
        status: 'CLEARED',
        note: 'Reviewed and cleared in period closing workspace'
      }
    })
  );
}
async function closePeriod() {
  if (!activeRun.value) return;
  await perform(() =>
    fetchApi(`/api/finance/closing/${activeRun.value!.id}/close`, { method: 'POST' })
  );
}
async function runDepreciation() {
  await perform(() =>
    fetchApi('/api/finance/depreciation-runs', {
      method: 'POST',
      body: { periodCode: selectedPeriod.value }
    })
  );
}
async function createAccrual() {
  await perform(() =>
    fetchApi('/api/finance/adjustments/accruals', {
      method: 'POST',
      body: { ...accrual, evidenceReference: accrual.evidenceReference || null }
    })
  );
  accrualDialog.value = false;
}
async function createPrepayment() {
  await perform(() =>
    fetchApi('/api/finance/adjustments/prepayments', {
      method: 'POST',
      body: { ...prepayment, evidenceReference: prepayment.evidenceReference || null }
    })
  );
  prepaymentDialog.value = false;
}
async function postAdjustment(id: string) {
  await perform(() => fetchApi(`/api/finance/adjustments/${id}/post`, { method: 'POST' }));
}
async function recognize(id: string) {
  await perform(() =>
    fetchApi(`/api/finance/prepayment-schedules/${id}/recognize`, { method: 'POST' })
  );
}
async function requestReopen() {
  await perform(() =>
    fetchApi(`/api/finance/periods/${selectedPeriod.value}/reopen`, {
      method: 'POST',
      body: { reason: reopenReason.value }
    })
  );
  reopenDialog.value = false;
  reopenReason.value = '';
}
async function approveReopen(id: string) {
  await perform(() => fetchApi(`/api/finance/period-reopen/${id}/approve`, { method: 'POST' }));
}
</script>

<template>
  <VContainer class="px-3 py-5" fluid>
    <header class="mb-5 d-flex flex-wrap align-end ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold">Period Closing</h1>
        <p class="text-body-2 text-text-secondary">
          Controlled adjustments, depreciation, review, close, and reopening.
        </p>
      </div>
      <VSpacer />
      <VSelect
        v-model="selectedPeriod"
        density="comfortable"
        hide-details
        :items="periodOptions"
        label="Accounting period"
        style="max-width: 260px"
        variant="outlined"
      />
      <VBtn
        aria-label="Refresh closing workspace"
        icon="mdi-refresh"
        :loading="pending || busy"
        variant="tonal"
        @click="refreshRuns"
      />
    </header>
    <VAlert
      v-if="error || actionError"
      class="mb-4"
      color="error"
      title="Closing action failed"
      variant="tonal"
    >
      {{ actionError || error?.message }}
    </VAlert>

    <section class="mb-6">
      <div class="mb-3 d-flex flex-wrap align-center ga-2">
        <h2 class="text-h6">Adjustments</h2>
        <VSpacer />
        <VBtn
          v-if="canPost"
          prepend-icon="mdi-calendar-clock"
          variant="outlined"
          @click="accrualDialog = true"
        >
          New accrual
        </VBtn>
        <VBtn
          v-if="canPost"
          prepend-icon="mdi-timeline-clock-outline"
          variant="outlined"
          @click="prepaymentDialog = true"
        >
          New prepayment
        </VBtn>
        <DsConfirmIconButton
          v-if="canPost"
          :action="runDepreciation"
          aria-label="Run depreciation"
          confirm-text="Run depreciation"
          icon="mdi-calculator-variant-outline"
          :message="`Post all scheduled depreciation for ${selectedPeriod}.`"
          title="Run depreciation?"
          tooltip="Run depreciation"
        />
      </div>
      <VCard v-if="!adjustments.length" border class="py-8 text-center" rounded="lg">
        <div class="text-text-secondary">No accrual or prepayment adjustments.</div>
      </VCard>
      <VTable v-else class="border rounded-lg">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Type / description</th>
            <th class="text-right">Amount</th>
            <th>Status</th>
            <th>Schedule</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in adjustments" :key="item.id">
            <td>
              {{ item.number }}
              <div class="text-caption">{{ item.accountingDate }}</div>
            </td>
            <td>
              {{ item.type }}
              <div class="text-caption text-text-secondary">{{ item.description }}</div>
            </td>
            <td class="text-right">{{ money(item.amountMinor) }}</td>
            <td><DsStatusBadge :value="item.status" /></td>
            <td>
              <div v-for="line in item.schedule" :key="line.id" class="d-flex align-center ga-2">
                <span class="text-caption">{{ line.recognitionDate }} · {{ money(line.amountMinor) }}</span><DsStatusBadge :value="line.status" /><VBtn
                  v-if="canPost && ['SCHEDULED', 'EXCEPTION'].includes(line.status)"
                  icon="mdi-check"
                  size="x-small"
                  variant="text"
                  @click="recognize(line.id)"
                />
              </div>
              <span v-if="!item.schedule.length">-</span>
            </td>
            <td class="text-right">
              <DsConfirmIconButton
                v-if="canPost && ['DRAFT', 'EXCEPTION'].includes(item.status)"
                :action="() => postAdjustment(item.id)"
                aria-label="Post adjustment"
                confirm-text="Post"
                icon="mdi-book-check-outline"
                :message="`Post ${item.number} through canonical accounting.`"
                title="Post adjustment?"
                tooltip="Post adjustment"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <section>
      <div class="mb-3 d-flex align-center ga-2">
        <h2 class="text-h6">Closing checklist</h2>
        <VSpacer /><VBtn
          v-if="canPost && activeRun?.periodStatus === 'CLOSED' && !pendingReopenRequest"
          prepend-icon="mdi-lock-open-variant-outline"
          variant="outlined"
          @click="reopenDialog = true"
        >
          Request reopen
        </VBtn><DsConfirmIconButton
          v-if="canApproveReopen && pendingReopenRequest"
          :action="() => approveReopen(pendingReopenRequest!.id)"
          aria-label="Approve period reopening"
          confirm-text="Approve reopen"
          icon="mdi-lock-open-check-outline"
          :message="`Approve reopening ${selectedPeriod}. The requester cannot approve their own request.`"
          title="Approve period reopening?"
          tooltip="Approve reopening"
        /><VBtn
          v-if="canPost && !activeRun"
          prepend-icon="mdi-lock-clock"
          :loading="busy"
          @click="startClosing"
        >
          Start closing
        </VBtn><DsConfirmIconButton
          v-if="canPost && activeRun?.status === 'IN_PROGRESS'"
          :action="closePeriod"
          aria-label="Close period"
          confirm-text="Close period"
          icon="mdi-lock-check-outline"
          :message="`Close ${selectedPeriod}; subsequent posting will be rejected.`"
          title="Close accounting period?"
          tooltip="Close period"
        />
      </div>
      <VCard v-if="!activeRun" border class="py-8 text-center" rounded="lg">
        <div class="text-text-secondary">No closing run for this period.</div>
      </VCard>
      <VCard v-else border rounded="lg">
        <VCardTitle class="d-flex align-center ga-2">
          {{ activeRun.periodCode
          }}<DsStatusBadge :value="activeRun.periodStatus" /><VSpacer /><span
            class="text-caption text-text-secondary"
          >Started {{ activeRun.startedAt }}</span>
        </VCardTitle><VList lines="two">
          <VListItem
            v-for="item in activeRun.items"
            :key="item.code"
            :subtitle="item.blocker || item.note || 'Awaiting review'"
            :title="item.label"
          >
            <template #prepend><DsStatusBadge :value="item.status" /></template><template #append>
              <VBtn
                v-if="canPost && activeRun.status === 'IN_PROGRESS' && item.status !== 'CLEARED'"
                icon="mdi-check"
                variant="text"
                @click="review(item.code)"
              />
            </template>
          </VListItem>
        </VList>
      </VCard>
      <VAlert
        v-if="pendingReopenRequest"
        class="mt-3"
        color="warning"
        variant="tonal"
        title="Reopening approval required"
      >
        {{ pendingReopenRequest.reason }} · requested by
        {{ pendingReopenRequest.requesterId }}
      </VAlert>
    </section>

    <VDialog v-model="accrualDialog" max-width="620">
      <VCard title="New accrual">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="accrual.accountingDate"
                label="Accounting date"
                type="date"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="accrual.amountMinor"
                label="Amount"
                type="number"
              />
            </VCol><VCol cols="12"><VTextField v-model="accrual.description" label="Description" /></VCol><VCol cols="12">
              <VTextField
                v-model="accrual.evidenceReference"
                label="Evidence reference"
              />
            </VCol>
          </VRow>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="accrualDialog = false">Cancel</VBtn><VBtn :loading="busy" @click="createAccrual">Create</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <VDialog v-model="prepaymentDialog" max-width="620">
      <VCard title="New prepayment">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="prepayment.paymentDate"
                label="Payment date"
                type="date"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="prepayment.amountMinor"
                label="Amount"
                type="number"
              />
            </VCol><VCol cols="12">
              <VTextField v-model="prepayment.description" label="Description" />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model="prepayment.recognitionStartDate"
                label="Recognition start"
                type="date"
              />
            </VCol><VCol cols="12" md="6">
              <VTextField
                v-model.number="prepayment.recognitionPeriods"
                label="Periods"
                type="number"
              />
            </VCol><VCol cols="12">
              <VTextField
                v-model="prepayment.evidenceReference"
                label="Evidence reference"
              />
            </VCol>
          </VRow>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="prepaymentDialog = false">Cancel</VBtn><VBtn :loading="busy" @click="createPrepayment">Create</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <VDialog v-model="reopenDialog" max-width="560">
      <VCard title="Request period reopening">
        <VCardText>
          <VTextarea
            v-model="reopenReason"
            autofocus
            label="Reason"
            rows="3"
            variant="outlined"
          /><VAlert color="warning" density="compact" variant="tonal">
            A different authorized approver must approve this request.
          </VAlert>
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="reopenDialog = false">Cancel</VBtn><VBtn :disabled="reopenReason.trim().length < 5" :loading="busy" @click="requestReopen">
            Submit request
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
