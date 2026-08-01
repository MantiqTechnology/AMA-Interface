<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type {
  CommercialRateDetailDto,
  RateBookingChannelDto,
  RateCardDto,
  RateContractDto,
  RateCoverageDto,
  RateHistoryItemDto,
  RateUsageSummaryDto
} from '#shared/features/commercial/rates';
import RateCardFormDialog from './RateCardFormDialog.vue';

type RateTab =
  'overview' | 'pricing' | 'contracts' | 'channels' | 'coverage' | 'documents' | 'history';

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const rateId = computed(() => String(route.params.id));
const tabs: Array<{ value: RateTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'pricing', label: 'Pricing & Charges' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'channels', label: 'Booking Channels' },
  { value: 'coverage', label: 'Route & Coverage' },
  { value: 'documents', label: 'Documents' },
  { value: 'history', label: 'History' }
];
const activeTab = ref<RateTab>(
  tabs.some((tab) => tab.value === route.query.tab) ? (route.query.tab as RateTab) : 'overview'
);

const {
  data: rate,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => 'rate-detail-' + rateId.value,
  () => fetchApi<CommercialRateDetailDto>('/api/master-data/rates/' + rateId.value),
  { watch: [rateId] }
);

const tabLoading = reactive<Record<RateTab, boolean>>({
  overview: false,
  pricing: false,
  contracts: false,
  channels: false,
  coverage: false,
  documents: false,
  history: false
});
const contracts = ref<RateContractDto[] | null>(null);
const channels = ref<RateBookingChannelDto[] | null>(null);
const coverage = ref<RateCoverageDto | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const history = ref<RateHistoryItemDto[] | null>(null);
const usage = ref<RateUsageSummaryDto | null>(null);
const editDialog = ref(false);
const duplicateDialog = ref(false);
const duplicateCode = ref('');
const submitting = ref(false);

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = tabs.some((tab) => tab.value === value) ? (value as RateTab) : 'overview';
  }
);
watch(activeTab, async (value) => {
  await router.replace({
    query: { ...route.query, tab: value === 'overview' ? undefined : value }
  });
  await loadTab(value);
});
onMounted(() => loadTab(activeTab.value));

