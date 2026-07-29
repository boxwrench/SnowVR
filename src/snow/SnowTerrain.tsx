import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SnowDeformationBuffer } from './SnowDeformationBuffer'
import { createSnowMaterial } from './SnowMaterial'
import {
  TERRAIN_GRID_SIZE,
  TERRAIN_HEIGHT_DATA,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
} from './terrainMath'
import { RideableDeformationField } from './RideableDeformationField'

export interface BrushState {
  pos: THREE.Vector3
  depth: number
  berm: number
  ice: number
  wetness: number
  affectsRide: boolean
}

interface SnowTerrainProps {
  readonly brushRef: React.RefObject<BrushState>
  readonly windDecay: number
  readonly glintScale: number
  readonly glintIntensity: number
  readonly deformationField: RideableDeformationField
}

export function SnowTerrain({
  brushRef,
  windDecay,
  glintScale,
  glintIntensity,
  deformationField,
}: SnowTerrainProps) {
  const { gl } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  // 1024x1024 Quest-optimized deformation FBO buffer
  const deformationBuffer = useMemo(() => new SnowDeformationBuffer(1024), [])
  const terrainHeightMap = useMemo(() => {
    const texture = new THREE.DataTexture(
      TERRAIN_HEIGHT_DATA,
      TERRAIN_GRID_SIZE,
      TERRAIN_GRID_SIZE,
      THREE.RedFormat,
      THREE.FloatType,
    )
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return texture
  }, [])
  const snowMaterial = useMemo(
    () => createSnowMaterial(terrainHeightMap, TERRAIN_GRID_SIZE, TERRAIN_SIZE),
    [terrainHeightMap],
  )

  useEffect(() => {
    return () => {
      deformationBuffer.dispose()
      terrainHeightMap.dispose()
      snowMaterial.dispose()
    }
  }, [deformationBuffer, snowMaterial, terrainHeightMap])

  useFrame((_, delta) => {
    const brush = brushRef.current ?? {
      pos: new THREE.Vector3(999, 999, 0.5),
      depth: 0,
      berm: 1.2,
      ice: 0,
      wetness: 0,
      affectsRide: false,
    }

    // Update GPU ping-pong deformation FBO with direct ref read
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
    deformationField.update(delta, brush, windDecay)

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
      material={snowMaterial}
    >
      {/* 256x256 Quest 3 balanced vertex grid (65k vertices) */}
      <planeGeometry args={[TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS]} />
    </mesh>
  )
}
