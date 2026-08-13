<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';

const ui = useMaintenanceUi();
const format = useLocaleFormat();
const route = useRoute();
const { resolveAircraftImageUrl } = useAircraftImageUrl();
const filters = reactive({
  search: String(route.query.search ?? ''),
  aircraft: '',
  signer: '',
  result: '',
  dateFrom: '',
  dateTo: ''
});
const releaseDrawer = ref(false);
const selectedRelease = ref<MaintenanceCommandCenterDto['technicalReleases'][number] | null>(null);

const { data, pending, error, refresh } = await useAsyncData('maintenance-technical-releases', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');
const aircraftItems = computed(() => [
  ...new Set(
    (data.value?.technicalReleases ?? []).map((release) => release.aircraftRegistrationNumber)
  )
]);
const signerItems = computed(() => [
  ...new Set((data.value?.technicalReleases ?? []).map((release) => releaseSignerName(release)))
]);
const resultItems = computed(() => [
  ...new Set((data.value?.technicalReleases ?? []).map((release) => release.resultingStatus))
]);
const hasFilters = computed(() =>
  Boolean(
    filters.search.trim() ||
    filters.aircraft ||
    filters.signer ||
    filters.result ||
    filters.dateFrom ||
    filters.dateTo
  )
);
const releases = computed(() => {
  const query = filters.search.trim().toLowerCase();
  return (data.value?.technicalReleases ?? []).filter((release) => {
    const matchesQuery =
      !query ||
      [
        release.releaseNumber,
        release.aircraftRegistrationNumber,
        release.workOrderReference,
        release.certifyingLicenseNumber,
        releaseSignerName(release)
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesAircraft =
      !filters.aircraft || release.aircraftRegistrationNumber === filters.aircraft;
    const matchesSigner = !filters.signer || releaseSignerName(release) === filters.signer;
    const matchesResult = !filters.result || release.resultingStatus === filters.result;
    const matchesDateFrom = !filters.dateFrom || release.releasedAt >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || release.releasedAt <= filters.dateTo;
    return (
      matchesQuery &&
      matchesAircraft &&
      matchesSigner &&
      matchesResult &&
      matchesDateFrom &&
      matchesDateTo
    );
  });
});

function releaseSignerName(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  const name = release.signerAuthorizationSnapshot?.personnelName;
  return typeof name === 'string' ? name : 'Certifying Staff';
}

function linkedPackage(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  return (data.value?.workPackages ?? []).find(
    (item) => item.packageNumber === release.workOrderReference
  );
}

function linkedDefectDisposition(
  release: MaintenanceCommandCenterDto['technicalReleases'][number]
) {
  const defects = (data.value?.defects ?? []).filter((defect) =>
    release.defectIds.includes(defect.id)
  );
  if (!defects.length) return 'Tidak ada temuan terkait pada register saat ini.';
  return defects.map((defect) => `${defect.defectNumber}: ${ui.label(defect.status)}`).join(', ');
}

function snapshotValue(
  release: MaintenanceCommandCenterDto['technicalReleases'][number],
  key: string
) {
  if (!release.signerAuthorizationSnapshot && key === 'companyAuthorizationNumber') {
    return 'Catatan lama - snapshot wewenang PT AMA tidak tersedia.';
  }
  const value = release.signerAuthorizationSnapshot?.[key];
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function openRelease(release: MaintenanceCommandCenterDto['technicalReleases'][number]) {
  selectedRelease.value = release;
  releaseDrawer.value = true;
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Rilis Teknis Pesawat</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Catatan rilis teknis dengan snapshot lisensi dan Wewenang PT AMA.
          <span class="text-caption">Technical Releases</span>
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: catatan rilis tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role dengan izin membaca maintenance.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Catatan rilis teknis belum dapat dimuat.</strong>
      <div>
        Dampak: rilis yang sudah ditandatangani dan snapshot wewenang belum dapat diperiksa.
      </div>
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
            label="Cari rilis, pesawat, signer, atau paket"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="360"
          />
          <VSelect
            v-model="filters.aircraft"
            label="Pesawat"
            :items="aircraftItems"
            clearable
            density="compact"
            hide-details
            max-width="200"
          />
          <VSelect
            v-model="filters.signer"
            label="Signer"
            :items="signerItems"
            clearable
            density="compact"
            hide-details
            max-width="240"
          />
          <VSelect
            v-model="filters.result"
            label="Hasil"
            :items="resultItems"
            clearable
            density="compact"
            hide-details
            max-width="220"
          />
          <VTextField
            v-model="filters.dateFrom"
            label="Tanggal dari"
            density="compact"
            hide-details
            max-width="160"
          />
          <VTextField
            v-model="filters.dateTo"
            label="Tanggal sampai"
            density="compact"
            hide-details
            max-width="160"
          />
          <VSpacer />
          <VChip variant="tonal" size="small">{{ releases.length }} hasil</VChip>
        </div>
        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--releases">
            <thead>
              <tr>
                <th>Rilis</th>
                <th>Pesawat / paket</th>
                <th>Status teknis hasil rilis</th>
                <th>Signer / lisensi</th>
                <th>Snapshot / waktu rilis</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Memuat rilis teknis...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Akses dibatasi untuk role aktif.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Data rilis teknis belum tersedia sampai permintaan berhasil.</td>
              </tr>
              <template v-else>
                <tr v-for="release in releases" :key="release.id">
                  <td class="sticky-identifier">
                    <button class="release-link" type="button" @click="openRelease(release)">
                      {{ release.releaseNumber }}
                    </button>
                  </td>
                  <td>
                    <div class="d-flex align-center ga-2">
                      <VAvatar rounded="lg" size="40">
                        <VImg
                          v-if="resolveAircraftImageUrl(release.aircraftImageUrl)"
                          :alt="`${release.aircraftRegistrationNumber} aircraft image`"
                          cover
                          :src="resolveAircraftImageUrl(release.aircraftImageUrl) ?? undefined"
                        />
                        <VIcon v-else icon="mdi-airplane" size="22" />
                      </VAvatar>
                      <span>{{ release.aircraftRegistrationNumber }}</span>
                    </div>
                    <div>
                      <VBtn
                        v-if="linkedPackage(release)"
                        :to="`/maintenance/work-packages/${linkedPackage(release)?.id}`"
                        variant="text"
                        size="small"
                      >
                        {{ release.workOrderReference }}
                      </VBtn>
                      <span v-else>{{ release.workOrderReference }}</span>
                    </div>
                  </td>
                  <td>
                    <VChip
                      :color="ui.technicalStateColor(release.resultingStatus)"
                      size="small"
                      variant="tonal"
                    >
                      {{ ui.label(release.resultingStatus) }}
                    </VChip>
                  </td>
                  <td>
                    <div>{{ releaseSignerName(release) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ release.certifyingLicenseNumber }}
                    </div>
                  </td>
                  <td>
                    <span v-if="release.signerAuthorizationSnapshot">Snapshot tersimpan</span>
                    <span v-else>Catatan lama - snapshot wewenang PT AMA tidak tersedia.</span>
                    <div class="text-caption text-medium-emphasis">
                      {{ format.dateTime(release.releasedAt) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="data && !releases.length">
                  <td colspan="5">
                    {{
                      hasFilters
                        ? 'Tidak ada rilis teknis sesuai filter.'
                        : 'Belum ada rilis teknis tercatat.'
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>
      </VCardText>
    </VCard>

    <VNavigationDrawer v-model="releaseDrawer" location="right" temporary width="520">
      <template v-if="selectedRelease">
        <div class="pa-4">
          <div class="d-flex align-center ga-3 mb-4">
            <div>
              <h2 class="text-h6 mb-0">{{ selectedRelease.releaseNumber }}</h2>
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedRelease.aircraftRegistrationNumber }} /
                {{ selectedRelease.workOrderReference }}
              </div>
            </div>
            <VSpacer />
            <VBtn icon="mdi-close" variant="text" @click="releaseDrawer = false" />
          </div>
          <VAlert type="info" variant="tonal" class="mb-4">
            Lisensi dan Wewenang PT AMA dicatat sebagai snapshot saat rilis diterbitkan.
          </VAlert>
          <VList density="compact" border rounded class="mb-4">
            <VListItem
              title="Waktu rilis"
              :subtitle="format.dateTime(selectedRelease.releasedAt)"
            />
            <VListItem title="Signer" :subtitle="releaseSignerName(selectedRelease)" />
            <VListItem
              title="Lisensi dipilih"
              :subtitle="selectedRelease.certifyingLicenseNumber"
            />
            <VListItem
              title="Status teknis hasil rilis"
              :subtitle="ui.label(selectedRelease.resultingStatus)"
            />
            <VListItem
              title="Disposisi temuan terkait"
              :subtitle="linkedDefectDisposition(selectedRelease)"
            />
          </VList>
          <VAlert
            v-if="!selectedRelease.signerAuthorizationSnapshot"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            Catatan lama - snapshot wewenang PT AMA tidak tersedia.
          </VAlert>
          <VList v-else density="compact" border rounded class="mb-4">
            <VListSubheader>Snapshot wewenang</VListSubheader>
            <VListItem
              title="Personel"
              :subtitle="snapshotValue(selectedRelease, 'personnelName')"
            />
            <VListItem
              title="Status lisensi"
              :subtitle="snapshotValue(selectedRelease, 'licenseStatus')"
            />
            <VListItem
              title="Scope pesawat"
              :subtitle="snapshotValue(selectedRelease, 'aircraftScope')"
            />
            <VListItem
              title="Wewenang PT AMA"
              :subtitle="snapshotValue(selectedRelease, 'companyAuthorizationNumber')"
            />
            <VListItem title="Verifikasi" :subtitle="snapshotValue(selectedRelease, 'basis')" />
          </VList>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-if="linkedPackage(selectedRelease)"
              :to="`/maintenance/work-packages/${linkedPackage(selectedRelease)?.id}`"
              color="primary"
              variant="tonal"
            >
              Buka Paket Pekerjaan
            </VBtn>
            <VBtn
              :to="`/maintenance/records?package=${selectedRelease.workOrderReference}`"
              variant="text"
            >
              Lihat Riwayat
            </VBtn>
          </div>
        </div>
      </template>
    </VNavigationDrawer>
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

.maintenance-table--releases :deep(th:nth-child(1)),
.maintenance-table--releases :deep(td:nth-child(1)) {
  width: 190px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.release-link {
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.maintenance-table--releases :deep(th:nth-child(2)),
.maintenance-table--releases :deep(td:nth-child(2)) {
  width: 180px;
}

.maintenance-table--releases :deep(th:nth-child(3)),
.maintenance-table--releases :deep(td:nth-child(3)) {
  width: 170px;
}

.maintenance-table--releases :deep(th:nth-child(4)),
.maintenance-table--releases :deep(td:nth-child(4)) {
  width: 180px;
}

.maintenance-table--releases :deep(th:nth-child(5)),
.maintenance-table--releases :deep(td:nth-child(5)) {
  width: 300px;
}
</style>
