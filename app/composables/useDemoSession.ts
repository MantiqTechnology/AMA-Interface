import type { DemoLoginBody, DemoSessionDto } from '#shared/contracts/auth';
import type { DemoRole } from '#shared/types/roles';

export function useDemoSession() {
  const session = useState<DemoSessionDto | null>('ama-demo-session', () => null);
  const loaded = useState('ama-demo-session-loaded', () => false);
  const loading = useState('ama-demo-session-loading', () => false);
  const config = useRuntimeConfig();
  const role = computed<DemoRole>(() => session.value?.role ?? 'Director');
  const demoMode = computed(
    () => session.value?.demoMode ?? String(config.public.demoMode) === 'true'
  );
  const currentPersona = computed(() => ({
    name: session.value?.displayName ?? 'AMA Demo User',
    label: session.value?.personaLabel ?? 'Session required',
    stationScope: session.value?.stationScopes ?? []
  }));

  async function load(force = false) {
    if (loaded.value && !force) return session.value;
    if (loading.value) return session.value;
    loading.value = true;
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
      session.value = await fetchApi<DemoSessionDto>('/api/auth/session', { headers });
      loaded.value = true;
      return session.value;
    } catch (error) {
      session.value = null;
      loaded.value = true;
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: DemoLoginBody) {
    session.value = await fetchApi<DemoSessionDto>('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
    loaded.value = true;
    return session.value;
  }

  async function logout(redirect = true) {
    try {
      await fetchApi<{ signedOut: true }>('/api/auth/logout', { method: 'POST' });
    } finally {
      session.value = null;
      loaded.value = true;
    }
    if (redirect) await navigateTo('/login', { replace: true });
  }

  return { session, role, demoMode, currentPersona, loaded, loading, load, login, logout };
}
