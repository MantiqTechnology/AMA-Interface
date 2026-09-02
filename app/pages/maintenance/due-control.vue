<script setup lang="ts">
import type { MaintenanceDueStatusDto } from '#shared/features/maintenance';

type DueBasis =
  | 'FH'
  | 'FC'
  | 'CALENDAR'
  | 'FH_AND_CALENDAR'
  | 'FC_AND_CALENDAR'
  | 'FH_AND_FC'
  | 'FH_FC_AND_CALENDAR';

type DueStatus =
  'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'FORECAST' | 'NOT_YET_DUE' | 'CALCULATION_BLOCKED';

type PlanningStatus =
  'UNPLANNED' | 'WORK_PACKAGE_DRAFT' | 'COMMITTED' | 'SCHEDULED' | 'IN_EXECUTION' | 'COMPLETED';

type DataStatus =
  | 'CURRENT'
  | 'AGING'
  | 'STALE'
  | 'CONFLICT'
  | 'UTILIZATION_MISSING'
  | 'APPLICABILITY_UNRESOLVED'
  | 'CALCULATION_FAILED';

type HorizonFilter = 'OVERDUE' | '0_7' | '8_30' | '31_60' | '61_90' | 'BEYOND_90';
type SummaryFilter =
  'OVERDUE_MANDATORY' | 'DUE_30' | 'UNPLANNED' | 'RESOURCE_BLOCKED' | 'AIRCRAFT_AFFECTED';
type ActionCode =
  | 'PLAN_IMMEDIATELY'
  | 'PLAN_REQUIREMENT'
  | 'CONTINUE_PLANNING'
  | 'OPEN_WORK_PACKAGE'
  | 'REFRESH_UTILIZATION'
  | 'REVIEW_APPLICABILITY'
  | 'RESOLVE_CALCULATION';

type MaintenanceDueRequirement = {
  id: string;
  aircraftId: string;
  aircraftRegistration: string;
  aircraftModel: string;
  aircraftThumbnail: string | null;
  requirementId: string;
  title: string;
  mandatory: boolean;
  maintenanceProgram: {
    id: string;
    name: string;
    revision: string;
  };
  sources: {
    mpdReference: string;
    ammReference: string;
  };
  applicability: {
    status: 'APPLICABLE' | 'CONDITIONAL' | 'UNRESOLVED';
    configurationVerified: boolean;
  };
  interval: {
    basis: DueBasis;
    repeatFH: number | null;
    repeatFC: number | null;
    repeatDays: number | null;
    toleranceAllowed: boolean;
  };
  lastAccomplishment: {
    flightHours: number | null;
    flightCycles: number | null;
    accomplishedAt: string;
  };
  nextDue: {
    flightHours: number | null;
    flightCycles: number | null;
    dueAt: string | null;
  };
  current: {
    flightHours: number | null;
    flightCycles: number | null;
    effectiveAt: string;
  };
  remaining: {
    flightHours: number | null;
    flightCycles: number | null;
    days: number | null;
  };
  dueStatus: DueStatus;
  planningStatus: PlanningStatus;
  dataStatus: DataStatus;
  dataStatusDetail: string;
  planningExposure: boolean;
  resourceBlocked: boolean;
  fleetAffected: boolean;
  forecast: {
    forecastAt: string | null;
    averageFHPerDay: number | null;
    source: string;
  };
  owner: {
    id: string;
    name: string;
  } | null;
  relatedWorkPackage: {
    id: string;
    number: string;
    status: string;
  } | null;
  station: {
    id: string;
    code: string;
    name: string;
  };
  action: ActionCode;
  lastEvaluatedAt: string;
  recentActivity: string[];
};

const route = useRoute();
const router = useRouter();
const { resolveAircraftImageUrl } = useAircraftImageUrl();

const aircraftFilter = ref<string>((route.query.aircraft as string) || '');
const dueStatusFilter = ref<string>((route.query.dueStatus as string) || '');
const planningStatusFilter = ref<string>((route.query.planningStatus as string) || '');
const dueBasisFilter = ref<string>((route.query.dueBasis as string) || '');
const maintenanceProgramFilter = ref<string>((route.query.maintenanceProgram as string) || '');
const plannerFilter = ref<string>((route.query.planner as string) || '');
const stationFilter = ref<string>((route.query.station as string) || '');
const searchQuery = ref<string>((route.query.search as string) || '');
const summaryFilter = ref<SummaryFilter | null>((route.query.summary as SummaryFilter) || null);
const planningHorizon = ref<HorizonFilter>((route.query.horizon as HorizonFilter) || 'OVERDUE');
const selectedRequirementId = ref<string>(
  (route.query.requirement as string) || 'MROV2-C208-CTRL-001'
);
const selectedDue = ref<MaintenanceDueStatusDto | null>(null);
const createLoading = ref(false);
const createError = ref('');
const planningNote = ref('');
const assignDialog = ref(false);
const plannerSelection = ref('planner-wonda');
const localNotice = ref('');

const { data, pending, error, refresh } = await useAsyncData('maintenance-due-control', () =>
  fetchApi<MaintenanceDueStatusDto[]>('/api/maintenance/due-control')
);

