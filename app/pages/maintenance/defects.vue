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
  if (defect.status === 'DEFERRED') return 'Catatan ditunda';
  if (defect.assessmentDecision === 'DEFER') return 'Penilaian ditunda';
  return 'Tidak ada deferment tercatat';
}

function packageCreationAvailable(defect: MaintenanceCommandCenterDto['defects'][number]) {
  return (
    !defect.activeWorkPackageId && ['GROUND', 'DEFER'].includes(defect.assessmentDecision ?? '')
  );
}

function currentBlocker(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Perbaikan dikontrol oleh paket pekerjaan aktif.';
  if (!defect.assessmentDecision) return 'Temuan perlu dinilai oleh Maintenance Control.';
  if (defect.assessmentDecision === 'NO_IMPACT') return 'Penilaian tidak memerlukan paket MRO.';
  return 'Paket pekerjaan belum dibuat.';
}

function requiredAction(defect: MaintenanceCommandCenterDto['defects'][number]) {
  if (defect.activeWorkPackageId) return 'Buka paket pekerjaan terkait.';
  if (!defect.assessmentDecision) return 'Nilai temuan sebelum membuat rencana kerja.';
  if (packageCreationAvailable(defect)) return 'Buat paket pekerjaan dari temuan ini.';
  return 'Periksa catatan penilaian dan riwayat aktivitas.';
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
        <h1 class="text-h4 font-weight-bold">Temuan</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Temuan teknis terbuka, penilaian dampak, dan kaitannya dengan paket pekerjaan.
          <span class="text-caption">Defects</span>
        </p>
      </div>
      <VSpacer />
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
                      Langkah berikutnya: {{ requiredAction(defect) }}
                    </div>
                    <div class="d-flex flex-wrap ga-1 mt-2">
                      <VBtn
                        v-if="canAssess && !defect.assessmentDecision"
                        variant="text"
                        size="small"
                        @click="openAssessment(defect)"
                      >
                        Nilai
                      </VBtn>
                      <VBtn
                        v-if="canPlan && packageCreationAvailable(defect)"
                        :to="{ path: '/maintenance', query: { defect: defect.defectNumber } }"
                        variant="text"
                        size="small"
                      >
                        Buat Paket Pekerjaan
                      </VBtn>
                      <VBtn
                        v-if="defect.activeWorkPackageId"
                        :to="`/maintenance/work-packages/${defect.activeWorkPackageId}`"
                        variant="text"
                        size="small"
                      >
                        Buka Paket Pekerjaan
                      </VBtn>
                      <VBtn
                        :to="`/master-data/aircraft/${defect.aircraftId}`"
                        variant="text"
                        size="small"
                      >
                        Lihat Pesawat
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
