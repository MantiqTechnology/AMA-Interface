<template>
  <div>
    <!-- ========================================== -->
    <!-- 1. HEADER & NAVIGATION TABS                -->
    <!-- ========================================== -->
    <VContainer fluid class="pb-0">
      <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
        <div>
          <h1 class="text-h5 font-weight-bold">Flight Risk Matrix (FRAT)</h1>
          <div class="text-caption text-medium-emphasis">Pre-flight Risk Assessment & Safety Management System</div>
        </div>

        <!-- FITUR PRESENTASI: Tombol Aksi Cepat / Pengujian Demo -->
        <div class="d-flex align-center ga-2">
          <VBtn color="error" variant="tonal" size="small" prepend-icon="mdi-alert-octagram" class="text-none"
            @click="simulateHighRiskDemo">
            Simulasi High Risk
          </VBtn>
          <VBtn color="secondary" variant="outlined" size="small" prepend-icon="mdi-restore" class="text-none"
            @click="resetDemoData">
            Reset Data Demo
          </VBtn>
        </div>
      </div>

      <!-- Tab Navigasi Modul SMS -->
      <VTabs v-model="activeTab" color="primary" show-arrows>
        <VTab value="overview" to="/sms/Dashboard" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
        </VTab>
        <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard Reporting
        </VTab>
        <VTab value="frat" value-key="frat" class="text-none font-weight-bold">
          <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> Flight Risk (FRAT)
        </VTab>
        <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
          <VIcon icon="mdi-clipboard-check-outline" size="18" class="mr-2" /> CAPA
        </VTab>
        <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-medium text-medium-emphasis">
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

      <!-- ========================================== -->
      <!-- 2. FILTER TOOLBAR                          -->
      <!-- ========================================== -->
      <VCard border class="pa-3 my-4">
        <VRow dense align="center" class="mb-2">
          <VCol cols="12" sm="6" md>
            <VTextField v-model="filters.dateRange" label="Tanggal Ops" prepend-inner-icon="mdi-calendar-range"
              variant="outlined" density="compact" hide-details />
          </VCol>
          <VCol cols="12" sm="6" md>
            <VSelect v-model="filters.station" label="Station" :items="stationOptions" variant="outlined"
              density="compact" hide-details />
          </VCol>
          <VCol cols="12" sm="6" md>
            <VSelect v-model="filters.aircraft" label="Pesawat" :items="aircraftOptions" variant="outlined"
              density="compact" hide-details />
          </VCol>
          <VCol cols="12" sm="6" md>
            <VSelect v-model="filters.riskLevel" label="Tingkat Risiko" :items="riskLevelOptions" variant="outlined"
              density="compact" hide-details />
          </VCol>
          <VCol cols="12" sm="6" md>
            <VSelect v-model="filters.status" label="Status FRAT" :items="statusOptions" variant="outlined"
              density="compact" hide-details />
          </VCol>
        </VRow>

        <div class="d-flex align-center justify-space-between pt-2 border-t flex-wrap ga-2">
          <div class="d-flex align-center ga-3">
            <span class="text-caption text-medium-emphasis">Terakhir diperbarui: {{ lastUpdated }}</span>
            <VBtn variant="text" color="primary" density="compact" prepend-icon="mdi-refresh" class="text-none text-caption"
              @click="handleRefresh">
              Refresh Data
            </VBtn>
          </div>

          <div class="d-flex align-center ga-2">
            <VBtn variant="outlined" density="compact" class="text-none" @click="resetFilters">
              <VIcon icon="mdi-filter-off-outline" class="mr-1" /> Reset Filter
            </VBtn>
            <VBtn color="primary" density="compact" prepend-icon="mdi-plus" class="text-none"
              @click="isNewFratDialogOpen = true">
              Assessment Baru
            </VBtn>
          </div>
        </div>
      </VCard>
    </VContainer>

    <!-- ========================================== -->
    <!-- 3. MAIN DASHBOARD CONTENT                  -->
    <!-- ========================================== -->
    <VContainer fluid class="pt-0">
      <!-- Grid KPI Cards -->
      <VRow class="mb-3" dense>
        <VCol v-for="(kpi, i) in fratKpis" :key="i" cols="12" sm="6" md="3" lg="3">
          <SmsKpiCard v-bind="kpi" />
        </VCol>
      </VRow>

      <!-- VISUALISASI 1: Matriks Risiko 5x5 & Tren FRAT -->
      <VRow class="mb-3">
        <!-- 5x5 Flight Risk Matrix -->
        <VCol cols="12" lg="6">
          <VCard border class="pa-4 h-100">
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="text-subtitle-2 font-weight-bold">Flight Risk Matrix (Severity vs Likelihood)</div>
              <VChip size="x-small" color="info" variant="tonal">Interaktif</VChip>
            </div>

            <div class="d-flex align-stretch">
              <!-- Label Sumbu Y (Severity) -->
              <div class="d-flex flex-column justify-space-between mr-2 text-caption text-medium-emphasis pb-6 text-center">
                <div v-for="s in severityLabels" :key="s.val">
                  {{ s.val }}<br><span class="text-x-small">{{ s.text }}</span>
                </div>
              </div>

              <!-- Grid Sel Matriks 5x5 -->
              <div class="flex-grow-1">
                <div class="d-flex flex-column ga-1">
                  <div v-for="(row, rIdx) in matrixGrid" :key="rIdx" class="d-flex ga-1">
                    <div v-for="(cell, cIdx) in row" :key="cIdx"
                      :class="[getMatrixColorClass(cell.level), 'text-center py-2 flex-grow-1 font-weight-bold rounded-sm cursor-pointer elevation-1']"
                      @click="filterByMatrix(cell.level)">
                      {{ cell.count }}
                    </div>
                  </div>
                </div>

                <!-- Label Sumbu X (Likelihood) -->
                <div class="d-flex justify-space-between mt-2 text-caption text-medium-emphasis">
                  <div v-for="l in likelihoodLabels" :key="l.val" class="text-center px-1">
                    {{ l.val }}<br><span class="text-x-small">{{ l.text }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="text-caption text-medium-emphasis mt-3 font-italic">
              *Klik angka di dalam sel matriks untuk menyaring penerbangan berdasarkan tingkat risiko.
            </div>
          </VCard>
        </VCol>

        <!-- Grafik Tren Nilai FRAT -->
        <VCol cols="12" lg="6">
          <SmsTrendChart title="Tren Skor FRAT (7 Hari Terakhir)" v-bind="fratTrend" class="h-100" />
        </VCol>
      </VRow>

      <!-- VISUALISASI 2: Ringkasan Distribusi & Kepatuhan -->
      <VRow class="mb-3">
        <VCol cols="12" md="4">
          <SmsDonutSummary title="Distribusi Risiko Flight" v-bind="riskDistribution" class="h-100" />
        </VCol>

        <VCol cols="12" md="4">
          <SmsDonutSummary title="Status Fatigue Awak Pesawat" v-bind="fatigueSummary" class="h-100" />
        </VCol>

        <VCol cols="12" md="4">
          <VCard border class="pa-4 h-100 d-flex flex-column justify-center">
            <div class="text-subtitle-2 font-weight-bold mb-2">Tingkat Kepatuhan FRAT</div>
            <div class="d-flex align-center my-auto">
              <VIcon icon="mdi-shield-check-outline" color="success" size="48" class="mr-3" />
              <div>
                <div class="text-h3 font-weight-bold">100%</div>
                <div class="text-caption text-medium-emphasis">
                  {{ flightsList.length }} / {{ flightsList.length }} Flight Tervalidasi
                </div>
              </div>
            </div>
            <VProgressLinear value="100" color="success" height="8" rounded class="mt-3" />
            <div class="text-caption text-medium-emphasis mt-2 text-right">Target SMS: 100% Compliance</div>
          </VCard>
        </VCol>
      </VRow>

      <!-- DATA TABEL UTAMA & SIDEBAR DETAIL -->
      <VRow>
        <VCol cols="12" lg="8" xl="9">
          <VCard border class="h-100">
            <!-- Filter Quick Chips -->
            <div class="d-flex align-center pa-3 border-b flex-wrap ga-2">
              <VChipGroup v-model="tableFilter" selected-class="text-primary" mandatory density="compact">
                <VChip value="all" variant="outlined">Semua
                  <VBadge color="primary" :content="flightsList.length" inline class="ml-1" />
                </VChip>
                <VChip value="low" variant="outlined" class="text-success border-success">Low Risk
                  <VBadge color="success" :content="countByRisk('Low')" inline class="ml-1" />
                </VChip>
                <VChip value="medium" variant="outlined" class="text-warning border-warning">Medium Risk
                  <VBadge color="warning" :content="countByRisk('Medium')" inline class="ml-1" />
                </VChip>
                <VChip value="high" variant="outlined" class="text-error border-error">High Risk
                  <VBadge color="error" :content="countByRisk('High')" inline class="ml-1" />
                </VChip>
                <VChip value="blocked" variant="outlined">Blocked
                  <VBadge color="error" :content="countByStatus('Blocked')" inline class="ml-1" />
                </VChip>
                <VChip value="override" variant="outlined">Override
                  <VBadge color="deep-purple-accent-1" :content="countByStatus('Released (Override)')" inline class="ml-1" />
                </VChip>
              </VChipGroup>
              <VSpacer />
              <VBtn variant="text" prepend-icon="mdi-download" density="compact" class="text-none text-medium-emphasis"
                @click="exportFratData">Ekspor CSV</VBtn>
            </div>

            <!-- Tabel Data Penerbangan -->
            <VTable density="compact" hover responsive>
              <thead>
                <tr>
                  <th class="text-subtitle-2 font-weight-bold">Flight ID</th>
                  <th class="text-subtitle-2 font-weight-bold">Waktu</th>
                  <th class="text-subtitle-2 font-weight-bold">Station</th>
                  <th class="text-subtitle-2 font-weight-bold">Pesawat</th>
                  <th class="text-subtitle-2 font-weight-bold">Rute</th>
                  <th class="text-subtitle-2 font-weight-bold text-center">Skor</th>
                  <th class="text-subtitle-2 font-weight-bold">Tingkat Risiko</th>
                  <th class="text-subtitle-2 font-weight-bold">Status Fatigue</th>
                  <th class="text-subtitle-2 font-weight-bold">Status Rilis</th>
                  <th class="text-subtitle-2 font-weight-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flight in paginatedFlights" :key="flight.id" class="cursor-pointer"
                  :class="{ 'bg-grey-lighten-4': selectedFlight?.id === flight.id }" @click="selectFlight(flight)">
                  <td class="text-body-2 font-weight-bold text-primary">{{ flight.id }}</td>
                  <td class="text-caption">{{ flight.datetime }}</td>
                  <td class="text-caption">{{ flight.station }}</td>
                  <td class="text-caption">{{ flight.aircraft }}</td>
                  <td class="text-caption font-weight-bold">{{ flight.route }}</td>
                  <td :class="['font-weight-bold text-center', textRiskColor(flight.risk)]">{{ flight.score }}</td>
                  <td>
                    <VChip :color="riskColor(flight.risk)" size="x-small" variant="outlined"
                      class="font-weight-bold bg-white">{{ flight.risk }}</VChip>
                  </td>
                  <td>
                    <VChip :color="fatigueColor(flight.fatigue)" size="x-small" variant="tonal" class="font-weight-bold">
                      {{ flight.fatigue }}</VChip>
                  </td>
                  <td>
                    <VChip :color="fratStatusColor(flight.status)" size="x-small" variant="flat"
                      :class="flight.status === 'Released' ? 'text-white' : ''">{{ flight.status }}</VChip>
                  </td>
                  <td class="text-center">
                    <div class="d-flex justify-center ga-1">
                      <VBtn icon="mdi-eye-outline" variant="text" density="compact" color="primary"
                        @click.stop="openDetailDialog(flight)" />
                      <VBtn icon="mdi-pencil-outline" variant="text" density="compact" color="grey-darken-1"
                        @click.stop="editFlight(flight)" />
                    </div>
                  </td>
                </tr>
                <tr v-if="paginatedFlights.length === 0">
                  <td colspan="10" class="text-center text-medium-emphasis py-4">Tidak ada penerbangan yang sesuai kriteria filter.</td>
                </tr>
              </tbody>
            </VTable>

            <div class="d-flex align-center pa-3 border-t">
              <span class="text-caption text-medium-emphasis">Halaman {{ page }} dari {{ maxPages }}</span>
              <VSpacer />
              <VPagination v-model="page" :length="maxPages" density="compact" active-color="primary" />
            </div>
          </VCard>
        </VCol>

        <!-- Sidebar Flight Terpilih -->
        <VCol cols="12" lg="4" xl="3">
          <VCard border class="pa-4 h-100" v-if="selectedFlight">
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="text-subtitle-2 font-weight-bold">Rincian Flight Terpilih</div>
              <a href="#" class="text-caption text-primary text-decoration-none font-weight-medium"
                @click.prevent="openDetailDialog(selectedFlight)">Lihat Dokumen</a>
            </div>

            <div class="d-flex align-center mb-1">
              <div class="text-h5 font-weight-bold">{{ selectedFlight.id }}</div>
              <VChip size="x-small" :color="fratStatusColor(selectedFlight.status)" variant="tonal"
                class="ml-2 font-weight-bold">
                {{ selectedFlight.status }}
              </VChip>
            </div>
            <div class="text-caption text-medium-emphasis mb-4">
              {{ selectedFlight.station }} — Rute: {{ selectedFlight.route }}<br>
              {{ selectedFlight.datetime }}
            </div>

            <VRow dense class="mb-3">
              <VCol cols="6">
                <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center bg-grey-lighten-5">
                  <div class="text-caption text-medium-emphasis">FRAT Score</div>
                  <div class="text-subtitle-1 font-weight-bold" :class="textRiskColor(selectedFlight.risk)">
                    {{ selectedFlight.score }} <span class="text-caption text-medium-emphasis">/ 10</span>
                  </div>
                </div>
              </VCol>
              <VCol cols="6">
                <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center bg-grey-lighten-5">
                  <div class="text-caption text-medium-emphasis">Tingkat Risiko</div>
                  <div class="text-subtitle-1 font-weight-bold" :class="textRiskColor(selectedFlight.risk)">
                    {{ selectedFlight.risk }}
                  </div>
                </div>
              </VCol>
              <VCol cols="6">
                <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center bg-grey-lighten-5">
                  <div class="text-caption text-medium-emphasis">Status Fatigue</div>
                  <div class="text-caption font-weight-bold"
                    :class="selectedFlight.fatigue === 'Fit for Duty' ? 'text-success' : 'text-warning'">
                    {{ selectedFlight.fatigue }}
                  </div>
                </div>
              </VCol>
              <VCol cols="6">
                <div class="border rounded pa-2 text-center h-100 d-flex flex-column justify-center bg-grey-lighten-5">
                  <div class="text-caption text-medium-emphasis">Pesawat</div>
                  <div class="text-caption font-weight-bold text-primary">{{ selectedFlight.aircraft }}</div>
                </div>
              </VCol>
            </VRow>

            <!-- Kesiapan Pilot (Input Manual) -->
            <div v-if="selectedFlight.pilotReadiness" class="mb-3 pa-2 border rounded bg-grey-lighten-5 text-caption">
              <div class="text-caption font-weight-bold text-medium-emphasis">Self-Assessment Pilot:</div>
              <div class="font-weight-medium text-primary">{{ selectedFlight.pilotReadiness }}</div>
            </div>

            <div class="text-caption font-weight-bold mb-2">Faktor Risiko Dominan:</div>
            <div v-for="(factor, idx) in selectedFlight.topRisks" :key="idx"
              class="d-flex justify-space-between text-caption mb-1 pb-1 border-b">
              <span class="text-medium-emphasis">{{ Number(idx) + 1 }}. {{ factor.name }}</span>
              <span class="font-weight-bold text-error">+{{ factor.score }}</span>
            </div>

            <!-- Rencana Mitigasi (Input Manual) -->
            <div v-if="selectedFlight.mitigationPlan" class="mt-3 pa-2 rounded bg-blue-lighten-5 border-blue">
              <div class="text-caption font-weight-bold text-primary">Tindakan Mitigasi Manual:</div>
              <div class="text-caption text-medium-emphasis">{{ selectedFlight.mitigationPlan }}</div>
            </div>

            <!-- Catatan Field (Input Manual) -->
            <div v-if="selectedFlight.specialNotes" class="mt-2 pa-2 rounded bg-amber-lighten-5 border-amber">
              <div class="text-caption font-weight-bold text-warning-darken-3">Catatan Kondisi Lapangan:</div>
              <div class="text-caption text-medium-emphasis">{{ selectedFlight.specialNotes }}</div>
            </div>

            <!-- Catatan Override jika ada -->
            <div v-if="selectedFlight.overrideReason" class="mt-2 pa-2 rounded bg-purple-lighten-5 border-purple">
              <div class="text-caption font-weight-bold text-deep-purple">Catatan Override Khusus:</div>
              <div class="text-caption text-medium-emphasis">{{ selectedFlight.overrideReason }}</div>
            </div>

            <div class="d-flex ga-2 mt-4">
              <VBtn variant="outlined" color="primary" class="text-none flex-grow-1"
                @click="isGuidelineDialogOpen = true">
                <VIcon icon="mdi-book-open-page-variant-outline" size="18" class="mr-1" /> Pedoman
              </VBtn>
              <VBtn variant="flat" color="primary" class="text-none flex-grow-1"
                @click="editFlight(selectedFlight)">
                Edit / Override
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>

    <!-- ========================================== -->
    <!-- 4. MODAL DIALOGS                          -->
    <!-- ========================================== -->

    <!-- DIALOG 1: NEW ASSESSMENT (DILENGKAPI INPUT MANUAL KUALITATIF) -->
    <VDialog v-model="isNewFratDialogOpen" max-width="650px" persistent>
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
          <span>Assessment FRAT Penerbangan Baru</span>
          <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isNewFratDialogOpen = false" />
        </VCardTitle>

        <VCardText class="pa-4">
          <VForm ref="newFratFormRef" @submit.prevent="saveNewFrat">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-primary">1. Konteks Penerbangan</div>
            <VRow dense class="mb-2">
              <VCol cols="12" sm="6">
                <VTextField v-model="newFrat.id" label="Flight ID" variant="outlined" density="compact"
                  placeholder="Contoh: AMA1269" :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="newFrat.aircraft" label="Pesawat"
                  :items="aircraftOptions.filter((a: string) => a !== 'All Aircraft')" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="newFrat.station" label="Station Origin"
                  :items="stationOptions.filter((s: string) => s !== 'All Station')" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField v-model="newFrat.route" label="Rute (Origin - Dest)" variant="outlined" density="compact"
                  placeholder="DJJ - WMX" :rules="[rules.required]" />
              </VCol>
            </VRow>

            <div class="text-subtitle-2 font-weight-bold mb-2 text-primary">2. Penilaian Mandiri Awak (Manual Pilot Self-Assessment)</div>
            <VRow dense class="mb-2">
              <VCol cols="12" sm="6">
                <VSelect v-model="newFrat.fatigue" label="Status Kelelahan Fisik"
                  :items="['Fit for Duty', 'Fatigue Elevated', 'Fatigue High']" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="newFrat.pilotReadiness" label="Kesiapan Mental & Fit Diri"
                  :items="['Sangat Siap & Fokus', 'Kondisi Prima', 'Perlu Pendampingan', 'Stres Ringan / Kurang Tidur']"
                  variant="outlined" density="compact" :rules="[rules.required]" />
              </VCol>
            </VRow>

            <div class="text-subtitle-2 font-weight-bold mb-2 text-primary">3. Kalkulasi Matriks Risiko (PAVE Framework)</div>
            <VRow dense class="mb-2">
              <VCol cols="12" sm="3">
                <VSelect v-model.number="newFrat.severity" label="Severity (1-5)" :items="[1, 2, 3, 4, 5]" variant="outlined" density="compact" />
              </VCol>
              <VCol cols="12" sm="3">
                <VSelect v-model.number="newFrat.likelihood" label="Likelihood (1-5)" :items="[1, 2, 3, 4, 5]" variant="outlined" density="compact" />
              </VCol>
              <VCol cols="12" sm="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption text-medium-emphasis">Skor Risiko Total:</span>
                  <span class="text-subtitle-2 font-weight-bold" :class="textRiskColor(calculatedNewRisk)">
                    {{ newFrat.score }} / 10
                  </span>
                </div>
                <VSlider v-model="newFrat.score" :min="0" :max="10" :step="0.1" color="primary" thumb-label hide-details />
              </VCol>
            </VRow>

            <div class="text-subtitle-2 font-weight-bold mb-2 text-primary">4. Input Mitigasi Manual & Catatan Kondisi</div>
            <VRow dense>
              <VCol cols="12">
                <VTextarea v-model="newFrat.mitigationPlan" label="Rencana Mitigasi Risiko Manual"
                  placeholder="Tuliskan langkah preventif tambahan (misal: Tambah cadangan BBM 45 menit, Ganti rute ke Waypoint B)..."
                  variant="outlined" density="compact" rows="2" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="newFrat.specialNotes" label="Catatan Kondisi Lapangan / Airstrip"
                  placeholder="Laporan khusus (misal: Airstrip tergenang air nipis, angin kencang berhembus dari timur)..."
                  variant="outlined" density="compact" rows="2" />
              </VCol>
              <VCol cols="12" class="d-flex align-center justify-space-between pt-2">
                <span class="text-caption text-medium-emphasis">Status Rilis Otomatis Sistem:</span>
                <VChip :color="riskColor(calculatedNewRisk)" size="small" class="font-weight-bold">
                  {{ calculatedNewRisk }} Risk ({{ calculatedNewRisk === 'High' ? 'Blocked' : 'Released' }})
                </VChip>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VCardActions class="pa-4 pt-0 d-flex justify-end ga-2">
          <VBtn variant="outlined" color="secondary" @click="isNewFratDialogOpen = false">Batal</VBtn>
          <VBtn color="primary" variant="elevated" @click="saveNewFrat">Simpan Assessment</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- DIALOG 2: DETAIL ASSESSMENT (DILENGKAPI RINCIAN INPUT MANUAL) -->
    <VDialog v-model="isDetailDialogOpen" max-width="600px">
      <VCard v-if="detailFlight">
        <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
          <span>Rincian Assessment FRAT: {{ detailFlight.id }}</span>
          <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isDetailDialogOpen = false" />
        </VCardTitle>

        <VCardText class="pa-4">
          <VRow dense class="mb-2">
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Rute & Pesawat</div>
              <div class="font-weight-bold text-body-2">{{ detailFlight.route }} ({{ detailFlight.aircraft }})</div>
            </VCol>
            <VCol cols="6">
              <div class="text-caption text-medium-emphasis">Waktu Operasional</div>
              <div class="font-weight-medium text-body-2">{{ detailFlight.datetime }}</div>
            </VCol>
            <VCol cols="6" class="mt-2">
              <div class="text-caption text-medium-emphasis">Tingkat Risiko & Matriks</div>
              <VChip size="small" :color="riskColor(detailFlight.risk)" class="font-weight-bold mr-1">{{ detailFlight.risk }} Risk</VChip>
              <span class="text-caption text-medium-emphasis">(Sev: {{ detailFlight.severity }}, Lik: {{ detailFlight.likelihood }})</span>
            </VCol>
            <VCol cols="6" class="mt-2">
              <div class="text-caption text-medium-emphasis">Status Rilis</div>
              <VChip size="small" :color="fratStatusColor(detailFlight.status)">{{ detailFlight.status }}</VChip>
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <!-- Penilaian Awak -->
          <div class="text-subtitle-2 font-weight-bold mb-1">Self-Assessment Pilot:</div>
          <div class="text-caption mb-3 pa-2 bg-grey-lighten-4 rounded">
            <strong>Kondisi Awak:</strong> {{ detailFlight.fatigue }}<br>
            <strong>Kesiapan Mental:</strong> {{ detailFlight.pilotReadiness || 'Tidak ada catatan' }}
          </div>

          <div class="text-subtitle-2 font-weight-bold mb-2">Faktor Risiko Teridentifikasi:</div>
          <VList density="compact" class="pa-0 mb-3">
            <VListItem v-for="(f, i) in detailFlight.topRisks" :key="i" class="px-0">
              <template #prepend>
                <VIcon icon="mdi-alert-circle-outline" color="warning" size="18" class="mr-2" />
              </template>
              <VListItemTitle class="text-body-2">{{ f.name }}</VListItemTitle>
              <template #append>
                <span class="font-weight-bold text-caption text-error">+{{ f.score }}</span>
              </template>
            </VListItem>
          </VList>

          <!-- Input Manual Ditampilkan di Detail -->
          <div v-if="detailFlight.mitigationPlan" class="mt-2 pa-3 rounded bg-blue-lighten-5 border-blue">
            <div class="text-caption font-weight-bold text-primary mb-1">
              <VIcon icon="mdi-shield-check-outline" size="16" class="mr-1" />
              Rencana Mitigasi Risiko:
            </div>
            <div class="text-caption">{{ detailFlight.mitigationPlan }}</div>
          </div>

          <div v-if="detailFlight.specialNotes" class="mt-2 pa-3 rounded bg-amber-lighten-5 border-amber">
            <div class="text-caption font-weight-bold text-warning-darken-3 mb-1">
              <VIcon icon="mdi-note-text-outline" size="16" class="mr-1" />
              Catatan Kondisi Lapangan:
            </div>
            <div class="text-caption">{{ detailFlight.specialNotes }}</div>
          </div>

          <div v-if="detailFlight.overrideReason" class="mt-2 pa-3 rounded bg-purple-lighten-5 border-purple">
            <div class="text-caption font-weight-bold text-deep-purple mb-1">
              <VIcon icon="mdi-shield-key-outline" size="16" class="mr-1" />
              Catatan Persetujuan Override:
            </div>
            <div class="text-caption">{{ detailFlight.overrideReason }}</div>
          </div>
        </VCardText>

        <VCardActions class="pa-4 border-t d-flex justify-end ga-2">
          <VBtn color="secondary" variant="outlined" @click="isDetailDialogOpen = false">Tutup</VBtn>
          <VBtn color="primary" variant="flat" @click="isDetailDialogOpen = false; editFlight(detailFlight)">Edit Assessment</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- DIALOG 3: EDIT ASSESSMENT & STATUS OVERRIDE (DILENGKAPI EDIT MANUAL) -->
    <VDialog v-model="isEditDialogOpen" max-width="650px" persistent>
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
          <span>Edit & Override Status FRAT: {{ editFrat.id }}</span>
          <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isEditDialogOpen = false" />
        </VCardTitle>

        <VCardText class="pa-4">
          <VForm ref="editFratFormRef" @submit.prevent="saveEditFrat">
            <VRow dense>
              <VCol cols="12" sm="6">
                <VTextField v-model="editFrat.id" label="Flight ID" variant="outlined" density="compact" disabled />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="editFrat.aircraft" label="Pesawat"
                  :items="aircraftOptions.filter((a: string) => a !== 'All Aircraft')" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="editFrat.station" label="Station Origin"
                  :items="stationOptions.filter((s: string) => s !== 'All Station')" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField v-model="editFrat.route" label="Rute (Origin - Dest)" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>

              <VCol cols="12" sm="6">
                <VSelect v-model="editFrat.status" label="Status Rilis Penerbangan"
                  :items="['Released', 'Released (Override)', 'Blocked']" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="editFrat.fatigue" label="Status Kelelahan Awak"
                  :items="['Fit for Duty', 'Fatigue Elevated', 'Fatigue High']" variant="outlined" density="compact"
                  :rules="[rules.required]" />
              </VCol>

              <VCol cols="12" sm="3">
                <VSelect v-model.number="editFrat.severity" label="Severity (1-5)" :items="[1, 2, 3, 4, 5]" variant="outlined" density="compact" />
              </VCol>
              <VCol cols="12" sm="3">
                <VSelect v-model.number="editFrat.likelihood" label="Likelihood (1-5)" :items="[1, 2, 3, 4, 5]" variant="outlined" density="compact" />
              </VCol>

              <VCol cols="12" sm="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption text-medium-emphasis">Skor Risiko FRAT</span>
                  <span class="text-subtitle-2 font-weight-bold" :class="textRiskColor(calculatedEditRisk)">
                    {{ editFrat.score }}
                  </span>
                </div>
                <VSlider v-model="editFrat.score" :min="0" :max="10" :step="0.1" color="primary" thumb-label hide-details />
              </VCol>

              <!-- Edit Field Manual -->
              <VCol cols="12">
                <VTextarea v-model="editFrat.mitigationPlan" label="Pembaruan Rencana Mitigasi Risiko"
                  variant="outlined" density="compact" rows="2" />
              </VCol>
              <VCol cols="12">
                <VTextarea v-model="editFrat.specialNotes" label="Pembaruan Catatan Lapangan"
                  variant="outlined" density="compact" rows="2" />
              </VCol>

              <!-- Form Alasan Override jika memilih Override -->
              <VCol cols="12" v-if="editFrat.status === 'Released (Override)'">
                <VTextarea v-model="editFrat.overrideReason" label="Alasan Mitigasi & Otorisasi Override Khusus"
                  placeholder="Masukkan nomor surat izin atau tindakan mitigasi keselamatan yang disetujui Chief Pilot/Direktur Operasi..."
                  variant="outlined" density="compact" rows="2" hide-details :rules="[rules.required]" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VCardActions class="pa-4 pt-0 d-flex justify-end ga-2">
          <VBtn variant="outlined" color="secondary" @click="isEditDialogOpen = false">Batal</VBtn>
          <VBtn color="primary" variant="elevated" @click="saveEditFrat">Simpan Perubahan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- DIALOG 4: PEDOMAN & AMBANG BATAS FRAT -->
    <VDialog v-model="isGuidelineDialogOpen" max-width="650px">
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
          <div class="d-flex align-center ga-2">
            <VIcon icon="mdi-book-open-page-variant-outline" />
            <span class="text-h6 font-weight-bold">Pedoman Assessment Risiko (FRAT)</span>
          </div>
          <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isGuidelineDialogOpen = false" />
        </VCardTitle>

        <VCardText class="pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-2">1. Ambang Batas Skor Risiko (Risk Threshold)</div>
          <VTable density="compact" border class="mb-4">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th class="font-weight-bold">Rentang Skor</th>
                <th class="font-weight-bold">Tingkat Risiko</th>
                <th class="font-weight-bold">Status Rilis Default</th>
                <th class="font-weight-bold">Otoritas Persetujuan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-weight-bold text-success">0.0 – 4.4</td>
                <td><VChip color="success" size="x-small" class="font-weight-bold">Low Risk</VChip></td>
                <td>Released</td>
                <td class="text-caption">Pilot in Command (PIC)</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-warning">4.5 – 6.4</td>
                <td><VChip color="warning" size="x-small" class="font-weight-bold">Medium Risk</VChip></td>
                <td>Released</td>
                <td class="text-caption">Chief Pilot / Flight Controller</td>
              </tr>
              <tr>
                <td class="font-weight-bold text-error">&ge; 6.5</td>
                <td><VChip color="error" size="x-small" class="font-weight-bold">High Risk</VChip></td>
                <td>Blocked</td>
                <td class="text-caption">Direktur Operasi (Butuh Override)</td>
              </tr>
            </tbody>
          </VTable>

          <div class="text-subtitle-2 font-weight-bold mb-2">2. Komponen Penilaian PAVE Framework</div>
          <VList density="compact" class="pa-0">
            <VListItem class="px-0">
              <template #prepend><VIcon icon="mdi-account-circle-outline" color="primary" class="mr-2" /></template>
              <VListItemTitle class="font-weight-bold text-caption">Pilot (P)</VListItemTitle>
              <VListItemSubtitle class="text-caption">Kondisi kesehatan, jam istirahat, fatigue risk score, dan lisensi penerbang.</VListItemSubtitle>
            </VListItem>

            <VListItem class="px-0">
              <template #prepend><VIcon icon="mdi-airplane" color="primary" class="mr-2" /></template>
              <VListItemTitle class="font-weight-bold text-caption">Aircraft (A)</VListItemTitle>
              <VListItemSubtitle class="text-caption">Status kelaikan udara, batas MEL (Minimum Equipment List), dan riwayat perawatan.</VListItemSubtitle>
            </VListItem>

            <VListItem class="px-0">
              <template #prepend><VIcon icon="mdi-weather-cloudy" color="primary" class="mr-2" /></template>
              <VListItemTitle class="font-weight-bold text-caption">enVironment (V)</VListItemTitle>
              <VListItemSubtitle class="text-caption">Cuaca rute & tujuan, kondisi kelayakan airstrip perintis, serta visibilitas.</VListItemSubtitle>
            </VListItem>

            <VListItem class="px-0">
              <template #prepend><VIcon icon="mdi-clock-alert-outline" color="primary" class="mr-2" /></template>
              <VListItemTitle class="font-weight-bold text-caption">External Pressures (E)</VListItemTitle>
              <VListItemSubtitle class="text-caption">Batas waktu operasional (sunset limit), beban muatan (payload), dan tekanan komersial.</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCardText>

        <VCardActions class="pa-4 border-t d-flex justify-end">
          <VBtn color="primary" variant="flat" class="text-none" @click="isGuidelineDialogOpen = false">Tutup Pedoman</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- SNACKBAR NOTIFIKASI -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
      <VIcon icon="mdi-check-circle" class="mr-2" />
      {{ snackbar.text }}
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
//import { ref, reactive, computed, watch } from 'vue';

// ==========================================
// 1. DEKLARASI INTERFACE (TIPE DATA)
// ==========================================

interface RiskFactor {
  name: string;
  score: number;
}

interface Flight {
  id: string;
  datetime: string;
  station: string;
  aircraft: string;
  route: string;
  score: number;
  severity: number;
  likelihood: number;
  risk: string;
  fatigue: string;
  status: string;
  pilotReadiness?: string; // Input Manual: Self Assessment
  mitigationPlan?: string; // Input Manual: Tindakan Mitigasi
  specialNotes?: string;   // Input Manual: Catatan Khusus Field
  overrideReason?: string; // Input Manual: Override Note
  topRisks: RiskFactor[];
}

interface MatrixCell {
  level: 'Low' | 'Medium' | 'High';
  count: number;
}

// ==========================================
// 2. STATE REAKTIF & OPSIONAL FILTER
// ==========================================

const activeTab = ref('frat');
const lastUpdated = ref('11 Sep 2026 14:15 WIB');
const tableFilter = ref('all');
const page = ref<number>(1);
const itemsPerPage = 5;

// Opsi Pilihan Filter
const stationOptions = ['All Station', 'Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)', 'Timika (TIM)', 'Mulia (MII)'];
const aircraftOptions = ['All Aircraft', 'PK-AMA', 'PK-AMB', 'PK-AMC', 'PK-AMD', 'PK-AME', 'PK-AMF'];
const riskLevelOptions = ['All Risk', 'Low', 'Medium', 'High'];
const statusOptions = ['All Status', 'Released', 'Released (Override)', 'Blocked'];

// State Form Filter Toolbar
const filters = reactive({
  dateRange: '01 – 11 Sep 2026',
  station: 'All Station',
  aircraft: 'All Aircraft',
  riskLevel: 'All Risk',
  status: 'All Status'
});

// Aturan Validasi Form Vuetify
const rules = {
  required: (v: unknown) => !!v || 'Wajib diisi'
};

// State Modal & Dialog
const isNewFratDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isGuidelineDialogOpen = ref(false);
const detailFlight = ref<Flight | null>(null);
const newFratFormRef = ref();
const editFratFormRef = ref();

// Form Input Baru
const newFrat = reactive({
  id: '',
  aircraft: 'PK-AMA',
  station: 'Sentani (DJJ)',
  route: '',
  fatigue: 'Fit for Duty',
  pilotReadiness: 'Sangat Siap & Fokus',
  score: 4.0,
  severity: 2,
  likelihood: 2,
  mitigationPlan: '',
  specialNotes: ''
});

// Form Input Edit & Override
const editFrat = reactive({
  id: '',
  aircraft: '',
  station: '',
  route: '',
  fatigue: '',
  score: 0,
  severity: 1,
  likelihood: 1,
  status: '',
  mitigationPlan: '',
  specialNotes: '',
  overrideReason: ''
});

// State Notifikasi Toast/Snackbar
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
});

