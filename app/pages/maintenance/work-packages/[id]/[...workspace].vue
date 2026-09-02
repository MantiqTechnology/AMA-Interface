<script setup lang="ts">
import JobCardItem from '../../../../components/maintenance/workpackage/JobCardItem.vue';
import InspectionDialog from '../../../../components/maintenance/workpackage/InspectionDialog.vue';
import JobCardAddForm from '../../../../components/maintenance/workpackage/JobCardAddForm.vue';
import type {
  MaintenanceEligibilityBlockerDto,
  MaintenanceJobCardDto,
  MaintenanceNonRoutineFindingDto,
  MaintenanceSelectorDataDto,
  MaintenanceTechnicalRecordPackageDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type {
  MaintenanceMaterialRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelCandidateDto,
  MaintenancePersonnelRequirementDto,
  MaintenanceResourceReadinessDto,
  MaintenanceToolAllocationV2Dto,
  MaintenanceToolCandidateDto,
  MaintenanceToolRequirementDto,
  MroEligibilityBlocker,
  MroEligibilityResult
} from '#shared/features/maintenance-v21';
import { activeRework, signoff } from '../../../../utils/jobCardHelper';

type WorkspaceSection =
  'overview' | 'execution' | 'findings' | 'resources' | 'records' | 'inspection' | 'release';
type ResourceView = 'materials' | 'tools' | 'personnel' | 'facilities';
type RecordView = 'summary' | 'configuration' | 'amendments';
type ReadinessStatus =
  | 'NOT_EVALUATED'
  | 'EVALUATING'
  | 'CLEAR'
  | 'WARNING'
  | 'BLOCKED'
  | 'EVALUATION_FAILED'
  | 'NOT_APPLICABLE';

type RequiredAction = {
  id: string;
  title: string;
  problem: string;
  owner: string;
  impact: string;
  route: string;
};

type ReadinessCategory = {
  key: string;
  label: string;
  status: ReadinessStatus;
  blockerCount: number;
  warningCount: number;
  criteria: string;
  nextAction: string;
  route: string;
};

const route = useRoute();
const router = useRouter();
const ui = useMaintenanceUi();
const format = useLocaleFormat();
const session = useDemoSession();
const { can } = useAuthorization();

const id = computed(() => String(route.params.id));
const workspaceSegments = computed(() => {
  const raw = route.params.workspace;
  return (Array.isArray(raw) ? raw : raw ? [String(raw)] : ['overview']).filter(Boolean);
});

const section = computed<WorkspaceSection>(() => {
  const first = workspaceSegments.value[0];
  if (first === 'non-routines') return 'findings';
  if (
    first === 'execution' ||
    first === 'findings' ||
    first === 'resources' ||
    first === 'records' ||
    first === 'inspection' ||
    first === 'release'
  ) {
    return first;
  }
  return 'overview';
});

const selectedJobCardId = computed(() =>
  workspaceSegments.value[0] === 'execution' && workspaceSegments.value[1] === 'job-cards'
    ? workspaceSegments.value[2] || null
    : null
);
const selectedFindingId = computed(() => {
  if (workspaceSegments.value[0] === 'findings' && workspaceSegments.value[2] === 'assessment') {
    return workspaceSegments.value[1] || null;
  }
  if (workspaceSegments.value[0] === 'non-routines') return workspaceSegments.value[1] || null;
  return null;
});
const resourceView = computed<ResourceView>(() => {
  const value = workspaceSegments.value[1];
  if (value === 'tools' || value === 'personnel' || value === 'facilities') return value;
  return 'materials';
});
const recordView = computed<RecordView>(() => {
  const value = workspaceSegments.value[1];
  if (value === 'configuration' || value === 'amendments') return value;
  return 'summary';
});

const {
  data: workPackage,
  pending,
  error,
  refresh
} = await useAsyncData(
  () => `mro-work-package-workspace-${id.value}`,
  () => fetchApi<MaintenanceWorkPackageDto>(`/api/maintenance/work-packages/${id.value}`),
  { watch: [id] }
);

const { data: selectorData, pending: selectorsPending } = await useAsyncData(
  () => `mro-work-package-selectors-${session.role.value}`,
  () => fetchApi<MaintenanceSelectorDataDto>('/api/maintenance/selector-data'),
  { watch: [() => session.role.value], server: false }
);

const resource = useResourceV21(id);
const resourceReadiness = ref<MaintenanceResourceReadinessDto | null>(null);
const mroEligibility = ref<MroEligibilityResult | null>(null);
const technicalRecord = ref<MaintenanceTechnicalRecordPackageDto | null>(null);
const toolCandidates = ref<Record<string, MaintenanceToolCandidateDto[]>>({});
const personnelCandidates = ref<Record<string, MaintenancePersonnelCandidateDto[]>>({});
const supplementalPending = ref(false);
const actionLoading = ref('');
const actionError = ref<ReturnType<typeof ui.presentError> | null>(null);
const actionSuccess = ref('');

const signerLicenses = computed(() => selectorData.value?.signerLicenses ?? []);
const immutablePackage = computed(() =>
  ['RELEASED', 'CANCELLED'].includes(workPackage.value?.status ?? '')
);
const canManageJobCards = computed(() => can('maintenance.jobcard.manage').allowed);
const canAssessNonRoutine = computed(() => can('maintenance.defect.assess').allowed);
const canRequestRelease = computed(() => can('maintenance.release.request').allowed);
const canIssueRelease = computed(() => can('maintenance.release.issue').allowed);

const workflow = useJobCardWorkflow({
  workPackage,
  signerLicenses,
  onMutated: refreshWorkspace
});

const releaseForm = reactive({
  releaseNumber: '',
  resultingStatus: 'SERVICEABLE' as 'SERVICEABLE' | 'SERVICEABLE_WITH_RESTRICTIONS',
  releaseStatement: '',
  certifyingLicenseNumber: '',
  releasedAt: '',
  evidenceReferences: 'MRO-TECHNICAL-RELEASE-EVIDENCE'
});

const nonRoutineDialog = ref(false);
const nonRoutineSourceCard = ref<MaintenanceJobCardDto | null>(null);
const nonRoutineForm = reactive({
  title: '',
  description: '',
  severity: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'AOG',
  location: '',
  ataChapter: '',
  detectedDuring: 'ACTIVE_WORK',
  operationalImpact: 'UNASSESSED',
  findingClassification: 'UNASSESSED',
  melCdlAssessment: 'UNASSESSED',
  immediateAction: '',
  aircraftMovementProhibited: false,
  notifyMaintenanceControl: false,
  requiresInspectorReview: true,
  immediateSafetyConcern: false,
  evidenceReferences: ''
});

const assessmentForms = reactive<
  Record<
    string,
    {
      disposition: 'CORRECTIVE_WORK_REQUIRED' | 'NO_ACTION';
      assessmentNote: string;
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'AOG';
      requiresIndependentInspection: boolean;
      approvedDataRef: string;
    }
  >
>({});
const correctiveForms = reactive<
  Record<
    string,
    {
      title: string;
      maintenanceDataRef: string;
      maintenanceDataRevision: string;
      approvedDataRevisionId: string;
      mandatoryFlag: boolean;
      requiresIndependentInspection: boolean;
    }
  >
>({});
const resolutionForms = reactive<Record<string, { note: string; evidence: string }>>({});
const closeForms = reactive<Record<string, { note: string; evidence: string }>>({});

const navItems = computed(() => {
  const item = workPackage.value;
  const nrOpen =
    item?.nonRoutineFindings?.filter((finding) => finding.status !== 'CLOSED').length ?? 0;
  const incompleteCards =
    item?.jobCards.filter((card) => card.status !== 'READY_FOR_RELEASE_REVIEW').length ?? 0;
  const inspectionCount =
    item?.jobCards.filter((card) =>
      ['INSPECTION_REQUIRED', 'REJECTED_FOR_REWORK'].includes(card.status)
    ).length ?? 0;
  const resourceBlockers =
    (mroEligibility.value?.sections.material.blockers.length ?? 0) +
    (mroEligibility.value?.sections.tools.blockers.length ?? 0) +
    (mroEligibility.value?.sections.personnel.blockers.length ?? 0) +
    (mroEligibility.value?.sections.amoScope.blockers.length ?? 0);
  const recordBlockers =
    technicalRecord.value?.releaseGates.filter((gate) =>
      ['BLOCKED', 'MISSING'].includes(gate.status)
    ).length ?? 0;
  const releaseBlockers =
    mroEligibility.value?.blockers.length ??
    workPackage.value?.releaseEligibility?.blockers.length ??
    0;

  return [
    {
      section: 'overview',
      label: 'Overview',
      to: workspacePath('overview'),
      count: releaseBlockers
    },
    {
      section: 'execution',
      label: 'Execution',
      to: workspacePath('execution'),
      count: incompleteCards
    },
    { section: 'findings', label: 'Findings', to: workspacePath('findings'), count: nrOpen },
    {
      section: 'resources',
      label: 'Resources',
      to: workspacePath('resources/materials'),
      count: resourceBlockers
    },
    { section: 'records', label: 'Records', to: workspacePath('records'), count: recordBlockers },
    {
      section: 'inspection',
      label: 'Inspection',
      to: workspacePath('inspection'),
      count: inspectionCount
    },
    { section: 'release', label: 'Release', to: workspacePath('release'), count: releaseBlockers }
  ] as const;
});

const decision = computed(() => {
  const item = workPackage.value;
  const blockers = mroEligibility.value?.blockers ?? item?.releaseEligibility?.blockers ?? [];
  const warnings = mroEligibility.value?.warnings ?? item?.releaseEligibility?.warnings ?? [];
  if (item?.status === 'RELEASED') {
    return {
      title: 'RELEASED',
      tone: 'success',
      summary: item.release?.releaseNumber ?? 'Technical Release sudah diterbitkan.',
      nextAction: 'Review technical records and audit trail.'
    };
  }
  if (blockers.length) {
    return {
      title: 'RELEASE BLOCKED',
      tone: 'error',
      summary: `${blockers.length} blockers · ${warnings.length} warnings`,
      nextAction: blockerAction(blockers[0])
    };
  }
  if (warnings.length) {
    return {
      title: 'READY WITH WARNINGS',
      tone: 'warning',
      summary: `${warnings.length} warnings require review`,
      nextAction: blockerAction(warnings[0])
    };
  }
  return {
    title: 'READY FOR RELEASE REVIEW',
    tone: 'success',
    summary: 'No active release blockers from current evaluators.',
    nextAction: 'Open Technical Release when Certifying Staff is ready.'
  };
});

const workflowSteps = computed(() => {
  const item = workPackage.value;
  const cardsDone =
    item?.jobCards.length &&
    item.jobCards.every((card) => card.status === 'READY_FOR_RELEASE_REVIEW');
  return [
    { label: 'Planning', done: Boolean(item), current: item?.status === 'OPEN' },
    {
      label: 'Readiness',
      done: Boolean(resourceReadiness.value),
      current: item?.status === 'OPEN'
    },
    { label: 'Execution', done: Boolean(cardsDone), current: item?.status === 'IN_PROGRESS' },
    {
      label: 'Inspection',
      done: item?.jobCards.every(
        (card) => !card.requiresIndependentInspection || signoff(card, 'INDEPENDENT_INSPECTION')
      ),
      current: item?.jobCards.some((card) => card.status === 'INSPECTION_REQUIRED')
    },
    {
      label: 'Records Review',
      done: Boolean(technicalRecord.value),
      current: item?.status === 'READY_FOR_RELEASE'
    },
    {
      label: 'Technical Release',
      done: item?.status === 'RELEASED',
      current: section.value === 'release'
    }
  ];
});

const readinessCategories = computed<ReadinessCategory[]>(() => {
  const item = workPackage.value;
  const eligibility = mroEligibility.value;
  const technical = technicalRecord.value;
  const jobCardBlockers =
    eligibility?.sections.jobCards.blockers ??
    item?.releaseEligibility?.blockers.filter((blocker) => blocker.category === 'WORK') ??
    [];
  const inspectionBlockers =
    eligibility?.sections.inspections.blockers ??
    item?.releaseEligibility?.blockers.filter((blocker) =>
      ['INSPECTION', 'REWORK'].includes(blocker.category)
    ) ??
    [];
  const recordBlockers =
    item?.releaseEligibility?.blockers.filter((blocker) => blocker.category === 'RECORD') ?? [];
  const material = eligibility?.sections.material;
  const tools = eligibility?.sections.tools;
  const personnel = eligibility?.sections.personnel;
  const approvedData = eligibility?.sections.approvedData;
  const amo = eligibility?.sections.amoScope;
  const due = eligibility?.sections.dueControl;
  const release = eligibility?.sections.release;
  const openFindings =
    item?.nonRoutineFindings?.filter((finding) => finding.status !== 'CLOSED') ?? [];

  return [
    categoryFrom(
      'work',
      'Work Execution',
      jobCardBlockers,
      [],
      item?.jobCards.length ?? 0,
      workspacePath('execution')
    ),
    {
      key: 'defects',
      label: 'MEL/CDL & Defects',
      status: openFindings.length ? 'BLOCKED' : 'NOT_EVALUATED',
      blockerCount: openFindings.length,
      warningCount: 0,
      criteria: openFindings.length ? '0/1' : '-',
      nextAction: openFindings.length
        ? 'Disposition open findings before release.'
        : 'Run defect readiness check.',
      route: workspacePath('findings')
    },
    categoryFrom(
      'material',
      'Material & Components',
      material?.blockers ?? [],
      material?.warnings ?? [],
      resourceReadiness.value?.material.requirements.length ?? 0,
      workspacePath('resources/materials')
    ),
    categoryFrom(
      'personnel',
      'Personnel',
      personnel?.blockers ?? [],
      personnel?.warnings ?? [],
      resourceReadiness.value?.personnel.requirements.length ?? 0,
      workspacePath('resources/personnel')
    ),
    categoryFrom(
      'tools',
      'Tools & GSE',
      tools?.blockers ?? [],
      tools?.warnings ?? [],
      resourceReadiness.value?.tools.requirements.length ?? 0,
      workspacePath('resources/tools')
    ),
    categoryFrom(
      'technical',
      'Technical Data & Capability',
      [...(approvedData?.blockers ?? []), ...(amo?.blockers ?? []), ...(due?.blockers ?? [])],
      [...(approvedData?.warnings ?? []), ...(amo?.warnings ?? []), ...(due?.warnings ?? [])],
      (item?.jobCards.length ?? 0) + (resourceReadiness.value?.amoScope.scope ? 1 : 0),
      workspacePath('resources/facilities')
    ),
    categoryFrom(
      'inspection',
      'Inspection',
      inspectionBlockers,
      [],
      item?.jobCards.length ?? 0,
      workspacePath('inspection')
    ),
    {
      key: 'records',
      label: 'Technical Records',
      status: technical
        ? technical.releaseGates.some((gate) => ['BLOCKED', 'MISSING'].includes(gate.status))
          ? 'BLOCKED'
          : 'CLEAR'
        : recordBlockers.length
          ? 'BLOCKED'
          : 'NOT_EVALUATED',
      blockerCount:
        technical?.releaseGates.filter((gate) => ['BLOCKED', 'MISSING'].includes(gate.status))
          .length ?? recordBlockers.length,
      warningCount: technical?.releaseGates.filter((gate) => gate.status === 'WARNING').length ?? 0,
      criteria: technical
        ? `${technical.releaseGates.filter((gate) => gate.status === 'COMPLETE').length}/${technical.releaseGates.length}`
        : '-',
      nextAction:
        technical?.nextRequiredActions[0] ??
        recordBlockers[0]?.nextAction ??
        'Open technical record package.',
      route: workspacePath('records')
    },
    categoryFrom(
      'release',
      'Technical Release',
      release?.blockers ?? item?.releaseEligibility?.blockers ?? [],
      release?.warnings ?? item?.releaseEligibility?.warnings ?? [],
      1,
      workspacePath('release')
    )
  ];
});

const requiredActions = computed<RequiredAction[]>(() => {
  const actions: RequiredAction[] = [];
  const pushBlocker = (
    blocker: MroEligibilityBlocker | MaintenanceEligibilityBlockerDto,
    route: string
  ) => {
    actions.push({
      id: `${blocker.code}-${blocker.sourceId ?? actions.length}`,
      title: 'suggestedAction' in blocker ? blocker.title : blocker.title,
      problem: blocker.message,
      owner: ownerForCategory(blocker.category),
      impact: blocker.severity === 'BLOCKING' ? 'Technical release blocker' : 'Operational warning',
      route
    });
  };
  for (const blocker of mroEligibility.value?.blockers ??
    workPackage.value?.releaseEligibility?.blockers ??
    []) {
    pushBlocker(blocker, routeForCategory(blocker.category));
  }
  for (const action of technicalRecord.value?.nextRequiredActions ?? []) {
    actions.push({
      id: `record-${action}`,
      title: 'Technical record action',
      problem: action,
      owner: 'Records Control',
      impact: 'Record package readiness',
      route: workspacePath('records')
    });
  }
  for (const finding of workPackage.value?.nonRoutineFindings ?? []) {
    if (finding.status !== 'CLOSED') {
      actions.push({
        id: finding.id,
        title: finding.nextAction,
        problem: `${finding.findingNumber}: ${finding.title}`,
        owner:
          finding.workflowState === 'WAITING_ASSESSMENT'
            ? 'Maintenance Control'
            : 'Production Supervisor',
        impact: finding.operationalImpact,
        route: workspacePath(`findings/${finding.id}/assessment`)
      });
    }
  }
  return uniqueBy(actions, (item) => item.id).slice(0, 8);
});

const selectedJobCard = computed(() =>
  selectedJobCardId.value
    ? (workPackage.value?.jobCards.find(
        (card) => card.id === selectedJobCardId.value || card.cardNumber === selectedJobCardId.value
      ) ?? null)
    : null
);
const selectedFinding = computed(() =>
  selectedFindingId.value
    ? (workPackage.value?.nonRoutineFindings?.find(
        (finding) => finding.id === selectedFindingId.value
      ) ?? null)
    : null
);
const approvedDataRevisionItems = computed(() =>
  (selectorData.value?.approvedData ?? []).flatMap((document) =>
    document.revisions.map((revision) => ({
      title: `${document.documentType} ${document.documentNumber} / ${revision.revision}`,
      value: revision.id,
      document,
      revision
    }))
  )
);
const materialRequirements = computed(() => resourceReadiness.value?.material.requirements ?? []);
const toolRequirements = computed(() => resourceReadiness.value?.tools.requirements ?? []);
const toolAllocations = computed(() => resourceReadiness.value?.tools.allocations ?? []);
const personnelRequirements = computed(() => resourceReadiness.value?.personnel.requirements ?? []);
const personnelAssignments = computed(() => resourceReadiness.value?.personnel.assignments ?? []);

const canSubmitRelease = computed(
  () =>
    Boolean(workPackage.value) &&
    canIssueRelease.value &&
    workPackage.value?.status === 'READY_FOR_RELEASE' &&
    releaseForm.releaseNumber.trim().length >= 3 &&
    releaseForm.releaseStatement.trim().length >= 20 &&
    Boolean(releaseForm.certifyingLicenseNumber) &&
    Boolean(releaseForm.releasedAt) &&
    evidenceList(releaseForm.evidenceReferences).length > 0
);

function workspacePath(path: string) {
  return `/maintenance/work-packages/${id.value}/${path}`;
}

function statusColor(status: ReadinessStatus) {
  if (status === 'CLEAR') return 'success';
  if (status === 'WARNING') return 'warning';
  if (status === 'BLOCKED' || status === 'EVALUATION_FAILED') return 'error';
  if (status === 'EVALUATING') return 'info';
  return 'secondary';
}

function categoryFrom(
  key: string,
  label: string,
  blockers: Array<MroEligibilityBlocker | MaintenanceEligibilityBlockerDto>,
  warnings: Array<MroEligibilityBlocker | MaintenanceEligibilityBlockerDto>,
  totalCriteria: number,
  routePath: string
): ReadinessCategory {
  const status: ReadinessStatus = blockers.length
    ? 'BLOCKED'
    : warnings.length
      ? 'WARNING'
      : totalCriteria
        ? 'CLEAR'
        : 'NOT_EVALUATED';
  return {
    key,
    label,
    status,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    criteria: totalCriteria
      ? `${Math.max(totalCriteria - blockers.length, 0)}/${totalCriteria}`
      : '-',
    nextAction:
      blockerAction(blockers[0] ?? warnings[0]) ||
      (status === 'CLEAR' ? 'No action required.' : 'Run readiness evaluation.'),
    route: routePath
  };
}

function blockerAction(
  blocker: MroEligibilityBlocker | MaintenanceEligibilityBlockerDto | undefined
) {
  if (!blocker) return '';
  const suggestedAction = (blocker as MroEligibilityBlocker).suggestedAction;
  const nextAction = (blocker as MaintenanceEligibilityBlockerDto).nextAction;
  return suggestedAction ?? nextAction ?? blocker.message;
}

function ownerForCategory(category: string) {
  if (['MATERIAL', 'TOOL', 'TOOLING'].includes(category)) return 'Inventory / Resource Control';
  if (category === 'PERSONNEL' || category === 'AUTHORIZATION') return 'Maintenance Manager';
  if (category === 'RECORD') return 'Records Control';
  if (category === 'INSPECTION' || category === 'REWORK') return 'Independent Inspector';
  if (category === 'AMO_SCOPE' || category === 'APPROVED_DATA') return 'Engineering';
  return 'Production Supervisor';
}

function routeForCategory(category: string) {
  if (category === 'MATERIAL') return workspacePath('resources/materials');
  if (category === 'TOOL' || category === 'TOOLING') return workspacePath('resources/tools');
  if (category === 'PERSONNEL' || category === 'AUTHORIZATION')
    return workspacePath('resources/personnel');
  if (category === 'RECORD') return workspacePath('records');
  if (category === 'INSPECTION' || category === 'REWORK') return workspacePath('inspection');
  if (category === 'AMO_SCOPE' || category === 'APPROVED_DATA')
    return workspacePath('resources/facilities');
  return workspacePath('execution');
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function evidenceList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(value: string | null | undefined) {
  return value ? format.dateTime(value) : '-';
}

function formatDate(value: string | null | undefined) {
  return value ? format.date(value) : '-';
}

function materialForCard(card: MaintenanceJobCardDto): MaintenanceMaterialRequirementDto[] {
  return materialRequirements.value.filter((item) => item.jobCardId === card.id);
}

function toolsForCard(card: MaintenanceJobCardDto): MaintenanceToolRequirementDto[] {
  return toolRequirements.value.filter((item) => item.jobCardId === card.id);
}

function personnelForCard(card: MaintenanceJobCardDto): MaintenancePersonnelRequirementDto[] {
  return personnelRequirements.value.filter((item) => item.jobCardId === card.id);
}

function assignmentsForCard(card: MaintenanceJobCardDto): MaintenancePersonnelAssignmentDto[] {
  const requirementIds = new Set(personnelForCard(card).map((item) => item.id));
  return personnelAssignments.value.filter((item) =>
    requirementIds.has(item.personnelRequirementId)
  );
}

const demoRoleCrewIds: Partial<Record<string, string>> = {
  'Maintenance Manager': 'crew-maintenance-manager',
  'Maintenance Technician': 'crew-maintenance-technician',
  'Certifying Staff': 'crew-certifying-staff'
};

function currentMaintenanceCrewId() {
  return demoRoleCrewIds[session.role.value] ?? null;
}

function newResourceActionKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toolCalibrationState(allocation: MaintenanceToolAllocationV2Dto) {
  if (!allocation.calibrationRequired) return 'NOT_REQUIRED';
  if (!allocation.calibrationExpiresAt) return 'UNKNOWN';
  return new Date(allocation.calibrationExpiresAt) >= new Date() ? 'CURRENT' : 'EXPIRED';
}

async function loadToolCandidates(req: MaintenanceToolRequirementDto) {
  await runAction(`tool-candidates-${req.id}`, async () => {
    toolCandidates.value[req.id] = await resource.fetchToolCandidates(req.id);
  });
}

async function allocateToolCandidate(
  req: MaintenanceToolRequirementDto,
  candidate: MaintenanceToolCandidateDto
) {
  await runAction(`tool-allocate-${req.id}-${candidate.toolId}`, async () => {
    await resource.allocateTool({
      toolRequirementId: req.id,
      toolId: candidate.toolId,
      idempotencyKey: newResourceActionKey('mro-tool-allocate')
    });
    await loadSupplements();
    toolCandidates.value[req.id] = await resource.fetchToolCandidates(req.id);
    actionSuccess.value = 'Tool allocation tersimpan dari endpoint resource.';
  });
}

async function checkoutTool(allocation: MaintenanceToolAllocationV2Dto) {
  await runAction(`tool-custody-${allocation.id}`, async () => {
    const custodianPersonnelId = allocation.custodianPersonnelId || currentMaintenanceCrewId();
    if (!custodianPersonnelId) {
      throw new Error('Role aktif tidak memiliki persona maintenance untuk custody tool.');
    }
    await resource.assignToolCustody({
      allocationId: allocation.id,
      custodianPersonnelId
    });
    actionSuccess.value = 'Tool custody dicatat.';
  });
}

async function returnToolAllocation(allocation: MaintenanceToolAllocationV2Dto) {
  await runAction(`tool-return-${allocation.id}`, async () => {
    await resource.returnTool({
      allocationId: allocation.id,
      returnCondition: 'SERVICEABLE',
      returnNote: 'Tool returned from Work Package resources workspace.',
      idempotencyKey: newResourceActionKey('mro-tool-return')
    });
    actionSuccess.value = 'Tool return dicatat.';
  });
}

async function loadPersonnelCandidates(req: MaintenancePersonnelRequirementDto) {
  await runAction(`personnel-candidates-${req.id}`, async () => {
    personnelCandidates.value[req.id] = await resource.fetchPersonnelCandidates(req.id);
  });
}

async function assignPersonnelCandidate(
  req: MaintenancePersonnelRequirementDto,
  candidate: MaintenancePersonnelCandidateDto
) {
  await runAction(`personnel-assign-${req.id}-${candidate.personnelId}`, async () => {
    await resource.assignPersonnel({
      personnelRequirementId: req.id,
      personnelId: candidate.personnelId,
      idempotencyKey: newResourceActionKey('mro-personnel-assign')
    });
    await loadSupplements();
    personnelCandidates.value[req.id] = await resource.fetchPersonnelCandidates(req.id);
    actionSuccess.value = 'Personnel assignment tersimpan dari endpoint resource.';
  });
}

async function confirmPersonnel(assignment: MaintenancePersonnelAssignmentDto) {
  await runAction(`personnel-confirm-${assignment.id}`, async () => {
    await resource.confirmPersonnelAssignment({
      assignmentId: assignment.id,
      idempotencyKey: newResourceActionKey('mro-personnel-confirm')
    });
    actionSuccess.value = 'Personnel assignment dikonfirmasi.';
  });
}

async function releasePersonnelAssignment(assignment: MaintenancePersonnelAssignmentDto) {
  await runAction(`personnel-release-${assignment.id}`, async () => {
    await resource.releasePersonnel({
      assignmentId: assignment.id,
      reason: 'Released from Work Package resources workspace.',
      idempotencyKey: newResourceActionKey('mro-personnel-release')
    });
    actionSuccess.value = 'Personnel assignment dilepas.';
  });
}

function canCreateNonRoutine(card: MaintenanceJobCardDto) {
  return (
    workflow.canWork.value &&
    !immutablePackage.value &&
    card.status === 'IN_PROGRESS' &&
    !card.sourceNonRoutineFindingId
  );
}

function updateWorkLicense(card: MaintenanceJobCardDto, licenseNumber: string) {
  const form = workflow.workForms[card.id];
  if (form) form.certifyingLicenseNumber = licenseNumber;
}

function updateWorkStatement(card: MaintenanceJobCardDto, statement: string) {
  const form = workflow.workForms[card.id];
  if (form) form.statement = statement;
}

function openNonRoutineDialog(card: MaintenanceJobCardDto) {
  nonRoutineSourceCard.value = card;
  nonRoutineForm.title = '';
  nonRoutineForm.description = '';
  nonRoutineForm.severity = 'NORMAL';
  nonRoutineForm.location = '';
  nonRoutineForm.ataChapter = card.ataChapter ?? '';
  nonRoutineForm.detectedDuring = 'ACTIVE_WORK';
  nonRoutineForm.operationalImpact = 'UNASSESSED';
  nonRoutineForm.findingClassification = 'UNASSESSED';
  nonRoutineForm.melCdlAssessment = 'UNASSESSED';
  nonRoutineForm.immediateAction = '';
  nonRoutineForm.aircraftMovementProhibited = false;
  nonRoutineForm.notifyMaintenanceControl = false;
  nonRoutineForm.requiresInspectorReview = true;
  nonRoutineForm.immediateSafetyConcern = false;
  nonRoutineForm.evidenceReferences = `${card.cardNumber}-NR-EVIDENCE`;
  nonRoutineDialog.value = true;
}

async function runAction(name: string, fn: () => Promise<void>) {
  actionLoading.value = name;
  actionError.value = null;
  actionSuccess.value = '';
  try {
    await fn();
    await refreshWorkspace();
  } catch (errorValue) {
    actionError.value = ui.presentError(errorValue);
  } finally {
    actionLoading.value = '';
  }
}

async function refreshWorkspace() {
  await refresh();
  await loadSupplements();
}

async function loadSupplements() {
  supplementalPending.value = true;
  try {
    const [resourceResult, eligibilityResult, recordResult] = await Promise.allSettled([
      resource.fetchResourceReadiness(),
      resource.fetchMroEligibility(),
      fetchApi<MaintenanceTechnicalRecordPackageDto>(
        `/api/maintenance/work-packages/${id.value}/technical-record`
      )
    ]);
    if (resourceResult.status === 'fulfilled') resourceReadiness.value = resourceResult.value;
    if (eligibilityResult.status === 'fulfilled') mroEligibility.value = eligibilityResult.value;
    if (recordResult.status === 'fulfilled') technicalRecord.value = recordResult.value;
  } finally {
    supplementalPending.value = false;
  }
}

async function submitNonRoutineFinding() {
  if (!nonRoutineSourceCard.value) return;
  const card = nonRoutineSourceCard.value;
  await runAction('create-non-routine', async () => {
    await fetchApi(`/api/maintenance/work-packages/${id.value}/non-routine-findings`, {
      method: 'POST',
      body: {
        sourceJobCardId: card.id,
        title: nonRoutineForm.title,
        description: nonRoutineForm.description,
        severity: nonRoutineForm.severity,
        location: nonRoutineForm.location || null,
        ataChapter: nonRoutineForm.ataChapter || null,
        detectedDuring: nonRoutineForm.detectedDuring,
        operationalImpact: nonRoutineForm.operationalImpact,
        findingClassification: nonRoutineForm.findingClassification,
        melCdlAssessment: nonRoutineForm.melCdlAssessment,
        immediateAction: nonRoutineForm.immediateAction || null,
        aircraftMovementProhibited: nonRoutineForm.aircraftMovementProhibited,
        notifyMaintenanceControl: nonRoutineForm.notifyMaintenanceControl,
        requiresInspectorReview: nonRoutineForm.requiresInspectorReview,
        immediateSafetyConcern: nonRoutineForm.immediateSafetyConcern,
        evidenceReferences: evidenceList(nonRoutineForm.evidenceReferences),
        idempotencyKey: resource.newKey('mro-non-routine')
      }
    });
    nonRoutineDialog.value = false;
    actionSuccess.value = 'Temuan non-routine tercatat dan masuk Findings workspace.';
    await router.push(workspacePath('findings'));
  });
}

function ensureFindingForms(finding: MaintenanceNonRoutineFindingDto) {
  assessmentForms[finding.id] ??= {
    disposition: finding.disposition ?? 'CORRECTIVE_WORK_REQUIRED',
    assessmentNote: finding.assessmentNote ?? `Assessment for ${finding.findingNumber}.`,
    priority: finding.severity,
    requiresIndependentInspection: finding.requiresIndependentInspection,
    approvedDataRef: finding.approvedDataRef ?? ''
  };
  correctiveForms[finding.id] ??= {
    title: finding.title.startsWith('Corrective work -')
      ? finding.title
      : `Corrective work - ${finding.title}`,
    maintenanceDataRef: '',
    maintenanceDataRevision: '',
    approvedDataRevisionId: '',
    mandatoryFlag: true,
    requiresIndependentInspection: finding.requiresIndependentInspection
  };
  resolutionForms[finding.id] ??= {
    note: `Resolution completed for ${finding.findingNumber}.`,
    evidence: `${finding.findingNumber}-RESOLUTION-EVIDENCE`
  };
  closeForms[finding.id] ??= {
    note: `Closure accepted for ${finding.findingNumber}.`,
    evidence: `${finding.findingNumber}-CLOSURE-EVIDENCE`
  };
}

async function assessNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  ensureFindingForms(finding);
  const form = assessmentForms[finding.id]!;
  await runAction(`assess-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/assess`, {
      method: 'POST',
      body: {
        disposition: form.disposition,
        assessmentNote: form.assessmentNote,
        priority: form.priority,
        requiresIndependentInspection: form.requiresIndependentInspection,
        approvedDataRef: form.approvedDataRef || null
      }
    }).then(() => undefined)
  );
}

