# SnowVR Shader and Terrain Reference

## Shared base heightfield

`src/snow/terrainMath.ts` evaluates the intended slope, transverse dune ridges, and sastrugi profile once into a 257 x 257 float grid over a 120 m square.

Texture coordinates map to world coordinates as:

```text
worldX = (u - 0.5) * 120
worldZ = (0.5 - v) * 120
```

Texture V therefore runs opposite world Z. The terrain vertex shader samples texel centers with nearest filtering so every mesh vertex receives exactly the corresponding heightfield value. CPU grounding interpolates the same grid using the same triangle diagonal as Three.js `PlaneGeometry`.

Dynamic deformation is intentionally not included in CPU collision or grounding yet.

## Deformation simulation

`SnowDeformationBuffer.ts` executes one fragment pass per frame over ping-pong 1024 x 1024 `RGBA16F` render targets.

| Channel | State |
| --- | --- |
| R | Depression depth |
| G | Berm or spire height |
| B | Ice compression |
| A | Wetness or slush |

The brush uses the same UV-to-world mapping as the heightfield. Stamp accumulation is scaled by `deltaTime * 72`, preserving the authored 72 Hz strength at 72, 80, 90, and 120 Hz. Diffusion, wind refill, and drying are already elapsed-time based.

The rendered displacement is:

```text
deformHeight = (-depression * 1.2 + berm * 1.8) * displacementScale
```

## Displaced normals

Normals sample adjacent base-height vertices and matching deformation coordinates. Because V and world Z are inverted:

```text
negative world Z -> uv + (0, texel)
positive world Z -> uv - (0, texel)
```

The central-difference normal is:

```text
normalize(heightNegX - heightPosX, 2 * worldStep, heightNegZ - heightPosZ)
```

## Surface shading

`SnowMaterial.ts` combines:

- wrapped sun diffuse and sky ambient;
- slope-based rock blending;
- depth-tinted subsurface backscatter;
- GGX wet/ice specular;
- Fresnel enhancement in the foveal region;
- multi-frequency snow micro-normals;
- screen-space quality tiers for glints and expensive shading.

Native fixed foveation is configured once by the XR store at `0.5`. The material's own foveal quality tiers are a separate shader optimization.
