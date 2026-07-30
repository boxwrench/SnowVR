import { Sky } from '@react-three/drei'
import {
  FOG_FAR,
  FOG_NEAR,
  HORIZON_COLOR,
  SUN_COLOR,
  SUN_POSITION,
} from './atmosphereConfig'

export function Atmosphere() {
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[...SUN_POSITION]}
        inclination={0.49}
        azimuth={0.25}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        rayleigh={1.2}
        turbidity={4.0}
      />

      {/* Atmospheric directional ambient lighting */}
      <ambientLight intensity={0.7} color="#b8d8ea" />

      <directionalLight
        position={[...SUN_POSITION]}
        intensity={2.2}
        color={SUN_COLOR}
      />

      {/* Shared linear fog. Every fogged material blends into HORIZON_COLOR. */}
      <fog attach="fog" args={[HORIZON_COLOR, FOG_NEAR, FOG_FAR]} />
    </>
  )
}
