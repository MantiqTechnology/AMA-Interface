<script setup lang="ts">
import type {
  FlightCapacityProfileDto,
  FlightCapacityProfileOption
} from '#shared/features/operations/flight-capacity-profiles';
const FlightCapacityProfileFormDialog = defineAsyncComponent(
  () => import('./FlightCapacityProfileFormDialog.vue')
);
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  {
    label: 'Capacity Profiles',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: FlightCapacityProfileDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'flight-capacity-profiles-options',
  () =>
    fetchApi<FlightCapacityProfileOption[]>('/api/master-data/flight-capacity-profiles/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: FlightCapacityProfileDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: FlightCapacityProfileOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.profileCode} - ${option.profileName}`;
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
      /><VBtn
        v-if="allowCreate && !disabled"
        aria-label="Add Capacity Profiles"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <FlightCapacityProfileFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
