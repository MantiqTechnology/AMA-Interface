<template>
    <VContainer fluid class="pb-6 pt-2">

        <!-- 1. HEADER HALAMAN -->
        <div class="mb-3 d-flex justify-space-between align-center flex-wrap" style="gap: 12px;">
            <div>
                <h1 class="text-h5 font-weight-bold d-flex align-center">
                    <VIcon icon="mdi-school-outline" color="primary" class="mr-2" size="28" />
                    Safety Training, Governance & Risk Register
                </h1>
                <div class="text-caption text-medium-emphasis">
                    ICAO Doc 9859 Pillar 1 (Policy) & Pillar 4 (Promotion) | CASR Part 19 & CASR Part 135 Bush
                    Operations
                </div>
            </div>
            <div class="d-flex align-center ga-2">
                <VChip color="success" size="small" variant="flat" class="font-weight-bold">
                    <VIcon icon="mdi-shield-check" start size="14" />
                    SMS Manual Rev 05.1 Approved
                </VChip>
                <VChip color="primary" size="small" variant="outlined" class="font-weight-bold">
                    BARS Gold Standard Compliant
                </VChip>
            </div>
        </div>

        <!-- 2. NAV BAR -->
        <div class="d-flex justify-space-between align-center border-b mb-4 flex-wrap" style="gap: 12px;">
            <div style="overflow-x: auto; max-width: 100%; white-space: nowrap;" class="d-flex hide-scrollbar">
                <VTabs v-model="activeTab" color="primary" style="min-width: max-content;">
                    <VTab value="overview" to="/sms/Dashboard"
                        class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-view-dashboard-variant-outline" size="18" class="mr-2" /> Overview
                    </VTab>
                    <VTab value="hazard" to="/sms/Reporting" class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-weather-windy" size="18" class="mr-2" /> Hazard
                    </VTab>
                    <VTab value="frat" to="/sms/Frat" class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-airplane-takeoff" size="18" class="mr-2" /> FRAT
                    </VTab>
                    <VTab value="capa" to="/sms/Capa" class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-clipboard-check-outline" size="18" class="mr-2" /> CAPA
                    </VTab>
                    <VTab value="emergency" to="/sms/EmergencyResponse"
                        class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency
                    </VTab>
                    <VTab value="assurance" to="/sms/SafetyAssurance"
                        class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Assurance
                    </VTab>
                    <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI
                    </VTab>
                    <VTab value="communication" to="/sms/Communication"
                        class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Comms
                    </VTab>
                    <VTab value="regulatory" to="/sms/Regulatory"
                        class="text-none font-weight-medium text-medium-emphasis">
                        <VIcon icon="mdi-gavel" size="18" class="mr-2" /> Regulatory
                    </VTab>
                    <VTab value="governance" to="/sms/SafetyTraining" class="text-none font-weight-bold">
                        <VIcon icon="mdi-school-outline" size="18" class="mr-2" /> Governance
                    </VTab>
                </VTabs>
            </div>
            <div class="d-flex align-center pb-1">
                <span class="text-caption text-medium-emphasis mr-3 font-weight-medium d-none d-sm-inline">
                    Last Sync: {{ lastUpdated }}
                </span>
                <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh"
                    :loading="isRefreshing" @click="handleRefresh" class="text-none font-weight-bold"
                    style="background-color: #F0F4FF; border-color: #D0D9F5;">
                    Refresh
                </VBtn>
            </div>
        </div>

        <!-- 3. KPI SCORECARDS -->
        <VRow class="mb-4 align-stretch">
            <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 220px;">
                <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg bg-green-lighten-5 border-success hover-card"
                    title="Overall Training Validity" value="94.2%" icon="mdi-school" color="success"
                    target="Target: >= 90.0%" />
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 220px;">
                <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card"
                    :class="groundedCount > 0 ? 'bg-red-lighten-5 border-error' : 'bg-green-lighten-5 border-success'"
                    title="Grounded / Expired Kru" :value="`${groundedCount} Kru`" icon="mdi-account-cancel-outline"
                    :color="groundedCount > 0 ? 'error' : 'success'"
                    :target="groundedCount > 0 ? 'Roster Lock Activated' : 'All Roster Cleared'" />
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 220px;">
                <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="Safety Policy Sign-off"
                    value="100%" icon="mdi-file-sign" color="primary"
                    :trend="{ icon: 'mdi-check-all', text: 'All 142 Staff Signed', tone: 'good' }" />
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 220px;">
                <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="Just Culture Reporting Rate"
                    value="84%" icon="mdi-scale-balance" color="info" target="Non-Punitive Trust Score: 9.4/10" />
            </VCol>
            <VCol cols="12" sm="6" md="4" lg="auto" class="d-flex flex-grow-1" style="min-width: 220px;">
                <SmsKpiCard class="w-100 h-100 elevation-0 border rounded-lg hover-card" title="Corporate Top Risks"
                    :value="`${corporateRisks.length} Active`" icon="mdi-alert-octagon-outline" color="warning"
                    target="3 Critical, 4 High, 3 Medium" />
            </VCol>
        </VRow>

        <!-- 4. KONTEN UTAMA: 2 KOLOM -->
        <VRow>
            <!-- KIRI: COMPETENCY MATRIX & RISK REGISTER -->
            <VCol cols="12" xl="8" lg="7" class="d-flex flex-column ga-4">

                <!-- TABLE 1: Crew & Personnel Competency Matrix -->
                <VCard border class="elevation-0 rounded-lg flex-grow-1 d-flex flex-column" style="overflow: hidden;">
                    <div class="d-flex align-center justify-space-between pa-3 border-b bg-white flex-wrap"
                        style="gap: 8px;">
                        <div>
                            <div class="text-subtitle-1 font-weight-bold d-flex align-center">
                                <VIcon icon="mdi-account-badge-outline" color="primary" class="mr-2" size="20" />
                                Aviation Personnel Safety Competency Matrix
                            </div>
                            <div class="text-caption text-medium-emphasis">
                                Matriks kualifikasi wajib kru penerbangan perintis (CASR 135/145/65). Klik personel untuk inspeksi/renew.
                            </div>
                        </div>
                        <div class="d-flex ga-2">
                            <VTextField v-model="searchPersonnel" density="compact" variant="outlined"
                                placeholder="Cari Personel..." prepend-inner-icon="mdi-magnify" hide-details
                                style="width: 180px;" />
                            <VBtn variant="outlined" density="compact" class="text-none bg-white font-weight-bold"
                                prepend-icon="mdi-export-variant" @click="exportCompetencyMatrix">
                                Export CSV
                            </VBtn>
                        </div>
                    </div>

                    <div style="overflow-x: auto; width: 100%;">
                        <VTable density="comfortable" style="min-width: 900px;" class="custom-table">
                            <thead>
                                <tr class="bg-grey-lighten-4">
                                    <th class="text-caption font-weight-bold text-uppercase">Nama & ID</th>
                                    <th class="text-caption font-weight-bold text-uppercase">Role / Base</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">SMS (Part 19)</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">CRM / HF</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">DGR (Cat 6/8/10)</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">CFIT / ALAR</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">Papua Mountain</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">Roster Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="crew in filteredCrewTrainings" :key="crew.id" class="hover-bg cursor-pointer" @click="inspectCrew(crew)">
                                    <td>
                                        <div class="text-caption font-weight-bold text-primary">{{ crew.name }}</div>
                                        <div class="text-caption text-medium-emphasis" style="font-size: 11px !important;">
                                            License: {{ crew.license }} ({{ crew.id }})
                                        </div>
                                    </td>
                                    <td>
                                        <div class="text-caption font-weight-medium">{{ crew.role }}</div>
                                        <div class="text-caption text-medium-emphasis" style="font-size: 10px !important;">
                                            Base: {{ crew.base }}
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <VTooltip location="top" :text="`Validity: ${crew.smsExp}`">
                                            <template v-slot:activator="{ props }">
                                                <VIcon v-bind="props" :icon="getCertIcon(crew.sms)" :color="getCertColor(crew.sms)" size="small" />
                                            </template>
                                        </VTooltip>
                                    </td>
                                    <td class="text-center">
                                        <VTooltip location="top" :text="`Validity: ${crew.crmExp}`">
                                            <template v-slot:activator="{ props }">
                                                <VIcon v-bind="props" :icon="getCertIcon(crew.crm)" :color="getCertColor(crew.crm)" size="small" />
                                            </template>
                                        </VTooltip>
                                    </td>
                                    <td class="text-center">
                                        <VTooltip location="top" :text="`Validity: ${crew.dgExp}`">
                                            <template v-slot:activator="{ props }">
                                                <VIcon v-bind="props" :icon="getCertIcon(crew.dg)" :color="getCertColor(crew.dg)" size="small" />
                                            </template>
                                        </VTooltip>
                                    </td>
                                    <td class="text-center">
                                        <VTooltip location="top" :text="`Validity: ${crew.cfitExp}`">
                                            <template v-slot:activator="{ props }">
                                                <VIcon v-bind="props" :icon="getCertIcon(crew.cfit)" :color="getCertColor(crew.cfit)" size="small" />
                                            </template>
                                        </VTooltip>
                                    </td>
                                    <td class="text-center">
                                        <VTooltip location="top" :text="`Check: ${crew.mountainExp}`">
                                            <template v-slot:activator="{ props }">
                                                <VIcon v-bind="props" :icon="getCertIcon(crew.mountain)" :color="getCertColor(crew.mountain)" size="small" />
                                            </template>
                                        </VTooltip>
                                    </td>
                                    <td class="text-center">
                                        <VChip :color="crew.statusColor" size="x-small" variant="flat" class="font-weight-bold px-2">
                                            {{ crew.status }}
                                        </VChip>
                                    </td>
                                </tr>
                                <tr v-if="filteredCrewTrainings.length === 0">
                                    <td colspan="8" class="text-center pa-6 text-caption text-medium-emphasis">
                                        Tidak ada data personel yang cocok dengan kata kunci pencarian.
                                    </td>
                                </tr>
                            </tbody>
                        </VTable>
                    </div>
                    <div class="pa-2 border-t text-caption text-medium-emphasis d-flex justify-center align-center ga-4 bg-grey-lighten-4 flex-wrap">
                        <span><VIcon icon="mdi-check-circle" color="success" size="14" class="mr-1" /> Valid (> 30 Hari)</span>
                        <span><VIcon icon="mdi-alert" color="warning" size="14" class="mr-1" /> Expiring Soon (&lt; 30 Hari)</span>
                        <span><VIcon icon="mdi-close-circle" color="error" size="14" class="mr-1" /> Expired / Grounded</span>
                        <span><VIcon icon="mdi-minus" color="grey" size="14" class="mr-1" /> Not Applicable (N/A)</span>
                    </div>
                </VCard>

                <!-- TABLE 2: Corporate Safety Risk Register -->
                <VCard border class="elevation-0 rounded-lg flex-grow-1 d-flex flex-column" style="overflow: hidden;">
                    <div class="d-flex align-center justify-space-between pa-3 border-b bg-white flex-wrap" style="gap: 8px;">
                        <div>
                            <div class="text-subtitle-1 font-weight-bold text-error-darken-1 d-flex align-center">
                                <VIcon icon="mdi-alert-octagon-outline" color="error" class="mr-2" size="20" />
                                Corporate Safety Risk Register (ICAO Bow-Tie Matrix)
                            </div>
                            <div class="text-caption text-medium-emphasis">
                                Daftar bahaya keselamatan tingkat korporat & mitigasi pertahanan. Klik baris untuk detail.
                            </div>
                        </div>
                        <VBtn variant="tonal" color="primary" prepend-icon="mdi-plus-circle" density="compact"
                            class="text-none font-weight-bold" @click="uiState.showNewRiskModal = true">
                            Add Risk Entry
                        </VBtn>
                    </div>

                    <div style="overflow-x: auto; width: 100%;">
                        <VTable density="comfortable" style="min-width: 950px;" class="custom-table">
                            <thead>
                                <tr class="bg-grey-lighten-4">
                                    <th class="text-caption font-weight-bold text-uppercase">Risk ID & Hazard</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">Initial Risk</th>
                                    <th class="text-caption font-weight-bold text-uppercase">Primary Mitigations (Barriers)</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">Residual Risk</th>
                                    <th class="text-caption font-weight-bold text-uppercase">Owner</th>
                                    <th class="text-caption font-weight-bold text-uppercase text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="risk in corporateRisks" :key="risk.id" class="hover-bg cursor-pointer" @click="inspectRisk(risk)">
                                    <td style="max-width: 260px;">
                                        <div class="text-caption font-weight-bold text-error">{{ risk.id }}: {{ risk.title }}</div>
                                        <div class="text-caption text-medium-emphasis line-clamp-2" :title="risk.hazard">{{ risk.hazard }}</div>
                                    </td>
                                    <td class="text-center">
                                        <VChip :color="risk.initialColor" size="x-small" variant="flat" class="font-weight-bold">
                                            {{ risk.initialScore }} ({{ risk.initialLevel }})
                                        </VChip>
                                    </td>
                                    <td style="max-width: 320px;">
                                        <div class="text-caption font-weight-medium line-clamp-2" :title="risk.mitigation">
                                            <VIcon icon="mdi-shield-lock-outline" color="primary" size="14" class="mr-1" />
                                            {{ risk.mitigation }}
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <VChip :color="risk.residualColor" size="x-small" variant="outlined" class="font-weight-bold">
                                            {{ risk.residualScore }} ({{ risk.residualLevel }})
                                        </VChip>
                                    </td>
                                    <td>
                                        <div class="text-caption font-weight-bold">{{ risk.owner }}</div>
                                        <div class="text-caption text-medium-emphasis" style="font-size: 10px !important;">
                                            Review: {{ risk.reviewFreq }}
                                        </div>
                                    </td>
                                    <td class="text-center">
                                        <VChip size="x-small" :color="risk.status === 'ACTIVE' ? 'error' : 'success'" variant="tonal" class="font-weight-bold">
                                            {{ risk.status }}
                                        </VChip>
                                    </td>
                                </tr>
                            </tbody>
                        </VTable>
                    </div>
                </VCard>

            </VCol>

            <!-- KANAN: SAFETY POLICY & JUST CULTURE -->
            <VCol cols="12" xl="4" lg="5" class="d-flex flex-column ga-4">

                <!-- CARD 1: Safety Policies & Governance Manuals -->
                <VCard border class="pa-4 elevation-0 rounded-lg">
                    <div class="d-flex justify-space-between align-center mb-3 border-b pb-2">
                        <div>
                            <div class="text-subtitle-2 font-weight-bold">Safety Policies & Governance Directives</div>
                            <div class="text-caption text-medium-emphasis">10 mandatory signed corporate policies.</div>
                        </div>
                        <VBtn size="small" variant="tonal" color="primary" class="text-none font-weight-bold"
                            prepend-icon="mdi-upload" @click="uiState.showUploadPolicyModal = true">
                            Upload
                        </VBtn>
                    </div>

                    <div style="max-height: 440px; overflow-y: auto;" class="pr-1">
                        <VList density="compact" class="pa-0">
                            <VListItem v-for="policy in safetyPolicies" :key="policy.code" class="px-0 mb-2 border-b pb-2 hover-bg rounded">
                                <template v-slot:prepend>
                                    <VIcon icon="mdi-file-certificate-outline" color="primary" class="mr-2" size="24" />
                                </template>
                                <VListItemTitle class="text-caption font-weight-bold" style="white-space: normal;">
                                    {{ policy.title }}
                                </VListItemTitle>
                                <VListItemSubtitle class="text-caption text-medium-emphasis mt-1" style="font-size: 11px !important;">
                                    Ref: <span class="font-weight-medium text-dark">{{ policy.code }}</span> (Rev {{ policy.rev }})
                                    <br>
                                    Signee: {{ policy.signee }} | Next Review: {{ policy.validUntil }}
                                </VListItemSubtitle>
                                <template v-slot:append>
                                    <VBtn icon="mdi-download-outline" variant="text" color="primary" size="small"
                                        :title="`Download ${policy.code}`" @click.stop="downloadPolicyFile(policy.code, policy.title)" />
                                </template>
                            </VListItem>
                        </VList>
                    </div>

                    <VAlert type="info" variant="tonal" class="mt-3 text-caption py-2 cursor-pointer" icon="mdi-account-check" @click="simulateReAcknowledgement">
                        Semua staf wajib melakukan <strong>electronic re-acknowledgement</strong> setiap revisi kebijakan diterbitkan. (Klik untuk simulasi blast)
                    </VAlert>
                </VCard>

                <!-- CARD 2: Just Culture Algorithm -->
                <VCard border class="pa-4 elevation-0 rounded-lg flex-grow-1 d-flex flex-column">
                    <div class="d-flex justify-space-between align-center mb-2">
                        <div class="text-subtitle-2 font-weight-bold">Just Culture Classification (YTD 2026)</div>
                        <VChip color="info" size="x-small" variant="flat" class="font-weight-bold">James Reason Framework</VChip>
                    </div>
                    <div class="text-caption text-medium-emphasis mb-3">
                        Klasifikasi tindak lanjut investigasi laporan bahaya/insiden tanpa budaya saling menyalahkan (<em>Non-Punitive</em>).
                    </div>

                    <div class="d-flex align-center justify-space-between mb-4">
                        <div class="position-relative d-flex align-center justify-center mr-4" style="width: 100px; height: 100px;">
                            <svg viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 100px; height: 100px;">
                                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#E0E0E0" stroke-width="4"></circle>
                                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#43A047" stroke-width="4" stroke-dasharray="82 100" stroke-dashoffset="0"></circle>
                                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#FB8C00" stroke-width="4" stroke-dasharray="13 100" stroke-dashoffset="-82"></circle>
                                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#E53935" stroke-width="4" stroke-dasharray="5 100" stroke-dashoffset="-95"></circle>
                            </svg>
                            <div class="position-absolute d-flex flex-column align-center text-center">
                                <span class="text-h6 font-weight-bold line-height-1">82%</span>
                                <span class="text-caption text-medium-emphasis" style="font-size: 9px !important;">No-Blame Fix</span>
                            </div>
                        </div>

                        <div class="flex-grow-1">
                            <div class="d-flex justify-space-between text-caption mb-1">
                                <div><VIcon icon="mdi-circle" color="success" size="12" class="mr-1" /> <strong>Human Error</strong> (System Fix)</div>
                                <div class="font-weight-bold">82% (41)</div>
                            </div>
                            <div class="d-flex justify-space-between text-caption mb-1">
                                <div><VIcon icon="mdi-circle" color="warning" size="12" class="mr-1" /> <strong>At-Risk</strong> (Coaching)</div>
                                <div class="font-weight-bold">13% (6)</div>
                            </div>
                            <div class="d-flex justify-space-between text-caption mb-2">
                                <div><VIcon icon="mdi-circle" color="error" size="12" class="mr-1" /> <strong>Reckless</strong> (Disciplinary)</div>
                                <div class="font-weight-bold">5% (2)</div>
                            </div>
                        </div>
                    </div>

                    <VDivider class="mb-3" />

                    <div class="text-caption font-weight-bold mb-2">Reporting Channel Distribution</div>
                    <div class="d-flex align-center justify-space-between text-caption mb-1">
                        <span>Open / Identified Reports (High Trust)</span>
                        <span class="font-weight-bold text-success">84% (42 Laporan)</span>
                    </div>
                    <VProgressLinear model-value="84" color="success" height="6" rounded class="mb-3" />

                    <div class="d-flex align-center justify-space-between text-caption mb-1">
                        <span>Confidential / Anonymous Reports</span>
                        <span class="font-weight-bold text-medium-emphasis">16% (8 Laporan)</span>
                    </div>
                    <VProgressLinear model-value="16" color="grey" height="6" rounded class="mb-4" />

                    <div class="text-caption text-medium-emphasis text-center mt-auto pb-1 font-italic bg-grey-lighten-4 pa-2 rounded border">
                        "Sesuai CASR 19.35: Tidak ada tindakan disiplin yang dijatuhkan atas kesalahan yang dilaporkan secara sukarela dan jujur."
                    </div>
                </VCard>

            </VCol>
        </VRow>

        <!-- DIALOG MODALS INTERAKTIF DEMO C-LEVEL -->

        <!-- 1. Modal Detail Personel & Quick Recertification -->
        <VDialog v-model="uiState.showCrewDetailModal" max-width="600">
            <VCard v-if="selectedCrew" class="rounded-lg">
                <VCardTitle class="bg-primary text-white font-weight-bold d-flex justify-space-between align-center pa-4">
                    <span><VIcon icon="mdi-account-card-details" class="mr-2" /> Detail Personel & Status Kualifikasi</span>
                    <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showCrewDetailModal = false" />
                </VCardTitle>
                <VCardText class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-3 bg-grey-lighten-4 pa-3 rounded border">
                        <div>
                            <div class="text-subtitle-1 font-weight-bold text-primary">{{ selectedCrew.name }}</div>
                            <div class="text-caption text-medium-emphasis">Lisensi: {{ selectedCrew.license }} | Base: {{ selectedCrew.base }}</div>
                        </div>
                        <VChip :color="selectedCrew.statusColor" size="small" variant="flat" class="font-weight-bold">
                            {{ selectedCrew.status }}
                        </VChip>
                    </div>

                    <div class="text-caption font-weight-bold mb-2 text-uppercase">Status Masa Berlaku Sertifikasi:</div>
                    <VList density="compact" class="border rounded pa-0 mb-4">
                        <VListItem class="border-b">
                            <template v-slot:prepend><VIcon :icon="getCertIcon(selectedCrew.sms)" :color="getCertColor(selectedCrew.sms)" class="mr-2" /></template>
                            <VListItemTitle class="text-caption font-weight-bold">SMS Training (Part 19)</VListItemTitle>
                            <template v-slot:append><span class="text-caption font-weight-medium">{{ selectedCrew.smsExp }}</span></template>
                        </VListItem>
                        <VListItem class="border-b">
                            <template v-slot:prepend><VIcon :icon="getCertIcon(selectedCrew.crm)" :color="getCertColor(selectedCrew.crm)" class="mr-2" /></template>
                            <VListItemTitle class="text-caption font-weight-bold">CRM / Human Factors</VListItemTitle>
                            <template v-slot:append><span class="text-caption font-weight-medium">{{ selectedCrew.crmExp }}</span></template>
                        </VListItem>
                        <VListItem class="border-b">
                            <template v-slot:prepend><VIcon :icon="getCertIcon(selectedCrew.dg)" :color="getCertColor(selectedCrew.dg)" class="mr-2" /></template>
                            <VListItemTitle class="text-caption font-weight-bold">Dangerous Goods (DGR)</VListItemTitle>
                            <template v-slot:append><span class="text-caption font-weight-medium">{{ selectedCrew.dgExp }}</span></template>
                        </VListItem>
                        <VListItem class="border-b">
                            <template v-slot:prepend><VIcon :icon="getCertIcon(selectedCrew.cfit)" :color="getCertColor(selectedCrew.cfit)" class="mr-2" /></template>
                            <VListItemTitle class="text-caption font-weight-bold">CFIT / ALAR Refresher</VListItemTitle>
                            <template v-slot:append><span class="text-caption font-weight-medium">{{ selectedCrew.cfitExp }}</span></template>
                        </VListItem>
                        <VListItem>
                            <template v-slot:prepend><VIcon :icon="getCertIcon(selectedCrew.mountain)" :color="getCertColor(selectedCrew.mountain)" class="mr-2" /></template>
                            <VListItemTitle class="text-caption font-weight-bold">Papua Mountain Rating</VListItemTitle>
                            <template v-slot:append><span class="text-caption font-weight-medium">{{ selectedCrew.mountainExp }}</span></template>
                        </VListItem>
                    </VList>

                    <VAlert v-if="selectedCrew.status !== 'Compliant'" type="warning" variant="tonal" class="text-caption py-2 mb-2" icon="mdi-shield-alert">
                        Personel ini sedang dalam pembatasan roster (*Roster Lock*) karena ada sertifikasi yang <em>expired</em> atau mendekati tenggat.
                    </VAlert>
                </VCardText>
                <VCardActions class="pa-4 bg-grey-lighten-4">
                    <VBtn v-if="selectedCrew.status !== 'Compliant'" color="success" variant="elevated" prepend-icon="mdi-check-decagram" class="text-none font-weight-bold" @click="renewCrewCertifications(selectedCrew)">
                        Perbarui Sertifikasi & Clear Roster Lock
                    </VBtn>
                    <VSpacer />
                    <VBtn color="grey-darken-2" variant="text" class="text-none font-weight-bold" @click="uiState.showCrewDetailModal = false">Tutup</VBtn>
                </VCardActions>
            </VCard>
        </VDialog>

        <!-- 2. Modal Add New Corporate Risk -->
        <VDialog v-model="uiState.showNewRiskModal" max-width="600">
            <VCard class="rounded-lg">
                <VCardTitle class="bg-error text-white font-weight-bold d-flex justify-space-between align-center pa-4">
                    <span><VIcon icon="mdi-alert-plus" class="mr-2" /> Tambah Entri Risk Register Baru</span>
                    <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showNewRiskModal = false" />
                </VCardTitle>
                <VCardText class="pa-4">
                    <VRow dense>
                        <VCol cols="12">
                            <VTextField v-model="newRiskForm.title" label="Judul Risiko *" variant="outlined" density="comfortable" placeholder="Contoh: Loss of Control Ground on Unpaved Runway" />
                        </VCol>
                        <VCol cols="12">
                            <VTextarea v-model="newRiskForm.hazard" label="Deskripsi Bahaya (Hazard) *" variant="outlined" density="comfortable" rows="2" placeholder="Uraikan kondisi bahaya sistemik..." />
                        </VCol>
                        <VCol cols="12" sm="6">
                            <VSelect v-model="newRiskForm.initialLevel" label="Tingkat Risiko Awal *" :items="['Critical', 'High', 'Medium', 'Low']" variant="outlined" density="comfortable" />
                        </VCol>
                        <VCol cols="12" sm="6">
                            <VTextField v-model="newRiskForm.owner" label="Risk Owner *" variant="outlined" density="comfortable" placeholder="Chief Pilot / QA Director" />
                        </VCol>
                        <VCol cols="12">
                            <VTextarea v-model="newRiskForm.mitigation" label="Primary Mitigations (Barriers) *" variant="outlined" density="comfortable" rows="2" placeholder="Langkah mitigasi & SOP pertahanan..." />
                        </VCol>
                    </VRow>
                </VCardText>
                <VCardActions class="pa-4 bg-grey-lighten-4">
                    <VSpacer />
                    <VBtn color="grey-darken-1" variant="text" class="text-none" @click="uiState.showNewRiskModal = false">Batal</VBtn>
                    <VBtn color="error" variant="elevated" class="text-none font-weight-bold" @click="submitNewRisk">Simpan Risiko Baru</VBtn>
                </VCardActions>
            </VCard>
        </VDialog>

        <!-- 3. Modal Inspect Risk Detail & Bow-Tie Model -->
        <VDialog v-model="uiState.showRiskDetailModal" max-width="650">
            <VCard v-if="selectedRisk" class="rounded-lg">
                <VCardTitle class="bg-error-darken-1 text-white font-weight-bold d-flex justify-space-between align-center pa-4 text-subtitle-1">
                    <span><VIcon icon="mdi-shield-alert" class="mr-2" /> Risk Profile: {{ selectedRisk.id }}</span>
                    <VBtn icon="mdi-close" variant="text" size="small" color="white" @click="uiState.showRiskDetailModal = false" />
                </VCardTitle>
                <VCardText class="pa-4">
                    <h3 class="text-h6 font-weight-bold text-error mb-1">{{ selectedRisk.title }}</h3>
                    <p class="text-body-2 text-medium-emphasis mb-3">{{ selectedRisk.hazard }}</p>

                    <VRow dense class="mb-3">
                        <VCol cols="6">
                            <div class="pa-2 border rounded bg-red-lighten-5 text-center">
                                <div class="text-caption text-medium-emphasis">Initial Risk Assessment</div>
                                <div class="text-subtitle-1 font-weight-bold text-error">{{ selectedRisk.initialScore }} ({{ selectedRisk.initialLevel }})</div>
                            </div>
                        </VCol>
                        <VCol cols="6">
                            <div class="pa-2 border rounded bg-green-lighten-5 text-center">
                                <div class="text-caption text-medium-emphasis">Residual Risk (Post-Mitigation)</div>
                                <div class="text-subtitle-1 font-weight-bold text-success">{{ selectedRisk.residualScore }} ({{ selectedRisk.residualLevel }})</div>
                            </div>
                        </VCol>
                    </VRow>

                    <div class="pa-3 border rounded bg-grey-lighten-4 mb-3">
                        <div class="text-caption font-weight-bold text-primary mb-1"><VIcon icon="mdi-shield-lock" size="16" class="mr-1" /> Mitigation Barriers (Pertahanan Sistem):</div>
                        <div class="text-caption text-medium-emphasis">{{ selectedRisk.mitigation }}</div>
                    </div>

                    <div class="d-flex justify-space-between align-center text-caption text-medium-emphasis">
                        <span>Risk Owner: <strong>{{ selectedRisk.owner }}</strong></span>
                        <span>Frekuensi Review: <strong>{{ selectedRisk.reviewFreq }}</strong></span>
                    </div>
                </VCardText>
                <VCardActions class="pa-4 bg-grey-lighten-4">
                    <VSpacer />
                    <VBtn color="grey-darken-2" variant="text" class="text-none font-weight-bold" @click="uiState.showRiskDetailModal = false">Tutup</VBtn>
                </VCardActions>
            </VCard>
        </VDialog>

        <!-- 4. Modal Upload Policy Document -->
        <VDialog v-model="uiState.showUploadPolicyModal" max-width="500">
            <VCard class="rounded-lg">
                <VCardTitle class="bg-primary text-white font-weight-bold pa-4">Upload Safety Policy Directive</VCardTitle>
                <VCardText class="pa-4">
                    <VTextField v-model="newPolicyForm.code" label="Kode Referensi *" variant="outlined" density="comfortable" class="mb-3" placeholder="POL-SMS-011" />
                    <VTextField v-model="newPolicyForm.title" label="Judul Kebijakan *" variant="outlined" density="comfortable" class="mb-3" placeholder="misal: Wildlife Hazard Governance Standard" />
                    <VTextField v-model="newPolicyForm.signee" label="Pejabat Penandatangan *" variant="outlined" density="comfortable" class="mb-3" placeholder="Accountable Executive / CEO" />
                    <VFileInput label="Pilih File Dokumen PDF Resmi" variant="outlined" density="comfortable" prepend-icon="" prepend-inner-icon="mdi-paperclip" />
                </VCardText>
                <VCardActions class="pa-4 bg-grey-lighten-4">
                    <VSpacer />
                    <VBtn color="grey-darken-1" variant="text" class="text-none" @click="uiState.showUploadPolicyModal = false">Batal</VBtn>
                    <VBtn color="primary" variant="elevated" class="text-none font-weight-bold" @click="submitNewPolicy">Upload & Blast Notification</VBtn>
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
//import { ref, reactive, computed } from 'vue'

