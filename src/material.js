/**
 * material.js — one node material per part, built from tsl-lib nodes.
 *
 * Two jobs. Read as machined metal, and make exactly one part unmistakable
 * when the trainer selects it.
 *
 * The rim term is tsl-lib's `fresnel`, not a hand-rolled one. The obvious
 * shortcut — `normalView` dotted against the view axis — is cheap and wrong at
 * the edges of a wide field of view, because it treats every pixel as if the
 * camera were looking straight down it. tsl-lib's version works from
 * `cameraPosition - positionWorld`, so the rim sits where the silhouette
 * actually is.
 *
 * Brand colour comes from tsl-lib's palette and nowhere else — the studio rule
 * is that material code never writes a hex literal for a brand colour. The
 * greys and the brass below are not brand colours; they are what the parts are
 * made of, and they live here with the parts.
 */
import { fresnel } from '../lib/tsl/fresnel/fresnel.js';
import { HEX } from '../lib/tsl/util/palette.js';

const BRAND_GOLD = HEX.brand.gold;

/** The accent as a CSS colour, so the UI chrome and the rendered rim agree. */
export const ACCENT_CSS = '#' + BRAND_GOLD.toString(16).padStart(6, '0');

/**
 * Functional material tones. Not brand colours — a fixture plate is grey
 * because it is cast iron, and that fact does not belong in a brand palette.
 * `turn` is the pitch of the turned finish, in rings per unit radius.
 */
const TONES = {
  fixture: { color: 0x1b2228, metal: 0.35, rough: 0.74, turn: 13 },
  steel: { color: 0x49555d, metal: 0.82, rough: 0.34, turn: 17 },
  elastomer: { color: 0x1f6f68, metal: 0.04, rough: 0.62, turn: 0 },
  polymer: { color: 0x525b61, metal: 0.4, rough: 0.44, turn: 11 },
  brass: { color: 0x8a6f28, metal: 0.88, rough: 0.32, turn: 21 },
};

/** The shared accent uniform, seeded from the studio palette's brand gold. */
export function accentUniform(THREE) {
  const { uniform, vec3 } = THREE.TSL;
  const c = new THREE.Color(BRAND_GOLD);
  return uniform(vec3(c.r, c.g, c.b));
}

/**
 * @param {object} THREE  the three.js namespace (webgpu build)
 * @param {string} tone   a key of TONES
 * @param {Node}   accent vec3 uniform from `accentUniform`, shared by all parts
 * @returns {MeshStandardNodeMaterial} with `userData.highlight`, a 0..1 uniform
 */
export function partMaterial(THREE, tone, accent) {
  const TSL = THREE.TSL;
  const { float, vec3, mix, positionLocal, time, uniform } = TSL;
  const spec = TONES[tone];

  const m = new THREE.MeshStandardNodeMaterial();
  // Double-sided because each part is assembled from several revolved runs and
  // neighbouring runs are traced in opposite directions, so their winding
  // disagrees — single-sided, half of every bored part would vanish. three
  // flips the normal for back-facing fragments, so both sides light correctly.
  // It also means looking down a bore shows the far wall rather than daylight.
  m.side = THREE.DoubleSide;
  const highlight = uniform(0);

  const c = new THREE.Color(spec.color);
  // Lift the base colour slightly as it highlights, so a selected part reads
  // even where the rim does not reach — the flat faces pointing at the camera.
  // Kept small on purpose: pushed further, a selected steel part stops looking
  // like selected steel and starts looking like it is made of gold.
  m.colorNode = vec3(c.r, c.g, c.b).mul(mix(float(1), float(1.16), highlight));
  m.metalnessNode = float(spec.metal);

  // Turned finish: concentric tool marks, which is how a lathed face catches
  // light. Modulating ROUGHNESS rather than colour keeps it from reading as a
  // painted-on texture — the rings appear and vanish with the viewing angle,
  // the way a real machined surface does.
  if (spec.turn) {
    const rings = positionLocal.xz.length().mul(spec.turn).fract();
    m.roughnessNode = mix(float(spec.rough * 0.9), float(Math.min(spec.rough * 1.14, 0.98)), rings);
  } else {
    m.roughnessNode = float(spec.rough);
  }

  // The selection rim. Breathing slowly rather than blinking: this sits on
  // screen for as long as the trainee is reading the step beside it, and a
  // hard blink at that duration is an irritation, not a signal.
  // A tight rim (higher power) hugs the silhouette instead of washing across
  // the whole curved face, which is what keeps this reading as an outline on a
  // steel part rather than a change of material.
  const rim = fresnel(TSL, { power: 3.4 });
  const breath = time.mul(1.9).sin().mul(0.13).add(0.87);
  m.emissiveNode = accent.mul(rim).mul(highlight).mul(breath).mul(0.62);

  m.userData.highlight = highlight;
  return m;
}
