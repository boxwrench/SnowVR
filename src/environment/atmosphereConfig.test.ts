import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { TERRAIN_HALF_SIZE, TERRAIN_SIZE } from '../snow/terrainMath'
import {
  FOG_FAR,
  FOG_NEAR,
  MOUNTAIN_BASE_Y,
  MOUNTAIN_RING_HEIGHT,
  MOUNTAIN_RING_RADIUS,
  SUN_POSITION,
  getSunDirection,
} from './atmosphereConfig'

describe('shared atmosphere framing', () => {
  it('fogs the far terrain edge without hazing the rideable run', () => {
    expect(FOG_NEAR).toBeLessThan(FOG_FAR)
    // Below TERRAIN_SIZE so the plane boundary is never visible as a hard cut.
    expect(FOG_FAR).toBeLessThan(TERRAIN_SIZE)
    // Above the half size so terrain the rider is about to reach stays legible.
    expect(FOG_FAR).toBeGreaterThan(TERRAIN_HALF_SIZE)
  })

  it('places the backdrop ring outside the playfield and above the horizon', () => {
    expect(MOUNTAIN_RING_RADIUS).toBeGreaterThan(TERRAIN_HALF_SIZE)
    expect(MOUNTAIN_BASE_Y + MOUNTAIN_RING_HEIGHT).toBeGreaterThan(0)
  })

  it('derives a unit sun direction from the sun position', () => {
    const direction = getSunDirection(new THREE.Vector3())
    expect(direction.length()).toBeCloseTo(1)

    const expected = new THREE.Vector3(...SUN_POSITION).normalize()
    expect(direction.x).toBeCloseTo(expected.x)
    expect(direction.y).toBeCloseTo(expected.y)
    expect(direction.z).toBeCloseTo(expected.z)
  })

  it('writes into the supplied target rather than allocating', () => {
    const target = new THREE.Vector3()
    expect(getSunDirection(target)).toBe(target)
  })
})
