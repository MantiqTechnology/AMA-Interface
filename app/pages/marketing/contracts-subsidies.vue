<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type {
  CommercialContractPortfolioItemDto,
  ContractSubsidyActivityItemDto,
  ContractSubsidyHistoryItemDto,
  ContractSubsidyOverviewDto,
  SubsidyAbsorptionLineDto,
  SubsidyProgramDto
} from '#shared/features/marketing/contracts-subsidies';
import type { RateCardDto } from '#shared/features/commercial/rates';

type PageTab =
  | 'overview'
  | 'contracts'
  | 'subsidies'
  | 'absorption'
  | 'rates'
  | 'documents'
  | 'activity'
  | 'history';

const route = useRoute();
const router = useRouter();
const tabs: Array<{ value: PageTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'subsidies', label: 'Subsidies' },
  { value: 'absorption', label: 'Absorption' },
  { value: 'rates', label: 'Rates & Terms' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
  { value: 'history', label: 'History' }
];
const activeTab = ref<PageTab>(
  tabs.some((tab) => tab.value === route.query.tab) ? (route.query.tab as PageTab) : 'overview'
);
const search = ref('');
const tabLoading = reactive<Record<PageTab, boolean>>({
  overview: false,
  contracts: false,
  subsidies: false,
  absorption: false,
  rates: false,
  documents: false,
  activity: false,
  history: false
});

const {
  data: overview,
  pending,
  error,
  refresh
} = await useAsyncData('contracts-subsidies-overview', () =>
  fetchApi<ContractSubsidyOverviewDto>('/api/marketing/contracts-subsidies/overview')
);
const contracts = ref<CommercialContractPortfolioItemDto[] | null>(null);
const subsidies = ref<SubsidyProgramDto[] | null>(null);
const absorption = ref<SubsidyAbsorptionLineDto[] | null>(null);
const rates = ref<RateCardDto[] | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const activity = ref<ContractSubsidyActivityItemDto[] | null>(null);
const history = ref<ContractSubsidyHistoryItemDto[] | null>(null);

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = tabs.some((tab) => tab.value === value) ? (value as PageTab) : 'overview';
  }
);
watch(activeTab, async (value) => {
  await router.replace({
    query: { ...route.query, tab: value === 'overview' ? undefined : value }
  });
  await loadTab(value);
});
watch(search, async () => {
  if (activeTab.value === 'contracts') contracts.value = null;
  if (activeTab.value === 'subsidies') subsidies.value = null;
  await loadTab(activeTab.value);
});
onMounted(() => loadTab(activeTab.value));

