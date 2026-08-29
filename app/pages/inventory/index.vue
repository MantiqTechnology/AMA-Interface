<script setup lang="ts">
import type {
  InventoryCoreReturnDto,
  InventoryDashboardDto,
  InventoryMaintenanceDemandDto,
  InventoryMovementDto,
  InventorySerializedPartDto,
  InventoryStockDto,
  PurchaseOrderDto,
  PurchaseRequestDto
} from '#shared/features/inventory';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

type RepairOrder = {
  id: string;
  repairNumber: string;
  serialId: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  vendorName: string;
  status: string;
  reason: string;
  expectedReturnAt: string | null;
  createdAt: string;
};

type KpiCard = {
  label: string;
  value: number | string;
  description: string;
  icon: string;
  tone: 'red' | 'orange' | 'blue' | 'amber';
  to?: string;
};

type MaterialAction = {
  id: string;
  priority: 'Kritis' | 'Tinggi' | 'Sedang';
  aircraftStation: string;
  material: string;
  partNumber: string;
  need: string;
  availability: string;
  availabilityTone: 'red' | 'orange' | 'green';
  eta: string;
  source: string;
  impact: string;
  impactTone: 'red' | 'orange' | 'neutral';
  action: string;
  to: string;
};

const { can } = useAuthorization();
const { money, number, date, dateTime, errorMessage } = useInventoryUi();
const canReadValuation = computed(() => can('inventory.valuation.read').allowed);

const { data, pending, error, refresh } = await useAsyncData('inventory-dashboard', () =>
  fetchApi<InventoryDashboardDto>('/api/inventory/dashboard')
);
const { data: maintenanceDemand, refresh: refreshDemand } = await useAsyncData(
  'inventory-dashboard-maintenance-demand',
  () => fetchApi<InventoryMaintenanceDemandDto[]>('/api/inventory/maintenance-demand'),
  { server: false }
);
const { data: stockRows, refresh: refreshStock } = await useAsyncData(
  'inventory-dashboard-stock',
  () => fetchApi<InventoryStockDto[]>('/api/inventory/stock'),
  { server: false }
);
const { data: purchaseRequests, refresh: refreshPurchaseRequests } = await useAsyncData(
  'inventory-dashboard-purchase-requests',
  () => fetchApi<PurchaseRequestDto[]>('/api/inventory/purchase-requests'),
  { server: false }
);
const { data: purchaseOrders, refresh: refreshPurchaseOrders } = await useAsyncData(
  'inventory-dashboard-purchase-orders',
  () => fetchApi<PurchaseOrderDto[]>('/api/inventory/purchase-orders'),
  { server: false }
);
const { data: repairables, refresh: refreshRepairables } = await useAsyncData(
  'inventory-dashboard-repairables',
  () => fetchApi<InventorySerializedPartDto[]>('/api/inventory/repairables'),
  { server: false }
);
const { data: repairOrders, refresh: refreshRepairOrders } = await useAsyncData(
  'inventory-dashboard-repair-orders',
  () => fetchApi<RepairOrder[]>('/api/inventory/repair-orders'),
  { server: false }
);
const { data: coreReturns, refresh: refreshCoreReturns } = await useAsyncData(
  'inventory-dashboard-core-returns',
  () => fetchApi<InventoryCoreReturnDto[]>('/api/inventory/core-returns'),
  { server: false }
);

const demandRows = computed(() => maintenanceDemand.value ?? []);
const stock = computed(() => stockRows.value ?? []);
const requests = computed(() => purchaseRequests.value ?? []);
const orders = computed(() => purchaseOrders.value ?? []);
const serializedParts = computed(() => repairables.value ?? []);
const repairs = computed(() => repairOrders.value ?? []);
const returns = computed(() => coreReturns.value ?? []);
const movements = computed(() => data.value?.recentMovements ?? []);
const updatedAt = computed(
  () => movements.value[0]?.createdAt ?? new Date('2026-08-25T07:00:00+07:00').toISOString()
);

const blockedDemandCount = computed(
  () =>
    demandRows.value.filter(
      (item) => item.nextAction === 'BLOCKED' || item.workPackageStatus === 'AOG'
    ).length
);
const criticalShortageCount = computed(
  () =>
    demandRows.value.filter((item) => {
      const remaining =
        item.requirement.requiredQuantity -
        item.requirement.reservedQuantity -
        item.requirement.issuedQuantity;
      const available = item.candidates
        .filter((candidate) => candidate.eligible)
        .reduce((total, candidate) => total + candidate.availableQuantity, 0);
      return remaining > 0 && available < remaining;
    }).length
);

