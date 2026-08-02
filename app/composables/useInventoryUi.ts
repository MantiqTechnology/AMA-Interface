export function useInventoryUi() {
  const format = useLocaleFormat();
  const apiErrors = useApiErrorMessage();

  function money(value: number | null | undefined, currency = 'IDR') {
    return format.currency(value, currency);
  }

  function number(value: number | null | undefined, maximumFractionDigits = 2) {
    return format.number(value, { maximumFractionDigits });
  }

  function dateTime(value: string | null | undefined) {
    return format.dateTime(value);
  }

  function date(value: string | null | undefined) {
    return format.date(value);
  }

  function errorMessage(error: unknown, fallback = 'Inventory action failed') {
    return apiErrors.errorMessage(error, fallback);
  }

  return { money, number, date, dateTime, errorMessage };
}
