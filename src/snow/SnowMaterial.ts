import * as THREE from 'three'
import {
  DEEP_ICE_COLOR,
  HORIZON_COLOR,
  ROCK_COLOR,
  SUN_COLOR,
  getSunDirection,
} from '../environment/atmosphereConfig'

const snowVertexShader = `
#include <common>
#include <fog_pars_vertex>

uniform sampler2D uDeformationMap;
uniform sampler2D uTerrainHeightMap;
uniform sampler2D uTerrainGradientMap;
uniform float uDisplacementScale;
uniform float uTerrainGridSize;
uniform float uTerrainWorldSize;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vDeformation;
varying float vSlope;
varying vec4 vClipPos;

vec2 terrainTexelUv(vec2 planeUv) {
  return (clamp(planeUv, 0.0, 1.0) * (uTerrainGridSize - 1.0) + 0.5)
    / uTerrainGridSize;
}

float sampleTerrainHeight(vec2 planeUv) {
  return texture2D(uTerrainHeightMap, terrainTexelUv(planeUv)).r;
}

float sampleDeformationHeight(vec4 deform) {
  // Wet displaced mass forms taller Hydro Stream halfpipe walls.
  return -deform.r * 1.2 + deform.g * (1.8 + deform.a * 1.4);
}

void main() {
  vUv = uv;
  
  // Sample deformation state buffer: R = depression, G = raised berm/spire, B = ice, A = wetness
  vec4 deform = texture2D(uDeformationMap, uv);
  vDeformation = deform;
  
  float naturalHeight = sampleTerrainHeight(uv);
  // Allow positive berm height to build side berms and vortex mountains.
  float deformHeight = sampleDeformationHeight(deform) * uDisplacementScale;
  
  // Displace local Z (which maps to World Y when plane is rotated [-PI/2, 0, 0])
  vec3 displacedPosition = position;
  displacedPosition.z += naturalHeight + deformHeight;
  
  vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
  
  // Plane UV V runs opposite world Z after rotation.
  float uvStep = 1.0 / (uTerrainGridSize - 1.0);
  float worldStep = uTerrainWorldSize / (uTerrainGridSize - 1.0);
  vec2 uvNegX = uv - vec2(uvStep, 0.0);
  vec2 uvPosX = uv + vec2(uvStep, 0.0);
  vec2 uvNegZ = uv + vec2(0.0, uvStep);
  vec2 uvPosZ = uv - vec2(0.0, uvStep);

  // Base height differences arrive precomputed; only the deformation half of
  // the central difference is sampled per frame. Differences add linearly, so
  // this is identical to sampling all four base neighbours.
  vec2 baseGradient = texture2D(uTerrainGradientMap, terrainTexelUv(uv)).rg;

  vec4 deformL = texture2D(uDeformationMap, clamp(uvNegX, 0.0, 1.0));
  vec4 deformR = texture2D(uDeformationMap, clamp(uvPosX, 0.0, 1.0));
  vec4 deformD = texture2D(uDeformationMap, clamp(uvNegZ, 0.0, 1.0));
  vec4 deformU = texture2D(uDeformationMap, clamp(uvPosZ, 0.0, 1.0));

  float deformGradX = (sampleDeformationHeight(deformL) - sampleDeformationHeight(deformR))
    * uDisplacementScale;
  float deformGradZ = (sampleDeformationHeight(deformD) - sampleDeformationHeight(deformU))
    * uDisplacementScale;

  vec3 normalCalc = normalize(vec3(
    baseGradient.x + deformGradX,
    2.0 * worldStep,
    baseGradient.y + deformGradZ
  ));
  vWorldNormal = normalCalc;
  
  // Slope calculation for triplanar rock shading on steep faces
  vSlope = 1.0 - max(0.0, dot(vWorldNormal, vec3(0.0, 1.0, 0.0)));
  
  // fog_vertex reads mvPosition from scope, so name it explicitly.
  vec4 mvPosition = viewMatrix * vec4(vWorldPosition, 1.0);
  vec4 clipPos = projectionMatrix * mvPosition;
  vClipPos = clipPos;
  gl_Position = clipPos;

  #include <fog_vertex>
}
`

