# {{PROJECT_NAME}} — Tech Demo · Implementation Brief

You are the sole engineer and technical artist on a real-time graphics tech demo. Build it end to end. This document is the spec, the art direction, and the acceptance criteria.

## 0. Prime Directive

Visual quality is the product. There is no gameplay loop, no progression, no UI to design around. A player will load this, walk around {{PRIMARY_ENVIRONMENT}} for ninety seconds, {{CORE_INTERACTION_SENTENCE}}, and either think "this is AAA" or close the tab. Everything below serves that single judgment.

Two rules that override everything else in this document:

If a requirement in this brief conflicts with making the demo more beautiful, break the requirement. Note the deviation in DECISIONS.md with a one-line rationale. You have full authority to change scope, swap techniques, or drop a feature that isn't paying for its pixels.

Anything that reads as low-poly, flat-shaded, untextured, placeholder, or "indie prototype" is a defect, not a stepping stone. If you can't make a thing look finished, cut it from the frame rather than ship it looking rough.

Do not stop at "it works." Stop when every captured frame looks polished, cohesive, and production-ready.

---

## 1. Stack and Hard Constraints

| Concern        | Spec |
|----------------|------|
| Language        | Modern JavaScript (ES2023 modules). JSDoc types encouraged, no TypeScript build step required. |
| Engine          | {{ENGINE — default: Babylon.js latest stable, WebGPU only}} |
| Shader Language | {{SHADER_LANG — default: WGSL}} |
| Bundler         | Vite |
| Target          | {{TARGET_BROWSER_AND_HARDWARE — e.g., Chrome stable on Windows 11, RTX 5070 Ti, 2560x1440}} |
| Frame target    | 90 FPS sustained. 60 FPS floor. |
| Frame time      | No frame exceeding median + 4 ms after the loading screen dismisses. |

No fallbacks. No WebGL path, no mobile path, no feature detection branches. If `navigator.gpu` is absent, show a single line of text and stop. Do not spend a minute on compatibility.

**Assets.** {{ASSET_STRATEGY}}

---

## 2. Systems

### 2.1 Terrain

{{TERRAIN_PHILOSOPHY_SENTENCE}}

Build a geometry clipmap or nested-ring LOD centred on the player, so triangle density is high near the camera and falls off with distance. Aim for roughly sub-10 cm vertex spacing in the inner ring at default zoom.

Height comes from layered procedural noise composited on the GPU: {{TERRAIN_NOISE_LAYERS}}.

{{TERRAIN_LANDMARKS}}

The far field needs {{FAR_FIELD_TREATMENT}}. The proven approach is a raymarched heightfield in the sky shader — with analytic normals, ridge-on-ridge occlusion, a sun-direction march for cast shadows, and the same material logic and atmosphere as the near field — so near and far terrain meet at one consistent colour rather than reading as composited layers. A simpler impostor ring is acceptable only if it achieves the same visual continuity.

### 2.2 {{PRIMARY_MATERIAL_NAME}} Shading

This shader is the most important code in the project. Budget accordingly.

Build a custom material using {{ENGINE}}'s ShaderMaterial, a PBRCustomMaterial plugin, or an equivalent approach. Use {{SHADER_LANG}} through NodeMaterial or raw shader code, not a stock PBR material with a {{NAIVE_DEFAULT}} albedo.

**Required behaviours:**

{{MATERIAL_BEHAVIOURS}}

Build the material's core lighting response as a shared shader include (e.g., `lib/{{PRIMARY_MATERIAL_NAME}}Lighting.{{SHADER_LANG_EXT — default: wgsl}}`) that every surface in the scene imports — terrain, character, wake, particles, abilities. If a surface responds differently to the same light, the visual unity breaks. One function, used everywhere.

### 2.3 Terrain State and {{DEFORMATION_TYPE}}

This is the core interactive system. Everything writes here; the {{PRIMARY_MATERIAL_NAME}} shader reads it.

Maintain a player-following render target covering roughly {{STATE_BUFFER_COVERAGE — default: 60-100 m}}, with resolution high enough for approximately {{STATE_BUFFER_TEXEL_SIZE — default: 2 cm}} texels in the {{DEFORMATION_TYPE}} area. A {{STATE_BUFFER_SPEC — default: 4096 sq R16F}} target scrolled toroidally as the player moves is a reasonable starting point. Snap movement to texel boundaries to avoid swimming.

