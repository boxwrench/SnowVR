# Changelog

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
