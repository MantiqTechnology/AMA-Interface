<script setup lang="ts">
import { useCrmDummyData } from '../../composables/useCrmDummyData';

definePageMeta({ layout: 'default' });

const {
  overviewKpis,
  leadsBySector,
  tenderStatusBreakdown,
  salesPipeline,
  opportunityByMonth,
  recentLeads,
  upcomingActivities,
  tenderDeadlines,
  topOpportunities
} = useCrmDummyData();

const dateRange = ref('01 – 07 Jul 2026');
const sectorFilter = ref('All');
const salesOwnerFilter = ref('All');

const sectorOptions = ['All', 'Government', 'Church', 'Commercial'];
const salesOwnerOptions = ['All', 'Rangga Wibowo', 'Dewi Lestari', 'Yoga Permana', 'Teguh Prabowo'];

const lastUpdated = '07 Jul 2026 09:41 WIB';

function statusColor(status: string) {
  const map: Record<string, string> = {
    New: 'primary',
    Contacted: 'warning',
    Qualified: 'success',
    Lost: 'error',
    Open: 'success',
    Preparing: 'warning',
    Scheduled: 'primary'
  };
  return map[status] || 'default';
}

function handleExport() {
  // demo only — no real export
}

const leadColumns = [
  { title: 'Lead Name', key: 'name' },
  { title: 'Sector', key: 'sector' },
  { title: 'Source', key: 'source' },
  { title: 'Date', key: 'date' },
  { title: 'Status', key: 'status' }
];

const activityColumns = [
  { title: 'Activity', key: 'activity' },
  { title: 'Customer / PIC', key: 'customer' },
  { title: 'Schedule', key: 'schedule' },
  { title: 'Status', key: 'status' }
];

const tenderColumns = [
  { title: 'Tender Name', key: 'name' },
  { title: 'Organization', key: 'organization' },
  { title: 'Deadline', key: 'deadline' },
  { title: 'Status', key: 'status' }
];

const oppColumns = [
  { title: 'Opportunity', key: 'name' },
  { title: 'Customer', key: 'customer' },
  { title: 'Est. Value', key: 'value' },
  { title: 'Stage', key: 'stage' }
];
</script>

