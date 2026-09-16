<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Safety Communication</h1>
      <div class="text-caption text-medium-emphasis">Safety Promotion, Meetings, and Awareness</div>
    </div>

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
      <VTab value="emergency" to="/sms/EmergencyResponse" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-fire-alert" size="18" class="mr-2" /> Emergency & Response
      </VTab>
      <VTab value="assurance" to="/sms/SafetyAssurance" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-shield-check-outline" size="18" class="mr-2" /> Safety Assurance
      </VTab>
      <VTab value="spi" to="/sms/SpiAnalytics" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-chart-line" size="18" class="mr-2" /> SPI & Analytics
      </VTab>
      <VTab value="communication" to="/sms/Communication" class="text-none font-weight-bold">
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
      <VTab value="regulatory" to="/sms/Regulatory" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-gavel" size="18" class="mr-2" /> Regulatory
      </VTab>
      <VTab value="governance" to="/sms/SafetyTraining" class="text-none font-weight-medium text-medium-emphasis">
        <VIcon icon="mdi-school-outline" size="18" class="mr-2" /> Governance
      </VTab>
    </VTabs>

    <!-- Filter Toolbar -->
    <VCard border class="pa-3 mb-4 mt-3">
      <div class="d-flex align-center flex-wrap ga-3">
        <VTextField
          v-model="search"
          placeholder="Search bulletins, flashes, or meetings..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 320px"
        />
        <VSelect
          v-model="category"
          label="Category"
          :items="['All', 'Safety Flash', 'Safety Bulletin', 'Lessons Learned']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 180px"
        />
        <VSelect
          v-model="readStatus"
          label="Status"
          :items="['All', 'Unread', 'Read']"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <VSpacer />
        <span class="text-caption text-medium-emphasis">Last updated: {{ lastUpdated }}</span>
        <VBtn variant="outlined" color="primary" density="compact" prepend-icon="mdi-refresh" class="text-none" @click="handleRefresh" :loading="isRefreshing">
          Refresh
        </VBtn>
        <VBtn color="primary" density="compact" prepend-icon="mdi-pencil-plus-outline" class="text-none ml-2" @click="uiState.showNewPub = true">
          New Publication
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- Safety Training Tracking Alerts -->
      <VCol cols="12">
        <VCard border class="pa-4 border-warning bg-orange-lighten-5">
          <div class="d-flex align-center mb-3">
            <VIcon icon="mdi-school-alert-outline" color="warning" class="mr-3" size="x-large" />
            <div>
              <div class="text-subtitle-1 font-weight-bold text-warning-darken-2">Training & Certification Compliance Alert</div>
              <div class="text-body-2 text-medium-emphasis">
                Terdapat <strong>{{ trainingAlerts.length }} Personel</strong> yang lisensi atau sertifikasi keselamatannya akan kedaluwarsa dalam 30 hari ke depan.
              </div>
            </div>
            <VSpacer />
            <VBtn color="warning" variant="elevated" class="text-none font-weight-bold" prepend-icon="mdi-account-search" @click="uiState.showHris = true">
              Review HRIS Log
            </VBtn>
          </div>
          
          <VRow v-if="trainingAlerts.length > 0" dense>
            <VCol v-for="alert in trainingAlerts" :key="alert.id" cols="12" sm="6" md="3">
              <VCard border elevation="0" class="pa-3 bg-white h-100 d-flex flex-column hover-card">
                <div class="d-flex justify-space-between align-start mb-1">
                  <span class="font-weight-bold text-body-2">{{ alert.name }}</span>
                  <VChip size="x-small" :color="alert.daysLeft <= 7 ? 'error' : 'warning'" class="font-weight-bold">
                    {{ alert.daysLeft }} days left
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis">{{ alert.role }} | {{ alert.station }}</div>
                <VDivider class="my-2" />
                <div class="text-caption font-weight-medium text-primary">{{ alert.course }}</div>
                <div class="text-caption text-medium-emphasis mt-auto pt-1">Expiry: <strong>{{ alert.expiry }}</strong></div>
              </VCard>
            </VCol>
          </VRow>
          <div v-else class="text-center py-2 text-success font-weight-bold text-caption">
            <VIcon icon="mdi-check-circle-outline" class="mr-1" /> Semua sertifikasi personel saat ini dalam kondisi patuh (Compliant).
          </div>
        </VCard>
      </VCol>

      <!-- Safety Communication & Awareness (Kiri) -->
      <VCol cols="12" md="7">
        <VCard border class="pa-4 h-100">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Safety Bulletins, Flash & Lessons Learned</div>
              <div class="text-caption text-medium-emphasis">Wajib dibaca oleh seluruh kru operasional</div>
            </div>
            <VBtn size="small" variant="text" color="primary" class="text-none" @click="markAllAsRead">Mark All as Read</VBtn>
          </div>
          
          <VList lines="three" class="bg-transparent pa-0">
            <template v-for="(item, index) in filteredBulletins" :key="item.id">
              <VListItem class="px-2 py-3 rounded hover-bg" :class="item.isUnread ? 'bg-blue-lighten-5' : ''">
                <template v-slot:prepend>
                  <VBadge :model-value="item.isUnread" color="error" dot floating offset-x="2" offset-y="2">
                    <VAvatar :color="item.color" variant="tonal" class="mr-3" rounded size="48">
                      <VIcon :icon="item.icon" size="24" />
                    </VAvatar>
                  </VBadge>
                </template>
                
                <VListItemTitle class="font-weight-bold text-subtitle-2 mb-1">
                  {{ item.title }}
                </VListItemTitle>
                <VListItemSubtitle class="text-caption text-medium-emphasis mb-2" style="white-space: normal; line-height: 1.4;">
                  {{ item.subtitle }}
                </VListItemSubtitle>
                
                <div class="d-flex align-center text-caption">
                  <VIcon icon="mdi-calendar-clock" size="14" class="mr-1 text-medium-emphasis" />
                  <span class="text-medium-emphasis mr-3">{{ item.date }}</span>
                  <VIcon icon="mdi-account-edit" size="14" class="mr-1 text-medium-emphasis" />
                  <span class="text-medium-emphasis">{{ item.author }}</span>
                </div>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end justify-space-between h-100">
                    <VChip size="x-small" :color="item.tagColor" variant="flat" class="font-weight-bold mb-2">
                      {{ item.tag }}
                    </VChip>
                    <VBtn size="small" :color="item.isUnread ? 'primary' : 'grey-darken-1'" :variant="item.isUnread ? 'flat' : 'outlined'" class="text-none px-2" height="24" @click="openDocument(item)">
                      {{ item.isUnread ? 'Read' : 'View' }}
                    </VBtn>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="index !== filteredBulletins.length - 1" class="my-1" />
            </template>
            <div v-if="filteredBulletins.length === 0" class="text-center pa-4 text-medium-emphasis text-caption">
              Tidak ada dokumen publikasi yang sesuai dengan kriteria pencarian.
            </div>
          </VList>
        </VCard>
      </VCol>

      <!-- Kolom Kanan: Rapat & Kampanye -->
      <VCol cols="12" md="5" class="d-flex flex-column ga-4">
        
        <!-- Safety Meeting Tracking -->
        <VCard border class="pa-4 flex-grow-1">
          <div class="d-flex justify-space-between align-center mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Safety Review Board (SRB) & SAG</div>
              <div class="text-caption text-medium-emphasis">Minutes of Meeting & Action Items</div>
            </div>
            <VBtn size="small" color="primary" prepend-icon="mdi-plus" variant="tonal" class="text-none" @click="uiState.showNewMinutes = true">New Minutes</VBtn>
          </div>
          
          <VTable density="compact" class="bg-transparent">
            <thead>
              <tr>
                <th class="text-caption font-weight-bold text-uppercase px-2">Date / Type</th>
                <th class="text-caption font-weight-bold text-uppercase px-2">Key Topics</th>
                <th class="text-caption font-weight-bold text-uppercase px-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meeting in meetings" :key="meeting.id" class="hover-bg">
                <td class="px-2 py-2">
                  <div class="text-caption font-weight-bold">{{ meeting.date }}</div>
                  <div class="text-caption text-primary">{{ meeting.type }}</div>
                </td>
                <td class="px-2 py-2" style="max-width: 150px;">
                  <div class="text-caption text-truncate" :title="meeting.topics">{{ meeting.topics }}</div>
                </td>
                <td class="px-2 py-2 text-center">
                  <VChip size="x-small" :color="meeting.pendingColor" variant="tonal" class="font-weight-bold mb-1">
                    {{ meeting.pending }}
                  </VChip>
                  <div>
                    <VBtn 
                      :icon="isDownloading[meeting.id] ? 'mdi-loading' : 'mdi-download-outline'" 
                      :class="{'mdi-spin': isDownloading[meeting.id]}"
                      variant="text" 
                      color="grey-darken-1" 
                      size="x-small" 
                      density="comfortable" 
                      @click="handleDownload(meeting)" 
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
          <div class="text-center mt-2">
            <a href="#" class="text-caption font-weight-bold text-primary text-decoration-none" @click.prevent="uiState.showArchive = true">View Meeting Archive</a>
          </div>
        </VCard>

        <!-- Active Safety Campaigns -->
        <VCard border class="pa-4">
          <div class="d-flex justify-space-between align-center mb-4">
            <div class="text-subtitle-1 font-weight-bold">Active Safety Campaigns</div>
            <VIcon icon="mdi-flag-triangle" color="success" />
          </div>
          
          <div v-for="(campaign, i) in campaigns" :key="campaign.id" class="mb-4 last-mb-0 cursor-pointer hover-bg pa-2 rounded" @click="openCampaign(campaign)">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-body-2 font-weight-bold">{{ campaign.title }}</span>
              <span class="text-caption font-weight-bold" :class="campaign.progress === 100 ? 'text-success' : 'text-primary'">
                {{ campaign.progress }}%
              </span>
            </div>
            <VProgressLinear :model-value="campaign.progress" :color="campaign.progress === 100 ? 'success' : 'primary'" height="6" rounded class="mb-1" />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis">
              <span>Target: {{ campaign.target }}</span>
              <span>Deadline: {{ campaign.deadline }}</span>
            </div>
            <VDivider v-if="i !== campaigns.length - 1" class="mt-3" />
          </div>
        </VCard>

      </VCol>
    </VRow>

    <!-- Dialogs -->
    
    <!-- 1. HRIS Log Dialog -->
    <VDialog v-model="uiState.showHris" max-width="700">
      <VCard>
        <VCardTitle class="bg-warning text-white d-flex justify-space-between align-center">
          HRIS Certification Alert Log
          <VBtn icon="mdi-close" variant="text" size="small" @click="uiState.showHris = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <p class="text-body-2 mb-4">Daftar personel dengan sertifikasi mendekati masa kedaluwarsa. Anda dapat memperbarui lisensi langsung dari simulasi ini.</p>
          <VTable density="compact" border v-if="trainingAlerts.length > 0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role / Station</th>
                <th>Course</th>
                <th>Expiry</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alert in trainingAlerts" :key="alert.id">
                <td>{{ alert.name }}</td>
                <td>{{ alert.role }} ({{ alert.station }})</td>
                <td>{{ alert.course }}</td>
                <td class="text-error font-weight-bold">{{ alert.expiry }}</td>
                <td class="text-center">
                  <VBtn size="x-small" color="success" variant="tonal" class="text-none" @click="renewAlert(alert.id)">
                    Renew
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
          <div v-else class="text-center pa-4 text-medium-emphasis text-caption">
            Semua sertifikasi telah selesai diperbarui.
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 2. Document Reader Dialog -->
    <VDialog v-model="uiState.showDoc" max-width="600">
      <VCard v-if="selectedDoc">
        <VCardTitle class="d-flex justify-space-between align-center text-subtitle-1 font-weight-bold">
          {{ selectedDoc.title }}
          <VBtn icon="mdi-close" variant="text" size="small" @click="uiState.showDoc = false" />
        </VCardTitle>
        <VCardText class="pa-4 pt-0">
          <div class="d-flex align-center text-caption text-medium-emphasis mb-4 bg-grey-lighten-4 pa-2 rounded">
            <VIcon icon="mdi-account" size="16" class="mr-1" /> {{ selectedDoc.author }}
            <span class="mx-2">|</span>
            <VIcon icon="mdi-calendar" size="16" class="mr-1" /> {{ selectedDoc.date }}
          </div>
          <p class="text-body-1">{{ selectedDoc.subtitle }}</p>
          <div class="mt-4 bg-blue-lighten-5 pa-3 rounded border text-caption">
            <strong>System Record:</strong> Anda telah membaca dan mengonfirmasi dokumen ini pada {{ new Date().toLocaleDateString() }}. Log ini akan tercatat dalam sistem audit SMS.
          </div>
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VSpacer />
          <VBtn color="primary" variant="elevated" @click="uiState.showDoc = false">Acknowledge & Close</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 3. New Publication Dialog -->
    <VDialog v-model="uiState.showNewPub" max-width="500">
      <VCard>
        <VCardTitle class="font-weight-bold">Create New Publication</VCardTitle>
        <VCardText class="mt-2">
          <VTextField v-model="newPubForm.title" label="Document Title" variant="outlined" density="comfortable" class="mb-3" />
          <VSelect v-model="newPubForm.category" label="Category" :items="['Safety Flash', 'Safety Bulletin', 'Lessons Learned']" variant="outlined" density="comfortable" class="mb-3" />
          <VSelect v-model="newPubForm.audience" label="Target Audience" :items="['All Staff', 'Flight Crew', 'Ground Ops', 'MRO']" variant="outlined" density="comfortable" class="mb-3" multiple />
          <VTextarea v-model="newPubForm.content" label="Content Description" variant="outlined" rows="3" />
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VSpacer />
          <VBtn color="error" variant="text" @click="uiState.showNewPub = false">Cancel</VBtn>
          <VBtn color="primary" variant="elevated" @click="submitNewPublication">Save & Publish</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 4. New Meeting Minutes Dialog -->
    <VDialog v-model="uiState.showNewMinutes" max-width="600">
      <VCard>
        <VCardTitle class="font-weight-bold">Input Meeting Minutes</VCardTitle>
        <VCardText class="mt-2">
          <VRow dense>
            <VCol cols="12" sm="6">
              <VSelect v-model="newMinutesForm.type" label="Meeting Type" :items="['SAG - MRO', 'SAG - Flight Ops', 'SAG - Ground Ops', 'SRB - Executive']" variant="outlined" density="comfortable" />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField v-model="newMinutesForm.date" label="Meeting Date" type="date" variant="outlined" density="comfortable" />
            </VCol>
            <VCol cols="12">
              <VTextField v-model="newMinutesForm.topics" label="Key Topics Discussed" variant="outlined" density="comfortable" />
            </VCol>
            <VCol cols="12">
              <VFileInput v-model="newMinutesForm.file" label="Upload MoM Document (PDF/Word)" variant="outlined" density="comfortable" prepend-icon="" prepend-inner-icon="mdi-paperclip" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VSpacer />
          <VBtn color="error" variant="text" @click="uiState.showNewMinutes = false">Cancel</VBtn>
          <VBtn color="primary" variant="elevated" @click="submitNewMinutes">Submit Minutes</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 5. Meeting Archive Dialog -->
    <VDialog v-model="uiState.showArchive" max-width="700">
      <VCard>
        <VCardTitle class="bg-primary text-white d-flex justify-space-between align-center">
          Meeting Archive (2025 - 2026)
          <VBtn icon="mdi-close" variant="text" size="small" @click="uiState.showArchive = false" />
        </VCardTitle>
        <VCardText class="pa-4">
          <VTextField prepend-inner-icon="mdi-magnify" placeholder="Search archive by keyword or date..." variant="outlined" density="compact" class="mb-4" hide-details />
          <div class="text-caption text-medium-emphasis mb-2">Menampilkan arsip historis. Data lengkap tersedia di database.</div>
          <VTable density="compact" border>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Topics</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>28 Jun 2026</td><td>SRB - Executive</td><td>Mid-Year Audit Results</td><td><VChip size="x-small" color="success">Closed</VChip></td></tr>
              <tr><td>10 Jun 2026</td><td>SAG - Flight Ops</td><td>SOP Amendment Review</td><td><VChip size="x-small" color="success">Closed</VChip></td></tr>
              <tr><td>22 May 2026</td><td>SAG - MRO</td><td>Supply Chain Risk Assessment</td><td><VChip size="x-small" color="warning">1 CAPA Open</VChip></td></tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 6. Campaign Details Dialog -->
    <VDialog v-model="uiState.showCampaign" max-width="500">
      <VCard v-if="selectedCampaign">
        <VCardTitle class="font-weight-bold">{{ selectedCampaign.title }}</VCardTitle>
        <VCardText>
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2">Current Progress</span>
            <span class="font-weight-bold text-primary">{{ selectedCampaign.progress }}%</span>
          </div>
          <VProgressLinear :model-value="selectedCampaign.progress" color="primary" height="8" rounded class="mb-4" />
          <VList density="compact" class="bg-grey-lighten-4 rounded mb-2">
            <VListItem><span class="font-weight-bold text-caption">Target Audience:</span> <span class="text-caption">{{ selectedCampaign.target }}</span></VListItem>
            <VListItem><span class="font-weight-bold text-caption">Deadline:</span> <span class="text-caption">{{ selectedCampaign.deadline }}</span></VListItem>
            <VListItem><span class="font-weight-bold text-caption">Status:</span> <span class="text-caption">{{ selectedCampaign.progress === 100 ? 'Completed' : 'On-Going' }}</span></VListItem>
          </VList>
        </VCardText>
        <VCardActions class="pa-4 flex-column ga-2">
          <div class="d-flex ga-2 w-100">
            <VBtn color="primary" variant="tonal" class="flex-grow-1 text-none" @click="updateCampaignProgress(selectedCampaign, 10)">
              +10% Progress
            </VBtn>
            <VBtn color="success" variant="elevated" class="flex-grow-1 text-none" @click="updateCampaignProgress(selectedCampaign, 100 - selectedCampaign.progress)">
              Set 100%
            </VBtn>
          </div>
          <VBtn color="grey-darken-1" block variant="outlined" class="text-none" @click="uiState.showCampaign = false">Close Viewer</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Global Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom right">
      {{ snackbar.text }}
    </VSnackbar>
  </VContainer>