const overviewCards = computed(() => {
  const item = overview.value;
  return [
    {
      label: 'Active contracts',
      value: displayValue(item?.activeContractCount),
      detail: `${displayValue(item?.expiringContractCount)} expiring in 60 days`
    },
    {
      label: 'Active subsidy programs',
      value: displayValue(item?.activeSubsidyProgramCount),
      detail: `${formatPercent(item?.absorptionPercent)} absorbed`
    },
    {
      label: 'Allocated budget',
      value: money(item?.allocatedBudgetMinor, item?.currencyCode),
      detail: `Remaining ${money(item?.remainingBudgetMinor, item?.currencyCode)}`
    },
    {
      label: 'Pending renewal review',
      value: displayValue(item?.pendingRenewalCount),
      detail: `As of ${date(item?.asOf)}`
    }
  ];
});
const portfolioRows = computed(() => [
  ['Active Contracts', displayValue(overview.value?.activeContractCount)],
  ['Expiring in 60 Days', displayValue(overview.value?.expiringContractCount)],
  ['Pending Renewal Review', displayValue(overview.value?.pendingRenewalCount)]
]);
const subsidyRows = computed(() => [
  ['Active Programs', displayValue(overview.value?.activeSubsidyProgramCount)],
  ['Allocated Budget', money(overview.value?.allocatedBudgetMinor, overview.value?.currencyCode)],
  ['Consumed Budget', money(overview.value?.consumedBudgetMinor, overview.value?.currencyCode)],
  ['Remaining Budget', money(overview.value?.remainingBudgetMinor, overview.value?.currencyCode)],
  ['Absorption', formatPercent(overview.value?.absorptionPercent)]
]);
const coverageRows = computed(() => [
  ['Primary Contract Source', 'Customer contracts'],
  ['Rate Source', 'Fare & rate cards'],
  ['Absorption Source', 'Subsidy consumption read model'],
  ['Accounting Boundary', 'Finance remains source of truth for invoices and payments']
]);

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
function formatEnumLabel(value: string | null | undefined) {
  if (!value) return '—';
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
function money(value: string | number | null | undefined, currency = 'IDR') {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency ?? 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value));
}
function date(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}
function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${value}%`;
}
function statusColor(status: string | null | undefined) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REVIEW_REQUIRED') return 'warning';
  if (status === 'EXPIRED' || status === 'ARCHIVED') return 'error';
  return 'default';
}
async function loadTab(tab: PageTab) {
  if (tab === 'overview') return;
  if (tab === 'contracts' && contracts.value) return;
  if (tab === 'subsidies' && subsidies.value) return;
  if (tab === 'absorption' && absorption.value) return;
  if (tab === 'rates' && rates.value) return;
  if (tab === 'documents' && documents.value) return;
  if (tab === 'activity' && activity.value) return;
  if (tab === 'history' && history.value) return;
  tabLoading[tab] = true;
  try {
    if (tab === 'contracts') {
      contracts.value = await fetchApi<CommercialContractPortfolioItemDto[]>(
        '/api/marketing/contracts-subsidies/contracts',
        { query: { search: search.value } }
      );
    } else if (tab === 'subsidies') {
      subsidies.value = await fetchApi<SubsidyProgramDto[]>(
        '/api/marketing/contracts-subsidies/subsidies',
        { query: { search: search.value } }
      );
    } else if (tab === 'absorption') {
      absorption.value = await fetchApi<SubsidyAbsorptionLineDto[]>(
        '/api/marketing/contracts-subsidies/absorption'
      );
    } else if (tab === 'rates') {
      rates.value = await fetchApi<RateCardDto[]>('/api/master-data/rates', {
        query: { active: 'active', search: search.value }
      });
    } else if (tab === 'documents') {
      documents.value = await fetchApi<MasterDocumentDto[]>(
        '/api/marketing/contracts-subsidies/documents'
      );
    } else if (tab === 'activity') {
      activity.value = await fetchApi<ContractSubsidyActivityItemDto[]>(
        '/api/marketing/contracts-subsidies/activity'
      );
    } else if (tab === 'history') {
      history.value = await fetchApi<ContractSubsidyHistoryItemDto[]>(
        '/api/marketing/contracts-subsidies/history'
      );
    }
  } finally {
    tabLoading[tab] = false;
  }
}
</script>

<template>
  <VContainer class="contracts-page px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/dashboard" variant="text">Dashboard</VBtn>

    <div class="my-5 d-flex flex-wrap align-start ga-4">
      <div class="min-w-0">
        <h1 class="text-h4 font-weight-bold">Contracts & Subsidies</h1>
        <p class="mt-1 mb-0 text-body-2 text-medium-emphasis">
          Commercial agreements, subsidy programs, and absorption monitoring.
        </p>
      </div>
      <VSpacer />
      <VBtn prepend-icon="mdi-file-sign" to="/master-data/customers" variant="outlined">
        Customer contracts
      </VBtn>
      <VBtn color="primary" prepend-icon="mdi-cash-multiple" to="/master-data/rates">
        Rate cards
      </VBtn>
    </div>

    <template v-if="pending">
      <VSkeletonLoader type="heading, paragraph, card, table" />
    </template>

    <VAlert v-else-if="error" type="error" variant="tonal">
      <div class="font-weight-medium">Unable to load contracts and subsidies</div>
      <div>Commercial contract and subsidy data could not be retrieved.</div>
      <template #append>
        <VBtn variant="text" @click="refresh">Retry</VBtn>
      </template>
    </VAlert>

    <template v-else>
      <VRow>
        <VCol v-for="card in overviewCards" :key="card.label" cols="12" lg="3" sm="6">
          <VCard border flat>
            <VCardText>
              <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
              <div class="mt-1 text-h6 font-weight-bold metric-value">{{ card.value }}</div>
              <div class="mt-1 text-body-2 text-medium-emphasis">{{ card.detail }}</div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <div class="mt-4 d-flex flex-wrap align-center ga-3">
        <VTextField
          v-model="search"
          clearable
          density="comfortable"
          hide-details
          label="Search portfolio"
          max-width="360"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </div>

      <VTabs v-model="activeTab" class="mt-4" show-arrows>
        <VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</VTab>
      </VTabs>
      <VDivider />

      <VWindow v-model="activeTab" class="mt-4">
        <VWindowItem value="overview">
          <VRow>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Contract Portfolio</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in portfolioRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                  <VBtn class="mt-2" size="small" variant="text" @click="activeTab = 'contracts'">
                    View contracts
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Subsidy Exposure</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in subsidyRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                  <VBtn class="mt-2" size="small" variant="text" @click="activeTab = 'absorption'">
                    View absorption
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Operational Coverage</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in coverageRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                  <VBtn class="mt-2" size="small" variant="text" @click="activeTab = 'rates'">
                    View rates & terms
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="contracts">
          <VSkeletonLoader v-if="tabLoading.contracts" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!contracts?.length" variant="tonal">No contracts linked.</VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Contract Number</th>
                    <th>Partner</th>
                    <th>Type</th>
                    <th>Effective</th>
                    <th>Status</th>
                    <th>Rate</th>
                    <th>Subsidy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in contracts" :key="item.sourceType + item.id">
                    <td class="font-weight-medium">{{ item.contractNumber }}</td>
                    <td>{{ displayValue(item.partnerName) }}</td>
                    <td>{{ formatEnumLabel(item.contractType) }}</td>
                    <td>{{ date(item.effectiveFrom) }} - {{ date(item.effectiveUntil) }}</td>
                    <td>
                      <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                        {{ formatEnumLabel(item.status) }}
                      </VChip>
                    </td>
                    <td>{{ displayValue(item.linkedRateCode) }}</td>
                    <td>{{ displayValue(item.subsidyProgramCode) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="subsidies">
          <VSkeletonLoader v-if="tabLoading.subsidies" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!subsidies?.length" variant="tonal">
                No subsidy programs configured.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Sponsor</th>
                    <th>Scope</th>
                    <th>Budget</th>
                    <th>Consumed</th>
                    <th>Remaining</th>
                    <th>Absorption</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in subsidies" :key="item.id">
                    <td>
                      <div class="font-weight-medium">{{ item.programCode }}</div>
                      <div class="text-caption text-medium-emphasis">{{ item.programName }}</div>
                    </td>
                    <td>{{ item.sponsorName }}</td>
                    <td>
                      {{ formatEnumLabel(item.serviceScope) }} · {{ displayValue(item.routeScope) }}
                    </td>
                    <td>{{ money(item.allocatedBudgetMinor, item.currencyCode) }}</td>
                    <td>{{ money(item.consumedBudgetMinor, item.currencyCode) }}</td>
                    <td>{{ money(item.remainingBudgetMinor, item.currencyCode) }}</td>
                    <td>{{ formatPercent(item.absorptionPercent) }}</td>
                    <td>
                      <VChip
                        :color="statusColor(item.lifecycleStatus)"
                        size="small"
                        variant="tonal"
                      >
                        {{ formatEnumLabel(item.lifecycleStatus) }}
                      </VChip>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="absorption">
          <VSkeletonLoader v-if="tabLoading.absorption" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert class="mb-4" type="info" variant="tonal">
                Absorption is read-only here. Posted invoices, payments, and journals remain in
                Finance.
              </VAlert>
              <VAlert v-if="!absorption?.length" variant="tonal">
                No absorption activity recorded.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Source</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Consumed At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in absorption" :key="item.id">
                    <td>{{ item.programCode }}</td>
                    <td>{{ formatEnumLabel(item.sourceType) }}</td>
                    <td class="wrap-value">{{ item.description }}</td>
                    <td>{{ money(item.amountMinor) }}</td>
                    <td>{{ date(item.consumedAt) }}</td>
                    <td>{{ formatEnumLabel(item.status) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="rates">
          <VSkeletonLoader v-if="tabLoading.rates" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!rates?.length" variant="tonal">No active rate cards found.</VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Rate Code</th>
                    <th>Service</th>
                    <th>Scope</th>
                    <th>Channel</th>
                    <th>Priority</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in rates" :key="item.id">
                    <td class="font-weight-medium">{{ item.rateCode }}</td>
                    <td>{{ formatEnumLabel(item.serviceType) }}</td>
                    <td>{{ formatEnumLabel(item.pricingScope) }}</td>
                    <td>{{ formatEnumLabel(item.bookingChannel) }}</td>
                    <td>{{ item.ratePriority }}</td>
                    <td class="text-right">
                      <VBtn :to="'/master-data/rates/' + item.id" size="small" variant="text">
                        Open
                      </VBtn>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="documents">
          <VSkeletonLoader v-if="tabLoading.documents" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!documents?.length" variant="tonal">No documents available.</VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Uploaded By</th>
                    <th>Uploaded At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in documents" :key="item.id">
                    <td>{{ item.title }}</td>
                    <td>{{ formatEnumLabel(item.documentType) }}</td>
                    <td>{{ item.uploadedBy }}</td>
                    <td>{{ date(item.uploadedAt) }}</td>
                    <td>{{ formatEnumLabel(item.lifecycleStatus) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="activity">
          <VSkeletonLoader v-if="tabLoading.activity" type="list-item-three-line" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!activity?.length" variant="tonal">
                No contract or subsidy activity found.
              </VAlert>
              <VTimeline v-else density="compact" side="end">
                <VTimelineItem
                  v-for="item in activity"
                  :key="item.id"
                  dot-color="primary"
                  size="small"
                >
                  <div class="font-weight-medium">{{ item.title }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ formatEnumLabel(item.activityType) }} · {{ date(item.occurredAt) }}
                  </div>
                  <div class="text-body-2 wrap-value">{{ displayValue(item.description) }}</div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="history">
          <VSkeletonLoader v-if="tabLoading.history" type="list-item-three-line" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!history?.length" variant="tonal">No audit history available.</VAlert>
              <VTimeline v-else density="compact" side="end">
                <VTimelineItem
                  v-for="item in history"
                  :key="item.id"
                  dot-color="primary"
                  size="small"
                >
                  <div class="font-weight-medium">{{ formatEnumLabel(item.action) }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ date(item.occurredAt) }} · {{ item.actorName ?? 'System' }}
                  </div>
                  <div class="text-body-2">{{ item.changedFields.join(', ') || '—' }}</div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>
    </template>
  </VContainer>
</template>

<style scoped>
.contracts-page {
  max-width: 1440px;
}
.metric-value,
.wrap-value {
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.info-row {
  padding-block: 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.info-row:last-child {
  border-bottom: 0;
}
</style>
