import * as THREE from 'three'
import { referenceProbabilityToFrameProbability } from '../snow/simulationTiming'

/**
 * GPU-Based Particle System using ping-pong FBO textures.
 * 
 * All particle state (position, velocity, life, color) is stored in floating-point
 * textures and updated entirely on the GPU via a simulation fragment shader.
 * The CPU never touches individual particles — it only sets uniform parameters
 * (emitter position, forces, spell type) each frame.
 * 
 * Architecture:
 *   stateA (read) → sim shader → stateB (write) → swap → render pass
 */

const PARTICLE_TEX_SIZE = 128 // 128×128 = 16,384 particles on GPU

// ─── Simulation fragment shader (runs per-texel = per-particle) ───
const gpgpuSimFragment = `
uniform sampler2D uParticleState;    // Current state: RG = pos.xz, BA = vel.xz
uniform sampler2D uParticleState2;   // Current state2: R = pos.y, G = vel.y, B = life, A = maxLife
uniform vec2 uResolution;
uniform float uDeltaTime;
uniform vec4 uEmitterPosRadius;      // World XYZ position + radius
uniform float uEmitRate;             // 0.0–1.0 probability of respawning dead particles
uniform float uGravity;
uniform float uDrag;
uniform vec3 uWindForce;             // Global wind acceleration
uniform float uSpellType;            // 0=spray, 1=liquid, 2=frost, 3=thermal, 4=vortex
uniform float uTime;

varying vec2 vUv;

// Pseudo-random hash for GPU particle spawning
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + vec2(127.1, 311.7)));
}

void main() {
  vec2 texel = 1.0 / uResolution;
  vec4 state1 = texture2D(uParticleState, vUv);
  vec4 state2 = texture2D(uParticleState2, vUv);

  vec2 posXZ = state1.rg;
  vec2 velXZ = state1.ba;
  float posY = state2.r;
  float velY = state2.g;
  float life = state2.b;
  float maxLife = state2.a;

  // Unique particle seed from texel coordinate
  vec2 seed = vUv * uResolution + vec2(uTime * 7.31, uTime * 3.17);

  life -= uDeltaTime;

  if (life <= 0.0) {
    // ─── RESPAWN ───
    float shouldSpawn = step(1.0 - uEmitRate, hash(seed + vec2(0.5)));
    if (shouldSpawn > 0.5) {
      vec2 rng = hash2(seed);
      vec2 rng2 = hash2(seed + vec2(33.7, 77.1));
      float angle = rng.x * 6.2832;
      float radius = rng.y * uEmitterPosRadius.w;

      posXZ = uEmitterPosRadius.xz + vec2(cos(angle), sin(angle)) * radius;
      posY = uEmitterPosRadius.y;

      // Spell-specific spawn velocities
      if (uSpellType < 0.5) {
        // SPRAY: Snow wake — wide lateral scatter, moderate upward
        velXZ = vec2(cos(angle), sin(angle)) * (2.0 + rng2.x * 4.0);
        velY = 1.5 + rng2.y * 3.0;
        maxLife = 0.8 + rng.x * 0.6;
      } else if (uSpellType < 1.5) {
        // LIQUID STREAM: Water droplets — fast upward splash jet
        velXZ = vec2(cos(angle), sin(angle)) * (1.5 + rng2.x * 3.0);
        velY = 3.5 + rng2.y * 5.0;
        maxLife = 0.6 + rng.x * 0.5;
      } else if (uSpellType < 2.5) {
        // FROST: Crystalline sparkles — slow rise, gentle drift
        velXZ = vec2(cos(angle), sin(angle)) * (0.5 + rng2.x * 1.0);
        velY = 2.0 + rng2.y * 4.0;
        maxLife = 1.2 + rng.x * 1.0;
      } else if (uSpellType < 3.5) {
        // THERMAL: Steam/heat shimmer — strong upward, slow lateral
        velXZ = vec2(cos(angle), sin(angle)) * (0.3 + rng2.x * 0.8);
        velY = 4.0 + rng2.y * 6.0;
        maxLife = 1.0 + rng.x * 1.2;
      } else {
        // VORTEX: Spiral inward — tangential velocity
        float tangAngle = angle + 1.57;
        velXZ = vec2(cos(tangAngle), sin(tangAngle)) * (3.0 + rng2.x * 5.0);
        velY = 2.5 + rng2.y * 4.0;
        maxLife = 1.0 + rng.x * 0.8;
      }

      life = maxLife;
    } else {
      // Dead particle — park offscreen
      posXZ = vec2(9999.0);
      posY = -999.0;
      life = 0.0;
    }
  } else {
    // ─── PHYSICS UPDATE ───
    // Gravity
    velY -= uGravity * uDeltaTime;

    // Drag
    velXZ *= (1.0 - uDrag * uDeltaTime);
    velY *= (1.0 - uDrag * 0.5 * uDeltaTime);

    // Wind
    velXZ += uWindForce.xz * uDeltaTime;
    velY += uWindForce.y * uDeltaTime;

    // Vortex spiral force (only for vortex spell)
    if (uSpellType > 3.5) {
      vec2 toCenter = uEmitterPosRadius.xz - posXZ;
      float dist = length(toCenter);
      if (dist > 0.1) {
        vec2 inward = normalize(toCenter) * 3.0 * uDeltaTime;
        vec2 tangent = vec2(-toCenter.y, toCenter.x) / dist * 4.0 * uDeltaTime;
        velXZ += inward + tangent;
      }
    }

    // Integrate position
    posXZ += velXZ * uDeltaTime;
    posY += velY * uDeltaTime;

    // Floor bounce
    if (posY < uEmitterPosRadius.y) {
      posY = uEmitterPosRadius.y;
      velY = abs(velY) * 0.3;
    }
  }

  // Output: state1 = pos.xz, vel.xz | state2 = pos.y, vel.y, life, maxLife
  gl_FragColor = vec4(posXZ, velXZ);
  // NOTE: state2 is written by a second render pass (see update method)
}
`

