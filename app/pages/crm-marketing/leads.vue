<script setup lang="ts">
import { useCrmDummyData } from '../../composables/useCrmDummyData';
import type { Lead, LeadSource, LeadStatus, Sector, CustomerStatus } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { leads, addLead, updateLead, convertLeadToCustomer } = useCrmDummyData();

const search = ref('');
const sectorFilter = ref('All');
const sourceFilter = ref('All');
const statusFilter = ref('All');

const sectorOptions = ['All', 'Government', 'Church', 'Commercial'];
const sourceOptions = [
  'All',
  'Website',
  'Referral',
  'Exhibition',
  'Social Media',
  'WhatsApp',
  'Email',
  'Walk In'
];
const statusOptions = ['All', 'New', 'Contacted', 'Qualified', 'Lost'];

// Options used inside the Add/Edit form (without the "All" filter option)
const formSectorOptions: Sector[] = ['Government', 'Church', 'Commercial'];
const formSourceOptions: LeadSource[] = [
  'Website',
  'Referral',
  'Exhibition',
  'Social Media',
  'WhatsApp',
  'Email',
  'Walk In'
];
const formStatusOptions: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Lost'];

const filteredLeads = computed<Lead[]>(() =>
  leads.filter((l) => {
    const matchSearch =
      !search.value ||
      l.orgName.toLowerCase().includes(search.value.toLowerCase()) ||
      l.contactPerson.toLowerCase().includes(search.value.toLowerCase());
    const matchSector = sectorFilter.value === 'All' || l.sector === sectorFilter.value;
    const matchSource = sourceFilter.value === 'All' || l.source === sourceFilter.value;
    const matchStatus = statusFilter.value === 'All' || l.status === statusFilter.value;
    return matchSearch && matchSource && matchSector && matchStatus;
  })
);

const headers = [
  { title: 'Lead ID', key: 'id', width: 110 },
  { title: 'Organization', key: 'orgName', minWidth: 220 },
  { title: 'Sector', key: 'sector', width: 130 },
  { title: 'Contact', key: 'contactPerson', minWidth: 180 },
  { title: 'Lead Source', key: 'source', width: 140 },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Assigned Sales', key: 'assignedSales', width: 170 },
  { title: 'Created', key: 'createdDate', width: 130 },
  { title: '', key: 'action', sortable: false, align: 'end' as const, width: 130 }
];

function sectorColor(sector: string) {
  return { Government: 'primary', Church: 'success', Commercial: 'warning' }[sector] || 'default';
}
function sectorIcon(sector: string) {
  return (
    { Government: 'mdi-bank-outline', Church: 'mdi-church', Commercial: 'mdi-store-outline' }[
      sector
    ] || 'mdi-domain'
  );
}
function statusColor(status: string) {
  return (
    { New: 'primary', Contacted: 'warning', Qualified: 'success', Lost: 'error' }[status] ||
    'default'
  );
}
function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
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

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';
const emailRule = (v: string) => !v || /^\S+@\S+\.\S+$/.test(v) || 'Format email tidak valid';

// ---------------------------------------------------------------------
// ADD / EDIT LEAD
// ---------------------------------------------------------------------
type LeadFormState = Omit<Lead, 'id'>;

function emptyLeadForm(): LeadFormState {
  return {
    orgName: '',
    sector: 'Government',
    contactPerson: '',
    phone: '',
    email: '',
    source: 'Website',
    status: 'New',
    assignedSales: '',
    createdDate: todayFormatted()
  };
}

const showFormDialog = ref(false);
const formMode = ref<'add' | 'edit'>('add');
const leadForm = ref<LeadFormState>(emptyLeadForm());
const editingLeadId = ref<string | null>(null);
const leadFormRef = ref();

function openAddDialog() {
  formMode.value = 'add';
  editingLeadId.value = null;
  leadForm.value = emptyLeadForm();
  showFormDialog.value = true;
}

function openEditDialog(lead: Lead) {
  formMode.value = 'edit';
  editingLeadId.value = lead.id;
  leadForm.value = {
    orgName: lead.orgName,
    sector: lead.sector,
    contactPerson: lead.contactPerson,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    status: lead.status,
    assignedSales: lead.assignedSales,
    createdDate: lead.createdDate
  };
  showFormDialog.value = true;
}

async function submitLeadForm() {
  const { valid } = await leadFormRef.value.validate();
  if (!valid) return;

  if (formMode.value === 'add') {
    addLead({ ...leadForm.value });
    showSnackbar('Lead baru berhasil ditambahkan.');
  } else if (editingLeadId.value) {
    updateLead(editingLeadId.value, { ...leadForm.value });
    showSnackbar('Perubahan lead berhasil disimpan.');
  }
  showFormDialog.value = false;
}

// ---------------------------------------------------------------------
// VIEW LEAD
// ---------------------------------------------------------------------
const viewLead = ref<Lead | null>(null);
function openViewDialog(lead: Lead) {
  viewLead.value = lead;
}

