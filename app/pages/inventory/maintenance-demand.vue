<script setup lang="ts">
import type { InventoryMaintenanceDemandDto } from '#shared/features/inventory';
import type { MaintenanceInventoryReservationDto } from '#shared/features/maintenance-v21';
import InventoryDialogActions from '../../features/inventory/InventoryDialogActions.vue';
import InventoryEmptyState from '../../features/inventory/InventoryEmptyState.vue';
import InventoryFilterBar from '../../features/inventory/InventoryFilterBar.vue';
import InventoryPanel from '../../features/inventory/InventoryPanel.vue';
import InventoryShell from '../../features/inventory/InventoryShell.vue';
import InventoryTableActions from '../../features/inventory/InventoryTableActions.vue';

const route = useRoute();
const router = useRouter();
const { date, errorMessage, number } = useInventoryUi();
const search = ref(String(route.query.search ?? ''));
const status = ref(String(route.query.status ?? ''));
const actionError = ref('');
const actionMessage = ref('');
const working = ref(false);
const reserveDialog = ref(false);
const returnDialog = ref(false);
const issueDialog = ref(false);
const selected = ref<InventoryMaintenanceDemandDto | null>(null);
const selectedCandidateId = ref('');
const reserveQuantity = ref(1);
const returnReservation = ref<MaintenanceInventoryReservationDto | null>(null);
const returnForm = reactive({ condition: 'SERVICEABLE', reason: '' });
const internalAog = await useInternalAogDemo();
const internalAogScenario = computed(() => internalAog.data.value);
const focusedRequirementId = computed(() => String(route.query.requirement ?? ''));

const query = computed(() => ({
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(status.value ? { status: status.value } : {})
}));

const { data, pending, error, refresh } = await useAsyncData(
  'inventory-maintenance-demand',
  () =>
    fetchApi<InventoryMaintenanceDemandDto[]>('/api/inventory/maintenance-demand', {
      query: query.value
    }),
  { watch: [query] }
);

watch([search, status], () => {
  void router.replace({ query: { ...route.query, ...query.value } });
});

const metrics = computed(() => {
  const rows = data.value ?? [];
  return [
    { label: 'Kebutuhan aktif', value: rows.length, icon: 'mdi-clipboard-text-outline' },
    {
      label: 'Menunggu reservasi',
      value: rows.filter((row) => row.nextAction === 'RESERVE').length,
      tone: 'warning' as const,
      icon: 'mdi-package-variant-closed'
    },
    {
      label: 'Menunggu issue',
      value: rows.filter((row) => row.nextAction === 'ISSUE').length,
      tone: 'warning' as const,
      icon: 'mdi-tray-arrow-up'
    },
    {
      label: 'Terblokir',
      value: rows.filter((row) => row.nextAction === 'BLOCKED').length,
      tone: 'danger' as const,
      icon: 'mdi-alert-octagon-outline'
    }
  ];
});
const displayRows = computed(() => {
  const rows = [...(data.value ?? [])];
  return rows.sort((left, right) => {
    if (left.requirement.id === focusedRequirementId.value) return -1;
    if (right.requirement.id === focusedRequirementId.value) return 1;
    return 0;
  });
});
const selectedCandidate = computed(() =>
  selected.value?.candidates.find((item) => item.inventoryItemId === selectedCandidateId.value)
);
const eligibleCandidateItems = computed(() =>
  (selected.value?.candidates ?? [])
    .filter((item) => item.eligible)
    .map((item) => ({
      title: `${item.stationCode} / ${item.warehouseCode} / ${item.binCode} · ${item.availableQuantity} tersedia`,
      value: item.inventoryItemId
    }))
);

function openReserve(row: InventoryMaintenanceDemandDto) {
  selected.value = row;
  const candidate = row.candidates.find((item) => item.eligible);
  selectedCandidateId.value = candidate?.inventoryItemId ?? '';
  const remaining = Math.max(
    0,
    row.requirement.requiredQuantity -
      row.requirement.reservedQuantity -
      row.requirement.issuedQuantity
  );
  reserveQuantity.value = Math.min(candidate?.availableQuantity ?? 1, remaining || 1);
  reserveDialog.value = true;
}

