<script setup lang="ts">
import type { AuthorizationResult } from '#shared/types/authz';

defineProps<{
  decision: AuthorizationResult;
}>();
</script>

<template>
  <VAlert
    v-if="!decision.allowed"
    border="start"
    class="mt-2"
    color="warning"
    density="compact"
    variant="tonal"
  >
    {{ decision.message }}
  </VAlert>
</template>
