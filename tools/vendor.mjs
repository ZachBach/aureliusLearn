/**
 * vendor.mjs — pull the geo-lib and tsl-lib modules this app uses into lib/.
 *
 * One-way, byte-identical. The studio's libraries live in the AureliusDynamic
 * repo; this app is a separate repo with a separate remote, so it carries its
 * own copies rather than reaching across a directory boundary at runtime. Both
 * libraries are written to be vendored exactly like this — every builder takes
 * the three.js or TSL namespace as its first argument and imports nothing
 * external, so a copied file needs no rewriting to work here.
 *
 *   node tools/vendor.mjs           # copy, report what changed
 *   node tools/vendor.mjs --check   # report drift, write nothing, exit 1 if any
 *
 * Copies are byte-identical ON PURPOSE: that is what makes --check able to say
 * "upstream moved and this copy did not". Never hand-edit anything under lib/ —
 * fix it upstream and re-run, or the next vendor run silently reverts you.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);
const STUDIO = dirname(APP); // the AureliusDynamic checkout this repo sits in

// Relative import paths INSIDE these files are preserved by keeping the
// family/name shape — solid/revolve.js does `import ... from '../core/loft.js'`
// and that resolves unchanged under lib/geo/.
const FILES = [
  ['geo-lib/src/core/loft.js', 'lib/geo/core/loft.js'],
  ['geo-lib/src/core/merge.js', 'lib/geo/core/merge.js'],
  ['geo-lib/src/core/assembly.js', 'lib/geo/core/assembly.js'],
  ['geo-lib/src/solid/revolve.js', 'lib/geo/solid/revolve.js'],
  ['geo-lib/src/solid/roundedBox.js', 'lib/geo/solid/roundedBox.js'],
  ['tsl-lib/src/util/palette.js', 'lib/tsl/util/palette.js'],
  ['tsl-lib/src/fresnel/fresnel.js', 'lib/tsl/fresnel/fresnel.js'],
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const check = process.argv.includes('--check');

const manifestPath = join(APP, 'lib', 'VENDORED.json');
const prev = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { files: {} };

const manifest = { source: 'ZachBach/AureliusDynamic', vendored: new Date().toISOString().slice(0, 10), files: {} };
let changed = 0;
let missing = 0;

for (const [from, to] of FILES) {
  const src = resolve(STUDIO, from);
  if (!existsSync(src)) {
    console.error(`  MISSING  ${from} — is this repo still inside the AureliusDynamic checkout?`);
    missing++;
    continue;
  }
  const buf = readFileSync(src);
  const hash = sha(buf);
  manifest.files[to] = { from, sha256: hash, bytes: buf.length };

  const dst = join(APP, to);
  const same = existsSync(dst) && sha(readFileSync(dst)) === hash;
  if (same) {
    console.log(`  ok       ${to}`);
    continue;
  }
  changed++;
  const was = prev.files?.[to]?.sha256;
  console.log(`  ${check ? 'DRIFT   ' : 'updated '} ${to}${was ? `  ${was} -> ${hash}` : '  (new)'}`);
  if (!check) {
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, buf);
  }
}

if (missing) {
  console.error(`\n${missing} source file(s) not found — nothing written.`);
  process.exit(1);
}
if (!check) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(
  check
    ? changed
      ? `\n${changed} file(s) drifted from upstream. Run: node tools/vendor.mjs`
      : '\nlib/ matches upstream.'
    : `\n${FILES.length} file(s) vendored, ${changed} changed.`,
);
if (check && changed) process.exit(1);
