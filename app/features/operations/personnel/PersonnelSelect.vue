<script setup lang="ts">
import type { PersonnelDto, PersonnelOption } from '#shared/features/operations/personnel';
const PersonnelFormDialog = defineAsyncComponent(() => import('./PersonnelFormDialog.vue'));
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  { label: 'Pilot & Crew', required: false, clearable: true, disabled: false, allowCreate: true }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: PersonnelDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'personnel-options',
  () => fetchApi<PersonnelOption[]>('/api/master-data/personnel/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: PersonnelDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: PersonnelOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.employeeCode} - ${option.fullName}`;
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
        aria-label="Add Pilot & Crew"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <PersonnelFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
