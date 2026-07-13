<script setup lang="ts">
import type { AgentDto, AgentOption } from '#shared/features/commercial/agents';
const AgentFormDialog = defineAsyncComponent(() => import('./AgentFormDialog.vue'));
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    label?: string;
    required?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    allowCreate?: boolean;
  }>(),
  { label: 'Agents', required: false, clearable: true, disabled: false, allowCreate: true }
);
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  created: [record: AgentDto];
}>();
const createOpen = ref(false);
const {
  data: options,
  pending,
  refresh
} = await useAsyncData(
  'agents-options',
  () => fetchApi<AgentOption[]>('/api/master-data/agents/options'),
  { default: () => [] }
);
const rules = computed(() =>
  props.required ? [(value: unknown) => Boolean(value) || `${props.label} is required`] : []
);
async function created(record: AgentDto) {
  await refresh();
  emit('update:modelValue', record.id);
  emit('created', record);
}
function optionTitle(option: AgentOption | string | null | undefined) {
  if (typeof option === 'string') return option;
  if (!option) return '';
  return `${option.agentCode} - ${option.agentName}`;
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
        aria-label="Add Agents"
        icon="mdi-plus"
        variant="tonal"
        @click="createOpen = true"
      />
    </div>
    <AgentFormDialog v-model="createOpen" @saved="created" />
  </div>
</template>
