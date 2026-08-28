<template>
  <VContainer fluid class="pb-0">
    <!-- Header & Sub-menu -->
    <div class="mb-2">
      <h1 class="text-h5 font-weight-bold">Safety Communication</h1>
      <div class="text-caption text-medium-emphasis">Safety Promotion, Meetings, and Awareness</div>
    </div>

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
      <VTab
        value="emergency"
        to="/sms/EmergencyResponse"
        class="text-none font-weight-medium text-medium-emphasis"
      >
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
      <VTab value="communication" to="/sms/Communication" class="text-none font-weight-bold">
        <VIcon icon="mdi-message-alert-outline" size="18" class="mr-2" /> Communication
      </VTab>
    </VTabs>

    <!-- Filter Toolbar -->
    <VCard border class="pa-3 mb-4">
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
        <VBtn
          variant="outlined"
          color="primary"
          density="compact"
          prepend-icon="mdi-refresh"
          class="text-none"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          density="compact"
          prepend-icon="mdi-pencil-plus-outline"
          class="text-none ml-2"
        >
          New Publication
        </VBtn>
      </div>
    </VCard>
  </VContainer>

  <!-- Main Content -->
  <VContainer fluid class="pt-0">
    <VRow>
      <!-- Fitur 19: Safety Training Tracking Alerts -->
      <VCol cols="12">
        <VCard border class="pa-4 border-warning bg-orange-lighten-5">
          <div class="d-flex align-center mb-3">
            <VIcon icon="mdi-school-alert-outline" color="warning" class="mr-3" size="x-large" />
            <div>
              <div class="text-subtitle-1 font-weight-bold text-warning-darken-2">
                Training & Certification Compliance Alert
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Terdapat <strong>{{ trainingAlerts.length }} Personel</strong> yang lisensi atau
                sertifikasi keselamatannya akan kedaluwarsa dalam 30 hari ke depan.
              </div>
            </div>
            <VSpacer />
            <VBtn
              color="warning"
              variant="elevated"
              class="text-none font-weight-bold"
              prepend-icon="mdi-account-search"
            >
              Review HRIS Log
            </VBtn>
          </div>

          <VRow dense>
            <VCol v-for="alert in trainingAlerts" :key="alert.id" cols="12" sm="6" md="3">
              <VCard border elevation="0" class="pa-3 bg-white h-100 d-flex flex-column">
                <div class="d-flex justify-space-between align-start mb-1">
                  <span class="font-weight-bold text-body-2">{{ alert.name }}</span>
                  <VChip
                    size="x-small"
                    :color="alert.daysLeft <= 7 ? 'error' : 'warning'"
                    class="font-weight-bold"
                  >
                    {{ alert.daysLeft }} days left
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ alert.role }} | {{ alert.station }}
                </div>
                <VDivider class="my-2" />
                <div class="text-caption font-weight-medium text-primary">{{ alert.course }}</div>
                <div class="text-caption text-medium-emphasis mt-auto pt-1">
                  Expiry: <strong>{{ alert.expiry }}</strong>
                </div>
              </VCard>
            </VCol>
          </VRow>
        </VCard>
      </VCol>

      <!-- Fitur 17: Safety Communication & Awareness (Kiri) -->
      <VCol cols="12" md="7">
        <VCard border class="pa-4 h-100">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Safety Bulletins, Flash & Lessons Learned
              </div>
              <div class="text-caption text-medium-emphasis">
                Wajib dibaca oleh seluruh kru operasional
              </div>
            </div>
            <VBtn size="small" variant="text" color="primary" class="text-none">
              Mark All as Read
            </VBtn>
          </div>

          <VList lines="three" class="bg-transparent pa-0">
            <template v-for="(item, index) in bulletins" :key="item.id">
              <VListItem
                class="px-2 py-3 rounded hover-bg"
                :class="item.isUnread ? 'bg-blue-lighten-5' : ''"
              >
                <template #prepend>
                  <VBadge
                    :model-value="item.isUnread"
                    color="error"
                    dot
                    floating
                    offset-x="2"
                    offset-y="2"
                  >
                    <VAvatar :color="item.color" variant="tonal" class="mr-3" rounded size="48">
                      <VIcon :icon="item.icon" size="24" />
                    </VAvatar>
                  </VBadge>
                </template>

                <VListItemTitle class="font-weight-bold text-subtitle-2 mb-1">
                  {{ item.title }}
                </VListItemTitle>
                <VListItemSubtitle
                  class="text-caption text-medium-emphasis mb-2"
                  style="white-space: normal; line-height: 1.4"
                >
                  {{ item.subtitle }}
                </VListItemSubtitle>

                <div class="d-flex align-center text-caption">
                  <VIcon icon="mdi-calendar-clock" size="14" class="mr-1 text-medium-emphasis" />
                  <span class="text-medium-emphasis mr-3">{{ item.date }}</span>
                  <VIcon icon="mdi-account-edit" size="14" class="mr-1 text-medium-emphasis" />
                  <span class="text-medium-emphasis">{{ item.author }}</span>
                </div>

                <template #append>
                  <div class="d-flex flex-column align-end justify-space-between h-100">
                    <VChip
                      size="x-small"
                      :color="item.tagColor"
                      variant="flat"
                      class="font-weight-bold mb-2"
                    >
                      {{ item.tag }}
                    </VChip>
                    <VBtn
                      v-if="item.isUnread"
                      size="small"
                      color="primary"
                      variant="flat"
                      class="text-none px-2"
                      height="24"
                    >
                      Read
                    </VBtn>
                    <VBtn
                      v-else
                      size="small"
                      color="grey-darken-1"
                      variant="outlined"
                      class="text-none px-2"
                      height="24"
                    >
                      View
                    </VBtn>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="index !== bulletins.length - 1" class="my-1" />
            </template>
          </VList>
        </VCard>
      </VCol>

      <!-- Kolom Kanan: Rapat & Kampanye -->
      <VCol cols="12" md="5" class="d-flex flex-column ga-4">
        <!-- Fitur 21: Safety Meeting & SRB/SAG Tracking -->
        <VCard border class="pa-4 flex-grow-1">
          <div class="d-flex justify-space-between align-center mb-3">
            <div>
              <div class="text-subtitle-1 font-weight-bold">Safety Review Board (SRB) & SAG</div>
              <div class="text-caption text-medium-emphasis">Minutes of Meeting & Action Items</div>
            </div>
            <VBtn
              size="small"
              color="primary"
              prepend-icon="mdi-plus"
              variant="tonal"
              class="text-none"
            >
              New Minutes
            </VBtn>
          </div>

          <VTable density="compact" class="bg-transparent">
            <thead>
              <tr>
                <th class="text-caption font-weight-bold text-uppercase px-2">Date / Type</th>
                <th class="text-caption font-weight-bold text-uppercase px-2">Key Topics</th>
                <th class="text-caption font-weight-bold text-uppercase px-2 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meeting in meetings" :key="meeting.id" class="hover-bg">
                <td class="px-2 py-2">
                  <div class="text-caption font-weight-bold">{{ meeting.date }}</div>
                  <div class="text-caption text-primary">{{ meeting.type }}</div>
                </td>
                <td class="px-2 py-2" style="max-width: 150px">
                  <div class="text-caption text-truncate" :title="meeting.topics">
                    {{ meeting.topics }}
                  </div>
                </td>
                <td class="px-2 py-2 text-center">
                  <VChip
                    size="x-small"
                    :color="meeting.pendingColor"
                    variant="tonal"
                    class="font-weight-bold mb-1"
                  >
                    {{ meeting.pending }}
                  </VChip>
                  <div>
                    <VBtn
                      icon="mdi-download-outline"
                      variant="text"
                      color="grey-darken-1"
                      size="x-small"
                      density="comfortable"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
          <div class="text-center mt-2">
            <a href="#" class="text-caption font-weight-bold text-primary text-decoration-none">View Meeting Archive</a>
          </div>
        </VCard>

        <!-- Active Safety Campaigns -->
        <VCard border class="pa-4">
          <div class="d-flex justify-space-between align-center mb-4">
            <div class="text-subtitle-1 font-weight-bold">Active Safety Campaigns</div>
            <VIcon icon="mdi-flag-triangle" color="success" />
          </div>

          <div v-for="(campaign, i) in campaigns" :key="campaign.id" class="mb-4 last-mb-0">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-body-2 font-weight-bold">{{ campaign.title }}</span>
              <span
                class="text-caption font-weight-bold"
                :class="campaign.progress === 100 ? 'text-success' : 'text-primary'"
              >
                {{ campaign.progress }}%
              </span>
            </div>
            <VProgressLinear
              :model-value="campaign.progress"
              :color="campaign.progress === 100 ? 'success' : 'primary'"
              height="6"
              rounded
              class="mb-1"
            />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis">
              <span>Target: {{ campaign.target }}</span>
              <span>Deadline: {{ campaign.deadline }}</span>
            </div>
            <VDivider v-if="i !== campaigns.length - 1" class="mt-3" />
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
// Nuxt 3 auto-imports 'ref'

