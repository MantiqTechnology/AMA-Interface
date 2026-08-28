<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Emergency & Response</h1>
      <div class="text-caption text-medium-emphasis">
        Emergency Response Plan (ERP) & Readiness Analytics
      </div>
    </div>

    <!-- Sub-menu Navigation -->
    <VTabs v-model="activeTab" color="primary">
      <VTab
        value="overview"
        to="/sms/Dashboard"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
      </VTab>
      <VTab
        value="hazard"
        to="/sms/Reporting"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
      </VTab>
      <VTab value="frat" to="/sms/Frat" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> Flight Risk (FRAT)
      </VTab>
      <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-clipboard-check-multiple-outline" size="18" class="mr-2" /> CAPA
      </VTab>
      <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-bold">
        <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency & Response
      </VTab>
      <VTab
        value="assurance"
        to="/sms/SafetyAssurance"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
      </VTab>
      <VTab
        value="spi"
        to="/sms/SpiAnalytics"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
      </VTab>
      <VTab
        value="communication"
        to="/sms/Communication"
        class="text-none font-weight-medium text-medium-emphasis"
      >
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
    </VTabs>

    <!-- Filter & ONE-CLICK ERP Toolbar -->
    <VCard border class="pa-3 mb-4">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField
          v-model="filters.dateRange"
          label="Date Range"
          prepend-inner-icon="mdi-calendar-range"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 220px"
        />
        <VSelect
          v-model="filters.station"
          label="Station"
          :items="['All Station']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
        <VBtn variant="outlined" density="compact" class="text-none mt-1">
          <VIcon icon="mdi-filter-variant" class="mr-1" /> Filters
        </VBtn>
        <VSpacer />
        <span class="text-caption text-medium-emphasis mr-2">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          class="text-none font-weight-bold"
          style="background-color: #f0f4ff; border-color: #d0d9f5"
          @click="handleRefresh"
        >
          Refresh Data
        </VBtn>
        <!-- Emergency Broadcast Trigger -->
        <VBtn
          color="error"
          variant="elevated"
          prepend-icon="mdi-broadcast"
          class="text-none font-weight-bold shadow-lg bg-red-darken-4"
          size="large"
          @click="showEmergencyModal = true"
        >
          DECLARE EMERGENCY
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- KPI Top Row -->
      <VCol cols="12" md="4">
        <SmsKpiCard title="ERP Readiness" value="READY" icon="mdi-shield-check" color="success" />
      </VCol>
      <VCol cols="12" md="4">
        <SmsKpiCard title="Active Emergency" value="0" icon="mdi-ambulance" color="success" />
      </VCol>
      <VCol cols="12" md="4">
        <SmsKpiCard
          title="Response Readiness"
          value="94%"
          icon="mdi-percent"
          color="primary"
          target="Target: 100%"
        />
      </VCol>

      <!-- Middle Row: Events vs Checklist -->
      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-4">Emergency Events (YTD)</div>
          <div class="d-flex flex-column ga-3">
            <div v-for="event in emergencyEvents" :key="event.label" class="d-flex align-center">
              <span class="text-body-2 text-medium-emphasis flex-grow-1" style="min-width: 140px">{{
                event.label
              }}</span>
              <VProgressLinear
                :model-value="(event.value / 8) * 100"
                color="error"
                height="12"
                rounded
                class="mx-3"
              />
              <span class="text-subtitle-1 font-weight-bold">{{ event.value }}</span>
            </div>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-4">Response Readiness Checklist</div>
          <VList density="compact" class="pa-0">
            <VListItem v-for="check in readinessChecklist" :key="check.item" class="px-0">
              <template #prepend>
                <VIcon
                  :icon="check.status ? 'mdi-check-circle' : 'mdi-close-circle'"
                  :color="check.status ? 'success' : 'error'"
                  class="mr-3"
                />
              </template>
              <VListItemTitle class="text-body-2 font-weight-medium">
                {{ check.item }}
              </VListItemTitle>
              <template #append>
                <VChip
                  size="x-small"
                  :color="check.status ? 'success' : 'error'"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ check.status ? 'VERIFIED' : 'PENDING' }}
                </VChip>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <!-- Full Width Chart Row -->
      <VCol cols="12">
        <VCard border class="pa-4">
          <SmsTrendChart
            title="Emergency / Response Trend (6 Months)"
            v-bind="emergencyTrend"
            height="280"
          />
          <div class="text-caption text-medium-emphasis text-center mt-2 italic">
            * Illustrative mock data based on recent occurrences
          </div>
        </VCard>
      </VCol>

      <!-- Bottom Row: Recent Events vs Post-Event Actions -->
      <VCol cols="12" md="6">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 d-flex justify-space-between align-center border-b">
            <div class="text-subtitle-2 font-weight-bold">Recent Emergency Events</div>
            <VBtn size="small" variant="text" color="primary" class="text-none">View Log</VBtn>
          </div>
          <div class="flex-grow-1 overflow-y-auto" style="max-height: 250px">
            <VTable density="compact" class="bg-transparent">
              <tbody>
                <tr v-for="log in recentEvents" :key="log.id" class="hover-bg">
                  <td class="text-caption font-weight-bold px-4" style="width: 80px">
                    {{ log.id }}
                  </td>
                  <td class="text-body-2 px-2 py-2">{{ log.event }}</td>
                  <td class="text-caption text-medium-emphasis text-right px-4">{{ log.date }}</td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 text-subtitle-2 font-weight-bold border-b">Post-Event Actions</div>
          <div class="flex-grow-1 overflow-y-auto pa-2" style="max-height: 250px">
            <VList density="compact" class="pa-0">
              <VListItem
                v-for="action in postEventActions"
                :key="action.task"
                class="px-2 py-1 mb-1 rounded hover-bg"
              >
                <template #prepend>
                  <VIcon icon="mdi-chevron-right-box-outline" color="primary" class="mr-2" />
                </template>
                <VListItemTitle class="text-body-2">{{ action.task }}</VListItemTitle>
                <template #append>
                  <VBtn
                    size="small"
                    variant="outlined"
                    color="primary"
                    density="compact"
                    class="text-none"
                  >
                    Update
                  </VBtn>
                </template>
              </VListItem>
            </VList>
          </div>
        </VCard>
      </VCol>

      <!-- Drill / Exercise Performance -->
      <VCol cols="12">
        <VCard border class="pa-4 bg-blue-grey-lighten-5">
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-1 font-weight-bold">Drill / Exercise Performance</div>
            <div class="text-h6 font-weight-black text-primary">Score: 94%</div>
          </div>
          <VProgressLinear model-value="94" color="primary" height="8" rounded class="mb-4" />

          <VRow dense>
            <VCol cols="4">
              <div class="text-caption text-medium-emphasis text-uppercase">Completed</div>
              <div class="text-h5 font-weight-bold text-success">8</div>
            </VCol>
            <VCol cols="4" class="border-s pl-4">
              <div class="text-caption text-medium-emphasis text-uppercase">Scheduled</div>
              <div class="text-h5 font-weight-bold text-info">2</div>
            </VCol>
            <VCol cols="4" class="border-s pl-4">
              <div class="text-caption text-medium-emphasis text-uppercase">Overdue</div>
              <div class="text-h5 font-weight-bold text-error">1</div>
            </VCol>
          </VRow>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>

  <!-- ========================================================================= -->
  <!-- MODAL DARURAT ICAO / BASARNAS (CASR Part 19 & ICAO Annex 12 Compliant) -->
  <!-- ========================================================================= -->
  <VDialog v-model="showEmergencyModal" max-width="650" persistent>
    <VCard border class="border-error">
      <VCardItem class="bg-red-darken-4 text-white pa-4">
        <div class="d-flex align-center">
          <VIcon icon="mdi-alert-octagram" size="x-large" class="mr-3 animation-pulse" />
          <div>
            <div class="text-h6 font-weight-bold">EMERGENCY BROADCAST</div>
            <div class="text-caption">ICAO Annex 12 & CASR Part 19 ERP Integration</div>
          </div>
        </div>
      </VCardItem>

      <VCardText class="pa-6">
        <!-- Step 1: Input Data Form (Standard SAR Data) -->
        <div v-if="emergencyStep === 1">
          <p class="text-body-2 mb-4 text-medium-emphasis">
            Peringatan: Aktivasi ini akan memicu <strong>One-Click ERP</strong>. Sinyal distress,
            koordinat LKP, dan manifes penerbangan akan disiarkan ke BASARNAS (MCC) dan AirNav
            Indonesia.
          </p>

          <VRow dense>
            <VCol cols="12">
              <VSelect
                v-model="erForm.flight"
                label="Pilih Penerbangan Bermasalah (Active Flights)"
                :items="[
                  'AMA1264 (PK-AMA) | WMX-MII | Airborne',
                  'AMA1265 (PK-AMB) | DKI-MUL | Lost Contact'
                ]"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="erForm.phase"
                label="Fase Kedaruratan ICAO"
                :items="[
                  'INCERFA (Uncertainty / Ragu-ragu)',
                  'ALERFA (Alert / Siaga)',
                  'DETRESFA (Distress / Bahaya)'
                ]"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="erForm.nature"
                label="Sifat Darurat (Nature of Emergency)"
                :items="[
                  'Aircraft Accident / Crash',
                  'Loss of Communication (7600)',
                  'Unlawful Interference / Hijack (7500)',
                  'Engine Failure / Technical (7700)',
                  'Medical Emergency'
                ]"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="erForm.pob"
                label="Persons On Board (POB)"
                type="number"
                variant="outlined"
                density="comfortable"
                class="mb-1"
                placeholder="Jumlah Pax + Crew"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="erForm.endurance"
                label="Endurance (Fuel)"
                variant="outlined"
                density="comfortable"
                class="mb-1"
                placeholder="Misal: 02 Hrs 30 Mins"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="erForm.lkp"
                label="Last Known Position (LKP) / Koordinat"
                variant="outlined"
                density="comfortable"
                class="mb-1"
                placeholder="Contoh: 04°05'S 138°56'E at 10,500 ft"
              />
            </VCol>
          </VRow>
        </div>

        <!-- Step 2: Tunggu Respon (Awaiting Acknowledgement) -->
        <div v-else-if="emergencyStep === 2" class="text-center py-6">
          <VProgressCircular indeterminate color="error" size="64" class="mb-4" />
          <div class="text-h6 font-weight-bold text-error">TRANSMITTING DISTRESS SIGNAL...</div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            Menyiarkan data telemetri, LKP, POB, dan Endurance ke API BASARNAS.<br>
            Aktivasi SMS/WA Blast ke Crisis Management Center (CMC) Internal...<br>
            <strong>Menunggu konfirmasi respon dari Command Center...</strong>
          </div>
        </div>

        <!-- Step 3: Dikonfirmasi (Acknowledged) -->
        <div v-else-if="emergencyStep === 3" class="text-center py-6">
          <VIcon icon="mdi-check-decagram" color="success" size="80" class="mb-2" />
          <div class="text-h5 font-weight-black text-success">ERP ACTIVATED & ACKNOWLEDGED</div>
          <VCard border class="mt-4 pa-4 bg-green-lighten-5 text-left d-inline-block w-100">
            <div class="text-caption font-weight-bold mb-2 text-success-darken-1">
              Status: BASARNAS (MCC) & AirNav Notified. CMC Activated.
            </div>
            <VDivider class="mb-2" />
            <div class="text-caption mb-1">
              <strong>Fase Darurat:</strong> {{ erForm.phase || 'DETRESFA' }}
            </div>
            <div class="text-caption mb-1">
              <strong>Waktu Transmisi (UTC):</strong> {{ currentUtcTime }}
            </div>
            <div class="text-caption mb-1">
              <strong>No. Laporan SAR:</strong> SAR-AMA-260822-001A
            </div>
            <div class="text-caption mt-3 text-medium-emphasis">
              Silakan pindah ke ruang Crisis Center dan buka "Active Emergency" log untuk pembaruan
              koordinasi operasi SAR.
            </div>
          </VCard>
        </div>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-4 bg-grey-lighten-4">
        <VSpacer />
        <!-- Tombol Batal hanya muncul di Step 1 -->
        <VBtn v-if="emergencyStep === 1" variant="text" class="text-none" @click="closeEmergency">
          Batal
        </VBtn>

        <!-- Tombol Broadcast Step 1 -->
        <VBtn
          v-if="emergencyStep === 1"
          color="error"
          variant="elevated"
          class="text-none font-weight-bold"
          @click="triggerBroadcast"
        >
          <VIcon icon="mdi-radio-tower" class="mr-2" /> BROADCAST SEKARANG
        </VBtn>

        <!-- Tombol Tutup di Step 3 -->
        <VBtn
          v-if="emergencyStep === 3"
          color="success"
          variant="elevated"
          class="text-none font-weight-bold"
          @click="closeEmergency"
        >
          TUTUP & PANTAU LOG
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
// Tidak ada import manual dari 'vue'. Semua menggunakan auto-import Nuxt 3.

