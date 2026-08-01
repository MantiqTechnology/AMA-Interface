<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type {
  AgentActivityItemDto,
  AgentCommissionRuleDto,
  AgentContactDto,
  AgentContactInput,
  AgentContractDto,
  AgentDetailDto,
  AgentDto,
  AgentHistoryItemDto,
  AgentNoteDto,
  AgentRateDto
} from '#shared/features/commercial/agents';
import AgentFormDialog from './AgentFormDialog.vue';

type AgentTab =
  | 'overview'
  | 'commission'
  | 'contacts'
  | 'contracts'
  | 'activity'
  | 'documents'
  | 'notes'
  | 'history';

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const agentId = computed(() => String(route.params.id));
const tabs: Array<{ value: AgentTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'commission', label: 'Commission & Rates' },
  { value: 'contacts', label: 'Contact Persons' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'activity', label: 'Activity' },
  { value: 'documents', label: 'Documents' },
  { value: 'notes', label: 'Notes' },
  { value: 'history', label: 'History' }
];
const activeTab = ref<AgentTab>(
  tabs.some((item) => item.value === route.query.tab) ? (route.query.tab as AgentTab) : 'overview'
);
watch(activeTab, async (tab) => {
  await router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } });
  await loadTab(tab);
});

const {
  data: agent,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => 'agent-detail-' + agentId.value,
  () => fetchApi<AgentDetailDto>('/api/master-data/agents/' + agentId.value),
  { watch: [agentId] }
);

const editDialog = ref(false);
const lifecycleDialog = ref(false);
const lifecycleAction = ref<'activate' | 'suspend' | 'deactivate' | 'archive'>('suspend');
const lifecycleReason = ref('');
const lifecycleSubmitting = ref(false);
const contactDialog = ref(false);
const contactEditing = ref<AgentContactDto | null>(null);
const contactSubmitting = ref(false);
const contactForm = reactive<AgentContactInput>({
  contactName: '',
  roleTitle: null,
  department: null,
  email: null,
  phone: null,
  contactType: 'OTHER',
  isPrimary: false,
  isActive: true,
  notes: null
});

const tabLoading = reactive<Record<AgentTab, boolean>>({
  overview: false,
  commission: false,
  contacts: false,
  contracts: false,
  activity: false,
  documents: false,
  notes: false,
  history: false
});
const contacts = ref<AgentContactDto[] | null>(null);
const rules = ref<AgentCommissionRuleDto[] | null>(null);
const rates = ref<AgentRateDto[] | null>(null);
const contracts = ref<AgentContractDto[] | null>(null);
const activity = ref<AgentActivityItemDto[] | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const notes = ref<AgentNoteDto[] | null>(null);
const history = ref<AgentHistoryItemDto[] | null>(null);

const mayManage = computed(() => can('agent.manage').allowed);
const mayManageContacts = computed(() => can('agent.contact.manage').allowed);
const maySuspend = computed(() => can('agent.suspend').allowed);
const mayActivate = computed(() => can('agent.activate').allowed);
const mayArchive = computed(() => can('agent.archive').allowed);
const editRecord = computed<AgentDto | null>(() => (agent.value ? { ...agent.value } : null));

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

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function formatMoney(amountMinor: string | number | null | undefined, currencyCode = 'IDR') {
  if (amountMinor === null || amountMinor === undefined || amountMinor === '') return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(Number(amountMinor));
}

function formatBasisPoints(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const percent = value / 100;
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')}%`;
}

function commissionLabel(rule: AgentDetailDto['defaultCommission'] | null | undefined) {
  if (!rule) return '—';
  if (rule.commissionType === 'FIXED_AMOUNT') {
    return formatMoney(
      rule.fixedAmountMinor,
      rule.currencyCode ?? agent.value?.defaultCurrencyCode ?? 'IDR'
    );
  }
  if (rule.commissionType === 'HYBRID') {
    return `${formatBasisPoints(rule.percentageBasisPoints)} + ${formatMoney(rule.fixedAmountMinor, rule.currencyCode ?? 'IDR')}`;
  }
  return formatBasisPoints(rule.percentageBasisPoints);
}

function statusColor(status: string | null | undefined) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'DRAFT' || status === 'SUSPENDED') return 'warning';
  if (status === 'ARCHIVED') return 'error';
  return 'default';
}

