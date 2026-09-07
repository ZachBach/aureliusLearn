/**
 * app.js — state, the four views, and the mount.
 *
 * No framework. The prototype ran on a design tool's React runtime, which
 * re-rendered the whole tree from a values object on every state change; that
 * is fine for a mockup and wrong here, because one of the children is a live
 * WebGPU canvas that must not be torn down and rebuilt when a trainee clicks
 * "next step". So the stage is built once and kept, and only the panels around
 * it are re-rendered.
 *
 * Opening a different module swaps the viewport's part stack rather than
 * rebuilding the scene — every part in the catalogue is uploaded once at boot,
 * and the two authored modules share the housing between them.
 */
import {
  MODULES, moduleByCode, OPERATOR, DISCLOSURE,
  INPUTS, STAGES, KPIS, OPERATORS, READINESS_NOTE,
} from './data.js';
import { partMeta, buildParts } from './parts.js';
import { createViewport } from './viewport.js';

/** Tiny DOM helper. `props` may carry `class`, `text`, or listeners. */
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid);
  }
  return n;
}

const pad2 = (n) => String(n).padStart(2, '0');
const pct = (v) => Math.round(v * 100) + '%';

const VIEWS = [
  ['01', 'Library', 'library'],
  ['02', 'Train', 'train'],
  ['03', 'Build', 'build'],
  ['04', 'Readiness', 'readiness'],
];

const state = {
  view: 'train',
  moduleCode: '8841-02',
  step: 0,
  qi: 0,
  answer: null,
  explode: 0.4,
  ingest: 0,
};

const mod = () => moduleByCode(state.moduleCode);

let vp = null;
let ingestTimer = null;
const dom = {};

/* ── shell ──────────────────────────────────────────────────────────────── */

function buildShell() {
  const nav = el('nav', { class: 'nav' });
  dom.navButtons = {};
  for (const [num, label, id] of VIEWS) {
    const b = el('button', { onclick: () => go(id) }, el('em', { text: num }), el('span', { text: label }));
    dom.navButtons[id] = b;
    nav.append(b);
  }

  dom.cell = el('span');
  dom.rev = el('div', { class: 'meta' });
  const side = el('aside', { class: 'side' },
    el('div', { class: 'brand' },
      el('b', { text: 'AURELIUS' }),
      el('i', { text: 'LEARN' }),
      el('span', { text: 'Assembly training runtime' })),
    nav,
    el('div', { class: 'status' },
      el('div', { class: 'mono', text: 'LINE STATUS' }),
      el('div', { class: 'live' }, el('span', { class: 'dot' }), dom.cell),
      dom.rev));

  dom.crumb = el('div', { class: 'mono' });
  dom.title = el('h1');
  const idTag = OPERATOR.match(/\d+/);
  const head = el('header', { class: 'head' },
    el('div', {}, dom.crumb, dom.title),
    el('div', { class: 'right' },
      el('div', { class: 'chip', text: 'GUIDED MODE' }),
      el('div', { class: 'who' },
        el('i', { text: idTag ? idTag[0] : OPERATOR.slice(0, 2).toUpperCase() }),
        el('span', { text: OPERATOR }))));

  const disclose = el('div', { class: 'disclose' }, el('b', { text: 'SAMPLE · ' }), DISCLOSURE);

  dom.view = el('div', { class: 'view' });
  document.getElementById('app').append(side, el('main', { class: 'main' }, head, disclose, dom.view));
}

function go(view) {
  if (state.view === view) return;
  state.view = view;
  render();
}

/** Open a module: reset progress, swap the viewport's parts, show Train. */
function openModule(code) {
  state.moduleCode = code;
  state.step = 0;
  state.qi = 0;
  state.answer = null;
  if (vp) vp.setStack(mod().stack);
  state.view = 'train';
  render();
}

/* ── train ──────────────────────────────────────────────────────────────── */