</template>

<script setup lang="ts">
//import { ref, reactive, computed } from 'vue'

const activeTab = ref('communication')
const lastUpdated = ref('22 Sep 2026 07:05 WIB')
const search = ref('')
const category = ref('All')
const readStatus = ref('All')
const isRefreshing = ref(false)

const isDownloading = ref<Record<number, boolean>>({})

const uiState = reactive({
  showHris: false,
  showDoc: false,
  showNewPub: false,
  showNewMinutes: false,
  showArchive: false,
  showCampaign: false
})

// Form Binding Objects
const newPubForm = reactive({
  title: '',
  category: 'Safety Bulletin',
  audience: ['All Staff'],
  content: ''
})

const newMinutesForm = reactive({
  type: 'SAG - MRO',
  date: '',
  topics: '',
  file: null
})

const selectedDoc = ref<any>(null)
const selectedCampaign = ref<any>(null)
const snackbar = reactive({ show: false, text: '', color: 'info' })

const triggerToast = (msg: string, color = 'info') => {
  snackbar.text = msg
  snackbar.color = color
  snackbar.show = true
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await new Promise(resolve => setTimeout(resolve, 800)) 
  const now = new Date()
  lastUpdated.value = `${now.getDate()} Sep 2026 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`
  isRefreshing.value = false
  triggerToast('Dashboard data successfully refreshed.', 'success')
}

