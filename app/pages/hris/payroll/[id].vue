<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: runsData, refresh } = await useAsyncData('payroll-runs-detail', () =>
  fetchApi<any[]>('/api/hris/payroll/runs')
);

const run = computed(() =>
  (runsData.value ?? []).find((r: any) => r.id === id || r.runNumber === id)
);

const { data: payslipsData, refresh: refreshPayslips } = await useAsyncData(
  `payroll-payslips-${id}`,
  () => fetchApi<any[]>(`/api/hris/payroll/runs/${id}/payslips`)
);

const { data: allEmployeesData } = await useAsyncData('all-active-employees', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);

const payslips = computed(() => payslipsData.value ?? []);
const allEmployeesList = computed(() => {
  if (Array.isArray(allEmployeesData.value)) return allEmployeesData.value;
  if (allEmployeesData.value && Array.isArray((allEmployeesData.value as any).items))
    return (allEmployeesData.value as any).items;
  return [];
});

const calculating = ref(false);
const approving = ref(false);
const postingJournal = ref(false);

// Add Staff Modal State
const addStaffDialog = ref(false);
const selectedStaffToAdd = ref<string[]>([]);
const staffSearchQuery = ref('');
const addingStaff = ref(false);

// Filter out employees who are already in this payroll run
const availableStaffToAdd = computed(() => {
  const currentEmpIds = new Set(payslips.value.map((p: any) => String(p.employeeId)));
  return allEmployeesList.value.filter((emp: any) => {
    const isNotInRun = !currentEmpIds.has(String(emp.id));
    const query = staffSearchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.employeeCode?.toLowerCase().includes(query) ||
      emp.positionTitle?.toLowerCase().includes(query);
    return isNotInRun && matchesSearch;
  });
});

watch(addStaffDialog, (isOpen) => {
  if (isOpen) {
    selectedStaffToAdd.value = [];
    staffSearchQuery.value = '';
  }
});

function toggleStaffToAdd(empId: string) {
  if (selectedStaffToAdd.value.includes(empId)) {
    selectedStaffToAdd.value = selectedStaffToAdd.value.filter((i) => i !== empId);
  } else {
    selectedStaffToAdd.value.push(empId);
  }
}

function selectAllAvailableStaff() {
  selectedStaffToAdd.value = availableStaffToAdd.value.map((e: any) => e.id);
}

async function handleAddStaffToRun() {
  if (selectedStaffToAdd.value.length === 0) return;
  addingStaff.value = true;
  try {
    await fetchApi(`/api/hris/payroll/runs/${id}/employees`, {
      method: 'POST',
      body: { employeeIds: selectedStaffToAdd.value }
    });
    addStaffDialog.value = false;
    await refresh();
    await refreshPayslips();
  } catch (err: any) {
    alert(err.message || 'Failed to add staff to payroll run.');
  } finally {
    addingStaff.value = false;
  }
}

// Adjust Component Modal State
const adjustDialog = ref(false);
const selectedPayslip = ref<any>(null);
const selectedComponentCode = ref('BASIC_SALARY');
const adjustAmount = ref(0);
const adjustNotes = ref('');
const adjusting = ref(false);

function openAdjustModal(item: any) {
  selectedPayslip.value = item;
  selectedComponentCode.value = 'BASIC_SALARY';
  adjustAmount.value = item.basicSalary;
  adjustNotes.value = '';
  adjustDialog.value = true;
}

watch(selectedComponentCode, (code) => {
  if (!selectedPayslip.value) return;
  if (code === 'BASIC_SALARY') adjustAmount.value = selectedPayslip.value.basicSalary;
  else if (code === 'FLIGHT_ALLOWANCE') adjustAmount.value = selectedPayslip.value.flightAllowance;
  else if (code === 'OVERTIME') adjustAmount.value = selectedPayslip.value.overtimeAmount;
  else adjustAmount.value = 0;
});

async function handleSaveAdjustment() {
  if (!selectedPayslip.value) return;
  adjusting.value = true;
  try {
    await fetchApi(`/api/hris/payroll/payslips/${selectedPayslip.value.id}/adjust`, {
      method: 'POST',
      body: {
        componentCode: selectedComponentCode.value,
        amount: adjustAmount.value,
        notes: adjustNotes.value
      }
    });
    adjustDialog.value = false;
    await refresh();
    await refreshPayslips();
  } catch (err: any) {
    alert(err.message || 'Failed to adjust payslip component.');
  } finally {
    adjusting.value = false;
  }
}

async function handleRemoveEmployee(item: any) {
  if (!confirm(`Are you sure you want to remove ${item.employeeName} from this draft payroll run?`))
    return;
  try {
    await fetchApi(`/api/hris/payroll/runs/${id}/employees/${item.employeeId}`, {
      method: 'DELETE'
    });
    await refresh();
    await refreshPayslips();
  } catch (err: any) {
    alert(err.message || 'Failed to remove employee from payroll run.');
  }
}

