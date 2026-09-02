<script setup lang="ts">
import type {
  MaintenanceJobCardDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type {
  MaintenanceMaterialRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelRequirementDto,
  MaintenanceToolRequirementDto
} from '#shared/features/maintenance-v21';
import { useJobCardWorkflow } from '../../../composables/useJobCardWorkflow';
import JobCardItem from './JobCardItem.vue';
import InspectionDialog from './InspectionDialog.vue';

const props = defineProps<{
  workPackage: MaintenanceWorkPackageDto;
  immutable: boolean;
  selectorsPending: boolean;
  materialForCard: (card: MaintenanceJobCardDto) => MaintenanceMaterialRequirementDto[];
  toolsForCard: (card: MaintenanceJobCardDto) => MaintenanceToolRequirementDto[];
  personnelForCard: (card: MaintenanceJobCardDto) => MaintenancePersonnelRequirementDto[];
  assignmentsForCard: (card: MaintenanceJobCardDto) => MaintenancePersonnelAssignmentDto[];
}>();

const emit = defineEmits<{
  mutated: [];
  'create-non-routine': [MaintenanceJobCardDto];
}>();

const ui = useMaintenanceUi();
const format = useLocaleFormat();

const { data: selectorData, pending: selectorsPendingLocal } = await useAsyncData(
  'maintenance-detail-selector-data',
  () => fetchApi<MaintenanceSelectorDataDto>('/api/maintenance/selector-data'),
  { server: false }
);

const signerLicenses = computed(() => selectorData.value?.signerLicenses ?? []);

const workPackageRef = toRef(props, 'workPackage');

const workflow = useJobCardWorkflow({
  workPackage: workPackageRef,
  signerLicenses,
  onMutated: () => emit('mutated')
});

function canCreateNonRoutine(card: MaintenanceJobCardDto) {
  return (
    workflow.canWork.value &&
    !props.immutable &&
    card.status === 'IN_PROGRESS' &&
    !card.sourceNonRoutineFindingId
  );
}

function updateWorkLicense(card: MaintenanceJobCardDto, licenseNumber: string) {
  const form = workflow.workForms[card.id];
  if (form) {
    form.certifyingLicenseNumber = licenseNumber;
  }
}

function updateWorkStatement(card: MaintenanceJobCardDto, statement: string) {
  const form = workflow.workForms[card.id];
  if (form) {
    form.statement = statement;
  }
}
</script>

<template>
  <VCard border class="mb-4">
    <VCardTitle>Job Card dan Sign-off permanen</VCardTitle>
    <VCardText>
      <VAlert v-if="workflow.actionError.value" type="error" variant="tonal" class="mb-4">
        <strong>{{ workflow.actionError.value.title }}</strong>
        <div>{{ workflow.actionError.value.impact }}</div>
        <div class="text-caption">
          Langkah berikutnya: {{ workflow.actionError.value.requiredAction }}
        </div>
      </VAlert>
      <VAlert v-if="workflow.actionSuccess.value" type="success" variant="tonal" class="mb-4">
        {{ workflow.actionSuccess.value }}
      </VAlert>
      <VAlert
        v-if="workflow.failedInspectionResult.value"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        <div class="font-weight-bold">Pemeriksaan tidak lulus - perbaikan ulang diperlukan</div>
        <div>
          Temuan Inspection sudah dicatat. Technical Release diblokir sampai corrective work selesai
          dan re-Inspection dinyatakan lulus.
        </div>
        <div class="d-flex flex-wrap ga-2 mt-3">
          <VBtn
            v-if="workflow.failedInspectionResult.value.reworkActionId"
            size="small"
            variant="tonal"
            :href="`#${workflow.failedInspectionResult.value.reworkActionId}`"
          >
            Buka Perbaikan Ulang
          </VBtn>
          <VBtn
            size="small"
            variant="tonal"
            :to="`/maintenance/records?package=${workflow.failedInspectionResult.value.packageNumber}`"
          >
            Lihat Riwayat Aktivitas
          </VBtn>
        </div>
      </VAlert>

      <VExpansionPanels>
        <JobCardItem
          v-for="card in workPackage.jobCards"
          :key="card.id"
          :card="card"
          :all-cards="workPackage.jobCards"
          :rework-forms="workflow.reworkForms"
          :work-form="workflow.workForms[card.id]"
          :signer-licenses="signerLicenses"
          :selectors-pending="selectorsPending || selectorsPendingLocal"
          :immutable="immutable"
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
          :format-date-time="format.dateTime"
          :materials="materialForCard(card)"
          :tools="toolsForCard(card)"
          :personnel="personnelForCard(card)"
          :assignments="assignmentsForCard(card)"
          :mechanic-signoff="workflow.signoff(card, 'MECHANIC')"
          :inspection-signoff="workflow.signoff(card, 'INDEPENDENT_INSPECTION')"
          @start="workflow.start(card)"
          @sign-work="workflow.signWork(card)"
          @update-work-license="updateWorkLicense(card, $event)"
          @update-work-statement="updateWorkStatement(card, $event)"
          @open-inspection="workflow.openInspectionDialog(card)"
          @create-non-routine="emit('create-non-routine', card)"
        />
      </VExpansionPanels>
      <VEmptyState v-if="!workPackage.jobCards.length" title="Belum ada kartu kerja" />
    </VCardText>
  </VCard>

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
      Boolean(workflow.inspectionCard.value && workflow.activeRework(workflow.inspectionCard.value))
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
</template>
