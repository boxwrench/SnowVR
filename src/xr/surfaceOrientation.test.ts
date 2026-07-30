import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { orientToSurface } from './surfaceOrientation'

const FLAT = new THREE.Vector3(0, 1, 0)

describe('rider surface orientation', () => {
  it('is identity on flat ground with zero heading', () => {
    const result = orientToSurface(0, FLAT, new THREE.Quaternion())
    expect(result.angleTo(new THREE.Quaternion())).toBeCloseTo(0)
  })

  it('yaws about the world up axis by the heading', () => {
    const quat = orientToSurface(Math.PI / 2, FLAT, new THREE.Quaternion())
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)

    expect(forward.x).toBeCloseTo(1)
    expect(forward.y).toBeCloseTo(0)
    expect(forward.z).toBeCloseTo(0)
  })

  it('tilts the rider up axis onto the surface normal', () => {
    const normal = new THREE.Vector3(0.3, 1, -0.2).normalize()
    const quat = orientToSurface(0, normal, new THREE.Quaternion())
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)

    expect(up.x).toBeCloseTo(normal.x)
    expect(up.y).toBeCloseTo(normal.y)
    expect(up.z).toBeCloseTo(normal.z)
  })

  it('does not mutate the supplied surface normal', () => {
    const normal = new THREE.Vector3(0.3, 1, -0.2).normalize()
    const before = normal.clone()
    orientToSurface(1.1, normal, new THREE.Quaternion())

    expect(normal.x).toBeCloseTo(before.x)
    expect(normal.y).toBeCloseTo(before.y)
    expect(normal.z).toBeCloseTo(before.z)
  })

  it('writes into the supplied target rather than allocating', () => {
    const target = new THREE.Quaternion()
    expect(orientToSurface(0.5, FLAT, target)).toBe(target)
  })
})
