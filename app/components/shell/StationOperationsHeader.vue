<script setup lang="ts">
import type { StationOption } from '../../features/station-operations/types/stationOperations';

const props = defineProps<{
  stationCode: string;
  operationalDate: Date | null;
  stationOptions: StationOption[];
  selectedStationLabel: string;
  canChangeStation: boolean;
  canReadAssets: boolean;
  lastUpdated: Date | null;
  refreshing: boolean;
}>();

const emit = defineEmits<{
  'update:stationCode': [value: string];
  'update:operationalDate': [value: Date | null];
  refresh: [];
}>();

const stationItems = computed(() =>
  props.stationOptions.map((station: StationOption) => ({
    title: `${station.code} - ${station.name}`,
    value: station.code
  }))
);

const stationCodeModel = computed({
  get: () => props.stationCode,
  set: (value: string | null) => {
    if (value) emit('update:stationCode', value);
  }
});

const operationalDateModel = computed({
  get: () => props.operationalDate,
  set: (value: Date | null) => emit('update:operationalDate', value)
});

const updatedLabel = computed(() => {
  if (!props.lastUpdated) return 'Not refreshed yet';

  return `Updated ${new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(props.lastUpdated)}`;
});
</script>

<template>
  <VCard border class="mb-5">
    <div class="flex flex-col gap-5 pa-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="mb-1 flex items-center gap-2">
          <VIcon icon="mdi-airport" color="primary" />
          <h1 class="text-h5 font-weight-bold">Station Operations</h1>
        </div>
        <p class="text-body-2 text-text-secondary">
          {{ selectedStationLabel }} · Coordinate flights, services, costs, and verification.
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <VSelect
          v-model="stationCodeModel"
          :items="stationItems"
          :disabled="!canChangeStation"
          label="Station"
          density="compact"
          hide-details
          variant="outlined"
          class="station-operations-header__station"
        />

        <VDateInput
          v-model="operationalDateModel"
          label="Operational date"
          density="compact"
          hide-details
          variant="outlined"
          class="station-operations-header__date"
        />

        <VBtn
          v-if="canReadAssets"
          to="/asset-management/register"
          prepend-icon="mdi-package-variant-closed"
          variant="outlined"
        >
          Assets
        </VBtn>

        <div class="flex items-center gap-2">
          <span class="text-caption text-text-secondary">{{ updatedLabel }}</span>
          <VBtn
            icon="mdi-refresh"
            :loading="refreshing"
            aria-label="Refresh station operations"
            variant="text"
            @click="emit('refresh')"
          />
        </div>
      </div>
    </div>
  </VCard>
</template>

<style scoped>
.station-operations-header__station {
  min-width: 240px;
}

.station-operations-header__date {
  min-width: 190px;
}
</style>
