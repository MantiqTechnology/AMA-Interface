import type { DemoSessionDto } from '#shared/contracts/auth';
import { demoRoles, demoRoleStationScopes, type DemoRole } from '#shared/types/roles';

const personaDetails: Record<DemoRole, { name: string; label: string; stationScope: string[] }> = {
  'Demo Admin': {
    name: 'AMA Demo Administrator',
    label: 'Platform administrator',
    stationScope: ['ALL']
  },
  Director: { name: 'AMA Operations Director', label: 'Executive approver', stationScope: ['ALL'] },
  OCC: { name: 'AMA OCC Controller', label: 'Operations control', stationScope: ['DJJ', 'WMX'] },
  'Station Admin': {
    name: 'Wamena Station Admin',
    label: 'Station operations',
    stationScope: ['WMX']
  },
  'Finance Reviewer': {
    name: 'AMA Finance Reviewer',
    label: 'Invoice and finance review',
    stationScope: ['ALL']
  },
  'Maintenance Manager': {
    name: 'AMA Maintenance Manager',
    label: 'Maintenance review',
    stationScope: [...demoRoleStationScopes['Maintenance Manager']]
  },
  'Inventory Controller': {
    name: 'AMA Inventory Controller',
    label: 'Inventory and procurement control',
    stationScope: [...demoRoleStationScopes['Inventory Controller']]
  }
};

export function useDemoSession() {
  const role = useState<DemoRole>('ama-demo-role', () => 'Demo Admin');
  const demoMode = useState('ama-demo-mode', () => true);
  const loaded = useState('ama-demo-session-loaded', () => false);
  const personas = demoRoles.map((personaRole) => ({
    role: personaRole,
    ...personaDetails[personaRole]
  }));
  const currentPersona = computed(() => personaDetails[role.value]);

  async function load() {
    if (loaded.value) return;
    const session = await fetchApi<DemoSessionDto>('/api/auth/session');
    role.value = session.role;
    demoMode.value = session.demoMode;
    loaded.value = true;
  }

  async function switchRole(nextRole: DemoRole) {
    const session = await fetchApi<DemoSessionDto>('/api/auth/role', {
      method: 'POST',
      body: { role: nextRole }
    });
    role.value = session.role;
    demoMode.value = session.demoMode;
  }

  return { role, demoMode, personas, currentPersona, load, switchRole };
}
