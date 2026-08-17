<script setup lang="ts">
const props = defineProps<{
  value: string;
  label?: string;
}>();

const normalizedValue = computed(() => props.value.toLowerCase());

const color = computed(() => {
  if (
    [
      'pass',
      'paid',
      'approved',
      'completed',
      'available',
      'closed',
      'confirmed',
      'serviceable',
      'posted',
      'received',
      'issued',
      'ordered',
      'verified',
      'ready',
      'released',
      'installed',
      'ready_for_approval',
      'ready_for_departure'
    ].includes(normalizedValue.value)
  ) {
    return 'success';
  }
  if (
    [
      'warning',
      'pending',
      'pending_readiness',
      'pending_closure',
      'requested',
      'submitted',
      'in_progress',
      'draft',
      'scheduled',
      'airborne',
      'quarantine',
      'in_repair',
      'partially_received',
      'partially_ordered',
      'pending_approval',
      'counted',
      'check',
      'at_risk',
      'reserved',
      'restricted',
      'waiting_material',
      'due_soon',
      'check_in_open',
      'check_in_closed'
    ].includes(normalizedValue.value)
  ) {
    return 'warning';
  }
  if (
    [
      'critical',
      'blocker',
      'blocked',
      'rejected',
      'grounded',
      'cancelled',
      'canceled',
      'delayed',
      'diverted',
      'aog',
      'unserviceable',
      'scrapped',
      'expired',
      'reversed',
      'not_ready',
      'reopened_for_correction'
    ].includes(normalizedValue.value)
  ) {
    return 'danger';
  }
  return 'info';
});

const fallbackLabel = computed(() => normalizedValue.value.replaceAll('_', ' '));

const labels: Record<string, string> = {
  ready: 'Siap',
  not_ready: 'Belum siap',
  at_risk: 'Perlu perhatian',
  check: 'Perlu pemeriksaan',
  pending: 'Menunggu',
  requested: 'Diminta',
  reserved: 'Direservasi',
  issued: 'Dikeluarkan',
  installed: 'Terpasang',
  waiting_material: 'Menunggu material',
  ready_for_release: 'Menunggu rilis teknis',
  released: 'Sudah dirilis',
  serviceable: 'Layak pakai',
  unserviceable: 'Tidak layak pakai',
  quarantine: 'Karantina',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  verified: 'Terverifikasi',
  draft: 'Draf',
  closed: 'Ditutup',
  cancelled: 'Dibatalkan',
  canceled: 'Dibatalkan',
  blocked: 'Terblokir',
  overdue: 'Terlambat',
  due_soon: 'Segera jatuh tempo',
  origin_departure: 'Keberangkatan station asal',
  destination_arrival: 'Kedatangan station tujuan'
};

const displayLabel = computed(
  () => props.label ?? labels[normalizedValue.value] ?? fallbackLabel.value
);

const icon = computed(() => {
  if (color.value === 'success') return 'mdi-check-circle-outline';
  if (color.value === 'warning') return 'mdi-alert-circle-outline';
  if (color.value === 'danger') return 'mdi-close-octagon-outline';
  return 'mdi-information-outline';
});
</script>

<template>
  <VChip
    class="font-weight-bold"
    :color="color"
    density="comfortable"
    :prepend-icon="icon"
    size="small"
    variant="tonal"
  >
    {{ displayLabel }}
  </VChip>
</template>
