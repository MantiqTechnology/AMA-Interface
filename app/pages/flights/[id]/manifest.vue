<script setup lang="ts">
import type {
  DgDecision,
  FlightManifestCargoDto,
  FlightManifestDto,
  FlightManifestPassengerDto,
  FlightOperationDetailDto
} from '#shared/contracts/flight-operations';

type ManifestWorkspace = {
  flight: FlightOperationDetailDto;
  manifests: FlightManifestDto[];
  passengers: FlightManifestPassengerDto[];
  cargo: FlightManifestCargoDto[];
  permissions: {
    mayPrepare: boolean;
    mayReview: boolean;
    mayViewSensitive: boolean;
  };
};

const route = useRoute();
const flightId = computed(() => String(route.params.id));
const busy = ref('');
const actionError = ref('');
const reasonDialog = ref(false);
const reasonTitle = ref('');
const reason = ref('');
const pendingAction = ref<null | (() => Promise<void>)>(null);

const { data, pending, error, refresh } = await useAsyncData(
  () => `manifest-workspace-${flightId.value}`,
  () => fetchApi<ManifestWorkspace>(`/api/flight-operations/flights/${flightId.value}/manifest`)
);

const departureChecks = computed(() =>
  (data.value?.flight.readinessChecks ?? []).filter((check) => check.assurancePhase === 'DEPARTURE')
);

function manifestItems(manifest: FlightManifestDto) {
  return manifest.manifestType === 'PASSENGER'
    ? (data.value?.passengers.length ?? 0)
    : (data.value?.cargo.length ?? 0);
}

async function command(
  key: string,
  url: string,
  body: Record<string, unknown>,
  method: 'POST' = 'POST'
) {
  busy.value = key;
  actionError.value = '';
  try {
    await fetchApi(url, { method, body });
    await refresh();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : 'The action could not be saved.';
  } finally {
    busy.value = '';
  }
}

function requestReason(title: string, action: (reason: string) => Promise<void>) {
  reasonTitle.value = title;
  reason.value = '';
  pendingAction.value = () => action(reason.value.trim());
  reasonDialog.value = true;
}

async function confirmReason() {
  if (!reason.value.trim() || !pendingAction.value) return;
  await pendingAction.value();
  reasonDialog.value = false;
  pendingAction.value = null;
}

function submit(manifest: FlightManifestDto) {
  const itemCount = manifestItems(manifest);
  if (itemCount === 0) {
    requestReason('Empty load declaration', (emptyLoadReason) =>
      command(
        `submit-${manifest.id}`,
        `/api/flight-operations/manifests/${manifest.id}/actions/submit`,
        { expectedVersion: manifest.version, emptyLoadReason }
      )
    );
    return;
  }
  return command(
    `submit-${manifest.id}`,
    `/api/flight-operations/manifests/${manifest.id}/actions/submit`,
    { expectedVersion: manifest.version }
  );
}

function approve(manifest: FlightManifestDto) {
  return command(
    `approve-${manifest.id}`,
    `/api/flight-operations/manifests/${manifest.id}/actions/approve`,
    { expectedVersion: manifest.version }
  );
}

function lock(manifest: FlightManifestDto) {
  return command(
    `lock-${manifest.id}`,
    `/api/flight-operations/manifests/${manifest.id}/actions/lock`,
    { expectedVersion: manifest.version }
  );
}

function reject(manifest: FlightManifestDto) {
  requestReason('Reject manifest', (rejectionReason) =>
    command(
      `reject-${manifest.id}`,
      `/api/flight-operations/manifests/${manifest.id}/actions/reject`,
      { expectedVersion: manifest.version, reason: rejectionReason }
    )
  );
}

function unlock(manifest: FlightManifestDto) {
  requestReason('Unlock manifest', (unlockReason) =>
    command(
      `unlock-${manifest.id}`,
      `/api/flight-operations/manifests/${manifest.id}/actions/unlock`,
      { expectedVersion: manifest.version, reason: unlockReason }
    )
  );
}