const markAllAsRead = () => {
  bulletins.value.forEach(item => item.isUnread = false)
  triggerToast('All publications marked as read.', 'primary')
}

const openDocument = (item: any) => {
  item.isUnread = false 
  selectedDoc.value = item
  uiState.showDoc = true
}

const openCampaign = (item: any) => {
  selectedCampaign.value = item
  uiState.showCampaign = true
}

// Simulasi submit publikasi baru
const submitNewPublication = () => {
  if (!newPubForm.title) {
    triggerToast('Judul dokumen publikasi wajib diisi!', 'warning')
    return
  }

  const iconMap: Record<string, string> = {
    'Safety Flash': 'mdi-flash',
    'Lessons Learned': 'mdi-book-open-page-variant',
    'Safety Bulletin': 'mdi-information-outline'
  }

  const colorMap: Record<string, string> = {
    'Safety Flash': 'warning',
    'Lessons Learned': 'info',
    'Safety Bulletin': 'success'
  }

  bulletins.value.unshift({
    id: Date.now(),
    type: newPubForm.category,
    title: newPubForm.title,
    subtitle: newPubForm.content || 'Dokumen publikasi baru ditambahkan dari simulasi.',
    author: 'Safety Dept (Live Demo)',
    date: 'Hari ini',
    icon: iconMap[newPubForm.category] || 'mdi-information-outline',
    color: colorMap[newPubForm.category] || 'primary',
    tag: 'NEW',
    tagColor: 'primary',
    isUnread: true
  })

  uiState.showNewPub = false
  newPubForm.title = ''
  newPubForm.content = ''
  triggerToast('Publikasi baru berhasil diterbitkan!', 'success')
}