// Sync otomatis Severity & Likelihood saat Skor digeser
watch(() => newFrat.score, (val) => {
  if (val >= 6.5) { newFrat.severity = 4; newFrat.likelihood = 4; }
  else if (val >= 4.5) { newFrat.severity = 3; newFrat.likelihood = 3; }
  else { newFrat.severity = 2; newFrat.likelihood = 2; }
});

watch(() => editFrat.score, (val) => {
  if (val >= 6.5) { editFrat.severity = 4; editFrat.likelihood = 4; }
  else if (val >= 4.5) { editFrat.severity = 3; editFrat.likelihood = 3; }
  else { editFrat.severity = 2; editFrat.likelihood = 2; }
});

// ==========================================
// 3. DAFTAR UTAMA PENERBANGAN (EXPANDED DATASET)
// ==========================================

const initialFlightsData: Flight[] = [
  {
    id: 'AMA1263',
    datetime: '11 Sep 2026 06:30',
    station: 'Sentani (DJJ)',
    aircraft: 'PK-AMA',
    route: 'DJJ - WMX',
    score: 3.2,
    severity: 2,
    likelihood: 2,
    risk: 'Low',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Sangat Siap & Fokus',
    mitigationPlan: 'Menggunakan standar VFR departure biasa.',
    topRisks: [
      { name: 'Weather Condition (WX)', score: 1.2 },
      { name: 'Fatigue Risk Score', score: 0.8 }
    ]
  },
  {
    id: 'AMA1264',
    datetime: '11 Sep 2026 07:15',
    station: 'Wamena (WMX)',
    aircraft: 'PK-AMB',
    route: 'WMX - MII',
    score: 6.8,
    severity: 4,
    likelihood: 4,
    risk: 'High',
    fatigue: 'Fatigue Elevated',
    status: 'Released (Override)',
    pilotReadiness: 'Kondisi Prima',
    mitigationPlan: 'Tambahan ekstra BBM 30 menit & koordinasi intensif dengan radio station Mulia.',
    overrideReason: 'Disetujui terbang oleh Chief Pilot dengan mitigasi penambahan jam istirahat ekstra & pemantauan cuaca real-time.',
    topRisks: [
      { name: 'Airstrip Crosswind (>18kt)', score: 2.5 },
      { name: 'Short Unpaved Runway', score: 2.1 },
      { name: 'Fatigue Risk Score', score: 1.5 }
    ]
  },
  {
    id: 'AMA1265',
    datetime: '11 Sep 2026 08:00',
    station: 'Dekai (DKI)',
    aircraft: 'PK-AMC',
    route: 'DKI - MUL',
    score: 4.8,
    severity: 3,
    likelihood: 3,
    risk: 'Medium',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Sangat Siap & Fokus',
    mitigationPlan: 'Mengurangi beban payload kargo sebesar 150 kg untuk antisipasi density altitude.',
    specialNotes: 'Airstrip kering basah dilaporkan oleh pengawas darat.',
    topRisks: [
      { name: 'Crosswind Components', score: 2.5 },
      { name: 'Terrain Complexity', score: 2.3 }
    ]
  },
  {
    id: 'AMA1266',
    datetime: '11 Sep 2026 08:45',
    station: 'Timika (TIM)',
    aircraft: 'PK-AMD',
    route: 'TIM - DJJ',
    score: 7.5,
    severity: 5,
    likelihood: 3,
    risk: 'High',
    fatigue: 'Fatigue High',
    status: 'Blocked',
    pilotReadiness: 'Stres Ringan / Kurang Tidur',
    mitigationPlan: 'Tidak diperbolehkan terbang tanpa penggantian First Officer.',
    specialNotes: 'Cuaca buruk di cekungan pegunungan Jayawijaya.',
    topRisks: [
      { name: 'Crew Duty Time Limit Exceeded', score: 2.8 },
      { name: 'Severe Mountain Weather', score: 2.5 }
    ]
  },
  {
    id: 'AMA1267',
    datetime: '11 Sep 2026 09:30',
    station: 'Mulia (MII)',
    aircraft: 'PK-AME',
    route: 'MII - TIM',
    score: 2.9,
    severity: 1,
    likelihood: 2,
    risk: 'Low',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Sangat Siap & Fokus',
    topRisks: [
      { name: 'Airstrip Visibility', score: 0.9 }
    ]
  },
  {
    id: 'AMA1268',
    datetime: '11 Sep 2026 10:15',
    station: 'Sentani (DJJ)',
    aircraft: 'PK-AMF',
    route: 'DJJ - OKS',
    score: 5.1,
    severity: 3,
    likelihood: 2,
    risk: 'Medium',
    fatigue: 'Fatigue Elevated',
    status: 'Released',
    pilotReadiness: 'Perlu Pendampingan',
    mitigationPlan: 'PIC mengambil alih pendaratan di Oksibil.',
    topRisks: [
      { name: 'Cloud Base Altitude', score: 1.8 },
      { name: 'Short Runway Length', score: 1.4 }
    ]
  },
  {
    id: 'AMA1269',
    datetime: '11 Sep 2026 11:00',
    station: 'Wamena (WMX)',
    aircraft: 'PK-AMA',
    route: 'WMX - DKI',
    score: 3.8,
    severity: 2,
    likelihood: 2,
    risk: 'Low',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Sangat Siap & Fokus',
    topRisks: [
      { name: 'Enroute Cloud Scraps', score: 1.1 }
    ]
  },
  {
    id: 'AMA1270',
    datetime: '11 Sep 2026 12:20',
    station: 'Timika (TIM)',
    aircraft: 'PK-AMB',
    route: 'TIM - WMX',
    score: 5.9,
    severity: 3,
    likelihood: 4,
    risk: 'Medium',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Kondisi Prima',
    mitigationPlan: 'Melakukan re-check cuaca via satellite sebelum lintas pass pegunungan.',
    topRisks: [
      { name: 'Pass Clouding Over', score: 2.2 },
      { name: 'Sunset Operational Pressure', score: 1.9 }
    ]
  },
  {
    id: 'AMA1271',
    datetime: '11 Sep 2026 13:10',
    station: 'Sentani (DJJ)',
    aircraft: 'PK-AMC',
    route: 'DJJ - ZAG',
    score: 8.2,
    severity: 5,
    likelihood: 4,
    risk: 'High',
    fatigue: 'Fatigue Elevated',
    status: 'Blocked',
    pilotReadiness: 'Stres Ringan / Kurang Tidur',
    mitigationPlan: 'Penerbangan ditunda hingga besok pagi karena Sunset Limit.',
    specialNotes: 'Sudah mendekati batas operasional jam terbang pesawat perintis.',
    topRisks: [
      { name: 'Sunset Limit Imminent', score: 3.2 },
      { name: 'High Terrain Convective Clouds', score: 2.8 }
    ]
  },
  {
    id: 'AMA1272',
    datetime: '11 Sep 2026 14:00',
    station: 'Dekai (DKI)',
    aircraft: 'PK-AMD',
    route: 'DKI - DJJ',
    score: 4.1,
    severity: 2,
    likelihood: 3,
    risk: 'Low',
    fatigue: 'Fit for Duty',
    status: 'Released',
    pilotReadiness: 'Sangat Siap & Fokus',
    topRisks: [
      { name: 'Light Tailwinds', score: 1.3 }
    ]
  }
];

