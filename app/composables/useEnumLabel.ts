export function useEnumLabel() {
  const { t } = useI18n();

  function flightRequestStatus(status: string | null | undefined) {
    if (!status) return '-';
    const key = `enums.flightRequestStatus.${status}`;
    const label = t(key);
    return label === key ? status.replaceAll('_', ' ') : label;
  }

  function generic(value: string | null | undefined) {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return {
    flightRequestStatus,
    generic
  };
}
