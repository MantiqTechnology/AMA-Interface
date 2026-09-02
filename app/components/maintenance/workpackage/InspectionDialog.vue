<script setup lang="ts">
import type {
  MaintenanceJobCardDto,
  MaintenanceSelectorDataDto
} from '#shared/features/maintenance';

const props = defineProps<{
  modelValue: boolean;
  card: MaintenanceJobCardDto | null;
  result: 'PASSED' | 'FAILED';
  confirmed: boolean;
  idempotencyKey: string;
  form: {
    statement: string;
    certifyingLicenseNumber: string;
    inspectedAt: string;
    evidenceReferences: string;
  };
  signerLicenses: MaintenanceSelectorDataDto['signerLicenses'];
  selectorsPending: boolean;
  authorizationSummary: (action: string, licenseNumber: string) => string;
  isRework: boolean;
  canSubmit: boolean;
  loading: boolean;
  failedResult: { attemptId: string; reworkActionId: string | null; packageNumber: string } | null;
  licenseUnusable: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  'update:result': ['PASSED' | 'FAILED'];
  'update:confirmed': [boolean];
  submit: [];
}>();

function signerLicenseTitle(license: MaintenanceSelectorDataDto['signerLicenses'][number]) {
  return `${license.personnelName} / ${license.licenseNumber}`;
}

const formModel = computed(() => props.form);
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="760"
    persistent
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle class="d-flex align-start ga-3">
        <div>
          <h2 class="text-h6 mb-0">Konfirmasi independent Inspection</h2>
          <div class="text-body-2 text-medium-emphasis">
            Catat Inspection lulus, atau temuan tidak lulus yang membuka corrective work.
          </div>
        </div>
        <VSpacer />
        <VBtn
          icon="mdi-close"
          variant="text"
          aria-label="Tutup dialog Inspection"
          :disabled="loading"
          @click="emit('update:modelValue', false)"
        />
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert type="success" variant="tonal" class="mb-4">
          {{
            authorizationSummary(
              isRework ? 'Independent re-inspection' : 'Independent inspection',
              form.certifyingLicenseNumber
            )
          }}
        </VAlert>
        <VAlert v-if="licenseUnusable" type="warning" variant="tonal" class="mb-4">
          Lisensi inspector ini tidak dapat digunakan pada waktu Inspection yang dipilih. Perintah
          Inspection akan ditolak backend.
        </VAlert>
        <VAlert v-if="failedResult" type="warning" variant="tonal" class="mb-4">
          <div class="font-weight-bold">Pemeriksaan tidak lulus - perbaikan ulang diperlukan</div>
          <div>
            Temuan sudah dicatat. Technical Release diblokir sampai corrective work selesai dan
            re-Inspection lulus.
          </div>
        </VAlert>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              :model-value="card?.cardNumber"
              label="Job Card"
              readonly
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              :model-value="idempotencyKey"
              label="Referensi teknis perintah"
              readonly
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12">
            <VBtnToggle
              :model-value="result"
              mandatory
              divided
              variant="outlined"
              color="primary"
              @update:model-value="emit('update:result', $event)"
            >
              <VBtn value="PASSED">Lulus</VBtn>
              <VBtn value="FAILED">Tidak lulus</VBtn>
            </VBtnToggle>
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              :model-value="form.certifyingLicenseNumber"
              label="Lisensi inspector"
              :items="signerLicenses"
              item-value="licenseNumber"
              :item-title="signerLicenseTitle"
              density="compact"
              :loading="selectorsPending"
              no-data-text="Tidak ada lisensi untuk aktor aktif"
              variant="outlined"
              @update:model-value="formModel.certifyingLicenseNumber = $event"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="formModel.inspectedAt"
              label="Waktu Inspection"
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="formModel.statement"
              :label="
                result === 'FAILED' ? 'Temuan / pernyataan Inspection' : 'Pernyataan Inspection'
              "
              rows="4"
              auto-grow
              density="compact"
              variant="outlined"
              :hint="
                result === 'FAILED'
                  ? 'Wajib. Hasil tidak lulus akan membuat atau membuka perbaikan ulang terkait.'
                  : 'Wajib. Hasil lulus menutup blocker Inspection.'
              "
              persistent-hint
            />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="formModel.evidenceReferences"
              label="Referensi bukti, pisahkan dengan koma"
              density="compact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12">
            <VCheckbox
              :model-value="confirmed"
              color="primary"
              label="Saya mengonfirmasi hasil Inspection ini benar dan akan dicatat permanen."
              @update:model-value="emit('update:confirmed', Boolean($event))"
            />
          </VCol>
        </VRow>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" :disabled="loading" @click="emit('update:modelValue', false)">
          Tutup
        </VBtn>
        <VBtn color="primary" :loading="loading" :disabled="!canSubmit" @click="emit('submit')">
          Catat Inspection
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