const flightsList = ref<Flight[]>(JSON.parse(JSON.stringify(initialFlightsData)));
const selectedFlight = ref<Flight | null>(flightsList.value[1]);

// ==========================================
// 4. COMPUTED PROPERTIES REAKTIF
// ==========================================

const countByRisk = (level: string) => flightsList.value.filter(f => f.risk === level).length;
const countByStatus = (statusStr: string) => flightsList.value.filter(f => f.status === statusStr).length;

/** KPI Cards Otomatis Terkalkulasi */
const fratKpis = computed(() => {
  const total = flightsList.value.length;
  const sumScore = flightsList.value.reduce((acc, f) => acc + f.score, 0);
  const avgScore = total > 0 ? (sumScore / total).toFixed(1) : '0.0';

  return [
    { title: 'Total Flights', value: String(total), icon: 'mdi-airplane-takeoff', color: 'primary', trend: { icon: 'mdi-arrow-up-thin', text: 'Live sync', tone: 'good' } },
    { title: 'FRAT Completed', value: String(total), icon: 'mdi-clipboard-check-outline', color: 'success', target: 'Target: 100%' },
    { title: 'Low Risk', value: String(countByRisk('Low')), icon: 'mdi-shield-check-outline', color: 'success', trend: { icon: 'mdi-check-all', text: 'Terverifikasi', tone: 'good' } },
    { title: 'Medium Risk', value: String(countByRisk('Medium')), icon: 'mdi-alert-circle-outline', color: 'warning', trend: { icon: 'mdi-minus', text: 'Dalam pengawasan', tone: 'neutral' } },
    { title: 'High Risk', value: String(countByRisk('High')), icon: 'mdi-alert-outline', color: 'error', trend: { icon: 'mdi-alert', text: 'Butuh atensi', tone: 'bad' } },
    { title: 'Blocked (Not Released)', value: String(countByStatus('Blocked')), icon: 'mdi-cancel', color: 'error', trend: { icon: 'mdi-cancel', text: 'Dilarang terbang', tone: 'bad' } },
    { title: 'Special Override', value: String(countByStatus('Released (Override)')), icon: 'mdi-shield-key-outline', color: 'deep-purple-accent-1', trend: { icon: 'mdi-shield-lock-outline', text: 'Persetujuan Khusus', tone: 'neutral' } },
    { title: 'Avg FRAT Score', value: avgScore, icon: 'mdi-calculator-variant-outline', color: 'info', target: 'Target: ≤ 5.0' },
  ];
});

