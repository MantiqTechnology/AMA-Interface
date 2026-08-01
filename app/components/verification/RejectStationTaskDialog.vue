<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  loading: boolean;
  reason: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:reason': [value: string];
  submit: [];
}>();

function updateReason(value: string | null) {
  emit('update:reason', value ?? '');
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="500"
    :persistent="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle tag="h2">Reject Station Task</VCardTitle>

      <VCardText>
        <VTextarea
          :model-value="reason"
          label="Rejection reason"
          rows="4"
          variant="outlined"
          @update:model-value="updateReason"
        />
      </VCardText>

      <VCardActions>
        <VSpacer />

        <VBtn variant="text" :disabled="loading" @click="emit('update:modelValue', false)">
          Cancel
        </VBtn>

        <VBtn color="error" :loading="loading" :disabled="!reason.trim()" @click="emit('submit')">
          Reject
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
