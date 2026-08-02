import type {
  SelectOption,
  ServiceStatus,
  ServiceType,
  StationDataset,
  StationServiceRow
} from '../types/stationOperations';
import { useStationOperationsContext } from './useStationOperationsContext';

interface ServiceLookupResponse {
  stationServiceTypes: Array<{ value: string; label: string }>;
}

export function useStationServices(dataset: Ref<StationDataset>, reload: () => Promise<void>) {
  const context = useStationOperationsContext();
  const { can } = useAuthorization();
  const loadingId = ref('');
  const showCreateService = ref(false);
  const creatingService = ref(false);
  const optionsLoading = ref(false);
  const stationServiceTypes = ref<SelectOption[]>([]);
  const suppliers = ref<SelectOption[]>([]);
  const serviceForm = ref({
    flightId: '',
    serviceTypeId: '',
    serviceSupplierId: '',
    referenceRate: null as number | null,
    creationReason: ''
  });
  const showCompleteService = ref(false);
  const completionForm = ref({
    serviceId: '',
    expectedVersion: 1,
    completionRecord: '',
    evidenceReference: ''
  });

  async function loadOptions(): Promise<void> {
    optionsLoading.value = true;
    try {
      const [lookups, supplierOptions] = await Promise.all([
        fetchApi<ServiceLookupResponse>('/api/flight-operations/lookups'),
        fetchApi<Array<{ id: string; supplierCode: string; supplierName: string }>>(
          '/api/master-data/handling-parking-suppliers/options'
        )
      ]);
      stationServiceTypes.value = lookups.stationServiceTypes.map((item) => ({
        id: item.value,
        title: item.label
      }));
      suppliers.value = supplierOptions.map((item) => ({
        id: item.id,
        title: item.supplierName,
        subtitle: item.supplierCode
      }));
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memuat opsi station service.';
    } finally {
      optionsLoading.value = false;
    }
  }

  async function openCreateService(): Promise<void> {
    if (!stationServiceTypes.value.length || !suppliers.value.length) {
      await loadOptions();
    }
    serviceForm.value = {
      flightId: dataset.value.flights[0]?.flightId ?? '',
      serviceTypeId: stationServiceTypes.value[0]?.id ?? '',
      serviceSupplierId: '',
      referenceRate: null,
      creationReason: ''
    };
    showCreateService.value = true;
  }

  async function submitCreateService(): Promise<void> {
    const flight = dataset.value.flights.find(
      (item) => item.flightId === serviceForm.value.flightId
    );
    if (!context.selectedStationId.value) {
      context.actionError.value = 'Station master data is unavailable. Refresh and try again.';
      return;
    }
    if (!flight || !serviceForm.value.serviceTypeId || !serviceForm.value.serviceSupplierId) return;

    creatingService.value = true;
    context.actionError.value = '';
    try {
      await fetchApi<{
        id: string;
        serviceType: ServiceType;
        status: ServiceStatus;
      }>('/api/flight-operations/station-services', {
        method: 'POST',
        body: {
          flightId: flight.flightId,
          stationId: context.selectedStationId.value,
          serviceSupplierId: serviceForm.value.serviceSupplierId,
          serviceTypeId: serviceForm.value.serviceTypeId,
          referenceRate: serviceForm.value.referenceRate,
          creationReason: serviceForm.value.creationReason
        }
      });
      showCreateService.value = false;
      await reload();
      context.actionSuccess.value = 'Station service created.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal membuat station service.';
    } finally {
      creatingService.value = false;
    }
  }

  async function confirmService(row: StationServiceRow): Promise<void> {
    loadingId.value = row.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-services/${row.id}/actions/confirm`, {
        method: 'POST',
        body: { expectedVersion: row.version }
      });
      await reload();
      context.actionSuccess.value = 'Station service confirmed.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memproses station service.';
    } finally {
      loadingId.value = '';
    }
  }

  function openCompleteService(row: StationServiceRow): void {
    completionForm.value = {
      serviceId: row.id,
      expectedVersion: row.version,
      completionRecord: '',
      evidenceReference: ''
    };
    showCompleteService.value = true;
  }

  async function completeService(): Promise<void> {
    const form = completionForm.value;
    if (!form.completionRecord.trim() || !form.evidenceReference.trim()) return;
    loadingId.value = form.serviceId;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-services/${form.serviceId}/actions/complete`, {
        method: 'POST',
        body: {
          expectedVersion: form.expectedVersion,
          completionRecord: form.completionRecord,
          evidenceReference: form.evidenceReference
        }
      });
      showCompleteService.value = false;
      await reload();
      context.actionSuccess.value = 'Station service completion recorded.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal mencatat completion station service.';
    } finally {
      loadingId.value = '';
    }
  }

  async function verifyService(row: StationServiceRow): Promise<void> {
    loadingId.value = row.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-services/${row.id}/actions/verify`, {
        method: 'POST',
        body: { expectedVersion: row.version }
      });
      await reload();
      context.actionSuccess.value = 'Station service verified.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memverifikasi station service.';
    } finally {
      loadingId.value = '';
    }
  }

  onMounted(loadOptions);

  return {
    can,
    loadingId,
    showCreateService,
    creatingService,
    optionsLoading,
    stationServiceTypes,
    suppliers,
    serviceForm,
    showCompleteService,
    completionForm,
    openCreateService,
    submitCreateService,
    confirmService,
    openCompleteService,
    completeService,
    verifyService
  };
}