const activeTab = ref('communication');
const lastUpdated = ref('22 Aug 2026 07:05 WIB');
const search = ref('');
const category = ref('All');
const readStatus = ref('All');

// Mock Data: Peringatan Kedaluwarsa Lisensi/Training (Terhubung dengan HRIS)
const trainingAlerts = ref([
  {
    id: 1,
    name: 'Capt. Anton Wibowo',
    role: 'Pilot in Command',
    station: 'Sentani (DJJ)',
    course: 'Human Factors & SMS Training',
    expiry: '28 Aug 2026',
    daysLeft: 6
  },
  {
    id: 2,
    name: 'Budi Santoso',
    role: 'MRO Technician',
    station: 'Wamena (WMX)',
    course: 'Dangerous Goods (DG) Awareness',
    expiry: '02 Sep 2026',
    daysLeft: 11
  },
  {
    id: 3,
    name: 'Siti Aminah',
    role: 'FOO / Dispatcher',
    station: 'Timika (TIM)',
    course: 'Crew Resource Management (CRM)',
    expiry: '05 Sep 2026',
    daysLeft: 14
  },
  {
    id: 4,
    name: 'Michael Hedy',
    role: 'Ground Handling',
    station: 'Dekai (DKI)',
    course: 'Apron Safety & Security',
    expiry: '12 Sep 2026',
    daysLeft: 21
  }
]);

