import { safeDemoRoleRedirectPath } from '../utils/demoRouteAccess';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return;

  const session = useDemoSession();
  await session.load();

  const redirectPath = safeDemoRoleRedirectPath(session.role.value, to.path);
  if (!redirectPath || redirectPath === to.path) return;

  return navigateTo(redirectPath, { replace: true });
});
