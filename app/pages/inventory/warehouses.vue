<script setup lang="ts">
import type { InventoryPartDto, InventoryWarehouseDto } from '#shared/features/inventory';
import type { StationOption } from '#shared/features/operations/stations';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryEmptyState from '../../features/inventory/InventoryEmptyState.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { errorMessage } = useInventoryUi();
const dialog = ref(false);
const reorderDialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const form = reactive({
  stationId: '',
  warehouseCode: '',
  warehouseName: '',
  bins: [{ binCode: 'USABLE-01', binName: 'Usable Stock', binType: 'USABLE' }]
});
const reorder = reactive({
  warehouseId: '',
  partId: '',
  minimumQuantity: 0,
  reorderPoint: 0,
  maximumQuantity: 0,
  leadTimeDays: 0
});

const { data, pending, error, refresh } = await useAsyncData('inventory-warehouses', () =>
  fetchApi<InventoryWarehouseDto[]>('/api/inventory/warehouses')
);
const { data: stations } = await useAsyncData('inventory-station-options', () =>
  fetchApi<StationOption[]>('/api/master-data/stations/options')
);
const { data: parts } = await useAsyncData('inventory-reorder-parts', () =>
  fetchApi<InventoryPartDto[]>('/api/inventory/parts')
);

const stationItems = computed(() =>
  (stations.value ?? []).map((station) => ({
    ...station,
    label: `${station.stationCode} · ${station.stationName}`
  }))
);

function addBin() {
  form.bins.push({ binCode: '', binName: '', binType: 'USABLE' });
}

function resetWarehouse() {
  Object.assign(form, {
    stationId: '',
    warehouseCode: '',
    warehouseName: '',
    bins: [{ binCode: 'USABLE-01', binName: 'Usable Stock', binType: 'USABLE' }]
  });
  actionError.value = '';
  dialog.value = true;
}

function openReorder(warehouse: InventoryWarehouseDto) {
  Object.assign(reorder, {
    warehouseId: warehouse.id,
    partId: '',
    minimumQuantity: 0,
    reorderPoint: 0,
    maximumQuantity: 0,
    leadTimeDays: 0
  });
  actionError.value = '';
  reorderDialog.value = true;
}

async function createWarehouse() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/warehouses', { method: 'POST', body: form });
    dialog.value = false;
    await refresh();
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Gudang tidak dapat dibuat. Periksa station, kode gudang, dan bin.'
    );
  } finally {
    saving.value = false;
  }
}

async function saveReorder() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/reorder-rules', { method: 'POST', body: reorder });
    reorderDialog.value = false;
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Reorder rule tidak dapat disimpan. Periksa part dan batas stok.'
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Gudang & Bin">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Tambah gudang"
        variant="flat"
        @click="resetWarehouse"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui gudang"
        variant="text"
        @click="() => refresh()"
      />
    </template>
    <VAlert v-if="error" aria-live="polite" class="mb-4" type="error" variant="tonal">
      Gudang tidak dapat dimuat. Perbarui halaman lalu coba lagi.
    </VAlert>

    <VRow>
      <VCol v-for="warehouse in data ?? []" :key="warehouse.id" cols="12" lg="6">
        <InventoryPanel
          height="100%"
          icon="mdi-warehouse"
          :subtitle="`${warehouse.stationCode} · ${warehouse.warehouseName}`"
          :title="warehouse.warehouseCode"
        >
          <template #actions>
            <DsTooltipIconButton
              v-if="can('inventory.catalog.manage').allowed"
              icon="mdi-bell-cog-outline"
              tooltip="Atur reorder rule"
              variant="text"
              @click="openReorder(warehouse)"
            />
          </template>
          <VList density="compact">
            <VListItem
              v-for="bin in warehouse.bins"
              :key="bin.id"
              :subtitle="bin.binName"
              :title="bin.binCode"
            >
              <template #prepend>
                <VIcon
                  :icon="
                    bin.binType === 'USABLE'
                      ? 'mdi-package-variant-closed-check'
                      : 'mdi-package-variant-closed-alert'
                  "
                />
              </template>
              <template #append><DsStatusBadge :value="bin.binType" /></template>
            </VListItem>
          </VList>
        </InventoryPanel>
      </VCol>
      <template v-if="pending">
        <VCol v-for="index in 2" :key="index" cols="12" lg="6">
          <VSkeletonLoader type="list-item-three-line@3" />
        </VCol>
      </template>
      <VCol v-if="!pending && !(data?.length ?? 0)" cols="12">
        <InventoryEmptyState
          description="Gudang akan muncul setelah station scope memiliki warehouse aktif."
          icon="mdi-warehouse-off"
          title="Belum ada gudang dalam scope ini"
        />
      </VCol>
    </VRow>

    <VDialog v-model="dialog" max-width="700" persistent>
      <VCard>
        <VCardTitle>Tambah Gudang</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="4">
              <VSelect
                v-model="form.stationId"
                item-title="label"
                item-value="id"
                :items="stationItems"
                label="Station"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="form.warehouseCode" label="Kode gudang" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="form.warehouseName" label="Nama gudang" variant="outlined" />
            </VCol>
          </VRow>
          <div class="mb-2 d-flex align-center">
            <div class="text-subtitle-2 font-weight-bold">Bin</div>
            <VSpacer /><DsTooltipIconButton
              icon="mdi-plus"
              tooltip="Tambah bin"
              size="small"
              variant="tonal"
              @click="addBin"
            />
          </div>
          <VRow v-for="(bin, index) in form.bins" :key="index" dense>
            <VCol cols="12" md="3">
              <VTextField v-model="bin.binCode" label="Kode bin" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="bin.binName" label="Nama bin" variant="outlined" />
            </VCol>
            <VCol cols="10" md="4">
              <VSelect
                v-model="bin.binType"
                :items="['USABLE', 'QUARANTINE', 'REPAIR', 'TRANSIT']"
                label="Tipe"
                variant="outlined"
              />
            </VCol>
            <VCol class="d-flex align-center" cols="2" md="1">
              <DsTooltipIconButton
                :disabled="form.bins.length === 1"
                icon="mdi-delete-outline"
                tooltip="Hapus bin"
                variant="text"
                @click="form.bins.splice(index, 1)"
              />
            </VCol>
          </VRow>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-text="Buat gudang"
          @cancel="dialog = false"
          @submit="createWarehouse"
        />
      </VCard>
    </VDialog>

    <VDialog v-model="reorderDialog" max-width="560" persistent>
      <VCard>
        <VCardTitle>Atur Reorder Rule</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VSelect
            v-model="reorder.partId"
            class="mb-3"
            item-title="partNumber"
            item-value="id"
            :items="parts ?? []"
            label="Part"
            variant="outlined"
          />
          <VRow dense>
            <VCol cols="12" sm="6">
              <VTextField
                v-model.number="reorder.minimumQuantity"
                label="Minimum"
                min="0"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model.number="reorder.reorderPoint"
                label="Reorder point"
                min="0"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model.number="reorder.maximumQuantity"
                label="Maximum"
                min="0"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model.number="reorder.leadTimeDays"
                label="Lead time hari"
                min="0"
                type="number"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-text="Simpan rule"
          @cancel="reorderDialog = false"
          @submit="saveReorder"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
