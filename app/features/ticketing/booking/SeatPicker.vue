<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  capacity: number;
  occupiedSeats: string[];
  loading?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const seats = computed(() => {
  const columns = ['A', 'B', 'C'];
  return Array.from({ length: props.capacity }, (_, index) => {
    const row = Math.floor(index / columns.length) + 1;
    return `${row}${columns[index % columns.length]}`;
  });
});
</script>

<template>
  <div>
    <div class="mb-2 d-flex align-center justify-space-between">
      <span class="text-sm font-weight-medium">Seat</span>
      <span class="text-xs text-text-secondary">{{ occupiedSeats.length }} occupied</span>
    </div>
    <VProgressLinear v-if="loading" class="mb-3" color="primary" indeterminate />
    <div class="seat-grid" role="group" aria-label="Seat selection">
      <VBtn
        v-for="seat in seats"
        :key="seat"
        :aria-label="`Seat ${seat}${occupiedSeats.includes(seat) ? ' occupied' : ''}`"
        :color="modelValue === seat ? 'primary' : undefined"
        :disabled="occupiedSeats.includes(seat)"
        :variant="modelValue === seat ? 'flat' : 'tonal'"
        @click="emit('update:modelValue', seat)"
      >
        {{ seat }}
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.seat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(52px, 1fr));
  gap: 8px;
  max-width: 320px;
}
</style>
