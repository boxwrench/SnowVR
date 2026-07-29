import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export function FallingSnowParticles({ count = 2000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 35
      pos[i * 3 + 1] = Math.random() * 15
      pos[i * 3 + 2] = (Math.random() - 0.5) * 35

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

    for (let i = 0; i < count; i++) {
      array[i * 3 + 0] += velocities[i * 3 + 0] * delta
      array[i * 3 + 1] += velocities[i * 3 + 1] * delta
      array[i * 3 + 2] += velocities[i * 3 + 2] * delta

      // Wrap around vertically
      if (array[i * 3 + 1] < 0) {
        array[i * 3 + 1] = 15
        array[i * 3 + 0] = (Math.random() - 0.5) * 35
        array[i * 3 + 2] = (Math.random() - 0.5) * 35
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
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