const activeTab = ref('governance')
const lastUpdated = ref('25 Aug 2026 19:15 WIB')
const searchPersonnel = ref('')
const isRefreshing = ref(false)

const uiState = reactive({
    showCrewDetailModal: false,
    showNewRiskModal: false,
    showRiskDetailModal: false,
    showUploadPolicyModal: false,
})

const selectedCrew = ref<any>(null)
const selectedRisk = ref<any>(null)

const newRiskForm = reactive({
    title: '',
    hazard: '',
    initialLevel: 'High',
    owner: '',
    mitigation: ''
})

const newPolicyForm = reactive({
    code: '',
    title: '',
    signee: ''
})

const snackbar = reactive({ show: false, text: '', color: 'success' })

const triggerToast = (msg: string, color = 'success') => {
    snackbar.text = msg
    snackbar.color = color
    snackbar.show = true
}

// Handler Refresh Real-time Simulation
const handleRefresh = async () => {
    isRefreshing.value = true
    await new Promise(r => setTimeout(r, 600))
    lastUpdated.value = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'
    isRefreshing.value = false
    triggerToast('Data Governance, Risk Register & Kualifikasi Kru diperbarui', 'success')
}

// Interactive Crew Actions
const inspectCrew = (crew: any) => {
    selectedCrew.value = crew
    uiState.showCrewDetailModal = true
}

