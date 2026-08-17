<script setup lang="ts">
import type {
  StationMaintenanceRequestDto,
  StationMaintenanceRequestInput
} from '#shared/contracts/station-maintenance';
import MaintenanceRequestDialog from '../../../components/station-operations/MaintenanceRequestDialog.vue';
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import type { ApiStationFlight } from '../../../features/station-operations/types/stationOperations';

type TechnicalHandoffRow = {
  flight: ApiStationFlight;
  request: StationMaintenanceRequestDto;
};

const route = useRoute();
const router = useRouter();
const { can } = useAuthorization();
const { pending, workbenchFlights, load } = useStationOperationsPageData();
const search = ref(typeof route.query.search === 'string' ? route.query.search : '');
const owner = ref(typeof route.query.owner === 'string' ? route.query.owner : '');
const status = ref(typeof route.query.status === 'string' ? route.query.status : '');
const selectorDialog = ref(false);
const requestDialog = ref(false);
const selectedFlight = ref<ApiStationFlight | null>(null);
const saving = ref(false);
const actionError = ref('');
const actionSuccess = ref('');

const rows = computed<TechnicalHandoffRow[]>(() =>
  workbenchFlights.value.flatMap((flight) =>
    flight.maintenanceRequests.map((request) => ({ flight, request }))
  )
);

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase();
  return rows.value.filter(({ flight, request }) => {
    const matchesSearch =
      !term ||
      [
        flight.flightNumber,
        flight.aircraftRegistration,
        flight.originStationCode,
        flight.destinationStationCode,
        request.defectNumber,
        request.title,
        request.workPackageNumber
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    const matchesOwner = !owner.value || request.owner === owner.value;
    const state = request.releaseNumber
      ? 'RELEASED'
      : (request.materialStatus ?? request.workPackageStatus ?? request.status);
    const matchesStatus = !status.value || state === status.value;
    return matchesSearch && matchesOwner && matchesStatus;
  });
});

const metrics = computed(() => [
  {
    label: 'Temuan aktif',
    value: rows.value.filter((row) => !row.request.releaseNumber).length,
    icon: 'mdi-alert-octagon-outline'
  },
  {
    label: 'Menunggu MRO',
    value: rows.value.filter((row) => row.request.owner === 'MRO' && !row.request.releaseNumber)
      .length,
    tone: 'warning' as const,
    icon: 'mdi-account-hard-hat'
  },
  {
    label: 'Menunggu Inventory',
    value: rows.value.filter(
      (row) => row.request.owner === 'INVENTORY' && !row.request.releaseNumber
    ).length,
    tone: 'warning' as const,
    icon: 'mdi-package-variant-closed'
  },
  {
    label: 'Rilis selesai',
    value: rows.value.filter((row) => Boolean(row.request.releaseNumber)).length,
    tone: 'success' as const,
    icon: 'mdi-certificate-outline'
  }
]);

const flightItems = computed(() =>
  workbenchFlights.value
    .filter((flight) => Boolean(flight.aircraftId))
    .map((flight) => ({
      title: `${flight.flightNumber} · ${flight.aircraftRegistration || flight.aircraftType}`,
      subtitle: `${flight.originStationCode} → ${flight.destinationStationCode}`,
      value: flight.flightId
    }))
);

function selectFlight(flightId: string) {
  selectedFlight.value =
    workbenchFlights.value.find((flight) => flight.flightId === flightId) ?? null;
  selectorDialog.value = false;
  requestDialog.value = Boolean(selectedFlight.value);
}

async function createRequest(input: StationMaintenanceRequestInput) {
  if (!selectedFlight.value) return;
  saving.value = true;
  actionError.value = '';
  actionSuccess.value = '';
  try {
    await fetchApi(
      `/api/flight-operations/flights/${selectedFlight.value.flightId}/maintenance-requests`,
      { method: 'POST', body: input }
    );
    requestDialog.value = false;
    actionSuccess.value = `Temuan ${selectedFlight.value.flightNumber} diteruskan ke MRO.`;
    await load();
  } catch (value) {
    actionError.value = value instanceof Error ? value.message : 'Temuan gagal diteruskan ke MRO.';
  } finally {
    saving.value = false;
  }
}

function requestStatus(request: StationMaintenanceRequestDto) {
  return request.releaseNumber
    ? 'RELEASED'
    : (request.materialStatus ?? request.workPackageStatus ?? request.status);
}

watch([search, owner, status], () => {
  void router.replace({
    query: {
      ...route.query,
      search: search.value.trim() || undefined,
      owner: owner.value || undefined,
      status: status.value || undefined
    }
  });
});
</script>

