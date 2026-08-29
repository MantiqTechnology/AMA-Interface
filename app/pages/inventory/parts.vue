<script setup lang="ts">
import type { InventoryPartDto, InventoryPartInput } from '#shared/features/inventory';
import DocumentPanel from '../../components/documents/DocumentPanel.vue';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const { can } = useAuthorization();
const { number, date, errorMessage } = useInventoryUi();
const search = ref('');
const dialog = ref(false);
const saving = ref(false);
const actionError = ref('');
const editingId = ref<string | null>(null);
const documentPart = ref<InventoryPartDto | null>(null);

const blankForm = (): InventoryPartInput => ({
  partNumber: '',
  partName: '',
  description: null,
  manufacturer: '',
  manufacturerPartNumber: null,
  unitOfMeasure: 'EA',
  lifecycleType: 'CONSUMABLE',
  trackingType: 'QUANTITY',
  criticality: 'STANDARD',
  certificateRequired: false,
  shelfLifeDays: null,
  partCategory: 'CONSUMABLE',
  isAircraftPart: true,
  isLifeLimited: false,
  maxFlightHours: null,
  maxFlightCycles: null,
  onCondition: false,
  aircraftApplicability: []
});
const form = reactive<InventoryPartInput>(blankForm());
const applicability = reactive({ aircraftType: '', model: '', note: '' });

watch(
  () => form.trackingType,
  (trackingType) => {
    if (trackingType !== 'QUANTITY') return;
    form.certificateRequired = false;
    form.shelfLifeDays = null;
  }
);

const { data, pending, error, refresh } = await useAsyncData('inventory-parts', () =>
  fetchApi<InventoryPartDto[]>('/api/inventory/parts')
);
const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (data.value ?? []).filter((part) =>
    [part.partNumber, part.partName, part.manufacturer, part.manufacturerPartNumber].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query)
    )
  );
});

function resetForm() {
  Object.assign(form, blankForm());
  Object.assign(applicability, { aircraftType: '', model: '', note: '' });
  editingId.value = null;
  actionError.value = '';
}

function openCreate() {
  resetForm();
  dialog.value = true;
}

function openEdit(part: InventoryPartDto) {
  resetForm();
  editingId.value = part.id;
  Object.assign(form, structuredClone(part));
  dialog.value = true;
}

function addApplicability() {
  if (!applicability.aircraftType.trim()) return;
  form.aircraftApplicability.push({
    aircraftType: applicability.aircraftType.trim(),
    model: applicability.model.trim() || null,
    note: applicability.note.trim() || null
  });
  Object.assign(applicability, { aircraftType: '', model: '', note: '' });
}

function updateDocumentDialog(value: boolean) {
  if (!value) documentPart.value = null;
}

function expiryColor(status: InventoryPartDto['expiryProfile']['status']) {
  if (status === 'EXPIRED') return 'error';
  if (status === 'EXPIRING_SOON') return 'warning';
  if (status === 'VALID') return 'success';
  return 'medium-emphasis';
}

function expiryLabel(profile: InventoryPartDto['expiryProfile']) {
  if (!profile.expiresAt) return 'No stock expiry';
  if (profile.daysUntilExpiry === null) return 'Invalid expiry date';
  if (profile.daysUntilExpiry < 0)
    return `${number(Math.abs(profile.daysUntilExpiry), 0)} days expired`;
  if (profile.daysUntilExpiry === 0) return 'Expires today';
  return `${number(profile.daysUntilExpiry, 0)} days remaining`;
}

function shelfLifeCountdown(part: InventoryPartDto) {
  if (!part.shelfLifeDays) return '-';
  const remaining = part.expiryProfile.daysUntilExpiry;
  if (remaining === null) return `${number(part.shelfLifeDays, 0)} total days`;
  return `${number(Math.max(remaining, 0), 0)} / ${number(part.shelfLifeDays, 0)} days left`;
}

