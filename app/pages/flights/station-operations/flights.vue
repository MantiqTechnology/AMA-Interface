<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import {
  formatDateDisplay,
  numberFormat
} from '../../../features/station-operations/utils/stationOperationsFormatters';
import { type StationFlightRow } from '../../../features/station-operations/types/stationOperations';

const { context, pending, dataset } = useStationOperationsPageData();
const route = useRoute();
const router = useRouter();
const search = ref(String(route.query.search ?? ''));
const direction = ref(String(route.query.direction ?? 'ALL'));
const status = ref(String(route.query.status ?? 'ALL'));
const readiness = ref(String(route.query.readiness ?? 'ALL'));

watch([search, direction, status, readiness], () => {
  void router.replace({
    query: {
      ...route.query,
      ...(search.value ? { search: search.value } : { search: undefined }),
      ...(direction.value !== 'ALL' ? { direction: direction.value } : { direction: undefined }),
      ...(status.value !== 'ALL' ? { status: status.value } : { status: undefined }),
      ...(readiness.value !== 'ALL' ? { readiness: readiness.value } : { readiness: undefined })
    }
  });
});

const filteredFlights = computed<StationFlightRow[]>(() => {
  const term = search.value.trim().toLowerCase();
  const flights: StationFlightRow[] = dataset.value.flights;

  return flights.filter((flight: StationFlightRow) => {
    const matchesSearch =
      !term ||
      flight.flightNumber.toLowerCase().includes(term) ||
      `${flight.origin} ${flight.destination}`.toLowerCase().includes(term) ||
      flight.aircraftType.toLowerCase().includes(term);

    return (
      matchesSearch &&
      (direction.value === 'ALL' || flight.direction === direction.value) &&
      (status.value === 'ALL' || flight.status === status.value) &&
      (readiness.value === 'ALL' || flight.readiness === readiness.value)
    );
  });
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Daftar flight</h2>
        <p class="text-caption text-text-secondary">
          {{ context.selectedStationLabel.value }} ·
          {{ formatDateDisplay(context.operationalDateIso.value) }}
        </p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <VTextField
          v-model="search"
          label="Cari flight"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="direction"
          :items="['ALL', 'INBOUND', 'OUTBOUND']"
          label="Arah"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="status"
          :items="['ALL', 'SCHEDULED', 'BOARDING', 'ARRIVING', 'LANDED', 'DELAYED', 'DEPARTED']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="readiness"
          :items="['ALL', 'READY', 'CHECK', 'NOT_READY']"
          label="Kesiapan"
          density="compact"
          hide-details
          variant="outlined"
        />
      </div>
    </div>
    <VDivider />
    <div class="d-none d-md-block overflow-x-auto station-flight-table">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Flight</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>Type</th>
            <th>Status</th>
            <th>Kesiapan efektif</th>
            <th>Blocker / pemilik</th>
            <th>Pax</th>
            <th>Cargo</th>
            <th class="text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="11" class="py-8 text-center">
              <VSkeletonLoader type="table-row@3" />
            </td>
          </tr>
          <tr v-else-if="filteredFlights.length === 0">
            <td colspan="11" class="py-8 text-center text-text-secondary">
              Tidak ada flight yang sesuai dengan filter.
            </td>
          </tr>
          <tr v-for="row in filteredFlights" v-else :key="row.id">
            <td>
              <div class="font-weight-medium">{{ row.scheduledTime }}</div>
              <div class="text-caption text-text-secondary">{{ row.actualTime }}</div>
            </td>
            <td class="font-weight-medium">{{ row.flightNumber }}</td>
            <td>{{ row.origin }} → {{ row.destination }}</td>
            <td>
              <div>{{ row.aircraftRegistration || row.aircraftType }}</div>
              <div class="text-caption text-medium-emphasis">{{ row.aircraftType }}</div>
            </td>
            <td>{{ row.type }}</td>
            <td><DsStatusBadge :value="row.status" /></td>
            <td><DsStatusBadge :value="row.readiness" /></td>
            <td>
              <div>{{ row.blockerLabel ?? '-' }}</div>
              <div v-if="row.readinessOwner" class="text-caption text-medium-emphasis">
                Pemilik: {{ row.readinessOwner }}
              </div>
            </td>
            <td>{{ row.paxOnboard }} / {{ row.paxTotal }}</td>
            <td>{{ numberFormat(row.cargoWeightKg) }} kg</td>
            <td class="text-right">
              <DsTooltipIconButton
                icon="mdi-open-in-new"
                tooltip="Open flight workspace"
                variant="text"
                :to="`/flights/station-operations/${row.flightId}`"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <div class="d-md-none pa-3 d-grid ga-3">
      <VSkeletonLoader v-if="pending" type="article@3" />
      <VCard v-for="row in filteredFlights" v-else :key="row.id" border variant="flat">
        <VCardText>
          <div class="d-flex justify-space-between align-start ga-3">
            <div>
              <div class="text-h6 font-weight-bold">{{ row.flightNumber }}</div>
              <div class="text-body-2">{{ row.origin }} → {{ row.destination }}</div>
            </div>
            <DsStatusBadge :value="row.readiness" />
          </div>
          <VDivider class="my-3" />
          <div class="station-flight-card__grid text-body-2">
            <span class="text-medium-emphasis">Jadwal</span><strong>{{ row.scheduledTime }}</strong>
            <span class="text-medium-emphasis">Aircraft</span><span>{{ row.aircraftRegistration || row.aircraftType }}</span>
            <span class="text-medium-emphasis">Status</span><DsStatusBadge :value="row.status" />
            <span class="text-medium-emphasis">Blocker</span><span>{{ row.blockerLabel ?? '-' }}</span>
          </div>
        </VCardText>
        <VCardActions>
          <VBtn
            block
            :to="`/flights/station-operations/${row.flightId}`"
            text="Buka workspace flight"
            variant="tonal"
          />
        </VCardActions>
      </VCard>
    </div>
  </VCard>
</template>

<style scoped>
.station-flight-table table {
  min-width: 1160px;
}
.station-flight-card__grid {
  display: grid;
  grid-template-columns: minmax(90px, auto) minmax(0, 1fr);
  align-items: center;
  gap: 9px 14px;
}
</style>
