<script setup lang="ts">
const searchQuery = ref('');
const selectedStatus = ref<string>('ALL');
const selectedRunType = ref<string>('ALL');

const { data: runsData, refresh } = await useAsyncData(
  'payroll-runs',
  () => {
    const params = new URLSearchParams();
    if (searchQuery.value) params.set('search', searchQuery.value);
    if (selectedStatus.value !== 'ALL') params.set('status', selectedStatus.value);
    if (selectedRunType.value !== 'ALL') params.set('runType', selectedRunType.value);
    return fetchApi<any[]>(`/api/hris/payroll/runs?${params.toString()}`);
  },
  { watch: [searchQuery, selectedStatus, selectedRunType] }
);

const { data: employeesData } = await useAsyncData('payroll-employees-list', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);

const { data: departmentsData } = await useAsyncData('payroll-departments-list', () =>
  fetchApi<any[]>('/api/hris/departments')
);

const runs = computed(() =>
  Array.isArray(runsData.value) ? runsData.value : ((runsData.value as any)?.items ?? [])
);
const employeesList = computed(() =>
  Array.isArray(employeesData.value)
    ? employeesData.value
    : ((employeesData.value as any)?.items ?? [])
);
const departmentsList = computed(() =>
  Array.isArray(departmentsData.value)
    ? departmentsData.value
    : ((departmentsData.value as any)?.items ?? [])
);

const headers = [
  { title: 'Run Number', key: 'runNumber' },
  { title: 'Period & Type', key: 'period' },
  { title: 'Employee Count', key: 'employeeCount' },
  { title: 'Total Gross', key: 'totalGross' },
  { title: 'Total Deductions', key: 'totalDeductions' },
  { title: 'Total Net Salary', key: 'totalNet' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false }
];

// Create Run Dialog State
const createDialog = ref(false);
const newMonth = ref(new Date().getMonth() + 1);
const newYear = ref(new Date().getFullYear());
const runType = ref<'MONTHLY' | 'THR'>('MONTHLY');
const notes = ref('');
const creating = ref(false);

// Modal Employee & Department Selection State
const modalDepartmentFilter = ref<string>('ALL');
const modalEmployeeSearch = ref('');
const selectedEmployeeIds = ref<string[]>([]);

// Initialize all employees selected when dialog opens
watch(createDialog, (isOpen) => {
  if (isOpen) {
    selectedEmployeeIds.value = employeesList.value.map((e: any) => e.id);
    modalDepartmentFilter.value = 'ALL';
    modalEmployeeSearch.value = '';
  }
});

const filteredModalEmployees = computed(() => {
  return employeesList.value.filter((emp: any) => {
    const matchesDept =
      modalDepartmentFilter.value === 'ALL' ||
      emp.departmentId === modalDepartmentFilter.value ||
      emp.departmentName === modalDepartmentFilter.value;

    const query = modalEmployeeSearch.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.employeeCode?.toLowerCase().includes(query) ||
      emp.positionTitle?.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });
});

function toggleSelectAllFiltered() {
  const filteredIds: string[] = filteredModalEmployees.value.map((e: any) => e.id);
  const allSelected = filteredIds.every((id: string) => selectedEmployeeIds.value.includes(id));

  if (allSelected) {
    selectedEmployeeIds.value = selectedEmployeeIds.value.filter(
      (id: string) => !filteredIds.includes(id)
    );
  } else {
    const newSet = new Set<string>([...selectedEmployeeIds.value, ...filteredIds]);
    selectedEmployeeIds.value = Array.from(newSet);
  }
}

function deselectAll() {
  selectedEmployeeIds.value = [];
}

async function handleCreateRun() {
  if (selectedEmployeeIds.value.length === 0) {
    alert('Please select at least 1 employee to generate payroll.');
    return;
  }

  creating.value = true;
  try {
    await fetchApi('/api/hris/payroll/runs', {
      method: 'POST',
      body: {
        periodMonth: newMonth.value,
        periodYear: newYear.value,
        runType: runType.value,
        employeeIds: selectedEmployeeIds.value,
        notes: notes.value
      }
    });
    createDialog.value = false;
    refresh();
  } catch (err: any) {
    alert(err.message || 'Failed to generate & calculate payroll run.');
  } finally {
    creating.value = false;
  }
}

