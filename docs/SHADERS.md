# SnowVR Shader & Mathematics Reference

This document explains the mathematical formulas and GLSL shader pipelines used in **SnowVR**.

---

## 🧪 1. FBO Simulation Compute Shader (`SnowDeformationBuffer.ts`)

The simulation shader executes a 2D fragment pass over a 2048×2048 `RGBA16F` texture.

### UV-to-World Coordinate Mapping:
$$\text{worldXZ} = \left( (uv.x - 0.5) \cdot 120.0, (0.5 - uv.y) \cdot 120.0 \right)$$

### Anisotropic Slump Diffusion:
Loose berms slump faster than packed trench floors:
$$\text{neighborBermAvg} = \frac{\text{top.g} + \text{bottom.g} + \text{left.g} + \text{right.g}}{4}$$
$$\text{bermSlump} = (\text{berm} - \text{neighborBermAvg}) \cdot 2.2 \cdot \Delta t$$

### Berm-to-Depression Collapse:
$$\text{bermToTrench} = \max(0, \text{neighborBermAvg} - \text{depression}) \cdot 1.2 \cdot \Delta t$$

---

## ❄️ 2. Terrain Vertex Shader (`SnowMaterial.ts`)

### Terrain Height Noise Stack:
$$\text{height} = \text{sin}(\text{windP.x} \cdot 0.12) \cdot 2.8 + \text{gradientNoise}(\text{windP} \cdot 0.05) \cdot 3.5 + \text{sastrugi} + \text{rockBump}$$

### Displaced Vertex Normal Calculation (Central Differences):
$$\mathbf{N} = \text{normalize}\left( \begin{pmatrix} h(x - \epsilon, z) - h(x + \epsilon, z) \\ 2\epsilon \\ h(x, z - \epsilon) - h(x, z + \epsilon) \end{pmatrix} \right)$$

---

## 💎 3. Micro-Crystal Glint & SSS Shading (`SnowMaterial.ts`)

### Subsurface Scattering Back-Scatter:
$$\text{sssBackscatter} = \max\left(0, -\mathbf{V} \cdot (\mathbf{L} + 0.4\mathbf{N})\right)$$

### Procedural 3D Micro-Facet Glints:
Glint sparkles flash when the half-vector $\mathbf{H} = \text{normalize}(\mathbf{L} + \mathbf{V})$ aligns with grazing micro-facets:
$$\text{glint} = \text{step}\left(0.982, \text{hash3D}(\lfloor \mathbf{P} \cdot \text{scale} \rfloor)\right) \cdot \left(\max(0, \mathbf{N} \cdot \mathbf{H})\right)^{48}$$

### GGX Wet Slush Specular Distribution:
$$D_{\text{GGX}}(N \cdot H, \alpha) = \frac{\alpha^2}{\pi \left( (N \cdot H)^2 (\alpha^2 - 1) + 1 \right)^2}$$
where roughness $\alpha$ is derived from the wetness channel $A$.