// Mock Data: Publikasi Keselamatan (Bulletins, Flash, Lessons Learned)
const bulletins = ref([
  {
    id: 1,
    type: 'Flash',
    title: 'Safety Flash 04/2026: Cuaca Ekstrem Dekai',
    subtitle:
      'Peringatan downdraft parah dan windshear di area approach WMX. Membutuhkan kewaspadaan ekstra saat final approach.',
    author: 'Chief Pilot',
    date: '21 Aug 2026',
    icon: 'mdi-flash',
    color: 'warning',
    tag: 'URGENT',
    tagColor: 'error',
    isUnread: true
  },
  {
    id: 2,
    type: 'Lessons',
    title: 'Lessons Learned: Bird Strike Mitigation',
    subtitle:
      'Evaluasi insiden bird strike di Sentani (DJJ) pada penerbangan pagi hari. Penyesuaian prosedur takeoff saat musim migrasi burung.',
    author: 'Safety Manager',
    date: '18 Aug 2026',
    icon: 'mdi-book-open-page-variant',
    color: 'info',
    tag: 'MUST READ',
    tagColor: 'primary',
    isUnread: true
  },
  {
    id: 3,
    type: 'Bulletin',
    title: 'Safety Bulletin 08/2026: Komunikasi Radio',
    subtitle:
      'Pembaruan prosedur komunikasi radio di area uncontrolled airspace pedalaman Papua sesuai arahan Airnav terbaru.',
    author: 'Safety Dept',
    date: '10 Aug 2026',
    icon: 'mdi-information-outline',
    color: 'success',
    tag: 'NEW',
    tagColor: 'success',
    isUnread: false
  },
  {
    id: 4,
    type: 'Flash',
    title: 'Safety Flash 03/2026: Contaminated Fuel Warning',
    subtitle:
      'Laporan indikasi kontaminasi air pada avtur dari drum suplai vendor lokal di airstrip perintis. Wajib SWD test sebelum fueling.',
    author: 'Quality Assurance',
    date: '05 Aug 2026',
    icon: 'mdi-alert-octagon',
    color: 'error',
    tag: 'CLOSED',
    tagColor: 'grey',
    isUnread: false
  },
  {
    id: 5,
    type: 'Bulletin',
    title: 'Safety Bulletin 07/2026: Penggunaan APD',
    subtitle:
      'Pengingat keras penggunaan APD (Personal Protective Equipment) standar di seluruh area apron dan fasilitas MRO.',
    author: 'Ground Ops',
    date: '28 Jul 2026',
    icon: 'mdi-hard-hat',
    color: 'blue-grey',
    tag: 'ARCHIVED',
    tagColor: 'grey',
    isUnread: false
  }
]);

// Mock Data: Risalah Rapat (Minutes of Meeting)
const meetings = ref([
  {
    id: 1,
    date: '12 Aug 2026',
    type: 'SAG - MRO',
    topics: 'Review defect deferral rate & GSE calibration issues',
    pending: '2 Open CAPA',
    pendingColor: 'warning'
  },
  {
    id: 2,
    date: '01 Aug 2026',
    type: 'SRB - Executive',
    topics: 'Q2 Safety Performance Review & SMS Budget Allocation',
    pending: 'Cleared',
    pendingColor: 'success'
  },
  {
    id: 3,
    date: '15 Jul 2026',
    type: 'SAG - Flight Ops',
    topics: 'Fatigue risk threshold adjustments for Papuan routes',
    pending: '1 Open CAPA',
    pendingColor: 'warning'
  },
  {
    id: 4,
    date: '05 Jul 2026',
    type: 'SAG - Ground Ops',
    topics: 'Dangerous Goods handling procedures in outstations',
    pending: 'Cleared',
    pendingColor: 'success'
  }
]);

// Mock Data: Kampanye Keselamatan Promosi
const campaigns = ref([
  {
    id: 1,
    title: 'Just Culture Awareness 2026',
    progress: 75,
    target: 'All Staff',
    deadline: '30 Sep 2026'
  },
  {
    id: 2,
    title: 'FOD Walk & Clean Initiative',
    progress: 100,
    target: 'Ground Handling',
    deadline: 'Completed'
  },
  {
    id: 3,
    title: 'Mental Health & Fatigue Reporting',
    progress: 40,
    target: 'Flight Crew',
    deadline: '31 Dec 2026'
  }
]);
</script>

<style scoped>
.hover-bg {
  transition: background-color 0.2s ease;
}
.hover-bg:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}
.last-mb-0:last-child {
  margin-bottom: 0 !important;
}
</style>