async function loadTab(tab: AgentTab, force = false) {
  if (tab === 'overview') return;
  if (tabLoading[tab]) return;
  const loaded =
    (tab === 'commission' && rules.value && rates.value) ||
    (tab === 'contacts' && contacts.value) ||
    (tab === 'contracts' && contracts.value) ||
    (tab === 'activity' && activity.value) ||
    (tab === 'documents' && documents.value) ||
    (tab === 'notes' && notes.value) ||
    (tab === 'history' && history.value);
  if (loaded && !force) return;
  tabLoading[tab] = true;
  try {
    if (tab === 'commission') {
      const [ruleRows, rateRows] = await Promise.all([
        fetchApi<AgentCommissionRuleDto[]>(
          `/api/master-data/agents/${agentId.value}/commission-rules`
        ),
        fetchApi<AgentRateDto[]>(`/api/master-data/agents/${agentId.value}/rates`)
      ]);
      rules.value = ruleRows;
      rates.value = rateRows;
    } else if (tab === 'contacts') {
      contacts.value = await fetchApi<AgentContactDto[]>(
        `/api/master-data/agents/${agentId.value}/contacts`
      );
    } else if (tab === 'contracts') {
      contracts.value = await fetchApi<AgentContractDto[]>(
        `/api/master-data/agents/${agentId.value}/contracts`
      );
    } else if (tab === 'activity') {
      activity.value = await fetchApi<AgentActivityItemDto[]>(
        `/api/master-data/agents/${agentId.value}/activity`
      );
    } else if (tab === 'documents') {
      documents.value = await fetchApi<MasterDocumentDto[]>(
        `/api/master-data/agents/${agentId.value}/documents`
      );
    } else if (tab === 'notes') {
      notes.value = await fetchApi<AgentNoteDto[]>(
        `/api/master-data/agents/${agentId.value}/notes`
      );
    } else if (tab === 'history') {
      history.value = await fetchApi<AgentHistoryItemDto[]>(
        `/api/master-data/agents/${agentId.value}/history`
      );
    }
  } finally {
    tabLoading[tab] = false;
  }
}

async function refreshDetail() {
  await refresh();
  if (activeTab.value !== 'overview') await loadTab(activeTab.value, true);
}

function gotoTab(tab: AgentTab) {
  activeTab.value = tab;
}

function openLifecycle(action: 'activate' | 'suspend' | 'deactivate' | 'archive') {
  lifecycleAction.value = action;
  lifecycleReason.value = '';
  lifecycleDialog.value = true;
}

async function submitLifecycle() {
  if (lifecycleAction.value === 'suspend' && !lifecycleReason.value.trim()) return;
  lifecycleSubmitting.value = true;
  try {
    await fetchApi(`/api/master-data/agents/${agentId.value}/${lifecycleAction.value}`, {
      method: 'POST',
      body:
        lifecycleAction.value === 'archive'
          ? undefined
          : { reason: lifecycleReason.value.trim(), expectedVersion: agent.value?.version }
    });
    lifecycleDialog.value = false;
    await refreshDetail();
  } finally {
    lifecycleSubmitting.value = false;
  }
}

function openContact(contact?: AgentContactDto) {
  contactEditing.value = contact ?? null;
  Object.assign(contactForm, {
    contactName: contact?.contactName ?? '',
    roleTitle: contact?.roleTitle ?? null,
    department: contact?.department ?? null,
    email: contact?.email ?? null,
    phone: contact?.phone ?? null,
    contactType: (contact?.contactType as AgentContactInput['contactType']) ?? 'OTHER',
    isPrimary: contact?.isPrimary ?? false,
    isActive: contact?.isActive ?? true,
    notes: contact?.notes ?? null
  });
  contactDialog.value = true;
}

async function submitContact() {
  contactSubmitting.value = true;
  try {
    await fetchApi(
      contactEditing.value
        ? `/api/master-data/agents/${agentId.value}/contacts/${contactEditing.value.id}`
        : `/api/master-data/agents/${agentId.value}/contacts`,
      { method: contactEditing.value ? 'PUT' : 'POST', body: { ...contactForm } }
    );
    contactDialog.value = false;
    await loadTab('contacts', true);
    await refreshDetail();
  } finally {
    contactSubmitting.value = false;
  }
}