const gpgpuSimFragment2 = `
uniform sampler2D uParticleState;
uniform sampler2D uParticleState2;
uniform vec2 uResolution;
uniform float uDeltaTime;
uniform vec4 uEmitterPosRadius;
uniform float uEmitRate;
uniform float uGravity;
uniform float uDrag;
uniform vec3 uWindForce;
uniform float uSpellType;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + vec2(127.1, 311.7)));
}

void main() {
  vec4 state1 = texture2D(uParticleState, vUv);
  vec4 state2 = texture2D(uParticleState2, vUv);

  vec2 posXZ = state1.rg;
  vec2 velXZ = state1.ba;
  float posY = state2.r;
  float velY = state2.g;
  float life = state2.b;
  float maxLife = state2.a;

  vec2 seed = vUv * uResolution + vec2(uTime * 7.31, uTime * 3.17);

  life -= uDeltaTime;

  if (life <= 0.0) {
    float shouldSpawn = step(1.0 - uEmitRate, hash(seed + vec2(0.5)));
    if (shouldSpawn > 0.5) {
      vec2 rng = hash2(seed);
      vec2 rng2 = hash2(seed + vec2(33.7, 77.1));
      float angle = rng.x * 6.2832;

      posY = uEmitterPosRadius.y;

      if (uSpellType < 0.5) {
        velY = 1.5 + rng2.y * 3.0;
        maxLife = 0.8 + rng.x * 0.6;
      } else if (uSpellType < 1.5) {
        velY = 3.5 + rng2.y * 5.0;
        maxLife = 0.6 + rng.x * 0.5;
      } else if (uSpellType < 2.5) {
        velY = 2.0 + rng2.y * 4.0;
        maxLife = 1.2 + rng.x * 1.0;
      } else if (uSpellType < 3.5) {
        velY = 4.0 + rng2.y * 6.0;
        maxLife = 1.0 + rng.x * 1.2;
      } else {
        velY = 2.5 + rng2.y * 4.0;
        maxLife = 1.0 + rng.x * 0.8;
      }
      life = maxLife;
    } else {
      posY = -999.0;
      life = 0.0;
    }
  } else {
    velY -= uGravity * uDeltaTime;
    velY *= (1.0 - uDrag * 0.5 * uDeltaTime);
    velY += uWindForce.y * uDeltaTime;
    posY += velY * uDeltaTime;
    if (posY < uEmitterPosRadius.y) {
      posY = uEmitterPosRadius.y;
      velY = abs(velY) * 0.3;
    }
  }

  gl_FragColor = vec4(posY, velY, life, maxLife);
}
`

const gpgpuVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

// ─── Render vertex shader: reads particle positions from FBO textures ───
const particleRenderVertex = `
uniform sampler2D uStateMap;
uniform sampler2D uStateMap2;
uniform float uTexSize;

varying float vLife;
varying float vMaxLife;
varying float vHeight;

void main() {
  // Map vertex index to texel UV in the state texture
  float idx = float(gl_VertexID);
  float u = mod(idx, uTexSize) / uTexSize + 0.5 / uTexSize;
  float v = floor(idx / uTexSize) / uTexSize + 0.5 / uTexSize;
  vec2 texUV = vec2(u, v);

  vec4 s1 = texture2D(uStateMap, texUV);
  vec4 s2 = texture2D(uStateMap2, texUV);

  vec3 particlePos = vec3(s1.r, s2.r, s1.g); // x = posXZ.x, y = posY, z = posXZ.y
  vLife = s2.b;
  vMaxLife = s2.a;
  vHeight = s2.r;

  vec4 mvPos = modelViewMatrix * vec4(particlePos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Size attenuation + life-based fade
  float lifeFrac = clamp(vLife / max(vMaxLife, 0.01), 0.0, 1.0);
  gl_PointSize = (3.0 + lifeFrac * 5.0) * (300.0 / -mvPos.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);
}
`

const particleRenderFragment = `
uniform vec3 uColor;
varying float vLife;
varying float vMaxLife;
varying float vHeight;

void main() {
  float lifeFrac = clamp(vLife / max(vMaxLife, 0.01), 0.0, 1.0);

  // Soft circular point sprite
  vec2 crd = gl_PointCoord * 2.0 - 1.0;
  float dist = length(crd);
  if (dist > 1.0) discard;
  float alpha = (1.0 - smoothstep(0.3, 1.0, dist)) * lifeFrac;

  // Height-based color shift: hotter/brighter near emission, fading as they fall
  vec3 col = uColor * (0.6 + lifeFrac * 0.6);
  col += vec3(0.2, 0.15, 0.05) * max(0.0, vHeight * 0.15);

  gl_FragColor = vec4(col, alpha * 0.85);
}
`

export class GPGPUParticleSystem {
  private stateA1: THREE.WebGLRenderTarget
  private stateB1: THREE.WebGLRenderTarget
  private stateA2: THREE.WebGLRenderTarget
  private stateB2: THREE.WebGLRenderTarget
  private isA: boolean = true

  private simScene: THREE.Scene
  private simCamera: THREE.OrthographicCamera
  private simMaterial1: THREE.ShaderMaterial
  private simMaterial2: THREE.ShaderMaterial
  private simMesh: THREE.Mesh

  // Public render mesh for adding to scene
  public readonly renderMesh: THREE.Points
  private renderMaterial: THREE.ShaderMaterial

  constructor(texSize: number = PARTICLE_TEX_SIZE) {
    const particleCount = texSize * texSize

    const fboOptions: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    }

    this.stateA1 = new THREE.WebGLRenderTarget(texSize, texSize, fboOptions)
    this.stateB1 = new THREE.WebGLRenderTarget(texSize, texSize, fboOptions)
    this.stateA2 = new THREE.WebGLRenderTarget(texSize, texSize, fboOptions)
    this.stateB2 = new THREE.WebGLRenderTarget(texSize, texSize, fboOptions)

