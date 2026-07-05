export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();

  if (String(config.demoMode) !== 'true') {
    console.warn('AMA interface is running with DEMO_MODE disabled.');
  }
});
