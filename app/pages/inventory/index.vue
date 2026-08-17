<script setup lang="ts">
import type {
  InventoryDashboardDto,
  InventoryMaintenanceDemandDto
} from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { money, dateTime } = useInventoryUi();
const canReadValuation = computed(() => can('inventory.valuation.read').allowed);

const { data, pending, error, refresh } = await useAsyncData('inventory-dashboard', () =>
  fetchApi<InventoryDashboardDto>('/api/inventory/dashboard')
);
const { data: maintenanceDemand, refresh: refreshDemand } = await useAsyncData(
  'inventory-dashboard-maintenance-demand',
  () => fetchApi<InventoryMaintenanceDemandDto[]>('/api/inventory/maintenance-demand'),
  { server: false }
);

const stats = computed(() => {
  const dashboard = data.value;
  if (!dashboard) return [];
  return [
    {
      label: 'Part tersedia',
      value: dashboard.availablePartCount,
      tone: 'success' as const,
      icon: 'mdi-package-variant-closed-check'
    },
    {
      label: 'Low stock',
      value: dashboard.lowStockCount,
      tone: 'warning' as const,
      icon: 'mdi-chart-bell-curve-cumulative'
    },
    {
      label: 'Kebutuhan MRO',
      value: maintenanceDemand.value?.length ?? 0,
      tone: 'warning' as const,
      icon: 'mdi-airplane-wrench',
      to: '/inventory/maintenance-demand'
    },
    {
      label: 'Terblokir',
      value: maintenanceDemand.value?.filter((item) => item.nextAction === 'BLOCKED').length ?? 0,
      tone: 'danger' as const,
      icon: 'mdi-alert-octagon-outline',
      to: '/inventory/maintenance-demand?status=BLOCKED'
    },
    {
      label: 'Karantina',
      value: dashboard.quarantineItemCount,
      tone: 'danger' as const,
      icon: 'mdi-package-variant-remove'
    },
    ...(canReadValuation.value
      ? [
          {
            label: 'FIFO Valuation',
            value: money(dashboard.fifoValuationIdr),
            tone: 'success' as const
          }
        ]
      : [])
  ];
});
</script>

<template>
  <InventoryShell
    description="Prioritaskan ketersediaan stock, kebutuhan material MRO, dan transaksi yang memerlukan tindakan."
    title="Pusat Kendali Inventory"
  >
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh inventory dashboard"
        variant="text"
        @click="Promise.all([refresh(), refreshDemand()])"
      />
    </template>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Inventory dashboard could not be loaded.
    </VAlert>

    <VSkeletonLoader v-if="pending && !data" class="mb-4" type="list-item@4" />
    <DsMetricStrip v-else class="mb-5" :items="stats" />

    <div class="d-flex align-center mb-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Pergerakan terakhir</h2>
        <div class="text-caption text-medium-emphasis">Transaksi inventory yang baru diposting</div>
      </div>
      <VSpacer />
      <VBtn
        append-icon="mdi-arrow-right"
        size="small"
        text="Audit pergerakan"
        to="/inventory/movements"
        variant="text"
      />
    </div>

    <VCard border>
      <VTable>
        <thead>
          <tr>
            <th>Pergerakan</th>
            <th>Tipe</th>
            <th>Station</th>
            <th>Alasan</th>
            <th>Status</th>
            <th class="text-no-wrap">Dibuat</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in data?.recentMovements ?? []" :key="movement.id">
            <td class="font-weight-bold text-no-wrap">{{ movement.movementNumber }}</td>
            <td><DsStatusBadge :value="movement.movementType" /></td>
            <td>{{ movement.stationCode ?? movement.stationId ?? '-' }}</td>
            <td>{{ movement.reason }}</td>
            <td><DsStatusBadge :value="movement.status" /></td>
            <td class="text-no-wrap">{{ dateTime(movement.createdAt) }}</td>
          </tr>
          <tr v-if="!pending && !(data?.recentMovements.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="6">
              Belum ada pergerakan inventory.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </InventoryShell>
</template>
