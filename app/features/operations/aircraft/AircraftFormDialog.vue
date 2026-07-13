<script setup lang="ts">
import type { AircraftDto, AircraftInput } from '#shared/features/operations/aircraft';
import FlightCapacityProfileSelect from '../flight-capacity-profiles/FlightCapacityProfileSelect.vue';
import StationSelect from '../stations/StationSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: AircraftDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: AircraftDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<AircraftInput>({
  registrationNumber: '',
  serialNumber: null,
  aircraftType: '',
  manufacturer: '',
  model: '',
  fleetCode: null,
  passengerCapacity: 0,
  cargoCapacityKg: 0,
  fuelType: 'AVTUR',
  defaultCapacityProfileId: null,
  operationalStatus: 'ACTIVE',
  serviceabilityStatus: 'SERVICEABLE',
  baseStationId: null,
  currentStationId: null,
  lastMaintenanceCheckAt: null,
  nextMaintenanceDueAt: null,
  serviceabilityNote: null
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
      registrationNumber: props.record
        ? (props.record.registrationNumber as AircraftInput['registrationNumber'])
        : '',
      serialNumber: props.record
        ? (props.record.serialNumber as AircraftInput['serialNumber'])
        : null,
      aircraftType: props.record
        ? (props.record.aircraftType as AircraftInput['aircraftType'])
        : '',
      manufacturer: props.record
        ? (props.record.manufacturer as AircraftInput['manufacturer'])
        : '',
      model: props.record ? (props.record.model as AircraftInput['model']) : '',
      fleetCode: props.record ? (props.record.fleetCode as AircraftInput['fleetCode']) : null,
      passengerCapacity: props.record
        ? (props.record.passengerCapacity as AircraftInput['passengerCapacity'])
        : 0,
      cargoCapacityKg: props.record
        ? (props.record.cargoCapacityKg as AircraftInput['cargoCapacityKg'])
        : 0,
      fuelType: props.record ? (props.record.fuelType as AircraftInput['fuelType']) : 'AVTUR',
      defaultCapacityProfileId: props.record
        ? (props.record.defaultCapacityProfileId as AircraftInput['defaultCapacityProfileId'])
        : null,
      operationalStatus: props.record
        ? (props.record.operationalStatus as AircraftInput['operationalStatus'])
        : 'ACTIVE',
      serviceabilityStatus: props.record
        ? (props.record.serviceabilityStatus as AircraftInput['serviceabilityStatus'])
        : 'SERVICEABLE',
      baseStationId: props.record
        ? (props.record.baseStationId as AircraftInput['baseStationId'])
        : null,
      currentStationId: props.record
        ? (props.record.currentStationId as AircraftInput['currentStationId'])
        : null,
      lastMaintenanceCheckAt: props.record
        ? (props.record.lastMaintenanceCheckAt as AircraftInput['lastMaintenanceCheckAt'])
        : null,
      nextMaintenanceDueAt: props.record
        ? (props.record.nextMaintenanceDueAt as AircraftInput['nextMaintenanceDueAt'])
        : null,
      serviceabilityNote: props.record
        ? (props.record.serviceabilityNote as AircraftInput['serviceabilityNote'])
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
    const record = await fetchApi<AircraftDto>(
      props.record ? '/api/master-data/aircraft/' + props.record.id : '/api/master-data/aircraft',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save aircraft.';
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
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Aircraft</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.registrationNumber"
                label="Registration number"
                :rules="[required('Registration number')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.serialNumber"
                label="Serial number / MSN"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.aircraftType"
                label="Aircraft type"
                :rules="[required('Aircraft type')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.manufacturer"
                label="Manufacturer"
                :rules="[required('Manufacturer')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.model"
                label="Model"
                :rules="[required('Model')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.fleetCode"
                label="Fleet code"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.passengerCapacity"
                label="Passenger capacity"
                :rules="[required('Passenger capacity')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.cargoCapacityKg"
                label="Cargo capacity kg"
                :rules="[required('Cargo capacity kg')]"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.fuelType"
                :items="['AVTUR', 'AVGAS']"
                label="Fuel type"
                :rules="[required('Fuel type')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <FlightCapacityProfileSelect
                v-model="form.defaultCapacityProfileId"
                label="Default capacity profile"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.operationalStatus"
                :items="['ACTIVE', 'INACTIVE', 'RETIRED']"
                label="Operational status"
                :rules="[required('Operational status')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.serviceabilityStatus"
                :items="[
                  'SERVICEABLE',
                  'SERVICEABLE_WITH_RESTRICTIONS',
                  'MAINTENANCE_DUE',
                  'UNSERVICEABLE'
                ]"
                label="Serviceability"
                :rules="[required('Serviceability')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.baseStationId" label="Home base" />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.currentStationId" label="Current station" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.lastMaintenanceCheckAt"
                label="Last inspection date"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.nextMaintenanceDueAt"
                label="Next scheduled maintenance date"
                type="date"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.serviceabilityStatus !== 'SERVICEABLE'" cols="12">
              <VTextarea
                v-model="form.serviceabilityNote"
                label="Operational restriction or maintenance note"
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
          Save aircraft
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
