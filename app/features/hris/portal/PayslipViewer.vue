<script setup lang="ts">
const { data: payslipsData } = await useAsyncData('portal-payslips', () =>
  fetchApi<any[]>('/api/hris/self-service/payslips')
);
const payslips = computed(() => payslipsData.value ?? []);

const selectedPayslip = ref<any>(null);

function viewSlip(ps: any) {
  selectedPayslip.value = ps;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}
</script>

<template>
  <div>
    <h3 class="text-h6 font-weight-bold text-primary mb-4">Your Digital Payslips History</h3>

    <VRow>
      <VCol v-for="ps in payslips" :key="ps.id" cols="12" sm="6" md="4">
        <VCard border class="pa-4 cursor-pointer" hover @click="viewSlip(ps)">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="font-mono text-caption text-secondary">{{ ps.runNumber }}</span>
            <VChip color="success" size="x-small" variant="flat">PAID</VChip>
          </div>
          <div class="text-h5 font-weight-bold text-primary mb-1">
            Period {{ ps.periodMonth }} / {{ ps.periodYear }}
          </div>
          <div class="text-subtitle-1 font-weight-bold text-success">
            {{ formatCurrency(ps.netSalary) }}
          </div>
          <VDivider class="my-3" />
          <div class="d-flex justify-space-between text-caption text-secondary">
            <span>Basic Salary:</span>
            <span>{{ formatCurrency(ps.basicSalary) }}</span>
          </div>
          <div class="d-flex justify-space-between text-caption text-secondary">
            <span>Flight Allowance:</span>
            <span>{{ formatCurrency(ps.flightAllowance) }}</span>
          </div>
        </VCard>
      </VCol>

      <VCol v-if="!payslips.length" cols="12">
        <VAlert type="info" variant="tonal">
          No published payslip records found for your account.
        </VAlert>
      </VCol>
    </VRow>

    <!-- Detail Slip Dialog -->
    <VDialog v-model="selectedPayslip" max-width="600">
      <VCard v-if="selectedPayslip" class="pa-6">
        <div class="d-flex align-center justify-space-between mb-4 border-b pb-4">
          <div class="d-flex align-center ga-3">
            <VImg src="https://amapapua.com/files/ama-pt-logo-shaded4.png" width="48" height="36" />
            <div>
              <div class="font-weight-bold text-primary">PT. ASSOCIATED MISSION AVIATION</div>
              <div class="text-caption text-secondary">
                OFFICIAL DIGITAL PAYSLIP &bull; {{ selectedPayslip.periodMonth }}/{{
                  selectedPayslip.periodYear
                }}
              </div>
            </div>
          </div>
          <VChip color="success" size="small" variant="flat">PAID</VChip>
        </div>

        <!-- Employee Info -->
        <VRow class="text-body-2 mb-4">
          <VCol cols="6">
            <div><strong>Employee ID:</strong> {{ selectedPayslip.employeeCode }}</div>
            <div><strong>Full Name:</strong> {{ selectedPayslip.employeeName }}</div>
          </VCol>
          <VCol cols="6">
            <div><strong>Position:</strong> {{ selectedPayslip.positionTitle }}</div>
            <div>
              <strong>Bank Account:</strong> {{ selectedPayslip.bankName }} ({{
                selectedPayslip.bankAccountNumber
              }})
            </div>
          </VCol>
        </VRow>

        <VDivider class="mb-4" />

        <!-- Rincian Earnings -->
        <div class="text-subtitle-2 font-weight-bold text-primary mb-2">EARNINGS (PENERIMAAN)</div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>Basic Salary (Gaji Pokok)</span>
          <strong>{{ formatCurrency(selectedPayslip.basicSalary) }}</strong>
        </div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>Flight Allowance (Tunjangan Terbang)</span>
          <strong class="text-primary">{{
            formatCurrency(selectedPayslip.flightAllowance)
          }}</strong>
        </div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>Overtime Amount</span>
          <strong>{{ formatCurrency(selectedPayslip.overtimeAmount) }}</strong>
        </div>
        <div
          class="d-flex justify-space-between text-body-1 font-weight-bold text-primary border-t py-2 mt-2"
        >
          <span>TOTAL GROSS EARNINGS</span>
          <span>{{ formatCurrency(selectedPayslip.totalEarnings) }}</span>
        </div>

        <!-- Rincian Deductions -->
        <div class="text-subtitle-2 font-weight-bold text-error mt-4 mb-2">
          DEDUCTIONS (POTONGAN)
        </div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>Income Tax PPh 21 (TER 2024)</span>
          <span class="text-error">{{ formatCurrency(selectedPayslip.pph21Amount) }}</span>
        </div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>BPJS Kesehatan Employee Share (1%)</span>
          <span class="text-error">{{ formatCurrency(selectedPayslip.bpjsKesEmployee) }}</span>
        </div>
        <div class="d-flex justify-space-between text-body-2 py-1">
          <span>BPJS Ketenagakerjaan Employee Share (3%)</span>
          <span class="text-error">{{ formatCurrency(selectedPayslip.bpjsTkEmployee) }}</span>
        </div>
        <div
          class="d-flex justify-space-between text-body-1 font-weight-bold text-error border-t py-2 mt-2"
        >
          <span>TOTAL DEDUCTIONS</span>
          <span>{{ formatCurrency(selectedPayslip.totalDeductions) }}</span>
        </div>

        <VDivider class="my-4" />

        <div class="d-flex justify-space-between align-center bg-success-lighten-5 pa-4 rounded">
          <span class="text-h6 font-weight-bold text-success">TAKE HOME PAY (NET SALARY)</span>
          <span class="text-h4 font-weight-bold text-success">{{
            formatCurrency(selectedPayslip.netSalary)
          }}</span>
        </div>

        <VCardActions class="mt-4 px-0">
          <VSpacer />
          <VBtn color="primary" @click="selectedPayslip = null">Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
