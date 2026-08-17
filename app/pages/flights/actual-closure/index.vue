<script setup lang="ts">
const route = useRoute();

await navigateTo(
  {
    path: '/flights/station-operations/actual-closure',
    query: { ...route.query }
  },
  { replace: true }
);
</script>

<template>
  <div />
</template>
