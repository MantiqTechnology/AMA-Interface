<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  action: 'depart' | 'land';
  flightNumber: string;
  stationId: string;
  stationCode: string;
  loading?: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [body: { actualAt: string; stationId: string; note?: string }];
}>();

const actualAt = ref('');
const note = ref('');

function localNow() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    actualAt.value = localNow();
    note.value = '';
  },
  { immediate: true }
);

function submit() {
  if (!actualAt.value) return;
  emit('submit', {
    actualAt: new Date(actualAt.value).toISOString(),
    stationId: props.stationId,
    note: note.value.trim() || undefined
  });
}
</script>

<template>
  <VDialog
    aria-labelledby="actual-time-dialog-title"
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard class="actual-time-card">
      <VCardTitle id="actual-time-dialog-title">
        {{ action === 'depart' ? 'Record Departure' : 'Record Landing' }}
      </VCardTitle>
      <VCardText>
        <div class="mb-4 text-sm text-text-secondary">{{ flightNumber }}</div>
        <VTextField
          v-model="actualAt"
          :label="action === 'depart' ? 'Actual departure' : 'Actual arrival'"
          type="datetime-local"
          variant="outlined"
        />
        <VTextField :model-value="stationCode" label="Station" readonly variant="outlined" />
        <VTextarea v-model="note" label="Operational note" rows="3" variant="outlined" />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn
          color="secondary"
          :disabled="!actualAt"
          :loading="loading"
          variant="flat"
          @click="submit"
        >
          Confirm
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.actual-time-card {
  background: rgb(var(--v-theme-surface)) !important;
  opacity: 1;
}
</style>