async function reserve() {
  if (!selected.value) return;
  const candidate = selected.value.candidates.find(
    (item) => item.inventoryItemId === selectedCandidateId.value
  );
  if (!candidate) return;
  await runAction('Material berhasil direservasi.', async () => {
    await fetchApi('/api/inventory/maintenance-demand/reservations', {
      method: 'POST',
      body: {
        materialRequirementId: selected.value!.requirement.id,
        inventoryItemId: candidate.inventoryItemId,
        serializedPartId: candidate.serialId ?? undefined,
        lotNumber: candidate.lotNumber ?? undefined,
        quantity: reserveQuantity.value,
        unit: selected.value!.requirement.unit,
        stationId: candidate.stationId,
        inventoryLocationId: candidate.binId,
        certificateReference: candidate.certificateReference ?? undefined,
        idempotencyKey: crypto.randomUUID()
      }
    });
    reserveDialog.value = false;
  });
}

function openIssue(row: InventoryMaintenanceDemandDto) {
  selected.value = row;
  issueDialog.value = true;
}

async function issue() {
  if (!selected.value) return;
  const reservation = selected.value.reservations.find((item) =>
    ['ACTIVE', 'PARTIALLY_ISSUED'].includes(item.status)
  );
  if (!reservation) return;
  await runAction('Material berhasil dikeluarkan untuk MRO.', async () => {
    await fetchApi('/api/inventory/maintenance-demand/issues', {
      method: 'POST',
      body: {
        reservationId: reservation.id,
        quantity: reservation.quantity,
        idempotencyKey: crypto.randomUUID()
      }
    });
    issueDialog.value = false;
  });
}

function openReturn(row: InventoryMaintenanceDemandDto) {
  returnReservation.value = row.reservations.find((item) => item.status === 'ISSUED') ?? null;
  returnForm.condition = 'SERVICEABLE';
  returnForm.reason = '';
  returnDialog.value = Boolean(returnReservation.value);
}

async function returnMaterial() {
  if (!returnReservation.value) return;
  await runAction('Material berhasil dikembalikan ke inventory.', async () => {
    await fetchApi('/api/inventory/maintenance-demand/returns', {
      method: 'POST',
      body: {
        reservationId: returnReservation.value!.id,
        quantity: returnReservation.value!.issuedQuantity ?? returnReservation.value!.quantity,
        condition: returnForm.condition,
        reason: returnForm.reason,
        idempotencyKey: crypto.randomUUID()
      }
    });
    returnDialog.value = false;
  });
}

async function runAction(message: string, action: () => Promise<unknown>) {
  working.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await action();
    actionMessage.value = message;
    await refresh();
    await internalAog.refresh();
  } catch (value) {
    actionError.value = errorMessage(value, 'Tindakan material gagal diproses.');
  } finally {
    working.value = false;
  }
}

function nextActionLabel(value: InventoryMaintenanceDemandDto['nextAction']) {
  return {
    RESERVE: 'Reservasi stok',
    ISSUE: 'Issue ke MRO',
    WAIT_INSTALL: 'Menunggu pemasangan MRO',
    COMPLETED: 'Material terpasang',
    BLOCKED: 'Stok belum tersedia'
  }[value];
}
</script>