async function createCorrectiveJobCard(finding: MaintenanceNonRoutineFindingDto) {
  if (!workPackage.value) return;
  ensureFindingForms(finding);
  const form = correctiveForms[finding.id]!;
  await runAction(`corrective-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/corrective-job-card`, {
      method: 'POST',
      body: {
        ...form,
        expectedWorkPackageVersion: workPackage.value!.version
      }
    }).then(() => undefined)
  );
}

function selectCorrectiveApprovedData(findingId: string, revisionId: unknown) {
  const form = correctiveForms[findingId];
  if (!form) return;
  const value = typeof revisionId === 'string' ? revisionId : '';
  const item = approvedDataRevisionItems.value.find((entry) => entry.value === value);
  form.approvedDataRevisionId = value;
  form.maintenanceDataRef = item?.document.documentNumber ?? '';
  form.maintenanceDataRevision = item?.revision.revision ?? '';
}

async function resolveNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  ensureFindingForms(finding);
  const form = resolutionForms[finding.id]!;
  await runAction(`resolve-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/resolve`, {
      method: 'POST',
      body: {
        resolutionNote: form.note,
        evidenceReferences: evidenceList(form.evidence)
      }
    }).then(() => undefined)
  );
}

async function closeNonRoutine(finding: MaintenanceNonRoutineFindingDto) {
  ensureFindingForms(finding);
  const form = closeForms[finding.id]!;
  await runAction(`close-${finding.id}`, () =>
    fetchApi(`/api/maintenance/non-routine-findings/${finding.id}/actions/close`, {
      method: 'POST',
      body: {
        closureNote: form.note,
        evidenceReferences: evidenceList(form.evidence)
      }
    }).then(() => undefined)
  );
}

