<script setup lang="ts">
import type {
  FlightOperationDetailDto,
  FlightOperationLookupsDto
} from '#shared/contracts/flight-operations';

const route = useRoute();
const id = computed(() => String(route.params.id));
const activeTab = ref('overview');
const actionError = ref('');
const actionLoading = ref(false);
const reasonDialog = ref(false);
const reasonAction = ref<'cancel' | 'divert' | 'reopen'>('cancel');
const reasonId = ref('');
const reasonNote = ref('');
const diversionStationId = ref('');

const { data: lookups } = await useAsyncData('flight-detail-lookups', () =>
  fetchApi<FlightOperationLookupsDto>('/api/flight-operations/lookups')
);
const {
  data: flight,
  pending,
  error,
  refresh
} = await useAsyncData(`flight-operation-${id.value}`, () =>
  fetchApi<FlightOperationDetailDto>(`/api/flight-operations/flights/${id.value}`)
);

const validActions = computed(() => {
  const status = flight.value?.currentStatus;
  if (!status) return [];
  const actions: Array<{ label: string; icon: string; action: string; color?: string }> = [];
  if (status === 'DRAFT' || status === 'REOPENED_FOR_CORRECTION') {
    actions.push({ label: 'Submit', icon: 'mdi-send', action: 'submit', color: 'secondary' });
  }
  if (status === 'PENDING_READINESS' || status === 'BLOCKED') {
    actions.push({ label: 'Re-evaluate', icon: 'mdi-refresh', action: 'evaluate' });
  }
  if (status === 'READY_FOR_APPROVAL') {
    actions.push({
      label: 'Approve',
      icon: 'mdi-check-decagram-outline',
      action: 'approve',
      color: 'success'
    });
  }
  if (status === 'APPROVED')
    actions.push({ label: 'Schedule', icon: 'mdi-calendar-check', action: 'schedule' });
  if (status === 'SCHEDULED')
    actions.push({
      label: 'Open Check-in',
      icon: 'mdi-account-check-outline',
      action: 'open-check-in'
    });
  if (status === 'CHECK_IN_OPEN')
    actions.push({ label: 'Depart', icon: 'mdi-airplane-takeoff', action: 'depart' });
  if (status === 'IN_PROGRESS') {
    actions.push({ label: 'Land', icon: 'mdi-airplane-landing', action: 'land' });
    actions.push({
      label: 'Divert',
      icon: 'mdi-map-marker-alert-outline',
      action: 'divert',
      color: 'warning'
    });
  }
  if (status === 'LANDED')
    actions.push({
      label: 'Pending Closure',
      icon: 'mdi-clipboard-check-outline',
      action: 'pending-closure'
    });
  if (status === 'PENDING_CLOSURE')
    actions.push({
      label: 'Close',
      icon: 'mdi-lock-check-outline',
      action: 'close',
      color: 'success'
    });
  if (!['CLOSED', 'CANCELLED'].includes(status))
    actions.push({ label: 'Cancel', icon: 'mdi-cancel', action: 'cancel', color: 'error' });
  if (status === 'CLOSED')
    actions.push({
      label: 'Reopen',
      icon: 'mdi-lock-open-outline',
      action: 'reopen',
      color: 'warning'
    });
  return actions;
});

const closureItems = computed(() => {
  const item = flight.value;
  if (!item) return [];
  return [
    {
      label: 'Manifest locked/approved',
      done: item.manifests.every((manifest) => ['APPROVED', 'LOCKED'].includes(manifest.status))
    },
    {
      label: 'Fuel complete',
      done: item.fuelRequests.some((fuel) => ['UPLIFTED', 'POSTED'].includes(fuel.status))
    },
    {
      label: 'Station cost approved',
      done:
        item.stationCosts.length === 0 ||
        item.stationCosts.every((cost) => cost.status === 'APPROVED')
    },
    {
      label: 'Maintenance approved or N/A',
      done:
        item.maintenanceHandoffs.length === 0 ||
        item.maintenanceHandoffs.every((handoff) => handoff.status === 'APPROVED')
    },
    {
      label: 'Actual times recorded',
      done: Boolean(item.actualDepartureAt && item.actualArrivalAt)
    }
  ];
});

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

