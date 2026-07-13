<script setup lang="ts">
import type { VendorDto, VendorInput } from '#shared/features/finance/vendors';
import StationSelect from '../../operations/stations/StationSelect.vue';
import PaymentTermSelect from '../payment-terms/PaymentTermSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: VendorDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: VendorDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<VendorInput>({
  vendorCode: '',
  vendorName: '',
  vendorType: 'HANDLING',
  stationId: null,
  contactPerson: null,
  phone: null,
  email: null,
  paymentTermId: null
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
      vendorCode: props.record ? (props.record.vendorCode as VendorInput['vendorCode']) : '',
      vendorName: props.record ? (props.record.vendorName as VendorInput['vendorName']) : '',
      vendorType: props.record
        ? (props.record.vendorType as VendorInput['vendorType'])
        : 'HANDLING',
      stationId: props.record ? (props.record.stationId as VendorInput['stationId']) : null,
      contactPerson: props.record
        ? (props.record.contactPerson as VendorInput['contactPerson'])
        : null,
      phone: props.record ? (props.record.phone as VendorInput['phone']) : null,
      email: props.record ? (props.record.email as VendorInput['email']) : null,
      paymentTermId: props.record
        ? (props.record.paymentTermId as VendorInput['paymentTermId'])
        : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<VendorDto>(
      props.record ? '/api/master-data/vendors/' + props.record.id : '/api/master-data/vendors',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save vendors.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Vendors</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.vendorCode"
                label="Vendor code"
                :rules="[required('Vendor code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.vendorName"
                label="Vendor name"
                :rules="[required('Vendor name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.vendorType"
                :items="[
                  'HANDLING',
                  'PARKING',
                  'ACCOMMODATION',
                  'TRANSPORT',
                  'CATERING',
                  'MAINTENANCE',
                  'GENERAL'
                ]"
                label="Vendor type"
                :rules="[required('Vendor type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.stationId" label="Coverage station" />
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
            <VCol cols="12" md="6">
              <VTextField v-model="form.email" label="Email" type="email" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <PaymentTermSelect v-model="form.paymentTermId" label="Payment term" />
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
          Save vendors
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
