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
  --metric-color: rgb(var(--v-theme-info));
  --metric-soft: rgba(var(--v-theme-info), 0.11);
}

.metric-card--green {
  --metric-color: rgb(var(--v-theme-success));
  --metric-soft: rgba(var(--v-theme-success), 0.11);
}

.metric-card--amber {
  --metric-color: rgb(var(--v-theme-warning));
  --metric-soft: rgba(var(--v-theme-warning), 0.14);
}

.metric-card--red {
  --metric-color: rgb(var(--v-theme-danger));
  --metric-soft: rgba(var(--v-theme-danger), 0.11);
}

.metric-card--slate {
  --metric-color: rgb(var(--v-theme-text-secondary));
  --metric-soft: rgba(var(--v-theme-text-secondary), 0.1);
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
