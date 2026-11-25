import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');
const others = ['app.js', ...readdirSync(new URL('../public/views/', import.meta.url)).map((f) => `views/${f}`)];

test('frontend: every lib.js helper used by another module is exported and imported there', () => {
  const lib = read('lib.js');
  const names = [...lib.matchAll(/^(export )?(?:const|let|function|async function) ([A-Za-z_$][\w$]*)/gm)];
  const problems = [];
  for (const [, exported, name] of names) {
    for (const file of others) {
      const src = read(file);
      const body = src.replace(/^import[\s\S]*?from\s+'[^']+';/gm, '');
      if (!new RegExp(`\\b${name.replace('$', '\\$')}\\b`).test(body)) continue;
      if (!exported) problems.push(`${name} is used in ${file} but not exported from lib.js`);
      else if (!new RegExp(`import\\s*\\{[^}]*\\b${name.replace('$', '\\$')}\\b[^}]*\\}\\s*from\\s*'\\.{1,2}/lib\\.js'`).test(src)) {
        // a local definition with the same name is fine
        if (!new RegExp(`(?:const|let|function) ${name.replace('$', '\\$')}\\b`).test(src)) problems.push(`${name} is used in ${file} but not imported`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
