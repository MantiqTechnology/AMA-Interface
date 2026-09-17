<template>
  <VContainer fluid class="pb-6 pt-2">

    <!-- 1. HEADER HALAMAN -->
    <div class="mb-4 d-flex justify-space-between align-center flex-wrap ga-2">
      <div>
        <h1 class="text-h5 font-weight-bold tracking-tight">Regulatory Compliance & Certificates</h1>
        <div class="text-caption text-medium-emphasis">Mandatory Reporting (CASR 135), Company Certificates, & DGCA Approvals</div>
      </div>
      <div class="d-flex align-center ga-2">
        <VChip color="primary" variant="tonal" size="small" class="font-weight-bold">
          <VIcon icon="mdi-shield-check" class="mr-1" size="14" /> CASR 135 Compliant
        </VChip>
      </div>
    </div>

    <!-- 2. NAV BAR -->
    <div class="d-flex justify-space-between align-center border-b mb-4 flex-wrap ga-3">
      <div style="overflow-x: auto; max-width: 100%; white-space: nowrap;" class="d-flex hide-scrollbar">
        <VTabs v-model="activeTab" color="primary" density="compact">
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
            <VIcon icon="mdi-clipboard-check-outline" size="18" class="mr-2" /> CAPA
          </VTab>
          <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-medium text-medium-emphasis">
            <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency
          </VTab>
          <VTab value="assurance" to="/sms/SafetyAssurance" class="text-none font-weight-medium text-medium-emphasis">
            <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Assurance
          </VTab>
          <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
            <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI
          </VTab>
          <VTab value="communication" to="/sms/Communication" class="text-none font-weight-medium text-medium-emphasis">
            <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Comms
          </VTab>
          <VTab value="regulatory" to="/sms/Regulatory" class="text-none font-weight-bold">
            <VIcon icon="mdi-gavel" size="18" class="mr-2" /> Regulatory
          </VTab>
          <VTab value="governance" to="/sms/SafetyTraining" class="text-none font-weight-medium text-medium-emphasis">
            <VIcon icon="mdi-school-outline" size="18" class="mr-2" /> Governance
          </VTab>
        </VTabs>
      </div>

      <div class="d-flex align-center pb-2">
        <span class="text-caption text-medium-emphasis mr-3 font-weight-medium d-none d-sm-inline">
          Last updated: {{ lastUpdated }}
        </span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" @click="handleRefresh" :loading="isRefreshing" class="text-none font-weight-bold bg-blue-lighten-5 border-primary">
          Refresh
        </VBtn>
      </div>
    </div>

    <!-- 3. FILTER TOOLBAR -->
    <VCard elevation="0" border class="pa-3 mb-4 rounded-lg bg-white">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField v-model="searchQuery" placeholder="Cari Ref Number / Subjek..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details style="min-width: 220px; flex: 1 1 auto;" />
        
        <VSelect v-model="filters.type" label="Report Type" :items="['All Types', 'MOR', 'SDR', 'ASR', 'INC', 'VHR']" variant="outlined" density="compact" hide-details style="min-width: 130px; flex: 1 1 auto;" />
        
        <VSelect v-model="filters.authority" label="Target Authority" :items="['All Authorities', 'DKUPPU (DGCA)', 'KNKT', 'Otban Wilayah X', 'AirNav']" variant="outlined" density="compact" hide-details style="min-width: 160px; flex: 1 1 auto;" />
        
        <VSelect v-model="filters.status" label="Status" :items="['All Status', 'Draft', 'Pending Approval', 'Submitted', 'Acknowledged']" variant="outlined" density="compact" hide-details style="min-width: 150px; flex: 1 1 auto;" />

        <VBtn variant="tonal" color="grey-darken-2" density="comfortable" class="text-none font-weight-bold" @click="resetFilters">
          <VIcon icon="mdi-filter-off-outline" class="mr-1" /> Reset
        </VBtn>
        
        <VSpacer class="d-none d-md-block" />
        
        <VBtn color="primary" variant="elevated" prepend-icon="mdi-file-document-plus" class="text-none font-weight-bold flex-grow-1 flex-md-grow-0" height="40" @click="uiState.showNewReport = true">
          Generate Report
        </VBtn>
      </div>
    </VCard>

    <!-- 4. CRITICAL KPI SCORECARDS -->
    <VRow class="mb-4 align-stretch">
      <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 200px;">
        <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg bg-green-lighten-5 border-success hover-card" title="AOC Validity" value="284 Days" icon="mdi-certificate-outline" color="success" target="Expires: 04 Jun 2027" />
      </VCol>
      <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 200px;">
        <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="MOR/SDR Filed" :value="tableRegulatory.length.toString()" icon="mdi-file-send-outline" color="primary" :trend="{ icon: 'mdi-minus', text: 'On-time rate 100%', tone: 'good' }" />
      </VCol>
      <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 200px;">
        <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" :class="pendingSubmissionCount > 0 ? 'bg-red-lighten-5 border-error' : ''" title="Pending Submission" :value="pendingSubmissionCount.toString()" icon="mdi-timer-sand" :color="pendingSubmissionCount > 0 ? 'error' : 'success'" :target="pendingSubmissionCount > 0 ? 'Butuh Tindakan Segera' : 'Semua Terkirim'" />
      </VCol>
      <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 200px;">
        <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="Avg Time to Submit" value="38 Hours" icon="mdi-clock-fast" color="info" target="CASR Max Limit: 72 Hours" />
      </VCol>
      <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 200px;">
        <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="Approvals Pending" :value="approvalsPendingCount.toString()" icon="mdi-book-clock-outline" color="warning" target="Awaiting DKUPPU Stamp" />
      </VCol>
    </VRow>

    <!-- Authority Sync Status Banner -->
    <VAlert type="success" variant="tonal" border="start" class="mb-4 py-2 rounded-lg" icon="mdi-server-network">
      <div class="d-flex align-center justify-space-between w-100 flex-wrap ga-2">
        <div>
          <strong class="text-success-darken-2">DKUPPU SIKU API Gateway: Connected</strong>
          <span class="text-caption text-medium-emphasis ml-2 d-none d-sm-inline">Sistem pelaporan elektronik terhubung secara real-time.</span>
        </div>
        <div class="d-flex align-center ga-3">
          <span class="text-caption font-weight-bold">Ping: 36ms</span>
          <VBtn size="x-small" color="success" variant="outlined" class="text-none font-weight-bold bg-white" @click="testApiConnection">Test Connection</VBtn>
        </div>
      </div>
    </VAlert>

    <VRow class="align-stretch">
      <!-- KIRI: REGULATORY REPORTS (MOR/SDR) -->
      <VCol cols="12" xl="7" lg="7" class="d-flex flex-column ga-4">

        <VCard border class="elevation-0 rounded-lg flex-grow-1 d-flex flex-column" style="overflow: hidden;">
          <div class="d-flex align-center justify-space-between pa-3 border-b bg-white flex-wrap ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Mandatory Occurrence Reports (MOR / SDR)</div>
              <div class="text-caption text-medium-emphasis">Pelaporan wajib ke otoritas penerbangan</div>
            </div>
            <VBtn variant="tonal" color="primary" prepend-icon="mdi-download" density="comfortable" class="text-none font-weight-bold" @click="handleExportLog">
              Export Log (CSV)
            </VBtn>
          </div>

          <div style="overflow-x: auto; width: 100%;">
            <VTable class="custom-table" style="min-width: 750px;">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="text-caption font-weight-bold text-uppercase">Reg. Ref Number</th>
                  <th class="text-caption font-weight-bold text-uppercase">Type</th>
                  <th class="text-caption font-weight-bold text-uppercase">Subject / Source Event</th>
                  <th class="text-caption font-weight-bold text-uppercase">Authority</th>
                  <th class="text-caption font-weight-bold text-uppercase">Deadline</th>
                  <th class="text-caption font-weight-bold text-uppercase">Status</th>
                  <th class="text-caption font-weight-bold text-uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredTableRegulatory" :key="item.ref" class="hover-bg">
                  <td class="text-caption font-weight-bold text-primary" style="white-space: nowrap;">
                    {{ item.ref }}
                  </td>
                  <td>
                    <VChip :color="typeColor(item.type)" size="x-small" variant="flat" class="font-weight-bold px-2">{{ item.type }}</VChip>
                  </td>
                  <td>
                    <div class="text-caption font-weight-medium text-truncate" style="max-width: 200px;" :title="item.subject">
                      {{ item.subject }}
                    </div>
                    <div class="text-caption text-medium-emphasis" style="font-size: 10px !important;">Ref: {{ item.sourceRef }}</div>
                  </td>
                  <td class="text-caption font-weight-medium" style="white-space: nowrap;">{{ item.authority }}</td>
                  <td>
                    <div class="d-flex align-center" style="white-space: nowrap;">
                      <VIcon v-if="item.status !== 'Acknowledged'" :icon="item.urgent ? 'mdi-alert-circle' : 'mdi-clock-outline'" :color="item.urgent ? 'error' : 'warning'" size="14" class="mr-1" />
                      <span :class="['text-caption font-weight-bold', item.urgent ? 'text-error' : (item.status === 'Acknowledged' ? 'text-medium-emphasis' : 'text-warning')]">
                        {{ item.deadline }}
                      </span>
                    </div>
                  </td>
                  <td style="white-space: nowrap;">
                    <VChip :color="statusColor(item.status)" size="x-small" variant="outlined" class="font-weight-bold bg-white px-2">
                      {{ item.status }}
                    </VChip>
                    <div v-if="item.receipt" class="text-caption text-success font-weight-bold" style="font-size: 9px !important;">
                      {{ item.receipt }}
                    </div>
                  </td>
                  <td style="white-space: nowrap;">
                    <div class="d-flex justify-center ga-1">
                      <VBtn icon="mdi-file-pdf-box" variant="text" density="compact" size="small" color="error" title="Download Document (PDF)" @click="downloadDocumentFile(item.ref, item.subject)" />
                      <VBtn 
                        :icon="isSubmittingApi[item.ref] ? 'mdi-loading' : 'mdi-send-check'" 
                        :class="{'mdi-spin': isSubmittingApi[item.ref]}"
                        variant="text" 
                        density="compact" 
                        size="small" 
                        color="primary" 
                        :disabled="item.status === 'Acknowledged' || isSubmittingApi[item.ref]" 
                        title="Submit via SIKU API" 
                        @click="submitReportApi(item)" 
                      />
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredTableRegulatory.length === 0">
                  <td colspan="7" class="text-center pa-6 text-caption text-medium-emphasis">
                    Tidak ada laporan regulasi yang sesuai filter.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div class="d-flex align-center pa-3 border-t mt-auto flex-wrap ga-2">
            <span class="text-caption text-medium-emphasis">
              Menampilkan {{ filteredTableRegulatory.length }} dari {{ tableRegulatory.length }} data
            </span>
            <VSpacer />
            <VPagination v-model="pageMor" :length="1" density="compact" active-color="primary" />
          </div>
        </VCard>

        <!-- Company Certificates & Operational Specifications -->
        <VCard border class="elevation-0 rounded-lg pa-4 bg-blue-grey-lighten-5">
          <div class="d-flex justify-space-between align-center mb-3 border-b pb-2">
            <div class="text-subtitle-2 font-weight-bold text-blue-grey-darken-3">Company Certificates & Aircraft Registry</div>
            <VBtn variant="tonal" size="small" color="primary" class="text-none font-weight-bold" @click="uiState.showCertLibrary = true">Manage Library</VBtn>
          </div>
          <VRow dense>
            <VCol v-for="cert in companyCerts" :key="cert.name" cols="12" sm="6" md="4">
              <VCard border elevation="0" class="pa-3 bg-white h-100 d-flex flex-column hover-card cursor-pointer" @click="inspectCert(cert)">
                <div class="d-flex justify-space-between align-start mb-1">
                  <span class="font-weight-bold text-caption text-truncate">{{ cert.name }}</span>
                  <VIcon :icon="cert.icon" size="18" :color="cert.statusColor" />
                </div>
                <div class="text-caption text-medium-emphasis mb-2" style="font-size: 10px !important;">{{ cert.desc }}</div>
                <div class="d-flex justify-space-between align-center mt-auto pt-2">
                  <VChip size="x-small" :color="cert.statusColor" class="font-weight-bold px-2">{{ cert.status }}</VChip>
                  <span class="text-caption font-weight-bold" :class="`text-${cert.statusColor}`">{{ cert.expiry }}</span>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCard>

      </VCol>

      <!-- KANAN: DEADLINES, MANUALS & CORRESPONDENCE -->
      <VCol cols="12" xl="5" lg="5" class="d-flex flex-column ga-4">

        <!-- Deadline Countdown Panel -->
        <VCard border class="pa-4 elevation-0 rounded-lg bg-red-lighten-5 border-error">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="text-subtitle-2 font-weight-bold text-error-darken-2">Critical Regulatory Deadlines</div>
            <VIcon icon="mdi-alarm-bell" color="error" class="animation-pulse" />
          </div>

          <div v-for="deadline in upcomingDeadlines" :key="deadline.id" class="mb-3 bg-white pa-2 rounded border hover-card">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-caption font-weight-bold text-error">{{ deadline.id }}</span>
              <span class="text-caption font-weight-bold text-error">{{ deadline.timeLeft }}</span>
            </div>
            <div class="text-caption text-medium-emphasis text-truncate mb-2">{{ deadline.subject }}</div>
            <VProgressLinear :model-value="deadline.progress" color="error" height="4" rounded />
          </div>

          <VBtn block color="error" variant="elevated" class="text-none font-weight-bold mt-2" prepend-icon="mdi-pencil-fast" @click="reviewPendingActions">
            Review Pending Actions
          </VBtn>
        </VCard>

        <!-- Company Manuals Approval Status -->
        <VCard border class="pa-4 elevation-0 rounded-lg">
          <div class="d-flex justify-space-between align-center mb-3 border-b pb-2">
            <div class="text-subtitle-2 font-weight-bold">Operations Manuals (DKUPPU Approvals)</div>
            <VBtn size="small" variant="tonal" color="primary" class="text-none font-weight-bold" @click="uiState.showNewManual = true">Submit Rev.</VBtn>
          </div>

          <VList density="compact" class="pa-0">
            <VListItem v-for="manual in manuals" :key="manual.doc" class="px-2 mb-2 rounded hover-bg border">
              <template v-slot:prepend>
                <VIcon :icon="manual.icon" :color="manual.color" class="mr-3" />
              </template>
              <VListItemTitle class="text-body-2 font-weight-medium">{{ manual.doc }}</VListItemTitle>
              <VListItemSubtitle class="text-caption text-medium-emphasis">Rev: {{ manual.rev }} | Updated: {{ manual.date }}</VListItemSubtitle>
              <template v-slot:append>
                <div class="d-flex align-center ga-1">
                  <VChip size="x-small" :color="manual.color" variant="tonal" class="font-weight-bold px-2 mr-1">
                    {{ manual.status }}
                  </VChip>
                  <VBtn icon="mdi-download" variant="text" size="x-small" color="primary" title="Download Manual PDF" @click.stop="downloadDocumentFile(manual.doc, manual.rev)" />
                </div>
              </template>
            </VListItem>
          </VList>
        </VCard>

        <!-- Authority Correspondence / Inbox -->
        <VCard border class="pa-4 elevation-0 rounded-lg flex-grow-1 d-flex flex-column">
          <div class="d-flex justify-space-between align-center mb-3 border-b pb-2">
            <div class="text-subtitle-2 font-weight-bold">Authority Correspondence (Otban & DGCA)</div>
            <VChip size="x-small" color="primary" class="font-weight-bold">{{ authorityInbox.length }} Pesan</VChip>
          </div>

          <div v-for="(mail, i) in authorityInbox" :key="mail.ref" class="d-flex align-start mb-3 cursor-pointer hover-bg pa-2 rounded border-b" @click="openInboxMessage(mail)">
            <VIcon :icon="mail.icon" :color="mail.color" class="mr-2 mt-1" size="small" />
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="text-caption font-weight-bold text-truncate">{{ mail.subject }}</div>
              <div class="text-caption text-medium-emphasis mt-1 text-truncate" style="line-height: 1.3;">{{ mail.message }}</div>
              <div class="d-flex justify-space-between align-center mt-2">
                <span class="text-caption font-weight-medium text-primary">{{ mail.authority }}</span>
                <span class="text-caption text-medium-emphasis" style="font-size: 9px !important;">{{ mail.datetime }}</span>
              </div>
            </div>
          </div>

          <div class="text-center mt-auto pt-2 border-t">
            <VBtn variant="text" color="primary" class="text-none font-weight-bold text-caption" @click="uiState.showFullMailbox = true">
              Buka Kotak Masuk Lengkap (Mailbox)
            </VBtn>
          </div>
        </VCard>

      </VCol>
    </VRow>

    <!-- DIALOG MODALS INTERAKTIF DEMO -->

    <!-- 1. Modal Form Generate Report Baru -->
    <VDialog v-model="uiState.showNewReport" max-width="600">
      <VCard class="rounded-lg">
        <VCardTitle class="bg-primary text-white font-weight-bold d-flex justify-space-between align-center pa-4">
          <span><VIcon icon="mdi-file-document-plus" class="mr-2" /> Buat Laporan Regulasi Baru</span>
          <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showNewReport = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <VRow dense>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReportForm.type" label="Tipe Laporan *" :items="['MOR', 'SDR', 'ASR', 'INC', 'VHR']" variant="outlined" density="comfortable" />
            </VCol>
            <VCol cols="12" sm="6">
              <VSelect v-model="newReportForm.authority" label="Target Otoritas *" :items="['DKUPPU (DGCA)', 'KNKT', 'Otban Wilayah X', 'AirNav']" variant="outlined" density="comfortable" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="newReportForm.subject" label="Subjek / Ringkasan Kejadian *" variant="outlined" density="comfortable" placeholder="Contoh: Hydraulic failure on landing PK-RCX" />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField v-model="newReportForm.sourceRef" label="Kode Ref Hazard Internal" variant="outlined" density="comfortable" placeholder="HZD-2026-099" />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField v-model="newReportForm.deadline" label="Tenggat Waktu Submit" variant="outlined" density="comfortable" placeholder="28 Aug 2026 12:00" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="pa-4 bg-grey-lighten-4">
          <VSpacer />
          <VBtn color="grey-darken-1" variant="text" class="text-none" @click="uiState.showNewReport = false">Batal</VBtn>
          <VBtn color="primary" variant="elevated" class="text-none font-weight-bold" @click="submitNewReport">Simpan Draft Laporan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 2. Modal Kelola Sertifikat Perusahaan -->
    <VDialog v-model="uiState.showCertLibrary" max-width="700">
      <VCard class="rounded-lg">
        <VCardTitle class="bg-blue-grey-darken-3 text-white font-weight-bold d-flex justify-space-between align-center pa-4">
          <span><VIcon icon="mdi-certificate" class="mr-2" /> Library Sertifikat Maskapai</span>
          <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showCertLibrary = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <VList density="compact">
            <VListItem v-for="cert in companyCerts" :key="cert.name" class="border mb-2 rounded pa-3">
              <div class="d-flex justify-space-between align-center flex-wrap ga-2">
                <div>
                  <div class="font-weight-bold text-subtitle-2">{{ cert.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ cert.desc }} — Expired: {{ cert.expiry }}</div>
                </div>
                <div class="d-flex align-center ga-2">
                  <VChip size="x-small" :color="cert.statusColor" class="font-weight-bold">{{ cert.status }}</VChip>
                  <VBtn size="small" color="primary" variant="outlined" prepend-icon="mdi-download" class="text-none font-weight-bold" @click="downloadDocumentFile(cert.name, cert.expiry)">
                    Download PDF
                  </VBtn>
                </div>
              </div>
            </VListItem>
          </VList>
        </VCardText>
        <VCardActions class="pa-4 bg-grey-lighten-4">
          <VSpacer />
          <VBtn color="grey-darken-2" variant="text" class="text-none font-weight-bold" @click="uiState.showCertLibrary = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 3. Modal Submit Revisi Manual Operasi -->
    <VDialog v-model="uiState.showNewManual" max-width="500">
      <VCard class="rounded-lg">
        <VCardTitle class="bg-primary text-white font-weight-bold pa-4">Submit Revisi Manual Operasi</VCardTitle>
        <VCardText class="pa-4">
          <VTextField v-model="newManualForm.doc" label="Nama Dokumen Manual *" variant="outlined" density="comfortable" class="mb-3" placeholder="misal: Operation Manual Part C" />
          <VTextField v-model="newManualForm.rev" label="Versi Revisi *" variant="outlined" density="comfortable" class="mb-3" placeholder="misal: Rev 16.0" />
          <VFileInput label="Pilih File Dokumen (PDF)" variant="outlined" density="comfortable" prepend-icon="" prepend-inner-icon="mdi-paperclip" />
        </VCardText>
        <VCardActions class="pa-4 bg-grey-lighten-4">
          <VSpacer />
          <VBtn color="grey-darken-1" variant="text" class="text-none" @click="uiState.showNewManual = false">Batal</VBtn>
          <VBtn color="primary" variant="elevated" class="text-none font-weight-bold" @click="submitNewManual">Kirim ke DKUPPU</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 4. Modal Inbox Detail Message Reader -->
    <VDialog v-model="uiState.showInboxReader" max-width="550">
      <VCard v-if="selectedInboxMessage" class="rounded-lg">
        <VCardTitle class="bg-primary text-white d-flex justify-space-between align-center pa-4 text-subtitle-1">
          <span>Surat Otoritas: {{ selectedInboxMessage.authority }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showInboxReader = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3 bg-grey-lighten-4 pa-2 rounded">
            <span class="font-weight-bold text-caption text-primary">{{ selectedInboxMessage.authority }}</span>
            <span class="text-caption text-medium-emphasis">{{ selectedInboxMessage.datetime }}</span>
          </div>
          <h3 class="font-weight-bold text-subtitle-1 mb-2">{{ selectedInboxMessage.subject }}</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ selectedInboxMessage.message }}</p>
          <div class="pa-3 border rounded bg-blue-lighten-5 text-caption text-primary">
            <VIcon icon="mdi-information" class="mr-1" /> Dokumen lampiran resmi terenkripsi SIKU Gateway.
          </div>
        </VCardText>
        <VCardActions class="pa-4 bg-grey-lighten-4">
          <VBtn color="primary" variant="outlined" prepend-icon="mdi-download" class="text-none font-weight-bold" @click="downloadDocumentFile(selectedInboxMessage.subject, selectedInboxMessage.datetime)">
            Download Surat (PDF)
          </VBtn>
          <VSpacer />
          <VBtn color="grey-darken-2" variant="text" class="text-none" @click="uiState.showInboxReader = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 5. Modal Full Mailbox View -->
    <VDialog v-model="uiState.showFullMailbox" max-width="700">
      <VCard class="rounded-lg">
        <VCardTitle class="bg-primary text-white font-weight-bold d-flex justify-space-between align-center pa-4">
          <span><VIcon icon="mdi-email-multiple" class="mr-2" /> Kotak Masuk Surat Otoritas Penerbangan</span>
          <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showFullMailbox = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <VList density="compact">
            <VListItem v-for="mail in authorityInbox" :key="mail.ref" class="border mb-2 rounded pa-3 hover-bg cursor-pointer" @click="openInboxMessage(mail)">
              <div class="d-flex justify-space-between align-start mb-1">
                <span class="font-weight-bold text-caption text-primary">{{ mail.authority }}</span>
                <span class="text-caption text-medium-emphasis" style="font-size: 10px !important;">{{ mail.datetime }}</span>
              </div>
              <div class="font-weight-bold text-body-2 mb-1">{{ mail.subject }}</div>
              <div class="text-caption text-medium-emphasis">{{ mail.message }}</div>
            </VListItem>
          </VList>
        </VCardText>
        <VCardActions class="pa-4 bg-grey-lighten-4">
          <VSpacer />
          <VBtn color="grey-darken-2" variant="text" class="text-none font-weight-bold" @click="uiState.showFullMailbox = false">Tutup Mailbox</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Global Toast Notification -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="bottom right">
      <div class="d-flex align-center">
        <VIcon icon="mdi-check-circle" class="mr-2" />
        <span>{{ snackbar.text }}</span>
      </div>
    </VSnackbar>

  </VContainer>
