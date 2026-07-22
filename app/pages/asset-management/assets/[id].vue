<script setup lang="ts">
import type { ApiResponse } from '#shared/contracts/api';
import QRCode from 'qrcode';
import DocumentPanel from '../../../components/documents/DocumentPanel.vue';
import AssetStatusBadge from '../../../features/corporate-assets/components/AssetStatusBadge.vue';

definePageMeta({ layout: 'default' });
const route = useRoute();
const id = computed(() => String(route.params.id));
const { can } = useAuthorization();
const { data, status, error, refresh } = await useFetch<ApiResponse<any>>(
  () => `/api/asset-management/assets/${id.value}`
);
const asset = computed(() => (data.value?.ok ? data.value.data : null));
const tab = ref('overview');
const dialog = ref<string | null>(null);
const saving = ref(false);
const actionError = ref('');
const qrOpen = ref(false);
const qrDataUrl = ref('');
const selectedWork = ref<any>(null);
const selectedAudit = ref<any>(null);
const form = reactive<any>({
  reason: '',
  employeeId: null,
  custodianNameSnapshot: '',
  departmentId: null,
  toStationId: null,
  toLocationType: 'STATION',
  toLocation: '',
  newEmployeeId: null,
  newCustodianNameSnapshot: null,
  maintenanceType: 'CORRECTIVE',
  priority: 'MEDIUM',
  summary: '',
  scheduledAt: null,
  auditorEmployeeId: null,
  auditorNameSnapshot: '',
  notes: null,
  insurer: '',
  policyNumber: '',
  coverageMinor: 0,
  premiumMinor: 0,
  effectiveDate: '',
  expiryDate: '',
  insuranceStatus: 'ACTIVE',
  completionResult: '',
  conditionAfter: 'SERVICEABLE',
  warehouseId: null,
  partId: null,
  quantity: 1
});
const { data: stations } = await useFetch<ApiResponse<any[]>>('/api/master-data/stations/options');
const { data: departments } = await useFetch<ApiResponse<any[]>>(
  '/api/master-data/departments/options'
);
const { data: employees } = await useFetch<ApiResponse<any[]>>(
  '/api/master-data/employees/options'
);
const { data: warehouses } = await useFetch<ApiResponse<any[]>>('/api/inventory/warehouses');
const { data: parts } = await useFetch<ApiResponse<any>>('/api/inventory/parts');
const stationOptions = computed(() => (stations.value?.ok ? stations.value.data : []));
const departmentOptions = computed(() => (departments.value?.ok ? departments.value.data : []));
const employeeOptions = computed(() => (employees.value?.ok ? employees.value.data : []));
const warehouseOptions = computed(() => (warehouses.value?.ok ? warehouses.value.data : []));
const partOptions = computed(() =>
  parts.value?.ok
    ? Array.isArray(parts.value.data)
      ? parts.value.data
      : (parts.value.data.items ?? [])
    : []
);
const token = () => ({
  expectedVersion: asset.value.version,
  expectedUpdatedAt: asset.value.updatedAt
});
async function submitAction() {
  if (!asset.value || !dialog.value) return;
  saving.value = true;
  actionError.value = '';
  try {
    const common = { method: 'POST' as const };
    if (dialog.value === 'assign')
      await $fetch(`/api/asset-management/assets/${id.value}/actions/assign`, {
        ...common,
        body: {
          ...token(),
          employeeId: form.employeeId,
          custodianNameSnapshot: form.custodianNameSnapshot,
          departmentId: form.departmentId,
          reason: form.reason,
          startedAt: new Date().toISOString()
        }
      });
    if (dialog.value === 'move')
      await $fetch(`/api/asset-management/assets/${id.value}/actions/move`, {
        ...common,
        body: {
          ...token(),
          toStationId: form.toStationId,
          toLocationType: form.toLocationType,
          toLocation: form.toLocation,
          newEmployeeId: form.newEmployeeId,
          newCustodianNameSnapshot: form.newCustodianNameSnapshot,
          reason: form.reason,
          movedAt: new Date().toISOString()
        }
      });
    if (dialog.value === 'maintenance')
      await $fetch(`/api/asset-management/assets/${id.value}/maintenance-work-orders`, {
        ...common,
        body: {
          ...token(),
          maintenanceType: form.maintenanceType,
          priority: form.priority,
          summary: form.summary,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null
        }
      });
    if (dialog.value === 'audit')
      await $fetch(`/api/asset-management/assets/${id.value}/audits`, {
        ...common,
        body: {
          ...token(),
          auditorEmployeeId: form.auditorEmployeeId,
          auditorNameSnapshot: form.auditorNameSnapshot,
          auditedAt: new Date().toISOString(),
          notes: form.notes,
          lines: [
            {
              fieldName: 'locationDetail',
              expectedValue: asset.value.locationDetail,
              actualValue: form.toLocation || asset.value.locationDetail,
              discrepancyType:
                form.toLocation && form.toLocation !== asset.value.locationDetail
                  ? 'LOCATION_MISMATCH'
                  : null,
              notes: form.notes
            }
          ]
        }
      });
    if (dialog.value === 'insurance')
      await $fetch(`/api/asset-management/assets/${id.value}/insurance`, {
        ...common,
        body: {
          ...token(),
          insurer: form.insurer,
          policyNumber: form.policyNumber,
          coverageMinor: form.coverageMinor,
          premiumMinor: form.premiumMinor,
          effectiveDate: form.effectiveDate,
          expiryDate: form.expiryDate,
          status: form.insuranceStatus
        }
      });
    if (dialog.value === 'complete')
      await $fetch(
        `/api/asset-management/maintenance-work-orders/${selectedWork.value.id}/actions/complete`,
        {
          ...common,
          body: {
            ...token(),
            completionResult: form.completionResult,
            conditionAfter: form.conditionAfter,
            reason: form.reason
          }
        }
      );
    if (dialog.value === 'parts')
      await $fetch(
        `/api/asset-management/maintenance-work-orders/${selectedWork.value.id}/actions/request-parts`,
        {
          ...common,
          body: {
            ...token(),
            warehouseId: form.warehouseId,
            reason: form.reason,
            lines: [{ partId: form.partId, quantity: form.quantity, serialIds: [], note: null }]
          }
        }
      );
    if (dialog.value === 'reconcile')
      await $fetch(`/api/asset-management/assets/${id.value}/actions/reconcile`, {
        ...common,
        body: {
          ...token(),
          auditId: selectedAudit.value.id,
          stationId: form.toStationId ?? asset.value.stationId,
          locationType: form.toLocationType,
          locationDetail: form.toLocation || asset.value.locationDetail,
          conditionStatus: form.conditionAfter,
          reason: form.reason
        }
      });
    dialog.value = null;
    await refresh();
  } catch (value: any) {
    actionError.value =
      value?.data?.error?.message ?? value?.message ?? 'Action could not be saved.';
  } finally {
    saving.value = false;
  }
}
const money = (value: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0) / 100);
function workAction(action: 'complete' | 'parts', work: any) {
  selectedWork.value = work;
  dialog.value = action;
  actionError.value = '';
}
function reconcile(audit: any) {
  selectedAudit.value = audit;
  form.toStationId = asset.value.stationId;
  form.toLocationType = asset.value.locationType;
  form.toLocation = asset.value.locationDetail;
  form.conditionAfter = asset.value.conditionStatus;
  dialog.value = 'reconcile';
}
async function showQr() {
  const detailUrl = new URL(
    `/asset-management/assets/${id.value}`,
    window.location.origin
  ).toString();
  qrDataUrl.value = await QRCode.toDataURL(
    JSON.stringify({ id: asset.value.id, code: asset.value.assetCode, url: detailUrl }),
    { width: 280, margin: 2 }
  );
  qrOpen.value = true;
}
</script>

