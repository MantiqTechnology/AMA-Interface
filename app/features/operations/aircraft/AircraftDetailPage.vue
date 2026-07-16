<script setup lang="ts">
import type {
  FlightMaintenanceHandoffDto,
  FlightOperationDetailDto,
  FlightOperationOverviewDto,
  FlightOperationRecord
} from '#shared/contracts/flight-operations';
import type { AircraftDto } from '#shared/features/operations/aircraft';
import type { FlightCapacityProfileDto } from '#shared/features/operations/flight-capacity-profiles';
import type { StationDto } from '#shared/features/operations/stations';
import type { InventorySerializedPartDto } from '#shared/features/inventory';
import AircraftFormDialog from './AircraftFormDialog.vue';

type ReadinessState = 'pass' | 'warning' | 'fail';

type ProfileData = {
  aircraft: AircraftDto;
  stations: StationDto[];
  upcomingFlight: FlightOperationRecord | null;
  upcomingFlightDetail: FlightOperationDetailDto | null;
  maintenanceHandoffs: FlightMaintenanceHandoffDto[];
  capacityProfiles: FlightCapacityProfileDto[];
  installedComponents: InventorySerializedPartDto[];
};

const pageRoute = useRoute();
const session = useDemoSession();
const { can } = useAuthorization();
const editOpen = ref(false);
const imageAvailable = ref(true);
const aircraftId = computed(() => String(pageRoute.params.id));

await session.load();

const currentDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jayapura',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const {
  data: profile,
  pending,
  error,
  refresh
} = await useAsyncData(
  `aircraft-operational-profile-${aircraftId.value}`,
  async () => {
    const aircraft = await fetchApi<AircraftDto>(`/api/master-data/aircraft/${aircraftId.value}`);
    const [stations, operations, maintenanceHandoffs, capacityProfiles, serializedComponents] =
      await Promise.all([
        fetchApi<StationDto[]>('/api/master-data/stations', {
          query: { active: 'all' }
        }),
        fetchApi<FlightOperationOverviewDto>('/api/flight-operations/flights', {
          query: {
            aircraftId: aircraft.id,
            scheduledFrom: new Date().toISOString(),
            excludeTerminal: true,
            sortDirection: 'asc',
            limit: 1
          }
        }),
        fetchApi<FlightMaintenanceHandoffDto[]>('/api/flight-operations/maintenance', {
          query: { search: aircraft.registrationNumber }
        }),
        fetchApi<FlightCapacityProfileDto[]>('/api/master-data/flight-capacity-profiles', {
          query: { active: 'active' }
        }),
        fetchApi<InventorySerializedPartDto[]>('/api/inventory/repairables')
      ]);

    const upcomingFlight = operations.flights[0];

    const upcomingFlightDetail = upcomingFlight
      ? await fetchApi<FlightOperationDetailDto>(
          `/api/flight-operations/flights/${upcomingFlight.id}`
        )
      : null;

    return {
      aircraft,
      stations,
      upcomingFlight: upcomingFlight ?? null,
      upcomingFlightDetail,
      maintenanceHandoffs: maintenanceHandoffs.filter(
        (handoff) => handoff.aircraftId === aircraft.id
      ),
      capacityProfiles: capacityProfiles.filter((item) => item.aircraftId === aircraft.id),
      installedComponents: serializedComponents.filter((item) => item.aircraftId === aircraft.id)
    } satisfies ProfileData;
  },
  {
    watch: [aircraftId]
  }
);

