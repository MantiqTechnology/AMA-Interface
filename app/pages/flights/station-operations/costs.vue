<script setup lang="ts">
import { useStationCosts } from '../../../features/station-operations/composables/useStationCosts';
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { money } from '../../../features/station-operations/utils/stationOperationsFormatters';
import { type StationCostRow } from '../../../features/station-operations/types/stationOperations';

const { context, pending, dataset, load } = useStationOperationsPageData();
const costs = useStationCosts(dataset, load);
const search = ref('');
const status = ref('ALL');
const costType = ref('ALL');
const evidenceReadiness = ref('ALL');
const accountingStatus = ref('ALL');
const selectedCost = ref<StationCostRow | null>(null);

const costTypes = computed(() => [
  'ALL',
  ...new Set(dataset.value.costs.map((cost) => cost.costCategoryName))
]);
const variance = (cost: StationCostRow) =>
  cost.actualAmount == null || cost.estimatedAmount == null
    ? null
    : cost.actualAmount - cost.estimatedAmount;
const variancePercent = (cost: StationCostRow) => {
  const amount = variance(cost);
  return amount == null || !cost.estimatedAmount
    ? null
    : `${((amount * 100) / cost.estimatedAmount).toFixed(1)}%`;
};
const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(value))
    : '-';

