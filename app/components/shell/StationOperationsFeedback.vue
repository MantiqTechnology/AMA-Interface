<script setup lang="ts">
const props = defineProps<{
  error: string;
  actionError: string;
  actionSuccess: string;
}>();

const emit = defineEmits<{
  retry: [];
  clearActionError: [];
  'update:actionSuccess': [value: string];
}>();

function handleSnackbarVisibility(value: boolean): void {
  if (!value) {
    emit('update:actionSuccess', '');
  }
}
</script>

<template>
  <VAlert v-if="props.error" class="mb-4" type="error" variant="tonal" prominent>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span>{{ props.error }}</span>
      <VBtn size="small" color="error" prepend-icon="mdi-refresh" @click="emit('retry')">
        Coba lagi
      </VBtn>
    </div>
  </VAlert>

  <VAlert
    v-if="props.actionError"
    class="mb-4"
    type="error"
    variant="tonal"
    closable
    @click:close="emit('clearActionError')"
  >
    {{ props.actionError }}
  </VAlert>

  <VSnackbar
    :model-value="Boolean(props.actionSuccess)"
    color="success"
    location="top end"
    :timeout="3000"
    @update:model-value="handleSnackbarVisibility"
  >
    {{ props.actionSuccess }}
  </VSnackbar>
</template>
