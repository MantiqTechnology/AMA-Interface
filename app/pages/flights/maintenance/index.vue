<script setup lang="ts">
const route = useRoute();
const { can } = useAuthorization();
const target = can('station.task.view').allowed
  ? '/flights/station-operations/maintenance'
  : '/maintenance/flight-handoffs';

await navigateTo(
  {
    path: target,
    query: { ...route.query }
  },
  { replace: true }
);
</script>

<template>
  <div />
</template>
