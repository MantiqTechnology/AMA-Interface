<script setup lang="ts">
import type { FlightOperationStatus } from '#shared/contracts/flight-operations';

const props = defineProps<{
  status: FlightOperationStatus | string;
}>();

const color = computed(() => {
  const value = props.status;
  if (['CLOSED', 'READY_FOR_APPROVAL', 'APPROVED'].includes(value)) return 'success';
  if (['BLOCKED', 'CANCELLED', 'DIVERTED'].includes(value)) return 'error';
  if (['PENDING_READINESS', 'PENDING_CLOSURE', 'REOPENED_FOR_CORRECTION'].includes(value)) {
    return 'warning';
  }
  if (['IN_PROGRESS', 'LANDED', 'CHECK_IN_OPEN'].includes(value)) return 'info';
  return 'secondary';
});

const label = computed(() => String(props.status).replaceAll('_', ' '));
</script>

<template>
  <VChip :color="color" size="small" variant="tonal">
    {{ label }}
  </VChip>
</template>
