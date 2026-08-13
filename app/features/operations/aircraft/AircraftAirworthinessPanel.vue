<script setup lang="ts">
import type {
  AircraftAirworthinessDto,
  AircraftDefermentInput,
  AircraftDefectInput,
  AircraftMaintenanceReleaseInput,
  AircraftMaintenanceRequirementInput,
  AircraftOperationalStatus,
  AircraftOperationalTransition
} from '#shared/features/operations/aircraft';

const props = defineProps<{ aircraftId: string }>();
const emit = defineEmits<{ changed: [] }>();
const { can } = useAuthorization();
const actionError = ref('');
const submitting = ref(false);
const operationalOpen = ref(false);
const defectOpen = ref(false);
const defermentOpen = ref(false);
const releaseOpen = ref(false);
const requirementOpen = ref(false);

const canRead = computed(() => can('aircraft.airworthiness.read').allowed);
const { data, pending, error, refresh } = await useAsyncData(
  () => `aircraft-airworthiness-${props.aircraftId}`,
  () =>
    fetchApi<AircraftAirworthinessDto>(
      `/api/master-data/aircraft/${props.aircraftId}/airworthiness`
    ),
  { immediate: canRead.value }
);

const nowLocal = () => {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};
const plusDaysLocal = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000 - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};
const toIso = (value: string) => new Date(value).toISOString();

const operational = reactive({
  toStatus: 'SUSPENDED' as AircraftOperationalStatus,
  reason: ''
});
const defect = reactive({
  title: '',
  description: '',
  detectedAt: nowLocal(),
  reporterObservation: 'UNKNOWN' as AircraftDefectInput['reporterObservation'],
  initialSeverity: 'UNKNOWN' as AircraftDefectInput['initialSeverity'],
  operationalImpact: '',
  flightPhase: '',
  sourceReference: '',
  evidenceReferences: ''
});
const deferment = reactive({
  defectId: '',
  defermentType: 'MEL' as AircraftDefermentInput['defermentType'],
  referenceCode: '',
  category: '',
  operationalLimitations: '',
  maintenanceProcedure: '',
  operationsProcedure: '',
  effectiveAt: nowLocal(),
  expiresAt: plusDaysLocal(10),
  targetRectificationAt: plusDaysLocal(7),
  authorizationReference: '',
  applicableRouteIds: '',
  applicableServiceTypeCodes: [] as string[]
});
const release = reactive({
  releaseNumber: '',
  resultingStatus: 'SERVICEABLE' as AircraftMaintenanceReleaseInput['resultingStatus'],
  workOrderReference: '',
  releaseStatement:
    'The recorded maintenance was performed in accordance with the approved maintenance data and the aircraft is approved for return to service.',
  certifyingLicenseNumber: '',
  releasedAt: nowLocal(),
  defectIds: [] as string[],
  evidenceReferences: ''
});
const requirement = reactive({
  requirementCode: '',
  title: '',
  dueAt: '',
  dueAirframeHours: null as number | null,
  dueAirframeCycles: null as number | null,
  sourceReference: ''
});

const operationalTargets = computed<AircraftOperationalStatus[]>(() => {
  const current = data.value?.aircraft.operationalStatus;
  if (current === 'ACTIVE') return ['SUSPENDED', 'RETIRED'];
  if (current === 'SUSPENDED') return ['ACTIVE', 'RETIRED'];
  return [];
});
const openDefects = computed(() =>
  (data.value?.defects ?? []).filter((item) => item.status === 'OPEN')
);
const unresolvedDefects = computed(() =>
  (data.value?.defects ?? []).filter((item) => ['OPEN', 'DEFERRED'].includes(item.status))
);
const serviceTypes = [
  'CHARTER_CARGO',
  'CHARTER_PASSENGER',
  'SCHEDULED_PASSENGER',
  'MEDEVAC',
  'POSITIONING'
];

