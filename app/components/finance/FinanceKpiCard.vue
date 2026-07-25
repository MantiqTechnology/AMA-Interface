<script setup lang="ts">
import type { FinanceKpi, SemanticTone } from '../../composables/useFinanceDemoData';

const props = defineProps<{
  metric: FinanceKpi;
}>();

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200'
} satisfies Record<SemanticTone, string>;

type ToneKey = keyof typeof toneClasses;

function normalizeTone(value: unknown): ToneKey {
  if (value === 'success' || value === 'warning' || value === 'danger' || value === 'neutral') {
    return value;
  }

  return 'neutral';
}

const toneClass = computed<string>(() => {
  const tone = normalizeTone(props.metric.tone);

  return toneClasses[tone];
});
function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}
</script>

<template>
  <article class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ metric.label }}</p>
    <p class="mt-3 truncate font-mono text-2xl font-semibold tabular-nums text-slate-950">
      {{ rupiah(metric.value) }}
    </p>
    <div class="mt-3 flex items-center gap-2">
      <span
        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset"
        :class="toneClass"
      >
        {{ metric.direction === 'up' ? '↑' : '↓' }} {{ metric.change.toFixed(1) }}%
      </span>
      <span class="text-xs text-slate-500">vs periode sebelumnya</span>
    </div>
    <p class="mt-3 text-sm leading-5 text-slate-500">{{ metric.caption }}</p>
  </article>
</template>
