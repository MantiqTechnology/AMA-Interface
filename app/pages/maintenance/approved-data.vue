<script setup lang="ts">
import type {
  MaintenanceApprovedDataDocumentDto,
  MaintenanceApprovedDataRevisionDto
} from '#shared/features/maintenance';

type LibraryLifecycle =
  | 'Draft'
  | 'Uploaded'
  | 'Metadata Review'
  | 'Technical Review'
  | 'Approval Review'
  | 'Approved'
  | 'Scheduled for Effectivity'
  | 'Current'
  | 'Superseded'
  | 'Withdrawn'
  | 'Archived';
type ApplicabilityState = 'VERIFIED' | 'REVIEW_REQUIRED' | 'CONDITIONAL' | 'UNRESOLVED';
type QuickFilter =
  'ALL' | 'CURRENT' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'SUPERSEDED' | 'USED_ACTIVE_JC';
type UploadStep = 'Upload file' | 'Metadata review' | 'Technical review' | 'Impact review';

type EnrichedApprovedDataDocument = MaintenanceApprovedDataDocumentDto & {
  ataChapter: string;
  aircraftType: string;
  owner: string;
  sourceOrganization: string;
  activeRevisionLabel: string;
  lifecycle: LibraryLifecycle;
  lifecycleNote: string;
  lifecycleIcon: string;
  lifecycleColor: string;
  applicabilityState: ApplicabilityState;
  applicabilityLabel: string;
  applicabilitySummary: string;
  aircraftApplicable: number;
  aircraftConditional: number;
  aircraftNotApplicable: number;
  aircraftUnresolved: number;
  activeJobCards: number;
  historicalJobCards: number;
  revisionImpactPending: number;
  offlinePackagesAffected: number;
  committedWorkPackagesAffected: number;
  effectiveDate: string | null;
  issueDate: string;
  supersedes: string;
  approvalBasis: string;
  approvedBy: string;
  approvalDate: string;
  controlStatus: string;
  fileName: string;
  fileSize: string;
  previewUrl: string | null;
  revisionHistory: Array<{ revision: string; status: string; date: string; note: string }>;
  usageRows: Array<{ jobCard: string; workPackage: string; state: string; decision: string }>;
  auditRows: Array<{ actor: string; action: string; at: string }>;
  impactActions: string[];
};

const format = useLocaleFormat();

const { data, pending, error, refresh } = await useAsyncData('maintenance-approved-data', () =>
  fetchApi<MaintenanceApprovedDataDocumentDto[]>('/api/maintenance/approved-data')
);

const search = ref('');
const typeFilter = ref('ALL');
const lifecycleFilter = ref('ALL');
const aircraftTypeFilter = ref('ALL');
const applicabilityFilter = ref('ALL');
const ataFilter = ref('ALL');
const sourceFilter = ref('ALL');
const ownerFilter = ref('ALL');
const effectiveDateFilter = ref('ALL');
const quickFilter = ref<QuickFilter>('ALL');
const selectedDocumentId = ref<string | null>(null);
const detailTab = ref('overview');
const uploadDialog = ref(false);
const addDocumentDialog = ref(false);
const previewDialog = ref(false);
const uploadStep = ref<UploadStep>('Upload file');
const queuedRevision = ref(false);
const draftDocumentQueued = ref(false);
const uploadForm = reactive({
  documentId: '',
  revision: '',
  fileName: 'AMA-MROV2-AMM-001-REV43.pdf',
  effectivity: '2026-09-15'
});
const newDocumentForm = reactive({
  documentNumber: 'AMA-MROV2-WDM-002',
  title: 'C208B Wiring Diagram Manual - Avionics Harness',
  documentType: 'WDM',
  owner: 'Engineering Dept.'
});

const lifecycleOptions: LibraryLifecycle[] = [
  'Draft',
  'Uploaded',
  'Metadata Review',
  'Technical Review',
  'Approval Review',
  'Approved',
  'Scheduled for Effectivity',
  'Current',
  'Superseded',
  'Withdrawn',
  'Archived'
];
const approvedDocumentTypeOptions: MaintenanceApprovedDataDocumentDto['documentType'][] = [
  'AMM',
  'IPC',
  'SRM',
  'WDM',
  'CMM',
  'MPD',
  'AD',
  'SB',
  'STANDARD_PRACTICE',
  'OTHER'
];
const uploadSteps: UploadStep[] = [
  'Upload file',
  'Metadata review',
  'Technical review',
  'Impact review'
];

