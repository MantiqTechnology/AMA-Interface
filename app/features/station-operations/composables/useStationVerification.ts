import { fetchApi } from '../../../composables/useApiEnvelope';
import type { LocalUploadDto } from '#shared/contracts/uploads';
import type { ApiStationFlight, StationTaskRow } from '../types/stationOperations';
import { useStationOperationsContext } from './useStationOperationsContext';

export function useStationVerification(
  workbenchFlights: Ref<ApiStationFlight[]>,
  reload: () => Promise<void>
) {
  const context = useStationOperationsContext();
  const { can } = useAuthorization();
  const loadingId = ref('');
  const evidenceDialog = ref(false);
  const evidenceTaskId = ref('');
  const evidenceTaskVersion = ref(0);
  const evidenceFile = ref<File | File[] | null>(null);
  const evidenceNotes = ref('');
  const evidenceCategory = ref<'OPERATIONAL' | 'EXTERNAL_REPORT'>('OPERATIONAL');
  const evidenceSourceParty = ref<'PT_AMA_STATION' | 'AVSEC' | 'AUTHORITY' | 'OTHER'>(
    'PT_AMA_STATION'
  );
  const evidenceSourcePartyName = ref('');
  const evidenceReceivedAt = ref('');
  const rejectionDialog = ref(false);
  const rejectionTaskId = ref('');
  const rejectionTaskVersion = ref(0);
  const rejectionReason = ref('');

  watch(evidenceCategory, (category) => {
    if (category === 'EXTERNAL_REPORT' && evidenceSourceParty.value === 'PT_AMA_STATION') {
      evidenceSourceParty.value = 'AVSEC';
    }
    if (category === 'OPERATIONAL') {
      evidenceSourceParty.value = 'PT_AMA_STATION';
      evidenceSourcePartyName.value = '';
      evidenceReceivedAt.value = '';
    }
  });

  function stationTaskBlocker(task: StationTaskRow): string | null {
    if (task.requiresEvidence && task.evidenceCount === 0) {
      return 'Attach at least one evidence record before verification.';
    }

    const flight = workbenchFlights.value.find((item) => item.flightId === task.flightId);
    if (!flight) return null;

    if (task.taskCode === 'ORIGIN_HANDLING') {
      const handlingReady = flight.services.some(
        (service) =>
          service.stationCode === context.selectedStationCode.value &&
          service.serviceType === 'HANDLING' &&
          ['CONFIRMED', 'COMPLETED'].includes(service.status)
      );
      if (!handlingReady) return 'Confirm the origin handling service first.';
    }

    if (task.taskCode.endsWith('STATION_SIGNOFF')) {
      const prefix = task.taskCode.startsWith('ORIGIN_') ? 'ORIGIN_' : 'DESTINATION_';
      const incomplete = flight.tasks.filter(
        (candidate) =>
          candidate.id !== task.id &&
          candidate.stationId === task.stationId &&
          candidate.taskCode.startsWith(prefix) &&
          candidate.status !== 'VERIFIED'
      );
      if (incomplete.length) {
        return `Complete ${incomplete.length} remaining station task(s) first.`;
      }
    }

    return null;
  }

  async function runTaskAction(
    task: StationTaskRow,
    action: 'start' | 'verify' | 'approve-occ'
  ): Promise<void> {
    const blocker = action === 'verify' ? stationTaskBlocker(task) : null;
    if (blocker) {
      context.actionError.value = blocker;
      return;
    }

    loadingId.value = task.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-tasks/${task.id}/actions/${action}`, {
        method: 'POST',
        body:
          action === 'approve-occ'
            ? {
                decision: 'APPROVED',
                expectedVersion: task.version,
                reason: 'Reviewed in Station Operations.'
              }
            : action === 'verify'
              ? { expectedVersion: task.version, reason: 'Verified with station evidence.' }
              : { expectedVersion: task.version }
      });
      await reload();
      context.actionSuccess.value =
        action === 'approve-occ'
          ? 'OCC sign-off approval recorded.'
          : action === 'verify'
            ? 'Station task verified.'
            : 'Station task started.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memperbarui station task.';
    } finally {
      loadingId.value = '';
    }
  }

  function openEvidence(task: StationTaskRow): void {
    evidenceTaskId.value = task.id;
    evidenceTaskVersion.value = task.version;
    evidenceFile.value = null;
    evidenceNotes.value = '';
    evidenceCategory.value = 'OPERATIONAL';
    evidenceSourceParty.value = 'PT_AMA_STATION';
    evidenceSourcePartyName.value = '';
    evidenceReceivedAt.value = '';
    evidenceDialog.value = true;
  }

  function normalizedEvidenceReceivedAt(): string | undefined {
    const value = evidenceReceivedAt.value.trim();
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  async function addTaskEvidence(): Promise<void> {
    const file = Array.isArray(evidenceFile.value) ? evidenceFile.value[0] : evidenceFile.value;
    if (!file) return;

    loadingId.value = evidenceTaskId.value;
    context.actionError.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const upload = await fetchApi<LocalUploadDto>('/api/uploads', {
        method: 'POST',
        body: form
      });
      await fetchApi(`/api/flight-operations/station-tasks/${evidenceTaskId.value}/evidence`, {
        method: 'POST',
        body: {
          expectedVersion: evidenceTaskVersion.value,
          uploadId: upload.id,
          fileName: upload.originalName,
          documentType:
            evidenceCategory.value === 'EXTERNAL_REPORT'
              ? 'STATION_EXTERNAL_REPORT'
              : 'STATION_OPERATION_EVIDENCE',
          evidenceCategory: evidenceCategory.value,
          sourceParty: evidenceSourceParty.value,
          sourcePartyName: evidenceSourcePartyName.value.trim() || undefined,
          receivedAt: normalizedEvidenceReceivedAt(),
          notes: evidenceNotes.value || undefined
        }
      });
      evidenceDialog.value = false;
      await reload();
      context.actionSuccess.value = 'Evidence added to the station task.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal menambahkan evidence.';
    } finally {
      loadingId.value = '';
    }
  }

  function openTaskRejection(task: StationTaskRow): void {
    rejectionTaskId.value = task.id;
    rejectionTaskVersion.value = task.version;
    rejectionReason.value = '';
    rejectionDialog.value = true;
  }

  async function rejectTask(): Promise<void> {
    if (!rejectionReason.value.trim()) return;
    loadingId.value = rejectionTaskId.value;
    context.actionError.value = '';
    try {
      await fetchApi(
        `/api/flight-operations/station-tasks/${rejectionTaskId.value}/actions/reject`,
        {
          method: 'POST',
          body: {
            expectedVersion: rejectionTaskVersion.value,
            rejectionReason: rejectionReason.value
          }
        }
      );
      rejectionDialog.value = false;
      await reload();
      context.actionSuccess.value = 'Station task rejected.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal menolak station task.';
    } finally {
      loadingId.value = '';
    }
  }

  return {
    can,
    loadingId,
    evidenceDialog,
    evidenceFile,
    evidenceNotes,
    evidenceCategory,
    evidenceSourceParty,
    evidenceSourcePartyName,
    evidenceReceivedAt,
    rejectionDialog,
    rejectionReason,
    stationTaskBlocker,
    runTaskAction,
    openEvidence,
    addTaskEvidence,
    openTaskRejection,
    rejectTask
  };
}
