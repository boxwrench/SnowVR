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
  const count = 500

  const [positions, velocities, ages] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const age = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = 999
      pos[i * 3 + 1] = 999
      pos[i * 3 + 2] = 999

      vel[i * 3 + 0] = (Math.random() - 0.5) * 3.0
      vel[i * 3 + 1] = Math.random() * 3.0 + 0.5
      vel[i * 3 + 2] = (Math.random() - 0.5) * 3.0

      age[i] = 99
    }

    return [pos, vel, age]
  }, [count])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    // Emit new particles while drawing or moving
    if (isEmitting && brushPos.x < 100) {
      const burstCount = activeSpell.vfxType === 'liquid_stream' ? 12 : 6
      for (let i = 0; i < burstCount; i++) {
        const idx = Math.floor(Math.random() * count)
        posArray[idx * 3 + 0] = brushPos.x + (Math.random() - 0.5) * activeSpell.brushRadius * 1.5
        posArray[idx * 3 + 1] = activeSpell.vfxType === 'liquid_stream' ? 0.4 : 0.2
        posArray[idx * 3 + 2] = brushPos.z + (Math.random() - 0.5) * activeSpell.brushRadius * 1.5

        if (activeSpell.vfxType === 'liquid_stream') {
          // Liquid Stream Water Splash Droplets
          velocities[idx * 3 + 0] = (Math.random() - 0.5) * 4.5
          velocities[idx * 3 + 1] = Math.random() * 3.5 + 1.2 // Water splash jet
          velocities[idx * 3 + 2] = (Math.random() - 0.5) * 4.5
        } else if (activeSpell.vfxType === 'thermal') {
          velocities[idx * 3 + 1] = Math.random() * 2.0 + 1.0 // Steam rises
        } else {
          velocities[idx * 3 + 1] = Math.random() * 2.5 + 0.5 // Snow wake spray
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
        velocities[i * 3 + 1] -= 3.5 * delta // Gravity
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
        size={activeSpell.vfxType === 'liquid_stream' ? 0.16 : 0.12}
        color={activeSpell.color}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  )
}
