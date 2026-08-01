<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type {
  CustomerActivityItemDto,
  CustomerContactDto,
  CustomerContactInput,
  CustomerContractDto,
  CustomerDetailDto,
  CustomerDto,
  CustomerFinancialSummaryDto,
  CustomerHistoryItemDto,
  CustomerNoteDto,
  CustomerOperationalSummaryDto,
  CustomerRateDto
} from '#shared/features/commercial/customers';
import CustomerFormDialog from './CustomerFormDialog.vue';

type CustomerTab =
  | 'overview'
  | 'contacts'
  | 'financial'
  | 'rates'
  | 'documents'
  | 'contracts'
  | 'activity'
  | 'notes'
  | 'history';

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const customerId = computed(() => String(route.params.id));
const tabItems: Array<{ value: CustomerTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'financial', label: 'Financial' },
  { value: 'rates', label: 'Rates & Terms' },
  { value: 'documents', label: 'Documents' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'activity', label: 'Activity' },
  { value: 'notes', label: 'Notes' },
  { value: 'history', label: 'History' }
];
const queryTab = computed(() =>
  tabItems.some((item) => item.value === route.query.tab)
    ? (route.query.tab as CustomerTab)
    : 'overview'
);
const activeTab = ref<CustomerTab>(queryTab.value);
watch(queryTab, (value) => {
  activeTab.value = value;
});
watch(activeTab, async (value) => {
  await router.replace({
    query: { ...route.query, tab: value === 'overview' ? undefined : value }
  });
  await loadTab(value);
});

const {
  data: customer,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => 'customer-detail-' + customerId.value,
  () => fetchApi<CustomerDetailDto>('/api/master-data/customers/' + customerId.value),
  { watch: [customerId] }
);

const editDialog = ref(false);
const creditDialog = ref(false);
const creditAction = ref<'place' | 'release'>('place');
const creditReason = ref('');
const creditSubmitting = ref(false);
const contactDialog = ref(false);
const contactEditing = ref<CustomerContactDto | null>(null);
const contactSubmitting = ref(false);
const contactForm = reactive<CustomerContactInput>({
  contactName: '',
  roleTitle: null,
  email: null,
  phone: null,
  contactType: 'OTHER',
  isPrimary: false,
  isActive: true,
  notes: null
});
const tabLoading = reactive<Record<CustomerTab, boolean>>({
  overview: false,
  contacts: false,
  financial: false,
  rates: false,
  documents: false,
  contracts: false,
  activity: false,
  notes: false,
  history: false
});
const contacts = ref<CustomerContactDto[] | null>(null);
const financial = ref<CustomerFinancialSummaryDto | null>(null);
const operational = ref<CustomerOperationalSummaryDto | null>(null);
const rates = ref<CustomerRateDto[] | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const contracts = ref<CustomerContractDto[] | null>(null);
const activity = ref<CustomerActivityItemDto[] | null>(null);
const notes = ref<CustomerNoteDto[] | null>(null);
const history = ref<CustomerHistoryItemDto[] | null>(null);

