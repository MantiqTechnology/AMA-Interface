<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';
import type { AircraftDto } from '#shared/features/operations/aircraft';
import type { MaintenanceErrorPresentation } from '../../composables/useMaintenanceUi';

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const { can } = useAuthorization();
const { resolveAircraftImageUrl } = useAircraftImageUrl();
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
const reportDialog = ref(false);
const reportLoading = ref(false);
const reportError = ref<MaintenanceErrorPresentation | null>(null);
const closeLoadingId = ref('');
const assessmentForm = reactive({
  assessmentDecision: 'GROUND' as 'GROUND' | 'DEFER' | 'NO_IMPACT',
  assessmentNote: '',
  defermentType: 'MEL' as 'MEL' | 'CDL',
  referenceCode: '',
  category: '',
  operationalLimitations: '',
  maintenanceProcedure: '',
  operationsProcedure: '',
  effectiveAt: '',
  expiresAt: '',
  targetRectificationAt: '',
  authorizationReference: '',
  applicableServiceTypeCodes: [] as string[]
});
const reportForm = reactive({
  aircraftId: '',
  title: '',
  description: '',
  detectedAt: '',
  reporterObservation: 'UNKNOWN' as
    | 'NO_SIGNIFICANT_IMPACT_OBSERVED'
    | 'MAY_AFFECT_OPERATION'
    | 'ATTENTION_BEFORE_NEXT_FLIGHT'
    | 'APPEARS_CRITICAL'
    | 'UNKNOWN',
  initialSeverity: 'UNKNOWN' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN',
  operationalImpact: '',
  flightPhase: '',
  sourceReference: '',
  evidenceReferences: ''
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-defects', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const canAssess = computed(() => can('maintenance.defect.assess').allowed);
const canPlan = computed(() => can('maintenance.package.plan').allowed);
const canReport = computed(() => can('aircraft.defect.report').allowed);
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
const aircraftOptions = computed(() =>
  (data.value?.fleet ?? []).map((aircraft) => ({
    title: aircraft.registrationNumber,
    value: aircraft.aircraftId
  }))
);
const reporterObservationItems = [
  { title: 'Tidak terlihat berdampak signifikan', value: 'NO_SIGNIFICANT_IMPACT_OBSERVED' },
  { title: 'Dapat memengaruhi operasi', value: 'MAY_AFFECT_OPERATION' },
  {
    title: 'Perlu perhatian sebelum penerbangan berikutnya',
    value: 'ATTENTION_BEFORE_NEXT_FLIGHT'
  },
  { title: 'Kondisi tampak kritis', value: 'APPEARS_CRITICAL' },
  { title: 'Tidak diketahui', value: 'UNKNOWN' }
];
const severityItems = [
  { title: 'Low', value: 'LOW' },
  { title: 'Medium', value: 'MEDIUM' },
  { title: 'High', value: 'HIGH' },
  { title: 'Critical', value: 'CRITICAL' },
  { title: 'Unknown', value: 'UNKNOWN' }
];
const serviceTypes = [
  'CHARTER_CARGO',
  'CHARTER_PASSENGER',
  'SCHEDULED_PASSENGER',
  'MEDEVAC',
  'POSITIONING'
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
  if (days === 0) return 'Hari ini';
  if (days === 1) return '1 hari';
  return `${days} hari`;
}

function linkedPackage(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (data.value?.workPackages ?? []).find((item) => item.id === defect.activeWorkPackageId);
}

function assessmentLabel(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return defect.assessmentDecision ? ui.label(defect.assessmentDecision) : 'Perlu penilaian';
}

function groundingImpact(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.assessmentDecision === 'GROUND') return 'Pesawat ditahan sampai diperbaiki';
  if (defect.assessmentDecision === 'DEFER') return 'Ditunda dengan kontrol teknis';
  if (defect.assessmentDecision === 'NO_IMPACT') return 'Tidak perlu paket MRO';
  return 'Menunggu penilaian';
}

function defermentState(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.defermentStatus === 'EXPIRED') return 'Deferred kedaluwarsa';
  if (defect.defermentStatus === 'ACTIVE') return 'Deferred aktif';
  if (defect.defermentStatus === 'CLOSED') return 'Deferred ditutup';
  if (defect.status === 'DEFERRED') return 'Menunggu catatan deferred';
  if (defect.assessmentDecision === 'DEFER') return 'Penilaian ditunda';
  return 'Tidak ada deferment tercatat';
}

