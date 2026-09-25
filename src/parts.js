/**
 * parts.js — the six pieces of the sample assembly, as real profiles.
 *
 * Every part is a body of revolution, written as the closed cross-section you
 * would draw on paper — traced round the (r, y) half-plane: up the outside,
 * across the top, down the bore, back along the underside.
 *
 * Getting that from a profile to a correct mesh takes two passes over it, and
 * both are here rather than in geo-lib because both are specific to machined
 * work rather than to the organic forms the library was built for:
 *
 *   `monotonicRuns` cuts the profile wherever it reverses in y, which is what
 *   keeps `revolve` from flipping its transported frame and drawing a twisted
 *   sheet across the hole.
 *
 *   `hardEdges` doubles every interior point, which is what stops a turned
 *   corner from shading like a soft bevel.
 *
 * `lathe` applies both and merges the result, so each builder below is just
 * its profile. Read those two functions before changing any profile: neither
 * failure announces itself, and both produce a mesh that measures correctly.
 *
 * Chamfers are not decoration here. The seal ring's chamfer is the subject of
 * the module's hardest knowledge check — the trainee is asked to tell a
 * chamfered face from a flat one under raking light — so it has to be
 * geometry, catching a real highlight, not a texture and not a torus.
 */
import { revolve } from '../lib/geo/solid/revolve.js';
import { roundedBox } from '../lib/geo/solid/roundedBox.js';
import { assembly } from '../lib/geo/core/assembly.js';

/** Radial segment counts. Knurling needs the high one — see `cap` below. */
const SMOOTH = 64;
const KNURLED = 120;

/**
 * Duplicate every interior profile point, so the part shades with hard edges.
 *
 * `loft` shares one ring of vertices per profile point and finishes with
 * `computeVertexNormals`, which averages across it. That is the right default
 * for what the library was built for — a shoulder, a neck, an animal's back,
 * where a shared ring is exactly how you avoid a crease. On a turned steel
 * part it is wrong in a way that is easy to miss: the bore and the chamfers
 * are all still THERE, correctly placed, and every one of them shades as a
 * soft bevel. The part reads as a pebble.
 *
 * Doubling the point splits the ring in two. The degenerate quad between the
 * pair has zero area and so contributes no normal, which leaves each ring
 * carrying only the face on its own side — a hard edge along the profile,
 * while the ring stays smooth the whole way around. `loft` supports coincident
 * sections deliberately, for this: its comments call it "a flange, a hard
 * shoulder, a belt".
 */
function hardEdges(profile) {
  const out = [];
  profile.forEach((p, i) => {
    out.push(p);
    if (i > 0 && i < profile.length - 1) out.push(p);
  });
  return out;
}

/**
 * Split a profile into runs that never reverse in y.
 *
 * This exists because of a sharp edge in `revolve`, and it is worth stating
 * plainly since nothing warns you about it. `revolve` lays every section of
 * its spine on the axis at [0, y, 0], so the spine of a closed cross-section
 * — up the outside, across the top, back DOWN the bore — travels up and then
 * comes back down the same line. `loft` frames sections by parallel transport,
 * rotating each frame onto the next; at the turn the two tangents are exactly
 * antiparallel, which names no axis of rotation, and the frame flips through
 * 180 degrees.
 *
 * The rings stay in the right places, so nothing looks wrong in the numbers:
 * the bounding box is right, the triangle count is right, and no vertex moves
 * anywhere near the axis. What breaks is which vertex joins which. Past the
 * flip, each quad connects angle +a on one ring to angle -a on the next, and
 * that twisted sheet sweeps right across the middle of the part. A washer
 * renders as a solid disc while every measurement of it still says washer.
 *
 * Cutting the profile at each reversal keeps every run monotonic, so no run
 * ever contains the antiparallel step. The runs share their boundary point and
 * are merged back into one geometry.
 */
