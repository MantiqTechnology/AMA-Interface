<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Emergency & Response</h1>
      <div class="text-caption text-medium-emphasis">Emergency Response Plan (ERP) & Readiness Analytics</div>
    </div>

    <!-- Sub-menu Navigation -->
    <VTabs v-model="activeTab" color="primary">
      <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
      </VTab>
      <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
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
      <VTab value="assurance" to="/sms/SafetyAssurance" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
      </VTab>
      <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
      </VTab>
      <VTab value="communication" to="/sms/Communication" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
      <VTab value="regulatory" to="/sms/Regulatory" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-gavel" size="18" class="mr-2" /> Regulatory
      </VTab>
      <VTab value="governance" to="/sms/SafetyTraining" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-school-outline" size="18" class="mr-2" /> Governance
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
          :items="stationOptions"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
        <VBtn variant="outlined" density="compact" class="text-none mt-1" @click="showFilterModal = true">
          <VIcon icon="mdi-filter-variant" class="mr-1" /> Filters
        </VBtn>
        <VSpacer />
        <span class="text-caption text-medium-emphasis mr-2">Last updated: {{ lastUpdated }}</span>
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          @click="handleRefresh"
          class="text-none font-weight-bold"
          style="background-color: #f0f4ff; border-color: #d0d9f5"
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
        <SmsKpiCard 
          title="ERP Readiness" 
          :value="activeEmergencyCount > 0 ? 'ALERT' : 'READY'" 
          :icon="activeEmergencyCount > 0 ? 'mdi-alert-circle' : 'mdi-shield-check'" 
          :color="activeEmergencyCount > 0 ? 'warning' : 'success'" 
        />
      </VCol>
      <VCol cols="12" md="4">
        <SmsKpiCard 
          title="Active Emergency" 
          :value="activeEmergencyCount.toString()" 
          icon="mdi-ambulance" 
          :color="activeEmergencyCount > 0 ? 'error' : 'success'" 
        />
      </VCol>
      <VCol cols="12" md="4">
        <SmsKpiCard 
          title="Response Readiness" 
          :value="readinessPercentage" 
          icon="mdi-percent" 
          color="primary" 
          target="Target: 100%" 
        />
      </VCol>

      <!-- Middle Row: Emergency Events vs Checklist -->
      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100">
          <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-2">
            <div>
              <div class="text-subtitle-2 font-weight-bold">Emergency Events ({{ selectedTimeframeText }})</div>
              <div class="text-caption text-medium-emphasis">Distribusi insiden {{ selectedTimeframeSubtitle }}</div>
            </div>
            <div class="d-flex align-center ga-2">
              <VSelect
                v-model="selectedTimeframe"
                :items="timeframeOptions"
                item-title="text"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
                style="min-width: 130px;"
              />
              <VChip color="error" size="small" variant="tonal" class="font-weight-bold">
                {{ currentTotalEvents }} Total Insiden
              </VChip>
            </div>
          </div>
          <div class="d-flex flex-column ga-3">
            <div v-for="event in currentEmergencyEvents" :key="event.label" class="d-flex align-center">
              <span class="text-body-2 text-medium-emphasis flex-grow-1" style="min-width: 140px;">{{ event.label }}</span>
              <VProgressLinear
                :model-value="(event.value / currentMaxEventValue) * 100"
                color="error"
                height="12"
                rounded
                class="mx-3"
              />
              <div class="text-right" style="min-width: 65px;">
                <span class="text-subtitle-2 font-weight-bold mr-1">{{ event.value }}</span>
                <span class="text-caption text-medium-emphasis">({{ currentTotalEvents > 0 ? Math.round((event.value / currentTotalEvents) * 100) : 0 }}%)</span>
              </div>
            </div>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border class="pa-4 h-100">
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2 font-weight-bold">Response Readiness Checklist</div>
            <div class="text-caption text-medium-emphasis">*Klik item untuk mengubah status</div>
          </div>
          <VList density="compact" class="pa-0">
            <VListItem 
              v-for="(check, index) in readinessChecklist" 
              :key="check.item" 
              class="px-2 rounded hover-bg cursor-pointer"
              @click="toggleChecklist(index)"
            >
              <template v-slot:prepend>
                <VIcon :icon="check.status ? 'mdi-check-circle' : 'mdi-close-circle'" :color="check.status ? 'success' : 'error'" class="mr-3" />
              </template>
              <VListItemTitle class="text-body-2 font-weight-medium">{{ check.item }}</VListItemTitle>
              <template v-slot:append>
                <VChip size="x-small" :color="check.status ? 'success' : 'error'" variant="tonal" class="font-weight-bold">
                  {{ check.status ? 'VERIFIED' : 'PENDING' }}
                </VChip>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <!-- Full Width Chart Row (Dengan Filter 6 Periode Waktu) -->
      <VCol cols="12">
        <VCard border class="pa-4">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
            <div>
              <div class="text-subtitle-2 font-weight-bold">Emergency / Response Trend</div>
              <div class="text-caption text-medium-emphasis">Analisis tren kedaruratan berdasarkan periode waktu</div>
            </div>

            <!-- Toggle Filter Granularitas Waktu Lengkap -->
            <VBtnToggle
              v-model="selectedTimeframe"
              color="primary"
              density="compact"
              mandatory
              variant="outlined"
              class="flex-wrap"
            >
              <VBtn value="daily" class="text-none">Harian</VBtn>
              <VBtn value="weekly" class="text-none">Mingguan</VBtn>
              <VBtn value="monthly" class="text-none">Bulanan</VBtn>
              <VBtn value="yearly" class="text-none">Tahunan</VBtn>
              <VBtn value="3years" class="text-none">3 Tahun</VBtn>
              <VBtn value="5years" class="text-none">5 Tahun</VBtn>
            </VBtnToggle>
          </div>

          <!-- Trend Chart Component Dinamis -->
          <SmsTrendChart
            :title="`Trend Kedaruratan (${selectedTimeframeLabel})`"
            v-bind="currentTrendData"
            height="280"
          />
          <div class="text-caption text-medium-emphasis text-center mt-2 italic">* Data diperbarui secara real-time berdasarkan filter periode yang dipilih</div>
        </VCard>
      </VCol>

      <!-- Bottom Row: Recent Events vs Post-Event Actions -->
      <VCol cols="12" md="6">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 d-flex justify-space-between align-center border-b">
            <div class="text-subtitle-2 font-weight-bold">Recent Emergency Events</div>
            <VBtn size="small" variant="text" color="primary" class="text-none" @click="showLogModal = true">View Log</VBtn>
          </div>
          <div class="flex-grow-1 overflow-y-auto" style="max-height: 250px;">
            <VTable density="compact" class="bg-transparent">
              <tbody>
                <tr v-for="log in filteredRecentEvents" :key="log.id" class="hover-bg">
                  <td class="text-caption font-weight-bold px-4" style="width: 80px;">{{ log.id }}</td>
                  <td class="text-body-2 px-2 py-2">{{ log.event }}</td>
                  <td class="text-caption text-medium-emphasis text-right px-4">{{ log.date }}</td>
                </tr>
                <tr v-if="filteredRecentEvents.length === 0">
                  <td colspan="3" class="text-center text-caption py-4 text-medium-emphasis">Tidak ada log darurat sesuai filter.</td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border class="h-100 d-flex flex-column">
          <div class="pa-4 pb-2 text-subtitle-2 font-weight-bold border-b">Post-Event Actions</div>
          <div class="flex-grow-1 overflow-y-auto pa-2" style="max-height: 250px;">
            <VList density="compact" class="pa-0">
              <VListItem v-for="(action, idx) in postEventActions" :key="action.task" class="px-2 py-1 mb-1 rounded hover-bg">
                <template v-slot:prepend>
                  <VIcon :icon="action.done ? 'mdi-check-box-outline' : 'mdi-chevron-right-box-outline'" :color="action.done ? 'success' : 'primary'" class="mr-2" />
                </template>
                <VListItemTitle class="text-body-2" :class="{ 'text-decoration-line-through text-medium-emphasis': action.done }">
                  {{ action.task }}
                </VListItemTitle>
                <template v-slot:append>
                  <VBtn 
                    size="small" 
                    :variant="action.done ? 'tonal' : 'outlined'" 
                    :color="action.done ? 'success' : 'primary'" 
                    density="compact" 
                    class="text-none"
                    @click="toggleActionStatus(idx)"
                  >
                    {{ action.done ? 'Completed' : 'Update' }}
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
          
          <VRow density="comfortable">
            <VCol cols="4">
              <div class="text-caption text-medium-emphasis text-uppercase">Completed</div>
              <div class="text-h5 font-weight-bold text-success">8</div>
            </VCol>
            <VCol cols="4" class="border-s pl-4">
              <div class="text-caption text-medium-emphasis text-uppercase">Scheduled</div>
              <div class="text-h5 font-weight-bold text-info">2</div>
            </VCol>
            <!-- SESUDAH (Dinamis) -->
            <VCol cols="4" class="border-s pl-4">
              <div class="text-caption text-medium-emphasis text-uppercase">Overdue</div>
              <div class="text-h5 font-weight-bold text-error">{{ overdueCount }}</div>
            </VCol>
          </VRow>
        </VCard>
      </VCol>

    </VRow>
  </VContainer>

  <!-- MODAL DARURAT ICAO / BASARNAS -->
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
        <div v-if="emergencyStep === 1">
          <p class="text-body-2 mb-4 text-medium-emphasis">
            Peringatan: Aktivasi ini akan memicu <strong>One-Click ERP</strong>. Sinyal distress, koordinat LKP, dan manifes penerbangan akan disiarkan ke BASARNAS (MCC) dan AirNav Indonesia.
          </p>
          
          <VRow dense>
            <VCol cols="12">
              <VSelect 
                v-model="erForm.flight"
                label="Pilih Penerbangan Bermasalah (Active Flights)"
                :items="['AMA1264 (PK-AMA) | WMX-MII | Airborne', 'AMA1265 (PK-AMB) | DKI-MUL | Lost Contact']"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect 
                v-model="erForm.phase"
                label="Fase Kedaruratan ICAO"
                :items="['INCERFA (Uncertainty / Ragu-ragu)', 'ALERFA (Alert / Siaga)', 'DETRESFA (Distress / Bahaya)']"
                variant="outlined"
                density="comfortable"
                class="mb-1"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect 
                v-model="erForm.nature"
                label="Sifat Darurat (Nature of Emergency)"
                :items="['Aircraft Accident / Crash', 'Loss of Communication (7600)', 'Unlawful Interference / Hijack (7500)', 'Engine Failure / Technical (7700)', 'Medical Emergency']"
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

        <div v-else-if="emergencyStep === 2" class="text-center py-6">
          <VProgressCircular indeterminate color="error" size="64" class="mb-4" />
          <div class="text-h6 font-weight-bold text-error">TRANSMITTING DISTRESS SIGNAL...</div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            Menyiarkan data telemetri, LKP, POB, dan Endurance ke API BASARNAS.<br>
            Aktivasi SMS/WA Blast ke Crisis Management Center (CMC) Internal...<br>
            <strong>Menunggu konfirmasi respon dari Command Center...</strong>
          </div>
        </div>

        <div v-else-if="emergencyStep === 3" class="text-center py-6">
          <VIcon icon="mdi-check-decagram" color="success" size="80" class="mb-2" />
          <div class="text-h5 font-weight-black text-success">ERP ACTIVATED & ACKNOWLEDGED</div>
          <VCard border class="mt-4 pa-4 bg-green-lighten-5 text-left d-inline-block w-100">
            <div class="text-caption font-weight-bold mb-2 text-success-darken-1">Status: BASARNAS (MCC) & AirNav Notified. CMC Activated.</div>
            <VDivider class="mb-2" />
            <div class="text-caption mb-1"><strong>Fase Darurat:</strong> {{ erForm.phase || 'DETRESFA' }}</div>
            <div class="text-caption mb-1"><strong>Waktu Transmisi (UTC):</strong> {{ currentUtcTime }}</div>
            <div class="text-caption mb-1"><strong>No. Laporan SAR:</strong> SAR-AMA-260822-001A</div>
            <div class="text-caption mt-3 text-medium-emphasis">Silakan pindah ke ruang Crisis Center dan buka "Active Emergency" log untuk pembaruan koordinasi operasi SAR.</div>
          </VCard>
        </div>
      </VCardText>

      <VDivider />
      
      <VCardActions class="pa-4 bg-grey-lighten-4">
        <VSpacer />
        <VBtn v-if="emergencyStep === 1" variant="text" @click="closeEmergency" class="text-none">Batal</VBtn>
        <VBtn v-if="emergencyStep === 1" color="error" variant="elevated" @click="triggerBroadcast" class="text-none font-weight-bold">
          <VIcon icon="mdi-radio-tower" class="mr-2" /> BROADCAST SEKARANG
        </VBtn>
        <VBtn v-if="emergencyStep === 3" color="success" variant="elevated" @click="closeEmergency" class="text-none font-weight-bold">
          TUTUP & PANTAU LOG
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- MODAL ADVANCED FILTERS -->
  <VDialog v-model="showFilterModal" max-width="450">
    <VCard>
      <VCardTitle class="font-weight-bold text-subtitle-1 pa-4 border-b">
        Filter Parameters
      </VCardTitle>
      <VCardText class="pa-4">
        <VSelect
          v-model="filters.station"
          label="Pilih Stasiun"
          :items="stationOptions"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />
        <VSelect
          v-model="filters.severity"
          label="Tingkat Severitas Incident"
          :items="['All Severity', 'High Risk', 'Medium Risk', 'Low Risk']"
          variant="outlined"
          density="comfortable"
        />
      </VCardText>
      <VCardActions class="pa-4 border-t bg-grey-lighten-5">
        <VSpacer />
        <VBtn variant="text" @click="resetFilters" class="text-none">Reset</VBtn>
        <VBtn color="primary" variant="elevated" @click="applyFilters" class="text-none font-weight-bold">Terapkan Filter</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- MODAL VIEW LOG DETAILS -->
  <VDialog v-model="showLogModal" max-width="700">
    <VCard>
      <VCardTitle class="font-weight-bold text-subtitle-1 pa-4 border-b d-flex justify-space-between align-center">
        <span>Emergency Events Log History</span>
        <VBtn icon="mdi-close" variant="text" density="compact" @click="showLogModal = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th class="text-left font-weight-bold">ID</th>
              <th class="text-left font-weight-bold">Kategori Insiden / Event</th>
              <th class="text-right font-weight-bold">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in recentEvents" :key="log.id">
              <td class="font-weight-bold text-caption">{{ log.id }}</td>
              <td>{{ log.event }}</td>
              <td class="text-right text-caption text-medium-emphasis">{{ log.date }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- SNACKBAR NOTIFIKASI SEMENTARA -->
  <VSnackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
    {{ snackbar.text }}
  </VSnackbar>
</template>

<script setup lang="ts">
// Nuxt 3 Auto-imports: ref, computed, reactive
const overdueCount = computed(() => {
  return postEventActions.value.filter(action => !action.done).length
})
const activeTab = ref('emergency')
const lastUpdated = ref('22 Aug 2026 10:30 WIB')

// Active Emergency counter state (Simulasi in-memory)
const activeEmergencyCount = ref(0)

// Toast Feedback Notification
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

function notify(text: string, color = 'success') {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

function handleRefresh() {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(now.getDate()).padStart(2, '0')
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  lastUpdated.value = `${day} ${month} ${year} ${hours}:${mins} WIB`
  notify('Data berhasil diperbarui secara real-time')
}

// ==========================================
// STATE & LOGIKA MODAL DARURAT BASARNAS
// ==========================================
const showEmergencyModal = ref(false)
const emergencyStep = ref(1)

const erForm = reactive({
  flight: '',
  phase: '',
  nature: '',
  pob: '',
  endurance: '',
  lkp: ''
})

const currentUtcTime = computed(() => {
  const now = new Date()
  return now.toISOString().replace('T', ' ').substring(0, 19) + ' Z'
})

function triggerBroadcast() {
  emergencyStep.value = 2
  setTimeout(() => {
    emergencyStep.value = 3
    
    // Simpan darurat baru secara sementara (in-memory)
    activeEmergencyCount.value += 1
    
    const newId = `ERP-${String(recentEvents.value.length + 1).padStart(3, '0')}`
    const nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const eventText = `${erForm.nature || 'Emergency Event'} - ${erForm.flight ? erForm.flight.split(' ')[0] : 'PK-AMA'} (${erForm.phase ? erForm.phase.split(' ')[0] : 'DETRESFA'})`
    
    recentEvents.value.unshift({
      id: newId,
      event: eventText,
      date: nowStr
    })

    // Tambahkan count pada grafik breakdown harian/tahunan
    emergencyEventsMap.yearly[0].value += 1
    emergencyEventsMap.daily[0].value += 1
    trendDataMap.daily.series[0].data[6] += 1
    
    notify('Sinyal darurat berhasil disiarkan & disimpan sementara!', 'error')
  }, 2500)
}

function closeEmergency() {
  showEmergencyModal.value = false
  setTimeout(() => {
    emergencyStep.value = 1
    erForm.flight = ''
    erForm.phase = ''
    erForm.nature = ''
    erForm.pob = ''
    erForm.endurance = ''
    erForm.lkp = ''
  }, 300)
}

// ==========================================
// FILTERS STATE & DIALOG
// ==========================================
const showFilterModal = ref(false)
const showLogModal = ref(false)
const stationOptions = ['All Station', 'Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)', 'Nabire (NBX)']

const filters = reactive({
  dateRange: '01 Jan – 22 Aug 2026',
  station: 'All Station',
  severity: 'All Severity'
})

function applyFilters() {
  showFilterModal.value = false
  notify(`Filter diterapkan: Stasiun ${filters.station}`)
}

function resetFilters() {
  filters.station = 'All Station'
  filters.severity = 'All Severity'
  showFilterModal.value = false
  notify('Filter dikembalikan ke awal')
}

// Filtered Recent Events
const filteredRecentEvents = computed(() => {
  return recentEvents.value
})

// ==========================================
// OPSI & STATE PERIODE TIMEFRAME (6 PERIODE)
// ==========================================
type TimeframeOption = 'daily' | 'weekly' | 'monthly' | 'yearly' | '3years' | '5years'

const selectedTimeframe = ref<TimeframeOption>('yearly')

const timeframeOptions = [
  { text: 'Harian', value: 'daily' },
  { text: 'Mingguan', value: 'weekly' },
  { text: 'Bulanan', value: 'monthly' },
  { text: 'Tahunan', value: 'yearly' },
  { text: '3 Tahun', value: '3years' },
  { text: '5 Tahun', value: '5years' }
]

const selectedTimeframeText = computed(() => {
  switch (selectedTimeframe.value) {
    case 'daily': return 'Harian'
    case 'weekly': return 'Mingguan'
    case 'monthly': return 'Bulanan'
    case 'yearly': return 'Tahunan'
    case '3years': return '3 Tahun'
    case '5years': return '5 Tahun'
    default: return 'Tahunan'
  }
})

const selectedTimeframeSubtitle = computed(() => {
  switch (selectedTimeframe.value) {
    case 'daily': return '7 hari terakhir'
    case 'weekly': return '4 minggu terakhir'
    case 'monthly': return '6 bulan terakhir'
    case 'yearly': return 'tahun berjalan'
    case '3years': return '3 tahun terakhir (2024–2026)'
    case '5years': return '5 tahun terakhir (2022–2026)'
    default: return 'tahun berjalan'
  }
})

const selectedTimeframeLabel = computed(() => {
  switch (selectedTimeframe.value) {
    case 'daily': return 'Harian (7 Hari Terakhir)'
    case 'weekly': return 'Mingguan (4 Minggu Terakhir)'
    case 'monthly': return 'Bulanan (6 Bulan Terakhir)'
    case 'yearly': return 'Tahunan (Year-To-Date 2026)'
    case '3years': return '3 Tahun Terakhir (2024 – 2026)'
    case '5years': return '5 Tahun Terakhir (2022 – 2026)'
    default: return 'Tahunan'
  }
})

// ==========================================
// DATASET EMERGENCY EVENTS BREAKDOWN (DYNAMIC)
// ==========================================
const emergencyEventsMap = reactive<Record<TimeframeOption, Array<{ label: string; value: number }>>>({
  daily: [
    { label: 'Weather Emergency', value: 1 },
    { label: 'Aircraft Incident', value: 1 },
    { label: 'Technical Event', value: 1 },
    { label: 'Medical Emergency', value: 0 },
  ],
  weekly: [
    { label: 'Weather Emergency', value: 4 },
    { label: 'Technical Event', value: 3 },
    { label: 'Aircraft Incident', value: 2 },
    { label: 'Medical Emergency', value: 1 },
  ],
  monthly: [
    { label: 'Weather Emergency', value: 6 },
    { label: 'Aircraft Incident', value: 5 },
    { label: 'Medical Emergency', value: 4 },
    { label: 'Technical Event', value: 3 },
  ],
  yearly: [
    { label: 'Weather Emergency', value: 8 },
    { label: 'Aircraft Incident', value: 6 },
    { label: 'Technical Event', value: 5 },
    { label: 'Medical Emergency', value: 5 },
  ],
  '3years': [
    { label: 'Weather Emergency', value: 26 },
    { label: 'Technical Event', value: 18 },
    { label: 'Aircraft Incident', value: 15 },
    { label: 'Medical Emergency', value: 13 },
  ],
  '5years': [
    { label: 'Weather Emergency', value: 42 },
    { label: 'Technical Event', value: 30 },
    { label: 'Aircraft Incident', value: 25 },
    { label: 'Medical Emergency', value: 21 },
  ]
})

const currentEmergencyEvents = computed(() => {
  return emergencyEventsMap[selectedTimeframe.value] || emergencyEventsMap.yearly
})

const currentTotalEvents = computed(() => {
  return currentEmergencyEvents.value.reduce((sum, item) => sum + item.value, 0)
})

const currentMaxEventValue = computed(() => {
  return Math.max(...currentEmergencyEvents.value.map(item => item.value), 1)
})

// ==========================================
// DATASET TREND CHART (DYNAMIC 6 PERIODE)
// ==========================================
const trendDataMap = reactive<Record<TimeframeOption, { categories: string[]; series: Array<{ name: string; color: string; data: number[] }> }>>({
  daily: {
    categories: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    series: [
      { name: 'Emergency Events', color: '#E53935', data: [1, 0, 1, 0, 1, 0, 0] }
    ]
  },
  weekly: {
    categories: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
    series: [
      { name: 'Emergency Events', color: '#E53935', data: [2, 4, 1, 3] }
    ]
  },
  monthly: {
    categories: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    series: [
      { name: 'Emergency Events', color: '#E53935', data: [3, 5, 4, 6, 4, 2] }
    ]
  },
  yearly: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    series: [
      { name: 'Emergency Events (Tahunan)', color: '#E53935', data: [2, 4, 3, 5, 4, 6, 4, 2] }
    ]
  },
  '3years': {
    categories: ['2024', '2025', '2026'],
    series: [
      { name: 'Emergency Events (3 Tahun)', color: '#E53935', data: [22, 26, 24] }
    ]
  },
  '5years': {
    categories: ['2022', '2023', '2024', '2025', '2026'],
    series: [
      { name: 'Emergency Events (5 Tahun)', color: '#E53935', data: [18, 22, 22, 26, 24] }
    ]
  }
})

const currentTrendData = computed(() => {
  return trendDataMap[selectedTimeframe.value] || trendDataMap.yearly
})

// ==========================================
// CHECKLIST & ACTIONS STATE (INTERAKTIF IN-MEMORY)
// ==========================================
const readinessChecklist = ref([
  { item: 'Emergency Plan (ERP) Updated', status: true },
  { item: 'Emergency Contacts Verified', status: true },
  { item: 'Response Team Assigned', status: true },
  { item: 'Communication Equipment Ready', status: true },
  { item: 'Medical Evacuation Contract Active', status: false }
])

function toggleChecklist(index: number) {
  readinessChecklist.value[index].status = !readinessChecklist.value[index].status
  const statusStr = readinessChecklist.value[index].status ? 'VERIFIED' : 'PENDING'
  notify(`Status "${readinessChecklist.value[index].item}" diubah ke ${statusStr}`)
}

const readinessPercentage = computed(() => {
  const verifiedCount = readinessChecklist.value.filter(c => c.status).length
  const total = readinessChecklist.value.length
  return Math.round((verifiedCount / total) * 100) + '%'
})

const recentEvents = ref([
  { id: 'ERP-010', event: 'Aircraft Incident (Hard Landing / Runway Excursion)', date: '12 Aug 2026' },
  { id: 'ERP-009', event: 'Medical Emergency (Passenger Seizure In-flight)', date: '08 Aug 2026' },
  { id: 'ERP-008', event: 'Security Threat (Unruly Passenger at Gate)', date: '28 Jul 2026' },
  { id: 'ERP-007', event: 'Weather Emergency (Severe Windshear / Divert)', date: '19 Jul 2026' },
  { id: 'ERP-006', event: 'Technical Event (Engine Flameout Simulation)', date: '02 Jul 2026' },
  { id: 'ERP-005', event: 'Ground Handling Incident (Tug Collision)', date: '21 Jun 2026' },
  { id: 'ERP-004', event: 'Weather Emergency (Microburst at Final Approach)', date: '15 Jun 2026' },
  { id: 'ERP-003', event: 'Medical Emergency (Crew Incapacitation)', date: '01 Jun 2026' },
  { id: 'ERP-002', event: 'Technical Event (Landing Gear Fault Warning)', date: '22 May 2026' },
  { id: 'ERP-001', event: 'Aircraft Incident (Tail Strike at Takeoff)', date: '10 May 2026' }
])

const postEventActions = ref([
  { task: 'Update ERP contact list for Sentani Hub', done: false },
  { task: 'Review SAR escalation procedure with BASARNAS', done: true },
  { task: 'Communication drill execution with ATC Papua', done: false },
  { task: 'Emergency equipment (First Aid & Defibrillator) verification', done: true },
  { task: 'Conduct recurrent training for unruly passenger handling', done: false },
  { task: 'Revise crosswind landing limits for Dekai airstrip', done: false },
  { task: 'Audit vendor ground handling procedures in Wamena', done: false },
  { task: 'Update aircraft technical dispatch checklist (MEL)', done: true },
  { task: 'Simulate medical evacuation (Medevac) scenario', done: false },
  { task: 'Coordinate with local clinic for rapid medical response', done: false }
])

function toggleActionStatus(index: number) {
  postEventActions.value[index].done = !postEventActions.value[index].done
  const statusStr = postEventActions.value[index].done ? 'Selesai' : 'Perlu Diperbarui'
  notify(`Status tugas diubah: ${statusStr}`)
}
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #E0E0E0;
  border-radius: 4px;
}

.animation-pulse {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
</style>