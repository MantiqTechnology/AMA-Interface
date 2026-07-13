<script setup lang="ts">
import type { TaxCodeDto, TaxCodeInput } from '#shared/features/finance/tax-codes';

const props = defineProps<{ modelValue: boolean; record?: TaxCodeDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: TaxCodeDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<TaxCodeInput>({
  taxCode: '',
  taxName: '',
  taxRateBasisPoints: 0,
  taxType: 'NON_TAX',
  effectiveFrom: '',
  effectiveTo: null
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
      taxCode: props.record ? (props.record.taxCode as TaxCodeInput['taxCode']) : '',
      taxName: props.record ? (props.record.taxName as TaxCodeInput['taxName']) : '',
      taxRateBasisPoints: props.record
        ? (props.record.taxRateBasisPoints as TaxCodeInput['taxRateBasisPoints'])
        : 0,
      taxType: props.record ? (props.record.taxType as TaxCodeInput['taxType']) : 'NON_TAX',
      effectiveFrom: props.record
        ? (props.record.effectiveFrom as TaxCodeInput['effectiveFrom'])
        : '',
      effectiveTo: props.record ? (props.record.effectiveTo as TaxCodeInput['effectiveTo']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<TaxCodeDto>(
      props.record ? '/api/master-data/tax-codes/' + props.record.id : '/api/master-data/tax-codes',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save tax codes.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Tax Codes</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.taxCode"
                label="Tax code"
                :rules="[required('Tax code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.taxName"
                label="Tax name"
                :rules="[required('Tax name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.taxRateBasisPoints"
                label="Tax rate"
                :rules="[required('Tax rate')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.taxType"
                :items="['NON_TAX', 'VAT', 'WITHHOLDING']"
                label="Tax type"
                :rules="[required('Tax type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.effectiveFrom"
                label="Effective from"
                :rules="[required('Effective from')]"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.effectiveTo"
                label="Effective to"
                type="date"
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
          Save tax codes
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
