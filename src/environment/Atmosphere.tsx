import { Sky } from '@react-three/drei'

export function Atmosphere() {
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[30, 50, 40]}
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
        position={[30, 50, 40]}
        intensity={2.2}
        color="#fff0d6"
      />

      {/* Distance fog matching terrain bounds */}
      <fog attach="fog" args={['#244b66', 50, 140]} />
    </>
  )
}
