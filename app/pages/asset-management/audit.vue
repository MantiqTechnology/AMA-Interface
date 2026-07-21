<script setup lang="ts">
import { audits, assets, locations, formatDate } from '../../data/assetManagementData';
import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

definePageMeta({ layout: 'default' });

const search = ref('');
const auditPeriod = ref('Q3 2026');
const locationFilter = ref('All Locations');

const headers = [
  { title: 'Audit ID', key: 'auditId' },
  { title: 'Asset Code', key: 'assetCode' },
  { title: 'Asset Name', key: 'assetName' },
  { title: 'Location', key: 'location' },
  { title: 'Physical Status', key: 'physicalStatus' },
  { title: 'System Status', key: 'systemStatus' },
  { title: 'Auditor', key: 'auditor' },
  { title: 'Audit Date', key: 'auditDate' }
];

const physicalStatuses = ['Match', 'Missing', 'Damaged', 'Needs Verification'];

// ---- data lokal (demo only, tanpa backend) ----
const localAudits = ref([...audits]);

const filtered = computed(() =>
  localAudits.value.filter((a) => {
    const matchesSearch =
      !search.value ||
      a.assetName.toLowerCase().includes(search.value.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(search.value.toLowerCase());
    const matchesLocation =
      locationFilter.value === 'All Locations' || a.location === locationFilter.value;
    return matchesSearch && matchesLocation;
  })
);

const totalChecked = computed(() => localAudits.value.length);
const missingCount = computed(
  () => localAudits.value.filter((a) => a.physicalStatus === 'Missing').length
);
const damagedCount = computed(
  () => localAudits.value.filter((a) => a.physicalStatus === 'Damaged').length
);
const auditProgress = computed(() => Math.round((localAudits.value.length / assets.length) * 100));

// ---- modal "Start Audit" ----
const dialogOpen = ref(false);
const formRef = ref();

const assetOptions = computed(() =>
  assets.map((a) => ({ title: `${a.code} - ${a.name}`, value: a.code }))
);

const defaultForm = () => ({
  assetCode: null as string | null,
  physicalStatus: 'Match' as string,
  auditor: '',
  auditDate: '2026-07-21'
});

const form = ref(defaultForm());

const rules = {
  required: (v: unknown) => (v !== null && v !== '' && v !== undefined) || 'Wajib diisi'
};

function startAudit() {
  form.value = defaultForm();
  dialogOpen.value = true;
}

async function submitForm() {
  const { valid } = await formRef.value?.validate();
  if (!valid) return;

  const asset = assets.find((a) => a.code === form.value.assetCode);
  const nextId = `AUD-${String(1000 + localAudits.value.length + 1).padStart(4, '0')}`;

  localAudits.value.unshift({
    auditId: nextId,
    assetCode: form.value.assetCode ?? '',
    assetName: asset?.name ?? '',
    location: asset?.location ?? '-',
    physicalStatus: form.value.physicalStatus as
      'Match' | 'Missing' | 'Damaged' | 'Needs Verification',
    systemStatus: asset?.status ?? 'Active',
    auditor: form.value.auditor,
    auditDate: form.value.auditDate
  });

  dialogOpen.value = false;
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Audit</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Physical verification against system records.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="mdi-clipboard-check-outline"
        rounded="lg"
        @click="startAudit"
      >
        Start Audit
      </VBtn>
    </div>

    <VCard border rounded="lg" elevation="0" class="pa-4 mt-4 mb-6">
      <div class="d-flex align-end flex-wrap" style="gap: 16px">
        <VTextField
          v-model="search"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 260px"
        />
        <VSelect
          v-model="auditPeriod"
          :items="['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']"
          label="Audit Period"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
        <VSelect
          v-model="locationFilter"
          :items="['All Locations', ...locations]"
          label="Location"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
      </div>
    </VCard>

    <VRow class="mb-2">
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Total Checked"
          :value="String(totalChecked)"
          icon="mdi-clipboard-list-outline"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Missing Assets"
          :value="String(missingCount)"
          icon="mdi-help-circle-outline"
          icon-color="#E5484D"
          icon-bg="#FDECEC"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Damaged Assets"
          :value="String(damagedCount)"
          icon="mdi-alert-outline"
          icon-color="#F5A623"
          icon-bg="#FEF3E2"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <VCard border rounded="lg" elevation="0" class="pa-4">
          <div class="d-flex align-start justify-space-between mb-2">
            <span class="text-body-2 text-medium-emphasis">Audit Progress</span>
            <VIcon icon="mdi-progress-check" color="#22B07D" size="20" />
          </div>
          <div class="text-h5 font-weight-bold mb-2">{{ auditProgress }}%</div>
          <VProgressLinear :model-value="auditProgress" color="success" height="8" rounded />
        </VCard>
      </VCol>
    </VRow>

    <VCard border rounded="lg" elevation="0">
      <VDataTable
        :headers="headers"
        :items="filtered"
        item-value="auditId"
        :items-per-page="10"
        density="comfortable"
      >
        <template #[`item.auditDate`]="{ item }">{{ formatDate(item.auditDate) }}</template>
        <template #[`item.physicalStatus`]="{ item }">
          <StatusChip :status="item.physicalStatus" />
        </template>
        <template #[`item.systemStatus`]="{ item }">
          <StatusChip :status="item.systemStatus" />
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal: Start Audit -->
    <VDialog v-model="dialogOpen" max-width="560">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Start Audit</span>
          <VBtn icon="mdi-close" variant="text" density="comfortable" @click="dialogOpen = false" />
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VForm ref="formRef">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="form.assetCode"
                  :items="assetOptions"
                  label="Asset"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.physicalStatus"
                  :items="physicalStatuses"
                  label="Physical Status"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.auditor"
                  label="Auditor"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="form.auditDate"
                  type="date"
                  label="Audit Date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="dialogOpen = false">Cancel</VBtn>
          <VBtn color="primary" @click="submitForm">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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
