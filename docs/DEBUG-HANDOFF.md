# SnowVR — Session Handoff (2026-07-30)

Untracked scratch file. Delete when the work below is finished.

---

## THE ACTIVE BUG — snow deformation is invisible

**Symptom (user, in headset):** carving and spell deformation cannot be seen at
all. The snow surface reads as flat.

**Decisive evidence from the user:** *"controller is driving the brush. motion
changes as if there is snow deformation. it's like the snow on top of the floor
is invisible."*

The rider's **physics responds correctly** to trenches and mounds. That means:

| Stage | Status |
| --- | --- |
| Controller writes `brushRef` | ✅ working |
| `RideableDeformationField` CPU mirror accumulates | ✅ working (physics proves it) |
| GPU deformation FBO → visible displacement/shading | ❌ **BROKEN — this is the bug** |

So the brush maths is fine and the failure is entirely GPU-side: either the
deformation simulation pass is not writing to the ping-pong target, or the snow
shader is not reading it.

**Do not start changing lighting constants.** The lighting was already
rebalanced this session and the user confirmed the penguin and overall look are
fine. This is a deformation-pipeline bug, not a shading one.

### Diagnostic instrumentation is ALREADY IN PLACE

`src/snow/SnowTerrain.tsx` has a temporary block marked
`// TEMP DIAGNOSTIC — remove before commit`. Once per second it logs:

```
[snowdiag] depth … ice … affects … pos … r … | cpuOffset … | gpuRGBA … | xrPresenting …
```

`gpuRGBA` is a `readRenderTargetPixels` readback of the deformation FBO at the
brush's own texel. **That single value settles the bug:**

- `gpuRGBA` all zeros → the sim pass is not executing or not writing. Prime
  suspect: `withPreservedRenderTarget` in `src/rendering/renderTargetState.ts`
  and WebXR camera substitution. This exact class of bug was fixed twice in v0.1
  (commits `a453616`, `53332cb`, `af48705`) — read those diffs first.
- `gpuRGBA` has real values → the buffer is correct and the fault is in
  `src/snow/SnowMaterial.ts` reading `uDeformationMap`.

Note `readRenderTargetPixels` may throw on a `HalfFloatType` target read into a
`Float32Array`; if `gpuRGBA` reports `err:…`, switch the readback to a
`Uint16Array` or temporarily set the target to `FloatType` to get the value.
That error is diagnostic noise, not the bug.

### SESSION 2 FINDINGS (2026-07-30, second session) — READ THIS FIRST

**The diagnostic had never actually been read.** Three separate instrumentation
faults were found and fixed before any measurement could be trusted. Do not
repeat these.

1. **`console.log` does NOT reach `adb logcat` on Quest Browser.** The whole
   buffer contained zero `INFO:CONSOLE` lines. The logcat recipe in the
   ENVIRONMENT section below cannot ever surface `[snowdiag]`. Use the Chrome
   DevTools Protocol instead:

   ```
   "$ADB" shell cat /proc/net/unix | grep devtools   # confirm socket exists
   "$ADB" forward tcp:9222 localabstract:chrome_devtools_remote
   curl -s http://localhost:9222/json/list           # find the target
   ```
   Then attach a WebSocket to `webSocketDebuggerUrl` and listen for
   `Runtime.consoleAPICalled`. This does not reload the page or eject the user.
   Working scripts were written to the session scratchpad (`cdp.mjs`,
   `probe.mjs`); they are throwaway, ~40 lines each, trivial to rewrite.

2. **`Runtime.enable` replays Chrome's buffered console history.** It is
   byte-identical to live output and has no timestamps. Two full captures were
   analysed before the replay was spotted — the tell was that a second capture
   reproduced the first one line for line, *including the old format string
   after an HMR edit had changed it*. **Discard everything for ~2.5 s after
   enabling, then treat only later messages as live.**

3. **The single-texel readback probe had a row-flip bug.** `py` was already
   computed bottom-origin, then read at `1023 - py` — it sampled the mirrored
   row. Its `gpuRGBA 0.000,0.000,0.000,0.000` therefore proves NOTHING. It has
   been replaced with a whole-FBO max scan (`maxR … maxG … at x,y`), which is
   immune to the convention question. **That scan has not yet produced a live
   reading. Getting one is the next step.**

**What IS confirmed** (from the replayed history, which is still valid data —
it was real output, just not current):