const demoOverlayDocuments = computed<EnrichedApprovedDataDocument[]>(() => [
  enrichDocument(
    data.value?.find((document) => document.documentType === 'AMM') ??
      syntheticDocument(
        'mdata-doc-ui-amm',
        'AMM',
        'AMA-MROV2-AMM-001',
        'C208B Aircraft Maintenance Manual'
      ),
    {
      ataChapter: 'All',
      aircraftType: 'C208B',
      owner: 'Engineering Dept.',
      sourceOrganization: 'Aircraft Manufacturer',
      activeRevisionLabel: 'REV 42',
      lifecycle: 'Current',
      lifecycleNote: 'Approved',
      applicabilityState: 'VERIFIED',
      applicabilityLabel: 'VERIFIED',
      applicabilitySummary: 'C208B MSN 100-450',
      aircraftApplicable: 6,
      aircraftConditional: 2,
      aircraftNotApplicable: 0,
      aircraftUnresolved: 0,
      activeJobCards: 4,
      historicalJobCards: 12,
      revisionImpactPending: queuedRevision.value ? 4 : 0,
      offlinePackagesAffected: queuedRevision.value ? 2 : 0,
      committedWorkPackagesAffected: queuedRevision.value ? 1 : 0,
      issueDate: '2026-07-15',
      supersedes: 'Revision 41',
      approvalBasis: 'Approved Source Data',
      approvedBy: 'Chief Engineer',
      approvalDate: '2026-07-14',
      fileName: 'AMA-MROV2-AMM-001-REV42.pdf',
      fileSize: '45.2 MB',
      impactActions: [
        'Continue Using Frozen Revision',
        'Update Before Execution',
        'Stop Work and Review'
      ]
    }
  ),
  enrichDocument(
    data.value?.find((document) => document.documentType === 'IPC') ??
      syntheticDocument(
        'mdata-doc-ui-ipc',
        'IPC',
        'AMA-MROV2-IPC-001',
        'C208B Illustrated Parts Catalogue'
      ),
    {
      ataChapter: 'All',
      aircraftType: 'C208B',
      owner: 'Document Control',
      sourceOrganization: 'Aircraft Manufacturer',
      activeRevisionLabel: 'REV 16',
      lifecycle: 'Technical Review',
      lifecycleNote: 'Engineering',
      applicabilityState: 'REVIEW_REQUIRED',
      applicabilityLabel: 'REVIEW REQUIRED',
      applicabilitySummary: 'Mapping incomplete',
      aircraftApplicable: 0,
      aircraftConditional: 0,
      aircraftNotApplicable: 0,
      aircraftUnresolved: 2,
      activeJobCards: 0,
      historicalJobCards: 0,
      revisionImpactPending: 0,
      offlinePackagesAffected: 0,
      committedWorkPackagesAffected: 0,
      issueDate: '2026-08-10',
      supersedes: 'Not effective',
      approvalBasis: 'Pending technical review',
      approvedBy: 'Unassigned',
      approvalDate: '-',
      fileName: 'AMA-MROV2-IPC-001-REV16.pdf',
      fileSize: '18.7 MB',
      impactActions: ['Not Affected']
    }
  ),
  enrichDocument(
    data.value?.find((document) => document.documentType === 'SRM') ??
      syntheticDocument(
        'mdata-doc-ui-srm',
        'SRM',
        'AMA-MROV2-SRM-001',
        'C208B Structural Repair Manual'
      ),
    {
      ataChapter: '51',
      aircraftType: 'C208B',
      owner: 'Engineering Dept.',
      sourceOrganization: 'Aircraft Manufacturer',
      activeRevisionLabel: 'REV 12',
      lifecycle: 'Superseded',
      lifecycleNote: 'Rev 13 Current',
      applicabilityState: 'VERIFIED',
      applicabilityLabel: 'VERIFIED',
      applicabilitySummary: 'C208B MSN 100-450',
      aircraftApplicable: 6,
      aircraftConditional: 0,
      aircraftNotApplicable: 0,
      aircraftUnresolved: 0,
      activeJobCards: 2,
      historicalJobCards: 8,
      revisionImpactPending: 0,
      offlinePackagesAffected: 0,
      committedWorkPackagesAffected: 0,
      issueDate: '2026-06-04',
      supersedes: 'Superseded by Rev 13',
      approvalBasis: 'Manufacturer revision',
      approvedBy: 'Chief Engineer',
      approvalDate: '2026-06-03',
      fileName: 'AMA-MROV2-SRM-001-REV12.pdf',
      fileSize: '32.8 MB',
      impactActions: ['Reissue Job Card']
    }
  ),
  enrichDocument(
    syntheticDocument(
      'mdata-doc-ui-opr',
      'STANDARD_PRACTICE',
      'AMA-OPR-PROC-001',
      'Operator Maintenance Procedure - Tire Change'
    ),
    {
      ataChapter: '32',
      aircraftType: 'C208B',
      owner: 'Quality Assurance',
      sourceOrganization: 'AMA Approval',
      activeRevisionLabel: 'REV 05',
      lifecycle: 'Current',
      lifecycleNote: 'Approved',
      applicabilityState: 'VERIFIED',
      applicabilityLabel: 'VERIFIED',
      applicabilitySummary: 'All C208B fleet',
      aircraftApplicable: 6,
      aircraftConditional: 0,
      aircraftNotApplicable: 0,
      aircraftUnresolved: 0,
      activeJobCards: 3,
      historicalJobCards: 7,
      revisionImpactPending: 0,
      offlinePackagesAffected: 0,
      committedWorkPackagesAffected: 0,
      issueDate: '2026-06-28',
      supersedes: 'Revision 04',
      approvalBasis: 'Operator approved procedure',
      approvedBy: 'Quality Manager',
      approvalDate: '2026-06-27',
      fileName: 'AMA-OPR-PROC-001-REV05.pdf',
      fileSize: '2.4 MB',
      impactActions: ['Continue Using Frozen Revision']
    }
  ),
  enrichDocument(
    syntheticDocument(
      'mdata-doc-ui-mod',
      'OTHER',
      'AMA-MOD-INS-004',
      'MOD Installation Instruction - Avionics Upgrade'
    ),
    {
      ataChapter: '23',
      aircraftType: 'C208B',
      owner: 'Engineering Dept.',
      sourceOrganization: 'Engineering Order',
      activeRevisionLabel: 'REV 02',
      lifecycle: draftDocumentQueued.value ? 'Metadata Review' : 'Current',
      lifecycleNote: draftDocumentQueued.value ? 'Queued document intake' : 'Approved',
      applicabilityState: 'CONDITIONAL',
      applicabilityLabel: 'CONDITIONAL',
      applicabilitySummary: 'MOD-208-004 embodied',
      aircraftApplicable: 4,
      aircraftConditional: 4,
      aircraftNotApplicable: 0,
      aircraftUnresolved: draftDocumentQueued.value ? 1 : 0,
      activeJobCards: 1,
      historicalJobCards: 1,
      revisionImpactPending: 0,
      offlinePackagesAffected: 1,
      committedWorkPackagesAffected: 0,
      issueDate: '2026-06-18',
      supersedes: 'Revision 01',
      approvalBasis: 'Engineering order approval',
      approvedBy: 'Engineering Manager',
      approvalDate: '2026-06-17',
      fileName: 'AMA-MOD-INS-004-REV02.pdf',
      fileSize: '7.9 MB',
      impactActions: ['Update Before Execution', 'Not Affected']
    }
  )
]);

