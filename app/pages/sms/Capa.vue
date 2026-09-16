<template>
  <VContainer fluid class="pb-4 pt-2">
    <!-- 1. HEADER HALAMAN -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">CAPA Management</h1>
      <div class="text-caption text-medium-emphasis">Corrective & Preventive Action Tracking</div>
    </div>

    <!-- 2. NAV BAR & REFRESH BUTTON -->
    <div class="d-flex justify-space-between align-center border-b mb-4 flex-wrap">
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
        <VTab value="capa" value-key="capa" class="text-none font-weight-bold">
          <VIcon icon="mdi-clipboard-check-multiple-outline" size="18" class="mr-2" /> CAPA
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

      <div class="d-flex align-center pr-1 pb-1">
        <span class="text-caption text-medium-emphasis mr-3 font-weight-medium">Last updated: {{ lastUpdated }}</span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" @click="handleRefresh"
          class="text-none font-weight-bold" style="background-color: #f0f4ff; border-color: #d0d9f5">
          Refresh Data
        </VBtn>
      </div>
    </div>

    <!-- 3. FILTER TOOLBAR -->
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <VTextField v-model="filters.search" label="Cari CAPA / Subject" prepend-inner-icon="mdi-magnify"
        variant="outlined" density="compact" hide-details style="max-width: 200px" class="font-weight-medium bg-white" clearable />
      <VSelect v-model="filters.station" label="Station" :items="['All Station', 'Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)', 'Timika (TIM)', 'Mulia (MII)']" variant="outlined" density="compact"
        hide-details style="max-width: 160px" class="bg-white" />
      <VSelect v-model="filters.source" label="Source Type" :items="['All Source', 'Hazard Report', 'Occurrence Report', 'Inspection Finding', 'Audit Finding', 'FRAT / Risk']" variant="outlined" density="compact"
        hide-details style="max-width: 170px" class="bg-white" />
      <VSelect v-model="filters.riskLevel" label="Risk Level" :items="['All Risk Level', 'Low', 'Medium', 'High']" variant="outlined"
        density="compact" hide-details style="max-width: 150px" class="bg-white" />
      <VSelect v-model="filters.status" label="Status" :items="['All Status', 'Identified', 'Assigned', 'In Progress', 'Pending Verification', 'Effectiveness Review', 'Closed']" variant="outlined" density="compact"
        hide-details style="max-width: 160px" class="bg-white" />

      <VBtn variant="outlined" density="compact" class="text-none bg-white" height="40" @click="isMoreFiltersDialogOpen = true">
        <VIcon icon="mdi-filter-variant" class="mr-1" /> More Filters
      </VBtn>
      <VSpacer />
      <VBtn color="primary" variant="elevated" prepend-icon="mdi-plus" class="text-none font-weight-bold" height="40" @click="openNewCapaDialog()">
        New CAPA
      </VBtn>
    </div>

    <!-- 4. KPI SCORECARDS -->
    <VRow class="mb-4 align-stretch" style="gap: 12px; margin-left: 0; margin-right: 0">
      <SmsKpiCard v-for="(kpi, i) in capaKpis" :key="i" v-bind="kpi" style="flex: 1 1 0%; min-width: 0"
        class="elevation-0 border rounded-lg" />
    </VRow>

    <VRow>
      <!-- LEFT AREA: Kanban & Table -->
      <VCol cols="12" xl="9" lg="8">
        <!-- Kanban Board Overview -->
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-subtitle-1 font-weight-bold">CAPA Status (Kanban Overview)</div>
          <span class="text-caption text-medium-emphasis">Menampilkan {{ filteredTableCapa.length }} item</span>
        </div>
        <div class="kanban-container pb-2 mb-4 d-flex ga-4">
          <VSheet v-for="col in kanbanColumns" :key="col.id" border rounded="lg"
            class="kanban-col bg-grey-lighten-4 pa-2 d-flex flex-column elevation-0">
            <div class="d-flex justify-space-between align-center mb-3 pa-1">
              <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">{{
                col.title
              }}</span>
              <VChip size="x-small" variant="flat" color="grey-lighten-2" class="font-weight-bold text-black">{{
                col.items.length }}</VChip>
            </div>

            <div class="d-flex flex-column ga-2 flex-grow-1 overflow-y-auto pr-1" style="max-height: 280px">
              <VCard v-for="card in col.items" :key="card.id" border elevation="0"
                class="pa-3 rounded-lg flex-shrink-0 cursor-pointer" @click="openDetailDialog(card)">
                <div class="text-caption font-weight-bold mb-1">{{ card.id }}</div>
                <div class="text-caption text-medium-emphasis mb-3 line-clamp-2" style="min-height: 36px">
                  {{ card.subject }}
                </div>
                <div class="d-flex ga-2 align-center justify-space-between">
                  <VChip :color="riskColor(card.risk)" size="x-small" variant="tonal" class="font-weight-bold px-2">{{
                    card.risk }}</VChip>
                  <span class="text-caption text-medium-emphasis font-weight-medium">{{ card.station }}</span>
                </div>
              </VCard>

              <div v-if="col.items.length === 0" class="text-caption text-center text-medium-emphasis my-auto py-4">
                Kosong
              </div>
            </div>

            <VBtn variant="text" size="small" class="text-none mt-2 text-medium-emphasis w-100 justify-start"
              prepend-icon="mdi-plus" @click="openNewCapaDialog(col.title)">
              Add CAPA
            </VBtn>
          </VSheet>
        </div>

        <!-- CAPA Register Table -->
        <VCard border class="h-100 elevation-0 rounded-lg">
          <div class="d-flex align-center justify-space-between pa-3 border-b bg-white">
            <div class="text-subtitle-1 font-weight-bold">CAPA Register</div>
            <div>
              <VBtn variant="text" prepend-icon="mdi-download" density="compact"
                class="text-none text-medium-emphasis mr-2" @click="exportCapaData">Export</VBtn>
              <VBtn variant="text" prepend-icon="mdi-view-column-outline" density="compact"
                class="text-none text-medium-emphasis" @click="isColumnSettingsDialogOpen = true">Columns</VBtn>
            </div>
          </div>

          <VTable density="compact" hover>
            <thead>
              <tr>
                <th v-if="visibleColumns.id" class="text-caption font-weight-bold text-uppercase">CAPA ID</th>
                <th v-if="visibleColumns.source" class="text-caption font-weight-bold text-uppercase">Source</th>
                <th v-if="visibleColumns.relatedTo" class="text-caption font-weight-bold text-uppercase">Related To</th>
                <th v-if="visibleColumns.subject" class="text-caption font-weight-bold text-uppercase">Subject / Action Required</th>
                <th v-if="visibleColumns.risk" class="text-caption font-weight-bold text-uppercase">Risk</th>
                <th v-if="visibleColumns.owner" class="text-caption font-weight-bold text-uppercase">Owner</th>
                <th v-if="visibleColumns.dueDate" class="text-caption font-weight-bold text-uppercase">Due Date</th>
                <th v-if="visibleColumns.status" class="text-caption font-weight-bold text-uppercase">Status</th>
                <th v-if="visibleColumns.progress" class="text-caption font-weight-bold text-uppercase" style="min-width: 100px">Progress</th>
                <th v-if="visibleColumns.actions" class="text-caption font-weight-bold text-uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedTableCapa" :key="item.id" style="cursor: pointer" @click="openDetailDialog(item)">
                <td v-if="visibleColumns.id" class="text-caption font-weight-bold">{{ item.id }}</td>
                <td v-if="visibleColumns.source" class="text-caption">{{ item.source }}</td>
                <td v-if="visibleColumns.relatedTo" class="text-caption text-medium-emphasis">{{ item.relatedTo }}</td>
                <td v-if="visibleColumns.subject" class="text-caption" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ item.subject }}
                </td>
                <td v-if="visibleColumns.risk">
                  <VChip :color="riskColor(item.risk)" size="x-small" variant="tonal" class="font-weight-bold px-2">{{ item.risk }}</VChip>
                </td>
                <td v-if="visibleColumns.owner" class="text-caption">{{ item.owner }}</td>
                <td v-if="visibleColumns.dueDate" :class="['text-caption font-weight-medium', isOverdue(item.dueDate) && item.status !== 'Closed' ? 'text-error' : '']">
                  {{ item.dueDate }}
                </td>
                <td v-if="visibleColumns.status">
                  <VChip :color="statusColor(item.status)" size="x-small" variant="outlined" class="font-weight-bold bg-white px-2">{{ item.status }}</VChip>
                </td>
                <td v-if="visibleColumns.progress">
                  <div class="d-flex align-center ga-2">
                    <VProgressLinear :model-value="item.progress" :color="item.progress === 100 ? 'success' : 'primary'" height="6" rounded class="flex-grow-1" />
                    <span class="text-caption" style="min-width: 28px">{{ item.progress }}%</span>
                  </div>
                </td>
                <td v-if="visibleColumns.actions">
                  <div class="d-flex justify-center ga-1">
                    <VBtn icon="mdi-eye-outline" variant="text" density="compact" size="small" color="primary" @click.stop="openDetailDialog(item)" />
                    <VBtn icon="mdi-pencil-outline" variant="text" density="compact" size="small" color="grey-darken-1" @click.stop="editCapa(item)" />
                  </div>
                </td>
              </tr>
              <tr v-if="paginatedTableCapa.length === 0">
                <td colspan="10" class="text-center text-medium-emphasis py-4">Tidak ada data CAPA sesuai filter.</td>
              </tr>
            </tbody>
          </VTable>

          <div class="d-flex align-center pa-3 border-t">
            <span class="text-caption text-medium-emphasis">Showing {{ paginatedTableCapa.length > 0 ? (page - 1) * itemsPerPage + 1 : 0 }} to {{ Math.min(page * itemsPerPage, filteredTableCapa.length) }} of {{ filteredTableCapa.length }} results</span>
            <VSpacer />
            <VPagination v-model="page" :length="maxPages" density="compact" active-color="primary" />
          </div>
        </VCard>
      </VCol>

      <!-- RIGHT PANEL: Analytics & Summaries -->
      <VCol cols="12" xl="3" lg="4" class="d-flex flex-column ga-4">
        <VRow density="compact">
          <VCol cols="12" sm="6" lg="12">
            <SmsDonutSummary title="CAPA Aging" v-bind="capaAging" class="h-100 elevation-0 border rounded-lg" />
          </VCol>
          <VCol cols="12" sm="6" lg="12" class="mt-lg-4 mt-sm-0">
            <SmsMetricBarList title="CAPA by Source" v-bind="capaBySource" class="h-100 elevation-0 border rounded-lg" />
          </VCol>
        </VRow>

        <!-- Effectiveness Review Card (Dinamis) -->
        <VCard border class="pa-4 elevation-0 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-4">Effectiveness Review</div>
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="position-relative d-flex align-center justify-center mr-4" style="width: 100px; height: 100px">
              <svg viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 100px; height: 100px">
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#E0E0E0" stroke-width="4"></circle>
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#43A047" stroke-width="4" stroke-dasharray="100 100" stroke-dashoffset="22"></circle>
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#FB8C00" stroke-width="4" stroke-dasharray="17 100" stroke-dashoffset="0"></circle>
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#E53935" stroke-width="4" stroke-dasharray="5 100" stroke-dashoffset="-17"></circle>
              </svg>
              <div class="position-absolute d-flex flex-column align-center text-center">
                <span class="text-h6 font-weight-bold line-height-1">78%</span>
                <span class="text-caption text-medium-emphasis" style="font-size: 10px !important">Effective</span>
              </div>
            </div>

            <div class="flex-grow-1">
              <div class="d-flex justify-space-between text-caption mb-2">
                <div><VIcon icon="mdi-circle" color="success" size="12" class="mr-1" /> Effective</div>
                <div class="font-weight-bold">14 (78%)</div>
              </div>
              <div class="d-flex justify-space-between text-caption mb-2">
                <div><VIcon icon="mdi-circle" color="warning" size="12" class="mr-1" /> Partially Effective</div>
                <div class="font-weight-bold">3 (17%)</div>
              </div>
              <div class="d-flex justify-space-between text-caption mb-3">
                <div><VIcon icon="mdi-circle" color="error" size="12" class="mr-1" /> Not Effective</div>
                <div class="font-weight-bold">1 (5%)</div>
              </div>
              <div class="text-caption text-medium-emphasis text-center border-t pt-2">Total Reviewed: 18</div>
            </div>
          </div>
          <VBtn block variant="outlined" color="primary" class="text-none" @click="isEffectivenessDialogOpen = true">
            View Effectiveness Review ({{ effectivenessList.length }})
          </VBtn>
        </VCard>

        <!-- MTD Performance Card -->
        <VCard border class="pa-4 elevation-0 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-4">CAPA Performance (MTD)</div>
          <VRow density="compact">
            <VCol cols="4">
              <div class="text-caption text-medium-emphasis">Created</div>
              <div class="text-h5 font-weight-bold">{{ tableCapa.length }}</div>
              <div class="text-caption text-success mt-1"><VIcon icon="mdi-arrow-up-thin" size="14" /> 29%</div>
            </VCol>
            <VCol cols="4" class="border-s pl-3">
              <div class="text-caption text-medium-emphasis">Closed</div>
              <div class="text-h5 font-weight-bold">{{ tableCapa.filter((c : any) => c.status === 'Closed').length }}</div>
              <div class="text-caption text-success mt-1"><VIcon icon="mdi-arrow-up-thin" size="14" /> 38%</div>
            </VCol>
            <VCol cols="4" class="border-s pl-3">
              <div class="text-caption text-medium-emphasis">Overdue</div>
              <div class="text-h5 font-weight-bold">{{ tableCapa.filter((c : any) => isOverdue(c.dueDate) && c.status !== 'Closed').length }}</div>
              <div class="text-caption text-success mt-1"><VIcon icon="mdi-arrow-down-thin" size="14" /> 33%</div>
            </VCol>
          </VRow>
        </VCard>

        <!-- Dynamic Sidebar Review / Follow Up Widget -->
        <VCard border class="pa-4 elevation-0 rounded-lg flex-grow-1">
          <div class="text-subtitle-2 font-weight-bold mb-3">Upcoming Review / Follow Up</div>
          <div v-if="upcomingFollowUps.length > 0">
            <div v-for="item in upcomingFollowUps.slice(0, 3)" :key="item.id" class="d-flex justify-space-between text-caption mb-2 pb-2 border-b">
              <span class="font-weight-medium">{{ item.id }}</span>
              <span class="text-medium-emphasis text-truncate" style="max-width: 100px">{{ item.status }}</span>
              <span>{{ item.dueDate }}</span>
            </div>
          </div>
          <div v-else class="text-caption text-medium-emphasis mb-4">Tidak ada jadwal pending.</div>
          <div class="text-center mt-auto pt-2">
            <a href="#" class="text-caption font-weight-bold text-primary text-decoration-none" @click.prevent="isFollowUpsDialogOpen = true">
              View All Follow Ups ({{ upcomingFollowUps.length }})
            </a>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Footer Note -->
    <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis mt-4 px-2">
      <div class="d-flex align-center">
        <VIcon icon="mdi-information-outline" size="16" class="mr-2" />
        All CAPA actions are tracked until completion and effectiveness is verified.
        <span class="mx-2">|
        CAPA data is confidential and protected under Safety Data Protection policy.
        </span>
      </div>
      <div>
        Need help? <a href="#" class="text-primary text-decoration-none" @click.prevent="isUserGuideDialogOpen = true">See CAPA User Guide</a>
      </div>
    </div>
  </VContainer>

  <!-- DIALOG 1: NEW / EDIT CAPA -->
  <VDialog v-model="isNewCapaDialogOpen" max-width="600px">
    <VCard rounded="lg">
      <VCardTitle class="d-flex justify-space-between align-center bg-primary text-white pa-4">
        <span>{{ isEditMode ? 'Edit CAPA Record' : 'Create New CAPA Record' }}</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isNewCapaDialogOpen = false" />
      </VCardTitle>

      <VCardText class="pa-4">
        <VForm @submit.prevent="saveCapa">
          <VRow>
            <VCol cols="12" sm="6">
              <VTextField v-model="capaForm.id" label="CAPA ID" variant="outlined" density="compact" readonly disabled />
            </VCol>

            <VCol cols="12" sm="6">
              <!-- PERBAIKAN 1: Form Station disamakan dengan format filter -->
              <VSelect v-model="capaForm.station" label="Station" :items="['Sentani (DJJ)', 'Wamena (WMX)', 'Dekai (DKI)', 'Timika (TIM)', 'Mulia (MII)']" variant="outlined" density="compact" required />
            </VCol>

            <VCol cols="12" sm="6">
              <VSelect v-model="capaForm.source" label="Source Type" :items="['Hazard Report', 'Occurrence Report', 'Inspection Finding', 'Audit Finding', 'FRAT / Risk']" variant="outlined" density="compact" required />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField v-model="capaForm.relatedTo" label="Related Ref ID" variant="outlined" density="compact" placeholder="Misal: HZD-2026-041" required />
            </VCol>

            <VCol cols="12" sm="6">
              <VSelect v-model="capaForm.risk" label="Risk Level" :items="['Low', 'Medium', 'High']" variant="outlined" density="compact" required />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField v-model="capaForm.owner" label="Action Owner / PIC" variant="outlined" density="compact" required />
            </VCol>

            <VCol cols="12">
              <VTextField v-model="capaForm.subject" label="Subject / Action Required" variant="outlined" density="compact" placeholder="Uraian tindakan korektif..." required />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField v-model="capaForm.dueDate" label="Due Date" variant="outlined" density="compact" placeholder="Contoh: 30 Sep 2026" required />
            </VCol>

            <VCol cols="12" sm="6">
              <VSelect v-model="capaForm.status" label="Status" :items="['Identified', 'Assigned', 'In Progress', 'Pending Verification', 'Effectiveness Review', 'Closed']" variant="outlined" density="compact" required />
            </VCol>

            <VCol cols="12">
              <div class="d-flex align-center justify-space-between text-caption mb-1">
                <span>Progress Completion: {{ capaForm.progress }}%</span>
              </div>
              <VSlider v-model="capaForm.progress" :min="0" :max="100" :step="5" color="primary" thumb-label hide-details />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="pa-4 border-t d-flex justify-end ga-2">
        <VBtn variant="outlined" color="secondary" class="text-none" @click="isNewCapaDialogOpen = false">Batal</VBtn>
        <VBtn color="primary" variant="elevated" class="text-none" @click="saveCapa">Simpan CAPA</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 2: CAPA DETAIL -->
  <VDialog v-model="isDetailDialogOpen" max-width="550px">
    <VCard v-if="detailCapa" rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>Detail CAPA: {{ detailCapa.id }}</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isDetailDialogOpen = false" />
      </VCardTitle>

      <VCardText class="pa-4">
        <VRow class="mb-3">
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Source & Ref</div>
            <div class="font-weight-bold">{{ detailCapa.source }} ({{ detailCapa.relatedTo }})</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Station & Risk</div>
            <div class="d-flex ga-2 align-center mt-1">
              <VChip size="x-small" color="secondary" variant="flat" class="font-weight-bold">{{ detailCapa.station || 'Sentani (DJJ)' }}</VChip>
              <VChip size="x-small" :color="riskColor(detailCapa.risk)" class="font-weight-bold">{{ detailCapa.risk }} Risk</VChip>
            </div>
          </VCol>
          <VCol cols="12">
            <div class="text-caption text-medium-emphasis">Subject / Action Required</div>
            <div class="text-body-2 font-weight-medium mt-1">{{ detailCapa.subject }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Owner (PIC)</div>
            <div class="font-weight-medium">{{ detailCapa.owner }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Due Date</div>
            <div class="font-weight-medium" :class="isOverdue(detailCapa.dueDate) && detailCapa.status !== 'Closed' ? 'text-error' : ''">{{ detailCapa.dueDate }}</div>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Status</div>
            <VChip size="small" :color="statusColor(detailCapa.status)" class="mt-1 font-weight-bold">{{ detailCapa.status }}</VChip>
          </VCol>
          <VCol cols="6">
            <div class="text-caption text-medium-emphasis">Progress Completion</div>
            <div class="d-flex align-center ga-2 mt-1">
              <VProgressLinear :model-value="detailCapa.progress" :color="detailCapa.progress === 100 ? 'success' : 'primary'" height="8" rounded class="flex-grow-1" />
              <span class="text-caption font-weight-bold">{{ detailCapa.progress }}%</span>
            </div>
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-4 border-t d-flex justify-space-between">
        <VBtn color="error" variant="text" prepend-icon="mdi-delete-outline" class="text-none" @click="deleteCapa(detailCapa.id)">Hapus</VBtn>
        <div class="d-flex ga-2">
          <VBtn color="primary" variant="outlined" class="text-none" @click="editCapa(detailCapa)">Edit Record</VBtn>
          <VBtn color="primary" variant="elevated" class="text-none" @click="isDetailDialogOpen = false">Tutup</VBtn>
        </div>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 3: MORE FILTERS MODAL -->
  <VDialog v-model="isMoreFiltersDialogOpen" max-width="500px">
    <VCard rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>Filter Lanjutan CAPA</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isMoreFiltersDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <VRow>
          <VCol cols="12">
            <VTextField v-model="filters.search" label="Kata Kunci Subjek / ID" variant="outlined" density="compact" clearable />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="filters.owner" label="Filter Owner / PIC" variant="outlined" density="compact" clearable placeholder="Misal: Safety Manager" />
          </VCol>
          <VCol cols="12">
            <div class="text-caption text-medium-emphasis mb-1">Minimum Progress (%)</div>
            <VSlider v-model="filters.minProgress" :min="0" :max="100" :step="10" thumb-label color="primary" />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-space-between">
        <VBtn color="warning" variant="text" class="text-none" @click="resetFilters">Reset Filter</VBtn>
        <VBtn color="primary" variant="elevated" class="text-none" @click="isMoreFiltersDialogOpen = false">Terapkan Filter</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 4: COLUMN SETTINGS MODAL -->
  <VDialog v-model="isColumnSettingsDialogOpen" max-width="450px">
    <VCard rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>Pengaturan Tampilan Kolom Tabel</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isColumnSettingsDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <div class="text-caption text-medium-emphasis mb-3">Pilih kolom yang ingin ditampilkan pada tabel CAPA Register:</div>
        <VRow density="compact">
          <VCol cols="6"><VCheckbox v-model="visibleColumns.id" label="CAPA ID" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.source" label="Source" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.relatedTo" label="Related To" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.subject" label="Subject / Action" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.risk" label="Risk Level" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.owner" label="Owner / PIC" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.dueDate" label="Due Date" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.status" label="Status" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.progress" label="Progress" density="compact" hide-details /></VCol>
          <VCol cols="6"><VCheckbox v-model="visibleColumns.actions" label="Actions" density="compact" hide-details /></VCol>
        </VRow>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end ga-2">
        <VBtn color="secondary" variant="outlined" class="text-none" @click="resetColumns">Reset Kolom</VBtn>
        <VBtn color="primary" variant="elevated" class="text-none" @click="isColumnSettingsDialogOpen = false">Simpan Tampilan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 5: EFFECTIVENESS REVIEW MODAL (Dinamis dari tableCapa) -->
  <VDialog v-model="isEffectivenessDialogOpen" max-width="700px">
    <VCard rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>CAPA Effectiveness Review Summary</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isEffectivenessDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <div class="text-subtitle-2 font-weight-bold mb-2">Evaluasi Hasil Tindakan Korektif</div>
        <VTable density="compact" border class="rounded-lg mb-3">
          <thead>
            <tr>
              <th class="font-weight-bold">CAPA ID</th>
              <th class="font-weight-bold">Tindakan / Subjek</th>
              <th class="font-weight-bold">Status</th>
              <th class="font-weight-bold">PIC & Target</th>
            </tr>
          </thead>
          <tbody v-if="effectivenessList.length > 0">
            <tr v-for="item in effectivenessList" :key="item.id">
              <td class="font-weight-bold">{{ item.id }}</td>
              <td>{{ item.subject }}</td>
              <td><VChip size="x-small" :color="statusColor(item.status)">{{ item.status }}</VChip></td>
              <td class="text-caption">{{ item.owner }} (Due: {{ item.dueDate }})</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="4" class="text-center py-4 text-medium-emphasis">Belum ada data Effectiveness Review.</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn color="primary" variant="elevated" class="text-none" @click="isEffectivenessDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 6: UPCOMING FOLLOW UPS MODAL (Dinamis dari tableCapa) -->
  <VDialog v-model="isFollowUpsDialogOpen" max-width="600px">
    <VCard rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>Jadwal Follow Up & Verifikasi CAPA</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isFollowUpsDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <VList lines="two" v-if="upcomingFollowUps.length > 0">
          <VListItem v-for="item in upcomingFollowUps" :key="item.id" border rounded class="mb-2">
            <template #prepend>
              <VIcon icon="mdi-calendar-clock" color="warning" class="mr-2" />
            </template>
            <VListItemTitle class="font-weight-bold">{{ item.id }} — {{ item.subject }}</VListItemTitle>
            <VListItemSubtitle>Jadwal: {{ item.dueDate }} | PIC: {{ item.owner }} (Status: {{ item.status }})</VListItemSubtitle>
          </VListItem>
        </VList>
        <div v-else class="text-caption text-center text-medium-emphasis py-4">
          Tidak ada jadwal follow up aktif saat ini.
        </div>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn color="primary" variant="elevated" class="text-none" @click="isFollowUpsDialogOpen = false">Tutup</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- DIALOG 7: USER GUIDE MODAL -->
  <VDialog v-model="isUserGuideDialogOpen" max-width="650px">
    <VCard rounded="lg">
      <VCardTitle class="bg-primary text-white pa-4 d-flex justify-space-between align-center">
        <span>CAPA User Guide & Standard Operating Procedure</span>
        <VBtn icon="mdi-close" variant="text" color="white" density="compact" @click="isUserGuideDialogOpen = false" />
      </VCardTitle>
      <VCardText class="pa-4">
        <div class="text-subtitle-2 font-weight-bold mb-2">Panduan Alur Kerja CAPA SMS:</div>
        <ol class="pl-4 text-body-2 d-flex flex-column ga-2">
          <li><strong>Identifikasi (Identified):</strong> CAPA otomatis atau manual dibuat berdasarkan Hazard, Occurrence, Audit, atau Hasil FRAT.</li>
          <li><strong>Penugasan (Assigned):</strong> Penunjukan Action Owner (PIC) beserta penetapan batas waktu (Due Date).</li>
          <li><strong>Pelaksanaan (In Progress):</strong> PIC melaksanakan tindakan perbaikan hingga kemajuan mencapai 100%.</li>
          <li><strong>Verifikasi (Pending Verification):</strong> Tim Safety/Quality memverifikasi bukti pelaksanaan tindakan.</li>
          <li><strong>Tinjauan Efektivitas (Effectiveness Review):</strong> Evaluasi berkala untuk memastikan bahaya tidak terulang.</li>
          <li><strong>Selesai (Closed):</strong> CAPA dinyatakan ditutup resmi oleh Safety Manager.</li>
        </ol>
      </VCardText>
      <VCardActions class="pa-4 border-t d-flex justify-end">
        <VBtn color="primary" variant="elevated" class="text-none" @click="isUserGuideDialogOpen = false">Mengerti</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- SNACKBAR NOTIFIKASI -->
  <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top right">
    <VIcon icon="mdi-check-circle" class="mr-2" />
    {{ snackbar.text }}
  </VSnackbar>
</template>

<script setup lang="ts">
//import { ref, reactive, computed } from 'vue';

interface CapaItem {
  id: string;
  source: string;
  relatedTo: string;
  subject: string;
  risk: string;
  owner: string;
  dueDate: string;
  status: string;
  progress: number;
  station: string;
}

const activeTab = ref('capa');
const lastUpdated = ref('21 Aug 2026 10:30 WIB');
const page = ref<number>(1);
const itemsPerPage = 5;

// Dialog States
const isNewCapaDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const isMoreFiltersDialogOpen = ref(false);
const isColumnSettingsDialogOpen = ref(false);
const isEffectivenessDialogOpen = ref(false);
const isFollowUpsDialogOpen = ref(false);
const isUserGuideDialogOpen = ref(false);

const isEditMode = ref(false);
const detailCapa = ref<CapaItem | null>(null);

// Visibility Kolom Tabel
const visibleColumns = reactive({
  id: true,
  source: true,
  relatedTo: true,
  subject: true,
  risk: true,
  owner: true,
  dueDate: true,
  status: true,
  progress: true,
  actions: true
});

const filters = reactive({
  search: '',
  dateRange: '01 – 21 Aug 2026',
  station: 'All Station',
  source: 'All Source',
  riskLevel: 'All Risk Level',
  status: 'All Status',
  owner: '',
  minProgress: 0
});

const capaForm = reactive<CapaItem>({
  id: '',
  source: 'Hazard Report',
  relatedTo: '',
  subject: '',
  risk: 'Medium',
  owner: '',
  dueDate: '',
  status: 'Identified',
  progress: 0,
  station: 'Sentani (DJJ)'
});

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
});

