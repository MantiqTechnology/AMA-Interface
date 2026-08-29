<script setup lang="ts">
import type { InventoryPartDto, PurchaseRequestDto } from '#shared/features/inventory';
import type { StationOption } from '#shared/features/operations/stations';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { can } = useAuthorization();
const { number, date, errorMessage } = useInventoryUi();
const dialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const search = ref('');
const form = reactive({
  stationId: '',
  requestReason: '',
  lines: [{ partId: '', quantity: 1, requiredAt: new Date().toISOString().slice(0, 10), note: '' }]
});

const { data, pending, error, refresh } = await useAsyncData('inventory-purchase-requests', () =>
  fetchApi<PurchaseRequestDto[]>('/api/inventory/purchase-requests')
);
const { data: parts } = await useAsyncData('inventory-pr-parts', () =>
  fetchApi<InventoryPartDto[]>('/api/inventory/parts')
);
const { data: stations } = await useAsyncData('inventory-pr-stations', () =>
  fetchApi<StationOption[]>('/api/master-data/stations/options')
);

const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((item) =>
    [item.requestNumber, item.stationCode, item.requestReason, item.status].some((value) =>
      value.toLowerCase().includes(query)
    )
  );
});

function openCreate() {
  Object.assign(form, {
    stationId: '',
    requestReason: '',
    lines: [
      { partId: '', quantity: 1, requiredAt: new Date().toISOString().slice(0, 10), note: '' }
    ]
  });
  actionError.value = '';
  dialog.value = true;
}

function addLine() {
  form.lines.push({
    partId: '',
    quantity: 1,
    requiredAt: new Date().toISOString().slice(0, 10),
    note: ''
  });
}

async function createRequest() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi('/api/inventory/purchase-requests', { method: 'POST', body: form });
    dialog.value = false;
    await refresh();
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Permintaan pembelian tidak dapat dibuat. Periksa station dan line part.'
    );
  } finally {
    saving.value = false;
  }
}

async function submitRequest(id: string) {
  actionError.value = '';
  await fetchApi(`/api/inventory/purchase-requests/${id}/submit`, { method: 'POST' }).catch(
    (value) => {
      actionError.value = errorMessage(
        value,
        'Permintaan pembelian tidak dapat diajukan. Perbarui data lalu coba lagi.'
      );
      throw value;
    }
  );
  await refresh();
}
</script>

<template>
  <InventoryShell title="Permintaan Pembelian">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.procurement.request').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Buat permintaan pembelian"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui permintaan pembelian"
        variant="text"
        @click="() => refresh()"
      />
    </template>
    <VAlert
      v-if="error || actionError"
      aria-live="polite"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{
        actionError || 'Permintaan pembelian tidak dapat dimuat. Perbarui halaman lalu coba lagi.'
      }}
    </VAlert>
    <InventoryFilterBar label="Filter permintaan pembelian">
      <VTextField
        v-model="search"
        clearable
        density="comfortable"
        hide-details
        label="Cari permintaan pembelian"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
    </InventoryFilterBar>
    <InventoryPanel title="Daftar Permintaan Pembelian">
      <VDataTable
        :headers="[
          { title: 'Permintaan', key: 'requestNumber' },
          { title: 'Station', key: 'stationCode' },
          { title: 'Alasan', key: 'requestReason' },
          { title: 'Lines', key: 'lines', sortable: false },
          { title: 'Status', key: 'status' },
          { title: 'Dibuat', key: 'createdAt' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="rows"
        :loading="pending"
      >
        <template #[`item.requestNumber`]="{ item }">
          <span class="font-weight-bold text-no-wrap">{{ item.requestNumber }}</span>
        </template>
        <template #[`item.lines`]="{ item }">
          <div v-for="line in item.lines" :key="line.id" class="text-no-wrap text-caption">
            {{ line.partNumber }} · {{ number(line.quantity) }} · {{ date(line.requiredAt) }}
          </div>
        </template>
        <template #[`item.status`]="{ item }"><DsStatusBadge :value="item.status" /></template>
        <template #[`item.createdAt`]="{ item }">{{ date(item.createdAt) }}</template>
        <template #[`item.actions`]="{ item }">
          <InventoryTableActions>
            <DsConfirmIconButton
              v-if="can('inventory.procurement.request').allowed && item.status === 'DRAFT'"
              :action="() => submitRequest(item.id)"
              confirm-icon="mdi-send-outline"
              confirm-text="Ajukan permintaan"
              icon="mdi-send-outline"
              message="Permintaan ini akan tersedia untuk konversi purchase order."
              title="Ajukan permintaan pembelian"
              tone="warning"
              tooltip="Ajukan permintaan"
              variant="text"
            />
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Tidak ada permintaan pembelian yang cocok.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog v-model="dialog" max-width="800" persistent>
      <VCard>
        <VCardTitle>Buat Permintaan Pembelian</VCardTitle><VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VSelect
            v-model="form.stationId"
            class="mb-3"
            item-title="stationCode"
            item-value="id"
            :items="stations ?? []"
            label="Station"
            variant="outlined"
          />
          <VTextarea
            v-model="form.requestReason"
            class="mb-3"
            label="Alasan permintaan"
            rows="2"
            variant="outlined"
          />
          <div class="mb-2 d-flex align-center">
            <div class="text-subtitle-2 font-weight-bold">Part Diminta</div>
            <VSpacer /><DsTooltipIconButton
              icon="mdi-plus"
              tooltip="Tambah line part"
              size="small"
              variant="tonal"
              @click="addLine"
            />
          </div>
          <VRow v-for="(line, index) in form.lines" :key="index" dense>
            <VCol cols="12" md="4">
              <VSelect
                v-model="line.partId"
                item-title="partNumber"
                item-value="id"
                :items="parts ?? []"
                label="Part"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6" md="2">
              <VTextField
                v-model.number="line.quantity"
                label="Jumlah"
                min="1"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6" md="3">
              <VDateInput
                v-model="line.requiredAt"
                prepend-icon=""
                prepend-inner-icon="mdi-calendar"
                label="Tanggal dibutuhkan"
                variant="outlined"
              />
            </VCol>
            <VCol cols="10" md="2">
              <VTextField v-model="line.note" label="Catatan" variant="outlined" />
            </VCol>
            <VCol class="d-flex align-center" cols="2" md="1">
              <DsTooltipIconButton
                :disabled="form.lines.length === 1"
                icon="mdi-delete-outline"
                tooltip="Hapus line"
                variant="text"
                @click="form.lines.splice(index, 1)"
              />
            </VCol>
          </VRow>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-text="Buat permintaan"
          @cancel="dialog = false"
          @submit="createRequest"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>
