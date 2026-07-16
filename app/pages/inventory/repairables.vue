<script setup lang="ts">
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { CurrencyOption } from '#shared/features/finance/currencies';
import type { VendorOption } from '#shared/features/finance/vendors';
import type { InventorySerializedPartDto, InventoryWarehouseDto } from '#shared/features/inventory';
import DocumentPanel from '../../components/documents/DocumentPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

type RepairOrder = {
  id: string;
  repairNumber: string;
  serialId: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  vendorId: string;
  vendorName: string;
  status: string;
  reason: string;
  expectedReturnAt: string | null;
  baseRepairCostIdr: number;
  createdAt: string;
};

const { can } = useAuthorization();
const { money, number, date, errorMessage } = useInventoryUi();
const tab = ref<'components' | 'repairs'>('components');
const search = ref('');
const actionError = ref('');
const selected = ref<InventorySerializedPartDto | null>(null);
const documentSerial = ref<InventorySerializedPartDto | null>(null);
const install = reactive({
  aircraftId: '',
  position: '',
  installedAt: '',
  hoursAtInstall: 0,
  cyclesAtInstall: 0
});
const removal = reactive({
  quarantineBinId: '',
  removedAt: '',
  hoursAtRemove: 0,
  cyclesAtRemove: 0,
  removalReason: ''
});
const repair = reactive({ vendorId: '', reason: '', expectedReturnAt: '' });
const returned = reactive({
  usableBinId: '',
  returnedAt: '',
  certificateReference: '',
  sourceRepairCostMinor: 0,
  currencyId: 'cur-idr',
  exchangeRateToIdrMicros: 1_000_000
});
const scrapReason = ref('');

const { data, pending, error, refresh } = await useAsyncData('inventory-repairables', () =>
  fetchApi<InventorySerializedPartDto[]>('/api/inventory/repairables')
);
const { data: repairs, refresh: refreshRepairs } = await useAsyncData(
  'inventory-repair-orders',
  () => fetchApi<RepairOrder[]>('/api/inventory/repair-orders')
);
const { data: warehouses } = await useAsyncData('inventory-repair-warehouses', () =>
  fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: aircraft } = await useAsyncData('inventory-repair-aircraft', () =>
  fetchApi<AircraftOption[]>('/api/master-data/aircraft/options')
);
const { data: vendors } = await useAsyncData('inventory-repair-vendors', () =>
  fetchApi<VendorOption[]>('/api/master-data/vendors/options')
);
const { data: currencies } = await useAsyncData('inventory-repair-currencies', () =>
  fetchApi<CurrencyOption[]>('/api/master-data/currencies/options')
);

const componentRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((item) =>
    [
      item.serialNumber,
      item.partNumber,
      item.partName,
      item.aircraftRegistration,
      item.condition
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query)
    )
  );
});
const quarantineBins = computed(() =>
  (warehouses.value ?? []).flatMap((warehouse) =>
    warehouse.bins
      .filter((bin) => bin.binType === 'QUARANTINE')
      .map((bin) => ({ title: `${warehouse.warehouseCode} / ${bin.binCode}`, value: bin.id }))
  )
);
const usableBins = computed(() =>
  (warehouses.value ?? []).flatMap((warehouse) =>
    warehouse.bins
      .filter((bin) => bin.binType === 'USABLE')
      .map((bin) => ({ title: `${warehouse.warehouseCode} / ${bin.binCode}`, value: bin.id }))
  )
);

function currentDateTime() {
  return new Date().toISOString().slice(0, 16);
}

function selectInstall(item: InventorySerializedPartDto) {
  selected.value = item;
  Object.assign(install, {
    aircraftId: '',
    position: '',
    installedAt: currentDateTime(),
    hoursAtInstall: item.hoursSinceNew,
    cyclesAtInstall: item.cyclesSinceNew
  });
}

function selectRemoval(item: InventorySerializedPartDto) {
  selected.value = item;
  Object.assign(removal, {
    quarantineBinId: '',
    removedAt: currentDateTime(),
    hoursAtRemove: item.hoursSinceNew,
    cyclesAtRemove: item.cyclesSinceNew,
    removalReason: ''
  });
}

function selectRepair(item: InventorySerializedPartDto) {
  selected.value = item;
  Object.assign(repair, { vendorId: '', reason: '', expectedReturnAt: '' });
}

async function mutate(path: string, body?: unknown) {
  actionError.value = '';
  await fetchApi(path, { method: 'POST', ...(body ? { body } : {}) }).catch((value) => {
    actionError.value = errorMessage(value, 'Repairable action failed');
    throw value;
  });
  await Promise.all([refresh(), refreshRepairs()]);
}

