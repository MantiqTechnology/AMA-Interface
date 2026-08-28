<script setup lang="ts">
// Mount this ONCE in your default layout (e.g. layouts/default.vue), next to
// your app-wide <NuxtPage /> or wherever your existing global snackbar host
// lives. Every procurement page/composable calls useProcurementSnackbar()
// to push a toast; this component is what actually renders it.
import { useProcurementSnackbar } from '../../composables/useProcurement';

const { snackbar } = useProcurementSnackbar();
</script>

<template>
  <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="bottom right" timeout="3200">
    {{ snackbar.text }}
  </VSnackbar>
</template>
