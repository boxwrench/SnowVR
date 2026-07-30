import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

interface ContextLossGuardProps {
  readonly onLost: () => void
  readonly onRestored: () => void
}

/**
 * Listens for WebGL context loss on the canvas. Must be rendered inside
 * <Canvas> so it can reach the renderer's DOM element.
 *
 * The Quest browser raises these events on headset sleep and resume. Calling
 * preventDefault on the loss event is what allows the browser to issue a
 * restore at all — without it the context is gone permanently.
 */
export function ContextLossGuard({ onLost, onRestored }: ContextLossGuardProps) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvas = gl.domElement

    const handleLost = (event: Event) => {
      event.preventDefault()
      onLost()
    }
    const handleRestored = () => {
      onRestored()
    }

    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
    }
  }, [gl, onLost, onRestored])

  return null
}
