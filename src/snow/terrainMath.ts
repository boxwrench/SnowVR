/**
 * Fast 2D Simplex/Perlin-like noise generator for CPU terrain height sampling.
 * Matches GLSL terrainHeight for exact grounding of rider, reticle, and particles.
 */

function hash2(x: number, y: number): number {
  const sinVal = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return sinVal - Math.floor(sinVal)
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  const u = fx * fx * (3.0 - 2.0 * fx)
  const v = fy * fy * (3.0 - 2.0 * fy)

  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)

  return a + (b - a) * u + (c - a) * v * (1.0 - u) + (d - b) * u * v
}

/**
 * Returns exact terrain elevation at world coordinate (x, z).
 * Includes gentle downhill incline along +Z axis and dune noise.
 */
export function getTerrainHeight(x: number, z: number): number {
  // 1. Downhill slope: 12% slope towards +Z
  const slope = -z * 0.12

  // 2. Sheared dune ridges
  const windX = x * 0.4 + z * 0.12
  const windZ = z * 0.4 - x * 0.12
  const duneRidges = Math.sin(windX * 0.12) * 1.8 + (noise2D(windX * 0.05, windZ * 0.05) - 0.5) * 2.5

  // 3. Sastrugi micro ripples
  const sastrugi = (noise2D(windX * 0.35, windZ * 0.35) - 0.5) * 0.6

  return slope + duneRidges + sastrugi
}

/**
 * Returns slope normal vector (nx, ny, nz) at world coordinate (x, z).
 */
export function getTerrainNormal(x: number, z: number, eps: number = 0.5): { nx: number; ny: number; nz: number } {
  const hL = getTerrainHeight(x - eps, z)
  const hR = getTerrainHeight(x + eps, z)
  const hD = getTerrainHeight(x, z - eps)
  const hU = getTerrainHeight(x, z + eps)

  const dx = (hR - hL) / (2 * eps)
  const dz = (hU - hD) / (2 * eps)

  // Normal = normalize(-dx, 1, -dz)
  const len = Math.sqrt(dx * dx + 1 + dz * dz)
  return { nx: -dx / len, ny: 1 / len, nz: -dz / len }
}
