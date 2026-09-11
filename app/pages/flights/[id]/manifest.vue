<script setup lang="ts">
import type {
  DgDecision,
  FlightManifestCargoDto,
  FlightManifestDto,
  FlightManifestPassengerDto,
  FlightNextActionDto,
  FlightOperationDetailDto,
  FlightReadinessCheckDto
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

type DomainTone = 'danger' | 'warning' | 'success' | 'info';

type DomainCard = {
  key: string;
  title: string;
  icon: string;
  tone: DomainTone;
  status: string;
  metric: string;
  subtitle: string;
};

type RequiredAction = {
  id: string;
  title: string;
  description: string;
  impact: string;
  owner: string;
  icon: string;
  tone: DomainTone;
  buttonLabel: string;
  actionKind?: 'add-passenger' | 'add-cargo' | 'review-actions';
  href?: string | null;
};

const route = useRoute();
const flightId = computed(() => String(route.params.id));
const busy = ref('');
const actionError = ref('');
const reasonDialog = ref(false);
const reasonTitle = ref('');
const reason = ref('');
const pendingAction = ref<null | (() => Promise<void>)>(null);
const passengerDialog = ref(false);
const cargoDialog = ref(false);
const requiredActionsPanel = ref<HTMLElement | null>(null);

const passengerForm = reactive({
  fullName: '',
  identityType: 'KTP',
  identityNumber: '',
  seatNumber: '',
  weightKg: 72 as number | null,
  baggageWeightKg: 0 as number | null,
  remarks: ''
});

const cargoForm = reactive({
  description: '',
  senderName: '',
  receiverName: '',
  actualWeightKg: 0 as number | null,
  volumeWeightKg: null as number | null,
  chargeableWeightKg: null as number | null,
  dgCategoryId: '',
  dgAcceptanceStatusId: 'dg-acceptance-status-not-applicable',
  remarks: ''
});

const { data, pending, error, refresh } = await useAsyncData(
  () => `manifest-workspace-${flightId.value}`,
  () => fetchApi<ManifestWorkspace>(`/api/flight-operations/flights/${flightId.value}/manifest`)
);

const manifests = computed(() => data.value?.manifests ?? []);
const passengerManifest = computed(() =>
  manifests.value.find((manifest) => manifest.manifestType === 'PASSENGER')
);
const cargoManifest = computed(() =>
  manifests.value.find((manifest) => manifest.manifestType === 'CARGO')
);
const passengerRows = computed(
  () =>
    data.value?.passengers.filter((item) => item.manifestId === passengerManifest.value?.id) ?? []
);
const cargoRows = computed(
  () => data.value?.cargo.filter((item) => item.manifestId === cargoManifest.value?.id) ?? []
);
const dgCargoRows = computed(() => cargoRows.value.filter((item) => Boolean(item.dgCategoryId)));
const departureChecks = computed(() =>
  (data.value?.flight.readinessChecks ?? []).filter((check) => check.assurancePhase === 'DEPARTURE')
);
const actionableDepartureChecks = computed(() =>
  departureChecks.value.filter((check) => check.effectiveStatus !== 'NOT_APPLICABLE')
);
const passedDepartureChecks = computed(
  () => actionableDepartureChecks.value.filter((check) => check.effectiveStatus === 'PASSED').length
);
const blockedDepartureChecks = computed(() =>
  actionableDepartureChecks.value.filter((check) => check.effectiveStatus === 'BLOCKED')
);
const pendingDepartureChecks = computed(() =>
  actionableDepartureChecks.value.filter(
    (check) => check.effectiveStatus === 'WARNING' || check.status === 'PENDING'
  )
);
const totalBlockers = computed(() => blockedDepartureChecks.value.length);
const totalPending = computed(() => pendingDepartureChecks.value.length);
const departureReady = computed(
  () =>
    actionableDepartureChecks.value.length > 0 &&
    passedDepartureChecks.value === actionableDepartureChecks.value.length
);

const gateTone = computed<DomainTone>(() => {
  if (totalBlockers.value > 0) return 'danger';
  if (totalPending.value > 0 || actionableDepartureChecks.value.length === 0) return 'warning';
  return 'success';
});
const gateTitle = computed(() => {
  if (gateTone.value === 'success') return 'Departure ready';
  if (gateTone.value === 'warning') return 'Departure pending review';
  return 'Departure not ready';
});
const gateSummary = computed(() =>
  [
    `${totalBlockers.value} ${totalBlockers.value === 1 ? 'blocker' : 'blockers'}`,
    `${totalPending.value} pending ${totalPending.value === 1 ? 'check' : 'checks'}`
  ].join(' - ')
);
const gateMessage = computed(() => {
  if (gateTone.value === 'success') return 'All departure assurance checks are currently clear.';
  const firstBlocker = blockedDepartureChecks.value[0];
  if (firstBlocker?.recommendedAction) return firstBlocker.recommendedAction;
  if (firstBlocker?.resultNote) return firstBlocker.resultNote;
  return 'Complete passenger, cargo, DG, fuel, handling, documents and origin sign-off gates.';
});

const workflowManifestStatus = computed(() => {
  const hasDraft = manifests.value.some((manifest) => manifest.status === 'DRAFT');
  const hasSubmitted = manifests.value.some((manifest) => manifest.status === 'SUBMITTED');
  const allLocked =
    manifests.value.length > 0 && manifests.value.every((manifest) => manifest.status === 'LOCKED');
  if (allLocked) return { label: 'Manifests Locked', tone: 'success' as DomainTone };
  if (hasSubmitted) return { label: 'Manifest Submitted', tone: 'warning' as DomainTone };
  if (hasDraft) return { label: 'Manifest Draft', tone: 'warning' as DomainTone };
  return { label: 'Manifest Approved', tone: 'info' as DomainTone };
});
const routeDisplay = computed(() => {
  const flight = data.value?.flight;
  return flight ? `${flight.originStationCode} -> ${flight.destinationStationCode}` : '-';
});

const domainCards = computed<DomainCard[]>(() => {
  const passengerCount = passengerManifest.value?.passengerCount ?? passengerRows.value.length;
  const passengerWeight = passengerManifest.value?.passengerWeightKg ?? 0;
  const cargoCount = cargoManifest.value?.cargoCount ?? cargoRows.value.length;
  const cargoWeight = cargoManifest.value?.cargoActualWeightKg ?? 0;
  const dgPendingCount = cargoManifest.value?.dgPendingCount ?? 0;
  const dgRejectedCount = cargoManifest.value?.dgRejectedCount ?? 0;
  const dgTone: DomainTone =
    dgRejectedCount > 0 ? 'danger' : dgPendingCount > 0 ? 'warning' : 'success';

  return [
    {
      key: 'passenger',
      title: 'Passenger',
      icon: 'mdi-account-outline',
      tone: passengerCount > 0 || passengerManifest.value?.emptyLoadReason ? 'success' : 'danger',
      status: passengerCount > 0 ? 'Prepared' : 'Not Prepared',
      metric: `${passengerCount} ${passengerCount === 1 ? 'person' : 'persons'}`,
      subtitle:
        passengerWeight > 0 ? `${formatWeight(passengerWeight)} manifest weight` : 'No load on file'
    },
    {
      key: 'cargo',
      title: 'Cargo',
      icon: 'mdi-package-variant-closed',
      tone: cargoCount > 0 || cargoManifest.value?.emptyLoadReason ? 'success' : 'danger',
      status: cargoCount > 0 ? 'Prepared' : 'Not Prepared',
      metric: `${formatWeight(cargoWeight)}`,
      subtitle: `${cargoCount} ${cargoCount === 1 ? 'shipment' : 'shipments'} recorded`
    },
    {
      key: 'dg',
      title: 'Dangerous Goods',
      icon: 'mdi-fire-alert',
      tone: dgCargoRows.value.length === 0 ? 'warning' : dgTone,
      status:
        dgCargoRows.value.length === 0
          ? 'Pending Review'
          : dgRejectedCount > 0
            ? 'Rejected'
            : dgPendingCount > 0
              ? 'Pending Review'
              : 'Accepted',
      metric: `${dgCargoRows.value.length} DG ${dgCargoRows.value.length === 1 ? 'item' : 'items'}`,
      subtitle:
        dgPendingCount > 0
          ? `${dgPendingCount} awaiting OCC decision`
          : dgCargoRows.value.length === 0
            ? 'No DG item declared yet'
            : 'DG evidence recorded'
    },
    {
      key: 'assurance',
      title: 'Departure Assurance',
      icon: 'mdi-shield-check-outline',
      tone: gateTone.value,
      status: `${passedDepartureChecks.value} / ${actionableDepartureChecks.value.length} Passed`,
      metric:
        totalBlockers.value > 0
          ? `${totalBlockers.value} blocked`
          : departureReady.value
            ? 'All clear'
            : `${totalPending.value} pending`,
      subtitle:
        actionableDepartureChecks.value.length > 0
          ? 'Final gate before origin sign-off'
          : 'Run assurance to create gate evidence'
    }
  ];
});

const requiredActions = computed<RequiredAction[]>(() => {
  const actions: RequiredAction[] = [];
  if (passengerManifest.value && passengerRows.value.length === 0) {
    actions.push({
      id: 'passenger-empty',
      title: 'Passenger manifest not prepared',
      description: 'Add passengers or declare a zero passenger load before OCC sign-off.',
      impact: 'Impact: Departure blocked',
      owner: 'Origin Ops',
      icon: 'mdi-close-circle-outline',
      tone: 'danger',
      buttonLabel: 'Add Passenger',
      actionKind: 'add-passenger'
    });
  }
  if (cargoManifest.value && cargoRows.value.length === 0) {
    actions.push({
      id: 'cargo-empty',
      title: 'Cargo manifest not prepared',
      description: 'Add cargo or declare no cargo before the final manifest snapshot.',
      impact: 'Impact: Departure blocked',
      owner: 'Origin Ops',
      icon: 'mdi-close-circle-outline',
      tone: 'danger',
      buttonLabel: 'Add Cargo',
      actionKind: 'add-cargo'
    });
  }
  if (manifests.value.some((manifest) => manifest.status !== 'LOCKED')) {
    actions.push({
      id: 'manifest-lock',
      title: 'Required manifests not locked',
      description: 'Passenger and cargo manifests must be locked before origin station sign-off.',
      impact: 'Impact: Prevents origin sign-off',
      owner: 'Origin Ops',
      icon: 'mdi-alert-outline',
      tone: 'warning',
      buttonLabel: 'Review Actions',
      actionKind: 'review-actions'
    });
  }

  const commandCenterActions = (data.value?.flight.commandCenter?.nextRequiredActions ?? [])
    .filter((item) => item.domain === 'MANIFEST')
    .slice(0, Math.max(0, 5 - actions.length))
    .map(mapCommandCenterAction);

  return [...actions, ...commandCenterActions];
});

const passengerCanSubmit = computed(() => passengerForm.fullName.trim().length > 0);
const cargoCanSubmit = computed(
  () => cargoForm.description.trim().length > 0 && Number(cargoForm.actualWeightKg ?? -1) >= 0
);

function mapCommandCenterAction(item: FlightNextActionDto): RequiredAction {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    impact: `Impact: ${item.urgency.toLowerCase().replaceAll('_', ' ')}`,
    owner: item.ownerStationCode
      ? `${item.ownerRoleCodes[0] ?? 'Owner'} - ${item.ownerStationCode}`
      : (item.ownerRoleCodes[0] ?? 'Flight Ops'),
    icon: item.urgency === 'BLOCKING' ? 'mdi-close-circle-outline' : 'mdi-alert-circle-outline',
    tone: item.urgency === 'BLOCKING' ? 'danger' : 'warning',
    buttonLabel: item.href ? 'Open Task' : 'Review',
    href: item.href
  };
}

