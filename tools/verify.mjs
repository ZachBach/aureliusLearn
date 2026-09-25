/**
 * verify.mjs — headless smoke for Aurelius Learn, both backends.
 *
 *   node tools/verify.mjs              # webgpu + webgl2
 *   node tools/verify.mjs webgl2       # one backend
 *
 * Gates on four things: zero console errors, the backend actually reached
 * (a silent WebGPU-to-WebGL fallback would otherwise pass unnoticed), six
 * parts with finite bounds and real triangle counts, and every view rendering
 * without throwing. Shots land in tools/shots/.
 *
 * The screenshots are the point as much as the assertions are. geo-lib's bench
 * makes the argument better than this comment can: every real geometry bug it
 * found produced a mesh that was perfectly valid and completely wrong, and not
 * one of them would have failed a numeric test.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const STUDIO = join(APP, '..');
const SHOTS = join(HERE, 'shots');
const PORT = 8733;
const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// puppeteer-core, borrowed from tsl-lib's bench rather than installed twice —
// same arrangement geo-lib uses. NODE_PATH does not affect ESM resolution, so
// the borrow goes through a CJS require rooted at that package.
const BORROW = join(STUDIO, 'tsl-lib', 'bench', 'package.json');
let puppeteer;
try {
  puppeteer = createRequire(import.meta.url)('puppeteer-core');
} catch {
  try {
    puppeteer = createRequire(BORROW)('puppeteer-core');
  } catch {
    console.error('puppeteer-core not found. `npm i puppeteer-core` here, or in ../tsl-lib/bench.');
    process.exit(2);
  }
}

const VIEWS = ['train', 'library', 'build', 'readiness'];
const backends = process.argv[2] ? [process.argv[2]] : ['webgpu', 'webgl2'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const server = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: APP, stdio: 'ignore' });
await sleep(800);

let failed = 0;
const fail = (msg) => { console.error('  FAIL  ' + msg); failed++; };

try {
  for (const backend of backends) {
    console.log(`\n== ${backend}`);
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: 'new',
      args: ['--enable-unsafe-webgpu', '--hide-scrollbars', '--no-first-run',
        `--user-data-dir=${join(HERE, 'chrome-profile-' + backend)}`],
      defaultViewport: { width: 1600, height: 900 },
    });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url().slice(0, 120)));

    if (backend === 'webgl2') {
      await page.evaluateOnNewDocument(() =>
        Object.defineProperty(navigator, 'gpu', { get: () => undefined }));
    }

    // Any request off localhost is a privacy regression: this app is meant to
    // contact nobody at runtime, and a re-added font or CDN link would show up
    // here and nowhere else.
    const offsite = [];
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith('data:') && !u.startsWith('blob:')) {
        offsite.push(u.slice(0, 120));
      }
    });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__learn, { timeout: 30000 }).catch(() => {});
    await sleep(2500);

    const booted = await page.evaluate(() => !!window.__learn);
    if (!booted) fail('window.__learn never appeared — the viewport did not boot');

    const gotBackend = await page.evaluate(() => window.__learn.vp.backend);
    const want = backend === 'webgpu' ? 'WEBGPU' : 'WEBGL2';
    if (!gotBackend.startsWith(want)) fail(`backend is "${gotBackend}", expected ${want}`);
    else console.log(`  ok    backend ${gotBackend}`);

    // Bore radii the profiles are authored to. A part listed here that comes
    // back solid has had its hole roofed over by an end cap; one absent from
    // the map must come back solid.
    const BORES = {
      housing: 0.40, seal: 0.44, cartridge: 0.30, cap: 0.40, collar: 0.50,
      motor_housing: 0.82, motor_stator: 0.35, motor_windings: 0.67,
      motor_drive_bearing: 0.13, motor_non_drive_bearing: 0.13,
      motor_drive_endbell: 0.13, motor_non_drive_endbell: 0.13, motor_fan: 0.13,
    };

    // Every authored module, not just the one that opens by default — the
    // second module's parts are otherwise never built during a check.
    const authored = await page.evaluate(() =>
      window.__learn.MODULES.filter((m) => m.authored).map((m) => m.code));

    for (const code of authored) {
      console.log(`  -- module ${code}`);
      await page.evaluate((c) => window.__learn.openModule(c), code);
      await sleep(900);

      const info = await page.evaluate(() => {
        const l = window.__learn;
        const m = l.MODULES.find((x) => x.code === l.state.moduleCode);
        const stack = l.vp.stack();
        // Every step and check must point at a part this module actually
        // shows. A mismatch leaves the viewport highlighting nothing while the
        // text talks confidently about a component that is not on screen —
        // which reads as a rendering bug and is really a data one.
        const orphans = [...m.steps, ...m.checks]
          .map((s) => s.part)
          .filter((p) => !stack.includes(p));
        return { stats: l.vp.stats(), stack, orphans: [...new Set(orphans)], steps: m.steps.length };
      });

      if (info.orphans.length) {
        fail(`${code}: step/check parts not in the stack: ${info.orphans.join(', ')}`);
      } else {
        console.log(`  ok    ${info.steps} steps, every part in the stack`);
      }

      if (code === 'MOTOR-01') {
        const walkthrough = await page.evaluate(() => {
          const { MODULES, state } = window.__learn;
          const module = MODULES.find((m) => m.code === state.moduleCode);
          const timeline = [...document.querySelectorAll('.timeline button')];
          const titles = [];
          for (let i = 0; i < module.steps.length - 1; i++) {
            timeline[i].click();
            titles.push(document.querySelector('.detail h2')?.textContent);
          }
          timeline.at(-1).click();
          return {
            expected: module.steps.slice(0, -1).map((step) => step.title),
            titles,
            checkCount: module.checks.length,
            correctIndex: module.checks[0].answers.findIndex((answer) => answer.ok),
          };
        });
        if (walkthrough.titles.some((title, i) => title !== walkthrough.expected[i])) {
          fail('MOTOR-01: a walkthrough step did not render its authored title');
        } else {
          console.log(`  ok    all ${walkthrough.titles.length} assembly steps render`);
        }
        if (walkthrough.checkCount !== 3 || walkthrough.correctIndex < 0) {
          fail('MOTOR-01: expected three answerable knowledge checks');
        } else {
          const answersAccepted = await page.evaluate(() => {
            const module = window.__learn.MODULES.find((m) => m.code === 'MOTOR-01');
            const accepted = [];
            module.checks.forEach((check, i) => {
              const answer = check.answers.findIndex((item) => item.ok);
              document.querySelectorAll('.answers button')[answer].click();
              accepted.push(document.querySelector('.feedback')?.textContent.includes('CORRECT'));
              if (i < module.checks.length - 1) document.querySelector('.foot button.primary').click();
            });
            return accepted;
          });
          if (!answersAccepted.every(Boolean)) fail('MOTOR-01: a knowledge-check answer was not accepted');
          else console.log('  ok    all three knowledge checks accept their authored answers');
        }
      }

      for (const s of info.stats) {
        const bore = BORES[s.key];
        if (!s.finite) fail(`${code} ${s.key}: non-finite bounds (a NaN in the profile)`);
        else if (s.tris < 100) fail(`${code} ${s.key}: only ${s.tris} triangles`);
        else if (!(s.height > 0.01)) fail(`${code} ${s.key}: zero height`);
        else if (bore && Math.abs(s.minRadius - bore) > 0.01) {
          fail(`${code} ${s.key}: bore is ${s.minRadius.toFixed(3)}, authored at ${bore.toFixed(2)}`);
        } else if (!bore && s.minRadius > 0.01) {
          fail(`${code} ${s.key}: expected solid, but has a ${s.minRadius.toFixed(3)} hole`);
        } else {
          console.log(`  ok    ${s.key.padEnd(10)} ${String(Math.round(s.tris)).padStart(6)} tris  h=${s.height.toFixed(3)}  r=${s.radius.toFixed(2)}  bore=${bore ? s.minRadius.toFixed(2) : 'solid'}`);
        }
      }

      // One framed shot per module so a geometry change is visible in review.
      await page.evaluate(() => {
        window.__learn.vp.setExplode(1);
        window.__learn.vp.setView(0.6, 0.22);
      });
      await sleep(700);
      const box = await page.evaluate(() => {
        const r = document.querySelector('.canvas-wrap').getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      await page.screenshot({ path: join(SHOTS, `${backend}-module-${code}.png`), clip: box });
      await page.evaluate(() => window.__learn.vp.setExplode(0.4));
    }

    await page.evaluate(() => window.__learn.openModule('8841-02'));
    await sleep(600);

    for (const view of VIEWS) {
      await page.evaluate((v) => {
        const btn = [...document.querySelectorAll('.nav button')]
          .find((b) => b.textContent.toLowerCase().includes(v));
        if (btn) btn.click();
      }, view === 'readiness' ? 'readiness' : view);
      await sleep(view === 'train' ? 1200 : 500);
      await page.screenshot({ path: join(SHOTS, `${backend}-${view}.png`) });
      const empty = await page.evaluate(() => {
        const v = document.querySelector('.view');
        return !v || v.children.length === 0;
      });
      if (empty) fail(`view "${view}" rendered nothing`);
    }

    // Geometry contact sheet: the stack fully exploded, at three fixed angles.
    // This is the shot that actually shows whether the bores and chamfers are
    // there — the app's default three-quarter view has each part sitting over
    // the hole in the one below it.
    await page.evaluate(() => {
      [...document.querySelectorAll('.nav button')].find((b) => b.textContent.includes('Train')).click();
    });
    await sleep(300);
    for (const [name, yaw, pitch] of [['side', 0.5, 0.06], ['high', 0.5, 0.95], ['front', 0, 0.3]]) {
      await page.evaluate((y, p) => {
        window.__learn.vp.setExplode(1);
        window.__learn.vp.setView(y, p);
      }, yaw, pitch);
      await sleep(700);
      const box = await page.evaluate(() => {
        const r = document.querySelector('.canvas-wrap').getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      await page.screenshot({ path: join(SHOTS, `${backend}-parts-${name}.png`), clip: box });
    }
    // Each bored part alone, from almost straight down, where its hole and its
    // chamfers are unambiguous.
    for (const key of ['housing', 'seal', 'cartridge', 'cap']) {
      await page.evaluate((k) => {
        window.__learn.vp.setSolo(k);
        // Collapse the stack first: the camera frames the whole span, so a
        // single part shot at full explode is framed for six and comes out
        // the size of a coin.
        window.__learn.vp.setExplode(0);
        window.__learn.vp.setView(0.5, 1.28);
      }, key);
      await sleep(600);
      const box = await page.evaluate(() => {
        const r = document.querySelector('.canvas-wrap').getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      await page.screenshot({ path: join(SHOTS, `${backend}-solo-${key}.png`), clip: box });
    }
    await page.evaluate(() => {
      window.__learn.vp.setSolo(null);
      window.__learn.vp.setExplode(0.4);
    });

    // The underside. This is the shot that proves the pitch clamp allows it:
    // the reversed-seal and chip-under-the-housing defects are only visible
    // from below, so a camera that cannot get there makes the module's own
    // failure modes unteachable.
    await page.evaluate(() => {
      window.__learn.vp.setExplode(0.5);
      window.__learn.vp.setView(0.5, -1.15);
    });
    await sleep(700);
    const underBox = await page.evaluate(() => {
      const r = document.querySelector('.canvas-wrap').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await page.screenshot({ path: join(SHOTS, `${backend}-underside.png`), clip: underBox });

    const pitch = await page.evaluate(() => window.__learn.vp.pitch());
    if (!(pitch < -1)) fail(`pitch clamped at ${pitch.toFixed(2)} — cannot inspect the underside`);
    else console.log(`  ok    underside reachable (pitch ${pitch.toFixed(2)} rad)`);

    // Grab a part, move it, and put it back — the whole point being that a
    // trainee can take a piece out of the stack and return it to order.
    await page.evaluate(() => window.__learn.vp.setView(0.6, 0.3));
    await sleep(500);
    const cx = Math.round(underBox.x + underBox.width / 2);
    const cy = Math.round(underBox.y + underBox.height / 2);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 140, cy - 90, { steps: 12 });
    const movedWhileHeld = await page.evaluate(() => window.__learn.vp.moved());
    await page.mouse.up();
    if (!movedWhileHeld) fail('dragging over the stack moved no part — the pick is not hitting');
    else console.log('  ok    part grabbed and displaced');

    await page.evaluate(() => window.__learn.vp.resetParts());
    await sleep(1400);
    const stillMoved = await page.evaluate(() => window.__learn.vp.moved());
    if (stillMoved) fail('reset did not return every part to assembly order');
    else console.log('  ok    reset restored assembly order');

    // Back to train, answer the check, so the feedback path is exercised too.
    await page.evaluate(() => {
      [...document.querySelectorAll('.nav button')].find((b) => b.textContent.includes('Train')).click();
      [...document.querySelectorAll('.timeline button')].pop().click();
    });
    await sleep(400);
    await page.evaluate(() => document.querySelectorAll('.answers button')[1].click());
    await sleep(400);
    const fb = await page.evaluate(() => !!document.querySelector('.feedback'));
    if (!fb) fail('answering a knowledge check produced no feedback');
    else console.log('  ok    knowledge check feedback');
    await page.screenshot({ path: join(SHOTS, `${backend}-check.png`) });

    if (offsite.length) {
      fail(`${offsite.length} off-site request(s): ${[...new Set(offsite)].join(', ')}`);
    } else {
      console.log('  ok    no off-site requests');
    }
    if (errors.length) {
      fail(`${errors.length} console error(s):`);
      for (const e of [...new Set(errors)].slice(0, 8)) console.error('        ' + e);
    } else {
      console.log('  ok    zero console errors');
    }

    await browser.close();
  }
} finally {
  server.kill();
}

console.log(failed ? `\n${failed} failure(s). Shots in tools/shots/.` : '\nAll checks passed. Shots in tools/shots/.');
process.exit(failed ? 1 : 0);