<template>
  <div class="crm-overview">
    <CrmPageHeader
      style="margin-top: 14px"
      title="CRM & Marketing Overview"
      description="Real-time overview of your CRM and marketing performance."
      :last-updated="lastUpdated"
      @export="handleExport"
    />

    <CrmSubNav />

    <!-- Filters -->
    <VCard class="filter-card mb-4" variant="flat" border>
      <VCardText class="d-flex flex-wrap ga-2 align-center pa-2">
        <VTextField
          v-model="dateRange"
          label="Date Range"
          prepend-inner-icon="mdi-calendar-range"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 220px"
          readonly
        />
        <VSelect
          v-model="sectorFilter"
          :items="sectorOptions"
          label="Sector"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VSelect
          v-model="salesOwnerFilter"
          :items="salesOwnerOptions"
          label="Sales Owner"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />

        <VSpacer />

        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-tray-arrow-down"
          @click="handleExport"
        >
          Export CSV
        </VBtn>
      </VCardText>
    </VCard>

    <!-- KPI Cards -->
    <VRow class="mb-2">
      <VCol v-for="kpi in overviewKpis" :key="kpi.key" cols="12" md="6" lg="2" class="d-flex">
        <VCard class="kpi-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="d-flex justify-space-between align-start mb-2">
              <span class="kpi-label">{{ kpi.label }}</span>
              <div
                class="kpi-icon flex-shrink-0"
                :style="{ backgroundColor: kpi.bg, color: kpi.color }"
              >
                <VIcon :icon="kpi.icon" size="18" />
              </div>
            </div>
            <div class="kpi-value mt-auto">{{ kpi.value }}</div>
            <div class="kpi-trend" :class="kpi.trendUp ? 'text-success' : 'text-error'">
              <VIcon :icon="kpi.trendUp ? 'mdi-arrow-up' : 'mdi-arrow-down'" size="14" />
              {{ kpi.trend }} <span class="kpi-trend-sub">vs last week</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Charts Row -->
    <VRow class="mb-2">
      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="chart-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Leads by Sector</div>
            <CrmDonutChart :segments="leadsBySector" :total="312" total-label="Total" />
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/leads"
            >
              View all leads
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="chart-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Tender Status</div>
            <CrmDonutChart :segments="tenderStatusBreakdown" :total="24" total-label="Total" />
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/tender"
            >
              View all tender
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="chart-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-3">Sales Pipeline (Opportunities)</div>
            <CrmFunnelChart :stages="salesPipeline" />
            <VBtn
              variant="text"
              color="primary"
              class="mt-3 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/opportunities"
            >
              View all opportunities
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="chart-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Opportunity by Month</div>
            <CrmTrendLineChart :points="opportunityByMonth" />
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/opportunities"
            >
              View monthly report
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Tables Row -->
    <VRow>
      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="table-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Recent Leads</div>
            <VDataTable
              :headers="leadColumns"
              :items="recentLeads"
              density="comfortable"
              hide-default-footer
              items-per-page="-1"
              class="mini-table"
            >
              <template #[`item.status`]="{ item }">
                <VChip size="small" :color="statusColor(item.status)" variant="tonal">
                  {{ item.status }}
                </VChip>
              </template>
            </VDataTable>
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/leads"
            >
              View all leads
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="table-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Upcoming Activities</div>
            <VDataTable
              :headers="activityColumns"
              :items="upcomingActivities"
              density="comfortable"
              hide-default-footer
              items-per-page="-1"
              class="mini-table"
            >
              <template #[`item.customer`]="{ item }">
                <div>{{ item.customer }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.pic }}</div>
              </template>
              <template #[`item.status`]="{ item }">
                <VChip size="small" :color="statusColor(item.status)" variant="tonal">
                  {{ item.status }}
                </VChip>
              </template>
            </VDataTable>
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/activities"
            >
              View all activities
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="table-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Tender Deadline (Next 30 Days)</div>
            <VDataTable
              :headers="tenderColumns"
              :items="tenderDeadlines"
              density="comfortable"
              hide-default-footer
              items-per-page="-1"
              class="mini-table"
            >
              <template #[`item.status`]="{ item }">
                <VChip size="small" :color="statusColor(item.status)" variant="tonal">
                  {{ item.status }}
                </VChip>
              </template>
            </VDataTable>
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/tender"
            >
              View all tender
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6" lg="3" class="d-flex">
        <VCard class="table-card d-flex flex-column w-100" variant="flat" border>
          <VCardText class="pa-4 d-flex flex-column flex-grow-1">
            <div class="chart-title mb-2">Top Opportunities</div>
            <VDataTable
              :headers="oppColumns"
              :items="topOpportunities"
              density="comfortable"
              hide-default-footer
              items-per-page="-1"
              class="mini-table"
            >
              <template #[`item.stage`]="{ item }">
                <VChip size="small" color="primary" variant="tonal">{{ item.stage }}</VChip>
              </template>
            </VDataTable>
            <VBtn
              variant="text"
              color="primary"
              class="mt-2 px-0 align-self-start mt-auto"
              append-icon="mdi-arrow-right"
              to="/crm-marketing/opportunities"
            >
              View all opportunities
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.crm-overview {
  /* top | right | bottom | left — beri jarak kiri-kanan supaya tidak mepet sidebar/tepi layar */
  padding: 8px 12px 10px;
}

@media (min-width: 1280px) {
  .crm-overview {
    padding: 8px 15px 10px;
  }
}

.filter-card,
.kpi-card,
.chart-card,
.table-card {
  border-radius: 14px !important;
  border-color: #e5e7eb !important;
}

.kpi-label {
  font-size: 12.5px;
  color: #6b7280;
}

.kpi-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.kpi-trend {
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
}

.kpi-trend-sub {
  color: #9ca3af;
  font-weight: 400;
  margin-left: 2px;
}

.chart-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #111827;
}

.mini-table :deep(table) {
  font-size: 12.5px;
}

.mini-table :deep(th) {
  font-size: 11.5px !important;
  text-transform: none;
  color: #6b7280 !important;
}
</style>
