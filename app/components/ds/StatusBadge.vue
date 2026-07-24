<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const normalizedValue = computed(() => props.value.toLowerCase());

const color = computed(() => {
  if (
    [
      'pass',
      'paid',
      'approved',
      'completed',
      'available',
      'closed',
      'confirmed',
      'serviceable',
      'posted',
      'received',
      'issued',
      'ordered',
      'verified',
      'ready',
      'ready_for_approval',
      'ready_for_departure'
    ].includes(normalizedValue.value)
  ) {
    return 'success';
  }
  if (
    [
      'warning',
      'pending',
      'pending_readiness',
      'pending_closure',
      'requested',
      'submitted',
      'in_progress',
      'draft',
      'scheduled',
      'airborne',
      'quarantine',
      'in_repair',
      'partially_received',
      'partially_ordered',
      'pending_approval',
      'counted',
      'check',
      'check_in_open',
      'check_in_closed'
    ].includes(normalizedValue.value)
  ) {
    return 'warning';
  }
  if (
    [
      'critical',
      'blocker',
      'blocked',
      'rejected',
      'grounded',
      'cancelled',
      'canceled',
      'delayed',
      'diverted',
      'aog',
      'unserviceable',
      'scrapped',
      'expired',
      'reversed',
      'not_ready',
      'reopened_for_correction'
    ].includes(normalizedValue.value)
  ) {
    return 'danger';
  }
  return 'info';
});

const label = computed(() => normalizedValue.value.replaceAll('_', ' '));
</script>

<template>
  <VChip
    class="text-capitalize font-weight-bold"
    :color="color"
    density="comfortable"
    size="small"
    variant="tonal"
  >
    {{ label }}
  </VChip>
</template>
