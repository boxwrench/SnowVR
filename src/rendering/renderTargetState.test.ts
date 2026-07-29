import { describe, expect, it, vi } from 'vitest'
import type * as THREE from 'three'
import {
  withPreservedRenderTarget,
  type RenderTargetStateRenderer,
} from './renderTargetState'

describe('offscreen render target preservation', () => {
  it('restores the active XR target and subresource after offscreen passes', () => {
    const xrTarget = {} as THREE.WebGLRenderTarget
    const setRenderTarget = vi.fn()
    const renderer: RenderTargetStateRenderer = {
      getRenderTarget: () => xrTarget,
      getActiveCubeFace: () => 2,
      getActiveMipmapLevel: () => 3,
      setRenderTarget,
    }

    withPreservedRenderTarget(renderer, () => {
      setRenderTarget({} as THREE.WebGLRenderTarget)
    })

    expect(setRenderTarget).toHaveBeenLastCalledWith(xrTarget, 2, 3)
  })

  it('restores the active target even when an offscreen pass fails', () => {
    const xrTarget = {} as THREE.WebGLRenderTarget
    const setRenderTarget = vi.fn()
    const renderer: RenderTargetStateRenderer = {
      getRenderTarget: () => xrTarget,
      getActiveCubeFace: () => 0,
      getActiveMipmapLevel: () => 0,
      setRenderTarget,
    }

    expect(() => withPreservedRenderTarget(renderer, () => {
      throw new Error('shader failed')
    })).toThrow('shader failed')
    expect(setRenderTarget).toHaveBeenLastCalledWith(xrTarget, 0, 0)
  })
})
