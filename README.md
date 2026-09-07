# Aurelius Learn

An assembly training runtime that runs in a browser. A procedure is stepped one
operation at a time beside a live exploded view of the part the step is talking
about, and knowledge checks are asked against the same geometry.

Upstream for the Aurelius site's `/learn/`. Same arrangement as `/helix/`,
`/ikos/` and `/galaxy/`: the site serves deployed output, this repo is the
source. Built from a Claude Design prototype — the visual design is recreated,
the prototype's internals are not.

```bash
python -m http.server 8000     # then open http://localhost:8000
node tools/verify.mjs          # headless check, both backends
node tools/deploy.mjs          # copy into ../learn/
```

No build step, no bundler, no install. Plain ES modules and static files.

## The modules

Two are authored, and they interlock on purpose:

| | |
| --- | --- |
| **8841-02** Cartridge Insert Assembly | 6 steps · seat, seal, plunger, cartridge, torque |
| **7712-01** Housing Weld Prep | 9 steps · the housing 8841-02 seats, prepared for weld |

7712-01 is upstream, so several of its steps name the *downstream* consequence
rather than the local one — a wrong-revision housing welds without complaint
and arrives at 8841-02 with a land 0.2 mm shallow. A trainee running both
should notice that the defect one module warns about is the defect the other
inherits. Two further library entries are deliberately unauthored, so the
Library view shows what a partly-built library looks like.

Adding a module is `src/data.js` plus, if it needs parts nothing else uses, a
builder in `src/parts.js` and an entry in the `PARTS` catalogue. The check
enforces that every `part` named by a step or a check appears in that module's
`stack`.

## Everything in it is a fixture

There is no customer here, no line, and no measured result — the readiness
figures, the operator roster and the module library are all invented, and the
app says so on every view. The authoring pipeline under **Build** is a
storyboard on a timer: nothing is parsed, matched or tessellated.

This matters more than it might look. The studio's rule is that a capability
claim maps to a named running artifact or it says plainly that it is
exploration, and a dashboard tile reading "63% faster than manual onboarding"
is a claim nothing here is in a position to make. Where a delta appears it
compares two points inside the sample series, which is a statement about
invented data being self-consistent. Keep it that way: `src/data.js` opens with
the same warning, at more length.

## What it contacts at runtime

Nothing. Every font is served from `fonts/`, three.js is served from `vendor/`,
and there is no analytics, no CDN and no backend. `tools/verify.mjs` fails the
run if the page requests anything off its own origin, so this stays true by
construction rather than by good intentions.

## How it is put together

| | |
| --- | --- |
| `src/parts.js` | the six components, as turned profiles |
| `src/material.js` | one node material per part |
| `src/viewport.js` | renderer, framing, orbit, exploder |
| `src/data.js` | the sample module — steps, checks, figures |
| `src/app.js` | state and the four views |
| `lib/` | vendored geo-lib and tsl-lib, byte-identical |
| `vendor/` | three.js r178, extracted from the Aurelius bundle |

### Handling the parts

Orbit runs very nearly pole to pole, and any part can be picked up, dragged
out of the stack and put back with **Reset**. Both exist for one reason: the
defects this trains for are underside defects. A reversed seal and a chip
under a housing are invisible from above, so a camera held above the assembly
makes the module's own failure modes unteachable — and a part sitting in a
stack hides its own bottom face whatever the camera does.

The rig carries a bounce light from below for the same reason. Lighting a
scene only from above is the physically honest choice and it renders every
surface the trainee needs to inspect as black; a workbench throws light back
up, and so does this.

Grab and orbit are mutually exclusive while a part is held — the pattern
echoGalaxy uses when a planet is picked up, where the orbit controller is
switched off for the duration rather than left fighting the drag for the same
pointer.

WebGPU with a WebGL2 fallback, both running the same TSL node materials —
`WebGPURenderer({ forceWebGL: true })` compiles the same node graph to GLSL, so
a machine without WebGPU loses speed and nothing else. The check gates on
reaching the backend it asked for, because a silent fallback otherwise looks
exactly like a pass.

The UI is built once and updated in place. The prototype re-rendered its whole
tree from a values object on every state change, which is right for a mockup
and wrong here: one of the children is a live WebGPU canvas that must not be
torn down because a trainee pressed "next step".

