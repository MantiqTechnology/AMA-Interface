<script setup lang="ts">
const props = defineProps<{ value: string }>();
const colors: Record<string, string> = {
  ACTIVE: 'success',
  SERVICEABLE: 'success',
  ASSIGNED: 'primary',
  CAPITALIZED: 'primary',
  LIMITED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  WAITING_PARTS: 'warning',
  OPEN: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  UNASSIGNED: 'default',
  NOT_CAPITALIZED: 'default',
  UNSERVICEABLE: 'error',
  LOST: 'error',
  DISPOSED: 'error',
  RETIRED: 'default'
};
const color = computed(() => colors[props.value] ?? 'default');
</script>
<template>
  <VChip :color="color" size="small" variant="tonal">{{ value.replaceAll('_', ' ') }}</VChip>
</template>