// Master Data CAPA
const tableCapa = ref<CapaItem[]>([
  {
    id: 'CAPA-2026-001',
    source: 'Hazard Report',
    relatedTo: 'HZD-2026-041',
    subject: 'Airstrip drainage inadequate — causes water pooling',
    risk: 'High',
    owner: 'Station Manager WMX',
    dueDate: '18 Aug 2026',
    status: 'Effectiveness Review',
    progress: 90,
    station: 'Wamena (WMX)'
  },
  {
    id: 'CAPA-2026-018',
    source: 'Occurrence Report',
    relatedTo: 'OCC-2026-015',
    subject: 'Radio communication intermittent in final approach',
    risk: 'Medium',
    owner: 'Safety Manager',
    dueDate: '25 Aug 2026',
    status: 'In Progress',
    progress: 60,
    station: 'Timika (TIM)'
  },
  {
    id: 'CAPA-2026-022',
    source: 'Inspection Finding',
    relatedTo: 'INS-2026-027',
    subject: 'FOD observed at parking area',
    risk: 'Low',
    owner: 'Ground Handling',
    dueDate: '02 Sep 2026',
    status: 'Assigned',
    progress: 25,
    station: 'Dekai (DKI)'
  },
  {
    id: 'CAPA-2026-011',
    source: 'FRAT / Risk',
    relatedTo: 'FRAT-2026-034',
    subject: 'Crew fatigue management improvement',
    risk: 'High',
    owner: 'OCC Supervisor',
    dueDate: '15 Aug 2026',
    status: 'In Progress',
    progress: 75,
    station: 'Sentani (DJJ)'
  },
  {
    id: 'CAPA-2026-003',
    source: 'Hazard Report',
    relatedTo: 'HZD-2026-012',
    subject: 'Refuelling checklist update & training',
    risk: 'Medium',
    owner: 'Quality Assurance',
    dueDate: '30 Aug 2026',
    status: 'Effectiveness Review',
    progress: 80,
    station: 'Sentani (DJJ)'
  },
  {
    id: 'CAPA-2026-004',
    source: 'Audit Finding',
    relatedTo: 'AUD-2026-006',
    subject: 'Lighting at parking stand not adequate',
    risk: 'Low',
    owner: 'Engineering',
    dueDate: '12 Aug 2026',
    status: 'Closed',
    progress: 100,
    station: 'Sentani (DJJ)'
  },
  {
    id: 'CAPA-2026-021',
    source: 'Hazard Report',
    relatedTo: 'HZD-2026-052',
    subject: 'Fuel handling procedure gap',
    risk: 'High',
    owner: 'Fuel Supervisor',
    dueDate: '05 Sep 2026',
    status: 'Identified',
    progress: 10,
    station: 'Wamena (WMX)'
  },
  {
    id: 'CAPA-2026-023',
    source: 'Inspection Finding',
    relatedTo: 'INS-2026-030',
    subject: 'Toolbox not serviceable in hangar',
    risk: 'Low',
    owner: 'Maintenance Lead',
    dueDate: '10 Sep 2026',
    status: 'Identified',
    progress: 0,
    station: 'Mulia (MII)'
  }
]);

