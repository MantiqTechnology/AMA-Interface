<script setup lang="ts">
import type {
  MaintenanceCommandCenterDto,
  MaintenanceDefectSummaryDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type { MaintenanceErrorPresentation } from '../../composables/useMaintenanceUi';

const authorizationWording =
  'Lisensi personel dan Wewenang PT AMA diverifikasi untuk setiap tindakan MRO terkendali.';

const format = useLocaleFormat();
const session = useDemoSession();
const route = useRoute();
const { can } = useAuthorization();
const ui = useMaintenanceUi();
const { resolveAircraftImageUrl } = useAircraftImageUrl();

const createDialog = ref(false);
const createStep = ref(0);
const creating = ref(false);
const createError = ref<MaintenanceErrorPresentation | null>(null);
const search = ref('');
const stageFilter = ref('');
const handledCreateQuery = ref('');

const { data, pending, error, refresh } = await useAsyncData('maintenance-command-center', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const {
  data: selectorData,
  pending: selectorsPending,
  error: selectorsError,
  refresh: refreshSelectors
} = await useAsyncData(
  'maintenance-selector-data',
  () => fetchApi<MaintenanceSelectorDataDto>('/api/maintenance/selector-data'),
  { server: false }
);

const canPlan = computed(() => can('maintenance.package.plan').allowed);
const canIssueRelease = computed(() => can('maintenance.release.issue').allowed);

const createForm = reactive({
  sourceType: 'TECHNICAL_DEFECT',
  aircraftId: '',
  defectId: '',
  title: '',
  priority: 'HIGH' as 'LOW' | 'NORMAL' | 'HIGH',
  executionMode: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL_AMO_VENDOR',
  vendorId: '',
  planningNote: '',
  jobCardTitle: '',
  maintenanceDataRef: '',
  maintenanceDataRevision: 'REV-MROV1-2026-08',
  requiresIndependentInspection: true,
  evidenceNote: ''
});

const sourceTypes = [{ title: 'Temuan teknis yang sudah dinilai', value: 'TECHNICAL_DEFECT' }];
const createStepLabels = ['Sumber', 'Konteks pesawat', 'Rencana pelaksanaan', 'Lingkup', 'Review'];

const aircraftOptions = computed(() => selectorData.value?.aircraft ?? []);
const selectedAircraft = computed(() =>
  aircraftOptions.value.find((aircraft) => aircraft.id === createForm.aircraftId)
);
const eligibleDefects = computed(() => selectorData.value?.eligibleDefects ?? []);
const defectsForAircraft = computed(() =>
  eligibleDefects.value.filter((defect) => defect.aircraftId === createForm.aircraftId)
);
const selectedDefect = computed(() =>
  eligibleDefects.value.find((defect) => defect.id === createForm.defectId)
);
const selectedVendor = computed(() =>
  (selectorData.value?.vendors ?? []).find((vendor) => vendor.id === createForm.vendorId)
);

const filteredAttention = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value?.operationalAttention ?? []).filter((item) => {
    const matchesQuery =
      !query ||
      [
        item.aircraftRegistrationNumber,
        formatOperationalText(item.defectOrDueItem),
        item.activePackageNumber,
        item.currentStage,
        formatOperationalText(item.blocker),
        formatOperationalText(item.requiredAction),
        item.owner
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesStage = !stageFilter.value || item.currentStage === stageFilter.value;
    return matchesQuery && matchesStage;
  });
});

const stages = computed(() => [
  ...new Set((data.value?.operationalAttention ?? []).map((item) => item.currentStage))
]);

