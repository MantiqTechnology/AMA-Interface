import { ApiClientError } from './useApiEnvelope';

export type MaintenanceErrorPresentation = {
  code: string;
  title: string;
  impact: string;
  requiredAction: string;
  referenceId: string | null;
  requestId: string | null;
};

function label(value: string | null | undefined) {
  if (!value) return '-';
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    AOG: 'AOG',
    AWAITING_REINSPECTION: 'Menunggu pemeriksaan ulang',
    BLOCKED: 'Terblokir',
    CANCELLED: 'Dibatalkan',
    CLOSED: 'Ditutup',
    COMPLETED: 'Selesai',
    COMPONENT_CHANGE: 'Penggantian komponen',
    CORRECTIVE_WORK_IN_PROGRESS: 'Perbaikan ulang sedang dikerjakan',
    CREATE: 'Dibuat',
    DEFECT: 'Temuan',
    DEFECT_RECTIFICATION: 'Perbaikan temuan',
    DEFER: 'Ditunda dengan kontrol teknis',
    DEFERRED: 'Ditunda',
    ELIGIBLE: 'Dapat dirilis',
    EXTERNAL_AMO_VENDOR: 'Provider maintenance eksternal',
    FAILED: 'Tidak lulus',
    GROUND: 'Pesawat ditahan sampai diperbaiki',
    HANDED_OFF: 'Sudah diserahkan',
    HIGH: 'Tinggi',
    IN_PROGRESS: 'Sedang dikerjakan',
    INACTIVE: 'Tidak aktif',
    INDEPENDENT_INSPECTION: 'Pemeriksaan independen',
    INDEPENDENT_INSPECTION_FAILED: 'Pemeriksaan tidak lulus',
    INDEPENDENT_INSPECTION_PASSED: 'Pemeriksaan lulus',
    INDEPENDENT_REINSPECTION: 'Pemeriksaan ulang independen',
    INSPECTION: 'Pemeriksaan',
    INSPECTION_ATTEMPT: 'Catatan pemeriksaan',
    INSPECTION_REQUIRED: 'Menunggu pemeriksaan',
    INTERNAL: 'Dikerjakan internal',
    JOB_CARD: 'Kartu kerja',
    LINK_REQUIREMENT: 'Requirement ditautkan',
    LOW: 'Rendah',
    MAINTENANCE_RELEASE_APPROVED_DATA_REQUIRED: 'Data maintenance belum lengkap',
    MAINTENANCE_RELEASE_INCOMPLETE_JOB_CARDS: 'Kartu kerja wajib belum selesai',
    MAINTENANCE_RELEASE_INSPECTION_REQUIRED: 'Pemeriksaan independen belum selesai',
    MAINTENANCE_RELEASE_JOB_CARD_REQUIRED: 'Kartu kerja wajib belum ada',
    MAINTENANCE_RELEASE_MECHANIC_EVIDENCE_REQUIRED: 'Bukti pengesahan teknisi belum lengkap',
    MAINTENANCE_RELEASE_REINSPECTION_REQUIRED: 'Pemeriksaan ulang belum lulus',
    MAINTENANCE_RELEASE_REWORK_APPROVED_DATA_REQUIRED: 'Data perbaikan ulang belum lengkap',
    MAINTENANCE_RELEASE_REWORK_REQUIRED: 'Perbaikan ulang masih diperlukan',
    MAINTENANCE_RELEASE_REWORK_SIGNOFF_REQUIRED: 'Perbaikan ulang belum disahkan teknisi',
    MAINTENANCE_RELEASE_REWORK_UNSIGNED: 'Perbaikan ulang belum ditandatangani',
    MECHANIC: 'Teknisi',
    MECHANIC_SIGNOFF: 'Pengesahan pekerjaan teknisi',
    MECHANIC_SIGN_OFF: 'Pengesahan pekerjaan teknisi',
    NO_IMPACT: 'Tidak berdampak maintenance',
    NON_ROUTINE: 'Pekerjaan non-rutin',
    NORMAL: 'Normal',
    NOT_READY: 'Belum siap',
    OPEN: 'Terbuka',
    PASSED: 'Lulus',
    POSTED: 'Sudah diposting',
    READY: 'Siap dikerjakan',
    READY_FOR_HANDOFF: 'Siap diserahkan',
    READY_FOR_RELEASE: 'Menunggu rilis teknis',
    READY_FOR_RELEASE_REVIEW: 'Siap diajukan untuk rilis teknis',
    READINESS_RECALCULATED: 'Kesiapan teknis dihitung ulang',
    REJECTED_FOR_REWORK: 'Pemeriksaan tidak lulus',
    RELEASED: 'Sudah dirilis',
    REINSPECTION_FAILED: 'Pemeriksaan ulang tidak lulus',
    REINSPECTION_PASSED: 'Pemeriksaan ulang lulus',
    RESTRICTED: 'Terbatas',
    REWORK_ACTION: 'Perbaikan ulang',
    REWORK_REQUIRED: 'Perbaikan ulang diperlukan',
    REWORK_SIGN_OFF: 'Pengesahan perbaikan ulang',
    SCHEDULED_TASK: 'Pekerjaan terjadwal',
    SERVICEABLE: 'Serviceable',
    SERVICEABLE_WITH_RESTRICTIONS: 'Serviceable dengan pembatasan',
    START: 'Pekerjaan dimulai',
    TECHNICAL_RELEASE: 'Rilis teknis pesawat',
    UNserviceable: 'Unserviceable',
    UNSERVICEABLE: 'Unserviceable',
    WORK_PACKAGE: 'Paket pekerjaan'
  };
  if (value === 'LEGACY_NEXT_MAINTENANCE') return 'Maintenance berikutnya jatuh tempo';
  if (labels[value]) return labels[value];
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replaceAll(/\b[a-z]/gu, (letter) => letter.toUpperCase());
}

