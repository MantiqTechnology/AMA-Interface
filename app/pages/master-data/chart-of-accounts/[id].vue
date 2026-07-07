<script setup lang="ts">
import type { DocumentOwnerType, MasterDocumentDto } from '#shared/contracts/documents';
import type {
  MasterDataEntityConfig,
  MasterDataDetailResponse,
  MasterDataEntityKey,
  MasterDataOption,
  MasterDataValue,
  MasterDataFieldConfig
} from '#shared/contracts/master-data';
import { getDocumentTypeConfig } from '#shared/constants/document-types';
import DocumentPanel from '../../../components/documents/DocumentPanel.vue';
import DocumentStatusBadge from '../../../components/documents/DocumentStatusBadge.vue';
import { chartOfAccountsMasterDataConfig } from '#shared/contracts/master-data';

type OverviewItem = {
  label: string;
  value: string;
};

type OverviewSection = {
  title: string;
  items: OverviewItem[];
};

type ActivityItem = {
  at: string;
  label: string;
  detail: string;
};

const config: MasterDataEntityConfig = chartOfAccountsMasterDataConfig;
const ownerType = 'company' satisfies DocumentOwnerType;

const route = useRoute();
const id = computed(() => String(route.params.id));
const activeTab = ref('overview');

const { data, pending, error, refresh } = await useAsyncData(
  `master-detail-${config.key}-${id.value}`,
  () => fetchApi<MasterDataDetailResponse>(`${config.apiPath}/${id.value}`)
);

const { data: documents, refresh: refreshDocuments } = await useAsyncData(
  `master-detail-documents-${ownerType}-${id.value}`,
  () =>
    fetchApi<MasterDocumentDto[]>('/api/documents', {
      query: {
        ownerType: ownerType,
        ownerId: id.value
      }
    })
);

const record = computed(() => data.value?.row ?? null);
const rowsDocuments = computed(() => documents.value ?? []);

const title = computed(() => {
  const row = record.value;
  if (!row) return config.title;
  return readable(row[config.labelField]);
});

const code = computed(() => {
  const row = record.value;
  if (!row) return id.value;
  return readable(row[config.codeField]);
});

const activeStatus = computed(() => (record.value?.is_active ? 'Active' : 'Inactive'));

const readiness = computed(() => {
  const row = record.value;
  if (!row) return { value: 'WATCH', reasons: [] as string[] };

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (config.key === 'aircraft') {
    const serviceability = String(row.serviceability_status ?? '');
    if (serviceability !== 'SERVICEABLE') {
      reasons.push(`Aircraft serviceability is ${readable(serviceability)}`);
    }
  }

  if (config.key === 'crew') {
    addDateReadiness('Pilot licence', row.license_expiry_date, reasons, warnings);
    addDateReadiness('Medical certificate', row.medical_expiry_date, reasons, warnings);
  }

  for (const document of rowsDocuments.value) {
    const type = getDocumentTypeConfig(document.documentType);
    if (!type?.mandatory || document.lifecycleStatus === 'SUPERSEDED') continue;

    if (document.lifecycleStatus === 'EXPIRED') {
      reasons.push(`${type.label} expired on ${formatLongDate(document.expiresAt)}`);
    }

    if (document.lifecycleStatus === 'EXPIRING') {
      warnings.push(`${type.label} expires in ${document.daysUntilExpiry ?? 0} days`);
    }
  }

  if (reasons.length > 0) return { value: 'NOT_READY', reasons: [...reasons, ...warnings] };
  if (warnings.length > 0) return { value: 'WATCH', reasons: warnings };
  return { value: 'READY', reasons: [] };
});