function money(value: number | null, currency = 'IDR') {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function actionUrl(action: string) {
  return `/api/flight-operations/flights/${id.value}/actions/${action}`;
}

async function runAction(action: string) {
  actionError.value = '';
  if (action === 'cancel' || action === 'divert' || action === 'reopen') {
    reasonAction.value = action;
    reasonDialog.value = true;
    return;
  }

  actionLoading.value = true;
  try {
    const body =
      action === 'depart' || action === 'land' ? { actualAt: new Date().toISOString() } : {};
    await fetchApi<FlightOperationDetailDto>(actionUrl(action), { method: 'POST', body });
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}

async function submitReasonAction() {
  actionLoading.value = true;
  actionError.value = '';
  try {
    await fetchApi<FlightOperationDetailDto>(actionUrl(reasonAction.value), {
      method: 'POST',
      body: {
        reasonId: reasonId.value,
        reasonNote: reasonNote.value,
        diversionStationId: diversionStationId.value || undefined
      }
    });
    reasonDialog.value = false;
    reasonId.value = '';
    reasonNote.value = '';
    diversionStationId.value = '';
    await refresh();
  } catch (errorValue) {
    actionError.value = errorValue instanceof Error ? errorValue.message : 'Action failed';
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <VAlert v-if="error" type="error" variant="tonal">Unable to load flight.</VAlert>
    <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">{{ actionError }}</VAlert>

    <template v-if="flight && !pending">
      <VCard border class="mb-4">
        <VCardText>
          <div class="flex flex-wrap items-center gap-4">
            <div class="min-w-0">
              <h1 class="text-h4 font-weight-bold text-text-primary">{{ flight.flightNumber }}</h1>
              <p class="text-text-muted">
                {{ flight.originStationCode }} -> {{ flight.destinationStationCode }} |
                {{ flight.flightType }} | {{ flight.aircraftRegistration ?? 'No aircraft' }}
              </p>
            </div>
            <VSpacer />
            <FlightsFlightStatusChip :status="flight.currentStatus" />
            <div class="w-44">
              <VProgressLinear
                color="secondary"
                height="8"
                rounded
                :model-value="flight.readinessPercent"
              />
              <div class="mt-1 text-xs text-text-secondary">{{ flight.readinessSummary }}</div>
            </div>
            <VBtn
              v-for="action in validActions"
              :key="action.action"
              :color="action.color"
              :disabled="actionLoading"
              :loading="actionLoading"
              :prepend-icon="action.icon"
              :variant="action.color ? 'flat' : 'tonal'"
              @click="runAction(action.action)"
            >
              {{ action.label }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>

      <VCard border>
        <VTabs v-model="activeTab" bg-color="surface" show-arrows>
          <VTab value="overview">Overview</VTab>
          <VTab value="assignment">Assignment</VTab>
          <VTab value="readiness">Readiness</VTab>
          <VTab value="manifest">Manifest Summary</VTab>
          <VTab value="fuel">Fuel Summary</VTab>
          <VTab value="station">Station Summary</VTab>
          <VTab value="actual">Actual & Closure</VTab>
          <VTab value="maintenance">Maintenance</VTab>
          <VTab value="finance">Finance Handoff</VTab>
          <VTab value="history">History</VTab>
        </VTabs>

        <VDivider />

        <VWindow v-model="activeTab">
          <VWindowItem value="overview">
            <VCardText>
              <VRow>
                <VCol cols="12" md="3">
                  <strong>Flight Date</strong>
                  <div>{{ flight.flightDate }}</div>
                </VCol>
                <VCol cols="12" md="3">
                  <strong>Customer</strong>
                  <div>{{ flight.customerName ?? '-' }}</div>
                </VCol>
                <VCol cols="12" md="3">
                  <strong>Scheduled</strong>
                  <div>{{ formatDate(flight.scheduledDepartureAt) }}</div>
                </VCol>
                <VCol cols="12" md="3">
                  <strong>Actual</strong>
                  <div>
                    {{ formatDate(flight.actualDepartureAt) }} ->
                    {{ formatDate(flight.actualArrivalAt) }}
                  </div>
                </VCol>
              </VRow>
              <VAlert v-if="flight.blockingReason" class="mt-4" type="warning" variant="tonal">
                {{ flight.blockingReason }}
              </VAlert>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="assignment">
            <VCardText>
              <VTable>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Crew</th>
                    <th>Employee</th>
                    <th>License</th>
                    <th>Medical</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="crew in flight.crewAssignments" :key="crew.id">
                    <td>{{ crew.assignmentRole.replaceAll('_', ' ') }}</td>
                    <td>{{ crew.crewName }}</td>
                    <td>{{ crew.employeeCode }}</td>
                    <td>{{ crew.licenseExpiryDate ?? '-' }}</td>
                    <td>{{ crew.medicalExpiryDate ?? '-' }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="readiness">
            <VCardText>
              <VBtn
                class="mb-3"
                prepend-icon="mdi-refresh"
                variant="tonal"
                @click="runAction('evaluate')"
              >
                Re-evaluate Readiness
              </VBtn>
              <VTable>
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="check in flight.readinessChecks" :key="check.id">
                    <td>{{ check.checkName }}</td>
                    <td><FlightsFlightStatusChip :status="check.status" /></td>
                    <td>{{ check.resultNote }}</td>
                    <td>{{ check.sourceReference }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="manifest">
            <VCardText>
              <VRow>
                <VCol v-for="manifest in flight.manifests" :key="manifest.id" cols="12" md="6">
                  <VCard border>
                    <VCardTitle>{{ manifest.manifestType }}</VCardTitle>
                    <VCardText>
                      <FlightsFlightStatusChip :status="manifest.status" />
                      <div class="mt-3">
                        Passengers: {{ manifest.passengerCount }} /
                        {{ manifest.passengerWeightKg }} kg
                      </div>
                      <div>
                        Cargo: {{ manifest.cargoCount }} / {{ manifest.cargoActualWeightKg }} kg
                      </div>
                      <div>DG pending: {{ manifest.dgPendingCount }}</div>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>
              <VBtn class="mt-4" to="/flights/manifest" variant="tonal">
                Open Manifest Worklist
              </VBtn>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="fuel">
            <VCardText>
              <VTable>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Actual</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fuel in flight.fuelRequests" :key="fuel.id">
                    <td>{{ fuel.supplierName }}</td>
                    <td><FlightsFlightStatusChip :status="fuel.status" /></td>
                    <td>{{ fuel.requestedQuantityLitre }} L</td>
                    <td>{{ fuel.actualUpliftLitre ?? '-' }} L</td>
                    <td>{{ money(fuel.totalCost) }}</td>
                  </tr>
                </tbody>
              </VTable>
              <VBtn class="mt-4" to="/flights/fuel" variant="tonal">Open Fuel Control</VBtn>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="station">
            <VCardText>
              <VTable>
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Supplier</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="service in flight.stationServices" :key="service.id">
                    <td>{{ service.stationCode }}</td>
                    <td>{{ service.supplierName }}</td>
                    <td>{{ service.serviceType }}</td>
                    <td><FlightsFlightStatusChip :status="service.status" /></td>
                    <td>{{ money(service.referenceRate) }}</td>
                  </tr>
                </tbody>
              </VTable>
              <VBtn class="mt-4" to="/flights/station-operations" variant="tonal">
                Open Station Operations
              </VBtn>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="actual">
            <VCardText>
              <VList density="compact">
                <VListItem v-for="item in closureItems" :key="item.label">
                  <template #prepend>
                    <VIcon
                      :color="item.done ? 'success' : 'warning'"
                      :icon="item.done ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"
                    />
                  </template>
                  <VListItemTitle>{{ item.label }}</VListItemTitle>
                </VListItem>
              </VList>
              <VBtn class="mt-4" to="/flights/actual-closure" variant="tonal">
                Open Actual & Closure Queue
              </VBtn>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="maintenance">
            <VCardText>
              <VTable>
                <thead>
                  <tr>
                    <th>Aircraft</th>
                    <th>Status</th>
                    <th>WO Ref</th>
                    <th>Cost</th>
                    <th>Approval</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="handoff in flight.maintenanceHandoffs" :key="handoff.id">
                    <td>{{ handoff.aircraftRegistration }}</td>
                    <td>{{ handoff.serviceabilityStatus }}</td>
                    <td>{{ handoff.workOrderReference ?? '-' }}</td>
                    <td>{{ money(handoff.maintenanceCost, handoff.currencyCode) }}</td>
                    <td><FlightsFlightStatusChip :status="handoff.status" /></td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="finance">
            <VCardText>
              <VAlert class="mb-3" type="info" variant="tonal">
                Read-only preview. No general ledger or invoice issuance is created in this module.
              </VAlert>
              <VTable>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Summary</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="handoff in flight.financeHandoffs" :key="handoff.id">
                    <td>{{ handoff.eventType.replaceAll('_', ' ') }}</td>
                    <td><FlightsFlightStatusChip :status="handoff.status" /></td>
                    <td>{{ handoff.summary }}</td>
                    <td>{{ money(handoff.amount, handoff.currencyCode ?? 'IDR') }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VWindowItem>

          <VWindowItem value="history">
            <VCardText>
              <VTimeline density="compact" side="end">
                <VTimelineItem
                  v-for="history in flight.histories"
                  :key="history.id"
                  dot-color="secondary"
                  size="small"
                >
                  <div class="font-weight-medium">
                    {{ history.actionType }} -> {{ history.toStatus }}
                  </div>
                  <div class="text-sm text-text-secondary">
                    {{ formatDate(history.changedAt) }} | {{ history.changedByUserId }}
                  </div>
                  <div v-if="history.reasonLabel || history.reasonNote" class="text-sm">
                    {{ history.reasonLabel }}
                    {{ history.reasonNote ? `- ${history.reasonNote}` : '' }}
                  </div>
                </VTimelineItem>
              </VTimeline>
            </VCardText>
          </VWindowItem>
        </VWindow>
      </VCard>

      <VDialog v-model="reasonDialog" max-width="520">
        <VCard>
          <VCardTitle>{{ reasonAction.replace('-', ' ') }}</VCardTitle>
          <VCardText>
            <VSelect
              v-model="reasonId"
              class="mb-3"
              item-title="title"
              item-value="value"
              label="Reason"
              :items="lookups?.flightReasons ?? []"
              variant="outlined"
            />
            <VSelect
              v-if="reasonAction === 'divert'"
              v-model="diversionStationId"
              class="mb-3"
              item-title="title"
              item-value="value"
              label="Diversion station"
              :items="lookups?.stations ?? []"
              variant="outlined"
            />
            <VTextarea v-model="reasonNote" label="Reason note" rows="3" variant="outlined" />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="reasonDialog = false">Cancel</VBtn>
            <VBtn
              color="secondary"
              :disabled="!reasonId"
              :loading="actionLoading"
              @click="submitReasonAction"
            >
              Confirm
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </template>
  </VContainer>
</template>
