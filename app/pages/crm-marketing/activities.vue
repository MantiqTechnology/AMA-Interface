<script setup lang="ts">
import { useCrmDummyData } from '../../composables/useCrmDummyData';
import type { CrmActivity } from '../../types/crm';

definePageMeta({ layout: 'default' });

const { activities, addActivity } = useCrmDummyData();

const search = ref('');
const typeFilter = ref('All');
const ownerFilter = ref('All');
const dateFilter = ref('');

const typeOptions = [
  'All',
  'Meeting',
  'Phone Call',
  'Email',
  'Demo',
  'Presentation',
  'Site Survey',
  'Follow Up'
];
const ownerOptions = computed(() => [
  'All',
  ...Array.from(new Set(activities.map((a) => a.sales)))
]);

const formTypeOptions: CrmActivity['type'][] = [
  'Meeting',
  'Phone Call',
  'Email',
  'Demo',
  'Presentation',
  'Site Survey',
  'Follow Up'
];
const formStatusOptions: CrmActivity['status'][] = ['Scheduled', 'Completed', 'Cancelled'];

const filtered = computed<CrmActivity[]>(() =>
  activities.filter((a) => {
    const matchSearch =
      !search.value ||
      a.customer.toLowerCase().includes(search.value.toLowerCase()) ||
      a.relatedOpportunity.toLowerCase().includes(search.value.toLowerCase());
    const matchType = typeFilter.value === 'All' || a.type === typeFilter.value;
    const matchOwner = ownerFilter.value === 'All' || a.sales === ownerFilter.value;
    return matchSearch && matchType && matchOwner;
  })
);

const meetingToday = computed(
  () => activities.filter((a) => a.type === 'Meeting' && a.status === 'Scheduled').length
);
const followUp = computed(() => activities.filter((a) => a.type === 'Follow Up').length);
const siteSurvey = computed(() => activities.filter((a) => a.type === 'Site Survey').length);
const presentation = computed(() => activities.filter((a) => a.type === 'Presentation').length);

const kpis = computed(() => [
  {
    label: 'Meeting Today',
    value: meetingToday.value,
    icon: 'mdi-calendar-account-outline',
    color: '#2563EB',
    bg: '#DBEAFE'
  },
  {
    label: 'Follow Up',
    value: followUp.value,
    icon: 'mdi-phone-forward-outline',
    color: '#D97706',
    bg: '#FEF3C7'
  },
  {
    label: 'Site Survey',
    value: siteSurvey.value,
    icon: 'mdi-map-marker-radius-outline',
    color: '#059669',
    bg: '#D1FAE5'
  },
  {
    label: 'Presentation',
    value: presentation.value,
    icon: 'mdi-presentation',
    color: '#7C3AED',
    bg: '#EDE9FE'
  }
]);

const headers = [
  { title: 'Activity ID', key: 'id' },
  { title: 'Activity Type', key: 'type' },
  { title: 'Customer', key: 'customer' },
  { title: 'Related Opportunity', key: 'relatedOpportunity' },
  { title: 'Sales', key: 'sales' },
  { title: 'Schedule', key: 'schedule' },
  { title: 'Result', key: 'result' },
  { title: 'Next Action', key: 'nextAction' },
  { title: 'Status', key: 'status' }
];

function statusColor(status: string) {
  return { Scheduled: 'primary', Completed: 'success', Cancelled: 'error' }[status] || 'default';
}

const requiredRule = (v: any) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi';

// ---------------------------------------------------------------------
// CREATE ACTIVITY
// ---------------------------------------------------------------------
function nowFormatted() {
  const d = new Date();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des'
  ];
  const date = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
  return `${date}, ${time}`;
}

type ActivityFormState = Omit<CrmActivity, 'id'>;

function emptyActivityForm(): ActivityFormState {
  return {
    type: 'Meeting',
    customer: '',
    relatedOpportunity: '',
    sales: '',
    schedule: nowFormatted(),
    result: '-',
    nextAction: '',
    status: 'Scheduled'
  };
}

const showCreateDialog = ref(false);
const activityForm = ref<ActivityFormState>(emptyActivityForm());
const activityFormRef = ref();

function openCreateDialog() {
  activityForm.value = emptyActivityForm();
  showCreateDialog.value = true;
}

async function submitActivityForm() {
  const { valid } = await activityFormRef.value.validate();
  if (!valid) return;

  addActivity({ ...activityForm.value });
  showSnackbar('Activity baru berhasil dibuat.');
  showCreateDialog.value = false;
}

const snackbar = ref(false);
const snackbarText = ref('');
function showSnackbar(text: string) {
  snackbarText.value = text;
  snackbar.value = true;
}
</script>

<template>
  <div class="crm-overview">
    <CrmPageHeader
      style="margin-top: 14px"
      title="Activities"
      description="Riwayat aktivitas seluruh tim sales."
      @export="() => {}"
    />
    <CrmSubNav />
    <VRow class="mb-6">
      <VCol v-for="kpi in kpis" :key="kpi.label" cols="12" sm="6" md="3">
        <VCard variant="flat" border rounded="lg">
          <VCardText class="d-flex justify-space-between align-center pa-4">
            <div>
              <div class="text-caption text-medium-emphasis mb-1">{{ kpi.label }}</div>
              <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
            </div>
            <div class="kpi-icon" :style="{ backgroundColor: kpi.bg, color: kpi.color }">
              <VIcon :icon="kpi.icon" size="20" />
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mb-6" variant="flat" border>
      <VCardText class="d-flex flex-wrap ga-4 align-center pa-4">
        <VTextField
          v-model="search"
          label="Search customer / opportunity"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
          style="min-width: 240px; flex: 1"
        />
        <VSelect
          v-model="typeFilter"
          :items="typeOptions"
          label="Activity Type"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 190px"
        />
        <VSelect
          v-model="ownerFilter"
          :items="ownerOptions"
          label="Sales Owner"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 190px"
        />
        <VTextField
          v-model="dateFilter"
          type="date"
          label="Date"
          density="comfortable"
          variant="outlined"
          hide-details
          style="max-width: 170px"
        />
        <VBtn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          Create Activity
        </VBtn>
      </VCardText>
    </VCard>

    <VCard variant="flat" border>
      <VDataTable :headers="headers" :items="filtered" :items-per-page="10" class="crm-table">
        <template #[`item.status`]="{ item }">
          <VChip size="small" :color="statusColor(item.status)" variant="tonal">
            {{ item.status }}
          </VChip>
        </template>
      </VDataTable>
    </VCard>

    <!-- CREATE ACTIVITY DIALOG -->
    <VDialog v-model="showCreateDialog" max-width="600" persistent>
      <VCard class="pa-2" rounded="lg">
        <VCardTitle class="text-h6">Create Activity</VCardTitle>
        <VCardText>
          <VForm ref="activityFormRef">
            <VRow dense>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="activityForm.type"
                  :items="formTypeOptions"
                  label="Activity Type*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="activityForm.status"
                  :items="formStatusOptions"
                  label="Status*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.customer"
                  label="Customer*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.relatedOpportunity"
                  label="Related Opportunity"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.sales"
                  label="Sales*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.schedule"
                  label="Schedule*"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                  hint="Format: dd MMM yyyy, HH:mm WIB"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.result"
                  label="Result"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="activityForm.nextAction"
                  label="Next Action"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateDialog = false">Cancel</VBtn>
          <VBtn color="primary" variant="flat" @click="submitActivityForm">Save Activity</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" color="success" timeout="3000" location="top">
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.crm-overview {
  padding: 8px 15px 10px;
}

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
