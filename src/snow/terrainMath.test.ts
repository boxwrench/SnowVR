import { describe, expect, it } from 'vitest'
import {
  TERRAIN_GRID_SIZE,
  TERRAIN_HEIGHT_DATA,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
  createTerrainHeightData,
  evaluateTerrainProfile,
  getTerrainHeight,
  getTerrainNormal,
} from './terrainMath'

describe('shared terrain heightfield', () => {
  it('is deterministic and contains one value per rendered vertex', () => {
    const regenerated = createTerrainHeightData()
    expect(regenerated).toHaveLength(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE)
    expect(regenerated).toEqual(TERRAIN_HEIGHT_DATA)
  })

  it('maps world corners to the texture with inverted Z/V coordinates', () => {
    expect(getTerrainHeight(-60, 60)).toBeCloseTo(TERRAIN_HEIGHT_DATA[0], 6)
    expect(getTerrainHeight(60, -60)).toBeCloseTo(TERRAIN_HEIGHT_DATA.at(-1)!, 6)
  })

  it('matches the intended profile at a sampled grid vertex', () => {
    const column = 73
    const textureRow = 191
    const x = (column / TERRAIN_SEGMENTS - 0.5) * TERRAIN_SIZE
    const z = (0.5 - textureRow / TERRAIN_SEGMENTS) * TERRAIN_SIZE
    expect(getTerrainHeight(x, z)).toBeCloseTo(evaluateTerrainProfile(x, z), 5)
  })

  it('interpolates using the same diagonal as PlaneGeometry', () => {
    const cellSize = TERRAIN_SIZE / TERRAIN_SEGMENTS
    const x0 = -TERRAIN_SIZE / 2
    const z0 = TERRAIN_SIZE / 2
    const lowerLeft = TERRAIN_HEIGHT_DATA[0]
    const lowerRight = TERRAIN_HEIGHT_DATA[1]
    const upperRight = TERRAIN_HEIGHT_DATA[TERRAIN_GRID_SIZE + 1]

    const fractionX = 0.75
    const fractionV = 0.25
    const expected = lowerLeft * (1 - fractionX)
      + lowerRight * (fractionX - fractionV)
      + upperRight * fractionV
    expect(getTerrainHeight(x0 + cellSize * fractionX, z0 - cellSize * fractionV)).toBeCloseTo(expected, 6)
  })

  it('returns normalized surface normals', () => {
    const normal = getTerrainNormal(8, -12)
    expect(Math.hypot(normal.nx, normal.ny, normal.nz)).toBeCloseTo(1, 6)
    expect(normal.ny).toBeGreaterThan(0)
  })
})
