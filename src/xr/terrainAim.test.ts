import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { resolveTerrainAim } from './terrainAim'

const levelTerrain = () => 0

describe('terrain-aware spell aiming', () => {
  it('finds a downward controller-ray intersection with the terrain', () => {
    const target = resolveTerrainAim(
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(0, -1, 1).normalize(),
      new THREE.Vector3(0, 0, 1),
      levelTerrain,
      new THREE.Vector3(),
    )

    expect(target.x).toBeCloseTo(0)
    expect(target.z).toBeCloseTo(2, 1)
    expect(target.y).toBeCloseTo(0.05)
  })

  it('uses a stable horizontal fallback when the ray does not hit terrain', () => {
    const target = resolveTerrainAim(
      new THREE.Vector3(2, 2, 3),
      new THREE.Vector3(1, 0.2, 0),
      new THREE.Vector3(0, 0, 1),
      levelTerrain,
      new THREE.Vector3(),
      { fallbackDistance: 8 },
    )

    expect(target.x).toBeCloseTo(10)
    expect(target.z).toBeCloseTo(3)
    expect(target.y).toBeCloseTo(0.05)
  })

  it('uses rider heading for a vertical fallback and stays on the terrain', () => {
    const target = resolveTerrainAim(
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-1, 0, 0),
      levelTerrain,
      new THREE.Vector3(),
      { fallbackDistance: 10, terrainHalfSize: 6, terrainMargin: 1 },
    )

    expect(target.x).toBe(-5)
    expect(target.z).toBeCloseTo(0)
    expect(target.y).toBeCloseTo(0.05)
  })
})