const kpis = computed<KpiCard[]>(() => [
  {
    label: 'AOG menunggu material',
    value: blockedDemandCount.value,
    description: 'Material kritis untuk pesawat AOG yang belum tersedia.',
    icon: 'mdi-alert-outline',
    tone: 'red',
    to: '/inventory/maintenance-demand?status=BLOCKED'
  },
  {
    label: 'Critical shortage',
    value: criticalShortageCount.value,
    description: 'Material kritis dengan ketersediaan tidak mencukupi.',
    icon: 'mdi-alert-rhombus-outline',
    tone: 'red'
  },
  {
    label: 'Kebutuhan MRO terbuka',
    value: demandRows.value.length,
    description: 'Permintaan material MRO yang belum dipenuhi.',
    icon: 'mdi-clipboard-text-outline',
    tone: 'blue',
    to: '/inventory/maintenance-demand'
  },
  {
    label: 'Low stock',
    value: data.value?.lowStockCount ?? 0,
    description: 'Material dengan ketersediaan di bawah minimum.',
    icon: 'mdi-chart-bar',
    tone: 'amber',
    to: '/inventory/stock'
  },
  {
    label: 'Karantina',
    value: data.value?.quarantineItemCount ?? 0,
    description: 'Material dalam karantina menunggu disposisi.',
    icon: 'mdi-biohazard',
    tone: 'orange',
    to: '/inventory/quarantine'
  },
  {
    label: 'Expiring soon',
    value: data.value?.expiringLotCount ?? 0,
    description: 'Material akan kadaluarsa dalam 30 hari.',
    icon: 'mdi-calendar-alert-outline',
    tone: 'amber',
    to: '/inventory/stock'
  }
]);

const materialActions = computed<MaterialAction[]>(() => {
  const demandActions = demandRows.value.map((item) => {
    const remaining = Math.max(
      0,
      item.requirement.requiredQuantity -
        item.requirement.reservedQuantity -
        item.requirement.issuedQuantity
    );
    const available = item.candidates
      .filter((candidate) => candidate.eligible)
      .reduce((total, candidate) => total + candidate.availableQuantity, 0);
    const nextCandidate = item.candidates.find((candidate) => candidate.eligible);
    const priority: MaterialAction['priority'] =
      item.nextAction === 'BLOCKED' ? 'Kritis' : available < remaining ? 'Tinggi' : 'Sedang';
    return {
      id: item.requirement.id,
      priority,
      aircraftStation: `${item.aircraftRegistration} / ${item.stationCode ?? '-'}`,
      material: item.requirement.partName ?? 'Material requirement',
      partNumber: item.requirement.partNumber ?? '-',
      need: `${number(remaining || item.requirement.requiredQuantity, 0)} ${item.requirement.unit}`,
      availability: `${number(available, 0)} ${item.requirement.unit}`,
      availabilityTone: available <= 0 ? 'red' : available < remaining ? 'orange' : 'green',
      eta: item.requirement.requiredBy ? date(item.requirement.requiredBy) : '-',
      source: nextCandidate
        ? `${nextCandidate.warehouseCode} ${nextCandidate.stationCode}`
        : (item.blocker ?? 'Belum ada sumber'),
      impact: item.nextAction === 'BLOCKED' ? 'AOG' : available < remaining ? 'Delay' : 'Monitor',
      impactTone:
        item.nextAction === 'BLOCKED' ? 'red' : available < remaining ? 'orange' : 'neutral',
      action:
        item.nextAction === 'RESERVE'
          ? 'Reservasi'
          : item.nextAction === 'ISSUE'
            ? 'Issue'
            : 'Buat PR',
      to: `/inventory/maintenance-demand?requirement=${encodeURIComponent(item.requirement.id)}`
    } satisfies MaterialAction;
  });

  const lowStockActions = stock.value
    .filter((item) => item.lowStock)
    .map((item): MaterialAction => ({
      id: `low-${item.id}`,
      priority: item.availableQuantity <= 0 ? 'Tinggi' : 'Sedang',
      aircraftStation: `- / ${item.stationCode}`,
      material: item.partName,
      partNumber: item.partNumber,
      need: `${number(item.reorderPoint ?? 0, 0)} ${item.unitOfMeasure}`,
      availability: `${number(item.availableQuantity, 0)} ${item.unitOfMeasure}`,
      availabilityTone: item.availableQuantity <= 0 ? 'red' : 'orange',
      eta: '-',
      source: `${item.warehouseCode} ${item.binCode}`,
      impact: 'Maintain',
      impactTone: 'orange',
      action: 'Review stock',
      to: '/inventory/stock'
    }));

  const priorityScore = { Kritis: 0, Tinggi: 1, Sedang: 2 };
  return [...demandActions, ...lowStockActions]
    .sort((left, right) => priorityScore[left.priority] - priorityScore[right.priority])
    .slice(0, 6);
});