<template>
  <VContainer fluid class="pa-4 pa-md-6">
    <VBtn to="/asset-management/register" variant="text" prepend-icon="mdi-arrow-left" class="mb-3">
      Asset Register
    </VBtn>
    <VAlert v-if="error" type="error" variant="tonal">
      Asset detail could not be loaded or is outside your station scope.
    </VAlert>
    <VSkeletonLoader v-else-if="status === 'pending' && !asset" type="article, table" />
    <template v-else-if="asset">
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <div>
          <div class="text-caption text-medium-emphasis">
            {{ asset.assetCode }} · Version {{ asset.version }}
          </div>
          <h1 class="text-h4 font-weight-bold">{{ asset.name }}</h1>
        </div>
        <AssetStatusBadge :value="asset.lifecycleStatus" /><AssetStatusBadge
          :value="asset.conditionStatus"
        /><VSpacer /><VBtn prepend-icon="mdi-qrcode" variant="outlined" @click="showQr">
          QR label
        </VBtn><VBtn icon="mdi-refresh" variant="text" aria-label="Refresh asset" @click="refresh()" />
      </div>
      <VCard border elevation="0">
        <VTabs v-model="tab" color="primary" show-arrows>
          <VTab value="overview">Overview</VTab><VTab value="custody">Custody & Location</VTab><VTab value="maintenance">Maintenance</VTab><VTab value="audit">Audit & Documents</VTab><VTab value="financial">Financial View</VTab>
        </VTabs><VDivider />
        <VWindow v-model="tab">
          <VWindowItem value="overview">
            <VCardText>
              <VRow>
                <VCol
                  v-for="entry in [
                    ['Category', asset.category],
                    ['Station', asset.stationCode ?? 'Unassigned'],
                    ['Location', asset.locationDetail],
                    ['Department', asset.departmentName ?? '—'],
                    ['Custodian', asset.custodianName ?? 'Unassigned'],
                    ['Serial number', asset.serialNumber ?? '—']
                  ]"
                  :key="String(entry[0])"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <div class="text-caption text-medium-emphasis">{{ entry[0] }}</div>
                  <div class="font-weight-medium">
                    {{ String(entry[1]).replaceAll('_', ' ') }}
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VWindowItem>
          <VWindowItem value="custody">
            <VCardText>
              <div class="d-flex flex-wrap ga-2 mb-4">
                <VBtn v-if="can('asset.assign').allowed" color="primary" @click="dialog = 'assign'">
                  Assign custodian
                </VBtn><VBtn v-if="can('asset.move').allowed" variant="outlined" @click="dialog = 'move'">
                  Record movement
                </VBtn>
              </div>
              <VTimeline side="end" density="compact">
                <VTimelineItem
                  v-for="move in asset.movements"
                  :key="move.id"
                  dot-color="primary"
                  size="small"
                >
                  <strong>{{ move.movementNumber }}</strong> · {{ move.fromLocation }} →
                  {{ move.toLocation }}
                  <div class="text-caption">{{ move.reason }}</div>
                </VTimelineItem>
              </VTimeline><VEmptyState
                v-if="!asset.movements.length"
                title="No movements recorded"
              />
            </VCardText>
          </VWindowItem>
          <VWindowItem value="maintenance">
            <VCardText>
              <VBtn
                v-if="can('asset.maintenance.manage').allowed"
                color="primary"
                class="mb-4"
                @click="dialog = 'maintenance'"
              >
                Open work order
              </VBtn><VTable>
                <thead>
                  <tr>
                    <th>Work order</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="work in asset.maintenance" :key="work.id">
                    <td>{{ work.workOrderNumber }}</td>
                    <td>{{ work.priority }}</td>
                    <td><AssetStatusBadge :value="work.status" /></td>
                    <td>{{ work.summary }}</td>
                    <td>
                      <div
                        v-if="
                          can('asset.maintenance.manage').allowed &&
                            !['COMPLETED', 'CANCELLED'].includes(work.status)
                        "
                        class="d-flex ga-1"
                      >
                        <VBtn size="small" variant="text" @click="workAction('parts', work)">
                          Request parts
                        </VBtn><VBtn size="small" variant="text" @click="workAction('complete', work)">
                          Complete
                        </VBtn>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </VTable><VEmptyState
                v-if="!asset.maintenance.length"
                title="No maintenance history"
              />
            </VCardText>
          </VWindowItem>
          <VWindowItem value="audit">
            <VCardText>
              <div class="d-flex ga-2 mb-5">
                <VBtn
                  v-if="can('asset.audit.manage').allowed"
                  color="primary"
                  @click="dialog = 'audit'"
                >
                  Record audit
                </VBtn><VBtn
                  v-if="can('asset.manage').allowed"
                  variant="outlined"
                  @click="dialog = 'insurance'"
                >
                  Add insurance
                </VBtn>
              </div>
              <VList v-if="asset.audits.length" lines="two" class="mb-4">
                <VListItem
                  v-for="audit in asset.audits"
                  :key="audit.id"
                  :title="audit.auditNumber"
                  :subtitle="
                    audit.hasDiscrepancy ? 'Discrepancy pending reconciliation' : 'No discrepancy'
                  "
                >
                  <template #append>
                    <VBtn
                      v-if="
                        can('asset.audit.manage').allowed &&
                          audit.hasDiscrepancy &&
                          !audit.reconciledAt
                      "
                      size="small"
                      variant="outlined"
                      @click="reconcile(audit)"
                    >
                      Reconcile
                    </VBtn>
                  </template>
                </VListItem>
              </VList><DocumentPanel owner-type="corporate_asset" :owner-id="asset.id" /><VDivider
                class="my-6"
              />
              <div class="text-h6 mb-3">Action history</div>
              <VList lines="two">
                <VListItem
                  v-for="item in asset.history"
                  :key="item.id"
                  :title="item.actionType.replaceAll('_', ' ')"
                  :subtitle="`${item.reason ?? 'No reason'} · ${item.createdAt}`"
                />
              </VList>
            </VCardText>
          </VWindowItem>
          <VWindowItem value="financial">
            <VCardText>
              <VAlert type="info" variant="tonal" class="mb-4">
                Read-only projection. Corporate Assets does not calculate depreciation or book
                value.
              </VAlert><template v-if="asset.financial?.financialStatus === 'NOT_CAPITALIZED'">
                <VEmptyState
                  title="Not capitalized"
                  text="No Accounting Asset Register record is linked to this Corporate Asset."
                  icon="mdi-calculator-variant-outline"
                />
              </template><VRow v-else>
                <VCol
                  v-for="entry in [
                    ['Accounting Asset ID', asset.financial.assetNumber],
                    ['Status', asset.financial.status],
                    ['Acquisition value', money(asset.financial.acquisitionValueMinor)],
                    [
                      'Accumulated depreciation',
                      money(asset.financial.accumulatedDepreciationMinor)
                    ],
                    ['Book value', money(asset.financial.currentBookValueMinor)],
                    ['As of', asset.financial.asOfDate]
                  ]"
                  :key="String(entry[0])"
                  cols="12"
                  md="4"
                >
                  <div class="text-caption text-medium-emphasis">{{ entry[0] }}</div>
                  <strong>{{ entry[1] }}</strong>
                </VCol>
              </VRow>
            </VCardText>
          </VWindowItem>
        </VWindow>
      </VCard>
    </template>
    <VDialog v-model="qrOpen" max-width="380">
      <VCard title="Local asset QR">
        <VCardText class="text-center">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="`QR for ${asset?.assetCode}`"
            width="280"
            height="280"
          >
          <div class="font-weight-bold mt-2">{{ asset?.assetCode }}</div>
          <div class="text-caption text-medium-emphasis">
            Contains only asset ID, code, and internal detail URL.
          </div>
        </VCardText>
      </VCard>
    </VDialog>
    <VDialog
      :model-value="Boolean(dialog)"
      max-width="680"
      @update:model-value="
        (value: boolean) => {
          if (!value) dialog = null;
        }
      "
    >
      <VCard
        :title="
          dialog ? dialog.replaceAll('_', ' ').replace(/^./, (c: string) => c.toUpperCase()) : ''
        "
      >
        <VCardText>
          <VAlert v-if="actionError" type="error" variant="tonal" class="mb-4">
            {{
              actionError
            }}
          </VAlert>
          <template v-if="dialog === 'assign'">
            <VSelect
              v-model="form.employeeId"
              :items="employeeOptions"
              item-title="fullName"
              item-value="id"
              label="Employee"
              clearable
            /><VTextField
              v-model="form.custodianNameSnapshot"
              label="Custodian name"
            /><VSelect
              v-model="form.departmentId"
              :items="departmentOptions"
              item-title="departmentName"
              item-value="id"
              label="Department"
              clearable
            />
          </template>
          <template v-else-if="dialog === 'move'">
            <VSelect
              v-model="form.toStationId"
              :items="stationOptions"
              item-title="label"
              item-value="id"
              label="Destination station"
              clearable
            /><VSelect
              v-model="form.toLocationType"
              :items="[
                'STATION',
                'DEPARTMENT',
                'TRANSIT',
                'VENDOR',
                'UNASSIGNED',
                'RETIRED',
                'LOST'
              ]"
              label="Location type"
            /><VTextField
              v-model="form.toLocation"
              label="Destination detail"
            />
          </template>
          <template v-else-if="dialog === 'maintenance'">
            <VSelect
              v-model="form.maintenanceType"
              :items="['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']"
              label="Maintenance type"
            /><VSelect
              v-model="form.priority"
              :items="['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']"
              label="Priority"
            /><VTextarea v-model="form.summary" label="Summary" /><VTextField
              v-model="form.scheduledAt"
              type="datetime-local"
              label="Scheduled at"
            />
          </template>
          <template v-else-if="dialog === 'audit'">
            <VSelect
              v-model="form.auditorEmployeeId"
              :items="employeeOptions"
              item-title="fullName"
              item-value="id"
              label="Auditor"
              clearable
            /><VTextField
              v-model="form.auditorNameSnapshot"
              label="Auditor name"
            /><VTextField
              v-model="form.toLocation"
              label="Observed location"
            /><VTextarea v-model="form.notes" label="Notes" />
          </template>
          <template v-else-if="dialog === 'insurance'">
            <VTextField v-model="form.insurer" label="Insurer" /><VTextField
              v-model="form.policyNumber"
              label="Policy number"
            /><VTextField
              v-model.number="form.coverageMinor"
              type="number"
              label="Coverage (minor unit)"
            /><VTextField
              v-model.number="form.premiumMinor"
              type="number"
              label="Premium (minor unit)"
            /><VTextField
              v-model="form.effectiveDate"
              type="date"
              label="Effective date"
            /><VTextField
              v-model="form.expiryDate"
              type="date"
              label="Expiry date"
            />
          </template>
          <template v-else-if="dialog === 'complete'">
            <VTextarea
              v-model="form.completionResult"
              label="Completion result / evidence reference"
            /><VSelect
              v-model="form.conditionAfter"
              :items="['SERVICEABLE', 'LIMITED', 'UNSERVICEABLE']"
              label="Condition after"
            />
          </template>
          <template v-else-if="dialog === 'parts'">
            <VSelect
              v-model="form.warehouseId"
              :items="warehouseOptions"
              item-title="warehouseName"
              item-value="id"
              label="Inventory warehouse"
            /><VSelect
              v-model="form.partId"
              :items="partOptions"
              item-title="partName"
              item-value="id"
              label="Part"
            /><VTextField
              v-model.number="form.quantity"
              type="number"
              min="1"
              label="Quantity"
            />
          </template>
          <template v-else-if="dialog === 'reconcile'">
            <VSelect
              v-model="form.toStationId"
              :items="stationOptions"
              item-title="label"
              item-value="id"
              label="Confirmed station"
              clearable
            /><VSelect
              v-model="form.toLocationType"
              :items="[
                'STATION',
                'DEPARTMENT',
                'TRANSIT',
                'VENDOR',
                'UNASSIGNED',
                'RETIRED',
                'LOST'
              ]"
              label="Confirmed location type"
            /><VTextField
              v-model="form.toLocation"
              label="Confirmed location"
            /><VSelect
              v-model="form.conditionAfter"
              :items="['SERVICEABLE', 'LIMITED', 'UNDER_MAINTENANCE', 'UNSERVICEABLE']"
              label="Confirmed condition"
            />
          </template>
          <VTextarea
            v-if="['assign', 'move', 'complete', 'parts', 'reconcile'].includes(dialog ?? '')"
            v-model="form.reason"
            label="Reason"
          />
        </VCardText><VCardActions>
          <VSpacer /><VBtn variant="text" @click="dialog = null">Cancel</VBtn><VBtn color="primary" :loading="saving" @click="submitAction">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
