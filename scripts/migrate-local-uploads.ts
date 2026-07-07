import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type LocalUploadManifest = {
  uploads: Array<{
    id: string;
    filename: string;
    path: string;
  }>;
};

const manifestPath =
  process.env.AMA_UPLOAD_MANIFEST ?? join(process.cwd(), 'data', 'local-uploads.json');
const oldUploadDir = join(process.cwd(), 'public', 'uploads', 'local');
const newUploadDir = process.env.AMA_UPLOAD_DIR ?? join(process.cwd(), 'data', 'uploads', 'local');

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(manifestPath))) {
    console.log('No local upload manifest found. Nothing to migrate.');
    return;
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as LocalUploadManifest;
  await mkdir(newUploadDir, { recursive: true });

  let moved = 0;

  for (const upload of manifest.uploads) {
    const oldPath = join(oldUploadDir, upload.filename);
    const newPath = join(newUploadDir, upload.filename);

    if ((await exists(oldPath)) && !(await exists(newPath))) {
      await rename(oldPath, newPath);
      moved += 1;
    }

    upload.path = `local/${upload.filename}`;
  }

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Migrated ${moved} local upload file(s) to ${newUploadDir}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
