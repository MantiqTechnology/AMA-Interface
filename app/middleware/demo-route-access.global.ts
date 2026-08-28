import { safeDemoRoleRedirectPath } from '../utils/demoRouteAccess';

const publicPrefixes = ['/', '/login'];

function isPublicPath(path: string) {
  return publicPrefixes.some((prefix) =>
    prefix === '/' ? path === '/' : path === prefix || path.startsWith(`${prefix}/`)
  );
}

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useDemoSession();
  if (isPublicPath(to.path)) {
    if ((to.path === '/' || to.path === '/login') && !session.loaded.value) {
      try {
        await session.load();
      } catch {
        return;
      }
    }
    if ((to.path === '/' || to.path === '/login') && session.session.value) {
      return navigateTo('/dashboard', { replace: true });
    }
    return;
  }

  try {
    await session.load();
  } catch {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } }, { replace: true });
  }
  if (!session.session.value) return navigateTo('/login', { replace: true });
  const redirectPath = safeDemoRoleRedirectPath(session.role.value, to.path);
  if (!redirectPath || redirectPath === to.path) return;

  return navigateTo(redirectPath, { replace: true });
});
