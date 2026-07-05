<script setup lang="ts">
type StatTone = 'info' | 'success' | 'warning' | 'danger';

const props = defineProps<{
  label: string;
  value: string | number;
  tone?: StatTone;
}>();

const toneColors: Record<StatTone, string> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger'
};

function getToneColor(tone: StatTone = 'info') {
  return toneColors[tone];
}

const toneColor = computed(() => getToneColor(props.tone));
</script>

<template>
  <VCard border min-height="112">
    <VCardText>
      <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
        {{ label }}
      </div>
      <div class="mt-4 text-h4 font-weight-bold" :class="`text-${toneColor}`">
        {{ value }}
      </div>
    </VCardText>
  </VCard>
</template>