function buildStage() {
  dom.canvas = el('canvas', { id: 'viewport' });
  dom.backend = el('span', { class: 'backend', text: 'INITIALISING' });
  dom.assy = el('span', { class: 'mono' });
  dom.partLabel = el('div', { class: 'hud tr mono' });
  dom.explodeOut = el('span', { class: 'mono' });

  const slider = el('input', {
    type: 'range', min: '0', max: '1', step: '0.01', value: String(state.explode),
    'aria-label': 'Explode the assembly',
    oninput: (e) => {
      state.explode = parseFloat(e.target.value);
      dom.explodeOut.textContent = pct(state.explode);
      if (vp) vp.setExplode(state.explode);
    },
  });
  dom.explodeOut.textContent = pct(state.explode);

  dom.spinBtn = el('button', {
    class: 'ghost',
    onclick: () => {
      if (!vp) return;
      vp.setSpin(!vp.spinning());
      dom.spinBtn.textContent = vp.spinning() ? 'PAUSE' : 'ROTATE';
    },
  }, 'PAUSE');

  dom.timeline = el('div', { class: 'timeline' });

  return el('section', { class: 'stage' },
    el('div', { class: 'canvas-wrap' },
      el('div', { class: 'grid' }),
      dom.canvas,
      el('div', { class: 'hud tl' }, dom.assy, dom.backend),
      dom.partLabel,
      el('div', { class: 'controls' },
        el('span', { class: 'mono', text: 'EXPLODE' }),
        slider,
        dom.explodeOut,
        dom.spinBtn)),
    dom.timeline);
}

function renderTimeline() {
  const steps = mod().steps;
  dom.timeline.replaceChildren(...steps.map((s, i) => {
    const b = el('button', {
      onclick: () => { state.step = i; state.qi = 0; state.answer = null; renderTrain(); },
    }, el('em', { text: pad2(i + 1) }), el('span', { text: s.short }));
    if (i === state.step) b.setAttribute('aria-current', 'step');
    else if (i < state.step) b.className = 'done';
    return b;
  }));
}

function renderDetail() {
  const m = mod();
  const s = m.steps[state.step];
  const isCheck = !!s.check;
  const chk = m.checks[state.qi];
  const body = dom.detailBody;

  if (isCheck) {
    const picked = state.answer;
    const answers = el('div', { class: 'answers' }, chk.answers.map((a, i) => {
      const b = el('button', {
        disabled: picked !== null,
        onclick: () => { state.answer = i; renderDetail(); },
      }, a.text);
      if (picked !== null && a.ok) b.className = 'right';
      else if (picked === i) b.className = 'wrong';
      return b;
    }));

    const chosen = picked === null ? null : chk.answers[picked];
    body.replaceChildren(
      el('div', { class: 'mono', style: 'color:var(--accent)', text: `KNOWLEDGE CHECK · ${state.qi + 1} OF ${m.checks.length}` }),
      el('h2', { text: chk.q }),
      chosen && el('div', { class: 'feedback' + (chosen.ok ? '' : ' no') },
        el('div', { class: 'mono', text: chosen.ok ? 'CORRECT' : 'NOT QUITE' }),
        el('p', { text: chosen.fb })),
      answers);
  } else {
    body.replaceChildren(
      el('div', { class: 'stepnum' },
        el('b', { text: pad2(state.step + 1) }),
        el('span', { class: 'mono', text: 'OF ' + m.steps.length })),
      el('h2', { text: s.title }),
      el('p', { class: 'lede', text: s.body }),
      el('div', { class: 'specs' }, s.specs.map((t) => el('span', { text: t }))),
      el('div', { class: 'defect' },
        el('div', { class: 't' }, el('i', {}), el('span', { text: 'COMMON DEFECT' })),
        el('p', { text: s.defect })),
      el('div', { class: 'source' },
        el('div', { class: 'mono', text: 'SOURCE' }),
        el('p', { text: s.source })));
  }

  // The panel scrolls; a new step must start at its top, or step 4 opens
  // halfway down because step 3 was read to the bottom.
  body.scrollTop = 0;

  const lastQ = state.qi >= m.checks.length - 1;
  dom.back.disabled = state.step === 0 && state.qi === 0;
  dom.next.disabled = isCheck && state.answer === null;
  dom.next.textContent = !isCheck
    ? 'Next step'
    : state.answer === null ? 'Answer to continue'
      : lastQ ? 'Finish · log result' : 'Next question';

  const part = isCheck ? chk.part : s.part;
  const meta = partMeta(part);
  dom.partLabel.textContent = meta ? meta.label : '';
  if (vp) vp.setActive(part);
}

