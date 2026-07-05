<script setup lang="ts">
import Sidebar from '../components/layout/sidebar/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';
</script>

<template>
  <Sidebar />
  <Topbar />

  <VMain class="bg-background pt-16">
    <slot />
  </VMain>

  <FeatureDemoToastStack />
</template>
