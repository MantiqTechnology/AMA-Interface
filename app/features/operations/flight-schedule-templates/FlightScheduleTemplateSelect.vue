<script setup lang="ts">
import type {
  FlightScheduleTemplateDto,
  FlightScheduleTemplateOption
} from '#shared/features/operations/flight-schedule-templates';
import type { FlightPlanningOptionDto } from '#shared/contracts/flight-operations';

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
    candidates?: FlightPlanningOptionDto[] | null;
    loading?: boolean;
  }>(),
  {
    label: 'Schedule Templates',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true,
    candidates: null,
    loading: false
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

type DisplayItem = { id: string; title: string; subtitle: string | null };

const usingCandidates = computed(() => Array.isArray(props.candidates));
const isLoading = computed(() => props.loading || (!usingCandidates.value && pending.value));

const items = computed<DisplayItem[]>(() => {
  if (props.candidates) {
    return props.candidates.map((candidate: FlightPlanningOptionDto) => ({
      id: candidate.id,
      title: candidate.label,
      subtitle: candidate.recommended ? 'Recommended for this date' : null
    }));
  }
  return options.value.map((option) => ({
    id: option.id,
    title: option.templateCode,
    subtitle: null
  }));
});

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
        item-title="title"
        item-value="id"
        :item-props="(item: DisplayItem) => ({ subtitle: item.subtitle })"
        :items="items"
        :label="label"
        :loading="isLoading"
        :model-value="modelValue"
        :rules="rules"
        variant="outlined"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <VTooltip v-if="allowCreate && !disabled" text="Add schedule template">
        <template #activator="{ props: tooltipProps }">
          <VBtn
            v-bind="tooltipProps"
            aria-label="Add schedule template"
            icon="mdi-plus"
            variant="tonal"
            @click="createOpen = true"
          />
        </template>
      </VTooltip>
    </div>
    <FlightScheduleTemplateFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