const renewCrewCertifications = (crew: any) => {
    crew.sms = 'valid'
    crew.smsExp = '01 Sep 2027'
    crew.crm = 'valid'
    crew.crmExp = '01 Sep 2027'
    crew.dg = 'valid'
    crew.dgExp = '01 Sep 2027'
    crew.cfit = 'valid'
    crew.cfitExp = '01 Sep 2027'
    crew.mountain = 'valid'
    crew.mountainExp = 'Annual Pass'
    crew.status = 'Compliant'
    crew.statusColor = 'success'

    uiState.showCrewDetailModal = false
    triggerToast(`Sertifikasi ${crew.name} diperbarui! Status Roster Lock dilepas.`, 'success')
}

// Interactive Risk Actions
const inspectRisk = (risk: any) => {
    selectedRisk.value = risk
    uiState.showRiskDetailModal = true
}

const submitNewRisk = () => {
    if (!newRiskForm.title || !newRiskForm.hazard) {
        triggerToast('Judul dan Deskripsi Bahaya wajib diisi!', 'warning')
        return
    }

    const nextId = `CRR-0${corporateRisks.value.length + 1}`
    const isCritical = newRiskForm.initialLevel === 'Critical'
    const isHigh = newRiskForm.initialLevel === 'High'

    corporateRisks.value.unshift({
        id: nextId,
        title: newRiskForm.title,
        hazard: newRiskForm.hazard,
        initialScore: isCritical ? '5A' : (isHigh ? '4B' : '3C'),
        initialLevel: newRiskForm.initialLevel,
        initialColor: isCritical || isHigh ? 'error' : 'warning',
        mitigation: newRiskForm.mitigation || 'Standar Operasional Prosedur SMS CASR 135.',
        residualScore: '2C',
        residualLevel: 'Low',
        residualColor: 'success',
        owner: newRiskForm.owner || 'Safety Manager',
        reviewFreq: 'Monthly',
        status: 'ACTIVE'
    })

    uiState.showNewRiskModal = false
    newRiskForm.title = ''
    newRiskForm.hazard = ''
    newRiskForm.mitigation = ''
    newRiskForm.owner = ''
    triggerToast(`Entri risiko baru ${nextId} sukses ditambahkan ke Risk Register!`, 'success')
}

