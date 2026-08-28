import { isAbsolute, resolve } from 'node:path';

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  if (String(config.demoMode) !== 'true') return;

  const secret = process.env.DEMO_SESSION_SECRET ?? String(config.demoSessionSecret ?? '');
  if (Buffer.byteLength(secret) < 32) {
    throw new Error('DEMO_SESSION_SECRET must contain at least 32 bytes before demo startup.');
  }

  const configuredPath = process.env.AMA_DB_PATH ?? String(config.dbPath ?? '');
  const resolvedPath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);
  if (process.env.VERCEL || resolvedPath === '/tmp' || resolvedPath.startsWith('/tmp/')) {
    throw new Error(
      'Controlled demo mode refuses ephemeral SQLite. Use a local persistent AMA_DB_PATH; serverless deployment remains unsupported.'
    );
  }
  if (process.env.NODE_ENV === 'production' && !process.env.AMA_DB_PATH) {
    throw new Error('AMA_DB_PATH must be set explicitly for the production-mode demo server.');
  }
});
