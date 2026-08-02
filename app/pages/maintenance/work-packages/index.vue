<script setup lang="ts">
import type { MaintenanceListQuery, MaintenanceWorkPackageDto } from '#shared/features/maintenance';

type WorkPackageListResponse = {
  items: MaintenanceWorkPackageDto[];
  total: number;
  limit: number;
  offset: number;
};

const ui = useMaintenanceUi();
const format = useLocaleFormat();
const filters = reactive({
  search: '',
  status: ''
});
const statusFilterItems = [
  { title: 'Terbuka', value: 'OPEN' },
  { title: 'Sedang dikerjakan', value: 'IN_PROGRESS' },
  { title: 'Menunggu rilis teknis', value: 'READY_FOR_RELEASE' },
  { title: 'Sudah dirilis', value: 'RELEASED' },
  { title: 'Dibatalkan', value: 'CANCELLED' }
];

const query = computed<Partial<MaintenanceListQuery>>(() => ({
  search: filters.search || undefined,
  status: (filters.status || undefined) as MaintenanceListQuery['status'],
  limit: 50,
  offset: 0
}));

const { data, pending, error, refresh } = await useAsyncData(
  'maintenance-work-package-list',
  () => fetchApi<WorkPackageListResponse>('/api/maintenance/work-packages', { query: query.value }),
  { watch: [query] }
);

const workPackages = computed(() => data.value?.items ?? []);
const hasFilters = computed(() => Boolean(filters.search.trim() || filters.status));
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const activeCount = computed(
  () =>
    workPackages.value.filter((item) =>
      ['OPEN', 'IN_PROGRESS', 'READY_FOR_RELEASE'].includes(item.status)
    ).length
);
const releaseReadyCount = computed(
  () => workPackages.value.filter((item) => item.status === 'READY_FOR_RELEASE').length
);
const inProgressCount = computed(
  () => workPackages.value.filter((item) => item.status === 'IN_PROGRESS').length
);

function mandatoryCards(item: MaintenanceWorkPackageDto) {
  return item.jobCards.filter((card) => card.mandatoryFlag);
}

function completedMandatoryCards(item: MaintenanceWorkPackageDto) {
  return mandatoryCards(item).filter((card) => card.status === 'READY_FOR_RELEASE_REVIEW');
}

function jobCardProgressText(item: MaintenanceWorkPackageDto) {
  const total = mandatoryCards(item).length;
  const complete = completedMandatoryCards(item).length;
  if (!total) return 'Tidak ada kartu kerja wajib';
  return `${complete} dari ${total} kartu kerja wajib selesai`;
}

function inspectionStateText(item: MaintenanceWorkPackageDto) {
  const required = mandatoryCards(item).filter((card) => card.requiresIndependentInspection);
  if (!required.length) return 'Tidak perlu pemeriksaan independen';
  const passed = required.filter((card) =>
    card.signoffs.some(
      (signoff) => signoff.signoffType === 'INDEPENDENT_INSPECTION' && signoff.decision === 'PASSED'
    )
  ).length;
  return `${passed} dari ${required.length} pemeriksaan lulus`;
}

function releaseEligibilityText(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Sudah dirilis';
  if (item.status === 'CANCELLED') return 'Dibatalkan';
  return item.releaseChecklist?.blockers.length ? 'Rilis terblokir' : 'Siap diajukan untuk rilis';
}

function releaseEligibilityColor(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'success';
  if (item.status === 'CANCELLED') return 'error';
  return item.releaseChecklist?.blockers.length ? 'warning' : 'success';
}

function firstBlocker(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Rilis teknis sudah diterbitkan.';
  if (item.status === 'CANCELLED') return 'Paket pekerjaan dibatalkan.';
  return item.releaseChecklist?.blockers[0]?.message
    ? ui.operationalAction(item.releaseChecklist.blockers[0].message)
    : 'Tidak ada penghambat rilis tercatat.';
}

function requiredAction(item: MaintenanceWorkPackageDto) {
  if (item.status === 'RELEASED') return 'Periksa rilis dan riwayat aktivitas.';
  if (item.status === 'CANCELLED') return 'Buka riwayat aktivitas jika perlu konteks pembatalan.';
  if (item.status === 'READY_FOR_RELEASE') return 'Certifying Staff menerbitkan rilis teknis.';
  return (
    (item.releaseChecklist?.blockers[0]?.requiredAction
      ? ui.operationalAction(item.releaseChecklist.blockers[0].requiredAction)
      : null) ?? 'Buka detail paket untuk tindakan maintenance berikutnya.'
  );
}

function ownerForPackage(item: MaintenanceWorkPackageDto) {
  if (item.status === 'READY_FOR_RELEASE') return 'Certifying Staff';
  if (item.status === 'RELEASED') return 'Records Control';
  if (item.status === 'CANCELLED') return 'Maintenance Control';
  if (item.jobCards.some((card) => card.status === 'INSPECTION_REQUIRED')) {
    return 'Independent Inspector';
  }
  return 'Maintenance Control';
}

function sourceLabel(item: MaintenanceWorkPackageDto) {
  if (item.primaryDefectNumber) return `Temuan ${item.primaryDefectNumber}`;
  if (item.sourceFlight?.flightNumber) return `Penerbangan ${item.sourceFlight.flightNumber}`;
  return 'Lingkup maintenance';
}

