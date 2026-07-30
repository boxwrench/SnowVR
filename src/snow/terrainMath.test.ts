import { describe, expect, it } from 'vitest'
import {
  TERRAIN_GRID_SIZE,
  TERRAIN_HEIGHT_DATA,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
  createTerrainHeightData,
  createTerrainGradientData,
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

describe('precomputed base terrain gradients', () => {
  it('stores four floats per grid vertex', () => {
    expect(createTerrainGradientData()).toHaveLength(
      TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE * 4,
    )
  })

  it('matches the central difference the shader would compute', () => {
    const data = createTerrainGradientData()
    const column = 100
    const row = 80
    const index = (row * TERRAIN_GRID_SIZE + column) * 4

    const heightAt = (c: number, r: number) =>
      TERRAIN_HEIGHT_DATA[r * TERRAIN_GRID_SIZE + c]

    expect(data[index]).toBeCloseTo(
      heightAt(column - 1, row) - heightAt(column + 1, row),
    )
    expect(data[index + 1]).toBeCloseTo(
      heightAt(column, row + 1) - heightAt(column, row - 1),
    )
  })

  it('clamps at the edges exactly as the shader clamps its uv', () => {
    const data = createTerrainGradientData()
    const heightAt = (c: number, r: number) =>
      TERRAIN_HEIGHT_DATA[r * TERRAIN_GRID_SIZE + c]

    // Column 0: the negative-x neighbour clamps back to column 0 itself.
    expect(data[0]).toBeCloseTo(heightAt(0, 0) - heightAt(1, 0))

    const lastColumn = TERRAIN_GRID_SIZE - 1
    const lastIndex = lastColumn * 4
    expect(data[lastIndex]).toBeCloseTo(
      heightAt(lastColumn - 1, 0) - heightAt(lastColumn, 0),
    )
  })

  it('is deterministic', () => {
    expect(Array.from(createTerrainGradientData().slice(0, 64))).toEqual(
      Array.from(createTerrainGradientData().slice(0, 64)),
    )
  })
})