async function handleDeleteRun(run: any) {
  if (!confirm(`Are you sure you want to delete draft payroll run "${run.runNumber}"?`)) return;
  try {
    await fetchApi(`/api/hris/payroll/runs/${run.id}`, { method: 'DELETE' });
    refresh();
  } catch (err: any) {
    alert(err.message || 'Failed to delete payroll run.');
  }
}

function toggleEmployeeSelection(empId: string) {
  if (selectedEmployeeIds.value.includes(empId)) {
    selectedEmployeeIds.value = selectedEmployeeIds.value.filter((id) => id !== empId);
  } else {
    selectedEmployeeIds.value.push(empId);
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

function statusColor(s: string) {
  if (s === 'PAID') return 'success';
  if (s === 'APPROVED') return 'info';
  if (s === 'CALCULATED') return 'warning';
  if (s === 'DRAFT') return 'secondary';
  return 'error';
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Payroll & Salary Processing</h1>
        <p class="text-subtitle-1 text-secondary">
          Manage monthly salaries, THR, flight allowances, PPh 21 TER 2024, BPJS contributions, and
          draft adjustments
        </p>
      </div>
      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-cog-outline" variant="outlined" to="/hris/payroll/components">
          Allowance Rates & Components
        </VBtn>
        <VBtn prepend-icon="mdi-plus" color="primary" @click="createDialog = true">
          Generate New Payroll Period
        </VBtn>
      </div>
    </div>

    <!-- Filters & Search -->
    <VCard border class="mb-4 pa-4">
      <VRow density="compact" align="center">
        <VCol cols="12" md="4">
          <VTextField
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            label="Search Payroll Run..."
            placeholder="Search run number, notes..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="6" md="3">
          <VSelect
            v-model="selectedStatus"
            label="Status Filter"
            :items="[
              { title: 'All Statuses', value: 'ALL' },
              { title: 'Draft', value: 'DRAFT' },
              { title: 'Calculated', value: 'CALCULATED' },
              { title: 'Approved', value: 'APPROVED' },
              { title: 'Paid', value: 'PAID' }
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
        <VCol cols="6" md="3">
          <VSelect
            v-model="selectedRunType"
            label="Run Type Filter"
            :items="[
              { title: 'All Types', value: 'ALL' },
              { title: 'Monthly Salary', value: 'MONTHLY' },
              { title: 'THR (Tunjangan Hari Raya)', value: 'THR' }
            ]"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="2" class="text-right">
          <VBtn prepend-icon="mdi-refresh" variant="text" size="small" @click="refresh()">
            Refresh
          </VBtn>
        </VCol>
      </VRow>
    </VCard>

    <VCard border>
      <VDataTable :headers="headers" :items="runs">
        <template #item.runNumber="{ item }">
          <div>
            <span class="font-mono font-weight-bold text-primary">{{ item.runNumber }}</span>
            <div class="text-caption text-secondary">{{ item.runDate }}</div>
          </div>
        </template>

        <template #item.period="{ item }">
          <div class="d-flex align-center ga-2">
            <span class="font-weight-bold">{{ item.periodMonth }} / {{ item.periodYear }}</span>
            <VChip
              size="x-small"
              :color="item.runType === 'THR' ? 'purple' : 'primary'"
              variant="tonal"
            >
              {{ item.runType }}
            </VChip>
          </div>
        </template>

        <template #item.employeeCount="{ item }">
          <span>{{ item.employeeCount }} Employees</span>
        </template>

        <template #item.totalGross="{ item }">
          {{ formatCurrency(item.totalGross) }}
        </template>

        <template #item.totalDeductions="{ item }">
          <span class="text-error">{{ formatCurrency(item.totalDeductions) }}</span>
        </template>

        <template #item.totalNet="{ item }">
          <span class="font-weight-bold text-success">{{ formatCurrency(item.totalNet) }}</span>
        </template>

        <template #item.status="{ item }">
          <VChip :color="statusColor(item.status)" size="small" variant="flat">
            {{ item.status }}
          </VChip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              size="small"
              variant="text"
              icon="mdi-eye-outline"
              :to="`/hris/payroll/${item.id}`"
            />
            <VBtn
              v-if="item.status === 'DRAFT' || item.status === 'CALCULATED'"
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete-outline"
              @click="handleDeleteRun(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Generate Run Dialog -->
    <VDialog v-model="createDialog" max-width="750" scrollable>
      <VCard>
        <VCardTitle class="pa-4 font-weight-bold text-h6 d-flex align-center justify-space-between">
          <div>
            <span>Generate & Calculate Payroll Run</span>
            <div class="text-caption text-secondary font-weight-regular mt-1">
              Select department and employees to be included in this payroll run
            </div>
          </div>
          <VChip color="primary" variant="flat" size="medium">
            {{ selectedEmployeeIds.length }} / {{ employeesList.length }} Selected
          </VChip>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-4">
          <!-- Step 1: Run Configuration -->
          <VRow class="mb-2">
            <VCol cols="12" sm="6">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">PAYROLL TYPE</label>
              <VBtnToggle
                v-model="runType"
                mandatory
                color="primary"
                variant="outlined"
                density="comfortable"
                class="w-100"
              >
                <VBtn value="MONTHLY" class="flex-grow-1">Monthly Salary</VBtn>
                <VBtn value="THR" class="flex-grow-1">THR (Tunjangan Hari Raya)</VBtn>
              </VBtnToggle>
            </VCol>
            <VCol cols="6" sm="3">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">PERIOD MONTH</label>
              <VSelect
                v-model="newMonth"
                :items="[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="6" sm="3">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">PERIOD YEAR</label>
              <VTextField
                v-model="newYear"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <!-- Step 2: Department & Employee Filtering -->
          <div class="d-flex align-center justify-space-between mb-3 ga-2 flex-wrap">
            <div class="d-flex ga-2 align-center flex-grow-1" style="max-width: 480px">
              <VSelect
                v-model="modalDepartmentFilter"
                label="Department Filter"
                :items="[
                  { title: 'All Departments', value: 'ALL' },
                  ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
                ]"
                variant="outlined"
                density="compact"
                hide-details
                style="min-width: 200px"
              />
              <VTextField
                v-model="modalEmployeeSearch"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search staff name / code..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </div>

            <div class="d-flex ga-2">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                @click="toggleSelectAllFiltered()"
              >
                Select All Filtered
              </VBtn>
              <VBtn size="small" variant="text" color="error" @click="deselectAll()">
                Deselect All
              </VBtn>
            </div>
          </div>

          <!-- Employee Checklist Table -->
          <VCard border class="mb-4" max-height="300" style="overflow-y: auto">
            <VTable density="compact" hover>
              <thead>
                <tr>
                  <th style="width: 50px">Select</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Position Title</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="emp in filteredModalEmployees"
                  :key="emp.id"
                  :class="{ 'bg-primary-lighten-5': selectedEmployeeIds.includes(emp.id) }"
                  style="cursor: pointer"
                  @click="toggleEmployeeSelection(emp.id)"
                >
                  <td>
                    <VCheckboxBtn
                      :model-value="selectedEmployeeIds.includes(emp.id)"
                      color="primary"
                      density="compact"
                      @click.stop="toggleEmployeeSelection(emp.id)"
                    />
                  </td>
                  <td>
                    <div class="font-weight-medium">{{ emp.fullName }}</div>
                    <div class="text-caption text-secondary">{{ emp.employeeCode }}</div>
                  </td>
                  <td>
                    <VChip size="x-small" variant="tonal" color="primary">
                      {{ emp.departmentName || 'General' }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-caption">{{ emp.positionTitle }}</span>
                  </td>
                </tr>
                <tr v-if="filteredModalEmployees.length === 0">
                  <td colspan="4" class="text-center text-secondary py-4">
                    No active employees match the selected department or search query.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VTextField
            v-model="notes"
            label="Notes / Remarks (Optional)"
            placeholder="Routine monthly payroll run..."
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCardText>

        <VDivider />

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="createDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-calculator"
            :loading="creating"
            :disabled="selectedEmployeeIds.length === 0"
            @click="handleCreateRun()"
          >
            Generate & Calculate Payroll ({{ selectedEmployeeIds.length }})
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
