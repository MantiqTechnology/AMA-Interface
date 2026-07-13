<script setup lang="ts">
import type { RouteDto } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
const routeInfo = useRoute();
const { data: route, error } = await useAsyncData(`route-${routeInfo.params.id}`, () =>
  fetchApi<RouteDto>(`/api/master-data/routes/${routeInfo.params.id}`)
);
const { data: stations } = await useAsyncData(
  'route-detail-stations',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const station = (id: string) => stations.value.find((item) => item.id === id);
</script>
<template>
  <VContainer class="px-3 py-5" fluid>
    <VBtn prepend-icon="mdi-arrow-left" to="/master-data/routes" variant="text">Routes</VBtn><VAlert v-if="error" color="error">{{ error.message }}</VAlert><template v-else-if="route">
      <h1 class="my-4 text-h4 font-weight-bold">{{ route.routeCode }}</h1>
      <VCard border>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <strong>Origin</strong>
              <div>
                {{ station(route.originStationId)?.stationCode }} ·
                {{ station(route.originStationId)?.stationName }}
              </div>
            </VCol><VCol cols="12" md="6">
              <strong>Destination</strong>
              <div>
                {{ station(route.destinationStationId)?.stationCode }} ·
                {{ station(route.destinationStationId)?.stationName }}
              </div>
            </VCol><VCol cols="12" md="6">
              <strong>Duration</strong>
              <div>{{ route.estimatedDurationMinutes }} minutes</div>
            </VCol><VCol cols="12" md="6">
              <strong>Distance</strong>
              <div>{{ route.distanceKm }} km</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </template>
  </VContainer>
</template>
