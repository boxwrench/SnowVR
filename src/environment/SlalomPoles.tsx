import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getTerrainHeight } from '../snow/terrainMath'

/**
 * Instanced Slalom Gates / Scale Anchor Poles along the downhill run.
 * Provides visual scale anchors every 20 meters at 1 draw call.
 */
export function SlalomPoles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const poles = useMemo(() => {
    const items: Array<{ x: number; z: number; isRed: boolean }> = []
    // Place pairs of slalom poles down the downhill run
    for (let z = -40; z <= 40; z += 18) {
      const offset = Math.sin(z * 0.15) * 6
      items.push({ x: offset - 3.5, z, isRed: true })
      items.push({ x: offset + 3.5, z, isRed: false })
    }
    return items
  }, [])

  const [geometry, material] = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      roughness: 0.3,
      metalness: 0.2,
    })
    return [geo, mat]
  }, [])

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    poles.forEach((p, i) => {
      const terrainY = getTerrainHeight(p.x, p.z)
      dummy.position.set(p.x, terrainY + 1.1, p.z)
      dummy.updateMatrix()
      meshRef.current?.setMatrixAt(i, dummy.matrix)

      color.set(p.isRed ? '#ef4444' : '#3b82f6')
      meshRef.current?.setColorAt(i, color)
    })

    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [poles])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, poles.length]}
    />
  )
}
