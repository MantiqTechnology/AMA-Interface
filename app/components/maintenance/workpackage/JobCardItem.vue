<script setup lang="ts">
import type {
  MaintenanceJobCardDto,
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto,
  MaintenanceWorkPackageDto
} from '#shared/features/maintenance';
import type {
  MaintenanceMaterialRequirementDto,
  MaintenancePersonnelAssignmentDto,
  MaintenancePersonnelRequirementDto,
  MaintenanceToolRequirementDto
} from '#shared/features/maintenance-v21';
import {
  approvedDataStatusColor,
  dependencyLabels,
  displayJobCardValue,
  jobCardBlocker,
  jobCardRequiredAction,
  listOrFallback,
  releaseImpactColor,
  releaseImpactLabel
} from '../../../utils/jobCardHelper';
import ReworkActionItem from './ReworkActionItem.vue';

defineProps<{
  card: MaintenanceJobCardDto;
  allCards: MaintenanceJobCardDto[];
  reworkForms: Record<
    string,
    {
      correctiveActionDescription: string;
      approvedDataRef: string;
      statement: string;
      certifyingLicenseNumber: string;
      evidenceReferences: string;
    }
  >;
  workForm: { statement: string; certifyingLicenseNumber: string } | undefined;
  signerLicenses: MaintenanceSelectorDataDto['signerLicenses'];
  selectorsPending: boolean;
  immutable: boolean;
  canWork: boolean;
  canSign: boolean;
  canInspect: boolean;
  selfInspectionBlocked: boolean;
  canCreateNonRoutine: boolean;
  workLicenseUnusable: boolean;
  actionLoading: string;
  authorizationSummary: (action: string, licenseNumber: string) => string;
  workSignoffPlaceholder: string;
  labelOf: (value: string) => string;
  statusColor: (status: string) => string;
  formatDateTime: (value: string | null | undefined) => string;
  materials: MaintenanceMaterialRequirementDto[];
  tools: MaintenanceToolRequirementDto[];
  personnel: MaintenancePersonnelRequirementDto[];
  assignments: MaintenancePersonnelAssignmentDto[];
  mechanicSignoff: MaintenanceWorkPackageDto['jobCards'][number]['signoffs'][number] | undefined;
  inspectionSignoff: MaintenanceWorkPackageDto['jobCards'][number]['signoffs'][number] | undefined;
}>();

const emit = defineEmits<{
  start: [];
  'sign-work': [];
  'sign-rework': [MaintenanceReworkActionDto];
  'open-inspection': [];
  'create-non-routine': [];
  'update-work-license': [string];
  'update-work-statement': [string];
}>();

function hasSuspiciousApprovedDataRef(value: string | null | undefined) {
  return ['yes', 'no', 'true', 'false', '-', 'n/a'].includes((value ?? '').trim().toLowerCase());
}

function approvedDataFallbackLabel(card: MaintenanceJobCardDto) {
  if (hasSuspiciousApprovedDataRef(card.maintenanceDataRef)) {
    return 'Approved data reference belum valid. Pilih dokumen approved data resmi sebelum release.';
  }
  return `Approved data belum tertaut: ${card.maintenanceDataRef} / ${card.maintenanceDataRevision}`;
}
</script>

