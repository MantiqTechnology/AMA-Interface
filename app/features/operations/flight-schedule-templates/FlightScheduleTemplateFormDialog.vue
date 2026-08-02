<script setup lang="ts">
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateInput
} from '#shared/features/operations/flight-schedule-templates';
import RouteSelect from '../routes/RouteSelect.vue';
import AircraftSelect from '../aircraft/AircraftSelect.vue';
import FlightCapacityProfileSelect from '../flight-capacity-profiles/FlightCapacityProfileSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: FlightScheduleTemplateDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: FlightScheduleTemplateDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const { label: fieldLabel } = useMasterDataFieldHelp();
const form = reactive<FlightScheduleTemplateInput>({
  templateCode: '',
  routeId: '',
  serviceTypeId: 'flight-service-type-charter-cargo',
  defaultAircraftId: null,
  capacityProfileId: null,
  operatingDays: [],
  departureTimeLocal: '',
  arrivalTimeLocal: '',
  arrivalDayOffset: 0,
  bookingOpenMinutesBefore: 4320,
  bookingOpenHoursBefore: 72,
  bookingCloseMinutesBefore: 60,
  effectiveFrom: null,
  effectiveUntil: null,
  internalOperationalNote: null,
  scheduleNote: null
});
const serviceTypeItems = [
  { title: 'Charter Cargo', value: 'flight-service-type-charter-cargo' },
  { title: 'Charter Passenger', value: 'flight-service-type-charter-passenger' },
  { title: 'Scheduled Passenger', value: 'flight-service-type-scheduled-passenger' },
  { title: 'Medevac', value: 'flight-service-type-medevac' },
  { title: 'Positioning', value: 'flight-service-type-positioning' }
] as const;
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
      capacityProfileId: props.record
        ? (props.record.capacityProfileId as FlightScheduleTemplateInput['capacityProfileId'])
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
      arrivalDayOffset: props.record
        ? (props.record.arrivalDayOffset as FlightScheduleTemplateInput['arrivalDayOffset'])
        : 0,
      bookingOpenMinutesBefore: props.record
        ? (props.record
            .bookingOpenMinutesBefore as FlightScheduleTemplateInput['bookingOpenMinutesBefore'])
        : 4320,
      bookingOpenHoursBefore: props.record
        ? (props.record
            .bookingOpenHoursBefore as FlightScheduleTemplateInput['bookingOpenHoursBefore'])
        : 72,
      bookingCloseMinutesBefore: props.record
        ? (props.record
            .bookingCloseMinutesBefore as FlightScheduleTemplateInput['bookingCloseMinutesBefore'])
        : 60,
      effectiveFrom: props.record
        ? (props.record.effectiveFrom as FlightScheduleTemplateInput['effectiveFrom'])
        : null,
      effectiveUntil: props.record
        ? (props.record.effectiveUntil as FlightScheduleTemplateInput['effectiveUntil'])
        : null,
      scheduleNote: props.record
        ? (props.record.scheduleNote as FlightScheduleTemplateInput['scheduleNote'])
        : null,
      internalOperationalNote: props.record
        ? (props.record
            .internalOperationalNote as FlightScheduleTemplateInput['internalOperationalNote'])
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
      {
        method: props.record ? 'PUT' : 'POST',
        body: { ...form, expectedVersion: props.record?.version }
      }
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
                :label="fieldLabel('scheduleTemplate.templateCode')"
                :rules="[required('Template code')]"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.templateCode" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="scheduleTemplate.routeId" />
              <RouteSelect
                v-model="form.routeId"
                :label="fieldLabel('scheduleTemplate.routeId')"
                required
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.serviceTypeId"
                :items="serviceTypeItems"
                :label="fieldLabel('scheduleTemplate.serviceTypeId')"
                :rules="[required('Service type')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.serviceTypeId" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="scheduleTemplate.defaultAircraftId" />
              <AircraftSelect
                v-model="form.defaultAircraftId"
                :label="fieldLabel('scheduleTemplate.defaultAircraftId')"
              />
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="scheduleTemplate.capacityProfileId" />
              <FlightCapacityProfileSelect
                v-model="form.capacityProfileId"
                :label="fieldLabel('scheduleTemplate.capacityProfileId')"
                :allow-create="false"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.operatingDays"
                :items="['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']"
                :label="fieldLabel('scheduleTemplate.operatingDays')"
                multiple
                chips
                :rules="[required('Operating days')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.operatingDays" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.departureTimeLocal"
                :label="fieldLabel('scheduleTemplate.departureTimeLocal')"
                :rules="[required('Departure local')]"
                type="time"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.departureTimeLocal" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.arrivalTimeLocal"
                :label="fieldLabel('scheduleTemplate.arrivalTimeLocal')"
                :rules="[required('Arrival local')]"
                type="time"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.arrivalTimeLocal" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.arrivalDayOffset"
                :label="fieldLabel('scheduleTemplate.arrivalDayOffset')"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.arrivalDayOffset" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.bookingOpenMinutesBefore"
                :label="fieldLabel('scheduleTemplate.bookingOpenMinutesBefore')"
                :rules="[required('Booking opens before')]"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.bookingOpenMinutesBefore" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.bookingCloseMinutesBefore"
                :label="fieldLabel('scheduleTemplate.bookingCloseMinutesBefore')"
                :rules="[required('Booking closes before')]"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.bookingCloseMinutesBefore" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="scheduleTemplate.effectiveFrom" />
              <VDateInput
                v-model="form.effectiveFrom"
                prepend-icon=""
                prepend-inner-icon="mdi-calendar"
                :aria-label="fieldLabel('scheduleTemplate.effectiveFrom')"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="scheduleTemplate.effectiveUntil" />
              <VDateInput
                v-model="form.effectiveUntil"
                prepend-icon=""
                prepend-inner-icon="mdi-calendar"
                :aria-label="fieldLabel('scheduleTemplate.effectiveUntil')"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.scheduleNote"
                :label="fieldLabel('scheduleTemplate.scheduleNote')"
                rows="3"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.scheduleNote" inline />
                </template>
              </VTextarea>
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.internalOperationalNote"
                :label="fieldLabel('scheduleTemplate.internalOperationalNote')"
                rows="3"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="scheduleTemplate.internalOperationalNote" inline />
                </template>
              </VTextarea>
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