function manifestItems(manifest: FlightManifestDto) {
  return manifest.manifestType === 'PASSENGER'
    ? (manifest.passengerCount ?? passengerRows.value.length)
    : (manifest.cargoCount ?? cargoRows.value.length);
}

function manifestTitle(manifest: FlightManifestDto) {
  return manifest.manifestType === 'PASSENGER' ? 'Passenger / Patient Manifest' : 'Cargo Manifest';
}

function manifestSubtitle(manifest: FlightManifestDto) {
  if (manifest.manifestType === 'PASSENGER') {
    return manifest.passengerCount > 0
      ? `${manifest.passengerCount} passenger records loaded`
      : 'Add passengers or declare zero load for this flight.';
  }
  return manifest.cargoCount > 0
    ? `${manifest.cargoCount} shipment records loaded`
    : 'Add cargo or declare no cargo for this flight.';
}

function canSubmitManifest(manifest: FlightManifestDto) {
  return manifest.status === 'DRAFT' && manifestItems(manifest) > 0;
}

function checkDescription(check: FlightReadinessCheckDto) {
  return check.resultNote || check.recommendedAction || statusLabel(check.effectiveStatus);
}

function statusLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function toneColor(tone: DomainTone) {
  if (tone === 'danger') return 'error';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'info';
}

