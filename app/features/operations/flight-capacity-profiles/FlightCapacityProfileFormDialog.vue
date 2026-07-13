<script setup lang="ts">
import type {
  FlightCapacityProfileDto,
  FlightCapacityProfileInput
} from '#shared/features/operations/flight-capacity-profiles';
import AircraftSelect from '../aircraft/AircraftSelect.vue';
import RouteSelect from '../routes/RouteSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: FlightCapacityProfileDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [record: FlightCapacityProfileDto];
}>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<FlightCapacityProfileInput>({
  profileCode: '',
  profileName: 'Capacity Profile',
  aircraftId: '',
  routeId: '',
  serviceTypeId: 'flight-service-type-charter-cargo',
  seatCapacity: 0,
  cargoCapacityKg: 0,
  reservedSeatCount: 0,
  reservedCargoKg: 0,
  capacityNote: null
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
      profileCode: props.record
        ? (props.record.profileCode as FlightCapacityProfileInput['profileCode'])
        : '',
      profileName: props.record
        ? (props.record.profileName as FlightCapacityProfileInput['profileName'])
        : 'Capacity Profile',
      aircraftId: props.record
        ? (props.record.aircraftId as FlightCapacityProfileInput['aircraftId'])
        : '',
      routeId: props.record ? (props.record.routeId as FlightCapacityProfileInput['routeId']) : '',
      serviceTypeId: props.record
        ? (props.record.serviceTypeId as FlightCapacityProfileInput['serviceTypeId'])
        : 'flight-service-type-charter-cargo',
      seatCapacity: props.record
        ? (props.record.seatCapacity as FlightCapacityProfileInput['seatCapacity'])
        : 0,
      cargoCapacityKg: props.record
        ? (props.record.cargoCapacityKg as FlightCapacityProfileInput['cargoCapacityKg'])
        : 0,
      reservedSeatCount: props.record
        ? (props.record.reservedSeatCount as FlightCapacityProfileInput['reservedSeatCount'])
        : 0,
      reservedCargoKg: props.record
        ? (props.record.reservedCargoKg as FlightCapacityProfileInput['reservedCargoKg'])
        : 0,
      capacityNote: props.record
        ? (props.record.capacityNote as FlightCapacityProfileInput['capacityNote'])
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
    const record = await fetchApi<FlightCapacityProfileDto>(
      props.record
        ? '/api/master-data/flight-capacity-profiles/' + props.record.id
        : '/api/master-data/flight-capacity-profiles',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : 'Unable to save capacity profiles.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Capacity Profiles</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.profileCode"
                label="Profile code"
                :rules="[required('Profile code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.profileName"
                label="Profile name"
                :rules="[required('Profile name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <AircraftSelect v-model="form.aircraftId" label="Aircraft" required />
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
                label="Operation type"
                :rules="[required('Operation type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.seatCapacity"
                label="Total seats"
                :rules="[required('Total seats')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.cargoCapacityKg"
                label="Maximum cargo capacity"
                :rules="[required('Maximum cargo capacity')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.reservedSeatCount"
                label="Blocked seats"
                :rules="[required('Blocked seats')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.reservedCargoKg"
                label="Reserved operational cargo"
                :rules="[required('Reserved operational cargo')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.capacityNote"
                label="Capacity note"
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
          Save capacity profiles
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