function installSelected() {
  return mutate(`/api/inventory/repairables/${selected.value!.id}/install`, {
    ...install,
    installedAt: new Date(install.installedAt).toISOString()
  });
}

function removeSelected() {
  return mutate(`/api/inventory/repairables/${selected.value!.id}/remove`, {
    ...removal,
    removedAt: new Date(removal.removedAt).toISOString()
  });
}

function createRepair() {
  return mutate('/api/inventory/repair-orders', {
    serialId: selected.value!.id,
    vendorId: repair.vendorId,
    reason: repair.reason,
    expectedReturnAt: repair.expectedReturnAt || null
  });
}

function selectReturn() {
  Object.assign(returned, {
    usableBinId: '',
    returnedAt: currentDateTime(),
    certificateReference: '',
    sourceRepairCostMinor: 0,
    currencyId: 'cur-idr',
    exchangeRateToIdrMicros: 1_000_000
  });
}

function updateDocumentDialog(value: boolean) {
  if (!value) documentSerial.value = null;
}
function returnServiceable(order: RepairOrder) {
  return mutate(`/api/inventory/repair-orders/${order.id}/return-serviceable`, {
    ...returned,
    returnedAt: new Date(returned.returnedAt).toISOString(),
    certificateVerified: true
  });
}
</script>

