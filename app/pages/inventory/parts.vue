<script setup lang="ts">
import type { InventoryPartDto, InventoryPartInput } from '#shared/features/inventory';
import DocumentPanel from '../../components/documents/DocumentPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

const { can } = useAuthorization();
const { number, errorMessage } = useInventoryUi();
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
    actionError.value = errorMessage(value, 'Part catalog could not be saved');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <InventoryShell title="Spare Part Catalog">
    <template #actions>
      <DsTooltipIconButton
        v-if="can('inventory.catalog.manage').allowed"
        color="primary"
        icon="mdi-plus"
        tooltip="Add spare part"
        variant="flat"
        @click="openCreate"
      />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh parts"
        variant="text"
        @click="refresh"
      />
    </template>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Part catalog could not be loaded.
    </VAlert>
    <VTextField
      v-model="search"
      class="mb-4"
      clearable
      density="comfortable"
      hide-details
      label="Search part number, name, or manufacturer"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
    />

    <VCard border>
      <VDataTable
        :headers="[
          { title: 'Part', key: 'partNumber' },
          { title: 'Manufacturer', key: 'manufacturer' },
          { title: 'Lifecycle', key: 'lifecycleType' },
          { title: 'Tracking', key: 'trackingType' },
          { title: 'Criticality', key: 'criticality' },
          { title: 'Shelf Life', key: 'shelfLifeDays' },
          { title: 'Certificate', key: 'certificateRequired' },
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
        <template #[`item.shelfLifeDays`]="{ item }">
          {{ item.shelfLifeDays ? `${number(item.shelfLifeDays, 0)} days` : '-' }}
        </template>
        <template #[`item.certificateRequired`]="{ item }">
          <VIcon
            :color="item.certificateRequired ? 'success' : 'medium-emphasis'"
            :icon="item.certificateRequired ? 'mdi-shield-check-outline' : 'mdi-minus'"
          />
        </template>
        <template #[`item.actions`]="{ item }">
          <DsTooltipIconButton
            icon="mdi-file-certificate-outline"
            tooltip="Part certificates"
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
        </template>
        <template #no-data><div class="py-10 text-medium-emphasis">No parts found.</div></template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="760" persistent>
      <VCard>
        <VCardTitle>{{ editingId ? 'Edit spare part' : 'Add spare part' }}</VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
            {{
              actionError
            }}
          </VAlert>
          <VRow dense>
            <VCol cols="12" md="5">
              <VTextField v-model="form.partNumber" label="Part number" variant="outlined" />
            </VCol>
            <VCol cols="12" md="7">
              <VTextField v-model="form.partName" label="Part name" variant="outlined" />
            </VCol>
            <VCol cols="12" md="7">
              <VTextField v-model="form.manufacturer" label="Manufacturer" variant="outlined" />
            </VCol>
            <VCol cols="12" md="5">
              <VTextField
                v-model="form.manufacturerPartNumber"
                label="Manufacturer part number"
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
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.shelfLifeDays"
                clearable
                :disabled="form.trackingType === 'QUANTITY'"
                label="Shelf life days"
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
                label="Certificate required"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Description"
                rows="2"
                variant="outlined"
              />
            </VCol>
          </VRow>
          <VDivider class="mb-4" />
          <div class="mb-2 text-subtitle-2 font-weight-bold">Aircraft Applicability</div>
          <div
            v-for="(item, index) in form.aircraftApplicability"
            :key="`${item.aircraftType}-${item.model}-${index}`"
            class="mb-2 d-flex align-center ga-2"
          >
            <VChip>{{ item.aircraftType }}{{ item.model ? ` / ${item.model}` : '' }}</VChip>
            <DsTooltipIconButton
              icon="mdi-close"
              tooltip="Remove applicability"
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
                label="Aircraft type"
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
                label="Note"
                variant="outlined"
              />
            </VCol>
            <VCol class="d-flex align-center" cols="12" md="1">
              <DsTooltipIconButton
                icon="mdi-plus"
                tooltip="Add applicability"
                variant="tonal"
                @click="addApplicability"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn :disabled="saving" text="Cancel" variant="text" @click="dialog = false" />
          <VBtn
            :loading="saving"
            prepend-icon="mdi-content-save-outline"
            text="Save part"
            @click="save"
          />
        </VCardActions>
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
            <div class="text-h6 font-weight-bold">Part Certificates</div>
            <div class="text-caption text-medium-emphasis">
              {{ documentPart.partNumber }} · {{ documentPart.partName }}
            </div>
          </div>
          <VSpacer />
          <DsTooltipIconButton
            icon="mdi-close"
            tooltip="Close part certificates"
            variant="text"
            @click="documentPart = null"
          />
        </div>
        <DocumentPanel owner-type="inventory_part" :owner-id="documentPart.id" />
      </VSheet>
    </VDialog>
  </InventoryShell>
</template>
