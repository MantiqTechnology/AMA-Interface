<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type { RateCardDto } from '#shared/features/commercial/rates';
import type {
  CommercialContractPortfolioItemDto,
  ContractSubsidyActivityItemDto,
  ContractSubsidyHistoryItemDto,
  ContractSubsidyOverviewDto,
  ContractSubsidyRenewalItemDto,
  SubsidyAbsorptionLineDto,
  SubsidyProgramDto
} from '#shared/features/marketing/contracts-subsidies';
import ContractSourceDonut from '../../features/marketing/contracts-subsidies/ContractSourceDonut.vue';
import PortfolioMetricCard from '../../features/marketing/contracts-subsidies/PortfolioMetricCard.vue';
import RenewalsTable from '../../features/marketing/contracts-subsidies/RenewalsTable.vue';

type PageTab =
  | 'overview'
  | 'contracts'
  | 'subsidies'
  | 'absorption'
  | 'rates'
  | 'documents'
  | 'activity'
  | 'history';

type SelectOption = { title: string; value: string };

const route = useRoute();
const router = useRouter();
const tabs: Array<{ value: PageTab; label: string; icon: string }> = [
  { value: 'overview', label: 'Overview', icon: 'mdi-view-dashboard-outline' },
  { value: 'contracts', label: 'Contracts', icon: 'mdi-file-document-outline' },
  { value: 'subsidies', label: 'Subsidies', icon: 'mdi-hand-coin-outline' },
  { value: 'absorption', label: 'Absorption', icon: 'mdi-chart-donut' },
  { value: 'rates', label: 'Rates & Terms', icon: 'mdi-cash-multiple' },
  { value: 'documents', label: 'Documents', icon: 'mdi-file-outline' },
  { value: 'activity', label: 'Activity', icon: 'mdi-format-list-bulleted' },
  { value: 'history', label: 'History', icon: 'mdi-history' }
];

function dateInPapua() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jayapura',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