function packageCreationAvailable(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (
    !defect.activeWorkPackageId && ['GROUND', 'DEFER'].includes(defect.assessmentDecision ?? '')
  );
}

function canCloseDeferred(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (
    canAssess.value &&
    Boolean(defect.defermentId) &&
    ['ACTIVE', 'EXPIRED'].includes(defect.defermentStatus ?? '')
  );
}

function currentBlocker(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Perbaikan dikontrol oleh paket pekerjaan aktif.';
  if (defect.defermentStatus === 'EXPIRED') return 'Deferred sudah melewati batas.';
  if (!defect.assessmentDecision) return 'Temuan perlu dinilai oleh Maintenance Control.';
  if (defect.assessmentDecision === 'NO_IMPACT') return 'Penilaian tidak memerlukan paket MRO.';
  return 'Paket pekerjaan belum dibuat.';
}

function requiredAction(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Buka paket pekerjaan terkait.';
  if (defect.defermentStatus === 'EXPIRED') return 'Selesaikan rectification dan tutup deferred.';
  if (!defect.assessmentDecision) return 'Nilai temuan sebelum membuat rencana kerja.';
  if (packageCreationAvailable(defect)) return 'Buat paket pekerjaan dari temuan ini.';
  return 'Periksa catatan penilaian dan riwayat aktivitas.';
}

