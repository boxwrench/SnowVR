import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { wrapAxis } from './snowfallWrap'

const HALF_EXTENT_XZ = 18
const HALF_EXTENT_Y = 9

export function FallingSnowParticles({ count = 2000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), [])

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * HALF_EXTENT_XZ * 2
      pos[i * 3 + 1] = (Math.random() - 0.5) * HALF_EXTENT_Y * 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * HALF_EXTENT_XZ * 2

      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.4
      vel[i * 3 + 1] = -(0.5 + Math.random() * 0.8)
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4
    }

    return [pos, vel]
  }, [count])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const array = posAttr.array as Float32Array

    // The XR camera is nested under XROrigin, so read the world matrix.
    camera.getWorldPosition(cameraWorldPosition)

    for (let i = 0; i < count; i++) {
      const x = array[i * 3 + 0] + velocities[i * 3 + 0] * delta
      const y = array[i * 3 + 1] + velocities[i * 3 + 1] * delta
      const z = array[i * 3 + 2] + velocities[i * 3 + 2] * delta

      array[i * 3 + 0] = wrapAxis(x, cameraWorldPosition.x, HALF_EXTENT_XZ)
      array[i * 3 + 1] = wrapAxis(y, cameraWorldPosition.y, HALF_EXTENT_Y)
      array[i * 3 + 2] = wrapAxis(z, cameraWorldPosition.z, HALF_EXTENT_XZ)
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  )
}
