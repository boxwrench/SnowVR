import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createContactShadowMaterial } from './contactShadowMaterial'

describe('rider contact shadow material', () => {
  it('darkens the surface beneath it by multiplying', () => {
    const material = createContactShadowMaterial()
    expect(material.blending).toBe(THREE.MultiplyBlending)
    expect(material.transparent).toBe(true)
  })

  it('never writes depth, so it cannot occlude the snow it sits on', () => {
    expect(createContactShadowMaterial().depthWrite).toBe(false)
  })

  it('bypasses tone mapping because it is a blend factor, not a colour', () => {
    expect(createContactShadowMaterial().toneMapped).toBe(false)
  })

  it('exposes a tunable opacity uniform', () => {
    const material = createContactShadowMaterial()
    expect(material.uniforms.uOpacity.value).toBeGreaterThan(0)
    expect(material.uniforms.uOpacity.value).toBeLessThanOrEqual(1)
  })
})
