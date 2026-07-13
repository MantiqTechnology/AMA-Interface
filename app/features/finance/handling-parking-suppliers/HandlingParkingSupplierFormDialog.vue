<script setup lang="ts">
import type {
  HandlingParkingSupplierDto,
  HandlingParkingSupplierInput
} from '#shared/features/finance/handling-parking-suppliers';
import StationSelect from '../../operations/stations/StationSelect.vue';
import CurrencySelect from '../currencies/CurrencySelect.vue';
const props = defineProps<{ modelValue: boolean; record?: HandlingParkingSupplierDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: HandlingParkingSupplierDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<HandlingParkingSupplierInput>({
  supplierCode: '',
  supplierName: '',
  stationId: '',
  serviceType: 'HANDLING',
  referenceRate: null,
  currencyId: null,
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
        ? (props.record.supplierCode as HandlingParkingSupplierInput['supplierCode'])
        : '',
      supplierName: props.record
        ? (props.record.supplierName as HandlingParkingSupplierInput['supplierName'])
        : '',
      stationId: props.record
        ? (props.record.stationId as HandlingParkingSupplierInput['stationId'])
        : '',
      serviceType: props.record
        ? (props.record.serviceType as HandlingParkingSupplierInput['serviceType'])
        : 'HANDLING',
      referenceRate: props.record
        ? (props.record.referenceRate as HandlingParkingSupplierInput['referenceRate'])
        : null,
      currencyId: props.record
        ? (props.record.currencyId as HandlingParkingSupplierInput['currencyId'])
        : null,
      contactPerson: props.record
        ? (props.record.contactPerson as HandlingParkingSupplierInput['contactPerson'])
        : null,
      phone: props.record ? (props.record.phone as HandlingParkingSupplierInput['phone']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<HandlingParkingSupplierDto>(
      props.record
        ? '/api/master-data/handling-parking-suppliers/' + props.record.id
        : '/api/master-data/handling-parking-suppliers',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : 'Unable to save handling & parking.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Handling & Parking</VCardTitle><VDivider /><VCardText>
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
                v-model="form.serviceType"
                :items="['HANDLING', 'PARKING', 'BOTH']"
                label="Service type"
                :rules="[required('Service type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.referenceRate"
                label="Reference rate"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <CurrencySelect v-model="form.currencyId" label="Currency" />
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
          Save handling & parking
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
