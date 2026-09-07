/**
 * data.js — the sample modules.
 *
 * EVERYTHING HERE IS A FIXTURE. There is no customer, no line, and no measured
 * result anywhere in this file, and there must not be one: this app is a
 * demonstration of a training runtime, not a report of what a training runtime
 * achieved. The studio's rule is that a capability claim maps to a named
 * running artifact or it says plainly that it is exploration, and a dashboard
 * tile reading "63% faster than manual onboarding" is a claim nothing here is
 * in a position to make.
 *
 * So the numbers below describe the FIXTURE and nothing else. Where a delta
 * appears it compares two points inside this sample series, which is a
 * statement about invented data being self-consistent. The chrome carries the
 * disclosure on every view.
 *
 * The procedures are deliberately generic small-device work. They are written
 * to be plausible and to make the failure modes teachable, not to describe any
 * real product, and the two authored modules deliberately interlock: 7712-01
 * prepares the housing that 8841-02 then seats. A trainee who runs both should
 * see that the defect one module warns about is the defect the other one
 * inherits.
 */

export const DISCLOSURE = 'Sample dataset — illustrative figures, not measured results.';

export const OPERATOR = 'Operator 01';

/**
 * The library. `stack` names the parts the viewport shows, bottom to top, and
 * every `part` in a step or check must be one of them — `tools/verify.mjs`
 * checks that, because a step pointing at a part the module does not show
 * leaves the viewport highlighting nothing while the text talks confidently
 * about a component that is not on screen.
 */
