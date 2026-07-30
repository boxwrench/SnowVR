# Changelog

## 0.2.0

### Fixed

- Snow terrain now applies ACESFilmic tone mapping and sRGB output encoding.
  The custom `ShaderMaterial` previously wrote `gl_FragColor` directly, so the
  surface covering most of the screen was colour-mismatched against every other
  object in the scene.
- Slalom pole instance matrices are written in a layout effect instead of a
  memo. The memo ran before React attached the mesh ref, leaving all ten poles
  at `InstancedMesh`'s zero-initialised matrices and therefore invisible.
- Falling snow follows the camera instead of staying in a fixed box at the world
  origin, where it was absent for most of the run.
- The mountain backdrop is visible again. It sat beyond fog far and rendered as
  a flat band.
- The rider character no longer banks at double the intended angle. Bank roll was
  applied both by the parent group and by the character's own root.
- Character animation inputs are sampled in the render loop instead of read from
  refs during render, where they were stale between throttled re-renders.
- WebGL context loss is recovered instead of leaving a permanently black canvas.
  The Quest browser raises it on headset sleep and resume.

### Added

- Shared `src/environment/atmosphereConfig.ts` as the single source of sky, fog, sun,
  and backdrop values.
- Cavity occlusion in carved snow, so trenches and melt holes read as depth.
- Multiply-blended contact shadow grounding the rider.
- Three-layer parallax mountain backdrop replacing the single ring.
- Precomputed base-normal texture for the terrain vertex shader.
- Idle suspension for the deformation simulation pass.
- Three-scene device benchmark with a p95 target below 13.5 ms, recorded in
  `docs/superpowers/plans/2026-07-29-v0.2-baseline.md`.

### Changed

- The snow shader's quality tiers are renamed from "foveal" to screen-centre LOD,
  which is what they are. `uLodCenter` is static and unrelated to the native
  fixed foveated rendering configured in `src/xr/store.ts`. Behaviour and
  thresholds are unchanged.
- The render loop no longer allocates vectors, quaternions, or planes per frame.

### Removed

- Unreferenced `SpellParticleSystem.tsx` and the `CinematicPostProcessing.tsx`
  stub, and the unused `uResolution` uniform from the snow shader.

## [0.1.0] - 2026-07-29

SnowVR's first playable release establishes the project as a third-person
WebXR snowboarding and terrain-spell sandbox for Meta Quest 3 and desktop
browsers.

### Highlights

- Native immersive WebXR rendering with a horizon-stable third-person chase
  camera, Quest controller input, haptics, and fixed foveated rendering.
- GPU snow deformation with persistent board carving, trenches, wet slush,
  ice, berms, and mountains.
- Four controller-aimed spells:
  - Hydro Stream cuts a rideable wet halfpipe with raised sidewalls.
  - Glacier Trail paints a wide ice route that accelerates the board.
  - Thermal Melt creates deep wet holes.
  - Vortex Mountain raises rideable snow terrain.
- CPU-mirrored spell deformation lets the board descend into holes, climb
  mounds and halfpipe walls, respond to terrain gravity, accelerate on ice,
  and slow in wet slush without stalling the XR frame loop on GPU readback.
- Adaptive GPGPU spell particles with reduced, translucent casting effects so
  newly authored terrain remains visible.
- Endless downhill looping, procedural audio, falling snow, slalom markers,
  desktop controls, optional Quest emulation, and opt-in XR diagnostics.

### Verification

- Physically exercised on Meta Quest 3 over an ADB reverse tunnel.
- Automated validation covers TypeScript, terrain sampling, deformation
  collision, surface physics, XR session policy, input, aiming, camera
  behavior, loop transitions, performance statistics, and production builds.

[0.1.0]: https://github.com/boxwrench/SnowVR/releases/tag/v0.1.0