const requirements = ref<MaintenanceDueRequirement[]>([
  {
    id: 'due-pk-amb-100fh',
    aircraftId: 'ac-pk-amb',
    aircraftRegistration: 'PK-AMB',
    aircraftModel: 'C208B',
    aircraftThumbnail: null,
    requirementId: 'M5-100FH',
    title: '100 FH Inspection',
    mandatory: true,
    maintenanceProgram: { id: 'aamp-c208b', name: 'AAMP C208B', revision: 'Revision 08' },
    sources: { mpdReference: 'MPD Task 05-10-01', ammReference: '05-20-00' },
    applicability: { status: 'APPLICABLE', configurationVerified: true },
    interval: {
      basis: 'FH',
      repeatFH: 100,
      repeatFC: null,
      repeatDays: null,
      toleranceAllowed: false
    },
    lastAccomplishment: { flightHours: 1200, flightCycles: null, accomplishedAt: '2026-07-21' },
    nextDue: { flightHours: 1300, flightCycles: null, dueAt: null },
    current: { flightHours: 1301, flightCycles: null, effectiveAt: '2026-08-30T09:00:00+09:00' },
    remaining: { flightHours: -1, flightCycles: null, days: null },
    dueStatus: 'OVERDUE',
    planningStatus: 'WORK_PACKAGE_DRAFT',
    dataStatus: 'CURRENT',
    dataStatusDetail: 'Updated 09:00 WIT',
    planningExposure: true,
    resourceBlocked: false,
    fleetAffected: false,
    forecast: { forecastAt: null, averageFHPerDay: 5.5, source: 'Current utilization snapshot' },
    owner: { id: 'planner-wonda', name: 'R. Wonda' },
    relatedWorkPackage: { id: 'mwp-mrov1-active', number: 'WP-MROV2-014', status: 'DRAFT' },
    station: { id: 'wmx', code: 'WME', name: 'Wamena Station' },
    action: 'CONTINUE_PLANNING',
    lastEvaluatedAt: '2026-08-30T09:00:00+09:00',
    recentActivity: ['Draft package opened', 'Due calculation refreshed', 'Planner assigned']
  },
  {
    id: 'due-pk-amc-source-blocked',
    aircraftId: 'ac-pk-amc',
    aircraftRegistration: 'PK-AMC',
    aircraftModel: 'C208B',
    aircraftThumbnail: null,
    requirementId: 'MROV2-PAC-DUE-002',
    title: 'Mandatory source-blocked sample',
    mandatory: true,
    maintenanceProgram: { id: 'aamp-c208b', name: 'AAMP C208B', revision: 'Revision 08' },
    sources: { mpdReference: 'MPD Task 05-20-03', ammReference: 'Source review required' },
    applicability: { status: 'APPLICABLE', configurationVerified: true },
    interval: {
      basis: 'CALENDAR',
      repeatFH: null,
      repeatFC: null,
      repeatDays: 90,
      toleranceAllowed: false
    },
    lastAccomplishment: { flightHours: null, flightCycles: null, accomplishedAt: '2026-05-30' },
    nextDue: { flightHours: null, flightCycles: null, dueAt: '2026-08-28' },
    current: { flightHours: null, flightCycles: null, effectiveAt: '2026-08-30T09:00:00+09:00' },
    remaining: { flightHours: null, flightCycles: null, days: -2 },
    dueStatus: 'OVERDUE',
    planningStatus: 'UNPLANNED',
    dataStatus: 'STALE',
    dataStatusDetail: 'Utilization refresh needed',
    planningExposure: true,
    resourceBlocked: true,
    fleetAffected: true,
    forecast: { forecastAt: null, averageFHPerDay: null, source: 'Forecast unavailable' },
    owner: null,
    relatedWorkPackage: null,
    station: { id: 'wmx', code: 'WME', name: 'Wamena Station' },
    action: 'REFRESH_UTILIZATION',
    lastEvaluatedAt: '2026-08-30T09:00:00+09:00',
    recentActivity: [
      'Utilization refresh needed',
      'No planning package linked',
      'Source review pending'
    ]
  },
  {
    id: 'due-pk-mra-control-100fh',
    aircraftId: 'ac-pk-mra',
    aircraftRegistration: 'PK-MRA',
    aircraftModel: 'C208B',
    aircraftThumbnail: null,
    requirementId: 'MROV2-C208-CTRL-001',
    title: 'Controlled 100 FH Inspection',
    mandatory: true,
    maintenanceProgram: { id: 'aamp-c208b', name: 'AAMP C208B', revision: 'Revision 08' },
    sources: { mpdReference: 'MPD Task 05-10-01', ammReference: '05-20-00' },
    applicability: { status: 'APPLICABLE', configurationVerified: true },
    interval: {
      basis: 'FH_AND_CALENDAR',
      repeatFH: 100,
      repeatFC: null,
      repeatDays: 30,
      toleranceAllowed: false
    },
    lastAccomplishment: { flightHours: 4010, flightCycles: null, accomplishedAt: '2026-07-30' },
    nextDue: { flightHours: 4110, flightCycles: null, dueAt: '2026-08-29' },
    current: { flightHours: 4120, flightCycles: null, effectiveAt: '2026-08-30T09:00:00+09:00' },
    remaining: { flightHours: -10, flightCycles: null, days: -1 },
    dueStatus: 'OVERDUE',
    planningStatus: 'UNPLANNED',
    dataStatus: 'CURRENT',
    dataStatusDetail: 'Updated 09:00 WIT',
    planningExposure: true,
    resourceBlocked: false,
    fleetAffected: true,
    forecast: { forecastAt: null, averageFHPerDay: 6.2, source: 'Avg utilization 6.2 FH/day' },
    owner: null,
    relatedWorkPackage: null,
    station: { id: 'wmx', code: 'WME', name: 'Wamena Station' },
    action: 'PLAN_REQUIREMENT',
    lastEvaluatedAt: '2026-08-30T09:00:00+09:00',
    recentActivity: [
      'Due calculation refreshed',
      'Owner not assigned',
      'No planning package linked'
    ]
  },
  {
    id: 'due-pk-mrb-forecast',
    aircraftId: 'ac-pk-mrb',
    aircraftRegistration: 'PK-MRB',
    aircraftModel: 'C208B',
    aircraftThumbnail: null,
    requirementId: 'MROV2-C208-FORECAST-003',
    title: 'Forecast inspection item',
    mandatory: true,
    maintenanceProgram: { id: 'aamp-c208b', name: 'AAMP C208B', revision: 'Revision 08' },
    sources: { mpdReference: 'MPD Task 05-30-02', ammReference: '05-20-00' },
    applicability: { status: 'APPLICABLE', configurationVerified: true },
    interval: {
      basis: 'FH_AND_CALENDAR',
      repeatFH: 100,
      repeatFC: null,
      repeatDays: 30,
      toleranceAllowed: false
    },
    lastAccomplishment: { flightHours: 4045, flightCycles: null, accomplishedAt: '2026-07-19' },
    nextDue: { flightHours: 4145, flightCycles: null, dueAt: '2026-09-17' },
    current: { flightHours: 4120, flightCycles: null, effectiveAt: '2026-08-30T09:00:00+09:00' },
    remaining: { flightHours: 25, flightCycles: null, days: 18 },
    dueStatus: 'DUE_SOON',
    planningStatus: 'COMMITTED',
    dataStatus: 'CURRENT',
    dataStatusDetail: 'Updated 09:00 WIT',
    planningExposure: true,
    resourceBlocked: false,
    fleetAffected: false,
    forecast: {
      forecastAt: '2026-09-17',
      averageFHPerDay: 5.8,
      source: 'Calendar plus FH forecast'
    },
    owner: { id: 'planner-tebai', name: 'D. Tebai' },
    relatedWorkPackage: {
      id: 'mwp-mrov1-release-ready',
      number: 'WP-MROV2-018',
      status: 'COMMITTED'
    },
    station: { id: 'wmx', code: 'WME', name: 'Wamena Station' },
    action: 'OPEN_WORK_PACKAGE',
    lastEvaluatedAt: '2026-08-30T09:00:00+09:00',
    recentActivity: ['Package committed', 'Forecast date refreshed', 'Planner confirmed station']
  }
]);

const plannerItems = [
  { title: 'R. Wonda', value: 'planner-wonda' },
  { title: 'D. Tebai', value: 'planner-tebai' },
  { title: 'M. Gobay', value: 'planner-gobay' }
];

const plannerNames = new Map(plannerItems.map((item) => [item.value, item.title]));

const backendDueByKey = computed(() => {
  const map = new Map<string, MaintenanceDueStatusDto>();
  for (const item of data.value ?? []) {
    map.set(`${item.aircraftRegistrationNumber}:${item.code}`, item);
  }
  return map;
});

const selectedRequirement = computed(() =>
  selectedRequirementId.value
    ? (requirements.value.find((item) => item.requirementId === selectedRequirementId.value) ??
      null)
    : null
);

const aircraftItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.aircraftRegistration))
);
const dueStatusItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.dueStatus))
);
const planningStatusItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.planningStatus))
);
const dueBasisItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.interval.basis))
);
const maintenanceProgramItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.maintenanceProgram.name))
);
const stationItems = computed(() =>
  uniqueItems(requirements.value.map((item) => item.station.code))
);

const filteredRequirements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return requirements.value.filter((item) => {
    if (summaryFilter.value && !matchesSummaryFilter(item, summaryFilter.value)) return false;
    if (planningHorizon.value && !matchesHorizon(item, planningHorizon.value)) return false;
    if (aircraftFilter.value && item.aircraftRegistration !== aircraftFilter.value) return false;
    if (dueStatusFilter.value && item.dueStatus !== dueStatusFilter.value) return false;
    if (planningStatusFilter.value && item.planningStatus !== planningStatusFilter.value)
      return false;
    if (dueBasisFilter.value && item.interval.basis !== dueBasisFilter.value) return false;
    if (
      maintenanceProgramFilter.value &&
      item.maintenanceProgram.name !== maintenanceProgramFilter.value
    ) {
      return false;
    }
    if (plannerFilter.value) {
      if (plannerFilter.value === 'UNASSIGNED' && item.owner) return false;
      if (plannerFilter.value !== 'UNASSIGNED' && item.owner?.id !== plannerFilter.value)
        return false;
    }
    if (stationFilter.value && item.station.code !== stationFilter.value) return false;
    if (!query) return true;
    return [
      item.aircraftRegistration,
      item.aircraftModel,
      item.requirementId,
      item.title,
      item.sources.mpdReference,
      item.sources.ammReference,
      item.relatedWorkPackage?.number,
      item.owner?.name
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
});

const summaryCards = computed(() => [
  {
    key: 'OVERDUE_MANDATORY' as const,
    label: 'Overdue Mandatory',
    value: requirements.value.filter((item) => item.mandatory && item.dueStatus === 'OVERDUE')
      .length,
    unit: 'Requirements',
    icon: 'mdi-alert-outline',
    tone: 'critical'
  },
  {
    key: 'DUE_30' as const,
    label: 'Due Within 30 Days',
    value: requirements.value.filter(
      (item) => (item.remaining.days ?? 999) >= 0 && (item.remaining.days ?? 999) <= 30
    ).length,
    unit: 'Requirements',
    icon: 'mdi-clock-outline',
    tone: 'warning'
  },
  {
    key: 'UNPLANNED' as const,
    label: 'Unplanned',
    value: requirements.value.filter((item) => item.planningExposure).length,
    unit: 'Requirements',
    icon: 'mdi-wrench-outline',
    tone: 'action'
  },
  {
    key: 'RESOURCE_BLOCKED' as const,
    label: 'Resource Blocked',
    value: requirements.value.filter((item) => item.resourceBlocked).length,
    unit: 'Requirements',
    icon: 'mdi-lock-alert-outline',
    tone: 'blocked'
  },
  {
    key: 'AIRCRAFT_AFFECTED' as const,
    label: 'Aircraft Affected',
    value: new Set(
      requirements.value
        .filter((item) => item.fleetAffected)
        .map((item) => item.aircraftRegistration)
    ).size,
    unit: 'Aircraft',
    icon: 'mdi-airplane',
    tone: 'info'
  }
]);

const highestPriorityRequirement = computed(
  () => [...requirements.value].sort(prioritySort)[0] ?? null
);
const overdueMandatoryCount = computed(
  () => requirements.value.filter((item) => item.mandatory && item.dueStatus === 'OVERDUE').length
);
const unplannedAircraftCount = computed(
  () =>
    new Set(
      requirements.value
        .filter((item) => item.planningStatus === 'UNPLANNED')
        .map((item) => item.aircraftRegistration)
    ).size
);
const activeFilterCount = computed(
  () =>
    [
      summaryFilter.value,
      aircraftFilter.value,
      dueStatusFilter.value,
      planningStatusFilter.value,
      dueBasisFilter.value,
      maintenanceProgramFilter.value,
      plannerFilter.value,
      stationFilter.value,
      searchQuery.value
    ].filter(Boolean).length
);

const planningDialog = computed({
  get: () => Boolean(selectedDue.value),
  set: (value: boolean) => {
    if (!value) selectedDue.value = null;
  }
});

watch(
  [
    aircraftFilter,
    dueStatusFilter,
    planningStatusFilter,
    dueBasisFilter,
    maintenanceProgramFilter,
    plannerFilter,
    stationFilter,
    searchQuery,
    summaryFilter,
    planningHorizon,
    selectedRequirementId
  ],
  () => {
    const query = {
      ...route.query,
      aircraft: aircraftFilter.value || undefined,
      dueStatus: dueStatusFilter.value || undefined,
      planningStatus: planningStatusFilter.value || undefined,
      dueBasis: dueBasisFilter.value || undefined,
      maintenanceProgram: maintenanceProgramFilter.value || undefined,
      planner: plannerFilter.value || undefined,
      station: stationFilter.value || undefined,
      search: searchQuery.value || undefined,
      summary: summaryFilter.value || undefined,
      horizon: planningHorizon.value || undefined,
      requirement: selectedRequirementId.value || undefined
    };
    router.replace({ query });
  }
);

function uniqueItems(values: string[]) {
  return [...new Set(values)].map((value) => ({ title: labelFor(value), value }));
}

function labelFor(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace('And', '+');
}

function matchesSummaryFilter(item: MaintenanceDueRequirement, filter: SummaryFilter) {
  if (filter === 'OVERDUE_MANDATORY') return item.mandatory && item.dueStatus === 'OVERDUE';
  if (filter === 'DUE_30') {
    const days = item.remaining.days;
    return days !== null && days >= 0 && days <= 30;
  }
  if (filter === 'UNPLANNED') return item.planningExposure;
  if (filter === 'RESOURCE_BLOCKED') return item.resourceBlocked;
  return item.fleetAffected;
}

function matchesHorizon(item: MaintenanceDueRequirement, horizon: HorizonFilter) {
  const days = item.remaining.days;
  if (horizon === 'OVERDUE') return item.dueStatus === 'OVERDUE';
  if (days === null) return horizon === 'BEYOND_90';
  if (horizon === '0_7') return days >= 0 && days <= 7;
  if (horizon === '8_30') return days >= 8 && days <= 30;
  if (horizon === '31_60') return days >= 31 && days <= 60;
  if (horizon === '61_90') return days >= 61 && days <= 90;
  return days > 90;
}

function prioritySort(a: MaintenanceDueRequirement, b: MaintenanceDueRequirement) {
  return priorityScore(b) - priorityScore(a);
}

function priorityScore(item: MaintenanceDueRequirement) {
  const fhExceeded = Math.abs(Math.min(item.remaining.flightHours ?? 0, 0));
  const daysExceeded = Math.abs(Math.min(item.remaining.days ?? 0, 0));
  let score = 0;
  if (item.mandatory && item.dueStatus === 'OVERDUE') score += 1000;
  if (!item.relatedWorkPackage && item.planningStatus === 'UNPLANNED') score += 200;
  if (item.dataStatus === 'CONFLICT') score += 160;
  if (item.dueStatus === 'DUE_TODAY') score += 120;
  if (item.dueStatus === 'DUE_SOON') score += 80;
  score += fhExceeded * 10 + daysExceeded * 8;
  return score;
}

function selectRequirement(item: MaintenanceDueRequirement) {
  selectedRequirementId.value = item.requirementId;
}

function applySummaryFilter(filter: SummaryFilter) {
  summaryFilter.value = summaryFilter.value === filter ? null : filter;
  if (summaryFilter.value === 'DUE_30') planningHorizon.value = '8_30';
  if (summaryFilter.value === 'OVERDUE_MANDATORY') planningHorizon.value = 'OVERDUE';
}

function reviewCriticalRequirements() {
  summaryFilter.value = 'OVERDUE_MANDATORY';
  planningHorizon.value = 'OVERDUE';
  if (highestPriorityRequirement.value) {
    selectedRequirementId.value = highestPriorityRequirement.value.requirementId;
  }
}

function clearFilters() {
  summaryFilter.value = null;
  aircraftFilter.value = '';
  dueStatusFilter.value = '';
  planningStatusFilter.value = '';
  dueBasisFilter.value = '';
  maintenanceProgramFilter.value = '';
  plannerFilter.value = '';
  stationFilter.value = '';
  searchQuery.value = '';
  planningHorizon.value = 'OVERDUE';
}

function statusMeta(status: DueStatus) {
  const map = {
    OVERDUE: {
      label: 'OVERDUE',
      icon: 'mdi-alert-circle-outline',
      class: 'status-critical'
    },
    DUE_TODAY: { label: 'DUE TODAY', icon: 'mdi-calendar-alert', class: 'status-warning' },
    DUE_SOON: { label: 'DUE SOON', icon: 'mdi-clock-alert-outline', class: 'status-warning' },
    FORECAST: { label: 'FORECAST', icon: 'mdi-calendar-search', class: 'status-info' },
    NOT_YET_DUE: {
      label: 'NOT YET DUE',
      icon: 'mdi-check-circle-outline',
      class: 'status-current'
    },
    CALCULATION_BLOCKED: {
      label: 'CALCULATION BLOCKED',
      icon: 'mdi-alert-decagram-outline',
      class: 'status-critical'
    }
  } satisfies Record<DueStatus, { label: string; icon: string; class: string }>;
  return map[status];
}

function planningMeta(status: PlanningStatus) {
  const map = {
    UNPLANNED: { label: 'Unplanned', icon: 'mdi-alert-outline', class: 'status-action' },
    WORK_PACKAGE_DRAFT: {
      label: 'Work Package Draft',
      icon: 'mdi-file-edit-outline',
      class: 'status-draft'
    },
    COMMITTED: { label: 'Committed', icon: 'mdi-check-circle-outline', class: 'status-current' },
    SCHEDULED: { label: 'Scheduled', icon: 'mdi-calendar-check-outline', class: 'status-info' },
    IN_EXECUTION: { label: 'In Execution', icon: 'mdi-progress-wrench', class: 'status-info' },
    COMPLETED: { label: 'Completed', icon: 'mdi-check-decagram-outline', class: 'status-current' }
  } satisfies Record<PlanningStatus, { label: string; icon: string; class: string }>;
  return map[status];
}

function dataMeta(status: DataStatus) {
  const map = {
    CURRENT: { label: 'Current', icon: 'mdi-check-circle-outline', class: 'status-current' },
    AGING: { label: 'Aging', icon: 'mdi-timer-sand', class: 'status-warning' },
    STALE: { label: 'Stale', icon: 'mdi-database-refresh-outline', class: 'status-warning' },
    CONFLICT: { label: 'Conflict', icon: 'mdi-alert-decagram-outline', class: 'status-critical' },
    UTILIZATION_MISSING: {
      label: 'Utilization Missing',
      icon: 'mdi-database-off-outline',
      class: 'status-critical'
    },
    APPLICABILITY_UNRESOLVED: {
      label: 'Applicability Unresolved',
      icon: 'mdi-help-rhombus-outline',
      class: 'status-warning'
    },
    CALCULATION_FAILED: {
      label: 'Calculation Failed',
      icon: 'mdi-alert-octagon-outline',
      class: 'status-critical'
    }
  } satisfies Record<DataStatus, { label: string; icon: string; class: string }>;
  return map[status];
}

function basisLabel(basis: DueBasis) {
  const map = {
    FH: 'FH',
    FC: 'FC',
    CALENDAR: 'Calendar',
    FH_AND_CALENDAR: 'FH + Calendar',
    FC_AND_CALENDAR: 'FC + Calendar',
    FH_AND_FC: 'FH + FC',
    FH_FC_AND_CALENDAR: 'FH + FC + Calendar'
  } satisfies Record<DueBasis, string>;
  return map[basis];
}

function basisRule(item: MaintenanceDueRequirement) {
  if (
    ['FH_AND_CALENDAR', 'FC_AND_CALENDAR', 'FH_AND_FC', 'FH_FC_AND_CALENDAR'].includes(
      item.interval.basis
    )
  ) {
    return 'Whichever occurs first';
  }
  if (item.interval.basis === 'FH') return 'Whichever occurs first rule not applied';
  return 'Calendar controlled';
}

function remainingDescription(item: MaintenanceDueRequirement) {
  if (item.dueStatus === 'OVERDUE') {
    const parts = [];
    if (item.remaining.flightHours !== null && item.remaining.flightHours < 0) {
      parts.push(`${Math.abs(item.remaining.flightHours)} FH`);
    }
    if (item.remaining.days !== null && item.remaining.days < 0) {
      parts.push(
        `${Math.abs(item.remaining.days)} ${Math.abs(item.remaining.days) === 1 ? 'day' : 'days'}`
      );
    }
    return `${parts.join(' · ')} exceeded`;
  }
  if (item.dueStatus === 'DUE_SOON') {
    const days = item.remaining.days ?? 0;
    const fh = item.remaining.flightHours ?? 0;
    return `${days} days · approx. ${fh} FH remaining`;
  }
  return 'Requirement is not yet due';
}

function currentDueLabel(item: MaintenanceDueRequirement) {
  const rows = [];
  if (item.current.flightHours !== null && item.nextDue.flightHours !== null) {
    rows.push(
      `${numberLabel(item.current.flightHours)} FH / ${numberLabel(item.nextDue.flightHours)} FH`
    );
  }
  if (item.nextDue.dueAt) {
    rows.push(`${shortDate(item.current.effectiveAt)} / ${shortDate(item.nextDue.dueAt)}`);
  }
  return rows;
}

function forecastLabel(item: MaintenanceDueRequirement) {
  if (item.dueStatus === 'OVERDUE') return 'Already exceeded';
  if (item.forecast.forecastAt) return dateLabel(item.forecast.forecastAt);
  return 'Forecast unavailable';
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(
    new Date(value)
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function actionLabel(item: MaintenanceDueRequirement) {
  if (item.dataStatus === 'STALE') return 'Refresh Utilization';
  if (item.dataStatus === 'APPLICABILITY_UNRESOLVED') return 'Review Applicability';
  if (item.dataStatus === 'CALCULATION_FAILED') return 'Resolve Calculation Issue';
  if (item.planningStatus === 'WORK_PACKAGE_DRAFT') return 'Continue Planning';
  if (['COMMITTED', 'SCHEDULED', 'IN_EXECUTION'].includes(item.planningStatus))
    return 'Open Work Package';
  if (item.dueStatus === 'OVERDUE' && item.planningStatus === 'UNPLANNED')
    return item.action === 'PLAN_REQUIREMENT' ? 'Plan Requirement' : 'Plan Immediately';
  if (item.dueStatus === 'DUE_SOON' && item.planningStatus === 'UNPLANNED')
    return 'Plan Requirement';
  return labelFor(item.action);
}

function handlePrimaryAction(item: MaintenanceDueRequirement) {
  selectRequirement(item);
  if (item.relatedWorkPackage) {
    router.push(`/maintenance/work-packages/${item.relatedWorkPackage.id}`);
    return;
  }
  if (item.dataStatus === 'STALE') {
    localNotice.value = `${item.requirementId}: utilization refresh queued for Maintenance Planning.`;
    return;
  }
  const backendDue = backendDueByKey.value.get(
    `${item.aircraftRegistration}:${item.requirementId}`
  );
  if (backendDue && !backendDue.plannedWorkPackageId) {
    createError.value = '';
    planningNote.value = `${item.requirementId} ${remainingDescription(item)}`;
    selectedDue.value = backendDue;
    return;
  }
  localNotice.value = `${item.requirementId}: planning context prepared. Open Assign Work Package from Maintenance command center to commit this package.`;
}

async function createWorkPackageFromDue() {
  if (!selectedDue.value) return;
  createLoading.value = true;
  createError.value = '';
  try {
    const workPackage = await fetchApi<{ id: string }>(
      `/api/maintenance/due-control/${selectedDue.value.id}/actions/create-work-package`,
      {
        method: 'POST',
        body: {
          planningNote: planningNote.value || null,
          idempotencyKey: `due-${selectedDue.value.id}`
        }
      }
    );
    selectedDue.value = null;
    await refresh();
    await router.push(`/maintenance/work-packages/${workPackage.id}`);
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Work Package belum dapat dibuat.';
  } finally {
    createLoading.value = false;
  }
}

function assignPlanner() {
  const item = selectedRequirement.value;
  const plannerName = plannerNames.get(plannerSelection.value);
  if (!item || !plannerName) return;
  item.owner = { id: plannerSelection.value, name: plannerName };
  item.recentActivity = [`Planner assigned to ${plannerName}`, ...item.recentActivity];
  assignDialog.value = false;
  localNotice.value = `${item.requirementId}: owner updated to ${plannerName}.`;
}
</script>

<template>
  <VContainer fluid class="due-control-workspace">
    <div class="due-page-header">
      <div>
        <p class="section-eyebrow mb-1">Maintenance Operations</p>
        <div class="d-flex flex-wrap align-center ga-2">
          <h1 class="text-h4 font-weight-bold">Jatuh Tempo Perawatan</h1>
          <VChip size="small" color="primary" variant="tonal">LOCAL DEMO · SYNTHETIC DATA</VChip>
        </div>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Maintenance Due Control &amp; Planning Workspace
        </p>
      </div>
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending"
        aria-label="Refresh due control"
        @click="refresh()"
      />
    </div>

    <VAlert
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4 due-safety-strip"
      icon="mdi-information-outline"
    >
      Intervals and forecasts in this environment are synthetic and must not be used as an approved
      maintenance program.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Due status could not be evaluated because utilization data is unavailable.
    </VAlert>
    <VAlert
      v-if="localNotice"
      type="success"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="localNotice = ''"
    >
      {{ localNotice }}
    </VAlert>

    <div class="summary-grid mb-4" aria-label="Fleet due summary">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        class="summary-card"
        :class="[`summary-${card.tone}`, { selected: summaryFilter === card.key }]"
        type="button"
        @click="applySummaryFilter(card.key)"
      >
        <span class="summary-icon">
          <VIcon :icon="card.icon" size="30" />
        </span>
        <span class="summary-copy">
          <span class="summary-label">{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <span>{{ card.unit }}</span>
        </span>
        <VIcon icon="mdi-chevron-right" size="20" />
      </button>
    </div>

    <section class="decision-hero mb-4" aria-label="Decision status">
      <div class="decision-status">
        <span class="decision-alert-icon"><VIcon icon="mdi-alert-outline" size="38" /></span>
        <strong>ACTION<br>REQUIRED</strong>
      </div>
      <div class="decision-body">
        <p class="decision-message">
          {{ overdueMandatoryCount }} mandatory requirements are overdue.
          {{ unplannedAircraftCount }} aircraft have maintenance requirements without an active
          plan.
        </p>
        <div class="decision-meta">
          <div>
            <span>Highest priority</span>
            <strong>
              {{ highestPriorityRequirement?.aircraftRegistration }} ·
              {{ highestPriorityRequirement?.requirementId }}
            </strong>
            <small>{{
              highestPriorityRequirement
                ? `Overdue by ${remainingDescription(highestPriorityRequirement)}`
                : '-'
            }}</small>
          </div>
          <div>
            <span>Next action</span>
            <strong><VIcon icon="mdi-clipboard-plus-outline" size="16" /> Create and commit a Work
              Package</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong><VIcon icon="mdi-account-hard-hat-outline" size="16" /> Maintenance Planning</strong>
          </div>
        </div>
      </div>
      <VBtn color="primary" class="decision-action" @click="reviewCriticalRequirements">
        Review Critical Requirements
      </VBtn>
    </section>

    <div class="workspace-grid">
      <VCard border class="requirements-panel">
        <VCardText class="pb-3">
          <div class="filter-heading">
            <strong>Planning Horizon</strong>
            <VBtnToggle
              v-model="planningHorizon"
              density="compact"
              mandatory
              variant="outlined"
              divided
              class="horizon-toggle"
            >
              <VBtn value="OVERDUE">Overdue</VBtn>
              <VBtn value="0_7">0-7 Days</VBtn>
              <VBtn value="8_30">8-30 Days</VBtn>
              <VBtn value="31_60">31-60 Days</VBtn>
              <VBtn value="61_90">61-90 Days</VBtn>
              <VBtn value="BEYOND_90">Beyond 90 Days</VBtn>
            </VBtnToggle>
          </div>
          <div class="filter-grid mt-4">
            <VSelect
              v-model="aircraftFilter"
              :items="aircraftItems"
              label="Aircraft"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="dueStatusFilter"
              :items="dueStatusItems"
              label="Due Status"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="planningStatusFilter"
              :items="planningStatusItems"
              label="Planning Status"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="dueBasisFilter"
              :items="dueBasisItems"
              label="Due Basis"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="maintenanceProgramFilter"
              :items="maintenanceProgramItems"
              label="Maintenance Program"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="plannerFilter"
              :items="[{ title: 'Unassigned', value: 'UNASSIGNED' }, ...plannerItems]"
              label="Assigned Planner"
              density="compact"
              hide-details
              clearable
            />
            <VSelect
              v-model="stationFilter"
              :items="stationItems"
              label="Station"
              density="compact"
              hide-details
              clearable
            />
            <VTextField
              v-model="searchQuery"
              label="Search requirement, aircraft, MPD, AMM..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              hide-details
              clearable
            />
            <VBtn
              variant="text"
              prepend-icon="mdi-filter-remove-outline"
              :disabled="!activeFilterCount"
              @click="clearFilters"
            >
              Clear filters
            </VBtn>
          </div>
        </VCardText>

        <VDivider />
        <div class="table-toolbar">
          <div>
            <strong>Requirement Register</strong>
            <VIcon icon="mdi-information-outline" size="16" color="primary" />
          </div>
          <VBtn icon="mdi-cog-outline" variant="text" size="small" aria-label="Table settings" />
        </div>
        <VTable class="requirement-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Aircraft</th>
              <th>Requirement</th>
              <th>Due Basis</th>
              <th>Current / Due</th>
              <th>Remaining</th>
              <th>Forecast Date</th>
              <th>Planning Status</th>
              <th>Data Status</th>
              <th>Owner</th>
              <th>Action</th>
              <th aria-label="More actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="12">
                <div class="skeleton-row">Evaluating due requirements...</div>
              </td>
            </tr>
            <tr
              v-for="item in filteredRequirements"
              :key="item.id"
              :class="{ 'selected-row': selectedRequirementId === item.requirementId }"
              tabindex="0"
              @click="selectRequirement(item)"
              @keydown.enter="selectRequirement(item)"
            >
              <td>
                <VCheckboxBtn
                  :model-value="selectedRequirementId === item.requirementId"
                  density="compact"
                  :aria-label="`Select ${item.requirementId}`"
                />
              </td>
              <td>
                <div class="aircraft-cell">
                  <VAvatar rounded="lg" size="38">
                    <VImg
                      v-if="resolveAircraftImageUrl(item.aircraftThumbnail)"
                      :alt="`${item.aircraftRegistration} aircraft image`"
                      cover
                      :src="resolveAircraftImageUrl(item.aircraftThumbnail) ?? undefined"
                    />
                    <VIcon v-else icon="mdi-airplane" size="22" />
                  </VAvatar>
                  <div>
                    <strong>{{ item.aircraftRegistration }}</strong>
                    <span>{{ item.aircraftModel }}</span>
                  </div>
                </div>
              </td>
              <td>
                <strong>{{ item.requirementId }}</strong>
                <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
                <span v-if="item.mandatory" class="mini-chip chip-critical">Mandatory</span>
              </td>
              <td>
                <strong>{{ basisLabel(item.interval.basis) }}</strong>
                <div class="text-caption text-medium-emphasis">{{ basisRule(item) }}</div>
              </td>
              <td>
                <div v-for="line in currentDueLabel(item)" :key="line" class="compact-line">
                  {{ line }}
                </div>
              </td>
              <td>
                <span class="status-pill" :class="statusMeta(item.dueStatus).class">
                  <VIcon :icon="statusMeta(item.dueStatus).icon" size="14" />
                  {{ statusMeta(item.dueStatus).label }}
                </span>
                <div class="text-caption">{{ remainingDescription(item) }}</div>
              </td>
              <td>{{ forecastLabel(item) }}</td>
              <td>
                <span class="status-pill" :class="planningMeta(item.planningStatus).class">
                  <VIcon :icon="planningMeta(item.planningStatus).icon" size="14" />
                  {{ planningMeta(item.planningStatus).label }}
                </span>
              </td>
              <td>
                <span class="status-pill" :class="dataMeta(item.dataStatus).class">
                  <VIcon :icon="dataMeta(item.dataStatus).icon" size="14" />
                  {{ dataMeta(item.dataStatus).label }}
                </span>
                <div class="text-caption">{{ item.dataStatusDetail }}</div>
              </td>
              <td>{{ item.owner?.name ?? 'Unassigned' }}</td>
              <td>
                <VBtn
                  size="small"
                  :color="
                    item.dueStatus === 'OVERDUE' && item.planningStatus === 'UNPLANNED'
                      ? 'primary'
                      : undefined
                  "
                  variant="tonal"
                  @click.stop="handlePrimaryAction(item)"
                >
                  {{ actionLabel(item) }}
                </VBtn>
              </td>
              <td>
                <VBtn
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                  aria-label="More actions"
                />
              </td>
            </tr>
            <tr v-if="!pending && !filteredRequirements.length">
              <td colspan="12">
                <div class="empty-state">
                  <strong>No maintenance requirements match the selected filters.</strong>
                  <VBtn variant="text" @click="clearFilters">Clear filters</VBtn>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>
        <div class="table-footer">
          <span>Showing 1 to {{ filteredRequirements.length }} of
            {{ filteredRequirements.length }} requirements</span>
          <div class="d-flex align-center ga-2">
            <VBtn icon="mdi-chevron-left" variant="tonal" size="small" disabled />
            <VBtn variant="outlined" size="small">1</VBtn>
            <VBtn icon="mdi-chevron-right" variant="tonal" size="small" disabled />
            <VSelect
              :model-value="20"
              :items="[20, 50]"
              density="compact"
              hide-details
              suffix="/ page"
              class="page-size"
            />
          </div>
        </div>
      </VCard>

      <aside
        v-if="selectedRequirement"
        class="requirement-drawer"
        aria-label="Requirement detail drawer"
      >
        <div class="drawer-header">
          <div>
            <h2>
              {{ selectedRequirement.aircraftRegistration }} ·
              {{ selectedRequirement.requirementId }}
            </h2>
            <p>
              {{ selectedRequirement.title }}
              <span v-if="selectedRequirement.mandatory" class="mini-chip chip-critical">Mandatory</span>
            </p>
          </div>
          <VBtn
            icon="mdi-close"
            variant="text"
            aria-label="Close requirement detail"
            @click="selectedRequirementId = ''"
          />
        </div>

        <div class="drawer-section">
          <span class="drawer-marker">A</span>
          <div>
            <h3><VIcon icon="mdi-airplane" size="16" /> Aircraft</h3>
            <dl class="drawer-dl">
              <div>
                <dt>
                  {{ selectedRequirement.aircraftRegistration }} ·
                  {{ selectedRequirement.aircraftModel }}
                </dt>
                <dd>Current station {{ selectedRequirement.station.name }}</dd>
              </div>
              <div>
                <dt>Aircraft status</dt>
                <dd>Maintenance</dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">B</span>
          <div>
            <h3>Maintenance Program</h3>
            <dl class="drawer-dl two-col">
              <div>
                <dt>{{ selectedRequirement.maintenanceProgram.name }}</dt>
                <dd>{{ selectedRequirement.maintenanceProgram.revision }}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{{ selectedRequirement.sources.mpdReference }}</dd>
              </div>
              <div>
                <dt>AMM Reference</dt>
                <dd>{{ selectedRequirement.sources.ammReference }}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">C</span>
          <div>
            <h3>Applicability</h3>
            <dl class="drawer-dl two-col">
              <div>
                <dt>{{ labelFor(selectedRequirement.applicability.status) }}</dt>
                <dd>Applicable</dd>
              </div>
              <div>
                <dt>
                  <VIcon
                    :icon="
                      selectedRequirement.applicability.configurationVerified
                        ? 'mdi-check-circle'
                        : 'mdi-alert-circle'
                    "
                    size="14"
                    color="success"
                  />
                  Configuration verified
                </dt>
                <dd>Current aircraft configuration</dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">D</span>
          <div>
            <h3>Interval &amp; Tolerance</h3>
            <dl class="drawer-dl two-col">
              <div>
                <dt>
                  {{
                    selectedRequirement.interval.repeatFH
                      ? `Every ${selectedRequirement.interval.repeatFH} FH`
                      : basisLabel(selectedRequirement.interval.basis)
                  }}
                </dt>
                <dd>Primary interval</dd>
              </div>
              <div>
                <dt>
                  {{
                    selectedRequirement.interval.repeatDays
                      ? `${selectedRequirement.interval.repeatDays} days`
                      : '-'
                  }}
                </dt>
                <dd>Calendar backstop</dd>
              </div>
              <div>
                <dt>
                  {{
                    selectedRequirement.interval.toleranceAllowed ? 'Permitted' : 'Not permitted'
                  }}
                </dt>
                <dd>Tolerance</dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">E</span>
          <div>
            <h3>Last accomplishment</h3>
            <p>
              {{
                selectedRequirement.lastAccomplishment.flightHours
                  ? `${numberLabel(selectedRequirement.lastAccomplishment.flightHours)} FH · `
                  : ''
              }}
              {{ dateLabel(selectedRequirement.lastAccomplishment.accomplishedAt) }}
            </p>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">F</span>
          <div>
            <h3>Next due</h3>
            <p>
              {{
                selectedRequirement.nextDue.flightHours
                  ? `${numberLabel(selectedRequirement.nextDue.flightHours)} FH · `
                  : ''
              }}
              {{
                selectedRequirement.nextDue.dueAt
                  ? dateLabel(selectedRequirement.nextDue.dueAt)
                  : 'Flight hour controlled'
              }}
            </p>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">G</span>
          <div>
            <h3>Current status</h3>
            <p>
              {{
                selectedRequirement.current.flightHours
                  ? `${numberLabel(selectedRequirement.current.flightHours)} FH · `
                  : ''
              }}
              {{ dateLabel(selectedRequirement.current.effectiveAt) }}
            </p>
            <strong class="overdue-copy">Overdue: {{ remainingDescription(selectedRequirement) }}</strong>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">H</span>
          <div>
            <h3>Planning</h3>
            <dl class="drawer-dl two-col">
              <div>
                <dt>
                  {{ selectedRequirement.relatedWorkPackage?.number ?? 'No active Work Package' }}
                </dt>
                <dd>Related Work Package</dd>
              </div>
              <div>
                <dt>{{ selectedRequirement.owner?.name ?? 'Unassigned' }}</dt>
                <dd>Assigned planner</dd>
              </div>
              <div>
                <dt>{{ selectedRequirement.station.code }}</dt>
                <dd>Planned station</dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">I</span>
          <div>
            <h3>Data freshness</h3>
            <span class="status-pill" :class="dataMeta(selectedRequirement.dataStatus).class">
              <VIcon :icon="dataMeta(selectedRequirement.dataStatus).icon" size="14" />
              {{ dataMeta(selectedRequirement.dataStatus).label }}
            </span>
            <p>{{ selectedRequirement.dataStatusDetail }}</p>
            <p>Forecast source: {{ selectedRequirement.forecast.source }}</p>
          </div>
        </div>
        <div class="drawer-section">
          <span class="drawer-marker">J</span>
          <div>
            <h3>Recent activity</h3>
            <ul class="activity-list">
              <li v-for="activity in selectedRequirement.recentActivity" :key="activity">
                {{ activity }}
              </li>
            </ul>
          </div>
        </div>

        <div class="drawer-actions">
          <VBtn color="primary" @click="handlePrimaryAction(selectedRequirement)">
            Create Work Package
          </VBtn>
          <VBtn variant="tonal" @click="assignDialog = true">Assign Planner</VBtn>
          <VBtn
            variant="text"
            @click="
              localNotice = 'Maintenance program view is available from Data Perawatan Terkendali.'
            "
          >
            View Maintenance Program
          </VBtn>
          <VBtn
            variant="text"
            @click="
              localNotice = `${selectedRequirement.requirementId}: calculation detail opened in demo context.`
            "
          >
            View Calculation Detail
          </VBtn>
        </div>
      </aside>
    </div>

    <VDialog v-model="planningDialog" max-width="680">
      <VCard v-if="selectedDue">
        <VCardTitle>Buat Work Package dari Due Item</VCardTitle>
        <VCardText>
          <VAlert type="warning" variant="tonal" class="mb-4">
            Membuat Work Package tidak menandai requirement sebagai complied. Status due tetap
            berasal dari backend sampai pekerjaan dirilis secara teknis.
          </VAlert>
          <div class="mb-3">
            <strong>{{ selectedDue.code }}</strong>
            <div class="text-body-2">{{ selectedDue.title }}</div>
          </div>
          <VList density="compact" border rounded>
            <VListItem title="Aircraft" :subtitle="selectedDue.aircraftRegistrationNumber" />
            <VListItem title="Status saat planning" :subtitle="selectedDue.status" />
            <VListItem title="Basis" :subtitle="selectedDue.nearestBasis" />
            <VListItem title="Kalkulasi" :subtitle="selectedDue.calculationExplanation" />
            <VListItem
              title="Utilisasi"
              :subtitle="`${selectedDue.currentFlightHours} FH / ${selectedDue.currentFlightCycles} FC`"
            />
          </VList>
          <VTextarea
            v-model="planningNote"
            label="Catatan Planner"
            rows="3"
            class="mt-4"
            hide-details
          />
          <VAlert v-if="createError" type="error" variant="tonal" class="mt-4">
            {{ createError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="createLoading" @click="selectedDue = null">Batal</VBtn>
          <VBtn color="primary" :loading="createLoading" @click="createWorkPackageFromDue">
            Create Work Package
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="assignDialog" max-width="440">
      <VCard>
        <VCardTitle>Assign Planner</VCardTitle>
        <VCardText>
          <VSelect
            v-model="plannerSelection"
            :items="plannerItems"
            label="Maintenance planner"
            density="comfortable"
          />
          <p class="text-body-2 text-medium-emphasis mb-0">
            Assignment updates the planning owner only. Due status and release status are unchanged.
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="assignDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="assignPlanner">Assign Planner</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.due-control-workspace {
  background: #f6f8fb;
  color: #0f172a;
  min-height: calc(100vh - 64px);
}

.due-page-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-eyebrow {
  color: #003b73;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
}

.due-safety-strip {
  border: 1px solid #c9dced;
}

.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
}

.summary-card {
  align-items: center;
  background: #fff;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  color: #0f172a;
  cursor: pointer;
  display: flex;
  gap: 12px;
  min-height: 86px;
  padding: 14px;
  text-align: left;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.summary-card:hover,
.summary-card:focus-visible,
.summary-card.selected {
  border-color: #003b73;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  outline: none;
  transform: translateY(-1px);
}

.summary-icon {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  height: 52px;
  justify-content: center;
  width: 52px;
}

.summary-critical .summary-icon {
  background: #fff1f2;
  color: #b42318;
}

.summary-warning .summary-icon {
  background: #fffaeb;
  color: #b54708;
}

.summary-action .summary-icon {
  background: #fff4ed;
  color: #c2410c;
}

.summary-blocked .summary-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.summary-info .summary-icon {
  background: #eff8ff;
  color: #026aa2;
}

.summary-copy {
  display: grid;
  flex: 1;
  gap: 1px;
}

.summary-copy strong {
  font-size: 1.55rem;
  line-height: 1;
}

.summary-copy span {
  color: #334155;
  font-size: 0.75rem;
}

.summary-copy .summary-label {
  color: #0f172a;
  font-weight: 700;
}

.decision-hero {
  align-items: center;
  background: linear-gradient(90deg, #fff, #fff7f7);
  border: 1px solid #f19999;
  border-radius: 8px;
  display: grid;
  gap: 18px;
  grid-template-columns: 170px 1fr auto;
  padding: 20px;
}

.decision-status {
  align-items: center;
  border-right: 1px solid #cbd5e1;
  color: #b42318;
  display: flex;
  gap: 14px;
  min-height: 88px;
}

.decision-alert-icon {
  align-items: center;
  background: #c92a2a;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  height: 58px;
  justify-content: center;
  width: 58px;
}

.decision-status strong {
  font-size: 1.1rem;
}

.decision-message {
  font-size: 1.08rem;
  margin-bottom: 16px;
}

.decision-meta {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.decision-meta div {
  border-left: 1px solid #e2e8f0;
  display: grid;
  gap: 3px;
  padding-left: 14px;
}

.decision-meta span {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.decision-meta strong {
  align-items: center;
  color: #0f172a;
  display: flex;
  gap: 5px;
  font-size: 0.85rem;
}

.decision-meta small {
  color: #b42318;
  font-weight: 700;
}

.decision-action {
  min-width: 218px;
}

.workspace-grid {
  align-items: start;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) 390px;
}

.requirements-panel {
  overflow: hidden;
}

.filter-heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.horizon-toggle {
  flex-wrap: wrap;
}

.filter-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
}

.filter-grid .v-text-field {
  grid-column: span 2;
}

.table-toolbar,
.table-footer {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 10px 14px;
}

.table-toolbar > div {
  align-items: center;
  display: flex;
  gap: 6px;
}

.requirement-table {
  font-size: 0.78rem;
}

.requirement-table th {
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
}

.requirement-table td {
  vertical-align: middle;
}

.requirement-table tbody tr {
  cursor: pointer;
}

.requirement-table tbody tr:focus-visible {
  outline: 2px solid #003b73;
  outline-offset: -2px;
}

.selected-row {
  background: #eaf4ff;
  box-shadow: inset 3px 0 0 #003b73;
}

.aircraft-cell {
  align-items: center;
  display: flex;
  gap: 9px;
  min-width: 110px;
}

.aircraft-cell div {
  display: grid;
}

.aircraft-cell span,
.compact-line {
  color: #475569;
  font-size: 0.73rem;
}

.mini-chip,
.status-pill {
  align-items: center;
  border-radius: 6px;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 800;
  gap: 4px;
  letter-spacing: 0;
  line-height: 1.2;
  padding: 4px 7px;
}

.chip-critical,
.status-critical {
  background: #fee4e2;
  color: #b42318;
}

.status-warning,
.status-action {
  background: #ffedd5;
  color: #c2410c;
}

.status-current {
  background: #dcfae6;
  color: #067647;
}

.status-draft {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-info {
  background: #e0f2fe;
  color: #026aa2;
}

.skeleton-row,
.empty-state {
  align-items: center;
  color: #64748b;
  display: flex;
  gap: 12px;
  justify-content: center;
  min-height: 88px;
}

.page-size {
  max-width: 118px;
}

.requirement-drawer {
  background: #fff;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  max-height: calc(100vh - 96px);
  overflow: auto;
  position: sticky;
  top: 76px;
}

.drawer-header {
  align-items: flex-start;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 16px 12px;
}

.drawer-header h2 {
  font-size: 1.05rem;
  line-height: 1.35;
  margin: 0;
}

.drawer-header p {
  color: #475569;
  margin: 3px 0 0;
}

.drawer-section {
  display: grid;
  gap: 10px;
  grid-template-columns: 24px 1fr;
  padding: 11px 16px;
}

.drawer-marker {
  align-items: center;
  background: #0b4578;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-size: 0.68rem;
  font-weight: 800;
  height: 20px;
  justify-content: center;
  margin-top: 2px;
  width: 20px;
}

.drawer-section h3 {
  align-items: center;
  color: #0b4578;
  display: flex;
  font-size: 0.83rem;
  gap: 6px;
  margin: 0 0 4px;
}

.drawer-section p {
  font-size: 0.78rem;
  margin: 0;
}

.drawer-dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

.drawer-dl.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.drawer-dl dt {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 800;
}

.drawer-dl dd {
  color: #64748b;
  font-size: 0.72rem;
  margin: 0;
}

.overdue-copy {
  color: #b42318;
  display: block;
  font-size: 0.78rem;
  margin-top: 4px;
}

.activity-list {
  font-size: 0.78rem;
  margin: 0;
  padding-left: 16px;
}

.drawer-actions {
  border-top: 1px solid #e2e8f0;
  display: grid;
  gap: 9px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 16px;
}

.drawer-actions .v-btn:nth-child(n + 3) {
  justify-content: flex-start;
}

@media (max-width: 1500px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .requirement-drawer {
    max-height: none;
    position: static;
  }
}

@media (max-width: 1100px) {
  .decision-hero {
    grid-template-columns: 1fr;
  }

  .decision-status {
    border-right: 0;
    min-height: auto;
  }

  .decision-meta,
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid .v-text-field {
    grid-column: span 2;
  }
}

@media (max-width: 760px) {
  .summary-grid,
  .decision-meta,
  .filter-grid,
  .drawer-dl.two-col,
  .drawer-actions {
    grid-template-columns: 1fr;
  }

  .filter-grid .v-text-field {
    grid-column: auto;
  }

  .requirement-table {
    min-width: 1100px;
  }
}
</style>
