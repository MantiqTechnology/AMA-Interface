<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { useStationServices } from '../../../features/station-operations/composables/useStationServices';
import type { StationServiceRow } from '../../../features/station-operations/types/stationOperations';
import { money } from '../../../features/station-operations/utils/stationOperationsFormatters';

const { pending, dataset, load } = useStationOperationsPageData();
const services = useStationServices(dataset, load);

const search = ref('');
const status = ref('ALL');
const type = ref('ALL');

const filteredServices = computed<StationServiceRow[]>(() => {
  const term = search.value.trim().toLowerCase();
  const rows = dataset.value.services;

  return rows.filter((service) => {
    const matchesSearch =
      !term || `${service.flightNumber} ${service.supplierName}`.toLowerCase().includes(term);

    const matchesStatus = status.value === 'ALL' || service.status === status.value;

    const matchesType = type.value === 'ALL' || service.serviceType === type.value;

    return matchesSearch && matchesStatus && matchesType;
  });
});
</script>

<template>
  <VCard border>
    <div class="flex flex-col gap-4 pa-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 class="text-h6 font-weight-bold">Station Services</h2>
        <p class="text-caption text-text-secondary">
          Handling and parking services for the selected operational day.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <VTextField
          v-model="search"
          label="Search"
          density="compact"
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
        />
        <VSelect
          v-model="type"
          :items="['ALL', 'HANDLING', 'PARKING']"
          label="Type"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 150px"
        />
        <VSelect
          v-model="status"
          :items="['ALL', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']"
          label="Status"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 170px"
        />
        <VBtn
          v-if="services.can('station.operation.update').allowed"
          color="primary"
          prepend-icon="mdi-plus"
          @click="services.openCreateService"
        >
          Create Service
        </VBtn>
      </div>
    </div>
    <VDivider />
    <div class="overflow-x-auto">
      <VTable density="comfortable" hover>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Type</th>
            <th>Supplier</th>
            <th>Reference Rate</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending">
            <td colspan="6" class="py-8 text-center">
              <VProgressCircular indeterminate size="22" class="mr-2" />Loading services...
            </td>
          </tr>
          <tr v-else-if="filteredServices.length === 0">
            <td colspan="6" class="py-8 text-center text-text-secondary">
              No station service found.
            </td>
          </tr>
          <tr v-for="row in filteredServices" v-else :key="row.id">
            <td class="font-weight-medium">{{ row.flightNumber }}</td>
            <td>{{ row.serviceType }}</td>
            <td>{{ row.supplierName }}</td>
            <td>{{ row.referenceRate == null ? '-' : money(row.referenceRate) }}</td>
            <td><DsStatusBadge :value="row.status" /></td>
            <td class="text-right">
              <DsConfirmIconButton
                v-if="
                  row.status === 'REQUESTED' && services.can('station.operation.update').allowed
                "
                :action="() => services.confirmService(row)"
                color="success"
                confirm-icon="mdi-check"
                confirm-text="Confirm"
                icon="mdi-check"
                :loading="services.loadingId.value === row.id"
                :message="`Confirm station service for ${row.flightNumber}.`"
                title="Confirm station service?"
                tone="success"
                tooltip="Confirm service"
                variant="flat"
                size="small"
              />
              <DsTooltipIconButton
                v-else
                icon="mdi-open-in-new"
                tooltip="Open service in flight workspace"
                variant="text"
                :to="`/flights/station-operations/${row.flightId}?tab=services&sourceRecordId=${row.id}`"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
  </VCard>

  <ServicesCreateStationServiceDialog
    v-model="services.showCreateService.value"
    v-model:form="services.serviceForm.value"
    :creating="services.creatingService.value"
    :flights="dataset.flights"
    :service-types="services.stationServiceTypes.value"
    :suppliers="services.suppliers.value"
    @submit="services.submitCreateService"
  />
</template>
