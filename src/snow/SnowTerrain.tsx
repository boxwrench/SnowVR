import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SnowDeformationBuffer } from './SnowDeformationBuffer'
import { createSnowMaterial } from './SnowMaterial'

interface SnowTerrainProps {
  readonly brushPosition: THREE.Vector3
  readonly brushDepth: number
  readonly brushBerm: number
  readonly brushIce: number
  readonly brushWetness: number
  readonly windDecay: number
  readonly glintScale: number
  readonly glintIntensity: number
}

export function SnowTerrain({
  brushPosition,
  brushDepth,
  brushBerm,
  brushIce,
  brushWetness,
  windDecay,
  glintScale,
  glintIntensity,
}: SnowTerrainProps) {
  const { gl } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  // 2048x2048 high-resolution 4-channel deformation state buffer
  const deformationBuffer = useMemo(() => new SnowDeformationBuffer(2048), [])
  const snowMaterial = useMemo(() => createSnowMaterial(), [])

  useEffect(() => {
    return () => {
      deformationBuffer.dispose()
      snowMaterial.dispose()
    }
  }, [deformationBuffer, snowMaterial])

  useFrame((_, delta) => {
    // Update GPU ping-pong deformation FBO
    deformationBuffer.update(
      gl,
      delta,
      brushPosition,
      brushDepth,
      brushBerm,
      brushIce,
      brushWetness,
      windDecay
    )

    // Pass latest deformation texture to snow material
    snowMaterial.uniforms.uDeformationMap.value = deformationBuffer.texture
    snowMaterial.uniforms.uGlintScale.value = glintScale
    snowMaterial.uniforms.uGlintIntensity.value = glintIntensity
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      castShadow
      material={snowMaterial}
    >
      {/* Expanded 120m x 120m high-density vertex grid */}
      <planeGeometry args={[120, 120, 512, 512]} />
    </mesh>
  )
}
