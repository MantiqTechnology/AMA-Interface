<script setup lang="ts">
import { useDisplay } from 'vuetify';
import type { InvoiceStatus, InvoiceSummaryDto } from '#shared/features/finance/invoices';
import CustomerSelect from '../../features/commercial/customers/CustomerSelect.vue';

type DueFilter = 'all' | 'upcoming' | 'overdue';
type StatusOption = { value: InvoiceStatus; title: string };

const { smAndDown } = useDisplay();
const search = ref<string>('');
const status = ref<InvoiceStatus | null>(null);
const customerId = ref<string | null>(null);
const due = ref<DueFilter>('all');

const query = computed(() => ({
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(status.value ? { status: status.value } : {}),
  ...(customerId.value ? { customerId: customerId.value } : {}),
  ...(due.value !== 'all' ? { due: due.value } : {}),
  limit: 100
}));

const {
  data: invoices,
  pending,
  error,
  refresh
} = await useAsyncData(
  'finance-invoice-worklist',
  () => fetchApi<InvoiceSummaryDto[]>('/api/invoices', { query: query.value }),
  { default: (): InvoiceSummaryDto[] => [], watch: [query] }
);

const activeFiltersCount = computed<number>(
  () =>
    [status.value, customerId.value, due.value !== 'all' ? due.value : null].filter(Boolean).length
);

function resetFilters(): void {
  search.value = '';
  status.value = null;
  customerId.value = null;
  due.value = 'all';
}

const metrics = computed(() => {
  const list: InvoiceSummaryDto[] = invoices.value;
  const currencies = new Set<string>(list.map((invoice: InvoiceSummaryDto) => invoice.currency));
  const overdueCount = list.filter(
    (invoice: InvoiceSummaryDto) => invoice.status === 'overdue'
  ).length;
  return {
    count: list.length,
    revenue: list.reduce(
      (sum: number, invoice: InvoiceSummaryDto) => sum + invoice.finance.totalRevenue,
      0
    ),
    margin: list.reduce(
      (sum: number, invoice: InvoiceSummaryDto) => sum + invoice.finance.grossMargin,
      0
    ),
    balance: list.reduce((sum: number, invoice: InvoiceSummaryDto) => sum + invoice.balanceDue, 0),
    overdueCount,
    currency: currencies.values().next().value ?? 'IDR',
    isMixedCurrency: currencies.size > 1
  };
});

const marginRatio = computed<number>(() =>
  metrics.value.revenue > 0 ? metrics.value.margin / metrics.value.revenue : 0
);

