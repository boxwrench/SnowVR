# Biome Tech Demo Prompt Template — Companion Guide

> Companion guide for [TEMPLATE.md](TEMPLATE.md). Use this document to understand why each placeholder exists, what made the original SnowFlow prompt effective, and how to adapt it for different biomes.

---

## 1. How to Use

1. Make a copy of `TEMPLATE.md` named after your project (e.g., `DESERT_TECHDEMO_PROMPT.md`).
2. Fill in every `{{PLACEHOLDER}}` using the [Placeholder Quick Reference](#2-placeholder-quick-reference) table below.
3. Reference the [Section-by-Section Guidance](#3-section-by-section-guidance) for inspiration and biome-specific examples.
4. Verify your completed prompt against the [Proven Architectural Patterns Checklist](#4-proven-architectural-patterns-checklist).
5. Pass the clean, filled-in markdown file directly to the AI model.

### Key Prompt Engineering Principles
- **Be Prescriptive About Quality, Not Just Features:** Don't say "add terrain noise"; specify physical scales (broad dunes at 50m, ripples at 20cm) and structural intent (prevailing wind shear).
- **Quantify Everything:** Include concrete numbers in every section (sub-10 cm spacing, 4096² RT, 2 cm texels, 20–40 shells, 4–6 dynamic lights, 60-second trail half-life). Precision drives AI output quality.
- **Use the "Suggested, Adjustable" Pattern:** Give the AI a clear implementation direction while explicitly granting authority to swap techniques if a different approach produces a better visual result.

---

## 2. Placeholder Quick Reference

| Placeholder | Category | What to Fill In | Snow Example (`snowflow_demo`) |
|---|---|---|---|
| `{{PROJECT_NAME}}` | Identity | Name of the project | `SNOWFLOW` |
| `{{PRIMARY_ENVIRONMENT}}` | Identity | Primary biome description | `a snow-covered alpine field` |
| `{{CORE_INTERACTION_SENTENCE}}` | Identity | 10-second elevator pitch of what player does | `cast a few spells, surf across a dune` |
| `{{ENGINE}}` | Stack | Rendering engine constraint | `Babylon.js latest stable, WebGPU only` |
| `{{SHADER_LANG}}` | Stack | Shader language | `WGSL` |
| `{{SHADER_LANG_EXT}}` | Stack | Extension for shader includes | `wgsl` |
| `{{TARGET_BROWSER_AND_HARDWARE}}` | Stack | Target platform benchmark | `Chrome stable on Windows 11, RTX 5070 Ti, 2560x1440` |
| `{{ASSET_STRATEGY}}` | Stack | Asset generation vs authored policy | `Generate everything procedurally. Zero binary assets.` |
| `{{TERRAIN_PHILOSOPHY_SENTENCE}}` | Terrain | One sentence setting emotional quality bar | `A flat plane will kill this demo. The snow field needs real form.` |
| `{{TERRAIN_NOISE_LAYERS}}` | Terrain | 3-4 frequency bands with physical scales | `broad dune forms (tens of m), medium drifts/wind lobes (m), sastrugi ridges (dm) shaped by wind` |
| `{{TERRAIN_LANDMARKS}}` | Terrain | Sparse features breaking monotony | `Sparse exposed rock outcrops and ice shelves with snow accumulation on windward faces` |
| `{{FAR_FIELD_TREATMENT}}` | Terrain | Horizon visual treatment | `distant mountains with heavy aerial perspective raymarched in sky shader` |
| `{{PRIMARY_MATERIAL_NAME}}` | Material | Core surface material | `Snow` |
| `{{NAIVE_DEFAULT}}` | Material | The naive fallback to forbid | `white` |
| `{{MATERIAL_BEHAVIOURS}}` | Material | 4-6 bold material properties & techniques | Multi-scale normals, SSS (wrapped+backscatter), view glints, compression/ice states, micro-occlusion |
| `{{DEFORMATION_TYPE}}` | State | Name of persistent terrain buffer | `Deformation` |
| `{{STATE_BUFFER_COVERAGE}}` | State | World size of scrolled target | `60-100 m` |
| `{{STATE_BUFFER_TEXEL_SIZE}}` | State | Physical size per texel | `2 cm` |
| `{{STATE_BUFFER_SPEC}}` | State | Render target specification | `4096 sq R16F` |
| `{{STATE_BUFFER_CHANNELS}}` | State | Packed channels list | R: depression depth, G: displaced mass (berms), B: compression/wetness, A: refrozen ice |
| `{{RECOVERY_MECHANISM}}` | State | Environment healing mechanism | `slow refill through gentle diffusion and decay pass` |
| `{{RECOVERY_MECHANISM_SHORT}}` | State | Short healing description | `refill diffusion` |
| `{{RECOVERY_OUTCOME}}` | State | Healing result verb | `soften and melt back into the drift` |
| `{{DEFORMATION_MARKS}}` | State | Plural marks noun | `footprints and trails` |
| `{{DEFORMATION_MARK_SINGULAR}}` | State | Singular mark noun | `trail` |
| `{{DEFORMATION_MARK_PLURAL}}` | State | Plural mark noun | `trails` |
| `{{DEFORMATION_EDGE_FEATURE}}` | State | Raised edge feature noun | `berms` |
| `{{DEFORMATION_EDGE_FEATURE_PLURAL}}`| State | Plural edge feature noun | `berms` |
| `{{DEFORMATION_GATE_VERB}}` | State | Milestone gate action verb | `displace mass` |
| `{{DEFORMATION_VISUAL_CRITERIA}}` | State | Visual criteria for state buffer | `raised berms, self-shadow correctly, and soften over time` |
| `{{ATMOSPHERE_DIRECTION}}` | Lighting | Lighting & color contrast rule | Low warm sun (2000K) + strongly blue-shifted ambient sky = warm highlights, deep blue shadows |
| `{{SKY_APPROACH}}` | Lighting | Sky implementation strategy | Analytic Nishita single-scattering atmosphere shader driven by sun angle uniform |
| `{{AMBIENT_MOTION_EFFECT}}` | Lighting | Low environmental motion effect | `spindrift` |
| `{{AMBIENT_MOTION_DESCRIPTION}}` | Lighting | Description of ambient motion | `low wind-driven snow streaming across the surface` |
| `{{LIGHT_INTERACTION_TERM}}` | Lighting | Shader light interaction function | `subsurface-scattering term` |
| `{{LIGHT_INTERACTION_DESCRIPTION}}` | Lighting | How lights illuminate terrain | `illuminates the snow from within the drift it touches` |
| `{{POST_PROCESSING_CHAIN}}` | Post | Ordered post-process chain | TAA → SSAO → SSR (wet/ice only) → DoF → Bloom → ACES Tonemapping → Grain → Sharpen |
| `{{TAA_STABILISATION_TARGETS}}` | Post | TAA target features | `glinting and thin geometry` |
| `{{PRIMARY_FAILURE_MODE}}` | Post | Core visual failure state | `Blown-out white is the primary failure mode for snow renders` |
| `{{FAILURE_MODE_METRIC}}` | Post | Metric to monitor constantly | `highlight roll-off` |
| `{{CHARACTER_COSTUME}}` | Character | Costume type | `hooded robe` |
| `{{CHARACTER_DESCRIPTION}}` | Character | Detailed outfit description | Layered robe with deep cowl, long sleeves, over-mantle, trailing hem, 30-shell procedural fur |
| `{{CHARACTER_DETAIL}}` | Character | Secondary costume feature | `shell fur` |
| `{{CLOTH_PANELS}}` | Character | Simulated cloth elements | `hem, sleeves, and mantle` |
| `{{CLOTH_CENTREPIECE_REACTION}}` | Character | Cloth motion during centrepiece | `whip backwards sharply` |
| `{{CLOTH_SHADING_REQUIREMENTS}}` | Character | Cloth material shading needs | Sheen/fuzz, anisotropic weave response, subsurface scattering on thin regions |
| `{{HEAD_COVERING}}` | Character | Head covering type | `hood` |
| `{{FOOT_INTERACTION}}` | Character | Footstep interaction | `displace snow and kick up spray` |
| `{{FOOT_INTERACTION_SHORT}}` | Character | Short footstep interaction | `spray` |
| `{{ABILITY_NOUN}}` | Abilities | Magic/power noun | `spell` |
| `{{ABILITY_NOUN_SINGULAR}}` | Abilities | Singular power noun | `spell` |
| `{{ABILITY_NOUN_PLURAL}}` | Abilities | Plural power noun | `spells` |
| `{{ABILITY_DIR}}` | Structure | Ability module folder | `spells` |
| `{{ABILITY_1_NAME}}` | Abilities | Key 1 ability | `Sweep` (crescent slush wave ploughing a channel) |
| `{{ABILITY_2_NAME}}` | Abilities | Key 2 ability | `Ribbon` (held stream scoring thin lines in snow) |
| `{{ABILITY_3_NAME}}` | Abilities | Key 3 ability | `Bloom` (eruption column blowing a crater) |
| `{{ABILITY_4_NAME}}` | Abilities | Key 4 ability | `Crystallise` (refractive ice crystals growing from drift) |
| `{{ABILITY_5_NAME}}` | Abilities | Key 5 ability | `Vortex` (swirling column stripping surface snow) |
| `{{ABILITY_IMPLEMENTATION_DIRECTION}}`| Abilities | Shared rendering approach | Swept procedural tube/ribbon meshes on spline, GPU compute spray particles, refraction pass |
| `{{ABILITY_MATERIAL_NAME}}` | Abilities | Ability material type | `Water` |
| `{{ABILITY_MATERIAL_PROPERTIES}}` | Abilities | Material requirements | Refraction with chromatic dispersion, depth absorption, flow normals, foam/slush edge |
| `{{ABILITY_MATERIAL_ACCEPTANCE}}` | Acceptance | Acceptance criterion | `Spell water is translucent and refractive, with visible internal light scatter.` |
| `{{ABILITY_LIGHT_ACCEPTANCE}}` | Acceptance | Light acceptance criterion | `Spell light visibly illuminates the snow it touches, including through-scatter.` |
| `{{CENTREPIECE_MECHANIC}}` | Centrepiece| Primary movement mechanic | `Snow-surf` |
| `{{CENTREPIECE_INPUT}}` | Centrepiece| Key binding | `RMB` |
| `{{CENTREPIECE_DESCRIPTION}}` | Centrepiece| Detailed description | Holding RMB raises compressed snow crest, accelerates player, mouse steers carving turns. Wake is a curling breaking wave throwing spray. Carves deep persistent groove. |
| `{{CENTREPIECE_VERB_PLURAL}}` | Centrepiece| Motion verbs | `carves` |
| `{{CENTREPIECE_QUALITY_BAR}}` | Centrepiece| Visual bar for wake | `displaced mass with momentum, not merely particle spray` |
| `{{TUNING_SLIDERS}}` | UI | Critical live sliders | `sun angle, fog density, glint intensity, deformation depth, and refill rate` |
| `{{THREE_SCALES}}` | Acceptance | 3 distinct surface detail scales | `dunes, ripples, and grain` |
| `{{ACCEPTANCE_HIGHLIGHT_CRITERION}}` | Acceptance | Highlight check | `Snow highlights are not clipped to pure white; shadows are blue rather than grey.` |
| `{{MATERIAL_SPECIFIC_ACCEPTANCE_1}}` | Acceptance | Material check | `Sparkle appears only at grazing angles and does not crawl or shimmer in motion.` |
| `{{COSTUME_QUALITY_BAR}}` | Acceptance | Costume quality bar | `layered fabric with real cloth motion, and the fur trim reads as fur` |
| `{{DEFERRED_ACTION_EXAMPLE}}` | Warmup | Late action example | `casts spell 4` |
| `{{MILESTONE_2_KEY_FEATURES}}` | Milestones | Milestone 2 gate features | `subsurface scattering and glinting, sun, cascaded shadows, sky IBL, and fog` |

---

## 3. Section-by-Section Guidance

### §0. Prime Directive
- **Purpose:** Establishes the non-negotiable quality bar. Tech demos live or die by visual impact.
- **Guidance:** Define a clear 10-second elevator pitch (`{{CORE_INTERACTION_SENTENCE}}`). Keep it to 1 sentence with 2–3 physical verbs.

### §1. Stack and Hard Constraints
- **Purpose:** Prevents the AI from wasting time on fallbacks, cross-platform polyfills, or build complexities.
- **Guidance:** Default to WebGPU + Babylon.js (or Three.js WebGPURenderer). Set a single modern target (e.g. Chrome on RTX GPUs) and explicitly ban WebGL/mobile fallbacks.

### §2.1 Terrain
- **Purpose:** Guarantees structural forms rather than flat planes.
- **Biome Examples:**
  - *Desert:* Sweeping barchan crescents (50–100m), star-dune arms (10–20m), wind ripples (10–30cm). Lee side slip faces.
  - *Ocean:* Broad swell (50–200m) Gerstner displacement, medium chop (2–10m), capillary ripples (5–20cm).
  - *Lava:* Cooled crust plates (20–50m), pahoehoe ropy channels (2–5m), micro-cracks (5–20cm).
- **Proven Far-Field Pattern:** Raymarch the distant terrain inside the sky shader rather than creating separate distant geometry. This guarantees seamless near-to-far material and atmospheric continuity.

### §2.2 Material Shading
- **Purpose:** Forces a custom shader from scratch instead of a stock PBR material.
- **Proven Shader Include Pattern:** Require a shared shader include file (`lib/{{PRIMARY_MATERIAL_NAME}}Lighting.wgsl`) imported by terrain, character, wake, particles, and abilities so every surface has identical lighting math.

### §2.3 Terrain State Buffer
- **Purpose:** Persistent world displacement and surface state tracking.
- **Proven Pattern:** Toroidal scrolled RGBA16F target centered on the player.
- **Channel Packing Example:**
  - `R`: Depression depth (cm)
  - `G`: Displaced mass (berm height)
  - `B`: Surface state (compression / wetness / temperature)
  - `A`: Secondary state (refrozen ice / crust thickness / moisture)

### §2.4 Atmosphere and Lighting
- **Key Insight:** Establish a strong light/shadow color contrast (e.g., warm 2000K sun vs cool blue ambient).
- **Procedural Shadow Cascades:** If terrain is vertex-displaced in shader only, engine built-in shadow generators won't work. Explicitly instruct the AI to write custom CSM cascades registering actual vertex shaders.

### §2.5 Post-Processing
- **Key Insight:** Order is critical (TAA → SSAO → SSR → DoF → Bloom → Tonemap → Sharpen).
- **Depth Prepass Pattern:** Create a single depth prepass carrying linear view depth and material mask to feed all post-processing effects.

### §2.6 Character & Cloth
- **Tessellation Decoupling:** Run Verlet cloth physics on a low-res grid (e.g. 36×12) and Catmull-Rom interpolate to a high-res mesh (e.g. 72×32) in vertex shader.
- **One-Texture Upload:** Pack bone matrices (rows 0–3) and cloth nodes (rows 4+) into a single small data texture uploaded once per frame.
- **Foot Planting:** Write planted foot world position once on touchdown and hold fixed. Stride length driven by ground distance traveled so feet physically cannot slide.

### §2.8 Abilities
- **Strand Manager Pattern:** All swept-surface abilities share ONE static mesh, ONE draw call, and N strands. Unused strands are zeroed. Constant draw call count.
- **Refraction Optimization:** Sample ground-bounce from analytic sky LUT along refracted ray instead of performing expensive screen-space scene copies.

### §2.9 Centrepiece Mechanic
- **Static Lattice Wake:** Wake mesh is a static index lattice; vertex shader places points based on a 96×3 data texture spine. Constant 4.6 KB upload regardless of wake length.
- **No Audio Rule:** Communicate all speed/impact through visual cues (FOV widen, screen streaks, cloth whip, camera shake).

---

## 4. Architectural Patterns Checklist

Use this checklist to audit your final filled-in prompt or verify the AI's technical design:

- [ ] **Shared Shader Library:** Shared include (`lib/`) for core lighting imported by ALL scene shaders.
- [ ] **Toroidal State Target:** Scrolled R16F target for persistent ground deformation & berms.
- [ ] **Procedural CSM Shadows:** Hand-rolled cascade shadow maps for GPU-displaced terrain.
- [ ] **One-Texture GPU Upload:** Bone transforms & cloth nodes packed into a single texture.
- [ ] **Strand Mesh Architecture:** Shared single-draw mesh for all swept ability bodies.
- [ ] **Static Lattice Wake:** Data-texture driven wake geometry with constant GPU upload.
- [ ] **Refraction via Sky LUT:** Refraction lookup from atmospheric sky LUT (no scene copy).
- [ ] **Raymarched Far-Field:** Distant terrain raymarched inside sky shader for seamless continuity.
- [ ] **Shared Depth Prepass:** Linear depth + material mask pass feeding all post-process shaders.
- [ ] **Catmull-Rom Cloth Decoupling:** Physics simulated on coarse grid, interpolated in vertex shader.
- [ ] **Architectural Foot Planting:** Stance foot locked in world space to eliminate foot sliding.
- [ ] **Pipeline Readiness Warm-up:** `isReady()` checks & offscreen rendering behind loading screen.
- [ ] **Centralized State Store:** Single settings object written by UI overlay and read by all systems.
- [ ] **VRAM & Frame Budgeting:** Measured CPU frame time and VRAM allocation tracked in PERF.md.
