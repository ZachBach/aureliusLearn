/**
 * render-module.mjs — render a module's walkthrough as a video, headless.
 *
 *   node tools/render-module.mjs                 # PM-ASSY, 1920x1080
 *   node tools/render-module.mjs MOTOR-01        # another authored module
 *   node tools/render-module.mjs PM-ASSY --test  # 30 frames per beat
 *   node tools/render-module.mjs --keep          # leave the PNG frames on disk
 *
 * Where video.mjs cuts a reel from screen takes, this renders one: the app is
 * driven in headless Chrome on a real WebGPU adapter with its clock gated —
 * `performance.now` only moves when the capture loop moves it, so every frame
 * is exactly one thirtieth of a second of the app's own animation, and the
 * screenshot that follows it cannot land early or late. requestAnimationFrame
 * stays real because Chrome's screenshot waits on a compositor frame and a
 * page with none registered never produces one.
 *
 * The walkthrough is the module's own order: every step in the timeline, held
 * long enough to read, with the camera drifting and the explode set to show
 * the part the step is about — interior parts want the shell lifted off them,
 * the shell wants it seated. Then each knowledge check: the question, the
 * authored answer, the feedback. No narration, no audio, no captions; the
 * step panel is the copy.
 *
 * Output lands in video/, gitignored except its README.
 */
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);
const STUDIO = dirname(APP);
const OUT = join(APP, 'video');
const FPS = 30;
const PORT = 8762;
const W = 1920;
const H = 1080;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let puppeteer;
try {
  puppeteer = createRequire(import.meta.url)('puppeteer-core');
} catch {
  try {
    puppeteer = createRequire(join(STUDIO, 'tsl-lib', 'bench', 'package.json'))('puppeteer-core');
  } catch {
    console.error('puppeteer-core not found. `npm i puppeteer-core` here, or in ../tsl-lib/bench.');
    process.exit(2);
  }
}

const args = process.argv.slice(2);
const TEST = args.includes('--test');
const KEEP = args.includes('--keep');
const CODE = args.find((a) => !a.startsWith('--')) || 'PM-ASSY';

/** Seconds each beat holds. */
const HOLD = { intro: 5, step: 4.5, question: 3, answer: 3.5, outro: 4 };

/**
 * How far to explode for a step, by the part it highlights. Parts inside the
 * shell are only visible with it lifted; the shell itself and what sits on
 * it read best seated. Anything not listed gets the default.
 */
const EXPLODE_FOR = {
  pm_face_form: 0.9, pm_foam: 0.85, pm_seal_bead: 0.8, pm_pzt_seal: 0.8, pm_cup: 0.95,
  pm_shell: 0.15, pm_visor_gasket: 0.55, pm_visor_lens: 0.55,
  pm_collar: 0.6, pm_blower: 0.7, pm_reactor: 0.7, pm_status_band: 0.7,
  pm_capsid_ring: 0.75, pm_filter: 0.8, pm_coalescer: 0.85, pm_grille: 0.9,
  pm_scale_hood: 0.3, pm_horn_l: 0.3, pm_horn_r: 0.3, pm_pv_array: 0.35, pm_crest: 0.3,
  pm_anchors: 0.25, pm_el_wire: 0.4,
  seal: 0.6, plunger: 0.6, cartridge: 0.6, cap: 0.5, housing: 0.4, base: 0.4, nest: 0.4, collar: 0.5,
};
/** A yaw per part so the camera faces what matters — the canister is at -Z. */
const YAW_FOR = {
  pm_collar: Math.PI, pm_blower: Math.PI, pm_reactor: Math.PI + 0.3, pm_status_band: Math.PI + 0.3,
  pm_capsid_ring: Math.PI - 0.3, pm_filter: Math.PI - 0.3, pm_coalescer: Math.PI, pm_grille: Math.PI,
  pm_crest: 0.2, pm_scale_hood: 0.3, pm_visor_lens: 0.6, pm_visor_gasket: 0.6,
  pm_face_form: 2.2, pm_foam: 2.2, pm_seal_bead: 2.0, pm_pzt_seal: 2.0, pm_cup: 2.4,
  pm_horn_l: -1.2, pm_horn_r: 1.2, pm_pv_array: 1.4, pm_anchors: 1.9,
};
const PITCH_FOR = { pm_face_form: -0.35, pm_foam: -0.3, pm_seal_bead: -0.25, pm_pzt_seal: -0.25, pm_cup: -0.2 };

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FREEZE = `(() => {
  let now = 0;
  const raf = window.requestAnimationFrame.bind(window);
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => raf(() => cb(now));
  window.__tick = (ms) => { now += ms; return now; };
  window.__settle = () => new Promise((r) => raf(() => raf(() => r(now))));
})();`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.txt': 'text/plain',
};
function serve(root, port) {
  return new Promise((resolve) => {
    const s = createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(root, p));
      if (!file.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
      let st;
      try { st = statSync(file); } catch { res.writeHead(404); return res.end(); }
      if (st.isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
      const rs = createReadStream(file);
      rs.on('error', () => { try { res.destroy(); } catch { /* gone */ } });
      res.on('close', () => rs.destroy());
      rs.pipe(res);
    });
    s.on('clientError', (_, sock) => { try { sock.destroy(); } catch { /* gone */ } });
    s.listen(port, '127.0.0.1', () => resolve(s));
  });
}

