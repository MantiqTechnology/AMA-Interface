<script setup lang="ts">
import type { MasterDocumentDto } from '#shared/contracts/documents';
import type {
  PersonnelDetailDto,
  PersonnelDto,
  PersonnelFlyingHoursDto,
  PersonnelHistoryItemDto,
  PersonnelLicenseInput,
  PersonnelLicenseDto,
  PersonnelMedicalCertificateInput,
  PersonnelMedicalCertificateDto,
  PersonnelQualificationDto
} from '#shared/features/operations/personnel';
import PersonnelFormDialog from './PersonnelFormDialog.vue';

type TabKey =
  'overview' | 'licenses' | 'medical' | 'qualifications' | 'documents' | 'notes' | 'history';
type ExpiryState = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

const LICENSE_EXPIRY_WARNING_DAYS = 60;
const MEDICAL_EXPIRY_WARNING_DAYS = 30;

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const { pushToast } = useDemoToasts();

const personnelId = computed(() => String(route.params.id));
const canManage = computed(() => can('personnel.manage').allowed);
const canManageLicense = computed(() => can('personnel.license.manage').allowed);
const canManageMedical = computed(() => can('personnel.medical.manage').allowed);

const tabs: Array<{ value: TabKey; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'licenses', label: 'Licenses' },
  { value: 'medical', label: 'Medical' },
  { value: 'qualifications', label: 'Qualifications' },
  { value: 'documents', label: 'Documents' },
  { value: 'notes', label: 'Notes' },
  { value: 'history', label: 'History' }
];

const activeTab = computed<TabKey>({
  get() {
    const value = String(route.query.tab ?? 'overview');
    return tabs.some((tab) => tab.value === value) ? (value as TabKey) : 'overview';
  },
  set(value) {
    router.replace({ query: { ...route.query, tab: value } });
  }
});

const {
  data: personnel,
  pending,
  error,
  refresh
} = await useAsyncData(
  `personnel-detail-${personnelId.value}`,
  () => fetchApi<PersonnelDetailDto>(`/api/master-data/personnel/${personnelId.value}`),
  { watch: [personnelId] }
);

const licenses = ref<PersonnelLicenseDto[] | null>(null);
const medical = ref<PersonnelMedicalCertificateDto[] | null>(null);
const qualifications = ref<PersonnelQualificationDto[] | null>(null);
const documents = ref<MasterDocumentDto[] | null>(null);
const notes = ref<Array<Record<string, unknown>> | null>(null);
const history = ref<PersonnelHistoryItemDto[] | null>(null);
const flyingHours = ref<PersonnelFlyingHoursDto | null>(null);
const tabLoading = ref(false);
const tabError = ref('');
const editDialog = ref(false);
const archiving = ref(false);
const licenseDialog = ref(false);
const medicalDialog = ref(false);
const editingLicense = ref<PersonnelLicenseDto | null>(null);
const editingMedical = ref<PersonnelMedicalCertificateDto | null>(null);
const licenseSubmitting = ref(false);
const medicalSubmitting = ref(false);
const licenseError = ref('');
const medicalError = ref('');
const licenseForm = reactive<PersonnelLicenseInput>({
  licenseType: '',
  licenseNumber: '',
  issuingAuthority: null,
  issueDate: null,
  expiryDate: null,
  isPrimary: false,
  status: 'ACTIVE',
  documentId: null
});
const medicalForm = reactive<PersonnelMedicalCertificateInput>({
  certificateType: 'Class 1 Medical',
  certificateNumber: null,
  issueDate: null,
  expiryDate: '',
  status: 'ACTIVE',
  restrictions: null,
  issuingAuthority: null,
  documentId: null
});

watch(activeTab, (tab) => loadTab(tab), { immediate: true });

