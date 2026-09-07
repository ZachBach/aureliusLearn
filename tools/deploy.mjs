/**
 * deploy.mjs — copy the built app into the Aurelius site at /learn/.
 *
 *   node tools/deploy.mjs           # copy
 *   node tools/deploy.mjs --dry     # list what would be copied
 *
 * Same arrangement as /helix/, /ikos/ and /galaxy/: the site serves deployed
 * output, and this repo is the upstream. There is no build step to run first —
 * the app is plain ES modules and the site is plain static hosting, so the
 * "build" is this copy.
 *
 * Deliberately NOT copied: tools/ and its screenshots, .git, and the docs.
 * What lands in the site is what a browser needs and nothing else.
 *
 * This writes into the OTHER repository. It stages nothing and commits
 * nothing — deploying is a copy, publishing is a commit over there, and the
 * site's master branch is wired to Vercel so that commit is the deploy.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);
const SITE = dirname(APP);
const DEST = join(SITE, 'learn');

const COPY = ['index.html', 'src', 'lib', 'fonts', 'vendor'];
const dry = process.argv.includes('--dry');

if (!existsSync(join(SITE, 'index.html')) || !existsSync(join(SITE, 'tsl-lib'))) {
  console.error(`This does not look like the Aurelius site checkout: ${SITE}`);
  console.error('Expected to find index.html and tsl-lib/ beside this repo.');
  process.exit(1);
}

let files = 0;
let bytes = 0;
const walk = (p) => {
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const full = join(p, e.name);
    if (e.isDirectory()) walk(full);
    else { files++; bytes += statSync(full).size; }
  }
};
for (const name of COPY) {
  const src = join(APP, name);
  if (!existsSync(src)) {
    console.error(`missing: ${name}`);
    process.exit(1);
  }
  if (statSync(src).isDirectory()) walk(src);
  else { files++; bytes += statSync(src).size; }
}

console.log(`${relative(SITE, APP)} -> ${relative(SITE, DEST)}/`);
for (const name of COPY) console.log(`  ${name}`);
console.log(`${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);

if (dry) {
  console.log('--dry: nothing written');
  process.exit(0);
}

// Replace rather than merge: a stale file left behind from a previous layout
// is served by the site exactly as happily as a current one.
if (existsSync(DEST)) rmSync(DEST, { recursive: true });
mkdirSync(DEST, { recursive: true });
for (const name of COPY) cpSync(join(APP, name), join(DEST, name), { recursive: true });

console.log(`\nwrote ${DEST}`);
console.log('The site repo now has an untracked learn/ — review and commit it there.');
