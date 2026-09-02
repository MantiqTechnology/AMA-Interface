import type {
  MaintenanceJobCardDto,
  MaintenanceReworkActionDto
} from '#shared/features/maintenance';

export function signoff(card: MaintenanceJobCardDto, type: 'MECHANIC' | 'INDEPENDENT_INSPECTION') {
  return card.signoffs.find((item) => item.signoffType === type);
}

export function activeRework(card: MaintenanceJobCardDto) {
  return (
    card.reworkActions.find((item) =>
      ['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS', 'AWAITING_REINSPECTION'].includes(
        item.status
      )
    ) ?? null
  );
}

export function latestInspectionAttempt(card: MaintenanceJobCardDto) {
  return [...card.inspectionAttempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0] ?? null;
}

export function displayJobCardValue(value: string | number | null | undefined) {
  if (value === 0) return '0';
  return value ? String(value) : 'Belum ditentukan';
}

export function releaseImpactLabel(value: MaintenanceJobCardDto['releaseImpact']) {
  const labels: Record<MaintenanceJobCardDto['releaseImpact'], string> = {
    BLOCKS_RELEASE: 'Memblokir Technical Release',
    ADVISORY: 'Advisory',
    NO_RELEASE_IMPACT: 'Tidak berdampak ke Technical Release'
  };
  return labels[value];
}

export function releaseImpactColor(value: MaintenanceJobCardDto['releaseImpact']) {
  if (value === 'BLOCKS_RELEASE') return 'error';
  if (value === 'ADVISORY') return 'warning';
  return 'success';
}

export function approvedDataStatusColor(
  status: MaintenanceJobCardDto['approvedDataLinks'][number]['revisionStatus']
) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUPERSEDED') return 'warning';
  if (status === 'WITHDRAWN') return 'error';
  return 'info';
}

export function listOrFallback(items: string[], fallback = 'Belum ditentukan') {
  return items.length ? items : [fallback];
}

export function instructionLines(value: string) {
  return value
    .split(/\r?\n/u)
    .map((item) => item.replace(/^[-*\d.\s]+/u, '').trim())
    .filter(Boolean);
}

export function dependencyIds(value: string) {
  return value
    .split(/[\n,]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function jobCardBlocker(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Pekerjaan belum dimulai.';
  if (card.status === 'IN_PROGRESS') return 'Menunggu Mechanic Sign-off.';
  if (card.status === 'REJECTED_FOR_REWORK') {
    return 'Inspection tidak lulus dan membutuhkan corrective work.';
  }
  if (card.status === 'INSPECTION_REQUIRED') return 'Menunggu independent Inspection.';
  if (card.status === 'READY_FOR_RELEASE_REVIEW') return 'Tidak ada blocker Job Card.';
  return card.status;
}

export function jobCardRequiredAction(card: MaintenanceJobCardDto) {
  if (card.status === 'READY') return 'Mulai pekerjaan dan isi pernyataan teknisi.';
  if (card.status === 'IN_PROGRESS') return 'Selesaikan Mechanic Sign-off dengan bukti.';
  if (card.status === 'REJECTED_FOR_REWORK') return 'Selesaikan corrective work yang terkait.';
  if (card.status === 'INSPECTION_REQUIRED') {
    return 'Tugaskan inspector independen yang bukan teknisi pengesah pekerjaan.';
  }
  if (card.status === 'READY_FOR_RELEASE_REVIEW')
    return 'Masukkan ke readiness review Technical Release.';
  return 'Buka riwayat aktivitas sebelum tindakan lanjutan.';
}

export function dependencyLabels(card: MaintenanceJobCardDto, allCards: MaintenanceJobCardDto[]) {
  if (!card.dependencyJobCardIds.length) return ['Tidak ada dependency'];
  return card.dependencyJobCardIds.map((dependencyId) => {
    const dependency = allCards.find(
      (candidate) => candidate.id === dependencyId || candidate.cardNumber === dependencyId
    );
    return dependency?.cardNumber ?? dependencyId;
  });
}

export function isReworkEditable(action: MaintenanceReworkActionDto) {
  return ['REWORK_REQUIRED', 'CORRECTIVE_WORK_IN_PROGRESS'].includes(action.status);
}