function toneIcon(check: FlightReadinessCheckDto) {
  if (check.effectiveStatus === 'PASSED') return 'mdi-check-circle';
  if (check.effectiveStatus === 'BLOCKED') return 'mdi-close-circle';
  if (check.effectiveStatus === 'NOT_APPLICABLE') return 'mdi-minus-circle-outline';
  return 'mdi-alert-circle';
}

function checkTone(check: FlightReadinessCheckDto): DomainTone {
  if (check.effectiveStatus === 'PASSED') return 'success';
  if (check.effectiveStatus === 'BLOCKED') return 'danger';
  if (check.effectiveStatus === 'NOT_APPLICABLE') return 'info';
  return 'warning';
}

function formatDate(value: string | null, dateOnly = false) {
  if (!value) return '-';
  const normalized = value.length === 10 ? `${value}T00:00:00+09:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(dateOnly
      ? {}
      : {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jayapura',
          timeZoneName: 'short'
        })
  }).format(date);
}

function formatWeight(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(safeValue)} kg`;
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || '-';
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  const manifest = manifests.value.find((candidate) => candidate.id === item.manifestId);
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

function resetPassengerForm() {
  passengerForm.fullName = '';
  passengerForm.identityType = 'KTP';
  passengerForm.identityNumber = '';
  passengerForm.seatNumber = '';
  passengerForm.weightKg = 72;
  passengerForm.baggageWeightKg = 0;
  passengerForm.remarks = '';
}

function resetCargoForm() {
  cargoForm.description = '';
  cargoForm.senderName = '';
  cargoForm.receiverName = '';
  cargoForm.actualWeightKg = 0;
  cargoForm.volumeWeightKg = null;
  cargoForm.chargeableWeightKg = null;
  cargoForm.dgCategoryId = '';
  cargoForm.dgAcceptanceStatusId = 'dg-acceptance-status-not-applicable';
  cargoForm.remarks = '';
}

function openPassengerDialog() {
  resetPassengerForm();
  passengerDialog.value = true;
}

function openCargoDialog() {
  resetCargoForm();
  cargoDialog.value = true;
}

async function addPassenger() {
  const manifest = passengerManifest.value;
  if (!manifest || !passengerCanSubmit.value) return;
  busy.value = 'add-passenger';
  actionError.value = '';
  try {
    await fetchApi('/api/flight-operations/manifests/passengers', {
      method: 'POST',
      body: {
        manifestId: manifest.id,
        expectedVersion: manifest.version,
        fullName: passengerForm.fullName.trim(),
        identityType: emptyToNull(passengerForm.identityType),
        identityNumber: emptyToNull(passengerForm.identityNumber),
        weightKg: numberOrNull(passengerForm.weightKg),
        seatNumber: emptyToNull(passengerForm.seatNumber),
        baggageWeightKg: numberOrNull(passengerForm.baggageWeightKg),
        remarks: emptyToNull(passengerForm.remarks)
      }
    });
    passengerDialog.value = false;
    await refresh();
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Passenger manifest could not be updated.';
  } finally {
    busy.value = '';
  }
}

async function addCargo() {
  const manifest = cargoManifest.value;
  if (!manifest || !cargoCanSubmit.value) return;
  busy.value = 'add-cargo';
  actionError.value = '';
  try {
    await fetchApi('/api/flight-operations/manifests/cargo', {
      method: 'POST',
      body: {
        manifestId: manifest.id,
        expectedVersion: manifest.version,
        description: cargoForm.description.trim(),
        senderName: emptyToNull(cargoForm.senderName),
        receiverName: emptyToNull(cargoForm.receiverName),
        actualWeightKg: Number(cargoForm.actualWeightKg ?? 0),
        volumeWeightKg: numberOrNull(cargoForm.volumeWeightKg),
        chargeableWeightKg: numberOrNull(cargoForm.chargeableWeightKg),
        dgCategoryId: emptyToNull(cargoForm.dgCategoryId),
        dgAcceptanceStatusId: cargoForm.dgAcceptanceStatusId,
        remarks: emptyToNull(cargoForm.remarks)
      }
    });
    cargoDialog.value = false;
    await refresh();
  } catch (caught) {
    actionError.value =
      caught instanceof Error ? caught.message : 'Cargo manifest could not be updated.';
  } finally {
    busy.value = '';
  }
}

async function scrollToRequiredActions() {
  await nextTick();
  requiredActionsPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleRequiredAction(item: RequiredAction) {
  if (item.actionKind === 'add-passenger') {
    openPassengerDialog();
    return;
  }
  if (item.actionKind === 'add-cargo') {
    openCargoDialog();
    return;
  }
  if (item.actionKind === 'review-actions') {
    await scrollToRequiredActions();
    return;
  }
  if (item.href) {
    await navigateTo(item.href);
  }
}
</script>

<template>
  <VContainer class="manifest-page px-3 py-5 md:px-4" fluid>
    <div class="manifest-shell">
      <header class="manifest-topbar">
        <div class="manifest-title-group">
          <VBtn
            aria-label="Back to flight detail"
            class="manifest-icon-button"
            icon="mdi-arrow-left"
            :to="`/flights/${flightId}`"
            variant="text"
          />
          <div class="manifest-heading-copy">
            <p class="manifest-eyebrow">Flight Control</p>
            <h1>Manifest Control</h1>
          </div>
        </div>
        <div class="manifest-topbar__actions">
          <DsStatusBadge
            v-if="data"
            :label="data.flight.currentStatusLabel"
            :value="data.flight.currentStatus"
          />
          <VBtn
            aria-label="Refresh manifest workspace"
            class="manifest-icon-button"
            icon="mdi-refresh"
            :loading="pending"
            variant="text"
            @click="refresh"
          />
        </div>
      </header>

      <VAlert v-if="error" class="mb-4" type="error" variant="tonal">
        Manifest workspace could not be loaded.
      </VAlert>
      <VAlert v-if="actionError" class="mb-4" closable type="error" variant="tonal">
        {{ actionError }}
      </VAlert>
      <VProgressLinear v-if="pending" class="mb-4" color="primary" indeterminate />

      <template v-if="data">
        <section class="flight-strip" aria-label="Flight manifest metadata">
          <div class="flight-strip__item">
            <span>Flight</span>
            <strong>{{ data.flight.flightNumber }}</strong>
          </div>
          <div class="flight-strip__item">
            <span>Route</span>
            <strong>{{ routeDisplay }}</strong>
          </div>
          <div class="flight-strip__item">
            <span>Date</span>
            <strong>{{ formatDate(data.flight.flightDate, true) }}</strong>
          </div>
          <div class="flight-strip__item">
            <span>Aircraft</span>
            <strong>{{ displayValue(data.flight.aircraftRegistration) }}</strong>
          </div>
          <div class="flight-strip__item">
            <span>Service type</span>
            <strong>{{ data.flight.serviceTypeLabel }}</strong>
          </div>
          <div class="flight-strip__item">
            <span>Scheduled departure</span>
            <strong>{{ formatDate(data.flight.scheduledDepartureAt) }}</strong>
          </div>
          <div class="flight-strip__badges">
            <VChip color="primary" prepend-icon="mdi-calendar-clock" size="small" variant="tonal">
              {{ data.flight.currentStatusLabel }}
            </VChip>
            <VChip
              :color="toneColor(workflowManifestStatus.tone)"
              prepend-icon="mdi-clipboard-text-clock-outline"
              size="small"
              variant="tonal"
            >
              {{ workflowManifestStatus.label }}
            </VChip>
            <VChip
              :color="toneColor(gateTone)"
              prepend-icon="mdi-airplane-alert"
              size="small"
              variant="tonal"
            >
              {{ gateTone === 'success' ? 'Departure Clear' : 'Departure Blocked' }}
            </VChip>
          </div>
        </section>

        <section class="gate-banner" :class="`gate-banner--${gateTone}`">
          <div class="gate-banner__mark">
            <VIcon
              :icon="
                gateTone === 'success'
                  ? 'mdi-check'
                  : gateTone === 'warning'
                    ? 'mdi-alert'
                    : 'mdi-close'
              "
            />
          </div>
          <div class="gate-banner__copy">
            <h2>{{ gateTitle }}</h2>
            <strong>{{ gateSummary }}</strong>
            <p>{{ gateMessage }}</p>
          </div>
          <div class="gate-banner__meta">
            <span>Owner</span>
            <strong><VIcon icon="mdi-account-outline" /> Origin Operations</strong>
            <span>Updated</span>
            <strong>{{ formatDate(data.flight.updatedAt) }}</strong>
          </div>
          <VBtn
            append-icon="mdi-chevron-right"
            class="gate-banner__action"
            color="primary"
            size="large"
            @click="scrollToRequiredActions"
          >
            Review Required Actions
          </VBtn>
        </section>

        <section class="domain-grid" aria-label="Manifest domains">
          <button
            v-for="card in domainCards"
            :key="card.key"
            class="domain-card"
            :class="`domain-card--${card.tone}`"
            type="button"
            @click="card.key === 'assurance' ? scrollToRequiredActions() : undefined"
          >
            <span class="domain-card__icon">
              <VIcon :icon="card.icon" />
            </span>
            <span class="domain-card__body">
              <strong>{{ card.title }}</strong>
              <em>{{ card.status }}</em>
              <small>{{ card.metric }}</small>
              <span>{{ card.subtitle }}</span>
            </span>
            <VIcon class="domain-card__chevron" icon="mdi-chevron-right" />
          </button>
        </section>

        <div class="manifest-workspace">
          <main class="manifest-main">
            <VCard v-for="manifest in manifests" :key="manifest.id" border class="manifest-panel">
              <div class="manifest-panel__head">
                <div>
                  <div class="manifest-panel__title-row">
                    <h2>{{ manifestTitle(manifest) }}</h2>
                    <DsStatusBadge :label="statusLabel(manifest.status)" :value="manifest.status" />
                  </div>
                  <p>{{ manifestSubtitle(manifest) }}</p>
                </div>
                <div class="manifest-panel__facts">
                  <div>
                    <span>Items</span>
                    <strong>{{ manifestItems(manifest) }}</strong>
                  </div>
                  <div>
                    <span>Version</span>
                    <strong>{{ manifest.version }}</strong>
                  </div>
                  <div>
                    <span>Submitted</span>
                    <strong>{{ manifest.submittedAt ? 'Yes' : 'No' }}</strong>
                  </div>
                  <div>
                    <span>Locked</span>
                    <strong>{{ manifest.lockedAt ? 'Yes' : 'No' }}</strong>
                  </div>
                  <div>
                    <span>Owner</span>
                    <strong><VIcon icon="mdi-account-outline" /> Origin Ops</strong>
                  </div>
                </div>
              </div>

              <VAlert
                v-if="manifest.rejectionReason"
                class="mx-4 mb-3"
                type="warning"
                variant="tonal"
              >
                {{ manifest.rejectionReason }}
              </VAlert>

              <div class="manifest-table-wrap">
                <VTable
                  v-if="manifest.manifestType === 'PASSENGER'"
                  class="manifest-table manifest-table--passenger"
                  density="compact"
                >
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Identity</th>
                      <th>Seat</th>
                      <th>Weight</th>
                      <th>Special Handling</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in passengerRows" :key="item.id">
                      <td>{{ item.fullName }}</td>
                      <td>{{ displayValue(item.identityType) }}</td>
                      <td>{{ displayValue(item.identityNumber) }}</td>
                      <td>{{ displayValue(item.seatNumber) }}</td>
                      <td>
                        {{ formatWeight((item.weightKg ?? 0) + (item.baggageWeightKg ?? 0)) }}
                      </td>
                      <td>{{ displayValue(item.remarks) }}</td>
                      <td><DsStatusBadge label="Manifested" value="approved" /></td>
                    </tr>
                    <tr v-if="passengerRows.length === 0">
                      <td class="manifest-empty-cell" colspan="7">
                        <div class="manifest-empty">
                          <VIcon icon="mdi-seat-passenger" />
                          <strong>No passenger manifest prepared</strong>
                          <span>Add passengers or declare zero load for this flight.</span>
                          <div class="manifest-empty__actions">
                            <VBtn
                              v-if="data.permissions.mayPrepare"
                              color="primary"
                              prepend-icon="mdi-plus"
                              @click="openPassengerDialog"
                            >
                              Add Passenger
                            </VBtn>
                            <VBtn
                              v-if="data.permissions.mayPrepare && manifest.status === 'DRAFT'"
                              prepend-icon="mdi-account-off-outline"
                              variant="outlined"
                              @click="submit(manifest)"
                            >
                              Declare Zero Load
                            </VBtn>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </VTable>

                <VTable v-else class="manifest-table manifest-table--cargo" density="compact">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Shipment Ref</th>
                      <th>Pieces</th>
                      <th>Weight</th>
                      <th>DG Status</th>
                      <th>Acceptance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in cargoRows" :key="item.id">
                      <td>{{ item.description }}</td>
                      <td>
                        {{ displayValue(item.senderName) }} -> {{ displayValue(item.receiverName) }}
                      </td>
                      <td>1</td>
                      <td>{{ formatWeight(item.actualWeightKg) }}</td>
                      <td>{{ item.dgCategoryLabel ?? 'Non-DG' }}</td>
                      <td>
                        <div class="manifest-dg-actions">
                          <DsStatusBadge :value="item.dgAcceptanceStatus" />
                          <template v-if="item.dgCategoryId && data.permissions.mayReview">
                            <VBtn
                              aria-label="Accept dangerous goods"
                              icon="mdi-check"
                              size="x-small"
                              variant="text"
                              @click="decideDg(item, 'ACCEPTED')"
                            />
                            <VBtn
                              aria-label="Reject dangerous goods"
                              color="error"
                              icon="mdi-close"
                              size="x-small"
                              variant="text"
                              @click="decideDg(item, 'REJECTED')"
                            />
                          </template>
                        </div>
                      </td>
                      <td><DsStatusBadge label="Recorded" value="submitted" /></td>
                    </tr>
                    <tr v-if="cargoRows.length === 0">
                      <td class="manifest-empty-cell" colspan="7">
                        <div class="manifest-empty">
                          <VIcon icon="mdi-package-variant" />
                          <strong>No cargo manifest prepared</strong>
                          <span>Add cargo or declare no cargo for this flight.</span>
                          <div class="manifest-empty__actions">
                            <VBtn
                              v-if="data.permissions.mayPrepare"
                              color="primary"
                              prepend-icon="mdi-plus"
                              @click="openCargoDialog"
                            >
                              Add Cargo
                            </VBtn>
                            <VBtn
                              v-if="data.permissions.mayPrepare && manifest.status === 'DRAFT'"
                              prepend-icon="mdi-package-variant-remove"
                              variant="outlined"
                              @click="submit(manifest)"
                            >
                              Declare No Cargo
                            </VBtn>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>

              <VCardActions class="manifest-panel__actions">
                <VBtn
                  v-if="data.permissions.mayPrepare && canSubmitManifest(manifest)"
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
                  <VBtn
                    v-if="manifest.status === 'LOCKED'"
                    variant="text"
                    @click="unlock(manifest)"
                  >
                    Unlock with reason
                  </VBtn>
                </template>
              </VCardActions>
            </VCard>
          </main>

          <aside class="manifest-side">
            <VCard border class="assurance-panel">
              <div class="side-card-head">
                <div>
                  <h2>Departure Assurance</h2>
                  <p>{{ passedDepartureChecks }} / {{ actionableDepartureChecks.length }} passed</p>
                </div>
                <DsStatusBadge
                  :label="departureReady ? 'Ready' : 'Blocked'"
                  :value="departureReady ? 'ready' : 'blocked'"
                />
              </div>
              <div class="assurance-list">
                <div
                  v-for="check in actionableDepartureChecks"
                  :key="check.checkCode"
                  class="assurance-row"
                  :class="`assurance-row--${checkTone(check)}`"
                >
                  <span class="assurance-row__icon">
                    <VIcon :icon="toneIcon(check)" />
                  </span>
                  <div>
                    <strong>{{ check.checkName }}</strong>
                    <small>{{ checkDescription(check) }}</small>
                  </div>
                  <span>{{ statusLabel(check.effectiveStatus) }}</span>
                  <VBtn
                    v-if="check.actionHref"
                    aria-label="Open assurance action"
                    icon="mdi-chevron-right"
                    size="x-small"
                    variant="text"
                    @click="navigateTo(check.actionHref)"
                  />
                </div>
                <div v-if="actionableDepartureChecks.length === 0" class="assurance-empty">
                  Run departure assurance after check-in is closed.
                </div>
              </div>
              <VBtn
                v-if="data.permissions.mayReview"
                block
                class="mt-3"
                color="secondary"
                prepend-icon="mdi-shield-search"
                variant="outlined"
                @click="
                  command(
                    'assurance',
                    `/api/flight-operations/flights/${flightId}/actions/evaluate-departure-assurance`,
                    {}
                  )
                "
              >
                Review Assurance
              </VBtn>
            </VCard>

            <VCard ref="requiredActionsPanel" border class="required-actions-panel">
              <div class="side-card-head">
                <div>
                  <h2>Next Required Actions</h2>
                  <p>{{ requiredActions.length }} open actions</p>
                </div>
              </div>
              <div class="required-action-list">
                <div
                  v-for="item in requiredActions"
                  :key="item.id"
                  class="required-action"
                  :class="`required-action--${item.tone}`"
                >
                  <span class="required-action__icon">
                    <VIcon :icon="item.icon" />
                  </span>
                  <div class="required-action__copy">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.description }}</span>
                    <em>{{ item.impact }}</em>
                  </div>
                  <div class="required-action__owner">
                    <span>Owner</span>
                    <strong><VIcon icon="mdi-account-outline" /> {{ item.owner }}</strong>
                  </div>
                  <VBtn
                    class="required-action__button"
                    variant="outlined"
                    @click="handleRequiredAction(item)"
                  >
                    {{ item.buttonLabel }}
                  </VBtn>
                </div>
                <div v-if="requiredActions.length === 0" class="required-action-empty">
                  No manifest action is blocking the departure gate.
                </div>
              </div>
            </VCard>
          </aside>
        </div>
      </template>
    </div>

    <VDialog v-model="passengerDialog" max-width="720" persistent scrollable>
      <VCard class="manifest-dialog">
        <VCardTitle>Add Passenger</VCardTitle>
        <VCardText>
          <VRow dense>
            <VCol cols="12" md="6">
              <VTextField v-model="passengerForm.fullName" label="Full name" required />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField v-model="passengerForm.identityType" label="Identity type" />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField v-model="passengerForm.identityNumber" label="Identity number" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField v-model="passengerForm.seatNumber" label="Seat" />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="passengerForm.weightKg"
                label="Weight kg"
                min="0"
                type="number"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="passengerForm.baggageWeightKg"
                label="Baggage kg"
                min="0"
                type="number"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="passengerForm.remarks"
                label="Special handling / remarks"
                rows="3"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="passengerDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="!passengerCanSubmit"
            :loading="busy === 'add-passenger'"
            @click="addPassenger"
          >
            Add Passenger
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="cargoDialog" max-width="760" persistent scrollable>
      <VCard class="manifest-dialog">
        <VCardTitle>Add Cargo</VCardTitle>
        <VCardText>
          <VRow dense>
            <VCol cols="12" md="6">
              <VTextField v-model="cargoForm.description" label="Description" required />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model.number="cargoForm.actualWeightKg"
                label="Actual weight kg"
                min="0"
                type="number"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model.number="cargoForm.volumeWeightKg"
                label="Volume weight kg"
                min="0"
                type="number"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="cargoForm.senderName" label="Sender" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="cargoForm.receiverName" label="Receiver" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="cargoForm.chargeableWeightKg"
                label="Chargeable weight kg"
                min="0"
                type="number"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="cargoForm.dgCategoryId"
                label="DG category id"
                placeholder="Leave blank for non-DG"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="cargoForm.remarks" label="Remarks" rows="3" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="cargoDialog = false">Cancel</VBtn>
          <VBtn
            color="primary"
            :disabled="!cargoCanSubmit"
            :loading="busy === 'add-cargo'"
            @click="addCargo"
          >
            Add Cargo
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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