function monotonicRuns(profile) {
  const runs = [];
  let run = [profile[0]];
  let dir = 0;
  for (let i = 1; i < profile.length; i++) {
    const d = Math.sign(profile[i][1] - run[run.length - 1][1]);
    if (d !== 0 && dir !== 0 && d !== dir) {
      runs.push(run);
      run = [run[run.length - 1]]; // the next run starts where this one ended
      dir = d;
    } else if (d !== 0) {
      dir = d;
    }
    run.push(profile[i]);
  }
  runs.push(run);
  return runs.filter((r) => r.length >= 2);
}

/**
 * Revolve a cross-section into one geometry: `revolve` per monotonic run,
 * merged.
 *
 * A run is capped only where it ends on the axis — that is what closes a solid
 * part like the fixture plate, and what must NOT happen on a bored one, where
 * a cap would roof the hole over.
 */
function lathe(THREE, profile, opt = {}) {
  const a = assembly(THREE);
  for (const run of monotonicRuns(profile)) {
    a.part(revolve(THREE, hardEdges(run), {
      ...opt,
      capA: run[0][0] < 1e-6,
      capB: run[run.length - 1][0] < 1e-6,
    }), 0, 0, 0);
  }
  return a.geometry();
}

/**
 * Every part the sample modules can show. `key` matches the step and check data;
 * `label` is what the viewport HUD shows; `height` is what the exploder
 * spaces on.
 */
export const PARTS = [
  { key: 'base', label: 'FIXTURE F-22', height: 0.14, tone: 'fixture' },
  { key: 'housing', label: 'HOUSING', height: 0.3, tone: 'steel' },
  { key: 'seal', label: 'SEAL RING', height: 0.09, tone: 'elastomer' },
  { key: 'plunger', label: 'PLUNGER', height: 0.62, tone: 'steel' },
  { key: 'cartridge', label: 'CARTRIDGE', height: 0.44, tone: 'polymer' },
  { key: 'cap', label: 'CAP', height: 0.22, tone: 'brass' },
  { key: 'nest', label: 'WELD NEST W-14', height: 0.34, tone: 'fixture' },
  { key: 'collar', label: 'COLLAR', height: 0.16, tone: 'steel' },
  { key: 'motor_housing', label: 'MOTOR HOUSING', height: 0.90, tone: 'steel' },
  { key: 'motor_stator', label: 'STATOR CORE', height: 0.54, tone: 'steel' },
  { key: 'motor_windings', label: 'WINDING PACK', height: 0.60, tone: 'copper' },
  { key: 'motor_rotor', label: 'ROTOR & SHAFT', height: 1.10, tone: 'steel' },
  { key: 'motor_drive_bearing', label: 'DRIVE-END BEARING', height: 0.18, tone: 'brass' },
  { key: 'motor_non_drive_bearing', label: 'NON-DRIVE BEARING', height: 0.18, tone: 'brass' },
  { key: 'motor_drive_endbell', label: 'DRIVE-END BELL', height: 0.22, tone: 'polymer' },
  { key: 'motor_non_drive_endbell', label: 'NON-DRIVE END BELL', height: 0.22, tone: 'polymer' },
  { key: 'motor_fan', label: 'COOLING FAN', height: 0.18, tone: 'polymer' },
  { key: 'motor_guard', label: 'FAN GUARD', height: 0.16, tone: 'steel' },
];

export const partMeta = (key) => PARTS.find((p) => p.key === key);

/**
 * The fixture the assembly is built in: a chamfered plate with a shallow
 * seat turned into its face and four mounting blocks.
 *
 * The seat is why the first training step can say "press until the pin clears
 * the datum slot" and have the picture agree with it.
 */