- Brush input is live and large: `depth` up to 4.500, `ice` up to 2.000,
  `affectsRide true` during spells.
- The CPU mirror accumulates correctly: `cpuOffset` up to 1.9768 / -1.2000.
- `xrPresenting true` throughout.
- So the pipeline is confirmed good up to the GPU boundary, exactly as the
  original triage said. The GPU side remains unmeasured.

**Hypothesis 2 is DEAD — ruled out by static reading.** `SnowMaterial.ts`
still displaces geometry: `displacedPosition.z += naturalHeight + deformHeight`
(the vertex shader, immediately after `sampleDeformationHeight`). Task 11 did
not reduce displacement to normals-only. Remaining live hypotheses are 1, 3, 4.

**NEW BLOCKER, unresolved — find out which tab the headset is presenting.**
During live capture, *neither* SnowVR tab emitted any console output, and both
reported no `window.requestAnimationFrame` callback within 1.2 s:

| target | url | result |
| --- | --- | --- |
| 167 | `http://localhost:5174/SnowVR/` (dev, HMR) | visible, no rAF, no live logs |
| 166 | `https://boxwrench.github.io/SnowVR/` (**production**) | visible, no rAF, no live logs |
| 149–159, 165 | stale `:4173` preview / TideVR tabs | frozen, CDP timeout |

`rafMs -1` is expected during an immersive session (an XR session drives
`XRSession.requestAnimationFrame`, not the window one), so that alone is not
alarming. The silence is. **Before trusting any further measurement, confirm
with the user which tab they are actually in.** If they are in tab 166, the
deployed production build, then no HMR edit from either session ever reached
the headset and everything observed in-headset came from an old bundle — which
would be a far simpler explanation for "the fix didn't work" than any GPU bug.
Eight stale SnowVR tabs are open; closing them first would remove the ambiguity.

### Ranked hypotheses (untested)

1. **XR camera substitution breaks the offscreen sim pass.** `SnowDeformationBuffer.update`
   renders through `withPreservedRenderTarget`, which toggles `renderer.xr.enabled`.
   Historically fragile. Test by checking whether deformation IS visible on the
   desktop browser but NOT in an immersive session — that comparison alone
   confirms or kills this hypothesis and costs nothing.
2. **Task 11's gradient precompute (`90ef277`) broke the vertex shader.** It
   rewrote the neighbour-sampling block in `SnowMaterial.ts`. Height displacement
   at `displacedPosition.z += naturalHeight + deformHeight` should be untouched,
   but verify `sampleDeformationHeight` is still applied to the vertex position
   and not only to the normal. **If displacement was accidentally reduced to
   normals-only, the surface would be geometrically flat while physics still
   worked — which matches the symptom exactly.** Check this second; it is the
   best fit for the reported behaviour.
3. **Task 10's idle gate (`e76caef`).** In `SnowDeformationBuffer.update`,
   `hasBrushInput = brushDepth !== 0 || brushIce !== 0 || brushWetness !== 0`.
   Should pass while riding, so this is unlikely — but it is also the newest code
   touching that path.
4. `UniformsUtils.merge` in `createSnowMaterial` mishandling `uDeformationMap`.
   Least likely; the assignment happens every frame in `SnowTerrain`.

Follow `superpowers:systematic-debugging`. Get the evidence before any fix.

---

## ENVIRONMENT — read before touching the headset

**Quest 3 is connected and authorized.** `adb` is NOT on PATH. Use the full path:

```
ADB="/c/Users/wests/OneDrive/Desktop/GAMES/adb/platform-tools/adb.exe"
"$ADB" devices -l          # expect 2G0YC5ZG0M052K … device
"$ADB" reverse tcp:5174 tcp:5174
"$ADB" logcat -c           # clear before capturing
"$ADB" logcat -d | grep -oE "\[snowdiag\].*" | tail -12   # ← DOES NOT WORK
```

**The `logcat` line above is wrong** — page `console.log` is not forwarded to
logcat by Quest Browser. See SESSION 2 FINDINGS for the CDP method that does
work. logcat is still useful for GPU driver errors (`GL ERROR`) and for
`cr_VrShellDelegate` session events.

**NEVER use `adb shell am start` to reload the page.** It relaunches the browser
and ejects the user from VR (`cr_VrShellDelegate: enterVRHelper false` in
logcat). Vite HMR applies edits automatically with the session intact. Launching
the intent once at the very start is fine; after that, just edit files.

