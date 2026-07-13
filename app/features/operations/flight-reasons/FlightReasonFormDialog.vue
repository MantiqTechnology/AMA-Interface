<script setup lang="ts">
import type {
  FlightReasonDto,
  FlightReasonInput
} from '#shared/features/operations/flight-reasons';

const props = defineProps<{ modelValue: boolean; record?: FlightReasonDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: FlightReasonDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<FlightReasonInput>({
  reasonCode: '',
  reasonName: 'Flight Reason',
  reasonType: 'DELAY',
  category: '',
  description: '',
  requiresNote: false,
  affectsOperationalKpi: true,
  affectsFinanceReview: false,
  dashboardSeverity: 'WARNING'
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
      reasonCode: props.record ? (props.record.reasonCode as FlightReasonInput['reasonCode']) : '',
      reasonName: props.record
        ? (props.record.reasonName as FlightReasonInput['reasonName'])
        : 'Flight Reason',
      reasonType: props.record
        ? (props.record.reasonType as FlightReasonInput['reasonType'])
        : 'DELAY',
      category: props.record ? (props.record.category as FlightReasonInput['category']) : '',
      description: props.record
        ? (props.record.description as FlightReasonInput['description'])
        : '',
      requiresNote: props.record
        ? (props.record.requiresNote as FlightReasonInput['requiresNote'])
        : false,
      affectsOperationalKpi: props.record
        ? (props.record.affectsOperationalKpi as FlightReasonInput['affectsOperationalKpi'])
        : true,
      affectsFinanceReview: props.record
        ? (props.record.affectsFinanceReview as FlightReasonInput['affectsFinanceReview'])
        : false,
      dashboardSeverity: props.record
        ? (props.record.dashboardSeverity as FlightReasonInput['dashboardSeverity'])
        : 'WARNING'
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<FlightReasonDto>(
      props.record
        ? '/api/master-data/flight-reasons/' + props.record.id
        : '/api/master-data/flight-reasons',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save flight reasons.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Flight Reasons</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.reasonCode"
                label="Reason code"
                :rules="[required('Reason code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.reasonName"
                label="Reason name"
                :rules="[required('Reason name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.reasonType"
                :items="['DELAY', 'CANCELLED', 'DIVERTED', 'REOPENED_FOR_CORRECTION']"
                label="Reason type"
                :rules="[required('Reason type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.category"
                label="Category"
                :rules="[required('Category')]"
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
            <VCol cols="12" md="4">
              <VSwitch v-model="form.requiresNote" color="primary" label="Require operator note" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.affectsOperationalKpi"
                color="primary"
                label="Operational KPI impact"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.affectsFinanceReview"
                color="primary"
                label="Require finance review"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.dashboardSeverity"
                :items="['INFO', 'WARNING', 'CRITICAL']"
                label="Operational severity"
                :rules="[required('Operational severity')]"
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
          Save flight reasons
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
