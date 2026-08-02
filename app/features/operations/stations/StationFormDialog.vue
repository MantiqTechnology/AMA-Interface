<script setup lang="ts">
import type { StationDto, StationInput } from '#shared/features/operations/stations';

const props = defineProps<{ modelValue: boolean; station?: StationDto | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [station: StationDto];
}>();

const { pushToast } = useDemoToasts();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const { label: fieldLabel } = useMasterDataFieldHelp();
const form = reactive<StationInput>({
  stationCode: '',
  stationName: '',
  iataCode: null,
  icaoCode: null,
  airportType: 'AIRPORT',
  operationalStatus: 'ACTIVE',
  city: null,
  province: null,
  countryCode: null,
  timezone: 'Asia/Jayapura',
  latitude: null,
  longitude: null,
  elevationFt: null,
  surfaceType: null,
  runwayLengthM: null,
  runwayWidthM: null,
  stationPicName: null,
  stationPicPhone: null,
  operationalNotes: null,
  isRemoteStation: false,
  lowConnectivityMode: false,
  hasFuelService: false,
  hasHandlingService: false,
  hasParkingService: false
});

const required = (label: string) => (value: unknown) =>
  value !== null && value !== '' ? true : `${label} is required`;

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    serverError.value = '';
    Object.assign(form, {
      stationCode: props.station?.stationCode ?? '',
      stationName: props.station?.stationName ?? '',
      iataCode: props.station?.iataCode ?? null,
      icaoCode: props.station?.icaoCode ?? null,
      airportType: props.station?.airportType ?? 'AIRPORT',
      operationalStatus: props.station?.operationalStatus ?? 'ACTIVE',
      city: props.station?.city ?? null,
      province: props.station?.province ?? null,
      countryCode: props.station?.countryCode ?? null,
      timezone: props.station?.timezone ?? 'Asia/Jayapura',
      latitude: props.station?.latitude ?? null,
      longitude: props.station?.longitude ?? null,
      elevationFt: props.station?.elevationFt ?? null,
      surfaceType: props.station?.surfaceType ?? null,
      runwayLengthM: props.station?.runwayLengthM ?? null,
      runwayWidthM: props.station?.runwayWidthM ?? null,
      stationPicName: props.station?.stationPicName ?? null,
      stationPicPhone: props.station?.stationPicPhone ?? null,
      operationalNotes: props.station?.operationalNotes ?? null,
      isRemoteStation: props.station?.isRemoteStation ?? false,
      lowConnectivityMode: props.station?.lowConnectivityMode ?? false,
      hasFuelService: props.station?.hasFuelService ?? false,
      hasHandlingService: props.station?.hasHandlingService ?? false,
      hasParkingService: props.station?.hasParkingService ?? false
    });
  }
);

async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const station = await fetchApi<StationDto>(
      props.station ? `/api/master-data/stations/${props.station.id}` : '/api/master-data/stations',
      { method: props.station ? 'PUT' : 'POST', body: { ...form } }
    );
    pushToast({ type: 'success', title: props.station ? 'Station updated' : 'Station created' });
    emit('saved', station);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save station.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="820"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>{{ station ? 'Edit station' : 'Add station' }}</VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert>
        <VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationCode"
                :label="fieldLabel('station.stationCode')"
                :rules="[required('Station code')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.stationCode" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationName"
                :label="fieldLabel('station.stationName')"
                :rules="[required('Station name')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.stationName" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.airportType"
                :items="['AIRPORT', 'AIRSTRIP', 'STOL_AIRFIELD']"
                :label="fieldLabel('station.airportType')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.airportType" inline />
                </template>
              </VSelect>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.city"
                :label="fieldLabel('station.city')"
                :rules="[required('City or region')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.city" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.province"
                :label="fieldLabel('station.province')"
                :rules="[required('Province')]"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.province" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationPicName"
                clearable
                :label="fieldLabel('station.stationPicName')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.stationPicName" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationPicPhone"
                clearable
                :label="fieldLabel('station.stationPicPhone')"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.stationPicPhone" inline />
                </template>
              </VTextField>
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.operationalNotes"
                :label="fieldLabel('station.operationalNotes')"
                rows="3"
                variant="outlined"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.operationalNotes" inline />
                </template>
              </VTextarea>
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.isRemoteStation"
                color="primary"
                :label="fieldLabel('station.isRemoteStation')"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.isRemoteStation" inline />
                </template>
              </VSwitch>
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.lowConnectivityMode"
                color="primary"
                :label="fieldLabel('station.lowConnectivityMode')"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.lowConnectivityMode" inline />
                </template>
              </VSwitch>
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.hasFuelService"
                color="primary"
                :label="fieldLabel('station.hasFuelService')"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.hasFuelService" inline />
                </template>
              </VSwitch>
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.hasHandlingService"
                color="primary"
                :label="fieldLabel('station.hasHandlingService')"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.hasHandlingService" inline />
                </template>
              </VSwitch>
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.hasParkingService"
                color="primary"
                :label="fieldLabel('station.hasParkingService')"
              >
                <template #label>
                  <MasterDataFieldHelp field="station.hasParkingService" inline />
                </template>
              </VSwitch>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn color="primary" :loading="submitting" prepend-icon="mdi-content-save" @click="submit">
          Save station
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