async function requestRelease() {
  if (!workPackage.value) return;
  await runAction('request-release', () =>
    fetchApi(`/api/maintenance/work-packages/${id.value}/actions/request-release`, {
      method: 'POST',
      body: { expectedVersion: workPackage.value!.version }
    }).then(() => undefined)
  );
}

async function issueRelease() {
  if (!workPackage.value) return;
  await runAction('issue-release', () =>
    fetchApi<MaintenanceWorkPackageDto>(
      `/api/maintenance/work-packages/${id.value}/actions/release`,
      {
        method: 'POST',
        body: {
          expectedVersion: workPackage.value!.version,
          releaseNumber: releaseForm.releaseNumber,
          resultingStatus: releaseForm.resultingStatus,
          releaseStatement: releaseForm.releaseStatement,
          certifyingLicenseNumber: releaseForm.certifyingLicenseNumber,
          releasedAt: releaseForm.releasedAt,
          evidenceReferences: evidenceList(releaseForm.evidenceReferences),
          idempotencyKey: resource.newKey('mro-release')
        }
      }
    ).then((updated) => {
      workPackage.value = updated;
      actionSuccess.value = 'Technical Release selesai dan snapshot backend diperbarui.';
    })
  );
}

watch(
  () => id.value,
  () => {
    resourceReadiness.value = null;
    mroEligibility.value = null;
    technicalRecord.value = null;
    void loadSupplements();
  },
  { immediate: true }
);

