import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'
import type { BrushState } from '../snow/SnowTerrain'
import type { RideableDeformationField } from '../snow/RideableDeformationField'
import { GPGPUParticleSystem } from './GPGPUParticleSystem'

interface GPGPUSpellParticlesProps {
  readonly activeSpell: SpellEffect
  readonly brushRef: React.RefObject<BrushState>
  readonly isEmitting: boolean
  readonly deformationField: RideableDeformationField
}

function spellTypeToIndex(vfxType: SpellEffect['vfxType']): number {
  switch (vfxType) {
    case 'liquid_stream': return 1
    case 'frost': return 2
    case 'thermal': return 3
    case 'vortex': return 4
    default: return 0
  }
}

export function GPGPUSpellParticles({
  activeSpell,
  brushRef,
  isEmitting,
  deformationField,
}: GPGPUSpellParticlesProps) {
  const { gl, scene } = useThree()
  const idleTimer = useRef<number>(0)

  // Adaptive Quest 3 Particle Budget: 64x64 = 4,096 particles
  const gpgpuSystem = useMemo(() => new GPGPUParticleSystem(64), [])

  useEffect(() => {
    scene.add(gpgpuSystem.renderMesh)
    return () => {
      scene.remove(gpgpuSystem.renderMesh)
      gpgpuSystem.dispose()
    }
  }, [gpgpuSystem, scene])

  useFrame((state, delta) => {
    const brush = brushRef.current ?? { pos: new THREE.Vector3(999, 999, 0.5) }
    const emitRate = isEmitting && brush.pos.x < 100
      ? 0.35 * activeSpell.vfxIntensity
      : 0.0

    // Optimization: Stop GPU compute simulation when idle for > 1.5 seconds to save 100% compute overhead
    if (emitRate === 0) {
      idleTimer.current += delta
      if (idleTimer.current > 1.5) {
        gpgpuSystem.renderMesh.visible = false
        return
      }
    } else {
      idleTimer.current = 0
      gpgpuSystem.renderMesh.visible = true
    }

    const emitterPosRadius = new THREE.Vector4(
      brush.pos.x,
      deformationField.getHeight(brush.pos.x, brush.pos.y) + 0.15,
      brush.pos.y,
      activeSpell.brushRadius * 1.5,
    )

    const spellIdx = spellTypeToIndex(activeSpell.vfxType)
    const color = new THREE.Color(activeSpell.color)

    gpgpuSystem.update(
      gl,
      delta,
      state.clock.elapsedTime,
      emitterPosRadius,
      emitRate,
      spellIdx,
      color,
      activeSpell.vfxIntensity,
    )
  })

  return null
}