// Computed list dinamis untuk modal dialog 5 & 6
const effectivenessList = computed(() => {
  return tableCapa.value.filter(c => c.status === 'Effectiveness Review');
});

const upcomingFollowUps = computed(() => {
  return tableCapa.value.filter(c => c.status !== 'Closed');
});

// Filtering Logic
const filteredTableCapa = computed(() => {
  return tableCapa.value.filter(item => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchSearch = item.subject.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.relatedTo.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (filters.station !== 'All Station' && !item.station.includes(filters.station.split(' ')[0])) return false;
    if (filters.source !== 'All Source' && item.source !== filters.source) return false;
    if (filters.riskLevel !== 'All Risk Level' && item.risk !== filters.riskLevel) return false;
    if (filters.status !== 'All Status' && item.status !== filters.status) return false;
    if (filters.owner && !item.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
    if (item.progress < filters.minProgress) return false;

    return true;
  });
});

// Dynamic Kanban Board Data based on Filtered Data
const kanbanStatuses = [
  { id: 'ident', title: 'Identified' },
  { id: 'assign', title: 'Assigned' },
  { id: 'prog', title: 'In Progress' },
  { id: 'verif', title: 'Pending Verification' },
  { id: 'eff', title: 'Effectiveness Review' },
  { id: 'closed', title: 'Closed' }
];