async function loadTab(tab: TabKey) {
  if (!personnel.value || tab === 'overview') return;
  const alreadyLoaded =
    (tab === 'licenses' && licenses.value) ||
    (tab === 'medical' && medical.value) ||
    (tab === 'qualifications' && qualifications.value) ||
    (tab === 'documents' && documents.value) ||
    (tab === 'notes' && notes.value) ||
    (tab === 'history' && history.value);
  if (alreadyLoaded) return;

  tabLoading.value = true;
  tabError.value = '';
  try {
    if (tab === 'licenses') {
      licenses.value = await fetchApi(`/api/master-data/personnel/${personnelId.value}/licenses`);
    } else if (tab === 'medical') {
      medical.value = await fetchApi(
        `/api/master-data/personnel/${personnelId.value}/medical-certificates`
      );
    } else if (tab === 'qualifications') {
      qualifications.value = await fetchApi(
        `/api/master-data/personnel/${personnelId.value}/qualifications`
      );
    } else if (tab === 'documents') {
      documents.value = await fetchApi(`/api/master-data/personnel/${personnelId.value}/documents`);
    } else if (tab === 'notes') {
      notes.value = await fetchApi(`/api/master-data/personnel/${personnelId.value}/notes`);
    } else if (tab === 'history') {
      history.value = await fetchApi(`/api/master-data/personnel/${personnelId.value}/history`);
    }
  } catch (err) {
    tabError.value = err instanceof Error ? err.message : 'Unable to load tab data.';
  } finally {
    tabLoading.value = false;
  }
}

async function loadFlyingHours() {
  if (flyingHours.value || !personnel.value) return;
  flyingHours.value = await fetchApi(
    `/api/master-data/personnel/${personnelId.value}/flying-hours`
  );
}

function openEdit() {
  editDialog.value = true;
}

async function archivePersonnel() {
  if (!personnel.value) return;
  archiving.value = true;
  try {
    await fetchApi(`/api/master-data/personnel/${personnelId.value}/archive`, { method: 'POST' });
    pushToast({ type: 'success', title: 'Personnel archived' });
    await refresh();
  } catch (err) {
    pushToast({
      type: 'error',
      title: 'Archive failed',
      message: err instanceof Error ? err.message : 'Unable to archive personnel.'
    });
  } finally {
    archiving.value = false;
  }
}

function resetLicenseForm(record: PersonnelLicenseDto | null = null) {
  editingLicense.value = record;
  Object.assign(licenseForm, {
    licenseType: record?.licenseType ?? '',
    licenseNumber: record?.licenseNumber ?? '',
    issuingAuthority: record?.issuingAuthority ?? null,
    issueDate: record?.issueDate ?? null,
    expiryDate: record?.expiryDate ?? null,
    isPrimary: record?.isPrimary ?? false,
    status: record?.status ?? 'ACTIVE',
    documentId: record?.documentId ?? null
  });
  licenseError.value = '';
}

function openLicenseDialog(record: PersonnelLicenseDto | null = null) {
  resetLicenseForm(record);
  licenseDialog.value = true;
}

async function saveLicense() {
  licenseSubmitting.value = true;
  licenseError.value = '';
  try {
    await fetchApi(
      editingLicense.value
        ? `/api/master-data/personnel/${personnelId.value}/licenses/${editingLicense.value.id}`
        : `/api/master-data/personnel/${personnelId.value}/licenses`,
      { method: editingLicense.value ? 'PUT' : 'POST', body: { ...licenseForm } }
    );
    licenses.value = null;
    await Promise.all([loadTab('licenses'), refresh()]);
    pushToast({
      type: 'success',
      title: editingLicense.value ? 'License updated' : 'License added'
    });
    licenseDialog.value = false;
  } catch (err) {
    licenseError.value = err instanceof Error ? err.message : 'Unable to save license.';
  } finally {
    licenseSubmitting.value = false;
  }
}

async function runLicenseAction(
  license: PersonnelLicenseDto,
  action: 'set-primary' | 'suspend' | 'revoke'
) {
  try {
    await fetchApi(
      `/api/master-data/personnel/${personnelId.value}/licenses/${license.id}/${action}`,
      {
        method: 'POST'
      }
    );
    licenses.value = null;
    await Promise.all([loadTab('licenses'), refresh()]);
    pushToast({ type: 'success', title: 'License updated' });
  } catch (err) {
    pushToast({
      type: 'error',
      title: 'License action failed',
      message: err instanceof Error ? err.message : 'Unable to update license.'
    });
  }
}