<template>
  <InventoryShell title="Repairable & Rotable Lifecycle">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh repairables"
        variant="text"
        @click="Promise.all([refresh(), refreshRepairs()])"
      />
    </template>
    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{
        actionError || 'Repairable components could not be loaded.'
      }}
    </VAlert>
    <VBtnToggle v-model="tab" class="mb-4" color="primary" mandatory variant="outlined">
      <VBtn prepend-icon="mdi-cog-sync-outline" text="Serialized components" value="components" />
      <VBtn prepend-icon="mdi-wrench-clock-outline" text="Repair orders" value="repairs" />
    </VBtnToggle>

    <template v-if="tab === 'components'">
      <VTextField
        v-model="search"
        class="mb-4"
        clearable
        density="comfortable"
        hide-details
        label="Search serial, part, or aircraft"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
      <VCard border>
        <VDataTable
          :headers="[
            { title: 'Component', key: 'serialNumber' },
            { title: 'Condition', key: 'condition' },
            { title: 'Location', key: 'binCode' },
            { title: 'TSN / CSN', key: 'hoursSinceNew' },
            { title: 'Certificate', key: 'certificateReference' },
            { title: 'Repair', key: 'repairOrderStatus' },
            { title: '', key: 'actions', sortable: false, align: 'end' }
          ]"
          :items="componentRows"
          :loading="pending"
        >
          <template #[`item.serialNumber`]="{ item }">
            <div class="py-2">
              <div class="font-weight-bold">{{ item.serialNumber }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ item.partNumber }} · {{ item.partName }}
              </div>
            </div>
          </template>
          <template #[`item.condition`]="{ item }">
            <DsStatusBadge :value="item.condition" />
          </template>
          <template #[`item.binCode`]="{ item }">
            <div>{{ item.aircraftRegistration ?? item.binCode ?? '-' }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.position ?? '' }}</div>
          </template>
          <template #[`item.hoursSinceNew`]="{ item }">
            {{ number(item.hoursSinceNew) }} h / {{ number(item.cyclesSinceNew, 0) }} c
          </template>
          <template #[`item.certificateReference`]="{ item }">
            <VIcon
              class="me-1"
              :color="item.certificateVerified ? 'success' : 'error'"
              :icon="
                item.certificateVerified ? 'mdi-shield-check-outline' : 'mdi-shield-alert-outline'
              "
            />{{ item.certificateReference ?? '-' }}
          </template>
          <template #[`item.repairOrderStatus`]="{ item }">
            <DsStatusBadge v-if="item.repairOrderStatus" :value="item.repairOrderStatus" /><span
              v-else
            >-</span>
          </template>
          <template #[`item.actions`]="{ item }">
            <div class="d-flex justify-end ga-1">
              <DsTooltipIconButton
                icon="mdi-file-certificate-outline"
                tooltip="Component certificates"
                variant="text"
                @click="documentSerial = item"
              />
              <DsConfirmIconButton
                v-if="can('inventory.repair.manage').allowed && item.condition === 'SERVICEABLE'"
                :action="installSelected"
                :confirm-disabled="!install.aircraftId || !install.position.trim()"
                confirm-icon="mdi-airplane-cog"
                confirm-text="Install component"
                icon="mdi-airplane-cog"
                max-width="600"
                persistent
                title="Install serialized component"
                tone="warning"
                tooltip="Install to aircraft"
                variant="text"
                @click="selectInstall(item)"
              >
                <VSelect
                  v-model="install.aircraftId"
                  class="mb-3"
                  item-title="registrationNumber"
                  item-value="id"
                  :items="aircraft ?? []"
                  label="Aircraft"
                  variant="outlined"
                />
                <VTextField
                  v-model="install.position"
                  class="mb-3"
                  label="Position"
                  variant="outlined"
                />
                <VTextField
                  v-model="install.installedAt"
                  class="mb-3"
                  label="Installed at"
                  type="datetime-local"
                  variant="outlined"
                />
                <VRow dense>
                  <VCol cols="6">
                    <VTextField
                      v-model.number="install.hoursAtInstall"
                      label="TSN hours"
                      min="0"
                      type="number"
                      variant="outlined"
                    />
                  </VCol><VCol cols="6">
                    <VTextField
                      v-model.number="install.cyclesAtInstall"
                      label="CSN cycles"
                      min="0"
                      type="number"
                      variant="outlined"
                    />
                  </VCol>
                </VRow>
              </DsConfirmIconButton>
              <DsConfirmIconButton
                v-if="can('inventory.repair.manage').allowed && item.condition === 'INSTALLED'"
                :action="removeSelected"
                :confirm-disabled="
                  !removal.quarantineBinId || removal.removalReason.trim().length < 3
                "
                confirm-icon="mdi-airplane-remove"
                confirm-text="Remove component"
                icon="mdi-airplane-remove"
                max-width="600"
                persistent
                title="Remove serialized component"
                tone="danger"
                tooltip="Remove from aircraft"
                variant="text"
                @click="selectRemoval(item)"
              >
                <VSelect
                  v-model="removal.quarantineBinId"
                  class="mb-3"
                  :items="quarantineBins"
                  label="Quarantine bin"
                  variant="outlined"
                />
                <VTextField
                  v-model="removal.removedAt"
                  class="mb-3"
                  label="Removed at"
                  type="datetime-local"
                  variant="outlined"
                />
                <VRow dense>
                  <VCol cols="6">
                    <VTextField
                      v-model.number="removal.hoursAtRemove"
                      label="TSN hours"
                      min="0"
                      type="number"
                      variant="outlined"
                    />
                  </VCol><VCol cols="6">
                    <VTextField
                      v-model.number="removal.cyclesAtRemove"
                      label="CSN cycles"
                      min="0"
                      type="number"
                      variant="outlined"
                    />
                  </VCol>
                </VRow>
                <VTextarea
                  v-model="removal.removalReason"
                  label="Removal reason"
                  rows="2"
                  variant="outlined"
                />
              </DsConfirmIconButton>
              <DsConfirmIconButton
                v-if="
                  can('inventory.repair.manage').allowed &&
                    ['QUARANTINE', 'UNSERVICEABLE'].includes(item.condition) &&
                    !item.repairOrderStatus
                "
                :action="createRepair"
                :confirm-disabled="!repair.vendorId || repair.reason.trim().length < 3"
                confirm-icon="mdi-wrench-clock-outline"
                confirm-text="Create repair order"
                icon="mdi-wrench-clock-outline"
                max-width="560"
                persistent
                title="Create repair order"
                tone="warning"
                tooltip="Create repair order"
                variant="text"
                @click="selectRepair(item)"
              >
                <VSelect
                  v-model="repair.vendorId"
                  class="mb-3"
                  item-title="vendorName"
                  item-value="id"
                  :items="vendors ?? []"
                  label="Repair vendor"
                  variant="outlined"
                />
                <VTextField
                  v-model="repair.expectedReturnAt"
                  class="mb-3"
                  label="Expected return"
                  type="date"
                  variant="outlined"
                />
                <VTextarea
                  v-model="repair.reason"
                  label="Repair reason"
                  rows="2"
                  variant="outlined"
                />
              </DsConfirmIconButton>
              <DsConfirmIconButton
                v-if="
                  can('inventory.repair.manage').allowed &&
                    !['INSTALLED', 'SCRAPPED'].includes(item.condition)
                "
                :action="
                  () =>
                    mutate(`/api/inventory/repairables/${item.id}/scrap`, { reason: scrapReason })
                "
                :confirm-disabled="scrapReason.trim().length < 3"
                confirm-icon="mdi-delete-forever-outline"
                confirm-text="Scrap component"
                icon="mdi-delete-forever-outline"
                max-width="520"
                persistent
                title="Scrap serialized component"
                tone="danger"
                tooltip="Scrap component"
                variant="text"
                @click="scrapReason = ''"
              >
                <VTextarea v-model="scrapReason" label="Scrap reason" rows="3" variant="outlined" />
              </DsConfirmIconButton>
            </div>
          </template>
          <template #no-data>
            <div class="py-10 text-medium-emphasis">No serialized components found.</div>
          </template>
        </VDataTable>
      </VCard>
    </template>

    <VCard v-else border>
      <VDataTable
        :headers="[
          { title: 'Repair', key: 'repairNumber' },
          { title: 'Component', key: 'serialNumber' },
          { title: 'Vendor', key: 'vendorName' },
          { title: 'Expected', key: 'expectedReturnAt' },
          { title: 'Cost', key: 'baseRepairCostIdr', align: 'end' },
          { title: 'Status', key: 'status' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="repairs ?? []"
      >
        <template #[`item.repairNumber`]="{ item }">
          <span class="font-weight-bold">{{ item.repairNumber }}</span>
        </template>
        <template #[`item.serialNumber`]="{ item }">
          <div>{{ item.serialNumber }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.partNumber }}</div>
        </template>
        <template #[`item.expectedReturnAt`]="{ item }">{{ date(item.expectedReturnAt) }}</template>
        <template #[`item.baseRepairCostIdr`]="{ item }">
          {{
            can('inventory.valuation.read').allowed ? money(item.baseRepairCostIdr) : 'Restricted'
          }}
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <div v-if="can('inventory.repair.manage').allowed" class="d-flex justify-end ga-1">
            <DsConfirmIconButton
              v-if="item.status === 'DRAFT'"
              :action="() => mutate(`/api/inventory/repair-orders/${item.id}/send`)"
              confirm-icon="mdi-truck-fast-outline"
              confirm-text="Send to vendor"
              icon="mdi-truck-fast-outline"
              message="The component will leave warehouse stock and enter in-repair status."
              title="Send component for repair"
              tone="warning"
              tooltip="Send to repair vendor"
              variant="text"
            />
            <DsConfirmIconButton
              v-if="item.status === 'SENT'"
              :action="() => returnServiceable(item)"
              :confirm-disabled="
                !returned.usableBinId || returned.certificateReference.trim().length < 2
              "
              confirm-icon="mdi-shield-check-outline"
              confirm-text="Return serviceable"
              icon="mdi-shield-check-outline"
              max-width="600"
              persistent
              title="Return component to service"
              tone="success"
              tooltip="Return serviceable"
              variant="text"
              @click="selectReturn"
            >
              <VSelect
                v-model="returned.usableBinId"
                class="mb-3"
                :items="usableBins"
                label="Usable bin"
                variant="outlined"
              />
              <VTextField
                v-model="returned.returnedAt"
                class="mb-3"
                label="Returned at"
                type="datetime-local"
                variant="outlined"
              />
              <VTextField
                v-model="returned.certificateReference"
                class="mb-3"
                label="Verified certificate reference"
                variant="outlined"
              />
              <VRow dense>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="returned.currencyId"
                    item-title="currencyCode"
                    item-value="id"
                    :items="currencies ?? []"
                    label="Currency"
                    variant="outlined"
                  />
                </VCol><VCol cols="12" md="4">
                  <VTextField
                    v-model.number="returned.sourceRepairCostMinor"
                    label="Repair cost"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol><VCol cols="12" md="4">
                  <VTextField
                    v-model.number="returned.exchangeRateToIdrMicros"
                    label="Rate to IDR"
                    min="1"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </DsConfirmIconButton>
          </div>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">No repair orders found.</div>
        </template>
      </VDataTable>
    </VCard>

    <VDialog
      :model-value="Boolean(documentSerial)"
      max-width="1100"
      scrollable
      @update:model-value="updateDocumentDialog"
    >
      <VSheet v-if="documentSerial" class="pa-4" rounded="lg">
        <div class="mb-4 d-flex align-center">
          <div>
            <div class="text-h6 font-weight-bold">Component Certificates</div>
            <div class="text-caption text-medium-emphasis">
              {{ documentSerial.serialNumber }} · {{ documentSerial.partNumber }}
            </div>
          </div>
          <VSpacer />
          <DsTooltipIconButton
            icon="mdi-close"
            tooltip="Close component certificates"
            variant="text"
            @click="documentSerial = null"
          />
        </div>
        <DocumentPanel owner-type="inventory_serial" :owner-id="documentSerial.id" />
      </VSheet>
    </VDialog>
  </InventoryShell>
</template>
