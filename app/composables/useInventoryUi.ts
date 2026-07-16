export function useInventoryUi() {
  function money(value: number | null | undefined, currency = 'IDR') {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(value);
  }

  function number(value: number | null | undefined, maximumFractionDigits = 2) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);
  }

  function dateTime(value: string | null | undefined) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function date(value: string | null | undefined) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
  }

  function errorMessage(error: unknown, fallback = 'Inventory action failed') {
    return error instanceof Error ? error.message : fallback;
  }

  return { money, number, date, dateTime, errorMessage };
}