function base(THREE) {
  const plate = lathe(THREE, [
    [0.00, -0.070], [1.10, -0.070], [1.18, -0.034], [1.18, 0.030],
    [1.12, 0.070], [0.68, 0.070], [0.64, 0.046], [0.64, 0.016], [0.00, 0.016],
  ], { radial: SMOOTH });

  const a = assembly(THREE);
  a.part(plate, 0, 0, 0);
  // Four mounting blocks on the diagonals, clear of the seat.
  const block = roundedBox(THREE, 0.17, 0.1, 0.17, 0.02);
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * Math.PI * 2 + Math.PI / 4;
    a.part(block, Math.cos(t) * 0.96, 0.07, Math.sin(t) * 0.96);
  }
  block.dispose();
  return a.geometry();
}

/**
 * Housing — the part everything else seats into. Bored through, with a lead-in
 * chamfer at the mouth of the bore and a relief groove around the outside.
 */
function housing(THREE) {
  return lathe(THREE, [
    [0.88, -0.150], [0.94, -0.114], [0.94, -0.040],   // outer wall, lower
    [0.90, -0.020], [0.90, 0.020], [0.94, 0.040],     // relief groove
    [0.94, 0.104], [0.90, 0.150],                     // chamfer to the top face
    [0.46, 0.150], [0.40, 0.104],                     // lead-in chamfer, bore mouth
    [0.40, -0.104], [0.46, -0.150],                   // bore wall, chamfer out
    [0.88, -0.150],                                   // close on the start corner
  ], { radial: SMOOTH });
}

/**
 * Seal ring — a washer with a chamfer on ONE face only.
 *
 * The asymmetry is the whole point and it is load-bearing: chamfer toward the
 * bore is correct, chamfer away is the defect that passes every visual gate on
 * the line and fails leak test four hours later. A torus, which is what a
 * first pass at this reaches for, has no face to get backwards.
 */
function seal(THREE) {
  return lathe(THREE, [
    [0.62, -0.045], [0.62, 0.045],                    // outer wall
    [0.50, 0.045], [0.44, 0.012],                     // the chamfer — top inner
    [0.44, -0.045],                                   // bore wall, square below
    [0.62, -0.045],
  ], { radial: SMOOTH });
}

/**
 * Plunger — a shaft with a head, turned as one piece rather than assembled,
 * because that is what it is.
 */
function plunger(THREE) {
  return lathe(THREE, [
    [0.00, -0.310], [0.14, -0.310], [0.16, -0.286],   // domed-off tip
    [0.16, 0.200], [0.34, 0.216],                     // shaft up to the head
    [0.34, 0.268], [0.30, 0.290], [0.00, 0.290],      // head, chamfered rim
  ], { radial: SMOOTH });
}

/** Cartridge — bored, with a shoulder that bottoms against the housing. */
function cartridge(THREE) {
  return lathe(THREE, [
    [0.46, -0.220], [0.52, -0.180],                   // shoulder
    [0.52, 0.180], [0.48, 0.220],
    [0.34, 0.220], [0.30, 0.186],
    [0.30, -0.186], [0.36, -0.220],
    [0.46, -0.220],
  ], { radial: SMOOTH });
}

/**
 * Cap — knurled, which is the one part where `shape` does real work.
 *
 * geo-lib's README gives the sampling floor: under about four radial samples
 * per lobe a pattern vanishes into the smooth shading entirely. 24 lobes at
 * 120 segments is five samples each, just over the line. Dropping to the
 * SMOOTH count would silently produce a plain cylinder.
 */
