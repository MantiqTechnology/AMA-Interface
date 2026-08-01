<script setup lang="ts">
type Segment = { label: string; value: number; color: string };
const props = defineProps<{ segments: Segment[]; total: number; caption?: string }>();
const ringStyle = computed(() => {
  const denominator = props.total || 1;
  let cursor = 0;
  const stops = props.segments.map((segment: Segment) => {
    const start = cursor;
    cursor += (segment.value / denominator) * 100;
    return `${segment.color} ${start}% ${cursor}%`;
  });
  return { background: stops.length ? `conic-gradient(${stops.join(',')})` : '#e8ebf0' };
});
const legend = computed(() =>
  props.segments.map((segment: Segment) => ({
    ...segment,
    share: props.total ? Math.round((segment.value / props.total) * 100) : 0
  }))
);
</script>

<template>
  <div class="donut-layout">
    <div class="donut-ring" :style="ringStyle" role="img" :aria-label="`${caption}: ${total}`">
      <div class="donut-core">
        <strong>{{ total.toLocaleString('id-ID') }}</strong>
        <span>{{ caption ?? 'Assets' }}</span>
      </div>
    </div>
    <div class="donut-legend">
      <div v-for="segment in legend" :key="segment.label" class="legend-row">
        <span class="legend-dot" :style="{ background: segment.color }" />
        <span class="legend-name">{{ segment.label.replaceAll('_', ' ') }}</span>
        <strong>{{ segment.value }}</strong>
        <span class="legend-share">{{ segment.share }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut-layout {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
}

.donut-ring {
  display: grid;
  width: 132px;
  height: 132px;
  padding: 18px;
  border-radius: 50%;
  place-items: center;
}

.donut-core {
  display: grid;
  width: 96px;
  height: 96px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
  place-content: center;
  text-align: center;
}

.donut-core strong {
  font-size: 1.35rem;
  line-height: 1.1;
}

.donut-core span {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}

.donut-legend {
  display: grid;
  gap: 11px;
  min-width: 0;
}

.legend-row {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto 36px;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-share {
  color: rgba(var(--v-theme-on-surface), 0.52);
  text-align: right;
}

@media (max-width: 420px) {
  .donut-layout {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .donut-legend {
    width: 100%;
  }
}
</style>
