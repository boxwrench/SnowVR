# SnowVR ❄️🥽

**SnowVR** is an open-source, high-fidelity WebXR procedural snow rendering and interaction sandbox. It combines GPU-driven clipmap terrain heightfields, 2048² toroidal deformation ping-pong state buffers, multi-scale PBR snow optics (Subsurface Scattering & micro-crystal glints), and a 5-spell dynamic interaction framework for desktop and Meta Quest 3 headsets.

---

## 🌟 Key Features

* **GPU-Driven Terrain & Shader Displacement:** 120m × 120m high-density mesh grid (512×512 vertex density) displaced entirely in the vertex shader with analytical sastrugi dune noise and triplanar rock cliff outcrops. Zero CPU geometry rebuilds per frame.
* **2048² Toroidal Snow Deformation Buffer:** Ping-pongs two 2048×2048 `RGBA16F` half-float render targets (3.9 cm texels over 120m) tracking 4 physical surface state channels:
  * **R:** Trench depression depth & impact craters.
  * **G:** Displaced mass (raised side-berms, Frost Spires, Vortex Mountains).
  * **B:** Hard ice compression factor.
  * **A:** Water slush saturation with heat evaporation and wind drying.
* **Physical Slump & Infill Simulation:** Anisotropic slump diffusion (loose berms slump 3× faster than packed trench floors), berm-to-trench collapse, and windward upwind infill.
* **Multi-Scale Snow Shading & Advanced Optics:**
  * **GGX Specular Slush Reflections:** Surface wetness channel (`vDeformation.a`) dynamically lowers roughness and boosts GGX specular reflections.
  * **Subsurface Scattering (SSS):** Deep ice-blue backscatter (`#024773`) glowing through snow berms and trench walls.
  * **3D Grazing-Angle Glints:** Procedural micro-crystal sparkles that flash dynamically as camera/headset angles shift.
* **5-Spell Interaction Engine:**
  1. **Snow Carver (`1`):** Precision narrow wake carver with crisp twin side-berms.
  2. **Hydro Blast (`2`):** Explosive impact crater shockwave with a massive raised outer rim.
  3. **Frost Spire (`3`):** Freezes tall crystalline ice spires rising high out of the ground.
  4. **Thermal Melt (`4`):** Melts deep smooth trenches into shiny, reflective wet slush pools.
  5. **Vortex Mountain (`5`):** Pulls snow inward to build up tall snow dunes and mountain mounds.
* **Atmosphere & Visual Polish:** 360-degree distant alpine mountain backdrop ring, horizon distance fog, 3,000 3D volumetric falling snowflakes, glowing spell wand staff with dynamic SSS point lights, and ACES Filmic tone mapping with Bloom and Vignette post-processing.
* **WebXR & Quest 3 Emulator Support:** Built-in dev-mode Meta Quest 3 IWER emulator for fast desktop iteration without needing a headset attached for every tweak.

---

## 🌐 Deploy to GitHub Pages

To publish a live demo URL for your users or Meta Quest 3 headset:

```bash
# Option A: Automated GitHub Actions deployment (on git push)
git push origin main

# Option B: One-click manual CLI deployment
npm run deploy
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for step-by-step setup instructions.

---

## 🛠️ Built With

* **WebXR** & **Meta Quest 3 IWER Emulator**
* **React 19** & **TypeScript 5.6**
* **Three.js (0.165.0)** & **React Three Fiber (9.0)**
* **`@react-three/xr` (6.6.30)** & **`@react-three/drei`**
* **`@react-three/postprocessing`**
* **Vite 6.0**

---

## 🚀 Getting Started

```bash
# Install exact dependencies
npm install

# Start local development server (with Quest 3 emulator)
npm run dev
```

Open `http://localhost:5174` in Chrome.

### Controls:
* **Left Click & Drag:** Cast Spell / Carve / Build Snow
* **Right Click & Drag:** Orbit Camera
* **Keys 1 to 5:** Switch Spells (1: Carver, 2: Blast, 3: Spire, 4: Melt, 5: Vortex)
* **🥽 Enter VR Button:** Enter WebXR mode (Quest 3 / Vision Pro / Emulator)

### Validation Commands:
```bash
npm run typecheck   # Typecheck TypeScript codebase
npm run build       # Build production bundle
```

---

## 📐 Architecture Overview

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed module boundary specifications, GPU state buffer pipelines, and WebXR frame budget guidelines.

---

## 📜 License

Licensed under the [MIT License](LICENSE).