// Simulasi submit notulen rapat baru
const submitNewMinutes = () => {
  if (!newMinutesForm.topics) {
    triggerToast('Topik utama rapat wajib diisi!', 'warning')
    return
  }

  const formattedDate = newMinutesForm.date ? newMinutesForm.date : 'Hari ini'

  meetings.value.unshift({
    id: Date.now(),
    date: formattedDate,
    type: newMinutesForm.type,
    topics: newMinutesForm.topics,
    pending: '1 Open CAPA',
    pendingColor: 'warning'
  })

  uiState.showNewMinutes = false
  newMinutesForm.topics = ''
  newMinutesForm.date = ''
  triggerToast('Notulen rapat berhasil dicatat ke tabel!', 'success')
}

// Simulasi renew lisensi di HRIS log
const renewAlert = (alertId: number) => {
  const index = trainingAlerts.value.findIndex(a => a.id === alertId)
  if (index !== -1) {
    trainingAlerts.value.splice(index, 1)
    triggerToast('Sertifikasi berhasil diperbarui & log diperbarui.', 'success')
  }
}

// Simulasi update kampanye keselamatan
const updateCampaignProgress = (campaign: any, delta: number) => {
  campaign.progress = Math.min(100, Math.max(0, campaign.progress + delta))
  if (campaign.progress === 100) {
    campaign.deadline = 'Completed'
    triggerToast(`Kampanye "${campaign.title}" telah selesai 100%!`, 'success')
  } else {
    triggerToast(`Progress kampanye diperbarui ke ${campaign.progress}%.`, 'info')
  }
}

