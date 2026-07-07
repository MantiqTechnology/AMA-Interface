<script setup lang="ts">
const props = defineProps<{
  value: string;
  kind?: 'lifecycle' | 'verification' | 'visibility' | 'readiness';
}>();

const label = computed(() => props.value.replaceAll('_', ' '));

const color = computed(() => {
  const value = props.value.toLowerCase();

  if (['active', 'verified', 'ready', 'internal'].includes(value)) return 'success';
  if (['expiring', 'pending_verification', 'watch', 'confidential'].includes(value))
    return 'warning';
  if (['expired', 'rejected', 'not_ready', 'restricted'].includes(value)) return 'error';
  if (value === 'superseded') return 'default';
  return 'info';
});
</script>

<template>
  <VChip :color="color" size="small" variant="tonal">
    {{ label }}
  </VChip>
</template>
