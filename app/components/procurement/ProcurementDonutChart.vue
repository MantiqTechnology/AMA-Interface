<script setup lang="ts">
interface DonutSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
}

const props = defineProps<{
  segments: DonutSegment[]; 
  centerValue: string;
  centerLabel: string;
}>();

const radius = 46;
const circumference = 2 * Math.PI * radius;

const arcs = computed(() => {
  let offset = 0;
  // 2. Berikan tipe data (segment: DonutSegment) pada parameter map
  return props.segments.map((segment: DonutSegment) => {
    const dash = (segment.percent / 100) * circumference;
    const arc = {
      ...segment,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset
    };
    offset += dash;
    return arc;
  });
});
</script>

<template>
  <div class="donut">
    <svg viewBox="0 0 120 120" class="donut__svg">
      <circle cx="60" cy="60" :r="radius" fill="none" stroke="#F1F5F9" stroke-width="14" />
      <circle
        v-for="arc in arcs"
        :key="arc.label"
        cx="60"
        cy="60"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        stroke-width="14"
        :stroke-dasharray="arc.dashArray"
        :stroke-dashoffset="arc.dashOffset"
        transform="rotate(-90 60 60)"
        stroke-linecap="butt"
      />
    </svg>
    <div class="donut__center">
      <div class="donut__center-value">{{ centerValue }}</div>
      <div class="donut__center-label">{{ centerLabel }}</div>
    </div>
  </div>
</template>

<style scoped>
.donut {
  position: relative;
  width: 132px;
  height: 132px;
  flex-shrink: 0;
}

.donut__svg {
  width: 100%;
  height: 100%;
}

.donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.donut__center-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.donut__center-label {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}
</style>