export const MODULES = [
  {
    code: '8841-02',
    name: 'Cartridge Insert Assembly',
    rev: 'Rev 12',
    sop: 'SOP-4471',
    cell: 'Line 3 · Cell B',
    meta: '6 steps · Rev 12 · updated 3d ago',
    readiness: 0.92,
    tag: 'ready',
    authored: true,
    stack: ['base', 'housing', 'seal', 'plunger', 'cartridge', 'cap'],
    steps: [
      {
        part: 'housing',
        short: 'Seat housing',
        title: 'Seat the housing in the fixture',
        body: 'Drop the housing into fixture F-22 and press until the alignment pin clears the datum slot. You should feel one detent, not two — a second click means the housing is riding on debris.',
        specs: ['FIXTURE F-22', 'DATUM A'],
        defect: 'Housing seated on a chip from the prior unit. The stack still torques to spec and still leaks.',
        source: 'SOP-4471 §3.2, p.14 · Fixture photo 8841-F22-b',
      },
      {
        part: 'seal',
        short: 'Install seal',
        title: 'Install the seal ring',
        body: 'The chamfered face goes toward the plunger bore. Under raking light the chamfer reads as a dull edge; the flat face reads bright. Check it before it goes in, not after.',
        specs: ['ORIENTATION CRITICAL', 'NO TOOLS'],
        defect: 'Reversed seal. Passes every visual gate on the line and fails leak test at final, four hours later.',
        source: 'SOP-4471 §3.4, p.16 · CAD body SEAL-RING-02',
      },
      {
        part: 'plunger',
        short: 'Insert plunger',
        title: 'Insert the plunger dry',
        body: 'No lubricant. Silicone migrates into the fluid path and shows up as particulate at release. If the plunger will not travel, the bore is out of spec — tag the unit, do not force it.',
        specs: ['0.35 N·m', 'NO LUBRICANT'],
        defect: 'Lubricated plunger. Invisible at the station, caught weeks later in QC particulate.',
        source: 'SOP-4471 §3.5, p.17 · Deviation log DEV-2214',
      },
      {
        part: 'cartridge',
        short: 'Load cartridge',
        title: 'Load the cartridge',
        body: 'Seat the cartridge until it bottoms, then rotate so the lot code faces the operator window. Downstream inspection reads that code through the window and nowhere else.',
        specs: ['LOT CODE VISIBLE', 'FULL SEAT'],
        defect: 'Cartridge seated but rotated. Inspection cannot read the lot and the unit is quarantined.',
        source: 'SOP-4471 §3.6, p.18',
      },
      {
        part: 'cap',
        short: 'Torque cap',
        title: 'Torque the cap in two passes',
        body: 'Seat at 0.4 N·m, then final at 0.80 N·m ± 0.05. One pass work-hardens the thread and reads high on the driver while the joint is still loose.',
        specs: ['0.80 N·m ±0.05', '2 PASS'],
        defect: 'Single-pass torque. The driver logs a pass; the joint relaxes overnight.',
        source: 'SOP-4471 §3.8, p.21 · Driver profile TQ-08',
      },
      { part: 'seal', short: 'Knowledge check', check: true },
    ],
    checks: [
      {
        part: 'seal',
        q: 'The seal ring passes visual inspection but the unit fails leak test at final. What is the most likely cause at your station?',
        answers: [
          { text: 'The cap was under-torqued on the final pass.', ok: false, fb: 'Under-torque shows up as a loose joint on the driver log. A leak with a clean torque record points upstream of the cap.' },
          { text: 'The seal ring went in with the chamfer facing away from the bore.', ok: true, fb: 'Correct. A reversed seal looks identical from above and only fails under pressure — the costliest rework on this line.' },
          { text: 'The cartridge was not fully seated before the cap went on.', ok: false, fb: 'An unseated cartridge fouls the cap thread — you would have felt it at torque. Look for the defect that is invisible after assembly.' },
        ],
      },
      {
        part: 'plunger',
        q: 'A plunger will not travel the full stroke during insertion. What do you do?',
        answers: [
          { text: 'Apply a light film of silicone and continue.', ok: false, fb: 'Never. Silicone migrates into the fluid path and returns as particulate at release, weeks after your shift.' },
          { text: 'Tag the unit and flag the bore as out of spec.', ok: true, fb: 'Correct. A tight bore is a dimensional problem, not a force problem. Tagging it protects the lot and feeds the deviation log.' },
          { text: 'Press harder until it seats, then log the extra force.', ok: false, fb: 'Forcing it galls the bore wall. The unit may pass here and shed particulate downstream.' },
        ],
      },
      {
        part: 'cap',
        q: 'The driver logs 0.80 N·m on the first pass and you are running ahead of takt. Skip the second pass?',
        answers: [
          { text: 'Yes — the torque spec is met and logged.', ok: false, fb: 'The reading is real but the joint is not. Single-pass torque work-hardens the thread and reads high while the joint is still relaxing.' },
          { text: 'No — seat at 0.4 N·m first, then final at 0.80 N·m.', ok: true, fb: 'Correct. Two passes exist because the first reading lies. This one costs nothing today and prevents an overnight relaxation failure.' },
          { text: 'Yes, but note the single pass in the shift log.', ok: false, fb: 'A note does not make the joint sound. The procedure is two passes regardless of the reading.' },
        ],
      },
    ],
  },

  {
    code: '7712-01',
    name: 'Housing Weld Prep',
    rev: 'Rev 4',
    sop: 'SOP-3308',
    cell: 'Line 2 · Weld cell A',
    meta: '9 steps · Rev 4 · updated 2w ago',
    readiness: 0.61,
    tag: 'partial',
    authored: true,
    stack: ['nest', 'housing', 'collar'],
    /**
     * Upstream of 8841-02. Everything this module gets wrong arrives at the
     * other one as a housing that seats badly or leaks, which is why several
     * steps below name the downstream consequence rather than the local one.
     */
    steps: [
      {
        part: 'housing',
        short: 'Verify lot',
        title: 'Verify the lot and the revision',
        body: 'Read the lot code and the revision off the housing itself, not off the tote label. Totes get re-used and re-labelled; the part carries the truth. Rev 3 and Rev 4 housings differ only in the depth of the weld land, and the two are impossible to tell apart by eye.',
        specs: ['REV 4 ONLY', 'READ THE PART'],
        defect: 'A Rev 3 housing welded to a Rev 4 collar. The weld looks perfect and the joint is 0.2 mm shallow all the way round.',
        source: 'SOP-3308 §2.1, p.4 · ECO-1188 (Rev 3 → Rev 4)',
      },
      {
        part: 'housing',
        short: 'Degrease land',
        title: 'Degrease the weld land',
        body: 'Wipe the land with a lint-free swab and fresh solvent, one direction, one pass per swab. A swab that has already touched the land is carrying whatever it just removed. Let it flash off completely — a wet land boils at the weld and leaves porosity.',
        specs: ['ONE PASS PER SWAB', 'FLASH OFF FULLY'],
        defect: 'Residual oil from the forming press. It burns off in the weld, leaves gas porosity, and the joint passes visual inspection.',
        source: 'SOP-3308 §2.3, p.6 · Solvent lot log',
      },
      {
        part: 'housing',
        short: 'Inspect land',
        title: 'Inspect the weld land under raking light',
        body: 'Tilt the housing under the lamp until the land catches the light edge-on. You are looking for scoring across the land, not along it — a circumferential score follows the weld path and closes up, an axial score crosses it and becomes a leak path.',
        specs: ['RAKING LIGHT', 'AXIAL SCORES REJECT'],
        defect: 'An axial score from the deburr tool. It is a single hairline and it is a through-path once the joint is pressurised.',
        source: 'SOP-3308 §2.4, p.7 · Reject atlas plate 9',
      },
      {
        part: 'nest',
        short: 'Load nest',
        title: 'Load the housing into weld nest W-14',
        body: 'The nest locates on the housing bore, not on its outside diameter — the OD carries the forming taper and is not a datum. Lower the housing straight down. Rocking it in scores the nest, and a scored nest mislocates every part after it.',
        specs: ['NEST W-14', 'LOCATE ON BORE'],
        defect: 'Housing rocked into the nest. This unit is fine; the next forty sit 0.05 mm off centre.',
        source: 'SOP-3308 §3.1, p.9 · Fixture drawing W-14-C',
      },
      {
        part: 'nest',
        short: 'Check spatter',
        title: 'Check the nest for spatter before every part',
        body: 'Look into the nest, not at it. Spatter from the previous weld collects at the base of the locating boss where it is invisible from above, and a bead of spatter under the housing tips the whole part out of perpendicular.',
        specs: ['EVERY PART', 'BASE OF BOSS'],
        defect: 'Spatter under the housing. The weld runs deep on one side and cold on the other, and both halves of that are wrong.',
        source: 'SOP-3308 §3.2, p.10',
      },
      {
        part: 'collar',
        short: 'Seat collar',
        title: 'Seat the collar by hand',
        body: 'The collar drops onto the land under its own weight. If it needs pressure it is either the wrong revision or the land is not clean — stop and go back two steps. Never press it home; a pressed collar hides the very gap the next step measures.',
        specs: ['NO PRESS', 'DROPS UNDER OWN WEIGHT'],
        defect: 'Collar pressed onto a contaminated land. The gap gauge now reads correct and the joint still has oil in it.',
        source: 'SOP-3308 §3.4, p.11 · CAD body COLLAR-7712',
      },
      {
        part: 'collar',
        short: 'Set clamp',
        title: 'Set the clamp to 180 N and confirm the readout',
        body: 'Clamp force holds the joint closed against weld shrinkage. Too little and the gap opens as the weld cools; too much and the collar deforms and the gap closes unevenly. Confirm the number on the readout — the clamp holds its last setting and the last setting was for a different part.',
        specs: ['180 N ±10', 'CONFIRM READOUT'],
        defect: 'Clamp left at the previous job’s 340 N. The collar deforms, the joint closes on one side, and the weld tracks the deformation.',
        source: 'SOP-3308 §3.5, p.12 · Clamp profile CL-03',
      },
      {
        part: 'collar',
        short: 'Gauge gap',
        title: 'Verify the joint gap all the way round',
        body: 'Run the 0.05 mm feeler at four points, ninety degrees apart. The gap must be closed at every one. Checking a single point tells you the joint is closed where you happened to look, which is exactly where it is closed on a part that is tipped.',
        specs: ['0.05 mm NO-GO', 'FOUR POINTS'],
        defect: 'Gap checked at one point on a tipped part. The weld opens on the far side as it cools.',
        source: 'SOP-3308 §3.6, p.13 · Gauge set FG-05',
      },
      {
        part: 'nest',
        short: 'Release',
        title: 'Release to the weld cell and sign the traveller',
        body: 'The traveller records the housing lot, the collar lot and the nest ID. The nest ID is the one people skip, and it is the one that matters when a batch comes back — without it there is no way to tell whether a defect followed the parts or followed the fixture.',
        specs: ['RECORD NEST ID', 'BOTH LOTS'],
        defect: 'Traveller signed without the nest ID. A fixture-caused defect becomes untraceable and the investigation blames the material.',
        source: 'SOP-3308 §4.1, p.15 · Traveller form TR-22',
      },
      { part: 'collar', short: 'Knowledge check', check: true },
    ],
    checks: [
      {
        part: 'housing',
        q: 'You are three parts into a run when you notice the tote label says Rev 4 but the housing in your hand is stamped Rev 3. What do you do?',
        answers: [
          { text: 'Trust the tote label — it is the controlled document.', ok: false, fb: 'It is not. Totes are re-used and re-labelled; the stamp on the part is the controlled identity. This is why the step says read the part.' },
          { text: 'Stop the run, quarantine the tote, and check the three already built.', ok: true, fb: 'Correct. The mixed tote is the immediate problem and the three parts already through are the expensive one — a Rev 3 land welds to a Rev 4 collar without complaint.' },
          { text: 'Set the Rev 3 parts aside and carry on with the Rev 4 ones.', ok: false, fb: 'That handles the parts you can see and ignores the three already welded, which are the ones nobody will look at again.' },
        ],
      },
      {
        part: 'collar',
        q: 'The collar will not drop onto the land under its own weight. What is the right move?',
        answers: [
          { text: 'Press it home and confirm with the gap gauge.', ok: false, fb: 'Pressing produces a correct gauge reading on a joint that may still be contaminated. The gauge cannot see why the collar was tight.' },
          { text: 'Go back and re-check the revision and the land.', ok: true, fb: 'Correct. A collar that needs force is telling you something upstream is wrong — wrong revision, or a land that is not clean. The resistance is the signal.' },
          { text: 'Rotate the collar and try seating it again.', ok: false, fb: 'Reasonable instinct, and it does nothing here: the land is circular, so orientation is not the variable. Something upstream is.' },
        ],
      },
      {
        part: 'nest',
        q: 'A batch comes back from the weld cell with joints that ran deep on one side. The parts and both lots check out. What record makes this diagnosable?',
        answers: [
          { text: 'The solvent lot log from the degrease step.', ok: false, fb: 'Contamination shows as porosity, not as a joint that runs deep on one side consistently. That pattern is geometric.' },
          { text: 'The nest ID on the traveller.', ok: true, fb: 'Correct. A one-sided depth pattern means the part sat tipped, which points at the fixture — and without the nest ID recorded there is no way to show the defect followed the fixture rather than the material.' },
          { text: 'The clamp force readout for each unit.', ok: false, fb: 'Worth having, and it would show a uniform error rather than a one-sided one. Deep on one side is the part sitting tipped.' },
        ],
      },
    ],
  },

  {
    code: '9930-05',
    name: 'Final Leak Test',
    rev: 'Rev 7',
    sop: 'SOP-5010',
    cell: 'Line 3 · Test bay',
    meta: '4 steps · Rev 7 · not authored in this sample',
    readiness: 0.78,
    tag: 'partial',
    authored: false,
  },
  {
    code: 'DRAFT',
    name: 'Sterile Barrier Pouching',
    rev: '—',
    sop: '—',
    cell: '—',
    meta: 'Storyboard only — not authored',
    readiness: 0.15,
    tag: 'draft',
    authored: false,
  },
];

