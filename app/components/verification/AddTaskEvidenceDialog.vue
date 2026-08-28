<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  loading: boolean;
  file: File | File[] | null;
  notes: string;
  category: 'OPERATIONAL' | 'EXTERNAL_REPORT';
  sourceParty: 'PT_AMA_STATION' | 'AVSEC' | 'AUTHORITY' | 'OTHER';
  sourcePartyName: string;
  receivedAt: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:file': [value: File | File[] | null];
  'update:notes': [value: string];
  'update:category': [value: 'OPERATIONAL' | 'EXTERNAL_REPORT'];
  'update:sourceParty': [value: 'PT_AMA_STATION' | 'AVSEC' | 'AUTHORITY' | 'OTHER'];
  'update:sourcePartyName': [value: string];
  'update:receivedAt': [value: string];
  submit: [];
}>();

const categoryOptions = [
  { title: 'Operational evidence', value: 'OPERATIONAL' },
  { title: 'External report', value: 'EXTERNAL_REPORT' }
] as const;

const sourcePartyOptions = [
  { title: 'PT AMA Station', value: 'PT_AMA_STATION' },
  { title: 'AVSEC', value: 'AVSEC' },
  { title: 'Authority', value: 'AUTHORITY' },
  { title: 'Other', value: 'OTHER' }
] as const;

function updateNotes(value: string | null) {
  emit('update:notes', value ?? '');
}

function updateCategory(value: unknown) {
  if (value === 'OPERATIONAL' || value === 'EXTERNAL_REPORT') {
    emit('update:category', value);
  }
}

function updateSourceParty(value: unknown) {
  if (
    value === 'PT_AMA_STATION' ||
    value === 'AVSEC' ||
    value === 'AUTHORITY' ||
    value === 'OTHER'
  ) {
    emit('update:sourceParty', value);
  }
}

function updateSourcePartyName(value: string | null) {
  emit('update:sourcePartyName', value ?? '');
}

function updateReceivedAt(value: string | null) {
  emit('update:receivedAt', value ?? '');
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle tag="h2">Add Task Evidence</VCardTitle>

      <VCardText class="flex flex-col gap-4">
        <VSelect
          :model-value="category"
          :items="categoryOptions"
          label="Evidence type"
          variant="outlined"
          @update:model-value="updateCategory"
        />

        <VSelect
          v-if="category === 'EXTERNAL_REPORT'"
          :model-value="sourceParty"
          :items="sourcePartyOptions"
          label="Report source"
          variant="outlined"
          @update:model-value="updateSourceParty"
        />

        <VTextField
          v-if="category === 'EXTERNAL_REPORT'"
          :model-value="sourcePartyName"
          label="Source party name"
          placeholder="AVSEC post, authority office, or contact name"
          variant="outlined"
          @update:model-value="updateSourcePartyName"
        />

        <VTextField
          v-if="category === 'EXTERNAL_REPORT'"
          :model-value="receivedAt"
          label="Received at"
          type="datetime-local"
          variant="outlined"
          @update:model-value="updateReceivedAt"
        />

        <VFileInput
          :model-value="file"
          label="Evidence file"
          accept="image/*,.pdf"
          prepend-icon="mdi-paperclip"
          variant="outlined"
          @update:model-value="emit('update:file', $event)"
        />

        <div class="text-caption text-medium-emphasis">
          PDF, JPEG, and PNG evidence received and uploaded by PT AMA Station.
        </div>

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