const conditionPalette: Record<string, string> = {
  SERVICEABLE: '#16a37a',
  RESERVED: '#1f6fe5',
  QUARANTINE: '#f59e0b',
  UNSERVICEABLE: '#ef4444',
  IN_REPAIR: '#8b5cf6',
  IN_TRANSIT: '#0891b2'
};
const conditionLabels: Record<string, string> = {
  SERVICEABLE: 'Serviceable',
  RESERVED: 'Reserved',
  QUARANTINE: 'Quarantine',
  UNSERVICEABLE: 'Unserviceable',
  IN_REPAIR: 'In Repair',
  IN_TRANSIT: 'In Transit'
};

const stockHealth = computed(() => {
  const totals = new Map<string, number>();
  for (const item of stock.value) {
    totals.set(item.condition, (totals.get(item.condition) ?? 0) + item.onHandQuantity);
  }
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return Object.entries(conditionLabels).map(([key, label]) => {
    const value = totals.get(key) ?? 0;
    return {
      key,
      label,
      value,
      percent: total ? Math.round((value / total) * 100) : 0,
      color: conditionPalette[key] ?? '#64748b'
    };
  });
});
const stockHealthTotal = computed(() =>
  stockHealth.value.reduce((sum, item) => sum + item.value, 0)
);

