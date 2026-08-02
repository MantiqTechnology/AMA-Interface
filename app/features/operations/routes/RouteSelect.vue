<script setup lang="ts">
import type { RouteDto, RouteOption } from '#shared/features/operations/routes';
import RouteFormDialog from './RouteFormDialog.vue';
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
    density?: 'default' | 'comfortable' | 'compact';
    externalLabel?: boolean;
  }>(),
  {
    label: 'Route',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true,
    density: 'compact',
    externalLabel: false
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [route: RouteDto];
}>();
const { can } = useAuthorization();
const { locale } = useI18n();
const canManage = computed(() => can('master_data.manage').allowed);
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'route-select-options',
  () => fetchApi<RouteOption[]>('/api/master-data/routes/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
const selectedOption = computed(
  () => options.value.find((option) => option.id === props.modelValue) ?? null
);
const searchText = ref('');
async function created(route: RouteDto) {
  await refresh();
  emit('update:modelValue', route.id);
  emit('created', route);
}
function optionTitle(option: RouteOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  const origin = option.originCity ?? option.originStationCode;
  const destination = option.destinationCity ?? option.destinationStationCode;
  return `${option.originStationCode} -> ${option.destinationStationCode} | ${origin} -> ${destination}`;
}
function optionSubtitle(option: RouteOption) {
  const language = locale.value === 'id' ? 'id' : 'en';
  const details = [
    `${option.originStationName} -> ${option.destinationStationName}`,
    `${option.estimatedDurationMinutes} ${language === 'id' ? 'mnt' : 'min'}`,
    `${option.distanceKm} km`,
    option.routeCode
  ];
  if (option.restrictionLevel !== 'NONE') {
    const restrictionLabel =
      option.restrictionLevel === 'BLOCKING'
        ? language === 'id'
          ? 'DIBLOKIR'
          : 'BLOCKED'
        : language === 'id'
          ? 'PERHATIAN'
          : 'ADVISORY';
    details.push(
      option.restrictionNote ? `${restrictionLabel}: ${option.restrictionNote}` : restrictionLabel
    );
  }
  return details.join(' | ');
}
watch(
  selectedOption,
  (option) => {
    searchText.value = optionTitle(option);
  },
  { immediate: true }
);
function updateValue(option: RouteOption | null) {
  emit('update:modelValue', option?.id ?? null);
}
</script>
<template>
  <div>
    <div class="d-flex align-start ga-2">
      <VAutocomplete
        v-model:search="searchText"
        :aria-label="label"
        :clearable="clearable"
        :density="density"
        :disabled="disabled"
        :item-title="optionTitle"
        item-value="id"
        :item-props="(item: RouteOption) => ({ subtitle: optionSubtitle(item) })"
        :items="options"
        :label="externalLabel ? undefined : label"
        :loading="pending"
        :model-value="selectedOption"
        return-object
        :rules="rules"
        variant="outlined"
        @update:model-value="updateValue"
      />
      <VTooltip v-if="allowCreate && canManage && !disabled" text="Add route">
        <template #activator="{ props: tooltipProps }">
          <VBtn
            v-bind="tooltipProps"
            aria-label="Add route"
            icon="mdi-plus"
            variant="tonal"
            @click="createOpen = true"
          />
        </template>
      </VTooltip>
    </div>
    <RouteFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>

<style scoped>
:deep(.v-list-item-subtitle) {
  overflow: visible;
  white-space: normal;
}
</style>