const kanbanColumns = computed(() => {
  return kanbanStatuses.map(col => {
    const items = filteredTableCapa.value.filter(item => item.status === col.title);
    return {
      id: col.id,
      title: col.title,
      items: items
    };
  });
});

const maxPages = computed(() => Math.max(1, Math.ceil(filteredTableCapa.value.length / itemsPerPage)));

const paginatedTableCapa = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredTableCapa.value.slice(start, start + itemsPerPage);
});

// Handlers
const handleRefresh = () => {
  lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
  showToast('Data CAPA berhasil diperbarui!');
};

const resetFilters = () => {
  filters.search = '';
  filters.station = 'All Station';
  filters.source = 'All Source';
  filters.riskLevel = 'All Risk Level';
  filters.status = 'All Status';
  filters.owner = '';
  filters.minProgress = 0;
  showToast('Seluruh filter telah direset!');
};

const resetColumns = () => {
  Object.keys(visibleColumns).forEach(k => {
    (visibleColumns as any)[k] = true;
  });
  showToast('Tampilan kolom kembali ke semula.');
};

const openNewCapaDialog = (initialStatus?: string) => {
  isEditMode.value = false;
  capaForm.id = `CAPA-2026-0${tableCapa.value.length + 25}`;
  capaForm.source = 'Hazard Report';
  capaForm.relatedTo = '';
  capaForm.subject = '';
  capaForm.risk = 'Medium';
  capaForm.owner = '';
  capaForm.dueDate = '30 Sep 2026';
  capaForm.status = initialStatus || 'Identified';
  capaForm.progress = 0;
  capaForm.station = 'Sentani (DJJ)';
  isNewCapaDialogOpen.value = true;
};