const stationDistribution = computed(() => {
  const totals = new Map<string, number>();
  for (const item of stock.value) {
    totals.set(item.stationCode, (totals.get(item.stationCode) ?? 0) + item.onHandQuantity);
  }
  const rows = [...totals.entries()]
    .map(([station, value]) => ({ station, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  return rows.map((item) => ({
    ...item,
    percent: total ? Math.round((item.value / total) * 100) : 0
  }));
});

const procurementMetrics = computed(() => [
  {
    label: 'PR menunggu approval',
    value: requests.value.filter((item) => item.status === 'SUBMITTED').length,
    note: 'Butuh persetujuan',
    tone: 'neutral'
  },
  {
    label: 'PO belum diterbitkan',
    value: data.value?.openPurchaseOrderCount ?? orders.value.length,
    note: 'Siap untuk PO',
    tone: 'neutral'
  },
  {
    label: 'In transit',
    value: movements.value.filter((item) => item.movementType === 'TRANSFER').length,
    note: 'Dalam perjalanan',
    tone: 'neutral'
  },
  {
    label: 'Receipt menunggu inspection',
    value: data.value?.certificateAlertCount ?? 0,
    note: 'Belum diinspeksi',
    tone: 'neutral'
  },
  {
    label: 'Transfer antarstation',
    value: movements.value.filter((item) => item.destinationStationId).length,
    note: 'Dalam proses',
    tone: 'neutral'
  },
  {
    label: 'SLA terlewati',
    value: orders.value.filter((item) => item.expectedAt < new Date().toISOString().slice(0, 10))
      .length,
    note: 'Perlu eskalasi',
    tone: 'danger'
  }
]);

const repairableMetrics = computed(() => [
  {
    label: 'Removed component belum dikembalikan',
    value: serializedParts.value.filter((item) => item.condition === 'UNSERVICEABLE').length,
    note: 'Menunggu return',
    tone: 'blue'
  },
  {
    label: 'Core return overdue',
    value: returns.value.filter((item) => item.isOverdue).length,
    note: 'Lewat jatuh tempo',
    tone: 'danger'
  },
  {
    label: 'Komponen sedang repair',
    value: repairs.value.filter((item) => !['RETURNED', 'CANCELLED'].includes(item.status)).length,
    note: 'Dalam pengerjaan',
    tone: 'neutral'
  },
  {
    label: 'Menunggu disposition',
    value: serializedParts.value.filter((item) => item.condition === 'QUARANTINE').length,
    note: 'Butuh keputusan',
    tone: 'neutral'
  },
  {
    // Demo-only visual micro-alert. Current dashboard APIs do not expose fly-away-kit replenishment.
    label: 'Fly-away kit alert',
    value: Math.min(3, Math.max(0, data.value?.lowStockCount ?? 0)),
    note: 'Perlu replenishment',
    tone: 'warning'
  }
]);

const valuationSummary = computed(() =>
  canReadValuation.value ? money(data.value?.fifoValuationIdr ?? null) : null
);

async function refreshAll() {
  await Promise.all([
    refresh(),
    refreshDemand(),
    refreshStock(),
    refreshPurchaseRequests(),
    refreshPurchaseOrders(),
    refreshRepairables(),
    refreshRepairOrders(),
    refreshCoreReturns()
  ]);
}

function badgeClass(tone: string) {
  return `tone-${tone}`;
}

function movementActor(movement: InventoryMovementDto) {
  if (movement.createdByUserId.includes('system')) return 'system';
  return movement.createdByUserId.replace(/^USR-/u, '').toLowerCase();
}
</script>

<template>
  <InventoryShell
    description="Memprioritaskan ketersediaan stok, kebutuhan material MRO, blocker rilis pesawat, dan tindakan mendesak."
    title="Pusat Kendali Inventory"
    :updated-at="dateTime(updatedAt)"
  >
    <template #actions>
      <DsTooltipIconButton
        color="primary"
        icon="mdi-refresh"
        :loading="pending"
        tooltip="Perbarui dashboard inventory"
        variant="tonal"
        @click="refreshAll"
      />
    </template>

    <VAlert v-if="error" aria-live="polite" class="mb-4" type="error" variant="tonal">
      {{
        errorMessage(
          error,
          'Dashboard inventory tidak dapat dimuat. Perbarui halaman lalu coba lagi.'
        )
      }}
    </VAlert>

    <VSkeletonLoader v-if="pending && !data" class="mb-4" type="list-item@6" />
    <template v-else>
      <section class="kpi-grid" aria-label="Metrik prioritas inventory">
        <NuxtLink
          v-for="card in kpis"
          :key="card.label"
          class="kpi-card"
          :class="`kpi-card--${card.tone}`"
          :to="card.to ?? '/inventory'"
        >
          <div class="kpi-icon">
            <VIcon :icon="card.icon" size="28" />
          </div>
          <div>
            <p>{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <span>{{ card.description }}</span>
          </div>
        </NuxtLink>
      </section>

      <section class="dashboard-grid">
        <InventoryPanel class="material-card" title="Material Memerlukan Tindakan">
          <div class="table-wrap">
            <VTable class="compact-table material-table">
              <thead>
                <tr>
                  <th>Prioritas</th>
                  <th>Pesawat / Station</th>
                  <th>Material</th>
                  <th>Kebutuhan</th>
                  <th>Ketersediaan</th>
                  <th>ETA / Sumber</th>
                  <th>Dampak</th>
                  <th>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in materialActions" :key="item.id">
                  <td>
                    <span class="pill" :class="badgeClass(item.priority.toLowerCase())">{{
                      item.priority
                    }}</span>
                  </td>
                  <td class="text-no-wrap">{{ item.aircraftStation }}</td>
                  <td>
                    <strong>{{ item.material }}</strong>
                    <small>P/N {{ item.partNumber }}</small>
                  </td>
                  <td class="font-weight-bold text-no-wrap">{{ item.need }}</td>
                  <td
                    class="font-weight-bold text-no-wrap"
                    :class="`availability-${item.availabilityTone}`"
                  >
                    {{ item.availability }}
                  </td>
                  <td>
                    <strong>{{ item.eta }}</strong>
                    <small>{{ item.source }}</small>
                  </td>
                  <td>
                    <span class="pill" :class="badgeClass(item.impactTone)">{{ item.impact }}</span>
                  </td>
                  <td>
                    <VBtn :to="item.to" color="primary" size="small" variant="outlined">
                      {{ item.action }}
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="!materialActions.length">
                  <td colspan="8" class="empty-cell">
                    Tidak ada material yang memerlukan tindakan.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
          <VCardActions>
            <VBtn
              append-icon="mdi-arrow-right"
              size="small"
              to="/inventory/maintenance-demand"
              variant="text"
            >
              Lihat semua material memerlukan tindakan
            </VBtn>
          </VCardActions>
        </InventoryPanel>

        <aside class="side-stack">
          <InventoryPanel title="Kesehatan Stok">
            <VCardText>
              <div class="stock-bar">
                <span
                  v-for="item in stockHealth"
                  :key="item.key"
                  :style="{ width: `${item.percent}%`, backgroundColor: item.color }"
                />
              </div>
              <div class="health-list">
                <div v-for="item in stockHealth" :key="item.key">
                  <span class="dot" :style="{ backgroundColor: item.color }" />
                  <span>{{ item.label }}</span>
                  <strong>{{ number(item.value, 0) }}</strong>
                  <em>{{ item.percent }}%</em>
                </div>
                <div class="total-row">
                  <span>Total</span>
                  <strong>{{ number(stockHealthTotal, 0) }}</strong>
                </div>
              </div>
              <div v-if="valuationSummary" class="valuation-note">
                <span>Part tersedia</span>
                <strong>{{ number(data?.availablePartCount ?? 0, 0) }}</strong>
                <span>Valuasi FIFO</span>
                <strong>{{ valuationSummary }}</strong>
              </div>
            </VCardText>
          </InventoryPanel>

          <InventoryPanel title="Distribusi Station">
            <VCardText>
              <div class="station-list">
                <div v-for="station in stationDistribution" :key="station.station">
                  <span>{{ station.station }}</span>
                  <div class="station-meter"><i :style="{ width: `${station.percent}%` }" /></div>
                  <strong>{{ number(station.value, 0) }}</strong>
                  <em>{{ station.percent }}%</em>
                </div>
                <div class="total-row">
                  <span>Total lokasi</span>
                  <strong>{{ stationDistribution.length }}</strong>
                  <strong>{{ number(stockHealthTotal, 0) }}</strong>
                </div>
              </div>
            </VCardText>
          </InventoryPanel>

          <VAlert class="inventory-note" color="info" variant="tonal">
            Data berdasarkan inventory yang sudah diposting dan Permintaan MRO aktif.
          </VAlert>
        </aside>
      </section>

      <section class="two-column">
        <InventoryPanel title="Pengadaan & Fulfilment">
          <VCardText class="mini-grid">
            <div
              v-for="metric in procurementMetrics"
              :key="metric.label"
              class="mini-card"
              :class="badgeClass(metric.tone)"
            >
              <p>{{ metric.label }}</p>
              <strong>{{ metric.value }}</strong>
              <span>{{ metric.note }}</span>
            </div>
          </VCardText>
        </InventoryPanel>

        <InventoryPanel title="Repairable & Core Return">
          <VCardText class="mini-grid mini-grid--five">
            <div
              v-for="metric in repairableMetrics"
              :key="metric.label"
              class="mini-card"
              :class="badgeClass(metric.tone)"
            >
              <p>{{ metric.label }}</p>
              <strong>{{ metric.value }}</strong>
              <span>{{ metric.note }}</span>
            </div>
          </VCardText>
        </InventoryPanel>
      </section>

      <InventoryPanel title="Pergerakan Terakhir">
        <div class="table-wrap">
          <VTable class="compact-table movement-table">
            <thead>
              <tr>
                <th>Pergerakan</th>
                <th>Tipe</th>
                <th>Station</th>
                <th>Alasan</th>
                <th>Status</th>
                <th>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="movement in movements" :key="movement.id">
                <td class="font-weight-bold text-no-wrap">{{ movement.movementNumber }}</td>
                <td><DsStatusBadge :value="movement.movementType" /></td>
                <td>{{ movement.stationCode ?? movement.stationId ?? '-' }}</td>
                <td>{{ movement.reason }}</td>
                <td><DsStatusBadge :value="movement.status" /></td>
                <td class="text-no-wrap">
                  {{ dateTime(movement.createdAt) }} oleh {{ movementActor(movement) }}
                </td>
              </tr>
              <tr v-if="!movements.length">
                <td class="empty-cell" colspan="6">Belum ada pergerakan inventory.</td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <VCardActions>
          <VBtn append-icon="mdi-arrow-right" size="small" to="/inventory/movements" variant="text">
            Lihat semua pergerakan
          </VBtn>
        </VCardActions>
      </InventoryPanel>
    </template>
  </InventoryShell>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.kpi-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 108px;
  padding: 18px;
  border: 1px solid #dde5f0;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 14px 34px rgba(15, 27, 61, 0.05);
}

.kpi-card p,
.mini-card p {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 800;
}

.kpi-card strong {
  display: block;
  margin-bottom: 6px;
  color: #070f27;
  font-size: 1.45rem;
  line-height: 1;
}

.kpi-card span,
.mini-card span {
  display: block;
  color: #3f4c69;
  font-size: 0.78rem;
  line-height: 1.45;
}

.kpi-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 8px;
}

.kpi-card--red {
  border-color: #fecaca;
}

.kpi-card--red .kpi-icon {
  background: #fff1f2;
  color: #ef4444;
}

.kpi-card--orange {
  border-color: #fed7aa;
}

.kpi-card--orange .kpi-icon {
  background: #fff7ed;
  color: #ea580c;
}

.kpi-card--blue {
  border-color: #c7d2fe;
}

.kpi-card--blue .kpi-icon {
  background: #eef2ff;
  color: #4f46e5;
}

.kpi-card--amber {
  border-color: #fde68a;
}

.kpi-card--amber .kpi-icon {
  background: #fffbeb;
  color: #d97706;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(340px, 0.9fr);
  gap: 16px;
  margin-bottom: 16px;
}

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.side-stack {
  display: grid;
  gap: 12px;
  align-content: start;
}

.dashboard-card {
  overflow: hidden;
  border-color: #dce4ef !important;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 27, 61, 0.045);
}

.dashboard-card :deep(.v-card-title) {
  min-height: 42px;
  padding: 10px 14px;
  color: #0f2452;
  font-size: 1rem;
  font-weight: 850;
}

.table-wrap {
  overflow-x: auto;
  border-top: 1px solid #dbe3ef;
}

.compact-table :deep(table) {
  min-width: 980px;
  table-layout: fixed;
}

.compact-table :deep(th),
.compact-table :deep(td) {
  height: 34px;
  padding: 7px 12px !important;
  border-bottom: 1px solid #e6edf5;
  vertical-align: top;
}

.compact-table :deep(th) {
  color: #33405d;
  font-size: 0.72rem;
  font-weight: 850;
  white-space: nowrap;
}

.compact-table :deep(td) {
  color: #12203d;
  font-size: 0.78rem;
}

.compact-table small {
  display: block;
  margin-top: 2px;
  color: #53617e;
  font-size: 0.74rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  white-space: nowrap;
}

.tone-kritis,
.tone-red,
.tone-danger {
  background: #fee2e2;
  color: #dc2626;
}

.tone-tinggi,
.tone-orange,
.tone-warning {
  background: #ffedd5;
  color: #ea580c;
}

.tone-sedang,
.tone-amber {
  background: #fef3c7;
  color: #d97706;
}

.tone-neutral {
  background: #f1f5f9;
  color: #475569;
}

.tone-blue {
  background: #e0f2fe;
  color: #0369a1;
}

.availability-red {
  color: #dc2626;
}

.availability-orange {
  color: #ea580c;
}

.availability-green {
  color: #059669;
}

.stock-bar {
  display: flex;
  height: 18px;
  overflow: hidden;
  border-radius: 5px;
  background: #e5eaf2;
}

.stock-bar span {
  min-width: 2px;
}

.health-list,
.station-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.health-list > div,
.station-list > div,
.valuation-note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  color: #43506d;
  font-size: 0.8rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.health-list strong,
.station-list strong,
.total-row strong {
  color: #1a2746;
  font-weight: 850;
}

.health-list em,
.station-list em {
  color: #53617e;
  font-style: normal;
}

.total-row {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
}

.station-meter {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: #e6edf5;
}

.station-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #1f6fe5;
}

.valuation-note {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #cbd5e1;
}

.inventory-note {
  font-size: 0.82rem;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px;
}

.mini-grid--five {
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
}

.mini-card {
  min-height: 86px;
  padding: 12px;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  background: #ffffff;
  overflow-wrap: normal;
}

.mini-card strong {
  display: block;
  margin-bottom: 6px;
  color: #07122c;
  font-size: 1.35rem;
  line-height: 1;
}

.empty-cell {
  padding: 28px !important;
  color: #64748b;
  text-align: center;
}

@media (max-width: 1260px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-grid,
  .two-column {
    grid-template-columns: 1fr;
  }

  .mini-grid,
  .mini-grid--five {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .kpi-grid,
  .mini-grid,
  .mini-grid--five {
    grid-template-columns: 1fr;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .compact-table :deep(table) {
    min-width: 860px;
  }

  .valuation-note {
    grid-template-columns: 1fr auto;
  }
}
</style>
