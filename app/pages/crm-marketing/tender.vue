<script setup lang="ts">
import { useCrmDummyData, formatIDR } from '../../composables/useCrmDummyData';
import type { Tender } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { tenders, addTender } = useCrmDummyData();

const search = ref('');
const sectorFilter = ref('All');
const statusFilter = ref('All');
const closingDate = ref('');

const sectorOptions = ['All', 'Government', 'Church'];
const statusOptions = [
  'All',
  'Open',
  'Preparing',
  'Submitted',
  'Evaluation',
  'Won',
  'Lost',
  'Cancelled'
];

const formSectorOptions: Tender['sector'][] = ['Government', 'Church'];
const formStatusOptions: Tender['status'][] = [
  'Open',
  'Preparing',
  'Submitted',
  'Evaluation',
  'Won',
  'Lost',
  'Cancelled'
];

const filtered = computed<Tender[]>(() =>
  tenders.filter((t: Tender) => {
    // Tambahkan : Tender
    const matchSearch =
      !search.value ||
      t.projectName.toLowerCase().includes(search.value.toLowerCase()) ||
      t.organization.toLowerCase().includes(search.value.toLowerCase());
    const matchSector = sectorFilter.value === 'All' || t.sector === sectorFilter.value;
    const matchStatus = statusFilter.value === 'All' || t.status === statusFilter.value;
    return matchSearch && matchSector && matchStatus;
  })
);

const kpis = computed(() => [
  {
    label: 'Open Tender',
    value: tenders.filter((t: Tender) => t.status === 'Open').length,
    icon: 'mdi-folder-open-outline',
    color: '#2563EB',
    bg: '#DBEAFE'
  },
  {
    label: 'Submitted',
    value: tenders.filter((t: Tender) => t.status === 'Submitted').length,
    icon: 'mdi-send-outline',
    color: '#7C3AED',
    bg: '#EDE9FE'
  },
  {
    label: 'Evaluation',
    value: tenders.filter((t: Tender) => t.status === 'Evaluation').length,
    icon: 'mdi-clipboard-search-outline',
    color: '#D97706',
    bg: '#FEF3C7'
  },
  {
    label: 'Won Tender',
    value: tenders.filter((t: Tender) => t.status === 'Won').length,
    icon: 'mdi-trophy-outline',
    color: '#059669',
    bg: '#D1FAE5'
  }
]);

const headers = [
  { title: 'Tender Number', key: 'number' },
  { title: 'Organization', key: 'organization' },
  { title: 'Sector', key: 'sector' },
  { title: 'Project Name', key: 'projectName' },
  { title: 'Estimated Budget', key: 'budget' },
  { title: 'Closing Date', key: 'closingDate' },
  { title: 'PIC', key: 'pic' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'action', sortable: false, align: 'end' as const }
];

function sectorColor(sector: string) {
  return sector === 'Government' ? 'primary' : 'success';
}
function statusColor(status: string) {
  return (
    {
      Open: 'success',
      Preparing: 'warning',
      Submitted: 'info',
      Evaluation: 'purple',
      Won: 'success',
      Lost: 'error',
      Cancelled: 'default'
    }[status] || 'default'
  );
}

const detail = ref<Tender | null>(null);
function openDetail(item: Tender) {
  detail.value = item;
}

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';

// ---------------------------------------------------------------------
// ADD TENDER
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

type TenderFormState = Omit<Tender, 'id'> & { documentsInput: string };

function emptyTenderForm(): TenderFormState {
  return {
    number: '',
    organization: '',
    sector: 'Government',
    projectName: '',
    estimatedBudget: 0,
    closingDate: todayFormatted(),
    pic: '',
    status: 'Open',
    requirement: '',
    timeline: '',
    proposalProgress: 0,
    documents: [],
    documentsInput: ''
  };
}

const showAddDialog = ref(false);
const tenderForm = ref<TenderFormState>(emptyTenderForm());
const tenderFormRef = ref();

function openAddDialog() {
  tenderForm.value = emptyTenderForm();
  showAddDialog.value = true;
}

