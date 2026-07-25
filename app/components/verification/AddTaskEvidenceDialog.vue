<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  loading: boolean;
  file: File | File[] | null;
  notes: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:file': [value: File | File[] | null];
  'update:notes': [value: string];
  submit: [];
}>();

function updateNotes(value: string | null) {
  emit('update:notes', value ?? '');
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>Add Task Evidence</VCardTitle>

      <VCardText class="flex flex-col gap-4">
        <VFileInput
          :model-value="file"
          label="Evidence file"
          accept="image/*,.pdf"
          prepend-icon="mdi-paperclip"
          variant="outlined"
          @update:model-value="emit('update:file', $event)"
        />

        <VTextarea
          :model-value="notes"
          label="Notes"
          rows="3"
          variant="outlined"
          @update:model-value="updateNotes"
        />
      </VCardText>

      <VCardActions>
        <VSpacer />

        <VBtn variant="text" :disabled="loading" @click="emit('update:modelValue', false)">
          Cancel
        </VBtn>

        <VBtn color="primary" :loading="loading" :disabled="!file" @click="emit('submit')">
          Upload
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
