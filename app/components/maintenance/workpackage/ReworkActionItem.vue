<script setup lang="ts">
import type {
  MaintenanceReworkActionDto,
  MaintenanceSelectorDataDto
} from '#shared/features/maintenance';
import { isReworkEditable } from '../../../utils/jobCardHelper';

const props = defineProps<{
  rework: MaintenanceReworkActionDto;
  form: {
    correctiveActionDescription: string;
    approvedDataRef: string;
    statement: string;
    certifyingLicenseNumber: string;
    evidenceReferences: string;
  };
  canWork: boolean;
  immutable: boolean;
  signerLicenses: MaintenanceSelectorDataDto['signerLicenses'];
  selectorsPending: boolean;
  loading: boolean;
  authorizationSummary: (action: string, licenseNumber: string) => string;
  labelOf: (value: string) => string;
  formatDateTime: (value: string | null | undefined) => string;
}>();

const emit = defineEmits<{ sign: [] }>();

function signerLicenseTitle(license: MaintenanceSelectorDataDto['signerLicenses'][number]) {
  return `${license.personnelName} / ${license.licenseNumber}`;
}

const editable = computed(
  () => props.canWork && !props.immutable && isReworkEditable(props.rework)
);
const formModel = computed(() => props.form);
const canSign = computed(
  () =>
    formModel.value.correctiveActionDescription.length >= 10 &&
    formModel.value.approvedDataRef.length >= 2 &&
    formModel.value.statement.length >= 10 &&
    Boolean(formModel.value.certifyingLicenseNumber)
);
</script>

<template>
  <VCard :id="rework.id" border class="mb-3 rework-action">
    <VCardText>
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <strong>{{ rework.reworkNumber }}</strong>
        <VChip size="x-small" variant="tonal">Siklus {{ rework.cycleNumber }}</VChip>
        <VChip
          :color="rework.status === 'REINSPECTION_PASSED' ? 'success' : 'warning'"
          size="x-small"
          variant="tonal"
        >
          {{ labelOf(rework.status) }}
        </VChip>
        <VChip size="x-small" variant="tonal">Sumber permanen</VChip>
      </div>
      <VRow>
        <VCol cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Temuan tidak lulus</div>
          <div>{{ rework.finding }}</div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="text-caption text-medium-emphasis">Tindakan perbaikan</div>
          <div>{{ rework.correctiveActionDescription || 'Perbaikan ulang belum disahkan.' }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Approved maintenance data</div>
          <div>{{ rework.approvedDataRef || 'Menunggu' }}</div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Pengesahan perbaikan</div>
          <div>
            {{
              rework.mechanicSignoffAt
                ? `${rework.mechanicSignoffRole} / ${formatDateTime(rework.mechanicSignoffAt)}`
                : 'Menunggu'
            }}
          </div>
        </VCol>
        <VCol cols="12" md="4">
          <div class="text-caption text-medium-emphasis">Hasil re-Inspection</div>
          <div>
            {{
              rework.reinspectionAttemptId
                ? labelOf(rework.status)
                : 'Wajib setelah pengesahan perbaikan'
            }}
          </div>
        </VCol>
      </VRow>

      <div v-if="editable" class="mt-4">
        <VRow>
          <VCol cols="12">
            <VTextarea
              v-model="formModel.correctiveActionDescription"
              label="Deskripsi tindakan perbaikan"
              rows="2"
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="formModel.certifyingLicenseNumber"
              label="Lisensi teknisi"
              :items="signerLicenses"
              item-value="licenseNumber"
              :item-title="signerLicenseTitle"
              density="compact"
              :loading="selectorsPending"
              no-data-text="Tidak ada lisensi untuk aktor aktif"
              variant="outlined"
            />
            <div class="text-caption text-medium-emphasis mt-1">
              {{
                authorizationSummary(
                  'Pengesahan perbaikan ulang',
                  formModel.certifyingLicenseNumber
                )
              }}
            </div>
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="formModel.approvedDataRef"
              label="Approved-data reference"
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="formModel.evidenceReferences"
              label="Referensi bukti"
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="formModel.statement"
              label="Pernyataan pengesahan teknisi"
              rows="2"
              density="compact"
              variant="outlined"
            />
          </VCol>
        </VRow>
        <VBtn
          color="primary"
          size="small"
          :loading="loading"
          :disabled="!canSign"
          @click="emit('sign')"
        >
          Sahkan perbaikan ulang
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>