const documents = computed(() => demoOverlayDocuments.value);
const selectedDocument = computed(() => {
  const selected = documents.value.find((document) => document.id === selectedDocumentId.value);
  return selected ?? documents.value[0] ?? null;
});
const filteredDocuments = computed(() => {
  const term = search.value.trim().toLowerCase();
  return documents.value.filter((document) => {
    const activeRevision = document.activeRevision?.revision ?? '';
    const text = [
      document.documentNumber,
      document.title,
      document.ataChapter,
      document.aircraftType,
      document.activeRevisionLabel,
      activeRevision
    ]
      .join(' ')
      .toLowerCase();
    const matchesTerm = !term || text.includes(term);
    const matchesType = typeFilter.value === 'ALL' || document.documentType === typeFilter.value;
    const matchesLifecycle =
      lifecycleFilter.value === 'ALL' || document.lifecycle === lifecycleFilter.value;
    const matchesAircraft =
      aircraftTypeFilter.value === 'ALL' || document.aircraftType === aircraftTypeFilter.value;
    const matchesApplicability =
      applicabilityFilter.value === 'ALL' ||
      document.applicabilityState === applicabilityFilter.value;
    const matchesAta = ataFilter.value === 'ALL' || document.ataChapter === ataFilter.value;
    const matchesSource =
      sourceFilter.value === 'ALL' || document.sourceOrganization === sourceFilter.value;
    const matchesOwner = ownerFilter.value === 'ALL' || document.owner === ownerFilter.value;
    const matchesDate =
      effectiveDateFilter.value === 'ALL' ||
      dateBucket(document.effectiveDate) === effectiveDateFilter.value;
    const matchesQuick = quickFilterMatches(document);
    return (
      matchesTerm &&
      matchesType &&
      matchesLifecycle &&
      matchesAircraft &&
      matchesApplicability &&
      matchesAta &&
      matchesSource &&
      matchesOwner &&
      matchesDate &&
      matchesQuick
    );
  });
});
const summaryCards = computed(() => [
  {
    key: 'CURRENT' as QuickFilter,
    label: 'Current Documents',
    value: documents.value.filter((document) => document.lifecycle === 'Current').length,
    icon: 'mdi-clipboard-check-outline',
    color: 'success'
  },
  {
    key: 'UNDER_REVIEW' as QuickFilter,
    label: 'Under Review',
    value: documents.value.filter((document) => isUnderReview(document.lifecycle)).length,
    icon: 'mdi-file-document-edit-outline',
    color: 'warning'
  },
  {
    key: 'ACTION_REQUIRED' as QuickFilter,
    label: 'Revision Impact Pending',
    value: documents.value.reduce((total, document) => total + document.revisionImpactPending, 0),
    icon: 'mdi-layers-triple-outline',
    color: 'orange'
  },
  {
    key: 'ACTION_REQUIRED' as QuickFilter,
    label: 'Applicability Unresolved',
    value: documents.value.reduce((total, document) => total + document.aircraftUnresolved, 0),
    icon: 'mdi-alert-outline',
    color: 'error'
  },
  {
    key: 'SUPERSEDED' as QuickFilter,
    label: 'Superseded',
    value: documents.value.filter((document) => document.lifecycle === 'Superseded').length,
    icon: 'mdi-file-clock-outline',
    color: 'secondary'
  }
]);
const quickFilters = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Current', value: 'CURRENT' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Action Required', value: 'ACTION_REQUIRED' },
  { label: 'Superseded', value: 'SUPERSEDED' },
  { label: 'Digunakan di Job Card Aktif', value: 'USED_ACTIVE_JC' }
] as const;
const typeOptions = computed(() => optionList(approvedDocumentTypeOptions));
const aircraftTypeOptions = computed(() =>
  optionList(documents.value.map((document) => document.aircraftType))
);
const applicabilityOptions = computed(() =>
  optionList(documents.value.map((document) => document.applicabilityState))
);
const ataOptions = computed(() =>
  optionList(documents.value.map((document) => document.ataChapter))
);
const sourceOptions = computed(() =>
  optionList(documents.value.map((document) => document.sourceOrganization))
);
const ownerOptions = computed(() => optionList(documents.value.map((document) => document.owner)));
const uploadStepIndex = computed(() => uploadSteps.indexOf(uploadStep.value) + 1);

watch(
  documents,
  (items) => {
    if (!selectedDocumentId.value && items[0]) {
      selectedDocumentId.value = items[0].id;
      uploadForm.documentId = items[0].id;
    }
  },
  { immediate: true }
);

watch(selectedDocument, (document) => {
  if (document && !uploadForm.documentId) uploadForm.documentId = document.id;
});

