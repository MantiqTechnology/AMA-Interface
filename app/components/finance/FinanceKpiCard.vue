<script setup lang="ts">
import type { FinanceMetricDto } from '#shared/features/finance/reporting';

const props = defineProps<{
  metric: FinanceMetricDto;
}>();

const toneClasses = {
  SUCCESS: 'bg-success/10 text-success ring-success/20',
  WARNING: 'bg-warning/15 text-text-primary ring-warning/25',
  DANGER: 'bg-danger/10 text-danger ring-danger/20',
  NEUTRAL: 'bg-info/10 text-primary ring-info/20'
} satisfies Record<FinanceMetricDto['tone'], string>;

type ToneKey = keyof typeof toneClasses;

function normalizeTone(value: unknown): ToneKey {
  if (value === 'SUCCESS' || value === 'WARNING' || value === 'DANGER' || value === 'NEUTRAL') {
    return value;
  }

  return 'NEUTRAL';
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
  <article class="min-w-0 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {{ metric.label }}
    </p>
    <p class="mt-3 truncate font-mono text-2xl font-semibold tabular-nums text-text-primary">
      {{ rupiah(metric.valueMinor) }}
    </p>
    <div class="mt-3 flex items-center gap-2">
      <span
        v-if="metric.changePercent !== null"
        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset"
        :class="toneClass"
      >
        {{ metric.direction === 'UP' ? '↑' : metric.direction === 'DOWN' ? '↓' : '•' }}
        {{ Math.abs(metric.changePercent).toFixed(1) }}%
      </span>
      <span class="text-xs text-text-secondary">
        {{ metric.changePercent === null ? 'Comparison unavailable' : 'vs previous period' }}
      </span>
    </div>
    <p class="mt-3 text-sm leading-5 text-text-secondary">{{ metric.caption }}</p>
  </article>
</template>