</template>

<script setup lang="ts">


const activeTab = ref('regulatory')
const lastUpdated = ref('24 Aug 2026 16:56 WIB')
const pageMor = ref(1)
const searchQuery = ref('')
const isRefreshing = ref(false)
const isSubmittingApi = ref<Record<string, boolean>>({})

const filters = reactive({
  type: 'All Types',
  authority: 'All Authorities',
  status: 'All Status'
})

const uiState = reactive({
  showNewReport: false,
  showNewManual: false,
  showInboxReader: false,
  showCertLibrary: false,
  showFullMailbox: false
})

const selectedInboxMessage = ref<any>(null)

const newReportForm = reactive({
  type: 'MOR',
  authority: 'DKUPPU (DGCA)',
  subject: '',
  sourceRef: '',
  deadline: '28 Aug 2026 12:00'
})

const newManualForm = reactive({
  doc: '',
  rev: ''
})

const snackbar = reactive({ show: false, text: '', color: 'success' })

const triggerToast = (msg: string, color = 'success') => {
  snackbar.text = msg
  snackbar.color = color
  snackbar.show = true
}

// Fungsi Universal Download File PDF/CSV Nyata
const downloadDocumentFile = (filename: string, details: string) => {
  const content = `==================================================\nREGULATORY COMPLIANCE OFFICIAL DOCUMENT\n==================================================\nDocument Title : ${filename}\nDetails / Ref  : ${details}\nGenerated Date : ${new Date().toLocaleString()}\nStatus         : VERIFIED & OFFICIAL\n==================================================\nThis document is issued under Safety Management System CASR Part 135.`
  
  const blob = new Blob([content], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_Document.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  triggerToast(`Mengunduh berkas PDF: ${filename}`, 'success')
}

// Export Log CSV Nyata
const handleExportLog = () => {
  let csvContent = 'Reg Ref,Type,Subject,Authority,Deadline,Status,Receipt\n'
  tableRegulatory.value.forEach(row => {
    csvContent += `"${row.ref}","${row.type}","${row.subject}","${row.authority}","${row.deadline}","${row.status}","${row.receipt}"\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Regulatory_Log_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  triggerToast('Berhasil mengunduh log regulasi (CSV)', 'success')
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await new Promise(r => setTimeout(r, 700))
  lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'
  isRefreshing.value = false
  triggerToast('Data regulasi dan sertifikat diperbarui', 'success')
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.type = 'All Types'
  filters.authority = 'All Authorities'
  filters.status = 'All Status'
  triggerToast('Filter berhasil direset', 'info')
}

const testApiConnection = async () => {
  triggerToast('Ngetest koneksi ke server DKUPPU SIKU...', 'info')
  await new Promise(r => setTimeout(r, 600))
  triggerToast('Koneksi SIKU API Gateway aktif & lancar (Ping 32ms)', 'success')
}

const submitReportApi = async (item: any) => {
  isSubmittingApi.value[item.ref] = true
  triggerToast(`Mengirim ${item.ref} ke ${item.authority}...`, 'info')
  
  await new Promise(r => setTimeout(r, 1200))
  
  item.status = 'Acknowledged'
  item.receipt = `DGCA-REC-${Math.floor(1000 + Math.random() * 9000)}`
  item.urgent = false
  isSubmittingApi.value[item.ref] = false
  
  triggerToast(`Laporan ${item.ref} sukses terkirim & diverifikasi ${item.authority}!`, 'success')
}

const submitNewReport = () => {
  if (!newReportForm.subject) {
    triggerToast('Subjek / Ringkasan kejadian wajib diisi!', 'warning')
    return
  }

  const nextRef = `MOR-2026-0${tableRegulatory.value.length + 49}`
  tableRegulatory.value.unshift({
    ref: nextRef,
    type: newReportForm.type,
    sourceRef: newReportForm.sourceRef || 'HZD-2026-NEW',
    subject: newReportForm.subject,
    authority: newReportForm.authority,
    deadline: newReportForm.deadline,
    status: 'Pending Approval',
    receipt: '',
    urgent: true
  })

  uiState.showNewReport = false
  newReportForm.subject = ''
  newReportForm.sourceRef = ''
  triggerToast(`Draft laporan baru ${nextRef} berhasil dibuat!`, 'success')
}

const submitNewManual = () => {
  if (!newManualForm.doc) {
    triggerToast('Nama manual wajib diisi!', 'warning')
    return
  }
  manuals.value.unshift({
    doc: newManualForm.doc,
    rev: newManualForm.rev || '1.0',
    date: 'Hari ini',
    status: 'Pending DKUPPU',
    color: 'warning',
    icon: 'mdi-book-clock-outline'
  })
  uiState.showNewManual = false
  newManualForm.doc = ''
  newManualForm.rev = ''
  triggerToast('Revisi manual berhasil dikirim ke DKUPPU.', 'success')
}

const openInboxMessage = (mail: any) => {
  selectedInboxMessage.value = mail
  uiState.showInboxReader = true
}

const reviewPendingActions = () => {
  filters.status = 'Pending Approval'
  triggerToast('Tabel disaring ke item yang butuh tindakan segera', 'warning')
}

const inspectCert = (cert: any) => {
  downloadDocumentFile(cert.name, `Exp: ${cert.expiry} - Status: ${cert.status}`)
}

// Data Mock
const tableRegulatory = ref([
  { ref: 'MOR-2026-048', type: 'MOR', sourceRef: 'HZD-2026-045', subject: 'Runway Excursion due to muddy surface at Borme (BME)', authority: 'DKUPPU & KNKT', deadline: '25 Aug 2026 10:00', status: 'Pending Approval', receipt: '', urgent: true },
  { ref: 'SDR-2026-021', type: 'SDR', sourceRef: 'HZD-2026-043', subject: 'PT6A Engine Chip Detector warning on PK-RCX (C208B)', authority: 'DKUPPU (DGCA)', deadline: '26 Aug 2026 12:00', status: 'Draft', receipt: '', urgent: true },
  { ref: 'MOR-2026-047', type: 'MOR', sourceRef: 'OCC-2026-022', subject: 'Severe windshear encounter on short final at Oksibil (OKS)', authority: 'DKUPPU (DGCA)', deadline: '24 Aug 2026 16:00', status: 'Acknowledged', receipt: 'DGCA-REC-9988', urgent: false },
  { ref: 'MOR-2026-046', type: 'MOR', sourceRef: 'OCC-2026-020', subject: 'Total loss of HF Communication over Central Highlands', authority: 'AirNav & DKUPPU', deadline: '20 Aug 2026 09:00', status: 'Acknowledged', receipt: 'DGCA-REC-9941', urgent: false },
  { ref: 'SDR-2026-020', type: 'SDR', sourceRef: 'INS-2026-015', subject: 'Main landing gear oleo strut leak after landing at Bokondini', authority: 'DKUPPU (DGCA)', deadline: '18 Aug 2026 14:00', status: 'Acknowledged', receipt: 'DGCA-SDR-8822', urgent: false },
  { ref: 'ASR-2026-092', type: 'ASR', sourceRef: 'HZD-2026-039', subject: 'Stray dogs entering runway during takeoff roll at Wamena', authority: 'Otban Wilayah X', deadline: '-', status: 'Submitted', receipt: 'OTB10-26-092', urgent: false }
])

const companyCerts = ref([
  { name: 'Air Operator Cert (AOC 135)', desc: 'CASR Part 135 Commuter & Charter', expiry: '04 Jun 2027', status: 'Valid', statusColor: 'success', icon: 'mdi-certificate' },
  { name: 'Operations Specs (OpsSpecs)', desc: 'Authorized Areas of Operations', expiry: '04 Jun 2027', status: 'Valid', statusColor: 'success', icon: 'mdi-file-document-multiple' },
  { name: 'Approved Maintenance Org (AMO)', desc: 'CASR Part 145 Base & Line Maint.', expiry: '12 Dec 2026', status: 'Valid', statusColor: 'success', icon: 'mdi-wrench-cog' },
  { name: 'C of A (PK-AMA, AMB, AMC)', desc: 'Certificate of Airworthiness for Fleet', expiry: '15 Sep 2026', status: 'Expiring Soon', statusColor: 'warning', icon: 'mdi-airplane-check' },
  { name: 'Certificate of Registration (C of R)', desc: 'DGCA Aircraft Registry', expiry: '22 Jan 2027', status: 'Valid', statusColor: 'success', icon: 'mdi-book-information-variant' },
  { name: 'Aircraft Radio Station License', desc: 'VHF/HF Transmitters Approval', expiry: '01 Nov 2026', status: 'Valid', statusColor: 'success', icon: 'mdi-radio-tower' },
])

const manuals = ref([
  { doc: 'Company Operations Manual (OM-A)', rev: '12.4', date: '01 Aug 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline' },
  { doc: 'Aircraft Operating Manual (OM-B) C208B', rev: '09.1', date: '10 Aug 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline' },
  { doc: 'Route & Aerodrome Manual (OM-C) Papua', rev: '15.0', date: '20 Aug 2026', status: 'Pending DKUPPU', color: 'warning', icon: 'mdi-book-clock-outline' },
  { doc: 'Safety Management System (SMS) Manual', rev: '05.1', date: '15 Aug 2026', status: 'Pending DKUPPU', color: 'warning', icon: 'mdi-book-clock-outline' },
  { doc: 'Emergency Response Plan (ERP)', rev: '03.0', date: '20 Jul 2026', status: 'Approved', color: 'success', icon: 'mdi-book-check-outline' },
  { doc: 'Dangerous Goods Manual (OM-D)', rev: '08.2', date: '19 Aug 2026', status: 'Under Revision', color: 'error', icon: 'mdi-book-edit-outline' },
])

const upcomingDeadlines = ref([
  { id: 'MOR-2026-048', subject: 'Runway Excursion Borme (BME)', timeLeft: '17h 04m', progress: 85 },
  { id: 'SDR-2026-021', subject: 'Chip Detector Warning PK-RCX', timeLeft: '43h 04m', progress: 40 },
  { id: 'C of A RENEWAL', subject: 'Airworthiness Cert for PK-AMA', timeLeft: '22 Days', progress: 65 },
  { id: 'AOC RENEWAL', subject: 'Submit Application to DKUPPU', timeLeft: '80 Days', progress: 15 },
  { id: 'CAPA FOLLOW-UP', subject: 'Submit corrective action for AUD-26', timeLeft: '5 Days', progress: 90 }
])

const authorityInbox = ref([
  { ref: 'msg-1', authority: 'DKUPPU (DGCA)', subject: 'Receipt Acknowledged: MOR-2026-047', message: 'The report regarding windshear at Oksibil has been reviewed and accepted. Ensure FRAT limits are enforced.', datetime: '24 Aug 2026 10:15', icon: 'mdi-email-check', color: 'success' },
  { ref: 'msg-2', authority: 'Otban Wilayah X', subject: 'Notice: Temporary Closure of Elelim Airstrip', message: 'Elelim airstrip is closed for 3 days due to tribal conflict around the perimeter. Please divert flights.', datetime: '23 Aug 2026 14:00', icon: 'mdi-information-outline', color: 'info' },
  { ref: 'msg-3', authority: 'KNKT', subject: 'Request for Information: AMA126 Borme', message: 'Please provide crew manifests and weather briefing documents for the runway excursion incident at Borme.', datetime: '22 Aug 2026 09:30', icon: 'mdi-alert-circle-outline', color: 'warning' },
  { ref: 'msg-4', authority: 'AirNav Indonesia', subject: 'Coordination: VHF Freq Change Wamena', message: 'New approach frequency for Wamena valley sector will be effective starting next week.', datetime: '21 Aug 2026 11:20', icon: 'mdi-radio-tower', color: 'primary' },
  { ref: 'msg-5', authority: 'DKUPPU (DGCA)', subject: 'Approval: SMS Manual Rev 05', message: 'The submitted SMS manual revision has been stamped and approved by the Directorate.', datetime: '20 Aug 2026 15:45', icon: 'mdi-check-decagram', color: 'success' },
])

const filteredTableRegulatory = computed(() => {
  return tableRegulatory.value.filter(item => {
    const matchSearch = item.ref.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                        item.subject.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchType = filters.type === 'All Types' || item.type === filters.type
    const matchAuth = filters.authority === 'All Authorities' || item.authority.includes(filters.authority.replace(' (DGCA)', ''))
    const matchStatus = filters.status === 'All Status' || item.status === filters.status
    return matchSearch && matchType && matchAuth && matchStatus
  })
})

const pendingSubmissionCount = computed(() => tableRegulatory.value.filter(i => i.status === 'Pending Approval' || i.status === 'Draft').length)
const approvalsPendingCount = computed(() => manuals.value.filter(m => m.status.includes('Pending')).length)

function typeColor(type: string) {
  if (type.includes('MOR')) return 'error'
  if (type.includes('SDR')) return 'warning'
  if (type.includes('ASR')) return 'success'
  return 'primary'
}

function statusColor(status: string) {
  return { 'Draft': 'grey', 'Pending Approval': 'warning', 'Submitted': 'primary', 'Acknowledged': 'success', 'Need Revision': 'error' }[status] || 'grey'
}
</script>

<style scoped>
.hover-bg { transition: background-color 0.15s ease; }
.hover-bg:hover { background-color: rgba(var(--v-theme-on-surface), 0.04) !important; }

.hover-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.hover-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }

.cursor-pointer { cursor: pointer; }

.animation-pulse { animation: pulse 1.5s infinite; }
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes spin { 100% { transform: rotate(360deg); } }
.mdi-spin { animation: spin 1s linear infinite; }

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>