import { createAppServices } from '../services';

export function getServices() {
  const config = useRuntimeConfig();
  return createAppServices(config.dbPath);
}
