<script setup lang="ts">
import type { StationMaintenanceRequestInput } from '#shared/contracts/station-maintenance';

const props = defineProps<{
  modelValue: boolean;
  flight: {
    flightNumber: string;
    aircraftRegistration: string;
    aircraftVersion: number;
  } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [input: StationMaintenanceRequestInput];
}>();

const form = reactive({
  title: '',
  description: '',
  reporterObservation:
    'MAY_AFFECT_OPERATION' as StationMaintenanceRequestInput['reporterObservation'],
  initialSeverity: 'MEDIUM' as StationMaintenanceRequestInput['initialSeverity'],
  operationalImpact: '',
  flightPhase: 'GROUND',
  evidenceReferences: ''
});

const valid = computed(
  () =>
    Boolean(props.flight) && form.title.trim().length >= 3 && form.description.trim().length >= 10
);

function close() {
  if (!props.loading) emit('update:modelValue', false);
}

function reset() {
  Object.assign(form, {
    title: '',
    description: '',
    reporterObservation: 'MAY_AFFECT_OPERATION',
    initialSeverity: 'MEDIUM',
    operationalImpact: '',
    flightPhase: 'GROUND',
    evidenceReferences: ''
  });
}

function submit() {
  if (!props.flight || !valid.value) return;
  emit('submit', {
    title: form.title.trim(),
    description: form.description.trim(),
    detectedAt: new Date().toISOString(),
    reporterObservation: form.reporterObservation,
    initialSeverity: form.initialSeverity,
    operationalImpact: form.operationalImpact.trim() || null,
    flightPhase: form.flightPhase.trim() || null,
    evidenceReferences: form.evidenceReferences
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12),
    expectedAircraftVersion: props.flight.aircraftVersion
  });
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset();
  }
);
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="720"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>Laporkan temuan ke MRO</VCardTitle>
      <VCardSubtitle v-if="flight" class="pt-1">
        {{ flight.flightNumber }} · {{ flight.aircraftRegistration || 'Aircraft belum tercatat' }}
      </VCardSubtitle>
      <VCardText>
        <VAlert class="mb-4" type="info" variant="tonal">
          Laporan ini membuat defect terbuka untuk assessment MRO. Station tidak menetapkan GO,
          NO-GO, atau technical release.
        </VAlert>
        <VTextField
          v-model="form.title"
          autocomplete="off"
          class="mb-3"
          label="Judul temuan"
          name="maintenance-finding-title"
          :rules="[(value: unknown) => String(value).trim().length >= 3 || 'Minimal 3 karakter']"
          variant="outlined"
        />
        <VTextarea
          v-model="form.description"
          autocomplete="off"
          class="mb-3"
          label="Deskripsi faktual"
          name="maintenance-finding-description"
          rows="4"
          :rules="[(value: unknown) => String(value).trim().length >= 10 || 'Minimal 10 karakter']"
          variant="outlined"
        />
        <VRow>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.initialSeverity"
              autocomplete="off"
              :items="[
                { title: 'Rendah', value: 'LOW' },
                { title: 'Sedang', value: 'MEDIUM' },
                { title: 'Tinggi', value: 'HIGH' },
                { title: 'Kritis', value: 'CRITICAL' },
                { title: 'Belum diketahui', value: 'UNKNOWN' }
              ]"
              label="Severity awal"
              name="maintenance-initial-severity"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.reporterObservation"
              autocomplete="off"
              :items="[
                { title: 'Mungkin memengaruhi operasi', value: 'MAY_AFFECT_OPERATION' },
                {
                  title: 'Perlu perhatian sebelum flight berikutnya',
                  value: 'ATTENTION_BEFORE_NEXT_FLIGHT'
                },
                { title: 'Tampak kritis', value: 'APPEARS_CRITICAL' },
                {
                  title: 'Tidak terlihat dampak signifikan',
                  value: 'NO_SIGNIFICANT_IMPACT_OBSERVED'
                },
                { title: 'Belum diketahui', value: 'UNKNOWN' }
              ]"
              label="Observasi Station"
              name="maintenance-reporter-observation"
              variant="outlined"
            />
          </VCol>
        </VRow>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.operationalImpact"
              autocomplete="off"
              label="Dampak operasional yang diamati"
              name="maintenance-operational-impact"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="form.flightPhase"
              autocomplete="off"
              :items="['GROUND', 'TAXI', 'TAKEOFF', 'CRUISE', 'LANDING', 'POST_FLIGHT']"
              label="Fase saat temuan"
              name="maintenance-flight-phase"
              variant="outlined"
            />
          </VCol>
        </VRow>
        <VTextarea
          v-model="form.evidenceReferences"
          autocomplete="off"
          hint="Masukkan maksimal 12 referensi, satu referensi per baris."
          label="Referensi bukti"
          name="maintenance-evidence-references"
          persistent-hint
          rows="3"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn :disabled="loading" variant="text" @click="close">Batal</VBtn>
        <VBtn :disabled="!valid" :loading="loading" color="primary" @click="submit">
          Kirim ke MRO
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