/** Matriks Risiko 5x5 Dinamis */
const severityLabels = [
  { val: 5, text: 'Catastrophic' },
  { val: 4, text: 'Major' },
  { val: 3, text: 'Moderate' },
  { val: 2, text: 'Minor' },
  { val: 1, text: 'Negligible' }
];

const likelihoodLabels = [
  { val: 1, text: 'Rare' },
  { val: 2, text: 'Unlikely' },
  { val: 3, text: 'Possible' },
  { val: 4, text: 'Likely' },
  { val: 5, text: 'Certain' }
];

const matrixGrid = computed(() => {
  const baseGrid: { level: 'Low' | 'Medium' | 'High' }[][] = [
    [{ level: 'Medium' }, { level: 'Medium' }, { level: 'High' }, { level: 'High' }, { level: 'High' }],
    [{ level: 'Low' }, { level: 'Medium' }, { level: 'Medium' }, { level: 'High' }, { level: 'High' }],
    [{ level: 'Low' }, { level: 'Medium' }, { level: 'Medium' }, { level: 'Medium' }, { level: 'High' }],
    [{ level: 'Low' }, { level: 'Low' }, { level: 'Medium' }, { level: 'Medium' }, { level: 'Medium' }],
    [{ level: 'Low' }, { level: 'Low' }, { level: 'Low' }, { level: 'Low' }, { level: 'Medium' }]
  ];

  return baseGrid.map((row, rIdx) => {
    const severityVal = 5 - rIdx;
    return row.map((cell, cIdx) => {
      const likelihoodVal = cIdx + 1;
      const count = flightsList.value.filter(
        f => f.severity === severityVal && f.likelihood === likelihoodVal
      ).length;
      return {
        level: cell.level,
        count
      } as MatrixCell;
    });
  });
});

