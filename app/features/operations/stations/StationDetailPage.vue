<script setup lang="ts">
import type { StationDto, StationInput } from '#shared/features/operations/stations';
import StationFormDialog from './StationFormDialog.vue';

const pageRoute = useRoute();
const { can } = useAuthorization();
const { pushToast } = useDemoToasts();

const stationId = computed(() => String(pageRoute.params.id));
const editDialog = ref(false);
const duplicating = ref(false);

const canEdit = computed(() => can('platform.module.manage').allowed);

const {
  data: station,
  pending,
  error,
  refresh
} = await useAsyncData(
  `station-detail-${stationId.value}`,
  () => fetchApi<StationDto>(`/api/master-data/stations/${stationId.value}`),
  { watch: [stationId] }
);

function errorCode(err: unknown) {
  if (!err || typeof err !== 'object') return null;
  const data = Reflect.get(err, 'data');
  const nestedError = data && typeof data === 'object' ? Reflect.get(data, 'error') : null;
  return nestedError && typeof nestedError === 'object' ? Reflect.get(nestedError, 'code') : null;
}

const notFound = computed(() => errorCode(error.value) === 'NOT_FOUND');
const forbidden = computed(() => errorCode(error.value) === 'FORBIDDEN');

function openEdit() {
  if (!canEdit.value) return;
  editDialog.value = true;
}

async function duplicateStation() {
  if (!station.value || !canEdit.value) return;
  duplicating.value = true;
  try {
    const duplicate: StationInput = {
      stationCode: `${station.value.stationCode}-COPY`,
      stationName: `${station.value.stationName} (Copy)`,
      iataCode: station.value.iataCode,
      icaoCode: station.value.icaoCode,
      airportType: station.value.airportType,
      operationalStatus: station.value.operationalStatus,
      city: station.value.city,
      province: station.value.province,
      countryCode: station.value.countryCode,
      timezone: station.value.timezone,
      latitude: station.value.latitude,
      longitude: station.value.longitude,
      elevationFt: station.value.elevationFt,
      surfaceType: station.value.surfaceType,
      runwayLengthM: station.value.runwayLengthM,
      runwayWidthM: station.value.runwayWidthM,
      stationPicName: station.value.stationPic.name,
      stationPicPhone: station.value.stationPic.phone,
      operationalNotes: station.value.operationalNotes,
      isRemoteStation: station.value.isRemoteStation,
      lowConnectivityMode: station.value.lowConnectivityMode,
      hasFuelService: station.value.hasFuelService,
      hasHandlingService: station.value.hasHandlingService,
      hasParkingService: station.value.hasParkingService
    };
    const created = await fetchApi<StationDto>('/api/master-data/stations', {
      method: 'POST',
      body: duplicate
    });
    pushToast({ type: 'success', title: 'Station duplicated' });
    await navigateTo(`/master-data/stations/${created.id}`);
  } catch (err) {
    pushToast({
      type: 'error',
      title: 'Duplication failed',
      message: err instanceof Error ? err.message : 'Unable to duplicate station'
    });
  } finally {
    duplicating.value = false;
  }
}

function formatAirportType(type: string | null): string {
  if (!type) return 'Unknown';
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatOperationalStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getOperationalStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'INACTIVE':
      return 'default';
    case 'SUSPENDED':
      return 'warning';
    default:
      return 'default';
  }
}

