<script setup lang="ts">
import { assignments, assets, departments, formatDate } from '../../data/assetManagementData';
import StatusChip from '../../components/feature/asset-management/StatusChip.vue';

definePageMeta({ layout: 'default' });

const search = ref('');
const departmentFilter = ref('All Departments');
const statusFilter = ref('All Status');

const statuses = ['Assigned', 'Returned', 'Overdue'];
const conditions = ['Good', 'Fair', 'Damaged'];

const headers = [
  { title: 'Assignment ID', key: 'assignmentId' },
  { title: 'Asset', key: 'assetName' },
  { title: 'Assigned To', key: 'assignedTo' },
  { title: 'Department', key: 'department' },
  { title: 'Assignment Date', key: 'assignmentDate' },
  { title: 'Return Date', key: 'returnDate' },
  { title: 'Status', key: 'status' },
  { title: 'Condition', key: 'condition' }
];

// ---- data lokal (demo only, tanpa backend) ----
const localAssignments = ref([...assignments]);

const filtered = computed(() =>
  localAssignments.value.filter((a) => {
    const matchesSearch =
      !search.value ||
      a.assetName.toLowerCase().includes(search.value.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(search.value.toLowerCase()) ||
      a.assignedTo.toLowerCase().includes(search.value.toLowerCase());
    const matchesDept =
      departmentFilter.value === 'All Departments' || a.department === departmentFilter.value;
    const matchesStatus = statusFilter.value === 'All Status' || a.status === statusFilter.value;
    return matchesSearch && matchesDept && matchesStatus;
  })
);

// ---- modal "Assign Asset" ----
const dialogOpen = ref(false);
const formRef = ref();

const assetOptions = computed(() =>
  assets.map((a) => ({ title: `${a.code} - ${a.name}`, value: a.code }))
);

const defaultForm = () => ({
  assetCode: null as string | null,
  assignedTo: '',
  department: null as string | null,
  assignmentDate: '2026-07-21',
  condition: 'Good' as string
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
  const nextId = `ASG-${1000 + localAssignments.value.length + 1}`;

  localAssignments.value.unshift({
    assignmentId: nextId,
    assetCode: form.value.assetCode ?? '',
    assetName: asset?.name ?? '',
    assignedTo: form.value.assignedTo,
    department: form.value.department ?? '',
    assignmentDate: form.value.assignmentDate,
    returnDate: null,
    status: 'Assigned',
    condition: form.value.condition as 'Good' | 'Fair' | 'Damaged'
  });

  dialogOpen.value = false;
}
</script>

<template>
  <div class="page-wrap">
    <div class="d-flex align-start justify-space-between flex-wrap mb-1" style="gap: 12px">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Asset Assignment</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Track asset handover to users or departments.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="mdi-account-arrow-right-outline"
        rounded="lg"
        @click="openDialog"
      >
        Assign Asset
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
          v-model="departmentFilter"
          :items="['All Departments', ...departments]"
          label="Department"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
        <VSelect
          v-model="statusFilter"
          :items="['All Status', ...statuses]"
          label="Status"
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
        item-value="assignmentId"
        :items-per-page="10"
        density="comfortable"
      >
        <template #[`item.assetName`]="{ item }">
          <div class="font-weight-medium">{{ item.assetCode }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.assetName }}</div>
        </template>
        <template #[`item.assignmentDate`]="{ item }">
          {{
            formatDate(item.assignmentDate)
          }}
        </template>
        <template #[`item.returnDate`]="{ item }">
          {{
            item.returnDate ? formatDate(item.returnDate) : '-'
          }}
        </template>
        <template #[`item.status`]="{ item }"><StatusChip :status="item.status" /></template>
        <template #[`item.condition`]="{ item }"><StatusChip :status="item.condition" /></template>
      </VDataTable>
    </VCard>

    <!-- Modal: Assign Asset -->
    <VDialog v-model="dialogOpen" max-width="560">
      <VCard rounded="lg">
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span class="text-h6 font-weight-bold">Assign Asset</span>
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
                <VTextField
                  v-model="form.assignedTo"
                  label="Assigned To"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.department"
                  :items="departments"
                  label="Department"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="form.assignmentDate"
                  type="date"
                  label="Assignment Date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.condition"
                  :items="conditions"
                  label="Condition"
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
