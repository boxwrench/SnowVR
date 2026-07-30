import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SnowDeformationBuffer } from './SnowDeformationBuffer'
import { createSnowMaterial } from './SnowMaterial'
import {
  TERRAIN_GRADIENT_DATA,
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
  // TEMP DIAGNOSTIC — remove before commit
  const diagAccum = useRef(0)
  const diagFull = useRef(new Float32Array(1024 * 1024 * 4))

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

  const terrainGradientMap = useMemo(() => {
    const texture = new THREE.DataTexture(
      TERRAIN_GRADIENT_DATA,
      TERRAIN_GRID_SIZE,
      TERRAIN_GRID_SIZE,
      THREE.RGBAFormat,
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
    () =>
      createSnowMaterial(
        terrainHeightMap,
        terrainGradientMap,
        TERRAIN_GRID_SIZE,
        TERRAIN_SIZE,
      ),
    [terrainGradientMap, terrainHeightMap],
  )

  useEffect(() => {
    return () => {
      deformationBuffer.dispose()
      terrainHeightMap.dispose()
      terrainGradientMap.dispose()
      snowMaterial.dispose()
    }
  }, [deformationBuffer, snowMaterial, terrainGradientMap, terrainHeightMap])

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

    // TEMP DIAGNOSTIC — remove before commit.
    // Logs each boundary of the carving pipeline once per second so the failing
    // stage can be identified from adb logcat instead of guessed at.
    diagAccum.current += delta
    if (diagAccum.current > 3) {
      diagAccum.current = 0
      let gpuSample = 'readback-failed'
      try {
        // Scan the ENTIRE deformation FBO for its maximum. A single-texel probe
        // cannot distinguish "the sim wrote nothing" from "the probe read the
        // wrong texel", and the row origin convention is exactly the kind of
        // thing that is easy to get backwards. Whole-buffer max has no such
        // ambiguity: if the sim ran at all, some texel is nonzero.
        const target = (deformationBuffer as unknown as {
          targetA: THREE.WebGLRenderTarget
          targetB: THREE.WebGLRenderTarget
          isA: boolean
        })
        const active = target.isA ? target.targetA : target.targetB
        gl.readRenderTargetPixels(active, 0, 0, 1024, 1024, diagFull.current)
        const buf = diagFull.current
        let maxR = 0
        let maxG = 0
        let argX = -1
        let argY = -1
        for (let i = 0; i < buf.length; i += 4) {
          const r = buf[i]
          if (r > maxR) {
            maxR = r
            const texel = i / 4
            argX = texel % 1024
            argY = Math.floor(texel / 1024)
          }
          if (buf[i + 1] > maxG) maxG = buf[i + 1]
        }
        gpuSample = `maxR ${maxR.toFixed(4)} maxG ${maxG.toFixed(4)} at ${argX},${argY}`
      } catch (err) {
        gpuSample = `err:${(err as Error).message}`
      }

      console.log(
        '[snowdiag]',
        'depth', brush.depth.toFixed(3),
        'ice', brush.ice.toFixed(3),
        'affects', brush.affectsRide,
        'pos', brush.pos.x.toFixed(1), brush.pos.y.toFixed(1),
        'r', brush.pos.z.toFixed(2),
        '| cpuOffset', deformationField.getHeightOffset(brush.pos.x, brush.pos.y).toFixed(4),
        '| gpuRGBA', gpuSample,
        '| xrPresenting', gl.xr.isPresenting,
      )
    }

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
