<script setup lang="ts">
import type { MaintenanceCommandCenterDto } from '#shared/features/maintenance';

type WorkTask = {
  id: string;
  aircraft: string;
  location: string;
  title: string;
  reference: string;
  status: string;
  blocker: string;
  nextAction: string;
  owner: string;
  updatedAt: string;
  route: string;
  tone: string;
};

const format = useLocaleFormat();
const ui = useMaintenanceUi();
const { t } = useI18n();
const session = useDemoSession();
const { can } = useAuthorization();
const filters = reactive({
  search: '',
  type: ''
});
const page = ref(1);
const itemsPerPage = ref(20);

const { data, pending, error, refresh } = await useAsyncData('maintenance-my-work', () =>
  fetchApi<MaintenanceCommandCenterDto>('/api/maintenance/command-center')
);

const canWork = computed(() => can('maintenance.jobcard.work.sign').allowed);
const canInspect = computed(() => can('maintenance.jobcard.inspect').allowed);
const canRelease = computed(() => can('maintenance.release.issue').allowed);
const canPlan = computed(() => can('maintenance.package.plan').allowed);
const apiError = computed(() => (error.value ? ui.presentError(error.value) : null));
const accessRestricted = computed(() => apiError.value?.code === 'FORBIDDEN');

const typeItems = computed(() => [
  { title: t('maintenance.myWork.allTypes'), value: '' },
  { title: t('maintenance.myWork.mechanicWork'), value: 'work' },
  { title: t('maintenance.terms.inspection'), value: 'inspection' },
  { title: t('maintenance.myWork.technicalRelease'), value: 'release' },
  { title: t('maintenance.myWork.blocker'), value: 'blocker' },
  { title: t('maintenance.myWork.defectAction'), value: 'defect' }
]);
const itemsPerPageOptions = computed(() => [
  { title: t('maintenance.myWork.perPage10'), value: 10 },
  { title: t('maintenance.myWork.perPage20'), value: 20 },
  { title: t('maintenance.myWork.perPage50'), value: 50 }
]);