function syntheticDocument(
  id: string,
  documentType: MaintenanceApprovedDataDocumentDto['documentType'],
  documentNumber: string,
  title: string
): MaintenanceApprovedDataDocumentDto {
  const revision: MaintenanceApprovedDataRevisionDto = {
    id: `${id}-rev-current`,
    documentId: id,
    revision: documentNumber.includes('IPC')
      ? 'REV 16'
      : documentNumber.includes('SRM')
        ? 'REV 12'
        : 'REV 05',
    effectiveDate: '2026-07-31',
    status: 'ACTIVE',
    supersededByRevisionId: null,
    fictionalDemo: true,
    demoFileLabel: `${documentNumber}.pdf`,
    demoFileUrl: '/mro/reference/amm-c208b-rev-a.txt',
    demoPageRef: 'Controlled preview extract',
    notes: 'Synthetic document for controlled approved-data library UI.'
  };
  return {
    id,
    documentType,
    documentNumber,
    title,
    sourceIssuer: 'PT AMA Sample Library',
    applicability: 'C208B Fleet',
    status: 'ACTIVE',
    fictionalDemo: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
    revisions: [revision],
    activeRevision: revision,
    jobCardUsageCount: 0
  };
}

function enrichDocument(
  document: MaintenanceApprovedDataDocumentDto,
  demo: Omit<
    EnrichedApprovedDataDocument,
    | keyof MaintenanceApprovedDataDocumentDto
    | 'effectiveDate'
    | 'controlStatus'
    | 'lifecycleIcon'
    | 'lifecycleColor'
    | 'revisionHistory'
    | 'usageRows'
    | 'auditRows'
    | 'previewUrl'
  >
): EnrichedApprovedDataDocument {
  const lifecycleMeta = lifecycleUi(demo.lifecycle);
  const activeRevision = document.activeRevision ?? document.revisions[0] ?? null;
  return {
    ...document,
    ...demo,
    effectiveDate: activeRevision?.effectiveDate ?? null,
    controlStatus: 'Controlled',
    lifecycleIcon: lifecycleMeta.icon,
    lifecycleColor: lifecycleMeta.color,
    previewUrl: activeRevision?.demoFileUrl ?? '/mro/reference/amm-c208b-rev-a.txt',
    revisionHistory: buildRevisionHistory(document, demo.lifecycle),
    usageRows: buildUsageRows(
      document.documentNumber,
      demo.activeJobCards,
      demo.historicalJobCards
    ),
    auditRows: buildAuditRows(demo.owner, demo.lifecycle)
  };
}

function buildRevisionHistory(
  document: MaintenanceApprovedDataDocumentDto,
  lifecycle: LibraryLifecycle
) {
  const rows = document.revisions.slice(0, 4).map((revision) => ({
    revision: revision.revision,
    status: revision.status === 'ACTIVE' ? lifecycle : revision.status,
    date: revision.effectiveDate,
    note: revision.notes ?? 'Controlled revision snapshot'
  }));
  if (!rows.length) {
    rows.push({
      revision: 'REV 01',
      status: lifecycle,
      date: document.updatedAt,
      note: 'Synthetic intake revision'
    });
  }
  return rows;
}

function buildUsageRows(documentNumber: string, active: number, historical: number) {
  return [
    {
      jobCard: active ? 'MWP-MROV1-RTS-JC-001' : 'No active Job Card',
      workPackage: active ? 'MWP-MROV1-RTS' : '-',
      state: active ? 'Active execution' : 'No active usage',
      decision: active ? 'Frozen revision retained' : 'Not affected'
    },
    {
      jobCard: `${historical} historical references`,
      workPackage: documentNumber,
      state: 'Historical',
      decision: 'Record only'
    }
  ];
}

function buildAuditRows(owner: string, lifecycle: LibraryLifecycle) {
  return [
    { actor: owner, action: `${lifecycle} status reviewed`, at: '2026-07-31 14:22 WIT' },
    {
      actor: 'Document Control',
      action: 'Applicability matrix checked',
      at: '2026-07-30 09:10 WIT'
    },
    {
      actor: 'Quality Assurance',
      action: 'Demo control notice applied',
      at: '2026-07-29 16:05 WIT'
    }
  ];
}

function lifecycleUi(lifecycle: LibraryLifecycle) {
  if (lifecycle === 'Current' || lifecycle === 'Approved')
    return { color: 'success', icon: 'mdi-check-circle-outline' };
  if (isUnderReview(lifecycle)) return { color: 'warning', icon: 'mdi-file-document-edit-outline' };
  if (lifecycle === 'Superseded' || lifecycle === 'Archived')
    return { color: 'secondary', icon: 'mdi-file-clock-outline' };
  if (lifecycle === 'Withdrawn') return { color: 'error', icon: 'mdi-alert-circle-outline' };
  return { color: 'info', icon: 'mdi-progress-clock' };
}

function applicabilityColor(state: ApplicabilityState) {
  if (state === 'VERIFIED') return 'success';
  if (state === 'CONDITIONAL') return 'warning';
  if (state === 'UNRESOLVED' || state === 'REVIEW_REQUIRED') return 'error';
  return 'secondary';
}

function isUnderReview(lifecycle: LibraryLifecycle) {
  return ['Uploaded', 'Metadata Review', 'Technical Review', 'Approval Review'].includes(lifecycle);
}

function quickFilterMatches(document: EnrichedApprovedDataDocument) {
  if (quickFilter.value === 'ALL') return true;
  if (quickFilter.value === 'CURRENT') return document.lifecycle === 'Current';
  if (quickFilter.value === 'UNDER_REVIEW') return isUnderReview(document.lifecycle);
  if (quickFilter.value === 'SUPERSEDED') return document.lifecycle === 'Superseded';
  if (quickFilter.value === 'USED_ACTIVE_JC') return document.activeJobCards > 0;
  return (
    document.revisionImpactPending > 0 ||
    document.aircraftUnresolved > 0 ||
    document.applicabilityState === 'REVIEW_REQUIRED'
  );
}

function optionList(values: string[]) {
  return [
    { title: 'All', value: 'ALL' },
    ...Array.from(new Set(values)).map((value) => ({ title: value.replaceAll('_', ' '), value }))
  ];
}

