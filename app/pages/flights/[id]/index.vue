<script setup lang="ts">
import FlightReasonSelect from '../../../features/operations/flight-reasons/FlightReasonSelect.vue';
import StationSelect from '../../../features/operations/stations/StationSelect.vue';
import ActualTimeDialog from '../../../features/operations/flight-operations/ActualTimeDialog.vue';
import CustomerSelect from '../../../features/commercial/customers/CustomerSelect.vue';
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { RouteOption } from '#shared/features/operations/routes';
import type { StationOption } from '#shared/features/operations/stations';
import type { HandlingParkingSupplierDto } from '#shared/features/finance/handling-parking-suppliers';
import type {
  FlightChangeImpactDto,
  FlightOperationDetailDto,
  FlightReadinessCheckDto,
  FlightStatusHistoryDto
} from '#shared/contracts/flight-operations';

const route = useRoute();
const id = computed(() => String(route.params.id));
const detailTabs = ['overview', 'readiness', 'assignment', 'approval', 'records', 'history'];
const activeTab = ref(
  typeof route.query.tab === 'string' && detailTabs.includes(route.query.tab)
    ? route.query.tab
    : 'overview'
);
const actionError = ref('');
const actionSuccess = ref('');
const actionLoading = ref(false);
const approvalDialog = ref(false);
const approvalAction = ref<'accept-readiness' | 'approve'>('accept-readiness');
const approvalNote = ref('');
const reasonDialog = ref(false);
const reasonAction = ref<'cancel' | 'divert' | 'reopen'>('cancel');
const reasonId = ref('');
const reasonNote = ref('');
const diversionStationId = ref('');
const correctionScope = ref<'PLANNING' | 'DEPARTURE' | 'ARRIVAL' | 'CLOSURE' | null>(null);
const issueDrawer = ref(false);
const selectedIssue = ref<FlightReadinessCheckDto | null>(null);
const historyFilter = ref('ALL');
const actualTimeDialog = ref(false);
const actualTimeAction = ref<'depart' | 'land'>('depart');
const commercialDialog = ref(false);
const aircraftDialog = ref(false);
const routeDialog = ref(false);
const impactDialog = ref(false);
const impactMode = ref<'AIRCRAFT' | 'ROUTE'>('AIRCRAFT');
const impactPreview = ref<FlightChangeImpactDto | null>(null);
const aircraftSaving = ref(false);
const aircraftError = ref('');
const selectedAircraftId = ref<string | null>(null);
const routeSaving = ref(false);
const routeError = ref('');
const selectedRouteId = ref<string | null>(null);
const selectedDestinationSupplierId = ref<string | null>(null);
const commercialSaving = ref(false);
const commercialError = ref('');
const commercialForm = reactive({
  customerId: null as string | null,
  billingType: 'CHARTER',
  estimatedRevenue: null as number | null
});
const billingTypeOptions = [
  'CHARTER',
  'SCHEDULED_PASSENGER',
  'CARGO',
  'INTERNAL_POSITIONING',
  'NON_REVENUE'
];
const { can } = useAuthorization();
const canEditCommercialDetails = computed(
  () =>
    Boolean(flight.value) &&
    ['DRAFT', 'PENDING_READINESS', 'BLOCKED', 'REOPENED_FOR_CORRECTION'].includes(
      flight.value?.currentStatus ?? ''
    ) &&
    can('flight.create.direct').allowed
);
const canChangeRoute = computed(
  () =>
    Boolean(flight.value) &&
    [
      'DRAFT',
      'PENDING_READINESS',
      'BLOCKED',
      'READY_FOR_OCC_REVIEW',
      'READY_FOR_APPROVAL',
      'APPROVED',
      'REAPPROVAL_REQUIRED',
      'SCHEDULED'
    ].includes(flight.value?.currentStatus ?? '') &&
    can('flight.create.direct').allowed
);

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return;
  void navigateTo({ query: { ...route.query, tab } }, { replace: true });
});

const { data: aircraftOptions } = await useAsyncData(
  'aircraft-options',
  () => fetchApi<AircraftOption[]>('/api/master-data/aircraft/options'),
  { default: () => [] }
);
const { data: stationOptions } = await useAsyncData(
  'station-options',
  () => fetchApi<StationOption[]>('/api/master-data/stations/options'),
  { default: () => [] }
);
const { data: routeOptions } = await useAsyncData(
  'route-options-flight-command-center',
  () => fetchApi<RouteOption[]>('/api/master-data/routes/options'),
  { default: () => [] }
);
const { data: stationSuppliers } = await useAsyncData(
  'station-suppliers-flight-command-center',
  () =>
    fetchApi<HandlingParkingSupplierDto[]>(
      '/api/master-data/handling-parking-suppliers?active=active'
    ),
  { default: () => [] }
);
const {
  data: flight,
  pending,
  error,
  refresh
} = await useAsyncData(`flight-operation-${id.value}`, () =>
  fetchApi<FlightOperationDetailDto>(`/api/flight-operations/flights/${id.value}`)
);

const lifecycle = [
  'PLANNING',
  'READINESS',
  'APPROVAL',
  'SCHEDULED',
  'DEPARTURE',
  'IN_FLIGHT',
  'ARRIVAL',
  'CLOSURE',
  'FINAL'
] as const;
const currentLifecycleIndex = computed(() => {
  const phase = flight.value?.commandCenter?.lifecycle.currentPhase;
  return phase ? lifecycle.indexOf(phase as (typeof lifecycle)[number]) : -1;
});
const closureAllowed = computed(() => {
  const current = flight.value;
  if (!current) return false;
  if (current.operationalClosureRequirements?.length) {
    return current.operationalClosureRequirements.every(
      (requirement) => requirement.status !== 'BLOCKED'
    );
  }
  return current.closureReadiness.allowed;
});
const approvalInvalidationReason = computed(
  () =>
    flight.value?.approvals.find((approval) => approval.invalidationReason)?.invalidationReason ??
    null
);

const actionPresentation: Record<string, { icon: string; color?: string }> = {
  submit: { icon: 'mdi-send-outline', color: 'secondary' },
  evaluate: { icon: 'mdi-refresh' },
  'accept-readiness': { icon: 'mdi-shield-check-outline', color: 'secondary' },
  approve: { icon: 'mdi-check-decagram-outline', color: 'success' },
  schedule: { icon: 'mdi-calendar-check-outline' },
  'open-check-in': { icon: 'mdi-account-check-outline' },
  'close-check-in': { icon: 'mdi-account-lock-outline' },
  'evaluate-departure-assurance': { icon: 'mdi-shield-airplane-outline' },
  'mark-ready-for-departure': { icon: 'mdi-airplane-check', color: 'success' },
  depart: { icon: 'mdi-airplane-takeoff' },
  land: { icon: 'mdi-airplane-landing', color: 'success' },
  'pending-closure': { icon: 'mdi-clipboard-check-outline' },
  close: { icon: 'mdi-lock-check-outline', color: 'success' },
  cancel: { icon: 'mdi-cancel', color: 'error' },
  divert: { icon: 'mdi-map-marker-alert-outline', color: 'warning' },
  reopen: { icon: 'mdi-lock-open-outline', color: 'warning' }
};

const validActions = computed(() => {
  return (flight.value?.commandCenter?.capabilities ?? [])
    .filter(
      (capability) =>
        capability.visible && !['cancel', 'divert', 'reopen'].includes(capability.action)
    )
    .map((capability) => ({
      ...capability,
      icon: actionPresentation[capability.action]?.icon ?? 'mdi-play-circle-outline',
      color: actionPresentation[capability.action]?.color,
      disabled: !capability.allowed,
      tooltip:
        capability.blockedReasons[0]?.message ??
        capability.description ??
        `${capability.ownerRoleCodes.join(' or ')} owns this action.`
    }));
});
const capabilityByAction = (action: string) =>
  flight.value?.commandCenter?.capabilities.find(
    (capability) => capability.action === action && capability.visible
  );

