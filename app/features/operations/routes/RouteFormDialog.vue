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
  distanceKm: 0
});
const required = (label: string) => (value: unknown) =>
  value !== null && value !== '' ? true : `${label} is required`;
const nonnegative = (label: string) => (value: unknown) =>
  Number(value) >= 0 ? true : `${label} cannot be negative`;

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
            distanceKm: props.route.distanceKm
          }
        : {
            routeCode: '',
            originStationId: '',
            destinationStationId: '',
            estimatedDurationMinutes: 0,
            distanceKm: 0
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
                :rules="[required('Duration'), nonnegative('Duration')]"
                suffix="min"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.distanceKm"
                label="Distance"
                :rules="[required('Distance'), nonnegative('Distance')]"
                suffix="km"
                type="number"
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