<template>
  <VExpansionPanel :value="card.id">
    <VExpansionPanelTitle>
      <div class="d-flex flex-wrap align-center ga-3 w-100">
        <div>
          <strong>{{ card.title }}</strong>
          <div class="text-caption text-medium-emphasis">{{ card.cardNumber }}</div>
          <div v-if="card.sourceNonRoutineFindingNumber" class="text-caption text-medium-emphasis">
            Source: {{ card.sourceNonRoutineFindingNumber }}
          </div>
        </div>
        <VSpacer />
        <VChip v-if="card.ataChapter" size="x-small" variant="tonal">
          ATA {{ card.ataChapter }}
        </VChip>
        <VChip v-if="card.componentName" size="x-small" variant="tonal">
          {{
            card.componentName
          }}
        </VChip>
        <VChip :color="releaseImpactColor(card.releaseImpact)" size="x-small" variant="tonal">
          {{ releaseImpactLabel(card.releaseImpact) }}
        </VChip>
        <VChip v-if="card.estimatedManHours" size="x-small" variant="tonal">
          {{ card.estimatedManHours }} MH
        </VChip>
        <VChip :color="statusColor(card.status)" size="small" variant="tonal">
          {{
            labelOf(card.status)
          }}
        </VChip>
      </div>
    </VExpansionPanelTitle>
    <VExpansionPanelText>
      <VRow>
        <VCol cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Approved maintenance data</div>
          <div
            v-if="hasSuspiciousApprovedDataRef(card.maintenanceDataRef)"
            class="font-weight-medium text-error"
          >
            Approved data reference belum valid
          </div>
          <div v-else class="font-weight-medium">
            {{ card.maintenanceDataRef }} / {{ card.maintenanceDataRevision }}
          </div>
        </VCol>
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Wajib</div>
          <div>{{ card.mandatoryFlag ? 'Ya' : 'Tidak' }}</div>
        </VCol>
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Pemeriksaan independen</div>
          <div>{{ card.requiresIndependentInspection ? 'Wajib' : 'Tidak wajib' }}</div>
        </VCol>
      </VRow>

      <div class="job-card-instruction mt-4">
        <div class="job-card-instruction__header">
          <div>
            <div class="text-overline text-primary">Work instruction demo</div>
            <div class="text-subtitle-1 font-weight-bold">
              Area, dokumen, instruksi, dan bukti untuk {{ card.cardNumber }}
            </div>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <VChip :color="releaseImpactColor(card.releaseImpact)" size="small" variant="tonal">
              {{ releaseImpactLabel(card.releaseImpact) }}
            </VChip>
            <VChip size="small" variant="tonal">{{ card.estimatedManHours || 0 }} MH</VChip>
          </div>
        </div>
        <VRow>
          <VCol cols="12" md="5">
            <div class="instruction-block">
              <div class="instruction-block__title">Area pesawat</div>
              <VList density="compact" class="bg-transparent pa-0">
                <VListItem title="ATA" :subtitle="displayJobCardValue(card.ataChapter)" />
                <VListItem title="Area" :subtitle="displayJobCardValue(card.aircraftArea)" />
                <VListItem
                  title="System / component"
                  :subtitle="`${displayJobCardValue(card.systemName)} / ${displayJobCardValue(card.componentName)}`"
                />
                <VListItem
                  title="Position / access"
                  :subtitle="`${displayJobCardValue(card.componentPosition)} / ${displayJobCardValue(card.accessPanel)}`"
                />
              </VList>
            </div>

            <div class="instruction-block mt-3">
              <div class="instruction-block__title">Dokumen kerja</div>
              <template v-if="card.approvedDataLinks.length">
                <div
                  v-for="link in card.approvedDataLinks"
                  :key="link.id"
                  class="approved-data-link"
                >
                  <div>
                    <strong>{{ link.documentType }} {{ link.documentNumber }}</strong>
                    <div class="text-caption text-medium-emphasis">{{ link.documentTitle }}</div>
                    <div class="text-caption">
                      Snapshot {{ link.snapshotRevision }} / {{ link.snapshotEffectiveDate }}
                    </div>
                  </div>
                  <div class="d-flex flex-wrap align-center ga-2">
                    <VChip
                      :color="approvedDataStatusColor(link.revisionStatus)"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ link.revisionStatus ?? 'REFERENCE' }}
                    </VChip>
                    <VBtn
                      v-if="link.demoFileUrl"
                      :href="link.demoFileUrl"
                      target="_blank"
                      rel="noopener"
                      size="x-small"
                      variant="tonal"
                      prepend-icon="mdi-file-document-outline"
                    >
                      {{ link.demoFileLabel ?? 'Demo reference' }}
                    </VBtn>
                    <span class="text-caption text-medium-emphasis">
                      {{ link.demoPageRef ?? link.usageNote ?? 'Demo reference' }}
                    </span>
                  </div>
                </div>
              </template>
              <VAlert v-else type="warning" variant="tonal" density="compact">
                {{ approvedDataFallbackLabel(card) }}
              </VAlert>
            </div>
          </VCol>

          <VCol cols="12" md="7">
            <div class="instruction-grid">
              <div class="instruction-block">
                <div class="instruction-block__title">Prasyarat</div>
                <ul>
                  <li v-for="item in listOrFallback(card.prerequisites)" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div class="instruction-block">
                <div class="instruction-block__title">Safety caution</div>
                <ul>
                  <li v-for="item in listOrFallback(card.safetyCautions)" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="instruction-block">
                <div class="instruction-block__title">Langkah kerja</div>
                <ol>
                  <li v-for="item in listOrFallback(card.workSteps)" :key="item">{{ item }}</li>
                </ol>
              </div>
              <div class="instruction-block">
                <div class="instruction-block__title">Acceptance criteria</div>
                <ul>
                  <li v-for="item in listOrFallback(card.acceptanceCriteria)" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="instruction-block">
                <div class="instruction-block__title">Bukti wajib</div>
                <ul>
                  <li v-for="item in listOrFallback(card.requiredEvidence)" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="instruction-block">
                <div class="instruction-block__title">Planning context</div>
                <VList density="compact" class="bg-transparent pa-0">
                  <VListItem
                    title="Skill / license"
                    :subtitle="displayJobCardValue(card.skillRequirement)"
                  />
                  <VListItem
                    title="Dependency"
                    :subtitle="dependencyLabels(card, allCards).join(', ')"
                  />
                </VList>
              </div>
            </div>

            <div class="instruction-block mt-3">
              <div class="instruction-block__title">Resource terkait Job Card</div>
              <div class="resource-summary-row">
                <VChip size="small" variant="tonal">Material {{ materials.length }}</VChip>
                <VChip size="small" variant="tonal">Tool {{ tools.length }}</VChip>
                <VChip size="small" variant="tonal">Personnel {{ personnel.length }}</VChip>
                <VChip v-if="assignments.length" color="success" size="small" variant="tonal">
                  Assigned {{ assignments.length }}
                </VChip>
              </div>
            </div>
          </VCol>
        </VRow>
      </div>

      <VRow class="mt-2">
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Pelaksana</div>
          <div>{{ mechanicSignoff?.actorRole ?? 'Menunggu teknisi' }}</div>
        </VCol>
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Status pekerjaan</div>
          <div>{{ labelOf(card.status) }}</div>
        </VCol>
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Penghambat</div>
          <div>{{ jobCardBlocker(card) }}</div>
        </VCol>
        <VCol cols="12" md="3">
          <div class="text-caption text-medium-emphasis">Langkah berikutnya</div>
          <div>{{ jobCardRequiredAction(card) }}</div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Dibuat</div>
          <div>{{ formatDateTime(card.createdAt) }}</div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Diperbarui</div>
          <div>{{ formatDateTime(card.updatedAt) }}</div>
        </VCol>
      </VRow>

      <VRow class="mt-2">
        <VCol cols="12" md="6">
          <div class="signoff-panel">
            <div class="text-subtitle-2">Pengesahan teknisi</div>
            <template v-if="mechanicSignoff">
              <div>{{ mechanicSignoff.statement }}</div>
              <div class="text-caption text-medium-emphasis mt-2">
                {{ mechanicSignoff.actorRole }} / {{ formatDateTime(mechanicSignoff.signedAt) }}
              </div>
            </template>
            <div v-else class="text-medium-emphasis">Belum disahkan.</div>
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="signoff-panel">
            <div class="text-subtitle-2">Pemeriksaan independen</div>
            <template v-if="inspectionSignoff">
              <div>{{ inspectionSignoff.statement }}</div>
              <div class="text-caption text-medium-emphasis mt-2">
                {{ inspectionSignoff.actorRole }} / {{ formatDateTime(inspectionSignoff.signedAt) }}
              </div>
            </template>
            <div v-else class="text-medium-emphasis">Belum selesai.</div>
          </div>
        </VCol>
      </VRow>

      <div v-if="card.inspectionAttempts.length" class="mt-4">
        <div class="text-subtitle-2 mb-2">Riwayat Inspection</div>
        <VTable density="compact" class="inspection-table">
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Siklus</th>
              <th>Hasil</th>
              <th>Temuan</th>
              <th>Inspector</th>
              <th>Lisensi</th>
              <th>Dicatat</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="attempt in card.inspectionAttempts" :key="attempt.id">
              <td>{{ attempt.attemptNumber }}</td>
              <td>{{ attempt.cycleNumber }}</td>
              <td>
                <VChip
                  :color="attempt.result === 'PASSED' ? 'success' : 'warning'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ labelOf(attempt.result) }}
                </VChip>
              </td>
              <td>{{ attempt.finding }}</td>
              <td>{{ attempt.inspectorRole }}</td>
              <td>{{ attempt.inspectorLicenseNumber }}</td>
              <td>{{ formatDateTime(attempt.inspectedAt) }}</td>
              <td><VChip size="x-small" variant="tonal">Permanen</VChip></td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <div v-if="card.reworkActions.length" class="mt-4">
        <div class="text-subtitle-2 mb-2">Perbaikan ulang</div>
        <ReworkActionItem
          v-for="rework in card.reworkActions"
          :key="rework.id"
          :rework="rework"
          :form="reworkForms[rework.id]"
          :can-work="canWork"
          :immutable="immutable"
          :signer-licenses="signerLicenses"
          :selectors-pending="selectorsPending"
          :loading="actionLoading === `rework-${rework.id}`"
          :authorization-summary="authorizationSummary"
          :label-of="labelOf"
          :format-date-time="formatDateTime"
          @sign="emit('sign-rework', rework)"
        />
      </div>

      <VDivider class="my-4" />
      <div v-if="canSign && workForm" class="job-card-action-panel mb-4">
        <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-3">
          <div>
            <div class="text-overline text-primary">Pengesahan pekerjaan</div>
            <div class="text-subtitle-2 font-weight-bold">
              Pernyataan penyelesaian untuk {{ card.cardNumber }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              Pernyataan ini hanya berlaku untuk Job Card yang sedang dibuka.
            </div>
          </div>
          <VChip color="primary" size="small" variant="tonal">{{ labelOf(card.status) }}</VChip>
        </div>
        <VRow>
          <VCol cols="12" md="5">
            <VSelect
              :model-value="workForm.certifyingLicenseNumber"
              label="Lisensi teknisi untuk job card ini"
              :items="signerLicenses"
              item-value="licenseNumber"
              :item-title="(license) => `${license.personnelName} / ${license.licenseNumber}`"
              density="compact"
              :loading="selectorsPending"
              no-data-text="Tidak ada lisensi untuk aktor aktif"
              variant="outlined"
              @update:model-value="emit('update-work-license', String($event ?? ''))"
            />
            <VAlert type="success" variant="tonal" density="compact">
              {{
                authorizationSummary(
                  `Pengesahan pekerjaan ${card.cardNumber}`,
                  workForm.certifyingLicenseNumber
                )
              }}
            </VAlert>
            <VAlert
              v-if="workLicenseUnusable"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              Lisensi ini tidak dapat digunakan sekarang. Perintah pengesahan akan ditolak backend.
            </VAlert>
          </VCol>
          <VCol cols="12" md="7">
            <VTextarea
              :model-value="workForm.statement"
              label="Pernyataan penyelesaian pekerjaan"
              :placeholder="workSignoffPlaceholder"
              rows="3"
              auto-grow
              density="compact"
              variant="outlined"
              @update:model-value="emit('update-work-statement', String($event ?? ''))"
            />
          </VCol>
        </VRow>
        <div class="d-flex flex-wrap align-center ga-2">
          <VAlert type="info" variant="tonal" density="compact" class="flex-grow-1">
            Pemeriksaan independen tetap dicatat terpisah oleh personel berwenang yang berbeda.
          </VAlert>
          <VBtn
            color="primary"
            :disabled="
              immutable ||
                !(workForm.statement.trim().length >= 10 && workForm.certifyingLicenseNumber)
            "
            :loading="actionLoading === `sign-${card.id}`"
            @click="emit('sign-work')"
          >
            Sahkan pekerjaan {{ card.cardNumber }}
          </VBtn>
        </div>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-if="canWork && card.status === 'READY'"
          size="small"
          `
          :loading="actionLoading === `start-${card.id}`"
          :disabled="immutable"
          @click="emit('start')"
        >
          Mulai pekerjaan
        </VBtn>
        <VBtn
          v-if="canInspect"
          size="small"
          color="success"
          :disabled="immutable"
          :loading="actionLoading === `inspect-${card.id}`"
          @click="emit('open-inspection')"
        >
          {{ card.reworkActions.length ? 'Catat re-Inspection' : 'Catat independent Inspection' }}
        </VBtn>
        <VAlert v-else-if="selfInspectionBlocked" type="info" variant="tonal" density="compact">
          Aktor ini melakukan Sign-off pekerjaan teknisi, sehingga independent Inspection harus
          dilakukan oleh personel berwenang yang berbeda.
        </VAlert>
        <VBtn
          v-if="canCreateNonRoutine"
          size="small"
          color="warning"
          variant="tonal"
          :loading="actionLoading === 'create-nr'"
          @click="emit('create-non-routine')"
        >
          Catat Temuan
        </VBtn>
      </div>
    </VExpansionPanelText>
  </VExpansionPanel>
</template>