function dateBucket(value: string | null) {
  if (!value) return 'NO_DATE';
  const now = new Date('2026-08-30T00:00:00.000Z').getTime();
  const time = new Date(value).getTime();
  const days = Math.round((time - now) / 86_400_000);
  if (days >= 0 && days <= 30) return 'NEXT_30';
  if (days < 0 && days >= -90) return 'LAST_90';
  return 'OTHER';
}

function selectDocument(document: EnrichedApprovedDataDocument) {
  selectedDocumentId.value = document.id;
  detailTab.value = 'overview';
  uploadForm.documentId = document.id;
}

function openUpload(document = selectedDocument.value) {
  uploadForm.documentId = document?.id ?? documents.value[0]?.id ?? '';
  uploadStep.value = 'Upload file';
  uploadDialog.value = true;
}

function queueRevision() {
  queuedRevision.value = true;
  uploadStep.value = 'Impact review';
  uploadDialog.value = false;
}

function queueNewDocument() {
  draftDocumentQueued.value = true;
  addDocumentDialog.value = false;
}

function resetFilters() {
  search.value = '';
  typeFilter.value = 'ALL';
  lifecycleFilter.value = 'ALL';
  aircraftTypeFilter.value = 'ALL';
  applicabilityFilter.value = 'ALL';
  ataFilter.value = 'ALL';
  sourceFilter.value = 'ALL';
  ownerFilter.value = 'ALL';
  effectiveDateFilter.value = 'ALL';
  quickFilter.value = 'ALL';
}
</script>

