export function useLocaleFormat() {
  const { locale } = useAppLocale();

  const intlLocale = computed(() => (locale.value === 'id' ? 'id-ID' : 'en-US'));

  function date(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
    if (!value) return '-';
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return '-';
    return new Intl.DateTimeFormat(intlLocale.value, {
      dateStyle: 'medium',
      ...options
    }).format(dateValue);
  }

  function dateTime(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
    return date(value, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    });
  }

  function time(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
    if (!value) return '-';
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return '-';
    return new Intl.DateTimeFormat(intlLocale.value, {
      timeStyle: 'short',
      ...options
    }).format(dateValue);
  }

  function number(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat(intlLocale.value, options).format(value);
  }

  function currency(
    value: number | null | undefined,
    currencyCode = 'IDR',
    options?: Intl.NumberFormatOptions
  ) {
    return number(value, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      ...options
    });
  }

  return {
    currency,
    date,
    dateTime,
    number,
    time
  };
}
