<script setup lang="ts">
import type {
  MaintenanceFacilityOperationsDto,
  MaintenanceGseCandidateDto,
  MaintenanceSlotDto
} from '#shared/features/maintenance';

const ui = useMaintenanceUi();
const { t } = useI18n();
const selectedSlotId = ref<string | null>(null);
const gseRequirementType = ref('Ground Power Unit');
const gseCandidates = ref<MaintenanceGseCandidateDto[]>([]);
const actionBusy = ref(false);

const query = computed(() => ({
  dateFrom: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  dateTo: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
}));

const { data, pending, error, refresh } = await useAsyncData(
  'maintenance-facility-operations',
  () =>
    fetchApi<MaintenanceFacilityOperationsDto>('/api/maintenance/facility-operations', {
      query: query.value
    }),
  { server: false }
);

const operations = computed(() => data.value);
const slots = computed(() => operations.value?.occupancy.slots ?? []);
const selectedSlot = computed(
  () => slots.value.find((slot) => slot.id === selectedSlotId.value) ?? slots.value[0] ?? null
);
const selectedReadiness = computed(() =>
  operations.value?.readiness.find((item) => item.slotId === selectedSlot.value?.id)
);
const selectedCustody = computed(() =>
  operations.value?.custodies.find(
    (custody) =>
      custody.slotId === selectedSlot.value?.id &&
      ['MOVING_IN', 'IN_BAY', 'READY_FOR_MOVE_OUT', 'MOVING_OUT', 'HANDBACK_PENDING'].includes(
        custody.status
      )
  )
);
const selectedGseRequirements = computed(
  () =>
    operations.value?.gseRequirements.filter(
      (requirement) => requirement.workPackageId === selectedSlot.value?.workPackageId
    ) ?? []
);
const selectedGseAllocations = computed(
  () =>
    operations.value?.gseAllocations.filter(
      (allocation) => allocation.workPackageId === selectedSlot.value?.workPackageId
    ) ?? []
);
const selectedStaging = computed(
  () => operations.value?.staging.filter((item) => item.slotId === selectedSlot.value?.id) ?? []
);
const selectedHandovers = computed(
  () => operations.value?.handovers.filter((item) => item.slotId === selectedSlot.value?.id) ?? []
);

const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));

function statusColor(status?: string) {
  if (!status) return 'default';
  if (['READY', 'AVAILABLE', 'HANDED_BACK', 'COMPLETED'].includes(status)) return 'success';
  if (['BLOCKED', 'IN_MAINTENANCE_FACILITY', 'IN_BAY'].includes(status)) return 'error';
  if (['MOVING_IN', 'MOVING_OUT', 'HANDBACK_PENDING', 'PLANNED_MAINTENANCE'].includes(status)) {
    return 'warning';
  }
  return 'info';
}

