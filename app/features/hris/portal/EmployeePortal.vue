<script setup lang="ts">
import AttendanceCheckin from './AttendanceCheckin.vue';
import LeaveRequest from './LeaveRequest.vue';
import OvertimeAttendance from './OvertimeAttendance.vue';
import PayslipViewer from './PayslipViewer.vue';
import PortalLogin from './PortalLogin.vue';
import ScheduleView from './ScheduleView.vue';

const { data: sessionData, refresh: refreshSession } = await useAsyncData(
  'employee-portal-session',
  () => fetchApi<any>('/api/auth/employee-session')
);
const employee = computed(() => sessionData.value);

const activeTab = ref('attendance');

function onLoggedIn() {
  refreshSession();
}

async function logout() {
  await fetchApi('/api/auth/employee-logout', { method: 'POST' });
  refreshSession();
}
</script>

<template>
  <div class="hris-portal-shell">
    <!-- Header -->
    <header class="hris-portal-header">
      <div class="mx-auto d-flex h-100 max-w-7xl align-center px-4">
        <NuxtLink class="d-flex align-center ga-3 text-decoration-none" to="/hris/portal">
          <VImg
            alt="AMA logo"
            class="rounded"
            height="44"
            src="https://amapapua.com/files/ama-pt-logo-shaded4.png"
            width="64"
          />
          <div>
            <div class="font-weight-bold text-brand-primary">Associated Mission Aviation</div>
            <div class="text-xs text-text-secondary">Employee Self-Service Portal</div>
          </div>
        </NuxtLink>

        <VSpacer />

        <div v-if="employee" class="d-flex align-center ga-3">
          <div class="text-right">
            <div class="font-weight-bold text-body-2">{{ employee.fullName }}</div>
            <div class="text-caption text-secondary">{{ employee.positionTitle }}</div>
          </div>
          <VBtn
            prepend-icon="mdi-logout"
            size="small"
            variant="outlined"
            color="error"
            @click="logout()"
          >
            Sign Out
          </VBtn>
        </div>
        <VBtn v-else prepend-icon="mdi-arrow-left" to="/" variant="text">
          Back to Main System
        </VBtn>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-7xl px-4 py-6 py-md-10">
      <!-- If NOT logged in -->
      <PortalLogin v-if="!employee" @logged-in="onLoggedIn" />

      <!-- If logged in -->
      <div v-else>
        <div class="mb-6 d-flex flex-column flex-md-row align-md-end justify-space-between ga-4">
          <div>
            <h1 class="text-h3 font-weight-bold text-brand-primary">
              Employee Self-Service Portal
            </h1>
            <p class="mt-2 text-text-secondary">
              Real-time multi-station attendance, leave management, overtime attendance, flight duty
              schedule, and digital payslips.
            </p>
          </div>
          <VChip color="success" prepend-icon="mdi-shield-check-outline" variant="tonal">
            HRIS System Synchronized
          </VChip>
        </div>

        <VCard border elevation="1">
          <VTabs v-model="activeTab" color="primary" show-arrows>
            <VTab value="attendance" prepend-icon="mdi-clock-check-outline">
              Attendance & Clock-In
            </VTab>
            <VTab value="overtime" prepend-icon="mdi-clock-plus-outline">Overtime Attendance</VTab>
            <VTab value="leave" prepend-icon="mdi-calendar-account-outline">
              Leave Requests & Balances
            </VTab>
            <VTab value="payslip" prepend-icon="mdi-file-document-outline">
              Digital Payslips & Salary
            </VTab>
            <VTab value="schedule" prepend-icon="mdi-calendar-clock">
              My Duty Roster & Schedule
            </VTab>
          </VTabs>
          <VDivider />

          <VCardText class="pa-4 pa-md-6">
            <VWindow v-model="activeTab">
              <VWindowItem value="attendance">
                <AttendanceCheckin />
              </VWindowItem>
              <VWindowItem value="overtime">
                <OvertimeAttendance />
              </VWindowItem>
              <VWindowItem value="leave">
                <LeaveRequest :employee-id="employee.id" />
              </VWindowItem>
              <VWindowItem value="payslip">
                <PayslipViewer />
              </VWindowItem>
              <VWindowItem value="schedule">
                <ScheduleView />
              </VWindowItem>
            </VWindow>
          </VCardText>
        </VCard>
      </div>
    </main>
  </div>
</template>

<style scoped>
.hris-portal-shell {
  min-height: 100vh;
  background: #f4f7f8;
}
.hris-portal-header {
  height: 72px;
  border-bottom: 1px solid #dce3e7;
  background: #ffffff;
}
</style>
