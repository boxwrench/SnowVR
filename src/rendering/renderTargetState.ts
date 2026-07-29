import type * as THREE from 'three'

export type RenderTargetStateRenderer = Pick<
  THREE.WebGLRenderer,
  'getActiveCubeFace' | 'getActiveMipmapLevel' | 'getRenderTarget' | 'setRenderTarget'
>

/**
 * Offscreen GPU passes must restore Three.js' active target. In WebXR that
 * target is the headset projection framebuffer rather than the default canvas.
 */
export function withPreservedRenderTarget(
  renderer: RenderTargetStateRenderer,
  renderPasses: () => void,
): void {
  const target = renderer.getRenderTarget()
  const activeCubeFace = renderer.getActiveCubeFace()
  const activeMipmapLevel = renderer.getActiveMipmapLevel()

  try {
    renderPasses()
  } finally {
    renderer.setRenderTarget(target, activeCubeFace, activeMipmapLevel)
  }
}
