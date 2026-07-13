<script setup lang="ts">
import type { FuelSupplierDto, FuelSupplierOption } from '#shared/features/finance/fuel-suppliers';
const FuelSupplierFormDialog = defineAsyncComponent(() => import('./FuelSupplierFormDialog.vue'));
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  { label: 'Fuel Suppliers', required: false, clearable: true, disabled: false, allowCreate: true }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: FuelSupplierDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'fuel-suppliers-options',
  () => fetchApi<FuelSupplierOption[]>('/api/master-data/fuel-suppliers/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: FuelSupplierDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: FuelSupplierOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.supplierCode} - ${option.supplierName}`;
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
        aria-label="Add Fuel Suppliers"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <FuelSupplierFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