function providerLabel(item: MaintenanceWorkPackageDto) {
  return item.executionMode === 'EXTERNAL_AMO_VENDOR'
    ? (item.vendorName ?? 'Provider eksternal')
    : 'Maintenance internal';
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Paket Pekerjaan</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Daftar paket pekerjaan MRO untuk planner, teknisi, inspector, dan Certifying Staff.
          <span class="text-caption">Work Packages</span>
        </p>
      </div>
      <VSpacer />
      <VBtn to="/maintenance" color="primary" prepend-icon="mdi-plus">Buat dari konteks</VBtn>
      <VBtn
        icon="mdi-refresh"
        variant="text"
        :loading="pending"
        aria-label="Muat ulang paket pekerjaan"
        @click="refresh()"
      />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: data paket pekerjaan tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role dengan izin membaca paket pekerjaan.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Paket pekerjaan belum dapat dimuat.</strong>
      <div>Dampak: progres pekerjaan dan penghambat rilis belum dapat dipastikan.</div>
      <div>Langkah berikutnya: pertahankan filter dan coba muat ulang data.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Coba lagi</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex flex-wrap align-center ga-3">
        <div>
          <div class="text-h6">Antrean paket pekerjaan</div>
          <div class="text-body-2 text-medium-emphasis">
            Paket dikelompokkan untuk pekerjaan teknisi, pemeriksaan, dan rilis teknis.
          </div>
        </div>
        <VSpacer />
        <VChip variant="tonal" size="small"> {{ data?.total ?? 0 }} hasil </VChip>
        <VChip color="info" variant="tonal" size="small"> {{ activeCount }} aktif </VChip>
        <VChip color="warning" variant="tonal" size="small">
          {{ inProgressCount }} dikerjakan
        </VChip>
        <VChip color="success" variant="tonal" size="small">
          {{ releaseReadyCount }} menunggu rilis
        </VChip>
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="8">
            <VTextField
              v-model="filters.search"
              label="Cari paket, pesawat, atau judul"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="filters.status"
              label="Status"
              clearable
              :items="statusFilterItems"
              item-title="title"
              item-value="value"
            />
          </VCol>
        </VRow>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--packages">
            <thead>
              <tr>
                <th>Paket pekerjaan</th>
                <th>Pesawat dan sumber</th>
                <th>Prioritas / tahap</th>
                <th>Progres dan kesiapan rilis</th>
                <th>Penanggung jawab</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Memuat paket pekerjaan...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Akses dibatasi untuk role aktif.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Data paket pekerjaan belum tersedia sampai permintaan berhasil.</td>
              </tr>
              <template v-else>
                <tr v-for="item in workPackages" :key="item.id">
                  <td class="sticky-identifier">
                    <NuxtLink
                      class="font-weight-bold"
                      :to="`/maintenance/work-packages/${item.id}`"
                    >
                      {{ item.packageNumber }}
                    </NuxtLink>
                    <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
                  </td>
                  <td>
                    <NuxtLink
                      class="font-weight-medium"
                      :to="`/master-data/aircraft/${item.aircraftId}`"
                    >
                      {{ item.aircraftRegistrationNumber }}
                    </NuxtLink>
                    <div>{{ sourceLabel(item) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ providerLabel(item) }}</div>
                  </td>
                  <td>
                    <div class="mb-1">
                      <VChip
                        size="small"
                        variant="tonal"
                        :color="item.priority === 'AOG' ? 'error' : 'secondary'"
                      >
                        {{ ui.label(item.priority) }}
                      </VChip>
                    </div>
                    <VChip
                      :color="ui.workPackageStatusColor(item.status)"
                      size="small"
                      variant="tonal"
                    >
                      {{ ui.label(item.status) }}
                    </VChip>
                  </td>
                  <td>
                    <div>{{ jobCardProgressText(item) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ inspectionStateText(item) }}
                    </div>
                    <div class="mt-2 mb-1">
                      <VChip size="small" variant="tonal" :color="releaseEligibilityColor(item)">
                        {{ releaseEligibilityText(item) }}
                      </VChip>
                    </div>
                    <div>{{ firstBlocker(item) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Langkah berikutnya: {{ requiredAction(item) }}
                    </div>
                  </td>
                  <td>
                    <div>{{ ownerForPackage(item) }}</div>
                    <div class="text-caption text-medium-emphasis">Versi {{ item.version }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Diperbarui: {{ format.dateTime(item.updatedAt) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="!workPackages.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? 'Tidak ada paket pekerjaan sesuai filter.'
                        : 'Belum ada paket pekerjaan pada lingkup maintenance ini.'
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
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

.maintenance-table--packages :deep(th:nth-child(1)),
.maintenance-table--packages :deep(td:nth-child(1)) {
  width: 220px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--packages :deep(th:nth-child(2)),
.maintenance-table--packages :deep(td:nth-child(2)) {
  width: 220px;
}

.maintenance-table--packages :deep(th:nth-child(3)),
.maintenance-table--packages :deep(td:nth-child(3)) {
  width: 140px;
}

.maintenance-table--packages :deep(th:nth-child(4)),
.maintenance-table--packages :deep(td:nth-child(4)) {
  width: 320px;
}

.maintenance-table--packages :deep(th:nth-child(5)),
.maintenance-table--packages :deep(td:nth-child(5)) {
  width: 190px;
}
</style>