async function save() {
  saving.value = true;
  actionError.value = '';
  try {
    await fetchApi(
      editingId.value ? `/api/inventory/parts/${editingId.value}` : '/api/inventory/parts',
      {
        method: editingId.value ? 'PUT' : 'POST',
        body: form
      }
    );
    dialog.value = false;
    await refresh();
  } catch (value) {
    actionError.value = errorMessage(
      value,
      'Katalog part tidak dapat disimpan. Periksa field wajib.'
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Katalog Spare Part">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Tambah spare part"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui part"
        variant="text"
        @click="() => refresh()"
      />
    </template>

    <VAlert v-if="error" aria-live="polite" class="mb-4" type="error" variant="tonal">
      Katalog part tidak dapat dimuat. Perbarui halaman lalu coba lagi.
    </VAlert>
    <InventoryFilterBar label="Filter katalog spare part">
      <VTextField
        v-model="search"
        clearable
        density="comfortable"
        hide-details
        label="Cari nomor part, nama, atau manufacturer"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
    </InventoryFilterBar>

    <InventoryPanel title="Daftar Spare Part">
      <VDataTable
        :headers="[
          { title: 'Part', key: 'partNumber' },
          { title: 'Manufacturer', key: 'manufacturer' },
          { title: 'Lifecycle', key: 'lifecycleType' },
          { title: 'Tracking', key: 'trackingType' },
          { title: 'Kritikalitas', key: 'criticality' },
          { title: 'Tanggal Expiry', key: 'expiryDate', sortable: false },
          { title: 'Countdown', key: 'expiryCountdown', sortable: false },
          { title: 'Sertifikat', key: 'certificateRequired' },
          { title: '', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="rows"
        :loading="pending"
      >
        <template #[`item.partNumber`]="{ item }">
          <div class="py-2">
            <div class="font-weight-bold">{{ item.partNumber }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ item.partName }} · {{ item.unitOfMeasure }}
            </div>
          </div>
        </template>
        <template #[`item.manufacturer`]="{ item }">
          <div>{{ item.manufacturer }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ item.manufacturerPartNumber ?? '-' }}
          </div>
        </template>
        <template #[`item.lifecycleType`]="{ item }">
          <DsStatusBadge :value="item.lifecycleType" />
        </template>
        <template #[`item.trackingType`]="{ item }">
          <DsStatusBadge :value="item.trackingType" />
        </template>
        <template #[`item.criticality`]="{ item }">
          <DsStatusBadge :value="item.criticality" />
        </template>
        <template #[`item.expiryDate`]="{ item }">
          <div>{{ date(item.expiryProfile.expiresAt) }}</div>
          <div v-if="item.expiryProfile.lotNumber" class="text-caption text-medium-emphasis">
            {{ item.expiryProfile.lotNumber }} ·
            {{ number(item.expiryProfile.quantityOnNearestExpiry) }} {{ item.unitOfMeasure }}
          </div>
        </template>
        <template #[`item.expiryCountdown`]="{ item }">
          <VChip :color="expiryColor(item.expiryProfile.status)" size="small" variant="tonal">
            {{ expiryLabel(item.expiryProfile) }}
          </VChip>
          <div class="mt-1 text-caption text-medium-emphasis">
            {{ shelfLifeCountdown(item) }}
          </div>
        </template>
        <template #[`item.certificateRequired`]="{ item }">
          <VIcon
            :color="item.certificateRequired ? 'success' : 'medium-emphasis'"
            :icon="item.certificateRequired ? 'mdi-shield-check-outline' : 'mdi-minus'"
          />
        </template>
        <template #[`item.actions`]="{ item }">
          <InventoryTableActions>
            <DsTooltipIconButton
              icon="mdi-file-certificate-outline"
              tooltip="Sertifikat part"
              variant="text"
              @click="documentPart = item"
            />
            <DsTooltipIconButton
              v-if="can('inventory.catalog.manage').allowed"
              icon="mdi-pencil-outline"
              tooltip="Edit part"
              variant="text"
              @click="openEdit(item)"
            />
          </InventoryTableActions>
        </template>
        <template #no-data>
          <div class="py-10 text-medium-emphasis">Tidak ada part yang cocok dengan filter.</div>
        </template>
      </VDataTable>
    </InventoryPanel>

    <VDialog v-model="dialog" max-width="760" persistent>
      <VCard>
        <VCardTitle>{{ editingId ? 'Edit spare part' : 'Tambah spare part' }}</VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="actionError" aria-live="polite" class="mb-4" type="error" variant="tonal">
            {{ actionError }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="5">
              <VTextField v-model="form.partNumber" label="Nomor part" variant="outlined" />
            </VCol>
            <VCol cols="12" md="7">
              <VTextField v-model="form.partName" label="Nama part" variant="outlined" />
            </VCol>
            <VCol cols="12" md="7">
              <VTextField v-model="form.manufacturer" label="Manufacturer" variant="outlined" />
            </VCol>
            <VCol cols="12" md="5">
              <VTextField
                v-model="form.manufacturerPartNumber"
                label="Nomor part manufacturer"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.unitOfMeasure"
                :items="['EA', 'SET', 'KIT', 'L', 'KG', 'M']"
                label="UOM"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.lifecycleType"
                :items="['CONSUMABLE', 'EXPENDABLE', 'REPAIRABLE', 'ROTABLE']"
                label="Lifecycle"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.partCategory"
                :items="[
                  'CONSUMABLE',
                  'EXPENDABLE',
                  'REPAIRABLE',
                  'ROTABLE',
                  'TOOL_GSE',
                  'SOFTWARE_NAVDB',
                  'MISSION_SPECIFIC'
                ]"
                label="Kategori part"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.trackingType"
                :items="['QUANTITY', 'LOT', 'SERIAL']"
                label="Tracking"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="form.criticality"
                :items="['STANDARD', 'ESSENTIAL', 'CRITICAL']"
                label="Criticality"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSwitch
                v-model="form.isLifeLimited"
                color="warning"
                label="Life-Limited Part (LLP)"
                hide-details
              />
            </VCol>
            <VCol v-if="form.isLifeLimited" cols="12" md="6">
              <VTextField
                v-model.number="form.maxFlightHours"
                type="number"
                label="Batas Flight Hours"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.isLifeLimited" cols="12" md="6">
              <VTextField
                v-model.number="form.maxFlightCycles"
                type="number"
                label="Batas Flight Cycles"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.shelfLifeDays"
                clearable
                :disabled="form.trackingType === 'QUANTITY'"
                label="Shelf life hari"
                min="1"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol class="d-flex align-center" cols="12" md="6">
              <VSwitch
                v-model="form.certificateRequired"
                color="primary"
                :disabled="form.trackingType === 'QUANTITY'"
                label="Sertifikat wajib"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="form.description" label="Deskripsi" rows="2" variant="outlined" />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div class="mb-2 text-subtitle-2 font-weight-bold">Applicability Pesawat</div>
          <div
            v-for="(item, index) in form.aircraftApplicability"
            :key="`${item.aircraftType}-${item.model}-${index}`"
            class="mb-2 d-flex align-center ga-2"
          >
            <VChip>{{ item.aircraftType }}{{ item.model ? ` / ${item.model}` : '' }}</VChip>
            <DsTooltipIconButton
              icon="mdi-close"
              tooltip="Hapus applicability"
              size="small"
              variant="text"
              @click="form.aircraftApplicability.splice(index, 1)"
            />
          </div>
          <VRow dense>
            <VCol cols="12" md="4">
              <VTextField
                v-model="applicability.aircraftType"
                hide-details
                label="Tipe pesawat"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="applicability.model"
                hide-details
                label="Model"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="applicability.note"
                hide-details
                label="Catatan"
                variant="outlined"
              />
            </VCol>
            <VCol class="d-flex align-center" cols="12" md="1">
              <DsTooltipIconButton
                icon="mdi-plus"
                tooltip="Tambah applicability"
                variant="tonal"
                @click="addApplicability"
              />
            </VCol>
          </VRow>
        </VCardText>
        <InventoryDialogActions
          :loading="saving"
          submit-text="Simpan part"
          @cancel="dialog = false"
          @submit="save"
        />
      </VCard>
    </VDialog>

    <VDialog
      :model-value="Boolean(documentPart)"
      max-width="1100"
      scrollable
      @update:model-value="updateDocumentDialog"
    >
      <VSheet v-if="documentPart" class="pa-4" rounded="lg">
        <div class="mb-4 d-flex align-center">
          <div>
            <div class="text-h6 font-weight-bold">Sertifikat Part</div>
            <div class="text-caption text-medium-emphasis">
              {{ documentPart.partNumber }} · {{ documentPart.partName }}
            </div>
          </div>
          <VSpacer />
          <DsTooltipIconButton
            icon="mdi-close"
            tooltip="Tutup sertifikat part"
            variant="text"
            @click="documentPart = null"
          />
        </div>
        <DocumentPanel owner-type="inventory_part" :owner-id="documentPart.id" />
      </VSheet>
    </VDialog>
  </InventoryShell>
</template>