**Suggested channels, packed across one or two targets as appropriate:**

{{STATE_BUFFER_CHANNELS}}

**Rules:**

{{DEFORMATION_TYPE}} is persistent and additive, accumulated by writing brush splats into the target each frame. Never rebuild it from a list of past events.

Apply {{RECOVERY_MECHANISM}} over time, so {{DEFORMATION_MARKS}} soften and eventually {{RECOVERY_OUTCOME}}. Tune it so a {{DEFORMATION_MARK_SINGULAR}} remains clearly visible after 60 seconds.

Terrain vertex displacement samples the {{STATE_BUFFER_CHANNELS}} channels. Recompute normals from the same data so lighting and shadowing respond correctly. A {{DEFORMATION_MARK_SINGULAR}} that does not self-shadow is a failure.

Player feet, the {{CENTREPIECE_MECHANIC}} wake, and every {{ABILITY_NOUN}} write into this buffer. That shared write path is what makes the {{ABILITY_NOUN_PLURAL}} feel embedded in the {{PRIMARY_MATERIAL_NAME}} rather than like effects floating above it.

### 2.4 Atmosphere and Lighting

{{ATMOSPHERE_DIRECTION}}

Use cascaded shadow maps with PCSS-style soft filtering. Tune cascade splits so near-field {{DEFORMATION_MARK_SINGULAR}} shadows stay crisp.

If terrain geometry exists only in the vertex shader (no CPU-side mesh — which is the case for procedural clipmap terrain), the engine's built-in shadow generator will not work. You will need to implement shadow cascades yourself, registering each caster's actual vertex program. Budget for this — it is a significant system. Texel-snap cascade projections in world space and stabilise against a rotation-invariant bounding sphere to eliminate shadow shimmer.

{{SKY_APPROACH}}

Add fog and aerial perspective with height falloff. Distance should compress contrast noticeably.

Add {{AMBIENT_MOTION_EFFECT}}: {{AMBIENT_MOTION_DESCRIPTION}}. It should make the environment feel alive without obscuring the terrain.

Add volumetric light shafts only where they materially improve the image. Keep them restrained.

{{ABILITY_NOUN_PLURAL}} emit light. Budget 4-6 dynamic lights maximum, with tight radii. Ensure the {{PRIMARY_MATERIAL_NAME}} shader's {{LIGHT_INTERACTION_TERM}} responds to them so a {{ABILITY_NOUN_SINGULAR}} visibly {{LIGHT_INTERACTION_DESCRIPTION}}.

### 2.5 Post-Processing

Order matters. Suggested chain:

{{POST_PROCESSING_CHAIN}}

Build a shared depth prepass that carries linear view depth and a material-type mask (e.g., specular/ice flag). Feed this into every post-process that needs depth — TAA reprojection, DoF, volumetric shafts, SSR gating. One prepass, read everywhere. Do not let each post-process compute its own depth.

TAA is essential for stabilising {{TAA_STABILISATION_TARGETS}}. Every post-process should be individually toggleable from the settings overlay for A/B comparison. {{PRIMARY_FAILURE_MODE}}, so monitor {{FAILURE_MODE_METRIC}} constantly.

### 2.6 Character and {{CHARACTER_COSTUME}}

The character will be seen from behind at mid-distance almost the entire time. Spend the budget on silhouette, cloth, and shading; spend almost nothing on the face.

{{CHARACTER_DESCRIPTION}}

Add cloth simulation to {{CLOTH_PANELS}}. A GPU or CPU Verlet simulation with distance and bending constraints is acceptable. Drive it with locomotion velocity, acceleration, and the wind field. During {{CENTREPIECE_MECHANIC}}, the cloth should {{CLOTH_CENTREPIECE_REACTION}}.

Decouple simulation resolution from visual tessellation. Run the Verlet solver on a coarse grid (e.g., 36×12) and reconstruct a finer surface (e.g., 72×32) in the vertex shader using Catmull-Rom or similar interpolation. This lets you increase visual quality without increasing physics cost. Folds should live in the rest shape rather than in a normal map.