const flowMetrics = computed(() => [
  {
    label: 'Temuan',
    value: data.value?.defects.length ?? '-',
    helper: 'Temuan teknis yang sudah dikontrol'
  },
  {
    label: 'Paket pekerjaan',
    value: data.value?.summary.activeWorkPackages ?? '-',
    helper: 'Lingkup pekerjaan terkendali'
  },
  {
    label: 'Kartu kerja',
    value: data.value?.summary.jobCardsAwaitingExecution ?? '-',
    helper: 'Menunggu pekerjaan teknisi'
  },
  {
    label: 'Pemeriksaan',
    value: data.value?.summary.inspectionsAwaitingAction ?? '-',
    helper: 'Menunggu pemeriksaan independen'
  },
  {
    label: 'Rilis',
    value: data.value?.technicalReleases.length ?? '-',
    helper: 'Catatan rilis teknis'
  },
  {
    label: 'Audit',
    value: data.value?.recentAuditRecords.length ?? '-',
    helper: 'Riwayat tindakan'
  },
  {
    label: 'Overdue',
    value: data.value?.summary.overdue ?? '-',
    helper: 'Due control demo'
  },
  {
    label: 'Material',
    value: data.value?.summary.partsBlockers ?? '-',
    helper: 'Blocker kesiapan material'
  },
  {
    label: 'Peralatan',
    value: data.value?.summary.toolingBlockers ?? '-',
    helper: 'Blocker kalibrasi/alloc'
  },
  {
    label: 'Data',
    value: data.value?.summary.approvedDataBlockers ?? '-',
    helper: 'Blocker revisi controlled'
  }
]);

const stale = computed(() => {
  if (!data.value?.generatedAt) return false;
  return Date.now() - new Date(data.value.generatedAt).getTime() > 10 * 60 * 1000;
});

const creationWarnings = computed(() => {
  const warnings: string[] = [];
  if (!selectedAircraft.value) warnings.push('Pilih pesawat.');
  if (!selectedDefect.value) warnings.push('Pilih temuan terbuka yang dapat dipaketkan.');
  if (selectedDefect.value && selectedDefect.value.assessmentDecision !== 'GROUND') {
    warnings.push('Temuan ini tidak ditandai grounding; pastikan konteks planning sudah benar.');
  }
  if (createForm.executionMode === 'EXTERNAL_AMO_VENDOR' && !selectedVendor.value) {
    warnings.push('Pekerjaan eksternal perlu provider maintenance.');
  }
  if (!createForm.maintenanceDataRef.trim() || !createForm.maintenanceDataRevision.trim()) {
    warnings.push('Kartu kerja wajib perlu referensi approved maintenance data dan revisi.');
  }
  if (!createForm.evidenceNote.trim()) {
    warnings.push('Isi bukti/catatan planning sebelum membuat paket pekerjaan.');
  }
  return warnings;
});

const currentStepValid = computed(() => stepValid(createStep.value));

const canCreatePackage = computed(
  () =>
    canPlan.value &&
    Boolean(createForm.aircraftId) &&
    Boolean(createForm.defectId) &&
    createForm.title.trim().length >= 5 &&
    createForm.jobCardTitle.trim().length >= 5 &&
    createForm.maintenanceDataRef.trim().length >= 2 &&
    createForm.maintenanceDataRevision.trim().length >= 1 &&
    createForm.evidenceNote.trim().length >= 10 &&
    (createForm.executionMode === 'INTERNAL' || Boolean(createForm.vendorId))
);

watch(
  () => createForm.aircraftId,
  () => {
    if (selectedDefect.value?.aircraftId !== createForm.aircraftId) {
      createForm.defectId = '';
    }
  }
);

watch(
  () => createForm.defectId,
  () => {
    const defect = selectedDefect.value;
    if (!defect) return;
    createForm.aircraftId = defect.aircraftId;
    if (!createForm.title.trim()) createForm.title = `${defect.defectNumber} rectification`;
    if (!createForm.jobCardTitle.trim()) createForm.jobCardTitle = defect.title;
    if (!createForm.planningNote.trim()) {
      createForm.planningNote = `Temuan sumber ${defect.defectNumber}: ${defect.assessmentNote ?? defect.title}`;
    }
  }
);

watch(
  () => createForm.executionMode,
  (mode) => {
    if (mode === 'INTERNAL') createForm.vendorId = '';
  }
);

watch(
  () => [selectorData.value?.generatedAt, route.query.defect],
  () => {
    const defectReference = String(route.query.defect ?? '');
    if (!defectReference || handledCreateQuery.value === defectReference) return;
    const defect = eligibleDefects.value.find((item) => item.defectNumber === defectReference);
    if (!defect) return;
    openCreateDialog(defect.defectNumber);
    handledCreateQuery.value = defectReference;
  },
  { immediate: true }
);

function resetCreateForm() {
  createStep.value = 0;
  createError.value = null;
  Object.assign(createForm, {
    sourceType: 'TECHNICAL_DEFECT',
    aircraftId: '',
    defectId: '',
    title: '',
    priority: 'HIGH',
    executionMode: 'INTERNAL',
    vendorId: '',
    planningNote: '',
    jobCardTitle: '',
    maintenanceDataRef: '',
    maintenanceDataRevision: 'REV-MROV1-2026-08',
    requiresIndependentInspection: true,
    evidenceNote: ''
  });
}