<template>
  <InventoryShell
    description="Antrean material dari paket pekerjaan MRO. Inventory mengendalikan reservasi, issue, dan return tanpa mengubah pekerjaan teknis."
    title="Kebutuhan Material MRO"
  >
    <template #actions>
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Perbarui kebutuhan MRO"
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
      {{ actionError || 'Kebutuhan material MRO tidak dapat dimuat.' }}
    </VAlert>
    <VAlert
      v-if="actionMessage"
      aria-live="polite"
      closable
      class="mb-4"
      type="success"
      variant="tonal"
    >
      {{ actionMessage }}
    </VAlert>

    <MaintenanceInternalAogDemoCoach
      v-if="internalAogScenario"
      :scenario="internalAogScenario"
      :role="internalAog.role.value"
      :continue-scenario="internalAog.continueScenario"
      :reset-scenario="internalAog.resetScenario"
    />

    <DsMetricStrip class="mb-4" :items="metrics" />

    <InventoryFilterBar label="Filter kebutuhan material MRO">
      <VRow density="compact">
        <VCol cols="12" md="8">
          <VTextField
            v-model="search"
            clearable
            hide-details
            label="Cari part, aircraft, atau paket pekerjaan"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="status"
            clearable
            hide-details
            :items="[
              { title: 'Diminta', value: 'REQUESTED' },
              { title: 'Direservasi', value: 'RESERVED' },
              { title: 'Dikeluarkan', value: 'ISSUED' },
              { title: 'Terblokir', value: 'BLOCKED' }
            ]"
            label="Status kebutuhan"
            variant="outlined"
          />
        </VCol>
      </VRow>
    </InventoryFilterBar>

    <VSkeletonLoader v-if="pending && !data" type="table" />
    <template v-else>
      <InventoryPanel class="d-none d-sm-block demand-table" title="Antrean Material MRO">
        <VTable>
          <thead>
            <tr>
              <th>Part / kebutuhan</th>
              <th>Paket pekerjaan</th>
              <th>Station / diperlukan</th>
              <th>Progres</th>
              <th>Tindakan berikutnya</th>
              <th><span class="sr-only">Tindakan</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in displayRows"
              :key="row.requirement.id"
              :class="{ 'demand-row--focused': row.requirement.id === focusedRequirementId }"
              :data-testid="
                row.requirement.id === focusedRequirementId
                  ? 'internal-aog-inventory-demand'
                  : undefined
              "
            >
              <td>
                <strong>{{ row.requirement.partNumber ?? 'Part belum ditentukan' }}</strong>
                <div class="text-caption text-medium-emphasis">{{ row.requirement.partName }}</div>
                <div>{{ number(row.requirement.requiredQuantity) }} {{ row.requirement.unit }}</div>
              </td>
              <td>
                <NuxtLink :to="`/maintenance/work-packages/${row.requirement.workPackageId}`">
                  {{ row.workPackageNumber }}
                </NuxtLink>
                <div class="text-caption">
                  {{ row.aircraftRegistration }} · {{ row.flightNumber ?? 'Tanpa flight' }}
                </div>
              </td>
              <td>
                {{ row.stationCode ?? '-' }}
                <div class="text-caption">
                  {{
                    row.requirement.requiredBy ? date(row.requirement.requiredBy) : 'Tanpa tenggat'
                  }}
                </div>
              </td>
              <td>
                <div class="text-caption">
                  Reservasi {{ number(row.requirement.reservedQuantity) }}
                </div>
                <div class="text-caption">Issued {{ number(row.requirement.issuedQuantity) }}</div>
                <div class="text-caption">
                  Terpasang {{ number(row.requirement.installedQuantity) }}
                </div>
              </td>
              <td>
                <DsStatusBadge :label="nextActionLabel(row.nextAction)" :value="row.nextAction" />
                <div v-if="row.blocker" class="mt-1 text-caption text-error">{{ row.blocker }}</div>
              </td>
              <td class="text-right text-no-wrap">
                <InventoryTableActions>
                  <DsTooltipIconButton
                    v-if="row.nextAction === 'RESERVE'"
                    icon="mdi-package-variant-plus"
                    size="small"
                    tooltip="Reservasi stok"
                    variant="tonal"
                    @click="openReserve(row)"
                  />
                  <DsTooltipIconButton
                    v-else-if="row.nextAction === 'ISSUE'"
                    icon="mdi-package-up"
                    :loading="working"
                    size="small"
                    tooltip="Issue ke MRO"
                    variant="tonal"
                    @click="openIssue(row)"
                  />
                  <DsTooltipIconButton
                    v-else-if="row.nextAction === 'WAIT_INSTALL'"
                    icon="mdi-keyboard-return"
                    size="small"
                    tooltip="Kembalikan material"
                    variant="text"
                    @click="openReturn(row)"
                  />
                </InventoryTableActions>
              </td>
            </tr>
          </tbody>
        </VTable>
      </InventoryPanel>

      <div class="d-sm-none d-grid ga-3">
        <VCard
          v-for="row in displayRows"
          :key="row.requirement.id"
          border
          :class="{ 'demand-row--focused': row.requirement.id === focusedRequirementId }"
        >
          <VCardText>
            <div class="d-flex align-start justify-space-between ga-3">
              <div>
                <strong>{{ row.requirement.partNumber }}</strong>
                <div class="text-caption">{{ row.requirement.partName }}</div>
              </div>
              <DsStatusBadge :label="nextActionLabel(row.nextAction)" :value="row.nextAction" />
            </div>
            <VDivider class="my-3" />
            <div class="d-grid ga-2 text-body-2">
              <div>
                <span class="text-medium-emphasis">Paket:</span> {{ row.workPackageNumber }}
              </div>
              <div>
                <span class="text-medium-emphasis">Aircraft:</span> {{ row.aircraftRegistration }}
              </div>
              <div>
                <span class="text-medium-emphasis">Station:</span> {{ row.stationCode ?? '-' }}
              </div>
              <div>
                <span class="text-medium-emphasis">Jumlah:</span>
                {{ number(row.requirement.requiredQuantity) }} {{ row.requirement.unit }}
              </div>
            </div>
          </VCardText>
          <VCardActions>
            <VBtn
              v-if="row.nextAction === 'RESERVE'"
              block
              text="Reservasi stok"
              variant="tonal"
              @click="openReserve(row)"
            />
            <VBtn
              v-else-if="row.nextAction === 'ISSUE'"
              block
              text="Issue ke MRO"
              variant="tonal"
              @click="openIssue(row)"
            />
            <VBtn
              v-else-if="row.nextAction === 'WAIT_INSTALL'"
              block
              text="Kembalikan material"
              variant="text"
              @click="openReturn(row)"
            />
          </VCardActions>
        </VCard>
      </div>

      <InventoryEmptyState
        v-if="!(data?.length ?? 0)"
        description="Kebutuhan baru akan muncul setelah MRO menambah material pada work package."
        title="Tidak ada kebutuhan material aktif"
      />
    </template>

    <VDialog v-model="reserveDialog" aria-label="Reservasi stok untuk MRO" max-width="600">
      <VCard title="Reservasi stok untuk MRO">
        <VCardText>
          <VAlert v-if="selected" type="info" variant="tonal" class="mb-4">
            <div class="font-weight-bold">Dampak setelah reservasi</div>
            <div>
              {{ selected.workPackageNumber }} / {{ selected.aircraftRegistration }} ·
              {{ number(reserveQuantity) }} {{ selected.requirement.unit }}
            </div>
            <div v-if="selectedCandidate" class="text-caption mt-1">
              {{ selectedCandidate.stationCode }}-{{ selectedCandidate.warehouseCode }} /
              {{ selectedCandidate.binCode }} · tersedia setelah aksi:
              {{ number(selectedCandidate.availableQuantity - reserveQuantity) }}
            </div>
          </VAlert>
          <VSelect
            v-model="selectedCandidateId"
            class="mb-3"
            :items="eligibleCandidateItems"
            label="Sumber stok"
            variant="outlined"
          />
          <VTextField
            v-model.number="reserveQuantity"
            label="Jumlah"
            min="1"
            type="number"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="!selectedCandidateId || reserveQuantity <= 0"
          :loading="working"
          submit-icon="mdi-package-variant-closed-check"
          submit-text="Reservasi stok"
          @cancel="reserveDialog = false"
          @submit="reserve"
        />
      </VCard>
    </VDialog>

    <VDialog v-model="issueDialog" aria-label="Issue material ke Work Package" max-width="600">
      <VCard title="Issue material ke Work Package">
        <VCardText v-if="selected">
          <VAlert type="warning" variant="tonal" class="mb-4">
            <div class="font-weight-bold">Konfirmasi dampak operasional</div>
            <div>{{ selected.workPackageNumber }} / {{ selected.aircraftRegistration }}</div>
            <div class="mt-1">
              {{ selected.requirement.partNumber }} ·
              {{ number(selected.requirement.reservedQuantity) }} {{ selected.requirement.unit }}
            </div>
            <div class="text-caption mt-2">
              Gate material menjadi siap setelah command issue berhasil disimpan. Pemasangan tetap
              menjadi tanggung jawab Maintenance Technician.
            </div>
          </VAlert>
        </VCardText>
        <InventoryDialogActions
          :loading="working"
          submit-icon="mdi-package-up"
          submit-text="Issue material"
          @cancel="issueDialog = false"
          @submit="issue"
        />
      </VCard>
    </VDialog>

    <VDialog v-model="returnDialog" max-width="600">
      <VCard title="Kembalikan material">
        <VCardText>
          <VSelect
            v-model="returnForm.condition"
            class="mb-3"
            :items="[
              { title: 'Serviceable', value: 'SERVICEABLE' },
              { title: 'Karantina', value: 'QUARANTINE' },
              { title: 'Unserviceable', value: 'UNSERVICEABLE' }
            ]"
            label="Kondisi saat kembali"
            variant="outlined"
          />
          <VTextarea
            v-model="returnForm.reason"
            label="Alasan pengembalian"
            rows="3"
            variant="outlined"
          />
        </VCardText>
        <InventoryDialogActions
          :disabled="returnForm.reason.trim().length < 3"
          :loading="working"
          submit-icon="mdi-keyboard-return"
          submit-text="Kembalikan"
          @cancel="returnDialog = false"
          @submit="returnMaterial"
        />
      </VCard>
    </VDialog>
  </InventoryShell>
</template>

<style scoped>
.demand-table {
  overflow-x: auto;
}
.demand-table table {
  min-width: 980px;
}

.demand-row--focused {
  background: rgba(var(--v-theme-primary), 0.08);
  box-shadow: inset 4px 0 rgb(var(--v-theme-primary));
}
</style>
