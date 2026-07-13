<script setup lang="ts">
import type { CostCategoryDto, CostCategoryInput } from '#shared/features/finance/cost-categories';
import ChartOfAccountSelect from '../chart-of-accounts/ChartOfAccountSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: CostCategoryDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: CostCategoryDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<CostCategoryInput>({
  categoryCode: '',
  categoryName: '',
  costGroup: '',
  defaultCoaId: null
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
      categoryCode: props.record
        ? (props.record.categoryCode as CostCategoryInput['categoryCode'])
        : '',
      categoryName: props.record
        ? (props.record.categoryName as CostCategoryInput['categoryName'])
        : '',
      costGroup: props.record ? (props.record.costGroup as CostCategoryInput['costGroup']) : '',
      defaultCoaId: props.record
        ? (props.record.defaultCoaId as CostCategoryInput['defaultCoaId'])
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
    const record = await fetchApi<CostCategoryDto>(
      props.record
        ? '/api/master-data/cost-categories/' + props.record.id
        : '/api/master-data/cost-categories',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save cost categories.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Cost Categories</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.categoryCode"
                label="Category code"
                :rules="[required('Category code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.categoryName"
                label="Category name"
                :rules="[required('Category name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.costGroup"
                label="Cost group"
                :rules="[required('Cost group')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <ChartOfAccountSelect v-model="form.defaultCoaId" label="Default expense COA" />
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
          Save cost categories
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