function seedCreateFormFromDefect(defectNumber: string) {
  const defect = eligibleDefects.value.find((item) => item.defectNumber === defectNumber);
  if (!defect) return;
  createForm.aircraftId = defect.aircraftId;
  createForm.defectId = defect.id;
  createForm.title = `${defect.defectNumber} rectification`;
  createForm.jobCardTitle = defect.title;
  createForm.planningNote = `Temuan sumber ${defect.defectNumber}: ${defect.assessmentNote ?? defect.title}`;
}

function openCreateDialog(defectNumber?: string) {
  resetCreateForm();
  if (defectNumber) {
    seedCreateFormFromDefect(defectNumber);
    createStep.value = 2;
  }
  createDialog.value = true;
}

function nextStep() {
  if (!currentStepValid.value) return;
  createStep.value = Math.min(createStep.value + 1, 4);
}

function previousStep() {
  createStep.value = Math.max(createStep.value - 1, 0);
}

function stepValid(index: number) {
  if (index === 0) return createForm.sourceType === 'TECHNICAL_DEFECT';
  if (index === 1) return Boolean(selectedAircraft.value && selectedDefect.value);
  if (index === 2) {
    return createForm.executionMode === 'INTERNAL' || Boolean(selectedVendor.value);
  }
  if (index === 3) {
    return (
      createForm.title.trim().length >= 5 &&
      createForm.jobCardTitle.trim().length >= 5 &&
      createForm.maintenanceDataRef.trim().length >= 2 &&
      createForm.maintenanceDataRevision.trim().length >= 1 &&
      createForm.evidenceNote.trim().length >= 10
    );
  }
  return canCreatePackage.value;
}

function sourceFlightText(defect: MaintenanceDefectSummaryDto | null | undefined) {
  if (!defect) return 'Select a defect first.';
  if (defect.derivedSourceFlightNumber) return defect.derivedSourceFlightNumber;
  return defect.sourceReference ?? 'No linked flight record in the current backend.';
}

function packageSubtitle(item: MaintenanceWorkPackageDto) {
  return `${item.aircraftRegistrationNumber} / ${item.packageNumber}`;
}

function jobCardSubtitle(card: { aircraftRegistrationNumber: string; cardNumber: string }) {
  return `${card.aircraftRegistrationNumber} / ${card.cardNumber}`;
}

function formatOperationalText(value: string | null | undefined) {
  if (!value) return '-';
  return value.replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (token) =>
    token
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ')
  );
}