const record = computed(() => profile.value?.aircraft ?? null);
const upcomingFlight = computed(() => profile.value?.upcomingFlight ?? null);
const latestHandoff = computed(() => profile.value?.maintenanceHandoffs[0] ?? null);
const installedComponents = computed(() => profile.value?.installedComponents ?? []);
const componentAlerts = computed(() =>
  installedComponents.value.filter(
    (component) =>
      component.condition !== 'INSTALLED' ||
      !component.certificateVerified ||
      Boolean(component.repairOrderStatus)
  )
);
const canEdit = computed(() => can('platform.module.manage').allowed);
const effectiveCapacityProfile = computed(() => {
  const aircraft = record.value;
  const profiles = profile.value?.capacityProfiles ?? [];
  if (!aircraft) return null;

  const defaultProfile = profiles.find((item) => item.id === aircraft.defaultCapacityProfileId);
  if (defaultProfile) return defaultProfile;

  const flight = upcomingFlight.value;
  const assignmentProfile = flight
    ? profiles.find(
        (item) => item.routeId === flight.routeId && item.serviceTypeId === flight.serviceTypeId
      )
    : undefined;
  return assignmentProfile ?? profiles[0] ?? null;
});

const stationById = computed(
  () => new Map((profile.value?.stations ?? []).map((station) => [station.id, station]))
);

const homeBase = computed(() =>
  record.value?.baseStationId ? stationById.value.get(record.value.baseStationId) : undefined
);
const currentStation = computed(() =>
  record.value?.currentStationId ? stationById.value.get(record.value.currentStationId) : undefined
);

const normalizedAircraftType = computed(
  () => record.value?.aircraftType.trim().toLowerCase() ?? ''
);
const normalizedManufacturer = computed(
  () => record.value?.manufacturer.trim().toLowerCase() ?? ''
);
const aircraftImage = computed(() => {
  const registrationImages: Record<string, string> = {};
  const typeImages: Record<string, string> = {
    'pilatus pc-6': '/images/aircraft/pilatus-pc6.webp'
  };
  const manufacturerImages: Record<string, string> = {};

  return (
    registrationImages[record.value?.registrationNumber.toLowerCase() ?? ''] ??
    typeImages[normalizedAircraftType.value] ??
    manufacturerImages[normalizedManufacturer.value] ??
    null
  );
});

watch(aircraftImage, () => {
  imageAvailable.value = true;
});

const aircraftReadinessItems = computed(() => {
  if (!record.value) return [];

  const flight = upcomingFlight.value;
  const operational = record.value.isActive && record.value.operationalStatus === 'ACTIVE';
  const serviceability = record.value.serviceabilityStatus;
  const stationKnown = Boolean(currentStation.value);
  const positioned = flight
    ? record.value.currentStationId === flight.originStationId
    : stationKnown;
  const maintenanceReference = flight?.scheduledDepartureAt?.slice(0, 10) ?? currentDate;
  const maintenanceScheduled = Boolean(record.value.nextMaintenanceDueAt);
  const maintenanceClear = Boolean(
    record.value.nextMaintenanceDueAt && record.value.nextMaintenanceDueAt > maintenanceReference
  );

  return [
    {
      label: 'Operational status',
      detail: operational ? 'Active and available for assignment' : 'Inactive or retired',
      state: operational ? 'pass' : 'fail'
    },
    {
      label: 'Serviceability',
      detail:
        serviceability === 'SERVICEABLE'
          ? 'No serviceability restriction recorded'
          : displayStatus(serviceability),
      state:
        serviceability === 'SERVICEABLE'
          ? 'pass'
          : serviceability === 'SERVICEABLE_WITH_RESTRICTIONS'
            ? 'warning'
            : 'fail'
    },
    {
      label: 'Aircraft position',
      detail: flight
        ? positioned
          ? `Positioned at ${flight.originStationCode}`
          : `At ${currentStation.value?.stationCode ?? 'unknown'}, required at ${flight.originStationCode}`
        : stationKnown
          ? `Position recorded at ${currentStation.value?.stationCode}`
          : 'Current station is not recorded',
      state: flight ? (positioned ? 'pass' : 'fail') : stationKnown ? 'pass' : 'warning'
    },
    {
      label: 'Maintenance window',
      detail: maintenanceScheduled
        ? maintenanceClear
          ? `Clear through ${formatDate(record.value.nextMaintenanceDueAt)}`
          : `Due ${formatDate(record.value.nextMaintenanceDueAt)}`
        : 'Next maintenance date is not scheduled',
      state: maintenanceClear ? 'pass' : maintenanceScheduled ? 'fail' : 'warning'
    }
  ] satisfies Array<{ label: string; detail: string; state: ReadinessState }>;
});

