<script setup lang="ts">
import type {
  FlightOperationDetailDto,
  FlightOperationRecord,
  FlightReadinessCheckDto,
  FuelPlanningEstimateDto
} from '#shared/contracts/flight-operations';
import type { DataTableHeader } from 'vuetify';
import ExpandedTable from '../common/table/Expanded.vue';

const props = defineProps<{
  flights: FlightOperationRecord[];
  loading?: boolean;
}>();

const headers: DataTableHeader[] = [
  { title: '', key: 'data-table-expand', width: 48, sortable: false },
  { title: 'Order / Flight', key: 'flightNumber', minWidth: 210 },
  { title: 'Date', key: 'flightDate', width: 140 },
  { title: 'Route', key: 'route', width: 150, sortable: false },
  { title: 'Aircraft', key: 'aircraft', minWidth: 190, sortable: false },
  { title: 'PIC', key: 'crew', minWidth: 180, sortable: false },
  { title: 'Status', key: 'currentStatus', width: 160 },
  { title: 'Readiness', key: 'readiness', minWidth: 190, sortable: false },
  { title: 'Schedule', key: 'scheduledDepartureAt', width: 180 },
  { title: 'Action', key: 'actions', width: 96, sortable: false, align: 'end' }
];

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(new Date(value.includes('T') ? value : `${value}T00:00:00.000+07:00`));
}