const aircraft = computed(() =>
  aircraftOptions.value.find((item) => item.id === flight.value?.aircraftId)
);
const destinationRouteOptions = computed(() =>
  routeOptions.value.filter(
    (item) =>
      item.originStationId === flight.value?.originStationId &&
      item.destinationStationId !== flight.value?.destinationStationId
  )
);
const selectedRoute = computed(() =>
  routeOptions.value.find((item) => item.id === selectedRouteId.value)
);
const destinationSupplierOptions = computed(() =>
  stationSuppliers.value.filter(
    (supplier) =>
      supplier.stationId === selectedRoute.value?.destinationStationId &&
      ['HANDLING', 'BOTH'].includes(supplier.serviceType)
  )
);
function aircraftStationCode(item: AircraftOption | undefined) {
  const stationId = item?.currentStationId ?? item?.baseStationId;
  return stationOptions.value.find((station) => station.id === stationId)?.stationCode ?? '-';
}
const passengerManifest = computed(() =>
  flight.value?.manifests.find((item) => item.manifestType === 'PASSENGER')
);
const cargoManifest = computed(() =>
  flight.value?.manifests.find((item) => item.manifestType === 'CARGO')
);
const fuel = computed(() => flight.value?.fuelRequests[0]);
const fuelPlanning = computed(() => flight.value?.fuelPlanningEstimate);
const fuelPlanningComponents = computed(() => {
  const estimate = fuelPlanning.value;
  if (!estimate) return [];
  return [
    ['Taxi fuel', estimate.taxiFuelLitre],
    ['Trip fuel', estimate.tripFuelLitre],
    ['Contingency fuel', estimate.contingencyFuelLitre],
    ['Alternate/no-alternate fuel', estimate.alternateFuelLitre],
    ['Final reserve fuel', estimate.finalReserveFuelLitre],
    ['Additional fuel', estimate.additionalFuelLitre],
    ['Discretionary fuel', estimate.discretionaryFuelLitre]
  ] as Array<[string, number | null]>;
});
const blockingIssues = computed(() =>
  (flight.value?.readinessChecks ?? []).filter((item) => item.blocking)
);
const aircraftTechnicalEligibility = computed(
  () => flight.value?.aircraftTechnicalEligibility ?? null
);
const aircraftTechnicalStatusColor = computed(() => {
  const status = aircraftTechnicalEligibility.value?.status;
  if (status === 'ELIGIBLE') return 'success';
  if (status === 'ELIGIBLE_WITH_RESTRICTIONS') return 'warning';
  return 'error';
});
const aircraftTechnicalStatusLabel = computed(() => {
  const status = aircraftTechnicalEligibility.value?.status;
  if (status === 'ELIGIBLE_WITH_RESTRICTIONS') return 'RESTRICTED';
  return status ?? 'UNKNOWN';
});
const activeOperationalBlockers = computed(() => flight.value?.commandCenter?.activeBlockers ?? []);
const warningIssues = computed(() =>
  (flight.value?.crewAssignments ?? []).filter((item) => item.availabilityStatus === 'WARNING')
);
const assignmentIssues = computed(() =>
  blockingIssues.value.filter((item) => ['AIRCRAFT', 'CREW'].includes(item.category))
);
const handlingConfirmedCount = computed(
  () => flight.value?.stationServices.filter((item) => item.status === 'CONFIRMED').length ?? 0
);
const currentApprovalOwner = computed(
  () =>
    flight.value?.approvals.find((item) => item.status === 'PENDING')?.assignedRole ??
    (flight.value?.currentStatus === 'READY_FOR_APPROVAL' ? 'Director' : 'OCC Checker')
);
const readinessCompleted = computed(
  () =>
    (flight.value?.readinessChecks ?? []).filter((item) =>
      ['PASS', 'NOT_APPLICABLE'].includes(item.status)
    ).length
);
const readinessCalculatedAt = computed(() => {
  const values = (flight.value?.readinessChecks ?? [])
    .map((item) => item.calculatedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return values.at(-1) ?? null;
});
const readinessGroups = computed(() => {
  const groups = [
    'AIRCRAFT',
    'CREW',
    'MANIFEST',
    'FUEL',
    'STATION',
    'FINANCE',
    'DOCUMENTS'
  ] as const;
  return groups.map((category) => ({
    category,
    items: (flight.value?.readinessChecks ?? []).filter((item) => item.category === category)
  }));
});
const fuelCost = computed(
  () => flight.value?.fuelRequests.reduce((sum, item) => sum + (item.totalCost ?? 0), 0) ?? 0
);
const maintenanceCost = computed(
  () => flight.value?.maintenanceHandoffs.reduce((sum, item) => sum + item.maintenanceCost, 0) ?? 0
);
const stationEstimate = computed(() => {
  if (!flight.value) return 0;
  if (flight.value.stationCosts.length > 0) {
    return flight.value.stationCosts.reduce((sum, item) => sum + (item.estimatedAmount ?? 0), 0);
  }
  return flight.value.stationServices.reduce((sum, item) => sum + (item.referenceRate ?? 0), 0);
});
const stationSubmitted = computed(
  () =>
    flight.value?.stationCosts
      .filter((item) => ['SUBMITTED', 'APPROVED'].includes(item.status))
      .reduce((sum, item) => sum + (item.actualAmount ?? 0), 0) ?? 0
);
const stationApproved = computed(
  () => flight.value?.stationCosts.reduce((sum, item) => sum + (item.approvedAmount ?? 0), 0) ?? 0
);
const stationPosted = computed(
  () =>
    flight.value?.stationCosts.reduce((sum, item) => sum + (item.postedLedgerAmount ?? 0), 0) ?? 0
);
const unresolvedStationCosts = computed(
  () =>
    flight.value?.stationCosts.filter((item) => ['DRAFT', 'SUBMITTED'].includes(item.status))
      .length ?? 0
);
const stationCostBreakdown = computed(() => {
  const costs = flight.value?.stationCosts ?? [];
  const summarize = (keyword: 'HANDLING' | 'PARKING') => {
    const matching = costs.filter((cost) => cost.costCategoryName.toUpperCase().includes(keyword));
    return {
      estimate: matching.reduce((sum, cost) => sum + (cost.estimatedAmount ?? 0), 0),
      approved: matching.reduce((sum, cost) => sum + (cost.approvedAmount ?? 0), 0),
      posted: matching.reduce((sum, cost) => sum + (cost.postedLedgerAmount ?? 0), 0)
    };
  };
  return {
    handling: summarize('HANDLING'),
    parking: summarize('PARKING')
  };
});
const operationalEstimate = computed(
  () => fuelCost.value + stationEstimate.value + maintenanceCost.value
);
const estimatedMargin = computed(
  () => (flight.value?.estimatedRevenue ?? 0) - operationalEstimate.value
);
const closureItems = computed(() => {
  const item = flight.value;
  if (!item) return [];
  if (item.operationalClosureRequirements?.length) {
    return item.operationalClosureRequirements.map((requirement) => ({
      label: requirement.label,
      done: requirement.status !== 'BLOCKED',
      reason: requirement.reason,
      actionHref: requirement.actionHref,
      status: requirement.status
    }));
  }
  const missing = new Set(item.closureReadiness.missing);
  return [
    ['Actual departure and arrival', 'actual departure/arrival'],
    ['Final manifest', 'final manifest'],
    ['Actual fuel uplift', 'actual fuel uplift'],
    ['Approved station cost', 'approved station cost'],
    ['Approved maintenance handoff', 'approved maintenance handoff']
  ].map(([label, requirement]) => ({
    label,
    done: !missing.has(requirement),
    reason: undefined,
    actionHref: undefined,
    status: missing.has(requirement) ? 'BLOCKED' : 'PASSED'
  }));
});
const blockedClosureRequirements = computed(
  () =>
    flight.value?.operationalClosureRequirements?.filter(
      (requirement) => requirement.status === 'BLOCKED'
    ) ?? []
);
const filteredHistory = computed(() => {
  if (historyFilter.value === 'ALL') return flight.value?.histories ?? [];
  return (flight.value?.histories ?? []).filter((item) => {
    if (historyFilter.value === 'STATUS') return true;
    if (historyFilter.value === 'APPROVAL') return item.actionType === 'APPROVE';
    if (historyFilter.value === 'READINESS') {
      return ['READINESS_EVALUATED', 'BLOCK'].includes(item.actionType);
    }
    return false;
  });
});

function formatDate(value: string | null, dateOnly = false) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: dateOnly ? 'medium' : undefined,
    day: dateOnly ? undefined : '2-digit',
    month: dateOnly ? undefined : 'short',
    year: dateOnly ? undefined : 'numeric',
    hour: dateOnly ? undefined : '2-digit',
    minute: dateOnly ? undefined : '2-digit',
    timeZone: 'Asia/Jayapura',
    timeZoneName: dateOnly ? undefined : 'short'
  }).format(new Date(value));
}

function duration() {
  if (!flight.value?.scheduledDepartureAt || !flight.value.scheduledArrivalAt) return '-';
  const minutes = Math.round(
    (new Date(flight.value.scheduledArrivalAt).getTime() -
      new Date(flight.value.scheduledDepartureAt).getTime()) /
      60_000
  );
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function money(value: number | null, currency = 'IDR') {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function litre(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)} L`;
}

function minutesLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  const absolute = Math.abs(value);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const sign = value < 0 ? '-' : '';
  return hours > 0 ? `${sign}${hours}h ${minutes}m` : `${sign}${minutes}m`;
}

function statusColor(status: string) {
  if (['PASS', 'APPROVED', 'CONFIRMED', 'AVAILABLE', 'CLOSED'].includes(status)) return 'success';
  if (['FAIL', 'BLOCKED', 'REJECTED', 'CANCELLED'].includes(status)) return 'error';
  if (['PENDING', 'DRAFT', 'REQUESTED', 'WARNING'].includes(status)) return 'warning';
  return 'info';
}

function approvalCheckpointLabel(type: string) {
  if (type === 'READINESS_APPROVAL') return 'Terima Kesiapan OCC';
  if (type === 'FLIGHT_APPROVAL') return 'Setujui Penerbangan';
  if (type === 'CLOSURE_APPROVAL') return 'Persetujuan Penutupan';
  return type.replaceAll('_', ' ');
}

function approvalCheckpointDescription(type: string) {
  if (type === 'READINESS_APPROVAL') {
    return 'OCC Checker memastikan evidence operasional lengkap dan konsisten.';
  }
  if (type === 'FLIGHT_APPROVAL') {
    return 'Director memberikan persetujuan final sebelum scheduling dan departure.';
  }
  if (type === 'CLOSURE_APPROVAL') {
    return 'OCC memastikan dependency arrival, maintenance, dan finance telah selesai.';
  }
  return 'Checkpoint operasional sesuai lifecycle flight.';
}

function readinessIcon(category: FlightReadinessCheckDto['category']) {
  return {
    AIRCRAFT: 'mdi-airplane-cog',
    CREW: 'mdi-account-group-outline',
    MANIFEST: 'mdi-clipboard-text-outline',
    FUEL: 'mdi-fuel',
    STATION: 'mdi-airport',
    FINANCE: 'mdi-cash-check',
    DOCUMENTS: 'mdi-file-document-check-outline'
  }[category];
}

function openIssue(item: FlightReadinessCheckDto) {
  selectedIssue.value = item;
  issueDrawer.value = true;
}

function canOpenBlocker(domain: string) {
  if (domain === 'STATION') return can('station.task.view').allowed;
  if (domain === 'MAINTENANCE') return can('flight.read').allowed;
  if (domain === 'FINANCE') return can('flight.read').allowed;
  return can('flight.read').allowed;
}

function openCommercialDetails() {
  if (!flight.value) return;
  commercialForm.customerId = flight.value.customerId;
  commercialForm.billingType = flight.value.billingType;
  commercialForm.estimatedRevenue = flight.value.estimatedRevenue;
  commercialError.value = '';
  commercialDialog.value = true;
}

function openAircraftAssignment() {
  if (!flight.value) return;
  selectedAircraftId.value = flight.value.aircraftId;
  aircraftError.value = '';
  aircraftDialog.value = true;
}

function openRouteAssignment() {
  selectedRouteId.value = null;
  selectedDestinationSupplierId.value = null;
  routeError.value = '';
  routeDialog.value = true;
}

watch(selectedRouteId, () => {
  selectedDestinationSupplierId.value = null;
});

async function saveAircraftAssignment(confirmed = false) {
  if (!flight.value || !selectedAircraftId.value || aircraftSaving.value) return;
  aircraftSaving.value = true;
  aircraftError.value = '';
  try {
    if (!confirmed && selectedAircraftId.value !== flight.value.aircraftId) {
      impactPreview.value = await fetchApi<FlightChangeImpactDto>(
        `/api/flight-operations/flights/${flight.value.id}/actions/preview-change`,
        {
          method: 'POST',
          body: {
            changeType: 'AIRCRAFT_ASSIGNMENT',
            changes: { aircraftId: selectedAircraftId.value },
            expectedVersion: flight.value.commandCenter?.stateVersion ?? flight.value.version
          }
        }
      );
      if (impactPreview.value.requiresConfirmation) {
        impactMode.value = 'AIRCRAFT';
        impactDialog.value = true;
        return;
      }
    }
    await fetchApi(`/api/flight-operations/flights/${flight.value.id}/aircraft`, {
      method: 'PATCH',
      body: {
        aircraftId: selectedAircraftId.value,
        expectedVersion: flight.value.commandCenter?.stateVersion ?? flight.value.version
      }
    });
    await refresh();
    aircraftDialog.value = false;
    impactDialog.value = false;
    impactPreview.value = null;
    actionSuccess.value = 'Aircraft assignment updated and readiness recalculated.';
  } catch (errorValue) {
    aircraftError.value =
      errorValue instanceof Error ? errorValue.message : 'Aircraft assignment could not be saved.';
  } finally {
    aircraftSaving.value = false;
  }
}

async function saveRouteAssignment(confirmed = false) {
  if (
    !flight.value ||
    !selectedRouteId.value ||
    !selectedDestinationSupplierId.value ||
    routeSaving.value
  ) {
    return;
  }
  routeSaving.value = true;
  routeError.value = '';
  try {
    const expectedVersion = flight.value.commandCenter?.stateVersion ?? flight.value.version;
    if (!confirmed) {
      impactPreview.value = await fetchApi<FlightChangeImpactDto>(
        `/api/flight-operations/flights/${flight.value.id}/actions/preview-change`,
        {
          method: 'POST',
          body: {
            changeType: 'ROUTE_STATION',
            changes: {
              routeId: selectedRouteId.value,
              destinationHandlingSupplierId: selectedDestinationSupplierId.value
            },
            expectedVersion
          }
        }
      );
      if (impactPreview.value.requiresConfirmation) {
        impactMode.value = 'ROUTE';
        impactDialog.value = true;
        return;
      }
    }
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flight.value.id}/route`,
      {
        method: 'PATCH',
        body: {
          routeId: selectedRouteId.value,
          destinationHandlingSupplierId: selectedDestinationSupplierId.value,
          expectedVersion,
          idempotencyKey: `${flight.value.id}:route:${crypto.randomUUID()}`
        }
      }
    );
    await refresh();
    routeDialog.value = false;
    impactDialog.value = false;
    impactPreview.value = null;
    actionSuccess.value =
      'Destination updated. Destination-only records were invalidated and reapproval is required.';
  } catch (errorValue) {
    routeError.value =
      errorValue instanceof Error ? errorValue.message : 'Destination could not be updated.';
  } finally {
    routeSaving.value = false;
  }
}

