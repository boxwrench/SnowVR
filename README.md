# SnowVR ❄️🏂

**SnowVR** is an AI-assisted WebXR procedural snow rendering and downhill interaction sandbox built as a hands-on learning tool. It explores real-time GPU-driven snow deformation, WebXR performance optimization, and controller-first VR interactions targeting 72 FPS on Meta Quest 3.

**🌐 Live Demo:** [`https://boxwrench.github.io/SnowVR/`](https://boxwrench.github.io/SnowVR/)

---

## 💡 Inspiration & Acknowledgments

SnowVR was heavily inspired by the exceptional work of [**Noniv**](https://github.com/Noniv) and their project [**`Noniv/snowflow_demo`**](https://github.com/Noniv/snowflow_demo) (released under the [MIT License](https://github.com/Noniv/snowflow_demo/blob/main/LICENSE)). 

`snowflow_demo` demonstrated state-of-the-art procedural WebGPU snow rendering, multi-channel toroidal FBO deformation, anisotropic slump diffusion, and elemental landscape manipulation without pre-authored texture or mesh assets. SnowVR adapts these concepts into a 3rd-person WebXR VR experience tailored for Meta Quest 3 using Three.js and React Three Fiber.

---

## 🎮 Controls

### Meta Quest 3 (WebXR VR)
| Input | Action |
|-------|--------|
| **Left Thumbstick** | Steer left / right & accelerate / reverse |
| **Right Controller Ray** | Aim elemental reticle across snowfield |
| **Right Trigger** | Fire active elemental spell stream |
| **Right A / B Buttons** | Cycle to the next active spell |
| **Left Grip / Trigger** | Speed boost (16 → 28 m/s / ~62 mph) |
| **Haptics** | Tactile feedback on carving and spell casting |

### Desktop Sandbox
| Input | Action |
|-------|--------|
| **W / S / ↑ / ↓** | Accelerate / Reverse |
| **A / D / ← / →** | Steer left / right (banks into turns) |
| **Spacebar** | Speed Boost (16 → 28 m/s) |
| **Keys 1–4** | Select active spell |
| **Left Click / Shift / E** | Fire active spell stream |
| **Right Click + Drag** | Orbit camera |

---

## 🔮 Elemental Spells

| Key | Spell | Effect |
|-----|-------|--------|
| 1 | **Hydro Stream** | Cuts a wide halfpipe with tall rideable walls and speed-sapping wet slush |
| 2 | **Glacier Trail** | Paints a wide, clear ice route that accelerates the board up to 34 m/s |
| 3 | **Thermal Melt** | Melts deep smooth holes into reflective wet slush pools |
| 4 | **Vortex Mountain** | Pulls snow inward to build rideable snow mountains |

---

## 🏗️ Technical Architecture

- **WebXR & Quest 3 Native FFR:** Uses Meta Quest Browser's native Fixed Foveated Rendering (`gl.xr.setFoveation(0.5)`) to optimize stereo GPU rendering headroom.
- **Toroidal Snow Deformation FBO:** 1024² ping-pong `RGBA16F` half-float render targets tracking 4 surface channels:
  - **R (Depression):** Trench depth & impact craters
  - **G (Displaced Mass):** Raised side-berms and Vortex Mountains
  - **B (Ice):** Hard ice compression
  - **A (Wetness):** Slush saturation with wind drying & slump relaxation
- **Rideable Dynamic Terrain:** A compact CPU collision mirror follows spell-authored GPU deformation. Trenches and holes lower the rider, mountains raise and tilt the board, terrain slopes apply gravity, ice accelerates, and wet slush adds drag.
- **3rd-Person VR Chase Rig:** Trailing horizon-stable camera tracking (`<XROrigin>`) following rider position and heading smoothly while preserving free 360° VR head-look.
- **Adaptive GPGPU Particles:** GPU-driven ping-pong particle system (`GPGPUParticleSystem.ts`) budgeted to 4,096 active particles with automatic idle pause during normal riding.
- **Zero-Asset Web Audio:** Procedural Web Audio synthesis (`SnowAudioController.tsx`) generating wind hiss and board scrape audio based on velocity.
- **Unified Atmosphere:** Sky, fog, sun, and backdrop colours resolve from a single `atmosphereConfig.ts` module. The snow shader runs through the standard Three.js tone-mapping, colour-space, and fog chunks so the terrain matches every other material in the scene.
- **Instanced Slalom Gates:** Single-draw-call instanced slalom poles (`SlalomPoles.tsx`) every 18m for immediate visual scale and speed anchors.
- **Camera-Following Snowfall:** 1,200 points wrapped toroidally around the viewer, so snowfall density is constant across the whole run.
- **Performance Monitoring:** Optional real-time FPS, frame time (ms), and native FFR diagnostics (`DevOverlay.tsx`). Enable the head-following headset panel only when profiling with `?dev=1`.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm ci

# Start local dev server
npm run dev
```

### Validation Commands
```bash
npm run typecheck   # TypeScript type checking
npm run build       # Production build
npm run validate    # Type checking, unit tests, and production build
```

Physical Meta Quest setup and the native-device test gates are documented in
[`docs/DEVICE_TESTING.md`](docs/DEVICE_TESTING.md).

---

## 🛠️ Tech Stack

* **React 19** & **TypeScript 5.6**
* **Three.js 0.165.0** & **React Three Fiber 9.0**
* **`@react-three/xr` 6.6.30** & **`@react-three/drei`**
* **Vite 6.0**

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).
Attribution to [Noniv/snowflow_demo](https://github.com/Noniv/snowflow_demo) (MIT License) for procedural snow deformation and spell design inspiration.
