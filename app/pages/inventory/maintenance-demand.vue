<script setup lang="ts">
import type { InventoryMaintenanceDemandDto } from '#shared/features/inventory';
import type { MaintenanceInventoryReservationDto } from '#shared/features/maintenance-v21';
import InventoryShell from '../../features/inventory/InventoryShell.vue';

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
const selected = ref<InventoryMaintenanceDemandDto | null>(null);
const selectedCandidateId = ref('');
const reserveQuantity = ref(1);
const returnReservation = ref<MaintenanceInventoryReservationDto | null>(null);
const returnForm = reactive({ condition: 'SERVICEABLE', reason: '' });

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

async function issue(row: InventoryMaintenanceDemandDto) {
  const reservation = row.reservations.find((item) =>
    ['ACTIVE', 'PARTIALLY_ISSUED'].includes(item.status)
  );
  if (!reservation) return;
  await runAction('Material berhasil dikeluarkan untuk MRO.', () =>
    fetchApi('/api/inventory/maintenance-demand/issues', {
      method: 'POST',
      body: {
        reservationId: reservation.id,
        quantity: reservation.quantity,
        idempotencyKey: crypto.randomUUID()
      }
    })
  );
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
      <VBtn prepend-icon="mdi-refresh" text="Perbarui" variant="tonal" @click="refresh" />
    </template>

    <VAlert v-if="error || actionError" class="mb-4" type="error" variant="tonal">
      {{ actionError || 'Kebutuhan material MRO tidak dapat dimuat.' }}
    </VAlert>
    <VAlert v-if="actionMessage" closable class="mb-4" type="success" variant="tonal">
      {{ actionMessage }}
    </VAlert>

    <DsMetricStrip class="mb-4" :items="metrics" />

    <VCard border class="mb-4">
      <VCardText>
        <VRow>
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
      </VCardText>
    </VCard>

    <VSkeletonLoader v-if="pending && !data" type="table" />
    <template v-else>
      <VCard border class="d-none d-sm-block demand-table">
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
            <tr v-for="row in data ?? []" :key="row.requirement.id">
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
                  Reserved {{ number(row.requirement.reservedQuantity) }}
                </div>
                <div class="text-caption">Issued {{ number(row.requirement.issuedQuantity) }}</div>
                <div class="text-caption">
                  Installed {{ number(row.requirement.installedQuantity) }}
                </div>
              </td>
              <td>
                <DsStatusBadge :label="nextActionLabel(row.nextAction)" :value="row.nextAction" />
                <div v-if="row.blocker" class="mt-1 text-caption text-error">{{ row.blocker }}</div>
              </td>
              <td class="text-right text-no-wrap">
                <VBtn
                  v-if="row.nextAction === 'RESERVE'"
                  size="small"
                  text="Reservasi"
                  variant="tonal"
                  @click="openReserve(row)"
                />
                <VBtn
                  v-else-if="row.nextAction === 'ISSUE'"
                  :loading="working"
                  size="small"
                  text="Issue"
                  variant="tonal"
                  @click="issue(row)"
                />
                <VBtn
                  v-else-if="row.nextAction === 'WAIT_INSTALL'"
                  size="small"
                  text="Return"
                  variant="text"
                  @click="openReturn(row)"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <div class="d-sm-none d-grid ga-3">
        <VCard v-for="row in data ?? []" :key="row.requirement.id" border>
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
              @click="issue(row)"
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

      <VCard v-if="!(data?.length ?? 0)" border>
        <VCardText class="py-12 text-center">
          <VIcon class="mb-3" icon="mdi-package-variant-closed-check" size="36" />
          <h2 class="text-h6">Tidak ada kebutuhan material aktif</h2>
          <p class="text-medium-emphasis">
            Kebutuhan baru akan muncul setelah MRO menambah material pada work package.
          </p>
        </VCardText>
      </VCard>
    </template>

    <VDialog v-model="reserveDialog" max-width="600">
      <VCard title="Reservasi stok untuk MRO">
        <VCardText>
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
        <VCardActions>
          <VSpacer /><VBtn text="Batal" variant="text" @click="reserveDialog = false" /><VBtn
            :disabled="!selectedCandidateId || reserveQuantity <= 0"
            :loading="working"
            text="Reservasi stok"
            @click="reserve"
          />
        </VCardActions>
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
        <VCardActions>
          <VSpacer /><VBtn text="Batal" variant="text" @click="returnDialog = false" /><VBtn
            :disabled="returnForm.reason.trim().length < 3"
            :loading="working"
            text="Kembalikan"
            @click="returnMaterial"
          />
        </VCardActions>
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
</style>
