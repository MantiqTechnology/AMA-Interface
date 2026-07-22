<script setup lang="ts">
import type { FlightMaintenanceHandoffDto } from '#shared/contracts/flight-operations';
import type {
  InventorySerializedPartDto,
  InventoryStockDto,
  InventoryWarehouseDto,
  MaintenancePartIssueDto
} from '#shared/features/inventory';
import type { StationOption } from '#shared/features/operations/stations';

const route = useRoute();
const loadingId = ref('');
const actionError = ref('');
const selectedId = ref<string | null>(null);
const issueDialog = ref(false);
const issueSaving = ref(false);
const issueForm = reactive({
  warehouseId: '',
  maintenanceCategory: 'ROUTINE' as
    'ROUTINE' | 'MINOR_REPAIR' | 'HEAVY_MAINTENANCE' | 'MAJOR_REPLACEMENT',
  reason: '',
  lines: [{ partId: '', quantity: 1, serialIds: [] as string[], note: '' }]
});
const filters = reactive({
  search: typeof route.query.search === 'string' ? route.query.search : '',
  date: '',
  stationId: '',
  serviceability: '',
  status: ''
});

watch(
  () => route.query.search,
  (search) => {
    filters.search = typeof search === 'string' ? search : '';
  }
);

const { can } = useAuthorization();
const canApprove = computed(() => can('maintenance.handoff.update').allowed);

const { data, pending, error, refresh } = await useAsyncData('flight-maintenance-handoffs', () =>
  fetchApi<FlightMaintenanceHandoffDto[]>('/api/flight-operations/maintenance')
);

const { data: stationOptions } = await useAsyncData('maintenance-station-options', () =>
  fetchApi<StationOption[]>('/api/master-data/stations/options')
);
const { data: issuedParts, refresh: refreshIssuedParts } = await useAsyncData(
  'maintenance-inventory-issues',
  () => fetchApi<MaintenancePartIssueDto[]>('/api/inventory/maintenance-issues')
);
const { data: inventoryStock, refresh: refreshInventoryStock } = await useAsyncData(
  'maintenance-inventory-stock',
  () => fetchApi<InventoryStockDto[]>('/api/inventory/stock')
);
const { data: inventoryWarehouses } = await useAsyncData('maintenance-inventory-warehouses', () =>
  fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: inventorySerialized, refresh: refreshInventorySerialized } = await useAsyncData(
  'maintenance-inventory-serialized',
  () => fetchApi<InventorySerializedPartDto[]>('/api/inventory/repairables')
);

const records = computed(() => data.value ?? []);
const selectedRecord = computed(
  () => records.value.find((record) => record.id === selectedId.value) ?? null
);
const drawerOpen = computed({
  get: () => selectedRecord.value !== null,
  set: (value: boolean) => {
    if (!value) selectedId.value = null;
  }
});
const selectedIssues = computed(() =>
  (issuedParts.value ?? []).filter(
    (issue) => issue.maintenanceHandoffId === selectedRecord.value?.id
  )
);
const selectedPartsValue = computed(() =>
  selectedIssues.value
    .filter((issue) => issue.status === 'ISSUED')
    .reduce((total, issue) => total + (issue.totalPartsValueIdr ?? 0), 0)
);
const issuePartOptions = computed(() => {
  const options = (inventoryStock.value ?? [])
    .filter((stock) => stock.warehouseId === issueForm.warehouseId && stock.availableQuantity > 0)
    .map(
      (stock) =>
        [
          stock.partId,
          { title: `${stock.partNumber} · ${stock.partName}`, value: stock.partId }
        ] as const
    );
  return [...new Map(options).values()];
});
const warehouseBinIds = computed(
  () =>
    new Set(
      (inventoryWarehouses.value ?? [])
        .find((warehouse) => warehouse.id === issueForm.warehouseId)
        ?.bins.map((bin) => bin.id) ?? []
    )
);

function partTracking(partId: string) {
  return (inventoryStock.value ?? []).find((stock) => stock.partId === partId)?.trackingType;
}

function serialOptions(partId: string) {
  return (inventorySerialized.value ?? [])
    .filter(
      (serial) =>
        serial.partId === partId &&
        serial.condition === 'SERVICEABLE' &&
        Boolean(serial.binId && warehouseBinIds.value.has(serial.binId))
    )
    .map((serial) => ({ title: serial.serialNumber, value: serial.id }));
}

