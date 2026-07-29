import * as THREE from 'three'
import { getReferenceFrameScale } from './simulationTiming'

// High-fidelity FBO ping-pong compute shader: 4-channel surface state (R=depth, G=berm/height, B=ice, A=wetness)
const deformationSimFragmentShader = `
uniform sampler2D uCurrentState;
uniform vec2 uResolution;
uniform vec3 uBrushPos; // (x, z, radius)
uniform float uBrushDepth; // Positive = depress/trench, negative = build height/mound/spire
uniform float uBrushBerm;  // Side berm height multiplier
uniform float uBrushIce;   // Ice compression factor
uniform float uBrushWetness; // Water slush factor
uniform float uWindDecay;  // Refill decay speed
uniform float uDeltaTime;
uniform float uFrameScale; // Stamp amount relative to one 72 Hz reference frame
uniform vec2 uWindVector;  // Prevailing wind direction for anisotropic infill

varying vec2 vUv;

void main() {
  vec2 texel = 1.0 / uResolution;
  vec4 current = texture2D(uCurrentState, vUv);
  
  // 4-neighbor sample for slump diffusion (up, down, left, right)
  vec4 top    = texture2D(uCurrentState, vUv + vec2(0.0, texel.y));
  vec4 bottom = texture2D(uCurrentState, vUv - vec2(0.0, texel.y));
  vec4 left   = texture2D(uCurrentState, vUv - vec2(texel.x, 0.0));
  vec4 right  = texture2D(uCurrentState, vUv + vec2(texel.x, 0.0));
  
  // Upwind neighbor for wind-driven infill
  vec4 upwind = texture2D(uCurrentState, vUv - uWindVector * texel * 2.0);
  
  // Calculate distance in world space matching PlaneGeometry(120, 120) [-PI/2, 0, 0]
  vec2 worldXZ = vec2((vUv.x - 0.5) * 120.0, (0.5 - vUv.y) * 120.0);
  float dist = length(worldXZ - uBrushPos.xy);
  float radius = uBrushPos.z;
  
  // Smooth Gaussian brush stamp
  float stamp = 1.0 - smoothstep(0.0, radius, dist);
  
  // Raised side-berm ring (mass displacement on trench edges)
  float bermRing = smoothstep(radius * 0.2, radius * 0.75, dist) * (1.0 - smoothstep(radius * 0.85, radius * 1.6, dist));
  
  float depression = current.r;
  float berm = current.g;
  float ice = current.b;
  float wetness = current.a;

  if (uBrushDepth >= 0.0) {
    // DIG / TRENCH / MELT MODE (Spells 1, 2, 4)
    depression = clamp(depression + stamp * uBrushDepth * 0.45 * uFrameScale, 0.0, 1.0);
    berm = clamp(berm + bermRing * uBrushDepth * uBrushBerm * 0.55 * uFrameScale, 0.0, 1.0);
  } else {
    // BUILD HEIGHT / ICE SPIRE / VORTEX MOUNTAIN MODE (Spells 3, 5)
    float buildHeight = -uBrushDepth;
    berm = clamp(berm + stamp * buildHeight * 0.6 * uFrameScale, 0.0, 1.0);
    depression = max(0.0, depression - stamp * buildHeight * 0.5 * uFrameScale);
  }

  ice = clamp(ice + stamp * uBrushIce * 0.6 * uFrameScale, 0.0, 1.0);
  wetness = clamp(wetness + stamp * uBrushWetness * 0.6 * uFrameScale, 0.0, 1.0);
  
  // Anisotropic Slump Diffusion: Loose berms slump 3x faster than packed trench floor
  float neighborBermAvg = (top.g + bottom.g + left.g + right.g) * 0.25;
  float bermSlump = (berm - neighborBermAvg) * 2.2 * uDeltaTime;
  berm = max(0.0, berm - bermSlump);
  
  // Berm-into-depression slump (berms collapse back into nearby trenches)
  float bermToTrench = max(0.0, neighborBermAvg - current.r) * 1.2 * uDeltaTime;
  depression = max(0.0, depression - bermToTrench);
  
  // Wind-driven infill from upwind snow drift + exponential decay
  float windInfill = (upwind.r * 0.15 + uWindDecay * 0.04) * uDeltaTime;
  depression = max(0.0, depression - windInfill);
  berm = max(0.0, berm - windInfill * 0.5);
  
  // Evaporation & drying of wet slush
  wetness = max(0.0, wetness - uDeltaTime * 0.08);
  
  gl_FragColor = vec4(depression, berm, ice, wetness);
}
`

const deformationVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

export class SnowDeformationBuffer {
  private targetA: THREE.WebGLRenderTarget
  private targetB: THREE.WebGLRenderTarget
  private isA: boolean = true
  private simScene: THREE.Scene
  private simCamera: THREE.OrthographicCamera
  private simMaterial: THREE.ShaderMaterial
  private simMesh: THREE.Mesh

  constructor(resolution: number = 2048) {
    const options: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    }

    this.targetA = new THREE.WebGLRenderTarget(resolution, resolution, options)
    this.targetB = new THREE.WebGLRenderTarget(resolution, resolution, options)

    this.simScene = new THREE.Scene()
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.simMaterial = new THREE.ShaderMaterial({
      vertexShader: deformationVertexShader,
      fragmentShader: deformationSimFragmentShader,
      uniforms: {
        uCurrentState: { value: null },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uBrushPos: { value: new THREE.Vector3(999, 999, 0.5) },
        uBrushDepth: { value: 0 },
        uBrushBerm: { value: 1.2 },
        uBrushIce: { value: 0.0 },
        uBrushWetness: { value: 0.0 },
        uWindDecay: { value: 0.15 },
        uWindVector: { value: new THREE.Vector2(1.0, 0.3).normalize() },
        uDeltaTime: { value: 0.016 },
        uFrameScale: { value: 1.0 },
      },
    })

    this.simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial)
    this.simScene.add(this.simMesh)
  }

  public get texture(): THREE.Texture {
    return (this.isA ? this.targetA : this.targetB).texture
  }

  public update(
    renderer: THREE.WebGLRenderer,
    deltaTime: number,
    brushPos: THREE.Vector3,
    brushDepth: number,
    brushBerm: number,
    brushIce: number,
    brushWetness: number,
    windDecay: number
  ) {
    const readTarget = this.isA ? this.targetA : this.targetB
    const writeTarget = this.isA ? this.targetB : this.targetA

    this.simMaterial.uniforms.uCurrentState.value = readTarget.texture
    this.simMaterial.uniforms.uBrushPos.value.copy(brushPos)
    this.simMaterial.uniforms.uBrushDepth.value = brushDepth
    this.simMaterial.uniforms.uBrushBerm.value = brushBerm
    this.simMaterial.uniforms.uBrushIce.value = brushIce
    this.simMaterial.uniforms.uBrushWetness.value = brushWetness
    this.simMaterial.uniforms.uWindDecay.value = windDecay
    this.simMaterial.uniforms.uDeltaTime.value = Math.min(deltaTime, 0.05)
    this.simMaterial.uniforms.uFrameScale.value = getReferenceFrameScale(deltaTime)

    renderer.setRenderTarget(writeTarget)
    renderer.render(this.simScene, this.simCamera)
    renderer.setRenderTarget(null)

    this.isA = !this.isA
  }

  public dispose() {
    this.targetA.dispose()
    this.targetB.dispose()
    this.simMaterial.dispose()
    this.simMesh.geometry.dispose()
  }
}
