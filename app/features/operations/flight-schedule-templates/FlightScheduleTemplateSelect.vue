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
const { locale } = useI18n();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'flight-schedule-template-select-options',
  () =>
    fetchApi<FlightScheduleTemplateOption[]>('/api/master-data/flight-schedule-templates/options'),
  { default: () => [] }
);

type DisplayItem = { id: string; title: string; subtitle: string | null };

const operatingDayLabels = {
  en: {
    MON: 'Mon',
    TUE: 'Tue',
    WED: 'Wed',
    THU: 'Thu',
    FRI: 'Fri',
    SAT: 'Sat',
    SUN: 'Sun'
  },
  id: {
    MON: 'Sen',
    TUE: 'Sel',
    WED: 'Rab',
    THU: 'Kam',
    FRI: 'Jum',
    SAT: 'Sab',
    SUN: 'Min'
  }
} as const;

const usingCandidates = computed(() => Array.isArray(props.candidates));
const isLoading = computed(() => props.loading || (!usingCandidates.value && pending.value));

function scheduleTitle(option: FlightScheduleTemplateOption) {
  const nextDay = option.arrivalDayOffset > 0 ? ` +${option.arrivalDayOffset}` : '';
  return `${option.routeCode} | ${option.departureTimeLocal}-${option.arrivalTimeLocal}${nextDay}`;
}

function scheduleSubtitle(option: FlightScheduleTemplateOption, recommended: boolean): string {
  const language = locale.value === 'id' ? 'id' : 'en';
  const days = option.operatingDays.map((day) => operatingDayLabels[language][day]).join('/');
  const recommendation = recommended
    ? language === 'id'
      ? 'Direkomendasikan untuk tanggal ini'
      : 'Recommended for this date'
    : null;
  return [
    recommendation,
    days,
    option.serviceTypeLabel,
    option.defaultAircraftRegistration ??
      (language === 'id' ? 'Pesawat belum ditentukan' : 'No aircraft assigned'),
    option.templateCode
  ]
    .filter(Boolean)
    .join(' | ');
}

const items = computed<DisplayItem[]>(() => {
  if (props.candidates) {
    const candidatesById = new Map<string, FlightPlanningOptionDto>(
      props.candidates.map((candidate: FlightPlanningOptionDto) => [candidate.id, candidate])
    );
    const detailedItems = options.value
      .filter((option) => candidatesById.has(option.id))
      .map((option) => {
        const candidate = candidatesById.get(option.id);
        return {
          id: option.id,
          title: scheduleTitle(option),
          subtitle: scheduleSubtitle(option, candidate?.recommended ?? false)
        };
      });
    if (detailedItems.length > 0 || options.value.length > 0) return detailedItems;

    return props.candidates.map((candidate: FlightPlanningOptionDto) => ({
      id: candidate.id,
      title: candidate.label,
      subtitle: candidate.recommended
        ? locale.value === 'id'
          ? 'Direkomendasikan untuk tanggal ini'
          : 'Recommended for this date'
        : null
    }));
  }
  return options.value.map((option) => ({
    id: option.id,
    title: scheduleTitle(option),
    subtitle: scheduleSubtitle(option, false)
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

<style scoped>
:deep(.v-list-item-subtitle) {
  overflow: visible;
  white-space: normal;
}
</style>
