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
  if (!props.lastUpdated) return 'Belum diperbarui';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(props.lastUpdated);
});
</script>

<template>
  <DsOperationalPageHeader
    class="mb-5"
    description="Kendalikan kesiapan flight, layanan darat, biaya, dan handoff maintenance dari satu konteks operasional."
    eyebrow="Flight Operations"
    :title="`Station Operations · ${selectedStationLabel}`"
    :updated-at="updatedLabel"
  >
    <template #context>
      <div class="station-operations-header__context">
        <VSelect
          v-model="stationCodeModel"
          :items="stationItems"
          :disabled="!canChangeStation"
          label="Station"
          density="compact"
          hide-details
          variant="outlined"
        />

        <VDateInput
          v-model="operationalDateModel"
          label="Tanggal operasi"
          density="compact"
          hide-details
          variant="outlined"
        />
      </div>
    </template>
    <template #actions>
      <VBtn
        v-if="canReadAssets"
        to="/asset-management/register"
        prepend-icon="mdi-package-variant-closed"
        variant="outlined"
      >
        Aset station
      </VBtn>
      <VBtn
        prepend-icon="mdi-refresh"
        :loading="refreshing"
        text="Perbarui"
        variant="tonal"
        @click="emit('refresh')"
      />
    </template>
  </DsOperationalPageHeader>
</template>

<style scoped>
.station-operations-header__context {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  width: 100%;
}

@media (min-width: 600px) {
  .station-operations-header__context {
    grid-template-columns: minmax(220px, 1fr) minmax(190px, 0.8fr);
  }
}

@media (min-width: 1280px) {
  .station-operations-header__context {
    width: min(520px, 40vw);
  }
}
</style>
