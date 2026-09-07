/**
 * card-shot.mjs — render the Lab card image for the Aurelius landing bundle.
 *
 *   node tools/card-shot.mjs            # -> tools/shots/learn-card.webp
 *   node tools/card-shot.mjs 0.55 0.9   # explode, yaw
 *
 * The other Lab cards are image-led at 16:10, so this frames the assembly the
 * same way: chrome hidden, viewport at the card's own aspect, camera parked so
 * the shot is reproducible rather than whatever the idle spin happened to be
 * pointing at when the shutter fired.
 *
 * WebP straight out of the browser — the bundle stores these compressed and a
 * PNG would be several times the size for no visible gain. Feed the result to
 * tsl-lib/tools/add-asset.py.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);
const STUDIO = dirname(APP);
const OUT = join(HERE, 'shots', 'learn-card.webp');
const PORT = 8734;
const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const BORROW = join(STUDIO, 'tsl-lib', 'bench', 'package.json');
let puppeteer;
try {
  puppeteer = createRequire(import.meta.url)('puppeteer-core');
} catch {
  puppeteer = createRequire(BORROW)('puppeteer-core');
}

const explode = parseFloat(process.argv[2] || '0.55');
const yaw = parseFloat(process.argv[3] || '0.9');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(dirname(OUT), { recursive: true });

const server = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: APP, stdio: 'ignore' });
await sleep(800);

try {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--enable-unsafe-webgpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${join(HERE, 'chrome-profile-card')}`],
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1.5 },
  });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__learn, { timeout: 30000 });

  // Strip the app chrome so the card is the render, not a screenshot of a UI.
  await page.addStyleTag({
    content: `.side,.head,.disclose,.detail,.timeline,.controls,.hud{display:none!important}
      #app{grid-template-columns:1fr!important}
      .train{grid-template-columns:1fr!important}
      .stage{border:0!important}`,
  });
  // Pulled in past the app's default framing. On screen the viewport reserves
  // margin for the HUD row and the controls; the card has neither, and at
  // roughly a third of the page width an assembly framed for the app reads as
  // a small object in a large dark rectangle.
  await page.evaluate((e, y, z) => {
    window.__learn.vp.setExplode(e);
    window.__learn.vp.setView(y, 0.30);
    window.__learn.vp.setZoom(z);
    window.__learn.vp.setActive('seal');
  }, explode, yaw, parseFloat(process.env.CARD_ZOOM || '-1.6'));
  await sleep(1600); // let the highlight ease in and the layout settle

  await page.screenshot({ path: OUT, type: 'webp', quality: 88 });
  console.log(`wrote ${OUT}  (explode ${explode}, yaw ${yaw})`);
  await browser.close();
} finally {
  server.kill();
}
