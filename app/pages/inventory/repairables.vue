<script setup lang="ts">
import type { AircraftOption } from '#shared/features/operations/aircraft';
import type { CurrencyOption } from '#shared/features/finance/currencies';
import type { VendorOption } from '#shared/features/finance/vendors';
import type { InventorySerializedPartDto, InventoryWarehouseDto } from '#shared/features/inventory';
import DocumentPanel from '../../components/documents/DocumentPanel.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

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
  cyclesAtInstall: 0,
  capitalizationCandidate: false,
  workOrderId: '',
  workOrderCategory: 'HEAVY_MAINTENANCE' as 'HEAVY_MAINTENANCE' | 'MAJOR_REPLACEMENT',
  capitalizationThresholdMinor: 1_000_000,
  expectedBenefitMonths: 60,
  technicalAcceptanceStatus: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
  readyForUseDate: ''
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
    cyclesAtInstall: item.cyclesSinceNew,
    capitalizationCandidate: false,
    workOrderId: '',
    workOrderCategory: 'HEAVY_MAINTENANCE',
    capitalizationThresholdMinor: 1_000_000,
    expectedBenefitMonths: 60,
    technicalAcceptanceStatus: 'PENDING',
    readyForUseDate: new Date().toISOString().slice(0, 10)
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
    actionError.value = errorMessage(value, 'Aksi repairable gagal. Perbarui data lalu coba lagi.');
    throw value;
  });
  await Promise.all([refresh(), refreshRepairs()]);
}