function nowLocal() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function plusDaysLocal(days: number) {
  const date = new Date(Date.now() + days * 86_400_000 - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function toIso(value: string) {
  return new Date(value).toISOString();
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
  assessmentForm.defermentType = 'MEL';
  assessmentForm.referenceCode = '';
  assessmentForm.category = '';
  assessmentForm.operationalLimitations = '';
  assessmentForm.maintenanceProcedure = '';
  assessmentForm.operationsProcedure = '';
  assessmentForm.effectiveAt = nowLocal();
  assessmentForm.expiresAt = plusDaysLocal(10);
  assessmentForm.targetRectificationAt = plusDaysLocal(7);
  assessmentForm.authorizationReference = '';
  assessmentForm.applicableServiceTypeCodes = [];
  assessmentDialog.value = true;
}

function openReport() {
  reportError.value = null;
  Object.assign(reportForm, {
    aircraftId: aircraftOptions.value[0]?.value ?? '',
    title: '',
    description: '',
    detectedAt: nowLocal(),
    reporterObservation: 'UNKNOWN',
    initialSeverity: 'UNKNOWN',
    operationalImpact: '',
    flightPhase: '',
    sourceReference: '',
    evidenceReferences: ''
  });
  reportDialog.value = true;
}

function references(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function submitAssessment() {
  if (!assessmentTarget.value || assessmentForm.assessmentNote.trim().length < 10) return;
  assessmentLoading.value = true;
  assessmentError.value = null;
  try {
    const body =
      assessmentForm.assessmentDecision === 'DEFER'
        ? {
            assessmentDecision: assessmentForm.assessmentDecision,
            assessmentNote: assessmentForm.assessmentNote,
            deferment: {
              defermentType: assessmentForm.defermentType,
              referenceCode: assessmentForm.referenceCode,
              category: assessmentForm.category || null,
              operationalLimitations: assessmentForm.operationalLimitations,
              maintenanceProcedure: assessmentForm.maintenanceProcedure || null,
              operationsProcedure: assessmentForm.operationsProcedure || null,
              effectiveAt: toIso(assessmentForm.effectiveAt),
              expiresAt: toIso(assessmentForm.expiresAt),
              targetRectificationAt: assessmentForm.targetRectificationAt
                ? toIso(assessmentForm.targetRectificationAt)
                : null,
              authorizationReference: assessmentForm.authorizationReference,
              applicableRouteIds: [],
              applicableServiceTypeCodes: assessmentForm.applicableServiceTypeCodes
            }
          }
        : {
            assessmentDecision: assessmentForm.assessmentDecision,
            assessmentNote: assessmentForm.assessmentNote
          };
    await fetchApi(`/api/maintenance/defects/${assessmentTarget.value.id}/actions/assess`, {
      method: 'POST',
      body
    });
    assessmentDialog.value = false;
    await refresh();
  } catch (errorValue) {
    assessmentError.value = ui.presentError(errorValue);
  } finally {
    assessmentLoading.value = false;
  }
}

async function submitReport() {
  if (!reportForm.aircraftId || reportForm.title.trim().length < 3) return;
  reportLoading.value = true;
  reportError.value = null;
  try {
    const aircraft = await fetchApi<AircraftDto>(
      `/api/master-data/aircraft/${reportForm.aircraftId}`
    );
    await fetchApi(`/api/master-data/aircraft/${reportForm.aircraftId}/defects`, {
      method: 'POST',
      body: {
        title: reportForm.title,
        description: reportForm.description,
        detectedAt: toIso(reportForm.detectedAt),
        reporterObservation: reportForm.reporterObservation,
        initialSeverity: reportForm.initialSeverity,
        operationalImpact: reportForm.operationalImpact || null,
        flightPhase: reportForm.flightPhase || null,
        sourceReference: reportForm.sourceReference || null,
        evidenceReferences: references(reportForm.evidenceReferences),
        expectedVersion: aircraft.version
      }
    });
    reportDialog.value = false;
    await refresh();
  } catch (errorValue) {
    reportError.value = ui.presentError(errorValue);
  } finally {
    reportLoading.value = false;
  }
}

async function closeDeferred(defect: MaintenanceCommandCenterDto['defects'][number]) {
  closeLoadingId.value = defect.id;
  try {
    await fetchApi(`/api/maintenance/defects/${defect.id}/actions/close-deferred`, {
      method: 'POST',
      body: {
        closureNote: `Deferred defect ${defect.defectNumber} closed after released rectification work package.`,
        evidenceReferences: [defect.activeWorkPackageNumber ?? defect.defectNumber]
      }
    });
    await refresh();
  } catch (errorValue) {
    assessmentError.value = ui.presentError(errorValue);
  } finally {
    closeLoadingId.value = '';
  }
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Temuan</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Temuan teknis terbuka, penilaian dampak, dan kaitannya dengan paket pekerjaan.
          <span class="text-caption">Defects</span>
        </p>
      </div>
      <VSpacer />
      <VBtn
        v-if="canReport"
        color="primary"
        prepend-icon="mdi-alert-plus-outline"
        variant="tonal"
        @click="openReport"
      >
        Laporkan Defect
      </VBtn>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: antrean temuan tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role dengan izin membaca maintenance.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Antrean temuan belum dapat dimuat.</strong>
      <div>Dampak: penilaian dan paket pekerjaan terkait belum dapat dipastikan.</div>
      <div>Langkah berikutnya: coba muat ulang data maintenance.</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Coba lagi</VBtn>
      </template>
    </VAlert>
    <VAlert
      v-if="assessmentError && !assessmentDialog"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="assessmentError = null"
    >
      <strong>{{ assessmentError.title }}</strong>
      <div>{{ assessmentError.impact }}</div>
      <div class="text-caption">Langkah berikutnya: {{ assessmentError.requiredAction }}</div>
    </VAlert>

    <VCard border>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Cari temuan, pesawat, sumber, atau ringkasan"
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
            label="Pesawat"
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
            label="Penilaian"
            max-width="220"
          />
          <VSelect
            v-model="filters.packageState"
            :items="packageStateItems"
            clearable
            hide-details
            density="compact"
            label="Status paket"
            max-width="230"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ defects.length }} hasil</VChip>
        </div>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--defects">
            <thead>
              <tr>
                <th>Temuan</th>
                <th>Pesawat, sumber, umur</th>
                <th>Summary</th>
                <th>Status dan dampak</th>
                <th>Paket, penghambat, tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Memuat temuan...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Akses dibatasi untuk role aktif.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Data temuan belum tersedia sampai permintaan berhasil.</td>
              </tr>
              <template v-else>
                <tr v-for="defect in defects" :key="defect.id">
                  <td class="sticky-identifier">
                    <div class="font-weight-bold">{{ defect.defectNumber }}</div>
                    <div class="text-caption text-medium-emphasis">{{ defect.title }}</div>
                  </td>
                  <td>
                    <div class="d-flex align-center ga-2">
                      <VAvatar rounded="lg" size="40">
                        <VImg
                          v-if="resolveAircraftImageUrl(defect.aircraftImageUrl)"
                          :alt="`${defect.aircraftRegistrationNumber} aircraft image`"
                          cover
                          :src="resolveAircraftImageUrl(defect.aircraftImageUrl) ?? undefined"
                        />
                        <VIcon v-else icon="mdi-airplane" size="22" />
                      </VAvatar>
                      <VBtn
                        :to="`/master-data/aircraft/${defect.aircraftId}`"
                        class="mro-action-btn"
                        color="secondary"
                        size="small"
                        variant="outlined"
                      >
                        {{ defect.aircraftRegistrationNumber }}
                      </VBtn>
                    </div>
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
                    <div v-if="defect.defermentId" class="text-caption mt-1">
                      {{ defect.defermentReferenceCode ?? 'Reference recorded' }}
                      <span v-if="defect.defermentExpiresAt">
                        / expiry {{ format.dateTime(defect.defermentExpiresAt) }}
                      </span>
                    </div>
                    <div
                      v-if="defect.defermentOperationalLimitations"
                      class="text-caption text-medium-emphasis"
                    >
                      {{ defect.defermentOperationalLimitations }}
                    </div>
                  </td>
                  <td>
                    <VBtn
                      v-if="defect.activeWorkPackageId"
                      :to="`/maintenance/work-packages/${defect.activeWorkPackageId}`"
                      class="mro-action-btn"
                      color="primary"
                      variant="tonal"
                      size="small"
                      prepend-icon="mdi-briefcase-eye-outline"
                    >
                      Buka {{ defect.activeWorkPackageNumber }}
                    </VBtn>
                    <span v-else>-</span>
                    <div class="text-caption text-medium-emphasis">{{ owner(defect) }}</div>
                    <div class="mt-1">{{ currentBlocker(defect) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Langkah berikutnya: {{ requiredAction(defect) }}
                    </div>
                    <div class="d-flex flex-wrap ga-1 mt-2">
                      <VBtn
                        v-if="canAssess && !defect.assessmentDecision"
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-clipboard-edit-outline"
                        @click="openAssessment(defect)"
                      >
                        Nilai
                      </VBtn>
                      <VBtn
                        v-if="canPlan && packageCreationAvailable(defect)"
                        :to="{ path: '/maintenance', query: { defect: defect.defectNumber } }"
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-plus-box-outline"
                      >
                        Buat Paket Pekerjaan
                      </VBtn>
                      <VBtn
                        v-if="defect.activeWorkPackageId"
                        :to="`/maintenance/work-packages/${defect.activeWorkPackageId}`"
                        color="primary"
                        variant="outlined"
                        size="small"
                        prepend-icon="mdi-briefcase-arrow-right"
                      >
                        Buka Paket Pekerjaan
                      </VBtn>
                      <VBtn
                        v-if="canCloseDeferred(defect)"
                        color="success"
                        variant="tonal"
                        size="small"
                        prepend-icon="mdi-check-decagram-outline"
                        :loading="closeLoadingId === defect.id"
                        @click="closeDeferred(defect)"
                      >
                        Tutup Deferred
                      </VBtn>
                      <VBtn
                        :to="`/master-data/aircraft/${defect.aircraftId}`"
                        color="secondary"
                        variant="outlined"
                        size="small"
                        prepend-icon="mdi-airplane"
                      >
                        Lihat Pesawat
                      </VBtn>
                      <VBtn
                        :to="
                          defect.activeWorkPackageNumber
                            ? `/maintenance/records?package=${defect.activeWorkPackageNumber}`
                            : `/maintenance/records?aircraft=${defect.aircraftRegistrationNumber}`
                        "
                        color="secondary"
                        variant="outlined"
                        size="small"
                        prepend-icon="mdi-history"
                      >
                        Lihat Riwayat
                      </VBtn>
                    </div>
                  </td>
                </tr>
                <tr v-if="!defects.length">
                  <td colspan="5">
                    {{
                      hasFilters ? 'Tidak ada temuan sesuai filter.' : 'Tidak ada temuan terbuka.'
                    }}
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
        <VCardTitle>Nilai Temuan</VCardTitle>
        <VCardText>
          <VAlert v-if="assessmentError" type="error" variant="tonal" class="mb-4">
            <strong>{{ assessmentError.title }}</strong>
            <div>{{ assessmentError.impact }}</div>
            <div class="text-caption">Langkah berikutnya: {{ assessmentError.requiredAction }}</div>
          </VAlert>
          <VAlert v-if="assessmentTarget" type="info" variant="tonal" class="mb-4">
            {{ assessmentTarget.defectNumber }} / {{ assessmentTarget.aircraftRegistrationNumber }}
          </VAlert>
          <VSelect
            v-model="assessmentForm.assessmentDecision"
            label="Keputusan penilaian"
            :items="[
              { title: 'Tahan pesawat sampai diperbaiki', value: 'GROUND' },
              { title: 'Tunda dengan kontrol teknis', value: 'DEFER' },
              { title: 'Tidak berdampak maintenance', value: 'NO_IMPACT' }
            ]"
            item-title="title"
            item-value="value"
          />
          <VTextarea
            v-model="assessmentForm.assessmentNote"
            label="Catatan penilaian"
            rows="4"
            hint="Minimal 10 karakter. Disimpan pada riwayat aktivitas backend."
            persistent-hint
          />
          <template v-if="assessmentForm.assessmentDecision === 'DEFER'">
            <VAlert type="warning" variant="tonal" class="mb-4">
              Deferred mencatat pembatasan operasional demo dan target rectification. Ini bukan
              klaim compliance regulatori.
            </VAlert>
            <VRow>
              <VCol cols="12" md="4">
                <VSelect
                  v-model="assessmentForm.defermentType"
                  :items="['MEL', 'CDL']"
                  label="Tipe referensi demo"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="5">
                <VTextField
                  v-model="assessmentForm.referenceCode"
                  label="Referensi deferment / maintenance data"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="3">
                <VTextField v-model="assessmentForm.category" label="Kategori" variant="outlined" />
              </VCol>
            </VRow>
            <VTextarea
              v-model="assessmentForm.operationalLimitations"
              label="Pembatasan operasional"
              rows="3"
              variant="outlined"
            />
            <VTextarea
              v-model="assessmentForm.maintenanceProcedure"
              label="Instruksi maintenance"
              rows="2"
              variant="outlined"
            />
            <VTextarea
              v-model="assessmentForm.operationsProcedure"
              label="Instruksi operasi"
              rows="2"
              variant="outlined"
            />
            <VRow>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="assessmentForm.effectiveAt"
                  label="Efektif"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="assessmentForm.targetRectificationAt"
                  label="Target rectification"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VTextField
                  v-model="assessmentForm.expiresAt"
                  label="Expiry"
                  type="datetime-local"
                  variant="outlined"
                />
              </VCol>
            </VRow>
            <VTextField
              v-model="assessmentForm.authorizationReference"
              label="Referensi approval internal"
              variant="outlined"
            />
            <VSelect
              v-model="assessmentForm.applicableServiceTypeCodes"
              :items="serviceTypes"
              chips
              clearable
              multiple
              label="Service type dibatasi"
              variant="outlined"
            />
          </template>
        </VCardText>
        <VCardActions>
          <VBtn variant="text" :disabled="assessmentLoading" @click="assessmentDialog = false">
            Batal
          </VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            :loading="assessmentLoading"
            :disabled="assessmentForm.assessmentNote.trim().length < 10"
            @click="submitAssessment"
          >
            Simpan penilaian
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="reportDialog" max-width="760" persistent>
      <VCard>
        <VCardTitle>Laporkan Defect</VCardTitle>
        <VCardText>
          <VAlert v-if="reportError" type="error" variant="tonal" class="mb-4">
            <strong>{{ reportError.title }}</strong>
            <div>{{ reportError.impact }}</div>
            <div class="text-caption">Langkah berikutnya: {{ reportError.requiredAction }}</div>
          </VAlert>
          <VSelect
            v-model="reportForm.aircraftId"
            :items="aircraftOptions"
            item-title="title"
            item-value="value"
            label="Aircraft"
            variant="outlined"
          />
          <VTextField v-model="reportForm.title" label="Judul defect" variant="outlined" />
          <VTextarea
            v-model="reportForm.description"
            label="Deskripsi pengamatan"
            rows="4"
            variant="outlined"
          />
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="reportForm.detectedAt"
                label="Waktu kejadian lokal"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="reportForm.reporterObservation"
                :items="reporterObservationItems"
                item-title="title"
                item-value="value"
                label="Menurut pengamatan pelapor"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="reportForm.initialSeverity"
                :items="severityItems"
                item-title="title"
                item-value="value"
                label="Initial severity"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="reportForm.flightPhase"
                label="Flight phase"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VTextarea
            v-model="reportForm.operationalImpact"
            label="Dampak operasional menurut pelapor"
            rows="2"
            variant="outlined"
          />
          <VTextField
            v-model="reportForm.sourceReference"
            label="Tech log / source reference"
            variant="outlined"
          />
          <VTextarea
            v-model="reportForm.evidenceReferences"
            hint="Satu reference per baris"
            label="Evidence references"
            rows="2"
            variant="outlined"
          />
        </VCardText>
        <VCardActions>
          <VBtn variant="text" :disabled="reportLoading" @click="reportDialog = false">
            Batal
          </VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            :loading="reportLoading"
            :disabled="
              reportForm.title.trim().length < 3 || reportForm.description.trim().length < 10
            "
            @click="submitReport"
          >
            Simpan laporan
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

.mro-action-btn {
  min-width: max-content;
  font-weight: 700;
}
</style>
