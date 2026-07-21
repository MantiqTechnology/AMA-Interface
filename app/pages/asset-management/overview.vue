<script setup lang="ts">
import {
  assets,
  locations,
  departments,
  maintenanceOrders,
  formatDate,
  daysUntil
} from '../../data/assetManagementData';

import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import DonutChart from '../../components/feature/asset-management/DonutChart.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

definePageMeta({ layout: 'default' });

const locationFilter = ref('All Locations');
const departmentFilter = ref('All Departments');
const asOfDate = ref('2026-07-21');

const locationOptions = ['All Locations', ...locations];
const departmentOptions = ['All Departments', ...departments];

const filteredAssets = computed(() =>
  assets.filter(
    (a) =>
      (locationFilter.value === 'All Locations' || a.location === locationFilter.value) &&
      (departmentFilter.value === 'All Departments' || a.department === departmentFilter.value)
  )
);

const totalAssets = computed(() => filteredAssets.value.length);
const activeAssets = computed(
  () => filteredAssets.value.filter((a) => a.status === 'Active').length
);
const underMaintenance = computed(
  () => filteredAssets.value.filter((a) => a.status === 'Maintenance').length
);
const expiringInsurance = computed(
  () =>
    filteredAssets.value.filter((a) => a.insurance && daysUntil(a.insurance.expiryDate) <= 30)
      .length
);
const totalAssetValue = computed(() =>
  filteredAssets.value.reduce((sum, a) => sum + a.purchaseValue, 0)
);
const monthlyDepreciation = computed(() =>
  filteredAssets.value.reduce((sum, a) => sum + a.monthlyDepreciation, 0)
);

function formatBillions(v: number) {
  return `IDR ${(v / 1_000_000_000).toFixed(2)} B`;
}

// ---- donut helpers: kelompokkan sisa kategori kecil jadi "Others" agar tidak terlalu ramai ----
function buildSegments(
  items: { label: string; value: number }[],
  colorMap: Record<string, string>,
  maxSlices = 6
) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1);
  const segments = top.map((s) => ({ ...s, color: colorMap[s.label] ?? '#9CA3AF' }));
  if (rest.length) {
    segments.push({
      label: 'Others',
      value: rest.reduce((sum, s) => sum + s.value, 0),
      color: '#D1D5DB'
    });
  }
  return segments;
}

const categoryColors: Record<string, string> = {
  Vehicle: '#3B5BFF',
  GSE: '#1F2E5C',
  'IT Equipment': '#22B07D',
  Building: '#F5A623',
  Machinery: '#E8583D',
  'Furniture & Fixture': '#8B5CF6'
};
const categorySegments = computed(() => {
  const map = new Map<string, number>();
  filteredAssets.value.forEach((a) => map.set(a.category, (map.get(a.category) ?? 0) + 1));
  const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  return buildSegments(items, categoryColors);
});

const locationColors: Record<string, string> = {
  'DJJ - Jakarta (HLP)': '#3B5BFF',
  'SUB - Surabaya (WARR)': '#1F2E5C',
  'UPG - Ujung Pandang': '#22B07D',
  'BPN - Balikpapan': '#F5A623',
  'DPS - Denpasar': '#E8583D',
  'PKU - Pekanbaru': '#8B5CF6'
};
function shortLocationLabel(label: string) {
  return label.split(' - ')[0] + ' - ' + label.split(' - ')[1]?.split(' (')[0];
}
const locationSegments = computed(() => {
  const map = new Map<string, number>();
  filteredAssets.value.forEach((a) => map.set(a.location, (map.get(a.location) ?? 0) + 1));
  const items = Array.from(map.entries()).map(([label, value]) => ({
    label: shortLocationLabel(label),
    value
  }));
  const colorsByShortLabel = Object.fromEntries(
    Object.entries(locationColors).map(([k, v]) => [shortLocationLabel(k), v])
  );
  return buildSegments(items, colorsByShortLabel);
});

