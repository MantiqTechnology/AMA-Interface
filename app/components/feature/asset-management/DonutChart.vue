<script setup lang="ts">
interface Segment {
  label: string;
  value: number;
  color: string;
}

const props = defineProps<{
  segments: Segment[];
  total: number;
}>();

const ringStyle = computed(() => {
  const sumAll =
    props.total || props.segments.reduce((s: number, x: Segment) => s + x.value, 0) || 1;
  let cumulative = 0;
  const stops = props.segments
    .map((s: Segment) => {
      const pct = (s.value / sumAll) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return { background: `conic-gradient(${stops})` };
});

const legendSegments = computed(() => {
  const sumAll =
    props.total || props.segments.reduce((s: number, x: Segment) => s + x.value, 0) || 1;
  return props.segments.map((s: Segment) => ({
    ...s,
    pct: Math.round((s.value / sumAll) * 100)
  }));
});
</script>

<template>
  <div class="donut-wrap">
    <div class="donut-ring" :style="ringStyle">
      <div class="donut-hole">
        <div class="donut-total">{{ total.toLocaleString('id-ID') }}</div>
        <div class="donut-caption">Total</div>
      </div>
    </div>
    <div class="donut-legend">
      <div v-for="seg in legendSegments" :key="seg.label" class="legend-row">
        <span class="dot" :style="{ background: seg.color }" />
        <span class="legend-label">{{ seg.label }}</span>
        <span class="legend-pct">{{ seg.pct }}%</span>
        <span class="legend-count">({{ seg.value.toLocaleString('id-ID') }})</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
}
.donut-ring {
  width: 140px;
  height: 140px;
  min-width: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.donut-hole {
  width: 92px;
  height: 92px;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.donut-total {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.donut-caption {
  font-size: 11px;
  color: #9ca3af;
}
.donut-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-label {
  flex: 1;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.legend-pct {
  font-weight: 600;
  width: 34px;
  text-align: right;
  flex-shrink: 0;
}
.legend-count {
  color: #9ca3af;
  width: 56px;
  text-align: right;
  flex-shrink: 0;
}
</style>
