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
  const floor = [44, 50, 56];   // a bench, not a void — see the bounce light
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

  // Four lights, each doing one job: a key that models the turned faces, a
  // cool fill so the shadow side is readable rather than black, a back rim
  // that separates the silhouette from the background, and a bounce from
  // below.
  //
  // The bounce is not decoration. The camera is allowed under the assembly
  // because the defects this trains for — a reversed seal, a chip under a
  // housing — are only visible from beneath, and a physically honest rig lit
  // from above renders every one of those surfaces black. A workbench throws
  // light back up; so does this.
  scene.add(new THREE.HemisphereLight(0x9fc4d8, 0x2a3138, 0.85));
  const key = new THREE.DirectionalLight(0xfff2dd, 2.6);
  key.position.set(3.2, 5.4, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x5f8ba8, 1.0);
  fill.position.set(-4, 1.4, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(0, -2, -4);
  scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xdfe8f0, 1.15);
  bounce.position.set(0.6, -5, 1.2);
  scene.add(bounce);

  const st = {
    explode: 0.4, spin: !REDUCED, active: null, stack: [], solo: null,
    yaw: 0.6, pitch: 0.36, zoom: 0, drag: false, px: 0, py: 0,
    held: null, resetting: false,
  };

  /**
   * Per-part displacement from its laid-out position, in world units.
   *
   * Kept as an offset rather than an absolute position because the exploder
   * moves the whole stack underneath: a part lifted out and then exploded
   * should travel with its slot, not stay where the hand left it.
   */
  const offsets = {};
  for (const p of PARTS) offsets[p.key] = new THREE.Vector3();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const planeHit = new THREE.Vector3();
  const grip = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  const toNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  };

  const pick = (e) => {
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    const meshes = st.stack.map((p) => groups[p.key]).filter((m) => m.visible);
    const hits = ray.intersectObjects(meshes, false);
    return hits.length ? hits[0] : null;
  };

  function frame() {
    if (st.spin && !st.drag) st.yaw += 0.0038;
    if (st.stack.length === 0) return;

    const y = layout(st.stack, SEATED + (EXPLODED - SEATED) * st.explode);
    let settled = true;
    st.stack.forEach((part, i) => {
      const g = groups[part.key];
      const off = offsets[part.key];

      // Returning to order eases rather than snaps. A part that jumps back
      // teaches nothing; one that travels back shows the trainee where it
      // belongs relative to where they had taken it.
      if (st.resetting && part.key !== st.held) {
        off.multiplyScalar(0.84);
        if (off.lengthSq() < 1e-6) off.set(0, 0, 0);
        else settled = false;
      }

      // Stashed for the drag handler, which needs the laid-out height to turn
      // a world-space grab point back into an offset.
      g.userData.baseY = y[i];
      g.position.set(off.x, y[i] + off.y, off.z);

      // Ease the highlight rather than switching it: the eye tracks a fade to
      // the part that changed, where an instant swap just redraws the picture.
      const h = g.material.userData.highlight;
      h.value += ((st.active === part.key ? 1 : 0) - h.value) * 0.15;
    });
    if (st.resetting && settled) st.resetting = false;

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

  // Grabbing a part takes precedence over orbiting, and the two are mutually
  // exclusive while held — the same arrangement echoGalaxy uses when a planet
  // is picked up, where the orbit controller is switched off for the duration
  // rather than left to fight the drag for the same pointer.
  const down = (e) => {
    canvas.setPointerCapture(e.pointerId);
    const hit = pick(e);
    if (hit) {
      st.held = hit.object.name;
      st.resetting = false;
      // Drag on a plane through the grab point facing the camera, so the part
      // tracks the cursor at the depth it was grabbed at rather than sliding
      // away along the view axis.
      camera.getWorldDirection(camDir);
      dragPlane.setFromNormalAndCoplanarPoint(camDir, hit.point);
      grip.copy(hit.object.position).sub(hit.point);
      canvas.style.cursor = 'grabbing';
      return;
    }
    st.drag = true;
    st.px = e.clientX;
    st.py = e.clientY;
  };

  const move = (e) => {
    if (st.held) {
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(dragPlane, planeHit)) return;
      const g = groups[st.held];
      const off = offsets[st.held];
      off.set(
        planeHit.x + grip.x,
        planeHit.y + grip.y - (g.userData.baseY || 0),
        planeHit.z + grip.z,
      );
      // Keep a flung part inside the room. Without this a part can be dragged
      // past the far clip and simply cease to exist, which reads as a crash.
      if (off.length() > 8) off.setLength(8);
      return;
    }
    if (st.drag) {
      st.yaw -= (e.clientX - st.px) * 0.008;
      // Pitch runs very nearly pole to pole. The old floor of -0.25 rad kept
      // the camera above the assembly, which made the underside of a seated
      // part impossible to inspect — and the underside is exactly where a
      // reversed seal or a chip under a housing is visible. Stopping just shy
      // of the poles avoids lookAt degenerating when the view axis and up
      // vector coincide.
      st.pitch = Math.max(-1.45, Math.min(1.45, st.pitch + (e.clientY - st.py) * 0.006));
      st.px = e.clientX;
      st.py = e.clientY;
      return;
    }
    // Idle: show that parts are grabbable before the trainee tries.
    canvas.style.cursor = pick(e) ? 'grab' : '';
  };

  const up = (e) => {
    st.drag = false;
    st.held = null;
    canvas.style.cursor = '';
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
      st.held = null;
      st.resetting = false;
      for (const k in groups) groups[k].material.userData.highlight.value = 0;
      for (const k in offsets) offsets[k].set(0, 0, 0);
      applyVisibility();
    },

    /** Ease every displaced part back into the assembly order. */
    resetParts() {
      st.held = null;
      st.resetting = true;
    },

    /** Whether anything has been moved out of place — drives the Reset button. */
    moved() {
      return st.stack.some((p) => offsets[p.key].lengthSq() > 1e-6);
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

    /** Current pitch in radians. Negative is below the assembly. */
    pitch() {
      return st.pitch;
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