async function createPackage() {
  if (!canCreatePackage.value) return;
  creating.value = true;
  createError.value = null;
  try {
    const created = await fetchApi<MaintenanceWorkPackageDto>('/api/maintenance/work-packages', {
      method: 'POST',
      body: {
        aircraftId: createForm.aircraftId,
        primaryDefectId: createForm.defectId,
        sourceFlightId: selectedDefect.value?.derivedSourceFlightId ?? null,
        title: createForm.title,
        priority: createForm.priority,
        executionMode: createForm.executionMode,
        vendorId: createForm.executionMode === 'EXTERNAL_AMO_VENDOR' ? createForm.vendorId : null,
        planningNote: [createForm.planningNote, `Bukti perencanaan: ${createForm.evidenceNote}`]
          .filter(Boolean)
          .join('\n'),
        initialJobCard: {
          title: createForm.jobCardTitle,
          taskType: 'DEFECT_RECTIFICATION',
          maintenanceDataRef: createForm.maintenanceDataRef,
          maintenanceDataRevision: createForm.maintenanceDataRevision,
          mandatoryFlag: true,
          requiresIndependentInspection: createForm.requiresIndependentInspection
        }
      }
    });

    createDialog.value = false;
    await Promise.all([refresh(), refreshSelectors()]);
    await navigateTo(`/maintenance/work-packages/${created.id}`);
  } catch (errorValue) {
    createError.value = ui.presentError(errorValue);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <VContainer fluid class="maintenance-command-center">
    <div class="d-flex flex-wrap align-start ga-4 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Ringkasan Maintenance</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Ringkasan pekerjaan maintenance dari temuan sampai rilis teknis pesawat.
          <span class="text-caption">Maintenance Command Center</span>
        </p>
      </div>
      <VSpacer />
      <VBtn
        v-if="canPlan"
        color="primary"
        prepend-icon="mdi-plus"
        :disabled="selectorsPending || Boolean(selectorsError)"
        @click="openCreateDialog"
      >
        Buat paket pekerjaan
      </VBtn>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert type="info" variant="tonal" class="mb-4" density="comfortable">
      {{ authorizationWording }}
    </VAlert>
    <VAlert v-if="stale" type="warning" variant="tonal" class="mb-4">
      Data ringkasan lebih lama dari 10 menit. Muat ulang sebelum melakukan tindakan teknis.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Data maintenance dari backend belum dapat dimuat.
    </VAlert>

    <VCard border class="mb-4">
      <VCardTitle>
        <div class="text-h6">Alur kerja maintenance</div>
        <div class="text-body-2 text-medium-emphasis">
          Jumlah aktual dari backend untuk temuan, paket pekerjaan, pemeriksaan, rilis, dan audit.
        </div>
      </VCardTitle>
      <VCardText>
        <div class="flow-strip">
          <div v-for="metric in flowMetrics" :key="metric.label" class="flow-step">
            <div class="flow-step__label">{{ metric.label }}</div>
            <div class="flow-step__value">{{ metric.value }}</div>
            <div class="flow-step__helper">{{ metric.helper }}</div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <VRow>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard label="Total Pesawat" :value="data?.summary.fleetTotal ?? '-'" tone="info" />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Unserviceable"
          :value="data?.summary.unserviceable ?? '-'"
          tone="danger"
        />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Menunggu Pemeriksaan"
          :value="data?.summary.inspectionsAwaitingAction ?? '-'"
          tone="warning"
        />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Menunggu Rilis"
          :value="data?.summary.readyForRelease ?? '-'"
          tone="success"
        />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard label="Overdue Demo" :value="data?.summary.overdue ?? '-'" tone="danger" />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Blocker Material"
          :value="data?.summary.partsBlockers ?? '-'"
          tone="warning"
        />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Blocker Peralatan"
          :value="data?.summary.toolingBlockers ?? '-'"
          tone="warning"
        />
      </VCol>
      <VCol cols="12" sm="6" lg="3">
        <DsStatCard
          label="Blocker Data"
          :value="data?.summary.approvedDataBlockers ?? '-'"
          tone="warning"
        />
      </VCol>
    </VRow>

    <VRow class="mt-2">
      <VCol cols="12">
        <VCard border>
          <VCardTitle class="d-flex flex-wrap align-center ga-3">
            <div>
              <div class="text-h6">Perlu perhatian</div>
              <div class="text-body-2 text-medium-emphasis">
                Pesawat, temuan, penghambat, penanggung jawab, dan langkah berikutnya.
              </div>
            </div>
            <VSpacer />
            <VTextField
              v-model="search"
              density="compact"
              hide-details
              clearable
              label="Cari pesawat, paket, atau penghambat"
              prepend-inner-icon="mdi-magnify"
              max-width="280"
            />
            <VSelect
              v-model="stageFilter"
              density="compact"
              hide-details
              clearable
              label="Tahap"
              :items="stages"
              max-width="240"
            />
          </VCardTitle>
          <VCardText>
            <div class="maintenance-table-wrap">
              <VTable class="maintenance-table maintenance-table--attention">
                <thead>
                  <tr>
                    <th>Pesawat</th>
                    <th>Item teknis</th>
                    <th>Paket dan tahap</th>
                    <th>Penghambat dan langkah berikutnya</th>
                    <th>Penanggung jawab</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pending">
                    <td colspan="5">Memuat status MRO...</td>
                  </tr>
                  <tr
                    v-for="item in filteredAttention"
                    :key="`${item.aircraftId}-${item.updatedAt}`"
                  >
                    <td>
                      <div class="d-flex align-center ga-2">
                        <VAvatar rounded="lg" size="40">
                          <VImg
                            v-if="resolveAircraftImageUrl(item.aircraftImageUrl)"
                            :alt="`${item.aircraftRegistrationNumber} aircraft image`"
                            cover
                            :src="resolveAircraftImageUrl(item.aircraftImageUrl) ?? undefined"
                          />
                          <VIcon v-else icon="mdi-airplane" size="22" />
                        </VAvatar>
                        <strong>{{ item.aircraftRegistrationNumber }}</strong>
                      </div>
                    </td>
                    <td>
                      <VChip
                        :color="ui.technicalStateColor(item.technicalState)"
                        size="small"
                        variant="tonal"
                      >
                        {{ ui.label(item.technicalState) }}
                      </VChip>
                      <div class="mt-1">{{ formatOperationalText(item.defectOrDueItem) }}</div>
                    </td>
                    <td>
                      <VBtn
                        v-if="item.activePackageId"
                        :to="`/maintenance/work-packages/${item.activePackageId}`"
                        class="mro-action-btn"
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-briefcase-arrow-right"
                      >
                        Buka {{ item.activePackageNumber }}
                      </VBtn>
                      <span v-else>-</span>
                      <div class="text-caption text-medium-emphasis">
                        {{ ui.label(item.currentStage) }}
                      </div>
                    </td>
                    <td>
                      <div>{{ formatOperationalText(item.blocker) }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Langkah berikutnya: {{ formatOperationalText(item.requiredAction) }}
                      </div>
                    </td>
                    <td>
                      <div>{{ item.owner }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ format.dateTime(item.updatedAt) }}
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!pending && data && !filteredAttention.length">
                    <td colspan="5">
                      {{
                        search || stageFilter
                          ? 'Tidak ada pekerjaan yang sesuai filter.'
                          : 'Tidak ada pesawat yang memerlukan perhatian maintenance saat ini.'
                      }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <VCard border class="mb-4">
          <VCardTitle>Menunggu rilis teknis</VCardTitle>
          <VCardText>
            <VList density="compact">
              <VListItem
                v-for="item in data?.readyForRelease ?? []"
                :key="item.id"
                :title="item.title"
                :subtitle="packageSubtitle(item)"
              >
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <VChip color="success" size="small" variant="tonal">Siap</VChip>
                    <VBtn
                      :to="`/maintenance/work-packages/${item.id}`"
                      class="mro-action-btn"
                      color="success"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-certificate-outline"
                    >
                      Buka rilis
                    </VBtn>
                  </div>
                </template>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.readyForRelease.length ?? 0)"
              title="Belum ada paket menunggu rilis"
              text="Selesaikan kartu kerja wajib dan pemeriksaan sebelum pengajuan rilis."
            />
            <VDivider class="my-4" />
            <VAlert v-if="!canIssueRelease" type="info" variant="tonal" density="compact">
              {{ ui.permissionHint(false, 'maintenance.release.issue', session.role.value) }}
            </VAlert>
          </VCardText>
        </VCard>

        <VCard border>
          <VCardTitle>Aktivitas teknis terakhir</VCardTitle>
          <VCardText>
            <VTimeline density="compact" side="end">
              <VTimelineItem
                v-for="record in data?.recentAuditRecords.slice(0, 6) ?? []"
                :key="record.id"
                dot-color="primary"
                size="small"
              >
                <div class="text-body-2 font-weight-medium">{{ ui.label(record.action) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ record.actorRole }} / {{ format.dateTime(record.occurredAt) }}
                </div>
              </VTimelineItem>
            </VTimeline>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.recentAuditRecords.length ?? 0)"
              title="Belum ada aktivitas teknis"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-2">
      <VCol cols="12" md="4">
        <VCard border height="100%">
          <VCardTitle>Kartu kerja menunggu teknisi</VCardTitle>
          <VCardText>
            <VList density="compact">
              <VListItem
                v-for="card in data?.jobCardsAwaitingExecution.slice(0, 6) ?? []"
                :key="card.id"
                :title="card.title"
                :subtitle="jobCardSubtitle(card)"
              >
                <template #append>
                  <VBtn
                    :to="`/maintenance/work-packages/${card.workPackageId}`"
                    class="mro-action-btn"
                    color="primary"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-briefcase-eye-outline"
                  >
                    Buka pekerjaan
                  </VBtn>
                </template>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.jobCardsAwaitingExecution.length ?? 0)"
              title="Tidak ada kartu kerja menunggu tindakan"
            />
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border height="100%">
          <VCardTitle>Pemeriksaan independen</VCardTitle>
          <VCardText>
            <VList density="compact">
              <VListItem
                v-for="card in data?.inspectionsAwaitingAction.slice(0, 6) ?? []"
                :key="card.id"
                :title="card.title"
                :subtitle="jobCardSubtitle(card)"
              >
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <VChip color="warning" size="small" variant="tonal">Pemeriksaan</VChip>
                    <VBtn
                      :to="`/maintenance/work-packages/${card.workPackageId}`"
                      class="mro-action-btn"
                      color="warning"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-clipboard-search-outline"
                    >
                      Buka inspeksi
                    </VBtn>
                  </div>
                </template>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.inspectionsAwaitingAction.length ?? 0)"
              title="Tidak ada pemeriksaan menunggu"
            />
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border height="100%">
          <VCardTitle>Penghambat rilis</VCardTitle>
          <VCardText>
            <VList density="compact">
              <VListItem
                v-for="item in data?.releaseBlockers.slice(0, 6) ?? []"
                :key="item.workPackageId"
                :title="
                  ui.operationalAction(
                    item.blockers[0]?.message ?? 'Release prerequisite not satisfied.'
                  )
                "
                :subtitle="`${item.aircraftRegistrationNumber} / ${item.packageNumber}`"
              >
                <template #append>
                  <VBtn
                    :to="`/maintenance/work-packages/${item.workPackageId}`"
                    class="mro-action-btn"
                    color="warning"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-alert-circle-outline"
                  >
                    Buka blocker
                  </VBtn>
                </template>
              </VListItem>
            </VList>
            <VEmptyState
              v-if="!pending && !error && data && !(data?.releaseBlockers.length ?? 0)"
              title="Tidak ada penghambat rilis"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="createDialog" max-width="980" persistent scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center ga-3">
          <div>
            <h2 class="text-h6 mb-0">Buat Paket Pekerjaan</h2>
            <div class="text-body-2 text-medium-emphasis">
              Buat paket dari temuan, pesawat, rencana kerja, lingkup, dan review akhir.
            </div>
          </div>
          <VSpacer />
          <VBtn
            icon="mdi-close"
            variant="text"
            :disabled="creating"
            @click="createDialog = false"
          />
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol cols="12" md="3">
              <VList density="compact" nav>
                <VListItem
                  v-for="(step, index) in createStepLabels"
                  :key="step"
                  :active="createStep === Number(index)"
                  :disabled="Number(index) > createStep"
                  color="primary"
                  @click="createStep = Number(index)"
                >
                  <template #prepend>
                    <VAvatar
                      size="24"
                      :color="createStep === Number(index) ? 'primary' : 'surface-variant'"
                    >
                      {{ Number(index) + 1 }}
                    </VAvatar>
                  </template>
                  <VListItemTitle>{{ step }}</VListItemTitle>
                </VListItem>
              </VList>
            </VCol>
            <VCol cols="12" md="9">
              <div class="text-caption text-medium-emphasis mb-2">
                Langkah {{ createStep + 1 }} dari {{ createStepLabels.length }}
              </div>
              <VAlert v-if="createError" type="error" variant="tonal" class="mb-4">
                <strong>{{ createError.title }}</strong>
                <div>{{ createError.impact }}</div>
                <div class="text-caption">Langkah berikutnya: {{ createError.requiredAction }}</div>
                <div v-if="createError.referenceId" class="text-caption">
                  Referensi: {{ createError.referenceId }}
                </div>
              </VAlert>

              <div v-if="createStep === 0" class="create-step">
                <h2 class="text-h6 mb-3">Sumber</h2>
                <VSelect
                  v-model="createForm.sourceType"
                  label="Tipe sumber"
                  :items="sourceTypes"
                  item-title="title"
                  item-value="value"
                />
                <VAlert type="info" variant="tonal">
                  Paket dibuat dari temuan teknis yang sudah dinilai. Sumber lain belum digunakan
                  pada demo ini.
                </VAlert>
              </div>

              <div v-else-if="createStep === 1" class="create-step">
                <h2 class="text-h6 mb-3">Konteks pesawat</h2>
                <VAutocomplete
                  v-model="createForm.aircraftId"
                  label="Pesawat"
                  :items="aircraftOptions"
                  item-value="id"
                  item-title="registrationNumber"
                  :loading="selectorsPending"
                  no-data-text="Tidak ada pesawat tersedia"
                />
                <VAlert
                  v-if="!selectedAircraft"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  Pilih pesawat sebelum memilih temuan.
                </VAlert>
                <VAutocomplete
                  v-model="createForm.defectId"
                  label="Temuan yang dapat dibuat paket"
                  :items="defectsForAircraft"
                  item-value="id"
                  item-title="defectNumber"
                  :disabled="!createForm.aircraftId"
                  no-data-text="Tidak ada temuan terbuka untuk pesawat ini"
                />
                <VAlert
                  v-if="createForm.aircraftId && !selectedDefect"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  Pilih temuan terbuka yang sudah dinilai dan terkait dengan pesawat ini.
                </VAlert>
                <VTextField
                  :model-value="sourceFlightText(selectedDefect)"
                  label="Referensi flight / technical log dari sistem"
                  readonly
                />
                <VAlert v-if="selectedAircraft" type="info" variant="tonal">
                  {{ selectedAircraft.registrationNumber }} /
                  {{ ui.label(selectedAircraft.serviceabilityStatus) }} /
                  {{ ui.label(selectedAircraft.technicalEligibility) }}
                </VAlert>
              </div>

              <div v-else-if="createStep === 2" class="create-step">
                <h2 class="text-h6 mb-3">Rencana pelaksanaan</h2>
                <VSelect
                  v-model="createForm.executionMode"
                  label="Mode pelaksanaan"
                  :items="[
                    { title: 'Maintenance internal', value: 'INTERNAL' },
                    { title: 'Provider eksternal / AMO', value: 'EXTERNAL_AMO_VENDOR' }
                  ]"
                  item-title="title"
                  item-value="value"
                />
                <VAutocomplete
                  v-if="createForm.executionMode === 'EXTERNAL_AMO_VENDOR'"
                  v-model="createForm.vendorId"
                  label="Provider maintenance"
                  :items="selectorData?.vendors ?? []"
                  item-value="id"
                  item-title="vendorName"
                  no-data-text="Tidak ada provider aktif"
                />
                <VAlert type="info" variant="tonal">
                  Gunakan catatan rencana untuk instruksi station, akses pesawat, atau waktu kerja.
                </VAlert>
                <VAlert
                  v-if="createForm.executionMode === 'EXTERNAL_AMO_VENDOR' && !selectedVendor"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                >
                  Pilih provider maintenance aktif untuk pelaksanaan eksternal.
                </VAlert>
              </div>

              <div v-else-if="createStep === 3" class="create-step">
                <h2 class="text-h6 mb-3">Lingkup</h2>
                <VTextField v-model="createForm.title" label="Judul paket pekerjaan" />
                <VAlert
                  v-if="createForm.title.trim().length < 5"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  Isi judul paket pekerjaan.
                </VAlert>
                <VSelect
                  v-model="createForm.priority"
                  label="Prioritas"
                  :items="['LOW', 'NORMAL', 'HIGH']"
                />
                <VTextarea v-model="createForm.planningNote" label="Catatan rencana" rows="3" />
                <VTextarea
                  v-model="createForm.evidenceNote"
                  label="Bukti atau alasan perencanaan"
                  rows="2"
                  hint="Disimpan sebagai catatan paket dan riwayat aktivitas maintenance."
                  persistent-hint
                />
                <VAlert
                  v-if="createForm.evidenceNote.trim().length < 10"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  Catat bukti atau alasan perencanaan.
                </VAlert>
                <VDivider class="my-4" />
                <div class="text-subtitle-2 mb-2">Kartu kerja wajib pertama</div>
                <VTextField v-model="createForm.jobCardTitle" label="Judul kartu kerja" />
                <VTextField
                  v-model="createForm.maintenanceDataRef"
                  label="Approved maintenance data reference"
                />
                <VTextField
                  v-model="createForm.maintenanceDataRevision"
                  label="Approved data revision snapshot"
                />
                <VAlert
                  v-if="
                    createForm.jobCardTitle.trim().length < 5 ||
                      createForm.maintenanceDataRef.trim().length < 2 ||
                      createForm.maintenanceDataRevision.trim().length < 1
                  "
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mb-4"
                >
                  Lengkapi judul kartu kerja dan approved-data reference.
                </VAlert>
                <VSwitch
                  v-model="createForm.requiresIndependentInspection"
                  color="primary"
                  label="Wajib pemeriksaan independen"
                />
              </div>

              <div v-else class="create-step">
                <h2 class="text-h6 mb-3">Review</h2>
                <VList density="compact" border rounded class="mb-4">
                  <VListItem
                    title="Pesawat"
                    :subtitle="selectedAircraft?.registrationNumber ?? '-'"
                  >
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 1">Ubah</VBtn>
                    </template>
                  </VListItem>
                  <VListItem
                    title="Temuan sumber"
                    :subtitle="
                      selectedDefect
                        ? `${selectedDefect.title} / ${selectedDefect.defectNumber}`
                        : '-'
                    "
                  >
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 1">Ubah</VBtn>
                    </template>
                  </VListItem>
                  <VListItem title="Pelaksanaan" :subtitle="ui.label(createForm.executionMode)">
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 2">Ubah</VBtn>
                    </template>
                  </VListItem>
                  <VListItem
                    title="Provider"
                    :subtitle="
                      createForm.executionMode === 'EXTERNAL_AMO_VENDOR'
                        ? (selectedVendor?.vendorName ?? '-')
                        : 'Pelaksanaan internal'
                    "
                  >
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 2">Ubah</VBtn>
                    </template>
                  </VListItem>
                  <VListItem title="Kartu kerja wajib" :subtitle="createForm.jobCardTitle || '-'">
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 3">Ubah</VBtn>
                    </template>
                  </VListItem>
                  <VListItem
                    title="Approved data"
                    :subtitle="
                      createForm.maintenanceDataRef
                        ? `${createForm.maintenanceDataRef} / ${createForm.maintenanceDataRevision || '-'}`
                        : 'Belum dipilih'
                    "
                  >
                    <template #append>
                      <VBtn variant="text" size="small" @click="createStep = 3">Ubah</VBtn>
                    </template>
                  </VListItem>
                </VList>
                <VAlert v-if="creationWarnings.length" type="warning" variant="tonal" class="mb-4">
                  <div class="font-weight-bold mb-2">Penghambat dan peringatan review</div>
                  <ul class="mb-0">
                    <li v-for="warning in creationWarnings" :key="warning">{{ warning }}</li>
                  </ul>
                </VAlert>
                <VAlert v-else type="success" variant="tonal">
                  Paket pekerjaan dan kartu kerja wajib pertama siap dikirim.
                </VAlert>
              </div>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VBtn variant="text" :disabled="createStep === 0 || creating" @click="previousStep">
            Kembali
          </VBtn>
          <VSpacer />
          <VBtn variant="text" :disabled="creating" @click="createDialog = false">Batal</VBtn>
          <VBtn
            v-if="createStep < 4"
            color="primary"
            :disabled="creating || !currentStepValid"
            @click="nextStep"
          >
            Lanjut
          </VBtn>
          <VBtn
            v-else
            color="primary"
            :loading="creating"
            :disabled="!canCreatePackage"
            @click="createPackage"
          >
            Buat paket
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.maintenance-command-center {
  --mro-border: rgba(var(--v-border-color), var(--v-border-opacity));
}

