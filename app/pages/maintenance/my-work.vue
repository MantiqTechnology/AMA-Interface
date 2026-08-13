<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';

type WorkTask = {
  id: string;
  aircraft: string;
  location: string;
  title: string;
  reference: string;
  status: string;
  blocker: string;
  nextAction: string;
  owner: string;
  updatedAt: string;
  route: string;
  tone: string;
};

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const session = useDemoSession();
const { can } = useAuthorization();
const filters = reactive({
  search: '',
  type: ''
});

const { data, pending, error, refresh } = await useAsyncData('maintenance-my-work', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const canWork = computed(() => can('maintenance.jobcard.work.sign').allowed);
const canInspect = computed(() => can('maintenance.jobcard.inspect').allowed);
const canRelease = computed(() => can('maintenance.release.issue').allowed);
const canPlan = computed(() => can('maintenance.package.plan').allowed);
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');

const typeItems = [
  { title: 'Pekerjaan teknisi', value: 'work' },
  { title: 'Pemeriksaan', value: 'inspection' },
  { title: 'Rilis teknis', value: 'release' },
  { title: 'Penghambat', value: 'blocker' },
  { title: 'Temuan perlu tindakan', value: 'defect' }
];

const allTasks = computed<WorkTask[]>(() => {
  const tasks: WorkTask[] = [];
  if (canWork.value) {
    for (const card of data.value?.jobCardsAwaitingExecution ?? []) {
      tasks.push({
        id: `work-${card.id}`,
        aircraft: card.aircraftRegistrationNumber,
        location: '-',
        title: card.title,
        reference: `${card.packageNumber} / ${card.cardNumber}`,
        status: ui.label(card.status),
        blocker:
          card.status === 'REJECTED_FOR_REWORK'
            ? 'Pemeriksaan tidak lulus dan perlu perbaikan ulang.'
            : 'Kartu kerja menunggu tindakan teknisi.',
        nextAction:
          card.status === 'READY'
            ? 'Buka paket pekerjaan dan mulai pekerjaan.'
            : 'Buka paket pekerjaan dan lengkapi pengesahan pekerjaan.',
        owner: 'Teknisi / Maintenance Control',
        updatedAt: card.updatedAt,
        route: `/maintenance/work-packages/${card.workPackageId}`,
        tone: card.status === 'REJECTED_FOR_REWORK' ? 'warning' : 'info'
      });
    }
  }

  if (canInspect.value) {
    for (const card of data.value?.inspectionsAwaitingAction ?? []) {
      tasks.push({
        id: `inspection-${card.id}`,
        aircraft: card.aircraftRegistrationNumber,
        location: '-',
        title: card.title,
        reference: `${card.packageNumber} / ${card.cardNumber}`,
        status: ui.label(card.status),
        blocker: 'Pekerjaan teknisi sudah disahkan dan menunggu pemeriksaan independen.',
        nextAction: 'Buka paket pekerjaan dan catat hasil pemeriksaan.',
        owner: 'Inspector / Certifying Staff',
        updatedAt: card.updatedAt,
        route: `/maintenance/work-packages/${card.workPackageId}`,
        tone: 'warning'
      });
    }
  }

  if (canRelease.value) {
    for (const item of data.value?.readyForRelease ?? []) {
      tasks.push({
        id: `release-${item.id}`,
        aircraft: item.aircraftRegistrationNumber,
        location: '-',
        title: item.title,
        reference: item.packageNumber,
        status: ui.label(item.status),
        blocker: 'Checklist backend menyatakan paket siap menunggu rilis teknis.',
        nextAction: 'Buka konfirmasi rilis teknis dan periksa lisensi serta wewenang PT AMA.',
        owner: 'Certifying Staff',
        updatedAt: item.updatedAt,
        route: `/maintenance/work-packages/${item.id}`,
        tone: 'success'
      });
    }
  }

  for (const item of data.value?.releaseBlockers ?? []) {
    const blocker = item.blockers[0];
    tasks.push({
      id: `blocker-${item.workPackageId}-${blocker?.code ?? 'unknown'}`,
      aircraft: item.aircraftRegistrationNumber,
      location: '-',
      title: blocker ? ui.label(blocker.code) : 'Penghambat rilis teknis',
      reference: item.packageNumber,
      status: 'Terblokir',
      blocker: blocker?.message
        ? ui.operationalAction(blocker.message)
        : 'Ada prasyarat rilis yang belum lengkap.',
      nextAction: blocker?.requiredAction
        ? ui.operationalAction(blocker.requiredAction)
        : 'Buka paket pekerjaan dan selesaikan penghambat.',
      owner: ownerForBlocker(blocker?.code),
      updatedAt: data.value?.generatedAt ?? '',
      route: `/maintenance/work-packages/${item.workPackageId}`,
      tone: 'error'
    });
  }

  if (canPlan.value) {
    for (const defect of data.value?.defects ?? []) {
      if (defect.activeWorkPackageId || defect.assessmentDecision === 'NO_IMPACT') continue;
      tasks.push({
        id: `defect-${defect.id}`,
        aircraft: defect.aircraftRegistrationNumber,
        location: '-',
        title: defect.title,
        reference: defect.defectNumber,
        status: defect.assessmentDecision
          ? ui.label(defect.assessmentDecision)
          : 'Menunggu penilaian',
        blocker: defect.assessmentDecision
          ? 'Temuan sudah dinilai tetapi belum masuk paket pekerjaan.'
          : 'Temuan belum dinilai oleh Maintenance Control.',
        nextAction: defect.assessmentDecision
          ? 'Buat paket pekerjaan dari temuan ini.'
          : 'Buka halaman Temuan dan lakukan penilaian.',
        owner: 'PPC / Maintenance Manager',
        updatedAt: defect.updatedAt,
        route: defect.assessmentDecision
          ? `/maintenance?defect=${defect.defectNumber}`
          : '/maintenance/defects',
        tone: 'warning'
      });
    }
  }

  return tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

const filteredTasks = computed(() => {
  const query = filters.search.trim().toLowerCase();
  return allTasks.value.filter((task) => {
    const matchesQuery =
      !query ||
      [
        task.aircraft,
        task.title,
        task.reference,
        task.status,
        task.blocker,
        task.nextAction,
        task.owner
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesType =
      !filters.type ||
      (filters.type === 'work' && task.id.startsWith('work-')) ||
      (filters.type === 'inspection' && task.id.startsWith('inspection-')) ||
      (filters.type === 'release' && task.id.startsWith('release-')) ||
      (filters.type === 'blocker' && task.id.startsWith('blocker-')) ||
      (filters.type === 'defect' && task.id.startsWith('defect-'));
    return matchesQuery && matchesType;
  });
});

function ownerForBlocker(code: string | undefined) {
  if (!code) return 'Maintenance Control';
  if (code.includes('INSPECTION') || code.includes('REINSPECTION')) return 'Inspector';
  if (code.includes('REWORK') || code.includes('MECHANIC')) return 'Teknisi';
  if (code.includes('APPROVED_DATA') || code.includes('JOB_CARD')) return 'PPC / Planner';
  return 'Maintenance Control';
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Pekerjaan Saya</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Daftar tindakan maintenance yang relevan untuk role aktif. Data berasal dari backend MRO.
        </p>
      </div>
      <VSpacer />
      <VChip variant="tonal">{{ session.role.value }}</VChip>
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>Akses dibatasi.</strong>
      <div>Dampak: daftar pekerjaan MRO tidak dapat ditampilkan untuk role ini.</div>
      <div>Langkah berikutnya: gunakan role yang memiliki izin membaca paket pekerjaan.</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>Daftar pekerjaan belum dapat dimuat.</strong>
      <div>Dampak: tugas terbaru belum dapat dipastikan dari sistem.</div>
      <div>Langkah berikutnya: muat ulang data saat koneksi stabil.</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">Coba lagi</VBtn>
      </template>
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex flex-wrap align-center ga-3">
        <div>
          <div class="text-h6">Tindakan berikutnya</div>
          <div class="text-body-2 text-medium-emphasis">
            Mulai dari pesawat, lihat penghambat, lalu buka paket pekerjaan yang benar.
          </div>
        </div>
        <VSpacer />
        <VChip size="small" variant="tonal">{{ filteredTasks.length }} tugas</VChip>
      </VCardTitle>
      <VCardText>
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <VTextField
            v-model="filters.search"
            label="Cari pesawat, paket, kartu kerja, atau penghambat"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            max-width="420"
          />
          <VSelect
            v-model="filters.type"
            label="Jenis tugas"
            :items="typeItems"
            clearable
            density="compact"
            hide-details
            max-width="260"
          />
        </div>

        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--my-work">
            <thead>
              <tr>
                <th>Pesawat</th>
                <th>Tugas</th>
                <th>Status</th>
                <th>Penghambat dan langkah berikutnya</th>
                <th>Penanggung jawab</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="5">Memuat pekerjaan...</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="5">Akses dibatasi untuk role aktif.</td>
              </tr>
              <tr v-else-if="error">
                <td colspan="5">Data pekerjaan belum tersedia sampai permintaan berhasil.</td>
              </tr>
              <template v-else>
                <tr v-for="task in filteredTasks" :key="task.id">
                  <td class="sticky-identifier">
                    <strong>{{ task.aircraft }}</strong>
                    <div class="text-caption text-medium-emphasis">{{ task.location }}</div>
                  </td>
                  <td>
                    <div class="font-weight-bold">{{ task.title }}</div>
                    <VBtn
                      :to="task.route"
                      class="mt-1 mro-action-btn"
                      color="primary"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-briefcase-eye-outline"
                    >
                      Buka pekerjaan
                    </VBtn>
                    <div class="text-caption text-medium-emphasis">{{ task.reference }}</div>
                  </td>
                  <td>
                    <VChip :color="task.tone" size="small" variant="tonal">{{ task.status }}</VChip>
                    <div class="text-caption text-medium-emphasis">
                      {{ format.dateTime(task.updatedAt) }}
                    </div>
                  </td>
                  <td>
                    <div>{{ task.blocker }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Langkah berikutnya: {{ task.nextAction }}
                    </div>
                  </td>
                  <td>
                    <div>{{ task.owner }}</div>
                    <VBtn
                      class="mt-2 mro-action-btn"
                      size="small"
                      color="primary"
                      variant="outlined"
                      prepend-icon="mdi-arrow-right-circle-outline"
                      :to="task.route"
                    >
                      Buka pekerjaan
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="!filteredTasks.length">
                  <td colspan="5">
                    {{
                      filters.search || filters.type
                        ? 'Tidak ada pekerjaan yang sesuai filter.'
                        : 'Tidak ada pekerjaan yang menunggu tindakan role ini.'
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
  min-width: 1080px;
  table-layout: fixed;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
}

.maintenance-table--my-work :deep(th:nth-child(1)),
.maintenance-table--my-work :deep(td:nth-child(1)) {
  width: 150px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.maintenance-table--my-work :deep(th:nth-child(2)),
.maintenance-table--my-work :deep(td:nth-child(2)) {
  width: 250px;
}

.maintenance-table--my-work :deep(th:nth-child(3)),
.maintenance-table--my-work :deep(td:nth-child(3)) {
  width: 180px;
}

.maintenance-table--my-work :deep(th:nth-child(4)),
.maintenance-table--my-work :deep(td:nth-child(4)) {
  width: 360px;
}

.maintenance-table--my-work :deep(th:nth-child(5)),
.maintenance-table--my-work :deep(td:nth-child(5)) {
  width: 180px;
}

.mro-action-btn {
  min-width: max-content;
  max-width: 100%;
  font-weight: 700;
}
</style>
