import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  applySlopeGravity,
  getIceBoostFactor,
  getSurfaceFriction,
  getSurfaceMaxSpeed,
  ICE_TRAIL_MAX_SPEED,
  MANUAL_BOOST_MAX_SPEED,
  NORMAL_MAX_SPEED,
} from './surfacePhysics'

describe('ride surface physics', () => {
  it('raises the speed limit only on a sufficiently icy trail', () => {
    expect(getSurfaceMaxSpeed(false, getIceBoostFactor(0))).toBe(NORMAL_MAX_SPEED)
    expect(getSurfaceMaxSpeed(true, getIceBoostFactor(0))).toBe(MANUAL_BOOST_MAX_SPEED)
    expect(getSurfaceMaxSpeed(false, getIceBoostFactor(1))).toBe(ICE_TRAIL_MAX_SPEED)
  })

  it('makes ice slick and wet slush draggy', () => {
    const snowFriction = getSurfaceFriction(0, 0)
    expect(getSurfaceFriction(1, 0)).toBeLessThan(snowFriction)
    expect(getSurfaceFriction(0, 1)).toBeGreaterThan(snowFriction)
  })

  it('accelerates horizontally down the sampled terrain normal', () => {
    const velocity = new THREE.Vector3()
    applySlopeGravity(velocity, new THREE.Vector3(0.2, 0.9, 0.35).normalize(), 0.5)

    expect(velocity.x).toBeGreaterThan(0)
    expect(velocity.y).toBe(0)
    expect(velocity.z).toBeGreaterThan(velocity.x)
  })
})
