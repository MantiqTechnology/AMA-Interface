<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';
import type { DataTableHeader } from 'vuetify';
import ExpandedTable from '../common/table/Expanded.vue';

type Aircraft = MaintenanceCommandCoenterDto['fleet'][number];
type Defect = MaintenanceCommandCenterDto['defects'][number];
type Release = MaintenanceCommandCenterDto['technicalReleases'][number];

const props = defineProps<{
  fleet: Aircraft[];
  defects: Defect[];
  releases: Release[];
  loading?: boolean;
}>();

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const { resolveAircraftImageUrl } = useAircraftImageUrl();

const headers: DataTableHeader[] = [
  { title: '', key: 'data-table-expand', width: 48, sortable: false },
  { title: 'Pesawat', key: 'registrationNumber', minWidth: 190 },
  { title: 'Station & Status Teknis', key: 'station', minWidth: 210, sortable: false },
  { title: 'Temuan / Pembatasan', key: 'defects', width: 170, sortable: false },
  { title: 'Due & Langkah', key: 'due', minWidth: 260, sortable: false },
  { title: 'Aksi', key: 'actions', width: 160, sortable: false, align: 'end' }
];

// Fix performa: index sekali via Map, bukan .find() berulang per baris/render.
const groundingDefectByAircraft = computed(() => {
  const map = new Map<string, Defect>();
  for (const defect of props.defects) {
    if (defect.assessmentDecision === 'GROUND' && !map.has(defect.aircraftId)) {
      map.set(defect.aircraftId, defect);
    }
  }
  return map;
});

const latestReleaseByAircraft = computed(() => {
  const map = new Map<string, Release>();
  for (const release of props.releases) {
    if (!map.has(release.aircraftId)) map.set(release.aircraftId, release);
  }
  return map;
});

function eligibilityLabel(value: string) {
  if (value === 'ELIGIBLE') return 'Dapat dirilis';
  if (value === 'RESTRICTED') return 'Terbatas';
  if (value === 'BLOCKED') return 'Rilis terblokir';
  return ui.label(value);
}

