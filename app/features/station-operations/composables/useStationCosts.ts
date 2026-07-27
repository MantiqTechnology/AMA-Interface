import type { SelectOption, StationCostRow, StationDataset } from '../types/stationOperations';
import { useStationOperationsContext } from './useStationOperationsContext';

export function useStationCosts(dataset: Ref<StationDataset>, reload: () => Promise<void>) {
  const context = useStationOperationsContext();
  const { can } = useAuthorization();
  const loadingId = ref('');
  const showCreateCost = ref(false);
  const creatingCost = ref(false);
  const optionsLoading = ref(false);
  const categories = ref<SelectOption[]>([]);
  const vendors = ref<SelectOption[]>([]);
  const currencies = ref<SelectOption[]>([]);
  const costForm = ref({
    flightId: '',
    costCategoryId: '',
    vendorId: '',
    currencyId: '',
    description: '',
    amount: null as number | null
  });

  async function loadOptions(): Promise<void> {
    optionsLoading.value = true;
    try {
      const [categoryOptions, vendorOptions, currencyOptions] = await Promise.all([
        fetchApi<Array<{ id: string; categoryCode: string; categoryName: string }>>(
          '/api/master-data/cost-categories/options'
        ),
        fetchApi<Array<{ id: string; vendorCode: string; vendorName: string }>>(
          '/api/master-data/vendors/options'
        ),
        fetchApi<Array<{ id: string; currencyCode: string; currencyName: string }>>(
          '/api/master-data/currencies/options'
        )
      ]);
      categories.value = categoryOptions.map((item) => ({
        id: item.id,
        title: item.categoryName,
        subtitle: item.categoryCode
      }));
      vendors.value = vendorOptions.map((item) => ({
        id: item.id,
        title: item.vendorName,
        subtitle: item.vendorCode
      }));
      currencies.value = currencyOptions.map((item) => ({
        id: item.id,
        title: item.currencyName,
        subtitle: item.currencyCode
      }));
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memuat opsi station cost.';
    } finally {
      optionsLoading.value = false;
    }
  }

  async function openCreateCost(): Promise<void> {
    if (!categories.value.length || !currencies.value.length) {
      await loadOptions();
    }
    costForm.value = {
      flightId: dataset.value.flights[0]?.flightId ?? '',
      costCategoryId: categories.value[0]?.id ?? '',
      vendorId: vendors.value[0]?.id ?? '',
      currencyId:
        currencies.value.find((item) => item.subtitle === 'IDR')?.id ??
        currencies.value[0]?.id ??
        '',
      description: '',
      amount: null
    };
    showCreateCost.value = true;
  }

  async function submitCreateCost(): Promise<void> {
    if (!context.selectedStationId.value) {
      context.actionError.value = 'Station master data is unavailable. Refresh and try again.';
      return;
    }
    if (
      costForm.value.amount === null ||
      !costForm.value.description.trim() ||
      !costForm.value.costCategoryId
    )
      return;
    const flight = dataset.value.flights.find((item) => item.flightId === costForm.value.flightId);

    creatingCost.value = true;
    context.actionError.value = '';
    try {
      await fetchApi('/api/flight-operations/station-costs', {
        method: 'POST',
        body: {
          flightId: flight?.flightId ?? null,
          stationId: context.selectedStationId.value,
          vendorId: costForm.value.vendorId || null,
          costCategoryId: costForm.value.costCategoryId,
          amount: costForm.value.amount,
          currencyId: costForm.value.currencyId,
          description: costForm.value.description
        }
      });
      showCreateCost.value = false;
      await reload();
      context.actionSuccess.value = 'Station cost created.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal membuat station cost.';
    } finally {
      creatingCost.value = false;
    }
  }

  async function processCost(row: StationCostRow): Promise<void> {
    const action = row.status === 'DRAFT' ? 'submit' : 'approve';
    loadingId.value = row.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-costs/${row.id}/actions/${action}`, {
        method: 'POST',
        body: { expectedVersion: row.version }
      });
      await reload();
      context.actionSuccess.value =
        row.status === 'DRAFT' ? 'Station cost submitted.' : 'Station cost approved.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal memproses station cost.';
    } finally {
      loadingId.value = '';
    }
  }

  onMounted(loadOptions);

  return {
    can,
    loadingId,
    showCreateCost,
    creatingCost,
    optionsLoading,
    categories,
    vendors,
    currencies,
    costForm,
    openCreateCost,
    submitCreateCost,
    processCost
  };
}
