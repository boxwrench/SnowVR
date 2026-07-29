import { useFrame } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'

interface ControllerBrushProps {
  readonly activeSpell: SpellEffect
  readonly onBrushUpdate: (pos: THREE.Vector3, depth: number, berm: number) => void
}

export function ControllerBrush({
  activeSpell,
  onBrushUpdate,
}: ControllerBrushProps) {
  const session = useXR((state) => state.session)
  const rightController = useXRInputSourceState('controller', 'right')
  const meshRef = useRef<THREE.Group>(null)
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  useFrame(({ pointer, camera, raycaster }) => {
    if (session !== undefined && rightController !== undefined) {
      // VR Controller position
      const objectState = rightController.object
      if (objectState) {
        objectState.getWorldPosition(targetPos.current)
        targetPos.current.y = 0 // Project onto snow surface
      }
    } else {
      // Desktop mouse raycast onto snow plane
      raycaster.setFromCamera(pointer, camera)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        targetPos.current.copy(intersection)
      }
    }

    if (meshRef.current) {
      meshRef.current.position.copy(targetPos.current)
    }

    // Dispatch brush position (x, z, radius)
    const brushVec = new THREE.Vector3(
      targetPos.current.x,
      targetPos.current.z,
      activeSpell.brushRadius
    )
    onBrushUpdate(brushVec, activeSpell.brushDepth, activeSpell.brushBerm)
  })

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Dynamic light casting SSS glow through snow berms */}
      <pointLight color={activeSpell.color} intensity={3.5} distance={6} decay={2} position={[0, 0.4, 0]} />

      {/* Spell Caster Orb Mesh */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[activeSpell.brushRadius * 0.25, 32, 32]} />
        <meshStandardMaterial
          color={activeSpell.color}
          emissive={activeSpell.color}
          emissiveIntensity={2.0}
          roughness={0.1}
        />
      </mesh>

      {/* Outer Brush Boundary Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[activeSpell.brushRadius * 0.85, activeSpell.brushRadius, 32]} />
        <meshBasicMaterial color={activeSpell.color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
