import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getTerrainHeight } from '../snow/terrainMath'
import { createPoleLayout } from './poleLayout'

const POLE_HEIGHT = 2.2
const POLE_RADIUS = 0.08
const RED = '#ef4444'
const BLUE = '#3b82f6'

/**
 * Instanced slalom gates. Provides the run's only visual scale and speed
 * anchor at one draw call.
 *
 * Instance matrices are written in a layout effect, not a memo: THREE
 * initialises instanceMatrix to zeros rather than identity, and a memo runs
 * before React attaches the ref, which would leave every pole degenerate at
 * the origin.
 */
export function SlalomPoles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const poles = useMemo(() => createPoleLayout(), [])

  const [geometry, material] = useMemo(() => {
    const geo = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.2,
    })
    return [geo, mat] as const
  }, [])

  useLayoutEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    poles.forEach((pole, index) => {
      dummy.position.set(
        pole.x,
        getTerrainHeight(pole.x, pole.z) + POLE_HEIGHT / 2,
        pole.z,
      )
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, color.set(pole.isRed ? RED : BLUE))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // Instances span the whole run, so the geometry-derived bounds are wrong.
    mesh.computeBoundingSphere()
  }, [poles])

  return <instancedMesh ref={meshRef} args={[geometry, material, poles.length]} />
}