function confirmImpactChange() {
  if (impactMode.value === 'ROUTE') {
    void saveRouteAssignment(true);
    return;
  }
  void saveAircraftAssignment(true);
}

async function saveCommercialDetails() {
  if (!flight.value || commercialSaving.value) return;
  commercialSaving.value = true;
  commercialError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(
      `/api/flight-operations/flights/${flight.value.id}/commercial`,
      { method: 'PATCH', body: commercialForm }
    );
    await refresh();
    commercialDialog.value = false;
    actionSuccess.value = 'Commercial details updated and readiness recalculated.';
  } catch (errorValue) {
    commercialError.value =
      errorValue instanceof Error ? errorValue.message : 'Commercial details could not be saved.';
  } finally {
    commercialSaving.value = false;
  }
}

function actionUrl(action: string) {
  return `/api/flight-operations/flights/${id.value}/actions/${action}`;
}

async function runAction(action: string) {
  actionError.value = '';
  actionSuccess.value = '';
  if (action === 'depart' || action === 'land') {
    actualTimeAction.value = action;
    actualTimeDialog.value = true;
    return;
  }
  if (['cancel', 'divert', 'reopen'].includes(action)) {
    reasonAction.value = action as typeof reasonAction.value;
    correctionScope.value = null;
    reasonDialog.value = true;
    return;
  }
  if (action === 'accept-readiness' || action === 'approve') {
    approvalAction.value = action;
    approvalNote.value = '';
    approvalDialog.value = true;
    return;
  }
  actionLoading.value = true;
  try {
    const concurrencyActions = ['close-check-in', 'mark-ready-for-departure'];
    const versionedCommandActions = ['schedule', 'open-check-in', 'pending-closure'];
    const commandBody = versionedCommandActions.includes(action)
      ? {
          expectedVersion: flight.value?.commandCenter?.stateVersion ?? flight.value?.version,
          idempotencyKey: `${id.value}:${action}:${crypto.randomUUID()}`
        }
      : {};
    await fetchApi<FlightOperationDetailDto>(actionUrl(action), {
      method: 'POST',
      body: concurrencyActions.includes(action)
        ? { expectedUpdatedAt: flight.value?.updatedAt }
        : commandBody
    });
    await refresh();
    actionSuccess.value = `${action.replaceAll('-', ' ')} completed successfully.`;
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}

async function confirmApproval() {
  if (!flight.value || approvalNote.value.trim().length < 3) return;
  actionLoading.value = true;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(actionUrl(approvalAction.value), {
      method: 'POST',
      body: {
        expectedVersion: flight.value.version,
        readinessRevision: flight.value.readinessRevision,
        note: approvalNote.value.trim()
      }
    });
    await refresh();
    approvalDialog.value = false;
    actionSuccess.value =
      approvalAction.value === 'accept-readiness'
        ? 'Planning readiness accepted by OCC Checker.'
        : 'Flight approved by Director.';
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Approval failed';
  } finally {
    actionLoading.value = false;
  }
}

async function submitActualTime(body: { actualAt: string; stationId: string; note?: string }) {
  actionLoading.value = true;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(actionUrl(actualTimeAction.value), {
      method: 'POST',
      body: {
        ...body,
        expectedVersion: flight.value?.commandCenter?.stateVersion ?? flight.value?.version,
        idempotencyKey: `${id.value}:${actualTimeAction.value}:${crypto.randomUUID()}`
      }
    });
    actualTimeDialog.value = false;
    await refresh();
    actionSuccess.value =
      actualTimeAction.value === 'depart' ? 'Departure recorded.' : 'Landing recorded.';
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Actual time failed';
  } finally {
    actionLoading.value = false;
  }
}

async function submitReasonAction() {
  actionLoading.value = true;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(actionUrl(reasonAction.value), {
      method: 'POST',
      body: {
        reasonId: reasonId.value,
        reasonNote: reasonNote.value,
        diversionStationId: diversionStationId.value || undefined,
        correctionScope: reasonAction.value === 'reopen' ? correctionScope.value : undefined,
        expectedVersion: flight.value?.commandCenter?.stateVersion ?? flight.value?.version,
        idempotencyKey: `${id.value}:${reasonAction.value}:${crypto.randomUUID()}`
      }
    });
    reasonDialog.value = false;
    reasonId.value = '';
    reasonNote.value = '';
    diversionStationId.value = '';
    correctionScope.value = null;
    await refresh();
    actionSuccess.value = `${reasonAction.value.replaceAll('-', ' ')} completed successfully.`;
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}

function historyActor(item: FlightStatusHistoryDto) {
  if (item.changedByUserId === 'USR-ADMIN') return 'Sinta - Operation Manager';
  if (item.changedByUserId === 'USR-001') return 'Rian - OCC Staff';
  return item.changedByUserId ?? 'System';
}

function handleActionSuccessVisibility(open: boolean) {
  if (!open) actionSuccess.value = '';
}
</script>

