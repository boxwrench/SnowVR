import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createSnowMaterial } from './SnowMaterial'

function buildMaterial(): THREE.ShaderMaterial {
  const heightMap = new THREE.DataTexture(
    new Float32Array(9),
    3,
    3,
    THREE.RedFormat,
    THREE.FloatType,
  )
  const gradientMap = new THREE.DataTexture(
    new Float32Array(36),
    3,
    3,
    THREE.RGBAFormat,
    THREE.FloatType,
  )
  return createSnowMaterial(heightMap, gradientMap, 3, 12)
}

describe('snow material output pipeline', () => {
  it('opts into scene fog so the terrain matches every other material', () => {
    const material = buildMaterial()
    expect(material.fog).toBe(true)
    expect(material.uniforms.fogColor).toBeDefined()
    expect(material.uniforms.fogNear).toBeDefined()
    expect(material.uniforms.fogFar).toBeDefined()
  })

  it('applies tone mapping and output colour space like a built-in material', () => {
    const material = buildMaterial()
    expect(material.fragmentShader).toContain('#include <tonemapping_fragment>')
    expect(material.fragmentShader).toContain('#include <colorspace_fragment>')
  })

  it('fogs after output conversion, matching the built-in chunk order', () => {
    const { fragmentShader } = buildMaterial()
    const toneMapping = fragmentShader.indexOf('#include <tonemapping_fragment>')
    const colorSpace = fragmentShader.indexOf('#include <colorspace_fragment>')
    const fog = fragmentShader.indexOf('#include <fog_fragment>')

    expect(toneMapping).toBeGreaterThan(-1)
    expect(colorSpace).toBeGreaterThan(toneMapping)
    expect(fog).toBeGreaterThan(colorSpace)
  })

  it('no longer carries a bespoke fog or the unused resolution uniform', () => {
    const material = buildMaterial()
    expect(material.fragmentShader).not.toContain('uSkyColor, fogFactor')
    expect(material.uniforms.uResolution).toBeUndefined()
  })

  it('keeps the terrain height map the caller supplied', () => {
    const heightMap = new THREE.DataTexture(
      new Float32Array(9),
      3,
      3,
      THREE.RedFormat,
      THREE.FloatType,
    )
    const gradientMap = new THREE.DataTexture(
      new Float32Array(36),
      3,
      3,
      THREE.RGBAFormat,
      THREE.FloatType,
    )
    const material = createSnowMaterial(heightMap, gradientMap, 3, 12)
    expect(material.uniforms.uTerrainHeightMap.value).toBe(heightMap)
    expect(material.uniforms.uTerrainGradientMap.value).toBe(gradientMap)
    expect(material.uniforms.uTerrainGridSize.value).toBe(3)
    expect(material.uniforms.uTerrainWorldSize.value).toBe(12)
  })
})
