<script setup lang="ts">
import type { SemanticTone } from '../../composables/useFinanceDemoData';

const props = defineProps<{
  value: string;
  tone?: SemanticTone;
}>();

const toneClasses: Record<SemanticTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200'
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

const classes = computed(() => toneClasses[resolvedTone.value]);
</script>
<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
    :class="classes"
  >
    {{ value }}
  </span>
</template>