watch(operationalOpen, (open) => {
  if (!open) return;
  operational.toStatus = operationalTargets.value[0] ?? 'SUSPENDED';
  operational.reason = '';
  actionError.value = '';
});
watch(defectOpen, (open) => {
  if (!open) return;
  Object.assign(defect, {
    title: '',
    description: '',
    detectedAt: nowLocal(),
    reporterObservation: 'UNKNOWN',
    initialSeverity: 'UNKNOWN',
    operationalImpact: '',
    flightPhase: '',
    sourceReference: '',
    evidenceReferences: ''
  });
  actionError.value = '';
});
watch(defermentOpen, (open) => {
  if (!open) return;
  deferment.defectId = openDefects.value[0]?.id ?? '';
  actionError.value = '';
});
watch(releaseOpen, (open) => {
  if (!open) return;
  release.defectIds = unresolvedDefects.value.map((item) => item.id);
  release.releasedAt = nowLocal();
  actionError.value = '';
});
watch(requirementOpen, (open) => {
  if (!open) return;
  Object.assign(requirement, {
    requirementCode: '',
    title: '',
    dueAt: '',
    dueAirframeHours: null,
    dueAirframeCycles: null,
    sourceReference: ''
  });
  actionError.value = '';
});

function references(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function perform(action: () => Promise<unknown>, close: () => void) {
  submitting.value = true;
  actionError.value = '';
  try {
    await action();
    close();
    await refresh();
    emit('changed');
  } catch (value) {
    actionError.value = value instanceof Error ? value.message : 'Airworthiness action failed.';
  } finally {
    submitting.value = false;
  }
}

async function transitionOperational() {
  const aircraft = data.value?.aircraft;
  if (!aircraft) return;
  const body: AircraftOperationalTransition = {
    toStatus: operational.toStatus,
    reason: operational.reason,
    expectedVersion: aircraft.version
  };
  await perform(
    () =>
      fetchApi(`/api/master-data/aircraft/${props.aircraftId}/actions/transition-operational`, {
        method: 'POST',
        body
      }),
    () => (operationalOpen.value = false)
  );
}

async function reportDefect() {
  const aircraft = data.value?.aircraft;
  if (!aircraft) return;
  const body: AircraftDefectInput = {
    title: defect.title,
    description: defect.description,
    detectedAt: toIso(defect.detectedAt),
    reporterObservation: defect.reporterObservation,
    initialSeverity: defect.initialSeverity,
    operationalImpact: defect.operationalImpact || null,
    flightPhase: defect.flightPhase || null,
    stationId: null,
    sourceReference: defect.sourceReference || null,
    evidenceReferences: references(defect.evidenceReferences),
    expectedVersion: aircraft.version
  };
  await perform(
    () =>
      fetchApi(`/api/master-data/aircraft/${props.aircraftId}/defects`, {
        method: 'POST',
        body
      }),
    () => (defectOpen.value = false)
  );
}

async function deferDefect() {
  const aircraft = data.value?.aircraft;
  if (!aircraft) return;
  const body: AircraftDefermentInput = {
    defectId: deferment.defectId,
    defermentType: deferment.defermentType,
    referenceCode: deferment.referenceCode,
    category: deferment.category || null,
    operationalLimitations: deferment.operationalLimitations,
    maintenanceProcedure: deferment.maintenanceProcedure || null,
    operationsProcedure: deferment.operationsProcedure || null,
    effectiveAt: toIso(deferment.effectiveAt),
    expiresAt: toIso(deferment.expiresAt),
    targetRectificationAt: deferment.targetRectificationAt
      ? toIso(deferment.targetRectificationAt)
      : null,
    authorizationReference: deferment.authorizationReference,
    applicableRouteIds: references(deferment.applicableRouteIds),
    applicableServiceTypeCodes:
      deferment.applicableServiceTypeCodes as AircraftDefermentInput['applicableServiceTypeCodes'],
    expectedVersion: aircraft.version
  };
  await perform(
    () =>
      fetchApi(`/api/master-data/aircraft/${props.aircraftId}/deferments`, {
        method: 'POST',
        body
      }),
    () => (defermentOpen.value = false)
  );
}

async function issueRelease() {
  const aircraft = data.value?.aircraft;
  if (!aircraft) return;
  const body: AircraftMaintenanceReleaseInput = {
    releaseNumber: release.releaseNumber,
    resultingStatus: release.resultingStatus,
    workOrderReference: release.workOrderReference,
    releaseStatement: release.releaseStatement,
    certifyingLicenseNumber: release.certifyingLicenseNumber,
    releasedAt: toIso(release.releasedAt),
    defectIds: release.defectIds,
    evidenceReferences: references(release.evidenceReferences),
    expectedVersion: aircraft.version
  };
  await perform(
    () =>
      fetchApi(`/api/master-data/aircraft/${props.aircraftId}/releases`, {
        method: 'POST',
        body
      }),
    () => (releaseOpen.value = false)
  );
}

async function addRequirement() {
  const aircraft = data.value?.aircraft;
  if (!aircraft) return;
  const body: AircraftMaintenanceRequirementInput = {
    requirementCode: requirement.requirementCode,
    title: requirement.title,
    dueAt: requirement.dueAt || null,
    dueAirframeHours: requirement.dueAirframeHours,
    dueAirframeCycles: requirement.dueAirframeCycles,
    sourceReference: requirement.sourceReference,
    expectedVersion: aircraft.version
  };
  await perform(
    () =>
      fetchApi(`/api/master-data/aircraft/${props.aircraftId}/requirements`, {
        method: 'POST',
        body
      }),
    () => (requirementOpen.value = false)
  );
}

function statusColor(value: string) {
  if (['ACTIVE', 'SERVICEABLE', 'RECTIFIED', 'CLOSED'].includes(value)) return 'success';
  if (['SUSPENDED', 'DEFERRED', 'SERVICEABLE_WITH_RESTRICTIONS'].includes(value)) return 'warning';
  return 'error';
}
</script>

<template>
  <section v-if="canRead" class="mb-6" aria-labelledby="airworthiness-heading">
    <div class="mb-3 d-flex flex-wrap align-center ga-2">
      <div>
        <h2 id="airworthiness-heading" class="text-h6 font-weight-bold">Airworthiness control</h2>
        <div class="text-caption text-medium-emphasis">
          Controlled aircraft status, defects, deferment references, and maintenance release
        </div>
      </div>
      <VSpacer />
      <DsTooltipIconButton
        icon="mdi-refresh"
        tooltip="Refresh airworthiness"
        variant="text"
        @click="refresh"
      />
      <VBtn
        v-if="can('aircraft.lifecycle.manage').allowed && operationalTargets.length"
        prepend-icon="mdi-swap-horizontal"
        variant="outlined"
        @click="operationalOpen = true"
      >
        Change status
      </VBtn>
      <VBtn
        v-if="can('aircraft.defect.report').allowed"
        color="error"
        prepend-icon="mdi-alert-octagon-outline"
        variant="tonal"
        @click="defectOpen = true"
      >
        Report defect
      </VBtn>
      <VBtn
        v-if="can('aircraft.defect.manage').allowed"
        prepend-icon="mdi-calendar-clock-outline"
        variant="tonal"
        @click="requirementOpen = true"
      >
        Add maintenance limit
      </VBtn>
      <VBtn
        v-if="can('aircraft.release.certify').allowed"
        color="success"
        prepend-icon="mdi-certificate-outline"
        @click="releaseOpen = true"
      >
        Issue release
      </VBtn>
    </div>

    <VAlert v-if="error" class="mb-3" type="error" variant="tonal">
      Airworthiness records could not be loaded.
    </VAlert>
    <VSkeletonLoader v-else-if="pending" type="article" />
    <template v-else-if="data">
      <div class="airworthiness-summary">
        <div>
          <span>Technical eligibility</span>
          <VChip
            :color="statusColor(data.aircraft.technicalEligibility)"
            size="small"
            variant="tonal"
          >
            {{ data.aircraft.technicalEligibility }}
          </VChip>
        </div>
        <div>
          <span>Open defects</span>
          <strong>{{ data.aircraft.openDefectCount }}</strong>
        </div>
        <div>
          <span>Active restrictions</span>
          <strong>{{ data.aircraft.activeRestrictionCount }}</strong>
        </div>
        <div>
          <span>Airframe utilization</span>
          <strong>{{ data.aircraft.airframeHours.toFixed(1) }} h /
            {{ data.aircraft.airframeCycles }} c</strong>
        </div>
        <div>
          <span>Affected flights</span>
          <strong>{{ data.affectedFlightIds.length }}</strong>
        </div>
      </div>

      <VAlert
        v-if="data.aircraft.maintenanceDue"
        class="mt-3"
        color="error"
        icon="mdi-calendar-alert"
        title="Maintenance requirement due"
        variant="tonal"
      >
        {{ data.aircraft.dueReasons.join(' ') }}
      </VAlert>

      <VExpansionPanels class="mt-3" variant="accordion">
        <VExpansionPanel>
          <VExpansionPanelTitle>Defects and active limitations</VExpansionPanelTitle>
          <VExpansionPanelText>
            <VList v-if="data.defects.length" lines="three">
              <VListItem
                v-for="item in data.defects"
                :key="item.id"
                :subtitle="`${item.detectedAt} · ${item.description}`"
                :title="`${item.defectNumber} · ${item.title}`"
              >
                <template #append>
                  <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                    {{ item.status }}
                  </VChip>
                </template>
              </VListItem>
            </VList>
            <div v-else class="py-4 text-medium-emphasis">No defect record.</div>
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel>
          <VExpansionPanelTitle>Maintenance requirements</VExpansionPanelTitle>
          <VExpansionPanelText>
            <VTable v-if="data.requirements.length" density="compact">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Calendar</th>
                  <th>Hours</th>
                  <th>Cycles</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in data.requirements" :key="item.id">
                  <td>
                    <strong>{{ item.requirementCode }}</strong>
                    <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
                  </td>
                  <td>{{ item.dueAt ?? '-' }}</td>
                  <td>{{ item.dueAirframeHours ?? '-' }}</td>
                  <td>{{ item.dueAirframeCycles ?? '-' }}</td>
                  <td>
                    <VChip :color="statusColor(item.status)" size="small" variant="tonal">
                      {{ item.status }}
                    </VChip>
                  </td>
                </tr>
              </tbody>
            </VTable>
            <div v-else class="py-4 text-medium-emphasis">No maintenance requirement recorded.</div>
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel>
          <VExpansionPanelTitle>Maintenance releases</VExpansionPanelTitle>
          <VExpansionPanelText>
            <VList v-if="data.releases.length" lines="three">
              <VListItem
                v-for="item in data.releases"
                :key="item.id"
                :subtitle="`${item.releasedAt} · ${item.certifyingLicenseNumber} · ${item.workOrderReference}`"
                :title="item.releaseNumber"
              >
                <template #append>
                  <VChip :color="statusColor(item.resultingStatus)" size="small" variant="tonal">
                    {{ item.resultingStatus }}
                  </VChip>
                </template>
              </VListItem>
            </VList>
            <div v-else class="py-4 text-medium-emphasis">No maintenance release recorded.</div>
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel>
          <VExpansionPanelTitle>Status history</VExpansionPanelTitle>
          <VExpansionPanelText>
            <VTimeline density="compact" side="end">
              <VTimelineItem
                v-for="item in data.history"
                :key="item.id"
                :dot-color="statusColor(item.toStatus)"
                size="x-small"
              >
                <strong>{{ item.statusDimension }} · {{ item.toStatus }}</strong>
                <div class="text-body-2">{{ item.reason }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.occurredAt }} · {{ item.actorRole }}
                </div>
              </VTimelineItem>
            </VTimeline>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </template>
  </section>

  <VDialog v-model="operationalOpen" max-width="560">
    <VCard>
      <VCardTitle>Change operational status</VCardTitle>
      <VCardText>
        <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
          {{ actionError }}
        </VAlert>
        <VSelect
          v-model="operational.toStatus"
          :items="operationalTargets"
          label="New status"
          variant="outlined"
        />
        <VTextarea
          v-model="operational.reason"
          label="Operational reason"
          rows="4"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="operationalOpen = false">Cancel</VBtn>
        <VBtn :loading="submitting" color="primary" @click="transitionOperational">
          Confirm transition
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="defectOpen" max-width="640">
    <VCard>
      <VCardTitle>Report aircraft defect</VCardTitle>
      <VCardText>
        <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
          {{ actionError }}
        </VAlert>
        <VTextField v-model="defect.title" label="Defect title" variant="outlined" />
        <VTextarea
          v-model="defect.description"
          label="Technical description"
          rows="4"
          variant="outlined"
        />
        <VTextField
          v-model="defect.detectedAt"
          label="Detected at"
          type="datetime-local"
          variant="outlined"
        />
        <VSelect
          v-model="defect.reporterObservation"
          :items="[
            {
              title: 'Tidak terlihat berdampak signifikan',
              value: 'NO_SIGNIFICANT_IMPACT_OBSERVED'
            },
            { title: 'Dapat memengaruhi operasi', value: 'MAY_AFFECT_OPERATION' },
            {
              title: 'Perlu perhatian sebelum penerbangan berikutnya',
              value: 'ATTENTION_BEFORE_NEXT_FLIGHT'
            },
            { title: 'Kondisi tampak kritis', value: 'APPEARS_CRITICAL' },
            { title: 'Tidak diketahui', value: 'UNKNOWN' }
          ]"
          item-title="title"
          item-value="value"
          label="Reporter observation"
          variant="outlined"
        />
        <VSelect
          v-model="defect.initialSeverity"
          :items="['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']"
          label="Initial severity"
          variant="outlined"
        />
        <VTextField v-model="defect.flightPhase" label="Flight phase" variant="outlined" />
        <VTextarea
          v-model="defect.operationalImpact"
          label="Reporter operational impact note"
          rows="2"
          variant="outlined"
        />
        <VTextField
          v-model="defect.sourceReference"
          label="Tech log / source reference"
          variant="outlined"
        />
        <VTextarea
          v-model="defect.evidenceReferences"
          hint="One reference per line"
          label="Evidence references"
          rows="2"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="defectOpen = false">Cancel</VBtn>
        <VBtn :loading="submitting" color="error" @click="reportDefect">
          Record defect report
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="defermentOpen" max-width="760">
    <VCard>
      <VCardTitle>Record controlled deferment</VCardTitle>
      <VCardText>
        <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
          {{ actionError }}
        </VAlert>
        <VSelect
          v-model="deferment.defectId"
          item-title="defectNumber"
          item-value="id"
          :items="openDefects"
          label="Open defect"
          variant="outlined"
        />
        <VRow>
          <VCol cols="12" md="4">
            <VSelect
              v-model="deferment.defermentType"
              :items="['MEL', 'CDL']"
              label="Type"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="5">
            <VTextField
              v-model="deferment.referenceCode"
              label="Deferment / maintenance data reference"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="3">
            <VTextField v-model="deferment.category" label="Category" variant="outlined" />
          </VCol>
        </VRow>
        <VTextarea
          v-model="deferment.operationalLimitations"
          label="Operational limitations"
          rows="3"
          variant="outlined"
        />
        <VTextarea
          v-model="deferment.maintenanceProcedure"
          label="Maintenance procedure"
          rows="2"
          variant="outlined"
        />
        <VTextarea
          v-model="deferment.operationsProcedure"
          label="Operations procedure"
          rows="2"
          variant="outlined"
        />
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="deferment.effectiveAt"
              label="Effective at"
              type="datetime-local"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="deferment.expiresAt"
              label="Rectification limit"
              type="datetime-local"
              variant="outlined"
            />
          </VCol>
        </VRow>
        <VTextField
          v-model="deferment.targetRectificationAt"
          label="Target rectification"
          type="datetime-local"
          variant="outlined"
        />
        <VTextField
          v-model="deferment.authorizationReference"
          label="Internal approval reference"
          variant="outlined"
        />
        <VSelect
          v-model="deferment.applicableServiceTypeCodes"
          chips
          clearable
          multiple
          :items="serviceTypes"
          label="Authorized service types (blank = all)"
          variant="outlined"
        />
        <VTextarea
          v-model="deferment.applicableRouteIds"
          hint="One route ID per line; blank means all routes"
          label="Authorized route IDs"
          rows="2"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="defermentOpen = false">Cancel</VBtn>
        <VBtn :loading="submitting" color="warning" @click="deferDefect">
          Authorize restricted service
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="releaseOpen" max-width="720">
    <VCard>
      <VCardTitle>Issue maintenance release</VCardTitle>
      <VCardText>
        <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
          {{ actionError }}
        </VAlert>
        <VRow>
          <VCol cols="12" md="6">
            <VTextField v-model="release.releaseNumber" label="Release number" variant="outlined" />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="release.resultingStatus"
              :items="['SERVICEABLE', 'SERVICEABLE_WITH_RESTRICTIONS']"
              label="Resulting technical status"
              variant="outlined"
            />
          </VCol>
        </VRow>
        <VTextField
          v-model="release.workOrderReference"
          label="Work order reference"
          variant="outlined"
        />
        <VTextField
          v-model="release.certifyingLicenseNumber"
          label="Certifying licence / authorization"
          variant="outlined"
        />
        <VTextField
          v-model="release.releasedAt"
          label="Released at"
          type="datetime-local"
          variant="outlined"
        />
        <VSelect
          v-model="release.defectIds"
          chips
          clearable
          multiple
          item-title="defectNumber"
          item-value="id"
          :items="unresolvedDefects"
          label="Defects covered by release"
          variant="outlined"
        />
        <VTextarea
          v-model="release.releaseStatement"
          label="Return-to-service statement"
          rows="4"
          variant="outlined"
        />
        <VTextarea
          v-model="release.evidenceReferences"
          hint="One reference per line"
          label="Evidence references"
          rows="2"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="releaseOpen = false">Cancel</VBtn>
        <VBtn :loading="submitting" color="success" @click="issueRelease">
          Sign and issue release
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="requirementOpen" max-width="640">
    <VCard>
      <VCardTitle>Add maintenance requirement</VCardTitle>
      <VCardText>
        <VAlert v-if="actionError" class="mb-4" type="error" variant="tonal">
          {{ actionError }}
        </VAlert>
        <VTextField
          v-model="requirement.requirementCode"
          label="Requirement code"
          variant="outlined"
        />
        <VTextField v-model="requirement.title" label="Requirement title" variant="outlined" />
        <VTextField
          v-model="requirement.sourceReference"
          label="Approved maintenance program reference"
          variant="outlined"
        />
        <VRow>
          <VCol cols="12" md="4">
            <VTextField
              v-model="requirement.dueAt"
              label="Calendar due"
              type="date"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model.number="requirement.dueAirframeHours"
              label="Due airframe hours"
              min="0"
              type="number"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model.number="requirement.dueAirframeCycles"
              label="Due airframe cycles"
              min="0"
              type="number"
              variant="outlined"
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="requirementOpen = false">Cancel</VBtn>
        <VBtn :loading="submitting" color="primary" @click="addRequirement">Add requirement</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.airworthiness-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid rgb(var(--v-theme-border-default));
  border-radius: 8px;
}

.airworthiness-summary > div {
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid rgb(var(--v-theme-border-default));
}

.airworthiness-summary > div:last-child {
  border-right: 0;
}

.airworthiness-summary span {
  display: block;
  margin-bottom: 5px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}

@media (max-width: 960px) {
  .airworthiness-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .airworthiness-summary > div {
    border-bottom: 1px solid rgb(var(--v-theme-border-default));
  }
}
</style>