const statusColors: Record<string, string> = {
  Active: '#22B07D',
  Maintenance: '#F5A623',
  Idle: '#9CA3AF',
  Disposed: '#E5484D'
};
const statusSegments = computed(() => {
  const map = new Map<string, number>();
  filteredAssets.value.forEach((a) => map.set(a.status, (map.get(a.status) ?? 0) + 1));
  const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  return buildSegments(items, statusColors, 4);
});

const upcomingMaintenance = computed(() =>
  [...maintenanceOrders]
    .filter((m) => m.status === 'Open' || m.status === 'In Progress')
    .sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate))
    .slice(0, 5)
    .map((m) => {
      const asset = assets.find((a) => a.code === m.assetCode);
      return { ...m, location: asset?.location ?? '-' };
    })
);

const insuranceExpiry = computed(() =>
  assets
    .filter((a) => a.insurance)
    .map((a) => ({ ...a, remainingDays: daysUntil(a.insurance!.expiryDate) }))
    .filter((a) => a.remainingDays <= 30)
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, 5)
);

const recentMovements = [
  {
    assetCode: 'IT-00123',
    assetName: 'Laptop Dell Latitude 5440',
    from: 'IT Department',
    to: 'Finance Dept',
    date: '2026-07-07'
  },
  {
    assetCode: 'VEH-00045',
    assetName: 'Toyota Innova B 1111 AA',
    from: 'GA Office',
    to: 'Ops Dept',
    date: '2026-07-06'
  },
  {
    assetCode: 'GSE-00032',
    assetName: 'GPU Unit 05',
    from: 'SUB - Surabaya',
    to: 'DJJ - Jakarta',
    date: '2026-07-06'
  },
  {
    assetCode: 'MCH-00021',
    assetName: 'Compressor Atlas Copco',
    from: 'Workshop',
    to: 'UPG - Makassar',
    date: '2026-07-05'
  },
  {
    assetCode: 'FUR-00077',
    assetName: 'Office Chair Ergo 01 (Set)',
    from: 'Storage',
    to: 'HR Department',
    date: '2026-07-05'
  }
];