function cap(THREE) {
  const LOBES = 24;
  const OUTER = 0.76;
  const profile = [
    [0.40, -0.110], [0.72, -0.110], [0.76, -0.076],
    [0.76, 0.066], [0.72, 0.110],
    [0.40, 0.110], [0.40, -0.110],
  ];

  // Built run by run rather than through `lathe`, because the knurl applies to
  // one run only. `shape` receives t = i / (n - 1) measured WITHIN the run it
  // is given, so a band expressed against the whole profile would land in the
  // wrong place once the profile is cut at its reversal — and it would also be
  // handed to the bore run, which must stay perfectly round.
  const a = assembly(THREE);
  for (const run of monotonicRuns(profile)) {
    const pts = hardEdges(run);
    const at = pts
      .map((p, i) => (Math.abs(p[0] - OUTER) < 1e-9 ? i : -1))
      .filter((i) => i >= 0);

    // Only the run that actually contains the outer wall gets knurled, and the
    // band is derived from that run's own indices — never a hardcoded range,
    // which slides off the end of the wall as soon as the point count changes.
    let shape;
    if (at.length) {
      const lo = (Math.min(...at) - 0.5) / (pts.length - 1);
      const hi = (Math.max(...at) + 0.5) / (pts.length - 1);
      shape = (angle, t) => (t >= lo && t <= hi ? 1 + Math.cos(angle * LOBES) * 0.012 : 1);
    }

    a.part(revolve(THREE, pts, {
      radial: KNURLED,
      shape,
      capA: run[0][0] < 1e-6,
      capB: run[run.length - 1][0] < 1e-6,
    }), 0, 0, 0);
  }
  return a.geometry();
}

/**
 * Weld nest W-14 — a plate with a central locating boss.
 *
 * The boss is the whole point of the part and the subject of two steps: the
 * nest locates on the housing's BORE, not its outside diameter, because the OD
 * carries the forming taper and is not a datum. The step at the root of the
 * boss is where weld spatter collects out of sight, which is what the module
 * asks the trainee to look into rather than at.
 *
 * The only part here whose profile is naturally monotonic — it is a solid of
 * revolution with no bore — so it comes out as a single run.
 */
function nest(THREE) {
  return lathe(THREE, [
    [0.00, -0.060], [0.98, -0.060], [1.05, -0.024],   // plate underside, chamfer
    [1.05, 0.024], [0.99, 0.060],                     // plate rim, top chamfer
    [0.44, 0.060],                                    // plate face in to the boss root
    [0.38, 0.092],                                    // boss root — spatter collects here
    [0.38, 0.250],                                    // boss wall, locates in the bore
    [0.34, 0.280], [0.00, 0.280],                     // boss lead-in chamfer and crown
  ], { radial: SMOOTH });
}

/**
 * Collar — the ring that drops onto the housing's weld land.
 *
 * The register step on its underside is what makes "it drops under its own
 * weight" a meaningful instruction: the collar locates on that step, so a
 * contaminated or wrong-revision land stops it high and the resistance is the
 * signal the module teaches. Pressing it home defeats exactly that.
 */
function collar(THREE) {
  return lathe(THREE, [
    [0.50, -0.080],                                   // bore, at the underside
    [0.58, -0.080], [0.58, -0.046],                   // the register that seats on the land
    [0.82, -0.046], [0.86, -0.016],                   // underside out, chamfer to the OD
    [0.86, 0.046], [0.82, 0.080],                     // OD wall, top chamfer
    [0.56, 0.080], [0.50, 0.046],                     // top face in, lead-in chamfer
    [0.50, -0.080],                                   // bore wall, close on the start corner
  ], { radial: SMOOTH });
}

function motorHousing(THREE) {
  return lathe(THREE, [
    [0.86, -0.45], [0.92, -0.40], [0.92, 0.40], [0.86, 0.45],
    [0.82, 0.45], [0.82, -0.40], [0.86, -0.45],
    [0.86, -0.45],
  ], { radial: SMOOTH });
}

function motorStator(THREE) {
  return lathe(THREE, [
    [0.40, -0.27], [0.64, -0.27], [0.67, -0.23], [0.67, 0.23],
    [0.64, 0.27], [0.40, 0.27], [0.35, 0.22], [0.35, -0.22],
    [0.40, -0.27],
  ], { radial: SMOOTH });
}

function motorWindings(THREE) {
  return lathe(THREE, [
    [0.69, -0.30], [0.77, -0.30], [0.80, -0.25], [0.80, 0.25],
    [0.77, 0.30], [0.69, 0.30], [0.67, 0.25], [0.67, -0.25],
    [0.69, -0.30],
  ], { radial: SMOOTH });
}