function humanizeReasonToken(reason: string) {
  return reason.replaceAll(/([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)/gu, (token) => ui.label(token));
}

function dueSummary(aircraft: Aircraft) {
  if (!aircraft.maintenanceDue) return 'Tidak ada due blocker';
  const [first, ...rest] = aircraft.dueReasons;
  const label = humanizeReasonToken(first ?? 'Maintenance due');
  return rest.length ? `${label} (+${rest.length} lainnya)` : label;
}

function dueAction(aircraft: Aircraft) {
  if (!aircraft.maintenanceDue) return 'Tidak ada tindakan due yang diperlukan.';
  return 'Periksa profil teknis pesawat dan tentukan tindakan maintenance yang berwenang.';
}

// Data aircraft sudah lengkap dari command-center payload; kita hanya "membungkus"
// jadi Promise supaya kompatibel dengan kontrak cache/loading milik ExpandedTable.
// Kalau nanti ada endpoint detail khusus per pesawat, ganti body fungsi ini dengan fetchApi().
function fetchDetail(aircraft: Aircraft) {
  return Promise.resolve(aircraft);
}
</script>

<template>
  <ExpandedTable
    cache-ttl="30000"
    class="aircraft-status-table"
    item-value="aircraftId"
    :fetch-detail="fetchDetail"
    :headers="headers"
    :items="props.fleet"
    :items-length="props.fleet.length"
    :loading="loading"
    no-data-text="Tidak ada pesawat dari query backend."
    loading-text="Memuat status teknis pesawat..."
    hide-default-footer
  >
    <template #[`item.registrationNumber`]="{ item }">
      <div class="d-flex align-center ga-2">
        <VAvatar rounded="lg" size="44">
          <VImg
            v-if="resolveAircraftImageUrl(item.imageUrl)"
            :alt="`${item.registrationNumber} aircraft image`"
            cover
            :src="resolveAircraftImageUrl(item.imageUrl) ?? undefined"
          />
          <VIcon v-else icon="mdi-airplane" size="22" />
        </VAvatar>
        <div>
          <VBtn
            :to="`/master-data/aircraft/${item.aircraftId}`"
            class="mro-action-btn"
            color="secondary"
            size="small"
            variant="outlined"
          >
            {{ item.registrationNumber }}
          </VBtn>
          <div class="text-caption text-medium-emphasis">
            {{ item.aircraftType }} / {{ item.model }}
          </div>
        </div>
      </div>
    </template>

    <template #[`item.station`]="{ item }">
      <div>{{ item.currentStationCode ?? '-' }}</div>
      <div class="text-caption text-medium-emphasis">{{ ui.label(item.operationalStatus) }}</div>
      <div class="mt-2 mb-1">
        <VChip
          :color="ui.technicalStateColor(item.serviceabilityStatus)"
          size="small"
          variant="tonal"
        >
          {{ ui.label(item.serviceabilityStatus) }}
        </VChip>
      </div>
      <VChip
        :color="ui.technicalStateColor(item.technicalEligibility)"
        size="small"
        variant="tonal"
      >
        {{ eligibilityLabel(item.technicalEligibility) }}
      </VChip>
    </template>

    <template #[`item.defects`]="{ item }">
      <div>{{ item.openDefectCount }} temuan terbuka</div>
      <div class="text-caption text-medium-emphasis">
        {{ item.activeRestrictionCount }} pembatasan aktif
      </div>
    </template>

    <template #[`item.due`]="{ item }">
      <div>{{ dueSummary(item) }}</div>
      <div class="text-caption text-medium-emphasis">Langkah berikutnya: {{ dueAction(item) }}</div>
    </template>

    <template #[`item.actions`]="{ item }">
      <VBtn
        v-if="item.activeWorkPackageId"
        :to="`/maintenance/work-packages/${item.activeWorkPackageId}`"
        class="mro-action-btn"
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-briefcase-eye-outline"
      >
        Buka paket
      </VBtn>
      <span v-else class="text-caption text-medium-emphasis">-</span>
    </template>

    <template #detail="{ item }">
      <div class="aircraft-detail-dropdown">
        <section class="aircraft-detail-dropdown__panel">
          <div class="aircraft-detail-dropdown__title">Grounding</div>
          <template v-if="groundingDefectByAircraft.get(item.aircraftId)">
            <div class="aircraft-detail-dropdown__fact">
              <span>Temuan</span>
              <strong>{{ groundingDefectByAircraft.get(item.aircraftId)?.defectNumber }}</strong>
            </div>
            <VBtn
              v-if="groundingDefectByAircraft.get(item.aircraftId)?.activeWorkPackageId"
              :to="`/maintenance/work-packages/${groundingDefectByAircraft.get(item.aircraftId)?.activeWorkPackageId}`"
              class="mro-action-btn mt-2"
              color="warning"
              variant="tonal"
              size="small"
              prepend-icon="mdi-alert-circle-outline"
            >
              Buka grounding
            </VBtn>
          </template>
          <div v-else class="text-caption text-medium-emphasis">Tidak ada grounding aktif.</div>
        </section>

        <section class="aircraft-detail-dropdown__panel">
          <div class="aircraft-detail-dropdown__title">Paket pekerjaan aktif</div>
          <template v-if="item.activeWorkPackageId">
            <div class="aircraft-detail-dropdown__fact">
              <span>Nomor</span>
              <strong>{{ item.activeWorkPackageNumber }}</strong>
            </div>
            <VBtn
              :to="`/maintenance/work-packages/${item.activeWorkPackageId}`"
              class="mro-action-btn mt-2"
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-briefcase-eye-outline"
            >
              Buka pekerjaan
            </VBtn>
          </template>
          <div v-else class="text-caption text-medium-emphasis">Tidak ada paket aktif.</div>
        </section>

        <section class="aircraft-detail-dropdown__panel">
          <div class="aircraft-detail-dropdown__title">Rilis teknis terakhir</div>
          <template v-if="latestReleaseByAircraft.get(item.aircraftId)">
            <div class="aircraft-detail-dropdown__fact">
              <span>Nomor</span>
              <strong>{{ latestReleaseByAircraft.get(item.aircraftId)?.releaseNumber }}</strong>
            </div>
            <VBtn
              :to="{
                path: '/maintenance/releases',
                query: { search: latestReleaseByAircraft.get(item.aircraftId)?.releaseNumber }
              }"
              class="mro-action-btn mt-2"
              color="success"
              variant="tonal"
              size="small"
              prepend-icon="mdi-certificate-outline"
            >
              Buka rilis
            </VBtn>
          </template>
          <div v-else class="text-caption text-medium-emphasis">Belum ada rilis.</div>
        </section>

        <section class="aircraft-detail-dropdown__panel">
          <div class="aircraft-detail-dropdown__title">Pembaruan</div>
          <div class="aircraft-detail-dropdown__fact">
            <span>Diperbarui</span>
            <strong>{{ format.dateTime(item.updatedAt) }}</strong>
          </div>
        </section>
      </div>
    </template>
  </ExpandedTable>
</template>

<style scoped>
.aircraft-status-table {
  min-width: 1080px;
}

.aircraft-detail-dropdown {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.aircraft-detail-dropdown__panel {
  min-width: 0;
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}

.aircraft-detail-dropdown__title {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-text-primary));
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.aircraft-detail-dropdown__fact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-block: 4px;
  font-size: 12px;
}

.aircraft-detail-dropdown__fact span {
  color: rgb(var(--v-theme-text-secondary));
}

.mro-action-btn {
  min-width: max-content;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .aircraft-detail-dropdown {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .aircraft-detail-dropdown {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
