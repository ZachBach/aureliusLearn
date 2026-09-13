/**
 * video.mjs — cut the demo reel from the raw screen captures.
 *
 *   node tools/video.mjs           # write video/aurelius-learn-demo.mp4
 *   node tools/video.mjs --dry     # print the ffmpeg command, write nothing
 *
 * The reel walks the sidebar top to bottom — Library, Train, Build, Readiness —
 * because that is the app's own information architecture and it is the only
 * ordering a viewer with no narration can follow. The raw takes do not run in
 * that order, so the cut list below reorders them.
 *
 * Needs `ffmpeg` on PATH. Nothing else; no editor project, no timeline file.
 * The cut list IS the edit — that is the point of this file existing. An edit
 * that lives only in an editor's undo stack is an edit that gets lost.
 *
 * ── The two takes are not the same size ──────────────────────────────────────
 *
 * TAKE_A is 1920x1080. TAKE_B is 1280x720 — exactly two thirds, so it is the
 * same page at the same layout and the splices land on identical geometry; it
 * is only softer. It is upscaled with lanczos. If you re-record, record 1080p
 * and this whole paragraph goes away.
 *
 * ── The Windows activation watermark ─────────────────────────────────────────
 *
 * Both takes were recorded on an unactivated Windows, so every frame carries
 * "Activate Windows" over the bottom right. Measured extents, by thresholding
 * the region and reading the bounding box (it is the brightest thing there at
 * Y=127 in A and Y=133 in B, on a flat Y=31/28 panel background):
 *
 *     TAKE_A  x 1556..1832  y 932..976
 *     TAKE_B  x 1036..1224  y 620..654
 *
 * The obvious fix is to paint a box of background colour over it, and the
 * obvious fix is wrong twice over.
 *
 * One: the mouse pointer crosses that box on its way to "Finish - log result"
 * around A/1206-1214, and a painted box swallows it for a third of a second.
 * The previous cut used delogo instead and that is worse — delogo interpolates
 * each column from the box edges, so a bright pointer sitting on the bottom
 * edge smears as a white streak up the whole box height. It is visible in the
 * old reel at 40.3s. So: replace only pixels DIMMER than KEEP_ABOVE, and leave
 * anything brighter alone. The watermark is dim grey, the pointer is white, and
 * the threshold sits between them with room on both sides.
 *
 * Two: there is no one background colour. Train puts its right-hand step panel
 * under the box at Y=31; Readiness, Library and Build put the page under it at
 * Y=28. Three counts, on a flat near-black field, is a rectangle you can see —
 * it was visible in the closing Readiness shot before this was fixed. So the
 * fill is sampled from the box's own four corners in each frame, and it is the
 * MINIMUM of them: the background is the darkest thing in there, and taking
 * the minimum is what makes a pointer parked in a corner harmless.
 *
 * Only the luma plane is touched. The watermark is neutral grey on neutral
 * grey — over the text, Cb/Cr read 129/127, which is the background's own
 * value to within the encode's own ±1 wobble. There is nothing in chroma to
 * remove, and not touching it means no chroma constant to get wrong.
 *
 * The geq runs on the cropped box alone and is overlaid back; geq over a full
 * 1080p frame is slow enough to notice.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);

/**
 * Everything lives in video/, which is gitignored except its .md. That is not
 * tidiness: src/ is what tools/deploy.mjs copies into the site wholesale, so a
 * take left in src/ is 56 MB on the Vercel deploy. See video/README.md.
 */
const MEDIA = join(APP, 'video');
const OUT = join(MEDIA, 'aurelius-learn-demo.mp4');

/**
 * The raw takes. Both are OBS captures of the app running fullscreen at
 * http://localhost:8000, and neither is regenerable except by recording again.
 */
const TAKES = {
  // 1920x1080, 1640 frames. Train through Readiness, one pass.
  a: {
    file: join(MEDIA, 'Video Project.mp4'),
    wm: { x: 1546, y: 922, w: 300, h: 68 },   // watermark box + ~10px margin
    scale: null,
  },
  // 1280x720, 2332 frames. The re-record that added Library and Build.
  b: {
    file: join(MEDIA, '2026-09-08 14-05-22.mp4'),
    wm: { x: 1026, y: 610, w: 208, h: 54 },
    scale: '1920:1080',
  },
};

/** Anything at or above this luma survives the watermark scrub. See above. */
const KEEP_ABOVE = 170;

