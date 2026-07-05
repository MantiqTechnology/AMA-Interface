<script setup lang="ts">
const { dismiss, toasts } = useDemoToasts();

const colorMap = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error'
} as const;
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
    <VAlert
      v-for="toast in toasts"
      :key="toast.id"
      closable
      :color="colorMap[toast.type]"
      density="comfortable"
      elevation="8"
      variant="elevated"
      @click:close="dismiss(toast.id)"
    >
      <div class="font-semibold">{{ toast.title }}</div>
      <div v-if="toast.message" class="text-sm">{{ toast.message }}</div>
    </VAlert>
  </div>
</template>