function installSelected() {
  const accountingContext = install.capitalizationCandidate
    ? {
        workOrderId: install.workOrderId,
        workOrderCategory: install.workOrderCategory,
        capitalizationCandidate: true,
        capitalizationThresholdMinor: install.capitalizationThresholdMinor,
        expectedBenefitMonths: install.expectedBenefitMonths,
        technicalAcceptanceStatus: install.technicalAcceptanceStatus,
        readyForUseDate: install.readyForUseDate
      }
    : { capitalizationCandidate: false };
  return mutate(`/api/inventory/repairables/${selected.value!.id}/install`, {
    aircraftId: install.aircraftId,
    position: install.position,
    installedAt: new Date(install.installedAt).toISOString(),
    hoursAtInstall: install.hoursAtInstall,
    cyclesAtInstall: install.cyclesAtInstall,
    ...accountingContext
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

function refreshRepairables() {
  return Promise.all([refresh(), refreshRepairs()]);
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
  <InventoryShell title="Lifecycle Repairable & Rotable">
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui repairable"
        variant="text"
        @click="refreshRepairables"
      />
    </template>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ actionError || 'Data repairable tidak dapat dimuat. Perbarui halaman lalu coba lagi.' }}
    </VAlert>
    <VBtnToggle v-model="tab" class="mb-4" color="primary" mandatory variant="outlined">
      <VBtn prepend-icon="mdi-cog-sync-outline" text="Komponen serialized" value="components" />
      <VBtn prepend-icon="mdi-wrench-clock-outline" text="Repair order" value="repairs" />
    </VBtnToggle>

    <template v-if="tab === 'components'">
      <InventoryFilterBar label="Filter komponen repairable">
        <VTextField
          v-model="search"
          clearable
          density="comfortable"
          hide-details
          label="Cari serial, part, atau pesawat"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </InventoryFilterBar>
      <InventoryPanel title="Komponen Serialized">
        <VDataTable
          :headers="[
            { title: 'Komponen', key: 'serialNumber' },
            { title: 'Kondisi', key: 'condition' },
            { title: 'Lokasi', key: 'binCode' },
            { title: 'TSN / CSN', key: 'hoursSinceNew' },
            { title: 'Sertifikat', key: 'certificateReference' },
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
            <InventoryTableActions>
              <DsTooltipIconButton
                icon="mdi-file-certificate-outline"
                tooltip="Sertifikat komponen"
                variant="text"
                @click="documentSerial = item"
              />
              <DsConfirmIconButton
                v-if="can('inventory.repair.manage').allowed && item.condition === 'SERVICEABLE'"
                :action="installSelected"
                :confirm-disabled="!install.aircraftId || !install.position.trim()"
                confirm-icon="mdi-airplane-cog"
                confirm-text="Pasang komponen"
                icon="mdi-airplane-cog"
                max-width="600"
                persistent
                title="Pasang komponen serialized"
                tone="warning"
                tooltip="Pasang ke pesawat"
                variant="text"
                @click="selectInstall(item)"
              >
                <VSelect
                  v-model="install.aircraftId"
                  class="mb-3"
                  item-title="registrationNumber"
                  item-value="id"
                  :items="aircraft ?? []"
                  label="Pesawat"
                  variant="outlined"
                />
                <VTextField
                  v-model="install.position"
                  class="mb-3"
                  label="Posisi"
                  variant="outlined"
                />
                <VTextField
                  v-model="install.installedAt"
                  class="mb-3"
                  label="Waktu pemasangan"
                  type="datetime-local"
                  variant="outlined"
                />
                <VRow density="comfortable">
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
                <VSwitch
                  v-model="install.capitalizationCandidate"
                  color="primary"
                  label="Kandidat kapitalisasi"
                />
                <template v-if="install.capitalizationCandidate">
                  <VTextField
                    v-model="install.workOrderId"
                    class="mb-3"
                    label="Work order"
                    variant="outlined"
                  />
                  <VSelect
                    v-model="install.workOrderCategory"
                    class="mb-3"
                    :items="[
                      { title: 'Heavy maintenance', value: 'HEAVY_MAINTENANCE' },
                      { title: 'Major replacement', value: 'MAJOR_REPLACEMENT' }
                    ]"
                    label="Kategori work order"
                    variant="outlined"
                  />
                  <VSelect
                    v-model="install.technicalAcceptanceStatus"
                    class="mb-3"
                    :items="['PENDING', 'APPROVED', 'REJECTED']"
                    label="Technical acceptance"
                    variant="outlined"
                  />
                  <VRow density="comfortable">
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model.number="install.capitalizationThresholdMinor"
                        label="Ambang kapitalisasi (IDR)"
                        min="0"
                        type="number"
                        variant="outlined"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model.number="install.expectedBenefitMonths"
                        label="Umur manfaat (bulan)"
                        min="1"
                        type="number"
                        variant="outlined"
                      />
                    </VCol>
                  </VRow>
                  <VDateInput
                    v-model="install.readyForUseDate"
                    prepend-icon=""
                    prepend-inner-icon="mdi-calendar"
                    label="Tanggal siap pakai"
                    variant="outlined"
                  />
                </template>
              </DsConfirmIconButton>
              <DsConfirmIconButton
                v-if="can('inventory.repair.manage').allowed && item.condition === 'INSTALLED'"
                :action="removeSelected"
                :confirm-disabled="
                  !removal.quarantineBinId || removal.removalReason.trim().length < 3
                "
                confirm-icon="mdi-airplane-remove"
                confirm-text="Lepas komponen"
                icon="mdi-airplane-remove"
                max-width="600"
                persistent
                title="Lepas komponen serialized"
                tone="danger"
                tooltip="Lepas dari pesawat"
                variant="text"
                @click="selectRemoval(item)"
              >
                <VSelect
                  v-model="removal.quarantineBinId"
                  class="mb-3"
                  :items="quarantineBins"
                  label="Bin karantina"
                  variant="outlined"
                />
                <VTextField
                  v-model="removal.removedAt"
                  class="mb-3"
                  label="Waktu pelepasan"
                  type="datetime-local"
                  variant="outlined"
                />
                <VRow density="comfortable">
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
                  label="Alasan pelepasan"
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
                confirm-text="Buat repair order"
                icon="mdi-wrench-clock-outline"
                max-width="560"
                persistent
                title="Buat repair order"
                tone="warning"
                tooltip="Buat repair order"
                variant="text"
                @click="selectRepair(item)"
              >
                <VSelect
                  v-model="repair.vendorId"
                  class="mb-3"
                  item-title="vendorName"
                  item-value="id"
                  :items="vendors ?? []"
                  label="Vendor repair"
                  variant="outlined"
                />
                <VDateInput
                  v-model="repair.expectedReturnAt"
                  prepend-icon=""
                  prepend-inner-icon="mdi-calendar"
                  class="mb-3"
                  label="Estimasi kembali"
                  variant="outlined"
                />
                <VTextarea
                  v-model="repair.reason"
                  label="Alasan repair"
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
                confirm-text="Scrap komponen"
                icon="mdi-delete-forever-outline"
                max-width="520"
                persistent
                title="Scrap komponen serialized"
                tone="danger"
                tooltip="Scrap komponen"
                variant="text"
                @click="scrapReason = ''"
              >
                <VTextarea v-model="scrapReason" label="Alasan scrap" rows="3" variant="outlined" />
              </DsConfirmIconButton>
            </InventoryTableActions>
          </template>
          <template #no-data>
            <div class="py-10 text-medium-emphasis">Tidak ada komponen serialized yang cocok.</div>
          </template>
        </VDataTable>
      </InventoryPanel>
    </template>

    <InventoryPanel v-else title="Repair Order">
      <VDataTable
        :headers="[
          { title: 'Repair', key: 'repairNumber' },
          { title: 'Komponen', key: 'serialNumber' },
          { title: 'Vendor', key: 'vendorName' },
          { title: 'Estimasi', key: 'expectedReturnAt' },
          { title: 'Biaya', key: 'baseRepairCostIdr', align: 'end' },
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
          {{ can('inventory.valuation.read').allowed ? money(item.baseRepairCostIdr) : 'Terbatas' }}
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.actions`]="{ item }">
          <InventoryTableActions v-if="can('inventory.repair.manage').allowed">
            <DsConfirmIconButton
              v-if="item.status === 'DRAFT'"
              :action="() => mutate(`/api/inventory/repair-orders/${item.id}/send`)"
              confirm-icon="mdi-truck-fast-outline"
              confirm-text="Kirim ke vendor"
              icon="mdi-truck-fast-outline"
              message="Komponen keluar dari stok gudang dan masuk status in-repair."
              title="Kirim komponen untuk repair"
              tone="warning"
              tooltip="Kirim ke vendor repair"
              variant="text"
            />
            <DsConfirmIconButton
              v-if="item.status === 'SENT'"
              :action="() => returnServiceable(item)"
              :confirm-disabled="
                !returned.usableBinId || returned.certificateReference.trim().length < 2
              "
              confirm-icon="mdi-shield-check-outline"
              confirm-text="Kembalikan serviceable"
              icon="mdi-shield-check-outline"
              max-width="600"
              persistent
              title="Kembalikan komponen ke stok serviceable"
              tone="success"
              tooltip="Kembalikan serviceable"
              variant="text"
              @click="selectReturn"
            >
              <VSelect
                v-model="returned.usableBinId"
                class="mb-3"
                :items="usableBins"
                label="Bin usable"
                variant="outlined"
              />
              <VTextField
                v-model="returned.returnedAt"
                class="mb-3"
                label="Waktu kembali"
                type="datetime-local"
                variant="outlined"
              />
              <VTextField
                v-model="returned.certificateReference"
                class="mb-3"
                label="Referensi sertifikat terverifikasi"
                variant="outlined"
              />
              <VRow density="comfortable">
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="returned.currencyId"
                    item-title="currencyCode"
                    item-value="id"
                    :items="currencies ?? []"
                    label="Mata uang"
                    variant="outlined"
                  />
                </VCol><VCol cols="12" md="4">
                  <VTextField
                    v-model.number="returned.sourceRepairCostMinor"
                    label="Biaya repair"
                    min="0"
                    type="number"
                    variant="outlined"
                  />
                </VCol><VCol cols="12" md="4">
                  <VTextField
                    v-model.number="returned.exchangeRateToIdrMicros"
                    label="Kurs ke IDR"
                    min="1"
                    type="number"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </DsConfirmIconButton>
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Belum ada repair order.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog
      :model-value="Boolean(documentSerial)"
      max-width="1100"
      scrollable
      @update:model-value="updateDocumentDialog"
    >
      <VSheet v-if="documentSerial" class="pa-4" rounded="lg">
        <div class="mb-4 d-flex align-center">
          <div>
            <div class="text-h6 font-weight-bold">Sertifikat Komponen</div>
            <div class="text-caption text-medium-emphasis">
              {{ documentSerial.serialNumber }} · {{ documentSerial.partNumber }}
            </div>
          </div>
          <VSpacer />
          <DsTooltipIconButton
            icon="mdi-close"
            tooltip="Tutup sertifikat komponen"
            variant="text"
            @click="documentSerial = null"
          />
        </div>
        <DocumentPanel owner-type="inventory_serial" :owner-id="documentSerial.id" />
      </VSheet>
    </VDialog>
  </InventoryShell>
</template>
