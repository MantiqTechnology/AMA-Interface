<script setup lang="ts">
import { vendorPerformanceRows, suppliers } from '../../data/procurement';
import { statusColor, useProcurementSnackbar } from '../../composables/useProcurement';

definePageMeta({ title: 'Vendor Performance' });

const { notify } = useProcurementSnackbar();
const isRefreshing = ref(false);

const rows = vendorPerformanceRows;

const headers = [
  { title: 'Vendor', key: 'vendor' },
  { title: 'On-Time Delivery', key: 'onTimeDelivery' },
  { title: 'Lead Time', key: 'leadTimeDays' },
  { title: 'Quality', key: 'quality' },
  { title: 'Price', key: 'price' },
  { title: 'Documents', key: 'documents' },
  { title: 'Overall Score', key: 'overallScore' },
  { title: 'AVL Status', key: 'avlStatus' }
];

const avgScore = Math.round(rows.reduce((sum, r) => sum + r.overallScore, 0) / rows.length);
const avgOnTime = Math.round(rows.reduce((sum, r) => sum + r.onTimeDelivery, 0) / rows.length);
const avgQuality = Math.round(rows.reduce((sum, r) => sum + r.quality, 0) / rows.length);
const avgDocuments = Math.round(rows.reduce((sum, r) => sum + r.documents, 0) / rows.length);
const claimRate = '2.4%';

const topPerformers = [...rows].sort((a, b) => b.overallScore - a.overallScore).slice(0, 3);
const needsAttention = [...rows].sort((a, b) => a.overallScore - b.overallScore).slice(0, 3);
const expiringCertificates = suppliers
  .filter((s) => s.avlStatus !== 'Suspended')
  .slice(0, 3)
  .map((s) => ({
    company: s.company,
    certificateName: s.certificateName,
    certificateExpiry: s.certificateExpiry
  }));

function scoreColor(score: number) {
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'amber-darken-2';
  return 'red';
}

async function refreshData() {
  isRefreshing.value = true;
  await new Promise((r) => setTimeout(r, 500));
  isRefreshing.value = false;
  notify('Vendor performance data refreshed.', 'info');
}
</script>

<template>
  <div class="proc-page">
    <ProcurementPageHeader
      eyebrow="Supplier Quality"
      title="Vendor Performance"
      subtitle="Monitor supplier delivery, quality, pricing, documentation, and AVL performance."
    >
      <template #actions>
        <VBtn
          variant="outlined"
          :loading="isRefreshing"
          prepend-icon="mdi-refresh"
          @click="refreshData"
        >
          Refresh
        </VBtn>
      </template>
    </ProcurementPageHeader>

    <ProcurementSubNav class="mt-5" />

    <VRow class="mt-4" dense>
      <VCol cols="6" sm="4" md="2.4">
        <ProcurementKpi
          :kpi="{
            id: 'a',
            label: 'Average Vendor Score',
            value: String(avgScore),
            icon: 'mdi-star-outline',
            iconColor: '#0F4C81'
          }"
        />
      </VCol>
      <VCol cols="6" sm="4" md="2.4">
        <ProcurementKpi
          :kpi="{
            id: 'b',
            label: 'On-Time Delivery',
            value: avgOnTime + '%',
            icon: 'mdi-truck-check-outline',
            iconColor: '#15803D'
          }"
        />
      </VCol>
      <VCol cols="6" sm="4" md="2.4">
        <ProcurementKpi
          :kpi="{
            id: 'c',
            label: 'Quality Acceptance',
            value: avgQuality + '%',
            icon: 'mdi-check-decagram-outline',
            iconColor: '#0E9F9A'
          }"
        />
      </VCol>
      <VCol cols="6" sm="4" md="2.4">
        <ProcurementKpi
          :kpi="{
            id: 'd',
            label: 'Document Compliance',
            value: avgDocuments + '%',
            icon: 'mdi-file-check-outline',
            iconColor: '#7C3AED'
          }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="2.4">
        <ProcurementKpi
          :kpi="{
            id: 'e',
            label: 'Claim Rate',
            value: claimRate,
            icon: 'mdi-alert-circle-outline',
            iconColor: '#DC2626'
          }"
        />
      </VCol>
    </VRow>

    <VCard border rounded="lg" class="mt-4">
      <VDataTable
        :headers="headers"
        :items="rows"
        item-value="vendorCode"
        :items-per-page="10"
        density="comfortable"
      >
        <template #item.onTimeDelivery="{ item }">
          <VProgressLinear
            :model-value="item.onTimeDelivery"
            height="6"
            rounded
            color="primary"
            style="max-width: 90px"
          />
        </template>
        <template #item.leadTimeDays="{ item }">{{ item.leadTimeDays }} days</template>
        <template #item.quality="{ item }">
          <VProgressLinear
            :model-value="item.quality"
            height="6"
            rounded
            color="teal"
            style="max-width: 90px"
          />
        </template>
        <template #item.price="{ item }">
          <VProgressLinear
            :model-value="item.price"
            height="6"
            rounded
            color="indigo"
            style="max-width: 90px"
          />
        </template>
        <template #item.documents="{ item }">
          <VProgressLinear
            :model-value="item.documents"
            height="6"
            rounded
            color="purple"
            style="max-width: 90px"
          />
        </template>
        <template #item.overallScore="{ item }">
          <VChip :color="scoreColor(item.overallScore)" size="small" variant="tonal">
            {{ item.overallScore }}/100
          </VChip>
        </template>
        <template #item.avlStatus="{ item }">
          <VChip :color="statusColor(item.avlStatus)" size="small" variant="tonal">
            {{ item.avlStatus }}
          </VChip>
        </template>
      </VDataTable>
    </VCard>

    <VRow class="mt-2" dense>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Top Performing Vendors</VCardTitle>
          </VCardItem>
          <VCardText>
            <div v-for="v in topPerformers" :key="v.vendorCode" class="mini-row">
              <span>{{ v.vendor }}</span>
              <VChip color="green" size="x-small" variant="tonal">{{ v.overallScore }}/100</VChip>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Vendors Requiring Attention</VCardTitle>
          </VCardItem>
          <VCardText>
            <div v-for="v in needsAttention" :key="v.vendorCode" class="mini-row">
              <span>{{ v.vendor }}</span>
              <VChip color="red" size="x-small" variant="tonal">{{ v.overallScore }}/100</VChip>
            </div>
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard border rounded="lg" class="h-100">
          <VCardItem>
            <VCardTitle class="section-title">Certificates Expiring Soon</VCardTitle>
          </VCardItem>
          <VCardText>
            <div
              v-for="c in expiringCertificates"
              :key="c.company"
              class="mini-row mini-row--stacked"
            >
              <span class="font-weight-medium">{{ c.company }}</span>
              <span class="text-caption text-medium-emphasis">{{ c.certificateName }} · exp. {{ c.certificateExpiry }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.proc-page {
  padding: 24px 20px 40px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.mini-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.mini-row:last-child {
  border-bottom: none;
}

.mini-row--stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
</style>
