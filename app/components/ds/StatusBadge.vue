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
      'verified'
    ].includes(normalizedValue.value)
  ) {
    return 'success';
  }
  if (
    [
      'warning',
      'ready_for_approval',
      'pending',
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
      'counted'
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
      'aog',
      'unserviceable',
      'scrapped',
      'expired',
      'reversed'
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
