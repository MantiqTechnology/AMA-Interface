<script setup lang="ts">
import type { InternalAogDemoDto } from '#shared/features/maintenance';

defineProps<{ events: InternalAogDemoDto['timeline'] }>();

const format = useLocaleFormat();
</script>

<template>
  <VCard border elevation="0" data-testid="internal-aog-timeline">
    <VCardTitle class="d-flex align-center ga-2">
      <VIcon icon="mdi-timeline-clock-outline" />
      Jejak aktivitas terpadu
    </VCardTitle>
    <VCardText>
      <ol v-if="events.length" class="event-list">
        <li v-for="event in events" :key="event.id" class="event-list__item">
          <div
            class="event-list__marker"
            :class="`event-list__marker--${event.domain.toLowerCase()}`"
          />
          <div>
            <div class="d-flex flex-wrap align-center ga-2">
              <span class="font-weight-medium">{{ event.title }}</span>
              <VChip size="x-small" variant="outlined">{{ event.domain }}</VChip>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">{{ event.detail }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ format.dateTime(event.occurredAt) }}
              <template v-if="event.actorRole"> · {{ event.actorRole }}</template>
            </div>
          </div>
        </li>
      </ol>
      <VEmptyState
        v-else
        icon="mdi-timeline-alert-outline"
        title="Belum ada aktivitas tersimpan"
        text="Aktivitas akan tampil setelah command pertama berhasil disimpan."
      />
    </VCardText>
  </VCard>
</template>

<style scoped>
.event-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.event-list__item {
  position: relative;
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  padding-bottom: 22px;
}

.event-list__item:not(:last-child)::before {
  position: absolute;
  top: 14px;
  bottom: 0;
  left: 5px;
  width: 2px;
  background: rgba(var(--v-border-color), 0.34);
  content: '';
}

.event-list__marker {
  z-index: 1;
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border: 2px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  background: #1769aa;
  box-shadow: 0 0 0 1px #1769aa;
}

.event-list__marker--inventory {
  background: #d97706;
  box-shadow: 0 0 0 1px #d97706;
}
</style>
