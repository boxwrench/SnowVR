import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getTerrainHeight } from './terrainMath'
import {
  RideableDeformationField,
  type RideableDeformationBrush,
} from './RideableDeformationField'

function brush(overrides: Partial<RideableDeformationBrush> = {}): RideableDeformationBrush {
  return {
    pos: new THREE.Vector3(0, 0, 2),
    depth: 0,
    berm: 0,
    ice: 0,
    wetness: 0,
    affectsRide: true,
    ...overrides,
  }
}

describe('rideable deformation field', () => {
  it('lowers the ride surface for trench spells', () => {
    const field = new RideableDeformationField()
    field.update(1 / 72, brush({ depth: 1 }), 0)

    expect(field.getHeight(0, 0)).toBeLessThan(getTerrainHeight(0, 0))
  })

  it('raises the ride surface for mound spells', () => {
    const field = new RideableDeformationField()
    field.update(1 / 72, brush({ depth: -1 }), 0)

    expect(field.getHeight(0, 0)).toBeGreaterThan(getTerrainHeight(0, 0))
  })

  it('records persistent ice without changing surface elevation', () => {
    const field = new RideableDeformationField()
    field.update(1 / 72, brush({ ice: 1 }), 0)

    expect(field.getHeight(0, 0)).toBeCloseTo(getTerrainHeight(0, 0))
    expect(field.getIce(0, 0)).toBeGreaterThan(0.5)
  })

  it('ignores board-only visual carving for rider collision', () => {
    const field = new RideableDeformationField()
    field.update(1 / 72, brush({ depth: 1, affectsRide: false }), 0)

    expect(field.getHeight(0, 0)).toBeCloseTo(getTerrainHeight(0, 0))
  })

  it('includes deformation in the sampled terrain normal', () => {
    const field = new RideableDeformationField()
    field.update(
      1 / 72,
      brush({ pos: new THREE.Vector3(0.8, 0, 1.2), depth: -1 }),
      0,
    )
    const baseNormal = new THREE.Vector3()
    const deformedNormal = field.getNormal(0, 0, new THREE.Vector3())
    const eps = 120 / 256
    const dx = (getTerrainHeight(eps, 0) - getTerrainHeight(-eps, 0)) / (2 * eps)
    const dz = (getTerrainHeight(0, eps) - getTerrainHeight(0, -eps)) / (2 * eps)
    baseNormal.set(-dx, 1, -dz).normalize()

    expect(deformedNormal.angleTo(baseNormal)).toBeGreaterThan(0.05)
  })

  it('raises wet channel sidewalls above ordinary dry berms', () => {
    const dryField = new RideableDeformationField()
    const wetField = new RideableDeformationField()
    const dryBrush = brush({
      pos: new THREE.Vector3(0, 0, 2.4),
      depth: 1,
      berm: 1,
    })
    const wetBrush = brush({
      pos: new THREE.Vector3(0, 0, 2.4),
      depth: 1,
      berm: 1,
      wetness: 1,
    })

    for (let frame = 0; frame < 10; frame += 1) {
      dryField.update(1 / 72, dryBrush, 0)
      wetField.update(1 / 72, wetBrush, 0)
    }

    expect(wetField.getHeight(1.7, 0)).toBeGreaterThan(
      dryField.getHeight(1.7, 0) + 0.5,
    )
  })
})
