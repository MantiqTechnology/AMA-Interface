<script setup lang="ts">
import type { FlightOperationStatus } from '#shared/contracts/flight-operations';

const props = defineProps<{
  status: FlightOperationStatus | string;
}>();
</script>

<template>
  <DsStatusBadge :value="String(props.status)" />
</template>
