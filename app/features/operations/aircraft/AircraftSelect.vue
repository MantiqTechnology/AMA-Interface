<script setup lang="ts">
import type { AircraftDto, AircraftOption } from '#shared/features/operations/aircraft';
import type { FlightPlanningAircraftCandidateDto } from '#shared/contracts/flight-operations';

const AircraftFormDialog = defineAsyncComponent(() => import('./AircraftFormDialog.vue'));
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
    candidates?: FlightPlanningAircraftCandidateDto[] | null;
    loading?: boolean;
  }>(),
  {
    label: 'Aircraft',
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
  created: [record: AircraftDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'aircraft-options',
  () => fetchApi<AircraftOption[]>('/api/master-data/aircraft/options'),
  { default: () => [] }
);

type DisplayItem = { id: string; title: string; disabled: boolean; subtitle: string | null };

const usingCandidates = computed(() => Array.isArray(props.candidates));
const isLoading = computed(() => props.loading || (!usingCandidates.value && pending.value));

const items = computed<DisplayItem[]>(() => {
  const candidates = props.candidates;
  if (candidates) {
    return candidates.map((candidate: FlightPlanningAircraftCandidateDto) => ({
      id: candidate.id,
      title: candidate.label,
      disabled: !candidate.available,
      subtitle: candidate.available
        ? (candidate.warnings[0] ?? null)
        : (candidate.blockers[0] ?? 'Not available')
    }));
  }
  return options.value.map((option) => ({
    id: option.id,
    title: optionTitle(option),
    disabled: false,
    subtitle: null
  }));
});

const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: AircraftDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: AircraftOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.registrationNumber} - ${option.model}`;
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
        :item-props="(item: DisplayItem) => ({ disabled: item.disabled, subtitle: item.subtitle })"
        :items="items"
        :label="label"
        :loading="isLoading"
        :model-value="modelValue"
        :rules="rules"
        variant="outlined"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <VTooltip v-if="allowCreate && !disabled" text="Add aircraft">
        <template #activator="{ props: tooltipProps }">
          <VBtn
            v-bind="tooltipProps"
            aria-label="Add aircraft"
            icon="mdi-plus"
            variant="tonal"
            @click="createOpen = true"
          />
        </template>
      </VTooltip>
    </div>
    <AircraftFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