const today = dateInPapua();
const activeTab = ref<PageTab>(
  tabs.some((tab) => tab.value === route.query.tab) ? (route.query.tab as PageTab) : 'overview'
);
const dateFrom = ref(
  typeof route.query.from === 'string' ? route.query.from : shiftDate(today, -1)
);
const dateTo = ref(typeof route.query.to === 'string' ? route.query.to : today);
const draftFrom = ref(dateFrom.value);
const draftTo = ref(dateTo.value);
const dateError = ref('');
const dateMenu = ref(false);
const filterMenu = ref(false);
const renewalDialog = ref(false);
const pageReady = ref(false);
const renewalLoading = ref(false);
const renewalError = ref('');
const allRenewals = ref<ContractSubsidyRenewalItemDto[]>([]);
const search = ref(typeof route.query.search === 'string' ? route.query.search : '');
const debouncedSearch = ref(search.value);
const statusFilter = ref(typeof route.query.status === 'string' ? route.query.status : null);
const typeFilter = ref(typeof route.query.type === 'string' ? route.query.type : null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const contracts = ref<CommercialContractPortfolioItemDto[] | null>(null);
const subsidies = ref<SubsidyProgramDto[] | null>(null);
const absorption = ref<SubsidyAbsorptionLineDto[] | null>(null);
const rates = ref<RateCardDto[] | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const activity = ref<ContractSubsidyActivityItemDto[] | null>(null);
const history = ref<ContractSubsidyHistoryItemDto[] | null>(null);
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
const tabError = reactive<Record<PageTab, string | null>>({
  overview: null,
  contracts: null,
  subsidies: null,
  absorption: null,
  rates: null,
  documents: null,
  activity: null,
  history: null
});
const tabRequest = reactive<Record<PageTab, number>>({
  overview: 0,
  contracts: 0,
  subsidies: 0,
  absorption: 0,
  rates: 0,
  documents: 0,
  activity: 0,
  history: 0
});

const snapshotQuery = computed(() => ({ from: dateFrom.value, to: dateTo.value }));
const {
  data: overview,
  pending,
  error,
  refresh: refreshOverview
} = await useAsyncData(
  'contracts-subsidies-overview',
  () =>
    fetchApi<ContractSubsidyOverviewDto>('/api/marketing/contracts-subsidies/overview', {
      query: snapshotQuery.value
    }),
  { watch: [dateFrom, dateTo] }
);
const { data: recentActivity, refresh: refreshRecentActivity } = await useAsyncData(
  'contracts-subsidies-recent-activity',
  () =>
    fetchApi<ContractSubsidyActivityItemDto[]>('/api/marketing/contracts-subsidies/activity', {
      query: { ...snapshotQuery.value, limit: 4 }
    }),
  { watch: [dateFrom, dateTo] }
);

const overviewCards = computed(() => [
  {
    label: 'Active contracts',
    value: displayValue(overview.value?.activeContractCount),
    detail: `${displayValue(overview.value?.expiringContractCount)} expiring in 60 days`,
    icon: 'mdi-file-document-check-outline',
    color: '#0874de'
  },
  {
    label: 'Active subsidy programs',
    value: displayValue(overview.value?.activeSubsidyProgramCount),
    detail: `${formatPercent(overview.value?.absorptionPercent)} absorbed`,
    icon: 'mdi-hand-coin-outline',
    color: '#149f55'
  },
  {
    label: 'Allocated budget',
    value: money(overview.value?.allocatedBudgetMinor, overview.value?.currencyCode),
    detail: `Remaining ${money(overview.value?.remainingBudgetMinor, overview.value?.currencyCode)}`,
    icon: 'mdi-wallet-outline',
    color: '#7c3aed'
  },
  {
    label: 'Pending renewal review',
    value: displayValue(overview.value?.pendingRenewalCount),
    detail: `As of ${date(overview.value?.asOf)}`,
    icon: 'mdi-clock-alert-outline',
    color: '#ed6c02'
  }
]);
const portfolioRows = computed(() => [
  ['Active Contracts', displayValue(overview.value?.activeContractCount), 'mdi-file-check-outline'],
  ['Expiring in 60 Days', displayValue(overview.value?.expiringContractCount), 'mdi-timer-sand'],
  [
    'Pending Renewal Review',
    displayValue(overview.value?.pendingRenewalCount),
    'mdi-clock-alert-outline'
  ],
  [
    'Terminated Contracts',
    displayValue(overview.value?.terminatedContractCount),
    'mdi-file-remove-outline'
  ]
]);
const subsidyRows = computed(() => [
  ['Active Programs', displayValue(overview.value?.activeSubsidyProgramCount)],
  ['Allocated Budget', money(overview.value?.allocatedBudgetMinor, overview.value?.currencyCode)],
  ['Consumed Budget', money(overview.value?.consumedBudgetMinor, overview.value?.currencyCode)],
  ['Remaining Budget', money(overview.value?.remainingBudgetMinor, overview.value?.currencyCode)],
  ['Absorption', formatPercent(overview.value?.absorptionPercent)]
]);

const statusOptions = computed<SelectOption[]>(() => {
  if (activeTab.value === 'contracts') return options(['ACTIVE', 'DRAFT', 'EXPIRED', 'TERMINATED']);
  if (activeTab.value === 'subsidies') return options(['ACTIVE', 'DRAFT', 'ARCHIVED']);
  if (activeTab.value === 'absorption') return options(['RECOGNIZED', 'PENDING']);
  return [];
});
const typeOptions = computed<SelectOption[]>(() => {
  if (activeTab.value === 'contracts')
    return options(['CUSTOMER_CONTRACT', 'AGENT_CONTRACT', 'RATE_CONTRACT']);
  if (activeTab.value === 'subsidies') return options(['PASSENGER', 'CARGO', 'CHARTER']);
  if (activeTab.value === 'absorption') return options(['FINANCE_READ_MODEL']);
  if (activeTab.value === 'activity')
    return options(['CUSTOMER_CONTRACT', 'CONTRACT_SUBSIDY', 'FINANCE_READ_MODEL']);
  return [];
});
const activeFilterCount = computed(
  () => Number(Boolean(statusFilter.value)) + Number(Boolean(typeFilter.value))
);
const searchTabs = new Set<PageTab>(['overview', 'contracts', 'subsidies', 'rates']);
const searchSupported = computed(() => searchTabs.has(activeTab.value));
const formattedRange = computed(() => {
  const format = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  return `${format.format(new Date(`${dateFrom.value}T00:00:00`))} – ${format.format(new Date(`${dateTo.value}T00:00:00`))}`;
});
const visibleUpcomingRenewals = computed(() => {
  const needle = debouncedSearch.value.toLowerCase();
  if (!needle) return overview.value?.upcomingRenewals ?? [];
  return (overview.value?.upcomingRenewals ?? []).filter(
    (item) =>
      item.code.toLowerCase().includes(needle) ||
      item.name.toLowerCase().includes(needle) ||
      item.counterparty?.toLowerCase().includes(needle)
  );
});

watch(search, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => (debouncedSearch.value = value.trim()), 300);
});
onBeforeUnmount(() => clearTimeout(searchTimer));

