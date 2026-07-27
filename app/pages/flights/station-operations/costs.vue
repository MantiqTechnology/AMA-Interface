<script setup lang="ts">
import { useStationCosts } from '../../../features/station-operations/composables/useStationCosts';
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { money } from '../../../features/station-operations/utils/stationOperationsFormatters';
import { type StationCostRow } from '../../../features/station-operations/types/stationOperations';

const { context, pending, dataset, load } = useStationOperationsPageData();
const costs = useStationCosts(dataset, load);
const search = ref('');
const status = ref('ALL');

const filteredCosts = computed<StationCostRow[]>(() => {
  const term = search.value.trim().toLowerCase();
  const costs: StationCostRow[] = dataset.value.costs;

  return costs.filter((cost: StationCostRow) => {
    const searchableText = [
      cost.flightNumber ?? '',
      cost.vendorName ?? '',
      cost.costCategoryName,
      cost.description
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!term || searchableText.includes(term)) &&
      (status.value === 'ALL' || cost.status === status.value)
    );
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
          :items="['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'VOID']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 170px"
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
            <th>Vendor</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="7" class="py-8 text-center">
              <VProgressCircular indeterminate size="22" class="mr-2" />Loading costs...
            </td>
          </tr>
          <tr v-else-if="filteredCosts.length === 0">
            <td colspan="7" class="py-8 text-center text-text-secondary">No station cost found.</td>
          </tr>
          <tr v-for="row in filteredCosts" v-else :key="row.id">
            <td class="font-weight-medium">{{ row.flightNumber ?? 'Station' }}</td>
            <td>{{ row.costCategoryName }}</td>
            <td>{{ row.vendorName ?? '-' }}</td>
            <td>{{ row.description }}</td>
            <td>{{ money(row.amount, row.currencyCode) }}</td>
            <td><DsStatusBadge :value="row.status" /></td>
            <td class="text-right">
              <DsConfirmIconButton
                v-if="row.status === 'DRAFT' && costs.can('station.operation.update').allowed"
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
                v-else-if="row.status === 'SUBMITTED' && costs.can('station.cost.approve').allowed"
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
              <DsTooltipIconButton
                v-else-if="row.flightId"
                icon="mdi-open-in-new"
                tooltip="Open cost in flight workspace"
                variant="text"
                :to="`/flights/station-operations/${row.flightId}?tab=costs&sourceRecordId=${row.id}`"
              />
              <span v-else class="text-caption text-text-secondary">—</span>
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
</template>