const flightReadinessChecks = computed(
  () => profile.value?.upcomingFlightDetail?.readinessChecks ?? []
);

const readinessItems = computed(() => {
  const checks = flightReadinessChecks.value;
  if (!checks.length) return aircraftReadinessItems.value;

  const itemState = (status: string): ReadinessState => {
    if (status === 'PASS' || status === 'NOT_APPLICABLE') return 'pass';
    if (status === 'PENDING') return 'warning';
    return 'fail';
  };
  const aircraftChecks = checks.filter((check) => check.category === 'AIRCRAFT');
  const otherChecks = checks.filter((check) => check.category !== 'AIRCRAFT');
  const otherReady = otherChecks.filter((check) =>
    ['PASS', 'NOT_APPLICABLE'].includes(check.status)
  ).length;
  const otherState: ReadinessState = otherChecks.some((check) => check.status === 'FAIL')
    ? 'fail'
    : otherChecks.some((check) => check.status === 'PENDING')
      ? 'warning'
      : 'pass';

  return [
    ...aircraftChecks.map((check) => ({
      label: check.checkName,
      detail: check.resultNote ?? displayStatus(check.status),
      state: itemState(check.status)
    })),
    ...(otherChecks.length
      ? [
          {
            label: 'Other operational checks',
            detail: `${otherReady}/${otherChecks.length} crew, manifest, fuel, station, and governance checks clear`,
            state: otherState
          }
        ]
      : [])
  ];
});

const readinessScore = computed(() => {
  if (flightReadinessChecks.value.length) return upcomingFlight.value?.readinessPercent ?? 0;
  if (!readinessItems.value.length) return 0;
  const weighted = readinessItems.value.reduce((total, item) => {
    if (item.state === 'pass') return total + 1;
    if (item.state === 'warning') return total + 0.5;
    return total;
  }, 0);
  return Math.round((weighted / readinessItems.value.length) * 100);
});

const readinessLabel = computed(() => {
  if (flightReadinessChecks.value.some((check) => check.status === 'FAIL')) return 'Not ready';
  if (flightReadinessChecks.value.some((check) => check.status === 'PENDING')) {
    return 'Review required';
  }
  if (readinessItems.value.some((item) => item.state === 'fail')) return 'Not ready';
  if (readinessItems.value.some((item) => item.state === 'warning')) return 'Review required';
  return 'Operationally ready';
});

const readinessColor = computed(() => {
  if (readinessLabel.value === 'Not ready') return 'error';
  if (readinessLabel.value === 'Review required') return 'warning';
  return 'success';
});

const maintenanceDueLabel = computed(() => {
  const dueAt = record.value?.nextMaintenanceDueAt;
  if (!dueAt) return 'Not scheduled';
  const difference = dateDifferenceInDays(currentDate, dueAt);
  if (difference < 0) return `${Math.abs(difference)} days overdue`;
  if (difference === 0) return 'Due today';
  return `Due in ${difference} days`;
});

const upcomingReadinessLabel = computed(() => {
  const detail = profile.value?.upcomingFlightDetail;
  if (!detail || detail.readinessChecks.length === 0) return 'Not evaluated';
  return detail.readinessSummary;
});

const readinessContextLabel = computed(() =>
  flightReadinessChecks.value.length ? 'Upcoming flight gate' : 'Current aircraft gate'
);

function stationLabel(station?: StationDto) {
  return station ? `${station.stationCode} - ${station.stationName}` : 'Not recorded';
}

function displayStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+09:00`));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function dateDifferenceInDays(from: string, to: string) {
  const millisecondsPerDay = 86_400_000;
  return Math.ceil(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / millisecondsPerDay
  );
}

function serviceabilityColor(status: string) {
  if (status === 'SERVICEABLE') return 'success';
  if (status === 'SERVICEABLE_WITH_RESTRICTIONS' || status === 'MAINTENANCE_DUE') {
    return 'warning';
  }
  return 'error';
}

function readinessIcon(state: ReadinessState) {
  if (state === 'pass') return 'mdi-check-circle-outline';
  if (state === 'warning') return 'mdi-alert-outline';
  return 'mdi-close-circle-outline';
}

function readinessItemColor(state: ReadinessState) {
  if (state === 'pass') return 'success';
  if (state === 'warning') return 'warning';
  return 'error';
}
</script>

<template>
  <VContainer class="aircraft-profile px-3 py-5 md:px-4" fluid>
    <div class="mb-4 d-flex align-center justify-space-between ga-3">
      <VBtn prepend-icon="mdi-arrow-left" to="/master-data/aircraft" variant="text">
        Aircraft
      </VBtn>
      <DsTooltipIconButton
        aria-label="Refresh aircraft operational profile"
        icon="mdi-refresh"
        tooltip="Refresh profile"
        variant="text"
        @click="refresh"
      />
    </div>

    <VSkeletonLoader v-if="pending" type="image, heading, paragraph, table" />

    <VAlert
      v-else-if="error || !record"
      color="error"
      icon="mdi-airplane-alert"
      title="Aircraft profile is unavailable"
      variant="tonal"
    >
      <p>{{ error?.message || 'The requested aircraft could not be found.' }}</p>
      <VBtn class="mt-3" prepend-icon="mdi-arrow-left" to="/master-data/aircraft" variant="text">
        Back to aircraft
      </VBtn>
    </VAlert>

    <template v-else>
      <header class="aircraft-profile__header mb-6">
        <div class="aircraft-profile__media">
          <VImg
            v-if="aircraftImage && imageAvailable"
            :alt="`Representative ${record.aircraftType} aircraft`"
            class="aircraft-profile__image"
            cover
            :src="aircraftImage"
            @error="imageAvailable = false"
          />
          <div
            v-else
            class="aircraft-profile__image-fallback"
            role="img"
            :aria-label="record.aircraftType"
          >
            <VIcon icon="mdi-airplane" size="72" />
          </div>
          <span v-if="aircraftImage && imageAvailable" class="aircraft-profile__image-label">
            Representative aircraft image ·
            <a
              href="https://commons.wikimedia.org/wiki/File:Pilatus_PC-6_(4872152588).jpg"
              rel="noopener noreferrer"
              target="_blank"
            >
              Yannick Bammert / CC BY 2.0
            </a>
          </span>
        </div>

        <div class="aircraft-profile__identity">
          <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
            Aircraft Operational Profile
          </div>
          <div class="mt-1 d-flex flex-wrap align-center ga-2">
            <h1 class="text-h3 font-weight-bold text-text-primary">
              {{ record.registrationNumber }}
            </h1>
            <VChip
              :color="record.operationalStatus === 'ACTIVE' ? 'success' : 'warning'"
              size="small"
              variant="tonal"
            >
              {{ displayStatus(record.operationalStatus) }}
            </VChip>
            <VChip
              :color="serviceabilityColor(record.serviceabilityStatus)"
              size="small"
              variant="tonal"
            >
              {{ displayStatus(record.serviceabilityStatus) }}
            </VChip>
          </div>
          <p class="mt-2 text-subtitle-1 text-text-secondary">
            {{ record.manufacturer }} {{ record.model }} · {{ record.aircraftType }}
          </p>
          <div class="aircraft-profile__identity-metadata mt-5">
            <div>
              <div class="profile-label">Fleet code</div>
              <strong>{{ record.fleetCode ?? 'Not assigned' }}</strong>
            </div>
            <div>
              <div class="profile-label">Serial / MSN</div>
              <strong>{{ record.serialNumber ?? 'Not recorded' }}</strong>
            </div>
            <div>
              <div class="profile-label">Master record</div>
              <strong>{{ record.isActive ? 'Active' : 'Inactive' }}</strong>
            </div>
          </div>
          <div class="mt-6 d-flex flex-wrap ga-2">
            <VBtn
              v-if="canEdit"
              color="primary"
              prepend-icon="mdi-pencil-outline"
              @click="editOpen = true"
            >
              Edit aircraft
            </VBtn>
            <VBtn
              prepend-icon="mdi-wrench-clock"
              :to="{
                path: '/flights/maintenance',
                query: { search: record.registrationNumber }
              }"
              variant="outlined"
            >
              Maintenance handoff
            </VBtn>
          </div>
        </div>
      </header>

      <section class="aircraft-profile__facts mb-6" aria-label="Aircraft operational summary">
        <div class="aircraft-profile__fact">
          <VIcon color="secondary" icon="mdi-map-marker-radius-outline" />
          <div>
            <div class="profile-label">Current station</div>
            <strong>{{ stationLabel(currentStation) }}</strong>
          </div>
        </div>
        <div class="aircraft-profile__fact">
          <VIcon color="primary" icon="mdi-home-map-marker" />
          <div>
            <div class="profile-label">Home base</div>
            <strong>{{ stationLabel(homeBase) }}</strong>
          </div>
        </div>
        <div class="aircraft-profile__fact">
          <VIcon
            :color="serviceabilityColor(record.serviceabilityStatus)"
            icon="mdi-shield-airplane-outline"
          />
          <div>
            <div class="profile-label">Serviceability</div>
            <strong>{{ displayStatus(record.serviceabilityStatus) }}</strong>
          </div>
        </div>
        <div class="aircraft-profile__fact">
          <VIcon color="warning" icon="mdi-calendar-clock-outline" />
          <div>
            <div class="profile-label">Next maintenance</div>
            <strong>{{ formatDate(record.nextMaintenanceDueAt) }}</strong>
            <div class="text-caption text-medium-emphasis">{{ maintenanceDueLabel }}</div>
          </div>
        </div>
      </section>

      <VAlert
        v-if="record.serviceabilityNote"
        class="mb-6"
        :color="record.serviceabilityStatus === 'SERVICEABLE' ? 'info' : 'warning'"
        icon="mdi-alert-decagram-outline"
        title="Operational note"
        variant="tonal"
      >
        {{ record.serviceabilityNote }}
      </VAlert>

      <VRow align="stretch">
        <VCol cols="12" lg="8">
          <VCard border class="mb-4" height="100%">
            <VCardTitle class="profile-card-title">
              <span>Operational readiness</span>
              <VChip :color="readinessColor" size="small" variant="tonal">
                {{ readinessLabel }}
              </VChip>
            </VCardTitle>
            <VDivider />
            <VCardText class="aircraft-profile__readiness">
              <div class="aircraft-profile__score">
                <VProgressCircular
                  aria-label="Operational readiness"
                  :aria-valuetext="`${readinessScore}% - ${readinessLabel}`"
                  :color="readinessColor"
                  :model-value="readinessScore"
                  :size="112"
                  :width="10"
                >
                  <strong class="text-h5">{{ readinessScore }}%</strong>
                </VProgressCircular>
                <span class="mt-2 text-caption text-medium-emphasis">{{
                  readinessContextLabel
                }}</span>
              </div>
              <div class="aircraft-profile__checks">
                <div v-for="item in readinessItems" :key="item.label" class="readiness-check">
                  <VIcon
                    :color="readinessItemColor(item.state)"
                    :icon="readinessIcon(item.state)"
                  />
                  <div>
                    <strong>{{ item.label }}</strong>
                    <div class="text-body-2 text-medium-emphasis">{{ item.detail }}</div>
                  </div>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border height="100%">
            <VCardTitle class="profile-card-title">
              <span>Capacity & configuration</span>
              <VChip v-if="effectiveCapacityProfile" size="small" variant="tonal">
                {{ effectiveCapacityProfile.profileCode }}
              </VChip>
            </VCardTitle>
            <VDivider />
            <VCardText class="pa-0">
              <dl class="profile-definition-list">
                <div>
                  <dt>Passenger capacity</dt>
                  <dd>
                    {{ effectiveCapacityProfile?.seatCapacity ?? record.passengerCapacity }}
                    configured
                    <small v-if="effectiveCapacityProfile">
                      {{
                        Math.max(
                          0,
                          effectiveCapacityProfile.seatCapacity -
                            effectiveCapacityProfile.reservedSeatCount
                        )
                      }}
                      usable ·
                      {{ record.passengerCapacity }} max
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>Cargo capacity</dt>
                  <dd>
                    {{
                      (
                        effectiveCapacityProfile?.cargoCapacityKg ?? record.cargoCapacityKg
                      ).toLocaleString('id-ID')
                    }}
                    kg configured
                    <small v-if="effectiveCapacityProfile">
                      {{
                        Math.max(
                          0,
                          effectiveCapacityProfile.cargoCapacityKg -
                            effectiveCapacityProfile.reservedCargoKg
                        ).toLocaleString('id-ID')
                      }}
                      kg usable ·
                      {{ record.cargoCapacityKg.toLocaleString('id-ID') }} kg max
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>Fuel type</dt>
                  <dd>{{ record.fuelType }}</dd>
                </div>
                <div>
                  <dt>Aircraft type</dt>
                  <dd>{{ record.aircraftType }}</dd>
                </div>
                <div v-if="effectiveCapacityProfile">
                  <dt>Configuration</dt>
                  <dd>
                    {{ effectiveCapacityProfile.profileName }}
                    <small v-if="effectiveCapacityProfile.capacityNote">
                      {{ effectiveCapacityProfile.capacityNote }}
                    </small>
                  </dd>
                </div>
              </dl>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="8">
          <VCard border height="100%">
            <VCardTitle class="profile-card-title">
              <span>Upcoming flight assignment</span>
              <FlightsFlightStatusChip
                v-if="upcomingFlight"
                :status="upcomingFlight.currentStatus"
              />
            </VCardTitle>
            <VDivider />
            <VCardText v-if="upcomingFlight">
              <div class="aircraft-profile__flight-heading">
                <div>
                  <div class="text-caption font-weight-bold text-medium-emphasis">FLIGHT</div>
                  <NuxtLink
                    class="profile-link text-h5 font-weight-bold"
                    :to="`/flights/${upcomingFlight.id}`"
                  >
                    {{ upcomingFlight.flightNumber }}
                  </NuxtLink>
                </div>
                <div class="aircraft-profile__route" aria-label="Flight route">
                  <strong>{{ upcomingFlight.originStationCode }}</strong>
                  <VIcon icon="mdi-arrow-right" size="small" />
                  <strong>{{ upcomingFlight.destinationStationCode }}</strong>
                </div>
              </div>
              <div class="mt-5 assignment-grid">
                <div>
                  <div class="profile-label">Scheduled departure</div>
                  <strong>{{ formatDateTime(upcomingFlight.scheduledDepartureAt) }}</strong>
                </div>
                <div>
                  <div class="profile-label">Scheduled arrival</div>
                  <strong>{{ formatDateTime(upcomingFlight.scheduledArrivalAt) }}</strong>
                </div>
                <div>
                  <div class="profile-label">Pilot in command</div>
                  <strong>{{ upcomingFlight.pilotInCommandName ?? 'Not assigned' }}</strong>
                </div>
                <div>
                  <div class="profile-label">Flight readiness</div>
                  <strong>{{ upcomingReadinessLabel }}</strong>
                </div>
              </div>
              <VProgressLinear
                aria-label="Upcoming flight readiness"
                :aria-valuetext="upcomingReadinessLabel"
                class="mt-5"
                color="secondary"
                height="8"
                :model-value="upcomingFlight.readinessPercent"
                rounded
              />
            </VCardText>
            <VCardText v-else class="empty-state">
              <VIcon color="medium-emphasis" icon="mdi-calendar-blank-outline" size="40" />
              <strong>No upcoming flight assignment</strong>
              <span class="text-body-2 text-medium-emphasis">
                This aircraft has no active assignment from today onward.
              </span>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" lg="4">
          <VCard border height="100%">
            <VCardTitle class="profile-card-title">
              <span>Maintenance snapshot</span>
              <VIcon icon="mdi-wrench-clock" size="small" />
            </VCardTitle>
            <VDivider />
            <VCardText>
              <dl class="maintenance-summary">
                <div>
                  <dt>Last inspection</dt>
                  <dd>{{ formatDate(record.lastMaintenanceCheckAt) }}</dd>
                </div>
                <div>
                  <dt>Next scheduled maintenance</dt>
                  <dd>{{ formatDate(record.nextMaintenanceDueAt) }}</dd>
                </div>
              </dl>

              <template v-if="latestHandoff">
                <VDivider class="my-4" />
                <div class="d-flex align-center justify-space-between ga-2">
                  <div class="profile-label">Latest handoff</div>
                  <DsStatusBadge :value="latestHandoff.status" />
                </div>
                <div class="mt-3 text-body-2">
                  <strong>{{
                    latestHandoff.workOrderReference ?? 'No work order reference'
                  }}</strong>
                  <p class="mt-1 text-medium-emphasis">
                    {{ latestHandoff.maintenanceNote ?? 'No maintenance note recorded.' }}
                  </p>
                </div>
              </template>
              <div v-else class="empty-state py-5">
                <VIcon color="medium-emphasis" icon="mdi-clipboard-text-clock-outline" size="36" />
                <strong>No maintenance handoff</strong>
                <span class="text-body-2 text-medium-emphasis">No linked handoff is recorded.</span>
              </div>

              <VBtn
                block
                class="mt-5"
                prepend-icon="mdi-open-in-new"
                :to="{
                  path: '/flights/maintenance',
                  query: { search: record.registrationNumber }
                }"
                variant="tonal"
              >
                Open Maintenance Handoff
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12">
          <div class="mb-3 d-flex align-center">
            <div>
              <h2 class="text-h6 font-weight-bold">Installed Components</h2>
              <div class="text-caption text-medium-emphasis">
                Serialized repairable and rotable configuration
              </div>
            </div>
            <VSpacer />
            <VChip
              :color="componentAlerts.length ? 'warning' : 'success'"
              :prepend-icon="
                componentAlerts.length ? 'mdi-alert-outline' : 'mdi-check-circle-outline'
              "
              size="small"
              variant="tonal"
            >
              {{
                componentAlerts.length ? `${componentAlerts.length} alert` : 'No component alerts'
              }}
            </VChip>
          </div>
          <VCard border>
            <VTable>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Part</th>
                  <th>Serial</th>
                  <th>Condition</th>
                  <th>TSN / CSN</th>
                  <th>Certificate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="component in installedComponents" :key="component.id">
                  <td class="font-weight-bold">{{ component.position ?? '-' }}</td>
                  <td>
                    <div>{{ component.partNumber }}</div>
                    <div class="text-caption text-medium-emphasis">{{ component.partName }}</div>
                  </td>
                  <td>{{ component.serialNumber }}</td>
                  <td><DsStatusBadge :value="component.condition" /></td>
                  <td>
                    {{ component.hoursSinceNew.toLocaleString('id-ID') }} h /
                    {{ component.cyclesSinceNew.toLocaleString('id-ID') }} c
                  </td>
                  <td>
                    <VIcon
                      class="me-1"
                      :color="component.certificateVerified ? 'success' : 'warning'"
                      :icon="
                        component.certificateVerified
                          ? 'mdi-shield-check-outline'
                          : 'mdi-shield-alert-outline'
                      "
                    />
                    {{ component.certificateReference ?? '-' }}
                  </td>
                </tr>
                <tr v-if="!installedComponents.length">
                  <td class="py-8 text-center text-medium-emphasis" colspan="6">
                    No serialized components are linked to this aircraft.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>

      <AircraftFormDialog v-model="editOpen" :record="record" @saved="refresh" />
    </template>
  </VContainer>
</template>

<style scoped>
.aircraft-profile {
  max-width: 1440px;
}

.aircraft-profile__header {
  display: grid;
  grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
}

.aircraft-profile__media {
  position: relative;
  min-width: 0;
}

.aircraft-profile__image,
.aircraft-profile__image-fallback {
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
  overflow: hidden;
}

.aircraft-profile__image-fallback {
  display: grid;
  place-items: center;
  color: rgb(var(--v-theme-text-secondary));
  background: rgb(var(--v-theme-background));
}

.aircraft-profile__image-label {
  position: absolute;
  right: 8px;
  bottom: 8px;
  max-width: calc(100% - 16px);
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  background: rgb(18 33 31 / 78%);
  font-size: 0.72rem;
}

.aircraft-profile__image-label a {
  color: inherit;
  text-decoration: underline;
}

.aircraft-profile__identity-metadata {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, max-content));
  gap: 16px 28px;
}

.aircraft-profile__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-block: 1px solid rgb(var(--v-theme-border-default));
}

.aircraft-profile__fact {
  display: flex;
  min-width: 0;
  gap: 12px;
  align-items: flex-start;
  padding: 20px;
}

.aircraft-profile__fact + .aircraft-profile__fact {
  border-inline-start: 1px solid rgb(var(--v-theme-border-default));
}

.aircraft-profile__fact strong {
  display: block;
  overflow-wrap: anywhere;
}

.profile-label,
.profile-definition-list dt,
.maintenance-summary dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.profile-card-title {
  display: flex;
  min-height: 56px;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 700;
}

.aircraft-profile__readiness {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.aircraft-profile__score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.aircraft-profile__checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.readiness-check {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.profile-definition-list > div,
.maintenance-summary > div {
  display: flex;
  min-height: 58px;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.profile-definition-list > div + div,
.maintenance-summary > div + div {
  border-top: 1px solid rgb(var(--v-theme-border-default));
}

.profile-definition-list dd,
.maintenance-summary dd {
  min-width: 0;
  margin: 0;
  text-align: right;
  font-weight: 700;
}

.profile-definition-list dd small {
  display: block;
  margin-top: 2px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.72rem;
  font-weight: 400;
  overflow-wrap: anywhere;
}

.aircraft-profile__flight-heading {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
}

.aircraft-profile__route {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 1.1rem;
}

.profile-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.profile-link:hover {
  text-decoration: underline;
}

.assignment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.empty-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

@media (max-width: 960px) {
  .aircraft-profile__header {
    grid-template-columns: 1fr;
  }

  .aircraft-profile__media {
    max-width: 600px;
  }

  .aircraft-profile__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aircraft-profile__fact:nth-child(3) {
    border-inline-start: 0;
  }

  .aircraft-profile__fact:nth-child(n + 3) {
    border-top: 1px solid rgb(var(--v-theme-border-default));
  }
}

@media (max-width: 600px) {
  .aircraft-profile__identity h1 {
    font-size: 2rem !important;
  }

  .aircraft-profile__facts,
  .aircraft-profile__checks,
  .assignment-grid {
    grid-template-columns: 1fr;
  }

  .aircraft-profile__identity-metadata {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aircraft-profile__fact + .aircraft-profile__fact {
    border-top: 1px solid rgb(var(--v-theme-border-default));
    border-inline-start: 0;
  }

  .aircraft-profile__readiness {
    grid-template-columns: 1fr;
  }

  .aircraft-profile__flight-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
