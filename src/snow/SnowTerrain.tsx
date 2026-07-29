import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SnowDeformationBuffer } from './SnowDeformationBuffer'
import { createSnowMaterial } from './SnowMaterial'

export interface BrushState {
  pos: THREE.Vector3
  depth: number
  berm: number
  ice: number
  wetness: number
}

interface SnowTerrainProps {
  readonly brushRef: React.RefObject<BrushState>
  readonly windDecay: number
  readonly glintScale: number
  readonly glintIntensity: number
  readonly foveaRadius?: number
}

export function SnowTerrain({
  brushRef,
  windDecay,
  glintScale,
  glintIntensity,
  foveaRadius = 0.28,
}: SnowTerrainProps) {
  const { gl, size } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  // 1024x1024 Quest-optimized deformation FBO buffer
  const deformationBuffer = useMemo(() => new SnowDeformationBuffer(1024), [])
  const snowMaterial = useMemo(() => createSnowMaterial(), [])

  useEffect(() => {
    return () => {
      deformationBuffer.dispose()
      snowMaterial.dispose()
    }
  }, [deformationBuffer, snowMaterial])

  useFrame((_, delta) => {
    const brush = brushRef.current ?? {
      pos: new THREE.Vector3(999, 999, 0.5),
      depth: 0,
      berm: 1.2,
      ice: 0,
      wetness: 0,
    }

    // Update GPU ping-pong deformation FBO with direct ref read (zero React rerenders)
    deformationBuffer.update(
      gl,
      delta,
      brush.pos,
      brush.depth,
      brush.berm,
      brush.ice,
      brush.wetness,
      windDecay
    )

    // Pass latest deformation texture to snow material
    snowMaterial.uniforms.uDeformationMap.value = deformationBuffer.texture
    snowMaterial.uniforms.uGlintScale.value = glintScale
    snowMaterial.uniforms.uGlintIntensity.value = glintIntensity

    // Foveated rendering uniforms
    snowMaterial.uniforms.uFoveaRadius.value = foveaRadius
    snowMaterial.uniforms.uResolution.value.set(size.width, size.height)
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      material={snowMaterial}
    >
      {/* 256x256 Quest 3 balanced vertex grid (65k vertices) */}
      <planeGeometry args={[120, 120, 256, 256]} />
    </mesh>
  )
}
