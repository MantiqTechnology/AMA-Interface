import type { DemoSessionDto } from '#shared/contracts/auth';
import { demoRoles, demoRoleStationScopes, type DemoRole } from '#shared/types/roles';
import { safeDemoRoleRedirectPath } from '../utils/demoRouteAccess';

const personaDetails: Record<DemoRole, { name: string; label: string; stationScope: string[] }> = {
  'Demo Admin': {
    name: 'AMA Demo Administrator',
    label: 'Platform administrator',
    stationScope: ['ALL']
  },
  Director: { name: 'AMA Operations Director', label: 'Executive approver', stationScope: ['ALL'] },
  OCC: { name: 'AMA OCC Controller', label: 'Operations control', stationScope: ['DJJ', 'WMX'] },
  'OCC Checker': {
    name: 'AMA OCC Readiness Checker',
    label: 'Independent readiness checker',
    stationScope: ['DJJ', 'WMX']
  },
  'Station Admin': {
    name: 'Wamena Station Admin',
    label: 'Destination station operations',
    stationScope: ['WMX']
  },
  'Station Admin Origin': {
    name: 'Jayapura Station Admin',
    label: 'Origin station operations',
    stationScope: ['DJJ']
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
  'Maintenance Technician': {
    name: 'AMA Maintenance Technician',
    label: 'Mechanic sign-off',
    stationScope: [...demoRoleStationScopes['Maintenance Technician']]
  },
  'Certifying Staff': {
    name: 'Certifying Staff',
    label: 'Technical Release',
    stationScope: [...demoRoleStationScopes['Certifying Staff']]
  },
  'Inventory Controller': {
    name: 'AMA Inventory Controller',
    label: 'Inventory and procurement control',
    stationScope: [...demoRoleStationScopes['Inventory Controller']]
  },
  'HR Staff': {
    name: 'AMA HR Staff',
    label: 'Human resources administration',
    stationScope: ['ALL']
  },
  'HR Manager': {
    name: 'AMA HR Manager',
    label: 'HR management and payroll approval',
    stationScope: ['ALL']
  },
  'Chief of Pilot': {
    name: 'AMA Chief of Pilot',
    label: 'Pilot certifications and roster',
    stationScope: ['ALL']
  },
  Employee: {
    name: 'Budi Santoso',
    label: 'Employee self-service',
    stationScope: ['ALL']
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

    if (import.meta.client) {
      const redirectPath = safeDemoRoleRedirectPath(session.role, window.location.pathname);
      if (redirectPath) {
        await navigateTo(redirectPath, { replace: true });
      }
      await refreshNuxtData();
    }
  }

  return { role, demoMode, personas, currentPersona, load, switchRole };
}