function money(value: number | null | undefined, currencyCode = 'IDR') {
  if (value == null) return '-';
  return new Intl.NumberFormat('id-ID', {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function serviceLabel(value: string) {
  return value.replaceAll('_', ' ');
}

function readinessColor(check: FlightReadinessCheckDto) {
  if (check.severity === 'DANGER' || check.status === 'FAIL') return 'error';
  if (check.severity === 'WARNING' || check.status === 'PENDING') return 'warning';
  if (check.severity === 'SUCCESS' || check.status === 'PASS') return 'success';
  return 'default';
}

function topReadinessChecks(detail: FlightOperationDetailDto) {
  return [...detail.readinessChecks]
    .sort((left, right) => Number(right.blocking) - Number(left.blocking))
    .slice(0, 5);
}

function detailRecord(detail: unknown, item: FlightOperationRecord): FlightOperationDetailDto {
  if (detail && typeof detail === 'object' && 'crewAssignments' in detail) {
    return detail as FlightOperationDetailDto;
  }

  return {
    ...item,
    approvals: [],
    attachments: [],
    cargoItems: [],
    closureReadiness: { allowed: false, missing: [] },
    crewAssignments: [],
    financeHandoffs: [],
    fuelPlanningEstimate: {} as FuelPlanningEstimateDto,
    fuelRequests: [],
    histories: [],
    operationalAudit: [],
    maintenanceHandoffs: [],
    manifests: [],
    passengers: [],
    readinessChecks: [],
    stationCosts: [],
    stationServices: []
  };
}

function fetchDetail(flight: FlightOperationRecord) {
  return fetchApi<FlightOperationDetailDto>(`/api/flight-operations/flights/${flight.id}`);
}
</script>

<template>
  <ExpandedTable
    cache-ttl="30000"
    class="flight-operation-table"
    :fetch-detail="fetchDetail"
    :headers="headers"
    :items="props.flights"
    :items-length="props.flights.length"
    :loading="loading"
    no-data-text="No flights match this view."
    loading-text="Loading flights..."
    hide-default-footer
  >
    <template #[`item.flightNumber`]="{ item }">
      <div class="font-weight-medium text-text-primary">{{ item.flightNumber }}</div>
      <div class="text-xs text-text-secondary">{{ item.orderNumber }}</div>
      <div class="text-xs text-text-secondary">{{ item.customerName ?? 'No customer' }}</div>
    </template>

    <template #[`item.flightDate`]="{ item }">
      {{ formatDate(item.flightDate) }}
    </template>

    <template #[`item.route`]="{ item }">
      <div>{{ item.originStationCode }} -> {{ item.destinationStationCode }}</div>
      <div class="text-xs text-text-secondary">{{ item.routeCode }}</div>
      <div class="text-xs text-text-secondary">{{ serviceLabel(item.serviceType) }}</div>
    </template>

    <template #[`item.aircraft`]="{ item }">
      <div class="font-weight-medium">{{ item.aircraftRegistration ?? '-' }}</div>
      <div class="text-xs text-text-secondary">
        Station {{ item.aircraftCurrentStationCode ?? 'unknown' }}
      </div>
      <div class="text-xs text-text-secondary">
        Maint. due {{ item.aircraftNextMaintenanceDueAt ?? '-' }}
      </div>
    </template>

    <template #[`item.crew`]="{ item }">
      <div>{{ item.pilotInCommandName ?? '-' }}</div>
      <div class="mt-1 flex flex-wrap gap-1">
        <VChip
          v-if="item.pilotInCommandAvailabilityStatus"
          size="x-small"
          :color="item.pilotInCommandAvailabilityStatus === 'AVAILABLE' ? 'success' : 'warning'"
          variant="tonal"
        >
          PIC {{ item.pilotInCommandAvailabilityStatus }}
        </VChip>
        <VChip
          v-if="item.coPilotAvailabilityStatus"
          size="x-small"
          :color="item.coPilotAvailabilityStatus === 'AVAILABLE' ? 'success' : 'warning'"
          variant="tonal"
        >
          COP {{ item.coPilotAvailabilityStatus }}
        </VChip>
      </div>
    </template>

    <template #[`item.currentStatus`]="{ item }">
      <FlightsFlightStatusChip :status="item.currentStatus" />
    </template>

    <template #[`item.readiness`]="{ item }">
      <div class="min-w-28">
        <VProgressLinear
          color="secondary"
          height="8"
          rounded
          :model-value="item.readinessPercent"
        />
        <div class="mt-1 text-xs text-text-secondary">{{ item.readinessSummary }}</div>
      </div>
    </template>

    <template #[`item.scheduledDepartureAt`]="{ item }">
      {{ formatDate(item.scheduledDepartureAt) }}
    </template>

    <template #[`item.actions`]="{ item }">
      <DsTooltipIconButton
        density="comfortable"
        icon="mdi-open-in-new"
        :to="`/flights/${item.id}`"
        tooltip="Open flight"
        variant="text"
      />
    </template>

    <template #detail="{ item, detail }">
      <div class="flight-detail-dropdown">
        <section class="flight-detail-dropdown__panel">
          <div class="flight-detail-dropdown__title">Crew</div>
          <div
            v-for="crew in detailRecord(detail, item).crewAssignments"
            :key="crew.id"
            class="flight-detail-dropdown__line"
          >
            <span>{{ crew.assignmentRole.replaceAll('_', ' ') }}</span>
            <strong>{{ crew.crewName }}</strong>
            <VChip
              :color="crew.availabilityStatus === 'READY' ? 'success' : 'warning'"
              size="x-small"
            >
              {{ crew.availabilityStatus }}
            </VChip>
          </div>
          <div
            v-if="detailRecord(detail, item).crewAssignments.length === 0"
            class="text-caption text-text-secondary"
          >
            No crew assignment detail.
          </div>
        </section>

        <section class="flight-detail-dropdown__panel">
          <div class="flight-detail-dropdown__title">Readiness</div>
          <div class="mb-2">
            <VProgressLinear
              color="secondary"
              height="8"
              rounded
              :model-value="detailRecord(detail, item).readinessPercent"
            />
            <div class="mt-1 text-caption text-text-secondary">
              {{ detailRecord(detail, item).readinessSummary }}
            </div>
          </div>
          <div
            v-for="check in topReadinessChecks(detailRecord(detail, item))"
            :key="check.id"
            class="flight-detail-dropdown__line"
          >
            <span>{{ check.checkName }}</span>
            <VChip :color="readinessColor(check)" size="x-small" variant="tonal">
              {{ check.status }}
            </VChip>
          </div>
          <div
            v-if="detailRecord(detail, item).blockingReason"
            class="mt-2 text-caption text-error"
          >
            {{ detailRecord(detail, item).blockingReason }}
          </div>
        </section>

        <section class="flight-detail-dropdown__panel">
          <div class="flight-detail-dropdown__title">Manifest / Load</div>
          <div class="flight-detail-dropdown__fact">
            <span>Passengers</span>
            <strong>{{ detailRecord(detail, item).passengers.length }}</strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Cargo items</span>
            <strong>{{ detailRecord(detail, item).cargoItems.length }}</strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Manifests</span>
            <strong>{{ detailRecord(detail, item).manifests.length }}</strong>
          </div>
        </section>

        <section class="flight-detail-dropdown__panel">
          <div class="flight-detail-dropdown__title">Fuel / Station</div>
          <div class="flight-detail-dropdown__fact">
            <span>Fuel requests</span>
            <strong>{{ detailRecord(detail, item).fuelRequests.length }}</strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Station services</span>
            <strong>{{ detailRecord(detail, item).stationServices.length }}</strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Station costs</span>
            <strong>{{ detailRecord(detail, item).stationCosts.length }}</strong>
          </div>
        </section>

        <section class="flight-detail-dropdown__panel">
          <div class="flight-detail-dropdown__title">Finance / Approval</div>
          <div class="flight-detail-dropdown__fact">
            <span>Billing</span>
            <strong>{{ detailRecord(detail, item).billingType }}</strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Estimated revenue</span>
            <strong>
              {{
                money(
                  detailRecord(detail, item).estimatedRevenue,
                  detailRecord(detail, item).currencyCode
                )
              }}
            </strong>
          </div>
          <div class="flight-detail-dropdown__fact">
            <span>Approvals</span>
            <strong>{{ detailRecord(detail, item).approvals.length }}</strong>
          </div>
        </section>

        <section class="flight-detail-dropdown__panel flight-detail-dropdown__actions">
          <div class="flight-detail-dropdown__title">Quick links</div>
          <VBtn
            :to="`/flights/${item.id}`"
            prepend-icon="mdi-open-in-new"
            size="small"
            variant="tonal"
          >
            Open
          </VBtn>
          <VBtn
            :to="`/flights/${item.id}/manifest`"
            prepend-icon="mdi-clipboard-list-outline"
            size="small"
            variant="tonal"
          >
            Manifest
          </VBtn>
          <VBtn
            :to="`/flights/station-operations/${item.id}`"
            prepend-icon="mdi-airport"
            size="small"
            variant="tonal"
          >
            Station
          </VBtn>
          <VBtn to="/flights/fuel" prepend-icon="mdi-fuel" size="small" variant="tonal">
            Fuel
          </VBtn>
        </section>
      </div>
    </template>
  </ExpandedTable>
</template>

<style scoped>
.flight-operation-table {
  min-width: 1080px;
}

.flight-detail-dropdown {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.flight-detail-dropdown__panel {
  min-width: 0;
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}

.flight-detail-dropdown__title {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-text-primary));
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.flight-detail-dropdown__line,
.flight-detail-dropdown__fact {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-block: 4px;
  font-size: 12px;
}

.flight-detail-dropdown__line span,
.flight-detail-dropdown__fact span {
  min-width: 0;
  color: rgb(var(--v-theme-text-secondary));
}

.flight-detail-dropdown__line strong,
.flight-detail-dropdown__fact strong {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.flight-detail-dropdown__actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.flight-detail-dropdown__actions .flight-detail-dropdown__title {
  grid-column: 1 / -1;
}

.flight-detail-dropdown__actions :deep(.v-btn__content) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .flight-detail-dropdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .flight-detail-dropdown {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
