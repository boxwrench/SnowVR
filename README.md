# SnowVR ❄️🏂

**SnowVR** is a WebXR procedural snow rendering and downhill snowboarding interaction sandbox targeting 72 FPS on Meta Quest 3. Ride a snowboard down an arctic snowfield, carve dynamic tracks into GPU-driven deformable terrain, and cast elemental spells using Quest VR controllers or desktop inputs.

**🌐 Live Demo:** [`https://boxwrench.github.io/SnowVR/`](https://boxwrench.github.io/SnowVR/)

---

## 🎮 Controls

### Meta Quest 3 (WebXR VR)
| Input | Action |
|-------|--------|
| **Left Thumbstick** | Steer left / right & accelerate / reverse |
| **Right Controller Ray** | Aim elemental reticle across snowfield |
| **Right Trigger** | Fire active elemental spell stream |
| **Right A / B Buttons** | Cycle active spell |
| **Left Grip / Trigger** | Speed boost (16 → 28 m/s / ~62 mph) |
| **Haptics** | Tactile feedback on carving and spell casting |

### Desktop
| Input | Action |
|-------|--------|
| **W / S / ↑ / ↓** | Accelerate / Reverse |
| **A / D / ← / →** | Steer left / right (banks into turns) |
| **Spacebar** | Speed Boost (16 → 28 m/s) |
| **Keys 1–5** | Select active spell |
| **Left Click / Shift / E** | Fire active spell stream |
| **Right Click + Drag** | Orbit camera |

---

## 🔮 Spells

| Key | Spell | Effect |
|-----|-------|--------|
| 1 | **Snow Carver** | Precision wake with twin side-berms |
| 2 | **Hydro Stream** | High-pressure water jet that cuts fluid trenches and saturates wet slush |
| 3 | **Frost Spire** | Freezes crystalline ice columns rising out of the snow |
| 4 | **Thermal Melt** | Melts deep smooth trenches into reflective wet slush pools |
| 5 | **Vortex Mountain** | Pulls snow inward to build snow dune mounds |

---

## 🌟 Quest 3 Technical Architecture

* **Controller-First WebXR Experience:** Full support for Quest 3 thumbstick steering, ray aiming, trigger casting, button spell switching, and haptic feedback.
* **Controller-Only Downhill Run:** Continuous downhill slope along +Z with seamless position wrapping.
* **Grounded Physics & Shared Terrain Elevation:** Shared CPU/GPU terrain noise function (`terrainMath.ts`) grounds board, rider, reticle, and particle emitters.
* **1024² Toroidal Snow Deformation Buffer:** Ping-pong render targets tracking 4 surface channels:
  * **R:** Trench depression depth
  * **G:** Displaced berm/spire height
  * **B:** Hard ice compression
  * **A:** Water slush saturation
* **Web Audio Sound Effects:** Procedural wind and snow carving scrape audio generated dynamically via Web Audio API.
* **Quest 3 Performance Overlay:** Real-time FPS, frame time (ms), and target indicator (72 FPS). Developer tuning controls accessible via `?dev=1`.

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
```

---

## 🌐 Deployment

Automated GitHub Actions workflow deploys to GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

---

## 🛠️ Built With

* **React 19** & **TypeScript 5.6**
* **Three.js 0.165.0** & **React Three Fiber 9.0**
* **`@react-three/xr` 6.6.30** & **`@react-three/drei`**
* **Vite 6.0**

---

## 📜 License

Licensed under the [MIT License](LICENSE).
