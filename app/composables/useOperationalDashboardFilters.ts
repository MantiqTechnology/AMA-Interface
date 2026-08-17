import type {
  DashboardPeriod,
  OperationalDashboardQuery
} from '#shared/contracts/operational-dashboards';

const periods: DashboardPeriod[] = ['TODAY', 'THIS_WEEK', 'THIS_MONTH'];

function todayInOperationalTimeZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jayapura',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function useOperationalDashboardFilters() {
  const route = useRoute();
  const dashboardPath = route.path;
  const period = ref<DashboardPeriod>(
    periods.includes(route.query.period as DashboardPeriod)
      ? (route.query.period as DashboardPeriod)
      : 'THIS_WEEK'
  );
  const anchorDate = ref(
    typeof route.query.anchorDate === 'string'
      ? route.query.anchorDate
      : todayInOperationalTimeZone()
  );
  const stationId = ref<string | null>(
    typeof route.query.stationId === 'string' ? route.query.stationId : null
  );
  const query = computed<OperationalDashboardQuery>(() => ({
    period: period.value,
    anchorDate: anchorDate.value,
    stationId: stationId.value ?? undefined
  }));

  watch([period, anchorDate, stationId], () => {
    if (!import.meta.client || window.location.pathname !== dashboardPath) return;
    const params = new URLSearchParams({
      period: period.value,
      anchorDate: anchorDate.value
    });
    if (stationId.value) params.set('stationId', stationId.value);
    window.history.replaceState(window.history.state, '', `${dashboardPath}?${params.toString()}`);
  });

  return {
    period,
    anchorDate,
    stationId,
    query,
    periodOptions: [
      { title: 'Hari ini', value: 'TODAY' },
      { title: 'Minggu ini', value: 'THIS_WEEK' },
      { title: 'Bulan ini', value: 'THIS_MONTH' }
    ] as Array<{ title: string; value: DashboardPeriod }>
  };
}
