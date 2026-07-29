import * as THREE from 'three'

const DEFAULT_MAX_DISTANCE = 24
const DEFAULT_FALLBACK_DISTANCE = 10
const DEFAULT_SAMPLE_STEP = 0.5
const DEFAULT_TERRAIN_MARGIN = 1
const SURFACE_OFFSET = 0.05

export interface TerrainAimOptions {
  readonly maxDistance?: number
  readonly fallbackDistance?: number
  readonly sampleStep?: number
  readonly terrainHalfSize?: number
  readonly terrainMargin?: number
}

export type TerrainHeightSampler = (x: number, z: number) => number

const samplePoint = new THREE.Vector3()
const rayDirection = new THREE.Vector3()
const horizontalDirection = new THREE.Vector3()

function clampToTerrain(
  point: THREE.Vector3,
  terrainHalfSize: number | undefined,
  terrainMargin: number,
): void {
  if (terrainHalfSize === undefined) return
  const limit = Math.max(0, terrainHalfSize - terrainMargin)
  point.x = THREE.MathUtils.clamp(point.x, -limit, limit)
  point.z = THREE.MathUtils.clamp(point.z, -limit, limit)
}

function setSurfacePoint(
  target: THREE.Vector3,
  x: number,
  z: number,
  sampleHeight: TerrainHeightSampler,
  terrainHalfSize: number | undefined,
  terrainMargin: number,
): THREE.Vector3 {
  target.set(x, 0, z)
  clampToTerrain(target, terrainHalfSize, terrainMargin)
  target.y = sampleHeight(target.x, target.z) + SURFACE_OFFSET
  return target
}

/**
 * Finds the first terrain crossing along a controller direction. If the ray is
 * level or points upward, it falls back to a predictable ground target in the
 * controller's horizontal direction.
 */
export function resolveTerrainAim(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  fallbackForward: THREE.Vector3,
  sampleHeight: TerrainHeightSampler,
  target: THREE.Vector3,
  options: TerrainAimOptions = {},
): THREE.Vector3 {
  const maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE
  const fallbackDistance = options.fallbackDistance ?? DEFAULT_FALLBACK_DISTANCE
  const sampleStep = options.sampleStep ?? DEFAULT_SAMPLE_STEP
  const terrainMargin = options.terrainMargin ?? DEFAULT_TERRAIN_MARGIN
  rayDirection.copy(direction).normalize()

  let previousDistance = 0
  let previousClearance = origin.y - sampleHeight(origin.x, origin.z)

  for (let distance = sampleStep; distance <= maxDistance; distance += sampleStep) {
    samplePoint.copy(origin).addScaledVector(rayDirection, distance)
    const clearance = samplePoint.y - sampleHeight(samplePoint.x, samplePoint.z)

    if (clearance <= 0 && previousClearance > 0) {
      let low = previousDistance
      let high = distance
      for (let iteration = 0; iteration < 8; iteration += 1) {
        const midpoint = (low + high) * 0.5
        samplePoint.copy(origin).addScaledVector(rayDirection, midpoint)
        const midpointClearance = samplePoint.y - sampleHeight(samplePoint.x, samplePoint.z)
        if (midpointClearance > 0) low = midpoint
        else high = midpoint
      }

      samplePoint.copy(origin).addScaledVector(rayDirection, high)
      return setSurfacePoint(
        target,
        samplePoint.x,
        samplePoint.z,
        sampleHeight,
        options.terrainHalfSize,
        terrainMargin,
      )
    }

    previousDistance = distance
    previousClearance = clearance
  }

  horizontalDirection.set(rayDirection.x, 0, rayDirection.z)
  if (horizontalDirection.lengthSq() < 0.01) {
    horizontalDirection.set(fallbackForward.x, 0, fallbackForward.z)
  }
  if (horizontalDirection.lengthSq() < 0.01) horizontalDirection.set(0, 0, 1)
  horizontalDirection.normalize()

  return setSurfacePoint(
    target,
    origin.x + horizontalDirection.x * fallbackDistance,
    origin.z + horizontalDirection.z * fallbackDistance,
    sampleHeight,
    options.terrainHalfSize,
    terrainMargin,
  )
}