const snowFragmentShader = `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uDeepIceColor;
uniform vec3 uRockColor;
uniform float uGlintScale;
uniform float uGlintIntensity;

// Foveated rendering uniforms
uniform vec2 uFoveaCenter;   // NDC screen focus point (0.5, 0.5 = center)
uniform float uFoveaRadius;  // Radius of full-quality foveal region (0.0–1.0)

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vDeformation;
varying float vSlope;
varying vec4 vClipPos;

// ─── FOVEAL-ENHANCED: Multi-octave 3D glint hash (sharper, richer sparkles) ───
float glintHash3D(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float glintHash3D_HQ(vec3 p) {
  // Two-octave glint: primary sparkle + fine micro-facet sub-sparkle
  float primary = glintHash3D(p);
  float fine = glintHash3D(p * 3.17 + vec3(7.31, 2.89, 5.43));
  return max(primary, fine * 0.7);
}

// GGX Specular Distribution (Trowbridge-Reitz)
float D_GGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float d = (NdotH * a2 - NdotH) * NdotH + 1.0;
  return a2 / (3.14159265 * d * d);
}

// ─── FOVEAL-ENHANCED: Fresnel-Schlick for physically correct rim highlights ───
float F_Schlick(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  // ─── FOVEATION: Compute quality level from screen-space distance to focus ───
  vec2 screenUV = vClipPos.xy / vClipPos.w * 0.5 + 0.5;
  float fovealDist = length(screenUV - uFoveaCenter);
  // 0.0 = dead center (maximum quality), 1.0 = far periphery (cheap path)
  float periphery = smoothstep(uFoveaRadius, uFoveaRadius + 0.25, fovealDist);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 H = normalize(L + V);

  float NdotV = max(0.0, dot(N, V));
  float NdotL = max(0.0, dot(N, L));
  float NdotH = max(0.0, dot(N, H));

  // ─── MICRO-NORMAL PERTURBATION ───
  // Foveal: Multi-frequency detail normals for crisp snow grain texture
  // Peripheral: Skip entirely — use smooth interpolated normal
  if (periphery < 0.5) {
    float microFreq = mix(35.0, 20.0, periphery * 2.0); // Higher freq at center
    float microAmp = mix(0.045, 0.03, periphery * 2.0);  // Stronger at center
    vec3 microNoise = vec3(
      sin(vWorldPosition.x * microFreq) * microAmp + sin(vWorldPosition.x * microFreq * 2.7) * microAmp * 0.4,
      0.0,
      cos(vWorldPosition.z * microFreq) * microAmp + cos(vWorldPosition.z * microFreq * 2.7) * microAmp * 0.4
    );
    N = normalize(N + microNoise);
    // Recompute dot products with perturbed normal
    NdotH = max(0.0, dot(N, H));
    NdotL = max(0.0, dot(N, L));
    NdotV = max(0.0, dot(N, V));
  }

  float wrappedDiffuse = max(0.0, (dot(N, L) + 0.35) / 1.35);

  // ─── SURFACE STATE CHANNELS ───
  float iceFactor = vDeformation.b;
  float wetnessFactor = vDeformation.a;

  // ─── SUBSURFACE SCATTERING ───
  // Foveal: Full SSS backscatter with depth-dependent color shift
  // Peripheral: Flat tinted ambient (cheap)
  float depthThickness = clamp(vDeformation.r * 1.8 + vDeformation.g * 1.2, 0.0, 1.0);
  vec3 sssLighting;
  if (periphery < 0.6) {
    float sssBackscatter = max(0.0, dot(-V, L + N * 0.4));
    // Foveal enhancement: depth-dependent blue shift + view-grazing rim scatter
    float rimScatter = pow(1.0 - NdotV, 3.0) * 0.3 * (1.0 - periphery);
    vec3 sssColor = mix(vec3(0.95, 0.98, 1.0), uDeepIceColor, depthThickness * 0.9);
    sssLighting = sssColor * (sssBackscatter + rimScatter) * 0.5 * (1.0 - vSlope);
  } else {
    sssLighting = uDeepIceColor * depthThickness * 0.1;
  }

  // ─── GRAZING-ANGLE GLINTS (Micro crystal sparkles) ───
  // Foveal: Enhanced dual-octave glint hash with narrow specular lobe
  // Mid-ring: Standard single-octave glints
  // Peripheral: Skip completely — invisible in peripheral vision
  float grazingGlint = 0.0;
  if (periphery < 0.15) {
    // FOVEAL CENTER: Premium dual-octave glints + sharper pow exponent
    vec3 glintPos = vWorldPosition * uGlintScale;
    float sparkler = step(0.978, glintHash3D_HQ(floor(glintPos)));
    grazingGlint = sparkler * pow(NdotH, 64.0) * uGlintIntensity * 1.4 * (1.0 - vSlope);
  } else if (periphery < 0.45) {
    // MID-RING: Standard single-octave glints
    vec3 glintPos = vWorldPosition * uGlintScale;
    float sparkler = step(0.982, glintHash3D(floor(glintPos)));
    grazingGlint = sparkler * pow(NdotH, 48.0) * uGlintIntensity * (1.0 - vSlope);
  }
  // else: periphery >= 0.45 → glints = 0.0 (skipped)

  // ─── GGX SPECULAR / WET SLUSH REFLECTIONS ───
  // Foveal: Full GGX + Fresnel-Schlick + energy conservation
  // Peripheral: Cheap Blinn-Phong approximation
  float roughness = mix(0.85, 0.12, wetnessFactor + iceFactor * 0.5);
  float specWeight = 0.04 + wetnessFactor * 0.6 + iceFactor * 0.4;
  float specular;
  if (periphery < 0.55) {
    specular = D_GGX(NdotH, roughness) * specWeight;
    // Foveal enhancement: Fresnel rim brightening for wet/ice surfaces
    if (periphery < 0.25) {
      float fresnel = F_Schlick(NdotV, 0.04 + wetnessFactor * 0.3);
      specular *= (1.0 + fresnel * 1.5);
    }
  } else {
    // Peripheral: cheap Blinn-Phong fallback
    specular = pow(NdotH, 16.0) * specWeight * 0.5;
  }

  // ─── BASE COLOR ───
  vec3 snowBaseColor = mix(vec3(0.94, 0.97, 1.0), vec3(0.45, 0.75, 0.95), iceFactor);
  snowBaseColor = mix(snowBaseColor, vec3(0.35, 0.55, 0.7), wetnessFactor * 0.5);

  // Triplanar Rock Slope Blend (runs at all quality tiers — cheap enough)
  float rockFactor = smoothstep(0.4, 0.7, vSlope);
  vec3 surfaceBaseColor = mix(snowBaseColor, uRockColor, rockFactor);

  // Spherical Harmonics (SH) Sky Ambient with Snow Bounce
  vec3 skyAmbient = mix(uSkyColor * 0.5, vec3(0.85, 0.92, 0.98), max(0.0, -N.y) * 0.4);

  // ─── CAVITY OCCLUSION ───
  // Depression occludes the sky hemisphere. Without this, trenches and melt
  // holes are lit as brightly as flat snow and read as paint, not depth.
  // Runs at all quality tiers: two instructions, and the shape it gives the
  // carved surface is exactly what the peripheral tiers cannot afford to lose.
  float cavityAo = 1.0 - clamp(vDeformation.r * 0.85, 0.0, 0.7);

  // ─── FINAL COMPOSITE ───
  vec3 diffuseLighting = uSunColor * wrappedDiffuse * surfaceBaseColor * cavityAo;
  vec3 glintLighting = vec3(1.0, 0.98, 0.9) * grazingGlint * (1.0 - wetnessFactor);
  vec3 specLighting = uSunColor * specular;

  vec3 finalColor = skyAmbient * cavityAo + diffuseLighting + sssLighting + glintLighting + specLighting;

  gl_FragColor = vec4(finalColor, 1.0);

  // Match the built-in material output order exactly: tone map, encode, then
  // fog in output space. Scene fog replaces the previous bespoke blend so the
  // terrain hazes identically to the poles, backdrop, and falling snow.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

export function createSnowMaterial(
  terrainHeightMap: THREE.DataTexture,
  terrainGradientMap: THREE.DataTexture,
  terrainGridSize: number,
  terrainWorldSize: number,
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: snowVertexShader,
    fragmentShader: snowFragmentShader,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uDeformationMap: { value: null },
        uTerrainHeightMap: { value: null },
        uTerrainGradientMap: { value: null },
        uDisplacementScale: { value: 1.0 },
        uTerrainGridSize: { value: terrainGridSize },
        uTerrainWorldSize: { value: terrainWorldSize },
        uSunDirection: { value: getSunDirection(new THREE.Vector3()) },
        uSunColor: { value: new THREE.Color(SUN_COLOR) },
        uSkyColor: { value: new THREE.Color(HORIZON_COLOR) },
        uDeepIceColor: { value: new THREE.Color(DEEP_ICE_COLOR) },
        uRockColor: { value: new THREE.Color(ROCK_COLOR) },
        uGlintScale: { value: 85.0 },
        uGlintIntensity: { value: 2.5 },
        // Foveated rendering
        uFoveaCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uFoveaRadius: { value: 0.28 },
      },
    ]),
    // Opts the terrain into scene fog. Without this the USE_FOG define is
    // never set and the fog chunks compile to nothing.
    fog: true,
    side: THREE.DoubleSide,
  })

  // UniformsUtils.merge deep-clones uniform values, so the caller's texture is
  // attached after the merge to guarantee identity.
  material.uniforms.uTerrainHeightMap.value = terrainHeightMap
  material.uniforms.uTerrainGradientMap.value = terrainGradientMap

  return material
}
