import * as THREE from 'three'

const snowVertexShader = `
uniform sampler2D uDeformationMap;
uniform float uDisplacementScale;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vDeformation;
varying float vSlope;
varying vec4 vClipPos;

// Analytical gradient noise with derivatives for anisotropic wind dunes & rock outcrops
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
}

float gradientNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}

// Multi-scale terrain noise (broad dune ridges + sheared sastrugi + rock outcrops)
float terrainHeight(vec3 worldPos) {
  vec2 p = worldPos.xz;
  
  // Downhill slope matching terrainMath.ts
  float slope = -p.y * 0.12;
  
  // 1. Broad transverse dune ridges (sheared along prevailing wind [1.0, 0.3])
  vec2 windP = vec2(p.x * 0.4 + p.y * 0.12, p.y * 0.4 - p.x * 0.12);
  float duneRidges = sin(windP.x * 0.12) * 1.8 + gradientNoise(vec3(windP * 0.05, 0.0)) * 2.5;
  
  // 2. Medium sastrugi ripples (lee-face asymmetry)
  float sastrugi = gradientNoise(vec3(windP * 0.35, 1.2)) * 0.6;
  
  return slope + duneRidges + sastrugi;
}

void main() {
  vUv = uv;
  vec4 initialWorldPos = modelMatrix * vec4(position, 1.0);
  
  // Sample deformation state buffer: R = depression, G = raised berm/spire, B = ice, A = wetness
  vec4 deform = texture2D(uDeformationMap, uv);
  vDeformation = deform;
  
  float naturalHeight = terrainHeight(initialWorldPos.xyz);
  // Allow positive berm height to build high ice spires & vortex mountains!
  float deformHeight = (-deform.r * 1.2 + deform.g * 1.8) * uDisplacementScale;
  
  // Displace local Z (which maps to World Y when plane is rotated [-PI/2, 0, 0])
  vec3 displacedPosition = position;
  displacedPosition.z += naturalHeight + deformHeight;
  
  vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
  
  // Compute smooth displaced vertex normal via central differences in world space
  float eps = 0.3;
  float hL = terrainHeight(vWorldPosition - vec3(eps, 0.0, 0.0));
  float hR = terrainHeight(vWorldPosition + vec3(eps, 0.0, 0.0));
  float hD = terrainHeight(vWorldPosition - vec3(0.0, 0.0, eps));
  float hU = terrainHeight(vWorldPosition + vec3(0.0, 0.0, eps));
  
  vec2 uvEps = vec2(eps / 120.0);
  vec4 deformL = texture2D(uDeformationMap, uv - vec2(uvEps.x, 0.0));
  vec4 deformR = texture2D(uDeformationMap, uv + vec2(uvEps.x, 0.0));
  vec4 deformD = texture2D(uDeformationMap, uv - vec2(0.0, uvEps.y));
  vec4 deformU = texture2D(uDeformationMap, uv + vec2(0.0, uvEps.y));
  
  hL += (-deformL.r * 1.2 + deformL.g * 1.8) * uDisplacementScale;
  hR += (-deformR.r * 1.2 + deformR.g * 1.8) * uDisplacementScale;
  hD += (-deformD.r * 1.2 + deformD.g * 1.8) * uDisplacementScale;
  hU += (-deformU.r * 1.2 + deformU.g * 1.8) * uDisplacementScale;
  
  vec3 normalCalc = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
  vWorldNormal = normalCalc;
  
  // Slope calculation for triplanar rock shading on steep faces
  vSlope = 1.0 - max(0.0, dot(vWorldNormal, vec3(0.0, 1.0, 0.0)));
  
  vec4 clipPos = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
  vClipPos = clipPos;
  gl_Position = clipPos;
}
`

const snowFragmentShader = `
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
uniform vec2 uResolution;    // Viewport resolution in pixels

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

  // ─── FINAL COMPOSITE ───
  vec3 diffuseLighting = uSunColor * wrappedDiffuse * surfaceBaseColor;
  vec3 glintLighting = vec3(1.0, 0.98, 0.9) * grazingGlint * (1.0 - wetnessFactor);
  vec3 specLighting = uSunColor * specular;

  vec3 finalColor = skyAmbient + diffuseLighting + sssLighting + glintLighting + specLighting;

  // Distance Fog blending (runs at all quality tiers)
  float dist = length(cameraPosition - vWorldPosition);
  float fogFactor = smoothstep(40.0, 110.0, dist);
  finalColor = mix(finalColor, uSkyColor, fogFactor * 0.75);

  gl_FragColor = vec4(finalColor, 1.0);
}
`

export function createSnowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: snowVertexShader,
    fragmentShader: snowFragmentShader,
    uniforms: {
      uDeformationMap: { value: null },
      uDisplacementScale: { value: 1.0 },
      uSunDirection: { value: new THREE.Vector3(3, 5, 4).normalize() },
      uSunColor: { value: new THREE.Color('#fff0d6') },
      uSkyColor: { value: new THREE.Color('#2b5c7e') },
      uDeepIceColor: { value: new THREE.Color('#024773') },
      uRockColor: { value: new THREE.Color('#2d3138') },
      uGlintScale: { value: 85.0 },
      uGlintIntensity: { value: 2.5 },
      // Foveated rendering
      uFoveaCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uFoveaRadius: { value: 0.28 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
    },
    side: THREE.DoubleSide,
  })
}
