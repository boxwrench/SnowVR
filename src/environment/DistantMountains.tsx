import { useMemo } from 'react'
import * as THREE from 'three'

// Procedural 360-degree distant alpine mountain ring
export function DistantMountains() {
  const mountainGeometry = useMemo(() => {
    const radius = 180
    const height = 45
    const segments = 128
    const geo = new THREE.CylinderGeometry(radius, radius * 1.1, height, segments, 16, true)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const array = pos.array as Float32Array

    for (let i = 0; i < pos.count; i++) {
      const x = array[i * 3 + 0]
      const y = array[i * 3 + 1]
      const z = array[i * 3 + 2]

      const angle = Math.atan2(z, x)
      // Procedural mountain peaks using multi-octave sine noise
      const peakNoise =
        Math.sin(angle * 6.0) * 12.0 +
        Math.sin(angle * 14.0) * 6.0 +
        Math.sin(angle * 28.0) * 2.5

      if (y > 0) {
        array[i * 3 + 1] = y + Math.max(-10, peakNoise)
      }
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={mountainGeometry} position={[0, -5, 0]}>
      <meshStandardMaterial
        color="#1f3d54"
        roughness={0.8}
        metalness={0.1}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
