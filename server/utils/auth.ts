import { getCookie, setCookie, type H3Event } from 'h3';
import { demoRoleSchema } from '../../shared/contracts/auth';
import { defaultDemoRole, type DemoRole } from '../../shared/types/roles';

const roleCookieName = 'ama_demo_role';

export function getDemoRole(event: H3Event): DemoRole {
  const role = getCookie(event, roleCookieName);
  const parsed = demoRoleSchema.safeParse(role);
  return parsed.success ? parsed.data : defaultDemoRole;
}

export function setDemoRole(event: H3Event, role: DemoRole) {
  setCookie(event, roleCookieName, role, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
}

export function getDemoActorId(event: H3Event) {
  const actors: Record<DemoRole, string> = {
    'Demo Admin': 'USR-DEMO-ADMIN',
    Director: 'USR-DIRECTOR',
    OCC: 'USR-001',
    'Station Admin': 'USR-STATION-ADMIN',
    'Maintenance Manager': 'USR-MAINTENANCE-MANAGER'
  };
  return actors[getDemoRole(event)];
}