/** Donut Summary Risk & Fatigue */
const riskDistribution = computed(() => {
  const total = flightsList.value.length;
  const low = countByRisk('Low');
  const medium = countByRisk('Medium');
  const high = countByRisk('High');
  const blocked = countByStatus('Blocked');
  const calcPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return {
    total,
    totalLabel: 'Total Flight',
    segments: [
      { label: 'Low', value: low, percent: calcPct(low), color: '#43A047' },
      { label: 'Medium', value: medium, percent: calcPct(medium), color: '#FB8C00' },
      { label: 'High', value: high, percent: calcPct(high), color: '#E53935' },
      { label: 'Blocked', value: blocked, percent: calcPct(blocked), color: '#B71C1C' },
    ]
  };
});

const fatigueSummary = computed(() => {
  const total = flightsList.value.length;
  const fit = flightsList.value.filter(f => f.fatigue === 'Fit for Duty').length;
  const elevated = flightsList.value.filter(f => f.fatigue === 'Fatigue Elevated').length;
  const high = flightsList.value.filter(f => f.fatigue === 'Fatigue High').length;
  const calcPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  return {
    total,
    totalLabel: 'Awak Dites',
    segments: [
      { label: 'Fit for Duty', value: fit, percent: calcPct(fit), color: '#43A047' },
      { label: 'Fatigue Elevated', value: elevated, percent: calcPct(elevated), color: '#FB8C00' },
      { label: 'Fatigue High', value: high, percent: calcPct(high), color: '#E53935' },
    ]
  };
});

