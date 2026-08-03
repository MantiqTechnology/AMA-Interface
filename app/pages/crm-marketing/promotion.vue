<script setup lang="ts">
import { useCrmDummyData, formatIDR } from '../../composables/useCrmDummyData';
import type { Campaign } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { campaigns, addCampaign } = useCrmDummyData();

const search = ref('');
const typeFilter = ref('All');
const statusFilter = ref('All');
const dateRange = ref('');

const typeOptions = [
  'All',
  'Digital Ads',
  'Instagram',
  'Facebook',
  'Google Ads',
  'Email Marketing',
  'WhatsApp Blast',
  'Exhibition',
  'Seminar',
  'Webinar'
];
const statusOptions = ['All', 'Draft', 'Running', 'Completed', 'Cancelled'];

const formTypeOptions: Campaign['type'][] = [
  'Digital Ads',
  'Instagram',
  'Facebook',
  'Google Ads',
  'Email Marketing',
  'WhatsApp Blast',
  'Exhibition',
  'Seminar',
  'Webinar'
];
const formStatusOptions: Campaign['status'][] = ['Draft', 'Running', 'Completed', 'Cancelled'];

const filtered = computed<Campaign[]>(() =>
  campaigns.filter((c) => {
    const matchSearch = !search.value || c.name.toLowerCase().includes(search.value.toLowerCase());
    const matchType = typeFilter.value === 'All' || c.type === typeFilter.value;
    const matchStatus = statusFilter.value === 'All' || c.status === statusFilter.value;
    return matchSearch && matchType && matchStatus;
  })
);

const activeCampaigns = computed(() => campaigns.filter((c) => c.status === 'Running').length);
const totalBudget = computed(() => campaigns.reduce((sum, c) => sum + c.budget, 0));
const leadsGenerated = computed(() => campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0));
const avgConversion = computed(
  () =>
    Math.round((campaigns.reduce((sum, c) => sum + c.conversion, 0) / campaigns.length) * 10) / 10
);

const kpis = computed(() => [
  {
    label: 'Active Campaign',
    value: activeCampaigns.value,
    icon: 'mdi-bullhorn-outline',
    color: '#DC2626',
    bg: '#FEE2E2'
  },
  {
    label: 'Total Budget',
    value: formatIDR(totalBudget.value),
    icon: 'mdi-wallet-outline',
    color: '#2563EB',
    bg: '#DBEAFE'
  },
  {
    label: 'Leads Generated',
    value: leadsGenerated.value,
    icon: 'mdi-account-group',
    color: '#7C3AED',
    bg: '#EDE9FE'
  },
  {
    label: 'Conversion Rate',
    value: `${avgConversion.value}%`,
    icon: 'mdi-chart-line',
    color: '#059669',
    bg: '#D1FAE5'
  }
]);

const headers = [
  { title: 'Campaign Name', key: 'name' },
  { title: 'Target Market', key: 'targetMarket' },
  { title: 'Campaign Type', key: 'type' },
  { title: 'Budget', key: 'budget' },
  { title: 'Leads Generated', key: 'leadsGenerated' },
  { title: 'Conversion', key: 'conversion' },
  { title: 'Start Date', key: 'startDate' },
  { title: 'End Date', key: 'endDate' },
  { title: 'Status', key: 'status' }
];

function statusColor(status: string) {
  return (
    { Draft: 'default', Running: 'success', Completed: 'primary', Cancelled: 'error' }[status] ||
    'default'
  );
}

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';

// ---------------------------------------------------------------------
// CREATE CAMPAIGN
// ---------------------------------------------------------------------
function todayFormatted() {
  const d = new Date();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des'
  ];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

type CampaignFormState = Omit<Campaign, 'id'>;

function emptyCampaignForm(): CampaignFormState {
  return {
    name: '',
    targetMarket: '',
    type: 'Digital Ads',
    budget: 0,
    leadsGenerated: 0,
    conversion: 0,
    startDate: todayFormatted(),
    endDate: todayFormatted(),
    status: 'Draft'
  };
}

const showCreateDialog = ref(false);
const campaignForm = ref<CampaignFormState>(emptyCampaignForm());
const campaignFormRef = ref();

function openCreateDialog() {
  campaignForm.value = emptyCampaignForm();
  showCreateDialog.value = true;
}

async function submitCampaignForm() {
  const { valid } = await campaignFormRef.value.validate();
  if (!valid) return;

  addCampaign({ ...campaignForm.value });
  showSnackbar('Campaign baru berhasil dibuat.');
  showCreateDialog.value = false;
}

const snackbar = ref(false);
const snackbarText = ref('');
function showSnackbar(text: string) {
  snackbarText.value = text;
  snackbar.value = true;
}
</script>

<template>
  <div class="crm-overview">
    <CrmPageHeader
      style="margin-top: 14px"
      title="Promotion"
      description="Kampanye promosi untuk sektor Commercial."
      @export="() => {}"
    />
    <CrmSubNav />
    <VRow class="mb-6">
      <VCol v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" md="3">
        <VCard variant="flat" border rounded="lg">
          <VCardText class="d-flex justify-space-between align-center pa-4">
            <div>
              <div class="text-caption text-medium-emphasis mb-1">{{ kpi.label }}</div>
              <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
            </div>
            <div class="kpi-icon" :style="{ backgroundColor: kpi.bg, color: kpi.color }">
              <VIcon :icon="kpi.icon" size="20" />
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mb-6" variant="flat" border>
      <VCardText class="d-flex flex-wrap ga-4 align-center pa-4">
        <VTextField
          v-model="search"
          label="Search campaign"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
          style="min-width: 220px; flex: 1"
        />
        <VSelect
          v-model="typeFilter"
          :items="typeOptions"
          label="Campaign Type"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 190px"
        />
        <VSelect
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 160px"
        />
        <VTextField
          v-model="dateRange"
          type="date"
          label="Date Range"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          Create Campaign
        </VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable :headers="headers" :items="filtered" :items-per-page="10" class="crm-table">
        <template #[`item.budget`]="{ item }">{{ formatIDR(item.budget) }}</template>
        <template #[`item.conversion`]="{ item }">{{ item.conversion }}%</template>
        <template #[`item.status`]="{ item }">
          <VChip size="small" :color="statusColor(item.status)" variant="tonal">
            {{
              item.status
            }}
          </VChip>
        </template>
      </VDataTable>
    </VCard>

    <!-- CREATE CAMPAIGN DIALOG -->
    <VDialog v-model="showCreateDialog" max-width="600" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">Create Campaign</VCardTitle>
        <VCardText>
          <VForm ref="campaignFormRef">
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="campaignForm.name"
                  label="Campaign Name*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="campaignForm.targetMarket"
                  label="Target Market*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="campaignForm.type"
                  :items="formTypeOptions"
                  label="Campaign Type*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="campaignForm.budget"
                  type="number"
                  min="0"
                  label="Budget (IDR)*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="campaignForm.status"
                  :items="formStatusOptions"
                  label="Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="campaignForm.startDate"
                  label="Start Date*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Format: dd MMM yyyy"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="campaignForm.endDate"
                  label="End Date*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Format: dd MMM yyyy"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="campaignForm.leadsGenerated"
                  type="number"
                  min="0"
                  label="Leads Generated"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="campaignForm.conversion"
                  type="number"
                  min="0"
                  max="100"
                  label="Conversion (%)"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitCampaignForm">Save Campaign</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" color="success" timeout="3000" location="top">
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.crm-overview {
  padding: 8px 15px 10px;
}

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
