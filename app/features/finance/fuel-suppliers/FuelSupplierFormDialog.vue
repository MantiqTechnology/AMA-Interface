<script setup lang="ts">
import type { FuelSupplierDto, FuelSupplierInput } from '#shared/features/finance/fuel-suppliers';
import StationSelect from '../../operations/stations/StationSelect.vue';
import CurrencySelect from '../currencies/CurrencySelect.vue';
const props = defineProps<{ modelValue: boolean; record?: FuelSupplierDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: FuelSupplierDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<FuelSupplierInput>({
  supplierCode: '',
  supplierName: '',
  stationId: '',
  fuelType: 'AVTUR',
  referencePricePerLitre: 0,
  currencyId: '',
  contactPerson: null,
  phone: null
});
const required = (label: string) => (value: unknown) =>
  Array.isArray(value)
    ? value.length > 0 || `${label} is required`
    : value !== null && value !== ''
      ? true
      : `${label} is required`;
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    serverError.value = '';
    Object.assign(form, {
      supplierCode: props.record
        ? (props.record.supplierCode as FuelSupplierInput['supplierCode'])
        : '',
      supplierName: props.record
        ? (props.record.supplierName as FuelSupplierInput['supplierName'])
        : '',
      stationId: props.record ? (props.record.stationId as FuelSupplierInput['stationId']) : '',
      fuelType: props.record ? (props.record.fuelType as FuelSupplierInput['fuelType']) : 'AVTUR',
      referencePricePerLitre: props.record
        ? (props.record.referencePricePerLitre as FuelSupplierInput['referencePricePerLitre'])
        : 0,
      currencyId: props.record ? (props.record.currencyId as FuelSupplierInput['currencyId']) : '',
      contactPerson: props.record
        ? (props.record.contactPerson as FuelSupplierInput['contactPerson'])
        : null,
      phone: props.record ? (props.record.phone as FuelSupplierInput['phone']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<FuelSupplierDto>(
      props.record
        ? '/api/master-data/fuel-suppliers/' + props.record.id
        : '/api/master-data/fuel-suppliers',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save fuel suppliers.';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <VDialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Fuel Suppliers</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.supplierCode"
                label="Supplier code"
                :rules="[required('Supplier code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.supplierName"
                label="Supplier name"
                :rules="[required('Supplier name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.stationId" label="Station" required />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.fuelType"
                :items="['AVTUR', 'AVGAS']"
                label="Fuel type"
                :rules="[required('Fuel type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.referencePricePerLitre"
                label="Reference price per litre"
                :rules="[required('Reference price per litre')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <CurrencySelect v-model="form.currencyId" label="Currency" required />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contactPerson"
                label="Contact person"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.phone" label="Phone" type="text" variant="outlined" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText><VDivider /><VCardActions>
        <VSpacer /><VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn><VBtn
          color="primary"
          :loading="submitting"
          prepend-icon="mdi-content-save"
          @click="submit"
        >
          Save fuel suppliers
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
