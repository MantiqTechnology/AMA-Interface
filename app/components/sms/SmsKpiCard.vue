<template>
  <VCard border class="pa-4 h-100">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-caption text-medium-emphasis text-uppercase">{{ title }}</span>
      <VAvatar :color="color" variant="tonal" size="32">
        <VIcon :icon="icon" size="18" />
      </VAvatar>
    </div>
    <div class="text-h4 font-weight-bold mb-1">{{ value }}</div>
    <div v-if="trend" class="d-flex align-center text-caption" :class="toneClass">
      <VIcon :icon="trend.icon" size="14" class="mr-1" />
      {{ trend.text }}
    </div>
    <div v-else-if="target" class="text-caption text-medium-emphasis">{{ target }}</div>
  </VCard>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, default: 'mdi-information-outline' },
  color: { type: String, default: 'primary' },
  target: { type: String, default: null },
  // { icon, text, tone: 'good' | 'bad' | 'neutral' }
  trend: { type: Object, default: null }
});

const toneClass = computed(() => ({
  'text-success': props.trend?.tone === 'good',
  'text-error': props.trend?.tone === 'bad',
  'text-medium-emphasis': !props.trend || props.trend.tone === 'neutral'
}));
</script>
