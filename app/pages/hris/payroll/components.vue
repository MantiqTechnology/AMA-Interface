<script setup lang="ts">
const { data: compData, refresh: refreshComponents } = await useAsyncData(
  'payroll-components',
  () => fetchApi<any[]>('/api/hris/payroll/components')
);
const components = computed(() => compData.value ?? []);

const { data: alwData, refresh: refreshRates } = await useAsyncData('allowance-rates', () =>
  fetchApi<any[]>('/api/hris/payroll/allowance-rates')
);
const allowanceRates = computed(() => alwData.value ?? []);

// Rate Modal State
const rateDialog = ref(false);
const editingRate = ref<any>(null);
const rateForm = ref({
  componentId: '',
  positionTitle: '',
  grade: '',
  ratePerHour: 0,
  ratePerMonth: 0,
  effectiveDate: new Date().toISOString().slice(0, 10)
});
const savingRate = ref(false);

// Component Modal State
const compDialog = ref(false);
const editingComp = ref<any>(null);
const compForm = ref({
  componentCode: '',
  componentName: '',
  componentType: 'EARNING' as 'EARNING' | 'DEDUCTION' | 'TAX',
  isTaxable: true,
  isFixed: true,
  formulaType: 'FIXED' as 'FIXED' | 'HOURS_BASED' | 'PERCENTAGE' | 'FORMULA',
  defaultAmount: 0,
  sortOrder: 0
});
const savingComp = ref(false);

function openAddRateModal() {
  editingRate.value = null;
  const flightComp = components.value.find((c: any) => c.componentCode === 'FLIGHT_ALLOWANCE');
  rateForm.value = {
    componentId: flightComp ? flightComp.id : components.value[0]?.id || '',
    positionTitle: '',
    grade: '',
    ratePerHour: 400000,
    ratePerMonth: 0,
    effectiveDate: new Date().toISOString().slice(0, 10)
  };
  rateDialog.value = true;
}

function openEditRateModal(item: any) {
  editingRate.value = item;
  rateForm.value = {
    componentId: item.componentId,
    positionTitle: item.positionTitle,
    grade: item.grade || '',
    ratePerHour: item.ratePerHour,
    ratePerMonth: item.ratePerMonth || 0,
    effectiveDate: item.effectiveDate
  };
  rateDialog.value = true;
}

async function handleSaveRate() {
  savingRate.value = true;
  try {
    if (editingRate.value) {
      await fetchApi(`/api/hris/payroll/allowance-rates/${editingRate.value.id}`, {
        method: 'PUT',
        body: rateForm.value
      });
    } else {
      await fetchApi('/api/hris/payroll/allowance-rates', {
        method: 'POST',
        body: rateForm.value
      });
    }
    rateDialog.value = false;
    refreshRates();
  } catch (err: any) {
    alert(err.message || 'Failed to save allowance rate.');
  } finally {
    savingRate.value = false;
  }
}

async function handleDeleteRate(item: any) {
  if (!confirm(`Delete allowance rate for ${item.positionTitle}?`)) return;
  try {
    await fetchApi(`/api/hris/payroll/allowance-rates/${item.id}`, { method: 'DELETE' });
    refreshRates();
  } catch (err: any) {
    alert(err.message || 'Failed to delete allowance rate.');
  }
}

function openAddCompModal() {
  editingComp.value = null;
  compForm.value = {
    componentCode: '',
    componentName: '',
    componentType: 'EARNING',
    isTaxable: true,
    isFixed: true,
    formulaType: 'FIXED',
    defaultAmount: 0,
    sortOrder: components.value.length + 1
  };
  compDialog.value = true;
}

function openEditCompModal(item: any) {
  editingComp.value = item;
  compForm.value = {
    componentCode: item.componentCode,
    componentName: item.componentName,
    componentType: item.componentType,
    isTaxable: item.isTaxable,
    isFixed: item.isFixed,
    formulaType: item.formulaType || 'FIXED',
    defaultAmount: item.defaultAmount || 0,
    sortOrder: item.sortOrder || 0
  };
  compDialog.value = true;
}

async function handleSaveComp() {
  savingComp.value = true;
  try {
    if (editingComp.value) {
      await fetchApi(`/api/hris/payroll/components/${editingComp.value.id}`, {
        method: 'PUT',
        body: compForm.value
      });
    } else {
      await fetchApi('/api/hris/payroll/components', {
        method: 'POST',
        body: compForm.value
      });
    }
    compDialog.value = false;
    refreshComponents();
  } catch (err: any) {
    alert(err.message || 'Failed to save payroll component.');
  } finally {
    savingComp.value = false;
  }
}

