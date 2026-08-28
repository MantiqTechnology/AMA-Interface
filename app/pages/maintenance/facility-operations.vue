<script setup lang="ts">
import type {
  MaintenanceFacilityOperationDto,
  MaintenanceFacilityOperationsDto,
  MaintenanceFacilityReadinessGateDto,
  MaintenanceFacilityWorkflowStepDto,
  MaintenanceGseCandidateDto,
  MaintenanceSlotDto
} from '#shared/features/maintenance';

const ui = useMaintenanceUi();
const { can } = useAuthorization();
const { resolveAircraftImageUrl } = useAircraftImageUrl();

const selectedSlotId = ref<string | null>(null);
const gseRequirementType = ref('Ground Power Unit');
const gseCandidates = ref<MaintenanceGseCandidateDto[]>([]);
const actionBusy = ref(false);
const handbackDrawer = ref(false);

const canPlan = computed(() => can('maintenance.package.plan').allowed);
const planPermissionHint = computed(() => can('maintenance.package.plan').message);

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
const operationSummaries = computed(() => operations.value?.operations ?? []);
const selectedOperation = computed<MaintenanceFacilityOperationDto | null>(
  () =>
    operationSummaries.value.find((operation) => operation.slotId === selectedSlotId.value) ??
    operationSummaries.value[0] ??
    null
);
const selectedSlot = computed(
  () =>
    slots.value.find((slot) => slot.id === selectedOperation.value?.slotId) ??
    slots.value.find((slot) => slot.id === selectedSlotId.value) ??
    slots.value[0] ??
    null
);
const selectedReadiness = computed(() =>
  operations.value?.readiness.find((item) => item.slotId === selectedOperation.value?.slotId)
);
const selectedGseRequirements = computed(
  () =>
    operations.value?.gseRequirements.filter(
      (requirement) => requirement.workPackageId === selectedOperation.value?.workPackageId
    ) ?? []
);
const selectedGseAllocations = computed(
  () =>
    operations.value?.gseAllocations.filter(
      (allocation) => allocation.workPackageId === selectedOperation.value?.workPackageId
    ) ?? []
);
const selectedStaging = computed(
  () =>
    operations.value?.staging.filter((item) => item.slotId === selectedOperation.value?.slotId) ??
    []
);
const selectedHandovers = computed(
  () =>
    operations.value?.handovers.filter(
      (handover) => handover.slotId === selectedOperation.value?.slotId
    ) ?? []
);
const selectedHandover = computed(() => selectedHandovers.value[0] ?? null);

const handbackReadiness = computed(() => selectedOperation.value?.handbackReadiness ?? null);
const openGates = computed(
  () =>
    handbackReadiness.value?.gates.filter(
      (gate) => gate.status !== 'COMPLETE' && gate.status !== 'NOT_REQUIRED'
    ) ?? []
);
const releaseBlockers = computed(() => openGates.value.slice(0, 4));
const canRequestHandback = computed(
  () => Boolean(handbackReadiness.value?.canRequestHandback) && canPlan.value
);
const manpowerPct = computed(() => {
  const counts = selectedOperation.value?.counts;
  if (!counts?.manpowerRequired) return 100;
  return Math.round((counts.manpowerAssigned / counts.manpowerRequired) * 100);
});
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));

watch(
  operationSummaries,
  (items) => {
    if (!items.length) {
      selectedSlotId.value = null;
      return;
    }
    if (!selectedSlotId.value || !items.some((item) => item.slotId === selectedSlotId.value)) {
      selectedSlotId.value = items[0].slotId;
    }
  },
  { immediate: true }
);

function statusColor(status?: string) {
  if (!status) return 'default';
  if (['READY', 'AVAILABLE', 'HANDED_BACK', 'COMPLETED', 'COMPLETE', 'STAGED'].includes(status)) {
    return 'success';
  }
  if (['BLOCKED', 'IN_MAINTENANCE_FACILITY', 'CRITICAL'].includes(status)) return 'error';
  if (
    [
      'MOVING_IN',
      'IN_BAY',
      'MOVING_OUT',
      'HANDBACK_PENDING',
      'PLANNED_MAINTENANCE',
      'PENDING',
      'CURRENT'
    ].includes(status)
  ) {
    return 'warning';
  }
  if (['DISABLED', 'NOT_REQUIRED', 'CANCELLED'].includes(status)) return 'grey';
  return 'info';
}

function gateIcon(gate: MaintenanceFacilityReadinessGateDto) {
  if (gate.status === 'COMPLETE') return 'mdi-check-circle';
  if (gate.status === 'BLOCKED') return 'mdi-alert-circle';
  if (gate.status === 'NOT_REQUIRED') return 'mdi-minus-circle';
  return 'mdi-alert';
}

