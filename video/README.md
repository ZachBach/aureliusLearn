# video

The demo reel and the raw screen takes it is cut from.

**Everything here except this file is gitignored, deliberately.** The two raw
takes are ~90 MB together, nothing regenerates them but recording again, and
that makes them backup's problem rather than history's. Same rule echoGalaxy
uses, and for the same reason.

It also matters *where* they live. `tools/deploy.mjs` copies `src/` into the
site wholesale, so a take left under `src/` is a 56 MB file on the Vercel
deploy. That is how these ended up here.

## What is in here

| | | |
| --- | --- | --- |
| `Video Project.mp4` | 1920x1080, 1640 frames | take A — Train through Readiness, one pass |
| `2026-09-08 14-05-22.mp4` | 1280x720, 2332 frames | take B — the re-record that added Library and Build |
| `aurelius-learn-demo.mp4` | 1920x1080, 55s | the reel. Rebuild it with `node tools/video.mjs` |

If a take is missing, `tools/video.mjs` says which one and stops. It does not
guess.

## The cut

`tools/video.mjs` holds the cut list and the reasoning — read its docblock
before changing a frame number. The short version: the reel walks the sidebar
top to bottom, Library then Train then Build then Readiness, because that is
the app's own ordering and it is the only structure a viewer with no narration
can follow. The takes do not run in that order.

Both takes were recorded on an unactivated Windows and carry an "Activate
Windows" watermark. It is scrubbed by luma threshold rather than painted over,
because the mouse pointer crosses the same box and a painted box eats it.

## If you re-record

Record at **1920x1080**. Take B is 720p, which is exactly two thirds, so the
layout matches and the splices land — but Library and Build are visibly softer
than the rest of the reel. A 1080p re-record of those two views, dropped in
here with the frame numbers updated, is the one thing that would make this
better.
