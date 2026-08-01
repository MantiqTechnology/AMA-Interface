<script setup lang="ts">
const { data: summary, refresh } = await useAsyncData('hris-dashboard-analytics', () =>
  fetchApi<any>('/api/hris/dashboard')
);

const { data: alerts } = await useAsyncData('hris-cert-alerts', () =>
  fetchApi<any[]>('/api/hris/certifications/alerts')
);

const certAlerts = computed(() => alerts.value ?? []);
const dash = computed(() => summary.value ?? {});

function alertColor(level: string) {
  if (level === 'EXPIRED') return 'error';
  if (level === 'CRITICAL_30') return 'warning';
  return 'info';
}

function getDeptProgressColor(index: number) {
  const colors = ['primary', 'info', 'success', 'warning', 'secondary', 'error'];
  return colors[index % colors.length];
}
</script>

<template>
  <div class="pa-6">
    <!-- Header Title Banner -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">HRIS & Operational SDM Dashboard</h1>
        <p class="text-subtitle-1 text-secondary">
          Analytics & monitoring karyawan, distribusi departemen, sertifikasi lisensi pilot,
          presensi, dan rekrutmen PT. AMA
        </p>
      </div>

      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-briefcase-search-outline" color="success" to="/careers">
          Portal Karir
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refresh()"> Refresh Data </VBtn>
      </div>
    </div>

    <!-- KPI Metric Summary Cards (Top Row) -->
    <VRow class="mb-6">
      <!-- Card 1: Total Employees -->
      <VCol cols="12" sm="6" md="3">
        <VCard border class="pa-4 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Total Karyawan Aktif</span>
            <VAvatar color="primary" variant="tonal" size="38">
              <VIcon icon="mdi-account-group" size="22" />
            </VAvatar>
          </div>
          <div class="text-h3 font-weight-bold text-primary">{{ dash.totalEmployees ?? 0 }}</div>
          <div class="text-caption text-secondary mt-1">
            Tersebar di {{ dash.departmentsBreakdown?.length ?? 0 }} departemen
          </div>
        </VCard>
      </VCol>

      <!-- Card 2: Today's Attendance -->
      <VCol cols="12" sm="6" md="3">
        <VCard border class="pa-4 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Presensi Hari Ini</span>
            <VAvatar color="success" variant="tonal" size="38">
              <VIcon icon="mdi-clock-check-outline" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-success">
              {{ dash.todayAttendanceCount ?? 0 }}
            </div>
            <span class="text-subtitle-1 font-weight-bold text-secondary">/ {{ dash.totalEmployees ?? 0 }}</span>
          </div>
          <VProgressLinear
            :model-value="dash.todayAttendanceRate ?? 0"
            color="success"
            height="6"
            rounded
            class="mt-2"
          />
          <div class="text-caption text-secondary mt-1 d-flex justify-space-between">
            <span>Clock-in: {{ dash.todayAttendanceRate ?? 0 }}%</span>
            <span v-if="dash.lateCount" class="text-warning font-weight-bold">Tertelat: {{ dash.lateCount }}</span>
          </div>
        </VCard>
      </VCol>

      <!-- Card 3: Certification Renewal Warning Alerts -->
      <VCol cols="12" sm="6" md="3">
        <VCard border class="pa-4 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Alert Sertifikasi Lisensi</span>
            <VAvatar color="warning" variant="tonal" size="38">
              <VIcon icon="mdi-alert-circle-outline" size="22" />
            </VAvatar>
          </div>
          <div class="text-h3 font-weight-bold text-warning">
            {{ dash.certificationAlertsCount ?? 0 }}
          </div>
          <div class="text-caption text-secondary mt-1">Expiring / Expired dalam 90 hari</div>
        </VCard>
      </VCol>

      <!-- Card 4: Pending HR Approvals (Leave & Overtime) -->
      <VCol cols="12" sm="6" md="3">
        <VCard border class="pa-4 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-secondary font-weight-bold text-uppercase">Pending Approval HR</span>
            <VAvatar color="info" variant="tonal" size="38">
              <VIcon icon="mdi-bell-badge-outline" size="22" />
            </VAvatar>
          </div>
          <div class="d-flex align-baseline ga-2">
            <div class="text-h3 font-weight-bold text-info">
              {{ (dash.pendingLeaveRequestsCount ?? 0) + (dash.pendingOvertimeRequestsCount ?? 0) }}
            </div>
            <span class="text-caption text-secondary">Pengajuan</span>
          </div>
          <div class="text-caption text-secondary mt-1">
            Cuti: <strong>{{ dash.pendingLeaveRequestsCount ?? 0 }}</strong> &bull; Lembur:
            <strong>{{ dash.pendingOvertimeRequestsCount ?? 0 }}</strong>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Visual Analytics Charts & Breakdown Section (Middle Row) -->
    <VRow class="mb-6">
      <!-- Visual 1: Employee Count Distribution by Department -->
      <VCol cols="12" md="6">
        <VCard border class="pa-5 h-100 rounded-lg elevation-1">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-chart-bar" color="primary" size="22" />
              <h3 class="text-h6 font-weight-bold text-primary">Jumlah Karyawan per Departemen</h3>
            </div>
            <VChip size="small" variant="outlined" color="primary">
              {{ dash.departmentsBreakdown?.length ?? 0 }} Divisi
            </VChip>
          </div>

          <VDivider class="mb-4" />

          <div class="d-flex flex-column ga-3">
            <div v-for="(dept, idx) in dash.departmentsBreakdown" :key="dept.departmentCode">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="font-weight-medium text-body-2 text-high-emphasis">
                  {{ dept.departmentName }}
                  <span class="text-caption text-secondary font-mono">({{ dept.departmentCode }})</span>
                </span>
                <span class="font-weight-bold text-body-2 text-primary">
                  {{ dept.count }} orang
                  <span class="text-caption text-secondary font-weight-normal">({{ dept.percentage }}%)</span>
                </span>
              </div>
              <VProgressLinear
                :model-value="dept.percentage"
                :color="getDeptProgressColor(idx)"
                height="10"
                rounded
              />
            </div>

            <div v-if="!dash.departmentsBreakdown?.length" class="text-center py-6 text-secondary">
              Belum ada data distribusi departemen.
            </div>
          </div>
        </VCard>
      </VCol>

      <!-- Visual 2: Demographics (Employment Type & Station Distribution) -->
      <VCol cols="12" md="6">
        <VRow>
          <!-- Employment Type Breakdown -->
          <VCol cols="12">
            <VCard border class="pa-5 rounded-lg elevation-1 mb-4">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center ga-2">
                  <VIcon icon="mdi-badge-account-outline" color="info" size="22" />
                  <h3 class="text-subtitle-1 font-weight-bold text-primary">
                    Komposisi Status Ikatan Kerja
                  </h3>
                </div>
              </div>

              <VDivider class="mb-3" />

              <VRow>
                <VCol
                  v-for="type in dash.employmentTypeBreakdown"
                  :key="type.employmentType"
                  cols="4"
                >
                  <div class="pa-3 border rounded text-center bg-surface">
                    <div class="text-caption text-secondary font-weight-bold text-uppercase">
                      {{ type.employmentType }}
                    </div>
                    <div class="text-h4 font-weight-bold text-primary my-1">{{ type.count }}</div>
                    <VChip size="x-small" color="info" variant="flat">
                      {{ type.percentage }}% Staff
                    </VChip>
                  </div>
                </VCol>
              </VRow>
            </VCard>
          </VCol>

          <!-- Station / Base Location Breakdown -->
          <VCol cols="12">
            <VCard border class="pa-5 rounded-lg elevation-1">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center ga-2">
                  <VIcon icon="mdi-map-marker-multiple-outline" color="success" size="22" />
                  <h3 class="text-subtitle-1 font-weight-bold text-primary">
                    Sebaran Karyawan per Base / Stasiun Utama
                  </h3>
                </div>
              </div>

              <VDivider class="mb-3" />

              <div class="d-flex flex-wrap ga-2">
                <VChip
                  v-for="st in dash.stationBreakdown"
                  :key="st.stationCode"
                  size="large"
                  color="primary"
                  variant="outlined"
                  class="font-weight-bold"
                >
                  <VIcon icon="mdi-airplane-landing" size="18" class="mr-1" />
                  {{ st.stationCode }}: {{ st.count }} orang
                </VChip>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VCol>
    </VRow>

    <!-- Bottom Monitoring Row -->
    <VRow>
      <!-- Expiry Alerts Widget -->
      <VCol cols="12" md="7">
        <VCard
          border
          class="rounded-lg elevation-1"
          title="Monitoring Sertifikasi & Lisensi Pilot/Crew (Alert 90 Hari)"
        >
          <template #prepend>
            <VIcon color="warning" icon="mdi-certificate-outline" />
          </template>

          <VDivider />

          <VTable density="comfortable" hover>
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Tipe Lisensi</th>
                <th>No. Sertifikat</th>
                <th>Tanggal Expiry</th>
                <th>Status Alert</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in certAlerts.slice(0, 5)" :key="item.id">
                <td>
                  <div class="font-weight-bold text-body-2">{{ item.employeeName }}</div>
                  <div class="text-caption text-secondary">{{ item.positionTitle }}</div>
                </td>
                <td>
                  <VChip size="small" variant="outlined" color="primary">
                    {{ item.certificationType }}
                  </VChip>
                </td>
                <td class="font-mono text-caption font-weight-bold">
                  {{ item.certificateNumber }}
                </td>
                <td class="font-weight-bold text-error">{{ item.expiryDate }}</td>
                <td>
                  <VChip
                    :color="alertColor(item.alertLevel)"
                    size="small"
                    variant="flat"
                    class="font-weight-bold"
                  >
                    {{ item.alertLevel.replace('_', ' ') }}
                  </VChip>
                </td>
              </tr>
              <tr v-if="certAlerts.length === 0">
                <td colspan="5" class="text-center py-6 text-secondary">
                  Semua sertifikasi pilot dan crew dalam kondisi aktif aman.
                </td>
              </tr>
            </tbody>
          </VTable>

          <VDivider />
          <VCardActions class="pa-3">
            <VSpacer />
            <VBtn
              color="primary"
              to="/hris/certifications"
              variant="text"
              prepend-icon="mdi-arrow-right"
            >
              Kelola Master Sertifikasi
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>

      <!-- Quick Actions & Links -->
      <VCol cols="12" md="5">
        <VCard border class="rounded-lg elevation-1" title="Aksi Cepat & Navigasi Modul HR">
          <template #prepend>
            <VIcon color="primary" icon="mdi-flash-outline" />
          </template>
          <VDivider />
          <VList density="comfortable">
            <VListItem
              prepend-icon="mdi-account-plus-outline"
              title="Tambah / Import Karyawan"
              to="/hris/employees"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-cash-multiple"
              title="Proses & Kuis Payroll Bulan Ini"
              to="/hris/payroll"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-sitemap-outline"
              title="Struktur Organisasi & Hirarki"
              to="/hris/organization"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-calendar-clock"
              title="Master Shift & Roster Pilot/Crew"
              to="/hris/schedules"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-briefcase-search-outline"
              title="Portal Karir & Rekrutmen ATS"
              to="/hris/recruitment"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem prepend-icon="mdi-chart-line" title="Evaluasi & Template KPI" to="/hris/kpi">
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
            <VListItem
              prepend-icon="mdi-account-circle-outline"
              title="Portal Self-Service Karyawan"
              to="/hris/portal"
            >
              <template #append><VIcon icon="mdi-open-in-new" color="primary" /></template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
