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
    code: 'MOTOR-01',
    name: 'Electric Motor Assembly',
    rev: 'Illustrative',
    sop: 'DEMO-ONLY',
    cell: 'Learning module · electric motor',
    meta: '10 assembly steps · 3 knowledge checks · illustrative',
    readiness: 0.42,
    tag: 'draft',
    authored: true,
    stack: [
      'motor_housing', 'motor_stator', 'motor_windings', 'motor_rotor',
      'motor_drive_bearing', 'motor_non_drive_bearing',
      'motor_drive_endbell', 'motor_non_drive_endbell', 'motor_fan', 'motor_guard',
    ],
    steps: [
      {
        part: 'motor_housing',
        short: 'Identify parts',
        title: 'Start with the exploded assembly and identify each part',
        body: 'Use the part labels and exploded view to identify the housing, stator core, winding pack, rotor and shaft, two bearings, end bells, fan and guard. This is a learning model of a small electric motor, not a controlled work instruction.',
        specs: ['LEARNING MODEL', 'NOT A SHOP SOP'],
        defect: 'Starting with an unidentified or mismatched component can make later fit checks meaningless.',
        source: 'Illustrative sequence · no controlled drawing or work instruction supplied',
      },
      {
        part: 'motor_housing',
        short: 'Place housing',
        title: 'Use the housing as the reference body',
        body: 'Locate the cylindrical housing in the center of the view. The stator and winding pack fit within its bore; the end bells close its ends. Orbit the model and use Explode to see the nested relationships before continuing.',
        specs: ['REFERENCE BODY', 'CHECK THE BORE'],
        defect: 'Treating an exploded position as a separate radial alignment can obscure which parts share the motor axis.',
        source: 'Illustrative geometry · dimensions are not manufacturing tolerances',
      },
      {
        part: 'motor_stator',
        short: 'Place stator',
        title: 'Align the stator core with the housing',
        body: 'Bring the laminated stator core into the housing bore. Keep its central opening visible: that opening is the path for the rotor. The viewport shows the parts concentrically when Explode is returned toward zero.',
        specs: ['CONCENTRIC TO HOUSING', 'KEEP ROTOR PATH CLEAR'],
        defect: 'A stator shown off-axis can make the rotor-to-core relationship difficult to inspect.',
        source: 'Illustrative assembly relationship · not a fit specification',
      },
      {
        part: 'motor_windings',
        short: 'Add windings',
        title: 'Place the winding pack around the stator',
        body: 'The copper-colored winding pack sits around the outside of the stator core, leaving the center bore open. Compare its position with the stator before moving on; this model represents the winding pack as one simplified component.',
        specs: ['OUTSIDE THE CORE', 'CENTER BORE REMAINS OPEN'],
        defect: 'A winding pack shown across the rotor path hides the alignment the next step is meant to illustrate.',
        source: 'Illustrative geometry · individual coils and electrical connections are not modeled',
      },
      {
        part: 'motor_rotor',
        short: 'Insert rotor',
        title: 'Pass the rotor and shaft through the stator opening',
        body: 'Center the rotor in the stator bore and keep the shaft visible at both ends. In this learning sequence, a mismatch is a prompt to inspect the model and part identities—not to force components together.',
        specs: ['SHARED CENTER AXIS', 'DO NOT FORCE'],
        defect: 'A rotor that is not centered visually can conceal interference with the stator or winding pack.',
        source: 'Illustrative sequence · no insertion-force limit supplied',
      },
      {
        part: 'motor_drive_bearing',
        short: 'Fit drive bearing',
        title: 'Locate the drive-end bearing on the shaft',
        body: 'Identify the drive end from the module labels, then place its bearing around the shaft at that end. The bearing bore and shaft are shown as matching visual features; their displayed sizes are illustrative only.',
        specs: ['DRIVE END', 'BORE AROUND SHAFT'],
        defect: 'Swapping the drive-end and non-drive-end positions makes the later end-bell and fan sequence difficult to follow.',
        source: 'Illustrative geometry · no bearing fit or installation method specified',
      },
      {
        part: 'motor_non_drive_bearing',
        short: 'Fit second bearing',
        title: 'Locate the non-drive-end bearing',
        body: 'Place the second bearing at the opposite shaft end. Compare the two bearing labels and confirm that both are represented before the end bells are brought into the assembly.',
        specs: ['OPPOSITE SHAFT END', 'BOTH BEARINGS PRESENT'],
        defect: 'Leaving out one bearing makes the illustrated rotor support incomplete.',
        source: 'Illustrative sequence · bearing selection is outside this demo',
      },
      {
        part: 'motor_drive_endbell',
        short: 'Close drive end',
        title: 'Align the drive-end bell with its bearing',
        body: 'Bring the drive-end bell to the housing end and align its center opening with the bearing and shaft. Use Explode to see the order, then reduce it to inspect the assembled relationship.',
        specs: ['DRIVE-END BELL', 'OPENINGS SHARE AN AXIS'],
        defect: 'An offset end-bell opening breaks the visual alignment through the shaft, bearing and motor core.',
        source: 'Illustrative assembly relationship · no fastening details supplied',
      },
      {
        part: 'motor_non_drive_endbell',
        short: 'Close other end',
        title: 'Align the non-drive-end bell',
        body: 'Place the matching end bell on the opposite side. Check its part label rather than assuming the two ends are interchangeable; the demo distinguishes them to teach orientation and sequence.',
        specs: ['OPPOSITE END', 'VERIFY PART LABEL'],
        defect: 'Using the wrong end label makes the next fan step appear to attach to the wrong side.',
        source: 'Illustrative sequence · end-bell interchangeability is not asserted',
      },
      {
        part: 'motor_fan',
        short: 'Add fan and guard',
        title: 'Place the cooling fan, then its guard',
        body: 'The fan is shown on the non-drive end, outside the end bell. Place the guard around the fan last so it remains visible in the exploded view. This simplified geometry illustrates order only; it is not a functional fan design.',
        specs: ['FAN OUTSIDE END BELL', 'GUARD LAST'],
        defect: 'Installing the guard before the fan obscures the intended component order in this model.',
        source: 'Illustrative geometry · rotation, airflow and guarding are not validated',
      },
      { part: 'motor_guard', short: 'Knowledge check', check: true },
    ],
    checks: [
      {
        part: 'motor_stator',
        q: 'In this illustrative assembly, where does the rotor sit relative to the stator?',
        answers: [
          { text: 'Centered through the stator opening.', ok: true, fb: 'Correct. The central stator opening and rotor share the motor axis in this model.' },
          { text: 'Outside the winding pack and beside the housing.', ok: false, fb: 'The model places the rotor through the stator opening, inside the winding pack.' },
          { text: 'Inside the fan guard at the non-drive end.', ok: false, fb: 'The fan guard is an outer end component; the rotor spans the stator.' },
        ],
      },
      {
        part: 'motor_drive_bearing',
        q: 'What should you do if the model suggests a bearing or rotor would need force to fit?',
        answers: [
          { text: 'Force the components together to complete the sequence.', ok: false, fb: 'No. This learning model provides no force limits or installation procedure; forcing a fit is not an appropriate inference.' },
          { text: 'Pause and check part identity and alignment; do not treat the demo as a fit instruction.', ok: true, fb: 'Correct. The geometry is illustrative and supplies no validated fit method or force specification.' },
          { text: 'Increase the displayed dimensions until they overlap.', ok: false, fb: 'Changing the visualization does not establish a valid fit or manufacturing tolerance.' },
        ],
      },
      {
        part: 'motor_guard',
        q: 'Which sequence does this walkthrough illustrate at the non-drive end?',
        answers: [
          { text: 'Guard, then fan, then end bell.', ok: false, fb: 'That reverses the order shown in this learning model.' },
          { text: 'End bell, then fan, then guard.', ok: true, fb: 'Correct. The guard is shown last so the fan remains visible while following the sequence.' },
          { text: 'Fan directly inside the stator bore.', ok: false, fb: 'The fan is shown outside the non-drive end bell, not inside the stator.' },
        ],
      },
    ],
  },

  /**
   * PulseMask, the studio's wearable-art design study, as a build walkthrough.
   * The eleven stages are those of the study's own assembly page, in its
   * order; the parts are illustrative profiles at the published proportions,
   * not the study's geometry engine. It is placed rather than stacked — see
   * viewport.js — because a shell with a canister under its chin and horns on
   * its temples is not a column of parts.
   *
   * The scope statement that travels with everything PulseMask travels with
   * this too: it is a decorative object, not a respirator, not PPE and not a
   * medical device. Nothing in it is a UV-C emitter, and nothing here says
   * how to fit one.
   */
  {
    code: 'PM-ASSY',
    name: 'PulseMask Build Walkthrough',
    rev: 'Illustrative',
    sop: 'pulsemask · assembly.html',
    cell: 'Wearable-art design study · not PPE',
    meta: '20 build steps · 3 knowledge checks · illustrative',
    readiness: 0.55,
    tag: 'partial',
    authored: true,
    stack: [
      'pm_face_form', 'pm_foam', 'pm_seal_bead', 'pm_pzt_seal', 'pm_cup', 'pm_shell',
      'pm_visor_gasket', 'pm_visor_lens',
      'pm_collar', 'pm_blower', 'pm_reactor', 'pm_status_band', 'pm_capsid_ring',
      'pm_filter', 'pm_coalescer', 'pm_grille',
      'pm_scale_hood', 'pm_horn_l', 'pm_horn_r', 'pm_pv_array', 'pm_crest',
      'pm_anchors', 'pm_el_wire',
    ],
    steps: [
      {
        part: 'pm_shell',
        short: 'Sort & dry-fit',
        title: 'Sort, inspect and dry-fit every part',
        body: 'Lay every printed part out in the arrangement the exploded view shows and confirm the count — a default build is thirty named meshes, and the ones found missing later are the small interior pucks. Then tape the whole thing together dry. Every joint is an interference fit by construction: sand the male face, never the female one. You are assembling a decorative wearable-art piece — not a respirator, not PPE, not a medical device.',
        specs: ['30 NAMED MESHES', 'SAND THE MALE FACE', 'NOT PPE'],
        defect: 'A support scar on the shell’s inner sealing face. It is the surface the bead beds onto, and a ridge there is a rocking seal you never chase out later.',
        source: 'pulsemask assembly.html · stage 01 · 1–2 h',
      },
      {
        part: 'pm_shell',
        short: 'Surface prep',
        title: 'Prepare the surfaces, and mask before you prime',
        body: 'SLS PA12 arrives matt and slightly porous: bead-blast, then filler-prime for anything above satin. Work up through 220, 400 and 800 grit. The armour seam grooves and the panel crowns are the design’s signature — cut them with the grain of the groove and finish by hand; a block that bridges them flattens the read. Mask every mating face, the whole inner sealing face, the gasket seat and the four anchor slots first.',
        specs: ['220 → 400 → 800', 'MASK MATING FACES', 'REAL PPE FOR SANDING'],
        defect: 'Primer plus topcoat is easily 0.2 mm of build on an unmasked joint, and none of these joints has 0.2 mm to spare.',
        source: 'pulsemask assembly.html · stage 02 · 3–5 h',
      },
      {
        part: 'pm_shell',
        short: 'Paint & finish',
        title: 'Paint and finish the shell before anything is bonded to it',
        body: 'Shell first, fully finished — nearly every later stage either covers paintable surface or blocks access to it. A Shader Lab spec code is a colour and sheen reference, not a printing instruction: shell satin at roughness 0.58, galea bronze semi-gloss at 0.34, canister alloy at 0.33. Match on a spray-out card under the light the piece will be seen in, never on a screen.',
        specs: ['SHELL #DCD6C9 · 0.58', 'BRONZE #9C7C46 · 0.34', 'SPRAY-OUT CARD'],
        defect: 'A finish matched to a monitor. Screens lie about both value and sheen, and the piece is judged under room light.',
        source: 'pulsemask assembly.html · stage 03 · 2–4 h + cure',
      },
      {
        part: 'pm_visor_gasket',
        short: 'Visor gasket',
        title: 'Seat the visor gasket from behind, while you can still reach it',
        body: 'The visor goes in early for one reason: the aperture is still reachable from inside the shell. Once the oronasal cup is in at stage 06, it is not. Gasket into the aperture first, worked from behind. Using 4.8 mm silicone cord instead of the printed gasket: cut it long, seat it around the full perimeter, butt the ends at the bottom centreline where the join reads least.',
        specs: ['FROM BEHIND', '4.8 mm CORD', 'BEFORE THE CUP'],
        defect: 'Gasket fitted after the cup. There is no longer a hand’s access to the aperture from inside, and it goes in badly or not at all.',
        source: 'pulsemask assembly.html · stage 04',
      },
      {
        part: 'pm_visor_lens',
        short: 'Visor lens',
        title: 'Cut and heat-form the lens, then seat it into the gasket',
        body: 'Cut the lens from 2.2 mm polycarbonate — never acrylic — to the rounded-hexagon aperture, tracing the printed shell rather than the mesh: the shell is the part that has to be matched, and it carries your paint now. The aperture edge curves in three dimensions, so a flat cut will not seat. Heat-form over the shell or a buck taken from it, slow and even; local overheating hazes polycarbonate permanently.',
        specs: ['2.2 mm PC', 'TRACE THE SHELL', 'SLOW EVEN HEAT'],
        defect: 'A hazed visor from a heat gun held in one place. A hazed lens is a new piece of sheet.',
        source: 'pulsemask assembly.html · stage 04 · 2–3 h',
      },
      {
        part: 'pm_collar',
        short: 'Canister collar',
        title: 'Bond the canister collar onto the chin — it sets the axis',
        body: 'The chin canister is seven parts built outward from the shell in the reverse of the direction air would travel, so each part registers against one already fixed and the grille lands last. The collar is first and it sets the axis for the six that follow: take your time squaring it. Epoxy, not cyanoacrylate — the stack cantilevers off the chin and is the piece most likely to be knocked.',
        specs: ['EPOXY', 'SQUARE IT', 'SETS THE AXIS'],
        defect: 'A collar a degree off square. Every part after it inherits the lean and the grille finishes visibly crooked.',
        source: 'pulsemask assembly.html · stage 05',
      },
      {
        part: 'pm_reactor',
        short: 'Reactor housing',
        title: 'Blower stack, then the reactor housing — and leave it empty',
        body: 'The PZT blower stack goes on the collar, then the reactor housing. It is lathed at eight segments: those flats are design, not faceting artefacts — do not sand them round. The housing is an empty printed cavity and stays that way. Never fit a UV-C emitter: there is no interlock, no shielding survey and no line-of-sight verification behind this geometry, and UV-C is a serious eye and skin hazard.',
        specs: ['8 FLATS · KEEP THEM', 'CAVITY STAYS EMPTY', 'NEVER UV-C'],
        defect: 'Flats sanded round because they looked like print artefacts. The housing loses the machined read it was drawn for.',
        source: 'pulsemask assembly.html · stage 05 · stage 10 notice',
      },
      {
        part: 'pm_status_band',
        short: 'Status band',
        title: 'Fit the status band — an indicator, not a window',
        body: 'The violet band sits around the reactor housing. It is a status indicator: there is nothing behind it to see, by design, and it should never be cut open into one. Fit it now, before the capsid ring goes on above it.',
        specs: ['NOT A WINDOW', 'BEFORE THE CAPSID RING'],
        defect: 'A band fitted after the ring above it. It no longer slides onto the housing and gets forced or split.',
        source: 'pulsemask assembly.html · stage 05',
      },
      {
        part: 'pm_filter',
        short: 'Filter stack',
        title: 'Capsid ring, filter cartridge, coalescer — outward in order',
        body: 'Three more parts up the axis: the PZT capsid ring on the housing, the filter cartridge, then the PZT coalescer. All are solid sculpt with no cavity, no electrode and no wire route. Check each one against the collar’s axis before the epoxy sets; a stack corrected at the fourth part is a stack rebuilt.',
        specs: ['CAPSID → FILTER → COALESCER', 'SOLID SCULPT', 'CHECK THE AXIS'],
        defect: 'Cyanoacrylate used on the stack. At that lever arm a CA joint is a repair waiting to happen.',
        source: 'pulsemask assembly.html · stage 05',
      },
      {
        part: 'pm_grille',
        short: 'Intake grille',
        title: 'Cap the stack with the intake grille, clocked square',
        body: 'The grille is the only piece of the canister with a visible outer face, which is why it goes on last: it can be turned to sit square with everything below it fixed. Working outward from the collar is what makes that possible.',
        specs: ['LAST ON', 'CLOCK IT SQUARE', 'VISIBLE FACE'],
        defect: 'Grille bonded early and the rest of the stack built up to it. Nothing below can be corrected against it.',
        source: 'pulsemask assembly.html · stage 05 · 2–3 h total',
      },
      {
        part: 'pm_cup',
        short: 'Oronasal cup',
        title: 'Position the oronasal cup — cup before bead, always',
        body: 'The cup is the thinnest structural part in the set at a 1.8 mm wall, and it has to be positioned against the shell’s inner surface while there is still clear access to both. Once the bead is in, there is not.',
        specs: ['1.8 mm WALL', 'CUP BEFORE BEAD', 'CLEAR ACCESS'],
        defect: 'Bead fitted first. The cup then has to be threaded past it and cannot be seated against the shell.',
        source: 'pulsemask assembly.html · stage 06',
      },
      {
        part: 'pm_seal_bead',
        short: 'Seal bead',
        title: 'Fit the seal bead — this part exists to be soft',
        body: 'An 8.4 mm section tube on the 548 mm rim path. If it printed rigid, treat the print as a pattern: pull a silicone mould and cast the real one, or face it with foam at stage 09. A rigid bead against a face is the difference between a piece worn for an evening and one taken off after ten minutes. The generator’s fit heatmap colours the bead by penetration into a face reconstructed from a photograph, with the bead placed at a fixed offset from it — a green heatmap is a drawing agreeing with itself, not a measured seal.',
        specs: ['8.4 mm SECTION', '548 mm RIM', 'HEATMAP ≠ SEAL'],
        defect: 'A rigid printed bead worn as-is. The piece sits on a shelf because nobody can wear it for long.',
        source: 'pulsemask assembly.html · stage 06',
      },
      {
        part: 'pm_pzt_seal',
        short: 'PZT pucks',
        title: 'Seat the six seal-sensor pucks into the bead',
        body: 'The PZT seal sensors go in last, seated into the bead at their modelled positions. They are sculpt: solid ceramic-look parts with no cavity, no electrode and no wire route. There is no telemetry behind them in a physical build.',
        specs: ['×6', 'MODELLED POSITIONS', 'SCULPT ONLY'],
        defect: 'Pucks glued before the bead is final. They end up mislocated once the bead is re-seated.',
        source: 'pulsemask assembly.html · stage 06 · 2–3 h total',
      },
      {
        part: 'pm_scale_hood',
        short: 'Scale hood',
        title: 'Lay the scale hood, row by row from the rim upward',
        body: 'Only if the tier includes the Galea layer. Around 160 plates at roughly 11 × 11 mm, alternate rows offset half a column, each plate overlapping the one below like roof tiles. The armour is generated in place on the shell, so if the slicer handed the plates over loose, re-import the full set and use it as a placement reference rather than eyeballing. This is the long stage; it is worth its own evening.',
        specs: ['~160 PLATES', 'ROWS FROM THE RIM', 'ROOF TILES'],
        defect: 'Rows laid from the crown down. Each plate then sits under the one below it and the hood reads backwards.',
        source: 'pulsemask assembly.html · stage 07 · 3–6 h',
      },
      {
        part: 'pm_horn_l',
        short: 'Solar horns',
        title: 'Epoxy the solar horns at the temples',
        body: 'From the temples, curving up and back. Epoxy — they are the longest lever arm on the piece. The horn bore is drawn at about 11 mm at the base and in the design carries a pouch cell; in a physical build the horns are solid sculpt and carry nothing.',
        specs: ['EPOXY', 'LONGEST LEVER ARM', 'SOLID SCULPT'],
        defect: 'Cyanoacrylate at the temple joint. The first knock takes the horn off and a patch of paint with it.',
        source: 'pulsemask assembly.html · stage 07',
      },
      {
        part: 'pm_pv_array',
        short: 'PV panels',
        title: 'Bond the fourteen PV panels to the horns’ outboard faces',
        body: 'Seven per horn on the outboard face. Cosmetic sculpt: no cells, no wiring, no charge. In the design study the array would extend runtime and not replace the pack; on the bench it is a row of dark plates and nothing more.',
        specs: ['7 PER HORN', 'OUTBOARD FACE', 'NO CELLS'],
        defect: 'Panels bonded to the inboard face where they cannot be seen. Cosmetic sculpt on the wrong side is cosmetic sculpt wasted.',
        source: 'pulsemask assembly.html · stage 07',
      },
      {
        part: 'pm_crest',
        short: 'Crest & EL wire',
        title: 'Seat the crest keel on the crown centreline, then thread the EL wire',
        body: 'The keel sits on the crown centreline. The antenna meander along it is millimetre-scale detail; if it did not survive the print, the keel reads fine without it. EL wire is threaded through the seam channels last, after everything it routes around is fixed — runs break wherever they would cross an aperture, so follow the channels rather than trying to make one continuous loop.',
        specs: ['CROWN CENTRELINE', 'ANTENNA OPTIONAL', 'EL WIRE LAST'],
        defect: 'EL wire threaded before the scales and horns. It gets glued under them and cannot be replaced.',
        source: 'pulsemask assembly.html · stage 07',
      },
      {
        part: 'pm_anchors',
        short: 'Anchors & harness',
        title: 'Bond the four strap anchors and thread a four-point harness',
        body: 'Anchors at 16°, 164°, 206° and 334° around the rim, each leaving a clear slot of roughly 20 × 6.6 mm — 20 mm webbing is the practical ceiling. Epoxy: they carry the entire weight of the piece and are the joint most likely to fail in use. Two lower straps below the occiput, two uppers meeting in an over-crown strap. Set the lowers with the piece held level, then take up the uppers until it stops rotating. Never tighten to compress the bead.',
        specs: ['EPOXY', '20 mm WEBBING', 'OVER-CROWN STRAP'],
        defect: 'No crown strap. Mass sits forward in the chin stack, so a two-point harness rotates the whole piece down the face.',
        source: 'pulsemask assembly.html · stage 08 · 1–2 h',
      },
      {
        part: 'pm_foam',
        short: 'Foam facing',
        title: 'Face the bead with closed-cell foam — the stage everyone skips',
        body: 'Cut foam to the 548 mm rim path and face the bead with it, two to four millimetres. Bare printed nylon on skin goes from fine to intolerable in about fifteen minutes, and it is the most common reason a finished build sits on a shelf. Double up at the bridge of the nose and the point of the chin — where the reconstructed surface is least reliable and all the pressure concentrates.',
        specs: ['2–4 mm', 'NOSE + CHIN ×2', 'WIPE AFTER EVERY WEAR'],
        defect: 'Foam skipped, straps tightened to make the bead seal instead. The seal is decorative; the pressure lands on the cheekbones.',
        source: 'pulsemask assembly.html · stage 09 · 1 h',
      },
      {
        part: 'pm_el_wire',
        short: 'Lighting',
        title: 'Optional lighting — visible spectrum only',
        body: 'EL wire in the seam channels, or ordinary visible LEDs behind the status strip and indicator band. There is no wire route, no cavity and no driver bay anywhere in the geometry; any cavity you need, you cut yourself, before paint if you can plan that far ahead. Not UV-C, not ever: nothing sold with this design includes or supports emitters, drivers or batteries.',
        specs: ['EL WIRE / VISIBLE LED', 'CUT CAVITIES PRE-PAINT', 'NOT UV-C. NOT EVER.'],
        defect: 'A UV-C emitter fitted in the reactor cavity. A documented eye and skin hazard millimetres from the face, inside a part never tested to contain it.',
        source: 'pulsemask assembly.html · stage 10 · 2–4 h',
      },
      {
        part: 'pm_shell',
        short: 'Final pass',
        title: 'Final pass before it leaves the bench',
        body: 'Run a fingertip around the visor aperture and the rim and break any edge sharp enough to notice. Hang the piece by the harness and let it settle — anything that shifts is a joint that has not cured or seated. Check for adhesive wicked onto the visor; there will be some. Photograph it before wearing it: assembly marks show up fast and the first hour is the best the finish will ever look. Wear it in short spells, never where peripheral vision matters, and never for protection of any kind.',
        specs: ['BREAK EVERY EDGE', 'HANG TEST', 'SHORT WEARS'],
        defect: 'Worn where a real respirator is needed. It feels like protection and provides none — more dangerous than wearing nothing.',
        source: 'pulsemask assembly.html · stage 11 · fitting · care',
      },
      { part: 'pm_grille', short: 'Knowledge check', check: true },
    ],
    checks: [
      {
        part: 'pm_grille',
        q: 'The chin canister is seven parts. In what order do they go onto the shell?',
        answers: [
          { text: 'Grille first, then inward toward the collar, so the visible face is set early.', ok: false, fb: 'That fixes the one visible face before anything it has to sit square on exists. Nothing below it can be corrected afterwards.' },
          { text: 'Collar first, then outward in reverse airflow order, grille last.', ok: true, fb: 'Correct. Each part registers against one already fixed, and the grille — the only visible outer face — lands last and can be clocked square.' },
          { text: 'Reactor housing first, since it is the largest, then everything else around it.', ok: false, fb: 'The housing has nothing to register against until the collar sets the axis. The collar is the datum for all six that follow.' },
        ],
      },
      {
        part: 'pm_anchors',
        q: 'Which joints take two-part epoxy rather than cyanoacrylate?',
        answers: [
          { text: 'None — CA with accelerator is faster and the piece is not load-bearing.', ok: false, fb: 'Two joints carry real load: the canister stack cantilevers off the chin, and the anchors carry the entire weight of the piece.' },
          { text: 'The canister stack and the strap anchors — the joints that carry load.', ok: true, fb: 'Correct. The stack is the piece most likely to be knocked and sits at a lever arm; the anchors are the joint most likely to fail in use. Both get epoxy. The horns too.' },
          { text: 'Every joint — epoxy is stronger, so use it everywhere.', ok: false, fb: 'Epoxy on the gasket and the small interior parts is slow, messy and unnecessary. Flexible CA for the gasket, CA for small parts, epoxy where load lives.' },
        ],
      },
      {
        part: 'pm_reactor',
        q: 'The reactor housing is an empty printed cavity. What goes in it?',
        answers: [
          { text: 'A UV-C LED ring, on a hard interlock, once the housing is sealed.', ok: false, fb: 'Never. There is no interlock, no shielding survey and no line-of-sight verification behind this geometry. UV-C is a serious eye and skin hazard and nothing about this piece is tested to contain it.' },
          { text: 'Nothing. It stays empty; any lighting is visible EL wire or LEDs, elsewhere.', ok: true, fb: 'Correct. The cavity is drawn enclosed so it can be drawn at all. Lighting on a physical build is visible-spectrum only, in the seam channels and behind the indicator band.' },
          { text: 'A filter pad, so the piece offers some protection when worn.', ok: false, fb: 'It offers no protection with or without one, and must never be worn as if it did. It is untested to any respirator standard and is sold as art.' },
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
