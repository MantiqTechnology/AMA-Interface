<script setup lang="ts">
import type { MaintenanceDueStatusDto } from '#shared/features/maintenance';

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const { resolveAircraftImageUrl } = useAircraftImageUrl();
const router = useRouter();
const aircraftFilter = ref('');
const statusFilter = ref('');
const basisFilter = ref('');
const selectedDue = ref<MaintenanceDueStatusDto | null>(null);
const createLoading = ref(false);
const createError = ref('');
const planningNote = ref('');

const { data, pending, error, refresh } = await useAsyncData('maintenance-due-control', () =>
  fetchApi<MaintenanceDueStatusDto[]>('/api/maintenance/due-control')
);

const aircraftItems = computed(() => [
  ...new Set((data.value ?? []).map((item) => item.aircraftRegistrationNumber))
]);
const filtered = computed(() =>
  (data.value ?? []).filter(
    (item) =>
      (!aircraftFilter.value || item.aircraftRegistrationNumber === aircraftFilter.value) &&
      (!statusFilter.value || item.status === statusFilter.value) &&
      (!basisFilter.value || item.nearestBasis === basisFilter.value)
  )
);
const planningDialog = computed({
  get: () => Boolean(selectedDue.value),
  set: (value: boolean) => {
    if (!value) selectedDue.value = null;
  }
});

function dueStatusColor(status: MaintenanceDueStatusDto['status']) {
  if (status === 'OVERDUE') return 'error';
  if (status === 'DUE' || status === 'DUE_SOON') return 'warning';
  if (status === 'INACTIVE') return 'secondary';
  return 'success';
}

function planningColor(status: MaintenanceDueStatusDto['planningStatus']) {
  if (status === 'PLANNED' || status === 'IN_PROGRESS') return 'info';
  if (status === 'COMPLIED') return 'success';
  if (status === 'INACTIVE') return 'secondary';
  return 'warning';
}

function openPlanning(item: MaintenanceDueStatusDto) {
  createError.value = '';
  planningNote.value = '';
  if (item.plannedWorkPackageId) {
    router.push(`/maintenance/work-packages/${item.plannedWorkPackageId}`);
    return;
  }
  selectedDue.value = item;
}

async function createWorkPackageFromDue() {
  if (!selectedDue.value) return;
  createLoading.value = true;
  createError.value = '';
  try {
    const workPackage = await fetchApi<{ id: string }>(
      `/api/maintenance/due-control/${selectedDue.value.id}/actions/create-work-package`,
      {
        method: 'POST',
        body: {
          planningNote: planningNote.value || null,
          idempotencyKey: `due-${selectedDue.value.id}`
        }
      }
    );
    selectedDue.value = null;
    await refresh();
    await router.push(`/maintenance/work-packages/${workPackage.id}`);
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Work Package belum dapat dibuat.';
  } finally {
    createLoading.value = false;
  }
}
</script>