async function handleDeleteComp(item: any) {
  if (!confirm(`Delete component ${item.componentName}?`)) return;
  try {
    await fetchApi(`/api/hris/payroll/components/${item.id}`, { method: 'DELETE' });
    refreshComponents();
  } catch (err: any) {
    alert(err.message || 'Failed to delete component.');
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

const rateHeaders = [
  { title: 'Allowance Component', key: 'componentName' },
  { title: 'Position / Job Title', key: 'positionTitle' },
  { title: 'Rate per Block Hour', key: 'ratePerHour' },
  { title: 'Monthly Base Rate', key: 'ratePerMonth' },
  { title: 'Effective Date', key: 'effectiveDate' },
  { title: 'Actions', key: 'actions', sortable: false }
];

const compHeaders = [
  { title: 'Code', key: 'componentCode' },
  { title: 'Component Name', key: 'componentName' },
  { title: 'Type', key: 'componentType' },
  { title: 'Tax Treatment', key: 'isTaxable' },
  { title: 'Formula', key: 'formulaType' },
  { title: 'Actions', key: 'actions', sortable: false }
];
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">
          Payroll Components & Allowance Settings
        </h1>
        <p class="text-subtitle-1 text-secondary">
          Configure flight allowance rates per position title and manage payroll component formulas
          (CRUD)
        </p>
      </div>
      <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/payroll">Back</VBtn>
    </div>

    <!-- Rate Tunjangan Per Posisi -->
    <VCard border class="mb-6">
      <VCardItem class="d-flex align-center justify-space-between py-3 px-4">
        <template #title>
          <div class="d-flex align-center ga-2 text-h6 font-weight-bold">
            <VIcon color="primary" icon="mdi-airplane-clock" />
            Flight & Position Allowance Rates Management
          </div>
        </template>
        <template #append>
          <VBtn prepend-icon="mdi-plus" color="primary" size="small" @click="openAddRateModal()">
            Add Position Rate
          </VBtn>
        </template>
      </VCardItem>
      <VDivider />
      <VDataTable :headers="rateHeaders" :items="allowanceRates">
        <template #item.componentName="{ item }">
          <span class="font-weight-bold text-primary">{{ item.componentName }}</span>
        </template>
        <template #item.positionTitle="{ item }">
          <VChip color="primary" size="small" variant="outlined">{{ item.positionTitle }}</VChip>
        </template>
        <template #item.ratePerHour="{ item }">
          <span class="font-weight-bold text-success">{{ formatCurrency(item.ratePerHour) }} / hour</span>
        </template>
        <template #item.ratePerMonth="{ item }">
          <span>{{ item.ratePerMonth ? formatCurrency(item.ratePerMonth) : '—' }}</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              size="small"
              variant="text"
              icon="mdi-pencil-outline"
              color="primary"
              @click="openEditRateModal(item)"
            />
            <VBtn
              size="small"
              variant="text"
              icon="mdi-delete-outline"
              color="error"
              @click="handleDeleteRate(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Master Komponen -->
    <VCard border>
      <VCardItem class="d-flex align-center justify-space-between py-3 px-4">
        <template #title>
          <div class="d-flex align-center ga-2 text-h6 font-weight-bold">
            <VIcon color="primary" icon="mdi-calculator-variant-outline" />
            Master Payroll Components
          </div>
        </template>
        <template #append>
          <VBtn prepend-icon="mdi-plus" color="primary" size="small" @click="openAddCompModal()">
            Add Component
          </VBtn>
        </template>
      </VCardItem>
      <VDivider />
      <VDataTable :headers="compHeaders" :items="components">
        <template #item.componentCode="{ item }">
          <span class="font-mono font-weight-bold text-primary">{{ item.componentCode }}</span>
        </template>
        <template #item.componentType="{ item }">
          <VChip
            :color="
              item.componentType === 'EARNING'
                ? 'success'
                : item.componentType === 'TAX'
                  ? 'warning'
                  : 'error'
            "
            size="small"
            variant="flat"
          >
            {{ item.componentType }}
          </VChip>
        </template>
        <template #item.isTaxable="{ item }">
          <span>{{ item.isTaxable ? 'Taxable (PPh 21 TER)' : 'Tax Exempt' }}</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              size="small"
              variant="text"
              icon="mdi-pencil-outline"
              color="primary"
              @click="openEditCompModal(item)"
            />
            <VBtn
              size="small"
              variant="text"
              icon="mdi-delete-outline"
              color="error"
              @click="handleDeleteComp(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Position Allowance Rate Modal -->
    <VDialog v-model="rateDialog" max-width="500">
      <VCard :title="editingRate ? 'Edit Position Allowance Rate' : 'Add Position Allowance Rate'">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12">
              <VSelect
                v-model="rateForm.componentId"
                label="Allowance Component"
                :items="components"
                item-title="componentName"
                item-value="id"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="rateForm.positionTitle"
                label="Position / Job Title"
                placeholder="Captain, First Officer, Chief of Pilot..."
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="rateForm.ratePerHour"
                label="Rate per Hour (IDR)"
                type="number"
                prefix="Rp"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="rateForm.ratePerMonth"
                label="Rate per Month (IDR)"
                type="number"
                prefix="Rp"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="rateForm.effectiveDate"
                label="Effective Date"
                type="date"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="rateDialog = false">Cancel</VBtn>
          <VBtn color="primary" :loading="savingRate" @click="handleSaveRate()">Save Rate</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Component Modal -->
    <VDialog v-model="compDialog" max-width="500">
      <VCard :title="editingComp ? 'Edit Payroll Component' : 'Add Payroll Component'">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="6">
              <VTextField
                v-model="compForm.componentCode"
                label="Component Code"
                placeholder="BONUS, THR..."
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VSelect
                v-model="compForm.componentType"
                label="Type"
                :items="['EARNING', 'DEDUCTION', 'TAX']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="compForm.componentName"
                label="Component Name"
                placeholder="Operational Bonus, THR..."
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VSelect
                v-model="compForm.formulaType"
                label="Formula Type"
                :items="['FIXED', 'HOURS_BASED', 'PERCENTAGE', 'FORMULA']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VSwitch
                v-model="compForm.isTaxable"
                label="Taxable (PPh 21)"
                color="primary"
                hide-details
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="compDialog = false">Cancel</VBtn>
          <VBtn color="primary" :loading="savingComp" @click="handleSaveComp()">
            Save Component
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
