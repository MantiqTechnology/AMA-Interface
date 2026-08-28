<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { useStationVerification } from '../../../features/station-operations/composables/useStationVerification';

const { pending, stationTasks, workbenchFlights, load } = useStationOperationsPageData();
const verification = useStationVerification(workbenchFlights, load);
const { t } = useI18n();
const search = ref('');
const status = ref('ALL');
const phase = ref('ALL');

function phaseLabel(value: string) {
  return (
    {
      ALL: 'Semua fase',
      ORIGIN_DEPARTURE: 'Keberangkatan station asal',
      DESTINATION_ARRIVAL: 'Kedatangan station tujuan',
      DESTINATION_CLOSURE: 'Penutupan station tujuan'
    }[value] ?? value.replaceAll('_', ' ')
  );
}

const phases = computed(() => ['ALL', ...new Set(stationTasks.value.map((task) => task.phase))]);
const phaseItems = computed(() =>
  phases.value.map((value: string) => ({ title: phaseLabel(value), value }))
);

function localizedTaskTitle(task: { taskCode: string; taskTitle: string }) {
  const key = `stationOperations.taskTitles.${task.taskCode}`;
  const label = t(key);
  return label === key ? task.taskTitle : label;
}

const filteredTasks = computed(() => {
  const term = search.value.trim().toLowerCase();
  return stationTasks.value.filter(
    (task) =>
      (!term ||
        `${task.flightNumber} ${task.taskCode} ${task.taskTitle} ${localizedTaskTitle(task)}`
          .toLowerCase()
          .includes(term)) &&
      (status.value === 'ALL' || task.status === status.value) &&
      (phase.value === 'ALL' || task.phase === phase.value)
  );
});
</script>

