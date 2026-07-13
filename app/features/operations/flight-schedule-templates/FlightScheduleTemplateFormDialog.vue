<script setup lang="ts">
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateInput
} from '#shared/features/operations/flight-schedule-templates';
import RouteSelect from '../routes/RouteSelect.vue';
import AircraftSelect from '../aircraft/AircraftSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: FlightScheduleTemplateDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: FlightScheduleTemplateDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<FlightScheduleTemplateInput>({
  templateCode: '',
  routeId: '',
  serviceTypeId: 'flight-service-type-charter-cargo',
  defaultAircraftId: null,
  operatingDays: [],
  departureTimeLocal: '',
  arrivalTimeLocal: '',
  bookingOpenHoursBefore: 72,
  bookingCloseMinutesBefore: 60,
  scheduleNote: null
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
      templateCode: props.record
        ? (props.record.templateCode as FlightScheduleTemplateInput['templateCode'])
        : '',
      routeId: props.record ? (props.record.routeId as FlightScheduleTemplateInput['routeId']) : '',
      serviceTypeId: props.record
        ? (props.record.serviceTypeId as FlightScheduleTemplateInput['serviceTypeId'])
        : 'flight-service-type-charter-cargo',
      defaultAircraftId: props.record
        ? (props.record.defaultAircraftId as FlightScheduleTemplateInput['defaultAircraftId'])
        : null,
      operatingDays: props.record
        ? (props.record.operatingDays as FlightScheduleTemplateInput['operatingDays'])
        : [],
      departureTimeLocal: props.record
        ? (props.record.departureTimeLocal as FlightScheduleTemplateInput['departureTimeLocal'])
        : '',
      arrivalTimeLocal: props.record
        ? (props.record.arrivalTimeLocal as FlightScheduleTemplateInput['arrivalTimeLocal'])
        : '',
      bookingOpenHoursBefore: props.record
        ? (props.record
            .bookingOpenHoursBefore as FlightScheduleTemplateInput['bookingOpenHoursBefore'])
        : 72,
      bookingCloseMinutesBefore: props.record
        ? (props.record
            .bookingCloseMinutesBefore as FlightScheduleTemplateInput['bookingCloseMinutesBefore'])
        : 60,
      scheduleNote: props.record
        ? (props.record.scheduleNote as FlightScheduleTemplateInput['scheduleNote'])
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
    const record = await fetchApi<FlightScheduleTemplateDto>(
      props.record
        ? '/api/master-data/flight-schedule-templates/' + props.record.id
        : '/api/master-data/flight-schedule-templates',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : 'Unable to save schedule templates.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Schedule Templates</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.templateCode"
                label="Template code"
                :rules="[required('Template code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <RouteSelect v-model="form.routeId" label="Route" required />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.serviceTypeId"
                :items="[
                  'flight-service-type-charter-cargo',
                  'flight-service-type-charter-passenger',
                  'flight-service-type-scheduled-passenger',
                  'flight-service-type-medevac',
                  'flight-service-type-positioning'
                ]"
                label="Service type"
                :rules="[required('Service type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <AircraftSelect v-model="form.defaultAircraftId" label="Default aircraft" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.operatingDays"
                :items="['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']"
                label="Operating days"
                multiple
                chips
                :rules="[required('Operating days')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.departureTimeLocal"
                label="Departure local"
                :rules="[required('Departure local')]"
                type="time"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.arrivalTimeLocal"
                label="Arrival local"
                :rules="[required('Arrival local')]"
                type="time"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.bookingOpenHoursBefore"
                label="Booking opens before"
                :rules="[required('Booking opens before')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.bookingCloseMinutesBefore"
                label="Booking closes before"
                :rules="[required('Booking closes before')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.scheduleNote"
                label="Schedule note"
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
          Save schedule templates
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
