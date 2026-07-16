<script setup lang="ts">
import type { InventoryPartDto, InventoryWarehouseDto } from '#shared/features/inventory';
import type { StationOption } from '#shared/features/operations/stations';
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
    actionError.value = errorMessage(value, 'Warehouse could not be created');
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
    actionError.value = errorMessage(value, 'Reorder rule could not be saved');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Warehouses & Bins">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Add warehouse"
        variant="flat"
        @click="resetWarehouse"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh warehouses"
        variant="text"
        @click="refresh"
      />
    </template>
    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Warehouses could not be loaded.
    </VAlert>

    <VRow>
      <VCol v-for="warehouse in data ?? []" :key="warehouse.id" cols="12" lg="6">
        <VCard border height="100%">
          <VCardTitle class="d-flex align-center">
            <VIcon class="me-2" icon="mdi-warehouse" />
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ warehouse.warehouseCode }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ warehouse.stationCode }} · {{ warehouse.warehouseName }}
              </div>
            </div>
            <VSpacer />
            <DsTooltipIconButton
              v-if="can('inventory.catalog.manage').allowed"
              icon="mdi-bell-cog-outline"
              tooltip="Configure reorder rule"
              variant="text"
              @click="openReorder(warehouse)"
            />
          </VCardTitle>
          <VDivider />
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
        </VCard>
      </VCol>
      <template v-if="pending">
        <VCol v-for="index in 2" :key="index" cols="12" lg="6">
          <VSkeletonLoader type="list-item-three-line@3" />
        </VCol>
      </template>
      <VCol v-if="!pending && !(data?.length ?? 0)" cols="12">
        <VAlert color="info" variant="tonal">
          No warehouses are available in this station scope.
        </VAlert>
      </VCol>
    </VRow>

    <VDialog v-model="dialog" max-width="700" persistent>
      <VCard>
        <VCardTitle>Add warehouse</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="4">
              <VSelect
                v-model="form.stationId"
                item-title="label"
                item-value="id"
                :items="stations ?? []"
                label="Station"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="form.warehouseCode" label="Warehouse code" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="form.warehouseName" label="Warehouse name" variant="outlined" />
            </VCol>
          </VRow>
          <div class="mb-2 d-flex align-center">
            <div class="text-subtitle-2 font-weight-bold">Bins</div>
            <VSpacer /><DsTooltipIconButton
              icon="mdi-plus"
              tooltip="Add bin"
              size="small"
              variant="tonal"
              @click="addBin"
            />
          </div>
          <VRow v-for="(bin, index) in form.bins" :key="index" dense>
            <VCol cols="12" md="3">
              <VTextField v-model="bin.binCode" label="Bin code" variant="outlined" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="bin.binName" label="Bin name" variant="outlined" />
            </VCol>
            <VCol cols="10" md="4">
              <VSelect
                v-model="bin.binType"
                :items="['USABLE', 'QUARANTINE', 'REPAIR', 'TRANSIT']"
                label="Type"
                variant="outlined"
              />
            </VCol>
            <VCol class="d-flex align-center" cols="2" md="1">
              <DsTooltipIconButton
                :disabled="form.bins.length === 1"
                icon="mdi-delete-outline"
                tooltip="Remove bin"
                variant="text"
                @click="form.bins.splice(index, 1)"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer /><VBtn
            :disabled="saving"
            text="Cancel"
            variant="text"
            @click="dialog = false"
          /><VBtn
            :loading="saving"
            prepend-icon="mdi-content-save-outline"
            text="Create warehouse"
            @click="createWarehouse"
          />
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="reorderDialog" max-width="560" persistent>
      <VCard>
        <VCardTitle>Configure reorder rule</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
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
                label="Lead time days"
                min="0"
                type="number"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer /><VBtn
            :disabled="saving"
            text="Cancel"
            variant="text"
            @click="reorderDialog = false"
          /><VBtn
            :loading="saving"
            prepend-icon="mdi-content-save-outline"
            text="Save rule"
            @click="saveReorder"
          />
        </VCardActions>
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
