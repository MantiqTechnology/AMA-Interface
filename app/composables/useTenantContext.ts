export function useTenantContext() {
  return {
    activeTenant: {
      id: 'TENANT-AMA-DEMO',
      code: 'AMA',
      mode: 'SINGLE_TENANT' as const
    }
  };
}
