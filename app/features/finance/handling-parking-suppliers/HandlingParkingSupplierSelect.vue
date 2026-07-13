<script setup lang="ts">
import type {
  HandlingParkingSupplierDto,
  HandlingParkingSupplierOption
} from '#shared/features/finance/handling-parking-suppliers';
const HandlingParkingSupplierFormDialog = defineAsyncComponent(
  () => import('./HandlingParkingSupplierFormDialog.vue')
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
    label: 'Handling & Parking',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: HandlingParkingSupplierDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'handling-parking-suppliers-options',
  () =>
    fetchApi<HandlingParkingSupplierOption[]>(
      '/api/master-data/handling-parking-suppliers/options'
    ),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: HandlingParkingSupplierDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: HandlingParkingSupplierOption | string | null | undefined) {
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
        aria-label="Add Handling & Parking"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <HandlingParkingSupplierFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