function decideDg(item: FlightManifestCargoDto, decision: DgDecision) {
  const manifest = data.value?.manifests.find((candidate) => candidate.id === item.manifestId);
  if (!manifest) return;
  requestReason(
    `${decision === 'ACCEPTED' ? 'Accept' : 'Reject'} dangerous goods`,
    (decisionReason) =>
      command(
        `dg-${item.id}`,
        `/api/flight-operations/manifests/cargo/${item.id}/actions/decide-dg`,
        {
          expectedVersion: manifest.version,
          decision,
          reason: decisionReason,
          evidenceIds: [decisionReason]
        }
      )
  );
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <VBtn icon="mdi-arrow-left" :to="`/flights/${flightId}`" variant="text" />
      <div>
        <h1 class="text-h4 font-weight-bold">Manifest Control</h1>
        <p class="text-text-muted">
          {{ data?.flight.flightNumber ?? 'Flight' }} · operational load, DG review, approval and
          lock
        </p>
      </div>
      <VSpacer />
      <FlightsFlightStatusChip v-if="data" :status="data.flight.currentStatus" />
      <VBtn icon="mdi-refresh" variant="text" @click="refresh" />
    </div>

    <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
      Manifest workspace could not be loaded.
    </VAlert>
    <VAlert v-if="actionError" class="mb-4" closable type="error" variant="tonal">
      {{ actionError }}
    </VAlert>
    <VProgressLinear v-if="pending" class="mb-4" indeterminate />

    <VRow v-if="data">
      <VCol cols="12" lg="8">
        <VCard v-for="manifest in data.manifests" :key="manifest.id" border class="mb-4">
          <VCardTitle class="d-flex align-center">
            {{ manifest.manifestType === 'PASSENGER' ? 'Passenger / Patient' : 'Cargo' }}
            <VSpacer />
            <VChip size="small" variant="tonal">{{ manifest.status }}</VChip>
          </VCardTitle>
          <VCardText>
            <VRow dense>
              <VCol cols="6" md="3">
                <div class="text-caption text-text-muted">Items</div>
                <div class="text-h6">{{ manifestItems(manifest) }}</div>
              </VCol>
              <VCol cols="6" md="3">
                <div class="text-caption text-text-muted">Version</div>
                <div class="text-h6">{{ manifest.version }}</div>
              </VCol>
              <VCol cols="6" md="3">
                <div class="text-caption text-text-muted">Submitted</div>
                <div>{{ manifest.submittedAt ? 'Yes' : 'No' }}</div>
              </VCol>
              <VCol cols="6" md="3">
                <div class="text-caption text-text-muted">Locked</div>
                <div>{{ manifest.lockedAt ? 'Yes' : 'No' }}</div>
              </VCol>
            </VRow>
            <VAlert v-if="manifest.rejectionReason" class="mt-3" type="warning" variant="tonal">
              {{ manifest.rejectionReason }}
            </VAlert>

            <VTable v-if="manifest.manifestType === 'PASSENGER'" class="mt-4" density="compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Identity</th>
                  <th>Seat</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.passengers" :key="item.id">
                  <td>{{ item.fullName }}</td>
                  <td>{{ item.identityType ?? '-' }} · {{ item.identityNumber ?? '-' }}</td>
                  <td>{{ item.seatNumber ?? '-' }}</td>
                  <td>{{ (item.weightKg ?? 0) + (item.baggageWeightKg ?? 0) }} kg</td>
                </tr>
              </tbody>
            </VTable>

            <VTable v-else class="mt-4" density="compact">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Weight</th>
                  <th>DG</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.cargo" :key="item.id">
                  <td>{{ item.description }}</td>
                  <td>{{ item.actualWeightKg }} kg</td>
                  <td>{{ item.dgCategoryLabel ?? 'Non-DG' }}</td>
                  <td>
                    <div class="d-flex align-center gap-1">
                      <VChip size="x-small" variant="tonal">{{ item.dgAcceptanceStatus }}</VChip>
                      <template v-if="item.dgCategoryId && data.permissions.mayReview">
                        <VBtn
                          icon="mdi-check"
                          size="x-small"
                          variant="text"
                          @click="decideDg(item, 'ACCEPTED')"
                        />
                        <VBtn
                          color="error"
                          icon="mdi-close"
                          size="x-small"
                          variant="text"
                          @click="decideDg(item, 'REJECTED')"
                        />
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCardText>
          <VCardActions>
            <VBtn
              v-if="data.permissions.mayPrepare && manifest.status === 'DRAFT'"
              color="secondary"
              :loading="busy === `submit-${manifest.id}`"
              variant="tonal"
              @click="submit(manifest)"
            >
              Submit to OCC
            </VBtn>
            <template v-if="data.permissions.mayReview">
              <VBtn
                v-if="manifest.status === 'SUBMITTED'"
                color="success"
                :loading="busy === `approve-${manifest.id}`"
                variant="tonal"
                @click="approve(manifest)"
              >
                Approve
              </VBtn>
              <VBtn
                v-if="['SUBMITTED', 'APPROVED'].includes(manifest.status)"
                color="error"
                variant="text"
                @click="reject(manifest)"
              >
                Reject
              </VBtn>
              <VBtn
                v-if="manifest.status === 'APPROVED'"
                color="primary"
                :loading="busy === `lock-${manifest.id}`"
                variant="tonal"
                @click="lock(manifest)"
              >
                Lock Final
              </VBtn>
              <VBtn v-if="manifest.status === 'LOCKED'" variant="text" @click="unlock(manifest)">
                Unlock with reason
              </VBtn>
            </template>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <VCard border>
          <VCardTitle>Departure Assurance</VCardTitle>
          <VList density="compact">
            <VListItem
              v-for="check in departureChecks"
              :key="check.checkCode"
              :subtitle="check.resultNote"
              :title="check.checkName"
            >
              <template #append>
                <VIcon
                  :color="check.effectiveStatus === 'PASSED' ? 'success' : 'warning'"
                  :icon="
                    check.effectiveStatus === 'PASSED' ? 'mdi-check-circle' : 'mdi-alert-circle'
                  "
                />
              </template>
            </VListItem>
            <VListItem
              v-if="departureChecks.length === 0"
              subtitle="Run departure assurance after check-in is closed."
            />
          </VList>
          <VCardActions>
            <VBtn
              v-if="data.permissions.mayReview"
              block
              color="secondary"
              variant="tonal"
              @click="
                command(
                  'assurance',
                  `/api/flight-operations/flights/${flightId}/actions/evaluate-departure-assurance`,
                  {}
                )
              "
            >
              Evaluate Departure Assurance
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="reasonDialog" max-width="520">
      <VCard>
        <VCardTitle>{{ reasonTitle }}</VCardTitle>
        <VCardText>
          <VTextarea v-model="reason" autofocus label="Required reason / evidence reference" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="reasonDialog = false">Cancel</VBtn>
          <VBtn color="primary" :disabled="!reason.trim()" @click="confirmReason">Confirm</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VContainer>
</template>