const fratTrend = computed(() => {
  const currentAvg = Number((flightsList.value.reduce((a, b) => a + b.score, 0) / (flightsList.value.length || 1)).toFixed(1));
  return {
    categories: ['05 Sep', '06 Sep', '07 Sep', '08 Sep', '09 Sep', '10 Sep', '11 Sep'],
    series: [
      { name: 'Rata-rata Skor', color: '#1E88E5', data: [4.9, 5.2, 5.0, 4.7, 5.4, 5.1, currentAvg] }
    ]
  };
});

const calculatedNewRisk = computed(() => {
  const s = Number(newFrat.score) || 0;
  if (s >= 6.5) return 'High';
  if (s >= 4.5) return 'Medium';
  return 'Low';
});

const calculatedEditRisk = computed(() => {
  const s = Number(editFrat.score) || 0;
  if (s >= 6.5) return 'High';
  if (s >= 4.5) return 'Medium';
  return 'Low';
});

const filteredFlights = computed(() => {
  return flightsList.value.filter(flight => {
    if (tableFilter.value === 'low' && flight.risk !== 'Low') return false;
    if (tableFilter.value === 'medium' && flight.risk !== 'Medium') return false;
    if (tableFilter.value === 'high' && flight.risk !== 'High') return false;
    if (tableFilter.value === 'blocked' && flight.status !== 'Blocked') return false;
    if (tableFilter.value === 'override' && flight.status !== 'Released (Override)') return false;

    if (filters.station !== 'All Station' && !flight.station.toLowerCase().includes(filters.station.split(' ')[0].toLowerCase())) return false;
    if (filters.aircraft !== 'All Aircraft' && !flight.aircraft.includes(filters.aircraft)) return false;
    if (filters.riskLevel !== 'All Risk' && flight.risk !== filters.riskLevel) return false;
    if (filters.status !== 'All Status' && flight.status !== filters.status) return false;

    return true;
  });
});

