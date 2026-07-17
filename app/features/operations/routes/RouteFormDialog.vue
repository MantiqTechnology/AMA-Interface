<script setup lang="ts">
import type { RouteDto, RouteInput } from '#shared/features/operations/routes';
import StationSelect from '../stations/StationSelect.vue';

const props = defineProps<{ modelValue: boolean; route?: RouteDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [route: RouteDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<RouteInput>({
  routeCode: '',
  originStationId: '',
  destinationStationId: '',
  estimatedDurationMinutes: 0,
  distanceKm: 0,
  operationalNotes: null,
  restrictionLevel: 'NONE',
  restrictionNote: null
});
const required = (label: string) => (value: unknown) =>
  value !== null && value !== '' ? true : `${label} is required`;
const positive = (label: string) => (value: unknown) =>
  Number(value) > 0 ? true : `${label} must be greater than zero`;
const restrictionNoteRequired = (value: unknown) =>
  form.restrictionLevel === 'NONE' || (typeof value === 'string' && value.trim())
    ? true
    : 'Restriction note is required';

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    serverError.value = '';
    Object.assign(
      form,
      props.route
        ? {
            routeCode: props.route.routeCode,
            originStationId: props.route.originStationId,
            destinationStationId: props.route.destinationStationId,
            estimatedDurationMinutes: props.route.estimatedDurationMinutes,
            distanceKm: props.route.distanceKm,
            operationalNotes: props.route.operationalNotes,
            restrictionLevel: props.route.restrictionLevel,
            restrictionNote: props.route.restrictionNote
          }
        : {
            routeCode: '',
            originStationId: '',
            destinationStationId: '',
            estimatedDurationMinutes: 0,
            distanceKm: 0,
            operationalNotes: null,
            restrictionLevel: 'NONE',
            restrictionNote: null
          }
    );
  }
);

async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  if (form.originStationId === form.destinationStationId) {
    serverError.value = 'Origin and destination cannot be the same.';
    return;
  }
  submitting.value = true;
  serverError.value = '';
  try {
    const saved = await fetchApi<RouteDto>(
      props.route ? `/api/master-data/routes/${props.route.id}` : '/api/master-data/routes',
      { method: props.route ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', saved);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save route.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="760"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>{{ route ? 'Edit route' : 'Add route' }}</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert>
        <VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="form.routeCode"
                label="Route code"
                :rules="[required('Route code')]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.originStationId" label="Origin" required />
            </VCol>
            <VCol cols="12" md="6">
              <StationSelect v-model="form.destinationStationId" label="Destination" required />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.estimatedDurationMinutes"
                label="Duration minutes"
                :rules="[required('Duration'), positive('Duration')]"
                suffix="min"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.distanceKm"
                label="Distance"
                :rules="[required('Distance'), positive('Distance')]"
                suffix="km"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.operationalNotes"
                auto-grow
                counter="1000"
                label="Operational notes"
                rows="3"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="5">
              <VSelect
                v-model="form.restrictionLevel"
                :items="[
                  { title: 'No restriction', value: 'NONE' },
                  { title: 'Advisory', value: 'ADVISORY' },
                  { title: 'Blocking', value: 'BLOCKING' }
                ]"
                label="Restriction level"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.restrictionLevel !== 'NONE'" cols="12" md="7">
              <VTextarea
                v-model="form.restrictionNote"
                auto-grow
                counter="1000"
                label="Restriction note"
                :rules="[restrictionNoteRequired]"
                rows="2"
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
          Save route
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