mkdirSync(OUT, { recursive: true });
const frames = join(OUT, 'frames', CODE);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const server = await serve(APP, PORT);
const errors = [];
let n = 0;
let failed = false;
try {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 60000,
    args: ['--enable-unsafe-webgpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${join(HERE, 'chrome-profile-render')}`],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(FREEZE);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url().slice(0, 120)));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__learn, { timeout: 30000 });
  for (let i = 0; i < 30; i++) await page.evaluate(() => { window.__tick(1000 / 30); return window.__settle(); });

  const backend = await page.evaluate(() => window.__learn.vp.backend);
  if (!backend.startsWith('WEBGPU')) errors.push(`backend is "${backend}" — this render is not on the WGSL path`);
  const module = await page.evaluate((c) => {
    const m = window.__learn.MODULES.find((x) => x.code === c);
    if (!m || !m.authored) return null;
    window.__learn.openModule(c);
    window.__learn.vp.setSpin(false);
    return { steps: m.steps.map((s) => ({ part: s.part, check: !!s.check })), checks: m.checks.map((k) => k.answers.findIndex((a) => a.ok)) };
  }, CODE);
  if (!module) throw new Error(`no authored module "${CODE}"`);
  await sleep(600);

  /** One beat: `secs` of frames, calling `at(t)` before each. */
  const beat = async (secs, at, note) => {
    const count = TEST ? Math.min(30, Math.round(secs * FPS)) : Math.round(secs * FPS);
    process.stdout.write(`  ${note.padEnd(26)} ${String(count).padStart(4)} frames `);
    for (let f = 0; f < count; f++) {
      await at(count > 1 ? f / (count - 1) : 0);
      await page.evaluate(() => { window.__tick(1000 / 30); return window.__settle(); });
      await page.screenshot({ path: join(frames, `${String(n++).padStart(5, '0')}.png`), type: 'png', optimizeForSpeed: true });
      if (f % 30 === 0) process.stdout.write('.');
    }
    process.stdout.write('\n');
  };
  const view = (yaw, pitch, explode) => page.evaluate((y, p, e) => {
    window.__learn.vp.setView(y, p);
    window.__learn.vp.setExplode(e);
  }, yaw, pitch, explode);

  // Intro: the assembled unit, exploding fully and settling back.
  await beat(HOLD.intro, (t) => view(lerp(0.3, 1.1, t), 0.3, t < 0.5 ? ease(t * 2) : 1 - ease((t - 0.5) * 2) * 0.6), 'intro');

  let yaw = 1.1;
  let explode = 0.4;
  for (let i = 0; i < module.steps.length; i++) {
    const step = module.steps[i];
    await page.evaluate((k) => document.querySelectorAll('.timeline button')[k].click(), i);
    if (step.check) break;
    const yawTo = YAW_FOR[step.part] ?? yaw + 0.6;
    const pitchTo = PITCH_FOR[step.part] ?? 0.3;
    const exTo = EXPLODE_FOR[step.part] ?? 0.5;
    const [yaw0, ex0] = [yaw, explode];
    await beat(HOLD.step, (t) => view(
      lerp(yaw0, yawTo, ease(Math.min(1, t * 1.8))) + t * 0.25,
      lerp(0.3, pitchTo, ease(Math.min(1, t * 1.8))),
      lerp(ex0, exTo, ease(Math.min(1, t * 1.6))),
    ), `step ${String(i + 1).padStart(2, '0')} ${step.part}`);
    yaw = yawTo + 0.25;
    explode = exTo;
  }

  // The knowledge checks: read, answer, read the feedback.
  for (let q = 0; q < module.checks.length; q++) {
    const part = await page.evaluate(() => window.__learn.state.qi);
    await beat(HOLD.question, (t) => view(yaw + t * 0.2, 0.3, explode), `check ${q + 1} question`);
    await page.evaluate((a) => document.querySelectorAll('.answers button')[a].click(), module.checks[q]);
    await beat(HOLD.answer, (t) => view(yaw + 0.2 + t * 0.2, 0.3, explode), `check ${q + 1} answer`);
    yaw += 0.4;
    if (q < module.checks.length - 1) await page.evaluate(() => document.querySelector('.foot button.primary').click());
    void part;
  }

  // Outro: the whole thing, exploded, one slow turn.
  await beat(HOLD.outro, (t) => view(yaw + t * 0.9, lerp(0.3, 0.45, t), lerp(explode, 1, ease(Math.min(1, t * 2)))), 'outro');

  await browser.close();
} catch (err) {
  failed = true;
  console.error(err);
} finally {
  server.close();
}

if (errors.length) {
  failed = true;
  console.error(`  ${errors.length} error(s) during the render:`);
  for (const e of [...new Set(errors)].slice(0, 10)) console.error('    ' + e);
}
if (n === 0) process.exit(1);

const out = join(OUT, `${CODE.toLowerCase()}-walkthrough-${W}x${H}${TEST ? '-test' : ''}.mp4`);
const tmp = out + '.tmp.mp4';
execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
  '-framerate', String(FPS), '-i', join(frames, '%05d.png'),
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-map', '0:v', '-map', '1:a', '-shortest',
  '-vf', 'format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '32k', '-movflags', '+faststart',
  tmp,
], { stdio: 'inherit' });
rmSync(out, { force: true });
execFileSync('cmd', ['/c', 'move', '/y', tmp, out], { stdio: 'ignore' });
if (!KEEP) rmSync(frames, { recursive: true, force: true });
console.log(`\nwrote ${out}  (${n} frames, ${(n / FPS).toFixed(1)}s, ${(statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
console.log(failed ? 'Rendered with errors — read them above before sharing it.' : 'Rendered console-clean on WebGPU. Now watch it — the numbers cannot see a beat that lands wrong.');
process.exit(failed ? 1 : 0);
