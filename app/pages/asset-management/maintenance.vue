<script setup lang="ts">
import { maintenanceOrders, assets, formatDate } from '../../data/assetManagementData';
import KpiCard from '../../components/feature/asset-management/KpiCard.vue';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

definePageMeta({ layout: 'default' });

const search = ref('');
const typeFilter = ref('All Types');
const statusFilter = ref('All Status');
const priorityFilter = ref('All Priorities');

const types = ['Preventive', 'Corrective', 'Emergency'];
const statuses = ['Open', 'In Progress', 'Completed', 'Waiting Sparepart'];
const priorities = ['Low', 'Medium', 'High'];

const headers = [
  { title: 'Work Order', key: 'workOrder' },
  { title: 'Asset', key: 'assetName' },
  { title: 'Type', key: 'maintenanceType' },
  { title: 'Schedule Date', key: 'scheduleDate' },
  { title: 'Technician', key: 'technician' },
  { title: 'Estimated Cost', key: 'estimatedCost' },
  { title: 'Priority', key: 'priority' },
  { title: 'Status', key: 'status' }
];

// ---- data lokal (demo only, tanpa backend) ----
const localOrders = ref([...maintenanceOrders]);

const filtered = computed(() =>
  localOrders.value.filter((m) => {
    const matchesSearch =
      !search.value ||
      m.assetName.toLowerCase().includes(search.value.toLowerCase()) ||
      m.assetCode.toLowerCase().includes(search.value.toLowerCase()) ||
      m.workOrder.toLowerCase().includes(search.value.toLowerCase());
    const matchesType = typeFilter.value === 'All Types' || m.maintenanceType === typeFilter.value;
    const matchesStatus = statusFilter.value === 'All Status' || m.status === statusFilter.value;
    const matchesPriority =
      priorityFilter.value === 'All Priorities' || m.priority === priorityFilter.value;
    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  })
);

const openCount = computed(() => localOrders.value.filter((m) => m.status === 'Open').length);
const dueToday = computed(
  () => localOrders.value.filter((m) => m.scheduleDate === '2026-07-21').length
);
const completedThisMonth = computed(
  () =>
    localOrders.value.filter(
      (m) => m.status === 'Completed' && m.scheduleDate.startsWith('2026-06')
    ).length
);
const totalCost = computed(() => localOrders.value.reduce((sum, m) => sum + m.estimatedCost, 0));

function formatIdr(v: number) {
  return `IDR ${(v / 1_000_000).toFixed(1)} M`;
}

// ---- modal "Create Work Order" ----
const dialogOpen = ref(false);
const formRef = ref();

const assetOptions = computed(() =>
  assets.map((a) => ({ title: `${a.code} - ${a.name}`, value: a.code }))
);

const defaultForm = () => ({
  assetCode: null as string | null,
  maintenanceType: 'Preventive' as string,
  scheduleDate: '2026-07-21',
  technician: '',
  estimatedCost: null as number | null,
  priority: 'Medium' as string
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
  const nextId = `WO-2607-${String(100 + localOrders.value.length + 1).padStart(3, '0')}`;

  localOrders.value.unshift({
    workOrder: nextId,
    assetCode: form.value.assetCode ?? '',
    assetName: asset?.name ?? '',
    location: asset?.location ?? '-',
    maintenanceType: form.value.maintenanceType as 'Preventive' | 'Corrective' | 'Emergency',
    scheduleDate: form.value.scheduleDate,
    technician: form.value.technician,
    estimatedCost: Number(form.value.estimatedCost ?? 0),
    priority: form.value.priority as 'Low' | 'Medium' | 'High',
    status: 'Open'
  });

  dialogOpen.value = false;
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Maintenance</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Preventive, corrective, and emergency work orders.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="mdi-clipboard-plus-outline"
        rounded="lg"
        @click="openDialog"
      >
        Create Work Order
      </VBtn>
    </div>

    <VRow class="mt-4 mb-2">
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Open Work Order"
          :value="String(openCount)"
          icon="mdi-progress-wrench"
          icon-color="#3B5BFF"
          icon-bg="#EDF0FF"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Due Today"
          :value="String(dueToday)"
          icon="mdi-calendar-alert-outline"
          icon-color="#F5A623"
          icon-bg="#FEF3E2"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Completed This Month"
          :value="String(completedThisMonth)"
          icon="mdi-check-circle-outline"
          icon-color="#22B07D"
          icon-bg="#E7F8F1"
        />
      </VCol>
      <VCol cols="12" sm="6" md="3">
        <KpiCard
          label="Maintenance Cost"
          :value="formatIdr(totalCost)"
          icon="mdi-cash-multiple"
          icon-color="#E5484D"
          icon-bg="#FDECEC"
        />
      </VCol>
    </VRow>

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
          v-model="typeFilter"
          :items="['All Types', ...types]"
          label="Maintenance Type"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="statusFilter"
          :items="['All Status', ...statuses]"
          label="Status"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 200px"
        />
        <VSelect
          v-model="priorityFilter"
          :items="['All Priorities', ...priorities]"
          label="Priority"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
        />
      </div>
    </VCard>

    <VCard border rounded="lg" elevation="0">
      <VDataTable
        :headers="headers"
        :items="filtered"
        item-value="workOrder"
        :items-per-page="10"
        density="comfortable"
      >
        <template #[`item.assetName`]="{ item }">
          <div class="font-weight-medium">{{ item.assetCode }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.assetName }}</div>
        </template>
        <template #[`item.scheduleDate`]="{ item }">{{ formatDate(item.scheduleDate) }}</template>
        <template #[`item.estimatedCost`]="{ item }">{{ formatIdr(item.estimatedCost) }}</template>
        <template #[`item.priority`]="{ item }"><StatusChip :status="item.priority" /></template>
        <template #[`item.status`]="{ item }"><StatusChip :status="item.status" /></template>
      </VDataTable>
    </VCard>

    <!-- Modal: Create Work Order -->
    <VDialog v-model="dialogOpen" max-width="600">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Create Work Order</span>
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
                  v-model="form.maintenanceType"
                  :items="types"
                  label="Maintenance Type"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.scheduleDate"
                  type="date"
                  label="Schedule Date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.technician"
                  label="Technician"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.estimatedCost"
                  type="number"
                  label="Estimated Cost (IDR)"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.priority"
                  :items="priorities"
                  label="Priority"
                  variant="outlined"
                  density="compact"
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
