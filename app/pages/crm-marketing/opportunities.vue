<script setup lang="ts">
import { useCrmDummyData, formatIDR } from '../../composables/useCrmDummyData';
import type { Opportunity } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { opportunities, addOpportunity } = useCrmDummyData();

const search = ref('');
const sectorFilter = ref('All');
const stageFilter = ref('All');
const ownerFilter = ref('All');

const sectorOptions = ['All', 'Government', 'Church', 'Commercial'];
const stageOptions = [
  'All',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Quotation',
  'Contract',
  'Won',
  'Lost'
];
const ownerOptions = computed(() => [
  'All',
  ...Array.from(new Set(opportunities.map((o) => o.salesOwner)))
]);

const formSectorOptions: Opportunity['sector'][] = ['Government', 'Church', 'Commercial'];
const formStageOptions: Opportunity['stage'][] = [
  'Qualification',
  'Proposal',
  'Negotiation',
  'Quotation',
  'Contract',
  'Won',
  'Lost'
];

const filtered = computed<Opportunity[]>(() =>
  opportunities.filter((o) => {
    const matchSearch =
      !search.value ||
      o.name.toLowerCase().includes(search.value.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.value.toLowerCase());
    const matchSector = sectorFilter.value === 'All' || o.sector === sectorFilter.value;
    const matchStage = stageFilter.value === 'All' || o.stage === stageFilter.value;
    const matchOwner = ownerFilter.value === 'All' || o.salesOwner === ownerFilter.value;
    return matchSearch && matchSector && matchStage && matchOwner;
  })
);

const totalOpportunities = computed(() => opportunities.length);
const potentialRevenue = computed(() =>
  opportunities.reduce((sum, o) => sum + o.estimatedValue, 0)
);
const avgDealSize = computed(() => potentialRevenue.value / (totalOpportunities.value || 1));
const winRate = computed(() => {
  const won = opportunities.filter((o) => o.stage === 'Won').length;
  const closed = opportunities.filter((o) => o.stage === 'Won' || o.stage === 'Lost').length;
  return closed ? Math.round((won / closed) * 100) : 0;
});

const kpis = computed(() => [
  {
    label: 'Total Opportunities',
    value: totalOpportunities.value,
    icon: 'mdi-target',
    color: '#2563EB',
    bg: '#DBEAFE'
  },
  {
    label: 'Potential Revenue',
    value: formatIDR(potentialRevenue.value),
    icon: 'mdi-chart-line',
    color: '#059669',
    bg: '#D1FAE5'
  },
  {
    label: 'Average Deal Size',
    value: formatIDR(avgDealSize.value),
    icon: 'mdi-cash-multiple',
    color: '#7C3AED',
    bg: '#EDE9FE'
  },
  {
    label: 'Win Rate',
    value: `${winRate.value}%`,
    icon: 'mdi-trophy-outline',
    color: '#D97706',
    bg: '#FEF3C7'
  }
]);

const headers = [
  { title: 'Opportunity ID', key: 'id' },
  { title: 'Opportunity Name', key: 'name' },
  { title: 'Customer', key: 'customer' },
  { title: 'Sector', key: 'sector' },
  { title: 'Estimated Value', key: 'value' },
  { title: 'Probability', key: 'probability' },
  { title: 'Stage', key: 'stage' },
  { title: 'Expected Closing', key: 'expectedClosing' },
  { title: 'Sales Owner', key: 'salesOwner' }
];

function sectorColor(sector: string) {
  return { Government: 'primary', Church: 'success', Commercial: 'warning' }[sector] || 'default';
}
function stageColor(stage: string) {
  return (
    {
      Qualification: 'default',
      Proposal: 'info',
      Negotiation: 'warning',
      Quotation: 'purple',
      Contract: 'primary',
      Won: 'success',
      Lost: 'error'
    }[stage] || 'default'
  );
}

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';

// ---------------------------------------------------------------------
// ADD OPPORTUNITY
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

type OpportunityFormState = Omit<Opportunity, 'id'>;

function emptyOpportunityForm(): OpportunityFormState {
  return {
    name: '',
    customer: '',
    sector: 'Government',
    estimatedValue: 0,
    probability: 50,
    stage: 'Qualification',
    expectedClosing: todayFormatted(),
    salesOwner: ''
  };
}

const showAddDialog = ref(false);
const opportunityForm = ref<OpportunityFormState>(emptyOpportunityForm());
const opportunityFormRef = ref();

function openAddDialog() {
  opportunityForm.value = emptyOpportunityForm();
  showAddDialog.value = true;
}

async function submitOpportunityForm() {
  const { valid } = await opportunityFormRef.value.validate();
  if (!valid) return;

  addOpportunity({ ...opportunityForm.value });
  showSnackbar('Opportunity baru berhasil ditambahkan.');
  showAddDialog.value = false;
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
      title="Opportunities"
      description="Seluruh peluang penjualan aktif dan historis."
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
          label="Search opportunity / customer"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
          style="min-width: 240px; flex: 1"
        />
        <VSelect
          v-model="sectorFilter"
          :items="sectorOptions"
          label="Sector"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 170px"
        />
        <VSelect
          v-model="stageFilter"
          :items="stageOptions"
          label="Stage"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VSelect
          v-model="ownerFilter"
          :items="ownerOptions"
          label="Sales Owner"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 190px"
        />
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">Add Opportunity</VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable :headers="headers" :items="filtered" :items-per-page="10" class="crm-table">
        <template #[`item.sector`]="{ item }">
          <VChip size="small" :color="sectorColor(item.sector)" variant="tonal">
            {{ item.sector }}
          </VChip>
        </template>
        <template #[`item.value`]="{ item }">{{ formatIDR(item.estimatedValue) }}</template>
        <template #[`item.probability`]="{ item }">
          <div class="d-flex align-center ga-2" style="min-width: 120px">
            <VProgressLinear
              :model-value="item.probability"
              height="8"
              rounded
              color="primary"
              style="max-width: 80px"
            />
            <span class="text-caption">{{ item.probability }}%</span>
          </div>
        </template>
        <template #[`item.stage`]="{ item }">
          <VChip size="small" :color="stageColor(item.stage)" variant="tonal">
            {{ item.stage }}
          </VChip>
        </template>
      </VDataTable>
    </VCard>

    <!-- ADD OPPORTUNITY DIALOG -->
    <VDialog v-model="showAddDialog" max-width="600" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">Add Opportunity</VCardTitle>
        <VCardText>
          <VForm ref="opportunityFormRef">
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="opportunityForm.name"
                  label="Opportunity Name*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="opportunityForm.customer"
                  label="Customer*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="opportunityForm.sector"
                  :items="formSectorOptions"
                  label="Sector*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="opportunityForm.estimatedValue"
                  type="number"
                  min="0"
                  label="Estimated Value (IDR)*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="opportunityForm.salesOwner"
                  label="Sales Owner*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="opportunityForm.stage"
                  :items="formStageOptions"
                  label="Stage*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="opportunityForm.expectedClosing"
                  label="Expected Closing*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Format: dd MMM yyyy"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12">
                <div class="text-caption text-medium-emphasis mb-1">
                  Probability: {{ opportunityForm.probability }}%
                </div>
                <VSlider
                  v-model="opportunityForm.probability"
                  min="0"
                  max="100"
                  step="5"
                  thumb-label
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showAddDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitOpportunityForm">
            Save Opportunity
          </VBtn>
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