watch(activeTab, () => {
  void loadTab(activeTab.value, true);
});
watch([debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo], () => {
  void loadTab(activeTab.value, true);
});
watch(
  [activeTab, dateFrom, dateTo, debouncedSearch, statusFilter, typeFilter],
  () => {
    void router.replace({
      query: {
        tab: activeTab.value === 'overview' ? undefined : activeTab.value,
        from: dateFrom.value,
        to: dateTo.value,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value || undefined,
        type: typeFilter.value || undefined
      }
    });
  },
  { flush: 'post' }
);
watch(
  () => route.query,
  (query) => {
    const nextTab = tabs.some((tab) => tab.value === query.tab)
      ? (query.tab as PageTab)
      : 'overview';
    activeTab.value = nextTab;
    dateFrom.value = typeof query.from === 'string' ? query.from : shiftDate(today, -1);
    dateTo.value = typeof query.to === 'string' ? query.to : today;
    draftFrom.value = dateFrom.value;
    draftTo.value = dateTo.value;
    search.value = typeof query.search === 'string' ? query.search : '';
    debouncedSearch.value = search.value;
    statusFilter.value = typeof query.status === 'string' ? query.status : null;
    typeFilter.value = typeof query.type === 'string' ? query.type : null;
  }
);
onMounted(() => {
  pageReady.value = true;
  void loadTab(activeTab.value);
});

