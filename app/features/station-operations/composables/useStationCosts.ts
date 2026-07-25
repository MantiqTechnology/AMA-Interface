import type { SelectOption, StationCostRow, StationDataset } from '../types/stationOperations';
import { useStationOperationsContext } from './useStationOperationsContext';

export function useStationCosts(dataset: Ref<StationDataset>, reload: () => Promise<void>) {
  const context = useStationOperationsContext();
  const { can } = useAuthorization();
  const loadingId = ref('');
  const showCreateCost = ref(false);
  const creatingCost = ref(false);
  const categories = ref<SelectOption[]>([]);
  const vendors = ref<SelectOption[]>([]);
  const currencies = ref<SelectOption[]>([]);
  const costForm = reactive({
    flightId: '',
    costCategoryId: '',
    vendorId: '',
    currencyId: '',
    description: '',
    amount: null as number | null
  });

  async function loadOptions(): Promise<void> {
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
    }
  }

  function openCreateCost(): void {
    costForm.flightId = dataset.value.flights[0]?.flightId ?? '';
    costForm.costCategoryId = categories.value[0]?.id ?? '';
    costForm.vendorId = vendors.value[0]?.id ?? '';
    costForm.currencyId =
      currencies.value.find((item) => item.subtitle === 'IDR')?.id ?? currencies.value[0]?.id ?? '';
    costForm.description = '';
    costForm.amount = null;
    showCreateCost.value = true;
  }

  async function submitCreateCost(): Promise<void> {
    if (!costForm.amount || !costForm.description.trim() || !costForm.costCategoryId) return;
    const flight = dataset.value.flights.find((item) => item.flightId === costForm.flightId);

    creatingCost.value = true;
    context.actionError.value = '';
    try {
      await fetchApi('/api/flight-operations/station-costs', {
        method: 'POST',
        body: {
          flightId: flight?.flightId ?? null,
          stationId: `st-${context.selectedStationCode.value.toLowerCase()}`,
          vendorId: costForm.vendorId || null,
          costCategoryId: costForm.costCategoryId,
          amount: costForm.amount,
          currencyId: costForm.currencyId,
          description: costForm.description
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
    categories,
    vendors,
    currencies,
    costForm,
    openCreateCost,
    submitCreateCost,
    processCost
  };
}