function renderTrain() {
  dom.assy.textContent = 'ASSY ' + mod().code;
  renderTimeline();
  renderDetail();
}

function advance(dir) {
  const m = mod();
  const s = m.steps[state.step];
  if (dir < 0) {
    if (s.check && state.qi > 0) { state.qi--; state.answer = null; }
    else if (state.step > 0) { state.step--; state.qi = 0; state.answer = null; }
  } else if (!s.check) {
    state.step++;
    state.answer = null;
  } else if (state.answer !== null) {
    if (state.qi < m.checks.length - 1) { state.qi++; state.answer = null; }
    else { go('readiness'); return; }
  }
  renderTrain();
}

function buildTrain() {
  dom.detailBody = el('div', { class: 'body' });
  dom.back = el('button', { onclick: () => advance(-1) }, 'Back');
  dom.next = el('button', { class: 'primary', onclick: () => advance(1) }, 'Next step');
  dom.train = el('div', { class: 'train' },
    buildStage(),
    el('aside', { class: 'detail' },
      dom.detailBody,
      el('div', { class: 'foot' }, dom.back, dom.next)));
  return dom.train;
}

/* ── library / build / readiness ────────────────────────────────────────── */

function viewLibrary() {
  return el('div', { class: 'scroll' },
    el('div', { class: 'cards lib' }, MODULES.map((m) => el('button', {
      class: 'card',
      onclick: () => m.authored && openModule(m.code),
      disabled: !m.authored,
      title: m.authored ? '' : 'Not authored in this sample',
      'aria-current': m.code === state.moduleCode ? 'true' : null,
    },
    el('div', { class: 'row' },
      el('span', { class: 'dot tone-' + m.tag }),
      el('span', { class: 'mono', text: m.code })),
    el('h3', { text: m.name }),
    el('div', { class: 'meta', text: m.meta }),
    el('div', { class: 'bar' }, el('i', { class: 'tone-' + m.tag, style: `width:${m.readiness * 100}%` })),
    el('div', { class: 'pct', text: pct(m.readiness) + ' line-ready' })))));
}

function renderStages() {
  dom.stages.replaceChildren(...STAGES.map((label, i) => {
    const done = state.ingest > i + 1;
    const run = state.ingest === i + 1;
    return el('div', { class: 'stage-row' + (run ? ' run' : done ? ' done' : '') },
      el('em', { text: pad2(i + 1) }),
      el('span', { text: label }),
      el('span', { class: 's', text: done ? 'DONE' : run ? 'RUNNING' : '—' }));
  }));
  const busy = state.ingest > 0 && state.ingest <= STAGES.length;
  dom.runBtn.className = 'run-btn' + (busy ? ' busy' : '');
  dom.runBtn.disabled = busy;
  dom.runBtn.textContent = state.ingest === 0 ? 'Run the storyboard'
    : busy ? 'Running…' : 'Complete — reset';
}

function runIngest() {
  clearInterval(ingestTimer);
  if (state.ingest > STAGES.length) { state.ingest = 0; renderStages(); return; }
  state.ingest = 1;
  renderStages();
  ingestTimer = setInterval(() => {
    state.ingest++;
    if (state.ingest > STAGES.length) clearInterval(ingestTimer);
    renderStages();
  }, 850);
}