function money(value: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function metricMoney(value: number): string {
  return metrics.value.isMixedCurrency
    ? 'Multiple currencies'
    : money(value, metrics.value.currency);
}

function date(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
    : '-';
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function dueTone(invoice: InvoiceSummaryDto): string {
  if (invoice.status === 'paid' || invoice.status === 'void') return 'text-secondary';
  const diff = daysUntil(invoice.dueAt);
  if (diff === null) return 'text-secondary';
  if (diff < 0) return 'text-error';
  if (diff <= 3) return 'text-warning';
  return 'text-secondary';
}

const statusOptions: StatusOption[] = [
  { value: 'draft', title: 'Draft' },
  { value: 'issued', title: 'Issued' },
  { value: 'partially_paid', title: 'Partially paid' },
  { value: 'paid', title: 'Paid' },
  { value: 'overdue', title: 'Overdue' },
  { value: 'void', title: 'Void' }
];

const activeStatusLabel = computed<string>(() => {
  const match: StatusOption | undefined = statusOptions.find(
    (option: StatusOption) => option.value === status.value
  );
  return match?.title ?? '';
});

const dueLabel = computed<string>(() => {
  if (due.value === 'upcoming') return 'Upcoming';
  if (due.value === 'overdue') return 'Overdue';
  return '';
});

type InvoiceTableHeader = {
  title: string;
  key: string;
  sortable: boolean;
  align?: 'start' | 'end' | 'center';
};

const headers: InvoiceTableHeader[] = [
  { title: 'Invoice', key: 'invoiceNumber', sortable: true },
  { title: 'Customer / Flight', key: 'customer.name', sortable: true },
  { title: 'Revenue', key: 'finance.totalRevenue', sortable: true, align: 'end' },
  { title: 'Cost', key: 'finance.totalOperationalCost', sortable: true, align: 'end' },
  { title: 'Margin', key: 'finance.grossMargin', sortable: true, align: 'end' },
  { title: 'Tax / Total', key: 'total', sortable: true, align: 'end' },
  { title: 'Due', key: 'dueAt', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Invoices</h1>
        <p class="text-text-secondary">Closed-flight revenue, operational cost, and margin.</p>
      </div>
      <VSpacer />
      <VBtn
        v-if="activeFiltersCount"
        prepend-icon="mdi-filter-remove-outline"
        variant="text"
        @click="resetFilters"
      >
        Clear filters
      </VBtn>
      <VBtn
        aria-label="Refresh invoices"
        icon="mdi-refresh"
        :loading="pending"
        variant="tonal"
        @click="refresh()"
      />
    </div>

    <VRow class="mb-2">
      <VCol cols="6" lg="3">
        <VCard border rounded="lg">
          <VCardText class="d-flex align-center ga-3">
            <VAvatar color="primary" rounded="lg" variant="tonal">
              <VIcon icon="mdi-receipt-text-outline" />
            </VAvatar>
            <div>
              <div class="text-caption text-text-secondary">Invoices</div>
              <div class="text-h6 font-weight-bold text-text-primary">{{ metrics.count }}</div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" lg="3">
        <VCard border rounded="lg">
          <VCardText class="d-flex align-center ga-3">
            <VAvatar color="info" rounded="lg" variant="tonal">
              <VIcon icon="mdi-cash-multiple" />
            </VAvatar>
            <div>
              <div class="text-caption text-text-secondary">Visible Revenue</div>
              <div class="text-h6 font-weight-bold text-text-primary">
                {{ metricMoney(metrics.revenue) }}
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" lg="3">
        <VCard border rounded="lg">
          <VCardText class="d-flex align-center ga-3">
            <VAvatar color="success" rounded="lg" variant="tonal">
              <VIcon icon="mdi-trending-up" />
            </VAvatar>
            <div class="min-w-0">
              <div class="text-caption text-text-secondary">Visible Margin</div>
              <div class="d-flex align-center ga-2">
                <span class="text-h6 font-weight-bold text-success">{{
                  metricMoney(metrics.margin)
                }}</span>
                <VChip
                  v-if="!metrics.isMixedCurrency"
                  color="success"
                  size="x-small"
                  variant="flat"
                >
                  {{ (marginRatio * 100).toFixed(0) }}%
                </VChip>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="6" lg="3">
        <VCard border rounded="lg">
          <VCardText class="d-flex align-center ga-3">
            <VAvatar color="warning" rounded="lg" variant="tonal">
              <VIcon icon="mdi-alert-circle-outline" />
            </VAvatar>
            <div>
              <div class="text-caption text-text-secondary">Visible Balance</div>
              <div class="d-flex align-center ga-2">
                <span class="text-h6 font-weight-bold text-warning">{{
                  metricMoney(metrics.balance)
                }}</span>
                <VChip v-if="metrics.overdueCount" color="error" size="x-small" variant="flat">
                  {{ metrics.overdueCount }} overdue
                </VChip>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <div class="mb-4 d-flex flex-wrap align-center ga-3">
      <VTextField
        v-model="search"
        class="invoice-search"
        clearable
        density="comfortable"
        hide-details
        label="Search invoice, flight, or customer"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />

      <VMenu :close-on-content-click="false" location="bottom start" offset="6">
        <template #activator="{ props: menuProps }">
          <VBadge
            color="primary"
            :content="activeFiltersCount"
            :model-value="activeFiltersCount > 0"
            offset-x="4"
            offset-y="4"
          >
            <VBtn prepend-icon="mdi-tune-variant" v-bind="menuProps" variant="outlined">
              Filters
            </VBtn>
          </VBadge>
        </template>

        <VCard min-width="300" rounded="lg">
          <VCardText class="d-grid ga-4">
            <VSelect
              v-model="status"
              clearable
              density="comfortable"
              hide-details
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="Status"
              variant="outlined"
            />
            <CustomerSelect
              v-model="customerId"
              :allow-create="false"
              clearable
              density="comfortable"
              hide-details
              label="Customer"
            />
            <div>
              <div class="text-caption text-text-secondary mb-1">Due date</div>
              <VChipGroup v-model="due" color="primary" mandatory selected-class="text-primary">
                <VChip filter value="all" variant="outlined">All</VChip>
                <VChip filter value="upcoming" variant="outlined">Upcoming</VChip>
                <VChip filter value="overdue" variant="outlined">Overdue</VChip>
              </VChipGroup>
            </div>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VBtn :disabled="!activeFiltersCount" variant="text" @click="resetFilters">Reset</VBtn>
            <VSpacer />
          </VCardActions>
        </VCard>
      </VMenu>
    </div>

    <div v-if="activeFiltersCount" class="mb-4 d-flex flex-wrap align-center ga-2">
      <VChip v-if="status" closable size="small" variant="tonal" @click:close="status = null">
        Status: {{ activeStatusLabel }}
      </VChip>
      <VChip
        v-if="customerId"
        closable
        size="small"
        variant="tonal"
        @click:close="customerId = null"
      >
        Customer selected
      </VChip>
      <VChip v-if="due !== 'all'" closable size="small" variant="tonal" @click:close="due = 'all'">
        Due: {{ dueLabel }}
      </VChip>
    </div>

    <VAlert v-if="error" class="mb-4" color="error" title="Unable to load invoices" variant="tonal">
      <div class="d-flex flex-wrap align-center ga-3">
        <span>{{ error.message }}</span>
        <VBtn size="small" variant="text" @click="refresh()">Retry</VBtn>
      </div>
    </VAlert>

    <VSkeletonLoader v-if="pending && !invoices.length" type="table" />

    <template v-else-if="!error">
      <VCard v-if="!invoices.length" border class="py-12 text-center" rounded="lg">
        <VIcon class="mb-3" color="text-secondary" icon="mdi-file-document-outline" size="44" />
        <div class="text-subtitle-1 font-weight-medium text-text-primary">
          No invoices match these filters.
        </div>
        <div class="text-body-2 text-text-secondary mb-4">
          Try adjusting search, status, or due date filters.
        </div>
        <VBtn v-if="activeFiltersCount" color="primary" variant="tonal" @click="resetFilters">
          Clear filters
        </VBtn>
      </VCard>

      <div v-else-if="smAndDown" class="d-grid ga-3">
        <VCard v-for="invoice in invoices" :key="invoice.id" border rounded="lg">
          <VCardText>
            <div class="d-flex align-start ga-3">
              <div class="min-w-0">
                <div class="font-weight-bold text-text-primary">{{ invoice.invoiceNumber }}</div>
                <div class="text-sm text-text-secondary">
                  {{ invoice.customer.name }} · {{ invoice.flight.flightNumber }}
                </div>
                <div class="text-sm text-text-secondary">
                  {{ invoice.flight.originCode }} -> {{ invoice.flight.destinationCode }}
                </div>
              </div>
              <VSpacer />
              <DsStatusBadge :value="invoice.status" />
            </div>
            <VDivider class="my-3" />
            <div class="d-grid invoice-card-values ga-3 text-sm">
              <div>
                <span>Revenue</span><strong>{{ money(invoice.finance.totalRevenue, invoice.currency) }}</strong>
              </div>
              <div>
                <span>Cost</span><strong>{{
                  money(invoice.finance.totalOperationalCost, invoice.currency)
                }}</strong>
              </div>
              <div>
                <span>Margin</span><strong class="text-success">{{
                  money(invoice.finance.grossMargin, invoice.currency)
                }}</strong>
              </div>
              <div>
                <span>Balance</span><strong :class="invoice.balanceDue > 0 ? 'text-warning' : ''">{{
                  money(invoice.balanceDue, invoice.currency)
                }}</strong>
              </div>
            </div>
            <div class="mt-2 text-xs" :class="dueTone(invoice)">
              <VIcon icon="mdi-calendar-clock-outline" size="14" />
              Due {{ date(invoice.dueAt) }}
            </div>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VBtn
              block
              color="primary"
              :to="`/invoices/${invoice.id}`"
              append-icon="mdi-arrow-right"
              variant="text"
            >
              Open invoice
            </VBtn>
          </VCardActions>
        </VCard>
      </div>

      <VCard v-else border rounded="lg">
        <VDataTable
          class="invoice-table"
          density="comfortable"
          :headers="headers"
          hover
          item-value="id"
          :items="invoices"
          :items-per-page="25"
        >
          <template #[`item.invoiceNumber`]="{ item }: { item: InvoiceSummaryDto }">
            <span class="font-weight-medium text-text-primary">{{ item.invoiceNumber }}</span>
          </template>

          <template #[`item.customer.name`]="{ item }: { item: InvoiceSummaryDto }">
            <div>{{ item.customer.name }}</div>
            <div class="text-xs text-text-secondary">
              {{ item.flight.flightNumber }} · {{ item.flight.originCode }} ->
              {{ item.flight.destinationCode }}
            </div>
          </template>

          <template #[`item.finance.totalRevenue`]="{ item }: { item: InvoiceSummaryDto }">
            {{ money(item.finance.totalRevenue, item.currency) }}
          </template>

          <template #[`item.finance.totalOperationalCost`]="{ item }: { item: InvoiceSummaryDto }">
            {{ money(item.finance.totalOperationalCost, item.currency) }}
          </template>

          <template #[`item.finance.grossMargin`]="{ item }: { item: InvoiceSummaryDto }">
            <span class="font-weight-bold text-success">{{
              money(item.finance.grossMargin, item.currency)
            }}</span>
          </template>

          <template #[`item.total`]="{ item }: { item: InvoiceSummaryDto }">
            {{ money(item.total, item.currency) }}
            <div class="text-xs text-text-secondary">Tax {{ money(item.tax, item.currency) }}</div>
          </template>

          <template #[`item.dueAt`]="{ item }: { item: InvoiceSummaryDto }">
            <span :class="dueTone(item)">{{ date(item.dueAt) }}</span>
            <div class="text-xs text-text-secondary">
              Balance {{ money(item.balanceDue, item.currency) }}
            </div>
          </template>

          <template #[`item.status`]="{ item }: { item: InvoiceSummaryDto }">
            <DsStatusBadge :value="item.status" />
          </template>

          <template #[`item.actions`]="{ item }: { item: InvoiceSummaryDto }">
            <VBtn
              aria-label="Open invoice"
              color="primary"
              icon="mdi-arrow-right"
              size="small"
              :to="`/invoices/${item.id}`"
              variant="text"
            />
          </template>

          <template #no-data>
            <div class="py-8 text-center text-text-secondary">No invoices match these filters.</div>
          </template>
        </VDataTable>
      </VCard>
    </template>
  </VContainer>
</template>

<style scoped>
.invoice-search {
  flex: 1 1 320px;
  max-width: 480px;
}

.invoice-table :deep(table) {
  min-width: 1120px;
}

.invoice-card-values {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.invoice-card-values > div {
  display: grid;
  gap: 2px;
}

.invoice-card-values span {
  color: rgb(var(--v-theme-text-secondary));
}

@media (max-width: 599px) {
  .invoice-search {
    max-width: none;
  }
}
</style>
