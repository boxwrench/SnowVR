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
  
  vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
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

// Screen-centre LOD uniforms. These are NOT eye-tracked foveation: uLodCenter
// is static, and native fixed foveated rendering is configured separately via
// gl.xr.setFoveation in src/xr/store.ts.
uniform vec2 uLodCenter;   // NDC screen focus point (0.5, 0.5 = center)
uniform float uLodRadius;  // Radius of full-quality center region (0.0–1.0)

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vDeformation;
varying float vSlope;
varying vec4 vClipPos;

// ─── CENTRE-ENHANCED: Multi-octave 3D glint hash (sharper, richer sparkles) ───
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

// ─── CENTRE-ENHANCED: Fresnel-Schlick for physically correct rim highlights ───
float F_Schlick(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  // ─── SCREEN-CENTRE LOD: Compute quality level from screen-space distance to focus ───
  vec2 screenUV = vClipPos.xy / vClipPos.w * 0.5 + 0.5;
  float lodDist = length(screenUV - uLodCenter);
  // 0.0 = dead center (maximum quality), 1.0 = far periphery (cheap path)
  float periphery = smoothstep(uLodRadius, uLodRadius + 0.25, lodDist);

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 H = normalize(L + V);

  float NdotV = max(0.0, dot(N, V));
  float NdotL = max(0.0, dot(N, L));
  float NdotH = max(0.0, dot(N, H));

  // ─── MICRO-NORMAL PERTURBATION ───
  // Centre: Multi-frequency detail normals for crisp snow grain texture
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
  // Centre: Full SSS backscatter with depth-dependent color shift
  // Peripheral: Flat tinted ambient (cheap)
  float depthThickness = clamp(vDeformation.r * 1.8 + vDeformation.g * 1.2, 0.0, 1.0);
  vec3 sssLighting;
  if (periphery < 0.6) {
    float sssBackscatter = max(0.0, dot(-V, L + N * 0.4));
    // Centre enhancement: depth-dependent blue shift + view-grazing rim scatter
    float rimScatter = pow(1.0 - NdotV, 3.0) * 0.3 * (1.0 - periphery);
    vec3 sssColor = mix(vec3(0.95, 0.98, 1.0), uDeepIceColor, depthThickness * 0.9);
    sssLighting = sssColor * (sssBackscatter + rimScatter) * 0.5 * (1.0 - vSlope);
  } else {
    sssLighting = uDeepIceColor * depthThickness * 0.1;
  }

  // ─── GRAZING-ANGLE GLINTS (Micro crystal sparkles) ───
  // Centre: Enhanced dual-octave glint hash with narrow specular lobe
  // Mid-ring: Standard single-octave glints
  // Peripheral: Skip completely — invisible in peripheral vision
  float grazingGlint = 0.0;
  if (periphery < 0.15) {
    // CENTRE: Premium dual-octave glints + sharper pow exponent
    vec3 glintPos = vWorldPosition * uGlintScale;
    float sparkler = step(0.978, glintHash3D_HQ(floor(glintPos)));
    grazingGlint = sparkler * pow(NdotH, 64.0) * uGlintIntensity * 1.4 * (1.0 - vSlope);
  } else if (periphery < 0.45) {
    // MID-RING: Standard single-octave glints
    vec3 glintPos = vWorldPosition * uGlintScale;
    float sparkler = step(0.982, glintHash3D(floor(glintPos)));
    grazingGlint = sparkler * pow(NdotH, 32.0) * uGlintIntensity * (1.0 - vSlope);
  }

  // ─── PHYSICAL SPECULAR (GGX + Schlick Rim) ───
  float roughness = mix(0.72, 0.18, iceFactor); // Ice is smooth & glossy
  float f0 = mix(0.04, 0.4, iceFactor);          // Ice has higher reflectivity
  float D = D_GGX(NdotH, roughness);
  float F = F_Schlick(NdotV, f0);
  float specTerm = D * F * wrappedDiffuse * 0.65;

  // ─── CAVITY OCCLUSION ───
  // Carved trenches and melt holes receive less ambient light from the sky dome.
  float cavityAo = 1.0 - clamp(vDeformation.r * 0.85, 0.0, 0.7);

  // ─── BASE COLOR COMPOSITION ───
  vec3 freshSnowColor = vec3(0.96, 0.98, 1.0);
  vec3 iceColor = mix(uDeepIceColor, vec3(0.8, 0.95, 1.0), 0.35);

  vec3 baseColor = mix(freshSnowColor, iceColor, iceFactor * 0.7);
  baseColor = mix(baseColor, uDeepIceColor * 0.7, wetnessFactor * 0.5);
  
  // Triplanar rock blending on steep faces (cliff walls)
  vec3 rockTex = uRockColor * (0.8 + 0.4 * glintHash3D(floor(vWorldPosition * 4.0)));
  float rockBlend = smoothstep(0.35, 0.75, vSlope);
  baseColor = mix(baseColor, rockTex, rockBlend);

  // ─── FINAL LIGHTING & AMBIENT SHADING ───
  vec3 ambientLight = uSkyColor * (0.42 + N.y * 0.28) * cavityAo;
  vec3 directLight = uSunColor * wrappedDiffuse * 1.05;

  vec3 finalColor = baseColor * (ambientLight + directLight) + sssLighting;
  finalColor += vec3(specTerm);
  finalColor += uSunColor * grazingGlint;

  gl_FragColor = vec4(finalColor, 1.0);

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
        // Screen-centre LOD
        uLodCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uLodRadius: { value: 0.28 },
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