function viewBuild() {
  dom.stages = el('div', { class: 'stages' });
  dom.runBtn = el('button', { class: 'run-btn', onclick: runIngest });

  const v = el('div', { class: 'scroll' },
    el('div', { class: 'storyboard' },
      el('b', { text: 'Storyboard. ' }),
      'This is a design study of the authoring pipeline, not a running one. Nothing is parsed, matched or tessellated here — the stages below are on a timer, and the files are named, not read.'),
    el('div', { class: 'cards two' },
      el('section', { class: 'card' },
        el('div', { class: 'mono', text: 'INPUTS' }),
        el('p', { class: 'note', style: 'margin:8px 0 16px', text: 'What a plant already has, in the formats it already keeps it in.' }),
        el('div', { class: 'files' }, INPUTS.map((f) => el('div', { class: 'file' },
          el('span', { class: 'kind', text: f.kind }),
          el('span', { class: 'name', text: f.name }),
          el('span', { class: 'size', text: f.size })))),
        dom.runBtn),
      el('section', { class: 'card' },
        el('div', { class: 'mono', text: 'PIPELINE' }),
        dom.stages,
        el('p', { class: 'note', text: 'The intent it illustrates: every generated step keeps a pointer back to the paragraph, photo and CAD body it came from, so revising the SOP flags what changed instead of silently drifting.' }))));
  renderStages();
  return v;
}

function viewReadiness() {
  return el('div', { class: 'scroll' },
    el('div', { class: 'cards kpi' }, KPIS.map((k) => el('div', { class: 'card kpi' },
      el('div', { class: 'mono', text: k.label }),
      el('div', { class: 'v', text: k.value }),
      el('div', { class: 'n' + (k.good ? ' good' : ''), text: k.note })))),
    el('section', { class: 'card', style: 'margin-top:18px' },
      el('div', { class: 'mono', text: 'OPERATOR READINESS · SAMPLE ROSTER' }),
      el('div', { class: 'ops' }, OPERATORS.map((o) => el('div', { class: 'op' },
        el('div', {}, el('div', { class: 'n', text: o.name }), el('div', { class: 't', text: o.tenure })),
        el('div', { class: 'track' }, el('i', { class: 'tone-' + o.tone, style: `width:${o.readiness * 100}%` })),
        el('div', { class: 'tag ink-' + o.tone, text: o.tag })))),
      el('p', { class: 'note', text: READINESS_NOTE })));
}

/* ── render ─────────────────────────────────────────────────────────────── */

const CRUMBS = {
  library: 'MODULE LIBRARY',
  train: 'TRAINING RUNTIME',
  build: 'AUTHORING',
  readiness: 'ANALYTICS',
};

function render() {
  const m = mod();
  dom.crumb.textContent = 'SAMPLE DATASET / ' + CRUMBS[state.view];
  dom.title.textContent = state.view === 'train' ? `${m.name} — ${m.cell}`
    : state.view === 'library' ? 'Module library'
      : state.view === 'build' ? 'Build a module' : 'Readiness';
  dom.cell.textContent = m.cell + ' — sample';
  dom.rev.textContent = m.rev + ' · ' + m.sop;

  for (const [id, b] of Object.entries(dom.navButtons)) {
    if (id === state.view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }

  if (state.view !== 'build') { clearInterval(ingestTimer); ingestTimer = null; }

  if (state.view === 'train') {
    dom.view.replaceChildren(dom.train);
    renderTrain();
  } else if (state.view === 'library') {
    dom.view.replaceChildren(viewLibrary());
  } else if (state.view === 'build') {
    dom.view.replaceChildren(viewBuild());
  } else {
    dom.view.replaceChildren(viewReadiness());
  }
}

/**
 * Graphics come up after the UI, and the UI works without them: if neither
 * WebGPU nor WebGL2 initialises, the trainee still gets every step, every
 * check and every source reference — they lose the picture, not the module.
 */
async function boot() {
  buildShell();
  buildTrain();
  render();

  let THREE;
  try {
    THREE = await import('../vendor/three.webgpu.min.js');
    const geometries = buildParts(THREE);
    vp = await createViewport(THREE, dom.canvas, { geometries });
  } catch (err) {
    console.error('[learn] viewport unavailable:', err);
    dom.backend.textContent = 'NO GPU';
    dom.canvas.remove();
    return;
  }

  vp.setStack(mod().stack);
  dom.backend.textContent = vp.backend;
  dom.backend.classList.toggle('live', vp.backend.startsWith('WEBGPU'));
  vp.setExplode(state.explode);
  dom.spinBtn.textContent = vp.spinning() ? 'PAUSE' : 'ROTATE';
  renderDetail();
  window.__learn = { vp, state, openModule, MODULES };   // the headless check drives this
}

boot();