// Fungsi Download Nyata via Blob Object
const handleDownload = async (meeting: any) => {
  isDownloading.value[meeting.id] = true
  
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const fileContent = `=== SAFETY MEETING MINUTES ===\n\nMeeting Type : ${meeting.type}\nDate         : ${meeting.date}\n\nTopics Discussed:\n- ${meeting.topics}\n\nPending Actions:\n- ${meeting.pending}\n\n============================\nGenerated by SMS Portal Showcase`
  
  const blob = new Blob([fileContent], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  const fileName = `MoM_${meeting.type.replace(/\s+/g, '_')}_${meeting.date.replace(/\s+/g, '')}.txt`
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  isDownloading.value[meeting.id] = false
  triggerToast(`File ${fileName} successfully downloaded.`, 'success')
}

const trainingAlerts = ref([
  { id: 1, name: 'Capt. Anton Wibowo', role: 'Pilot in Command', station: 'Sentani (DJJ)', course: 'Human Factors & SMS Training', expiry: '28 Sep 2026', daysLeft: 6 },
  { id: 2, name: 'Budi Santoso', role: 'MRO Technician', station: 'Wamena (WMX)', course: 'Dangerous Goods (DG) Awareness', expiry: '02 Oct 2026', daysLeft: 11 },
  { id: 3, name: 'Siti Aminah', role: 'FOO / Dispatcher', station: 'Timika (TIM)', course: 'Crew Resource Management (CRM)', expiry: '05 Oct 2026', daysLeft: 14 },
  { id: 4, name: 'Paijo', role: 'Ground Handling', station: 'Dekai (DKI)', course: 'Apron Safety & Security', expiry: '12 Oct 2026', daysLeft: 21 }
])

const bulletins = ref([
  { id: 1, type: 'Safety Flash', title: 'Safety Flash 04/2026: Cuaca Ekstrem Dekai', subtitle: 'Peringatan downdraft parah dan windshear di area approach WMX. Membutuhkan kewaspadaan ekstra saat final approach.', author: 'Chief Pilot', date: '21 Sep 2026', icon: 'mdi-flash', color: 'warning', tag: 'URGENT', tagColor: 'error', isUnread: true },
  { id: 2, type: 'Lessons Learned', title: 'Lessons Learned: Bird Strike Mitigation', subtitle: 'Evaluasi insiden bird strike di Sentani (DJJ) pada penerbangan pagi hari. Penyesuaian prosedur takeoff saat musim migrasi burung.', author: 'Safety Manager', date: '18 Sep 2026', icon: 'mdi-book-open-page-variant', color: 'info', tag: 'MUST READ', tagColor: 'primary', isUnread: true },
  { id: 3, type: 'Safety Bulletin', title: 'Safety Bulletin 08/2026: Komunikasi Radio', subtitle: 'Pembaruan prosedur komunikasi radio di area uncontrolled airspace pedalaman Papua sesuai arahan Airnav terbaru.', author: 'Safety Dept', date: '10 Sep 2026', icon: 'mdi-information-outline', color: 'success', tag: 'NEW', tagColor: 'success', isUnread: false },
  { id: 4, type: 'Safety Flash', title: 'Safety Flash 03/2026: Contaminated Fuel Warning', subtitle: 'Laporan indikasi kontaminasi air pada avtur dari drum suplai vendor lokal di airstrip perintis. Wajib SWD test sebelum fueling.', author: 'Quality Assurance', date: '05 Sep 2026', icon: 'mdi-alert-octagon', color: 'error', tag: 'CLOSED', tagColor: 'grey', isUnread: false },
  { id: 5, type: 'Safety Bulletin', title: 'Safety Bulletin 07/2026: Penggunaan APD', subtitle: 'Pengingat keras penggunaan APD (Personal Protective Equipment) standar di seluruh area apron dan fasilitas MRO.', author: 'Ground Ops', date: '28 Aug 2026', icon: 'mdi-hard-hat', color: 'blue-grey', tag: 'ARCHIVED', tagColor: 'grey', isUnread: false },
])

const meetings = ref([
  { id: 1, date: '12 Sep 2026', type: 'SAG - MRO', topics: 'Review defect deferral rate & GSE calibration issues', pending: '2 Open CAPA', pendingColor: 'warning' },
  { id: 2, date: '01 Sep 2026', type: 'SRB - Executive', topics: 'Q2 Safety Performance Review & SMS Budget Allocation', pending: 'Cleared', pendingColor: 'success' },
  { id: 3, date: '15 Aug 2026', type: 'SAG - Flight Ops', topics: 'Fatigue risk threshold adjustments for Papuan routes', pending: '1 Open CAPA', pendingColor: 'warning' },
  { id: 4, date: '05 Aug 2026', type: 'SAG - Ground Ops', topics: 'Dangerous Goods handling procedures in outstations', pending: 'Cleared', pendingColor: 'success' },
])

const campaigns = ref([
  { id: 1, title: 'Just Culture Awareness 2026', progress: 75, target: 'All Staff', deadline: '30 Sep 2026' },
  { id: 2, title: 'FOD Walk & Clean Initiative', progress: 100, target: 'Ground Handling', deadline: 'Completed' },
  { id: 3, title: 'Mental Health & Fatigue Reporting', progress: 40, target: 'Flight Crew', deadline: '31 Dec 2026' }
])

const filteredBulletins = computed(() => {
  return bulletins.value.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.value.toLowerCase()) || 
                        item.subtitle.toLowerCase().includes(search.value.toLowerCase())
    const matchCat = category.value === 'All' || item.type === category.value
    const matchStatus = readStatus.value === 'All' || 
                        (readStatus.value === 'Unread' && item.isUnread) || 
                        (readStatus.value === 'Read' && !item.isUnread)
    return matchSearch && matchCat && matchStatus
  })
})
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover, .hover-card:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}
.cursor-pointer {
  cursor: pointer;
}
.last-mb-0:last-child {
  margin-bottom: 0 !important;
}
@keyframes spin { 100% { transform: rotate(360deg); } }
.mdi-spin { animation: spin 1s linear infinite; }
</style>