const allTasks = computed<WorkTask[]>(() => {
  const tasks: WorkTask[] = [];
  if (canWork.value) {
    for (const card of data.value?.jobCardsAwaitingExecution ?? []) {
      tasks.push({
        id: `work-${card.id}`,
        aircraft: card.aircraftRegistrationNumber,
        location: '-',
        title: card.title,
        reference: `${card.packageNumber} / ${card.cardNumber}`,
        status: ui.label(card.status),
        blocker:
          card.status === 'REJECTED_FOR_REWORK'
            ? t('maintenance.myWork.workRejected')
            : t('maintenance.myWork.workWaiting'),
        nextAction:
          card.status === 'READY'
            ? t('maintenance.myWork.startWork')
            : t('maintenance.myWork.completeSignoff'),
        owner: 'Teknisi / Maintenance Control',
        updatedAt: card.updatedAt,
        route: `/maintenance/work-packages/${card.workPackageId}`,
        tone: card.status === 'REJECTED_FOR_REWORK' ? 'warning' : 'info'
      });
    }
  }

  if (canInspect.value) {
    for (const card of data.value?.inspectionsAwaitingAction ?? []) {
      tasks.push({
        id: `inspection-${card.id}`,
        aircraft: card.aircraftRegistrationNumber,
        location: '-',
        title: card.title,
        reference: `${card.packageNumber} / ${card.cardNumber}`,
        status: ui.label(card.status),
        blocker: t('maintenance.myWork.inspectionWaiting'),
        nextAction: t('maintenance.myWork.recordInspection'),
        owner: 'Inspector / Certifying Staff',
        updatedAt: card.updatedAt,
        route: `/maintenance/work-packages/${card.workPackageId}`,
        tone: 'warning'
      });
    }
  }

  if (canRelease.value) {
    for (const item of data.value?.readyForRelease ?? []) {
      tasks.push({
        id: `release-${item.id}`,
        aircraft: item.aircraftRegistrationNumber,
        location: '-',
        title: item.title,
        reference: item.packageNumber,
        status: ui.label(item.status),
        blocker: t('maintenance.myWork.releaseReady'),
        nextAction: t('maintenance.myWork.issueRelease'),
        owner: 'Certifying Staff',
        updatedAt: item.updatedAt,
        route: `/maintenance/work-packages/${item.id}`,
        tone: 'success'
      });
    }
  }

  for (const item of data.value?.releaseBlockers ?? []) {
    const blocker = item.blockers[0];
    tasks.push({
      id: `blocker-${item.workPackageId}-${blocker?.code ?? 'unknown'}`,
      aircraft: item.aircraftRegistrationNumber,
      location: '-',
      title: blocker ? ui.label(blocker.code) : t('maintenance.myWork.releaseBlockerTitle'),
      reference: item.packageNumber,
      status: ui.label('BLOCKED'),
      blocker: blocker?.message
        ? ui.operationalAction(blocker.message)
        : t('maintenance.myWork.releaseBlockerFallback'),
      nextAction: blocker?.requiredAction
        ? ui.operationalAction(blocker.requiredAction)
        : t('maintenance.myWork.resolveBlocker'),
      owner: ownerForBlocker(blocker?.code),
      updatedAt: data.value?.generatedAt ?? '',
      route: `/maintenance/work-packages/${item.workPackageId}`,
      tone: 'error'
    });
  }

  if (canPlan.value) {
    for (const defect of data.value?.defects ?? []) {
      if (defect.activeWorkPackageId || defect.assessmentDecision === 'NO_IMPACT') continue;
      tasks.push({
        id: `defect-${defect.id}`,
        aircraft: defect.aircraftRegistrationNumber,
        location: '-',
        title: defect.title,
        reference: defect.defectNumber,
        status: defect.assessmentDecision
          ? ui.label(defect.assessmentDecision)
          : t('maintenance.myWork.assessmentPending'),
        blocker: defect.assessmentDecision
          ? t('maintenance.myWork.defectAssessedNoPackage')
          : t('maintenance.myWork.defectNotAssessed'),
        nextAction: defect.assessmentDecision
          ? t('maintenance.myWork.createPackageFromDefect')
          : t('maintenance.myWork.openDefectsAssessment'),
        owner: 'PPC / Maintenance Manager',
        updatedAt: defect.updatedAt,
        route: defect.assessmentDecision
          ? `/maintenance?defect=${defect.defectNumber}`
          : '/maintenance/defects',
        tone: 'warning'
      });
    }
  }

  return tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

const filteredTasks = computed(() => {
  const query = filters.search.trim().toLowerCase();
  return allTasks.value.filter((task) => {
    const matchesQuery =
      !query ||
      [
        task.aircraft,
        task.title,
        task.reference,
        task.status,
        task.blocker,
        task.nextAction,
        task.owner
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesType =
      !filters.type ||
      (filters.type === 'work' && task.id.startsWith('work-')) ||
      (filters.type === 'inspection' && task.id.startsWith('inspection-')) ||
      (filters.type === 'release' && task.id.startsWith('release-')) ||
      (filters.type === 'blocker' && task.id.startsWith('blocker-')) ||
      (filters.type === 'defect' && task.id.startsWith('defect-'));
    return matchesQuery && matchesType;
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTasks.value.length / itemsPerPage.value))
);
const paginatedTasks = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return filteredTasks.value.slice(start, start + itemsPerPage.value);
});
const paginationStart = computed(() =>
  filteredTasks.value.length ? (page.value - 1) * itemsPerPage.value + 1 : 0
);
const paginationEnd = computed(() =>
  Math.min(filteredTasks.value.length, page.value * itemsPerPage.value)
);

watch(
  () => [filters.search, filters.type, itemsPerPage.value],
  () => {
    page.value = 1;
  }
);

watch(totalPages, (value) => {
  if (page.value > value) page.value = value;
});

function taskTypeLabel(task: WorkTask) {
  if (task.id.startsWith('work-')) return t('maintenance.myWork.mechanicWork');
  if (task.id.startsWith('inspection-')) return t('maintenance.terms.inspection');
  if (task.id.startsWith('release-')) return t('maintenance.myWork.technicalRelease');
  if (task.id.startsWith('blocker-')) return t('maintenance.myWork.blocker');
  return t('maintenance.status.DEFECT');
}

function taskIcon(task: WorkTask) {
  if (task.id.startsWith('release-')) return 'mdi-certificate-outline';
  if (task.id.startsWith('inspection-')) return 'mdi-clipboard-search-outline';
  if (task.id.startsWith('defect-')) return 'mdi-alert-circle-outline';
  return 'mdi-airplane';
}

function statusColor(tone: string) {
  if (tone === 'error') return 'error';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'primary';
}

function ownerForBlocker(code: string | undefined) {
  if (!code) return 'Maintenance Control';
  if (code.includes('INSPECTION') || code.includes('REINSPECTION')) return 'Inspector';
  if (code.includes('REWORK') || code.includes('MECHANIC')) return 'Teknisi';
  if (code.includes('APPROVED_DATA') || code.includes('JOB_CARD')) return 'PPC / Planner';
  return 'Maintenance Control';
}
</script>

<template>
  <VContainer fluid class="maintenance-work-page">
    <section class="work-hero">
      <div class="work-hero__icon" aria-hidden="true">
        <VIcon icon="mdi-clipboard-check-outline" size="42" />
      </div>
      <div class="work-hero__copy">
        <p class="work-hero__eyebrow">{{ t('maintenance.myWork.eyebrow') }}</p>
        <h1>{{ t('maintenance.myWork.title') }}</h1>
        <p>{{ t('maintenance.myWork.description') }}</p>
        <p>{{ t('maintenance.myWork.source') }}</p>
      </div>
      <div class="work-hero__actions">
        <VChip class="role-chip" variant="tonal" append-icon="mdi-chevron-down">
          {{ session.role.value }}
        </VChip>
        <VBtn
          :aria-label="t('maintenance.myWork.refreshAria')"
          icon="mdi-refresh"
          variant="text"
          :loading="pending"
          @click="refresh()"
        />
      </div>
    </section>

    <VAlert v-if="accessRestricted" type="warning" variant="tonal" class="mb-4">
      <strong>{{ t('maintenance.myWork.restrictedTitle') }}</strong>
      <div>{{ t('maintenance.myWork.restrictedImpact') }}</div>
      <div>{{ t('maintenance.myWork.restrictedNextAction') }}</div>
    </VAlert>
    <VAlert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <strong>{{ t('maintenance.myWork.loadErrorTitle') }}</strong>
      <div>{{ t('maintenance.myWork.loadErrorImpact') }}</div>
      <div>{{ t('maintenance.myWork.loadErrorNextAction') }}</div>
      <div v-if="apiError?.requestId" class="text-caption">Referensi: {{ apiError.requestId }}</div>
      <template #append>
        <VBtn size="small" variant="text" :loading="pending" @click="refresh()">
          {{ t('maintenance.workPackagesList.retry') }}
        </VBtn>
      </template>
    </VAlert>

    <VCard class="work-card" border>
      <VCardText>
        <div class="work-toolbar">
          <VTextField
            v-model="filters.search"
            :aria-label="t('maintenance.myWork.searchAria')"
            :placeholder="t('maintenance.myWork.searchPlaceholder')"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="compact"
            hide-details
            class="work-search"
          />
          <div class="work-type">
            <div class="work-field-label">{{ t('maintenance.myWork.taskType') }}</div>
            <VSelect
              v-model="filters.type"
              :aria-label="t('maintenance.myWork.taskType')"
              :items="typeItems"
              density="compact"
              hide-details
            />
          </div>
          <VSpacer />
          <VBtn prepend-icon="mdi-filter-variant" variant="tonal" color="default" disabled>
            {{ t('maintenance.myWork.advancedFilter') }}
          </VBtn>
          <VBtn
            prepend-icon="mdi-plus"
            color="primary"
            variant="flat"
            to="/maintenance"
            :disabled="!canPlan"
          >
            {{ t('maintenance.myWork.createJobCard') }}
          </VBtn>
          <VChip class="task-count" variant="tonal" color="primary">
            {{ t('maintenance.myWork.taskCount', { count: filteredTasks.length }) }}
          </VChip>
        </div>

        <div class="maintenance-table-wrap">
          <VTable class="maintenance-table maintenance-table--my-work">
            <thead>
              <tr>
                <th>{{ t('maintenance.myWork.aircraft') }}</th>
                <th>{{ t('maintenance.myWork.task') }}</th>
                <th>{{ t('maintenance.myWork.status') }}</th>
                <th>{{ t('maintenance.myWork.blockerAndNextAction') }}</th>
                <th>{{ t('maintenance.myWork.owner') }}</th>
                <th :aria-label="t('maintenance.myWork.actionsAria')" />
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="6" class="state-cell">{{ t('maintenance.myWork.loading') }}</td>
              </tr>
              <tr v-else-if="accessRestricted">
                <td colspan="6" class="state-cell">
                  {{ t('maintenance.myWork.accessRestricted') }}
                </td>
              </tr>
              <tr v-else-if="error">
                <td colspan="6" class="state-cell">
                  {{ t('maintenance.myWork.requestFailed') }}
                </td>
              </tr>
              <template v-else>
                <tr v-for="task in paginatedTasks" :key="task.id">
                  <td class="sticky-identifier">
                    <div class="aircraft-cell">
                      <VAvatar class="aircraft-mark" rounded="lg" size="36">
                        <VIcon :icon="taskIcon(task)" size="20" />
                      </VAvatar>
                      <div>
                        <strong>{{ task.aircraft }}</strong>
                        <div class="text-caption text-medium-emphasis">{{ task.location }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="task-title">{{ task.title }}</div>
                    <VBtn
                      :to="task.route"
                      class="mt-1 mro-action-btn"
                      color="primary"
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-briefcase-eye-outline"
                    >
                      {{ t('maintenance.myWork.openWork') }}
                    </VBtn>
                    <div class="task-reference">{{ task.reference }}</div>
                  </td>
                  <td>
                    <VChip :color="statusColor(task.tone)" size="small" variant="tonal">
                      {{ task.status }}
                    </VChip>
                    <div class="status-date">
                      <VIcon icon="mdi-calendar-blank-outline" size="15" />
                      {{ format.dateTime(task.updatedAt) }}
                    </div>
                  </td>
                  <td>
                    <div class="blocker-text">{{ task.blocker }}</div>
                    <div class="next-action">
                      {{ t('maintenance.myWork.nextActionPrefix') }} {{ task.nextAction }}
                    </div>
                  </td>
                  <td>
                    <div class="owner-text">{{ task.owner }}</div>
                    <VBtn
                      class="mt-2 mro-action-btn"
                      size="small"
                      color="primary"
                      variant="outlined"
                      prepend-icon="mdi-arrow-right-circle-outline"
                      :to="task.route"
                    >
                      {{ t('maintenance.myWork.openWork') }}
                    </VBtn>
                  </td>
                  <td class="action-cell">
                    <VMenu location="bottom end">
                      <template #activator="{ props }">
                        <VBtn
                          v-bind="props"
                          :aria-label="t('maintenance.myWork.actionsAria')"
                          icon="mdi-dots-vertical"
                          variant="text"
                          size="small"
                        />
                      </template>
                      <VList density="compact">
                        <VListItem
                          :to="task.route"
                          prepend-icon="mdi-open-in-new"
                          :title="t('maintenance.myWork.openWork')"
                        />
                        <VListItem
                          prepend-icon="mdi-tag-outline"
                          :title="taskTypeLabel(task)"
                          disabled
                        />
                      </VList>
                    </VMenu>
                  </td>
                </tr>
                <tr v-if="!filteredTasks.length">
                  <td colspan="6" class="state-cell">
                    {{
                      filters.search || filters.type
                        ? t('maintenance.myWork.noFiltered')
                        : t('maintenance.myWork.noRoleTasks')
                    }}
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>
        </div>

        <div class="work-pagination">
          <div>
            {{
              t('maintenance.myWork.pagination', {
                start: paginationStart,
                end: paginationEnd,
                total: filteredTasks.length
              })
            }}
          </div>
          <div class="work-pagination__controls">
            <VBtn
              :aria-label="t('maintenance.myWork.previousPage')"
              icon="mdi-chevron-left"
              variant="tonal"
              :disabled="page <= 1 || pending"
              @click="page = Math.max(1, page - 1)"
            />
            <VBtn class="page-indicator" color="primary" variant="flat">{{ page }}</VBtn>
            <VBtn
              :aria-label="t('maintenance.myWork.nextPage')"
              icon="mdi-chevron-right"
              variant="tonal"
              :disabled="page >= totalPages || pending"
              @click="page = Math.min(totalPages, page + 1)"
            />
            <VSelect
              v-model="itemsPerPage"
              :aria-label="t('maintenance.myWork.perPageAria')"
              :items="itemsPerPageOptions"
              density="compact"
              hide-details
              class="items-per-page"
            />
          </div>
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
.maintenance-work-page {
  min-width: 0;
  padding: 24px;
  color: #0f1b3d;
}

.work-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 22px;
  align-items: center;
  margin-bottom: 24px;
  padding: 28px 32px;
  border: 1px solid rgba(15, 27, 61, 0.1);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(20, 38, 76, 0.06);
}

.work-hero__icon {
  display: grid;
  width: 70px;
  height: 70px;
  place-items: center;
  border: 1px solid #dfe8f7;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef5ff 0%, #f7faff 100%);
  color: #1559b8;
}

.work-hero__copy {
  min-width: 0;
}

.work-hero__eyebrow {
  margin: 0 0 6px;
  color: #0b5db8;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.work-hero h1 {
  margin: 0 0 8px;
  color: #0a1735;
  font-size: clamp(1.55rem, 2.2vw, 2rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0;
}

.work-hero p {
  margin: 0;
  color: #4b5878;
  font-size: 0.95rem;
  line-height: 1.65;
}

.work-hero__actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.role-chip {
  min-height: 38px;
  padding-inline: 14px;
  border-radius: 7px;
  color: #1d2a49;
  font-weight: 700;
}

.work-card {
  overflow: hidden;
  border-color: rgba(15, 27, 61, 0.11) !important;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(20, 38, 76, 0.05);
}

.work-toolbar {
  display: flex;
  align-items: end;
  gap: 18px;
  padding: 2px 0 28px;
}

.work-search {
  flex: 1 1 390px;
  max-width: 430px;
}

.work-type {
  flex: 0 0 230px;
}

.work-field-label {
  margin-bottom: 6px;
  color: #65708b;
  font-size: 0.78rem;
  font-weight: 700;
}

.task-count {
  order: 5;
  margin-left: 0;
  font-weight: 800;
}

.maintenance-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-top: 1px solid #dce3ee;
}

.maintenance-table :deep(table) {
  min-width: 1080px;
  table-layout: fixed;
  border-collapse: collapse;
}

.maintenance-table :deep(thead th) {
  height: 58px;
  color: #35415f;
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
}

.maintenance-table :deep(th),
.maintenance-table :deep(td) {
  vertical-align: top;
  border-bottom: 1px solid #e2e8f0;
}

.maintenance-table :deep(tbody td) {
  padding-top: 22px;
  padding-bottom: 22px;
  color: #1b2848;
  font-size: 0.92rem;
  line-height: 1.55;
}

.maintenance-table--my-work :deep(th:nth-child(1)),
.maintenance-table--my-work :deep(td:nth-child(1)) {
  width: 140px;
}

.sticky-identifier {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #ffffff;
}

.maintenance-table--my-work :deep(th:nth-child(2)),
.maintenance-table--my-work :deep(td:nth-child(2)) {
  width: 250px;
}

.maintenance-table--my-work :deep(th:nth-child(3)),
.maintenance-table--my-work :deep(td:nth-child(3)) {
  width: 180px;
}

.maintenance-table--my-work :deep(th:nth-child(4)),
.maintenance-table--my-work :deep(td:nth-child(4)) {
  width: 320px;
}

.maintenance-table--my-work :deep(th:nth-child(5)),
.maintenance-table--my-work :deep(td:nth-child(5)) {
  width: 165px;
}

.maintenance-table--my-work :deep(th:nth-child(6)),
.maintenance-table--my-work :deep(td:nth-child(6)) {
  width: 56px;
}

.aircraft-cell {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.aircraft-mark {
  border: 1px solid #d7e2f4;
  background: #edf4ff;
  color: #135fbd;
}

.task-title,
.owner-text {
  color: #111a35;
  font-weight: 800;
}

.task-reference,
.status-date,
.next-action {
  margin-top: 7px;
  color: #53617e;
  font-size: 0.86rem;
}

.status-date {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}

.blocker-text {
  color: #1b2848;
}

.action-cell {
  text-align: right;
}

.state-cell {
  color: #53617e;
  font-weight: 700;
  text-align: center;
}

.mro-action-btn {
  min-width: max-content;
  max-width: 100%;
  font-weight: 700;
}

.work-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 28px;
  color: #53617e;
  font-size: 0.9rem;
}

.work-pagination__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  min-width: 40px;
}

.items-per-page {
  width: 160px;
  margin-left: 16px;
}

@media (max-width: 960px) {
  .maintenance-work-page {
    padding: 16px;
  }

  .work-hero {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 22px;
  }

  .work-hero__actions {
    grid-column: 1 / -1;
    justify-content: space-between;
  }

  .work-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .work-search,
  .work-type {
    flex-basis: auto;
    max-width: none;
    width: 100%;
  }

  .task-count {
    align-self: flex-start;
    order: -1;
  }

  .work-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .work-pagination__controls {
    flex-wrap: wrap;
  }

  .items-per-page {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 520px) {
  .maintenance-work-page {
    padding: 12px;
  }

  .work-hero {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 18px;
  }

  .work-hero__icon {
    width: 58px;
    height: 58px;
  }

  .work-hero__actions {
    flex-wrap: wrap;
  }
}
</style>
