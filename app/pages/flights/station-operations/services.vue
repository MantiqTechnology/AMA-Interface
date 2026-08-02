<script setup lang="ts">
import { useStationOperationsPageData } from '../../../features/station-operations/composables/useStationOperationsPageData';
import { useStationServices } from '../../../features/station-operations/composables/useStationServices';
import type { StationServiceRow } from '../../../features/station-operations/types/stationOperations';
import { money } from '../../../features/station-operations/utils/stationOperationsFormatters';

const { context, pending, dataset, load } = useStationOperationsPageData();
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
          :items="[
            'ALL',
            'PLANNED',
            'REQUESTED',
            'CONFIRMED',
            'COMPLETED',
            'VERIFIED',
            'REJECTED',
            'CANCELLED'
          ]"
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
          :loading="services.optionsLoading.value || context.stationOptionsPending.value"
          :disabled="pending || dataset.flights.length === 0 || !context.selectedStationId.value"
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
                  ['PLANNED', 'REQUESTED'].includes(row.status) &&
                    services.can('station.operation.update').allowed
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
              <VBtn
                v-else-if="
                  row.status === 'CONFIRMED' && services.can('station.operation.update').allowed
                "
                prepend-icon="mdi-clipboard-check-outline"
                size="small"
                variant="tonal"
                @click="services.openCompleteService(row)"
              >
                Complete
              </VBtn>
              <DsConfirmIconButton
                v-else-if="
                  row.status === 'COMPLETED' && services.can('station.task.verify').allowed
                "
                :action="() => services.verifyService(row)"
                color="success"
                confirm-icon="mdi-check-decagram"
                confirm-text="Verify"
                icon="mdi-check-decagram-outline"
                :loading="services.loadingId.value === row.id"
                :message="`Verify completion evidence for ${row.flightNumber}.`"
                title="Verify station service?"
                tone="success"
                tooltip="Verify service"
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

  <VDialog v-model="services.showCompleteService.value" max-width="560">
    <VCard>
      <VCardTitle tag="h2">Record Service Completion</VCardTitle>
      <VCardText class="flex flex-col gap-4">
        <VTextarea
          v-model="services.completionForm.value.completionRecord"
          label="Structured completion record"
          hint="Record what was delivered, when, and any operational exception."
          persistent-hint
          rows="3"
          variant="outlined"
        />
        <VTextField
          v-model="services.completionForm.value.evidenceReference"
          label="Evidence or checklist reference"
          hint="A document, photo, checklist, or external reference."
          persistent-hint
          variant="outlined"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="services.showCompleteService.value = false">Cancel</VBtn>
        <VBtn
          color="primary"
          :loading="Boolean(services.loadingId.value)"
          :disabled="
            services.completionForm.value.completionRecord.trim().length < 5 ||
              services.completionForm.value.evidenceReference.trim().length < 3
          "
          @click="services.completeService"
        >
          Record completion
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