function options(values: string[]): SelectOption[] {
  return values.map((value) => ({ title: formatEnumLabel(value), value }));
}
function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
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
function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}
function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${value}%`;
}
function statusColor(status: string | null | undefined) {
  if (status === 'ACTIVE' || status === 'RECOGNIZED') return 'success';
  if (status === 'REVIEW_REQUIRED' || status === 'DUE_SOON' || status === 'PENDING')
    return 'warning';
  if (status === 'EXPIRED' || status === 'ARCHIVED' || status === 'TERMINATED') return 'error';
  return 'default';
}
function activityIcon(type: string) {
  if (type.includes('ABSORPTION')) return { icon: 'mdi-hand-coin-outline', color: 'success' };
  if (type.includes('CONTRACT')) return { icon: 'mdi-file-document-outline', color: 'primary' };
  return { icon: 'mdi-history', color: 'deep-purple' };
}
function applyDateRange() {
  if (!draftFrom.value || !draftTo.value || draftFrom.value > draftTo.value) {
    dateError.value = 'Start date must be on or before end date.';
    return;
  }
  dateError.value = '';
  dateFrom.value = draftFrom.value;
  dateTo.value = draftTo.value;
  dateMenu.value = false;
}
function resetFilters() {
  statusFilter.value = null;
  typeFilter.value = null;
}
function selectTab(value: unknown) {
  if (!tabs.some((tab) => tab.value === value)) return;
  activeTab.value = value as PageTab;
  statusFilter.value = null;
  typeFilter.value = null;
  if (!searchSupported.value) {
    search.value = '';
    debouncedSearch.value = '';
  }
}
function tabQuery() {
  return {
    ...snapshotQuery.value,
    search: debouncedSearch.value || undefined,
    status: statusFilter.value || undefined,
    type: typeFilter.value || undefined
  };
}
async function loadTab(tab: PageTab, force = false) {
  if (tab === 'overview') return;
  if (!force) {
    const cached = {
      contracts: contracts.value,
      subsidies: subsidies.value,
      absorption: absorption.value,
      rates: rates.value,
      documents: documents.value,
      activity: activity.value,
      history: history.value
    }[tab];
    if (cached) return;
  }
  tabLoading[tab] = true;
  tabError[tab] = null;
  const request = ++tabRequest[tab];
  try {
    if (tab === 'contracts') {
      const value = await fetchApi<CommercialContractPortfolioItemDto[]>(
        '/api/marketing/contracts-subsidies/contracts',
        { query: tabQuery() }
      );
      if (request === tabRequest[tab]) contracts.value = value;
    } else if (tab === 'subsidies') {
      const value = await fetchApi<SubsidyProgramDto[]>(
        '/api/marketing/contracts-subsidies/subsidies',
        { query: tabQuery() }
      );
      if (request === tabRequest[tab]) subsidies.value = value;
    } else if (tab === 'absorption') {
      const value = await fetchApi<SubsidyAbsorptionLineDto[]>(
        '/api/marketing/contracts-subsidies/absorption',
        { query: tabQuery() }
      );
      if (request === tabRequest[tab]) absorption.value = value;
    } else if (tab === 'rates') {
      const value = await fetchApi<RateCardDto[]>('/api/master-data/rates', {
        query: { active: 'active', search: debouncedSearch.value || undefined }
      });
      if (request === tabRequest[tab]) rates.value = value;
    } else if (tab === 'documents') {
      const value = await fetchApi<MasterDocumentDto[]>(
        '/api/marketing/contracts-subsidies/documents'
      );
      if (request === tabRequest[tab]) documents.value = value;
    } else if (tab === 'activity') {
      const value = await fetchApi<ContractSubsidyActivityItemDto[]>(
        '/api/marketing/contracts-subsidies/activity',
        { query: tabQuery() }
      );
      if (request === tabRequest[tab]) activity.value = value;
    } else if (tab === 'history') {
      const value = await fetchApi<ContractSubsidyHistoryItemDto[]>(
        '/api/marketing/contracts-subsidies/history',
        { query: snapshotQuery.value }
      );
      if (request === tabRequest[tab]) history.value = value;
    }
  } catch {
    if (request === tabRequest[tab]) {
      tabError[tab] =
        `Unable to load ${tabs.find((item) => item.value === tab)?.label.toLowerCase() ?? 'this tab'}.`;
    }
  } finally {
    if (request === tabRequest[tab]) tabLoading[tab] = false;
  }
}
async function openRenewals() {
  renewalDialog.value = true;
  renewalLoading.value = true;
  renewalError.value = '';
  try {
    allRenewals.value = await fetchApi('/api/marketing/contracts-subsidies/renewals', {
      query: { ...snapshotQuery.value, search: debouncedSearch.value || undefined }
    });
  } catch {
    renewalError.value = 'Unable to load upcoming renewals.';
  } finally {
    renewalLoading.value = false;
  }
}
function selectRenewal(item: ContractSubsidyRenewalItemDto) {
  renewalDialog.value = false;
  search.value = item.code;
  debouncedSearch.value = item.code;
  activeTab.value = item.entityType === 'SUBSIDY' ? 'subsidies' : 'contracts';
}
async function retryOverview() {
  await Promise.all([refreshOverview(), refreshRecentActivity()]);
}
</script>

<template>
  <VContainer class="contracts-page px-3 px-md-6 py-5" :data-ready="pageReady" fluid>
    <VBtn class="mb-3 px-0" prepend-icon="mdi-arrow-left" to="/dashboard" variant="text">
      Dashboard
    </VBtn>

    <VCard class="contracts-hero" border flat>
      <div class="contracts-hero__accent" />
      <VCardText class="d-flex flex-wrap align-center ga-4 pa-5 pa-md-6">
        <div class="min-w-0">
          <div class="text-overline font-weight-bold text-primary">Contracts & Subsidies</div>
          <div class="d-flex align-center ga-2">
            <h1 class="contracts-hero__title">Contracts & Subsidies</h1>
            <VTooltip text="Commercial agreements, subsidy programs, and absorption monitoring.">
              <template #activator="{ props }">
                <VIcon v-bind="props" icon="mdi-information-outline" size="18" />
              </template>
            </VTooltip>
          </div>
          <p class="mt-1 mb-0 text-body-2 text-medium-emphasis">
            Commercial agreements, subsidy programs, and absorption monitoring.
          </p>
        </div>
        <VSpacer />
        <div class="d-flex flex-wrap ga-3">
          <VBtn
            prepend-icon="mdi-account-multiple-outline"
            to="/master-data/customers"
            variant="outlined"
          >
            Customer contracts
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-card-account-details-outline"
            to="/master-data/rates"
          >
            Rate cards
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <template v-if="pending">
      <VSkeletonLoader class="mt-4" type="card, card, heading, table" />
    </template>
    <VAlert v-else-if="error" class="mt-4" type="error" variant="tonal">
      <div class="font-weight-medium">Unable to load contracts and subsidies</div>
      <div>Commercial contract and subsidy data could not be retrieved.</div>
      <template #append><VBtn variant="text" @click="retryOverview">Retry</VBtn></template>
    </VAlert>

    <template v-else>
      <VRow class="mt-1">
        <VCol v-for="card in overviewCards" :key="card.label" cols="12" lg="3" sm="6">
          <PortfolioMetricCard v-bind="card" />
        </VCol>
      </VRow>

      <div class="contracts-toolbar mt-3">
        <VTextField
          v-if="searchSupported"
          v-model="search"
          aria-label="Search portfolio"
          autocomplete="off"
          clearable
          density="compact"
          hide-details
          name="portfolio-search"
          placeholder="Search portfolio…"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
        <div v-else />
        <div class="d-flex ga-2">
          <VMenu v-model="dateMenu" :close-on-content-click="false" location="bottom end">
            <template #activator="{ props }">
              <VBtn v-bind="props" prepend-icon="mdi-calendar-blank-outline" variant="outlined">
                {{
                  formattedRange
                }}
              </VBtn>
            </template>
            <VCard min-width="320">
              <VCardTitle class="text-subtitle-1">Snapshot range</VCardTitle>
              <VCardText>
                <VTextField
                  v-model="draftFrom"
                  density="compact"
                  label="Start date"
                  type="date"
                  variant="outlined"
                />
                <VTextField
                  v-model="draftTo"
                  density="compact"
                  hide-details
                  label="End / snapshot date"
                  type="date"
                  variant="outlined"
                />
                <div v-if="dateError" class="mt-2 text-caption text-error">{{ dateError }}</div>
              </VCardText>
              <VCardActions>
                <VSpacer /><VBtn variant="text" @click="dateMenu = false">Cancel</VBtn><VBtn color="primary" @click="applyDateRange">Apply</VBtn>
              </VCardActions>
            </VCard>
          </VMenu>
          <VMenu v-model="filterMenu" :close-on-content-click="false" location="bottom end">
            <template #activator="{ props }">
              <VBadge
                :content="activeFilterCount"
                :model-value="activeFilterCount > 0"
                color="primary"
              >
                <VBtn v-bind="props" prepend-icon="mdi-filter-outline" variant="outlined">
                  Filters
                </VBtn>
              </VBadge>
            </template>
            <VCard min-width="300">
              <VCardTitle class="text-subtitle-1">
                {{ tabs.find((tab) => tab.value === activeTab)?.label }} filters
              </VCardTitle>
              <VCardText v-if="statusOptions.length || typeOptions.length">
                <VSelect
                  v-if="statusOptions.length"
                  v-model="statusFilter"
                  clearable
                  density="compact"
                  hide-details
                  label="Status"
                  :items="statusOptions"
                  variant="outlined"
                />
                <VSelect
                  v-if="typeOptions.length"
                  v-model="typeFilter"
                  class="mt-3"
                  clearable
                  density="compact"
                  hide-details
                  label="Type"
                  :items="typeOptions"
                  variant="outlined"
                />
              </VCardText>
              <VCardText v-else class="text-body-2 text-medium-emphasis">
                No additional filters are available for this tab.
              </VCardText>
              <VCardActions>
                <VBtn :disabled="!activeFilterCount" variant="text" @click="resetFilters">
                  Reset
                </VBtn><VSpacer /><VBtn color="primary" variant="text" @click="filterMenu = false">
                  Done
                </VBtn>
              </VCardActions>
            </VCard>
          </VMenu>
        </div>
      </div>

      <VTabs
        :model-value="activeTab"
        class="contracts-tabs mt-3"
        show-arrows
        @update:model-value="selectTab"
      >
        <VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">
          <VIcon :icon="tab.icon" start />{{ tab.label }}
        </VTab>
      </VTabs>
      <VDivider />

      <VAlert v-if="tabError[activeTab]" class="mt-4" type="error" variant="tonal">
        {{ tabError[activeTab] }}
        <template #append>
          <VBtn variant="text" @click="loadTab(activeTab, true)">Retry</VBtn>
        </template>
      </VAlert>
      <VWindow v-else v-model="activeTab" class="mt-3">
        <VWindowItem value="overview">
          <VRow>
            <VCol cols="12" lg="4">
              <VCard class="overview-card h-100" border flat>
                <VCardTitle>Contract Portfolio</VCardTitle>
                <VCardText class="pt-0">
                  <div
                    v-for="[label, value, icon] in portfolioRows"
                    :key="label"
                    class="info-row d-flex align-center ga-3"
                  >
                    <div class="info-row__icon"><VIcon :icon="icon" size="18" /></div>
                    <div class="min-w-0 flex-grow-1">
                      <div class="text-caption text-medium-emphasis">{{ label }}</div>
                      <div class="font-weight-bold metric-value">{{ value }}</div>
                    </div>
                  </div>
                </VCardText>
                <div class="card-footer">
                  <VBtn
                    append-icon="mdi-arrow-right"
                    size="small"
                    variant="text"
                    @click="activeTab = 'contracts'"
                  >
                    View contracts
                  </VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard class="overview-card h-100" border flat>
                <VCardTitle>Subsidy Exposure</VCardTitle>
                <VCardText class="pt-0">
                  <div v-for="[label, value] in subsidyRows" :key="label" class="subsidy-row">
                    <span class="text-caption text-medium-emphasis">{{ label }}</span><strong class="metric-value">{{ value }}</strong>
                  </div>
                  <VProgressLinear
                    class="mt-2"
                    color="success"
                    height="4"
                    :model-value="overview?.absorptionPercent ?? 0"
                    rounded
                  />
                </VCardText>
                <div class="card-footer">
                  <VBtn
                    append-icon="mdi-arrow-right"
                    size="small"
                    variant="text"
                    @click="activeTab = 'absorption'"
                  >
                    View absorption
                  </VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4">
              <VCard class="overview-card h-100" border flat>
                <VCardTitle>Contract Source Mix</VCardTitle>
                <VCardText class="pt-0">
                  <ContractSourceDonut :items="overview?.contractSourceMix ?? []" />
                </VCardText>
                <div class="card-footer">
                  <VBtn
                    append-icon="mdi-arrow-right"
                    size="small"
                    variant="text"
                    @click="activeTab = 'rates'"
                  >
                    View rates & terms
                  </VBtn>
                </div>
              </VCard>
            </VCol>
          </VRow>

          <VRow class="mt-0">
            <VCol cols="12" lg="7">
              <VCard class="overview-card h-100" border flat>
                <div class="section-heading">
                  <VCardTitle class="text-subtitle-1">
                    <VIcon icon="mdi-calendar-clock-outline" size="17" start />Upcoming
                    Renewals
                  </VCardTitle><VBtn size="small" variant="text" @click="openRenewals">View all</VBtn>
                </div>
                <RenewalsTable :items="visibleUpcomingRenewals" @select="selectRenewal" />
                <div class="card-footer">
                  <VBtn
                    append-icon="mdi-chevron-right"
                    size="small"
                    variant="text"
                    @click="openRenewals"
                  >
                    View all renewals
                  </VBtn>
                </div>
              </VCard>
            </VCol>
            <VCol cols="12" lg="5">
              <VCard class="overview-card h-100" border flat>
                <div class="section-heading">
                  <VCardTitle class="text-subtitle-1">Recent Activity</VCardTitle><VBtn size="small" variant="text" @click="activeTab = 'activity'">View all</VBtn>
                </div>
                <VCardText class="py-0">
                  <div
                    v-if="!recentActivity?.length"
                    class="py-8 text-center text-body-2 text-medium-emphasis"
                  >
                    No activity in this date range.
                  </div>
                  <div v-for="item in recentActivity" :key="item.id" class="activity-row">
                    <div
                      class="activity-row__icon"
                      :class="`text-${activityIcon(item.activityType).color}`"
                    >
                      <VIcon :icon="activityIcon(item.activityType).icon" size="18" />
                    </div>
                    <div class="min-w-0 flex-grow-1">
                      <div class="text-body-2 font-weight-medium text-truncate">
                        {{ item.title }}
                      </div>
                      <div class="text-caption text-medium-emphasis text-truncate">
                        {{ displayValue(item.description) }}
                      </div>
                    </div>
                    <time class="text-caption text-medium-emphasis">{{
                      dateTime(item.occurredAt)
                    }}</time>
                  </div>
                </VCardText>
                <div class="card-footer">
                  <VBtn
                    append-icon="mdi-chevron-right"
                    size="small"
                    variant="text"
                    @click="activeTab = 'activity'"
                  >
                    View all activity
                  </VBtn>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="contracts">
          <VSkeletonLoader v-if="tabLoading.contracts" type="table" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!contracts?.length" variant="tonal">
                No contracts match the current snapshot and filters.
              </VAlert>
              <div v-else class="table-scroll">
                <VTable hover>
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
                      <td>{{ date(item.effectiveFrom) }} – {{ date(item.effectiveUntil) }}</td>
                      <td>
                        <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                          {{
                            formatEnumLabel(item.status)
                          }}
                        </VChip>
                      </td>
                      <td>{{ displayValue(item.linkedRateCode) }}</td>
                      <td>{{ displayValue(item.subsidyProgramCode) }}</td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="subsidies">
          <VSkeletonLoader v-if="tabLoading.subsidies" type="table" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!subsidies?.length" variant="tonal">
                No subsidy programs match the current snapshot and filters.
              </VAlert>
              <div v-else class="table-scroll">
                <VTable hover>
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
                        {{ formatEnumLabel(item.serviceScope) }} ·
                        {{ displayValue(item.routeScope) }}
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
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="absorption">
          <VSkeletonLoader v-if="tabLoading.absorption" type="table" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert class="mb-4" type="info" variant="tonal">
                Absorption is read-only here. Posted invoices, payments, and journals remain in
                Finance.
              </VAlert><VAlert v-if="!absorption?.length" variant="tonal">
                No absorption activity in this date range.
              </VAlert>
              <div v-else class="table-scroll">
                <VTable hover>
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
                      <td>
                        <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                          {{
                            formatEnumLabel(item.status)
                          }}
                        </VChip>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="rates">
          <VSkeletonLoader v-if="tabLoading.rates" type="table" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!rates?.length" variant="tonal">No active rate cards found.</VAlert>
              <div v-else class="table-scroll">
                <VTable hover>
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
                        <VBtn :to="`/master-data/rates/${item.id}`" size="small" variant="text">
                          Open
                        </VBtn>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="documents">
          <VSkeletonLoader v-if="tabLoading.documents" type="table" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!documents?.length" variant="tonal">No documents available.</VAlert>
              <div v-else class="table-scroll">
                <VTable hover>
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
              </div>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="activity">
          <VSkeletonLoader v-if="tabLoading.activity" type="list-item-three-line" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!activity?.length" variant="tonal">
                No contract or subsidy activity in this date range.
              </VAlert><VTimeline v-else density="compact" side="end">
                <VTimelineItem
                  v-for="item in activity"
                  :key="item.id"
                  :dot-color="activityIcon(item.activityType).color"
                  size="small"
                >
                  <div class="font-weight-medium">{{ item.title }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ formatEnumLabel(item.activityType) }} · {{ dateTime(item.occurredAt) }}
                  </div>
                  <div class="text-body-2 wrap-value">
                    {{ displayValue(item.description) }}
                  </div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="history">
          <VSkeletonLoader v-if="tabLoading.history" type="list-item-three-line" />
          <VCard v-else class="data-card" border flat>
            <VCardText>
              <VAlert v-if="!history?.length" variant="tonal">
                No audit history in this date range.
              </VAlert><VTimeline v-else density="compact" side="end">
                <VTimelineItem
                  v-for="item in history"
                  :key="item.id"
                  dot-color="primary"
                  size="small"
                >
                  <div class="font-weight-medium">{{ formatEnumLabel(item.action) }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ dateTime(item.occurredAt) }} · {{ item.actorName ?? 'System' }}
                  </div>
                  <div class="text-body-2">
                    {{ item.changedFields.join(', ') || '—' }}
                  </div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>
    </template>

    <VDialog v-model="renewalDialog" max-width="1100" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center">
          <span>Upcoming renewals</span><VSpacer /><VBtn
            aria-label="Close renewals"
            icon="mdi-close"
            variant="text"
            @click="renewalDialog = false"
          />
        </VCardTitle><VDivider /><VCardText class="pa-0">
          <VSkeletonLoader v-if="renewalLoading" type="table" /><VAlert
            v-else-if="renewalError"
            class="ma-4"
            type="error"
            variant="tonal"
          >
            {{ renewalError
            }}<template #append>
              <VBtn variant="text" @click="openRenewals">Retry</VBtn>
            </template>
          </VAlert><RenewalsTable v-else :items="allRenewals" @select="selectRenewal" />
        </VCardText>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.contracts-page {
  max-width: 1500px;
}
.contracts-hero {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgb(15 23 42 / 3%);
}
.contracts-hero__accent {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  background: rgb(var(--v-theme-primary));
}
.contracts-hero__title {
  font-size: clamp(1.45rem, 2vw, 1.8rem);
  line-height: 1.2;
  letter-spacing: -0.025em;
}
.contracts-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.contracts-toolbar :deep(.v-text-field) {
  width: min(100%, 360px);
}
.contracts-tabs :deep(.v-tab) {
  min-width: max-content;
  text-transform: none;
  font-size: 13px;
  letter-spacing: 0;
}
.overview-card,
.data-card {
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 3%);
}
.overview-card {
  display: flex;
  min-height: 100%;
  flex-direction: column;
}
.overview-card > :deep(.v-card-title) {
  padding: 17px 20px;
  font-size: 1rem;
  font-weight: 700;
}
.info-row {
  min-height: 55px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.55);
}
.info-row:last-child {
  border-bottom: 0;
}
.info-row__icon,
.activity-row__icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 7px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
}
.subsidy-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-block: 7px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.55);
}
.subsidy-row:last-of-type {
  border-bottom: 0;
}
.card-footer {
  margin-top: auto;
  padding: 8px 12px;
  border-top: 1px solid rgba(var(--v-border-color), 0.65);
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-inline-end: 12px;
}
.activity-row {
  display: flex;
  min-height: 60px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.55);
}
.activity-row:last-child {
  border-bottom: 0;
}
.activity-row time {
  flex: 0 0 auto;
  white-space: nowrap;
}
.metric-value,
.wrap-value {
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.table-scroll {
  overflow-x: auto;
}
.table-scroll :deep(table) {
  min-width: 760px;
}
.data-card :deep(th) {
  white-space: nowrap;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}
@media (max-width: 760px) {
  .contracts-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .contracts-toolbar :deep(.v-text-field) {
    width: 100%;
  }
  .contracts-toolbar > div {
    overflow-x: auto;
  }
  .contracts-toolbar .v-btn {
    flex: 0 0 auto;
  }
  .activity-row {
    align-items: flex-start;
    padding-block: 12px;
  }
  .activity-row time {
    display: none;
  }
}
</style>