watch(
  () => workPackage.value?.id,
  () => {
    const item = workPackage.value;
    releaseForm.releaseNumber = item ? `RTS-${item.packageNumber.replace(/^MWP-/u, '')}` : '';
    releaseForm.releaseStatement = item
      ? `Technical release issued for ${item.packageNumber} after mandatory work, inspection, resource traceability, and technical records were reviewed.`
      : '';
    releaseForm.certifyingLicenseNumber =
      signerLicenses.value.find((license) => license.isUsableNow)?.licenseNumber ||
      signerLicenses.value[0]?.licenseNumber ||
      '';
    releaseForm.releasedAt = new Date().toISOString();
  },
  { immediate: true }
);

watch(
  signerLicenses,
  (licenses) => {
    if (!releaseForm.certifyingLicenseNumber) {
      releaseForm.certifyingLicenseNumber =
        licenses.find((license) => license.isUsableNow)?.licenseNumber ||
        licenses[0]?.licenseNumber ||
        '';
    }
  },
  { immediate: true }
);

watch(
  () => workPackage.value?.nonRoutineFindings,
  (findings) => {
    for (const finding of findings ?? []) ensureFindingForms(finding);
  },
  { immediate: true, deep: true }
);

watch(
  () => nonRoutineForm.immediateSafetyConcern,
  (active) => {
    if (!active) return;
    nonRoutineForm.severity = 'AOG';
    nonRoutineForm.operationalImpact = 'GROUNDING_AOG';
    nonRoutineForm.findingClassification = 'SAFETY_CRITICAL';
    nonRoutineForm.aircraftMovementProhibited = true;
    nonRoutineForm.notifyMaintenanceControl = true;
    nonRoutineForm.requiresInspectorReview = true;
  }
);
</script>

