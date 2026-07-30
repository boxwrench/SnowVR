import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { gradientNoise3D } from '../snow/terrainMath'
import {
  HORIZON_COLOR,
  MOUNTAIN_BASE_Y,
  MOUNTAIN_RING_HEIGHT,
  MOUNTAIN_RING_RADIUS,
  PEAK_COLOR,
} from './atmosphereConfig'

interface BackdropLayer {
  readonly radius: number
  readonly height: number
  readonly baseY: number
  readonly radialSegments: number
  readonly heightSegments: number
  /** Ridge displacement amplitudes for three octaves, in metres. */
  readonly amplitudes: readonly [number, number, number]
  /** Noise seed, so no two layers share a silhouette. */
  readonly seed: number
  /** Ridge rock tone in shadow. */
  readonly baseColor: string
  /** How strongly aerial perspective pulls this layer toward the horizon. */
  readonly haze: number
  /** Height fraction above which snowcaps appear. */
  readonly snowLine: number
}

/**
 * Three rings at different distances. They parallax against each other as the
 * rider travels, and that relative motion is what makes a backdrop read as
 * depth rather than as a painted wall. Ordered far to near so painter's-order
 * compositing is correct.
 *
 * The backdrop is deliberately unfogged and stylised. Scene fog reaches full
 * saturation at 92 m, so any world-space ring would be a flat band; each layer
 * instead bakes its own aerial perspective via `haze`.
 */
const BACKDROP_LAYERS: readonly BackdropLayer[] = [
  {
    radius: MOUNTAIN_RING_RADIUS,
    height: MOUNTAIN_RING_HEIGHT,
    baseY: MOUNTAIN_BASE_Y,
    radialSegments: 128,
    heightSegments: 12,
    amplitudes: [26, 12, 5],
    seed: 0,
    baseColor: '#8fb0c6',
    haze: 0.9,
    snowLine: 0.45,
  },
  {
    radius: 150,
    height: 54,
    baseY: MOUNTAIN_BASE_Y,
    radialSegments: 112,
    heightSegments: 10,
    amplitudes: [19, 9, 4],
    seed: 37.4,
    baseColor: '#6b8ca6',
    haze: 0.75,
    snowLine: 0.55,
  },
  {
    radius: 120,
    height: 40,
    baseY: MOUNTAIN_BASE_Y + 1,
    radialSegments: 96,
    heightSegments: 8,
    amplitudes: [13, 6, 2.5],
    seed: 71.9,
    baseColor: '#4a6b83',
    haze: 0.6,
    snowLine: 0.62,
  },
]

const backdropVertexShader = `
uniform float uBaseY;
uniform float uHeight;

varying float vHeightFactor;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vHeightFactor = clamp((worldPosition.y - uBaseY) / uHeight, 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const backdropFragmentShader = `
uniform vec3 uHazeColor;
uniform vec3 uPeakColor;
uniform vec3 uBaseColor;
uniform float uHaze;
uniform float uSnowLine;

varying float vHeightFactor;

void main() {
  float snow = smoothstep(uSnowLine, uSnowLine + 0.22, vHeightFactor);
  vec3 ridge = mix(uBaseColor, uPeakColor, snow);

  // Aerial perspective baked in rather than fogged, strongest at the base, so
  // each ring's foot dissolves into the same colour the terrain fogs into.
  float haze = uHaze * (0.45 + 0.55 * pow(1.0 - vHeightFactor, 1.6));
  vec3 color = mix(ridge, uHazeColor, clamp(haze, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function createRidgeGeometry(layer: BackdropLayer): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(
    layer.radius,
    layer.radius * 1.08,
    layer.height,
    layer.radialSegments,
    layer.heightSegments,
    true,
  )
  const array = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array
  const vertexCount = geo.attributes.position.count
  const topY = layer.height / 2
  const [octave0, octave1, octave2] = layer.amplitudes

  for (let i = 0; i < vertexCount; i++) {
    const x = array[i * 3 + 0]
    const y = array[i * 3 + 1]
    const z = array[i * 3 + 2]
    if (y <= 0) continue

    // Sampling noise on a circle closes the silhouette on itself with no seam
    // and no visible repetition. The seed offsets each layer's ridge line.
    const angle = Math.atan2(z, x)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const ridge =
      gradientNoise3D(cos * 2.1, sin * 2.1, layer.seed) * octave0 +
      gradientNoise3D(cos * 5.3, sin * 5.3, layer.seed + 11.7) * octave1 +
      gradientNoise3D(cos * 11.9, sin * 11.9, layer.seed + 23.4) * octave2

    // Scale by proximity to the top ring so the base stays flat and only the
    // skyline is broken up.
    array[i * 3 + 1] = y + ridge * (y / topY)
  }

  geo.computeVertexNormals()
  return geo
}

function createLayerMaterial(layer: BackdropLayer): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: backdropVertexShader,
    fragmentShader: backdropFragmentShader,
    uniforms: {
      uHazeColor: { value: new THREE.Color(HORIZON_COLOR) },
      uPeakColor: { value: new THREE.Color(PEAK_COLOR) },
      uBaseColor: { value: new THREE.Color(layer.baseColor) },
      uHaze: { value: layer.haze },
      uSnowLine: { value: layer.snowLine },
      uBaseY: { value: layer.baseY },
      uHeight: { value: layer.height },
    },
    // Not fogged: the per-layer gradient IS the aerial perspective.
    fog: false,
    side: THREE.BackSide,
    // Must write depth. drei's <Sky> is a three-stdlib Sky mesh at the default
    // renderOrder of 0, so it draws after these negatively-ordered rings, and
    // its shader forces gl_Position.z = gl_Position.w — depth exactly 1.0. With
    // three's LessEqualDepth that passes wherever the depth buffer is still at
    // its cleared 1.0, so a backdrop that writes no depth gets painted over by
    // the sky. Writing depth at 120/150/180 m occludes the sky correctly and
    // still lets the near ring overwrite the far one.
    depthWrite: true,
  })
}

/**
 * Procedural 360-degree layered alpine backdrop.
 *
 * Peaks are sampled from gradient noise on a circle, which closes seamlessly at
 * the seam and avoids the repeating silhouette of angle-multiplied sines.
 */
export function DistantMountains() {
  const layers = useMemo(
    () =>
      BACKDROP_LAYERS.map((layer) => ({
        layer,
        geometry: createRidgeGeometry(layer),
        material: createLayerMaterial(layer),
      })),
    [],
  )

  useEffect(() => {
    return () => {
      for (const { geometry, material } of layers) {
        geometry.dispose()
        material.dispose()
      }
    }
  }, [layers])

  return (
    <>
      {layers.map(({ layer, geometry, material }, index) => (
        <mesh
          key={layer.radius}
          geometry={geometry}
          material={material}
          position={[0, layer.baseY + layer.height / 2, 0]}
          // Negative and ascending: far ring draws first, near ring last.
          renderOrder={index - BACKDROP_LAYERS.length}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
