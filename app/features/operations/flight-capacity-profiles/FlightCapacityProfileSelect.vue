<script setup lang="ts">
import type {
  FlightCapacityProfileDto,
  FlightCapacityProfileOption
} from '#shared/features/operations/flight-capacity-profiles';
import type { FlightPlanningOptionDto } from '#shared/contracts/flight-operations';

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
    candidates?: FlightPlanningOptionDto[] | null;
    loading?: boolean;
  }>(),
  {
    label: 'Capacity Profiles',
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

type DisplayItem = { id: string; title: string; subtitle: string | null };

const usingCandidates = computed(() => Array.isArray(props.candidates));
const isLoading = computed(() => props.loading || (!usingCandidates.value && pending.value));

const items = computed<DisplayItem[]>(() => {
  if (props.candidates) {
    return props.candidates.map((candidate: FlightPlanningOptionDto) => ({
      id: candidate.id,
      title: candidate.label,
      subtitle: candidate.recommended ? 'Fits current manifest estimate' : null
    }));
  }
  return options.value.map((option) => ({
    id: option.id,
    title: optionTitle(option),
    subtitle: null
  }));
});

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
      <VTooltip v-if="allowCreate && !disabled" text="Add capacity profile">
        <template #activator="{ props: tooltipProps }">
          <VBtn
            v-bind="tooltipProps"
            aria-label="Add capacity profile"
            icon="mdi-plus"
            variant="tonal"
            @click="createOpen = true"
          />
        </template>
      </VTooltip>
    </div>
    <FlightCapacityProfileFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
