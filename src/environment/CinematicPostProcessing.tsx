import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useXR } from '@react-three/xr'

export function CinematicPostProcessing() {
  const session = useXR((state) => state.session)

  // Disable EffectComposer during active WebXR sessions so VR stereoscopic view does not go black!
  if (session !== undefined) return null

  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.75}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.2} darkness={0.6} />
    </EffectComposer>
  )
}
