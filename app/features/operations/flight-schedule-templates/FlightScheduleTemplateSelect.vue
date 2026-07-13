<script setup lang="ts">
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateOption
} from '#shared/features/operations/flight-schedule-templates';
const FlightScheduleTemplateFormDialog = defineAsyncComponent(
  () => import('./FlightScheduleTemplateFormDialog.vue')
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
    label: 'Schedule Templates',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: FlightScheduleTemplateDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'flight-schedule-templates-options',
  () =>
    fetchApi<FlightScheduleTemplateOption[]>('/api/master-data/flight-schedule-templates/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: FlightScheduleTemplateDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
</script>
<template>
  <div>
    <div class="d-flex align-start ga-2">
      <VAutocomplete
        :clearable="clearable"
        density="compact"
        :disabled="disabled"
        item-title="templateCode"
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
        aria-label="Add Schedule Templates"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <FlightScheduleTemplateFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
