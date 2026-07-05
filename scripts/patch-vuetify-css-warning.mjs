import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

const replacements = [
  ['calc(16px / 24px)', '0.6666666667'],
  ['calc(28px / 24px)', '1.1666666667']
];

function patchFile(filePath) {
  if (!existsSync(filePath)) return false;

  const original = readFileSync(filePath, 'utf8');
  const patched = replacements.reduce(
    (content, [from, to]) => content.replaceAll(from, to),
    original
  );

  if (patched === original) return false;

  writeFileSync(filePath, patched);
  return true;
}

try {
  const vuetifyPackagePath = require.resolve('vuetify/package.json');
  const vuetifyRoot = dirname(vuetifyPackagePath);
  const cssPath = join(vuetifyRoot, 'lib/components/VSwitch/VSwitch.css');
  const changed = patchFile(cssPath);

  if (changed) {
    console.log('Patched Vuetify VSwitch CSS for PostCSS unit division compatibility.');
  }
} catch (error) {
  console.warn(`Skipped Vuetify CSS patch: ${error instanceof Error ? error.message : error}`);
}
