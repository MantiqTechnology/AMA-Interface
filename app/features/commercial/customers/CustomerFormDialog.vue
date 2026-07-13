<script setup lang="ts">
import type { CustomerDto, CustomerInput } from '#shared/features/commercial/customers';
import PaymentTermSelect from '../../finance/payment-terms/PaymentTermSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: CustomerDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: CustomerDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<CustomerInput>({
  accountType: 'INDIVIDUAL',
  accountCode: '',
  accountName: '',
  contactPerson: null,
  phone: null,
  email: null,
  billingAddress: null,
  paymentTermId: null,
  creditLimit: null
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
      accountType: props.record
        ? (props.record.accountType as CustomerInput['accountType'])
        : 'INDIVIDUAL',
      accountCode: props.record ? (props.record.accountCode as CustomerInput['accountCode']) : '',
      accountName: props.record ? (props.record.accountName as CustomerInput['accountName']) : '',
      contactPerson: props.record
        ? (props.record.contactPerson as CustomerInput['contactPerson'])
        : null,
      phone: props.record ? (props.record.phone as CustomerInput['phone']) : null,
      email: props.record ? (props.record.email as CustomerInput['email']) : null,
      billingAddress: props.record
        ? (props.record.billingAddress as CustomerInput['billingAddress'])
        : null,
      paymentTermId: props.record
        ? (props.record.paymentTermId as CustomerInput['paymentTermId'])
        : null,
      creditLimit: props.record ? (props.record.creditLimit as CustomerInput['creditLimit']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<CustomerDto>(
      props.record ? '/api/master-data/customers/' + props.record.id : '/api/master-data/customers',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save customers.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Customers</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.accountType"
                :items="['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'AGENCY']"
                label="Account type"
                :rules="[required('Account type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.accountCode"
                label="Account code"
                :rules="[required('Account code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.accountName"
                label="Account name"
                :rules="[required('Account name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contactPerson"
                label="Primary contact person"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.phone" label="Phone" type="text" variant="outlined" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.email"
                label="Primary email"
                type="email"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.billingAddress"
                label="Billing address"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <PaymentTermSelect v-model="form.paymentTermId" label="Payment term" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.creditLimit"
                label="Credit limit"
                type="number"
                variant="outlined"
              />
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
          Save customers
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
