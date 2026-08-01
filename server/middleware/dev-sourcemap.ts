export default defineEventHandler((event) => {
  const path = event.path || '';
  if (path.endsWith('.map') || path.includes('installHook.js')) {
    setResponseStatus(event, 404);
    return '';
  }
});
