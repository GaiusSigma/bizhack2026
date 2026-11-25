// Copies the icons (svg) next to the compiled nodes: n8n resolves them relative to the .node.js file.
import { cpSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

for (const file of walk('nodes').filter((f) => f.endsWith('.svg') || f.endsWith('.png'))) {
  cpSync(file, join('dist', file));
}