const activeTab = ref('emergency');
const lastUpdated = ref('22 Aug 2026 10:30 WIB');

function handleRefresh() {
  lastUpdated.value =
    new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
}

// ==========================================
// STATE & LOGIKA MODAL DARURAT BASARNAS
// ==========================================
const showEmergencyModal = ref(false);
const emergencyStep = ref(1); // 1: Form, 2: Loading/Waiting, 3: Success

// Formulir Kedaruratan Standar Penerbangan (SAR Data)
const erForm = reactive({
  flight: '',
  phase: '',
  nature: '',
  pob: '',
  endurance: '',
  lkp: ''
});

// Dapatkan waktu saat ini format UTC untuk standar penerbangan
const currentUtcTime = computed(() => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19) + ' Z';
});

function triggerBroadcast() {
  emergencyStep.value = 2;

  // Simulasi jeda waktu menunggu balasan dari API BASARNAS/AirNav (3.5 detik)
  setTimeout(() => {
    emergencyStep.value = 3;
  }, 3500);
}

function closeEmergency() {
  showEmergencyModal.value = false;
  setTimeout(() => {
    emergencyStep.value = 1; // Kembalikan ke form awal setelah dialog tertutup
    // Reset Form
    erForm.flight = '';
    erForm.phase = '';
    erForm.nature = '';
    erForm.pob = '';
    erForm.endurance = '';
    erForm.lkp = '';
  }, 300);
}
// ==========================================

