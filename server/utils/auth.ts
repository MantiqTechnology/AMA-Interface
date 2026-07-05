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