function workflowIcon(step: MaintenanceFacilityWorkflowStepDto) {
  if (step.status === 'COMPLETE') return 'mdi-check';
  if (step.status === 'DISABLED') return 'mdi-lock-outline';
  return String(step.step);
}

function shortTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function shortDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

function elapsedLabel(value: string | null | undefined) {
  if (!value) return '-';
  const diffMs = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))} min ago`;
  if (diffMs < 24 * hour) return `${Math.round(diffMs / hour)} hr ago`;
  return shortDate(value);
}

function gateStatusLabel(gate: MaintenanceFacilityReadinessGateDto) {
  if (gate.status === 'COMPLETE') return 'Complete';
  if (gate.status === 'NOT_REQUIRED') return 'Not required';
  if (gate.key === 'JOB_CARDS') return `Incomplete (${gate.count})`;
  return gate.count ? `${gate.count} Pending` : 'Pending';
}

function slotLabel(slot: MaintenanceSlotDto) {
  return `${slot.aircraftRegistrationNumber} · ${slot.packageNumber} · ${slot.bayCode}`;
}

async function post(path: string, body: Record<string, unknown> = {}) {
  if (!canPlan.value) return;
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
    note: `Facility Operations ${action}`,
    idempotencyKey: `facility-ui-${action}-${slot.id}`
  });
}
</script>

<template>
  <v-container fluid class="facility-ops-page">
    <div class="facility-header">
      <div>
        <h1>Maintenance Operations</h1>
        <h2 class="facility-subtitle">Facility Operations</h2>
      </div>
      <div class="facility-header__actions">
        <v-chip color="primary" variant="tonal" size="small">Local Demo · Synthetic Data</v-chip>
        <span v-if="operations" class="facility-sync">
          <v-icon icon="mdi-sync" size="18" />
          Last refreshed: {{ shortTime(operations.generatedAt) }} WIT
        </span>
        <v-btn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh" />
      </div>
    </div>

    <v-alert v-if="apiError" type="error" variant="tonal" class="mb-4">
      {{ apiError.title }}
    </v-alert>

    <v-alert v-if="!canPlan" color="warning" variant="tonal" class="mb-4">
      {{ planPermissionHint }}
    </v-alert>

    <div v-if="pending && !operations" class="facility-loading">
      <v-progress-circular indeterminate color="primary" />
      <span>Loading facility operations…</span>
    </div>

    <v-empty-state
      v-else-if="!selectedOperation"
      icon="mdi-airplane-clock"
      title="No active facility slot"
      text="There is no maintenance slot in the selected operation window."
    />

    <template v-else>
      <section class="facility-selector" aria-label="Active maintenance slots">
        <button
          v-for="slot in slots"
          :key="slot.id"
          class="facility-selector__item"
          :class="{ 'facility-selector__item--active': slot.id === selectedOperation.slotId }"
          type="button"
          @click="selectedSlotId = slot.id"
        >
          <span>{{ slotLabel(slot) }}</span>
          <v-chip size="x-small" :color="statusColor(slot.status)" variant="tonal">
            {{ slot.status }}
          </v-chip>
        </button>
      </section>

      <section class="facility-hero">
        <v-img
          v-if="resolveAircraftImageUrl(selectedOperation.aircraftImageUrl)"
          class="facility-hero__image"
          :src="resolveAircraftImageUrl(selectedOperation.aircraftImageUrl) ?? undefined"
          cover
        />
        <div v-else class="facility-hero__image facility-hero__image--empty">
          <v-icon icon="mdi-airplane" size="44" />
        </div>

        <div class="facility-hero__aircraft">
          <div class="facility-hero__title">
            <h2>{{ selectedOperation.aircraftRegistrationNumber }}</h2>
            <v-chip v-if="selectedOperation.riskLabel" color="error" variant="tonal" size="small">
              {{ selectedOperation.riskLabel }}
            </v-chip>
          </div>
          <span class="facility-hero__legacy-label">
            {{ selectedOperation.aircraftRegistrationNumber }} /
            {{ selectedOperation.packageNumber }}
          </span>
          <p>
            {{ selectedOperation.aircraftType ?? 'Aircraft' }}
            <span v-if="selectedOperation.aircraftModel">
              · {{ selectedOperation.aircraftModel }}
            </span>
          </p>
          <span>{{ selectedOperation.workPackageTitle }}</span>
        </div>

        <div class="facility-hero__meta">
          <div>
            <span>Station</span>
            <strong>
              <v-icon icon="mdi-map-marker-outline" size="18" />
              {{ selectedOperation.stationName }} ({{ selectedOperation.stationCode }})
            </strong>
          </div>
          <div>
            <span>Bay</span>
            <strong>
              <v-icon icon="mdi-hangar" size="18" />
              {{ selectedOperation.bayCode }}
            </strong>
          </div>
          <div>
            <span>Work Package</span>
            <strong>
              <v-icon icon="mdi-clipboard-text-outline" size="18" />
              {{ selectedOperation.packageNumber }}
            </strong>
          </div>
          <div>
            <span>Scheduled</span>
            <strong>
              <v-icon icon="mdi-clock-outline" size="18" />
              {{ shortTime(selectedOperation.plannedStartAt) }} –
              {{ shortTime(selectedOperation.plannedEndAt) }} WIT
            </strong>
            <small>{{ shortDate(selectedOperation.plannedStartAt) }}</small>
          </div>
          <div>
            <span>Last synced</span>
            <strong>
              <v-icon icon="mdi-sync" size="18" />
              {{ shortTime(selectedOperation.lastSyncedAt) }} WIT
            </strong>
            <small class="text-success">● Online</small>
          </div>
        </div>
      </section>

      <section
        class="readiness-banner"
        :class="{ 'readiness-banner--ready': handbackReadiness?.status === 'READY' }"
      >
        <div class="readiness-banner__status">
          <div class="readiness-banner__icon">
            <v-icon
              :icon="handbackReadiness?.status === 'READY' ? 'mdi-shield-check' : 'mdi-alert'"
              size="52"
            />
          </div>
          <div>
            <h2>
              {{
                handbackReadiness?.status === 'READY'
                  ? 'READY FOR HAND BACK'
                  : 'NOT READY FOR HAND BACK'
              }}
            </h2>
            <p>
              {{
                handbackReadiness?.status === 'READY'
                  ? 'All gates are clear for hand back request'
                  : 'Resolve all blockers to enable hand back'
              }}
            </p>
          </div>
        </div>

        <div class="readiness-banner__metrics">
          <div>
            <v-icon icon="mdi-alert-outline" color="warning" />
            <span>MEL Open</span>
            <strong>{{ selectedOperation.counts.melOpen }}</strong>
          </div>
          <div>
            <v-icon icon="mdi-alert-circle" color="error" />
            <span>Incomplete Job Cards</span>
            <strong>{{ selectedOperation.counts.incompleteJobCards }}</strong>
          </div>
          <div>
            <v-icon icon="mdi-forklift" color="deep-orange" />
            <span>GSE Pending</span>
            <strong>{{ selectedOperation.counts.gsePending }}</strong>
          </div>
          <div>
            <v-icon icon="mdi-account-group" color="success" />
            <span>Manpower Assigned</span>
            <strong>
              {{
                selectedOperation.counts.manpowerRequired
                  ? `${selectedOperation.counts.manpowerAssigned}/${selectedOperation.counts.manpowerRequired}`
                  : 'Complete'
              }}
            </strong>
          </div>
        </div>
      </section>

      <div class="facility-grid">
        <main class="facility-main">
          <div class="facility-top-grid">
            <v-card class="ops-card" variant="outlined">
              <v-card-title>
                <span>Release Blockers</span>
                <v-chip color="error" size="small">
                  {{ handbackReadiness?.blockerCount ?? 0 }}
                </v-chip>
                <v-spacer />
                <v-btn variant="text" size="small" color="primary" @click="handbackDrawer = true">
                  View all
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div v-if="releaseBlockers.length" class="blocker-list">
                  <div v-for="gate in releaseBlockers" :key="gate.key" class="blocker-row">
                    <v-avatar size="26" :color="statusColor(gate.status)" variant="tonal">
                      <v-icon :icon="gateIcon(gate)" size="16" />
                    </v-avatar>
                    <div>
                      <strong>{{ gate.summary }}</strong>
                      <span>{{ gate.nextAction ?? gate.label }}</span>
                    </div>
                    <v-chip size="x-small" :color="statusColor(gate.status)" variant="outlined">
                      {{ gate.severity }}
                    </v-chip>
                  </div>
                </div>
                <v-empty-state
                  v-else
                  icon="mdi-shield-check"
                  title="No release blocker"
                  text="Every hand-back gate is clear."
                />
              </v-card-text>
            </v-card>

            <v-card class="ops-card" variant="outlined">
              <v-card-title>Operational Workflow</v-card-title>
              <v-card-text>
                <div class="workflow">
                  <div
                    v-for="step in selectedOperation.workflowSteps"
                    :key="step.key"
                    class="workflow__step"
                    :class="`workflow__step--${step.status.toLowerCase()}`"
                  >
                    <div class="workflow__marker">
                      <v-icon
                        v-if="['COMPLETE', 'DISABLED'].includes(step.status)"
                        :icon="workflowIcon(step)"
                        size="18"
                      />
                      <span v-else>{{ workflowIcon(step) }}</span>
                    </div>
                    <strong>{{ step.label }}</strong>
                    <span>{{
                      step.timestamp ? `${shortTime(step.timestamp)} WIT` : step.helper
                    }}</span>
                    <small v-if="step.disabledReason">{{ step.disabledReason }}</small>
                  </div>
                </div>
                <v-alert
                  v-if="handbackReadiness?.disabledReason"
                  color="error"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                  icon="mdi-lock-outline"
                >
                  {{ handbackReadiness.disabledReason }}
                </v-alert>
              </v-card-text>
            </v-card>
          </div>

          <div class="facility-card-grid">
            <v-card class="ops-card" variant="outlined">
              <v-card-title>
                <v-icon icon="mdi-account-group" />
                <span>Manpower Capacity</span>
                <v-spacer />
                <v-chip
                  size="small"
                  :color="manpowerPct >= 100 ? 'success' : 'warning'"
                  variant="tonal"
                >
                  {{ manpowerPct >= 100 ? 'Complete' : `${manpowerPct}%` }}
                </v-chip>
              </v-card-title>
              <v-card-text>
                <div class="table-shell">
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Required</th>
                        <th>Assigned</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="capacity in selectedReadiness?.manpowerCapacity ?? []"
                        :key="capacity.roleType"
                      >
                        <td>{{ capacity.roleType }}</td>
                        <td>{{ capacity.required }}</td>
                        <td>{{ capacity.assigned }}</td>
                        <td>
                          <v-chip
                            size="x-small"
                            :color="statusColor(capacity.status)"
                            variant="tonal"
                          >
                            {{ capacity.status === 'READY' ? 'Assigned' : capacity.status }}
                          </v-chip>
                        </td>
                      </tr>
                      <tr v-if="!(selectedReadiness?.manpowerCapacity ?? []).length">
                        <td colspan="4">No personnel requirement</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="ops-card" variant="outlined">
              <v-card-title>
                <v-icon icon="mdi-forklift" />
                <span>GSE / Staging</span>
                <v-spacer />
                <v-chip
                  v-if="selectedOperation.counts.gsePending"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  {{ selectedOperation.counts.gsePending }} Pending
                </v-chip>
              </v-card-title>
              <v-card-text>
                <div class="gse-create">
                  <v-text-field
                    v-model="gseRequirementType"
                    density="compact"
                    label="GSE type"
                    hide-details
                  />
                  <v-btn
                    :loading="actionBusy"
                    :disabled="!canPlan"
                    variant="tonal"
                    @click="createGseRequirement"
                  >
                    Require
                  </v-btn>
                </div>
                <div class="table-shell">
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>Equipment</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="requirement in selectedGseRequirements" :key="requirement.id">
                        <td>
                          {{ requirement.equipmentType }}
                          <small>{{ requirement.stagedQuantity }}/{{ requirement.quantity }}</small>
                        </td>
                        <td>
                          <v-chip
                            size="x-small"
                            :color="statusColor(requirement.status)"
                            variant="tonal"
                          >
                            {{ requirement.status }}
                          </v-chip>
                        </td>
                        <td>{{ selectedOperation.bayCode }}</td>
                        <td class="text-right">
                          <v-btn
                            size="x-small"
                            variant="text"
                            :disabled="!canPlan"
                            @click="loadGseCandidates(requirement.id)"
                          >
                            Candidates
                          </v-btn>
                        </td>
                      </tr>
                      <tr v-for="item in selectedStaging" :key="item.id">
                        <td>
                          {{ item.resourceName }}
                          <small>{{ item.resourceCode }}</small>
                        </td>
                        <td>
                          <v-chip size="x-small" color="success" variant="tonal">
                            {{ item.status }}
                          </v-chip>
                        </td>
                        <td>{{ item.bayCode }}</td>
                        <td />
                      </tr>
                      <tr v-if="!selectedGseRequirements.length && !selectedStaging.length">
                        <td colspan="4">No GSE requirement</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
                <div v-if="gseCandidates.length" class="candidate-strip">
                  <v-chip
                    v-for="candidate in gseCandidates.slice(0, 4)"
                    :key="candidate.assetId"
                    :disabled="!candidate.eligible || !selectedGseRequirements[0] || !canPlan"
                    :color="candidate.eligible ? 'primary' : 'grey'"
                    variant="tonal"
                    @click="allocateGse(selectedGseRequirements[0].id, candidate.assetId)"
                  >
                    {{ candidate.assetCode }}
                  </v-chip>
                </div>
                <div v-if="selectedGseAllocations.length" class="candidate-strip">
                  <v-chip
                    v-for="allocation in selectedGseAllocations"
                    :key="allocation.id"
                    :disabled="!canPlan"
                    color="info"
                    variant="tonal"
                    @click="stageGse(allocation.id)"
                  >
                    Stage {{ allocation.assetCode }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="ops-card" variant="outlined">
              <v-card-title>
                <v-icon icon="mdi-sync" />
                <span>Shift Handover</span>
              </v-card-title>
              <v-card-text>
                <div class="handover-box">
                  <span>Outgoing Shift</span>
                  <strong>{{ selectedHandover ? 'Prepared' : 'Not prepared' }}</strong>
                  <v-chip
                    size="x-small"
                    :color="selectedHandover?.status === 'ACKNOWLEDGED' ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ selectedHandover?.status ?? 'Pending Ack' }}
                  </v-chip>
                </div>
                <div class="handover-box">
                  <span>Unresolved Items</span>
                  <strong>{{ selectedHandover?.outstandingReferences.length ?? 0 }}</strong>
                  <p>{{ selectedHandover?.notes || 'No shift note prepared for this slot.' }}</p>
                </div>
                <v-alert
                  v-if="selectedHandover?.safetyNotes.length"
                  color="warning"
                  variant="tonal"
                  density="compact"
                >
                  {{ selectedHandover.safetyNotes.join(' ') }}
                </v-alert>
              </v-card-text>
            </v-card>
          </div>
        </main>

        <aside class="facility-rail">
          <v-card class="ops-card" variant="outlined">
            <v-card-title>
              <v-icon icon="mdi-clock-outline" color="primary" />
              <span>Recent Activity</span>
              <v-spacer />
              <v-btn variant="text" size="small" color="primary">View all</v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="selectedOperation.recentActivity.length" class="activity-list">
                <div
                  v-for="activity in selectedOperation.recentActivity"
                  :key="activity.id"
                  class="activity-row"
                >
                  <span>{{ shortTime(activity.occurredAt) }}</span>
                  <div>
                    <strong>{{ activity.title }}</strong>
                    <small>{{ activity.detail }} · {{ elapsedLabel(activity.occurredAt) }}</small>
                  </div>
                </div>
              </div>
              <v-empty-state
                v-else
                icon="mdi-history"
                title="No activity"
                text="No audit activity is scoped to this slot yet."
              />
            </v-card-text>
          </v-card>
        </aside>
      </div>

      <div class="facility-bottom-actions">
        <div>
          <span>Last refreshed: {{ operations ? shortTime(operations.generatedAt) : '-' }} WIT</span>
          <span>Auto refresh: On <span class="text-success">●</span></span>
        </div>
        <div>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-alert-circle-outline"
            @click="handbackDrawer = true"
          >
            View Blockers
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-clipboard-text-outline"
            :to="`/maintenance/work-packages/${selectedOperation.workPackageId}`"
          >
            Open Work Package
          </v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="pending" @click="refresh">
            Refresh
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-lock-open-check-outline"
            :disabled="!canRequestHandback"
            :loading="actionBusy"
            @click="move('handback')"
          >
            Request Hand Back
          </v-btn>
        </div>
      </div>

      <v-navigation-drawer
        v-model="handbackDrawer"
        class="handback-drawer"
        location="right"
        temporary
        width="520"
      >
        <div class="handback-drawer__header">
          <h2>Hand Back Readiness Check</h2>
          <v-btn icon="mdi-close" variant="text" @click="handbackDrawer = false" />
        </div>

        <div class="handback-drawer__content">
          <v-card class="ops-card" variant="outlined">
            <v-card-text>
              <div class="drawer-status">
                <v-avatar
                  size="52"
                  :color="handbackReadiness?.status === 'READY' ? 'success' : 'error'"
                  variant="flat"
                >
                  <v-icon
                    :icon="handbackReadiness?.status === 'READY' ? 'mdi-check' : 'mdi-lock'"
                    size="28"
                  />
                </v-avatar>
                <div>
                  <strong>{{ handbackReadiness?.status === 'READY' ? 'Ready' : 'Blocked' }}</strong>
                  <span>
                    {{
                      handbackReadiness?.status === 'READY'
                        ? 'This aircraft can be requested for hand back.'
                        : 'Resolve all critical items before requesting hand back.'
                    }}
                  </span>
                </div>
              </div>
              <div class="drawer-meta">
                <span>
                  <strong>{{ selectedOperation.aircraftRegistrationNumber }}</strong>
                  {{ selectedOperation.aircraftType ?? 'Aircraft' }}
                </span>
                <span>
                  <strong>Bay</strong>
                  {{ selectedOperation.bayCode }}
                </span>
                <span>
                  <strong>Work Package</strong>
                  {{ selectedOperation.packageNumber }}
                </span>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="ops-card" variant="outlined">
            <v-card-title>Hand Back Gates</v-card-title>
            <v-card-text class="pa-0">
              <div
                v-for="(gate, index) in handbackReadiness?.gates ?? []"
                :key="gate.key"
                class="gate-row"
              >
                <v-avatar size="24" color="warning" variant="flat">{{ index + 1 }}</v-avatar>
                <v-icon :icon="gateIcon(gate)" :color="statusColor(gate.status)" size="22" />
                <div>
                  <strong>{{ gate.label }}</strong>
                  <span>{{ gate.summary }}</span>
                </div>
                <v-chip size="small" :color="statusColor(gate.status)" variant="tonal">
                  {{ gateStatusLabel(gate) }}
                </v-chip>
                <v-icon icon="mdi-chevron-right" size="18" />
              </div>
            </v-card-text>
          </v-card>

          <v-card class="ops-card" variant="outlined">
            <v-card-title>Next required actions</v-card-title>
            <v-card-text>
              <ul v-if="handbackReadiness?.nextActions.length" class="action-list">
                <li v-for="action in handbackReadiness.nextActions" :key="action">{{ action }}</li>
              </ul>
              <p v-else class="text-medium-emphasis mb-0">
                No outstanding action. Hand back can proceed after movement lifecycle is ready.
              </p>
            </v-card-text>
          </v-card>
        </div>

        <div class="handback-drawer__footer">
          <div>
            <span>Last validated: {{ operations ? shortTime(operations.generatedAt) : '-' }} WIT</span>
            <span>Updated by: {{ selectedOperation.recentActivity[0]?.actorRole ?? 'System' }}</span>
          </div>
          <v-btn
            block
            size="large"
            color="primary"
            prepend-icon="mdi-lock-open-check-outline"
            :disabled="!canRequestHandback"
            :loading="actionBusy"
            @click="move('handback')"
          >
            Request Hand Back
          </v-btn>
          <div class="handback-drawer__footer-actions">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-clipboard-text-outline"
              :to="`/maintenance/work-packages/${selectedOperation.workPackageId}`"
            >
              Open Work Package
            </v-btn>
            <v-btn variant="outlined" @click="handbackDrawer = false">Close</v-btn>
          </div>
        </div>
      </v-navigation-drawer>
    </template>
  </v-container>
</template>

<style scoped>
.facility-ops-page {
  background: #f8fafc;
  color: #0f2747;
  min-height: calc(100vh - 64px);
  padding: 18px;
  padding-bottom: 96px;
}

.facility-header,
.facility-header__actions,
.facility-hero,
.facility-hero__title,
.readiness-banner,
.readiness-banner__status,
.readiness-banner__metrics,
.facility-bottom-actions,
.facility-bottom-actions > div,
.drawer-status,
.drawer-meta,
.handback-drawer__footer-actions {
  align-items: center;
  display: flex;
}

.facility-header {
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.facility-header h1 {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}

.facility-subtitle,
.facility-hero__aircraft p,
.facility-hero__aircraft span,
.facility-sync,
.activity-row small,
.drawer-status span,
.drawer-meta span {
  color: #64748b;
}

.facility-subtitle,
.facility-hero__aircraft p,
.facility-hero__aircraft span {
  margin: 2px 0 0;
}

.facility-subtitle {
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.2;
}

.facility-header__actions {
  gap: 12px;
}

.facility-sync {
  display: inline-flex;
  gap: 6px;
  font-size: 0.82rem;
}

.facility-loading {
  align-items: center;
  display: grid;
  gap: 14px;
  justify-items: center;
  min-height: 420px;
}

.facility-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.facility-selector__item {
  align-items: center;
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  color: #0f2747;
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 10px;
  min-height: 36px;
  padding: 6px 10px;
}

.facility-selector__item:focus-visible,
.facility-bottom-actions :deep(.v-btn:focus-visible),
.handback-drawer :deep(.v-btn:focus-visible) {
  outline: 3px solid rgba(37, 99, 235, 0.32);
  outline-offset: 2px;
}

.facility-selector__item--active {
  background: #eaf2ff;
  border-color: #1d5fbf;
  color: #064a9b;
}

.facility-hero {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(15, 39, 71, 0.06);
  gap: 18px;
  margin-bottom: 18px;
  padding: 18px;
}

.facility-hero__image {
  border-radius: 8px;
  flex: 0 0 180px;
  height: 104px;
  overflow: hidden;
}

.facility-hero__image--empty {
  align-items: center;
  background: linear-gradient(135deg, #e2e8f0, #f8fafc);
  display: flex;
  justify-content: center;
}

.facility-hero__aircraft {
  border-right: 1px solid #d9e2ef;
  flex: 0 0 250px;
  min-width: 0;
  padding-right: 18px;
}

.facility-hero__title {
  gap: 8px;
}

.facility-hero__title h2,
.readiness-banner h2,
.handback-drawer__header h2 {
  font-size: 1.28rem;
  font-weight: 800;
  margin: 0;
}

.facility-hero__meta {
  display: grid;
  flex: 1 1 auto;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
}

.facility-hero__meta div {
  border-right: 1px solid #d9e2ef;
  min-width: 0;
  padding-right: 12px;
}

.facility-hero__meta div:last-child {
  border-right: 0;
}

.facility-hero__meta span,
.facility-hero__meta small {
  color: #64748b;
  display: block;
  font-size: 0.76rem;
}

.facility-hero__meta strong {
  align-items: center;
  color: #0f172a;
  display: flex;
  font-size: 0.92rem;
  gap: 7px;
  margin-top: 6px;
}

.readiness-banner {
  background: linear-gradient(90deg, #fff1f2, #ffffff);
  border: 1px solid #ef4444;
  border-radius: 8px;
  gap: 18px;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 18px 26px;
}

.readiness-banner--ready {
  background: linear-gradient(90deg, #ecfdf5, #ffffff);
  border-color: #22c55e;
}

.readiness-banner__status {
  gap: 24px;
}

.readiness-banner__icon {
  align-items: center;
  background: rgba(220, 38, 38, 0.12);
  border-radius: 999px;
  color: #dc2626;
  display: flex;
  height: 88px;
  justify-content: center;
  width: 88px;
}

.readiness-banner--ready .readiness-banner__icon {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.readiness-banner h2 {
  color: #c1121f;
  font-size: 1.55rem;
  letter-spacing: 0.02em;
}

.readiness-banner--ready h2 {
  color: #15803d;
}

.readiness-banner p {
  color: #475569;
  margin: 4px 0 0;
}

.readiness-banner__metrics {
  gap: 18px;
}

.readiness-banner__metrics div {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(15, 39, 71, 0.06);
  display: grid;
  justify-items: center;
  min-width: 150px;
  padding: 14px 18px;
}

.readiness-banner__metrics span {
  color: #334155;
  font-size: 0.78rem;
}

.readiness-banner__metrics strong {
  color: #0f172a;
  font-size: 1.32rem;
}

.facility-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 360px;
}

.facility-main,
.facility-rail,
.facility-top-grid,
.facility-card-grid,
.blocker-list,
.activity-list,
.handback-drawer__content {
  display: grid;
  gap: 14px;
}

.facility-top-grid {
  grid-template-columns: 0.8fr 1.2fr;
}

.facility-card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ops-card {
  border-color: #d9e2ef;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(15, 39, 71, 0.04);
}

.ops-card :deep(.v-card-title) {
  align-items: center;
  color: #0f2747;
  display: flex;
  font-size: 1rem;
  font-weight: 800;
  gap: 8px;
  padding: 14px 16px 8px;
}

.blocker-row,
.activity-row,
.gate-row {
  align-items: center;
  display: grid;
  gap: 10px;
}

.blocker-row {
  grid-template-columns: 28px minmax(0, 1fr) auto;
}

.blocker-row strong,
.blocker-row span,
.activity-row strong,
.activity-row small {
  display: block;
}

.blocker-row span {
  color: #64748b;
  font-size: 0.82rem;
}

.workflow {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(6, minmax(92px, 1fr));
}

.workflow__step {
  align-items: center;
  color: #64748b;
  display: grid;
  gap: 6px;
  justify-items: center;
  position: relative;
  text-align: center;
}

.workflow__step:not(:last-child)::after {
  background: #d1d5db;
  content: '';
  height: 3px;
  left: calc(50% + 22px);
  position: absolute;
  right: calc(-50% + 22px);
  top: 19px;
}

.workflow__step--complete:not(:last-child)::after,
.workflow__step--current:not(:last-child)::after {
  background: #16a34a;
}

.workflow__marker {
  align-items: center;
  background: #e5e7eb;
  border: 4px solid #f8fafc;
  border-radius: 999px;
  color: #334155;
  display: flex;
  font-weight: 800;
  height: 42px;
  justify-content: center;
  position: relative;
  width: 42px;
  z-index: 1;
}

.workflow__step--complete .workflow__marker {
  background: #16a34a;
  color: #ffffff;
}

.workflow__step--current .workflow__marker {
  background: #1d5fbf;
  color: #ffffff;
}

.workflow__step strong {
  color: #0f172a;
  font-size: 0.82rem;
  line-height: 1.2;
}

.workflow__step span,
.workflow__step small {
  font-size: 0.76rem;
}

.table-shell {
  overflow-x: auto;
}

.table-shell :deep(table) {
  min-width: 420px;
}

.table-shell small {
  color: #64748b;
  display: block;
}

.gse-create,
.candidate-strip {
  display: flex;
  gap: 8px;
}

.gse-create {
  margin-bottom: 10px;
}

.candidate-strip {
  flex-wrap: wrap;
  margin-top: 10px;
}

.handover-box {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 10px;
}

.handover-box span,
.handover-box p {
  color: #64748b;
  font-size: 0.82rem;
  margin: 0;
}

.handover-box strong {
  display: block;
  margin: 3px 0;
}

.activity-row {
  grid-template-columns: 52px minmax(0, 1fr);
}

.activity-row > span {
  color: #0f2747;
  font-size: 0.82rem;
  font-weight: 700;
}

.facility-bottom-actions {
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid #d9e2ef;
  bottom: 0;
  box-shadow: 0 -12px 28px rgba(15, 39, 71, 0.08);
  gap: 12px;
  justify-content: space-between;
  left: var(--app-sidebar-width, 0);
  padding: 12px 18px;
  position: fixed;
  right: 0;
  z-index: 6;
}

.facility-bottom-actions > div {
  flex-wrap: wrap;
  gap: 10px;
}

.facility-bottom-actions span {
  color: #64748b;
  font-size: 0.82rem;
}

.handback-drawer {
  background: #f8fafc;
}

.handback-drawer__header,
.handback-drawer__footer {
  background: #ffffff;
  border-bottom: 1px solid #d9e2ef;
  padding: 18px;
}

.handback-drawer__header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.handback-drawer__content {
  padding: 16px;
}

.drawer-status {
  gap: 14px;
}

.drawer-status strong {
  color: #c1121f;
  display: block;
  font-size: 1.1rem;
}

.drawer-meta {
  border-top: 1px solid #e2e8f0;
  gap: 18px;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
}

.drawer-meta strong {
  color: #0f172a;
  display: block;
}

.gate-row {
  border-top: 1px solid #e2e8f0;
  grid-template-columns: 24px 24px minmax(0, 1fr) auto 20px;
  padding: 12px 16px;
}

.gate-row:first-child {
  border-top: 0;
}

.gate-row strong,
.gate-row span {
  display: block;
}

.gate-row span {
  color: #64748b;
  font-size: 0.82rem;
}

.action-list {
  margin: 0;
  padding-left: 18px;
}

.handback-drawer__footer {
  border-bottom: 0;
  border-top: 1px solid #d9e2ef;
  bottom: 0;
  display: grid;
  gap: 12px;
  position: sticky;
}

.handback-drawer__footer > div:first-child {
  color: #64748b;
  display: flex;
  font-size: 0.78rem;
  justify-content: space-between;
}

.handback-drawer__footer-actions {
  gap: 12px;
}

.handback-drawer__footer-actions :deep(.v-btn) {
  flex: 1;
}

@media (max-width: 1280px) {
  .facility-hero {
    align-items: flex-start;
  }

  .facility-hero__meta {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }

  .readiness-banner,
  .facility-grid {
    grid-template-columns: 1fr;
  }

  .readiness-banner {
    align-items: flex-start;
    display: grid;
  }

  .readiness-banner__metrics {
    flex-wrap: wrap;
  }

  .facility-grid {
    display: grid;
  }
}

@media (max-width: 960px) {
  .facility-hero,
  .facility-top-grid,
  .facility-card-grid {
    grid-template-columns: 1fr;
  }

  .facility-hero {
    display: grid;
  }

  .facility-hero__aircraft {
    border-right: 0;
    border-bottom: 1px solid #d9e2ef;
    padding-bottom: 12px;
    padding-right: 0;
  }

  .workflow {
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .workflow__step {
    min-width: 112px;
  }

  .facility-bottom-actions {
    left: 0;
  }
}

@media (max-width: 640px) {
  .facility-ops-page {
    padding: 12px;
    padding-bottom: 180px;
  }

  .facility-header,
  .facility-header__actions,
  .readiness-banner__status,
  .facility-bottom-actions {
    align-items: flex-start;
    display: grid;
  }

  .facility-hero__image {
    width: 100%;
  }

  .facility-hero__meta {
    grid-template-columns: 1fr;
  }

  .facility-hero__meta div {
    border-right: 0;
    border-bottom: 1px solid #d9e2ef;
    padding-bottom: 10px;
  }

  .readiness-banner__metrics {
    display: grid;
    grid-template-columns: 1fr;
  }

  .readiness-banner__metrics div {
    min-width: 0;
  }

  .handback-drawer {
    width: 100% !important;
  }

  .drawer-meta,
  .gate-row,
  .handback-drawer__footer > div:first-child {
    align-items: flex-start;
    display: grid;
  }

  .gate-row {
    grid-template-columns: 24px 24px minmax(0, 1fr);
  }

  .gate-row :deep(.v-chip),
  .gate-row > .v-icon:last-child {
    grid-column: 3;
  }
}
</style>
