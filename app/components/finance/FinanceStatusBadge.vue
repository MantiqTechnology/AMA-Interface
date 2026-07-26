<script setup lang="ts">
type SemanticTone = 'success' | 'warning' | 'danger' | 'neutral';

const props = defineProps<{
  value: string;
  tone?: SemanticTone;
}>();

const toneColors: Record<SemanticTone, string> = {
  success: 'success',
  warning: 'warning',
  danger: 'error',
  neutral: 'secondary'
};

const resolvedTone = computed<SemanticTone>(() => {
  if (props.tone) return props.tone;

  const normalized = props.value.toLowerCase();

  if (normalized.includes('aktif') || normalized.includes('balance')) {
    return 'success';
  }

  if (normalized.includes('perlu') || normalized.includes('warning')) {
    return 'warning';
  }

  if (normalized.includes('berakhir') || normalized.includes('tidak')) {
    return 'danger';
  }

  return 'neutral';
});

const color = computed(() => toneColors[resolvedTone.value]);
</script>

<template>
  <VChip :color="color" density="compact" size="small" variant="tonal">
    {{ value }}
  </VChip>
</template>