function formatSurfaceType(type: string | null): string {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function formatCapabilities(station: StationDto): string {
  const caps: string[] = [];
  if (station.hasFuelService) caps.push('Fuel');
  if (station.hasHandlingService) caps.push('Handling');
  if (station.hasParkingService) caps.push('Parking');
  return caps.length ? caps.join(' · ') : 'No services recorded';
}
</script>

<template>
  <VContainer class="station-detail px-3 py-5 md:px-5" fluid>
    <div class="mb-4">
      <VBtn prepend-icon="mdi-arrow-left" to="/master-data/stations" variant="text">
        Stations
      </VBtn>
    </div>

    <VSkeletonLoader v-if="pending" type="heading, paragraph, card" />

    <VAlert v-else-if="error || !station" color="error" variant="tonal">
      <div class="font-weight-bold">
        {{
          notFound
            ? 'Station not found'
            : forbidden
              ? 'Station access is not available for this role'
              : 'Unable to load station detail'
        }}
      </div>
      <div class="mt-1 text-body-2">
        {{
          notFound
            ? 'The station may have been removed or the demo database was reset.'
            : forbidden
              ? 'Switch to a role with master data read access.'
              : 'The station data could not be loaded. Try the request again.'
        }}
      </div>
      <template #append>
        <VBtn v-if="notFound || forbidden" to="/master-data/stations" variant="text">
          Back to stations
        </VBtn>
        <VBtn v-else prepend-icon="mdi-refresh" variant="text" @click="refresh"> Retry </VBtn>
      </template>
    </VAlert>

    <template v-else-if="station">
      <header class="mb-5 d-flex flex-wrap align-start ga-4">
        <div class="min-w-0 flex-grow-1">
          <div class="mb-2 d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-text-primary">
              {{ station.stationCode }} · {{ station.stationName }}
            </h1>
            <VChip :color="station.isActive ? 'success' : 'default'" size="small" variant="tonal">
              {{ station.isActive ? 'Active' : 'Inactive' }}
            </VChip>
          </div>
          <p class="text-body-1 text-text-secondary">{{ station.city }}, {{ station.province }}</p>
          <div class="mt-2 d-flex flex-wrap align-center ga-2 text-body-2 text-text-secondary">
            <span>{{ formatAirportType(station.airportType) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ formatCapabilities(station) }}</span>
          </div>
        </div>

        <div class="d-none d-sm-flex ga-2">
          <VBtn v-if="canEdit" color="primary" prepend-icon="mdi-pencil-outline" @click="openEdit">
            Edit
          </VBtn>
          <VBtn
            v-if="canEdit"
            :disabled="duplicating"
            prepend-icon="mdi-content-copy"
            variant="outlined"
            @click="duplicateStation"
          >
            Duplicate
          </VBtn>
        </div>

        <VMenu v-if="canEdit" class="d-sm-none">
          <template #activator="{ props: menuProps }">
            <DsTooltipIconButton
              v-bind="menuProps"
              icon="mdi-dots-vertical"
              tooltip="Station actions"
              variant="text"
            />
          </template>
          <VList density="compact">
            <VListItem prepend-icon="mdi-pencil-outline" title="Edit station" @click="openEdit" />
            <VListItem
              :disabled="duplicating"
              prepend-icon="mdi-content-copy"
              title="Duplicate station"
              @click="duplicateStation"
            />
          </VList>
        </VMenu>
      </header>

      <VCard border class="mb-4">
        <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
          Station details
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <div class="detail-label">Location</div>
              <div class="detail-value">{{ station.city }}, {{ station.province }}</div>
              <div v-if="station.countryCode" class="text-caption text-text-secondary">
                {{ station.countryCode }}
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Airport codes</div>
              <div class="detail-value">
                <template v-if="station.iataCode">
                  <strong>IATA:</strong> {{ station.iataCode }}
                </template>
                <template v-else>
                  <span class="text-text-secondary">IATA: —</span>
                </template>
              </div>
              <div>
                <template v-if="station.icaoCode">
                  <strong>ICAO:</strong> {{ station.icaoCode }}
                </template>
                <template v-else>
                  <span class="text-text-secondary">ICAO: —</span>
                </template>
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Station PIC</div>
              <div class="detail-value">
                <template v-if="station.stationPic.name">
                  {{ station.stationPic.name }}
                  <div v-if="station.stationPic.phone" class="text-caption text-text-secondary">
                    {{ station.stationPic.phone }}
                  </div>
                </template>
                <template v-else>—</template>
              </div>
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <VRow>
            <VCol cols="12" md="4">
              <div class="detail-label">Airport type</div>
              <div class="detail-value">
                {{ station.airportType ? formatAirportType(station.airportType) : '—' }}
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Operational status</div>
              <div class="detail-value">
                <VChip
                  :color="getOperationalStatusColor(station.operationalStatus)"
                  size="small"
                  variant="tonal"
                >
                  {{ formatOperationalStatus(station.operationalStatus) }}
                </VChip>
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Timezone</div>
              <div class="detail-value">{{ station.timezone }}</div>
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <VRow>
            <VCol cols="12" md="6">
              <div class="detail-label">Coordinates</div>
              <div class="detail-value">
                <template v-if="station.latitude !== null && station.longitude !== null">
                  {{ station.latitude.toFixed(4) }}, {{ station.longitude.toFixed(4) }}
                </template>
                <template v-else>
                  <span class="text-text-secondary">—</span>
                </template>
              </div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="detail-label">Elevation</div>
              <div class="detail-value">
                <template v-if="station.elevationFt !== null">
                  {{ station.elevationFt.toLocaleString() }} ft
                </template>
                <template v-else>
                  <span class="text-text-secondary">—</span>
                </template>
              </div>
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <VRow>
            <VCol cols="12" md="4">
              <div class="detail-label">Surface type</div>
              <div class="detail-value">
                {{ station.surfaceType ? formatSurfaceType(station.surfaceType) : '—' }}
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Runway length</div>
              <div class="detail-value">
                <template v-if="station.runwayLengthM !== null">
                  {{ station.runwayLengthM.toLocaleString() }} m
                </template>
                <template v-else>
                  <span class="text-text-secondary">—</span>
                </template>
              </div>
            </VCol>
            <VCol cols="12" md="4">
              <div class="detail-label">Runway width</div>
              <div class="detail-value">
                <template v-if="station.runwayWidthM !== null">
                  {{ station.runwayWidthM.toLocaleString() }} m
                </template>
                <template v-else>
                  <span class="text-text-secondary">—</span>
                </template>
              </div>
            </VCol>
          </VRow>

          <VDivider v-if="station.operationalNotes" class="my-4" />

          <div v-if="station.operationalNotes">
            <div class="detail-label">Operational notes</div>
            <div class="detail-value text-body-2">{{ station.operationalNotes }}</div>
          </div>
        </VCardText>
      </VCard>

      <VCard border>
        <VCardTitle class="text-subtitle-1 font-weight-bold text-text-primary">
          Metadata
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <div class="detail-label">Created</div>
              <div class="detail-value text-body-2">
                {{
                  new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Jayapura'
                  }).format(new Date(station.createdAt))
                }}
              </div>
            </VCol>
            <VCol cols="12" md="6">
              <div class="detail-label">Last updated</div>
              <div class="detail-value text-body-2">
                {{
                  new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Jayapura'
                  }).format(new Date(station.updatedAt))
                }}
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <StationFormDialog v-if="canEdit" v-model="editDialog" :station="station" @saved="refresh" />
    </template>
  </VContainer>
</template>

<style scoped>
.station-detail {
  max-width: 1440px;
}

.detail-label {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.detail-value {
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.875rem;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .station-detail header h1 {
    font-size: 1.5rem !important;
  }
}
</style>
