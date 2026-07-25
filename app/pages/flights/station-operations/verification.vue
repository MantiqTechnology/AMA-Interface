<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { useStationVerification } from '../../../features/station-operations/composables/useStationVerification';

const { pending, stationTasks, workbenchFlights, load } = useStationOperationsPageData();
const verification = useStationVerification(workbenchFlights, load);
const search = ref('');
const status = ref('ALL');
const phase = ref('ALL');

const phases = computed(() => ['ALL', ...new Set(stationTasks.value.map((task) => task.phase))]);
const filteredTasks = computed(() => {
  const term = search.value.trim().toLowerCase();
  return stationTasks.value.filter(
    (task) =>
      (!term ||
        `${task.flightNumber} ${task.taskCode} ${task.taskTitle}`.toLowerCase().includes(term)) &&
      (status.value === 'ALL' || task.status === status.value) &&
      (phase.value === 'ALL' || task.phase === phase.value)
  );
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Operational Verification</h2>
        <p class="text-caption text-text-secondary">
          Evidence, station verification, rejection, and OCC sign-off.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <VTextField
          v-model="search"
          label="Search task"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="phase"
          :items="phases"
          label="Phase"
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
    <div class="overflow-x-auto">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Task</th>
            <th>Phase</th>
            <th>Evidence</th>
            <th>Station</th>
            <th>OCC</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="8" class="py-8 text-center">
              <VProgressCircular indeterminate size="22" class="mr-2" />Loading verification
              tasks...
            </td>
          </tr>
          <tr v-else-if="filteredTasks.length === 0">
            <td colspan="8" class="py-8 text-center text-text-secondary">
              No verification task found.
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
              <div class="font-weight-medium">{{ task.taskTitle }}</div>
              <div class="text-caption text-text-secondary">{{ task.taskCode }}</div>
            </td>
            <td>{{ task.phase }}</td>
            <td>
              {{ task.evidenceCount
              }}<VIcon v-if="task.requiresEvidence" icon="mdi-asterisk" size="10" color="warning" />
            </td>
            <td>{{ task.stationDecision ?? '-' }}</td>
            <td>{{ task.occDecision ?? '-' }}</td>
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
                v-if="verification.can('station.evidence.add').allowed"
                icon="mdi-paperclip"
                tooltip="Add evidence"
                @click="verification.openEvidence(task)"
              />
              <DsTooltipIconButton
                v-if="
                  ['PENDING', 'IN_PROGRESS'].includes(task.status) &&
                    verification.can('station.task.verify').allowed
                "
                icon="mdi-check-circle-outline"
                tooltip="Verify task"
                :disabled="Boolean(verification.stationTaskBlocker(task))"
                :loading="verification.loadingId.value === task.id"
                @click="verification.runTaskAction(task, 'verify')"
              />
              <DsTooltipIconButton
                v-if="
                  ['PENDING', 'IN_PROGRESS'].includes(task.status) &&
                    verification.can('station.task.reject').allowed
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
  </VCard>

  <AddTaskEvidenceDialog
    v-model="verification.evidenceDialog.value"
    :loading="Boolean(verification.loadingId.value)"
    :file="verification.evidenceFile.value"
    :notes="verification.evidenceNotes.value"
    @update:file="verification.evidenceFile.value = $event"
    @update:notes="verification.evidenceNotes.value = $event"
    @submit="verification.addTaskEvidence"
  />
  <RejectStationTaskDialog
    v-model="verification.rejectionDialog.value"
    :loading="Boolean(verification.loadingId.value)"
    :reason="verification.rejectionReason.value"
    @update:reason="verification.rejectionReason.value = $event"
    @submit="verification.rejectTask"
  />
</template>
