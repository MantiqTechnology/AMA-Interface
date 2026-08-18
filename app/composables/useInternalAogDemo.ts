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
      await session.switchRole(scenario.nextRole);
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
