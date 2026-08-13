import { existsSync } from 'node:fs';
import { createDbClient } from '../../server/db/client';
import { createServices } from '../../server/services';

type WorkerInput = {
  dbPath: string;
  gatePath: string;
  workPackageId: string;
  requirementId: string;
  assetId: string;
  idempotencyKey: string;
};

const actor = {
  userId: 'USR-MAINTENANCE-MANAGER',
  role: 'Maintenance Manager'
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGate(path: string) {
  const deadline = Date.now() + 10_000;
  while (!existsSync(path)) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for gate ${path}`);
    await sleep(5);
  }
}

async function main() {
  const input = JSON.parse(
    Buffer.from(process.argv[2] ?? '', 'base64url').toString('utf8')
  ) as WorkerInput;
  await waitForGate(input.gatePath);
  const client = createDbClient(input.dbPath);
  try {
    const allocation = createServices(client.sqlite).maintenance.allocateGse(
      input.workPackageId,
      {
        requirementId: input.requirementId,
        assetId: input.assetId,
        idempotencyKey: input.idempotencyKey
      },
      actor
    );
    console.log(
      JSON.stringify({ ok: true, allocationId: allocation.id, status: allocation.status })
    );
  } catch (error) {
    const detail = error as { code?: string; statusCode?: number; message?: string };
    console.log(
      JSON.stringify({
        ok: false,
        code: detail.code ?? 'ERROR',
        statusCode: detail.statusCode ?? null,
        message: detail.message ?? String(error)
      })
    );
  } finally {
    client.sqlite.close();
  }
}

main().catch((error) => {
  console.log(
    JSON.stringify({ ok: false, code: 'WORKER_FAILED', message: error?.message ?? String(error) })
  );
  process.exitCode = 1;
});
