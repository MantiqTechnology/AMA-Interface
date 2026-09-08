<script setup lang="ts">
import type { AviationDashboardTone } from '#shared/contracts/aviation-dashboard';

withDefaults(
  defineProps<{
    label: string;
    tone: AviationDashboardTone;
    icon?: string;
    compact?: boolean;
  }>(),
  { icon: undefined, compact: false }
);

function color(tone: AviationDashboardTone) {
  return tone === 'neutral' ? 'secondary' : tone;
}
</script>

<template>
  <VChip
    :aria-label="label"
    :color="color(tone)"
    :prepend-icon="icon"
    :size="compact ? 'x-small' : 'small'"
    :variant="tone === 'danger' ? 'flat' : 'tonal'"
  >
    {{ label }}
  </VChip>
</template>