/**
 * The cut list, in output order. Frame numbers are into the raw take, `end` is
 * exclusive. They were found by aligning the previous cut against take A with
 * ffmpeg's psnr filter, and by stepping the sidebar highlight a frame at a time
 * across each view change in take B — not by eye on a scrubber.
 */
const CUTS = [
  { take: 'b', start: 180, end: 262, note: 'Library - four modules, two unauthored' },
  { take: 'a', start: 138, end: 626, note: 'Train - seat the housing, explode, handle the parts' },
  { take: 'a', start: 761, end: 1520, note: 'Train - steps 02-05 and the knowledge checks' },
  { take: 'b', start: 2004, end: 2204, note: 'Build - the authoring storyboard, one full run' },
  { take: 'a', start: 1520, end: 1640, note: 'Readiness - the fixture dashboard' },
];

// Take A frames 626..760 are the operator opening Library mid-Train and
// backing out again. They are cut: the Library now opens the reel, from a
// take where it is not a detour.

const dry = process.argv.includes('--dry');

for (const [key, take] of Object.entries(TAKES)) {
  if (!existsSync(take.file)) {
    console.error(`missing raw take ${key}: ${take.file}`);
    console.error('Both takes are screen recordings. Nothing regenerates them but recording again.');
    process.exit(1);
  }
}

/** Scrub the watermark out of one input and hand back a labelled stream. */
const scrub = (label, take, out) => {
  const { x, y, w, h } = take.wm;
  // The four corners of the box, two pixels in, and the darkest of them.
  const bg = 'min(min(lum(2\\,2)\\,lum(W-3\\,2))\\,min(lum(2\\,H-3)\\,lum(W-3\\,H-3)))';
  const geq = `geq=lum='if(lt(lum(X\\,Y)\\,${KEEP_ABOVE})\\,${bg}\\,lum(X\\,Y))':cb='cb(X\\,Y)':cr='cr(X\\,Y)'`;
  const scale = take.scale ? `,scale=${take.scale}:flags=lanczos` : '';
  return [
    `${label}split=2[${out}base][${out}reg]`,
    `[${out}reg]crop=${w}:${h}:${x}:${y},${geq}[${out}patch]`,
    `[${out}base][${out}patch]overlay=${x}:${y}${scale},setsar=1[${out}]`,
  ];
};

const chains = [
  ...scrub('[0:v]', TAKES.a, 'A'),
  ...scrub('[1:v]', TAKES.b, 'B'),
];

// One split per input, fanned out to however many cuts draw on it.
for (const key of ['a', 'b']) {
  const n = CUTS.filter((c) => c.take === key).length;
  const src = key.toUpperCase();
  const outs = CUTS.map((c, i) => (c.take === key ? `[${src}${i}]` : '')).join('');
  chains.push(`[${src}]split=${n}${outs}`);
}

CUTS.forEach((c, i) => {
  const src = `${c.take.toUpperCase()}${i}`;
  chains.push(`[${src}]trim=start_frame=${c.start}:end_frame=${c.end},setpts=PTS-STARTPTS[s${i}]`);
});

chains.push(
  `${CUTS.map((_, i) => `[s${i}]`).join('')}concat=n=${CUTS.length}:v=1:a=0,format=yuv420p[v]`,
);

const tmp = `${OUT}.tmp.mp4`;
const args = [
  '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
  '-i', TAKES.a.file,
  '-i', TAKES.b.file,
  // A silent track, because the takes have one and some players are unhappy
  // without any audio stream at all. There is no narration to lose.
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-filter_complex', chains.join(';'),
  '-map', '[v]', '-map', '2:a', '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-r', '30',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '32k',
  '-movflags', '+faststart',
  tmp,
];

const frames = CUTS.reduce((n, c) => n + (c.end - c.start), 0);
console.log(`${CUTS.length} cuts, ${frames} frames, ${(frames / 30).toFixed(2)}s @30fps`);
for (const c of CUTS) {
  const secs = ((c.end - c.start) / 30).toFixed(2).padStart(5);
  console.log(`  take ${c.take}  ${String(c.start).padStart(4)}-${String(c.end - 1).padEnd(4)}  ${secs}s  ${c.note}`);
}

if (dry) {
  console.log(`\nffmpeg ${args.map((a) => (/[\s;']/.test(a) ? `"${a}"` : a)).join(' ')}`);
  console.log('\n--dry: nothing written');
  process.exit(0);
}

console.log(`\nencoding -> ${OUT}`);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
renameSync(tmp, OUT);
console.log('\nwrote the reel. Now watch it — the numbers cannot see a cut that lands wrong.');