const overviewSections = computed<OverviewSection[]>(() => {
  const row = record.value;
  if (!row) return [];

  if (config.key === 'aircraft') {
    return [
      {
        title: 'Aircraft',
        items: [
          item('Registration', row.registration_number),
          item('Aircraft type', row.aircraft_type),
          item('Manufacturer', row.manufacturer),
          item('Model', row.model),
          item('Serviceability', row.serviceability_status)
        ]
      },
      {
        title: 'Operational',
        items: [
          item('Passenger capacity', row.passenger_capacity),
          item('Cargo capacity', `${readable(row.cargo_capacity_kg)} kg`),
          item('Fuel type', row.fuel_type),
          item('Home station', relationLabel('base_station_id', row.base_station_id))
        ]
      },
      documentOverviewSection([
        'AIRCRAFT_CERTIFICATE_OF_REGISTRATION',
        'AIRCRAFT_CERTIFICATE_OF_AIRWORTHINESS',
        'AIRCRAFT_INSURANCE_CERTIFICATE',
        'AIRCRAFT_WEIGHT_AND_BALANCE'
      ])
    ];
  }

  if (config.key === 'crew') {
    return [
      {
        title: 'Personnel',
        items: [
          item('Employee code', row.employee_code),
          item('Role', row.crew_role),
          item('Personnel type', row.unit),
          item('Station assignment', relationLabel('base_station_id', row.base_station_id)),
          item('Employment status', row.employment_status)
        ]
      },
      {
        title: 'Licence & Rating',
        items: [
          item('Licence type', row.license_type),
          item('Licence number', row.license_number),
          item('Licence expiry', row.license_expiry_date),
          item('Medical expiry', row.medical_expiry_date),
          item('Readiness', readiness.value.value)
        ]
      },
      documentOverviewSection([
        'PILOT_LICENSE',
        'PILOT_MEDICAL_CERTIFICATE',
        'PILOT_RECURRENCY_TRAINING'
      ])
    ];
  }

  if (config.key === 'stations') {
    return [
      {
        title: 'Station',
        items: [
          item('Station code', row.station_code),
          item('Location', `${readable(row.city_or_region)}, ${readable(row.province)}`),
          item('Airport type', row.airport_type),
          item('Operating hours', '06:00-17:00 WIT'),
          item('PIC', 'Station Duty Officer Demo'),
          item('Emergency contact', '+62-900-AMA-DEMO')
        ]
      },
      {
        title: 'Facilities',
        items: [
          item('Fuel service', booleanText(row.has_fuel_service)),
          item('Handling service', booleanText(row.has_handling_service)),
          item('Parking service', booleanText(row.has_parking_service))
        ]
      },
      documentOverviewSection([
        'STATION_LOCAL_SOP',
        'STATION_INFORMATION_SHEET',
        'STATION_HANDLING_AGREEMENT',
        'STATION_HANDLING_RATE_CARD'
      ])
    ];
  }

  if (config.key === 'vendors') {
    return [
      {
        title: 'Vendor',
        items: [
          item('Vendor code', row.vendor_code),
          item('Classification', row.vendor_type),
          item('Coverage station', relationLabel('station_id', row.station_id)),
          item('PIC', row.contact_person),
          item('Phone', row.phone),
          item('Email', row.email)
        ]
      },
      {
        title: 'Finance Profile',
        items: [
          item('Payment term', relationLabel('payment_term_id', row.payment_term_id)),
          item('Tax profile', 'Demo tax profile on file'),
          item('Bank verification', documentStatus('VENDOR_BANK_VERIFICATION'))
        ]
      },
      documentOverviewSection([
        'HANDLING_SERVICE_AGREEMENT',
        'VENDOR_LEGAL_DOCUMENT',
        'VENDOR_TAX_DOCUMENT',
        'VENDOR_BANK_VERIFICATION'
      ])
    ];
  }

  if (config.key === 'customers') {
    return [
      {
        title: 'Customer',
        items: [
          item('Account code', row.account_code),
          item('Customer type', row.account_type),
          item('Contact', row.contact_person),
          item('Phone', row.phone),
          item('Email', row.email)
        ]
      },
      {
        title: 'Commercial Profile',
        items: [
          item('Payment term', relationLabel('payment_term_id', row.payment_term_id)),
          item('Credit limit', row.credit_limit),
          item(
            'Credit status',
            Number(row.credit_limit ?? 0) > 0 ? 'Approved for demo billing' : 'Cash / manual review'
          )
        ]
      },
      documentOverviewSection([
        'CHARTER_AGREEMENT',
        'CUSTOMER_RATE_CARD',
        'CUSTOMER_TAX_DOCUMENT',
        'CUSTOMER_CREDIT_APPROVAL'
      ])
    ];
  }

  if (config.key === 'routes') {
    return [
      {
        title: 'Route',
        items: [
          item('Route code', row.route_code),
          item('Origin', relationLabel('origin_station_id', row.origin_station_id)),
          item('Destination', relationLabel('destination_station_id', row.destination_station_id)),
          item('Duration', `${readable(row.estimated_duration_minutes)} minutes`),
          item('Distance', `${readable(row.distance_km)} km`)
        ]
      },
      documentOverviewSection(['ROUTE_RISK_ASSESSMENT', 'AIRPORT_OPERATIONAL_BRIEFING'])
    ];
  }

  return [
    {
      title: config.shortTitle,
      items: config.fields.map((field: MasterDataFieldConfig) => item(field.label, row[field.key]))
    }
  ];
});