Pack all per-frame character data into a single small texture or buffer: bone transforms, cloth node positions, and any other animated state. One upload per frame, no allocation. A texture where rows 0–N are bone matrices and rows N+ are simulation node positions is a proven pattern.

{{CLOTH_SHADING_REQUIREMENTS}}

Keep the face in shadow beneath the {{HEAD_COVERING}}. Do not model detailed facial features that cannot be finished to the same standard.

If a rig and locomotion animation cannot be brought to a high standard, prefer a fully cloth- and procedurally driven figure over a stiff or poorly animated one. Feet must plant rather than slide. Achieve this architecturally: a foot's world position is written once on touchdown and held absolutely fixed while IK reaches for it. A planted foot cannot slide because no code path exists to move it. Advance gait phase with ground distance traveled so stride length equals ground speed by construction — do not blend animation clips.

Feet {{FOOT_INTERACTION}} on each step. This must be frame-accurate with each footfall.

### 2.7 Camera and Controls

Use third-person, action-MMO framing. Position the camera over the shoulder with a slight offset rather than directly behind the character.

WASD movement is relative to camera facing. The mouse orbits. The scroll wheel zooms across a smooth, eased range.

Use a spring-arm camera with collision-free but velocity-aware behaviour. It should lag slightly under acceleration, widen the FOV under speed, and tighten on stopping. All transitions must ease, with no snapping.

Add subtle camera shake to heavy {{ABILITY_NOUN_PLURAL}} and hard {{CENTREPIECE_MECHANIC}} {{CENTREPIECE_VERB_PLURAL}}. Keep it subtle.

### 2.8 {{ABILITY_NOUN_PLURAL}}: Keys 1-5

All five {{ABILITY_NOUN_PLURAL}} share one bending grammar: continuous, momentum-carrying, unbroken flow. No instant spawns and no instant despawns. Everything eases in from the {{PRIMARY_MATERIAL_NAME}} and settles back into it. Every {{ABILITY_NOUN_SINGULAR}} reads and writes the terrain state buffer.

Suggested set, adjustable where a different implementation produces a stronger result:

{{ABILITY_1_NAME}} — {{ABILITY_1_DESCRIPTION}}

{{ABILITY_2_NAME}} — {{ABILITY_2_DESCRIPTION}}

{{ABILITY_3_NAME}} — {{ABILITY_3_DESCRIPTION}}

{{ABILITY_4_NAME}} — {{ABILITY_4_DESCRIPTION}}

{{ABILITY_5_NAME}} — {{ABILITY_5_DESCRIPTION}}

**Implementation direction:** {{ABILITY_IMPLEMENTATION_DIRECTION}}

All abilities that move a coherent body of {{ABILITY_MATERIAL_NAME}} should share a single mesh and a single draw call. Implement a strand manager: one mesh with N strands, where inactive strands are zeroed rather than removed. The draw count must not depend on how many abilities are active. Each ability module configures its strand(s) — shape, position, lifetime — but does not own geometry.

**{{ABILITY_MATERIAL_NAME}} shading needs:**

{{ABILITY_MATERIAL_PROPERTIES}}

### 2.9 {{CENTREPIECE_MECHANIC}}: Hold {{CENTREPIECE_INPUT — default: RMB}}

This will be used more than everything else combined. It receives the most polish.

{{CENTREPIECE_DESCRIPTION}}

Implementation direction for the wake: build it as a static lattice mesh with vertices carrying only grid indices (column, row, side). Encode the spine as a small data texture and place all vertices in the vertex shader. Upload cost must be constant regardless of wake length — a 19-metre wake and a 2-metre wake should cost the same buffer and the same upload. Normals must be differenced from the same point function the geometry uses, so they cannot disagree with the surface.

There is no audio in this demo. Every sensation — speed, impact, weight, wind — must be communicated purely through visual cues: FOV changes, screen-space streaks, cloth reaction, camera shake, and particle density.

Turning at speed should feel weighty and analogue. Tune it by hand until it feels good, not merely until it compiles.

---

## 3. Performance Engineering

