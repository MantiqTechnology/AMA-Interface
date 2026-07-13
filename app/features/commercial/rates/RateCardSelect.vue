<script setup lang="ts">
import type { RateCardDto, RateCardOption } from '#shared/features/commercial/rates';
const RateCardFormDialog = defineAsyncComponent(() => import('./RateCardFormDialog.vue'));
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
    label: 'Fare & Rate Cards',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: RateCardDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'rates-options',
  () => fetchApi<RateCardOption[]>('/api/master-data/rates/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: RateCardDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: RateCardOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.rateCode} - ${option.serviceType}`;
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
        aria-label="Add Fare & Rate Cards"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <RateCardFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