const filteredCosts = computed<StationCostRow[]>(() => {
  const term = search.value.trim().toLowerCase();
  const costs: StationCostRow[] = dataset.value.costs;

  return costs
    .filter((cost: StationCostRow) => {
      const searchableText = [
        cost.flightNumber ?? '',
        cost.vendorName ?? '',
        cost.supplierName ?? '',
        cost.costCategoryName,
        cost.description
      ]
        .join(' ')
        .toLowerCase();
      const hasEvidence = Boolean(cost.evidenceReference);
      const accountingMatches =
        accountingStatus.value === 'ALL' ||
        (accountingStatus.value === 'EXCEPTION' &&
          cost.status === 'APPROVED' &&
          (!cost.financeHandoffId || !cost.accountingEventId)) ||
        cost.reconciliationStatus === accountingStatus.value ||
        cost.journalStatus === accountingStatus.value;

      return (
        (!term || searchableText.includes(term)) &&
        (status.value === 'ALL' || cost.status === status.value) &&
        (costType.value === 'ALL' || cost.costCategoryName === costType.value) &&
        (evidenceReadiness.value === 'ALL' ||
          (evidenceReadiness.value === 'READY' ? hasEvidence : !hasEvidence)) &&
        accountingMatches
      );
    })
    .sort((left, right) => {
      const priority = (cost: StationCostRow) =>
        cost.status === 'SUBMITTED'
          ? 0
          : cost.status === 'APPROVED' && (!cost.financeHandoffId || !cost.accountingEventId)
            ? 1
            : cost.status === 'DRAFT'
              ? 2
              : 3;
      return priority(left) - priority(right);
    });
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Station Costs</h2>
        <p class="text-caption text-text-secondary">
          Operational station cost records. Accounting ownership remains in Accounting Workbench.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <VTextField
          v-model="search"
          label="Search cost"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="status"
          :items="['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'VOID', 'VOIDED']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 170px"
        />
        <VSelect
          v-model="costType"
          :items="costTypes"
          label="Cost type"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 190px"
        />
        <VSelect
          v-model="evidenceReadiness"
          :items="[
            { title: 'All evidence', value: 'ALL' },
            { title: 'Evidence ready', value: 'READY' },
            { title: 'Evidence missing', value: 'MISSING' }
          ]"
          label="Evidence"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 170px"
        />
        <VSelect
          v-model="accountingStatus"
          :items="[
            { title: 'All accounting', value: 'ALL' },
            { title: 'Exceptions', value: 'EXCEPTION' },
            { title: 'Not accounting ready', value: 'NOT_ACCOUNTING_READY' },
            { title: 'Not reconciled', value: 'NOT_RECONCILED' },
            { title: 'Reconciled', value: 'RECONCILED' },
            { title: 'Draft journal', value: 'DRAFT' },
            { title: 'Posted journal', value: 'POSTED' }
          ]"
          label="Accounting"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 190px"
        />
        <VBtn
          v-if="costs.can('station.operation.update').allowed"
          color="primary"
          prepend-icon="mdi-plus"
          :loading="costs.optionsLoading.value || context.stationOptionsPending.value"
          :disabled="pending || !context.selectedStationId.value"
          @click="costs.openCreateCost"
        >
          Create Cost
        </VBtn>
      </div>
    </div>
    <VDivider />
    <div class="overflow-x-auto">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Category</th>
            <th>Station</th>
            <th>Vendor</th>
            <th>Estimate / Actual</th>
            <th>Variance</th>
            <th>Evidence</th>
            <th>Finance</th>
            <th>Accounting</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="10" class="py-8 text-center">
              <VProgressCircular indeterminate size="22" class="mr-2" />Loading costs...
            </td>
          </tr>
          <tr v-else-if="filteredCosts.length === 0">
            <td colspan="10" class="py-8 text-center text-text-secondary">
              No station cost matches these filters.
            </td>
          </tr>
          <tr v-for="row in filteredCosts" v-else :key="row.id">
            <td class="font-weight-medium">{{ row.flightNumber ?? 'Station' }}</td>
            <td>{{ row.costCategoryName }}</td>
            <td>{{ row.stationCode }}</td>
            <td>{{ row.vendorName ?? row.supplierName ?? '-' }}</td>
            <td>
              <div class="font-weight-medium">
                {{
                  row.actualAmount == null
                    ? 'Actual pending'
                    : money(row.actualAmount, row.currencyCode)
                }}
              </div>
              <div v-if="row.estimatedAmount != null" class="text-caption text-text-secondary">
                REFERENCE ESTIMATE {{ money(row.estimatedAmount, row.currencyCode) }}
              </div>
            </td>
            <td>
              <span v-if="variance(row) != null">
                {{ money(variance(row)!, row.currencyCode) }}
                <span class="text-caption text-text-secondary"> ({{ variancePercent(row) }}) </span>
              </span>
              <span v-else class="text-text-secondary">-</span>
            </td>
            <td>
              <DsStatusBadge :value="row.evidenceReference ? 'READY' : 'MISSING'" />
            </td>
            <td>
              <DsStatusBadge :value="row.status" />
              <div class="text-caption text-text-secondary">
                Handoff {{ row.financeHandoffStatus ?? 'not created' }}
              </div>
            </td>
            <td>
              <DsStatusBadge :value="row.reconciliationStatus" />
              <div class="text-caption text-text-secondary">
                {{ row.financialBasis.replaceAll('_', ' ') }}
              </div>
              <div v-if="row.journalStatus" class="text-caption">
                Journal {{ row.journalStatus }}
              </div>
            </td>
            <td class="text-right">
              <div class="d-flex justify-end ga-1">
                <DsTooltipIconButton
                  icon="mdi-eye-outline"
                  tooltip="Review cost traceability"
                  variant="text"
                  @click="selectedCost = row"
                />
                <VBtn
                  v-if="
                    row.status === 'DRAFT' &&
                      costs.can('station.operation.update').allowed &&
                      row.actualAmount == null
                  "
                  prepend-icon="mdi-receipt-text-edit-outline"
                  size="small"
                  variant="tonal"
                  @click="costs.openActualCost(row)"
                >
                  Record actual
                </VBtn>
                <DsConfirmIconButton
                  v-if="
                    row.status === 'DRAFT' &&
                      costs.can('station.operation.update').allowed &&
                      row.actualAmount != null
                  "
                  :action="() => costs.processCost(row)"
                  color="primary"
                  icon="mdi-send"
                  confirm-icon="mdi-send"
                  confirm-text="Submit"
                  :loading="costs.loadingId.value === row.id"
                  :message="`Submit cost ${row.description}.`"
                  title="Submit station cost?"
                  tooltip="Submit cost"
                  variant="flat"
                  size="small"
                />
                <DsConfirmIconButton
                  v-if="row.status === 'SUBMITTED' && costs.can('station.cost.approve').allowed"
                  :action="() => costs.processCost(row)"
                  color="success"
                  icon="mdi-check-decagram-outline"
                  confirm-icon="mdi-check"
                  confirm-text="Approve"
                  :loading="costs.loadingId.value === row.id"
                  :message="`Approve cost ${row.description}.`"
                  title="Approve station cost?"
                  tooltip="Approve cost"
                  variant="flat"
                  size="small"
                />
                <VBtn
                  v-if="
                    ['DRAFT', 'SUBMITTED'].includes(row.status) &&
                      costs.can('station.cost.approve').allowed
                  "
                  prepend-icon="mdi-cancel"
                  size="small"
                  variant="text"
                  @click="costs.openVoidCost(row)"
                >
                  Void
                </VBtn>
                <DsTooltipIconButton
                  v-if="row.flightId"
                  icon="mdi-open-in-new"
                  tooltip="Open cost in flight workspace"
                  variant="text"
                  :to="`/flights/station-operations/${row.flightId}?tab=costs&sourceRecordId=${row.id}`"
                />
                <span v-else class="text-caption text-text-secondary">-</span>
              </div>
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VCard>

  <CostsCreateStationCostDialog
    v-model="costs.showCreateCost.value"
    v-model:form="costs.costForm.value"
    :creating="costs.creatingCost.value"
    :flights="dataset.flights"
    :categories="costs.categories.value"
    :vendors="costs.vendors.value"
    :currencies="costs.currencies.value"
    @submit="costs.submitCreateCost"
  />

  <VDialog v-model="costs.showActualCost.value" max-width="620">
    <VCard>
      <VCardTitle tag="h2">Record Actual Station Cost</VCardTitle>
      <VCardSubtitle>REFERENCE ESTIMATE is preserved separately from actual cost.</VCardSubtitle>
      <VCardText class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <VTextField
            v-model.number="costs.actualCostForm.value.actualAmount"
            label="Actual amount"
            min="0"
            type="number"
            variant="outlined"
          />
          <VSelect
            v-model="costs.actualCostForm.value.currencyId"
            :items="costs.currencies.value"
            item-title="title"
            item-value="id"
            label="Currency"
            variant="outlined"
          />
        </div>
        <VTextField
          v-model="costs.actualCostForm.value.vendorReference"
          label="Vendor / invoice / receipt reference"
          variant="outlined"
        />
        <VTextField
          v-model="costs.actualCostForm.value.evidenceReference"
          label="Cost evidence reference"
          variant="outlined"
        />
        <VTextarea
          v-model="costs.actualCostForm.value.description"
          label="Description"
          rows="3"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="costs.showActualCost.value = false">Cancel</VBtn>
        <VBtn
          color="primary"
          :loading="Boolean(costs.loadingId.value)"
          :disabled="
            costs.actualCostForm.value.actualAmount == null ||
              !costs.actualCostForm.value.currencyId ||
              costs.actualCostForm.value.vendorReference.trim().length < 3 ||
              costs.actualCostForm.value.evidenceReference.trim().length < 3 ||
              costs.actualCostForm.value.description.trim().length < 3
          "
          @click="costs.saveActualCost"
        >
          Save actual
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="costs.showVoidCost.value" max-width="520">
    <VCard>
      <VCardTitle tag="h2">Void Station Cost</VCardTitle>
      <VCardText>
        <VTextarea
          v-model="costs.voidCostForm.value.reason"
          label="Reason"
          hint="The actor, timestamp, and reason are retained in the operational record."
          persistent-hint
          rows="3"
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="costs.showVoidCost.value = false">Cancel</VBtn>
        <VBtn
          color="warning"
          :disabled="costs.voidCostForm.value.reason.trim().length < 5"
          :loading="Boolean(costs.loadingId.value)"
          @click="costs.voidCost"
        >
          Void cost
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog
    :model-value="Boolean(selectedCost)"
    max-width="860"
    @update:model-value="selectedCost = null"
  >
    <VCard v-if="selectedCost">
      <VCardTitle tag="h2">Station Cost Finance Traceability</VCardTitle>
      <VCardSubtitle>
        {{ selectedCost.flightNumber }} · {{ selectedCost.stationCode }} ·
        {{ selectedCost.costCategoryName }}
      </VCardSubtitle>
      <VCardText class="flex flex-col gap-4">
        <VAlert
          :type="selectedCost.reconciliationStatus === 'RECONCILED' ? 'success' : 'info'"
          variant="tonal"
        >
          {{ selectedCost.financialBasis.replaceAll('_', ' ') }} ·
          {{ selectedCost.reconciliationStatus.replaceAll('_', ' ') }}
        </VAlert>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <VCard border variant="flat" class="pa-3">
            <div class="text-caption text-text-secondary">REFERENCE ESTIMATE</div>
            <div class="text-h6">
              {{
                selectedCost.estimatedAmount == null
                  ? 'Not recorded'
                  : money(selectedCost.estimatedAmount, selectedCost.currencyCode)
              }}
            </div>
          </VCard>
          <VCard border variant="flat" class="pa-3">
            <div class="text-caption text-text-secondary">FINANCE ACTUAL</div>
            <div class="text-h6">
              {{
                selectedCost.actualAmount == null
                  ? 'Not submitted'
                  : money(selectedCost.actualAmount, selectedCost.currencyCode)
              }}
            </div>
          </VCard>
          <VCard border variant="flat" class="pa-3">
            <div class="text-caption text-text-secondary">POSTED LEDGER</div>
            <div class="text-h6">
              {{
                selectedCost.postedLedgerAmount == null
                  ? 'Not posted'
                  : money(
                    selectedCost.postedLedgerAmount,
                    selectedCost.approvedCurrencyCode ?? selectedCost.currencyCode
                  )
              }}
            </div>
          </VCard>
        </div>
        <VTable density="compact">
          <tbody>
            <tr>
              <th>Supplier</th>
              <td>{{ selectedCost.supplierName ?? selectedCost.vendorName ?? '-' }}</td>
            </tr>
            <tr>
              <th>Invoice/reference</th>
              <td>{{ selectedCost.vendorReference ?? '-' }}</td>
            </tr>
            <tr>
              <th>Cost evidence</th>
              <td>{{ selectedCost.evidenceReference ?? 'Missing' }}</td>
            </tr>
            <tr>
              <th>Submitted</th>
              <td>
                {{ selectedCost.submittedByUserId ?? '-' }} ·
                {{ formatDateTime(selectedCost.submittedAt) }}
              </td>
            </tr>
            <tr>
              <th>Approved</th>
              <td>
                {{ selectedCost.approvedByUserId ?? '-' }} ·
                {{ formatDateTime(selectedCost.approvedAt) }}
              </td>
            </tr>
            <tr>
              <th>Finance Handoff</th>
              <td>{{ selectedCost.financeHandoffStatus ?? 'Not created' }}</td>
            </tr>
            <tr>
              <th>Accounting Event</th>
              <td>{{ selectedCost.accountingEventStatus ?? 'Not created' }}</td>
            </tr>
            <tr>
              <th>Journal</th>
              <td>{{ selectedCost.journalStatus ?? 'Not created' }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
      <VCardActions>
        <VBtn
          v-if="selectedCost.journalEntryId"
          prepend-icon="mdi-book-open-page-variant"
          :to="`/finance/accounting?tab=posting-queue&journalId=${selectedCost.journalEntryId}`"
          variant="tonal"
        >
          Open Accounting Workbench
        </VBtn>
        <VSpacer />
        <VBtn variant="text" @click="selectedCost = null">Close</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
