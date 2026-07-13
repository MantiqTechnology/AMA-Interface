<script setup lang="ts">
import type {
  ChartOfAccountDto,
  ChartOfAccountOption
} from '#shared/features/finance/chart-of-accounts';
const ChartOfAccountFormDialog = defineAsyncComponent(
  () => import('./ChartOfAccountFormDialog.vue')
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
    label: 'Chart of Accounts',
    required: false,
    clearable: true,
    disabled: false,
    allowCreate: true
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: ChartOfAccountDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'chart-of-accounts-options',
  () => fetchApi<ChartOfAccountOption[]>('/api/master-data/chart-of-accounts/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: ChartOfAccountDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: ChartOfAccountOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.accountCode} - ${option.accountName}`;
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
        aria-label="Add Chart of Accounts"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <ChartOfAccountFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
