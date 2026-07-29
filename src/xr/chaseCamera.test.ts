import { describe, expect, it } from 'vitest'
import { getXrChaseYaw } from './chaseCamera'

describe('XR chase camera orientation', () => {
  it('faces WebXR forward toward a rider travelling along positive Z', () => {
    expect(getXrChaseYaw(0)).toBe(Math.PI)
  })

  it('preserves the rider heading after applying the WebXR forward offset', () => {
    expect(getXrChaseYaw(Math.PI / 2)).toBe(Math.PI * 1.5)
  })
})