// Download & Upload Policy Actions
const downloadPolicyFile = (code: string, title: string) => {
    const content = `==================================================\nOFFICIAL SAFETY POLICY DIRECTIVE\n==================================================\nPolicy Code : ${code}\nTitle       : ${title}\nApproved By : Accountable Executive / CEO\nValid Until : 31 Dec 2027\n==================================================\nCompliant with ICAO Doc 9859 Safety Management Principles.`
    
    const blob = new Blob([content], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${code}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    triggerToast(`Mengunduh dokumen kebijakan resmi: ${code}`, 'success')
}

const submitNewPolicy = () => {
    if (!newPolicyForm.title) {
        triggerToast('Judul Kebijakan wajib diisi!', 'warning')
        return
    }

    const code = newPolicyForm.code || `POL-SMS-0${safetyPolicies.value.length + 1}`
    safetyPolicies.value.unshift({
        code: code,
        title: newPolicyForm.title,
        rev: '01.0',
        signee: newPolicyForm.signee || 'Accountable Executive / CEO',
        validUntil: '31 Dec 2027'
    })

    uiState.showUploadPolicyModal = false
    newPolicyForm.code = ''
    newPolicyForm.title = ''
    newPolicyForm.signee = ''
    triggerToast(`Kebijakan ${code} berhasil diterbitkan & notifikasi blast terkirim!`, 'success')
}

const simulateReAcknowledgement = () => {
    triggerToast('Notifikasi re-acknowledgement blast terkirim ke 142 seluruh personel.', 'info')
}

// Export Matrix CSV
const exportCompetencyMatrix = () => {
    let csv = 'ID,Name,License,Role,Base,SMS,CRM,DGR,CFIT,Mountain,Status\n'
    filteredCrewTrainings.value.forEach(c => {
        csv += `"${c.id}","${c.name}","${c.license}","${c.role}","${c.base}","${c.smsExp}","${c.crmExp}","${c.dgExp}","${c.cfitExp}","${c.mountainExp}","${c.status}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Personnel_Competency_Matrix_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    triggerToast('Berhasil mengekspor Matriks Kompetensi Personel (CSV)', 'success')
}

// Personnel & Risk Mock Data
const crewTrainings = ref([
    { id: 'EMP-001', name: 'Capt. R. Budi Santoso', license: 'ATPL-6421', role: 'PIC (C208B / PC-6)', base: 'Sentani (DJJ)', sms: 'valid', smsExp: '14 May 2027', crm: 'valid', crmExp: '10 Jun 2027', dg: 'valid', dgExp: '22 Dec 2026', cfit: 'valid', cfitExp: '15 Jan 2027', mountain: 'valid', mountainExp: 'Annual Pass', status: 'Compliant', statusColor: 'success' },
    { id: 'EMP-002', name: 'Capt. Johannes Wanggai', license: 'ATPL-5892', role: 'Chief Pilot / Check Airman', base: 'Sentani (DJJ)', sms: 'valid', smsExp: '12 Jan 2027', crm: 'valid', crmExp: '04 Mar 2027', dg: 'valid', dgExp: '19 Oct 2026', cfit: 'valid', cfitExp: '08 Feb 2027', mountain: 'valid', mountainExp: 'Instructor', status: 'Compliant', statusColor: 'success' },
    { id: 'EMP-003', name: 'FO Jeremy Pattiasina', license: 'CPL-9812', role: 'Co-Pilot (C208B)', base: 'Wamena (WMX)', sms: 'valid', smsExp: '01 Nov 2026', crm: 'valid', crmExp: '15 Dec 2026', dg: 'expired', dgExp: '10 Aug 2026', cfit: 'valid', cfitExp: '20 Feb 2027', mountain: 'valid', mountainExp: 'Qualified Route', status: 'Roster Lock', statusColor: 'error' },
    { id: 'EMP-004', name: 'FO Melky Kogoya', license: 'CPL-10432', role: 'Co-Pilot (PC-6)', base: 'Nabire (NBX)', sms: 'valid', smsExp: '20 Jul 2027', crm: 'expiring', crmExp: '10 Sep 2026', dg: 'valid', dgExp: '05 Jan 2027', cfit: 'valid', cfitExp: '14 Apr 2027', mountain: 'valid', mountainExp: 'Qualified Route', status: 'Warning', statusColor: 'warning' },
    { id: 'EMP-012', name: 'Markus Irwanto', license: 'AME-3120', role: 'Base Maintenance Eng. (A&P)', base: 'Sentani Hangar', sms: 'valid', smsExp: '05 Jun 2027', crm: 'valid', crmExp: '12 May 2027', dg: 'valid', dgExp: '09 Mar 2027', cfit: 'na', cfitExp: 'N/A', mountain: 'na', mountainExp: 'N/A', status: 'Compliant', statusColor: 'success' },
    { id: 'EMP-015', name: 'Yoseph Tabuni', license: 'AME-4819', role: 'Line Maintenance Eng.', base: 'Wamena Line', sms: 'expiring', smsExp: '02 Sep 2026', crm: 'valid', crmExp: '15 Jan 2027', dg: 'valid', dgExp: '12 Dec 2026', cfit: 'na', cfitExp: 'N/A', mountain: 'na', mountainExp: 'N/A', status: 'Warning', statusColor: 'warning' },
    { id: 'EMP-024', name: 'Sarah Wonda', license: 'FOO-7712', role: 'Flight Dispatcher (FOO)', base: 'OCC Sentani', sms: 'valid', smsExp: '14 Feb 2027', crm: 'valid', crmExp: '10 Feb 2027', dg: 'valid', dgExp: '18 Nov 2026', cfit: 'valid', cfitExp: '12 Jan 2027', mountain: 'valid', mountainExp: 'Terrain Briefed', status: 'Compliant', statusColor: 'success' },
    { id: 'EMP-031', name: 'Kornelis Yigibalom', license: 'GND-0941', role: 'Station Ramp Master', base: 'Dekai (DEX)', sms: 'expired', smsExp: '15 Jul 2026', crm: 'na', crmExp: 'N/A', dg: 'expired', dgExp: '01 Aug 2026', cfit: 'na', cfitExp: 'N/A', mountain: 'na', mountainExp: 'N/A', status: 'Suspended', statusColor: 'error' },
    { id: 'EMP-045', name: 'Agus Santoro', license: 'AUD-1029', role: 'Lead Safety & Quality Auditor', base: 'HQ Sentani', sms: 'valid', smsExp: '30 Dec 2027', crm: 'valid', crmExp: '12 Nov 2027', dg: 'valid', dgExp: '15 Oct 2027', cfit: 'valid', cfitExp: '10 Oct 2027', mountain: 'valid', mountainExp: 'Evaluator', status: 'Compliant', statusColor: 'success' },
    { id: 'EMP-050', name: 'Titus Murib', license: 'AVSEC-441', role: 'Airstrip Perimeter Security', base: 'Oksibil (OKS)', sms: 'valid', smsExp: '01 Apr 2027', crm: 'na', crmExp: 'N/A', dg: 'valid', dgExp: '20 May 2027', cfit: 'na', cfitExp: 'N/A', mountain: 'na', mountainExp: 'N/A', status: 'Compliant', statusColor: 'success' },
])

const corporateRisks = ref([
    { id: 'CRR-001', title: 'CFIT in Central Highlands', hazard: 'Penerbangan VFR masuk ke kondisi cuaca instrumen (IMC) di lembah pegunungan terisolasi.', initialScore: '5A', initialLevel: 'Critical', initialColor: 'error', mitigation: 'Mandat TAWS/EGPWS Class B, batas FRAT Hard-Lock otomatis, SOP abort turn di lembah sempit.', residualScore: '3C', residualLevel: 'Medium', residualColor: 'warning', owner: 'Dir. of Operations', reviewFreq: 'Monthly', status: 'ACTIVE' },
    { id: 'CRR-002', title: 'Runway Excursion on Unpaved Strips', hazard: 'Permukaan rumput/tanah basah dan berlumpur di pedalaman (cth. Borme, Bokondini) mengakibatkan tergelincir.', initialScore: '4B', initialLevel: 'High', initialColor: 'error', mitigation: 'Laporan visual kondisi airstrip oleh Agen Stasiun sebelum take-off, batasan MTOW dinamis 85%.', residualScore: '2D', residualLevel: 'Low', residualColor: 'success', owner: 'Chief Pilot', reviewFreq: 'Quarterly', status: 'ACTIVE' },
    { id: 'CRR-003', title: 'Avtur Contamination from Drum Supply', hazard: 'Kondensasi air atau sedimen pada drum bahan bakar 200L di remote station Sentani - Pedalaman.', initialScore: '5B', initialLevel: 'Critical', initialColor: 'error', mitigation: 'Wajib uji Shell Water Detector (SWD) + Millipore test sebelum penuangan, standpipe filter mikro.', residualScore: '2C', residualLevel: 'Low', residualColor: 'success', owner: 'Quality Assurance', reviewFreq: 'Monthly', status: 'ACTIVE' },
    { id: 'CRR-004', title: 'Airstrip Perimeter Security Breach', hazard: 'Konflik horizontal atau warga/hewan melintas di landasan tanpa pagar pengaman saat landing roll.', initialScore: '4B', initialLevel: 'High', initialColor: 'error', mitigation: 'Prosedur Low-pass runway check sebelum final approach, koordinasi radio VHF dengan kepala suku/aparat.', residualScore: '3D', residualLevel: 'Medium', residualColor: 'warning', owner: 'Security Manager', reviewFreq: 'Monthly', status: 'ACTIVE' },
    { id: 'CRR-005', title: 'Crew Fatigue in Multi-Sector High Terrain', hazard: 'Pilot terbang 6-8 sektor harian di bawah tekanan cuaca pegunungan yang berubah cepat.', initialScore: '4B', initialLevel: 'High', initialColor: 'error', mitigation: 'Penerapan Fatigue Risk Management System (FRMS), batas maksimal 6 sektor/hari di area pegunungan.', residualScore: '2C', residualLevel: 'Low', residualColor: 'success', owner: 'Chief Pilot', reviewFreq: 'Quarterly', status: 'ACTIVE' },
    { id: 'CRR-006', title: 'Engine Failure in Single Engine Over Hostile Terrain', hazard: 'Hilangnya daya mesin PT6A-114A pada C208B di atas hutan lebat tanpa alternatif pendaratan darurat.', initialScore: '5A', initialLevel: 'Critical', initialColor: 'error', mitigation: 'Oil analysis berkala (SOAP), borescope inspection rutin, chip detector auto-alert, pelampung/survival kit darurat.', residualScore: '3C', residualLevel: 'Medium', residualColor: 'warning', owner: 'VP Maintenance', reviewFreq: 'Monthly', status: 'ACTIVE' },
    { id: 'CRR-007', title: 'HF/VHF Communication Blackout', hazard: 'Hilangnya sinyal radio di daerah bayangan buatan lembah pegunungan (blind spot Wamena-Oksibil).', initialScore: '3B', initialLevel: 'Medium', initialColor: 'warning', mitigation: 'Pemasangan Flight Following satelit Iridium real-time (Spidertracks), jadwal position report wajib tiap 15 menit.', residualScore: '1D', residualLevel: 'Low', residualColor: 'success', owner: 'OCC Manager', reviewFreq: 'Quarterly', status: 'MITIGATED' },
    { id: 'CRR-008', title: 'Line Maintenance Error in Remote Outstations', hazard: 'Perbaikan darurat tanpa tooling terkalibrasi atau manual teknis di stasiun pedalaman.', initialScore: '4C', initialLevel: 'High', initialColor: 'error', mitigation: 'Penerapan AME fly-away kit, video call inspeksi rilis dengan Base Engineer Sentani sebelum RII.', residualScore: '2D', residualLevel: 'Low', residualColor: 'success', owner: 'Chief Inspector', reviewFreq: 'Quarterly', status: 'ACTIVE' },
    { id: 'CRR-009', title: 'Undeclared Dangerous Goods by Passengers', hazard: 'Minyak tanah, baterai lithium curah, atau kembang api dibawa masuk ke kabin/kargo tanpa deklarasi.', initialScore: '4B', initialLevel: 'High', initialColor: 'error', mitigation: 'Pemeriksaan fisik 100% di meja penimbangan stasiun perintis, spanduk sosialisasi bahasa lokal.', residualScore: '2C', residualLevel: 'Low', residualColor: 'success', owner: 'Ground Ops Mgr', reviewFreq: 'Bi-Monthly', status: 'ACTIVE' },
    { id: 'CRR-010', title: 'Sudden Windshear & Microburst in High Altitude Basin', hazard: 'Perubahan mendadak kecepatan dan arah angin di lembah sempit saat konfigurasi pendaratan pendek.', initialScore: '4B', initialLevel: 'High', initialColor: 'error', mitigation: 'Stasiun cuaca otomatis AWOS mini di stasiun utama, SOP Go-Around instan di bawah 300ft AGL.', residualScore: '2D', residualLevel: 'Low', residualColor: 'success', owner: 'Safety Manager', reviewFreq: 'Monthly', status: 'ACTIVE' },
])

const safetyPolicies = ref([
    { code: 'POL-SMS-001', title: 'Corporate Safety & Quality Policy Statement', rev: '05.0', signee: 'Accountable Executive / CEO', validUntil: '31 Dec 2027' },
    { code: 'POL-SMS-002', title: 'Just Culture & Non-Punitive Hazard Reporting Policy', rev: '04.2', signee: 'CEO & Safety Manager', validUntil: '31 Dec 2027' },
    { code: 'POL-SMS-003', title: 'Fatigue Risk Management System (FRMS) Policy', rev: '03.1', signee: 'Director of Operations', validUntil: '01 Jun 2027' },
    { code: 'POL-SMS-004', title: 'Drug and Alcohol Management Plan (DAMP) Policy', rev: '02.0', signee: 'HR & Medical Advisor', validUntil: '15 Aug 2027' },
    { code: 'POL-SMS-005', title: 'Emergency Response Plan (ERP) Corporate Directive', rev: '06.0', signee: 'Accountable Executive / CEO', validUntil: '31 Dec 2026' },
    { code: 'POL-SMS-006', title: 'Captain’s Final Authority & Safety Stop-Work Policy', rev: '03.0', signee: 'Chief Pilot & Safety Mgr', validUntil: '01 Jan 2028' },
    { code: 'POL-SMS-007', title: 'Management of Change (MoC) Governance Procedure', rev: '02.1', signee: 'Quality Assurance VP', validUntil: '10 Oct 2027' },
    { code: 'POL-SMS-008', title: 'Third-Party Fuel & Ground Handler Safety Oversight', rev: '01.4', signee: 'Procurement & Safety Mgr', validUntil: '22 Nov 2026' },
    { code: 'POL-SMS-009', title: 'Mandatory Occurrence Reporting (MOR) Compliance Policy', rev: '04.0', signee: 'Regulatory Affairs Mgr', validUntil: '04 Jun 2027' },
    { code: 'POL-SMS-010', title: 'Security & Perimeter Defense in Hostile Remote Stations', rev: '02.2', signee: 'Corporate Security Director', validUntil: '30 Sep 2027' },
])

const filteredCrewTrainings = computed(() => {
    if (!searchPersonnel.value) return crewTrainings.value
    const q = searchPersonnel.value.toLowerCase()
    return crewTrainings.value.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.role.toLowerCase().includes(q) || 
        c.base.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q)
    )
})

const groundedCount = computed(() => crewTrainings.value.filter(c => c.status === 'Roster Lock' || c.status === 'Suspended').length)

function getCertIcon(status: string) {
    return { 'valid': 'mdi-check-circle', 'expiring': 'mdi-alert', 'expired': 'mdi-close-circle', 'na': 'mdi-minus' }[status] || 'mdi-help'
}
function getCertColor(status: string) {
    return { 'valid': 'success', 'expiring': 'warning', 'expired': 'error', 'na': 'grey-lighten-1' }[status] || 'grey'
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.hover-bg { transition: background-color 0.15s ease; }
.hover-bg:hover { background-color: rgba(var(--v-theme-on-surface), 0.04) !important; }

.hover-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
.hover-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }

.cursor-pointer { cursor: pointer; }

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background-color: #E0E0E0; border-radius: 4px; }
</style>