const mayManage = computed(() => can('rate.manage').allowed);
const mayActivate = computed(() => can('rate.activate').allowed);
const mayArchive = computed(() => can('rate.archive').allowed);
const mayDuplicate = computed(() => can('rate.duplicate').allowed);
const statusColor = computed(() => statusTone(rate.value?.lifecycleStatus));
const subtitle = computed(() => {
  const record = rate.value;
  if (!record) return '—';
  const routeLabel =
    record.origin && record.destination
      ? `${record.origin.stationCode} -> ${record.destination.stationCode}`
      : 'Coverage not restricted';
  return `${formatEnumLabel(record.serviceType)} · ${routeLabel}`;
});
const editRecord = computed<RateCardDto | null>(() => rate.value ?? null);

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
function money(
  value: string | number | null | undefined,
  currencyCode = rate.value?.currency.code ?? 'IDR'
) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
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
function stationLabel(station: CommercialRateDetailDto['origin']) {
  return station ? `${station.stationCode} · ${station.stationName}` : '—';
}
function customerLabel(record: CommercialRateDetailDto | null | undefined) {
  return record?.customer ? `${record.customer.accountCode} · ${record.customer.accountName}` : '—';
}
function currencyLabel(record: CommercialRateDetailDto | null | undefined) {
  return record ? `${record.currency.code} · ${record.currency.name}` : '—';
}
function taxLabel(record: CommercialRateDetailDto | null | undefined) {
  return record?.taxRule ? `${record.taxRule.code} · ${record.taxRule.name}` : '—';
}
function statusTone(status: string | null | undefined) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'DRAFT') return 'info';
  if (status === 'ARCHIVED') return 'warning';
  return 'default';
}
function summaryRows(record: CommercialRateDetailDto | null | undefined) {
  if (!record) return [[], [], []] as Array<Array<[string, string]>>;
  return [
    [
      ['Rate Code', record.rateCode],
      ['Origin', stationLabel(record.origin)],
      ['Customer', customerLabel(record)],
      ['Currency', currencyLabel(record)],
      ['Base Rate', money(record.baseRate, record.currency.code)],
      ['Pricing Scope', formatEnumLabel(record.pricingScope)],
      ['Passenger Type', formatEnumLabel(record.passengerType)]
    ],
    [
      ['Service Type', formatEnumLabel(record.serviceType)],
      ['Destination', stationLabel(record.destination)],
      ['Aircraft Type', record.aircraftTypeSummary?.typeName ?? record.aircraftType ?? '—'],
      ['Tax', taxLabel(record)],
      ['Rate Unit', formatEnumLabel(record.rateUnit)],
      ['Booking Channel', formatEnumLabel(record.bookingChannel)],
      ['Cargo Price Basis', formatEnumLabel(record.cargoPriceBasis)]
    ],
    [
      ['Minimum Charge', money(record.minimumCharge, record.currency.code)],
      ['Rate Priority', displayValue(record.ratePriority)],
      ['Usage Note', displayValue(record.publicNote ?? record.demoUsageNote)],
      ['Effective From', date(record.effectiveFrom)],
      ['Effective To', date(record.effectiveTo)],
      ['Status', formatEnumLabel(record.lifecycleStatus)],
      ['Version', `v${record.version}`],
      ['Created At', date(record.createdAt)],
      ['Last Updated', date(record.updatedAt)]
    ]
  ];
}
const pricingRows = computed(() => [
  ['Base Rate', money(rate.value?.baseRate, rate.value?.currency.code)],
  ['Rate Unit', formatEnumLabel(rate.value?.rateUnit)],
  ['Price Basis', formatEnumLabel(rate.value?.cargoPriceBasis ?? rate.value?.passengerType)],
  ['Minimum Charge', money(rate.value?.minimumCharge, rate.value?.currency.code)],
  ['Tax', taxLabel(rate.value)],
  ['Currency', currencyLabel(rate.value)],
  ['Rate Priority', displayValue(rate.value?.ratePriority)],
  ['Pricing Scope', formatEnumLabel(rate.value?.pricingScope)]
]);
const routeRows = computed(() => [
  ['Origin', stationLabel(rate.value?.origin ?? null)],
  ['Destination', stationLabel(rate.value?.destination ?? null)],
  ['Route', routeDisplay(rate.value)],
  ['Service Type', formatEnumLabel(rate.value?.serviceType)],
  ['Aircraft Type', rate.value?.aircraftTypeSummary?.typeName ?? rate.value?.aircraftType ?? '—'],
  ['Effective Period', `${date(rate.value?.effectiveFrom)} - ${date(rate.value?.effectiveTo)}`]
]);
const quickRows = computed(() => {
  const summary = usage.value ?? rate.value?.quickSummary;
  return [
    ['Active Contracts', displayValue(summary?.activeContractCount)],
    ['Booking Channels', displayValue(summary?.linkedBookingChannelCount)],
    ['Total Usage', displayValue(summary?.appliedTransactionCount)],
    ['Last Applied', date(summary?.lastAppliedAt)],
    ['Last Updated', date(rate.value?.updatedAt)],
    ['As Of', date(summary?.asOf)]
  ];
});

