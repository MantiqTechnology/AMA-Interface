<script setup lang="ts">
import type { PersonnelDto, PersonnelInput } from '#shared/features/operations/personnel';
import StationSelect from '../stations/StationSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: PersonnelDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: PersonnelDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<PersonnelInput>({
  employeeCode: '',
  fullName: '',
  crewRole: 'PILOT_IN_COMMAND',
  licenseType: null,
  licenseNumber: null,
  licenseExpiryDate: null,
  medicalExpiryDate: null,
  baseStationId: null,
  availabilityStatus: 'AVAILABLE',
  dutyStationId: null,
  readinessNote: null,
  unit: '',
  employmentStatus: 'PERMANENT'
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
      employeeCode: props.record
        ? (props.record.employeeCode as PersonnelInput['employeeCode'])
        : '',
      fullName: props.record ? (props.record.fullName as PersonnelInput['fullName']) : '',
      crewRole: props.record
        ? (props.record.crewRole as PersonnelInput['crewRole'])
        : 'PILOT_IN_COMMAND',
      licenseType: props.record
        ? (props.record.licenseType as PersonnelInput['licenseType'])
        : null,
      licenseNumber: props.record
        ? (props.record.licenseNumber as PersonnelInput['licenseNumber'])
        : null,
      licenseExpiryDate: props.record
        ? (props.record.licenseExpiryDate as PersonnelInput['licenseExpiryDate'])
        : null,
      medicalExpiryDate: props.record
        ? (props.record.medicalExpiryDate as PersonnelInput['medicalExpiryDate'])
        : null,
      baseStationId: props.record
        ? (props.record.baseStationId as PersonnelInput['baseStationId'])
        : null,
      availabilityStatus: props.record
        ? (props.record.availabilityStatus as PersonnelInput['availabilityStatus'])
        : 'AVAILABLE',
      dutyStationId: props.record
        ? (props.record.dutyStationId as PersonnelInput['dutyStationId'])
        : null,
      readinessNote: props.record
        ? (props.record.readinessNote as PersonnelInput['readinessNote'])
        : null,
      unit: props.record ? (props.record.unit as PersonnelInput['unit']) : '',
      employmentStatus: props.record
        ? (props.record.employmentStatus as PersonnelInput['employmentStatus'])
        : 'PERMANENT'
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<PersonnelDto>(
      props.record ? '/api/master-data/personnel/' + props.record.id : '/api/master-data/personnel',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save pilot & crew.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Pilot & Crew</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.employeeCode"
                label="Employee code"
                :rules="[required('Employee code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.fullName"
                label="Full legal name"
                :rules="[required('Full legal name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.crewRole"
                :items="[
                  'PILOT_IN_COMMAND',
                  'CO_PILOT',
                  'CABIN_CREW',
                  'FLIGHT_OPERATIONS',
                  'GROUND_CREW'
                ]"
                label="Crew role"
                :rules="[required('Crew role')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.licenseType"
                label="Primary license type"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.licenseNumber"
                label="Primary license number"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.licenseExpiryDate"
                label="License expiry"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.medicalExpiryDate"
                label="Medical certificate expiry"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.baseStationId" label="Base station" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.availabilityStatus"
                :items="[
                  'AVAILABLE',
                  'ON_DUTY',
                  'ASSIGNED_OTHER_FLIGHT',
                  'ON_LEAVE',
                  'UNAVAILABLE'
                ]"
                label="Availability"
                :rules="[required('Availability')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.dutyStationId" label="Duty station" />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.readinessNote"
                label="Operational note"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.unit"
                label="Unit"
                :rules="[required('Unit')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.employmentStatus"
                :items="['PERMANENT', 'CONTRACT', 'ON_LEAVE', 'INACTIVE']"
                label="Employment status"
                :rules="[required('Employment status')]"
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
          Save pilot & crew
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