const editCapa = (item: CapaItem) => {
  isEditMode.value = true;
  Object.assign(capaForm, item);
  isDetailDialogOpen.value = false;
  isNewCapaDialogOpen.value = true;
};

const saveCapa = () => {
  if (!capaForm.subject || !capaForm.owner) {
    showToast('Mohon isi Subjek dan Pemilik / PIC CAPA!', 'error');
    return;
  }

  if (isEditMode.value) {
    const idx = tableCapa.value.findIndex(c => c.id === capaForm.id);
    if (idx !== -1) {
      tableCapa.value[idx] = { ...capaForm };
      detailCapa.value = { ...capaForm }; // PERBAIKAN: Update data detail yang terbuka
    }
    showToast(`CAPA ${capaForm.id} berhasil diperbarui!`);
  } else {
    tableCapa.value.unshift({ ...capaForm });
    showToast(`CAPA baru ${capaForm.id} berhasil ditambahkan!`);
  }

  isNewCapaDialogOpen.value = false;
};

const deleteCapa = (id: string) => {
  tableCapa.value = tableCapa.value.filter(c => c.id !== id);
  isDetailDialogOpen.value = false;
  showToast(`CAPA ${id} telah dihapus.`, 'warning');
};

const openDetailDialog = (item: CapaItem) => {
  detailCapa.value = item;
  isDetailDialogOpen.value = true;
};