.maintenance-table-wrap {
  overflow-x: auto;
}

.maintenance-table :deep(table) {
  min-width: 980px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
}

.maintenance-table--attention :deep(th:nth-child(1)),
.maintenance-table--attention :deep(td:nth-child(1)) {
  width: 120px;
}

.maintenance-table--attention :deep(th:nth-child(2)),
.maintenance-table--attention :deep(td:nth-child(2)) {
  width: 250px;
}

.maintenance-table--attention :deep(th:nth-child(3)),
.maintenance-table--attention :deep(td:nth-child(3)) {
  width: 210px;
}

.maintenance-table--attention :deep(th:nth-child(4)),
.maintenance-table--attention :deep(td:nth-child(4)) {
  width: 300px;
}

.maintenance-table--attention :deep(th:nth-child(5)),
.maintenance-table--attention :deep(td:nth-child(5)) {
  width: 180px;
}

.flow-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 1px;
  overflow-x: auto;
  border: 1px solid var(--mro-border);
  border-radius: 6px;
  background: var(--mro-border);
}

.flow-step {
  min-width: 140px;
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}

.flow-step__label {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.flow-step__value {
  margin-top: 8px;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
}

.flow-step__helper {
  margin-top: 6px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.75rem;
  line-height: 1.3;
}

.mro-action-btn {
  min-width: max-content;
  font-weight: 700;
}

.create-step {
  min-height: 420px;
}
</style>