const mayManage = computed(() => can('customer.manage').allowed);
const mayManageContacts = computed(() => can('customer.contact.manage').allowed);
const mayReadFinancial = computed(() => can('customer.financial.read').allowed);
const mayManageCredit = computed(() => can('customer.credit.manage').allowed);
const isOnCreditHold = computed(() => customer.value?.creditStatus === 'ON_HOLD');
const editRecord = computed<CustomerDto | null>(() => {
  const record = customer.value;
  if (!record) return null;
  return {
    id: record.id,
    accountType: record.accountType,
    accountCode: record.accountCode,
    accountName: record.accountName,
    contactPerson: record.primaryContact?.contactName ?? null,
    phone: record.primaryContact?.phone ?? record.phone,
    email: record.primaryContact?.email ?? record.email,
    billingAddress: record.billingAddress,
    paymentTermId: record.paymentTerm?.id ?? null,
    creditLimit:
      record.creditConfiguration.creditLimitMinor === null
        ? null
        : Number(record.creditConfiguration.creditLimitMinor),
    isActive: record.lifecycleStatus === 'ACTIVE',
    lifecycleStatus: record.lifecycleStatus,
    creditStatus: record.creditStatus,
    defaultCurrencyCode: record.defaultCurrencyCode,
    primaryContactId: record.primaryContact?.id ?? null,
    commercialNote: record.commercialNote,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
});

onMounted(() => {
  void loadTab(activeTab.value);
});

function empty(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function enumLabel(value: string | null | undefined) {
  if (!value) return '—';
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatMoney(amountMinor: string | number | null | undefined, currencyCode = 'IDR') {
  if (amountMinor === null || amountMinor === undefined || amountMinor === '') return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(Number(amountMinor));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function statusColor(value: string | null | undefined) {
  if (value === 'ACTIVE' || value === 'NORMAL') return 'success';
  if (value === 'ON_HOLD' || value === 'REVIEW_REQUIRED' || value === 'CASH_ONLY') return 'warning';
  if (value === 'SUSPENDED' || value === 'ARCHIVED') return 'error';
  return 'default';
}

function contactPayload(record?: CustomerContactDto | null): CustomerContactInput {
  return {
    contactName: record?.contactName ?? '',
    roleTitle: record?.roleTitle ?? null,
    email: record?.email ?? null,
    phone: record?.phone ?? null,
    contactType: (record?.contactType as CustomerContactInput['contactType']) ?? 'OTHER',
    isPrimary: record?.isPrimary ?? false,
    isActive: record?.isActive ?? true,
    notes: record?.notes ?? null
  };
}

async function loadTab(tab: CustomerTab, force = false) {
  if (tab === 'overview') return;
  if (tabLoading[tab]) return;
  const alreadyLoaded =
    (tab === 'contacts' && contacts.value) ||
    (tab === 'financial' && financial.value) ||
    (tab === 'rates' && rates.value) ||
    (tab === 'documents' && documents.value) ||
    (tab === 'contracts' && contracts.value) ||
    (tab === 'activity' && activity.value) ||
    (tab === 'notes' && notes.value) ||
    (tab === 'history' && history.value);
  if (alreadyLoaded && !force) return;
  tabLoading[tab] = true;
  try {
    if (tab === 'contacts') {
      contacts.value = await fetchApi<CustomerContactDto[]>(
        `/api/master-data/customers/${customerId.value}/contacts`
      );
    } else if (tab === 'financial') {
      financial.value = await fetchApi<CustomerFinancialSummaryDto>(
        `/api/master-data/customers/${customerId.value}/financial-summary`
      );
    } else if (tab === 'rates') {
      rates.value = await fetchApi<CustomerRateDto[]>(
        `/api/master-data/customers/${customerId.value}/rates`
      );
    } else if (tab === 'documents') {
      documents.value = await fetchApi<MasterDocumentDto[]>(
        `/api/master-data/customers/${customerId.value}/documents`
      );
    } else if (tab === 'contracts') {
      contracts.value = await fetchApi<CustomerContractDto[]>(
        `/api/master-data/customers/${customerId.value}/contracts`
      );
    } else if (tab === 'activity') {
      activity.value = await fetchApi<CustomerActivityItemDto[]>(
        `/api/master-data/customers/${customerId.value}/activity`
      );
    } else if (tab === 'notes') {
      notes.value = await fetchApi<CustomerNoteDto[]>(
        `/api/master-data/customers/${customerId.value}/notes`
      );
    } else if (tab === 'history') {
      history.value = await fetchApi<CustomerHistoryItemDto[]>(
        `/api/master-data/customers/${customerId.value}/history`
      );
    }
  } finally {
    tabLoading[tab] = false;
  }
}

async function refreshDetail() {
  await refresh();
  financial.value = null;
  operational.value = null;
  if (activeTab.value !== 'overview') await loadTab(activeTab.value, true);
}

function openCredit(action: 'place' | 'release') {
  creditAction.value = action;
  creditReason.value = '';
  creditDialog.value = true;
}

async function submitCredit() {
  if (!creditReason.value.trim()) return;
  creditSubmitting.value = true;
  try {
    await fetchApi(
      `/api/master-data/customers/${customerId.value}/${creditAction.value === 'place' ? 'place-credit-hold' : 'release-credit-hold'}`,
      {
        method: 'POST',
        body: { reason: creditReason.value.trim(), expectedVersion: customer.value?.version }
      }
    );
    creditDialog.value = false;
    await refreshDetail();
  } finally {
    creditSubmitting.value = false;
  }
}

function openContact(record?: CustomerContactDto) {
  contactEditing.value = record ?? null;
  Object.assign(contactForm, contactPayload(record));
  contactDialog.value = true;
}

async function submitContact() {
  contactSubmitting.value = true;
  try {
    await fetchApi(
      contactEditing.value
        ? `/api/master-data/customers/${customerId.value}/contacts/${contactEditing.value.id}`
        : `/api/master-data/customers/${customerId.value}/contacts`,
      {
        method: contactEditing.value ? 'PUT' : 'POST',
        body: { ...contactForm }
      }
    );
    contactDialog.value = false;
    await loadTab('contacts', true);
    await refreshDetail();
  } finally {
    contactSubmitting.value = false;
  }
}

async function setPrimary(contact: CustomerContactDto) {
  await fetchApi(
    `/api/master-data/customers/${customerId.value}/contacts/${contact.id}/set-primary`,
    {
      method: 'POST'
    }
  );
  await loadTab('contacts', true);
  await refreshDetail();
}

async function deactivate(contact: CustomerContactDto) {
  await fetchApi(
    `/api/master-data/customers/${customerId.value}/contacts/${contact.id}/deactivate`,
    {
      method: 'POST'
    }
  );
  await loadTab('contacts', true);
  await refreshDetail();
}

async function archiveCustomer() {
  await fetchApi(`/api/master-data/customers/${customerId.value}/archive`, { method: 'POST' });
  await refreshDetail();
}

function gotoTab(tab: CustomerTab) {
  activeTab.value = tab;
}

const summaryRowsLeft = computed(() => {
  const record = customer.value;
  return [
    ['Account Type', enumLabel(record?.accountType)],
    ['Account Name', empty(record?.accountName)],
    ['Phone', empty(record?.primaryContact?.phone ?? record?.phone)],
    ['Billing Address', empty(record?.billingAddress)],
    [
      'Credit Limit',
      formatMoney(record?.creditConfiguration.creditLimitMinor, record?.defaultCurrencyCode)
    ]
  ];
});
const summaryRowsRight = computed(() => {
  const record = customer.value;
  return [
    ['Account Code', empty(record?.accountCode)],
    ['Primary Contact Person', empty(record?.primaryContact?.contactName)],
    ['Primary Email', empty(record?.primaryContact?.email ?? record?.email)],
    ['Payment Term', empty(record?.paymentTerm?.name)],
    ['Status', enumLabel(record?.lifecycleStatus)]
  ];
});
</script>

<template>
  <VContainer class="px-3 py-5 customer-detail" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/customers" variant="text">Customers</VBtn>

    <template v-if="pending">
      <VSkeletonLoader class="mt-4" type="heading, subtitle, card, paragraph" />
      <VSkeletonLoader class="mt-4" type="card, card, card" />
    </template>

    <VCard v-else-if="error" border flat class="mt-4">
      <VCardText>
        <VAlert color="error" variant="tonal" title="Unable to load customer">
          Customer account data could not be retrieved.
        </VAlert>
        <div class="mt-4 d-flex ga-3">
          <VBtn prepend-icon="mdi-refresh" @click="refresh">Retry</VBtn>
          <VBtn to="/master-data/customers" variant="text">Back to Customers</VBtn>
        </div>
      </VCardText>
    </VCard>

    <template v-else-if="customer">
      <div class="mt-4 mb-4 d-flex flex-wrap align-start ga-3">
        <div class="min-w-0">
          <div class="d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-wrap">{{ customer.accountName }}</h1>
            <VChip :color="statusColor(customer.lifecycleStatus)" size="small" variant="tonal">
              {{ enumLabel(customer.lifecycleStatus) }}
            </VChip>
            <VChip
              v-if="customer.creditStatus !== 'NORMAL'"
              :color="statusColor(customer.creditStatus)"
              size="small"
              variant="tonal"
            >
              {{ enumLabel(customer.creditStatus) }}
            </VChip>
          </div>
          <p class="mt-1 mb-0 text-body-2 text-medium-emphasis">
            {{ enumLabel(customer.accountType) }} · Account Code: {{ customer.accountCode }}
          </p>
        </div>
        <VSpacer />
        <div class="d-flex ga-2">
          <VBtn v-if="mayManage" prepend-icon="mdi-pencil-outline" @click="editDialog = true">
            Edit
          </VBtn>
          <VMenu>
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                aria-label="More customer actions"
                icon="mdi-dots-vertical"
                variant="text"
              />
            </template>
            <VList density="compact">
              <VListItem
                v-if="mayManageCredit && !isOnCreditHold"
                prepend-icon="mdi-credit-card-off-outline"
                title="Place credit hold"
                @click="openCredit('place')"
              />
              <VListItem
                v-if="mayManageCredit && isOnCreditHold"
                prepend-icon="mdi-credit-card-check-outline"
                title="Release credit hold"
                @click="openCredit('release')"
              />
              <VListItem
                v-if="mayManageContacts"
                prepend-icon="mdi-account-plus-outline"
                title="Add contact"
                @click="openContact()"
              />
              <VListItem
                prepend-icon="mdi-history"
                title="View history"
                @click="gotoTab('history')"
              />
              <VDivider v-if="mayManage" />
              <VListItem
                v-if="mayManage && customer.lifecycleStatus !== 'ARCHIVED'"
                prepend-icon="mdi-archive-outline"
                title="Archive customer"
                @click="archiveCustomer"
              />
            </VList>
          </VMenu>
        </div>
      </div>

      <VCard border flat>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <div v-for="[label, value] in summaryRowsLeft" :key="label" class="info-row">
                <div class="info-label">{{ label }}</div>
                <div class="info-value">{{ value }}</div>
              </div>
            </VCol>
            <VCol cols="12" md="6">
              <div v-for="[label, value] in summaryRowsRight" :key="label" class="info-row">
                <div class="info-label">{{ label }}</div>
                <div class="info-value">{{ value }}</div>
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard border flat class="mt-4">
        <VTabs v-model="activeTab" show-arrows>
          <VTab v-for="item in tabItems" :key="item.value" :value="item.value">
            {{ item.label }}
          </VTab>
        </VTabs>
      </VCard>

      <VWindow v-model="activeTab" class="mt-4">
        <VWindowItem value="overview">
          <VRow>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Primary Contact</VCardTitle>
                <VCardText>
                  <template v-if="customer.primaryContact">
                    <div class="info-row">
                      <div class="info-label">Name</div>
                      <div class="info-value">{{ customer.primaryContact.contactName }}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Phone</div>
                      <div class="info-value">
                        <a
                          v-if="customer.primaryContact.phone"
                          :href="'tel:' + customer.primaryContact.phone"
                        >{{ customer.primaryContact.phone }}</a><span v-else>—</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Email</div>
                      <div class="info-value">
                        <a
                          v-if="customer.primaryContact.email"
                          :href="'mailto:' + customer.primaryContact.email"
                        >{{ customer.primaryContact.email }}</a><span v-else>—</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Role</div>
                      <div class="info-value">{{ empty(customer.primaryContact.roleTitle) }}</div>
                    </div>
                  </template>
                  <VAlert v-else color="info" variant="tonal">No primary contact assigned.</VAlert>
                  <VBtn class="mt-3" size="small" variant="text" @click="gotoTab('contacts')">
                    View All Contacts
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Account & Financial</VCardTitle>
                <VCardText>
                  <div class="info-row">
                    <div class="info-label">Payment Term</div>
                    <div class="info-value">{{ empty(customer.paymentTerm?.name) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Currency</div>
                    <div class="info-value">{{ customer.defaultCurrencyCode }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Credit Limit</div>
                    <div class="info-value">
                      {{
                        formatMoney(
                          customer.creditConfiguration.creditLimitMinor,
                          customer.defaultCurrencyCode
                        )
                      }}
                    </div>
                  </div>
                  <template v-if="customer.financialSummary">
                    <div class="info-row">
                      <div class="info-label">Current Exposure</div>
                      <div class="info-value">
                        {{
                          formatMoney(
                            customer.financialSummary.currentExposureMinor,
                            customer.defaultCurrencyCode
                          )
                        }}
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Available Credit</div>
                      <div class="info-value">
                        {{
                          formatMoney(
                            customer.financialSummary.availableCreditMinor,
                            customer.defaultCurrencyCode
                          )
                        }}
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Credit Hold Status</div>
                      <div class="info-value">{{ enumLabel(customer.creditStatus) }}</div>
                    </div>
                    <p class="mt-2 mb-0 text-caption text-medium-emphasis">
                      As of {{ formatDate(customer.financialSummary.asOf) }}
                    </p>
                  </template>
                  <VAlert v-else color="warning" variant="tonal" class="mt-2">
                    Financial summary requires permission.
                  </VAlert>
                  <VBtn
                    v-if="mayReadFinancial"
                    class="mt-3"
                    size="small"
                    variant="text"
                    @click="gotoTab('financial')"
                  >
                    View Financial Summary
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="12">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Account Summary</VCardTitle>
                <VCardText>
                  <div class="info-row">
                    <div class="info-label">Total Shipments</div>
                    <div class="info-value">
                      {{ empty(customer.operationalSummary?.totalShipmentCount) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Last Shipment</div>
                    <div class="info-value">
                      {{ formatDate(customer.operationalSummary?.lastShipmentAt) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Active Contracts</div>
                    <div class="info-value">
                      {{ empty(customer.operationalSummary?.activeContractCount) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Active Rate Agreements</div>
                    <div class="info-value">
                      {{ empty(customer.operationalSummary?.activeRateAgreementCount) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Average Rating</div>
                    <div class="info-value">
                      {{ empty(customer.operationalSummary?.averageRating) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Created At</div>
                    <div class="info-value">{{ formatDate(customer.createdAt) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">{{ formatDate(customer.updatedAt) }}</div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="contacts">
          <VCard border flat>
            <VCardTitle class="d-flex align-center">
              Contacts
              <VSpacer />
              <VBtn
                v-if="mayManageContacts"
                size="small"
                prepend-icon="mdi-plus"
                @click="openContact()"
              >
                Add Contact
              </VBtn>
            </VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.contacts" type="table" />
              <VAlert v-else-if="contacts?.length === 0" color="info" variant="tonal">
                No contacts recorded.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="contact in contacts" :key="contact.id">
                    <td>
                      {{ contact.contactName }}
                      <VChip
                        v-if="contact.isPrimary"
                        size="x-small"
                        color="primary"
                        variant="tonal"
                      >
                        Primary
                      </VChip>
                    </td>
                    <td>{{ enumLabel(contact.contactType) }}</td>
                    <td>{{ empty(contact.roleTitle) }}</td>
                    <td>{{ empty(contact.phone) }}</td>
                    <td>{{ empty(contact.email) }}</td>
                    <td>{{ contact.isActive ? 'Active' : 'Inactive' }}</td>
                    <td class="text-right">
                      <VBtn
                        v-if="mayManageContacts"
                        icon="mdi-pencil-outline"
                        variant="text"
                        aria-label="Edit contact"
                        @click="openContact(contact)"
                      />
                      <VBtn
                        v-if="mayManageContacts && !contact.isPrimary && contact.isActive"
                        icon="mdi-star-outline"
                        variant="text"
                        aria-label="Set as primary"
                        @click="setPrimary(contact)"
                      />
                      <VBtn
                        v-if="mayManageContacts && contact.isActive"
                        icon="mdi-account-off-outline"
                        variant="text"
                        aria-label="Deactivate contact"
                        @click="deactivate(contact)"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="financial">
          <VCard border flat>
            <VCardTitle>Financial Summary</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.financial" type="paragraph" />
              <VAlert v-else-if="!mayReadFinancial" color="warning" variant="tonal">
                Financial summary requires permission.
              </VAlert>
              <template v-else-if="financial">
                <VRow>
                  <VCol
                    v-for="[label, value] in [
                      [
                        'Credit Limit',
                        formatMoney(financial.creditLimitMinor, financial.currencyCode)
                      ],
                      [
                        'Current Exposure',
                        formatMoney(financial.currentExposureMinor, financial.currencyCode)
                      ],
                      [
                        'Available Credit',
                        formatMoney(financial.availableCreditMinor, financial.currencyCode)
                      ],
                      [
                        'Open Invoice Amount',
                        formatMoney(financial.openInvoiceAmountMinor, financial.currencyCode)
                      ],
                      [
                        'Overdue Amount',
                        formatMoney(financial.overdueAmountMinor, financial.currencyCode)
                      ],
                      [
                        'Oldest Overdue Age',
                        financial.oldestOverdueDays === null
                          ? '—'
                          : financial.oldestOverdueDays + ' days'
                      ],
                      [
                        'Last Payment',
                        formatMoney(financial.lastPaymentAmountMinor, financial.currencyCode)
                      ]
                    ]"
                    :key="label"
                    cols="12"
                    md="4"
                  >
                    <div class="metric-label">{{ label }}</div>
                    <div class="metric-value">{{ value }}</div>
                  </VCol>
                </VRow>
                <p class="mt-2 mb-0 text-caption text-medium-emphasis">
                  Exposure definition: open posted AR minus recorded payments for the customer
                  currency. Draft invoices are excluded. As of {{ formatDate(financial.asOf) }}.
                </p>
              </template>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="rates">
          <VCard border flat>
            <VCardTitle>Rates & Terms</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.rates" type="table" />
              <VAlert v-else-if="rates?.length === 0" color="info" variant="tonal">
                No active rate agreements.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Rate Code</th>
                    <th>Service</th>
                    <th>Route</th>
                    <th>Rate</th>
                    <th>Scope</th>
                    <th>Validity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rate in rates" :key="rate.id">
                    <td>{{ rate.rateCode }}</td>
                    <td>{{ enumLabel(rate.serviceType) }}</td>
                    <td>{{ empty(rate.originStation) }} → {{ empty(rate.destinationStation) }}</td>
                    <td>
                      {{ formatMoney(rate.baseRateMinor, rate.currencyCode) }} /
                      {{ enumLabel(rate.rateUnit) }}
                    </td>
                    <td>{{ enumLabel(rate.pricingScope) }}</td>
                    <td>
                      {{ formatDate(rate.effectiveFrom) }} - {{ formatDate(rate.effectiveTo) }}
                    </td>
                    <td>{{ rate.isActive ? 'Active' : 'Inactive' }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="documents">
          <VCard border flat>
            <VCardTitle>Documents</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.documents" type="table" />
              <VAlert v-else-if="documents?.length === 0" color="info" variant="tonal">
                No documents available.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Uploaded By</th>
                    <th>Uploaded At</th>
                    <th>Valid Until</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="document in documents" :key="document.id">
                    <td>{{ document.title }}</td>
                    <td>{{ enumLabel(document.documentType) }}</td>
                    <td>{{ document.uploadedBy }}</td>
                    <td>{{ formatDate(document.uploadedAt) }}</td>
                    <td>{{ formatDate(document.expiresAt) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="contracts">
          <VCard border flat>
            <VCardTitle>Contracts</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.contracts" type="table" />
              <VAlert v-else-if="contracts?.length === 0" color="info" variant="tonal">
                No contracts linked.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Contract Number</th>
                    <th>Type</th>
                    <th>Effective</th>
                    <th>Status</th>
                    <th>Signed Date</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="contract in contracts" :key="contract.id">
                    <td>{{ contract.contractNumber }}</td>
                    <td>{{ enumLabel(contract.contractType) }}</td>
                    <td>
                      {{ formatDate(contract.effectiveFrom) }} -
                      {{ formatDate(contract.effectiveUntil) }}
                    </td>
                    <td>{{ enumLabel(contract.status) }}</td>
                    <td>{{ formatDate(contract.signedDate) }}</td>
                    <td>{{ empty(contract.documentId) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="activity">
          <VCard border flat>
            <VCardTitle>Activity</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.activity" type="list-item-two-line@4" />
              <VAlert v-else-if="activity?.length === 0" color="info" variant="tonal">
                No customer activity found.
              </VAlert>
              <VTimeline v-else density="compact" side="end">
                <VTimelineItem
                  v-for="item in activity"
                  :key="item.id"
                  dot-color="primary"
                  size="small"
                >
                  <div class="font-weight-medium">{{ item.title }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ empty(item.description) }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDate(item.occurredAt) }}
                  </div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="notes">
          <VCard border flat>
            <VCardTitle>Notes</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.notes" type="list-item-two-line@3" />
              <VAlert v-else-if="notes?.length === 0" color="info" variant="tonal">
                No notes recorded.
              </VAlert>
              <VList v-else lines="two">
                <VListItem
                  v-for="note in notes"
                  :key="note.id"
                  :title="enumLabel(note.noteType)"
                  :subtitle="note.note"
                >
                  <template #append>
                    <VChip size="small" variant="tonal">
                      {{ enumLabel(note.visibility) }}
                    </VChip>
                  </template>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VWindowItem>

        <VWindowItem value="history">
          <VCard border flat>
            <VCardTitle>History</VCardTitle>
            <VCardText>
              <VSkeletonLoader v-if="tabLoading.history" type="list-item-two-line@4" />
              <VAlert v-else-if="history?.length === 0" color="info" variant="tonal">
                No audit history available.
              </VAlert>
              <VTable v-else>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Changed Fields</th>
                    <th>Actor</th>
                    <th>Occurred At</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in history" :key="item.id">
                    <td>{{ enumLabel(item.action) }}</td>
                    <td>{{ item.changedFields.map(enumLabel).join(', ') || '—' }}</td>
                    <td>{{ empty(item.actorName) }}</td>
                    <td>{{ formatDate(item.occurredAt) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>
        </VWindowItem>
      </VWindow>

      <CustomerFormDialog v-model="editDialog" :record="editRecord" @saved="refreshDetail" />
      <VDialog v-model="creditDialog" max-width="520">
        <VCard>
          <VCardTitle>
            {{ creditAction === 'place' ? 'Place credit hold' : 'Release credit hold' }}
          </VCardTitle>
          <VCardText>
            <VTextarea v-model="creditReason" label="Reason" rows="3" variant="outlined" />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="creditDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="creditSubmitting" @click="submitCredit">Submit</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
      <VDialog v-model="contactDialog" max-width="760">
        <VCard>
          <VCardTitle>{{ contactEditing ? 'Edit Contact' : 'Add Contact' }}</VCardTitle>
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="contactForm.contactName"
                  label="Contact name"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="contactForm.roleTitle"
                  label="Role / Position"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="contactForm.phone" label="Phone" variant="outlined" />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="contactForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="contactForm.contactType"
                  :items="[
                    'PRIMARY',
                    'BILLING',
                    'OPERATIONS',
                    'CARGO',
                    'FINANCE',
                    'CONTRACT',
                    'OTHER'
                  ]"
                  label="Contact type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6" class="d-flex align-center ga-4">
                <VCheckbox v-model="contactForm.isPrimary" hide-details label="Primary" />
                <VCheckbox v-model="contactForm.isActive" hide-details label="Active" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="contactForm.notes" label="Notes" rows="2" variant="outlined" />
              </VCol>
            </VRow>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="contactDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="contactSubmitting" @click="submitContact">
              Save Contact
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>

    <VCard v-else border flat class="mt-4">
      <VCardText>
        <VAlert color="warning" variant="tonal" title="Customer not found">
          The requested customer account may have been removed or is no longer available.
        </VAlert>
        <VBtn class="mt-4" to="/master-data/customers" variant="text">Back to Customers</VBtn>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
.customer-detail {
  overflow-x: hidden;
}

.info-row {
  display: grid;
  grid-template-columns: minmax(120px, 38%) minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label,
.metric-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8125rem;
}

.info-value,
.metric-value {
  min-width: 0;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.metric-value {
  font-weight: 600;
}

@media (max-width: 600px) {
  .info-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