<style scoped>
.manifest-page {
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(244, 247, 250, 0.98)), #f6f8fb;
  color: #10233f;
}

.manifest-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1680px;
  margin: 0 auto;
}

.manifest-topbar,
.manifest-title-group,
.manifest-topbar__actions,
.manifest-panel__title-row,
.manifest-dg-actions {
  display: flex;
  align-items: center;
}

.manifest-topbar {
  justify-content: space-between;
  gap: 16px;
}

.manifest-title-group {
  min-width: 0;
  gap: 12px;
}

.manifest-heading-copy {
  min-width: 0;
}

.manifest-eyebrow {
  margin: 0 0 2px;
  color: #60738f;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.manifest-heading-copy h1,
.gate-banner__copy h2,
.manifest-panel__title-row h2,
.side-card-head h2 {
  margin: 0;
  color: #10233f;
  letter-spacing: 0;
}

.manifest-heading-copy h1 {
  font-size: clamp(1.35rem, 2vw, 1.9rem);
  font-weight: 850;
}

.manifest-topbar__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.manifest-icon-button {
  width: 40px;
  min-width: 40px;
  height: 40px;
}

.flight-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(118px, 1fr)) minmax(300px, 1.4fr);
  align-items: stretch;
  overflow: hidden;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 35, 63, 0.06);
}