const filters = reactive({
  dateRange: '01 Mar – 21 Aug 2026',
  station: 'All Station'
});

// Data Mock untuk Emergency Events
const emergencyEvents = ref([
  { label: 'Weather Emergency', value: 8 },
  { label: 'Aircraft Incident', value: 6 },
  { label: 'Technical Event', value: 5 },
  { label: 'Medical Emergency', value: 5 }
]);

const readinessChecklist = ref([
  { item: 'Emergency Plan (ERP) Updated', status: true },
  { item: 'Emergency Contacts Verified', status: true },
  { item: 'Response Team Assigned', status: true },
  { item: 'Communication Equipment Ready', status: true },
  { item: 'Medical Evacuation Contract Active', status: false }
]);

const emergencyTrend = {
  categories: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  series: [{ name: 'Emergency Events', color: '#E53935', data: [3, 5, 4, 6, 4, 2] }]
};

const recentEvents = ref([
  {
    id: 'ERP-010',
    event: 'Aircraft Incident (Hard Landing / Runway Excursion)',
    date: '12 Aug 2026'
  },
  { id: 'ERP-009', event: 'Medical Emergency (Passenger Seizure In-flight)', date: '08 Aug 2026' },
  { id: 'ERP-008', event: 'Security Threat (Unruly Passenger at Gate)', date: '28 Jul 2026' },
  { id: 'ERP-007', event: 'Weather Emergency (Severe Windshear / Divert)', date: '19 Jul 2026' },
  { id: 'ERP-006', event: 'Technical Event (Engine Flameout Simulation)', date: '02 Jul 2026' },
  { id: 'ERP-005', event: 'Ground Handling Incident (Tug Collision)', date: '21 Jun 2026' },
  { id: 'ERP-004', event: 'Weather Emergency (Microburst at Final Approach)', date: '15 Jun 2026' },
  { id: 'ERP-003', event: 'Medical Emergency (Crew Incapacitation)', date: '01 Jun 2026' },
  { id: 'ERP-002', event: 'Technical Event (Landing Gear Fault Warning)', date: '22 May 2026' },
  { id: 'ERP-001', event: 'Aircraft Incident (Tail Strike at Takeoff)', date: '10 May 2026' }
]);

const postEventActions = ref([
  { task: 'Update ERP contact list for Sentani Hub' },
  { task: 'Review SAR escalation procedure with BASARNAS' },
  { task: 'Communication drill execution with ATC Papua' },
  { task: 'Emergency equipment (First Aid & Defibrillator) verification' },
  { task: 'Conduct recurrent training for unruly passenger handling' },
  { task: 'Revise crosswind landing limits for Dekai airstrip' },
  { task: 'Audit vendor ground handling procedures in Wamena' },
  { task: 'Update aircraft technical dispatch checklist (MEL)' },
  { task: 'Simulate medical evacuation (Medevac) scenario' },
  { task: 'Coordinate with local clinic for rapid medical response' }
]);
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}

/* Animasi untuk ikon warning di modal */
.animation-pulse {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
