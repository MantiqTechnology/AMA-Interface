<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { formatDateTime } from '../../../features/station-operations/utils/stationOperationsFormatters';

const { pending, workbenchAudit } = useStationOperationsPageData();
const search = ref('');
const moduleFilter = ref('ALL');
const roleFilter = ref('ALL');

const modules = computed(() => [
  'ALL',
  ...new Set(workbenchAudit.value.map((entry) => entry.module))
]);
const roles = computed(() => [
  'ALL',
  ...new Set(workbenchAudit.value.map((entry) => entry.actorRole))
]);
const filteredAudit = computed(() => {
  const term = search.value.trim().toLowerCase();
  return workbenchAudit.value.filter(
    (entry) =>
      (!term ||
        `${entry.flightNumber} ${entry.action} ${entry.reason ?? ''}`
          .toLowerCase()
          .includes(term)) &&
      (moduleFilter.value === 'ALL' || entry.module === moduleFilter.value) &&
      (roleFilter.value === 'ALL' || entry.actorRole === roleFilter.value)
  );
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Operational Audit Trail</h2>
        <p class="text-caption text-text-secondary">Read-only operational assurance activity.</p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <VTextField
          v-model="search"
          label="Search audit"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="moduleFilter"
          :items="modules"
          label="Module"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="roleFilter"
          :items="roles"
          label="Role"
          density="compact"
          hide-details
          variant="outlined"
        />
      </div>
    </div>
    <VDivider />
    <div v-if="pending" class="pa-8 text-center">
      <VProgressCircular indeterminate size="22" class="mr-2" />Loading audit trail...
    </div>
    <div v-else-if="filteredAudit.length === 0" class="pa-8 text-center text-text-secondary">
      No operational assurance activity recorded.
    </div>
    <VTimeline v-else align="start" class="pa-4" density="compact" side="end">
      <VTimelineItem
        v-for="entry in filteredAudit"
        :key="entry.id"
        :dot-color="entry.afterStatus === 'REJECTED' ? 'error' : 'primary'"
        size="x-small"
      >
        <div class="flex flex-wrap items-center gap-2">
          <NuxtLink
            :to="`/flights/station-operations/${entry.flightId}`"
            class="font-weight-medium text-primary"
          >
            {{ entry.flightNumber }}
          </NuxtLink><VChip size="x-small" variant="tonal">{{ entry.module }}</VChip><span class="text-caption">{{ entry.action }}</span>
        </div>
        <div class="text-caption text-text-secondary">
          {{ entry.actorRole }} · {{ formatDateTime(entry.timestamp) }}
        </div>
        <div v-if="entry.beforeStatus || entry.afterStatus" class="text-caption">
          {{ entry.beforeStatus ?? '—' }} → {{ entry.afterStatus ?? '—' }}
        </div>
        <div v-if="entry.reason" class="text-caption">{{ entry.reason }}</div>
      </VTimelineItem>
    </VTimeline>
  </VCard>
</template>
