<script setup lang="ts">
interface Stage {
  label: string;
  value: number;
}

const props = defineProps<{
  stages: Stage[];
}>();

const palette = ['#455ea4', '#5289cc', '#49b37c', '#9381bc', '#fba03d'];

// Pindahkan logika style ke sini agar TS aman
function getSegmentStyle(index: number) {
  return {
    backgroundColor: palette[index % palette.length],
    clipPath: getClipPath(index)
  };
}

function getClipPath(index: number) {
  const total = props.stages.length || 1;
  const topWidth = 100;
  const bottomWidth = 20;

  const step = (topWidth - bottomWidth) / total;

  const currentTop = topWidth - step * index;
  const currentBottom = topWidth - step * (index + 1);

  const leftTop = (100 - currentTop) / 2;
  const rightTop = 100 - leftTop;

  const leftBottom = (100 - currentBottom) / 2;
  const rightBottom = 100 - leftBottom;

  return `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`;
}
</script>

<template>
  <div class="funnel-container">
    <div class="funnel-wrapper">
      <div class="funnel-chart">
        <!-- Gunakan props.stages secara eksplisit -->
        <div
          v-for="(stage, i) in props.stages"
          :key="i"
          class="funnel-segment"
          :style="getSegmentStyle(i)"
        >
          <span class="funnel-value">{{ stage.value }}</span>
        </div>
      </div>

      <div class="funnel-labels">
        <div v-for="(stage, i) in props.stages" :key="'label-' + i" class="label-item">
          {{ stage.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.funnel-container {
  font-family: sans-serif;
  max-width: 400px;
  background: white;
  padding: 20px;
}

.funnel-title {
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 24px;
}

.funnel-wrapper {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

.funnel-chart {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.funnel-segment {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.funnel-value {
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.funnel-labels {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-item {
  height: 30px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.view-all {
  margin-top: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  width: 100%;
  justify-content: center;
}
</style>
