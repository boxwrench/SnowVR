# SnowVR Architecture

`SnowVR` is a WebXR downhill snowboard experience built with React Three Fiber, Three.js, `@react-three/xr`, and Vite.

## Core design principles

1. **Standalone-first:** Target Meta Quest 3 at 72 Hz without desktop tethering or cloud rendering.
2. **Dynamic snow manipulation:** The player's actions alter the snow terrain, creating trenches, ice trails, mounds, and slush.
3. **Immersive 3rd-person controls:** Control a snowboarder down an arctic slope with independent spell aiming and a horizon-stable chase camera.
4. **Endless downhill loop:** Seamlessly rebase coordinates so the run can continue indefinitely without precision loss or visual seams.

## Entry points and state flow

- `src/main.tsx` mounts the React tree.
- `src/App.tsx` owns high-level UI, spell selection, dev controls, and WebXR canvas setup.
- `src/xr/store.ts` configures the `@react-three/xr` session store, enabling 72 Hz mode and fixed foveation when supported.

## Scene structure and WebXR integration

- `src/xr/store.ts` defines a deliberately small immersive-VR feature set. It disables unsolicited session offers and unused AR features, requests layers, sets fixed foveation to `0.5`, and selects 72 Hz when the runtime exposes it.
- Native WebXR always takes priority. The IWER Quest emulator is opt-in during development with `?emulate=1`; it is never force-installed over a connected headset.
- `SnowSurferController.tsx` owns rider position, velocity, heading, camera chase state, Quest controller sampling, desktop controls, spell aiming, and the endless-run transition.
- Quest spell aiming ray-marches the right controller's target-ray direction against the CPU terrain sampler. Downward rays resolve to the first terrain crossing; level or upward rays use a bounded horizontal fallback so the target remains predictable and on the snowfield.
- The loop transition fades a camera-following in-scene veil to full opacity before applying the same 80 m coordinate rebase to the rider and active camera rig. Velocity and heading are preserved.

## Terrain and deformation

- The base terrain is a deterministic 120 m square sampled into a 257 x 257 `Float32Array`, one height per vertex of a 256 x 256 segment `PlaneGeometry`.
- The GPU samples that array through a nearest-filtered float `DataTexture`. CPU grounding uses the same data and the exact two-triangle split used by Three.js `PlaneGeometry`, including the inverted world-Z/texture-V mapping.
- `SnowDeformationBuffer.ts` maintains two 1024 x 1024 `RGBA16F` render targets. Channels store depression, berm/spire height, ice, and wetness.
- Offscreen deformation and GPGPU passes run through `withPreservedRenderTarget`. The helper temporarily disables Three.js WebXR camera substitution so those passes retain their orthographic simulation camera, then restores both the headset render target and the previous XR state.
- `RideableDeformationField.ts` mirrors spell brush stamps into a 257 x 257 CPU field. It avoids synchronous GPU readback while providing bilinear depression, mound, ice, and wetness samples for gameplay.
- Spell and carving stamps are normalized to a 72 Hz reference rate. Slump, wind refill, and drying use elapsed time.
- Spell deformation is rideable: the rider, reticle, and spell emitters sample the base heightfield plus the CPU deformation mirror. Surface normals project gravity down mounds and trenches, Hydro Stream builds wet halfpipe walls, ice trails accelerate toward a 34 m/s cap, and wet slush increases drag.
- Board carving remains visual-only so the rider does not sink continuously into the track being created directly beneath it.

## Effects, audio, and UI

- Spell VFX use a 64 x 64 GPGPU state texture: 4,096 particles with idle suspension. Spawn probability is converted from the 72 Hz reference probability to the current frame interval, and per-spell intensity reduces density, size, and opacity where particles would obscure the authored surface.
- Falling snow uses 1,200 CPU-updated points. Slalom poles are instanced.
- The snow terrain material is a non-raw `ShaderMaterial` that includes `tonemapping_fragment`, `colorspace_fragment`, and `fog_fragment` in the same order as Three.js built-in materials. Without those includes the terrain bypasses ACESFilmic tone mapping and sRGB encoding while every other object receives both.
- Sky, fog, sun, and backdrop values come from `src/environment/atmosphereConfig.ts`. The terrain fogs into `HORIZON_COLOR` and the mountain backdrop's base is the same colour, so the two meet without a seam.
- The mountain backdrop is three unfogged concentric rings at 120 m, 150 m, and 180 m, each baking its own aerial perspective into a vertical gradient. Linear fog saturates at 92 m, so any world-space ring would be a flat band; three radii also parallax against each other, which is what makes a backdrop read as depth rather than as a painted wall.
- Falling snow wraps toroidally around the camera on all three axes, so the particle budget follows the rider instead of staying at the world origin.
- The rider's grounding cue is a multiply-blended contact shadow quad parented to the terrain-aligned character group. Shadow maps are outside budget.
- The snow shader's quality tiers are screen-centre LOD rings, not foveation. `uLodCenter` is static; native fixed foveated rendering is a separate mechanism configured by `gl.xr.setFoveation(0.5)` in `src/xr/store.ts`.
- Base terrain normals are precomputed into an RGB texture, so the vertex shader samples the height field for deformation correction only. This halves its texture fetches without changing tessellation.
- The deformation simulation pass suspends when no brush is active and residual decay is below a visible threshold, mirroring the particle system's idle suspension. It resumes on the first brush stamp.
- The render loop allocates no objects per frame. Scratch vectors, quaternions, and planes live in refs or module scope.
- WebGL context loss is recovered rather than fatal: the canvas listens for `webglcontextlost` / `webglcontextrestored`, which the Quest browser raises on headset sleep and resume.
- Audio consumes sampled rider speed and carving intensity rather than UI input state.
- The always-available XR status panel shows the active spell, rider speed, and CAST/READY state near the rider.
- `?dev=1` adds a head-following XR diagnostics panel. It and the DOM panel share render-loop measurements: FPS, average and p95 frame time, fixed foveation, XR refresh rate, and projection-layer dimensions.

## Performance budgets

| Resource | Current budget |
| --- | ---: |
| Terrain mesh | 256 x 256 segments (257 x 257 vertices) |
| Base heightfield | 257 x 257 R32F-equivalent data texture |
| Deformation state | 1024 x 1024 RGBA16F, ping-pong |
| Rideable deformation mirror | 257 x 257, four CPU float channels |
| Spell particles | 4,096 |
| Falling snow points | 1,200 |
| Quest target | 72 Hz, foveation 0.5 |
| Fog range | 30 m to 92 m, shared by every fogged material |
| Mountain backdrop | 3 rings, 3 draw calls, unfogged |
| Rider character | Draw calls recorded in the v0.2 benchmark; largest single addition in this release |
| Release gate | p95 frame time < 13.5 ms in all three benchmark scenes |

Run `npm run validate` before deployment. It performs the TypeScript check, unit tests, and the production Vite build.