Dev server: `npm run dev` → `http://localhost:5174/SnowVR/` (run it backgrounded).
`gh` CLI is **not installed** on this machine.

The user is wearing the headset and iterating live. Keep changes small and tell
them what to look for.

---

## REPO STATE

Branch: **`agent/optimized-penguin-v02`** at `37f35e5`, off `main` (`d33be81`, the
v0.2.0 release).

### Committed on this branch
- `37f35e5 feat(character): integrate optimized ski penguin` — adds
  `public/models/peng.glb` and rewrites `src/character/SkiPenguinCharacter.tsx`.

### UNCOMMITTED, and they are three unrelated concerns — split them

1. **Penguin tuning** — `src/character/SkiPenguinCharacter.tsx`
   `PENGUIN_YAW 0` (sideways snowboard stance) and `PENGUIN_SCALE 1.55`.
   **User confirmed this looks right.** Safe to commit onto this branch.

2. **v0.2 lighting rebalance** — `src/App.tsx`, `src/snow/SnowMaterial.ts`
   - `toneMappingExposure` 1.15 → 0.95
   - snow ambient 0.42 → 0.28, direct 1.05 → 0.85
   - `cavityAo` now multiplies the **whole** lighting sum, not just ambient.
     The v0.2.0 release commit `6dcf8a7` had rewritten the composite and left
     occlusion on the ambient term only, so trenches could not read under sun.

   This is v0.2 work, not penguin work. It belongs on its own branch off `main`.

3. **XR spell panel repositioning** — `src/xr/XRStatusPanel.tsx`
   Was a camera-facing sprite at rider +2.5 up / +1.45 across, 2.7 wide, with
   `depthTest={false}`, sitting in the forward sightline. Now +0.9 up / +2.6
   across at 2.0 wide. **User has not confirmed this yet — ask.**

4. **TEMP DIAGNOSTIC** — `src/snow/SnowTerrain.tsx`. Must be removed before any
   commit of that file.

### Other branches
- `fix/deformation-suspension-desync` at `90e9d3f` — **unmerged and needed.**
  v0.2.0 on `main` gates only the GPU deformation pass on idle while the CPU
  collision mirror keeps decaying, so after a long idle you see a trench that is
  no longer there to ride. Fix moves the gate up to `SnowTerrain`, which owns
  both consumers. Validated: 93 tests, typecheck, build.
- `feat/v0.2-visual-fidelity` — merged into main, historical.

---

## OUTSTANDING, once the bug is fixed

1. Remove the temp diagnostic from `SnowTerrain.tsx`.
2. Commit the penguin tuning to `agent/optimized-penguin-v02`.
3. Push that branch and open a **draft PR** into `main` titled
   `feat(character): integrate optimized ski penguin`. Body: preserves the v0.2
   snowboard, bindings, spell-coloured rails, motion, controller integration and
   contact shadow; replaces only the procedural rider with the approved
   optimized GLB. Known limitations: the GLB has **no skeleton**, so all motion is
   whole-body (lean + speed crouch); and it is a feet-together pose while the
   bindings sit at z = ±0.45, so the rider stands between them rather than in
   them. `gh` is not installed — use the web UI.
4. Land the lighting rebalance and the desync fix on `main` as their own PRs.
5. Device gates never run despite v2.0.0 shipping: the three-scene benchmark
   (target p95 < 13.5 ms), the controller gate, and the endless-run gate — all in
   `docs/DEVICE_TESTING.md` and `docs/superpowers/plans/2026-07-29-v0.2-visual-fidelity.md`.
   The penguin is ~71 draw calls and is the largest addition in the release.

## HARD RULES

- Never `git add -A`, `git add .`, or `git commit -a`. Explicit paths only.
- `npm run validate` (typecheck + vitest + build) before every commit. 93 tests
  currently pass.
- Imports are extensionless. Do not create a module whose name differs from a
  sibling only by case — `atmosphere.ts` beside `Atmosphere.tsx` broke the build
  earlier this session; the module is now `atmosphereConfig.ts`.
- Do NOT reduce the deformation FBO below 1024² or terrain tessellation below
  256². Both are explicitly excluded in the v0.2 plan — they degrade the carve
  trail, which is the project's whole point. The user called the deformation
  effect "the whole gimmick".
