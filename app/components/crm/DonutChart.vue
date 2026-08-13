<script setup lang="ts">
interface Segment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

const props = defineProps<{
  segments: Segment[];
  total: number;
  totalLabel?: string;
}>();

const radius = 46;
const stroke = 16;
const circumference = 2 * Math.PI * radius;

const arcs = computed(() => {
  let offset = 0;
  // Tambahkan : Segment pada parameter s
  return props.segments.map((s: Segment) => {
    const length = (s.percent / 100) * circumference;
    const arc = {
      ...s,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -offset
    };
    offset += length;
    return arc;
  });
});
</script>

<template>
  <div class="donut-wrap">
    <svg viewBox="0 0 120 120" class="donut-svg">
      <circle cx="60" cy="60" :r="radius" fill="none" stroke="#F1F5F9" :stroke-width="stroke" />
      <circle
        v-for="(arc, i) in arcs"
        :key="i"
        cx="60"
        cy="60"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        :stroke-width="stroke"
        :stroke-dasharray="arc.dasharray"
        :stroke-dashoffset="arc.dashoffset"
        transform="rotate(-90 60 60)"
        stroke-linecap="butt"
      />
      <text x="60" y="57" text-anchor="middle" class="donut-total">{{ total }}</text>
      <text x="60" y="74" text-anchor="middle" class="donut-total-label">
        {{ totalLabel || 'Total' }}
      </text>
    </svg>

    <div class="donut-legend">
      <div v-for="(s, i) in segments" :key="i" class="legend-row">
        <span class="legend-dot" :style="{ backgroundColor: s.color }" />
        <span class="legend-label">{{ s.label }}</span>
        <span class="legend-value">{{ s.value }} ({{ s.percent }}%)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: nowrap;
  width: 100%;
}
.donut-svg {
  width: 108px;
  height: 108px;
  flex: 0 0 108px;
}
.donut-total {
  font-size: 19px;
  font-weight: 700;
  fill: #111827;
}
.donut-total-label {
  font-size: 10px;
  fill: #6b7280;
}
.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1 1 auto;
  min-width: 0;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: #374151;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.legend-value {
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
