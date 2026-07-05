<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const normalizedValue = computed(() => props.value.toLowerCase());

const color = computed(() => {
  if (
    ['pass', 'paid', 'approved', 'completed', 'available', 'closed', 'confirmed'].includes(
      normalizedValue.value
    )
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
      'airborne'
    ].includes(normalizedValue.value)
  ) {
    return 'warning';
  }
  if (
    ['critical', 'blocker', 'blocked', 'rejected', 'grounded', 'cancelled', 'aog'].includes(
      normalizedValue.value
    )
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
