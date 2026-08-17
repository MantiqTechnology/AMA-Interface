import { safeDemoRoleRedirectPath } from '../utils/demoRouteAccess';

export default defineNuxtRouteMiddleware((to) => {
  const session = useDemoSession();
  const redirectPath = safeDemoRoleRedirectPath(session.role.value, to.path);
  if (!redirectPath || redirectPath === to.path) return;

  return navigateTo(redirectPath, { replace: true });
});