async function submitTenderForm() {
  const { valid } = await tenderFormRef.value.validate();
  if (!valid) return;

  const { documentsInput, ...payload } = tenderForm.value;
  const documents = documentsInput
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  addTender({ ...payload, documents });
  showSnackbar('Tender baru berhasil ditambahkan.');
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
      title="Tender"
      description="Manajemen tender untuk sektor Government dan Church."
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
          label="Search tender / organization"
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
          v-model="statusFilter"
          :items="statusOptions"
          label="Tender Status"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VTextField
          v-model="closingDate"
          type="date"
          label="Closing Date"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">Add Tender</VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable :headers="headers" :items="filtered" :items-per-page="10" class="crm-table">
        <template #[`item.sector`]="{ item }">
          <VChip size="small" :color="sectorColor(item.sector)" variant="tonal">
            {{ item.sector }}
          </VChip>
        </template>
        <template #[`item.budget`]="{ item }">{{ formatIDR(item.estimatedBudget) }}</template>
        <template #[`item.status`]="{ item }">
          <VChip size="small" :color="statusColor(item.status)" variant="tonal">
            {{ item.status }}
          </VChip>
        </template>
        <template #[`item.action`]="{ item }">
          <VBtn size="small" variant="text" color="primary" @click="openDetail(item)">Detail</VBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Tender Detail -->
    <VDialog
      :model-value="!!detail"
      max-width="640"
      @update:model-value="(v: boolean) => !v && (detail = null)"
    >
      <VCard v-if="detail" rounded="lg" class="pa-2">
        <VCardTitle class="text-h6 d-flex justify-space-between align-center">
          {{ detail.projectName }}
          <VChip size="small" :color="statusColor(detail.status)" variant="tonal">
            {{ detail.status }}
          </VChip>
        </VCardTitle>
        <VCardSubtitle>{{ detail.number }} — {{ detail.organization }}</VCardSubtitle>
        <VCardText>
          <VRow>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Estimated Budget</div>
              <div class="font-weight-medium mb-3">{{ formatIDR(detail.estimatedBudget) }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">PIC</div>
              <div class="font-weight-medium mb-3">{{ detail.pic }}</div>
            </VCol>
          </VRow>

          <div class="text-caption text-medium-emphasis">Requirement</div>
          <p class="mb-3">{{ detail.requirement }}</p>

          <div class="text-caption text-medium-emphasis">Timeline</div>
          <p class="mb-3">{{ detail.timeline }}</p>

          <div class="text-caption text-medium-emphasis mb-1">Proposal Progress</div>
          <VProgressLinear
            :model-value="detail.proposalProgress"
            height="10"
            rounded
            color="primary"
            class="mb-3"
          />

          <div class="text-caption text-medium-emphasis mb-1">Documents</div>
          <div v-if="detail.documents.length">
            <VChip
              v-for="doc in detail.documents"
              :key="doc"
              size="small"
              class="mr-2 mb-2"
              prepend-icon="mdi-paperclip"
            >
              {{ doc }}
            </VChip>
          </div>
          <p v-else class="text-medium-emphasis text-body-2">Belum ada dokumen diunggah.</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="detail = null">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ADD TENDER DIALOG -->
    <VDialog v-model="showAddDialog" max-width="620" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">Add Tender</VCardTitle>
        <VCardText>
          <VForm ref="tenderFormRef">
            <VRow dense>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.number"
                  label="Tender Number*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Contoh: TND/2026/07/009"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="tenderForm.sector"
                  :items="formSectorOptions"
                  label="Sector*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.organization"
                  label="Organization*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.projectName"
                  label="Project Name*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="tenderForm.estimatedBudget"
                  type="number"
                  min="0"
                  label="Estimated Budget (IDR)*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.pic"
                  label="PIC*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.closingDate"
                  label="Closing Date*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Format: dd MMM yyyy"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="tenderForm.status"
                  :items="formStatusOptions"
                  label="Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="tenderForm.requirement"
                  label="Requirement"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  auto-grow
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="tenderForm.timeline"
                  label="Timeline"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  auto-grow
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSlider
                  v-model="tenderForm.proposalProgress"
                  label="Proposal Progress"
                  min="0"
                  max="100"
                  step="5"
                  thumb-label
                  show-ticks="false"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="tenderForm.documentsInput"
                  label="Documents"
                  variant="outlined"
                  density="comfortable"
                  hint="Pisahkan nama file dengan koma, contoh: KAK.pdf, RAB.xlsx"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showAddDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitTenderForm">Save Tender</VBtn>
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
