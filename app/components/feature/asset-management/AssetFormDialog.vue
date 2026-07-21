<script setup lang="ts">
import type { Asset, AssetCategory, AssetStatus } from '../../../data/assetManagementData';
import { locations, departments } from '../../../data/assetManagementData';

const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  asset: Asset | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', asset: Asset): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

const categories: AssetCategory[] = [
  'Vehicle',
  'GSE',
  'IT Equipment',
  'Building',
  'Machinery',
  'Furniture & Fixture'
];
const statuses: AssetStatus[] = ['Active', 'Maintenance', 'Idle', 'Disposed'];

const categoryPrefix: Record<AssetCategory, string> = {
  Vehicle: 'VEH',
  GSE: 'GSE',
  'IT Equipment': 'IT',
  Building: 'BLD',
  Machinery: 'MCH',
  'Furniture & Fixture': 'FUR'
};

function emptyForm(): Asset {
  return {
    code: '',
    name: '',
    category: 'Vehicle',
    brand: '',
    model: '',
    serialNumber: '',
    location: locations[0],
    department: departments[0],
    pic: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseValue: 0,
    usefulLifeYears: 5,
    monthlyDepreciation: 0,
    bookValue: 0,
    status: 'Active'
  };
}

const form = ref<Asset>(emptyForm());
const hasInsurance = ref(false);

watch(
  () => [props.modelValue, props.asset, props.mode] as const,
  ([isOpen, asset, mode]) => {
    if (!isOpen) return;
    if (mode === 'edit' && asset) {
      form.value = { ...asset, insurance: asset.insurance ? { ...asset.insurance } : undefined };
      hasInsurance.value = !!asset.insurance;
    } else {
      form.value = emptyForm();
      hasInsurance.value = false;
    }
  },
  { immediate: true }
);

watch(hasInsurance, (checked) => {
  if (checked && !form.value.insurance) {
    form.value.insurance = {
      company: '',
      policyNumber: '',
      coverage: 0,
      premium: 0,
      expiryDate: new Date().toISOString().slice(0, 10)
    };
  }
});

function autoCalcDepreciation() {
  const months = Math.max(form.value.usefulLifeYears, 1) * 12;
  form.value.monthlyDepreciation = Math.round(form.value.purchaseValue / months);
  if (props.mode === 'create') {
    form.value.bookValue = form.value.purchaseValue;
  }
}

function generateCode(category: AssetCategory) {
  const prefix = categoryPrefix[category] ?? 'AST';
  const num = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}-${num}`;
}

const isValid = computed(
  () =>
    form.value.name.trim().length > 0 &&
    form.value.brand.trim().length > 0 &&
    form.value.purchaseValue >= 0
);

function handleSave() {
  if (!isValid.value) return;

  const payload: Asset = {
    ...form.value,
    code: props.mode === 'create' ? generateCode(form.value.category) : form.value.code,
    insurance: hasInsurance.value
      ? {
          company: form.value.insurance?.company ?? '',
          policyNumber: form.value.insurance?.policyNumber ?? '',
          coverage: form.value.insurance?.coverage ?? 0,
          premium: form.value.insurance?.premium ?? 0,
          expiryDate: form.value.insurance?.expiryDate ?? new Date().toISOString().slice(0, 10)
        }
      : undefined
  };

  emit('save', payload);
  open.value = false;
}
</script>

<template>
  <VDialog v-model="open" max-width="680" scrollable>
    <VCard rounded="lg">
      <div class="d-flex align-center justify-space-between pa-5 pb-3">
        <div class="text-h6 font-weight-bold">
          {{ mode === 'create' ? 'Add Asset' : 'Edit Asset' }}
        </div>
        <VBtn icon="mdi-close" variant="text" size="small" @click="open = false" />
      </div>
      <VDivider />

      <VAlert type="info" variant="tonal" density="compact" class="mx-5 mt-4" rounded="lg">
        Mode demo — perubahan hanya disimpan sementara di sesi ini dan tidak dikirim ke server.
      </VAlert>

      <VCardText style="max-height: 60vh">
        <VRow dense class="mt-1">
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.name"
              label="Asset Name"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VSelect
              v-model="form.category"
              :items="categories"
              label="Category"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField v-model="form.brand" label="Brand" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField v-model="form.model" label="Model" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.serialNumber"
              label="Serial Number"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField v-model="form.pic" label="PIC" variant="outlined" density="compact" />
          </VCol>
          <VCol cols="12" sm="6">
            <VSelect
              v-model="form.location"
              :items="locations"
              label="Location"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VSelect
              v-model="form.department"
              :items="departments"
              label="Department"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.purchaseDate"
              type="date"
              label="Purchase Date"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VSelect
              v-model="form.status"
              :items="statuses"
              label="Status"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="form.purchaseValue"
              type="number"
              label="Purchase Value (IDR)"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="form.usefulLifeYears"
              type="number"
              label="Useful Life (years)"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="form.monthlyDepreciation"
              type="number"
              label="Monthly Depreciation (IDR)"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6" class="d-flex align-center">
            <VBtn
              variant="tonal"
              size="small"
              prepend-icon="mdi-calculator-variant-outline"
              @click="autoCalcDepreciation"
            >
              Auto-calculate
            </VBtn>
          </VCol>
        </VRow>

        <VDivider class="my-2" />

        <VCheckbox
          v-model="hasInsurance"
          label="Asset has insurance"
          density="compact"
          hide-details
        />

        <VRow v-if="hasInsurance" dense class="mt-1">
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.insurance!.company"
              label="Insurance Company"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.insurance!.policyNumber"
              label="Policy Number"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="form.insurance!.coverage"
              type="number"
              label="Coverage (IDR)"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="form.insurance!.premium"
              type="number"
              label="Premium (IDR)"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="form.insurance!.expiryDate"
              type="date"
              label="Expiry Date"
              variant="outlined"
              density="compact"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="text" @click="open = false">Cancel</VBtn>
        <VBtn color="primary" :disabled="!isValid" @click="handleSave">
          {{ mode === 'create' ? 'Add Asset' : 'Save Changes' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
