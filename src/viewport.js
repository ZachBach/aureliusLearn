/**
 * viewport.js — the assembly view: six parts, an exploder, and an orbit.
 *
 * WebGPU with a WebGL2 fallback. Both paths run the same TSL node materials,
 * which is the reason the fallback is a fallback and not a second renderer:
 * `WebGPURenderer({ forceWebGL: true })` compiles the same node graph down to
 * GLSL, so a machine without WebGPU loses some speed and nothing else.
 */
import { PARTS, partMeta } from './parts.js';
import { partMaterial, accentUniform } from './material.js';

const REDUCED = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vertical layout. Each gap is the mean of the two neighbouring part heights,
 * scaled by `k`: parts interpenetrate when seated and stand clear when
 * exploded. Spacing off the real heights rather than a flat step keeps the
 * plunger — which is four times the height of the seal — from looking as
 * though it has been shoved into a slot meant for something else.
 */
function layout(stack, k) {
  const y = [0];
  for (let i = 1; i < stack.length; i++) {
    y.push(y[i - 1] + ((stack[i - 1].height + stack[i].height) / 2) * k);
  }
  const mid = (y[0] + y[y.length - 1]) / 2;
  return y.map((v) => v - mid);
}

const SEATED = 0.62;   // interpenetrating: the assembled unit
const EXPLODED = 3.4;  // clear air between every face

/**
 * A studio environment, generated rather than loaded.
 *
 * Metal has no diffuse component: a metalness-1 surface is nothing but a
 * reflection, so lit by direct lights alone it renders very nearly black and
 * the part reads as charcoal. Steel needs something to be shiny WITH.
 *
 * This is a 16x64 equirectangular gradient — cool overhead, warm at the
 * horizon, dark below, which is a softbox over a workbench. It deliberately
 * skips PMREM prefiltering: prefiltering exists to stop a sharp environment
 * from aliasing as roughness rises, and there is nothing sharp in a smooth
 * vertical ramp. Keeping it out avoids putting the renderer through a
 * generator pass at boot for no visible difference.
 */