<template>
  <VContainer class="flight-workspace px-3 py-4 md:px-5" fluid>
    <VBreadcrumbs
      class="mb-2 px-0 py-1 text-sm"
      :items="[
        { title: 'Flight Control', to: '/flights' },
        { title: 'Flight Orders', to: '/flights' },
        { title: flight?.flightNumber ?? 'Flight' }
      ]"
    />

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load flight order.
    </VAlert>
    <VAlert v-if="actionError" closable class="mb-4" type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VAlert
      v-if="flight?.currentStatus === 'REAPPROVAL_REQUIRED'"
      class="mb-4"
      icon="mdi-shield-alert-outline"
      type="warning"
      variant="tonal"
    >
      <div class="font-weight-bold">
        Reapproval required for revision {{ flight.readinessRevision }}
      </div>
      <div>
        {{
          approvalInvalidationReason ??
            flight.blockingReason ??
            'A critical readiness source changed after approval.'
        }}
      </div>
      <div class="mt-1 text-caption">
        Previous approvals remain in the audit history. Resolve blockers, then complete OCC and
        Director approval again.
      </div>
    </VAlert>
    <VAlert
      v-if="flight?.currentStatus === 'PENDING_CLOSURE' && !closureAllowed"
      class="mb-4"
      type="warning"
      variant="tonal"
    >
      <div class="font-weight-medium">Close Flight is unavailable.</div>
      <ul v-if="flight.operationalClosureRequirements?.length" class="mt-2 pl-5">
        <li v-for="requirement in blockedClosureRequirements" :key="requirement.code">
          <NuxtLink v-if="requirement.actionHref" :to="requirement.actionHref">
            {{ requirement.label }}
          </NuxtLink>
          <span v-else>{{ requirement.label }}</span>
          — {{ requirement.reason }}
        </li>
      </ul>
      <span v-else>Complete: {{ flight.closureReadiness.missing.join(', ') }}.</span>
    </VAlert>

    <div v-if="pending" class="py-12">
      <VSkeletonLoader type="heading, paragraph, table" />
    </div>

    <template v-else-if="flight">
      <section class="flight-summary mb-3 border bg-surface px-4 py-3">
        <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div class="min-w-[230px]">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-h5 font-weight-bold text-text-primary">{{ flight.flightNumber }}</h1>
              <FlightsFlightStatusChip :status="flight.currentStatus" />
              <VChip color="warning" size="small" variant="tonal">DEMO ENVIRONMENT</VChip>
              <VChip color="neutral" size="small" variant="outlined">
                {{ flight.orderNumber }}
              </VChip>
            </div>
            <div class="mt-1 text-sm text-text-secondary">
              {{ flight.originStationCode }}
              <VIcon class="mx-1" icon="mdi-arrow-right" size="16" />
              {{ flight.destinationStationCode }} · {{ flight.serviceType.replaceAll('_', ' ') }}
            </div>
          </div>

          <div class="summary-field">
            <span>Flight date</span>
            <strong>{{ formatDate(`${flight.flightDate}T00:00:00+09:00`, true) }}</strong>
          </div>
          <div class="summary-field">
            <span>ETD / ETA</span>
            <strong>{{ formatDate(flight.scheduledDepartureAt) }}</strong>
            <small>{{ formatDate(flight.scheduledArrivalAt) }}</small>
          </div>
          <div class="summary-field">
            <span>Aircraft</span>
            <strong>{{ flight.aircraftRegistration ?? 'Unassigned' }}</strong>
            <small>{{ aircraft?.aircraftType ?? '-' }}</small>
          </div>
          <div class="summary-field">
            <span>PIC</span>
            <strong>{{ flight.pilotInCommandName ?? 'Unassigned' }}</strong>
          </div>
          <div class="summary-field min-w-[150px]">
            <span>Readiness</span>
            <div class="flex items-center gap-2">
              <VProgressLinear
                class="w-20"
                color="secondary"
                height="7"
                :model-value="flight.readinessPercent"
                rounded
              />
              <strong>{{ readinessCompleted }}/{{ flight.readinessChecks.length }}</strong>
            </div>
          </div>

          <VSpacer />
          <div class="flex flex-wrap gap-2">
            <VTooltip v-for="action in validActions" :key="action.action" :text="action.tooltip">
              <template #activator="{ props: tooltipProps }">
                <VBtn
                  v-bind="tooltipProps"
                  :color="action.color"
                  :disabled="action.disabled"
                  :loading="actionLoading"
                  :prepend-icon="action.icon"
                  size="small"
                  :variant="action.color ? 'flat' : 'tonal'"
                  @click="runAction(action.action)"
                >
                  {{ action.label }}
                </VBtn>
              </template>
            </VTooltip>
            <VMenu>
              <template #activator="{ props: menuProps }">
                <VTooltip text="More flight actions">
                  <template #activator="{ props: tooltipProps }">
                    <VBtn
                      v-bind="{ ...menuProps, ...tooltipProps }"
                      aria-label="More flight actions"
                      icon="mdi-dots-vertical"
                      size="small"
                      variant="text"
                    />
                  </template>
                </VTooltip>
              </template>
              <VList density="compact">
                <VListItem
                  v-if="capabilityByAction('cancel')"
                  :disabled="!capabilityByAction('cancel')?.allowed"
                  prepend-icon="mdi-cancel"
                  title="Cancel flight"
                  @click="runAction('cancel')"
                />
                <VListItem
                  v-if="capabilityByAction('divert')"
                  :disabled="!capabilityByAction('divert')?.allowed"
                  prepend-icon="mdi-map-marker-alert-outline"
                  title="Divert flight"
                  @click="runAction('divert')"
                />
                <VListItem
                  v-if="capabilityByAction('reopen')"
                  :disabled="!capabilityByAction('reopen')?.allowed"
                  prepend-icon="mdi-lock-open-outline"
                  title="Reopen for correction"
                  @click="runAction('reopen')"
                />
              </VList>
            </VMenu>
          </div>
        </div>

        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div class="status-strip">
            <VIcon icon="mdi-account-box-multiple-outline" />
            <span>Manifest</span>
            <DsStatusBadge :value="cargoManifest?.status ?? 'NOT_STARTED'" />
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-fuel" />
            <span>Fuel</span>
            <DsStatusBadge :value="fuel?.status ?? 'NOT_STARTED'" />
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-airport" />
            <span>Handling</span>
            <DsStatusBadge :value="handlingConfirmedCount ? 'PARTIAL' : 'PENDING'" />
          </div>
          <div class="status-strip">
            <VIcon icon="mdi-cash-check" />
            <span>Finance</span>
            <DsStatusBadge
              :value="flight.currentStatus === 'CLOSED' ? 'BILLABLE' : 'NOT_YET_BILLABLE'"
            />
          </div>
        </div>
      </section>

      <section v-if="flight.commandCenter" class="command-strip mb-3">
        <div>
          <span>Current phase</span>
          <strong>{{ flight.commandCenter.lifecycle.phaseLabel }}</strong>
          <small>{{ flight.currentStatusLabel }}</small>
        </div>
        <div>
          <span>Next action</span>
          <strong>{{
            flight.commandCenter.nextRequiredActions[0]?.title ?? 'No pending action'
          }}</strong>
          <small>{{
            flight.commandCenter.nextRequiredActions[0]?.description ??
              'The Flight Order has no unresolved action.'
          }}</small>
        </div>
        <div>
          <span>Owner</span>
          <strong>{{
            flight.commandCenter.nextRequiredActions[0]?.ownerRoleCodes.join(', ') || 'System'
          }}</strong>
          <small>{{
            flight.commandCenter.nextRequiredActions[0]?.ownerStationCode ??
              'All-station responsibility'
          }}</small>
        </div>
        <div>
          <span>Blocking issues</span>
          <strong>{{ activeOperationalBlockers.length }}</strong>
          <small>{{
            activeOperationalBlockers[0]?.message ?? 'No active operational blocker'
          }}</small>
        </div>
        <VBtn
          v-if="flight.commandCenter.nextRequiredActions[0]?.href"
          append-icon="mdi-arrow-right"
          :to="flight.commandCenter.nextRequiredActions[0].href"
          variant="tonal"
        >
          Open workspace
        </VBtn>
      </section>

      <section v-if="activeOperationalBlockers.length" class="blocker-list mb-3">
        <div
          v-for="blocker in activeOperationalBlockers.slice(0, 4)"
          :key="`${blocker.code}-${blocker.ownerStationCode ?? 'all'}`"
          class="blocker-row"
        >
          <VIcon color="warning" icon="mdi-alert-octagon-outline" />
          <div>
            <strong>{{ blocker.message }}</strong>
            <small>
              {{ blocker.code }} | Owner: {{ blocker.ownerRoleCode ?? 'Operational owner' }}
              <template v-if="blocker.ownerStationCode">
                | Station {{ blocker.ownerStationCode }}
              </template>
            </small>
            <small v-if="blocker.evidenceReference">
              System record: {{ blocker.evidenceReference }}
            </small>
          </div>
          <VBtn
            v-if="blocker.recoveryHref && canOpenBlocker(blocker.domain)"
            append-icon="mdi-arrow-right"
            :to="blocker.recoveryHref"
            size="small"
            variant="text"
          >
            Resolve
          </VBtn>
          <VChip v-else size="small" variant="outlined">Handoff required</VChip>
        </div>
      </section>

      <div class="mb-3 flex flex-wrap gap-2">
        <VBtn
          prepend-icon="mdi-account-box-multiple-outline"
          size="small"
          :to="`/flights/${flight.id}/manifest`"
          variant="tonal"
        >
          Manifest
        </VBtn>
        <VBtn
          prepend-icon="mdi-airport"
          size="small"
          :to="`/flights/station-operations/${flight.id}`"
          variant="tonal"
        >
          Station Operations
        </VBtn>
        <VBtn prepend-icon="mdi-fuel" size="small" to="/flights/fuel" variant="tonal">
          Fuel Control
        </VBtn>
      </div>

      <VTabs
        v-model="activeTab"
        class="workspace-tabs mb-4 border-b bg-background"
        color="primary"
        show-arrows
      >
        <VTab value="overview">Overview</VTab>
        <VTab value="readiness">Readiness</VTab>
        <VTab value="assignment">Assignment</VTab>
        <VTab value="approval">Status & Approval</VTab>
        <VTab value="records">Related Records</VTab>
        <VTab value="history">History</VTab>
      </VTabs>

      <VWindow v-model="activeTab">
        <VWindowItem value="overview">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-settings" />
                  <h2>Flight Information</h2>
                  <VSpacer />
                  <VBtn
                    v-if="canChangeRoute"
                    prepend-icon="mdi-map-marker-path"
                    size="small"
                    variant="tonal"
                    @click="openRouteAssignment"
                  >
                    Change destination
                  </VBtn>
                </div>
                <div class="detail-grid">
                  <div>
                    <span>Flight number</span>
                    <strong>{{ flight.flightNumber }}</strong>
                  </div>
                  <div>
                    <span>Flight type</span>
                    <strong>{{ flight.serviceType.replaceAll('_', ' ') }}</strong>
                  </div>
                  <div>
                    <span>Operational date</span>
                    <strong>{{ flight.flightDate }}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{{ duration() }}</strong>
                  </div>
                  <div>
                    <span>Departure</span>
                    <strong>{{ flight.originStationCode }}</strong>
                  </div>
                  <div>
                    <span>Arrival</span>
                    <strong>{{ flight.destinationStationCode }}</strong>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{{ flight.customerName ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Request source</span>
                    <strong>{{ flight.requestSource }}</strong>
                  </div>
                  <div>
                    <span>Priority</span>
                    <FlightsFlightStatusChip :status="flight.priority" />
                  </div>
                  <div class="sm:col-span-2 lg:col-span-3">
                    <span>Operational notes</span>
                    <strong>{{ flight.remarks ?? '-' }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-account-tie-hat-outline" />
                  <h2>Aircraft & Crew Summary</h2>
                </div>
                <div class="detail-grid">
                  <div>
                    <span>Registration</span>
                    <strong>{{ aircraft?.registrationNumber ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Aircraft type</span>
                    <strong>{{ aircraft?.aircraftType ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Capacity</span>
                    <strong>
                      {{ aircraft?.passengerCapacity ?? 0 }} pax /
                      {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                    </strong>
                  </div>
                  <div>
                    <span>Current station</span>
                    <strong>{{ aircraftStationCode(aircraft) }}</strong>
                  </div>
                  <div>
                    <span>Serviceability</span>
                    <FlightsFlightStatusChip
                      :status="aircraft?.serviceabilityStatus ?? 'UNKNOWN'"
                    />
                  </div>
                  <div>
                    <span>Fuel type</span>
                    <strong>{{ aircraft?.fuelType ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>Maintenance due</span>
                    <strong>{{ aircraft?.nextMaintenanceDueAt ?? '-' }}</strong>
                  </div>
                  <div v-for="member in flight.crewAssignments" :key="member.id">
                    <span>{{ member.assignmentRole.replaceAll('_', ' ') }}</span>
                    <strong>{{ member.crewName }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-cog" />
                  <h2>Status Teknis Aircraft</h2>
                  <VChip :color="aircraftTechnicalStatusColor" size="small" variant="tonal">
                    {{ aircraftTechnicalStatusLabel }}
                  </VChip>
                </div>
                <div v-if="aircraftTechnicalEligibility" class="space-y-3">
                  <VAlert
                    v-if="aircraftTechnicalEligibility.status === 'BLOCKED'"
                    density="compact"
                    type="error"
                    variant="tonal"
                  >
                    {{
                      aircraftTechnicalEligibility.blockers[0]?.reason ??
                        'Aircraft belum memenuhi technical eligibility maintenance.'
                    }}
                  </VAlert>
                  <VAlert
                    v-else-if="aircraftTechnicalEligibility.status === 'ELIGIBLE_WITH_RESTRICTIONS'"
                    density="compact"
                    type="warning"
                    variant="tonal"
                  >
                    Aircraft memiliki pembatasan maintenance aktif untuk review operasional.
                  </VAlert>
                  <VAlert v-else density="compact" type="success" variant="tonal">
                    Aircraft memenuhi gate technical eligibility maintenance.
                  </VAlert>

                  <div
                    v-for="restriction in aircraftTechnicalEligibility.restrictions"
                    :key="restriction.sourceId"
                    class="alert-row"
                  >
                    <VIcon color="warning" icon="mdi-alert-outline" />
                    <span>
                      <strong>{{ restriction.title }}</strong>
                      <small>
                        {{ restriction.restriction }} · valid until
                        {{ formatDate(restriction.validUntil) }}
                      </small>
                    </span>
                  </div>

                  <div
                    v-for="blocker in aircraftTechnicalEligibility.blockers.slice(0, 3)"
                    :key="`${blocker.code}-${blocker.sourceEntityId}`"
                    class="alert-row"
                  >
                    <VIcon color="error" icon="mdi-alert-circle-outline" />
                    <span>
                      <strong>{{ blocker.code.replaceAll('_', ' ') }}</strong>
                      <small>{{ blocker.remediation }}</small>
                    </span>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-fuel" />
                  <h2>Fuel Planning Advisory</h2>
                  <FlightsFlightStatusChip :status="fuelPlanning?.status ?? 'NOT_CONFIGURED'" />
                </div>
                <div v-if="fuelPlanning" class="fuel-advisory">
                  <div class="fuel-advisory__summary">
                    <div>
                      <span>Available block fuel</span>
                      <strong>{{ litre(fuelPlanning.availableBlockFuelLitre) }}</strong>
                    </div>
                    <div>
                      <span>Required block fuel</span>
                      <strong>{{ litre(fuelPlanning.requiredBlockFuelLitre) }}</strong>
                    </div>
                    <div>
                      <span>Operational margin</span>
                      <strong>{{ litre(fuelPlanning.operationalMarginLitre) }}</strong>
                    </div>
                    <div>
                      <span>Margin endurance</span>
                      <strong>{{ minutesLabel(fuelPlanning.operationalMarginMinutes) }}</strong>
                    </div>
                  </div>
                  <div class="fuel-advisory__components">
                    <div
                      v-for="[label, value] in fuelPlanningComponents"
                      :key="label"
                      class="fuel-advisory__component"
                    >
                      <span>{{ label }}</span>
                      <strong>{{ litre(value) }}</strong>
                    </div>
                  </div>
                  <div class="fuel-advisory__meta">
                    <span>{{ fuelPlanning.regulatoryBasis }} · Policy v{{
                      fuelPlanning.policyVersion ?? '-'
                    }}</span>
                    <span>Fuel source: {{ fuelPlanning.calculationSources.fuelQuantitySource }}</span>
                    <span>Duration: {{ fuelPlanning.calculationSources.durationSource }}</span>
                  </div>
                  <div v-if="fuelPlanning.warnings.length" class="mt-3 flex flex-wrap gap-2">
                    <VChip
                      v-for="warning in fuelPlanning.warnings"
                      :key="warning"
                      color="warning"
                      size="small"
                      variant="tonal"
                    >
                      {{ warning.replaceAll('_', ' ') }}
                    </VChip>
                  </div>
                </div>
              </section>

              <section>
                <div class="mb-2 flex items-center justify-between">
                  <h2 class="text-subtitle-1 font-weight-bold">Operational Snapshot</h2>
                  <span class="text-xs text-text-secondary">Flight-linked records</span>
                </div>
                <div class="snapshot-grid">
                  <div>
                    <VIcon icon="mdi-account-multiple-outline" />
                    <span>Passenger manifest</span>
                    <strong>{{ passengerManifest?.passengerCount ?? 0 }} pax</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-package-variant-closed" />
                    <span>Cargo manifest</span>
                    <strong>
                      {{ cargoManifest?.cargoActualWeightKg ?? 0 }} /
                      {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-fuel" />
                    <span>Fuel request</span>
                    <strong>{{ fuel?.requestedQuantityLitre ?? 0 }} L</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-airport" />
                    <span>Station handling</span>
                    <strong>
                      {{ handlingConfirmedCount }}/{{ flight.stationServices.length }} confirmed
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-playlist-check" />
                    <span>Readiness</span>
                    <strong>
                      {{ readinessCompleted }}/{{ flight.readinessChecks.length }} complete
                    </strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-account-check-outline" />
                    <span>Approval owner</span>
                    <strong>{{ currentApprovalOwner }}</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-lock-clock-outline" />
                    <span>Closure</span>
                    <strong>{{
                      flight.currentStatus === 'CLOSED' ? 'Complete' : 'Not started'
                    }}</strong>
                  </div>
                  <div>
                    <VIcon icon="mdi-cash-multiple" />
                    <span>Revenue estimate</span>
                    <strong>{{ money(flight.estimatedRevenue) }}</strong>
                  </div>
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon color="warning" icon="mdi-alert-outline" />
                  <h2>Alerts & Exceptions</h2>
                  <VChip color="error" size="x-small" variant="tonal">
                    {{ blockingIssues.length }}
                  </VChip>
                </div>
                <div v-if="blockingIssues.length === 0" class="empty-compact">
                  <VIcon color="success" icon="mdi-check-circle-outline" />
                  No blocking issue
                </div>
                <button
                  v-for="item in blockingIssues"
                  :key="item.id"
                  class="alert-row"
                  type="button"
                  @click="openIssue(item)"
                >
                  <VIcon :color="statusColor(item.status)" icon="mdi-alert-circle-outline" />
                  <span>
                    <strong>{{ item.checkName }}</strong>
                    <small>{{ item.resultNote }}</small>
                  </span>
                  <VIcon icon="mdi-chevron-right" />
                </button>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-timeline-clock-outline" />
                  <h2>Lifecycle</h2>
                </div>
                <div class="lifecycle-mini">
                  <div
                    v-for="(phase, index) in lifecycle"
                    :key="phase"
                    :class="{
                      active: phase === flight.commandCenter?.lifecycle.currentPhase,
                      complete: currentLifecycleIndex > index
                    }"
                  >
                    <span />
                    <small>{{ phase.replaceAll('_', ' ') }}</small>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="readiness">
          <section class="readiness-summary mb-4">
            <div>
              <span>Overall readiness</span>
              <strong>{{ readinessCompleted }} of {{ flight.readinessChecks.length }}</strong>
            </div>
            <div>
              <span>Status</span>
              <FlightsFlightStatusChip :status="blockingIssues.length ? 'BLOCKED' : 'READY'" />
            </div>
            <div>
              <span>Blocking issues</span>
              <strong class="text-error">{{ blockingIssues.length }}</strong>
            </div>
            <div>
              <span>Warnings</span>
              <strong class="text-warning">{{ warningIssues.length }}</strong>
            </div>
            <div>
              <span>Calculated</span>
              <strong>{{ formatDate(readinessCalculatedAt) }}</strong>
            </div>
            <VSpacer />
            <VBtn prepend-icon="mdi-refresh" variant="tonal" @click="runAction('evaluate')">
              Refresh calculation
            </VBtn>
            <VAlert v-if="blockingIssues.length" density="compact" type="warning" variant="tonal">
              Resolve blockers before approval.
            </VAlert>
          </section>

          <div class="grid gap-4 lg:grid-cols-2">
            <section v-for="group in readinessGroups" :key="group.category" class="workspace-panel">
              <div class="panel-title">
                <VIcon :icon="readinessIcon(group.category)" />
                <h2>{{ group.category }} Readiness</h2>
              </div>
              <button
                v-for="item in group.items"
                :key="item.id"
                class="check-row"
                type="button"
                @click="openIssue(item)"
              >
                <VIcon
                  :color="statusColor(item.status)"
                  :icon="
                    item.status === 'PASS'
                      ? 'mdi-check-circle'
                      : item.status === 'FAIL'
                        ? 'mdi-close-circle'
                        : 'mdi-clock-alert-outline'
                  "
                />
                <span>
                  <strong>{{ item.checkName }}</strong>
                  <small>{{ item.resultNote }}</small>
                </span>
                <FlightsFlightStatusChip :status="item.status" />
                <VIcon icon="mdi-chevron-right" size="18" />
              </button>
              <div v-if="group.items.length === 0" class="empty-compact">No check configured.</div>
            </section>
          </div>
        </VWindowItem>

        <VWindowItem value="assignment">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-edit" />
                  <h2>Aircraft Assignment</h2>
                  <VSpacer />
                  <VBtn
                    v-if="canEditCommercialDetails"
                    prepend-icon="mdi-swap-horizontal"
                    size="small"
                    variant="tonal"
                    @click="openAircraftAssignment"
                  >
                    Change Aircraft
                  </VBtn>
                </div>
                <div class="assignment-hero">
                  <div class="registration">{{ aircraft?.registrationNumber ?? '-' }}</div>
                  <div>
                    <strong>{{ aircraft?.aircraftType }}</strong>
                    <span>{{ aircraft?.manufacturer }} {{ aircraft?.model }}</span>
                  </div>
                  <div>
                    <span>Current station</span>
                    <strong>{{ aircraftStationCode(aircraft) }}</strong>
                  </div>
                  <div>
                    <span>Capacity</span>
                    <strong>
                      {{ aircraft?.passengerCapacity }} pax / {{ aircraft?.cargoCapacityKg }} kg
                    </strong>
                  </div>
                  <div>
                    <span>Maintenance due</span>
                    <strong>{{ aircraft?.nextMaintenanceDueAt ?? '-' }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-airplane-search" />
                  <h2>Aircraft Alternatives</h2>
                </div>
                <VTable density="compact" hover>
                  <thead>
                    <tr>
                      <th>Aircraft</th>
                      <th>Station</th>
                      <th>Capacity</th>
                      <th>Serviceability</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in aircraftOptions" :key="item.id">
                      <td>
                        <strong>{{ item.registrationNumber }}</strong>
                        <div class="text-xs">{{ item.aircraftType }}</div>
                      </td>
                      <td>{{ aircraftStationCode(item) }}</td>
                      <td>{{ item.passengerCapacity }} pax / {{ item.cargoCapacityKg }} kg</td>
                      <td><FlightsFlightStatusChip :status="item.serviceabilityStatus" /></td>
                      <td>
                        <VChip
                          :color="
                            item.id === flight.aircraftId
                              ? 'success'
                              : item.serviceabilityStatus === 'SERVICEABLE'
                                ? 'info'
                                : 'warning'
                          "
                          size="small"
                          variant="tonal"
                        >
                          {{
                            item.id === flight.aircraftId
                              ? 'Recommended'
                              : item.serviceabilityStatus === 'SERVICEABLE'
                                ? 'Available'
                                : 'Not recommended'
                          }}
                        </VChip>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-account-group-outline" />
                  <h2>Crew Assignment</h2>
                </div>
                <VTable density="compact" hover>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Crew</th>
                      <th>License</th>
                      <th>Medical</th>
                      <th>Station</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in flight.crewAssignments" :key="member.id">
                      <td>{{ member.assignmentRole.replaceAll('_', ' ') }}</td>
                      <td>
                        <strong>{{ member.crewName }}</strong>
                        <div class="text-xs">{{ member.employeeCode }}</div>
                      </td>
                      <td>{{ member.licenseExpiryDate ?? '-' }}</td>
                      <td>{{ member.medicalExpiryDate ?? '-' }}</td>
                      <td>{{ member.dutyStationCode ?? member.baseStationCode ?? '-' }}</td>
                      <td><FlightsFlightStatusChip :status="member.availabilityStatus" /></td>
                    </tr>
                  </tbody>
                </VTable>
              </section>
            </div>

            <aside class="workspace-panel self-start">
              <div class="panel-title">
                <VIcon color="warning" icon="mdi-alert-decagram-outline" />
                <h2>Conflict Detector</h2>
              </div>
              <div v-for="item in assignmentIssues" :key="item.id" class="conflict-item">
                <FlightsFlightStatusChip :status="item.status" />
                <strong>{{ item.checkName }}</strong>
                <p>{{ item.resultNote }}</p>
                <small>{{ item.recommendedAction }}</small>
                <VBtn class="mt-2" size="small" variant="text" @click="openIssue(item)">
                  Review conflict
                </VBtn>
              </div>
              <div v-if="assignmentIssues.length === 0" class="empty-compact">
                No assignment conflict.
              </div>
              <VDivider class="my-4" />
              <VTextarea label="Dispatch note" rows="2" variant="outlined" />
              <VTextarea label="Crew instruction" rows="2" variant="outlined" />
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="approval">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-timeline-check-outline" />
                  <h2>Lifecycle Timeline</h2>
                </div>
                <div class="lifecycle-full">
                  <div
                    v-for="(phase, index) in lifecycle"
                    :key="phase"
                    :class="{
                      active: phase === flight.commandCenter?.lifecycle.currentPhase,
                      complete: currentLifecycleIndex > index
                    }"
                  >
                    <span>{{ Number(index) + 1 }}</span>
                    <strong>{{ phase.replaceAll('_', ' ') }}</strong>
                  </div>
                </div>
              </section>

              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-shield-check-outline" />
                  <h2>Approval Stages</h2>
                </div>
                <div v-if="flight.flightRequestId" class="approval-row">
                  <span class="approval-index">1</span>
                  <div>
                    <strong>Setujui Permintaan</strong>
                    <small>Business approval atas kebutuhan penerbangan.</small>
                    <VBtn
                      class="mt-1 px-0"
                      size="x-small"
                      :to="`/flights/requests/${flight.flightRequestId}`"
                      variant="text"
                    >
                      Buka Flight Request
                    </VBtn>
                  </div>
                  <div>
                    <span>Source</span>
                    <strong>{{ flight.requestNumber ?? 'Flight Request' }}</strong>
                  </div>
                  <FlightsFlightStatusChip status="APPROVED" />
                </div>
                <div
                  v-for="(approval, index) in flight.approvals"
                  :key="approval.id"
                  class="approval-row"
                >
                  <span class="approval-index">{{
                    Number(index) + (flight.flightRequestId ? 2 : 1)
                  }}</span>
                  <div>
                    <strong>{{ approvalCheckpointLabel(approval.approvalType) }}</strong>
                    <small>{{ approvalCheckpointDescription(approval.approvalType) }}</small>
                    <small>Approver: {{ approval.assignedRole }}</small>
                  </div>
                  <div>
                    <span>Requested</span>
                    <strong>{{ formatDate(approval.requestedAt) }}</strong>
                  </div>
                  <FlightsFlightStatusChip :status="approval.status" />
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-state-machine" />
                  <h2>Current Status</h2>
                </div>
                <div class="detail-stack">
                  <span>Current state</span>
                  <FlightsFlightStatusChip :status="flight.currentStatus" />
                  <span>Lifecycle phase</span>
                  <strong>{{ flight.commandCenter?.lifecycle.phaseLabel ?? '-' }}</strong>
                  <span>Next allowed action</span>
                  <strong>{{
                    flight.commandCenter?.nextRequiredActions[0]?.title ?? 'No forward action'
                  }}</strong>
                  <span>Responsible owner</span>
                  <strong>{{
                    flight.commandCenter?.nextRequiredActions[0]?.ownerRoleCodes.join(', ') ?? '-'
                  }}</strong>
                  <span>Blocking reason</span>
                  <strong>{{
                    flight.blockingReason ?? (blockingIssues[0]?.resultNote || 'None')
                  }}</strong>
                </div>
              </section>
              <VAlert type="info" variant="tonal">
                <strong>Separation of duties</strong>
                <div class="mt-2 text-sm">
                  The request creator cannot approve the same flight. Finance reviewers cannot
                  change flight actuals.
                </div>
              </VAlert>
              <section class="workspace-panel">
                <div class="panel-title">
                  <VIcon icon="mdi-form-select" />
                  <h2>Status Controls</h2>
                </div>
                <VBtn
                  v-for="action in validActions"
                  :key="action.action"
                  block
                  class="mb-2"
                  :color="action.color"
                  :disabled="action.disabled"
                  :prepend-icon="action.icon"
                  :variant="action.color ? 'flat' : 'tonal'"
                  @click="runAction(action.action)"
                >
                  {{ action.label }}
                </VBtn>
              </section>
            </aside>
          </div>
        </VWindowItem>

        <VWindowItem value="records">
          <div class="records-grid">
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-account-multiple-outline" />
                <h2>Passenger Manifest</h2>
                <FlightsFlightStatusChip :status="passengerManifest?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Passenger count</dt>
                <dd>
                  {{ passengerManifest?.passengerCount ?? 0 }} /
                  {{ aircraft?.passengerCapacity ?? 0 }}
                </dd>
                <dt>Baggage</dt>
                <dd>{{ passengerManifest?.passengerWeightKg ?? 0 }} kg total weight</dd>
                <dt>Check-in</dt>
                <dd>{{ flight.currentStatus === 'CHECK_IN_OPEN' ? 'Open' : 'Not opened' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                :to="`/flights/${flight.id}/manifest`"
                variant="text"
              >
                Open Passenger Manifest
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-package-variant-closed" />
                <h2>Cargo Manifest</h2>
                <FlightsFlightStatusChip :status="cargoManifest?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Total cargo</dt>
                <dd>
                  {{ cargoManifest?.cargoActualWeightKg ?? 0 }} /
                  {{ aircraft?.cargoCapacityKg ?? 0 }} kg
                </dd>
                <dt>AWB count</dt>
                <dd>{{ cargoManifest?.cargoCount ?? 0 }}</dd>
                <dt>Dangerous Goods</dt>
                <dd>{{ cargoManifest?.dgPendingCount ? 'Pending review' : 'No pending DG' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                :to="`/flights/${flight.id}/manifest`"
                variant="text"
              >
                Open Cargo Manifest
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-fuel" />
                <h2>Fuel Request</h2>
                <FlightsFlightStatusChip :status="fuel?.status ?? 'NOT_STARTED'" />
              </div>
              <dl>
                <dt>Supplier</dt>
                <dd>{{ fuel?.supplierName ?? '-' }}</dd>
                <dt>Requested</dt>
                <dd>{{ fuel?.requestedQuantityLitre ?? 0 }} L</dd>
                <dt>Approved</dt>
                <dd>{{ fuel?.approvedQuantityLitre ?? 'Pending' }}</dd>
                <dt>Estimated cost</dt>
                <dd>{{ money(fuel?.totalCost ?? null) }}</dd>
                <dt>Required block fuel</dt>
                <dd>{{ litre(fuelPlanning?.requiredBlockFuelLitre) }}</dd>
                <dt>Fuel margin</dt>
                <dd>{{ litre(fuelPlanning?.operationalMarginLitre) }}</dd>
              </dl>
              <VBtn append-icon="mdi-open-in-new" size="small" to="/flights/fuel" variant="text">
                Open Fuel Request
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-airport" />
                <h2>Station Handling</h2>
              </div>
              <div v-for="service in flight.stationServices" :key="service.id" class="service-line">
                <span>{{ service.stationCode }} · {{ service.serviceType }}</span>
                <FlightsFlightStatusChip :status="service.status" />
              </div>
              <dl>
                <dt>Estimated station cost</dt>
                <dd>{{ money(stationEstimate) }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                :to="`/flights/station-operations/${flight.id}`"
                variant="text"
              >
                Open Station Handling
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-airplane-clock" />
                <h2>Flight Actual</h2>
              </div>
              <dl>
                <dt>Actual departure</dt>
                <dd>{{ formatDate(flight.actualDepartureAt) }}</dd>
                <dt>Actual arrival</dt>
                <dd>{{ formatDate(flight.actualArrivalAt) }}</dd>
                <dt>Status</dt>
                <dd>{{ flight.actualArrivalAt ? 'Recorded' : 'Not started' }}</dd>
              </dl>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/station-operations/actual-closure"
                variant="text"
              >
                Record Flight Actual
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-lock-check-outline" />
                <h2>Closure Summary</h2>
                <FlightsFlightStatusChip
                  :status="flight.currentStatus === 'CLOSED' ? 'CLOSED' : 'NOT_STARTED'"
                />
              </div>
              <div v-for="item in closureItems" :key="item.label" class="closure-line">
                <VIcon
                  :color="item.done ? 'success' : 'warning'"
                  :icon="item.done ? 'mdi-check-circle' : 'mdi-clock-outline'"
                />
                <span>{{ item.label }}</span>
              </div>
              <VBtn
                append-icon="mdi-open-in-new"
                size="small"
                to="/flights/station-operations/actual-closure"
                variant="text"
              >
                Start Flight Closure
              </VBtn>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-calculator-variant-outline" />
                <h2>Financial Impact</h2>
              </div>
              <dl>
                <dt>Fuel operational record</dt>
                <dd>{{ money(fuelCost) }}</dd>
                <dt>Station · Operational Estimate</dt>
                <dd>{{ money(stationEstimate) }}</dd>
                <dt>Station · Finance Submitted</dt>
                <dd>{{ money(stationSubmitted) }}</dd>
                <dt>Station · Finance Approved</dt>
                <dd>{{ money(stationApproved) }}</dd>
                <dt>Station · Posted Ledger</dt>
                <dd class="font-weight-bold">{{ money(stationPosted) }}</dd>
                <dt>Unresolved Station Costs</dt>
                <dd>{{ unresolvedStationCosts }}</dd>
                <dt>Handling (estimate / approved / posted)</dt>
                <dd>
                  {{ money(stationCostBreakdown.handling.estimate) }} /
                  {{ money(stationCostBreakdown.handling.approved) }} /
                  {{ money(stationCostBreakdown.handling.posted) }}
                </dd>
                <dt>Parking (estimate / approved / posted)</dt>
                <dd>
                  {{ money(stationCostBreakdown.parking.estimate) }} /
                  {{ money(stationCostBreakdown.parking.approved) }} /
                  {{ money(stationCostBreakdown.parking.posted) }}
                </dd>
                <dt>Maintenance coordination record</dt>
                <dd>{{ money(maintenanceCost) }}</dd>
                <dt>Operational Estimate Total</dt>
                <dd>{{ money(operationalEstimate) }}</dd>
              </dl>
              <div class="d-flex flex-wrap ga-2 mt-3">
                <VBtn size="small" to="/flights/station-operations/costs" variant="tonal">
                  Review Station Cost
                </VBtn>
                <VBtn size="small" to="/finance/accounting?tab=posting-queue" variant="text">
                  Open Accounting Workbench
                </VBtn>
              </div>
            </section>
            <section class="record-panel">
              <div class="record-head">
                <VIcon icon="mdi-file-document-outline" />
                <h2>Billing & Invoice</h2>
                <VSpacer />
                <VBtn
                  v-if="canEditCommercialDetails"
                  size="small"
                  variant="tonal"
                  @click="openCommercialDetails"
                >
                  Edit commercial details
                </VBtn>
                <FlightsFlightStatusChip
                  :status="flight.currentStatus === 'CLOSED' ? 'READY' : 'NOT_YET_BILLABLE'"
                />
              </div>
              <dl>
                <dt>Customer</dt>
                <dd>{{ flight.customerName }}</dd>
                <dt>Estimated revenue</dt>
                <dd>{{ money(flight.estimatedRevenue) }}</dd>
                <dt>Estimated margin</dt>
                <dd>{{ money(estimatedMargin) }}</dd>
                <dt>Invoice</dt>
                <dd>{{ flight.currentStatus === 'CLOSED' ? 'Ready for draft' : '-' }}</dd>
              </dl>
            </section>
            <section class="record-panel xl:col-span-2">
              <div class="record-head">
                <VIcon icon="mdi-paperclip" />
                <h2>Attachments</h2>
              </div>
              <div class="attachment-grid">
                <div v-for="item in flight.attachments" :key="item.id">
                  <VIcon icon="mdi-file-document-outline" />
                  <span>
                    <strong>{{ item.fileName }}</strong>
                    <small>{{ item.documentType.replaceAll('_', ' ') }}</small>
                  </span>
                  <FlightsFlightStatusChip :status="item.status" />
                </div>
                <div v-if="flight.attachments.length === 0" class="empty-compact">
                  No legacy attachment recorded.
                </div>
              </div>
            </section>
            <section class="xl:col-span-2">
              <DocumentPanel owner-type="flight" :owner-id="flight.id" />
            </section>
          </div>
        </VWindowItem>

        <VWindowItem value="history">
          <section class="workspace-panel">
            <div class="panel-title">
              <VIcon icon="mdi-history" />
              <h2>Operational Audit Trail</h2>
              <VSpacer />
              <VBtnToggle
                v-model="historyFilter"
                color="secondary"
                density="compact"
                mandatory
                variant="outlined"
              >
                <VBtn value="ALL">All</VBtn>
                <VBtn value="STATUS">Status</VBtn>
                <VBtn value="READINESS">Readiness</VBtn>
                <VBtn value="APPROVAL">Approval</VBtn>
              </VBtnToggle>
            </div>
            <VTable density="comfortable" hover>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor / Role</th>
                  <th>Domain</th>
                  <th>Action</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason / Evidence</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="flight.operationalAudit.length === 0">
                  <td colspan="7" class="py-6 text-center text-text-secondary">
                    No cross-domain operational event recorded.
                  </td>
                </tr>
                <tr v-for="item in flight.operationalAudit" v-else :key="item.id">
                  <td>{{ formatDate(item.timestamp) }}</td>
                  <td>
                    <strong>{{ item.actorRole }}</strong>
                    <div class="text-caption text-text-secondary">{{ item.actorUserId }}</div>
                  </td>
                  <td>{{ item.module.replaceAll('_', ' ') }}</td>
                  <td>{{ item.action.replaceAll('_', ' ') }}</td>
                  <td>{{ item.beforeStatus?.replaceAll('_', ' ') ?? '-' }}</td>
                  <td>{{ item.afterStatus?.replaceAll('_', ' ') ?? '-' }}</td>
                  <td>{{ item.reason ?? '-' }}</td>
                </tr>
              </tbody>
            </VTable>
            <VDivider class="my-4" />
            <div class="mb-2 text-caption font-weight-bold text-text-secondary">
              FLIGHT ORDER LIFECYCLE HISTORY
            </div>
            <VTable density="comfortable" hover>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User / Role</th>
                  <th>Activity</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredHistory" :key="item.id">
                  <td>{{ formatDate(item.changedAt) }}</td>
                  <td>{{ historyActor(item) }}</td>
                  <td>{{ item.actionType.replaceAll('_', ' ') }}</td>
                  <td>{{ item.fromStatus?.replaceAll('_', ' ') ?? 'None' }}</td>
                  <td><FlightsFlightStatusChip :status="item.toStatus" /></td>
                  <td>{{ item.reasonNote ?? item.reasonLabel ?? '-' }}</td>
                </tr>
              </tbody>
            </VTable>
          </section>
        </VWindowItem>
      </VWindow>

      <VNavigationDrawer v-model="issueDrawer" location="right" temporary width="430">
        <div v-if="selectedIssue" class="pa-5">
          <div class="mb-5 flex items-start gap-3">
            <VIcon
              :color="statusColor(selectedIssue.status)"
              icon="mdi-alert-circle-outline"
              size="30"
            />
            <div>
              <div class="text-xs text-text-secondary">{{ selectedIssue.category }}</div>
              <h2 class="text-h6">{{ selectedIssue.checkName }}</h2>
            </div>
            <VSpacer />
            <VTooltip text="Close issue details">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  aria-label="Close issue drawer"
                  icon="mdi-close"
                  variant="text"
                  @click="issueDrawer = false"
                />
              </template>
            </VTooltip>
          </div>
          <VAlert :type="selectedIssue.status === 'FAIL' ? 'error' : 'warning'" variant="tonal">
            {{ selectedIssue.resultNote }}
          </VAlert>
          <div class="detail-stack mt-5">
            <span>Classification</span>
            <strong>{{ selectedIssue.classification.replaceAll('_', ' ') }}</strong>
            <span>System calculation</span>
            <strong>{{ selectedIssue.calculationStatus.replaceAll('_', ' ') }}</strong>
            <span>Human verification</span>
            <strong>{{ selectedIssue.verificationStatus.replaceAll('_', ' ') }}</strong>
            <span>Effective status</span>
            <strong>{{ selectedIssue.effectiveStatus.replaceAll('_', ' ') }}</strong>
            <span>Affected data</span>
            <strong>{{ selectedIssue.sourceReference ?? '-' }}</strong>
            <span>Source records</span>
            <strong>{{ selectedIssue.sourceRecordIds.join(', ') || '-' }}</strong>
            <span>Last calculated</span>
            <strong>{{ formatDate(selectedIssue.calculatedAt) }}</strong>
            <template v-if="selectedIssue.invalidationReason">
              <span>Invalidation</span>
              <strong class="text-error">{{ selectedIssue.invalidationReason }}</strong>
            </template>
            <span>Owner role</span>
            <strong>{{ selectedIssue.ownerRole }}</strong>
            <span>Recommended action</span>
            <strong>{{ selectedIssue.recommendedAction }}</strong>
          </div>
          <VBtn
            v-if="selectedIssue.checkCode === 'FINANCE_INITIALIZED' && canEditCommercialDetails"
            block
            class="mt-6"
            color="secondary"
            @click="openCommercialDetails"
          >
            Edit commercial details
          </VBtn>
          <VBtn
            v-if="selectedIssue.checkCode === 'AIRCRAFT_LOCATION' && canEditCommercialDetails"
            block
            class="mt-6"
            color="secondary"
            @click="openAircraftAssignment"
          >
            Open aircraft assignment
          </VBtn>
          <VBtn
            v-if="selectedIssue.actionHref"
            block
            :class="selectedIssue.checkCode === 'FINANCE_INITIALIZED' ? 'mt-2' : 'mt-6'"
            color="secondary"
            :to="selectedIssue.actionHref"
          >
            Open affected module
          </VBtn>
        </div>
      </VNavigationDrawer>

      <VDialog v-model="commercialDialog" max-width="560">
        <VCard>
          <VCardTitle>Commercial details</VCardTitle>
          <VCardText>
            <VAlert v-if="commercialError" class="mb-4" color="error" variant="tonal">
              {{ commercialError }}
            </VAlert>
            <p class="mb-4 text-body-2 text-medium-emphasis">
              Commercial flights require a billing customer and revenue estimate before readiness
              can pass. Non-revenue direct flights can use the appropriate non-revenue billing type.
            </p>
            <CustomerSelect v-model="commercialForm.customerId" label="Billing customer" />
            <VSelect
              v-model="commercialForm.billingType"
              class="mt-4"
              :items="billingTypeOptions"
              label="Billing type"
              variant="outlined"
            />
            <VTextField
              v-model.number="commercialForm.estimatedRevenue"
              class="mt-4"
              label="Estimated revenue (IDR)"
              min="0"
              type="number"
              variant="outlined"
            />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="commercialDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="commercialSaving" @click="saveCommercialDetails">
              Save commercial details
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="aircraftDialog" max-width="560">
        <VCard>
          <VCardTitle>Change aircraft assignment</VCardTitle>
          <VCardText>
            <VAlert v-if="aircraftError" class="mb-4" color="error" variant="tonal">
              {{ aircraftError }}
            </VAlert>
            <VSelect
              v-model="selectedAircraftId"
              :items="aircraftOptions"
              item-title="registrationNumber"
              item-value="id"
              label="Aircraft"
              variant="outlined"
            />
            <p class="mt-3 text-body-2 text-medium-emphasis">
              Readiness will verify that the selected aircraft is currently at the departure
              station.
            </p>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="aircraftDialog = false">Cancel</VBtn>
            <VBtn
              color="primary"
              :disabled="!selectedAircraftId"
              :loading="aircraftSaving"
              @click="saveAircraftAssignment"
            >
              Save assignment
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="routeDialog" max-width="600">
        <VCard>
          <VCardTitle>Change flight destination</VCardTitle>
          <VCardText>
            <VAlert v-if="routeError" class="mb-4" color="error" variant="tonal">
              {{ routeError }}
            </VAlert>
            <VSelect
              v-model="selectedRouteId"
              :items="destinationRouteOptions"
              item-title="routeCode"
              item-value="id"
              label="New route and destination"
              variant="outlined"
            >
              <template #item="{ props: itemProps, item }">
                <VListItem
                  v-bind="itemProps"
                  :subtitle="`${item.raw.originStationCode} → ${item.raw.destinationStationCode}`"
                />
              </template>
            </VSelect>
            <VSelect
              v-model="selectedDestinationSupplierId"
              class="mt-3"
              :disabled="!selectedRouteId"
              :items="destinationSupplierOptions"
              item-title="supplierName"
              item-value="id"
              label="Destination handling supplier"
              no-data-text="No active handling supplier serves this destination"
              variant="outlined"
            />
            <VAlert class="mt-3" icon="mdi-information-outline" type="info" variant="tonal">
              Origin records are preserved. Destination preparation, related service/cost drafts,
              and affected approvals are selectively invalidated after confirmation.
            </VAlert>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="routeDialog = false">Cancel</VBtn>
            <VBtn
              color="primary"
              :disabled="!selectedRouteId || !selectedDestinationSupplierId"
              :loading="routeSaving"
              @click="saveRouteAssignment"
            >
              Preview impact
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <ActualTimeDialog
        v-if="flight"
        v-model="actualTimeDialog"
        :action="actualTimeAction"
        :flight-number="flight.flightNumber"
        :loading="actionLoading"
        :station-code="
          actualTimeAction === 'depart' ? flight.originStationCode : flight.destinationStationCode
        "
        :station-id="
          actualTimeAction === 'depart' ? flight.originStationId : flight.destinationStationId
        "
        @submit="submitActualTime"
      />

      <VDialog v-model="impactDialog" max-width="620">
        <VCard>
          <VCardTitle>
            {{ impactMode === 'ROUTE' ? 'Destination change impact' : 'Aircraft change impact' }}
          </VCardTitle>
          <VCardText>
            <VAlert class="mb-4" type="warning" variant="tonal">
              This change moves the flight to
              <strong>{{ impactPreview?.resultingStatus.replaceAll('_', ' ') }}</strong> and
              requires the affected checks to be completed again.
            </VAlert>
            <VList density="compact" lines="two">
              <VListItem
                v-for="item in impactPreview?.invalidatedItems ?? []"
                :key="item.code"
                prepend-icon="mdi-alert-circle-outline"
                :subtitle="item.reason"
                :title="item.label"
              />
              <VListItem
                v-for="approval in impactPreview?.invalidatedApprovals ?? []"
                :key="approval.checkpoint"
                prepend-icon="mdi-shield-alert-outline"
                :subtitle="approval.reason"
                :title="approval.checkpoint.replaceAll('_', ' ')"
              />
            </VList>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="impactDialog = false">
              {{ impactMode === 'ROUTE' ? 'Keep current destination' : 'Keep current aircraft' }}
            </VBtn>
            <VBtn
              color="warning"
              :loading="impactMode === 'ROUTE' ? routeSaving : aircraftSaving"
              @click="confirmImpactChange"
            >
              {{
                impactMode === 'ROUTE' ? 'Confirm destination change' : 'Confirm aircraft change'
              }}
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="reasonDialog" max-width="540">
        <VCard>
          <VCardTitle class="text-capitalize">
            {{ reasonAction.replace('-', ' ') }} flight
          </VCardTitle>
          <VCardText>
            <VAlert class="mb-4" type="warning" variant="tonal">
              This action is recorded in the flight audit trail.
            </VAlert>
            <FlightReasonSelect v-model="reasonId" :allow-create="true" label="Reason" />
            <StationSelect
              v-if="reasonAction === 'divert'"
              v-model="diversionStationId"
              :allow-create="true"
              label="New destination"
            />
            <VSelect
              v-if="reasonAction === 'reopen'"
              v-model="correctionScope"
              :items="[
                { title: 'Planning / readiness records', value: 'PLANNING' },
                { title: 'Departure records', value: 'DEPARTURE' },
                { title: 'Arrival records', value: 'ARRIVAL' },
                { title: 'Closure records', value: 'CLOSURE' }
              ]"
              label="Correction scope"
              persistent-hint
              hint="The scope determines which records and approvals must be checked again."
              variant="outlined"
            />
            <VTextarea v-model="reasonNote" label="Operational note" rows="3" variant="outlined" />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="reasonDialog = false">Back</VBtn>
            <VBtn
              color="error"
              :disabled="!reasonId || (reasonAction === 'reopen' && !correctionScope)"
              :loading="actionLoading"
              @click="submitReasonAction"
            >
              Confirm action
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
      <VDialog v-model="approvalDialog" max-width="560">
        <VCard>
          <VCardTitle>
            {{
              approvalAction === 'accept-readiness'
                ? 'OCC Readiness Acceptance'
                : 'Director Approval'
            }}
          </VCardTitle>
          <VCardText>
            <VAlert class="mb-4" type="info" variant="tonal">
              Revision {{ flight?.readinessRevision }} will be signed as an immutable readiness
              snapshot. A critical source change will require approval again.
            </VAlert>
            <VTextarea
              v-model="approvalNote"
              autofocus
              label="Decision note"
              persistent-hint
              hint="Required for the operational audit trail."
              rows="3"
              variant="outlined"
            />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="approvalDialog = false">Cancel</VBtn>
            <VBtn
              color="success"
              :disabled="approvalNote.trim().length < 3"
              :loading="actionLoading"
              prepend-icon="mdi-check-decagram-outline"
              @click="confirmApproval"
            >
              Confirm decision
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
      <VSnackbar
        :model-value="Boolean(actionSuccess)"
        color="success"
        location="top end"
        timeout="3000"
        @update:model-value="handleActionSuccessVisibility"
      >
        {{ actionSuccess }}
      </VSnackbar>
    </template>
  </VContainer>
</template>

<style scoped>
.flight-workspace {
  max-width: 1680px;
}
.flight-summary {
  position: sticky;
  top: 64px;
  z-index: 8;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgb(15 23 42 / 7%);
}
.workspace-tabs {
  position: sticky;
  top: 202px;
  z-index: 7;
}
.summary-field {
  display: flex;
  min-width: 120px;
  flex-direction: column;
  gap: 1px;
}
.summary-field span,
.detail-grid span,
.detail-stack > span,
.readiness-summary span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
  text-transform: uppercase;
}
.summary-field strong {
  font-size: 13px;
}
.summary-field small {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.status-strip {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  border-left: 3px solid rgb(var(--v-theme-secondary));
  background: rgb(var(--v-theme-background));
  padding: 6px 10px;
  font-size: 11px;
}
.status-strip strong {
  font-size: 11px;
}
.workspace-panel,
.record-panel {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  padding: 16px;
}
.panel-title,
.record-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}
.panel-title h2,
.record-head h2 {
  font-size: 14px;
  font-weight: 700;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 22px;
}
.detail-grid > div,
.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-grid strong {
  font-size: 13px;
}
.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.snapshot-grid > div {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 2px 8px;
  min-height: 76px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  padding: 12px;
}
.snapshot-grid span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.snapshot-grid strong {
  grid-column: 2;
  font-size: 14px;
}
.fuel-advisory {
  display: grid;
  gap: 16px;
}
.fuel-advisory__summary,
.fuel-advisory__components {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.fuel-advisory__summary > div,
.fuel-advisory__component {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  padding: 12px;
}
.fuel-advisory span,
.fuel-advisory__meta {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.fuel-advisory strong {
  display: block;
  font-size: 14px;
}
.fuel-advisory__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.alert-row,
.check-row {
  display: grid;
  width: 100%;
  align-items: center;
  border-top: 1px solid rgb(var(--v-theme-border));
  text-align: left;
}
.alert-row {
  grid-template-columns: 24px 1fr 20px;
  gap: 8px;
  padding: 11px 2px;
}
.check-row {
  grid-template-columns: 28px 1fr auto 20px;
  gap: 8px;
  padding: 10px 2px;
}
.alert-row span,
.check-row span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.alert-row strong,
.check-row strong {
  font-size: 12px;
}
.alert-row small,
.check-row small {
  overflow: hidden;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 84px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
}
.lifecycle-mini {
  display: flex;
  flex-direction: column;
}
.lifecycle-mini > div {
  display: grid;
  grid-template-columns: 18px 1fr;
  min-height: 27px;
  color: rgb(var(--v-theme-text-secondary));
}
.lifecycle-mini > div span {
  width: 9px;
  height: 9px;
  margin-top: 3px;
  border: 2px solid rgb(var(--v-theme-border));
  border-radius: 50%;
}
.lifecycle-mini > div:not(:last-child) span::after {
  display: block;
  width: 1px;
  height: 20px;
  margin: 7px 0 0 2px;
  background: rgb(var(--v-theme-border));
  content: '';
}
.lifecycle-mini .complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
}
.lifecycle-mini .active {
  color: rgb(var(--v-theme-secondary));
  font-weight: 700;
}
.lifecycle-mini .active span {
  border-color: rgb(var(--v-theme-secondary));
}
.readiness-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  padding: 14px 16px;
}
.readiness-summary > div {
  display: flex;
  min-width: 100px;
  flex-direction: column;
}
.readiness-summary strong {
  font-size: 18px;
}
.command-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: stretch;
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 6px;
  background: rgb(var(--v-theme-border));
}
.command-strip > div {
  display: flex;
  min-height: 88px;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  background: rgb(var(--v-theme-surface));
  padding: 12px 14px;
}
.command-strip > div > span,
.command-strip small,
.blocker-row small {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.command-strip strong {
  font-size: 14px;
  line-height: 1.3;
}
.command-strip > .v-btn {
  align-self: center;
  margin: 12px;
}
.blocker-list {
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-warning));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
}
.blocker-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
}
.blocker-row + .blocker-row {
  border-top: 1px solid rgb(var(--v-theme-border));
}
.blocker-row > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}
.blocker-row strong {
  font-size: 12px;
}
.assignment-hero {
  display: grid;
  grid-template-columns: 120px repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 18px;
}
.assignment-hero > div {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.assignment-hero .registration {
  color: rgb(var(--v-theme-brand-primary));
  font-size: 24px;
  font-weight: 800;
}
.conflict-item {
  border-left: 3px solid rgb(var(--v-theme-warning));
  padding: 10px 12px;
  background: rgb(var(--v-theme-background));
}
.conflict-item strong,
.conflict-item small {
  display: block;
  margin-top: 6px;
}
.conflict-item p {
  margin-top: 4px;
  font-size: 12px;
}
.lifecycle-full {
  display: grid;
  grid-template-columns: repeat(9, minmax(70px, 1fr));
  overflow-x: auto;
}
.lifecycle-full > div {
  position: relative;
  display: flex;
  min-width: 100px;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: rgb(var(--v-theme-text-secondary));
  text-align: center;
}
.lifecycle-full > div::before {
  position: absolute;
  top: 14px;
  right: 50%;
  left: -50%;
  height: 2px;
  background: rgb(var(--v-theme-border));
  content: '';
}
.lifecycle-full > div:first-child::before {
  display: none;
}
.lifecycle-full span {
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 2px solid rgb(var(--v-theme-border));
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  font-size: 11px;
}
.lifecycle-full strong {
  font-size: 10px;
}
.lifecycle-full .complete span {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
  color: white;
}
.lifecycle-full .active span {
  border-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-secondary));
}
.approval-row {
  display: grid;
  grid-template-columns: 30px minmax(220px, 1fr) minmax(150px, 0.5fr) auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 12px 0;
}
.approval-index {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-background));
  font-size: 11px;
}
.approval-row > div {
  display: flex;
  flex-direction: column;
}
.approval-row small,
.approval-row div > span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 11px;
}
.records-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.record-head {
  min-height: 28px;
}
.record-head h2 {
  flex: 1;
}
.record-panel dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px 12px;
  margin-bottom: 8px;
  font-size: 12px;
}
.record-panel dt {
  color: rgb(var(--v-theme-text-secondary));
}
.record-panel dd {
  text-align: right;
}
.service-line,
.closure-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 8px 0;
  font-size: 12px;
}
.closure-line {
  justify-content: flex-start;
}
.attachment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}
.attachment-grid > div {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgb(var(--v-theme-border));
  padding: 9px 0;
}
.attachment-grid span {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.attachment-grid small {
  color: rgb(var(--v-theme-text-secondary));
}
@media (max-width: 1200px) {
  .command-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .command-strip > .v-btn {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .snapshot-grid,
  .records-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .assignment-hero {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .workspace-tabs {
    top: 250px;
  }
}
@media (max-width: 700px) {
  .flight-summary {
    position: static;
  }
  .workspace-tabs {
    position: static;
  }
  .detail-grid,
  .snapshot-grid,
  .records-grid,
  .attachment-grid {
    grid-template-columns: 1fr;
  }
  .assignment-hero {
    grid-template-columns: 1fr 1fr;
  }
  .approval-row {
    grid-template-columns: 30px 1fr auto;
  }
  .approval-row > div:nth-child(3) {
    display: none;
  }
}
</style>
