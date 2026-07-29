# SnowVR ❄️🏂

**SnowVR** is an open-source, high-fidelity WebXR procedural snow rendering and interaction sandbox. Ride a snowboard across a 120m arctic snowfield at up to 65 m/s, carve dynamic tracks into GPU-driven deformable terrain, and cast 5 elemental spells that reshape the landscape in real time — on desktop or in VR headsets.

**🌐 Live Demo:** [`https://boxwrench.github.io/SnowVR/`](https://boxwrench.github.io/SnowVR/)

---

## 🎮 Controls

### Desktop
| Input | Action |
|-------|--------|
| **W / S / ↑ / ↓** | Accelerate / Reverse |
| **A / D / ← / →** | Steer left / right (banks into turns) |
| **Spacebar** | Speed Boost (38 → 65 m/s / ~145 mph) |
| **Keys 1–5** | Select active spell |
| **Left Click / Shift / E** | Fire active spell stream |
| **Right Click + Drag** | Orbit camera |

### VR (Meta Quest 3 / WebXR)
* Click **🥽 Enter VR** to enter 3rd-person VR mode
* The headset camera automatically tracks behind your snowboard character
* Free 360° head-look while the surfer speeds across the landscape

---

## 🔮 Spells

| Key | Spell | Effect |
|-----|-------|--------|
| 1 | **Snow Carver** | Narrow precision wake with sleek twin side-berms |
| 2 | **Hydro Stream** | Continuous high-pressure liquid water jet that cuts fluid trenches and saturates wet slush |
| 3 | **Frost Spire** | Freezes tall crystalline ice columns rising out of the snow |
| 4 | **Thermal Melt** | Melts deep smooth trenches into shiny, reflective wet slush pools |
| 5 | **Vortex Mountain** | Pulls snow inward to build tall snow dune mountains |

---

## 🌟 Technical Features

* **GPU-Driven Terrain & Shader Displacement:** 120m × 120m high-density mesh grid (512×512 vertices) displaced entirely in the vertex shader with analytical sastrugi dune noise and triplanar rock cliff outcrops. Zero CPU geometry rebuilds per frame.
* **2048² Toroidal Snow Deformation Buffer:** Ping-pong `RGBA16F` half-float render targets tracking 4 physical surface state channels:
  * **R:** Trench depression depth & impact craters
  * **G:** Displaced mass (raised side-berms, Frost Spires, Vortex Mountains)
  * **B:** Hard ice compression factor
  * **A:** Water slush saturation with heat evaporation and wind drying
* **Physical Slump & Infill Simulation:** Anisotropic slump diffusion, berm-to-trench collapse, and windward upwind infill.
* **Advanced Snow Optics:**
  * **GGX Specular Slush Reflections** — wetness dynamically lowers roughness
  * **Subsurface Scattering (SSS)** — deep ice-blue backscatter through snow berms
  * **3D Grazing-Angle Glints** — procedural micro-crystal sparkles
* **3rd-Person Snowboard Character** with physics-based banking, velocity-scaled carving, and smooth trailing camera.
* **WebXR 3rd-Person VR** with `<XROrigin>` tracking behind the surfer — comfortable at high speed with no motion sickness.
* **Atmosphere:** 360° procedural mountain ring, 3,000 volumetric falling snowflakes, Bloom & Vignette post-processing, ACES Filmic tone mapping.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start local dev server (with Quest 3 emulator in dev mode)
npm run dev
```

Open `http://localhost:5174` in Chrome.

### Validation Commands
```bash
npm run typecheck   # TypeScript type checking
npm run build       # Production build
```

---

## 🌐 Deploy to GitHub Pages

```bash
# Option A: Automated (GitHub Actions deploys on every push to main)
git push origin main

# Option B: Manual CLI deployment
npm run deploy
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for step-by-step setup.

---

## 🛠️ Built With

* **WebXR** & **Meta Quest 3 IWER Emulator**
* **React 19** & **TypeScript 5.6**
* **Three.js 0.165.0** & **React Three Fiber 9.0**
* **`@react-three/xr` 6.6.30** & **`@react-three/drei`**
* **`@react-three/postprocessing`**
* **Vite 6.0**

---

## 📐 Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module boundaries, GPU state buffer pipelines, and WebXR frame budget guidelines.

---

## 📜 License

Licensed under the [MIT License](LICENSE).
