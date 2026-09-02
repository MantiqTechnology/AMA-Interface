<script setup lang="ts">
const route = useRoute();
const id = computed(() => String(route.params.id));

await navigateTo(`/maintenance/work-packages/${id.value}/overview`, { replace: true });
</script>

<template>
  <VContainer fluid>
    <VProgressLinear indeterminate />
  </VContainer>
</template>