async function calculate() {
  calculating.value = true;
  try {
    await fetchApi(`/api/hris/payroll/runs/${id}/calculate`, { method: 'POST' });
    await refresh();
    await refreshPayslips();
  } catch (err: any) {
    alert(err.message || 'Failed to recalculate payroll run.');
  } finally {
    calculating.value = false;
  }
}

async function approve() {
  approving.value = true;
  try {
    await fetchApi(`/api/hris/payroll/runs/${id}/approve`, { method: 'POST' });
    await refresh();
  } catch (err: any) {
    alert(err.message || 'Failed to approve payroll run.');
  } finally {
    approving.value = false;
  }
}

async function postJournal() {
  postingJournal.value = true;
  try {
    await fetchApi(`/api/hris/payroll/runs/${id}/journal`, { method: 'POST' });
    await refresh();
  } catch (err: any) {
    alert(err.message || 'Failed to post finance journal.');
  } finally {
    postingJournal.value = false;
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

const headers = [
  { title: 'Employee', key: 'employeeName' },
  { title: 'Basic Salary', key: 'basicSalary' },
  { title: 'Flight Allowance', key: 'flightAllowance' },
  { title: 'Overtime', key: 'overtimeAmount' },
  { title: 'Total Gross', key: 'totalEarnings' },
  { title: 'PPh 21 TER', key: 'pph21Amount' },
  { title: 'BPJS (Emp)', key: 'bpjs' },
  { title: 'Net Salary', key: 'netSalary' },
  { title: 'Actions', key: 'actions', sortable: false }
];
</script>

<template>
  <div v-if="run" class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <div class="d-flex align-center ga-3">
          <h1 class="text-h4 font-weight-bold text-primary">{{ run.runNumber }}</h1>
          <VChip color="primary" size="medium" variant="flat">
            Period {{ run.periodMonth }} / {{ run.periodYear }}
          </VChip>
          <VChip
            :color="run.runType === 'THR' ? 'purple' : 'primary'"
            size="medium"
            variant="tonal"
          >
            {{ run.runType }}
          </VChip>
          <VChip
            :color="
              run.status === 'PAID' ? 'success' : run.status === 'APPROVED' ? 'info' : 'warning'
            "
            size="medium"
            variant="outlined"
          >
            {{ run.status }}
          </VChip>
        </div>
        <p class="text-subtitle-1 text-secondary mt-1">
          Detailed employee payroll calculation, flight allowances, PPh 21 TER, BPJS, and component
          adjustments
        </p>
      </div>

      <div class="d-flex ga-2">
        <VBtn
          v-if="run.status === 'DRAFT' || run.status === 'CALCULATED'"
          prepend-icon="mdi-account-plus"
          color="primary"
          @click="addStaffDialog = true"
        >
          Add Staff to Payroll
        </VBtn>

        <VBtn
          v-if="run.status === 'DRAFT' || run.status === 'CALCULATED'"
          prepend-icon="mdi-calculator"
          color="warning"
          :loading="calculating"
          @click="calculate()"
        >
          Recalculate Payroll
        </VBtn>

        <VBtn
          v-if="run.status === 'CALCULATED'"
          prepend-icon="mdi-check-decagram"
          color="success"
          :loading="approving"
          @click="approve()"
        >
          Approve Payroll Run
        </VBtn>

        <VBtn
          v-if="run.status === 'APPROVED'"
          prepend-icon="mdi-book-open-page-variant"
          color="info"
          :loading="postingJournal"
          @click="postJournal()"
        >
          Post Finance Journal
        </VBtn>

        <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/payroll">Back</VBtn>
      </div>
    </div>

    <!-- Summary Row -->
    <VRow class="mb-6">
      <VCol cols="12" sm="3">
        <VCard border class="pa-4">
          <div class="text-caption text-secondary font-weight-bold">EMPLOYEE COUNT</div>
          <div class="text-h4 font-weight-bold text-primary mt-1">
            {{ run.employeeCount }} Staff
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4">
          <div class="text-caption text-secondary font-weight-bold">TOTAL GROSS</div>
          <div class="text-h4 font-weight-bold text-primary mt-1">
            {{ formatCurrency(run.totalGross) }}
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4">
          <div class="text-caption text-secondary font-weight-bold">TOTAL DEDUCTIONS</div>
          <div class="text-h4 font-weight-bold text-error mt-1">
            {{ formatCurrency(run.totalDeductions) }}
          </div>
        </VCard>
      </VCol>
      <VCol cols="12" sm="3">
        <VCard border class="pa-4">
          <div class="text-caption text-secondary font-weight-bold">TOTAL NET SALARY</div>
          <div class="text-h4 font-weight-bold text-success mt-1">
            {{ formatCurrency(run.totalNet) }}
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Payslips List -->
    <VCard border title="Employee Digital Payslips & Adjustments">
      <VDataTable :headers="headers" :items="payslips">
        <template #item.employeeName="{ item }">
          <div class="font-weight-medium">{{ item.employeeName }}</div>
          <div class="text-caption text-secondary">
            {{ item.positionTitle }} • {{ item.employeeCode }}
          </div>
        </template>
        <template #item.basicSalary="{ item }">
          {{ formatCurrency(item.basicSalary) }}
        </template>
        <template #item.flightAllowance="{ item }">
          <span class="text-primary font-weight-bold">{{
            formatCurrency(item.flightAllowance)
          }}</span>
        </template>
        <template #item.overtimeAmount="{ item }">
          {{ formatCurrency(item.overtimeAmount) }}
        </template>
        <template #item.totalEarnings="{ item }">
          <span class="font-weight-bold">{{ formatCurrency(item.totalEarnings) }}</span>
        </template>
        <template #item.pph21Amount="{ item }">
          <span class="text-error">{{ formatCurrency(item.pph21Amount) }}</span>
        </template>
        <template #item.bpjs="{ item }">
          <span class="text-error">{{
            formatCurrency(item.bpjsKesEmployee + item.bpjsTkEmployee)
          }}</span>
        </template>
        <template #item.netSalary="{ item }">
          <span class="font-weight-bold text-success">{{ formatCurrency(item.netSalary) }}</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              v-if="run.status === 'DRAFT' || run.status === 'CALCULATED'"
              size="small"
              variant="text"
              icon="mdi-pencil-outline"
              color="primary"
              title="Adjust Payslip Component"
              @click="openAdjustModal(item)"
            />
            <VBtn
              v-if="run.status === 'DRAFT' || run.status === 'CALCULATED'"
              size="small"
              variant="text"
              icon="mdi-account-remove-outline"
              color="error"
              title="Remove Employee from Draft Run"
              @click="handleRemoveEmployee(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Add Staff Modal -->
    <VDialog v-model="addStaffDialog" max-width="600" scrollable>
      <VCard>
        <VCardTitle class="pa-4 font-weight-bold text-h6 d-flex align-center justify-space-between">
          <div>
            <span>Add Employees to Payroll Run</span>
            <div class="text-caption text-secondary font-weight-regular mt-1">
              Select active employees to add back into this draft payroll run
            </div>
          </div>
          <VChip color="primary" variant="flat" size="medium">
            {{ selectedStaffToAdd.length }} Selected
          </VChip>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3 ga-2">
            <VTextField
              v-model="staffSearchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search staff name / code..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 320px"
            />
            <VBtn
              size="small"
              variant="outlined"
              color="primary"
              @click="selectAllAvailableStaff()"
            >
              Select All Available ({{ availableStaffToAdd.length }})
            </VBtn>
          </div>

          <VCard border max-height="300" style="overflow-y: auto">
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
                  v-for="emp in availableStaffToAdd"
                  :key="emp.id"
                  :class="{ 'bg-primary-lighten-5': selectedStaffToAdd.includes(emp.id) }"
                  style="cursor: pointer"
                  @click="toggleStaffToAdd(emp.id)"
                >
                  <td>
                    <VCheckboxBtn
                      :model-value="selectedStaffToAdd.includes(emp.id)"
                      color="primary"
                      density="compact"
                      @click.stop="toggleStaffToAdd(emp.id)"
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
                <tr v-if="availableStaffToAdd.length === 0">
                  <td colspan="4" class="text-center text-secondary py-4">
                    All active employees are already present in this payroll run.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="addStaffDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-account-plus"
            :loading="addingStaff"
            :disabled="selectedStaffToAdd.length === 0"
            @click="handleAddStaffToRun()"
          >
            Add Selected Staff ({{ selectedStaffToAdd.length }})
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Adjust Component Dialog -->
    <VDialog v-model="adjustDialog" max-width="500">
      <VCard title="Adjust Payslip Component">
        <VDivider />
        <VCardText v-if="selectedPayslip" class="pa-4">
          <div class="mb-4">
            <div class="font-weight-bold text-subtitle-1">{{ selectedPayslip.employeeName }}</div>
            <div class="text-caption text-secondary">{{ selectedPayslip.positionTitle }}</div>
          </div>
          <VRow>
            <VCol cols="12">
              <VSelect
                v-model="selectedComponentCode"
                label="Component to Adjust"
                :items="[
                  { title: 'Basic Salary (Gaji Pokok)', value: 'BASIC_SALARY' },
                  { title: 'Flight Allowance (Tunjangan Terbang)', value: 'FLIGHT_ALLOWANCE' },
                  { title: 'Overtime Allowance (Lembur)', value: 'OVERTIME' },
                  { title: 'THR (Tunjangan Hari Raya)', value: 'THR' },
                  { title: 'Bonus / Incentive', value: 'BONUS' }
                ]"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model.number="adjustAmount"
                label="New Amount (IDR)"
                type="number"
                prefix="Rp"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="adjustNotes"
                label="Adjustment Reason / Notes"
                placeholder="Operational bonus, manual correction..."
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VAlert type="info" variant="tonal" class="mt-2 text-caption">
            Saving this adjustment will automatically recalculate gross earnings, PPh 21 TER,
            deductions, and overall payroll run totals.
          </VAlert>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="adjustDialog = false">Cancel</VBtn>
          <VBtn color="primary" :loading="adjusting" @click="handleSaveAdjustment()">
            Save & Recalculate
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