function time(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

async function post(path: string, body: Record<string, unknown> = {}) {
  actionBusy.value = true;
  try {
    await fetchApi(path, { method: 'POST', body });
    await refresh();
  } finally {
    actionBusy.value = false;
  }
}

async function createGseRequirement() {
  const slot = selectedSlot.value;
  if (!slot) return;
  await post(`/api/maintenance/work-packages/${slot.workPackageId}/gse-requirements`, {
    equipmentType: gseRequirementType.value,
    quantity: 1,
    mandatory: true,
    notes: 'M8.5 facility operations requirement'
  });
}

async function loadGseCandidates(requirementId: string) {
  const slot = selectedSlot.value;
  if (!slot) return;
  gseCandidates.value = await fetchApi<MaintenanceGseCandidateDto[]>(
    `/api/maintenance/work-packages/${slot.workPackageId}/gse-requirements/${requirementId}/candidates`
  );
}

async function allocateGse(requirementId: string, assetId: string) {
  const slot = selectedSlot.value;
  if (!slot) return;
  await post(`/api/maintenance/work-packages/${slot.workPackageId}/gse-allocations`, {
    requirementId,
    assetId,
    idempotencyKey: `m85-ui-gse-${requirementId}-${assetId}`
  });
}

async function stageGse(allocationId: string) {
  const slot = selectedSlot.value;
  if (!slot) return;
  await post(`/api/maintenance/maintenance-slots/${slot.id}/gse-stage`, {
    allocationId,
    idempotencyKey: `m85-ui-stage-${allocationId}`
  });
}

async function move(action: string) {
  const slot = selectedSlot.value;
  if (!slot) return;
  await post(`/api/maintenance/maintenance-slots/${slot.id}/${action}`, {
    note: `M8.5 ${action}`,
    idempotencyKey: `m85-ui-${action}-${slot.id}`
  });
}

function slotLabel(slot: MaintenanceSlotDto) {
  return `${slot.aircraftRegistrationNumber} ${slot.packageNumber} ${slot.bayCode}`;
}
</script>

<template>
  <v-container fluid class="pa-4">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">{{ t('maintenance.facilityOperations.title') }}</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('maintenance.facilityOperations.subtitle') }}
        </p>
      </div>
      <v-btn prepend-icon="mdi-refresh" :loading="pending" variant="tonal" @click="refresh">
        {{ t('maintenance.facilityOperations.refresh') }}
      </v-btn>
    </div>

    <v-alert v-if="apiError" type="error" variant="tonal" class="mb-4">
      {{ apiError.message }}
    </v-alert>

    <v-row>
      <v-col cols="12" md="4" lg="3">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1">
            {{ t('maintenance.facilityOperations.slotMaintenance') }}
          </v-card-title>
          <v-list density="compact">
            <v-list-item
              v-for="slot in slots"
              :key="slot.id"
              :active="selectedSlot?.id === slot.id"
              @click="selectedSlotId = slot.id"
            >
              <v-list-item-title>{{ slotLabel(slot) }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ time(slot.plannedStartAt) }} -
                {{ time(slot.plannedEndAt) }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="x-small" :color="statusColor(slot.status)" variant="tonal">
                  {{ slot.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" lg="9">
        <v-card v-if="selectedSlot" variant="outlined" class="mb-4">
          <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
            <span>{{ selectedSlot.aircraftRegistrationNumber }} /
              {{ selectedSlot.packageNumber }}</span>
            <v-chip
              :color="statusColor(selectedCustody?.status ?? selectedSlot.status)"
              variant="tonal"
            >
              {{ selectedCustody?.status ?? selectedSlot.status }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="4">
                <div class="text-caption text-medium-emphasis">
                  {{ t('maintenance.facilityOperations.facility') }}
                </div>
                <div>
                  {{ selectedSlot.facilityName }} / {{ selectedSlot.areaCode }} /
                  {{ selectedSlot.bayCode }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-caption text-medium-emphasis">
                  {{ t('maintenance.facilityOperations.planned') }}
                </div>
                <div>
                  {{ time(selectedSlot.plannedStartAt) }} - {{ time(selectedSlot.plannedEndAt) }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-caption text-medium-emphasis">
                  {{ t('maintenance.facilityOperations.actual') }}
                </div>
                <div>
                  {{ time(selectedSlot.actualStartAt) }} - {{ time(selectedSlot.actualEndAt) }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col cols="12" lg="6">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">
                {{ t('maintenance.facilityOperations.facilityReadiness') }}
              </v-card-title>
              <v-card-text>
                <v-chip
                  class="mb-3"
                  :color="statusColor(selectedReadiness?.status)"
                  variant="tonal"
                >
                  {{ selectedReadiness?.status ?? t('maintenance.facilityOperations.unknown') }}
                </v-chip>
                <v-table density="compact">
                  <tbody>
                    <tr v-for="(dimension, key) in selectedReadiness?.dimensions" :key="key">
                      <td class="text-capitalize">{{ key }}</td>
                      <td>
                        <v-chip
                          size="x-small"
                          :color="statusColor(dimension.status)"
                          variant="tonal"
                        >
                          {{ dimension.status }}
                        </v-chip>
                      </td>
                      <td>{{ dimension.summary }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="6">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">
                {{ t('maintenance.facilityOperations.manpowerCapacity') }}
              </v-card-title>
              <v-card-text>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>{{ t('maintenance.facilityOperations.role') }}</th>
                      <th>{{ t('maintenance.facilityOperations.required') }}</th>
                      <th>{{ t('maintenance.facilityOperations.availableEligible') }}</th>
                      <th>{{ t('maintenance.facilityOperations.assigned') }}</th>
                      <th>{{ t('maintenance.facilityOperations.status') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="capacity in selectedReadiness?.manpowerCapacity ?? []"
                      :key="capacity.roleType"
                    >
                      <td>{{ capacity.roleType }}</td>
                      <td>{{ capacity.required }}</td>
                      <td>{{ capacity.availableEligible }}</td>
                      <td>{{ capacity.assigned }}</td>
                      <td>
                        <v-chip
                          size="x-small"
                          :color="statusColor(capacity.status)"
                          variant="tonal"
                        >
                          {{ capacity.status }}
                        </v-chip>
                      </td>
                    </tr>
                    <tr v-if="(selectedReadiness?.manpowerCapacity ?? []).length === 0">
                      <td colspan="5">
                        {{ t('maintenance.facilityOperations.noPersonnelRequirement') }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="6">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">
                {{ t('maintenance.facilityOperations.gseStaging') }}
              </v-card-title>
              <v-card-text>
                <div class="d-flex ga-2 mb-3">
                  <v-text-field
                    v-model="gseRequirementType"
                    density="compact"
                    :label="t('maintenance.facilityOperations.gseType')"
                    hide-details
                  />
                  <v-btn :loading="actionBusy" @click="createGseRequirement">
                    {{ t('maintenance.facilityOperations.require') }}
                  </v-btn>
                </div>
                <v-list density="compact">
                  <v-list-item v-for="requirement in selectedGseRequirements" :key="requirement.id">
                    <v-list-item-title>
                      {{ requirement.equipmentType }} {{ requirement.stagedQuantity }}/{{
                        requirement.quantity
                      }}
                    </v-list-item-title>
                    <template #append>
                      <v-btn
                        size="small"
                        variant="tonal"
                        @click="loadGseCandidates(requirement.id)"
                      >
                        {{ t('maintenance.facilityOperations.candidates') }}
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                <v-divider class="my-3" />
                <v-list density="compact">
                  <v-list-item v-for="candidate in gseCandidates" :key="candidate.assetId">
                    <v-list-item-title>
                      {{ candidate.assetCode }} {{ candidate.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{
                        candidate.eligible
                          ? t('maintenance.facilityOperations.eligible')
                          : candidate.reasons.join(', ')
                      }}
                    </v-list-item-subtitle>
                    <template #append>
                      <v-btn
                        size="small"
                        :disabled="!candidate.eligible || !selectedGseRequirements[0]"
                        @click="allocateGse(selectedGseRequirements[0].id, candidate.assetId)"
                      >
                        {{ t('maintenance.facilityOperations.allocate') }}
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                <v-divider class="my-3" />
                <v-list density="compact">
                  <v-list-item v-for="allocation in selectedGseAllocations" :key="allocation.id">
                    <v-list-item-title>
                      {{ allocation.assetCode }} {{ allocation.status }}
                    </v-list-item-title>
                    <template #append>
                      <v-btn size="small" variant="tonal" @click="stageGse(allocation.id)">
                        {{ t('maintenance.facilityOperations.stage') }}
                      </v-btn>
                    </template>
                  </v-list-item>
                  <v-list-item v-for="item in selectedStaging" :key="item.id">
                    <v-list-item-title>
                      {{ item.resourceCode }} {{ t('maintenance.facilityOperations.stagedAt') }}
                      {{ item.bayCode }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ item.resourceType }} / {{ item.status }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="outlined" class="mt-4">
          <v-card-title class="text-subtitle-1">
            {{ t('maintenance.facilityOperations.movementHandback') }}
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap ga-2">
              <v-btn :loading="actionBusy" @click="move('move-in-request')">
                {{ t('maintenance.facilityOperations.requestMoveIn') }}
              </v-btn>
              <v-btn :loading="actionBusy" @click="move('confirm-in-bay')">
                {{ t('maintenance.facilityOperations.confirmInBay') }}
              </v-btn>
              <v-btn :loading="actionBusy" @click="move('ready-for-move-out')">
                {{ t('maintenance.facilityOperations.readyMoveOut') }}
              </v-btn>
              <v-btn :loading="actionBusy" @click="move('move-out')">
                {{ t('maintenance.facilityOperations.moveOut') }}
              </v-btn>
              <v-btn :loading="actionBusy" color="success" @click="move('handback')">
                {{ t('maintenance.facilityOperations.handback') }}
              </v-btn>
              <v-btn
                v-if="selectedSlot"
                :to="`/maintenance/work-packages/${selectedSlot.workPackageId}`"
                variant="tonal"
              >
                {{ t('maintenance.facilityOperations.openWorkPackage') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-card variant="outlined" class="mt-4">
          <v-card-title class="text-subtitle-1">
            {{ t('maintenance.facilityOperations.shiftHandover') }}
          </v-card-title>
          <v-list density="compact">
            <v-list-item v-for="handover in selectedHandovers" :key="handover.id">
              <v-list-item-title>{{ handover.status }} / {{ handover.notes }}</v-list-item-title>
              <v-list-item-subtitle>
                {{
                  handover.outstandingReferences.join(', ') ||
                    t('maintenance.facilityOperations.noOutstandingReference')
                }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
