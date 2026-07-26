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
    hideDetails?: boolean | 'auto';
  }>(),
  {
    label: 'Station',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true,
    hideDetails: false
  }
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
  {
    default: () => []
  }
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
  <div class="station-select">
    <div class="station-select__control">
      <VAutocomplete
        class="station-select__input"
        :clearable="clearable"
        density="compact"
        :disabled="disabled"
        :hide-details="hideDetails"
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
        class="station-select__create"
        aria-label="Add station"
        height="40"
        icon="mdi-plus"
        variant="tonal"
        width="40"
        @click="createOpen = true"
      />
    </div>

    <StationFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>

<style scoped>
.station-select {
  width: 100%;
  min-width: 0;
}

.station-select__control {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.station-select__input {
  flex: 1 1 auto;
  min-width: 0;
}

.station-select__create {
  flex: 0 0 auto;
}
</style>