function routeDisplay(record: CommercialRateDetailDto | null | undefined) {
  if (record?.route) return `${record.route.routeCode} · ${record.route.displayName}`;
  if (record?.origin && record.destination)
    return `${record.origin.stationCode} -> ${record.destination.stationCode}`;
  return 'All applicable routes';
}
async function loadTab(tab: RateTab) {
  if (tab === 'overview') return;
  if (tab === 'contracts' && contracts.value) return;
  if (tab === 'channels' && channels.value) return;
  if (tab === 'coverage' && coverage.value) return;
  if (tab === 'documents' && documents.value) return;
  if (tab === 'history' && history.value) return;
  if (tab === 'pricing' && usage.value) return;
  tabLoading[tab] = true;
  try {
    if (tab === 'contracts') {
      contracts.value = await fetchApi<RateContractDto[]>(
        `/api/master-data/rates/${rateId.value}/contracts`
      );
    } else if (tab === 'channels') {
      channels.value = await fetchApi<RateBookingChannelDto[]>(
        `/api/master-data/rates/${rateId.value}/booking-channels`
      );
    } else if (tab === 'coverage') {
      coverage.value = await fetchApi<RateCoverageDto>(
        `/api/master-data/rates/${rateId.value}/coverage`
      );
    } else if (tab === 'documents') {
      documents.value = await fetchApi<MasterDocumentDto[]>(
        `/api/master-data/rates/${rateId.value}/documents`
      );
    } else if (tab === 'history') {
      history.value = await fetchApi<RateHistoryItemDto[]>(
        `/api/master-data/rates/${rateId.value}/history`
      );
    } else if (tab === 'pricing') {
      usage.value = await fetchApi<RateUsageSummaryDto>(
        `/api/master-data/rates/${rateId.value}/usage-summary`
      );
    }
  } finally {
    tabLoading[tab] = false;
  }
}
async function lifecycle(action: 'activate' | 'deactivate' | 'archive') {
  submitting.value = true;
  try {
    await fetchApi(`/api/master-data/rates/${rateId.value}/${action}`, { method: 'POST' });
    await refresh();
    history.value = null;
  } finally {
    submitting.value = false;
  }
}
async function duplicate() {
  if (!duplicateCode.value.trim()) return;
  submitting.value = true;
  try {
    const created = await fetchApi<RateCardDto>(
      `/api/master-data/rates/${rateId.value}/duplicate`,
      {
        method: 'POST',
        body: { rateCode: duplicateCode.value }
      }
    );
    duplicateDialog.value = false;
    await router.push('/master-data/rates/' + created.id);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VContainer class="rate-detail px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/rates" variant="text">
      Fare & Rate Cards
    </VBtn>

    <template v-if="pending">
      <VSkeletonLoader class="mt-4" type="heading, paragraph, card, table" />
    </template>

    <VAlert v-else-if="error" class="mt-4" type="error" variant="tonal">
      <div class="font-weight-medium">Unable to load rate</div>
      <div>Fare and rate card data could not be retrieved.</div>
      <template #append>
        <VBtn variant="text" @click="refresh">Retry</VBtn>
        <VBtn to="/master-data/rates" variant="text">Back to Fare & Rate Cards</VBtn>
      </template>
    </VAlert>

    <VAlert v-else-if="!rate" class="mt-4" type="warning" variant="tonal">
      <div class="font-weight-medium">Rate not found</div>
      <div>The requested fare or rate card may have been removed or is no longer available.</div>
      <template #append>
        <VBtn to="/master-data/rates" variant="text">Back to Fare & Rate Cards</VBtn>
      </template>
    </VAlert>

    <template v-else>
      <div class="my-5 d-flex flex-wrap align-start ga-4">
        <div class="min-w-0">
          <div class="d-flex flex-wrap align-center ga-3">
            <h1 class="text-h4 font-weight-bold text-truncate">{{ rate.rateCode }}</h1>
            <VChip :color="statusColor" size="small" variant="tonal">
              {{ formatEnumLabel(rate.lifecycleStatus) }}
            </VChip>
          </div>
          <p class="mt-1 mb-0 text-body-2 text-medium-emphasis">{{ subtitle }}</p>
        </div>
        <VSpacer />
        <VBtn
          v-if="mayManage"
          prepend-icon="mdi-pencil-outline"
          variant="outlined"
          @click="editDialog = true"
        >
          Edit
        </VBtn>
        <VMenu>
          <template #activator="{ props }">
            <VBtn
              v-bind="props"
              aria-label="More rate actions"
              icon="mdi-dots-vertical"
              variant="text"
            />
          </template>
          <VList density="compact">
            <VListItem
              v-if="mayDuplicate"
              prepend-icon="mdi-content-copy"
              title="Duplicate"
              @click="duplicateDialog = true"
            />
            <VListItem
              v-if="mayActivate && rate.lifecycleStatus !== 'ACTIVE'"
              prepend-icon="mdi-check-circle-outline"
              title="Activate"
              @click="lifecycle('activate')"
            />
            <VListItem
              v-if="mayManage && rate.lifecycleStatus === 'ACTIVE'"
              prepend-icon="mdi-pause-circle-outline"
              title="Deactivate"
              @click="lifecycle('deactivate')"
            />
            <VListItem
              v-if="mayArchive && rate.lifecycleStatus !== 'ARCHIVED'"
              prepend-icon="mdi-archive-outline"
              title="Archive"
              @click="lifecycle('archive')"
            />
            <VListItem
              prepend-icon="mdi-history"
              title="View history"
              @click="activeTab = 'history'"
            />
          </VList>
        </VMenu>
      </div>

      <VCard border flat>
        <VCardText>
          <VRow>
            <VCol
              v-for="(column, columnIndex) in summaryRows(rate)"
              :key="columnIndex"
              cols="12"
              lg="4"
              md="6"
            >
              <div v-for="[label, value] in column" :key="label" class="info-row">
                <div class="text-caption text-medium-emphasis">{{ label }}</div>
                <div class="font-weight-medium wrap-value">{{ value }}</div>
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VTabs v-model="activeTab" class="mt-4" show-arrows>
        <VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</VTab>
      </VTabs>
      <VDivider />

      <VWindow v-model="activeTab" class="mt-4">
        <VWindowItem value="overview">
          <VRow>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Pricing Summary</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in pricingRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                  <VBtn class="mt-2" size="small" variant="text" @click="activeTab = 'pricing'">
                    View Pricing Details
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Route Information</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in routeRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                  <VBtn class="mt-2" size="small" variant="text" @click="activeTab = 'coverage'">
                    View Route & Coverage
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Quick Summary</VCardTitle>
                <VCardText>
                  <div v-for="[label, value] in quickRows" :key="label" class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="pricing">
          <VSkeletonLoader v-if="tabLoading.pricing" type="table" />
          <VCard v-else border flat>
            <VCardTitle class="text-subtitle-1">Base Pricing</VCardTitle>
            <VCardText>
              <VRow>
                <VCol v-for="[label, value] in pricingRows" :key="label" cols="12" md="4">
                  <div class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                </VCol>
              </VRow>
              <VDivider class="my-4" />
              <VAlert type="info" variant="tonal">
                No additional charges configured. Surcharges are not duplicated into this rate card.
              </VAlert>
            </VCardText>
          </VCard>
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
                    <th>Customer/Partner</th>
                    <th>Effective From</th>
                    <th>Effective Until</th>
                    <th>Status</th>
                    <th>Rate Scope</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="contract in contracts" :key="contract.id">
                    <td>{{ contract.contractNumber }}</td>
                    <td>{{ displayValue(contract.customerName) }}</td>
                    <td>{{ date(contract.effectiveFrom) }}</td>
                    <td>{{ date(contract.effectiveUntil) }}</td>
                    <td>{{ formatEnumLabel(contract.status) }}</td>
                    <td>{{ formatEnumLabel(contract.rateScope) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="channels">
          <VSkeletonLoader v-if="tabLoading.channels" type="table" />
          <VCard v-else border flat>
            <VCardText>
              <VAlert v-if="!channels?.length" variant="tonal">No booking channels linked.</VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Effective From</th>
                    <th>Effective Until</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="channel in channels" :key="channel.id">
                    <td>{{ formatEnumLabel(channel.bookingChannelCode) }}</td>
                    <td>{{ date(channel.effectiveFrom) }}</td>
                    <td>{{ date(channel.effectiveUntil) }}</td>
                    <td>{{ formatEnumLabel(channel.status) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="coverage">
          <VSkeletonLoader v-if="tabLoading.coverage" type="card" />
          <VCard v-else border flat>
            <VCardTitle class="text-subtitle-1">Route & Coverage</VCardTitle>
            <VCardText>
              <VRow>
                <VCol
                  v-for="[label, value] in [
                    ['Origin station', stationLabel(coverage?.origin ?? rate.origin)],
                    [
                      'Destination station',
                      stationLabel(coverage?.destination ?? rate.destination)
                    ],
                    ['Route', routeDisplay(rate)],
                    ['Applicable sectors', (coverage?.applicableSectors ?? []).join(', ') || '—'],
                    [
                      'Aircraft type restriction',
                      coverage?.aircraftType?.typeName ?? rate.aircraftType ?? '—'
                    ],
                    ['Customer scope', customerLabel(rate)],
                    [
                      'Agent scope',
                      rate.agent ? `${rate.agent.agentCode} · ${rate.agent.agentName}` : '—'
                    ],
                    ['Booking channel scope', formatEnumLabel(rate.bookingChannel)],
                    ['Effective period', `${date(rate.effectiveFrom)} - ${date(rate.effectiveTo)}`]
                  ]"
                  :key="label"
                  cols="12"
                  md="4"
                >
                  <div class="info-row">
                    <div class="text-caption text-medium-emphasis">{{ label }}</div>
                    <div class="font-weight-medium wrap-value">{{ value }}</div>
                  </div>
                </VCol>
              </VRow>
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
                  <tr v-for="document in documents" :key="document.id">
                    <td>{{ document.title }}</td>
                    <td>{{ formatEnumLabel(document.documentType) }}</td>
                    <td>{{ document.uploadedBy }}</td>
                    <td>{{ date(document.uploadedAt) }}</td>
                    <td>{{ formatEnumLabel(document.lifecycleStatus) }}</td>
                  </tr>
                </tbody>
              </VTable>
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

    <RateCardFormDialog
      v-model="editDialog"
      :record="editRecord"
      @saved="
        async () => {
          await refresh();
          editDialog = false;
        }
      "
    />

    <VDialog v-model="duplicateDialog" max-width="420">
      <VCard>
        <VCardTitle>Duplicate rate</VCardTitle>
        <VCardText>
          <VTextField v-model="duplicateCode" label="New rate code" variant="outlined" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="duplicateDialog = false">Cancel</VBtn>
          <VBtn :loading="submitting" color="primary" @click="duplicate">Duplicate</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.rate-detail {
  max-width: 1440px;
}
.info-row {
  padding-block: 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.info-row:last-child {
  border-bottom: 0;
}
.wrap-value {
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
</style>