const maxPages = computed(() => Math.max(1, Math.ceil(filteredFlights.value.length / itemsPerPage)));

const paginatedFlights = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredFlights.value.slice(start, start + itemsPerPage);
});

watch([filters, tableFilter], () => {
  page.value = 1;
});

// ==========================================
// 5. METODE METODE BISNIS & DEMO PRESENTASI
// ==========================================

const selectFlight = (flight: Flight) => {
  selectedFlight.value = flight;
};

const filterByMatrix = (riskLevel: string) => {
  tableFilter.value = 'all';
  filters.riskLevel = riskLevel;
  showToast(`Saring data untuk tingkat risiko: ${riskLevel}`, 'info');
};

const resetFilters = () => {
  tableFilter.value = 'all';
  filters.station = 'All Station';
  filters.aircraft = 'All Aircraft';
  filters.riskLevel = 'All Risk';
  filters.status = 'All Status';
  showToast('Filter berhasil dibersihkan!', 'info');
};

const handleRefresh = () => {
  lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
  showToast('Data FRAT diperbarui dari server!', 'info');
};

const openDetailDialog = (flight: Flight) => {
  detailFlight.value = flight;
  isDetailDialogOpen.value = true;
};

const editFlight = (flight: Flight) => {
  editFrat.id = flight.id;
  editFrat.aircraft = flight.aircraft;
  editFrat.station = flight.station;
  editFrat.route = flight.route;
  editFrat.fatigue = flight.fatigue;
  editFrat.score = flight.score;
  editFrat.severity = flight.severity;
  editFrat.likelihood = flight.likelihood;
  editFrat.status = flight.status;
  editFrat.mitigationPlan = flight.mitigationPlan || '';
  editFrat.specialNotes = flight.specialNotes || '';
  editFrat.overrideReason = flight.overrideReason || '';
  isEditDialogOpen.value = true;
};

