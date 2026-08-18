import type { InternalAogDemoDto } from '#shared/features/maintenance';

export async function useInternalAogDemo() {
  const session = useDemoSession();
  const state = await useAsyncData('internal-aog-demo', () =>
    fetchApi<InternalAogDemoDto>('/api/maintenance/demo/internal-aog')
  );

  async function continueScenario() {
    const scenario = state.data.value;
    if (!scenario?.nextAction || !scenario.nextRole) return;
    if (session.role.value !== scenario.nextRole) {
      // The coach owns the destination; avoid the generic role redirect to dashboard
      // so the guided hand-off lands directly on the focused MRO/Inventory screen.
      await session.switchRole(scenario.nextRole, false);
    }
    if (import.meta.client) {
      // A full navigation lets the server-side role cookie and the route guard settle
      // before loading the next role's focused page.
      window.location.assign(scenario.nextAction.href);
      return;
    }
    await navigateTo(scenario.nextAction.href);
  }

  async function resetScenario() {
    await fetchApi('/api/maintenance/demo/internal-aog/reset', { method: 'POST' });
    await refreshNuxtData();
    await navigateTo('/maintenance');
  }

  return { ...state, role: session.role, continueScenario, resetScenario };
}
