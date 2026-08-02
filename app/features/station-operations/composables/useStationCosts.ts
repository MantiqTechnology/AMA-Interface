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
    amount: null as number | null,
    vendorReference: '',
    evidenceReference: ''
  });
  const showActualCost = ref(false);
  const actualCostForm = ref({
    id: '',
    expectedVersion: 1,
    actualAmount: null as number | null,
    currencyId: '',
    vendorReference: '',
    evidenceReference: '',
    description: ''
  });
  const showVoidCost = ref(false);
  const voidCostForm = ref({ id: '', expectedVersion: 1, reason: '' });

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
      vendorId: '',
      currencyId:
        currencies.value.find((item) => item.subtitle === 'IDR')?.id ??
        currencies.value[0]?.id ??
        '',
      description: '',
      amount: null,
      vendorReference: '',
      evidenceReference: ''
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
          description: costForm.value.description,
          vendorReference: costForm.value.vendorReference,
          evidenceReference: costForm.value.evidenceReference
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

  function openActualCost(row: StationCostRow): void {
    actualCostForm.value = {
      id: row.id,
      expectedVersion: row.version,
      actualAmount: row.actualAmount,
      currencyId: currencies.value.find((item) => item.subtitle === row.currencyCode)?.id ?? '',
      vendorReference: row.vendorReference ?? '',
      evidenceReference: row.evidenceReference ?? '',
      description: row.description
    };
    showActualCost.value = true;
  }

  async function saveActualCost(): Promise<void> {
    const form = actualCostForm.value;
    if (
      form.actualAmount === null ||
      !form.currencyId ||
      !form.vendorReference.trim() ||
      !form.evidenceReference.trim() ||
      !form.description.trim()
    ) {
      return;
    }
    loadingId.value = form.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-costs/${form.id}`, {
        method: 'PATCH',
        body: {
          expectedVersion: form.expectedVersion,
          actualAmount: form.actualAmount,
          currencyId: form.currencyId,
          vendorReference: form.vendorReference,
          evidenceReference: form.evidenceReference,
          description: form.description
        }
      });
      showActualCost.value = false;
      await reload();
      context.actionSuccess.value = 'Actual station cost and evidence recorded.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal menyimpan actual station cost.';
    } finally {
      loadingId.value = '';
    }
  }

  function openVoidCost(row: StationCostRow): void {
    voidCostForm.value = { id: row.id, expectedVersion: row.version, reason: '' };
    showVoidCost.value = true;
  }

  async function voidCost(): Promise<void> {
    const form = voidCostForm.value;
    if (form.reason.trim().length < 5) return;
    loadingId.value = form.id;
    context.actionError.value = '';
    try {
      await fetchApi(`/api/flight-operations/station-costs/${form.id}/actions/void`, {
        method: 'POST',
        body: { expectedVersion: form.expectedVersion, reason: form.reason }
      });
      showVoidCost.value = false;
      await reload();
      context.actionSuccess.value = 'Station cost voided with an audit reason.';
    } catch (error) {
      context.actionError.value =
        error instanceof Error ? error.message : 'Gagal melakukan void station cost.';
    } finally {
      loadingId.value = '';
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
    showActualCost,
    actualCostForm,
    showVoidCost,
    voidCostForm,
    openCreateCost,
    submitCreateCost,
    processCost,
    openActualCost,
    saveActualCost,
    openVoidCost,
    voidCost
  };
}
