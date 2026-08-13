import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLocalEnv } from './load-env';
import { resetDemoDatabase } from '../server/db/reset-demo';

loadLocalEnv();

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';

await resetDemoDatabase(dbPath, { resetDocuments: true });

await rm(join(process.cwd(), 'public', 'uploads', 'mock-receipts', '.DS_Store'), { force: true });

console.log(`Reset and reseeded AMA operational scenarios at ${dbPath}`);