<template>
  <VContainer fluid class="mro-workspace">
    <div class="mro-workspace__topbar">
      <VBtn to="/maintenance/work-packages" prepend-icon="mdi-arrow-left" variant="text">
        Paket Pekerjaan
      </VBtn>
      <VSpacer />
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending || supplementalPending"
        aria-label="Refresh workspace"
        @click="refreshWorkspace"
      />
    </div>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Work Package belum dapat dimuat.
    </VAlert>
    <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
      <strong>{{ actionError.title }}</strong>
      <div>{{ actionError.impact }}</div>
      <div class="text-caption">Langkah berikutnya: {{ actionError.requiredAction }}</div>
    </VAlert>
    <VAlert v-if="actionSuccess" type="success" variant="tonal" class="mb-4">
      {{ actionSuccess }}
    </VAlert>
    <VProgressLinear v-if="pending" indeterminate class="mb-4" />

    <template v-if="workPackage">
      <section class="mro-context">
        <div>
          <div class="text-overline text-primary">Aircraft / Work Package</div>
          <h1>{{ workPackage.title }}</h1>
          <div class="mro-context__meta">
            <VChip size="small" variant="tonal">{{ workPackage.packageNumber }}</VChip>
            <span>{{ workPackage.aircraftRegistrationNumber }}</span>
            <span>{{ workPackage.aircraftType ?? '-' }} / {{ workPackage.aircraftModel ?? '-' }}</span>
          </div>
        </div>
        <div class="mro-context__facts">
          <VChip :color="ui.workPackageStatusColor(workPackage.status)" variant="tonal">
            {{ ui.label(workPackage.status) }}
          </VChip>
          <VChip
            :color="ui.technicalStateColor(workPackage.aircraftTechnicalState)"
            variant="tonal"
          >
            {{ ui.label(workPackage.aircraftTechnicalState) }}
          </VChip>
          <span>Version {{ workPackage.version }}</span>
          <span>{{ formatDateTime(workPackage.updatedAt) }}</span>
        </div>
      </section>

      <section class="mro-decision" :class="`mro-decision--${decision.tone}`">
        <div>
          <div class="mro-decision__label">Decision Status</div>
          <strong>{{ decision.title }}</strong>
          <p>{{ decision.summary }}</p>
        </div>
        <VDivider vertical class="mro-decision__divider" />
        <div>
          <div class="mro-decision__label">Next action</div>
          <strong>{{ decision.nextAction }}</strong>
          <p>
            Actor: {{ session.role.value }} · Data freshness:
            {{ technicalRecord?.freshness.label ?? 'Live backend preview' }}
          </p>
        </div>
      </section>

      <VSlideGroup class="mro-nav" show-arrows>
        <VSlideGroupItem v-for="item in navItems" :key="item.section">
          <VBtn
            class="mro-nav__item"
            :to="item.to"
            :variant="section === item.section ? 'flat' : 'tonal'"
            :color="section === item.section ? 'primary' : undefined"
          >
            {{ item.label }}
            <VBadge v-if="item.count" inline color="error" :content="item.count" />
          </VBtn>
        </VSlideGroupItem>
      </VSlideGroup>

      <section v-if="section === 'overview'" class="mro-view">
        <VRow>
          <VCol cols="12" lg="7">
            <VCard border>
              <VCardTitle>Release Readiness Summary</VCardTitle>
              <VCardText>
                <VTable class="mro-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Blocker</th>
                      <th>Warning</th>
                      <th>Criteria</th>
                      <th>Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="category in readinessCategories" :key="category.key">
                      <td>
                        <NuxtLink :to="category.route">{{ category.label }}</NuxtLink>
                      </td>
                      <td>
                        <VChip :color="statusColor(category.status)" size="small" variant="tonal">
                          {{ category.status.replaceAll('_', ' ') }}
                        </VChip>
                      </td>
                      <td>{{ category.blockerCount }}</td>
                      <td>{{ category.warningCount }}</td>
                      <td>{{ category.criteria }}</td>
                      <td>{{ category.nextAction }}</td>
                    </tr>
                  </tbody>
                </VTable>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" lg="5">
            <VCard border class="mb-4">
              <VCardTitle>Workflow Stepper</VCardTitle>
              <VCardText>
                <div class="mro-stepper">
                  <div
                    v-for="step in workflowSteps"
                    :key="step.label"
                    class="mro-stepper__item"
                    :class="{ 'is-current': step.current, 'is-done': step.done }"
                  >
                    <VIcon
                      :icon="
                        step.done
                          ? 'mdi-check-circle'
                          : step.current
                            ? 'mdi-progress-clock'
                            : 'mdi-circle-outline'
                      "
                    />
                    <span>{{ step.label }}</span>
                  </div>
                </div>
              </VCardText>
            </VCard>
            <VCard border>
              <VCardTitle>Next Required Actions</VCardTitle>
              <VCardText>
                <VList v-if="requiredActions.length" lines="three">
                  <VListItem
                    v-for="action in requiredActions"
                    :key="action.id"
                    :to="action.route"
                    :title="action.title"
                    :subtitle="`${action.problem} · Owner: ${action.owner}`"
                  >
                    <template #append>
                      <VChip size="x-small" variant="tonal">{{ action.impact }}</VChip>
                    </template>
                  </VListItem>
                </VList>
                <VEmptyState
                  v-else
                  title="Tidak ada action aktif"
                  text="Evaluator backend tidak mengembalikan blocker saat ini."
                />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
        <VRow>
          <VCol cols="12" md="4">
            <VCard border>
              <VCardTitle>Workscope</VCardTitle>
              <VCardText>
                <VList density="compact">
                  <VListItem title="Job Card" :subtitle="String(workPackage.jobCards.length)" />
                  <VListItem
                    title="Non-Routine"
                    :subtitle="String(workPackage.nonRoutineFindings?.length ?? 0)"
                  />
                  <VListItem
                    title="Primary defect"
                    :subtitle="workPackage.primaryDefectNumber ?? '-'"
                  />
                </VList>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard border>
              <VCardTitle>Maintenance Window</VCardTitle>
              <VCardText>
                <VList density="compact">
                  <VListItem
                    title="Station"
                    :subtitle="workPackage.currentMaintenanceSlot?.stationCode ?? '-'"
                  />
                  <VListItem
                    title="Facility"
                    :subtitle="workPackage.currentMaintenanceSlot?.facilityName ?? '-'"
                  />
                  <VListItem
                    title="Bay"
                    :subtitle="workPackage.currentMaintenanceSlot?.bayCode ?? '-'"
                  />
                </VList>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard border>
              <VCardTitle>Recent Critical Activity</VCardTitle>
              <VCardText>
                <VList v-if="workPackage.auditRecords?.length" density="compact">
                  <VListItem
                    v-for="record in workPackage.auditRecords.slice(0, 4)"
                    :key="record.id"
                    :title="ui.label(record.action)"
                    :subtitle="`${record.actorRole} · ${formatDateTime(record.occurredAt)}`"
                  />
                </VList>
                <VEmptyState v-else title="Belum ada audit trail" />
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <section v-else-if="section === 'execution'" class="mro-view">
        <VAlert type="info" variant="tonal" class="mb-4">
          Execution hanya untuk Job Card, sign-off, finding capture, dan inspection request.
          Technical release dipindahkan ke Release workspace.
        </VAlert>
        <VCard v-if="selectedJobCard" border class="mb-4">
          <VCardTitle class="d-flex flex-wrap align-center ga-2">
            <span>Job Card Execution</span>
            <VChip size="small" variant="tonal">{{ selectedJobCard.cardNumber }}</VChip>
            <VSpacer />
            <VBtn :to="workspacePath('execution')" variant="text">Kembali ke antrean</VBtn>
          </VCardTitle>
        </VCard>
        <JobCardAddForm
          v-if="!selectedJobCard && canManageJobCards && !immutablePackage"
          :work-package-id="workPackage.id"
          :work-package-version="workPackage.version"
          :approved-data-revision-items="approvedDataRevisionItems"
          :loading="actionLoading === 'add-job-card'"
          @created="refreshWorkspace"
        />
        <VExpansionPanels :model-value="selectedJobCard?.id">
          <JobCardItem
            v-for="card in selectedJobCard ? [selectedJobCard] : workPackage.jobCards"
            :key="card.id"
            :card="card"
            :all-cards="workPackage.jobCards"
            :rework-forms="workflow.reworkForms"
            :work-form="workflow.workForms[card.id]"
            :signer-licenses="signerLicenses"
            :selectors-pending="selectorsPending"
            :immutable="immutablePackage"
            :can-work="workflow.canWork.value"
            :can-sign="workflow.canSignCard(card)"
            :can-inspect="workflow.canInspectCard(card)"
            :self-inspection-blocked="workflow.selfInspectionBlocked(card)"
            :can-create-non-routine="canCreateNonRoutine(card)"
            :work-license-unusable="workflow.workLicenseUnusable(card)"
            :action-loading="workflow.actionLoading.value"
            :authorization-summary="workflow.authorizationSummary"
            :work-signoff-placeholder="workflow.workSignoffPlaceholder(card)"
            :label-of="ui.label"
            :status-color="ui.jobCardStatusColor"
            :format-date-time="formatDateTime"
            :materials="materialForCard(card)"
            :tools="toolsForCard(card)"
            :personnel="personnelForCard(card)"
            :assignments="assignmentsForCard(card)"
            :mechanic-signoff="workflow.signoff(card, 'MECHANIC')"
            :inspection-signoff="workflow.signoff(card, 'INDEPENDENT_INSPECTION')"
            @start="workflow.start(card)"
            @sign-work="workflow.signWork(card)"
            @sign-rework="workflow.signCorrectiveWork($event)"
            @update-work-license="updateWorkLicense(card, $event)"
            @update-work-statement="updateWorkStatement(card, $event)"
            @open-inspection="workflow.openInspectionDialog(card)"
            @create-non-routine="openNonRoutineDialog(card)"
          />
        </VExpansionPanels>
      </section>

      <section v-else-if="section === 'findings'" class="mro-view">
        <VCard border>
          <VCardTitle>Findings & Non-Routine</VCardTitle>
          <VCardText>
            <VEmptyState
              v-if="!workPackage.nonRoutineFindings?.length"
              title="Belum ada temuan non-routine"
            />
            <VList v-else lines="three">
              <VListItem
                v-for="finding in workPackage.nonRoutineFindings"
                :key="finding.id"
                :to="workspacePath(`findings/${finding.id}/assessment`)"
                :title="`${finding.findingNumber} · ${finding.title}`"
                :subtitle="`${ui.label(finding.workflowState)} · ${finding.nextAction}`"
              >
                <template #append>
                  <VChip
                    :color="finding.status === 'CLOSED' ? 'success' : 'warning'"
                    size="small"
                    variant="tonal"
                  >
                    {{ ui.label(finding.status) }}
                  </VChip>
                </template>
              </VListItem>
            </VList>
          </VCardText>
        </VCard>

        <VCard v-if="selectedFinding" border class="mt-4">
          <VCardTitle>Finding Assessment</VCardTitle>
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <div class="text-caption text-medium-emphasis">Observed condition</div>
                <strong>{{ selectedFinding.title }}</strong>
                <p>{{ selectedFinding.description }}</p>
              </VCol>
              <VCol cols="12" md="6">
                <VList density="compact">
                  <VListItem
                    title="Source Job Card"
                    :subtitle="selectedFinding.sourceJobCardNumber ?? '-'"
                  />
                  <VListItem
                    title="Operational impact"
                    :subtitle="ui.label(selectedFinding.operationalImpact)"
                  />
                  <VListItem
                    title="Corrective Job Card"
                    :subtitle="selectedFinding.correctiveJobCardNumber ?? 'Belum dibuat'"
                  />
                </VList>
              </VCol>
            </VRow>

            <template v-if="selectedFinding.workflowState === 'WAITING_ASSESSMENT'">
              <VDivider class="my-4" />
              <VRow>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="assessmentForms[selectedFinding.id].disposition"
                    label="Disposition"
                    :items="[
                      { title: 'Create Non-Routine Job Card', value: 'CORRECTIVE_WORK_REQUIRED' },
                      { title: 'Within approved limit / no action', value: 'NO_ACTION' }
                    ]"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="assessmentForms[selectedFinding.id].priority"
                    label="Priority"
                    :items="['LOW', 'NORMAL', 'HIGH', 'AOG']"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSwitch
                    v-model="assessmentForms[selectedFinding.id].requiresIndependentInspection"
                    label="Independent inspection"
                    color="primary"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="assessmentForms[selectedFinding.id].approvedDataRef"
                    label="Approved data reference"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="assessmentForms[selectedFinding.id].assessmentNote"
                    label="Engineering / maintenance assessment"
                    rows="3"
                  />
                </VCol>
              </VRow>
              <VBtn
                color="primary"
                :disabled="
                  !canAssessNonRoutine ||
                    assessmentForms[selectedFinding.id].assessmentNote.trim().length < 10
                "
                :loading="actionLoading === `assess-${selectedFinding.id}`"
                @click="assessNonRoutine(selectedFinding)"
              >
                Simpan Assessment
              </VBtn>
            </template>

            <template v-else-if="selectedFinding.workflowState === 'CORRECTIVE_WORK_REQUIRED'">
              <VDivider class="my-4" />
              <VRow>
                <VCol cols="12">
                  <VTextField
                    v-model="correctiveForms[selectedFinding.id].title"
                    label="Judul Job Card korektif"
                  />
                </VCol>
                <VCol cols="12">
                  <VSelect
                    :model-value="correctiveForms[selectedFinding.id].approvedDataRevisionId"
                    label="Approved maintenance data"
                    :items="approvedDataRevisionItems"
                    item-title="title"
                    item-value="value"
                    variant="outlined"
                    density="compact"
                    no-data-text="Belum ada approved data demo"
                    @update:model-value="selectCorrectiveApprovedData(selectedFinding.id, $event)"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="correctiveForms[selectedFinding.id].maintenanceDataRef"
                    label="Approved maintenance data reference"
                    readonly
                    variant="outlined"
                    density="compact"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="correctiveForms[selectedFinding.id].maintenanceDataRevision"
                    label="Revision snapshot"
                    readonly
                    variant="outlined"
                    density="compact"
                  />
                </VCol>
              </VRow>
              <VBtn
                color="primary"
                :disabled="
                  !canManageJobCards || !correctiveForms[selectedFinding.id].approvedDataRevisionId
                "
                :loading="actionLoading === `corrective-${selectedFinding.id}`"
                @click="createCorrectiveJobCard(selectedFinding)"
              >
                Buat Job Card Korektif
              </VBtn>
            </template>

            <template v-else-if="selectedFinding.workflowState === 'READY_TO_RESOLVE'">
              <VDivider class="my-4" />
              <VTextarea
                v-model="resolutionForms[selectedFinding.id].note"
                label="Catatan resolusi"
                rows="3"
              />
              <VTextField
                v-model="resolutionForms[selectedFinding.id].evidence"
                label="Evidence resolusi"
              />
              <VBtn
                color="primary"
                :loading="actionLoading === `resolve-${selectedFinding.id}`"
                @click="resolveNonRoutine(selectedFinding)"
              >
                Resolve Temuan
              </VBtn>
            </template>

            <template v-else-if="selectedFinding.workflowState === 'RESOLVED'">
              <VDivider class="my-4" />
              <VTextarea
                v-model="closeForms[selectedFinding.id].note"
                label="Catatan closure"
                rows="3"
              />
              <VTextField
                v-model="closeForms[selectedFinding.id].evidence"
                label="Evidence closure"
              />
              <VBtn
                color="success"
                :loading="actionLoading === `close-${selectedFinding.id}`"
                @click="closeNonRoutine(selectedFinding)"
              >
                Tutup Temuan
              </VBtn>
            </template>

            <VAlert v-else type="info" variant="tonal" class="mt-4">
              {{ selectedFinding.nextAction }}
            </VAlert>
          </VCardText>
        </VCard>
      </section>

      <section v-else-if="section === 'resources'" class="mro-view">
        <div class="mro-subnav">
          <VBtn
            :to="workspacePath('resources/materials')"
            :variant="resourceView === 'materials' ? 'flat' : 'tonal'"
          >
            Material & Components
          </VBtn>
          <VBtn
            :to="workspacePath('resources/tools')"
            :variant="resourceView === 'tools' ? 'flat' : 'tonal'"
          >
            Tools & GSE
          </VBtn>
          <VBtn
            :to="workspacePath('resources/personnel')"
            :variant="resourceView === 'personnel' ? 'flat' : 'tonal'"
          >
            Personnel & Shift
          </VBtn>
          <VBtn
            :to="workspacePath('resources/facilities')"
            :variant="resourceView === 'facilities' ? 'flat' : 'tonal'"
          >
            Facility & Capability
          </VBtn>
        </div>

        <VCard border>
          <VCardTitle>
            {{ navItems.find((item) => item.section === 'resources')?.label }} ·
            {{ resourceView }}
          </VCardTitle>
          <VCardText>
            <VProgressLinear v-if="supplementalPending" indeterminate class="mb-4" />

            <VTable v-if="resourceView === 'materials'" class="mro-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Part</th>
                  <th>Required</th>
                  <th>Reserved</th>
                  <th>Issued</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in materialRequirements" :key="item.id">
                  <td>{{ item.id }}</td>
                  <td>{{ item.partNumber ?? item.partName ?? '-' }}</td>
                  <td>{{ item.requiredQuantity }}</td>
                  <td>{{ item.reservedQuantity }}</td>
                  <td>{{ item.issuedQuantity }}</td>
                  <td>{{ ui.label(item.status) }}</td>
                </tr>
              </tbody>
            </VTable>

            <template v-else-if="resourceView === 'tools'">
              <h2 class="text-subtitle-1 mb-3">Tool Requirements</h2>
              <VTable v-if="toolRequirements.length" class="mro-table">
                <thead>
                  <tr>
                    <th>Tool Code</th>
                    <th>Tool Name</th>
                    <th>Qty Required</th>
                    <th>Station</th>
                    <th>Required From</th>
                    <th>Required Until</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="req in toolRequirements" :key="req.id">
                    <tr>
                      <td>{{ req.toolCode || req.toolMasterId || req.toolType || '-' }}</td>
                      <td>{{ req.toolName || req.toolType || '-' }}</td>
                      <td>{{ req.quantity }}</td>
                      <td>{{ req.requiredStationId }}</td>
                      <td>{{ formatDate(req.requiredFrom) }}</td>
                      <td>{{ formatDate(req.requiredUntil) }}</td>
                      <td>
                        <VChip size="small" variant="tonal">{{ req.status }}</VChip>
                      </td>
                      <td>
                        <VBtn
                          size="small"
                          variant="tonal"
                          :loading="actionLoading === `tool-candidates-${req.id}`"
                          @click="loadToolCandidates(req)"
                        >
                          Kandidat
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="toolCandidates[req.id]?.length">
                      <td colspan="8">
                        <VTable density="compact" class="bg-transparent">
                          <thead>
                            <tr>
                              <th>Tool</th>
                              <th>Serial</th>
                              <th>Kalibrasi</th>
                              <th>Ketersediaan</th>
                              <th>Eligibility</th>
                              <th>Alasan</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="candidate in toolCandidates[req.id]" :key="candidate.toolId">
                              <td>{{ candidate.toolCode }} / {{ candidate.toolName }}</td>
                              <td>{{ candidate.serialNumber || '-' }}</td>
                              <td>
                                {{
                                  candidate.calibrationExpiresAt
                                    ? formatDate(candidate.calibrationExpiresAt)
                                    : 'Tidak ada'
                                }}
                              </td>
                              <td>
                                <VChip size="x-small" variant="tonal">
                                  {{
                                    candidate.availabilityStatus
                                  }}
                                </VChip>
                              </td>
                              <td>
                                <VChip size="x-small" variant="tonal">
                                  {{
                                    candidate.eligibilityStatus
                                  }}
                                </VChip>
                              </td>
                              <td class="text-caption">
                                {{ candidate.reasons.join(', ') || '-' }}
                              </td>
                              <td>
                                <VBtn
                                  size="small"
                                  color="primary"
                                  :disabled="candidate.eligibilityStatus !== 'ELIGIBLE'"
                                  :loading="
                                    actionLoading === `tool-allocate-${req.id}-${candidate.toolId}`
                                  "
                                  @click="allocateToolCandidate(req, candidate)"
                                >
                                  Allocate
                                </VBtn>
                              </td>
                            </tr>
                          </tbody>
                        </VTable>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </VTable>
              <VAlert v-else type="info" variant="tonal">
                No tool requirements found for this work package.
              </VAlert>

              <VCard v-if="toolAllocations.length" border class="mt-4">
                <VCardTitle class="text-subtitle-1">Tool Allocations</VCardTitle>
                <VCardText>
                  <VTable class="mro-table">
                    <thead>
                      <tr>
                        <th>Tool</th>
                        <th>Serial #</th>
                        <th>Calibration Status</th>
                        <th>Custodian</th>
                        <th>Status</th>
                        <th>Allocated At</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="alloc in toolAllocations" :key="alloc.id">
                        <td>{{ alloc.toolCode || alloc.toolId }}</td>
                        <td>{{ alloc.toolSerialNumber || '-' }}</td>
                        <td>
                          <VChip size="x-small" variant="tonal">
                            {{
                              toolCalibrationState(alloc)
                            }}
                          </VChip>
                        </td>
                        <td>{{ alloc.custodianName || alloc.custodianPersonnelId || '-' }}</td>
                        <td>
                          <VChip size="x-small" variant="tonal">{{ alloc.status }}</VChip>
                        </td>
                        <td>{{ formatDate(alloc.allocatedAt) }}</td>
                        <td>
                          <div class="d-flex flex-wrap ga-2">
                            <VBtn
                              v-if="alloc.status === 'ALLOCATED'"
                              size="x-small"
                              variant="tonal"
                              :loading="actionLoading === `tool-custody-${alloc.id}`"
                              @click="checkoutTool(alloc)"
                            >
                              Check Out
                            </VBtn>
                            <VBtn
                              v-if="alloc.status === 'IN_USE'"
                              size="x-small"
                              color="primary"
                              :loading="actionLoading === `tool-return-${alloc.id}`"
                              @click="returnToolAllocation(alloc)"
                            >
                              Return
                            </VBtn>
                            <span
                              v-if="!['ALLOCATED', 'IN_USE'].includes(alloc.status)"
                              class="text-caption text-medium-emphasis"
                            >
                              Riwayat
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </template>

            <template v-else-if="resourceView === 'personnel'">
              <h2 class="text-subtitle-1 mb-3">Personnel Requirements</h2>
              <VTable v-if="personnelRequirements.length" class="mro-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>License Type</th>
                    <th>Qty Required</th>
                    <th>Qty Assigned</th>
                    <th>Station</th>
                    <th>Required From</th>
                    <th>Required Until</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="req in personnelRequirements" :key="req.id">
                    <tr>
                      <td>{{ req.roleType }}</td>
                      <td>{{ req.requiredLicenceType || '-' }}</td>
                      <td>{{ req.requiredCount }}</td>
                      <td>{{ req.assignedCount }}</td>
                      <td>{{ req.dutyStationId }}</td>
                      <td>{{ formatDate(req.requiredFrom) }}</td>
                      <td>{{ formatDate(req.requiredUntil) }}</td>
                      <td>
                        <VChip size="small" variant="tonal">{{ req.status }}</VChip>
                      </td>
                      <td>
                        <VBtn
                          size="small"
                          variant="tonal"
                          :loading="actionLoading === `personnel-candidates-${req.id}`"
                          @click="loadPersonnelCandidates(req)"
                        >
                          Kandidat
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="personnelCandidates[req.id]?.length">
                      <td colspan="9">
                        <VTable density="compact" class="bg-transparent">
                          <thead>
                            <tr>
                              <th>Personel</th>
                              <th>Lisensi</th>
                              <th>PT AMA Auth</th>
                              <th>Ketersediaan</th>
                              <th>Eligibility</th>
                              <th>Alasan</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="candidate in personnelCandidates[req.id]"
                              :key="candidate.personnelId"
                            >
                              <td>{{ candidate.personnelName }}</td>
                              <td>{{ candidate.licenceReference || '-' }}</td>
                              <td>{{ candidate.authorizationReference || '-' }}</td>
                              <td>
                                <VChip size="x-small" variant="tonal">
                                  {{
                                    candidate.availabilityStatus
                                  }}
                                </VChip>
                              </td>
                              <td>
                                <VChip size="x-small" variant="tonal">
                                  {{
                                    candidate.eligibilityStatus
                                  }}
                                </VChip>
                              </td>
                              <td class="text-caption">
                                {{ candidate.reasons.join(', ') || '-' }}
                              </td>
                              <td>
                                <VBtn
                                  size="small"
                                  color="primary"
                                  :disabled="candidate.eligibilityStatus !== 'ELIGIBLE'"
                                  :loading="
                                    actionLoading ===
                                      `personnel-assign-${req.id}-${candidate.personnelId}`
                                  "
                                  @click="assignPersonnelCandidate(req, candidate)"
                                >
                                  Assign
                                </VBtn>
                              </td>
                            </tr>
                          </tbody>
                        </VTable>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </VTable>
              <VAlert v-else type="info" variant="tonal">
                No personnel requirements found for this work package.
              </VAlert>

              <VCard v-if="personnelAssignments.length" border class="mt-4">
                <VCardTitle class="text-subtitle-1">Personnel Assignments</VCardTitle>
                <VCardText>
                  <VTable class="mro-table">
                    <thead>
                      <tr>
                        <th>Personnel</th>
                        <th>Role</th>
                        <th>License</th>
                        <th>Eligibility</th>
                        <th>Status</th>
                        <th>Assigned At</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="assign in personnelAssignments" :key="assign.id">
                        <td>{{ assign.personnelName || assign.personnelId }}</td>
                        <td>{{ assign.roleType }}</td>
                        <td>{{ assign.licenceNumber || '-' }}</td>
                        <td>
                          <VChip size="x-small" variant="tonal">
                            {{
                              assign.eligibilityStatus || 'PENDING'
                            }}
                          </VChip>
                        </td>
                        <td>
                          <VChip size="x-small" variant="tonal">{{ assign.status }}</VChip>
                        </td>
                        <td>{{ formatDate(assign.assignedAt) }}</td>
                        <td>
                          <div class="d-flex flex-wrap ga-2">
                            <VBtn
                              v-if="assign.status === 'ASSIGNED'"
                              size="x-small"
                              variant="tonal"
                              :disabled="assign.eligibilityStatus !== 'ELIGIBLE'"
                              :loading="actionLoading === `personnel-confirm-${assign.id}`"
                              @click="confirmPersonnel(assign)"
                            >
                              Confirm
                            </VBtn>
                            <VBtn
                              v-if="['ASSIGNED', 'CONFIRMED'].includes(assign.status)"
                              size="x-small"
                              color="error"
                              variant="tonal"
                              :loading="actionLoading === `personnel-release-${assign.id}`"
                              @click="releasePersonnelAssignment(assign)"
                            >
                              Release
                            </VBtn>
                            <span
                              v-if="!['ASSIGNED', 'CONFIRMED'].includes(assign.status)"
                              class="text-caption text-medium-emphasis"
                            >
                              Riwayat
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VCard>
            </template>

            <VList v-else>
              <VListItem
                title="MRO Eligibility"
                :subtitle="
                  mroEligibility?.eligible
                    ? 'Resource readiness terpenuhi'
                    : 'Resource readiness belum terpenuhi'
                "
              />
              <VListItem
                title="AMO Organization"
                :subtitle="resourceReadiness?.amoScope.organizationName ?? 'Belum ditautkan'"
              />
              <VListItem
                title="Scope"
                :subtitle="
                  resourceReadiness?.amoScope.scope
                    ? `${resourceReadiness.amoScope.scope.maintenanceAction} · ${resourceReadiness.amoScope.scope.rating}`
                    : 'Belum tersedia'
                "
              />
              <VListItem
                title="Current facility"
                :subtitle="workPackage.currentMaintenanceSlot?.facilityName ?? 'Belum ada slot'"
              />
              <VListItem
                title="Capability status"
                :subtitle="resourceReadiness?.amoScope.ready ? 'Ready' : 'Blocked or not evaluated'"
              />
            </VList>
          </VCardText>
        </VCard>
      </section>

      <section v-else-if="section === 'records'" class="mro-view">
        <div class="mro-subnav">
          <VBtn
            :to="workspacePath('records')"
            :variant="recordView === 'summary' ? 'flat' : 'tonal'"
          >
            Records Review
          </VBtn>
          <VBtn
            :to="workspacePath('records/configuration')"
            :variant="recordView === 'configuration' ? 'flat' : 'tonal'"
          >
            Configuration
          </VBtn>
          <VBtn
            :to="workspacePath('records/amendments')"
            :variant="recordView === 'amendments' ? 'flat' : 'tonal'"
          >
            Amendments
          </VBtn>
        </div>
        <VCard border>
          <VCardTitle>Technical Records</VCardTitle>
          <VCardText v-if="technicalRecord">
            <VAlert
              :type="technicalRecord.decisionSummary.canIssueRelease ? 'success' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              <strong>{{ technicalRecord.decisionSummary.title }}</strong>
              <div>{{ technicalRecord.decisionSummary.subtitle }}</div>
            </VAlert>
            <VTable v-if="recordView === 'summary'" class="mro-table">
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="gate in technicalRecord.releaseGates" :key="gate.key">
                  <td>{{ gate.label }}</td>
                  <td>
                    <VChip size="small" variant="tonal">{{ gate.status }}</VChip>
                  </td>
                  <td>{{ gate.summary }}</td>
                  <td>{{ gate.nextAction ?? '-' }}</td>
                </tr>
              </tbody>
            </VTable>
            <VList v-else-if="recordView === 'configuration'">
              <VListItem title="Aircraft" :subtitle="workPackage.aircraftRegistrationNumber" />
              <VListItem
                title="Material traceability rows"
                :subtitle="String(technicalRecord.evidence.materialTraceability.length)"
              />
              <VListItem
                title="Configuration gate"
                :subtitle="
                  technicalRecord.releaseGates.find((gate) => gate.key === 'TRACEABILITY')
                    ?.summary ?? '-'
                "
              />
            </VList>
            <VList v-else>
              <VListItem
                title="Amendment workflow"
                subtitle="Dedicated signed amendment command is not available in this slice."
              />
              <VListItem
                title="Record corrections"
                subtitle="Use returned gate next actions and existing record review process."
              />
            </VList>
          </VCardText>
        </VCard>
      </section>

      <section v-else-if="section === 'inspection'" class="mro-view">
        <VCard border>
          <VCardTitle>Inspection Workspace</VCardTitle>
          <VCardText>
            <VList lines="three">
              <VListItem
                v-for="card in workPackage.jobCards.filter(
                  (item) => item.requiresIndependentInspection || item.inspectionAttempts.length
                )"
                :key="card.id"
                :title="`${card.cardNumber} · ${card.title}`"
                :subtitle="`${ui.label(card.status)} · ${card.inspectionAttempts.length} inspection records`"
              >
                <template #append>
                  <VBtn
                    v-if="workflow.canInspectCard(card)"
                    size="small"
                    color="primary"
                    :loading="workflow.actionLoading.value === `inspect-${card.id}`"
                    @click="workflow.openInspectionDialog(card)"
                  >
                    Catat Inspection
                  </VBtn>
                  <VBtn
                    v-else
                    size="small"
                    variant="tonal"
                    :to="workspacePath(`execution/job-cards/${card.id}`)"
                  >
                    Buka Job Card
                  </VBtn>
                </template>
              </VListItem>
            </VList>
          </VCardText>
        </VCard>
      </section>

      <section v-else-if="section === 'release'" class="mro-view">
        <VCard border>
          <VCardTitle>Technical Release</VCardTitle>
          <VCardText>
            <VAlert
              :type="decision.tone === 'success' ? 'success' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              <strong>{{ decision.title }}</strong>
              <div>{{ decision.summary }}</div>
            </VAlert>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField v-model="releaseForm.releaseNumber" label="Release number" />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.resultingStatus"
                  label="Resulting aircraft status"
                  :items="[
                    { title: 'Serviceable', value: 'SERVICEABLE' },
                    {
                      title: 'Serviceable with restrictions',
                      value: 'SERVICEABLE_WITH_RESTRICTIONS'
                    }
                  ]"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="releaseForm.certifyingLicenseNumber"
                  label="Certifying license"
                  :items="signerLicenses"
                  item-value="licenseNumber"
                  :item-title="(license) => `${license.personnelName} / ${license.licenseNumber}`"
                  :loading="selectorsPending"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField v-model="releaseForm.releasedAt" label="Released at" />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="releaseForm.releaseStatement"
                  label="Controlled release statement"
                  rows="4"
                />
              </VCol>
              <VCol cols="12">
                <VTextField v-model="releaseForm.evidenceReferences" label="Evidence references" />
              </VCol>
            </VRow>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                variant="tonal"
                :disabled="!canRequestRelease || immutablePackage"
                :loading="actionLoading === 'request-release'"
                @click="requestRelease"
              >
                Request Release Review
              </VBtn>
              <VBtn
                color="primary"
                :disabled="!canSubmitRelease"
                :loading="actionLoading === 'issue-release'"
                @click="issueRelease"
              >
                Authenticate and Issue Technical Release
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </section>
    </template>

    <InspectionDialog
      :model-value="workflow.inspectionDialog.value"
      :card="workflow.inspectionCard.value"
      :result="workflow.inspectionResult.value"
      :confirmed="workflow.inspectionConfirmed.value"
      :idempotency-key="workflow.inspectionIdempotencyKey.value"
      :form="workflow.inspectionForm"
      :signer-licenses="signerLicenses"
      :selectors-pending="selectorsPending"
      :authorization-summary="workflow.authorizationSummary"
      :is-rework="
        Boolean(workflow.inspectionCard.value && activeRework(workflow.inspectionCard.value))
      "
      :can-submit="workflow.canSubmitInspection.value"
      :loading="
        workflow.inspectionCard.value
          ? workflow.actionLoading.value === `inspect-${workflow.inspectionCard.value.id}`
          : false
      "
      :failed-result="workflow.failedInspectionResult.value"
      :license-unusable="workflow.inspectorLicenseUnusable()"
      @update:model-value="workflow.inspectionDialog.value = $event"
      @update:result="workflow.inspectionResult.value = $event"
      @update:confirmed="workflow.inspectionConfirmed.value = $event"
      @submit="workflow.submitInspection()"
    />

    <VDialog v-model="nonRoutineDialog" max-width="820" scrollable>
      <VCard class="non-routine-dialog">
        <VCardTitle class="d-flex align-start ga-3">
          <div>
            <h2 class="text-h6 mb-0">Record Non-Routine Finding</h2>
            <div class="text-body-2 text-medium-emphasis">
              Initial capture only. Assessment and disposition happen in Findings workspace.
            </div>
          </div>
          <VSpacer />
          <VBtn
            icon="mdi-close"
            variant="text"
            aria-label="Tutup modal temuan non-routine"
            @click="nonRoutineDialog = false"
          />
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="nonRoutineSourceCard" type="info" variant="tonal" class="mb-4">
            Source: {{ nonRoutineSourceCard.cardNumber }} · {{ nonRoutineSourceCard.title }}
          </VAlert>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="nonRoutineForm.title" label="Judul temuan" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="nonRoutineForm.severity"
                label="Prioritas"
                :items="['LOW', 'NORMAL', 'HIGH', 'AOG']"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="nonRoutineForm.description" label="Observed condition" rows="3" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="nonRoutineForm.location" label="Location / system" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="nonRoutineForm.ataChapter" label="ATA" />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="nonRoutineForm.operationalImpact"
                label="Operational impact"
                :items="[
                  { title: 'Unassessed', value: 'UNASSESSED' },
                  { title: 'No release impact', value: 'NO_RELEASE_IMPACT' },
                  { title: 'Maintenance only', value: 'MAINTENANCE_ONLY' },
                  { title: 'Operational limitation', value: 'OPERATIONAL_LIMITATION' },
                  { title: 'MEL/CDL candidate', value: 'MEL_CDL_CANDIDATE' },
                  { title: 'Grounding / AOG', value: 'GROUNDING_AOG' }
                ]"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="nonRoutineForm.findingClassification"
                label="Finding classification"
                :items="[
                  { title: 'Unassessed', value: 'UNASSESSED' },
                  { title: 'Safety critical', value: 'SAFETY_CRITICAL' },
                  { title: 'Grounding', value: 'GROUNDING' },
                  { title: 'MEL/CDL candidate', value: 'MEL_CDL_CANDIDATE' },
                  { title: 'Operational limitation', value: 'OPERATIONAL_LIMITATION' },
                  { title: 'Maintenance only', value: 'MAINTENANCE_ONLY' },
                  { title: 'Cosmetic', value: 'COSMETIC' }
                ]"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSelect
                v-model="nonRoutineForm.melCdlAssessment"
                label="MEL/CDL assessment"
                :items="['UNASSESSED', 'CANDIDATE', 'NOT_APPLICABLE', 'APPROVED_FOR_DEFER']"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="nonRoutineForm.immediateAction"
                label="Immediate action"
                rows="2"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="nonRoutineForm.immediateSafetyConcern"
                label="Immediate safety concern"
                color="error"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="nonRoutineForm.aircraftMovementProhibited"
                label="Aircraft movement prohibited"
                color="error"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VSwitch
                v-model="nonRoutineForm.notifyMaintenanceControl"
                label="Notify Maintenance Control"
                color="primary"
              />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="nonRoutineForm.evidenceReferences" label="Evidence references" />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="nonRoutineDialog = false">Tutup</VBtn>
          <VBtn
            color="warning"
            :disabled="
              nonRoutineForm.title.trim().length < 5 ||
                nonRoutineForm.description.trim().length < 10
            "
            :loading="actionLoading === 'create-non-routine'"
            @click="submitNonRoutineFinding"
          >
            Record Finding
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.mro-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mro-workspace__topbar,
.mro-context,
.mro-decision,
.mro-subnav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.mro-context,
.mro-decision {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
}