.flight-strip__item,
.flight-strip__badges {
  min-width: 0;
  padding: 14px 16px;
}

.flight-strip__item {
  border-right: 1px solid #e5ebf1;
}

.flight-strip__item span,
.manifest-panel__facts span,
.gate-banner__meta span,
.required-action__owner span {
  display: block;
  color: #60738f;
  font-size: 0.69rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.flight-strip__item strong,
.manifest-panel__facts strong,
.gate-banner__meta strong,
.required-action__owner strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: #111827;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.flight-strip__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
}

.flight-strip__badges :deep(.v-chip) {
  max-width: 100%;
  min-height: 28px;
  height: auto;
  white-space: normal;
}

.gate-banner {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) minmax(190px, 260px) minmax(220px, 300px);
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
  border: 1px solid;
  border-radius: 8px;
  background: #ffffff;
}

.gate-banner--danger {
  border-color: #fecaca;
  background: linear-gradient(90deg, rgba(254, 242, 242, 0.98), #ffffff 58%);
}

.gate-banner--warning {
  border-color: #fed7aa;
  background: linear-gradient(90deg, rgba(255, 247, 237, 0.98), #ffffff 58%);
}

.gate-banner--success {
  border-color: #bbf7d0;
  background: linear-gradient(90deg, rgba(240, 253, 244, 0.98), #ffffff 58%);
}

.gate-banner__mark {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 14px;
  color: #ffffff;
  font-size: 1.7rem;
}

.gate-banner--danger .gate-banner__mark {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}

.gate-banner--warning .gate-banner__mark {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.gate-banner--success .gate-banner__mark {
  background: linear-gradient(135deg, #10b981, #047857);
}

.gate-banner__copy {
  min-width: 0;
}

.gate-banner__copy h2 {
  color: #c81e1e;
  font-size: clamp(1.1rem, 1.9vw, 1.55rem);
  font-weight: 900;
  text-transform: uppercase;
}

.gate-banner--warning .gate-banner__copy h2 {
  color: #b45309;
}

.gate-banner--success .gate-banner__copy h2 {
  color: #047857;
}

.gate-banner__copy strong {
  display: block;
  margin-top: 2px;
  color: #c81e1e;
  font-size: 0.98rem;
  overflow-wrap: anywhere;
}

.gate-banner--warning .gate-banner__copy strong {
  color: #b45309;
}

.gate-banner--success .gate-banner__copy strong {
  color: #047857;
}

.gate-banner__copy p {
  margin: 7px 0 0;
  color: #334155;
  line-height: 1.4;
}

.gate-banner__meta {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding-left: 22px;
  border-left: 1px solid #e2e8f0;
}

.gate-banner__action {
  justify-self: stretch;
  min-height: 48px;
}

.domain-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.domain-card {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 22px;
  gap: 14px;
  align-items: center;
  min-width: 0;
  min-height: 98px;
  padding: 16px;
  border: 1px solid #dce5ee;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  box-shadow: 0 12px 28px rgba(15, 35, 63, 0.05);
  cursor: pointer;
}

.domain-card:focus-visible {
  outline: 3px solid rgba(0, 75, 123, 0.26);
  outline-offset: 2px;
}

.domain-card__icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 50%;
  font-size: 1.55rem;
}

.domain-card--danger .domain-card__icon {
  background: #fee2e2;
  color: #dc2626;
}

.domain-card--warning .domain-card__icon {
  background: #ffedd5;
  color: #d97706;
}

.domain-card--success .domain-card__icon {
  background: #dcfce7;
  color: #059669;
}

.domain-card--info .domain-card__icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.domain-card__body {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.domain-card__body strong,
.domain-card__body em,
.domain-card__body small,
.domain-card__body span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.domain-card__body strong {
  color: #1f2937;
  font-size: 1rem;
  font-weight: 850;
}

.domain-card__body em {
  color: #dc2626;
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 800;
}

.domain-card--warning .domain-card__body em {
  color: #d97706;
}

.domain-card--success .domain-card__body em {
  color: #047857;
}

.domain-card--info .domain-card__body em {
  color: #1d4ed8;
}

.domain-card__body small,
.domain-card__body span {
  color: #475569;
  font-size: 0.83rem;
  line-height: 1.25;
}

.domain-card__chevron {
  color: #64748b;
}

.manifest-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(360px, 0.85fr);
  gap: 18px;
  align-items: start;
}

.manifest-main,
.manifest-side {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.manifest-panel,
.assurance-panel,
.required-actions-panel {
  overflow: hidden;
  border-color: #dce5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 35, 63, 0.06);
}

.manifest-panel__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(450px, 0.9fr);
  gap: 18px;
  align-items: start;
  padding: 16px;
  border-bottom: 1px solid #e5ebf1;
}

.manifest-panel__title-row {
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.manifest-panel__title-row h2,
.side-card-head h2 {
  font-size: 1.08rem;
  font-weight: 850;
}

.manifest-panel__head p,
.side-card-head p {
  margin: 5px 0 0;
  color: #60738f;
  line-height: 1.35;
}

.manifest-panel__facts {
  display: grid;
  grid-template-columns: repeat(5, minmax(70px, 1fr));
  gap: 12px;
  min-width: 0;
}

.manifest-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.manifest-table {
  min-width: 920px;
}

.manifest-table :deep(th) {
  color: #334155;
  font-size: 0.76rem;
  font-weight: 850;
  white-space: nowrap;
}

.manifest-table :deep(td) {
  max-width: 220px;
  color: #1f2937;
  font-size: 0.84rem;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.manifest-table :deep(.v-chip) {
  max-width: 180px;
}

.manifest-empty-cell {
  padding: 34px 16px !important;
}

.manifest-empty {
  display: grid;
  max-width: 460px;
  margin: 0 auto;
  justify-items: center;
  gap: 7px;
  color: #475569;
  text-align: center;
}

.manifest-empty > .v-icon {
  width: 58px;
  height: 58px;
  color: #b6c1cf;
  font-size: 3.15rem;
}

.manifest-empty strong {
  color: #1f2937;
  font-size: 0.98rem;
}

.manifest-empty span {
  line-height: 1.35;
}

.manifest-empty__actions,
.manifest-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.manifest-panel__actions {
  justify-content: flex-start;
  padding: 12px 16px 16px;
  border-top: 1px solid #eef2f6;
}

.manifest-dg-actions {
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.side-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5ebf1;
}

.assurance-list,
.required-action-list {
  display: grid;
}

.assurance-list {
  padding: 6px 12px 12px;
}

.assurance-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) minmax(82px, max-content) 28px;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 9px 0;
  border-bottom: 1px solid #edf2f7;
}

.assurance-row:last-child {
  border-bottom: 0;
}

.assurance-row__icon,
.required-action__icon {
  display: grid;
  place-items: center;
}

.assurance-row__icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.assurance-row--danger .assurance-row__icon {
  color: #dc2626;
}

.assurance-row--warning .assurance-row__icon {
  color: #d97706;
}

.assurance-row--success .assurance-row__icon {
  color: #059669;
}

.assurance-row--info .assurance-row__icon {
  color: #64748b;
}

.assurance-row strong,
.assurance-row small,
.assurance-row > span:last-of-type {
  min-width: 0;
  overflow-wrap: anywhere;
}

.assurance-row strong {
  display: block;
  color: #1f2937;
  font-size: 0.85rem;
  font-weight: 750;
}

.assurance-row small {
  display: block;
  color: #64748b;
  font-size: 0.77rem;
  line-height: 1.25;
}

.assurance-row > span:last-of-type {
  color: #d97706;
  font-size: 0.78rem;
  font-weight: 800;
  text-align: right;
}

.assurance-row--danger > span:last-of-type {
  color: #dc2626;
}

.assurance-row--success > span:last-of-type {
  color: #059669;
}

.assurance-empty,
.required-action-empty {
  padding: 18px;
  color: #64748b;
  text-align: center;
}

.required-action-list {
  padding: 8px 12px 12px;
}

.required-action {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) minmax(110px, 0.42fr) minmax(128px, 0.38fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 12px 0;
  border-bottom: 1px solid #edf2f7;
}

.required-action:last-child {
  border-bottom: 0;
}

.required-action__icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 1.1rem;
}

.required-action--danger .required-action__icon {
  color: #dc2626;
}

.required-action--warning .required-action__icon {
  color: #d97706;
}

.required-action--success .required-action__icon {
  color: #059669;
}

.required-action__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.required-action__copy strong,
.required-action__copy span,
.required-action__copy em {
  min-width: 0;
  overflow-wrap: anywhere;
}

.required-action__copy strong {
  color: #1f2937;
  font-size: 0.84rem;
  font-weight: 800;
}

.required-action__copy span,
.required-action__copy em {
  color: #475569;
  font-size: 0.76rem;
  line-height: 1.25;
}

.required-action__copy em {
  color: #111827;
  font-style: normal;
  font-weight: 750;
}

.required-action__owner {
  min-width: 0;
  padding-left: 12px;
  border-left: 1px solid #e5ebf1;
}

.required-action__button {
  justify-self: stretch;
  min-width: 0;
}

.manifest-dialog :deep(.v-card-title) {
  color: #10233f;
  font-weight: 850;
}

@media (max-width: 1280px) {
  .flight-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .flight-strip__badges {
    grid-column: 1 / -1;
  }

  .domain-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manifest-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .manifest-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .gate-banner,
  .manifest-panel__head,
  .required-action {
    grid-template-columns: 1fr;
  }

  .gate-banner__mark {
    width: 50px;
    height: 50px;
  }

  .gate-banner__meta,
  .required-action__owner {
    padding-left: 0;
    border-left: 0;
  }

  .manifest-panel__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .manifest-side {
    grid-template-columns: minmax(0, 1fr);
  }

  .required-action__button,
  .gate-banner__action {
    justify-self: stretch;
  }
}

@media (max-width: 640px) {
  .manifest-page {
    padding-inline: 8px !important;
  }

  .manifest-topbar {
    align-items: flex-start;
  }

  .manifest-topbar,
  .domain-grid,
  .flight-strip {
    grid-template-columns: 1fr;
  }

  .manifest-topbar,
  .manifest-title-group {
    flex-wrap: wrap;
  }

  .manifest-topbar__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .flight-strip__item {
    border-right: 0;
    border-bottom: 1px solid #e5ebf1;
  }

  .domain-card {
    grid-template-columns: 46px minmax(0, 1fr) 18px;
  }

  .domain-card__icon {
    width: 46px;
    height: 46px;
    font-size: 1.35rem;
  }

  .gate-banner {
    padding: 16px;
  }

  .manifest-empty__actions,
  .manifest-panel__actions {
    flex-direction: column;
  }

  .manifest-empty__actions :deep(.v-btn),
  .manifest-panel__actions :deep(.v-btn) {
    width: 100%;
  }

  .assurance-row {
    grid-template-columns: 26px minmax(0, 1fr) 28px;
  }

  .assurance-row > span:last-of-type {
    grid-column: 2 / -1;
    text-align: left;
  }
}
</style>