<template>
  <VContainer fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Jatuh Tempo Perawatan</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Due Control Lite untuk calendar, flight hours, flight cycles, dan forecast demo.
        </p>
      </div>
      <VSpacer />
      <VBtn icon="mdi-refresh" variant="text" :loading="pending" @click="refresh()" />
    </div>

    <VAlert type="info" variant="tonal" class="mb-4">
      Seluruh interval bersifat fiktif untuk demonstrasi decision-support, bukan maintenance program
      approved.
    </VAlert>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      Data jatuh tempo belum dapat dimuat.
    </VAlert>

    <VCard border>
      <VCardTitle class="d-flex flex-wrap align-center ga-3">
        <span>Requirement status</span>
        <VSpacer />
        <VSelect
          v-model="aircraftFilter"
          :items="aircraftItems"
          label="Aircraft"
          density="compact"
          hide-details
          clearable
          max-width="220"
        />
        <VSelect
          v-model="statusFilter"
          :items="['OVERDUE', 'DUE', 'DUE_SOON', 'NOT_DUE', 'COMPLETED', 'INACTIVE']"
          label="Status"
          density="compact"
          hide-details
          clearable
          max-width="220"
        />
        <VSelect
          v-model="basisFilter"
          :items="['CALENDAR', 'FH', 'FC']"
          label="Basis"
          density="compact"
          hide-details
          clearable
          max-width="180"
        />
      </VCardTitle>
      <VTable>
        <thead>
          <tr>
            <th>Pesawat</th>
            <th>Requirement</th>
            <th>Basis terdekat</th>
            <th>Kalkulasi</th>
            <th>Calendar</th>
            <th>FH</th>
            <th>FC</th>
            <th>Status</th>
            <th>Planning</th>
            <th>Data freshness</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="11">Menghitung due control...</td>
          </tr>
          <tr v-for="item in filtered" :key="item.id">
            <td>
              <div class="d-flex align-center ga-2">
                <VAvatar rounded="lg" size="40">
                  <VImg
                    v-if="resolveAircraftImageUrl(item.aircraftImageUrl)"
                    :alt="`${item.aircraftRegistrationNumber} aircraft image`"
                    cover
                    :src="resolveAircraftImageUrl(item.aircraftImageUrl) ?? undefined"
                  />
                  <VIcon v-else icon="mdi-airplane" size="22" />
                </VAvatar>
                <strong>{{ item.aircraftRegistrationNumber }}</strong>
              </div>
            </td>
            <td>
              <strong>{{ item.code }}</strong>
              <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
              <VChip v-if="item.mandatory" size="x-small" color="warning" variant="tonal">
                Mandatory
              </VChip>
            </td>
            <td>{{ ui.label(item.nearestBasis) }}</td>
            <td class="text-caption">{{ item.calculationExplanation }}</td>
            <td>
              {{ item.calendarRemainingDays ?? '-' }}
              <div class="text-caption">
                {{ item.nextDueAt ? format.date(item.nextDueAt) : '-' }}
              </div>
            </td>
            <td>
              {{ item.flightHoursRemaining ?? '-' }}
              <div class="text-caption">Current {{ item.currentFlightHours }} FH</div>
            </td>
            <td>
              {{ item.flightCyclesRemaining ?? '-' }}
              <div class="text-caption">Current {{ item.currentFlightCycles }} FC</div>
            </td>
            <td>
              <VChip :color="dueStatusColor(item.status)" variant="tonal">
                {{ ui.label(item.status) }}
              </VChip>
              <div v-if="item.forecastHorizonDays" class="text-caption">
                Forecast {{ item.forecastHorizonDays }} hari
              </div>
            </td>
            <td>
              <VChip :color="planningColor(item.planningStatus)" variant="tonal">
                {{ ui.label(item.planningStatus) }}
              </VChip>
              <div v-if="item.plannedWorkPackageNumber" class="text-caption">
                {{ item.plannedWorkPackageNumber }}
              </div>
            </td>
            <td class="text-caption">{{ item.dataFreshness }}</td>
            <td>
              <VBtn
                size="small"
                color="primary"
                variant="tonal"
                :disabled="!item.active || item.status === 'COMPLETED'"
                @click="openPlanning(item)"
              >
                {{ item.actionLabel }}
              </VBtn>
            </td>
          </tr>
          <tr v-if="!pending && !error && !filtered.length">
            <td colspan="11">Tidak ada requirement sesuai filter.</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <VDialog v-model="planningDialog" max-width="680">
      <VCard v-if="selectedDue">
        <VCardTitle>Buat Work Package dari Due Item</VCardTitle>
        <VCardText>
          <VAlert type="warning" variant="tonal" class="mb-4">
            Membuat Work Package tidak menandai requirement sebagai complied. Status due tetap
            berasal dari backend sampai pekerjaan dirilis secara teknis.
          </VAlert>
          <div class="mb-3">
            <strong>{{ selectedDue.code }}</strong>
            <div class="text-body-2">{{ selectedDue.title }}</div>
          </div>
          <VList density="compact" border rounded>
            <VListItem title="Aircraft" :subtitle="selectedDue.aircraftRegistrationNumber" />
            <VListItem title="Status saat planning" :subtitle="ui.label(selectedDue.status)" />
            <VListItem title="Basis" :subtitle="ui.label(selectedDue.nearestBasis)" />
            <VListItem title="Kalkulasi" :subtitle="selectedDue.calculationExplanation" />
            <VListItem
              title="Utilisasi"
              :subtitle="`${selectedDue.currentFlightHours} FH / ${selectedDue.currentFlightCycles} FC`"
            />
          </VList>
          <VTextarea
            v-model="planningNote"
            label="Catatan Planner"
            rows="3"
            class="mt-4"
            hide-details
          />
          <VAlert v-if="createError" type="error" variant="tonal" class="mt-4">
            {{ createError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" :disabled="createLoading" @click="selectedDue = null">Batal</VBtn>
          <VBtn color="primary" :loading="createLoading" @click="createWorkPackageFromDue">
            Create Work Package
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
