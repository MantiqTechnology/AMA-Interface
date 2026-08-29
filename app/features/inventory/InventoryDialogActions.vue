<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    cancelText?: string;
    submitText: string;
    submitIcon?: string;
    submitColor?: string;
  }>(),
  {
    loading: false,
    disabled: false,
    cancelText: 'Batal',
    submitIcon: 'mdi-content-save-outline',
    submitColor: 'primary'
  }
);

const emit = defineEmits<{
  cancel: [];
  submit: [];
}>();
</script>

<template>
  <VDivider />
  <VCardActions class="inventory-dialog-actions">
    <VSpacer />
    <VBtn :disabled="loading" :text="cancelText" variant="text" @click="emit('cancel')" />
    <VBtn
      :color="submitColor"
      :disabled="disabled"
      :loading="loading"
      :prepend-icon="submitIcon"
      :text="submitText"
      variant="flat"
      @click="emit('submit')"
    />
  </VCardActions>
</template>

<style scoped>
.inventory-dialog-actions {
  gap: 8px;
  padding: 12px 16px 16px;
}
</style>