Garbage collection is your primary enemy. A 12 ms garbage-collection pause is a visible hitch and instantly destroys the AAA impression.

- Zero allocations in the render loop. Do not use `new` inside per-frame code. Pre-allocate scratch `Vector3`, `Matrix`, and `Quaternion` instances at module scope and reuse them.
- Do not use `map`, `filter`, `reduce`, spread syntax, or destructuring that creates new objects in hot paths. Use plain indexed `for` loops.
- Do not construct strings each frame, including for the performance overlay. Update the overlay on a throttled interval and reuse buffers.
- Use object pools for every transient effect, particle burst, and decal.
- Use pre-allocated typed arrays for all GPU buffer uploads. Write into them rather than rebuilding them.
- Use `scene.freezeActiveMeshes()`, `mesh.freezeWorldMatrix()`, `material.freeze()`, and `scene.blockMaterialDirtyMechanism` aggressively for static content.
- Use thin instances for all repeated geometry.
- Profile with the Chrome performance panel and {{ENGINE}}'s inspector. Ship a frame-time graph in the overlay showing the 1% low, not merely an FPS counter. Average FPS will hide the exact hitching problem that matters most.
- Set a frame budget and hold to it. At 90 FPS, the total budget is 11.1 ms. Allocate it explicitly across terrain, {{PRIMARY_MATERIAL_NAME}} shading, shadows, VFX, cloth, and post-processing. Record actual measured cost per system in PERF.md.
- Track VRAM consumption. Document the size of every major allocation (heightfield textures, deformation targets, shadow cascades, LUTs) in PERF.md. A 4096² RGBA16F texture is 128 MB. Budget accordingly.

---

## 4. Loading and Pipeline Warm-up

WebGPU pipeline compilation stutter is a real and severe risk. A shader that first compiles when the player {{DEFERRED_ACTION_EXAMPLE}} will produce a multi-hundred-millisecond freeze.

Before the loading screen dismisses:

- Load and decode every texture, HDRI, mesh, and buffer.
- Force-compile every material and particle-system pipeline, including every {{ABILITY_NOUN_SINGULAR}}, post-process, and shader permutation, by rendering them once to a tiny offscreen target.
- Gate every material and pipeline on the engine's readiness check (e.g., `material.isReady()`). Do not assume that creating a material compiles it. Exercise each pipeline with real geometry — not just material creation — behind the loading screen. Verify `isReady()` returns true for every permutation before fading in.
- Warm every render target and run several frames of every compute pass.
- Only then fade in.

A four-second load with a clean first minute is better than an instant load that hitches. Present a tasteful loading screen. This is the first thing anyone sees, so it must not resemble an unstyled browser default.

---

## 5. UI

Provide only a settings and performance overlay, toggled with a key such as F1 or backtick and hidden by default.

Contents:

- Frame-time graph with 1% low.
- Draw-call and triangle counts.
- Individual toggles for every post-process and major system.
- Quality presets.
- Sliders for the art parameters most likely to need live tuning, including {{TUNING_SLIDERS}}.

Build this early. It will save hours.

No HUD. No crosshair. No {{ABILITY_NOUN_SINGULAR}} bar. Nothing else on screen, ever.

Implement a single centralized settings object that every system reads. The UI overlay writes directly into this object. Do not let systems maintain their own independent parameter stores — it will make live tuning impossible when values disagree.

---

## 6. Project Structure

Suggested structure; adapt as needed:

```
/src
  /core        engine bootstrap, render loop, resource manager, pooling
  /terrain     {{TERRAIN_MODULES — e.g., "clipmap, procedural heightfield, deformation buffers"}}
  /shaders     {{SHADER_LANG}}
    /lib       shared includes: noise, lighting, {{PRIMARY_MATERIAL_NAME}} response, deformation read, atmosphere
  /character   controller, {{CHARACTER_COSTUME}} cloth, {{CHARACTER_DETAIL}}
  /{{ABILITY_DIR — e.g., "spells"}}   one module per {{ABILITY_NOUN_SINGULAR}} + shared {{ABILITY_MATERIAL_NAME}} body + light pool
  /vfx         particle systems, decals, spray
  /render      sky + IBL, shadow cascades, depth prepass
  /post        post-process chain
  /ui          settings overlay
  /assets      vendored, with ASSETS.md

DECISIONS.md   every deviation from this brief + rationale
PERF.md        measured frame budget per system + VRAM budget
```