function resetMedicalForm(record: PersonnelMedicalCertificateDto | null = null) {
  editingMedical.value = record;
  Object.assign(medicalForm, {
    certificateType: record?.certificateType ?? 'Class 1 Medical',
    certificateNumber: record?.certificateNumber ?? null,
    issueDate: record?.issueDate ?? null,
    expiryDate: record?.expiryDate ?? '',
    status: record?.status ?? 'ACTIVE',
    restrictions: record?.restrictions ?? null,
    issuingAuthority: record?.issuingAuthority ?? null,
    documentId: record?.documentId ?? null
  });
  medicalError.value = '';
}

function openMedicalDialog(record: PersonnelMedicalCertificateDto | null = null) {
  resetMedicalForm(record);
  medicalDialog.value = true;
}

async function saveMedical() {
  medicalSubmitting.value = true;
  medicalError.value = '';
  try {
    await fetchApi(
      editingMedical.value
        ? `/api/master-data/personnel/${personnelId.value}/medical-certificates/${editingMedical.value.id}`
        : `/api/master-data/personnel/${personnelId.value}/medical-certificates`,
      { method: editingMedical.value ? 'PUT' : 'POST', body: { ...medicalForm } }
    );
    medical.value = null;
    await Promise.all([loadTab('medical'), refresh()]);
    pushToast({
      type: 'success',
      title: editingMedical.value ? 'Medical certificate updated' : 'Medical certificate added'
    });
    medicalDialog.value = false;
  } catch (err) {
    medicalError.value = err instanceof Error ? err.message : 'Unable to save medical certificate.';
  } finally {
    medicalSubmitting.value = false;
  }
}

watch(personnel, () => {
  void loadFlyingHours();
});

function errorCode(err: unknown) {
  if (!err || typeof err !== 'object') return null;
  const data = Reflect.get(err, 'data');
  const nestedError = data && typeof data === 'object' ? Reflect.get(data, 'error') : null;
  return nestedError && typeof nestedError === 'object' ? Reflect.get(nestedError, 'code') : null;
}

const notFound = computed(() => errorCode(error.value) === 'NOT_FOUND');