const saveEditFrat = async () => {
  if (editFratFormRef.value) {
    const { valid } = await editFratFormRef.value.validate();
    if (!valid) return;
  }

  const targetIndex = flightsList.value.findIndex(f => f.id === editFrat.id);
  if (targetIndex !== -1) {
    const scoreNum = Number(editFrat.score);
    const riskLevel = calculatedEditRisk.value;
    let finalStatus = editFrat.status;

    // Logika pengunci status otomatis jika risiko High dan bukan Override
    if (riskLevel === 'High' && finalStatus === 'Released') {
      finalStatus = 'Blocked';
    }

    flightsList.value[targetIndex] = {
      ...flightsList.value[targetIndex],
      aircraft: editFrat.aircraft,
      station: editFrat.station,
      route: editFrat.route,
      fatigue: editFrat.fatigue,
      score: scoreNum,
      severity: editFrat.severity,
      likelihood: editFrat.likelihood,
      risk: riskLevel,
      status: finalStatus,
      mitigationPlan: editFrat.mitigationPlan,
      specialNotes: editFrat.specialNotes,
      overrideReason: finalStatus === 'Released (Override)' ? editFrat.overrideReason : undefined
    };

    if (selectedFlight.value?.id === editFrat.id) {
      selectedFlight.value = flightsList.value[targetIndex];
    }

    isEditDialogOpen.value = false;
    showToast(`Status penerbangan ${editFrat.id} diperbarui menjadi ${finalStatus}!`, 'success');
  }
};

const saveNewFrat = async () => {
  if (newFratFormRef.value) {
    const { valid } = await newFratFormRef.value.validate();
    if (!valid) return;
  }

  const scoreNum = Number(newFrat.score);
  const riskLevel = calculatedNewRisk.value;
  const status = riskLevel === 'High' ? 'Blocked' : 'Released';

  const createdItem: Flight = {
    id: newFrat.id.toUpperCase(),
    datetime: '11 Sep 2026 ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    station: newFrat.station,
    aircraft: newFrat.aircraft,
    route: newFrat.route,
    score: scoreNum,
    severity: newFrat.severity,
    likelihood: newFrat.likelihood,
    risk: riskLevel,
    fatigue: newFrat.fatigue,
    pilotReadiness: newFrat.pilotReadiness,
    status: status,
    mitigationPlan: newFrat.mitigationPlan,
    specialNotes: newFrat.specialNotes,
    topRisks: [
      { name: 'Weather Condition (WX)', score: Number((scoreNum * 0.3).toFixed(1)) },
      { name: 'Airstrip Condition', score: Number((scoreNum * 0.2).toFixed(1)) }
    ]
  };

  flightsList.value.unshift(createdItem);
  selectedFlight.value = createdItem;
  isNewFratDialogOpen.value = false;

  // Reset form
  newFrat.id = '';
  newFrat.route = '';
  newFrat.mitigationPlan = '';
  newFrat.specialNotes = '';

  showToast(`Assessment ${createdItem.id} berhasil ditambahkan!`, 'success');
};

/** FITUR UJI COBA PRESENTASI: Simulasi High Risk */
const simulateHighRiskDemo = () => {
  const simId = 'AMA999' + Math.floor(Math.random() * 90 + 10);
  const simulatedFlight: Flight = {
    id: simId,
    datetime: '11 Sep 2026 ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    station: 'Wamena (WMX)',
    aircraft: 'PK-AMB',
    route: 'WMX - MII',
    score: 8.5,
    severity: 5,
    likelihood: 4,
    risk: 'High',
    fatigue: 'Fatigue High',
    pilotReadiness: 'Stres Ringan / Kurang Tidur',
    status: 'Blocked',
    mitigationPlan: 'Penerbangan dibatalkan sementara sampai perubahan cuaca & penggantian kru.',
    specialNotes: 'Peringatan badai lokal di runway Mulia.',
    topRisks: [
      { name: 'Severe Weather Alert', score: 3.5 },
      { name: 'Airstrip Crosswind > 25kt', score: 2.8 },
      { name: 'Crew Exceeded Duty Time', score: 2.2 }
    ]
  };

  flightsList.value.unshift(simulatedFlight);
  selectedFlight.value = simulatedFlight;
  tableFilter.value = 'blocked';
  showToast(`[DEMO] Penerbangan risiko tinggi ${simId} berhasil dikalkulasi & DIBLOKIR!`, 'error');
};

/** FITUR UJI COBA PRESENTASI: Reset Data Demo */
const resetDemoData = () => {
  flightsList.value = JSON.parse(JSON.stringify(initialFlightsData));
  selectedFlight.value = flightsList.value[1];
  tableFilter.value = 'all';
  resetFilters();
  showToast('Data demo berhasil dikembalikan ke kondisi awal!', 'info');
};

const exportFratData = () => {
  let csvContent = 'Flight ID,Date Time,Station,Aircraft,Route,Score,Severity,Likelihood,Risk Level,Fatigue Status,Pilot Readiness,Status,Mitigation Plan,Special Notes,Override Reason\n';
  filteredFlights.value.forEach(f => {
    csvContent += `"${f.id}","${f.datetime}","${f.station}","${f.aircraft}","${f.route}",${f.score},${f.severity},${f.likelihood},"${f.risk}","${f.fatigue}","${f.pilotReadiness || ''}","${f.status}","${f.mitigationPlan || ''}","${f.specialNotes || ''}","${f.overrideReason || ''}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `FRAT_Flight_Risk_Data_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Data FRAT berhasil diekspor ke file CSV!', 'success');
};

const showToast = (text: string, color = 'success') => {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
};

// ==========================================
// 6. HELPER STYLING & WARNA
// ==========================================

function getMatrixColorClass(level: string) {
  return {
    Low: 'bg-success text-white',
    Medium: 'bg-warning text-dark',
    High: 'bg-error text-white'
  }[level] || 'bg-grey-lighten-2';
}

function riskColor(level: string) {
  return { Low: 'success', Medium: 'warning', High: 'error', Blocked: 'error' }[level] || 'grey';
}

function textRiskColor(level: string) {
  return { Low: 'text-success', Medium: 'text-warning', High: 'text-error', Blocked: 'text-error' }[level] || 'text-grey';
}

function fatigueColor(status: string) {
  return { 'Fit for Duty': 'success', 'Fatigue Elevated': 'warning', 'Fatigue High': 'error' }[status] || 'grey';
}

function fratStatusColor(status: string) {
  return { 'Released': 'success', 'Released (Override)': 'deep-purple-accent-1', 'Blocked': 'error' }[status] || 'grey';
}
</script>

<style scoped>
.h-100 {
  height: 100% !important;
}

.cursor-pointer {
  cursor: pointer;
  transition: opacity 0.2s ease-in-out;
}

.cursor-pointer:hover {
  opacity: 0.85;
}

.text-x-small {
  font-size: 0.65rem;
  line-height: 0.8rem;
}
</style>