    // Sim scene (fullscreen quad for FBO passes)
    this.simScene = new THREE.Scene()
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const commonUniforms = {
      uParticleState: { value: null as THREE.Texture | null },
      uParticleState2: { value: null as THREE.Texture | null },
      uResolution: { value: new THREE.Vector2(texSize, texSize) },
      uDeltaTime: { value: 0.016 },
      uEmitterPosRadius: { value: new THREE.Vector4(0, 0, 0, 1.0) },
      uEmitRate: { value: 0.3 },
      uGravity: { value: 5.0 },
      uDrag: { value: 1.8 },
      uWindForce: { value: new THREE.Vector3(0.5, 0.0, 0.15) },
      uSpellType: { value: 0.0 },
      uTime: { value: 0.0 },
    }

    this.simMaterial1 = new THREE.ShaderMaterial({
      vertexShader: gpgpuVertexShader,
      fragmentShader: gpgpuSimFragment,
      uniforms: THREE.UniformsUtils.clone(commonUniforms),
    })

    this.simMaterial2 = new THREE.ShaderMaterial({
      vertexShader: gpgpuVertexShader,
      fragmentShader: gpgpuSimFragment2,
      uniforms: THREE.UniformsUtils.clone(commonUniforms),
    })

    this.simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial1)
    this.simScene.add(this.simMesh)

    // ─── Render Points ───
    const dummyGeom = new THREE.BufferGeometry()
    const indices = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) indices[i] = i
    dummyGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3))

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particleRenderVertex,
      fragmentShader: particleRenderFragment,
      uniforms: {
        uStateMap: { value: null },
        uStateMap2: { value: null },
        uTexSize: { value: texSize },
        uColor: { value: new THREE.Color('#74d7ee') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.renderMesh = new THREE.Points(dummyGeom, this.renderMaterial)
    this.renderMesh.frustumCulled = false
  }

  public update(
    renderer: THREE.WebGLRenderer,
    deltaTime: number,
    time: number,
    emitterPosRadius: THREE.Vector4,
    emitRate: number,
    spellType: number,
    color: THREE.Color
  ) {
    const readState1 = this.isA ? this.stateA1 : this.stateB1
    const writeState1 = this.isA ? this.stateB1 : this.stateA1
    const readState2 = this.isA ? this.stateA2 : this.stateB2
    const writeState2 = this.isA ? this.stateB2 : this.stateA2

    const dt = Math.min(deltaTime, 0.05)

    // Update uniforms for both sim passes
    const syncUniforms = (mat: THREE.ShaderMaterial) => {
      mat.uniforms.uParticleState.value = readState1.texture
      mat.uniforms.uParticleState2.value = readState2.texture
      mat.uniforms.uDeltaTime.value = dt
      mat.uniforms.uEmitterPosRadius.value.copy(emitterPosRadius)
      mat.uniforms.uEmitRate.value = referenceProbabilityToFrameProbability(emitRate, dt)
      mat.uniforms.uSpellType.value = spellType
      mat.uniforms.uTime.value = time
    }

    // Pass 1: Update state1 (posXZ, velXZ)
    syncUniforms(this.simMaterial1)
    this.simMesh.material = this.simMaterial1
    renderer.setRenderTarget(writeState1)
    renderer.render(this.simScene, this.simCamera)

    // Pass 2: Update state2 (posY, velY, life, maxLife)
    syncUniforms(this.simMaterial2)
    this.simMesh.material = this.simMaterial2
    renderer.setRenderTarget(writeState2)
    renderer.render(this.simScene, this.simCamera)

    renderer.setRenderTarget(null)

    // Swap read/write targets
    this.isA = !this.isA

    // Update render material to read from the just-written state
    this.renderMaterial.uniforms.uStateMap.value = writeState1.texture
    this.renderMaterial.uniforms.uStateMap2.value = writeState2.texture
    this.renderMaterial.uniforms.uColor.value.copy(color)
  }

  public dispose() {
    this.stateA1.dispose()
    this.stateB1.dispose()
    this.stateA2.dispose()
    this.stateB2.dispose()
    this.simMaterial1.dispose()
    this.simMaterial2.dispose()
    this.renderMaterial.dispose()
    this.renderMesh.geometry.dispose()
    this.simMesh.geometry.dispose()
  }
}
