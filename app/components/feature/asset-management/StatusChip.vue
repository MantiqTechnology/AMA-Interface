<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const colorMap: Record<string, { color: string; bg: string }> = {
  High: { color: '#E5484D', bg: '#FDECEC' },
  Medium: { color: '#F5A623', bg: '#FEF3E2' },
  Low: { color: '#22B07D', bg: '#E7F8F1' },

  Open: { color: '#3B5BFF', bg: '#EDF0FF' },
  'In Progress': { color: '#3B5BFF', bg: '#EDF0FF' },
  Scheduled: { color: '#3B5BFF', bg: '#EDF0FF' },
  Completed: { color: '#22B07D', bg: '#E7F8F1' },
  'Waiting Sparepart': { color: '#E5484D', bg: '#FDECEC' },

  'Expiring Soon': { color: '#F5A623', bg: '#FEF3E2' },

  Active: { color: '#22B07D', bg: '#E7F8F1' },
  Maintenance: { color: '#F5A623', bg: '#FEF3E2' },
  Idle: { color: '#9CA3AF', bg: '#F3F4F6' },
  Disposed: { color: '#E5484D', bg: '#FDECEC' },

  Assigned: { color: '#3B5BFF', bg: '#EDF0FF' },
  Returned: { color: '#22B07D', bg: '#E7F8F1' },
  Overdue: { color: '#E5484D', bg: '#FDECEC' }
};

const style = computed(() => {
  const c = colorMap[props.status] ?? { color: '#6B7280', bg: '#F3F4F6' };
  return { color: c.color, background: c.bg };
});
</script>

<template>
  <span class="status-chip" :style="style">{{ status }}</span>
</template>

<style scoped>
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
