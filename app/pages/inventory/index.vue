<script setup lang="ts">
import type { InventoryDashboardDto } from '#shared/features/inventory';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { money, dateTime } = useInventoryUi();
const canReadValuation = computed(() => can('inventory.valuation.read').allowed);

const { data, pending, error, refresh } = await useAsyncData('inventory-dashboard', () =>
  fetchApi<InventoryDashboardDto>('/api/inventory/dashboard')
);

const stats = computed(() => {
  const dashboard = data.value;
  if (!dashboard) return [];
  return [
    { label: 'Available Parts', value: dashboard.availablePartCount, tone: 'success' as const },
    { label: 'Low Stock', value: dashboard.lowStockCount, tone: 'warning' as const },
    { label: 'Expiring Lots', value: dashboard.expiringLotCount, tone: 'warning' as const },
    {
      label: 'Certificate Alerts',
      value: dashboard.certificateAlertCount,
      tone: 'danger' as const
    },
    { label: 'Quarantine', value: dashboard.quarantineItemCount, tone: 'danger' as const },
    { label: 'Open PR', value: dashboard.openPurchaseRequestCount, tone: 'info' as const },
    { label: 'Open PO', value: dashboard.openPurchaseOrderCount, tone: 'info' as const },
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
  <InventoryShell title="Inventory Control Center">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh inventory dashboard"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Inventory dashboard could not be loaded.
    </VAlert>

    <VRow v-if="pending && !data" class="mb-4">
      <VCol v-for="index in 8" :key="index" cols="12" lg="3" sm="6">
        <VSkeletonLoader type="article" />
      </VCol>
    </VRow>
    <VRow v-else class="mb-5">
      <VCol v-for="stat in stats" :key="stat.label" cols="12" lg="3" sm="6">
        <DsStatCard :label="stat.label" :tone="stat.tone" :value="stat.value" />
      </VCol>
    </VRow>

    <div class="d-flex align-center mb-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Recent Movements</h2>
        <div class="text-caption text-medium-emphasis">Latest posted inventory transactions</div>
      </div>
      <VSpacer />
      <VBtn
        append-icon="mdi-arrow-right"
        size="small"
        text="Movement audit"
        to="/inventory/movements"
        variant="text"
      />
    </div>

    <VCard border>
      <VTable>
        <thead>
          <tr>
            <th>Movement</th>
            <th>Type</th>
            <th>Station</th>
            <th>Reason</th>
            <th>Status</th>
            <th class="text-no-wrap">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in data?.recentMovements ?? []" :key="movement.id">
            <td class="font-weight-bold text-no-wrap">{{ movement.movementNumber }}</td>
            <td><DsStatusBadge :value="movement.movementType" /></td>
            <td>{{ movement.stationId ?? '-' }}</td>
            <td>{{ movement.reason }}</td>
            <td><DsStatusBadge :value="movement.status" /></td>
            <td class="text-no-wrap">{{ dateTime(movement.createdAt) }}</td>
          </tr>
          <tr v-if="!pending && !(data?.recentMovements.length ?? 0)">
            <td class="py-10 text-center text-medium-emphasis" colspan="6">
              No inventory movements yet.
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </InventoryShell>
</template>
