<script setup lang="ts">
import type { PaymentTermDto, PaymentTermInput } from '#shared/features/finance/payment-terms';

const props = defineProps<{ modelValue: boolean; record?: PaymentTermDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: PaymentTermDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<PaymentTermInput>({
  termCode: '',
  termName: '',
  dueDays: 0,
  description: null
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
      termCode: props.record ? (props.record.termCode as PaymentTermInput['termCode']) : '',
      termName: props.record ? (props.record.termName as PaymentTermInput['termName']) : '',
      dueDays: props.record ? (props.record.dueDays as PaymentTermInput['dueDays']) : 0,
      description: props.record
        ? (props.record.description as PaymentTermInput['description'])
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
    const record = await fetchApi<PaymentTermDto>(
      props.record
        ? '/api/master-data/payment-terms/' + props.record.id
        : '/api/master-data/payment-terms',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save payment terms.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Payment Terms</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.termCode"
                label="Term code"
                :rules="[required('Term code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.termName"
                label="Term name"
                :rules="[required('Term name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.dueDays"
                label="Due days"
                :rules="[required('Due days')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Description"
                rows="3"
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
          Save payment terms
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