function errorDetails(error: ApiClientError) {
  return error.details && typeof error.details === 'object' && !Array.isArray(error.details)
    ? (error.details as Record<string, unknown>)
    : {};
}

export function useMaintenanceUi() {
  const companyAuthorizationTitles: Record<string, string> = {
    COMPANY_AUTHORIZATION_REQUIRED: 'Wewenang PT AMA belum sesuai',
    COMPANY_AUTHORIZATION_INACTIVE: 'Wewenang PT AMA tidak aktif',
    COMPANY_AUTHORIZATION_EXPIRED: 'Wewenang PT AMA sudah kedaluwarsa',
    COMPANY_AUTHORIZATION_ACTION_NOT_PERMITTED: 'Tindakan ini tidak termasuk wewenang PT AMA',
    COMPANY_AUTHORIZATION_AIRCRAFT_SCOPE_MISMATCH: 'Scope pesawat tidak sesuai wewenang',
    COMPANY_AUTHORIZATION_LICENCE_MISMATCH: 'Lisensi personel tidak sesuai'
  };

  function workPackageStatusColor(status: string | null | undefined) {
    if (status === 'RELEASED') return 'success';
    if (status === 'READY_FOR_RELEASE') return 'warning';
    if (status === 'CANCELLED') return 'error';
    if (status === 'IN_PROGRESS') return 'info';
    return 'secondary';
  }

  function jobCardStatusColor(status: string | null | undefined) {
    if (status === 'READY_FOR_RELEASE_REVIEW') return 'success';
    if (status === 'INSPECTION_REQUIRED') return 'warning';
    if (status === 'REJECTED_FOR_REWORK' || status === 'CANCELLED') return 'error';
    if (status === 'IN_PROGRESS') return 'info';
    return 'secondary';
  }

  function technicalStateColor(status: string | null | undefined) {
    if (status === 'SERVICEABLE') return 'success';
    if (status === 'SERVICEABLE_WITH_RESTRICTIONS' || status === 'RESTRICTED') return 'warning';
    if (status === 'UNSERVICEABLE' || status === 'BLOCKED') return 'error';
    return 'secondary';
  }

  function permissionHint(allowed: boolean, permission: string, role: string) {
    const labels: Record<string, string> = {
      'maintenance.release.issue': 'menerbitkan rilis teknis pesawat',
      'maintenance.package.plan': 'membuat paket pekerjaan',
      'maintenance.jobcard.manage': 'mengelola kartu kerja',
      'maintenance.jobcard.work.sign': 'mengesahkan pekerjaan teknisi',
      'maintenance.jobcard.inspect': 'melakukan pemeriksaan independen'
    };
    return allowed
      ? 'Tindakan tersedia untuk role ini.'
      : `${role} tidak dapat ${labels[permission] ?? 'melakukan tindakan ini'}.`;
  }

  function operationalAction(value: string | null | undefined) {
    if (!value) return '-';
    return value
      .replace('Backend blockers', 'Penghambat dari sistem')
      .replace('Required action:', 'Langkah berikutnya:')
      .replace('Technical release cannot proceed.', 'Rilis teknis belum dapat dilakukan.')
      .replace('Technical release is blocked.', 'Rilis teknis sedang terblokir.')
      .replace(
        'Complete independent inspection with evidence.',
        'Selesaikan pemeriksaan independen dengan bukti.'
      )
      .replace(
        'Complete corrective work and submit the required re-inspection.',
        'Selesaikan perbaikan ulang, lalu minta pemeriksaan ulang.'
      )
      .replace(
        'Complete mechanic work and required inspection.',
        'Selesaikan pekerjaan teknisi dan pemeriksaan yang diwajibkan.'
      )
      .replace(
        'Record the approved data reference and revision snapshot.',
        'Isi referensi approved maintenance data dan revisinya.'
      );
  }

  function presentError(errorValue: unknown): MaintenanceErrorPresentation {
    if (errorValue instanceof ApiClientError) {
      const details = errorDetails(errorValue);
      return {
        code: errorValue.code,
        title: companyAuthorizationTitles[errorValue.code] ?? errorValue.message,
        impact:
          typeof details.impact === 'string'
            ? operationalAction(details.impact)
            : 'Tindakan tidak diterapkan oleh sistem.',
        requiredAction:
          typeof details.requiredAction === 'string'
            ? operationalAction(details.requiredAction)
            : 'Muat ulang data, selesaikan penghambat, lalu coba lagi.',
        referenceId:
          typeof details.referenceId === 'string'
            ? details.referenceId
            : typeof details.correlationId === 'string'
              ? details.correlationId
              : null,
        requestId: errorValue.requestId ?? null
      };
    }
    return {
      code: 'CLIENT_ACTION_FAILED',
      title: errorValue instanceof Error ? errorValue.message : 'Tindakan maintenance gagal.',
      impact: 'UI belum dapat memastikan apakah tindakan sudah diterapkan.',
      requiredAction: 'Muat ulang halaman dan periksa status backend sebelum mencoba lagi.',
      referenceId: null,
      requestId: null
    };
  }

  return {
    jobCardStatusColor,
    label,
    operationalAction,
    permissionHint,
    presentError,
    technicalStateColor,
    workPackageStatusColor
  };
}
