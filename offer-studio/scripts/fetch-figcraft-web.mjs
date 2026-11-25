// Downloads the official FigCraft web build (WebAssembly) that Offer Studio embeds as its slide editor
// (/static/editor.html -> /figcraft/?host=parent). Checks the SHA-256 from the release's SHA256SUMS.txt,
// unpacks it into FIGCRAFT_WEB_DIR (default: vendor/figcraft-web) and precompresses the .wasm and .js
// (.br, .gz), which the server sends as they are.
//
//   npm run figcraft-web            (skips the download when that version is already there)
//
// When bumping FigCraft, change VERSION and SHA256 here and in figcraft/web/Dockerfile.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';

const VERSION = '0.18.1';
const SHA256 = '2fbeb93f5022b0a7cc9d8528f1ed7e2b54c94d213ef79e65128aa898c399f02b';
const URL = `https://github.com/storytold/figcraft/releases/download/v${VERSION}/figcraft-web-${VERSION}.zip`;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.env.FIGCRAFT_WEB_DIR || join(ROOT, 'vendor', 'figcraft-web'));
const STAMP = join(OUT, '.version');

if (existsSync(STAMP) && (await readFile(STAMP, 'utf8')).trim() === VERSION) {
  console.log(`figcraft-web ${VERSION} is already in ${OUT}`);
  process.exit(0);
}

console.log(`figcraft-web: downloading ${URL}`);
const res = await fetch(URL);
if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
const zip = Buffer.from(await res.arrayBuffer());
const sha = createHash('sha256').update(zip).digest('hex');
if (sha !== SHA256) throw new Error(`SHA-256 mismatch: expected ${SHA256}, got ${sha}`);

await rm(OUT, { recursive: true, force: true });
const prefix = `figcraft-web-${VERSION}/`;
const files = unzipSync(new Uint8Array(zip));
let count = 0;
for (const [name, data] of Object.entries(files)) {
  if (name.endsWith('/') || !name.startsWith(prefix)) continue;
  const rel = name.slice(prefix.length);
  // sample header files for other hosts; Offer Studio sets its own headers
  if (rel === '_headers' || rel === '.htaccess') continue;
  if (rel.includes('..')) throw new Error(`unsafe path in the archive: ${name}`);
  const path = join(OUT, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  count++;
  if (/\.(wasm|js)$/.test(rel)) {
    await writeFile(`${path}.gz`, gzipSync(data, { level: 9 }));
    await writeFile(`${path}.br`, brotliCompressSync(data, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_SIZE_HINT]: data.length },
    }));
  }
}
if (!existsSync(join(OUT, 'index.html'))) throw new Error('the archive has no index.html');
await writeFile(STAMP, `${VERSION}\n`);
console.log(`figcraft-web ${VERSION}: ${count} files in ${OUT}`);
