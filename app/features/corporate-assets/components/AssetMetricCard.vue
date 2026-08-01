<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  detail?: string;
}>();
</script>

<template>
  <VCard border elevation="0" class="metric-card" :class="`metric-card--${tone ?? 'blue'}`">
    <VCardText class="pa-4">
      <div class="d-flex align-start justify-space-between ga-3">
        <div class="min-width-0">
          <div class="metric-label text-medium-emphasis mb-2">{{ label }}</div>
          <div class="text-h5 font-weight-bold metric-value">{{ value }}</div>
          <div v-if="detail" class="metric-detail text-medium-emphasis mt-1">
            {{ detail }}
          </div>
        </div>
        <VAvatar size="40" class="metric-icon" variant="tonal">
          <VIcon :icon="icon" size="21" />
        </VAvatar>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.metric-card {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 14px;
}

.metric-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
  background: var(--metric-color);
}

.metric-card--blue {
  --metric-color: #3456d1;
  --metric-soft: #edf1ff;
}

.metric-card--green {
  --metric-color: #168461;
  --metric-soft: #e5f5ef;
}

.metric-card--amber {
  --metric-color: #b66a08;
  --metric-soft: #fff2dc;
}

.metric-card--red {
  --metric-color: #c53b43;
  --metric-soft: #fdebed;
}

.metric-card--slate {
  --metric-color: #596579;
  --metric-soft: #eef1f5;
}

.metric-icon {
  color: var(--metric-color);
  background: var(--metric-soft);
}

.metric-value {
  letter-spacing: -0.035em;
}

.metric-label {
  min-height: 2.1em;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.05;
}

.metric-detail {
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.min-width-0 {
  min-width: 0;
}
</style>
