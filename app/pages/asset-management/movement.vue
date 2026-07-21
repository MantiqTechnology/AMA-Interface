<script setup lang="ts">
import { movements, assets, locations, formatDate } from '../../data/assetManagementData';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

definePageMeta({ layout: 'default' });

const search = ref('');
const fromFilter = ref('All Locations');
const toFilter = ref('All Locations');
const dateFrom = ref('');
const dateTo = ref('');

const headers = [
  { title: 'Movement ID', key: 'movementId' },
  { title: 'Asset', key: 'assetName' },
  { title: 'From Location', key: 'fromLocation' },
  { title: 'To Location', key: 'toLocation' },
  { title: 'Requested By', key: 'requestedBy' },
  { title: 'Approved By', key: 'approvedBy' },
  { title: 'Movement Date', key: 'movementDate' },
  { title: 'Status', key: 'status' }
];

// ---- data lokal (demo only, tanpa backend) ----
const localMovements = ref([...movements]);

const filtered = computed(() =>
  localMovements.value.filter((m) => {
    const matchesSearch =
      !search.value ||
      m.assetName.toLowerCase().includes(search.value.toLowerCase()) ||
      m.assetCode.toLowerCase().includes(search.value.toLowerCase());
    const matchesFrom =
      fromFilter.value === 'All Locations' ||
      m.fromLocation.includes(fromFilter.value.split(' - ')[0]);
    const matchesTo =
      toFilter.value === 'All Locations' || m.toLocation.includes(toFilter.value.split(' - ')[0]);
    const matchesDateFrom = !dateFrom.value || m.movementDate >= dateFrom.value;
    const matchesDateTo = !dateTo.value || m.movementDate <= dateTo.value;
    return matchesSearch && matchesFrom && matchesTo && matchesDateFrom && matchesDateTo;
  })
);

// ---- modal "New Movement" ----
const dialogOpen = ref(false);
const formRef = ref();

const assetOptions = computed(() =>
  assets.map((a) => ({ title: `${a.code} - ${a.name}`, value: a.code }))
);

const defaultForm = () => ({
  assetCode: null as string | null,
  fromLocation: null as string | null,
  toLocation: null as string | null,
  requestedBy: '',
  approvedBy: '',
  movementDate: '2026-07-21'
});

const form = ref(defaultForm());

const rules = {
  required: (v: unknown) => (v !== null && v !== '' && v !== undefined) || 'Wajib diisi'
};

function openDialog() {
  form.value = defaultForm();
  dialogOpen.value = true;
}

async function submitForm() {
  const { valid } = await formRef.value?.validate();
  if (!valid) return;

  const asset = assets.find((a) => a.code === form.value.assetCode);
  const nextId = `MOV-${3000 + localMovements.value.length + 1}`;

  localMovements.value.unshift({
    movementId: nextId,
    assetCode: form.value.assetCode ?? '',
    assetName: asset?.name ?? '',
    fromLocation: form.value.fromLocation ?? '',
    toLocation: form.value.toLocation ?? '',
    requestedBy: form.value.requestedBy,
    approvedBy: form.value.approvedBy || '-',
    movementDate: form.value.movementDate,
    status: 'Requested'
  });

  dialogOpen.value = false;
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Movement</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Transfer of assets between locations and departments.
        </p>
      </div>
      <VBtn color="primary" prepend-icon="mdi-swap-horizontal" rounded="lg" @click="openDialog">
        New Movement
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
          v-model="fromFilter"
          :items="['All Locations', ...locations]"
          label="From Location"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
        <VSelect
          v-model="toFilter"
          :items="['All Locations', ...locations]"
          label="To Location"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
        <VTextField
          v-model="dateFrom"
          type="date"
          label="Date From"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 170px"
        />
        <VTextField
          v-model="dateTo"
          type="date"
          label="Date To"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 170px"
        />
      </div>
    </VCard>

    <VCard border rounded="lg" elevation="0">
      <VDataTable
        :headers="headers"
        :items="filtered"
        item-value="movementId"
        :items-per-page="10"
        density="comfortable"
      >
        <template #[`item.assetName`]="{ item }">
          <div class="font-weight-medium">{{ item.assetCode }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.assetName }}</div>
        </template>
        <template #[`item.movementDate`]="{ item }">{{ formatDate(item.movementDate) }}</template>
        <template #[`item.status`]="{ item }"><StatusChip :status="item.status" /></template>
      </VDataTable>
    </VCard>

    <!-- Modal: New Movement -->
    <VDialog v-model="dialogOpen" max-width="600">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">New Movement</span>
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
                  v-model="form.fromLocation"
                  :items="locations"
                  label="From Location"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.toLocation"
                  :items="locations"
                  label="To Location"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.requestedBy"
                  label="Requested By"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.approvedBy"
                  label="Approved By (optional)"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.movementDate"
                  type="date"
                  label="Movement Date"
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
