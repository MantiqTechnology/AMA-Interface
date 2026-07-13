<script setup lang="ts">
import type { StationDto, StationOption } from '#shared/features/operations/stations';
import StationFormDialog from './StationFormDialog.vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  { label: 'Station', required: false, clearable: true, disabled: false, allowCreate: true }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [station: StationDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'station-options',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(station: StationDto) {
  await refresh();
  emit('update:modelValue', station.id);
  emit('created', station);
}
function optionTitle(option: StationOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.stationCode} - ${option.stationName}`;
}
</script>

<template>
  <div>
    <div class="d-flex align-start ga-2">
      <VAutocomplete
        :clearable="clearable"
        density="compact"
        :disabled="disabled"
        :item-title="optionTitle"
        item-value="id"
        :items="options"
        :label="label"
        :loading="pending"
        :model-value="modelValue"
        :rules="rules"
        variant="outlined"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <VBtn
        v-if="allowCreate && !disabled"
        aria-label="Add station"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <StationFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