const serviceabilityOptions = computed(() =>
  [...new Set(records.value.map((record) => record.serviceabilityStatus))].sort()
);
const statusOptions = computed(() =>
  [...new Set(records.value.map((record) => record.status))].sort()
);

const filteredRecords = computed(() => {
  const search = filters.search.trim().toLowerCase();
  return records.value.filter((record) => {
    const matchesSearch =
      !search ||
      [record.flightNumber, record.aircraftRegistration, record.routeCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    const matchesDate = !filters.date || record.flightDate === filters.date;
    const matchesStation =
      !filters.stationId ||
      record.originStationId === filters.stationId ||
      record.destinationStationId === filters.stationId;
    const matchesServiceability =
      !filters.serviceability || record.serviceabilityStatus === filters.serviceability;
    const matchesStatus = !filters.status || record.status === filters.status;
    return matchesSearch && matchesDate && matchesStation && matchesServiceability && matchesStatus;
  });
});

const summary = computed(() => {
  const rows = filteredRecords.value;
  const approvedRows = rows.filter((row) => ['APPROVED', 'POSTED'].includes(row.status));
  const currencies = [...new Set(approvedRows.map((row) => row.currencyCode))];
  const maintenanceCost = approvedRows.reduce((total, row) => total + row.maintenanceCost, 0);
  return {
    closureReady: rows.filter((row) => row.closureReady).length,
    needsAttention: rows.filter((row) => row.needsAttention).length,
    pendingApproval: rows.filter((row) => row.pendingApproval).length,
    maintenanceCost:
      currencies.length <= 1 ? money(maintenanceCost, currencies[0] ?? 'IDR') : 'Mixed currencies'
  };
});

function money(value: number | null, currency = 'IDR') {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function display(value: string | null) {
  return value ? value.replaceAll('_', ' ') : '-';
}

function serviceabilityColor(status: string) {
  if (status === 'SERVICEABLE') return 'success';
  if (status === 'SERVICEABLE_WITH_RESTRICTIONS') return 'warning';
  if (status === 'UNSERVICEABLE' || status === 'MAINTENANCE_DUE') return 'error';
  return 'secondary';
}

function maintenanceStatusColor(status: FlightMaintenanceHandoffDto['status']) {
  if (status === 'APPROVED' || status === 'POSTED') return 'success';
  if (status === 'DRAFT' || status === 'SUBMITTED') return 'warning';
  return status === 'REJECTED' ? 'error' : 'secondary';
}

function evidenceLabel(record: FlightMaintenanceHandoffDto) {
  if (record.evidenceComplete) return 'Complete';
  return `${record.blockers.length} issue${record.blockers.length === 1 ? '' : 's'}`;
}

function canApproveRecord(record: FlightMaintenanceHandoffDto) {
  return canApprove.value && !['APPROVED', 'POSTED', 'REJECTED'].includes(record.status);
}

function resetFilters() {
  filters.search = '';
  filters.date = '';
  filters.stationId = '';
  filters.serviceability = '';
  filters.status = '';
}

async function approve(row: FlightMaintenanceHandoffDto) {
  loadingId.value = row.id;
  actionError.value = '';
  try {
    await fetchApi(`/api/flight-operations/maintenance/${row.id}/actions/approve`, {
      method: 'POST'
    });
    await refresh();
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Maintenance approval failed';
  } finally {
    loadingId.value = '';
  }
}

function openIssueDialog() {
  Object.assign(issueForm, {
    warehouseId: '',
    maintenanceCategory: 'ROUTINE',
    reason: '',
    lines: [{ partId: '', quantity: 1, serialIds: [], note: '' }]
  });
  actionError.value = '';
  issueDialog.value = true;
}

function addIssueLine() {
  issueForm.lines.push({ partId: '', quantity: 1, serialIds: [], note: '' });
}

async function issueParts() {
  if (!selectedRecord.value) return;
  issueSaving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/maintenance-issues', {
      method: 'POST',
      body: {
        maintenanceHandoffId: selectedRecord.value.id,
        maintenanceCategory: issueForm.maintenanceCategory,
        aircraftId: selectedRecord.value.aircraftId,
        flightId: selectedRecord.value.flightId,
        warehouseId: issueForm.warehouseId,
        reason: issueForm.reason,
        lines: issueForm.lines
      }
    });
    issueDialog.value = false;
    await Promise.all([
      refreshIssuedParts(),
      refreshInventoryStock(),
      refreshInventorySerialized()
    ]);
  } catch (errorValue) {
    actionError.value =
      errorValue instanceof Error ? errorValue.message : 'Maintenance part issue failed';
  } finally {
    issueSaving.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">
          Flight Control / Maintenance Handoff
        </div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Maintenance Handoff</h1>
        <p class="text-text-muted">
          Review aircraft serviceability, closure evidence, and maintenance cost before flight
          closure.
        </p>
      </div>
      <VSpacer />
      <DsTooltipIconButton
        aria-label="Refresh maintenance handoffs"
        icon="mdi-refresh"
        tooltip="Refresh maintenance handoffs"
        variant="text"
        @click="refresh"
      />
    </div>

    <VAlert class="mb-4" color="info" icon="mdi-information-outline" variant="tonal">
      Closure requires an approved maintenance handoff. Unserviceable aircraft or maintenance due
      before departure will fail readiness.
    </VAlert>
    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Unable to load maintenance handoffs.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <VRow class="mb-4">
      <VCol cols="12" md="3" sm="6">
        <DsStatCard label="Closure Ready" :value="summary.closureReady" tone="success" />
      </VCol>
      <VCol cols="12" md="3" sm="6">
        <DsStatCard label="Needs Attention" :value="summary.needsAttention" tone="danger" />
      </VCol>
      <VCol cols="12" md="3" sm="6">
        <DsStatCard label="Pending Approval" :value="summary.pendingApproval" tone="warning" />
      </VCol>
      <VCol cols="12" md="3" sm="6">
        <DsStatCard label="Maintenance Cost" :value="summary.maintenanceCost" tone="info" />
      </VCol>
    </VRow>

    <VCard border class="mb-4">
      <VCardText>
        <VRow density="comfortable">
          <VCol cols="12" md="3">
            <VTextField
              v-model="filters.search"
              clearable
              density="comfortable"
              label="Search flight or aircraft"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model="filters.date"
              clearable
              density="comfortable"
              label="Date"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="filters.stationId"
              clearable
              density="comfortable"
              item-title="stationCode"
              item-value="id"
              :items="stationOptions ?? []"
              label="Station"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="filters.serviceability"
              clearable
              density="comfortable"
              :items="serviceabilityOptions"
              label="Serviceability"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSelect
              v-model="filters.status"
              clearable
              density="comfortable"
              :items="statusOptions"
              label="Handoff status"
              variant="outlined"
            />
          </VCol>
          <VCol class="d-flex align-center" cols="12" md="1">
            <VBtn
              block
              prepend-icon="mdi-filter-remove-outline"
              variant="tonal"
              @click="resetFilters"
            >
              Reset
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard border>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="mdi-wrench-clock" />
        Flight Maintenance Queue
      </VCardTitle>
      <VDivider />
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight / Route</th>
            <th>Scheduled</th>
            <th>Aircraft</th>
            <th>Serviceability</th>
            <th>Maintenance Due</th>
            <th>Evidence</th>
            <th>Cost</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="9" class="py-6 text-center text-text-secondary">
              Loading maintenance handoffs...
            </td>
          </tr>
          <tr v-else-if="filteredRecords.length === 0">
            <td colspan="9" class="py-6 text-center text-text-secondary">
              No maintenance handoff found.
            </td>
          </tr>
          <tr
            v-for="row in filteredRecords"
            v-else
            :key="row.id"
            class="cursor-pointer"
            @click="selectedId = row.id"
          >
            <td>
              <strong>{{ row.flightNumber ?? '-' }}</strong>
              <div class="text-xs text-medium-emphasis">
                {{ row.routeCode ?? '-' }} · {{ row.originStationCode ?? '-' }} to
                {{ row.destinationStationCode ?? '-' }}
              </div>
            </td>
            <td>{{ formatDateTime(row.scheduledDepartureAt) }}</td>
            <td>
              <strong>{{ row.aircraftRegistration }}</strong>
              <div class="text-xs text-medium-emphasis">{{ row.aircraftType }}</div>
            </td>
            <td>
              <VChip
                class="text-capitalize"
                :color="serviceabilityColor(row.serviceabilityStatus)"
                size="small"
                variant="tonal"
              >
                {{ display(row.serviceabilityStatus) }}
              </VChip>
            </td>
            <td>{{ row.aircraftNextMaintenanceDueAt ?? '-' }}</td>
            <td>
              <VChip
                :color="row.evidenceComplete ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ evidenceLabel(row) }}
              </VChip>
            </td>
            <td>{{ money(row.maintenanceCost, row.currencyCode) }}</td>
            <td>
              <VChip :color="maintenanceStatusColor(row.status)" size="small" variant="tonal">
                {{ display(row.status) }}
              </VChip>
            </td>
            <td class="text-right" @click.stop>
              <DsTooltipIconButton
                v-if="row.flightId"
                class="mr-1"
                density="comfortable"
                icon="mdi-open-in-new"
                :aria-label="`View flight ${row.flightNumber ?? ''}`"
                :to="`/flights/${row.flightId}`"
                tooltip="View flight"
                variant="text"
              />
              <DsConfirmIconButton
                v-if="canApproveRecord(row)"
                :action="() => approve(row)"
                color="success"
                confirm-icon="mdi-check-decagram-outline"
                confirm-text="Approve"
                density="comfortable"
                icon="mdi-check-decagram-outline"
                :aria-label="`Approve maintenance handoff for ${row.flightNumber ?? row.aircraftRegistration}`"
                :loading="loadingId === row.id"
                :message="`Approve maintenance handoff for ${row.flightNumber ?? row.aircraftRegistration}.`"
                title="Approve maintenance handoff?"
                tone="success"
                tooltip="Approve maintenance handoff"
                variant="tonal"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <VNavigationDrawer v-model="drawerOpen" location="right" temporary width="460">
      <template v-if="selectedRecord">
        <div class="pa-4">
          <div class="d-flex align-center gap-2">
            <VIcon icon="mdi-wrench-clock" />
            <div>
              <h2 class="text-h6 font-weight-bold">{{ selectedRecord.flightNumber ?? '-' }}</h2>
              <div class="text-caption text-medium-emphasis">
                {{ selectedRecord.aircraftRegistration }} · {{ selectedRecord.routeCode ?? '-' }}
              </div>
            </div>
            <VSpacer />
            <VBtn
              icon="mdi-close"
              variant="text"
              aria-label="Close maintenance details"
              @click="drawerOpen = false"
            />
          </div>
        </div>
        <VDivider />
        <div class="pa-4 space-y-4">
          <VAlert
            :color="selectedRecord.closureReady ? 'success' : 'warning'"
            :icon="selectedRecord.closureReady ? 'mdi-check-circle-outline' : 'mdi-alert-outline'"
            variant="tonal"
          >
            {{
              selectedRecord.closureReady
                ? 'Maintenance evidence is ready for closure.'
                : 'Maintenance evidence needs attention before closure.'
            }}
          </VAlert>

          <VList density="compact">
            <VListSubheader>Evidence checklist</VListSubheader>
            <VListItem
              title="Serviceability reviewed"
              :subtitle="display(selectedRecord.serviceabilityStatus)"
            >
              <template #prepend>
                <VIcon
                  :color="serviceabilityColor(selectedRecord.serviceabilityStatus)"
                  icon="mdi-airplane-check"
                />
              </template>
            </VListItem>
            <VListItem
              title="Work order attached"
              :subtitle="selectedRecord.workOrderReference ?? 'Missing'"
            >
              <template #prepend>
                <VIcon
                  :color="selectedRecord.workOrderReference ? 'success' : 'warning'"
                  icon="mdi-file-document-check-outline"
                />
              </template>
            </VListItem>
            <VListItem title="Maintenance approval" :subtitle="display(selectedRecord.status)">
              <template #prepend>
                <VIcon
                  :color="
                    ['APPROVED', 'POSTED'].includes(selectedRecord.status) ? 'success' : 'warning'
                  "
                  icon="mdi-check-decagram-outline"
                />
              </template>
            </VListItem>
          </VList>

          <VCard border>
            <VCardTitle>Blockers & Attention</VCardTitle>
            <VDivider />
            <VList
              v-if="selectedRecord.blockers.length || selectedRecord.attentionReasons.length"
              density="compact"
            >
              <VListItem v-for="blocker in selectedRecord.blockers" :key="blocker" :title="blocker">
                <template #prepend>
                  <VIcon color="error" icon="mdi-alert-circle-outline" />
                </template>
              </VListItem>
              <VListItem
                v-for="reason in selectedRecord.attentionReasons"
                :key="reason"
                :title="reason"
              >
                <template #prepend>
                  <VIcon color="warning" icon="mdi-alert-outline" />
                </template>
              </VListItem>
            </VList>
            <VCardText v-else class="text-success">No maintenance blockers.</VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="maintenance-section-title">Maintenance Notes</VCardTitle>
            <VDivider />
            <VCardText>
              <dl class="detail-list">
                <dt>Recorded assessment</dt>
                <dd>{{ display(selectedRecord.handoffServiceabilityStatus) }}</dd>
                <dt>Work order</dt>
                <dd>{{ selectedRecord.workOrderReference ?? '-' }}</dd>
                <dt>Spare part</dt>
                <dd>{{ selectedRecord.sparePartReference ?? '-' }}</dd>
                <dt>Maintenance note</dt>
                <dd>{{ selectedRecord.maintenanceNote ?? '-' }}</dd>
              </dl>
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="maintenance-section-title d-flex align-center">
              Issued Spare Parts
              <VSpacer />
              <DsTooltipIconButton
                v-if="can('inventory.issue').allowed"
                icon="mdi-package-up"
                tooltip="Issue spare parts"
                variant="text"
                @click="openIssueDialog"
              />
            </VCardTitle>
            <VDivider />
            <VCardText>
              <VAlert
                v-if="selectedRecord.sparePartReference"
                class="mb-3"
                color="info"
                density="compact"
                variant="tonal"
              >
                Legacy reference: {{ selectedRecord.sparePartReference }}
              </VAlert>
              <div v-for="issue in selectedIssues" :key="issue.id" class="mb-3">
                <div class="mb-1 d-flex align-center">
                  <strong>{{ issue.issueNumber }}</strong>
                  <VSpacer />
                  <DsStatusBadge :value="issue.status" />
                </div>
                <div v-for="line in issue.lines" :key="line.id" class="text-body-2">
                  {{ line.partNumber }} · {{ line.quantity }}
                  <span v-if="line.serialNumbers.length">
                    · {{ line.serialNumbers.join(', ') }}</span>
                </div>
              </div>
              <div v-if="!selectedIssues.length" class="text-body-2 text-medium-emphasis">
                No inventory issue posted.
              </div>
              <VDivider class="my-3" />
              <div class="d-flex align-center font-weight-bold">
                <span>Calculated parts value</span>
                <VSpacer />
                <span>{{ money(selectedPartsValue, 'IDR') }}</span>
              </div>
              <div class="mt-1 text-caption text-medium-emphasis">
                Inventory valuation only; excluded from recorded maintenance cost.
              </div>
            </VCardText>
          </VCard>

          <VCard border>
            <VCardTitle class="maintenance-section-title">Finance Impact</VCardTitle>
            <VDivider />
            <VCardText>
              <VAlert
                v-if="selectedRecord.financeCurrencyMismatch"
                class="mb-3"
                color="warning"
                density="compact"
                variant="tonal"
              >
                Operational costs use mixed currencies. Totals are unavailable until corrected.
              </VAlert>
              <dl class="detail-list">
                <dt>Fuel cost</dt>
                <dd>{{ money(selectedRecord.fuelCost, selectedRecord.financeCurrencyCode) }}</dd>
                <dt>Station cost</dt>
                <dd>{{ money(selectedRecord.stationCost, selectedRecord.financeCurrencyCode) }}</dd>
                <dt>Approved maintenance cost</dt>
                <dd>
                  {{
                    money(
                      selectedRecord.approvedMaintenanceCost,
                      selectedRecord.financeCurrencyCode
                    )
                  }}
                </dd>
                <dt>Total operational cost</dt>
                <dd>
                  {{
                    money(selectedRecord.totalOperationalCost, selectedRecord.financeCurrencyCode)
                  }}
                </dd>
                <dt>Projected gross margin</dt>
                <dd>
                  {{
                    money(selectedRecord.projectedGrossMargin, selectedRecord.financeCurrencyCode)
                  }}
                </dd>
              </dl>
            </VCardText>
          </VCard>

          <div class="d-flex gap-2">
            <VBtn
              v-if="selectedRecord.flightId"
              append-icon="mdi-open-in-new"
              :to="`/flights/${selectedRecord.flightId}`"
              variant="tonal"
            >
              View flight
            </VBtn>
            <DsConfirmIconButton
              v-if="canApproveRecord(selectedRecord)"
              :action="() => approve(selectedRecord)"
              aria-label="Review and approve maintenance handoff"
              color="success"
              confirm-icon="mdi-check-decagram-outline"
              confirm-text="Approve"
              icon="mdi-check-decagram-outline"
              :loading="loadingId === selectedRecord.id"
              :message="`Approve maintenance handoff for ${selectedRecord.flightNumber ?? selectedRecord.aircraftRegistration}.`"
              title="Approve maintenance handoff?"
              tone="success"
              tooltip="Review and approve"
              variant="flat"
            />
          </div>
        </div>
      </template>
    </VNavigationDrawer>

    <VDialog v-model="issueDialog" max-width="760" persistent scrollable>
      <VCard>
        <VCardTitle>Issue maintenance parts</VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VSelect
            v-model="issueForm.warehouseId"
            class="mb-3"
            item-title="warehouseCode"
            item-value="id"
            :items="inventoryWarehouses ?? []"
            label="Issue warehouse"
            variant="outlined"
          />
          <VSelect
            v-model="issueForm.maintenanceCategory"
            class="mb-3"
            :items="[
              { title: 'Routine maintenance', value: 'ROUTINE' },
              { title: 'Minor maintenance', value: 'MINOR_REPAIR' },
              { title: 'Heavy maintenance', value: 'HEAVY_MAINTENANCE' },
              { title: 'Major replacement', value: 'MAJOR_REPLACEMENT' }
            ]"
            label="Maintenance category"
            variant="outlined"
          />
          <VTextarea
            v-model="issueForm.reason"
            class="mb-3"
            label="Issue reason"
            rows="2"
            variant="outlined"
          />
          <div class="mb-2 d-flex align-center">
            <div class="text-subtitle-2 font-weight-bold">Parts</div>
            <VSpacer />
            <DsTooltipIconButton
              icon="mdi-plus"
              tooltip="Add issue line"
              size="small"
              variant="tonal"
              @click="addIssueLine"
            />
          </div>
          <VRow v-for="(line, index) in issueForm.lines" :key="index" dense>
            <VCol cols="12" md="5">
              <VSelect
                v-model="line.partId"
                :items="issuePartOptions"
                label="Part"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6" md="2">
              <VTextField
                v-model.number="line.quantity"
                label="Quantity"
                min="1"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="10" md="4">
              <VSelect
                v-if="partTracking(line.partId) === 'SERIAL'"
                v-model="line.serialIds"
                chips
                :items="serialOptions(line.partId)"
                label="Serial numbers"
                multiple
                variant="outlined"
              />
              <VTextField v-else v-model="line.note" label="Note" variant="outlined" />
            </VCol>
            <VCol class="d-flex align-center" cols="2" md="1">
              <DsTooltipIconButton
                :disabled="issueForm.lines.length === 1"
                icon="mdi-delete-outline"
                tooltip="Remove issue line"
                variant="text"
                @click="issueForm.lines.splice(index, 1)"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn :disabled="issueSaving" text="Cancel" variant="text" @click="issueDialog = false" />
          <VBtn
            :loading="issueSaving"
            prepend-icon="mdi-package-up"
            text="Issue parts"
            @click="issueParts"
          />
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.detail-list {
  display: grid;
  grid-template-columns: minmax(120px, 0.7fr) minmax(0, 1.3fr);
  gap: 10px 16px;
}

.detail-list dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.82rem;
}

.detail-list dd {
  color: rgb(var(--v-theme-text-primary));
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.maintenance-section-title {
  color: rgb(var(--v-theme-text-primary));
}
</style>