function studioEnvironment(THREE) {
  const W = 16;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  const sky = [122, 148, 172];
  const horizon = [196, 182, 158];
  const floor = [20, 25, 29];
  for (let y = 0; y < H; y++) {
    // v runs top-to-bottom over the sphere; the horizon sits just above centre.
    const t = y / (H - 1);
    const k = t < 0.46 ? t / 0.46 : (t - 0.46) / 0.54;
    const from = t < 0.46 ? sky : horizon;
    const to = t < 0.46 ? horizon : floor;
    // Ease into the horizon so the reflected band has a soft edge.
    const e = t < 0.46 ? k * k : Math.sqrt(k);
    for (let x = 0; x < W; x++) {
      // Rows are written bottom-up. A DataTexture's first row is v = 0, and
      // equirectangular mapping puts v = 0 at the SOUTH pole — so writing the
      // sky into row 0 hangs the sky underneath the parts, and every up-facing
      // surface reflects the dark floor instead. The tell is a part whose
      // sides are bright and whose top is black.
      const i = ((H - 1 - y) * W + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = from[c] + (to[c] - from[c]) * e;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export async function createViewport(THREE, canvas, opts = {}) {
  const accent = accentUniform(THREE);

  // One init attempt, then an explicit WebGL2 retry. A failed WebGPU init
  // leaves the renderer unusable, so the fallback needs a fresh one rather
  // than a re-init of the corpse.
  let renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
  try {
    await renderer.init();
  } catch (err) {
    console.warn('[learn] WebGPU unavailable, falling back to WebGL2:', err && err.message);
    try { renderer.dispose(); } catch (_) { /* already dead */ }
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: true });
    await renderer.init();
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const scene = new THREE.Scene();
  const env = studioEnvironment(THREE);
  scene.environment = env;
  scene.environmentIntensity = 1.45;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // Every part in the catalogue is built and added once, then hidden; a module
  // shows its own subset. Two modules share the housing, and the alternative —
  // tearing down and rebuilding meshes when the trainee opens a different
  // module — would drop frames and re-upload geometry that had not changed.
  const geometries = opts.geometries;
  const groups = {};
  for (const part of PARTS) {
    const mat = partMaterial(THREE, part.tone, accent);
    mat.name = part.key + '_mat';
    const mesh = new THREE.Mesh(geometries[part.key], mat);
    mesh.name = part.key;
    mesh.visible = false;
    scene.add(mesh);
    groups[part.key] = mesh;
  }

  // Three lights, each doing one job: a key that models the turned faces, a
  // cool fill so the shadow side is readable rather than black, and a back rim
  // that separates the silhouette from the background.
  scene.add(new THREE.HemisphereLight(0x9fc4d8, 0x0b0e10, 0.8));
  const key = new THREE.DirectionalLight(0xfff2dd, 2.6);
  key.position.set(3.2, 5.4, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x5f8ba8, 1.0);
  fill.position.set(-4, 1.4, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(0, -2, -4);
  scene.add(rim);

  const st = {
    explode: 0.4, spin: !REDUCED, active: null, stack: [], solo: null,
    yaw: 0.6, pitch: 0.36, zoom: 0, drag: false, px: 0, py: 0,
  };

  function frame() {
    if (st.spin && !st.drag) st.yaw += 0.0038;
    if (st.stack.length === 0) return;

    const y = layout(st.stack, SEATED + (EXPLODED - SEATED) * st.explode);
    st.stack.forEach((part, i) => {
      const g = groups[part.key];
      g.position.y = y[i];
      // Ease the highlight rather than switching it: the eye tracks a fade to
      // the part that changed, where an instant swap just redraws the picture.
      const h = g.material.userData.highlight;
      h.value += ((st.active === part.key ? 1 : 0) - h.value) * 0.15;
    });

    // Frame the whole stack whatever it is doing: the span grows as it
    // explodes, so the distance has to grow with it or the ends walk out of
    // shot. Solved rather than tuned — at a 32-degree vertical field the
    // visible height is 2*d*tan(16deg), so the distance that fits `span` with
    // room to spare falls straight out of it. Tuned constants got this subtly
    // wrong and clipped the cap off the top only at full explode.
    const span = y[y.length - 1] - y[0] + st.stack[0].height + st.stack[st.stack.length - 1].height;
    const halfFov = (camera.fov / 2) * (Math.PI / 180);
    const FILL = 0.78; // leave a margin, and clear the controls along the bottom
    const dist = Math.max(4.2, span / (2 * Math.tan(halfFov) * FILL)) + st.zoom;
    const cp = Math.cos(st.pitch);
    camera.position.set(
      Math.sin(st.yaw) * cp * dist,
      Math.sin(st.pitch) * dist,
      Math.cos(st.yaw) * cp * dist,
    );
    // Aim slightly low so the stack rides above the HUD row rather than
    // through it.
    camera.lookAt(0, -span * 0.04, 0);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const down = (e) => {
    st.drag = true; st.px = e.clientX; st.py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!st.drag) return;
    st.yaw -= (e.clientX - st.px) * 0.008;
    st.pitch = Math.max(-0.25, Math.min(1.3, st.pitch + (e.clientY - st.py) * 0.006));
    st.px = e.clientX; st.py = e.clientY;
  };
  const up = (e) => {
    st.drag = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* never captured */ }
  };
  const wheel = (e) => {
    e.preventDefault();
    st.zoom = Math.max(-2.4, Math.min(6, st.zoom + e.deltaY * 0.004));
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });

  // Visibility is derived, never toggled directly: the stack decides what
  // exists for this module and solo narrows it further, so one function owns
  // both and they cannot disagree.
  const applyVisibility = () => {
    for (const k in groups) groups[k].visible = false;
    for (const part of st.stack) {
      groups[part.key].visible = !st.solo || part.key === st.solo;
    }
  };

  return {
    backend: renderer.backend && renderer.backend.isWebGPUBackend ? 'WEBGPU · TSL' : 'WEBGL2 · TSL',
    reducedMotion: REDUCED,

    /**
     * Choose which parts this module shows, bottom to top. Unknown keys are
     * dropped rather than throwing — but verify.mjs fails on them, because a
     * silently missing part is a step whose text describes something that is
     * not on screen.
     */
    setStack(keys) {
      st.stack = keys.map(partMeta).filter(Boolean);
      st.solo = null;
      st.active = null;
      for (const k in groups) groups[k].material.userData.highlight.value = 0;
      applyVisibility();
    },

    /** The keys currently stacked, for the check to compare against the data. */
    stack() {
      return st.stack.map((p) => p.key);
    },
    setExplode(v) { st.explode = Math.max(0, Math.min(1, v)); },
    setSpin(v) { st.spin = !!v; },
    spinning() { return st.spin; },
    setActive(k) { st.active = k || null; },

    /**
     * Park the camera at a named angle and stop the spin.
     *
     * Screenshots are only comparable between runs if the camera was in the
     * same place, and a slowly rotating stack is never in the same place
     * twice. The check drives this before every shot.
     */
    setView(yaw, pitch) {
      st.yaw = yaw;
      st.pitch = pitch;
      st.spin = false;
    },

    /** Camera distance offset, the same one the wheel drives. Negative pulls in. */
    setZoom(z) {
      st.zoom = Math.max(-2.4, Math.min(6, z));
    },

    /**
     * Show one part alone, or all of them again with null.
     *
     * In the assembled stack every part is sitting on the hole in the part
     * below it, so "is the bore actually there" cannot be answered by looking
     * at the assembly from any angle at all. One part, straight down, answers
     * it immediately.
     */
    setSolo(key) {
      st.solo = key || null;
      applyVisibility();
    },

    /**
     * Per-part triangle counts and bounds, for the headless check.
     *
     * Geometry fails silently — a NaN does not throw, it makes the mesh
     * vanish, and a picture of six parts where one is missing looks a lot like
     * a picture of five parts you meant to draw. Finite bounds and a non-zero
     * triangle count per part are the two numbers that catch it.
     */
    stats() {
      return st.stack.map(({ key }) => {
        const g = groups[key].geometry;
        g.computeBoundingBox();
        const b = g.boundingBox;
        // Closest approach to the Y axis. This is how a bore is checked: a
        // bored part has no vertices near its own centreline, so a minRadius
        // of zero means the hole got roofed over. Nothing in a bounding box
        // or a triangle count can see that, and from most camera angles the
        // part above is sitting on the hole in the part below.
        const p = g.attributes.position;
        let minR = Infinity;
        for (let i = 0; i < p.count; i++) {
          minR = Math.min(minR, Math.hypot(p.getX(i), p.getZ(i)));
        }
        return {
          key,
          tris: (g.index ? g.index.count : p.count) / 3,
          finite: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite),
          height: b.max.y - b.min.y,
          radius: Math.max(b.max.x, b.max.z),
          minRadius: minR,
        };
      });
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
      for (const k in groups) groups[k].material.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
