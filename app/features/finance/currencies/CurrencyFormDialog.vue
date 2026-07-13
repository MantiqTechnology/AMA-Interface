<script setup lang="ts">
import type { CurrencyDto, CurrencyInput } from '#shared/features/finance/currencies';

const props = defineProps<{ modelValue: boolean; record?: CurrencyDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: CurrencyDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<CurrencyInput>({
  currencyCode: '',
  currencyName: '',
  symbol: '',
  decimalPlaces: 0
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
      currencyCode: props.record
        ? (props.record.currencyCode as CurrencyInput['currencyCode'])
        : '',
      currencyName: props.record
        ? (props.record.currencyName as CurrencyInput['currencyName'])
        : '',
      symbol: props.record ? (props.record.symbol as CurrencyInput['symbol']) : '',
      decimalPlaces: props.record
        ? (props.record.decimalPlaces as CurrencyInput['decimalPlaces'])
        : 0
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<CurrencyDto>(
      props.record
        ? '/api/master-data/currencies/' + props.record.id
        : '/api/master-data/currencies',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save currencies.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Currencies</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.currencyCode"
                label="Currency code"
                :rules="[required('Currency code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.currencyName"
                label="Currency name"
                :rules="[required('Currency name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.symbol"
                label="Symbol"
                :rules="[required('Symbol')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.decimalPlaces"
                label="Decimal places"
                :rules="[required('Decimal places')]"
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
          Save currencies
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
