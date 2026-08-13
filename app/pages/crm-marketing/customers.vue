<script setup lang="ts">
import { useCrmDummyData } from '../../composables/useCrmDummyData';
import type { Customer, Sector } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { customers, addCustomer, updateCustomer } = useCrmDummyData();

const search = ref('');
const sectorFilter = ref('All');
const provinceFilter = ref('All');

const sectorOptions = ['All', 'Government', 'Church', 'Commercial'];
const provinceOptions = computed(() => [
  'All',
  ...Array.from(new Set(customers.map((c) => c.province)))
]);

const formSectorOptions: Sector[] = ['Government', 'Church', 'Commercial'];
const formProvinceOptions = [
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

const filtered = computed<Customer[]>(() =>
  customers.filter((c) => {
    const matchSearch = !search.value || c.name.toLowerCase().includes(search.value.toLowerCase());
    const matchSector = sectorFilter.value === 'All' || c.sector === sectorFilter.value;
    const matchProvince = provinceFilter.value === 'All' || c.province === provinceFilter.value;
    return matchSearch && matchSector && matchProvince;
  })
);

const headers = [
  { title: 'Customer ID', key: 'id' },
  { title: 'Customer Name', key: 'name' },
  { title: 'Sector', key: 'sector' },
  { title: 'Contact Person', key: 'contactPerson' },
  { title: 'Email', key: 'email' },
  { title: 'Phone', key: 'phone' },
  { title: 'Total Projects', key: 'totalProjects' },
  { title: 'Customer Since', key: 'customerSince' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'action', sortable: false, align: 'end' as const, width: 90 }
];

function sectorColor(sector: string) {
  return { Government: 'primary', Church: 'success', Commercial: 'warning' }[sector] || 'default';
}
function statusColor(status: string) {
  return status === 'Active' ? 'success' : 'default';
}

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';
const emailRule = (v: string) => !v || /^\S+@\S+\.\S+$/.test(v) || 'Format email tidak valid';

// ---------------------------------------------------------------------
// ADD / EDIT CUSTOMER
// ---------------------------------------------------------------------
type CustomerFormState = Omit<Customer, 'id'>;

function emptyCustomerForm(): CustomerFormState {
  return {
    name: '',
    sector: 'Government',
    contactPerson: '',
    email: '',
    phone: '',
    totalProjects: 0,
    customerSince: String(new Date().getFullYear()),
    province: 'DKI Jakarta',
    status: 'Active'
  };
}

const showFormDialog = ref(false);
const formMode = ref<'add' | 'edit'>('add');
const customerForm = ref<CustomerFormState>(emptyCustomerForm());
const editingCustomerId = ref<string | null>(null);
const customerFormRef = ref();

function openAddDialog() {
  formMode.value = 'add';
  editingCustomerId.value = null;
  customerForm.value = emptyCustomerForm();
  showFormDialog.value = true;
}

function openEditDialog(customer: Customer) {
  formMode.value = 'edit';
  editingCustomerId.value = customer.id;
  customerForm.value = {
    name: customer.name,
    sector: customer.sector,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    totalProjects: customer.totalProjects,
    customerSince: customer.customerSince,
    province: customer.province,
    status: customer.status
  };
  showFormDialog.value = true;
}

async function submitCustomerForm() {
  const { valid } = await customerFormRef.value.validate();
  if (!valid) return;

  if (formMode.value === 'add') {
    addCustomer({ ...customerForm.value });
    showSnackbar('Customer baru berhasil ditambahkan.');
  } else if (editingCustomerId.value) {
    updateCustomer(editingCustomerId.value, { ...customerForm.value });
    showSnackbar('Perubahan customer berhasil disimpan.');
  }
  showFormDialog.value = false;
}

const viewCustomer = ref<Customer | null>(null);
function openViewDialog(customer: Customer) {
  viewCustomer.value = customer;
}
function editFromView() {
  if (viewCustomer.value) {
    const customer = viewCustomer.value;
    viewCustomer.value = null;
    openEditDialog(customer);
  }
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
      title="Customers"
      description="Master seluruh customer perusahaan."
      @export="() => {}"
    />
    <CrmSubNav />
    <VCard class="mb-6" variant="flat" border>
      <VCardText class="d-flex flex-wrap ga-4 align-center pa-4">
        <VTextField
          v-model="search"
          label="Search customer"
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
          v-model="provinceFilter"
          :items="provinceOptions"
          label="Province"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">Add Customer</VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable :headers="headers" :items="filtered" :items-per-page="10" class="crm-table">
        <template #[`item.sector`]="{ item }">
          <VChip size="small" :color="sectorColor(item.sector)" variant="tonal">
            {{ item.sector }}
          </VChip>
        </template>
        <template #[`item.status`]="{ item }">
          <VChip size="small" :color="statusColor(item.status)" variant="tonal">
            {{ item.status }}
          </VChip>
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
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- VIEW CUSTOMER DIALOG -->
    <VDialog
      :model-value="!!viewCustomer"
      max-width="560"
      @update:model-value="(v: boolean) => !v && (viewCustomer = null)"
    >
      <VCard v-if="viewCustomer" rounded="lg" class="pa-2">
        <VCardTitle class="text-h6 d-flex justify-space-between align-center">
          {{ viewCustomer.name }}
          <VChip size="small" :color="statusColor(viewCustomer.status)" variant="tonal">
            {{ viewCustomer.status }}
          </VChip>
        </VCardTitle>
        <VCardSubtitle>#{{ viewCustomer.id }}</VCardSubtitle>
        <VCardText>
          <VRow>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Sector</div>
              <div class="font-weight-medium mb-3">{{ viewCustomer.sector }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Province</div>
              <div class="font-weight-medium mb-3">{{ viewCustomer.province }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Contact Person</div>
              <div class="font-weight-medium mb-3">{{ viewCustomer.contactPerson }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Total Projects</div>
              <div class="font-weight-medium mb-3">{{ viewCustomer.totalProjects }}</div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Phone</div>
              <div class="font-weight-medium mb-3 d-flex align-center ga-1">
                <VIcon icon="mdi-phone-outline" size="14" />{{ viewCustomer.phone }}
              </div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Email</div>
              <div class="font-weight-medium mb-3 d-flex align-center ga-1">
                <VIcon icon="mdi-email-outline" size="14" />{{ viewCustomer.email }}
              </div>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Customer Since</div>
              <div class="font-weight-medium mb-3">{{ viewCustomer.customerSince }}</div>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="tonal" prepend-icon="mdi-pencil-outline" @click="editFromView">Edit</VBtn>
          <VBtn variant="text" @click="viewCustomer = null">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ADD / EDIT CUSTOMER DIALOG -->
    <VDialog v-model="showFormDialog" max-width="560" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">
          {{ formMode === 'add' ? 'Add Customer' : 'Edit Customer' }}
        </VCardTitle>
        <VCardText>
          <VForm ref="customerFormRef">
            <VRow dense>
              <VCol cols="12">
                <VTextField
                  v-model="customerForm.name"
                  label="Customer Name*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="customerForm.sector"
                  :items="formSectorOptions"
                  label="Sector*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="customerForm.province"
                  :items="formProvinceOptions"
                  label="Province*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="customerForm.contactPerson"
                  label="Contact Person*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="customerForm.phone"
                  label="Phone*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="customerForm.email"
                  label="Email*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule, emailRule]"
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="customerForm.totalProjects"
                  type="number"
                  min="0"
                  label="Total Projects"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model="customerForm.customerSince"
                  label="Customer Since*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Contoh: 2026"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VSelect
                  v-model="customerForm.status"
                  :items="['Active', 'Inactive']"
                  label="Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showFormDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitCustomerForm">
            {{ formMode === 'add' ? 'Save Customer' : 'Save Changes' }}
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
</style>