function refresh() {
  // demo only - no backend call
}
function exportCsv() {
  // demo only - no backend call
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Management Overview</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Real-time overview of your company assets.
        </p>
      </div>
    </div>

    <VCard border rounded="lg" elevation="0" class="pa-4 mt-4 mb-4">
      <div class="d-flex align-end flex-wrap" style="gap: 16px">
        <VSelect
          v-model="locationFilter"
          :items="locationOptions"
          label="Location"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
        <VTextField
          v-model="asOfDate"
          type="date"
          label="As of Date"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VBtn variant="outlined" color="default" prepend-icon="mdi-refresh" @click="refresh">
          Refresh
        </VBtn>
        <VBtn
          variant="outlined"
          color="default"
          prepend-icon="mdi-tray-arrow-down"
          @click="exportCsv"
        >
          Export CSV
        </VBtn>
        <VSelect
          v-model="departmentFilter"
          :items="departmentOptions"
          label="Department"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px; margin-left: auto"
        />
      </div>
    </VCard>

    <VRow class="mb-2">
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Total Assets"
          :value="totalAssets.toLocaleString('id-ID')"
          icon="mdi-briefcase-variant-outline"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
          trend-value="4%"
          trend-up
        />
      </VCol>
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Active Assets"
          :value="activeAssets.toLocaleString('id-ID')"
          icon="mdi-check-circle-outline"
          icon-color="#22B07D"
          icon-bg="#E7F8F1"
          trend-value="3%"
          trend-up
        />
      </VCol>
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Under Maintenance"
          :value="underMaintenance.toLocaleString('id-ID')"
          icon="mdi-wrench-outline"
          icon-color="#F5A623"
          icon-bg="#FEF3E2"
          trend-value="12%"
          trend-up
        />
      </VCol>
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Expiring Insurance"
          :value="expiringInsurance.toLocaleString('id-ID')"
          icon="mdi-shield-alert-outline"
          icon-color="#E5484D"
          icon-bg="#FDECEC"
          trend-value="7%"
        />
      </VCol>
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Total Asset Value"
          :value="formatBillions(totalAssetValue)"
          icon="mdi-briefcase-outline"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
          trend-value="5%"
          trend-up
        />
      </VCol>
      <VCol cols="4" sm="2" md="2" lg="2">
        <KpiCard
          label="Depreciation (MTD)"
          :value="formatBillions(monthlyDepreciation)"
          icon="mdi-chart-line"
          icon-color="#22B07D"
          icon-bg="#E7F8F1"
          trend-value="6%"
          trend-up
        />
      </VCol>
    </VRow>

    <VRow class="mb-2">
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">Assets by Category</div>
          <DonutChart :segments="categorySegments" :total="totalAssets" />
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-4 px-0"
            append-icon="mdi-arrow-right"
          >
            View all categories
          </VBtn>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">Assets by Location</div>
          <DonutChart :segments="locationSegments" :total="totalAssets" />
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-4 px-0"
            append-icon="mdi-arrow-right"
          >
            View all locations
          </VBtn>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold mb-4">Asset Status</div>
          <DonutChart :segments="statusSegments" :total="totalAssets" />
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-4 px-0"
            append-icon="mdi-arrow-right"
          >
            View all assets
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold">Upcoming Maintenance</div>
          <div class="text-caption text-medium-emphasis mb-3">Next 7 days</div>
          <VTable density="compact">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in upcomingMaintenance" :key="m.workOrder">
                <td>
                  <div class="font-weight-medium">{{ m.assetCode }}</div>
                  <div class="text-caption text-medium-emphasis">{{ m.assetName }}</div>
                </td>
                <td class="text-caption">{{ m.maintenanceType }}</td>
                <td class="text-caption">{{ formatDate(m.scheduleDate) }}</td>
                <td><StatusChip :status="m.priority" /></td>
                <td><StatusChip :status="m.status === 'Open' ? 'Scheduled' : m.status" /></td>
              </tr>
            </tbody>
          </VTable>
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-2 px-0"
            append-icon="mdi-arrow-right"
            to="/asset-management/maintenance"
          >
            View all maintenance
          </VBtn>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold">Insurance Expiry</div>
          <div class="text-caption text-medium-emphasis mb-3">Expiring within 30 days</div>
          <VTable density="compact">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Expiry</th>
                <th>Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in insuranceExpiry" :key="a.code">
                <td>
                  <div class="font-weight-medium">{{ a.code }}</div>
                  <div class="text-caption text-medium-emphasis">{{ a.insurance!.company }}</div>
                </td>
                <td class="text-caption">{{ formatDate(a.insurance!.expiryDate) }}</td>
                <td class="text-caption">{{ a.remainingDays }}d</td>
                <td><StatusChip status="Expiring Soon" /></td>
              </tr>
            </tbody>
          </VTable>
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-2 px-0"
            append-icon="mdi-arrow-right"
            to="/asset-management/finance"
          >
            View all insurance
          </VBtn>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" elevation="0" class="pa-4" height="100%">
          <div class="text-subtitle-1 font-weight-bold">Recent Asset Movements</div>
          <div class="text-caption text-medium-emphasis mb-3">Latest 5 movements</div>
          <VTable density="compact">
            <thead>
              <tr>
                <th>Asset</th>
                <th>From &rarr; To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in recentMovements" :key="m.assetCode + m.date">
                <td>
                  <div class="font-weight-medium">{{ m.assetCode }}</div>
                  <div class="text-caption text-medium-emphasis">{{ m.assetName }}</div>
                </td>
                <td class="text-caption">{{ m.from }} &rarr; {{ m.to }}</td>
                <td class="text-caption">{{ formatDate(m.date) }}</td>
              </tr>
            </tbody>
          </VTable>
          <VBtn
            variant="text"
            color="primary"
            size="small"
            class="mt-2 px-0"
            append-icon="mdi-arrow-right"
            to="/asset-management/movement"
          >
            View all movements
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <p class="text-caption text-medium-emphasis mt-6 mb-0">
      All values are based on selected filters and as of date.
    </p>
  </div>
</template>

<style scoped>
.page-wrap {
  padding: 20px 12px;
}
@media (max-width: 960px) {
  .page-wrap {
    padding: 12px;
  }
}
</style>
