import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'

interface SpellParticleProps {
  readonly activeSpell: SpellEffect
  readonly brushPos: THREE.Vector3
  readonly isEmitting: boolean
}

export function SpellParticleSystem({
  activeSpell,
  brushPos,
  isEmitting,
}: SpellParticleProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 300

  const [positions, velocities, ages] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const age = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = 999
      pos[i * 3 + 1] = 999
      pos[i * 3 + 2] = 999

      vel[i * 3 + 0] = (Math.random() - 0.5) * 2.0
      vel[i * 3 + 1] = Math.random() * 2.5 + 0.5
      vel[i * 3 + 2] = (Math.random() - 0.5) * 2.0

      age[i] = 99
    }

    return [pos, vel, age]
  }, [count])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    // Emit new particles while drawing
    if (isEmitting && brushPos.x < 100) {
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * count)
        posArray[idx * 3 + 0] = brushPos.x + (Math.random() - 0.5) * activeSpell.brushRadius
        posArray[idx * 3 + 1] = 0.2
        posArray[idx * 3 + 2] = brushPos.z + (Math.random() - 0.5) * activeSpell.brushRadius

        if (activeSpell.vfxType === 'thermal') {
          velocities[idx * 3 + 1] = Math.random() * 1.5 + 1.0 // Steam rises
        } else {
          velocities[idx * 3 + 1] = Math.random() * 2.5 + 0.5 // Water spray
        }

        ages[idx] = 0
      }
    }

    // Animate active particles
    for (let i = 0; i < count; i++) {
      if (ages[i] < 1.5) {
        ages[i] += delta
        posArray[i * 3 + 0] += velocities[i * 3 + 0] * delta
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta
        velocities[i * 3 + 1] -= 2.0 * delta // Gravity
      } else {
        posArray[i * 3 + 1] = -999 // Hide
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
        size={0.12}
        color={activeSpell.color}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  )
}
