

/**
 * Shared terrain profile math for displacement rendering, server physics, and collision.
 */
export const TERRAIN_SIZE = 120
export const TERRAIN_HALF_SIZE = TERRAIN_SIZE / 2
export const TERRAIN_SEGMENTS = 256
export const TERRAIN_GRID_SIZE = TERRAIN_SEGMENTS + 1

const BASE_SLOPE = 0.12
const MAIN_RIDGE_HEIGHT = 14
const HALFPIPE_DEPTH = 3.5
const HALFPIPE_WIDTH = 18

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hash3(ix: number, iy: number, iz: number): [number, number, number] {
  let h = (ix * 374761393 + iy * 668265263 + iz * 2147483647) ^ 0x5bf03635
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  const angle1 = ((h & 0xffff) / 65535) * Math.PI * 2
  const angle2 = (((h >>> 16) & 0xffff) / 65535) * Math.PI * 2
  return [
    Math.cos(angle1) * Math.sin(angle2),
    Math.cos(angle2),
    Math.sin(angle1) * Math.sin(angle2),
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
    uy
  )
  const far = mix(
    mix(sample(0, 0, 1), sample(1, 0, 1), ux),
    mix(sample(0, 1, 1), sample(1, 1, 1), ux),
    uy
  )
  return mix(near, far, uz)
}

export function evaluateTerrainProfile(x: number, z: number): number {
  const slopeHeight = -z * BASE_SLOPE
  const ridgeNoise = gradientNoise3D(x * 0.02, 0.5, z * 0.02)
  const microNoise = gradientNoise3D(x * 0.08, 1.2, z * 0.08) * 0.7
  const ridge = Math.pow(Math.abs(ridgeNoise), 1.4) * MAIN_RIDGE_HEIGHT

  const halfpipeDistance = Math.abs(x)
  const halfpipeShape = smooth(Math.max(0, 1 - halfpipeDistance / HALFPIPE_WIDTH))
  const halfpipeTrench = -Math.cos(halfpipeShape * Math.PI * 0.5) * HALFPIPE_DEPTH

  return slopeHeight + ridge + microNoise + halfpipeTrench
}

function heightAt(column: number, row: number): number {
  const x = (column / TERRAIN_SEGMENTS - 0.5) * TERRAIN_SIZE
  const z = (0.5 - row / TERRAIN_SEGMENTS) * TERRAIN_SIZE
  return evaluateTerrainProfile(x, z)
}

export function createTerrainHeightData(): Float32Array<ArrayBuffer> {
  const data = new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE)
  for (let row = 0; row < TERRAIN_GRID_SIZE; row++) {
    for (let column = 0; column < TERRAIN_GRID_SIZE; column++) {
      data[row * TERRAIN_GRID_SIZE + column] = heightAt(column, row)
    }
  }
  return data
}

export const TERRAIN_HEIGHT_DATA = createTerrainHeightData()

export function getTerrainHeight(x: number, z: number): number {
  const normalizedX = (x / TERRAIN_SIZE + 0.5) * TERRAIN_SEGMENTS
  const normalizedV = (0.5 - z / TERRAIN_SIZE) * TERRAIN_SEGMENTS

  const column0 = Math.max(0, Math.min(TERRAIN_SEGMENTS - 1, Math.floor(normalizedX)))
  const row0 = Math.max(0, Math.min(TERRAIN_SEGMENTS - 1, Math.floor(normalizedV)))
  const column1 = column0 + 1
  const row1 = row0 + 1

  const fractionX = Math.max(0, Math.min(1, normalizedX - column0))
  const fractionV = Math.max(0, Math.min(1, normalizedV - row0))

  const lowerLeft = TERRAIN_HEIGHT_DATA[row0 * TERRAIN_GRID_SIZE + column0]
  const lowerRight = TERRAIN_HEIGHT_DATA[row0 * TERRAIN_GRID_SIZE + column1]
  const upperLeft = TERRAIN_HEIGHT_DATA[row1 * TERRAIN_GRID_SIZE + column0]
  const upperRight = TERRAIN_HEIGHT_DATA[row1 * TERRAIN_GRID_SIZE + column1]

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

const clampIndex = (value: number) =>
  Math.max(0, Math.min(TERRAIN_GRID_SIZE - 1, value))

/**
 * Base-height central differences per grid vertex, as RGBA float texels:
 * R = height(x-1) - height(x+1), G = height(z+1) - height(z-1).
 *
 * The vertex shader adds these to the equivalent deformation differences. Because
 * differences add linearly, the resulting normal is identical to sampling all
 * four base neighbours directly, at four fewer texture fetches per vertex.
 *
 * Edge clamping mirrors the shader's `clamp(uv, 0.0, 1.0)` exactly.
 */
export function createTerrainGradientData(): Float32Array<ArrayBuffer> {
  const data = new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE * 4)

  for (let row = 0; row < TERRAIN_GRID_SIZE; row++) {
    for (let column = 0; column < TERRAIN_GRID_SIZE; column++) {
      const left = heightAt(clampIndex(column - 1), row)
      const right = heightAt(clampIndex(column + 1), row)
      const down = heightAt(column, clampIndex(row + 1))
      const up = heightAt(column, clampIndex(row - 1))

      const index = (row * TERRAIN_GRID_SIZE + column) * 4
      data[index] = left - right
      data[index + 1] = down - up
      data[index + 2] = 0
      data[index + 3] = 0
    }
  }

  return data
}

export const TERRAIN_GRADIENT_DATA = createTerrainGradientData()
