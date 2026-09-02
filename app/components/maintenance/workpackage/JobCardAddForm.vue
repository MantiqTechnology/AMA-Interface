<script setup lang="ts">
import type { MaintenanceJobCardDto } from '#shared/features/maintenance';
import { dependencyIds, instructionLines } from '../../../utils/jobCardHelper';

const props = defineProps<{
  workPackageId: string;
  workPackageVersion: number;
  approvedDataRevisionItems: Array<{
    title: string;
    value: string;
    document: { documentType: string; documentNumber: string };
    revision: { revision: string };
  }>;
  loading: boolean;
}>();

const emit = defineEmits<{ created: [] }>();

const form = reactive({
  title: '',
  taskType: 'DEFECT_RECTIFICATION',
  maintenanceDataRef: '',
  maintenanceDataRevision: '',
  approvedDataRevisionId: '',
  ataChapter: '',
  aircraftArea: '',
  systemName: '',
  componentName: '',
  componentPosition: '',
  accessPanel: '',
  estimatedManHours: 1,
  skillRequirement: '',
  releaseImpact: 'BLOCKS_RELEASE' as MaintenanceJobCardDto['releaseImpact'],
  prerequisitesText: 'Aircraft safe for maintenance\nReferenced maintenance data reviewed',
  safetyCautionsText: 'Follow aircraft isolation and placarding procedure before work',
  workStepsText:
    'Inspect affected area\nPerform corrective action using referenced data\nRecord evidence and prepare sign-off',
  acceptanceCriteriaText:
    'Condition corrected within approved data limits\nNo open discrepancy remains for this task',
  requiredEvidenceText:
    'Technician sign-off statement\nPhoto or measurement evidence\nOperational/functional check result',
  dependencyJobCardIdsText: '',
  mandatoryFlag: true,
  requiresIndependentInspection: true
});
const instructionPanel = ref<string | null>(null);

watch(
  () => form.approvedDataRevisionId,
  (revisionId) => {
    const item = props.approvedDataRevisionItems.find((entry) => entry.value === revisionId);
    if (!item) {
      form.maintenanceDataRef = '';
      form.maintenanceDataRevision = '';
      return;
    }
    form.maintenanceDataRef = item.document.documentNumber;
    form.maintenanceDataRevision = item.revision.revision;
  }
);

watch(
  () => form.mandatoryFlag,
  (mandatory) => {
    if (!mandatory && form.releaseImpact === 'BLOCKS_RELEASE') form.releaseImpact = 'ADVISORY';
    else if (mandatory && form.releaseImpact === 'ADVISORY') form.releaseImpact = 'BLOCKS_RELEASE';
  }
);

async function submit() {
  await fetchApi(`/api/maintenance/work-packages/${props.workPackageId}/job-cards`, {
    method: 'POST',
    body: {
      title: form.title,
      taskType: form.taskType,
      maintenanceDataRef: form.maintenanceDataRef,
      maintenanceDataRevision: form.maintenanceDataRevision,
      approvedDataRevisionId: form.approvedDataRevisionId || null,
      ataChapter: form.ataChapter || null,
      aircraftArea: form.aircraftArea || null,
      systemName: form.systemName || null,
      componentName: form.componentName || null,
      componentPosition: form.componentPosition || null,
      accessPanel: form.accessPanel || null,
      estimatedManHours: form.estimatedManHours,
      skillRequirement: form.skillRequirement || null,
      releaseImpact: form.releaseImpact,
      workSteps: instructionLines(form.workStepsText),
      acceptanceCriteria: instructionLines(form.acceptanceCriteriaText),
      requiredEvidence: instructionLines(form.requiredEvidenceText),
      safetyCautions: instructionLines(form.safetyCautionsText),
      prerequisites: instructionLines(form.prerequisitesText),
      dependencyJobCardIds: dependencyIds(form.dependencyJobCardIdsText),
      mandatoryFlag: form.mandatoryFlag,
      requiresIndependentInspection: form.requiresIndependentInspection,
      expectedWorkPackageVersion: props.workPackageVersion
    }
  });
  form.title = '';
  form.maintenanceDataRef = '';
  form.maintenanceDataRevision = '';
  form.approvedDataRevisionId = '';
  emit('created');
}

// Reset the whole form if the parent work package changes, mirroring the
// same-instance-reuse fix applied in useJobCardWorkflow.
watch(
  () => props.workPackageId,
  () => {
    form.title = '';
    form.maintenanceDataRef = '';
    form.maintenanceDataRevision = '';
    form.approvedDataRevisionId = '';
  }
);
</script>

<template>
  <VCard border class="mb-4">
    <VCardTitle>Tambah kartu kerja</VCardTitle>
    <VCardText>
      <VTextField v-model="form.title" label="Judul" />
      <VSelect
        v-model="form.approvedDataRevisionId"
        label="Approved maintenance data"
        :items="approvedDataRevisionItems"
        item-title="title"
        item-value="value"
        variant="outlined"
        density="compact"
        no-data-text="Belum ada approved data demo"
      />
      <VRow dense>
        <VCol cols="12" md="6">
          <VTextField
            v-model="form.maintenanceDataRef"
            label="Approved maintenance data reference"
            readonly
            variant="outlined"
            density="compact"
          />
        </VCol>
        <VCol cols="12" md="6">
          <VTextField
            v-model="form.maintenanceDataRevision"
            label="Revision snapshot"
            readonly
            variant="outlined"
            density="compact"
          />
        </VCol>
      </VRow>
      <VExpansionPanels v-model="instructionPanel" class="mb-3">
        <VExpansionPanel value="instruction">
          <VExpansionPanelTitle>Detail instruksi demo</VExpansionPanelTitle>
          <VExpansionPanelText>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.ataChapter"
                  label="ATA chapter"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.aircraftArea"
                  label="Area pesawat"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.systemName"
                  label="System"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.componentName"
                  label="Component"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.componentPosition"
                  label="Position"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="form.accessPanel"
                  label="Access panel"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="form.estimatedManHours"
                  label="Estimated MH"
                  type="number"
                  min="0"
                  step="0.25"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.releaseImpact"
                  label="Release impact"
                  :items="[
                    { title: 'Memblokir rilis', value: 'BLOCKS_RELEASE' },
                    { title: 'Advisory', value: 'ADVISORY' },
                    { title: 'Tidak berdampak rilis', value: 'NO_RELEASE_IMPACT' }
                  ]"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.skillRequirement"
                  label="Skill / license requirement"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.prerequisitesText"
                  label="Prasyarat"
                  rows="2"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.safetyCautionsText"
                  label="Safety caution"
                  rows="2"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.workStepsText"
                  label="Langkah kerja"
                  rows="3"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.acceptanceCriteriaText"
                  label="Acceptance criteria"
                  rows="2"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.requiredEvidenceText"
                  label="Bukti wajib"
                  rows="2"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="form.dependencyJobCardIdsText"
                  label="Dependency Job Card ID / number"
                  rows="2"
                  density="compact"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      <VSwitch v-model="form.mandatoryFlag" label="Pekerjaan wajib" color="primary" />
      <VSwitch
        v-model="form.requiresIndependentInspection"
        label="Wajib independent Inspection"
        color="primary"
      />
      <VBtn
        color="primary"
        :disabled="form.title.length < 5 || !form.approvedDataRevisionId"
        :loading="loading"
        @click="submit"
      >
        Tambah kartu kerja
      </VBtn>
    </VCardText>
  </VCard>
</template>