<template>
  <VCard border>
    <VAlert class="ma-4 mb-0" type="info" variant="tonal" density="compact">
      Alur: Station memulai tugas, melampirkan bukti, lalu melakukan verifikasi. Sign-off Station
      dilakukan terakhir dan persetujuan akhir tetap berada pada OCC.
    </VAlert>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Verifikasi operasional</h2>
        <p class="text-caption text-text-secondary">
          Bukti, keputusan Station, penolakan, dan sign-off OCC.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <VTextField
          v-model="search"
          label="Cari tugas"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="phase"
          :items="phaseItems"
          label="Fase"
          density="compact"
          hide-details
          variant="outlined"
        />
        <VSelect
          v-model="status"
          :items="['ALL', 'PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
        />
      </div>
    </div>
    <VDivider />
    <div class="d-none d-lg-block overflow-x-auto verification-table">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Tugas</th>
            <th>Fase</th>
            <th>Bukti</th>
            <th>Station</th>
            <th>OCC</th>
            <th>Status</th>
            <th class="text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-8 text-center">
              <VSkeletonLoader type="table-row@3" />
            </td>
          </tr>
          <tr v-else-if="filteredTasks.length === 0">
            <td colspan="8" class="py-8 text-center text-text-secondary">
              Tidak ada tugas verifikasi.
            </td>
          </tr>
          <tr v-for="task in filteredTasks" v-else :key="task.id">
            <td>
              <NuxtLink
                :to="`/flights/station-operations/${task.flightId}?phase=${task.phase}`"
                class="font-weight-medium text-primary"
              >
                {{ task.flightNumber }}
              </NuxtLink>
            </td>
            <td>
              <div class="font-weight-medium">{{ localizedTaskTitle(task) }}</div>
              <div class="text-caption text-text-secondary">{{ task.taskCode }}</div>
            </td>
            <td>{{ phaseLabel(task.phase) }}</td>
            <td>
              {{ task.evidenceCount
              }}<VIcon v-if="task.requiresEvidence" icon="mdi-asterisk" size="10" color="warning" />
            </td>
            <td>
              <DsStatusBadge v-if="task.stationDecision" :value="task.stationDecision" /><span
                v-else
              >-</span>
            </td>
            <td>
              <DsStatusBadge v-if="task.occDecision" :value="task.occDecision" /><span v-else>-</span>
            </td>
            <td><DsStatusBadge :value="task.status" /></td>
            <td class="text-right whitespace-nowrap">
              <DsTooltipIconButton
                v-if="task.status === 'PENDING' && verification.can('station.task.start').allowed"
                icon="mdi-play"
                tooltip="Start task"
                :loading="verification.loadingId.value === task.id"
                @click="verification.runTaskAction(task, 'start')"
              />
              <DsTooltipIconButton
                v-if="
                  task.status === 'IN_PROGRESS' && verification.can('station.evidence.add').allowed
                "
                icon="mdi-paperclip"
                tooltip="Add evidence"
                @click="verification.openEvidence(task)"
              />
              <DsTooltipIconButton
                v-if="
                  task.status === 'IN_PROGRESS' && verification.can('station.task.verify').allowed
                "
                icon="mdi-check-circle-outline"
                :tooltip="verification.stationTaskBlocker(task) ?? 'Verify task'"
                :disabled="Boolean(verification.stationTaskBlocker(task))"
                :loading="verification.loadingId.value === task.id"
                @click="verification.runTaskAction(task, 'verify')"
              />
              <DsTooltipIconButton
                v-if="
                  task.status === 'IN_PROGRESS' && verification.can('station.task.reject').allowed
                "
                icon="mdi-close-circle-outline"
                color="error"
                tooltip="Reject task"
                @click="verification.openTaskRejection(task)"
              />
              <DsTooltipIconButton
                v-if="
                  task.status === 'VERIFIED' &&
                    task.taskCode.endsWith('STATION_SIGNOFF') &&
                    task.stationDecision === 'APPROVED' &&
                    !task.occDecision &&
                    verification.can('station.signoff.approve').allowed
                "
                icon="mdi-shield-check-outline"
                color="success"
                tooltip="Approve OCC sign-off"
                :loading="verification.loadingId.value === task.id"
                @click="verification.runTaskAction(task, 'approve-occ')"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <div class="d-lg-none pa-3 d-grid ga-3">
      <VSkeletonLoader v-if="pending" type="article@3" />
      <VCard v-for="task in filteredTasks" v-else :key="task.id" border variant="flat">
        <VCardText>
          <div class="d-flex justify-space-between align-start ga-3">
            <div>
              <NuxtLink
                :to="`/flights/station-operations/${task.flightId}?phase=${task.phase}`"
                class="font-weight-bold text-primary"
              >
                {{ task.flightNumber }}
              </NuxtLink>
              <div>{{ localizedTaskTitle(task) }}</div>
              <div class="text-caption text-medium-emphasis">{{ phaseLabel(task.phase) }}</div>
            </div>
            <DsStatusBadge :value="task.status" />
          </div>
          <VDivider class="my-3" />
          <div class="text-body-2">
            Bukti: {{ task.evidenceCount }}{{ task.requiresEvidence ? ' · wajib' : '' }}
          </div>
          <div class="mt-1 d-flex ga-2">
            <span>Station:</span><DsStatusBadge v-if="task.stationDecision" :value="task.stationDecision" /><span v-else>-</span><span>OCC:</span><DsStatusBadge v-if="task.occDecision" :value="task.occDecision" /><span v-else>-</span>
          </div>
        </VCardText>
        <VCardActions class="flex-wrap">
          <VBtn
            v-if="task.status === 'PENDING' && verification.can('station.task.start').allowed"
            size="small"
            text="Mulai"
            variant="tonal"
            @click="verification.runTaskAction(task, 'start')"
          />
          <VBtn
            v-if="task.status === 'IN_PROGRESS' && verification.can('station.evidence.add').allowed"
            size="small"
            text="Tambah bukti"
            variant="text"
            @click="verification.openEvidence(task)"
          />
          <VBtn
            v-if="task.status === 'IN_PROGRESS' && verification.can('station.task.verify').allowed"
            :disabled="Boolean(verification.stationTaskBlocker(task))"
            size="small"
            text="Verifikasi"
            variant="tonal"
            @click="verification.runTaskAction(task, 'verify')"
          />
        </VCardActions>
      </VCard>
    </div>
  </VCard>

  <VerificationAddTaskEvidenceDialog
    v-model="verification.evidenceDialog.value"
    :loading="Boolean(verification.loadingId.value)"
    :file="verification.evidenceFile.value"
    :notes="verification.evidenceNotes.value"
    :category="verification.evidenceCategory.value"
    :source-party="verification.evidenceSourceParty.value"
    :source-party-name="verification.evidenceSourcePartyName.value"
    :received-at="verification.evidenceReceivedAt.value"
    @update:file="verification.evidenceFile.value = $event"
    @update:notes="verification.evidenceNotes.value = $event"
    @update:category="verification.evidenceCategory.value = $event"
    @update:source-party="verification.evidenceSourceParty.value = $event"
    @update:source-party-name="verification.evidenceSourcePartyName.value = $event"
    @update:received-at="verification.evidenceReceivedAt.value = $event"
    @submit="verification.addTaskEvidence"
  />
  <VerificationRejectStationTaskDialog
    v-model="verification.rejectionDialog.value"
    :loading="Boolean(verification.loadingId.value)"
    :reason="verification.rejectionReason.value"
    @update:reason="verification.rejectionReason.value = $event"
    @submit="verification.rejectTask"
  />
</template>

<style scoped>
.verification-table table {
  min-width: 1060px;
}
</style>
