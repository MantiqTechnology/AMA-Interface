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
const form = reactive<StationInput>({
  stationCode: '',
  stationName: '',
  cityOrRegion: '',
  province: '',
  airportType: 'AIRPORT',
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
      cityOrRegion: props.station?.cityOrRegion ?? '',
      province: props.station?.province ?? '',
      airportType: (props.station?.airportType as StationInput['airportType']) ?? 'AIRPORT',
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
                label="Station code"
                :rules="[required('Station code')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationName"
                label="Station name"
                :rules="[required('Station name')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.airportType"
                :items="['AIRPORT', 'AIRSTRIP', 'STOL_AIRFIELD']"
                label="Airport type"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.cityOrRegion"
                label="City or region"
                :rules="[required('City or region')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.province"
                label="Province"
                :rules="[required('Province')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationPicName"
                clearable
                label="Station PIC"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.stationPicPhone"
                clearable
                label="PIC phone"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.operationalNotes"
                label="Operational notes"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.isRemoteStation" color="primary" label="Remote station" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="form.lowConnectivityMode"
                color="primary"
                label="Low connectivity"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.hasFuelService" color="primary" label="Fuel service" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.hasHandlingService" color="primary" label="Handling service" />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch v-model="form.hasParkingService" color="primary" label="Parking service" />
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
