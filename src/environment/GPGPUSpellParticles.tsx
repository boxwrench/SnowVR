import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'
import { GPGPUParticleSystem } from './GPGPUParticleSystem'

interface GPGPUSpellParticlesProps {
  readonly activeSpell: SpellEffect
  readonly brushPos: THREE.Vector3
  readonly isEmitting: boolean
}

// Map spell vfxType to numeric index for the GPU sim shader
function spellTypeToIndex(vfxType: SpellEffect['vfxType']): number {
  switch (vfxType) {
    case 'spray': return 0
    case 'liquid_stream': return 1
    case 'frost': return 2
    case 'thermal': return 3
    case 'vortex': return 4
    default: return 0
  }
}

export function GPGPUSpellParticles({
  activeSpell,
  brushPos,
  isEmitting,
}: GPGPUSpellParticlesProps) {
  const { gl, scene } = useThree()

  const gpgpuSystem = useMemo(() => new GPGPUParticleSystem(128), [])

  useEffect(() => {
    scene.add(gpgpuSystem.renderMesh)
    return () => {
      scene.remove(gpgpuSystem.renderMesh)
      gpgpuSystem.dispose()
    }
  }, [gpgpuSystem, scene])

  useFrame((state, delta) => {
    const emitterPos = new THREE.Vector3(
      brushPos.x,
      brushPos.z,
      activeSpell.brushRadius * 1.5
    )

    const emitRate = isEmitting && brushPos.x < 100 ? 0.35 : 0.0
    const spellIdx = spellTypeToIndex(activeSpell.vfxType)
    const color = new THREE.Color(activeSpell.color)

    gpgpuSystem.update(
      gl,
      delta,
      state.clock.elapsedTime,
      emitterPos,
      emitRate,
      spellIdx,
      color
    )
  })

  return null // Render mesh is added directly to scene in useEffect
}
