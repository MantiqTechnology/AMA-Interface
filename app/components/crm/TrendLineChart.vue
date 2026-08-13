<script setup lang="ts">
interface Point {
  month: string;
  value: number | null;
}

const props = defineProps<{
  points: Point[];
  color?: string;
}>();

const width = 560;
const height = 220;
const padding = { top: 5, right: 0, bottom: 5, left: 0 };

const validValues = computed(() =>
  props.points.filter((p: Point) => p.value !== null).map((p: Point) => p.value as number)
);
const maxVal = computed(() => Math.max(...validValues.value, 10));
const stepX = computed(() =>
  props.points.length > 1 ? (width - padding.left - padding.right) / (props.points.length - 1) : 0
);

function xFor(i: number) {
  return padding.left + i * stepX.value;
}
function yFor(v: number) {
  const usable = height - padding.top - padding.bottom;
  const safeMax = maxVal.value || 1; // Hindari pembagian dengan nol
  return padding.top + usable - (v / safeMax) * usable;
}

const linePath = computed(() => {
  let d = '';
  let started = false;
  props.points.forEach((p: Point, i: number) => {
    if (p.value === null) return;
    const x = xFor(i);
    const y = yFor(p.value);
    d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
    started = true;
  });
  return d;
});

const areaPath = computed(() => {
  const pts = props.points
    .map((p: Point, i: number) => (p.value !== null ? { x: xFor(i), y: yFor(p.value) } : null))
    .filter(
      (item: { x: number; y: number } | null): item is { x: number; y: number } => item !== null
    );

  if (!pts.length) return '';
  const base = height - padding.bottom;
  let d = `M ${pts[0].x} ${base} `;

  pts.forEach((p: { x: number; y: number }) => (d += `L ${p.x} ${p.y} `));

  d += `L ${pts[pts.length - 1].x} ${base} Z`;
  return d;
});

const lastPoint = computed(() => {
  const list = props.points
    .map((p: Point, i: number) => (p.value !== null ? { ...p, i } : null))
    .filter((item: (Point & { i: number }) | null): item is Point & { i: number } => item !== null);

  return list.length > 0 ? list[list.length - 1] : null;
});

const gridLines = [0, 0.25, 0.5, 0.75, 1];
const strokeColor = props.color || '#2563EB';
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="trend-svg">
    <line
      v-for="g in gridLines"
      :key="g"
      :x1="padding.left"
      :x2="width - padding.right"
      :y1="padding.top + g * (height - padding.top - padding.bottom)"
      :y2="padding.top + g * (height - padding.top - padding.bottom)"
      stroke="#F1F5F9"
      stroke-width="1"
    />

    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="strokeColor" stop-opacity="0.18" />
        <stop offset="100%" :stop-color="strokeColor" stop-opacity="0" />
      </linearGradient>
    </defs>

    <path :d="areaPath" fill="url(#trendFill)" />
    <path
      :d="linePath"
      fill="none"
      :stroke="strokeColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <template v-for="(p, i) in points" :key="p.month">
      <circle
        v-if="p.value !== null"
        :cx="xFor(i)"
        :cy="yFor(p.value)"
        r="3.5"
        :fill="strokeColor"
      />
      <text :x="xFor(i)" :y="height - 8" text-anchor="middle" class="axis-label">
        {{ p.month }}
      </text>
    </template>

    <text
      v-if="lastPoint"
      :x="xFor(lastPoint.i)"
      :y="yFor(lastPoint.value as number) - 12"
      text-anchor="middle"
      class="value-label"
    >
      {{ lastPoint.value }}
    </text>
  </svg>
</template>

<style scoped>
.trend-svg {
  width: 100%;
  height: 220px;
}
.axis-label {
  font-size: 10px;
  fill: #9ca3af;
}
.value-label {
  font-size: 12px;
  font-weight: 700;
  fill: #111827;
}
</style>
