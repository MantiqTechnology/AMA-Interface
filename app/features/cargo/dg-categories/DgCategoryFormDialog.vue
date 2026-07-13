<script setup lang="ts">
import type { DgCategoryDto, DgCategoryInput } from '#shared/features/cargo/dg-categories';

const props = defineProps<{ modelValue: boolean; record?: DgCategoryDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: DgCategoryDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<DgCategoryInput>({
  dgCode: '',
  dgClass: '',
  description: '',
  handlingInstruction: '',
  requiresSpecialApproval: false
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
      dgCode: props.record ? (props.record.dgCode as DgCategoryInput['dgCode']) : '',
      dgClass: props.record ? (props.record.dgClass as DgCategoryInput['dgClass']) : '',
      description: props.record ? (props.record.description as DgCategoryInput['description']) : '',
      handlingInstruction: props.record
        ? (props.record.handlingInstruction as DgCategoryInput['handlingInstruction'])
        : '',
      requiresSpecialApproval: props.record
        ? (props.record.requiresSpecialApproval as DgCategoryInput['requiresSpecialApproval'])
        : false
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<DgCategoryDto>(
      props.record
        ? '/api/master-data/dg-categories/' + props.record.id
        : '/api/master-data/dg-categories',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save dg categories.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} DG Categories</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.dgCode"
                label="DG code"
                :rules="[required('DG code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.dgClass"
                label="DG class"
                :rules="[required('DG class')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Description"
                :rules="[required('Description')]"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.handlingInstruction"
                label="Handling instruction"
                :rules="[required('Handling instruction')]"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.requiresSpecialApproval"
                color="primary"
                label="Requires special approval"
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
          Save dg categories
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
