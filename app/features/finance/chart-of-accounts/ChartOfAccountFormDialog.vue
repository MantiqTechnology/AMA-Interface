<script setup lang="ts">
import type {
  ChartOfAccountDto,
  ChartOfAccountInput
} from '#shared/features/finance/chart-of-accounts';
import ChartOfAccountSelect from './ChartOfAccountSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: ChartOfAccountDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: ChartOfAccountDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<ChartOfAccountInput>({
  accountCode: '',
  accountName: '',
  accountType: 'ASSET',
  normalBalance: 'DEBIT',
  parentAccountId: null,
  isPostable: true
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
      accountCode: props.record
        ? (props.record.accountCode as ChartOfAccountInput['accountCode'])
        : '',
      accountName: props.record
        ? (props.record.accountName as ChartOfAccountInput['accountName'])
        : '',
      accountType: props.record
        ? (props.record.accountType as ChartOfAccountInput['accountType'])
        : 'ASSET',
      normalBalance: props.record
        ? (props.record.normalBalance as ChartOfAccountInput['normalBalance'])
        : 'DEBIT',
      parentAccountId: props.record
        ? (props.record.parentAccountId as ChartOfAccountInput['parentAccountId'])
        : null,
      isPostable: props.record
        ? (props.record.isPostable as ChartOfAccountInput['isPostable'])
        : true
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<ChartOfAccountDto>(
      props.record
        ? '/api/master-data/chart-of-accounts/' + props.record.id
        : '/api/master-data/chart-of-accounts',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : 'Unable to save chart of accounts.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Chart of Accounts</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
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
              <VSelect
                v-model="form.accountType"
                :items="['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']"
                label="Account type"
                :rules="[required('Account type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.normalBalance"
                :items="['DEBIT', 'CREDIT']"
                label="Normal balance"
                :rules="[required('Normal balance')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <ChartOfAccountSelect v-model="form.parentAccountId" label="Parent account" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.isPostable" color="primary" label="Postable account" />
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
          Save chart of accounts
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
