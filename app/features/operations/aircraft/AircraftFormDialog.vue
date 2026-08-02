<script setup lang="ts">
import type { AircraftDto, AircraftInput } from '#shared/features/operations/aircraft';
import FlightCapacityProfileSelect from '../flight-capacity-profiles/FlightCapacityProfileSelect.vue';
import StationSelect from '../stations/StationSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: AircraftDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: AircraftDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const { label: fieldLabel } = useMasterDataFieldHelp();
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
  engineCategory: 'TURBINE',
  usableFuelCapacityLitre: null,
  fuelCapacityBasis: 'USABLE',
  cruiseFuelBurnLitrePerHour: null,
  holdingFuelBurnLitrePerHour: null,
  taxiFuelBurnLitrePerHour: null,
  fuelProfileSource: 'DEMO',
  fuelProfileReference: null,
  fuelProfileEffectiveFrom: null,
  fuelProfileAdvisoryOnly: true,
  defaultCapacityProfileId: null,
  baseStationId: null,
  currentStationId: null
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
      engineCategory: props.record
        ? (props.record.engineCategory as AircraftInput['engineCategory'])
        : 'TURBINE',
      usableFuelCapacityLitre: props.record
        ? (props.record.usableFuelCapacityLitre as AircraftInput['usableFuelCapacityLitre'])
        : null,
      fuelCapacityBasis: props.record
        ? (props.record.fuelCapacityBasis as AircraftInput['fuelCapacityBasis'])
        : 'USABLE',
      cruiseFuelBurnLitrePerHour: props.record
        ? (props.record.cruiseFuelBurnLitrePerHour as AircraftInput['cruiseFuelBurnLitrePerHour'])
        : null,
      holdingFuelBurnLitrePerHour: props.record
        ? (props.record.holdingFuelBurnLitrePerHour as AircraftInput['holdingFuelBurnLitrePerHour'])
        : null,
      taxiFuelBurnLitrePerHour: props.record
        ? (props.record.taxiFuelBurnLitrePerHour as AircraftInput['taxiFuelBurnLitrePerHour'])
        : null,
      fuelProfileSource: props.record
        ? (props.record.fuelProfileSource as AircraftInput['fuelProfileSource'])
        : 'DEMO',
      fuelProfileReference: props.record
        ? (props.record.fuelProfileReference as AircraftInput['fuelProfileReference'])
        : null,
      fuelProfileEffectiveFrom: props.record
        ? (props.record.fuelProfileEffectiveFrom as AircraftInput['fuelProfileEffectiveFrom'])
        : null,
      fuelProfileAdvisoryOnly: props.record
        ? (props.record.fuelProfileAdvisoryOnly as AircraftInput['fuelProfileAdvisoryOnly'])
        : true,
      defaultCapacityProfileId: props.record
        ? (props.record.defaultCapacityProfileId as AircraftInput['defaultCapacityProfileId'])
        : null,
      baseStationId: props.record
        ? (props.record.baseStationId as AircraftInput['baseStationId'])
        : null,
      currentStationId: props.record
        ? (props.record.currentStationId as AircraftInput['currentStationId'])
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
                :label="fieldLabel('aircraft.registrationNumber')"
                :rules="[required('Registration number')]"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.registrationNumber" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.serialNumber"
                :label="fieldLabel('aircraft.serialNumber')"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.serialNumber" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.aircraftType"
                :label="fieldLabel('aircraft.aircraftType')"
                :rules="[required('Aircraft type')]"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.aircraftType" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.manufacturer"
                :label="fieldLabel('aircraft.manufacturer')"
                :rules="[required('Manufacturer')]"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.manufacturer" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.model"
                :label="fieldLabel('aircraft.model')"
                :rules="[required('Model')]"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.model" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.fleetCode"
                :label="fieldLabel('aircraft.fleetCode')"
                type="text"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fleetCode" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.passengerCapacity"
                :label="fieldLabel('aircraft.passengerCapacity')"
                :rules="[required('Passenger capacity')]"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.passengerCapacity" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.cargoCapacityKg"
                :label="fieldLabel('aircraft.cargoCapacityKg')"
                :rules="[required('Cargo capacity kg')]"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.cargoCapacityKg" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.fuelType"
                :items="['AVTUR', 'AVGAS']"
                :label="fieldLabel('aircraft.fuelType')"
                :rules="[required('Fuel type')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fuelType" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.engineCategory"
                :items="['TURBINE', 'RECIPROCATING']"
                :label="fieldLabel('aircraft.engineCategory')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.engineCategory" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.usableFuelCapacityLitre"
                :label="fieldLabel('aircraft.usableFuelCapacityLitre')"
                min="0"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.usableFuelCapacityLitre" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.fuelCapacityBasis"
                :items="['USABLE', 'TOTAL_TANK']"
                :label="fieldLabel('aircraft.fuelCapacityBasis')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fuelCapacityBasis" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="form.cruiseFuelBurnLitrePerHour"
                :label="fieldLabel('aircraft.cruiseFuelBurnLitrePerHour')"
                min="0"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.cruiseFuelBurnLitrePerHour" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="form.holdingFuelBurnLitrePerHour"
                :label="fieldLabel('aircraft.holdingFuelBurnLitrePerHour')"
                min="0"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.holdingFuelBurnLitrePerHour" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="form.taxiFuelBurnLitrePerHour"
                :label="fieldLabel('aircraft.taxiFuelBurnLitrePerHour')"
                min="0"
                type="number"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.taxiFuelBurnLitrePerHour" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.fuelProfileSource"
                :items="['AFM', 'POH', 'OPERATOR_APPROVED_TABLE', 'HISTORICAL_ESTIMATE', 'DEMO']"
                :label="fieldLabel('aircraft.fuelProfileSource')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fuelProfileSource" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="aircraft.fuelProfileEffectiveFrom" />
              <VDateInput
                v-model="form.fuelProfileEffectiveFrom"
                prepend-icon=""
                prepend-inner-icon="mdi-calendar"
                :aria-label="fieldLabel('aircraft.fuelProfileEffectiveFrom')"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="form.fuelProfileReference"
                :label="fieldLabel('aircraft.fuelProfileReference')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fuelProfileReference" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="form.fuelProfileAdvisoryOnly"
                color="primary"
                :label="fieldLabel('aircraft.fuelProfileAdvisoryOnly')"
              >
                <template #label>
                  <MasterDataFieldHelp field="aircraft.fuelProfileAdvisoryOnly" inline />
                </template>
              </VSwitch>
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="aircraft.defaultCapacityProfileId" />
              <FlightCapacityProfileSelect
                v-model="form.defaultCapacityProfileId"
                :label="fieldLabel('aircraft.defaultCapacityProfileId')"
              />
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="aircraft.baseStationId" />
              <StationSelect
                v-model="form.baseStationId"
                :label="fieldLabel('aircraft.baseStationId')"
              />
            </VCol>
            <VCol cols="12" md="6">
              <MasterDataFieldHelp field="aircraft.currentStationId" />
              <StationSelect
                v-model="form.currentStationId"
                :label="fieldLabel('aircraft.currentStationId')"
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