export const moduleByCode = (code) => MODULES.find((m) => m.code === code);

/** The authoring storyboard. Nothing here runs — see app.js for the notice. */
export const INPUTS = [
  { kind: 'PDF', name: 'SOP-4471 Rev 12.pdf', size: '2.4 MB' },
  { kind: 'IMG', name: 'station-photos (48)', size: '96 MB' },
  { kind: 'CAD', name: '8841-02-assy.step', size: '14 MB' },
];

export const STAGES = [
  'Parse SOP text into discrete operations',
  'Match photos to operations',
  'Tessellate CAD bodies, map to parts',
  'Extract specs, tolerances, defect modes',
  'Draft knowledge checks',
];

/**
 * Readiness figures. Deltas compare two points in THIS sample series — they
 * are not before/after claims about a deployment, because there has not been
 * one. See the file header.
 */
export const KPIS = [
  { label: 'TIME TO FIRST GOOD UNIT', value: '4.1 d', note: 'sample series · 5.0 d at Rev 10', good: true },
  { label: 'DEFECT ESCAPES / 10K', value: '12', note: 'sample series · 20 at Rev 10', good: true },
  { label: 'STEPS BELOW READINESS', value: '3', note: 'seal ring, torque, weld land' },
  { label: 'OPERATORS CERTIFIED', value: '41 / 47', note: '6 pending re-cert' },
];

export const OPERATORS = [
  { name: 'Operator 01', tenure: '4 y · Line 3', readiness: 0.96, tag: 'Certified', tone: 'good' },
  { name: 'Operator 02', tenure: '7 mo · Line 3', readiness: 0.71, tag: 'Re-serve seal step', tone: 'watch' },
  { name: 'Operator 03', tenure: '3 w · onboarding', readiness: 0.34, tag: 'In training', tone: 'idle' },
  { name: 'Operator 04', tenure: '11 y · floor lead', readiness: 0.99, tag: 'Certified', tone: 'good' },
  { name: 'Operator 05', tenure: '2 mo · Line 2', readiness: 0.58, tag: 'Decay flagged', tone: 'bad' },
];

export const READINESS_NOTE =
  'Readiness decays. A step nobody has run in ninety days is a step the line has quietly forgotten — the module re-serves it before the defect does.';