const activity = computed<ActivityItem[]>(() => {
  const row = record.value;
  if (!row) return [];

  const items: ActivityItem[] = [
    {
      at: row.created_at,
      label: 'created',
      detail: `${config.shortTitle} record created`
    }
  ];

  if (row.updated_at !== row.created_at) {
    items.push({
      at: row.updated_at,
      label: 'updated',
      detail: `${config.shortTitle} record updated`
    });
  }

  for (const document of rowsDocuments.value) {
    items.push({
      at: document.uploadedAt,
      label: 'document uploaded',
      detail: document.title
    });

    if (document.verifiedAt && document.verificationStatus === 'VERIFIED') {
      items.push({ at: document.verifiedAt, label: 'document verified', detail: document.title });
    }

    if (document.verificationStatus === 'REJECTED') {
      items.push({ at: document.updatedAt, label: 'document rejected', detail: document.title });
    }

    if (document.supersededByDocumentId) {
      items.push({ at: document.updatedAt, label: 'document superseded', detail: document.title });
    }
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
});

function item(
  label: string,
  value: MasterDataValue | string | number | boolean | null | undefined
): OverviewItem {
  return {
    label,
    value: readable(value)
  };
}

function readable(value: MasterDataValue | string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('id-ID');
  return String(value).replaceAll('_', ' ');
}

function booleanText(value: MasterDataValue) {
  return Boolean(value) ? 'Available' : 'Not available';
}

function relationLabel(fieldKey: string, idValue: MasterDataValue) {
  if (typeof idValue !== 'string') return '-';

  const field = config.fields.find((item: MasterDataFieldConfig) => item.key === fieldKey);
  const relation = field?.relation;
  const lookups = relation ? data.value?.lookups[relation as MasterDataEntityKey] : undefined;
  const option = (lookups as MasterDataOption[] | undefined)?.find(
    (lookup: MasterDataOption) => lookup.value === idValue
  );
  return option?.title ?? idValue;
}

function documentStatus(documentType: string) {
  const document = rowsDocuments.value.find(
    (item) => item.documentType === documentType && item.lifecycleStatus !== 'SUPERSEDED'
  );
  if (!document) return 'Not linked';
  return `${document.lifecycleStatus} / ${document.verificationStatus}`;
}

function documentOverviewSection(documentTypes: string[]): OverviewSection {
  return {
    title: 'Document Summary',
    items: documentTypes.map((documentType) => {
      const config = getDocumentTypeConfig(documentType);
      return item(config?.label ?? documentType, documentStatus(documentType));
    })
  };
}

function formatLongDate(value: string | undefined) {
  if (!value) return 'unknown date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function daysUntil(value: MasterDataValue) {
  if (typeof value !== 'string') return null;

  const today = new Date();
  const currentDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const expiryDate = new Date(`${value}T00:00:00.000Z`);
  return Math.ceil((expiryDate.getTime() - currentDate.getTime()) / 86_400_000);
}

function addDateReadiness(
  label: string,
  value: MasterDataValue,
  reasons: string[],
  warnings: string[]
) {
  const days = daysUntil(value);
  if (days === null || typeof value !== 'string') return;

  if (days < 0) {
    reasons.push(`${label} expired on ${formatLongDate(value)}`);
    return;
  }

  if (days <= 30) {
    warnings.push(`${label} expires in ${days} days`);
  }
}

function refreshAll() {
  void Promise.all([refresh(), refreshDocuments()]);
}

// --- UI-only helpers (no business logic) ---

const sectionIconMap: Record<string, string> = {
  Aircraft: 'mdi-airplane',
  Operational: 'mdi-cog-play-outline',
  Personnel: 'mdi-account-outline',
  'Licence & Rating': 'mdi-card-account-details-outline',
  Station: 'mdi-office-building-outline',
  Facilities: 'mdi-domain',
  Vendor: 'mdi-truck-outline',
  'Finance Profile': 'mdi-cash-multiple',
  Customer: 'mdi-account-tie-outline',
  'Commercial Profile': 'mdi-handshake-outline',
  Route: 'mdi-map-marker-path',
  'Document Summary': 'mdi-file-document-multiple-outline'
};

function sectionIcon(title: string) {
  return sectionIconMap[title] ?? 'mdi-information-outline';
}

const activityMeta: Record<string, { icon: string; color: string }> = {
  created: { icon: 'mdi-plus-circle-outline', color: 'primary' },
  updated: { icon: 'mdi-pencil-outline', color: 'secondary' },
  'document uploaded': { icon: 'mdi-file-upload-outline', color: 'info' },
  'document verified': { icon: 'mdi-file-check-outline', color: 'success' },
  'document rejected': { icon: 'mdi-file-remove-outline', color: 'error' },
  'document superseded': { icon: 'mdi-file-replace-outline', color: 'warning' }
};

function activityIcon(label: string) {
  return activityMeta[label]?.icon ?? 'mdi-circle-small';
}

function activityColor(label: string) {
  return activityMeta[label]?.color ?? 'primary';
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 d-flex flex-wrap align-end ga-4">
      <div class="d-flex align-start ga-3">
        <VBtn
          class="mt-1"
          density="comfortable"
          icon="mdi-arrow-left"
          :to="config.routePath"
          variant="tonal"
        />
        <div>
          <h1 class="text-h4 font-weight-bold text-text-primary mb-1">{{ title }}</h1>
          <div class="d-flex flex-wrap align-center ga-2">
            <span class="text-text-secondary font-weight-medium">{{ code }}</span>
            <VDivider vertical />
            <DocumentStatusBadge :value="activeStatus" />
            <DocumentStatusBadge :value="readiness.value" kind="readiness" />
          </div>
        </div>
      </div>
      <VSpacer />
      <VBtn :loading="pending" prepend-icon="mdi-refresh" variant="tonal" @click="refreshAll">
        Refresh
      </VBtn>
      <VBtn color="primary" prepend-icon="mdi-pencil-outline" :to="config.routePath" variant="flat">
        Edit
      </VBtn>
    </div>

    <VAlert
      v-if="readiness.reasons.length"
      class="mb-4"
      :color="readiness.value === 'NOT_READY' ? 'error' : 'warning'"
      :icon="readiness.value === 'NOT_READY' ? 'mdi-alert-circle-outline' : 'mdi-alert-outline'"
      variant="tonal"
    >
      <div class="font-weight-bold mb-1">
        {{ readiness.value === 'NOT_READY' ? 'Not ready for operation' : 'Readiness watch' }}
      </div>
      <ul class="pl-5" style="line-height: 1.7">
        <li v-for="reason in readiness.reasons" :key="reason">{{ reason }}</li>
      </ul>
    </VAlert>

    <VAlert
      v-if="error"
      class="mb-4"
      color="error"
      icon="mdi-alert-circle-outline"
      title="Unable to load master data"
      variant="tonal"
    >
      <p class="mb-3">{{ error.message }}</p>
      <VBtn color="error" size="small" variant="flat" @click="refreshAll">Try again</VBtn>
    </VAlert>

    <VSkeletonLoader v-if="pending && !record" type="heading, paragraph, card, table" />

    <template v-else-if="record">
      <VCard border rounded="lg">
        <VTabs v-model="activeTab" color="primary">
          <VTab prepend-icon="mdi-view-grid-outline" value="overview">Overview</VTab>
          <VTab prepend-icon="mdi-file-document-multiple-outline" value="documents">
            Documents
            <VBadge
              v-if="rowsDocuments.length"
              class="ml-2"
              color="secondary"
              :content="rowsDocuments.length"
              inline
            />
          </VTab>
          <VTab prepend-icon="mdi-history" value="activity">Activity</VTab>
        </VTabs>

        <VDivider />

        <VWindow v-model="activeTab">
          <VWindowItem value="overview">
            <VCardText class="pa-5">
              <VRow>
                <VCol v-for="section in overviewSections" :key="section.title" cols="12" md="4">
                  <VCard border class="h-100" rounded="lg">
                    <VCardTitle class="d-flex align-center ga-2 py-3">
                      <VAvatar color="primary" rounded="lg" size="32" variant="tonal">
                        <VIcon :icon="sectionIcon(section.title)" size="18" />
                      </VAvatar>
                      <span class="text-subtitle-1 font-weight-bold text-text-primary">
                        {{ section.title }}
                      </span>
                    </VCardTitle>
                    <VDivider />
                    <VCardText class="pa-0">
                      <div
                        v-for="(entry, index) in section.items"
                        :key="entry.label"
                        class="px-4 py-3 field-row"
                        :class="{ 'border-b': Number(index) < section.items.length - 1 }"
                      >
                        <div class="text-caption text-text-secondary">{{ entry.label }}</div>
                        <div class="font-weight-medium text-text-primary">{{ entry.value }}</div>
                      </div>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="documents">
            <VCardText class="pa-5">
              <DocumentPanel :owner-id="id" :owner-type="ownerType" />
            </VCardText>
          </VWindowItem>

          <VWindowItem value="activity">
            <VCardText class="pa-5">
              <VTimeline v-if="activity.length" density="compact" side="end">
                <VTimelineItem
                  v-for="entry in activity"
                  :key="`${entry.at}-${entry.label}-${entry.detail}`"
                  :dot-color="activityColor(entry.label)"
                  :icon="activityIcon(entry.label)"
                  size="small"
                >
                  <div class="font-weight-medium text-text-primary text-capitalize">
                    {{ entry.label.replaceAll('_', ' ') }}
                  </div>
                  <div class="text-text-secondary">{{ entry.detail }}</div>
                  <div class="text-caption text-text-secondary">
                    {{ new Date(entry.at).toLocaleString('id-ID') }}
                  </div>
                </VTimelineItem>
              </VTimeline>
              <div v-else class="d-flex flex-column align-center py-10 text-center">
                <VIcon class="mb-2" color="info" icon="mdi-history" size="40" />
                <p class="text-text-secondary">No activity recorded yet.</p>
              </div>
            </VCardText>
          </VWindowItem>
        </VWindow>
      </VCard>
    </template>
  </VContainer>
</template>

<style scoped>
.field-row {
  transition: background-color 0.15s ease;
}

.field-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
}
</style>