.mro-context {
  justify-content: space-between;
}

.mro-context h1 {
  margin: 0;
  font-size: 1.55rem;
  line-height: 1.25;
}

.mro-context__meta,
.mro-context__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.mro-context__facts {
  justify-content: flex-end;
}

.mro-decision {
  justify-content: space-between;
  border-left: 5px solid rgb(var(--v-theme-primary));
}

.mro-decision--success {
  border-left-color: rgb(var(--v-theme-success));
}

.mro-decision--warning {
  border-left-color: rgb(var(--v-theme-warning));
}

.mro-decision--error {
  border-left-color: rgb(var(--v-theme-error));
}

.mro-decision__label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
  text-transform: uppercase;
}

.mro-decision strong {
  display: block;
  font-size: 1.1rem;
}

.mro-decision p {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.mro-nav {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-bottom: 8px;
}

.mro-nav__item,
.mro-subnav .v-btn {
  margin-right: 8px;
}

.mro-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mro-table {
  min-width: 760px;
}

.mro-stepper {
  display: grid;
  gap: 10px;
}

.mro-stepper__item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.mro-stepper__item.is-current {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.mro-stepper__item.is-done {
  color: rgb(var(--v-theme-success));
}

@media (max-width: 760px) {
  .mro-context,
  .mro-decision {
    align-items: flex-start;
  }

  .mro-decision__divider {
    display: none;
  }

  .mro-table {
    min-width: 640px;
  }
}
</style>