<template>
  <section>
    <div class="mb-4 d-flex flex-column ga-3 flex-md-row align-md-end">
      <div>
        <h2 class="text-h5 font-weight-bold">Temuan Teknis & Handoff MRO</h2>
        <p class="text-medium-emphasis">
          Station melaporkan kondisi faktual dan memantau progres. Assessment, pekerjaan teknis,
          serta rilis tetap dimiliki MRO.
        </p>
      </div>
      <VSpacer />
      <VBtn
        v-if="can('station.maintenance_request.create').allowed"
        color="primary"
        prepend-icon="mdi-alert-plus-outline"
        @click="selectorDialog = true"
      >
        Laporkan temuan
      </VBtn>
    </div>

    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VAlert v-if="actionSuccess" class="mb-4" closable type="success" variant="tonal">
      {{ actionSuccess }}
    </VAlert>

    <DsMetricStrip class="mb-4" :items="metrics" />

    <VCard border class="mb-4">
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="search"
              autocomplete="off"
              clearable
              hide-details
              label="Cari flight, aircraft, defect, atau work package"
              name="technical-handoff-search"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="owner"
              autocomplete="off"
              clearable
              hide-details
              :items="[
                { title: 'MRO', value: 'MRO' },
                { title: 'Inventory', value: 'INVENTORY' }
              ]"
              label="Pemilik tindakan"
              name="technical-handoff-owner"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="status"
              autocomplete="off"
              clearable
              hide-details
              :items="[
                { title: 'Menunggu assessment', value: 'OPEN' },
                { title: 'Menunggu material', value: 'WAITING_MATERIAL' },
                { title: 'Material direservasi', value: 'RESERVED' },
                { title: 'Material dikeluarkan', value: 'ISSUED' },
                { title: 'Menunggu rilis', value: 'READY_FOR_RELEASE' },
                { title: 'Rilis selesai', value: 'RELEASED' }
              ]"
              label="Status progres"
              name="technical-handoff-status"
              variant="outlined"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard border class="d-none d-lg-block">
      <VTable hover>
        <thead>
          <tr>
            <th>Flight / aircraft</th>
            <th>Temuan</th>
            <th>Progres teknis</th>
            <th>Pemilik / langkah berikutnya</th>
            <th class="text-right">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="5"><VSkeletonLoader type="table-row@3" /></td>
          </tr>
          <tr v-else-if="filteredRows.length === 0">
            <td colspan="5" class="py-10 text-center text-medium-emphasis">
              Belum ada temuan teknis pada konteks station dan tanggal ini.
            </td>
          </tr>
          <tr v-for="row in filteredRows" v-else :key="row.request.id">
            <td>
              <strong>{{ row.flight.flightNumber }}</strong>
              <div>{{ row.flight.aircraftRegistration }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ row.flight.originStationCode }} → {{ row.flight.destinationStationCode }}
              </div>
            </td>
            <td>
              <strong>{{ row.request.defectNumber }}</strong>
              <div>{{ row.request.title }}</div>
              <div v-if="row.request.workPackageNumber" class="text-caption text-medium-emphasis">
                Referensi WP: {{ row.request.workPackageNumber }}
              </div>
            </td>
            <td><DsStatusBadge :value="requestStatus(row.request)" /></td>
            <td>
              <DsStatusBadge :label="row.request.owner" :value="row.request.owner" />
              <div class="mt-1 text-caption text-medium-emphasis">
                {{ row.request.nextAction }}
              </div>
            </td>
            <td class="text-right">
              <VBtn
                :to="`/flights/station-operations/${row.flight.flightId}?tab=maintenance`"
                size="small"
                variant="tonal"
              >
                Buka flight
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <div class="d-grid d-lg-none ga-3">
      <VSkeletonLoader v-if="pending" type="article@3" />
      <VCard v-for="row in filteredRows" v-else :key="row.request.id" border>
        <VCardText>
          <div class="d-flex align-start justify-space-between ga-3">
            <div>
              <strong>{{ row.request.defectNumber }}</strong>
              <div>{{ row.request.title }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ row.flight.flightNumber }} · {{ row.flight.aircraftRegistration }}
              </div>
            </div>
            <DsStatusBadge :value="requestStatus(row.request)" />
          </div>
          <VDivider class="my-3" />
          <div class="text-body-2">Pemilik: {{ row.request.owner }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ row.request.nextAction }}</div>
          <div v-if="row.request.workPackageNumber" class="mt-2 text-caption">
            Referensi WP: {{ row.request.workPackageNumber }}
          </div>
        </VCardText>
        <VCardActions>
          <VBtn
            block
            :to="`/flights/station-operations/${row.flight.flightId}?tab=maintenance`"
            variant="tonal"
          >
            Buka flight
          </VBtn>
        </VCardActions>
      </VCard>
      <VCard v-if="!pending && filteredRows.length === 0" border class="pa-8 text-center">
        <VIcon class="mb-2" icon="mdi-shield-check-outline" size="38" />
        <div>Belum ada temuan teknis pada konteks station dan tanggal ini.</div>
      </VCard>
    </div>

    <VDialog v-model="selectorDialog" max-width="620">
      <VCard title="Pilih flight">
        <VCardText>
          <p class="mb-4 text-medium-emphasis">
            Temuan harus terhubung ke flight dan aircraft dalam konteks station aktif.
          </p>
          <VList v-if="flightItems.length" border lines="two">
            <VListItem
              v-for="item in flightItems"
              :key="item.value"
              link
              :subtitle="item.subtitle"
              :title="item.title"
              @click="selectFlight(item.value)"
            >
              <template #append><VIcon icon="mdi-chevron-right" /></template>
            </VListItem>
          </VList>
          <VAlert v-else type="info" variant="tonal">
            Tidak ada flight dengan aircraft pada konteks ini.
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="selectorDialog = false">Batal</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <MaintenanceRequestDialog
      v-model="requestDialog"
      :flight="
        selectedFlight
          ? {
            flightNumber: selectedFlight.flightNumber,
            aircraftRegistration: selectedFlight.aircraftRegistration,
            aircraftVersion: selectedFlight.aircraftVersion
          }
          : null
      "
      :loading="saving"
      @submit="createRequest"
    />
  </section>
</template>