function motorRotor(THREE) {
  return lathe(THREE, [
    [0.00, -0.55], [0.13, -0.55], [0.13, -0.20], [0.25, -0.20],
    [0.30, -0.16], [0.30, 0.16], [0.25, 0.20], [0.13, 0.20],
    [0.13, 0.55], [0.00, 0.55],
  ], { radial: SMOOTH });
}

function motorBearing(THREE) {
  return lathe(THREE, [
    [0.13, -0.09], [0.34, -0.09], [0.38, -0.05], [0.38, 0.05],
    [0.34, 0.09], [0.13, 0.09], [0.13, -0.09],
  ], { radial: SMOOTH });
}

function motorEndbell(THREE) {
  return lathe(THREE, [
    [0.13, -0.11], [0.78, -0.11], [0.88, -0.06], [0.88, 0.06],
    [0.78, 0.11], [0.13, 0.11], [0.13, -0.11],
  ], { radial: SMOOTH });
}

function motorFan(THREE) {
  const hub = lathe(THREE, [
    [0.13, -0.07], [0.25, -0.07], [0.28, -0.04], [0.28, 0.04],
    [0.25, 0.07], [0.13, 0.07], [0.13, -0.07],
  ], { radial: SMOOTH });
  const a = assembly(THREE);
  a.part(hub, 0, 0, 0);
  const blade = roundedBox(THREE, 0.14, 0.07, 0.70, 0.025);
  for (let i = 0; i < 8; i++) {
    const vane = blade.clone();
    vane.translate(0.43, 0, 0);
    vane.rotateY((i / 8) * Math.PI * 2);
    a.part(vane, 0, 0, 0);
    vane.dispose();
  }
  blade.dispose();
  hub.dispose();
  return a.geometry();
}

function motorGuard(THREE) {
  const ring = lathe(THREE, [
    [0.78, -0.06], [0.92, -0.06], [0.92, 0.06], [0.78, 0.06],
    [0.78, -0.06],
  ], { radial: SMOOTH });
  const hub = lathe(THREE, [
    [0.00, -0.07], [0.19, -0.07], [0.19, 0.07], [0.00, 0.07],
  ], { radial: SMOOTH });
  const a = assembly(THREE);
  a.part(ring, 0, 0, 0);
  a.part(hub, 0, 0, 0);
  const strut = roundedBox(THREE, 0.045, 0.08, 0.62, 0.012);
  for (let i = 0; i < 10; i++) {
    const spoke = strut.clone();
    spoke.translate(0.48, 0, 0);
    spoke.rotateY((i / 10) * Math.PI * 2);
    a.part(spoke, 0, 0, 0);
    spoke.dispose();
  }
  strut.dispose();
  ring.dispose();
  hub.dispose();
  return a.geometry();
}

const BUILDERS = {
  base, housing, seal, plunger, cartridge, cap, nest, collar,
  motor_housing: motorHousing,
  motor_stator: motorStator,
  motor_windings: motorWindings,
  motor_rotor: motorRotor,
  motor_drive_bearing: motorBearing,
  motor_non_drive_bearing: motorBearing,
  motor_drive_endbell: motorEndbell,
  motor_non_drive_endbell: motorEndbell,
  motor_fan: motorFan,
  motor_guard: motorGuard,
};

/**
 * Build every part once. Returns { key: BufferGeometry }.
 *
 * Each part is its own geometry rather than one merged assembly because they
 * move independently — the exploder spaces them and the trainer highlights one
 * at a time. Merging is applied WITHIN a part (the fixture's plate plus its
 * four blocks are one buffer) which is where it costs nothing.
 */
export function buildParts(THREE) {
  const out = {};
  for (const { key } of PARTS) out[key] = BUILDERS[key](THREE);
  return out;
}