function editFromView() {
  if (viewLead.value) {
    const lead = viewLead.value;
    viewLead.value = null;
    openEditDialog(lead);
  }
}

// ---------------------------------------------------------------------
// CONVERT TO CUSTOMER
// ---------------------------------------------------------------------
const provinceOptions = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Jambi',
  'Sumatera Selatan',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Gorontalo',
  'Sulawesi Barat',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat'
];

const convertLead = ref<Lead | null>(null);
const convertForm = ref({
  province: 'DKI Jakarta',
  status: 'Active' as CustomerStatus,
  totalProjects: 0,
  customerSince: String(new Date().getFullYear())
});
const convertFormRef = ref();

function openConvertDialog(lead: Lead) {
  convertLead.value = lead;
  convertForm.value = {
    province: 'DKI Jakarta',
    status: 'Active',
    totalProjects: 0,
    customerSince: String(new Date().getFullYear())
  };
}

async function submitConvert() {
  if (!convertLead.value) return;
  const { valid } = await convertFormRef.value.validate();
  if (!valid) return;

  const customer = convertLeadToCustomer(convertLead.value, { ...convertForm.value });
  showSnackbar(`Lead berhasil dikonversi menjadi customer ${customer.id}.`);
  convertLead.value = null;
}

// ---------------------------------------------------------------------
// SNACKBAR
// ---------------------------------------------------------------------
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
      title="Leads"
      description="Seluruh calon customer dari berbagai sektor."
      @export="() => {}"
    />
    <CrmSubNav />

    <VCard class="mb-6" variant="flat" border>
      <VCardText class="d-flex flex-wrap ga-4 align-center pa-4">
        <VTextField
          v-model="search"
          label="Search lead / contact person"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
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
          v-model="sourceFilter"
          :items="sourceOptions"
          label="Lead Source"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
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
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">Add Lead</VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable
        :headers="headers"
        :items="filteredLeads"
        :items-per-page="10"
        item-value="id"
        class="crm-table"
        hover
      >
        <template #[`item.id`]="{ item }">
          <span class="text-medium-emphasis font-weight-medium">#{{ item.id }}</span>
        </template>

        <template #[`item.orgName`]="{ item }">
          <div class="d-flex flex-column">
            <span class="font-weight-medium">{{ item.orgName }}</span>
          </div>
        </template>

        <template #[`item.sector`]="{ item }">
          <VChip size="small" :color="sectorColor(item.sector)" variant="tonal">
            {{ item.sector }}
          </VChip>
        </template>

        <template #[`item.contactPerson`]="{ item }">
          <div class="d-flex align-center ga-2">
            <VAvatar size="28" color="primary" variant="tonal">
              <span class="text-caption font-weight-medium">{{
                initials(item.contactPerson)
              }}</span>
            </VAvatar>
            <div class="d-flex flex-column" style="line-height: 1.2">
              <span class="text-body-2">{{ item.contactPerson }}</span>
              <span class="text-caption text-medium-emphasis d-flex align-center ga-1">
                <VIcon icon="mdi-phone-outline" size="12" />{{ item.phone }}
              </span>
              <span class="text-caption text-medium-emphasis d-flex align-center ga-1">
                <VIcon icon="mdi-email-outline" size="12" />{{ item.email }}
              </span>
            </div>
          </div>
        </template>

        <template #[`item.status`]="{ item }">
          <VChip size="small" :color="statusColor(item.status)" variant="tonal" label>
            {{ item.status }}
          </VChip>
        </template>

        <template #[`item.assignedSales`]="{ item }">
          <span v-if="item.assignedSales" class="text-body-2">{{ item.assignedSales }}</span>
          <span v-else class="text-caption text-medium-emphasis font-italic">Unassigned</span>
        </template>

        <template #[`item.createdDate`]="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ formatDate(item.createdDate) }}</span>
        </template>

        <template #[`item.action`]="{ item }">
          <div class="d-flex ga-1 justify-end">
            <VTooltip text="View" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="mdi-eye-outline"
                  variant="text"
                  size="small"
                  density="comfortable"
                  @click="openViewDialog(item)"
                />
              </template>
            </VTooltip>
            <VTooltip text="Edit" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  density="comfortable"
                  @click="openEditDialog(item)"
                />
              </template>
            </VTooltip>
            <VTooltip v-if="item.status !== 'Lost'" text="Convert to Customer" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="mdi-account-convert-outline"
                  variant="text"
                  size="small"
                  density="comfortable"
                  color="primary"
                  @click="openConvertDialog(item)"
                />
              </template>
            </VTooltip>
          </div>
        </template>

        <template #no-data>
          <div class="d-flex flex-column align-center pa-8 text-medium-emphasis">
            <VIcon icon="mdi-account-search-outline" size="40" class="mb-2" />
            <span>Tidak ada lead yang cocok dengan filter saat ini.</span>
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- VIEW LEAD DIALOG -->
    <VDialog
      :model-value="!!viewLead"
      max-width="560"
      @update:model-value="(v: boolean) => !v && (viewLead = null)"
    >
      <VCard v-if="viewLead" rounded="lg" class="pa-2">
        <VCardTitle class="text-h6 d-flex justify-space-between align-center">
          <div class="d-flex align-center ga-2">
            <VAvatar size="36" :color="sectorColor(viewLead.sector)" variant="tonal">
              <VIcon :icon="sectorIcon(viewLead.sector)" size="18" />
            </VAvatar>
            {{ viewLead.orgName }}
          </div>
          <VChip size="small" :color="statusColor(viewLead.status)" variant="tonal">
            {{
              viewLead.status
            }}
          </VChip>
        </VCardTitle>
        <VCardSubtitle>#{{ viewLead.id }}</VCardSubtitle>
        <VCardText>
          <VRow>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Sector</div>
              <div class="font-weight-medium mb-3">{{ viewLead.sector }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Lead Source</div>
              <div class="font-weight-medium mb-3">{{ viewLead.source }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Contact Person</div>
              <div class="font-weight-medium mb-3">{{ viewLead.contactPerson }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Assigned Sales</div>
              <div class="font-weight-medium mb-3">
                {{ viewLead.assignedSales || 'Unassigned' }}
              </div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Phone</div>
              <div class="font-weight-medium mb-3 d-flex align-center ga-1">
                <VIcon icon="mdi-phone-outline" size="14" />{{ viewLead.phone }}
              </div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Email</div>
              <div class="font-weight-medium mb-3 d-flex align-center ga-1">
                <VIcon icon="mdi-email-outline" size="14" />{{ viewLead.email }}
              </div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Created Date</div>
              <div class="font-weight-medium mb-3">{{ formatDate(viewLead.createdDate) }}</div>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VBtn
            v-if="viewLead.status !== 'Lost'"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-account-convert-outline"
            @click="
              () => {
                const l = viewLead;
                viewLead = null;
                openConvertDialog(l as Lead);
              }
            "
          >
            Convert to Customer
          </VBtn>
          <VSpacer />
          <VBtn variant="tonal" prepend-icon="mdi-pencil-outline" @click="editFromView">Edit</VBtn>
          <VBtn variant="text" @click="viewLead = null">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ADD / EDIT LEAD DIALOG -->
    <VDialog v-model="showFormDialog" max-width="560" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">{{ formMode === 'add' ? 'Add Lead' : 'Edit Lead' }}</VCardTitle>
        <VCardText>
          <VForm ref="leadFormRef">
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="leadForm.orgName"
                  label="Organization Name*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="leadForm.sector"
                  :items="formSectorOptions"
                  label="Sector*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="leadForm.source"
                  :items="formSourceOptions"
                  label="Lead Source*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="leadForm.contactPerson"
                  label="Contact Person*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="leadForm.assignedSales"
                  label="Assigned Sales"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="leadForm.phone"
                  label="Phone*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="leadForm.email"
                  label="Email*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule, emailRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="leadForm.status"
                  :items="formStatusOptions"
                  label="Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="leadForm.createdDate"
                  label="Created Date"
                  variant="outlined"
                  density="comfortable"
                  hint="Format: dd MMM yyyy"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showFormDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitLeadForm">
            {{
              formMode === 'add' ? 'Save Lead' : 'Save Changes'
            }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- CONVERT TO CUSTOMER DIALOG -->
    <VDialog
      :model-value="!!convertLead"
      max-width="520"
      persistent
      @update:model-value="(v: boolean) => !v && (convertLead = null)"
    >
      <VCard v-if="convertLead" class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">Convert to Customer</VCardTitle>
        <VCardSubtitle>{{ convertLead.orgName }} — #{{ convertLead.id }}</VCardSubtitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Lengkapi informasi tambahan untuk menjadikan lead ini sebagai customer baru. Nama
            organisasi, kontak, email, telepon, dan sektor akan otomatis dibawa dari data lead.
          </p>
          <VForm ref="convertFormRef">
            <VRow dense>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="convertForm.province"
                  :items="provinceOptions"
                  label="Province*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="convertForm.status"
                  :items="['Active', 'Inactive']"
                  label="Customer Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="convertForm.totalProjects"
                  type="number"
                  min="0"
                  label="Total Projects"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="convertForm.customerSince"
                  label="Customer Since*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Contoh: 2026"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="convertLead = null">Cancel</VBtn>
          <VBtn
            color="primary"
            variant="flat"
            prepend-icon="mdi-account-convert-outline"
            @click="submitConvert"
          >
            Convert
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
.crm-table :deep(thead th) {
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.crm-table :deep(tbody td) {
  vertical-align: middle;
}

.crm-overview {
  padding: 8px 15px 10px;
}
</style>
