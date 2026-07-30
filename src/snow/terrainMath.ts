export const TERRAIN_SIZE = 120
export const TERRAIN_SEGMENTS = 256
export const TERRAIN_GRID_SIZE = TERRAIN_SEGMENTS + 1
export const TERRAIN_HALF_SIZE = TERRAIN_SIZE / 2

const fract = (value: number) => value - Math.floor(value)
const smooth = (value: number) => value * value * (3 - 2 * value)
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount

function hash3(x: number, y: number, z: number): readonly [number, number, number] {
  return [
    fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123) * 2 - 1,
    fract(Math.sin(x * 269.5 + y * 183.3 + z * 246.1) * 43758.5453123) * 2 - 1,
    fract(Math.sin(x * 113.5 + y * 271.9 + z * 124.6) * 43758.5453123) * 2 - 1,
  ]
}

function gradientDot(
  ix: number,
  iy: number,
  iz: number,
  fx: number,
  fy: number,
  fz: number,
): number {
  const gradient = hash3(ix, iy, iz)
  return gradient[0] * fx + gradient[1] * fy + gradient[2] * fz
}

export function gradientNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = smooth(fx)
  const uy = smooth(fy)
  const uz = smooth(fz)

  const sample = (dx: number, dy: number, dz: number) => (
    gradientDot(ix + dx, iy + dy, iz + dz, fx - dx, fy - dy, fz - dz)
  )
  const near = mix(
    mix(sample(0, 0, 0), sample(1, 0, 0), ux),
    mix(sample(0, 1, 0), sample(1, 1, 0), ux),
    uy,
  )
  const far = mix(
    mix(sample(0, 0, 1), sample(1, 0, 1), ux),
    mix(sample(0, 1, 1), sample(1, 1, 1), ux),
    uy,
  )
  return mix(near, far, uz)
}

/**
 * Intended procedural profile sampled once into the shared base heightfield.
 * Rideable spell deformation is layered on by RideableDeformationField.
 */
export function evaluateTerrainProfile(x: number, z: number): number {
  const slope = -z * 0.12
  const windX = x * 0.4 + z * 0.12
  const windZ = z * 0.4 - x * 0.12
  const duneRidges = Math.sin(windX * 0.12) * 1.8
    + gradientNoise3D(windX * 0.05, windZ * 0.05, 0) * 2.5
  const sastrugi = gradientNoise3D(windX * 0.35, windZ * 0.35, 1.2) * 0.6
  return slope + duneRidges + sastrugi
}

export function createTerrainHeightData(): Float32Array<ArrayBuffer> {
  const data = new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE)
  for (let row = 0; row < TERRAIN_GRID_SIZE; row++) {
    const v = row / TERRAIN_SEGMENTS
    const z = (0.5 - v) * TERRAIN_SIZE
    for (let column = 0; column < TERRAIN_GRID_SIZE; column++) {
      const u = column / TERRAIN_SEGMENTS
      const x = (u - 0.5) * TERRAIN_SIZE
      data[row * TERRAIN_GRID_SIZE + column] = evaluateTerrainProfile(x, z)
    }
  }
  return data
}

export const TERRAIN_HEIGHT_DATA = createTerrainHeightData()

function heightAt(column: number, row: number): number {
  return TERRAIN_HEIGHT_DATA[row * TERRAIN_GRID_SIZE + column]
}

/**
 * Samples the same two triangles rendered by Three.js PlaneGeometry.
 * Texture V runs opposite world Z, matching the rotated terrain plane.
 */
export function getTerrainHeight(x: number, z: number): number {
  const u = Math.max(0, Math.min(1, x / TERRAIN_SIZE + 0.5))
  const v = Math.max(0, Math.min(1, 0.5 - z / TERRAIN_SIZE))
  const gridX = u * TERRAIN_SEGMENTS
  const gridV = v * TERRAIN_SEGMENTS
  const column = Math.min(Math.floor(gridX), TERRAIN_SEGMENTS - 1)
  const row = Math.min(Math.floor(gridV), TERRAIN_SEGMENTS - 1)
  const fractionX = gridX - column
  const fractionV = gridV - row

  const lowerLeft = heightAt(column, row)
  const lowerRight = heightAt(column + 1, row)
  const upperLeft = heightAt(column, row + 1)
  const upperRight = heightAt(column + 1, row + 1)

  if (fractionV >= fractionX) {
    return lowerLeft * (1 - fractionV)
      + upperLeft * (fractionV - fractionX)
      + upperRight * fractionX
  }
  return lowerLeft * (1 - fractionX)
    + lowerRight * (fractionX - fractionV)
    + upperRight * fractionV
}

export function getTerrainNormal(
  x: number,
  z: number,
  eps = TERRAIN_SIZE / TERRAIN_SEGMENTS,
): { nx: number; ny: number; nz: number } {
  const hL = getTerrainHeight(x - eps, z)
  const hR = getTerrainHeight(x + eps, z)
  const hD = getTerrainHeight(x, z - eps)
  const hU = getTerrainHeight(x, z + eps)
  const dx = (hR - hL) / (2 * eps)
  const dz = (hU - hD) / (2 * eps)
  const length = Math.sqrt(dx * dx + 1 + dz * dz)
  return { nx: -dx / length, ny: 1 / length, nz: -dz / length }
}