### The geometry is the argument

The prototype drew its parts as cylinders and a torus. That is enough to say
"an assembly", and not enough to train anybody: the module's hardest knowledge
check asks a trainee to tell a chamfered seal face from a flat one under raking
light, and a torus has no face to get backwards.

So every part is a real turned profile — bores, lead-in chamfers, a relief
groove, a knurled cap — revolved through geo-lib. `src/parts.js` carries the two
non-obvious things that took to make it correct, and both are worth reading
before touching a profile, because neither announces itself:

- **A closed cross-section reverses in y**, and `revolve` puts every section of
  its spine on the axis, so the spine doubles back on itself. `loft` frames by
  parallel transport and the reversal is an antiparallel step, which names no
  axis of rotation — the frame flips 180°, and past the flip every quad joins
  angle `+a` on one ring to `−a` on the next. The resulting twisted sheet sweeps
  across the middle of the part. **A washer renders as a solid disc while every
  measurement of it still says washer.** `monotonicRuns` cuts the profile at
  each reversal.

- **`loft` shares one ring per profile point** and finishes with
  `computeVertexNormals`, which is exactly right for the shoulders and necks the
  library was built for and wrong for turned steel: every corner shades as a
  soft bevel and the part reads as a pebble. `hardEdges` doubles the interior
  points so each corner carries a real edge.

Both bugs produce geometry that is perfectly valid and completely wrong, which
is geo-lib's own argument for why its bench renders pictures instead of only
asserting. `tools/verify.mjs` does both: it shoots contact sheets, and it checks
each bored part's closest approach to its own axis — a solid disc and a washer
have identical bounding boxes and triangle counts, and differ in that one
number.

## Deviations from the prototype

Deliberate, and worth knowing before someone "fixes" them back:

- **Type is Space Grotesk and JetBrains Mono, not IBM Plex.** The prototype
  pulled Plex from Google Fonts. These are the families the studio already
  serves, they were lifted out of the landing bundle by
  `tsl-lib/tools/extract-fonts.py`, and they cost no third-party request.
- **The accent is the studio's brand gold**, read from tsl-lib's palette, not
  the prototype's amber. The selection rim in the viewport reads the same
  value, so the UI and the render cannot drift apart.
- **three.js is r178**, the revision pinned across the studio, not the r170 the
  prototype loaded from a CDN.
- **The client, the operator names and the outcome claims are gone.** See above.

## Vendored code

`lib/` holds byte-identical copies of the geo-lib and tsl-lib modules this app
uses. Both libraries are written to be vendored — every builder takes the
three.js or TSL namespace as its first argument and imports nothing external —
so the copies need no rewriting.

```bash
node tools/vendor.mjs           # re-copy from the sibling checkout
node tools/vendor.mjs --check   # report drift, exit 1 if any
```

Never hand-edit anything under `lib/`: fix it upstream and re-vendor, or the
next run silently reverts you. `lib/VENDORED.json` records what came from
where.

## License

MIT — see [`LICENSE`](LICENSE). The vendored studio code under `lib/` is the
same licence and the same author, so it needs no carve-out.

Third-party components carry their own:

| Component | Licence | Where |
| --- | --- | --- |
| [three.js](https://threejs.org) r178 | MIT — © 2010–2026 three.js authors | `vendor/three.*.min.js` |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL Open Font License 1.1 | `fonts/jetbrains-mono-*.woff2` |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | SIL Open Font License 1.1 | `fonts/space-grotesk-*.woff2` |

OFL 1.1 requires its licence to travel with redistributed font files and
forbids selling the fonts on their own — [`fonts/OFL.txt`](fonts/OFL.txt) ships
beside them. The fonts are not sold; they are a component of a freely readable
application. Reserved font names are unchanged and no font file was modified
beyond the subsetting Google Fonts already applies.

## Author

Zachary Auerbach · Aurelius Dynamic
ORCID [0009-0001-3046-9104](https://orcid.org/0009-0001-3046-9104) ·
[github.com/ZachBach](https://github.com/ZachBach) ·
[build@aureliusdynamic.com](mailto:build@aureliusdynamic.com)

Citation metadata is in [`CITATION.cff`](CITATION.cff), and its abstract
carries the fixture-data scope statement so it travels with the citation.
