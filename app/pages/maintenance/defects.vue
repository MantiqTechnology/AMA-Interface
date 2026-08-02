<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';
import type { MaintenanceErrorPresentation } from '../../composables/useMaintenanceUi';

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const { can } = useAuthorization();
const filters = reactive({
  search: '',
  aircraft: '',
  assessment: '',
  packageState: ''
});
const assessmentDialog = ref(false);
const assessmentLoading = ref(false);
const assessmentError = ref<MaintenanceErrorPresentation | null>(null);
const assessmentTarget = ref<MaintenanceCommandCenterDto['defects'][number] | null>(null);
const assessmentForm = reactive({
  assessmentDecision: 'GROUND' as 'GROUND' | 'DEFER' | 'NO_IMPACT',
  assessmentNote: ''
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-defects', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const canAssess = computed(() => can('maintenance.defect.assess').allowed);
const canPlan = computed(() => can('maintenance.package.plan').allowed);
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const aircraftItems = computed(() => [
  ...new Set((data.value?.defects ?? []).map((defect) => defect.aircraftRegistrationNumber))
]);
const assessmentItems = computed(() =>
  [
    ...new Set(
      (data.value?.defects ?? [])
        .map((defect) => defect.assessmentDecision ?? 'NOT_ASSESSED')
        .filter(Boolean)
    )
  ].map((value) => ({
    title: value === 'NOT_ASSESSED' ? 'Not assessed' : ui.label(value),
    value
  }))
);
const packageStateItems = [
  { title: 'Linked to package', value: 'LINKED' },
  { title: 'Package action available', value: 'AVAILABLE' },
  { title: 'Package action blocked', value: 'BLOCKED' }
];
const defects = computed(() =>
  (data.value?.defects ?? []).filter((defect) => {
    const query = filters.search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [
        defect.defectNumber,
        defect.title,
        defect.description,
        defect.aircraftRegistrationNumber,
        defect.derivedSourceFlightNumber,
        defect.sourceReference
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesAircraft =
      !filters.aircraft || defect.aircraftRegistrationNumber === filters.aircraft;
    const matchesAssessment =
      !filters.assessment ||
      (filters.assessment === 'NOT_ASSESSED'
        ? !defect.assessmentDecision
        : defect.assessmentDecision === filters.assessment);
    const canCreate = packageCreationAvailable(defect);
    const packageState = defect.activeWorkPackageId
      ? 'LINKED'
      : canCreate
        ? 'AVAILABLE'
        : 'BLOCKED';
    return (
      matchesQuery &&
      matchesAircraft &&
      matchesAssessment &&
      (!filters.packageState || packageState === filters.packageState)
    );
  })
);

const hasFilters = computed(() =>
  Boolean(filters.search.trim() || filters.aircraft || filters.assessment || filters.packageState)
);

function ageText(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function linkedPackage(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (data.value?.workPackages ?? []).find((item) => item.id === defect.activeWorkPackageId);
}

function assessmentLabel(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return defect.assessmentDecision ? ui.label(defect.assessmentDecision) : 'Assessment required';
}

function groundingImpact(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.assessmentDecision === 'GROUND') return 'Grounding defect';
  if (defect.assessmentDecision === 'DEFER') return 'Deferred technical control';
  if (defect.assessmentDecision === 'NO_IMPACT') return 'No MRO package required';
  return 'Awaiting assessment';
}

function defermentState(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.status === 'DEFERRED') return 'Deferred record';
  if (defect.assessmentDecision === 'DEFER') return 'Deferred assessment';
  return 'No deferment recorded';
}

function packageCreationAvailable(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (
    !defect.activeWorkPackageId && ['GROUND', 'DEFER'].includes(defect.assessmentDecision ?? '')
  );
}

function currentBlocker(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Active package controls the rectification.';
  if (!defect.assessmentDecision) return 'Maintenance assessment is required.';
  if (defect.assessmentDecision === 'NO_IMPACT') return 'Assessment does not require MRO package.';
  return 'No work package has been created.';
}

function requiredAction(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Open the linked work package.';
  if (!defect.assessmentDecision) return 'Assess the defect before planning work.';
  if (packageCreationAvailable(defect)) return 'Create a contextual work package.';
  return 'Review the assessment note and audit trail.';
}

function owner(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) {
    return linkedPackage(defect)?.status === 'READY_FOR_RELEASE'
      ? 'Certifying Staff'
      : 'Maintenance Control';
  }
  return 'Maintenance Control';
}

function openAssessment(defect: MaintenanceCommandCenterDto['defects'][number]) {
  assessmentTarget.value = defect;
  assessmentError.value = null;
  assessmentForm.assessmentDecision = 'GROUND';
  assessmentForm.assessmentNote = `Maintenance assessment for ${defect.defectNumber}: `;
  assessmentDialog.value = true;
}

async function submitAssessment() {
  if (!assessmentTarget.value || assessmentForm.assessmentNote.trim().length < 10) return;
  assessmentLoading.value = true;
  assessmentError.value = null;
  try {
    await fetchApi(`/api/maintenance/defects/${assessmentTarget.value.id}/actions/assess`, {
      method: 'POST',
      body: {
        assessmentDecision: assessmentForm.assessmentDecision,
        assessmentNote: assessmentForm.assessmentNote
      }
    });
    assessmentDialog.value = false;
    await refresh();
  } catch (errorValue) {
    assessmentError.value = ui.presentError(errorValue);
  } finally {
    assessmentLoading.value = false;
  }
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Defects</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Open and deferred technical defects with maintenance assessment and package linkage.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Access restricted.</strong>
      <div>Operational impact: defect queue cannot be displayed for this role.</div>
      <div>Required action: switch to a role with maintenance read permission.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Unable to load defect queue.</strong>
      <div>Operational impact: assessment and package linkage cannot be confirmed.</div>
      <div>Required action: retry the authoritative maintenance query.</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Retry</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Search defect, aircraft, source, or summary"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="360"
          />
          <VSelect
            v-model="filters.aircraft"
            :items="aircraftItems"
            clearable
            hide-details
            density="compact"
            label="Aircraft"
            max-width="200"
          />
          <VSelect
            v-model="filters.assessment"
            :items="assessmentItems"
            item-title="title"
            item-value="value"
            clearable
            hide-details
            density="compact"
            label="Assessment"
            max-width="220"
          />
          <VSelect
            v-model="filters.packageState"
            :items="packageStateItems"
            clearable
            hide-details
            density="compact"
            label="Package state"
            max-width="230"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ defects.length }} result(s)</VChip>
        </div>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--defects">
            <thead>
              <tr>
                <th>Defect</th>
                <th>Aircraft, source, age</th>
                <th>Summary</th>
                <th>Status and impact</th>
                <th>Package, blocker, action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Loading defects...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Access restricted for the active role.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Defect data is unavailable until the API request succeeds.</td>
              </tr>
              <template v-else>
                <tr v-for="defect in defects" :key="defect.id">
                  <td class="sticky-identifier">
                    <div class="font-weight-bold">{{ defect.defectNumber }}</div>
                    <div class="text-caption text-medium-emphasis">{{ defect.title }}</div>
                  </td>
                  <td>
                    <NuxtLink
                      class="font-weight-medium"
                      :to="`/master-data/aircraft/${defect.aircraftId}`"
                    >
                      {{ defect.aircraftRegistrationNumber }}
                    </NuxtLink>
                    <div class="text-caption text-medium-emphasis">
                      {{ defect.derivedSourceFlightNumber ?? defect.sourceReference ?? '-' }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ format.dateTime(defect.detectedAt) }} / {{ ageText(defect.detectedAt) }}
                    </div>
                  </td>
                  <td>{{ defect.description }}</td>
                  <td>
                    <div>{{ ui.label(defect.status) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ assessmentLabel(defect) }}
                    </div>
                    <div class="mt-1">{{ groundingImpact(defect) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ defermentState(defect) }}
                    </div>
                  </td>
                  <td>
                    <VBtn
                      v-if="defect.activeWorkPackageId"
                      :to="`/maintenance/work-packages/${defect.activeWorkPackageId}`"
                      variant="text"
                      size="small"
                    >
                      {{ defect.activeWorkPackageNumber }}
                    </VBtn>
                    <span v-else>-</span>
                    <div class="text-caption text-medium-emphasis">{{ owner(defect) }}</div>
                    <div class="mt-1">{{ currentBlocker(defect) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Required action: {{ requiredAction(defect) }}
                    </div>
                    <div class="d-flex flex-wrap ga-1 mt-2">
                      <VBtn
                        v-if="canAssess && !defect.assessmentDecision"
                        variant="text"
                        size="small"
                        @click="openAssessment(defect)"
                      >
                        Assess
                      </VBtn>
                      <VBtn
                        v-if="canPlan && packageCreationAvailable(defect)"
                        :to="{ path: '/maintenance', query: { defect: defect.defectNumber } }"
                        variant="text"
                        size="small"
                      >
                        Create Work Package
                      </VBtn>
                      <VBtn
                        v-if="defect.activeWorkPackageId"
                        :to="`/maintenance/work-packages/${defect.activeWorkPackageId}`"
                        variant="text"
                        size="small"
                      >
                        Open Work Package
                      </VBtn>
                      <VBtn
                        :to="`/master-data/aircraft/${defect.aircraftId}`"
                        variant="text"
                        size="small"
                      >
                        View Aircraft
                      </VBtn>
                      <VBtn
                        :to="
                          defect.activeWorkPackageNumber
                            ? `/maintenance/records?package=${defect.activeWorkPackageNumber}`
                            : `/maintenance/records?aircraft=${defect.aircraftRegistrationNumber}`
                        "
                        variant="text"
                        size="small"
                      >
                        View Audit
                      </VBtn>
                    </div>
                  </td>
                </tr>
                <tr v-if="!defects.length">
                  <td colspan="5">
                    {{ hasFilters ? 'No defects match the current filters.' : 'No open defects.' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>

    <VDialog v-model="assessmentDialog" max-width="680" persistent>
      <VCard>
        <VCardTitle>Assess Defect</VCardTitle>
        <VCardText>
          <VAlert v-if="assessmentError" type="error" variant="tonal" class="mb-4">
            <strong>{{ assessmentError.title }}</strong>
            <div>{{ assessmentError.impact }}</div>
            <div class="text-caption">Required action: {{ assessmentError.requiredAction }}</div>
          </VAlert>
          <VAlert v-if="assessmentTarget" type="info" variant="tonal" class="mb-4">
            {{ assessmentTarget.defectNumber }} / {{ assessmentTarget.aircraftRegistrationNumber }}
          </VAlert>
          <VSelect
            v-model="assessmentForm.assessmentDecision"
            label="Assessment decision"
            :items="[
              { title: 'Ground until rectified', value: 'GROUND' },
              { title: 'Defer under technical control', value: 'DEFER' },
              { title: 'No maintenance impact', value: 'NO_IMPACT' }
            ]"
            item-title="title"
            item-value="value"
          />
          <VTextarea
            v-model="assessmentForm.assessmentNote"
            label="Assessment note"
            rows="4"
            hint="Minimum 10 characters. Stored by the backend audit trail."
            persistent-hint
          />
        </VCardText>
        <VCardActions>
          <VBtn variant="text" :disabled="assessmentLoading" @click="assessmentDialog = false">
            Cancel
          </VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            :loading="assessmentLoading"
            :disabled="assessmentForm.assessmentNote.trim().length < 10"
            @click="submitAssessment"
          >
            Save assessment
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.maintenance-table-wrap {
  overflow-x: auto;
}

.maintenance-table :deep(table) {
  min-width: 1040px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
}

.maintenance-table--defects :deep(th:nth-child(1)),
.maintenance-table--defects :deep(td:nth-child(1)) {
  width: 190px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--defects :deep(th:nth-child(2)),
.maintenance-table--defects :deep(td:nth-child(2)) {
  width: 180px;
}

.maintenance-table--defects :deep(th:nth-child(3)),
.maintenance-table--defects :deep(td:nth-child(3)) {
  width: 260px;
}

.maintenance-table--defects :deep(th:nth-child(4)),
.maintenance-table--defects :deep(td:nth-child(4)) {
  width: 170px;
}

.maintenance-table--defects :deep(th:nth-child(5)),
.maintenance-table--defects :deep(td:nth-child(5)) {
  width: 330px;
}
</style>
