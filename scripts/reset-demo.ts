import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { resetDemoDatabase } from '../server/db/reset-demo';

const dbPath = process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite';

await resetDemoDatabase(dbPath);

await rm(join(process.cwd(), 'public', 'uploads', 'mock-receipts', '.DS_Store'), { force: true });

console.log(`Reset and reseeded AMA demo database at ${dbPath}`);
