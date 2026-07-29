import { Sky } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

export function Atmosphere() {
  const lightRef = useRef<THREE.DirectionalLight>(null)

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
      
      {/* Single unified ambient light for the scene */}
      <ambientLight intensity={0.65} color="#b8d8ea" />
      
      <directionalLight
        ref={lightRef}
        position={[30, 50, 40]}
        intensity={2.2}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      {/* Scene fog pushed out to match 120m terrain and shader fog blend range */}
      <fog attach="fog" args={['#244b66', 60, 150]} />
    </>
  )
}
