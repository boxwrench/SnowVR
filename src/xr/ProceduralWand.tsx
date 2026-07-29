import { useFrame } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'

interface ProceduralWandProps {
  readonly activeSpell: SpellEffect
  readonly onBrushUpdate: (
    pos: THREE.Vector3,
    depth: number,
    berm: number,
    ice: number,
    wetness: number
  ) => void
}

export function ProceduralWand({
  activeSpell,
  onBrushUpdate,
}: ProceduralWandProps) {
  const session = useXR((state) => state.session)
  const rightController = useXRInputSourceState('controller', 'right')
  const wandRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  useFrame(({ pointer, camera, raycaster, clock }) => {
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

    if (wandRef.current) {
      wandRef.current.position.copy(targetPos.current)
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 2.5
    }

    // Dispatch brush position (x, z, radius) and 4-channel parameters
    const brushVec = new THREE.Vector3(
      targetPos.current.x,
      targetPos.current.z,
      activeSpell.brushRadius
    )
    onBrushUpdate(
      brushVec,
      activeSpell.brushDepth,
      activeSpell.brushBerm,
      activeSpell.brushIce,
      activeSpell.brushWetness
    )
  })

  return (
    <group ref={wandRef} position={[0, 0, 0]}>
      {/* Dynamic SSS Light Source */}
      <pointLight color={activeSpell.color} intensity={4.0} distance={8} decay={2} position={[0, 0.5, 0]} />

      {/* Wand Staff */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.8, 16]} />
        <meshStandardMaterial color="#1a2332" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Elemental Crystal Headpiece */}
      <mesh position={[0, 0.85, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={activeSpell.color}
          emissive={activeSpell.color}
          emissiveIntensity={2.5}
          roughness={0.1}
        />
      </mesh>

      {/* Orbiting Energy Ring */}
      <mesh ref={ringRef} position={[0, 0.85, 0]}>
        <torusGeometry args={[0.2, 0.015, 16, 32]} />
        <meshBasicMaterial color={activeSpell.color} wireframe />
      </mesh>

      {/* Snow Surface Projection Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[activeSpell.brushRadius * 0.85, activeSpell.brushRadius, 32]} />
        <meshBasicMaterial color={activeSpell.color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
