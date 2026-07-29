# Contributing to SnowVR

We welcome contributions to **SnowVR**! Whether you are a graphics engineer, WebXR developer, technical artist, or educator, here is how to get started.

---

## 🛠️ Development Guidelines

1. **Strict TypeScript & Architecture:** All TypeScript code must compile without errors under `npm run typecheck`.
2. **GPU Performance First:** Keep draw calls low and maintain target frame rates (72-90 FPS) on standalone Quest 3 hardware. Vertex displacement must stay inside vertex shaders.
3. **Module Isolation:** Follow the component boundaries defined in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🧪 Verification Before Submitting PRs

Run the validation suite before submitting your PR:

```bash
npm run typecheck
npm run build
```