function empty(value: unknown) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function titleCaseEnum(value: string | null | undefined) {
  if (!value) return '—';
  const map: Record<string, string> = {
    PILOT_IN_COMMAND: 'Pilot in Command',
    CO_PILOT: 'Co-Pilot',
    CABIN_CREW: 'Cabin Crew',
    FLIGHT_OPERATIONS: 'Flight Operations',
    GROUND_CREW: 'Ground Crew',
    ON_DUTY: 'On Duty',
    ASSIGNED_OTHER_FLIGHT: 'Assigned Other Flight',
    ON_LEAVE: 'On Leave'
  };
  return (
    map[value] ??
    value
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

function stationDisplay(station: PersonnelDetailDto['baseStation']) {
  return station ? `${station.stationCode} · ${station.stationName}` : '—';
}

function supervisorDisplay(supervisor: PersonnelDetailDto['supervisor']) {
  return supervisor ? `${supervisor.fullName ?? '—'} · ${titleCaseEnum(supervisor.crewRole)}` : '—';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function daysUntil(value: string, nowIso = personnel.value?.readiness.evaluatedAt) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(`${value}T00:00:00.000Z`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function expiryState(value: string | null | undefined, threshold: number): ExpiryState {
  if (!value) return 'NO_EXPIRY';
  const days = daysUntil(value);
  if (days < 0) return 'EXPIRED';
  if (days <= threshold) return 'EXPIRING_SOON';
  return 'VALID';
}

function expiryColor(value: string | null | undefined, threshold: number) {
  const state = expiryState(value, threshold);
  if (state === 'EXPIRED') return 'error';
  if (state === 'EXPIRING_SOON') return 'warning';
  if (state === 'VALID') return 'success';
  return 'default';
}

function expiryText(value: string | null | undefined, threshold: number) {
  if (!value) return 'No expiry recorded';
  const days = daysUntil(value);
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return 'Expires today';
  return `${days} days remaining${days <= threshold ? ' · review' : ''}`;
}

function chipColor(value: string) {
  if (['ACTIVE', 'AVAILABLE', 'PERMANENT', 'VALID'].includes(value)) return 'success';
  if (['ON_DUTY', 'CONTRACT', 'EXPIRING_SOON'].includes(value)) return 'info';
  if (['ON_LEAVE', 'ASSIGNED_OTHER_FLIGHT', 'SUSPENDED'].includes(value)) return 'warning';
  if (['INACTIVE', 'UNAVAILABLE', 'EXPIRED', 'REVOKED', 'ARCHIVED'].includes(value)) return 'error';
  return 'default';
}

function formatFlyingHours(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${new Intl.NumberFormat('en-US').format(hours)}:${String(remainder).padStart(2, '0')}`;
}

const summaryRows = computed(() => {
  if (!personnel.value) return [];
  const item = personnel.value;
  return [
    ['Employee Code', item.employeeCode],
    ['Full Legal Name', item.fullName],
    ['Crew Role', titleCaseEnum(item.crewRole)],
    ['Primary License Type', item.primaryLicense?.licenseType ?? item.licenseType],
    ['Primary License Number', item.primaryLicense?.licenseNumber ?? item.licenseNumber],
    ['License Expiry', item.primaryLicense?.expiryDate ?? item.licenseExpiryDate],
    [
      'Medical Certificate Expiry',
      item.currentMedicalCertificate?.expiryDate ?? item.medicalExpiryDate
    ],
    ['Base Station', stationDisplay(item.baseStation)],
    ['Availability', titleCaseEnum(item.availabilityStatus)],
    ['Duty Station', stationDisplay(item.dutyStation)],
    ['Operational Note', item.readinessNote],
    ['Unit', item.unitSummary?.unitName ?? item.unit],
    ['Employment Status', titleCaseEnum(item.employmentStatus)],
    ['Supervisor', supervisorDisplay(item.supervisor)]
  ];
});
</script>

<template>
  <VContainer class="personnel-detail px-3 py-5 md:px-5" fluid>
    <div class="mb-4">
      <VBtn prepend-icon="mdi-arrow-left" to="/master-data/personnel" variant="text">
        Pilot & Crew
      </VBtn>
    </div>

    <VSkeletonLoader v-if="pending" type="heading, paragraph, card, table" />

    <VAlert v-else-if="error || !personnel" color="error" variant="tonal">
      <div class="font-weight-bold">
        {{ notFound ? 'Personnel not found' : 'Unable to load personnel' }}
      </div>
      <div class="mt-1 text-body-2">
        {{
          notFound
            ? 'The requested personnel record may have been removed or is no longer available.'
            : 'Personnel data could not be retrieved.'
        }}
      </div>
      <template #append>
        <VBtn v-if="notFound" to="/master-data/personnel" variant="text">
          Back to Pilot & Crew
        </VBtn>
        <VBtn v-else prepend-icon="mdi-refresh" variant="text" @click="refresh"> Retry </VBtn>
      </template>
    </VAlert>

    <template v-else>
      <header class="mb-5 d-flex flex-wrap align-start ga-4">
        <div class="min-w-0 flex-grow-1">
          <div class="mb-2 d-flex flex-wrap align-center ga-2">
            <h1 class="text-h4 font-weight-bold text-text-primary">{{ personnel.fullName }}</h1>
            <VChip :color="chipColor(personnel.employmentStatus)" size="small" variant="tonal">
              {{ titleCaseEnum(personnel.employmentStatus) }}
            </VChip>
            <VChip
              :color="personnel.readiness.ready ? 'success' : 'warning'"
              size="small"
              variant="tonal"
            >
              {{ personnel.readiness.ready ? 'Operationally ready' : 'Readiness review' }}
            </VChip>
          </div>
          <p class="text-body-1 text-text-secondary">
            {{ titleCaseEnum(personnel.crewRole) }} ·
            {{
              personnel.primaryLicense?.licenseType ?? personnel.licenseType ?? 'No primary license'
            }}
          </p>
        </div>

        <div class="d-none d-sm-flex ga-2">
          <VBtn
            v-if="canManage"
            color="primary"
            prepend-icon="mdi-pencil-outline"
            variant="flat"
            @click="openEdit"
          >
            Edit
          </VBtn>
          <VMenu v-if="canManage">
            <template #activator="{ props: menuProps }">
              <VBtn v-bind="menuProps" append-icon="mdi-chevron-down" variant="outlined">
                More
              </VBtn>
            </template>
            <VList density="compact">
              <VListItem
                prepend-icon="mdi-history"
                title="View history"
                @click="activeTab = 'history'"
              />
              <VListItem
                :disabled="archiving || personnel.lifecycleStatus === 'ARCHIVED'"
                prepend-icon="mdi-archive-outline"
                title="Archive personnel"
                @click="archivePersonnel"
              />
            </VList>
          </VMenu>
        </div>
      </header>

      <VCard border class="mb-4" flat>
        <VCardText>
          <VRow>
            <VCol v-for="[label, value] in summaryRows" :key="label" cols="12" md="6">
              <div class="detail-label">{{ label }}</div>
              <div v-if="label.includes('Expiry')" class="detail-value">
                {{ formatDate(value) }}
                <div class="mt-1">
                  <VChip
                    :color="
                      expiryColor(
                        value,
                        label.includes('Medical')
                          ? MEDICAL_EXPIRY_WARNING_DAYS
                          : LICENSE_EXPIRY_WARNING_DAYS
                      )
                    "
                    size="x-small"
                    variant="tonal"
                  >
                    {{
                      expiryText(
                        value,
                        label.includes('Medical')
                          ? MEDICAL_EXPIRY_WARNING_DAYS
                          : LICENSE_EXPIRY_WARNING_DAYS
                      )
                    }}
                  </VChip>
                </div>
              </div>
              <div v-else-if="['Availability', 'Employment Status'].includes(label)">
                <VChip :color="chipColor(String(value))" size="small" variant="tonal">
                  {{ empty(value) }}
                </VChip>
              </div>
              <div v-else class="detail-value">{{ empty(value) }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard border flat>
        <VTabs v-model="activeTab" class="tabs-scroll" show-arrows>
          <VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.label }}</VTab>
        </VTabs>
        <VDivider />
        <VCardText>
          <template v-if="activeTab === 'overview'">
            <VRow>
              <VCol cols="12" lg="6">
                <VCard border flat>
                  <VCardTitle class="text-subtitle-1 font-weight-bold">
                    Personal Information
                  </VCardTitle>
                  <VDivider />
                  <VList density="compact">
                    <VListItem
                      prepend-icon="mdi-calendar"
                      title="Date of Birth"
                      :subtitle="formatDate(personnel.dateOfBirth)"
                    />
                    <VListItem
                      prepend-icon="mdi-flag-outline"
                      title="Nationality"
                      :subtitle="empty(personnel.nationalityName ?? personnel.nationalityCode)"
                    />
                    <VListItem
                      prepend-icon="mdi-account-outline"
                      title="Gender"
                      :subtitle="empty(personnel.gender)"
                    />
                    <VListItem prepend-icon="mdi-phone-outline" title="Phone">
                      <template #subtitle>
                        <a v-if="personnel.phone" :href="`tel:${personnel.phone}`">{{
                          personnel.phone
                        }}</a>
                        <span v-else>—</span>
                      </template>
                    </VListItem>
                    <VListItem prepend-icon="mdi-email-outline" title="Email">
                      <template #subtitle>
                        <a v-if="personnel.email" :href="`mailto:${personnel.email}`">{{
                          personnel.email
                        }}</a>
                        <span v-else>—</span>
                      </template>
                    </VListItem>
                    <VListItem
                      prepend-icon="mdi-badge-account-outline"
                      title="Employee Code"
                      :subtitle="personnel.employeeCode"
                    />
                    <VListItem
                      prepend-icon="mdi-account-card-outline"
                      title="Legal Name"
                      :subtitle="personnel.fullName"
                    />
                  </VList>
                </VCard>
              </VCol>
              <VCol cols="12" lg="6">
                <VCard border flat>
                  <VCardTitle class="text-subtitle-1 font-weight-bold">Assignment</VCardTitle>
                  <VDivider />
                  <VList density="compact">
                    <VListItem
                      prepend-icon="mdi-airport"
                      title="Base Station"
                      :subtitle="stationDisplay(personnel.baseStation)"
                    />
                    <VListItem
                      prepend-icon="mdi-map-marker-outline"
                      title="Duty Station"
                      :subtitle="stationDisplay(personnel.dutyStation)"
                    />
                    <VListItem
                      prepend-icon="mdi-domain"
                      title="Unit"
                      :subtitle="empty(personnel.unitSummary?.unitName ?? personnel.unit)"
                    />
                    <VListItem
                      prepend-icon="mdi-account-tie-outline"
                      title="Reports To"
                      :subtitle="supervisorDisplay(personnel.supervisor)"
                    />
                    <VListItem
                      prepend-icon="mdi-account-check-outline"
                      title="Current Assignment Status"
                      :subtitle="titleCaseEnum(personnel.availabilityStatus)"
                    />
                  </VList>
                </VCard>
              </VCol>
            </VRow>

            <VCard border class="mt-4" flat>
              <VCardTitle class="text-subtitle-1 font-weight-bold">Personnel Summary</VCardTitle>
              <VDivider />
              <VCardText>
                <VRow>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Crew Role</div>
                    <div class="detail-value">{{ titleCaseEnum(personnel.crewRole) }}</div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Primary License</div>
                    <div class="detail-value">
                      {{ empty(personnel.primaryLicense?.licenseType) }}
                    </div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">License Valid Until</div>
                    <div class="detail-value">
                      {{ formatDate(personnel.primaryLicense?.expiryDate) }}
                    </div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Medical Valid Until</div>
                    <div class="detail-value">
                      {{ formatDate(personnel.currentMedicalCertificate?.expiryDate) }}
                    </div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Total Flying Hours</div>
                    <div class="detail-value tabular">
                      {{
                        formatFlyingHours(
                          flyingHours?.totalMinutes ?? personnel.flyingHoursSummary?.totalMinutes
                        )
                      }}
                    </div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Employment Status</div>
                    <div class="detail-value">{{ titleCaseEnum(personnel.employmentStatus) }}</div>
                  </VCol>
                  <VCol cols="12" sm="6" md="3">
                    <div class="detail-label">Availability</div>
                    <div class="detail-value">
                      {{ titleCaseEnum(personnel.availabilityStatus) }}
                    </div>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </template>

          <VAlert v-else-if="tabError" color="error" variant="tonal">{{ tabError }}</VAlert>
          <VSkeletonLoader v-else-if="tabLoading" type="table" />

          <template v-else-if="activeTab === 'licenses'">
            <div class="mb-3 d-flex justify-end">
              <VBtn
                v-if="canManageLicense"
                color="primary"
                prepend-icon="mdi-card-account-details-outline"
                @click="openLicenseDialog()"
              >
                Add License
              </VBtn>
            </div>
            <VTable>
              <thead>
                <tr>
                  <th>License Type</th>
                  <th>License Number</th>
                  <th>Issuing Authority</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Primary</th>
                  <th>Document</th>
                  <th v-if="canManageLicense" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="license in licenses ?? []" :key="license.id">
                  <td>{{ license.licenseType }}</td>
                  <td>{{ license.licenseNumber }}</td>
                  <td>{{ empty(license.issuingAuthority) }}</td>
                  <td>{{ formatDate(license.issueDate) }}</td>
                  <td>
                    {{ formatDate(license.expiryDate) }}
                    <div class="text-caption text-text-secondary">
                      {{ expiryText(license.expiryDate, LICENSE_EXPIRY_WARNING_DAYS) }}
                    </div>
                  </td>
                  <td>
                    <VChip :color="chipColor(license.status)" size="small" variant="tonal">
                      {{ titleCaseEnum(license.status) }}
                    </VChip>
                  </td>
                  <td>{{ license.isPrimary ? 'Yes' : 'No' }}</td>
                  <td>{{ empty(license.documentId) }}</td>
                  <td v-if="canManageLicense" class="text-right">
                    <DsTooltipIconButton
                      icon="mdi-pencil-outline"
                      tooltip="Edit license"
                      variant="text"
                      @click="openLicenseDialog(license)"
                    />
                    <VMenu>
                      <template #activator="{ props: menuProps }">
                        <DsTooltipIconButton
                          v-bind="menuProps"
                          icon="mdi-dots-vertical"
                          tooltip="License actions"
                          variant="text"
                        />
                      </template>
                      <VList density="compact">
                        <VListItem
                          :disabled="license.isPrimary"
                          prepend-icon="mdi-star-outline"
                          title="Set as primary"
                          @click="runLicenseAction(license, 'set-primary')"
                        />
                        <VListItem
                          prepend-icon="mdi-pause-octagon-outline"
                          title="Suspend"
                          @click="runLicenseAction(license, 'suspend')"
                        />
                        <VListItem
                          prepend-icon="mdi-close-octagon-outline"
                          title="Revoke"
                          @click="runLicenseAction(license, 'revoke')"
                        />
                      </VList>
                    </VMenu>
                  </td>
                </tr>
                <tr v-if="licenses?.length === 0">
                  <td :colspan="canManageLicense ? 9 : 8">No licenses recorded.</td>
                </tr>
              </tbody>
            </VTable>
          </template>

          <template v-else-if="activeTab === 'medical'">
            <div class="mb-3 d-flex justify-end">
              <VBtn
                v-if="canManageMedical"
                color="primary"
                prepend-icon="mdi-medical-bag"
                @click="openMedicalDialog()"
              >
                Add Medical Certificate
              </VBtn>
            </div>
            <VTable>
              <thead>
                <tr>
                  <th>Certificate Type</th>
                  <th>Certificate Number</th>
                  <th>Issued Date</th>
                  <th>Expiry Date</th>
                  <th>Authority</th>
                  <th>Status</th>
                  <th>Restrictions</th>
                  <th v-if="canManageMedical" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="certificate in medical ?? []" :key="certificate.id">
                  <td>{{ certificate.certificateType }}</td>
                  <td>{{ empty(certificate.certificateNumber) }}</td>
                  <td>{{ formatDate(certificate.issueDate) }}</td>
                  <td>
                    {{ formatDate(certificate.expiryDate) }}
                    <div class="text-caption text-text-secondary">
                      {{ expiryText(certificate.expiryDate, MEDICAL_EXPIRY_WARNING_DAYS) }}
                    </div>
                  </td>
                  <td>{{ empty(certificate.issuingAuthority) }}</td>
                  <td>
                    <VChip :color="chipColor(certificate.status)" size="small" variant="tonal">
                      {{ titleCaseEnum(certificate.status) }}
                    </VChip>
                  </td>
                  <td>{{ empty(certificate.restrictions) }}</td>
                  <td v-if="canManageMedical" class="text-right">
                    <DsTooltipIconButton
                      icon="mdi-pencil-outline"
                      tooltip="Edit medical certificate"
                      variant="text"
                      @click="openMedicalDialog(certificate)"
                    />
                  </td>
                </tr>
                <tr v-if="medical?.length === 0">
                  <td :colspan="canManageMedical ? 8 : 7">No medical certificates recorded.</td>
                </tr>
              </tbody>
            </VTable>
          </template>

          <VTable v-else-if="activeTab === 'qualifications'">
            <thead>
              <tr>
                <th>Qualification</th>
                <th>Reference</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="qualification in qualifications ?? []" :key="qualification.id">
                <td>{{ qualification.qualificationType }}</td>
                <td>{{ empty(qualification.referenceId ?? qualification.referenceType) }}</td>
                <td>{{ formatDate(qualification.issuedAt) }}</td>
                <td>{{ formatDate(qualification.expiresAt) }}</td>
                <td>
                  <VChip :color="chipColor(qualification.status)" size="small" variant="tonal">
                    {{ titleCaseEnum(qualification.status) }}
                  </VChip>
                </td>
                <td>{{ empty(qualification.notes) }}</td>
              </tr>
              <tr v-if="qualifications?.length === 0">
                <td colspan="6">No qualifications recorded.</td>
              </tr>
            </tbody>
          </VTable>

          <VTable v-else-if="activeTab === 'documents'">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Category</th>
                <th>Uploaded By</th>
                <th>Uploaded At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="document in documents ?? []" :key="document.id">
                <td>{{ document.upload?.originalName ?? document.title }}</td>
                <td>{{ document.documentType }}</td>
                <td>{{ document.uploadedBy }}</td>
                <td>{{ new Date(document.uploadedAt).toLocaleString('en-GB') }}</td>
                <td>
                  <VChip :color="chipColor(document.lifecycleStatus)" size="small" variant="tonal">
                    {{ titleCaseEnum(document.lifecycleStatus) }}
                  </VChip>
                </td>
              </tr>
              <tr v-if="documents?.length === 0">
                <td colspan="5">No personnel documents linked.</td>
              </tr>
            </tbody>
          </VTable>

          <VList v-else-if="activeTab === 'notes'" density="compact">
            <VListItem
              v-for="note in notes ?? []"
              :key="String(note.id)"
              prepend-icon="mdi-note-text-outline"
              :title="String(note.noteText ?? '—')"
              :subtitle="`${titleCaseEnum(String(note.noteType ?? 'GENERAL'))} · ${empty(note.authorName)}`"
            />
            <VListItem v-if="notes?.length === 0" title="No notes recorded." />
          </VList>

          <VTimeline v-else-if="activeTab === 'history'" density="compact" side="end">
            <VTimelineItem
              v-for="item in history ?? []"
              :key="item.id"
              dot-color="primary"
              size="small"
            >
              <div class="font-weight-medium">{{ titleCaseEnum(item.action) }}</div>
              <div class="text-body-2 text-text-secondary">
                {{ empty(item.actorName) }} ·
                {{ new Date(item.occurredAt).toLocaleString('en-GB') }}
              </div>
              <div class="text-caption text-text-secondary">
                {{ item.changedFields.join(', ') }}
              </div>
            </VTimelineItem>
            <div v-if="history?.length === 0" class="text-body-2 text-text-secondary">
              No history recorded.
            </div>
          </VTimeline>
        </VCardText>
      </VCard>
      <PersonnelFormDialog
        v-model="editDialog"
        :record="personnel as PersonnelDto"
        @saved="refresh"
      />

      <VDialog v-model="licenseDialog" max-width="720">
        <VCard>
          <VCardTitle>{{ editingLicense ? 'Edit License' : 'Add License' }}</VCardTitle>
          <VDivider />
          <VCardText>
            <VAlert v-if="licenseError" class="mb-4" color="error" variant="tonal">
              {{ licenseError }}
            </VAlert>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="licenseForm.licenseType"
                  label="License Type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="licenseForm.licenseNumber"
                  label="License Number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="licenseForm.issuingAuthority"
                  label="Issuing Authority"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="licenseForm.status"
                  :items="['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED']"
                  label="Status"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="licenseForm.issueDate"
                  label="Issue Date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="licenseForm.expiryDate"
                  label="Expiry Date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VCheckbox v-model="licenseForm.isPrimary" label="Set as primary active license" />
              </VCol>
            </VRow>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="licenseDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="licenseSubmitting" @click="saveLicense">
              Save License
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <VDialog v-model="medicalDialog" max-width="720">
        <VCard>
          <VCardTitle>
            {{ editingMedical ? 'Edit Medical Certificate' : 'Add Medical Certificate' }}
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VAlert v-if="medicalError" class="mb-4" color="error" variant="tonal">
              {{ medicalError }}
            </VAlert>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="medicalForm.certificateType"
                  label="Certificate Type"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="medicalForm.certificateNumber"
                  label="Certificate Number"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="medicalForm.issuingAuthority"
                  label="Issuing Authority"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="medicalForm.status"
                  :items="['ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED']"
                  label="Status"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="medicalForm.issueDate"
                  label="Issue Date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="medicalForm.expiryDate"
                  label="Expiry Date"
                  type="date"
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="medicalForm.restrictions"
                  label="Restrictions"
                  rows="3"
                  variant="outlined"
                />
              </VCol>
            </VRow>
          </VCardText>
          <VDivider />
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="medicalDialog = false">Cancel</VBtn>
            <VBtn color="primary" :loading="medicalSubmitting" @click="saveMedical">
              Save Medical Certificate
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>

<style scoped>
.detail-label {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.detail-value {
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.95rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.tabs-scroll {
  max-width: 100%;
}
</style>