async function setPrimary(contact: AgentContactDto) {
  await fetchApi(`/api/master-data/agents/${agentId.value}/contacts/${contact.id}/set-primary`, {
    method: 'POST'
  });
  await loadTab('contacts', true);
  await refreshDetail();
}

async function deactivateContact(contact: AgentContactDto) {
  await fetchApi(`/api/master-data/agents/${agentId.value}/contacts/${contact.id}/deactivate`, {
    method: 'POST'
  });
  await loadTab('contacts', true);
  await refreshDetail();
}

const summaryLeft = computed(() => [
  ['Agent Code', empty(agent.value?.agentCode)],
  ['Agent Type', enumLabel(agent.value?.agentType)],
  ['Default Commission', commissionLabel(agent.value?.defaultCommission)],
  ['Phone', empty(agent.value?.primaryContact?.phone ?? agent.value?.phone)],
  ['Partner Account', empty(agent.value?.customerAccount?.accountName)]
]);
const summaryRight = computed(() => [
  ['Agent Name', empty(agent.value?.agentName)],
  [
    'Station',
    agent.value?.station
      ? `${agent.value.station.stationCode} · ${agent.value.station.stationName}`
      : '—'
  ],
  ['Primary Contact', empty(agent.value?.primaryContact?.contactName)],
  ['Primary Email', empty(agent.value?.primaryContact?.email)],
  ['Status', enumLabel(agent.value?.lifecycleStatus)]
]);
</script>