---

## 7. Milestones

Take a 1440p screenshot at every milestone, inspect it critically, and commit the screenshots.

1. **Foundation** — WebGPU boot, Vite, render loop, settings overlay with frame graph, camera, and WASD movement on a placeholder plane.

2. **Terrain and {{PRIMARY_MATERIAL_NAME}} Shading** — {{TERRAIN_MODULES}}, procedural heightfield, full {{PRIMARY_MATERIAL_NAME}} material with {{MILESTONE_2_KEY_FEATURES}}. **Gate: a static screenshot with no character already looks polished, atmospheric, and production-ready. Do not proceed until this is true.**

3. **{{DEFORMATION_TYPE}}** — Full terrain state buffer, footfall displacement with {{DEFORMATION_EDGE_FEATURE}}, {{RECOVERY_MECHANISM_SHORT}}, correct normals, and self-shadowing. **Gate: {{DEFORMATION_MARK_PLURAL}} visibly {{DEFORMATION_GATE_VERB}}, form {{DEFORMATION_EDGE_FEATURE_PLURAL}}, and integrate correctly with lighting.**

4. **Character** — {{CHARACTER_COSTUME}}, cloth simulation, {{CHARACTER_DETAIL}}, locomotion, foot planting, and {{FOOT_INTERACTION_SHORT}} on footfall.

5. **{{CENTREPIECE_MECHANIC}}** — The centrepiece. Spend disproportionate time here.

6. **{{ABILITY_NOUN_PLURAL}}** — All five {{ABILITY_NOUN_PLURAL}}, each writing into the terrain.

7. **Post-processing and polish pass** — Full chain, tonemapping calibration, {{AMBIENT_MOTION_EFFECT}}, and restrained light shafts.

8. **Performance hardening** — Profile, eliminate every allocation in the loop, verify 90 FPS with clean 1% lows, and verify that warm-up covers every pipeline.

---

## 8. Visual Acceptance Criteria

Before declaring the demo complete, verify each item against a fresh 1440p screenshot and in motion:

- No visible faceting, hard polygon edges, or flat-shaded surfaces anywhere in frame.
- {{ACCEPTANCE_HIGHLIGHT_CRITERION}}
- Distant terrain shows clear aerial perspective and contrast compression.
- Surface detail is legible at three distinct scales simultaneously: {{THREE_SCALES}}.
- {{DEFORMATION_MARK_PLURAL}} have {{DEFORMATION_VISUAL_CRITERIA}}.
- {{MATERIAL_SPECIFIC_ACCEPTANCE_1}}
- The {{CHARACTER_COSTUME}} reads as {{COSTUME_QUALITY_BAR}}.
- {{ABILITY_MATERIAL_ACCEPTANCE}}
- {{ABILITY_LIGHT_ACCEPTANCE}}
- Every {{ABILITY_NOUN_SINGULAR}} leaves a mark on the terrain that persists after the effect ends.
- The {{CENTREPIECE_MECHANIC}} wake looks like {{CENTREPIECE_QUALITY_BAR}}.
- The demo sustains 90 FPS with 1% lows above 60 FPS.
- No hitch occurs on the first cast of any {{ABILITY_NOUN_SINGULAR}}.

---

## 9. Working Agreement

Build, don't test-loop. Playwright is available for capturing screenshots at milestones and catching hard regressions. Use it for those purposes. Do not build a test suite; time spent on tests is time not spent on the {{PRIMARY_MATERIAL_NAME}} shader.

Look at your own output constantly. Capture screenshots, inspect them critically, and iterate on values. Most of the quality gap between "prototype" and "AAA" is parameter tuning, and you can only close it by looking.

Do not move on from an ugly milestone. Milestone 2 in particular is a hard gate.

When a technique is not working, replace it rather than patching it. You have full latitude over the approach.

Record every deviation in DECISIONS.md, briefly. One line is sufficient.

Ship something worth screenshotting.
