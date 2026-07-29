import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

export function CinematicPostProcessing() {
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
