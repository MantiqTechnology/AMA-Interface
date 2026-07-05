import { getDbClient } from '../db/client';
import { runMigrations } from '../db/migrate';

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const { sqlite } = getDbClient(config.dbPath);

  runMigrations(sqlite);
});