const exportCapaData = () => {
  let csvContent = 'CAPA ID,Source,Related To,Subject,Risk,Owner,Due Date,Status,Progress,Station\n';
  filteredTableCapa.value.forEach(item => {
    csvContent += `"${item.id}","${item.source}","${item.relatedTo}","${item.subject}","${item.risk}","${item.owner}","${item.dueDate}","${item.status}",${item.progress}%,"${item.station}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'CAPA_Register_Data.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Data CAPA Register berhasil diekspor ke file CSV!');
};

const showToast = (text: string, color: string = 'success') => {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
};

// KPI Metrics Khusus CAPA
const capaKpis = ref([
  {
    title: 'Total CAPA',
    value: '27',
    icon: 'mdi-clipboard-text-outline',
    color: 'primary',
    trend: { icon: 'mdi-arrow-up-thin', text: '18% vs last year', tone: 'bad' }
  },
  {
    title: 'Open',
    value: '5',
    icon: 'mdi-folder-open-outline',
    color: 'info',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs last week', tone: 'bad' }
  },
  {
    title: 'Due < 7 Days',
    value: '2',
    icon: 'mdi-clipboard-check-outline',
    color: 'warning',
    trend: { icon: 'mdi-arrow-up-thin', text: '1 vs last week', tone: 'neutral' }
  },
  {
    title: 'Overdue',
    value: '2',
    icon: 'mdi-clock-alert-outline',
    color: 'error',
    trend: { icon: 'mdi-arrow-down-thin', text: '1 vs last week', tone: 'good' }
  },
  {
    title: 'Closed (This Month)',
    value: '18',
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    trend: { icon: 'mdi-arrow-up-thin', text: '4 vs last month', tone: 'good' }
  },
  {
    title: 'Effectiveness Pending',
    value: '3',
    icon: 'mdi-file-eye-outline',
    color: 'deep-purple-accent-1',
    trend: { icon: 'mdi-minus', text: 'vs last week', tone: 'neutral' }
  },
  {
    title: 'On-Time Completion',
    value: '86%',
    icon: 'mdi-target',
    color: 'info',
    target: 'Target: ≥ 95%'
  }
]);

// Data Grafis Kanan
const capaAging = {
  total: 10,
  totalLabel: 'Open CAPA',
  segments: [
    { label: '0 – 7 days', value: 2, percent: 20, color: '#43A047' },
    { label: '8 – 30 days', value: 4, percent: 40, color: '#FFCA28' },
    { label: '31 – 60 days', value: 2, percent: 20, color: '#FB8C00' },
    { label: '> 60 days', value: 2, percent: 20, color: '#E53935' }
  ]
};

const capaBySource = {
  rows: [
    { label: 'Hazard Report', value: 9, percent: 100, color: '#1E88E5' },
    { label: 'Occurrence Report', value: 6, percent: 66, color: '#43A047' },
    { label: 'Inspection Finding', value: 4, percent: 44, color: '#FFCA28' },
    { label: 'Audit Finding', value: 3, percent: 33, color: '#8E24AA' },
    { label: 'FRAT / Risk Assessment', value: 2, percent: 22, color: '#00ACC1' },
    { label: 'Other', value: 1, percent: 11, color: '#757575' }
  ]
};

// Helpers pewarnaan & tanggal
function riskColor(level: string) {
  return { Low: 'success', Medium: 'warning', High: 'error' }[level] || 'grey';
}

function statusColor(status: string) {
  return (
    {
      Identified: 'grey',
      Assigned: 'warning',
      'In Progress': 'info',
      'Pending Verification': 'deep-purple-accent-1',
      'Effectiveness Review': 'deep-purple-accent-1',
      Closed: 'success'
    }[status] || 'grey'
  );
}

function isOverdue(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length < 3) return false;
  const day = parseInt(parts[0]);
  const month = parts[1];
  if (month === 'Aug' && day < 21) return true;
  return false;
}
</script>

<style scoped>
.kanban-container {
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: thin;
}

.kanban-container::-webkit-scrollbar {
  height: 6px;
}

.kanban-container::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}

.kanban-col {
  min-width: 250px;
  flex: 1 1 0%;
  max-width: 300px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cursor-pointer {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 4px;
}
</style>