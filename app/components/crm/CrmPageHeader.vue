<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  lastUpdated?: string;
  showExport?: boolean;
  exportLabel?: string;
  // Primary page action (e.g. "Add Lead", "Create Campaign"), shown right next to Refresh
  actionLabel?: string;
  actionIcon?: string;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'export'): void;
  (e: 'action'): void;
}>();

const refreshing = ref(false);
function handleRefresh() {
  refreshing.value = true;
  emit('refresh');
  setTimeout(() => (refreshing.value = false), 600);
}
</script>

<template>
  <div class="crm-page-header">
    <div class="header-top">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-desc">{{ description }}</p>
      </div>

      <div class="header-actions">
        <span v-if="lastUpdated" class="last-updated">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="default"
          :loading="refreshing"
          prepend-icon="mdi-refresh"
          @click="handleRefresh"
        >
          Refresh
        </VBtn>
        <VBtn
          v-if="actionLabel"
          color="primary"
          variant="flat"
          :prepend-icon="actionIcon || 'mdi-plus'"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </VBtn>
        <VBtn
          v-if="showExport !== false"
          color="default"
          variant="outlined"
          prepend-icon="mdi-tray-arrow-down"
          @click="emit('export')"
        >
          {{ exportLabel || 'Export CSV' }}
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crm-page-header {
  margin-bottom: 24px;
}
.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}
.page-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.last-updated {
  font-size: 12px;
  color: #9ca3af;
  margin-right: 4px;
}
</style>
