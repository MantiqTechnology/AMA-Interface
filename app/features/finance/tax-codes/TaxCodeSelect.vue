<script setup lang="ts">
import type { TaxCodeDto, TaxCodeOption } from '#shared/features/finance/tax-codes';
const TaxCodeFormDialog = defineAsyncComponent(() => import('./TaxCodeFormDialog.vue'));
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  { label: 'Tax Codes', required: false, clearable: true, disabled: false, allowCreate: true }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: TaxCodeDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'tax-codes-options',
  () => fetchApi<TaxCodeOption[]>('/api/master-data/tax-codes/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: TaxCodeDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: TaxCodeOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.taxCode} - ${option.taxName}`;
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
        aria-label="Add Tax Codes"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <TaxCodeFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
