<script setup lang="ts">
import type { StationDto } from '#shared/features/operations/stations';
const route = useRoute();
const { data: station, error } = await useAsyncData(`station-${route.params.id}`, () =>
  fetchApi<StationDto>(`/api/master-data/stations/${route.params.id}`)
);
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/stations" variant="text">Stations</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="station">
      <h1 class="my-4 text-h4 font-weight-bold">
        {{ station.stationCode }} · {{ station.stationName }}
      </h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <strong>Location</strong>
              <div>{{ station.cityOrRegion }}, {{ station.province }}</div>
            </VCol><VCol cols="12" md="4">
              <strong>Airport type</strong>
              <div>{{ station.airportType }}</div>
            </VCol><VCol cols="12" md="4">
              <strong>Station PIC</strong>
              <div>{{ station.stationPicName || '-' }}</div>
            </VCol><VCol cols="12">
              <strong>Operational notes</strong>
              <div>{{ station.operationalNotes || '-' }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