<template>
  <VContainer class="px-3 py-5 agent-detail" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/agents" variant="text">Agents</VBtn>

    <template v-if="pending">
      <VSkeletonLoader class="mt-4" type="heading, subtitle, card, paragraph" />
      <VSkeletonLoader class="mt-4" type="card, card, card" />
    </template>

    <VCard v-else-if="error" border flat class="mt-4">
      <VCardText>
        <VAlert color="error" variant="tonal" title="Unable to load agent">
          Commercial agent data could not be retrieved.
        </VAlert>
        <div class="mt-4 d-flex ga-3">
          <VBtn prepend-icon="mdi-refresh" @click="refresh">Retry</VBtn>
          <VBtn to="/master-data/agents" variant="text">Back to Agents</VBtn>
        </div>
      </VCardText>
    </VCard>

    <template v-else-if="agent">
      <div class="mt-4 mb-4 d-flex flex-wrap align-start ga-3">
        <div class="min-w-0">
          <div class="d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-wrap">{{ agent.agentName }}</h1>
            <VChip :color="statusColor(agent.lifecycleStatus)" size="small" variant="tonal">
              {{ enumLabel(agent.lifecycleStatus) }}
            </VChip>
          </div>
          <p class="mt-1 mb-0 text-body-2 text-medium-emphasis">
            {{ enumLabel(agent.agentType) }} · Agent Code: {{ agent.agentCode }}
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
                aria-label="More agent actions"
                icon="mdi-dots-vertical"
                variant="text"
              />
            </template>
            <VList density="compact">
              <VListItem
                v-if="
                  mayActivate &&
                    agent.lifecycleStatus !== 'ACTIVE' &&
                    agent.lifecycleStatus !== 'ARCHIVED'
                "
                prepend-icon="mdi-check-circle-outline"
                title="Activate"
                @click="openLifecycle('activate')"
              />
              <VListItem
                v-if="maySuspend && agent.lifecycleStatus === 'ACTIVE'"
                prepend-icon="mdi-pause-circle-outline"
                title="Suspend"
                @click="openLifecycle('suspend')"
              />
              <VListItem
                v-if="mayManage && agent.lifecycleStatus !== 'INACTIVE'"
                prepend-icon="mdi-close-circle-outline"
                title="Deactivate"
                @click="openLifecycle('deactivate')"
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
              <VDivider v-if="mayArchive && agent.lifecycleStatus !== 'ARCHIVED'" />
              <VListItem
                v-if="mayArchive && agent.lifecycleStatus !== 'ARCHIVED'"
                prepend-icon="mdi-archive-outline"
                title="Archive"
                @click="openLifecycle('archive')"
              />
            </VList>
          </VMenu>
        </div>
      </div>

      <VCard border flat>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <div v-for="[label, value] in summaryLeft" :key="label" class="info-row">
                <div class="info-label">{{ label }}</div>
                <div class="info-value">{{ value }}</div>
              </div>
            </VCol>
            <VCol cols="12" md="6">
              <div v-for="[label, value] in summaryRight" :key="label" class="info-row">
                <div class="info-label">{{ label }}</div>
                <div class="info-value">{{ value }}</div>
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard border flat class="mt-4">
        <VTabs v-model="activeTab" show-arrows>
          <VTab v-for="item in tabs" :key="item.value" :value="item.value">{{ item.label }}</VTab>
        </VTabs>
      </VCard>

      <VWindow v-model="activeTab" class="mt-4">
        <VWindowItem value="overview">
          <VRow>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Agent Information</VCardTitle>
                <VCardText>
                  <div class="info-row">
                    <div class="info-label">Agent Code</div>
                    <div class="info-value">{{ agent.agentCode }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Agent Type</div>
                    <div class="info-value">{{ enumLabel(agent.agentType) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Agent Name</div>
                    <div class="info-value">{{ agent.agentName }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Station</div>
                    <div class="info-value">
                      {{
                        agent.station
                          ? `${agent.station.stationCode} · ${agent.station.stationName}`
                          : '—'
                      }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Booking Channel</div>
                    <div class="info-value">{{ empty(agent.bookingChannelCode) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Status</div>
                    <div class="info-value">{{ enumLabel(agent.lifecycleStatus) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Created At</div>
                    <div class="info-value">{{ formatDate(agent.createdAt) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">{{ formatDate(agent.updatedAt) }}</div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="6">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Primary Contact</VCardTitle>
                <VCardText>
                  <template v-if="agent.primaryContact">
                    <div class="info-row">
                      <div class="info-label">Contact Name</div>
                      <div class="info-value">{{ agent.primaryContact.contactName }}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Phone</div>
                      <div class="info-value">
                        <a
                          v-if="agent.primaryContact.phone"
                          :href="'tel:' + agent.primaryContact.phone"
                        >{{ agent.primaryContact.phone }}</a><span v-else>—</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Email</div>
                      <div class="info-value">
                        <a
                          v-if="agent.primaryContact.email"
                          :href="'mailto:' + agent.primaryContact.email"
                        >{{ agent.primaryContact.email }}</a><span v-else>—</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Role / Position</div>
                      <div class="info-value">{{ empty(agent.primaryContact.roleTitle) }}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Department</div>
                      <div class="info-value">{{ empty(agent.primaryContact.department) }}</div>
                    </div>
                  </template>
                  <VAlert v-else color="info" variant="tonal">No primary contact assigned.</VAlert>
                  <VBtn class="mt-3" size="small" variant="text" @click="gotoTab('contacts')">
                    View All Contacts
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="4" md="12">
              <VCard border flat>
                <VCardTitle class="text-subtitle-1">Quick Summary</VCardTitle>
                <VCardText>
                  <div class="info-row">
                    <div class="info-label">Commission Rate</div>
                    <div class="info-value">{{ commissionLabel(agent.defaultCommission) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Active Contracts</div>
                    <div class="info-value">
                      {{ empty(agent.quickSummary?.activeContractCount) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Linked Rates</div>
                    <div class="info-value">{{ empty(agent.quickSummary?.linkedRateCount) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Total Bookings</div>
                    <div class="info-value">{{ empty(agent.quickSummary?.totalBookingCount) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Last Booking</div>
                    <div class="info-value">
                      {{ formatDate(agent.quickSummary?.lastBookingAt) }}
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Outstanding Commission</div>
                    <div class="info-value">
                      {{
                        formatMoney(
                          agent.quickSummary?.outstandingCommissionMinor,
                          agent.quickSummary?.currencyCode ?? 'IDR'
                        )
                      }}
                    </div>
                  </div>
                  <VBtn class="mt-3" size="small" variant="text" @click="gotoTab('activity')">
                    View Activity
                  </VBtn>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="commission">
          <VRow>
            <VCol cols="12" lg="6">
              <VCard border flat>
                <VCardTitle>Commission Rules</VCardTitle>
                <VCardText>
                  <VSkeletonLoader v-if="tabLoading.commission" type="table" />
                  <VAlert v-else-if="rules?.length === 0" color="info" variant="tonal">
                    No commission rules configured.
                  </VAlert>
                  <VTable v-else>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Basis</th>
                        <th>Effective</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rule in rules" :key="rule.id">
                        <td>{{ enumLabel(rule.commissionType) }}</td>
                        <td>
                          {{
                            rule.fixedAmountMinor
                              ? formatMoney(rule.fixedAmountMinor, rule.currencyCode ?? 'IDR')
                              : formatBasisPoints(rule.percentageBasisPoints)
                          }}
                        </td>
                        <td>{{ enumLabel(rule.basisType) }}</td>
                        <td>
                          {{ formatDate(rule.effectiveFrom) }} -
                          {{ formatDate(rule.effectiveUntil) }}
                        </td>
                        <td>{{ enumLabel(rule.lifecycleStatus) }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </VCol>
            <VCol cols="12" lg="6">
              <VCard border flat>
                <VCardTitle>Linked Rates</VCardTitle>
                <VCardText>
                  <VSkeletonLoader v-if="tabLoading.commission" type="table" />
                  <VAlert v-else-if="rates?.length === 0" color="info" variant="tonal">
                    No linked rates available.
                  </VAlert>
                  <VTable v-else>
                    <thead>
                      <tr>
                        <th>Rate Code</th>
                        <th>Service</th>
                        <th>Route</th>
                        <th>Rate</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rate in rates" :key="rate.id">
                        <td>{{ rate.rateCode }}</td>
                        <td>{{ enumLabel(rate.serviceType) }}</td>
                        <td>{{ empty(rate.route) }}</td>
                        <td>
                          {{ formatMoney(rate.baseRateMinor, rate.currencyCode) }} /
                          {{ enumLabel(rate.rateUnit) }}
                        </td>
                        <td>{{ rate.isActive ? 'Active' : 'Inactive' }}</td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VWindowItem>

        <VWindowItem value="contacts">
          <VCard border flat>
            <VCardTitle class="d-flex align-center">
              Contact Persons<VSpacer /><VBtn
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
                    <th>Department</th>
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
                    <td>{{ empty(contact.department) }}</td>
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
                        @click="deactivateContact(contact)"
                      />
                    </td>
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
                No activity found.
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
              <VSkeletonLoader v-if="tabLoading.history" type="table" />
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

      <AgentFormDialog v-model="editDialog" :record="editRecord" @saved="refreshDetail" />
      <VDialog v-model="lifecycleDialog" max-width="520">
        <VCard>
          <VCardTitle>{{ enumLabel(lifecycleAction) }}</VCardTitle>
          <VCardText>
            <VTextarea
              v-if="lifecycleAction !== 'activate' && lifecycleAction !== 'archive'"
              v-model="lifecycleReason"
              label="Reason"
              rows="3"
              variant="outlined"
            />
          </VCardText>
          <VCardActions>
            <VSpacer /><VBtn variant="text" @click="lifecycleDialog = false">Cancel</VBtn><VBtn color="primary" :loading="lifecycleSubmitting" @click="submitLifecycle">
              Submit
            </VBtn>
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
                <VTextField
                  v-model="contactForm.department"
                  label="Department"
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
                    'OPERATIONS',
                    'SALES',
                    'BOOKING',
                    'FINANCE',
                    'CONTRACT',
                    'OTHER'
                  ]"
                  label="Contact type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6" class="d-flex align-center ga-4">
                <VCheckbox v-model="contactForm.isPrimary" hide-details label="Primary" /><VCheckbox
                  v-model="contactForm.isActive"
                  hide-details
                  label="Active"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="contactForm.notes" label="Notes" rows="2" variant="outlined" />
              </VCol>
            </VRow>
          </VCardText>
          <VCardActions>
            <VSpacer /><VBtn variant="text" @click="contactDialog = false">Cancel</VBtn><VBtn color="primary" :loading="contactSubmitting" @click="submitContact">
              Save Contact
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>

    <VCard v-else border flat class="mt-4">
      <VCardText>
        <VAlert color="warning" variant="tonal" title="Agent not found">
          The requested commercial agent may have been removed or is no longer available.
        </VAlert>
        <VBtn class="mt-4" to="/master-data/agents" variant="text">Back to Agents</VBtn>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
.agent-detail {
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

.info-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8125rem;
}

.info-value {
  min-width: 0;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
  .info-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
