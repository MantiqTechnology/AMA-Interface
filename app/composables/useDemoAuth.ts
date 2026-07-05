import type { DemoSessionDto } from '#shared/contracts/auth';
import type { DemoRole } from '#shared/types/roles';

export function useDemoAuth() {
  const session = useState<DemoSessionDto>('demo-session', () => ({
    role: 'Director',
    demoMode: true
  }));

  async function refreshSession() {
    session.value = await fetchApi<DemoSessionDto>('/api/auth/session');
    return session.value;
  }

  async function switchRole(role: DemoRole) {
    session.value = await fetchApi<DemoSessionDto>('/api/auth/role', {
      method: 'POST',
      body: { role }
    });
    return session.value;
  }

  return {
    session,
    refreshSession,
    switchRole
  };
}