<template>
  <VContainer fluid class="approved-data-page">
    <div class="approved-data-header">
      <div>
        <div class="text-primary font-weight-bold mb-2">Maintenance Operations</div>
        <div class="d-flex flex-wrap align-center ga-2">
          <h1 class="text-h4 font-weight-bold mb-0">Data Perawatan Terkendali</h1>
          <VChip size="small" color="primary" variant="tonal">LOCAL DEMO · SYNTHETIC DATA</VChip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Controlled Approved Maintenance Data Library untuk Job Card, effectivity, revision impact,
          dan audit readiness.
        </p>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <VBtn prepend-icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()">
          Refresh
        </VBtn>
        <VBtn
          prepend-icon="mdi-file-upload-outline"
          variant="outlined"
          color="primary"
          @click="openUpload()"
        >
          Unggah Revisi
        </VBtn>
        <VBtn prepend-icon="mdi-plus" color="primary" @click="addDocumentDialog = true">
          Tambah Dokumen
        </VBtn>
      </div>
    </div>

    <VAlert type="warning" variant="tonal" class="mb-4" density="comfortable">
      Demo library ini tidak boleh dipakai untuk pekerjaan maintenance nyata. Preview file diberi
      watermark demonstrasi.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Registry data perawatan belum dapat dimuat.
    </VAlert>
    <VAlert v-if="queuedRevision" type="warning" variant="tonal" class="mb-4">
      Revision Impact Pending — 4 active Job Cards affected. Pilih treatment sebelum execution
      berikutnya.
    </VAlert>
    <VAlert v-if="draftDocumentQueued" type="info" variant="tonal" class="mb-4">
      Dokumen baru masuk Metadata Review. Dokumen belum Current dan belum dapat dipakai Job Card.
    </VAlert>

    <div class="summary-grid mb-4">
      <button
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-filter"
        :class="{ 'summary-filter--active': quickFilter === card.key }"
        type="button"
        @click="quickFilter = card.key"
      >
        <VIcon :icon="card.icon" :color="card.color" size="28" />
        <div>
          <div class="summary-filter__value">{{ card.value }}</div>
          <div class="summary-filter__label">{{ card.label }}</div>
        </div>
      </button>
    </div>

    <div class="library-layout">
      <VCard border class="library-main">
        <VCardText>
          <VTextField
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Cari dokumen, nomor, judul, ATA, revisi..."
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
          />
          <div class="filter-grid mb-3">
            <VSelect
              v-model="typeFilter"
              label="Tipe"
              :items="typeOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="lifecycleFilter"
              label="Lifecycle"
              :items="[
                { title: 'All', value: 'ALL' },
                ...lifecycleOptions.map((item) => ({ title: item, value: item }))
              ]"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="aircraftTypeFilter"
              label="Aircraft Type"
              :items="aircraftTypeOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="applicabilityFilter"
              label="Applicability"
              :items="applicabilityOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="ataFilter"
              label="ATA Chapter"
              :items="ataOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="sourceFilter"
              label="Source"
              :items="sourceOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="ownerFilter"
              label="Owner"
              :items="ownerOptions"
              density="compact"
              variant="outlined"
            />
            <VSelect
              v-model="effectiveDateFilter"
              label="Effective date"
              :items="[
                { title: 'All', value: 'ALL' },
                { title: 'Next 30 days', value: 'NEXT_30' },
                { title: 'Last 90 days', value: 'LAST_90' },
                { title: 'Other', value: 'OTHER' }
              ]"
              density="compact"
              variant="outlined"
            />
          </div>
          <div class="d-flex flex-wrap align-center ga-2 mb-4">
            <VBtnToggle
              v-model="quickFilter"
              divided
              mandatory
              density="comfortable"
              variant="tonal"
            >
              <VBtn
                v-for="filter in quickFilters"
                :key="filter.value"
                :value="filter.value"
                size="small"
              >
                {{ filter.label }}
              </VBtn>
            </VBtnToggle>
            <VSpacer />
            <VBtn
              prepend-icon="mdi-filter-remove-outline"
              variant="text"
              size="small"
              @click="resetFilters"
            >
              Reset Filter
            </VBtn>
          </div>

          <VTable class="approved-data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type / ATA</th>
                <th>Current Revision</th>
                <th>Lifecycle</th>
                <th>Applicability</th>
                <th>Effective Date</th>
                <th>Usage</th>
                <th>Owner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="9">Memuat data perawatan terkendali...</td>
              </tr>
              <tr
                v-for="document in filteredDocuments"
                :key="document.id"
                :class="{
                  'approved-data-table__row--selected': selectedDocument?.id === document.id
                }"
                @click="selectDocument(document)"
              >
                <td>
                  <strong class="text-primary">{{ document.documentNumber }}</strong>
                  <div class="text-caption text-medium-emphasis">{{ document.title }}</div>
                  <div class="text-caption">Source: {{ document.sourceOrganization }}</div>
                </td>
                <td>
                  <div>{{ document.documentType }}</div>
                  <div class="text-caption text-medium-emphasis">ATA {{ document.ataChapter }}</div>
                </td>
                <td>
                  <VChip
                    size="small"
                    :color="document.lifecycle === 'Superseded' ? 'secondary' : 'success'"
                    variant="tonal"
                  >
                    {{ document.activeRevisionLabel }}
                  </VChip>
                  <div class="text-caption text-medium-emphasis">{{ document.supersedes }}</div>
                </td>
                <td>
                  <VChip
                    :prepend-icon="document.lifecycleIcon"
                    :color="document.lifecycleColor"
                    size="small"
                    variant="tonal"
                  >
                    {{ document.lifecycle }}
                  </VChip>
                  <div class="text-caption">{{ document.lifecycleNote }}</div>
                </td>
                <td>
                  <VChip
                    :color="applicabilityColor(document.applicabilityState)"
                    size="small"
                    variant="tonal"
                  >
                    {{ document.applicabilityLabel }}
                  </VChip>
                  <div class="text-caption text-medium-emphasis">
                    {{ document.applicabilitySummary }}
                  </div>
                  <div class="text-caption">
                    {{ document.aircraftApplicable }} aircraft applicable
                  </div>
                </td>
                <td>{{ format.date(document.effectiveDate) }}</td>
                <td>
                  <RouterLink to="/maintenance/work-packages">
                    {{ document.activeJobCards }} active
                  </RouterLink>
                  <div class="text-caption text-medium-emphasis">
                    {{ document.historicalJobCards }} historical
                  </div>
                </td>
                <td>{{ document.owner }}</td>
                <td>
                  <VMenu>
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon="mdi-dots-vertical"
                        variant="text"
                        aria-label="Document actions"
                      />
                    </template>
                    <VList density="compact">
                      <VListItem
                        title="Upload New Revision"
                        prepend-icon="mdi-file-upload-outline"
                        @click="openUpload(document)"
                      />
                      <VListItem
                        title="View Applicability"
                        prepend-icon="mdi-airplane-cog"
                        @click="detailTab = 'applicability'"
                      />
                      <VListItem
                        title="View Job Card Usage"
                        prepend-icon="mdi-clipboard-text-outline"
                        @click="detailTab = 'usage'"
                      />
                    </VList>
                  </VMenu>
                </td>
              </tr>
              <tr v-if="!pending && !filteredDocuments.length">
                <td colspan="9">Tidak ada dokumen sesuai filter.</td>
              </tr>
            </tbody>
          </VTable>
          <div class="d-flex align-center mt-4 text-caption text-medium-emphasis">
            Menampilkan {{ filteredDocuments.length }} dari {{ documents.length }} dokumen
            <VSpacer />
            <VSelect
              model-value="5"
              :items="['5 / halaman', '10 / halaman', '25 / halaman']"
              density="compact"
              variant="outlined"
              hide-details
              class="page-size-select"
            />
          </div>
        </VCardText>
      </VCard>

      <VCard v-if="selectedDocument" border class="library-drawer">
        <VCardTitle class="d-flex align-start ga-3">
          <div>
            <div class="text-h6">{{ selectedDocument.documentNumber }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ selectedDocument.title }}</div>
          </div>
          <VSpacer />
          <VChip :color="selectedDocument.lifecycleColor" size="small" variant="tonal">
            {{ selectedDocument.lifecycle }}
          </VChip>
        </VCardTitle>
        <VTabs v-model="detailTab" density="compact" color="primary">
          <VTab value="overview">Overview</VTab>
          <VTab value="revisions">Revisi</VTab>
          <VTab value="applicability">Applicability</VTab>
          <VTab value="usage">Penggunaan</VTab>
          <VTab value="audit">Audit</VTab>
        </VTabs>
        <VCardText>
          <VWindow v-model="detailTab">
            <VWindowItem value="overview">
              <VList density="compact">
                <VListItem
                  title="Tipe Dokumen"
                  :subtitle="`${selectedDocument.documentType} - ${selectedDocument.title}`"
                />
                <VListItem title="Sumber" :subtitle="selectedDocument.sourceOrganization" />
                <VListItem title="ATA Chapter" :subtitle="selectedDocument.ataChapter" />
                <VListItem title="Owner" :subtitle="selectedDocument.owner" />
                <VListItem title="Status Kontrol" :subtitle="selectedDocument.controlStatus" />
              </VList>
              <VDivider class="my-4" />
              <h2 class="text-subtitle-1 mb-2">Revisi Aktif</h2>
              <VList density="compact">
                <VListItem title="Revision" :subtitle="selectedDocument.activeRevisionLabel" />
                <VListItem
                  title="Effective Date"
                  :subtitle="format.date(selectedDocument.effectiveDate)"
                />
                <VListItem title="Issue Date" :subtitle="format.date(selectedDocument.issueDate)" />
                <VListItem title="Supersedes" :subtitle="selectedDocument.supersedes" />
                <VListItem title="Approval Basis" :subtitle="selectedDocument.approvalBasis" />
                <VListItem title="Approved By" :subtitle="selectedDocument.approvedBy" />
                <VListItem title="Approval Date" :subtitle="selectedDocument.approvalDate" />
              </VList>
              <VDivider class="my-4" />
              <h2 class="text-subtitle-1 mb-2">File Dokumen</h2>
              <div class="file-row">
                <VIcon icon="mdi-file-pdf-box" color="error" size="36" />
                <div>
                  <strong>{{ selectedDocument.fileName }}</strong>
                  <div class="text-caption text-medium-emphasis">
                    {{ selectedDocument.fileSize }} · PDF demo preview
                  </div>
                </div>
                <VSpacer />
                <VBtn variant="tonal" size="small" @click="previewDialog = true">Preview</VBtn>
              </div>
            </VWindowItem>

            <VWindowItem value="revisions">
              <VTimeline density="compact" side="end">
                <VTimelineItem
                  v-for="revision in selectedDocument.revisionHistory"
                  :key="`${revision.revision}-${revision.date}`"
                  dot-color="primary"
                  size="small"
                >
                  <strong>{{ revision.revision }}</strong>
                  <div class="text-caption">
                    {{ revision.status }} · {{ format.date(revision.date) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">{{ revision.note }}</div>
                </VTimelineItem>
              </VTimeline>
            </VWindowItem>

            <VWindowItem value="applicability">
              <VList density="compact">
                <VListItem
                  title="Applicable"
                  :subtitle="`${selectedDocument.aircraftApplicable} aircraft`"
                />
                <VListItem
                  title="Conditional"
                  :subtitle="`${selectedDocument.aircraftConditional} aircraft`"
                />
                <VListItem
                  title="Not Applicable"
                  :subtitle="`${selectedDocument.aircraftNotApplicable} aircraft`"
                />
                <VListItem
                  title="Unresolved"
                  :subtitle="`${selectedDocument.aircraftUnresolved} aircraft`"
                />
              </VList>
              <VBtn class="mt-2" variant="outlined" color="primary">
                Lihat Detail Applicability
              </VBtn>
            </VWindowItem>

            <VWindowItem value="usage">
              <VTable density="compact">
                <thead>
                  <tr>
                    <th>Job Card</th>
                    <th>Work Package</th>
                    <th>State</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="usage in selectedDocument.usageRows"
                    :key="`${usage.jobCard}-${usage.state}`"
                  >
                    <td>{{ usage.jobCard }}</td>
                    <td>{{ usage.workPackage }}</td>
                    <td>{{ usage.state }}</td>
                    <td>{{ usage.decision }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VWindowItem>

            <VWindowItem value="audit">
              <VList density="compact">
                <VListItem
                  v-for="audit in selectedDocument.auditRows"
                  :key="`${audit.actor}-${audit.at}`"
                  :title="audit.action"
                  :subtitle="`${audit.actor} · ${audit.at}`"
                />
              </VList>
            </VWindowItem>
          </VWindow>

          <VDivider class="my-4" />
          <h2 class="text-subtitle-1 mb-2">Revision Impact</h2>
          <VAlert
            :type="selectedDocument.revisionImpactPending ? 'warning' : 'info'"
            variant="tonal"
            class="mb-3"
          >
            {{ selectedDocument.revisionImpactPending }} active Job Cards affected ·
            {{ selectedDocument.committedWorkPackagesAffected }} committed Work Packages ·
            {{ selectedDocument.offlinePackagesAffected }} offline packages
          </VAlert>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-for="action in selectedDocument.impactActions"
              :key="action"
              size="small"
              variant="tonal"
            >
              {{ action }}
            </VBtn>
          </div>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <VBtn variant="outlined" color="primary" @click="openUpload(selectedDocument)">
              Upload New Revision
            </VBtn>
            <VBtn variant="tonal">Open Full Document</VBtn>
            <VBtn variant="tonal">More Actions</VBtn>
          </div>
        </VCardText>
      </VCard>
    </div>

    <VDialog v-model="uploadDialog" max-width="860">
      <VCard>
        <VCardTitle>Unggah Revisi Baru</VCardTitle>
        <VCardText>
          <VAlert type="info" variant="tonal" class="mb-4">
            Revisi baru masuk review workflow. Upload tidak otomatis menjadi Current.
          </VAlert>
          <div class="workflow-steps mb-4">
            <button
              v-for="(step, index) in uploadSteps"
              :key="step"
              class="workflow-step"
              :class="{
                'workflow-step--active': uploadStep === step,
                'workflow-step--done': index + 1 < uploadStepIndex
              }"
              type="button"
              @click="uploadStep = step"
            >
              <span>{{ index + 1 }}</span>
              {{ step }}
            </button>
          </div>
          <div class="workflow-panel">
            <template v-if="uploadStep === 'Upload file'">
              <VTextField
                v-model="uploadForm.fileName"
                label="File PDF"
                prepend-inner-icon="mdi-file-pdf-box"
              />
              <VTextField
                v-model="uploadForm.revision"
                label="Revision label"
                placeholder="REV 43"
              />
            </template>
            <template v-else-if="uploadStep === 'Metadata review'">
              <VList density="compact">
                <VListItem
                  title="Document number"
                  subtitle="Matched to selected controlled document"
                />
                <VListItem
                  title="Metadata completeness"
                  subtitle="ATA, applicability, owner, and source required before technical review"
                />
              </VList>
            </template>
            <template v-else-if="uploadStep === 'Technical review'">
              <VList density="compact">
                <VListItem
                  title="Engineering review"
                  subtitle="Validate procedure applicability and revision delta"
                />
                <VListItem
                  title="Quality review"
                  subtitle="Confirm approval basis and demo watermark policy"
                />
              </VList>
            </template>
            <template v-else>
              <VAlert type="warning" variant="tonal">
                Revision Impact Pending — 4 active Job Cards affected.
              </VAlert>
              <div class="impact-grid mt-4">
                <VChip color="warning" variant="tonal">4 active Job Cards</VChip>
                <VChip color="warning" variant="tonal">1 committed Work Package</VChip>
                <VChip color="error" variant="tonal">1 applicability unresolved</VChip>
                <VChip color="secondary" variant="tonal">2 offline packages</VChip>
              </div>
              <div class="d-flex flex-wrap ga-2 mt-4">
                <VBtn variant="tonal">Continue Using Frozen Revision</VBtn>
                <VBtn variant="tonal">Update Before Execution</VBtn>
                <VBtn color="warning" variant="tonal">Stop Work and Review</VBtn>
                <VBtn variant="tonal">Not Affected</VBtn>
                <VBtn variant="tonal">Reissue Job Card</VBtn>
              </div>
            </template>
          </div>
        </VCardText>
        <VCardActions>
          <VBtn variant="text" @click="uploadDialog = false">Cancel</VBtn>
          <VSpacer />
          <VBtn
            v-if="uploadStepIndex > 1"
            variant="tonal"
            @click="uploadStep = uploadSteps[uploadStepIndex - 2]"
          >
            Back
          </VBtn>
          <VBtn
            v-if="uploadStepIndex < uploadSteps.length"
            color="primary"
            @click="uploadStep = uploadSteps[uploadStepIndex]"
          >
            Continue Review
          </VBtn>
          <VBtn v-else color="primary" @click="queueRevision">Queue Impact Review</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="addDocumentDialog" max-width="620">
      <VCard>
        <VCardTitle>Tambah Dokumen Baru</VCardTitle>
        <VCardText>
          <VAlert type="info" variant="tonal" class="mb-4">
            Dokumen baru dimulai sebagai Draft/Metadata Review dan belum boleh dipakai Job Card.
          </VAlert>
          <VTextField v-model="newDocumentForm.documentNumber" label="Document number" />
          <VTextField v-model="newDocumentForm.title" label="Document title" />
          <VSelect
            v-model="newDocumentForm.documentType"
            label="Document type"
            :items="typeOptions.filter((item) => item.value !== 'ALL')"
          />
          <VTextField v-model="newDocumentForm.owner" label="Owner" />
        </VCardText>
        <VCardActions>
          <VBtn variant="text" @click="addDocumentDialog = false">Cancel</VBtn>
          <VSpacer />
          <VBtn color="primary" @click="queueNewDocument">Create Draft Intake</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="previewDialog" max-width="760">
      <VCard>
        <VCardTitle>Document Preview</VCardTitle>
        <VCardText>
          <div class="preview-surface">
            <div class="preview-watermark">DEMONSTRATION DATA — NOT FOR ACTUAL MAINTENANCE</div>
            <VIcon icon="mdi-file-pdf-box" color="error" size="56" />
            <h2 class="text-h6 mt-3">{{ selectedDocument?.fileName }}</h2>
            <p class="text-body-2 text-medium-emphasis">
              Controlled preview placeholder. Open full document routes to the demo reference
              extract when available.
            </p>
            <VBtn
              v-if="selectedDocument?.previewUrl"
              :href="selectedDocument.previewUrl"
              target="_blank"
              rel="noopener"
              variant="outlined"
              color="primary"
            >
              Open Full Document
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.approved-data-page {
  background: #f7f9fc;
  min-height: 100%;
}

.approved-data-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 12px;
}

.summary-filter {
  min-height: 88px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.summary-filter--active {
  border-color: #003b73;
  box-shadow: 0 0 0 2px rgba(0, 59, 115, 0.12);
}

.summary-filter__value {
  font-size: 1.6rem;
  font-weight: 750;
  line-height: 1;
}

.summary-filter__label {
  font-size: 0.78rem;
  color: rgba(15, 23, 42, 0.72);
}

.library-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 16px;
  align-items: start;
}

.library-main,
.library-drawer {
  border-radius: 8px;
}

.library-drawer {
  position: sticky;
  top: 84px;
  max-height: calc(100vh - 104px);
  overflow: auto;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 10px;
}

.approved-data-table th {
  white-space: nowrap;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.76rem;
}

.approved-data-table td {
  vertical-align: top;
  cursor: pointer;
}

.approved-data-table__row--selected {
  background: rgba(0, 59, 115, 0.05);
}

.page-size-select {
  max-width: 150px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
}

.impact-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 8px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 8px;
  background: #fff;
  color: rgba(15, 23, 42, 0.72);
  font-weight: 650;
  text-align: left;
}

.workflow-step span {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  background: #e8eef7;
  color: #003b73;
  font-size: 0.78rem;
}

.workflow-step--active {
  border-color: #003b73;
  color: #003b73;
  box-shadow: 0 0 0 2px rgba(0, 59, 115, 0.1);
}

.workflow-step--done span {
  background: #d9f3e7;
  color: #047857;
}

.workflow-panel {
  min-height: 220px;
}

.preview-surface {
  position: relative;
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 32px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: repeating-linear-gradient(-45deg, #fff, #fff 12px, #f2f6fb 12px, #f2f6fb 24px);
  text-align: center;
  overflow: hidden;
}

.preview-watermark {
  position: absolute;
  inset: auto -120px 130px -120px;
  transform: rotate(-18deg);
  padding: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: rgba(153, 27, 27, 0.72);
  font-weight: 800;
  letter-spacing: 0;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .library-layout {
    grid-template-columns: 1fr;
  }

  .library-drawer {
    position: static;
    max-height: none;
  }
}

@media (max-width: 900px) {
  .approved-data-header {
    flex-direction: column;
  }

  .summary-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
